import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "runtime" / "paper_trader.py"
spec = importlib.util.spec_from_file_location("paper_trader", MODULE)
pt = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = pt
spec.loader.exec_module(pt)
lc = pt.lc


def market() -> lc.MarketInfo:
    return lc.MarketInfo(
        market_id="g1",
        condition_id="c1",
        question="Team Alpha vs Team Beta",
        slug="alpha-beta",
        category="sports",
        event_key="e1",
        tokens=("t1", "t2"),
        outcomes=("Alpha", "Beta"),
        liquidity=100_000,
        volume_24h=80_000,
        close_at="2026-08-30T12:00:00Z",
        fees_enabled=True,
    )


def leader(char: str, name: str, weight: float = 1.0) -> lc.Leader:
    return lc.Leader(
        wallet="0x" + char * 40,
        username=name,
        score=1.0,
        weight=weight,
        periods=("WEEK", "MONTH"),
        ranks=("WEEK:1", "MONTH:2"),
        median_efficiency=0.1,
    )


def evidence_for(who: lc.Leader, token: str, now_epoch: int, *, hedged: bool = False, recent: bool = True):
    positions = [
        {
            "conditionId": "c1",
            "asset": token,
            "initialValue": 50_000,
            "currentValue": 52_000,
            "avgPrice": 0.50,
            "curPrice": 0.52,
            "redeemable": False,
        }
    ]
    if hedged:
        positions.append(
            {
                "conditionId": "c1",
                "asset": "t2" if token == "t1" else "t1",
                "initialValue": 50_000,
                "currentValue": 52_000,
                "avgPrice": 0.50,
                "curPrice": 0.48,
                "redeemable": False,
            }
        )
    timestamp = now_epoch - 60 if recent else now_epoch - int((lc.LEADER_FLOW_HOURS + 1) * 3600)
    trades = [
        {"conditionId": "c1", "asset": token, "side": "BUY", "size": 5000, "price": 0.50, "timestamp": timestamp},
        {"conditionId": "history-2", "asset": "x2", "side": "BUY", "size": 10, "price": 0.50, "timestamp": now_epoch - 120},
        {"conditionId": "history-3", "asset": "x3", "side": "BUY", "size": 10, "price": 0.50, "timestamp": now_epoch - 180},
    ]
    closed = [
        {"realizedPnl": 1000},
        {"realizedPnl": 900},
        {"realizedPnl": 800},
        {"realizedPnl": 700},
        {"realizedPnl": -500},
    ]
    return who.wallet, {"positions": positions, "trades": trades, "closed": closed}


class PaperTraderRuntimeTests(unittest.TestCase):
    def test_fresh_state_is_paper_only_and_exact_targets(self):
        state = pt.fresh_state()
        self.assertIs(state["paper_only"], True)
        self.assertIs(state["real_orders_enabled"], False)
        self.assertEqual(state["starting_equity"], 1000.0)
        self.assertEqual(state["target_equity"], 2000.0)
        self.assertEqual(state["bankrupt_equity"], 0.0)
        self.assertEqual(state["strategy"], pt.STRATEGY_NAME)
        self.assertEqual(state["strategy_version"], 3)

    def test_fee_formula_and_current_sports_rate(self):
        self.assertEqual(pt.taker_fee(100, 0.5, 0.04), 1.0)
        self.assertEqual(pt.taker_fee(100, 0.5, 0.0), 0.0)
        self.assertEqual(pt.market_fee_rate("Sports"), 0.05)
        self.assertEqual(pt.market_fee_rate("Sports", fees_enabled=False), 0.0)
        self.assertEqual(pt.market_fee_rate("Geopolitics"), 0.0)

    def test_category_inference_prefers_sports_over_world_term(self):
        row = {"question": "World Cup: Alpha vs Beta", "gameStartTime": "2026-08-30T12:00:00Z"}
        self.assertEqual(lc.infer_category(row), "sports")
        self.assertEqual(lc.infer_category({"question": "Fed interest rate decision"}), "economics")

    def test_eligible_markets_supports_non_yes_no_binary_outcomes(self):
        now = datetime(2026, 8, 29, 12, tzinfo=timezone.utc).timestamp()
        rows = [
            {
                "id": "g1",
                "conditionId": "c1",
                "question": "Alpha vs Beta",
                "slug": "alpha-beta",
                "active": True,
                "closed": False,
                "enableOrderBook": True,
                "outcomes": json.dumps(["Alpha", "Beta"]),
                "clobTokenIds": json.dumps(["t1", "t2"]),
                "liquidityNum": 100_000,
                "volume24hr": 50_000,
                "gameStartTime": "2026-08-30T12:00:00Z",
                "endDateIso": "2026-08-30",
                "events": [{"id": "e1"}],
            }
        ]
        eligible = lc.eligible_markets(rows, now_epoch=now)
        self.assertIn("c1", eligible)
        self.assertEqual(eligible["c1"].outcomes, ("Alpha", "Beta"))
        self.assertEqual(eligible["c1"].close_at, "2026-08-30T12:00:00Z")

    def test_persistent_selection_rejects_low_efficiency_and_one_window(self):
        good = "0x" + "1" * 40
        low = "0x" + "2" * 40
        single = "0x" + "3" * 40
        snapshots = {
            "WEEK": [
                {"proxyWallet": good, "userName": "good", "rank": "1", "vol": 1_000_000, "pnl": 100_000},
                {"proxyWallet": low, "userName": "low", "rank": "2", "vol": 10_000_000, "pnl": 10_000},
                {"proxyWallet": single, "userName": "single", "rank": "3", "vol": 1_000_000, "pnl": 100_000},
            ],
            "MONTH": [
                {"proxyWallet": good, "userName": "good", "rank": "2", "vol": 2_000_000, "pnl": 180_000},
                {"proxyWallet": low, "userName": "low", "rank": "3", "vol": 20_000_000, "pnl": 15_000},
            ],
            "ALL": [],
        }
        selected = lc.select_persistent_leaders(snapshots)
        self.assertEqual([row.username for row in selected], ["good"])

    def test_recent_closed_history_rejects_a_current_leader_with_negative_sample(self):
        status, multiplier, metrics = lc.closed_history_quality(
            [{"realizedPnl": 100}, {"realizedPnl": 50}, {"realizedPnl": -300}, {"realizedPnl": 20}, {"realizedPnl": -10}]
        )
        self.assertEqual(status, "failed-recent-closed-history")
        self.assertEqual(multiplier, 0.0)
        self.assertLess(metrics["pnl"], 0)

    def test_two_independent_holdings_and_recent_flow_create_signal(self):
        now = 1_800_000_000
        first, second = leader("1", "first"), leader("2", "second")
        evidence = dict([evidence_for(first, "t1", now), evidence_for(second, "t1", now)])
        signals, metadata = lc.aggregate_leader_signals([first, second], evidence, {"c1": market()}, now_epoch=now)
        self.assertIn("t1", signals)
        self.assertEqual(signals["t1"].supporter_count, 2)
        self.assertEqual(signals["t1"].recent_buyers, 2)
        self.assertEqual(len(metadata), 2)

    def test_hedged_holding_is_not_a_directional_vote(self):
        now = 1_800_000_000
        first, second = leader("1", "first"), leader("2", "second")
        evidence = dict(
            [evidence_for(first, "t1", now, hedged=True), evidence_for(second, "t1", now)]
        )
        signals, _ = lc.aggregate_leader_signals([first, second], evidence, {"c1": market()}, now_epoch=now)
        self.assertEqual(signals, {})

    def test_opposed_leaders_do_not_form_consensus(self):
        now = 1_800_000_000
        first, second = leader("1", "first"), leader("2", "second")
        evidence = dict([evidence_for(first, "t1", now), evidence_for(second, "t2", now)])
        signals, _ = lc.aggregate_leader_signals([first, second], evidence, {"c1": market()}, now_epoch=now)
        self.assertEqual(signals, {})

    def test_entry_candidate_requires_fresh_flow_and_refuses_price_chasing(self):
        now = 1_800_000_000
        first, second = leader("1", "first"), leader("2", "second")
        evidence = dict([evidence_for(first, "t1", now), evidence_for(second, "t1", now)])
        signals, _ = lc.aggregate_leader_signals([first, second], evidence, {"c1": market()}, now_epoch=now)
        accepted = lc.build_entry_candidates(signals, {"t1": 0.52, "t2": 0.48}, {"t1": 0.01}, now_epoch=now)
        chased = lc.build_entry_candidates(signals, {"t1": 0.55, "t2": 0.45}, {"t1": 0.01}, now_epoch=now)
        self.assertEqual(len(accepted), 1)
        self.assertEqual(chased, [])

    def test_stale_flow_can_support_holding_but_not_new_entry(self):
        now = 1_800_000_000
        first, second = leader("1", "first"), leader("2", "second")
        evidence = dict(
            [evidence_for(first, "t1", now, recent=False), evidence_for(second, "t1", now, recent=False)]
        )
        signals, _ = lc.aggregate_leader_signals([first, second], evidence, {"c1": market()}, now_epoch=now)
        self.assertIn("t1", signals)
        self.assertEqual(lc.build_entry_candidates(signals, {"t1": 0.50, "t2": 0.50}, {"t1": 0.01}, now_epoch=now), [])

    def test_strategy_migration_closes_legacy_position(self):
        state = pt.fresh_state()
        state["cash"] = 900.0
        state["open_positions"] = [
            {
                "market_id": "old",
                "outcome": "YES",
                "token_id": "old-token",
                "opened_at": pt.utc_now(),
                "shares": 200,
                "cash_outlay": 100.0,
                "fee_rate": 0.0,
            }
        ]
        pt.mark_and_exit_positions(state, {"old-token": 0.40}, {"old-token": 0.0}, pt.utc_now())
        self.assertEqual(state["open_positions"], [])
        self.assertEqual(state["closed_positions"][-1]["close_reason"], "strategy_migration")
        self.assertEqual(state["cash"], 980.0)

    def test_v3_hard_stop_is_conservative(self):
        state = pt.fresh_state()
        state["cash"] = 900.0
        state["open_positions"] = [
            {
                "strategy_version": 3,
                "market_id": "m1",
                "outcome": "Alpha",
                "token_id": "t1",
                "opened_at": pt.utc_now(),
                "shares": 200,
                "cash_outlay": 100.0,
                "fee_rate": 0.0,
                "paper": True,
            }
        ]
        pt.mark_and_exit_positions(state, {"t1": 0.40}, {"t1": 0.0}, pt.utc_now())
        self.assertEqual(state["closed_positions"][-1]["close_reason"], "hard_stop")
        self.assertEqual(state["realized_pnl"], -20.0)

    def test_consensus_loss_requires_two_observed_misses(self):
        state = pt.fresh_state()
        opened = datetime.now(timezone.utc) - timedelta(hours=2)
        state["cash"] = 900.0
        state["open_positions"] = [
            {
                "strategy_version": 3,
                "market_id": "m1",
                "outcome": "Alpha",
                "token_id": "t1",
                "opened_at": opened.isoformat(timespec="seconds"),
                "shares": 200,
                "cash_outlay": 100.0,
                "fee_rate": 0.0,
                "signal_misses": 1,
                "paper": True,
            }
        ]
        pt.mark_and_exit_positions(
            state, {"t1": 0.50}, {"t1": 0.0}, pt.utc_now(), {}, research_ready=True
        )
        self.assertEqual(state["closed_positions"][-1]["close_reason"], "leader_consensus_lost")

    def test_position_sizing_respects_small_account_cap(self):
        signal = lc.EliteSignal(
            market=market(),
            token_id="t1",
            outcome="Alpha",
            supporters=("first", "second"),
            supporter_wallets=("0x" + "1" * 40, "0x" + "2" * 40),
            supporter_count=2,
            opposition_count=0,
            consensus=1.0,
            leader_exposure=100_000,
            leader_avg_entry=0.50,
            recent_buyers=2,
            latest_trade_ts=1_800_000_000,
        )
        candidate = lc.Candidate(signal, 0.50, 0.01, 0.50, 0.505, 0.05, 3.0)
        state = pt.fresh_state()
        self.assertTrue(pt.open_candidate(state, candidate, {"t1": 0.50}, {"t1": 0.01}, pt.utc_now()))
        self.assertLessEqual(state["open_positions"][0]["cash_outlay"], 20.01)
        self.assertTrue(state["open_positions"][0]["paper"])

    def test_load_state_rejects_any_live_order_flag(self):
        state = pt.fresh_state()
        state["real_orders_enabled"] = True
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.json"
            path.write_text(json.dumps(state), encoding="utf-8")
            with self.assertRaises(RuntimeError):
                pt.load_state(path)


if __name__ == "__main__":
    unittest.main()

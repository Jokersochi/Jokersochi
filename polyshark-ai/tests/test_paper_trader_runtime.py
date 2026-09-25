import importlib.util
import sys
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "runtime" / "paper_trader.py"
spec = importlib.util.spec_from_file_location("paper_trader", MODULE)
pt = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = pt
spec.loader.exec_module(pt)


class PaperTraderRuntimeTests(unittest.TestCase):
    def test_fresh_state_is_paper_only_and_exact_targets(self):
        s = pt.fresh_state()
        self.assertIs(s["paper_only"], True)
        self.assertIs(s["real_orders_enabled"], False)
        self.assertEqual(s["starting_equity"], 1000.0)
        self.assertEqual(s["target_equity"], 2000.0)
        self.assertEqual(s["bankrupt_equity"], 0.0)
        self.assertEqual(s["cash"], 1000.0)

    def test_fee_formula_zero_for_fee_free_market(self):
        self.assertEqual(pt.taker_fee(100, 0.5, 0.0), 0.0)

    def test_fee_formula_matches_v2_shape(self):
        self.assertEqual(pt.taker_fee(100, 0.5, 0.04), 1.0)

    def test_geopolitics_fee_free(self):
        self.assertEqual(pt.market_fee_rate("Geopolitics"), 0.0)

    def test_position_liquidation_is_conservative(self):
        p = {"shares": 100, "fee_rate": 0.04}
        net, px, fee = pt.position_liquidation(p, mid=0.5, spread=0.02)
        self.assertEqual(px, 0.49)
        self.assertLess(net, 49.0)
        self.assertGreater(fee, 0)

    def test_legacy_momentum_entries_are_blocked_by_default(self):
        self.assertFalse(pt.ALLOW_LEGACY_MOMENTUM_ENTRIES)
        s = pt.fresh_state()
        candidate = pt.Candidate(
            market_id="m1",
            question="Test market?",
            category="Other",
            yes_token="yes1",
            no_token="no1",
            yes_price=0.50,
            yes_spread=0.01,
            liquidity=100000.0,
            volume_24h=50000.0,
            momentum_24h=0.10,
            momentum_6h=0.05,
            end_date=None,
        )
        opened = pt.open_candidate(
            s,
            candidate,
            {"yes1": 0.50},
            {"yes1": 0.01},
            pt.utc_now(),
        )
        self.assertFalse(opened)
        self.assertEqual(s["cash"], 1000.0)
        self.assertEqual(s["open_positions"], [])
        self.assertEqual(s["entry_policy"], "legacy_momentum_blocked")

    def test_closed_market_binary_price_maps_to_exact_settlement(self):
        position = {"token_id": "yes1", "outcome": "YES"}
        market = {
            "closed": True,
            "outcomes": '["Yes","No"]',
            "outcomePrices": '["1","0"]',
            "clobTokenIds": '["yes1","no1"]',
        }
        self.assertEqual(pt.resolved_payout_from_market(position, market), 1.0)
        position["token_id"] = "no1"
        position["outcome"] = "NO"
        self.assertEqual(pt.resolved_payout_from_market(position, market), 0.0)
        ambiguous = dict(market)
        ambiguous["outcomePrices"] = '["0","0"]'
        self.assertIsNone(pt.resolved_payout_from_market(position, ambiguous))

    def test_settlement_uses_exact_payout_and_no_exit_fee(self):
        s = pt.fresh_state()
        s["cash"] = 900.0
        p = {
            "market_id": "m1",
            "outcome": "YES",
            "token_id": "t1",
            "opened_at": pt.utc_now(),
            "shares": 200,
            "cash_outlay": 100.0,
            "fee_rate": 0.05,
        }
        s["open_positions"] = [p]
        pt.settle_position(s, p, payout=1.0, reason="resolved_win", now=pt.utc_now())
        self.assertEqual(s["cash"], 1100.0)
        self.assertEqual(s["realized_pnl"], 100.0)
        self.assertEqual(s["fees_paid"], 0.0)
        self.assertEqual(s["closed_positions"][-1]["exit_fee"], 0.0)
        self.assertEqual(s["closed_positions"][-1]["settlement_status"], "resolved")

    def test_check_and_settle_marks_closed_pending_when_price_not_final(self):
        s = pt.fresh_state()
        p = {
            "market_id": "m1",
            "outcome": "YES",
            "token_id": "yes1",
            "opened_at": pt.utc_now(),
            "shares": 100,
            "cash_outlay": 50.0,
            "fee_rate": 0.05,
        }
        original = pt.fetch_market_by_id
        try:
            pt.fetch_market_by_id = lambda _market_id: {
                "closed": True,
                "acceptingOrders": False,
                "umaResolutionStatus": "proposed",
                "outcomes": '["Yes","No"]',
                "outcomePrices": '["0.63","0.37"]',
                "clobTokenIds": '["yes1","no1"]',
            }
            status = pt.check_and_settle_position(s, p, pt.utc_now())
        finally:
            pt.fetch_market_by_id = original
        self.assertEqual(status, "closed_pending_resolution")
        self.assertEqual(p["settlement_status"], "closed_pending_resolution")
        self.assertEqual(s["closed_positions"], [])

    def test_past_end_date_fails_closed_when_settlement_lookup_is_unavailable(self):
        s = pt.fresh_state()
        s["cash"] = 900.0
        p = {
            "market_id": "m1",
            "outcome": "YES",
            "token_id": "t1",
            "opened_at": "2026-01-01T00:00:00+00:00",
            "end_date": "2026-01-02T00:00:00+00:00",
            "shares": 200,
            "cash_outlay": 100.0,
            "fee_rate": 0.0,
        }
        s["open_positions"] = [p]
        original = pt.check_and_settle_position
        try:
            pt.check_and_settle_position = lambda *_args, **_kwargs: "lookup_unavailable"
            pt.mark_and_exit_positions(
                s,
                {"t1": 0.10},
                {"t1": 0.0},
                "2026-09-25T13:00:00+00:00",
            )
        finally:
            pt.check_and_settle_position = original
        self.assertEqual(len(s["open_positions"]), 1)
        self.assertEqual(s["closed_positions"], [])

    def test_shadow_observation_has_zero_capital_impact(self):
        s = pt.fresh_state()
        cash_before = s["cash"]
        open_before = list(s["open_positions"])
        candidate = pt.Candidate(
            market_id="shadow1",
            question="Shadow fixture?",
            category="Other",
            yes_token="yes-shadow1",
            no_token="no-shadow1",
            yes_price=0.55,
            yes_spread=0.01,
            liquidity=100000.0,
            volume_24h=50000.0,
            momentum_24h=0.10,
            momentum_6h=0.05,
            end_date="2026-10-31T00:00:00+00:00",
        )
        added = pt.observe_shadow_candidates(
            s,
            [candidate],
            {"yes-shadow1": 0.55, "no-shadow1": 0.45},
            {"yes-shadow1": 0.01, "no-shadow1": 0.01},
            "2026-09-25T14:00:00+00:00",
        )
        self.assertEqual(added, 1)
        self.assertEqual(s["cash"], cash_before)
        self.assertEqual(s["open_positions"], open_before)
        signal = s["shadow_challenger"]["signals"][0]
        self.assertEqual(signal["capital_impact"], 0.0)
        self.assertTrue(signal["paper_only"])
        self.assertAlmostEqual(signal["cash_outlay"], pt.SHADOW_NOTIONAL, places=3)

    def test_shadow_rejects_low_price_candidate_and_deduplicates(self):
        s = pt.fresh_state()
        low = pt.Candidate(
            market_id="low",
            question="Low fixture?",
            category="Other",
            yes_token="yes-low",
            no_token="no-low",
            yes_price=0.30,
            yes_spread=0.01,
            liquidity=100000.0,
            volume_24h=50000.0,
            momentum_24h=0.10,
            momentum_6h=0.05,
            end_date="2026-10-31T00:00:00+00:00",
        )
        good = pt.Candidate(
            market_id="good",
            question="Good fixture?",
            category="Other",
            yes_token="yes-good",
            no_token="no-good",
            yes_price=0.55,
            yes_spread=0.01,
            liquidity=100000.0,
            volume_24h=50000.0,
            momentum_24h=0.10,
            momentum_6h=0.05,
            end_date="2026-10-31T00:00:00+00:00",
        )
        mids = {
            "yes-low": 0.30,
            "no-low": 0.70,
            "yes-good": 0.55,
            "no-good": 0.45,
        }
        spreads = {token: 0.01 for token in mids}
        added = pt.observe_shadow_candidates(
            s, [low, good], mids, spreads, "2026-09-25T14:00:00+00:00"
        )
        self.assertEqual(added, 1)
        self.assertEqual(s["shadow_challenger"]["signals"][0]["market_id"], "good")
        second = pt.observe_shadow_candidates(
            s, [good], mids, spreads, "2026-09-25T15:00:00+00:00"
        )
        self.assertEqual(second, 0)
        self.assertEqual(len(s["shadow_challenger"]["signals"]), 1)
        last = s["shadow_challenger"]["last_observation"]
        self.assertEqual(last["candidates_seen"], 1)
        self.assertEqual(last["deduplicated"], 1)
        totals = s["shadow_challenger"]["observation_totals"]
        self.assertEqual(totals["ticks"], 2)
        self.assertEqual(totals["rejected_price"], 1)
        self.assertEqual(totals["added"], 1)

    def test_shadow_funnel_records_spread_rejection(self):
        s = pt.fresh_state()
        candidate = pt.Candidate(
            market_id="wide",
            question="Wide fixture?",
            category="Other",
            yes_token="yes-wide",
            no_token="no-wide",
            yes_price=0.55,
            yes_spread=0.03,
            liquidity=100000.0,
            volume_24h=50000.0,
            momentum_24h=0.10,
            momentum_6h=0.05,
            end_date="2026-10-31T00:00:00+00:00",
        )
        added = pt.observe_shadow_candidates(
            s,
            [candidate],
            {"yes-wide": 0.55, "no-wide": 0.45},
            {"yes-wide": 0.03, "no-wide": 0.03},
            "2026-09-25T14:00:00+00:00",
        )
        self.assertEqual(added, 0)
        last = s["shadow_challenger"]["last_observation"]
        self.assertEqual(last["rejected_spread"], 1)
        self.assertEqual(last["added"], 0)

    def test_shadow_matures_after_cost_return_without_touching_portfolio(self):
        s = pt.fresh_state()
        candidate = pt.Candidate(
            market_id="mature",
            question="Mature fixture?",
            category="Other",
            yes_token="yes-mature",
            no_token="no-mature",
            yes_price=0.50,
            yes_spread=0.01,
            liquidity=100000.0,
            volume_24h=50000.0,
            momentum_24h=0.10,
            momentum_6h=0.05,
            end_date="2026-10-31T00:00:00+00:00",
        )
        pt.observe_shadow_candidates(
            s,
            [candidate],
            {"yes-mature": 0.50, "no-mature": 0.50},
            {"yes-mature": 0.01, "no-mature": 0.01},
            "2026-09-25T14:00:00+00:00",
        )
        cash_before = s["cash"]
        pt.update_shadow_signals(
            s,
            {"yes-mature": 0.56},
            {"yes-mature": 0.01},
            "2026-09-25T20:01:00+00:00",
        )
        signal = s["shadow_challenger"]["signals"][0]
        self.assertIn("6", signal["horizon_results"])
        result = signal["horizon_results"]["6"]
        self.assertGreater(result["after_cost_return"], 0.0)
        self.assertEqual(result["source"], "clob_liquidation")
        self.assertEqual(s["cash"], cash_before)
        self.assertEqual(s["open_positions"], [])
        self.assertEqual(s["shadow_challenger"]["verdict"], "NO_EVIDENCE")

    def test_shadow_spec_drift_fails_state_validation(self):
        s = pt.fresh_state()
        root = pt._shadow_root(s, "2026-09-25T14:00:00+00:00")
        root["auto_promotion"] = False
        root["strategy_spec"]["min_entry_price"] = 0.39
        with self.assertRaises(AssertionError):
            pt.validate_state(s)

    def test_shadow_review_gate_never_auto_promotes(self):
        root = {
            "signals": [],
            "summary": {},
            "verdict": "NO_EVIDENCE",
            "auto_promotion": False,
        }
        for index in range(pt.SHADOW_REVIEW_MIN_24H):
            root["signals"].append(
                {
                    "horizon_results": {
                        "24": {"after_cost_return": 0.02 + (index % 2) * 0.001}
                    }
                }
            )
        pt._refresh_shadow_summary(root, "2026-09-26T14:00:00+00:00")
        self.assertEqual(root["verdict"], "ELIGIBLE_FOR_REVIEW")
        self.assertFalse(root["auto_promotion"])

    def test_stop_loss_close_updates_cash_and_realized_pnl(self):
        s = pt.fresh_state()
        s["cash"] = 900.0
        p = {
            "market_id": "m1",
            "outcome": "YES",
            "token_id": "t1",
            "opened_at": pt.utc_now(),
            "shares": 200,
            "cash_outlay": 100.0,
            "fee_rate": 0.0,
        }
        s["open_positions"] = [p]
        pt.mark_and_exit_positions(s, {"t1": 0.40}, {"t1": 0.0}, pt.utc_now())
        self.assertEqual(s["open_positions"], [])
        self.assertEqual(s["closed_positions"][-1]["close_reason"], "stop_loss")
        self.assertEqual(s["cash"], 980.0)
        self.assertEqual(s["realized_pnl"], -20.0)


if __name__ == "__main__":
    unittest.main()

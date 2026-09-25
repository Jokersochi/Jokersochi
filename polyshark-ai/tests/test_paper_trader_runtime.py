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

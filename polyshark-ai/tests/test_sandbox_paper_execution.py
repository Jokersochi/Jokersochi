"""Offline invariants for the isolated virtual execution sandbox."""
import importlib.util
import unittest
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "runtime" / "sandbox_paper_execution.py"
spec = importlib.util.spec_from_file_location("sandbox_paper_execution", path)
sandbox = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sandbox)


class SandboxTests(unittest.TestCase):
    def state(self):
        return {"paper_only": True, "real_orders_enabled": False, "cash": 1000.0,
                "equity": 1000.0, "observations": {}, "positions": {}, "trades": []}

    def test_entry_uses_ask_and_reserves_cost(self):
        state = self.state()
        state["observations"]["m"] = 0.45
        out = sandbox.step(state, {"m": (0.49, 0.50, 100, 100, "Test")}, "2026-11-11T00:00:00+00:00")
        self.assertEqual(len(out["positions"]), 1)
        self.assertEqual(out["cash"], 975)
        self.assertLess(out["equity"], 1000)
        self.assertFalse(out["real_orders_enabled"])

    def test_wide_spread_rejected(self):
        state = self.state()
        state["observations"]["m"] = 0.4
        out = sandbox.step(state, {"m": (0.45, 0.50, 100, 100, "Test")}, "2026-11-11T00:00:00+00:00")
        self.assertEqual(out["trades"], [])

    def test_exit_uses_bid(self):
        state = self.state()
        state["positions"]["m"] = {"shares": 40, "entry_ask": 0.5,
            "opened_at": "2026-11-10T00:00:00+00:00", "last_bid": 0.49}
        out = sandbox.step(state, {"m": (0.46, 0.47, 100, 100, "Test")}, "2026-11-11T01:00:00+00:00")
        self.assertNotIn("m", out["positions"])
        self.assertEqual(out["trades"][0]["side"], "SELL")
        self.assertAlmostEqual(out["cash"], 1000 + sandbox.liquidation_proceeds(40, 0.46))

    def test_fee_reserve_matches_highest_category_rate(self):
        self.assertAlmostEqual(sandbox.taker_fee(100, 0.5), 1.75)

    def test_insufficient_ask_depth_blocks_virtual_fill(self):
        state = self.state()
        state["observations"]["m"] = 0.45
        out = sandbox.step(state, {"m": (0.49, 0.50, 100, 1, "Test")},
                           "2026-11-11T00:00:00+00:00")
        self.assertEqual(out["trades"], [])
        self.assertEqual(out["cash"], 1000)

    def test_insufficient_bid_depth_blocks_virtual_exit(self):
        state = self.state()
        state["positions"]["m"] = {"shares": 40, "entry_ask": 0.5,
            "opened_at": "2026-11-10T00:00:00+00:00", "last_bid": 0.49}
        out = sandbox.step(state, {"m": (0.46, 0.47, 1, 100, "Test")},
                           "2026-11-11T01:00:00+00:00")
        self.assertIn("m", out["positions"])
        self.assertEqual(out["trades"], [])
        self.assertEqual(out["equity"], 1000.0)

    def test_no_quote_no_fake_trade(self):
        out = sandbox.step(self.state(), {}, "2026-11-11T00:00:00+00:00")
        self.assertEqual(out["equity"], 1000)
        self.assertEqual(out["trades"], [])


if __name__ == "__main__":
    unittest.main()

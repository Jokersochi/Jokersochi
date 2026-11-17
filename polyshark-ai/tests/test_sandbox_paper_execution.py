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

    def test_insufficient_bid_depth_executes_partial_virtual_exit(self):
        state = self.state()
        state["positions"]["m"] = {"shares": 40, "entry_ask": 0.5,
            "opened_at": "2026-11-10T00:00:00+00:00", "last_bid": 0.49}
        out = sandbox.step(state, {"m": (0.46, 0.47, 1, 100, "Test")},
                           "2026-11-11T01:00:00+00:00")
        self.assertAlmostEqual(out["positions"]["m"]["shares"], 39)
        self.assertEqual(len(out["trades"]), 1)
        self.assertEqual(out["trades"][0]["side"], "SELL")
        self.assertAlmostEqual(out["trades"][0]["shares"], 1)
        self.assertAlmostEqual(out["cash"], 1000 + sandbox.liquidation_proceeds(1, 0.46), places=4)
        # The exhausted best bid may not also mark the remaining 39 shares.
        self.assertAlmostEqual(out["equity"], out["cash"], places=5)

    def test_no_quote_no_fake_trade(self):
        out = sandbox.step(self.state(), {}, "2026-11-11T00:00:00+00:00")
        self.assertEqual(out["equity"], 1000)
        self.assertEqual(out["trades"], [])

    def test_buy_walks_multiple_ask_levels(self):
        state = self.state()
        state["observations"]["m"] = 0.45
        quote = (0.49, 0.50, 100, 1,
                 [(0.49, 100)], [(0.50, 1), (0.51, 100)], "Test")
        out = sandbox.step(state, {"m": quote}, "2026-11-11T00:00:00+00:00")
        self.assertEqual(len(out["trades"]), 1)
        trade = out["trades"][0]
        self.assertGreater(trade["shares"], 1)
        self.assertGreater(trade["price"], 0.50)
        self.assertEqual(trade["filled_levels"], 2)
        self.assertGreater(trade["fee"], 0)
        self.assertGreater(trade["slippage_reserve"], 0)
        self.assertAlmostEqual(out["cash"] - 1000, trade["cash_flow"], places=5)
        self.assertLessEqual(-trade["cash_flow"], sandbox.MAX_POSITION_USD + 1e-7)

    def test_sell_walks_multiple_bids_but_retains_unfilled_shares(self):
        state = self.state()
        state["positions"]["m"] = {"shares": 40, "entry_ask": 0.5,
            "opened_at": "2026-11-10T00:00:00+00:00", "last_bid": 0.49}
        quote = (0.46, 0.47, 5, 100,
                 [(0.46, 5), (0.45, 10), (0.43, 100)],
                 [(0.47, 100)], "Test")
        out = sandbox.step(state, {"m": quote}, "2026-11-11T01:00:00+00:00")
        self.assertEqual(out["trades"][0]["filled_levels"], 2)
        self.assertAlmostEqual(out["trades"][0]["shares"], 15)
        self.assertAlmostEqual(out["positions"]["m"]["shares"], 25)
        self.assertAlmostEqual(out["equity"], out["cash"], places=5)

    def test_wide_spread_never_reuses_stale_favorable_mark(self):
        state = self.state()
        state["positions"]["m"] = {"shares": 40, "entry_ask": 0.5,
            "opened_at": "2026-11-10T00:00:00+00:00", "last_bid": 0.9,
            "last_bid_depth": 100, "last_liquidation_value": 36}
        state["equity"] = 1036
        out = sandbox.step(state, {"m": (0.40, 0.50, 100, 100, "Invalid spread")},
                           "2026-11-11T01:00:00+00:00")
        self.assertEqual(out["equity"], 1000)
        self.assertEqual(out["positions"]["m"]["last_liquidation_value"], 0)
        self.assertEqual(state["positions"]["m"]["last_liquidation_value"], 36)

    def test_missing_quote_never_reuses_stale_mark(self):
        state = self.state()
        state["positions"]["m"] = {"shares": 40, "entry_ask": 0.5,
            "opened_at": "2026-11-10T00:00:00+00:00",
            "last_bid": 0.9, "last_liquidation_value": 36}
        out = sandbox.step(state, {}, "2026-11-11T00:00:00+00:00")
        self.assertEqual(out["equity"], 1000)
        self.assertEqual(out["positions"]["m"]["last_liquidation_value"], 0)

    def test_partial_sell_then_next_tick_fully_exits_without_phantom_shares(self):
        state = self.state()
        state["positions"]["m"] = {"shares": 40, "entry_ask": 0.5,
            "opened_at": "2026-11-10T00:00:00+00:00"}
        partial = sandbox.step(state, {"m": (0.46, 0.47, 1, 100, "Test")},
                               "2026-11-11T01:00:00+00:00")
        final = sandbox.step(partial, {"m": (0.46, 0.47, 100, 100, "Test")},
                             "2026-11-11T01:01:00+00:00")
        self.assertNotIn("m", final["positions"])
        self.assertAlmostEqual(sum(t["shares"] for t in final["trades"]), 40)
        self.assertAlmostEqual(final["cash"] - 1000,
                               sum(t["cash_flow"] for t in final["trades"]), places=5)
        self.assertAlmostEqual(final["equity"], final["cash"], places=5)

    def test_unsafe_live_state_fails_closed(self):
        state = self.state()
        state["real_orders_enabled"] = True
        with self.assertRaises(ValueError):
            sandbox.step(state, {}, "2026-11-11T00:00:00+00:00")

    def test_orderbook_normalizes_and_sorts_levels(self):
        from unittest.mock import patch
        book = {"bids": [{"price": "0.45", "size": "1"},
                         {"price": "0.49", "size": "2"}],
                "asks": [{"price": "0.52", "size": "10"},
                         {"price": "0.50", "size": "1"}]}
        with patch.object(sandbox, "get_json", return_value=book):
            result = sandbox.orderbook("dummy")
        self.assertEqual(result[0], 0.49)
        self.assertEqual(result[1], 0.50)
        self.assertEqual(result[4][0], (0.49, 2.0))
        self.assertEqual(result[5][0], (0.50, 1.0))



if __name__ == "__main__":
    unittest.main()

"""Offline, deterministic tests for PAPER causal replay and independent FIFO audit."""
import copy
import importlib
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

runtime = Path(__file__).resolve().parents[1] / "runtime"
sys.path.insert(0, str(runtime))
audit = importlib.import_module("sandbox_audit")
replay = importlib.import_module("sandbox_replay")


def sample(tick_number, bid, ask, *, book_lag_seconds=1):
    tick = datetime(2026, 11, 18, 12, tick_number, tzinfo=timezone.utc)
    received = tick - timedelta(milliseconds=200)
    book = tick - timedelta(seconds=book_lag_seconds)
    return {
        "tick_at": tick.isoformat(),
        "quotes": {
            "test-market": {
                "received_at": received.isoformat(),
                "book_timestamp_ms": int(book.timestamp() * 1000),
                "bids": [[bid, 100]],
                "asks": [[ask, 100]],
                "question": "Synthetic OFFLINE market",
            }
        },
    }


class PaperCausalReplayTests(unittest.TestCase):
    def ticks(self):
        return [sample(0, 0.44, 0.45), sample(1, 0.49, 0.50),
                sample(2, 0.54, 0.55)]

    def test_empty_initial_ledger_reconciles(self):
        report = audit.audit_state(replay.initial_state())
        self.assertEqual(report["status"], "PASS")
        self.assertEqual(report["realized_pnl_fifo"], 0)

    def test_replay_and_fifo_reconciliation(self):
        state, report = replay.replay_records(self.ticks())
        self.assertEqual(report["status"], "PASS")
        self.assertEqual(report["replay_ticks"], 3)
        self.assertEqual(report["virtual_fills"], 2)
        self.assertEqual(report["open_positions"], 0)
        self.assertEqual([t["side"] for t in state["trades"]], ["BUY", "SELL"])
        self.assertAlmostEqual(report["realized_pnl_fifo"],
                               state["equity"] - 1000, places=5)
        self.assertEqual(report["unrealized_pnl_conservative"], 0)
        self.assertFalse(state["real_orders_enabled"])
        self.assertEqual(state["capital_decision"], "NO_TRADE")

    def test_replay_is_bitwise_repeatable_and_does_not_change_source(self):
        source = self.ticks()
        untouched = copy.deepcopy(source)
        a_state, a_report = replay.replay_records(source)
        b_state, b_report = replay.replay_records(source)
        self.assertEqual(a_state, b_state)
        self.assertEqual(a_report, b_report)
        self.assertEqual(source, untouched)

    def test_tampered_cash_is_detected(self):
        state, _ = replay.replay_records(self.ticks())
        state["cash"] += 1
        with self.assertRaisesRegex(audit.AuditError, "cash ledger mismatch"):
            audit.audit_state(state)

    def test_tampered_position_shares_are_detected(self):
        state, _ = replay.replay_records(self.ticks()[:2])
        self.assertEqual(len(state["positions"]), 1)
        state["positions"]["test-market"]["shares"] += 3
        with self.assertRaisesRegex(audit.AuditError, "quantity mismatch"):
            audit.audit_state(state)

    def test_tampered_explicit_fees_are_detected(self):
        state, _ = replay.replay_records(self.ticks()[:2])
        state["trades"][0]["fee"] += 0.5
        with self.assertRaisesRegex(audit.AuditError, "fill cost"):
            audit.audit_state(state)

    def test_fifo_partial_sale_uses_original_cost_basis(self):
        state = replay.initial_state()
        state["cash"] = 997.55
        state["equity"] = 1000.05
        state["trades"] = [
            {"market_id": "m", "side": "BUY", "shares": 10, "price": 0.5,
             "cash_flow": -5.3, "at": "2026-11-18T12:00:00+00:00"},
            {"market_id": "m", "side": "SELL", "shares": 5, "price": 0.6,
             "cash_flow": 2.85, "at": "2026-11-18T12:01:00+00:00"},
        ]
        state["positions"] = {"m": {"shares": 5, "last_liquidation_value": 2.5}}
        report = audit.audit_state(state)
        self.assertAlmostEqual(report["realized_pnl_fifo"], 0.2)
        self.assertAlmostEqual(report["unrealized_pnl_conservative"], -0.15)
        self.assertAlmostEqual(report["open_cost_basis"], 2.65)

    def test_short_sale_is_rejected(self):
        state = replay.initial_state()
        state["cash"] = 1000.5
        state["equity"] = 1000.5
        state["trades"] = [{"market_id": "m", "side": "SELL", "shares": 1,
                            "price": 0.5, "cash_flow": 0.5,
                            "at": "2026-11-18T12:00:00+00:00"}]
        with self.assertRaisesRegex(audit.AuditError, "short sale"):
            audit.audit_state(state)

    def test_duplicate_tick_is_rejected(self):
        ticks = self.ticks()
        with self.assertRaisesRegex(ValueError, "not strictly increasing"):
            replay.replay_records([ticks[0], ticks[0]])

    def test_receipt_after_decision_fails_closed(self):
        ticks = self.ticks()
        ticks[0]["quotes"]["test-market"]["received_at"] = (
            "2026-11-18T12:00:01+00:00")
        with self.assertRaisesRegex(ValueError, "look-ahead"):
            replay.replay_records(ticks)

    def test_future_book_before_receipt_fails_closed(self):
        ticks = self.ticks()
        tick = datetime.fromisoformat(ticks[0]["tick_at"])
        ticks[0]["quotes"]["test-market"]["book_timestamp_ms"] = (
            int((tick + timedelta(seconds=1)).timestamp() * 1000))
        with self.assertRaisesRegex(ValueError, "look-ahead"):
            replay.replay_records(ticks)

    def test_undated_market_is_rejected(self):
        ticks = self.ticks()
        ticks[0]["quotes"]["test-market"].pop("book_timestamp_ms")
        with self.assertRaisesRegex(ValueError, "timestamp"):
            replay.replay_records(ticks)

    def test_stale_book_is_ignored_by_live_snapshot_gate(self):
        ticks = [sample(0, 0.44, 0.45, book_lag_seconds=90)]
        state, report = replay.replay_records(ticks)
        self.assertEqual(report["virtual_fills"], 0)
        self.assertEqual(state["rejected_quote_counts"]["stale"], 1)

    def test_existing_drawdown_kill_switch_persists_during_replay(self):
        seed = replay.initial_state()
        seed["risk_stop"] = True
        seed["observations"]["test-market"] = 0.44
        state, report = replay.replay_records([sample(1, 0.49, 0.50)], initial=seed)
        self.assertTrue(state["risk_stop"])
        self.assertEqual(state["trades"], [])
        self.assertEqual(report["status"], "PASS")

    def test_ledger_invariant_rejects_trading_enabled_state(self):
        seed = replay.initial_state()
        seed["real_orders_enabled"] = True
        with self.assertRaises(audit.AuditError):
            replay.replay_records([sample(0, 0.44, 0.45)], initial=seed)


if __name__ == "__main__":
    unittest.main()

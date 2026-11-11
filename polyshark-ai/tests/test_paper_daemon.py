import importlib.util
import sys
import unittest
from pathlib import Path

RUNTIME = Path(__file__).resolve().parents[1] / "runtime"
sys.path.insert(0, str(RUNTIME))
MODULE = RUNTIME / "paper_daemon.py"
spec = importlib.util.spec_from_file_location("paper_daemon", MODULE)
pd = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = pd
spec.loader.exec_module(pd)


class PaperDaemonTests(unittest.TestCase):
    def test_resume_after_target_preserves_equity(self):
        state = {
            "status": "stopped_target",
            "equity": 2500.0,
            "stopped_at": "2026-01-01T00:00:00+00:00",
            "stop_reason": "target_reached",
            "paper_only": True,
            "real_orders_enabled": False,
            "audit": [],
        }
        out = pd.prepare_continuous_state(state, 1_000_000_000.0)
        self.assertEqual(out["status"], "running")
        self.assertEqual(out["equity"], 2500.0)
        self.assertEqual(out["target_equity"], 1_000_000_000.0)
        self.assertIs(out["paper_only"], True)
        self.assertIs(out["real_orders_enabled"], False)
        self.assertEqual(out["audit"][-1]["event"], "SESSION_RESUME_CONTINUOUS")

    def test_bankrupt_session_is_not_resumed(self):
        state = {
            "status": "stopped_broke",
            "equity": 0.0,
            "paper_only": True,
            "real_orders_enabled": False,
            "audit": [],
        }
        out = pd.prepare_continuous_state(state, 1_000_000_000.0)
        self.assertEqual(out["status"], "stopped_broke")
        self.assertEqual(out["audit"], [])

    def test_continuous_state_forces_paper_only(self):
        state = {"status": "running", "equity": 1000.0, "audit": []}
        out = pd.prepare_continuous_state(state, 1_000_000_000.0)
        self.assertIs(out["paper_only"], True)
        self.assertIs(out["real_orders_enabled"], False)

    def test_invalid_continuous_target_is_rejected(self):
        with self.assertRaises(ValueError):
            pd.prepare_continuous_state({"status": "running"}, 0)


    def test_operational_health_detects_delayed_tick_and_disabled_feed(self):
        state = {
            "last_tick_at": "2026-11-11T02:00:00+00:00",
            "paper_only": True,
            "real_orders_enabled": False,
            "last_error": None,
            "capital_decision": "NO_TRADE",
            "challenger_evidence_feed": {"status": "DISABLED"},
            "evidence_contract": {"trade_dossier": {
                "review_status": "BLOCKED", "blocked_by": ["forward_oos"]
            }},
        }
        out = pd.operational_health_snapshot(state, "2026-11-10T23:00:00+00:00")
        self.assertEqual(out["cadence"], "DELAYED")
        self.assertEqual(out["tick_gap_seconds"], 10800)
        self.assertEqual(out["research_feed_status"], "DISABLED")
        self.assertEqual(out["evidence_review_status"], "BLOCKED")
        self.assertEqual(out["capital_decision"], "NO_TRADE")
        self.assertIs(out["paper_only"], True)
        self.assertIs(out["real_orders_enabled"], False)

    def test_operational_health_first_and_ontime(self):
        state = {"last_tick_at": "2026-11-11T02:05:00Z"}
        ontime = pd.operational_health_snapshot(state, "2026-11-11T02:00:00Z")
        self.assertEqual(ontime["cadence"], "ON_CADENCE")
        self.assertEqual(ontime["tick_gap_seconds"], 300)
        fresh = pd.operational_health_snapshot(state, None)
        self.assertEqual(fresh["cadence"], "FIRST_TICK")
        self.assertIsNone(fresh["tick_gap_seconds"])

    def test_operational_health_invalid_and_clock_skew(self):
        state = {"last_tick_at": "2026-11-11T02:05:00Z"}
        invalid = pd.operational_health_snapshot(state, "not-a-time")
        self.assertEqual(invalid["cadence"], "INVALID_TIMESTAMP")
        self.assertIsNone(invalid["tick_gap_seconds"])
        skew = pd.operational_health_snapshot(state, "2026-11-11T02:10:00Z")
        self.assertEqual(skew["cadence"], "CLOCK_SKEW")


if __name__ == "__main__":
    unittest.main()

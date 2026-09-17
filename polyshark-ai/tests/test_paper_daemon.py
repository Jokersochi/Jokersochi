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


if __name__ == "__main__":
    unittest.main()

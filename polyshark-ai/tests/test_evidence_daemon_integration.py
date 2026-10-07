import importlib.util
import sys
import unittest
from pathlib import Path

RUNTIME = Path(__file__).resolve().parents[1] / "runtime"
sys.path.insert(0, str(RUNTIME))
MODULE = RUNTIME / "paper_daemon.py"
spec = importlib.util.spec_from_file_location("paper_daemon_evidence_test", MODULE)
pd = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = pd
spec.loader.exec_module(pd)


class EvidenceDaemonIntegrationTests(unittest.TestCase):
    def test_evidence_failure_keeps_no_trade_and_invalidates_stale_review(self):
        state = {
            "paper_only": True,
            "real_orders_enabled": False,
            "audit": [],
            "evidence_contract": {
                "trade_dossier": {
                    "review_status": "REVIEW_ELIGIBLE",
                    "capital_decision": "NO_TRADE",
                }
            },
        }
        original_apply = pd.evidence.apply_contract
        try:
            pd.evidence.apply_contract = lambda _state: (_ for _ in ()).throw(RuntimeError("fixture"))
            out = pd._apply_evidence_fail_closed(state)
        finally:
            pd.evidence.apply_contract = original_apply
        self.assertEqual(out["capital_decision"], "NO_TRADE")
        self.assertIn("EvidenceContractError", out["last_error"])
        self.assertEqual(out["audit"][-1]["event"], "EVIDENCE_CONTRACT_ERROR")
        dossier = out["evidence_contract"]["trade_dossier"]
        self.assertEqual(dossier["review_status"], "BLOCKED")
        self.assertEqual(dossier["capital_decision"], "NO_TRADE")
        self.assertIn("evidence_contract_error", dossier["blocked_by"])

    def test_heartbeat_exposes_evidence_decision(self):
        state = {
            "paper_only": True,
            "real_orders_enabled": False,
            "capital_decision": "NO_TRADE",
            "equity": 500.0,
            "cash": 500.0,
            "ticks": 1,
            "open_positions": [],
            "evidence_contract": {
                "trade_dossier": {"review_status": "BLOCKED"}
            },
        }
        heartbeat = pd.heartbeat_payload(
            state,
            status="работает",
            consecutive_errors=0,
            next_tick_in=300,
        )
        self.assertEqual(heartbeat["capital_decision"], "NO_TRADE")
        self.assertEqual(heartbeat["evidence_review_status"], "BLOCKED")
        self.assertTrue(heartbeat["paper_only"])
        self.assertFalse(heartbeat["real_orders_enabled"])


if __name__ == "__main__":
    unittest.main()

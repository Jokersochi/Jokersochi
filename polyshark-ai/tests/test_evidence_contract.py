import importlib.util
import sys
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "runtime" / "evidence_contract.py"
spec = importlib.util.spec_from_file_location("evidence_contract", MODULE)
ec = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = ec
spec.loader.exec_module(ec)


class EvidenceContractTests(unittest.TestCase):
    def _state(self):
        return {
            "paper_only": True,
            "real_orders_enabled": False,
            "legacy_momentum_entries_enabled": False,
            "shadow_challenger": {
                "model_version": "fixture-v1",
                "verdict": "NO_EVIDENCE",
                "auto_promotion": False,
                "strategy_spec": {
                    "forward_only": True,
                    "max_spread": 0.02,
                    "min_entry_price": 0.40,
                },
                "summary": {
                    "24": {
                        "n": 0,
                        "mean_return": None,
                        "profit_factor": None,
                        "ci95_lower": None,
                        "ci95_upper": None,
                    }
                },
                "signals": [],
            },
        }

    def test_apply_contract_is_fail_closed_without_evidence(self):
        state = self._state()
        ec.apply_contract(state, "2026-10-08T00:00:00+00:00", market_fetcher=lambda _market_id: None)
        ec.validate_contract(state)
        dossier = state["evidence_contract"]["trade_dossier"]
        self.assertEqual(dossier["capital_decision"], "NO_TRADE")
        self.assertEqual(dossier["review_status"], "BLOCKED")
        self.assertIn("forward_oos", dossier["blocked_by"])
        self.assertIn("calibration", dossier["blocked_by"])
        self.assertIn("sample_independence", dossier["blocked_by"])

    def test_collects_forward_resolution_for_calibration(self):
        state = self._state()
        state["shadow_challenger"]["signals"].append(
            {
                "signal_id": "fixture-v1:m1:YES:1",
                "model_version": "fixture-v1",
                "market_id": "m1",
                "outcome": "YES",
                "token_id": "yes1",
                "observed_at": "2026-10-01T00:00:00+00:00",
                "end_date": "2026-10-02T00:00:00+00:00",
                "entry_mid": 0.70,
                "horizon_results": {},
                "paper_only": True,
                "capital_impact": 0.0,
            }
        )
        market = {
            "closed": True,
            "outcomes": '["Yes","No"]',
            "outcomePrices": '["1","0"]',
            "clobTokenIds": '["yes1","no1"]',
        }
        ec.apply_contract(
            state,
            "2026-10-08T00:00:00+00:00",
            market_fetcher=lambda _market_id: market,
        )
        records = state["evidence_contract"]["calibration_records"]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["actual"], 1)
        self.assertAlmostEqual(records[0]["brier"], 0.09)
        self.assertEqual(records[0]["capital_impact"], 0.0)
        self.assertTrue(records[0]["paper_only"])
        self.assertEqual(state["evidence_contract"]["forecast_archive"], [])

    def test_calibration_deduplicates_same_signal(self):
        state = self._state()
        signal = {
            "signal_id": "fixture-v1:m1:YES:1",
            "model_version": "fixture-v1",
            "market_id": "m1",
            "outcome": "YES",
            "token_id": "yes1",
            "observed_at": "2026-10-01T00:00:00+00:00",
            "end_date": "2026-10-02T00:00:00+00:00",
            "entry_mid": 0.60,
            "horizon_results": {},
            "paper_only": True,
            "capital_impact": 0.0,
        }
        state["shadow_challenger"]["signals"] = [signal]
        market = {
            "closed": True,
            "outcomes": ["Yes", "No"],
            "outcomePrices": ["1", "0"],
            "clobTokenIds": ["yes1", "no1"],
        }
        for _ in range(2):
            ec.apply_contract(
                state,
                "2026-10-08T00:00:00+00:00",
                market_fetcher=lambda _market_id: market,
            )
        self.assertEqual(len(state["evidence_contract"]["calibration_records"]), 1)

    def test_review_eligible_still_cannot_authorize_trade(self):
        state = self._state()
        shadow = state["shadow_challenger"]
        shadow["verdict"] = "ELIGIBLE_FOR_REVIEW"
        shadow["summary"]["24"] = {
            "n": 100,
            "mean_return": 0.02,
            "profit_factor": 1.5,
            "ci95_lower": 0.01,
            "ci95_upper": 0.03,
        }
        for index in range(100):
            shadow["signals"].append(
                {
                    "signal_id": f"s{index}",
                    "model_version": "fixture-v1",
                    "market_id": f"m{index}",
                    "horizon_results": {"24": {"after_cost_return": 0.02}},
                }
            )
        state["evidence_contract"] = {
            "calibration_records": [
                {
                    "signal_id": f"cal-{index}",
                    "model_version": "fixture-v1",
                    "market_id": f"cal-market-{index}",
                    "forecast_probability": 0.9 if index % 2 == 0 else 0.1,
                    "actual": 1 if index % 2 == 0 else 0,
                    "brier": 0.01,
                    "paper_only": True,
                    "capital_impact": 0.0,
                }
                for index in range(ec.CALIBRATION_MIN_RESOLVED)
            ]
        }
        ec.apply_contract(
            state,
            "2026-10-08T00:00:00+00:00",
            market_fetcher=lambda _market_id: None,
        )
        dossier = state["evidence_contract"]["trade_dossier"]
        self.assertEqual(dossier["review_status"], "REVIEW_ELIGIBLE")
        self.assertEqual(dossier["capital_decision"], "NO_TRADE")
        self.assertFalse(dossier["auto_promotion"])
        self.assertTrue(dossier["independence"]["forward_24h"]["passed"])
        self.assertTrue(dossier["independence"]["calibration_resolved"]["passed"])
        self.assertEqual(state["capital_decision"], "NO_TRADE")

    def test_non_paper_state_is_rejected(self):
        state = self._state()
        state["real_orders_enabled"] = True
        with self.assertRaises(RuntimeError):
            ec.apply_contract(state, "2026-10-08T00:00:00+00:00")


if __name__ == "__main__":
    unittest.main()

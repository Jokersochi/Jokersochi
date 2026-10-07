import importlib.util
import sys
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "runtime" / "evidence_contract.py"
spec = importlib.util.spec_from_file_location("evidence_contract_limits", MODULE)
ec = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = ec
spec.loader.exec_module(ec)


class EvidenceContractLimitTests(unittest.TestCase):
    def _signal(self, index: int, model: str = "current-v1"):
        return {
            "signal_id": f"{model}:m{index}:YES:{index}",
            "model_version": model,
            "market_id": f"m{index}",
            "outcome": "YES",
            "token_id": f"yes-{index}",
            "observed_at": "2026-09-01T00:00:00+00:00",
            "end_date": "2026-09-02T00:00:00+00:00",
            "entry_mid": 0.60,
            "horizon_results": {},
            "paper_only": True,
            "capital_impact": 0.0,
        }

    def _state(self, signals):
        return {
            "paper_only": True,
            "real_orders_enabled": False,
            "shadow_challenger": {
                "model_version": "current-v1",
                "signals": signals,
            },
        }

    def test_resolution_lookups_are_bounded_per_tick(self):
        calls = []
        state = self._state(
            [self._signal(index) for index in range(ec.CALIBRATION_LOOKUPS_PER_TICK + 10)]
        )

        def fetcher(market_id):
            calls.append(market_id)
            return None

        ec.collect_calibration_records(
            state,
            "2026-10-08T00:00:00+00:00",
            market_fetcher=fetcher,
        )
        scan = state["evidence_contract"]["last_calibration_scan"]
        self.assertEqual(len(calls), ec.CALIBRATION_LOOKUPS_PER_TICK)
        self.assertEqual(scan["lookups"], ec.CALIBRATION_LOOKUPS_PER_TICK)
        self.assertGreater(scan["due"], scan["lookups"])
        self.assertEqual(scan["resolved_added"], 0)
        self.assertEqual(scan["archive_pending"], ec.CALIBRATION_LOOKUPS_PER_TICK + 10)

    def test_retry_backoff_allows_later_due_forecasts_to_progress(self):
        total = ec.CALIBRATION_LOOKUPS_PER_TICK + 10
        state = self._state([self._signal(index) for index in range(total)])
        first_calls = []
        second_calls = []

        ec.collect_calibration_records(
            state,
            "2026-10-08T00:00:00+00:00",
            market_fetcher=lambda market_id: first_calls.append(market_id) or None,
        )
        ec.collect_calibration_records(
            state,
            "2026-10-08T00:05:00+00:00",
            market_fetcher=lambda market_id: second_calls.append(market_id) or None,
        )
        self.assertEqual(len(first_calls), ec.CALIBRATION_LOOKUPS_PER_TICK)
        self.assertEqual(len(second_calls), 10)
        self.assertTrue(set(first_calls).isdisjoint(set(second_calls)))

    def test_only_current_model_contributes_calibration(self):
        calls = []
        current = self._signal(1, "current-v1")
        old = self._signal(2, "old-v0")
        state = self._state([old, current])

        def fetcher(market_id):
            calls.append(market_id)
            return {
                "closed": True,
                "outcomes": ["Yes", "No"],
                "outcomePrices": ["1", "0"],
                "clobTokenIds": ["yes-1", "no-1"],
            }

        records = ec.collect_calibration_records(
            state,
            "2026-10-08T00:00:00+00:00",
            market_fetcher=fetcher,
        )
        self.assertEqual(calls, ["m1"])
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["model_version"], "current-v1")
        self.assertEqual(records[0]["market_id"], "m1")

    def test_archived_forecast_survives_shadow_retention_until_resolution(self):
        signal = self._signal(7)
        state = self._state([signal])
        added = ec.snapshot_calibration_candidates(state, "2026-09-01T01:00:00+00:00")
        self.assertEqual(added, 1)
        self.assertEqual(len(state["evidence_contract"]["forecast_archive"]), 1)

        # Simulate paper_trader shadow retention removing the original signal.
        state["shadow_challenger"]["signals"] = []

        market = {
            "closed": True,
            "outcomes": ["Yes", "No"],
            "outcomePrices": ["1", "0"],
            "clobTokenIds": ["yes-7", "no-7"],
        }
        records = ec.collect_calibration_records(
            state,
            "2026-10-08T00:00:00+00:00",
            market_fetcher=lambda _market_id: market,
        )
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["signal_id"], signal["signal_id"])
        self.assertEqual(state["evidence_contract"]["forecast_archive"], [])


if __name__ == "__main__":
    unittest.main()

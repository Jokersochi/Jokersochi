import importlib.util
import sys
import unittest
from pathlib import Path


MODULE = Path(__file__).resolve().parents[1] / "runtime" / "challenger_v2.py"
spec = importlib.util.spec_from_file_location("challenger_v2_test", MODULE)
cv2 = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = cv2
spec.loader.exec_module(cv2)


class ChallengerV2Tests(unittest.TestCase):
    QUESTION = "Will the independent fixture event resolve YES?"
    NOW = "2026-10-29T10:00:00+00:00"

    def _evidence(self, probability=0.72):
        digest = cv2.question_hash(self.QUESTION)
        return [
            {
                "source_id": "research-a",
                "evidence_id": "a-1",
                "observed_at": self.NOW,
                "question_hash": digest,
                "probability_yes": probability,
                "independent_of_market_price": True,
            },
            {
                "source_id": "research-b",
                "evidence_id": "b-1",
                "observed_at": self.NOW,
                "question_hash": digest,
                "probability_yes": probability,
                "independent_of_market_price": True,
            },
        ]

    def test_missing_or_single_source_evidence_abstains_at_neutral_prior(self):
        missing = cv2.price_blind_event_forecast(self.QUESTION, self.NOW, None)
        one_source = cv2.price_blind_event_forecast(self.QUESTION, self.NOW, self._evidence()[:1])
        self.assertEqual(missing.probability_yes, 0.5)
        self.assertEqual(one_source.probability_yes, 0.5)
        self.assertEqual(missing.status, "INSUFFICIENT_INDEPENDENT_EVIDENCE")

    def test_forecast_is_reproducible_without_any_market_price_argument(self):
        forecast = cv2.price_blind_event_forecast(self.QUESTION, self.NOW, self._evidence(0.73))
        self.assertEqual(forecast.status, "OK")
        self.assertAlmostEqual(forecast.probability_yes, 0.73)
        self.assertEqual(forecast.source_ids, ("research-a", "research-b"))

    def test_costed_edge_includes_spread_fee_slippage_and_liquidity_gate(self):
        edge = cv2.costed_edge(
            probability=0.72,
            market_probability=0.50,
            spread=0.02,
            fee_rate=0.05,
            liquidity=100_000.0,
            notional=100.0,
        )
        self.assertTrue(edge["eligible"])
        self.assertGreater(edge["entry_price"], edge["market_probability"])
        self.assertGreater(edge["all_in_cost_per_share"], edge["entry_price"])
        self.assertGreater(edge["slippage_cost"], 0.0)
        self.assertGreater(edge["net_edge_per_share"], 0.0)

    def test_insufficient_liquidity_fails_closed(self):
        edge = cv2.costed_edge(
            probability=0.90,
            market_probability=0.20,
            spread=0.01,
            fee_rate=0.05,
            liquidity=100.0,
            notional=100.0,
        )
        self.assertFalse(edge["eligible"])

    def test_nonfinite_weights_abstain(self):
        for weight in ("nan", "inf", "-inf"):
            evidence = self._evidence()
            evidence[0]["weight"] = weight
            result = cv2.price_blind_event_forecast(self.QUESTION, self.NOW, evidence)
            self.assertEqual(result.status, "INSUFFICIENT_INDEPENDENT_EVIDENCE")


if __name__ == "__main__":
    unittest.main()

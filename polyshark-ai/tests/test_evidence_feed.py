"""Local-only tests: neither source URLs nor Polymarket APIs are contacted."""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

RUNTIME = Path(__file__).resolve().parents[1] / "runtime"
sys.path.insert(0, str(RUNTIME))

import challenger_v2 as cv2
import evidence_feed as ef
import paper_daemon as pd


NOW = "2026-11-03T00:00:00+00:00"
QUESTION = "Will fixture-only event resolve YES?"


def sample_feed():
    return {
        "schema_version": ef.SCHEMA_VERSION,
        "generated_at": NOW,
        "markets": [{
            "market_id": "fixture-1",
            "question": QUESTION,
            "sources": [
                {
                    "source_url": "https://news-a.example.org/report",
                    "published_at": "2026-11-02T18:00:00+00:00",
                    "observed_at": "2026-11-02T19:00:00+00:00",
                    "probability_yes": 0.72,
                    "independent_of_market_price": True,
                    "reviewed_by": "reviewer-A",
                },
                {
                    "source_url": "https://news-b.example.net/forecast",
                    "published_at": "2026-11-02T18:30:00+00:00",
                    "observed_at": "2026-11-02T19:30:00+00:00",
                    "probability_yes": 0.74,
                    "independent_of_market_price": True,
                    "reviewed_by": "reviewer-A",
                },
            ],
        }],
    }


class EvidenceFeedTests(unittest.TestCase):
    def write_feed(self, path, data):
        path.write_text(json.dumps(data), encoding="utf-8")

    def test_valid_feed_enters_price_blind_forecast(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "evidence.json"
            self.write_feed(path, sample_feed())
            observations, report = ef.load_research_feed(path, now=NOW)
            self.assertEqual(report["status"], "LOADED")
            self.assertFalse(report["provenance_verified"])
            self.assertEqual(report["observations"], 2)
            forecast = cv2.price_blind_event_forecast(QUESTION, NOW, observations["fixture-1"])
            self.assertEqual(forecast.status, "OK")
            self.assertAlmostEqual(forecast.probability_yes, 0.73)
            self.assertEqual(len(forecast.source_ids), 2)

    def test_market_price_injection_or_future_publication_rejected(self):
        for mutation in ("price", "future", "self_attestation", "nan", "missing_reviewer"):
            data = sample_feed()
            row = data["markets"][0]["sources"][0]
            if mutation == "price":
                row["p_market"] = 0.40
            elif mutation == "future":
                row["published_at"] = "2026-11-04T00:00:00+00:00"
            elif mutation == "self_attestation":
                row["independent_of_market_price"] = False
            elif mutation == "nan":
                row["probability_yes"] = float("nan")
            elif mutation == "missing_reviewer":
                row["reviewed_by"] = ""
            with self.subTest(mutation=mutation), tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / "evidence.json"
                self.write_feed(path, data)
                with self.assertRaises(ValueError):
                    ef.load_research_feed(path, now=NOW)

    def test_two_urls_on_same_host_do_not_manufacture_independence(self):
        data = sample_feed()
        data["markets"][0]["sources"][1]["source_url"] = "https://news-a.example.org/other"
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "evidence.json"
            self.write_feed(path, data)
            observations, report = ef.load_research_feed(path, now=NOW)
        self.assertEqual(report["observations"], 1)
        self.assertEqual(
            cv2.price_blind_event_forecast(QUESTION, NOW, observations["fixture-1"]).status,
            "INSUFFICIENT_INDEPENDENT_EVIDENCE",
        )

    def test_stale_observations_abstain(self):
        data = sample_feed()
        data["markets"][0]["sources"][0]["published_at"] = "2026-10-01T00:00:00+00:00"
        data["markets"][0]["sources"][0]["observed_at"] = "2026-10-01T01:00:00+00:00"
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "evidence.json"
            self.write_feed(path, data)
            observations, report = ef.load_research_feed(path, now=NOW)
        self.assertEqual(report["observations"], 1)

    def test_disabled_feed_purges_stale_state_before_any_tick(self):
        state = {"challenger_v2_evidence": {"old": [{"probability_yes": 0.99}]}}
        with patch.dict(os.environ, {"PAPER_CHALLENGER_EVIDENCE_FILE": ""}):
            pd._refresh_challenger_research(state, now=NOW)
        self.assertEqual(state["challenger_v2_evidence"], {})
        self.assertEqual(state["challenger_evidence_feed"]["status"], "DISABLED")

    def test_bad_configured_feed_invalidates_previous_eligible_dossier(self):
        state = {
            "paper_only": True, "real_orders_enabled": False, "audit": [],
            "challenger_v2_evidence": {"old": [{"probability_yes": 0.99}]},
            "evidence_contract": {"trade_dossier": {"review_status": "REVIEW_ELIGIBLE"}},
        }
        with patch.dict(os.environ, {"PAPER_CHALLENGER_EVIDENCE_FILE": "/missing/fixture/evidence.json"}):
            with self.assertRaises(ValueError):
                pd._refresh_challenger_research(state, now=NOW)
        self.assertEqual(state["challenger_v2_evidence"], {})
        self.assertEqual(state["challenger_evidence_feed"]["status"], "INVALID")
        result = pd._apply_evidence_fail_closed(state)
        self.assertEqual(result["capital_decision"], "NO_TRADE")
        self.assertEqual(result["evidence_contract"]["trade_dossier"]["review_status"], "BLOCKED")

    def test_nonfinite_forecast_probability_never_becomes_signal(self):
        evidence = [{
            "source_id": "a", "evidence_id": "a", "observed_at": NOW,
            "question_hash": cv2.question_hash(QUESTION),
            "probability_yes": float("nan"), "independent_of_market_price": True,
        }, {
            "source_id": "b", "evidence_id": "b", "observed_at": NOW,
            "question_hash": cv2.question_hash(QUESTION),
            "probability_yes": 0.80, "independent_of_market_price": True,
        }]
        self.assertEqual(
            cv2.price_blind_event_forecast(QUESTION, NOW, evidence).status,
            "INSUFFICIENT_INDEPENDENT_EVIDENCE",
        )

    def test_newest_observation_per_source_wins_regardless_of_input_order(self):
        evidence = [
            {"source_id": "a", "evidence_id": "new", "observed_at": NOW,
             "question_hash": cv2.question_hash(QUESTION), "probability_yes": 0.8,
             "independent_of_market_price": True},
            {"source_id": "b", "evidence_id": "b", "observed_at": NOW,
             "question_hash": cv2.question_hash(QUESTION), "probability_yes": 0.8,
             "independent_of_market_price": True},
            {"source_id": "a", "evidence_id": "old", "observed_at": "2026-11-02T00:00:00+00:00",
             "question_hash": cv2.question_hash(QUESTION), "probability_yes": 0.1,
             "independent_of_market_price": True},
        ]
        for permutation in (evidence, list(reversed(evidence))):
            forecast = cv2.price_blind_event_forecast(QUESTION, NOW, permutation)
            self.assertEqual(forecast.status, "OK")
            self.assertAlmostEqual(forecast.probability_yes, 0.8)

    def test_costed_edge_rejects_negative_fee_or_notional(self):
        args = dict(probability=0.90, market_probability=0.40, spread=0.01,
                    fee_rate=0.05, liquidity=100_000.0, notional=100)
        for bad in ({"fee_rate": -1.0}, {"notional": -100.0}, {"liquidity": 0.0}):
            self.assertFalse(cv2.costed_edge(**dict(args, **bad))["eligible"])


if __name__ == "__main__":
    unittest.main()

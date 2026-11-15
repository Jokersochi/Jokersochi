"""Unit tests for read-only BTC research; all public HTTP calls are fixtures."""
from __future__ import annotations

import importlib.util
import math
import sys
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "runtime"
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("spot_research_test", ROOT / "spot_research.py")
research = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = research
spec.loader.exec_module(research)

NOW = datetime(2026, 11, 16, 8, 30, tzinfo=timezone.utc)
END = "2026-11-16T17:00:00Z"
DESCRIPTION = (
    'This market will resolve to "Yes" if the Binance 1 minute candle for BTC/USDT '
    'closing at 12:00 in the ET timezone (noon) has a final "Close" price higher '
    'than the specified threshold. Resolution source: Binance BTC/USDT.'
)


def candles(now=NOW, venue="coinbase"):
    # 74 completed candles + 1 unfinished. The unfinished close MUST be ignored.
    start = int(now.replace(minute=0, second=0).timestamp()) - 74 * 3600
    rows = []
    for i in range(75):
        t = start + 3600 * i
        close = 65_000 * math.exp(0.002 * math.sin(i / 2.0) + 0.0003 * i)
        if i == 74:
            close = 500_000  # future/current candle poison
        if venue == "coinbase":
            rows.append([t, close * .99, close * 1.01, close, close, 1.0])
        else:
            rows.append([t, str(close), str(close), str(close), str(close), "0", "1", 10])
    if venue == "coinbase":
        return list(reversed(rows))
    return {"error": [], "result": {"XXBTZUSD": rows, "last": start + 74 * 3600}}


def market(**kwargs):
    row = {
        "id": "6909217",
        "question": "Will the price of Bitcoin be above $66,000 on November 16?",
        "endDate": END,
        "description": DESCRIPTION,
        "closed": False,
        "outcomes": '["Yes","No"]',
        "clobTokenIds": '["YES_TEST","NO_TEST"]',
        "outcomePrices": '["0.42","0.58"]',
        "liquidityNum": 110_000,
    }
    row.update(kwargs)
    return row


class SpotResearchTests(unittest.TestCase):
    def test_noon_et_dst_and_standard_time(self):
        self.assertEqual(research.resolution_utc(date(2026, 11, 16)).hour, 17)
        self.assertEqual(research.resolution_utc(date(2026, 7, 16)).hour, 16)
        self.assertEqual(research.resolution_utc(date(2026, 3, 8)).hour, 16)
        self.assertEqual(research.resolution_utc(date(2026, 11, 1)).hour, 17)

    def test_live_event_pattern_matches_exact_settlement_rules_only(self):
        self.assertIsNotNone(research.validated_market(market(), NOW))
        for change in (
            {"description": "Other closing price"},
            {"question": "Will Bitcoin touch $66,000 on November 16?"},
            {"endDate": "2026-11-16T16:00:00Z"},
            {"closed": True},
        ):
            with self.subTest(change=change):
                self.assertIsNone(research.validated_market(market(**change), NOW))

    def test_candles_exclude_unfinished_horizon_and_identify_72_hour_sample(self):
        cb = research.coinbase_series(candles(), NOW)
        kr = research.kraken_series(candles(venue="kraken"), NOW)
        self.assertEqual(len(cb), 73)
        self.assertEqual(len(kr), 73)
        self.assertLess(cb[-1][1], 90_000)  # poison excluded
        self.assertLess(kr[-1][1], 90_000)
        self.assertEqual(cb, kr)
        stats = research.venue_statistics(cb)
        self.assertEqual(stats["sample_returns"], 72)
        self.assertTrue(0 < stats["hourly_volatility"] < 0.15)

    def test_gap_and_staleness_fail_closed(self):
        raw = candles()
        self.assertEqual(len(raw), 75)
        raw.pop(20)
        with self.assertRaisesRegex(ValueError, "gapped"):
            research.coinbase_series(raw, NOW)
        with self.assertRaisesRegex(ValueError, "Stale"):
            research.coinbase_series(candles(), NOW + timedelta(hours=12))

    def test_terminal_probability_is_price_blind_and_monotonic(self):
        p1 = research.terminal_above_probability(65_000, 64_000, .004, 9)
        p2 = research.terminal_above_probability(65_000, 66_000, .004, 9)
        self.assertGreater(p1, p2)
        self.assertGreater(p1, .5)
        self.assertLess(p2, .5)

    def test_report_has_no_trade_even_with_modelled_positive_edge(self):
        event = {"title": "Bitcoin above ___ on November 16?",
                 "slug": "bitcoin-above-on-november-16-2026",
                 "markets": [market()]}
        report = research.build_report(
            NOW, event, candles(), candles(venue="kraken"),
            book_fetcher=lambda _url: {"bids": [{"price": "0.40"}],
                                      "asks": [{"price": "0.42"}]},
        )
        self.assertEqual(report["fit_status"], "UNCALIBRATED_NOT_ELIGIBLE")
        self.assertEqual(report["capital_decision"], "NO_TRADE")
        self.assertFalse(report["independent_probability_evidence"])
        self.assertEqual(report["markets_evaluated"], 1)
        m = report["markets"][0]
        self.assertFalse(m["shadow_eligible"])
        self.assertEqual(m["diagnostic_status"], "NO_TRADE")
        self.assertTrue(m["execution_quote_available"])
        self.assertTrue(0 <= m["p_model_uncalibrated"] <= 1)
        self.assertIn("illustrative_cost_model", m)

    def test_missing_book_is_not_an_edge(self):
        event = {"markets": [market()]}
        report = research.build_report(
            NOW, event, candles(), candles(venue="kraken"),
            book_fetcher=lambda _url: {"bids": [], "asks": []},
        )
        m = report["markets"][0]
        self.assertFalse(m["execution_quote_available"])
        self.assertNotIn("illustrative_cost_model", m)
        self.assertFalse(m["shadow_eligible"])

    def test_bad_venue_data_produce_no_model(self):
        kr = candles(venue="kraken")
        kr["error"] = ["EGeneral:Invalid arguments"]
        with self.assertRaises(ValueError):
            research.build_report(NOW, {"markets": [market()]}, candles(), kr)

    def test_same_origin_not_claimed_independent(self):
        report = research.build_report(
            NOW, {"markets": [market()]}, candles(), candles(venue="kraken")
        )
        self.assertFalse(report["independent_probability_evidence"])
        self.assertIn("correlated", report["source_independence_note"])
        self.assertIn("Binance BTC/USDT", report["settlement_basis_risk"])

    def test_same_market_price_cannot_change_model_probability(self):
        a = research.build_report(
            NOW, {"markets": [market(outcomePrices='["0.2","0.8"]')]},
            candles(), candles(venue="kraken"),
        )
        b = research.build_report(
            NOW, {"markets": [market(outcomePrices='["0.9","0.1"]')]},
            candles(), candles(venue="kraken"),
        )
        self.assertEqual(a["markets"][0]["p_model_uncalibrated"],
                         b["markets"][0]["p_model_uncalibrated"])
        self.assertNotEqual(a["markets"][0]["p_market_indicative"],
                            b["markets"][0]["p_market_indicative"])


if __name__ == "__main__":
    unittest.main()

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
        "feesEnabled": True,
        "feeSchedule": {"rate": 0.07, "exponent": 1, "takerOnly": True,
                        "rebateRate": 0.2},
    }
    row.update(kwargs)
    return row


def clob_book(*, now=NOW, token_id="YES_TEST", bids=None, asks=None):
    return {
        "market": "0x" + "1" * 64,
        "asset_id": token_id,
        "timestamp": str(int(now.timestamp() * 1000)),
        "hash": "a" * 40,
        "bids": bids if bids is not None else [{"price": "0.40", "size": "1000"}],
        "asks": asks if asks is not None else [{"price": "0.42", "size": "1000"}],
        "min_order_size": "5",
        "tick_size": "0.001",
        "neg_risk": False,
    }


def clob_fetcher(book, *, server_time=NOW):
    def fetch(url):
        if url == research.CLOB_TIME:
            return int(server_time.timestamp())
        if url.startswith(research.CLOB_BOOK):
            return book
        raise AssertionError("Unexpected CLOB request: " + url)
    return fetch


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
            book_fetcher=clob_fetcher(clob_book()),
        )
        self.assertEqual(report["fit_status"], "UNCALIBRATED_NOT_ELIGIBLE")
        self.assertEqual(report["capital_decision"], "NO_TRADE")
        self.assertFalse(report["independent_probability_evidence"])
        self.assertEqual(report["markets_evaluated"], 1)
        m = report["markets"][0]
        self.assertFalse(m["shadow_eligible"])
        self.assertEqual(m["diagnostic_status"], "NO_TRADE")
        self.assertTrue(m["execution_quote_available"])
        self.assertEqual(m["cost_fee_source"], research.FEE_SOURCE)
        self.assertEqual(m["cost_fee_rate"], .07)
        self.assertAlmostEqual(
            m["illustrative_cost_model"]["fee_per_share"],
            .07 * m["illustrative_cost_model"]["entry_price"]
            * (1 - m["illustrative_cost_model"]["entry_price"]),
            places=8,
        )
        depth = m["illustrative_cost_model"]
        self.assertEqual(depth["model_version"], "CLOB_VISIBLE_ASK_DEPTH_V1")
        self.assertTrue(depth["fill_complete"])
        self.assertTrue(depth["eligible"])
        self.assertAlmostEqual(depth["filled_notional_usd"], 100.0, places=5)
        self.assertEqual(depth["book_hash"], "a" * 40)
        self.assertEqual(depth["book_asset_id"], "YES_TEST")
        self.assertEqual(depth["book_min_order_size"], 5.0)
        self.assertGreater(depth["shares_filled"], 5)
        self.assertEqual(len(depth["levels_consumed"]), 1)
        self.assertTrue(0 <= m["p_model_uncalibrated"] <= 1)
        self.assertIn("illustrative_cost_model", m)

    def test_depth_replay_sorts_asks_and_calculates_vwap_across_levels(self):
        book = clob_book(
            bids=[{"price": "0.40", "size": "100"},
                  {"price": "0.39", "size": "100"}],
            asks=[{"price": "0.45", "size": "200"},
                  {"price": "0.42", "size": "100"}],
        )
        result = research.depth_aware_buy_cost(
            book, expected_token_id="YES_TEST", now=NOW, server_time=NOW,
            probability=.60, fee_rate=.07, fee_exponent=1,
            market_liquidity=110_000, notional=100,
        )
        self.assertTrue(result["fill_complete"])
        self.assertTrue(result["eligible"])
        self.assertEqual(result["book_best_ask"], .42)
        self.assertEqual(result["book_best_bid"], .40)
        self.assertEqual(result["book_worst_ask_used"], .45)
        self.assertEqual(len(result["levels_consumed"]), 2)
        self.assertAlmostEqual(result["filled_notional_usd"], 100, places=7)
        self.assertGreater(result["book_vwap"], .42)
        self.assertGreater(result["book_depth_slippage_vs_best_ask"], 0)
        self.assertGreater(result["fee_total_usd"], 0)
        self.assertAlmostEqual(
            result["all_in_cost_per_share"],
            result["book_vwap"] + result["fee_per_share"], places=7,
        )

    def test_partial_depth_never_produces_eligible_cost(self):
        book = clob_book(asks=[{"price": "0.42", "size": "10"}])
        result = research.depth_aware_buy_cost(
            book, expected_token_id="YES_TEST", now=NOW, server_time=NOW,
            probability=.95, fee_rate=.07, fee_exponent=1,
            market_liquidity=110_000, notional=100,
        )
        self.assertFalse(result["fill_complete"])
        self.assertFalse(result["eligible"])
        self.assertIsNone(result["all_in_cost_per_share"])
        self.assertLess(result["filled_notional_usd"], 100)

    def test_depth_book_rejects_wrong_token_stale_time_and_bad_hash(self):
        valid = clob_book()
        with self.assertRaisesRegex(ValueError, "asset_id mismatch"):
            research.depth_aware_buy_cost(
                valid, expected_token_id="OTHER", now=NOW, server_time=NOW,
                probability=.6, fee_rate=.07, fee_exponent=1,
                market_liquidity=110_000,
            )
        stale = clob_book(now=NOW - timedelta(seconds=31))
        with self.assertRaisesRegex(ValueError, "stale or future"):
            research.depth_aware_buy_cost(
                stale, expected_token_id="YES_TEST", now=NOW, server_time=NOW,
                probability=.6, fee_rate=.07, fee_exponent=1,
                market_liquidity=110_000,
            )
        bad_hash = clob_book()
        bad_hash["hash"] = "bad"
        with self.assertRaisesRegex(ValueError, "book hash"):
            research.depth_aware_buy_cost(
                bad_hash, expected_token_id="YES_TEST", now=NOW, server_time=NOW,
                probability=.6, fee_rate=.07, fee_exponent=1,
                market_liquidity=110_000,
            )

    def test_depth_book_rejects_crossed_or_duplicate_levels(self):
        crossed = clob_book(
            bids=[{"price": "0.45", "size": "100"}],
            asks=[{"price": "0.42", "size": "1000"}],
        )
        with self.assertRaisesRegex(ValueError, "Crossed"):
            research.depth_aware_buy_cost(
                crossed, expected_token_id="YES_TEST", now=NOW, server_time=NOW,
                probability=.6, fee_rate=.07, fee_exponent=1,
                market_liquidity=110_000,
            )
        duplicate = clob_book(asks=[
            {"price": "0.42", "size": "100"},
            {"price": "0.42", "size": "100"},
        ])
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            research.depth_aware_buy_cost(
                duplicate, expected_token_id="YES_TEST", now=NOW, server_time=NOW,
                probability=.6, fee_rate=.07, fee_exponent=1,
                market_liquidity=110_000,
            )

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

    def test_missing_or_unsupported_fee_schedule_blocks_cost_and_quote(self):
        event = {"markets": [market(feesEnabled=True, feeSchedule=None)]}
        m = research.build_report(
            NOW, event, candles(), candles(venue="kraken"),
            book_fetcher=lambda _: {"bids": [{"price": "0.40"}],
                                     "asks": [{"price": "0.42"}]},
        )["markets"][0]
        self.assertEqual(m["fee_source"], "UNKNOWN")
        self.assertIsNone(m["fee_rate"])
        self.assertFalse(m["execution_quote_available"])
        self.assertNotIn("illustrative_cost_model", m)
        self.assertFalse(m["shadow_eligible"])
        invalid = market(feesEnabled=True, feeSchedule={
            "rate": 0.07, "exponent": 2, "takerOnly": True,
        })
        self.assertEqual(research.market_fee_parameters(invalid), ("UNSUPPORTED", None))
        self.assertEqual(research.market_fee_parameters(market(feesEnabled=False)),
                         (research.FEE_SOURCE, 0.0))

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

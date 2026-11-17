"""Offline, deterministic tests for forward-only BTC research."""
from __future__ import annotations
import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "runtime"
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("btc_forward_eval_test", ROOT / "btc_forward_evaluation.py")
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)

OBSERVED = datetime(2026, 11, 15, 21, 24, tzinfo=timezone.utc)
SETTLED = datetime(2026, 11, 16, 17, tzinfo=timezone.utc)
LATER = SETTLED + timedelta(minutes=20)
DESCRIPTION = (
    'This market will resolve to "Yes" if the Binance 1 minute candle for BTC/USDT '
    'closing at 12:00 in the ET timezone (noon) has a final "Close" price higher '
    'than the price specified in the title. Otherwise, this market will resolve '
    'to "No". The resolution source is Binance BTC/USDT.'
)
SLUG = "bitcoin-above-on-november-16-2026"
QUESTION = "Will the price of Bitcoin be above $66,000 on November 16?"


def report(observed=OBSERVED):
    return {
        "fit_status": "UNCALIBRATED_NOT_ELIGIBLE",
        "model_version": mod.MODEL_VERSION,
        "observed_at": mod.utc(observed),
        "event_slug": SLUG,
        "paper_only": True, "real_orders_enabled": False,
        "research_only": True, "independent_probability_evidence": False,
        "capital_decision": "NO_TRADE",
        "data_sources": {
            "coinbase": {
                "last_closed_candle_at": mod.utc(observed.replace(minute=0)),
                "sample_sha256": "a" * 64, "sample_returns": 72,
                "spot_usd": 65093.08, "hourly_volatility": .0078,
            },
            "kraken": {
                "last_closed_candle_at": mod.utc(observed.replace(minute=0)),
                "sample_sha256": "b" * 64, "sample_returns": 72,
                "spot_usd": 65093.7, "hourly_volatility": .0079,
            },
        },
        "markets": [{
            "market_id": "6909217",
            "question": QUESTION,
            "threshold_usd": 66000, "end_at": mod.utc(SETTLED),
            "p_model_uncalibrated": .34, "p_market_indicative": .3,
            "execution_quote_available": True,
            "public_yes_bid": .29, "public_yes_ask": .31,
            "illustrative_cost_model": {
                "all_in_cost_per_share": .33,
                "net_edge_per_share": .01, "eligible": True,
            },
            "diagnostic_status": "NO_TRADE", "shadow_eligible": False,
        }],
    }


def gamma(*, status="resolved", yes=1):
    return [{
        "closed": True, "markets": [{
            "id": "6909217", "closed": True,
            "endDate": mod.utc(SETTLED),
            "question": QUESTION,
            "description": DESCRIPTION,
            "umaResolutionStatus": status,
            "outcomes": '["Yes", "No"]',
            "outcomePrices": '["1","0"]' if yes else '["0","1"]',
        }],
    }]


def source(price=67000, *, open_offset=0, gamma_data=None):
    calls = []
    def fetch(url):
        calls.append(url)
        if "data-api.binance.vision" in url:
            end = int(SETTLED.timestamp() * 1000)
            return [[end - 60000 + open_offset, "67000", "67001", "66999",
                     str(price), "10", end - 1, "1000", 5]]
        if "gamma-api.polymarket.com" in url:
            return gamma() if gamma_data is None else gamma_data
        raise AssertionError("Unexpected source request")
    fetch.calls = calls
    return fetch


class ForwardLedgerTests(unittest.TestCase):
    def test_empty(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(mod.load_ledger(Path(d) / "missing.json"), mod.blank_ledger())

    def test_capture_pre_event_and_provenance(self):
        ledger = mod.blank_ledger()
        self.assertTrue(mod.append_snapshot(ledger, report(), OBSERVED + timedelta(minutes=1)))
        s = ledger["snapshots"][0]
        self.assertEqual(s["horizon_bucket"], "12h-24h")
        self.assertEqual(s["capital_decision"], "NO_TRADE")
        self.assertTrue(s["research_only"])
        self.assertEqual(s["markets"][0]["p_model"], .34)
        self.assertEqual(mod.digest({k: v for k, v in s.items() if k != "sha256"}), s["sha256"])

    def test_refuses_historical_replay_and_future_report(self):
        for now in (OBSERVED + timedelta(hours=2), OBSERVED - timedelta(seconds=10)):
            with self.assertRaisesRegex(ValueError, "Historical replay"):
                mod.snapshot_from_report(report(), now)

    def test_refuses_auto_trading(self):
        for key, unsafe in (("paper_only", False), ("real_orders_enabled", True),
                            ("capital_decision", "TRADE"), ("research_only", False)):
            candidate = report()
            candidate[key] = unsafe
            with self.subTest(key=key), self.assertRaises(ValueError):
                mod.snapshot_from_report(candidate, OBSERVED)
        candidate = report()
        candidate["markets"][0]["shadow_eligible"] = True
        with self.assertRaisesRegex(ValueError, "Auto-trading"):
            mod.snapshot_from_report(candidate, OBSERVED)

    def test_deduplicate_once_per_event_horizon(self):
        ledger = mod.blank_ledger()
        self.assertTrue(mod.append_snapshot(ledger, report(), OBSERVED))
        later = OBSERVED + timedelta(minutes=30)
        self.assertFalse(mod.append_snapshot(ledger, report(later), later))
        self.assertEqual(len(ledger["snapshots"]), 1)

    def test_tampered_historical_forecast_fails(self):
        ledger = mod.blank_ledger()
        mod.append_snapshot(ledger, report(), OBSERVED)
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "ledger.json"
            p.write_text(json.dumps(ledger), encoding="utf-8")
            self.assertEqual(len(mod.load_ledger(p)["snapshots"]), 1)
            ledger["snapshots"][0]["markets"][0]["p_model"] = .99
            p.write_text(json.dumps(ledger), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "digest mismatch"):
                mod.load_ledger(p)

    def test_exact_binance_closing_minute(self):
        f = source()
        candle = mod.binance_minute_close(SETTLED, f)
        self.assertEqual(candle["binance_close_usdt"], 67000)
        self.assertIn("interval=1m", f.calls[0])
        self.assertIn(str(int(SETTLED.timestamp() * 1000) - 60000), f.calls[0])
        with self.assertRaisesRegex(ValueError, "timestamp mismatch"):
            mod.binance_minute_close(SETTLED, source(open_offset=60000))

    def test_no_resolution_until_both_authorities_confirm(self):
        ledger = mod.blank_ledger()
        mod.append_snapshot(ledger, report(), OBSERVED)
        self.assertEqual(mod.resolve_pending(ledger, SETTLED, source())["new_resolutions"], 0)
        unresolved = mod.resolve_pending(ledger, LATER, source(gamma_data=gamma(status="proposed")))
        self.assertEqual(unresolved["new_resolutions"], 0)
        self.assertEqual(len(unresolved["settlement_blockers"]), 1)
        conflict = mod.resolve_pending(ledger, LATER, source(price=65000))
        self.assertEqual(conflict["new_resolutions"], 0)
        self.assertIn("disagreement", conflict["settlement_blockers"][0]["reason"])
        self.assertEqual(len(ledger["resolutions"]), 0)

    def test_single_final_resolution_and_brier(self):
        ledger = mod.blank_ledger()
        mod.append_snapshot(ledger, report(), OBSERVED)
        self.assertEqual(mod.resolve_pending(ledger, LATER, source())["new_resolutions"], 1)
        self.assertEqual(mod.resolve_pending(ledger, LATER, source())["new_resolutions"], 0)
        m = mod.evaluate(ledger)
        self.assertEqual(m["resolved_unique_event_days"], 1)
        self.assertAlmostEqual(m["brier_model_event_weighted"], (.34 - 1) ** 2)
        self.assertEqual(m["illustrative_yes_choices"], 1)
        self.assertAlmostEqual(m["illustrative_one_share_pnl_usd"], .67)
        self.assertFalse(m["calibration_review_eligible"])

    def test_model_fee_provenance_is_stored_without_rewriting_old_snapshots(self):
        candidate = report()
        m = candidate["markets"][0]
        m["cost_fee_source"] = "GAMMA_MARKET_FEE_SCHEDULE"
        m["cost_fee_rate"] = .07
        snap = mod.snapshot_from_report(candidate, OBSERVED)
        self.assertEqual(
            snap["markets"][0]["cost_fee_source"], "GAMMA_MARKET_FEE_SCHEDULE"
        )
        self.assertEqual(snap["markets"][0]["cost_fee_rate"], .07)
        historical = mod.snapshot_from_report(report(), OBSERVED)
        self.assertEqual(
            historical["markets"][0]["cost_fee_source"],
            "LEGACY_OR_UNKNOWN_FEE_ASSUMPTION"
        )
        self.assertNotIn("cost_fee_rate", historical["markets"][0])

    def test_per_horizon_scores_do_not_inflate_independent_n(self):
        ledger = mod.blank_ledger()
        mod.append_snapshot(ledger, report(), OBSERVED)
        later = OBSERVED + timedelta(hours=10)
        mod.append_snapshot(ledger, report(later), later)
        self.assertEqual(mod.resolve_pending(ledger, LATER, source())["new_resolutions"], 1)
        metrics = mod.evaluate(ledger)
        self.assertEqual(metrics["resolved_unique_event_days"], 1)
        self.assertEqual(len(metrics["per_event_diagnostics"]), 1)
        self.assertEqual(
            set(metrics["horizon_diagnostics_not_independent"]),
            {"12h-24h", "6h-12h"},
        )
        self.assertEqual(metrics["per_event_diagnostics"][0]["horizon_bucket"],
                         "12h-24h")
        self.assertEqual(metrics["illustrative_records"][0]["fee_source"],
                         "LEGACY_OR_UNKNOWN_FEE_ASSUMPTION")
        self.assertFalse(metrics["calibration_review_eligible"])

    def test_full_cycle_never_writes_paper_state(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            inp, out = root / "research.json", root / "ledger.json"
            inp.write_text(json.dumps(report()), encoding="utf-8")
            summary = mod.run(inp, out, OBSERVED + timedelta(minutes=1), fetcher=source())
            self.assertTrue(out.exists())
            self.assertEqual(summary["snapshot_count"], 1)
            self.assertEqual(summary["pending_event_days"], 1)
            self.assertEqual(summary["capital_decision"], "NO_TRADE")
            inp.write_text(json.dumps({"fit_status": "BLOCKED"}), encoding="utf-8")
            summary = mod.run(inp, out, LATER, fetcher=source())
            self.assertFalse(summary["forward_snapshot_added"])
            self.assertEqual(summary["new_resolutions"], 1)
            self.assertEqual(summary["pending_event_days"], 0)
            self.assertEqual(len(mod.load_ledger(out)["snapshots"]), 1)

    def test_no_independence_inflation(self):
        ledger = mod.blank_ledger()
        mod.append_snapshot(ledger, report(), OBSERVED)
        later = OBSERVED + timedelta(hours=10)
        mod.append_snapshot(ledger, report(later), later)
        self.assertEqual(len(ledger["snapshots"]), 2)
        mod.resolve_pending(ledger, LATER, source())
        m = mod.evaluate(ledger)
        self.assertEqual(m["resolved_unique_event_days"], 1)
        self.assertFalse(m["sample_count_adequate_for_review"])

    def test_blocked_report_never_creates_prediction(self):
        candidate = report()
        candidate["fit_status"] = "BLOCKED"
        self.assertIsNone(mod.snapshot_from_report(candidate, OBSERVED))
        candidate = report()
        candidate["data_sources"] = {"coinbase": {}}
        with self.assertRaises(ValueError):
            mod.snapshot_from_report(candidate, OBSERVED)


if __name__ == "__main__":
    unittest.main()

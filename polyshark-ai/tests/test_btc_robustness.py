"""Offline tests: paired day-level block bootstrap is conservative and fail-closed."""
from __future__ import annotations
import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "runtime"))
from btc_robustness import assess_forward_uncertainty


def rows(count=50, advantage=.05, pnl=.02, first=date(2026, 1, 1)):
    return [
        {
            "date": (first + timedelta(days=k)).isoformat(),
            "brier_advantage": advantage,
            "illustrative_pnl": pnl,
        }
        for k in range(count)
    ]


class RobustnessTests(unittest.TestCase):
    def test_two_days_never_report_confidence_interval(self):
        z = assess_forward_uncertainty(rows(2))
        self.assertEqual(z["status"], "INSUFFICIENT_UNIQUE_EVENT_DAYS")
        self.assertIsNone(z["brier_advantage_ci95"])
        self.assertIsNone(z["hypothetical_one_share_daily_pnl_ci95"])
        self.assertFalse(z["can_claim_positive_edge"])
        self.assertEqual(z["strategy_promotion"], "BLOCKED")

    def test_hundred_percent_positive_still_blocks_promotion(self):
        z = assess_forward_uncertainty(rows())
        self.assertEqual(z["status"], "READY_FOR_DESCRIPTIVE_RESAMPLING")
        self.assertEqual(z["event_days"], 50)
        self.assertEqual(z["illustrative_choice_days"], 50)
        self.assertAlmostEqual(z["brier_advantage_ci95"]["lower"], .05)
        self.assertAlmostEqual(z["brier_advantage_ci95"]["upper"], .05)
        self.assertAlmostEqual(z["hypothetical_one_share_daily_pnl_ci95"]["lower"], .02)
        self.assertFalse(z["can_claim_positive_edge"])
        self.assertEqual(z["strategy_promotion"], "BLOCKED")

    def test_repeated_seed_reproducible_and_order_independent(self):
        daily = rows(53)
        for i, item in enumerate(daily):
            item["brier_advantage"] = round((i % 11 - 5) / 80, 8)
            item["illustrative_pnl"] = round((i % 9 - 4) / 50, 8)
        a = assess_forward_uncertainty(daily)
        b = assess_forward_uncertainty(list(reversed(daily)))
        self.assertEqual(a, b)
        self.assertLessEqual(a["brier_advantage_ci95"]["lower"],
                             a["brier_advantage_ci95"]["upper"])

    def test_gap_fails_closed_even_with_fifty_events(self):
        data = rows(50)
        data[20]["date"] = (date(2026, 1, 21) + timedelta(days=1)).isoformat()
        # This creates a duplicate date, which must fail, not silently drop.
        with self.assertRaisesRegex(ValueError, "Duplicate event day"):
            assess_forward_uncertainty(data)
        data = rows(50)
        for x in data[20:]:
            day = date.fromisoformat(x["date"]) + timedelta(days=1)
            x["date"] = day.isoformat()
        z = assess_forward_uncertainty(data)
        self.assertEqual(z["status"], "NONCONTIGUOUS_CALENDAR_DAYS")
        self.assertIsNone(z["brier_advantage_ci95"])

    def test_no_signal_days_count_as_zero_not_disappear(self):
        data = rows(50)
        for x in data[10:]:
            x["illustrative_pnl"] = None
        z = assess_forward_uncertainty(data)
        self.assertEqual(z["illustrative_choice_days"], 10)
        self.assertAlmostEqual(z["hypothetical_one_share_daily_pnl_mean"], .004)
        self.assertEqual(z["status"], "INSUFFICIENT_HYPOTHETICAL_CHOICES_FOR_PNL_CI")
        self.assertIsNotNone(z["brier_advantage_ci95"])
        self.assertIsNone(z["hypothetical_one_share_daily_pnl_ci95"])

    def test_invalid_inputs_fail_closed(self):
        cases = []
        for field, value in (
            ("brier_advantage", float("nan")),
            ("brier_advantage", True),
            ("illustrative_pnl", float("inf")),
            ("date", "not-a-date"),
        ):
            data = rows(2)
            data[0][field] = value
            cases.append(data)
        for data in cases:
            with self.subTest(data=data), self.assertRaises(ValueError):
                assess_forward_uncertainty(data)
        with self.assertRaises(ValueError):
            assess_forward_uncertainty([{"date": "2026-11-18"}])


if __name__ == "__main__":
    unittest.main()

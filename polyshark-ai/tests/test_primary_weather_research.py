"""Offline NWS collector tests; never request live market data."""
import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

runtime = Path(__file__).resolve().parents[1] / "runtime"
spec = importlib.util.spec_from_file_location("primary_weather_research", runtime / "primary_weather_research.py")
wx = importlib.util.module_from_spec(spec)
assert spec.loader
sys.modules[spec.name] = wx
spec.loader.exec_module(wx)

NOW = datetime(2026, 11, 11, 2, 15, tzinfo=timezone.utc)
PLACE = {"label": "New York research pilot", "latitude": 40.7812, "longitude": -73.9665}
POINT = {"properties": {"forecastHourly": "https://api.weather.gov/gridpoints/OKX/34,45/forecast/hourly"}}
FORECAST = {"properties": {
    "generatedAt": "2026-11-11T02:10:00Z",
    "periods": [{"startTime": "2026-11-11T02:00:00Z",
                 "endTime": "2026-11-11T03:00:00Z",
                 "temperature": 56, "temperatureUnit": "F",
                 "probabilityOfPrecipitation": {"value": 30}, "shortForecast": "Cloudy"}],
}}

class PrimaryWeatherResearchTests(unittest.TestCase):
    def test_snapshot_is_read_only_no_trade_and_no_market_probability(self):
        with patch.object(wx, "fetch_json", side_effect=[POINT, FORECAST]) as mock:
            result = wx.collect([PLACE], NOW)
        self.assertEqual(mock.call_count, 2)
        self.assertEqual(result["source_count"], 1)
        self.assertEqual(result["capital_decision"], "NO_TRADE")
        self.assertTrue(result["paper_only"])
        self.assertFalse(result["real_orders_enabled"])
        self.assertIsNone(result["event_probability"])
        self.assertFalse(result["independent_sources_verified"])
        self.assertEqual(result["market_question_matching"], "NOT_PERFORMED")
        self.assertEqual(result["locations"][0]["periods"][0]["precipitation_probability_percent"], 30)
        self.assertNotIn("probability_yes", json.dumps(result))

    def test_wrong_host_is_blocked(self):
        with patch.object(wx, "fetch_json", return_value={
            "properties": {"forecastHourly": "https://malicious.example/data"}
        }):
            with self.assertRaises(ValueError):
                wx.collect([PLACE], NOW)

    def test_url_validation_blocks_query_or_wrong_path(self):
        with self.assertRaises(ValueError):
            wx.safe_url("https://api.weather.gov/alerts/active", forecast=True)
        with self.assertRaises(ValueError):
            wx.safe_url("https://api.weather.gov/gridpoints/OKX/34,45/forecast/hourly?x=1", forecast=True)

    def test_stale_issue_time_fails_closed(self):
        stale = {"properties": {**FORECAST["properties"], "generatedAt": "2026-10-20T00:00:00Z"}}
        with patch.object(wx, "fetch_json", side_effect=[POINT, stale]):
            with self.assertRaises(ValueError):
                wx.collect([PLACE], NOW)

    def test_watchlist_coordinates_must_be_numeric_and_bounded(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "locs.json"
            invalid = {"schema_version": wx.WATCHLIST_SCHEMA, "locations": [
                {"label": "Test", "latitude": True, "longitude": -73.9665}
            ]}
            path.write_text(json.dumps(invalid), encoding="utf-8")
            with self.assertRaises(ValueError):
                wx.read_watchlist(path)

    def test_valid_watchlist(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "locs.json"
            path.write_text(json.dumps({"schema_version": wx.WATCHLIST_SCHEMA,
                                        "locations": [PLACE]}), encoding="utf-8")
            self.assertEqual(wx.read_watchlist(path), [PLACE])

if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""NOAA NWS weather context, strictly research-only, not market odds."""
from __future__ import annotations
import argparse
import json
import math
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

SCHEMA = "polyshark-primary-weather-research-v1"
WATCHLIST_SCHEMA = "polyshark-weather-watchlist-v1"
TERMS = "https://www.weather.gov/documentation/services-web-api"
AGENT = "PolyShark-Research/1.0 (+https://github.com/Jokersochi/Jokersochi)"
HOST = "api.weather.gov"

def utc(value: str) -> datetime:
    if not isinstance(value, str) or not value:
        raise ValueError("Missing timezone-aware timestamp")
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as e:
        raise ValueError("Invalid timestamp") from e
    if dt.tzinfo is None:
        raise ValueError("Missing timezone offset")
    return dt.astimezone(timezone.utc)

def safe_url(url: str, *, forecast: bool = False) -> str:
    if not isinstance(url, str) or len(url) > 300:
        raise ValueError("Invalid API URL")
    parts = urllib.parse.urlsplit(url)
    if (parts.scheme != "https" or parts.netloc != HOST or
            parts.query or parts.fragment or parts.username or parts.password):
        raise ValueError("NWS URL must use official HTTPS host")
    if forecast:
        if not parts.path.startswith("/gridpoints/") or not parts.path.endswith("/forecast/hourly"):
            raise ValueError("Invalid hourly forecast path")
    elif not parts.path.startswith("/points/"):
        raise ValueError("Invalid points path")
    return url

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("NWS redirect rejected")

def fetch_json(url: str, *, forecast: bool = False) -> dict[str, Any]:
    safe_url(url, forecast=forecast)
    req = urllib.request.Request(url, headers={"User-Agent": AGENT, "Accept": "application/geo+json"})
    with urllib.request.build_opener(NoRedirect).open(req, timeout=20) as response:
        body = response.read(2_000_001)
        if response.status != 200 or len(body) > 2_000_000:
            raise ValueError("Unexpected NWS HTTP response")
    result = json.loads(body.decode("utf-8"))
    if not isinstance(result, dict):
        raise ValueError("Unexpected NOAA payload")
    return result

def read_watchlist(path: Path) -> list[dict[str, Any]]:
    if not path.is_file() or path.stat().st_size > 12000:
        raise ValueError("Missing/oversized weather watchlist")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or set(payload) != {"schema_version", "locations"}:
        raise ValueError("Invalid watchlist schema")
    if payload["schema_version"] != WATCHLIST_SCHEMA:
        raise ValueError("Unsupported watchlist version")
    locations = payload["locations"]
    if not isinstance(locations, list) or not 1 <= len(locations) <= 5:
        raise ValueError("Expected 1-5 locations")
    seen = set()
    for item in locations:
        if not isinstance(item, dict) or set(item) != {"label", "latitude", "longitude"}:
            raise ValueError("Unexpected location fields")
        label = item["label"]
        if not isinstance(label, str) or not 1 <= len(label.strip()) <= 80 or label in seen:
            raise ValueError("Invalid/duplicate location name")
        seen.add(label)
        for name, lower, upper in (("latitude", -90, 90), ("longitude", -180, 180)):
            value = item[name]
            if type(value) not in (int, float) or not math.isfinite(value) or not lower <= value <= upper:
                raise ValueError("Invalid coordinates")
    return locations

def collect_location(item: dict[str, Any], now: datetime) -> dict[str, Any]:
    lat, lon = item["latitude"], item["longitude"]
    points_url = safe_url(f"https://{HOST}/points/{lat:.4f},{lon:.4f}")
    points = fetch_json(points_url)
    hourly_url = safe_url(points["properties"]["forecastHourly"], forecast=True)
    forecast = fetch_json(hourly_url, forecast=True)
    props = forecast.get("properties")
    if not isinstance(props, dict) or not isinstance(props.get("periods"), list):
        raise ValueError("Invalid NWS hourly forecast")
    issued = utc(props.get("generatedAt") or props.get("updateTime"))
    if issued > now + timedelta(minutes=2) or issued < now - timedelta(hours=48):
        raise ValueError("Future/stale NOAA forecast")
    periods = []
    for period in props["periods"]:
        if not isinstance(period, dict):
            raise ValueError("Invalid forecast period")
        start, end = utc(period.get("startTime")), utc(period.get("endTime"))
        if end <= start:
            raise ValueError("Inverted forecast period")
        if end <= now or start >= now + timedelta(hours=24):
            continue
        pop_value = (period.get("probabilityOfPrecipitation") or {}).get("value")
        if type(pop_value) not in (int, float) or not math.isfinite(pop_value) or not 0 <= pop_value <= 100:
            pop_value = None
        temp = period.get("temperature")
        if type(temp) not in (int, float) or not math.isfinite(temp):
            temp = None
        periods.append({
            "start_at": start.isoformat(), "end_at": end.isoformat(),
            "temperature": temp, "temperature_unit": period.get("temperatureUnit"),
            "precipitation_probability_percent": pop_value,
            "short_forecast": str(period.get("shortForecast") or "")[:160],
        })
        if len(periods) == 24:
            break
    if not periods:
        raise ValueError("No current forecast periods")
    return {
        "label": item["label"], "latitude": lat, "longitude": lon,
        "points_url": points_url, "hourly_forecast_url": hourly_url,
        "issued_at": issued.isoformat(), "periods": periods,
    }

def collect(locations: list[dict[str, Any]], now: datetime) -> dict[str, Any]:
    if now.tzinfo is None:
        raise ValueError("UTC clock required")
    return {
        "schema_version": SCHEMA, "generated_at": now.astimezone(timezone.utc).isoformat(),
        "source": "NOAA National Weather Service", "source_terms_url": TERMS,
        "source_count": 1, "status": "RESEARCH_ONLY", "paper_only": True,
        "real_orders_enabled": False, "capital_decision": "NO_TRADE",
        "market_question_matching": "NOT_PERFORMED", "event_probability": None,
        "independent_sources_verified": False, "model_calibrated": False,
        "locations": [collect_location(loc, now) for loc in locations],
    }

def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only NWS research snapshot")
    parser.add_argument("--watchlist", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        snapshot = collect(read_watchlist(args.watchlist), datetime.now(timezone.utc))
        args.output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
                               encoding="utf-8")
    except (OSError, ValueError, TypeError, KeyError, UnicodeError,
            urllib.error.URLError, json.JSONDecodeError) as exc:
        print("NOAA research unavailable; NO_TRADE. " + type(exc).__name__)
        return 1
    print(json.dumps({"status": "RESEARCH_ONLY", "source_count": 1,
                      "locations": len(snapshot["locations"]), "capital_decision": "NO_TRADE"}))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

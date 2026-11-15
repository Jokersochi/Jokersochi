#!/usr/bin/env python3
"""Read-only BTC threshold probability RESEARCH; no paper/live orders.

Coinbase and Kraken hourly closes are correlated observations of the same
asset, NOT independent event probability predictions. Nothing produced by this
tool is eligible for the Challenger v2 evidence gate or automatic execution.
The Polymarket settlement venue is Binance BTC/USDT; basis risk is explicit.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import statistics
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from challenger_v2 import costed_edge

VERSION = "btc-terminal-spot-baseline-v1-20261116"
GAMMA_EVENTS = "https://gamma-api.polymarket.com/events"
COINBASE_CANDLES = "https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=3600"
KRAKEN_CANDLES = "https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=60"
CLOB_BOOK = "https://clob.polymarket.com/book"
USER_AGENT = "PolyShark-Research-PaperOnly/1.0"
SAMPLE_HOURS = 72
MAX_CANDLE_AGE_HOURS = 3
MAX_HORIZON_HOURS = 7 * 24
MIN_HORIZON_HOURS = 0.25
MAX_QUOTE_LOOKUPS = 6
MAX_VENUE_SPOT_DIVERGENCE = 0.01
MAX_VENUE_PROB_DIVERGENCE = 0.15
ASSUMED_FEE_RATE = 0.05
ASSUMED_NOTIONAL = 100.0
QUESTION = re.compile(
    r"^Will the price of Bitcoin be above \$([0-9][0-9,]*) on "
    r"(January|February|March|April|May|June|July|August|September|October|November|December) "
    r"([1-9]|[12][0-9]|3[01])\?$"
)
MONTHS = {month: i for i, month in enumerate(
    ("January", "February", "March", "April", "May", "June",
     "July", "August", "September", "October", "November", "December"), 1
)}


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds")


def timestamp(value: str) -> datetime:
    d = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if d.tzinfo is None:
        raise ValueError("Timezone required")
    return d.astimezone(timezone.utc)


def first_sunday(year: int, month: int) -> date:
    d = date(year, month, 1)
    return d + timedelta(days=(-d.weekday() - 1) % 7)


def us_dst_on_date(day: date) -> bool:
    # US daylight saving time: second Sunday March through first Sunday Nov.
    second_sunday_march = first_sunday(day.year, 3) + timedelta(days=7)
    first_sunday_nov = first_sunday(day.year, 11)
    return second_sunday_march <= day < first_sunday_nov


def resolution_utc(day: date) -> datetime:
    hour = 16 if us_dst_on_date(day) else 17  # noon in America/New_York
    return datetime(day.year, day.month, day.day, hour, tzinfo=timezone.utc)


def event_slug(day: date) -> str:
    month = list(MONTHS)[day.month - 1].lower()
    return f"bitcoin-above-on-{month}-{day.day}-{day.year}"


def next_event_slug(now: datetime) -> str:
    day = now.astimezone(timezone.utc).date()
    for delta in range(3):
        candidate = day + timedelta(days=delta)
        if resolution_utc(candidate) > now + timedelta(minutes=45):
            return event_slug(candidate)
    raise ValueError("No near-term BTC event")


def request_json(url: str, *, timeout: int = 12) -> Any:
    req = urllib.request.Request(
        url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"}, method="GET"
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        raw = response.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError("Public API response exceeded size cap")
    return json.loads(raw)


def _finite_positive(value: Any) -> float:
    v = float(value)
    if not math.isfinite(v) or v <= 0:
        raise ValueError("Nonfinite or nonpositive market data")
    return v


def _last_complete(candles: list[tuple[int, float]], now: datetime) -> list[tuple[int, float]]:
    """Exclude the current unfinished hour; require a contiguous 72h sample."""
    now_ts = int(now.timestamp())
    eligible: dict[int, float] = {}
    for t, price in candles:
        if t % 3600 or t + 3600 > now_ts:
            continue
        if t in eligible and eligible[t] != price:
            raise ValueError("Conflicting candle data at the same timestamp")
        eligible[t] = _finite_positive(price)
    series = sorted(eligible.items())
    if len(series) < SAMPLE_HOURS + 1:
        raise ValueError("Insufficient completed hourly candles")
    window = series[-(SAMPLE_HOURS + 1):]
    if now_ts - (window[-1][0] + 3600) > MAX_CANDLE_AGE_HOURS * 3600:
        raise ValueError("Stale hourly candle source")
    if any(b[0] - a[0] != 3600 for a, b in zip(window, window[1:])):
        raise ValueError("Missing or gapped hourly candles")
    return window


def coinbase_series(data: Any, now: datetime) -> list[tuple[int, float]]:
    if not isinstance(data, list):
        raise ValueError("Invalid Coinbase candle response")
    candles = [(int(row[0]), _finite_positive(row[4])) for row in data
               if isinstance(row, list) and len(row) >= 6]
    return _last_complete(candles, now)


def kraken_series(data: Any, now: datetime) -> list[tuple[int, float]]:
    if not isinstance(data, dict) or data.get("error"):
        raise ValueError("Invalid Kraken response or exchange error")
    rows = data.get("result")
    if not isinstance(rows, dict) or "XXBTZUSD" not in rows:
        raise ValueError("Missing Kraken BTC/USD candle pair")
    candles = [(int(row[0]), _finite_positive(row[4])) for row in rows["XXBTZUSD"]
               if isinstance(row, list) and len(row) >= 8]
    return _last_complete(candles, now)


def venue_statistics(series: list[tuple[int, float]]) -> dict[str, Any]:
    closes = [price for _, price in series]
    returns = [math.log(b / a) for a, b in zip(closes, closes[1:])]
    sigma = statistics.stdev(returns)
    if not 0.0001 <= sigma <= 0.15 or not math.isfinite(sigma):
        raise ValueError("Unusable volatility estimate")
    digest = hashlib.sha256(
        json.dumps(series, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return {
        "last_closed_candle_at": iso(datetime.fromtimestamp(series[-1][0] + 3600, timezone.utc)),
        "spot_usd": round(closes[-1], 4),
        "hourly_volatility": round(sigma, 10),
        "sample_returns": len(returns),
        "sample_sha256": digest,
    }


def normal_cdf(z: float) -> float:
    return 0.5 * math.erfc(-z / math.sqrt(2.0))


def terminal_above_probability(spot: float, threshold: float, sigma: float, hours: float) -> float:
    """Uncalibrated zero-arithmetic-drift GBM terminal distribution, not a guarantee."""
    if not all(math.isfinite(v) and v > 0 for v in (spot, threshold, sigma, hours)):
        raise ValueError("Invalid forecast inputs")
    z = (math.log(spot / threshold) - 0.5 * sigma * sigma * hours) / (sigma * math.sqrt(hours))
    return min(1.0, max(0.0, normal_cdf(z)))


def _as_list(value: Any) -> list[str]:
    if isinstance(value, str):
        value = json.loads(value)
    if not isinstance(value, list):
        raise ValueError("Outcome/token list is not a list")
    return [str(x) for x in value]


def validated_market(market: Any, now: datetime) -> dict[str, Any] | None:
    """Never guess market rules: require exact question, source, and ET noon close."""
    if not isinstance(market, dict) or market.get("closed") is True:
        return None
    match = QUESTION.fullmatch(str(market.get("question") or ""))
    if not match:
        return None
    threshold = float(match.group(1).replace(",", ""))
    end = timestamp(str(market.get("endDate") or ""))
    day = date(end.year, MONTHS[match.group(2)], int(match.group(3)))
    if end != resolution_utc(day):
        return None
    horizon = (end - now).total_seconds() / 3600
    if not MIN_HORIZON_HOURS <= horizon <= MAX_HORIZON_HOURS:
        return None
    desc = str(market.get("description") or "").casefold()
    if not all(s in desc for s in (
        "binance 1 minute candle for btc/usdt",
        "closing at 12:00",
        'final "close" price higher',
        "binance btc/usdt",
    )):
        return None
    outcomes = [s.upper() for s in _as_list(market.get("outcomes"))]
    tokens = _as_list(market.get("clobTokenIds"))
    prices = [_finite_positive(x) for x in _as_list(market.get("outcomePrices"))]
    if outcomes != ["YES", "NO"] or len(tokens) != 2 or len(prices) != 2:
        return None
    if not all(0 < p < 1 for p in prices):
        return None
    liq = float(market.get("liquidityNum") or 0)
    if not math.isfinite(liq) or liq <= 0:
        return None
    return {
        "market_id": str(market["id"]),
        "question": str(market["question"]),
        "threshold_usd": threshold,
        "end_at": iso(end),
        "hours_to_resolution": round(horizon, 4),
        "yes_token_id": tokens[0],
        "p_market_indicative": prices[0],
        "liquidity_usd_indicative": round(liq, 2),
    }


def executable_quote(data: Any) -> tuple[float, float]:
    if not isinstance(data, dict):
        raise ValueError("Invalid public CLOB book")
    bids = [float(x["price"]) for x in data.get("bids", []) if "price" in x]
    asks = [float(x["price"]) for x in data.get("asks", []) if "price" in x]
    if not bids or not asks:
        raise ValueError("Missing executable bid/ask")
    bid, ask = max(bids), min(asks)
    if not (0 < bid <= ask < 1):
        raise ValueError("Invalid executable bid/ask")
    return bid, ask


def build_report(now: datetime, event: dict[str, Any], coinbase: Any, kraken: Any,
                 *, book_fetcher=None) -> dict[str, Any]:
    cb = venue_statistics(coinbase_series(coinbase, now))
    kr = venue_statistics(kraken_series(kraken, now))
    spot_divergence = abs(cb["spot_usd"] - kr["spot_usd"]) / (
        (cb["spot_usd"] + kr["spot_usd"]) / 2.0
    )
    valid = [
        m for row in (event.get("markets") or [])
        if (m := validated_market(row, now)) is not None
    ]
    midspot = (cb["spot_usd"] + kr["spot_usd"]) / 2.0
    valid.sort(key=lambda m: abs(math.log(m["threshold_usd"] / midspot)))
    markets = []
    for market in valid[:MAX_QUOTE_LOOKUPS]:
        a = terminal_above_probability(
            cb["spot_usd"], market["threshold_usd"], cb["hourly_volatility"],
            market["hours_to_resolution"],
        )
        b = terminal_above_probability(
            kr["spot_usd"], market["threshold_usd"], kr["hourly_volatility"],
            market["hours_to_resolution"],
        )
        market["p_model_uncalibrated"] = round((a + b) / 2.0, 8)
        market["p_coinbase_model"] = round(a, 8)
        market["p_kraken_model"] = round(b, 8)
        market["venue_probability_divergence"] = round(abs(a - b), 8)
        market["diagnostic_status"] = "NO_TRADE"
        market["shadow_eligible"] = False  # no independent probabilistic evidence
        market["reason"] = "uncalibrated correlated-venue model; no verified settlement-basis model"
        market["execution_quote_available"] = False
        if (book_fetcher is not None and
                spot_divergence <= MAX_VENUE_SPOT_DIVERGENCE and
                abs(a - b) <= MAX_VENUE_PROB_DIVERGENCE):
            try:
                url = CLOB_BOOK + "?" + urllib.parse.urlencode(
                    {"token_id": market["yes_token_id"]}
                )
                bid, ask = executable_quote(book_fetcher(url))
                costs = costed_edge(
                    probability=market["p_model_uncalibrated"],
                    market_probability=(bid + ask) / 2.0,
                    spread=ask - bid,
                    fee_rate=ASSUMED_FEE_RATE,
                    liquidity=market["liquidity_usd_indicative"],
                    notional=ASSUMED_NOTIONAL,
                )
                market["execution_quote_available"] = True
                market["public_yes_bid"] = bid
                market["public_yes_ask"] = ask
                market["illustrative_cost_model"] = costs
            except (ValueError, KeyError, TypeError, OSError) as exc:
                market["book_error_type"] = type(exc).__name__
        markets.append(market)
    return {
        "model_version": VERSION,
        "observed_at": iso(now),
        "event_title": event.get("title"),
        "event_slug": event.get("slug"),
        "capital_decision": "NO_TRADE",
        "paper_only": True,
        "real_orders_enabled": False,
        "research_only": True,
        "independent_probability_evidence": False,
        "source_independence_note": "Coinbase/Kraken prices track one BTC market and are correlated",
        "settlement_basis_risk": "Binance BTC/USDT close, not Coinbase or Kraken BTC/USD",
        "fee_assumption_note": "5% fee coefficient and sqrt impact are illustrative, not verified trading costs",
        "fit_status": "UNCALIBRATED_NOT_ELIGIBLE",
        "markets_found": len(valid),
        "markets_evaluated": len(markets),
        "spot_divergence": round(spot_divergence, 8),
        "data_sources": {"coinbase": cb, "kraken": kr},
        "markets": markets,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Read-only BTC market probability research")
    parser.add_argument("--event-slug", default=None)
    parser.add_argument("--output", default=None, help="Diagnostic JSON only; NEVER a live evidence feed")
    args = parser.parse_args(argv)
    now = datetime.now(timezone.utc)
    slug = args.event_slug or next_event_slug(now)
    result: dict[str, Any]
    try:
        events = request_json(GAMMA_EVENTS + "?" + urllib.parse.urlencode({"slug": slug}))
        if not isinstance(events, list) or not events:
            raise ValueError("No matching Polymarket event; research abstains")
        event = events[0]
        cb_data = request_json(COINBASE_CANDLES)
        kr_data = request_json(KRAKEN_CANDLES)
        result = build_report(now, event, cb_data, kr_data, book_fetcher=request_json)
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
        result = {
            "model_version": VERSION, "observed_at": iso(now), "event_slug": slug,
            "capital_decision": "NO_TRADE", "research_only": True,
            "fit_status": "BLOCKED", "error_type": type(exc).__name__,
            "error": str(exc)[:300],
        }
    text = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding="utf-8")
    print(text)
    return 0 if result["fit_status"] == "UNCALIBRATED_NOT_ELIGIBLE" else 2


if __name__ == "__main__":
    raise SystemExit(main())

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
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any


VERSION = "btc-terminal-spot-baseline-v1-20261116"
GAMMA_EVENTS = "https://gamma-api.polymarket.com/events"
COINBASE_CANDLES = "https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=3600"
KRAKEN_CANDLES = "https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=60"
CLOB_BOOK = "https://clob.polymarket.com/book"
CLOB_TIME = "https://clob.polymarket.com/time"
USER_AGENT = "PolyShark-Research-PaperOnly/1.0"
SAMPLE_HOURS = 72
MAX_CANDLE_AGE_HOURS = 3
MAX_HORIZON_HOURS = 7 * 24
MIN_HORIZON_HOURS = 0.25
MAX_QUOTE_LOOKUPS = 6
MAX_VENUE_SPOT_DIVERGENCE = 0.01
MAX_VENUE_PROB_DIVERGENCE = 0.15
ASSUMED_NOTIONAL = 100.0
MAX_BOOK_LEVELS = 2000
MAX_BOOK_AGE_SECONDS = 30.0
MAX_BOOK_FUTURE_SECONDS = 2.0
MAX_CLOB_CLOCK_SKEW_SECONDS = 120.0
MAX_BOOK_DEPTH_SLIPPAGE = 0.05
MIN_MARKET_LIQUIDITY_MULTIPLE = 250.0
# Fees must come from the individual Gamma market fee schedule. A missing,
# malformed or unsupported schedule makes after-cost analysis ineligible.
FEE_SOURCE = "GAMMA_MARKET_FEE_SCHEDULE"
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


def market_fee_parameters(market: dict[str, Any]) -> tuple[str, float | None]:
    """Require a market-level fee schedule before modeling execution costs.

    Gamma documents fee = shares * rate * p * (1-p) for exponent=1.
    Unsupported/missing exponent, rate or taker side fails closed rather than
    quietly assuming a globally fixed 5% or 7% rate.
    """
    enabled = market.get("feesEnabled")
    if enabled is False:
        return ("GAMMA_MARKET_FEE_SCHEDULE", 0.0)
    if enabled is not True:
        return ("UNKNOWN", None)
    schedule = market.get("feeSchedule")
    if isinstance(schedule, str):
        try:
            schedule = json.loads(schedule)
        except (ValueError, TypeError):
            return ("UNKNOWN", None)
    if not isinstance(schedule, dict):
        return ("UNKNOWN", None)
    rate = schedule.get("rate")
    exponent = schedule.get("exponent")
    if (isinstance(rate, bool) or not isinstance(rate, (int, float, str))
            or isinstance(exponent, bool) or not isinstance(exponent, (int, float))
            or exponent != 1 or schedule.get("takerOnly") is not True):
        return ("UNSUPPORTED", None)
    try:
        fee_rate = float(rate)
    except (TypeError, ValueError):
        return ("UNKNOWN", None)
    if not math.isfinite(fee_rate) or not 0 <= fee_rate <= 1:
        return ("UNKNOWN", None)
    return ("GAMMA_MARKET_FEE_SCHEDULE", fee_rate)


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
    fee_source, fee_rate = market_fee_parameters(market)
    return {
        "fee_source": fee_source,
        "fee_rate": fee_rate,
        "fee_exponent": 1,
        "fee_type": str(market.get("feeType") or "unknown"),
        "market_id": str(market["id"]),
        "question": str(market["question"]),
        "threshold_usd": threshold,
        "end_at": iso(end),
        "hours_to_resolution": round(horizon, 4),
        "yes_token_id": tokens[0],
        "p_market_indicative": prices[0],
        "liquidity_usd_indicative": round(liq, 2),
    }


def _epoch_seconds(value: Any) -> float:
    if isinstance(value, bool) or value is None:
        raise ValueError("Invalid CLOB timestamp")
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            raise ValueError("Empty CLOB timestamp")
        try:
            value = float(raw)
        except ValueError:
            return timestamp(raw).timestamp()
    if not isinstance(value, (float, int)):
        raise ValueError("Invalid CLOB timestamp type")
    seconds = float(value)
    if not math.isfinite(seconds) or seconds <= 0:
        raise ValueError("Invalid CLOB timestamp value")
    if seconds > 1_000_000_000_000:
        seconds /= 1000.0
    return seconds


def clob_server_time(data: Any) -> datetime:
    if isinstance(data, dict):
        data = data.get("time", data.get("timestamp"))
    return datetime.fromtimestamp(_epoch_seconds(data), timezone.utc)


def _book_levels(raw: Any, *, side: str) -> list[tuple[float, float]]:
    if not isinstance(raw, list) or not raw or len(raw) > MAX_BOOK_LEVELS:
        raise ValueError("Missing or excessive CLOB book levels")
    levels: list[tuple[float, float]] = []
    seen_prices: set[float] = set()
    for row in raw:
        if not isinstance(row, dict) or "price" not in row or "size" not in row:
            raise ValueError("Malformed CLOB book level")
        price = finite(float(row["price"]), low=0.000001, high=0.999999)
        size = finite(float(row["size"]), low=0.00000001)
        if price in seen_prices:
            raise ValueError("Duplicate CLOB price level")
        seen_prices.add(price)
        levels.append((price, size))
    levels.sort(key=lambda x: x[0], reverse=(side == "bids"))
    return levels


def depth_aware_buy_cost(
    book: Any, *, expected_token_id: str, now: datetime,
    server_time: datetime, probability: float, fee_rate: float,
    fee_exponent: float, market_liquidity: float,
    notional: float = ASSUMED_NOTIONAL,
) -> dict[str, Any]:
    """Replay a fixed-USD taker BUY against visible YES asks; never submits orders."""
    if not isinstance(book, dict):
        raise ValueError("Invalid public CLOB book")
    if str(book.get("asset_id") or "") != str(expected_token_id):
        raise ValueError("CLOB book asset_id mismatch")
    book_hash = str(book.get("hash") or "").lower()
    if re.fullmatch(r"[a-f0-9]{40}", book_hash) is None:
        raise ValueError("Missing or invalid CLOB book hash")
    book_time = datetime.fromtimestamp(_epoch_seconds(book.get("timestamp")), timezone.utc)
    skew = (server_time - now.astimezone(timezone.utc)).total_seconds()
    if abs(skew) > MAX_CLOB_CLOCK_SKEW_SECONDS:
        raise ValueError("CLOB server clock differs from research clock")
    age = (server_time - book_time).total_seconds()
    if age < -MAX_BOOK_FUTURE_SECONDS or age > MAX_BOOK_AGE_SECONDS:
        raise ValueError("CLOB book timestamp is stale or future-dated")
    bids = _book_levels(book.get("bids"), side="bids")
    asks = _book_levels(book.get("asks"), side="asks")
    best_bid, best_ask = bids[0][0], asks[0][0]
    if best_bid > best_ask:
        raise ValueError("Crossed CLOB book")
    min_order_size = finite(float(book.get("min_order_size")), low=0.00000001)
    tick_size = finite(float(book.get("tick_size")), low=0.00000001, high=1.0)
    probability = finite(probability, low=0.0, high=1.0)
    fee_rate = finite(fee_rate, low=0.0, high=1.0)
    fee_exponent = finite(fee_exponent, low=0.0, high=4.0)
    market_liquidity = finite(market_liquidity, low=0.0)
    notional = finite(notional, low=0.00000001)

    visible_ask_depth = sum(price * size for price, size in asks)
    visible_bid_depth = sum(price * size for price, size in bids)
    remaining = notional
    gross_cost = 0.0
    shares_filled = 0.0
    fee_total = Decimal("0")
    consumed: list[dict[str, float]] = []
    for price, available_shares in asks:
        if remaining <= 1e-8:
            break
        available_quote = price * available_shares
        quote_take = min(remaining, available_quote)
        shares_take = quote_take / price
        raw_fee = shares_take * fee_rate * (price * (1.0 - price)) ** fee_exponent
        # The public fee schedule is rounded to 5 decimals. We round each
        # aggregated price level, not each hidden maker fill; this is a
        # conservative replay estimate, not an exact exchange fee receipt.
        fee_level = Decimal(str(raw_fee)).quantize(
            Decimal("0.00001"), rounding=ROUND_HALF_UP
        )
        fee_total += fee_level
        gross_cost += quote_take
        shares_filled += shares_take
        consumed.append({
            "price": round(price, 8),
            "shares": round(shares_take, 8),
            "quote_usd": round(quote_take, 8),
            "fee_usd": float(fee_level),
        })
        remaining -= quote_take

    filled_notional = notional - max(0.0, remaining)
    fill_complete = remaining <= 1e-6
    vwap = gross_cost / shares_filled if shares_filled else None
    depth_slippage = vwap - best_ask if vwap is not None else None
    fee_usd = float(fee_total)
    fee_per_share = fee_usd / shares_filled if shares_filled else None
    all_in = ((gross_cost + fee_usd) / shares_filled
              if fill_complete and shares_filled else None)
    net_edge = probability - all_in if all_in is not None else None
    market_liquidity_gate = market_liquidity >= notional * MIN_MARKET_LIQUIDITY_MULTIPLE
    depth_slippage_gate = (
        depth_slippage is not None and depth_slippage <= MAX_BOOK_DEPTH_SLIPPAGE
    )
    minimum_size_gate = shares_filled >= min_order_size
    eligible = bool(
        fill_complete and minimum_size_gate
        and market_liquidity_gate and depth_slippage_gate
    )
    return {
        "model_version": "CLOB_VISIBLE_ASK_DEPTH_V1",
        "book_timestamp": iso(book_time),
        "book_server_time": iso(server_time),
        "book_age_seconds": round(age, 3),
        "book_clock_skew_seconds": round(skew, 3),
        "book_hash": book_hash,
        "book_asset_id": str(expected_token_id),
        "book_min_order_size": min_order_size,
        "book_tick_size": tick_size,
        "book_best_bid": best_bid,
        "book_best_ask": best_ask,
        "book_worst_ask_used": consumed[-1]["price"] if consumed else None,
        "book_vwap": round(vwap, 8) if vwap is not None else None,
        "book_depth_slippage_vs_best_ask": (
            round(depth_slippage, 8) if depth_slippage is not None else None
        ),
        "book_visible_ask_depth_usd": round(visible_ask_depth, 4),
        "book_visible_bid_depth_usd": round(visible_bid_depth, 4),
        "target_notional_usd": round(notional, 4),
        "filled_notional_usd": round(filled_notional, 8),
        "shares_filled": round(shares_filled, 8),
        "fill_complete": fill_complete,
        "levels_consumed": consumed,
        "fee_rate": fee_rate,
        "fee_exponent": fee_exponent,
        "fee_total_usd": round(fee_usd, 5),
        "fee_per_share": round(fee_per_share, 8) if fee_per_share is not None else None,
        "fee_rounding_method": "ROUND_HALF_UP_5DP_PER_AGGREGATED_PRICE_LEVEL",
        "entry_price": round(vwap, 8) if vwap is not None else None,
        "spread_cost": round((best_ask - best_bid) / 2.0, 8),
        "slippage_cost": round(depth_slippage, 8) if depth_slippage is not None else None,
        "all_in_cost_per_share": round(all_in, 8) if all_in is not None else None,
        "net_edge_per_share": round(net_edge, 8) if net_edge is not None else None,
        "market_liquidity_gate": market_liquidity_gate,
        "minimum_order_size_gate": minimum_size_gate,
        "depth_slippage_gate": depth_slippage_gate,
        "liquidity_required_usd": round(notional * MIN_MARKET_LIQUIDITY_MULTIPLE, 4),
        "eligible": eligible,
        "execution_semantics": (
            "READ_ONLY_VISIBLE_ASK_DEPTH_SIMULATION_NOT_A_FILL; "
            "no queue, latency, hidden liquidity, cancellation or market impact guarantee"
        ),
    }


def executable_quote(data: Any) -> tuple[float, float]:
    """Compatibility helper: best bid/ask from a public book."""
    if not isinstance(data, dict):
        raise ValueError("Invalid public CLOB book")
    bids = _book_levels(data.get("bids"), side="bids")
    asks = _book_levels(data.get("asks"), side="asks")
    bid, ask = bids[0][0], asks[0][0]
    if bid > ask:
        raise ValueError("Crossed CLOB book")
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
    clob_clock = None
    clob_clock_error = None
    if book_fetcher is not None and any(m["fee_rate"] is not None for m in valid[:MAX_QUOTE_LOOKUPS]):
        try:
            clob_clock = clob_server_time(book_fetcher(CLOB_TIME))
            if abs((clob_clock - now.astimezone(timezone.utc)).total_seconds()) > MAX_CLOB_CLOCK_SKEW_SECONDS:
                raise ValueError("CLOB server clock differs from research clock")
        except (ValueError, TypeError, OSError, KeyError) as exc:
            clob_clock_error = type(exc).__name__
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
                market["fee_rate"] is not None and
                clob_clock is not None and
                spot_divergence <= MAX_VENUE_SPOT_DIVERGENCE and
                abs(a - b) <= MAX_VENUE_PROB_DIVERGENCE):
            try:
                url = CLOB_BOOK + "?" + urllib.parse.urlencode(
                    {"token_id": market["yes_token_id"]}
                )
                book = book_fetcher(url)
                costs = depth_aware_buy_cost(
                    book,
                    expected_token_id=market["yes_token_id"],
                    now=now,
                    server_time=clob_clock,
                    probability=market["p_model_uncalibrated"],
                    fee_rate=market["fee_rate"],
                    fee_exponent=market["fee_exponent"],
                    market_liquidity=market["liquidity_usd_indicative"],
                    notional=ASSUMED_NOTIONAL,
                )
                market["execution_quote_available"] = True
                market["cost_fee_source"] = market["fee_source"]
                market["cost_fee_rate"] = market["fee_rate"]
                market["public_yes_bid"] = costs["book_best_bid"]
                market["public_yes_ask"] = costs["book_best_ask"]
                market["illustrative_cost_model"] = costs
            except (ValueError, KeyError, TypeError, OSError) as exc:
                market["book_error_type"] = type(exc).__name__
        elif clob_clock_error is not None:
            market["book_error_type"] = clob_clock_error
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
        "fee_assumption_note": "Per-market Gamma feeSchedule rate used when supported; taker fee formula is applied to simulated fills and rounded per aggregated price level, not actual match receipts",
        "execution_assumption_note": "Fresh public CLOB order-book asks are replayed for a fixed $100 quote notional; visible depth is not a guaranteed fill and no authenticated order path exists",
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

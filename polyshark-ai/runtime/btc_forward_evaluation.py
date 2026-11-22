#!/usr/bin/env python3
"""Forward-only BTC forecast ledger and post-event evaluation.

This research pipeline cannot place orders or modify canonical paper state.
It saves timestamped predictions *before* resolution, then cross-checks
Binance's exact settlement minute with Gamma's final resolved outcomes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from spot_research import request_json, timestamp
from btc_robustness import assess_forward_uncertainty

SCHEMA = "btc-forward-evaluation-v1"
MODEL_VERSION = "btc-terminal-spot-baseline-v1-20261116"
BINANCE_KLINES = "https://data-api.binance.vision/api/v3/klines"
GAMMA_EVENTS = "https://gamma-api.polymarket.com/events"
MAX_LEDGER_BYTES = 10_000_000
MAX_SNAPSHOTS = 15_000
MAX_RESOLUTIONS_PER_RUN = 3
SETTLEMENT_WAIT = timedelta(minutes=15)
MAX_OBSERVATION_DELAY = timedelta(minutes=5)
MIN_INDEPENDENT_EVENTS_FOR_REVIEW = 50
MAX_WINDOWS_PER_EVENT = 6
MIN_ILLUSTRATIVE_EDGE = 0.01
HORIZON_WINDOWS = ((0.25, 3, "0h-3h"), (3, 6, "3h-6h"),
                   (6, 12, "6h-12h"), (12, 24, "12h-24h"),
                   (24, 48, "24h-48h"), (48, 168, "48h-168h"))
SLUG = re.compile(r"^bitcoin-above-on-(january|february|march|april|may|june|july|august|september|october|november|december)-([1-9]|[12]\d|3[01])-(20\d{2})$")
MONTHS = dict(zip(
    ("january", "february", "march", "april", "may", "june", "july",
     "august", "september", "october", "november", "december"), range(1, 13)
))


def canonical(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True,
                      separators=(",", ":"), allow_nan=False).encode("utf-8")


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value)).hexdigest()


def utc(value: datetime) -> str:
    if value.tzinfo is None:
        raise ValueError("Naive UTC is not allowed")
    return value.astimezone(timezone.utc).isoformat(timespec="seconds")


def finite(value: Any, *, low: float = -math.inf, high: float = math.inf) -> float:
    if isinstance(value, bool) or not isinstance(value, (float, int)):
        raise ValueError("Expected numeric finite market value")
    f = float(value)
    if not math.isfinite(f) or not low <= f <= high:
        raise ValueError("Invalid numeric market value")
    return f


def blank_ledger() -> dict[str, Any]:
    return {"schema_version": SCHEMA, "snapshots": [], "resolutions": []}


def load_ledger(path: Path) -> dict[str, Any]:
    if not path.exists():
        return blank_ledger()
    if not path.is_file() or path.stat().st_size > MAX_LEDGER_BYTES:
        raise ValueError("Ledger missing regular-file/size invariant")
    root = json.loads(path.read_text("utf-8"))
    if (not isinstance(root, dict) or set(root) !=
            {"schema_version", "snapshots", "resolutions"} or root["schema_version"] != SCHEMA):
        raise ValueError("Unrecognized ledger version")
    if (not isinstance(root["snapshots"], list) or len(root["snapshots"]) > MAX_SNAPSHOTS or
            not isinstance(root["resolutions"], list)):
        raise ValueError("Invalid ledger bounds")
    seen: set[str] = set()
    pairs: set[tuple[str, str]] = set()
    for snap in root["snapshots"]:
        if not isinstance(snap, dict) or not isinstance(snap.get("sha256"), str):
            raise ValueError("Invalid stored snapshot")
        core = {k: v for k, v in snap.items() if k != "sha256"}
        if digest(core) != snap["sha256"]:
            raise ValueError("Historical snapshot digest mismatch")
        if not snap.get("markets") or not isinstance(snap["markets"], list):
            raise ValueError("Stored snapshot has no markets")
        unique_id = snap.get("snapshot_id")
        if (not isinstance(unique_id, str) or unique_id in seen or
                not isinstance(snap.get("observed_at"), str)):
            raise ValueError("Duplicate or invalid stored snapshot")
        seen.add(unique_id)
        pair = (snap.get("event_slug"), snap.get("horizon_bucket"))
        if pair in pairs:
            raise ValueError("Duplicate event/horizon bucket")
        pairs.add(pair)
        obs = timestamp(snap["observed_at"])
        if len({str(m.get("market_id")) for m in snap["markets"]}) != len(snap["markets"]):
            raise ValueError("Duplicate market id in snapshot")
        for m in snap["markets"]:
            if timestamp(str(m["end_at"])) <= obs:
                raise ValueError("Lookahead in stored snapshot")
            finite(m["p_model"], low=0, high=1)
    resolved_events: set[str] = set()
    for row in root["resolutions"]:
        if not isinstance(row, dict) or not isinstance(row.get("sha256"), str):
            raise ValueError("Invalid resolution record")
        body = {k: v for k, v in row.items() if k != "sha256"}
        if digest(body) != row["sha256"]:
            raise ValueError("Resolution digest mismatch")
        event = row.get("event_slug")
        if event in resolved_events:
            raise ValueError("Event resolved twice")
        resolved_events.add(event)
    return root


def horizon_bucket(hours: float) -> str | None:
    for lo, hi, name in HORIZON_WINDOWS:
        if lo <= hours < hi:
            return name
    return None


def snapshot_from_report(report: dict[str, Any], now: datetime) -> dict[str, Any] | None:
    if report.get("fit_status") != "UNCALIBRATED_NOT_ELIGIBLE":
        return None
    if (report.get("model_version") != MODEL_VERSION or
            report.get("capital_decision") != "NO_TRADE" or
            report.get("paper_only") is not True or
            report.get("real_orders_enabled") is not False or
            report.get("research_only") is not True or
            report.get("independent_probability_evidence") is not False):
        raise ValueError("Unsafe or unsupported forecast report")
    observed = timestamp(report["observed_at"])
    now_utc = now.astimezone(timezone.utc)
    if now_utc < observed or now_utc - observed > MAX_OBSERVATION_DELAY:
        raise ValueError("Historical replay and future observations forbidden")
    slug = report.get("event_slug")
    if not isinstance(slug, str) or SLUG.fullmatch(slug) is None:
        raise ValueError("Unrecognized event slug")
    venue_data = report.get("data_sources")
    if not isinstance(venue_data, dict) or set(venue_data) != {"coinbase", "kraken"}:
        raise ValueError("Research data provenance missing")
    provenance = {}
    for source, data in venue_data.items():
        stamp = timestamp(str(data["last_closed_candle_at"]))
        if stamp > observed or observed - stamp > timedelta(hours=3):
            raise ValueError("Data source is unfinished/future/stale")
        raw_hash = data["sample_sha256"]
        if not isinstance(raw_hash, str) or not re.fullmatch("[a-f0-9]{64}", raw_hash):
            raise ValueError("Invalid source sample hash")
        if int(data["sample_returns"]) != 72:
            raise ValueError("Insufficient forecast history")
        provenance[source] = {
            "candle_close_at": utc(stamp), "sha256": raw_hash,
            "spot_usd": finite(data["spot_usd"], low=1),
            "hourly_volatility": finite(data["hourly_volatility"], low=0.0001, high=0.15),
        }
    rows = report.get("markets")
    if not isinstance(rows, list) or not rows or len(rows) > 6:
        raise ValueError("No bounded market forecasts")
    prepared = []
    event_end = None
    for m in rows:
        if (m.get("shadow_eligible") is not False or
                m.get("diagnostic_status") != "NO_TRADE"):
            raise ValueError("Auto-trading flag in research snapshot")
        end = timestamp(str(m["end_at"]))
        if end <= observed:
            raise ValueError("Forecast generated after resolution")
        if event_end is None:
            event_end = end
        if end != event_end:
            raise ValueError("Mixed settlement times")
        threshold = finite(m["threshold_usd"], low=1)
        predicted = finite(m["p_model_uncalibrated"], low=0, high=1)
        market_p = finite(m["p_market_indicative"], low=0, high=1)
        record = {
            "market_id": str(m["market_id"]),
            "question": str(m["question"]),
            "threshold_usd": threshold, "end_at": utc(end),
            "p_model": predicted, "p_market": market_p,
            "quote_at": utc(observed),  # research run time, not an execution timestamp
            "fee_type": str(m.get("fee_type") or "unknown"),
            "fee_source": str(m.get("fee_source") or "UNKNOWN"),
            "fee_rate": (
                finite(m["fee_rate"], low=0, high=1)
                if m.get("fee_rate") is not None else None
            ),
            "fee_exponent": finite(m.get("fee_exponent", 1), low=0, high=4),
        }
        if m.get("execution_quote_available") is True:
            c = m.get("illustrative_cost_model") or {}
            if c.get("model_version") not in (None, "CLOB_VISIBLE_ASK_DEPTH_V1"):
                raise ValueError("Unsupported execution-cost model")
            record["yes_bid"] = finite(m["public_yes_bid"], low=0, high=1)
            record["yes_ask"] = finite(m["public_yes_ask"], low=0, high=1)
            if (c.get("all_in_cost_per_share") is not None
                    and c.get("net_edge_per_share") is not None):
                record["all_in_cost_per_share"] = finite(
                    c["all_in_cost_per_share"], low=0, high=2
                )
                record["illustrative_net_edge"] = finite(
                    c["net_edge_per_share"], low=-2, high=1
                )
                record["liquidity_gate"] = c.get("eligible") is True
            else:
                # A valid but shallow book is preserved as depth evidence;
                # partial $100 fills never become an eligible cost estimate.
                record["liquidity_gate"] = False
        else:
            record["liquidity_gate"] = False
        if "all_in_cost_per_share" in record:
            # Never silently attribute legacy assumptions to a verified fee.
            if m.get("cost_fee_source") == "GAMMA_MARKET_FEE_SCHEDULE":
                record["cost_fee_source"] = "GAMMA_MARKET_FEE_SCHEDULE"
                record["cost_fee_rate"] = finite(m["cost_fee_rate"], low=0, high=1)
            else:
                record["cost_fee_source"] = "LEGACY_OR_UNKNOWN_FEE_ASSUMPTION"
        if (m.get("execution_quote_available") is True
                and (m.get("illustrative_cost_model") or {}).get("model_version")
                    == "CLOB_VISIBLE_ASK_DEPTH_V1"):
            c = m.get("illustrative_cost_model") or {}
            if str(c.get("book_asset_id")) != str(m.get("yes_token_id")):
                raise ValueError("Order-book token provenance mismatch")
            book_time = timestamp(str(c["book_timestamp"]))
            server_time = timestamp(str(c["book_server_time"]))
            if abs((book_time - observed).total_seconds()) > 180:
                raise ValueError("Order-book snapshot is not contemporaneous")
            if abs((server_time - observed).total_seconds()) > 180:
                raise ValueError("CLOB server clock is not contemporaneous")
            if re.fullmatch(r"[a-f0-9]{40}", str(c.get("book_hash") or "")) is None:
                raise ValueError("Invalid order-book hash")
            levels = c.get("levels_consumed")
            if not isinstance(levels, list) or len(levels) > 2000:
                raise ValueError("Invalid consumed order-book levels")
            normalized_levels = []
            for level in levels:
                if not isinstance(level, dict) or set(level) != {
                    "price", "shares", "quote_usd", "fee_usd"
                }:
                    raise ValueError("Invalid consumed order-book level schema")
                normalized_levels.append({
                    "price": finite(level["price"], low=0, high=1),
                    "shares": finite(level["shares"], low=0),
                    "quote_usd": finite(level["quote_usd"], low=0),
                    "fee_usd": finite(level["fee_usd"], low=0),
                })
            depth = {
                "model_version": c["model_version"],
                "book_timestamp": utc(book_time),
                "book_server_time": utc(server_time),
                "book_age_seconds": finite(c["book_age_seconds"], low=-2, high=30),
                "book_hash": str(c["book_hash"]),
                "book_asset_id": str(c["book_asset_id"]),
                "book_min_order_size": finite(c["book_min_order_size"], low=0),
                "book_tick_size": finite(c["book_tick_size"], low=0, high=1),
                "best_bid": finite(c["book_best_bid"], low=0, high=1),
                "best_ask": finite(c["book_best_ask"], low=0, high=1),
                "worst_ask_used": (
                    finite(c["book_worst_ask_used"], low=0, high=1)
                    if c.get("book_worst_ask_used") is not None else None
                ),
                "vwap": finite(c["book_vwap"], low=0, high=1)
                    if c.get("book_vwap") is not None else None,
                "depth_slippage_vs_best_ask": (
                    finite(c["book_depth_slippage_vs_best_ask"], low=0, high=1)
                    if c.get("book_depth_slippage_vs_best_ask") is not None else None
                ),
                "visible_ask_depth_usd": finite(c["book_visible_ask_depth_usd"], low=0),
                "visible_bid_depth_usd": finite(c["book_visible_bid_depth_usd"], low=0),
                "target_notional_usd": finite(c["target_notional_usd"], low=0),
                "filled_notional_usd": finite(c["filled_notional_usd"], low=0),
                "shares_filled": finite(c["shares_filled"], low=0),
                "fill_complete": c.get("fill_complete") is True,
                "levels_consumed": normalized_levels,
                "fee_rate": finite(c["fee_rate"], low=0, high=1),
                "fee_exponent": finite(c["fee_exponent"], low=0, high=4),
                "fee_total_usd": finite(c["fee_total_usd"], low=0),
                "fee_per_share": (
                    finite(c["fee_per_share"], low=0)
                    if c.get("fee_per_share") is not None else None
                ),
                "fee_rounding_method": str(c["fee_rounding_method"]),
                "all_in_cost_per_share": (
                    finite(c["all_in_cost_per_share"], low=0, high=2)
                    if c.get("all_in_cost_per_share") is not None else None
                ),
                "net_edge_per_share": (
                    finite(c["net_edge_per_share"], low=-2, high=1)
                    if c.get("net_edge_per_share") is not None else None
                ),
                "market_liquidity_gate": c.get("market_liquidity_gate") is True,
                "minimum_order_size_gate": c.get("minimum_order_size_gate") is True,
                "depth_slippage_gate": c.get("depth_slippage_gate") is True,
                "eligible": c.get("eligible") is True,
                "execution_semantics": str(c["execution_semantics"]),
            }
            if depth["fill_complete"] != (depth["filled_notional_usd"] >= depth["target_notional_usd"] - 1e-6):
                raise ValueError("Order-book fill completeness mismatch")
            record["depth_execution"] = depth
        prepared.append(record)
    if len({m["market_id"] for m in prepared}) != len(prepared):
        raise ValueError("Duplicate markets")
    assert event_end is not None
    # Require the slug to correspond to the UTC settlement date.
    date_match = SLUG.fullmatch(slug)
    assert date_match is not None
    expected_day = datetime(int(date_match.group(3)), MONTHS[date_match.group(1)],
                            int(date_match.group(2)), tzinfo=timezone.utc).date()
    if expected_day != event_end.date():
        raise ValueError("Event slug/settlement day mismatch")
    hours = (event_end - observed).total_seconds() / 3600
    bucket = horizon_bucket(hours)
    if bucket is None:
        return None
    run_id = os.environ.get("GITHUB_RUN_ID", "local-diagnostic")
    core = {
        "snapshot_id": digest([slug, bucket, utc(observed), run_id]),
        "event_slug": slug, "horizon_bucket": bucket,
        "observed_at": utc(observed), "settlement_at": utc(event_end),
        "model_version": MODEL_VERSION, "github_run_id": str(run_id),
        "data_sources": provenance, "markets": prepared,
        "depth_coverage_complete": bool(prepared) and all(
            isinstance(m.get("depth_execution"), dict) for m in prepared
        ),
        "research_only": True, "capital_decision": "NO_TRADE",
    }
    return dict(core, sha256=digest(core))


def append_snapshot(ledger: dict[str, Any], report: dict[str, Any], now: datetime) -> bool:
    snap = snapshot_from_report(report, now)
    if snap is None:
        return False
    if any(s["event_slug"] == snap["event_slug"] and
           s["horizon_bucket"] == snap["horizon_bucket"] for s in ledger["snapshots"]):
        return False
    if len(ledger["snapshots"]) >= MAX_SNAPSHOTS:
        raise ValueError("Historical ledger capacity exceeded")
    ledger["snapshots"].append(snap)
    return True


def binance_minute_close(end: datetime, fetcher: Callable[[str], Any]) -> dict[str, Any]:
    end_ms = int(end.timestamp() * 1000)
    start_ms = end_ms - 60000   # 11:59–12:00 ET candle closes exactly at noon.
    query = f"?symbol=BTCUSDT&interval=1m&startTime={start_ms}&endTime={end_ms - 1}&limit=2"
    url = BINANCE_KLINES + query
    rows = fetcher(url)
    if not isinstance(rows, list) or len(rows) != 1 or not isinstance(rows[0], list):
        raise ValueError("Exact Binance settlement candle missing")
    bar = rows[0]
    if len(bar) < 7 or type(bar[0]) is not int or type(bar[6]) is not int:
        raise ValueError("Invalid Binance kline types")
    if bar[0] != start_ms or bar[6] != end_ms - 1:
        raise ValueError("Binance kline timestamp mismatch")
    price = float(bar[4])
    if not math.isfinite(price) or price <= 0:
        raise ValueError("Invalid settlement close price")
    return {
        "binance_close_usdt": price,
        "kline_open_ms": start_ms, "kline_close_ms": end_ms - 1,
        "source_url": url, "kline_sha256": digest(bar),
    }


def confirmed_gamma_outcomes(
    slug: str, event_end: datetime, markets: dict[str, dict[str, Any]],
    settle_price: float, fetcher: Callable[[str], Any]
) -> dict[str, int]:
    url = GAMMA_EVENTS + "?slug=" + slug
    events = fetcher(url)
    if not isinstance(events, list) or len(events) != 1:
        raise ValueError("Gamma settlement event unavailable/ambiguous")
    event = events[0]
    if event.get("closed") is not True:
        raise ValueError("Gamma event not closed")
    source = {str(m["id"]): m for m in event.get("markets", [])}
    result: dict[str, int] = {}
    for market_id, reference in markets.items():
        m = source.get(market_id)
        if m is None or m.get("closed") is not True:
            raise ValueError("Gamma market not closed")
        if str(m.get("umaResolutionStatus") or "").lower() != "resolved":
            raise ValueError("Gamma event outcome not final")
        if timestamp(str(m["endDate"])) != event_end or m.get("question") != reference["question"]:
            raise ValueError("Gamma market rule changed")
        desc = str(m.get("description") or "").casefold()
        if not all(k in desc for k in ("binance 1 minute candle for btc/usdt",
                                      "closing at 12:00", 'final "close" price higher',
                                      "binance btc/usdt")):
            raise ValueError("Gamma settlement source changed")
        outcomes = m.get("outcomes")
        prices = m.get("outcomePrices")
        outcomes = json.loads(outcomes) if isinstance(outcomes, str) else outcomes
        prices = json.loads(prices) if isinstance(prices, str) else prices
        if outcomes != ["Yes", "No"] or prices not in (["1", "0"], ["0", "1"], [1, 0], [0, 1]):
            raise ValueError("Gamma final outcome is not binary")
        yes = int(float(prices[0]))
        expected = int(settle_price > reference["threshold_usd"])
        if expected != yes:
            raise ValueError("Binance/Gamma settlement disagreement")
        result[market_id] = yes
    return result


def resolve_pending(ledger: dict[str, Any], now: datetime,
                    fetcher: Callable[[str], Any]) -> dict[str, Any]:
    resolved_slugs = {r["event_slug"] for r in ledger["resolutions"]}
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for snap in ledger["snapshots"]:
        if snap["event_slug"] not in resolved_slugs:
            grouped[snap["event_slug"]].append(snap)
    errors: list[dict[str, str]] = []
    added = 0
    due = [
        (slug, rows) for slug, rows in sorted(grouped.items())
        if now >= timestamp(rows[0]["settlement_at"]) + SETTLEMENT_WAIT
    ]
    for slug, snapshots in due[:MAX_RESOLUTIONS_PER_RUN]:
        end = timestamp(snapshots[0]["settlement_at"])
        if any(timestamp(s["settlement_at"]) != end for s in snapshots):
            raise ValueError("Conflicting event settlement timestamps")
        markets: dict[str, dict[str, Any]] = {}
        for snap in snapshots:
            for m in snap["markets"]:
                old = markets.setdefault(m["market_id"], m)
                if (old["threshold_usd"] != m["threshold_usd"] or
                        old["question"] != m["question"] or old["end_at"] != m["end_at"]):
                    raise ValueError("Mutated market rule across stored forecasts")
        try:
            closing = binance_minute_close(end, fetcher)
            outcomes = confirmed_gamma_outcomes(
                slug, end, markets, closing["binance_close_usdt"], fetcher
            )
        except (ValueError, TypeError, KeyError, OSError, json.JSONDecodeError) as exc:
            errors.append({"event_slug": slug, "reason": str(exc)[:150]})
            continue  # fail closed: no fabricated outcome
        row = {
            "event_slug": slug, "resolved_at": utc(now), "settlement_at": utc(end),
            "settlement": closing, "outcomes": outcomes,
            "verified_against": "Binance exact closing minute AND Gamma final resolved outcome",
        }
        ledger["resolutions"].append(dict(row, sha256=digest(row)))
        added += 1
    return {"new_resolutions": added, "settlement_blockers": errors}


def event_weighted_ece(
    event_forecasts: list[list[tuple[float, int]]], *, bins: int = 5
) -> dict[str, Any]:
    """Descriptive reliability diagnostic, with total unit weight PER event day.

    Markets in the same daily BTC threshold ladder are correlated. A day
    receives total weight 1, divided equally among its included markets.
    This does not make market outcomes or adjacent days independent, and
    the result alone never establishes model calibration.
    """
    if not isinstance(bins, int) or isinstance(bins, bool) or not 2 <= bins <= 20:
        raise ValueError("Calibration bins out of range")
    slots = [
        {"weight": 0.0, "p_weighted": 0.0, "y_weighted": 0.0,
         "observations": 0, "event_days": set()}
        for _ in range(bins)
    ]
    for day, forecasts in enumerate(event_forecasts):
        if not forecasts:
            raise ValueError("Empty independent event forecast group")
        weight = 1.0 / len(forecasts)
        for p, outcome in forecasts:
            probability = finite(p, low=0.0, high=1.0)
            if type(outcome) is not int or outcome not in (0, 1):
                raise ValueError("Calibration outcome must be 0 or 1")
            slot = slots[min(bins - 1, int(probability * bins))]
            slot["weight"] += weight
            slot["p_weighted"] += weight * probability
            slot["y_weighted"] += weight * outcome
            slot["observations"] += 1
            slot["event_days"].add(day)
    n = len(event_forecasts)
    ece = 0.0
    report_bins = []
    for index, slot in enumerate(slots):
        w = slot["weight"]
        mean_p = slot["p_weighted"] / w if w else None
        observed_y = slot["y_weighted"] / w if w else None
        if w:
            ece += (w / n) * abs(mean_p - observed_y)
        report_bins.append({
            "lower_inclusive": round(index / bins, 6),
            "upper_exclusive_except_final": round((index + 1) / bins, 6),
            "event_weight": round(w, 8),
            "event_days_contributing_not_independent_markets": len(slot["event_days"]),
            "correlated_market_observations": slot["observations"],
            "mean_probability": round(mean_p, 8) if w else None,
            "observed_yes_frequency": round(observed_y, 8) if w else None,
        })
    return {
        "ece_event_weighted_descriptive": round(ece, 8) if n else None,
        "resolved_event_days": n,
        "bins": report_bins,
        "statistical_validity": "DESCRIPTIVE_ONLY_CORRELATED_MARKETS_AND_ADJACENT_DAYS",
    }


def evaluate(ledger: dict[str, Any]) -> dict[str, Any]:
    """Score pre-recorded forecasts without trading or inflating event N."""
    outcomes = {r["event_slug"]: r["outcomes"] for r in ledger["resolutions"]}
    primary_model: list[float] = []
    primary_market: list[float] = []
    illustrated_pnl: list[float] = []
    illustrative_records: list[dict[str, Any]] = []
    per_event: list[dict[str, Any]] = []
    robustness_days: list[dict[str, Any]] = []
    depth_robustness_days: list[dict[str, Any]] = []
    depth_aware_unit_pnl: list[float] = []
    depth_aware_notional_pnl: list[float] = []
    depth_aware_records: list[dict[str, Any]] = []
    by_horizon: dict[str, list[tuple[float, float]]] = defaultdict(list)
    completed_events: set[str] = set()
    calibration_model: list[list[tuple[float, int]]] = []
    calibration_market: list[list[tuple[float, int]]] = []
    for snap in sorted(ledger["snapshots"], key=lambda row: row["observed_at"]):
        slug = snap["event_slug"]
        if slug not in outcomes:
            continue
        evaluation = []
        for market in snap["markets"]:
            y = outcomes[slug].get(market["market_id"])
            if y not in (0, 1):
                continue
            evaluation.append((
                (market["p_model"] - y) ** 2,
                (market["p_market"] - y) ** 2,
                market,
            ))
        if not evaluation:
            continue
        model_score = sum(v[0] for v in evaluation) / len(evaluation)
        market_score = sum(v[1] for v in evaluation) / len(evaluation)
        # A resolved event can have many precommitted horizon snapshots:
        # their scores are diagnostic, NOT independent observations.
        by_horizon[snap["horizon_bucket"]].append((model_score, market_score))
        if slug in completed_events:
            continue
        completed_events.add(slug)
        primary_model.append(model_score)
        primary_market.append(market_score)
        calibration_model.append([(v[2]["p_model"], outcomes[slug][v[2]["market_id"]])
                                  for v in evaluation])
        calibration_market.append([(v[2]["p_market"], outcomes[slug][v[2]["market_id"]])
                                   for v in evaluation])
        detail: dict[str, Any] = {
            "event_slug": slug,
            "snapshot_at": snap["observed_at"],
            "horizon_bucket": snap["horizon_bucket"],
            "market_count_correlated": len(evaluation),
            "brier_model": round(model_score, 8),
            "brier_market": round(market_score, 8),
            "brier_advantage": round(market_score - model_score, 8),
        }
        # Choose ONE market using forecast-time data ONLY, before looking up
        # its outcome. The rule is frozen and identical for every event.
        day_hypothetical_pnl = None
        choice = next((market for market in snap["markets"]
                       if market.get("liquidity_gate") is True
                       and market.get("illustrative_net_edge", -1) >= MIN_ILLUSTRATIVE_EDGE
                       and "all_in_cost_per_share" in market), None)
        if choice is not None:
            y = outcomes[slug].get(choice["market_id"])
            if y in (0, 1):
                pnl = y - choice["all_in_cost_per_share"]
                day_hypothetical_pnl = pnl
                illustrated_pnl.append(pnl)
                record = {
                    "event_slug": slug,
                    "market_id": choice["market_id"],
                    "outcome_yes": y,
                    "assumed_all_in_cost_per_share": choice["all_in_cost_per_share"],
                    "fee_source": choice.get(
                        "cost_fee_source", "LEGACY_5PCT_UNVERIFIED"
                    ),
                    "hypothetical_pnl_usd_1_share": round(pnl, 8),
                }
                illustrative_records.append(record)
                detail["hypothetical_choice"] = record
        depth_day_pnl = None
        depth_coverage_complete = snap.get("depth_coverage_complete") is True
        detail["depth_coverage_complete"] = depth_coverage_complete
        if depth_coverage_complete:
            depth_choice = next((
                market for market in snap["markets"]
                if isinstance(market.get("depth_execution"), dict)
                and market["depth_execution"].get("eligible") is True
                and market["depth_execution"].get("net_edge_per_share", -1)
                    >= MIN_ILLUSTRATIVE_EDGE
                and market["depth_execution"].get("fill_complete") is True
            ), None)
            if depth_choice is not None:
                y = outcomes[slug].get(depth_choice["market_id"])
                depth = depth_choice["depth_execution"]
                if y in (0, 1):
                    all_in = depth["all_in_cost_per_share"]
                    shares = depth["shares_filled"]
                    depth_day_pnl = y - all_in
                    notional_pnl = shares * depth_day_pnl
                    depth_aware_unit_pnl.append(depth_day_pnl)
                    depth_aware_notional_pnl.append(notional_pnl)
                    depth_record = {
                        "event_slug": slug,
                        "market_id": depth_choice["market_id"],
                        "outcome_yes": y,
                        "simulated_gross_notional_usd": depth["target_notional_usd"],
                        "simulated_shares_at_visible_book_vwap": shares,
                        "book_vwap": depth["vwap"],
                        "all_in_cost_per_share": all_in,
                        "fee_total_usd": depth["fee_total_usd"],
                        "fee_rate": depth["fee_rate"],
                        "fee_source": depth_choice.get("fee_source"),
                        "book_timestamp": depth["book_timestamp"],
                        "book_hash": depth["book_hash"],
                        "hypothetical_unit_pnl_per_share": round(depth_day_pnl, 8),
                        "hypothetical_100_usd_notional_pnl_usd": round(notional_pnl, 8),
                        "execution_status": "VISIBLE_BOOK_SIMULATION_NOT_A_FILL",
                    }
                    depth_aware_records.append(depth_record)
                    detail["depth_aware_choice"] = depth_record
        if depth_coverage_complete:
            depth_robustness_days.append({
                "date": timestamp(snap["settlement_at"]).date().isoformat(),
                "brier_advantage": market_score - model_score,
                "illustrative_pnl": depth_day_pnl,
            })
        per_event.append(detail)
        robustness_days.append({
            "date": timestamp(snap["settlement_at"]).date().isoformat(),
            "brier_advantage": market_score - model_score,
            "illustrative_pnl": day_hypothetical_pnl,
        })
    n = len(primary_model)
    brier = sum(primary_model) / n if n else None
    reference = sum(primary_market) / n if n else None
    return {
        "resolved_unique_event_days": n,
        "resolved_market_observations_not_independent": sum(
            len(s["markets"]) for s in ledger["snapshots"]
            if s["event_slug"] in outcomes
        ),
        "brier_model_event_weighted": round(brier, 8) if n else None,
        "brier_market_event_weighted": round(reference, 8) if n else None,
        "brier_advantage_vs_market": round(reference - brier, 8) if n else None,
        "calibration_model": event_weighted_ece(calibration_model),
        "calibration_market": event_weighted_ece(calibration_market),
        "forward_uncertainty": assess_forward_uncertainty(robustness_days),
        "depth_aware_forward_uncertainty": assess_forward_uncertainty(depth_robustness_days),
        "depth_aware_execution_coverage_days": len(depth_robustness_days),
        "depth_aware_illustrative_yes_choices": len(depth_aware_unit_pnl),
        "depth_aware_unit_pnl_per_share_total": (
            round(sum(depth_aware_unit_pnl), 8) if depth_robustness_days else None
        ),
        "depth_aware_100_usd_notional_pnl_total_usd": (
            round(sum(depth_aware_notional_pnl), 8) if depth_robustness_days else None
        ),
        "depth_aware_records": depth_aware_records[-12:],
        "calibration_review_blockers": (
            (["INSUFFICIENT_UNIQUE_RESOLVED_EVENT_DAYS"]
             if n < MIN_INDEPENDENT_EVENTS_FOR_REVIEW else []) + [
                "NO_OUT_OF_SAMPLE_CALIBRATION_VALIDATION",
                "UNVERIFIED_HYPOTHETICAL_EXECUTION_COSTS",
                "CORRELATED_SPOT_SOURCES_AND_DAILY_MARKETS",
                "BINANCE_SETTLEMENT_BASIS_RISK",
            ]
        ),
        "illustrative_yes_choices": len(illustrated_pnl),
        "illustrative_one_share_pnl_usd": round(sum(illustrated_pnl), 8),
        "illustrative_records": illustrative_records[-12:],
        "per_event_diagnostics": per_event[-50:],
        "horizon_diagnostics_not_independent": {
            bucket: {
                "observed_event_days": len(values),
                "brier_model": round(sum(x[0] for x in values) / len(values), 8),
                "brier_market": round(sum(x[1] for x in values) / len(values), 8),
            }
            for bucket, values in sorted(by_horizon.items())
        },
        "hypothetical_selection_policy": (
            "Legacy snapshots: first YES market with old modeled liquidity gate and "
            "net edge >= 0.01; historical costs remain unverified. "
            "Depth-aware snapshots: first market with a fresh complete public CLOB "
            "ask-book replay for $100 gross notional, aggregate liquidity gate, "
            "VWAP slippage <= $0.05 and net edge >= 0.01; max one market per event day. "
            "No order is submitted and visible depth is not a guaranteed fill."
        ),
        "calibration_review_eligible": False,
        "sample_count_adequate_for_review": n >= MIN_INDEPENDENT_EVENTS_FOR_REVIEW,
        "interpretation": (
            "Research only; correlated strike markets, hypothetical fills, "
            "historical unverified 5% fees, per-market Gamma feeSchedule and "
            "fresh visible-book depth simulation on newer snapshots; no fills verified"
        ),
    }


def run(report_path: Path, ledger_path: Path, now: datetime,
        fetcher: Callable[[str], Any] = request_json) -> dict[str, Any]:
    current = load_ledger(ledger_path)
    # Do not accept arbitrary JSON masquerading as a current forecast.
    report = json.loads(report_path.read_text(encoding="utf-8"))
    added = append_snapshot(current, report, now)
    resolution = resolve_pending(current, now, fetcher)
    if added or resolution["new_resolutions"]:
        data = canonical(current) + b"\n"
        if len(data) > MAX_LEDGER_BYTES:
            raise ValueError("Historical research capacity reached")
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        temp = ledger_path.with_suffix(".tmp")
        temp.write_bytes(data)
        temp.replace(ledger_path)
    metric = evaluate(current)
    return {
        "schema_version": SCHEMA, "generated_at": utc(now),
        "paper_only": True, "real_orders_enabled": False,
        "capital_decision": "NO_TRADE", "research_only": True,
        "forward_snapshot_added": added,
        "snapshot_count": len(current["snapshots"]),
        "pending_event_days": len({s["event_slug"] for s in current["snapshots"]} -
                                  {r["event_slug"] for r in current["resolutions"]}),
        **resolution, "metrics": metric,
        "ledger_sha256": digest(current),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Forward-only research ledger; never trades")
    parser.add_argument("--report", required=True)
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args(argv)
    result = run(Path(args.report), Path(args.ledger), datetime.now(timezone.utc))
    Path(args.output).write_text(
        json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

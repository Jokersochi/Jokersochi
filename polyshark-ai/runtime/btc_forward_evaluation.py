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
            "quote_at": utc(observed),  # snapshot time, not exchange execution timestamp
        }
        if m.get("execution_quote_available") is True:
            c = m.get("illustrative_cost_model") or {}
            record["yes_bid"] = finite(m["public_yes_bid"], low=0, high=1)
            record["yes_ask"] = finite(m["public_yes_ask"], low=0, high=1)
            if "all_in_cost_per_share" in c and "net_edge_per_share" in c:
                record["all_in_cost_per_share"] = finite(
                    c["all_in_cost_per_share"], low=0, high=2
                )
                record["illustrative_net_edge"] = finite(
                    c["net_edge_per_share"], low=-2, high=1
                )
                record["liquidity_gate"] = c.get("eligible") is True
            else:
                record["liquidity_gate"] = False
        else:
            record["liquidity_gate"] = False
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


def evaluate(ledger: dict[str, Any]) -> dict[str, Any]:
    outcomes = {r["event_slug"]: r["outcomes"] for r in ledger["resolutions"]}
    model_brier: list[float] = []
    market_brier: list[float] = []
    simulated_pnl: list[float] = []
    selected_rows = []
    completed_events: set[str] = set()
    # Primary OOS unit is unique event DAY, not repeated hourly snapshots
    # or highly correlated strike markets.
    for snap in sorted(ledger["snapshots"], key=lambda s: s["observed_at"]):
        slug = snap["event_slug"]
        if slug not in outcomes or slug in completed_events:
            continue
        completed_events.add(slug)
        evaluations = []
        for market in snap["markets"]:
            y = outcomes[slug].get(market["market_id"])
            if y not in (0, 1):
                continue
            p = market["p_model"]
            m = market["p_market"]
            evaluations.append(((p - y) ** 2, (m - y) ** 2, market, y))
        if not evaluations:
            completed_events.remove(slug)
            continue
        model_brier.append(sum(v[0] for v in evaluations) / len(evaluations))
        market_brier.append(sum(v[1] for v in evaluations) / len(evaluations))
        # One illustrative 1-share YES choice per independent event, not per
        # strike, to avoid counting a correlated basket as separate trades.
        candidate = next((v for v in evaluations
                          if v[2].get("liquidity_gate") and
                          v[2].get("illustrative_net_edge", -1) >= MIN_ILLUSTRATIVE_EDGE
                          and "all_in_cost_per_share" in v[2]), None)
        if candidate is not None:
            market = candidate[2]
            pnl = candidate[3] - market["all_in_cost_per_share"]
            simulated_pnl.append(pnl)
            selected_rows.append({
                "event_slug": slug,
                "market_id": market["market_id"],
                "outcome_yes": candidate[3],
                "hypothetical_pnl_usd_1_share": round(pnl, 8),
            })
    n = len(model_brier)
    brier = sum(model_brier) / n if n else None
    reference_brier = sum(market_brier) / n if n else None
    return {
        "resolved_unique_event_days": n,
        "resolved_market_observations_not_independent": sum(
            len(s["markets"]) for s in ledger["snapshots"]
            if s["event_slug"] in outcomes
        ),
        "brier_model_event_weighted": round(brier, 8) if n else None,
        "brier_market_event_weighted": round(reference_brier, 8) if n else None,
        "brier_advantage_vs_market": round(reference_brier - brier, 8) if n else None,
        "illustrative_yes_choices": len(simulated_pnl),
        "illustrative_one_share_pnl_usd": round(sum(simulated_pnl), 8),
        "illustrative_records": selected_rows[-12:],
        "calibration_review_eligible": False,  # requires actual calibration and OOS
        "sample_count_adequate_for_review": n >= MIN_INDEPENDENT_EVENTS_FOR_REVIEW,
        "interpretation": "Research only; correlated strike markets, unverified fees, no executed positions",
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

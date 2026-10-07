#!/usr/bin/env python3
"""PolyShark evidence decision contract.

This module is intentionally paper-only. It never places orders and never promotes a
strategy automatically. It turns the forward shadow challenger evidence into an
explicit TradeDossier with a fail-closed NO_TRADE capital decision.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

GAMMA_MARKETS = "https://gamma-api.polymarket.com/markets"
USER_AGENT = "PolyShark-Evidence/1.0 (+https://github.com/Jokersochi/Jokersochi)"
REQUEST_TIMEOUT = float(os.getenv("PAPER_REQUEST_TIMEOUT", "15"))

CONTRACT_VERSION = "trade-dossier-v1-20261008"
CALIBRATION_MIN_RESOLVED = int(os.getenv("PAPER_CALIBRATION_MIN_RESOLVED", "50"))
CALIBRATION_MAX_BRIER = float(os.getenv("PAPER_CALIBRATION_MAX_BRIER", "0.25"))
CALIBRATION_MAX_ECE = float(os.getenv("PAPER_CALIBRATION_MAX_ECE", "0.10"))
MIN_UNIQUE_MARKET_RATIO = float(os.getenv("PAPER_MIN_UNIQUE_MARKET_RATIO", "0.80"))
CALIBRATION_RECORD_LIMIT = int(os.getenv("PAPER_CALIBRATION_RECORD_LIMIT", "2000"))
CALIBRATION_LOOKUPS_PER_TICK = max(
    1, int(os.getenv("PAPER_CALIBRATION_LOOKUPS_PER_TICK", "25"))
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_ts(value: str) -> float:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.timestamp()


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _as_json_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return []
        return parsed if isinstance(parsed, list) else []
    return []


def _request_json(url: str) -> Any:
    request = urllib.request.Request(
        url,
        method="GET",
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
        return json.load(response)


def fetch_market_by_id(market_id: str) -> dict[str, Any] | None:
    if not market_id:
        return None
    quoted = urllib.parse.quote(str(market_id), safe="")
    try:
        data = _request_json(f"{GAMMA_MARKETS}/{quoted}")
        if isinstance(data, dict):
            return data
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise
    params = urllib.parse.urlencode({"id": str(market_id), "limit": 1})
    data = _request_json(f"{GAMMA_MARKETS}?{params}")
    if isinstance(data, list) and data and isinstance(data[0], dict):
        return data[0]
    return None


def resolved_outcome_for_signal(signal: dict[str, Any], market: dict[str, Any]) -> int | None:
    """Return 1 when the selected shadow outcome won, 0 when it lost, else None."""
    if not bool(market.get("closed", False)):
        return None
    outcomes = [str(item).upper() for item in _as_json_list(market.get("outcomes"))]
    prices = [_as_float(item, -1.0) for item in _as_json_list(market.get("outcomePrices"))]
    tokens = [str(item) for item in _as_json_list(market.get("clobTokenIds"))]
    if len(outcomes) != 2 or len(prices) != 2:
        return None
    normalized: list[int] = []
    for price in prices:
        if price >= 0.999:
            normalized.append(1)
        elif 0.0 <= price <= 0.001:
            normalized.append(0)
        else:
            return None
    if sum(normalized) != 1:
        return None
    token_id = str(signal.get("token_id") or "")
    if token_id and token_id in tokens:
        return normalized[tokens.index(token_id)]
    outcome = str(signal.get("outcome") or "").upper()
    if outcome and outcome in outcomes:
        return normalized[outcomes.index(outcome)]
    return None


def collect_calibration_records(
    state: dict[str, Any],
    now: str,
    *,
    market_fetcher=fetch_market_by_id,
) -> list[dict[str, Any]]:
    root = state.setdefault("evidence_contract", {})
    existing = root.setdefault("calibration_records", [])
    by_signal = {str(item.get("signal_id")): item for item in existing if item.get("signal_id")}
    shadow = state.get("shadow_challenger")
    if not isinstance(shadow, dict):
        return existing

    now_ts = parse_ts(now)
    current_model = str(shadow.get("model_version") or "")
    lookups = 0
    resolved_added = 0
    eligible_unresolved = 0

    for signal in shadow.get("signals", []):
        if not isinstance(signal, dict):
            continue
        if current_model and str(signal.get("model_version") or "") != current_model:
            continue
        signal_id = str(signal.get("signal_id") or "")
        if not signal_id or signal_id in by_signal:
            continue
        end_date = signal.get("end_date")
        if not end_date:
            continue
        try:
            if parse_ts(str(end_date)) > now_ts:
                continue
        except Exception:
            continue

        eligible_unresolved += 1
        if lookups >= CALIBRATION_LOOKUPS_PER_TICK:
            continue
        lookups += 1
        try:
            market = market_fetcher(str(signal.get("market_id") or ""))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
            continue
        if not isinstance(market, dict):
            continue
        actual = resolved_outcome_for_signal(signal, market)
        if actual is None:
            continue
        probability = _as_float(signal.get("entry_mid"), -1.0)
        if not 0.0 < probability < 1.0:
            continue
        record = {
            "signal_id": signal_id,
            "model_version": signal.get("model_version"),
            "market_id": str(signal.get("market_id") or ""),
            "observed_at": signal.get("observed_at"),
            "resolved_at_observed": now,
            "forecast_probability": round(probability, 8),
            "actual": int(actual),
            "brier": round((probability - actual) ** 2, 8),
            "paper_only": True,
            "capital_impact": 0.0,
        }
        existing.append(record)
        by_signal[signal_id] = record
        resolved_added += 1

    if len(existing) > CALIBRATION_RECORD_LIMIT:
        del existing[:-CALIBRATION_RECORD_LIMIT]
    root["last_calibration_scan"] = {
        "ts": now,
        "model_version": current_model or None,
        "eligible_unresolved": eligible_unresolved,
        "lookups": lookups,
        "lookup_limit": CALIBRATION_LOOKUPS_PER_TICK,
        "resolved_added": resolved_added,
        "records_total": len(existing),
    }
    return existing


def expected_calibration_error(records: list[dict[str, Any]], bins: int = 10) -> float | None:
    if not records:
        return None
    total = len(records)
    weighted_error = 0.0
    for index in range(bins):
        lower = index / bins
        upper = (index + 1) / bins
        bucket = [
            item
            for item in records
            if lower <= _as_float(item.get("forecast_probability")) < upper
            or (index == bins - 1 and _as_float(item.get("forecast_probability")) == 1.0)
        ]
        if not bucket:
            continue
        confidence = math.fsum(_as_float(item.get("forecast_probability")) for item in bucket) / len(bucket)
        accuracy = math.fsum(_as_float(item.get("actual")) for item in bucket) / len(bucket)
        weighted_error += (len(bucket) / total) * abs(confidence - accuracy)
    return weighted_error


def calibration_summary(records: list[dict[str, Any]]) -> dict[str, Any]:
    if not records:
        return {
            "n_resolved": 0,
            "brier_score": None,
            "ece_10bin": None,
            "max_brier": CALIBRATION_MAX_BRIER,
            "max_ece": CALIBRATION_MAX_ECE,
            "min_resolved": CALIBRATION_MIN_RESOLVED,
            "passed": False,
        }
    brier = math.fsum(_as_float(item.get("brier")) for item in records) / len(records)
    ece = expected_calibration_error(records)
    passed = (
        len(records) >= CALIBRATION_MIN_RESOLVED
        and brier <= CALIBRATION_MAX_BRIER
        and ece is not None
        and ece <= CALIBRATION_MAX_ECE
    )
    return {
        "n_resolved": len(records),
        "brier_score": round(brier, 8),
        "ece_10bin": round(ece, 8) if ece is not None else None,
        "max_brier": CALIBRATION_MAX_BRIER,
        "max_ece": CALIBRATION_MAX_ECE,
        "min_resolved": CALIBRATION_MIN_RESOLVED,
        "passed": bool(passed),
    }


def independence_summary(shadow: dict[str, Any]) -> dict[str, Any]:
    current_model = str(shadow.get("model_version") or "")
    signals = [
        item
        for item in shadow.get("signals", [])
        if isinstance(item, dict)
        and (not current_model or str(item.get("model_version") or "") == current_model)
    ]
    matured_24h = [item for item in signals if "24" in item.get("horizon_results", {})]
    if not matured_24h:
        return {
            "n_24h": 0,
            "unique_markets": 0,
            "unique_market_ratio": None,
            "min_unique_market_ratio": MIN_UNIQUE_MARKET_RATIO,
            "passed": False,
        }
    unique = len({str(item.get("market_id") or "") for item in matured_24h})
    ratio = unique / len(matured_24h)
    return {
        "n_24h": len(matured_24h),
        "unique_markets": unique,
        "unique_market_ratio": round(ratio, 8),
        "min_unique_market_ratio": MIN_UNIQUE_MARKET_RATIO,
        "passed": ratio >= MIN_UNIQUE_MARKET_RATIO,
    }


def build_trade_dossier(state: dict[str, Any], now: str) -> dict[str, Any]:
    shadow = state.get("shadow_challenger") if isinstance(state.get("shadow_challenger"), dict) else {}
    root = state.setdefault("evidence_contract", {})
    current_model = str(shadow.get("model_version") or "")
    calibration_records = [
        item
        for item in root.get("calibration_records", [])
        if isinstance(item, dict)
        and (not current_model or str(item.get("model_version") or "") == current_model)
    ]
    calibration = calibration_summary(calibration_records)
    independence = independence_summary(shadow)
    summary24 = shadow.get("summary", {}).get("24", {}) if isinstance(shadow.get("summary"), dict) else {}
    forward_passed = shadow.get("verdict") == "ELIGIBLE_FOR_REVIEW"
    cost_passed = (
        _as_float(shadow.get("strategy_spec", {}).get("max_spread"), -1.0) >= 0.0
        and summary24.get("mean_return") is not None
        and summary24.get("ci95_lower") is not None
        and _as_float(summary24.get("ci95_lower")) > 0.0
    )
    gates = {
        "paper_only": state.get("paper_only") is True and state.get("real_orders_enabled") is False,
        "legacy_execution_blocked": state.get("legacy_momentum_entries_enabled") is False,
        "forward_oos": bool(shadow.get("strategy_spec", {}).get("forward_only")) and forward_passed,
        "after_cost_edge": bool(cost_passed),
        "calibration": bool(calibration.get("passed")),
        "sample_independence": bool(independence.get("passed")),
        "manual_promotion_required": shadow.get("auto_promotion") is False,
    }
    review_eligible = all(gates.values())
    reasons = [name for name, passed in gates.items() if not passed]
    return {
        "contract_version": CONTRACT_VERSION,
        "generated_at": now,
        "model_version": shadow.get("model_version"),
        "capital_decision": "NO_TRADE",
        "review_status": "REVIEW_ELIGIBLE" if review_eligible else "BLOCKED",
        "auto_promotion": False,
        "paper_only": True,
        "real_orders_enabled": False,
        "gates": gates,
        "blocked_by": reasons,
        "forward_evidence": {
            "shadow_verdict": shadow.get("verdict", "NO_EVIDENCE"),
            "stats_24h": summary24,
        },
        "calibration": calibration,
        "independence": independence,
        "execution_assumptions": shadow.get("strategy_spec", {}),
        "calibration_scan": root.get("last_calibration_scan", {}),
        "warning": "REVIEW_ELIGIBLE is not permission to trade; capital_decision remains NO_TRADE until a separate reviewed paper-execution change.",
    }


def apply_contract(
    state: dict[str, Any],
    now: str | None = None,
    *,
    market_fetcher=fetch_market_by_id,
) -> dict[str, Any]:
    now = now or utc_now()
    if state.get("paper_only") is not True or state.get("real_orders_enabled") is not False:
        raise RuntimeError("Evidence contract refuses non-paper state")
    collect_calibration_records(state, now, market_fetcher=market_fetcher)
    dossier = build_trade_dossier(state, now)
    root = state.setdefault("evidence_contract", {})
    root["contract_version"] = CONTRACT_VERSION
    root["updated_at"] = now
    root["trade_dossier"] = dossier
    state["capital_decision"] = "NO_TRADE"
    state["capital_decision_reason"] = (
        "Evidence gate requires separate manual paper-execution review"
        if dossier["review_status"] == "REVIEW_ELIGIBLE"
        else "Evidence gate not satisfied: " + ", ".join(dossier["blocked_by"])
    )
    return state


def apply_state_file(path: Path) -> dict[str, Any]:
    state = json.loads(path.read_text(encoding="utf-8"))
    apply_contract(state)
    tmp = path.with_suffix(path.suffix + ".evidence.tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)
    return state


def validate_contract(state: dict[str, Any]) -> None:
    assert state.get("paper_only") is True
    assert state.get("real_orders_enabled") is False
    assert state.get("capital_decision") == "NO_TRADE"
    root = state.get("evidence_contract")
    assert isinstance(root, dict)
    assert root.get("contract_version") == CONTRACT_VERSION
    dossier = root.get("trade_dossier")
    assert isinstance(dossier, dict)
    assert dossier.get("capital_decision") == "NO_TRADE"
    assert dossier.get("auto_promotion") is False
    assert dossier.get("paper_only") is True
    assert dossier.get("real_orders_enabled") is False
    scan = root.get("last_calibration_scan", {})
    if scan:
        assert int(scan.get("lookups", 0)) <= CALIBRATION_LOOKUPS_PER_TICK
    for record in root.get("calibration_records", []):
        assert record.get("paper_only") is True
        assert _as_float(record.get("capital_impact")) == 0.0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="PolyShark fail-closed evidence contract")
    parser.add_argument("--state", default=str(Path(__file__).with_name("paper_state.json")))
    args = parser.parse_args(argv)
    state = apply_state_file(Path(args.state))
    validate_contract(state)
    dossier = state["evidence_contract"]["trade_dossier"]
    print(json.dumps({
        "capital_decision": dossier["capital_decision"],
        "review_status": dossier["review_status"],
        "blocked_by": dossier["blocked_by"],
        "calibration": dossier["calibration"],
        "independence": dossier["independence"],
        "calibration_scan": dossier["calibration_scan"],
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

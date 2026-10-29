"""Price-blind Challenger v2 forecast and conservative shadow-cost contract.

The event forecast deliberately accepts only timestamped exogenous research
observations.  It never receives an order-book price, spread, or token id.
Without enough independently sourced observations it returns a neutral prior
and marks the forecast ineligible for a shadow signal.  This is intentional:
missing evidence must produce abstention, not a fabricated trading edge.
"""
from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable


MODEL_VERSION = "event-evidence-v2-price-blind-20261029"
NEUTRAL_PRIOR = 0.5
MIN_INDEPENDENT_SOURCES = 2
MAX_EVIDENCE_AGE_SECONDS = 7 * 24 * 60 * 60
MAX_SLIPPAGE = 0.05
IMPACT_COEFFICIENT = 0.04
MIN_LIQUIDITY_MULTIPLE = 250.0


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        return default if value is None or value == "" else float(value)
    except (TypeError, ValueError):
        return default


def parse_ts(value: str) -> float:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.timestamp()


def question_hash(question: str) -> str:
    normalized = " ".join(str(question).strip().lower().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class EventForecast:
    probability_yes: float
    status: str
    source_ids: tuple[str, ...]
    evidence_fingerprint: str | None


def price_blind_event_forecast(
    question: str,
    now: str,
    evidence: Iterable[dict[str, Any]] | None,
) -> EventForecast:
    """Combine valid exogenous probabilities; this function is price-blind."""
    now_ts = parse_ts(now)
    expected_hash = question_hash(question)
    valid: list[tuple[str, float, float, str]] = []
    for item in evidence or []:
        if not isinstance(item, dict):
            continue
        source_id = str(item.get("source_id") or "").strip()
        observed_at = str(item.get("observed_at") or "")
        probability = _as_float(item.get("probability_yes"), -1.0)
        weight = _as_float(item.get("weight"), 1.0)
        if (
            not source_id
            or item.get("question_hash") != expected_hash
            or item.get("independent_of_market_price") is not True
            or not 0.0 < probability < 1.0
            or not math.isfinite(weight)
            or weight <= 0.0
        ):
            continue
        try:
            age = now_ts - parse_ts(observed_at)
        except (TypeError, ValueError):
            continue
        if age < 0.0 or age > MAX_EVIDENCE_AGE_SECONDS:
            continue
        fingerprint = str(item.get("evidence_id") or f"{source_id}:{observed_at}")
        valid.append((source_id, probability, weight, fingerprint))

    unique_sources = sorted({source for source, _, _, _ in valid})
    if len(unique_sources) < MIN_INDEPENDENT_SOURCES:
        return EventForecast(NEUTRAL_PRIOR, "INSUFFICIENT_INDEPENDENT_EVIDENCE", (), None)
    # At most one observation from each source prevents duplicated feeds from
    # manufacturing confidence.  The newest valid item is supplied by callers.
    by_source: dict[str, tuple[float, float, str]] = {}
    for source, probability, weight, fingerprint in valid:
        by_source[source] = (probability, weight, fingerprint)
    scale = max(weight for _, weight, _ in by_source.values())
    total_weight = math.fsum(weight / scale for _, weight, _ in by_source.values())
    probability_yes = math.fsum(
        probability * (weight / scale) for probability, weight, _ in by_source.values()
    ) / total_weight
    fingerprints = sorted(fingerprint for _, _, fingerprint in by_source.values())
    digest = hashlib.sha256("|".join(fingerprints).encode("utf-8")).hexdigest()
    return EventForecast(
        round(min(0.999, max(0.001, probability_yes)), 8),
        "OK",
        tuple(sorted(by_source)),
        digest,
    )


def taker_fee_per_share(price: float, fee_rate: float) -> float:
    if not 0.0 < price < 1.0 or fee_rate <= 0.0:
        return 0.0
    return fee_rate * price * (1.0 - price)


def liquidity_slippage(notional: float, liquidity: float) -> float:
    """Conservative, explicit market-impact estimate bounded for binary prices."""
    if notional <= 0.0 or liquidity <= 0.0:
        return MAX_SLIPPAGE
    if liquidity < notional * MIN_LIQUIDITY_MULTIPLE:
        return MAX_SLIPPAGE
    return min(MAX_SLIPPAGE, IMPACT_COEFFICIENT * math.sqrt(notional / liquidity))


def costed_edge(
    *,
    probability: float,
    market_probability: float,
    spread: float,
    fee_rate: float,
    liquidity: float,
    notional: float,
) -> dict[str, float | bool]:
    """Return expected resolution edge after ask, fee, impact and liquidity gate."""
    if not all(math.isfinite(value) for value in (probability, market_probability, spread, fee_rate, liquidity, notional)):
        return {"eligible": False, "net_edge_per_share": -1.0}
    if not (0.0 < probability < 1.0 and 0.0 < market_probability < 1.0 and 0.0 <= spread < 1.0):
        return {"eligible": False, "net_edge_per_share": -1.0}
    slippage = liquidity_slippage(notional, liquidity)
    entry_price = min(0.999, market_probability + spread / 2.0 + slippage)
    fee_per_share = taker_fee_per_share(entry_price, fee_rate)
    all_in_cost = entry_price + fee_per_share
    net_edge = probability - all_in_cost
    eligible_liquidity = liquidity >= notional * MIN_LIQUIDITY_MULTIPLE
    return {
        "eligible": bool(eligible_liquidity),
        "market_probability": round(market_probability, 8),
        "entry_price": round(entry_price, 8),
        "spread_cost": round(spread / 2.0, 8),
        "slippage_cost": round(slippage, 8),
        "fee_per_share": round(fee_per_share, 8),
        "all_in_cost_per_share": round(all_in_cost, 8),
        "net_edge_per_share": round(net_edge, 8),
        "liquidity": round(liquidity, 2),
        "liquidity_required": round(notional * MIN_LIQUIDITY_MULTIPLE, 2),
    }

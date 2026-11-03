"""Strict, opt-in local research evidence ingestion for the paper-only challenger.

Input URLs and timestamps are syntactically checked, not independently verified.
This module does not fetch news, synthesize probabilities, or place orders.
"""
from __future__ import annotations

import hashlib
import ipaddress
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from challenger_v2 import MAX_EVIDENCE_AGE_SECONDS, question_hash

SCHEMA_VERSION = "challenger-research-feed-v1"
MAX_FILE_BYTES = 256_000
MAX_MARKETS = 100
MAX_SOURCES_PER_MARKET = 12
ALLOWED_SOURCE_FIELDS = {
    "source_url", "published_at", "observed_at", "probability_yes",
    "independent_of_market_price", "reviewed_by",
}


def _time(value: Any) -> float:
    if not isinstance(value, str) or not value:
        raise ValueError("Timestamp must be a non-empty ISO-8601 string")
    stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if stamp.tzinfo is None:
        raise ValueError("Timezone offset is required")
    return stamp.timestamp()


def _source_host(url: Any) -> str:
    if not isinstance(url, str) or len(url) > 2048:
        raise ValueError("Source URL must be an HTTPS URL")
    parts = urlsplit(url)
    host = (parts.hostname or "").lower().removeprefix("www.")
    if (parts.scheme != "https" or not host or "." not in host
            or parts.username or parts.password or parts.port not in (None, 443)):
        raise ValueError("Source URL must have a public HTTPS hostname")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError("Source URLs must use public DNS hostnames")
    if host.endswith((".local", ".internal", ".test", ".example")):
        raise ValueError("Source hostname cannot be a local/test domain")
    return host


def load_research_feed(path: Path, *, now: str) -> tuple[dict[str, list[dict[str, Any]]], dict[str, Any]]:
    """Parse a bounded, manually reviewed feed and return price-blind evidence.

    Two URLs on the same hostname count as one source. Reject the entire feed
    on malformed input: partial acceptance could silently bias research.
    """
    current = _time(now)
    if not path.is_file():
        raise ValueError("Configured research feed is not a regular file")
    if path.stat().st_size > MAX_FILE_BYTES:
        raise ValueError("Research feed exceeds size limit")
    raw = path.read_bytes()
    if len(raw) > MAX_FILE_BYTES:
        raise ValueError("Research feed exceeds size limit")
    payload = json.loads(raw.decode("utf-8"))
    if not isinstance(payload, dict) or set(payload) != {"schema_version", "generated_at", "markets"}:
        raise ValueError("Research feed schema mismatch")
    if payload["schema_version"] != SCHEMA_VERSION:
        raise ValueError("Unsupported research feed schema version")
    generated = _time(payload["generated_at"])
    if generated > current:
        raise ValueError("Research feed generated in the future")
    markets = payload["markets"]
    if not isinstance(markets, list) or len(markets) > MAX_MARKETS:
        raise ValueError("Research markets must be a bounded list")
    results: dict[str, list[dict[str, Any]]] = {}
    for market in markets:
        if not isinstance(market, dict) or set(market) != {"market_id", "question", "sources"}:
            raise ValueError("Research market schema mismatch")
        market_id, question = market["market_id"], market["question"]
        if not isinstance(market_id, str) or not market_id or len(market_id) > 128:
            raise ValueError("Invalid market id")
        if not isinstance(question, str) or not question.strip() or len(question) > 2000:
            raise ValueError("Invalid question")
        if market_id in results:
            raise ValueError("Duplicate market id")
        sources = market["sources"]
        if not isinstance(sources, list) or len(sources) > MAX_SOURCES_PER_MARKET:
            raise ValueError("Research sources must be a bounded list")
        by_host: dict[str, dict[str, Any]] = {}
        for item in sources:
            if not isinstance(item, dict) or set(item) != ALLOWED_SOURCE_FIELDS:
                raise ValueError("Research source fields mismatch (price inputs forbidden)")
            if item["independent_of_market_price"] is not True:
                raise ValueError("Market-dependent evidence is forbidden")
            if not isinstance(item["reviewed_by"], str) or not item["reviewed_by"].strip():
                raise ValueError("A named reviewer attestation is required")
            host = _source_host(item["source_url"])
            probability = item["probability_yes"]
            if (isinstance(probability, bool) or not isinstance(probability, (int, float))
                    or not math.isfinite(probability) or not 0 < probability < 1):
                raise ValueError("Probability must be finite and between 0 and 1")
            published = _time(item["published_at"])
            observed = _time(item["observed_at"])
            if published > observed or observed > generated or generated > current:
                raise ValueError("Look-ahead / time-order violation")
            if current - observed > MAX_EVIDENCE_AGE_SECONDS:
                continue  # stale research never enters the forecaster
            evidence_id = hashlib.sha256(
                json.dumps(item, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
            ).hexdigest()
            candidate = {
                "source_id": host,
                "evidence_id": evidence_id,
                "observed_at": item["observed_at"],
                "question_hash": question_hash(question),
                "probability_yes": float(probability),
                "independent_of_market_price": True,
            }
            previous = by_host.get(host)
            if previous is None or (observed, evidence_id) > (
                _time(previous["observed_at"]), previous["evidence_id"]
            ):
                by_host[host] = candidate
        results[market_id] = list(by_host.values())
    return results, {
        "status": "LOADED",
        "schema_version": SCHEMA_VERSION,
        "generated_at": payload["generated_at"],
        "markets": len(results),
        "observations": sum(len(rows) for rows in results.values()),
        "provenance_verified": False,
        "warning": "URL and reviewer are self-attested; independent source authenticity is not verified",
    }

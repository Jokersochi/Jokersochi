#!/usr/bin/env python3
"""Deterministic, no-network PAPER replay of previously captured public CLOB books.

JSONL rows contain:
{"tick_at":"2026-11-18T12:00:00+00:00",
 "quotes":{"market_id":{"received_at":"2026-11-18T11:59:59+00:00",
 "book_timestamp_ms":1795003198000,
 "bids":[[0.49,100]],"asks":[[0.5,100]],"question":"..."}}}

Replay refuses look-ahead, nonmonotonic decision times, undated books, and
trading-enabled states. This is an execution/ledger test, not evidence of edge.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import sandbox_paper_execution as engine
from sandbox_audit import audit_state, AuditError


def _instant(value, label):
    if not isinstance(value, str):
        raise ValueError(f"{label}: timezone-aware ISO timestamp required")
    try:
        at = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{label}: invalid ISO timestamp") from exc
    if at.tzinfo is None or at.utcoffset() is None:
        raise ValueError(f"{label}: timezone required")
    return at.astimezone(timezone.utc)


def initial_state():
    return {"schema_version": 1, "paper_only": True,
            "real_orders_enabled": False, "capital_decision": "NO_TRADE",
            "cash": engine.START_CASH, "equity": engine.START_CASH,
            "positions": {}, "trades": [], "observations": {}}


def _replay_quote(market_id, raw, tick):
    if not isinstance(raw, dict):
        raise ValueError(f"{market_id}: quote must be a mapping")
    observed = _instant(raw.get("received_at"), f"{market_id}.received_at")
    book_ms = raw.get("book_timestamp_ms")
    if not isinstance(book_ms, int) or isinstance(book_ms, bool):
        raise ValueError(f"{market_id}: integer book timestamp in milliseconds required")
    if book_ms < 0:
        raise ValueError(f"{market_id}: negative book timestamp")
    book_at = datetime.fromtimestamp(book_ms / 1000, tz=timezone.utc)
    # Causality: no use of a book timestamped or observed after the decision.
    if not (book_at <= observed <= tick):
        raise ValueError(f"{market_id}: look-ahead / receipt after decision")
    if not isinstance(raw.get("bids"), list) or not isinstance(raw.get("asks"), list):
        raise ValueError(f"{market_id}: bids/asks arrays required")
    try:
        bids = engine.clean_levels(raw["bids"], reverse=True)
        asks = engine.clean_levels(raw["asks"])
    except (TypeError, ValueError, KeyError) as exc:
        raise ValueError(f"{market_id}: malformed ladder") from exc
    if not bids or not asks:
        raise ValueError(f"{market_id}: empty executable ladder")
    bid, ask = bids[0][0], asks[0][0]
    if bid > ask:
        raise ValueError(f"{market_id}: crossed ladder")
    bid_depth = sum(size for price, size in bids if price == bid)
    ask_depth = sum(size for price, size in asks if price == ask)
    question = raw.get("question", "")
    if not isinstance(question, str):
        raise ValueError(f"{market_id}: question must be a string")
    return (bid, ask, bid_depth, ask_depth, bids, asks, book_ms, question)


def replay_records(records, *, initial=None):
    """Pure replay: all decisions use previously received book snapshots only."""
    state = json.loads(json.dumps(initial if initial is not None else initial_state()))
    audit_state(state)
    ticks = 0
    previous = None
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            raise ValueError(f"tick[{index}]: object required")
        tick = _instant(record.get("tick_at"), f"tick[{index}]")
        if previous is not None and tick <= previous:
            raise ValueError(f"tick[{index}]: replay timestamps not strictly increasing")
        previous = tick
        raw_quotes = record.get("quotes")
        if not isinstance(raw_quotes, dict):
            raise ValueError(f"tick[{index}]: quotes mapping required")
        quotes = {}
        for market_id in sorted(raw_quotes):
            if not isinstance(market_id, str) or not market_id:
                raise ValueError(f"tick[{index}]: market identifier required")
            quotes[market_id] = _replay_quote(market_id, raw_quotes[market_id], tick)
        state = engine.step(state, quotes, tick.isoformat())
        audit_state(state)
        ticks += 1
    if not ticks:
        raise ValueError("Replay requires at least one snapshot")
    summary = audit_state(state)
    summary["replay_ticks"] = ticks
    summary["last_tick_at"] = state["last_tick_at"]
    summary["state_sha256"] = hashlib.sha256(
        json.dumps(state, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    return state, summary


def main():
    parser = argparse.ArgumentParser(description="Offline causal PAPER replay")
    parser.add_argument("--input", type=Path, required=True, help="Read-only JSONL snapshots")
    parser.add_argument("--initial-state", type=Path, help="Read-only audited seed")
    parser.add_argument("--output", type=Path, help="Optional isolated replay output, never production")
    args = parser.parse_args()
    records = []
    with args.input.open("r", encoding="utf-8") as stream:
        for index, line in enumerate(stream):
            if line.strip():
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError as exc:
                    raise ValueError(f"JSONL line {index + 1}: malformed JSON") from exc
    initial = (json.loads(args.initial_state.read_text(encoding="utf-8"))
               if args.initial_state else None)
    state, summary = replay_records(records, initial=initial)
    if args.output:
        path = args.output.resolve()
        if (path.name == "paper_state.json" or
                path == args.input.resolve() or
                (args.initial_state and path == args.initial_state.resolve())):
            parser.error("Refusing to overwrite production/source ledger")
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, temp = tempfile.mkstemp(dir=path.parent, prefix=".paper-replay-", suffix=".json")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                json.dump(state, stream, ensure_ascii=False, indent=2)
            os.replace(temp, path)
        finally:
            if os.path.exists(temp):
                os.unlink(temp)
    print(json.dumps(summary, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

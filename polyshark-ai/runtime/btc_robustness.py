#!/usr/bin/env python3
"""Conservative, descriptive uncertainty diagnostics for BTC forward evidence.

This module never trades or grants strategy approval. It uses the earliest
precommitted forecast for each resolved BTC event day. Correlated strike
markets never count as independent samples.
"""
from __future__ import annotations

import math
import random
from datetime import date, timedelta
from typing import Any

MIN_EVENT_DAYS = 50
MIN_ILLUSTRATIVE_CHOICES = 30
BOOTSTRAP_REPLICATES = 2000
BLOCK_LENGTH_DAYS = 7
BOOTSTRAP_SEED = 20261118


def _number(value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("Uncertainty input must be numeric")
    x = float(value)
    if not math.isfinite(x):
        raise ValueError("Nonfinite uncertainty input")
    return x


def _quantile(sorted_values: list[float], q: float) -> float:
    if not sorted_values or not 0 <= q <= 1:
        raise ValueError("Invalid bootstrap distribution or percentile")
    index = (len(sorted_values) - 1) * q
    low = int(index)
    high = min(len(sorted_values) - 1, low + 1)
    return sorted_values[low] + (sorted_values[high] - sorted_values[low]) * (index - low)


def assess_forward_uncertainty(
    day_rows: list[dict[str, Any]],
    *,
    min_days: int = MIN_EVENT_DAYS,
    min_choices: int = MIN_ILLUSTRATIVE_CHOICES,
    block_days: int = BLOCK_LENGTH_DAYS,
    replicates: int = BOOTSTRAP_REPLICATES,
    seed: int = BOOTSTRAP_SEED,
) -> dict[str, Any]:
    """Paired moving-block bootstrap over *calendar days*, never contracts.

    A signal-free day contributes $0 to the illustrative DAILY P&L; it is
    not dropped (otherwise the sample would be selection-biased).
    P&L excludes verification of fills, market impact and settlement basis.
    Nonconsecutive days, N<50 or too few hypothetical choices fail closed.
    Block resampling preserves up to seven days of local dependence, but
    is not an out-of-sample test or proof of edge.
    """
    if (not isinstance(day_rows, list) or len(day_rows) > 15000
            or not isinstance(min_days, int) or isinstance(min_days, bool)
            or min_days < 2 or not isinstance(min_choices, int)
            or isinstance(min_choices, bool) or min_choices < 1
            or not isinstance(block_days, int) or isinstance(block_days, bool)
            or block_days < 1 or not isinstance(replicates, int)
            or isinstance(replicates, bool) or not 100 <= replicates <= 10000):
        raise ValueError("Invalid bootstrap limits")
    parsed: list[tuple[date, float, float | None]] = []
    for row in day_rows:
        if not isinstance(row, dict) or set(row) != {
            "date", "brier_advantage", "illustrative_pnl"
        }:
            raise ValueError("Expected exact daily outcome schema")
        day = date.fromisoformat(row["date"])
        brier = _number(row["brier_advantage"])
        if not -1 <= brier <= 1:
            raise ValueError("Brier advantage out of range")
        pnl = None if row["illustrative_pnl"] is None else _number(row["illustrative_pnl"])
        if pnl is not None and not -2 <= pnl <= 1:
            raise ValueError("Illustrative one-share P&L out of range")
        parsed.append((day, brier, pnl))
    parsed.sort(key=lambda x: x[0])
    if any(a[0] == b[0] for a, b in zip(parsed, parsed[1:])):
        raise ValueError("Duplicate event day in primary uncertainty series")
    n = len(parsed)
    choices = sum(pnl is not None for _, _, pnl in parsed)
    contiguous = all(
        curr[0] == prev[0] + timedelta(days=1)
        for prev, curr in zip(parsed, parsed[1:])
    )
    status = (
        "INSUFFICIENT_UNIQUE_EVENT_DAYS" if n < min_days else
        "NONCONTIGUOUS_CALENDAR_DAYS" if not contiguous else
        "READY_FOR_DESCRIPTIVE_RESAMPLING"
    )
    brier_mean = sum(row[1] for row in parsed) / n if n else None
    pnl_mean = sum(row[2] if row[2] is not None else 0.0 for row in parsed) / n if n else None
    result = {
        "status": status,
        "event_days": n,
        "consecutive_calendar_days": contiguous,
        "illustrative_choice_days": choices,
        "brier_advantage_mean": round(brier_mean, 8) if n else None,
        "hypothetical_one_share_daily_pnl_mean": round(pnl_mean, 8) if n else None,
        "brier_advantage_ci95": None,
        "hypothetical_one_share_daily_pnl_ci95": None,
        "can_claim_positive_edge": False,
        "strategy_promotion": "BLOCKED",
        "research_only": True,
        "bootstrap_method": "circular_moving_block_percentile_paired_by_event_day",
        "bootstrap_length_days": block_days,
        "bootstrap_replicates": replicates,
        "bootstrap_seed": seed,
        "bootstrap_status_note": (
            "Descriptive resampling only; event dates may remain serially "
            "dependent beyond the block; all fills and modeled fees unverified"
        ),
    }
    if status != "READY_FOR_DESCRIPTIVE_RESAMPLING":
        return result
    if block_days > n:
        result["status"] = "BLOCK_EXCEEDS_EVENT_SAMPLE"
        return result
    rng = random.Random(seed)
    brier_samples: list[float] = []
    pnl_samples: list[float] = []
    for _ in range(replicates):
        positions: list[int] = []
        while len(positions) < n:
            start = rng.randrange(n)
            positions.extend((start + j) % n for j in range(block_days))
        positions = positions[:n]
        brier_samples.append(sum(parsed[k][1] for k in positions) / n)
        if choices >= min_choices:
            pnl_samples.append(sum(
                parsed[k][2] if parsed[k][2] is not None else 0.0
                for k in positions
            ) / n)
    brier_samples.sort()
    result["brier_advantage_ci95"] = {
        "lower": round(_quantile(brier_samples, .025), 8),
        "upper": round(_quantile(brier_samples, .975), 8),
        "interpretation": "DESCRIPTIVE_ONLY_NOT_OOS_OR_CAUSAL",
    }
    if choices >= min_choices:
        pnl_samples.sort()
        result["hypothetical_one_share_daily_pnl_ci95"] = {
            "lower": round(_quantile(pnl_samples, .025), 8),
            "upper": round(_quantile(pnl_samples, .975), 8),
            "interpretation": "NOT_EXECUTED_PAPER_OR_LIVE_RETURNS",
        }
    else:
        result["status"] = "INSUFFICIENT_HYPOTHETICAL_CHOICES_FOR_PNL_CI"
    return result

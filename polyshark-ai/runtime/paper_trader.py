#!/usr/bin/env python3
"""Autonomous, public-data-only Polymarket paper trader.

Version 3 replaces price momentum with persistent-elite consensus. The runtime
cannot import authenticated order clients, read trading secrets, or submit an
order. Existing v2 positions are liquidated conservatively during migration.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

RUNTIME_DIR = Path(__file__).resolve().parent
if str(RUNTIME_DIR) not in sys.path:
    sys.path.insert(0, str(RUNTIME_DIR))
import leader_consensus as lc  # noqa: E402

STRATEGY_VERSION = 3
STRATEGY_NAME = "persistent-elite consensus v3"

STARTING_EQUITY = float(os.getenv("PAPER_STARTING_EQUITY", "1000"))
TARGET_EQUITY = float(os.getenv("PAPER_TARGET_EQUITY", "2000"))
BANKRUPT_EQUITY = float(os.getenv("PAPER_BANKRUPT_EQUITY", "0"))
MAX_POSITION_PCT = float(os.getenv("PAPER_MAX_POSITION_PCT", "0.02"))
MAX_TOTAL_EXPOSURE_PCT = float(os.getenv("PAPER_MAX_TOTAL_EXPOSURE_PCT", "0.08"))
MAX_OPEN_POSITIONS = int(os.getenv("PAPER_MAX_OPEN_POSITIONS", "5"))
MAX_NEW_POSITIONS_PER_TICK = int(os.getenv("PAPER_MAX_NEW_POSITIONS_PER_TICK", "1"))
MAX_DAILY_REALIZED_LOSS = float(os.getenv("PAPER_MAX_DAILY_REALIZED_LOSS", "20"))
TAKE_PROFIT_RETURN = float(os.getenv("PAPER_TAKE_PROFIT_RETURN", "0.18"))
HARD_STOP_RETURN = float(os.getenv("PAPER_HARD_STOP_RETURN", "-0.12"))
MAX_HOLD_HOURS = float(os.getenv("PAPER_MAX_HOLD_HOURS", "168"))
SIGNAL_MISS_TICKS = int(os.getenv("PAPER_SIGNAL_MISS_TICKS", "2"))
MIN_HOLD_CONSENSUS = float(os.getenv("PAPER_MIN_HOLD_CONSENSUS", "0.60"))

# Compatibility exports used by the existing unit-test entry point.
DEFAULT_FEE_RATE = lc.DEFAULT_FEE_RATE
MAX_SPREAD = lc.MAX_SPREAD
market_fee_rate = lc.market_fee_rate
taker_fee = lc.taker_fee
parse_ts = lc.parse_ts
_as_float = lc.as_float


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def risk_policy_snapshot() -> dict[str, Any]:
    return {
        "max_position_pct": MAX_POSITION_PCT,
        "max_total_exposure_pct": MAX_TOTAL_EXPOSURE_PCT,
        "max_open_positions": MAX_OPEN_POSITIONS,
        "max_new_positions_per_tick": MAX_NEW_POSITIONS_PER_TICK,
        "max_daily_realized_loss": MAX_DAILY_REALIZED_LOSS,
        "hard_stop_return": HARD_STOP_RETURN,
        "take_profit_return": TAKE_PROFIT_RETURN,
        "max_hold_hours": MAX_HOLD_HOURS,
        "min_signal_supporters": lc.MIN_SIGNAL_SUPPORTERS,
        "min_signal_consensus": lc.MIN_SIGNAL_CONSENSUS,
    }


def fresh_state() -> dict[str, Any]:
    now = utc_now()
    return {
        "schema_version": STRATEGY_VERSION,
        "session_id": f"paper-{int(time.time())}",
        "status": "running",
        "started_at": now,
        "stopped_at": None,
        "stop_reason": None,
        "starting_equity": round(STARTING_EQUITY, 2),
        "target_equity": round(TARGET_EQUITY, 2),
        "bankrupt_equity": round(BANKRUPT_EQUITY, 2),
        "cash": round(STARTING_EQUITY, 6),
        "equity": round(STARTING_EQUITY, 6),
        "realized_pnl": 0.0,
        "unrealized_pnl": 0.0,
        "fees_paid": 0.0,
        "ticks": 0,
        "last_tick_at": None,
        "last_error": None,
        "quote_source": "Polymarket Gamma + public CLOB midpoint/spread",
        "leader_source": "Polymarket public Data API leaderboard/positions/trades",
        "real_orders_enabled": False,
        "paper_only": True,
        "strategy": STRATEGY_NAME,
        "strategy_version": STRATEGY_VERSION,
        "risk_policy": risk_policy_snapshot(),
        "research_snapshot": None,
        "open_positions": [],
        "closed_positions": [],
        "audit": [
            {
                "ts": now,
                "event": "SESSION_RESET",
                "starting_equity": round(STARTING_EQUITY, 2),
                "target_equity": round(TARGET_EQUITY, 2),
                "bankrupt_equity": round(BANKRUPT_EQUITY, 2),
                "strategy": STRATEGY_NAME,
                "paper_only": True,
            }
        ],
    }


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return fresh_state()
    state = json.loads(path.read_text(encoding="utf-8"))
    if state.get("real_orders_enabled") not in (False, None) or state.get("paper_only") is False:
        raise RuntimeError("Refusing to run: state does not prove paper-only mode")
    state["real_orders_enabled"] = False
    state["paper_only"] = True
    return state


def save_state(path: Path, state: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def position_liquidation(position: dict[str, Any], mid: float, spread: float) -> tuple[float, float, float]:
    shares = _as_float(position.get("shares"))
    fee_rate = _as_float(position.get("fee_rate"), DEFAULT_FEE_RATE)
    exit_price = max(0.001, min(0.999, mid - max(0.0, spread) / 2))
    fee = taker_fee(shares, exit_price, fee_rate)
    return max(0.0, shares * exit_price - fee), exit_price, fee


def get_quote(token_id: str) -> tuple[float, float] | None:
    mid = lc.batch_midpoints([token_id]).get(token_id, -1)
    spread = lc.batch_spreads([token_id]).get(token_id, 1)
    return (mid, spread) if 0 < mid < 1 and 0 <= spread < 1 else None


def close_position(
    state: dict[str, Any], position: dict[str, Any], *, mid: float, spread: float, reason: str, now: str,
) -> None:
    net, exit_price, exit_fee = position_liquidation(position, mid, spread)
    basis = _as_float(position.get("cash_outlay"))
    pnl = net - basis
    state["cash"] = round(_as_float(state.get("cash")) + net, 6)
    state["fees_paid"] = round(_as_float(state.get("fees_paid")) + exit_fee, 6)
    state["realized_pnl"] = round(_as_float(state.get("realized_pnl")) + pnl, 6)
    closed = dict(position)
    closed.update(
        {
            "closed_at": now, "exit_price": round(exit_price, 6), "exit_fee": round(exit_fee, 6),
            "net_proceeds": round(net, 6), "pnl": round(pnl, 6),
            "return_pct": round(pnl / basis * 100 if basis > 0 else 0, 4), "close_reason": reason,
        }
    )
    state.setdefault("closed_positions", []).append(closed)
    state.setdefault("audit", []).append(
        {
            "ts": now, "event": "PAPER_CLOSE", "market_id": position.get("market_id"),
            "outcome": position.get("outcome"), "exit_price": round(exit_price, 6),
            "pnl": round(pnl, 6), "reason": reason,
        }
    )


def mark_and_exit_positions(
    state: dict[str, Any], mids: dict[str, float], spreads: dict[str, float], now: str,
    signals: dict[str, lc.EliteSignal] | None = None, *, research_ready: bool = False,
) -> None:
    signals = signals or {}
    remaining: list[dict[str, Any]] = []
    for position in state.get("open_positions", []):
        token = str(position.get("token_id"))
        mid, spread = mids.get(token), spreads.get(token)
        if mid is None or spread is None or not 0 < mid < 1:
            quote = get_quote(token)
            if quote is None:
                remaining.append(position)
                continue
            mid, spread = quote
        basis = _as_float(position.get("cash_outlay"))
        net = position_liquidation(position, mid, spread)[0]
        return_fraction = (net - basis) / basis if basis > 0 else 0
        held_hours = (parse_ts(now) - parse_ts(str(position["opened_at"]))) / 3600
        legacy = lc.as_int(position.get("strategy_version"), 2) != STRATEGY_VERSION
        misses = lc.as_int(position.get("signal_misses"), 0)
        signal = signals.get(token)
        if research_ready and not legacy:
            if signal and signal.consensus >= MIN_HOLD_CONSENSUS:
                misses = 0
                position.update(
                    {
                        "leader_supporters": list(signal.supporters),
                        "leader_consensus": round(signal.consensus, 6),
                        "leader_exposure": round(signal.leader_exposure, 2),
                    }
                )
            else:
                misses += 1
            position["signal_misses"] = misses
        reason = None
        if legacy:
            reason = "strategy_migration"
        elif return_fraction <= HARD_STOP_RETURN:
            reason = "hard_stop"
        elif return_fraction >= TAKE_PROFIT_RETURN:
            reason = "take_profit"
        elif held_hours >= MAX_HOLD_HOURS:
            reason = "max_hold"
        elif research_ready and misses >= SIGNAL_MISS_TICKS and held_hours >= 0.5:
            reason = "leader_consensus_lost"
        if reason:
            close_position(state, position, mid=mid, spread=spread, reason=reason, now=now)
        else:
            position.update(
                {"mark_price": round(mid, 6), "mark_spread": round(spread, 6), "mark_net_liquidation": round(net, 6)}
            )
            remaining.append(position)
    state["open_positions"] = remaining


def current_exposure(state: dict[str, Any]) -> float:
    return sum(_as_float(position.get("cash_outlay")) for position in state.get("open_positions", []))


def daily_realized_pnl(state: dict[str, Any], now: str) -> float:
    return sum(
        _as_float(position.get("pnl"))
        for position in state.get("closed_positions", [])
        if str(position.get("closed_at") or "")[:10] == now[:10]
    )


def open_candidate(
    state: dict[str, Any], candidate: lc.Candidate, mids: dict[str, float], spreads: dict[str, float], now: str,
) -> bool:
    token = candidate.token_id
    mid, spread = mids.get(token, candidate.token_mid), spreads.get(token, candidate.token_spread)
    if not 0 < mid < 1 or not 0 <= spread <= lc.MAX_SPREAD:
        return False
    entry_price = min(0.999, mid + spread / 2)
    if entry_price > candidate.signal.leader_avg_entry + lc.MAX_ENTRY_CHASE:
        return False
    equity, available = _as_float(state.get("equity")), _as_float(state.get("cash"))
    portfolio_room = max(0.0, equity * MAX_TOTAL_EXPOSURE_PCT - current_exposure(state))
    signal = candidate.signal
    confidence_pct = (
        0.010 + 0.003 * max(0, signal.supporter_count - lc.MIN_SIGNAL_SUPPORTERS)
        + 0.010 * max(0.0, signal.consensus - lc.MIN_SIGNAL_CONSENSUS)
    )
    cash_budget = min(equity * min(MAX_POSITION_PCT, max(0.010, confidence_pct)), available, portfolio_room)
    if cash_budget < 5:
        return False
    fee_rate = candidate.fee_rate
    gross = cash_budget / (1 + fee_rate * (1 - entry_price)) if fee_rate > 0 else cash_budget
    shares = gross / entry_price
    entry_fee = taker_fee(shares, entry_price, fee_rate)
    outlay = gross + entry_fee
    if outlay > available + 1e-9:
        return False
    market = signal.market
    state["cash"] = round(available - outlay, 6)
    state["fees_paid"] = round(_as_float(state.get("fees_paid")) + entry_fee, 6)
    position = {
        "position_id": f"{market.condition_id}-{signal.outcome}-{int(time.time())}",
        "strategy": STRATEGY_NAME, "strategy_version": STRATEGY_VERSION,
        "market_id": market.condition_id, "gamma_market_id": market.market_id, "event_key": market.event_key,
        "question": market.question, "slug": market.slug, "category": market.category,
        "outcome": signal.outcome, "token_id": token, "opened_at": now,
        "entry_mid": round(mid, 6), "entry_spread": round(spread, 6), "entry_price": round(entry_price, 6),
        "shares": round(shares, 8), "gross_trade": round(gross, 6), "entry_fee": round(entry_fee, 6),
        "cash_outlay": round(outlay, 6), "fee_rate": fee_rate,
        "leader_supporters": list(signal.supporters),
        "leader_supporter_wallets": [f"{wallet[:8]}…{wallet[-4:]}" for wallet in signal.supporter_wallets],
        "leader_supporter_count": signal.supporter_count, "leader_opposition_count": signal.opposition_count,
        "leader_consensus": round(signal.consensus, 6), "leader_exposure": round(signal.leader_exposure, 2),
        "leader_avg_entry": round(signal.leader_avg_entry, 6), "recent_buyers": signal.recent_buyers,
        "latest_leader_trade_ts": signal.latest_trade_ts, "liquidity": round(market.liquidity, 2),
        "volume_24h": round(market.volume_24h, 2), "close_at": market.close_at,
        "signal_misses": 0, "paper": True,
    }
    state.setdefault("open_positions", []).append(position)
    state.setdefault("audit", []).append(
        {
            "ts": now, "event": "PAPER_OPEN", "market_id": market.condition_id, "question": market.question,
            "outcome": signal.outcome, "entry_price": round(entry_price, 6), "cash_outlay": round(outlay, 6),
            "supporters": list(signal.supporters), "consensus": round(signal.consensus, 6),
            "leader_avg_entry": round(signal.leader_avg_entry, 6),
        }
    )
    return True


def recalc_equity(state: dict[str, Any], mids: dict[str, float], spreads: dict[str, float]) -> float:
    liquidation = 0.0
    basis = 0.0
    for position in state.get("open_positions", []):
        token = str(position.get("token_id"))
        mid = mids.get(token, _as_float(position.get("mark_price"), -1))
        spread = spreads.get(token, _as_float(position.get("mark_spread"), 0))
        net = position_liquidation(position, mid, spread)[0] if 0 < mid < 1 else 0
        position.update(
            {
                "mark_price": round(mid, 6) if 0 < mid < 1 else None,
                "mark_spread": round(spread, 6) if spread >= 0 else None,
                "mark_net_liquidation": round(net, 6),
            }
        )
        liquidation += net
        basis += _as_float(position.get("cash_outlay"))
    equity = max(0.0, _as_float(state.get("cash")) + liquidation)
    state["equity"] = round(equity, 6)
    state["unrealized_pnl"] = round(liquidation - basis, 6)
    return equity


def stop_session(state: dict[str, Any], reason: str, now: str, mids: dict[str, float], spreads: dict[str, float]) -> None:
    remaining = list(state.get("open_positions", []))
    state["open_positions"] = []
    for position in remaining:
        token = str(position.get("token_id"))
        mid = mids.get(token, _as_float(position.get("mark_price"), 0))
        spread = spreads.get(token, _as_float(position.get("mark_spread"), 0))
        if not 0 < mid < 1:
            state["open_positions"].append(position)
        else:
            close_position(state, position, mid=mid, spread=spread, reason=reason, now=now)
    if state.get("open_positions"):
        return
    state["equity"] = round(max(0.0, _as_float(state.get("cash"))), 6)
    state["unrealized_pnl"] = 0.0
    state["status"] = "stopped_target" if reason == "target_reached" else "stopped_broke"
    state["stopped_at"], state["stop_reason"] = now, reason
    state.setdefault("audit", []).append(
        {
            "ts": now, "event": "SESSION_STOP", "reason": reason, "final_equity": state["equity"],
            "net_pnl": round(state["equity"] - _as_float(state.get("starting_equity")), 6),
        }
    )


def tick(state: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    now_epoch = int(parse_ts(now))
    if state.get("status") not in ("running", None):
        state["last_tick_at"], state["last_error"] = now, None
        return state
    if state.get("real_orders_enabled") is not False or state.get("paper_only") is not True:
        raise RuntimeError("Paper-only invariant failed")

    market_map = lc.eligible_markets(lc.fetch_markets(), now_epoch=now_epoch)
    leaders: list[lc.Leader] = []
    signals: dict[str, lc.EliteSignal] = {}
    metadata: list[dict[str, Any]] = []
    evidence_errors: list[str] = []
    research_error = None
    try:
        leaders = lc.select_persistent_leaders(lc.fetch_leaderboards())
        evidence, evidence_errors = lc.fetch_leader_evidence(leaders)
        signals, metadata = lc.aggregate_leader_signals(leaders, evidence, market_map, now_epoch=now_epoch)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
        research_error = f"{type(exc).__name__}: {exc}"
    usable_evidence = sum(bool(row.get("usable")) for row in metadata)
    research_ready = usable_evidence >= lc.MIN_SIGNAL_SUPPORTERS and research_error is None

    tokens = {str(position.get("token_id")) for position in state.get("open_positions", []) if position.get("token_id")}
    for signal in signals.values():
        tokens.update(signal.market.tokens)
    mids, spreads = lc.batch_midpoints(sorted(tokens)), lc.batch_spreads(sorted(tokens))
    mark_and_exit_positions(state, mids, spreads, now, signals, research_ready=research_ready)
    equity = recalc_equity(state, mids, spreads)
    candidates = lc.build_entry_candidates(signals, mids, spreads, now_epoch=now_epoch) if research_ready else []

    state.update(
        {
            "schema_version": STRATEGY_VERSION, "strategy": STRATEGY_NAME,
            "strategy_version": STRATEGY_VERSION, "risk_policy": risk_policy_snapshot(),
        }
    )
    if equity >= _as_float(state.get("target_equity"), TARGET_EQUITY):
        stop_session(state, "target_reached", now, mids, spreads)
    elif equity <= _as_float(state.get("bankrupt_equity"), BANKRUPT_EQUITY) + 1e-9:
        stop_session(state, "bankrupt", now, mids, spreads)
    else:
        today_pnl = daily_realized_pnl(state, now)
        daily_guard = today_pnl <= -MAX_DAILY_REALIZED_LOSS
        existing_markets = {str(position.get("market_id")) for position in state.get("open_positions", [])}
        existing_events = {str(position.get("event_key")) for position in state.get("open_positions", []) if position.get("event_key")}
        capacity = max(0, MAX_OPEN_POSITIONS - len(state.get("open_positions", [])))
        opened = 0
        if not daily_guard:
            for candidate in candidates:
                if capacity <= 0 or opened >= MAX_NEW_POSITIONS_PER_TICK:
                    break
                if candidate.market_id in existing_markets or candidate.event_key in existing_events:
                    continue
                if open_candidate(state, candidate, mids, spreads, now):
                    existing_markets.add(candidate.market_id)
                    existing_events.add(candidate.event_key)
                    capacity -= 1
                    opened += 1
        recalc_equity(state, mids, spreads)
        state["daily_risk"] = {
            "date": now[:10], "realized_pnl": round(today_pnl, 6),
            "new_entries_blocked": daily_guard, "limit": MAX_DAILY_REALIZED_LOSS,
        }

    state["research_snapshot"] = {
        "generated_at": now, "ready": research_ready, "error": research_error,
        "evidence_errors": evidence_errors, "leaderboard_periods": list(lc.LEADERBOARD_PERIODS),
        "leaders_selected": len(leaders), "leaders_with_evidence": len(metadata),
        "leaders_with_usable_evidence": usable_evidence,
        "eligible_markets": len(market_map), "active_consensus_signals": len(signals),
        "entry_candidates": len(candidates), "leaders": metadata,
        "method": "multi-window persistence + current holding consensus + recent net-buy confirmation + anti-chase",
        "survivorship_warning": "Leaderboard rank is not proof of future edge; all execution remains paper-only.",
    }
    state["ticks"] = int(state.get("ticks", 0)) + 1
    state["last_tick_at"], state["last_error"] = now, None
    state["closed_positions"] = state.get("closed_positions", [])[-500:]
    state["audit"] = state.get("audit", [])[-2000:]
    return state


def validate_state(state: dict[str, Any]) -> None:
    assert state.get("real_orders_enabled") is False
    assert state.get("paper_only") is True
    assert _as_float(state.get("starting_equity")) == STARTING_EQUITY
    assert _as_float(state.get("target_equity")) == TARGET_EQUITY
    assert _as_float(state.get("bankrupt_equity")) == BANKRUPT_EQUITY
    assert _as_float(state.get("cash")) >= -1e-6
    assert _as_float(state.get("equity")) >= -1e-6
    if lc.as_int(state.get("strategy_version")) == STRATEGY_VERSION:
        assert state.get("strategy") == STRATEGY_NAME
        assert len(state.get("open_positions", [])) <= MAX_OPEN_POSITIONS
        assert all(position.get("paper") is True for position in state.get("open_positions", []))
    if state.get("status") == "stopped_target":
        assert not state.get("open_positions")
        assert _as_float(state.get("equity")) >= TARGET_EQUITY - 2
    if state.get("status") == "stopped_broke":
        assert not state.get("open_positions")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", default=str(Path(__file__).with_name("paper_state.json")))
    parser.add_argument("--reset", action="store_true", help="Replace state with a fresh $1000 paper session")
    args = parser.parse_args(argv)
    path = Path(args.state)
    state = fresh_state() if args.reset else load_state(path)
    try:
        state = tick(state)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, RuntimeError) as exc:
        state["last_tick_at"] = utc_now()
        state["last_error"] = f"{type(exc).__name__}: {exc}"
        state.setdefault("audit", []).append(
            {"ts": state["last_tick_at"], "event": "TICK_ERROR", "error": state["last_error"]}
        )
    validate_state(state)
    save_state(path, state)
    snapshot = state.get("research_snapshot") or {}
    print(
        json.dumps(
            {
                "status": state.get("status"), "strategy": state.get("strategy"),
                "equity": state.get("equity"), "cash": state.get("cash"),
                "open_positions": len(state.get("open_positions", [])),
                "closed_positions": len(state.get("closed_positions", [])), "ticks": state.get("ticks"),
                "research_ready": snapshot.get("ready"), "entry_candidates": snapshot.get("entry_candidates"),
                "last_error": state.get("last_error"), "paper_only": state.get("paper_only"),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

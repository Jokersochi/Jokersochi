#!/usr/bin/env python3
"""PolyShark autonomous paper trader.

Hard guarantees:
- No authenticated trading endpoints are imported or called.
- No private keys/API trading credentials are read.
- Quotes/history come from Polymarket public Gamma/CLOB endpoints.
- Session stops after net liquidation equity reaches TARGET_EQUITY or zero.

The strategy is intentionally simple and auditable: liquid two-outcome markets,
trend confirmation over real public price history, spread filter, capped sizing,
and deterministic take-profit / stop-loss / max-hold exits.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

GAMMA_MARKETS = "https://gamma-api.polymarket.com/markets"
CLOB_BASE = "https://clob.polymarket.com"
USER_AGENT = "PolyShark-Paper/2.0 (+https://github.com/Jokersochi/Jokersochi)"

STARTING_EQUITY = float(os.getenv("PAPER_STARTING_EQUITY", "1000"))
TARGET_EQUITY = float(os.getenv("PAPER_TARGET_EQUITY", "2000"))
BANKRUPT_EQUITY = float(os.getenv("PAPER_BANKRUPT_EQUITY", "0"))
MAX_POSITION_PCT = float(os.getenv("PAPER_MAX_POSITION_PCT", "0.05"))
MAX_OPEN_POSITIONS = int(os.getenv("PAPER_MAX_OPEN_POSITIONS", "8"))
MIN_LIQUIDITY = float(os.getenv("PAPER_MIN_LIQUIDITY", "25000"))
MIN_VOLUME_24H = float(os.getenv("PAPER_MIN_VOLUME_24H", "10000"))
MIN_PRICE = float(os.getenv("PAPER_MIN_PRICE", "0.15"))
MAX_PRICE = float(os.getenv("PAPER_MAX_PRICE", "0.85"))
MAX_SPREAD = float(os.getenv("PAPER_MAX_SPREAD", "0.035"))
MIN_MOMENTUM_24H = float(os.getenv("PAPER_MIN_MOMENTUM_24H", "0.025"))
MIN_MOMENTUM_6H = float(os.getenv("PAPER_MIN_MOMENTUM_6H", "0.010"))
TAKE_PROFIT_RETURN = float(os.getenv("PAPER_TAKE_PROFIT_RETURN", "0.15"))
STOP_LOSS_RETURN = float(os.getenv("PAPER_STOP_LOSS_RETURN", "-0.10"))
MAX_HOLD_HOURS = float(os.getenv("PAPER_MAX_HOLD_HOURS", "72"))
MAX_NEW_POSITIONS_PER_TICK = int(os.getenv("PAPER_MAX_NEW_POSITIONS_PER_TICK", "2"))
MARKET_SCAN_LIMIT = int(os.getenv("PAPER_MARKET_SCAN_LIMIT", "60"))
HISTORY_CANDIDATE_LIMIT = int(os.getenv("PAPER_HISTORY_CANDIDATE_LIMIT", "20"))
REQUEST_TIMEOUT = float(os.getenv("PAPER_REQUEST_TIMEOUT", "15"))

FEE_RATE_BY_CATEGORY = {
    "crypto": 0.07,
    "sports": 0.03,
    "finance": 0.04,
    "politics": 0.04,
    "economics": 0.05,
    "culture": 0.05,
    "weather": 0.05,
    "mentions": 0.04,
    "tech": 0.04,
    "geopolitics": 0.0,
}
DEFAULT_FEE_RATE = 0.05


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_ts(value: str) -> float:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def _request_json(url: str, *, method: str = "GET", body: Any | None = None) -> Any:
    data = None
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body, separators=(",", ":")).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
        return json.load(resp)


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
            out = json.loads(value)
            return out if isinstance(out, list) else []
        except json.JSONDecodeError:
            return []
    return []


def market_fee_rate(category: str | None) -> float:
    key = (category or "").strip().lower()
    if "geopolit" in key or "world" in key:
        return 0.0
    for prefix, rate in FEE_RATE_BY_CATEGORY.items():
        if prefix in key:
            return rate
    return DEFAULT_FEE_RATE


def taker_fee(shares: float, price: float, fee_rate: float) -> float:
    """Polymarket V2 fee curve, USDC; rounded to platform precision."""
    if shares <= 0 or not 0 < price < 1 or fee_rate <= 0:
        return 0.0
    fee = shares * fee_rate * price * (1.0 - price)
    return round(fee, 5)


@dataclass(frozen=True)
class Candidate:
    market_id: str
    question: str
    category: str
    yes_token: str
    no_token: str
    yes_price: float
    yes_spread: float
    liquidity: float
    volume_24h: float
    momentum_24h: float
    momentum_6h: float
    end_date: str | None

    @property
    def outcome(self) -> str:
        return "YES" if self.momentum_24h > 0 else "NO"

    @property
    def token_id(self) -> str:
        return self.yes_token if self.outcome == "YES" else self.no_token

    @property
    def token_mid(self) -> float:
        return self.yes_price if self.outcome == "YES" else 1.0 - self.yes_price

    @property
    def score(self) -> float:
        trend = abs(self.momentum_24h) + 0.5 * abs(self.momentum_6h)
        liquidity_bonus = min(0.05, math.log10(max(self.liquidity, 1.0)) / 100.0)
        spread_penalty = self.yes_spread * 0.5
        return trend + liquidity_bonus - spread_penalty


def fetch_markets() -> list[dict[str, Any]]:
    params = urllib.parse.urlencode(
        {"limit": MARKET_SCAN_LIMIT, "closed": "false", "order": "volume24hr", "ascending": "false"}
    )
    data = _request_json(f"{GAMMA_MARKETS}?{params}")
    return data if isinstance(data, list) else []


def eligible_markets(markets: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    now = time.time()
    for m in markets:
        if not bool(m.get("active", True)) or bool(m.get("closed", False)):
            continue
        if m.get("enableOrderBook") is False:
            continue
        outcomes = [str(x).upper() for x in _as_json_list(m.get("outcomes"))]
        tokens = [str(x) for x in _as_json_list(m.get("clobTokenIds"))]
        if len(outcomes) != 2 or len(tokens) != 2 or set(outcomes) != {"YES", "NO"}:
            continue
        liq = max(_as_float(m.get("liquidityNum")), _as_float(m.get("liquidity")))
        vol24 = _as_float(m.get("volume24hr"))
        if liq < MIN_LIQUIDITY or vol24 < MIN_VOLUME_24H:
            continue
        end_date = m.get("endDateIso") or m.get("endDate")
        if end_date:
            try:
                seconds_left = parse_ts(str(end_date)) - now
                if seconds_left <= 0 or seconds_left > 120 * 86400:
                    continue
            except Exception:
                pass
        idx_yes = outcomes.index("YES")
        idx_no = outcomes.index("NO")
        row = dict(m)
        row["_yes_token"] = tokens[idx_yes]
        row["_no_token"] = tokens[idx_no]
        row["_liquidity"] = liq
        row["_volume24"] = vol24
        out.append(row)
    return out


def batch_midpoints(token_ids: list[str]) -> dict[str, float]:
    if not token_ids:
        return {}
    data = _request_json(f"{CLOB_BASE}/midpoints", method="POST", body=[{"token_id": tid} for tid in token_ids])
    return {str(k): _as_float(v, -1.0) for k, v in (data or {}).items()}


def batch_spreads(token_ids: list[str]) -> dict[str, float]:
    if not token_ids:
        return {}
    data = _request_json(f"{CLOB_BASE}/spreads", method="POST", body=[{"token_id": tid} for tid in token_ids])
    return {str(k): _as_float(v, 1.0) for k, v in (data or {}).items()}


def batch_history(token_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
    if not token_ids:
        return {}
    out: dict[str, list[dict[str, Any]]] = {}
    now = int(time.time())
    for start in range(0, len(token_ids), 20):
        chunk = token_ids[start : start + 20]
        body = {"markets": chunk, "start_ts": now - 26 * 3600, "end_ts": now, "interval": "1d", "fidelity": 60}
        data = _request_json(f"{CLOB_BASE}/batch-prices-history", method="POST", body=body)
        history = (data or {}).get("history", {}) if isinstance(data, dict) else {}
        if isinstance(history, dict):
            for tid, points in history.items():
                if isinstance(points, list):
                    out[str(tid)] = points
    return out


def momentum(points: list[dict[str, Any]], current: float) -> tuple[float, float] | None:
    clean = sorted(
        ((int(_as_float(p.get("t"))), _as_float(p.get("p"), -1.0)) for p in points), key=lambda x: x[0]
    )
    clean = [(t, p) for t, p in clean if t > 0 and 0 < p < 1]
    if not clean or not 0 < current < 1:
        return None
    now = int(time.time())

    def nearest_before(target: int) -> float | None:
        eligible = [(t, p) for t, p in clean if t <= target]
        if eligible:
            return eligible[-1][1]
        t, p = clean[0]
        return p if t - target <= 3 * 3600 else None

    p24 = nearest_before(now - 24 * 3600)
    p6 = nearest_before(now - 6 * 3600)
    if p24 is None or p6 is None:
        return None
    return current - p24, current - p6


def build_candidates(markets: list[dict[str, Any]]) -> tuple[list[Candidate], dict[str, float], dict[str, float]]:
    eligible = eligible_markets(markets)[:HISTORY_CANDIDATE_LIMIT]
    yes_tokens = [str(m["_yes_token"]) for m in eligible]
    all_tokens = [str(m["_yes_token"]) for m in eligible] + [str(m["_no_token"]) for m in eligible]
    mids = batch_midpoints(all_tokens)
    spreads = batch_spreads(all_tokens)
    histories = batch_history(yes_tokens)
    candidates: list[Candidate] = []
    for m in eligible:
        yes_token = str(m["_yes_token"])
        no_token = str(m["_no_token"])
        yes_mid = mids.get(yes_token, -1.0)
        no_mid = mids.get(no_token, -1.0)
        yes_spread = spreads.get(yes_token, 1.0)
        no_spread = spreads.get(no_token, 1.0)
        if not (0 < yes_mid < 1 and 0 < no_mid < 1):
            continue
        if abs((yes_mid + no_mid) - 1.0) > 0.08:
            continue
        mom = momentum(histories.get(yes_token, []), yes_mid)
        if mom is None:
            continue
        mom24, mom6 = mom
        if abs(mom24) < MIN_MOMENTUM_24H or abs(mom6) < MIN_MOMENTUM_6H or mom24 * mom6 <= 0:
            continue
        outcome = "YES" if mom24 > 0 else "NO"
        token_mid = yes_mid if outcome == "YES" else no_mid
        token_spread = yes_spread if outcome == "YES" else no_spread
        if not (MIN_PRICE <= token_mid <= MAX_PRICE) or token_spread <= 0 or token_spread > MAX_SPREAD:
            continue
        candidates.append(Candidate(
            market_id=str(m.get("id") or m.get("conditionId") or yes_token),
            question=str(m.get("question") or "Unknown market"),
            category=str(m.get("category") or "Other"),
            yes_token=yes_token,
            no_token=no_token,
            yes_price=yes_mid,
            yes_spread=yes_spread,
            liquidity=float(m["_liquidity"]),
            volume_24h=float(m["_volume24"]),
            momentum_24h=mom24,
            momentum_6h=mom6,
            end_date=str(m.get("endDateIso") or m.get("endDate") or "") or None,
        ))
    candidates.sort(key=lambda c: c.score, reverse=True)
    return candidates, mids, spreads


def fresh_state() -> dict[str, Any]:
    now = utc_now()
    return {
        "schema_version": 2,
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
        "quote_source": "Polymarket Gamma + public CLOB midpoint/spread/history",
        "real_orders_enabled": False,
        "paper_only": True,
        "strategy": "liquid-market dual-horizon momentum v2",
        "open_positions": [],
        "closed_positions": [],
        "audit": [{"ts": now, "event": "SESSION_RESET", "starting_equity": round(STARTING_EQUITY, 2), "target_equity": round(TARGET_EQUITY, 2), "bankrupt_equity": round(BANKRUPT_EQUITY, 2), "paper_only": True}],
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
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def position_liquidation(position: dict[str, Any], mid: float, spread: float) -> tuple[float, float, float]:
    shares = _as_float(position.get("shares"))
    fee_rate = _as_float(position.get("fee_rate"), DEFAULT_FEE_RATE)
    exit_price = max(0.001, min(0.999, mid - max(0.0, spread) / 2.0))
    gross = shares * exit_price
    fee = taker_fee(shares, exit_price, fee_rate)
    return max(0.0, gross - fee), exit_price, fee


def get_quote(token_id: str) -> tuple[float, float] | None:
    mids = batch_midpoints([token_id])
    spreads = batch_spreads([token_id])
    mid = mids.get(token_id, -1.0)
    spread = spreads.get(token_id, 1.0)
    if not (0 < mid < 1 and 0 <= spread < 1):
        return None
    return mid, spread


def close_position(state: dict[str, Any], position: dict[str, Any], *, mid: float, spread: float, reason: str, now: str) -> None:
    net, exit_price, exit_fee = position_liquidation(position, mid, spread)
    cash_outlay = _as_float(position.get("cash_outlay"))
    pnl = net - cash_outlay
    state["cash"] = round(_as_float(state.get("cash")) + net, 6)
    state["fees_paid"] = round(_as_float(state.get("fees_paid")) + exit_fee, 6)
    state["realized_pnl"] = round(_as_float(state.get("realized_pnl")) + pnl, 6)
    closed = dict(position)
    closed.update({"closed_at": now, "exit_price": round(exit_price, 6), "exit_fee": round(exit_fee, 6), "net_proceeds": round(net, 6), "pnl": round(pnl, 6), "return_pct": round((pnl / cash_outlay * 100.0) if cash_outlay > 0 else 0.0, 4), "close_reason": reason})
    state.setdefault("closed_positions", []).append(closed)
    state.setdefault("audit", []).append({"ts": now, "event": "PAPER_CLOSE", "market_id": position.get("market_id"), "outcome": position.get("outcome"), "exit_price": round(exit_price, 6), "pnl": round(pnl, 6), "reason": reason})


def mark_and_exit_positions(state: dict[str, Any], mids: dict[str, float], spreads: dict[str, float], now: str) -> None:
    remaining: list[dict[str, Any]] = []
    for position in state.get("open_positions", []):
        token_id = str(position.get("token_id"))
        mid = mids.get(token_id)
        spread = spreads.get(token_id)
        if mid is None or spread is None or not (0 < mid < 1):
            quote = get_quote(token_id)
            if quote is None:
                remaining.append(position)
                continue
            mid, spread = quote
        cash_outlay = _as_float(position.get("cash_outlay"))
        net, _, _ = position_liquidation(position, mid, spread)
        ret = (net - cash_outlay) / cash_outlay if cash_outlay > 0 else 0.0
        held_hours = (parse_ts(now) - parse_ts(str(position["opened_at"]))) / 3600.0
        reason = "take_profit" if ret >= TAKE_PROFIT_RETURN else "stop_loss" if ret <= STOP_LOSS_RETURN else "max_hold" if held_hours >= MAX_HOLD_HOURS else None
        if reason:
            close_position(state, position, mid=mid, spread=spread, reason=reason, now=now)
        else:
            position["mark_price"] = round(mid, 6)
            position["mark_spread"] = round(spread, 6)
            position["mark_net_liquidation"] = round(net, 6)
            remaining.append(position)
    state["open_positions"] = remaining


def open_candidate(state: dict[str, Any], c: Candidate, mids: dict[str, float], spreads: dict[str, float], now: str) -> bool:
    token_id = c.token_id
    mid = mids.get(token_id, c.token_mid)
    spread = spreads.get(token_id, c.yes_spread)
    if not (0 < mid < 1) or not (0 <= spread <= MAX_SPREAD):
        return False
    entry_price = min(0.999, mid + spread / 2.0)
    current_equity = _as_float(state.get("equity"), _as_float(state.get("cash")))
    available = _as_float(state.get("cash"))
    cash_outlay = min(max(0.0, current_equity * MAX_POSITION_PCT), available)
    if cash_outlay < 5.0:
        return False
    fee_rate = market_fee_rate(c.category)
    gross_trade = cash_outlay / (1.0 + fee_rate * (1.0 - entry_price)) if fee_rate > 0 else cash_outlay
    shares = gross_trade / entry_price
    entry_fee = taker_fee(shares, entry_price, fee_rate)
    actual_outlay = gross_trade + entry_fee
    if actual_outlay > available + 1e-9:
        return False
    state["cash"] = round(available - actual_outlay, 6)
    state["fees_paid"] = round(_as_float(state.get("fees_paid")) + entry_fee, 6)
    position = {"position_id": f"{c.market_id}-{c.outcome}-{int(time.time())}", "market_id": c.market_id, "question": c.question, "category": c.category, "outcome": c.outcome, "token_id": token_id, "opened_at": now, "entry_mid": round(mid, 6), "entry_spread": round(spread, 6), "entry_price": round(entry_price, 6), "shares": round(shares, 8), "gross_trade": round(gross_trade, 6), "entry_fee": round(entry_fee, 6), "cash_outlay": round(actual_outlay, 6), "fee_rate": fee_rate, "momentum_24h": round(c.momentum_24h, 6), "momentum_6h": round(c.momentum_6h, 6), "liquidity": round(c.liquidity, 2), "volume_24h": round(c.volume_24h, 2), "end_date": c.end_date, "paper": True}
    state.setdefault("open_positions", []).append(position)
    state.setdefault("audit", []).append({"ts": now, "event": "PAPER_OPEN", "market_id": c.market_id, "question": c.question, "outcome": c.outcome, "entry_price": round(entry_price, 6), "cash_outlay": round(actual_outlay, 6), "momentum_24h": round(c.momentum_24h, 6), "momentum_6h": round(c.momentum_6h, 6)})
    return True


def recalc_equity(state: dict[str, Any], mids: dict[str, float], spreads: dict[str, float]) -> float:
    cash = _as_float(state.get("cash"))
    liquidation = 0.0
    basis = 0.0
    for p in state.get("open_positions", []):
        token_id = str(p.get("token_id"))
        mid = mids.get(token_id, _as_float(p.get("mark_price"), -1.0))
        spread = spreads.get(token_id, _as_float(p.get("mark_spread"), 0.0))
        net = position_liquidation(p, mid, spread)[0] if 0 < mid < 1 else 0.0
        p["mark_price"] = round(mid, 6) if 0 < mid < 1 else None
        p["mark_spread"] = round(spread, 6) if spread >= 0 else None
        p["mark_net_liquidation"] = round(net, 6)
        liquidation += net
        basis += _as_float(p.get("cash_outlay"))
    equity = max(0.0, cash + liquidation)
    state["equity"] = round(equity, 6)
    state["unrealized_pnl"] = round(liquidation - basis, 6)
    return equity


def stop_session(state: dict[str, Any], reason: str, now: str, mids: dict[str, float], spreads: dict[str, float]) -> None:
    remaining = list(state.get("open_positions", []))
    state["open_positions"] = []
    for p in remaining:
        tid = str(p.get("token_id"))
        mid = mids.get(tid, _as_float(p.get("mark_price"), 0.0))
        spread = spreads.get(tid, _as_float(p.get("mark_spread"), 0.0))
        if not 0 < mid < 1:
            state["open_positions"].append(p)
            continue
        close_position(state, p, mid=mid, spread=spread, reason=reason, now=now)
    if state.get("open_positions"):
        return
    final_equity = max(0.0, _as_float(state.get("cash")))
    state["equity"] = round(final_equity, 6)
    state["unrealized_pnl"] = 0.0
    state["status"] = "stopped_target" if reason == "target_reached" else "stopped_broke"
    state["stopped_at"] = now
    state["stop_reason"] = reason
    state.setdefault("audit", []).append({"ts": now, "event": "SESSION_STOP", "reason": reason, "final_equity": round(final_equity, 6), "net_pnl": round(final_equity - _as_float(state.get("starting_equity")), 6)})


def tick(state: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    if state.get("status") not in ("running", None):
        state["last_tick_at"] = now
        state["last_error"] = None
        return state
    if state.get("real_orders_enabled") is not False or state.get("paper_only") is not True:
        raise RuntimeError("Paper-only invariant failed")
    markets = fetch_markets()
    candidates, mids, spreads = build_candidates(markets)
    open_tokens = [str(p.get("token_id")) for p in state.get("open_positions", [])]
    missing = [tid for tid in open_tokens if tid and tid not in mids]
    if missing:
        mids.update(batch_midpoints(missing))
        spreads.update(batch_spreads(missing))
    mark_and_exit_positions(state, mids, spreads, now)
    equity = recalc_equity(state, mids, spreads)
    if equity >= _as_float(state.get("target_equity"), TARGET_EQUITY):
        stop_session(state, "target_reached", now, mids, spreads)
    elif equity <= _as_float(state.get("bankrupt_equity"), BANKRUPT_EQUITY) + 1e-9:
        stop_session(state, "bankrupt", now, mids, spreads)
    else:
        existing_markets = {str(p.get("market_id")) for p in state.get("open_positions", [])}
        capacity = max(0, MAX_OPEN_POSITIONS - len(state.get("open_positions", [])))
        opened = 0
        for c in candidates:
            if capacity <= 0 or opened >= MAX_NEW_POSITIONS_PER_TICK:
                break
            if c.market_id in existing_markets:
                continue
            if open_candidate(state, c, mids, spreads, now):
                existing_markets.add(c.market_id)
                capacity -= 1
                opened += 1
        recalc_equity(state, mids, spreads)
    state["ticks"] = int(state.get("ticks", 0)) + 1
    state["last_tick_at"] = now
    state["last_error"] = None
    if len(state.get("closed_positions", [])) > 500:
        state["closed_positions"] = state["closed_positions"][-500:]
    if len(state.get("audit", [])) > 2000:
        state["audit"] = state["audit"][-2000:]
    return state


def validate_state(state: dict[str, Any]) -> None:
    assert state.get("real_orders_enabled") is False
    assert state.get("paper_only") is True
    assert _as_float(state.get("starting_equity")) == STARTING_EQUITY
    assert _as_float(state.get("target_equity")) == TARGET_EQUITY
    assert _as_float(state.get("bankrupt_equity")) == BANKRUPT_EQUITY
    assert _as_float(state.get("cash")) >= -1e-6
    assert _as_float(state.get("equity")) >= -1e-6
    if state.get("status") == "stopped_target":
        assert not state.get("open_positions")
        assert _as_float(state.get("equity")) >= TARGET_EQUITY - 2.0
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
        state.setdefault("audit", []).append({"ts": state["last_tick_at"], "event": "TICK_ERROR", "error": state["last_error"]})
    validate_state(state)
    save_state(path, state)
    print(json.dumps({"status": state.get("status"), "equity": state.get("equity"), "cash": state.get("cash"), "open_positions": len(state.get("open_positions", [])), "closed_positions": len(state.get("closed_positions", [])), "ticks": state.get("ticks"), "last_error": state.get("last_error"), "paper_only": state.get("paper_only")}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

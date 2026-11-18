#!/usr/bin/env python3
"""Independent, read-only PAPER cash/position reconciliation.

Reconstructs cash flows, FIFO cost basis and remaining shares from virtual fills.
Never fetches market data, sends orders, or modifies the supplied ledger.
This validates bookkeeping, NOT prices, execution realism or trading edge.
"""
from __future__ import annotations

import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

START_CASH = 1000.0
CASH_TOL = 0.00002
SHARE_TOL = 0.000001


class AuditError(ValueError):
    """Fail-closed when a virtual ledger cannot be independently reconciled."""


def _amount(value, label, *, nonnegative=False):
    if isinstance(value, bool):
        raise AuditError(f"{label}: boolean is not numeric")
    try:
        result = float(value)
    except (ValueError, TypeError, OverflowError) as exc:
        raise AuditError(f"{label}: invalid numeric value") from exc
    if not math.isfinite(result) or (nonnegative and result < 0):
        raise AuditError(f"{label}: nonfinite or negative amount")
    return result


def audit_state(state, *, starting_cash=START_CASH):
    """Return a deterministic audit or raise; does not trust cached P&L fields."""
    if state.get("paper_only") is not True or state.get("real_orders_enabled") is not False:
        raise AuditError("PAPER-only state invariant failed")
    if state.get("capital_decision", "NO_TRADE") != "NO_TRADE":
        raise AuditError("capital_decision must remain NO_TRADE")
    starting_cash = _amount(starting_cash, "starting_cash", nonnegative=True)
    cash = _amount(state.get("cash"), "cash", nonnegative=True)
    equity = _amount(state.get("equity"), "equity", nonnegative=True)
    trades = state.get("trades", [])
    positions = state.get("positions", {})
    if not isinstance(trades, list) or not isinstance(positions, dict):
        raise AuditError("trades must be a list; positions must be a mapping")

    lots = defaultdict(list)
    expected_cash = starting_cash
    realized_pnl = 0.0
    fees = 0.0
    slippage = 0.0
    prev_trade_at = None

    for index, trade in enumerate(trades):
        if not isinstance(trade, dict):
            raise AuditError(f"trade[{index}]: malformed record")
        market = trade.get("market_id")
        side = trade.get("side")
        if not isinstance(market, str) or not market or side not in ("BUY", "SELL"):
            raise AuditError(f"trade[{index}]: invalid market/side")
        shares = _amount(trade.get("shares"), f"trade[{index}].shares", nonnegative=True)
        price = _amount(trade.get("price"), f"trade[{index}].price")
        flow = _amount(trade.get("cash_flow"), f"trade[{index}].cash_flow")
        if shares <= SHARE_TOL or not 0 < price < 1:
            raise AuditError(f"trade[{index}]: impossible quantity/price")
        if trade.get("at") is None:
            raise AuditError(f"trade[{index}]: missing timestamp")
        at = str(trade["at"])
        if prev_trade_at is not None and at < prev_trade_at:
            raise AuditError(f"trade[{index}]: chronological order violated")
        prev_trade_at = at
        fee = _amount(trade.get("fee", 0), f"trade[{index}].fee", nonnegative=True)
        slip = _amount(trade.get("slippage_reserve", 0),
                       f"trade[{index}].slippage", nonnegative=True)
        # The current orderbook_ladder_v1 records explicit fee+slippage,
        # while older ledger events omit them. Never reconstruct absent fees.
        if trade.get("execution_model") == "orderbook_ladder_v1":
            expected_flow = (-shares * price - fee - slip if side == "BUY"
                             else shares * price - fee - slip)
            if abs(expected_flow - flow) > CASH_TOL:
                raise AuditError(f"trade[{index}]: fill cost does not equal cash flow")
        if (side == "BUY" and flow >= 0) or (side == "SELL" and flow <= 0):
            raise AuditError(f"trade[{index}]: cash flow has wrong sign")

        expected_cash += flow
        fees += fee
        slippage += slip
        if side == "BUY":
            lots[market].append([shares, -flow / shares])
        else:
            qty_left = shares
            allocated_cost = 0.0
            queue = lots[market]
            while qty_left > SHARE_TOL and queue:
                available, unit_cost = queue[0]
                used = min(available, qty_left)
                allocated_cost += used * unit_cost
                qty_left -= used
                queue[0][0] = available - used
                if queue[0][0] <= SHARE_TOL:
                    queue.pop(0)
            if qty_left > SHARE_TOL:
                raise AuditError(f"trade[{index}]: virtual short sale or missing BUY")
            realized_pnl += flow - allocated_cost

    if abs(expected_cash - cash) > CASH_TOL:
        raise AuditError(f"cash ledger mismatch: expected={expected_cash:.6f}, stored={cash:.6f}")
    open_cost = 0.0
    for market in set(lots) | set(positions):
        expected_shares = sum(qty for qty, _ in lots[market])
        actual_shares = 0.0
        if market in positions:
            position = positions[market]
            if not isinstance(position, dict):
                raise AuditError(f"position[{market}]: malformed record")
            actual_shares = _amount(position.get("shares"),
                                    f"position[{market}].shares", nonnegative=True)
            mark = _amount(position.get("last_liquidation_value", 0),
                           f"position[{market}].last_liquidation_value", nonnegative=True)
            if mark > actual_shares + CASH_TOL:
                raise AuditError(f"position[{market}]: liquidation value exceeds max binary payoff")
        if abs(expected_shares - actual_shares) > SHARE_TOL:
            raise AuditError(f"position[{market}]: quantity mismatch")
        open_cost += sum(qty * unit_cost for qty, unit_cost in lots[market])

    mark_value = sum(_amount(p.get("last_liquidation_value", 0),
                             "liquidation mark", nonnegative=True)
                     for p in positions.values())
    expected_equity = expected_cash + mark_value
    if abs(expected_equity - equity) > CASH_TOL:
        raise AuditError("equity != cash + available-depth liquidation marks")
    unrealized_pnl = mark_value - open_cost
    if abs((realized_pnl + unrealized_pnl) - (equity - starting_cash)) > CASH_TOL:
        raise AuditError("P&L decomposition does not reconcile to total equity")
    return {
        "status": "PASS", "paper_only": True, "capital_decision": "NO_TRADE",
        "virtual_fills": len(trades), "open_positions": len(positions),
        "cash": round(cash, 6), "equity": round(equity, 6),
        "realized_pnl_fifo": round(realized_pnl, 6),
        "unrealized_pnl_conservative": round(unrealized_pnl, 6),
        "open_cost_basis": round(open_cost, 6),
        "explicit_fees_logged": round(fees, 6),
        "explicit_slippage_logged": round(slippage, 6),
        "unpriced_positions": sum(
            p.get("last_liquidation_value", 0) == 0 for p in positions.values()
        ),
        "limitations": "No independent proof of quote availability, fee schedule, settlement, or trading profitability",
    }


def main():
    parser = argparse.ArgumentParser(description="Read-only PAPER ledger auditor")
    parser.add_argument("--state", type=Path, required=True)
    args = parser.parse_args()
    state = json.loads(args.state.read_text(encoding="utf-8"))
    result = audit_state(state)
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

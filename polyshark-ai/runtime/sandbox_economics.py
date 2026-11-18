#!/usr/bin/env python3
"""Read-only PAPER economics: historical fee evidence, locked capital, settlement.

Evidence JSON is *user-supplied*, not independently authenticated. Never infer
market-specific fees from a category, use future data, redeem tokens, or change
PAPER state. Missing evidence explicitly remains UNKNOWN / NO_TRADE.
"""
from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from urllib.parse import urlparse

from sandbox_audit import audit_state, AuditError

OFFICIAL_HOSTS = frozenset({
    "gamma-api.polymarket.com", "clob.polymarket.com",
    "docs.polymarket.com", "help.polymarket.com",
})
FEE_INCREMENT = Decimal("0.00001")
RATES = ("0", "0.05", "0.15")
SHARE_TOL = Decimal("0.000001")


def dec(value, label, *, minimum=None, maximum=None):
    if isinstance(value, bool):
        raise ValueError(f"{label}: boolean is invalid")
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise ValueError(f"{label}: invalid amount") from exc
    if not result.is_finite():
        raise ValueError(f"{label}: non-finite amount")
    if minimum is not None and result < Decimal(str(minimum)):
        raise ValueError(f"{label}: value below minimum")
    if maximum is not None and result > Decimal(str(maximum)):
        raise ValueError(f"{label}: value above maximum")
    return result


def instant(value, label):
    if not isinstance(value, str) or not value:
        raise ValueError(f"{label}: timezone-aware timestamp is required")
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{label}: invalid ISO timestamp") from exc
    if dt.tzinfo is None or dt.utcoffset() is None:
        raise ValueError(f"{label}: naive timestamp is forbidden")
    return dt.astimezone(timezone.utc)


def official_reference(url):
    if not isinstance(url, str):
        return False
    parsed = urlparse(url)
    return parsed.scheme == "https" and parsed.hostname in OFFICIAL_HOSTS and not parsed.username


def select_fee_record(records, market, when):
    """Validate an exact-market, contemporaneously observed fee record.

    A match shows provenance *claimed in the manifest*, not that the remote
    source was independently verified or that an actual taker fee was charged.
    """
    matching = []
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("Fee record is not a JSON object")
        if record.get("market_id") != market:
            continue
        if record.get("platform") != "polymarket_international":
            raise ValueError(f"{market}: wrong platform fee evidence")
        if not official_reference(record.get("source_url")):
            raise ValueError(f"{market}: source must be an official Polymarket HTTPS URL")
        observed = instant(record.get("observed_at"), f"{market}.observed_at")
        valid_from = instant(record.get("valid_from"), f"{market}.valid_from")
        valid_until = (instant(record["valid_until"], f"{market}.valid_until")
                       if record.get("valid_until") else None)
        if valid_until and valid_from >= valid_until:
            raise ValueError(f"{market}: invalid fee interval")
        if record.get("fees_enabled") not in (True, False):
            raise ValueError(f"{market}: fees_enabled must be boolean")
        enabled = record["fees_enabled"]
        if not isinstance(enabled, bool):
            raise ValueError(f"{market}: fees_enabled must be boolean")
        rate = dec(record.get("coefficient"), "coefficient", minimum=0, maximum=1)
        if not enabled and rate != 0:
            raise ValueError(f"{market}: disabled market cannot claim a charged rate")
        if observed <= when and valid_from <= when and (not valid_until or when < valid_until):
            matching.append((observed, rate, record))
    if not matching:
        return None
    matching.sort(key=lambda value: value[0], reverse=True)
    if len(matching) > 1 and matching[0][0] == matching[1][0]:
        if matching[0][1] != matching[1][1]:
            raise ValueError(f"{market}: conflicting fee evidence at equal timestamps")
    return matching[0][2]


def reconstructed_fee(trade, coefficient):
    """Fee-curve estimate only when every leg is recorded.

    Returns None for old aggregated fills: fee is nonlinear in price and must
    not be reconstructed from the average across an order-book ladder.
    """
    legs = trade.get("fill_legs")
    if not isinstance(legs, list) or not legs:
        return None
    shares_total = Decimal("0")
    fee_total = Decimal("0")
    for idx, leg in enumerate(legs):
        if not isinstance(leg, dict):
            raise ValueError(f"fill_leg[{idx}]: invalid")
        shares = dec(leg.get("shares"), "leg shares", minimum=0)
        price = dec(leg.get("price"), "leg price", minimum=0, maximum=1)
        if not (shares > 0 and 0 < price < 1):
            raise ValueError(f"fill_leg[{idx}]: zero or out-of-bounds")
        shares_total += shares
        # Documentation specifies 5-decimal fee precision. This is per
        # recorded leg as an approximation, not proof of on-chain rounding.
        fee_total += (shares * coefficient * price * (1 - price)).quantize(
            FEE_INCREMENT, rounding=ROUND_HALF_UP)
    if abs(shares_total - dec(trade.get("shares"), "trade shares")) > SHARE_TOL:
        raise ValueError("fill legs do not match aggregate shares")
    return fee_total


def assess_fees(trades, records):
    evaluated = []
    unknown = 0
    model_only = 0
    matched = 0
    for index, trade in enumerate(trades):
        when = instant(trade.get("at"), f"trade[{index}].at")
        record = select_fee_record(records, trade["market_id"], when)
        if record is None:
            status = "NO_CONTEMPORANEOUS_MARKET_FEE_EVIDENCE"
            unknown += 1
            estimate = None
        else:
            estimate = reconstructed_fee(
                trade, dec(record["coefficient"], "coefficient", minimum=0, maximum=1))
            if estimate is None:
                status = "MARKET_SOURCE_CLAIM_PRESENT_BUT_NO_EXECUTION_LEGS"
                model_only += 1
            else:
                logged = trade.get("fee")
                if logged is None:
                    status = "MODEL_ESTIMATE_ONLY_NO_LOGGED_FEE"
                    model_only += 1
                elif abs(estimate - dec(logged, "logged fee", minimum=0)) > FEE_INCREMENT:
                    status = "FEE_MODEL_MISMATCH"
                    model_only += 1
                else:
                    # Even this does NOT verify that Polymarket actually
                    # collected the indicated fee on a real order.
                    status = "SOURCE_CLAIM_AND_MODEL_RECONCILED_NOT_EXECUTION_VERIFIED"
                    matched += 1
        evaluated.append({
            "index": index, "market_id": trade["market_id"], "at": trade["at"],
            "status": status, "estimated_fee": (str(estimate) if estimate is not None else None),
            "source_url": record.get("source_url") if record else None,
        })
    return {"status": "UNVERIFIED", "fills": len(trades),
            "unknown_market_fee_records": unknown,
            "model_only": model_only, "model_reconciled": matched,
            "historically_verified_actual_fees": 0,
            "reason": "Manifest references and fee curves are not actual executed fill receipts",
            "details": evaluated}


def capital_days(trades, open_positions, as_of):
    """FIFO money-days locked, including partial closes and unsold shares."""
    queues = {}
    closed_usd_days = Decimal("0")
    open_usd_days = Decimal("0")
    for i, trade in enumerate(trades):
        at = instant(trade["at"], f"trade[{i}].at")
        if at > as_of:
            raise ValueError("Trade occurs after as-of: look-ahead")
        market = trade["market_id"]
        shares = dec(trade["shares"], "trade shares", minimum=0)
        flow = dec(trade["cash_flow"], "cash_flow")
        q = queues.setdefault(market, [])
        if trade["side"] == "BUY":
            q.append([shares, -flow / shares, at])
        else:
            remaining = shares
            while remaining > SHARE_TOL and q:
                quantity, unit_cost, entered = q[0]
                take = min(quantity, remaining)
                days = dec((at - entered).total_seconds(), "holding seconds", minimum=0) / Decimal(86400)
                closed_usd_days += take * unit_cost * days
                remaining -= take
                q[0][0] = quantity - take
                if q[0][0] <= SHARE_TOL:
                    q.pop(0)
            if remaining > SHARE_TOL:
                raise ValueError("Unmatched SELL in opportunity cost accounting")
    for market, q in queues.items():
        for quantity, unit_cost, entered in q:
            days = dec((as_of - entered).total_seconds(), "open holding seconds", minimum=0) / Decimal(86400)
            open_usd_days += quantity * unit_cost * days
    return closed_usd_days, open_usd_days


def assess_settlement(positions, evidence, as_of):
    assessments = []
    proven = 0
    for market, position in sorted(positions.items()):
        record = evidence.get(market)
        status = "FINALITY_UNVERIFIED"
        recoverable = None
        if record is not None:
            if not isinstance(record, dict):
                raise ValueError(f"{market}: invalid settlement record")
            if record.get("market_id") != market or not official_reference(record.get("source_url")):
                raise ValueError(f"{market}: invalid settlement provenance")
            verified_at = instant(record.get("observed_at"), f"{market}.observed_at")
            final_at = instant(record.get("finalized_at"), f"{market}.finalized_at")
            if final_at > verified_at:
                raise ValueError(f"{market}: finality predates observation requirement")
            if verified_at <= as_of and final_at <= as_of and record.get("status") == "FINAL":
                payout = dec(record.get("payout_per_share"), f"{market}.payout",
                             minimum=0, maximum=1)
                recoverable = dec(position["shares"], "position shares", minimum=0) * payout
                status = "USER_SUPPLIED_FINALITY_NOT_INDEPENDENTLY_AUTHENTICATED"
                proven += 1
        assessments.append({
            "market_id": market,
            "status": status,
            "hypothetical_payout": str(recoverable) if recoverable is not None else None,
            "capital_automatically_redeemed": False,
        })
    return {
        "status": "NO_AUTOMATIC_SETTLEMENT", "open_positions": len(positions),
        "unverified_finality": len(positions) - proven,
        "user_supplied_finality": proven,
        "details": assessments,
    }


def economics_report(state, *, as_of, evidence=None, annual_rates=RATES):
    audit = audit_state(state)
    asof = instant(as_of, "as_of")
    if state.get("last_tick_at") and asof < instant(state["last_tick_at"], "last_tick_at"):
        raise ValueError("As-of predates most recent paper tick")
    evidence = evidence or {}
    if not isinstance(evidence, dict):
        raise ValueError("Evidence must be a JSON object")
    fee_records = evidence.get("fee_records", [])
    settlements = evidence.get("settlements", {})
    if not isinstance(fee_records, list) or not isinstance(settlements, dict):
        raise ValueError("Invalid fee/settlement evidence")
    fees = assess_fees(state["trades"], fee_records)
    settlement = assess_settlement(state["positions"], settlements, asof)
    closed_usd_days, open_usd_days = capital_days(
        state["trades"], state["positions"], asof)
    capital = {}
    for rate in annual_rates:
        annual_rate = dec(rate, "annual_rate", minimum=0, maximum=1)
        cost = (closed_usd_days + open_usd_days) * annual_rate / Decimal(365)
        capital[str(annual_rate)] = {
            "assumed_annual_rate": str(annual_rate),
            "opportunity_cost_usd": round(float(cost), 6),
            "net_equity_after_scenario_cost": round(audit["equity"] - float(cost), 6),
        }
    return {
        "paper_only": True, "capital_decision": "NO_TRADE",
        "economic_verdict": "UNVERIFIED_NO_TRADE", "as_of": asof.isoformat(),
        "ledger_audit_status": audit["status"],
        "cash": audit["cash"], "equity_conservative": audit["equity"],
        "realized_pnl_fifo": audit["realized_pnl_fifo"],
        "open_cost_basis_locked": audit["open_cost_basis"],
        "open_capital_usd_days": round(float(open_usd_days), 6),
        "closed_capital_usd_days": round(float(closed_usd_days), 6),
        "opportunity_cost_scenarios": capital,
        "fee_evidence": fees, "settlement_evidence": settlement,
        "warning": ("Scenarios are hypothetical; market-specific historical fees and "
                    "settlement finality are NOT independently confirmed. "
                    "No order submission or automatic capital release."),
    }


def main():
    parser = argparse.ArgumentParser(description="Read-only PAPER economics & provenance audit")
    parser.add_argument("--state", type=Path, required=True)
    parser.add_argument("--as-of", help="UTC ISO timestamp; defaults to ledger last_tick_at")
    parser.add_argument("--evidence", type=Path, help="Optional user-supplied historical evidence")
    args = parser.parse_args()
    state = json.loads(args.state.read_text(encoding="utf-8"))
    evidence = json.loads(args.evidence.read_text(encoding="utf-8")) if args.evidence else None
    result = economics_report(state, as_of=args.as_of or state.get("last_tick_at"),
                              evidence=evidence)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Isolated experimental paper execution using public Polymarket order books.

No authentication, keys, trading SDK, or order submission. Never touches the
production paper_state.json. This is a research baseline, NOT a proven edge.
"""
import argparse
import json
import math
import os
import tempfile
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

GAMMA = "https://gamma-api.polymarket.com/markets"
CLOB = "https://clob.polymarket.com/book"
UA = "PolyShark-Paper-Sandbox/1.0"
START_CASH = 1000.0
MAX_POSITION_USD = 25.0
MAX_SPREAD = 0.02
# Conservative upper-bound fee category: crypto taker rate (7%). This is not a
# statement that every market is charged 7%; actual fee schedules vary by category.
MAX_TAKER_FEE_RATE = 0.07
SLIPPAGE_RESERVE_PCT = 0.01  # stress assumption on each buy/sell notional
MAX_BOOK_WALK = 0.02  # maximum absolute price deterioration across levels
MIN_ENTRY_COST = 5.0  # reject tiny partially filled entries
MAX_QUOTE_AGE_SECONDS = 60  # refuse stale books; no assumed executable liquidity
MAX_FUTURE_QUOTE_SKEW_SECONDS = 5
DRAWDOWN_STOP_PCT = 10.0  # research-only risk gate; never enables live trading


def taker_fee(shares, price):
    """Per-side Polymarket fee curve, with pessimistic 7% category parameter."""
    return round(shares * MAX_TAKER_FEE_RATE * price * (1 - price), 5)


def buy_unit_cost(ask):
    return ask * (1 + SLIPPAGE_RESERVE_PCT) + taker_fee(1.0, ask)


def liquidation_proceeds(shares, bid):
    return max(0.0, shares * bid * (1 - SLIPPAGE_RESERVE_PCT) - taker_fee(shares, bid))


def get_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=12) as response:
        return json.load(response)


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_list(value):
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            result = json.loads(value)
            return result if isinstance(result, list) else []
        except ValueError:
            return []
    return []


def clean_levels(levels, *, reverse=False):
    """Keep only finite, positive, valid order-book levels, in executable order."""
    cleaned = []
    for price, size in levels:
        price, size = float(price), float(size)
        if math.isfinite(price) and math.isfinite(size) and 0 < price < 1 and size > 0:
            cleaned.append((price, size))
    return sorted(cleaned, key=lambda item: item[0], reverse=reverse)


def orderbook(token):
    data = get_json(CLOB + "?" + urllib.parse.urlencode({"token_id": token}))
    bids = clean_levels(((x["price"], x["size"]) for x in data.get("bids", [])), reverse=True)
    asks = clean_levels(((x["price"], x["size"]) for x in data.get("asks", [])))
    if not bids or not asks:
        return None
    bid, ask = bids[0][0], asks[0][0]
    if bid > ask:
        return None
    bid_depth = sum(size for price, size in bids if price == bid)
    ask_depth = sum(size for price, size in asks if price == ask)
    # Preserve best-price fields and attach the full ladder. Five-field fixtures
    # in earlier offline tests remain supported by step().
    # Polymarket CLOB /book supplies epoch-millisecond timestamp (may be absent).
    # An absent or unparseable timestamp is not proof of a fresh order book.
    return bid, ask, bid_depth, ask_depth, bids, asks, data.get("timestamp")


def simulated_buy(asks, budget):
    """Spend at most budget, walking asks within MAX_BOOK_WALK of the best ask."""
    levels = clean_levels(asks)
    shares = gross = fee = slippage = 0.0
    remaining = max(0.0, float(budget))
    used_levels = 0
    if levels:
        best = levels[0][0]
        for price, available in levels:
            if price > best + MAX_BOOK_WALK + 1e-12:
                break
            unit_fee = MAX_TAKER_FEE_RATE * price * (1 - price)
            unit_cost = price * (1 + SLIPPAGE_RESERVE_PCT) + unit_fee
            quantity = min(available, remaining / unit_cost)
            if quantity <= 1e-10:
                break
            shares += quantity
            gross += quantity * price
            fee += quantity * unit_fee
            slippage += quantity * price * SLIPPAGE_RESERVE_PCT
            remaining = max(0.0, remaining - quantity * unit_cost)
            used_levels += 1
    cost = gross + fee + slippage
    return {"shares": shares, "cost": cost, "gross": gross, "fee": fee,
            "slippage": slippage, "avg_price": gross / shares if shares else 0.0,
            "levels": used_levels}


def simulated_sell(bids, shares_requested):
    """Liquidate available depth only; unsold shares remain open."""
    levels = clean_levels(bids, reverse=True)
    shares = gross = fee = slippage = 0.0
    remaining = max(0.0, float(shares_requested))
    used_levels = 0
    if levels:
        best = levels[0][0]
        for price, available in levels:
            if price < best - MAX_BOOK_WALK - 1e-12:
                break
            quantity = min(available, remaining)
            if quantity <= 1e-10:
                break
            shares += quantity
            gross += quantity * price
            fee += quantity * MAX_TAKER_FEE_RATE * price * (1 - price)
            slippage += quantity * price * SLIPPAGE_RESERVE_PCT
            remaining -= quantity
            used_levels += 1
    return {"shares": shares, "proceeds": max(0.0, gross - fee - slippage),
            "gross": gross, "fee": fee, "slippage": slippage,
            "avg_price": gross / shares if shares else 0.0, "levels": used_levels}


def candidates(limit=12):
    params = urllib.parse.urlencode({"limit": limit, "closed": "false", "order": "volume24hr", "ascending": "false"})
    markets = get_json(GAMMA + "?" + params)
    for market in markets if isinstance(markets, list) else []:
        outcomes = [str(x).upper() for x in parse_list(market.get("outcomes"))]
        tokens = parse_list(market.get("clobTokenIds"))
        if (market.get("closed") or market.get("enableOrderBook") is False
                or len(tokens) != 2 or set(outcomes) != {"YES", "NO"}):
            continue
        yield str(market["id"]), str(tokens[outcomes.index("YES")]), str(market.get("question", ""))


def step(state, quotes, timestamp):
    """Deterministic PAPER snapshot simulator; no real orders or midpoint fills.

    Entry signal is exploratory momentum, not an independently proven edge.
    Legacy five/seven tuples are supported for offline fixtures; public books use
    eight fields including a timestamp. Undated or stale public quotes are rejected.
    Cash and marks are based on available depth with a conservative fee reserve.
    """
    if state.get("paper_only") is not True or state.get("real_orders_enabled") is not False:
        raise ValueError("Unsafe sandbox state: PAPER-only is mandatory")
    tick = datetime.fromisoformat(str(timestamp).replace("Z", "+00:00"))
    if tick.tzinfo is None:
        raise ValueError("Tick timestamp must include timezone")
    old_tick = state.get("last_tick_at")
    if old_tick is not None:
        previous = datetime.fromisoformat(str(old_tick).replace("Z", "+00:00"))
        if previous.tzinfo is None or tick <= previous:
            raise ValueError("Duplicate or backwards PAPER tick rejected")
    state = json.loads(json.dumps(state))
    state.setdefault("observations", {})
    state.setdefault("positions", {})
    state.setdefault("trades", [])
    state["capital_decision"] = "NO_TRADE"
    peak_equity = max(START_CASH, float(state.get("peak_equity", START_CASH)),
                      float(state.get("equity", START_CASH)))
    state["peak_equity"] = peak_equity
    incoming_drawdown_pct = max(0.0, (peak_equity -
                                   float(state.get("equity", START_CASH))) /
                                   peak_equity * 100)
    state["max_drawdown_pct"] = max(float(state.get("max_drawdown_pct", 0)),
                                     incoming_drawdown_pct)
    state["risk_stop"] = bool(state.get("risk_stop", False) or
                              state["max_drawdown_pct"] >= DRAWDOWN_STOP_PCT)
    state["rejected_quote_counts"] = {"undated": 0, "stale": 0, "future": 0,
                                       "invalid_book": 0}

    # Never carry forward a stale or favorable liquidation mark when a quote
    # disappears or fails validity/spread checks.
    for position in state["positions"].values():
        position["last_bid"] = 0.0
        position["last_bid_depth"] = 0.0
        position["last_liquidation_value"] = 0.0

    for market_id, quote in quotes.items():
        book_timestamp = None
        if len(quote) == 5:
            bid, ask, bid_depth, ask_depth, question = quote
            bid_levels, ask_levels = [(bid, bid_depth)], [(ask, ask_depth)]
        elif len(quote) == 7:
            bid, ask, bid_depth, ask_depth, bid_levels, ask_levels, question = quote
        elif len(quote) == 8:
            bid, ask, bid_depth, ask_depth, bid_levels, ask_levels, book_timestamp, question = quote
            if book_timestamp is None or isinstance(book_timestamp, bool):
                state["rejected_quote_counts"]["undated"] += 1
                continue
            try:
                book_epoch_ms = int(book_timestamp)
                quote_age_seconds = tick.timestamp() - book_epoch_ms / 1000
            except (TypeError, ValueError, OverflowError):
                state["rejected_quote_counts"]["undated"] += 1
                continue
            if not math.isfinite(quote_age_seconds):
                state["rejected_quote_counts"]["undated"] += 1
                continue
            if quote_age_seconds > MAX_QUOTE_AGE_SECONDS:
                state["rejected_quote_counts"]["stale"] += 1
                continue
            if quote_age_seconds < -MAX_FUTURE_QUOTE_SKEW_SECONDS:
                state["rejected_quote_counts"]["future"] += 1
                continue
        else:
            state["rejected_quote_counts"]["invalid_book"] += 1
            continue
        bid, ask = float(bid), float(ask)
        bids = clean_levels(bid_levels, reverse=True)
        asks = clean_levels(ask_levels)
        if (not bids or not asks or not (math.isfinite(bid) and math.isfinite(ask))
                or not (0 < bid <= ask < 1) or ask - bid > MAX_SPREAD
                or abs(bids[0][0] - bid) > 1e-9 or abs(asks[0][0] - ask) > 1e-9):
            state["rejected_quote_counts"]["invalid_book"] += 1
            continue
        midpoint = (bid + ask) / 2
        prior = state["observations"].get(market_id)
        pos = state["positions"].get(market_id)
        if pos:
            hours = (datetime.fromisoformat(timestamp) - datetime.fromisoformat(pos["opened_at"])).total_seconds() / 3600
            should_exit = (bid >= pos["entry_ask"] * 1.05
                           or bid <= pos["entry_ask"] * 0.95 or hours >= 24)
            partial_exit = False
            if should_exit:
                fill = simulated_sell(bids, pos["shares"])
                if fill["shares"] > 1e-10:
                    state["cash"] += fill["proceeds"]
                    remaining = max(0.0, pos["shares"] - fill["shares"])
                    state["trades"].append({
                        "market_id": market_id, "side": "SELL", "price": fill["avg_price"],
                        "shares": fill["shares"], "cash_flow": fill["proceeds"],
                        "fee": fill["fee"], "slippage_reserve": fill["slippage"],
                        "filled_levels": fill["levels"], "at": timestamp,
                        "execution_model": "orderbook_ladder_v1",
                    })
                    if remaining <= 1e-9:
                        del state["positions"][market_id]
                        pos = None
                    else:
                        pos["shares"] = remaining
                        partial_exit = True

            if pos is not None:
                pos["last_bid"] = bid
                pos["last_bid_depth"] = sum(size for price, size in bids
                                            if price >= bid - MAX_BOOK_WALK - 1e-12)
                # A partial exit consumes observed depth. Do not count the same
                # snapshot's liquidity twice when marking the unsold remainder.
                if not partial_exit:
                    pos["last_liquidation_value"] = simulated_sell(
                        bids, pos["shares"])["proceeds"]

        elif (not state["risk_stop"] and prior is not None and
              midpoint >= prior * 1.03 and len(state["positions"]) < 4):
            budget = min(MAX_POSITION_USD, state["cash"])
            if budget >= MIN_ENTRY_COST:
                fill = simulated_buy(asks, budget)
                if fill["cost"] >= MIN_ENTRY_COST:
                    state["cash"] = max(0.0, state["cash"] - fill["cost"])
                    state["positions"][market_id] = {
                        "shares": fill["shares"], "entry_ask": fill["avg_price"],
                        "opened_at": timestamp, "question": question,
                        "last_bid": bid,
                        "last_bid_depth": sum(size for price, size in bids
                                              if price >= bid - MAX_BOOK_WALK - 1e-12),
                        "last_liquidation_value": simulated_sell(
                            bids, fill["shares"])["proceeds"],
                    }
                    state["trades"].append({
                        "market_id": market_id, "side": "BUY", "price": fill["avg_price"],
                        "shares": fill["shares"], "cash_flow": -fill["cost"],
                        "fee": fill["fee"], "slippage_reserve": fill["slippage"],
                        "filled_levels": fill["levels"], "at": timestamp,
                        "execution_model": "orderbook_ladder_v1",
                    })
        state["observations"][market_id] = midpoint

    state["equity"] = round(state["cash"] + sum(
        position.get("last_liquidation_value", 0.0)
        for position in state["positions"].values()), 6)
    state["peak_equity"] = max(peak_equity, state["equity"])
    drawdown_pct = max(0.0, (state["peak_equity"] - state["equity"]) /
                       state["peak_equity"] * 100)
    state["max_drawdown_pct"] = max(float(state.get("max_drawdown_pct", 0)), drawdown_pct)
    if state["max_drawdown_pct"] >= DRAWDOWN_STOP_PCT:
        state["risk_stop"] = True
    state["last_tick_at"] = timestamp
    assert state["cash"] >= -1e-7 and math.isfinite(state["equity"])
    assert state["paper_only"] is True and state["real_orders_enabled"] is False
    return state


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", default="polyshark-ai/runtime/sandbox_paper_state.json")
    args = parser.parse_args()
    path = Path(args.state)
    if path.name == "paper_state.json":
        parser.error("Production paper_state.json is forbidden")
    state = json.loads(path.read_text()) if path.exists() else {
        "schema_version": 1, "paper_only": True, "real_orders_enabled": False,
        "cash": START_CASH, "equity": START_CASH, "positions": {}, "trades": [], "observations": {}
    }
    previous_tick_at = state.get("last_tick_at")
    if state.get("paper_only") is not True or state.get("real_orders_enabled") is not False:
        parser.error("Unsafe state")
    quotes = {}
    for market_id, token, question in candidates():
        try:
            book = orderbook(token)
            if book:
                quotes[market_id] = (*book, question)
        except (OSError, ValueError, KeyError):
            continue
    if not quotes:
        raise SystemExit("No valid public order books; state unchanged")
    updated = step(state, quotes, now())
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix=".sandbox-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(updated, stream, ensure_ascii=False, indent=2)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)
    print(json.dumps({"equity": updated["equity"], "cash": updated["cash"],
                      "positions": len(updated["positions"]), "trades": len(updated["trades"]),
                      "quotes": len(quotes), "paper_only": True,
                      "risk_stop": updated.get("risk_stop", False),
                      "peak_equity": updated.get("peak_equity"),
                      "max_drawdown_pct": updated.get("max_drawdown_pct"),
                      "unpriced_positions": sum(
                          p.get("last_liquidation_value", 0.0) == 0.0
                          for p in updated["positions"].values()),
                      "rejected_quote_counts": updated.get("rejected_quote_counts", {}),
                      "previous_tick_at": previous_tick_at,
                      "last_tick_at": updated["last_tick_at"],
                      "virtual_roi_pct": round((updated["equity"] / START_CASH - 1) * 100, 4)}))


if __name__ == "__main__":
    main()

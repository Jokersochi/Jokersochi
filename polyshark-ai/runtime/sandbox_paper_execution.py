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
FEE_BUFFER = 0.02  # conservative assumed round-trip reserve, not exchange fee schedule


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


def orderbook(token):
    data = get_json(CLOB + "?" + urllib.parse.urlencode({"token_id": token}))
    bids = [float(x["price"]) for x in data.get("bids", []) if float(x.get("size", 0)) > 0]
    asks = [float(x["price"]) for x in data.get("asks", []) if float(x.get("size", 0)) > 0]
    if not bids or not asks:
        return None
    bid, ask = max(bids), min(asks)
    if not (0 < bid <= ask < 1):
        return None
    return bid, ask


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
    """Deterministic sandbox: buy after >=3% midpoint rise, exit at +/-5% or 24h.

    Price movement is not evidence of positive expected value.
    All entries pay ask; marks/exits use bid; fixed reserve models extra costs.
    """
    state = json.loads(json.dumps(state))
    state.setdefault("observations", {})
    state.setdefault("positions", {})
    state.setdefault("trades", [])
    for market_id, quote in quotes.items():
        bid, ask, question = quote
        if not (0 < bid <= ask < 1) or ask - bid > MAX_SPREAD:
            continue
        midpoint = (bid + ask) / 2
        prior = state["observations"].get(market_id)
        pos = state["positions"].get(market_id)
        if pos:
            hours = (datetime.fromisoformat(timestamp) - datetime.fromisoformat(pos["opened_at"])).total_seconds() / 3600
            if bid >= pos["entry_ask"] * 1.05 or bid <= pos["entry_ask"] * 0.95 or hours >= 24:
                proceeds = pos["shares"] * bid * (1 - FEE_BUFFER / 2)
                state["cash"] += proceeds
                state["trades"].append({"market_id": market_id, "side": "SELL", "price": bid,
                                        "shares": pos["shares"], "cash_flow": proceeds, "at": timestamp})
                del state["positions"][market_id]
        elif prior is not None and midpoint >= prior * 1.03 and len(state["positions"]) < 4:
            budget = min(MAX_POSITION_USD, state["cash"])
            if budget >= 5:
                shares = budget * (1 - FEE_BUFFER / 2) / ask
                state["cash"] -= budget
                state["positions"][market_id] = {"shares": shares, "entry_ask": ask,
                                                   "opened_at": timestamp, "question": question, "last_bid": bid}
                state["trades"].append({"market_id": market_id, "side": "BUY", "price": ask,
                                        "shares": shares, "cash_flow": -budget, "at": timestamp})
        state["observations"][market_id] = midpoint
        if market_id in state["positions"]:
            state["positions"][market_id]["last_bid"] = bid
    state["equity"] = round(state["cash"] + sum(p["shares"] * p["last_bid"] * (1 - FEE_BUFFER / 2)
                                               for p in state["positions"].values()), 6)
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
                      "quotes": len(quotes), "paper_only": True}))


if __name__ == "__main__":
    main()

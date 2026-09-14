"""Public-data research engine for PolyShark's elite-consensus paper strategy."""
from __future__ import annotations

import json
import math
import os
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Iterable

GAMMA_MARKETS = "https://gamma-api.polymarket.com/markets"
CLOB_BASE = "https://clob.polymarket.com"
DATA_API_BASE = "https://data-api.polymarket.com"
USER_AGENT = "PolyShark-Paper/3.0 (+https://github.com/Jokersochi/Jokersochi)"

MIN_LIQUIDITY = float(os.getenv("PAPER_MIN_LIQUIDITY", "50000"))
MIN_VOLUME_24H = float(os.getenv("PAPER_MIN_VOLUME_24H", "25000"))
MIN_PRICE = float(os.getenv("PAPER_MIN_PRICE", "0.20"))
MAX_PRICE = float(os.getenv("PAPER_MAX_PRICE", "0.80"))
MAX_SPREAD = float(os.getenv("PAPER_MAX_SPREAD", "0.020"))
MIN_TIME_TO_CLOSE_HOURS = float(os.getenv("PAPER_MIN_TIME_TO_CLOSE_HOURS", "0.5"))
MAX_TIME_TO_CLOSE_DAYS = float(os.getenv("PAPER_MAX_TIME_TO_CLOSE_DAYS", "45"))
MARKET_SCAN_LIMIT = int(os.getenv("PAPER_MARKET_SCAN_LIMIT", "200"))

LEADERBOARD_PERIODS = ("WEEK", "MONTH", "ALL")
LEADERBOARD_LIMIT = int(os.getenv("PAPER_LEADERBOARD_LIMIT", "50"))
LEADER_POOL_LIMIT = int(os.getenv("PAPER_LEADER_POOL_LIMIT", "12"))
MIN_LEADER_PERIODS = int(os.getenv("PAPER_MIN_LEADER_PERIODS", "2"))
MIN_LEADER_VOLUME = float(os.getenv("PAPER_MIN_LEADER_VOLUME", "100000"))
MIN_LEADER_EFFICIENCY = float(os.getenv("PAPER_MIN_LEADER_EFFICIENCY", "0.02"))
MAX_LEADER_EFFICIENCY = float(os.getenv("PAPER_MAX_LEADER_EFFICIENCY", "0.75"))
LEADER_POSITION_LIMIT = int(os.getenv("PAPER_LEADER_POSITION_LIMIT", "500"))
LEADER_TRADE_LIMIT = int(os.getenv("PAPER_LEADER_TRADE_LIMIT", "500"))
LEADER_CLOSED_LIMIT = int(os.getenv("PAPER_LEADER_CLOSED_LIMIT", "50"))
LEADER_MIN_HOLDING_USD = float(os.getenv("PAPER_LEADER_MIN_HOLDING_USD", "2500"))
LEADER_MIN_RECENT_FLOW_USD = float(os.getenv("PAPER_LEADER_MIN_RECENT_FLOW_USD", "1000"))
LEADER_FLOW_HOURS = float(os.getenv("PAPER_LEADER_FLOW_HOURS", "12"))
LEADER_RECENCY_HOURS = float(os.getenv("PAPER_LEADER_RECENCY_HOURS", "6"))
LEADER_MIN_RECENT_MARKETS = int(os.getenv("PAPER_LEADER_MIN_RECENT_MARKETS", "3"))

MIN_SIGNAL_SUPPORTERS = int(os.getenv("PAPER_MIN_SIGNAL_SUPPORTERS", "2"))
MIN_SIGNAL_CONSENSUS = float(os.getenv("PAPER_MIN_SIGNAL_CONSENSUS", "0.67"))
MIN_SIGNAL_EXPOSURE_USD = float(os.getenv("PAPER_MIN_SIGNAL_EXPOSURE_USD", "25000"))
MAX_ENTRY_CHASE = float(os.getenv("PAPER_MAX_ENTRY_CHASE", "0.03"))
MAX_ENTRY_DISCOUNT_WITHOUT_CONFIRMATION = float(
    os.getenv("PAPER_MAX_ENTRY_DISCOUNT_WITHOUT_CONFIRMATION", "0.12")
)
REQUEST_TIMEOUT = float(os.getenv("PAPER_REQUEST_TIMEOUT", "20"))
REQUEST_RETRIES = int(os.getenv("PAPER_REQUEST_RETRIES", "2"))

FEE_RATE_BY_CATEGORY = {
    "crypto": 0.07,
    "sports": 0.05,
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
PERIOD_WEIGHT = {"WEEK": 1.0, "MONTH": 1.15, "ALL": 0.75}


def request_json(url: str, *, method: str = "GET", body: Any | None = None) -> Any:
    data = None
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body, separators=(",", ":")).encode("utf-8")
        headers["Content-Type"] = "application/json"
    for attempt in range(REQUEST_RETRIES + 1):
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt >= REQUEST_RETRIES:
                raise
        except (urllib.error.URLError, TimeoutError):
            if attempt >= REQUEST_RETRIES:
                raise
        time.sleep(0.35 * (attempt + 1))
    raise RuntimeError("unreachable request retry state")


def as_float(value: Any, default: float = 0.0) -> float:
    try:
        return default if value is None or value == "" else float(value)
    except (TypeError, ValueError):
        return default


def as_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def as_json_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
    return []


def parse_ts(value: str) -> float:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def market_fee_rate(category: str | None, *, fees_enabled: bool = True) -> float:
    if not fees_enabled:
        return 0.0
    key = (category or "").strip().lower()
    if "geopolit" in key or key == "world":
        return 0.0
    return next((rate for prefix, rate in FEE_RATE_BY_CATEGORY.items() if prefix in key), DEFAULT_FEE_RATE)


def taker_fee(shares: float, price: float, fee_rate: float) -> float:
    if shares <= 0 or not 0 < price < 1 or fee_rate <= 0:
        return 0.0
    return round(shares * fee_rate * price * (1.0 - price), 5)


@dataclass(frozen=True)
class Leader:
    wallet: str
    username: str
    score: float
    weight: float
    periods: tuple[str, ...]
    ranks: tuple[str, ...]
    median_efficiency: float


@dataclass(frozen=True)
class MarketInfo:
    market_id: str
    condition_id: str
    question: str
    slug: str
    category: str
    event_key: str
    tokens: tuple[str, str]
    outcomes: tuple[str, str]
    liquidity: float
    volume_24h: float
    close_at: str
    fees_enabled: bool


@dataclass(frozen=True)
class EliteSignal:
    market: MarketInfo
    token_id: str
    outcome: str
    supporters: tuple[str, ...]
    supporter_wallets: tuple[str, ...]
    supporter_count: int
    opposition_count: int
    consensus: float
    leader_exposure: float
    leader_avg_entry: float
    recent_buyers: int
    latest_trade_ts: int


@dataclass(frozen=True)
class Candidate:
    signal: EliteSignal
    token_mid: float
    token_spread: float
    opposite_mid: float
    entry_price: float
    fee_rate: float
    score: float

    @property
    def market_id(self) -> str:
        return self.signal.market.condition_id

    @property
    def event_key(self) -> str:
        return self.signal.market.event_key

    @property
    def token_id(self) -> str:
        return self.signal.token_id

    @property
    def outcome(self) -> str:
        return self.signal.outcome


def infer_category(market: dict[str, Any]) -> str:
    events = market.get("events") if isinstance(market.get("events"), list) else []
    event = events[0] if events and isinstance(events[0], dict) else {}
    haystack = " ".join(
        str(x or "")
        for x in (
            market.get("category"), market.get("question"), market.get("slug"), market.get("sportsMarketType"),
            event.get("title"), event.get("slug"), event.get("seriesSlug"),
        )
    ).lower()
    sports = (
        " vs ", " win on ", "spread", "o/u", "game total", "match", "premier league", "counter-strike",
        "dota", "esports", "tennis", "baseball", "basketball", "football", "soccer", "ufc",
        "formula 1", "champions league", "world cup",
    )
    if market.get("gameStartTime") or market.get("sportsMarketType") or any(term in haystack for term in sports):
        return "sports"
    groups = (
        ("crypto", ("bitcoin", "ethereum", "crypto", "solana", "xrp", "dogecoin")),
        ("politics", ("election", "president", "senate", "congress", "governor", "nominee")),
        ("economics", ("fed ", "interest rate", "inflation", "gdp", "unemployment", "economy")),
        ("mentions", ("mention", "will say", "tweet", "post on")),
        ("weather", ("weather", "temperature", "rainfall", "hurricane")),
        ("tech", ("ai model", "technology", "iphone", "spacex", "openai")),
        ("geopolitics", ("war", "ceasefire", "blockade", "invasion", "geopolit")),
    )
    return next((name for name, terms in groups if any(term in haystack for term in terms)), "other")


def fetch_markets() -> list[dict[str, Any]]:
    query = urllib.parse.urlencode(
        {"limit": MARKET_SCAN_LIMIT, "closed": "false", "order": "volume24hr", "ascending": "false"}
    )
    data = request_json(f"{GAMMA_MARKETS}?{query}")
    return data if isinstance(data, list) else []


def eligible_markets(markets: Iterable[dict[str, Any]], *, now_epoch: float | None = None) -> dict[str, MarketInfo]:
    now_epoch = time.time() if now_epoch is None else now_epoch
    result: dict[str, MarketInfo] = {}
    for market in markets:
        if not bool(market.get("active", True)) or bool(market.get("closed", False)):
            continue
        if market.get("enableOrderBook") is False:
            continue
        outcomes = tuple(str(x) for x in as_json_list(market.get("outcomes")))
        tokens = tuple(str(x) for x in as_json_list(market.get("clobTokenIds")))
        if len(outcomes) != 2 or len(tokens) != 2 or not all(tokens):
            continue
        liquidity = max(as_float(market.get("liquidityNum")), as_float(market.get("liquidity")))
        volume_24h = as_float(market.get("volume24hr"))
        if liquidity < MIN_LIQUIDITY or volume_24h < MIN_VOLUME_24H:
            continue
        close_at = market.get("gameStartTime") or market.get("endDate") or market.get("endDateIso")
        try:
            seconds_left = parse_ts(str(close_at)) - now_epoch
        except (TypeError, ValueError):
            continue
        if not MIN_TIME_TO_CLOSE_HOURS * 3600 <= seconds_left <= MAX_TIME_TO_CLOSE_DAYS * 86400:
            continue
        condition_id = str(market.get("conditionId") or "")
        if not condition_id:
            continue
        events = market.get("events") if isinstance(market.get("events"), list) else []
        event = events[0] if events and isinstance(events[0], dict) else {}
        event_key = str(event.get("id") or event.get("slug") or market.get("eventId") or condition_id)
        result[condition_id] = MarketInfo(
            market_id=str(market.get("id") or condition_id), condition_id=condition_id,
            question=str(market.get("question") or "Unknown market"), slug=str(market.get("slug") or ""),
            category=infer_category(market), event_key=event_key, tokens=(tokens[0], tokens[1]),
            outcomes=(outcomes[0], outcomes[1]), liquidity=liquidity, volume_24h=volume_24h,
            close_at=str(close_at), fees_enabled=market.get("feesEnabled") is not False,
        )
    return result


def fetch_leaderboard(period: str) -> list[dict[str, Any]]:
    query = urllib.parse.urlencode(
        {"category": "OVERALL", "timePeriod": period, "orderBy": "PNL", "limit": LEADERBOARD_LIMIT, "offset": 0}
    )
    data = request_json(f"{DATA_API_BASE}/v1/leaderboard?{query}")
    return data if isinstance(data, list) else []


def fetch_leaderboards() -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        jobs = {executor.submit(fetch_leaderboard, period): period for period in LEADERBOARD_PERIODS}
        for future in as_completed(jobs):
            result[jobs[future]] = future.result()
    return result


def select_persistent_leaders(snapshots: dict[str, list[dict[str, Any]]]) -> list[Leader]:
    by_wallet: dict[str, dict[str, Any]] = {}
    for period in LEADERBOARD_PERIODS:
        for row in snapshots.get(period, []):
            wallet = str(row.get("proxyWallet") or "").lower()
            volume, pnl = as_float(row.get("vol")), as_float(row.get("pnl"))
            if len(wallet) != 42 or volume < MIN_LEADER_VOLUME or pnl <= 0:
                continue
            bucket = by_wallet.setdefault(wallet, {"username": str(row.get("userName") or wallet[:10]), "periods": {}})
            bucket["periods"][period] = {
                "rank": max(1, as_int(row.get("rank"), LEADERBOARD_LIMIT + 1)), "efficiency": pnl / volume,
            }
    leaders: list[Leader] = []
    for wallet, info in by_wallet.items():
        periods = info["periods"]
        if len(periods) < MIN_LEADER_PERIODS:
            continue
        efficiency = statistics.median(float(x["efficiency"]) for x in periods.values())
        if not MIN_LEADER_EFFICIENCY <= efficiency <= MAX_LEADER_EFFICIENCY:
            continue
        rank_score = sum(PERIOD_WEIGHT[p] / math.sqrt(float(row["rank"])) for p, row in periods.items())
        score = rank_score + min(1.25, efficiency * 3.0) + 0.15 * (len(periods) - MIN_LEADER_PERIODS)
        ordered = tuple(p for p in LEADERBOARD_PERIODS if p in periods)
        leaders.append(
            Leader(
                wallet=wallet, username=str(info["username"]), score=score,
                weight=max(0.75, min(1.50, 0.65 + score / 2.5)), periods=ordered,
                ranks=tuple(f"{p}:{periods[p]['rank']}" for p in ordered), median_efficiency=efficiency,
            )
        )
    return sorted(leaders, key=lambda leader: (len(leader.periods), leader.score), reverse=True)[:LEADER_POOL_LIMIT]


def _fetch_one_leader(leader: Leader) -> tuple[str, dict[str, list[dict[str, Any]]]]:
    positions_query = urllib.parse.urlencode(
        {"user": leader.wallet, "limit": LEADER_POSITION_LIMIT, "offset": 0, "sortBy": "CURRENT", "sortDirection": "DESC"}
    )
    trades_query = urllib.parse.urlencode(
        {"user": leader.wallet, "limit": LEADER_TRADE_LIMIT, "offset": 0, "takerOnly": "false"}
    )
    closed_query = urllib.parse.urlencode(
        {
            "user": leader.wallet, "limit": LEADER_CLOSED_LIMIT, "offset": 0,
            "sortBy": "TIMESTAMP", "sortDirection": "DESC",
        }
    )
    positions = request_json(f"{DATA_API_BASE}/positions?{positions_query}")
    trades = request_json(f"{DATA_API_BASE}/trades?{trades_query}")
    closed = request_json(f"{DATA_API_BASE}/closed-positions?{closed_query}")
    return leader.wallet, {
        "positions": positions if isinstance(positions, list) else [],
        "trades": trades if isinstance(trades, list) else [],
        "closed": closed if isinstance(closed, list) else [],
    }


def fetch_leader_evidence(leaders: list[Leader]) -> tuple[dict[str, dict[str, list[dict[str, Any]]]], list[str]]:
    evidence: dict[str, dict[str, list[dict[str, Any]]]] = {}
    errors: list[str] = []
    with ThreadPoolExecutor(max_workers=min(8, max(1, len(leaders)))) as executor:
        jobs = {executor.submit(_fetch_one_leader, leader): leader for leader in leaders}
        for future in as_completed(jobs):
            leader = jobs[future]
            try:
                wallet, data = future.result()
                evidence[wallet] = data
            except Exception as exc:
                errors.append(f"{leader.username}: {type(exc).__name__}")
    return evidence, errors


def leader_style(trades: list[dict[str, Any]]) -> tuple[str, float, int, float]:
    markets = {str(row.get("conditionId")) for row in trades if row.get("conditionId")}
    timestamps = [as_int(row.get("timestamp")) for row in trades if as_int(row.get("timestamp")) > 0]
    span = (max(timestamps) - min(timestamps)) / 3600.0 if len(timestamps) > 1 else 0.0
    if len(markets) < LEADER_MIN_RECENT_MARKETS:
        return "insufficient-history", 0.0, len(markets), span
    if len(trades) >= 400 and span < 3 and len(markets) >= 50:
        return "high-frequency", 0.65, len(markets), span
    if len(markets) < 8:
        return "concentrated", 0.80, len(markets), span
    return "directional", 1.0, len(markets), span


def closed_history_quality(closed: list[dict[str, Any]]) -> tuple[str, float, dict[str, float]]:
    pnls = [as_float(row.get("realizedPnl")) for row in closed]
    positive = sum(value for value in pnls if value > 0)
    negative = -sum(value for value in pnls if value < 0)
    profit_factor = positive / negative if negative > 0 else (float("inf") if positive > 0 else 0.0)
    total = sum(pnls)
    positive_rate = sum(value > 0 for value in pnls) / len(pnls) if pnls else 0.0
    top_three = sum(sorted((value for value in pnls if value > 0), reverse=True)[:3])
    concentration = top_three / positive if positive > 0 else 1.0
    metrics = {
        "count": float(len(pnls)), "pnl": total, "profit_factor": profit_factor,
        "positive_rate": positive_rate, "top3_positive_share": concentration,
    }
    if len(pnls) < 5:
        return "insufficient-closed-history", 0.0, metrics
    if total <= 0 or profit_factor < 1.10:
        return "failed-recent-closed-history", 0.0, metrics
    if len(pnls) < 10 or concentration > 0.85:
        return "concentrated-closed-history", 0.75, metrics
    return "validated-closed-history", 1.0, metrics


def aggregate_leader_signals(
    leaders: list[Leader], evidence: dict[str, dict[str, list[dict[str, Any]]]],
    markets: dict[str, MarketInfo], *, now_epoch: int | None = None,
) -> tuple[dict[str, EliteSignal], list[dict[str, Any]]]:
    now_epoch = int(time.time()) if now_epoch is None else now_epoch
    flow_cutoff = now_epoch - int(LEADER_FLOW_HOURS * 3600)
    recent_cutoff = now_epoch - int(LEADER_RECENCY_HOURS * 3600)
    votes: dict[str, list[dict[str, Any]]] = {}
    metadata: list[dict[str, Any]] = []
    for leader in leaders:
        data = evidence.get(leader.wallet)
        if not data:
            continue
        positions, trades, closed = data.get("positions", []), data.get("trades", []), data.get("closed", [])
        style, multiplier, unique_markets, span = leader_style(trades)
        history_status, history_multiplier, history_metrics = closed_history_quality(closed)
        usable = multiplier > 0 and history_multiplier > 0
        effective_weight = leader.weight * multiplier * history_multiplier
        metadata.append(
            {
                "username": leader.username, "wallet": f"{leader.wallet[:8]}…{leader.wallet[-4:]}",
                "periods": list(leader.periods), "ranks": list(leader.ranks),
                "median_pnl_to_volume": round(leader.median_efficiency, 4), "style": style,
                "recent_markets": unique_markets, "sample_span_hours": round(span, 2),
                "closed_sample": int(history_metrics["count"]),
                "closed_sample_pnl": round(history_metrics["pnl"], 2),
                "closed_profit_factor": (
                    None if math.isinf(history_metrics["profit_factor"])
                    else round(history_metrics["profit_factor"], 4)
                ),
                "closed_positive_rate": round(history_metrics["positive_rate"], 4),
                "closed_top3_positive_share": round(history_metrics["top3_positive_share"], 4),
                "history_validation": history_status, "usable": usable,
                "weight": round(effective_weight, 4),
            }
        )
        if not usable:
            continue
        flows: dict[tuple[str, str], dict[str, float]] = {}
        total_flow = 0.0
        for trade in trades:
            timestamp = as_int(trade.get("timestamp"))
            condition, token = str(trade.get("conditionId") or ""), str(trade.get("asset") or "")
            market = markets.get(condition)
            if timestamp < flow_cutoff or market is None or token not in market.tokens:
                continue
            cash = as_float(trade.get("size")) * as_float(trade.get("price"))
            if cash <= 0:
                continue
            signed = cash if str(trade.get("side") or "").upper() == "BUY" else -cash
            row = flows.setdefault((condition, token), {"net": 0.0, "latest_buy": 0.0})
            row["net"] += signed
            if signed > 0:
                row["latest_buy"] = max(row["latest_buy"], float(timestamp))
            total_flow += cash
        flow_threshold = max(LEADER_MIN_RECENT_FLOW_USD, total_flow * 0.005)

        holdings: dict[str, dict[str, dict[str, float]]] = {}
        for position in positions:
            condition, token = str(position.get("conditionId") or ""), str(position.get("asset") or "")
            market = markets.get(condition)
            if market is None or token not in market.tokens or bool(position.get("redeemable", False)):
                continue
            if not 0 < as_float(position.get("curPrice"), -1) < 1:
                continue
            exposure = max(as_float(position.get("initialValue")), as_float(position.get("currentValue")))
            entry = as_float(position.get("avgPrice"), -1)
            if exposure < LEADER_MIN_HOLDING_USD or not 0 < entry < 1:
                continue
            side = holdings.setdefault(condition, {}).setdefault(token, {"exposure": 0.0, "entry_value": 0.0})
            side["exposure"] += exposure
            side["entry_value"] += exposure * entry
        for condition, sides in holdings.items():
            token, dominant = max(sides.items(), key=lambda item: item[1]["exposure"])
            total = sum(side["exposure"] for side in sides.values())
            net_exposure = dominant["exposure"] - (total - dominant["exposure"])
            if dominant["exposure"] / total < 0.67 or net_exposure < LEADER_MIN_HOLDING_USD:
                continue
            flow = flows.get((condition, token), {"net": 0.0, "latest_buy": 0.0})
            votes.setdefault(condition, []).append(
                {
                    "token": token, "username": leader.username, "wallet": leader.wallet,
                    "weight": effective_weight, "exposure": net_exposure,
                    "entry": dominant["entry_value"] / dominant["exposure"],
                    "recent": flow["net"] >= flow_threshold and flow["latest_buy"] >= recent_cutoff,
                    "latest": int(flow["latest_buy"]),
                }
            )

    signals: dict[str, EliteSignal] = {}
    for condition, rows in votes.items():
        market = markets[condition]
        by_token = {token: [row for row in rows if row["token"] == token] for token in market.tokens}
        side_weights = {token: sum(float(row["weight"]) for row in side) for token, side in by_token.items()}
        winner = max(side_weights, key=side_weights.get)
        supporters = by_token[winner]
        opposition = [row for token, side in by_token.items() if token != winner for row in side]
        total_weight = sum(side_weights.values())
        consensus = side_weights[winner] / total_weight if total_weight else 0.0
        exposure = sum(float(row["exposure"]) for row in supporters)
        weights = [math.sqrt(float(row["exposure"])) * float(row["weight"]) for row in supporters]
        avg_entry = sum(float(row["entry"]) * weight for row, weight in zip(supporters, weights)) / sum(weights)
        if len(supporters) < MIN_SIGNAL_SUPPORTERS or consensus < MIN_SIGNAL_CONSENSUS:
            continue
        if exposure < MIN_SIGNAL_EXPOSURE_USD:
            continue
        index = market.tokens.index(winner)
        signals[winner] = EliteSignal(
            market=market, token_id=winner, outcome=market.outcomes[index],
            supporters=tuple(str(row["username"]) for row in supporters),
            supporter_wallets=tuple(str(row["wallet"]) for row in supporters),
            supporter_count=len(supporters), opposition_count=len(opposition), consensus=consensus,
            leader_exposure=exposure, leader_avg_entry=avg_entry,
            recent_buyers=sum(bool(row["recent"]) for row in supporters),
            latest_trade_ts=max((int(row["latest"]) for row in supporters), default=0),
        )
    return signals, metadata


def batch_midpoints(token_ids: list[str]) -> dict[str, float]:
    if not token_ids:
        return {}
    data = request_json(f"{CLOB_BASE}/midpoints", method="POST", body=[{"token_id": token} for token in token_ids])
    return {str(key): as_float(value, -1) for key, value in (data or {}).items()}


def batch_spreads(token_ids: list[str]) -> dict[str, float]:
    if not token_ids:
        return {}
    data = request_json(f"{CLOB_BASE}/spreads", method="POST", body=[{"token_id": token} for token in token_ids])
    return {str(key): as_float(value, 1) for key, value in (data or {}).items()}


def build_entry_candidates(
    signals: dict[str, EliteSignal], mids: dict[str, float], spreads: dict[str, float],
    *, now_epoch: int | None = None,
) -> list[Candidate]:
    now_epoch = int(time.time()) if now_epoch is None else now_epoch
    cutoff = now_epoch - int(LEADER_RECENCY_HOURS * 3600)
    result: list[Candidate] = []
    for token, signal in signals.items():
        if signal.recent_buyers < 1 or signal.latest_trade_ts < cutoff:
            continue
        opposite = signal.market.tokens[1 - signal.market.tokens.index(token)]
        mid, opposite_mid, spread = mids.get(token, -1), mids.get(opposite, -1), spreads.get(token, 1)
        if not (0 < mid < 1 and 0 < opposite_mid < 1) or abs(mid + opposite_mid - 1) > 0.06:
            continue
        if spread <= 0 or spread > MAX_SPREAD:
            continue
        entry = min(0.999, mid + spread / 2)
        if not MIN_PRICE <= entry <= MAX_PRICE or entry > signal.leader_avg_entry + MAX_ENTRY_CHASE:
            continue
        if entry < signal.leader_avg_entry - MAX_ENTRY_DISCOUNT_WITHOUT_CONFIRMATION and signal.recent_buyers < 2:
            continue
        recency = max(0.0, (now_epoch - signal.latest_trade_ts) / 3600)
        score = (
            2 * signal.consensus + 0.35 * signal.supporter_count
            + 0.08 * math.log10(max(signal.leader_exposure, 1)) + 0.25 * signal.recent_buyers
            - 4 * spread - 0.03 * recency
        )
        result.append(
            Candidate(
                signal=signal, token_mid=mid, token_spread=spread, opposite_mid=opposite_mid,
                entry_price=entry,
                fee_rate=market_fee_rate(signal.market.category, fees_enabled=signal.market.fees_enabled), score=score,
            )
        )
    return sorted(result, key=lambda candidate: candidate.score, reverse=True)

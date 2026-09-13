"""Strict paper-only evidence contracts for PolyShark v4."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
import math
from typing import Any, Mapping

TOLERANCE = 1e-8


class Decision(str, Enum):
    TRADE = "TRADE"
    NO_TRADE = "NO_TRADE"


class Outcome(str, Enum):
    YES = "YES"
    NO = "NO"


class RejectReason(str, Enum):
    INSUFFICIENT_EDGE = "INSUFFICIENT_EDGE"
    HIGH_UNCERTAINTY = "HIGH_UNCERTAINTY"
    BAD_LIQUIDITY = "BAD_LIQUIDITY"
    HIGH_SPREAD = "HIGH_SPREAD"
    HIGH_SLIPPAGE = "HIGH_SLIPPAGE"
    BAD_RESOLUTION_RULE = "BAD_RESOLUTION_RULE"
    STALE_DATA = "STALE_DATA"
    CONFLICTING_SOURCES = "CONFLICTING_SOURCES"
    HIGH_CORRELATION = "HIGH_CORRELATION"
    RISK_LIMIT = "RISK_LIMIT"
    MODEL_DISAGREEMENT = "MODEL_DISAGREEMENT"
    EXECUTION_UNCERTAINTY = "EXECUTION_UNCERTAINTY"
    REGIME_UNSUPPORTED = "REGIME_UNSUPPORTED"


def _number(name: str, value: Any, low: float | None = None, high: float | None = None) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a real number")
    value = float(value)
    if not math.isfinite(value):
        raise ValueError(f"{name} must be finite")
    if low is not None and value < low:
        raise ValueError(f"{name} must be >= {low}")
    if high is not None and value > high:
        raise ValueError(f"{name} must be <= {high}")
    return value


def _timestamp(name: str, value: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{name} is required")
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{name} must be ISO-8601") from exc
    if result.tzinfo is None or result.utcoffset() is None:
        raise ValueError(f"{name} must include a timezone")
    return result.astimezone(timezone.utc)


def _required_text(instance: Any, names: tuple[str, ...]) -> None:
    for name in names:
        value = getattr(instance, name)
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{name} is required")


@dataclass(frozen=True)
class EvidenceRecord:
    evidence_id: str
    source: str
    source_uri: str
    observed_at: str
    retrieved_at: str
    content_hash: str

    def validate(self) -> None:
        _required_text(self, ("evidence_id", "source", "source_uri", "content_hash"))
        if _timestamp("observed_at", self.observed_at) > _timestamp("retrieved_at", self.retrieved_at):
            raise ValueError("evidence cannot be retrieved before observation")


@dataclass(frozen=True)
class ForecastOutput:
    forecast_id: str
    market_id: str
    outcome: Outcome
    model_version: str
    calibration_version: str
    probability: float
    calibrated_probability: float
    confidence: float
    uncertainty: float
    created_at: str
    input_cutoff_at: str
    evidence: tuple[EvidenceRecord, ...]
    counter_evidence: tuple[EvidenceRecord, ...] = ()
    source_quality: float = 0.0
    regime: str = ""
    data_quality: float = 0.0

    def validate(self) -> None:
        _required_text(self, ("forecast_id", "market_id", "model_version", "calibration_version", "regime"))
        if not isinstance(self.outcome, Outcome):
            raise ValueError("outcome must be an Outcome")
        for name in ("probability", "calibrated_probability", "confidence", "uncertainty", "source_quality", "data_quality"):
            _number(name, getattr(self, name), 0.0, 1.0)
        created = _timestamp("created_at", self.created_at)
        cutoff = _timestamp("input_cutoff_at", self.input_cutoff_at)
        if cutoff > created:
            raise ValueError("input cutoff cannot be after forecast creation")
        if not isinstance(self.evidence, tuple) or not self.evidence:
            raise ValueError("at least one immutable evidence record is required")
        if not isinstance(self.counter_evidence, tuple):
            raise ValueError("counter_evidence must be a tuple")
        records = self.evidence + self.counter_evidence
        if not all(isinstance(item, EvidenceRecord) for item in records):
            raise ValueError("all evidence must use EvidenceRecord")
        for item in records:
            item.validate()
            if _timestamp("retrieved_at", item.retrieved_at) > cutoff:
                raise ValueError("evidence retrieved after cutoff creates look-ahead")
        ids = [item.evidence_id for item in records]
        if len(ids) != len(set(ids)):
            raise ValueError("evidence IDs must be unique")


@dataclass(frozen=True)
class CostEstimate:
    """Per-contract costs, expressed in probability points."""
    fees: float = 0.0
    spread: float = 0.0
    slippage: float = 0.0
    price_impact: float = 0.0
    latency: float = 0.0
    liquidity_penalty: float = 0.0
    adverse_selection: float = 0.0
    model_version: str = ""
    quote_timestamp: str = ""

    def validate(self) -> None:
        _required_text(self, ("model_version",))
        _timestamp("quote_timestamp", self.quote_timestamp)
        for name in ("fees", "spread", "slippage", "price_impact", "latency", "liquidity_penalty", "adverse_selection"):
            _number(name, getattr(self, name), 0.0, 1.0)
        if self.total > 1.0 + TOLERANCE:
            raise ValueError("total modeled cost cannot exceed one probability point")

    @property
    def total(self) -> float:
        return math.fsum((self.fees, self.spread, self.slippage, self.price_impact, self.latency, self.liquidity_penalty, self.adverse_selection))


@dataclass(frozen=True)
class TradeDossier:
    dossier_id: str
    forecast_id: str
    market_id: str
    outcome: Outcome
    question: str
    resolution_rule: str
    resolution_source: str
    decision_at: str
    market_price: float
    bid: float
    ask: float
    spread: float
    liquidity: float
    volume: float
    time_to_resolution_seconds: float
    crowd_probability: float
    raw_model_probability: float
    calibrated_probability: float
    probability_uncertainty: float
    agent_agreement: float
    agent_disagreement: float
    news_score: float
    microstructure_score: float
    fundamental_score: float
    regime_score: float
    estimated_edge: float
    estimated_net_edge: float
    expected_cost: CostEstimate
    execution_probability: float
    gross_ev: float
    net_ev: float
    risk_adjusted_ev: float
    position_size: float
    max_loss: float
    portfolio_exposure: float
    correlation_exposure: float
    decision: Decision
    confidence: float
    rejection_reason: RejectReason | None = None
    paper_only: bool = True
    real_orders_enabled: bool = False
    real_money: bool = False
    live_trading: bool = False

    def validate(self) -> None:
        _required_text(self, ("dossier_id", "forecast_id", "market_id", "question"))
        if not isinstance(self.outcome, Outcome):
            raise ValueError("outcome must be an Outcome")
        if not isinstance(self.decision, Decision):
            raise ValueError("decision must be a Decision")
        if self.rejection_reason is not None and not isinstance(self.rejection_reason, RejectReason):
            raise ValueError("rejection_reason must be a RejectReason")
        decision_at = _timestamp("decision_at", self.decision_at)
        self.expected_cost.validate()
        if _timestamp("cost quote_timestamp", self.expected_cost.quote_timestamp) > decision_at:
            raise ValueError("cost quote cannot be after decision")
        for name in ("market_price", "bid", "ask", "spread", "crowd_probability", "raw_model_probability", "calibrated_probability", "probability_uncertainty", "agent_agreement", "agent_disagreement", "execution_probability", "confidence"):
            _number(name, getattr(self, name), 0.0, 1.0)
        for name in ("liquidity", "volume", "time_to_resolution_seconds", "position_size", "max_loss", "portfolio_exposure", "correlation_exposure"):
            _number(name, getattr(self, name), 0.0)
        for name in ("news_score", "microstructure_score", "fundamental_score", "regime_score", "estimated_edge", "estimated_net_edge", "gross_ev", "net_ev", "risk_adjusted_ev"):
            _number(name, getattr(self, name), -1.0, 1.0)
        if self.bid > self.ask or not math.isclose(self.spread, self.ask - self.bid, abs_tol=TOLERANCE):
            raise ValueError("bid/ask/spread are inconsistent")
        expected_edge = self.calibrated_probability - self.ask
        if not math.isclose(self.estimated_edge, expected_edge, abs_tol=TOLERANCE):
            raise ValueError("edge must equal calibrated probability minus executable ask")
        if not math.isclose(self.estimated_net_edge, self.estimated_edge - self.expected_cost.total, abs_tol=TOLERANCE):
            raise ValueError("net edge must equal edge minus modeled costs")
        if not math.isclose(self.gross_ev, self.estimated_edge, abs_tol=TOLERANCE):
            raise ValueError("gross EV must equal per-contract edge")
        if not math.isclose(self.net_ev, self.estimated_net_edge, abs_tol=TOLERANCE):
            raise ValueError("net EV must equal net edge")
        if self.risk_adjusted_ev > self.net_ev + TOLERANCE:
            raise ValueError("risk-adjusted EV cannot exceed net EV")
        if self.decision is Decision.NO_TRADE:
            if self.rejection_reason is None:
                raise ValueError("NO_TRADE requires a reason")
            if self.position_size != 0.0 or self.max_loss != 0.0:
                raise ValueError("NO_TRADE requires zero executable size and max loss")
        else:
            if self.rejection_reason is not None:
                raise ValueError("TRADE cannot carry a rejection reason")
            _required_text(self, ("resolution_rule", "resolution_source"))
            if self.time_to_resolution_seconds <= 0 or self.execution_probability <= 0:
                raise ValueError("TRADE requires future resolution and executable liquidity")
            if self.position_size <= 0 or self.max_loss <= 0:
                raise ValueError("TRADE requires positive size and max loss")
            if self.net_ev <= 0 or self.risk_adjusted_ev <= 0:
                raise ValueError("TRADE requires positive net and risk-adjusted EV")
        require_paper_only({
            "paper_only": self.paper_only,
            "real_orders_enabled": self.real_orders_enabled,
            "real_money": self.real_money,
            "live_trading": self.live_trading,
        })


def require_paper_only(state: Mapping[str, Any]) -> None:
    """Fail closed unless every canonical flag is an explicit bool."""
    expected = {"paper_only": True, "real_orders_enabled": False, "real_money": False, "live_trading": False}
    for name, required in expected.items():
        if name not in state or type(state[name]) is not bool or state[name] is not required:
            raise RuntimeError("PAPER_ONLY_VIOLATION")
    if "DRY_RUN" in state and (type(state["DRY_RUN"]) is not bool or state["DRY_RUN"] is not True):
        raise RuntimeError("PAPER_ONLY_VIOLATION")


def reconcile_equity(starting_equity: float, realized_net_pnl: float, unrealized_net_pnl: float) -> float:
    """Reconcile net P&L fields; their fees and costs are already included once."""
    equity = _number("starting_equity", starting_equity, 0.0) + _number("realized_net_pnl", realized_net_pnl) + _number("unrealized_net_pnl", unrealized_net_pnl)
    if equity < -TOLERANCE:
        raise ValueError("reconciled equity cannot be negative")
    return max(0.0, equity)


def assert_equity_reconciled(*, recorded_equity: float, cash: float, open_position_value: float, starting_equity: float, realized_net_pnl: float, unrealized_net_pnl: float, tolerance: float = 1e-5) -> None:
    """Cross-check cash/positions and net-P&L ledgers independently."""
    recorded = _number("recorded_equity", recorded_equity, 0.0)
    cash_equity = _number("cash", cash, 0.0) + _number("open_position_value", open_position_value, 0.0)
    pnl_equity = reconcile_equity(starting_equity, realized_net_pnl, unrealized_net_pnl)
    if not math.isclose(recorded, cash_equity, abs_tol=tolerance):
        raise ValueError("equity does not reconcile to cash plus positions")
    if not math.isclose(recorded, pnl_equity, abs_tol=tolerance):
        raise ValueError("equity does not reconcile to starting equity plus net P&L")

"""Strict, paper-only research contracts for PolyShark v4.

These contracts deliberately do not execute trades. They define the evidence that
must exist before a paper decision can be accepted by the research pipeline.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Mapping


class Decision(str, Enum):
    TRADE = "TRADE"
    NO_TRADE = "NO_TRADE"


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


@dataclass(frozen=True)
class ForecastOutput:
    probability: float
    calibrated_probability: float
    confidence: float
    uncertainty: float
    evidence: tuple[Mapping[str, Any], ...] = ()
    counter_evidence: tuple[Mapping[str, Any], ...] = ()
    source_quality: float = 0.0
    timestamp: str = ""
    regime: str = ""
    data_quality: float = 0.0

    def validate(self) -> None:
        for name in ("probability", "calibrated_probability", "confidence", "uncertainty", "source_quality", "data_quality"):
            value = float(getattr(self, name))
            if not 0.0 <= value <= 1.0:
                raise ValueError(f"{name} must be within [0, 1]")
        if not self.timestamp:
            raise ValueError("timestamp is required")


@dataclass(frozen=True)
class CostEstimate:
    fees: float = 0.0
    spread: float = 0.0
    slippage: float = 0.0
    price_impact: float = 0.0
    latency: float = 0.0
    liquidity: float = 0.0
    adverse_selection: float = 0.0

    @property
    def total(self) -> float:
        return sum((self.fees, self.spread, self.slippage, self.price_impact, self.latency, self.adverse_selection))


@dataclass(frozen=True)
class TradeDossier:
    market_id: str
    question: str
    resolution_rule: str
    resolution_source: str
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

    def validate(self) -> None:
        if not self.market_id or not self.question:
            raise ValueError("market identity is required")
        if not self.resolution_rule or not self.resolution_source:
            raise ValueError("official resolution metadata is required")
        for name in ("market_price", "bid", "ask", "spread", "crowd_probability", "raw_model_probability", "calibrated_probability", "probability_uncertainty", "agent_agreement", "agent_disagreement", "execution_probability", "confidence"):
            value = float(getattr(self, name))
            if not 0.0 <= value <= 1.0:
                raise ValueError(f"{name} must be within [0, 1]")
        if self.bid > self.ask:
            raise ValueError("bid cannot exceed ask")
        if self.estimated_net_edge != self.estimated_edge - self.expected_cost.total:
            raise ValueError("estimated_net_edge must equal edge minus modeled costs")
        if self.decision is Decision.NO_TRADE and self.rejection_reason is None:
            raise ValueError("NO_TRADE requires an explicit rejection_reason")
        if self.decision is Decision.TRADE and self.rejection_reason is not None:
            raise ValueError("TRADE cannot carry a rejection_reason")
        if not self.paper_only or self.real_orders_enabled:
            raise ValueError("paper-only invariant violated")


def require_paper_only(state: Mapping[str, Any]) -> None:
    """Fail closed if a state/config attempts to enable real execution."""
    if state.get("real_orders_enabled") is True or state.get("live_trading") is True:
        raise RuntimeError("PAPER_ONLY_VIOLATION")
    if state.get("paper_only") is False:
        raise RuntimeError("PAPER_ONLY_VIOLATION")


def reconcile_equity(starting_equity: float, realized_pnl: float, unrealized_pnl: float, fees: float, costs: float) -> float:
    """Canonical research equity equation."""
    return starting_equity + realized_pnl + unrealized_pnl - fees - costs

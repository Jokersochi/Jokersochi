# 🦈 PolyShark AI v4

> Evidence-first prediction-market research and paper-trading platform.

## Mission

PolyShark evaluates whether a calibrated probabilistic forecast contains a **robust, out-of-sample, after-cost, risk-adjusted edge** relative to market/crowd pricing.

The product is **paper-only**. It must never send real orders or move real money.

## Safety invariants

```text
PAPER_ONLY = TRUE
REAL_ORDERS_ENABLED = FALSE
REAL_MONEY = FALSE
```

Any violation is a critical defect and must fail closed.

## Decision pipeline

```text
REAL DATA
  ↓
VALIDATE + PROVENANCE
  ↓
INDEPENDENT FORECASTS
  ↓
CALIBRATION
  ↓
CROWD PRIOR COMPARISON
  ↓
NET EDGE + COST MODEL
  ↓
EXECUTION SIMULATION
  ↓
PORTFOLIO RISK / VETO
  ↓
PAPER DECISION
  ↓
OFFICIAL RESOLUTION
  ↓
RECONCILIATION
  ↓
OOS EVALUATION
  ↓
CHAMPION / CHALLENGER REVIEW
```

## Current baseline

The existing production baseline is retained as **Champion / control** until a challenger demonstrates superiority on fresh OOS data. The current runtime strategy is `liquid-market dual-horizon momentum v2`.

It is **not** treated as proven alpha merely because it has a positive backtest or win rate.

## Research contracts

`runtime/research_contracts.py` defines strict contracts for:

- calibrated forecast outputs;
- cost estimates;
- trade dossiers;
- explicit NO_TRADE reasons;
- fail-closed paper-only validation;
- canonical equity reconciliation.

These contracts do not authorize execution.

## Verification standard

Claims must be labeled:

- `NO EVIDENCE`
- `PROMISING`
- `IMPROVED BUT UNPROVEN`
- `STATISTICALLY SUPPORTED`

Unknown or unverified values must never be presented as facts.

## Development

Run the test suite from `polyshark-ai/`:

```bash
python -m unittest discover -s tests -p 'test_*.py'
```

## Release gate

No production release is acceptable with a critical failure in:

- paper-only integrity;
- ledger/reconciliation;
- official settlement;
- risk controls;
- data integrity;
- OOS validation;
- security;
- observability;
- frontend/browser QA;
- accessibility;
- performance.

See `V4_AUDIT.md` for the evidence-backed baseline audit and current blockers.

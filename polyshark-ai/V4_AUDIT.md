# PolyShark AI v4 — Evidence-First Baseline Audit

Date: 2026-08-31  
Baseline: `main` @ `52a5b4040fe3889d3a377446d8ac22c7f334f786`  
Working branch: `polyshark/v4-foundation`

## Executive verdict

**NO EVIDENCE** of a statistically supported, robust, after-cost trading edge.

This is not a claim that the project cannot develop an edge. It means the current runtime does not yet provide the evidence required by v4 to make that claim.

## Confirmed facts

- The current runtime trader is `liquid-market dual-horizon momentum v2`.
- Candidate selection is driven by 24h/6h momentum plus liquidity, volume, spread and price filters.
- Current runtime uses deterministic take-profit, stop-loss and max-hold exits.
- The repository contains a Supabase schema with markets, prices, model predictions, orders and performance metrics.
- The current FastAPI surface is only `/health` and `/status`; positions/signals/performance/markets are TODO.
- The scheduled paper workflow runs at quarter-hour offsets and persists `runtime/paper_state.json` by committing it to `main`.
- Static paper-only guards exist, but the v4 invariant needs to become a reusable runtime contract rather than a workflow-only string scan.
- Existing documentation still contains paths toward real execution and therefore conflicts with the new paper-only product policy.

## P0 release blockers

1. **Forecasting evidence gap** — no verified runtime chain from independent forecasts through calibration, net edge and risk-adjusted decision.
2. **Execution realism gap** — current strategy uses midpoint/spread inputs but does not expose a complete size/depth/impact/latency execution dossier.
3. **Settlement semantics gap** — trading exits and official event resolution are not separated as distinct lifecycles.
4. **Canonical state gap** — committing mutable runtime state into the source branch couples execution state to Git history and creates race/reproducibility risks.
5. **API/product evidence gap** — the API status is largely configuration-derived and contains TODO placeholders instead of canonical runtime state.
6. **Statistical promotion gap** — no verified champion/challenger promotion gate with fresh OOS, multiple-testing awareness and stress evidence.

## P1 blockers

- Portfolio correlation/concentration is not a first-class runtime decision gate.
- No explicit no-trade intelligence ledger for rejected opportunities and counterfactual outcomes.
- No complete P&L attribution chain separating forecast alpha, selection, timing, execution and costs.
- No immutable forecast lifecycle contract in the runtime.
- No evidence-backed data freshness/provenance contract across critical inputs.
- Frontend architecture and production UX requirements in the v4 brief are not yet represented by a verified route/component system in this baseline.

## Root-cause hypothesis ranking

### #1 — strategy is momentum-first, not forecast-first

The current decision rule primarily asks whether recent price momentum is positive/negative. It does not first establish a calibrated probability and compare that probability with crowd pricing after realistic costs.

### #2 — event forecasting and trade execution are conflated

A stop-loss/take-profit can be useful for a paper trading experiment, but it cannot substitute for official resolution when evaluating whether a probabilistic forecast was correct.

### #3 — cost/execution attribution is incomplete

Without explicit expected fill, depth impact, latency and adverse-selection accounting, a positive gross signal can disappear after execution costs.

### #4 — state and product truth are fragmented

Runtime state, Supabase schema, API configuration and old documentation describe different versions of the product. v4 must expose one verified runtime truth and label everything else as stale/unverified.

## Safe v4 foundation implemented on this branch

- Added `runtime/research_contracts.py` with strict `ForecastOutput`, `TradeDossier`, `CostEstimate`, decision/rejection enums, paper-only fail-closed validation and canonical equity reconciliation.
- Added `tests/test_research_contracts.py` covering probability bounds, explicit no-trade reasons, paper-only enforcement and equity reconciliation.

These contracts are intentionally not wired into live execution yet. Integration requires tests against the actual runtime and data path; until then it remains **UNVERIFIED**.

## Required next sequence

1. PASS A: map every runtime path and test the actual state/ledger/settlement flow.
2. PASS B: reconstruct historical forecasts/trades and quantify gross-to-net P&L attribution, calibration and execution gap.
3. PASS C: adversarial leakage, look-ahead, settlement, state, paper-only and UI claims review.
4. Freeze momentum v2 as the baseline Champion; do not optimize it against the same OOS period repeatedly.
5. Build challengers as independent research candidates.
6. Introduce official-resolution forecast lifecycle and immutable prediction records.
7. Replace Git-as-runtime-state with a transactional canonical persistence layer after its exact production database/runtime is verified.
8. Build API contracts from canonical state, then build the premium terminal UI on those contracts.
9. Run release gate; deploy only with evidence and rollback verification.

## Non-negotiable policy

`PAPER_ONLY = TRUE`  
`REAL_ORDERS_ENABLED = FALSE`  
`REAL_MONEY = FALSE`

Any violation is a **CRITICAL DEFECT** and must fail closed.

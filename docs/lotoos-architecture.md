# LotoOS — P0 architecture

## Canonical flow

Stoloto official v35 -> Supabase ingestion -> draws and payouts -> immutable forward runs -> settlements -> evidence -> web UI.

Supabase is the only operational source of truth. GitHub stores code, tests, migrations and documentation; it no longer owns the live draw archive or production forward ledger.

## Product areas

- LIVE: verified official archive and data quality.
- FORWARD LAB: tickets locked before the target draw.
- EVIDENCE LAB: preregistered forward-only promotion gate.
- RESEARCH LAB: historical exploratory hypotheses.

Historical patterns are hypotheses, not proof that an independent random draw can be predicted.

## Production evidence

Production set: adaptive20 candidate, balanced20 structural baseline, random paired comparator.

Every forward run records target draw, training cutoff, source cutoff, dataset hash, engine revision, deterministic seed, config hash, ticket hash and lock time. Forward runs, tickets, settlements and evidence snapshots are append-only.

Adaptive20 promotion requires at least 1000 new preregistered forward draws. Historical walk-forward results do not count. Inference uses paired Random, bootstrap confidence intervals, sign-flip testing and BH/FDR when multiple preregistered hypotheses are in the same family.

## Financial evidence

Published payout rows are used only when they support the historical ticket evaluation. If a hypothetical winning category had zero historical winners, LotoOS does not invent an exact counterfactual payout and marks the result unresolved.

## Retired authorities

Browser LocalStorage ledger, GitHub draws.json, forward-ledger.json, strategy-report.json, old GitHub archive writer and split v1/v2 strategy engines are retired. The Excel register is an export/report, not the operational state machine.

## CI/CD

LotoOS CI runs tests, canonical live smoke and build. The publish workflow verifies Supabase-backed LotoOS and publishes UI code only; it does not mutate canonical lottery data. PolyShark remains in its separate workflow.

# Agent 2 — Reliability

## Scope
- Idempotency
- Retry-safe operations

## Current sprint actions
- [x] Added idempotency storage migration (`db/migrations/20260424_000002_idempotency_keys.sql`)
- [x] Added idempotency service (`lib/services/idempotency-service.ts`)
- [x] Enabled idempotency in inbound leads route via `x-idempotency-key`

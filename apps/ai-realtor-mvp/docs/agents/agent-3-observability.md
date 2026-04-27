# Agent 3 — Observability

## Scope
- Structured logs
- request_id propagation

## Current sprint actions
- [x] Added API response envelope with `request_id` (`lib/api/response.ts`)
- [x] Added structured logger (`lib/observability/logger.ts`)
- [x] Wired logs into inbound, ai/reply, viewings, owner summary routes

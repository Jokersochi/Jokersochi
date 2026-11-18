# PolyShark — PAPER-only causal replay & independent ledger audit

This is an **execution-research tool, not a trading profitability test**. It
never authenticates with Polymarket, never submits orders, and never touches
`polyshark-ai/runtime/paper_state.json`.

## What is checked

- A recorded CLOB book has a market event timestamp (`book_timestamp_ms`),
  receipt timestamp (`received_at`), and decision timestamp (`tick_at`).
  Replay requires **book time ≤ receipt time ≤ decision time**. Missing or
  future-dated books fail closed; stale quotes are ignored by the same
  60-second quote-age gate used by the sandbox.
- Replay processes ticks in strictly increasing order. It uses the recorded
  bid/ask **depth ladder**, not historical midpoints or re-fetched quotes.
  Determinism is established by comparing complete serialized state from
  online PAPER simulation with offline replay.
- The independent auditor reconstructs cash from BUY/SELL cash flows, FIFO
  realized P&L, remaining shares and FIFO cost basis, conservative
  unrealized P&L from available-depth liquidation marks, and total equity.
  A mismatch fails the CI job and prevents publishing an updated artifact.
- Existing **10% drawdown stop** and `NO_TRADE` remain in force. No
  live-trading permissions or real-money order endpoints are added.

## Automated PAPER evidence

`.github/workflows/polyshark-sandbox-validation.yml`:

1. Runs 22 sandbox unit tests and the independent replay/audit test suite.
2. Reads and audits the last successful main-branch ledger without modifying it.
3. Restores the saved virtual ledger on `main`, auditing before the next tick.
4. Fetches **public** books only, records a one-tick snapshot and its exact
   pre-tick state, simulates hypothetical fills, and audits the resulting state.
5. Replays that same tick **offline**, requiring exact equality of all fields.
6. Publishes the updated virtual ledger, snapshot, and seed in the same
   GitHub Actions artifact, retained for **30 days**.

GitHub Actions schedules are best-effort. A successful scheduled run does
**not** demonstrate continuous 24/7 data capture.

## Read-only replay of a saved artifact

Given `pre_tick_seed.json`, `one_tick_quote_snapshot.jsonl`, and
`sandbox_paper_state.json` from a completed workflow:

```bash
python polyshark-ai/runtime/sandbox_audit.py \
  --state sandbox_paper_state.json

python polyshark-ai/runtime/sandbox_replay.py \
  --initial-state pre_tick_seed.json \
  --input one_tick_quote_snapshot.jsonl \
  --output /tmp/polyshark-replayed.json
```

The last output can be compared with the saved state; GitHub CI already
requires byte-equivalent JSON objects for every new PAPER tick. An input
snapshot is a single JSON object per line with the following shape:

```json
{
  "tick_at": "2026-11-18T12:00:00+00:00",
  "quotes": {
    "market-id": {
      "book_timestamp_ms": 1795003198000,
      "received_at": "2026-11-18T11:59:59+00:00",
      "bids": [[0.49, 100]],
      "asks": [[0.5, 100]],
      "question": "Example market"
    }
  }
}
```

**Limitations:** The snapshot captures reported book depth, not queue
priority, guaranteed executable volume, latency between decision and order,
or the exact fee schedule applicable at the historical date. Fee and
slippage parameters remain deliberately conservative *assumptions*; they
are not independently established Polymarket charges. Settlement and
locked-capital opportunity cost are not modelled. Illiquid or missing
positions have a zero liquidation mark, making reported unrealized P&L a
conservative stress valuation, not proven final loss. FIFO ledger agreement
does not validate a prediction model or establish positive net ROI.

**Capital decision: NO_TRADE.** Never automatically promote to real orders.

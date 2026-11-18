# PolyShark PAPER — fee provenance, capital lock & settlement gates

**Scope:** an additional **read-only** economic audit. This is not a fee lookup
service, settlement bot, order gateway, strategy upgrade, or proof of ROI.
All output remains **`NO_TRADE`** and no PAPER ledger is rewritten.

## Verified public rules versus historical trade evidence

**Official Polymarket International sources:**

- [Trading fees (10 July 2026)](https://help.polymarket.com/en/articles/13364478-trading-fees)
  states a fee curve `shares × coefficient × price × (1 - price)`,
  with fees rounded to five decimals. The coefficient depends on category.
- [Maker rebates / eligible markets](https://help.polymarket.com/en/articles/13364471-maker-rebates-program)
  states that taker fees apply only to **fee-enabled markets** and
  the fee status should be checked per market. The help article distinguishes
  buy-side fees collected in shares from sell-side fees collected in USDC.
- [Resolution](https://help.polymarket.com/en/articles/13364518-how-are-prediction-markets-resolved)
  and [disputes](https://help.polymarket.com/en/articles/13364551-how-are-markets-disputed)
  describe proposed outcomes, challenge periods and UMA finality.

**Important:** Polymarket **US** and Polymarket International have distinct
fee schedules. Neither a generic category table nor a rate from a current
documentation page is automatically valid for a market traded earlier.
Fees may be disabled per individual market, and the schedule may change on
a future effective date. The simulator's existing 7% taker fee coefficient is
a **stress assumption**, not a verified receipt from Polymarket. Older
aggregate fills lack per-price execution legs and must not be retroactively
"verified" by computing a nonlinear fee from an average execution price.

## What the new economic auditor computes

`python polyshark-ai/runtime/sandbox_economics.py --state <PAPER-ledger.json>`

1. First runs the independent FIFO and cash/equity reconciliation.
2. Classifies fee evidence **separately for every virtual fill**:
   `NO_CONTEMPORANEOUS_MARKET_FEE_EVIDENCE`,
   `MARKET_SOURCE_CLAIM_PRESENT_BUT_NO_EXECUTION_LEGS`,
   `FEE_MODEL_MISMATCH`, etc. It never claims to independently authenticate
   actual charged fees.
3. Reconstructs cost basis locked in each **open** position; computes FIFO
   capital-days for fully/partially closed and open lots. Estimates the
   opportunity cost at **0%, 5%, 15% annual assumptions**, without
   subtracting hypothetical financing costs from the saved ledger.
4. Treats market resolution as `FINALITY_UNVERIFIED` without direct evidence.
   Even user-supplied finality evidence only reports a **hypothetical payout**.
   Proposed, disputed, future-observed or unverifiable outcomes never release
   virtual funds or change P&L.
5. Sets `economic_verdict=UNVERIFIED_NO_TRADE` on every run. No automatic
   promotion is possible.

The audit runs on both the preserved main-branch ledger and each subsequent
snapshot. It publishes `economic_evidence_report.json` with the original
PAPER journal, input snapshot and pre-tick seed in the GitHub Actions
artifact. This report is independently recomputed after virtual fills.

## Optional, independently reviewable evidence manifest

`--evidence evidence.json` accepts *user-supplied, read-only* records:

```json
{
  "fee_records": [
    {
      "market_id": "example-market-id",
      "platform": "polymarket_international",
      "source_url": "https://gamma-api.polymarket.com/markets/example",
      "observed_at": "2026-11-19T00:00:00+00:00",
      "valid_from": "2026-11-19T00:00:00+00:00",
      "valid_until": null,
      "fees_enabled": true,
      "coefficient": "0.05"
    }
  ],
  "settlements": {
    "example-market-id": {
      "market_id": "example-market-id",
      "status": "FINAL",
      "source_url": "https://gamma-api.polymarket.com/markets/example",
      "observed_at": "2026-11-19T20:00:00+00:00",
      "finalized_at": "2026-11-19T19:00:00+00:00",
      "payout_per_share": "1"
    }
  }
}
```

These are **illustrative, not factual records**. The module checks format,
market identity, relevant time window, provenance hostname and causal
timestamp constraints. It does **not** fetch or authenticate the referenced
remote pages, so `source_url` is only a claim of provenance. Independent
verification requires archived original API responses or settlement-chain
receipts. The fee-curve comparison requires all individual price levels
(`fill_legs`), which earlier PAPER fills do not have.

**Never insert actual API keys, wallets or signing material in evidence.**

## Research decision

For historical and new PAPER fills, missing market-specific fee data,
nonreproducible order execution, or unconfirmed settlement remain
**economic evidence gaps**. A cash/position audit pass is not evidence of
profitable trading. The automatic 10% drawdown stop, existing `NO_TRADE`,
and `real_orders_enabled=false` remain unchanged.

Recommended next research gate: archive contemporaneous CLOB/Gamma
market fee metadata, verify per-share trade rounding and buy-side
share-based deductions; collect final settlement receipts and measure
capital lock through actual finality. Only then run independent, temporal
OOS/forward PAPER tests with stress costs and uncertainty intervals.

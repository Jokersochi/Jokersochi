# PolyShark BTC Forward Evaluation — immutable research-only history

This module is **research**, NOT paper execution or an approved Challenger
v2 source. Its sole purpose is to record forecasts before settlement and
audit their accuracy when both independent *resolution checks* agree.

## Architecture

1. Hourly GitHub Actions job \`PolyShark BTC Independent-Price Research\`
   generates a timestamped snapshot using live public Coinbase and Kraken
   *completed hourly* BTC/USD bars and public Polymarket data.
2. \`btc_forward_evaluation.py\` accepts only the current, uncalibrated
   \`NO_TRADE\` research report, generated within five minutes of ingestion.
   Old snapshots cannot be backdated. The two spot exchanges are correlated;
   they do not count as independent probability forecasters.
3. One immutable snapshot per **event date × lead-time bucket** is stored
   on dedicated Git branch \`polyshark-btc-forward-data\`, file
   \`polyshark-ai/research/btc_forward_ledger.json\`. Each has a SHA-256
   digest over its canonical JSON, the GitHub run ID, observed-at timestamp,
   72-hour spot sample hashes, forecast and market-probability values,
   public quote/cost diagnostics and a strict \`NO_TRADE\` flag.
   No canonical paper ledger changes.
4. For each event at least 15 minutes after expected settlement, query
   Binance's *public market-data-only* endpoint for the **single exact
   11:59–12:00 ET BTC/USDT minute**, whose close timestamp is exactly noon.
   The minute opens one minute before the settlement instant (rather than
   opening at noon).
5. Independently cross-check all relevant market IDs against Gamma's
   \`umaResolutionStatus=resolved\`, \`closed=true\` and final 1/0
   \`outcomePrices\`; validate unchanged question, settlement time and
   Binance 1-minute close rules. Missing/ambiguous/disputed results are
   blocked and retried on future runs; no outcome is invented.
6. Append resolution as another hashed record. Historical predictions are
   never edited. Dataset commits remain in the separate data branch.
7. Report event-day-weighted Brier score of the earliest precommitted
   forecast vs. the market-price baseline. Include per-event diagnostics,
   and separate horizon-bucket diagnostics clearly labeled non-independent.
   Repeated snapshots, correlated strikes and quote observations from one
   event do NOT inflate the primary independent sample count.

## Illustrative performance versus real returns

The diagnostics may show a hypothetical **one YES share per event day**
selected by a fixed pre-outcome rule: first market in the recorded forecast
order with estimated YES edge of at least $0.01/share and modeled liquidity
eligibility. The cost / liquidity / price impact model does not prove an
execution fill. New research snapshots record the per-market Gamma fee
schedule when supported. Forecasts saved November 16–17 used the older
**5% hypothetical fee coefficient**, not the currently observed 7% crypto
market fee. Their historical hashes are retained without modification.
Such numbers are labeled *illustrative* and should **not** be presented as
paper-trading ROI or real returns.

The read-only report also calculates **event-weighted expected calibration
error (ECE)** for the model and indicative market-price baseline using five
probability bins. Each event day contributes total weight one across all
correlated strike markets. Reported bin counts of contracts are not
independent evidence, and ECE is explicitly **descriptive only** because
adjacent Bitcoin days also have serial dependence. Neither model ECE nor
market ECE alone proves a trading edge.

The report includes `calibration_review_blockers` and deliberately retains
`calibration_review_eligible=false` even if sample thresholds are eventually
met. It cannot auto-authorize paper capital or live trading.

## Conservative serial-dependence uncertainty

`btc_robustness.py` adds a reproducible, **descriptive** paired
moving-block bootstrap for the earliest precommitted forecast per BTC
event date. Both the model-vs-market Brier advantage and hypothetical
one-YES-share **daily** P&L use the same resampled 7-day blocks (2,000
resamples, fixed seed), so the resampling unit is the calendar day,
not individual correlated strike-market outcomes or hourly snapshots.
Days on which the fixed entry rule selected no hypothetical position
count as **$0**, never disappear from the P&L denominator.

A 95% percentile interval is omitted until at least **50 distinct,
consecutive, resolved event days** exist. If there is a date gap, the
resampling result is withheld. The hypothetical P&L interval also
requires **30 days with modeled YES choices**. It cannot be equated
with fill-based paper ROI because order-book depth, actual transaction
fees, queue execution and impact remain unverified. The 7-day block
assumption does not guarantee all serial dependence is captured.

A positive lower interval bound is **not** authorization: the module
always returns `strategy_promotion=BLOCKED` and
`can_claim_positive_edge=false`. Out-of-sample calibration and
independent execution economics still require a separate evidence
review. Earlier event-dated records and their hashes are never
rewritten.

At least 50 separate, resolved event days are required before a sample-size
review is meaningful. That alone is not sufficient: we additionally require
out-of-sample calibration, Brier/ECE, robustness by lead time, realistic
fees/impact, signed or independently auditable data, sufficient quote depth,
time-of-knowledge checks, basis risk and distribution shift assessment.
The code intentionally always returns
\`calibration_review_eligible=false\`.

## Operational details

- GitHub Actions is **best effort**, not a guaranteed wall-clock scheduler.
- The data branch is a durability aid, but its records could be rewritten by
  someone with repository write access. SHA-256 and Git history provide
  tamper evidence, not cryptographic third-party timestamp notarization.
- An artifact retains the current diagnostic results for 14 days; the
  separate data branch is the durable forward record.
- To re-check locally (read-only on a copied ledger):

\`\`\`bash
python polyshark-ai/tests/test_btc_forward_evaluation.py -q
python polyshark-ai/runtime/spot_research.py --output /tmp/forecast.json
python polyshark-ai/runtime/btc_forward_evaluation.py \
  --report /tmp/forecast.json \
  --ledger /tmp/btc_forward_ledger.json \
  --output /tmp/forward_result.json
\`\`\`

- Never feed the generated research file into
  \`PAPER_CHALLENGER_EVIDENCE_FILE\`. It is a separate evaluation artifact
  and does not meet Challenger's independent-event-source requirements.
- Evidence and settlement API endpoints (public GET only):
  https://api.exchange.coinbase.com/products/BTC-USD/candles,
  https://api.kraken.com/0/public/OHLC,
  https://gamma-api.polymarket.com/events,
  https://data-api.binance.vision/api/v3/klines.
- No API key, execution wallet, secret, real order or virtual position is
  used.

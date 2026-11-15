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
7. Report event-day-weighted Brier score of the forecast vs. market-price
   baseline. Repeated snapshots, correlated strikes and quote observations
   from one event do NOT inflate the independent sample count.

## Illustrative performance versus real returns

The diagnostics may show a hypothetical **one YES share per event day**
selected at a positive modeled after-cost edge. The cost coefficient,
liquidity and impact assumptions are unverified; no actual fill took place.
Such numbers are labeled *illustrative* and should **not** be presented as
paper-trading ROI or real returns.

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

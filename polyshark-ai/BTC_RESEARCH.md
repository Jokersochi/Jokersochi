# BTC threshold research — read-only baseline

This is a **research-only** BTC above-$K-by-datetime reference implementation.
It is NOT an automated strategy, approved source for Challenger v2's
\`challenger_v2_evidence\`, paper execution engine, or live-order path.

## What it does

- Reads a public Gamma event (default: the nearest eligible "Bitcoin above ___ on <date>" event).
- Requires an exact binary market question, exact ET-noon 1-minute Binance
  BTC/USDT close settlement text, and matching time in Gamma's \`endDate\`.
  Rejects ambiguous rules and expired or distant contracts.
- Fetches public Coinbase BTC/USD and Kraken BTC/USD hourly OHLC (no account,
  API key, private endpoint, or order API). Excludes unfinished hourly candles
  and requires 72 contiguous completed hourly returns per source.
- Computes **uncalibrated** zero-arithmetic-drift lognormal terminal
  \`P(BTC price above K at the stated time)\` separately for each venue,
  then averages as a *diagnostic*. The two underlying spot series are
  highly correlated. Two exchange inputs are **not** two independent
  event-probability forecasts; this result cannot pass the current
  independent research evidence requirement.
- After estimating probability, compares it with Gamma's *indicative* YES
  price and, if available, the public CLOB best bid and ask. Cost estimates
  use an assumed 5% fee coefficient, $100 test notional, and the existing
  liquidity/slippage heuristic; they are **not** verified executable economics.
- Logs Binance BTC/USDT vs. Coinbase/Kraken BTC/USD **settlement-basis risk**.
  Close, liquidity, calendars and fee assumptions must be independently
  verified against market rules before any trade research promotion.

The output always says \`NO_TRADE\`, \`research_only=true\` and
\`shadow_eligible=false\`. No source impersonation, API trading credentials,
paper balance changes, or automatic promotion.

## Run

\`\`\`shell
python polyshark-ai/tests/test_spot_research.py -q
python polyshark-ai/runtime/spot_research.py --output btc-research.json
python polyshark-ai/runtime/spot_research.py \
  --event-slug bitcoin-above-on-november-16-2026 \
  --output btc-research.json
\`\`\`

No new dependencies beyond Python 3.11 and existing
\`polyshark-ai/runtime/challenger_v2.py\`.

Forward-only sampling and post-resolution evaluation are documented in
[BTC_FORWARD_EVALUATION.md](BTC_FORWARD_EVALUATION.md). This is a separate
research data branch and never touches the canonical paper ledger.

The scheduled workflow \`PolyShark BTC Independent-Price Research\` runs
hourly on a best-effort GitHub Actions schedule. It stores only a
14-day diagnostic artifact and adds a summary to its workflow run. A
\`BLOCKED\` result is a legitimate safe abstention, not forecast evidence.
It **never writes** the canonical paper ledger or activates Challenger v2.

## Limitations and promotion criteria

- Terminal prices are not barrier-touch prices; "reach", "dip" and
  intramonth high/low contracts are **not supported**.
- The lognormal model assumes zero arithmetic drift and stationary
  short-term volatility. It is **not calibrated**; no backtest or forward
  evidence currently establishes a positive net edge.
- Prices from Coinbase and Kraken are the same underlying risk factor;
  neither is the exact Binance settlement venue.
- Missing CLOB quote, stale/missing bars, incompatible rules and unavailable
  APIs produce an explicit blocked/abstention result.
- Before integrating output into Challenger's evidence contract, independently
  verify data provenance, source licensing, settlement outcomes, basis risk,
  historic calibration (Brier/ECE), OOS period, independent event count, and
  after-fee/slippage P&L. No output from this version may be presented as a
  profitable trading signal.

Primary public inputs: https://api.exchange.coinbase.com/products/BTC-USD/candles,
https://api.kraken.com/0/public/OHLC,
https://gamma-api.polymarket.com/events and
https://clob.polymarket.com/book.

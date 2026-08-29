# PolyShark: public Polymarket trader analysis

Snapshot date: 2026-08-29 UTC. This is a reproducible behavioral inference from public data, not access to private models, bookmaker feeds, or trader intent.

## Data and method

- Pulled the official `OVERALL` PnL leaderboard for `DAY`, `WEEK`, `MONTH`, and `ALL`, top 50 per window.
- Kept recurring addresses, then inspected up to 200 recent closed positions, 500 recent fills, and 500 current positions per address.
- Measured recurrence across windows, PnL/volume as a rough efficiency screen, number of markets, entry-price distribution, concentration, buy/sell behavior, current exposure, and recent flow.
- Sources: [leaderboard](https://docs.polymarket.com/api-reference/core/get-trader-leaderboard-rankings), [trades](https://docs.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets), [current positions](https://docs.polymarket.com/api-reference/core/get-current-positions-for-a-user), and [closed positions](https://docs.polymarket.com/api-reference/core/get-closed-positions-for-a-user).

The closed-position API sample is not a complete lifetime audit. Leaderboard PnL divided by leaderboard volume is not account return on capital. The sample therefore supports signal design, not a profitability claim.

## Observed sample

| Public profile | Closed sample | Positive rows | Sample realized PnL | Profit factor | Median entry | Recent market count / fill span | Dominant behavior |
|---|---:|---:|---:|---:|---:|---:|---|
| SPCEXBUYER | 200 | 93.0% | +$9.38m | 29.30 | 0.543 | 11 / 21.1h | diversified esports/sports directional |
| vito3corleone | 7 | 100.0% | +$2.76m | n.m. | 0.500 | 10 / 148.4h | highly concentrated football |
| kilian7kilian | 13 | 92.3% | +$1.31m | 13.65 | 0.607 | 20 / 76.6h | sports/esports favorites and mid-price entries |
| ripley86alien | 3 | 100.0% | +$1.93m | n.m. | 0.531 | 5 / 100.2h | concentrated football |
| nigiri99 | 200 | 53.5% | +$0.21m | 96.78 | 0.532 | 103 / 1.6h | extremely high-frequency, broad sports book |
| mentionmarket | 198 | 69.2% | -$1.38m | 0.78 | 0.536 | 27 / 945.2h | mixed book; recent closed sample contradicts headline rank |
| jjj1995 | 7 | 100.0% | +$1.31m | n.m. | 0.680 | 11 / 46.8h | concentrated sports |
| e46m3 | 200 | 44.5% | approximately flat | 1.15 | 0.780 | 317 / 9.9h | very high turnover and many near-certain outcomes |
| sainttroplay | 5 | 100.0% | +$4.19m | n.m. | 0.541 | 6 / 47.4h | single-event football concentration |
| RN1 | 200 | 34.5% | approximately flat | 1.07 | 0.518 | 69 / 0.9h | latency/turnover-dependent |
| swisstony | 200 | 43.0% | approximately flat | 1.33 | 0.441 | 175 / 6.1h | broad high-turnover sports book |

`n.m.` means the sampled rows contained no loss, so a finite profit factor is not meaningful. This is a warning about concentration and survivorship, not proof of zero risk.

## Behavioral inference

1. There is no single shared strategy. The leaderboard mixes directional specialists, concentrated event bets, and turnover/latency-dependent market-making behavior.
2. The strongest reproducible cluster is sports/esports specialization, repeated scale-in buys, and holding through resolution. Most inspected recent-fill samples were 88–100% buys.
3. Successful directional samples concentrated around entry prices from roughly 0.30 to 0.70. Extreme-price trades appeared more often in turnover-heavy books and are harder to copy after fees.
4. Several apparent leaders depended on one to seven settled outcomes. A single-address copy rule would import severe survivorship and concentration risk.
5. A delayed follower does not receive the leader's entry price. Paying even a few cents more can consume the entire observable edge in a binary contract.
6. Maker and taker economics are structurally different. Polymarket states that makers do not pay taker fees and can receive rebates, while takers pay a price-dependent fee in enabled markets. A 15-minute paper follower cannot claim a high-frequency maker's edge. See [fees](https://docs.polymarket.com/trading/fees) and [maker rebates](https://docs.polymarket.com/programs/maker-rebates).

## Implemented v3 translation

The research is translated into conservative, testable rules rather than wallet mirroring:

- require a trader to appear in at least two of week/month/all-time top-50 lists;
- reject low PnL/volume profiles whose result is likely turnover/rebate dependent and cap every remaining trader's vote;
- reject profiles whose recent closed-position sample has fewer than five outcomes, non-positive PnL, or profit factor below 1.10; discount concentrated samples instead of treating them as proven;
- discount extremely high-frequency and highly concentrated behavior;
- require at least two independent current holdings on the same token, at least 67% weighted consensus, and at least $25,000 aggregate leader exposure;
- require a recent net-buy confirmation from at least one supporter;
- refuse an entry more than $0.03 above the leaders' weighted average price;
- refuse extreme contract prices, thin liquidity, stale/near-closing markets, spreads above $0.02, and internally inconsistent binary quotes;
- limit each paper position to 2% of equity, the whole book to 8%, one new position per tick, and one position per event;
- block new entries after a $20 UTC-day realized loss;
- exit on hard loss, profit target, prolonged loss of leader consensus, or maximum hold;
- preserve `paper_only: true` and `real_orders_enabled: false` as hard invariants.

No out-of-sample edge is claimed. Promotion requires forward paper results after all spread and fee assumptions; historical leaderboard selection alone is insufficient.

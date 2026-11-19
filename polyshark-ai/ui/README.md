# PolyShark AI — read-only terminal preview

Static paper-research visualization prototype; no execution controls.

## Preview

Open ui/terminal.html in a modern browser. Start the existing FastAPI service separately on 127.0.0.1:8000 for live /health and /status values. For another authorized API, use the query parameter api=http://127.0.0.1:8000.

Existing CORS middleware controls cross-origin access. The UI issues GET requests only.

## Provenance and limits

- Configured bankroll is NOT a verified portfolio balance.
- Probability threshold is NOT realized accuracy or win rate.
- Positions, P&L, signals, risk and Brier metrics are unavailable until verified read-only endpoints exist.
- DRY_RUN=false is flagged as an unsafe configuration; this frontend has no trading actions.
- No secrets, wallets or order endpoints are used.

## Next step

Connect authenticated, sanitized paper-summary endpoints with timestamps and explicit missing-data states. Add real-browser visual regression at desktop and phone sizes. Keep live trading disabled.

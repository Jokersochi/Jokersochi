# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Visage Studio is a Vite-based vanilla JS PWA for virtual makeup try-on. The repo also contains a Russian Monopoly board game (files under `js/`, `css/`, `server/`) and several optional side projects under `apps/`.

### Running services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Frontend (Vite dev) | `npm run dev` | 5173 | Main entry: Visage Studio app |
| WebSocket server | `node server/server.js` | 8080 | Requires Supabase env vars |

The WebSocket server requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to start. Without those secrets the frontend still runs standalone for development.

### Standard commands

See `package.json` scripts. Key ones:

- **Dev server:** `npm run dev`
- **Build:** `npm run build`
- **Lint JS:** `npm run lint`
- **Lint CSS:** `npm run lint:css`
- **Tests:** `npm test`

### Known issues (pre-existing)

- **Jest tests fail** due to a version mismatch: `jest@29` is incompatible with `babel-jest@30` and `@jest/globals@30` listed in `package.json`. All 7 test suites error with `TypeError: Cannot read properties of undefined (reading 'extend')`.
- **Stylelint fails** because the `stylelint-no-physical-properties` plugin referenced in `.stylelintrc.json` is not installed as a dependency.
- **ESLint** reports 2 pre-existing errors in `js/ui/auction-ui.js` (undefined `CONFIG`, unused `data` variable).

### Node.js version

The project pins Node 18 via `.nvmrc`. Use `source ~/.nvm/nvm.sh && nvm use 18` before running any commands.

### Environment variables

Copy `.env.example` to `.env` for local development. The Vite dev server does not require secrets to start; only the WebSocket server needs Supabase credentials.

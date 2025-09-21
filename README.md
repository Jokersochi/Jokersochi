# Brandopoly Blitz

Brandopoly Blitz is a multiplayer economic board game inspired by Monopoly and expanded with dynamic brand economies, sealed-bid auctions, and deep contract systems. The monorepo contains the NestJS realtime backend, React + PixiJS client, Electron desktop wrapper, Docker deployment assets, and telemetry configuration.

## Features

- Rectangular 15 × 9 perimeter board of world-leading brands with synergy bonuses and PR reputation effects.
- Lobby and match services with Socket.IO realtime updates, sealed-bid auctions, and contract negotiation flows.
- Anti-cheat heuristics, telemetry via OpenTelemetry collector, Prometheus, and Grafana dashboards.
- React front-end with PixiJS board rendering, Zustand store, i18n (EN/RU), accessible UI patterns, and tutorial overlay.
- Electron desktop shell reusing the Vite build.

## Project Structure

```
backend/        NestJS application (Auth, Lobby, Match, Economy, Auctions, Deals, Anti-cheat, Telemetry)
frontend/       React + PixiJS client
desktop/        Electron wrapper for the web client
docker/         Dockerfiles and docker-compose setup
config/         Nginx, OpenTelemetry collector, Prometheus configuration
assets/         Placeholder SVGs and neutral skins
BrandingConfig.json  Brand naming modes (Generic/RealBrands)
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm 9+
- Docker (optional for containerized deployment)
- PostgreSQL and Redis (for local backend outside Docker)

### Install Dependencies

```
npm install --prefix backend
npm install --prefix frontend
npm install --prefix desktop
```

### Development Workflow

1. Start PostgreSQL & Redis (Docker compose or local).
2. Generate Prisma client and run migrations:
   ```
   cd backend
   npx prisma generate
   npx prisma migrate dev
   ```
3. Launch backend: `npm run start:dev --prefix backend`
4. Launch frontend: `npm run dev --prefix frontend`
5. Optionally start Electron shell: `npm run start --prefix desktop`

Environment variables are defined in `.env.example`. Copy to `.env` and fill secrets as needed.

### Docker Compose

```
cd docker
docker compose up --build
```

Services: `backend` (NestJS), `frontend` (Vite preview), `postgres`, `redis`, `otel-collector`, `prometheus`, `grafana`.

## Testing

- Backend unit tests: `npm test --prefix backend`
- Frontend unit tests: `npm test --prefix frontend`

Playwright and end-to-end suites can be added within `frontend` as needed.

## Branding Modes

`BrandingConfig.json` toggles between neutral “Generic” labels and text-only “RealBrands”. Production deployments must enable the generic mode unless trademark licenses are secured.

## Telemetry

The backend emits OpenTelemetry spans via OTLP. The provided collector configuration exposes a Prometheus endpoint (`otel-collector:9464`) scraped by Prometheus and visualised in Grafana (`http://localhost:3001`).

## Security & Fair Play

- JWT authentication with short-lived access tokens and refresh tokens.
- Anti-cheat heuristics detecting suspicious auction bidding and ultra-low latency.
- Server-side validation of match flow, auctions, and contracts.
- Redis-driven session cache and rate-limiting hooks (extend as needed).

## License

MIT. See `LICENSE` (if provided) for details.

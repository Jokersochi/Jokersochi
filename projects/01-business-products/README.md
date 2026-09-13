# First-Party Business Products

Canonical product map for the `Jokersochi` GitHub account.

This catalog lists products owned by this account. Third-party forks, templates, extraction sources and legacy prototypes are intentionally excluded.

## P0 — Core products

### AI Realtor — `ai-realtor` (private)
Canonical PropTech / real-estate automation platform.

Product scope:
- properties and inventory;
- leads and CRM workflows;
- AI-assisted analysis/content;
- automation/agent jobs;
- audit trail and production operations.

Legacy sources such as `sochi-realtor-ai` and RealtyAI code hidden in unrelated forks are not separate products.

### Sentinel Markets AI — `sentinel-markets-ai` (private)
Canonical market-intelligence SaaS.

Product scope:
- market briefs and asset analysis;
- watchlists;
- risk/confidence outputs;
- provenance/freshness;
- Telegram + web surfaces;
- Trust Ledger / signal-quality workflow.

Legacy Android AI Studio code is reference-only and not a second source of truth.

### Monopoly Luxe — `monopoly-luxe` (private)
Canonical premium multiplayer economic board game.

Consolidation sources:
- `russian-monopoly-local` for richer Russian board/rules/content;
- `monopolylux` for server-authoritative Socket.IO/game-state architecture.

All other Monopoly prototypes are superseded or cleanup candidates after explicit extraction decisions.

## P1 — Active products

### Primerochnaya — `primerochnaya`
AI virtual clothing try-on and future AR/partner platform.

### Product Visualizer AI — `Product-Visualizer-AI`
AI product visualization for e-commerce/catalog workflows.

### Sochi House Project — `SochiHouseApp` (private)
Independent parametric house/concept-design application.

Scope includes:
- site/building parameters;
- SVG 2D plan and Three.js 3D preview;
- PDF/DXF/GLTF/IFC exports;
- GeoJSON and planning-envelope workflows;
- share/comparison/client feedback;
- server-side AI renders;
- production preflight and backups.

This is **not** part of AI Realtor and should remain a separate product boundary.

## P2 — Preserve, harden, rename

### RoomGenius — repository `-`
Real AI interior-design product currently hidden behind an invalid repository name.

Target repository name: `room-genius` after deployment/dependency checks and when repository rename controls are available.

### Virtual Food Photographer — repository `---`
Real Gemini/Imagen food-photography product currently hidden behind an invalid repository name.

Before public/product promotion:
- move model calls behind a server-side API;
- remove client-bundle API-key injection;
- rotate any credential that may have been bundled/deployed;
- rename repository to `virtual-food-photographer` when safe.

## Governance

1. One product = one canonical active repository.
2. Legacy prototypes are extraction sources, not competing products.
3. Upstream forks are not portfolio entries.
4. Product metrics and agent activity must be backed by real persisted data/events.
5. Secrets remain server-side or in deployment secret stores.
6. Rename/archive/delete only after dependency and deployment checks.

See also:
- `docs/repository-audit-2026-09-13.md`
- `docs/naming-and-cleanup-standard.md`
- `docs/upstream-fork-delta-decisions.md`

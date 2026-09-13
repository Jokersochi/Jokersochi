# GitHub Repository Audit — 2026-09-13

Evidence-backed cleanup decisions for the `Jokersochi` account. Goal: one canonical repository per real product; third-party forks/imports leave the active portfolio only after first-party value is migrated or explicitly rejected.

## Canonical first-party products

| Product | Canonical repository | Decision |
|---|---|---|
| AI Realtor | `Jokersochi/ai-realtor` | Canonical production Realtor/PropTech product. |
| Sentinel Markets AI | `Jokersochi/sentinel-markets-ai` | Canonical market-intelligence product and data source of truth. |
| Monopoly Luxe | `Jokersochi/monopoly-luxe` | Canonical game; legacy-source consolidation still in progress. |
| Virtual Try-On | `Jokersochi/primerochnaya` | Canonical clothing try-on / future AR product. |
| Product Visualizer | `Jokersochi/Product-Visualizer-AI` | Active first-party product. |
| Sochi House Project | `Jokersochi/SochiHouseApp` | Independent parametric house/concept-design product; not part of Realtor. |
| RoomGenius | `Jokersochi/-` | Real AI interior-design product; preserve and later rename. |
| Virtual Food Photographer | `Jokersochi/---` | Real Gemini/Imagen product; preserve, fix secret boundary, then rename. |

Canonical product catalog: `projects/01-business-products/README.md`.

## P0 security

### `monopoly-luxe`
A committed `.env` was found on `main`.

Completed containment:
- removed `.env` from current `main`;
- added explicit `.env` / `.env.*` ignore rules;
- added placeholder-only `.env.example`;
- opened a P0 credential-rotation issue.

Deleting the file does not remove historical exposure; any real credential that appeared there must be rotated/revoked.

### Virtual Food Photographer (`---`)
`services/geminiService.ts` performs Gemini parsing/Imagen generation while `vite.config.ts` injects `GEMINI_API_KEY` into client-side constants.

Decision: preserve the product, but move AI calls behind a server-side API. P0 issue #2 tracks the secret-boundary repair and rotation if a real key was ever bundled/deployed.

A current-branch spot check found no root committed `.env` in `ai-realtor`, `sentinel-markets-ai`, `Product-Visualizer-AI`, `primerochnaya`, or `sochi-realtor-ai`. This is not a substitute for a full-history secret scan.

## Realtor consolidation

Canonical: `ai-realtor`.

### `andrej-karpathy-skills`
Cross-fork comparison against `multica-ai/andrej-karpathy-skills` showed `ahead_by=4`, `behind_by=3`. Product-specific delta was the 400-line `realtyai-mobile.html`; the remaining unique files were generic `.claude` tooling.

Completed extraction:
- captured worthwhile mobile UX in `ai-realtor/docs/mobile-ux-extraction.md`;
- retained safe-area/dvh handling, bottom navigation, touch-first property actions, bottom-sheet interaction, hierarchy and restrained motion;
- rejected hard-coded KPI data, fake LIVE activity, local token fields, sample data and one-file prototype architecture.

Decision: extraction complete; deletion/archive-ready after final dependency/deployment check.

### `sochi-realtor-ai`
Classified as a legacy UI/AI-Studio prototype, not a second production backend. Its Express layer is mock-oriented and its dashboard uses hard-coded presentation data.

Completed extraction:
- created `ai-realtor/docs/legacy-ui-extraction-sochi-realtor-ai.md`;
- preserved command-center information architecture, Sochi-specific analytics presentation ideas, real agent-activity UX requirements and accessible navigation principles;
- rejected fake KPIs/market data, simulated agents, mock publish/market endpoints, duplicate backend/auth/data planes and placeholder integrations.

Decision: extraction complete; deletion/archive-ready after final dependency/domain check.

### `SochiHouseApp`
Explicitly removed from Realtor cleanup scope. It is an independent first-party product with parametric site/building geometry, 2D/3D preview, PDF/DXF/GLTF/IFC exports, GeoJSON import, share/feedback, server-side AI renders, production preflight and backup operations.

## Monopoly consolidation

Canonical: `monopoly-luxe`.

### Valuable migration sources — keep for now
- `russian-monopoly-local`: richer Russian 40-cell board/economy, cards, micro-events, localization, trading, mortgage, bankruptcy and other rules.
- `monopolylux`: server-authoritative Express/Socket.IO rooms, reconnect, quick play, bots and deterministic game-state transitions.

A draft consolidation PR exists on `cleanup/server-consolidation`; migrated modules remain isolated from production runtime until canonical tests/reconciliation are complete.

### `codex`
Real `openai/codex` fork with one first-party commit adding `apps/russian-monopoly-mvp/`.

Reviewed and explicitly rejected for migration because:
- its README lists auctions, houses/hotels, dynamic rent and extended contract economy as unimplemented;
- its simple contracts/micro-events are superseded by richer preserved sources;
- its three tests cover only tax, property purchase and move-to-card behavior;
- SVG tokens are explicitly placeholder artwork;
- canonical migration sources already provide a stronger client rule set plus server-authoritative architecture.

Decision: extraction gate complete; deletion/archive-ready after final dependency check.

### `12345`
Early 8-cell, one-player browser prototype with basic movement, direct purchase, fixed rent and two Chance cards. Fully superseded; no migration required.

Decision: deletion/archive-ready.

### `Monopolize-`
Exactly one commit containing only the stock 11-line AI Studio README. No code exists.

Decision: deletion/archive-ready.

## Sentinel consolidation

Canonical: `sentinel-markets-ai`.

### `Sentinel-Markets-AI-`
Legacy Android/Jetpack Compose AI Studio prototype. Useful client ideas included mobile tabs, Room cache patterns, ViewModel/StateFlow, Retrofit boundary and Compose/Robolectric/Roborazzi testing. It also contained non-production behavior: hard-coded win/loss history, simulated signals, synthetic accuracy values and simulated fallback market narratives.

Completed extraction:
- created `sentinel-markets-ai/docs/android-client-reference.md`;
- preserved future-client UI/cache/testing patterns;
- explicitly rejected demo performance history, fake signals, local signal/risk authority, client-side privileged credentials and local entitlement truth;
- closed canonical issue #52 as completed.

Decision: future Android client must be rebuilt against canonical APIs. Legacy repository is deletion/archive-ready after final deployment/distribution check.

## Virtual try-on / DeepSeek cleanup

### `DeepSeek-R1`
Real upstream fork with five local commits and custom `makeup-app/`. The custom code is an old CRA makeup prototype using `face-api.js` for a single face, 68 landmarks and face descriptor; it does not perform real generative makeup rendering.

Compared against `primerochnaya` product direction and explicitly rejected migration:
- clothing try-on/future AR requires body pose, garment/body segmentation and occlusion handling, not a face descriptor;
- importing old face models would add client weight, maintenance and biometric/privacy surface without solving the product problem.

Canonical `primerochnaya` issue #2 records the decision and is closed as completed.

Decision: deletion/archive-ready after final dependency check.

## Verified clean forks — no unique product code

| Repository | Evidence | Decision |
|---|---|---|
| `anthropic-quickstarts` | `ahead_by=0` | cleanup-ready |
| `openai-agents-python` | `ahead_by=0` | cleanup-ready |
| `chrome-devtools-mcp` | `ahead_by=0` | cleanup-ready |
| `ComfyUI-Manager` | `ahead_by=0` | cleanup-ready |
| `ComfyUI-VideoCompressor` | `ahead_by=0`, one upstream commit behind | cleanup-ready |
| `flux` | identical to upstream | cleanup-ready |
| `omi` | `ahead_by=0` | cleanup-ready |
| `opensre` | `ahead_by=0` | cleanup-ready |
| `lobehub` | `ahead_by=0` | cleanup-ready |
| `shellcheck.net` | identical to upstream | cleanup-ready |

## Verified imported copy

### `https-github.com-hiddify-hiddify-app`
Not formally marked as a GitHub fork, but its audited `main` HEAD is an official Hiddify commit/tree also present in `hiddify/hiddify-app`, with no identified first-party HEAD delta.

Decision: historical upstream snapshot; cleanup-ready after dependency check.

## Modified upstream forks — reviewed decisions

Detailed rationale is recorded in `docs/upstream-fork-delta-decisions.md`.

### `cursor-plugin`
`ahead_by=2`, `behind_by=5`; actual delta is generic `.snapshots/` configuration/docs plus merge.

Decision: no product migration required; cleanup-ready.

### `compose-for-agents`
Four local commits primarily add an upstream-demo-specific `AGENTS.md` and `run-all.sh` launcher for all top-level Compose demos.

Decision: no migration into first-party products. Repo-specific agent guidance and broad demo orchestration are not canonical infrastructure; cleanup-ready after dependency check.

### `Wan2.2`
Fourteen local commits are upstream maintenance patches, not a first-party product:
- `torch.load(..., weights_only=True)` hardening;
- explicit exceptions for external API validation;
- remote-image request timeout;
- `einsum`/`math.prod` → `permute`/explicit reshape optimization;
- descriptive `tqdm` progress labels;
- agent/Jules tooling notes.

Decision: patch ideas are recorded, but no CORE migration is required. Contribute/re-apply upstream only if still relevant. Cleanup-ready after confirming no deployed video workflow depends on this exact fork.

## Template-derived / disposable repositories

### `codesandbox-template-nuxt`
Created from the official CodeSandbox Nuxt template. Later commits are generic Nuxt 2 maintenance/tooling; no product code identified.

Decision: cleanup-ready after dependency check.

### `ai-core`
Repository metadata reports `size=0`.

Decision: cleanup-ready.

### Organization demo repositories
- `Jokersochi12343322/demo-repository`
- `Jokersochi12343322/expert-chainsaw-demo-repository`

Both contain the stock GitHub organization demo README and no product role.

Decision: cleanup-ready.

## Naming cleanup

- `-` → RoomGenius; target name `room-genius` when repository rename controls are available and deployments are checked.
- `---` → Virtual Food Photographer; target `virtual-food-photographer` after security/deployment checks.
- `Product-Visualizer-AI` → eventually normalize to lowercase kebab-case if redirects/deployments permit.
- `Sentinel-Markets-AI-` → do not spend effort renaming if it will be archived/removed.

## Cleanup policy

A repository is eligible for destructive removal only when:

1. upstream relationship/import status is verified where applicable;
2. unique code has been migrated or explicitly rejected;
3. no active deployment/domain/automation depends on it;
4. no required issue/PR/history would be lost;
5. exposed credentials have been rotated where applicable;
6. canonical destination or explicit no-migration decision is documented.

## Current deletion-ready queue

Subject to final deployment/dependency/history checks, the code-value gate is passed for **25 repositories**:

1. `anthropic-quickstarts`
2. `openai-agents-python`
3. `chrome-devtools-mcp`
4. `ComfyUI-Manager`
5. `ComfyUI-VideoCompressor`
6. `flux`
7. `omi`
8. `opensre`
9. `lobehub`
10. `shellcheck.net`
11. `https-github.com-hiddify-hiddify-app`
12. `codesandbox-template-nuxt`
13. `ai-core`
14. `Jokersochi12343322/demo-repository`
15. `Jokersochi12343322/expert-chainsaw-demo-repository`
16. `Monopolize-`
17. `12345`
18. `cursor-plugin`
19. `andrej-karpathy-skills`
20. `sochi-realtor-ai`
21. `DeepSeek-R1`
22. `codex`
23. `Wan2.2`
24. `compose-for-agents`
25. `Sentinel-Markets-AI-`

The connected GitHub integration currently exposes file/branch/PR/issue mutations but not repository-level delete/archive/rename, so these are documented as deletion-ready rather than falsely marked deleted.

## Repositories intentionally NOT deletion-ready

- `russian-monopoly-local` — still contains unique game rules/content required for canonical migration.
- `monopolylux` — still contains unique server-authoritative multiplayer/state-machine code required for canonical migration.
- all canonical first-party products listed at the top of this document.

## Next execution queue

### P0
1. Continue `monopoly-luxe` port/tests from `russian-monopoly-local` + `monopolylux`.
2. Rotate any credential exposed through historical `monopoly-luxe/.env` and run full-history secret scanning.
3. Fix Virtual Food Photographer server-side Gemini/Imagen secret boundary.

### P1
4. Run final deployment/domain/dependency checks for the 25 deletion-ready repositories.
5. Delete/archive those repositories when repository-level controls are available.
6. Normalize `-`, `---`, and `Product-Visualizer-AI` names only after deployment checks.

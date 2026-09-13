# GitHub Repository Audit — 2026-09-13

This document records evidence-backed repository cleanup decisions for the `Jokersochi` account. The goal is one canonical repository per real product, with third-party forks/imports removed from the active portfolio only after first-party code has been extracted or explicitly rejected.

## Canonical first-party products

| Product | Canonical repository | Current decision |
|---|---|---|
| AI Realtor | `Jokersochi/ai-realtor` | Canonical production repository. |
| Sentinel Markets AI | `Jokersochi/sentinel-markets-ai` | Canonical market-intelligence SaaS repository. |
| Monopoly Luxe | `Jokersochi/monopoly-luxe` | Canonical game repository; consolidation in progress. |
| Virtual Try-On | `Jokersochi/primerochnaya` | Canonical virtual try-on / future AR direction. |
| Product Visualizer | `Jokersochi/Product-Visualizer-AI` | Active first-party product; later normalize naming if safe. |
| RoomGenius | `Jokersochi/-` | Real product hidden behind invalid repository name; preserve until rename capability is available. |
| Virtual Food Photographer | `Jokersochi/---` | Real first-party AI food-photography app; preserve, fix secret boundary, then rename. |

## P0 security status

### `monopoly-luxe`
A committed `.env` was found on the default branch during cleanup.

Completed containment:
- removed `.env` from current `main`;
- added explicit `.env` / `.env.*` ignore rules;
- added placeholder-only `.env.example`;
- opened a P0 credential-rotation issue.

Important: deleting the file from the current branch does not remove values from Git history. Any credential that ever appeared there must be treated as exposed until rotated/revoked.

### `---` / Virtual Food Photographer
`services/geminiService.ts` performs Gemini menu parsing and Imagen generation, while `vite.config.ts` serializes `GEMINI_API_KEY` into client-side constants via Vite `define`.

Decision: preserve the product, but move AI calls behind a server-side API before production use. A P0 security issue tracks removal of the browser-bundle secret boundary and credential rotation if a real key has ever been bundled/deployed.

A basic current-branch check did not find committed root `.env` files in `ai-realtor`, `sentinel-markets-ai`, `Product-Visualizer-AI`, `primerochnaya`, or `sochi-realtor-ai`. This is not a substitute for full-history secret scanning.

## Product consolidation status

### Realtor cluster
Canonical: `ai-realtor`.

- `sochi-realtor-ai` is classified as a legacy UI/AI-Studio prototype, not a second production backend. Its Express server is mock-oriented and its dashboard contains hard-coded presentation data. Keep only worthwhile UI/UX concepts.
- `andrej-karpathy-skills` previously contained a hidden `realtyai-mobile.html`; the unique value is limited to mobile UX patterns and should not remain trapped in an unrelated upstream-style repository.
- `SochiHouseApp` remains a legacy/parallel implementation to be compared before archival.

### Monopoly cluster
Canonical: `monopoly-luxe`.

Confirmed sources of unique value:
- `russian-monopoly-local`: Russia-specific 40-cell board/economy, cards, micro-events, localization, trading, mortgage, bankruptcy and other client-side game rules.
- `monopolylux`: server-authoritative Express/Socket.IO rooms, reconnect, quick play, bots and deterministic server game-state transitions.
- `codex`: upstream OpenAI fork polluted by one unique Russian Monopoly MVP commit under `apps/russian-monopoly-mvp/`; extract board/card/contracts/localization/token assets before removing the fork.
- `12345`: older Monopoly Russia prototype; compare before removal.
- `Monopolize-`: low-value AI Studio scaffold candidate, but final unique-code check is still required.

A draft consolidation PR exists in `monopoly-luxe` on branch `cleanup/server-consolidation`; migrated modules remain isolated from production runtime until tests and reconciliation are complete.

### Virtual try-on / makeup cluster
`DeepSeek-R1` is a real fork of `deepseek-ai/DeepSeek-R1`, but it contains custom `makeup-app/` code. The custom app is a legacy CRA prototype with photo upload, `face-api.js` face/landmark detection and static makeup-template UI; it does not perform real generative makeup rendering.

Decision: do not preserve it as a separate active product. Evaluate only its reusable face/landmark concepts inside `primerochnaya`, then remove the polluted upstream fork from the active portfolio after accept/reject is documented.

## Verified clean forks — no unique commits

The following repositories were compared directly with their GitHub upstream parent/default branch and have no unique reachable commits at the audited branch tip:

| Repository | Upstream status | Cleanup decision |
|---|---|---|
| `anthropic-quickstarts` | `ahead_by=0` | safe removal/archive candidate |
| `openai-agents-python` | `ahead_by=0` | safe removal/archive candidate |
| `chrome-devtools-mcp` | `ahead_by=0` | safe removal/archive candidate |
| `ComfyUI-Manager` | `ahead_by=0` | safe removal/archive candidate |
| `ComfyUI-VideoCompressor` | `ahead_by=0`, one upstream commit behind | safe removal/archive candidate |
| `flux` | identical to upstream | safe removal/archive candidate |
| `omi` | `ahead_by=0` | safe removal/archive candidate |
| `opensre` | `ahead_by=0` | safe removal/archive candidate |
| `lobehub` | `ahead_by=0` | safe removal/archive candidate |
| `shellcheck.net` | identical to upstream | safe removal/archive candidate |

These should not be presented as first-party portfolio projects.

## Verified clean imported copy — not a formal GitHub fork

### `https-github.com-hiddify-hiddify-app`
GitHub reports `fork=false`, so normal cross-fork comparison is unavailable. However the repository's current `main` HEAD is commit `769f6a6...`, authored by Hiddify, and the exact same SHA/tree exists in the official `hiddify/hiddify-app` history. The HEAD parent is also the upstream parent commit.

Decision: this is a manually imported historical upstream snapshot, not a first-party product. No first-party HEAD delta needs migration; eligible for removal from the active portfolio after dependency/deployment check.

## Modified forks — extraction/review required

| Repository | Verified delta | Decision |
|---|---|---|
| `DeepSeek-R1` | 5 commits ahead; custom `makeup-app/` present | extract/reject reusable face-detection concepts first |
| `codex` | 1 commit ahead; Russian Monopoly MVP | migrate/reject all unique game assets/code first |
| `Wan2.2` | 14 commits ahead | preserve while reviewing security/performance/UX patch set |
| `compose-for-agents` | 4 commits ahead | preserve while extracting/documenting agent guidance and `run-all.sh` utility |
| `cursor-plugin` | 2 commits ahead, 5 behind; delta is `.snapshots/` config/docs plus merge | no product code; explicitly reject/extract snapshot tooling, then remove fork |

`Wan2.2` custom delta currently includes security hardening around `torch.load(..., weights_only=True)`, explicit external-API error handling, network timeouts, progress descriptions and performance-oriented tensor reshaping. This is a patch set to an upstream project, not a first-party standalone product.

## Template-derived / disposable repositories

### `codesandbox-template-nuxt`
Created from the official CodeSandbox Nuxt template rather than as a GitHub fork. Later commits update old Nuxt 2 dependencies/docs and add generic project tooling. One audit-related commit also added `.project` SQLite/index artifacts and `.snapshots` configuration/docs.

Decision: this is an obsolete development template, not a product. No business/product code migration is required. Eligible for removal after confirming no external deployment depends on it.

### `ai-core`
Repository metadata reports `size=0`. It contains no current implementation.

Decision: remove unless intentionally reserved as a namespace. Current cleanup default is removal because shared code should live in a real package/repository only when it exists.

### Organization demo repositories
- `Jokersochi12343322/demo-repository`
- `Jokersochi12343322/expert-chainsaw-demo-repository`

Both are tiny private repositories with the stock GitHub organization demo README and no identified product role.

Decision: removal candidates; no migration required.

## Ambiguous / naming cleanup

- `-` → real RoomGenius project; preserve and rename to `room-genius` when repository-settings mutation is available.
- `---` → real Virtual Food Photographer; preserve and rename to `virtual-food-photographer` after security/deployment checks.
- `12345` → Monopoly prototype; extract unique value before cleanup.
- `Sentinel-Markets-AI-` → separate Android/Gemini AI Studio app, not the canonical Sentinel SaaS; classify mobile value before archive.
- `Product-Visualizer-AI` → active product; eventually normalize to lowercase kebab-case if redirects/deployments permit.

## Pending classification

Still require evidence-backed unique-value/deployment checks before destructive cleanup:

- `SochiHouseApp`
- `andrej-karpathy-skills`
- `Monopolize-`
- `12345`
- `Sentinel-Markets-AI-`
- any remaining repository not explicitly classified above.

## Cleanup policy

A repository is eligible for destructive removal only when:

1. GitHub parent/upstream relationship is verified where applicable.
2. `ahead_by = 0`, or every unique commit/file has been migrated or explicitly rejected.
3. No active production deployment depends on it.
4. No required issue/PR/history would be lost.
5. Secrets have been rotated if exposure occurred.
6. The canonical destination or explicit no-migration decision is documented.

## Current deletion-ready queue

Subject only to final deployment/dependency checks, the code-value gate is already passed for:

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

The connected GitHub integration currently exposes file/branch/PR/issue mutations but not repository-level delete/archive/rename. Therefore these repositories are documented as deletion-ready rather than falsely marked deleted.

## Next execution queue

### P0
1. Continue `monopoly-luxe` consolidation and tests without wiring unverified migration modules into production.
2. Finish Realtor consolidation around `ai-realtor` and archive legacy prototypes only after UI/value extraction.
3. Rotate credentials associated with the removed `monopoly-luxe/.env` and perform full-history secret scanning.
4. Fix Virtual Food Photographer's Gemini/Imagen secret boundary before production deployment.

### P1
5. Extract/reject `DeepSeek-R1/makeup-app` value into `primerochnaya`.
6. Extract Russian Monopoly code/assets from polluted `codex` fork.
7. Review `Wan2.2`, `compose-for-agents`, and `cursor-plugin` custom deltas.

### P2
8. Delete/archive the 15 deletion-ready repositories once repository-level controls are available and dependency checks pass.
9. Complete unique-value classification for `SochiHouseApp`, `andrej-karpathy-skills`, `Monopolize-`, `12345`, and `Sentinel-Markets-AI-`.
10. Normalize ambiguous repository names after deployment/dependency checks.

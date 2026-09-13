# GitHub Repository Audit — 2026-09-13

This document records evidence-backed repository cleanup decisions for the `Jokersochi` account. The goal is one canonical repository per real product, with third-party forks removed from the active portfolio only after first-party code has been extracted.

## Canonical first-party products

| Product | Canonical repository | Current decision |
|---|---|---|
| AI Realtor | `Jokersochi/ai-realtor` | Canonical production repository. |
| Sentinel Markets AI | `Jokersochi/sentinel-markets-ai` | Canonical market-intelligence SaaS repository. |
| Monopoly Luxe | `Jokersochi/monopoly-luxe` | Canonical game repository; consolidation in progress. |
| Virtual Try-On | `Jokersochi/primerochnaya` | Canonical virtual try-on / future AR direction. |
| Product Visualizer | `Jokersochi/Product-Visualizer-AI` | Active first-party product; later normalize naming if safe. |
| RoomGenius | `Jokersochi/-` | Real product hidden behind invalid repository name; preserve until rename capability is available. |

## P0 security status

### `monopoly-luxe`
A committed `.env` was found on the default branch during cleanup.

Completed containment:
- removed `.env` from current `main`;
- added explicit `.env` / `.env.*` ignore rules;
- added placeholder-only `.env.example`;
- opened a P0 credential-rotation issue.

Important: deleting the file from the current branch does not remove values from Git history. Any credential that ever appeared there must be treated as exposed until rotated/revoked.

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

The following repositories were compared directly with their GitHub upstream parent/default branch and currently have `ahead_by = 0`:

| Repository | Upstream status | Cleanup decision |
|---|---|---|
| `anthropic-quickstarts` | no unique commits | safe removal/archive candidate |
| `openai-agents-python` | no unique commits | safe removal/archive candidate |
| `chrome-devtools-mcp` | no unique commits | safe removal/archive candidate |
| `ComfyUI-Manager` | no unique commits | safe removal/archive candidate |
| `flux` | identical to upstream | safe removal/archive candidate |
| `omi` | no unique commits | safe removal/archive candidate |
| `opensre` | no unique commits | safe removal/archive candidate |
| `lobehub` | no unique commits | safe removal/archive candidate |

These should not be presented as first-party portfolio projects.

## Modified forks — extraction/review required

| Repository | Verified delta | Decision |
|---|---|---|
| `DeepSeek-R1` | 5 commits ahead; custom `makeup-app/` present | extract/reject reusable face-detection concepts first |
| `codex` | 1 commit ahead; Russian Monopoly MVP | migrate/reject all unique game assets/code first |
| `Wan2.2` | 14 commits ahead | preserve while reviewing security/performance/UX patch set |
| `compose-for-agents` | 4 commits ahead | preserve while extracting/documenting agent guidance and `run-all.sh` utility |

`Wan2.2` custom delta currently includes security hardening around `torch.load(..., weights_only=True)`, explicit external-API error handling, network timeouts, progress descriptions and performance-oriented tensor reshaping. This is a patch set to an upstream project, not a first-party standalone product.

## Pending upstream classification

Still require the same evidence-backed parent/delta check before any destructive cleanup:

- `ComfyUI-VideoCompressor`
- `https-github.com-hiddify-hiddify-app`
- `shellcheck.net`
- `cursor-plugin`
- `codesandbox-template-nuxt`
- any other repository that looks imported but is not yet proven to be a pure fork.

## Ambiguous / naming cleanup

- `-` → real RoomGenius project; preserve and rename to `room-genius` when repository-settings mutation is available.
- `---` → generic AI Studio/Gemini scaffold; inspect source purpose before removal.
- `12345` → Monopoly prototype; extract unique value before cleanup.
- `Sentinel-Markets-AI-` → separate Android/Gemini AI Studio app, not the canonical Sentinel SaaS; classify mobile value before archive.
- `ai-core` → empty repository at last inventory; candidate for removal unless intentionally reserved.
- `Product-Visualizer-AI` → active product; eventually normalize to lowercase kebab-case if redirects/deployments permit.

## Cleanup policy

A repository is eligible for destructive removal only when:

1. GitHub parent/upstream relationship is verified where applicable.
2. `ahead_by = 0`, or every unique commit/file has been migrated or explicitly rejected.
3. No active production deployment depends on it.
4. No required issue/PR/history would be lost.
5. Secrets have been rotated if exposure occurred.
6. The canonical destination is documented.

## Next execution queue

### P0
1. Continue `monopoly-luxe` consolidation and tests without wiring unverified migration modules into production.
2. Finish Realtor consolidation around `ai-realtor` and archive legacy prototypes only after UI/value extraction.
3. Rotate credentials associated with the removed `monopoly-luxe/.env` and perform full-history secret scanning.

### P1
4. Extract/reject `DeepSeek-R1/makeup-app` value into `primerochnaya`.
5. Extract Russian Monopoly code/assets from polluted `codex` fork.
6. Review `Wan2.2` and `compose-for-agents` custom patch sets.

### P2
7. Remove verified clean forks from the active account/portfolio when repository delete/archive controls are available.
8. Complete upstream classification for the remaining imported-looking repositories.
9. Normalize ambiguous repository names after deployment/dependency checks.

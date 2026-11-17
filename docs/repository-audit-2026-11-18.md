# Repository Audit — 2026-11-18

Scope: the 39 repositories returned by the connected account's `owner` affiliation listing. This document distinguishes **observed GitHub state**, **prior extraction decisions**, and **pending verification**. It does not claim that a deployment, local machine, or credential has been checked.

## Executive result

- **39 owned repositories; 0 archived** in the current listing.
- No repository was archived, deleted, renamed, or merged by this audit.
- **Critical classification fix:** `-` and `---` are first-party applications, not junk.
- **10 default-branch forks with 0 commits ahead** of upstream were rechecked and remain review candidates only.
- `TradingAgents` is identical to upstream on `main` but has additional named branches; it must not be classified using `main` alone.
- `Wan2.2` has 17 ahead commits as of this audit, versus 14 in the prior audit.
- Security work remains open for `---` (browser API-key injection) and `monopoly-luxe` (historical `.env` and credential rotation).

## Group A — protect first-party products (9)

| Repository | Observed role | Disposition |
| --- | --- | --- |
| `ai-realtor` | Private canonical PropTech product | Preserve |
| `sentinel-markets-ai` | Private canonical analytics product | Preserve |
| `monopoly-luxe` | Private canonical game | Preserve; P0 credential rotation requires verification |
| `primerochnaya` | Public original virtual try-on app | Preserve |
| `Product-Visualizer-AI` | Public original product-visualization app | Preserve |
| `SochiHouseApp` | Private independent parametric house app | Preserve |
| `-` | Public RoomGenius Next.js interior-design app with multiple working branches | **Preserve; rename only after deployment checks** |
| `---` | Private Virtual Food Photographer Gemini/Imagen app | **Preserve; fix API-key injection before launch** |
| `Jokersochi` | Public profile and existing application/control content | Preserve; do not treat as empty profile |

## Group B — unique work / active source preservation (3)

| Repository | Evidence | Disposition |
| --- | --- | --- |
| `russian-monopoly-local` | Public original; last push 2026-11-17; migration source | Preserve until canonical port verified |
| `monopolylux` | Private original server-authoritative multiplayer source | Preserve until canonical port verified |
| `TradingAgents` | Fork `TauricResearch/TradingAgents`; `main` identical to upstream, but `feature/read-only-run-dashboard` and `setup/paper-preview-20261108` exist | **Preserve** until all branches/deployments checked |

## Group C — confirmed upstream-default-branch copies (10)

All comparisons rerun on 2026-11-18. `ahead_by=0` means **only the compared default branch has no commits ahead of upstream**. It does **not** prove other branches, deployments, issues, or local clones are disposable.

| Fork | Upstream | Ahead | Behind | Decision |
| --- | --- | ---: | ---: | --- |
| `anthropic-quickstarts` | `anthropics/claude-quickstarts` | 0 | 49 | Review archive |
| `openai-agents-python` | `openai/openai-agents-python` | 0 | 1263 | Review archive |
| `chrome-devtools-mcp` | `ChromeDevTools/chrome-devtools-mcp` | 0 | 864 | Review archive |
| `ComfyUI-Manager` | `Comfy-Org/ComfyUI-Manager` | 0 | 1509 | Review archive |
| `ComfyUI-VideoCompressor` | `Verolelb/ComfyUI-VideoCompressor` | 0 | 1 | Review archive |
| `flux` | `black-forest-labs/flux` | 0 | 0 | Review archive |
| `omi` | `BasedHardware/omi` | 0 | 33322 | Review archive |
| `opensre` | `Tracer-Cloud/opensre` | 0 | 3317 | Review archive |
| `lobehub` | `lobehub/lobehub` (`canary`) | 0 | 6130 | Review archive |
| `shellcheck.net` | `koalaman/shellcheck.net` (`master`) | 0 | 0 | Review archive |

## Group D — modified upstream forks (6)

Current default-branch comparisons (2026-11-18):

| Fork | Ahead | Behind | Guardrail |
| --- | ---: | ---: | --- |
| `andrej-karpathy-skills` | 4 | 3 | Prior mobile UX extraction documented; confirm no unported changes on branches |
| `codex` | 1 | 12396 | Has original `apps/russian-monopoly-mvp` files; prior migration rejection documented |
| `cursor-plugin` | 2 | 5 | Changes in `.snapshots/`; verify local tooling use |
| `compose-for-agents` | 4 | 15 | `AGENTS.md` and `run-all.sh`; verify active use |
| `DeepSeek-R1` | 5 | 0 | Contains `makeup-app/`; prior migration rejection documented |
| `Wan2.2` | **17** | 21 | Increased from 14 ahead; pushed 2026-11-11; re-review new commits and dependency uses |

Previous decisions remain available in `docs/upstream-fork-delta-decisions.md`; they are not proof that the November version is disposable.

## Group E — legacy / imported / empty; no automatic removal (7)

- `12345` — old Monopoly prototype, prior extraction decision documented; check non-default branches and deployments.
- `Monopolize-` — previous audit found template-only content; confirm current state before removing.
- `ai-core` — repository metadata size 0; check links/configuration before removal.
- `codesandbox-template-nuxt` — template-derived; check downstream use.
- `https-github.com-hiddify-hiddify-app` — imported snapshot, **not a GitHub fork**; repository push date 2026-11-17, so the older source-matching check must be reconfirmed.
- `sochi-realtor-ai` — prior UI migration documented; check deployments and access.
- `Sentinel-Markets-AI-` — prior Android-client pattern extraction documented; check deployments.

## Group F — additional product variants requiring classification (4)

- `Ai-studio-` — private Android/AI Studio tree.
- `aistudio.sentinel.ai` — private Android/AI Studio tree.
- `Sentinel-Lab-by-Argon` — private Android/AI Studio tree.
- `sentinel-honest-insight` — private Sentinel-style web MVP; README explicitly calls for mock data.

These were not adequately classified in the previous public architecture registry. Verify unique code, branch ownership, target application, deployments, and whether useful work has been migrated before any decision.

## P0 security (not fixed by repository classification)

1. `Jokersochi/---`, issue #2: `vite.config.ts` injects `GEMINI_API_KEY` into `process.env.API_KEY` for a client bundle; `services/geminiService.ts` directly invokes Gemini/Imagen. Move calls to authenticated/rate-limited server handlers, remove client bundling, and rotate any credential shipped to a browser. Current repository still has vulnerable mappings.
2. `Jokersochi/monopoly-luxe`, issue #2: a previously committed `.env` was removed from current `main`, but rotation/revocation of values that appeared in Git history is not confirmed.

No secret values are recorded in this audit.

## Mandatory gate before repository archival/deletion

1. Inspect default **and all non-default branches**, open issues/PRs, tags and unique commits.
2. Check deployment, domain, local machine, CI, package, webhook and cross-repository dependencies.
3. Migrate or explicitly reject unique content and verify canonical destination.
4. Review outstanding credential-rotation / security obligations.
5. Prefer archive first where possible; require a verified GitHub state transition to call it done.

**Do not use regex-based name deletion or broad keyword-based “core” classification.** The old scripts `^-+$` and `^\d+$` misclassified actual first-party work.

Detailed execution checklist: [GitHub cleanup issue #77](https://github.com/Jokersochi/Jokersochi/issues/77).

## Coverage limits

The audit verifies GitHub metadata, selected repository trees and fork comparisons. It does **not** establish that every branch, deployment, token, local checkout or consumer has been checked. Accordingly, the number of repos approved for irreversible deletion is **zero**.

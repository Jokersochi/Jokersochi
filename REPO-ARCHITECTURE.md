# GitHub Repository Architecture & Cleanup Policy

**Current source of truth:** [Repository audit — 2026-11-18](./docs/repository-audit-2026-11-18.md). Historical audit: [2026-09-13](./docs/repository-audit-2026-09-13.md). Tracking checklist: [Issue #77](https://github.com/Jokersochi/Jokersochi/issues/77).

## Latest verified state
- **39 owned repositories** listed on 2026-11-18; **none archived** at the time of the audit.
- Repositories can contain distinct work in non-default branches. `ahead_by=0` for `main` is not permission to archive the repository.
- No repository-level rename/archive/delete operation has been executed by this cleanup.

## Groups

### CORE — canonical first-party products
- `ai-realtor` (private), `sentinel-markets-ai` (private), `monopoly-luxe` (private).
- `primerochnaya`, `Product-Visualizer-AI` (public).
- `SochiHouseApp` (private, independent product).
- `-` — **RoomGenius** (public Next.js product with working branches; preserve).
- `---` — **Virtual Food Photographer** (private product; preserve, **P0 Gemini API-key exposure risk**).
- `Jokersochi` — active profile/control repository; it also contains application content, so never treat it as a disposable README-only scaffold.

### PRODUCT MIGRATION / ACTIVE WORK — preserve
- `russian-monopoly-local` — original game rules and content; active November pushes.
- `monopolylux` — original server-authoritative multiplayer source.
- `TradingAgents` — fork with `feature/read-only-run-dashboard` and `setup/paper-preview-20261108`; source work may exist outside default `main`.

### UPSTREAM FORKS — verified 0 commits ahead on default branch
- `anthropic-quickstarts`, `openai-agents-python`, `chrome-devtools-mcp`
- `ComfyUI-Manager`, `ComfyUI-VideoCompressor`, `flux`
- `omi`, `opensre`, `lobehub`, `shellcheck.net`

These **10 are archive-review candidates only**. Verify all branches, deployments and required history before any action.

### UPSTREAM FORKS WITH UNIQUE COMMITS — no automatic cleanup
- `andrej-karpathy-skills` (ahead 4)
- `codex` (ahead 1)
- `cursor-plugin` (ahead 2)
- `compose-for-agents` (ahead 4)
- `DeepSeek-R1` (ahead 5)
- `Wan2.2` (**ahead 17**; updated after the prior audit)

Use [fork delta decisions](./docs/upstream-fork-delta-decisions.md) for past reasoning; recheck November changes in `Wan2.2`.

### LEGACY / IMPORT / EMPTY — needs dependency checks
- `12345`, `Monopolize-` — older Monopoly experiments.
- `ai-core` — empty.
- `codesandbox-template-nuxt` — template-derived.
- `https-github.com-hiddify-hiddify-app` — imported copy, not marked as fork; push activity in November.
- `sochi-realtor-ai`, `Sentinel-Markets-AI-` — legacy source trees.

### UNCLASSIFIED PRODUCT VARIANTS — audit before consolidation
- `Ai-studio-`
- `aistudio.sentinel.ai`
- `Sentinel-Lab-by-Argon`
- `sentinel-honest-insight`

They may contain unique UI, data models or code; the word `sentinel` is not sufficient proof of equivalence.

## Naming policy
- New original products: descriptive lowercase kebab-case; prefixes `ai-`, `lab-`, `infra-` only where helpful.
- Preserve upstream fork names for traceability.
- Never automatically archive a repo matching `^-+$`, `^\d+$`, `^https-.*`, or other name patterns.
- Do not rename mature active repos until deployment URLs, package dependencies and CI references are checked.

## Security blockers
- `---` / issue #2: build-time substitution of `GEMINI_API_KEY` into browser code is unsafe. Move model calls to a server-side API; don't deploy a real key to the client.
- `monopoly-luxe` / issue #2: historical `.env` exposure; rotating/revoking affected credentials is not yet verified.

## Cleanup execution gate
Before archive/delete, verify:
1. Every branch / tag / unique change and pending PR / issue.
2. Deployment, automation, package, domain and local usage.
3. Extracted/declined unique work with a verified canonical destination.
4. Credential containment and history requirements.
5. Repository-level action was authorized and **GitHub state re-read** after execution.

Current GitHub connector exposes repository content, PR and issue updates but **not** repository-level archival, deletion or renaming. Document pending admin work; do not mark it completed without confirmation.

**Status:** Audit/documentation current as of 2026-11-18; *0 repositories actually archived/deleted*.

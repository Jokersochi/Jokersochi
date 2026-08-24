# GitHub Repository Audit — 2026-08-24

## Goal
Create one canonical repository per real project, separate upstream/reference forks from owned products, and remove ambiguous repository names without losing unique code.

## Canonical product repositories

| Project | Canonical repository | Action |
|---|---|---|
| AI Realtor | `Jokersochi/ai-realtor` | Canonical production repository. Continue consolidation here. |
| Sentinel Markets AI | `Jokersochi/sentinel-markets-ai` | Canonical backend/web/Telegram SaaS repository. |
| Monopoly Luxe | `Jokersochi/monopoly-luxe` | Preferred canonical game repository pending unique-code comparison. |
| AI Product Visualizer | `Jokersochi/Product-Visualizer-AI` | Active product; later normalize name to kebab-case if safe. |
| AI Fitting Room | `Jokersochi/primerochnaya` | Active product. |
| RoomGenius | `Jokersochi/-` | Real product hidden behind invalid name; preserve code and rename when repository-settings write access is available. |

## Duplicate / extraction clusters

### Realtor cluster
- `ai-realtor` — canonical.
- `sochi-realtor-ai` — legacy/parallel implementation; compare unique code before archive.
- `SochiHouseApp` — legacy product branch; security cleanup already started; compare unique code before archive.
- `andrej-karpathy-skills` — mixed-purpose extraction source; RealtyAI-specific unique code belongs in `ai-realtor`, unrelated upstream material must not be copied.

### Sentinel cluster
- `sentinel-markets-ai` — canonical, mature architecture.
- `Sentinel-Markets-AI-` — separate AI Studio Android/Gemini app; not the canonical SaaS. Preserve until unique mobile value is classified, then either extract mobile client or archive.

### Monopoly cluster
- `monopoly-luxe` — strongest current canonical candidate.
- `monopolylux` — private parallel implementation; compare before consolidation.
- `russian-monopoly-local` — older public prototype; preserve history, then archive after unique logic/assets are migrated.
- `12345` — confirmed Monopoly Russia prototype despite meaningless repository name; extract unique code/assets before archive.
- `Monopolize-` — near-empty AI Studio scaffold; low-value archive/delete candidate after final diff check.

## Reference / upstream-style repositories

These names strongly indicate imported, forked, template, or reference code and should not be presented as first-party products unless unique commits are proven:

- `DeepSeek-R1`
- `anthropic-quickstarts`
- `ComfyUI-Manager`
- `codex`
- `compose-for-agents`
- `Wan2.2`
- `flux`
- `https-github.com-hiddify-hiddify-app`
- `shellcheck.net`
- `openai-agents-python`
- `chrome-devtools-mcp`
- `omi`
- `opensre`
- `lobehub`
- `codesandbox-template-nuxt`

Policy: compare against upstream or inspect unique commits before any deletion. Pure forks with no unique code should be removed from the active portfolio; useful references may be archived instead.

## Ambiguous / cleanup candidates

- `---` — generic AI Studio Node/Gemini scaffold; classify actual app purpose from source before archive.
- `ai-core` — empty repository (`size=0`); candidate for removal unless intentionally reserved as a future shared package.
- `cursor-plugin` — tiny repository; determine whether it contains unique code.
- `ComfyUI-VideoCompressor` — tiny but may be unique; preserve until inspected.

## Safety rules

1. Never delete a repository before unique-code comparison.
2. Never move secrets through chat or commit `.env` files.
3. Production repositories stay private unless publication is explicitly intended.
4. Use LF line endings only (`* text=auto eol=lf`).
5. One real product = one canonical repository.
6. Old implementations become archived references after migration, not competing active repositories.
7. Third-party/upstream code is never mixed into first-party product repositories without a clear dependency/vendor reason and license review.

## Priority execution order

### P0 — canonicalization
1. Finish Realtor cluster extraction into `ai-realtor`.
2. Classify `Sentinel-Markets-AI-` mobile code against `sentinel-markets-ai`.
3. Consolidate Monopoly cluster into `monopoly-luxe`.
4. Recover and rename RoomGenius from repository `-`.

### P1 — portfolio cleanup
5. Audit all upstream-style repositories for unique commits.
6. Archive/remove pure forks with zero unique code.
7. Classify `---`, `ai-core`, `cursor-plugin`, and `ComfyUI-VideoCompressor`.

### P2 — repository standards
8. Apply LF-only `.gitattributes` to owned active projects.
9. Standardize README, `.env.example`, SECURITY, CONTRIBUTING, tests, CI, and docs where appropriate.
10. Keep profile README as the single navigation hub.

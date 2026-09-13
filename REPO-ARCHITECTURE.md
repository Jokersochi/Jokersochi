# Repository Architecture & Cleanup Registry

This file is the source of truth for organizing the `Jokersochi` GitHub account.

## Classification

### CORE — original products

- `primerochnaya` — public, original repository
- `Product-Visualizer-AI` — public, original repository
- `ai-realtor` — private, active product
- `sentinel-markets-ai` — private, active product
- `Jokersochi` — public profile/control repository

### FORKS — confirmed upstream copies

These repositories are confirmed forks and currently have **0 commits ahead of upstream** on their default branch. They should not be presented as original projects.

- `anthropic-quickstarts` → upstream `anthropics/claude-quickstarts`; ahead: 0
- `openai-agents-python` → upstream `openai/openai-agents-python`; ahead: 0

Recommended admin action: archive or delete after final review. Prefer archive first when uncertain.

### AUDIT QUEUE — verify before archive/delete

Likely external/upstream repositories that require the same fork-vs-upstream comparison before any destructive action:

- `chrome-devtools-mcp`
- `codex`
- `ComfyUI-Manager`
- `ComfyUI-VideoCompressor`
- `DeepSeek-R1`
- `flux`
- `lobehub`
- `omi`
- `opensre`
- `compose-for-agents`
- `cursor-plugin`
- `andrej-karpathy-skills`

### NOISE / NAMING REVIEW

Repositories with weak or accidental names should be checked for unique content before archive/delete:

- `-`
- `---`
- `12345`
- `https-github.com-hiddify-hiddify-app`

## Rules

1. Never delete a repository until unique commits/files have been checked against upstream.
2. Pure forks with `ahead_by = 0` should be archived or deleted unless they serve a documented dependency/workflow purpose.
3. Private repositories should not be linked from the public profile README unless intentionally exposed.
4. Public portfolio should feature only original, accessible repositories.
5. Prefer descriptive repository names. Avoid placeholder or imported-URL names.
6. New experimental work should use `lab-*` when appropriate; infrastructure may use `infra-*`; AI-first products may use `ai-*` when the name benefits from it.
7. Do not rename mature repositories solely to satisfy a prefix convention; clarity and stable URLs are more important.

## Cleanup Order

1. Confirm pure forks (`ahead_by = 0`).
2. Remove them from the public showcase immediately.
3. Archive/delete confirmed pure forks through GitHub admin controls.
4. Verify noisy repositories for unique code.
5. Audit remaining repositories and classify CORE / FORK / LAB / INFRA / ARCHIVE.
6. Standardize README, description, topics, license, and CI only for repositories that remain active.

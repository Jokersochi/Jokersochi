# Upstream Fork Delta Decisions — 2026-09-13

This file records first-party decisions for modified upstream forks so they can be cleaned without losing the reasoning behind local patches.

## `Jokersochi/Wan2.2`

Upstream: `Wan-Video/Wan2.2`.

Verified local branch delta was 14 commits ahead at audit time. The net changes are upstream maintenance patches, not a first-party product.

### Security / reliability patches
- `torch.load(..., weights_only=True)` for multiple checkpoint loads.
- Explicit exceptions instead of production-critical `assert` checks in prompt extension / external API handling.
- Timeout on remote image download requests.

### Performance patch
- Replaces generalized `einsum`/`math.prod` work in repeated `unpatchify` paths with explicit multiplication, `permute`, and `reshape`.

### CLI/UX patches
- Adds descriptive `tqdm` labels for sampling, pose processing, mask processing, frame saving and SAM2 propagation.

### Tooling-only files
- `AGENTS.md` with Cursor Cloud instructions.
- `.jules/*` learning notes.

### Decision
Do not promote this fork as a Jokersochi product or maintain a permanent divergent model repository.

The security/performance/UX changes are useful upstream-quality patch ideas, but they are tightly coupled to Wan upstream internals. They should be contributed upstream or re-applied to a future upstream checkout only if still relevant. They do not belong in another first-party product repository.

No migration into CORE products is required. Subject to a final check that no local/deployed video workflow depends on this exact fork/commit, `Jokersochi/Wan2.2` is deletion/archive-ready.

## `Jokersochi/compose-for-agents`

Upstream: Docker `compose-for-agents` demo repository.

Verified local delta consists primarily of:
- repository-specific `AGENTS.md` instructions for that Docker demo monorepo and Cursor Cloud environment;
- `run-all.sh`, a convenience wrapper that discovers top-level Compose demo directories and runs `docker compose up -d --build` for all of them;
- merge commits for those changes.

### Decision
Do not migrate either artifact into canonical product repositories:
- `AGENTS.md` is specific to the upstream demo monorepo and its language/toolchain matrix;
- `run-all.sh` is a broad demo launcher and is not appropriate production orchestration for independent first-party services.

Reusable principles such as scoped agent instructions, no committed secrets, and repository-specific validation already exist in the canonical project governance.

Subject to a final deployment/dependency check, `Jokersochi/compose-for-agents` is deletion/archive-ready.

## `Jokersochi/cursor-plugin`

Upstream: `supabase-community/cursor-plugin`.

Verified delta: two commits ahead and five behind at audit time. The only meaningful additions are generic `.snapshots/` configuration/documentation plus a merge commit.

### Decision
No product or reusable infrastructure migration is required. The snapshot metadata is explicitly rejected as portfolio value. Subject to dependency/deployment check, the fork is deletion/archive-ready.

## General rule

Modified third-party forks are not kept merely because local automation produced commits. A fork remains only when at least one of these is true:

1. the account intentionally maintains a long-lived downstream distribution;
2. a production deployment depends on the downstream changes;
3. the changes are meaningful first-party product code that has not yet been extracted;
4. the fork exists to support an active upstream contribution workflow.

Otherwise, record the decision, migrate any genuinely reusable first-party value, and remove/archive the fork.

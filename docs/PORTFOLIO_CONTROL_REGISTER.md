# GitHub Portfolio Control Register

> Updated: 11 August 2026  
> Owner: Jokersochi  
> Control issue: [#57](https://github.com/Jokersochi/Jokersochi/issues/57)

This document is the operational register for portfolio cleanup. It does **not** authorize a merge, archive, deletion, deployment, or change of production settings by itself.

## Safety rules

1. Never push directly to `main` / `master`.
2. One task, one branch, one PR.
3. A repository may be deleted only after a source/upstream comparison, branch/PR/issue/deployment/dependency check, and a recovery reference.
4. A repository with product code, custom commits, user-facing URLs, releases, packages, or unresolved provenance is `KEEP`, `EXTRACT`, or `QUARANTINE` — not `DELETE`.
5. A failed deployment is diagnosed from its own logs; application code is not changed merely to satisfy a stale hosting project.
6. No secret, token, database URL, or personal data is stored in this register.

## Current portfolio snapshot

| Metric | Verified state |
|---|---:|
| Repositories | 34 |
| Public / private | 24 / 10 |
| Archived repositories | 0 |
| Open pull requests | at least 251 |
| Main PR fan-out | Wan2.2 ≥100; russian-monopoly-local 90; `-` 52 |

The detailed fork decision record lives in [#58](https://github.com/Jokersochi/Jokersochi/issues/58). Product extraction is governed by [#59](https://github.com/Jokersochi/Jokersochi/issues/59).

## Canonical product decisions

| Product | Canonical repository | Status |
|---|---|---|
| RealtyAI | `Jokersochi/ai-realtor` | P0 consolidation: [#28](https://github.com/Jokersochi/ai-realtor/issues/28) |
| Sentinel Markets AI | `Jokersochi/sentinel-markets-ai` | P0 architecture baseline: [#2](https://github.com/Jokersochi/sentinel-markets-ai/issues/2) |
| Monopoly | `Jokersochi/monopolylux` (provisional) | P0 source comparison: [#2](https://github.com/Jokersochi/monopolylux/issues/2) |
| Sochi House | `Jokersochi/SochiHouseApp` | P0 launch/branch audit: [#1](https://github.com/Jokersochi/SochiHouseApp/issues/1) |
| Profile and governance | `Jokersochi/Jokersochi` | profile/docs/orchestration only |

## P0 execution queue

| Order | Action | Evidence / tracker | State |
|---:|---|---|---|
| 1 | Switch SochiHouseApp default branch to `main` | `codex/launch-readiness` has no unique commits and is one commit behind `main`; [#1](https://github.com/Jokersochi/SochiHouseApp/issues/1) | ready; GitHub settings action pending |
| 2 | Stop PR fan-out and create a disposition register | Wan2.2, russian-monopoly-local, `-` | active audit |
| 3 | Complete fork forensics and prepare exact deletion manifest | [#58](https://github.com/Jokersochi/Jokersochi/issues/58) | active audit |
| 4 | Fix Vercel configuration drift for RealtyAI | duplicate Next.js projects and stale Vite project; [#37](https://github.com/Jokersochi/ai-realtor/issues/37) | root cause confirmed |
| 5 | Reconnect MonopolyLux Vercel project | project currently deploys `Wan2.2`; [#6](https://github.com/Jokersochi/monopolylux/issues/6) | root cause confirmed |
| 6 | Extract Sentinel Android UX safely | mobile prototype contains client-side provider access and simulated data; [#3](https://github.com/Jokersochi/sentinel-markets-ai/issues/3) | planned |
| 7 | Consolidate RealtyAI and Monopoly sources | [RealtyAI #28](https://github.com/Jokersochi/ai-realtor/issues/28), [Monopoly #2](https://github.com/Jokersochi/monopolylux/issues/2) | active audit |

## Quarantine rules

The following repositories have ambiguous provenance, unintuitive names, or active PR histories. They cannot enter a deletion manifest before individual evidence is recorded:

- `12345`
- `---`
- `-`
- `https-github.com-hiddify-hiddify-app`
- `ai-core`
- all product-bearing forks and sources listed in [#58](https://github.com/Jokersochi/Jokersochi/issues/58)

## Definition of done

Portfolio cleanup is complete only when every repository has a verified lifecycle status, every active product has one canonical home and one tested deployment, the PR backlog has a recorded disposition, and each deletion has a recovery trail.

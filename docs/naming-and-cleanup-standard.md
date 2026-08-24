# Repository Naming & Cleanup Standard

## Naming

Use lowercase kebab-case for first-party repositories:

- `ai-realtor`
- `sentinel-markets-ai`
- `monopoly-luxe`
- `product-visualizer-ai`
- `room-genius`

Avoid:
- numeric placeholders (`12345`)
- punctuation-only names (`-`, `---`)
- trailing punctuation (`Sentinel-Markets-AI-`, `Monopolize-`)
- URL pasted into repository name (`https-github.com-hiddify-hiddify-app`)
- inconsistent casing for new first-party projects

## Canonicalization

Each product must have exactly one canonical active repository. Alternate implementations are classified as one of:

- `extract` — migrate unique code into canonical repo;
- `archive` — preserve history but stop active development;
- `reference` — third-party/upstream code retained only as reference;
- `remove` — pure fork/template/empty repo with no unique value.

## Repository baseline

Owned active projects should normally include:

- `README.md`
- `.gitignore`
- `.gitattributes`
- `.env.example` when environment configuration exists
- `LICENSE` when publication/licensing is intentional
- `SECURITY.md` for externally exposed applications
- `CONTRIBUTING.md` for collaborative/open projects
- `docs/`
- automated tests
- CI workflow

Do not add boilerplate files blindly to third-party forks or archived references.

## Line endings

All maintained repositories use LF-only normalization:

```gitattributes
* text=auto eol=lf
```

Local Git configuration should use `core.autocrlf=false` and `core.eol=lf` when working on these repositories.

## Destructive cleanup gate

A repository can be deleted only when all are true:

1. Canonical destination is identified or no destination is required.
2. Unique commits/files have been checked.
3. No required deployment points to the repository.
4. No active PR/issue contains required work that would be lost.
5. No secrets need rotation/evidence preservation first.
6. Any required unique code has been migrated and verified.

Until all six conditions pass, archive is safer than delete.

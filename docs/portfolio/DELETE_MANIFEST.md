# Proven-Clean Fork Deletion Manifest

> Checked: 11 August 2026  
> Governing issue: [#58](https://github.com/Jokersochi/Jokersochi/issues/58)  
> Status: deletion candidates only — do not delete through a bulk script.

Each repository below passes the strict safety gate:

- no local commits not present in upstream;
- no side branches;
- no open PR or issue;
- no release, tag, deployment, package or GitHub Pages site;
- no indexed reference from another Jokersochi repository;
- exact upstream and recovery commit recorded.

| Repository | Upstream | Recovery reference | Comparison | Verdict |
|---|---|---|---|---|
| `Jokersochi/flux` | `black-forest-labs/flux` | `802fb4713906133fcbd0d8dc5351620ca4773036` | main is identical, ahead 0 / behind 0 | DELETE CANDIDATE |
| `Jokersochi/shellcheck.net` | `koalaman/shellcheck.net` | `7edea01d7cda00acb9f12f5746fd00dc4271f689` | master is identical, ahead 0 / behind 0 | DELETE CANDIDATE |
| `Jokersochi/opensre` | `Tracer-Cloud/opensre` | `08b33468850bfda5f955f6343544521efd11bc35` | main is an upstream ancestor, ahead 0 / behind 2066 | DELETE CANDIDATE |

## Exclusions

All other audited forks remain excluded from deletion because they have at least one of:

- unique commits, branches or unmerged PRs;
- product code or custom assets;
- open bot PRs that require a recorded disposition;
- an unverified dependency, deployment, release or history condition.

## Execution sequence

1. Verify this manifest once more at action time.
2. Delete one repository at a time in GitHub Settings.
3. Confirm the repository page returns not found.
4. Record the exact time and result in Issue #58.
5. Stop immediately if GitHub reports a dependency, transfer, or recovery concern.

All three fork repositories were also verified to have zero tag refs.\n\nNo repository was archived or deleted while this document was created.

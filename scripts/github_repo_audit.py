#!/usr/bin/env python3
"""Read-only GitHub repository auditor. No third-party Python packages.

Never archives, renames, deletes, or writes to GitHub. Uses only GET.
Optional GITHUB_TOKEN / GH_TOKEN enables access to private repositories
if the token actually has repository metadata read permissions.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.github.com"
PROTECT = {
    "-", "---", "Jokersochi", "ai-realtor", "sentinel-markets-ai",
    "monopoly-luxe", "monopolylux", "russian-monopoly-local",
    "primerochnaya", "Product-Visualizer-AI", "SochiHouseApp",
    "TradingAgents",
}


def get_json(path: str, token: str | None):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Jokersochi-read-only-repo-audit",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(API + path, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        # Never log request headers or tokens.
        raise RuntimeError(f"GitHub GET {path}: HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"GitHub GET {path}: network error") from exc


def list_pages(path: str, token: str | None, max_pages: int = 100):
    results = []
    for page in range(1, max_pages + 1):
        sep = "&" if "?" in path else "?"
        batch = get_json(f"{path}{sep}per_page=100&page={page}", token)
        if not isinstance(batch, list):
            raise RuntimeError(f"Expected a GitHub list response from {path}")
        results.extend(batch)
        if len(batch) < 100:
            return results
    raise RuntimeError(f"Pagination incomplete for {path}; refusing partial audit")


def disposition(name: str, fork: bool, ahead: int | None,
                branch_count: int | None, archived: bool, size: int):
    """Conservative advice ONLY. Never a deletion authorization."""
    if archived:
        return "ALREADY_ARCHIVED"
    if name in PROTECT:
        return "PROTECT"
    if not fork:
        return "REVIEW_EMPTY" if size == 0 else "REVIEW_ORIGINAL_OR_IMPORT"
    if branch_count is None or branch_count > 1:
        return "REVIEW_FORK_BRANCHES"
    if ahead == 0:
        return "REVIEW_SINGLE_BRANCH_UPSTREAM_COPY"
    return "PRESERVE_OR_REVIEW_UNIQUE_FORK"


def repository_audit(owner: str, token: str | None):
    encoded_owner = urllib.parse.quote(owner, safe="")
    if token:
        all_repos = list_pages("/user/repos?affiliation=owner", token)
        coverage = "authenticated_owner_access"
    else:
        all_repos = list_pages(f"/users/{encoded_owner}/repos", token)
        coverage = "public_repositories_only"

    rows = []
    for repo in all_repos:
        if repo.get("owner", {}).get("login", "").lower() != owner.lower():
            continue
        name = repo["name"]
        full = f"{encoded_owner}/{urllib.parse.quote(name, safe='')}"
        branches = list_pages(f"/repos/{full}/branches", token)
        branch_names = [b["name"] for b in branches]
        ahead = behind = None
        compare_error = None
        upstream = None
        if repo.get("fork"):
            details = get_json(f"/repos/{full}", token)
            parent = details.get("parent")
            if parent:
                upstream = parent["full_name"]
                base_ref = urllib.parse.quote(parent["default_branch"], safe="")
                head_ref = urllib.parse.quote(repo["default_branch"], safe="")
                compare = (
                    f"/repos/{upstream}/compare/"
                    f"{base_ref}...{encoded_owner}:{head_ref}"
                )
                try:
                    result = get_json(compare, token)
                    ahead, behind = result["ahead_by"], result["behind_by"]
                except (RuntimeError, KeyError) as exc:
                    compare_error = str(exc)
            else:
                compare_error = "Upstream repository unavailable"

        rows.append({
            "name": name,
            "visibility": "private" if repo.get("private") else "public",
            "archived": bool(repo.get("archived")),
            "fork": bool(repo.get("fork")),
            "upstream": upstream,
            "default_branch": repo.get("default_branch"),
            "branch_count": len(branch_names),
            "branch_names": branch_names,
            "ahead_of_upstream_default": ahead,
            "behind_upstream_default": behind,
            "compare_error": compare_error,
            "size_kb": repo.get("size", 0),
            "last_pushed": repo.get("pushed_at"),
            "disposition": disposition(
                name, bool(repo.get("fork")), ahead, len(branch_names),
                bool(repo.get("archived")), int(repo.get("size", 0)),
            ),
        })
    return {
        "owner": owner,
        "coverage": coverage,
        "read_only": True,
        "github_mutations_performed": 0,
        "repository_count": len(rows),
        "archived_count": sum(r["archived"] for r in rows),
        "repositories": sorted(rows, key=lambda r: r["name"].lower()),
        "warning": (
            "No status is an archive/delete approval. Review unique work "
            "on every branch, deployments, secrets, issues and local copies."
        ),
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--owner", default="Jokersochi")
    parser.add_argument(
        "--output", default="-",
        help="JSON report path, or '-' for stdout. A private audit may expose repository names.",
    )
    args = parser.parse_args(argv)
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    try:
        report = repository_audit(args.owner, token)
    except (RuntimeError, ValueError, KeyError) as exc:
        print(f"Audit failed safely: {exc}", file=sys.stderr)
        return 1
    payload = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.output == "-":
        sys.stdout.write(payload)
    else:
        with open(args.output, "w", encoding="utf-8") as output:
            output.write(payload)
        print(
            f"Saved {report['repository_count']} repositories to {args.output} "
            f"({report['coverage']}). No GitHub changes made."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())

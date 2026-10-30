#!/usr/bin/env python3
"""Fetch public GitHub repositories for the portfolio.

Writes data/repos.json. Uses only the Python standard library so it can run
in a bare GitHub Actions job with no install step.

Environment:
    GITHUB_TOKEN   optional token; raises the API limit and enables pinned repos
    GITHUB_USER    GitHub login to read (default: xlisrael)
    REPO_LIMIT     maximum number of repositories to publish (default: 6)

Selection order:
    1. Pinned repositories (when a token is available)
    2. Names in FEATURED, in the order listed below
    3. Most recently pushed repositories, as a fallback
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.github.com"
USER = os.environ.get("GITHUB_USER", "xlisrael").strip()
TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
LIMIT = max(1, int(os.environ.get("REPO_LIMIT", "6")))
OUT = Path(__file__).resolve().parent.parent / "data" / "repos.json"
OUT_JS = OUT.with_suffix(".js")

# Repositories to show first, in this order. Add or remove names freely.
FEATURED = [
    "focuslockapp",
    "hng13-stage3-audiophile-ecommerce-app",
    "hng13-stage3-todoapp",
    "expensetracker",
    "studentbudgettracker",
    "python-digital-marketplace-dapp",
]

# Never publish these, even if they would otherwise be selected.
EXCLUDE = {
    USER.lower(),
    "bootstrap",
    "congrats",
    "dotstudentbudgettracker",
    "expenseappresources",
    "portfolio",
    "portfolio-site",
    "skills-introduction-to-github",
    "work",
    "birthday",
    "novel_verse",
}


def request_json(url: str, *, data: bytes | None = None):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "excel-portfolio-repo-fetcher",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    if data is not None:
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def fetch_repositories() -> list[dict]:
    repositories: list[dict] = []
    for page in range(1, 6):
        page_items = request_json(
            f"{API}/users/{USER}/repos"
            f"?per_page=100&page={page}&sort=pushed&direction=desc&type=owner"
        )
        if not isinstance(page_items, list):
            raise RuntimeError("GitHub returned an unexpected repository payload")
        repositories.extend(page_items)
        if len(page_items) < 100:
            break
    return repositories


def fetch_pinned_names() -> list[str]:
    if not TOKEN:
        return []

    query = """
    query($login: String!) {
      user(login: $login) {
        pinnedItems(first: 20, types: [REPOSITORY]) {
          nodes {
            ... on Repository { name }
          }
        }
      }
    }
    """
    payload = json.dumps({"query": query, "variables": {"login": USER}}).encode()
    try:
        result = request_json(f"{API}/graphql", data=payload)
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        print(f"Pinned repositories unavailable: {error}", file=sys.stderr)
        return []

    nodes = (((result.get("data") or {}).get("user") or {}).get("pinnedItems") or {}).get(
        "nodes"
    ) or []
    return [node["name"] for node in nodes if isinstance(node, dict) and node.get("name")]


def clean_repo(repo: dict) -> dict:
    description = " ".join((repo.get("description") or "").split())
    topics = [str(topic) for topic in (repo.get("topics") or []) if topic][:4]
    homepage = (repo.get("homepage") or "").strip()
    if homepage and not homepage.lower().startswith(("http://", "https://")):
        homepage = ""

    return {
        "name": repo["name"],
        "description": description,
        "url": repo["html_url"],
        "homepage": homepage,
        "language": repo.get("language") or "",
        "stars": int(repo.get("stargazers_count") or 0),
        "forks": int(repo.get("forks_count") or 0),
        "topics": topics,
        "pushed_at": repo.get("pushed_at") or repo.get("updated_at") or "",
    }


def main() -> int:
    try:
        raw = fetch_repositories()
    except urllib.error.HTTPError as error:
        print(f"GitHub API error: {error.code} {error.reason}", file=sys.stderr)
        return 1
    except (urllib.error.URLError, TimeoutError) as error:
        print(f"Could not reach GitHub: {error}", file=sys.stderr)
        return 1
    except (RuntimeError, ValueError) as error:
        print(f"Unexpected GitHub response: {error}", file=sys.stderr)
        return 1

    available: dict[str, dict] = {}
    for repo in raw:
        name = repo.get("name", "")
        if not name or repo.get("fork") or repo.get("archived"):
            continue
        if name.lower() in EXCLUDE:
            continue
        available[name] = clean_repo(repo)

    pinned = [name for name in fetch_pinned_names() if name in available]
    featured = [name for name in FEATURED if name in available]

    chosen: list[str] = []
    for name in pinned + featured:
        if name not in chosen:
            chosen.append(name)

    if len(chosen) < LIMIT:
        remaining = sorted(
            (repo for name, repo in available.items() if name not in chosen),
            key=lambda repo: (repo["stars"], repo["pushed_at"]),
            reverse=True,
        )
        for repo in remaining:
            chosen.append(repo["name"])
            if len(chosen) >= LIMIT:
                break

    selected = [available[name] for name in chosen[:LIMIT]]
    payload = {"user": USER, "repos": selected}

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    OUT_JS.write_text(
        "/* Generated by tools/fetch-repos.py. Do not edit by hand. */\n"
        "window.PORTFOLIO_REPOS = "
        + json.dumps(payload, indent=2, ensure_ascii=True)
        + ";\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {len(selected)} repositories to "
        f"{OUT.relative_to(OUT.parent.parent)} and {OUT_JS.relative_to(OUT.parent.parent)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

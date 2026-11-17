#!/usr/bin/env python3
"""Fetch GitHub repos matching config.yaml `ticker.query` -> data/repo-ticker.csv.

Needs GITHUB_TOKEN (search API). Sorted by stars, descending.
"""
import csv
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from listkit import core  # noqa: E402

FIELDS = ["full_name", "url", "stars", "description", "pushed_at"]
OUT = core.DATA_DIR / "repo-ticker.csv"


def main() -> None:
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise core.ListError("GITHUB_TOKEN is not set")
    tcfg = core.load_config().get("ticker") or {}
    query = tcfg.get("query", "MNQ futures")
    limit = int(tcfg.get("limit", 12))
    url = "https://api.github.com/search/repositories?" + urllib.parse.urlencode(
        {"q": query, "sort": "stars", "order": "desc", "per_page": min(limit, 100)}
    )
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "quint-ticker",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        items = json.load(resp).get("items", [])[:limit]
    core.DATA_DIR.mkdir(exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS, lineterminator="\n")
        w.writeheader()
        for it in items:
            w.writerow(
                {
                    "full_name": it["full_name"],
                    "url": it["html_url"],
                    "stars": it["stargazers_count"],
                    "description": " ".join((it.get("description") or "").split()),
                    "pushed_at": it.get("pushed_at", ""),
                }
            )
    print(f"wrote {OUT.relative_to(core.ROOT)} ({len(items)} repos for {query!r})")


if __name__ == "__main__":
    core.run_cli(main)

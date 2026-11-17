#!/usr/bin/env python3
"""Append one resource to the CSV: mint its ID, validate category, dedupe by link."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from listkit import core  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--display-name", required=True)
    p.add_argument("--category", required=True)
    p.add_argument("--link", required=True)
    p.add_argument("--subcategory", default="")
    p.add_argument("--author-name", default="")
    p.add_argument("--author-link", default="")
    p.add_argument("--description", default="")
    a = p.parse_args()

    cfg = core.load_config()
    rows = core.load_rows()
    category, sub = core.resolve_category(cfg, a.category, a.subcategory)
    link = core.validate_link(a.link)
    author_link = core.validate_link(a.author_link, "author link") if a.author_link else ""
    name = a.display_name.strip()
    if not name:
        raise core.ListError("display name is empty")

    for row in rows:
        if core.normalize_link(row["Link"]) == core.normalize_link(link):
            raise core.ListError(f"{link} is already listed as {row['ID']} ({row['Display Name']})")

    rid = core.mint_id(core.category_prefix(cfg, category), link, {r["ID"] for r in rows})
    rows.append(
        {
            "ID": rid,
            "Display Name": name,
            "Category": category,
            "Sub-Category": sub,
            "Link": link,
            "Author Name": a.author_name.strip(),
            "Author Link": author_link,
            "Description": " ".join(a.description.split()),
            "Active": "Yes",
            "Date Added": core.today(),
            "Last Modified": core.today(),
        }
    )
    core.save_rows(rows)
    print(f"added {rid}: {name} -> {category}{' / ' + sub if sub else ''}")


if __name__ == "__main__":
    core.run_cli(main)

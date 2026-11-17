#!/usr/bin/env python3
"""Edit one resource's link/name/author/description in place. Category moves: move_resource.py."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from listkit import core  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--id", default="")
    p.add_argument("--link", default="")
    p.add_argument("--new-link")
    p.add_argument("--display-name")
    p.add_argument("--author-name")
    p.add_argument("--author-link")
    p.add_argument("--description")
    a = p.parse_args()

    rows = core.load_rows()
    row = core.find_row(rows, a.id, a.link)
    changes = {}
    if a.new_link is not None:
        new = core.validate_link(a.new_link)
        for other in rows:
            if other is not row and core.normalize_link(other["Link"]) == core.normalize_link(new):
                raise core.ListError(f"{new} is already listed as {other['ID']}")
        changes["Link"] = new
    if a.display_name is not None:
        if not a.display_name.strip():
            raise core.ListError("display name is empty")
        changes["Display Name"] = a.display_name.strip()
    if a.author_name is not None:
        changes["Author Name"] = a.author_name.strip()
    if a.author_link is not None:
        changes["Author Link"] = (
            core.validate_link(a.author_link, "author link") if a.author_link.strip() else ""
        )
    if a.description is not None:
        changes["Description"] = " ".join(a.description.split())
    if not changes:
        raise core.ListError("nothing to update: pass at least one field")

    changes = {k: v for k, v in changes.items() if row[k] != v}
    if not changes:
        print(f"{row['ID']} already has those values")
        return
    row.update(changes)
    row["Last Modified"] = core.today()
    core.save_rows(rows)
    print(f"updated {row['ID']}: {', '.join(changes)}")


if __name__ == "__main__":
    core.run_cli(main)

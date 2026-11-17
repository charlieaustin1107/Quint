#!/usr/bin/env python3
"""Re-file one resource to a new Category/Sub-Category. Keeps its ID, dates, and text."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from listkit import core  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--id", default="")
    p.add_argument("--link", default="")
    p.add_argument("--category", required=True)
    p.add_argument("--subcategory", default="")
    a = p.parse_args()

    cfg = core.load_config()
    rows = core.load_rows()
    row = core.find_row(rows, a.id, a.link)
    category, sub = core.resolve_category(cfg, a.category, a.subcategory)
    if (row["Category"], row["Sub-Category"]) == (category, sub):
        print(f"{row['ID']} is already in {category}{' / ' + sub if sub else ''}")
        return
    row["Category"], row["Sub-Category"] = category, sub
    row["Last Modified"] = core.today()
    core.save_rows(rows)
    print(f"moved {row['ID']} -> {category}{' / ' + sub if sub else ''}")


if __name__ == "__main__":
    core.run_cli(main)

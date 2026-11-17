#!/usr/bin/env python3
"""Add, move, or remove a category / sub-category in config.yaml.

Category-level edits also re-sync the issue-form dropdown. ORDER is 1-based.
Removing a (sub)category that Active resources still use fails unless --force:
for a category, --force deactivates those rows (Active=No); for a sub-category,
it moves them up to the parent category.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from listkit import core  # noqa: E402

import sync_issue_form  # noqa: E402  (sibling script)


def _insert(items: list, item: dict, order: int | None) -> None:
    if order is None:
        items.append(item)
        return
    if order < 1:
        raise core.ListError("ORDER must be >= 1")
    items.insert(min(order, len(items) + 1) - 1, item)


def _parse_order(raw: str | None) -> int | None:
    if raw is None:
        return None
    try:
        return int(raw)
    except ValueError:
        raise core.ListError(f"ORDER must be an integer, got {raw!r}") from None


def cmd_add(cfg, rows, a) -> bool:
    order = _parse_order(a.order)
    if a.subcategory:
        cat = core.find_category(cfg, a.category)
        if cat is None:
            raise core.ListError(f"unknown category {a.category!r}")
        if core.find_subcategory(cat, a.subcategory):
            raise core.ListError(f"{a.subcategory!r} already exists under {cat['name']!r}")
        sub = {"name": a.subcategory.strip()}
        if a.description:
            sub["description"] = a.description
        _insert(cat["subcategories"], sub, order)
        print(f"added sub-category {cat['name']} / {sub['name']}")
        return False
    if core.find_category(cfg, a.category):
        raise core.ListError(f"category {a.category!r} already exists")
    prefix = a.prefix or core.slugify_prefix(a.category)
    if any(c.get("prefix") == prefix for c in cfg["categories"]):
        raise core.ListError(f"prefix {prefix!r} is taken; pass PREFIX=")
    cat = {"name": a.category.strip(), "prefix": prefix}
    if a.description:
        cat["description"] = a.description
    cat["subcategories"] = []
    _insert(cfg["categories"], cat, order)
    print(f"added category {cat['name']} (prefix {prefix})")
    return True


def cmd_move(cfg, rows, a) -> bool:
    order = _parse_order(a.order)
    cat = core.find_category(cfg, a.category)
    if cat is None:
        raise core.ListError(f"unknown category {a.category!r}")
    if a.subcategory:
        sub = core.find_subcategory(cat, a.subcategory)
        if sub is None:
            raise core.ListError(f"unknown sub-category {a.subcategory!r}")
        cat["subcategories"].remove(sub)
        _insert(cat["subcategories"], sub, order)
        print(f"moved {cat['name']} / {sub['name']} to position {order}")
        return False
    cfg["categories"].remove(cat)
    _insert(cfg["categories"], cat, order)
    print(f"moved {cat['name']} to position {order}")
    return True


def cmd_remove(cfg, rows, a) -> bool:
    cat = core.find_category(cfg, a.category)
    if cat is None:
        raise core.ListError(f"unknown category {a.category!r}")
    in_cat = [r for r in rows if r["Category"].casefold() == cat["name"].casefold()]
    if a.subcategory:
        sub = core.find_subcategory(cat, a.subcategory)
        if sub is None:
            raise core.ListError(f"unknown sub-category {a.subcategory!r}")
        users = [r for r in in_cat if r["Sub-Category"].casefold() == sub["name"].casefold()]
        if any(core.is_active(r) for r in users) and not a.force:
            raise core.ListError(
                f"{len(users)} resource(s) use {sub['name']!r}; re-file them or pass FORCE=1 "
                "to move them up to the parent category"
            )
        for r in users:
            r["Sub-Category"] = ""
            r["Last Modified"] = core.today()
        cat["subcategories"].remove(sub)
        print(f"removed sub-category {cat['name']} / {sub['name']}")
        return False
    active = [r for r in in_cat if core.is_active(r)]
    if active and not a.force:
        raise core.ListError(
            f"{len(active)} active resource(s) use {cat['name']!r}; re-file them or pass "
            "FORCE=1 to deactivate them"
        )
    for r in active:
        r["Active"] = "No"
        r["Last Modified"] = core.today()
    cfg["categories"].remove(cat)
    print(f"removed category {cat['name']}" + (f" (deactivated {len(active)})" if active else ""))
    return True


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("action", choices=["add", "move", "remove"])
    p.add_argument("--category", required=True)
    p.add_argument("--subcategory", default="")
    p.add_argument("--order")
    p.add_argument("--prefix", default="")
    p.add_argument("--description", default="")
    p.add_argument("--force", action="store_true")
    a = p.parse_args()

    cfg = core.load_config()
    rows = core.load_rows()
    before = core.dump_rows(rows)
    category_level = {"add": cmd_add, "move": cmd_move, "remove": cmd_remove}[a.action](cfg, rows, a)
    core.save_config(cfg)
    if core.dump_rows(rows) != before:
        core.save_rows(rows)
    if category_level and sync_issue_form.sync(cfg):
        print("synced issue-form dropdown")


if __name__ == "__main__":
    core.run_cli(main)

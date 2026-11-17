"""Shared helpers for the Quint resource list.

THE_RESOURCES_TABLE_NEW.csv is the single source of truth for resources and
config.yaml is the single source of truth for categories. Everything else
(README.md, the issue-form dropdown, the carousel SVGs) is derived.

Set LIST_ROOT to point every script at a different checkout (used by tests).
"""

from __future__ import annotations

import csv
import hashlib
import io
import os
import re
import sys
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(os.environ.get("LIST_ROOT") or Path(__file__).resolve().parent.parent)
CSV_PATH = ROOT / "THE_RESOURCES_TABLE_NEW.csv"
CONFIG_PATH = ROOT / "config.yaml"
TEMPLATE_PATH = ROOT / "templates" / "README.template.md"
README_PATH = ROOT / "README.md"
ISSUE_FORM_PATH = ROOT / ".github" / "ISSUE_TEMPLATE" / "recommend-resource.yml"
ASSETS_DIR = ROOT / "assets"
DATA_DIR = ROOT / "data"

FIELDS = [
    "ID",
    "Display Name",
    "Category",
    "Sub-Category",
    "Link",
    "Author Name",
    "Author Link",
    "Description",
    "Active",
    "Date Added",
    "Last Modified",
]

CONFIG_HEADER = """\
# Quint resource list — category configuration.
#
# Category order here is the order in README.md. Edit with
# `make add-category / move-category / remove-category` so the issue-form
# dropdown and README stay in sync (hand edits are fine too; run `make generate`).
"""


class ListError(Exception):
    """A user-facing validation error; scripts print it and exit non-zero."""


def die(msg: str, code: int = 1) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(code)


def run_cli(main) -> None:
    """Run a script's main(), turning ListError into a clean exit."""
    try:
        main()
    except ListError as exc:
        die(str(exc))


def today() -> str:
    # SOURCE_DATE lets tests (and reproducible builds) pin "today".
    return os.environ.get("SOURCE_DATE") or date.today().isoformat()


# --------------------------------------------------------------------------- config


def load_config(path: Path = CONFIG_PATH) -> dict:
    with open(path, encoding="utf-8") as fh:
        cfg = yaml.safe_load(fh) or {}
    cfg.setdefault("categories", [])
    for cat in cfg["categories"]:
        if not cat.get("name"):
            raise ListError("config.yaml: every category needs a name")
        cat.setdefault("subcategories", [])
    return cfg


def save_config(cfg: dict, path: Path = CONFIG_PATH) -> None:
    clean = dict(cfg)
    cats = []
    for cat in cfg["categories"]:
        c = {k: v for k, v in cat.items() if k != "subcategories"}
        if cat.get("subcategories"):
            c["subcategories"] = cat["subcategories"]
        cats.append(c)
    clean["categories"] = cats
    body = yaml.safe_dump(clean, sort_keys=False, allow_unicode=True, width=100)
    path.write_text(CONFIG_HEADER + "\n" + body, encoding="utf-8")


def find_category(cfg: dict, name: str) -> dict | None:
    for cat in cfg["categories"]:
        if cat["name"].casefold() == name.casefold():
            return cat
    return None


def find_subcategory(cat: dict, name: str) -> dict | None:
    for sub in cat.get("subcategories", []):
        if sub["name"].casefold() == name.casefold():
            return sub
    return None


def resolve_category(cfg: dict, category: str, subcategory: str = "") -> tuple[str, str]:
    """Return the canonical (Category, Sub-Category) spelling, or raise."""
    cat = find_category(cfg, category)
    if cat is None:
        names = ", ".join(c["name"] for c in cfg["categories"])
        raise ListError(f"unknown category {category!r}. Known: {names}")
    if not subcategory:
        return cat["name"], ""
    sub = find_subcategory(cat, subcategory)
    if sub is None:
        names = ", ".join(s["name"] for s in cat["subcategories"]) or "(none)"
        raise ListError(
            f"unknown sub-category {subcategory!r} in {cat['name']!r}. Known: {names}"
        )
    return cat["name"], sub["name"]


def slugify_prefix(name: str) -> str:
    words = re.findall(r"[a-z0-9]+", name.lower())
    return (words[0] if words else "res")[:8]


# --------------------------------------------------------------------------- csv


def load_rows(path: Path = CSV_PATH) -> list[dict]:
    if not path.exists():
        return []
    with open(path, encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        missing = [f for f in FIELDS if f not in (reader.fieldnames or [])]
        if missing:
            raise ListError(f"{path.name}: missing columns {missing}")
        return [{f: (row.get(f) or "").strip() for f in FIELDS} for row in reader]


def dump_rows(rows: list[dict]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=FIELDS, lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({f: row.get(f, "") for f in FIELDS})
    return buf.getvalue()


def save_rows(rows: list[dict], path: Path = CSV_PATH) -> None:
    path.write_text(dump_rows(rows), encoding="utf-8")


def is_active(row: dict) -> bool:
    return row.get("Active", "").strip().lower() in {"yes", "true", "1", "y"}


def normalize_link(link: str) -> str:
    link = link.strip().lower()
    link = re.sub(r"^https?://(www\.)?", "", link)
    link = re.sub(r"\.git$", "", link)
    return link.rstrip("/")


def validate_link(link: str, what: str = "link") -> str:
    link = link.strip()
    if not re.match(r"^https://[^\s/]+\.[^\s]+$", link):
        raise ListError(f"{what} must be an https:// URL, got {link!r}")
    return link


def mint_id(prefix: str, link: str, existing: set[str]) -> str:
    """Opaque, stable ID: <prefix>-<8 hex of the link hash>, salted on collision."""
    salt = 0
    while True:
        digest = hashlib.sha256(f"{normalize_link(link)}#{salt}".encode()).hexdigest()[:8]
        rid = f"{prefix}-{digest}"
        if rid not in existing:
            return rid
        salt += 1


def find_row(rows: list[dict], rid: str = "", link: str = "") -> dict:
    if rid:
        # Accept either the full ID or just its hash suffix.
        hits = [r for r in rows if r["ID"] == rid or r["ID"].split("-")[-1] == rid]
    elif link:
        hits = [r for r in rows if normalize_link(r["Link"]) == normalize_link(link)]
    else:
        raise ListError("pass --id or --link")
    if not hits:
        raise ListError(f"no resource matches {'ID ' + rid if rid else 'link ' + link}")
    if len(hits) > 1:
        raise ListError(f"ambiguous match: {[r['ID'] for r in hits]}")
    return hits[0]


def category_prefix(cfg: dict, category: str) -> str:
    cat = find_category(cfg, category)
    return (cat or {}).get("prefix") or slugify_prefix(category)

"""Render README.md from config + CSV + template. Pure and deterministic."""

from __future__ import annotations

import re

from . import core


def anchor(text: str) -> str:
    """GitHub-style heading anchor."""
    text = text.strip().lower()
    text = re.sub(r"[^\w\- ]", "", text)
    return text.replace(" ", "-")


def md_escape(text: str) -> str:
    return text.replace("[", r"\[").replace("]", r"\]")


def entry_line(row: dict) -> str:
    line = f"- [{md_escape(row['Display Name'])}]({row['Link']})"
    if row["Author Name"]:
        author = md_escape(row["Author Name"])
        line += f" by [{author}]({row['Author Link']})" if row["Author Link"] else f" by {author}"
    if row["Description"]:
        line += f" — {row['Description']}"
    return line


def sort_key(row: dict):
    return (row["Display Name"].casefold(), row["ID"])


def check_rows(cfg: dict, rows: list[dict]) -> list[dict]:
    """Fail closed: every Active row must map to a configured (sub)category."""
    errors = []
    seen_ids: set[str] = set()
    for row in rows:
        if row["ID"] in seen_ids:
            errors.append(f"duplicate ID {row['ID']}")
        seen_ids.add(row["ID"])
        if not core.is_active(row):
            continue
        cat = core.find_category(cfg, row["Category"])
        if cat is None:
            errors.append(f"{row['ID']}: Category {row['Category']!r} is not in config.yaml")
            continue
        if row["Sub-Category"] and core.find_subcategory(cat, row["Sub-Category"]) is None:
            errors.append(
                f"{row['ID']}: Sub-Category {row['Sub-Category']!r} is not under "
                f"{cat['name']!r} in config.yaml"
            )
    if errors:
        raise core.ListError("refusing to generate README:\n  " + "\n  ".join(errors))
    return [r for r in rows if core.is_active(r)]


def render_body(cfg: dict, active: list[dict]) -> tuple[str, str]:
    toc, body = [], []
    for cat in cfg["categories"]:
        in_cat = [r for r in active if r["Category"].casefold() == cat["name"].casefold()]
        toc.append(f"- [{cat['name']}](#{anchor(cat['name'])})")
        body.append(f"## {cat['name']}\n")
        if cat.get("description"):
            body.append(f"> {cat['description']}\n")

        loose = sorted((r for r in in_cat if not r["Sub-Category"]), key=sort_key)
        if loose:
            body.append("\n".join(entry_line(r) for r in loose) + "\n")

        for sub in cat["subcategories"]:
            in_sub = sorted(
                (r for r in in_cat if r["Sub-Category"].casefold() == sub["name"].casefold()),
                key=sort_key,
            )
            toc.append(f"  - [{sub['name']}](#{anchor(sub['name'])})")
            body.append(f"### {sub['name']}\n")
            if sub.get("description"):
                body.append(f"> {sub['description']}\n")
            body.append(
                "\n".join(entry_line(r) for r in in_sub) + "\n"
                if in_sub
                else "_Nothing here yet — [recommend a resource](../../issues/new?template=recommend-resource.yml)._\n"
            )

        if not in_cat and not cat["subcategories"]:
            body.append(
                "_Nothing here yet — [recommend a resource](../../issues/new?template=recommend-resource.yml)._\n"
            )
    return "\n".join(toc), "\n".join(body).rstrip() + "\n"


def render_readme(cfg: dict, rows: list[dict], template: str, assets: set[str]) -> str:
    active = check_rows(cfg, rows)
    toc, body = render_body(cfg, active)

    def picture(stem: str, alt: str) -> str:
        if f"{stem}-dark.svg" not in assets or f"{stem}-light.svg" not in assets:
            return ""
        return (
            "<picture>\n"
            f'  <source media="(prefers-color-scheme: dark)" srcset="assets/{stem}-dark.svg">\n'
            f'  <img alt="{alt}" src="assets/{stem}-light.svg" width="100%">\n'
            "</picture>"
        )

    subs = {
        "TITLE": cfg.get("title", "Resources"),
        "TAGLINE": cfg.get("tagline", ""),
        "COUNT": str(len(active)),
        "TOC": toc,
        "BODY": body,
        "RECENTLY_ADDED": picture("recently-added", "Recently added resources"),
        "TICKER": picture("repo-ticker", "Trending repositories"),
        "DISCLAIMER": cfg.get("disclaimer", ""),
    }

    def sub(match: re.Match) -> str:
        key = match.group(1)
        if key not in subs:
            raise core.ListError(f"template uses unknown placeholder {{{{{key}}}}}")
        return subs[key]

    out = re.sub(r"\{\{\s*([A-Z_]+)\s*\}\}", sub, template)
    out = re.sub(r"\n{3,}", "\n\n", out)  # collapse gaps left by empty placeholders
    return out.rstrip() + "\n"

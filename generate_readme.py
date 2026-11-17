#!/usr/bin/env python3
"""Render README.md from THE_RESOURCES_TABLE_NEW.csv + config.yaml + the template.

Idempotent (same inputs -> byte-identical README.md) and fail-closed (an Active
row whose Category/Sub-Category is missing from config.yaml aborts the run).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from listkit import core, render  # noqa: E402


def main() -> None:
    cfg = core.load_config()
    rows = core.load_rows()
    template = core.TEMPLATE_PATH.read_text(encoding="utf-8")
    assets = {p.name for p in core.ASSETS_DIR.glob("*.svg")} if core.ASSETS_DIR.exists() else set()
    out = render.render_readme(cfg, rows, template, assets)
    old = core.README_PATH.read_text(encoding="utf-8") if core.README_PATH.exists() else None
    if out == old:
        print("README.md is up to date")
        return
    core.README_PATH.write_text(out, encoding="utf-8")
    print(f"wrote README.md ({sum(core.is_active(r) for r in rows)} active resources)")


if __name__ == "__main__":
    core.run_cli(main)

#!/usr/bin/env python3
"""Pre-commit / CI check: fail if README.md or the issue form is stale."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from listkit import core, render  # noqa: E402

import sync_issue_form  # noqa: E402


def main() -> None:
    cfg = core.load_config()
    stale = []
    assets = {p.name for p in core.ASSETS_DIR.glob("*.svg")} if core.ASSETS_DIR.exists() else set()
    readme = render.render_readme(
        cfg, core.load_rows(), core.TEMPLATE_PATH.read_text(encoding="utf-8"), assets
    )
    if not core.README_PATH.exists() or core.README_PATH.read_text(encoding="utf-8") != readme:
        stale.append("README.md")
    form = core.ISSUE_FORM_PATH
    if not form.exists() or form.read_text(encoding="utf-8") != sync_issue_form.build_form(cfg):
        stale.append(str(form.relative_to(core.ROOT)))
    if stale:
        raise core.ListError(f"stale generated files: {', '.join(stale)} — run `make generate`")
    print("generated files are up to date")


if __name__ == "__main__":
    core.run_cli(main)

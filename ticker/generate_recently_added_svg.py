#!/usr/bin/env python3
"""Render assets/recently-added-{dark,light}.svg from the newest Active CSV rows."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from listkit import core, svg  # noqa: E402


def main() -> None:
    cfg = core.load_config()
    limit = int((cfg.get("recently_added") or {}).get("limit", 6))
    rows = [r for r in core.load_rows() if core.is_active(r)]
    # Newest first; later CSV rows win ties (they were appended later).
    newest = [r for _, r in sorted(enumerate(rows), key=lambda p: (p[1]["Date Added"], p[0]), reverse=True)][:limit]
    core.ASSETS_DIR.mkdir(exist_ok=True)
    for theme in ("dark", "light"):
        path = core.ASSETS_DIR / f"recently-added-{theme}.svg"
        out = svg.recently_added(newest, theme)
        if not path.exists() or path.read_text(encoding="utf-8") != out:
            path.write_text(out, encoding="utf-8")
            print(f"wrote {path.relative_to(core.ROOT)}")
    print(f"carousel: {len(newest)} resource(s)")


if __name__ == "__main__":
    core.run_cli(main)

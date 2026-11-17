#!/usr/bin/env python3
"""Render assets/repo-ticker-{dark,light}.svg from data/repo-ticker.csv."""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from listkit import core, svg  # noqa: E402

DATA = core.DATA_DIR / "repo-ticker.csv"


def main() -> None:
    if not DATA.exists():
        raise core.ListError(f"{DATA.relative_to(core.ROOT)} not found — run `make ticker-data` first")
    with open(DATA, encoding="utf-8", newline="") as fh:
        repos = list(csv.DictReader(fh))
    core.ASSETS_DIR.mkdir(exist_ok=True)
    for theme in ("dark", "light"):
        path = core.ASSETS_DIR / f"repo-ticker-{theme}.svg"
        path.write_text(svg.ticker(repos, theme), encoding="utf-8")
        print(f"wrote {path.relative_to(core.ROOT)}")
    print("run `make readme` to include the ticker in README.md")


if __name__ == "__main__":
    core.run_cli(main)

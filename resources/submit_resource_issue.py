#!/usr/bin/env python3
"""Open a resource-submission issue via `gh`, labelled so validation runs on `opened`.

Composes the same body GitHub renders for the recommend-resource form. Does not
touch the CSV or README. Applying labels needs triage access on the repo.
"""
import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from listkit import core  # noqa: E402

LABELS = ["resource-submission", "validation-pending"]


def compose_body(fields: list[tuple[str, str]]) -> str:
    return "\n\n".join(f"### {label}\n\n{value or '_No response_'}" for label, value in fields) + "\n"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--display-name", required=True)
    p.add_argument("--category", required=True)
    p.add_argument("--link", required=True)
    p.add_argument("--subcategory", default="")
    p.add_argument("--author-name", default="")
    p.add_argument("--author-link", default="")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--description", default="")
    g.add_argument("--description-file")
    p.add_argument("--repo", default="")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()

    description = (
        Path(a.description_file).read_text(encoding="utf-8").strip() if a.description_file else a.description
    )
    if not description:
        raise core.ListError("a description is required (DESCRIPTION= or DESCRIPTION_FILE=)")
    category, sub = core.resolve_category(core.load_config(), a.category, a.subcategory)
    link = core.validate_link(a.link)
    if a.author_link:
        core.validate_link(a.author_link, "author link")

    title = f"[Resource]: {a.display_name.strip()}"
    body = compose_body(
        [
            ("Display Name", a.display_name.strip()),
            ("Category", category),
            ("Sub-Category", sub),
            ("Link", link),
            ("Author Name", a.author_name),
            ("Author Link", a.author_link),
            ("Description", description),
        ]
    )
    cmd = ["gh", "issue", "create", "--title", title, "--body", body]
    for label in LABELS:
        cmd += ["--label", label]
    if a.repo:
        cmd += ["--repo", a.repo]

    if a.dry_run:
        print(f"[dry run] would run: gh issue create --title {title!r} " + " ".join(f"--label {l}" for l in LABELS))
        print(body)
        return
    result = subprocess.run(cmd, check=False)
    sys.exit(result.returncode)


if __name__ == "__main__":
    core.run_cli(main)

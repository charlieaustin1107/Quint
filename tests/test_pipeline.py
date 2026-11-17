"""End-to-end tests: each test runs the real scripts against a scratch copy of the repo."""

import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
COPY = [
    "THE_RESOURCES_TABLE_NEW.csv",
    "config.yaml",
    "templates",
    ".github",
]


@pytest.fixture
def root(tmp_path):
    for name in COPY:
        src = REPO / name
        if src.is_dir():
            shutil.copytree(src, tmp_path / name)
        else:
            shutil.copy(src, tmp_path / name)
    return tmp_path


def run(root, script, *args, ok=True):
    env = {**os.environ, "LIST_ROOT": str(root), "SOURCE_DATE": "2030-01-02"}
    res = subprocess.run(
        [sys.executable, str(REPO / script), *args], env=env, capture_output=True, text=True
    )
    if ok:
        assert res.returncode == 0, res.stderr
    else:
        assert res.returncode != 0, res.stdout
    return res


def rows(root):
    sys.path.insert(0, str(REPO))
    from listkit import core

    return core.load_rows(root / "THE_RESOURCES_TABLE_NEW.csv")


def readme(root):
    return (root / "README.md").read_text(encoding="utf-8")


def test_committed_readme_is_current():
    res = subprocess.run(
        [sys.executable, str(REPO / "scripts/check_generated.py")], capture_output=True, text=True
    )
    assert res.returncode == 0, res.stderr


def test_generation_is_idempotent(root):
    run(root, "generate_readme.py")
    first = readme(root)
    run(root, "generate_readme.py")
    assert readme(root) == first
    assert "## Platforms & Data" in first and "### Charting" in first


def test_fails_closed_on_unknown_category(root):
    csv = root / "THE_RESOURCES_TABLE_NEW.csv"
    csv.write_text(csv.read_text().replace(",Education,", ",Nonexistent,", 1))
    res = run(root, "generate_readme.py", ok=False)
    assert "Nonexistent" in res.stderr
    assert not (root / "README.md").exists()


def test_inactive_rows_with_unknown_category_are_ignored(root):
    csv = root / "THE_RESOURCES_TABLE_NEW.csv"
    lines = [
        l.replace(",Education,", ",Gone,").replace(",Yes,", ",No,") if ",Education," in l else l
        for l in csv.read_text().splitlines()
    ]
    csv.write_text("\n".join(lines) + "\n")
    run(root, "generate_readme.py")
    assert "CME Group Education" not in readme(root)


def test_add_resource_mints_id_and_dedupes(root):
    before = len(rows(root))
    run(
        root,
        "resources/add_resource.py",
        "--display-name", "Drawdown Calc",
        "--category", "prop firms & funded accounts",  # case-insensitive
        "--subcategory", "risk & rule tools",
        "--link", "https://example.com/dd",
        "--description", "  Tracks   trailing drawdown. ",
    )
    new = rows(root)[-1]
    assert len(rows(root)) == before + 1
    assert new["ID"].startswith("prop-") and len(new["ID"]) == len("prop-") + 8
    assert new["Category"] == "Prop Firms & Funded Accounts"
    assert new["Sub-Category"] == "Risk & Rule Tools"
    assert new["Description"] == "Tracks trailing drawdown."
    assert new["Date Added"] == "2030-01-02"

    res = run(
        root, "resources/add_resource.py", "--display-name", "Dup", "--category", "Education",
        "--link", "https://www.EXAMPLE.com/dd/", ok=False,
    )
    assert "already listed" in res.stderr

    run(root, "generate_readme.py")
    assert "[Drawdown Calc](https://example.com/dd)" in readme(root)


def test_add_resource_rejects_bad_input(root):
    base = ["--display-name", "X", "--link", "https://example.com/x"]
    assert "unknown category" in run(root, "resources/add_resource.py", *base, "--category", "Nope", ok=False).stderr
    assert "unknown sub-category" in run(
        root, "resources/add_resource.py", *base, "--category", "Education", "--subcategory", "Nope", ok=False
    ).stderr
    assert "https://" in run(
        root, "resources/add_resource.py", "--display-name", "X", "--category", "Education",
        "--link", "ftp://x", ok=False,
    ).stderr


def test_move_and_update_touch_only_one_row(root):
    original = rows(root)
    target = next(r for r in original if r["Display Name"] == "Rithmic")
    run(root, "resources/move_resource.py", "--id", target["ID"], "--category", "Platforms & Data",
        "--subcategory", "Execution Platforms")
    run(root, "resources/update_resource.py", "--id", target["ID"].split("-")[-1],
        "--description", "Updated text.")
    after = rows(root)
    changed = [(a, b) for a, b in zip(original, after) if a != b]
    assert len(changed) == 1
    old, new = changed[0]
    assert new["ID"] == old["ID"] and new["Date Added"] == old["Date Added"]
    assert new["Sub-Category"] == "Execution Platforms"
    assert new["Description"] == "Updated text."
    assert new["Last Modified"] == "2030-01-02"


def test_update_new_link_refuses_duplicate(root):
    r = rows(root)
    res = run(root, "resources/update_resource.py", "--id", r[0]["ID"], "--new-link", r[1]["Link"], ok=False)
    assert "already listed" in res.stderr


def test_category_lifecycle_syncs_form(root):
    form = root / ".github/ISSUE_TEMPLATE/recommend-resource.yml"
    run(root, "scripts/manage_categories.py", "add", "--category", "Order Flow", "--order", "2", "--prefix", "flow")
    assert "- Order Flow" in form.read_text()
    sys.path.insert(0, str(REPO))
    from listkit import core

    cfg = core.load_config(root / "config.yaml")
    assert cfg["categories"][1]["name"] == "Order Flow"

    run(root, "scripts/manage_categories.py", "move", "--category", "Order Flow", "--order", "99")
    assert core.load_config(root / "config.yaml")["categories"][-1]["name"] == "Order Flow"

    run(root, "scripts/manage_categories.py", "remove", "--category", "Order Flow")
    assert "Order Flow" not in form.read_text()


def test_remove_in_use_category_needs_force(root):
    res = run(root, "scripts/manage_categories.py", "remove", "--category", "Education", ok=False)
    assert "FORCE=1" in res.stderr
    run(root, "scripts/manage_categories.py", "remove", "--category", "Education", "--force")
    edu = [r for r in rows(root) if r["Category"] == "Education"]
    assert edu and all(r["Active"] == "No" for r in edu)
    run(root, "generate_readme.py")  # still generates: deactivated rows are skipped
    assert "## Education" not in readme(root)


def test_remove_subcategory_force_moves_rows_up(root):
    run(root, "scripts/manage_categories.py", "remove", "--category", "Platforms & Data",
        "--subcategory", "Data Feeds", "--force")
    rith = next(r for r in rows(root) if r["Display Name"] == "Rithmic")
    assert rith["Sub-Category"] == "" and rith["Active"] == "Yes"
    run(root, "generate_readme.py")


def test_submit_resource_dry_run(root):
    res = run(
        root, "resources/submit_resource_issue.py", "--display-name", "X", "--category", "education",
        "--link", "https://example.com", "--description", "Desc", "--dry-run",
    )
    assert "### Category\n\nEducation" in res.stdout
    assert "validation-pending" in res.stdout


def test_recently_added_svgs(root):
    run(root, "ticker/generate_recently_added_svg.py")
    dark = (root / "assets/recently-added-dark.svg").read_text()
    assert dark.startswith("<svg") and "CME Group Education" in dark
    run(root, "generate_readme.py")
    assert "assets/recently-added-dark.svg" in readme(root)

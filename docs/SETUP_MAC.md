# Setting up Quint on a Mac

This gets the Quint resource list running on macOS, so you can add resources and
rebuild the README yourself. It takes about 10 minutes the first time.

## 1. Install the tools

Open **Terminal** (press ⌘ Space, type "Terminal", press Return).

**Apple's command line tools** give you `git`, `make`, and `python3`:

```bash
xcode-select --install
```

A window pops up. Click **Install** and wait for it to finish. If it says the
tools are already installed, that's fine.

**GitHub CLI** (`gh`), which you need for cloning, the ticker, and
`make submit-resource`. The easiest way to get it is [Homebrew](https://brew.sh):

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install gh
```

When Homebrew finishes, it prints a "Next steps" section with two commands that
add `brew` to your PATH. Run them before `brew install gh`.

Then sign in to GitHub:

```bash
gh auth login
```

Choose **GitHub.com**, then **HTTPS**, then **Login with a web browser**, and
follow the prompts.

**Check it worked:**

```bash
git --version && make --version | head -1 && python3 --version && gh --version | head -1
```

You need Python **3.9 or newer**. The version Apple ships is fine.

## 2. Get the code

```bash
cd ~
gh repo clone charlieaustin1107/Quint
cd Quint
```

The list work currently lives on the `claude/awesome-claude-code-generation-xmdjp0`
branch. Until that's merged into `main`, switch to it:

```bash
git checkout claude/awesome-claude-code-generation-xmdjp0
```

## 3. Install the Python dependencies

```bash
make deps
```

This creates a `venv/` folder inside the project and installs everything into it.
Nothing is installed system-wide. You only need to run this once. `make` reruns
it automatically if the requirements files change.

## 4. Check everything works

```bash
make test       # should end with "13 passed"
make generate   # should say README.md is up to date
```

Optionally, install the pre-commit hook. It stops you committing if you edited
the CSV or config but forgot to regenerate:

```bash
make install-hooks
```

## 5. Day-to-day use

All commands run from the `Quint` folder. `make help` lists every target.

**Add a resource:**

```bash
make add-resource DISPLAY_NAME="Sierra Chart" CATEGORY="Platforms & Data" \
    SUBCATEGORY="Charting" LINK="https://www.sierrachart.com" \
    DESCRIPTION="Low-latency charting popular for order-flow analysis."
```

**Fix a typo or link.** Use the ID from `THE_RESOURCES_TABLE_NEW.csv`. Just the
8-character hash part works too:

```bash
make update-resource ID=1a2b3c4d DESCRIPTION="New description."
```

**Move a resource to another category:**

```bash
make move-resource ID=1a2b3c4d CATEGORY="Prop Firms & Funded Accounts" SUBCATEGORY="Risk & Rule Tools"
```

**Add a category:**

```bash
make add-category CATEGORY="Order Flow" PREFIX=flow ORDER=4
```

**Refresh the GitHub ticker.** It needs a token, which `gh` can supply:

```bash
GITHUB_TOKEN=$(gh auth token) make ticker && make readme
```

**Save and publish your changes:**

```bash
git add -A
git commit -m "Add Sierra Chart"
git push
```

## Troubleshooting

**`xcrun: error: invalid active developer path`**
: The command line tools are missing, often after a macOS update. Run
  `xcode-select --install` again.

**`zsh: command not found: brew`** right after installing Homebrew
: Run the two "Next steps" commands Homebrew printed, or open a new Terminal
  window.

**Something in `venv/` is broken** (for example after upgrading macOS or Python)
: Delete it and reinstall: `rm -rf venv && make deps`.

**`error: unknown category ...`**
: Category names must match `config.yaml`. Capitals don't matter, but spelling
  and `&` do. The error message lists the valid names.

**`refusing to generate README`**
: A row in the CSV points at a category that isn't in `config.yaml`. The message
  names the row ID. Fix it with `make move-resource`, or add the category back.

**`GITHUB_TOKEN is not set`** when running `make ticker`
: Prefix the command with `GITHUB_TOKEN=$(gh auth token)` as shown above.

**A `$` disappears from a description** (`$2 per point` becomes ` per point`)
: `make` treats `$` as special, even inside quotes. Write it twice, in single
  quotes: `DESCRIPTION='Costs $$2 per point'`. For `make submit-resource`, you can
  put the text in a file instead and pass `DESCRIPTION_FILE=path`.

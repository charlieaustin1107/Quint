# Chart Wizard

Chart Wizard is the chart-reading game and learning simulator, with Quint as the coach. It is a learning product, not the automated trading engine.

## Source and build

- Source: `src/`
- Published build: `index.html`
- Build from the repository root:

```sh
cd chart-wizard/src
python3 build.py
python3 build.py --prod
```

The normal build creates `test.html` with test hooks; `--prod` writes the production `chart-wizard/index.html`. Do not hand-edit built HTML. Edit source, rebuild and run relevant Playwright checks before publishing.

## Product boundaries

- Chart Wizard teaches chart reading and a small set of evidence-backed strategies plus the owner's 5-pillar playbook.
- It does not connect to a live broker or place orders.
- Its source is reused by Quint Brain. If shared functions change, follow `quint-brain/README.md`.
- The separate automated trading engine, bot library, Guardian and trading website are in `quint-control/`.

TradingView daily call limits and feed-caching rules are documented in the root `CLAUDE.md`. Do not add polling timers or assume the owner's subscription tier.

# web

The dashboard website the engine serves on 127.0.0.1: Command, Bots, Accounts, Journal, Backtests, Brain and Settings, the setup wizard and the Quint assistant pop-up. Black Obsidian & chrome design (see the `quint-design` skill), readable at 390 px wide.

Planned layout (phase 1): `src/` source, `build.py` makes one self-contained `dist/index.html`, `mock-engine.js` fakes the engine for tests and demos, `test/` holds the tests (Playwright at 1440x900 and 390x844).


Current standalone prototype: `strategy-lab/index.html`. It is a local-only Phase 3A prototype, not yet part of the engine-served dashboard. It demonstrates the draft, manual paper-scenario and local library flows; see `strategy-lab/README.md` for limitations.

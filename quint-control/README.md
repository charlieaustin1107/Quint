# Quint Control

A NinjaTrader 8 trading engine with a black, futuristic dashboard website. It runs your bots, copies trades across all your prop accounts, enforces each firm's rules, and has Quint as a built-in helper.

- **Start here:** `STATUS.md` (what's done and what's next)
- **The plan:** `PLAN.md` (a copy of the plan doc)
- **Strategy Lab research:** `research/STRATEGY-LAB.md` (product specification)
- **Strategy Lab prototype:** `web/strategy-lab/index.html` (local draft and manual paper-scenario UI)
- **Strategy Lab domain:** `reference/strategy-lab/README.md` (versioned definitions, validation and safe expression DSL)
- **Prompts for every build phase:** `FABLE-PROMPTS.md`
- **Setting up your computer:** `SETUP.md`
- **How the engine and website talk:** `protocol.md`

## Folders

| Folder | What goes in it |
|---|---|
| `core/` | The trading logic in plain C# (no NinjaTrader code), so it can be tested |
| `engine/` | The NinjaTrader add-on: adapters, the local web server and the self-test runner |
| `strategies/` | One file per bot, plus `_Template.cs` |
| `reference/` | A JavaScript copy of the trading logic, tested with `node`, which produces the golden test files |
| `web/` | The dashboard website, its mock engine and its Playwright tests |
| `tests/golden/` | Golden files: inputs in, expected decisions out, used by both the reference and the engine's self-tests |
| `help/` | One help entry per screen, button and setting, for the Quint assistant |
| `install/` | `Install-Quint.ps1` and `Uninstall-Quint.ps1` |
| `firms/` | Prop firm rule presets as JSON |
| `protocol/` | JSON schemas and example messages for the engine-to-website protocol |

## Tests

```
cd quint-control
npm test
```

Nothing here is financial advice. Only the Quint Engine places orders, and only after your confirm.

# Quint Control

**Current status: HOLD — awaiting Fable 5.2 renewal and the owner's explicit green light.** Do not begin dashboard or engine implementation yet.

- Pre-Fable scope and architecture: `research/PRE-FABLE-READINESS.md`
- Claude read-only audit prompt: `prompts/PRE-FABLE-REPOSITORY-AUDIT.md`

---

A NinjaTrader 8 trading engine with a black, futuristic dashboard website. It runs your bots, copies trades across all your prop accounts, enforces each firm's rules, and has Quint as a built-in helper.

- **Start here:** `STATUS.md` (what's done and what's next)
- **The plan:** `PLAN.md` (a copy of the plan doc)
- **Strategy Lab research:** `research/STRATEGY-LAB.md` (product specification)
- **Shared website / live data research:** `research/SHARED-PLATFORM-AND-MARKET-DATA.md` (two-user hosting, per-user data and Claude billing, NinjaTrader API and licensing gates)
- **Backtest integrity standard:** `research/BACKTEST-INTEGRITY-STANDARD.md` (data quality, fill realism, validation, anti-overfitting and report requirements)
- **External tools research:** `research/EXTERNAL-TOOLS-FIRECRAWL-OPENMAUSBOT.md` (Firecrawl research ingestion and OpenMausBot-style multi-agent development; documentation only)
- **Stitch Skills adoption:** `research/integrations/STITCH-SKILLS-ADOPTION.md` (selected Google Stitch design-to-frontend skills; documentation only)
- **Permanent bot/strategy knowledge:** `research/AUTOMATED-TRADING-KNOWLEDGE-BASE.md`
- **MNQ research programme:** `research/mnq/`
- **Prop-firm overnight research:** `research/prop-firms/OVERNIGHT-FUTURES.md`
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
| `research/` | Automated-trading research, evidence and Claude implementation knowledge |

## Tests

```
cd quint-control
npm test
```

Nothing here is financial advice. Only the Quint Engine places orders, and only after your confirm.

- **Autonomous bot uptime research:** `research/AUTONOMOUS-BOT-RUNTIME-AND-UPTIME.md` (event-driven runtime, website controls, recovery, monitoring and costs)

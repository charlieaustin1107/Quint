# Google Stitch Skills: selective adoption for Quint

**Status: research/specification only.** This document evaluates the official [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills) collection and selects the parts that could help Quint's UI design and frontend implementation. It does not install the plugins, configure Stitch MCP, copy upstream skill code, generate screens, or change application/runtime code.

## Verdict

Adopt a small, controlled subset of Stitch Skills as an optional design workflow for Quint's future dashboard and other explicitly approved UI work. Do not install or run the full collection by default.

Stitch is a UI design tool. Its skills can help Claude move from a clear product brief to consistent screens, design tokens and reusable frontend components. They do **not** provide market data, strategy research, backtesting, trading logic, broker integration or proof that a dashboard is functionally correct.

## Selected skills

| Skill | Decision | Why it helps Quint | Boundary |
|---|---|---|---|
| `design-md` | **Adopt** | Creates a durable `DESIGN.md` design-system brief that Claude can reuse across screens and sessions. | Treat the output as a proposal; reconcile it with existing product requirements and accessibility. |
| `stitch::manage-design-system` | **Adopt** | Keeps typography, colours, spacing and component styling consistent across Stitch screens. | Upload/apply a design system only after owner approval. |
| `stitch::generate-design` | **Adopt** | Produces initial screen concepts and controlled layout alternatives from a precise Quint brief. | Design only; never invent live metrics, account balances, fills, prices or strategy performance. |
| `enhance-prompt` | **Adopt** | Converts broad UI requests into precise screen prompts, reducing ambiguity for Claude and Stitch. | Preserve the owner's actual requirements; do not let prompt enhancement add unrequested features. |
| `stitch::react-components` | **Adopt with adaptation** | Helps translate approved Stitch screens into modular React components and design-token-consistent code. | Its default Vite/React architecture and validation assumptions are not automatically compatible with Quint's existing stack. Inspect the real app first; adapt rather than blindly follow. |
| `stitch::code-to-design` | **Optional** | Can extract the existing frontend into Stitch so a redesign starts from the real product rather than an invented replacement. | Use only when an existing frontend is available and the owner wants it imported. |

## Not selected for default use

- **`stitch-loop`:** avoid autonomous multi-page generation loops for Quint. They can expand scope and create repeated UI work without product review. Use one screen or one small, explicitly approved batch at a time.
- **`taste-design`:** use only as an optional source of anti-generic design checks. Its hard-coded preferences (for example banning Inter, limiting accents to one colour, banning certain card layouts and requiring perpetual motion) are subjective and may conflict with a dense trading terminal. Quint must follow its own design brief, not inherit these rules wholesale.
- **`react-vite-dashboard`:** not a default fit; its template assumptions include Web3-oriented patterns and a particular Vite/React stack.
- **`react-native`:** not relevant to Quint Control's Windows desktop dashboard unless a separate native mobile app is explicitly commissioned.
- **`remotion`:** walkthrough videos are not a current product requirement.
- **`shadcn-ui`:** generic UI framework guidance, not essential to the Stitch workflow. Consider only if the actual frontend stack uses shadcn/ui.
- **`extract-static-html` / `upload-to-stitch`:** supporting utilities, not baseline agent skills. Use only for a specific import/export task.

## Quint-specific design requirements

Any Stitch-generated design or code must preserve these requirements:

1. **No invented trading data.** Use clearly labelled mock values in prototypes, and visibly distinguish them from live, delayed, stale, replayed and simulated data. Never present fabricated balances, P&L, win rates, drawdown, fills, latency or account status as real.
2. **Trading safety is visible.** Account identity, connection state, bot state, simulation/live mode, Guardian status, kill-switch state, order status and stale-data warnings must have clear hierarchy and unambiguous labels. Visual design cannot weaken safety gates or hide a warning.
3. **UI is not the authority.** The deterministic Quint Engine and validated protocol remain authoritative for trading decisions and order state. Frontend components may display and request permitted actions; they must not become a second execution engine.
4. **Dense information, calm presentation.** A trading dashboard needs high information density, readable charts/tables and clear visual grouping. Do not force generic landing-page layouts, oversized hero sections or decorative cards onto the terminal.
5. **Responsive behaviour.** The owner primarily uses an iPhone while the actual trading engine is planned for Windows. Design must state which screens are phone-friendly, desktop-first or require a larger display. Critical controls need adequate touch targets and must not rely on hover alone.
6. **No decorative motion that obscures state.** Motion must be restrained, optional where appropriate, performant and never the only indication of a state change.
7. **Accessible status.** Do not communicate risk or status by colour alone. Pair colour with text, iconography and accessible labels.
8. **No hidden product expansion.** Stitch output is a design proposal, not permission to add new features, routes, settings or external services.

## Recommended workflow

1. Read the relevant product README, `CLAUDE.md`, current design decisions and build gate before any design work.
2. Create or update a product-specific `DESIGN.md`; do not create one shared visual system that erases the distinct identities of Quint Control, Quint Brain, Chart Wizard and Quint Lab.
3. If useful, connect Stitch MCP in the developer's local Claude Code environment. Keep its API key in an environment variable or approved secret store; never commit it.
4. Generate one screen at a time, using real product requirements and labelled placeholder data.
5. Review the design with the owner before uploading/applying the design system or converting it into application code.
6. Before implementation, inspect the actual frontend stack, component structure, tests, build scripts and existing design tokens. Do not assume React/Vite simply because the Stitch skill expects it.
7. Convert the approved design into small components that match the existing architecture. Keep all business logic and trading state behind the existing validated interfaces.
8. Run the product's existing tests and appropriate UI/accessibility checks. Never claim a Stitch screenshot proves that a feature works.
9. Record the design source, Stitch project/screen identifiers, design-system version and implementation commit so later changes can be traced.

## Quint Control build gate

The current Quint Control status is **HOLD** pending Fable 5.2 renewal and the owner's explicit green light. Stitch does not bypass that gate.

Until approval:
- Research and documentation only.
- Do not configure paid services or consume Stitch generation quota on the owner's behalf.
- Do not edit dashboard source, create production screens, change frontend architecture or run implementation loops.
- Do not alter Guardian, OrderRouter, protocol, authentication, bot controls or execution paths.

When the owner explicitly authorises design work, Stitch can be used for design exploration before implementation. A separate explicit approval is still required before changing application code.

## Installation and integration notes

Upstream repository: [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills)

- Upstream describes the skills as compatible with Claude Code and other coding agents using the Agent Skills standard.
- The repository is Apache-2.0. If upstream skill files or scripts are copied into Quint later, preserve licence/attribution notices and review included scripts and dependencies.
- Skills alone are not enough: the official README states that the Stitch MCP server must also be configured and credentials supplied in the agent environment.
- Do not commit Stitch API keys, private project identifiers where inappropriate, generated account data, or private screenshots.
- Pin or record the upstream commit/version used when installing. Re-review changes before updating.
- Prefer a project-local, minimal installation of only the selected skills after approval. Do not install unrelated plugins globally just to access one capability.

## Final recommendation

Use Stitch as an optional **design-to-frontend assistant**, not as a new core dependency of Quint. The highest-value set is `design-md`, `manage-design-system`, `generate-design`, `enhance-prompt` and an adapted `react-components` workflow. Add `code-to-design` only when importing an existing app. Keep autonomous loops, framework assumptions and generic design dogma out of the default build process.

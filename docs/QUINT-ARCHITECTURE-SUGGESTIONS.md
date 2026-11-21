# Quint Architecture Suggestions
**Status: proposed recommendations only; no runtime integration is claimed.**

## Owner's clarified direction
Quint is the main operator and primary user-facing experience. Chart Wizard is NOT part of the Quint website: it remains a separate project. Distil only its valuable chart-reading knowledge and relevant rules into concise references Quint can use. Do not copy its game, UI, branding, coaching app or entire codebase into Quint.

## Recommended component roles
- **Quint:** central operator; coordinates specialist capabilities, reconciles evidence, makes the overall decision and communicates with the user.
- **Quint Brain:** market intelligence; supplies market context, structure, liquidity, levels and timestamped setup assessments. No execution authority.
- **Quint Lab:** research intelligence; supplies versioned strategy definitions, backtests, forward tests, scorecards and evidence. No execution authority.
- **Quint Control:** risk and execution authority; owns account-specific risk policy, Guardian, permissions, order routing and audit.
- **Chart Wizard:** separate source project; knowledge reference only, never a Quint website module or runtime dependency.

## Recommendation
Use `docs/QUINT-SHARED-INTELLIGENCE-CONTRACT.md` as the proposed integration contract. Start with schema validation, fixtures and contract tests; then read-only adapters. Keep Quint Control's current HOLD/phase gate intact. No live execution integration is authorised by this suggestion.

## Non-negotiable rules
1. Quint is the only primary operator presented to the user.
2. Brain and Lab provide evidence; neither can authorise orders.
3. Control is the sole risk and execution gate.
4. Each account and environment has independent authoritative risk limits.
5. Assessments and approvals are timestamped, versioned and expire.
6. Missing, stale, contradictory or malformed inputs fail closed.
7. Prefer one canonical versioned strategy definition over duplicated rules.
8. Never commit credentials or private account information.

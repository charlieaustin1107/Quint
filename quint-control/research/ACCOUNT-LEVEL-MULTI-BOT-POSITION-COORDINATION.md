# Account-level multi-bot position coordination

**Date:** 20 November 2026  
**Status:** Proposed architecture requirement. Research/design only; not implemented or approved for live trading.

## Purpose

Quint should ultimately support multiple distinct strategy bots operating on the same trading account, while preserving one authoritative account-level view of positions, orders and risk.

This is different from copying one bot's signal to several accounts. A copier distributes one strategy decision across accounts; a multi-bot portfolio runs several independent strategies against one account. The latter needs explicit coordination before it is safe.

## Current repository baseline and gap

The autonomous runtime document currently specifies one bot per account, with all orders passing through Guardian and one OrderRouter. The existing copier design describes one signal being checked and routed to multiple follower accounts. Neither specification currently defines safe simultaneous operation of multiple independent bots on one account.

NinjaTrader strategies can maintain virtual strategy positions that are independent of the actual account position and of other strategies. Therefore, two strategies can each believe they hold a position that does not match the broker's net position. Strategy-level performance and exits can become misleading or dangerous if treated as the account's source of truth.

**Decision:** retain the current one-bot-per-account behaviour as the safe baseline until the account-level coordinator is designed, implemented and tested. Multi-bot-per-account is a target capability, not a claim about current functionality.

## Required architecture

All bot signals for an account/instrument must pass through one account-level Portfolio Manager / Position Coordinator before Guardian and the single OrderRouter:

`Multiple strategy bots → Account Portfolio Manager → Guardian → Single OrderRouter → Broker account`

The account and broker are authoritative for actual net positions, working orders, executions and realised/unrealised P&L. Individual bot positions are virtual allocations used for attribution and strategy management; they must never be mistaken for separate broker positions.

### Responsibilities

1. **Signal arbitration**
   - Collect proposed entries/exits from every enabled bot.
   - Timestamp and identify each proposal by bot ID, strategy version, account, instrument and signal ID.
   - Resolve simultaneous and contradictory proposals deterministically.
   - Do not let independent bots submit directly to the OrderRouter.

2. **Account-level position ledger**
   - Maintain one reconciled net position per account/instrument, plus bot-level virtual allocations and attribution.
   - Track every order, partial fill, cancel, replace and execution against both the account ledger and originating bot allocation.
   - Reconcile continuously against broker-reported positions and working orders.
   - On mismatch, stop new entries and enter `Needs Reconciliation`; never guess or silently rewrite allocations.

3. **Conflict policy**
   - Default policy: do not allow two bots to create opposing exposure in the same account and instrument.
   - If one bot is long and another proposes short (or vice versa), reject/defer the new proposal or apply an explicitly configured arbitration policy. Do not automatically net the proposals or reverse the account.
   - Same-direction proposals may be combined only when the portfolio risk budget, contract cap, margin limits and per-strategy allocation limits all permit it.
   - A bot exit may reduce only the exposure allocated to that bot. It must not accidentally close another bot's allocation or reverse the net account position.
   - Any strategy allowed to hedge or trade correlated instruments needs a separately specified, reviewed portfolio policy. Do not infer permission from a strategy's own rules.

4. **Central risk aggregation**
   - Enforce account-wide max contracts, max open risk, daily loss/drawdown, trailing drawdown, margin buffer and maximum order-rate limits.
   - Apply per-bot limits as well as combined portfolio limits.
   - Include working orders and pending entry proposals when calculating worst-case exposure; avoid race conditions where two bots each pass a limit independently.
   - Re-check all limits immediately before routing and after fills/position changes.
   - Guardian remains the final veto and cannot be bypassed by the coordinator or any bot.

5. **Shared protection and exits**
   - Define ownership and quantity allocation for protective stops and targets when several bot allocations contribute to one net position.
   - Prevent duplicate or conflicting stop/target orders.
   - Preserve broker-held protection where supported and verify it after reconnect.
   - If the net position cannot be safely attributed or protected, block new entries and alert; follow a preconfigured emergency policy rather than improvising a flatten.

6. **Deterministic auditability**
   - Persist the original bot signal, arbitration result, risk checks, routed order, broker order ID, fills, allocation changes and reason for every rejection.
   - Use idempotent signal/order IDs so retries cannot duplicate orders.
   - Record strategy version/config hash and the coordinator policy version for every decision.
   - Make it possible to reconstruct the account's net position and each bot's virtual allocation from the event journal.

## Opposing signals: required example

Assume Bot A proposes buying 2 MNQ and Bot B proposes selling 1 MNQ on the same account at nearly the same time.

The system must not independently route both orders and assume their virtual positions are harmless. The coordinator must apply its deterministic conflict policy before either order is sent. Under the default policy, it should accept at most the eligible proposal and reject/defer the conflicting one with a visible reason. The final permitted quantity must still pass combined Guardian limits.

If Bot A already owns a long allocation and Bot B proposes a short entry, Bot B's signal must not close Bot A's allocation or create a net short. A deliberate portfolio-level reversal, if ever supported, must be a separately authorised workflow with explicit close/reconcile/confirm steps.

## Prop-firm and cross-account controls

Keep the existing prohibition on prohibited hedging across separate prop-firm accounts. The coordinator described here is an additional same-account safety layer; it does not weaken or replace firm-specific rules.

- Never assume that two accounts may hold opposite positions.
- Apply firm rules at the account-group level where required, including correlated instruments if the firm's rules cover them.
- Copier and multi-bot controls must share a central policy service so that independent routes cannot create prohibited cross-account hedges.
- Firm rules must be configurable, sourced and versioned; do not hard-code an unsupported universal rule for every provider.

## User interface requirements

For each account, show:
- Net broker position by instrument and total open exposure.
- Each bot's virtual allocation, direction, quantity, average price and attributable P&L.
- Combined account risk and remaining risk budget.
- Conflicting signals, rejected proposals and plain-English reasons.
- Working protective orders and which allocations they protect.
- Last broker reconciliation time and current reconciliation health.

Provide account-level controls to pause all bots, pause one bot, stop new entries and invoke the separately authorised emergency procedure. A per-bot status must not imply that the account is safe if portfolio-level checks are failing.

## Backtesting and forward-testing requirements

A multi-bot portfolio must be tested as a portfolio, not by simply adding independent bot backtest results.

- Replay all bot signals on a common timestamped market/event stream.
- Simulate order sequencing, latency, partial fills, slippage, commissions, exchange fees and shared liquidity assumptions.
- Enforce the same arbitration, allocation, stop/target and account-level risk logic used in the live engine.
- Model prop-firm evaluation and funded-account rules against the combined account equity curve and drawdown, not separate bot equity curves.
- Include stress tests for simultaneous signals, opposite signals, overlapping exits, rejected/cancelled orders, disconnects and broker-position mismatches.
- Paper-forward test the complete portfolio on a practice account before any live approval.
- Report bot-attributed performance and actual combined account performance separately. Never present the sum of standalone bot backtests as expected portfolio performance.

## Implementation sequence and release gates

1. Keep one bot per account as the enforced default while designing the coordinator.
2. Specify the account ledger, virtual allocation model, conflict policy and failure/recovery semantics.
3. Implement coordinator in simulation only, with a single OrderRouter and Guardian unchanged as final authority.
4. Add deterministic unit/integration tests for concurrent entries, opposing signals, partial fills, exits, stop ownership, retries and reconciliation.
5. Add portfolio-level backtesting and practice-account forward testing using the same coordinator code.
6. Run multi-session soak and fault-injection tests; verify account ledger parity with broker state.
7. Enable multi-bot paper mode behind an explicit feature flag and per-account opt-in.
8. Consider live support only after documented review, passing test evidence and explicit user authorisation.

## Acceptance criteria

- No bot can route orders around the account coordinator, Guardian or single OrderRouter.
- Broker account position is the authoritative net position.
- Virtual bot allocations always reconcile to the broker net position, or entries are blocked.
- Opposing same-account signals are deterministically resolved and cannot create accidental reversal.
- Combined account risk is checked atomically across all bots and pending orders.
- A bot exit cannot close another bot's allocation or reverse the account unintentionally.
- Protective orders have unambiguous ownership, quantity and recovery behaviour.
- Copier and account-level controls prevent prohibited cross-account hedging.
- Backtests and forward tests reproduce the same portfolio coordination rules.
- Current one-bot-per-account mode remains available until multi-bot capability passes all release gates.

# Quint Shared Intelligence Contract
**Status: proposed architecture, not implemented runtime behaviour.**

## Product direction
Quint is the main operator and primary user-facing experience. Quint coordinates its specialist capabilities, reconciles their evidence, forms the overall decision and explains it. Brain, Lab and Control are not competing operators.

Chart Wizard remains a separate project. Quint may use selected, reviewed chart-analysis knowledge distilled from it. Do not embed its game, interface, branding, coaching application or full source in the Quint website, and do not make Quint depend on the Chart Wizard runtime.

## Responsibilities
| Component | Owns | Must not |
|---|---|---|
| Quint | Orchestration, final analysis, user communication, decision coordination | Bypass Control risk gates or invent missing evidence |
| Quint Brain | Timestamped market context, structure, levels, liquidity and setup assessments | Place orders or approve account risk |
| Quint Lab | Versioned strategy definitions, backtests, forward tests, scorecards and evidence | Place orders or silently promote unvalidated strategies |
| Quint Control | Account-specific risk policies, permissions, Guardian, order routing, execution and audit | Treat Brain signals or Lab scores as permission to trade |
| Chart Wizard | Separate learning project; source of selected knowledge for distillation | Become a Quint website module, runtime dependency or execution authority |

## Standard message envelope
Messages are JSON-compatible, versioned, timestamped and traceable. Required fields:
- `contract_version`: `1.0`
- `message_id`: unique identifier
- `message_type`: stable message name
- `producer`: `quint`, `brain`, `lab` or `control`
- `created_at`: UTC ISO-8601 timestamp
- `expires_at`: UTC expiry for time-sensitive messages
- `correlation_id`: joins request and response
- `account_id`: opaque internal account reference when needed
- `environment`: `backtest`, `simulation`, `paper` or `live`
- `payload`: message-specific object

Unknown versions, expired messages, missing fields, stale data and instrument mismatches must fail closed for execution.

## Message types

### Brain → Quint: `market.context.response`
Instrument/contract, venue, session and timezone, data source, latest candle timestamp, feed delay, timeframes, market regime, swing structure, relevant levels/zones, volatility context and data gaps.

### Brain → Quint: `setup.assessment`
Instrument, timeframe, session, timestamp, direction (`long`, `short`, `none`), observed facts, regime, levels, source candle IDs, expiry, supporting and contradicting evidence, uncertainty, trigger, invalidation, stop, target and reward/risk. Include the five-pillar states (location, liquidity_sweep, CISD, displacement, execution), each marked `confirmed`, `missing`, `invalidated` or `unknown`. The suggested status is `watch`, `eligible_for_risk_check` or `no_trade`. This is analysis, never an order.

### Quint ↔ Lab: `strategy.evidence.request/response`
Immutable strategy ID/version/hash, exact rules, instrument, dataset/date range, data quality, sample size, chronological in/out-of-sample split, walk-forward method, fees, spread/slippage/fill assumptions, net results, drawdown, losing streak, concentration, robustness, paper-forward status, failure criteria and limitations. Status must be explicit: `idea`, `testing`, `failed`, `provisional`, `validated` or `retired`. Positive backtest alone is not approval.

### Quint → Control: `risk.check.request`
Proposed instrument, side, quantity, order type, entry/stop/target, strategy/bot identity, signal expiry and account reference.

### Control → Quint: `risk.check.response`
Control independently evaluates evaluation/funded status, firm rules, daily loss limit, trailing/static drawdown, profit target, realised/unrealised P&L, open orders/positions, correlated exposure, per-bot limits, accumulated-profit protection, remaining risk budget and runtime health. Response is `approved`, `reduced`, `rejected` or `halted`, with reason codes, exact constraints and a short expiry. Control's decision is authoritative and must be rechecked before submission if state changes.

### Quint → Control → Quint: `execution.request/report`
Only after an unexpired risk approval and required owner/live-mode authorisation. Include unique idempotency key, approval reference, account, strategy, order parameters and signal reference. Report broker order IDs, acceptance/rejection, fills, average price, quantity, fees, slippage, position state and errors. Duplicate requests must not create duplicate orders.

## Quint's decision sequence
1. Request Brain's current context and setup assessment.
2. Request Lab's evidence for the exact strategy version.
3. Defer or reject when data is stale, evidence is missing, strategy is unvalidated, setup incomplete or sources materially conflict.
4. If eligible, request account-specific Control risk approval.
5. Explain the rationale and proposed action; respect the owner's authorisation settings.
6. Route orders only through Control's single protected execution path.
7. Record analysis, evidence, approvals, execution, fills and outcomes.

No direct Brain-to-broker or Lab-to-broker path. Any timeout, malformed/expired response, component outage or conflicting account state means no new order.

## Account-aware protection
Control holds separate policy per account and environment. Evaluation and funded accounts may have different daily loss limits, profit targets, drawdown rules, position sizing and permitted strategies. Policies should support evaluation/pass mode, funded/profit-protection mode, explicit growth mode, adaptive risk reduction, normal pullback tolerance within hard limits, and stopping new entries at configured target/lockout conditions. Never widen hard stops or breach firm rules. Do not hardcode private account values in this public repository.

## Reliability and security
Use UTC timestamps, stable IDs, schema validation, versioned payloads, idempotency keys, source-candle references and append-only audit events. Distinguish observation, interpretation and recommendation. Fail closed on stale, malformed, contradictory or expired messages. Brain and Lab never receive broker credentials. Keep secrets, account numbers and private P&L out of Git. Isolate simulation/paper from live credentials. Test duplicate, delayed, stale, malformed, mismatched and disconnected messages plus restart recovery.

## Suggested implementation sequence
1. Add schemas and valid/invalid fixtures.
2. Add typed adapters and contract tests without changing trade behaviour.
3. Connect Quint to read-only Brain/Lab outputs.
4. Connect Control risk checks in simulation only; test Guardian and account policies.
5. Add paper execution and reconciliation.
6. Consider live integration only after separate testing and explicit owner approval.

This proposal does not override Quint Control's current HOLD status or existing phase gates. Do not begin large integration or change execution paths merely because this document exists.

# Quint shared intelligence contract — proposal

**Status: PROPOSED / NOT IMPLEMENTED.** This document is a design suggestion for Quint Main. It does not authorise a build, alter existing runtime behaviour, or approve live trading. Quint Control is currently on HOLD; implementation must wait for the owner's explicit green light and the project's existing release gates.

## Objective

Give Chart Wizard, Quint Brain, Quint Lab and Quint Control one small, versioned way to exchange analysis and evidence without duplicating strategy logic or allowing an analysis component to place orders.

The contract is a data boundary, not a new autonomous "super-brain". Each component retains its existing responsibility.

## Component ownership

| Component | Publishes | Consumes | Authority |
|---|---|---|---|
| Chart Wizard | Educational chart observations, pattern labels and coaching context | Market/chart snapshots | Learning only; no trade authority |
| Quint Brain | Timestamped market assessment and five-pillar state | Market data, Chart Wizard knowledge, Lab evidence | Analysis only; cannot route orders |
| Quint Lab | Versioned strategy definitions, backtest/forward-test evidence, scorecards and validation verdicts | Candidate strategies, historical and paper results | Research verdicts only; cannot enable live trading |
| Quint Control | Account-specific risk decision, execution status and audit events | Brain assessment, Lab evidence, account rules and operator permissions | Sole owner of Guardian, account risk enforcement and order routing |
| Quint Main | User-facing orchestration and explanation | Approved outputs from the components | Must not bypass component authority boundaries |

## Canonical message envelope

Use JSON for the first implementation. Keep the envelope small and allow component-specific payloads to evolve independently.

~~~json
{
  "contract_version": "1.0.0",
  "message_id": "unique-id",
  "message_type": "market_assessment",
  "producer": "quint-brain",
  "created_at": "2026-11-20T15:00:00Z",
  "as_of": "2026-11-20T14:59:55Z",
  "instrument": "MNQ",
  "environment": "sim",
  "correlation_id": "session-or-decision-id",
  "strategy_id": "strategy-id-or-null",
  "strategy_version": "1.2.0",
  "data_quality": {
    "status": "valid",
    "source": "market-data-provider",
    "is_delayed": false,
    "missing_fields": []
  },
  "payload": {},
  "evidence_refs": [],
  "expiry": "2026-11-20T15:01:00Z"
}
~~~

Timestamps must be ISO-8601 UTC. as_of is the latest market-data time actually used; created_at is when the message was produced. A consumer must reject expired, malformed, unsupported-version or stale messages rather than silently treating them as current. Simulated, replay, paper and live environments must never be conflated.

## Message types

Start with only these message types:

1. market_snapshot — normalized market context and candle/data provenance.
2. market_assessment — Brain's chart structure, regime, levels and five-pillar assessment.
3. strategy_candidate — Lab's immutable, versioned strategy rules and intended market/session scope.
4. validation_report — Lab's reproducible backtest, out-of-sample, walk-forward and paper-forward evidence, costs, sample sizes, limitations and verdict.
5. risk_decision — Control's account-specific allow/reject/reduce/stop decision with rule identifiers and reason codes.
6. execution_event — Control's order lifecycle/fill/rejection event and broker references.
7. learning_review — post-trade comparison of the original assessment, risk decision, fills and outcome.

Do not add a generic execute_trade command from Brain, Lab or Chart Wizard. Control should accept a proposed trade intent only through its existing, authenticated and guarded internal workflow.

## Market assessment payload

The Brain assessment should contain:

- instrument, session, timeframe and market-data timestamp;
- regime: trend, range, transition or unknown;
- structure observations and key levels/zones, each with source timeframe and validity;
- five-pillar states: location, liquidity sweep, CISD, displacement and execution readiness;
- observed facts separately from interpretations and hypotheses;
- setup direction, trigger, invalidation, stop, target and expected reward/risk when defined;
- missing confirmations, counter-evidence and explicit STAY_OUT when conditions are incomplete;
- confidence/uncertainty with a documented meaning, not a fabricated probability;
- expiry and evidence references.

No future candles or hindsight-derived features may appear in an assessment for a historical decision. Every observation must be traceable to data available at its as_of timestamp.

## Lab evidence payload

A validation report must identify the exact strategy ID/version, code or rules hash, data range/source, timeframes, timezone/session, trade count, train/test split, walk-forward/holdout results, commissions, slippage, fill model, drawdown, losing days, concentration and robustness checks. Include paper-forward duration/trades and differences from simulated expectations.

A Lab verdict is evidence, not live permission. Never promote a strategy based only on in-sample results or a chart screenshot. Preserve rejected and inconclusive results to prevent repeated rediscovery and cherry-picking.

## Control risk decision payload

Control evaluates each account independently. Its decision must use that account's current mode (evaluation/funded/sim), firm rules, daily loss limit, profit target, trailing/static drawdown, realised and unrealised P&L, open risk, bot permissions, session restrictions and operator authorisation.

Suggested outcomes: ALLOW, REDUCE, REJECT, STOP_NEW_ENTRIES, FLATTEN_AND_LOCK. Include account ID in the private runtime message, rule/version references, decision timestamp, reason codes and expiry. Do not expose account identifiers or balances in public logs or shared research artefacts.

Hard limits and Guardian protections always override Brain signals, Lab verdicts, bot preferences and profit targets. Profit protection and healthy pullback tolerance must be explicit account-policy rules; never widen a hard stop or exceed a hard loss limit to accommodate a strategy thesis. A passed evaluation or funded account does not grant permission to increase risk automatically.

The existing one-bot-per-account/no-hedging constraint remains in force unless separately verified and changed by the owner. Multiple strategies must not be assumed to hedge each other on one account.

## Event flow

1. Market-data adapter emits a timestamped market_snapshot.
2. Brain consumes the snapshot and publishes a market_assessment; Chart Wizard's reusable knowledge may inform interpretation but cannot add execution authority.
3. Lab supplies the current validation status for the exact strategy version. Missing, stale or failed evidence is treated as not approved.
4. A candidate trade intent enters Quint Control's existing guarded path.
5. Control independently checks account rules, permissions, data freshness, current positions and risk, then emits a risk_decision.
6. Only Control's existing OrderRouter may submit an order, after all required authorisations and safeguards pass.
7. Control emits execution_event; Lab/Brain may consume the event for journal and learning review.
8. A learning_review compares the decision-time evidence with actual fills and outcomes without rewriting the original assessment.

A failure, timeout, missing dependency, schema mismatch or unavailable risk state must fail closed: no new order.

## Engineering requirements

- Define JSON Schema files under a future shared protocol directory; validate producer and consumer payloads at runtime and in tests.
- Use semantic versioning. Additive optional fields may be minor changes; breaking changes require a major version and migration plan.
- Maintain compatibility tests and representative fixtures for every message type.
- Make messages idempotent using message_id; preserve correlation_id across the full decision lifecycle.
- Keep strategy definitions canonical and immutable by version. Components reference IDs and hashes rather than copying rule text into multiple codebases.
- Log provenance, decision timestamps, rejection reasons and schema versions. Keep secrets and private account data out of Git.
- Use the existing local engine/protocol boundary where possible; do not introduce a new cloud service or paid API merely to pass messages between local components.
- Do not rebuild or replace current apps as part of this proposal. First map current data structures and identify the smallest safe adapter layer.

## Suggested implementation sequence — only after approval

1. Audit current source structures and existing protocols in Chart Wizard, Quint Brain, Quint Lab and Quint Control. Produce a mapping; do not change runtime behaviour.
2. Draft JSON Schemas and fixtures for market_snapshot, market_assessment and validation_report.
3. Add read-only adapters in Brain and Lab; prove round-trip compatibility using recorded fixtures.
4. Add Control-side validation and risk-decision contract tests without enabling order submission.
5. Test stale data, malformed payloads, duplicate events, disconnects, restarts, partial fills, account isolation and Guardian overrides.
6. Only after explicit owner approval, connect the guarded candidate-intent path in simulation; prove that no component other than Control can route orders.
7. Run sustained paper forward tests and review audit logs before considering any live authorisation.

## Acceptance criteria

- Every message has valid schema version, producer, timestamp, data provenance and correlation ID.
- A stale, malformed, duplicate or unsupported message cannot trigger an order.
- Brain, Lab and Chart Wizard have no broker-order capability.
- Lab's evidence is tied to an exact immutable strategy version.
- Control independently enforces each account's limits even when upstream components recommend a trade.
- Account data remains isolated and private.
- Simulation and live environments cannot be mixed accidentally.
- Automated tests prove fail-closed behaviour and Guardian precedence.
- Existing repository tests remain green; no tests are claimed without actually running them.

## Decision requested

Treat this as a suggested architecture for Quint Main, not an instruction to start building. The owner should approve the interface and implementation phase before any code changes. Quint Control's existing HOLD and explicit-green-light requirements remain unchanged.

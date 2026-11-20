# Guardian: Per-Account Objectives, Capital Protection and Adaptive Profit Management

**Status:** Proposed design for Quint Control Phase 2. Documentation only.  
**Implementation authority:** Not authorised by this document. Quint Control's existing HOLD/build gates remain in force.  
**Core rule:** Every account has an isolated Guardian profile, whether it is a simulation, evaluation or funded account. Broker/prop-firm rules are hard constraints; the owner's personal limits may only make those constraints stricter.

## 1. Purpose

Guardian must manage each account toward its current objective without treating every account identically:

- **Simulation:** test the same account-specific risk and objective logic intended for evaluation/funded use. Simulation must not bypass Guardian.
- **Evaluation / pass mode:** prioritise reaching the account's evaluation target while preserving enough drawdown room to survive normal variance. Do not maximise short-term P&L or force trades to hit a target.
- **Funded / capital-protection mode:** prioritise retaining the funded account and protecting accumulated profits. Permit a controlled amount of ordinary pullback, but reduce risk or stop opening new trades as risk rises.
- **Paused / review mode:** no new entries until the owner resolves an account, data, rule or reconciliation issue.

The account's phase must be explicit and visible. A simulation account can be configured to emulate evaluation or funded mode, but its simulated status must remain clearly labelled.

## 2. Isolated account profile

Each account has its own immutable-at-decision-time profile and state. Never share mutable daily P&L, high-water marks, limits, phase, or learning statistics between accounts.

Minimum profile fields:

- Stable account ID, broker/provider, account type, currency, size and environment (simulation/evaluation/funded).
- Objective phase: simulation-evaluation, evaluation-pass, funded-protection, or paused.
- Firm-rule profile and version, source URL, verification date and effective dates.
- Personal daily loss limit, personal daily profit objective, maximum drawdown buffer, maximum risk per trade, maximum contracts, daily trade/order limits, session rules and news restrictions.
- Profit-protection configuration: activation threshold, giveback bands, minimum retained profit, allowed retracement model, and actions at each band.
- Strategy/bot allowlist, account allocation and risk multiplier.
- Owner-approved mode-transition record and configuration version.

All values must be validated against current firm rules. If a personal setting conflicts with a firm rule, apply the stricter restriction. Missing, stale or contradictory firm rules block live entries until reviewed.

## 3. Daily objectives and account-level limits

For each account, Guardian independently tracks:

- Start-of-session equity and balance.
- Realised P&L, unrealised P&L and net P&L after commissions/fees where known.
- Current equity, session peak equity and high-water mark.
- Firm drawdown floor and remaining room to that floor.
- Personal daily loss threshold and personal daily profit objective.
- Open risk to protective stops, pending orders and aggregate exposure.
- Number of trades, losses, consecutive losses and order activity.

The personal daily loss limit is a hard stop for new entries and may be configured below the firm's limit. It must not be confused with the firm's breach threshold.

A personal daily profit objective is a configurable objective, not a promise or a reason to force a trade. When reached, Guardian can:
1. Stop opening new positions for the session;
2. Reduce permitted risk for any explicitly allowed continuation;
3. Move the account into a protected-profit state; or
4. Apply an owner-selected combination.

Default recommendation: once the objective is reached, stop new entries and manage existing positions under their pre-defined protective plan. Do not automatically flatten a healthy open position solely because a daily target was touched unless that account's approved policy explicitly says to flatten.

All session resets must use the account's configured trading session and timezone, not the computer's local midnight.

## 4. Evaluation-pass mode

Evaluation mode should optimise for a robust pass, not maximum possible daily profit.

- Track progress to the evaluation profit target and remaining loss/drawdown room separately.
- Apply a configurable personal daily loss limit, daily profit objective and risk-per-trade cap.
- Scale risk down as remaining drawdown room contracts or as the account approaches its target.
- Once the account enters a configurable target-proximity zone, use smaller risk, stricter entry quality and/or fewer permitted trades.
- At the personal target, default to stopping new entries for the session.
- At the official evaluation target, stop automated trading and mark the account **Pass target reached — awaiting verification**. Do not assume the firm has confirmed a pass.
- Never increase size, relax filters or take marginal trades just to finish the evaluation sooner.
- Keep the strategy's normal stop and exit logic intact. Guardian can reduce or reject risk; it must not invent a wider stop to keep a trade alive.

Target-proximity zones should be configurable in currency and/or percentage of target remaining. Example zones are illustrative only and must not be hard-coded: normal, approaching target, near target, target reached.

## 5. Funded capital-protection mode

Funded mode changes the objective from passing to preserving the account and retaining earned profit.

Maintain a session and account high-water mark using the correct firm-defined equity/balance basis. Track both firm drawdown and a separate, usually stricter, personal protection floor.

Use configurable protection bands based on peak net session profit and giveback from that peak. Each band can:
- Reduce the maximum risk per trade;
- Reduce contract size;
- Require stronger strategy confidence / setup quality;
- Restrict additional entries;
- Stop new entries for the session; or
- Trigger a configured flatten action where appropriate.

A giveback is measured from the session peak, not from the day's starting balance. The profile must state whether the measure includes unrealised P&L, realised P&L, fees and open positions. Use the stricter relevant firm rule where required.

Do not use a single rigid trailing-profit threshold that exits every position at the first small retracement. Distinguish:
- Ordinary price pullback inside a healthy trade;
- Normal intraday equity fluctuation;
- Deteriorating trade structure or strategy invalidation;
- Account-level profit giveback that threatens the personal protection floor;
- Imminent firm drawdown breach.

Account-level protection and trade-level stop management are separate controls. A personal profit floor may stop new entries while allowing an existing position to follow its valid strategy exit, provided doing so cannot violate a hard account or firm limit.

## 6. Allowing healthy retracements without surrendering protected profit

Guardian should not label a pullback as unhealthy using a fixed point or percentage amount for every bot and market condition.

Build a per-strategy/per-instrument evidence profile from completed, correctly tagged trades and market conditions. Relevant measures include:
- Maximum adverse excursion (MAE) and maximum favourable excursion (MFE);
- Giveback from peak open profit before a successful exit;
- Retracement depth, duration and volatility regime;
- Spread, slippage, commissions and time of day;
- Setup type, entry quality, stop distance and exit reason;
- Whether the trade eventually reached its intended target or invalidation.

Use robust distributions and sample-size checks (for example, percentiles and confidence intervals) rather than a few memorable trades. Separate long and short trades where evidence supports it. Keep data chronological and avoid leakage from future trades.

The model may inform a bounded retracement allowance or protection-band setting. It must never:
- Override a hard firm rule or personal loss cap;
- Remove or widen a protective stop;
- Increase account risk automatically;
- Reclassify a losing trade as safe based on a prediction;
- Learn from unverified, corrupted or mismatched fills;
- Treat simulated fills as equivalent to verified live fills without labelling the difference.

If the evidence is weak, the system falls back to the conservative configured policy and explains that it lacks sufficient data.

## 7. Continuous learning with controlled change

Quint should continuously collect evidence and improve its recommendations, but live risk controls must not silently self-modify.

Learning pipeline:
1. Record every Guardian decision, inputs, profile version, account state, action and reason.
2. Join decisions to actual order lifecycle, fills, fees, slippage, MAE/MFE and final outcomes.
3. Segment by account, strategy version, instrument, session and market regime.
4. Compare expected versus actual drawdown, giveback, stop behaviour and target attainment.
5. Produce candidate parameter changes with evidence, sample size, confidence, expected benefit and downside.
6. Test candidates on historical replay, walk-forward periods and simulation forward tests.
7. Require owner approval before any candidate changes a live account's Guardian profile.
8. Version every approved profile and preserve rollback.

The learning/AI layer is advisory only. Deterministic Guardian code remains the final authority. AI cannot change limits, approve trades, bypass blocks, or become a runtime dependency for protecting an open position.

## 8. Account state machine

Suggested explicit states:

- **SIMULATION_TEST:** simulated account, using a selected evaluation or funded policy.
- **EVALUATION_NORMAL:** normal pass-mode risk.
- **EVALUATION_TARGET_APPROACHING:** lower risk and stricter entry selection.
- **EVALUATION_TARGET_REACHED:** block new entries; await owner/firm verification.
- **FUNDED_NORMAL:** funded account protection policy active.
- **FUNDED_PROFIT_PROTECTED:** profit protection bands active; risk reduced.
- **DAILY_OBJECTIVE_REACHED:** no new entries by default; existing positions follow approved exit policy.
- **RISK_LOCKED:** loss, drawdown, news, connection, stale-data or other hard stop active.
- **RECONCILIATION_REQUIRED:** broker/engine state mismatch; no entries.
- **PAUSED:** owner or system pause.

Transitions must be explicit, logged and deterministic. Evaluation-to-funded is never an automatic assumption. The owner must verify the firm's funded status and explicitly approve the profile transition. A reset/new evaluation must create a new account-cycle record rather than erase history.

## 9. Guardian decision contract

Extend the existing Guardian.Check decision to include:
- Account ID and account-cycle ID;
- Phase and state;
- Profile/rule versions;
- Current equity, session peak, realised/unrealised/net P&L;
- Firm drawdown floor and remaining room;
- Personal daily loss/profit thresholds and distance to each;
- Profit-protection band and giveback from peak;
- Proposed order risk and resulting account risk;
- Decision: Allow, Reduce, Block, StopNewEntries, Flatten (only where explicitly authorised);
- Human-readable reason codes and explanation;
- Whether owner review is required.

A decision must be reproducible from its logged inputs. If required values are missing, stale, non-finite or inconsistent, fail closed for new entries.

## 10. Required test scenarios

Implement as deterministic scenarios in both the JavaScript reference and C# self-test suite. Run each repeatedly with fixed inputs and expected outcomes.

1. Two simulation accounts have different daily loss limits and profit targets; one account's state cannot affect the other.
2. Evaluation account approaches target; risk reduces according to its profile.
3. Evaluation account reaches personal daily profit objective; new entries stop by default.
4. Evaluation account reaches official target; new entries remain blocked pending verification.
5. Evaluation account is not automatically marked funded.
6. Funded account reaches a session profit peak and then gives back within its allowed retracement band; valid trade is not prematurely flattened.
7. Giveback crosses a protection band; new risk is reduced or blocked as configured.
8. Personal protection floor is stricter than firm floor; personal floor wins.
9. Firm drawdown floor is approached intraday, including open P&L; hard firm protection wins over any adaptive allowance.
10. Normal trade retracement is distinguished from strategy invalidation using validated per-strategy evidence.
11. Insufficient trade history causes conservative fallback, not optimistic adaptation.
12. Corrupt, stale or out-of-order trade history cannot change a profile.
13. AI proposes loosening a risk limit; Guardian rejects the change without owner approval.
14. Owner approves a candidate profile; new version is recorded and rollback remains possible.
15. Session rollover uses the account timezone and does not reset at local midnight.
16. Fees and slippage are included where available; unknown costs are explicitly marked.
17. Partial fills, rejected stops, reconnects and position mismatches do not bypass protection.
18. One account hits its loss limit while another account remains eligible; only the affected account is locked unless an aggregate hard constraint applies.

## 11. Dashboard and audit requirements

For each account, show:
- Environment and phase (simulation/evaluation/funded);
- Current objective and progress;
- Personal daily loss remaining and official firm drawdown room;
- Personal daily profit objective and distance to target;
- Session peak profit, current profit and giveback;
- Active protection band and allowed risk;
- Current state, blocks and exact reason;
- Last Guardian decision and profile version;
- Whether a proposed adaptation is pending owner approval.

Never display a simulated account as funded, an estimated pass as confirmed, or stale values as live. Show timestamps and data-quality state.

## 12. Scope and safety boundary

This document extends the design for Quint Control Phase 2. It does not authorise implementation or alter the current HOLD gate. When implementation is approved, build the JavaScript reference and fake-broker scenario suite first, then port deterministic logic to C# and verify parity inside NinjaTrader. Simulation-only order routing remains the Phase 2 boundary. Live execution requires the existing separate release gates and explicit owner approval.

**Acceptance principle:** every account has its own objective and protection policy; passing is pursued without reckless risk; funded profit is protected without choking off every healthy retracement; and learning improves recommendations through evidence and controlled approval, never by silently weakening safety.

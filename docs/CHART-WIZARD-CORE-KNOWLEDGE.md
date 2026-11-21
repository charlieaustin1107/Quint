# Chart Wizard — condensed chart-analysis knowledge for Quint

**Purpose:** distil selected, valuable chart-reading and setup-recognition knowledge from the separate Chart Wizard project into a concise reference Quint can use. Chart Wizard is not part of the Quint website and is not a Quint runtime dependency.

This is a knowledge specification, not an execution module. It does not authorise a strategy, create a trading signal by itself, or place orders.

## 1. What Chart Wizard contributes

- A structured way to read price action rather than react to isolated candles.
- Multi-timeframe context, swing structure, support/resistance and marked points of interest.
- Liquidity and price-action concepts used by the owner's five-pillar playbook.
- Explicit setup rules, invalidation, stop/target planning and the option to stay out.
- Coaching that explains what the chart actually shows, what is missing and why a decision is or is not valid.
- Post-decision review: compare the user's action with the setup rules and the subsequent outcome.

The coach must analyse only information available at the decision time. Never expose or use future candles when explaining a historical decision.

## 2. Core chart-reading sequence

1. **Market context:** identify instrument, session, timeframe and current regime (trend, range, transition or unclear). State when context is insufficient.
2. **Structure:** identify meaningful swing highs/lows, higher highs/higher lows or lower highs/lower lows, breaks of structure and failed breaks. Distinguish a confirmed close beyond a level from a wick through it.
3. **Location:** map relevant prior highs/lows, session levels, swing levels and supply/demand or other marked zones. Record whether a level is fresh, touched or invalidated.
4. **Liquidity:** identify plausible liquidity pools (for example equal highs/lows and obvious swing extremes) and whether price has swept them. A sweep is evidence to assess, not an automatic entry.
5. **Displacement and confirmation:** assess whether price moved away with meaningful range/urgency and whether the proposed confirmation (including CISD where applicable) is actually present. Do not infer confirmation from a wick alone.
6. **Execution plan:** define direction, entry trigger, invalidation/stop, target, expected reward-to-risk, session/time constraints and conditions that cancel the setup.
7. **Decision:** BUY, SELL or STAY OUT. Staying out is a valid, deliberate outcome when required evidence is absent or risk/reward is poor.
8. **Review:** record which conditions were met, missed or uncertain; then compare the plan with the realised path and outcome without hindsight bias.

## 3. Owner's five-pillar playbook

Keep this playbook distinct and never silently replace it with generic indicator signals:

**Location → Liquidity Sweep → CISD → Displacement → Execution**

- **Location:** price is at a meaningful, pre-identified area.
- **Liquidity Sweep:** price takes liquidity beyond a meaningful high/low; this alone is not an entry.
- **CISD:** the required change in the delivery/price-action sequence is confirmed according to the playbook's exact rule.
- **Displacement:** a decisive move confirms rejection/intent away from the area.
- **Execution:** only enter when the complete required sequence and risk plan are valid.

The current Chart Wizard playbook is specified for the 5-minute chart during the New York session. Preserve the exact implementation rules in source; this document is a concise conceptual summary, not a substitute for executable definitions.

## 4. Strategy teaching: strict evidence gate

Chart Wizard is a learning simulator, not the source of truth for strategy profitability. Its current teaching scope is intentionally narrow:

- 20-candle breakout: 15-minute chart; stop 2 ATR; target 3R (three times the stop distance); exit after 40 candles.
- New York open breakout: first 15 minutes from 09:30 New York; one trade per day; entries allowed until 11:30; stop beyond the opposite side of the opening range; target 2R.
- Owner's five-pillar playbook: 5-minute chart, New York session.

These are the current teaching definitions, **not a claim that they are profitable or approved for live use**. A strategy may be promoted only after reproducible tests on real MNQ data, realistic commissions and slippage, chronological out-of-sample/walk-forward validation, robustness checks and prop-account drawdown analysis. Record evidence and limitations with the result. A backtest or chart example alone is not proof of a durable edge.

## 5. Rules for Quint's explanations

- Separate observed facts, interpretation, hypothesis and decision.
- Name the timeframe and session for every important level or setup.
- Explain the strongest evidence for and against a trade.
- Distinguish a wick/sweep from a candle close and a tentative break from a confirmed one.
- Do not force a trade. If the pillars or setup conditions are incomplete, say what is missing and prefer STAY OUT.
- Do not invent prices, levels, indicators, news context or candle data. State when data is stale, simulated, incomplete or unavailable.
- Avoid hindsight: use only candles and information available at the decision timestamp.
- Keep explanations concise, plain-English and actionable; expose detailed reasoning/evidence in the journal or analysis view.

## 6. Product boundaries and hand-off

| Component | Owns | Must not own |
|---|---|---|
| Quint (operator) | Orchestration, final analysis, user communication and decision coordination | Bypassing Control risk gates or inventing evidence |
| Chart Wizard (separate project) | Source of selected chart-reading knowledge for distillation | Quint website module, runtime dependency, broker access or execution authority |
| Quint Brain | Market analysis, live chart context, five-pillar checks and learning views | Broker execution |
| Quint Lab | Research memory, strategy hypotheses, experiment queue, backtests, scorecards and paper forward evidence | Live broker orders |
| Quint Control | Bot runtime, account-specific risk controls, Guardian, order routing, copier and explicitly authorised execution | Rewriting research evidence or treating an unvalidated setup as approved |
| Quint legacy | Historical reference only | New development unless explicitly revived |

### Required hand-off

Quint Brain should provide Quint with a structured, timestamped chart assessment (instrument, session, timeframe, regime, levels/zones, pillar states, setup, entry trigger, invalidation, target, risk/reward, evidence references, confidence/uncertainty and expiry).

Quint Lab evaluates the strategy and stores the evidence. Quint Brain presents the analysis. Quint Control independently validates account rules, bot permissions, risk limits and execution conditions before any order can be sent. A chart assessment is never an instruction to bypass Guardian or account protections.

## 7. Safety and account-specific risk

- Account-specific daily loss limits, profit targets, drawdown rules and funded/evaluation status belong to Quint Control's account/risk layer, not to Chart Wizard's chart interpretation.
- Protecting accumulated profit is a separate risk decision from whether a chart setup is technically valid. Quint Control may reduce risk, stop taking new entries or protect a passed/near-target account according to its approved account policy.
- Allow normal market pullbacks only within pre-defined risk limits; never widen a stop or override a hard loss limit to accommodate a thesis.
- One bot per account at a time remains the current operating constraint. Do not assume independent strategies can hedge on the same account.
- Live execution requires explicit owner authorisation and all Guardian/kill-switch protections remain mandatory.

## 8. Integration principle

Quint may reuse carefully selected, reviewed chart-analysis rules and knowledge distilled from Chart Wizard. Do not embed Chart Wizard's game, UI, branding, coaching application or full source in the Quint website, and do not make Quint depend on its runtime. Keep one canonical strategy definition and attach versioned evidence to it.

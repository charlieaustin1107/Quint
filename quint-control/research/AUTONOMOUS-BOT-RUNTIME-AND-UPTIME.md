# Autonomous bot runtime, uptime and website operations

**Date:** 20 November 2026  
**Status:** architecture research/build requirements only. No trading code or live execution changed.

## Executive decision

Quint bots must be deterministic, event-driven processes hosted by the NinjaTrader 8 Quint Engine. They must not depend on Claude, an open browser tab or a continuously running AI agent. Claude is an optional per-user assistant for authoring, explaining and reviewing bots; it is not in the tick-by-tick execution path.

The website is the remote control and monitoring interface. The NinjaTrader engine is the runtime and final authority for risk checks and order execution. If the website or Claude goes offline, a healthy local engine may continue under its own Guardian. If the engine or Windows host goes offline, the bot is not running and an external alarm must fire.

## What the current Quint repo already specifies

- NinjaTrader 8 add-on is the engine; the dashboard is currently served locally.
- Bot plug-ins expose strategy metadata/settings, `OnBarClose(BarContext)`, optional `Manage(PositionContext)`, and every entry must have a stop and target.
- Current safe baseline: one bot per account; all orders go through Guardian and the single OrderRouter. Proposed future capability: multiple bots per account only through the account-level Portfolio Manager / Position Coordinator specified in `ACCOUNT-LEVEL-MULTI-BOT-POSITION-COORDINATION.md`. This is a design requirement, not implemented functionality; retain one-bot-per-account enforcement until its release gates pass.
- PositionReconciler runs at startup and every few seconds.
- Protocol has one-second engine heartbeat, market updates up to four per second, snapshots, website auto-reconnect, Telegram alerts and Healthchecks.io offline alarm.
- Stale data, lost connection, bot error and position mismatch block new entries.
- Claude is explicitly excluded from the trading loop.
- New bots default to simulation; live mode requires explicit confirmation.
- Strategy Lab Phase 3A is a local-only prototype, not yet connected to data, persistent storage, engine, backtesting or live paper fills.
- Quint Control Phases 1 (engine + read-only website) and 2 (Guardian/router/copier simulation) are still not started in STATUS.md.

The foundation is right. The remaining gap is detailed unattended operation, process recovery, remote hosting and lifecycle semantics.

## Four different meanings of "always on"

1. **Website availability:** hosted Quint site/API/database stay reachable even when a user's PC is off.
2. **Engine availability:** that user's NinjaTrader 8 application and Quint Engine are running on an awake Windows machine.
3. **Market availability:** futures only stream during exchange sessions. Outside those sessions show Market Closed and the last timestamp, not stale prices presented as live.
4. **Bot availability:** show Running only when the engine is running, required market/order connections are healthy, data is fresh, the account is reconciled and Guardian permits trading.

Closing the browser or phone must not stop a bot. A sleeping/offline PC, Windows reboot or NinjaTrader crash does stop that user's runtime.

## Recommended runtime topology

- Shared cloud web app/API/database: login, tenant isolation, strategy library, bot settings, remote controls, event history, charts, metering and monitoring.
- One isolated NinjaTrader + Quint Engine runtime per user/account owner. For unattended operation use a dedicated Windows VPS/VM per user, or that user's own always-on Windows PC. Do not combine two users' broker logins, accounts, processes or market-data entitlements in one shared NinjaTrader session.
- Each engine initiates an outbound authenticated TLS WebSocket to the cloud. No public inbound port and no exposure of the current localhost server.
- Each tunnel is tenant-scoped, engine-scoped, short-lived/revocable and least-privilege. Cloud commands are revalidated by the local Guardian.
- Keep local mode operational if the cloud is unavailable. Cloud is for control and visibility, not a dependency for every strategy decision.

NinjaScript is a Windows desktop C# framework that runs inside NinjaTrader 8 Desktop, not a browser-side or generic Linux service: https://docs.ninjatrader.com/ninjascript

## Bot lifecycle and persistence

Every bot instance should persist:
- `botId`, owner/tenant, strategy ID and immutable strategy version/hash;
- account (private to owner), instrument/contract, timeframe and trading-hours template;
- config hash, SIM/PAPER/LIVE mode, max contracts and risk preset;
- lifecycle state, last heartbeat, last market event, last decision and last order/fill event;
- broker position/order references and last reconciliation result;
- who enabled it, when, confirmation and full audit trail.

Recommended lifecycle: `Draft → Validating → Backtesting → Paper → Awaiting Approval → Armed → Running → Paused / Stopping → Stopped`, with `Rejected`, `Error` and `Needs Reconciliation` exception states.

Website requests transitions; engine owns authoritative state. Every transition is acknowledged and audited. Use unique command IDs and idempotency so repeated Start requests cannot create duplicate instances or orders.

On engine startup, never blindly restore live Running state. Enter Recovery/Needs Reconciliation, load saved configs, connect to broker/data, fetch actual positions and working orders, reconcile fills/journal, verify protective stops and account limits, then require explicit safe resume if state is uncertain. A mismatch blocks new entries and alerts. Do not automatically flatten just because the cloud tunnel failed; follow the account-specific emergency policy.

## Event-driven execution and efficiency

- Consume NinjaTrader market-data/bar events directly. Evaluate OnBarClose for close-based rules; use tick/price-change processing only where a strategy actually requires it.
- Never poll Claude, the website, REST endpoints or market feed every second to decide trades.
- Use bounded in-memory queues between feed, strategy evaluation, Guardian, OrderRouter and UI updates. Never block NinjaTrader event/UI threads.
- Keep strategy logic pure/deterministic; no network calls or LLMs in the hot path.
- Preserve events needed for correct signals and audit. Coalesce only chart/dashboard presentation updates.
- Batch non-urgent telemetry; durably flush order, fill and risk events.
- Use one scheduler for session boundaries, scheduled checks, news windows, expiry and health checks with exchange timezone/DST tests.
- Apply backpressure and queue limits. If processing lags or data becomes stale, block new entries and alert; never silently drop fills/executions.
- Each bot declares data granularity, warm-up history, required subscriptions and resource budget.

## Connection/recovery state machine

Track market data and broker/order connection separately with states: `Connected`, `Degraded`, `Disconnected`, `Reconnecting`, `Reconciling`, `Healthy`.

On disconnect:
1. Mark the affected feed/order route unhealthy and display last event time.
2. Block new entries; never generate synthetic prices or fills.
3. Preserve broker-held protective orders if confirmed active and verify their status after reconnect.
4. Retry with bounded exponential backoff and jitter; alert after thresholds.
5. On reconnect, fetch full snapshot and reconcile positions, orders, fills and bot state before allowing new entries.
6. Resume only when data is fresh, account state matches, risk limits are recalculated and Guardian permits it.
7. Repeated reconnects or mismatches pause the account and require operator action.

NinjaTrader provides KeepRunning, Recalculate and StopStrategy connection-loss behaviours plus disconnect delays and restart-attempt limits. These settings do not replace Quint's reconciliation logic. Do not blindly select KeepRunning for live routing. References:
- https://docs.ninjatrader.com/ninjascript/connectionlosshandling
- https://ninjatrader.com/support/helpGuides/nt8/options_strategies.htm

NinjaTrader's strategy development documentation says strategies are terminated when NinjaTrader shuts down. Therefore unattended operation needs NinjaTrader and Quint Engine on an awake Windows host; a cloud website cannot keep NinjaScript alive: https://docs.ninjatrader.com/ninjascript/the_strategy_development_process

## Windows host and process supervision

For each user's Windows runtime:
- Disable sleep during trading sessions; schedule updates/reboots in a maintenance window.
- Use documented, user-authorized startup. Never put broker passwords in scripts or source control.
- Add a watchdog for process health, engine heartbeat, data/order connectivity and event-loop lag. Alert first; do not endlessly restart a faulty live engine.
- If NinjaTrader crashes, record state, notify owner, and use a controlled restart policy. On restart always enter Recovery/Needs Reconciliation, never live trading immediately.
- A separate Windows service or scheduled task may handle non-trading support work (tunnel agent, log shipper, health pinger) if appropriate. Do not run NinjaScript outside NinjaTrader.
- Rotate logs and monitor disk, CPU, memory, latency and clock sync. Keep durable journals and backups.
- Test Windows updates, host reboots, NinjaTrader crashes, network outages, token expiry, market holidays and contract rolls.

## Website behaviour

Dashboard is never the execution host or process supervisor. It should:
- Show per-user bot state, engine state, market/order feed freshness, last event time, last reconciliation and host uptime.
- Offer Start, Pause, Resume, Stop and Flatten with role checks and explicit confirmation for risk-increasing actions.
- Show an offline/uncertain-state banner and disable Start/Resume while disconnected or unreconciled.
- Send commands through the authenticated user-specific engine tunnel; show pending/accepted/rejected/timeout. A timeout must not blindly resend a non-idempotent order.
- Keep read-only monitoring available if engine is offline.
- Distinguish Market Closed from Data Disconnected.
- Keep an audit trail and per-user usage/cost metrics.

A browser can close and a user can log out without affecting a running engine. If Stop/Kill receives no acknowledgement, say the engine is unreachable and trigger escalation; never pretend the stop succeeded.

## Monitoring and alerts

Use local checks plus an external dead-man's switch. Existing plan already specifies Healthchecks.io and Telegram. Healthchecks.io currently lists Hobbyist at $0/month for 20 checks; Supporter is $5/month with the same 20-check limit: https://healthchecks.io/pricing/

Suggested checks: engine alive; NinjaTrader connected; data fresh during expected sessions; broker/order feed healthy; journal writer healthy; cloud tunnel connected; strategy event-loop lag; backup/maintenance success.

Do not hide partial failure behind one green status. Use a small set of meaningful checks with per-user alert routing and deduplication. The dead-man's switch must be hosted outside the Windows runtime so it can alert when that machine is down.

## AI usage and costs

**No additional Claude spend is required to keep deterministic bots running.** Their market-event processing uses local CPU/memory and market-data/network resources, not Claude tokens.

Claude API calls should be explicit user actions only: translate a natural-language idea into a proposed strategy definition, explain a trade/block from recorded events, summarize a journal, compare evidence or research a hypothesis.

Never call Claude on every tick, candle, heartbeat, chart repaint or position update. Never allow an LLM to submit orders or override Guardian rules.

Claude API is token/model billed per user. Add individual monthly caps, usage meter, caching for repeated static context, compact event summaries and opt-in scheduled AI reports. Chat subscription is not a substitute for API billing. Official pricing: https://platform.claude.com/docs/en/about-claude/pricing

## Incremental cost model

| Item | Billing scope | Cost implication |
|---|---|---|
| Shared website/API/database | Shared once | Existing small-hosting budget; grows with users/storage |
| Deterministic bot runtime | Shared code, per-user local engine | No Claude or per-bot SaaS charge in this design |
| Windows NinjaTrader host | Per user | Existing plan estimates ~$30–$40/month for one Windows server; a second independent cloud runtime may add a similar rental |
| User's own awake PC | Per user | £0 extra server rental, but not available if asleep/off |
| Claude API | Per user | £0 when no AI requests; token charges only on use |
| Market data/broker/API | Per user | Own entitlements and any exchange/API fees; confirm separately |
| Healthchecks.io | Shared monitoring with separate checks | Hobbyist $0 for 20 checks; Supporter $5 with same count |
| Logs/storage | Shared infrastructure, tenant-separated | Depends on retention and event volume |

The previous $30–$40 Windows host estimate was one host, not automatically two users. Do not promise a fixed total before current VPS quotes and per-user market-data entitlements are confirmed.

## Required soak and fault tests before live deployment

1. Run all planned bots in simulation for 5 full US sessions; record CPU, memory, event lag, feed age, reconnects, journal parity and Guardian blocks.
2. Close browser and phone; confirm bots continue and alerts still arrive.
3. Disconnect data, order feed and cloud tunnel independently; confirm entries block and stale prices are never used.
4. Kill NinjaTrader and reboot Windows; confirm external alert, Recovery state and no live restart before reconciliation.
5. Restart website/API; confirm engine continues and reconnects without duplicate bot instances/orders.
6. Inject duplicate/delayed/out-of-order ticks, fills and commands; confirm idempotent and deterministic handling.
7. Verify broker-held stops/targets survive supported disconnect cases on Sim before live.
8. Test market close, holidays, DST, contract roll and reopen gaps.
9. Take one user offline while the other remains online; confirm no cross-tenant effects.
10. Run test suites three times and preserve reports with the release candidate.

## Implementation sequence

- Phase 1: read-only engine/website shell; add health/status fields and event-loop instrumentation.
- Phase 2: Guardian, OrderRouter, account reconciliation, idempotent commands and simulation-only execution.
- Phase 3: strategy plug-ins, lifecycle persistence and event-driven evaluation.
- Phase 4: backtests, Playback, paper forward tests and evidence.
- Phase 4b/5: remote controls, alerts, external dead-man monitoring and AI assistant.
- Phase 6: 5-session soak, fault injection and supervised release candidate.

Do not accelerate into live trading before recovery and soak-test gates pass.

## Acceptance criteria

- Closing a browser never stops an engine.
- Claude outage or exhausted budget never stops a deterministic bot.
- Website/API outage never bypasses Guardian or creates duplicate orders.
- Bot config, version, state and audit survive process restart.
- Engine restart reconciles broker state before live resume.
- Stale/disconnected data blocks new entries.
- Offline host is detected by an external dead-man's switch.
- Each user's bots, feeds, credentials, account data, alerts and AI budget remain isolated.
- A bot is never labelled Running unless its engine and required connections are healthy.

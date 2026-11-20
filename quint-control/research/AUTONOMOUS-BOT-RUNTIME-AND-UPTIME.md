# Autonomous bot runtime, uptime and website operations

**Date:** 20 November 2026  
**Status:** architecture research and build requirements. No trading code or live execution changed.

## Executive decision

Quint bots must be deterministic, event-driven processes hosted by the NinjaTrader 8 Quint Engine. They must not depend on Claude, an open browser tab, or a continuously running AI agent. Claude is an optional per-user assistant for authoring, explaining and reviewing strategies; it is not in the tick-by-tick execution path.

The website is the remote control and monitoring interface. The local NinjaTrader engine is the runtime and the final authority for risk checks and order execution. If the website or Claude goes offline, an already-running engine may continue only while its own data/order connections and local safety checks remain healthy. If the engine or machine goes offline, no claim of continued bot execution is allowed.

## What already exists in Quint

The existing Quint Control plan and protocol already specify:
- NinjaTrader 8 add-on as the engine; the dashboard is served locally today.
- A bot plug-in interface with strategy metadata/settings, `OnBarClose(BarContext)`, optional `Manage(PositionContext)`, and mandatory stop plus target on every entry signal.
- One bot per account at a time.
- Guardian and OrderRouter as mandatory risk and order boundaries.
- PositionReconciler on startup and every few seconds.
- One-second engine heartbeat; live market updates to the dashboard at up to four per second.
- Website auto-reconnect, snapshot resynchronization, Telegram alerts and a Healthchecks.io offline alarm.
- Stale data, connection loss, bot error and position mismatch block new entries.
- Claude is explicitly excluded from the trading loop.
- New bots default to simulation; live mode requires a deliberate confirmation.
- Strategy Lab is currently a local browser prototype; it is not yet connected to market data, persistent storage, engine, backtesting or live paper fills.
- Quint Control Phase 1 (engine + read-only website) and Phase 2 (Guardian/router/copier simulation) remain not started in STATUS.md.

The core architecture is correct. The missing work is to turn uptime, recovery, process supervision, remote operation and lifecycle semantics into testable implementation requirements.

## Separate four different kinds of "always on"

1. **Website availability:** the hosted Quint site and database remain reachable even when a user's PC is off.
2. **Engine availability:** the user's NinjaTrader 8 application and Quint Engine process are running on an always-on Windows machine.
3. **Market availability:** futures are only live during their exchange sessions; outside those hours the dashboard shows Market Closed and the last timestamp, not fake live ticks.
4. **Bot availability:** a bot is Running only when its engine is running, required market/order connections are healthy, market data is fresh, its account is reconciled, and its Guardian permits trading.

The website being online does not mean a bot is running. A browser closing must not stop a bot. A Windows host sleeping, rebooting, losing power or NinjaTrader closing does stop the local runtime and must trigger an offline alarm.

## Recommended runtime topology

- Shared cloud web app/API/database: login, two-user tenancy, bot configuration, strategy library, event history, charts, remote controls, usage metering and monitoring.
- One isolated NinjaTrader + Quint Engine runtime per user/account owner. For unattended operation, use a dedicated Windows VPS/VM per user, or each user's own always-on Windows PC. Do not combine two users' broker logins, accounts, processes or market-data entitlements in one shared NinjaTrader session.
- Each engine initiates an outbound authenticated TLS WebSocket to the cloud. No public inbound port or direct exposure of the current localhost server.
- Each connection is tenant-scoped, engine-scoped, short-lived/revocable and least-privilege. The cloud sends commands only to that user's engine. The local Guardian revalidates every command and every order.
- Keep a local mode working when the cloud is unavailable. Cloud is for control/visibility, not a dependency for each strategy decision.

NinjaScript is a Windows desktop C# framework that runs inside NinjaTrader 8 Desktop, not a browser-side or generic Linux service. Official docs: https://docs.ninjatrader.com/ninjascript

## Bot lifecycle and persistence

Every bot instance should have a durable identity and version:
- `botId`, owner/tenant, strategy ID and immutable strategy version/hash.
- account ID (private to that owner), instrument/contract, timeframe and trading-hours template.
- configuration hash, approved mode (SIM/PAPER/LIVE), max contracts and risk preset.
- lifecycle state, last heartbeat, last market event, last decision, last order/execution event.
- current position/order references and last broker reconciliation result.
- operator who enabled it, timestamp, confirmation record and audit trail.

Recommended lifecycle:
`Draft → Validating → Backtesting → Paper → Awaiting Approval → Armed → Running → Paused / Stopping → Stopped`, with terminal/exception states `Rejected`, `Error`, `Needs Reconciliation`.

The website requests lifecycle transitions; the engine owns the authoritative state. Every transition is acknowledged and audited. Duplicate commands are idempotent using unique command IDs. A repeated Start must not create a second bot instance or duplicate orders.

Persist config and audit/events durably. On engine startup, never blindly restore the previous Running state. Enter `Recovering` / `Needs Reconciliation`, load saved bot configs, connect to broker/data, fetch actual positions and working orders, reconcile against the journal, verify protective stops and account limits, and require explicit resume/arm if state is uncertain. If there is a mismatch, block new entries and alert. Do not auto-flatten merely because the cloud connection was lost; follow the pre-defined account-specific emergency policy.

## Event-driven processing and resource efficiency

- Consume NinjaTrader market-data/bar events directly. Evaluate a strategy on the event granularity it requires: OnBarClose for close-based logic, price-change/tick events only where the strategy specification needs them.
- Do not poll Claude, the web app, REST endpoints or the market feed every second to decide trades.
- Use bounded in-memory queues between market events, strategy evaluation, risk checks, order routing and UI updates. Never block NinjaTrader's event/UI threads.
- Keep strategy calculations pure/deterministic; no network call or LLM in the hot path.
- Preserve all market events required for signal correctness and the audit ledger; coalesce only dashboard/chart presentation updates.
- Batch non-urgent persistence and telemetry, but flush order/fill/risk events durably.
- Use one scheduler for time-based events (session open/close, scheduled strategy checks, news windows, expiry and health checks), with explicit exchange timezone and DST tests.
- Apply backpressure and queue-size limits. If processing falls behind or data becomes stale, stop new entries, surface lag and recover safely; never drop an execution/fill event silently.
- Each bot must declare required data granularity, warm-up history, max CPU/memory budget and expected subscriptions. Avoid loading every bot on every instrument.

## Connection and recovery state machine

Track market-data connection and order/broker connection separately. Each must have explicit states: `Connected`, `Degraded`, `Disconnected`, `Reconnecting`, `Reconciliating`, `Healthy`.

On disconnect:
1. Immediately mark the relevant feed/order route unhealthy and display the last event timestamp.
2. Block new entries for affected accounts; never generate synthetic prices or fills.
3. Preserve broker-held protective orders if confirmed active. Verify actual order status after reconnect.
4. Retry with bounded exponential backoff and jitter; cap retry frequency and alert after thresholds.
5. On reconnect, request a full snapshot and reconcile positions, orders, fills, balances and bot state before allowing new entries.
6. Resume only when data is fresh, account state matches, risk limits are recalculated and Guardian explicitly permits it.
7. If repeated reconnects or state mismatches occur, pause that account and require operator action.

NinjaTrader's own strategy connection-loss options include KeepRunning, Recalculate and StopStrategy, plus configurable disconnect delay and restart-attempt limits. These settings are not a substitute for Quint's add-on-level safety/reconciliation logic. Select and test behaviour per engine mode; do not blindly choose KeepRunning for live order routing. Official references:
- https://docs.ninjatrader.com/ninjascript/connectionlosshandling
- https://ninjatrader.com/support/helpGuides/nt8/options_strategies.htm

NinjaTrader documentation also states that strategies terminate when NinjaTrader shuts down. Therefore unattended trading requires NinjaTrader and Quint Engine to remain running on an awake Windows host; the cloud website alone cannot keep NinjaScript running. Reference: https://docs.ninjatrader.com/ninjascript/the_strategy_development_process

## Process supervision and Windows runtime

For each user's Windows runtime:
- Configure Windows power settings so the host does not sleep during trading hours; install updates/reboot only in a controlled maintenance window.
- Start NinjaTrader/Quint only through a documented, user-authorized startup process. Do not store broker passwords in scripts or source control.
- Add a watchdog that monitors process health, engine heartbeat, data/order connectivity and event-loop lag. It should alert first; it must not endlessly restart a faulty live engine.
- If NinjaTrader crashes, record the last state, notify the owner, and allow a controlled restart only after operator policy. On restart, start in Recovery/Needs Reconciliation, not live trading.
- Use a separate Windows service or scheduled task only for non-trading support tasks (tunnel agent, log shipper, health pinger) if appropriate. Do not run NinjaScript in a generic service outside NinjaTrader.
- Rotate logs, monitor disk space, CPU, memory, network latency and clock synchronization. Use a durable journal and backups.
- Test Windows updates, host reboots, NinjaTrader crashes, network outages, API token expiry, market holidays and futures contract rollovers.

## Website operation

The dashboard should never be the process supervisor or trading engine. It should:
- show bot state, engine state, market-data freshness, broker/order-feed status, last event time, last reconciliation and host uptime.
- offer Start, Pause, Resume, Stop and Flatten controls with permission checks and explicit confirmation for risk-increasing actions.
- show a visible banner if the engine is offline or state is uncertain; disable Start/Resume while disconnected or unreconciled.
- send commands over the authenticated per-user engine tunnel; display pending/accepted/rejected/timeout results. A timeout must not blindly resend a non-idempotent order command.
- keep read-only monitoring available if an engine is offline.
- show Market Closed separately from Data Disconnected.
- keep audit trail and per-user usage/cost metrics visible.

A browser tab can close, a phone can disconnect and a user can log out without affecting an already-running engine. Conversely, pressing Stop or Kill from the website must reach the engine and be acknowledged; if no acknowledgement arrives, clearly report that the engine is unreachable and trigger the offline escalation.

## Monitoring and alerting

Use local health checks plus a hosted dead-man's switch. Existing Quint plan already proposes Healthchecks.io and Telegram. Healthchecks.io's Hobbyist tier currently lists $0/month and 20 monitored jobs; paid Supporter is $5/month with the same limits. Source: https://healthchecks.io/pricing/

Suggested checks:
- engine process alive;
- NinjaTrader connected;
- market-data feed fresh during expected sessions;
- broker/order feed healthy;
- journal writer functioning;
- cloud tunnel connected;
- bot evaluation loop not lagging;
- backup/maintenance jobs completed.

Do not ping a single "everything okay" check if it hides partial failures. Use a small number of meaningful checks, with a per-user owner contact and alert deduplication. The dead-man's switch must be hosted outside the Windows runtime so it can notify when the machine is down.

## AI usage and costs

**No additional Claude spend is required to keep deterministic bots running.** A bot that processes market events and follows compiled rules consumes local CPU/memory and market-data/network resources, not Claude tokens.

Claude API calls should occur only when a user asks for help or explicitly requests an AI task such as:
- convert a natural-language idea into a proposed strategy definition;
- explain why a bot entered, exited or was blocked using recorded events;
- summarize a day's journal;
- compare test evidence or propose a research hypothesis.

Never call Claude on every tick, every candle by default, every heartbeat, every chart repaint or every position update. Do not allow an LLM to directly create orders or override Guardian rules.

Claude API usage is billed by tokens/model and belongs to each user separately. Current official pricing: https://platform.claude.com/docs/en/about-claude/pricing. Add per-user monthly caps, usage meter, caching for repeated static context, compact event summaries and explicit opt-in for scheduled AI reports. A subscription to Claude chat is not a substitute for API billing.

## Incremental cost model

The exact total depends on whether the user supplies an always-on PC or rents a Windows VPS, plus vendor data entitlements and broker/prop rules.

| Item | Shared or per user | Incremental cost expectation |
|---|---|---|
| Shared website/API/database | Shared once | Existing planned hosting budget; scale with traffic/storage |
| Bot runtime code | Shared software | No Claude charge; no per-bot SaaS fee in this design |
| Windows NinjaTrader host | Per user | Existing plan estimated ~$30–$40/month for one Windows server; a second isolated user host may add a similar rental if both need cloud uptime |
| User's own awake PC | Per user | £0 extra hosting rental, but not available if sleeping/off |
| Claude API | Per user | £0 when no AI requests; token charges only when used |
| Market data/broker/API | Per user | Depends on each user's own entitlement and any API/exchange fees; confirm before build |
| Healthchecks.io | Shared monitoring service, separate checks | Hobbyist $0 for 20 checks; $5 Supporter currently has same check limit |
| Telegram alerts | Per user bot/channel | Usually no platform subscription for basic bot messaging; verify any optional notification provider |
| Storage/log retention | Shared service, tenant-separated | Grows with retention and event volume |

Do not promise a single fixed monthly figure until current Windows VPS quotes, NinjaTrader/Tradovate entitlements, exchange fees and API terms are confirmed. The prior $30–$40 Windows host estimate is for one host, not automatically two users.

## Operational testing required before any live deployment

1. Run 5 full US sessions in simulation with all planned bots; record CPU, memory, event lag, feed age, reconnects, journal consistency and Guardian blocks.
2. Close the browser and phone; verify bots continue and Telegram still alerts.
3. Disconnect market data, order feed and cloud tunnel independently; verify entries block and no stale prices are used.
4. Kill NinjaTrader and reboot Windows; verify dead-man alert, Recovery state and no automatic live restart before reconciliation.
5. Restart the website/API; verify engine keeps running and reconnects without duplicate bot instances or orders.
6. Inject duplicate, delayed and out-of-order ticks, fills and command messages; verify deterministic handling and idempotency.
7. Verify stop/target orders are broker-held and remain active under the supported connection when the local app disconnects; this must be proven on Sim before live.
8. Test market close, holidays, DST, contract rollover and reopen gaps.
9. Test one user offline while the other remains online; verify no cross-tenant effects.
10. Run tests three times and keep test reports with the release candidate.

## Recommended build sequence

- Phase 1: engine/website read-only shell; add runtime health/status fields and event loop instrumentation.
- Phase 2: Guardian, OrderRouter, account reconciliation, idempotent commands and simulation-only execution.
- Phase 3: strategy plug-ins with lifecycle persistence and event-driven evaluation; Strategy Lab remains staged.
- Phase 4: backtests, Playback, paper forward tests and evidence.
- Phase 4b/5: remote website controls, alerts, hosted dead-man monitoring, AI assistant and daily reports.
- Phase 6: 5-session soak test, fault injection and supervised release candidate.

Do not accelerate into live trading before the recovery and soak-test gates pass.

## Acceptance criteria

- Closing a browser never stops an engine.
- Claude outage or exhausted Claude budget never stops a running deterministic bot.
- Website/API outage never bypasses Guardian or causes duplicate orders.
- Each bot's config, version, state and audit trail survive a process restart.
- Engine restart always reconciles actual broker state before any live resume.
- Stale/disconnected market data blocks new entries.
- An offline host is detected by an external dead-man's switch.
- Each user's bots, feed, credentials, account data, alerts and AI budget remain isolated.
- No bot is described as Running unless its engine and required connections are demonstrably healthy.

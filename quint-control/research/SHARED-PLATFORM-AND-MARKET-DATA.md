# Shared Quint platform and NinjaTrader market-data research

**Date:** 20 November 2026  
**Status:** architecture research / decision proposal; not an implementation or permission to redistribute market data.

## Goal

Make one private Quint website that the owner and one invited friend can open from their own devices. Share the cost of the web application and common infrastructure once, while keeping each person's AI billing, market-data entitlement, trading accounts, bots, settings, journals and secrets isolated.

The platform should be available 24/7. This means the website, database, monitoring and engine connectivity remain available; it does not mean futures markets produce live ticks while closed. Every market panel must show LIVE, DELAYED, DISCONNECTED or MARKET CLOSED with the last update time. Never display stale prices as live.

## Important findings from the existing repository

- Quint Control is currently designed as a NinjaTrader 8 add-on plus a dashboard served locally on `127.0.0.1:8765`. The browser and engine use the versioned WebSocket contract in `protocol.md`.
- The local engine handles market events, order execution, Guardian checks, bots, copier, journal and fail-safe controls. The website is its screen and control surface.
- The current plan estimates about $30–$40/month for one Windows server, or no additional server cost when using the owner's own Windows PC.
- The Quint Control engine/website foundation (Phase 1) and simulation execution foundation (Phase 2) are marked not started. Strategy Lab Phase 3A is a local-only prototype and is not connected to live data, the engine or backtesting.
- Existing decisions say trading accounts are in the owner's name only. A second website user must not gain access to those accounts or credentials by virtue of being a GitHub contributor.

Do not discard the existing NinjaTrader add-on or its Guardian/order-routing design. Extend it with a secure remote-dashboard connection rather than replacing the trading engine with a browser-only bot.

## Proposed product and tenancy model

### One shared web deployment

Deploy one Quint web application, API/control plane, database service and monitoring stack. Invite the friend as a separate user. GitHub contributor status is code collaboration only; it does not grant a Quint runtime account automatically.

Use server-enforced tenant/user scoping for every read and write. The owner and friend have separate workspaces, account connections, bots, strategy drafts, AI conversations, usage ledgers, journals and secrets. Shared strategy templates/research can be explicitly published to a common library. Never share broker credentials, account numbers, order state or private chat by default.

Suggested roles: Owner (billing, invites, platform settings), Member (their own connections, bots and workspace), and optional Read-only collaborator. Require MFA/passkeys if supported, secure session cookies, CSRF protection, rate limits, audit logs and per-user revoke controls.

### Separate execution engines and accounts

Each user connects their own NinjaTrader 8 installation and their own broker/prop-firm accounts. Each Quint Engine instance remains responsible for that user's account(s), Guardian, risk limits, order routing, kill switches and journal. A friend must never be able to issue commands to the owner's engine or view the owner's account data.

For remote access, each local engine should establish an outbound authenticated TLS WebSocket to the shared Quint service. Do not expose NinjaTrader's local `127.0.0.1` server directly to the public internet and do not ask users to open inbound router ports. Bind each tunnel to one tenant, one engine identity and a short-lived revocable credential. Validate every command again inside the local Guardian; cloud authorization must never bypass local risk controls.

If unattended 24/7 execution is required, each user needs an always-on Windows host for their own NinjaTrader engine, unless NinjaTrader confirms a supported isolated multi-user hosting arrangement. A shared web server is not itself a replacement for the Windows/NinjaTrader runtime. Local PCs can be used while online; a sleeping/offline PC means that user's engine is offline. Remote Desktop is an optional administration method, not the website's data transport.

### Individual AI billing

Keep Claude completely outside the tick-by-tick trading loop. The shared site provides the chat interface and common application code, but each user supplies and pays for their own Claude API key/account. Store keys encrypted server-side (or in a per-user secret store); never expose them to browser JavaScript, logs or GitHub. Enforce per-user usage limits, model routing, token/cost metering and a hard monthly cap. One user's usage must never draw against the other's key or budget.

Claude can interpret natural-language bot descriptions, explain strategy evidence and answer questions. Deterministic strategy code and the Guardian run without Claude. A bot must continue safely if the AI provider is unavailable.

Note: a Claude consumer subscription is not the same as API billing; the app's runtime calls require API access and are billed separately.

## Market data: individual feed per user, not a shared feed

The user's explicit market-data requirement is **individual per user**. Reuse the web infrastructure, not another person's entitlement. Each account connection should use that user's own permitted data access and remain isolated. Do not take one user's NinjaTrader/TradingView stream and rebroadcast it to the friend.

### Preferred first implementation: existing NinjaTrader Desktop adapter

For the current Quint Control project, the lowest-risk first technical proof is to use the existing NinjaTrader 8 add-on's supported market-data events/Bars data already used by the engine. The add-on normalizes quotes/bars and sends only that user's authorized stream through their outbound Quint tunnel. This preserves the current NinjaTrader-first plan and avoids making a new external API integration a prerequisite for Phase 1.

Build a provider-neutral `MarketDataAdapter` boundary so a later NinjaTrader Market Data API adapter can be added without rewriting strategies, chart components or backtests. Every update should carry provider, user/tenant, instrument/contract, exchange timestamp, receive timestamp, sequence, session and data-quality/freshness metadata.

### NinjaTrader's newer WebSocket Market Data API: promising, subject to approval

Official NinjaTrader developer documentation now describes a separate WebSocket Market Data API for real-time quotes, depth of market (DOM), histograms and chart events. Production market-data endpoint documented: `wss://md.tradovateapi.com/v1/websocket`. The documentation describes authentication, quote/DOM/chart subscriptions, asynchronous `md`/`chart` events and unsubscribe operations. It also supports delta updates for quotes and DOM, which can reduce bandwidth. There is one subscription of each type per contract per client connection. See:
- https://docs.ninjatrader.com/
- https://docs.ninjatrader.com/api/websockets
- https://partner.ninjatrader.com/prop/overview/core-concepts/web-sockets/market-data/market-data
- https://partner.ninjatrader.com/prop/resources/reference/environments

Treat this as a separate integration from the existing NinjaScript desktop adapter. Do not assume an ordinary NinjaTrader/Tradovate login or a standard market-data subscription automatically authorizes this API for a custom app. Confirm API access, production credentials, account eligibility, rate/connection limits, supported instruments, historical data access, market replay, and commercial/personal-use terms with NinjaTrader before implementation.

### Critical data-licensing restriction

The September 2026 NinjaTrader API License Agreement is a material blocker to a two-user shared market-data stream unless NinjaTrader approves the exact arrangement in writing. The agreement restricts copying, sublicensing, commercial sharing, transfer or distribution of the API and NinjaTrader Content without prior written consent; it says customers connected to the API may not redistribute market data or derivative works to third parties. It also mentions simultaneous client-connection/IP limits and a 24-hour refresh/delete requirement for cached content. The agreement permits certain content display to customers through an application, but that is not a blanket permission to rebroadcast a personal feed to a friend.

CME's June 2026 subscriber addendum also restricts redistribution outside the subscriber group and states that non-display use of CME licensed information requires a direct CME licence. Automated trading and display can have separate licensing/unit-of-count obligations. Obtain written confirmation from NinjaTrader and, where required, CME/the exchange before any multi-user or automated use.

Sources:
- https://api.tradovate.com/nt-connect-api-license-agreement.pdf
- https://www.cmegroup.com/market-data/files/Subscriber-Addendum-june-2026.pdf
- https://www.cmegroup.com/market-data/files/Schedule-5-to-the-ILA-june-2026.pdf

**Safe design pending written approval:** each user authenticates their own eligible data connection; each feed is tenant-scoped and visible only to that user; no user-to-user feed sharing, common redistribution or shared derived real-time values. If the vendor terms do not permit server-side relay even to the same user's own browser, keep the market-data connection local to that user's NinjaTrader/Quint agent and send only permitted commands/status to the cloud. Do not launch a friend-facing live data feature until the exact path is approved.

## TradingView

TradingView Plus remains useful for personal manual charting, but must not be the automated market-data backbone for Quint. Do not poll its connector on a timer or build around extracting/rebroadcasting a personal subscription. The existing repository's rule remains: no timer polling except the explicitly entitlement-gated background refresh path; cached candle fallbacks must show their age. Quint's own live charts should use a properly licensed direct data adapter.

## Website and data architecture

Proposed logical layout:

```
Owner browser ─┐                         ┌─ Owner's NinjaTrader 8 + Quint Engine
               ├─ Shared Quint web/API ──┤   owner-only outbound secure tunnel
Friend browser ┘   auth + tenant DB      └─ Friend's NinjaTrader 8 + Quint Engine
                    strategy library         friend-only outbound secure tunnel
                    shared monitoring
                    separate AI key vault
```

Shared once: web hosting, authentication, common application/API, database service, static assets, strategy-template library, deployment pipeline, monitoring and backup service.

Per user: NinjaTrader runtime/Windows host if unattended, broker/prop accounts, market-data entitlement and connection, feed state, AI API key and spend cap, bot instances, account/risk configuration, journal, alerts and audit history.

Do not put secrets in GitHub. The repository is currently public; private runtime access controls do not make source code private. Review whether the repository itself should be made private before placing proprietary strategy logic or any sensitive build material in it. Never commit API keys, broker credentials, account identifiers or data dumps.

## Cost model: separate shared and per-user costs

Do not quote a single "two users" figure until market-data permissions and the hosting topology are confirmed.

- **Shared once:** web hosting, database, API/control plane, monitoring, backups and deployment. The prior discussion's £15–£70/month was a preliminary small-platform allowance only, not a validated quote and not inclusive of licensed data or always-on Windows runtimes.
- **Per user:** Claude API usage, market-data entitlement/fees, and an always-on Windows runtime if that user wants unattended NinjaTrader execution.
- **Optional local runtime:** £0 additional server rental while the user's own Windows PC is awake and connected, but it is not an always-on service if the PC sleeps or is switched off.
- The existing PLAN.md's roughly $30–$40/month Windows server estimate applies to its assumed single engine host; do not assume it covers two isolated users/engines. Get a current Windows VPS quote and test NinjaTrader support/licensing before choosing.
- Data licensing, exchange display/non-display fees, API approval, extra connection limits and historical-data charges may dominate the shared hosting bill. Do not promise "cheap live data" until those are confirmed.

## Reliability and data-quality requirements

- Cloud web/API stays up independently of either desktop engine.
- Each engine tunnel reconnects with exponential backoff, heartbeats, authentication renewal and full-state resynchronization after reconnect.
- Show per-user engine status and per-symbol data age. Mark stale after a defined threshold; stop new automated entries on stale/disconnected data.
- Market-closed is different from disconnected. Keep charts showing the last session with an explicit timestamp.
- Do not use browser polling for every tick. Stream normalized updates over WebSockets; batch/coalesce chart rendering (for example 4–10 UI updates/second) while preserving every tick needed by the strategy engine and audit ledger.
- Keep durable journal/events server-side with tenant isolation; never rely on a browser tab being open for execution.
- Add fault tests for dropped sockets, duplicate/out-of-order events, stale timestamps, contract rolls, clock/timezone changes, server restarts and user revocation.
- Trading and risk decisions remain local/deterministic and AI-independent. A cloud outage must not cause unsafe new orders; define whether existing protective orders remain broker-held and how the local Guardian behaves.

## Recommended implementation sequence

1. **Before build:** ask NinjaTrader in writing whether two separately entitled users can each connect their own NinjaTrader data to one privately hosted Quint application via per-user isolated tunnels; clarify whether display, derived values, caching, DOM and automated/non-display use need separate permissions. Ask CME/exchange about any required display/non-display licences. Do not assume permission.
2. **Phase 1 architecture revision:** keep the existing local-only mode working; design shared hosted login/API, tenant model and outbound engine tunnel as a separate optional remote mode. Add threat model and protocol schemas before code.
3. **One-user proof:** use NinjaTrader Desktop's existing feed in simulation; prove stable local engine → outbound tunnel → authenticated website stream, with no public inbound ports and visible stale/disconnected state.
4. **Second-user isolation proof:** connect a second independent demo engine and verify cross-tenant access is impossible for charts, accounts, bots, commands, logs, journals and AI usage.
5. **AI BYOK:** add per-user Claude credentials, encrypted storage, usage metering and spend caps; keep AI out of the execution loop.
6. **Only after written data approval:** test the NinjaTrader Market Data WebSocket API in staging/demo, then production. Compare quote/chart timestamps and data parity against the desktop feed. Keep it as an optional adapter, not a hard dependency.
7. **Release:** test reconnects, market closure, stale feed, user deletion/revocation, credential rotation, load, mobile UI and all Guardian/kill-switch scenarios before exposing live trading.

## Open questions for NinjaTrader (must be answered in writing)

1. Can a private application built for two named individual users connect each user's own NinjaTrader/Tradovate entitlement and display the feed only to that same user?
2. Does the Market Data WebSocket API require partner/vendor approval or a separate API contract for this use?
3. Are per-user connections permitted from a shared cloud IP, and what are the connection/IP limits?
4. May the app relay a user's own live data from their local agent to their authenticated browser over an encrypted tunnel?
5. What separate exchange permissions/fees apply to live chart display, DOM, historical candles, derived indicators and automated/non-display strategy calculations?
6. Can the API be used by a private two-user app that is not offered commercially to the public?
7. What are the restrictions on caching, historical data retention, replay and storing audit evidence?

## Decision summary

**Adopt:** one shared private website and common infrastructure; two individual user accounts; individual Claude API billing; individual NinjaTrader/broker connections and market-data entitlements; separate engine/runtime and trading-account isolation; secure outbound tunnels; provider-neutral market-data adapter; no TradingView automated polling.

**Do not adopt without written permission:** one NinjaTrader subscription/connection feeding both users, shared/rebroadcast live prices or DOM, central non-display use of a retail data entitlement, or treating the new WebSocket API as automatically available under an ordinary desktop subscription.

This is a design proposal to resolve before Phase 1 prompts are run. It does not change trading code, the Guardian, OrderRouter, account ownership or the existing local dashboard fallback.

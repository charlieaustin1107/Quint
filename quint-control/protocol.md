# How the engine and the website talk (protocol version 1)

The Quint Engine runs inside NinjaTrader and serves the dashboard website on your own computer. The two talk over one WebSocket connection. This page is the contract between them: if the engine and the website both follow it, either side can be rebuilt without breaking the other.

The JSON schemas in `protocol/schemas/` are the exact rules, and `protocol/examples/` has a real-looking example of every message. `npm test` checks every example against its schema.

## The connection

1. When you click **New > Quint Control** in NinjaTrader, the engine starts a small web server on `127.0.0.1` (your computer only, never the internet), port **8765** by default, or the next free port.
2. The engine makes a random **session token** (at least 32 characters) every time it starts, and opens your browser at `http://127.0.0.1:8765/#t=<token>`. The token sits after the `#`, so the browser never sends it in a web request and it never appears in a log.
3. The page connects to `ws://127.0.0.1:8765/ws`. The engine refuses the connection unless the browser's `Origin` is `http://127.0.0.1:<port>` or `http://localhost:<port>`.
4. The first message must be **`hello`** with the token, within 5 seconds. A wrong or missing token gets an `error` with code `bad_token` and the connection closes.
5. The engine answers **`welcome`**, then a full **`snapshot`**, then live updates.
6. If the connection drops, the page reconnects with backoff (1 s, 2 s, 4 s … up to 30 s) and gets a fresh `welcome` and `snapshot`. Nothing is replayed, so the page can never miss an update and show a wrong number.

## Every message

Every message is one JSON object with the same outside:

| Field | Engine → website | Website → engine |
|---|---|---|
| `v` | protocol version, always `1` | same |
| `type` | message type (table below) | same |
| `seq` | counts up by 1 for each message on this connection | not used |
| `id` | not used | a unique id the website picks, so replies can point to it |
| `ts` | UTC time, ISO 8601 (`2026-11-18T14:35:02.120Z`) | same |
| `data` | the message itself | same |

Times are always sent in UTC. The website shows them in **UK time and New York time**.

| Type | Direction | When it's sent |
|---|---|---|
| `hello` | website → engine | First message on every connection, carrying the session token |
| `welcome` | engine → website | Reply to a good `hello` |
| `snapshot` | engine → website | After `welcome`, and whenever the engine thinks the page may be out of step: engine mode, kill switches, connections, market, accounts, positions, orders, bots, copier, recent alerts and journal |
| `heartbeat` | engine → website | Once a second |
| `market` | engine → website | Live front-month MNQ last, bid and ask, at most 4 a second |
| `account` | engine → website | An account's balance, P&L, room left, connection or blocks changed |
| `position` | engine → website | A position opened, changed or closed (`Flat`) |
| `order` | engine → website | An order changed state |
| `fill` | engine → website | An order filled, fully or partly |
| `bot` | engine → website | A bot changed state, signalled or its P&L moved |
| `brain` | engine → website | What the engine is thinking, in plain English, for the Brain screen |
| `journal` | engine → website | One journal line (also written to the journal file) |
| `alert` | engine → website | Something you should know about; critical ones also go to your phone |
| `command` | website → engine | Asks the engine to do something |
| `command_result` | engine → website | The answer to one command |
| `error` | engine → website | A message or the connection was wrong |

## Live, Delayed or Disconnected

The website never shows an old number as if it were live:

- **Live**: a heartbeat in the last 3 seconds, and (during market hours) a price tick in the last 5 seconds.
- **Delayed**: no heartbeat for 3 seconds, or the price is older than 5 seconds. Numbers turn grey and show their age.
- **Disconnected**: no heartbeat for 10 seconds. Numbers are hidden behind a banner until the next `snapshot`.

## Commands and the confirm step

Commands that **lower risk run at once**: stopping a bot, kill switches, flattening an account, stopping Manual Copy, acknowledging an alert, running self-tests or a backtest, reading the journal. A kill switch must never wait for a confirm.

Commands that **raise risk need two steps**, so a stray click or a script can't put money at risk:

1. The website sends the command without a token.
2. The engine replies `command_result` with status `needs_confirm`, a one-time `confirm.token` (valid 60 seconds, for that exact command and those exact arguments) and a plain-English `summary` of what will happen.
3. The website shows the summary on a confirm screen. If `confirm.requireTyped` is set (for example Go Live Now on a prop account), you must type that text, usually the account name.
4. The website sends the same command again with `confirmToken` and, if asked, `typedConfirm`.
5. The engine checks the token and runs the command through the guardian as normal. The guardian can still say no (`rejected`, with the reason).

| Command | Risk | Notes |
|---|---|---|
| `bot.start` | raises | A live bot on a prop account also needs the account name typed. Refused if another bot is already on one of its accounts |
| `bot.stop` | lowers | `flatten: true` also closes the bot's positions |
| `bot.goLive` | raises | Always needs the account name typed; works for unapproved bots too (Go Live Now) |
| `bot.setSim` | lowers | Back to simulation only |
| `bot.setAccounts` | raises | Which accounts the bot trades. Refused for an account that already has another bot on |
| `bot.setContracts` | raises | Lowering contracts skips the confirm |
| `copier.setLeader` | raises | The account Manual Copy copies from |
| `copier.setFollower` | raises | Switching a follower off skips the confirm |
| `manualCopy.start` | raises | Refused while any bot is on |
| `manualCopy.stop` | lowers | |
| `kill.all` | lowers | Stops every bot and Manual Copy and cancels working entries; `flatten: true` closes everything |
| `kill.account` | lowers | Same, for one account |
| `kill.reset` | raises | Turns trading back on |
| `account.flatten` | lowers | Closes every position and order on one account |
| `settings.update` | depends | Needs a confirm when it loosens a guardian limit or touches live trading |
| `selftest.run` | lowers | Runs the engine's self-tests and writes `selftest.txt` |
| `backtest.run` | lowers | Runs a bot's backtest over the dates given |
| `alert.ack` | lowers | Marks an alert as seen |
| `journal.query` | lowers | Reads journal lines between two times |

`command_result.status` is `ok`, `needs_confirm`, `rejected` (a rule or the guardian said no; `message` says why in plain English) or `failed` (something went wrong; it's logged).

## Errors

`error.code` is one of `bad_token`, `bad_message` (didn't match the schema), `unknown_type`, `version_mismatch`, `rate_limited` (more than 20 commands a second), `not_ready` (NinjaTrader is still starting) or `internal`. `fatal: true` means the engine is about to close the connection.

## Changing the protocol

- Adding an optional field or a new message type is not a breaking change: keep `v` at `1`. The website ignores message types it doesn't know.
- Renaming or removing a field, or changing what one means, is breaking: bump `v`, and the engine answers an old page with `version_mismatch`.
- The schemas are strict (unknown fields fail), so typos are caught. When you change a message, change its schema and its example in the same commit, and run `npm test`.

## Money, prices and accounts

- Money is US dollars as a plain number. MNQ is $2 a point and a tick is 0.25 points ($0.50).
- Prices are plain numbers; the website formats them (`21,458.25`).
- Account names are exactly what NinjaTrader shows. The examples use made-up names like `LDY50-EXAMPLE-1`: never put a real account number in the repo.
- Secrets (your Claude API key, Telegram token, Healthchecks link) are never sent to the website. The website only learns whether each one is set.

# Strategy Lab domain layer — Phase 3A

This is the first executable Strategy Lab foundation. It is independent of NinjaTrader, the website, broker accounts and Claude.

## Implemented
- Create a versioned MNQ strategy draft with safe paper-only defaults.
- Validate a Strategy Definition and distinguish a saved idea from an executable strategy.
- Validate one-off paper scenarios, including expiry and long/short price orientation.
- Evaluate an allow-listed expression language: boolean composition, comparisons and arithmetic.
- Enforce expression depth/node limits; reject arbitrary operators, property traversal, missing fields and division by zero.

## Tests
Run `cd quint-control && npm test`.

## Definition
A strategy JSON document includes schemaVersion, immutable strategyId + version, instrument, market, entry, exit, risk, execution and provenance. The canonical shape comes from createStrategyDraft() and is checked by validateStrategyDefinition().

Example entry expression:
```json
{"op":"gt","left":{"op":"var","name":"close"},"right":{"op":"var","name":"openingHigh"}}
```

The evaluator receives a flat object of named, typed market fields. It never evaluates JavaScript, C#, user strings or arbitrary object paths.

## Deliberate limitations
This is not yet a working website feature or live paper-trading engine. Natural-language interpretation still needs a server-side Claude adapter and explicit user review. Historical backtest, NinjaTrader Playback, live market-data subscription, virtual order/fill ledger, persistent strategy storage and UI integration are later stages. There is no route from this module to the live OrderRouter.

# engine

The NinjaTrader 8 add-on: thin adapters between NinjaTrader and `core/`, the single `OrderRouter` (the only code that calls Account.Submit, Cancel or Flatten), the local HTTP and WebSocket server on 127.0.0.1, the journal writer and the self-test runner (Settings > Run self-tests, report in `Documents\NinjaTrader 8\quint\selftest.txt`).

`engine/indicators/` will hold the Quint Trades chart indicator (phase 4b). Starts in phase 1.

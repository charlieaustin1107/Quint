# reference

A JavaScript copy of all the trading logic, tested with `node --test` on the real MNQ candles in `backtest/data/`. It's the master version: the C# in `core/` is ported from it, and it writes the golden files in `tests/golden/`.

- `lib/`: the logic (`schema.js` is the protocol checker)
- `test/`: its tests

# golden files

Each file is one case: the inputs (account state, candles, settings, the order asked for) and the exact decision expected (allowed or blocked, with the reason, size, stop and target). `reference/` writes them; the engine's self-test runner replays them in C# inside NinjaTrader. Never edit one by hand: change the reference logic, regenerate, and review the diff. First files arrive in phase 2.

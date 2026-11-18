# core

The trading logic in plain C#, with **no NinjaTrader types**, so it can be checked against the golden files: the guardian (`Guardian.Check`), sizing, the copier's plan, the position reconciler, the news window, bot signals and backtest maths.

Rules: .NET Framework 4.8 and C# 7.3 only, no NuGet packages. Every piece here is a line-for-line port of the JavaScript in `reference/`. Starts in phase 2.

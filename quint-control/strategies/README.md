# strategies

One C# file per bot in the QuintStrategy plug-in format. The engine finds them automatically. `_Template.cs` (phase 3) is the starting point for a new bot and is never installed.

`strategies/wrappers/` holds the NinjaScript Strategy wrappers that let each bot run in NinjaTrader's Strategy Analyzer.

Every bot must return its own stop and target with each signal: a signal without a stop is rejected.

#region Using declarations
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using NinjaTrader.Cbi;
using NinjaTrader.Data;
using NinjaTrader.NinjaScript;
#endregion

// QUINT BOT LAB: twelve MNQ test bots in one NinjaScript strategy, with the same rules as quint-control/botlab/botlab.js.
// Pick the bot with the "Bot" setting, or optimise Bot from 1 to 12 in Strategy Analyzer to run them all at once.
// For Strategy Analyzer, Playback and Sim accounts only: on any other account it prints a message and never trades.
// Real accounts get these bots through the Quint Engine, where the guardian applies Lucid's rules.
//
// Shared rules for every bot:
//   - 1-minute MNQ bars. Only 9:30 to 16:00 New York counts, worked out from each bar's own time, so any Trading hours
//     template works and NinjaTrader's time zone setting doesn't matter. Each bot builds its own 1, 5, 15 or 30-minute candles.
//   - Every entry goes in with a stop and a target (bots without a target get a far one, so in practice they're out at
//     15:59). Orders fill at the next bar's open. 1 tick of slippage on market and stop orders.
//   - No new entries once the day's closed trades have lost the daily loss limit ($500 by default).
//   - Flat by 15:59 New York. The results printed at the end use Lucid's $0.50 commission a side.
// Nothing here is financial advice.

namespace NinjaTrader.NinjaScript.Strategies
{
	public class QuintBotLab : Strategy
	{
		private const int Last = 390;		// 16:00 New York, in minutes after 9:30

		private LabBot bot;
		private DayInfo day;
		private Candle cur;
		private TimeZoneInfo platformZone, newYork;
		private DateTime today = DateTime.MinValue;
		private bool dayOk, ranBars, blocked, accountChecked, prevFull;
		private double pv, pv2, vol, dayPnl, lastClose, prevClose, prevHigh, prevLow, worstOpenLoss;
		private int lastMinute, tradesToday, tradesSeen, carried;

		protected override void OnStateChange()
		{
			if (State == State.SetDefaults)
			{
				Name								= "QuintBotLab";
				Description							= "Quint bot lab, 12 MNQ test bots (1-minute bars): 1 NY open breakout, 2 opening candle, 3 20-candle breakout, 4 last 30 minutes, 5 VWAP trend, 6 gap fade, 7 inverted fair value gap, 8 range squeeze breakout, 9 trend-join scalper, 10 VWAP band fade, 11 failed breakout, 12 noise-area momentum. Sim and backtest only.";
				Calculate							= Calculate.OnBarClose;
				EntriesPerDirection					= 1;
				EntryHandling						= EntryHandling.AllEntries;
				IsExitOnSessionCloseStrategy		= true;		// a backup for half days; the lab itself goes flat at 15:59 New York
				ExitOnSessionCloseSeconds			= 30;
				IsFillLimitOnTouch					= false;
				MaximumBarsLookBack					= MaximumBarsLookBack.TwoHundredFiftySix;
				OrderFillResolution					= OrderFillResolution.Standard;
				Slippage							= 1;		// ticks, used in backtests
				StartBehavior						= StartBehavior.WaitUntilFlat;
				TimeInForce							= TimeInForce.Gtc;
				TraceOrders							= false;
				RealtimeErrorHandling				= RealtimeErrorHandling.StopCancelClose;
				StopTargetHandling					= StopTargetHandling.PerEntryExecution;
				BarsRequiredToTrade					= 1;
				IsInstantiatedOnEachOptimizationIteration = true;

				Bot					= 1;
				LabContracts		= 1;
				DailyLossLimit		= 500;
				CommissionPerSide	= 0.50;
			}
			else if (State == State.DataLoaded)
			{
				bot = MakeBot(Bot);
				day = null;
				cur = null;
				today = DateTime.MinValue;
				dayOk = ranBars = blocked = accountChecked = prevFull = false;
				pv = pv2 = vol = dayPnl = lastClose = prevClose = prevHigh = prevLow = worstOpenLoss = 0;
				lastMinute = tradesToday = tradesSeen = carried = 0;
				if (BarsPeriod.BarsPeriodType != BarsPeriodType.Minute || BarsPeriod.Value != 1)
				{
					blocked = true;
					Print("QuintBotLab: use 1-minute bars (Type Minute, Value 1). Nothing will trade on " + BarsPeriod.ToString() + ".");
				}
				try
				{
					platformZone = NinjaTrader.Core.Globals.GeneralOptions.TimeZoneInfo;	// Tools > Options > General > Time zone
					newYork = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
				}
				catch (Exception e)
				{
					newYork = null;
					Print("QuintBotLab: couldn't find the New York time zone, so nothing will trade (" + e.Message + ")");
				}
			}
			else if (State == State.Terminated)
			{
				if (ranBars && SystemPerformance != null && bot != null)
					PrintSummary();
			}
		}

		protected override void OnBarUpdate()
		{
			if (BarsInProgress != 0 || bot == null || newYork == null || platformZone == null)
				return;
			if (!accountChecked && Account != null)
			{
				accountChecked = true;
				string acct = Account.Name ?? "";
				if (!(acct.StartsWith("Sim", StringComparison.OrdinalIgnoreCase) || acct.StartsWith("Backtest", StringComparison.OrdinalIgnoreCase) || acct.StartsWith("Playback", StringComparison.OrdinalIgnoreCase)))
				{
					blocked = true;
					Print("QuintBotLab: " + acct + " isn't a simulation account, so the lab won't trade. Use Sim101, Playback101 or Strategy Analyzer.");
				}
			}
			if (blocked)
				return;
			ranBars = true;

			// the worst open loss of any trade (Lucid's funded drawdown counts open losses)
			if (Position.MarketPosition != MarketPosition.Flat)
			{
				double against = Position.MarketPosition == MarketPosition.Long ? Low[0] - Position.AveragePrice : Position.AveragePrice - High[0];
				worstOpenLoss = Math.Min(worstOpenLoss, against * Instrument.MasterInstrument.PointValue * Position.Quantity);
			}
			// closed trades count towards today's loss limit
			int all = SystemPerformance.AllTrades.Count;
			for (int i = tradesSeen; i < all; i++)
				dayPnl += Usd(SystemPerformance.AllTrades[i], Instrument.MasterInstrument.PointValue);
			tradesSeen = all;

			DateTime ny;
			try { ny = TimeZoneInfo.ConvertTime(DateTime.SpecifyKind(Time[0], DateTimeKind.Unspecified), platformZone, newYork); }
			catch (ArgumentException) { return; }	// a clock-change hour that doesn't exist; never inside New York trading hours

			// minutes after 9:30 New York at this bar's close: 1 for the 9:31 bar, 30 for 10:00, 390 for 16:00
			int m = (int)Math.Round((ny.TimeOfDay - new TimeSpan(9, 30, 0)).TotalMinutes);
			if (m < 1 || m > Last)
				return;
			if (ny.Date != today)
				NewDay(ny.Date, m);
			if (!dayOk)
				return;		// this day's data started after 9:30, so it isn't used

			day.High = Math.Max(day.High, High[0]);
			day.Low = Math.Min(day.Low, Low[0]);
			double p = (High[0] + Low[0] + Close[0]) / 3.0;
			pv += p * Volume[0];
			pv2 += p * p * Volume[0];
			vol += Volume[0];
			day.Vwap = vol > 0 ? pv / vol : Close[0];
			day.Vsd = vol > 0 ? Math.Sqrt(Math.Max(0, pv2 / vol - day.Vwap * day.Vwap)) : 0;
			lastClose = Close[0];
			lastMinute = m;

			// the bot's own candle
			if (cur == null)
				cur = new Candle { O = Open[0], H = High[0], L = Low[0], C = Close[0], V = 0 };
			cur.H = Math.Max(cur.H, High[0]);
			cur.L = Math.Min(cur.L, Low[0]);
			cur.C = Close[0];
			cur.V += Volume[0];

			int pos = Position.MarketPosition == MarketPosition.Long ? 1 : Position.MarketPosition == MarketPosition.Short ? -1 : 0;
			if (m % bot.Tf == 0)
			{
				cur.M = m;
				Signal sig = bot.OnBar(day, cur, pos);
				cur = null;
				if (sig != null && m < Last - 1)
					Act(sig, pos);
			}
			if (m >= Last - 1 && pos != 0)
				GoFlat("Close", pos);		// 15:59 New York
		}

		private void NewDay(DateTime nyDate, int firstMinute)
		{
			if (day != null && dayOk)
			{
				prevClose = lastClose;
				prevHigh = day.High;
				prevLow = day.Low;
				prevFull = lastMinute >= 360;		// half days close at 13:00
			}
			if (Position.MarketPosition != MarketPosition.Flat)
			{
				carried++;		// safety net: a position should never reach a new day
				GoFlat("Carried", Position.MarketPosition == MarketPosition.Long ? 1 : -1);
			}
			today = nyDate;
			dayOk = firstMinute == 1;
			day = new DayInfo { Tick = TickSize, Open = Open[0], High = double.MinValue, Low = double.MaxValue, PrevClose = prevClose, PrevHigh = prevHigh, PrevLow = prevLow, PrevFull = prevFull };
			pv = pv2 = vol = 0;
			dayPnl = 0;
			tradesToday = 0;
			lastMinute = 0;
			cur = null;
			if (dayOk)
				bot.OnDay(day);
		}

		private void Act(Signal sig, int pos)
		{
			if (sig.Exit != null)
			{
				if (pos != 0) GoFlat(sig.Exit, pos);
				return;
			}
			if (sig.Dir == 0 || sig.Dir == pos)
				return;
			bool stopOk = sig.Dir > 0 ? sig.Stop < Close[0] : sig.Stop > Close[0];
			bool ok = tradesToday < bot.MaxTrades && dayPnl > -Math.Min(DailyLossLimit, bot.DayLoss) && stopOk;
			if (!ok)
			{
				if (pos != 0) GoFlat("Blocked", pos);		// a flip that isn't allowed still gets out
				return;
			}
			double target = double.IsNaN(sig.Target) ? Close[0] * (1 + 0.05 * sig.Dir) : sig.Target;
			string name = sig.Dir > 0 ? "Long" : "Short";
			SetStopLoss(name, CalculationMode.Price, Instrument.MasterInstrument.RoundToTickSize(sig.Stop), false);
			SetProfitTarget(name, CalculationMode.Price, Instrument.MasterInstrument.RoundToTickSize(target));
			if (sig.Dir > 0) EnterLong(LabContracts, name);
			else EnterShort(LabContracts, name);
			tradesToday++;
		}

		private void GoFlat(string why, int pos)
		{
			if (pos > 0) ExitLong(why, "Long");
			else ExitShort(why, "Short");
		}

		private static double Ema(double prev, double x, int n)
		{
			return double.IsNaN(prev) ? x : prev + 2.0 / (n + 1) * (x - prev);
		}

		private static LabBot MakeBot(int n)
		{
			switch (n)
			{
				case 1: return new OpenBreakout();
				case 2: return new OpeningCandle();
				case 3: return new TwentyCandle();
				case 4: return new LastHalfHour();
				case 5: return new VwapTrend();
				case 6: return new GapFade();
				case 7: return new InvertedGap();
				case 8: return new SqueezeBreakout();
				case 9: return new TrendJoin();
				case 10: return new BandFade();
				case 11: return new FailedBreakout();
				case 12: return new NoiseArea();
				default: return null;
			}
		}

		// ---------- what the bots see ----------

		private class Candle { public double O, H, L, C, V; public int M; }

		private class DayInfo
		{
			public double Tick, Open, High, Low, Vwap, Vsd, PrevClose, PrevHigh, PrevLow;
			public bool PrevFull;
		}

		private class Signal
		{
			public int Dir;
			public double Stop, Target;
			public string Exit;
			public static Signal Enter(int dir, double stop, double target) { return new Signal { Dir = dir, Stop = stop, Target = target }; }
			public static Signal Out(string why) { return new Signal { Exit = why }; }
		}

		private abstract class LabBot
		{
			public string Name;
			public int Tf = 5;
			public int MaxTrades = 1;
			public double DayLoss = double.MaxValue;
			public virtual void OnDay(DayInfo d) { }
			public abstract Signal OnBar(DayInfo d, Candle b, int pos);		// pos: 1 long, -1 short, 0 flat
		}

		// ---------- the twelve bots (the same order and rules as botlab.js) ----------

		// 1. New York open breakout (Chart Wizard): the 9:30-9:45 range, a 5-minute close outside it until 11:30, stop on the
		// other side of the range, target 2R, one trade a day.
		private class OpenBreakout : LabBot
		{
			private double hi, lo;
			public OpenBreakout() { Name = "New York open breakout"; Tf = 5; MaxTrades = 1; }
			public override void OnDay(DayInfo d) { hi = double.MinValue; lo = double.MaxValue; }
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				if (b.M <= 15) { hi = Math.Max(hi, b.H); lo = Math.Min(lo, b.L); return null; }
				if (pos != 0 || b.M > 120) return null;
				if (b.C > hi) return Signal.Enter(1, lo, b.C + 2 * (b.C - lo));
				if (b.C < lo) return Signal.Enter(-1, hi, b.C - 2 * (hi - b.C));
				return null;
			}
		}

		// 2. Opening candle (5-minute opening range breakout, Zarattini, Barbon & Aziz): the direction of the 9:30-9:35
		// candle, stop at its other end, target 10R, otherwise out at the close.
		private class OpeningCandle : LabBot
		{
			public OpeningCandle() { Name = "Opening candle direction"; Tf = 5; MaxTrades = 1; }
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				if (b.M != 5 || pos != 0) return null;
				if (b.C > b.O && b.C - b.L >= 1) return Signal.Enter(1, b.L, b.C + 10 * (b.C - b.L));
				if (b.C < b.O && b.H - b.C >= 1) return Signal.Enter(-1, b.H, b.C - 10 * (b.H - b.C));
				return null;
			}
		}

		// 3. 20-candle breakout (Chart Wizard): a 15-minute close beyond the last 20 candles, stop 2 ATR(14), target 3x the stop.
		private class TwentyCandle : LabBot
		{
			private readonly List<double> hs = new List<double>(), ls = new List<double>();
			private double atr = double.NaN, prevC = double.NaN;
			private int n;
			public TwentyCandle() { Name = "20-candle breakout"; Tf = 15; MaxTrades = 2; }
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				double tr = double.IsNaN(prevC) ? b.H - b.L : Math.Max(b.H - b.L, Math.Max(Math.Abs(b.H - prevC), Math.Abs(b.L - prevC)));
				n++;
				atr = double.IsNaN(atr) ? tr : atr + (tr - atr) / Math.Min(n, 14);
				prevC = b.C;
				Signal sig = null;
				if (hs.Count == 20 && pos == 0 && b.M >= 30 && b.M <= 330)
				{
					double hh = hs.Max(), ll = ls.Min();
					if (b.C > hh) sig = Signal.Enter(1, b.C - 2 * atr, b.C + 6 * atr);
					else if (b.C < ll) sig = Signal.Enter(-1, b.C + 2 * atr, b.C - 6 * atr);
				}
				hs.Add(b.H);
				ls.Add(b.L);
				if (hs.Count > 20) { hs.RemoveAt(0); ls.RemoveAt(0); }
				return sig;
			}
		}

		// 4. Last-30-minute momentum: at 15:30, go with the move since yesterday's close, out at the close, 0.5% emergency stop.
		private class LastHalfHour : LabBot
		{
			public LastHalfHour() { Name = "Last-30-minute momentum"; Tf = 5; MaxTrades = 1; }
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				if (b.M != 360 || pos != 0 || d.PrevClose <= 0 || b.C == d.PrevClose) return null;
				int dir = b.C > d.PrevClose ? 1 : -1;
				return Signal.Enter(dir, b.C * (1 - dir * 0.005), double.NaN);
			}
		}

		// 5. VWAP trend (Zarattini & Aziz): long above VWAP, short below, flip on each 1-minute cross, 0.5% emergency stop.
		private class VwapTrend : LabBot
		{
			public VwapTrend() { Name = "VWAP trend"; Tf = 1; MaxTrades = 40; }
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				int dir = b.C > d.Vwap ? 1 : b.C < d.Vwap ? -1 : 0;
				if (dir == 0 || dir == pos) return null;
				return Signal.Enter(dir, b.C * (1 - dir * 0.005), double.NaN);
			}
		}

		// 6. Gap fade (the plan's fixed rules): a 0.2%-1.0% gap, the first 5-minute candle turns back, stop beyond the day's
		// extreme, target yesterday's close (skipped if less than 1x the stop away), out at 11:30.
		private class GapFade : LabBot
		{
			public GapFade() { Name = "Gap fade"; Tf = 5; MaxTrades = 1; }
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				if (pos != 0) return b.M >= 120 ? Signal.Out("Time") : null;
				if (b.M != 5 || d.PrevClose <= 0) return null;
				double gap = (d.Open - d.PrevClose) / d.PrevClose;
				if (Math.Abs(gap) < 0.002 || Math.Abs(gap) > 0.01) return null;
				if (gap > 0 && b.C < b.O)
				{
					double stop = d.High + d.Tick, target = d.PrevClose;
					return b.C - target >= stop - b.C ? Signal.Enter(-1, stop, target) : null;
				}
				if (gap < 0 && b.C > b.O)
				{
					double stop = d.Low - d.Tick, target = d.PrevClose;
					return target - b.C >= b.C - stop ? Signal.Enter(1, stop, target) : null;
				}
				return null;
			}
		}

		// 7. Inverted fair value gap (from Daxton Trades' video; the EMA lengths and the stop are our choices): trend from the
		// 5-minute EMA 50 and 200; the first gap against the trend that a 5-minute close goes through, until 11:30; stop
		// beyond the swing since the gap; target 2R; one trade a day.
		private class InvertedGap : LabBot
		{
			private class Zone { public double Edge, Extreme; public bool Dead; }
			private double e50 = double.NaN, e200 = double.NaN;
			private int n;
			private readonly List<Candle> last = new List<Candle>();
			private readonly List<Zone> bear = new List<Zone>(), bull = new List<Zone>();
			public InvertedGap() { Name = "Inverted fair value gap"; Tf = 5; MaxTrades = 1; }
			public override void OnDay(DayInfo d) { last.Clear(); bear.Clear(); bull.Clear(); }
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				e50 = Ema(e50, b.C, 50);
				e200 = Ema(e200, b.C, 200);
				n++;
				foreach (Zone z in bear) z.Extreme = Math.Min(z.Extreme, b.L);
				foreach (Zone z in bull) z.Extreme = Math.Max(z.Extreme, b.H);
				bool up = n >= 200 && b.C > e200 && e50 > e200, down = n >= 200 && b.C < e200 && e50 < e200;
				Signal sig = null;
				foreach (Zone z in bear)
				{
					if (z.Dead || b.C <= z.Edge) continue;
					z.Dead = true;
					if (sig == null && up && pos == 0 && b.M <= 120) { double stop = z.Extreme - d.Tick; sig = Signal.Enter(1, stop, b.C + 2 * (b.C - stop)); }
				}
				foreach (Zone z in bull)
				{
					if (z.Dead || b.C >= z.Edge) continue;
					z.Dead = true;
					if (sig == null && down && pos == 0 && b.M <= 120) { double stop = z.Extreme + d.Tick; sig = Signal.Enter(-1, stop, b.C - 2 * (stop - b.C)); }
				}
				last.Add(b);
				if (last.Count > 3) last.RemoveAt(0);
				if (last.Count == 3)
				{
					Candle a = last[0], c = last[2];
					if (c.H < a.L) bear.Add(new Zone { Edge = a.L, Extreme = c.L });
					if (c.L > a.H) bull.Add(new Zone { Edge = a.H, Extreme = c.H });
				}
				return sig;
			}
		}

		// 8. Range squeeze breakout (from the NinjaTrader range-breakout bot video; the numbers are our choices): a 20-minute
		// range narrower than 0.15% and than 90% of yesterday's, then a 1-minute close outside it; stop on the other side;
		// target 2R; up to 3 trades a day, 9:45 to 15:00.
		private class SqueezeBreakout : LabBot
		{
			private readonly List<Candle> win = new List<Candle>();
			private List<double> widths = new List<double>();
			private double limit = double.NaN, armedH, armedL;
			private bool armed;
			public SqueezeBreakout() { Name = "Range squeeze breakout"; Tf = 1; MaxTrades = 3; }
			public override void OnDay(DayInfo d)
			{
				if (widths.Count >= 100)
				{
					List<double> s = new List<double>(widths);
					s.Sort();
					limit = s[(int)Math.Floor(s.Count * 0.1)];
				}
				win.Clear();
				widths = new List<double>();
				armed = false;
			}
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				Signal sig = null;
				if (armed && pos == 0 && b.M >= 15 && b.M <= 330)
				{
					if (b.C > armedH) { double stop = armedL - d.Tick; sig = Signal.Enter(1, stop, b.C + 2 * (b.C - stop)); }
					else if (b.C < armedL) { double stop = armedH + d.Tick; sig = Signal.Enter(-1, stop, b.C - 2 * (stop - b.C)); }
				}
				win.Add(b);
				if (win.Count > 20) win.RemoveAt(0);
				armed = false;
				if (win.Count == 20)
				{
					double h = double.MinValue, l = double.MaxValue;
					foreach (Candle x in win) { h = Math.Max(h, x.H); l = Math.Min(l, x.L); }
					double w = (h - l) / b.C;
					widths.Add(w);
					if (!double.IsNaN(limit) && w <= limit && w <= 0.0015) { armed = true; armedH = h; armedL = l; }
				}
				return sig;
			}
		}

		// 9. Trend-join scalper (shaped like the Strat v60 dashboard: small target, wider stop; the rules are ours): EMA 9 > 21
		// > 50 on 1-minute candles with the 21 rising, a candle that dips to the 21 and closes up; target 7 points, stop 24;
		// up to 10 trades a day, 10:00 to 15:30; stops for the day after losing $300.
		private class TrendJoin : LabBot
		{
			private double e9 = double.NaN, e21 = double.NaN, e50 = double.NaN;
			private int n;
			private readonly List<double> hist = new List<double>();
			public TrendJoin() { Name = "Trend-join scalper"; Tf = 1; MaxTrades = 10; DayLoss = 300; }
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				e9 = Ema(e9, b.C, 9);
				e21 = Ema(e21, b.C, 21);
				e50 = Ema(e50, b.C, 50);
				n++;
				hist.Add(e21);
				if (hist.Count > 6) hist.RemoveAt(0);
				if (n < 50 || pos != 0 || b.M < 30 || b.M > 360 || hist.Count < 6) return null;
				if (e9 > e21 && e21 > e50 && e21 > hist[0] && b.L <= e21 && b.C > e21 && b.C > b.O) return Signal.Enter(1, b.C - 24, b.C + 7);
				if (e9 < e21 && e21 < e50 && e21 < hist[0] && b.H >= e21 && b.C < e21 && b.C < b.O) return Signal.Enter(-1, b.C + 24, b.C - 7);
				return null;
			}
		}

		// 10. VWAP band fade (a "fade", one of Phantom's entry styles; the rules are ours): a 5-minute close outside VWAP
		// +/-2 standard deviations, then a close back inside; stop beyond the last 3 candles; target VWAP, skipped unless it's
		// at least 1x the stop away; up to 2 trades a day, 10:00 to 15:00.
		private class BandFade : LabBot
		{
			private readonly List<Candle> last = new List<Candle>();
			private bool wasAbove, wasBelow;
			public BandFade() { Name = "VWAP band fade"; Tf = 5; MaxTrades = 2; }
			public override void OnDay(DayInfo d) { last.Clear(); wasAbove = false; wasBelow = false; }
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				last.Add(b);
				if (last.Count > 3) last.RemoveAt(0);
				double up = d.Vwap + 2 * d.Vsd, dn = d.Vwap - 2 * d.Vsd;
				Signal sig = null;
				if (pos == 0 && d.Vsd > 0 && b.M >= 30 && b.M <= 330)
				{
					if (wasAbove && b.C < up)
					{
						double stop = last.Max(x => x.H) + d.Tick, target = d.Vwap;
						if (b.C - target >= stop - b.C) sig = Signal.Enter(-1, stop, target);
					}
					else if (wasBelow && b.C > dn)
					{
						double stop = last.Min(x => x.L) - d.Tick, target = d.Vwap;
						if (target - b.C >= b.C - stop) sig = Signal.Enter(1, stop, target);
					}
				}
				wasAbove = d.Vsd > 0 && b.C > up;
				wasBelow = d.Vsd > 0 && b.C < dn;
				return sig;
			}
		}

		// 11. Failed breakout of yesterday's high or low (a "failed breakout", one of Phantom's entry styles; the rules are
		// ours): a 5-minute candle trades through the level and closes back inside; stop beyond that candle; target 2R;
		// each level once a day, 9:45 to 15:00.
		private class FailedBreakout : LabBot
		{
			private bool usedHi, usedLo;
			public FailedBreakout() { Name = "Failed breakout"; Tf = 5; MaxTrades = 2; }
			public override void OnDay(DayInfo d) { usedHi = false; usedLo = false; }
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				if (pos != 0 || d.PrevHigh <= 0 || b.M < 15 || b.M > 330) return null;
				if (!usedHi && b.H > d.PrevHigh && b.C < d.PrevHigh) { usedHi = true; double stop = b.H + d.Tick; return Signal.Enter(-1, stop, b.C - 2 * (stop - b.C)); }
				if (!usedLo && b.L < d.PrevLow && b.C > d.PrevLow) { usedLo = true; double stop = b.L - d.Tick; return Signal.Enter(1, stop, b.C + 2 * (b.C - stop)); }
				return null;
			}
		}

		// 12. Noise-area momentum (Zarattini, Aziz & Barbon), as in proof/: checks each half hour from 10:00, flips on the
		// opposite boundary, trailing stop at the boundary or VWAP, 1% emergency stop.
		private class NoiseArea : LabBot
		{
			private readonly List<Dictionary<int, double>> past = new List<Dictionary<int, double>>();
			private Dictionary<int, double> moves;
			public NoiseArea() { Name = "Noise-area momentum"; Tf = 30; MaxTrades = 14; }
			public override void OnDay(DayInfo d)
			{
				if (moves != null && d.PrevFull) { past.Add(moves); if (past.Count > 14) past.RemoveAt(0); }
				moves = new Dictionary<int, double>();
			}
			public override Signal OnBar(DayInfo d, Candle b, int pos)
			{
				moves[b.M] = Math.Abs(b.C / d.Open - 1);
				if (b.M >= Last || d.PrevClose <= 0 || past.Count < 14) return null;
				double sum = 0;
				int seen = 0;
				foreach (Dictionary<int, double> p in past)
				{
					double v;
					if (p.TryGetValue(b.M, out v)) { sum += v; seen++; }
				}
				if (seen < 7) return null;
				double s = sum / seen;
				double upper = Math.Max(d.Open, d.PrevClose) * (1 + s), lower = Math.Min(d.Open, d.PrevClose) * (1 - s);
				int want = b.C > upper ? 1 : b.C < lower ? -1 : 0;
				if (pos == 0) return want != 0 ? Signal.Enter(want, b.C * (1 - want * 0.01), double.NaN) : null;
				if (want == -pos) return Signal.Enter(want, b.C * (1 - want * 0.01), double.NaN);
				if (pos > 0 ? b.C < Math.Max(upper, d.Vwap) : b.C > Math.Min(lower, d.Vwap)) return Signal.Out("Rule");
				return null;
			}
		}

		// ---------- results ----------

		private void PrintSummary()
		{
			// Recomputed from the fill prices (which include the slippage), with Lucid's commission, so the numbers don't depend on
			// NinjaTrader's commission settings. Printed as one block, because Strategy Analyzer runs optimisations in parallel.
			double pointValue = Instrument.MasterInstrument.PointValue;
			List<Trade> trades = new List<Trade>();
			foreach (Trade t in SystemPerformance.AllTrades) trades.Add(t);
			List<string> lines = new List<string>();
			lines.Add("-------- QUINT BOT LAB RESULTS --------");
			lines.Add(string.Format("Bot {0}: {1} ({2}-minute candles), {3}, {4} to {5}, {6} contract(s), commission ${7:0.00} a side, daily loss limit ${8:N0}",
				Bot, bot.Name, bot.Tf, Instrument.FullName, Bars.Count > 0 ? Bars.GetTime(0).ToString("yyyy-MM-dd") : "?",
				Bars.Count > 0 ? Bars.GetTime(Bars.Count - 1).ToString("yyyy-MM-dd") : "?", LabContracts, CommissionPerSide, DailyLossLimit));
			Block(lines, "All", trades, pointValue, true);
			int half = trades.Count / 2;
			Block(lines, "First half", trades.Take(half).ToList(), pointValue, false);
			Block(lines, "Second half", trades.Skip(half).ToList(), pointValue, false);
			Dictionary<int, double> byYear = new Dictionary<int, double>();
			Dictionary<int, int> countByYear = new Dictionary<int, int>();
			Dictionary<string, int> exits = new Dictionary<string, int>();
			foreach (Trade t in trades)
			{
				int y = t.Exit.Time.Year;
				byYear[y] = (byYear.ContainsKey(y) ? byYear[y] : 0) + Usd(t, pointValue);
				countByYear[y] = (countByYear.ContainsKey(y) ? countByYear[y] : 0) + 1;
				string why = t.Exit.Name ?? "?";
				exits[why] = (exits.ContainsKey(why) ? exits[why] : 0) + 1;
			}
			foreach (int y in byYear.Keys.OrderBy(k => k))
				lines.Add(string.Format("{0}: {1} trades, net ${2:N0}", y, countByYear[y], byYear[y]));
			lines.Add("Exits: " + string.Join(", ", exits.Select(e => e.Key + " " + e.Value)) + (carried > 0 ? "  (WARNING: " + carried + " position(s) reached a new day)" : ""));
			lines.Add(string.Format("Worst open loss inside one trade: ${0:N0} (Lucid 50K max loss: $2,000)", worstOpenLoss));
			lines.Add("----------------------------------------");
			Print(string.Join(Environment.NewLine, lines));
		}

		private double Usd(Trade t, double pointValue)
		{
			int dir = t.Entry.MarketPosition == MarketPosition.Long ? 1 : -1;
			return (t.Exit.Price - t.Entry.Price) * dir * pointValue * t.Quantity - 2 * CommissionPerSide * t.Quantity;
		}

		private void Block(List<string> lines, string label, List<Trade> trades, double pointValue, bool full)
		{
			double net = 0, peak = 0, maxDrawdown = 0, grossWin = 0, grossLoss = 0, longNet = 0, shortNet = 0;
			int wins = 0;
			Dictionary<DateTime, double> byDay = new Dictionary<DateTime, double>();
			foreach (Trade t in trades)
			{
				double usd = Usd(t, pointValue);
				net += usd;
				peak = Math.Max(peak, net);
				maxDrawdown = Math.Max(maxDrawdown, peak - net);
				if (usd > 0) { wins++; grossWin += usd; } else grossLoss -= usd;
				if (t.Entry.MarketPosition == MarketPosition.Long) longNet += usd; else shortNet += usd;
				DateTime when = t.Exit.Time.Date;
				byDay[when] = (byDay.ContainsKey(when) ? byDay[when] : 0) + usd;
			}
			lines.Add(string.Format("{0}: {1} trades, wins {2:0}%, profit factor {3}, net ${4:N0}, worst drawdown ${5:N0}, worst day ${6:N0}",
				label, trades.Count, trades.Count > 0 ? 100.0 * wins / trades.Count : 0, grossLoss > 0 ? (grossWin / grossLoss).ToString("0.00") : "n/a",
				net, maxDrawdown, byDay.Count > 0 ? byDay.Values.Min() : 0));
			if (full)
				lines.Add(string.Format("Longs ${0:N0}, shorts ${1:N0}, days traded {2}, days losing $1,200 or more: {3}",
					longNet, shortNet, byDay.Count, byDay.Values.Count(v => v <= -1200)));
		}

		#region Properties
		[NinjaScriptProperty]
		[Range(1, 12)]
		[Display(Name = "Bot (1-12)", Description = "1 NY open breakout, 2 opening candle, 3 20-candle breakout, 4 last 30 minutes, 5 VWAP trend, 6 gap fade, 7 inverted fair value gap, 8 range squeeze, 9 trend-join scalper, 10 VWAP band fade, 11 failed breakout, 12 noise-area momentum", Order = 1, GroupName = "1. Bot")]
		public int Bot { get; set; }

		[NinjaScriptProperty]
		[Range(1, 10)]
		[Display(Name = "Contracts", Order = 2, GroupName = "1. Bot")]
		public int LabContracts { get; set; }

		[NinjaScriptProperty]
		[Range(50.0, 5000.0)]
		[Display(Name = "Daily loss limit $ (no new entries after this)", Order = 3, GroupName = "1. Bot")]
		public double DailyLossLimit { get; set; }

		[NinjaScriptProperty]
		[Range(0.0, 10.0)]
		[Display(Name = "Commission a side $ (Lucid MNQ: 0.50)", Order = 4, GroupName = "1. Bot")]
		public double CommissionPerSide { get; set; }
		#endregion
	}
}

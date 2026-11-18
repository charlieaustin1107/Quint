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

// QUINT PROOF: the noise-area intraday momentum strategy on MNQ.
// From Zarattini, Aziz & Barbon, "Beat the Market: An Effective Intraday Momentum Strategy for S&P500 ETF (SPY)", SSRN 4824172.
// Made for the one-week proof in quint-control/proof/README.md: backtest it in Strategy Analyzer before paying for the full build.
// It's for testing. Run it on the Backtest or Sim101 accounts only.
//
// The paper's rules, kept as they are:
//   - Noise area: for each time of day, the average over the last 14 days of |price at that time / that day's 9:30 open - 1|.
//   - Upper edge = max(today's open, yesterday's 16:00 close) x (1 + that average). Lower edge = min(open, yesterday's close) x (1 - average).
//   - Checks only at HH:00 and HH:30 New York time, from 10:00. Buy when price is above the upper edge, sell short when it's below the lower edge.
//   - Trailing stop, also checked only at HH:00 and HH:30: longs exit under the higher of the upper edge and VWAP; shorts exit above
//     the lower of the lower edge and VWAP. Crossing the opposite edge flips the trade.
//   - Everything is closed at the end of the day.
//   - Optional paper sizing: account x min(4, 2% / the last 14 days' daily volatility), divided by the contract's value.
//
// What's adapted for MNQ (the paper traded SPY):
//   - MNQ instead of SPY, on 1-minute bars. Only 9:30 to 16:00 New York counts, worked out from each bar's own time, so any
//     Trading hours template works (the default ETH one included) and NinjaTrader's time zone setting doesn't matter.
//   - Default size is a fixed 1 MNQ, because Lucid's $2,000 max loss is far smaller than the paper's 25% worst drawdown.
//   - Costs: Lucid's $0.50 commission a side and 1 tick of slippage each way (the paper used per-share costs for SPY).
//   - Orders fill at the open of the bar after each check (the paper used the price at the check).
//   - The strategy goes flat at 15:59 New York (the paper closes at 16:00).
//   - Half days are left out of the noise-area average, and the strategy waits for 14 full days of history before trading.

namespace NinjaTrader.NinjaScript.Strategies
{
	public class QuintNoiseMomentum : Strategy
	{
		private const int SessionMinutes = 390;			// 9:30 to 16:00 New York
		private TimeZoneInfo platformZone, newYork;
		private DateTime today = DateTime.MinValue;		// the New York date being traded
		private double dayOpen, dayClose, prevClose;
		private double[] todayMoves;
		private readonly List<double[]> pastMoves = new List<double[]>();
		private readonly List<double> dailyCloses = new List<double>();
		private double cumPriceVolume, cumVolume, worstOpenLoss;
		private int lastMinute, carried;
		private bool ranBars;

		protected override void OnStateChange()
		{
			if (State == State.SetDefaults)
			{
				Name								= "QuintNoiseMomentum";
				Description							= "Quint proof: noise-area intraday momentum (Zarattini, Aziz & Barbon) on MNQ, 1-minute bars, 9:30 to 16:00 New York.";
				Calculate							= Calculate.OnBarClose;
				EntriesPerDirection					= 1;
				EntryHandling						= EntryHandling.AllEntries;
				IsExitOnSessionCloseStrategy		= true;		// a backup for half days; the strategy itself goes flat at 15:59 New York
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

				LookbackDays			= 14;
				VolatilityMultiplier	= 1.0;
				FirstCheckMinutes		= 30;		// 10:00 New York
				CheckEveryMinutes		= 30;		// HH:00 and HH:30
				UsePaperSizing			= false;
				FixedContracts			= 1;
				AccountSize				= 50000;
				TargetDailyVolatility	= 0.02;
				MaxLeverage				= 4;
				MaxContracts			= 4;
				CommissionPerSide		= 0.50;
			}
			else if (State == State.DataLoaded)
			{
				pastMoves.Clear();
				dailyCloses.Clear();
				todayMoves = null;
				today = DateTime.MinValue;
				dayOpen = dayClose = prevClose = cumPriceVolume = cumVolume = worstOpenLoss = 0;
				lastMinute = carried = 0;
				ranBars = false;
				try
				{
					platformZone = NinjaTrader.Core.Globals.GeneralOptions.TimeZoneInfo;	// Tools > Options > General > Time zone
					newYork = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
				}
				catch (Exception e)
				{
					newYork = null;
					Print("QuintNoiseMomentum: couldn't find the New York time zone, so nothing will trade (" + e.Message + ")");
				}
			}
			else if (State == State.Terminated)
			{
				if (ranBars && SystemPerformance != null)
					PrintSummary();
			}
		}

		protected override void OnBarUpdate()
		{
			if (BarsInProgress != 0 || newYork == null || platformZone == null)
				return;
			ranBars = true;

			// the worst open loss of any trade (Lucid's funded drawdown counts open losses)
			if (Position.MarketPosition != MarketPosition.Flat)
			{
				double against = Position.MarketPosition == MarketPosition.Long ? Low[0] - Position.AveragePrice : Position.AveragePrice - High[0];
				worstOpenLoss = Math.Min(worstOpenLoss, against * Instrument.MasterInstrument.PointValue * Position.Quantity);
			}

			DateTime ny;
			try { ny = TimeZoneInfo.ConvertTime(DateTime.SpecifyKind(Time[0], DateTimeKind.Unspecified), platformZone, newYork); }
			catch (ArgumentException) { return; }	// a clock-change hour that doesn't exist; never inside New York trading hours

			// minutes after 9:30 New York at this bar's close: 1 for the 9:31 bar, 30 for 10:00, 390 for 16:00
			int m = (int)Math.Round((ny.TimeOfDay - new TimeSpan(9, 30, 0)).TotalMinutes);
			if (m < 1 || m > SessionMinutes)
				return;		// outside 9:30 to 16:00 New York
			if (ny.Date != today)
				StartNewDay(ny.Date, m);
			if (dayOpen <= 0)
				return;		// this day's data started late, so it isn't used

			todayMoves[m] = Math.Abs(Close[0] / dayOpen - 1.0);
			lastMinute = Math.Max(lastMinute, m);
			dayClose = Close[0];
			cumPriceVolume += (High[0] + Low[0] + Close[0]) / 3.0 * Volume[0];
			cumVolume += Volume[0];

			if (m >= SessionMinutes - 1)
			{
				// 15:59 New York: go flat before the close, whatever Trading hours template is used
				if (Position.MarketPosition == MarketPosition.Long) ExitLong("Close", "Long");
				else if (Position.MarketPosition == MarketPosition.Short) ExitShort("Close", "Short");
				return;
			}
			if (m < FirstCheckMinutes || m % CheckEveryMinutes != 0)
				return;		// only at 10:00, 10:30 ... 15:30
			if (prevClose <= 0 || pastMoves.Count < LookbackDays)
				return;		// still learning the noise area

			double sigma = AverageMove(m);
			if (double.IsNaN(sigma))
				return;
			sigma *= VolatilityMultiplier;
			double upper = Math.Max(dayOpen, prevClose) * (1 + sigma);
			double lower = Math.Min(dayOpen, prevClose) * (1 - sigma);
			double vwap = cumVolume > 0 ? cumPriceVolume / cumVolume : Close[0];

			if (Position.MarketPosition == MarketPosition.Flat)
			{
				if (Close[0] > upper) TakeTrade(1);
				else if (Close[0] < lower) TakeTrade(-1);
			}
			else if (Position.MarketPosition == MarketPosition.Long)
			{
				if (Close[0] < lower) TakeTrade(-1);											// crossing the opposite edge flips the trade
				else if (Close[0] < Math.Max(upper, vwap)) ExitLong("Stop", "Long");
			}
			else
			{
				if (Close[0] > upper) TakeTrade(1);
				else if (Close[0] > Math.Min(lower, vwap)) ExitShort("Stop", "Short");
			}
		}

		private void StartNewDay(DateTime nyDate, int firstMinute)
		{
			// file away the last day: its moves feed the noise area (full days only), its close is the gap reference
			if (todayMoves != null && dayOpen > 0 && lastMinute >= 360)
			{
				pastMoves.Add(todayMoves);
				if (pastMoves.Count > LookbackDays) pastMoves.RemoveAt(0);
			}
			prevClose = dayClose;		// 0 when the last day is unknown, which blocks trading for a day
			if (dayClose > 0)
			{
				dailyCloses.Add(dayClose);
				if (dailyCloses.Count > LookbackDays + 1) dailyCloses.RemoveAt(0);
			}
			if (Position.MarketPosition != MarketPosition.Flat)
			{
				// safety net: a position should never reach a new day
				carried++;
				if (Position.MarketPosition == MarketPosition.Long) ExitLong("Carried", "Long");
				else ExitShort("Carried", "Short");
			}
			today = nyDate;
			dayOpen = firstMinute <= 30 ? Open[0] : 0;		// the 9:30 open; a day whose data starts after 10:00 is skipped
			dayClose = 0;
			todayMoves = new double[SessionMinutes + 1];
			for (int i = 0; i < todayMoves.Length; i++) todayMoves[i] = double.NaN;
			cumPriceVolume = 0;
			cumVolume = 0;
			lastMinute = 0;
		}

		private double AverageMove(int minute)
		{
			double sum = 0;
			int n = 0;
			foreach (double[] day in pastMoves)
			{
				double v = day[minute];
				if (!double.IsNaN(v)) { sum += v; n++; }
			}
			return n >= (LookbackDays + 1) / 2 ? sum / n : double.NaN;
		}

		private void TakeTrade(int direction)
		{
			int qty = TradeSize();
			if (qty < 1)
				return;
			if (direction > 0) EnterLong(qty, "Long");
			else EnterShort(qty, "Short");
		}

		private int TradeSize()
		{
			if (!UsePaperSizing)
				return FixedContracts;
			// the paper's sizing: aim for 2% daily volatility, at most 4 times the account
			if (dailyCloses.Count < LookbackDays + 1)
				return 0;
			List<double> rets = new List<double>();
			for (int i = 1; i < dailyCloses.Count; i++) rets.Add(dailyCloses[i] / dailyCloses[i - 1] - 1.0);
			double mean = rets.Average();
			double sd = Math.Sqrt(rets.Sum(r => (r - mean) * (r - mean)) / (rets.Count - 1));
			if (sd <= 0)
				return 0;
			double leverage = Math.Min(MaxLeverage, TargetDailyVolatility / sd);
			double contractValue = dayOpen * Instrument.MasterInstrument.PointValue;
			int qty = (int)Math.Floor(AccountSize * leverage / contractValue);
			return Math.Max(0, Math.Min(qty, MaxContracts));
		}

		private void PrintSummary()
		{
			// Recomputed from the fill prices (which include the slippage), with Lucid's commission, so the numbers don't depend on
			// NinjaTrader's commission settings. Copy everything between the lines and send it back.
			double pointValue = Instrument.MasterInstrument.PointValue;
			List<Trade> trades = new List<Trade>();
			foreach (Trade t in SystemPerformance.AllTrades) trades.Add(t);
			Print("-------- QUINT PROOF RESULTS --------");
			Print(string.Format("{0}, {1} to {2}, {3}, sizing: {4}, commission ${5:0.00} a side", Instrument.FullName,
				Bars.Count > 0 ? Bars.GetTime(0).ToString("yyyy-MM-dd") : "?", Bars.Count > 0 ? Bars.GetTime(Bars.Count - 1).ToString("yyyy-MM-dd") : "?",
				BarsPeriod.ToString(), UsePaperSizing ? "paper (2% volatility target)" : FixedContracts + " contract(s)", CommissionPerSide));
			PrintBlock("All", trades, pointValue, true);
			int half = trades.Count / 2;
			PrintBlock("First half", trades.Take(half).ToList(), pointValue, false);
			PrintBlock("Second half", trades.Skip(half).ToList(), pointValue, false);
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
				Print(string.Format("{0}: {1} trades, net ${2:N0}", y, countByYear[y], byYear[y]));
			Print("Exits: " + string.Join(", ", exits.Select(e => e.Key + " " + e.Value)) + (carried > 0 ? "  (WARNING: " + carried + " position(s) reached a new day)" : ""));
			Print(string.Format("Worst open loss inside one trade: ${0:N0} (Lucid 50K max loss: $2,000)", worstOpenLoss));
			Print("--------------------------------------");
		}

		private double Usd(Trade t, double pointValue)
		{
			int dir = t.Entry.MarketPosition == MarketPosition.Long ? 1 : -1;
			return (t.Exit.Price - t.Entry.Price) * dir * pointValue * t.Quantity - 2 * CommissionPerSide * t.Quantity;
		}

		private void PrintBlock(string label, List<Trade> trades, double pointValue, bool full)
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
				DateTime d = t.Exit.Time.Date;
				byDay[d] = (byDay.ContainsKey(d) ? byDay[d] : 0) + usd;
			}
			Print(string.Format("{0}: {1} trades, wins {2:0}%, profit factor {3}, net ${4:N0}, worst drawdown ${5:N0}, worst day ${6:N0}",
				label, trades.Count, trades.Count > 0 ? 100.0 * wins / trades.Count : 0, grossLoss > 0 ? (grossWin / grossLoss).ToString("0.00") : "n/a",
				net, maxDrawdown, byDay.Count > 0 ? byDay.Values.Min() : 0));
			if (full)
				Print(string.Format("Longs ${0:N0}, shorts ${1:N0}, days traded {2}, days losing $1,200 or more: {3}",
					longNet, shortNet, byDay.Count, byDay.Values.Count(v => v <= -1200)));
		}

		#region Properties
		[NinjaScriptProperty]
		[Range(5, 60)]
		[Display(Name = "Days in the noise area (paper: 14)", Order = 1, GroupName = "1. Rules")]
		public int LookbackDays { get; set; }

		[NinjaScriptProperty]
		[Range(0.25, 4.0)]
		[Display(Name = "Noise area multiplier (paper: 1)", Order = 2, GroupName = "1. Rules")]
		public double VolatilityMultiplier { get; set; }

		[NinjaScriptProperty]
		[Range(1, 389)]
		[Display(Name = "First check, minutes after 9:30 NY (paper: 30)", Order = 3, GroupName = "1. Rules")]
		public int FirstCheckMinutes { get; set; }

		[NinjaScriptProperty]
		[Range(1, 120)]
		[Display(Name = "Check every, minutes (paper: 30)", Order = 4, GroupName = "1. Rules")]
		public int CheckEveryMinutes { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Use the paper's sizing", Order = 1, GroupName = "2. Size")]
		public bool UsePaperSizing { get; set; }

		[NinjaScriptProperty]
		[Range(1, 40)]
		[Display(Name = "Fixed contracts", Order = 2, GroupName = "2. Size")]
		public int FixedContracts { get; set; }

		[NinjaScriptProperty]
		[Range(1000.0, 10000000.0)]
		[Display(Name = "Account size $ (paper sizing)", Order = 3, GroupName = "2. Size")]
		public double AccountSize { get; set; }

		[NinjaScriptProperty]
		[Range(0.001, 0.1)]
		[Display(Name = "Daily volatility target (paper: 0.02)", Order = 4, GroupName = "2. Size")]
		public double TargetDailyVolatility { get; set; }

		[NinjaScriptProperty]
		[Range(0.1, 10.0)]
		[Display(Name = "Maximum leverage (paper: 4)", Order = 5, GroupName = "2. Size")]
		public double MaxLeverage { get; set; }

		[NinjaScriptProperty]
		[Range(1, 40)]
		[Display(Name = "Maximum contracts (Lucid 50K: 40 MNQ)", Order = 6, GroupName = "2. Size")]
		public int MaxContracts { get; set; }

		[NinjaScriptProperty]
		[Range(0.0, 10.0)]
		[Display(Name = "Commission a side $ (Lucid MNQ: 0.50)", Order = 1, GroupName = "3. Costs")]
		public double CommissionPerSide { get; set; }
		#endregion
	}
}

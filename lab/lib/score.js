'use strict';
// The scorecard every strategy gets, the same way every time, so results can be compared honestly.
// It follows the rulebook (CLAUDE.md and the quint-trading skill): the whole period and the later half on its own,
// net after costs on 1 MNQ, the worst drawdown in dollars, the worst day, the longest losing streak, and whether one
// big day carried the result. Nothing here is financial advice.
//
// A trade is { day: 'YYYY-MM-DD', dir: 1 | -1, usd } where usd is the result on 1 MNQ after commission and slippage.

const LUCID_50K = { maxLoss: 2000, dailyLoss: 1200 };
const MIN_TRADES = 100; // under this the rulebook calls a result an anecdote
const STRESS_EXTRA = 2.5; // cost stress: another $2.50 a trade, roughly doubling MNQ costs

function basic(trades, extraCost = 0) {
  let net = 0, peak = 0, dd = 0, wins = 0, gw = 0, gl = 0, streak = 0, worstStreak = 0;
  const byDay = new Map();
  const side = { long: { n: 0, net: 0 }, short: { n: 0, net: 0 } };
  for (const t of trades) {
    const usd = t.usd - extraCost;
    net += usd;
    peak = Math.max(peak, net);
    dd = Math.max(dd, peak - net);
    if (usd > 0) { wins++; gw += usd; streak = 0; } else { gl -= usd; streak++; worstStreak = Math.max(worstStreak, streak); }
    byDay.set(t.day, (byDay.get(t.day) || 0) + usd);
    const s = t.dir > 0 ? side.long : side.short;
    s.n++; s.net += usd;
  }
  const days = [...byDay.entries()];
  const best = days.reduce((a, d) => (d[1] > a[1] ? d : a), [null, -Infinity]);
  const worst = days.reduce((a, d) => (d[1] < a[1] ? d : a), [null, Infinity]);
  return {
    trades: trades.length,
    winRate: trades.length ? wins / trades.length : 0,
    profitFactor: gl > 0 ? gw / gl : (gw > 0 ? Infinity : null),
    net,
    avgTrade: trades.length ? net / trades.length : 0,
    maxDrawdown: dd,
    longestLosingStreak: worstStreak,
    daysTraded: days.length,
    bestDay: days.length ? { day: best[0], usd: best[1] } : null,
    worstDay: days.length ? { day: worst[0], usd: worst[1] } : null,
    long: side.long,
    short: side.short,
  };
}

// The full scorecard, with plain-English checks.
function score(trades, opt = {}) {
  const firm = { ...LUCID_50K, ...(opt.firm || {}) };
  const all = basic(trades);
  const half = Math.floor(trades.length / 2);
  const first = basic(trades.slice(0, half));
  const second = basic(trades.slice(half)); // the out-of-sample check: the later half on its own
  const stressed = basic(trades, STRESS_EXTRA);
  const withoutBestDay = all.bestDay ? all.net - all.bestDay.usd : 0;
  const checks = {
    enoughTrades: all.trades >= MIN_TRADES,
    profitAfterCosts: all.net > 0,
    laterHalfProfit: second.net > 0,
    survivesDoubleCosts: stressed.net > 0,
    notOneLuckyDay: withoutBestDay > 0,
    drawdownFitsFirm: all.maxDrawdown < firm.maxLoss,
    worstDayFitsFirm: !all.worstDay || all.worstDay.usd > -firm.dailyLoss,
  };
  return { ...all, firstHalf: pick(first), secondHalf: pick(second), doubleCostsNet: stressed.net, withoutBestDay, checks, grade: grade(all, checks) };
}

function pick(s) {
  return { trades: s.trades, net: s.net, profitFactor: s.profitFactor, winRate: s.winRate, maxDrawdown: s.maxDrawdown };
}

// One word for the scoreboard. Deliberately strict: a green backtest isn't proof (research programme, "Decision rule").
function grade(all, c) {
  if (all.trades === 0) return 'No trades';
  if (!c.profitAfterCosts) return 'Loses money';
  if (!c.enoughTrades) return 'Too few trades';
  const passed = Object.values(c).filter(Boolean).length;
  if (passed === Object.keys(c).length) return 'Candidate';
  if (c.laterHalfProfit && c.survivesDoubleCosts) return 'Promising';
  return 'Fragile';
}

module.exports = { score, basic, LUCID_50K, MIN_TRADES, STRESS_EXTRA };

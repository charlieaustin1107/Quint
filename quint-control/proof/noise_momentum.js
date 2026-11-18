'use strict';
// The noise-area intraday momentum strategy (Zarattini, Aziz & Barbon, "Beat the Market", SSRN 4824172), the same rules as
// QuintNoiseMomentum.cs, run on a CSV of MNQ candles. It's a first read before the real test in NinjaTrader's Strategy Analyzer.
//
//   node quint-control/proof/noise_momentum.js backtest/data/mnq_15m.csv
//
// The CSV has t (bar start, unix seconds UTC), o, h, l, c, v. Only New York regular hours are used (9:30 to 16:00).
// The bars must divide 30 minutes evenly (1, 5, 15 or 30 minutes), so every HH:00 and HH:30 check lands on a bar close.

const fs = require('fs');

const DEFAULTS = {
  lookbackDays: 14, // the noise area averages the last 14 days' moves from the open
  volatilityMultiplier: 1, // the paper uses 1
  firstCheck: 30, // minutes after 9:30: the first check is at 10:00
  checkEvery: 30, // then every half hour (HH:00 and HH:30)
  contracts: 1,
  pointValue: 2, // MNQ: $2 a point
  tick: 0.25,
  commissionPerSide: 0.5, // Lucid's MNQ commission
  slippageTicksPerSide: 1,
};

const etParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function nyTime(sec) { // the New York date and minute of the day for a unix time
  const p = Object.fromEntries(etParts.formatToParts(new Date(sec * 1000)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}

function readCsv(file) {
  const rows = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/); // files saved on Windows end each line with \r\n
  const head = rows.shift().split(',').map((h) => h.trim());
  return rows.map((r) => { const v = r.split(',').map(Number); const o = {}; head.forEach((h, i) => { o[h] = v[i]; }); return o; });
}

// Group bars into regular-hours sessions: each bar gets m, its minutes after 9:30 at the bar's close.
function sessions(bars) {
  const bar = bars.length > 1 ? Math.round((bars[1].t - bars[0].t) / 60) : 1;
  if (30 % bar !== 0) throw new Error(`${bar}-minute bars don't line up with the half-hour checks`);
  const days = new Map();
  for (const b of bars) {
    const { day, min } = nyTime(b.t);
    if (min < 570 || min + bar > 960) continue; // 9:30 to 16:00 only
    if (!days.has(day)) days.set(day, []);
    days.get(day).push({ ...b, m: min + bar - 570 });
  }
  return { bar, days: [...days.entries()].map(([day, list]) => ({ day, bars: list })).filter((d) => d.bars.length && d.bars[0].m === bar) }; // skip days that don't start at 9:30
}

function run(bars, opt = {}) {
  const o = { ...DEFAULTS, ...opt };
  const { days } = sessions(bars);
  const past = []; // per finished day: move from the open at each minute
  const trades = [];
  let prevClose = null;
  const slip = o.slippageTicksPerSide * o.tick;
  for (const d of days) {
    const open = d.bars[0].o, moves = new Map();
    let pv = 0, vol = 0, pos = null; // pos: { dir, entry, day, at }
    const close = (price, why, at) => { const fill = price - pos.dir * slip, pts = (fill - pos.entry) * pos.dir;
      trades.push({ day: d.day, dir: pos.dir, entry: pos.entry, exit: fill, why, from: pos.at, to: at, usd: pts * o.pointValue * o.contracts - 2 * o.commissionPerSide * o.contracts }); pos = null; };
    for (let i = 0; i < d.bars.length; i++) {
      const b = d.bars[i], m = b.m;
      moves.set(m, Math.abs(b.c / open - 1));
      pv += ((b.h + b.l + b.c) / 3) * b.v; vol += b.v;
      if (m < o.firstCheck || m % o.checkEvery !== 0 || m >= 390) continue; // checks at 10:00 ... 15:30
      if (prevClose === null || past.length < o.lookbackDays) continue;
      const seen = past.map((p) => p.get(m)).filter((x) => x !== undefined);
      if (seen.length < Math.ceil(o.lookbackDays / 2)) continue;
      const sigma = (seen.reduce((a, x) => a + x, 0) / seen.length) * o.volatilityMultiplier;
      const upper = Math.max(open, prevClose) * (1 + sigma), lower = Math.min(open, prevClose) * (1 - sigma), vwap = vol > 0 ? pv / vol : b.c;
      const next = d.bars[i + 1]; if (!next) continue; // orders fill at the next bar's open, as in NinjaTrader
      const want = b.c > upper ? 1 : b.c < lower ? -1 : 0;
      const enter = (dir) => { pos = { dir, entry: next.o + dir * slip, at: next.m }; };
      if (!pos) { if (want) enter(want); }
      else if (want === -pos.dir) { close(next.o, 'reverse', next.m); enter(want); } // crossing the opposite boundary flips the trade
      else if (pos.dir > 0 ? b.c < Math.max(upper, vwap) : b.c > Math.min(lower, vwap)) close(next.o, 'stop', next.m);
    }
    const last = d.bars[d.bars.length - 1];
    if (pos) close(last.c, 'close', last.m); // flat at the close
    if (last.m >= 360) past.push(moves); // half days (closing at 13:00) are left out of the noise area
    if (past.length > o.lookbackDays) past.shift();
    prevClose = last.c;
  }
  return { days: days.length, trades, stats: stats(trades) };
}

function stats(trades) {
  let net = 0, peak = 0, dd = 0, win = 0, gw = 0, gl = 0;
  const byDay = new Map(), side = { long: 0, short: 0 };
  for (const t of trades) {
    net += t.usd; peak = Math.max(peak, net); dd = Math.max(dd, peak - net);
    if (t.usd > 0) { win++; gw += t.usd; } else gl -= t.usd;
    byDay.set(t.day, (byDay.get(t.day) || 0) + t.usd); side[t.dir > 0 ? 'long' : 'short'] += t.usd;
  }
  const days = [...byDay.values()];
  return { trades: trades.length, winRate: trades.length ? win / trades.length : 0, profitFactor: gl > 0 ? gw / gl : null, net, maxDrawdown: dd,
    long: side.long, short: side.short, worstDay: days.length ? Math.min(...days) : 0, daysBelow1200: days.filter((x) => x <= -1200).length, tradingDays: days.length };
}

module.exports = { run, stats, sessions, nyTime, readCsv, DEFAULTS };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node noise_momentum.js candles.csv'); process.exit(1); }
  const bars = readCsv(file), r = run(bars);
  const half = Math.floor(r.trades.length / 2), $ = (x) => (x < 0 ? '-$' : '$') + Math.abs(Math.round(x)).toLocaleString('en-US');
  const show = (label, s) => console.log(`${label}: ${s.trades} trades, ${(s.winRate * 100).toFixed(0)}% wins, profit factor ${s.profitFactor === null ? 'n/a' : s.profitFactor.toFixed(2)}, net ${$(s.net)}, worst drawdown ${$(s.maxDrawdown)}, worst day ${$(s.worstDay)}`);
  console.log(`${r.days} New York sessions in ${file}, 1 MNQ, $${DEFAULTS.commissionPerSide} a side and ${DEFAULTS.slippageTicksPerSide} tick of slippage each way`);
  show('All', r.stats); show('First half', stats(r.trades.slice(0, half))); show('Second half', stats(r.trades.slice(half)));
  console.log(`Longs ${$(r.stats.long)}, shorts ${$(r.stats.short)}, days losing $1,200 or more: ${r.stats.daysBelow1200}`);
}

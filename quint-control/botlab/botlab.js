'use strict';
// Quint bot lab: twelve MNQ test bots with fixed rules, the same rules as QuintBotLab.cs. It gives a first read on saved
// candles, and it's the reference the NinjaScript version is checked against. Nothing here is financial advice.
//
//   node quint-control/botlab/botlab.js candles.csv [bot number, or all]
//
// The CSV has t (bar start, unix seconds UTC), o, h, l, c, v. Only 9:30 to 16:00 New York is used. A bot runs when the
// candles divide its own timeframe: 1-minute candles run every bot, 5-minute candles run the 5-, 15- and 30-minute bots.
//
// Shared rules for every bot: orders fill at the next candle's open; a stop and a target go in with every entry, and if
// one candle could have hit both, the stop counts; 1 MNQ; $0.50 commission a side; 1 tick of slippage on every market and
// stop fill (targets are limit orders, so none); no new entries once the day has lost the daily loss limit; flat by
// 15:59 New York.

const { sessions, stats, readCsv } = require('../proof/noise_momentum');

const DEFAULTS = { contracts: 1, pointValue: 2, tick: 0.25, commissionPerSide: 0.5, slippageTicks: 1, dailyLossLimit: 500 };
const LAST = 390; // 16:00 New York, in minutes after 9:30

const roundTick = (x, tick) => Math.round(x / tick) * tick;
const emaStep = (prev, x, n) => (prev === null ? x : prev + (2 / (n + 1)) * (x - prev));

// Each bot sees its own candles (tf minutes) and the day so far (d). bar() returns null, { exit }, or { dir, stop, target }.
// pos is the open position's direction: 1 long, -1 short, 0 flat. A target of null means no target (out at the close).
const BOTS = [
  null,

  // 1. New York open breakout (Chart Wizard): the 9:30-9:45 range, a 5-minute close outside it until 11:30, stop on the
  // other side of the range, target 2R, one trade a day.
  () => {
    let hi, lo;
    return { name: 'New York open breakout', tf: 5, maxTrades: 1,
      day() { hi = -Infinity; lo = Infinity; },
      bar(d, b, pos) {
        if (b.m <= 15) { hi = Math.max(hi, b.h); lo = Math.min(lo, b.l); return null; }
        if (pos || b.m > 120) return null;
        if (b.c > hi) return { dir: 1, stop: lo, target: b.c + 2 * (b.c - lo) };
        if (b.c < lo) return { dir: -1, stop: hi, target: b.c - 2 * (hi - b.c) };
        return null;
      } };
  },

  // 2. Opening candle (5-minute opening range breakout, Zarattini, Barbon & Aziz): trade the direction of the 9:30-9:35
  // candle, stop at its other end, target 10R, otherwise out at the close.
  () => ({ name: 'Opening candle direction', tf: 5, maxTrades: 1,
    bar(d, b, pos) {
      if (b.m !== 5 || pos) return null;
      if (b.c > b.o && b.c - b.l >= 1) return { dir: 1, stop: b.l, target: b.c + 10 * (b.c - b.l) };
      if (b.c < b.o && b.h - b.c >= 1) return { dir: -1, stop: b.h, target: b.c - 10 * (b.h - b.c) };
      return null;
    } }),

  // 3. 20-candle breakout (Chart Wizard): 15-minute close beyond the last 20 candles' high or low, stop 2 ATR(14),
  // target 3x the stop.
  () => {
    const hs = [], ls = [];
    let atr = null, n = 0, prevC = null;
    return { name: '20-candle breakout', tf: 15, maxTrades: 2,
      bar(d, b, pos) {
        const tr = prevC === null ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - prevC), Math.abs(b.l - prevC));
        n++; atr = atr === null ? tr : atr + (tr - atr) / Math.min(n, 14); prevC = b.c;
        let sig = null;
        if (hs.length === 20 && !pos && b.m >= 30 && b.m <= 330) {
          const hh = Math.max(...hs), ll = Math.min(...ls);
          if (b.c > hh) sig = { dir: 1, stop: b.c - 2 * atr, target: b.c + 6 * atr };
          else if (b.c < ll) sig = { dir: -1, stop: b.c + 2 * atr, target: b.c - 6 * atr };
        }
        hs.push(b.h); ls.push(b.l);
        if (hs.length > 20) { hs.shift(); ls.shift(); }
        return sig;
      } };
  },

  // 4. Last-30-minute momentum (Gao, Han, Li & Zhou; Baltussen, Da, Lammers & Martens): at 15:30, go with the move since
  // yesterday's close, out at the close, with a 0.5% emergency stop.
  () => ({ name: 'Last-30-minute momentum', tf: 5, maxTrades: 1,
    bar(d, b, pos) {
      if (b.m !== 360 || pos || !d.prevClose || b.c === d.prevClose) return null;
      const dir = b.c > d.prevClose ? 1 : -1;
      return { dir, stop: b.c * (1 - dir * 0.005), target: null };
    } }),

  // 5. VWAP trend (Zarattini & Aziz): long while the 1-minute close is above VWAP, short while below, flip on each cross,
  // with a 0.5% emergency stop.
  () => ({ name: 'VWAP trend', tf: 1, maxTrades: 40,
    bar(d, b, pos) {
      const dir = b.c > d.vwap ? 1 : b.c < d.vwap ? -1 : 0;
      if (!dir || dir === pos) return null;
      return { dir, stop: b.c * (1 - dir * 0.005), target: null };
    } }),

  // 6. Gap fade (the plan's fixed rules): a 0.2%-1.0% gap, the first 5-minute candle turns back, stop beyond the day's
  // extreme, target yesterday's close (skipped if less than 1x the stop away), out at 11:30.
  () => ({ name: 'Gap fade', tf: 5, maxTrades: 1,
    bar(d, b, pos) {
      if (pos) return b.m >= 120 ? { exit: 'time' } : null;
      if (b.m !== 5 || !d.prevClose) return null;
      const gap = (d.open - d.prevClose) / d.prevClose;
      if (Math.abs(gap) < 0.002 || Math.abs(gap) > 0.01) return null;
      if (gap > 0 && b.c < b.o) { const stop = d.high + d.tick, target = d.prevClose; return b.c - target >= stop - b.c ? { dir: -1, stop, target } : null; }
      if (gap < 0 && b.c > b.o) { const stop = d.low - d.tick, target = d.prevClose; return target - b.c >= b.c - stop ? { dir: 1, stop, target } : null; }
      return null;
    } }),

  // 7. Inverted fair value gap (from Daxton Trades' video; the EMA lengths and the stop are our choices): trend from the
  // 5-minute EMA 50 and 200; the first fair value gap against the trend that a 5-minute close goes through is the entry,
  // until 11:30; stop beyond the swing since the gap; target 2R; one trade a day.
  () => {
    let e50 = null, e200 = null, n = 0, last = [], bear = [], bull = [];
    return { name: 'Inverted fair value gap', tf: 5, maxTrades: 1,
      day() { last = []; bear = []; bull = []; },
      bar(d, b, pos) {
        e50 = emaStep(e50, b.c, 50); e200 = emaStep(e200, b.c, 200); n++;
        for (const z of bear) z.low = Math.min(z.low, b.l);
        for (const z of bull) z.high = Math.max(z.high, b.h);
        const up = n >= 200 && b.c > e200 && e50 > e200, down = n >= 200 && b.c < e200 && e50 < e200;
        let sig = null;
        for (const z of bear) {
          if (z.dead || b.c <= z.top) continue;
          z.dead = true;
          if (!sig && up && !pos && b.m <= 120) { const stop = z.low - d.tick; sig = { dir: 1, stop, target: b.c + 2 * (b.c - stop) }; }
        }
        for (const z of bull) {
          if (z.dead || b.c >= z.bottom) continue;
          z.dead = true;
          if (!sig && down && !pos && b.m <= 120) { const stop = z.high + d.tick; sig = { dir: -1, stop, target: b.c - 2 * (stop - b.c) }; }
        }
        last.push(b);
        if (last.length > 3) last.shift();
        if (last.length === 3) {
          const a = last[0], c = last[2];
          if (c.h < a.l) bear.push({ top: a.l, low: c.l, dead: false });
          if (c.l > a.h) bull.push({ bottom: a.h, high: c.h, dead: false });
        }
        return sig;
      } };
  },

  // 8. Range squeeze breakout (from the NinjaTrader range-breakout bot video; the numbers are our choices): a 20-minute
  // range narrower than 0.15% and than 90% of yesterday's, then a 1-minute close outside it; stop on the other side of the
  // range; target 2R; up to 3 trades a day, 9:45 to 15:00.
  () => {
    let win = [], widths = [], limit = null, armed = null;
    return { name: 'Range squeeze breakout', tf: 1, maxTrades: 3,
      day() {
        if (widths.length >= 100) { const s = [...widths].sort((x, y) => x - y); limit = s[Math.floor(s.length * 0.1)]; }
        win = []; widths = []; armed = null;
      },
      bar(d, b, pos) {
        let sig = null;
        if (armed && !pos && b.m >= 15 && b.m <= 330) {
          if (b.c > armed.h) { const stop = armed.l - d.tick; sig = { dir: 1, stop, target: b.c + 2 * (b.c - stop) }; }
          else if (b.c < armed.l) { const stop = armed.h + d.tick; sig = { dir: -1, stop, target: b.c - 2 * (stop - b.c) }; }
        }
        win.push(b);
        if (win.length > 20) win.shift();
        armed = null;
        if (win.length === 20) {
          let h = -Infinity, l = Infinity;
          for (const x of win) { h = Math.max(h, x.h); l = Math.min(l, x.l); }
          const w = (h - l) / b.c;
          widths.push(w);
          if (limit !== null && w <= limit && w <= 0.0015) armed = { h, l };
        }
        return sig;
      } };
  },

  // 9. Trend-join scalper (shaped like the Strat v60 dashboard: small target, wider stop; the rules are ours): EMA 9 > 21
  // > 50 on 1-minute candles with the 21 rising, a candle that dips to the 21 and closes up; target 7 points, stop 24;
  // up to 10 trades a day, 10:00 to 15:30, and it stops for the day after losing $300.
  () => {
    let e9 = null, e21 = null, e50 = null, n = 0;
    const hist = [];
    return { name: 'Trend-join scalper', tf: 1, maxTrades: 10, dayLoss: 300,
      bar(d, b, pos) {
        e9 = emaStep(e9, b.c, 9); e21 = emaStep(e21, b.c, 21); e50 = emaStep(e50, b.c, 50); n++;
        hist.push(e21);
        if (hist.length > 6) hist.shift();
        if (n < 50 || pos || b.m < 30 || b.m > 360 || hist.length < 6) return null;
        if (e9 > e21 && e21 > e50 && e21 > hist[0] && b.l <= e21 && b.c > e21 && b.c > b.o) return { dir: 1, stop: b.c - 24, target: b.c + 7 };
        if (e9 < e21 && e21 < e50 && e21 < hist[0] && b.h >= e21 && b.c < e21 && b.c < b.o) return { dir: -1, stop: b.c + 24, target: b.c - 7 };
        return null;
      } };
  },

  // 10. VWAP band fade (a "fade", one of Phantom's entry styles; the rules are ours): a 5-minute close outside VWAP +/-2
  // standard deviations, then a close back inside; stop beyond the last 3 candles' extreme; target VWAP, skipped unless
  // it's at least 1x the stop away; up to 2 trades a day, 10:00 to 15:00.
  () => {
    let last = [], wasAbove = false, wasBelow = false;
    return { name: 'VWAP band fade', tf: 5, maxTrades: 2,
      day() { last = []; wasAbove = false; wasBelow = false; },
      bar(d, b, pos) {
        last.push(b);
        if (last.length > 3) last.shift();
        const up = d.vwap + 2 * d.vsd, dn = d.vwap - 2 * d.vsd;
        let sig = null;
        if (!pos && d.vsd > 0 && b.m >= 30 && b.m <= 330) {
          if (wasAbove && b.c < up) {
            const stop = Math.max(...last.map((x) => x.h)) + d.tick, target = d.vwap;
            if (b.c - target >= stop - b.c) sig = { dir: -1, stop, target };
          } else if (wasBelow && b.c > dn) {
            const stop = Math.min(...last.map((x) => x.l)) - d.tick, target = d.vwap;
            if (target - b.c >= b.c - stop) sig = { dir: 1, stop, target };
          }
        }
        wasAbove = d.vsd > 0 && b.c > up;
        wasBelow = d.vsd > 0 && b.c < dn;
        return sig;
      } };
  },

  // 11. Failed breakout of yesterday's high or low (a "failed breakout", one of Phantom's entry styles; the rules are
  // ours): a 5-minute candle trades through the level and closes back inside; stop beyond that candle; target 2R; each
  // level once a day, 9:45 to 15:00.
  () => {
    let usedHi = false, usedLo = false;
    return { name: 'Failed breakout', tf: 5, maxTrades: 2,
      day() { usedHi = false; usedLo = false; },
      bar(d, b, pos) {
        if (pos || !d.prevHigh || b.m < 15 || b.m > 330) return null;
        if (!usedHi && b.h > d.prevHigh && b.c < d.prevHigh) { usedHi = true; const stop = b.h + d.tick; return { dir: -1, stop, target: b.c - 2 * (stop - b.c) }; }
        if (!usedLo && b.l < d.prevLow && b.c > d.prevLow) { usedLo = true; const stop = b.l - d.tick; return { dir: 1, stop, target: b.c + 2 * (b.c - stop) }; }
        return null;
      } };
  },

  // 12. Noise-area momentum (Zarattini, Aziz & Barbon), as in proof/: checks at each half hour from 10:00, flips on the
  // opposite boundary, trailing stop at the boundary or VWAP, with a 1% emergency stop.
  () => {
    const past = [];
    let moves = null;
    return { name: 'Noise-area momentum', tf: 30, maxTrades: 14,
      day(d) {
        if (moves && d.prevFull) { past.push(moves); if (past.length > 14) past.shift(); }
        moves = new Map();
      },
      bar(d, b, pos) {
        moves.set(b.m, Math.abs(b.c / d.open - 1));
        if (b.m >= LAST || !d.prevClose || past.length < 14) return null;
        const seen = past.map((p) => p.get(b.m)).filter((x) => x !== undefined);
        if (seen.length < 7) return null;
        const s = seen.reduce((a, x) => a + x, 0) / seen.length;
        const upper = Math.max(d.open, d.prevClose) * (1 + s), lower = Math.min(d.open, d.prevClose) * (1 - s);
        const want = b.c > upper ? 1 : b.c < lower ? -1 : 0;
        if (!pos) return want ? { dir: want, stop: b.c * (1 - want * 0.01), target: null } : null;
        if (want === -pos) return { dir: want, stop: b.c * (1 - want * 0.01), target: null };
        if (pos > 0 ? b.c < Math.max(upper, d.vwap) : b.c > Math.min(lower, d.vwap)) return { exit: 'rule' };
        return null;
      } };
  },
];

function run(bars, botNumber, opt = {}) {
  const o = { ...DEFAULTS, ...opt };
  const bot = BOTS[botNumber]();
  const { bar: base, days } = sessions(bars);
  if (bot.tf % base !== 0) throw new Error(`bot ${botNumber} needs ${bot.tf}-minute candles or smaller, and these are ${base}-minute`);
  const slip = o.slippageTicks * o.tick, lastEntry = LAST - base, trades = [];
  const lossLimit = Math.min(o.dailyLossLimit, bot.dayLoss || Infinity);
  let prev = null;
  for (const day of days) {
    const list = day.bars;
    const d = { tick: o.tick, open: list[0].o, high: -Infinity, low: Infinity, vwap: 0, vsd: 0,
      prevClose: prev ? prev.close : null, prevHigh: prev ? prev.high : null, prevLow: prev ? prev.low : null, prevFull: !!(prev && prev.full) };
    let pv = 0, pv2 = 0, vol = 0, pos = null, pending = null, cur = null, count = 0, pnl = 0;
    if (bot.day) bot.day(d);
    const close = (price, why, at) => {
      const usd = (price - pos.entry) * pos.dir * o.pointValue * o.contracts - 2 * o.commissionPerSide * o.contracts;
      trades.push({ day: day.day, bot: botNumber, dir: pos.dir, entry: pos.entry, exit: price, why, from: pos.at, to: at, usd });
      pnl += usd; pos = null;
    };
    for (let i = 0; i < list.length; i++) {
      const b = list[i], next = list[i + 1];
      // orders from the last candle fill at this candle's open
      if (pending) {
        if (pending.exit && pos) close(b.o - pos.dir * slip, pending.exit, b.m);
        if (pending.dir) {
          if (pos && pos.dir === -pending.dir) close(b.o - pos.dir * slip, 'flip', b.m);
          if (!pos) pos = { dir: pending.dir, entry: b.o + pending.dir * slip, stop: pending.stop, target: pending.target, at: b.m };
        }
        pending = null;
      }
      // the stop and target inside this candle (the stop counts first if both could have filled)
      if (pos) {
        if (pos.dir > 0) {
          if (b.l <= pos.stop) close(Math.min(b.o, pos.stop) - slip, 'stop', b.m);
          else if (pos.target !== null && b.h >= pos.target) close(Math.max(b.o, pos.target), 'target', b.m);
        } else if (b.h >= pos.stop) close(Math.max(b.o, pos.stop) + slip, 'stop', b.m);
        else if (pos.target !== null && b.l <= pos.target) close(Math.min(b.o, pos.target), 'target', b.m);
      }
      // the day so far
      d.high = Math.max(d.high, b.h); d.low = Math.min(d.low, b.l);
      const p = (b.h + b.l + b.c) / 3;
      pv += p * b.v; pv2 += p * p * b.v; vol += b.v;
      d.vwap = vol > 0 ? pv / vol : b.c;
      d.vsd = vol > 0 ? Math.sqrt(Math.max(0, pv2 / vol - d.vwap * d.vwap)) : 0;
      // the bot's own candle
      if (!cur) cur = { o: b.o, h: b.h, l: b.l, c: b.c, v: 0 };
      cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; cur.v += b.v;
      if (b.m % bot.tf === 0) {
        cur.m = b.m;
        const sig = bot.bar(d, cur, pos ? pos.dir : 0);
        cur = null;
        if (sig && next && b.m < lastEntry) {
          if (sig.exit) { if (pos) pending = { exit: sig.exit }; }
          else if (sig.dir && (!pos || pos.dir !== sig.dir)) {
            const ok = count < bot.maxTrades && pnl > -lossLimit && (sig.dir > 0 ? sig.stop < b.c : sig.stop > b.c);
            if (ok) { pending = { dir: sig.dir, stop: roundTick(sig.stop, o.tick), target: sig.target === null ? null : roundTick(sig.target, o.tick) }; count++; }
            else if (pos) pending = { exit: 'blocked' };
          }
        }
      }
      // flat by the close: 15:59 on 1-minute candles
      if (pos && b.m >= lastEntry && !(pending && pending.exit)) {
        if (next) pending = { exit: 'close' };
        else close(b.c - pos.dir * slip, 'close', b.m);
      }
    }
    const lastBar = list[list.length - 1];
    if (pos) close(lastBar.c - pos.dir * slip, 'close', lastBar.m); // a half day
    prev = { close: lastBar.c, high: d.high, low: d.low, full: lastBar.m >= 360 };
  }
  return { bot: botNumber, name: bot.name, tf: bot.tf, days: days.length, trades, stats: stats(trades) };
}

const NAMES = BOTS.map((f) => (f ? f().name : null));

module.exports = { run, readCsv, BOTS, NAMES, DEFAULTS };

if (require.main === module) {
  const [file, which = 'all'] = process.argv.slice(2);
  if (!file) { console.error('usage: node botlab.js candles.csv [bot number, or all]'); process.exit(1); }
  const bars = readCsv(file), $ = (x) => (x < 0 ? '-$' : '$') + Math.abs(Math.round(x)).toLocaleString('en-US');
  const list = which === 'all' ? NAMES.map((n, i) => i).filter((i) => i > 0) : [Number(which)];
  for (const n of list) {
    let r;
    try { r = run(bars, n); } catch (e) { console.log(`${n}. ${NAMES[n]}: skipped (${e.message})`); continue; }
    const s = r.stats, half = Math.floor(r.trades.length / 2), late = stats(r.trades.slice(half));
    console.log(`${n}. ${r.name} (${r.tf}-min): ${s.trades} trades, ${(s.winRate * 100).toFixed(0)}% wins, PF ${s.profitFactor === null ? 'n/a' : s.profitFactor.toFixed(2)}, net ${$(s.net)}, worst drawdown ${$(s.maxDrawdown)}, worst day ${$(s.worstDay)}, second half ${$(late.net)}`);
  }
}

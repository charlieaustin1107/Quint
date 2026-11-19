'use strict';
// Quint Lab strategy factory: the strategy families and their variation grids.
//
// Each family is one idea with a fixed grid of variations, written down here BEFORE testing (pre-registered). The
// factory tests every variation the same way, on the bot lab's engine (next-candle fills, stop first if a candle hits
// both, $0.50 a side plus 1 tick of slippage on 1 MNQ, flat by 15:59 New York). Change a grid only in a dated commit,
// and never because of a result. Families come from strategies that showed something positive (see the registry).
// Nothing here is financial advice.

const { nyTime } = require('../../quint-control/proof/noise_momentum');

// ---------- your strategy: WYLD Will's Four Pillars, exactly as the TradingView indicator reads it ----------
// The family runs lab/factory/wyld.js, a candle-by-candle copy of lab/pine/wyld_four_pillars.pine, so the factory tests
// the same rules the owner is alerted to live. The grid covers rules WYLD leaves open (lab queue: wyld-exact-rules):
// which pools count for the sweep (his 15m equal highs and lows only, or also the prior day's and the overnight highs
// and lows), which 1m confirmation is the entry (each alone, or any of them), the stop buffer and the break-even step.
// It's small on purpose: a grid grows only as the data grows (FACTORY.md). On 5-minute candles until 1-minute data
// arrives. Mechanical v0, a looser stand-in (prior-day and overnight pools only), ran on 19 Nov 2026 and is retired;
// its result is in the registry.

// ---------- N-candle breakout (Chart Wizard's 20-candle breakout; bot 3 is n 20, stopAtr 2, targetR 3, both, 2) ----------
function breakout(p) {
  const hs = [], ls = [];
  let atr = null, n = 0, prevC = null;
  return { name: 'N-candle breakout', tf: 15, maxTrades: p.maxTrades,
    bar(d, b, pos) {
      const tr = prevC === null ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - prevC), Math.abs(b.l - prevC));
      n++; atr = atr === null ? tr : atr + (tr - atr) / Math.min(n, 14); prevC = b.c;
      let sig = null;
      if (hs.length === p.n && !pos && b.m >= 30 && b.m <= 330) {
        const hh = Math.max(...hs), ll = Math.min(...ls), s = p.stopAtr * atr;
        if (b.c > hh && p.side !== 'short') sig = { dir: 1, stop: b.c - s, target: b.c + p.targetR * s };
        else if (b.c < ll && p.side !== 'long') sig = { dir: -1, stop: b.c + s, target: b.c - p.targetR * s };
      }
      hs.push(b.h); ls.push(b.l);
      if (hs.length > p.n) { hs.shift(); ls.shift(); }
      return sig;
    } };
}

// ---------- Opening range breakout (New York open breakout; bot 1 is rangeMin 15, cutoff 120, range stop, 2R, both) ----------
function orb(p) {
  let hi, lo;
  return { name: 'Opening range breakout', tf: 5, maxTrades: 1,
    day() { hi = -Infinity; lo = Infinity; },
    bar(d, b, pos) {
      if (b.m <= p.rangeMin) { hi = Math.max(hi, b.h); lo = Math.min(lo, b.l); return null; }
      if (pos || b.m > p.cutoffMin) return null;
      const mid = (hi + lo) / 2;
      if (b.c > hi && p.side !== 'short') { const stop = p.stop === 'range' ? lo : mid; return b.c > stop ? { dir: 1, stop, target: b.c + p.targetR * (b.c - stop) } : null; }
      if (b.c < lo && p.side !== 'long') { const stop = p.stop === 'range' ? hi : mid; return b.c < stop ? { dir: -1, stop, target: b.c - p.targetR * (stop - b.c) } : null; }
      return null;
    } };
}

// ---------- VWAP band fade (bot 10 is sd 2, stopBars 3, minRR 1, start 30, end 330, maxTrades 2) ----------
function vwapFade(p) {
  let last = [], wasAbove = false, wasBelow = false;
  return { name: 'VWAP band fade', tf: 5, maxTrades: p.maxTrades,
    day() { last = []; wasAbove = false; wasBelow = false; },
    bar(d, b, pos) {
      last.push(b);
      if (last.length > p.stopBars) last.shift();
      const up = d.vwap + p.sd * d.vsd, dn = d.vwap - p.sd * d.vsd;
      let sig = null;
      if (!pos && d.vsd > 0 && b.m >= p.start && b.m <= p.end) {
        if (wasAbove && b.c < up) {
          const stop = Math.max(...last.map((x) => x.h)) + d.tick, target = d.vwap;
          if (b.c - target >= p.minRR * (stop - b.c)) sig = { dir: -1, stop, target };
        } else if (wasBelow && b.c > dn) {
          const stop = Math.min(...last.map((x) => x.l)) - d.tick, target = d.vwap;
          if (target - b.c >= p.minRR * (b.c - stop)) sig = { dir: 1, stop, target };
        }
      }
      wasAbove = d.vsd > 0 && b.c > up;
      wasBelow = d.vsd > 0 && b.c < dn;
      return sig;
    } };
}

// ---------- Gap fade (bot 6 is minGap 0.002, maxGap 0.01, cutoff 120, target close) ----------
function gapFade(p) {
  return { name: 'Gap fade', tf: 5, maxTrades: 1,
    bar(d, b, pos) {
      if (pos) return b.m >= p.cutoff ? { exit: 'time' } : null;
      if (b.m !== 5 || !d.prevClose) return null;
      const gap = (d.open - d.prevClose) / d.prevClose;
      if (Math.abs(gap) < p.minGap || Math.abs(gap) > p.maxGap) return null;
      const target = p.target === 'close' ? d.prevClose : (d.open + d.prevClose) / 2;
      if (gap > 0 && b.c < b.o) { const stop = d.high + d.tick; return b.c - target >= stop - b.c ? { dir: -1, stop, target } : null; }
      if (gap < 0 && b.c > b.o) { const stop = d.low - d.tick; return target - b.c >= b.c - stop ? { dir: 1, stop, target } : null; }
      return null;
    } };
}

const FAMILIES = [
  { id: 'wyld', name: 'Your strategy: WYLD Will Four Pillars (as the indicator reads it)', registry: 'wyld-four-pillars', data: '5m', engine: 'wyld',
    needs: ['15', 'daily'],
    context: (bars, data) => ({ b15: data[15].bars, daily: data.daily.bars }),
    options: (p) => ({ ...p, usePdPools: p.pools !== 'eq', useOnPools: p.pools !== 'eq' }),
    grid: { pools: ['eq', 'eq+pd+on'], confirm: ['any', 'wick', 'retest', 'break', 'ifvg', 'fvgRetest'], stopBufTicks: [2, 4], be: ['none', '1R'] } },
  { id: 'wyld-1m', name: 'Your strategy on 1-minute candles (as the indicator reads it)', registry: 'wyld-four-pillars', data: '1m', engine: 'wyld',
    needs: ['15', 'daily'], minSessions: 10,
    context: (bars, data) => ({ b15: data[15].bars, daily: data.daily.bars }),
    options: (p) => ({ ...p, usePdPools: p.pools !== 'eq', useOnPools: p.pools !== 'eq' }),
    grid: { pools: ['eq', 'eq+pd+on'], confirm: ['any', 'wick', 'retest', 'break', 'ifvg', 'fvgRetest'], stopBufTicks: [2, 4], be: ['none', '1R'] } },
  { id: 'breakout', name: 'N-candle breakout', registry: 'app-20-candle-breakout', data: '15m', make: breakout,
    grid: { n: [10, 15, 20, 30, 40], stopAtr: [1, 1.5, 2, 2.5, 3], targetR: [1.5, 2, 3, 4], side: ['both', 'long', 'short'], maxTrades: [1, 2] } },
  { id: 'orb', name: 'Opening range breakout', registry: 'app-ny-open-breakout', data: '5m', make: orb,
    grid: { rangeMin: [5, 15, 30], cutoffMin: [60, 120, 180], stop: ['range', 'mid'], targetR: [1, 1.5, 2, 3, 5, 10], side: ['both', 'long', 'short'] } },
  { id: 'vwap-fade', name: 'VWAP band fade', registry: 'botlab-10', data: '5m', make: vwapFade,
    grid: { sd: [1.5, 2, 2.5, 3], stopBars: [2, 3, 5], minRR: [0.5, 1, 1.5], start: [30, 60], end: [180, 330], maxTrades: [1, 2, 3] } },
  { id: 'noise', name: 'Noise-area momentum', registry: 'botlab-12', data: '15m', engine: 'noise',
    grid: { lookbackDays: [7, 10, 14, 21], volatilityMultiplier: [0.8, 1, 1.2, 1.5], checkEvery: [30, 60] } },
  { id: 'gap-fade', name: 'Gap fade', registry: 'botlab-6', data: '5m', make: gapFade,
    grid: { minGap: [0.001, 0.002, 0.003], maxGap: [0.006, 0.01, 0.015], cutoff: [60, 120, 180], target: ['close', 'half'] } },
];

module.exports = { FAMILIES, makers: { breakout, orb, vwapFade, gapFade } };

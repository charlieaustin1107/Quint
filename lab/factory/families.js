'use strict';
// Quint Lab strategy factory: the strategy families and their variation grids.
//
// Each family is one idea with a fixed grid of variations, written down here BEFORE testing (pre-registered). The
// factory tests every variation the same way, on the bot lab's engine (next-candle fills, stop first if a candle hits
// both, $0.50 a side plus 1 tick of slippage on 1 MNQ, flat by 15:59 New York). Change a grid only in a dated commit,
// and never because of a result. Families come from strategies that showed something positive (see the registry).
// Nothing here is financial advice.

const { nyTime } = require('../../quint-control/proof/noise_momentum');

// ---------- your strategy: WYLD Will's Four Pillars, mechanical version 0 ----------
// What it can test today on 5-minute candles (no 1-minute data yet), as close to WYLD's rules as candles allow:
//   1 Sweep: a 5-minute candle trades through a liquidity pool: the prior day's high or low (PD), the overnight high or
//     low (ON), or either (both). Pools stand in for "the easiest 15m equal highs and lows", which aren't defined
//     exactly yet (lab queue: wyld-exact-rules).
//   2 Level holds: a close back inside the pool.
//   3 PDR bias: towards Point B, the nearest opposite pool beyond the entry; the "B" target needs at least 1R of room.
//   4 Confirmation, the part WYLD varies most, so it's the main thing tested:
//       reclaim  the close back inside is the entry ("can't get back below the swept lows")
//       break    after the reclaim, a close beyond the sweep candle ("a wick holds and price closes beyond it")
//       retest   after the reclaim, price comes back to the pool and closes back inside ("a held level breaks, then retests")
//       ifvg     a close through the most recent fair value gap against the sweep ("an FVG inverts")
//   Stop beyond the sweep extreme plus a buffer; target 1R, 2R, 3R or Point B; optional break-even after 1R; setups only
//   inside the window after the 9:30 open; one entry per sweep, at most maxEntries a day; a setup expires after an hour.
function overnightLevels(bars) {
  const out = new Map();
  let acc = null;
  for (const b of bars) {
    const { day, min } = nyTime(b.t);
    if (min >= 18 * 60) {
      if (!acc || acc.started !== day) acc = { started: day, h: -Infinity, l: Infinity };
      acc.h = Math.max(acc.h, b.h); acc.l = Math.min(acc.l, b.l);
    } else if (min < 9 * 60 + 30 && acc) {
      acc.h = Math.max(acc.h, b.h); acc.l = Math.min(acc.l, b.l);
      out.set(day, { h: acc.h, l: acc.l });
    }
  }
  return out;
}

function wyld(p, ctx) {
  let L = null, S = null, recent = [], fvgDown = [], fvgUp = [], be = null, onL = null, onH = null;
  const pools = (pd, on) => (p.pools === 'pd' ? [pd] : p.pools === 'on' ? [on] : [pd, on]).filter((x) => x !== null && x !== undefined && Number.isFinite(x));
  function track(st, dir, b, levels) {
    const swept = levels.filter((lv) => (dir > 0 ? b.l < lv : b.h > lv));
    if (swept.length) {
      const level = dir > 0 ? Math.min(...swept) : Math.max(...swept), ext = dir > 0 ? b.l : b.h;
      if (!st || st.done) st = { level, extreme: ext, bar: b, born: b.m, reclaimed: false, done: false };
      else if (dir > 0 ? ext < st.extreme : ext > st.extreme) { st.extreme = ext; st.bar = b; st.reclaimed = false; }
    }
    if (st && !st.done && b.m - st.born > 60) st.done = true; // no confirmation within an hour
    return st;
  }
  function confirm(st, dir, b, d, opposite) {
    if (!st || st.done) return null;
    const back = dir > 0 ? b.c > st.level : b.c < st.level;
    let go = false;
    if (p.confirm === 'ifvg') {
      const g = (dir > 0 ? fvgDown : fvgUp).filter((x) => x.m >= st.born - 30).pop();
      go = back && !!g && (dir > 0 ? b.c > g.top : b.c < g.bottom);
    } else if (!st.reclaimed) {
      if (back) { st.reclaimed = true; st.at = b.m; go = p.confirm === 'reclaim'; }
    } else if (p.confirm === 'break') {
      go = dir > 0 ? b.c > st.bar.h : b.c < st.bar.l;
    } else if (p.confirm === 'retest') {
      go = b.m > st.at && back && (dir > 0 ? b.l <= st.level + 2 * d.tick : b.h >= st.level - 2 * d.tick);
    }
    if (!go) return null;
    const stop = st.extreme - dir * p.stopTicks * d.tick, risk = Math.abs(b.c - stop);
    if (!(risk > 0)) return null;
    const beyond = opposite.filter((lv) => (dir > 0 ? lv > b.c : lv < b.c));
    const B = beyond.length ? (dir > 0 ? Math.min(...beyond) : Math.max(...beyond)) : null;
    let target;
    if (p.target === 'B') { if (B === null || Math.abs(B - b.c) < risk) return null; target = B; }
    else target = b.c + dir * Number(p.target.replace('R', '')) * risk;
    st.done = true;
    return { dir, stop, target };
  }
  return { name: 'WYLD Four Pillars v0', tf: 5, maxTrades: p.maxEntries,
    day(d) {
      L = null; S = null; recent = []; fvgDown = []; fvgUp = []; be = null;
      const on = ctx.overnight.get(d.day);
      onL = on ? on.l : null; onH = on ? on.h : null;
    },
    bar(d, b, pos, position) {
      recent.push(b);
      if (recent.length > 3) recent.shift();
      if (recent.length === 3) {
        const [a, , c] = recent;
        if (a.l > c.h) fvgDown.push({ m: b.m, top: a.l, bottom: c.h });
        if (a.h < c.l) fvgUp.push({ m: b.m, top: c.l, bottom: a.h });
      }
      if (position) { // in a trade: optional break-even once it has run 1R
        if (!be) be = { entry: position.entry, risk: Math.abs(position.entry - position.stop), moved: false };
        if (p.be === '1R' && !be.moved && (position.dir > 0 ? b.h >= be.entry + be.risk : b.l <= be.entry - be.risk)) { be.moved = true; return { stopTo: be.entry }; }
        return null;
      }
      be = null;
      if (b.m > p.window) return null;
      const lows = pools(d.prevLow, onL), highs = pools(d.prevHigh, onH);
      L = track(L, 1, b, lows);
      S = track(S, -1, b, highs);
      return confirm(L, 1, b, d, highs) || confirm(S, -1, b, d, lows);
    } };
}

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
  { id: 'wyld', name: 'Your strategy: WYLD Will Four Pillars (mechanical v0)', registry: 'wyld-four-pillars', data: '5m', make: wyld,
    context: (bars) => ({ overnight: overnightLevels(bars) }),
    grid: { pools: ['pd', 'on', 'both'], confirm: ['reclaim', 'break', 'retest', 'ifvg'], stopTicks: [1, 2, 4], target: ['1R', '2R', '3R', 'B'], be: ['none', '1R'], window: [120, 180], maxEntries: [1, 2] } },
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

module.exports = { FAMILIES, overnightLevels, makers: { wyld, breakout, orb, vwapFade, gapFade } };

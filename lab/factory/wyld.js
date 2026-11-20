'use strict';
// WYLD Will's Four Pillars, the same rules as the TradingView indicator (lab/pine/wyld_four_pillars.pine), replayed
// candle by candle on stored MNQ candles so the lab can test, dissect and learn from exactly what the indicator alerts.
//
//   ① Sweep: price trades through a pool that formed before the open: 15m equal highs or lows, plus (the owner's
//      choice, on by default) the prior day's high and low (from the 18:00 session open) and the overnight high and low
//      (from 9:30). Pools are marked as taken at any hour; only a sweep inside the window starts a stage.
//   ② HTF level holds: within the hold time, a candle trades into a monthly, weekly or daily level near the sweep and
//      closes back on the right side. That level is Point A.
//   ③ PDR bias: Point B is the next HTF level beyond Point A (or the next pool); Target 2 the opposing liquidity.
//   ④ Confirmation = entry: a wick holds and price closes beyond it, the level retest holds, a held level breaks, an FVG
//      inverts, or price trades into a new FVG and holds. Stop beyond the last 3 candles' wick; target Point B.
//   The stage ends at Point B, on a close through Point A, or when the window closes.
//
// Fills follow the bot lab's engine: the signal candle's close, filled at the next candle's open with 1 tick of
// slippage; stop first if a candle touches both; $0.50 a side; 1 MNQ; flat by the close; no new entries once the day
// has lost $500. Each trade carries a tag describing its setup, and how far it ran for and against (MFE, MAE).
// Ablations for the sequence analyst: skip 'sweep' | 'level' | 'pdr', noWindow. Nothing here is financial advice.

const { nyTime } = require('../../quint-control/proof/noise_momentum');

const DEFAULTS = {
  windowHours: 3, swingLen: 3, eqTicks: 8, lookbackDays: 3, onlyPremarket: true, usePdPools: true, useOnPools: true, // the owner's choice, 20 Nov 2026
  useMonthly: true, useWeekly: true, useDaily: true, overlapTicks: 8, reachTicks: 60, tolTicks: 4, minPdrTicks: 40, breakTicks: 8,
  holdMinutes: 30, confirm: 'any', sbLen: 5, fvgLookMinutes: 20, stopBufTicks: 2, minR: 1, maxEntries: 3, reentryMinutes: 5,
  be: 'none', skip: null, noWindow: false,
  tick: 0.25, pointValue: 2, commissionPerSide: 0.5, slippageTicks: 1, dailyLossLimit: 500,
};
const CONFIRMS = ['wick', 'retest', 'break', 'ifvg', 'fvgRetest'];
const NAMES = { wick: 'a wick held and price closed beyond it', retest: 'the HTF level retest held', break: 'a held level broke', ifvg: 'an FVG inverted', fvgRetest: 'price traded into a new FVG and held' };

// ---------- higher-timeframe levels for each trading day, in the indicator's order: monthly, weekly, then daily ----------
const tradeDate = (t) => nyTime(t + 6 * 3600).day; // a CME day starts 18:00 New York the evening before
function weekKey(date) { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }
function fvgWalk(bars) { // the most recent live bullish and bearish gap after each bar, as the indicator's fvgPrev keeps them
  let bT = null, bB = null, sT = null, sB = null;
  return bars.map((b, i) => {
    if (i >= 2 && b.l > bars[i - 2].h) { bT = b.l; bB = bars[i - 2].h; }
    if (i >= 2 && b.h < bars[i - 2].l) { sT = bars[i - 2].l; sB = b.h; }
    if (bB !== null && b.c < bB) { bT = null; bB = null; }
    if (sT !== null && b.c > sT) { sT = null; sB = null; }
    return { bT, bB, sT, sB };
  });
}
function levelsByDay(daily, p) {
  const days = daily.map((b) => ({ ...b, date: tradeDate(b.t) }));
  const weeks = [], months = new Map();
  for (const b of days) {
    const wk = weekKey(b.date), last = weeks[weeks.length - 1];
    if (!last || last.key !== wk) weeks.push({ key: wk, o: b.o, h: b.h, l: b.l, c: b.c }); else { last.h = Math.max(last.h, b.h); last.l = Math.min(last.l, b.l); last.c = b.c; }
    const mk = b.date.slice(0, 7), m = months.get(mk);
    if (!m) months.set(mk, { h: b.h, l: b.l }); else { m.h = Math.max(m.h, b.h); m.l = Math.min(m.l, b.l); }
  }
  const dF = fvgWalk(days), wF = fvgWalk(weeks), wIdx = new Map(weeks.map((w, i) => [w.key, i]));
  const monthKeys = [...months.keys()], tol = p.overlapTicks * p.tick, out = new Map();
  for (let i = 1; i < days.length; i++) {
    const D = days[i], P = days[i - 1], wi = wIdx.get(weekKey(D.date)), lv = [];
    const add = (price, name, rank) => { if (price === null || price === undefined || !Number.isFinite(price)) return; if (lv.some((x) => Math.abs(x.p - price) <= tol)) return; lv.push({ p: price, name, rank }); };
    const mi = monthKeys.indexOf(D.date.slice(0, 7));
    if (p.useMonthly && mi > 0) { const pm = months.get(monthKeys[mi - 1]); add(pm.h, 'Prior month high', 3); add(pm.l, 'Prior month low', 3); }
    if (p.useWeekly && wi > 0) {
      const pw = weeks[wi - 1], cw = weeks[wi];
      add(pw.h, 'Prior week high', 2); add(pw.l, 'Prior week low', 2);
      if (Math.abs(cw.o - pw.c) >= 2 * p.tick) { add(Math.max(cw.o, pw.c), 'NWOG top', 2); add(Math.min(cw.o, pw.c), 'NWOG bottom', 2); }
      const g = wF[wi - 1];
      if (g.bT !== null) { add(g.bT, 'Weekly FVG top', 2); add((g.bT + g.bB) / 2, 'Weekly FVG 50%', 2); add(g.bB, 'Weekly FVG bottom', 2); }
      if (g.sT !== null) { add(g.sT, 'Weekly FVG top', 2); add((g.sT + g.sB) / 2, 'Weekly FVG 50%', 2); add(g.sB, 'Weekly FVG bottom', 2); }
    }
    if (p.useDaily) {
      add(P.h, 'Prior day high', 1); add(P.l, 'Prior day low', 1);
      if (Math.abs(D.o - P.c) >= 2 * p.tick) { add(Math.max(D.o, P.c), 'NDOG top', 1); add(Math.min(D.o, P.c), 'NDOG bottom', 1); }
      const g = dF[i - 1];
      if (g.bT !== null) { add(g.bT, 'Daily FVG top', 1); add((g.bT + g.bB) / 2, 'Daily FVG 50%', 1); add(g.bB, 'Daily FVG bottom', 1); }
      if (g.sT !== null) { add(g.sT, 'Daily FVG top', 1); add((g.sT + g.sB) / 2, 'Daily FVG 50%', 1); add(g.sB, 'Daily FVG bottom', 1); }
      add(P.h - (P.h - Math.max(P.o, P.c)) / 2, 'Prior day upper wick 50%', 1);
      add(P.l + (Math.min(P.o, P.c) - P.l) / 2, 'Prior day lower wick 50%', 1);
    }
    out.set(D.date, { levels: lv, pdh: P.h, pdl: P.l });
  }
  return out;
}

// ---------- 15m swing highs and lows, each with the moment the indicator would first see it ----------
function swingEvents(b15, L) {
  const ev = [];
  for (let k = 2 * L + 1; k < b15.length; k++) {
    const c = k - 1 - L, x = b15[c];
    let hi = true, lo = true;
    for (let j = c - L; j <= c + L; j++) { if (j === c) continue; if (b15[j].h >= x.h) hi = false; if (b15[j].l <= x.l) lo = false; }
    const at = b15[k - 1].t + 900;
    if (hi) ev.push({ at, dir: 1, price: x.h, time: x.t });
    if (lo) ev.push({ at, dir: -1, price: x.l, time: x.t });
  }
  return ev.sort((a, b) => a.at - b.at);
}

// The same candles give the same levels and swings for every variation, so work them out once.
const CACHE = new WeakMap();
function cached(owner, key, make) {
  let m = CACHE.get(owner);
  if (!m) { m = new Map(); CACHE.set(owner, m); }
  if (!m.has(key)) m.set(key, make());
  return m.get(key);
}

// ---------- the replay ----------
function run(bars, b15, daily, opt = {}) {
  const p = { ...DEFAULTS, ...opt };
  const tf = bars.length > 1 ? Math.round((bars[1].t - bars[0].t) / 60) : 5;
  const tk = p.tick, tol = p.tolTicks * tk, slip = p.slippageTicks * tk, lookS = p.lookbackDays * 86400;
  const confirms = p.confirm === 'any' ? CONFIRMS : (Array.isArray(p.confirm) ? p.confirm : [p.confirm]);
  const holdBars = Math.max(1, Math.ceil(p.holdMinutes / tf)), reentryBars = Math.max(1, Math.ceil(p.reentryMinutes / tf)), fvgLook = Math.max(1, Math.ceil(p.fvgLookMinutes / tf));
  const levels = cached(daily, 'lv' + [p.overlapTicks, p.useMonthly, p.useWeekly, p.useDaily, p.tick].join(), () => levelsByDay(daily, p));
  const events = cached(b15, 'sw' + p.swingLen, () => swingEvents(b15, p.swingLen));
  const funnel = { sweeps: 0, sweepKinds: {}, takenOvernight: 0, holds: 0, noHold: 0, pdrs: 0, noPointB: 0, confirmations: 0, skippedInTrade: 0, lowRoom: 0, entries: 0, completeB: 0, broken: 0, expired: 0 };
  const swings = { 1: [], [-1]: [] }, pools = [];
  // kind: EQH / EQL (15m equal highs or lows), PDH / PDL (prior day), ONH / ONL (overnight), as the indicator labels them
  const addPool = (level, dir, t, kind, touches) => {
    const hit = pools.find((x) => x.dir === dir && !x.swept && Math.abs(x.p - level) <= p.eqTicks * tk);
    if (hit) { hit.p = dir === 1 ? Math.max(hit.p, level) : Math.min(hit.p, level); hit.n++; if (!hit.kind.includes(kind)) hit.kind += '/' + kind; return; }
    pools.push({ p: level, dir, t, swept: false, n: touches, kind });
    if (pools.length > 60) pools.shift();
  };
  const addSwing = (e) => {
    const list = swings[e.dir];
    for (let i = list.length - 1; i >= Math.max(0, list.length - 12); i--) {
      const q = list[i];
      if (Math.abs(e.price - q.price) <= p.eqTicks * tk && e.time - q.time <= lookS) { addPool(e.dir === 1 ? Math.max(e.price, q.price) : Math.min(e.price, q.price), e.dir, e.time, e.dir === 1 ? 'EQH' : 'EQL', 2); break; }
    }
    list.push(e);
    if (list.length > 40) list.shift();
  };
  const mk = (dir) => ({ dir, step: 0 });
  const st = { 1: mk(1), [-1]: mk(-1) };
  const trades = [];
  let ei = 0, winStart = null, onH = null, onL = null, wasON = false, wasIn = false, pos = null, pending = null, dayKey = null, dayPnl = 0;
  let cfBu = null, cfBe = null; // the latest bullish and bearish chart gaps: { top, bot, i }
  const winEnd = 570 + Math.round(p.windowHours * 60);
  const closePos = (price, why, b, i) => {
    const usd = (price - pos.entry) * pos.dir * p.pointValue - 2 * p.commissionPerSide;
    trades.push({ day: pos.day, dir: pos.dir, entry: pos.entry, exit: price, why, usd, risk: pos.risk, r: usd / (pos.risk * p.pointValue), mfe: pos.mfe / pos.risk, mae: pos.mae / pos.risk, mins: (b.t - pos.t) / 60, tag: pos.tag });
    dayPnl += usd; pos = null;
  };
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i], { day, min } = nyTime(b.t), dow = new Date(day + 'T12:00:00Z').getUTCDay(), weekday = dow >= 1 && dow <= 5;
    const rth = weekday && min >= 570 && min < 960;
    const inWindow = weekday && min >= 570 && (p.noWindow ? min < 930 : min < winEnd);
    if (day !== dayKey) { dayKey = day; dayPnl = 0; }
    const td = tradeDate(b.t), L = levels.get(td), lv = L ? L.levels : [];
    // the indicator learns of new 15m swings as each 15m candle completes
    while (ei < events.length && events[ei].at <= b.t) addSwing(events[ei++]);
    const isON = min >= 1080 || min < 570;
    if (inWindow && !wasIn) {
      winStart = b.t;
      if (p.useOnPools && onH !== null) { addPool(onL, -1, b.t - 60, 'ONL', 1); addPool(onH, 1, b.t - 60, 'ONH', 1); } // known at 9:30
    }
    // the prior day's high and low join when the session opens at 18:00, so a run overnight counts as already taken
    if (isON && !wasON && p.usePdPools && L) { addPool(L.pdl, -1, b.t - 60, 'PDL', 1); addPool(L.pdh, 1, b.t - 60, 'PDH', 1); }
    if (isON && !wasON) { onH = b.h; onL = b.l; } else if (isON) { onH = Math.max(onH, b.h); onL = Math.min(onL, b.l); }
    wasON = isON;
    // fill an order from the last candle, then the stop and target inside this candle (the stop first)
    if (pending && pending.exit && pos) closePos(b.o - pos.dir * slip, pending.exit, b, i);
    if (pending && pending.dir && !pos) {
      const entry = b.o + pending.dir * slip;
      pos = { dir: pending.dir, entry, stop: pending.stop, target: pending.target, risk: Math.abs(entry - pending.stop), mfe: 0, mae: 0, t: b.t, day, tag: pending.tag, be: false };
      if (!(pos.risk > 0)) pos = null;
    }
    pending = null;
    if (pos) {
      pos.mfe = Math.max(pos.mfe, pos.dir > 0 ? b.h - pos.entry : pos.entry - b.l);
      pos.mae = Math.max(pos.mae, pos.dir > 0 ? pos.entry - b.l : b.h - pos.entry);
      if (pos.dir > 0) {
        if (b.l <= pos.stop) closePos(Math.min(b.o, pos.stop) - slip, pos.be ? 'break-even' : 'stop', b, i);
        else if (pos.target !== null && b.h >= pos.target) closePos(Math.max(b.o, pos.target), 'target', b, i);
      } else if (b.h >= pos.stop) closePos(Math.max(b.o, pos.stop) + slip, pos.be ? 'break-even' : 'stop', b, i);
      else if (pos.target !== null && b.l <= pos.target) closePos(Math.min(b.o, pos.target), 'target', b, i);
      if (pos && p.be !== 'none' && !pos.be) { // break-even from the next candle once it has run far enough
        const k = p.be === '0.5R' ? 0.5 : 1;
        if (pos.mfe >= k * pos.risk) { pos.stop = pos.entry; pos.be = true; }
      }
    }
    // chart gaps and the recent swing, for the confirmations
    if (i >= 2 && b.l > bars[i - 2].h) cfBu = { top: b.l, bot: bars[i - 2].h, i };
    if (i >= 2 && b.h < bars[i - 2].l) cfBe = { top: bars[i - 2].l, bot: b.h, i };
    let hhPrev = -Infinity, llPrev = Infinity;
    for (let j = Math.max(0, i - p.sbLen); j < i; j++) { hhPrev = Math.max(hhPrev, bars[j].h); llPrev = Math.min(llPrev, bars[j].l); }
    const lo3 = Math.min(b.l, i > 0 ? bars[i - 1].l : b.l, i > 1 ? bars[i - 2].l : b.l), hi3 = Math.max(b.h, i > 0 ? bars[i - 1].h : b.h, i > 1 ? bars[i - 2].h : b.h);
    // pools taken on this candle, at any hour; only a sweep inside the window can start a stage
    const taken = { 1: [], [-1]: [] };
    for (const q of pools) {
      if (q.swept || !(q.dir === -1 ? b.l < q.p : b.h > q.p)) continue;
      q.swept = true;
      const eligible = b.t - q.t <= lookS && (!p.onlyPremarket || (winStart !== null && q.t <= winStart));
      if (inWindow && eligible) taken[-q.dir].push(q); else if (!inWindow) funnel.takenOvernight++;
    }
    const canEnter = !pos && rth && min + 2 * tf < 960 && dayPnl > -p.dailyLossLimit && i + 1 < bars.length; // the bot lab's last entry
    for (const d of [1, -1]) {
      const s = st[d];
      // ① sweep (or, with skip 'sweep', price simply trading into an HTF level)
      if (s.step === 0 && inWindow) {
        let start = null;
        if (p.skip === 'sweep') { const near = lv.filter((x) => (d === 1 ? b.l <= x.p + tol && b.l > x.p - p.reachTicks * tk : b.h >= x.p - tol && b.h < x.p + p.reachTicks * tk)); if (near.length) start = { p: d === 1 ? Math.max(...near.map((x) => x.p)) : Math.min(...near.map((x) => x.p)), n: 0, kind: 'HTF level' }; }
        else if (taken[d].length) { const q = taken[d].reduce((a, x) => (d === 1 ? (x.p < a.p ? x : a) : (x.p > a.p ? x : a))); start = { p: q.p, n: q.n, kind: q.kind }; }
        if (start) {
          Object.assign(s, { step: 1, pool: start.p, poolN: start.n, poolKind: start.kind, extreme: d === 1 ? b.l : b.h, extremeI: i, wickEdge: d === 1 ? b.h : b.l, sweepI: i, sweepMin: min, entries: 0, lastEntryI: null, usedWick: false, usedBreak: false });
          funnel.sweeps++;
          funnel.sweepKinds[start.kind] = (funnel.sweepKinds[start.kind] || 0) + 1;
        }
      }
      // ② an HTF level near the sweep holds (with skip 'level', a close back beyond the swept pool)
      if (s.step === 1) {
        if (d === 1 ? b.l < s.extreme : b.h > s.extreme) { s.extreme = d === 1 ? b.l : b.h; s.extremeI = i; s.wickEdge = d === 1 ? b.h : b.l; }
        let A = null;
        if (p.skip === 'level') { if (d === 1 ? b.c > s.pool : b.c < s.pool) A = { p: s.pool, name: 'Swept pool', rank: 0 }; }
        else for (const x of lv) {
          const near = Math.abs(x.p - s.extreme) <= p.reachTicks * tk, held = d === 1 ? b.l <= x.p + tol && b.c > x.p : b.h >= x.p - tol && b.c < x.p;
          if (near && held && (!A || (d === 1 ? x.p > A.p : x.p < A.p))) A = x;
        }
        if (A) { Object.assign(s, { step: 2, A: A.p, aName: A.name, aRank: A.rank, heldI: i, holdMin: min }); funnel.holds++; }
        else if (i - s.sweepI > holdBars || !inWindow) { funnel.noHold++; st[d] = mk(d); continue; }
      }
      // ③ the PDR: Point B (with skip 'pdr', no Point B: a fixed 2R target)
      if (s.step === 2) {
        let B = null, bName = '', T2 = null;
        if (p.skip !== 'pdr') {
          for (const x of lv) if ((d === 1 ? x.p > s.A + p.minPdrTicks * tk : x.p < s.A - p.minPdrTicks * tk) && (B === null || (d === 1 ? x.p < B : x.p > B))) { B = x.p; bName = x.name; }
          for (const q of pools) {
            if (q.dir !== d || q.swept || !(d === 1 ? q.p > s.A + p.minPdrTicks * tk : q.p < s.A - p.minPdrTicks * tk)) continue;
            if (B === null) { B = q.p; bName = q.kind; } else if ((d === 1 ? q.p > B : q.p < B) && (T2 === null || (d === 1 ? q.p < T2 : q.p > T2))) T2 = q.p;
          }
          if (B === null) { funnel.noPointB++; st[d] = mk(d); continue; }
        }
        Object.assign(s, { step: 3, B, bName, T2 }); funnel.pdrs++;
      }
      // ④ confirmations, and the end of the stage
      if (s.step === 3) {
        const reachedB = s.B !== null && (d === 1 ? b.h >= s.B : b.l <= s.B), broken = d === 1 ? b.c < s.A - p.breakTicks * tk : b.c > s.A + p.breakTicks * tk;
        if (reachedB || broken) { funnel[reachedB ? 'completeB' : 'broken']++; st[d] = mk(d); continue; }
        if (!inWindow) { funnel.expired++; st[d] = mk(d); continue; }
        if (s.entries >= p.maxEntries || i <= s.heldI || (s.lastEntryI !== null && i - s.lastEntryI < reentryBars)) continue;
        let c = null;
        for (const k of confirms) {
          if (k === 'wick' && !s.usedWick && i > s.extremeI && (d === 1 ? b.c > s.wickEdge : b.c < s.wickEdge)) { c = k; break; }
          if (k === 'retest' && (d === 1 ? b.l <= s.A + tol && b.c > s.A : b.h >= s.A - tol && b.c < s.A)) { c = k; break; }
          if (k === 'break' && !s.usedBreak && (d === 1 ? b.c > hhPrev : b.c < llPrev)) { c = k; break; }
          if (k === 'ifvg' && (d === 1 ? cfBe && cfBe.i >= s.sweepI - fvgLook && b.c > cfBe.top : cfBu && cfBu.i >= s.sweepI - fvgLook && b.c < cfBu.bot)) { c = k; break; }
          if (k === 'fvgRetest' && (d === 1 ? cfBu && cfBu.i > s.heldI && cfBu.i < i && b.l <= cfBu.top && b.c > cfBu.bot : cfBe && cfBe.i > s.heldI && cfBe.i < i && b.h >= cfBe.bot && b.c < cfBe.top)) { c = k; break; }
        }
        if (!c) continue;
        funnel.confirmations++;
        const stop = d === 1 ? lo3 - p.stopBufTicks * tk : hi3 + p.stopBufTicks * tk, risk = Math.abs(b.c - stop);
        const target = s.B === null ? b.c + d * 2 * risk : s.B, rB = risk > 0 ? Math.abs(target - b.c) / risk : 0;
        if (!(risk > 0) || (s.B !== null && (d === 1 ? b.c >= s.B : b.c <= s.B)) || rB < p.minR) { funnel.lowRoom++; continue; }
        if (!canEnter || pending) { funnel.skippedInTrade++; continue; }
        s.entries++; s.lastEntryI = i;
        if (c === 'wick') s.usedWick = true;
        if (c === 'break') s.usedBreak = true;
        const mid = s.B === null ? null : (s.A + s.B) / 2;
        pending = { dir: d, stop: Math.round(stop / tk) * tk, target: Math.round(target / tk) * tk, tag: {
          confirm: c, poolKind: s.poolKind, poolTouches: s.poolN, sweepMin: s.sweepMin - 570, levelName: s.aName, levelRank: s.aRank, holdMins: (s.holdMin - s.sweepMin),
          pointB: s.bName || 'fixed 2R', pdrPoints: s.B === null ? null : Math.abs(s.B - s.A), roomR: rB, entryMin: min - 570, entryNo: s.entries,
          pastMid: mid === null ? null : (d === 1 ? b.c > mid : b.c < mid), stopTicks: Math.round(risk / tk), side: d === 1 ? 'long' : 'short' } };
        funnel.entries++;
      }
    }
    // flat by the close: out at the open of the last candle before 16:00
    if (pos && rth && min + 2 * tf >= 960 && !pending) pending = { exit: 'close' };
    if (pos && i + 1 === bars.length) closePos(b.c - pos.dir * slip, 'close', b, i);
    wasIn = inWindow;
  }
  return { trades, funnel, tf };
}

module.exports = { run, levelsByDay, swingEvents, tradeDate, DEFAULTS, CONFIRMS, NAMES };

"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const INST = DATA.inst;
const SYMS = ["BTC", "ES", "NQ", "CL", "GC"];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const dayNum = d => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd) / 86400000; };
for (const k of SYMS) {
  const I = INST[k];
  I.n = I.d.length; I.idx = {}; I.d.forEach((d, i) => I.idx[d] = i);
  I.rollSet = new Set(I.rolls);
  I.sess = I.tz === "ET" ? [-360, 1380] : [0, 1440];
  I.ss = I.d.map(d => dayNum(d) * 1440 + I.sess[0]);
  I.se = I.ss.map(s => s + I.sess[1]);
  I.N5 = I.sess[1] / 5;
  I.logo = { BTC: "₿", ES: "ES", NQ: "NQ", CL: "CL", GC: "Au" }[k];
}
const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

/* ---------- formatting ---------- */
const tdate = m => new Date(m * 60000);
const p2 = x => String(x).padStart(2, "0");
const fHM = m => { const x = tdate(m); return p2(x.getUTCHours()) + ":" + p2(x.getUTCMinutes()); };
const fDay = s => { const x = new Date(dayNum(s) * 86400000); return `${DOW[x.getUTCDay()]} ${x.getUTCDate()} ${MON[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
const fDayS = s => { const x = new Date(dayNum(s) * 86400000); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]}`; };
const fWall = m => { const x = tdate(m); return `${DOW[x.getUTCDay()]} ${x.getUTCDate()} ${MON[x.getUTCMonth()]} ${x.getUTCFullYear()} ${fHM(m)}`; };
const fWallS = m => { const x = tdate(m); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]} ${fHM(m)}`; };
const NF = {}; // number formatters are slow to create, so make each one once
const nf = k => NF[k] || (NF[k] = new Intl.NumberFormat("en-US", { minimumFractionDigits: k, maximumFractionDigits: k }));
const fnum = (I, x, d) => nf(d == null ? I.dec : d).format(x);
const fp = (I, x) => (I.money ? "$" : "") + fnum(I, x);
const fusd = x => (x < 0 ? "−" : x > 0 ? "+" : "") + "$" + nf(0).format(Math.abs(Math.round(x)));
const fbal = x => "$" + nf(0).format(Math.round(x));
const fpct = (x, d = 1) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(d) + "%";
const fabs = (x, d = 1) => Math.abs(x).toFixed(d) + "%";
const fx = (x, d = 1) => Math.abs(x).toFixed(d) + "×";
const fvol = v => v == null ? "—" : v >= 1e9 ? (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? (v / 1e6).toFixed(2) + "M" : v >= 1e3 ? (v / 1e3).toFixed(1) + "K" : String(Math.round(v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ================= TIMEFRAMES ================= */
const TF = { "1m": 1, "5m": 5, "15m": 15, "1h": 60, "4h": 240, "1D": "D", "1W": "W", "1M": "M" };
const TF_LIST = ["1m", "5m", "15m", "1h", "4h", "1D", "1W", "1M"];
const INTRA_DAYS = { "1m": 2, "5m": 4, "15m": 10, "1h": 30, "4h": 90 };
const isIntra = tf => typeof TF[tf] === "number";
const tfDur = tf => isIntra(tf) ? TF[tf] : tf === "1D" ? 1440 : tf === "1W" ? 10080 : 43800;
const tfWord = (tf, n) => { const u = { "1m": "1-minute", "5m": "5-minute", "15m": "15-minute", "1h": "1-hour", "4h": "4-hour", "1D": "daily", "1W": "weekly", "1M": "monthly" }[tf]; return n == null ? u : `${n} ${u} candle${n === 1 ? "" : "s"}`; };
const barWord = tf => ({ "1m": "minute", "5m": "5-min bar", "15m": "15-min bar", "1h": "hour", "4h": "4-hour bar", "1D": "day", "1W": "week", "1M": "month" }[tf]);

/* ================= SIMULATED INTRADAY (from the real daily candle) ================= */
function hash32(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(rnd) { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); }
// typical intraday volatility by wall-clock hour (ET for CME/NYMEX/COMEX, UTC for Bitcoin)
function volw(sym, m) {
  const h = (((m % 1440) + 1440) % 1440) / 60;
  if (sym === "ES" || sym === "NQ") return h >= 9.5 && h < 10.5 ? 1.75 : h >= 10.5 && h < 15 ? 1.0 : h >= 15 && h < 16 ? 1.3 : h >= 16 && h < 17 ? 0.55 : h >= 8.5 && h < 9.5 ? 1.05 : h >= 3 && h < 8.5 ? 0.62 : 0.42;
  if (sym === "CL") return h >= 9 && h < 10.5 ? 1.6 : h >= 10.5 && h < 14.5 ? 1.05 : h >= 3 && h < 9 ? 0.72 : 0.45;
  if (sym === "GC") return h >= 8.33 && h < 10.5 ? 1.5 : h >= 10.5 && h < 13.5 ? 1.0 : h >= 3 && h < 8.33 ? 0.8 : 0.45;
  return h >= 13.5 && h < 17 ? 1.3 : h >= 7 && h < 13.5 ? 0.95 : h >= 17 && h < 21 ? 1.0 : 0.75;
}
const DAYCACHE = new Map();
// Builds a price path of n steps that starts at O, ends at C and touches exactly H and L.
// walk(W) fills a raw random path; the best-shaped of several tries is mapped onto the real candle.
function bridge(rnd, O, H, L, C, n, walk, tick, maxAtt) {
  const W = new Float64Array(n + 1), eps = 1e-9 * Math.max(1, Math.abs(H));
  const tOH = H - O <= eps, tOL = O - L <= eps, tCH = H - C <= eps, tCL = C - L <= eps, flat = H - L <= eps;
  let imin = 0, imax = 0, wmin = 0, wmax = 0, best = null;
  for (let attempt = 0; attempt < maxAtt && !flat; attempt++) {
    walk(W);
    if (tOH && !tOL) { const a = W[0]; for (let q = 0; q <= n; q++) W[q] = -Math.abs(W[q] - a); }
    else if (tOL && !tOH) { const a = W[0]; for (let q = 0; q <= n; q++) W[q] = Math.abs(W[q] - a); }
    else if (tCH && !tCL) { const a = W[n]; for (let q = 0; q <= n; q++) W[q] = -Math.abs(W[q] - a); }
    else if (tCL && !tCH) { const a = W[n]; for (let q = 0; q <= n; q++) W[q] = Math.abs(W[q] - a); }
    if (Math.abs(C - O) <= eps) { const d = W[n] - W[0]; for (let q = 0; q <= n; q++) W[q] -= d * q / n; }
    else if ((C > O) !== (W[n] > W[0])) for (let q = 0; q <= n; q++) W[q] = -W[q];
    wmin = Infinity; wmax = -Infinity;
    for (let q = 0; q <= n; q++) { if (W[q] < wmin) { wmin = W[q]; imin = q; } if (W[q] > wmax) { wmax = W[q]; imax = q; } }
    let ok = wmax - wmin > 0;
    const inO = O > L + eps && O < H - eps, inC = C > L + eps && C < H - eps;
    if (inO && (imin === 0 || imax === 0)) ok = false;
    if (inC && (imin === n || imax === n)) ok = false;
    if ((C > O + eps) && !(W[n] > W[0])) ok = false;
    if ((C < O - eps) && !(W[n] < W[0])) ok = false;
    if (!ok) continue;
    const kn = [[wmin, L], [W[0], O], [W[n], C], [wmax, H]].sort((a, b) => a[0] - b[0] || a[1] - b[1]); const sl = [];
    for (let j = 0; j < 3; j++) { const dx = kn[j + 1][0] - kn[j][0], dy = kn[j + 1][1] - kn[j][1]; if (dx > 1e-12 && dy > eps) sl.push(dy / dx); }
    const score = sl.length > 1 ? Math.max(...sl) / Math.min(...sl) : 1;
    if (!best || score < best.score) best = { score, W: W.slice(), imin, imax, wmin, wmax };
    if (score < 3) break;
  }
  const p = new Float64Array(n + 1);
  if (flat || !best) { for (let q = 0; q <= n; q++) p[q] = O + (C - O) * q / n; imax = Math.round(n / 3); imin = Math.round(2 * n / 3); if (flat) { imax = 0; imin = 0; } }
  else {
    W.set(best.W); imin = best.imin; imax = best.imax; wmin = best.wmin; wmax = best.wmax;
    const kn = [[wmin, L], [W[0], O], [W[n], C], [wmax, H]].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (let q = 0; q <= n; q++) {
      const w = W[q]; let y = kn[0][1];
      for (let j = 0; j < 3; j++) { const [x0, y0] = kn[j], [x1, y1] = kn[j + 1]; if (w >= x0 && w <= x1) { y = x1 - x0 > 0 ? y0 + (y1 - y0) * (w - x0) / (x1 - x0) : y1; break; } if (w > x1) y = y1; }
      p[q] = y;
    }
  }
  for (let q = 0; q <= n; q++) p[q] = clamp(Math.round(p[q] / tick) * tick, L, H);
  p[imax] = H; p[imin] = L; p[0] = O; p[n] = C;
  if (!flat && (imax === 0 || imax === n) && Math.max(O, C) < H) p[Math.max(1, Math.round(n / 2))] = H;
  if (!flat && (imin === 0 || imin === n) && Math.min(O, C) > L) p[Math.min(n - 1, Math.round(n / 2) + 1)] = L;
  return p;
}
function barsFrom(p, N, M) {
  const o = new Float64Array(N), h = new Float64Array(N), l = new Float64Array(N), c = new Float64Array(N);
  for (let k = 0; k < N; k++) { const a = k * M; o[k] = p[a]; c[k] = p[a + M]; let hi = -Infinity, lo = Infinity; for (let q = a; q <= a + M; q++) { if (p[q] > hi) hi = p[q]; if (p[q] < lo) lo = p[q]; } h[k] = hi; l[k] = lo; }
  return { o, h, l, c };
}
function genDay(I, di) {
  const key = I.sym + di; let P = DAYCACHE.get(key); if (P) return P;
  const N = I.N5, M = 4, n = N * M;
  const rnd = mulberry32(hash32(I.sym + "|" + I.d[di]));
  const wts = new Float64Array(N); for (let k = 0; k < N; k++) wts[k] = volw(I.sym, I.ss[di] + k * 5);
  const walk = W => { let ls = 0; W[0] = 0; for (let k = 0; k < N; k++) { ls = 0.96 * ls + 0.14 * gauss(rnd); const s = wts[k] * Math.exp(ls), jump = rnd() < 0.003 ? gauss(rnd) * 5 * s : 0; for (let j = 0; j < M; j++) { const q = k * M + j + 1; W[q] = W[q - 1] + gauss(rnd) * s + (j === 0 ? jump : 0); } } };
  const p = bridge(rnd, I.o[di], I.h[di], I.l[di], I.c[di], n, walk, I.tick, 24);
  const b = barsFrom(p, N, M), v = new Float64Array(N);
  let sabs = 0; for (let k = 0; k < N; k++) sabs += Math.abs(b.c[k] - b.o[k]);
  const V = I.v[di], hasV = V != null;
  if (hasV) { let tot = 0; const mabs = sabs / N || 1; for (let k = 0; k < N; k++) { v[k] = Math.pow(wts[k], 1.4) * (0.45 + (b.h[k] - b.l[k]) / mabs * 0.6) * Math.exp(0.35 * gauss(rnd)); tot += v[k]; } for (let k = 0; k < N; k++) v[k] = v[k] / tot * V; }
  P = { o: b.o, h: b.h, l: b.l, c: b.c, v, hasV };
  DAYCACHE.set(key, P); if (DAYCACHE.size > 900) DAYCACHE.delete(DAYCACHE.keys().next().value);
  return P;
}
// 1-minute candles: generated inside each simulated 5-minute candle, so they add up to it exactly
const DAY1 = new Map();
function genDay1m(I, di) {
  const key = I.sym + di; let P = DAY1.get(key); if (P) return P;
  const P5 = genDay(I, di), N5 = I.N5, N = N5 * 5, M = 4, rnd = mulberry32(hash32(I.sym + "|1m|" + I.d[di]));
  const o = new Float64Array(N), h = new Float64Array(N), l = new Float64Array(N), c = new Float64Array(N), v = new Float64Array(N);
  const walk = W => { let ls = 0; W[0] = 0; for (let q = 1; q < W.length; q++) { if ((q - 1) % M === 0) ls = 0.8 * ls + 0.3 * gauss(rnd); W[q] = W[q - 1] + gauss(rnd) * Math.exp(ls); } };
  for (let k = 0; k < N5; k++) {
    const p = bridge(rnd, P5.o[k], P5.h[k], P5.l[k], P5.c[k], 5 * M, walk, I.tick, 10), b = barsFrom(p, 5, M);
    let tw = 0; const w = [];
    for (let j = 0; j < 5; j++) { const x = k * 5 + j; o[x] = b.o[j]; h[x] = b.h[j]; l[x] = b.l[j]; c[x] = b.c[j]; w.push((0.5 + (b.h[j] - b.l[j]) / ((P5.h[k] - P5.l[k]) || 1)) * Math.exp(0.3 * gauss(rnd))); tw += w[j]; }
    if (P5.hasV) for (let j = 0; j < 5; j++) v[k * 5 + j] = P5.v[k] * w[j] / tw;
  }
  P = { o, h, l, c, v, hasV: P5.hasV };
  DAY1.set(key, P); if (DAY1.size > 40) DAY1.delete(DAY1.keys().next().value);
  return P;
}

/* ================= SERIES BUILDER =================
   Every chart is built up to a cut-off time, so no timeframe can ever show the future.
   The candle that contains the cut-off is built only from the minutes before it. */
function dayAt(I, tc) { let lo = 0, hi = I.n - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (I.ss[m] < tc) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
function weekKey(I, di) { const dn = dayNum(I.d[di]); return dn - ((dn + 4 + 6) % 7); }
function newSeries(I, tf) { return { I, tf, ts: [], te: [], o: [], h: [], l: [], c: [], v: [], di: [], brk: [], ds: [], n: 0, partial: false }; }
function pushBar(S, ts, te, o, h, l, c, v, di, brk, ds) { S.ts.push(ts); S.te.push(te); S.o.push(o); S.h.push(h); S.l.push(l); S.c.push(c); S.v.push(v); S.di.push(di); S.brk.push(!!brk); S.ds.push(!!ds); }
function aggDay(I, di, kEnd) { // aggregate 5m bars [0, kEnd) of day di
  const P = genDay(I, di); let h = -Infinity, l = Infinity, v = 0;
  for (let k = 0; k < kEnd; k++) { if (P.h[k] > h) h = P.h[k]; if (P.l[k] < l) l = P.l[k]; v += P.v[k]; }
  return { o: P.o[0], h, l, c: P.c[kEnd - 1], v: P.hasV ? v : null };
}
function dayBar(I, di, tc) { // real daily candle, or partial if the cut-off falls inside the session
  if (tc >= I.se[di]) return { o: I.o[di], h: I.h[di], l: I.l[di], c: I.c[di], v: I.v[di], part: false };
  const k = Math.floor((tc - I.ss[di]) / 5); if (k <= 0) return null;
  const a = aggDay(I, di, Math.min(I.N5, k)); a.part = true; return a;
}
function intraStart(I, tf, tc) { const dc = dayAt(I, tc); return Math.max(0, dc - INTRA_DAYS[tf] + 1); }
function buildSeries(I, tf, tc, startDay) {
  const S = newSeries(I, tf); const dc = dayAt(I, tc);
  if (dc >= 0) {
    if (tf === "1D") {
      for (let di = 0; di <= dc; di++) { const b = dayBar(I, di, tc); if (!b) continue; pushBar(S, I.ss[di], I.se[di], b.o, b.h, b.l, b.c, b.v, di, I.rollSet.has(di), true); if (b.part) S.partial = true; }
    } else if (tf === "1W" || tf === "1M") {
      let cur = null, key = null;
      const flush = () => { if (cur) pushBar(S, cur.ts, cur.te, cur.o, cur.h, cur.l, cur.c, cur.v, cur.di, cur.brk, true); };
      for (let di = 0; di <= dc; di++) {
        const b = dayBar(I, di, tc); if (!b) continue;
        const k = tf === "1W" ? weekKey(I, di) : I.d[di].slice(0, 7);
        if (k !== key) { flush(); key = k; cur = { ts: I.ss[di], te: I.se[di], o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, di, brk: false }; }
        else { cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; cur.te = I.se[di]; cur.di = di; cur.v = cur.v == null || b.v == null ? null : cur.v + b.v; if (I.rollSet.has(di)) cur.brk = true; }
        if (b.part) S.partial = true;
      }
      flush();
    } else {
      const m = TF[tf], r = m === 1 ? 1 : 5, b5 = m / r, d0 = startDay != null ? startDay : intraStart(I, tf, tc);
      for (let di = Math.max(0, d0); di <= dc; di++) {
        const P = r === 1 ? genDay1m(I, di) : genDay(I, di), N = I.sess[1] / r, kc = Math.min(N, Math.floor((tc - I.ss[di]) / r));
        for (let k0 = 0; k0 < N && k0 < kc; k0 += b5) {
          const k1 = Math.min(N, k0 + b5), ke = Math.min(k1, kc);
          let h = -Infinity, l = Infinity, v = 0;
          for (let k = k0; k < ke; k++) { if (P.h[k] > h) h = P.h[k]; if (P.l[k] < l) l = P.l[k]; v += P.v[k]; }
          pushBar(S, I.ss[di] + k0 * r, I.ss[di] + k1 * r, P.o[k0], h, l, P.c[ke - 1], P.hasV ? v : null, di, k0 === 0 && I.rollSet.has(di), k0 === 0);
          if (ke < k1) S.partial = true;
        }
      }
    }
  }
  S.n = S.ts.length;
  indicators(S);
  return S;
}
function indicators(S) {
  const n = S.n, c = S.c, o = S.o, h = S.h, l = S.l;
  const ema = new Array(n).fill(null), sma = new Array(n).fill(null), atr = new Array(n).fill(null), rsi = new Array(n).fill(null), vma = new Array(n).fill(null);
  let e = null; const k = 2 / 21;
  for (let i = 0; i < n; i++) { e = e == null ? c[i] : c[i] * k + e * (1 - k); if (i >= 9) ema[i] = e; }
  let s = 0; for (let i = 0; i < n; i++) { s += c[i]; if (i >= 50) s -= c[i - 50]; if (i >= 49) sma[i] = s / 50; }
  let a = null;
  for (let i = 0; i < n; i++) { const tr = i === 0 || S.brk[i] ? h[i] - l[i] : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])); a = a == null ? tr : a + (tr - a) / 14; if (i >= 5) atr[i] = a; }
  let ag = 0, al = 0;
  for (let i = 1; i < n; i++) {
    const ch = S.brk[i] ? c[i] - o[i] : c[i] - c[i - 1], g = Math.max(0, ch), ls = Math.max(0, -ch);
    if (i <= 14) { ag += g / 14; al += ls / 14; if (i === 14) rsi[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); }
    else { ag = (ag * 13 + g) / 14; al = (al * 13 + ls) / 14; rsi[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); }
  }
  let vs = 0, vc = 0;
  for (let i = 0; i < n; i++) { const v = S.v[i]; if (v != null) { vs += v; vc++; } if (i >= 20) { const w = S.v[i - 20]; if (w != null) { vs -= w; vc--; } } if (i >= 19 && vc >= 15) vma[i] = vs / vc; }
  let vwap = null;
  if (isIntra(S.tf)) { vwap = new Array(n).fill(null); let pv = 0, vv = 0; for (let i = 0; i < n; i++) { if (S.ds[i]) { pv = 0; vv = 0; } const w = S.v[i] != null && S.v[i] > 0 ? S.v[i] : 1, tp = (h[i] + l[i] + c[i]) / 3; pv += tp * w; vv += w; vwap[i] = pv / vv; } }
  S.ema = ema; S.sma = sma; S.atr = atr; S.rsi = rsi; S.vma = vma; S.vwap = vwap;
  S._st = { e, a, ag, al, pv: vwap ? (() => { let pv = 0, vv = 0; for (let i = 0; i < n; i++) { if (S.ds[i]) { pv = 0; vv = 0; } const w = S.v[i] != null && S.v[i] > 0 ? S.v[i] : 1; pv += (h[i] + l[i] + c[i]) / 3 * w; vv += w; } return [pv, vv]; })() : null };
}
// S is B plus one forming candle: work out only that candle's indicator values (same formulas as above)
function indicatorsTail(S, B) {
  const st = B._st; if (!st || S.n !== B.n + 1) { indicators(S); return; }
  const i = B.n, c = S.c, h = S.h, l = S.l, o = S.o, k = 2 / 21;
  const e = st.e == null ? c[i] : c[i] * k + st.e * (1 - k);
  let sm = null; if (i >= 49) { let t = 0; for (let j = i - 49; j <= i; j++) t += c[j]; sm = t / 50; }
  const tr = i === 0 || S.brk[i] ? h[i] - l[i] : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])), a = st.a == null ? tr : st.a + (tr - st.a) / 14;
  let rs = null; if (i >= 1) { const ch = S.brk[i] ? c[i] - o[i] : c[i] - c[i - 1], g = Math.max(0, ch), ls = Math.max(0, -ch); let ag, al;
    if (i <= 14) { ag = st.ag + g / 14; al = st.al + ls / 14; if (i === 14) rs = al === 0 ? 100 : 100 - 100 / (1 + ag / al); } else { ag = (st.ag * 13 + g) / 14; al = (st.al * 13 + ls) / 14; rs = al === 0 ? 100 : 100 - 100 / (1 + ag / al); } }
  let vm = null; if (i >= 19) { let vs = 0, vc = 0; for (let j = i - 19; j <= i; j++) if (S.v[j] != null) { vs += S.v[j]; vc++; } if (vc >= 15) vm = vs / vc; }
  S.ema = B.ema.concat(i >= 9 ? e : null); S.sma = B.sma.concat(sm); S.atr = B.atr.concat(i >= 5 ? a : null); S.rsi = B.rsi.concat(rs); S.vma = B.vma.concat(vm);
  if (B.vwap && st.pv) { let [pv, vv] = S.ds[i] ? [0, 0] : st.pv; const w = S.v[i] != null && S.v[i] > 0 ? S.v[i] : 1; pv += (h[i] + l[i] + c[i]) / 3 * w; vv += w; S.vwap = B.vwap.concat(pv / vv); } else S.vwap = isIntra(S.tf) ? (indicators(S), S.vwap) : null;
}

/* ================= ANALYSIS (everything computed from the candles) ================= */
function lastBrk(S, t) { for (let i = t; i > 0; i--) if (S.brk[i]) return i; return 0; }
function nextBrk(S, t) { for (let i = t + 1; i < S.n; i++) if (S.brk[i]) return i; return Infinity; }
function brkBetween(S, a, b) { for (let i = a + 1; i <= b; i++) if (S.brk[i]) return true; return false; }
function adjChange(S, a, t) { let s = 0; for (let i = a + 1; i <= t; i++) s += S.brk[i] ? S.c[i] - S.o[i] : S.c[i] - S.c[i - 1]; return s; }
function trendRead(S, t) {
  if (t < 10 || S.ema[t] == null || !S.atr[t]) return { k: "na" };
  const n = Math.min(20, t), a = t - n, sc = n / 20, raw = adjChange(S, a, t), chg = raw / S.atr[t], pc = raw / (S.c[t] - raw) * 100;
  let hi = -Infinity, lo = Infinity; for (let i = a; i <= t; i++) { hi = Math.max(hi, S.h[i]); lo = Math.min(lo, S.l[i]); }
  const posn = (S.c[t] - lo) / (hi - lo || 1), roll = brkBetween(S, a, t), emaSlope = S.ema[t - 5] != null ? (S.ema[t] - S.ema[t - 5]) / S.atr[t] : 0;
  const base = { chg, pc, n, a, posn, hi, lo, emaSlope, above: S.c[t] > S.ema[t], rng: (hi - lo) / S.atr[t] };
  if (chg >= 2 * sc && S.c[t] > S.ema[t] && posn >= 0.6) return Object.assign(base, { k: "up" });
  if (chg <= -2 * sc && S.c[t] < S.ema[t] && posn <= 0.4) return Object.assign(base, { k: "down" });
  if (!roll && Math.abs(chg) <= 0.8 && (hi - lo) / S.atr[t] <= 4.5) return Object.assign(base, { k: "side" });
  return Object.assign(base, { k: "mixed" });
}
function longChg(S, t, n = 50) { const a = Math.max(0, t - n); return adjChange(S, a, t) / S.atr[t]; }
function classifyAll(S, t) {
  if (t < 6 || S.brk[t] || S.brk[t - 1] || !S.atr[t]) return [];
  const o = S.o[t], h = S.h[t], l = S.l[t], c = S.c[t], R = h - l, B = Math.abs(c - o), U = h - Math.max(o, c), Lw = Math.min(o, c) - l, A = S.atr[t];
  if (R < 0.3 * A) return [];
  const o1 = S.o[t - 1], h1 = S.h[t - 1], l1 = S.l[t - 1], c1 = S.c[t - 1], B1 = Math.abs(c1 - o1);
  const fell = S.c[t - 1] < S.c[t - 6], rose = S.c[t - 1] > S.c[t - 6];
  const out = [];
  if (c1 < o1 && c > o && o <= c1 && c >= o1 && B > B1 && B1 > 0.1 * (h1 - l1)) out.push("bull_engulf");
  if (c1 > o1 && c < o && o >= c1 && c <= o1 && B > B1 && B1 > 0.1 * (h1 - l1)) out.push("bear_engulf");
  if (Lw >= 2 * B && U <= 0.15 * R && B >= 0.03 * R) { if (fell) out.push("hammer"); if (rose) out.push("hanging"); }
  if (U >= 2 * B && Lw <= 0.15 * R && B >= 0.03 * R) { if (rose) out.push("star"); if (fell) out.push("inv_hammer"); }
  if (B >= 0.85 * R && R >= 1.0 * A) out.push(c > o ? "bull_maru" : "bear_maru");
  if (B <= 0.08 * R && U >= 0.25 * R && Lw >= 0.25 * R && R >= 0.5 * A) out.push("doji");
  if (h < h1 && l > l1) out.push("inside");
  return out;
}
const PAT = {
  bull_engulf: ["Bullish engulfing", "a green candle whose body swallows the previous red body. Buyers took control.", 1, 2],
  bear_engulf: ["Bearish engulfing", "a red candle whose body swallows the previous green body. Sellers took control.", -1, 2],
  hammer: ["Hammer", "after a fall, price dropped hard inside the candle but buyers pushed it back up, leaving a long lower wick.", 1, 1],
  hanging: ["Hanging man", "the same shape as a hammer, but after a rise. A warning that sellers are testing the move.", -1, 1],
  star: ["Shooting star", "after a rise, price jumped inside the candle but sellers slammed it back down, leaving a long upper wick.", -1, 1],
  inv_hammer: ["Inverted hammer", "after a fall, buyers pushed price up inside the candle (long upper wick). An early sign buyers are testing higher prices.", 1, 1],
  doji: ["Doji", "open and close almost the same, with wicks on both sides. Buyers and sellers are undecided.", 0, 1],
  bull_maru: ["Bullish marubozu", "a big green candle with almost no wicks. Buyers controlled it from open to close.", 1, 1],
  bear_maru: ["Bearish marubozu", "a big red candle with almost no wicks. Sellers controlled it from open to close.", -1, 1],
  inside: ["Inside bar", "the whole candle fits inside the previous one. The market is pausing and coiling.", 0, 2],
};
function swings(S, a, b, kind) {
  const out = [];
  for (let i = Math.max(a, 2); i <= b - 2; i++) {
    if (kind === "low") { const v = S.l[i]; if (v < S.l[i - 1] && v < S.l[i - 2] && v <= S.l[i + 1] && v <= S.l[i + 2]) out.push(i); }
    else { const v = S.h[i]; if (v > S.h[i - 1] && v > S.h[i - 2] && v >= S.h[i + 1] && v >= S.h[i + 2]) out.push(i); }
  }
  return out;
}
function levels(S, t) {
  const a = Math.max(lastBrk(S, t), t - 60), A = S.atr[t] || 1, res = { sup: null, res: null };
  if (t - a < 8) return res;
  const minAfter = i => { let m = Infinity; for (let j = i + 1; j <= t; j++) m = Math.min(m, S.l[j]); return m; };
  const maxAfter = i => { let m = -Infinity; for (let j = i + 1; j <= t; j++) m = Math.max(m, S.h[j]); return m; };
  const lows = swings(S, a, t, "low").filter(i => S.l[i] < S.c[t] - 0.2 * A && minAfter(i) > S.l[i]);
  const highs = swings(S, a, t, "high").filter(i => S.h[i] > S.c[t] + 0.2 * A && maxAfter(i) < S.h[i]);
  if (lows.length) { const i = lows.reduce((x, y) => S.l[y] > S.l[x] ? y : x); res.sup = { i, p: S.l[i] }; }
  if (highs.length) { const i = highs.reduce((x, y) => S.h[y] < S.h[x] ? y : x); res.res = { i, p: S.h[i] }; }
  return res;
}
function touches(S, a, t, p, A, kind) { let n = 0, last = -9; for (let i = a; i <= t; i++) { const x = kind === "sup" ? S.l[i] : S.h[i]; if (Math.abs(x - p) <= 0.3 * A && i - last > 2) { n++; last = i; } } return n; }
// zig-zag swings: a swing is confirmed once price reverses by k × ATR
function zigzag(S, t, k = 1.5) {
  const a = Math.max(lastBrk(S, t), t - 120, 0), A = S.atr[t]; if (!A || t - a < 10) return { piv: [], cur: null };
  const thr = k * A, piv = [];
  let dir = 0, hiI = a, loI = a;
  for (let i = a + 1; i <= t; i++) {
    if (dir >= 0 && S.h[i] >= S.h[hiI]) hiI = i;
    if (dir <= 0 && S.l[i] <= S.l[loI]) loI = i;
    if (dir === 0) {
      if (S.h[hiI] - S.l[i] >= thr && hiI < i) { piv.push({ i: hiI, p: S.h[hiI], k: "H" }); dir = -1; loI = i; }
      else if (S.h[i] - S.l[loI] >= thr && loI < i) { piv.push({ i: loI, p: S.l[loI], k: "L" }); dir = 1; hiI = i; }
    } else if (dir === 1) {
      if (S.h[hiI] - S.l[i] >= thr && i > hiI) { piv.push({ i: hiI, p: S.h[hiI], k: "H" }); dir = -1; loI = i; }
    } else {
      if (S.h[i] - S.l[loI] >= thr && i > loI) { piv.push({ i: loI, p: S.l[loI], k: "L" }); dir = 1; hiI = i; }
    }
  }
  const cur = dir === 1 ? { i: hiI, p: S.h[hiI], k: "H" } : dir === -1 ? { i: loI, p: S.l[loI], k: "L" } : null;
  // label each swing against the previous swing of the same kind
  let pH = null, pL = null;
  for (const q of piv) { if (q.k === "H") { q.lab = pH ? (q.p > pH.p ? "HH" : "LH") : "H"; pH = q; } else { q.lab = pL ? (q.p > pL.p ? "HL" : "LL") : "L"; pL = q; } }
  return { piv, cur };
}
function structure(S, t) {
  const z = zigzag(S, t); const H = z.piv.filter(p => p.k === "H"), L = z.piv.filter(p => p.k === "L");
  if (H.length < 2 || L.length < 2) return null;
  const h1 = H[H.length - 2], h2 = H[H.length - 1], l1 = L[L.length - 2], l2 = L[L.length - 1];
  if (Math.min(h1.i, l1.i) < t - 110) return null;
  const k = h2.p > h1.p && l2.p > l1.p ? "up" : h2.p < h1.p && l2.p < l1.p ? "down" : "mixed";
  return { k, h1, h2, l1, l2, z };
}
function analyze(S, t) {
  const I = S.I, A = S.atr[t], c = S.c[t];
  const tr = trendRead(S, t), st = S.ema[t] != null ? (c - S.ema[t]) / A : 0, pats = classifyAll(S, t), lv = levels(S, t);
  const B = []; let score = 0; const why = [];
  const span = tfWord(S.tf, tr.n);
  if (tr.k === "up") { score += 2; why.push("uptrend +2"); B.push({ tone: "up", t: `**Trend: up.** ${fpct(tr.pc)} over the last ${span}, above the blue 20 EMA.` }); }
  else if (tr.k === "down") { score -= 2; why.push("downtrend −2"); B.push({ tone: "down", t: `**Trend: down.** ${fpct(tr.pc)} over the last ${span}, below the blue 20 EMA.` }); }
  else if (tr.k === "side") B.push({ tone: "", t: `**Trend: sideways.** Only ${fpct(tr.pc)} over ${span}, moving inside a range.` });
  else if (tr.k === "mixed") B.push({ tone: "", t: `**Trend: unclear.** ${fpct(tr.pc)} over ${span}, but the clues disagree.` });
  if (st > 2.5) { score -= 1; why.push("stretched up −1"); B.push({ tone: "warn", t: `**Stretched.** Price is ${st.toFixed(1)}× the average candle range (ATR) above the blue line. Moves this extended often pause or snap back.` }); }
  else if (st < -2.5) { score += 1; why.push("stretched down +1"); B.push({ tone: "warn", t: `**Stretched.** Price is ${Math.abs(st).toFixed(1)}× ATR below the blue line. Sell-offs this extended often snap back.` }); }
  else if (S.ema[t] != null) B.push({ tone: "", t: `**Average:** price is ${Math.abs(st) < 0.4 ? "sitting right on" : st > 0 ? "a little above" : "a little below"} the blue 20 EMA.` });
  if (pats.length) { const p = PAT[pats[0]]; score += p[2]; if (p[2]) why.push(`${p[0].toLowerCase()} ${p[2] > 0 ? "+1" : "−1"}`); B.push({ tone: p[2] > 0 ? "up" : p[2] < 0 ? "down" : "", t: `**Last candle: ${p[0]}**, ${p[1]}` }); }
  else { const R = S.h[t] - S.l[t], size = R < 0.6 * A ? "small" : R > 1.4 * A ? "big" : "normal-sized", ch = (c / S.c[t - 1] - 1) * 100; B.push({ tone: c >= S.o[t] ? "up" : "down", t: `**Last candle:** a ${size} ${c >= S.o[t] ? "green" : "red"} candle (${fpct(ch, 2)}).` }); }
  if (lv.sup) B.push({ tone: "up", t: `**Floor (support):** ${fp(I, lv.sup.p)}, ${((c - lv.sup.p) / A).toFixed(1)} ATR below.` });
  if (lv.res) B.push({ tone: "down", t: `**Ceiling (resistance):** ${fp(I, lv.res.p)}, ${((lv.res.p - c) / A).toFixed(1)} ATR above.` });
  if (S.rsi[t] != null) B.push({ tone: "", t: `**RSI:** ${S.rsi[t].toFixed(0)} (${S.rsi[t] >= 70 ? "overbought" : S.rsi[t] <= 30 ? "oversold" : "neutral"}).` });
  const lean = score >= 2 ? "buy" : score <= -2 ? "sell" : "none";
  const R0 = S.h[t] - S.l[t], ch0 = (c / S.c[t - 1] - 1) * 100, rsi = S.rsi[t];
  const rows = [
    ["Trend", tr.k === "na" ? "Not enough data" : `${{ up: "Up", down: "Down", side: "Sideways", mixed: "Unclear" }[tr.k]} · ${fpct(tr.pc)} over ${tr.n} candles (${Math.abs(tr.chg).toFixed(1)}× ATR)`, tr.k === "up" ? "pos" : tr.k === "down" ? "neg" : ""],
    ["vs 20 EMA", S.ema[t] == null ? "—" : `${Math.abs(st).toFixed(1)}× ATR ${st >= 0 ? "above" : "below"}${Math.abs(st) > 2.5 ? " · stretched" : ""}`, Math.abs(st) > 2.5 ? "warn" : st >= 0 ? "pos" : "neg"],
    ["Last candle", pats.length ? PAT[pats[0]][0] : `${R0 < 0.6 * A ? "Small" : R0 > 1.4 * A ? "Large" : "Normal"} ${c >= S.o[t] ? "green" : "red"} candle (${fpct(ch0, 2)})`, pats.length ? (PAT[pats[0]][2] > 0 ? "pos" : PAT[pats[0]][2] < 0 ? "neg" : "") : ""],
    ["Support", lv.sup ? `${fp(I, lv.sup.p)} · ${((c - lv.sup.p) / A).toFixed(1)}× ATR below` : "None nearby", lv.sup ? "pos" : ""],
    ["Resistance", lv.res ? `${fp(I, lv.res.p)} · ${((lv.res.p - c) / A).toFixed(1)}× ATR above` : "None nearby", lv.res ? "neg" : ""],
    ...(S.vwap && S.vwap[t] != null ? [["VWAP", `${fp(I, S.vwap[t])} · price ${Math.abs((c - S.vwap[t]) / A).toFixed(1)}× ATR ${c >= S.vwap[t] ? "above" : "below"}`, c >= S.vwap[t] ? "pos" : "neg"]] : []),
    ["RSI 14", rsi == null ? "—" : `${rsi.toFixed(0)} · ${rsi >= 70 ? "overbought" : rsi <= 30 ? "oversold" : "neutral"}`, ""],
    ["ATR (avg candle)", fp(I, A), ""],
    ["Textbook lean", `${lean === "none" ? "No clear edge" : lean.toUpperCase()}${why.length ? " · " + why.join(", ") : ""}`, lean === "buy" ? "pos" : lean === "sell" ? "neg" : ""],
  ];
  return { tr, st, pats, lv, B, score, why, lean, A, rows };
}

/* ================= TRADE ENGINE ================= */
const RISK = 500;
// entry at the close of bar t; walks forward through real (daily) or simulated (intraday) candles
function simulate(S, t, H, dir, stopATR, tgtR, A0) {
  const e = S.c[t], A = A0 || S.atr[t], sd = stopATR * A;
  const stop = e - dir * sd, tgt = e + dir * tgtR * sd;
  for (let k = 1; k <= H; k++) {
    const i = t + k, o = S.o[i], h = S.h[i], l = S.l[i];
    const hitS = dir > 0 ? l <= stop : h >= stop, hitT = dir > 0 ? h >= tgt : l <= tgt;
    const gapS = dir > 0 ? o <= stop : o >= stop, gapT = dir > 0 ? o >= tgt : o <= tgt;
    let px = null, why = null, both = false;
    if (gapS) { px = o; why = "gapstop"; }
    else if (gapT) { px = o; why = "gaptarget"; }
    else if (hitS && hitT) { both = true; if (Math.abs(o - tgt) < Math.abs(o - stop)) { px = tgt; why = "target"; } else { px = stop; why = "stop"; } }
    else if (hitS) { px = stop; why = "stop"; }
    else if (hitT) { px = tgt; why = "target"; }
    if (px != null) return { i, k, px, why, both, stop, tgt, e, sd, R: (px - e) * dir / sd };
  }
  const i = t + H; return { i, k: H, px: S.c[i], why: "time", both: false, stop, tgt, e, sd, R: (S.c[i] - e) * dir / sd };
}
const exitLabel = r => ({ target: "Target hit", stop: r.be ? "Stopped at breakeven" : "Stopped out", gapstop: "Gapped through the stop", gaptarget: "Gapped through the target", time: "Closed at the time limit", roll: "Contract rolled: closed at market", dataend: "End of the data: closed at market", manual: "Closed by you", mll: "Account loss limit hit", rule: "Strategy exit rule" }[r.why]);
function bestMove(b, s) { if (Math.max(b.R, s.R) < 0.5) return 0; return b.R >= s.R ? 1 : -1; }

/* ---------- daily decision points (real data) and honest base rates ---------- */
const DSER = {}; for (const k of SYMS) DSER[k] = buildSeries(INST[k], "1D", INST[k].se[INST[k].n - 1] + 1);
function horizonD(S, t) { return Math.min(15, nextBrk(S, t) - t - 1, S.n - 1 - t); }
const POOL_D = {};
for (const k of SYMS) { const S = DSER[k]; POOL_D[k] = []; for (let t = 60; t < S.n - 30; t++) if (S.atr[t] && S.ema[t] != null && horizonD(S, t) >= 8) POOL_D[k].push(t); }
const ODDS = (() => {
  const r = { lean: [0, 0, 0], buy: [0, 0, 0], sell: [0, 0, 0], n: 0 };
  for (const k of SYMS) { const S = DSER[k]; for (const t of POOL_D[k]) {
    const H = horizonD(S, t), a = analyze(S, t), b = simulate(S, t, H, 1, 1.5, 2), s = simulate(S, t, H, -1, 1.5, 2);
    r.n++; r.buy[0]++; if (b.R > 0) r.buy[1]++; r.buy[2] += b.R; r.sell[0]++; if (s.R > 0) r.sell[1]++; r.sell[2] += s.R;
    if (a.lean !== "none") { const x = a.lean === "buy" ? b : s; r.lean[0]++; if (x.R > 0) r.lean[1]++; r.lean[2] += x.R; } } }
  return r;
})();
const EVENTS = DATA.moments.map(m => Object.assign({}, m, { t: INST[m.sym].idx[m.d] })).filter(e => e.t != null);

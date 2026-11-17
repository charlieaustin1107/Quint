/* ================= 5-PILLAR MODEL: market state, points of interest, setup evaluation ================= */
const PILLARS = { loc: "Location", sweep: "Liquidity sweep", cisd: "Change in state of delivery", disp: "Displacement", exec: "Execution" };
const REGIMES = { trend: "Trend", upch: "Upward channel", dnch: "Downward channel", range: "Range", transition: "Transition" };
// The five ways the market moves, measured over the last N candles
function regime(S, t, N = 48) {
  if (t < N + 2 || !S.atr[t]) return null;
  const a = t - N + 1, A = S.atr[t];
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (let i = a; i <= t; i++) { const x = i - a, y = S.c[i]; sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y; }
  const n = N, b = (n * sxy - sx * sy) / (n * sxx - sx * sx), ic = (sy - b * sx) / n;
  const vy = n * syy - sy * sy, r2 = vy > 0 ? Math.pow(n * sxy - sx * sy, 2) / ((n * sxx - sx * sx) * vy) : 0;
  let path = 0, rmax = -Infinity, rmin = Infinity, hi = -Infinity, lo = Infinity;
  for (let i = a; i <= t; i++) { if (i > a) path += Math.abs(S.c[i] - S.c[i - 1]); const f = ic + b * (i - a); rmax = Math.max(rmax, S.h[i] - f); rmin = Math.min(rmin, S.l[i] - f); hi = Math.max(hi, S.h[i]); lo = Math.min(lo, S.l[i]); }
  const m = a + Math.floor(N / 2), net = (S.c[t] - S.c[a]) / A, n1 = (S.c[m] - S.c[a]) / A, n2 = (S.c[t] - S.c[m]) / A;
  const er = path > 0 ? Math.abs(S.c[t] - S.c[a]) / path : 0, width = (rmax - rmin) / A, height = (hi - lo) / A;
  const m0 = { r2, er, net, n1, n2, width, height, slope: b * N / A, a, b, ic, N };
  let k = null;
  if (Math.sign(n1) !== Math.sign(n2) && Math.abs(n1) >= 3 && Math.abs(n2) >= 3) k = "transition";
  else if (Math.abs(n1) >= 4 && Math.abs(n2) <= 0.5) k = "transition";
  else if (r2 >= 0.75 && Math.abs(net) >= 5 && er >= 0.26) k = "trend";
  else if (r2 >= 0.45 && Math.abs(net) >= 2.5 && er < 0.24 && width <= 7) k = net > 0 ? "upch" : "dnch";
  else if (Math.abs(net) <= 1.5 && r2 <= 0.25 && height <= 8) k = "range";
  return Object.assign(m0, { k, dir: Math.sign(net) });
}
// Higher-timeframe points of interest for a trading day: PDH/PDL (real), daily FVGs (real), 4h/1h FVGs and order blocks
const POICACHE = new Map();
function poisFor(I, di, tf) {
  const key = I.sym + "|" + di + "|" + tf; if (POICACHE.has(key)) return POICACHE.get(key);
  const out = [], D = DSER[I.sym]; let nid = 0;
  const add = (o) => { o.id = "p" + (nid++); out.push(o); };
  if (di >= 1) {
    add({ kind: "PDH", name: "Previous day high", lo: I.h[di - 1], hi: I.h[di - 1], side: -1, from: I.ss[di] - 1, touchTe: Infinity, tf: "1D", lvl: true });
    add({ kind: "PDL", name: "Previous day low", lo: I.l[di - 1], hi: I.l[di - 1], side: 1, from: I.ss[di] - 1, touchTe: Infinity, tf: "1D", lvl: true });
  }
  for (let k = Math.max(1, di - 20); k <= di - 2; k++) {
    const A = D.atr[k] || (D.h[k] - D.l[k]);
    if (D.l[k + 1] > D.h[k - 1] + 0.1 * A) { const lo = D.h[k - 1], hi = D.l[k + 1]; let mit = false; for (let j = k + 2; j < di; j++) if (D.l[j] <= hi) { mit = true; break; } if (!mit) add({ kind: "Daily bullish FVG", name: "Daily bullish fair value gap", lo, hi, side: 1, from: I.se[k + 1], touchTe: Infinity, tf: "1D" }); }
    if (D.h[k + 1] < D.l[k - 1] - 0.1 * A) { const lo = D.h[k + 1], hi = D.l[k - 1]; let mit = false; for (let j = k + 2; j < di; j++) if (D.h[j] >= lo) { mit = true; break; } if (!mit) add({ kind: "Daily bearish FVG", name: "Daily bearish fair value gap", lo, hi, side: -1, from: I.se[k + 1], touchTe: Infinity, tf: "1D" }); }
  }
  for (const [tfH, back] of (tf === "15m" ? [["4h", 20]] : [["4h", 20], ["1h", 5]])) {
    const H = buildSeries(I, tfH, I.se[di], Math.max(0, di - back));
    const addZ = (kind, side, lo, hi, from, j0) => {
      let touchTe = Infinity; for (let q = j0; q < H.n; q++) if (side > 0 ? H.l[q] <= hi : H.h[q] >= lo) { touchTe = H.te[q]; break; }
      add({ kind: `${tfH} ${side > 0 ? "bullish" : "bearish"} ${kind}`, name: `${tfH} ${side > 0 ? "bullish" : "bearish"} ${kind === "FVG" ? "fair value gap" : "order block"}`, lo, hi, side, from, touchTe, tf: tfH });
    };
    for (let k = 1; k < H.n - 1; k++) {
      const A = H.atr[k] || (H.h[k] - H.l[k]) || 1;
      if (H.l[k + 1] > H.h[k - 1] + 0.1 * A && H.l[k + 1] - H.h[k - 1] <= 3 * A) addZ("FVG", 1, H.h[k - 1], H.l[k + 1], H.te[k + 1], k + 2);
      if (H.h[k + 1] < H.l[k - 1] - 0.1 * A && H.l[k - 1] - H.h[k + 1] <= 3 * A) addZ("FVG", -1, H.h[k + 1], H.l[k - 1], H.te[k + 1], k + 2);
      if (k + 3 < H.n) {
        if (H.c[k] < H.o[k]) { let m = -1, mx = -Infinity; for (let q = k + 1; q <= k + 3; q++) { mx = Math.max(mx, H.h[q]); if (m < 0 && H.c[q] > H.h[k]) m = q; } if (m > 0 && mx - H.l[k] >= 2 * A) addZ("OB", 1, H.l[k], H.o[k], H.te[m], m + 1); }
        if (H.c[k] > H.o[k]) { let m = -1, mn = Infinity; for (let q = k + 1; q <= k + 3; q++) { mn = Math.min(mn, H.l[q]); if (m < 0 && H.c[q] < H.l[k]) m = q; } if (m > 0 && H.h[k] - mn >= 2 * A) addZ("OB", -1, H.o[k], H.h[k], H.te[m], m + 1); }
      }
    }
  }
  POICACHE.set(key, out); if (POICACHE.size > 60) POICACHE.delete(POICACHE.keys().next().value);
  return out;
}
const POIRANK = k => k.startsWith("PD") ? 0 : k.startsWith("Daily") ? 1 : k.startsWith("4h") ? (k.includes("block") || k.includes("OB") ? 2 : 3) : 4;
const fmtZone = (I, p) => p.lvl ? fnum(I, p.lo) : `${fnum(I, p.lo)}–${fnum(I, p.hi)}`;
// Evaluate the five pillars at candle t. need = pillars to check (stops early on the first failure, for scanning)
function pbEval(S, t, pois, need) {
  const A = S.atr[t], c = S.c[t], W = S.tf === "1m" ? 30 : S.tf === "5m" ? 24 : 16, a = Math.max(20, t - W), T0 = S.ts[a];
  const live = pois.filter(p => p.from <= T0 && p.touchTe > T0);
  let lo = a, hi = a; for (let j = a; j <= t - 2; j++) { if (S.l[j] < S.l[lo]) lo = j; if (S.h[j] > S.h[hi]) hi = j; }
  let after = Infinity, afterH = -Infinity; for (let j = lo + 1; j <= t; j++) after = Math.min(after, S.l[j]); for (let j = hi + 1; j <= t; j++) afterH = Math.max(afterH, S.h[j]);
  const match = (s, d) => { const x = d > 0 ? S.l[s] : S.h[s]; return live.filter(p => p.side === d && (d > 0 ? x <= p.hi + 0.1 * A && x >= p.lo - 1.0 * A : x >= p.lo - 0.1 * A && x <= p.hi + 1.0 * A)).sort((p, q) => POIRANK(p.kind) - POIRANK(q.kind))[0] || null; };
  const cL = after > S.l[lo] ? match(lo, 1) : null, cH = afterH < S.h[hi] ? match(hi, -1) : null;
  let poi = null, d = 0, s = lo > hi ? lo : hi;
  if (cL && cH) { if (lo > hi) { poi = cL; d = 1; s = lo; } else { poi = cH; d = -1; s = hi; } }
  else if (cL) { poi = cL; d = 1; s = lo; } else if (cH) { poi = cH; d = -1; s = hi; }
  const dd = d || (lo > hi ? 1 : -1); if (!d) s = dd > 0 ? lo : hi;
  const ev = { A, c, t, a, W, live, poi, bias: d, d: dd, s, loc: !!poi };
  if (need && !ev.loc) return ev;
  // Pillar 2: liquidity sweep — take out resting liquidity, then close back inside
  const L = 12; let prior = dd > 0 ? Infinity : -Infinity; for (let j = Math.max(0, s - L); j < s; j++) prior = dd > 0 ? Math.min(prior, S.l[j]) : Math.max(prior, S.h[j]);
  const lvl = poi && poi.lvl ? poi.lo : prior;
  const took = dd > 0 ? S.l[s] < lvl - 0.02 * A : S.h[s] > lvl + 0.02 * A;
  const rej = dd > 0 ? (S.c[s] > lvl || (s + 1 <= t && S.c[s + 1] > lvl)) : (S.c[s] < lvl || (s + 1 <= t && S.c[s + 1] < lvl));
  ev.sweep = took && rej; ev.sw = { lvl, took, rej, levelKind: poi && poi.lvl ? poi.kind : "the recent " + (dd > 0 ? "lows" : "highs") };
  if (need && need.includes("sweep") && !ev.sweep) return ev;
  // Pillar 3: change in state of delivery — close beyond the open of the run of candles that delivered price into the sweep
  let j = s; const against = q => dd > 0 ? S.c[q] < S.o[q] : S.c[q] > S.o[q];
  if (!against(j)) j = s - 1;
  let lvlC = null, j0 = j; while (j0 >= Math.max(1, a - 10) && against(j0)) { lvlC = lvlC == null ? S.o[j0] : (dd > 0 ? Math.max(lvlC, S.o[j0]) : Math.min(lvlC, S.o[j0])); j0--; }
  let ci = -1; if (lvlC != null) for (let q = s + 1; q <= t; q++) if (dd > 0 ? S.c[q] > lvlC : S.c[q] < lvlC) { ci = q; break; }
  ev.cisd = ci > 0; ev.ci = { lvl: lvlC, i: ci, r0: j0 + 1, r1: j };
  if (need && need.includes("cisd") && !ev.cisd) return ev;
  // Pillar 4: displacement — a strong candle in the new direction, closing near its extreme
  let dpi = -1;
  for (let q = s + 1; q <= t; q++) { const R = S.h[q] - S.l[q], B = (S.c[q] - S.o[q]) * dd, cl = dd > 0 ? S.c[q] - S.l[q] : S.h[q] - S.c[q]; if (B >= 1.2 * A && cl >= 0.7 * R) { dpi = q; break; } }
  const fvg = dpi > 0 && dpi + 1 <= t && (dd > 0 ? S.l[dpi + 1] > S.h[dpi - 1] : S.h[dpi + 1] < S.l[dpi - 1]);
  ev.disp = dpi > 0; ev.dp = { i: dpi, fvg, body: dpi > 0 ? Math.abs(S.c[dpi] - S.o[dpi]) / A : 0 };
  if (need && need.includes("disp") && !ev.disp) return ev;
  // Pillar 5: execution — pullback into the internal FVG / order block (or a retest of the CISD level) with a confirming close
  let z = null;
  if (dpi > 0) {
    if (fvg && t >= dpi + 2) z = { kind: "fair value gap", lo: dd > 0 ? S.h[dpi - 1] : S.h[dpi + 1], hi: dd > 0 ? S.l[dpi + 1] : S.l[dpi - 1], t0: S.ts[dpi - 1] };
    else { for (let q = dpi - 1; q >= s; q--) if (against(q)) { z = { kind: "order block", lo: dd > 0 ? S.l[q] : S.o[q], hi: dd > 0 ? S.o[q] : S.h[q], t0: S.ts[q] }; break; } }
    if (!z && lvlC != null) z = { kind: "CISD level (break and retest)", lo: lvlC, hi: lvlC, t0: S.ts[Math.max(0, ci)] };
  }
  let conf = false, broke = false;
  if (z && t > dpi) {
    for (let q = dpi + 1; q < t; q++) if (dd > 0 ? S.c[q] < z.lo - 0.5 * A : S.c[q] > z.hi + 0.5 * A) broke = true;
    conf = !broke && (dd > 0 ? S.l[t] <= z.hi + 0.1 * A && S.l[t] >= z.lo - 0.6 * A && S.c[t] > S.o[t] && S.c[t] >= z.lo : S.h[t] >= z.lo - 0.1 * A && S.h[t] <= z.hi + 0.6 * A && S.c[t] < S.o[t] && S.c[t] <= z.hi);
  }
  const stop = dd > 0 ? S.l[s] - 0.1 * A : S.h[s] + 0.1 * A, risk = (c - stop) * dd;
  let tgt = dd > 0 ? -Infinity : Infinity; for (let q = Math.max(0, a - 20); q < s; q++) tgt = dd > 0 ? Math.max(tgt, S.h[q]) : Math.min(tgt, S.l[q]);
  const rr = risk > 0 ? (tgt - c) * dd / risk : 0, vm = S.vma[t - 1], volUp = S.v[t] != null && vm != null && S.v[t] > 1.2 * vm;
  ev.exec = !!z && conf && risk >= 0.3 * A && risk <= 5 * A && rr >= 1.5;
  ev.ex = { z, conf, broke, stop, risk, tgt, rr, volUp };
  return ev;
}
const pbValid = (ev, rules) => !!ev.loc && rules.every(r => ev[r] === true);

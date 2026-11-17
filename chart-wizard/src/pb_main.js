/* ================= THE PLAYBOOK: five pillars, learned in stages ================= */
const RULES = PILLARS;
const STAGES = [
  { name: "Market state & location", rules: ["loc"], drills: ["fvg", "mtf", "structure"], stake: 25, tf: [["5m", .6], ["1m", .25], ["15m", .15]], learn: "Read which of the five ways the market is moving, and spot when price reaches a higher-timeframe point of interest: PDH, PDL, a daily, 4h or 1h fair value gap, or an order block." },
  { name: "Liquidity sweep", rules: ["loc", "sweep"], drills: ["fvg", "levels", "candles"], stake: 35, tf: [["5m", .55], ["1m", .3], ["15m", .15]], learn: "At the level, price must take out resting liquidity (run the stops beyond a low or high) and then reject back inside." },
  { name: "Change in state of delivery", rules: ["loc", "sweep", "cisd"], drills: ["structure", "momo", "fvg"], stake: 45, tf: [["5m", .5], ["1m", .4], ["15m", .1]], learn: "After the sweep, price must close back beyond the open of the candles that delivered it into the sweep. That's the market changing its behaviour." },
  { name: "Displacement", rules: ["loc", "sweep", "cisd", "disp"], drills: ["momo", "candles", "fvg"], stake: 60, tf: [["1m", .5], ["5m", .45], ["15m", .05]], learn: "The new direction needs force: a large candle closing near its extreme, ideally leaving a fair value gap behind." },
  { name: "Execution", rules: ["loc", "sweep", "cisd", "disp", "exec"], mgmt: true, timer: true, drills: ["rr", "stop", "fees", "fvg"], stake: 80, tf: [["1m", .55], ["5m", .4], ["15m", .05]], learn: "Enter on internal confirmation (a pullback into the new FVG or order block, or a retest of the CISD level), stop beyond the sweep, target the other side of the range, breakeven at +1R." },
  { name: "Mastery", rules: ["loc", "sweep", "cisd", "disp", "exec"], mgmt: true, timer: true, drills: ["rr", "stop", "fees", "fvg", "structure", "div", "mtf"], stake: 100, tf: [["1m", .55], ["5m", .4], ["15m", .05]], learn: "Run the full model at speed, round after round, while your strategy journal builds a real sample." },
];
const GATE = { n: 8, acc: 0.75 };
const PB0 = () => ({ model: 2, stage: 0, hist: [], rounds: 0, items: 0, itemsC: 0, dec: 0, decC: 0, disc: 0, discC: 0, mg: 0, mgC: 0, rule: {}, on: [0, 0, 0], off: [0, 0, 0], missed: [0, 0], avoided: [0, 0], states: [0, 0] });
if (!ST.pb || typeof ST.pb !== "object" || ST.pb.model !== 2) ST.pb = PB0(); // new model: start the stages fresh
const pbStage = () => Math.min(STAGES.length - 1, ST.pb.stage || 0);
const pbRule = (k, ok) => { const r = ST.pb.rule[k] || (ST.pb.rule[k] = [0, 0]); r[0]++; if (ok) r[1]++; };
const dirName = d => d > 0 ? "LONG" : d < 0 ? "SHORT" : "NO TRADE";
function pickPlaybook(I, tf, diWant) {
  const st = STAGES[pbStage()], Hmax = tf === "1m" ? 45 : tf === "5m" ? 24 : 12, Hmin = tf === "1m" ? 15 : 8, DS = DSER[I.sym];
  const r0 = Math.random(), want = r0 < 0.45 ? "valid" : r0 < 0.8 ? "near" : "none";
  let fallback = null;
  for (let a = 0; a < 25; a++) {
    let di = diWant;
    if (di == null) for (let b = 0; b < 6; b++) { di = 3 + Math.floor(Math.random() * (I.n - 4)); const A = DS.atr[di - 1]; if (A && (I.h[di] - I.l[di]) / A >= 1.1) break; }
    if (di < 3 || di >= I.n || I.rollSet.has(di)) { if (diWant != null) return fallback; continue; }
    const start = Math.max(0, di - INTRA_DAYS[tf] + 1), S = buildSeries(I, tf, I.se[di], start), pois = poisFor(I, di, tf);
    const groups = { valid: [], near: [], none: [] }; let ss = -1;
    for (let j = 1; j < S.n; j++) {
      if (S.ds[j]) ss = j;
      if (S.di[j] !== di || j < 80 || j - ss < 6 || !S.atr[j] || S.ema[j] == null || volw(I.sym, S.ts[j]) < 0.9) continue;
      let H = Math.min(Hmax, S.n - 1 - j); for (let q = j + 1; q <= j + H; q++) if (S.brk[q]) { H = q - j - 1; break; }
      if (H < Hmin) continue;
      const ev = pbEval(S, j, pois, st.rules), cls = pbValid(ev, st.rules) ? "valid" : ev.loc ? "near" : "none";
      groups[cls].push({ j, H });
    }
    for (const c of [want, "valid", "near", "none"]) if (groups[c].length) {
      const { j, H } = pick(groups[c]), r = { tf, start, t: j, H, tDec: S.te[j], tEnd: S.te[j + H], cls: c };
      if (c === want) return r; if (!fallback) fallback = r; break;
    }
    if (diWant != null) return fallback;
  }
  return fallback;
}
function setupPlaybook() {
  const st = STAGES[pbStage()], di = G.Sv.di[G.t];
  G.pbm = true; G.pois = poisFor(G.I, di, G.tf);
  const ev = pbEval(G.Sv, G.t, G.pois);
  G.pb = { ev, rules: st.rules, stage: pbStage(), valid: pbValid(ev, st.rules), checks: {}, locked: false, mg: null, rg: regime(G.Sv, G.t) };
  G.plan = { stop: 1, tgt: 2, risk: ST.riskPct || 1 };
  const qs = [];
  const drill = shuffle(st.drills).map(k => { try { const gen = DRILL[k]; const q = gen && gen(); if (q) q.key = k; return q; } catch (e) { console.error(e); return null; } }).find(Boolean);
  if (drill && (ST.rounds < 1 || Math.random() < 0.6)) qs.push(drill);
  const rq = regimeQ(); if (rq) qs.push(rq);
  qs.push(locQ());
  G.qs = qs;
}
const DRILL = {
  fvg: () => qFVG(G.Sv, G.t), mtf: () => qHTF(HTF[G.tf]), vwap: () => qVWAP(G.Sv, G.t), trend: () => qTrend(G.Sv, G.t), structure: () => qStructure(G.Sv, G.t), levels: () => qLevel(G.Sv, G.t),
  candles: () => qPattern(G.Sv, G.t), momo: () => qMomo(G.Sv, G.t), close: () => qClose(G.Sv, G.t), rr: () => qRR(G.Sv, G.t), stop: () => qStop(G.Sv, G.t), fees: () => qFees(G.Sv, G.t), div: () => qDiv(G.Sv, G.t),
};
const REGIME_OPTS = [
  { k: "trend", label: "Trend: a strong one-way move with shallow pullbacks", s: "Trend" },
  { k: "upch", label: "Upward channel: steady higher highs and higher lows between parallel lines", s: "Upward channel" },
  { k: "dnch", label: "Downward channel: steady lower highs and lower lows between parallel lines", s: "Downward channel" },
  { k: "range", label: "Range: sideways between a clear high and low", s: "Range" },
  { k: "transition", label: "Transition: the market is changing state (a move stalling or reversing)", s: "Transition" },
];
const REGIME_USE = {
  trend: "Don't fight it. Sweeps against a strong trend usually fail. Look for sweeps of pullback lows (or highs) in the trend's direction, at a higher-timeframe POI.",
  upch: "Look for longs where price sweeps the lower edge of the channel into a higher-timeframe POI, targeting the upper edge. Shorts against the channel need a clear transition first.",
  dnch: "Look for shorts where price sweeps the upper edge of the channel into a higher-timeframe POI, targeting the lower edge. Longs need a clear transition first.",
  range: "The model's sweet spot: price sweeps the range high or low into a POI, rejects, shifts delivery and displaces. Then target the other side of the range.",
  transition: "This is where changes in state of delivery appear. Be patient: let displacement confirm the new direction before executing.",
};
function regimeQ() {
  const S = G.Sv, t = G.t, rg = G.pb.rg; if (!rg || !rg.k) return null;
  const I = S.I, a = rg.a, f = i => rg.ic + rg.b * (i - a);
  const marks = rg.k === "range" ? [{ type: "zone", lo: Math.min(...S.l.slice(a, t + 1)), hi: Math.max(...S.h.slice(a, t + 1)), t0: S.ts[a], color: C.amber, label: "range" }]
    : rg.k === "transition" ? [{ type: "arrow", t0: S.ts[a], p0: S.c[a], t1: S.ts[a + (rg.N >> 1)], p1: S.c[a + (rg.N >> 1)], color: rg.n1 > 0 ? C.up : C.down, label: "before" }, { type: "arrow", t0: S.ts[a + (rg.N >> 1)], p0: S.c[a + (rg.N >> 1)], t1: S.ts[t], p1: S.c[t], color: rg.n2 > 0 ? C.up : rg.n2 < 0 ? C.down : C.amber, label: "now" }]
    : [{ type: "seg", t0: S.ts[a], p0: f(a), t1: S.ts[t], p1: f(t), color: C.amber, label: REGIMES[rg.k].toLowerCase(), dash: [5, 4] }];
  return { key: "state", skill: "structure", kind: "mc", tag: "Market state", title: "Which of the five ways is the market moving?", sub: `Judge the last ${rg.N} candles: how far price went, how straight, and how orderly.`,
    opts: REGIME_OPTS, correct: rg.k,
    explain: ch => report({ kpis: [["Net move", `${rg.net >= 0 ? "+" : "−"}${Math.abs(rg.net).toFixed(1)}× ATR`, toneOf(rg.net)], ["Straightness (R²)", rg.r2.toFixed(2)], ["Efficiency", `${Math.round(rg.er * 100)}%`], ["Channel width", `${rg.width.toFixed(1)}× ATR`], ["First half", `${rg.n1 >= 0 ? "+" : "−"}${Math.abs(rg.n1).toFixed(1)}× ATR`, toneOf(rg.n1)], ["Second half", `${rg.n2 >= 0 ? "+" : "−"}${Math.abs(rg.n2).toFixed(1)}× ATR`, toneOf(rg.n2)]],
      yours: ch && ch !== rg.k ? `You picked ${REGIMES[ch].toLowerCase()}. ${STATE_DEF[ch]} That's not what the numbers show.` : null,
      why: `${STATE_DEF[rg.k]} Here: ${rg.k === "transition" ? `the first half moved ${rg.n1 >= 0 ? "+" : "−"}${Math.abs(rg.n1).toFixed(1)}× ATR and the second half ${rg.n2 >= 0 ? "+" : "−"}${Math.abs(rg.n2).toFixed(1)}× ATR.` : rg.k === "range" ? `price finished only ${Math.abs(rg.net).toFixed(1)}× ATR from where it started, inside a ${rg.height.toFixed(1)}× ATR box.` : `price moved ${Math.abs(rg.net).toFixed(1)}× ATR with straightness ${rg.r2.toFixed(2)} and ${Math.round(rg.er * 100)}% efficiency (how much of the path was progress).`}`,
      use: REGIME_USE[rg.k] }),
    marks };
}
const STATE_DEF = {
  trend: "A trend moves at least 5× ATR in a nearly straight line (R² ≥ 0.75) with high efficiency (26%+): pullbacks are shallow.",
  upch: "An upward channel climbs at least 2.5× ATR in an orderly line (R² ≥ 0.45) but with deeper pullbacks (efficiency under 24%), staying inside parallel bands.",
  dnch: "A downward channel falls at least 2.5× ATR in an orderly line (R² ≥ 0.45) but with deeper bounces (efficiency under 24%), staying inside parallel bands.",
  range: "A range ends within 1.5× ATR of where it started, with no real slope (R² ≤ 0.25), inside a box no taller than 8× ATR.",
  transition: "A transition is a change of state: the two halves moved at least 3× ATR in opposite directions, or a 4× ATR move has stalled to almost nothing.",
};
function locQ() {
  const ev = G.pb.ev, I = G.I, A = ev.A, c = ev.c, mid = p => (p.lo + p.hi) / 2;
  const pool = ev.live.slice().sort((p, q) => Math.abs(mid(p) - c) - Math.abs(mid(q) - c));
  let opts = ev.poi ? [ev.poi] : [];
  for (const p of pool) { if (opts.length >= 3) break; if (!opts.includes(p) && !opts.some(o => Math.abs(mid(o) - mid(p)) < 0.4 * A)) opts.push(p); }
  opts = shuffle(opts); const L = "ABC";
  G.prep = opts.map((p, i) => ({ type: "zone", lo: p.lo, hi: p.hi, t0: Math.max(p.from, G.Sv.ts[0]), color: "#8b9bc4", label: `${L[i]} · ${p.kind}`, prep: true }));
  for (const z of G.prep) G.overlays.push(z);
  const x = ev.d > 0 ? G.Sv.l[ev.s] : G.Sv.h[ev.s], nearest = pool[0];
  return { key: "loc", skill: "levels", kind: "mc", tag: "Pillar 1 · Location", switchTF: G.tf === "15m" ? "4h" : "1h",
    title: "Did price reach a higher-timeframe point of interest? Which one?", sub: `Your prep is marked on the chart (A, B${opts.length > 2 ? ", C" : ""}). Look at the highs and lows of the last ${ev.W} candles.`,
    opts: [...opts.map((p, i) => ({ k: p.id, label: `${L[i]} · ${p.name} at ${fmtZone(I, p)}`, s: p.kind })), { k: "none", label: "None: price hasn't reached a key level", s: "None" }], correct: ev.poi ? ev.poi.id : "none",
    explain: () => report({ kpis: [["Point of interest", ev.poi ? ev.poi.kind : "None"], ["Zone", ev.poi ? fmtZone(I, ev.poi) : "—"], [ev.d > 0 ? "Window low" : "Window high", fp(I, x)], ["Bias", ev.poi ? (ev.bias > 0 ? "Bullish: look for longs" : "Bearish: look for shorts") : "No setup", ev.bias > 0 ? "pos" : ev.bias < 0 ? "neg" : ""]],
      why: ev.poi ? `The ${ev.d > 0 ? "low" : "high"} of the window, ${fp(I, x)} at ${whenOf(G.Sv, ev.s)}, traded into the ${ev.poi.name.toLowerCase()} at ${fmtZone(I, ev.poi)}. It was the first visit since that level formed, so the orders resting there were still untouched.` : `In the last ${ev.W} candles price didn't reach a fresh higher-timeframe point of interest${nearest ? `. The nearest was the ${nearest.name.toLowerCase()} at ${fmtZone(I, nearest)}, ${(Math.abs(mid(nearest) - c) / A).toFixed(1)}× ATR away` : ""}. No location means no trade.`,
      rule: "Location: within the window, price trades into a fresh higher-timeframe point of interest (previous day high or low, a daily, 4h or 1h fair value gap, or a 4h or 1h order block). Bullish points (PDL, bullish FVG or order block) set up longs; bearish ones set up shorts.",
      use: "Location is where the trade idea comes from. The same pattern in the middle of nowhere is a coin flip; at a higher-timeframe level, it's where bigger players are likely to act." }),
    marks: ev.poi ? [{ type: "zone", lo: ev.poi.lo, hi: ev.poi.hi, t0: Math.max(ev.poi.from, G.Sv.ts[0]), color: ev.poi.side > 0 ? C.up : C.down, label: `${ev.poi.kind} ✓` }, { type: "dot", t: G.Sv.ts[ev.s], p: x, color: ev.poi.side > 0 ? C.up : C.down, below: ev.d > 0 }] : [] };
}
function qFVG(S, t) {
  const A = S.atr[t], I = S.I; if (!A || t < 3) return null;
  const bull = S.l[t] > S.h[t - 2] + 0.05 * A, bear = S.h[t] < S.l[t - 2] - 0.05 * A, over = S.l[t] < S.h[t - 2] - 0.15 * A && S.h[t] > S.l[t - 2] + 0.15 * A;
  const k = bull ? "bull" : bear ? "bear" : over ? "none" : null; if (!k) return null;
  const lo = bull ? S.h[t - 2] : bear ? S.h[t] : null, hi = bull ? S.l[t] : bear ? S.l[t - 2] : null;
  return { skill: "candles", kind: "mc", tag: "Fair value gap", title: "Do the last three candles leave a fair value gap?", sub: "Compare the first candle's wick with the third candle's wick. The middle candle is the one that moved.",
    opts: [{ k: "bull", label: "Bullish FVG: the 3rd candle's low is above the 1st candle's high", s: "Bullish FVG" }, { k: "bear", label: "Bearish FVG: the 3rd candle's high is below the 1st candle's low", s: "Bearish FVG" }, { k: "none", label: "No gap: the wicks overlap", s: "No FVG" }], correct: k,
    explain: () => report({ kpis: [["1st candle high", fp(I, S.h[t - 2])], ["1st candle low", fp(I, S.l[t - 2])], ["3rd candle high", fp(I, S.h[t])], ["3rd candle low", fp(I, S.l[t])], ...(lo != null ? [["Gap", `${fnum(I, lo)}–${fnum(I, hi)}`, bull ? "pos" : "neg"]] : [])],
      why: k === "none" ? "The first and third candles' wicks overlap, so every price in the middle candle traded on both sides. There is no imbalance." : `The middle candle moved so fast that the ${bull ? "third candle's low never came back down to the first candle's high" : "third candle's high never came back up to the first candle's low"}. Prices between ${fnum(I, lo)} and ${fnum(I, hi)} only traded one way: that's the fair value gap.`,
      use: "Fair value gaps mark aggressive, one-sided moves. Price often comes back to fill part of them; on higher timeframes they're points of interest, and inside a setup they're the internal entry zone after displacement." }),
    marks: lo != null ? [{ type: "zone", lo, hi, t0: S.ts[t - 2], color: bull ? C.up : C.down, label: bull ? "bullish FVG" : "bearish FVG" }] : [{ type: "box", t0: S.ts[t - 2], t1: S.te[t], color: C.amber, label: "no gap" }] };
}

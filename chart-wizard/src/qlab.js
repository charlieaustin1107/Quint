/* ================= QUINT'S BACKTEST LOOP: describe a strategy and its goals; Quint tests versions in sample and out of sample and keeps the best ================= */
const BL = { run: null, split: 0.5 };
const BL_F = {
  breakout: { name: "Breakout", p: { n: [10, 15, 20, 30, 40, 55] } },
  pullback: { name: "Trend pullback", p: { fast: [10, 20], slow: [50, 100] } },
  meanrev: { name: "Oversold bounce", p: { n: [2, 3, 5], x: [10, 20, 30], slow: [50, 100, 200] } },
  cross: { name: "Average cross", p: { fast: [5, 10, 20], slow: [30, 50, 100] } },
  sweep: { name: "Failed breakout", p: { n: [10, 20, 30, 40] } },
  orb: { name: "New York open range", p: { or: [15, 30, 60], cut: [60, 120, 240], mid: [0, 1] } },
};
const BL_C = { stop: [1, 1.5, 2, 3], tgt: [1, 1.5, 2, 3, 4], hold: [5, 10, 20, 40] };
const BL_SRC = [["tv:5m", "MNQ 5m"], ["tv:15m", "MNQ 15m"], ["tv:1h", "MNQ 1h"], ["tv:1D", "MNQ daily"], ["all", "5 markets daily"]];
const BL_GOALS = () => ({ is: { n: 30, wr: 40, dd: 15, pf: 1.3 }, os: { n: 15, wr: 35, dd: 20, pf: 1.1 } });
const blS = () => { const s = ST.bl || (ST.bl = {}); if (!s.goals || !s.goals.is || !s.goals.os) s.goals = BL_GOALS(); if (!BL_SRC.some(x => x[0] === s.src)) s.src = TS() === "day" ? "tv:15m" : "tv:5m"; if (!(s.cost >= 0)) s.cost = 1.5; if (![400, 2000, 0].includes(s.budget)) s.budget = 2000; return s; };

/* ---------- indicators, kept per series ---------- */
function blInd(B) {
  if (B._i) return B._i; const N = B.c.length, mem = {}, c = B.c;
  const I = B._i = { atr: qtATR(B),
    ema: n => mem["e" + n] || (mem["e" + n] = (() => { const o = new Array(N), k = 2 / (n + 1); o[0] = c[0]; for (let i = 1; i < N; i++) o[i] = c[i] * k + o[i - 1] * (1 - k); return o; })()),
    hh: n => mem["h" + n] || (mem["h" + n] = (() => { const o = new Array(N).fill(Infinity); for (let i = n; i < N; i++) { let m = -Infinity; for (let j = i - n; j < i; j++) if (B.h[j] > m) m = B.h[j]; o[i] = m; } return o; })()), // the highest high of the n candles before i
    ll: n => mem["l" + n] || (mem["l" + n] = (() => { const o = new Array(N).fill(-Infinity); for (let i = n; i < N; i++) { let m = Infinity; for (let j = i - n; j < i; j++) if (B.l[j] < m) m = B.l[j]; o[i] = m; } return o; })()),
    rsi: n => mem["r" + n] || (mem["r" + n] = (() => { const o = new Array(N).fill(50); let g = 0, l = 0; for (let i = 1; i < N; i++) { const d = c[i] - c[i - 1], u = d > 0 ? d : 0, w = d < 0 ? -d : 0; if (i <= n) { g += u / n; l += w / n; } else { g = (g * (n - 1) + u) / n; l = (l * (n - 1) + w) / n; } o[i] = l === 0 ? (g === 0 ? 50 : 100) : 100 - 100 / (1 + g / l); } return o; })()) };
  return I;
}
function blClock(B) { // New York minute-of-day and day number for every candle (intraday series only)
  if (B._c) return B._c; const N = B.c.length, em = new Int16Array(N), ed = new Int32Array(N);
  for (let i = 0; i < N; i++) { const e = etNow(B.t[i] * 1000); em[i] = e.min; ed[i] = e.y * 10000 + e.mo * 100 + e.d; }
  return B._c = { em, ed, tf: N > 1 ? Math.round((B.t[N - 1] - B.t[N - 2]) / 60) || 15 : 15 };
}
function orbEval(V, B, cost, sp, out) { // opening range breakout: the range is the first V.or minutes from 9:30 New York; one trade a day; flat by 15:55
  const C = blClock(B), em = C.em, ed = C.ed, tf = C.tf, N = B.c.length, need = Math.round(V.or / tf); if (tf > 30 || need < 1 || V.or % tf) return;
  let i = 0;
  while (i < N) {
    if (em[i] !== 570) { i++; continue; }
    const day = ed[i]; let hi = -Infinity, lo = Infinity, k = i, cnt = 0;
    for (; k < N && ed[k] === day && em[k] < 570 + V.or; k++) { hi = Math.max(hi, B.h[k]); lo = Math.min(lo, B.l[k]); cnt++; }
    let done = false;
    if (cnt === need && hi > lo) for (; k < N - 1 && ed[k] === day && em[k] < 570 + V.cut; k++) {
      const d = B.c[k] > hi ? 1 : B.c[k] < lo ? -1 : 0; if (!d) continue; if (!(V.dir === "both" || (V.dir === "long") === (d > 0))) continue;
      if (ed[k + 1] !== day) break; const e = B.o[k + 1], st = V.mid ? (hi + lo) / 2 : d > 0 ? lo : hi, sd = (e - st) * d; if (!(sd > 0)) break;
      const tg = V.tgt ? e + d * sd * V.tgt : null; let x = null, j = k + 1;
      for (; j < N && ed[j] === day; j++) {
        if (d > 0) { if (B.l[j] <= st) { x = Math.min(B.o[j], st); break; } if (tg != null && B.h[j] >= tg) { x = tg; break; } }
        else { if (B.h[j] >= st) { x = Math.max(B.o[j], st); break; } if (tg != null && B.l[j] <= tg) { x = tg; break; } }
        if (em[j] + tf >= 955) { x = B.c[j]; break; }
      }
      if (x == null) { j = Math.min(j, N) - 1; x = B.c[j]; }
      out.push({ t: B.t[k + 1], r: (x - e) * d / sd - (cost != null ? cost : e * 5e-5) / sd, is: k + 1 < sp, i: k, j, d, e, st, tg, x, a: i, hi, lo }); done = true; break;
    }
    while (i < N && ed[i] === day) i++;
  }
}
function blSig(V, B, I, i) { // +1 buy, -1 sell, 0 nothing, from data up to the close of candle i
  const c = B.c[i]; let d = 0;
  if (V.f === "breakout") d = c > I.hh(V.n)[i] ? 1 : c < I.ll(V.n)[i] ? -1 : 0;
  else if (V.f === "pullback") { const f = I.ema(V.fast)[i], s = I.ema(V.slow)[i]; d = f > s && c > s && B.l[i] <= f && c > f && c > B.o[i] ? 1 : f < s && c < s && B.h[i] >= f && c < f && c < B.o[i] ? -1 : 0; }
  else if (V.f === "meanrev") { const r = I.rsi(V.n)[i], s = I.ema(V.slow)[i]; d = r < V.x && c > s ? 1 : r > 100 - V.x && c < s ? -1 : 0; }
  else if (V.f === "cross") { const f = I.ema(V.fast), s = I.ema(V.slow); d = f[i] > s[i] && f[i - 1] <= s[i - 1] ? 1 : f[i] < s[i] && f[i - 1] >= s[i - 1] ? -1 : 0; }
  else if (V.f === "sweep") { const lo = I.ll(V.n)[i], hi = I.hh(V.n)[i]; d = B.l[i] < lo && c > lo ? 1 : B.h[i] > hi && c < hi ? -1 : 0; }
  return d && (V.dir === "both" || (V.dir === "long") === (d > 0)) ? d : 0;
}
function blEval(V, S, cost) { // every closed trade: one position at a time, in at the next open, stop checked before target inside a candle
  const out = [];
  for (let si = 0; si < S.length; si++) {
    const B = S[si], n = B.c.length, sp = Math.floor(n * BL.split), I = blInd(B), A = I.atr, o = B.o, h = B.h, l = B.l, c = B.c, cst = cost >= 0 && B.pts ? cost : null;
    if (V.f === "orb") { if (B.pts) orbEval(V, B, cst, sp, out); continue; }
    let i = Math.max(V.slow || 0, V.n || 0, V.fast || 0, 15) + 1;
    while (i < n - 1) {
      const d = blSig(V, B, I, i); if (!d || !(A[i] > 0)) { i++; continue; }
      const e = o[i + 1], sd = V.stop * A[i], st = e - d * sd, tg = e + d * sd * V.tgt; let x = null, j = i + 1;
      for (; j < n; j++) {
        if (d > 0) { if (l[j] <= st) { x = Math.min(o[j], st); break; } if (h[j] >= tg) { x = tg; break; } }
        else { if (h[j] >= st) { x = Math.max(o[j], st); break; } if (l[j] <= tg) { x = tg; break; } }
        if (j - i >= V.hold) { x = c[j]; break; }
      }
      if (x == null) break; // still open when the data ends: not counted
      out.push({ t: B.t[i + 1], r: (x - e) * d / sd - (cst != null ? cst : e * 5e-5) / sd, is: i + 1 < sp, i, j, d, e, st, tg, x }); i = j;
    }
  }
  if (S.length > 1) out.sort((a, b) => a.t < b.t ? -1 : a.t > b.t ? 1 : 0);
  return out;
}
function blStats(tr) { // risking 1% of the account on each trade
  let n = tr.length, w = 0, gw = 0, gl = 0, tot = 0, eq = 1, pk = 1, dd = 0;
  for (const x of tr) { if (x.r > 0) { w++; gw += x.r; } else gl -= x.r; tot += x.r; eq *= 1 + 0.01 * x.r; if (eq > pk) pk = eq; dd = Math.max(dd, (pk - eq) / pk); }
  return { n, wr: n ? w / n * 100 : 0, pf: gl > 0 ? gw / gl : gw > 0 ? 9.99 : 0, tot, avg: n ? tot / n : 0, dd: dd * 100 };
}
const blPass = (s, g) => s.n >= g.n && s.wr >= g.wr && s.dd <= g.dd && s.pf >= g.pf;
function blScore(is, os, G, pass) {
  if (pass) return 100 + clamp(os.pf, 0, 5) * 4 + clamp(os.tot, 0, 60) * 0.4 + clamp(is.pf, 0, 5);
  const part = (s, g) => Math.min(1, s.n / g.n) + Math.min(1, s.wr / g.wr) + Math.min(1, g.dd / Math.max(s.dd, 0.01)) + Math.min(1, s.pf / g.pf);
  return (part(is, G.is) + part(os, G.os) * 1.5) / 10 * 100 * (os.n >= 5 ? 1 : 0.5);
}
const blKey = V => [V.f, V.n, V.fast, V.slow, V.x, V.stop, V.tgt, V.hold, V.dir, V.or, V.cut, V.mid].join("|");
function blFix(V) { // make a variant Quint proposed safe to run
  if (V && V.f === "orb") return { f: "orb", or: [15, 30, 60].includes(+V.or) ? +V.or : 15, cut: [60, 120, 240].includes(+V.cut) ? +V.cut : 120, mid: V.mid ? 1 : 0, tgt: [0, 1, 1.5, 2, 3].includes(+V.tgt) ? +V.tgt : 2, dir: ["long", "short", "both"].includes(V.dir) ? V.dir : "both" };
  if (!V || !BL_F[V.f]) return null; const num = (v, a, b, d) => isFinite(+v) ? clamp(+v, a, b) : d, o = { f: V.f, stop: num(V.stop, 0.5, 5, 1.5), tgt: num(V.tgt, 0.5, 6, 2), hold: Math.round(num(V.hold, 2, 80, 20)), dir: ["long", "short", "both"].includes(V.dir) ? V.dir : "both" };
  if (V.f === "breakout" || V.f === "sweep") o.n = Math.round(num(V.n, 5, 100, 20));
  if (V.f === "pullback" || V.f === "cross") { o.fast = Math.round(num(V.fast, 3, 50, 20)); o.slow = Math.round(num(V.slow, 20, 200, 50)); if (o.fast >= o.slow) o.slow = o.fast * 2 + 10; }
  if (V.f === "meanrev") { o.n = Math.round(num(V.n, 2, 14, 2)); o.x = Math.round(num(V.x, 5, 45, 20)); o.slow = Math.round(num(V.slow, 20, 200, 100)); }
  return o;
}
function blSpace(fams, dirs) {
  const out = [];
  for (const f of fams) { if (f === "orb") { for (const or of [15, 30, 60]) for (const cut of [60, 120, 240]) for (const mid of [0, 1]) for (const tgt of [0, 1, 1.5, 2, 3]) for (const dir of dirs) out.push({ f, or, cut, mid, tgt, dir }); continue; } const P = BL_F[f].p, keys = Object.keys(P), rec = (k, cur) => { if (k === keys.length) { if (cur.fast && cur.slow && cur.fast >= cur.slow) return; for (const stop of BL_C.stop) for (const tgt of BL_C.tgt) for (const hold of BL_C.hold) for (const dir of dirs) out.push(Object.assign({ f, stop, tgt, hold, dir }, cur)); return; } for (const v of P[keys[k]]) rec(k + 1, Object.assign({}, cur, { [keys[k]]: v })); }; rec(0, {}); }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)), t = out[i]; out[i] = out[j]; out[j] = t; }
  return out;
}
function blRules(V, unit = "candles") {
  if (V.f === "orb") return `Mark the high and low of the first ${V.or} minutes after the US open (9:30 New York, 2:30pm UK). ${V.dir === "short" ? "Sell short when a candle closes below the low" : V.dir === "long" ? "Buy when a candle closes above the high" : "Buy when a candle closes above the high; sell short when one closes below the low"}, within ${V.cut >= 120 ? V.cut / 60 + " hours" : V.cut + " minutes"} of the open. One trade a day. Stop at the ${V.mid ? "middle" : "other side"} of the range; ${V.tgt ? `target ${V.tgt}× the risk` : "no target: hold"}; out by 3:55pm New York whatever happens.`;
  const L = V.dir !== "short", S = V.dir !== "long", both = (a, b) => [L ? a : "", S ? b : ""].filter(Boolean).join(" ");
  const sig = V.f === "breakout" ? both(`Buy when a candle closes above the highest high of the previous ${V.n} ${unit}.`, `Sell short when a candle closes below the lowest low of the previous ${V.n} ${unit}.`)
    : V.f === "pullback" ? both(`Buy when the ${V.fast} EMA is above the ${V.slow} EMA and a candle dips to the ${V.fast} EMA, then closes back above it as a green candle.`, `Sell short on the mirror image when the ${V.fast} EMA is below the ${V.slow} EMA.`)
    : V.f === "meanrev" ? both(`Buy when RSI(${V.n}) drops below ${V.x} while price is above the ${V.slow} EMA.`, `Sell short when RSI(${V.n}) rises above ${100 - V.x} while price is below the ${V.slow} EMA.`)
    : V.f === "cross" ? both(`Buy when the ${V.fast} EMA crosses above the ${V.slow} EMA.`, `Sell short when it crosses below.`)
    : both(`Buy when price dips below the lowest low of the previous ${V.n} ${unit} but closes back above it (a failed breakdown).`, `Sell short when price pokes above the highest high of the previous ${V.n} ${unit} but closes back below it.`);
  return `${sig} Enter at the next candle's open. Stop ${V.stop}× ATR(14) away; target ${V.tgt}× the stop (${V.tgt}R); close after ${V.hold} ${unit} if neither is hit.`;
}
const blName = V => V.f === "orb" ? `New York open · ${V.or}-min range · ${V.dir === "both" ? "long & short" : V.dir + " only"} · stop ${V.mid ? "mid-range" : "far side"} · ${V.tgt ? V.tgt + "R" : "hold to close"}` : `${BL_F[V.f].name} ${V.f === "breakout" || V.f === "sweep" ? V.n : V.f === "meanrev" ? `RSI${V.n}<${V.x}` : `${V.fast}/${V.slow}`} · ${V.dir === "both" ? "long & short" : V.dir + " only"} · stop ${V.stop} ATR · ${V.tgt}R · ${V.hold} bars`;
function blPine(V) { // the same rules as a TradingView strategy
  if (V.f === "orb") return `//@version=6
strategy("Quint: ${blName(V)}", overlay = true, initial_capital = 50000, default_qty_type = strategy.fixed, default_qty_value = 1, commission_type = strategy.commission.cash_per_contract, commission_value = 0.75, slippage = 1, margin_long = 10, margin_short = 10)
// Made by Quint's backtest loop in Chart Wizard. Use it on a ${V.or >= 30 ? "15 or 5" : "15, 5 or 1"} minute chart. Education only, not financial advice.
orMin = input.int(${V.or}, "Opening range (minutes)")
tgtMult = input.float(${V.tgt}, "Target (x risk, 0 = hold to the close)", step = 0.5)
cutMin = input.int(${V.cut}, "No new entries after this many minutes")
useMid = input.bool(${V.mid ? "true" : "false"}, "Stop at the middle of the range")
mins = hour(time, "America/New_York") * 60 + minute(time, "America/New_York") - 570
inSess = mins >= 0 and mins < 390 and dayofweek(time, "America/New_York") != dayofweek.saturday and dayofweek(time, "America/New_York") != dayofweek.sunday
var float hi = na
var float lo = na
var bool done = true
if inSess and mins == 0
    hi := high
    lo := low
    done := false
else if inSess and mins < orMin
    hi := math.max(hi, high)
    lo := math.min(lo, low)
canEnter = inSess and mins >= orMin and mins < cutMin and not done and strategy.position_size == 0
if canEnter and close > hi and ${V.dir !== "short"}
    done := true
    strategy.entry("L", strategy.long)
if canEnter and close < lo and ${V.dir !== "long"}
    done := true
    strategy.entry("S", strategy.short)
stopL = useMid ? (hi + lo) / 2 : lo
stopS = useMid ? (hi + lo) / 2 : hi
if strategy.position_size > 0
    riskL = strategy.position_avg_price - stopL
    strategy.exit("XL", "L", stop = stopL, limit = tgtMult > 0 ? strategy.position_avg_price + riskL * tgtMult : na)
if strategy.position_size < 0
    riskS = stopS - strategy.position_avg_price
    strategy.exit("XS", "S", stop = stopS, limit = tgtMult > 0 ? strategy.position_avg_price - riskS * tgtMult : na)
if strategy.position_size != 0 and mins >= 385
    strategy.close_all("Close")
plot(inSess and mins >= orMin ? hi : na, "Range high", color.new(color.teal, 0), style = plot.style_linebr)
plot(inSess and mins >= orMin ? lo : na, "Range low", color.new(color.red, 0), style = plot.style_linebr)
`;
  const L = V.dir !== "short", S = V.dir !== "long";
  const sig = V.f === "breakout" ? [`longSig = close > ta.highest(high, ${V.n})[1]`, `shortSig = close < ta.lowest(low, ${V.n})[1]`]
    : V.f === "pullback" ? [`f = ta.ema(close, ${V.fast})`, `s = ta.ema(close, ${V.slow})`, `longSig = f > s and close > s and low <= f and close > f and close > open`, `shortSig = f < s and close < s and high >= f and close < f and close < open`]
    : V.f === "meanrev" ? [`r = ta.rsi(close, ${V.n})`, `s = ta.ema(close, ${V.slow})`, `longSig = r < ${V.x} and close > s`, `shortSig = r > ${100 - V.x} and close < s`]
    : V.f === "cross" ? [`f = ta.ema(close, ${V.fast})`, `s = ta.ema(close, ${V.slow})`, `longSig = ta.crossover(f, s)`, `shortSig = ta.crossunder(f, s)`]
    : [`ll = ta.lowest(low, ${V.n})[1]`, `hh = ta.highest(high, ${V.n})[1]`, `longSig = low < ll and close > ll`, `shortSig = high > hh and close < hh`];
  return `//@version=6
strategy("Quint: ${blName(V).replace(/"/g, "")}", overlay = true, initial_capital = 50000, default_qty_type = strategy.fixed, default_qty_value = 1, commission_type = strategy.commission.cash_per_contract, commission_value = 0.75, slippage = 1, margin_long = 10, margin_short = 10)
// Made by Quint's backtest loop in Chart Wizard. Education only, not financial advice.
stopMult = input.float(${V.stop}, "Stop (x ATR)", step = 0.25)
tgtMult = input.float(${V.tgt}, "Target (x stop)", step = 0.25)
maxBars = input.int(${V.hold}, "Close after this many bars")
atr = ta.atr(14)
${sig.join("\n")}
var float sd = na
if strategy.position_size == 0
    if ${L ? "longSig" : "false"}
        sd := atr * stopMult
        strategy.entry("L", strategy.long)
    else if ${S ? "shortSig" : "false"}
        sd := atr * stopMult
        strategy.entry("S", strategy.short)
if strategy.position_size > 0
    strategy.exit("XL", "L", stop = strategy.position_avg_price - sd, limit = strategy.position_avg_price + sd * tgtMult)
if strategy.position_size < 0
    strategy.exit("XS", "S", stop = strategy.position_avg_price + sd, limit = strategy.position_avg_price - sd * tgtMult)
if strategy.position_size != 0 and bar_index - strategy.opentrades.entry_bar_index(0) >= maxBars
    strategy.close_all("Time")
`;
}

/* ---------- Quint turns the user's words into a search plan ---------- */
async function blPlan(desc) {
  const prompt = `You turn a trader's strategy description into settings for a backtester. Reply with JSON only, no prose and no code fence.
The backtester knows five rule families:
- "breakout" (n 10 to 55): enter when a candle closes beyond the highest high or lowest low of the previous n candles.
- "pullback" (fast 10 or 20, slow 50 or 100): trend is the fast EMA against the slow EMA; enter when price dips to the fast EMA and closes back beyond it.
- "meanrev" (n 2 to 5, x 10 to 30, slow 50 to 200): buy when RSI(n) is below x while price is above the slow EMA; mirror for sells.
- "cross" (fast 5 to 20, slow 30 to 100): the fast EMA crosses the slow EMA.
- "sweep" (n 10 to 40): price pokes beyond the previous n-candle low or high and closes back inside (a failed breakout or liquidity sweep); trade the reversal.
- "orb" (or 15, 30 or 60; cut 60, 120 or 240; mid 0 or 1; tgt 0, 1, 1.5, 2 or 3): New York opening range breakout. The range is the first "or" minutes from 9:30 New York; enter on a close beyond it within "cut" minutes; stop at the far side (mid 0) or the middle (mid 1) of the range; tgt 0 holds to the close. Use it for anything about the open, the opening range, ORB or the first candles of the US session. Its seeds use only f, or, cut, mid, tgt, dir.
Every other variant also has: stop (ATR multiples, 1 to 3), tgt (reward as a multiple of the stop, 1 to 4), hold (maximum candles in the trade, 5 to 40), dir ("long", "short" or "both").
JSON shape: {"families":["pullback"],"dir":"both","seeds":[{"f":"pullback","fast":20,"slow":50,"stop":1.5,"tgt":2,"hold":20,"dir":"both"}],"note":"one plain sentence on how you read the description and anything it asks for that these families cannot express"}
Pick the 1 to 3 families that match best and up to 6 seeds close to the description. "dir" is "both" unless the description clearly wants only buys or only sells. If nothing fits, pick the nearest family and say so in note.
Description: """${String(desc).slice(0, 800)}"""`;
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 40000);
  try { const r = await CO.sample(prompt, { signal: ctl.signal, modelTier: "quick" }), k = /\{[\s\S]*\}/.exec((r && r.text) || ""), j = k ? JSON.parse(k[0]) : null; if (!j) return null;
    const fams = (Array.isArray(j.families) ? j.families : []).filter(f => BL_F[f]).slice(0, 3), seeds = (Array.isArray(j.seeds) ? j.seeds : []).map(blFix).filter(Boolean).slice(0, 6);
    return { fams: fams.length ? fams : seeds.length ? [...new Set(seeds.map(s => s.f))] : null, dir: ["long", "short"].includes(j.dir) ? j.dir : "both", seeds, note: String(j.note || "").slice(0, 300) }; }
  catch (e) { return null; } finally { clearTimeout(tm); }
}

/* ---------- the loop ---------- */
async function blStart() {
  const s = blS(), out = $("#blOut"); if (!out || (BL.run && BL.run.on)) return;
  const R = BL.run = { on: true, phase: "data", i: 0, q: [], top: [], pIS: 0, pBoth: 0, G: JSON.parse(JSON.stringify(s.goals)), src: s.src, desc: (s.desc || "").trim(), cost: s.cost, t0: Date.now(), T: {}, note: "", last: 0 };
  blPaint();
  try { if (s.src === "all") R.S = Object.keys(INST).map(k => ({ name: INST[k].short, t: INST[k].d, o: INST[k].o, h: INST[k].h, l: INST[k].l, c: INST[k].c })); else { const B = await qtBars(s.src.slice(3)); B.pts = true; R.S = [B]; } }
  catch (e) { R.on = false; R.err = tvErr(e) + " You can still run it on the built-in daily data: pick “5 markets daily”."; blPaint(); return; }
  if (BL.run !== R) return;
  const orbOK = s.src === "tv:5m" || s.src === "tv:15m";
  R.bars = R.S.reduce((a, B) => a + B.c.length, 0); let fams = Object.keys(BL_F).filter(f => f !== "orb" || orbOK), dirs = ["long", "short", "both"], seeds = [];
  if (R.desc && CO.sample) { R.phase = "plan"; blPaint(); const P = await blPlan(R.desc); if (BL.run !== R) return; if (P) { if (P.fams) { fams = P.fams.filter(f => f !== "orb" || orbOK); if (!fams.length) { fams = Object.keys(BL_F).filter(f => f !== "orb"); P.note = (P.note ? P.note + " " : "") + "The New York open strategy needs 5m or 15m MNQ candles, so pick one of those to test it."; } } if (P.dir !== "both") dirs = [P.dir]; seeds = P.seeds; R.note = P.note; R.planned = true; } }
  const seen = new Set(), q = []; for (const V of seeds.concat(blSpace(fams, dirs))) { const k = blKey(V); if (!seen.has(k)) { seen.add(k); q.push(V); } }
  R.q = s.budget ? q.slice(0, s.budget) : q; R.fams = fams; R.phase = "loop"; blStep();
}
function blStep() {
  const R = BL.run; if (!R || !R.on) return; if (!$("#blOut")) { R.on = false; return; } // the sheet was closed
  const t = performance.now();
  while (R.i < R.q.length && performance.now() - t < 14) {
    const V = R.q[R.i++], tr = blEval(V, R.S, R.cost), a = tr.filter(x => x.is), b = tr.filter(x => !x.is), is = blStats(a), os = blStats(b), pi = blPass(is, R.G.is), po = blPass(os, R.G.os);
    if (pi) R.pIS++; if (pi && po) R.pBoth++;
    const sc = blScore(is, os, R.G, pi && po);
    if (R.top.length < 5 || sc > R.top[R.top.length - 1].sc) { R.top.push({ V, is, os, sc, pass: pi && po, eq: a.concat(b).map(x => x.r), nis: a.length }); R.top.sort((x, y) => y.sc - x.sc); if (R.top.length > 5) R.top.length = 5; }
  }
  if (R.i >= R.q.length) { R.on = false; R.phase = "done"; R.ms = Date.now() - R.t0; const b = R.top[0]; if (b) { const os = b.eq.slice(b.nis); let pos = 0; if (os.length) for (let k = 0; k < 400; k++) { let s2 = 0; for (let j = 0; j < os.length; j++) s2 += os[Math.floor(Math.random() * os.length)]; if (s2 > 0) pos++; } b.luck = os.length ? pos / 4 : null; } blPaint(); return; }
  if (performance.now() - R.last > 160) { R.last = performance.now(); blPaint(); }
  setTimeout(blStep, 0);
}
function blEqSVG(x) {
  const W = 300, H = 84, n = x.eq.length; if (n < 2) return ""; let c = 0, lo = 0, hi = 0; const pts = [0]; for (const r of x.eq) { c += r; pts.push(c); lo = Math.min(lo, c); hi = Math.max(hi, c); }
  const Y = v => 6 + (hi - v) / ((hi - lo) || 1) * (H - 12), X = i => i / n * W, sx = X(x.nis), path = (a, b) => pts.slice(a, b + 1).map((v, k) => `${X(a + k).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  return `<svg class="bleq" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Running total of R: in sample first, then out of sample"><rect x="${sx.toFixed(1)}" y="0" width="${(W - sx).toFixed(1)}" height="${H}" fill="rgba(167,139,250,.10)"/><line x1="0" x2="${W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="rgba(127,147,184,.35)" stroke-dasharray="3 3"/><polyline points="${path(0, x.nis)}" fill="none" stroke="#22d3ee" stroke-width="1.6" vector-effect="non-scaling-stroke"/><polyline points="${path(x.nis, n)}" fill="none" stroke="#c4b5fd" stroke-width="1.6" stroke-dasharray="4 2" vector-effect="non-scaling-stroke"/></svg><div class="bleqk"><span><i style="background:#22d3ee"></i>In sample</span><span><i style="background:#c4b5fd"></i>Out of sample</span></div>`;
}
function blCard(x, k, R) {
  const G = R.G, ok = (v, g, less) => `<td class="${(less ? v <= g : v >= g) ? "ok" : "no"}">`, row = (lab, f, key, less) => `<tr><th>${lab}</th>${ok(x.is[key], G.is[key], less)}${f(x.is[key])}</td>${ok(x.os[key], G.os[key], less)}${f(x.os[key])}</td><td class="g">${less ? "≤" : "≥"} ${f(G.is[key])} / ${f(G.os[key])}</td></tr>`;
  const unit = R.src === "all" || R.src === "tv:1D" ? "days" : "candles";
  return `<article class="blcard${x.pass ? " pass" : ""}"><header><b>${k === 0 ? "Best so far" : "#" + (k + 1)} · ${esc(blName(x.V))}</b><span class="${x.pass ? "ok" : "no"}">${x.pass ? "✓ passes" : "✗ fails a goal"}</span></header>
    <p class="small">${esc(blRules(x.V, unit))}</p>${blEqSVG(x)}
    <div class="qttab"><table><thead><tr><th></th><th>In sample</th><th>Out of sample</th><th>Goal</th></tr></thead><tbody>${row("Closed trades", v => Math.round(v), "n")}${row("Win rate", v => v.toFixed(0) + "%", "wr")}${row("Max drawdown", v => v.toFixed(1) + "%", "dd", true)}${row("Profit factor", v => v.toFixed(2), "pf")}<tr><th>Total</th><td>${x.is.tot >= 0 ? "+" : ""}${x.is.tot.toFixed(1)}R</td><td>${x.os.tot >= 0 ? "+" : ""}${x.os.tot.toFixed(1)}R</td><td class="g">1R = your risk</td></tr></tbody></table></div>
    ${k === 0 && R.phase === "done" ? `${x.luck != null ? `<p class="small">Luck check: reshuffling the out-of-sample trades, the total stayed positive ${x.luck.toFixed(0)}% of the time. ${x.luck >= 90 ? "That's steady." : x.luck >= 70 ? "That's shaky: a few trades carry it." : "That's close to a coin flip."}</p>` : ""}
    <div class="qtrow"><button class="btn pri" id="blSave">★ Save as my strategy</button><button class="btn" id="blVerdict" ${CO.sample ? "" : "disabled"}>✦ Quint's verdict</button></div><div class="nwq" id="blQ" ${R.T.text || R.T.busy || R.T.err ? "" : "hidden"}>${qtQ(R.T)}${R.T.text && !R.T.busy ? sayBtn() : ""}</div>
    <details class="blpine"><summary>Take it to TradingView (Pine code)</summary><pre id="blCode">${esc(blPine(x.V))}</pre><div class="qtrow"><button class="btn" id="blCopy">Copy code</button><button class="btn" id="blTV" ${MK.mcp && MK.st === "ready" ? "" : "disabled"}>Save to my TradingView</button>${R.src !== "all" ? `<button class="btn" id="blChk" ${MK.mcp && MK.st === "ready" ? "" : "disabled"}>Check it on TradingView</button>` : ""}</div><div id="blChkOut"></div><p class="small" id="blTVs">TradingView fills orders a little differently and tests its whole chart history in one go, so its numbers won't match these exactly.</p></details>` : ""}</article>`;
}
function blVerdictPrompt(R) {
  const f = s => `${s.n} trades, ${s.wr.toFixed(0)}% wins, profit factor ${s.pf.toFixed(2)}, max drawdown ${s.dd.toFixed(1)}%, total ${s.tot.toFixed(1)}R, average ${s.avg.toFixed(2)}R`;
  return `You are Quint, the trading mentor inside Chart Wizard. You just ran a backtest loop for the user and must give an honest verdict. ${myLine()}
What they asked for: ${R.desc ? `"${R.desc.slice(0, 600)}"` : "no description; a broad search of five well-known rule families"}.${R.note ? ` How it was read: ${R.note}` : ""}
Data: ${R.src === "all" ? "one year of daily candles on Nasdaq, S&P 500, gold, crude oil and Bitcoin futures, pooled" : `real MNQ ${R.src.slice(3)} candles from TradingView (${R.bars} candles)`}. The first half found the rules (in sample); the second half checked them (out of sample). Each trade risks 1% of the account; costs of ${R.src === "all" ? "0.005% of price" : R.cost + " points"} a trade are included.
The loop: ${R.i} versions tested; ${R.pIS} met the goals in sample; only ${R.pBoth} also met them out of sample.
Goals: in sample at least ${R.G.is.n} trades, ${R.G.is.wr}% wins, profit factor ${R.G.is.pf}, drawdown at most ${R.G.is.dd}%; out of sample at least ${R.G.os.n} trades, ${R.G.os.wr}% wins, profit factor ${R.G.os.pf}, drawdown at most ${R.G.os.dd}%.
Top results:
${R.top.slice(0, 3).map((x, i) => `${i + 1}. ${blName(x.V)} (${x.pass ? "PASSES" : "fails"}). Rules: ${blRules(x.V)} In sample: ${f(x.is)}. Out of sample: ${f(x.os)}.${i === 0 && x.luck != null ? ` Reshuffled out-of-sample total positive ${x.luck.toFixed(0)}% of the time.` : ""}`).join("\n")}
Rules: use only these numbers. Be blunt about overfitting: testing ${R.i} versions means the best one is partly luck, small trade counts prove little, and a backtest is not a promise of profit. Never promise results. Education, not financial advice.
Answer in short simple sentences:
### Verdict
(one of: worth practising on paper / not yet / no, and why in two sentences)
### How it trades
(the best version's rules in plain words, when it tends to win and when it gets hurt)
### How much to trust it
### What to do next
(two or three concrete steps: for example practise it on the real-MNQ practice screen, tighten or loosen one goal, test another timeframe)`;
}
function blPaint() {
  const out = $("#blOut"), go = $("#blGo"); if (!out) return; const R = BL.run;
  if (go) { go.textContent = R && R.on ? "■ Stop" : R ? "Run the loop again" : "▶ Start the loop"; }
  if (!R) { out.innerHTML = ""; return; }
  if (R.err) { out.innerHTML = `<p class="nwerr">${esc(R.err)}</p>`; return; }
  const pct = R.q.length ? R.i / R.q.length * 100 : 0, st = R.phase === "data" ? "Loading candles…" : R.phase === "plan" ? "Quint is turning your words into rules…" : R.phase === "loop" ? `Writing, testing, rejecting… ${R.i.toLocaleString()} of ${R.q.length.toLocaleString()}` : `Done: ${R.i.toLocaleString()} versions in ${(R.ms / 1000).toFixed(1)}s`;
  out.innerHTML = `<div class="blstat"><b>${esc(st)}</b><div class="blbar"><i style="width:${pct.toFixed(1)}%"></i></div>${R.phase === "loop" || R.phase === "done" ? `<div class="blnums"><span><b>${R.i.toLocaleString()}</b>tested</span><span><b>${(R.i - R.pIS).toLocaleString()}</b>rejected in sample</span><span><b>${(R.pIS - R.pBoth).toLocaleString()}</b>fell apart out of sample</span><span class="ok"><b>${R.pBoth.toLocaleString()}</b>passed both</span></div>` : ""}${R.note ? `<p class="small">Quint read your idea as: ${esc(R.note)}</p>` : R.desc && R.phase !== "data" && R.phase !== "plan" && !R.planned ? `<p class="small">Quint couldn't turn the description into rules just now, so this searched all five rule families.</p>` : ""}</div>
    ${R.top.map((x, k) => blCard(x, k, R)).join("")}
    ${R.phase === "done" ? `<p class="small">${R.pBoth ? `${R.pBoth} of ${R.i.toLocaleString()} versions passed.` : "Nothing passed every goal. That is a real answer: most ideas don't survive data they haven't seen. The closest ones are shown."} The more versions you try, the more likely the best one is luck, so treat a pass as "worth practising", never as proof.</p>${cite("bailey")}` : ""}`;
  const b = R.top[0]; if (!b || R.phase !== "done") return;
  const sv = $("#blSave"); if (sv) sv.onclick = () => { ST.mystrat = { desc: R.desc, rules: blRules(b.V), name: blName(b.V), src: R.src, at: Date.now(), os: { n: b.os.n, wr: Math.round(b.os.wr), pf: +b.os.pf.toFixed(2) }, pass: b.pass }; save(); qtPaintHome(); blMine(); qtToast("Saved. Quint now coaches you on this strategy."); };
  const vd = $("#blVerdict"); if (vd) vd.onclick = () => { const p = nwAsk(R.T, blVerdictPrompt(R), () => { const o = $("#blQ"); if (o) { o.hidden = false; o.innerHTML = qtQ(R.T); } }); vd.disabled = true; vd.textContent = "Quint is thinking…"; if (p && p.then) p.then(blPaint); };
  bindSay(out, () => R.T.text);
  const code = blPine(b.V), cp = $("#blCopy"), tv = $("#blTV");
  if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(code); qtToast("Pine code copied."); } catch (e) { const r = document.createRange(); r.selectNodeContents($("#blCode")); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); qtToast("Code selected: copy it from the menu."); } };
  const ck = $("#blChk"); if (ck) ck.onclick = async () => { ck.disabled = true; ck.textContent = "TradingView is testing…"; const o = $("#blChkOut");
    try { const p = await tvCall("mcp-tv-run-pine-backtest", { code, symbol: TV_MNQ, timeframe: R.src.slice(3), include_trades: 1 }, false), a = (((p || {}).report || {}).performance || {}).all || {}, rg = (((p || {}).report || {}).range || {}).backtest || {}, n = +a.total_trades || 0;
      o.innerHTML = n ? `<div class="qtres"><div><small>TradingView: trades</small><b>${n}</b></div><div><small>Win rate</small><b>${a.percent_profitable != null ? (a.percent_profitable * 100).toFixed(0) + "%" : "—"}</b></div><div><small>Profit factor</small><b class="${a.profit_factor >= 1 ? "pos" : "neg"}">${a.profit_factor != null ? (+a.profit_factor).toFixed(2) : "—"}</b></div><div><small>Net, 1 MNQ, after costs</small><b class="${a.net_profit >= 0 ? "pos" : "neg"}">${a.net_profit >= 0 ? "+" : "−"}$${Math.abs(+a.net_profit || 0).toFixed(0)}</b></div><div><small>Worst drawdown, 1 MNQ</small><b>$${(+a.max_drawdown || 0).toFixed(0)}</b></div><div><small>Tested</small><b style="font-size:13px">${rg.from ? esc(new Date(rg.from).toLocaleDateString()) + " – " + esc(new Date(rg.to).toLocaleDateString()) : "—"}</b></div></div>` : `<p class="small">TradingView ran it but took no trades in its chart history.</p>`; ck.textContent = "Checked ✓"; }
    catch (e) { o.innerHTML = `<p class="nwerr">${esc(tvErr(e))}</p>`; ck.disabled = false; ck.textContent = "Check it on TradingView"; } };
  if (tv) tv.onclick = async () => { tv.disabled = true; tv.textContent = "Saving…"; const note = $("#blTVs");
    try { const p = await tvCall("mcp-tv-create-pine-script", { code, name: ("Quint " + blName(b.V)).slice(0, 120) }, false); note.textContent = `Saved to your TradingView scripts${p && (p.name || (p.data && p.data.name)) ? ` as “${p.name || p.data.name}”` : ""}. Open the Pine Editor on TradingView to add it to your MNQ chart.`; tv.textContent = "Saved ✓"; }
    catch (e) { note.textContent = /name_taken/i.test(String(e && e.message)) ? "You already have a script with this name on TradingView." : tvErr(e); tv.disabled = false; tv.textContent = "Save to my TradingView"; } };
}
function blMine() {
  const el = $("#blMine"); if (!el) return; const m = ST.mystrat;
  el.innerHTML = m && m.rules ? `<div class="blmine"><b>★ My strategy: ${esc(m.name || "")}</b><p class="small">${esc(m.rules)}${m.os ? ` Out of sample: ${m.os.n} trades, ${m.os.wr}% wins, profit factor ${m.os.pf}.` : ""}</p><div class="qtrow"><button class="chip" id="blPrac">🎯 Practise it on real MNQ</button><button class="chip" id="blForget">Remove</button></div></div>` : "";
  const p = $("#blPrac"); if (p) p.onclick = openPrac; const f = $("#blForget"); if (f) f.onclick = () => { delete ST.mystrat; save(); qtPaintHome(); blMine(); };
}
function openBL() {
  const s = blS(), g = (side, key, step) => `<input type="number" inputmode="decimal" step="${step}" min="0" data-s="${side}" data-k="${key}" value="${s.goals[side][key]}" aria-label="${side === "is" ? "In sample" : "Out of sample"} ${key}">`;
  openSheet(`${shead("🧪 Quint's backtest loop")}<p class="small">Describe a strategy and what it must pass. Quint turns your words into rules, tests version after version on real MNQ candles, rejects what fails, and keeps the best. The first half of the data finds the rules (<b>in sample</b>); the second half, which the search never saw, checks them (<b>out of sample</b>).</p>
    <div id="blMine"></div>
    <textarea id="blDesc" class="qtin" rows="3" placeholder="Your strategy in your own words, e.g. buy pullbacks to the 20 EMA when the trend is up, stop 1.5 ATR, aim for 2R. Leave empty to search everything." aria-label="Describe your strategy">${esc(s.desc || "")}</textarea>
    <h3>Test it on</h3><div class="chips" id="blSrc">${BL_SRC.map(([k, n]) => `<button class="chip" data-k="${k}" aria-pressed="${s.src === k}">${n}</button>`).join("")}</div>
    <h3>What it must pass</h3><div class="qttab blgoals"><table><thead><tr><th></th><th>In sample</th><th>Out of sample</th></tr></thead><tbody>
      <tr><th>Closed trades ≥</th><td>${g("is", "n", 1)}</td><td>${g("os", "n", 1)}</td></tr><tr><th>Win rate ≥ %</th><td>${g("is", "wr", 1)}</td><td>${g("os", "wr", 1)}</td></tr>
      <tr><th>Max drawdown ≤ %</th><td>${g("is", "dd", 1)}</td><td>${g("os", "dd", 1)}</td></tr><tr><th>Profit factor ≥</th><td>${g("is", "pf", 0.1)}</td><td>${g("os", "pf", 0.1)}</td></tr></tbody></table></div>
    <div class="qtform"><label>Costs per trade (MNQ points)<input id="blCost" type="number" inputmode="decimal" min="0" step="0.25" value="${s.cost}"></label><label>How hard to search<select id="blBud"><option value="400"${s.budget === 400 ? " selected" : ""}>Quick · 400 versions</option><option value="2000"${s.budget === 2000 ? " selected" : ""}>Standard · 2,000</option><option value="0"${s.budget === 0 ? " selected" : ""}>Deep · every version</option></select></label></div>
    <p class="small">Each trade risks 1% of the account. Profit factor is money won divided by money lost; above 1 makes money.</p>
    <button class="btn pri qtwide" id="blGo">▶ Start the loop</button><div id="blOut"></div>`, sh => {
    const keep = () => { s.desc = $("#blDesc", sh).value.slice(0, 800); s.cost = Math.max(0, +$("#blCost", sh).value || 0); s.budget = +$("#blBud", sh).value || 0; $$(".blgoals input", sh).forEach(i => { const v = +i.value; if (isFinite(v) && v >= 0) s.goals[i.dataset.s][i.dataset.k] = v; }); save(); };
    $$("#blSrc .chip", sh).forEach(b => b.onclick = () => { s.src = b.dataset.k; $$("#blSrc .chip", sh).forEach(x => x.setAttribute("aria-pressed", x === b)); save(); });
    $("#blGo", sh).onclick = () => { if (BL.run && BL.run.on) { BL.run.on = false; BL.run.phase = "done"; BL.run.ms = Date.now() - BL.run.t0; blPaint(); return; } keep(); blStart(); };
    blMine(); blPaint();
  });
}

/* ================= YOUR 5-PILLAR PLAYBOOK ON REAL MNQ: the chart game's own pillar checks, run on TradingView's 5-minute candles ================= */
function pxSeries(B, tf) { // candles in the shape the pillar checks read: times in ms, Wilder ATR(14), 20-candle average volume
  const n = B.n, sec = DK_SEC[tf] || 300, S = { tf, n, t: B.t, o: B.o, h: B.h, l: B.l, c: B.c, v: B.v, ts: new Array(n), te: new Array(n), atr: new Array(n), vma: new Array(n) };
  let a = null, vs = 0;
  for (let i = 0; i < n; i++) { S.ts[i] = B.t[i] * 1000; S.te[i] = S.ts[i] + sec * 1000;
    const tr = i ? Math.max(B.h[i] - B.l[i], Math.abs(B.h[i] - B.c[i - 1]), Math.abs(B.l[i] - B.c[i - 1])) : B.h[i] - B.l[i];
    a = a == null ? tr : i < 14 ? (a * i + tr) / (i + 1) : (a * 13 + tr) / 14; S.atr[i] = a;
    vs += B.v[i] || 0; if (i >= 20) vs -= B.v[i - 20] || 0; S.vma[i] = i >= 19 ? vs / 20 : null; }
  return S;
}
// pillar 1's levels, each with the time it appeared and the time price first came back to it (so a past candle only sees what existed then)
function pxPois(S5, D) {
  const out = []; let nid = 0; const add = o => { o.id = "x" + nid++; out.push(o); };
  const sk = S5.t.map(fdSessKey), st = []; for (let i = 0; i < S5.n; i++) if (!i || sk[i] !== sk[i - 1]) st.push(i);
  for (let j = 2; j < st.length; j++) { const a = st[j - 1], b = st[j], e = j + 1 < st.length ? st[j + 1] : S5.n; let hi = -Infinity, lo = Infinity; for (let i = a; i < b; i++) { hi = Math.max(hi, S5.h[i]); lo = Math.min(lo, S5.l[i]); }
    const from = S5.ts[b] - 1, te = e < S5.n ? S5.ts[e] : Infinity; // yesterday's high and low, live for one session
    add({ kind: "PDH", name: "Previous day high", lo: hi, hi, side: -1, from, touchTe: te, tf: "1D", lvl: true });
    add({ kind: "PDL", name: "Previous day low", lo, hi: lo, side: 1, from, touchTe: te, tf: "1D", lvl: true }); }
  const zones = (H, tfH, life, daily) => { for (let k = 1; k < H.n - 1; k++) { const A = H.atr[k] || (H.h[k] - H.l[k]) || 1;
      const z = (kind, side, lo, hi, from, j0) => { let touchTe = from + life; for (let q = j0; q < H.n; q++) if (side > 0 ? H.l[q] <= hi : H.h[q] >= lo) { touchTe = Math.min(touchTe, H.te[q]); break; }
        if (!daily) for (let q = 0; q < S5.n; q++) { if (S5.ts[q] < from) continue; if (S5.ts[q] >= touchTe) break; if (side > 0 ? S5.l[q] <= hi : S5.h[q] >= lo) { touchTe = S5.te[q]; break; } }
        add({ kind: `${daily ? "Daily" : tfH} ${side > 0 ? "bullish" : "bearish"} ${kind}`, name: `${daily ? "daily" : tfH} ${side > 0 ? "bullish" : "bearish"} ${kind === "FVG" ? "fair value gap" : "order block"}`, lo, hi, side, from, touchTe, tf: tfH }); };
      if (H.l[k + 1] > H.h[k - 1] + 0.1 * A && H.l[k + 1] - H.h[k - 1] <= 3 * A) z("FVG", 1, H.h[k - 1], H.l[k + 1], H.te[k + 1], k + 2);
      if (H.h[k + 1] < H.l[k - 1] - 0.1 * A && H.l[k - 1] - H.h[k + 1] <= 3 * A) z("FVG", -1, H.h[k + 1], H.l[k - 1], H.te[k + 1], k + 2);
      if (!daily && k + 3 < H.n) {
        if (H.c[k] < H.o[k]) { let m = -1, mx = -Infinity; for (let q = k + 1; q <= k + 3; q++) { mx = Math.max(mx, H.h[q]); if (m < 0 && H.c[q] > H.h[k]) m = q; } if (m > 0 && mx - H.l[k] >= 2 * A) z("OB", 1, H.l[k], H.o[k], H.te[m], m + 1); }
        if (H.c[k] > H.o[k]) { let m = -1, mn = Infinity; for (let q = k + 1; q <= k + 3; q++) { mn = Math.min(mn, H.l[q]); if (m < 0 && H.c[q] < H.l[k]) m = q; } if (m > 0 && H.h[k] - mn >= 2 * A) z("OB", -1, H.o[k], H.h[k], H.te[m], m + 1); } } } };
  zones(pxSeries(dkAgg(S5, dkClock(3600)), "1h"), "1h", 5 * 864e5);
  zones(pxSeries(dkAgg(S5, dkClock(14400)), "4h"), "4h", 20 * 864e5);
  if (D && D.n > 3) zones(pxSeries(D, "1D"), "1D", 20 * 864e5, true);
  return out;
}
const PX = { ver: -1, S: null, pois: null };
function pxPrep(F) { if (PX.ver === F.ver && PX.F === F && PX.S) return PX; const S = pxSeries(F.m5, "5m"); Object.assign(PX, { ver: F.ver, F, S, pois: pxPois(S, F.d1) }); return PX; }
// the playbook on the latest 5-minute candle: which pillars are in place, for whichever side the market is setting up
function pxNow(F) {
  if (!F || !F.m5 || F.m5.n < 120) return null; const { S, pois } = pxPrep(F), t = S.n - 1, ev = pbEval(S, t, pois), rg = regime(S, t);
  return { ev, rg: rg ? REGIMES[rg.k] || rg.k : null, at: S.te[t], ok: ["loc", "sweep", "cisd", "disp", "exec"].map(k => !!ev[k]) };
}
function pxLine(F, Sp) { // the same check written out for Quint's brief
  const X = pxNow(F); if (!X) return null; const e = X.ev, f = v => fnum(Sp, v), side = e.d > 0 ? "LONG" : "SHORT", y = b => b ? "✓" : "✗";
  const bits = [`${side} side (the side the latest swing is setting up)`, `1 Location ${y(e.loc)}${e.poi ? ` at ${e.poi.name} ${e.poi.lvl ? f(e.poi.lo) : `${f(e.poi.lo)}-${f(e.poi.hi)}`}` : " (no higher-timeframe level under the recent swing)"}`,
    `2 Sweep ${y(e.sweep)}${e.sw ? ` of ${e.sw.levelKind} ${f(e.sw.lvl)}` : ""}`, `3 CISD ${y(e.cisd)}${e.ci && e.ci.lvl != null ? ` (level ${f(e.ci.lvl)})` : ""}`, `4 Displacement ${y(e.disp)}${e.dp && e.dp.i > 0 ? ` (${e.dp.body.toFixed(1)}× ATR body${e.dp.fvg ? ", left a fair value gap" : ""})` : ""}`,
    `5 Execution ${y(e.exec)}${e.ex && e.ex.z ? ` (pullback zone ${e.ex.z.kind} ${f(e.ex.z.lo)}-${f(e.ex.z.hi)}, stop ${f(e.ex.stop)}, target ${f(e.ex.tgt)}, ${e.ex.rr.toFixed(1)}R${e.ex.conf ? ", confirmed" : ", waiting for a confirming close in the zone"})` : ""}`];
  return `${bits.join("; ")}. Market state: ${X.rg || "unclear"}. ${X.ok.every(Boolean) ? "ALL FIVE PILLARS ARE IN PLACE: this is a valid playbook entry." : `Not a valid entry yet: the first missing pillar is ${["Location", "Sweep", "CISD", "Displacement", "Execution"][X.ok.indexOf(false)]}.`}`;
}
// the playbook run candle by candle over the 5-minute history: New York session entries, 1 MNQ, $0.75 a side and 1 tick of slippage each way
function pxBacktest(F) {
  const { S, pois } = pxPrep(F), tr = [], tick = 0.25; let pos = null, lastS = -1;
  for (let t = 80; t < S.n; t++) {
    const e = etNow(S.ts[t]);
    if (pos) { const d = pos.d, hs = d > 0 ? S.l[t] <= pos.st : S.h[t] >= pos.st, ht = d > 0 ? S.h[t] >= pos.tg : S.l[t] <= pos.tg;
      const x = hs ? pos.st : ht ? pos.tg : t - pos.i >= 36 || e.min >= 955 || fdSessKey(S.t[t]) !== pos.k ? S.c[t] : null;
      if (x != null) { const pts = (x - pos.e) * d - 2 * tick; tr.push({ t: S.t[pos.i + 1], i: pos.i, j: t, d, e: pos.e, st: pos.st, tg: pos.tg, x, why: hs ? "stop" : ht ? "target" : "time", r: pts / pos.risk, usd: pts * 2 - 1.5, is: true }); pos = null; }
      continue; }
    if (e.wd === 0 || e.wd === 6 || e.min < 570 || e.min > 930) continue;
    const ev = pbEval(S, t, pois); if (!(ev.loc && ev.sweep && ev.cisd && ev.disp && ev.exec) || ev.s === lastS) continue;
    const risk = Math.abs(S.c[t] - ev.ex.stop); if (!(risk > 0)) continue;
    lastS = ev.s; pos = { i: t, d: ev.d, e: S.c[t], st: ev.ex.stop, tg: ev.ex.tgt, risk, k: fdSessKey(S.t[t]) };
  }
  let net = 0, pk = 0, dd = 0, gw = 0, gl = 0, w = 0, ln = 0, sn = 0;
  for (const x of tr) { net += x.usd; pk = Math.max(pk, net); dd = Math.max(dd, pk - net); if (x.usd > 0) { w++; gw += x.usd; } else gl -= x.usd; if (x.d > 0) ln += x.usd; else sn += x.usd; }
  const half = Math.floor(tr.length / 2); tr.forEach((x, k) => { x.is = k < half; });
  return { tr, B: F.m5, n: tr.length, wr: tr.length ? Math.round(w / tr.length * 100) : 0, pf: gl > 0 ? gw / gl : gw > 0 ? 9.99 : 0, net: Math.round(net), dd: Math.round(dd), ln: Math.round(ln), sn: Math.round(sn), from: S.ts[80], to: S.te[S.n - 1], at: Date.now() };
}

/* ================= THE BEST STRATEGIES ON REAL MNQ: a short list of well-known rules, re-tested on the user's own TradingView candles every visit ================= */
// Six well-known MNQ strategies went through TradingView's Strategy Tester (15-minute MNQ, 1 Sep to 17 Nov 2026, 1 contract, $0.75 a side and 1 tick of slippage).
// Only these two beat their costs, so they're the two the app teaches. tv: TradingView's own numbers from that run.
const BEST = [
  { id: "brk", V: { f: "breakout", n: 20, stop: 2, tgt: 3, hold: 40, dir: "both" }, name: "20-candle breakout", tag: "Day trade · 15-minute chart", src: ["mop"],
    tv: { n: 176, wr: 36, pf: 1.33, net: 7395, dd: 2345, ln: 2452, sn: 4943 },
    steps: () => ["Use the 15-minute chart. Find the highest high and the lowest low of the last 20 candles (5 hours).", "BUY when a candle <b>closes above</b> the 20-candle high. SELL when one <b>closes below</b> the 20-candle low. A wick through the level isn't enough.", "Put your stop <b>2 ATR</b> from your entry. ATR is the average size of the last 14 candles; Quint and the chart show it (lately about 40 to 55 points on MNQ).", "Target <b>3 times your stop</b>. If neither is hit within 40 candles (10 hours), close the trade.", "It wins only about 1 trade in 3. The big winners pay for the losers, so take every signal and keep the size the same."] },
  { id: "orb15", V: { f: "orb", or: 15, cut: 120, mid: 0, tgt: 2, dir: "both" }, name: "New York open breakout", tag: "Day trade · once a day", lib: "orb", src: ["orb"], ny: true,
    tv: { n: 50, wr: 50, pf: 1.25, net: 1667, dd: 2033, ln: -1096, sn: 2763 },
    steps: () => [`At the New York open, 9:30 New York (${nyLocal(570)} your time), mark the high and low of the first 15-minute candle.`, `BUY when a 15-minute candle <b>closes above</b> that high. SELL when one <b>closes below</b> the low. One trade a day, and only until ${nyLocal(690)} your time (two hours in).`, "Put your stop on the <b>other side</b> of the opening range.", `Target <b>twice your risk</b> (2R). If neither is hit, close before the New York close at ${nyLocal(955)} your time.`, "In the test the sells made the money (+$2,763) and the buys lost ($1,096) because MNQ fell over those weeks. Expect that balance to change when the market turns."] },
];
BEST.push({ id: "pil", V: { f: "pillars" }, name: "Your 5-pillar playbook", tag: "Scalp to day trade · 5-minute chart", own: true,
  steps: () => ["<b>Location.</b> Only trade at a level from a bigger timeframe: yesterday's high or low, or a 1-hour, 4-hour or daily fair value gap or order block. Quint marks them on the chart.", "<b>Liquidity sweep.</b> Price pokes through that level (or the recent highs or lows) and then closes back inside. The stops beyond it have been taken.", "<b>Change in state of delivery (CISD).</b> A candle closes back through the open of the candles that pushed price into the sweep. The delivery has flipped.", "<b>Displacement.</b> A strong candle the new way: body at least 1.2 times the ATR, closing near its high (or low), often leaving a fair value gap.", "<b>Execution.</b> Wait for the pullback into that gap, order block or the CISD level and a candle that closes back your way. Stop just beyond the sweep, target the liquidity on the other side, at least 1.5R. Trade it in the New York session (9:30 to 15:30 New York)."] });
const BEST_OUT = "The other four tested lost or broke even after costs: the trend pullback (PF 1.01), New York open ridden to the close (PF 1.07), the RSI-2 bounce (PF 0.81) and the failed breakout (PF 0.86).";
const nyLocal = min => new Date(etAt(Date.now(), 0, min)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const BS = { B: null, rows: null, err: null, open: null, ex: {}, tvBusy: {}, tvErr: {}, pine: {} };
/* TradingView's own Strategy Tester runs the same rules as Pine: a second opinion on every strategy here */
const bsTv = id => { const c = (ST.bstv || {})[id]; return c && Date.now() - c.at < 12 * 36e5 ? c : null; };
async function bsTvRun(id) {
  const s = BEST.find(x => x.id === id); if (!s || BS.tvBusy[id]) return; BS.tvBusy[id] = true; delete BS.tvErr[id]; bsPaint();
  try { const p = await tvCall("mcp-tv-run-pine-backtest", { code: blPine(s.V), symbol: TV_MNQ, timeframe: "15m", include_trades: 1 }, false);
    if (p && p.errors && p.errors.length) throw { code: "tool_error", message: `the Pine code didn't compile: ${p.errors[0].message}` };
    const r = (p && p.report) || {}, P = r.performance || {}, a = P.all || {}, g = x => x || {}, rg = (r.range && r.range.backtest) || {};
    if (a.total_trades == null) throw { code: "tool_error", message: "TradingView sent no results" };
    (ST.bstv || (ST.bstv = {}))[id] = { at: Date.now(), n: a.total_trades, wr: a.percent_profitable, pf: a.profit_factor, net: a.net_profit, dd: a.max_drawdown, bh: a.buy_hold_return, from: rg.from, to: rg.to, ln: g(P.long).net_profit, sn: g(P.short).net_profit }; save(); }
  catch (e) { BS.tvErr[id] = e && e.code === "tool_error" && e.message ? `TradingView couldn't run it: ${String(e.message).slice(0, 140)}` : tvErr(e); }
  finally { BS.tvBusy[id] = false; bsPaint(); }
}
function bsTvHTML(id) {
  const c = bsTv(id), d = x => x ? new Date(x).toLocaleDateString([], { day: "numeric", month: "short" }) : "";
  if (BS.tvBusy[id]) return `<div class="bstv"><p class="small dim">TradingView's Strategy Tester is running the same rules…</p></div>`;
  if (!c) return `<div class="bstv">${BS.tvErr[id] ? `<p class="nwerr">${esc(BS.tvErr[id])}</p>` : ""}<button class="btn" data-bstv="${id}">✓ Re-run it on TradingView now</button></div>`;
  return `<div class="bstv"><b>TradingView's own backtest</b><p class="small">Same rules in Pine, 1 MNQ, fees and 1 tick of slippage, 15-minute chart, ${d(c.from)} to ${d(c.to)}: <b>${c.n} trades · ${Math.round((c.wr || 0) * 100)}% wins · PF ${(+c.pf || 0).toFixed(2)} · <span class="${c.net >= 0 ? "pos" : "neg"}">${fusd(c.net || 0)}</span></b> · worst drawdown ${fusd(-(c.dd || 0))}. ${c.ln != null && c.sn != null ? `Longs ${fusd(c.ln)}, shorts ${fusd(c.sn)}.` : ""}${c.bh != null && c.bh < 0 ? ` MNQ itself fell over this period (${fusd(c.bh)} a contract), which flatters short trades.` : c.bh > 0 ? ` MNQ rose over this period (${fusd(c.bh)} a contract), which flatters long trades.` : ""}</p></div>`;
}
async function bsSavePine(btn, id) { // the strategy into the user's own TradingView, where a paid plan can alert on it
  const s = BEST.find(x => x.id === id); if (!s) return; btn.disabled = true; btn.textContent = "Saving to your TradingView…";
  try { const code = blPine(s.V), v = await tvCall("mcp-tv-validate-pine-script", { code }, false); if (!v || !v.valid) throw { code: "tool_error", message: "it didn't compile" };
    const nm = `Quint: ${s.name}`.slice(0, 90), p = await tvCall("mcp-tv-create-pine-script", { code, name: nm }, false); BS.pine[id] = (p && p.name) || nm; }
  catch (e) { BS.pine[id] = null; btn.disabled = false; btn.textContent = /name_taken|already/i.test(String(e && e.message)) ? "It's already in your TradingView scripts" : `✗ ${tvWhy(e)}`; return; }
  bsPaint();
}
const NY_STEPS = `<ol class="nysteps"><li><b>Before the bell.</b> Mark yesterday's high and low and the overnight high and low. Check the calendar: big news at 8:30 or 10:00 New York changes everything.</li><li><b>9:30 to 9:45 New York (usually 2:30pm UK): hands off.</b> Let the first 15 minutes print, then mark that candle's high and low. That is the opening range.</li><li><b>Wait for a close outside it.</b> A wick poking out is not a signal. A full candle closing above the high is a buy; below the low is a sell.</li><li><b>Enter on the next candle.</b> Stop on the far side of the range. Size the trade so that stop costs your planned dollars and no more.</li><li><b>One trade, then manage it.</b> First target is 2× your risk. Out by 3:55pm New York whatever happens. Skip the day if the range is unusually wide or news is minutes away.</li></ol>`;
LESSONS.unshift(["The New York open: how to trade the first move", "NY open", () => `<p>The US open is when the most orders hit Nasdaq, so it often sets the day's direction. The opening range breakout turns that into five steps.</p>${NY_STEPS}<p class="small">Why it can work: the break shows which side won the first fight of the day. Why it fails: on quiet, rangebound days the break reverses. See how it has done on real MNQ in Best MNQ strategies.</p>`]);
LESSON_SRC["The New York open: how to trade the first move"] = ["orb", "gao"];
function bsRun() {
  const B = BS.B, n = B ? B.c.length : 0, days = B ? Math.max(1, Math.round((B.t[n - 1] - B.t[0]) / 86400 * 5 / 7)) : 0, E = blStats([]);
  BS.days = days; BS.rows = !B ? BEST.filter(s => !s.own).map(s => ({ s, tr: [], all: E, is: E, os: E, eq: [], nis: 0, sc: s.tv.pf, held: s.tv.pf >= 1.1 ? 2 : 0, none: true })).sort((x, y) => y.sc - x.sc) : BEST.filter(s => !s.own).map(s => { const tr = blEval(s.V, [B], 1.5), a = tr.filter(x => x.is), b = tr.filter(x => !x.is), all = blStats(tr), is = blStats(a), os = blStats(b);
    return { s, tr, all, is, os, eq: tr.map(x => x.r), nis: a.length, sc: all.n >= 8 ? all.avg * Math.sqrt(all.n) : -99, held: is.pf >= 1 && os.pf >= 1 && all.n >= 8 ? 2 : (is.pf >= 1 || os.pf >= 1) && all.n >= 8 ? 1 : 0 }; }).sort((x, y) => y.sc - x.sc);
  // your own playbook always sits third, tested on the 5-minute candles the feed already holds (no extra TradingView calls)
  const P = BEST.find(s => s.own), X = BS.px, tr = X ? X.tr : [], a = tr.filter(x => x.is), b = tr.filter(x => !x.is), all = blStats(tr), is = blStats(a), os = blStats(b);
  BS.rows.push({ s: P, tr, all, is, os, eq: tr.map(x => x.r), nis: a.length, B: X && X.B, px: X, sc: -50, held: X ? (is.pf >= 1 && os.pf >= 1 && all.n >= 8 ? 2 : (is.pf >= 1 || os.pf >= 1) && all.n >= 8 ? 1 : 0) : -1 });
}
const PIL_RULES = "My 5-pillar playbook on the 5-minute chart: 1 Location at a higher-timeframe level (previous day high/low, 1h/4h/daily fair value gap or order block); 2 a liquidity sweep of that level that closes back inside; 3 CISD, a close back through the open of the candles that drove price into the sweep; 4 displacement, a candle with a body of at least 1.2× ATR closing near its extreme; 5 execution on the pullback into the fair value gap, order block or CISD level with a confirming close, stop beyond the sweep, target the opposite liquidity at 1.5R or more, New York session only.";
const pxSum = X => X ? { n: X.n, wr: X.wr, pf: +X.pf.toFixed(2), net: X.net, dd: X.dd, ln: X.ln, sn: X.sn, from: X.from, to: X.to, at: X.at } : null;
function bsExamples(r) { // the last three trades, drawn on the real candles
  const B = r.B || BS.B, last = r.tr.slice(-3).reverse();
  last.forEach((x, k) => { const cv = $(`#bsx${k}`); if (!cv) return; const a = r.s.V.f === "orb" ? Math.max(0, x.a - 6) : Math.max(0, x.i - 40), lines = [{ p: x.e, col: "#9fb3d9", lab: x.d > 0 ? "buy" : "sell" }, { p: x.st, col: "#ef5350", lab: "stop" }]; if (x.tg != null) lines.push({ p: x.tg, col: "#26a69a", lab: "target" }); if (x.hi != null) lines.push({ p: x.hi, col: "rgba(251,191,36,.8)", lab: "range high" }, { p: x.lo, col: "rgba(251,191,36,.8)", lab: "range low" });
    qtDraw(cv, B, a, Math.min(B.c.length, x.j + 5), { h: 190, mark: x.i + 1, lines }); });
}
function bsPaint() {
  const el = $("#bsBody"); if (!el) return;
  if (BS.err) { el.innerHTML = `<p class="nwerr">${esc(BS.err)}</p><button class="btn" id="bsRetry">Try again</button>`; $("#bsRetry").onclick = bsLoad; return; }
  if (!BS.rows) { el.innerHTML = `<p class="dim">Testing each strategy on your real MNQ candles…</p>`; return; }
  const f = s => `${s.n} trades · ${s.wr.toFixed(0)}% wins · PF ${s.pf.toFixed(2)} · ${s.tot >= 0 ? "+" : ""}${s.tot.toFixed(1)}R`, chip = h => h === 2 ? `<span class="bsv ok">Held up</span>` : h === 1 ? `<span class="bsv mid">Mixed</span>` : `<span class="bsv no">Lost</span>`;
  el.innerHTML = `<p class="small" style="margin:0 0 8px">Six well-known MNQ strategies went through TradingView's Strategy Tester. These two beat fees and slippage, so they're the two to learn. ${esc(BEST_OUT)} Third is your own 5-pillar playbook, tested here on your real 5-minute MNQ candles.</p>` + BS.rows.map((r, k) => { const open = BS.open === r.s.id, last = r.tr.slice(-3).reverse(), T = r.s.tv;
    if (r.s.own) return pilCard(r, k, open, last);
    return `<article class="bscard${open ? " open" : ""}"><button class="bshead" data-bs="${r.s.id}" aria-expanded="${open}"><span class="rk">${k + 1}</span><span class="nm"><b>${esc(r.s.name)}</b><small>${esc(r.s.tag)} · TradingView: PF ${T.pf.toFixed(2)}, ${T.net >= 0 ? "+" : "−"}$${Math.abs(T.net).toLocaleString()} on 1 MNQ</small></span>${chip(r.held)}</button>
      ${open ? `<div class="bsin"><h4 class="bsh">How to trade it</h4><ol class="bsteps">${r.s.steps().map(x => `<li>${x}</li>`).join("")}</ol>
      <div class="qtrow"><button class="btn pri" data-bsp="${r.s.id}">🎯 Practise spotting it</button><button class="btn" data-bsq="${r.s.id}">✦ Ask Quint: is it on now?</button></div>
      <h4 class="bsh">The proof</h4><div class="qttab"><table><tbody><tr><th>TradingView test</th><td>${T.n} trades · ${T.wr}% wins · PF ${T.pf.toFixed(2)} · ${T.net >= 0 ? "+" : "−"}$${Math.abs(T.net).toLocaleString()}</td></tr><tr><th>Worst drawdown</th><td>$${T.dd.toLocaleString()} on 1 MNQ</td></tr><tr><th>Buys · sells</th><td>${T.ln >= 0 ? "+" : "−"}$${Math.abs(T.ln).toLocaleString()} · ${T.sn >= 0 ? "+" : "−"}$${Math.abs(T.sn).toLocaleString()}</td></tr><tr><th>On your candles now</th><td>${r.none ? `not loaded yet · <button class="lnk" data-bsload="1">load my MNQ candles (about 3 TradingView calls, once)</button>` : f(r.all)}</td></tr></tbody></table></div>${r.none ? "" : blEqSVG(r)}${bsTvHTML(r.s.id)}
      ${last.length ? `<div class="qtrow"><button class="btn" data-bse="${r.s.id}">${BS.ex[r.s.id] ? "Hide" : "Show"} the last ${last.length} trades on the chart</button></div>` : ""}
      ${BS.ex[r.s.id] ? last.map((x, i) => `<div class="prlab">${esc(qtWhen(x.t * 1000))} · ${x.d > 0 ? "buy" : "sell"} · ${x.r >= 0 ? "+" : ""}${x.r.toFixed(2)}R</div><canvas class="prcv" id="bsx${i}"></canvas>`).join("") : ""}
      <div class="qtrow"><button class="chip" data-bsm="${r.s.id}">★ Make it my strategy (Quint coaches you on it)</button></div>
      ${BS.pine[r.s.id] ? `<p class="small bsok">✓ Saved to your TradingView as “${esc(BS.pine[r.s.id])}”. Add it to your MNQ chart from Indicators → My scripts. On a paid plan, tap Alert on it there and TradingView pings your phone every time its rules buy or sell.</p>` : `<div class="qtrow"><button class="chip" data-bspn="${r.s.id}">📜 Save it to my TradingView (for buy and sell alerts)</button></div>`}${cite(...r.s.src)}</div>` : ""}</article>`; }).join("")
    + `<p class="small">Practising is free: "Practise spotting it" and the pillar trainer never use TradingView calls. ${BS.B ? `"On your candles now" re-tests each strategy on the ${BS.days} days of MNQ candles saved on this phone.` : `"On your candles now" re-tests each strategy once your MNQ candles are on this phone.`} "Held up" means it made money in both halves of that data. Eleven weeks is one kind of market: these are worth practising, not proven. Past results don't promise future ones. Not financial advice.</p>`;
  const row = id => BS.rows.find(r => r.s.id === id);
  $$("[data-bs]", el).forEach(b => b.onclick = () => { BS.open = BS.open === b.dataset.bs ? null : b.dataset.bs; bsPaint(); });
  $$("[data-bse]", el).forEach(b => b.onclick = () => { BS.ex[b.dataset.bse] = !BS.ex[b.dataset.bse]; bsPaint(); });
  $$("[data-bsp]", el).forEach(b => b.onclick = () => { const r = row(b.dataset.bsp); if (r.s.own) { mkShow(null); openPlaybook(); } else openSetup(r.s); });
  $$("[data-bspx]", el).forEach(b => b.onclick = () => bsPx(true));
  $$("[data-bsload]", el).forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = "loading…"; try { await dkFeed(TV_MNQ, null, 0); } catch (e) { BS.err = tvErr(e); bsPaint(); return; } bsLoad(); });
  $$("[data-bsm]", el).forEach(b => b.onclick = () => { const r = row(b.dataset.bsm); if (r.s.own) { ST.mystrat = { desc: "", rules: PIL_RULES, name: r.s.name, src: "pillars:5m", at: Date.now(), os: r.px ? { n: r.os.n, wr: Math.round(r.os.wr), pf: +r.os.pf.toFixed(2) } : null, pass: r.held === 2 }; save(); qtPaintHome(); qtToast("Saved. Quint now coaches you on your 5-pillar playbook."); return; } ST.mystrat = { desc: "", rules: blRules(r.s.V), name: r.s.name, src: "tv:15m", at: Date.now(), os: { n: r.os.n, wr: Math.round(r.os.wr), pf: +r.os.pf.toFixed(2) }, pass: r.held === 2 }; save(); qtPaintHome(); qtToast("Saved. Quint now coaches you on this strategy."); });
  $$("[data-bsq]", el).forEach(b => b.onclick = () => { const r = row(b.dataset.bsq); closeSheet(); DK.qk = "MNQ"; HS().qk = "MNQ"; save(); openQuint(); if (r.s.own) { setTimeout(() => dkSend(DK_PIL_Q), 120); return; } setTimeout(() => dkSend(`Is the ${r.s.name} setup on right now on MNQ? Rules: ${blRules(r.s.V)}. Check the live candles: if it's triggered or close, give me the exact entry, stop and target; if not, tell me the exact level that would trigger it and set nothing.`), 60); });
  $$("[data-bstv]", el).forEach(b => b.onclick = () => bsTvRun(b.dataset.bstv));
  $$("[data-bspn]", el).forEach(b => b.onclick = () => bsSavePine(b, b.dataset.bspn));
  const o = BS.open && row(BS.open); if (o && BS.ex[o.s.id]) bsExamples(o);
}
function pilCard(r, k, open, last) { // your own playbook: the rules, the test on your candles, practise and Quint
  const X = r.px, C = X || (ST.bspil && ST.bspil.n != null ? ST.bspil : null), d = x => x ? new Date(x).toLocaleDateString([], { day: "numeric", month: "short" }) : "", $f = v => `${v >= 0 ? "+" : "−"}$${Math.abs(v).toLocaleString()}`;
  const none = C && !C.n, chip = !C ? `<span class="bsv mid">Untested</span>` : none ? `<span class="bsv mid">No setups</span>` : r.held === 2 ? `<span class="bsv ok">Held up</span>` : r.held === 1 ? `<span class="bsv mid">Mixed</span>` : C.net > 0 ? `<span class="bsv mid">Mixed</span>` : `<span class="bsv no">Lost</span>`;
  const proof = !C ? `<p class="small">${BS.pxErr ? `${esc(BS.pxErr)} ` : ""}Not tested on MNQ yet. It needs about 17 days of 5-minute candles from your TradingView (1 to 3 calls once, then kept on this phone).</p><div class="qtrow"><button class="btn" data-bspx="1">✓ Test it on my MNQ candles</button></div>`
    : none ? `<p class="small">From ${d(C.from)} to ${d(C.to)} (your 5-minute MNQ candles, New York session) the five pillars never all lined up, so there's nothing to judge yet. A full playbook setup is meant to be rare: practise spotting it and ask Quint for the 5-pillar check when price reaches a level.</p>`
    : `<div class="qttab"><table><tbody><tr><th>Your candles</th><td>${C.n} trades · ${C.wr}% wins · PF ${(+C.pf).toFixed(2)} · ${$f(C.net)}</td></tr><tr><th>Worst drawdown</th><td>$${(C.dd || 0).toLocaleString()} on 1 MNQ</td></tr><tr><th>Buys · sells</th><td>${$f(C.ln)} · ${$f(C.sn)}</td></tr><tr><th>Period</th><td>${d(C.from)} to ${d(C.to)}, New York session, 5-minute chart</td></tr></tbody></table></div>
      <p class="small">The same pillar checks as the chart game, run candle by candle on your TradingView MNQ candles: 1 MNQ, $0.75 a side and 1 tick of slippage each way, flat by 15:55 New York. ${C.n < 20 ? "That's too few trades to call it proven either way: keep practising it and let Quint grade your live calls." : C.pf >= 1.2 ? "It beat its costs here; a few weeks is still one kind of market." : "It didn't clearly beat its costs here, so trade it small and only A+ setups until it does."}</p>`;
  return `<article class="bscard${open ? " open" : ""}"><button class="bshead" data-bs="${r.s.id}" aria-expanded="${open}"><span class="rk">${k + 1}</span><span class="nm"><b>${esc(r.s.name)}</b><small>${esc(r.s.tag)} · ${C && C.n ? `your candles: PF ${(+C.pf).toFixed(2)}, ${$f(C.net)} on 1 MNQ` : none ? "no full setups on your candles yet" : "your own rules"}</small></span>${chip}</button>
    ${open ? `<div class="bsin"><h4 class="bsh">How to trade it</h4><ol class="bsteps">${r.s.steps().map(x => `<li>${x}</li>`).join("")}</ol>
    <div class="qtrow"><button class="btn pri" data-bsp="${r.s.id}">🏛️ Practise the pillars</button><button class="btn" data-bsq="${r.s.id}">✦ Ask Quint: is it on now?</button></div>
    <h4 class="bsh">The proof</h4>${proof}
    ${X && last.length ? `<div class="qtrow"><button class="btn" data-bse="${r.s.id}">${BS.ex[r.s.id] ? "Hide" : "Show"} the last ${last.length} trades on the chart</button></div>${BS.ex[r.s.id] ? last.map((x, i) => `<div class="prlab">${esc(qtWhen(x.t * 1000))} · ${x.d > 0 ? "buy" : "sell"} · ${x.why} · ${x.r >= 0 ? "+" : ""}${x.r.toFixed(2)}R</div><canvas class="prcv" id="bsx${i}"></canvas>`).join("") : ""}` : ""}
    <div class="qtrow"><button class="chip" data-bsm="${r.s.id}">★ Make it my strategy (Quint coaches you on it)</button></div></div>` : ""}</article>`;
}
// the playbook test reuses the feed's 5-minute candles: free once they're on the phone
async function bsPx(ask) {
  const F = FD[TV_MNQ] && FD[TV_MNQ].m5 ? FD[TV_MNQ] : ask ? await dkFeed(TV_MNQ, null, 30 * 6e4).catch(e => { BS.pxErr = tvErr(e); return null; }) : null;
  if (F && F.m5 && F.m5.n > 300) { BS.pxErr = null; BS.px = pxBacktest(F); ST.bspil = pxSum(BS.px); save(); }
  if (BS.B) bsRun(); bsPaint();
}
async function bsLoad() {
  BS.err = null; BS.rows = null; bsPaint(); const F = FD[TV_MNQ] || fdLoad(TV_MNQ);
  try { if (F.m5 && F.m1 && F.d1) { const B = await qtBars("15m"); B.pts = true; BS.B = B; } else BS.B = null; bsRun(); if (!BS.open && BS.rows[0]) BS.open = BS.rows[0].s.id; } catch (e) { BS.err = tvErr(e); }
  bsPaint(); if (!BS.err) setTimeout(() => bsPx(false), 30);
}
function openBest(id) { if (typeof id === "string") BS.open = id; openSheet(`${shead("🏆 Your 3 strategies")}<div id="bsBody"></div>`, () => { bsPaint(); bsLoad(); }); }

/* ---------- practise spotting one strategy's setup on real candles ---------- */
function suNew() {
  const U = QT.su, B = U.B, V = U.s.V, n = B.c.length; let i = -1, t = null;
  if (U.tr.length && Math.random() < 0.6) { t = U.tr[Math.floor(Math.random() * U.tr.length)]; i = t.i; }
  else for (let k = 0; k < 60 && i < 0; k++) { const j = 150 + Math.floor(Math.random() * (n - 200)); if (U.tr.some(x => j >= x.i && j <= x.j)) continue; if (V.f === "orb") { const C = blClock(B); if (C.em[j] < 570 + V.or || C.em[j] >= 570 + V.cut) continue; } i = j; }
  if (i < 0) { t = U.tr[Math.floor(Math.random() * U.tr.length)]; i = t.i; }
  let rg = null; if (V.f === "orb") { const C = blClock(B); let a = i; while (a > 0 && C.ed[a - 1] === C.ed[i] && C.em[a] > 570) a--; if (C.em[a] === 570) { let hi = -Infinity, lo = Infinity; for (let k = a; k < n && C.ed[k] === C.ed[i] && C.em[k] < 570 + V.or; k++) { hi = Math.max(hi, B.h[k]); lo = Math.min(lo, B.l[k]); } rg = { hi, lo, a }; } }
  Object.assign(U, { i, t, rg, pick: null });
}
function suPaint() {
  const el = $("#suBody"); if (!el) return; const U = QT.su;
  if (!U.B) { el.innerHTML = U.err ? `<p class="nwerr">${esc(U.err)}</p>` : `<p class="dim">Getting the candles…</p>`; return; }
  const B = U.B, i = U.i, t = U.t, truth = t ? (t.d > 0 ? "buy" : "sell") : "none", done = !!U.pick, ok = U.pick === truth, st = ST.mnqp || {}, lines = U.rg ? [{ p: U.rg.hi, col: "rgba(251,191,36,.8)", lab: "range high" }, { p: U.rg.lo, col: "rgba(251,191,36,.8)", lab: "range low" }] : [];
  const btn = (k, lab, cls) => `<button class="chip ${cls}" data-su="${k}" ${done ? "disabled" : ""} aria-pressed="${U.pick === k}">${lab}</button>`;
  el.innerHTML = `<p class="small" style="margin:0 0 6px">${esc(blRules(U.s.V))}</p><p class="small prsrc">${pracSrc(B)}${B.sim ? ` · <button class="lnk" id="suReal">load my real MNQ candles (about 3 TradingView calls, once)</button>` : ""}</p><div class="prlab">${B.sim ? "" : `${esc(qtWhen(B.t[i] * 1000))} · `}MNQ 15m${st.su ? ` · you: ${Math.round((st.suOk || 0) / st.su * 100)}% right over ${st.su}` : ""}</div><canvas id="suCv" class="prcv"></canvas>
    <h3>The last candle just closed. What does the rule say?</h3><div class="chips">${btn("buy", "Buy", "buy")}${btn("none", "No setup")}${btn("sell", "Sell", "sell")}</div>
    ${done ? `<div class="prres"><div class="${ok ? "ok" : "no"}"><b>${ok ? "✓ Right" : "✗ Not quite"}: ${truth === "none" ? "no setup here" : "the rule said " + truth}</b><span>${t ? `That trade ${t.r > 0 ? "made" : "lost"} ${t.r >= 0 ? "+" : ""}${t.r.toFixed(2)}R ($${Math.abs((t.x - t.e) * t.d * 2).toFixed(0)} per MNQ).` : "Nothing triggered on this candle, so the right move was to wait."}</span></div></div><button class="btn pri qtwide" id="suNext">Next chart ▸</button>` : ""}`;
  if (done && t) qtDraw($("#suCv"), B, Math.max(0, (U.rg ? U.rg.a - 6 : i - 60)), Math.min(B.c.length, t.j + 5), { h: 230, mark: i + 1, lines: lines.concat([{ p: t.e, col: "#9fb3d9", lab: "entry" }, { p: t.st, col: "#ef5350", lab: "stop" }].concat(t.tg != null ? [{ p: t.tg, col: "#26a69a", lab: "target" }] : [])) });
  else qtDraw($("#suCv"), B, Math.max(0, (U.rg ? U.rg.a - 6 : i - 70)), i + 1, { h: 230, lines });
  $$("[data-su]", el).forEach(b => b.onclick = () => { U.pick = b.dataset.su; const m = ST.mnqp || (ST.mnqp = { n: 0, dirOk: 0, trades: 0, r: 0, wins: 0, skips: 0 }); m.su = (m.su || 0) + 1; if (U.pick === truth) m.suOk = (m.suOk || 0) + 1; save(); suPaint(); });
  const nx = $("#suNext"); if (nx) nx.onclick = () => { if (B.sim && (U.nSim = (U.nSim || 0) + 1) % 8 === 0) { const B2 = pracSim("15m", "MNQ"); B2.pts = true; const tr = blEval(U.s.V, [B2], 1.5); if (tr.length) { U.B = B2; U.tr = tr; } } suNew(); suPaint(); $("#sheet").scrollTop = 0; };
  const rl = $("#suReal"); if (rl) rl.onclick = () => openSetup(U.s, { real: true });
}
async function openSetup(s, o = {}) {
  const U = QT.su = { s, B: null, tr: [], real: !!o.real };
  openSheet(`${shead("🎯 Spot it: " + s.name)}<div id="suBody"></div><button class="chip" id="suBack" style="margin-top:10px">◂ Back to the strategies</button>`, sh => { $("#suBack", sh).onclick = openBest; suPaint(); });
  try { let B = null, tr = []; // real MNQ candles on the phone if there are any, otherwise practice candles (a new stretch if one has no setups)
    for (let k = 0; k < 4 && !tr.length; k++) { B = k || U.sim ? pracSim("15m", "MNQ") : U.real ? await qtBars("15m", true) : await pracBars("15m"); B.pts = true; tr = blEval(s.V, [B], 1.5); }
    if (QT.su !== U) return; U.B = B; U.tr = tr; if (!U.tr.length) throw { code: "tool_error" }; suNew(); } catch (e) { U.err = e && e.code === "tool_error" && U.B ? "This strategy hasn't traded in the candles TradingView gave us, so there's nothing to practise yet." : tvErr(e); }
  suPaint();
}

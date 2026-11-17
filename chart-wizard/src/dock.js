/* ================= QUINT LIVE: chat docked beside the live chart, reading real candles, with tools, straight trade calls and a graded record ================= */
const DK = { k: null, qk: "MNQ", open: false, max: false, al: null, alBusy: false, alConf: {}, lastQ: "", alN: 0, busy: false, ctl: null, prog: "", view: "chat", lim: undefined, bars: {}, cal: null, gradeAt: 0, grading: false, img: null, noTools: false, conf: {} };
const DK_TFS = ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W"];
const DK_TTL = { "1m": 40e3, "5m": 50e3, "15m": 9e4, "30m": 12e4, "1h": 3e5, "4h": 6e5, "1D": 18e5, "1W": 36e5 };
const dkM = () => MKDEF[DK.k] || null;
const dkOnChart = m => MK.screen === "chart" && m && MK.sel === m.k;
const dkTf = m => dkOnChart(m) ? HC.tf : m && m.tv ? (TV_TFS.includes(HS().tf) ? HS().tf : TS_DEF[TS()].tf) : "1D";
const tvSym = m => m.tv || (m.cls === "stk" ? m.fmp : m.k === "BTC" ? "COINBASE:BTCUSD" : null);
const dkMsgs = k => { const s = ST.qd || (ST.qd = {}); return s[k] || (s[k] = []); };
const dkCalls = () => Array.isArray(ST.qcalls) ? ST.qcalls : (ST.qcalls = []);
const decFor = p => p < 0.05 ? 7 : p < 2 ? 5 : p < 20 ? 4 : 2;
const dkSpec = (sym, m) => { if (m && tvSym(m) === sym) return mkSpec(m); const k = FUT_KEYS.find(x => MKDEF[x].tv === sym); return k ? MKSPEC[k] : null; };

/* ---------- candles from TradingView, cached briefly ---------- */
const DK_AROUND = { idx: ["CME_MINI:ES1!", "CME_MINI:NQ1!", "CBOT_MINI:YM1!", "CME_MINI:RTY1!", "CBOE:VIX", "TVC:DXY", "CBOT:ZN1!"], other: ["CME_MINI:ES1!", "CME_MINI:NQ1!", "CBOE:VIX", "TVC:DXY", "CBOT:ZN1!", "NYMEX:CL1!", "COMEX:GC1!"] };
const DK_AN = { "CME_MINI:ES1!": "S&P 500 (ES)", "CME_MINI:NQ1!": "Nasdaq-100 (NQ)", "CBOT_MINI:YM1!": "Dow (YM)", "CME_MINI:RTY1!": "Russell 2000 (RTY)", "CBOE:VIX": "VIX", "TVC:DXY": "US dollar index", "CBOT:ZN1!": "10-year note (ZN, up = yields down)", "NYMEX:CL1!": "crude oil", "COMEX:GC1!": "gold" };
async function dkAround(m) {
  const kk = m.grp === "idx" ? "idx" : "other", c = (HS().dkAr || {})[kk]; if (c && (Date.now() - c.at < 9e5 || tvCooling() || tvOut())) return c.t;
  try { const syms = DK_AROUND[m.grp === "idx" ? "idx" : "other"].filter(s => s !== m.tv), p = await tvCall("mcp-tv-get-symbol-data-batch", { symbols: syms, columns: ["close", "change"] }, 9e5), d = p && p.data; if (!d) return null;
    const out = syms.filter(s => d[s] && isFinite(+d[s].change)).map(s => `${DK_AN[s] || s} ${+d[s].change >= 0 ? "+" : ""}${(+d[s].change).toFixed(2)}%${s === "CBOE:VIX" ? ` at ${(+d[s].close).toFixed(1)}` : ""}`); const t = out.length ? out.join(", ") : null; if (t) { const raw = {}; for (const s of syms) if (d[s]) raw[s] = { close: +d[s].close, change: +d[s].change }; HS().dkAr = Object.assign({}, HS().dkAr, { [kk]: { at: Date.now(), t, d: raw } }); save(); } return t; } catch (e) { return c ? c.t : null; }
}
const DK_N = { "1D": 160, "1h": 240, "15m": 320, "5m": 300, "1m": 120 }; // the same counts the brief uses, so Quint's own chart checks reuse what's already loaded
const DK_SEC = { "1m": 60, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "4h": 14400, "1D": 86400, "1W": 604800 };
// one TradingView ohlcv call, cleaned into arrays (t in seconds)
async function dkFetch(sym, tf, count, signal) {
  if (!MK.mcp || MK.st !== "ready") throw { code: "not_ready", message: "Live data isn't connected." };
  const r = await MK.mcp.callTool(TV_SERVER, "mcp-tv-get-ohlcv", { symbol: sym, interval: tf, count, format: "columns" }, { cache: false, signal }), p = r && r.payload, em = fmpErr(p), b = tvBars(p);
  if (em || !b || !b.t || !b.t.length) throw { code: "tool_error", message: em || `no ${tf} candles for ${sym}` };
  const B = { t: [], o: [], h: [], l: [], c: [], v: [] };
  for (let i = 0; i < b.t.length; i++) { const cc = +b.c[i]; if (!(cc > 0)) continue; const o = +b.o[i] > 0 ? +b.o[i] : cc; B.t.push(+b.t[i]); B.o.push(o); B.h.push(Math.max(o, cc, +b.h[i] || cc)); B.l.push(Math.min(o, cc, +b.l[i] > 0 ? +b.l[i] : cc)); B.c.push(cc); B.v.push(+b.v[i] || 0); }
  B.n = B.c.length; if (!B.n) throw { code: "tool_error", message: `no ${tf} candles for ${sym}` }; return B;
}
const DK_A = ["t", "o", "h", "l", "c", "v"];
function dkMerge(O, B, cap) { // newer candles into a series: the same candle is replaced, new ones are added
  for (let i = 0; i < B.n; i++) { const t = B.t[i]; let j = O.t.length - 1; while (j >= 0 && O.t[j] > t) j--;
    if (j >= 0 && O.t[j] === t) for (const a of ["o", "h", "l", "c", "v"]) O[a][j] = B[a][i]; else if (j === O.t.length - 1) for (const a of DK_A) O[a].push(B[a][i]); }
  const cut = O.t.length - cap; if (cut > 0) for (const a of DK_A) O[a].splice(0, cut); O.n = O.c.length; return O;
}
// candles rebuilt into a bigger timeframe; key(t) gives each candle's bucket
function dkAgg(S, key, from = 0) {
  const O = { t: [], o: [], h: [], l: [], c: [], v: [] }; let k0 = null;
  for (let i = from; i < S.n; i++) { const k = key(S.t[i]); if (k !== k0) { k0 = k; O.t.push(k); O.o.push(S.o[i]); O.h.push(S.h[i]); O.l.push(S.l[i]); O.c.push(S.c[i]); O.v.push(S.v[i] || 0); }
    else { const L = O.t.length - 1; O.h[L] = Math.max(O.h[L], S.h[i]); O.l[L] = Math.min(O.l[L], S.l[i]); O.c[L] = S.c[i]; O.v[L] += S.v[i] || 0; } }
  O.n = O.c.length; return O;
}
const dkClock = sec => t => Math.floor(t / sec) * sec;
// put rebuilt candles into a series; when the 1-minute candles start part-way through the first one, widen it instead of replacing it
function dkInto(O, A, whole, cap) { if (!A.n) return; if (!whole && O.n && A.t[0] === O.t[O.n - 1]) { const L = O.n - 1; O.h[L] = Math.max(O.h[L], A.h[0]); O.l[L] = Math.min(O.l[L], A.l[0]); O.c[L] = A.c[0]; for (const a of DK_A) A[a].shift(); A.n--; } if (A.n) dkMerge(O, A, cap); }

/* ---------- the feed: about one TradingView call per question keeps every timeframe of your market current ----------
   TradingView's connector allows only a set number of calls a day, so the 5-minute candles (about 17 days) and the daily ones are
   fetched once a day and kept on this phone. After that a refresh asks only for the 1-minute candles since the last one, and the
   5m, 15m, 1h, 4h and daily candles are all brought up to date from them. If TradingView refuses, Quint keeps the candles he has. */
const FD = {}, FD_CAP = { m1: 600, m5: 5000, d1: 200 }, DK_FEEDTF = { "1m": 1, "5m": 1, "15m": 900, "30m": 1800, "1h": 3600, "4h": 14400, "1D": 1 };
const fdSessKey = t => { const e = etNow(t * 1000 + 6 * 36e5); return Date.UTC(e.y, e.mo - 1, e.d) / 1000; }; // a futures day starts at 18:00 New York
function fdLoad(sym) {
  if (FD[sym]) return FD[sym]; let F = null; try { F = JSON.parse(localStorage.getItem("qfeed:" + sym) || "null"); } catch (e) {}
  if (!F || F.v !== 1) F = { v: 1 }; for (const k of ["m1", "m5", "d1"]) { if (F[k] && Array.isArray(F[k].c) && F[k].c.length) F[k].n = F[k].c.length; else F[k] = null; }
  F.at = F.at || 0; F.agg = {}; F.ver = 1; FD[sym] = F; return F;
}
function fdSave(sym) { clearTimeout(FD.svT); FD.svT = setTimeout(() => { const F = FD[sym]; if (!F) return; const pick = B => B && { t: B.t, o: B.o, h: B.h, l: B.l, c: B.c, v: B.v };
  try { localStorage.setItem("qfeed:" + sym, JSON.stringify({ v: 1, m1: pick(F.m1), m5: pick(F.m5), d1: pick(F.d1), at: F.at, at5: F.at5, atD: F.atD })); } catch (e) { try { localStorage.removeItem("qfeed:" + sym); } catch (e2) {} } }, 1200); }
function fdPatch(F) { // the 5-minute and daily candles brought up to date from the 1-minute ones
  const M = F.m1; if (!M || !M.n) return;
  if (F.m5 && F.m5.n) { const t0 = F.m5.t[F.m5.n - 1]; let i = 0; while (i < M.n && M.t[i] < t0) i++; if (i < M.n) dkInto(F.m5, dkAgg(M, dkClock(300), i), M.t[i] === Math.floor(M.t[i] / 300) * 300 && M.t[i] === t0, FD_CAP.m5); }
  if (F.d1 && F.d1.n) { const D = F.d1, L = D.n - 1, k0 = fdSessKey(D.t[L]); let i = 0; while (i < M.n && fdSessKey(M.t[i]) < k0) i++;
    if (i < M.n) dkInto(D, dkAgg(M, t => { const k = fdSessKey(t); return k === k0 ? D.t[L] : k; }, i), false, FD_CAP.d1); }
}
function fdQuote(sym, F) { // the price, today's change and range, straight from the candles: no separate quote call
  const M = F.m1, D = F.d1; if (!M || !M.n) return; const m = Object.values(MKDEF).find(x => x.tv && tvSym(x) === sym); if (!m) return;
  const o = MK.q[m.k] || {}, p = M.c[M.n - 1], now = Date.now(), endT = (M.t[M.n - 1] + 60) * 1000, open = mktStatus(m.cls).open;
  if (open && now - endT < 15e4 && !MK.tvLive) { MK.tvLive = true; HS().tvLive = true; } // the newest candle is under a couple of minutes old: a real-time feed
  const pc = D && D.n > 1 ? D.c[D.n - 2] : o.pc != null ? o.pc : null, hi = D && D.n ? D.h[D.n - 1] : o.hi, lo = D && D.n ? D.l[D.n - 1] : o.lo;
  MK.q[m.k] = Object.assign({}, o, { p, pc, ch: pc != null ? p - pc : o.ch, pct: pc ? (p - pc) / pc * 100 : o.pct, hi: Math.max(hi || p, p), lo: Math.min(lo || p, p), at: F.at || now, ts: Math.min(now, endT), delay: MK.tvLive ? 0 : (o.delay || 600), mode: MK.tvLive ? "streaming" : (o.mode || "delayed_streaming_600"), src: "feed" });
}
async function dkFeed(sym, signal, maxAge = 0) {
  const F = fdLoad(sym), now = Date.now(); if (F.m1 && F.m5 && F.d1 && now - F.at < maxAge) return F; if (F.busy) return F.busy;
  F.busy = (async () => {
    const lastT = F.m1 && F.m1.n ? F.m1.t[F.m1.n - 1] : 0, gap = lastT ? Math.ceil((now / 1000 - lastT) / 60) + 3 : 1e9;
    const need5 = !F.m5 || F.m5.n < 200 || gap > FD_CAP.m1 || now - (F.at5 || 0) > 5 * 864e5, needD = !F.d1 || F.d1.n < 20 || now - (F.atD || 0) > 864e5;
    const jobs = [dkFetch(sym, "1m", Math.min(FD_CAP.m1, Math.max(3, gap)), signal).then(B => { F.m1 = F.m1 && gap <= FD_CAP.m1 ? dkMerge(F.m1, B, FD_CAP.m1) : B; })];
    if (need5) jobs.push(dkFetch(sym, "5m", FD_CAP.m5, signal).then(B => { F.m5 = B; F.at5 = Date.now(); }));
    if (needD) jobs.push(dkFetch(sym, "1D", 160, signal).then(B => { F.d1 = B; F.atD = Date.now(); }));
    const got = await Promise.allSettled(jobs), bad = got.find(g => g.status === "rejected");
    if (got[0].status === "fulfilled") { F.at = Date.now(); F.err = null; } else F.err = bad.reason;
    fdPatch(F); F.ver++; F.agg = {}; fdQuote(sym, F); fdSave(sym); setTimeout(() => dkGrade(true), 0);
    if (!(F.m1 && F.m5 && F.d1)) throw (bad && bad.reason) || { code: "tool_error", message: "TradingView sent no candles" };
    return F;
  })().finally(() => { F.busy = null; });
  return F.busy;
}
const dkTail = (B, n) => !B || B.n <= n ? B : { t: B.t.slice(-n), o: B.o.slice(-n), h: B.h.slice(-n), l: B.l.slice(-n), c: B.c.slice(-n), v: B.v.slice(-n), n };
function fdTf(F, tf) { if (tf === "1m") return F.m1; if (tf === "5m") return F.m5; if (tf === "1D") return F.d1; const sec = DK_FEEDTF[tf]; return F.agg[tf] || (F.agg[tf] = dkAgg(F.m5, dkClock(sec))); }
const dkFeedSym = sym => { if (sym === TV_MNQ) return true; const m = dkM(); return !!(m && m.tv && tvSym(m) === sym); };
async function dkBars(sym, tf, count, signal, ttl0) {
  const key = `${sym}|${tf}|${count}`, c = DK.bars[key], ttl = ttl0 != null ? ttl0 : (DK_TTL[tf] || 6e4) * (MK.tvLive && /^(1m|5m|15m)$/.test(tf) ? 0.35 : 1);
  if (DK_FEEDTF[tf] && dkFeedSym(sym)) { const F = await dkFeed(sym, signal, ttl), B = dkTail(fdTf(F, tf), count); DK.bars[key] = { B, at: F.at }; return B; }
  if (c && Date.now() - c.at < ttl) return c.B;
  // a series already in hand only needs its newest candles: a few bars instead of hundreds, so it comes back in a moment
  const sec = DK_SEC[tf], gap = c ? (Date.now() - c.at) / 1000 : 1e9, top = c && sec && c.B.n >= 30 && gap < sec * 30 ? Math.max(3, Math.ceil(gap / sec) + 2) : 0;
  const B = await dkFetch(sym, tf, top || count, signal);
  if (top) { const O = c.B; if (B.n && B.t[0] > O.t[O.n - 1]) { delete DK.bars[key]; return dkBars(sym, tf, count, signal, 0); } dkMerge(O, B, count); c.at = Date.now(); return O; }
  DK.bars[key] = { B, at: Date.now() }; return B;
}
// the freshest candles already fetched for a timeframe, whatever count they came in
function dkCached(sym, tf) { const F = FD[sym]; if (F && F.m5 && F.m1 && DK_FEEDTF[tf]) return fdTf(F, tf); let best = null; const pre = `${sym}|${tf}|`; for (const k in DK.bars) if (k.startsWith(pre) && (!best || DK.bars[k].at > best.at)) best = DK.bars[k]; return best ? best.B : null; }
function dkArrow(sym, tf) { if (typeof mxRow === "function") { const r = mxRow(tf); if (r) return r.tr > 0 ? "▲" : r.tr < 0 ? "▼" : "◆"; } const B = dkCached(sym, tf); if (!B || B.n < 25) return "·"; const e = dkEma(B.c, 20), L = B.n - 1, sl = e[L] - e[Math.max(0, L - 5)], up = B.c[L] > e[L]; return up && sl > 0 ? "▲" : !up && sl < 0 ? "▼" : "◆"; }
// what Quint can tell you the instant you ask, from the live data already on hand, while he thinks through the full answer
function dkNow(m) {
  const S = mkSpec(m), Q = mkQ(m.k), sym = tvSym(m); if (!Q || !(Q.p > 0)) return null; const f = v => fnum(S, v), px = Q.p, age = Math.max(0, Math.round((Date.now() - (Q.at || Date.now())) / 1000)), pts = v => nf(S.dec > 2 ? S.dec : 2).format(Math.abs(v)).replace(/\.00$/, "");
  const out = [`Right now (${age < 2 ? "just now" : age < 90 ? `${age}s ago` : `${Math.round(age / 60)} min ago`}${Q.delay ? ", feed ~10 min delayed" : ""}): ${m.k} ${f(px)}${Q.pct != null ? `, ${Q.pct >= 0 ? "+" : "−"}${Math.abs(Q.pct).toFixed(2)}% today` : ""}.`];
  const b1 = sym && dkCached(sym, "1m"); if (b1 && b1.n > 6) { const d = px - b1.c[b1.n - 6]; out.push(`Last 5 min ${d >= 0 ? "+" : "−"}${pts(d)} pts.`); }
  if (sym) out.push(["1m", "5m", "15m", "1h"].map(tf => `${tf} ${dkArrow(sym, tf)}`).join(" · ") + ".");
  const L = DK.lv; if (L && L.vw) out.push(`${px >= L.vw ? "Above" : "Below"} VWAP ${f(L.vw)}.`);
  if (typeof sessLevels === "function") { const lv = sessLevels(m).filter(l => !l.q && !(L && L.vw && l.k === "VWAP")), up = lv.filter(l => l.p > px).sort((a, b) => a.p - b.p)[0], dn = lv.filter(l => l.p < px).sort((a, b) => b.p - a.p)[0];
    if (up) out.push(`Resistance ${up.k} ${f(up.p)} (+${pts(up.p - px)}).`); if (dn) out.push(`Support ${dn.k} ${f(dn.p)} (−${pts(px - dn.p)}).`); }
  return out.join(" ");
}
function dkEma(c, n) { const o = new Array(c.length), k = 2 / (n + 1); o[0] = c[0]; for (let i = 1; i < c.length; i++) o[i] = c[i] * k + o[i - 1] * (1 - k); return o; }
function dkRsi(c, n = 14) { let g = 0, l = 0; const o = new Array(c.length).fill(50); for (let i = 1; i < c.length; i++) { const d = c[i] - c[i - 1], u = Math.max(d, 0), w = Math.max(-d, 0); if (i <= n) { g += u / n; l += w / n; } else { g = (g * (n - 1) + u) / n; l = (l * (n - 1) + w) / n; } o[i] = l === 0 ? (g === 0 ? 50 : 100) : 100 - 100 / (1 + g / l); } return o; }
const dkT = (sec, tf) => { const d = new Date(sec * 1000); return tf === "1D" || tf === "1W" ? d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) : `${d.toLocaleDateString([], { weekday: "short" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`; };
function dkStats(B, S) { // the facts a trader reads off one timeframe
  const n = B.c.length, L = n - 1, c = B.c, f = x => fnum(S, x); if (n < 25) return "not enough candles yet";
  const e20 = dkEma(c, 20), e50 = dkEma(c, 50), A = qtATR(B), R = dkRsi(c), sl = e20[L] - e20[Math.max(0, L - 5)];
  const hi = (a, b) => Math.max(...B.h.slice(Math.max(0, a), b)), lo = (a, b) => Math.min(...B.l.slice(Math.max(0, a), b));
  const trend = c[L] > e20[L] && e20[L] > e50[L] && sl > 0 ? "UP (price above a rising 20 EMA, 20 above 50)" : c[L] < e20[L] && e20[L] < e50[L] && sl < 0 ? "DOWN (price below a falling 20 EMA, 20 below 50)" : "MIXED or ranging";
  const k = Math.min(20, L), vAvg = k ? B.v.slice(L - k, L).reduce((a, x) => a + x, 0) / k : 0, piv = [];
  for (let i = L - 3; i >= 3 && piv.length < 6; i--) { if (B.h[i] >= Math.max(B.h[i - 1], B.h[i - 2], B.h[i + 1], B.h[i + 2])) piv.push(`high ${f(B.h[i])} (${L - i} bars ago)`); if (B.l[i] <= Math.min(B.l[i - 1], B.l[i - 2], B.l[i + 1], B.l[i + 2])) piv.push(`low ${f(B.l[i])} (${L - i} bars ago)`); }
  return `last ${f(c[L])} · EMA20 ${f(e20[L])} ${sl >= 0 ? "rising" : "falling"} · EMA50 ${f(e50[L])} · trend ${trend} · ATR14 ${f(A[L])} · RSI14 ${R[L].toFixed(0)} · 20-bar range ${f(lo(L - 20, L))} to ${f(hi(L - 20, L))} · 50-bar range ${f(lo(L - 50, L))} to ${f(hi(L - 50, L))}${vAvg ? ` · last bar volume ${(B.v[L] / vAvg).toFixed(1)}× average` : ""}\n  swing points, newest first: ${piv.join("; ") || "none clear"}`;
}
function dkRows(B, S, k, tf) { const a = Math.max(0, B.c.length - k), f = x => fnum(S, x), out = ["time open high low close volume"]; for (let i = a; i < B.c.length; i++) out.push(`${dkT(B.t[i], tf)} ${f(B.o[i])} ${f(B.h[i])} ${f(B.l[i])} ${f(B.c[i])} ${Math.round(B.v[i])}`); return out.join("\n"); }
function dkSess(B15, B5, S) { // today's futures session in New York terms: overnight range, NY open, opening range, VWAP, yesterday's regular session
  if (!B15 || B15.n < 30) return ""; const f = x => fnum(S, x), sd = ms => { const e = etNow(ms); return Date.UTC(e.y, e.mo - 1, e.d + (e.min >= 1080 ? 1 : 0)); };
  const N = B15.n, today = sd(B15.t[N - 1] * 1000); let so = null, sh = -Infinity, sl = Infinity, oh = -Infinity, ol = Infinity, rh = -Infinity, rl = Infinity, ro = null; const pv = { d: null, h: -Infinity, l: Infinity, c: null };
  for (let i = 0; i < N; i++) { const t = B15.t[i] * 1000, d = sd(t), mn = etNow(t).min;
    if (d === today) { if (so == null) so = B15.o[i]; sh = Math.max(sh, B15.h[i]); sl = Math.min(sl, B15.l[i]); if (mn >= 570 && mn < 960) { if (ro == null) ro = B15.o[i]; rh = Math.max(rh, B15.h[i]); rl = Math.min(rl, B15.l[i]); } else if (mn < 570 || mn >= 1080) { oh = Math.max(oh, B15.h[i]); ol = Math.min(ol, B15.l[i]); } }
    else if (d < today && mn >= 570 && mn < 960) { if (pv.d !== d) { pv.d = d; pv.h = -Infinity; pv.l = Infinity; } pv.h = Math.max(pv.h, B15.h[i]); pv.l = Math.min(pv.l, B15.l[i]); pv.c = B15.c[i]; } }
  let orh = -Infinity, orl = Infinity, orn = 0, p = 0, v = 0, full = false;
  if (B5 && B5.n) { full = sd(B5.t[0] * 1000) < today; for (let i = 0; i < B5.n; i++) { const t = B5.t[i] * 1000; if (sd(t) !== today) continue; const mn = etNow(t).min; if (mn >= 570 && mn < 585) { orh = Math.max(orh, B5.h[i]); orl = Math.min(orl, B5.l[i]); orn++; } const tp = (B5.h[i] + B5.l[i] + B5.c[i]) / 3; p += tp * B5.v[i]; v += B5.v[i]; } }
  const last = B15.c[N - 1], vw = v > 0 ? p / v : null, rel = x => x == null ? "" : last > x ? " (price above)" : last < x ? " (price below)" : " (price at it)", L = [];
  if (so != null) L.push(`today's session (from 18:00 New York): open ${f(so)}, high ${f(sh)}, low ${f(sl)}`);
  if (oh > -Infinity) L.push(`overnight high ${f(oh)}, low ${f(ol)}`);
  if (ro != null) L.push(`New York session (from 9:30): open ${f(ro)}${rel(ro)}, high ${f(rh)}, low ${f(rl)}`); else L.push("the New York session (9:30 New York) hasn't opened yet today");
  if (orn >= 3) L.push(`opening range 9:30-9:45: high ${f(orh)}, low ${f(orl)}${last > orh ? " (price above it)" : last < orl ? " (price below it)" : " (price inside it)"}`);
  if (vw) L.push(`session VWAP ${f(vw)}${rel(vw)}${full ? "" : " (partial: early candles missing)"}`);
  if (pv.c != null) L.push(`previous New York session: high ${f(pv.h)}, low ${f(pv.l)}, close ${f(pv.c)}`);
  return L.join("\n  ");
}
function dkPhase(ms) { const m = etNow(ms).min; return m < 180 ? "Asian session" : m < 480 ? "London session" : m < 570 ? "US pre-market" : m < 600 ? "the New York open (first 30 minutes, fastest of the day)" : m < 690 ? "New York morning" : m < 810 ? "New York lunch (often slow and choppy)" : m < 960 ? "New York afternoon" : m < 1020 ? "after the New York stock close" : m < 1080 ? "the daily futures break" : "the evening (Asia opening)"; }
async function dkEvents() { // high and medium US events, kept 3 hours (TradingView calls are counted per day)
  if (!DK.cal && HS().dkCal && HS().dkCal.list) DK.cal = HS().dkCal; // kept on the phone between visits
  if (DK.cal && Date.now() - DK.cal.at < 108e5) return DK.cal.list; if (DK.cal && (tvCooling() || tvOut())) return DK.cal.list;
  if (QT.mv && QT.mv.d && QT.mv.d.cal && Date.now() - QT.mv.at < 18e5) { DK.cal = { at: QT.mv.at, list: QT.mv.d.cal }; return DK.cal.list; }
  try { const now = Date.now(), day = ms => new Date(ms).toISOString().slice(0, 10), p = await tvCall("mcp-tv-get-economic-calendar", { countries: "US", date_from: day(now), date_to: day(now + 2 * DAYMS), min_importance: 0 }, 108e5);
    const list = ((p && p.result) || []).map(e => ({ t: Date.parse(e.date), title: String(e.title || e.indicator || ""), imp: +e.importance || 0, fc: e.forecast, pv: e.previous, ac: e.actual, unit: e.unit || "" })).filter(e => e.t && e.title).sort((a, b) => a.t - b.t);
    DK.cal = { at: Date.now(), list }; HS().dkCal = { at: DK.cal.at, list: list.slice(0, 40) }; save(); return list; } catch (e) { return DK.cal ? DK.cal.list : null; }
}
async function dkBrief(m, signal) { // everything Quint should know before he answers, worked out from real data
  const S = mkSpec(m), f = x => fnum(S, x), sym = tvSym(m), Q = mkQ(m.k), now = Date.now(), L = [], meta = { px: Q ? Q.p : null, tq: Q && Q.ts ? Q.ts : now - 6e5, atr: null };
  L.push(`MARKET: ${m.name} (${sym || m.k})${MKSPEC[m.k] ? ` · ${m.what || whatOf(S)}` : " · US stock, priced in dollars per share"}`);
  L.push(`TIME: ${new Date(now).toLocaleString([], { weekday: "long", hour: "2-digit", minute: "2-digit" })} the user's local time; ${String(Math.floor(etNow(now).min / 60)).padStart(2, "0")}:${String(etNow(now).min % 60).padStart(2, "0")} in New York, during ${dkPhase(now)}. Market: ${stLabel(mktStatus(m.cls))}.`);
  if (Q) L.push(`LATEST PRICE: ${f(Q.p)}${Q.ch != null ? ` (${Q.ch >= 0 ? "+" : ""}${f(Q.ch)}, ${fpct(Q.pct || 0, 2)} today)` : ""}, from ${fLocal(Q.ts || now)}${Q.delay ? `, about ${Math.round(Q.delay / 60)} minutes delayed` : ""}. Day high ${f(Q.hi)}, low ${f(Q.lo)}.`);
  const live = !!(m.tv && Q && !Q.delay && /stream/i.test(Q.mode || "")); if (live) L.push(`SPEED: the user trades this live and wants the answer now. They already see a one-line snapshot of price and trend, so put the decision with exact levels in your first line and keep the rest short. Price above is ${Math.max(0, Math.round((now - (Q.at || now)) / 1000))} seconds old; prices can move while you think, so if your entry is more than a few points from it, make it a limit order at the level.`);
  if (m.tv) L.push(live ? "DATA FEED: REAL-TIME. The user's TradingView has live CME data, so prices and candles here are current to the second: give exact entries to the tick." : "DATA FEED: delayed about 10 minutes (the user's TradingView has no real-time CME data). Say so when timing matters, and prefer limit entries at levels over 'enter now'.");
  if (m.tv) L.push(`TRADINGVIEW CALLS: ${tvLeft()} of ${tvPlan()} left today on the user's ${tvPlanName()} plan (TradingView counts every call; the allowance is per day). Your chart, quote, news, calendar, backtest and alert tools each spend one. Everything for ${m.k} is already in this brief, so use a tool only for another market or when the user asks for one.`);
  if (sym) {
    DK.prog = "Reading the daily, hourly, 15m and 5m charts…"; dkPaintLast();
    const ctf = dkTf(m), tfs = [["1D", 160], ["1h", 240], ["15m", 320], ["5m", 300]].concat(TS() === "scalp" || ctf === "1m" || live ? [["1m", 120]] : []);
    const around = m.cls === "fut" ? dkAround(m) : null; // what the markets around this one are doing, fetched alongside the candles
    const got = await Promise.allSettled(tfs.map(([tf, n]) => dkBars(sym, tf, n, signal))), B = {};
    if (m.tv && got.every(g => g.status === "rejected")) L.push(`NO LIVE CANDLES: TradingView refused (${tvWhy(got[0].reason)}) and none are saved on this phone yet. Say so in one short line, don't guess today's prices, then help with what you can: read a chart screenshot if they attached one (that's the best way right now), manage a trade they describe, or explain their strategies and the 5 pillars.`);
    tfs.forEach(([tf], i) => { if (got[i].status === "fulfilled") B[tf] = got[i].value; });
    if (!Object.keys(B).length) L.push("CANDLES: TradingView didn't answer, so only the latest price is known.");
    for (const [tf] of tfs) if (B[tf]) L.push(`${TF_NAME[tf].toUpperCase()} CHART: ${dkStats(B[tf], S)}`);
    const Fd = FD[sym]; if (Fd && Fd.m1 && Fd.m1.n) { const age = Math.round((now - (Fd.m1.t[Fd.m1.n - 1] + 60) * 1000) / 6e4); if (Fd.err || age > 15) L.push(`DATA AGE: ${Fd.err ? `TradingView refused new candles just now (${tvWhy(Fd.err)}). ` : ""}The newest candle ends ${fLocal((Fd.m1.t[Fd.m1.n - 1] + 60) * 1000)}, ${age} minutes ago. Say this in your first line and treat entries as levels to wait for, not "enter now".`); }
    if (m.cls === "fut" && B["15m"]) { const ss = dkSess(B["15m"], B["5m"], S); if (ss) L.push(`TODAY'S LEVELS:\n  ${ss}`); }
    if (Fd && Fd.m5 && typeof pxLine === "function") { try { const pl = pxLine(Fd, S); if (pl) L.push(`5-PILLAR CHECK (the user's own playbook, worked out from the 5-minute candles): ${pl}`); } catch (e) {} }
    if (Q && Q.hi != null && Q.lo != null && B["1D"] && B["1D"].n > 15) { const Ad = qtATR(B["1D"])[B["1D"].n - 2], rg = Q.hi - Q.lo; if (Ad > 0) L.push(`TODAY'S RANGE SO FAR: ${f(rg)} points, ${(rg / Ad).toFixed(2)}× the 14-day average daily range (${f(Ad)})${rg / Ad > 1.1 ? ": already a big day, so late moves can run out of steam" : rg / Ad < 0.5 ? ": a narrow day so far, with room to expand" : ""}. Price is ${Math.round((Q.p - Q.lo) / (rg || 1) * 100)}% of the way from the day's low to its high.`); }
    if (B["1m"]) { const M = B["1m"], k = M.n - 1, back = (n) => M.c[k] - M.c[Math.max(0, k - n)]; L.push(`LAST MINUTES: ${back(5) >= 0 ? "+" : ""}${f(back(5))} in 5 minutes, ${back(15) >= 0 ? "+" : ""}${f(back(15))} in 15, ${back(30) >= 0 ? "+" : ""}${f(back(30))} in 30 (1-minute candles).`); }
    const ar = await around; if (ar) L.push(`AROUND IT (TradingView, % change today): ${ar}.`);
    else if (B["1D"] && B["1D"].n > 2) { const D = B["1D"], k = D.n - 2; L.push(`YESTERDAY: high ${f(D.h[k])}, low ${f(D.l[k])}, close ${f(D.c[k])}`); }
    const tf = B[ctf] ? ctf : B["5m"] ? "5m" : Object.keys(B)[0], E = B[tf];
    if (live && B["1m"] && tf !== "1m") L.push(`LAST 20 1-MINUTE CANDLES (user's local time):\n${dkRows(B["1m"], S, 20, "1m")}`);
    if (E) { const A = qtATR(E); meta.atr = A[E.n - 1]; meta.tf = tf; if (meta.px == null) meta.px = E.c[E.n - 1]; if (!Q) meta.tq = E.t[E.n - 1] * 1000 + 6e4;
      L.push(`LAST ${Math.min(30, E.n)} ${TF_NAME[tf].toUpperCase()} CANDLES (user's local time):\n${dkRows(E, S, 30, tf)}`); }
    if (B["1h"] && tf !== "1h") L.push(`LAST 12 HOURLY CANDLES:\n${dkRows(B["1h"], S, 12, "1h")}`);
  } else { const D = liveBars(m.k); if (D) { const Bd = { t: D.d.map(d => Date.parse(d + "T12:00:00Z") / 1000), o: D.o, h: D.h, l: D.l, c: D.c, v: D.v, n: D.n }; L.push(`DAILY CHART: ${dkStats(Bd, S)}`); meta.atr = atr14(D); } }
  L.push(`USER'S CHART: ${dkOnChart(m) ? `they're looking at the ${TF_NAME[HC.tf] || "daily"} chart` : "they're in your chat screen, not looking at a chart right now"}${HC.lvl && HC.lvl.k === m.k && HC.lvl.arr.length ? `, with your lines at ${HC.lvl.arr.map(x => `${x.lab} ${f(x.p)}`).join(", ")}` : ""}.`);
  const P = lvPosFor(m.k), others = lvOpenList().filter(x => x !== P);
  L.push(P ? `OPEN POSITION: ${P.dir > 0 ? "LONG" : "SHORT"} ${lvSize(P, S)} at ${f(P.e)}, stop ${f(P.stop)}, target ${P.tgt != null ? f(P.tgt) : "none"}, open P&L ${fusd(lvUPL(P))}, opened ${fAgo(P.t0)}.` : "OPEN POSITION: none in this market.");
  if (others.length) L.push(`OTHER OPEN TRADES: ${others.map(x => `${x.dir > 0 ? "long" : "short"} ${x.name}`).join(", ")}.`);
  if (m.trade) { const room = typeof roomLeft === "function" ? roomLeft() : null; L.push(`PAPER ACCOUNT: ${acctLabel()}, balance ${fbal(ST.bal)}${room != null ? `, room to the loss limit ${fbal(room)}` : ""}, risk setting ${ST.riskPct || 1}% = ${fbal(riskBudget(ST.riskPct || 1))} a trade, at most ${AC().cap} micro contracts.`); }
  const ev = await dkEvents(); if (ev && ev.length) { const near = ev.filter(e => e.t > now - 36e5 && e.t < now + 8 * 36e5).slice(0, 10); if (near.length) L.push(`US EVENTS, last hour and next 8 hours (user's local time):\n${near.map(e => `  ${new Date(e.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${e.title}${e.imp >= 1 ? " [HIGH importance]" : ""}${e.ac != null ? `, actual ${e.ac}${e.unit}` : ""}${e.fc != null ? `, forecast ${e.fc}${e.unit}` : ""}${e.pv != null ? `, previous ${e.pv}${e.unit}` : ""}`).join("\n")}`); else L.push("US EVENTS: nothing scheduled in the next 8 hours."); }
  const rc = dkRec(); if (rc.n) L.push(`YOUR RECORD SO FAR: ${rc.w} wins, ${rc.l} losses${rc.tm ? `, ${rc.tm} closed on time` : ""}, total ${rc.R >= 0 ? "+" : ""}${rc.R.toFixed(1)}R; average stated confidence ${rc.conf}% vs actual win rate ${rc.wr}%.`);
  return { text: "LIVE BRIEF\n" + L.join("\n"), meta };
}
function dkRules(m) {
  return `You are Quint, the trading mentor and analyst built into Chart Wizard (you run on Claude, made by Anthropic). You sit next to the user's live chart. They can ask you anything: a trade call, levels, news, how something works, a strategy to test, Pine Script code.

WHO THEY ARE: ${myLine()} They trade from an iPhone and place real trades on NinjaTrader; in this app they paper trade.

THEIR OWN STRATEGY: the 5-pillar playbook, in order. 1 Location: price at a higher-timeframe level (previous day high or low, a 1h, 4h or daily fair value gap or order block). 2 Liquidity sweep: price trades through that level or the recent highs/lows and closes back inside. 3 CISD (change in state of delivery): a close back through the open of the candles that drove price into the sweep. 4 Displacement: a strong candle the new way, body at least 1.2× ATR, closing near its extreme, often leaving a fair value gap. 5 Execution: the pullback into that fair value gap, order block or CISD level with a confirming close; stop just beyond the sweep, target the liquidity on the other side at 1.5R or more; New York session. When they mention their playbook, the pillars or "my strategy", judge it pillar by pillar from the 5-PILLAR CHECK in the brief, name the first missing pillar and what would complete it, and give the exact entry, stop and target when all five are in place.${ST.bspil && ST.bspil.n != null ? ` Its test on their real 5-minute MNQ candles: ${ST.bspil.n} trades, ${ST.bspil.wr}% wins, profit factor ${ST.bspil.pf}, ${ST.bspil.net >= 0 ? "+" : "−"}$${Math.abs(ST.bspil.net)} on 1 MNQ after costs; quote this honestly if asked.` : ""}

BE DECISIVE. Whenever they ask what to do (buy or sell, is this an entry, what's the play, should I hold), give ONE clear call: BUY, SELL or NO TRADE. Never answer "it depends", never list options without choosing one, never hand the decision back to them. NO TRADE is a call too: say exactly what would make you take one. Commit to exact prices for entry, stop and target, taken from real levels in the data.
CONFIDENCE must be honest and calibrated: it's your probability that the target is hit before the stop. 50% is a coin flip; good intraday setups are usually 55 to 70%; never go above 85%. Every call is logged and graded against real candles afterwards, and the user sees your record, so never inflate it.
HOW TO DECIDE: read the higher timeframes first (daily, hourly), then the 15m and 5m for structure, then the entry timeframe. Trade with the higher-timeframe trend unless price is at a major level with a clear rejection. Put the stop beyond real structure (a swing, the opening range, VWAP) and at least about 1× the entry timeframe's ATR away. Aim for at least 1.5R unless it's a quick scalp into a clear level. Weigh scheduled news (stand aside in the minutes before a HIGH-importance release), the time of day (the first 30 minutes after 9:30 New York are fast; lunch is slow), and that the data is about 10 minutes delayed: say so when a fast market makes that matter. Size from their risk setting and say how many contracts.
FEED: the brief's DATA FEED line says whether prices are real-time. With a real-time feed, read the 1-minute candles and LAST MINUTES for the trigger and timing; with a delayed feed, plan entries at levels instead of chasing.
DATA: use only the live brief and your tools. Quote real prices. Never invent a level, a headline or a number. If the data can't answer something, say so in one line.
WHERE THEY ARE: the brief says whether they're looking at the chart or chatting in your own screen. Off the chart, draw_levels still saves the lines for when they open it.
TOOLS: the brief already covers this market on the daily, hourly, 15m and 5m charts. Use a tool only for what it doesn't cover: another market, another timeframe, headlines, the calendar, a backtest, checking Pine code, drawing on the chart. Don't announce tool calls; just use them.
DRAWING: when you name key levels or make a call, draw them on the chart with draw_levels (up to 6, short labels).
FORMAT, for a phone: start with the call in one bold line, e.g. **BUY MNQ now: stop 27,321, target 27,420, 64%**. Then 2 to 4 very short sections with ### headings: Why, Levels, Plan (entry, stop, target, size in contracts, when to bail), and Manage (only if they hold a position). Short sentences. No disclaimers.
Whenever you made a trade call, the very last line must be exactly in this format:
CALL: BUY · ENTRY NOW · STOP 27321.00 · TARGET 27420.75 · CONF 64% · HOLD 45m
(SELL for shorts; ENTRY is NOW or a limit price; HOLD is the most time the trade should need, in minutes)
or, when there's no trade: CALL: NO TRADE · CONF 70% · WAIT FOR a 5m close back above 27400
PHONE ALERTS: the user gets TradingView alerts on their phone. Whenever a plan depends on price reaching a level (a limit entry, a breakout, the level in WAIT FOR), add one line per level, at most 2, in exactly this format:
ALERT: BUY 27420.25 · stop 27380, target 27500
(the first word is BUY, SELL, EXIT or WATCH, then the price, then the plan in a few words). The app turns each line into a one-tap button that sets the alert. Only call set_alert yourself when the user asks you to set an alert.
For Pine Script, write complete //@version=6 code in a \`\`\`pine block, check it with check_pine first (and pine_backtest for strategies) and fix every error before you show it.
For questions that aren't about taking a trade (explaining, news, coding), skip the CALL line and just answer well.`;
}

/* ---------- tools Quint can use while he answers ---------- */
function dkTools(m, sig) {
  const say = s => { DK.prog = s; dkPaintLast(); };
  const symOf = s => { s = String(s || "").trim(); if (!s) { const t = tvSym(m); if (t) return t; throw new Error("This market has no TradingView symbol; name one, like CME_MINI:ES1!"); } const u = s.toUpperCase(); if (MKDEF[u] && MKDEF[u].tv) return MKDEF[u].tv; if (/^[A-Z0-9_]+:[A-Z0-9_.!]+$/.test(u) || /^[A-Z]{1,6}$/.test(u)) return u; throw new Error("Use a TradingView symbol like CME_MINI:ES1!, COMEX:GC1!, NASDAQ:NVDA or TVC:DXY"); };
  const specOf = (sym, B) => dkSpec(sym, m) || { dec: decFor(B ? B.c[B.n - 1] : 100), tick: 0.01, money: false };
  const tfOf = (x, d) => DK_TFS.includes(x) ? x : d;
  return [
    { name: "get_candles", description: "Real OHLCV candles from TradingView (real-time for CME futures when the brief's DATA FEED says so, otherwise about 10 minutes delayed) for any symbol and timeframe, with EMA20/50, ATR14, RSI14, trend and swing points worked out. Use it for another market or a timeframe the brief doesn't cover.",
      inputSchema: { type: "object", properties: { symbol: { type: "string", description: "TradingView EXCHANGE:TICKER, e.g. CME_MINI:ES1!, COMEX:GC1!, NASDAQ:NVDA, TVC:DXY. Leave empty for the open market." }, timeframe: { type: "string", enum: DK_TFS }, count: { type: "integer", minimum: 10, maximum: 120, description: "how many recent candles to list, default 40" } }, required: ["timeframe"] },
      async execute(i) { const sym = symOf(i.symbol), tf = tfOf(i.timeframe, "15m"); say(`Checking ${sym.split(":").pop()} on the ${tf}…`); const B = await dkBars(sym, tf, DK_N[tf] || 300, sig), S = specOf(sym, B); return { symbol: sym, timeframe: tf, stats: dkStats(B, S), candles: dkRows(B, S, clamp(Math.round(+i.count || 40), 10, 120), tf) }; } },
    { name: "draw_levels", description: "Draw horizontal levels on the user's live chart (replaces your previous lines). Use short labels such as 'PDH', 'OR high', 'VWAP', 'entry', 'stop', 'target'. Optionally switch the chart to the timeframe you're describing.",
      inputSchema: { type: "object", properties: { levels: { type: "array", maxItems: 6, items: { type: "object", properties: { price: { type: "number" }, label: { type: "string" }, kind: { type: "string", enum: ["support", "resistance", "entry", "stop", "target", "level"] } }, required: ["price", "label"] } }, timeframe: { type: "string", enum: TV_TFS } }, required: ["levels"] },
      execute(i) { const col = { support: "#5eead4", resistance: "#fca5a5", entry: "#e2e8f0", stop: "#ef5350", target: "#26a69a", level: "#c4b5fd" }, arr = (Array.isArray(i.levels) ? i.levels : []).slice(0, 6).map(x => ({ p: +x.price, lab: String(x.label || "").slice(0, 18), col: col[x.kind] || col.level })).filter(x => isFinite(x.p) && x.p > 0);
        let tfm = ""; const tf = i.timeframe && String(i.timeframe); if (tf && m.tv && TV_TFS.includes(tf)) { if (dkOnChart(m)) { if (tf !== HC.tf) hcSetTf(tf); } else { HS().tf = tf; save(); } tfm = ` and set the chart to ${TF_NAME[tf]} candles`; }
        HC.lvl = { k: m.k, arr }; if (dkOnChart(m)) hcPaint(); return `Drew ${arr.length} line${arr.length === 1 ? "" : "s"}${tfm}.${dkOnChart(m) ? "" : " They'll see them when they open the chart."}`; } },
    { name: "get_quotes", description: "Latest prices and today's % change from TradingView for up to 20 symbols at once, e.g. CME_MINI:ES1!, TVC:DXY, TVC:US10Y, CBOE:VIX, NASDAQ:NVDA. Good for checking what other markets are doing.",
      inputSchema: { type: "object", properties: { symbols: { type: "array", items: { type: "string" }, maxItems: 20 } }, required: ["symbols"] },
      async execute(i) { const syms = (Array.isArray(i.symbols) ? i.symbols : []).slice(0, 20).map(symOf); if (!syms.length) throw new Error("Give at least one symbol"); say("Checking other markets…");
        const p = await tvCall("mcp-tv-get-symbol-data-batch", { symbols: syms, columns: ["close", "change", "high", "low", "update_mode"] }, 3e4), d = (p && p.data) || {}, out = {};
        for (const s of syms) { const x = d[s]; out[s] = x ? { price: x.close, change_pct: x.change != null ? +(+x.change).toFixed(2) : null, day_high: x.high, day_low: x.low, delayed: /delayed/.test(x.update_mode || "") } : "not found"; } return out; } },
    { name: "get_news", description: "The latest headlines from TradingView for a symbol (titles, source, age). Leave symbol empty for the open market.",
      inputSchema: { type: "object", properties: { symbol: { type: "string" } } },
      async execute(i) { const sym = symOf(i.symbol); say("Reading the headlines…"); const p = await tvCall("mcp-tv-get-news", { symbol: sym, limit: 12 }, 12e4); return (((p && p.data) || {}).headlines || []).slice(0, 12).map(h => `${fAgo((+h.published || 0) * 1000)} · ${h.provider && h.provider.name || ""}: ${String(h.title || "").slice(0, 180)}`); } },
    { name: "get_calendar", description: "US economic events from TradingView for the next few days, with times in the user's local time, importance, forecast, previous and actual.",
      inputSchema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 7 } } },
      async execute(i) { say("Checking the calendar…"); const now = Date.now(), day = ms => new Date(ms).toISOString().slice(0, 10), p = await tvCall("mcp-tv-get-economic-calendar", { countries: "US", date_from: day(now - DAYMS), date_to: day(now + clamp(+i.days || 3, 1, 7) * DAYMS), min_importance: 0 }, 9e5);
        return ((p && p.result) || []).slice(0, 40).map(e => `${new Date(e.date).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })} ${e.title}${+e.importance >= 1 ? " [HIGH]" : ""}${e.actual != null ? ` actual ${e.actual}` : ""}${e.forecast != null ? ` forecast ${e.forecast}` : ""}${e.previous != null ? ` previous ${e.previous}` : ""}`); } },
    { name: "quick_backtest", description: "Backtest a rule family on this market's real TradingView candles in a second: first half in sample, second half out of sample, costs included, 1R = the stop. Families: orb (New York opening range breakout), breakout, pullback, meanrev (RSI bounce), cross (EMA cross), sweep (failed breakout).",
      inputSchema: { type: "object", properties: { family: { type: "string", enum: ["orb", "breakout", "pullback", "meanrev", "cross", "sweep"] }, timeframe: { type: "string", enum: ["5m", "15m", "1h"] }, direction: { type: "string", enum: ["long", "short", "both"] }, params: { type: "object", description: "orb: or (15|30|60 minutes), cut (60|120|240), mid (0|1), tgt (0-3). breakout/sweep: n. pullback/cross: fast, slow. meanrev: n, x, slow. All but orb: stop (ATR multiple), tgt (R), hold (bars)." } }, required: ["family", "timeframe"] },
      async execute(i) { const sym = tvSym(m); if (!sym) throw new Error("No TradingView candles for this market"); const tf = ["5m", "15m", "1h"].includes(i.timeframe) ? i.timeframe : "15m"; say(`Backtesting on ${tf} candles…`);
        const V = blFix(Object.assign({ f: i.family, dir: i.direction || "both" }, i.params && typeof i.params === "object" ? i.params : {})); if (!V) throw new Error("Unknown rule family");
        if (V.f === "orb" && tf === "1h") throw new Error("The opening range needs 5m or 15m candles");
        const B = await dkBars(sym, tf, 5000, sig); B.pts = true; const S = mkSpec(m), tr = blEval(V, [B], m.k === "MNQ" ? 1.5 : 4 * (S.tick || 0.01)), a = blStats(tr), is = blStats(tr.filter(x => x.is)), os = blStats(tr.filter(x => !x.is)), st = x => `${x.n} trades, ${x.wr.toFixed(0)}% wins, profit factor ${x.pf.toFixed(2)}, total ${x.tot.toFixed(1)}R, max drawdown ${x.dd.toFixed(1)}% at 1% risk`;
        return { rules: blRules(V), candles: `${B.n} ${tf} candles from ${dkT(B.t[0], "1D")} to ${dkT(B.t[B.n - 1], "1D")}`, all: st(a), in_sample: st(is), out_of_sample: st(os) }; } },
    { name: "check_pine", description: "Compile Pine Script code on TradingView without saving it. Returns whether it is valid and the compiler errors with line numbers. Always check code before showing it.",
      inputSchema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
      async execute(i) { say("Compiling the Pine code on TradingView…"); const p = await tvCall("mcp-tv-validate-pine-script", { code: String(i.code || "").slice(0, 60000) }, false); return { valid: !!(p && p.valid), errors: ((p && p.errors) || []).slice(0, 8).map(e => `line ${e.start && e.start.line}: ${e.message}`), warnings: ((p && p.warnings) || []).slice(0, 4).map(e => e.message) }; } },
    { name: "pine_backtest", description: "Run a Pine Script strategy on TradingView over this market's chart history and return its performance (trades, win rate, profit factor, net profit, max drawdown, per contract after the costs in the code).",
      inputSchema: { type: "object", properties: { code: { type: "string" }, timeframe: { type: "string", enum: ["1m", "5m", "15m", "30m", "1h", "4h", "1D"] }, symbol: { type: "string" } }, required: ["code", "timeframe"] },
      async execute(i) { const sym = symOf(i.symbol); say("TradingView is backtesting the strategy…"); const p = await tvCall("mcp-tv-run-pine-backtest", { code: String(i.code || "").slice(0, 60000), symbol: sym, timeframe: tfOf(i.timeframe, "15m"), include_trades: 5 }, false);
        if (p && p.errors && p.errors.length) return { compiled: false, errors: p.errors.slice(0, 8).map(e => `line ${e.start && e.start.line}: ${e.message}`) };
        const r = (p && p.report) || {}, a = (r.performance || {}).all || {}, pct = x => x == null ? null : +(x * 100).toFixed(1);
        return { symbol: sym, range: r.range && r.range.backtest, trades: a.total_trades, win_rate_pct: pct(a.percent_profitable), profit_factor: a.profit_factor != null ? +(+a.profit_factor).toFixed(2) : null, net_profit: a.net_profit, max_drawdown: a.max_drawdown, avg_trade: a.avg_trade, long_net: ((r.performance || {}).long || {}).net_profit, short_net: ((r.performance || {}).short || {}).net_profit }; } },
    { name: "get_technicals", description: "TradingView's technical rating for a symbol and timeframe: the summary, moving-average and oscillator recommendations plus RSI, ADX, MACD and more.",
      inputSchema: { type: "object", properties: { symbol: { type: "string" }, timeframe: { type: "string", enum: ["1m", "5m", "15m", "30m", "1h", "2h", "4h", "1D", "1W"] } }, required: ["timeframe"] },
      async execute(i) { const sym = symOf(i.symbol); say("Checking TradingView's technicals…"); const p = await tvCall("mcp-tv-get-technicals-rating", { symbol: sym, interval: String(i.timeframe || "15m") }, 6e4); return JSON.stringify(p && (p.data || p)).slice(0, 4000); } },
    { name: "set_alert", description: "Set a TradingView price alert that notifies the user's phone (through the TradingView app) when price reaches a level, with your instruction in the message: BUY, SELL, EXIT or WATCH. Only use it when the user asks for an alert or a notification. Their TradingView plan may allow only a few active alerts, so set one or two, not more.",
      inputSchema: { type: "object", properties: { price: { type: "number" }, direction: { type: "string", enum: ["up", "down", "cross"], description: "up: fires when price rises to the level; down: when it falls to it" }, action: { type: "string", enum: ["BUY", "SELL", "EXIT", "WATCH"] }, note: { type: "string", description: "the plan in a few words, e.g. stop 27,380, target 27,500" } }, required: ["price", "action"] },
      async execute(i) { if (!/alert|notif|ping|buzz|tell me when|let me know|remind|text me|message me/i.test(DK.lastQ)) throw new Error("Only set alerts when the user asks for one. Suggest it with an ALERT line instead.");
        if (++DK.alN > 2) throw new Error("That's enough alerts for one answer: their plan may only allow a few."); say("Setting the TradingView alert…");
        const r = await dkAlertMake(m, +i.price, i.direction, String(i.action || "WATCH").toUpperCase(), String(i.note || "").slice(0, 200)); return r.ok ? `Alert set: ${r.name}` : `Couldn't set it: ${r.msg}`; } },
  ];
}

/* ---------- calls: parse, log, show, grade ---------- */
const CALL_RX = /^[ \t>*_]*CALL[*_ ]*:[*_ ]*(BUY|SELL|LONG|SHORT|NO TRADE|STAY OUT|WAIT)\b(.*)$/im;
function dkParse(text) {
  const k = CALL_RX.exec(String(text || "")); if (!k) return null;
  const side = /BUY|LONG/i.test(k[1]) ? 1 : /SELL|SHORT/i.test(k[1]) ? -1 : 0, r = k[2], num = rx => { const x = rx.exec(r); return x ? +x[1].replace(/,/g, "") : null; }, n = "([0-9][0-9,]*\\.?[0-9]*)";
  const hx = /HOLD\W+([0-9]+(?:\.[0-9]+)?)\s*(m|min|h|hr|hours?)?/i.exec(r);
  return { side, now: /ENTRY\W+(NOW|MARKET)/i.test(r), entry: num(new RegExp("ENTRY\\W+" + n, "i")), stop: num(new RegExp("STOP\\W+" + n, "i")), tgt: num(new RegExp("TARGET\\W+" + n, "i")), conf: num(/CONF(?:IDENCE)?\W+([0-9]{1,3})/i), hold: hx ? Math.round(+hx[1] * (/^h/i.test(hx[2] || "") ? 60 : 1)) : null, wait: ((/WAIT FOR\s+(.+)$/i.exec(r) || [])[1] || "").replace(/[*_]+$/g, "").trim().slice(0, 160) };
}
const dkClean = t => String(t || "").replace(/^[ \t>*_]*(CALL|ALERT)[*_ ]*:.*$/gim, "").replace(/\n{3,}/g, "\n\n").trim();
function dkLog(c, m, meta, src) {
  const S = mkSpec(m), px = meta.px, rt = v => v == null ? null : Math.round(v / (S.tick || 0.01)) * (S.tick || 0.01), entry = c.side ? rt(c.now || c.entry == null ? px : c.entry) : null;
  const C = { id: Date.now() + Math.floor(Math.random() * 1000), t: Date.now(), tq: meta.tq, k: m.k, tv: tvSym(m), name: m.name, side: c.side, entry, stop: rt(c.stop), tgt: rt(c.tgt), conf: c.conf != null ? clamp(c.conf, 1, 99) : null, hold: clamp(c.hold || (TS() === "scalp" ? 20 : 90), 2, 480), tf: meta.tf || HC.tf, px, atr: meta.atr, src, wait: c.wait, st: c.side ? "live" : "skip" };
  C.ty = !c.side || c.now || px == null || !meta.atr || Math.abs(entry - px) <= 0.25 * meta.atr ? "mkt" : "lim";
  if (c.side && !(C.entry && C.stop && C.tgt && (C.stop - C.entry) * c.side < 0 && (C.tgt - C.entry) * c.side > 0)) C.st = "bad";
  const L = dkCalls(); L.unshift(C); if (L.length > 150) L.length = 150; save();
  if (c.side && C.st !== "bad") { HC.lvl = { k: m.k, arr: [{ p: C.entry, lab: C.ty === "lim" ? "Quint entry" : "entry", col: "#e2e8f0" }, { p: C.stop, lab: "Quint stop", col: "#ef5350" }, { p: C.tgt, lab: "Quint target", col: "#26a69a" }].concat((HC.lvl && HC.lvl.k === m.k ? HC.lvl.arr : []).filter(x => !/entry|stop|target/i.test(x.lab)).slice(0, 3)) }; if (dkOnChart(m)) hcPaint(); }
  return C;
}
const dkCallById = id => dkCalls().find(c => c.id === id) || null;
function dkWarn(C, m) { // a quick sense check on every call, shown on the card
  const w = [], sd = Math.abs(C.entry - C.stop), R = Math.abs(C.tgt - C.entry) / (sd || 1);
  if (C.atr && sd < 0.5 * C.atr) w.push(`Tight stop: under half the ${C.tf} ATR, easy to get shaken out.`);
  if (R < 1) w.push("The target is closer than the stop: reward under 1R.");
  const ev = DK.cal && DK.cal.list ? DK.cal.list.find(e => e.imp >= 1 && e.t > C.t && e.t < C.t + Math.max(30, C.hold) * 6e4) : null; if (ev) w.push(`HIGH-importance ${ev.title} at ${new Date(ev.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, inside this trade's window.`);
  return w;
}
const DK_ST = { live: "… Live: being tracked", win: "✓ Target hit", loss: "✗ Stopped out", time: "⏱ Closed on time", nofill: "∅ Entry never reached", skip: "Stood aside", bad: "⚠ Levels don't line up", nodata: "No candles to grade it" };
function dkCallHTML(C, m, noGo) {
  const S = mkSpec(m), f = x => fnum(S, x), cls = C.side > 0 ? "buy" : C.side < 0 ? "sell" : "none", conf = C.conf != null ? Math.min(85, C.conf) : null;
  const head = `<div class="qch"><b>${C.side > 0 ? "▲ BUY" : C.side < 0 ? "▼ SELL" : "● NO TRADE"} ${esc(C.k.startsWith("s:") ? C.k.slice(2) : C.k)}</b>${conf != null ? `<span>${conf}% sure</span>` : ""}</div>${conf != null ? `<div class="qcbar" aria-hidden="true"><i style="width:${conf}%"></i></div>` : ""}`;
  if (!C.side) return `<div class="qcall none">${head}${C.wait ? `<p class="small">Wait for ${esc(C.wait)}.</p>` : ""}${C.tv && Date.now() - C.t < 864e5 ? dkCallAlerts(C, m) : ""}</div>`;
  if (C.st === "bad") return `<div class="qcall ${cls}"><div class="qch"><b>${C.side > 0 ? "▲ BUY" : "▼ SELL"} ${esc(C.k.replace(/^s:/, ""))}</b></div><p class="small">${DK_ST.bad}: the stop or target is on the wrong side of the entry. Ask Quint again.</p></div>`;
  const sd = Math.abs(C.entry - C.stop), R = Math.abs(C.tgt - C.entry) / sd, Q = MK.q[m.k], n = m.trade && Q ? lvTicket(m, Q, sd) : null, done = C.st !== "live", res = done ? `<span class="qcst ${C.st}">${DK_ST[C.st]}${C.R != null ? ` · ${C.R >= 0 ? "+" : ""}${C.R.toFixed(2)}R` : ""}</span>` : `<span class="qcst">${DK_ST.live}</span>`;
  const st = mktStatus(m.cls), far = Q && C.atr ? Math.abs(Q.p - C.entry) > 0.25 * C.atr : false, canGo = !noGo && m.trade && st.open && MK.st === "ready" && !lvPosFor(m.k) && !done && Date.now() - C.t < Math.max(30, C.hold) * 6e4;
  return `<div class="qcall ${cls}">${head}<div class="qcg"><div><small>Entry</small><b>${f(C.entry)}</b><em>${C.ty === "lim" ? "limit" : "now"}</em></div><div><small>Stop</small><b class="neg">${f(C.stop)}</b><em>${f(sd)} away</em></div><div><small>Target</small><b class="pos">${f(C.tgt)}</b><em>${R.toFixed(1)}R</em></div></div>
    <p class="small qcsz">${n ? `Your ${ST.riskPct || 1}% risk: <b>${esc(sizeText(n.I, n.qty))}</b>, risking <b>${fbal(n.risk)}</b>` : ""}${n ? " · " : ""}hold up to ${C.hold >= 90 ? (C.hold / 60).toFixed(C.hold % 60 ? 1 : 0) + " h" : C.hold + " min"} · ${esc(C.tf)} chart</p>
    ${dkWarn(C, m).map(w => `<p class="small warn qcw">⚠ ${esc(w)}</p>`).join("")}
    <div class="qcrow">${canGo ? `<button class="btn pri" data-qcgo="${C.id}">${DK.conf[C.id] ? "Tap again: trade at market" : "Paper trade it"}</button>` : ""}${res}</div>${!done && C.tv ? dkCallAlerts(C, m) : ""}${DK.conf[C.id] && far ? `<p class="small warn">Price is ${f(Math.abs(Q.p - C.entry))} from Quint's entry. The plan was to wait for ${f(C.entry)}.</p>` : ""}</div>`;
}
function dkSim(C, B) { // what happened after the call, on 1-minute candles (a candle that touches both levels counts as stopped out)
  const t0 = Math.floor((C.tq || C.t) / 1000); let i = 0; while (i < B.n && B.t[i] < t0) i++; if (i >= B.n) return null;
  const d = C.side, last = B.t[B.n - 1]; let j = i;
  if (C.ty === "lim") { const win = t0 + Math.max(30, C.hold) * 60; let ok = false; for (; j < B.n && B.t[j] <= win; j++) if (B.l[j] <= C.entry && B.h[j] >= C.entry) { ok = true; break; } if (!ok) return last >= win ? { st: "nofill" } : null; }
  const sd = Math.abs(C.entry - C.stop), end = B.t[j] + C.hold * 60;
  for (let k = j; k < B.n; k++) {
    const hs = d > 0 ? B.l[k] <= C.stop : B.h[k] >= C.stop, ht = d > 0 ? B.h[k] >= C.tgt : B.l[k] <= C.tgt;
    if (hs) return { st: "loss", R: -1, xT: B.t[k] * 1000 }; if (ht) return { st: "win", R: Math.abs(C.tgt - C.entry) / sd, xT: B.t[k] * 1000 };
    if (B.t[k] + 60 >= end) return { st: "time", R: (B.c[k] - C.entry) * d / sd, xT: B.t[k] * 1000 };
  }
  return null;
}
async function dkGrade(force) {
  if (DK.grading || !MK.mcp || MK.st !== "ready" || (!force && Date.now() - DK.gradeAt < 18e4)) return; const now = Date.now(), live = dkCalls().filter(c => c.st === "live" && c.tv && now - c.t > 12e4); if (!live.length) return;
  DK.grading = true; DK.gradeAt = now; let changed = false;
  try { const by = {}; for (const c of live) (by[c.tv] || (by[c.tv] = [])).push(c);
    for (const sym of Object.keys(by).slice(0, 3)) { const cs = by[sym], from = new Date(Math.min(...cs.map(c => c.tq || c.t)) - 36e5).toISOString().slice(0, 10);
      const F = FD[sym], t0 = Math.min(...cs.map(c => c.tq || c.t)) / 1000; let B = F && F.m1 && F.m1.n && F.m1.t[0] <= t0 ? F.m1 : F && F.m5 && F.m5.n && F.m5.t[0] <= t0 ? F.m5 : null;
      if (B) { for (const c of cs) { const r = dkSim(c, B); if (r) { Object.assign(c, r); changed = true; } else if (now - c.t > 4 * DAYMS) { c.st = "nodata"; changed = true; } } continue; }
      if (!tvBgEvery()) continue;
      try { const r = await MK.mcp.callTool(TV_SERVER, "mcp-tv-get-ohlcv", { symbol: sym, interval: "1m", count: 5000, date_from: from, format: "columns" }, { cache: false }), b = tvBars(r && r.payload); if (!b || !b.t || !b.t.length) continue; B = { t: b.t.map(Number), o: b.o.map(Number), h: b.h.map(Number), l: b.l.map(Number), c: b.c.map(Number) }; B.n = B.t.length; } catch (e) { continue; }
      for (const c of cs) { const r = dkSim(c, B); if (r) { Object.assign(c, r); changed = true; } else if (now - c.t > 4 * DAYMS) { c.st = "nodata"; changed = true; } } } }
  finally { DK.grading = false; if (changed) { save(); dkPaint(true); } }
}
function dkRec() {
  const g = dkCalls().filter(c => ["win", "loss", "time"].includes(c.st)), w = g.filter(c => c.R > 0).length, R = g.reduce((a, c) => a + (c.R || 0), 0), cs = g.filter(c => c.conf != null);
  return { n: g.length, w, l: g.filter(c => c.st === "loss").length, tm: g.filter(c => c.st === "time").length, R, wr: g.length ? Math.round(w / g.length * 100) : 0, conf: cs.length ? Math.round(cs.reduce((a, c) => a + c.conf, 0) / cs.length) : 0, live: dkCalls().filter(c => c.st === "live").length, skip: dkCalls().filter(c => c.st === "skip").length };
}
function dkRecHTML() {
  const r = dkRec(), L = dkCalls().slice(0, 30);
  return `<div class="qrec"><div class="qrech"><b>Quint's record</b><button class="chip" id="qdkBack">◂ Chat</button></div>
    ${r.n ? `<div class="qtres"><div><small>Graded calls</small><b>${r.n}</b></div><div><small>Win rate</small><b>${r.wr}%</b></div><div><small>Total</small><b class="${r.R >= 0 ? "pos" : "neg"}">${r.R >= 0 ? "+" : ""}${r.R.toFixed(1)}R</b></div><div><small>Said / actual</small><b>${r.conf}% / ${r.wr}%</b></div></div>` : `<p class="small">No graded calls yet. Each call is checked against TradingView's 1-minute candles once the trade's time has passed.</p>`}
    ${L.length ? L.map(c => `<div class="qrrow"><span>${esc(new Date(c.t).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</span><span><b>${c.side > 0 ? "BUY" : c.side < 0 ? "SELL" : "NO TRADE"}</b> ${esc(c.k.replace(/^s:/, ""))}${c.conf != null ? ` · ${c.conf}%` : ""}${c.src === "shot" ? " · 📷" : ""}</span><span class="qcst ${c.st}">${esc(DK_ST[c.st] || c.st)}${c.R != null ? ` ${c.R >= 0 ? "+" : ""}${c.R.toFixed(2)}R` : ""}</span></div>`).join("") : ""}
    <p class="small">Graded from the moment of the call on 1-minute candles: a candle that touches both the stop and the target counts as a loss. ${r.live ? `${r.live} still being tracked. ` : ""}${r.skip ? `${r.skip} times he said stay out. ` : ""}Paper results; not a promise of future ones.</p></div>`;
}

/* ---------- the dock ---------- */
const DK_FORM = (m, ph) => `<form class="qdkf" id="qdkF"><label class="tbtn qdkimg" aria-label="Send Quint a screenshot of your own chart"><input type="file" accept="image/*" id="qdkFile" hidden>📷</label><textarea id="qdkI" rows="1" placeholder="${esc(ph)}" aria-label="Message Quint" enterkeyhint="send"></textarea><button class="btn pri" id="qdkS" type="submit" aria-label="Send">➤</button></form>`;
const DK_ORB = `<span class="qorb" aria-hidden="true"><s></s><s></s><i></i></span>`;
function dkMount(m) { // Quint beside the live chart
  const root = $("#hmChart"); if (!root || $("#qDock", root)) return; DK.k = m.k; const box = document.createElement("div"); box.id = "qDock"; root.appendChild(box);
  if (!CO.sample) { box.innerHTML = ""; return; }
  box.innerHTML = `<button class="qfab" id="qFab" aria-label="Ask Quint about ${esc(m.name)}">${DK_ORB}Quint</button>
    <section class="qdk" id="qDk" hidden aria-label="Quint, your trading analyst"><header class="qdkh">${DK_ORB}<span class="t"><b>Quint</b><small id="qdkSub"></small></span><button class="chip qdkal" id="qdkAl" aria-label="Your TradingView alerts">🔔</button><button class="chip" id="qdkRec"></button><button class="tbtn" id="qdkMax" aria-label="Bigger or smaller">⤢</button><button class="tbtn" id="qdkX" aria-label="Close Quint">✕</button></header>
      <div class="qdkb" id="qdkB" aria-live="polite"></div><div class="qdkq" id="qdkQ"></div>${DK_FORM(m, `Ask Quint anything about ${m.k.replace(/^s:/, "")}…`)}</section>`;
  $("#qFab", box).onclick = () => dkOpen(true);
  $("#qdkX", box).onclick = () => dkOpen(false);
  $("#qdkMax", box).onclick = () => { DK.max = !DK.max; $("#qDk").classList.toggle("max", DK.max); };
  dkWire(box);
  if (DK.open) dkOpen(true); else dkPaint(true);
  dkGrade(false);
}
function dkWire(box) { // the parts the chart dock and Quint's own screen share
  $("#qdkRec", box).onclick = () => { DK.view = DK.view === "rec" ? "chat" : "rec"; if (DK.view === "rec") dkGrade(true); dkPaint(true); };
  $("#qdkAl", box).onclick = () => { DK.view = DK.view === "alerts" ? "chat" : "alerts"; dkPaint(true); if (DK.view === "alerts") dkAlertsLoad(false); };
  const ta = $("#qdkI", box), fit = () => { ta.style.height = "auto"; ta.style.height = Math.min(110, ta.scrollHeight) + "px"; };
  ta.oninput = fit; ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("#qdkF").requestSubmit(); } };
  $("#qdkF", box).onsubmit = e => { e.preventDefault(); if (DK.busy) { if (DK.ctl) DK.ctl.abort(); return; } const v = ta.value.trim(); if (!v && !DK.img) return; ta.value = ""; fit(); dkSend(v || "Read my chart and give me your call.", DK.img ? { img: DK.img } : {}); DK.img = null; dkPaintImg(); };
  $("#qdkFile", box).onchange = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; try { DK.img = await qtShrink(f); dkPaintImg(); ta.focus(); } catch (err) { hmToast("That file couldn't be opened as an image."); } };
  $("#qdkB", box).addEventListener("click", dkClick); $("#qdkQ", box).addEventListener("click", dkClick);
  ta.addEventListener("focus", dkKb); ta.addEventListener("blur", () => setTimeout(dkKb, 120));
}
/* ---------- Quint's own screen: a full chat, any market, with the desk tools ---------- */
const QS_MK = () => { const g = FUT_G.filter(([k]) => k !== "all").map(([k, l]) => [l, FUT_KEYS.filter(x => MKDEF[x].grp === k)]).filter(x => x[1].length); return g.concat([["Crypto & stocks", ["BTC"].concat(mkStocks().map(t => "s:" + t)).filter(k => MKDEF[k])]]); };
const QS_TOOLS = [["shot", "📷", "Read my chart"], ["best", "🏆", "My 3 strategies"], ["prac", "🎯", "Practise"], ["voice", "🔊", "Voice"], ["style", "🎚", "My style"]];
function qsOpen() {
  const root = $("#hmQuint"); if (!root) return; if (!DK.qkInit) { DK.qkInit = true; if (MKDEF[HS().qk]) DK.qk = HS().qk; } if (!MKDEF[DK.qk]) DK.qk = "MNQ"; DK.k = DK.qk; DK.open = false; DK.view = "chat";
  if (!CO.sample) { root.innerHTML = `<header class="hmh">${DK_ORB}<div class="hctitle"><span><b>Quint</b><small>Your trading analyst</small></span></div></header><div class="hmwrap"><p class="small">Quint needs Claude, so he only works when Chart Wizard is opened inside Claude.</p></div>`; return; }
  const m = MKDEF[DK.k], opt = QS_MK().map(([l, ks]) => `<optgroup label="${esc(l)}">${ks.map(k => `<option value="${esc(k)}" ${k === DK.k ? "selected" : ""}>${esc(k.replace(/^s:/, ""))} · ${esc(MKDEF[k].name)}</option>`).join("")}</optgroup>`).join("");
  root.innerHTML = `<header class="hmh qsh">${DK_ORB}<div class="hctitle"><span><b>Quint</b><small id="qdkSub"></small></span></div><span class="spacer"></span><button class="chip qdkal" id="qdkAl" aria-label="Your TradingView alerts">🔔 Alerts</button><button class="chip" id="qdkRec"></button></header>
    <a class="qsapp" href="https://claude.ai/artifact/SMFZdnPQwVSb3jckwvBNwY" target="_blank" rel="noopener">⬠ Open Quint Brain: his neural view, live instruments and full record ↗</a>
    <div class="qsbar"><label class="qsmk"><span class="sr">Market</span><select id="qsMk" aria-label="Which market Quint looks at">${opt}</select></label><button class="chip" id="qsChart">📈 Chart</button></div>
    <div class="chips qstools" role="group" aria-label="Quint's desk">${QS_TOOLS.map(([k, ic, l]) => `<button class="chip" type="button" data-qt="${k}">${ic} ${l}</button>`).join("")}</div>
    <section class="qdk qs" id="qDk" aria-label="Chat with Quint"><div class="qdkb" id="qdkB" aria-live="polite"></div><div class="qdkq" id="qdkQ"></div>${DK_FORM(m, `Ask Quint anything: buy or sell ${m.k.replace(/^s:/, "")}?`)}</section>`;
  $("#qsMk", root).onchange = e => { DK.qk = DK.k = e.target.value; HS().qk = DK.qk; save(); DK.view = "chat"; DK.img = null; const t = $("#qdkI"); if (t) t.placeholder = `Ask Quint anything: buy or sell ${DK.k.replace(/^s:/, "")}?`; mkSync(); dkPaint(true); };
  $("#qsChart", root).onclick = () => { MK.qsBack = true; mkShow("chart", DK.k); };
  $$(".qstools [data-qt]", root).forEach(b => b.onclick = () => qtGo(b.dataset.qt));
  dkWire(root); dkPaint(true); dkGrade(false);
  if (window.innerWidth >= 980) setTimeout(() => { const t = $("#qdkI"); if (t) t.focus({ preventScroll: true }); }, 60);
}
function qsLeave() { const r = $("#hmQuint"); if (r && r.firstChild) { r.innerHTML = ""; const h = $("#home"); h.style.bottom = ""; h.classList.remove("kb-on"); } } // an answer in progress keeps running and shows when they come back
function dkLeave() { $("#home").classList.remove("qdk-on"); if (window.visualViewport) { visualViewport.removeEventListener("resize", dkKbFit); visualViewport.removeEventListener("scroll", dkKbFit); } }
function dkOpen(on) {
  DK.open = !!on; const d = $("#qDk"), fab = $("#qFab"); if (!d) return; d.hidden = !on; if (fab) fab.hidden = on; d.classList.toggle("max", DK.max && on);
  $("#home").classList.toggle("qdk-on", on);
  if (on) { DK.view = "chat"; dkPaint(true); const r = $("#hmChart"), px = $("#hcPx"); if (r && px && window.innerWidth < 980) r.scrollTop = Math.max(0, px.offsetTop - 62); if (HC.chart) HC.chart.req(); if (window.innerWidth >= 980) setTimeout(() => { const t = $("#qdkI"); if (t) t.focus({ preventScroll: true }); }, 60); dkGrade(false); }
  else { if (HC.chart) setTimeout(() => HC.chart && HC.chart.req(), 50); }
}
function dkKbFit() { const d = $("#qDk"), vv = window.visualViewport; if (!d || !vv) return; const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  if (MK.screen === "quint") { const h = $("#home"); h.style.bottom = kb > 60 ? kb + "px" : ""; h.classList.toggle("kb-on", kb > 60); const b = $("#qdkB"); if (b && kb > 60) b.scrollTop = b.scrollHeight; return; } d.style.bottom = kb > 60 ? kb + "px" : ""; d.style.maxHeight = kb > 60 ? Math.max(220, vv.height - 10) + "px" : ""; }
function dkKb() { const vv = window.visualViewport; if (!vv) return; const on = document.activeElement && document.activeElement.id === "qdkI"; if (on) { vv.addEventListener("resize", dkKbFit); vv.addEventListener("scroll", dkKbFit); dkKbFit(); } else { vv.removeEventListener("resize", dkKbFit); vv.removeEventListener("scroll", dkKbFit); const d = $("#qDk"); if (d) { d.style.bottom = ""; d.style.maxHeight = ""; } const h = $("#home"); h.style.bottom = ""; h.classList.remove("kb-on"); } }
function dkPaintImg() { const f = $("#qdkF"); if (!f) return; let p = $("#qdkPrev"); if (!DK.img) { if (p) p.remove(); return; } if (!p) { p = document.createElement("div"); p.id = "qdkPrev"; p.className = "qdkprev"; f.parentNode.insertBefore(p, f); } p.innerHTML = `<span>📷 Your screenshot is attached. Ask a question, or just send.</span><button class="chip" type="button" id="qdkImgX">Remove</button>`; $("#qdkImgX").onclick = () => { DK.img = null; dkPaintImg(); }; }
function dkChips(m) {
  const P = lvPosFor(m.k), k = m.k.replace(/^s:/, ""), c = [["call", "📈 Buy or sell now?"]].concat(m.tv ? [["pil", "🏛️ 5-pillar check"]] : []).concat([["ny", "🗽 New York open plan"], ["lv", "🎯 Key levels"]]).concat(P ? [["mg", "🛡 Manage my trade"]] : []).concat([["why", "📰 What's moving it?"], ["bt", "🧪 Backtest an idea"], ["mtf", "🔭 Bigger picture"]]);
  return c.map(([id, l]) => `<button class="chip" type="button" data-qq="${id}">${l}</button>`).join("");
}
const DK_PIL_Q = "Run my 5-pillar playbook on MNQ right now: go pillar by pillar (location, sweep, CISD, displacement, execution) for the side that's setting up, say which pillar is missing, and if all five are in place give me the exact entry, stop and target.";
const DK_Q = { pil: k => DK_PIL_Q.replace("MNQ", k), call: k => `What's your call on ${k} right now? Buy, sell or no trade, with exact levels.`, ny: k => `Give me your plan for the New York open on ${k} today: the levels that matter, the setup you'd take and your call.`, lv: k => `Mark the key levels on my ${k} chart and tell me how price is likely to react at each one.`, mg: k => `I'm in this ${k} trade. Hold, tighten the stop, take profit or get out? Give me exact prices.`, why: k => `What's driving ${k} today? Check the headlines and the calendar, then tell me what it means for my trading.`, mtf: k => `Walk me down the timeframes on ${k}, daily to 5-minute: which way is it really heading and where would that view be wrong?` };
function dkClick(e) {
  const m = dkM(); if (!m) return; const q = e.target.closest("[data-qq]");
  if (q) { if (q.dataset.qq === "bt") { const t = $("#qdkI"); t.value = `Backtest this on ${m.k.replace(/^s:/, "")}: `; t.focus(); return; } dkSend(DK_Q[q.dataset.qq](m.k.replace(/^s:/, ""))); return; }
  const g = e.target.closest("[data-qcgo]"); if (g) { const C = dkCallById(+g.dataset.qcgo); if (!C) return; const Q = MK.q[m.k], far = Q && C.atr && Math.abs(Q.p - C.entry) > 0.25 * C.atr;
    if (far && !DK.conf[C.id]) { DK.conf[C.id] = 1; dkPaint(true); return; } delete DK.conf[C.id]; if (MK.screen !== "chart") MK.sel = C.k; lvOpen(C.side, { stop: C.stop, tgt: C.tgt, qc: C.id }).then(() => dkPaint(true)); return; }
  const ca = e.target.closest("[data-cal]"); if (ca) { dkCallAlert(ca); return; }
  const ad = e.target.closest("[data-aldel]"); if (ad) { dkAlertDel(ad); return; }
  if (e.target.closest("#qdkAlR")) { dkAlertsLoad(true); return; }
  const pn = e.target.closest("[data-pine]"); if (pn) { dkPine(pn); return; }
  const al = e.target.closest("[data-alert]"); if (al) { dkAlert(al, m); return; }
  if (e.target.closest("#qdkBack")) { DK.view = "chat"; dkPaint(true); return; }
  if (e.target.closest("#qdkAlerts")) { DK.view = "alerts"; dkPaint(true); dkAlertsLoad(false); return; }
  const sb = e.target.closest(".qtsay"); if (sb) { const i = +sb.closest("[data-i]").dataset.i, x = dkMsgs(m.k)[i]; if (x) qtSpeak(dkClean(x.t), sb); }
}
function dkExtras(x, i) { // buttons for Pine code and price alerts Quint wrote
  if (x.busy || !x.t) return ""; let h = ""; const code = []; x.t.replace(/```[a-z]*\s*\n([\s\S]*?)```/gi, (_, c) => { if (/\/\/@version\s*=\s*\d/.test(c)) code.push(c); return ""; });
  code.forEach((c, k) => { h += `<button class="btn qdkx" data-pine="${i}:${k}">📜 Save this script to my TradingView</button>`; });
  const al = dkAlertLines(x.t), m = dkM(), Q = m && MK.q[m.k], C = x.c ? dkCallById(x.c) : null, onCard = C && C.side && C.st !== "bad" ? [C.entry, C.stop, C.tgt] : [];
  al.slice(0, 3).forEach((a, k) => { if (!m || !m.tv || onCard.some(v => v != null && Math.abs(v - a.p) < 1e-9)) return; const d = Q && Q.p ? (a.p > Q.p ? "up" : a.p < Q.p ? "down" : "cross") : a.dir, done = dkAlFor(x.at, "L" + k), px = esc(fnum(mkSpec(m), a.p));
    h += done ? `<button class="btn qdkx on" disabled>✓ Alert set: ${esc(a.act)} ${esc(m.k.replace(/^s:/, ""))} at ${px}. TradingView will notify your phone.</button>` : `<button class="btn qdkx" data-alert="${i}:${k}">🔔 Alert my phone: ${esc(a.act)} ${esc(m.k.replace(/^s:/, ""))} when price ${d === "up" ? "rises to" : d === "down" ? "falls to" : "reaches"} ${px}</button>`; });
  return h ? `<div class="qdkxs">${h}</div>` : "";
}
async function dkPine(btn) {
  const m = dkM(), [i, k] = btn.dataset.pine.split(":").map(Number), x = dkMsgs(m.k)[i]; if (!x) return; const codes = []; x.t.replace(/```[a-z]*\s*\n([\s\S]*?)```/gi, (_, c) => { if (/\/\/@version\s*=\s*\d/.test(c)) codes.push(c); return ""; }); const code = codes[k]; if (!code) return;
  btn.disabled = true; btn.textContent = "Checking it compiles…";
  try { const v = await tvCall("mcp-tv-validate-pine-script", { code }, false); if (!v || !v.valid) { const er = ((v && v.errors) || [])[0]; btn.textContent = `✗ Doesn't compile${er ? `: line ${er.start && er.start.line}, ${er.message}` : ""}. Ask Quint to fix it.`; return; }
    const nm = ((/(?:indicator|strategy)\(\s*["']([^"']+)/.exec(code) || [])[1] || "Quint script").slice(0, 100), p = await tvCall("mcp-tv-create-pine-script", { code, name: nm }, false);
    btn.textContent = `✓ Saved to your TradingView as “${(p && p.name) || nm}”. Add it from the Pine Editor or your indicators.`; }
  catch (e) { btn.disabled = false; btn.textContent = /name_taken/i.test(String(e && e.message)) ? "You already have a script with that name on TradingView." : tvWhy(e); }
}
async function dkAlert(btn, m) {
  const [i, k] = btn.dataset.alert.split(":").map(Number), x = dkMsgs(m.k)[i], a = x && dkAlertLines(x.t)[k]; if (!a) return; btn.disabled = true; btn.textContent = "Setting the alert on TradingView…";
  const C = x.c ? dkCallById(x.c) : null, end = C ? C.t + (Math.max(30, C.hold) + (a.act === "EXIT" ? C.hold : 0)) * 6e4 : 0; // tied to the call's own time window when there is one
  const r = await dkAlertMake(m, a.p, a.dir, a.act, a.note, Object.assign({ cid: x.at, kind: "L" + k }, end ? { min: Math.max(30, (end - Date.now()) / 6e4) } : {})); btn.textContent = r.ok ? `✓ Alert set: ${r.name}. Your phone gets it from the TradingView app.` : `✗ ${r.msg}`; if (!r.ok) btn.disabled = false;
}
/* ---------- TradingView alerts: Quint's levels to the user's phone ---------- */
// ALERT: BUY 27420.25 · stop 27380, target 27500   (older form: ALERT: 27420 crossing up)
function dkAlertLines(t) {
  const out = [], m = dkM(), Q = m && MK.q[m.k], px = Q && Q.p;
  String(t || "").replace(/```[\s\S]*?```/g, "").replace(/^[ \t>*_-]*ALERT[*_ ]*:[*_ ]*(.+)$/gim, (_, r) => {
    r = r.replace(/[*_`]/g, "").trim(); const nums = [];
    r.replace(/(^|[^A-Za-z0-9.])(\d[\d,]*(?:\.\d+)?)/g, (x, a, n) => { nums.push(+n.replace(/,/g, "")); return x; });
    const p = nums.find(v => v > 0 && (!px || Math.abs(v / px - 1) < 0.2)); if (p == null || out.length >= 3) return "";
    const w = /^(BUY|LONG|SELL|SHORT|EXIT|CLOSE|WATCH)\b/i.exec(r), a0 = w ? w[1].toUpperCase() : /\b(BUY|LONG)\b/i.test(r) ? "BUY" : /\b(SELL|SHORT)\b/i.test(r) ? "SELL" : "WATCH";
    const act = a0 === "LONG" ? "BUY" : a0 === "SHORT" ? "SELL" : a0 === "CLOSE" ? "EXIT" : a0;
    const dir = /\b(down|below|falls?|falling|drops?|under)\b/i.test(r) ? "down" : /\b(up|above|rises?|rising|breaks?|over)\b/i.test(r) ? "up" : "cross";
    const sp = r.search(/\s[·—–|]\s|\s-\s|;/), note = sp >= 0 ? r.slice(sp).replace(/^\s*[·—–|;-]\s*/, "").trim().slice(0, 160) : "";
    if (!out.some(o => o.p === p)) out.push({ p, act, dir, note }); return "";
  });
  return out;
}
const dkAls = () => Array.isArray(ST.qal) ? ST.qal : (ST.qal = []);
const dkIso = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
function dkAlertErr(e) {
  const s = String((e && (e.message || e.text || e.error)) || "");
  if (e && e.code === "not_ready") return "TradingView isn't connected in this view. Reload the app and try again.";
  if (e && PAGE_CODES.has(e.code)) return "This needs your TradingView connector. Reconnect it in claude.ai → Settings → Connectors, then reload.";
  if (/limit|maximum|too many|quota|exceed/i.test(s)) return "Your TradingView plan's alert limit is full. Tap 🔔 Alerts and delete an old one, then try again.";
  if (/auth|log ?in|sign ?in|session|unauthori[sz]ed|forbidden|\b40[13]\b/i.test(s)) return "TradingView wants you to sign in again. Reconnect the TradingView connector, then try again.";
  if (e && e.code === "rate_limited") return "TradingView is busy. Try again in a minute.";
  if (e && e.code === "cooldown") return tvCoolMsg();
  return s ? `TradingView said: ${s.slice(0, 180)}` : "TradingView didn't answer. Try again in a moment.";
}
// one price alert, worded as an instruction: direction comes from where price is now, so it fires when price gets there
async function dkAlertMake(m, p, dir, act, note, o = {}) {
  const sym = tvSym(m); if (!sym || !m.tv) return { ok: false, msg: "Phone alerts work on the TradingView futures in this app." };
  if (!(p > 0)) return { ok: false, msg: "That level isn't a price." };
  const S = mkSpec(m), Q = MK.q[m.k], px = Q && Q.p, f = x => fnum(S, x), tk = m.k.replace(/^s:/, "");
  const d = px ? (p > px ? "up" : p < px ? "down" : "cross") : dir === "up" || dir === "down" ? dir : "cross";
  const near = px && Math.abs(p - px) <= (S.tick || 0.25) * 2;
  const verb = d === "up" ? "rose to" : d === "down" ? "fell to" : "reached", A = act === "BUY" ? "▲ BUY" : act === "SELL" ? "▼ SELL" : act === "EXIT" ? "■ EXIT" : "● WATCH";
  const what = act === "BUY" ? `BUY ${tk}` : act === "SELL" ? `SELL ${tk}` : act === "EXIT" ? `EXIT your ${tk} trade` : `${tk} is at Quint's level`;
  const name = `Quint ${A} ${tk} ${f(p)}${o.lab ? ` (${o.lab})` : ""}`.slice(0, 120);
  let nt = String(note || "").replace(/\s+/g, " ").trim().slice(0, 200); if (nt) { nt = nt[0].toUpperCase() + nt.slice(1); if (!/[.!?]$/.test(nt)) nt += "."; }
  const msg = `${what}: price ${verb} ${f(p)}.${nt ? " " + nt : ""} Check the live chart before you act. (Quint, Chart Wizard)`;
  const exp = Date.now() + clamp(o.min || (TS() === "scalp" ? 240 : 480), 20, 7 * 1440) * 6e4;
  try {
    const r = await tvCall("mcp-tv-create-alert", { symbol: sym, price: p, condition: d === "up" ? "cross_up" : d === "down" ? "cross_down" : "cross", name, message: msg, mobile_push: true, popup: true, auto_deactivate: true, resolution: "1", expiration: dkIso(exp) }, false);
    const id = r && (r.alert_id || r.id || (r.alert && r.alert.alert_id)); if (!id) return { ok: false, msg: "TradingView didn't confirm the alert. Tap 🔔 Alerts to check whether it's there." };
    const L = dkAls(); L.unshift({ id, k: m.k, sym, p, d, act, name, t: Date.now(), exp, cid: o.cid || null, kind: o.kind || null }); if (L.length > 40) L.length = 40; save(); DK.al = null;
    return { ok: true, id, name, near, d, exp };
  } catch (e) { return { ok: false, msg: dkAlertErr(e) }; }
}
const dkAlFor = (cid, kind) => dkAls().find(a => a.cid === cid && a.kind === kind && a.exp > Date.now() && !a.gone);
function dkCallAlerts(C, m) { // one-tap alerts on a call card: the limit entry, the stop and target, or the level Quint is waiting for
  if (!m || !m.tv) return ""; const f = x => fnum(mkSpec(m), x), b = (kind, lab, p) => { const a = dkAlFor(C.id, kind); return `<button class="chip qcal${a ? " on" : ""}" type="button" data-cal="${C.id}:${kind}" ${a ? "disabled" : ""}>${a ? "✓ " : "🔔 "}${lab} ${f(p)}</button>`; };
  let h = "";
  if (C.side) { if (C.ty === "lim") h += b("e", "Entry", C.entry); h += b("s", "Stop", C.stop) + b("t", "Target", C.tgt); }
  else { const w = dkAlertWait(C, m); if (w != null) h += b("w", "Wait level", w); }
  return h ? `<div class="qcals"><small>Alert my phone:</small>${h}</div>` : "";
}
function dkAlertWait(C, m) { const Q = MK.q[m.k], px = (Q && Q.p) || C.px, n = []; String(C.wait || "").replace(/(^|[^A-Za-z0-9.])(\d[\d,]*(?:\.\d+)?)/g, (x, a, v) => { n.push(+v.replace(/,/g, "")); return x; }); const p = n.find(v => px && Math.abs(v / px - 1) < 0.2); return p == null ? null : p; }
async function dkCallAlert(btn) {
  const [id, kind] = btn.dataset.cal.split(":"), C = dkCallById(+id), m = C && MKDEF[C.k]; if (!C || !m) return; const f = x => fnum(mkSpec(m), x), tk = C.k.replace(/^s:/, "");
  const end = C.t + (Math.max(30, C.hold) + (kind === "e" || kind === "w" ? 0 : C.hold)) * 6e4, min = Math.max(20, (end - Date.now()) / 6e4);
  const side = C.side > 0 ? "BUY" : "SELL", plan = `stop ${f(C.stop)}, target ${f(C.tgt)}`;
  const spec = { e: [C.entry, side, `Quint's limit entry. Plan: ${plan}.`, "entry"], s: [C.stop, "EXIT", `Quint's stop for your ${side === "BUY" ? "long" : "short"} from ${f(C.entry)} was hit: close it if you're still in.`, "stop"], t: [C.tgt, "EXIT", `Quint's target for your ${side === "BUY" ? "long" : "short"} from ${f(C.entry)} was reached: take profit.`, "target"], w: [dkAlertWait(C, m), "WATCH", `Quint said wait for ${String(C.wait || "").slice(0, 120)}. Ask him for a fresh call now.`, "wait"] }[kind];
  if (!spec || spec[0] == null) return; btn.disabled = true; btn.textContent = "Setting…";
  const r = await dkAlertMake(m, spec[0], null, spec[1], spec[2], { cid: C.id, kind, min, lab: spec[3] });
  if (r.ok) hmToast(`🔔 Alert set: ${tk} ${r.d === "up" ? "rising to" : r.d === "down" ? "falling to" : "at"} ${f(spec[0])}. TradingView will notify your phone.`); else { btn.disabled = false; btn.textContent = "🔔 Try again"; hmToast(r.msg); }
  dkPaint(false);
}
async function dkAlertsLoad(force) {
  if (DK.alBusy) return; if (!force && DK.al && Date.now() - DK.al.at < 6e4) { dkPaint(false); return; } DK.alBusy = true; dkPaint(false);
  try { const [a, g] = await Promise.all([tvCall("mcp-tv-list-alerts", {}, false), tvCall("mcp-tv-get-alerts-log", { days: 7, limit: 30 }, false).catch(() => null)]);
    const list = (a && (a.alerts || a.items || a.data)) || (Array.isArray(a) ? a : []), log = (g && (g.events || g.log || g.alerts || g.items || g.data)) || (Array.isArray(g) ? g : []);
    DK.al = { at: Date.now(), list: list.slice(0, 60), log: log.slice(0, 20) };
    const ids = new Set(DK.al.list.map(x => +x.alert_id || +x.id)); dkAls().forEach(x => { if (!ids.has(+x.id)) x.gone = 1; }); save(); }
  catch (e) { DK.al = { at: Date.now(), list: [], log: [], err: dkAlertErr(e) }; }
  finally { DK.alBusy = false; dkPaint(false); }
}
async function dkAlertDel(btn) {
  const id = +btn.dataset.aldel; if (!id) return; if (!DK.alConf[id]) { DK.alConf[id] = 1; btn.textContent = "Tap again to delete"; setTimeout(() => { delete DK.alConf[id]; }, 4000); return; }
  delete DK.alConf[id]; btn.disabled = true; btn.textContent = "Deleting…";
  try { await tvCall("mcp-tv-delete-alert", { alert_ids: [id] }, false); dkAls().forEach(x => { if (+x.id === id) x.gone = 1; }); save(); hmToast("Alert deleted from your TradingView."); }
  catch (e) { hmToast(dkAlertErr(e)); } DK.al = null; dkAlertsLoad(true);
}
const dkAlTime = v => { const t = typeof v === "number" ? (v < 1e12 ? v * 1000 : v) : Date.parse(v); return isFinite(t) ? new Date(t).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""; };
function dkAlertsHTML() {
  const A = DK.al, cond = { cross_up: "rises to", cross_down: "falls to", cross: "crosses", greater: "goes above", less: "goes below" };
  const row = x => { const id = +x.alert_id || +x.id, k = FUT_KEYS.find(q => MKDEF[q].tv === x.symbol), S = k ? mkSpec(MKDEF[k]) : null, th = x.threshold != null ? x.threshold : x.price, ours = /^Quint/.test(x.name || "");
    return `<div class="qalrow${x.active ? "" : " off"}"><span><b>${esc(x.name || "Alert")}</b><small>${esc((k || x.symbol || "").replace(/^s:/, ""))} ${esc(cond[x.condition_type] || x.condition_type || "")} ${th != null ? esc(S ? fnum(S, +th) : String(th)) : ""} · ${x.active ? "on" : "off"}${x.expiration || x.expires_at ? ` · ends ${esc(dkAlTime(x.expiration || x.expires_at))}` : ""}${ours ? "" : " · not from Quint"}</small></span><button class="chip" type="button" data-aldel="${id}">Delete</button></div>`; };
  const on = A && A.list ? A.list.filter(x => x.active) : [], off = A && A.list ? A.list.filter(x => !x.active).slice(0, 8) : [];
  return `<div class="qrec"><div class="qrech"><b>🔔 Your TradingView alerts</b><span class="spacer"></span><button class="chip" id="qdkAlR" ${DK.alBusy ? "disabled" : ""}>${DK.alBusy ? "Loading…" : "⟳"}</button><button class="chip" id="qdkBack">◂ Chat</button></div>
    ${!A ? `<p class="small dim">Loading your alerts…</p>` : A.err ? `<p class="nwerr">${esc(A.err)}</p>` : `${on.length ? on.map(row).join("") : `<p class="small">No alerts are on right now. Ask Quint for a call, then tap 🔔 on the card.</p>`}${off.length ? `<h4 class="qalh">Finished or off</h4>${off.map(row).join("")}` : ""}
    <h4 class="qalh">Fired in the last 7 days</h4>${A.log && A.log.length ? A.log.map(e => `<div class="qalrow"><span><b>${esc(e.name || e.alert_name || e.message || "Alert")}</b><small>${esc(dkAlTime(e.fire_time || e.time || e.timestamp || e.fired_at))}${e.symbol ? " · " + esc(e.symbol) : ""}</small></span></div>`).join("") : `<p class="small">None yet. An alert only fires when price actually reaches its level.</p>`}`}
    <details class="qalhow" ${A && !A.err && !(A.log && A.log.length) ? "open" : ""}><summary>How alerts reach your iPhone</summary><ol class="small"><li>TradingView sends them, not this app. Install the <b>TradingView</b> app and sign in with the same account you connected to Claude.</li><li>iPhone Settings → Notifications → TradingView: turn on Allow Notifications.</li><li>Quint's alerts are set with app notifications on, fire once, then switch off. Each ends when its trade plan runs out, so an old "BUY" can't fire hours later.</li><li>Your plan limits how many alerts can be on at once (the free plan allows very few). Delete old ones here.</li><li>${MK.tvLive ? "Your TradingView has real-time CME data, so alerts trigger on the live price." : "Without real-time CME data your TradingView futures prices run about 10 minutes behind, and alerts most likely trigger on that delayed price too."}</li></ol></details></div>`;
}
function dkMsgHTML(x, i, m) {
  if (x.r === "u") return `<div class="qdkm u">${x.img ? "📷 " : ""}${esc(x.t)}</div>`;
  const C = x.c ? dkCallById(x.c) : null, body = dkClean(x.t);
  return `<div class="qdkm a" data-i="${i}">${x.now ? `<p class="qnow">⚡ ${esc(x.now)}</p>` : ""}${x.busy && !body ? `<p class="dim qthink">${esc(DK.prog || "Thinking…")}</p>` : ""}${body ? coachMD(body) : ""}${x.busy && body && DK.prog ? `<p class="dim qthink">${esc(DK.prog)}</p>` : ""}${C ? dkCallHTML(C, m) : ""}${dkExtras(x, i)}${x.err ? `<p class="nwerr">${esc(x.err)}</p>` : ""}${!x.busy && body ? `<div class="qdka"><button class="chip qtsay" type="button">🔊 Listen</button></div>` : ""}</div>`;
}
function dkPaint(all) {
  const b = $("#qdkB"); if (!b) return; const m = dkM(); if (!m) return; const L = dkMsgs(m.k); dkHead();
  const s = $("#qdkS"); if (s) { s.textContent = DK.busy ? "■" : "➤"; s.setAttribute("aria-label", DK.busy ? "Stop" : "Send"); }
  $("#qdkQ").hidden = DK.busy || DK.view !== "chat"; $("#qdkQ").innerHTML = dkChips(m);
  if (DK.view === "rec") { b.innerHTML = dkRecHTML(); return; }
  if (DK.view === "alerts") { b.innerHTML = dkAlertsHTML(); return; }
  b.innerHTML = L.length ? L.map((x, i) => dkMsgHTML(x, i, m)).join("") : `<div class="qdkhi"><b>Ask me anything about ${esc(m.name)}.</b><span>I read the live daily, hourly, 15-minute and 5-minute charts, the news and the calendar, then give you a straight call: buy, sell or no trade, with exact levels. Tap 🔔 on a call and TradingView pings your phone when price gets there. Every call is graded afterwards, so you can see how good I really am.</span></div>`;
  if (all) b.scrollTop = b.scrollHeight;
}
function dkHead() {
  const m = dkM(); if (!m) return; const r = dkRec(), Q = MK.q[m.k], sub = $("#qdkSub"), al = $("#qdkAl"), rc = $("#qdkRec");
  if (sub) sub.textContent = dkOnChart(m) ? `${m.k.replace(/^s:/, "")} · ${TF_NAME[HC.tf] || "daily"} chart · live data` : `${m.k.replace(/^s:/, "")}${Q && Q.p ? ` ${fnum(mkSpec(m), Q.p)}` : ""} · live data`;
  if (rc) { rc.textContent = r.n ? `${r.w}W ${r.n - r.w}L · ${r.R >= 0 ? "+" : ""}${r.R.toFixed(1)}R` : `Record${r.live ? ` · ${r.live} live` : ""}`; rc.setAttribute("aria-pressed", DK.view === "rec"); }
  if (al) { const n = dkAls().filter(a => !a.gone && a.exp > Date.now()).length; al.textContent = $("#qDock") ? `🔔${n ? " " + n : ""}` : `🔔 Alerts${n ? " · " + n : ""}`; al.setAttribute("aria-pressed", DK.view === "alerts"); }
}
function dkPaintLast() {
  const b = $("#qdkB"), m = dkM(); if (!b || !m || DK.view !== "chat") return; const L = dkMsgs(m.k), i = L.length - 1, el = b.querySelector(`.qdkm.a[data-i="${i}"]`); if (!el || !L[i]) return;
  const near = b.scrollHeight - b.scrollTop - b.clientHeight < 80; el.outerHTML = dkMsgHTML(L[i], i, m); if (near) b.scrollTop = b.scrollHeight;
}
async function dkShot() { if (MK.screen !== "chart") return null; const cv = HC.chart && HC.chart.cv; if (!cv || !cv.width) return null; return await new Promise(res => { try { cv.toBlob(b => res(b || null), "image/png"); } catch (e) { res(null); } }); }
async function dkSend(text, opt = {}) {
  const m = dkM(); text = String(text || "").trim(); if (!m || !text || DK.busy) return; DK.lastQ = text; DK.alN = 0;
  if (!CO.sample) { hmToast("Quint isn't available in this view."); return; }
  DK.view = "chat"; const L = dkMsgs(m.k); L.push({ r: "u", t: text.slice(0, 2000), at: Date.now(), img: !!opt.img }); const A = { r: "a", t: "", at: Date.now(), busy: true, now: dkNow(m) }; L.push(A);
  DK.busy = true; DK.prog = "Reading the charts…"; dkPaint(true); const ctl = DK.ctl = new AbortController();
  try {
    if (DK.lim === undefined) DK.lim = await CO.sample.limits().catch(() => null);
    const br = await dkBrief(m, ctl.signal); if (ctl.signal.aborted) throw { code: "cancelled" };
    const canImg = !!(DK.lim && DK.lim.images), img = opt.img && canImg ? opt.img : canImg && !opt.img ? await dkShot() : null;
    const turns = [{ role: "user", content: dkRules(m) }];
    for (const x of L.slice(-14, -2)) if (x.t && !x.busy) turns.push({ role: x.r === "u" ? "user" : "assistant", content: x.r === "a" ? x.t.slice(0, 3500) : x.t });
    turns.push({ role: "user", content: `${br.text}\n\n${img ? (opt.img ? "IMAGE: a screenshot the user took of their own chart (it may be NinjaTrader or TradingView, and newer than the brief): read its price scale, lines and any position.\n" : "IMAGE: the Chart Wizard chart exactly as the user sees it now.\n") : ""}QUESTION: ${text}` });
    DK.prog = "Thinking it through…"; dkPaintLast();
    const run = tools => CO.sample(turns, Object.assign({ onText: ({ text: t }) => { A.t = t; DK.prog = ""; dkPaintLast(); }, signal: ctl.signal, model: "claude-fable-5-2", modelTier: "complex", effort: "high", cache: false }, img ? { images: [img] } : {}, tools ? { tools } : {}));
    const tools = DK.lim && DK.lim.tools && !DK.noTools ? dkTools(m, ctl.signal).slice(0, Math.max(1, DK.lim.tools.maxCount || 10)) : null;
    let r; try { r = await run(tools); } catch (e) { if (e && e.code === "tools_unavailable" && tools) { DK.noTools = true; A.t = ""; r = await run(null); } else throw e; }
    if (r && r.text) A.t = r.text; if (!A.t) throw { code: "empty_completion" };
    const c = dkParse(A.t); if (c) A.c = dkLog(c, m, br.meta, opt.img ? "shot" : "dock").id;
  } catch (e) { const c = e && e.code; if (e && e.text) A.t = e.text; A.err = c === "cancelled" ? (A.t ? null : "Stopped.") : c === "not_ready" ? "Live data isn't connected, so Quint can't read the charts. Reload to reconnect." : c === "image_rejected" ? "Claude couldn't take that image. Try a smaller or clearer screenshot." : NW_ERR[c] || "Something went wrong reaching Quint. Try again in a moment."; }
  finally { A.busy = false; DK.busy = false; DK.ctl = null; DK.prog = ""; while (L.length > 24) L.shift(); save(); dkPaint(true); }
}

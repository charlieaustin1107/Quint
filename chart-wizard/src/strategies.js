/* ================= STRATEGY LIBRARY: well-known futures strategies, practised on the app's charts =================
   Daily strategies run on the REAL daily candles with the exact rules backtested in bt.py (results in BT).
   Day-trading strategies (ORB, VWAP) run on the simulated intraday candles: practice for spotting the setup only. */
const STRATS = {
  trend: {
    name: "Trend breakout", icon: "📈", type: "Trend following", tf: "1D", data: "real", level: "Beginner",
    one: "Buy when price closes above its highest point of the last 20 days. Sell short when it closes below its lowest point. Then ride the move.",
    why: "Big moves often keep going for weeks, because news and money flows take time to work through the market. A breakout to a 20-day extreme is a simple, objective sign that a new move may be starting. You lose small and often, but the few big trends pay for everything.",
    rules: [["Setup", "Today's candle closes above the highest high of the previous 20 days (buy), or below the lowest low of the previous 20 days (sell)."], ["Entry", "At that day's close."], ["Stop", "2 × ATR (2 average daily ranges) from the entry."], ["Exit", "When price closes below the lowest low of the last 10 days (for a buy), or above the highest high of the last 10 days (for a sell). No fixed target: let winners run."]],
    works: "Strong, steady trends (oil and gold in 2025–26, Bitcoin in 2021).", fails: "Choppy, sideways markets: breakout after breakout fails. Expect long losing streaks (9 in a row in the backtest).",
    evidence: "The best-documented strategy family in futures. Hurst, Ooi & Pedersen (2017) found trend following was profitable across 67 futures markets for more than 100 years, with low win rates and large winners.",
    sources: [["A Century of Evidence on Trend-Following Investing (AQR)", "https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing"]],
  },
  soup: {
    name: "Turtle Soup (failed breakout)", icon: "🐢", type: "Reversal", tf: "1D", data: "real", level: "Intermediate",
    one: "When price pokes below a 20-day low (or above a 20-day high) and then closes back inside, the breakout has failed: trade the other way.",
    why: "Many traders put stops just beyond obvious highs and lows, and breakout traders buy or sell there. When price runs those stops and snaps back, the people who just broke out are trapped and have to get out, which pushes price the other way. This is the classic version of the liquidity sweep in your playbook.",
    rules: [["Setup", "Today trades below the lowest low of the previous 20 days (that low must be at least 4 days old), then closes back above it. Mirror it at a 20-day high for a sell."], ["Entry", "At that day's close."], ["Stop", "Just beyond today's extreme (the sweep), plus 0.1 × ATR."], ["Exit", "Target 2R, or close the trade after 10 days."]],
    works: "Ranges and markets that keep faking out breakouts.", fails: "Strong trends: the 'failed' breakout often turns out to be a real one.",
    evidence: "Published by Laurence Connors and Linda Raschke in Street Smarts (1995). It is widely used, but there is no reliable published success rate: treat it as an idea to test, not a proven edge.",
    sources: [["Turtle Soup explained (LuxAlgo library)", "https://www.luxalgo.com/library/concept/turtle-soup/"]],
  },
  rsi2: {
    name: "RSI(2) dip-buy", icon: "🪃", type: "Mean reversion", tf: "1D", data: "real", level: "Beginner",
    one: "In an uptrend (price above its 200-day average), buy after a sharp 1–3 day pullback (RSI(2) below 10), and sell as soon as it bounces above the 5-day average.",
    why: "Stock indexes in an uptrend tend to snap back after short, sharp drops: sellers get exhausted and dip-buyers step in. RSI(2) is a very fast RSI that measures how stretched the last couple of days are.",
    rules: [["Setup", "The close is above the 200-day simple moving average AND the 2-period RSI is below 10."], ["Entry", "At that day's close (buys only)."], ["Stop", "The original has no stop. Prop accounts need one, so we use 2.5 × ATR below entry."], ["Exit", "The first close above the 5-day moving average, or after 10 days."]],
    works: "Stock index futures (S&P 500, Nasdaq) in calm uptrends.", fails: "Crashes and bear markets: the dip keeps going. Wins are small and frequent; one big loss can wipe out many of them.",
    evidence: "Popularised by Larry Connors and Cesar Alvarez (Short Term Trading Strategies That Work, 2008). It wins often, but the edge has weakened: one recent 10-year S&P 500 test found a 71% win rate but average losses bigger than average wins, and returns far below buy-and-hold.",
    sources: [["RSI(2) S&P 500 backtest 2016–2026 (Backtrex)", "https://backtrex.com/en/backtests/connors-rsi-2-sp-500"]],
  },
  orb: {
    name: "Opening range breakout", icon: "🔔", type: "Day trading · momentum", tf: "5m", data: "sim", level: "Intermediate",
    one: "Mark the high and low of the first 15 minutes after the open. Trade in the direction price breaks out of that range, with the stop on the other side.",
    why: "The open is when the most orders arrive and the day's direction often gets decided. A clean break of the opening range shows which side won the first battle.",
    rules: [["Setup", "Opening range = the high and low of the first three 5-minute candles after the US open. A 5-minute candle then closes above the range high (buy) or below the range low (sell) within the next 2 hours."], ["Entry", "At that candle's close."], ["Stop", "The other side of the opening range."], ["Exit", "Target 2R, or close the trade by the end of the session."]],
    works: "Days with news or high volume, when price trends from the open.", fails: "Quiet days: price breaks out, reverses, and chops back and forth.",
    evidence: "Zarattini & Aziz (2023) found a 5-minute opening range breakout on QQQ beat buy-and-hold from 2016 to 2023 (about 33% vs 15% a year), with zero slippage assumed and only about 25% of leveraged trades winning. An independent replication on five index markets (2015–2026) reproduced the gross results but found they shrank to roughly zero after trading costs.",
    sources: [["Can Day Trading Really Be Profitable? (Zarattini & Aziz, SSRN)", "https://papers.ssrn.com/abstract=4416622"], ["ORB paper replicated on five indices", "https://www.mql5.com/en/blogs/post/776235"]],
  },
  vwap: {
    name: "VWAP trend", icon: "🌊", type: "Day trading · trend", tf: "5m", data: "sim", level: "Intermediate",
    one: "Trade in the direction of the day's VWAP: buy when price reclaims VWAP and holds above it, sell when it loses VWAP. Get out when price crosses back.",
    why: "VWAP is the average price everyone paid today, so big traders treat it as fair value. Price holding above it means buyers are in control for the day; below it, sellers.",
    rules: [["Setup", "Between 30 minutes and 5½ hours after the open, a 5-minute candle closes above VWAP after the 6 previous candles all closed below it (buy). Mirror for a sell."], ["Entry", "At that candle's close."], ["Stop", "Beyond the extreme of the last 6 candles (at least 0.5 × ATR away)."], ["Exit", "The first close back on the other side of VWAP, or after 3 hours."]],
    works: "Trending days, when price stays on one side of VWAP for hours.", fails: "Range days: price crisscrosses VWAP and each signal is stopped or exited for a small loss.",
    evidence: "Zarattini & Aziz (2023) tested a VWAP trend strategy on QQQ from 2018 to 2023: $25,000 grew to about $192,000 after commissions. It's one study by practitioners, on one market, so treat it as promising rather than proven.",
    sources: [["VWAP: The Holy Grail for Day Trading Systems (Concretum)", "https://concretumgroup.com/volume-weighted-average-price-vwap-the-holy-grail-for-day-trading-systems/"]],
  },
  pillars: {
    name: "Your 5-pillar playbook", icon: "🏛️", type: "Liquidity reversal (ICT style)", tf: "1–15m", data: "sim", level: "Your strategy",
    one: "Location at a higher-timeframe level → liquidity sweep → change in state of delivery → displacement → execution on an internal pullback, targeting the other side of the range.",
    why: "It combines the Turtle Soup idea (trapped traders after a sweep) with confirmation: wait for delivery to flip and a strong move away before entering, so you only take sweeps that are actually reversing.",
    rules: [["Setup", "Price reaches a higher-timeframe point of interest (PDH/PDL, 4h/1h FVG or order block) and sweeps it."], ["Confirmation", "A close back through the open of the move into the level (CISD), then large-bodied displacement candles away from it."], ["Entry", "On a pullback into an internal FVG/order block or a retest of the CISD level."], ["Stop and exit", "Stop beyond the sweep; target the other side of the range (at least 1.5R)."]],
    works: "Ranges and turning points at obvious highs and lows.", fails: "Strong trends that sweep a level and keep going; days with no clean levels.",
    evidence: "There are no peer-reviewed studies of ICT-style models. The closest published idea is Turtle Soup (above), which also has no reliable published success rate. Our test of a daily version of your model found too few trades (13) to judge.",
    sources: [],
    practise: "scalp",
  },
};
const STRAT_KEYS = Object.keys(STRATS), DAILY_STRATS = ["trend", "soup", "rsi2"], INTRA_STRATS = ["orb", "vwap"];
const BT_KEY = { trend: "trend", soup: "soup", rsi2: "rsi2", pillars: "pillars" };

/* ---- back-adjusted daily prices (same method as the backtest) so futures rolls don't fake signals ---- */
const ADJ = {};
for (const k of SYMS) {
  const I = INST[k], n = I.n, o = I.o.slice(0, n), h = I.h.slice(0, n), l = I.l.slice(0, n), c = I.c.slice(0, n);
  for (const r of [...(I.rolls || [])].sort((a, b) => b - a)) if (r > 0 && r < n) { const gap = o[r] - c[r - 1]; for (let i = 0; i < r; i++) { o[i] += gap; h[i] += gap; l[i] += gap; c[i] += gap; } }
  const atr = new Array(n).fill(null); let a = null;
  for (let i = 0; i < n; i++) { const tr = i ? Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])) : h[i] - l[i]; if (i === 19) { let s = 0; for (let j = 0; j < 20; j++) s += j ? Math.max(h[j] - l[j], Math.abs(h[j] - c[j - 1]), Math.abs(l[j] - c[j - 1])) : h[j] - l[j]; a = s / 20; } else if (i > 19) a = (a * 19 + tr) / 20; atr[i] = a; }
  const r2 = new Array(n).fill(null); let ag = null, al = null;
  for (let i = 1; i < n; i++) { const ch = c[i] - c[i - 1], g = Math.max(ch, 0), lo = Math.max(-ch, 0); if (i === 2) { ag = (Math.max(c[1] - c[0], 0) + g) / 2; al = (Math.max(c[0] - c[1], 0) + lo) / 2; } else if (i > 2) { ag = (ag + g) / 2; al = (al + lo) / 2; } if (i >= 2) r2[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); }
  ADJ[k] = { o, h, l, c, atr, r2 };
}
const smaA = (x, n, i) => { if (i < n - 1) return null; let s = 0; for (let j = i - n + 1; j <= i; j++) s += x[j]; return s / n; };
const minA = (x, a, b) => { let m = Infinity; for (let j = a; j < b; j++) m = Math.min(m, x[j]); return m; };
const maxA = (x, a, b) => { let m = -Infinity; for (let j = a; j < b; j++) m = Math.max(m, x[j]); return m; };

/* ---- daily signals: return {d, ...info} or a "near miss" for teaching what is NOT a setup ---- */
function dailySignal(key, sym, i) {
  const A = ADJ[sym], { o, h, l, c, atr, r2 } = A, a = atr[i]; if (!a || i < 21) return null;
  if (key === "trend") {
    const hi = maxA(h, i - 20, i), lo = minA(l, i - 20, i), d = c[i] > hi ? 1 : c[i] < lo ? -1 : 0;
    if (d) return { d, lvl: d > 0 ? hi : lo, sd: 2 * a };
    if (hi - c[i] < 0.5 * a) return { d: 0, near: "close below the 20-day high", lvl: hi, side: 1 };
    if (c[i] - lo < 0.5 * a) return { d: 0, near: "close above the 20-day low", lvl: lo, side: -1 };
    return null;
  }
  if (key === "soup") {
    let lo = Infinity, loAt = 0, hi = -Infinity, hiAt = 0; for (let j = i - 20; j < i; j++) { if (l[j] < lo) { lo = l[j]; loAt = j; } if (h[j] > hi) { hi = h[j]; hiAt = j; } }
    if (l[i] < lo && c[i] > lo && i - loAt >= 4) return { d: 1, lvl: lo, ext: l[i], sd: c[i] - (l[i] - 0.1 * a) };
    if (h[i] > hi && c[i] < hi && i - hiAt >= 4) return { d: -1, lvl: hi, ext: h[i], sd: (h[i] + 0.1 * a) - c[i] };
    if (l[i] < lo && c[i] <= lo) return { d: 0, near: "broke the 20-day low and closed below it (no reclaim)", lvl: lo, side: 1 };
    if (h[i] > hi && c[i] >= hi) return { d: 0, near: "broke the 20-day high and closed above it (no reclaim)", lvl: hi, side: -1 };
    return null;
  }
  if (key === "rsi2") {
    const s200 = smaA(c, 200, i); if (s200 == null || r2[i] == null) return null;
    if (c[i] > s200 && r2[i] < 10) return { d: 1, rsi: r2[i], s200, sd: 2.5 * a };
    if (c[i] <= s200 && r2[i] < 10) return { d: 0, near: "RSI(2) is low, but price is below its 200-day average", rsi: r2[i], s200, side: 1 };
    if (c[i] > s200 && r2[i] >= 10 && r2[i] < 35) return { d: 0, near: "a pullback, but RSI(2) is not below 10", rsi: r2[i], s200, side: 1 };
    return null;
  }
  return null;
}
const STRAT_POOL = {};
function stratPool(key) {
  if (STRAT_POOL[key]) return STRAT_POOL[key];
  const pos = [], neg = [];
  for (const sym of SYMS) { const S = DSER[sym], H0 = key === "trend" ? 40 : 10;
    for (let i = 21; i < S.n - 30; i++) { const s = dailySignal(key, sym, S.di[i]); if (!s) continue; const H = Math.min(H0, nextBrk(S, i) - i - 1, S.n - 1 - i); if (H < (key === "trend" ? 8 : 5)) continue; (s.d ? pos : neg).push({ sym, t: i, H, s }); } }
  return STRAT_POOL[key] = { pos, neg };
}

/* ---- intraday (simulated) signals ---- */
function intraSignal(key, I, S, j) {
  const di = S.di[j], open = OPEN_MIN[I.sym]; let j0 = -1;
  for (let k = j; k >= 0 && S.di[k] === di; k--) if (minOfDay(S.ts[k]) === open) { j0 = k; break; }
  if (j0 < 0) return null; const sinceOpen = j - j0, a = S.atr[j]; if (!a) return null;
  if (key === "orb") {
    if (sinceOpen < 3 || sinceOpen > 26) return null;
    const orh = Math.max(S.h[j0], S.h[j0 + 1], S.h[j0 + 2]), orl = Math.min(S.l[j0], S.l[j0 + 1], S.l[j0 + 2]);
    for (let k = j0 + 3; k < j; k++) if (S.c[k] > orh || S.c[k] < orl) return null; // only the first breakout counts
    const d = S.c[j] > orh ? 1 : S.c[j] < orl ? -1 : 0, info = { orh, orl, j0, t0: S.ts[j0], t1: S.te[j0 + 2] };
    if (d) { const sd = d > 0 ? S.c[j] - orl : orh - S.c[j]; if (sd < 0.3 * a || sd > 4 * a) return null; return Object.assign(info, { d, sd }); }
    return sinceOpen >= 4 ? Object.assign(info, { d: 0, near: "price is still inside the opening range" }) : null;
  }
  if (key === "vwap") {
    if (!S.vwap || sinceOpen < 6 || sinceOpen > 66 || S.vwap[j] == null) return null;
    const side = k => Math.sign(S.c[k] - S.vwap[k]); let crosses = 0; for (let k = j - 11; k < j; k++) if (k > j0 && side(k) !== side(k - 1)) crosses++;
    const prev = [1, 2, 3, 4, 5, 6].map(m => side(j - m)), now = side(j);
    if (now && prev.every(x => x === -now) && j - 6 > j0) { const d = now, ext = d > 0 ? minA(S.l, j - 6, j + 1) : maxA(S.h, j - 6, j + 1), sd = Math.max(0.5 * a, (S.c[j] - ext) * d); if (sd > 4 * a) return null; return { d, sd, ext, vw: S.vwap[j] }; }
    if (crosses >= 3) return { d: 0, near: "price keeps crossing VWAP (no trend)", vw: S.vwap[j] };
    return null;
  }
  return null;
}
function pickStratIntra(I, key, wantSignal) {
  const tf = "5m", needDays = 2;
  for (let a = 0; a < 30; a++) {
    const di = 25 + Math.floor(Math.random() * Math.max(1, I.n - 27 - needDays)), start = Math.max(0, di - INTRA_DAYS[tf] + 1);
    const S = buildSeries(I, tf, I.se[Math.min(I.n - 1, di + needDays)], start), cand = [];
    for (let j = 60; j < S.n - 8; j++) { if (S.di[j] !== di) continue; const s = intraSignal(key, I, S, j); if (s && !!s.d === wantSignal) cand.push([j, s]); }
    if (!cand.length) continue;
    const [j, s] = pick(cand); let end = j; while (end + 1 < S.n && S.di[end + 1] === di && S.ts[end + 1] < I.se[di]) end++;
    const H = Math.min(36, end - j, nextBrk(S, j) - j - 1); if (H < 8) continue;
    return { I, tf, start, t: j, H, tDec: S.te[j], tEnd: S.te[j + H], ev: null, strat: Object.assign({ key }, s) };
  }
  return null;
}
function stratLevel(key) { const s = (ST.strat || {})[key]; const n = s ? s.n : 0; return n < 4 ? 1 : n < 12 ? 2 : 3; }
function pickStratRound() {
  const allowed = allowedSyms(), keys = ST.stratKey && STRATS[ST.stratKey] && ST.stratKey !== "pillars" ? [ST.stratKey] : DAILY_STRATS.concat(INTRA_STRATS);
  for (let tries = 0; tries < 20; tries++) {
    const key = pick(keys), lv = stratLevel(key), wantSignal = Math.random() < (lv === 1 ? 0.75 : lv === 2 ? 0.62 : 0.5);
    if (DAILY_STRATS.includes(key)) {
      const P = stratPool(key), list = (wantSignal ? P.pos : P.neg).filter(x => allowed.includes(x.sym)); if (!list.length) continue;
      const x = pick(list), I = INST[x.sym];
      return { I, tf: "1D", t: x.t, H: x.H, tDec: I.se[x.t], tEnd: I.se[x.t + x.H], ev: null, strat: Object.assign({ key }, x.s) };
    }
    const r = pickStratIntra(INST[pick(allowed)], key, wantSignal); if (r) return r;
  }
  return null;
}

/* ---- the plan the strategy dictates, for either direction (the other direction is used for "what if") ---- */
function stratPlan(dir) {
  const s = G.strat, Sr = G.Sr, t = G.t, I = G.I, A = DAILY_STRATS.includes(s.key) ? ADJ[I.sym] : null, e = Sr.c[t], a = Sr.atr[t];
  const same = dir === s.d, mapDi = i => Sr.di[i];
  let sd, rr = null, rule = null, stopTxt, exitTxt;
  if (s.key === "trend") {
    sd = same ? s.sd : 2 * ADJ[I.sym].atr[mapDi(t)];
    rule = i => { const k = mapDi(i); return dir > 0 ? A.c[k] < minA(A.l, k - 10, k) : A.c[k] > maxA(A.h, k - 10, k); };
    stopTxt = "2 × ATR from entry"; exitTxt = `a close ${dir > 0 ? "below the 10-day low" : "above the 10-day high"}`;
  } else if (s.key === "soup") {
    sd = same ? s.sd : (dir > 0 ? e - (Sr.l[t] - 0.1 * ADJ[I.sym].atr[mapDi(t)]) : (Sr.h[t] + 0.1 * ADJ[I.sym].atr[mapDi(t)]) - e); rr = 2;
    stopTxt = "just beyond the sweep"; exitTxt = "2R target or 10 days";
  } else if (s.key === "rsi2") {
    sd = 2.5 * ADJ[I.sym].atr[mapDi(t)]; rule = i => { const k = mapDi(i), m = smaA(A.c, 5, k); return dir > 0 ? A.c[k] > m : A.c[k] < m; };
    stopTxt = "2.5 × ATR safety stop"; exitTxt = `the first close ${dir > 0 ? "above" : "below"} the 5-day average`;
  } else if (s.key === "orb") {
    sd = same ? s.sd : Math.max(0.3 * a, dir > 0 ? e - s.orl : s.orh - e); rr = 2;
    stopTxt = "the other side of the opening range"; exitTxt = "2R target or the end of the session";
  } else if (s.key === "vwap") {
    sd = same ? s.sd : Math.max(0.5 * a, dir > 0 ? e - minA(Sr.l, t - 6, t + 1) : maxA(Sr.h, t - 6, t + 1) - e);
    rule = i => Sr.vwap && Sr.vwap[i] != null && (dir > 0 ? Sr.c[i] < Sr.vwap[i] : Sr.c[i] > Sr.vwap[i]);
    stopTxt = "beyond the last 6 candles"; exitTxt = `a close back ${dir > 0 ? "below" : "above"} VWAP`;
  }
  sd = Math.max(sd, I.tick * 2);
  return { sd, rr, rule, stop: e - dir * sd, tgt: rr ? e + dir * rr * sd : null, stopTxt, exitTxt };
}

/* ---- beginner-friendly questions for each strategy ---- */
function stratQs() {
  const s = G.strat, K = STRATS[s.key], I = G.I, S = G.Sv, t = G.t, lv = stratLevel(s.key), qs = [], L3 = lv >= 3;
  const dirOpts = (yesB, yesS, no) => [{ k: "1", label: yesB, s: "Buy signal" }, { k: "-1", label: yesS, s: "Sell signal" }, { k: "0", label: no, s: "No signal" }];
  const mk = (o) => Object.assign({ skill: "strategy", kind: "mc", tag: `${K.icon} ${K.name}`, explain: ch => stratExplain(o, ch) }, o.key !== "setup" ? { tf: G.tf } : {}, o);
  // Q1: is there a setup right now?
  if (s.key === "trend") qs.push(mk({ key: "setup", title: "Did today's candle close beyond its 20-day range?", sub: `The dashed lines mark the highest high and lowest low of the 20 days before today.`, opts: dirOpts("Yes: it closed above the 20-day high (buy)", "Yes: it closed below the 20-day low (sell)", "No: it closed inside the range"), correct: String(s.d), tip: "Compare today's CLOSE (the end of the candle body) with the two dashed lines. A wick poking through doesn't count; only the close does." }));
  if (s.key === "soup") qs.push(mk({ key: "setup", title: "Is this a Turtle Soup setup (a failed breakout)?", sub: "The dashed lines mark the 20-day high and low before today.", opts: dirOpts("Yes: it swept the 20-day low and closed back above it (buy)", "Yes: it swept the 20-day high and closed back below it (sell)", "No: no failed breakout today"), correct: String(s.d), tip: "Two things must both happen today: price goes past the dashed line (the sweep), AND the candle closes back on the inside of it (the failure)." }));
  if (s.key === "rsi2") qs.push(mk({ key: "setup", title: "Is this an RSI(2) dip-buy signal?", sub: `Two checks: is price above its 200-day average, and is the 2-period RSI below 10? (RSI(2) today: ${s.rsi != null ? s.rsi.toFixed(1) : "—"}.)`, opts: [{ k: "1", label: "Yes: above the 200-day average and RSI(2) below 10", s: "Buy signal" }, { k: "0a", label: "No: RSI(2) isn't below 10", s: "No: RSI too high" }, { k: "0b", label: "No: price is below the 200-day average", s: "No: below the 200-day" }], correct: s.d ? "1" : s.near && s.near.includes("200") ? "0b" : "0a", tip: "The orange line is the 200-day average. Buys are only allowed when price is above it. Then RSI(2) must be under 10, which means the last couple of days fell hard." }));
  if (s.key === "orb") qs.push(mk({ key: "setup", title: "Has price broken out of the opening range?", sub: "The shaded box is the opening range: the high and low of the first 15 minutes after the open.", opts: dirOpts("Yes: a candle closed above the range (buy)", "Yes: a candle closed below the range (sell)", "No: price is still inside the range"), correct: String(s.d), tip: "Look at the latest candle's close compared with the top and bottom of the shaded box." }));
  if (s.key === "vwap") qs.push(mk({ key: "setup", title: "Is there a clean VWAP trend signal right now?", sub: "The amber line is VWAP. A signal is a close on the other side of VWAP after 6 candles in a row on the first side.", opts: dirOpts("Yes: it just reclaimed VWAP after 6 closes below (buy)", "Yes: it just lost VWAP after 6 closes above (sell)", "No: price is chopping around VWAP"), correct: String(s.d), tip: "Count the last 6 candles: were they all on one side of the amber line? Did the latest candle close on the other side?" }));
  // Q2: stop (signal) or what's missing (no signal)
  const stopOpts = {
    trend: [["2 × ATR (two average daily ranges) from the entry", 1], ["Just beyond today's candle", 0], ["No stop: trends always come back", 0]],
    soup: [["Just beyond the sweep (today's extreme)", 1], ["At the old 20-day level that was swept", 0], ["5% away from the entry", 0]],
    rsi2: [["A safety stop 2.5 × ATR below entry", 1], ["Just under today's low", 0], ["At the 200-day average", 0]],
    orb: [["On the other side of the opening range", 1], ["In the middle of today's first candle", 0], ["At yesterday's low", 0]],
    vwap: [["Beyond the extreme of the last 6 candles", 1], ["Exactly on the VWAP line", 0], ["No stop: you exit when VWAP is crossed", 0]],
  }[s.key];
  const sh = shuffle(stopOpts.map((o, i) => ({ k: "s" + i, label: o[0], s: o[0], ok: o[1] })));
  qs.push(mk({ key: "stop", title: `Where does ${K.name} put the stop-loss?`, sub: "The stop is where the idea is proven wrong.", opts: sh.slice(0, L3 ? 3 : 3), correct: sh.find(o => o.ok).k, tip: K.rules.find(r => r[0].startsWith("Stop"))[1] }));
  // Q3: exit rule
  const exitOpts = {
    trend: [["When price closes beyond the 10-day low/high against you (let winners run)", 1], ["At a fixed 1R profit", 0], ["At the end of the same day", 0]],
    soup: [["At a 2R target, or after 10 days", 1], ["When price makes a new 20-day extreme", 0], ["Only when the stop is hit", 0]],
    rsi2: [["At the first close above the 5-day average", 1], ["When RSI(2) goes above 90", 0], ["After exactly 20 days", 0]],
    orb: [["At 2R, or by the end of the session", 1], ["When price returns to the opening range middle", 0], ["Hold overnight for a bigger move", 0]],
    vwap: [["At the first close back on the other side of VWAP", 1], ["At a fixed 1R target", 0], ["When volume drops", 0]],
  }[s.key];
  const eh = shuffle(exitOpts.map((o, i) => ({ k: "e" + i, label: o[0], s: o[0], ok: o[1] })));
  qs.push(mk({ key: "exit", title: `How does ${K.name} take profit?`, sub: "Knowing the exit before you enter is what makes it a system.", opts: eh, correct: eh.find(o => o.ok).k, tip: K.rules.find(r => r[0].startsWith("Exit") || r[0].startsWith("Stop and exit"))[1] }));
  if (lv >= 2 && s.d) { // once the basics are known, the stop question asks for the actual price
    const pl = stratPlan(s.d), right = pl.stop, A = S.atr[t], wrong = [right + s.d * 0.9 * A, right - s.d * 1.1 * A];
    const opts = shuffle([{ k: "r", label: fp(I, right), s: fp(I, right) }, { k: "w1", label: fp(I, wrong[0]), s: fp(I, wrong[0]) }, { k: "w2", label: fp(I, wrong[1]), s: fp(I, wrong[1]) }]);
    qs[1] = mk({ key: "stopnum", title: `You ${s.d > 0 ? "buy" : "sell"} at ${fp(I, S.c[t])}. Which price is the strategy's stop?`, sub: `ATR here is ${fp(I, A)}. Rule: the stop goes ${pl.stopTxt}.`, opts, correct: "r", tip: "Start at the entry price and move the stop distance away from it, on the losing side (below the entry for a buy, above it for a sell)." });
  }
  return qs;
}
function stratExplain(q, ch) {
  const s = G.strat, K = STRATS[s.key], I = G.I, S = G.Sv, t = G.t, pl = s.d ? stratPlan(s.d) : null;
  if (q.key === "setup") {
    const why = s.d ? `This is a ${s.d > 0 ? "buy" : "sell"} signal. ${K.rules[0][1]}` : `No signal: ${s.near}. ${K.rules[0][1]}`, off = stratOff();
    return report({ why, kpis: s.key === "trend" || s.key === "soup" ? [["Level", fp(I, s.lvl + off)], ["Today's close", fp(I, S.c[t])], ["Today's range", `${fp(I, S.l[t])}–${fp(I, S.h[t])}`]] : s.key === "rsi2" ? [["RSI(2)", s.rsi.toFixed(1), s.rsi < 10 ? "pos" : ""], ["200-day avg", fp(I, s.s200 + off)], ["Close", fp(I, S.c[t])]] : s.key === "orb" ? [["Range high", fp(I, s.orh)], ["Range low", fp(I, s.orl)], ["Latest close", fp(I, S.c[t])]] : [["VWAP", fp(I, s.vw)], ["Latest close", fp(I, S.c[t])]],
      warn: s.d ? "A signal isn't a guarantee: it's the moment the rules say to act. Over many trades the rules either have an edge or they don't." : "Learning to skip non-signals is half of any strategy. Most days there is nothing to do." });
  }
  if (q.key === "stop" || q.key === "stopnum") return report({ why: `${K.name} puts the stop ${pl ? pl.stopTxt : K.rules.find(r => r[0].startsWith("Stop"))[1].toLowerCase()}. ${pl ? `Here that's ${fp(I, pl.stop)}, ${fp(I, pl.sd)} from the entry.` : ""}`, warn: "The stop decides your position size: risk ÷ stop distance = how many contracts." });
  return report({ why: `${K.name} exits on ${pl ? pl.exitTxt : K.rules.find(r => r[0].startsWith("Exit") || r[0].startsWith("Stop and exit"))[1].toLowerCase()}.`, warn: s.key === "trend" ? "Trend following loses small, often, and makes its money from a few huge winners. Cutting winners early destroys it." : "Sticking to the exit rule, even when it hurts, is what lets you measure whether the strategy works." });
}

const stratOff = () => DAILY_STRATS.includes(G.strat.key) ? G.Sv.c[G.t] - ADJ[G.I.sym].c[G.Sv.di[G.t]] : 0; // adjusted -> chart prices
/* ---- chart marks that show the strategy's levels ---- */
function stratMarks() {
  const s = G.strat, S = G.Sv, t = G.t, I = G.I, out = [], col = "#e7b35a";
  if (s.key === "trend" || s.key === "soup") { const A = ADJ[I.sym], k = S.di[t], off = S.c[t] - A.c[k], hi = maxA(A.h, k - 20, k) + off, lo = minA(A.l, k - 20, k) + off;
    out.push({ type: "zone", lo: hi, hi: hi, t0: S.ts[Math.max(0, t - 20)], color: col, label: "20-day high", dash: true }, { type: "zone", lo, hi: lo, t0: S.ts[Math.max(0, t - 20)], color: col, label: "20-day low", dash: true }); }
  if (s.key === "orb") out.push({ type: "zone", lo: s.orl, hi: s.orh, t0: s.t0, color: col, label: "Opening range" });
  if (s.key === "rsi2" && s.s200 != null) { const v = s.s200 + stratOff(); out.push({ type: "zone", lo: v, hi: v, t0: S.ts[Math.max(0, t - 30)], color: "#f59e0b", label: "200-day average" }); }
  return out;
}
function setupStrat() {
  G.sm = true; G.qs = stratQs(); G.overlays.push(...stratMarks());
}
function stratFinish() {
  const s = G.strat, P = G.pos, want = s.d, followed = G.dir === want, st = (ST.strat || (ST.strat = {}))[s.key] || (ST.strat[s.key] = { n: 0, follow: 0, trades: 0, wins: 0, R: 0, qN: 0, qC: 0 });
  st.n++; if (followed) st.follow++; if (P) { st.trades++; if (P.R > 0) st.wins++; st.R += P.R; }
  for (const q of G.qs) { st.qN++; if (q.score >= 1) st.qC++; }
  save(); return { want, followed, st };
}
function stratReviewHTML(sr) {
  const s = G.strat, K = STRATS[s.key], I = G.I, P = G.pos, d = s.d, ruleBuy = G.buy, ruleSell = G.sell, rr = d ? (d > 0 ? ruleBuy : ruleSell) : null;
  const bt = BT[BT_KEY[s.key]];
  return `<div class="sec"><h3>${K.icon} ${esc(K.name)}: rules check</h3>
    <ul class="blist"><li><span><b>Signal:</b> ${d ? `${d > 0 ? "BUY" : "SELL"} at ${fp(I, G.Sv.c[G.t])}` : `none (${esc(s.near || "no setup")})`}.</span></li>
    <li><span><b>You:</b> ${G.dir > 0 ? "bought" : G.dir < 0 ? "sold" : "stayed out"}. ${sr.followed ? "✓ That's exactly what the rules said." : d ? `✕ The rules said ${d > 0 ? "buy" : "sell"}.` : "✕ The rules said stay out: no signal."}</span></li>
    ${rr ? `<li><span><b>Following the rules here:</b> ${exitLabel(rr)}, ${rr.R >= 0 ? "+" : ""}${rr.R.toFixed(2)}R (${fusd(rr.R * G.riskUSD)} before fees).</span></li>` : ""}
    <li><span><b>Your record with this strategy:</b> ${sr.st.n} round${sr.st.n === 1 ? "" : "s"}, followed the rules ${Math.round(sr.st.follow / sr.st.n * 100)}% of the time${sr.st.trades ? `, ${sr.st.trades} trade${sr.st.trades === 1 ? "" : "s"} totalling ${sr.st.R >= 0 ? "+" : ""}${sr.st.R.toFixed(1)}R` : ""}.</span></li></ul>
    ${bt ? `<p class="small" style="margin:6px 0 0">Backtest of these exact rules on this app's real daily data: ${bt.all.n} trades, ${bt.all.win}% winners, ${bt.all.avgR >= 0 ? "+" : ""}${bt.all.avgR}R per trade after costs. One round tells you almost nothing; judge a strategy over 50–100+ trades.</p>` : `<p class="small" style="margin:6px 0 0">These intraday candles are simulated, so this round trains spotting the setup, not whether it makes money. ${esc(K.evidence)}</p>`}
    <button class="btn ghost" id="openlib" style="margin-top:8px">📚 Open the strategy library</button></div>`;
}
function stratLesson(sr) {
  const s = G.strat, K = STRATS[s.key];
  if (!s.d) return sr.followed ? `No signal, no trade. ${K.name} only acts when its exact conditions are met, and skipping the rest is part of the edge.` : `There was no ${K.name} signal here (${s.near}). Trading anyway turns a tested system into a guess.`;
  return sr.followed ? `You took the signal and let the rules manage it. Whatever this one did, consistency is how a strategy's real results show up.` : `The rules gave a ${s.d > 0 ? "buy" : "sell"} signal. Skipping or fading signals you don't "like" is how traders end up with results nothing like the backtest.`;
}

/* ---- the library sheet ---- */
function btTable(key) {
  const b = BT[BT_KEY[key]]; if (!b) return "";
  const row = (lab, x) => `<tr><td>${lab}</td><td class="r">${x.n}</td><td class="r">${x.n ? x.win + "%" : "—"}</td><td class="r ${toneOf(x.avgR || 0)}">${x.n ? (x.avgR >= 0 ? "+" : "") + x.avgR + "R" : "—"}</td><td class="r">${x.n ? x.maxDD + "R" : "—"}</td></tr>`;
  return `<table class="jr bt"><thead><tr><th>Market</th><th class="r">Trades</th><th class="r">Won</th><th class="r">Avg</th><th class="r">Max DD</th></tr></thead><tbody>${row("<b>All</b>", b.all)}${SYMS.map(m => row(INST[m].short, b.per[m])).join("")}${row("1st half of data", b.first)}${row("2nd half", b.second)}</tbody></table>
    <p class="small">Real daily candles: Bitcoin Apr 2021–Jun 2023, and one year (Sep 2025–Oct 2026) of S&amp;P 500, Nasdaq, crude oil and gold front-month futures (adjusted for contract rolls). Costs included: 1 tick slippage each side plus commission. 1R = the money risked per trade. Fewer than ~100 trades is a small sample.</p>`;
}
function openStrats(focus) {
  const card = k => { const K = STRATS[k], st = (ST.strat || {})[k];
    return `<details class="strat" ${focus === k ? "open" : ""}><summary><span class="si">${K.icon}</span><span class="sn"><b>${esc(K.name)}</b><small>${esc(K.type)} · ${K.tf} · ${K.data === "real" ? "real daily data" : "simulated intraday"} · ${esc(K.level)}</small></span></summary>
      <p><b>In one line:</b> ${esc(K.one)}</p><p><b>Why it can work:</b> ${esc(K.why)}</p>
      <h4>The rules</h4><ul class="blist">${K.rules.map(r => `<li><span><b>${esc(r[0])}:</b> ${esc(r[1])}</span></li>`).join("")}</ul>
      <p><b>Works best:</b> ${esc(K.works)}<br><b>Struggles:</b> ${esc(K.fails)}</p>
      <h4>Evidence</h4><p>${esc(K.evidence)}</p>
      ${BT[BT_KEY[k]] ? `<h4>Our backtest (exact rules, real data)</h4>${btTable(k)}` : `<p class="small">Not backtested here: the app has no real intraday price history, so results above come from the published studies.</p>`}
      ${K.sources.length ? `<p class="small">Sources: ${K.sources.map(s => `<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(" · ")}</p>` : ""}
      ${st ? `<p class="small">You: ${st.n} rounds · rules followed ${Math.round(st.follow / st.n * 100)}% · questions right ${st.qN ? Math.round(st.qC / st.qN * 100) : 0}%</p>` : ""}
      <button class="btn pri" data-prac="${k}">Practise ${esc(K.name)} →</button></details>`; };
  openSheet(`${shead("Strategy library")}
    <p class="small">Six well-known approaches, each with exact rules you can practise. <b>None is guaranteed to make money</b>: every one has losing streaks, and backtests on one or two years of data are small samples. Trend following has by far the strongest long-run evidence.</p>
    <div class="strats">${STRAT_KEYS.map(card).join("")}</div>
    <button class="btn" data-prac="mix" style="margin-top:10px">🎲 Practise a mix of all strategies</button>`, s => {
    $$("[data-prac]", s).forEach(b => b.onclick = () => { const k = b.dataset.prac; if (k === "pillars") { ST.style = "scalp"; } else { ST.style = "strat"; ST.stratKey = k === "mix" ? null : k; } save(); closeSheet(); newRound(); toast(k === "pillars" ? "Practising your 5-pillar playbook" : k === "mix" ? "Practising a mix of strategies" : `Practising ${STRATS[k].name}`); });
  });
}

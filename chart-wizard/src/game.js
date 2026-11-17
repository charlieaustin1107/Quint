/* ================= ACCOUNT, PROGRESSION & STORAGE ================= */
const KEY = "chart-wizard-v3";
let ST = { xp: 0, bal: 10000, rounds: 0, trades: 0, wins: 0, net: 0, readsNet: 0, fees: 0, procG: 0, procN: 0, qN: 0, qC: 0, qStreak: 0, best: 0, played: [], evDone: [], skills: {}, eq: [10000], jr: [], peak: 10000, maxDD: 0, riskPct: 1, speed: 2, style: "scalp", timers: true, vwap: true, mkt: "all", tfMode: "auto", sma: false, vol: true, rsi: false, magnet: true, marks: true, seenTut: false };
try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && typeof s === "object") ST = Object.assign(ST, s); } catch (e) {}
if (!Array.isArray(ST.eq) || !ST.eq.length) ST.eq = [ST.bal];
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} };
const RANKS = [[0, "Novice"], [150, "Apprentice"], [400, "Chart Reader"], [800, "Pattern Hunter"], [1400, "Analyst"], [2200, "Technician"], [3300, "Strategist"], [4800, "Chart Wizard"], [7000, "Grand Wizard"]];
const rankOf = xp => { let r = 0; RANKS.forEach((x, i) => { if (xp >= x[0]) r = i; }); return r; };
// Difficulty grows with rank: new question types, bigger stakes, stricter grading
const TIERS = [
  { name: "Foundations", stake: 25, q: 2, tol: 1.4, opts: 3, speed: false, pool: ["trend", "ema", "levels", "candles", "range"], tf: [["1D", .55], ["4h", .2], ["1h", .15], ["15m", .1]], unlock: "Trend, the 20 EMA, candle size and patterns, drawing support and resistance." },
  { name: "Structure", stake: 40, q: 3, tol: 1.2, opts: 3, speed: false, pool: ["mtf", "trend", "ema", "structure", "levels", "candles", "range", "rsi"], tf: [["1D", .45], ["4h", .18], ["1h", .15], ["15m", .12], ["5m", .1]], unlock: "Market structure (higher highs and lows), RSI, top-down timeframe checks. Answers now worth ±$40." },
  { name: "Confluence", stake: 60, q: 3, tol: 1.0, opts: 4, speed: true, pool: ["mtf", "trend", "structure", "tlines", "levels", "volume", "candles", "rsi", "div"], tf: [["1D", .4], ["4h", .16], ["1h", .15], ["15m", .15], ["5m", .14]], unlock: "RSI divergence, trend-line drawing, volume, 4-choice pattern questions, speed bonuses. ±$60 per answer." },
  { name: "Execution", stake: 80, q: 3, tol: 0.85, opts: 4, speed: true, pool: ["mtf", "trend", "structure", "tlines", "levels", "stop", "rr", "volume", "candles", "div", "rsi"], tf: [["1D", .4], ["4h", .16], ["1h", .15], ["15m", .15], ["5m", .14]], unlock: "Stop placement and reward-to-risk planning. Easy questions retired, drawings graded tighter. ±$80 per answer." },
  { name: "Mastery", stake: 100, q: 4, tol: 0.7, opts: 4, speed: true, pool: ["mtf", "trend", "structure", "tlines", "levels", "stop", "rr", "volume", "candles", "div", "rsi"], tf: [["1D", .4], ["4h", .16], ["1h", .15], ["15m", .15], ["5m", .14]], unlock: "Four questions per chart and the strictest grading. ±$100 per answer." },
];
const OPEN_MIN = { ES: 570, NQ: 570, CL: 540, GC: 500, BTC: 810 }; // US session open (wall-clock minute of day; BTC uses 13:30 UTC)
const minOfDay = m => ((m % 1440) + 1440) % 1440;
const HTF = { "1m": "15m", "5m": "1h", "15m": "4h", "1h": "1D", "4h": "1D" };
const isScalp = () => G ? G.style === "scalp" : ST.style === "scalp";
const tierOf = (xp = ST.xp) => Math.min(TIERS.length - 1, Math.floor(rankOf(xp) / 2));
const SKILLS = [["mtf", "Top-down (timeframes)"], ["trend", "Trend & averages"], ["structure", "Market structure"], ["tlines", "Trend lines"], ["levels", "Support & resistance"], ["risk", "Risk & trade planning"], ["volume", "Volume"], ["candles", "Candles & volatility"], ["momentum", "Momentum (RSI)"], ["trading", "Trade decisions"]];
function mastery(k) { const s = ST.skills[k]; if (!s || !s.r.length) return 0; const r = s.r.slice(-12); return r.reduce((a, b) => a + b, 0) / r.length; }
function recordSkill(k, score) { const s = ST.skills[k] || (ST.skills[k] = { n: 0, sum: 0, r: [] }); s.n++; s.sum += score; s.r.push(Math.round(score * 100) / 100); if (s.r.length > 30) s.r.shift(); }
function hexIcon(lv, size = 30) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="hg${size}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><path d="M20 2 36 11v18L20 38 4 29V11z" fill="#0b1020" stroke="url(#hg${size})" stroke-width="2.5"/><text x="20" y="25.5" text-anchor="middle" font-size="14" font-weight="800" fill="#f2f6ff" font-family="system-ui, sans-serif">${lv}</text></svg>`;
}
function renderRank() {
  const r = rankOf(ST.xp), lo = RANKS[r][0], hi = r + 1 < RANKS.length ? RANKS[r + 1][0] : lo;
  $("#rankico").innerHTML = hexIcon(r + 1); $("#balv").textContent = fbal(ST.bal); const cp = (ST.accts || []).filter(A => A !== ST.acct && A.copy && !A.locked).length; $("#ranklv").textContent = `${acctLabel()}${cp ? ` ⧉${cp}` : ""} · ${RANKS[r][1]}`;
  $("#xpfill").style.width = (hi > lo ? (ST.xp - lo) / (hi - lo) * 100 : 100) + "%";
}
function floatAt(el, text, cls) {
  const src = (el && el.getBoundingClientRect) ? el.getBoundingClientRect() : $("#rankbtn").getBoundingClientRect();
  const f = document.createElement("div"); f.className = "float"; f.textContent = text; if (cls === "neg") f.style.color = "#ff8a87", f.style.textShadow = "0 0 10px rgba(239,83,80,.7)"; else if (cls === "pos") f.style.color = "#7ee8dc";
  f.style.left = (src.left + src.width / 2 - 30) + "px"; f.style.top = (src.top - 6) + "px"; document.body.appendChild(f); setTimeout(() => f.remove(), 1200);
}
/* ---------- prop-firm style account: evaluation -> funded -> payouts -> scaling ---------- */
const ACCTS = { 50000: { name: "50K", target: 3000, dd: 2000, cap: 50, payoutMin: 1500 }, 100000: { name: "100K", target: 6000, dd: 3000, cap: 100, payoutMin: 3000 }, 150000: { name: "150K", target: 9000, dd: 4500, cap: 150, payoutMin: 4500 } };
const SIZES = [50000, 100000, 150000], SPLIT = 0.9, SCALE_AFTER = 3;
// Several prop accounts at once (like a real prop trader): one is "primary" (the one you trade), the others can copy its trades.
const EVAL_FEE = { 50000: 150, 100000: 250, 150000: 350 }, MAX_ACCTS = 5, LIVE_NEED = { payouts: 3, wallet: 2500 };
const confOf = A => A && A.stage === "live" ? { name: "Live", target: Infinity, dd: Math.max(1, A.start), cap: clamp(Math.floor(A.start / 1000), 10, 150), payoutMin: Infinity, live: true } : (ACCTS[A && A.size] || ACCTS[50000]);
const AC = () => confOf(ST.acct);
const wallet = () => ST.wallet || (ST.wallet = { paid: 0, fees: 0, live: 0 });
const walletNet = () => { const W = wallet(); return W.paid - W.fees - W.live; };
function resetAcct(A, size, stage, why) {
  const C = ACCTS[size] || ACCTS[50000];
  Object.assign(A, { size, stage, start: size, peak: size, floor: size - C.dd, locked: false, bal: size, okPay: false });
  A.log = A.log || []; A.log.unshift({ t: Date.now(), ev: why, size, stage }); if (A.log.length > 30) A.log.pop();
  if (stage === "eval" && ["start", "new", "failed", "lost-funded", "restart"].includes(why)) wallet().fees += EVAL_FEE[size] || 150; // evaluations cost money, like the real thing
}
function startAccount(size, stage, why) {
  const A = ST.acct; resetAcct(A, size, stage, why);
  ST.bal = size; ST.peak = size; ST.eq.push(size); if (ST.eq.length > 400) ST.eq.shift();
  save(); if (ACCT_READY) renderRank();
}
function trackAcct(A) { A.peak = Math.max(A.peak, A.bal); if (A.stage !== "live") A.floor = Math.max(A.floor, Math.min(A.start, A.peak - confOf(A).dd)); }
let ACCT_READY = false;
function acctTrack() { const A = ST.acct; A.bal = ST.bal; trackAcct(A); }
const acctLabel = () => ST.acct.stage === "live" ? "Live" : `${AC().name} ${ST.acct.stage === "eval" ? "Eval" : "Funded"}`;
// copy a finished trade onto every other account that has copying switched on (same contracts, capped by each account's limit)
function copyTrade(P, I) {
  const out = []; if (!ST.accts || ST.accts.length < 2 || !P || !P.exit) return out;
  const K = contractSpec(I), pm = Math.max(1, Math.round(P.qty * I.pv / K.micro));
  for (const A of ST.accts) {
    if (A === ST.acct || !A.copy || A.locked) continue;
    const C = confOf(A), m = Math.min(pm, C.cap), q = m * K.micro / I.pv, fees = feeFor(I, q, P.e);
    let net = P.R * P.risk * (q / P.qty) - fees, liq = false;
    if (A.bal + Math.min(0, P.mae || 0) * q * I.pv - fees <= A.floor + 0.005) { net = Math.min(net, A.floor - A.bal); liq = true; } // liquidated at the loss limit mid-trade
    net = Math.round(net * 100) / 100; A.bal = Math.round((A.bal + net) * 100) / 100; trackAcct(A);
    let ev = null; const profit = A.bal - A.start;
    if (A.stage === "live") { if (A.bal <= 0.005) { A.locked = true; ev = "breach"; } }
    else if (A.bal <= A.floor + 0.005) { A.locked = true; A.breaches = (A.breaches || 0) + 1; ev = "breach"; }
    else if (A.stage === "eval" && profit >= C.target) { A.passed = (A.passed || 0) + 1; resetAcct(A, A.size, "funded", "passed"); ev = "pass"; }
    else if (A.stage === "funded" && profit >= C.payoutMin) { A.okPay = true; ev = "payout"; }
    out.push({ A, net, m, liq, ev });
  }
  save(); return out;
}
const acctName = A => A.stage === "live" ? `Live ${fbal(A.start)}` : `${confOf(A).name} ${A.stage === "eval" ? "Eval" : "Funded"}`;
function copyHTML(res) {
  if (!res || !res.length) return "";
  return `<p class="copyres">⧉ Copied to ${res.length} more account${res.length > 1 ? "s" : ""}: ${res.map(r => `<span>${esc(acctName(r.A))} <b class="${toneOf(r.net)}">${fusd(r.net)}</b>${r.ev === "pass" ? " 🏆 passed!" : r.ev === "payout" ? " 💰 payout ready" : r.ev === "breach" ? (r.liq ? " ✕ liquidated at the limit" : " ✕ loss limit hit") : ""}</span>`).join(" · ")}</p>`;
}
const riskBudget = pct => Math.round(ST.acct.size * pct / 100);
let ROOM_HOLD = 0; // room kept free for other open live trades while one trade is sized or checked
const roomLeft = () => Math.max(0, ST.bal - ST.acct.floor - ROOM_HOLD);
const liqPrice = (P, I) => P.e - P.dir * Math.max(0, roomLeft() - P.fees) / (P.qty * I.pv);
// keep a stop inside the loss limit: returns the stop moved just inside it (or the stop unchanged)
function fitStop(P, I, v) { if (P.liq == null || (P.liq - P.e) * P.dir >= -2 * I.tick) return v; const t = I.tick; /* with no room at all, it's left to the loss limit */ return P.dir > 0 ? Math.max(v, Math.ceil((P.liq + t) / t) * t) : Math.min(v, Math.floor((P.liq - t) / t) * t); }
// the most contracts whose stop still fits inside the room before the loss limit (with fees), so the stop is always hit first
function roomMicros(I, sd, e) { const S = contractSpec(I), room = roomLeft(); let m = Math.floor(room / (sd * S.micro + feeFor(I, S.micro / I.pv, e)) + 1e-9); return Math.max(0, m); }
function acctCheck() { // called when a round ends
  const A = ST.acct, C = AC(), profit = ST.bal - A.start;
  if (A.stage === "live") { if (ST.bal <= 0.005) { if (!A.locked) { A.locked = true; save(); } return { kind: "breach" }; } return null; }
  if (ST.bal <= A.floor + 0.005) { if (!A.locked) { A.locked = true; A.breaches++; save(); } return { kind: "breach" }; }
  if (A.stage === "eval" && profit >= C.target) return { kind: "pass" };
  if (A.stage === "funded" && profit >= C.payoutMin) return { kind: "payout", amount: Math.round(profit * SPLIT) };
  return null;
}
function acctAct(kind) {
  const A = ST.acct, i = SIZES.indexOf(A.size);
  if (kind === "breach" && A.stage === "live") { const other = ST.accts.findIndex(x => x !== A && !x.locked); if (other >= 0) setPrimary(other); toast("Your live account is empty. That's why risk limits matter."); return; }
  if (kind === "breach") { A.attempts++; startAccount(A.size, "eval", A.stage === "funded" ? "lost-funded" : "failed"); toast(`New ${AC().name} evaluation started. Same rules, fresh start.`); }
  else if (kind === "pass") { A.passed++; startAccount(A.size, "funded", "passed"); celebrate("Evaluation passed!", `You're funded: ${AC().name} account, 90% profit split.`); }
  else if (kind === "payout") {
    const amt = Math.round((ST.bal - A.start) * SPLIT); A.payouts++; A.paidOut += amt; wallet().paid += amt;
    const up = A.payouts % SCALE_AFTER === 0 && i < SIZES.length - 1;
    startAccount(up ? SIZES[i + 1] : A.size, "funded", up ? "scaled" : "payout");
    celebrate(`Payout: ${fbal(amt)}`, up ? `${SCALE_AFTER} payouts done: you've been scaled up to a ${AC().name} funded account.` : `That's ${fbal(A.paidOut)} paid out so far. Your account resets to ${fbal(A.start)} for the next cycle.`);
  }
}
function celebrate(title, sub, kick = "Prop account", icon = "🏆") {
  const d = document.createElement("div"); d.className = "rankup prop"; d.innerHTML = `<small>${esc(kick)}</small><div style="font-size:30px">${icon}</div><div><b>${esc(title)}</b></div><div class="small" style="max-width:270px;margin-top:6px">${esc(sub)}</div>`;
  document.body.appendChild(d); setTimeout(() => d.remove(), 4200);
}
function acctEventHTML(ev) {
  const A = ST.acct, C = AC();
  if (ev.kind === "breach") return `<div class="fb bad"><div class="fbh"><span class="verd">Loss limit hit: ${A.stage === "funded" ? "funded account lost" : "evaluation failed"}</span></div><p>Your balance reached the floor of ${fbal(A.floor)}. At a real prop firm this account would now be closed. This is attempt ${A.attempts}${A.passed ? `, and you've passed ${A.passed} evaluation${A.passed > 1 ? "s" : ""} before` : ""}.</p><p class="small" style="margin:0">Most evaluations are failed the same way: a few losses, then bigger size to win it back. Risking about a quarter of your loss limit per trade (${fbal(C.dd / 4)}) gives you room for several losers in a row.</p></div>`;
  if (ev.kind === "pass") return `<div class="fb good"><div class="fbh"><span class="verd">🏆 Profit target reached: evaluation passed!</span></div><p>You made ${fusd(ST.bal - A.start)} without touching the loss limit. Next: a ${C.name} funded account, where you keep 90% of what you make.</p></div>`;
  return `<div class="fb good"><div class="fbh"><span class="verd">💰 Payout available: ${fbal(ev.amount)}</span></div><p>That's 90% of your ${fusd(ST.bal - A.start)} profit. Take it now and the account resets to ${fbal(A.start)} for the next cycle, or keep trading to build it up (the loss limit still applies).${A.payouts % SCALE_AFTER === SCALE_AFTER - 1 && SIZES.indexOf(A.size) < SIZES.length - 1 ? ` This payout also scales you up to the next account size.` : ""}</p></div>`;
}
function acctCardHTML(delta) {
  const A = ST.acct, C = AC(), profit = ST.bal - A.start, cushion = Math.max(0, ST.bal - A.floor), tg = A.stage === "eval" ? C.target : A.stage === "live" ? 1e12 : C.payoutMin;
  return `<div class="acct prop"><div class="top"><div><small>${C.name} ${A.stage === "eval" ? "evaluation" : "funded account"}</small><br><b class="num">${fbal(ST.bal)}</b></div><div style="text-align:right"><small>${delta != null ? "This round" : "Profit so far"}</small><br><b class="num ${toneOf(delta != null ? delta : profit)}" style="font-size:16px">${fusd(delta != null ? delta : profit)}</b></div></div>
    ${A.stage === "live" ? `<p class="small" style="margin:4px 0">Live account: your own money from payouts. No target, no trailing limit: you can lose all of it.</p>` : ""}<div class="pbar" ${A.stage === "live" ? "hidden" : ""}><span>${A.stage === "eval" ? "Profit target" : "Payout unlocks at"}</span><div class="bar"><i style="width:${clamp(profit / tg * 100, 0, 100)}%"></i></div><b>${fusd(profit)} of ${fusd(tg)}</b></div>
    <div class="pbar dd"><span>Room before the loss limit</span><div class="bar"><i style="width:${clamp(cushion / C.dd * 100, 0, 100)}%"></i></div><b>${fbal(cushion)} left · limit ${fbal(A.floor)}</b></div>
    ${sparkSVG(ST.eq.slice(-40))}</div>`;
}
const RULES_HTML = () => { const C = AC(); return `<ul class="blist"><li><span><b>Profit target:</b> make ${fbal(C.target)} to pass the evaluation and get funded.</span></li><li><span><b>Trailing loss limit:</b> your balance must stay above a floor ${fbal(C.dd)} below your highest balance. The floor follows your high until it reaches your starting balance, then it stops moving. Touch it and the account is closed (open trades are closed automatically).</span></li><li><span><b>Size limit:</b> at most ${C.cap / 10} mini contracts (or ${C.cap} micros) at once.</span></li><li><span><b>Funded:</b> once profit reaches ${fbal(C.payoutMin)} you can take a payout: you keep 90%. After every ${SCALE_AFTER} payouts you're scaled up to a bigger account (up to $150K).</span></li><li><span><b>Real firms differ:</b> these rules are typical of US futures prop firms (a $3,000 target and $2,000 to $2,500 trailing limit on $50K is common). Many also have a daily loss limit, and all of them charge fees. Most traders fail evaluations, usually by risking too much after a loss.</span></li></ul>`; };

/* ---------- position sizing in whole contracts ---------- */
const contractSpec = I => I.sym === "BTC" ? { micro: 0.1, mini: 5, mName: "MBT", bName: "BTC" } : { micro: I.mpv, mini: I.pv, mName: I.micro, bName: I.big || I.sym };
function sizeFor(I, budget, sd) {
  const S = contractSpec(I), cap = AC().cap, raw = Math.floor(budget / (sd * S.micro) + 1e-9), micros = clamp(raw, 1, cap);
  return { qty: micros * S.micro / I.pv, micros, tooWide: raw < 1, capped: raw > cap };
}
function splitSize(I, qty) { const S = contractSpec(I), micros = Math.round(qty * I.pv / S.micro), k = Math.round(S.mini / S.micro), minis = Math.floor(micros / k); return { minis, rest: micros - minis * k, micros, S }; }

if (Array.isArray(ST.accts) && ST.accts.length) { ST.ai = clamp(ST.ai || 0, 0, ST.accts.length - 1); ST.acct = ST.accts[ST.ai]; if (ST.acct.bal == null) ST.acct.bal = ST.bal; ST.bal = ST.acct.bal; } // re-link after loading
if (!ST.acct || (!ACCTS[ST.acct.size] && ST.acct.stage !== "live")) { // first run on the prop account: keep the old stats, start a $50K evaluation
  ST.legacyBal = ST.bal; ST.acct = { attempts: 1, passed: 0, payouts: 0, paidOut: 0, breaches: 0, log: [], intro: false, size: 50000 };
  ST.eq = []; ST.maxDD = 0; startAccount(50000, "eval", "start");
}
if (!Array.isArray(ST.accts) || !ST.accts.length) { ST.acct.bal = ST.bal; ST.acct.copy = true; ST.acct.id = ST.acct.id || 1; ST.accts = [ST.acct]; ST.ai = 0; }
wallet();
function setPrimary(i) {
  if ((G && G.pos && G.pos.open && G.phase === "play") || (typeof RP !== "undefined" && RP.pos && RP.pos.open) || (ST.live && Array.isArray(ST.live.open) && ST.live.open.some(p => p && p.open && p.kind !== "stk"))) { toast("Finish the open trade first"); return false; }
  ST.acct.bal = ST.bal; ST.ai = clamp(i, 0, ST.accts.length - 1); ST.acct = ST.accts[ST.ai]; ST.bal = ST.acct.bal; ST.peak = Math.max(ST.peak || 0, ST.bal); save(); renderRank(); return true;
}
if (!ST.slow2) { ST.slow2 = 1; ST.rspeed = 1; ST.pspeed = 1; ST.rpspeed = 1; ST.rwait = true; }
ACCT_READY = true;
function bank(amount, kind) {
  if (!amount) return; amount = Math.round(amount * 100) / 100;
  ST.bal = Math.round((ST.bal + amount) * 100) / 100; acctTrack();
  if (kind === "reads") { ST.readsNet += amount; if (G) G.money.reads += amount; }
  if (kind === "trade") { if (G) G.money.trade += amount; }
  ST.peak = Math.max(ST.peak, ST.bal); ST.maxDD = Math.max(ST.maxDD, (ST.peak - ST.bal) / ST.peak);
  save(); renderRank();
  const b = $("#balv"); b.classList.remove("flash-up", "flash-down"); void b.offsetWidth; b.classList.add(amount > 0 ? "flash-up" : "flash-down"); setTimeout(() => b.classList.remove("flash-up", "flash-down"), 900);
  floatAt($("#rankbtn"), fusd(amount), amount > 0 ? "pos" : "neg");
}
function gainXP(n, el) {
  if (!n) return; const before = rankOf(ST.xp), tb = tierOf(); ST.xp = Math.max(0, ST.xp + n); if (G) G.xp += n; save(); renderRank();
  floatAt(el, (n > 0 ? "+" : "") + n + " XP");
  const after = rankOf(ST.xp), ta = tierOf();
  if (after > before) {
    const d = document.createElement("div"); d.className = "rankup";
    d.innerHTML = `<small>Rank up</small>${hexIcon(after + 1, 54)}<div><b>${RANKS[after][1]}</b></div>${ta > tb ? `<div class="small" style="max-width:260px;margin-top:6px"><b style="color:#a5f3fc">Difficulty up: Tier ${ta + 1} · ${TIERS[ta].name}</b><br>${esc(TIERS[ta].unlock)}</div>` : ""}`;
    document.body.appendChild(d); setTimeout(() => d.remove(), ta > tb ? 5200 : 2600);
  }
}

/* ================= CHART + ROUND STATE ================= */
const chart = new Chart($("#cv"));
chart.showSMA = ST.sma; chart.showVol = ST.vol; chart.showRSI = ST.rsi; chart.magnet = ST.magnet; chart.showMarks = ST.marks; chart.showVWAP = ST.vwap !== false;
let G = null;
function seriesFor(tf, cut) { return buildSeries(G.I, tf, cut, isIntra(tf) ? G.start[tf] : undefined); }
function allTsFor(tf) { if (!G.allTs[tf]) G.allTs[tf] = seriesFor(tf, G.tEnd).ts; return G.allTs[tf]; }
function futureLabel() { return G.tf === "1D" ? `Next ${G.H} days` : `Next ${G.H} × ${G.tf}`; }
function refresh(keepView) {
  const S = seriesFor(G.view, G.cut);
  chart.future = G.phase === "done" ? null : G.phase === "play" ? { t0: G.cut, t1: G.tEnd } : { t0: G.tDec, t1: G.tEnd, label: futureLabel() };
  chart.decisionT = G.tDec; chart.overlays = G.overlays;
  chart.setSeries(S, allTsFor(G.view), keepView);
  renderTF(); updateLegend();
}
function tIdxOn(ts, dur, t) { const n = ts.length; if (t <= ts[0]) return (t - ts[0]) / dur; let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ts[m] <= t) lo = m; else hi = m - 1; } if (lo === n - 1) return lo + (t - ts[lo]) / dur; return lo + (t - ts[lo]) / (ts[lo + 1] - ts[lo]); }
const rIdx = t => tIdxOn(G.Sr.ts, tfDur(G.tf), t);
const whenOf = (S, i) => isIntra(S.tf) ? fWallS(S.ts[i]) : S.tf === "1D" ? fDayS(S.I.d[S.di[i]]) : S.I.d[S.di[i]];
function allowedSyms() { return ST.mkt === "all" ? SYMS : [ST.mkt]; }
function chooseTF() {
  if (ST.tfMode && ST.tfMode !== "mixed" && ST.tfMode !== "auto") return ST.tfMode;
  const w = ST.style === "scalp" ? STAGES[pbStage()].tf : TIERS[tierOf()].tf; let r = Math.random() * w.reduce((a, b) => a + b[1], 0);
  for (const [tf, p] of w) { r -= p; if (r <= 0) return tf; } return "1D";
}
function pickIntra(I, tf, diWant) {
  const m = TF[tf], needDays = Math.ceil(32 * m / I.sess[1]) + 1;
  for (let a = 0; a < 40; a++) {
    const pad = Math.max(needDays, Math.min(30, EXT_DAYS[tf] || 0)); // leave room after the pick so the trade can reach its stop or target
    const di = diWant != null ? diWant : 25 + Math.floor(Math.random() * Math.max(1, I.n - 26 - pad));
    if (di < 1 || di + 1 >= I.n) { if (diWant != null) return null; continue; }
    const start = Math.max(0, di - INTRA_DAYS[tf] + 1);
    const S = buildSeries(I, tf, I.se[Math.min(I.n - 1, di + needDays)], start);
    let cand = []; for (let j = 0; j < S.n; j++) if (S.di[j] === di && j >= 60 && S.atr[j] && S.ema[j] != null) cand.push(j);
    const active = cand.filter(j => volw(I.sym, S.ts[j]) >= 0.9 && volw(I.sym, S.te[j] - 1) >= 0.9); if (active.length) cand = active;
    if (!cand.length) { if (diWant != null) return null; continue; }
    for (let b = 0; b < 8; b++) {
      const j = pick(cand), H = Math.min(24, nextBrk(S, j) - j - 1, S.n - 1 - j);
      if (H < 12) continue; const lb = lastBrk(S, j); if (lb > 0 && j - lb < 30) continue;
      return { tf, start, t: j, H, tDec: S.te[j], tEnd: S.te[j + H] };
    }
    if (diWant != null) return null;
  }
  return null;
}
function nearOpen(I, t) { const d = minOfDay(t) - OPEN_MIN[I.sym]; return d >= 0 && d <= 75; }
function pickScalp(I, tf, diWant) {
  const Hmax = tf === "1m" ? 20 : tf === "5m" ? 12 : 10, Hmin = tf === "1m" ? 10 : 6, DS = DSER[I.sym];
  for (let a = 0; a < 30; a++) {
    let di = diWant;
    if (di == null) for (let b = 0; b < 6; b++) { di = 3 + Math.floor(Math.random() * (I.n - 4)); const A = DS.atr[di - 1]; if (A && (I.h[di] - I.l[di]) / A >= 1.15) break; }
    if (di < 3 || di >= I.n || I.rollSet.has(di)) { if (diWant != null) return null; continue; }
    const start = Math.max(0, di - INTRA_DAYS[tf] + 1), S = buildSeries(I, tf, I.se[di], start), cand = [];
    for (let j = 60; j < S.n; j++) {
      if (S.di[j] !== di || !S.atr[j] || S.ema[j] == null || volw(I.sym, S.ts[j]) < 0.9) continue;
      let hi = -Infinity, lo = Infinity; for (let q = j - 4; q <= j; q++) { hi = Math.max(hi, S.h[q]); lo = Math.min(lo, S.l[q]); }
      cand.push({ j, fast: (hi - lo) / S.atr[j] >= 2.2 || nearOpen(I, S.ts[j]) });
    }
    const fast = cand.filter(c => c.fast), pool = fast.length ? fast : cand;
    if (!pool.length) { if (diWant != null) return null; continue; }
    for (let b = 0; b < 8; b++) {
      const { j } = pick(pool); let H = Math.min(Hmax, S.n - 1 - j);
      for (let q = j + 1; q <= j + H; q++) if (S.brk[q]) { H = q - j - 1; break; }
      if (H < Hmin) continue;
      return { tf, start, t: j, H, tDec: S.te[j], tEnd: S.te[j + H] };
    }
    if (diWant != null) return null;
  }
  return null;
}
function pickRound(spec) {
  const allowed = allowedSyms();
  if (spec) {
    const I = INST[spec.sym];
    if (spec.tf === "1D" || !spec.tf) { const S = DSER[spec.sym], t = spec.t, H = horizonD(S, t); return { I, tf: "1D", t, H, tDec: I.se[t], tEnd: I.se[t + H], ev: spec.ev || null }; }
    const r = (spec.style || ST.style) === "scalp" ? pickPlaybook(I, spec.tf, spec.di) : pickIntra(I, spec.tf, spec.di); if (r) return Object.assign({ I, ev: null }, r);
  }
  if (ST.style === "rapid") { const r = pickRapid(); if (r) return r; }
  if (ST.style === "drill" && ST.warm) { // today's warm-up: rotate through the skills that are due, weakest first
    if (todayRec().drills >= 8) { ST.warm = false; setTimeout(() => toast("Warm-up done ✓ Next on today's list: 10 rapid-fire trades"), 400); }
    else { const d = srsDue(), rec = ST.recentDrills || [], nx = d.find(x => !rec.includes(x[0])) || DRILLS.find(x => !rec.includes(x[0])); if (nx) ST.drill = nx[0]; }
    setTimeout(updateModeLabel, 0);
  }
  if (ST.style === "drill" && ST.drill) { const r = pickDrill(ST.drill); if (r) return r; }
  if (ST.style === "strat") { const r = pickStratRound(); if (r) return r; }
  if (ST.style === "scalp") {
    for (let tries = 0; tries < 12; tries++) { const sym = pick(allowed), tf = chooseTF(), r = isIntra(tf) && TF[tf] <= 15 ? pickPlaybook(INST[sym], tf) : null; if (r) return Object.assign({ I: INST[sym], ev: null }, r); }
  }
  const canDaily = ST.tfMode === "mixed" || ST.tfMode === "1D";
  if (canDaily && (ST.rounds === 0 || ST.rounds % 4 === 3)) {
    const evs = EVENTS.filter(e => allowed.includes(e.sym) && !ST.evDone.includes(e.sym + e.d) && DSER[e.sym].n - 1 - e.t >= 30);
    if (evs.length) { const first = ST.rounds === 0 && evs.find(e => e.sym === "BTC" && e.d === "2021-11-09"); const e = first || pick(evs); const S = DSER[e.sym], H = horizonD(S, e.t); return { I: INST[e.sym], tf: "1D", t: e.t, H, tDec: INST[e.sym].se[e.t], tEnd: INST[e.sym].se[e.t + H], ev: e }; }
  }
  for (let tries = 0; tries < 60; tries++) {
    const sym = pick(allowed), I = INST[sym], tf = chooseTF();
    if (tf === "1D") {
      const P = POOL_D[sym]; if (!P.length) continue; const t = pick(P);
      if (ST.played.some(p => p[0] === sym && p[1] === "1D" && Math.abs(p[2] - t) < 6)) continue;
      if (EVENTS.some(e => e.sym === sym && Math.abs(e.t - t) < 4)) continue;
      const S = DSER[sym], H = horizonD(S, t); return { I, tf, t, H, tDec: I.se[t], tEnd: I.se[t + H], ev: null };
    }
    const r = pickIntra(I, tf); if (r) return Object.assign({ I, ev: null }, r);
  }
  const sym = allowed[0], S = DSER[sym], t = POOL_D[sym][0], H = horizonD(S, t), I = INST[sym];
  return { I, tf: "1D", t, H, tDec: I.se[t], tEnd: I.se[t + H], ev: null };
}
/* ================= DRILLS: practise one question type, chart after chart ================= */
let DRILL_TRY = 0;
const DRILLS = [
  ["trend", "📈", "Trend direction"], ["ema", "〰️", "Moving average"], ["structure", "🪜", "Market structure"], ["state", "🧭", "Market state (the 5 ways)"],
  ["levels", "📏", "Support & resistance (draw)"], ["tlines", "📐", "Trend lines (draw)"], ["candles", "🕯️", "Candle patterns"], ["close", "🔍", "Candle reading"],
  ["range", "📊", "Candle size & volatility"], ["fvg", "🕳️", "Fair value gaps"], ["vwap", "🌊", "VWAP"], ["momo", "🏃", "Momentum"], ["volume", "🔊", "Volume"],
  ["rsi", "🌡️", "RSI"], ["div", "↗️", "Divergence"], ["mtf", "🔭", "Top-down timeframes"], ["stop", "🛑", "Stop placement"], ["rr", "⚖️", "Reward-to-risk"], ["fees", "💸", "Trading costs"],
];
const DRILL_AIM = { // pick a daily chart that has each answer equally often
  rsi: { ob: (S, t) => S.rsi[t] >= 72, os: (S, t) => S.rsi[t] <= 28, neu: (S, t) => S.rsi[t] >= 38 && S.rsi[t] <= 62 },
  volume: { high: (S, t) => S.h[t] - S.l[t] >= 1.2 * S.atr[t] && S.v[t] / S.vma[t - 1] >= 1.6, low: (S, t) => S.h[t] - S.l[t] >= 1.2 * S.atr[t] && S.v[t] / S.vma[t - 1] <= 0.75, normal: (S, t) => S.h[t] - S.l[t] >= 1.2 * S.atr[t] && S.v[t] / S.vma[t - 1] >= 0.85 && S.v[t] / S.vma[t - 1] <= 1.2 },
};
const DRILL_TF = { rsi: ["1D", "1D", "4h", "1h"], volume: ["1D"], vwap: ["5m", "15m"], fvg: ["5m", "15m", "1h"], momo: ["5m", "15m", "1h"], fees: ["1m", "5m", "15m"], state: ["5m", "15m", "1h"], mtf: ["15m", "1h", "4h"] };
function drillMastery(k) { const sk = { state: "structure", fvg: "candles", vwap: "trend", momo: "momentum", fees: "risk", close: "candles", range: "candles", ema: "trend", stop: "risk", rr: "risk", rsi: "momentum", div: "momentum", tlines: "tlines", levels: "levels", mtf: "mtf", volume: "volume", candles: "candles", structure: "structure", trend: "trend" }[k]; const d = (ST.drills || {})[k]; return d && d.n ? d.c / d.n : null; }
function drillRec(q) { if (!G.drill || !q.key) return; const d = (ST.drills || (ST.drills = {}))[q.key] || (ST.drills[q.key] = { n: 0, c: 0 }); d.n++; d.c += q.score >= 1 ? 1 : q.score >= 0.6 ? 0.6 : 0; srsRec(q.key, q.score >= 0.6); ST.recentDrills = [q.key].concat((ST.recentDrills || []).filter(k => k !== q.key)).slice(0, 2); todayBump("drills"); }
function pickDrill(key) {
  const allowed = allowedSyms();
  for (let tries = 0; tries < 20; tries++) {
    const sym = pick(allowed), I = INST[sym], tfs = DRILL_TF[key], tf = tfs ? pick(tfs) : chooseTF();
    if (tf === "1D") { const S = DSER[sym]; let P = POOL_D[sym]; if (!P.length) continue;
      const want = DRILL_AIM[key] && pick(Object.keys(DRILL_AIM[key])); if (want) { const f = P.filter(t => DRILL_AIM[key][want](S, t)); if (f.length) P = f; }
      const t = pick(P), H = horizonD(S, t); return { I, tf, t, H, tDec: I.se[t], tEnd: I.se[t + H], ev: null, drill: key }; }
    const r = pickIntra(I, tf); if (r) return Object.assign({ I, ev: null, drill: key }, r);
  }
  return null;
}
function drillQ(key) {
  const S = G.Sv, t = G.t;
  const f = { mtf: () => G.tf !== "1D" ? qHTF(G.tf === "4h" || G.tf === "1h" ? "1D" : HTF[G.tf]) : null, trend: () => qTrend(S, t), ema: () => qEMA(S, t), structure: () => qStructure(S, t), tlines: () => qTline(S, t), levels: () => qLevel(S, t), stop: () => qStop(S, t), rr: () => qRR(S, t), volume: () => qVolume(S, t), candles: () => qPattern(S, t), range: () => qRange(S, t), close: () => qClose(S, t), rsi: () => qRSI(S, t), div: () => qDiv(S, t),
    fvg: () => qFVG(S, t), vwap: () => qVWAP(S, t), momo: () => qMomo(S, t), fees: () => qFees(S, t), state: () => { G.pb = Object.assign(G.pb || {}, { rg: regime(S, t) }); return regimeQ(); } }[key];
  try { return f ? f() : null; } catch (e) { console.error("drill", key, e); return null; }
}
function acctOnNewRound() { const ev = acctCheck(); if (ev && ev.kind !== "payout") acctAct(ev.kind); }
function newRound(spec) { if (typeof rpStop === "function") rpStop(); setTimeout(syncFab, 0); acctOnNewRound(); updateModeLabel(); { const b = $("#liveb"); if (b) b.hidden = true; }
  if (G && G.timer) clearTimeout(G.timer); if (G && G.raf) cancelAnimationFrame(G.raf);
  const r = pickRound(spec), I = r.I;
  stopTimer();
  const style = r.drill ? "drill" : r.rapid ? "rapid" : r.strat ? "strat" : ST.style === "scalp" && isIntra(r.tf) && TF[r.tf] <= 15 && !r.ev ? "scalp" : "swing";
  G = { I, tf: r.tf, ev: r.ev, H: r.H, tDec: r.tDec, tEnd: r.tEnd, cut: r.tDec, view: r.tf, start: {}, allTs: {}, phase: "quiz", qi: 0, xp: 0, overlays: [], plan: style === "scalp" ? { stop: 1, tgt: 1.5, risk: ST.riskPct || 1 } : { stop: 1.5, tgt: 2, risk: ST.riskPct || 1 }, dir: null, hint: false, hintPaid: false, tier: tierOf(), money: { reads: 0, trade: 0 }, pos: null, style };
  for (const tf of TF_LIST) if (isIntra(tf)) G.start[tf] = tf === r.tf && r.start != null ? r.start : intraStart(I, tf, G.tDec);
  G.Sr = seriesFor(r.tf, G.tEnd); G.Sv = seriesFor(r.tf, G.tDec); G.t = G.Sv.n - 1;
  if (G.Sr.ts[G.t] !== G.Sv.ts[G.t] || G.t + G.H > G.Sr.n - 1) console.error("round index mismatch", r);
  G.an = analyze(G.Sv, G.t);
  G.cls = r.cls; G.strat = r.strat || null; G.rapid = !!r.rapid; clearTimeout(RAPID_T);
  chart.posEdit = false;
  G.drill = r.drill || null; if (ST.warm) updateModeLabel();
  if (style === "drill") { let q = drillQ(r.drill); if (q && DRILL_TRY < 30) { q.key = r.drill; if (!qBalanceOK(q)) q = null; } if (!q) { if ((DRILL_TRY = (DRILL_TRY || 0) + 1) < 40) return newRound(); DRILL_TRY = 0; G.drill = null; G.qs = buildQs(G.Sv, G.t); } else { DRILL_TRY = 0; q.key = r.drill; G.qs = [q]; } }
  else if (style === "rapid") { const rp = ST.rplan || {}; G.qs = []; G.phase = "trade"; G.plan = { stop: rp.stop || 1, tgt: rp.tgt || 1.5, risk: ST.riskPct || 1 }; G.pack = r.pack; } else if (style === "strat") setupStrat(); else if (style === "scalp") setupPlaybook(); else G.qs = buildQs(G.Sv, G.t);
  for (const q of G.qs || []) tfAnnotate(q);
  chart.drawings = []; chart.undo = []; chart.sel = null; chart.pending = null; chart.position = null; chart.markers = []; chart.setMode("cursor");
  chart.showRSI = ST.rsi || G.qs.some(q => q.needs === "rsi");
  chart.showVol = ST.vol || G.qs.some(q => q.needs === "vol");
  $("#symb").textContent = I.tv; $("#logo").textContent = I.logo;
  refresh(false); renderPanel(); showSel(null);
}

/* ================= REPORT FORMATTING ================= */
const B = (tone, t) => ({ tone, t });
const bullets = arr => `<ul class="blist">${arr.map(b => `<li class="${b.tone || ""}"><span>${md(b.t)}</span></li>`).join("")}</ul>`;
function report(o) {
  const k = o.kpis && o.kpis.length ? `<div class="kpis">${o.kpis.map(([l, v, tone]) => `<div class="kpi"><span>${esc(l)}</span><b class="${tone || ""}">${esc(v)}</b></div>`).join("")}</div>` : "";
  const sec = (h, t, cls = "") => t && (!Array.isArray(t) || t.length) ? `<div class="rsec ${cls}"><h4>${h}</h4>${(Array.isArray(t) ? t : [t]).map(p => `<p>${md(p)}</p>`).join("")}</div>` : "";
  return `<div class="rep">${k}${sec(o.yoursHead || "Your answer", o.yours, "yours" + (o.yoursOk ? " ok" : ""))}${sec("Why", o.why)}${sec("The rule", o.rule)}${sec("Watch out", o.warn, "warn")}${sec("How traders use it", o.use, "use")}</div>`;
}
const atable = rows => `<table class="atable"><tbody>${rows.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td class="${c || ""}">${esc(b)}</td></tr>`).join("")}</tbody></table>`;
const toneOf = x => x > 0 ? "pos" : x < 0 ? "neg" : "";

/* ================= QUESTIONS (graded from the candles themselves) ================= */
const TREND_OPTS = [{ k: "up", label: "Uptrend: rising, above a rising blue line", s: "Uptrend" }, { k: "down", label: "Downtrend: falling, below a falling blue line", s: "Downtrend" }, { k: "side", label: "Sideways: stuck inside a range", s: "Sideways" }];
const slopeWord = s => s > 0.15 ? "rising" : s < -0.15 ? "falling" : "flat";
function trendReport(S, t, tr, ch, label) {
  const bw = barWord(S.tf), x = Math.abs(tr.chg).toFixed(1);
  let yours = null;
  if (ch && ch !== tr.k) {
    if (ch === "side") yours = `A range needs price to move less than 0.8× ATR overall. Here it moved ${x}× ATR ${tr.chg > 0 ? "up" : "down"} and closed ${tr.above ? "above" : "below"} the EMA.`;
    else if (tr.k === "side") yours = `${ch === "up" ? "An uptrend" : "A downtrend"} needs at least 2× ATR of movement over 20 candles. This chart moved only ${x}× ATR, so it is going sideways even if a few candles look directional.`;
    else yours = `Price moved ${fpct(tr.pc)} and closed ${tr.above ? "above" : "below"} the EMA, the opposite of ${ch === "up" ? "an uptrend" : "a downtrend"}.`;
  }
  return report({
    kpis: [[`${tr.n}-${bw} change`, fpct(tr.pc), toneOf(tr.pc)], ["Move in ATR", `${x}×`], ["vs 20 EMA", tr.above ? "Above" : "Below", tr.above ? "pos" : "neg"], ["EMA slope", slopeWord(tr.emaSlope)], ["Range %", `${Math.round(tr.posn * 100)}%`]],
    yours,
    why: `Over the last ${tr.n} ${bw}s ${label} moved **${fpct(tr.pc)}**, about **${x}× its average candle (ATR ${fp(S.I, S.atr[t])})**. It closed **${tr.above ? "above" : "below"}** the 20 EMA, which is **${slopeWord(tr.emaSlope)}**, and it sits **${Math.round(tr.posn * 100)}%** of the way up its ${tr.n}-${bw} range.`,
    rule: tr.k === "up" ? "Uptrend: at least 2× ATR of movement up, a close above the EMA, and price in the top 40% of the range. All three hold here." : tr.k === "down" ? "Downtrend: at least 2× ATR of movement down, a close below the EMA, and price in the bottom 40% of the range. All three hold here." : "Sideways: less than 0.8× ATR of net movement and a total range under 4.5× ATR. Both hold here.",
    use: tr.k === "up" ? "Look for buys on pullbacks toward the EMA or support. Selling the top of an uptrend fights the current." : tr.k === "down" ? "Rallies toward the EMA or resistance are where sellers reload. Buying because price looks cheap fights the current." : "Direction is close to a coin flip in a range. Trade from the edges (buy near the floor, sell near the ceiling) or wait for a breakout.",
  });
}
function qTrend(S, t) {
  const tr = trendRead(S, t); if (!["up", "down", "side"].includes(tr.k)) return null;
  if (tr.k === "side" && Math.abs(longChg(S, t)) > 3) return null;
  const col = tr.k === "up" ? C.up : tr.k === "down" ? C.down : C.amber, a = t - tr.n;
  return { skill: "trend", kind: "mc", tag: "Trend", title: `Which way is this ${tfWord(S.tf)} chart trending?`, sub: "Judge roughly the last 20 candles against the blue 20 EMA.", opts: TREND_OPTS, correct: tr.k,
    explain: ch => trendReport(S, t, tr, ch, "price"),
    marks: [{ type: "arrow", t0: S.ts[a], p0: S.c[a], t1: S.ts[t], p1: S.c[t], color: col, label: `${fpct(tr.pc)} in ${tr.n}` }] };
}
function qHTF(tfH = "1D") {
  if (!tfH) return null; const Sd = seriesFor(tfH, G.tDec), td = Sd.n - 1, tr = trendRead(Sd, td);
  if (!["up", "down", "side"].includes(tr.k) || (tr.k === "side" && Math.abs(longChg(Sd, td)) > 3)) return null;
  const col = tr.k === "up" ? C.up : tr.k === "down" ? C.down : C.amber, a = td - tr.n;
  return { skill: "mtf", kind: "mc", tag: "Top-down", title: `Top-down check: what is the ${tfH} trend?`, sub: `Professionals start on the higher timeframe. Switch to ${tfH}, read the trend, then return to the ${G.tf} chart.`, switchTF: tfH, opts: TREND_OPTS, correct: tr.k,
    explain: ch => trendReport(Sd, td, tr, ch, `the ${tfH} chart`) + report({ warn: `The current ${tfH} candle is still forming: it contains only the price action up to this moment.`, use: `A ${G.tf} trade has better odds when the ${tfH} chart points the same way. Trading against the higher-timeframe trend means swimming upstream.` }),
    marks: [{ type: "arrow", t0: Sd.ts[a], p0: Sd.c[a], t1: Sd.ts[td], p1: Sd.c[td], color: col, label: `${tfH} ${fpct(tr.pc)}` }] };
}
function qEMA(S, t, force) {
  const e = S.ema[t], A = S.atr[t], I = S.I; if (e == null || !A) return null;
  const d = (S.c[t] - e) / A, k = Math.abs(d) <= 0.3 ? "on" : d > 0 ? "above" : "below", slope = S.ema[t - 5] != null ? (e - S.ema[t - 5]) / A : 0;
  if (!force && Math.abs(Math.abs(d) - 0.3) < 0.08) return null;
  return { skill: "trend", kind: "mc", tag: "Moving average", title: "Where did the last candle close relative to the blue 20 EMA?", sub: "The blue line is the average closing price of the last 20 candles.",
    opts: [{ k: "above", label: "Above it", s: "Above" }, { k: "on", label: "Right on it (within 0.3× ATR)", s: "On it" }, { k: "below", label: "Below it", s: "Below" }], correct: k,
    explain: () => report({ kpis: [["Close", fp(I, S.c[t])], ["20 EMA", fp(I, e)], ["Distance", `${Math.abs(d).toFixed(2)}× ATR`, toneOf(d)], ["EMA slope", slopeWord(slope)]],
      why: `The close was ${fp(I, Math.abs(S.c[t] - e))} ${d >= 0 ? "above" : "below"} the EMA, which is ${Math.abs(d).toFixed(2)}× the average candle. Anything within 0.3× ATR counts as sitting on the line.`,
      use: "Price above a rising EMA means buyers are in charge; below a falling EMA, sellers are. In trends, price often pulls back to the EMA before continuing, so traders watch it as dynamic support or resistance." }), marks: [] };
}
function qStructure(S, t) {
  const st = structure(S, t); if (!st) return null; if (st.k === "mixed" && Math.random() < 0.5) return null;
  const I = S.I, piv = st.z.piv.filter(p => p.i >= st.h1.i - 30 || p.i >= st.l1.i - 30).slice(-7), hh = st.h2.p > st.h1.p, hl = st.l2.p > st.l1.p;
  return { skill: "structure", kind: "mc", tag: "Market structure", title: "Read the swings. What does the market structure show?", sub: "Compare the last two swing highs (peaks) and the last two swing lows (dips).",
    opts: [{ k: "up", label: "Higher highs and higher lows (staircase up)", s: "Higher highs & lows" }, { k: "down", label: "Lower highs and lower lows (staircase down)", s: "Lower highs & lows" }, { k: "mixed", label: "Mixed: highs and lows disagree", s: "Mixed" }], correct: st.k,
    explain: ch => report({ kpis: [["Swing high 1", fp(I, st.h1.p)], ["Swing high 2", `${fp(I, st.h2.p)} · ${hh ? "HH" : "LH"}`, hh ? "pos" : "neg"], ["Swing low 1", fp(I, st.l1.p)], ["Swing low 2", `${fp(I, st.l2.p)} · ${hl ? "HL" : "LL"}`, hl ? "pos" : "neg"]],
      yours: ch && ch !== st.k ? `The highs made a **${hh ? "higher" : "lower"} high** and the lows made a **${hl ? "higher" : "lower"} low**, which reads as "${{ up: "staircase up", down: "staircase down", mixed: "mixed" }[st.k]}".` : null,
      why: [`Peaks: ${fp(I, st.h1.p)} (${whenOf(S, st.h1.i)}) then ${fp(I, st.h2.p)} (${whenOf(S, st.h2.i)}). Dips: ${fp(I, st.l1.p)} (${whenOf(S, st.l1.i)}) then ${fp(I, st.l2.p)} (${whenOf(S, st.l2.i)}). The swings are now labelled on the chart.`],
      rule: `A swing only counts once price has reversed by at least 1.5× ATR (${fp(I, 1.5 * S.atr[t])}), so small wiggles are ignored.`,
      use: st.k === "up" ? "Buyers keep stepping in at higher prices. The uptrend stays intact until price makes a lower low, which is where many traders place their stop." : st.k === "down" ? "Sellers keep stepping in at lower prices. The downtrend stays intact until price makes a higher high." : "When highs and lows disagree, the trend is changing or the market is ranging. Wait for a clean staircase before committing." }),
    marks: [{ type: "zig", pts: piv.map(p => ({ t: S.ts[p.i], p: p.p, k: p.k, lab: p.lab })), color: C.amber }] };
}
const PATDEF = {
  bull_engulf: "a green body that completely covers the previous red body", bear_engulf: "a red body that completely covers the previous green body",
  hammer: "a lower wick at least 2× the body, almost no upper wick, after a fall", hanging: "a hammer shape (long lower wick) that appears after a rise",
  star: "an upper wick at least 2× the body, almost no lower wick, after a rise", inv_hammer: "a long upper wick and almost no lower wick, after a fall",
  doji: "open and close nearly equal (body under 8% of the range) with wicks on both sides", bull_maru: "a large green body filling at least 85% of the candle",
  bear_maru: "a large red body filling at least 85% of the candle", inside: "a candle whose high and low both sit inside the previous candle",
};
function qPattern(S, t) {
  const pats = classifyAll(S, t); if (!pats.length) return null;
  const n = TIERS[G.tier].opts - 1, k0 = pats[0], others = shuffle(Object.keys(PAT).filter(k => !pats.includes(k))).slice(0, n);
  const I = S.I, o = S.o[t], h = S.h[t], l = S.l[t], c = S.c[t], R = h - l, body = Math.abs(c - o), up = h - Math.max(o, c), lw = Math.min(o, c) - l;
  const prior = (S.c[t - 1] / S.c[t - 6] - 1) * 100, two = PAT[k0][3] === 2, dir = PAT[k0][2];
  return { skill: "candles", kind: "mc", tag: "Candle patterns", title: `What is the ${two ? "last two-candle" : "last candle's"} pattern called?`, sub: two ? "Look at the last two candles together." : "Study the last candle: its body, its wicks, and what came before it.",
    opts: shuffle([k0, ...others]).map(k => ({ k, label: PAT[k][0], s: PAT[k][0] })), correct: k0,
    explain: ch => report({ kpis: [["Body", `${Math.round(body / R * 100)}%`], ["Upper wick", `${Math.round(up / R * 100)}%`], ["Lower wick", `${Math.round(lw / R * 100)}%`], ["Size", `${(R / S.atr[t]).toFixed(1)}× ATR`], ["Prior 5 candles", fpct(prior), toneOf(prior)]],
      yours: ch && ch !== k0 ? `A ${PAT[ch][0].toLowerCase()} needs ${PATDEF[ch]}. That is not what this chart shows.` : null,
      why: `**${PAT[k0][0]}:** ${PAT[k0][1]}`, rule: `Definition used here: ${PATDEF[k0]}.`,
      use: "A pattern is a clue, not a signal. It carries the most weight at a support or resistance level and in the direction of the larger trend, and it should be confirmed by the next candle." }),
    marks: [{ type: "box", t0: S.ts[two ? t - 1 : t], t1: S.te[t], color: dir > 0 ? C.up : dir < 0 ? C.down : C.amber, label: PAT[k0][0] }] };
}
function qRange(S, t) {
  const A = S.atr[t], R = S.h[t] - S.l[t], r = R / A, I = S.I; if (!A || t < 20) return null;
  const k = r >= 1.35 ? "big" : r <= 0.65 ? "small" : r >= 0.85 && r <= 1.15 ? "avg" : null; if (!k) return null;
  return { skill: "candles", kind: "mc", tag: "Volatility", title: "How large was the last candle compared with a normal one?", sub: "Compare its full height, wick to wick, with the candles before it.",
    opts: [{ k: "big", label: "Much larger than usual", s: "Much larger" }, { k: "avg", label: "About average", s: "Average" }, { k: "small", label: "Much smaller than usual", s: "Much smaller" }], correct: k,
    explain: () => report({ kpis: [["Last candle range", fp(I, R)], ["ATR (14)", fp(I, A)], ["Ratio", `${r.toFixed(2)}×`, k === "big" ? "warn" : ""]],
      why: `The last candle spanned ${fp(I, R)} from high to low. The ATR, the average range of the last 14 candles, is ${fp(I, A)}, so this candle was ${r.toFixed(2)}× a normal one.`,
      warn: k === "big" ? "An outsized candle means something changed: news, a breakout, or a burst of fear or greed. Volatility tends to stay high for a while afterwards." : null,
      use: "ATR is the ruler for everything else. Stops, targets and distances in this trainer are all measured in ATR, so they adapt to how volatile each market is." }),
    marks: [{ type: "box", t0: S.ts[t], t1: S.te[t], color: C.amber, label: `${r.toFixed(1)}× ATR` }] };
}
function qClose(S, t) {
  const R = S.h[t] - S.l[t], I = S.I; if (R <= 0) return null; const pos = (S.c[t] - S.l[t]) / R;
  const k = pos >= 0.75 ? "high" : pos <= 0.25 ? "low" : pos >= 0.4 && pos <= 0.6 ? "mid" : null; if (!k) return null;
  return { skill: "candles", kind: "mc", tag: "Candle reading", title: "Where did the last candle close within its own range?", sub: "Compare the close with the candle's high and low (its wicks).",
    opts: [{ k: "high", label: "Near its high (top quarter)", s: "Near the high" }, { k: "mid", label: "Around the middle", s: "Middle" }, { k: "low", label: "Near its low (bottom quarter)", s: "Near the low" }], correct: k,
    explain: () => report({ kpis: [["High", fp(I, S.h[t])], ["Low", fp(I, S.l[t])], ["Close", fp(I, S.c[t])], ["Close position", `${Math.round(pos * 100)}%`, k === "high" ? "pos" : k === "low" ? "neg" : ""]],
      why: `The close sat ${Math.round(pos * 100)}% of the way from the low to the high.`,
      use: k === "high" ? "Closing near the high means buyers held control into the close, a sign of strength that often carries into the next candle." : k === "low" ? "Closing near the low means sellers held control into the close, a sign of weakness that often carries into the next candle." : "A close in the middle shows a stand-off: neither side won the candle." }),
    marks: [{ type: "box", t0: S.ts[t], t1: S.te[t], color: C.amber, label: `close ${Math.round(pos * 100)}%` }] };
}
function qRSI(S, t) {
  const v = S.rsi[t]; if (v == null) return null;
  const k = v >= 72 ? "ob" : v <= 28 ? "os" : v >= 38 && v <= 62 ? "neu" : null; if (!k) return null;
  const tr = trendRead(S, t);
  return { skill: "momentum", kind: "mc", tag: "Momentum", needs: "rsi", title: "Check the RSI panel under the chart. What is momentum saying?", sub: "RSI runs from 0 to 100. The dashed lines mark 70 and 30.",
    opts: [{ k: "ob", label: "Overbought: RSI above 70", s: "Overbought" }, { k: "os", label: "Oversold: RSI below 30", s: "Oversold" }, { k: "neu", label: "Neutral: RSI between 30 and 70", s: "Neutral" }], correct: k,
    explain: () => report({ kpis: [["RSI 14", v.toFixed(1), k === "ob" ? "neg" : k === "os" ? "pos" : ""], ["Zone", { ob: "Overbought", os: "Oversold", neu: "Neutral" }[k]], ["Trend", { up: "Up", down: "Down", side: "Sideways", mixed: "Unclear", na: "—" }[tr.k]]],
      why: "RSI compares the average size of up-moves with down-moves over the last 14 candles. Above 70, up-moves have dominated; below 30, down-moves have.",
      warn: k === "ob" && tr.k === "up" ? "In a strong uptrend RSI can stay above 70 for weeks. Overbought on its own is not a sell signal; it only says the move is stretched." : k === "os" && tr.k === "down" ? "In a strong downtrend RSI can stay below 30 for a long time. Oversold on its own is not a buy signal." : k === "neu" ? "Neutral RSI offers no edge by itself. Lean on trend and levels instead." : "An extreme reading against the trend warns that the move is tiring, especially near support or resistance.",
      use: "Combine RSI with price. Its strongest message is divergence: price makes a new extreme but RSI does not." }), marks: [] };
}
function qDiv(S, t) {
  const z = zigzag(S, t); if (!z.piv.length) return null;
  const Hs = z.piv.filter(p => p.k === "H"), Ls = z.piv.filter(p => p.k === "L");
  if (z.cur && z.cur.i >= t - 4) (z.cur.k === "H" ? Hs : Ls).push(z.cur);
  const lastH = Hs[Hs.length - 1], lastL = Ls[Ls.length - 1]; if (!lastH && !lastL) return null;
  const useH = lastH && (!lastL || lastH.i > lastL.i), arr = useH ? Hs : Ls; if (arr.length < 2) return null;
  const a = arr[arr.length - 2], b = arr[arr.length - 1]; if (b.i - a.i < 5 || S.rsi[a.i] == null || S.rsi[b.i] == null || b.i < t - 25) return null;
  const ra = S.rsi[a.i], rb = S.rsi[b.i], I = S.I; let k = null;
  if (useH && b.p > a.p) k = rb < ra - 4 ? "bear" : rb > ra + 4 ? "none" : null;
  if (!useH && b.p < a.p) k = rb > ra + 4 ? "bull" : rb < ra - 4 ? "none" : null;
  if (!k) return null;
  const col = k === "bear" ? C.down : k === "bull" ? C.up : C.amber;
  return { skill: "momentum", kind: "mc", tag: "Divergence", needs: "rsi", title: `Price just made a ${useH ? "higher high" : "lower low"}. Did RSI agree?`, sub: `Compare the last two swing ${useH ? "highs" : "lows"} on the price chart with RSI at the same moments.`,
    opts: [{ k: "bear", label: "Bearish divergence: price higher high, RSI lower high", s: "Bearish divergence" }, { k: "bull", label: "Bullish divergence: price lower low, RSI higher low", s: "Bullish divergence" }, { k: "none", label: "No divergence: RSI confirms the move", s: "No divergence" }], correct: k,
    explain: () => report({ kpis: [["Price swing 1", fp(I, a.p)], ["Price swing 2", fp(I, b.p), useH ? "pos" : "neg"], ["RSI swing 1", ra.toFixed(1)], ["RSI swing 2", rb.toFixed(1), k === "none" ? "" : k === "bear" ? "neg" : "pos"]],
      why: `Price went from ${fp(I, a.p)} (${whenOf(S, a.i)}) to ${fp(I, b.p)} (${whenOf(S, b.i)}), a ${useH ? "higher high" : "lower low"}. RSI went from ${ra.toFixed(1)} to ${rb.toFixed(1)}. ${k === "none" ? "RSI moved the same way as price, so momentum confirms the move." : k === "bear" ? "RSI made a lower high: the latest push up carried less force than the one before." : "RSI made a higher low: the latest push down carried less force than the one before."}`,
      use: k === "none" ? "Confirmed momentum keeps a trend healthy. No warning sign here." : "Divergence warns that a move is running out of fuel. It often precedes a pullback or reversal but can also resolve as a pause, so pair it with a level and wait for price to confirm." }),
    marks: [{ type: "seg", t0: S.ts[a.i], p0: a.p, t1: S.ts[b.i], p1: b.p, color: col, label: k === "none" ? "confirmed" : "divergence", labelBelow: useH }, { pane: "rsi", t0: S.ts[a.i], v0: ra, t1: S.ts[b.i], v1: rb, color: col }] };
}
function qVolume(S, t) {
  if (S.tf !== "1D") return null; const v = S.v[t], vm = S.vma[t - 1], A = S.atr[t]; if (v == null || vm == null || brkBetween(S, t - 5, t)) return null;
  if (S.h[t] - S.l[t] < 1.2 * A) return null; const r = v / vm;
  const k = r >= 1.6 ? "high" : r <= 0.75 ? "low" : r >= 0.85 && r <= 1.2 ? "normal" : null; if (!k) return null;
  const up = S.c[t] >= S.o[t];
  return { skill: "volume", kind: "mc", tag: "Volume", needs: "vol", title: `The last candle was a large ${up ? "green" : "red"} one. How did its volume compare with normal?`, sub: "Volume is shown by the faint bars along the bottom of the chart.",
    opts: [{ k: "high", label: "Much higher than usual: strong conviction", s: "Much higher" }, { k: "normal", label: "About normal", s: "Normal" }, { k: "low", label: "Lower than usual: weak conviction", s: "Lower" }], correct: k,
    explain: () => report({ kpis: [["Volume", fvol(v)], ["20-day average", fvol(vm)], ["Ratio", `${r.toFixed(2)}×`, k === "high" ? (up ? "pos" : "neg") : ""]],
      why: k === "high" ? `Heavy participation behind a large ${up ? "up" : "down"} candle: many traders agreed with the ${up ? "buying" : "selling"}. Moves on heavy volume are more likely to be genuine.` : k === "low" ? "A large candle on light volume means few traders took part. Moves like this are more likely to fade." : "Ordinary participation: the move carried no extra conviction either way.",
      use: "Breakouts on heavy volume hold more often than breakouts on light volume. Volume tells you how many people stand behind a move." }),
    marks: [{ type: "box", t0: S.ts[t], t1: S.te[t], color: up ? C.up : C.down, label: `Vol ${r.toFixed(1)}× avg` }] };
}
function tolScore(e, strictA) { const tl = TIERS[G.tier].tol; return e <= strictA[0] * tl ? 1 : e <= strictA[1] * tl ? 0.6 : e <= strictA[2] * tl ? 0.25 : 0; }
function qLevel(S, t) {
  const lv = levels(S, t), A = S.atr[t], I = S.I, cands = [];
  if (lv.sup && lv.sup.i >= t - 80) cands.push(["sup", lv.sup]); if (lv.res && lv.res.i >= t - 80) cands.push(["res", lv.res]);
  if (!cands.length) return null;
  const [kind, L] = cands.length === 2 ? (Math.random() < 0.5 ? cands[0] : cands[1]) : cands[0];
  const n = touches(S, Math.max(0, L.i - 40), t, L.p, A, kind), sup = kind === "sup", col = sup ? C.up : C.down;
  return { skill: "levels", kind: "draw", tool: "hline", focus: L.i, tag: "Support & resistance", title: sup ? "Draw the nearest support (floor) below price" : "Draw the nearest resistance (ceiling) above price",
    sub: sup ? "Select the ─ tool and tap the closest swing low that price bounced from and has not broken since. Then tap Check." : "Select the ─ tool and tap the closest swing high that price was rejected from and has not broken since. Then tap Check.",
    grade: ds => { const hs = ds.filter(d => d.type === "hline" || d.type === "hray"); if (!hs.length) return { none: true }; let best = null; for (const d of hs) { const e = Math.abs(d.pts[0].p - L.p) / A; if (!best || e < best.e) best = { e, p: d.pts[0].p }; } return { score: tolScore(best.e, [0.35, 0.75, 1.25]), e: best.e, p: best.p }; },
    explain: r => report({ kpis: [[sup ? "Support" : "Resistance", fp(I, L.p), sup ? "pos" : "neg"], ["Set on", whenOf(S, L.i)], ["Distance", `${(Math.abs(S.c[t] - L.p) / A).toFixed(1)}× ATR`], ["Tests", String(n)], ...(r && r.p != null ? [["Your line", fp(I, r.p)], ["Your error", `${r.e.toFixed(2)}× ATR`, r.score >= 0.6 ? "pos" : "neg"]] : [])],
      yoursHead: "Your line", yoursOk: r && r.score >= 0.6, yours: r && r.p != null ? (r.score === 1 ? "Within tolerance: an accurate level." : r.score >= 0.6 ? "Close: you found the right zone." : r.score > 0 ? "In the area, but a professional would anchor on the exact wick of the swing." : "That is a different level. Look for the most recent swing that has not been broken since.") : null,
      why: `${fp(I, L.p)} is the swing ${sup ? "low" : "high"} from ${whenOf(S, L.i)}. Price ${sup ? "bounced up" : "turned down"} from it and every candle since has stayed ${sup ? "above" : "below"} it. Price came within 0.3× ATR of this level ${n} time${n === 1 ? "" : "s"}${n >= 2 ? ", which strengthens it" : ""}.`,
      use: sup ? "Buyers defended this price before, and many traders place stop-losses just below it. Bounces there are common; a clean break often accelerates as those stops trigger." : "Sellers defended this price before, and short sellers' stops sit just above it. Rejections there are common; a clean break often squeezes higher." }),
    marks: [{ type: "level", p: L.p, t0: S.ts[L.i], color: col, label: `${sup ? "Support" : "Resistance"} ${fnum(I, L.p)}`, below: sup }, { type: "dot", t: S.ts[L.i], p: L.p, color: col, below: sup }] };
}
function qTline(S, t) {
  const st = structure(S, t); if (!st || st.k === "mixed") return null;
  const upT = st.k === "up", a = upT ? st.l1 : st.h1, b = upT ? st.l2 : st.h2, A = S.atr[t], I = S.I;
  if (b.i - a.i < 4 || b.i > t - 2) return null;
  const line = i => a.p + (b.p - a.p) * (i - a.i) / (b.i - a.i);
  for (let i = a.i + 1; i < b.i; i++) if (upT ? S.l[i] < line(i) - 0.5 * A : S.h[i] > line(i) + 0.5 * A) return null;
  for (let i = b.i + 1; i <= t; i++) if (upT ? S.l[i] < line(i) - 0.3 * A : S.h[i] > line(i) + 0.3 * A) return null;
  if (upT ? S.c[t] <= line(t) : S.c[t] >= line(t)) return null;
  const col = upT ? C.up : C.down;
  return { skill: "tlines", kind: "draw", tool: "trend", focus: a.i, tag: "Trend lines", title: upT ? "Draw the uptrend line" : "Draw the downtrend line",
    sub: upT ? "Select the ╱ tool and connect the last two swing lows (the most recent higher lows), earlier one first. Then tap Check." : "Select the ╱ tool and connect the last two swing highs (the most recent lower highs), earlier one first. Then tap Check.",
    grade: ds => {
      const ls = ds.filter(d => d.type === "trend" || d.type === "ray"); if (!ls.length) return { none: true }; let best = null;
      for (const d of ls) { const i0 = rIdx(d.pts[0].t), i1 = rIdx(d.pts[1].t); if (Math.abs(i1 - i0) < 0.5) continue; const ul = i => d.pts[0].p + (d.pts[1].p - d.pts[0].p) * (i - i0) / (i1 - i0); const e = Math.max(Math.abs(ul(a.i) - a.p), Math.abs(ul(b.i) - b.p)) / A; const slopeOk = Math.sign(ul(b.i) - ul(a.i)) === Math.sign(b.p - a.p); if (!best || e < best.e) best = { e, slopeOk }; }
      if (!best) return { none: true };
      return { score: best.slopeOk ? tolScore(best.e, [0.4, 0.8, 1.3]) : 0, e: best.e, slopeOk: best.slopeOk, p: 1 };
    },
    explain: r => report({ kpis: [["Anchor 1", fp(I, a.p)], ["Anchor 2", fp(I, b.p)], ["Line value now", fp(I, line(t))], ["Slope per candle", fp(I, (b.p - a.p) / (b.i - a.i))], ...(r && r.p != null ? [["Your max error", r.slopeOk ? `${r.e.toFixed(2)}× ATR` : "wrong slope", r.score >= 0.6 ? "pos" : "neg"]] : [])],
      yoursHead: "Your line", yoursOk: r && r.score >= 0.6, yours: r && r.p != null ? (!r.slopeOk ? "Your line slopes the wrong way. An uptrend line rises through the lows; a downtrend line falls through the highs." : r.score === 1 ? "Accurate: both anchors are within tolerance." : r.score >= 0.6 ? "Close to both anchors." : "Anchor exactly on the wicks of the two swing points. The magnet tool snaps to them.") : null,
      why: `The line joins the swing ${upT ? "lows" : "highs"} at ${fp(I, a.p)} (${whenOf(S, a.i)}) and ${fp(I, b.p)} (${whenOf(S, b.i)}). Every candle since the second swing has stayed ${upT ? "above" : "below"} it, so the line is unbroken.`,
      use: upT ? "Pullbacks to a rising trend line are where buyers often step in. A decisive close below it is the first warning that the uptrend is breaking." : "Rallies to a falling trend line are where sellers often step in. A decisive close above it is the first warning that the downtrend is ending." }),
    marks: [{ type: "tline", t0: S.ts[a.i], p0: a.p, t1: S.ts[b.i], p1: b.p, color: col, extend: true }, { type: "dot", t: S.ts[a.i], p: a.p, color: col, label: upT ? "low 1" : "high 1", below: upT }, { type: "dot", t: S.ts[b.i], p: b.p, color: col, label: upT ? "HL" : "LH", below: upT }] };
}
function qStop(S, t) {
  const tr = trendRead(S, t), lv = levels(S, t), A = S.atr[t], c = S.c[t], I = S.I;
  const buy = tr.k === "up" ? true : tr.k === "down" ? false : !!lv.sup;
  const L = buy ? lv.sup : lv.res; if (!L) return null;
  const dist = Math.abs(c - L.p) / A; if (dist < 0.6 || dist > 3.2) return null;
  const s = buy ? -1 : 1, good = L.p + s * 0.2 * A, tight = c + s * 0.15 * A, wide = c + s * (dist + 3) * A;
  return { skill: "risk", kind: "mc", tag: "Stop placement", title: `If you did ${buy ? "BUY" : "SELL"} here, where would the stop-loss belong?`, sub: `This drill is only about placing the stop; whether the trade is worth taking is a separate call, and staying out is always allowed. The nearest ${buy ? "support" : "resistance"} is ${fp(I, L.p)}. One average candle (ATR) is ${fp(I, A)}.`,
    opts: shuffle([{ k: "good", label: `Just ${buy ? "below" : "above"} the ${buy ? "support" : "resistance"}, at ${fp(I, good)}`, s: "Beyond the level" }, { k: "tight", label: `Right next to the entry, at ${fp(I, tight)}`, s: "Next to entry" }, { k: "wide", label: `Far away at ${fp(I, wide)}, to give it plenty of room`, s: "Far away" }]), correct: "good",
    explain: ch => report({ kpis: [["Entry", fp(I, c)], ["Level", fp(I, L.p)], ["Sound stop", fp(I, good), "pos"], ["Stop distance", `${(Math.abs(c - good) / A).toFixed(1)}× ATR`]],
      yours: ch === "tight" ? `A stop ${(0.15).toFixed(2)}× ATR away sits inside normal noise: an ordinary candle moves ${fp(I, A)}, so you would be stopped out by randomness rather than by being wrong.` : ch === "wide" ? `A stop ${(dist + 3).toFixed(1)}× ATR away is not protecting an idea, it is hoping. For the same dollar risk your position would have to be about ${((dist + 3) / (dist + 0.2)).toFixed(1)}× smaller, and if it is hit the trade was wrong long before.` : null,
      why: `The ${buy ? "buy" : "sell"} idea rests on ${fp(I, L.p)} holding. If price breaks through it, the idea is proven wrong, so the stop goes just beyond it, with a small buffer of 0.2× ATR for wicks.`,
      rule: "Place stops where the trade idea is invalidated, not at a fixed distance or a comfortable dollar amount. Then size the position so that distance equals your planned risk.",
      use: `With $100 of risk and a stop ${fp(I, Math.abs(c - good))} away, position size = $100 ÷ ${fp(I, Math.abs(c - good))} per unit. Wider stop, smaller size; the dollar risk stays fixed.` }),
    marks: [{ type: "level", p: good, t0: S.ts[Math.max(0, t - 12)], color: C.down, label: `Stop ${fnum(I, good)}`, below: buy, dash: [3, 3] }, { type: "level", p: L.p, t0: S.ts[L.i], color: buy ? C.up : C.down, label: `${buy ? "Support" : "Resistance"} ${fnum(I, L.p)}`, below: !buy }] };
}
function qRR(S, t) {
  const lv = levels(S, t); if (!lv.sup || !lv.res) return null;
  const c = S.c[t], A = S.atr[t], I = S.I, stop = lv.sup.p - 0.2 * A, tgt = lv.res.p, risk = c - stop, rew = tgt - c;
  if (risk <= 0 || rew <= 0) return null; const rr = rew / risk;
  const k = rr < 0.8 ? "poor" : rr >= 1.2 && rr <= 1.8 ? "ok" : rr >= 2.3 ? "good" : null; if (!k) return null;
  return { skill: "risk", kind: "mc", tag: "Reward-to-risk", title: "A BUY here would put the stop just under support and the target at resistance. Take it, or stay out?", sub: `Entry ${fp(I, c)} · support ${fp(I, lv.sup.p)} · resistance ${fp(I, lv.res.p)}. Stop goes 0.2× ATR under support.`,
    opts: [{ k: "poor", label: "Stay out: it risks more than it can make (below 1 : 1)", s: "Stay out" }, { k: "ok", label: "Only with extra confirmation: it pays about 1.2 to 1.8 : 1", s: "Needs confirmation" }, { k: "good", label: "Take it: it pays better than 2.3 : 1", s: "Take it" }], correct: k,
    explain: () => report({ kpis: [["Entry", fp(I, c)], ["Stop", fp(I, stop), "neg"], ["Target", fp(I, tgt), "pos"], ["Risk", fp(I, risk)], ["Reward", fp(I, rew)], ["Reward : risk", `${rr.toFixed(2)} : 1`, k === "good" ? "pos" : k === "poor" ? "neg" : ""]],
      why: `Risk = entry − stop = ${fp(I, risk)}. Reward = target − entry = ${fp(I, rew)}. ${fp(I, rew)} ÷ ${fp(I, risk)} = **${rr.toFixed(2)} : 1**. To break even you would need to win ${Math.round(100 / (1 + rr))}% of trades like this.`,
      use: k === "poor" ? "Staying out is the right call. Price is already close to the ceiling, so there is little left to gain. Professionals pass on trades like this or wait for a pullback toward support." : k === "good" ? "Room to the target is large relative to the risk. Even with a modest win rate, trades like this can be profitable." : "Acceptable but not exceptional. You need a better-than-average win rate to profit, so look for extra confirmation." }),
    marks: [{ type: "level", p: tgt, t0: S.ts[lv.res.i], color: C.up, label: `Target ${fnum(I, tgt)}` }, { type: "level", p: stop, t0: S.ts[lv.sup.i], color: C.down, label: `Stop ${fnum(I, stop)}`, below: true, dash: [3, 3] }] };
}
const ORDER = ["mtf", "trend", "ema", "structure", "tlines", "levels", "stop", "rr", "volume", "candles", "range", "close", "rsi", "div"];
// Keep each question type's answers balanced, so always guessing the most common answer doesn't pay.
// The natural frequency of each answer is learned as questions are generated; common answers are thinned out.
function qBalanceOK(q) {
  if (!q || q.kind !== "mc" || q.correct == null || !q.opts || q.opts.length < 2) return true;
  const key = q.key || q.skill, B = ST.qgen || (ST.qgen = {}), g = B[key] || (B[key] = {});
  for (const c in g) g[c] *= 0.997; g[q.correct] = (g[q.correct] || 0) + 1;
  const shares = q.opts.map(o => g[o.k] || 0), tot = shares.reduce((a, b) => a + b, 0); if (tot < 8) return true;
  const seen = shares.filter(x => x / tot > 0.015), floor = Math.min(...seen) / tot, mine = g[q.correct] / tot;
  return Math.random() < Math.max(0.12, Math.min(1, floor / mine));
}
function buildQs(S, t) {
  const T = TIERS[G.tier];
  const gens = { mtf: () => G.tf !== "1D" ? qHTF(G.tf === "4h" || G.tf === "1h" ? "1D" : HTF[G.tf]) : null, trend: () => qTrend(S, t), ema: () => qEMA(S, t), structure: () => qStructure(S, t), tlines: () => qTline(S, t), levels: () => qLevel(S, t), stop: () => qStop(S, t), rr: () => qRR(S, t), volume: () => qVolume(S, t), candles: () => qPattern(S, t), range: () => qRange(S, t), close: () => qClose(S, t), rsi: () => qRSI(S, t), div: () => qDiv(S, t) };
  const make = k => { try { const q = gens[k](); if (q) q.key = k; return q; } catch (e) { console.error("question", k, e); return null; } };
  const avail = T.pool.map(make).filter(q => q && qBalanceOK(q));
  const want = ST.rounds < 2 ? 2 : T.q;
  const scored = avail.map(q => ({ q, w: (1.25 - mastery(q.skill)) * (0.55 + Math.random()) * (ST.rounds < 2 && q.kind === "draw" ? 0.3 : 1) })).sort((a, b) => b.w - a.w);
  const out = []; let draws = 0; const used = new Set();
  for (const { q } of scored) { if (out.length >= want) break; if (q.kind === "draw" && draws) continue; if (used.has(q.skill)) continue; if (q.kind === "draw") draws++; used.add(q.skill); out.push(q); }
  for (const { q } of scored) { if (out.length >= want) break; if (!out.includes(q) && !(q.kind === "draw" && draws)) out.push(q); }
  for (const k of ["range", "ema", "trend", "candles", "close"]) { if (out.length >= 2) break; if (out.some(q => q.key === k)) continue; const q = make(k); if (q) out.push(q); }
  if (out.length < 2 && !out.some(q => q.key === "ema")) { const q = qEMA(S, t, true); if (q) { q.key = "ema"; out.push(q); } }
  return out.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
}

/* ================= PANEL: QUIZ ================= */
const pane = () => $("#pane");
function stepsHTML() {
  const ck = G.pbm && hasCheck() ? 1 : 0, n = G.qs.length + ck + 1, cur = G.phase === "quiz" ? G.qi : G.phase === "check" ? G.qs.length : G.phase === "trade" ? n - 1 : n;
  return `<span class="steps" aria-label="Step ${Math.min(cur + 1, n)} of ${n}">${Array.from({ length: n }, (_, i) => `<i class="${i < cur ? "done" : i === cur ? "now" : ""}"></i>`).join("")}</span>`;
}
function headHTML(noEvent) {
  const I = G.I, sim = isIntra(G.tf), T = TIERS[G.tier];
  const when = G.tf === "1D" ? `${fDay(I.d[G.Sv.di[G.t]])} · close` : `${fWall(G.tDec)} ${I.tz}`;
  const rp = G.money.reads + G.money.trade;
  return `<div class="rh"><span><b>${esc(I.short)}</b> · ${G.tf} <span class="badge ${sim ? "sim" : "real"}">${sim ? "SIM" : "REAL"}</span> · <span class="when">${when}</span></span>${stepsHTML()}</div>
  <div class="rh">${G.drill ? `<span class="chip" style="min-height:28px;padding:3px 10px">🎯 Drill · ${esc((DRILLS.find(d => d[0] === G.drill) || [, , G.drill])[2])}${drillMastery(G.drill) != null ? ` · ${Math.round(drillMastery(G.drill) * 100)}% right` : ""}</span>` : G.sm ? `<button class="chip" id="stopen" style="min-height:28px;padding:3px 10px">${STRATS[G.strat.key].icon} Strategy · ${esc(STRATS[G.strat.key].name)} · level ${stratLevel(G.strat.key)}</button>` : G.pbm ? `<button class="chip" id="pbopen" style="min-height:28px;padding:3px 10px">📖 Playbook · stage ${G.pb.stage + 1}: ${esc(STAGES[G.pb.stage].name)}</button>` : `<span class="stake">Tier ${G.tier + 1} · ${T.name} · ±$${T.stake} per answer</span>`}<span class="stake">Round P&amp;L <b class="${toneOf(rp)}">${fusd(rp)}</b></span></div>
  ${G.ev && !noEvent ? `<div class="event"><span class="tag">Real event · ${fDay(G.ev.d)}</span><span class="ttl">${esc(G.ev.title)}</span><p>${esc(G.ev.context)}</p></div>` : ""}`;
}
const afterQuiz = () => G.pbm && hasCheck() ? "check" : "trade";
function renderPanel() {
  if (G && G.replay) { rpPanel(); return; }
  if (G.phase === "quiz" && G.qi >= G.qs.length) G.phase = afterQuiz();
  if (G.phase === "quiz") renderQuiz(); else if (G.phase === "check") renderCheck(); else if (G.phase === "trade") { if (G.rapid) renderRapid(); else if (G.pbm) renderTradePB(); else if (G.sm) renderTradeStrat(); else renderTrade(); }
  renderMini();
}
function renderMini() {
  if (G && G.replay) { // a slim replay bar when the panel is hidden or the chart is full screen
    $("#mini").innerHTML = `<button class="btn pri" id="miniplay" style="min-height:34px;padding:6px 12px;flex:none">${RP.playing ? "⏸" : "▶"}</button><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">⏪ ${esc(rpI().short)} · ${G.view}${RP.pos && RP.pos.open ? " · in a trade" : ""}</span><button class="btn" id="miniopen" style="min-height:34px;padding:6px 12px;flex:none">▴ Show</button>`;
    $("#miniopen").onclick = () => { setFS(false); setPanelMin(false); }; $("#miniplay").onclick = () => { rpToggle(); renderMini(); }; return; }
  const q = G.phase === "quiz" ? G.qs[G.qi] : null;
  const t = q ? `Q${G.qi + 1}/${G.qs.length}: ${q.title}` : G.phase === "check" ? "Playbook checklist" : G.phase === "trade" ? "Your trade: buy, sell or stay out?" : G.phase === "play" ? "Trade in progress…" : "Trade report ready";
  const drawQ = q && q.kind === "draw" && !q.done;
  $("#mini").innerHTML = `<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t)}</span>${drawQ ? `<button class="btn pri" id="minicheck" style="min-height:34px;padding:6px 12px;flex:none">Check</button>` : ""}<button class="btn" id="miniopen" style="min-height:34px;padding:6px 12px;flex:none">▴ Show</button>`;
  $("#miniopen").onclick = () => { setFS(false); setPanelMin(false); };
  renderCoachQ();
  const mc = $("#minicheck"); if (mc) mc.onclick = () => checkDraw(mc);
}
// Every question names the timeframe its candles come from (the answer depends on it)
function tfAnnotate(q) {
  if (q.tf) return; q.tf = q.skill === "mtf" && q.switchTF ? q.switchTF : G.tf;
  const t = q.title, has = t.includes(q.tf) || t.toLowerCase().includes(tfWord(q.tf).toLowerCase());
  if (has) return;
  if (t.includes("two-candle pattern")) q.title = t.replace(/(the )?last two-candle pattern/, `the pattern of the last two ${q.tf} candles`);
  else if (/\bcandles?\b/.test(t)) q.title = t.replace(/\b(candles?)\b/, `${q.tf} $1`);
  else if (t.includes(":")) q.title = t.replace(/([?.])?$/, ` (${q.tf} chart)$1`);
  else q.title = `On the ${q.tf} chart: ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
}
function tfRowHTML(q) {
  if (!q.tf || q.done) return "";
  if (G.view === q.tf) return `<div class="tfnote ok"><span>Answer using the <b>${q.tf}</b> candles</span><i>✓ on screen</i></div>`;
  if (q.switchTF && q.switchTF !== q.tf && G.view === q.switchTF) return `<div class="tfnote"><span>You're on <b>${G.view}</b> to see the bigger picture. The question is about the <b>${q.tf}</b> chart.</span><button class="btn" id="tfgo">Back to ${q.tf}</button></div>`;
  return `<div class="tfnote warn"><span>⚠ You're looking at the <b>${G.view}</b> chart. This question is about the <b>${q.tf}</b> candles.</span><button class="btn pri" id="tfgo">Switch to ${q.tf}</button></div>`;
}
const TIPS = {
  "Trend": "The trend is the overall direction. Uptrend: price keeps making higher peaks and higher dips. Downtrend: lower peaks and lower dips. Sideways: neither. Look at the whole chart, not just the last candle.",
  "Moving average": "The blue line is the average closing price of the last 20 candles. Price above a rising line usually means buyers are in control; below a falling line, sellers.",
  "Support & resistance": "Support is a price where falls have stopped before (a floor). Resistance is where rises have stopped (a ceiling). Look for two or more turns at about the same price.",
  "Candle reading": "Each candle shows where price opened, the highest and lowest it went, and where it closed. Green closed higher than it opened, red lower. A big body means one side was firmly in control.",
  "Candle patterns": "Patterns are shapes made by 1 to 3 candles. A hammer has a long lower wick: sellers pushed price down, buyers pushed it back up. An engulfing candle's body covers the whole body of the one before it.",
  "Volatility": "Volatility is how much price moves. ATR (average true range) is the size of a normal candle lately. Compare the candle with that normal size.",
  "Momentum": "Momentum is how fast and how strongly price is moving. Several big candles in a row in one direction = strong momentum. Candles getting smaller = momentum fading.",
  "Top-down": "Traders check a bigger timeframe first. The bigger trend is like the tide and the small moves are waves: trading with the tide is usually easier.",
  "Market structure": "Swing highs are the peaks, swing lows are the dips. Higher highs and higher lows = uptrend. Lower highs and lower lows = downtrend. A mix = range or a change.",
  "Market state": "The five states: trend (a strong steady move), up-channel and down-channel (moving within a sloped lane), range (sideways between a floor and a ceiling) and transition (direction changing).",
  "Trend lines": "A trend line joins two or more dips in an uptrend (or peaks in a downtrend). It should touch the wicks without cutting through candle bodies.",
  "Volume": "Volume is how much was traded (the bars at the bottom). A move on rising volume has more traders behind it; a move on low volume is weaker.",
  "Divergence": "Divergence: price makes a new high but RSI (the purple line below) makes a lower high, or the opposite at lows. It's a warning that the move may be running out of steam.",
  "Stop placement": "A stop-loss is where you admit the idea was wrong. Put it where the idea is clearly broken (just past the swing low for a buy), not at a random distance.",
  "Reward-to-risk": "Reward-to-risk compares what you could win with what you could lose. Risking $500 to make $1,000 is 2R. At 2R you only need to win about 1 trade in 3 to break even.",
  "Costs": "Every trade pays fees and some slippage. Tight stops need bigger size, so fees take a bigger share of the profit.",
  "VWAP": "VWAP (the amber line) is the average price paid today, weighted by volume. Big traders use it as fair value: above it buyers have the edge, below it sellers.",
  "Fair value gap": "A fair value gap is a 3-candle pattern: the middle candle moves so fast that candle 1 and candle 3 don't overlap. Bullish: candle 3's low is above candle 1's high. Price often comes back to fill the gap.",
  "Pillar 1 · Location": "Location means price is at an important level from a bigger timeframe: yesterday's high or low, or a 4h/1h fair value gap or order block. Good trades start at good locations.",
};
function tipHTML(q) {
  const tip = q.tip || TIPS[q.tag]; if (!tip || q.done) return "";
  const r = rankOf(ST.xp);
  if (r <= 2) return `<div class="tipbox"><b>💡 What this means</b><p>${esc(tip)}</p></div>`;
  if (r <= 5 || q.tip) return `<details class="tipbox"><summary>💡 Need a hint?</summary><p>${esc(tip)}</p></details>`;
  return "";
}
function speedLimit(q) { return q.kind === "draw" ? 45 : 20; }
function renderQuiz() {
  const q = G.qs[G.qi], P = pane(), T = TIERS[G.tier], L = "ABCDEFGH";
  if (!q.t0) q.t0 = performance.now();
  if (!q.tfShown) { q.tfShown = true; if (q.tf && G.view !== q.tf && !q.done) { setView(q.tf); return; } }
  let body = "";
  if (q.kind === "mc") body = `<div class="opts">${q.opts.map((o, i) => { let cls = ""; if (q.done) { if (o.k === q.correct) cls = "right"; else if (o.k === q.chosen) cls = "wrong"; } return `<button class="opt ${cls}" data-k="${o.k}" ${q.done ? "disabled" : ""}><span class="lt">${L[i]}</span><span>${esc(o.label)}</span><span class="mk">${q.done ? (o.k === q.correct ? "✓" : o.k === q.chosen ? "✕" : "") : ""}</span></button>`; }).join("")}</div>`;
  else if (!q.done) body = `<div class="row"><button class="btn" id="usetool">${q.tool === "hline" ? "─ Horizontal line" : "╱ Trend line"} tool</button><button class="btn pri" id="check">Check my ${q.tool === "hline" ? "line" : "trend line"}</button></div><button class="btn ghost" id="showme">Show me the answer (−$${Math.round(stakeNow() / 2)})</button>`;
  let fb = "";
  if (q.done) {
    const sc = q.score, cls = sc >= 1 ? "good" : sc >= 0.6 ? "part" : sc > 0 ? "part" : "bad";
    const ans = q.kind === "mc" ? (q.opts.find(o => o.k === q.correct).s || "") : "";
    const head = q.kind === "mc" ? (sc ? `✓ Correct · ${ans}` : `✕ Incorrect · answer: ${ans}`) : q.res && q.res.skipped ? "Answer shown" : sc >= 1 ? "✓ Accurate" : sc >= 0.6 ? "≈ Close" : sc > 0 ? "≈ In the area" : "✕ Off target";
    fb = `<div class="fb ${cls}"><div class="fbh"><span class="verd">${head}</span>${q.cash ? `<span class="mchip ${toneOf(q.cash)}">${fusd(q.cash)}</span>` : ""}${q.gain ? `<span class="mchip xp">+${q.gain} XP</span>` : ""}</div>${q.bonus ? `<p class="small" style="margin:0">⚡ Speed bonus applied (answered in ${q.secs}s).</p>` : ""}${q.explain(q.kind === "mc" ? q.chosen : q.res)}</div>
      ${coachOK() ? `<button class="btn coachask" id="askwhy">✦ Ask Quint why</button>` : ""}${G.drill ? `<div class="stick"><div class="row"><button class="btn" id="drilltrade">Trade this chart</button><button class="btn pri" id="drillnext">Next chart →</button></div></div><div hidden>` : ""}<div class="stick"><button class="btn pri" id="nextq" style="width:100%">${G.qi + 1 < G.qs.length ? "Next question →" : afterQuiz() === "check" ? "Run the pillar checklist →" : "Open the order ticket →"}</button></div>${G.drill ? "</div>" : ""}`;
  }
  const el = Math.min(speedLimit(q), (performance.now() - q.t0) / 1000);
  P.innerHTML = `${headHTML()}<div class="q"><div class="fbh"><span class="qk">${esc(q.tag)} · question ${G.qi + 1} of ${G.qs.length}</span>${T.speed && !G.pbm && !q.done && el < speedLimit(q) ? `<span class="speed">⚡ ×1.5<i style="animation-duration:${speedLimit(q)}s;animation-delay:-${el.toFixed(1)}s"></i></span>` : ""}</div><h2>${esc(q.title)}</h2><p>${esc(q.sub)}</p>
    ${tipHTML(q)}${tfRowHTML(q)}${q.switchTF && q.switchTF !== q.tf && !q.done && G.view !== q.switchTF ? `<div class="row"><button class="btn" id="swtf">See the bigger picture on ${q.switchTF}</button></div>` : ""}${body}${!q.done && coachOK() ? `<button class="btn coachask" id="askq">✦ Ask Quint to guide me</button>` : ""}</div>${fb}
    ${ST.rounds < 3 && !q.done ? `<p class="small" style="margin:0">Drag the chart to look further back · pinch or scroll to zoom · tap a candle to read it · switch timeframes at the top. Correct answers earn money; wrong ones cost money.</p>` : ""}`;
  $$(".opt", P).forEach(b => b.addEventListener("click", () => answer(b.dataset.k, b)));
  const sw = $("#swtf"); if (sw) sw.onclick = () => setView(q.switchTF);
  const tg = $("#tfgo"); if (tg) tg.onclick = () => setView(q.tf);
  if (q.kind === "draw" && !q.done && G.view === G.tf && q.seen !== G.view) { q.seen = G.view; ensureVisible(q.focus); }
  const ut = $("#usetool"); if (ut) ut.onclick = () => { chart.setMode(q.tool); renderTools(); if (window.innerWidth < 960) setPanelMin(true); };
  const ck = $("#check"); if (ck) ck.onclick = () => checkDraw(ck);
  const sm = $("#showme"); if (sm) sm.onclick = () => { q.done = true; q.score = 0; q.res = { skipped: true }; recordSkill(q.skill, 0); ST.qN++; ST.qStreak = 0; q.cash = -Math.round(stakeNow() / 2); bank(q.cash, "reads"); addMarks(q); renderPanel(); };
  const aq = $("#askq"); if (aq) aq.onclick = () => coachAsk(guideText());
  const dn = $("#drillnext"); if (dn) dn.onclick = () => { newRound(); $("#panel").scrollTop = 0; };
  const dt = $("#drilltrade"); if (dt) dt.onclick = () => { G.qi++; G.phase = "trade"; renderPanel(); };
  const aw = $("#askwhy"); if (aw) aw.onclick = () => coachAsk(whyText());
  const nx = $("#nextq"); if (nx) nx.onclick = () => { G.qi++; if (G.qi >= G.qs.length) G.phase = afterQuiz(); renderPanel(); P.parentElement.scrollTop = 0; };
  if (!q.done) P.parentElement.scrollTop = 0;
}
function coachOK() { return typeof CO !== "undefined" && !!CO.sample; }
function bindAskTicket() { const b = $("#askt"); if (b) b.onclick = () => coachAsk(guideText()); }
function ensureVisible(i) {
  const g = chart.geo(), left = chart.idx(g.L + 20, g); if (i == null || i >= left) return;
  const n = chart.S.n, fut = chart.futureBars(), span = (n - 1 - i) + Math.min(fut, 12) + 8;
  chart.sp = clamp((g.R - g.L) / span, 1.5, 48); chart.right = n - 1 + Math.min(fut, 12) + 3; chart.ym = null; chart.clampRight(); chart.req();
}
function addMarks(q) { for (const m of q.marks || []) G.overlays.push(m); chart.overlays = G.overlays; chart.req(); }
const stakeNow = () => G.pbm ? STAGES[G.pb.stage].stake : TIERS[G.tier].stake;
function payout(q, score) {
  const T = TIERS[G.tier], st = stakeNow(), secs = (performance.now() - q.t0) / 1000; q.secs = Math.round(secs);
  let cash = q.kind === "mc" ? (score ? st : -st) : Math.round(st * (2 * score - 1));
  if (T.speed && !G.pbm && score >= 0.6 && secs <= speedLimit(q)) { cash = Math.round(cash * 1.5); q.bonus = true; }
  return cash;
}
function answer(k, el) {
  const q = G.qs[G.qi]; if (q.done) return;
  q.done = true; q.chosen = k; q.score = k === q.correct ? 1 : 0;
  recordSkill(q.skill, q.score); ST.qN++; drillRec(q);
  if (q.score) { ST.qC++; ST.qStreak++; ST.best = Math.max(ST.best, ST.qStreak); q.gain = 10 + Math.min(10, (ST.qStreak - 1) * 2); } else { ST.qStreak = 0; q.gain = 2; }
  q.cash = payout(q, q.score); bank(q.cash, "reads");
  if (q.key === "loc") G.overlays = G.overlays.filter(o => !o.prep);
  gainXP(q.gain, el); addMarks(q); renderPanel();
}
function checkDraw(el) {
  const q = G.qs[G.qi]; const r = q.grade(chart.drawings);
  if (r.none) { toast(q.tool === "hline" ? "Draw a horizontal line first (─ tool)" : "Draw a trend line first (╱ tool)"); chart.setMode(q.tool); renderTools(); return; }
  q.done = true; q.score = r.score; q.res = r; recordSkill(q.skill, r.score); ST.qN++; drillRec(q);
  if (r.score >= 0.6) { ST.qC++; ST.qStreak++; ST.best = Math.max(ST.best, ST.qStreak); } else ST.qStreak = 0;
  q.gain = Math.round(18 * r.score) || 2; q.cash = payout(q, r.score); bank(q.cash, "reads");
  gainXP(q.gain, el); addMarks(q); setPanelMin(false); renderPanel();
}

/* ================= PANEL: ORDER TICKET ================= */
function feeFor(I, qty, px) { if (I.sym === "BTC") return qty * px * 0.0002 * 2; const z = splitSize(I, qty); return z.minis * 4.5 + z.rest * 1.24; }
function sizeText(I, qty) { const z = splitSize(I, qty); return [z.minis ? `${z.minis} ${z.S.bName}` : "", z.rest ? `${z.rest} ${z.S.mName}` : ""].filter(Boolean).join(" + ") || `1 ${z.S.mName}`; }
function ticketNumbers(sdOverride) {
  const I = G.I, A = G.Sv.atr[G.t], e = G.Sv.c[G.t], sd = sdOverride || G.plan.stop * A, budget = riskBudget(G.plan.risk), K = contractSpec(I), cap = AC().cap, per = Math.round(K.mini / K.micro);
  let z = sizeFor(I, budget, sd); const L = ST.lots;
  if (L && !L.auto && !G.pbm && !G.sm) { const micros = clamp(L.mini ? L.n * per : L.n, 1, cap); z = { qty: micros * K.micro / I.pv, micros, tooWide: false, capped: false, manual: true }; }
  const fit = roomMicros(I, sd, e); if (z.micros > Math.max(1, fit)) { z = Object.assign({}, z, { micros: Math.max(1, fit), qty: Math.max(1, fit) * K.micro / I.pv, roomCut: true }); }
  if (fit < 1) z.noRoom = true;
  const risk = z.qty * I.pv * sd;
  return { I, A, e, sd, risk, budget, qty: z.qty, z, fees: feeFor(I, z.qty, e), reward: risk * G.plan.tgt, K, cap, per };
}
function sizeNote(n) { return n.z.noRoom ? `<p class="small warn" style="margin:0">⚠ Only ${fbal(roomLeft())} left before your loss limit: even 1 ${contractSpec(n.I).mName} with this stop doesn't fit, so the account could be closed before your stop. Use a tighter stop.</p>`
  : n.z.roomCut ? `<p class="small" style="margin:0">Size cut to <b>${sizeText(n.I, n.qty)}</b> so your stop fits inside the ${fbal(roomLeft())} left before your loss limit. Your trade runs to your stop or target.</p>` : n.z.tooWide ? `<p class="small warn" style="margin:0">⚠ The stop is wide: even 1 ${contractSpec(n.I).mName} risks ${fbal(n.risk)}, more than your ${fbal(n.budget)} budget.</p>` : n.z.capped ? `<p class="small" style="margin:0">Capped at the account's size limit (${AC().cap / 10} minis).</p>` : ""; }
function renderTrade() {
  const P = pane(), n = ticketNumbers(), I = G.I, p = G.plan, dur = G.tf === "1D" ? `${G.H} days` : `${G.H} × ${G.tf} (${fmtDur(G.tEnd - G.tDec)})`;
  const chip = (id, vals, cur, fmt) => `<div class="chips" id="${id}">${vals.map(v => `<button class="chip" data-v="${v}" aria-pressed="${cur === v}">${fmt(v)}</button>`).join("")}</div>`;
  P.innerHTML = `${headHTML()}<div class="q"><span class="qk">Order ticket</span><h2>Buy, sell or stay out?</h2>
    <p>Market order at the close: <b>${fp(I, n.e)}</b>. ${acctLabel()} balance <b>${fbal(ST.bal)}</b>, ${fbal(Math.max(0, ST.bal - ST.acct.floor))} above the loss limit.</p>
    <div class="plan"><span>Risk</span>${chip("prisk", [0.5, 1, 1.5], p.risk, v => fbal(riskBudget(v)))}
      <span>Stop</span>${chip("pstop", [1, 1.5, 2], p.stop, v => `${v}× ATR`)}
      <span>Target</span>${chip("ptgt", [1.5, 2, 3], p.tgt, v => `${v}R`)}</div>
    <div class="ticket"><div>Size<b>${sizeText(I, n.qty)}</b></div><div>Max loss<b class="neg">−${fbal(n.risk)}</b></div><div>Target profit<b class="pos">+${fbal(n.reward)}</b></div>
      <div>Stop distance<b>${fp(I, n.sd)}</b></div><div>Fees (est.)<b>−$${n.fees.toFixed(2)}</b></div><div>Runs until<b>stop or target</b></div></div>${sizeNote(n)}
    <div class="orders"><button class="ord sell" id="sell"><b>SELL</b><span>${fp(I, n.e)} · short</span></button><button class="ord buy" id="buy"><b>BUY</b><span>${fp(I, n.e)} · long</span></button></div>
    <button class="btn" id="skip">Stay out: no clear edge</button>${coachOK() ? `<button class="btn coachask" id="askt">✦ Ask Quint about this setup</button>` : ""}
    <p class="risk" style="margin:0">Break-even win rate at ${p.tgt}R: ${Math.round(100 / (1 + p.tgt))}%. During the trade you can pause, move your stop to breakeven or close early.</p></div>
    <button class="btn ghost" id="hintb">${G.hint ? "Hide the analyst's read" : `Show the analyst's read${G.tier === 0 || G.hintPaid ? "" : " (−5 XP)"}`}</button>
    ${G.hint ? `<div class="fb"><div class="fbh"><span class="verd">The analyst's read</span></div>${atable(G.an.rows)}<p class="small" style="margin:0">A guide built from simple rules, not a promise.</p></div>` : ""}`;
  $("#buy").onclick = () => decide(1); $("#sell").onclick = () => decide(-1); $("#skip").onclick = () => decide(0);
  $$("#prisk .chip").forEach(b => b.onclick = () => { G.plan.risk = ST.riskPct = +b.dataset.v; save(); renderTrade(); });
  bindAskTicket();
  $$("#pstop .chip").forEach(b => b.onclick = () => { G.plan.stop = +b.dataset.v; renderTrade(); });
  $$("#ptgt .chip").forEach(b => b.onclick = () => { G.plan.tgt = +b.dataset.v; renderTrade(); });
  $("#hintb").onclick = e => { if (!G.hint && !G.hintPaid && G.tier > 0) { G.hintPaid = true; gainXP(-5, e.currentTarget); } G.hint = !G.hint; renderTrade(); };
}
const tgtOK = P => isFinite(P.tgt) && Math.abs(P.tgt - P.e) < 50 * P.sd;
function renderTradeStrat() {
  const P = pane(), s = G.strat, K = STRATS[s.key], I = G.I, d = s.d || 1, pl = stratPlan(d), n = ticketNumbers(pl.sd), e = n.e, dur = G.tf === "1D" ? `${G.H} days` : `${G.H} × ${G.tf} (${fmtDur(G.tEnd - G.tDec)})`;
  P.innerHTML = `${headHTML()}<div class="q"><span class="qk">Order ticket · ${esc(K.name)}</span><h2>${s.d ? `The rules say ${s.d > 0 ? "BUY" : "SELL"}. Take it?` : "No signal by the rules. Trade anyway or stay out?"}</h2>
    <p>${s.d ? `Plan: ${s.d > 0 ? "buy" : "sell"} at <b>${fp(I, e)}</b>, stop <b>${fp(I, pl.stop)}</b> (${esc(pl.stopTxt)}), exit on <b>${esc(pl.exitTxt)}</b>.` : `If you trade anyway, the app uses the same stop and exit rules in the direction you pick.`}</p>
    <div class="plan"><span>Risk</span><div class="chips" id="prisk">${[0.5, 1, 1.5].map(v => `<button class="chip" data-v="${v}" aria-pressed="${G.plan.risk === v}">${fbal(riskBudget(v))}</button>`).join("")}</div></div>
    <div class="ticket"><div>Size<b>${sizeText(I, n.qty)}</b></div><div>Max loss<b class="neg">−${fbal(n.risk)}</b></div><div>${pl.rr ? "Target" : "Exit"}<b class="pos">${pl.rr ? "+" + fbal(n.risk * pl.rr) : "by rule"}</b></div><div>Stop distance<b>${fp(I, pl.sd)}</b></div><div>Fees (est.)<b>−$${n.fees.toFixed(2)}</b></div><div>Runs until<b>stop or target</b></div></div>${sizeNote(n)}
    <div class="orders"><button class="ord sell" id="sell"><b>SELL</b><span>${fp(I, e)}${s.d < 0 ? " · signal" : ""}</span></button><button class="ord buy" id="buy"><b>BUY</b><span>${fp(I, e)}${s.d > 0 ? " · signal" : ""}</span></button></div>
    <button class="btn" id="skip">Stay out${s.d ? "" : ": no signal"}</button>${coachOK() ? `<button class="btn coachask" id="askt">✦ Ask Quint about this setup</button>` : ""}
    <p class="risk" style="margin:0">${G.tf === "1D" ? "Real daily candles." : "Simulated intraday candles: practice for spotting the setup."} Room before your loss limit: ${fbal(Math.max(0, ST.bal - ST.acct.floor))}.</p></div>`;
  $("#buy").onclick = () => decide(1); $("#sell").onclick = () => decide(-1); $("#skip").onclick = () => decide(0);
  $$("#prisk .chip").forEach(b => b.onclick = () => { G.plan.risk = ST.riskPct = +b.dataset.v; save(); renderTradeStrat(); }); bindAskTicket();
}
/* ================= RAPID FIRE: pure buy or sell on real historical moves ================= */
let RUN = null, RAPID_T = 0;
const runLen = () => ST.rlen || 20;
const PACKS = {
  mix: ["🎲", "Everything", "Any market, any moment: a bit of every scenario below"],
  breakout: ["🚀", "Breakouts", "Price just closed at a new 20-day high or low. Does it keep going?"],
  pullback: ["↩️", "Pullbacks", "A sharp dip inside an uptrend, or a bounce inside a downtrend"],
  reversal: ["🔄", "Failed breakouts", "Price swept a 20-day high or low and closed back inside"],
  range: ["↔️", "Sideways ranges", "No clear trend: price chopping between a floor and a ceiling"],
  gap: ["⏭️", "Gaps", "The day opened well away from the previous close"],
  bigday: ["💥", "Big news days", "Today's candle was at least twice the normal size"],
  trend: ["📈", "Strong trends", "Price far above or below its 50-day average, moving steadily"],
  events: ["📰", "Famous moments", "Real historic days: the 2021 Bitcoin top, LUNA, FTX and more"],
  intraday: ["⏱️", "Intraday (1h / 15m)", "Simulated intraday charts built inside real days"],
  scalp: ["⚡", "Scalping (5m / 1m)", "Fast simulated charts: decide in seconds"],
};
const RPOOL = {};
function rapidPool(pack) {
  if (RPOOL[pack]) return RPOOL[pack]; const out = [];
  for (const sym of SYMS) { const S = DSER[sym], A = ADJ[sym];
    for (let i = 40; i < S.n - 6; i++) {
      const H = Math.min(8, nextBrk(S, i) - i - 1, S.n - 1 - i); if (H < 5 || S.n - 1 - i < 30) continue; const lb = lastBrk(S, i); if (lb > 0 && i - lb < 2) continue;
      const k = S.di[i], a = A.atr[k], c = A.c, ok = (() => {
        if (!a) return false;
        if (pack === "breakout") { const s = dailySignal("trend", sym, k); return s && s.d; }
        if (pack === "reversal") { const s = dailySignal("soup", sym, k); return s && s.d; }
        const s50 = smaA(c, 50, k), s50b = smaA(c, 50, k - 10); if (pack === "pullback") return s50 && s50b && A.r2[k] != null && ((c[k] > s50 && s50 > s50b && A.r2[k] < 15) || (c[k] < s50 && s50 < s50b && A.r2[k] > 85));
        if (pack === "trend") return s50 && s50b && Math.abs(c[k] - s50) > 2.5 * a && Math.sign(c[k] - s50) === Math.sign(s50 - s50b);
        if (pack === "range") { let path = 0; for (let j = k - 19; j <= k; j++) path += Math.abs(c[j] - c[j - 1]); return path > 0 && Math.abs(c[k] - c[k - 20]) / path < 0.12; }
        if (pack === "gap") return !S.brk[i] && Math.abs(A.o[k] - c[k - 1]) > 0.6 * a;
        if (pack === "bigday") return A.h[k] - A.l[k] > 2 * A.atr[k - 1];
        return false; })();
      if (ok) out.push({ sym, t: i, H }); } }
  return RPOOL[pack] = out;
}
function newRun() { RUN = { n: 0, wins: 0, losses: 0, skips: 0, R: 0, net: 0, streak: 0, best: 0, auto: ST.rauto === true }; }
function pickRapid() {
  const allowed = allowedSyms(); let pack = ST.rpack && PACKS[ST.rpack] ? ST.rpack : "mix";
  if (pack === "mix") pack = pick(["any", "any", "any", "breakout", "pullback", "reversal", "range", "gap", "bigday", "trend", "events", "intraday", "scalp"]);
  if (pack === "events") { const evs = EVENTS.filter(e => allowed.includes(e.sym) && DSER[e.sym].n - 1 - e.t >= 30); if (evs.length) { const e = pick(evs), S = DSER[e.sym], I = INST[e.sym], H = horizonD(S, e.t); if (H >= 3) return { I, tf: "1D", t: e.t, H, tDec: I.se[e.t], tEnd: I.se[e.t + H], ev: e, rapid: true, pack: "events" }; } pack = "any"; }
  if (pack === "intraday" || pack === "scalp") { for (let k = 0; k < 6; k++) { const I = INST[pick(allowed)], tf = pick(pack === "scalp" ? ["5m", "5m", "1m"] : ["1h", "15m", "15m"]), r = pickIntra(I, tf); if (r && I.n - 1 - dayAt(I, r.tDec) >= 12) return Object.assign({ I, ev: null, rapid: true, pack }, r); } pack = "any"; }
  if (pack !== "any") { const P = rapidPool(pack).filter(x => allowed.includes(x.sym)); if (P.length) { const x = pick(P), I = INST[x.sym]; return { I, tf: "1D", t: x.t, H: x.H, tDec: I.se[x.t], tEnd: I.se[x.t + x.H], ev: null, rapid: true, pack }; } }
  for (let tries = 0; tries < 120; tries++) {
    const sym = pick(allowed), I = INST[sym], S = DSER[sym], t = 40 + Math.floor(Math.random() * Math.max(1, S.n - 72));
    const H = Math.min(8, nextBrk(S, t) - t - 1, S.n - 1 - t); if (H < 5) continue;
    const lb = lastBrk(S, t); if (lb > 0 && t - lb < 2) continue;
    if (ST.played.slice(-60).some(p => p[0] === sym && p[1] === "1D" && Math.abs(p[2] - t) < 3)) continue;
    return { I, tf: "1D", t, H, tDec: I.se[t], tEnd: I.se[t + H], ev: null, rapid: true, pack: "any" };
  }
  return null;
}
function rapidHead(after) {
  const R = RUN, k = after ? R.n : R.n + 1, L = runLen();
  return `<div class="rapidhd"><span>⚡ <b>Rapid fire</b> · chart ${Math.min(k, L)} of ${L}</span><span>${R.streak >= 2 ? `🔥 ${R.streak} in a row · ` : ""}run <b class="${toneOf(R.net)}">${fusd(R.net)}</b></span></div><div class="rprog"><i style="width:${Math.min(100, k / L * 100)}%"></i></div>`;
}
function renderRapid() {
  if (!RUN || RUN.n >= runLen()) newRun();
  const P = pane(), I = G.I, n = ticketNumbers(), p = G.plan, pk = PACKS[ST.rpack || "mix"], span = G.tf === "1D" ? `${G.H} days` : `${G.H} × ${G.tf}`;
  const chips = (id, vals, cur, fmt) => `<div class="chips" id="${id}">${vals.map(v => `<button class="chip" data-v="${v}" aria-pressed="${cur === v}">${fmt(v)}</button>`).join("")}</div>`;
  P.innerHTML = `${rapidHead(false)}<button class="chip packbtn" id="packbtn">${pk[0]} ${esc(pk[1])} ▾</button>
    <div class="q rapidq"><h2>${esc(I.short)}${G.tf !== "1D" ? ` · ${G.tf}` : ""}: up or down?</h2>
    ${G.ev ? `<p class="small" style="margin:0">📰 A real historic moment. The story is revealed after you trade.</p>` : ""}
    <div class="plan"><span>Stop</span>${chips("rstop", [0.5, 1, 1.5], p.stop, v => `${v} ATR`)}<span>Target</span>${chips("rtgt", [1, 1.5, 2, 3], p.tgt, v => `${v}R`)}<span>Contracts</span><div>${lotsHTML(n)}</div><span>After entry</span><div class="chips" id="rwait"><button class="chip" data-v="1" aria-pressed="${ST.rwait !== false}">Wait for me to set my stop</button><button class="chip" data-v="0" aria-pressed="${ST.rwait === false}">Play at once</button></div></div>
    ${sizeNote(n)}<p class="small" style="margin:0">${G.tf === "1D" ? "Real daily chart" : "Simulated intraday chart"}. Stop ${fp(I, n.sd)} away · runs until your stop or target is hit · risking ${fbal(n.risk)} (${sizeText(I, n.qty)}). ${ST.rwait !== false ? "Once you're in, the candles wait while you set your stop and target." : "You can close early or move your stop once you're in."}</p>
    <div class="orders big"><button class="ord sell" id="sell"><b>SELL</b><span>${fp(I, n.e)}</span></button><button class="ord buy" id="buy"><b>BUY</b><span>${fp(I, n.e)}</span></button></div>
    <button class="btn ghost" id="skip">Skip this chart</button>
    ${window.innerWidth >= 960 ? `<p class="small" style="margin:0">Keys: <b>B</b> or ↑ to buy, <b>S</b> or ↓ to sell, <b>N</b> for the next chart.</p>` : ""}</div>`;
  $("#buy").onclick = () => decide(1); $("#sell").onclick = () => decide(-1); $("#skip").onclick = () => { RUN.skips++; newRound(); };
  const setP = (k, v) => { G.plan[k] = v; ST.rplan = Object.assign(ST.rplan || {}, { [k]: v }); save(); renderRapid(); };
  $$("#rwait .chip").forEach(b => b.onclick = () => { ST.rwait = b.dataset.v === "1"; save(); renderRapid(); }); bindLots(renderRapid);
  $$("#rstop .chip").forEach(b => b.onclick = () => setP("stop", +b.dataset.v)); $$("#rtgt .chip").forEach(b => b.onclick = () => setP("tgt", +b.dataset.v));
  $("#packbtn").onclick = openPacks;
}
function openPacks() {
  openSheet(`${shead("Rapid fire: choose scenarios")}<p class="small">Pick the kind of moment you want to practise. Daily packs use real historical charts; intraday packs use simulated charts built inside real days.</p>
    <div class="menu">${Object.entries(PACKS).map(([k, [ic, nm, ds]]) => `<button data-k="${k}" aria-pressed="${(ST.rpack || "mix") === k}"><span class="i">${ic}</span><span><b>${esc(nm)}</b><small>${esc(ds)}${["mix", "events", "intraday", "scalp"].includes(k) ? "" : ` · ${rapidPool(k).length} charts`}</small></span></button>`).join("")}</div>
    <h3>Run length</h3><div class="chips" id="rlen">${[10, 20, 50].map(v => `<button class="chip" data-v="${v}" aria-pressed="${runLen() === v}">${v} charts</button>`).join("")}</div>`, s => {
    $$(".menu button", s).forEach(b => b.onclick = () => { ST.rpack = b.dataset.k; ST.style = "rapid"; save(); closeSheet(); newRun(); newRound(); toast(`${PACKS[b.dataset.k][0]} ${PACKS[b.dataset.k][1]}`); });
    $$("#rlen .chip", s).forEach(b => b.onclick = () => { ST.rlen = +b.dataset.v; save(); $$("#rlen .chip", s).forEach(x => x.setAttribute("aria-pressed", String(x === b))); if (RUN) RUN.n = Math.min(RUN.n, runLen() - 1); });
  });
}
// how did your trade management compare with simply leaving the original plan alone?
/* ---------- post-trade review: was it a good trade, a good stop, a good target? ---------- */
function tradeReview(P) {
  if (!P || !P.exit) return null;
  const S = G.Sv, t = G.t, I = G.I, A = S.atr[t] || P.sd, d = P.dir, e = P.e, sd = P.sd, lv = levels(S, t), tr = trendRead(S, t), Sr = G.Sr;
  const Rf = x => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(1) + "R", f = x => fnum(I, Math.round(x / I.tick) * I.tick), up = d > 0;
  const opp = up ? lv.res : lv.sup, own = up ? lv.sup : lv.res, oppN = up ? "resistance" : "support", ownN = up ? "support" : "resistance";
  const stop0 = P.stop0 != null ? P.stop0 : e - d * sd, tgt0 = P.tgt0 != null ? P.tgt0 : P.tgt, marks = [];
  if (own && Math.abs(e - own.p) / A < 4) marks.push({ type: "zone", lo: own.p, hi: own.p, t0: S.ts[own.i], color: up ? C.up : C.down, label: up ? "Support" : "Resistance", dash: true });
  if (opp && Math.abs(opp.p - e) / A < 4) marks.push({ type: "zone", lo: opp.p, hi: opp.p, t0: S.ts[opp.i], color: up ? C.down : C.up, label: up ? "Resistance" : "Support", dash: true });
  // 1. the idea / entry
  const withT = (tr.k === "up" && up) || (tr.k === "down" && !up), against = (tr.k === "up" && !up) || (tr.k === "down" && up);
  const room = opp ? (opp.p - e) * d / A : null, nearOwn = own ? (e - own.p) * d / A : null;
  let eg, et;
  if (against) { eg = 0; et = `Against the ${tr.k === "up" ? "uptrend" : "downtrend"}: price was making ${tr.k === "up" ? "higher highs above a rising EMA" : "lower lows below a falling EMA"}, so the odds favoured the other side.`; }
  else if (withT) { eg = 1; et = `With the ${tr.k === "up" ? "uptrend" : "downtrend"}${nearOwn != null && nearOwn < 1.2 ? `, near ${ownN} at ${f(own.p)}` : ""}: trading in the direction the market is already moving.`; }
  else if (nearOwn != null && nearOwn < 0.8) { eg = 1; et = `No clear trend, but you ${up ? "bought" : "sold"} right at ${ownN} (${f(own.p)}): the right end of the range.`; }
  else { eg = 0.5; et = `No clear trend and price was in the middle of its range: close to a coin flip. Better to wait for an edge of the range.`; }
  if (room != null && room >= 0 && room < 0.6) { eg = Math.min(eg, 0); et += ` And you ${up ? "bought" : "sold"} only ${room.toFixed(1)} ATR ${up ? "under resistance" : "above support"} at ${f(opp.p)}: little room to run.`; }
  // 2. the stop loss
  const sATR = Math.abs(e - stop0) / A; let sg, st;
  if (own && Math.abs(e - own.p) / A < 3 && (e - own.p) * d > 0) {
    if ((stop0 - own.p) * d < 0) { sg = sATR < 0.5 ? 0.5 : 1; st = `Beyond the ${ownN} at ${f(own.p)}, so a normal pullback to that level couldn't stop you out.`; }
    else { sg = 0; st = `It sat ${up ? "above" : "below"} the ${ownN} at ${f(own.p)}: pullbacks often reach that level, which takes you out before the move. Just ${up ? "under" : "over"} it (about ${f(own.p - d * 0.2 * A)}) is safer.`; }
  } else if (sATR < 0.6) { sg = 0; st = `Only ${sATR.toFixed(1)} ATR away: inside normal noise (an average candle here is 1 ATR tall), so random wiggles can hit it.`; }
  else if (sATR > 2.5) { sg = 0.5; st = `${sATR.toFixed(1)} ATR away: very wide, so your position had to be small and the target far.`; }
  else { sg = 1; st = `${sATR.toFixed(1)} ATR away: enough room for normal noise.`; }
  if (P.widened) { sg = 0; st += ` You widened it during the trade: the one thing a stop must never do.`; }
  if (["stop", "gapstop"].includes(P.exit.why) && isFinite(tgt0)) { // did price go on to the target after stopping you?
    for (let i = P.exit.i + 1, n = 0; i < Sr.n && n < 40; i++, n++) { if ((up ? Sr.h[i] >= tgt0 : Sr.l[i] <= tgt0)) { st += ` After stopping you out, price went on to hit your target ${n + 1} candle${n ? "s" : ""} later${sg === 1 ? ": bad luck, not a bad stop" : ": the stop was too close"}.`; break; } if ((up ? Sr.l[i] <= stop0 - sd : Sr.h[i] >= stop0 + sd)) { st += " Price kept going against you afterwards, so the stop did its job."; break; } }
  }
  // 3. the take profit
  const tR = (tgt0 - e) * d / sd; let tg = null, tt = null;
  if (isFinite(tR) && tR < 40) {
    const lvR = opp ? (opp.p - e) * d / sd : null;
    if (lvR != null && lvR > 0.2 && tR > lvR + 0.15) { tg = 0.5; tt = `${Rf(tR)} sat beyond the ${oppN} at ${f(opp.p)} (${Rf(lvR)}): price often stalls there, so a target just before it fills more often.`; }
    else if (tR < 1) { tg = 0; tt = `${Rf(tR)} is less than you risked: you'd need to win more than ${Math.round(100 / (1 + tR))}% of trades just to break even.`; }
    else { tg = 1; tt = `${Rf(tR)} for 1R of risk${lvR != null && lvR > tR ? `, before the ${oppN} at ${f(opp.p)}` : ""}: you only need to win ${Math.round(100 / (1 + tR))}% of these to break even.`; }
    if (["target", "gaptarget"].includes(P.exit.why)) { let best = tR; for (let i = P.exit.i + 1, n = 0; i < Sr.n && n < 20; i++, n++) { best = Math.max(best, ((up ? Sr.h[i] : Sr.l[i]) - e) * d / sd); if ((up ? Sr.l[i] <= e : Sr.h[i] >= e)) break; }
      tt += best > tR + 1 ? ` Price kept going to ${Rf(best)}: leaving part of the position on (or trailing the stop) could have caught more.` : " Price stalled after that: well judged."; }
    else if (P.R <= 0 && P.mfe / sd >= 0.8) tt += ` Price reached ${Rf(P.mfe / sd)} first, then turned: moving the stop to breakeven at +1R, or a closer target, would have saved this one.`;
  }
  const proc = tg == null ? 0.6 * eg + 0.4 * sg : 0.5 * eg + 0.25 * sg + 0.25 * tg, win = P.R > 0; // the idea matters most
  const verdict = proc >= 0.7 && eg >= 1 ? (win ? ["good", "✓ Good trade", "Good idea, sensible stop and target, and it paid. Repeat this."] : ["good", "✓ Good trade, unlucky result", "The process was right. Losses like this are part of any real edge: keep taking these."])
    : proc >= 0.45 ? (win ? ["part", "≈ OK trade, good result", "Some of it was right; tighten up the parts marked below."] : ["part", "≈ OK trade, losing result", "Part of the plan was sound; fix the parts marked below."])
    : (win ? ["bad", "⚠ Lucky win", "It made money, but the setup wasn't good. Don't let the result teach you the wrong lesson."] : ["bad", "✕ Poor trade", "The loss came from the plan, not bad luck. Here's what to change."]);
  const row = (g, lab, txt) => `<div class="rvrow"><span class="ic ${g >= 1 ? "g" : g > 0 ? "p" : "b"}">${g >= 1 ? "✓" : g > 0 ? "≈" : "✕"}</span><span><b>${lab}.</b> ${txt}</span></div>`;
  const html = `<div class="rv ${verdict[0]}"><div class="rvh"><b>${verdict[1]}</b><span>${verdict[2]}</span></div>${row(eg, "The idea", et)}${row(sg, "Stop loss", st)}${tg != null ? row(tg, "Take profit", tt) : ""}<p class="small" style="margin:6px 0 0">The ${up ? "support and resistance" : "resistance and support"} levels are marked on the chart.</p></div>`;
  return { html, marks, proc, verdict: verdict[1] };
}
const whenTxt = r => r && r.k ? `after ${r.k} ${G.tf === "1D" ? (r.k === 1 ? "day" : "days") : r.k === 1 ? "candle" : "candles"}` : "";
function mgmtNote(P) {
  if (!P || !P.exit) return ""; const plan = P.dir > 0 ? G.buy : G.sell; if (!plan) return "";
  const touched = P.exit.why === "manual" || P.moved || P.tmoved; if (!touched) return "";
  const diff = P.R - plan.R, sgn = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2) + "R";
  let msg = `${P.exit.why === "manual" ? "You closed early" : "You moved your levels"}: ${sgn(P.R)}. Leaving the original plan alone would have given ${sgn(plan.R)} (${exitLabel(plan).toLowerCase()}). `;
  msg += Math.abs(diff) < 0.1 ? "About the same." : diff > 0 ? `Your management <b>added ${diff.toFixed(2)}R</b>.` : `Your management <b>cost ${Math.abs(diff).toFixed(2)}R</b>.`;
  if (P.widened) msg += ` You widened your stop to ${P.widened.toFixed(1)}× the plan: even when it works, it builds the habit that blows accounts. Holding losers too long is one of the best-documented ways traders lose (<a href="${SRC.odean98.url}" target="_blank" rel="noopener">Odean 1998</a>).`;
  else if (P.be) msg += " Moving to breakeven protects capital, but done too early it turns winners into scratches.";
  return `<p class="mgmt ${diff >= 0 && !P.widened ? "good" : "bad"}">${msg}</p>`;
}
function renderRapidDone() {
  const P = G.pos, I = G.I, Sr = G.Sr, t = G.t, end = t + G.H, aev = acctCheck();
  RUN.n++; todayBump("rapid"); if (P) { RUN.R += P.R; RUN.net += P.net; if (P.R > 0) { RUN.wins++; RUN.streak++; RUN.best = Math.max(RUN.best, RUN.streak); } else { RUN.losses++; RUN.streak = 0; } }
  const RS = ST.rapid || (ST.rapid = { runs: 0, trades: 0, wins: 0, bestNet: null, bestStreak: 0 }); if (P) { RS.trades++; if (P.R > 0) RS.wins++; } RS.bestStreak = Math.max(RS.bestStreak, RUN.best);
  const over = RUN.n >= runLen(); if (over) { RS.runs++; if (RS.bestNet == null || RUN.net > RS.bestNet) { RS.bestNet = RUN.net; RUN.record = true; } } save();
  const move = (Sr.c[end] / Sr.c[t] - 1) * 100, b = G.buy, s = G.sell, win = P && P.R > 0;
  const res = P ? `<div class="rapidres ${win ? "win" : "loss"}"><span class="big num">${win ? "✓" : "✕"} ${fusd(P.net)}</span><span>${exitLabel(P.exit)} · ${(P.R >= 0 ? "+" : "−") + Math.abs(P.R).toFixed(2)}R</span></div>` : "";
  const summary = over ? `<div class="sec"><h3>Run complete</h3><div class="statgrid"><div><b class="num">${RUN.wins}/${RUN.wins + RUN.losses}</b>winners</div><div><b class="num">${RUN.wins + RUN.losses ? Math.round(RUN.wins / (RUN.wins + RUN.losses) * 100) : 0}%</b>win rate</div><div><b class="num ${toneOf(RUN.net)}">${fusd(RUN.net)}</b>run P&amp;L</div><div><b class="num ${toneOf(RUN.R)}">${(RUN.R >= 0 ? "+" : "") + RUN.R.toFixed(1)}R</b>total</div><div><b class="num">${RUN.best}</b>best streak</div><div><b class="num">${RS.bestNet == null ? "—" : fusd(RS.bestNet)}</b>best run ever</div></div>
    ${RUN.record ? `<p class="tip">🏆 New best run!</p>` : ""}<p class="small">At a 1.5R target you break even by winning 40% of trades; at 2R, 33%. Over ${runLen()} charts luck still matters a lot: judge yourself over several runs.</p></div>` : "";
  const RV = tradeReview(P); if (RV && RV.marks.length) { for (const m of RV.marks) G.overlays.push(m); chart.overlays = G.overlays; if (!chart.showMarks) { chart.showMarks = ST.marks = true; save(); renderTools(); } chart.req(); }
  pane().innerHTML = `${rapidHead(true)}${res}${copyHTML(G.copyRes)}${RV ? RV.html : ""}${mgmtNote(P)}
    ${G.ev ? `<div class="event"><span class="tag">Real event · ${fDay(G.ev.d)}</span><span class="ttl">${esc(G.ev.title)}</span><p>${esc(G.ev.story)}</p></div>` : ""}
    <p class="rapidwhat"><b>${G.tf === "1D" ? fDay(I.d[Sr.di[t]]) : `${fWall(G.tDec)} ${I.tz}`}</b>: over the next ${G.tf === "1D" ? `${G.H} days` : `${G.H} × ${G.tf} candles`} ${esc(I.short)} went from ${fp(I, Sr.c[t])} to ${fp(I, Sr.c[end])} (${fpct(move)}). Buying: ${exitLabel(b)} ${whenTxt(b)}, ${(b.R >= 0 ? "+" : "") + b.R.toFixed(1)}R. Selling: ${exitLabel(s)} ${whenTxt(s)}, ${(s.R >= 0 ? "+" : "") + s.R.toFixed(1)}R.</p>
    ${aev ? acctEventHTML(aev) : ""}${summary}${acctCardHTML(P ? P.net : 0)}
    <div class="stick">${aev && aev.kind !== "payout" ? `<button class="btn pri" id="acctgo" style="width:100%">${aev.kind === "breach" ? `Start a new ${AC().name} evaluation →` : "Get funded →"}</button>`
      : `<div class="row">${aev ? `<button class="btn" id="acctgo">Take payout ${fbal(aev.amount)}</button>` : `<button class="btn" id="rauto">${RUN.auto && !over ? "⏸ Pause auto-next" : "▶ Turn on auto-next"}</button>`}<button class="btn pri" id="next">${over ? "⚡ New run" : "Next chart ⚡"}</button></div>${RUN.auto && !over && !aev ? `<div class="rcount"><i></i></div>` : ""}`}</div>`;
  const go = () => { clearTimeout(RAPID_T); if (over) newRun(); newRound(); $("#panel").scrollTop = 0; };
  const nx = $("#next"); if (nx) nx.onclick = go;
  const ag = $("#acctgo"); if (ag) ag.onclick = () => { clearTimeout(RAPID_T); acctAct(aev.kind); if (over) newRun(); newRound(); };
  const ra = $("#rauto"); if (ra) ra.onclick = () => { RUN.auto = ST.rauto = !RUN.auto; save(); clearTimeout(RAPID_T); ra.textContent = RUN.auto ? "⏸ Pause auto-next" : "▶ Turn on auto-next"; const c = $(".rcount"); if (c) c.remove(); };
  clearTimeout(RAPID_T);
  if (RUN.auto && !over && !aev) RAPID_T = setTimeout(function tick() { if (!G || !G.rapid || G.phase !== "done") return; if ((typeof CO !== "undefined" && CO.open) || $("#scrim").classList.contains("open")) { RAPID_T = setTimeout(tick, 800); return; } go(); }, 2600);
}
function fmtDur(m) { const d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60; return d ? `${d}d ${h}h` : h ? `${h}h${mm ? " " + mm + "m" : ""}` : `${mm}m`; }

/* ================= LIVE TRADE (tick by tick, you can manage it) ================= */
// Every future candle is replayed through the price path inside it, so fills happen at the exact moment price touches a level.
function tickPath(k) {
  if (!G.ticks) G.ticks = [];
  if (G.ticks[k]) return G.ticks[k];
  const Sr = G.Sr, i = G.t + k, I = G.I, o = Sr.o[i], h = Sr.h[i], l = Sr.l[i], c = Sr.c[i], tf = G.tf, off = Sr.adj ? Sr.adj[i] || 0 : 0;
  let pts = [];
  const push = x => { x -= off; if (!pts.length || pts[pts.length - 1] !== x) pts.push(x); };
  const pushBar = (bo, bh, bl, bc) => { const up = bc >= bo; push(bo); push(up ? bl : bh); push(up ? bh : bl); push(bc); };
  if (tf === "1m" || (!isIntra(tf) && tf !== "1D")) {
    const rnd = mulberry32(hash32(I.sym + "|tick|" + Sr.ts[i]));
    const walk = W => { W[0] = 0; for (let q = 1; q < W.length; q++) W[q] = W[q - 1] + gauss(rnd); };
    pts = Array.from(bridge(rnd, o, h, l, c, 18, walk, I.tick, 8));
  } else {
    const di = Sr.di[i]; let P, r, grp;
    if (tf === "1D") { P = genDay(I, di); r = 5; grp = 12; }
    else if (TF[tf] <= 15) { P = genDay1m(I, di); r = 1; grp = 1; }
    else { P = genDay(I, di); r = 5; grp = TF[tf] >= 240 ? 3 : 1; }
    const k0 = Math.round((Sr.ts[i] - I.ss[di]) / r), k1 = Math.round((Sr.te[i] - I.ss[di]) / r);
    for (let q = k0; q < k1; q += grp) { let bh = -Infinity, bl = Infinity, bc = 0; const z1 = Math.min(k1, q + grp); for (let z = q; z < z1; z++) { bh = Math.max(bh, P.h[z]); bl = Math.min(bl, P.l[z]); bc = P.c[z]; } pushBar(P.o[q], bh, bl, bc); }
  }
  if (pts.length < 2) pts = [o, c]; pts[0] = o; pts[pts.length - 1] = c;
  pts = densify(pts, h, l, I.tick, mulberry32(hash32(I.sym + "|fine|" + Sr.ts[i])));
  G.ticks[k] = pts; return pts;
}
// Once you're in, a trade runs like a real one: until the stop or target is hit (or the data / contract runs out)
const EXT_DAYS = { "1m": 5, "5m": 10, "15m": 20, "1h": 45, "4h": 120, "1D": 400 }, EXT_CAP = { "1m": 4000, "5m": 2400, "15m": 1600, "1h": 900, "4h": 600, "1D": 400 };
function extendRound() {
  if (G.HX) return; G.HX = G.H; G.hxWhy = "time";
  try {
    const I = G.I, t = G.t, d0 = Math.max(0, dayAt(I, G.tDec)), cut = I.se[Math.min(I.n - 1, d0 + (EXT_DAYS[G.tf] || 10))];
    if (!(cut > G.tEnd)) { G.hxWhy = "dataend"; return; }
    const S = seriesFor(G.tf, cut); if (!S || S.ts[t] !== G.Sr.ts[t] || S.n <= G.Sr.n) return;
    for (let k = 1; k <= G.H; k++) if (S.c[t + k] !== G.Sr.c[t + k]) return; // the candles you were shown must not change
    // join futures contracts at each roll (a continuous, back-adjusted chart) so a trade can run straight through it
    const adj = new Array(S.n).fill(0); let off = 0;
    for (let i = t + 1; i < S.n; i++) { if (S.brk[i] && i > t + G.H) off += S.o[i] - S.c[i - 1]; adj[i] = off; }
    if (off !== 0 || adj.some(x => x)) { for (let i = t + 1; i < S.n; i++) if (adj[i]) { S.o[i] -= adj[i]; S.h[i] -= adj[i]; S.l[i] -= adj[i]; S.c[i] -= adj[i]; } S.adj = adj; indicators(S); }
    const end = S.n - 1 - t, K = Math.max(G.H, Math.min(EXT_CAP[G.tf] || 400, end));
    G.Sr = S; G.HX = K; G.hxWhy = K === end ? "dataend" : "time"; G.ticks = []; G.allTs = {};
  } catch (e) { console.error("extend", e); }
}
// Turn a candle's few anchor points (open, sub-bar highs and lows, close) into ~80 natural-looking ticks.
// Time is shared out by distance travelled, so price moves at an even pace instead of jumping, and each
// leg wiggles a little (a Brownian bridge) while staying inside the candle's real high and low.
const TICKS_PER_CANDLE = 80;
function densify(a, H, L, tick, rnd, NT) {
  if (a.length < 2 || H <= L) return a; const TPC = NT || TICKS_PER_CANDLE;
  const legs = []; let tot = 0; for (let q = 1; q < a.length; q++) { const d = Math.abs(a[q] - a[q - 1]); legs.push(d); tot += d; }
  if (tot <= 0) return a;
  const out = [a[0]], room = Math.max(0, TPC - legs.length);
  for (let q = 0; q < legs.length; q++) {
    const x0 = a[q], x1 = a[q + 1], m = 1 + Math.round(room * (0.25 / legs.length + 0.75 * legs[q] / tot)), amp = Math.max(tick, legs[q] * 0.1);
    let w = 0; const W = [0]; for (let z = 1; z <= m; z++) { w += gauss(rnd); W.push(w); }
    for (let z = 1; z < m; z++) { const u = z / m, br = (W[z] - u * W[m]) / Math.sqrt(m) * amp; out.push(Math.min(H, Math.max(L, Math.round((x0 + (x1 - x0) * u + br) / tick) * tick))); }
    out.push(x1);
  }
  return out;
}
// Same engine for the "what if" comparisons, so every outcome uses identical rules
function simTicks(dir, stopATR, tgtR, A0, rule) {
  const Sr = G.Sr, t = G.t, A = A0 || Sr.atr[t], e = Sr.c[t], sd = stopATR * A, stop = e - dir * sd, tgt = e + dir * tgtR * sd, HH = G.HX || G.H;
  const res = (k, j, px, why) => ({ i: t + k, k, j, px, why, both: false, stop, tgt, e, sd, R: (px - e) * dir / sd });
  for (let k = 1; k <= HH; k++) {
    const pts = tickPath(k), o = pts[0];
    if (dir > 0 ? o <= stop : o >= stop) return res(k, 0, o, "gapstop");
    if (dir > 0 ? o >= tgt : o <= tgt) return res(k, 0, o, "gaptarget");
    for (let j = 1; j < pts.length; j++) { const x = pts[j]; if (dir > 0 ? x <= stop : x >= stop) return res(k, j, stop, "stop"); if (dir > 0 ? x >= tgt : x <= tgt) return res(k, j, tgt, "target"); }
    if (rule && k < HH && rule(t + k)) return res(k, pts.length - 1, Sr.c[t + k], "rule");
  }
  return res(HH, -1, Sr.c[t + HH], G.HX ? G.hxWhy : "time");
}
function decide(dir) {
  if (G.dir !== null) return; G.dir = dir;
  stopTimer(); extendRound();
  const Sr = G.Sr, t = G.t, n = ticketNumbers(), p = G.plan;
  if (G.pbm) {
    const pl = planFor(dir || G.pb.ev.d), pb = planFor(1), ps = planFor(-1); Object.assign(n, ticketNumbers(pl.sd)); p.tgt = pl.rr;
    G.buy = simTicks(1, pb.sd / n.A, pb.rr, n.A); G.sell = simTicks(-1, ps.sd / n.A, ps.rr, n.A);
  } else if (G.sm) {
    const pl = stratPlan(dir || G.strat.d || 1), pb = stratPlan(1), ps = stratPlan(-1); Object.assign(n, ticketNumbers(pl.sd)); p.tgt = pl.rr || 1e6; G.splan = pl;
    G.buy = simTicks(1, pb.sd / n.A, pb.rr || 1e6, n.A, pb.rule); G.sell = simTicks(-1, ps.sd / n.A, ps.rr || 1e6, n.A, ps.rule);
  } else { G.buy = simTicks(1, p.stop, p.tgt, n.A); G.sell = simTicks(-1, p.stop, p.tgt, n.A); }
  G.riskUSD = n.risk;
  if (dir && G.HX > G.H) { G.H = G.HX; G.tEnd = G.Sr.te[G.t + G.H]; G.allTs = {}; } // in a trade: play until it resolves
  if (dir) {
    G.pos = { dir, e: n.e, sd: n.sd, stop: n.e - dir * n.sd, tgt: n.e + dir * p.tgt * n.sd, stop0: n.e - dir * n.sd, tgt0: n.e + dir * p.tgt * n.sd, mae: 0, mfe: 0, risk: n.risk, qty: n.qty, fees: n.fees, open: true, be: false, exit: null, R: 0, rule: G.sm ? G.splan.rule : null };
    G.pos.liq = liqPrice(G.pos, n.I); { const f = fitStop(G.pos, n.I, G.pos.stop); if (f !== G.pos.stop) { G.pos.stop = f; G.pos.moved = true; G.pos.fitted = true; setTimeout(() => toast(`Stop pulled in to ${fnum(n.I, f)} so it sits inside your account's loss limit`), 400); } }
    chart.position = { e: n.e, stop: G.pos.stop, tgt: isFinite(G.pos.tgt) && Math.abs(G.pos.tgt - n.e) < 50 * n.sd ? G.pos.tgt : null, t0: G.tDec, t1: G.tEnd, liq: G.pos.liq };
    chart.markers = [{ kind: dir > 0 ? "buy" : "sell", t: Sr.ts[t], p: dir > 0 ? Sr.l[t] : Sr.h[t] }];
    toast(`Filled: ${dir > 0 ? "BUY" : "SELL"} ${sizeText(G.I, n.qty)} @ ${fnum(G.I, n.e)}`);
  } else { G.pos = null; chart.position = null; chart.markers = []; }
  chart.select(null); chart.setMode("cursor"); renderTools();
  Object.assign(G, { phase: "play", k: 1, j: 0, acc: 0, wait: G.rapid ? 200 : 700, started: false, lastNow: null, paused: false, hold: false, waitStart: false, speed: G.rapid ? (ST.rspeed || 1) : ST.pspeed || 1, skip: reduceMotion, px: n.e, prevPx: n.e, dispPx: null, lastShown: null, base: null, follow: true, fr: 0 });
  { const g = chart.geo(), x = chart.tx(G.tDec, g); if (x < g.L + 20 || x > g.R - chart.sp * 4) chart.toLatest(); }
  if (G.pos && ST.rwait !== false && !reduceMotion) { G.paused = true; G.waitStart = true; }
  setPanelMin(false); renderPlay(); $("#panel").scrollTop = 0; renderLiveBtn(); cancelAnimationFrame(G.raf); G.raf = requestAnimationFrame(frame);
}
function msPerBar() { return ({ "1m": 3600, "5m": 3900, "15m": 4200, "1h": 4200, "4h": 4400, "1D": 4600 }[G.tf] || 4000) / G.speed; }
function frame(now) {
  try { frameBody(now); } catch (e) { console.error("playback", e); if (G && G.phase === "play") G.raf = requestAnimationFrame(frame); } // an error must never freeze the chart
}
function frameBody(now) {
  if (!G || G.phase !== "play") return;
  const g = G; if (G.lastNow == null) G.lastNow = now;
  const dt = Math.min(250, now - G.lastNow); G.lastNow = now;
  if (!G.paused && !G.hold) {
    if (G.wait > 0 && !G.skip) G.wait -= dt;
    else {
      if (!G.started) { G.started = true; onTick(true); showLive(); }
      if (G.skip) { while (G.phase === "play" && !G.paused) advanceTick(); G.fr = null; if (G.phase === "play") showLive(); }
      else {
        G.acc += dt;
        while (G.phase === "play" && !G.paused) { const n = tickPath(G.k).length, mpt = msPerBar() / Math.max(1, n - 1); if (G.acc < mpt) break; G.acc -= mpt; advanceTick(); }
        // smooth motion between ticks; a level crossed mid-segment fills immediately at that level
        if (G.phase === "play" && !G.paused) {
          const pts = tickPath(G.k), n = pts.length, mpt = msPerBar() / Math.max(1, n - 1), f = clamp(G.acc / mpt, 0, 1);
          let xi = G.j < n - 1 ? pts[G.j] + (pts[G.j + 1] - pts[G.j]) * f : pts[G.j]; const P = G.pos;
          if (P && P.open && G.j < n - 1 && (P.dir > 0 ? (xi <= P.stop || xi >= P.tgt) : (xi >= P.stop || xi <= P.tgt))) { G.acc = 0; advanceTick(); xi = null; }
          G.fr = (G.j + (xi == null ? 0 : f)) / Math.max(1, n - 1);
          if (G.phase === "play" && now - (G.lastDraw || 0) >= 15) { G.lastDraw = now; showLive(xi); }
        }
      }
    }
  }
  if (G === g && G.phase === "play") G.raf = requestAnimationFrame(frame);
}
function advanceTick() {
  const pts = tickPath(G.k); G.fr = null;
  if (G.j >= pts.length - 1) {
    const P = G.pos; if (P && P.open && P.rule && G.k < G.H && P.rule(G.t + G.k)) exitPos(G.t + G.k, G.Sr.c[G.t + G.k], "rule");
    if (G.k >= G.H) { finish(); return; } G.k++; G.j = 0; G.base = null; onTick(true); return; }
  G.j++; onTick(false);
}
function onTick(open) {
  const pts = tickPath(G.k), x = pts[G.j], i = G.t + G.k, P = G.pos; G.prevPx = G.px; G.px = x;
  if (P && P.open) {
    const d = P.dir, ex = (x - P.e) * d; if (!(P.mae <= ex)) P.mae = Math.min(P.mae == null ? 0 : P.mae, ex); if (!(P.mfe >= ex)) P.mfe = Math.max(P.mfe == null ? 0 : P.mfe, ex);
    if (open && (d > 0 ? x <= P.stop : x >= P.stop)) exitPos(i, x, "gapstop");
    else if (open && (d > 0 ? x >= P.tgt : x <= P.tgt)) exitPos(i, x, "gaptarget");
    else if (d > 0 ? x <= P.stop : x >= P.stop) exitPos(i, P.stop, "stop");
    else if (d > 0 ? x >= P.tgt : x <= P.tgt) exitPos(i, P.tgt, "target");
    if (P.open && ST.bal + (x - P.e) * d * P.qty * G.I.pv - P.fees <= ST.acct.floor) { exitPos(i, x, "mll"); toast("Closed by the prop firm at your account's loss limit: the stop was further away than the room you had left."); }
    if (P.open && G.pbm && STAGES[G.pb.stage].mgmt && !P.be && !G.pb.mg && curR() >= 1) { G.pb.mg = { ok: false, k: G.k }; G.paused = true; showLive(); toast("Playbook: +1R reached. Move your stop to breakeven."); renderPlay(); }
  }
  if (G.pbm && G.pb.mg && !G.pb.mg.ok && !G.pb.mg.done && G.k > G.pb.mg.k) G.pb.mg.done = true;
}
function showLive(xi) {
  const Sr = G.Sr, i = G.t + G.k, pts = tickPath(G.k), sub = pts.slice(0, G.j + 1); if (xi != null) sub.push(xi);
  const x = sub[sub.length - 1], frac = pts.length > 1 ? Math.min(1, (G.j + (xi != null ? 0.5 : 0)) / (pts.length - 1)) : 1;
  G.dispPx = x;
  if (G.view === G.tf) {
    if (!G.base || G.baseK !== G.k) { let B = seriesFor(G.view, Sr.ts[i]); if (Sr.adj && Sr.adj[i - 1]) B = adjBase(B, Sr.adj); G.base = B; G.baseK = G.k; }
    const Bs = G.base, S = { I: Bs.I, tf: Bs.tf, ts: Bs.ts.concat(Sr.ts[i]), te: Bs.te.concat(Sr.te[i]), o: Bs.o.concat(sub[0]), h: Bs.h.concat(Math.max(...sub)), l: Bs.l.concat(Math.min(...sub)), c: Bs.c.concat(x), v: Bs.v.concat(Sr.v[i] == null ? null : Sr.v[i] * frac), di: Bs.di.concat(Sr.di[i]), brk: Bs.brk.concat(Sr.brk[i]), ds: Bs.ds.concat(Sr.ds[i]), n: Bs.n + 1, partial: true };
    indicatorsTail(S, Bs); G.cut = Sr.ts[i];
    chart.future = { t0: Sr.te[i], t1: G.tEnd }; chart.decisionT = G.tDec; chart.overlays = G.overlays;
    chart.setSeries(S, allTsFor(G.view), true); if (G.tfDrawnK !== G.k) { G.tfDrawnK = G.k; renderTF(); } textTick(updateLegend);
  } else { G.cut = Sr.ts[i]; refresh(true); }
  if (G.follow && !chart.busy()) { const want = chart.tIdx(liveT()) + 3; if (want > chart.right) { chart.right = want; chart.clampRight(); } }
  chart.req(); textTick(updateLive, "live");
}
// after a contract roll the past candles are shifted by the same amount as the trade's continuous series
function adjBase(B, adj) { const X = Object.assign({}, B, { o: B.o.slice(), h: B.h.slice(), l: B.l.slice(), c: B.c.slice() }); for (let j = 0; j < X.n; j++) { const d = adj[j]; if (d) { X.o[j] -= d; X.h[j] -= d; X.l[j] -= d; X.c[j] -= d; } } indicators(X); return X; }
// the chart redraws every frame; text around it (legend, P&L, clock) only needs ~10 updates a second, which keeps phones smooth
const TXT_T = {};
function textTick(fn, key) { const k = key || fn.name, now = performance.now(); if (now - (TXT_T[k] || 0) < 90) { clearTimeout(TXT_T[k + "t"]); TXT_T[k + "t"] = setTimeout(() => { TXT_T[k] = performance.now(); fn(); }, 100); return; } TXT_T[k] = now; fn(); }
function liveT() { const Sr = G.Sr, i = G.t + G.k, n = tickPath(G.k).length, fr = clamp(G.fr != null ? G.fr : (n > 1 ? G.j / (n - 1) : 1), 0, 1); return Sr.ts[i] + (Sr.te[i] - Sr.ts[i]) * fr; }
function liveOnScreen() { const g = chart.geo(), x = chart.tx(liveT(), g); return x >= g.L + 4 && x <= g.R + chart.sp * 0.5; }
function renderLiveBtn() { const b = $("#liveb"); if (b) b.hidden = !(G && G.phase === "play" && !G.follow); }
chart.onNav = () => { if (G && G.phase === "play") { G.follow = liveOnScreen(); renderLiveBtn(); }
  if (G && G.replay && chart.S) { const g = chart.geo(), x = chart.x(chart.S.n - 1, g); RP.follow = x >= g.L && x <= g.R; } };
function exitPos(i, px, why, both) {
  const P = G.pos; if (!P || !P.open) return;
  const n = tickPath(i - G.t).length, at = G.Sr.ts[i] + (G.Sr.te[i] - G.Sr.ts[i]) * (n > 1 ? Math.min(1, G.j / (n - 1)) : 1);
  P.open = false; P.R = (px - P.e) * P.dir / P.sd; P.exit = { i, k: i - G.t, px, why, both: !!both, be: P.be, at }; P.gross = P.R * P.risk; P.net = P.gross - P.fees;
  { const keep = Math.min(G.H, Math.max(G.k, P.exit.k) + (G.rapid ? 1 : 3)); if (keep < G.H) { G.H = keep; G.tEnd = G.Sr.te[G.t + G.H]; G.allTs = {}; } } // a few candles after the exit, then the round ends
  ST.fees += P.fees; bank(P.net, "trade"); G.copyRes = copyTrade(P, G.I);
  chart.markers.push({ kind: "exit", t: G.Sr.ts[i], p: px, win: P.R > 0, from: { t: G.Sr.ts[G.t], p: P.e } }); chart.position.t1 = G.Sr.te[i]; chart.req();
  toast(`${exitLabel(P.exit)} at ${fnum(G.I, px)} · ${fusd(P.net)}`);
  if (G.phase === "play") renderPlay();
}
function curR(disp) { const P = G.pos; if (!P) return 0; if (!P.open) return P.R; return ((disp && G.dispPx != null ? G.dispPx : G.px) - P.e) * P.dir / P.sd; }
function togglePause() { G.paused = !G.paused; G.waitStart = false; G.lastNow = null; renderPlay(); syncFab(); }
function syncFab() {
  const b = $("#pfab"); if (!b) return;
  if (G && G.replay) { const wait = RP.pos && RP.pos.open && RP.waitStart && !RP.playing; b.hidden = false; b.className = "pfab" + (RP.playing ? " pause" : wait ? " go" : ""); b.innerHTML = RP.playing ? "⏸" : wait ? "▶ Start" : "▶"; b.setAttribute("aria-label", RP.playing ? "Pause the replay" : "Play the replay"); return; }
  if (G && G.phase === "play") { const wait = G.waitStart && G.paused; b.hidden = false; b.className = "pfab" + (!G.paused ? " pause" : wait ? " go" : ""); b.innerHTML = !G.paused ? "⏸" : wait ? "▶ Start" : "▶"; b.setAttribute("aria-label", G.paused ? "Play" : "Pause"); return; }
  b.hidden = true;
}
$("#pfab").onclick = () => { if (G && G.replay) rpToggle(); else if (G && G.phase === "play") togglePause(); };
/* ---- managing the live trade: move the stop or target by dragging the lines, the buttons, or close it ---- */
function setLevel(which, price, done) {
  if (G && G.replay) return rpSetLevel(which, price, done);
  const P = G && G.pos; if (!P || !P.open || G.phase !== "play") return null;
  const I = G.I, dp = G.dispPx != null ? G.dispPx : G.px, lo = Math.min(dp, G.px), hi = Math.max(dp, G.px), gap = Math.max(I.tick * 2, G.Sv.atr[G.t] * 0.05), d = P.dir;
  let v = Math.round(price / I.tick) * I.tick;
  // a stop must stay on the losing side of price and a target on the winning side (checked against both the last tick and the drawn price)
  let atLimit = false;
  if (which === "stop") { v = fitStop(P, I, v); atLimit = P.liq != null && v === fitStop(P, I, d > 0 ? -1e12 : 1e12); v = d > 0 ? Math.min(v, Math.floor((lo - gap) / I.tick) * I.tick) : Math.max(v, Math.ceil((hi + gap) / I.tick) * I.tick); }
  else v = d > 0 ? Math.max(v, Math.ceil((hi + gap) / I.tick) * I.tick) : Math.min(v, Math.floor((lo - gap) / I.tick) * I.tick);
  if (which === "stop") { P.stop = v; P.be = Math.abs(v - P.e) < I.tick / 2; P.moved = true; chart.position.stop = v; }
  else { P.tgt = v; P.tmoved = true; chart.position.tgt = v; }
  if (done) {
    if (which === "stop") { const risk = (P.e - v) * d * P.qty * I.pv + P.fees, x = (P.e - v) * d / P.sd;
      if (risk <= P.fees + 0.01) toast(`Stop moved to ${fnum(I, v)}: profit locked in (${fusd((v - P.e) * d * P.qty * I.pv - P.fees)} if hit)`);
      else if (atLimit) { P.widened = Math.max(P.widened || 1, x); toast(`Stop can't go past your account's loss limit (${fnum(I, P.liq)}): the prop firm would close you there first. Set just inside it at ${fnum(I, v)}.`); }
      else if (x > 1.05) { P.widened = Math.max(P.widened || 1, x); toast(`⚠ Stop widened to ${fnum(I, v)}: you now risk ${fbal(risk)}, ${x.toFixed(1)}× your plan. Moving a stop further away is how most accounts blow up.`); }
      else toast(`Stop moved to ${fnum(I, v)}: you now risk ${fbal(risk)}`); }
    else { const gain = (v - P.e) * d * P.qty * I.pv - P.fees; toast(`Target moved to ${fnum(I, v)}: ${fusd(gain)} if hit`); }
    renderPlay(); }
  else { const el = $(which === "stop" ? "#stoppx" : "#tgtpx"); if (el) el.textContent = fp(I, v); }
  chart.req(); return v;
}
chart.onPosEdit = (which, price, done) => setLevel(which === "tgt" ? "tgt" : "stop", price, done);
chart.onPosGrab = on => { if (G) G.hold = !!on; }; // the candles wait while your finger is on a line
function nudge(which, k) { const P = G.pos, A = G.Sv.atr[G.t]; if (!P || !P.open) return; const cur = which === "stop" ? P.stop : tgtOK(P) ? P.tgt : P.e + P.dir * 2 * P.sd; setLevel(which, cur + k * P.dir * 0.25 * A, true); }
function renderPlay() { setTimeout(syncFab, 0);
  const I = G.I, P = G.pos, live = P && P.open;
  chart.posEdit = !!live;
  const head = G.rapid ? rapidHead(false) : headHTML();
  const manage = live ? `<div class="mgr">
      <div class="row act"><button class="btn danger" id="close">✕ Close ${fnum(I, G.dispPx != null ? G.dispPx : G.px)}</button><button class="btn okb" id="be">🔒 Breakeven</button></div>
      <div class="lvls"><div class="lv"><span>Stop <b class="neg" id="stoppx">${fp(I, P.stop)}</b></span><span class="nb"><button class="btn" data-n="stop" data-k="1" aria-label="Tighten the stop">Tighter</button><button class="btn" data-n="stop" data-k="-1" aria-label="Loosen the stop">Wider</button></span></div>
        <div class="lv"><span>${tgtOK(P) ? `Target <b class="pos" id="tgtpx">${fp(I, P.tgt)}</b>` : `Exit <b class="pos">${esc(G.splan ? G.splan.exitTxt : "by rule")}</b>`}</span><span class="nb">${tgtOK(P) ? `<button class="btn" data-n="tgt" data-k="-1" aria-label="Bring the target closer">Closer</button><button class="btn" data-n="tgt" data-k="1" aria-label="Move the target further">Further</button>` : `<button class="btn" data-n="tgt" data-k="0">+ Add a target</button>`}</span></div></div>
      <p class="small hint">Or drag the red stop line${tgtOK(P) ? " and green target line" : ""} on the chart.</p></div>` : "";
  const ctr = `<div class="ctrls"><button class="btn${G.waitStart ? " pri" : ""}" id="pp">${G.waitStart ? "▶ Start the candles" : G.paused ? "▶ Resume" : "⏸ Pause"}</button><div class="seg" role="group" aria-label="Playback speed">${[0.5, 1, 2, 4, 8].map(s => `<button data-s="${s}" aria-pressed="${G.speed === s}">${s}×</button>`).join("")}</div><button class="btn ghost" id="ff">${P && P.open ? "Skip to the result ▸▸" : "Skip ▸▸"}</button></div>`;
  pane().innerHTML = `${head}<div class="q posbox"><span class="qk">${P ? (P.open ? "Open position · live" : "Position closed") : "No position · watching live"}</span>
    <div class="live"><div class="side">${P ? `<b>${P.dir > 0 ? "LONG" : "SHORT"}</b> ${sizeText(I, P.qty)} @ <b>${fp(I, P.e)}</b>` : "You stayed out."}<div id="status" class="small"></div></div><div class="pnl num flat" id="pnl">${P ? "$0" : "—"}</div></div>
    ${G.waitStart && live ? `<div class="waitme">⏸ <span><b>You're in. Set your stop loss now.</b> Drag the red line (or its price tag on the right), or use the buttons. Then press <b>▶ Start the candles</b>.</span></div>` : ""}
    ${manage}
    ${G.pbm && G.pb.mg && !G.pb.mg.ok && !G.pb.mg.done && live ? `<div class="fb part"><div class="fbh"><span class="verd">Playbook: +1R reached</span></div><p>The plan says move your stop to breakeven now. Tap <b>🔒 Breakeven</b>, or resume to ignore the rule.</p></div>` : ""}
    ${P && !P.open ? `<div class="fb ${P.net > 0 ? "good" : "bad"}"><div class="fbh"><span class="verd">${exitLabel(P.exit)} at ${fp(I, P.exit.px)}</span><span class="mchip ${toneOf(P.net)}">${fusd(P.net)}</span></div><p class="small" style="margin:0">${isIntra(G.tf) ? `Filled at ${fWallS(P.exit.at)}. ` : ""}Watching how the rest of the window played out…</p></div>` : ""}
    <div class="prog"><i id="pbar"></i></div>${ctr}
    <div class="ticket"><div>Last<b id="lastpx" class="num">${fp(I, G.px)}</b></div>${P ? `<div>To stop<b id="tostop">—</b></div>${tgtOK(P) ? `<div>To target<b id="totgt">—</b></div>` : ""}<div>Open R<b id="rr">0.00R</b></div>` : `<div>Move since entry<b id="mv">0</b></div><div>Candle<b id="cnum">1</b></div>`}</div></div>`;
  $("#pp").onclick = togglePause;
  $$(".seg button").forEach(b => b.onclick = () => { G.speed = +b.dataset.s; if (G.rapid) ST.rspeed = G.speed; else ST.pspeed = G.speed; save(); renderPlay(); });
  const be = $("#be"); if (be) be.onclick = () => { if (curR(true) < 0.1) { toast("Breakeven needs the trade in profit first: the stop must stay on the losing side of price"); return; } setLevel("stop", P.e, false); P.be = true; if (G.pbm && G.pb.mg && !G.pb.mg.done) G.pb.mg.ok = true; toast("Stop moved to breakeven: this trade can no longer lose (except fees)"); if (G.paused && G.pbm && G.pb.mg) G.paused = false; renderPlay(); };
  const cl = $("#close"); if (cl) cl.onclick = () => { exitPos(G.t + G.k, G.dispPx != null ? G.dispPx : G.px, "manual"); };
  $$("[data-n]").forEach(b => b.onclick = () => { const k = +b.dataset.k; if (b.dataset.n === "tgt" && k === 0) { setLevel("tgt", P.e + P.dir * 2 * P.sd, true); return; } nudge(b.dataset.n, k); });
  $("#ff").onclick = () => { G.skip = true; G.paused = false; };
  updateLive(); renderMini();
}
function updateLive() {
  const P = G.pos, I = G.I, st = $("#status"), pn = $("#pnl"), pb = $("#pbar"), n = tickPath(G.k).length, frac = n > 1 ? G.j / (n - 1) : 1;
  const running = P && P.open && G.HX > 0;
  if (st) st.textContent = running ? `Candle ${G.k} · runs until your stop or target · ${G.speed}×${G.paused ? " · paused" : ""}` : `Candle ${G.k} of ${G.H} · ${Math.round(frac * 100)}% formed${G.paused ? " · paused" : ""}`;
  if (pb) { pb.parentElement.style.visibility = running ? "hidden" : ""; pb.style.width = ((G.k - 1 + frac) / G.H * 100) + "%"; }
  const px = G.dispPx != null ? G.dispPx : G.px;
  const lp = $("#lastpx"); if (lp) { lp.textContent = fp(I, px); lp.className = "num " + (px > (G.lastShown ?? px) ? "pos" : px < (G.lastShown ?? px) ? "neg" : (lp.className.replace("num ", ""))); } G.lastShown = px;
  const mv = $("#mv"); if (mv) { const d = px - G.Sr.c[G.t]; mv.textContent = (d >= 0 ? "+" : "−") + fnum(I, Math.abs(d)); mv.className = toneOf(d); }
  const cn = $("#cnum"); if (cn) cn.textContent = `${G.k} / ${G.H}`;
  if (!P) return; const R = curR(true), v = P.open ? R * P.risk - P.fees : P.net;
  if (pn) { pn.textContent = fusd(v); pn.className = "pnl num " + (v > 0 ? "pos" : v < 0 ? "neg" : "flat"); }
  const rr = $("#rr"); if (rr) { rr.textContent = (R >= 0 ? "+" : "−") + Math.abs(R).toFixed(2) + "R"; rr.className = toneOf(R); }
  const ts = $("#tostop"), tt = $("#totgt"); if (ts && P.open) { ts.textContent = fnum(I, Math.abs(px - P.stop)); if (tt) tt.textContent = fnum(I, Math.abs(P.tgt - px)); const cb = $("#close"); if (cb) cb.textContent = `✕ Close ${fnum(I, px)}`; }
  const sp = $("#stoppx"); if (sp) sp.textContent = fp(I, P.stop);
  const be = $("#be"); if (be) be.disabled = !P.open || P.be || R < 0.5;
  const cl = $("#close"); if (cl) cl.textContent = `✕ Close ${fnum(I, px)}`;
}

/* ================= TRADE REPORT ================= */
function reviewDrawings() {
  const Sr = G.Sr, t = G.t, A = G.Sv.atr[t], I = G.I, out = [], fut = [];
  for (let k = 1; k <= G.H; k++) fut.push(t + k);
  for (const d of chart.drawings.slice(0, 8)) {
    let lineAt = null, name = "";
    if (d.type === "hline" || d.type === "hray") { const p = d.pts[0].p; lineAt = () => p; name = `Horizontal line at ${fp(I, p)}`; }
    else if (d.type === "trend" || d.type === "ray") { const i0 = rIdx(d.pts[0].t), i1 = rIdx(d.pts[1].t); if (Math.abs(i1 - i0) < 0.5) continue; if (d.type === "trend" && Math.max(i0, i1) < t + 1) { out.push(B("", "**Trend line:** it ends before the decision point, so it could not be tested. Use a ray, or stretch the line to the right.")); continue; } lineAt = i => d.pts[0].p + (d.pts[1].p - d.pts[0].p) * (i - i0) / (i1 - i0); name = d.type === "ray" ? "Ray" : "Trend line"; }
    else if (d.type === "rect") { const lo = Math.min(d.pts[0].p, d.pts[1].p), hi = Math.max(d.pts[0].p, d.pts[1].p); const k = fut.find(i => Sr.l[i] <= hi && Sr.h[i] >= lo); out.push(B(k ? "acc" : "", k ? `**Zone ${fp(I, lo)}–${fp(I, hi)}:** price entered it on candle ${k - t} and finished the window ${Sr.c[t + G.H] > hi ? "above it" : Sr.c[t + G.H] < lo ? "below it" : "inside it"}.` : `**Zone ${fp(I, lo)}–${fp(I, hi)}:** price never reached it.`)); continue; }
    else if (d.type === "fib") { const p0 = d.pts[0].p, p1 = d.pts[1].p, lv = FIBS.map(f => [f, p1 + (p0 - p1) * f]); let hit = null; for (const i of fut) { for (const [f, p] of lv) if (f > 0 && f < 1 && Sr.l[i] <= p + 0.15 * A && Sr.h[i] >= p - 0.15 * A) { hit = { i, f, p }; break; } if (hit) break; } out.push(B(hit ? "acc" : "", hit ? `**Fibonacci:** price reached the ${hit.f} level (${fp(I, hit.p)}) on candle ${hit.i - t}.` : "**Fibonacci:** price did not touch any level in the window.")); continue; }
    if (!lineAt) continue;
    const side = Sr.c[t] >= lineAt(t) ? 1 : -1; let touch = null, broke = null;
    for (const i of fut) { const v = lineAt(i); if (touch == null && Sr.l[i] <= v + 0.15 * A && Sr.h[i] >= v - 0.15 * A) touch = i; if (broke == null && (side > 0 ? Sr.c[i] < v - 0.5 * A : Sr.c[i] > v + 0.5 * A)) broke = i; }
    let txt;
    if (touch == null && broke == null) txt = `**${name}:** not reached in the next ${G.H} candles.`;
    else if (broke != null) txt = `**${name}:** broken on candle ${broke - t}, with a close clearly ${side > 0 ? "below" : "above"} it. A broken ${side > 0 ? "floor" : "ceiling"} often flips into the opposite role.`;
    else { let away = 0; for (const i of fut) if (i > touch) away = Math.max(away, side > 0 ? Sr.h[i] - lineAt(i) : lineAt(i) - Sr.l[i]); txt = `**${name}:** tested on candle ${touch - t} and held${away >= A ? `; price then moved ${(away / A).toFixed(1)}× ATR away` : ""}. It acted as ${side > 0 ? "support" : "resistance"}.`; }
    out.push(B(broke != null ? "down" : touch != null ? "up" : "", txt));
  }
  return out;
}
function pbLesson(r) {
  const P = G.pos;
  if (r.want && G.dir === r.want) return P && P.R > 0 ? "A valid setup, executed to plan, that paid. Do this a few hundred times and the results are your edge." : "A valid setup that lost. That's normal: no setup wins every time. What matters is that you took it at the planned size and stop, so losses stay small and wins can pay for them.";
  if (r.want && G.dir === 0) return r.hyp.R > 0 ? "You skipped a valid setup that would have paid. Missing trades is costly too: if all the rules are met, trust the process." : "You skipped a valid setup, and this time it would have lost. Still, the playbook only works if you take its setups consistently.";
  if (!r.want && G.dir === 0) return r.hyp.R < 0 ? "Not a playbook setup, and standing aside saved you a loss. Skipping is a skill." : "Not a playbook setup. It would have worked this time, but trades outside your rules can't be measured or improved.";
  return P && P.R > 0 ? "This trade broke the playbook and happened to win. Wins like this are dangerous: they teach you to ignore the rules." : "This trade broke the playbook and lost. Off-plan trades are where most accounts leak money.";
}
function autoLesson(bm, leanRight) {
  const a = G.an, P = G.pos;
  if (P && P.exit && P.exit.why === "gapstop") return "The market gapped past the stop, so the loss exceeded the plan. Gaps are why position size matters more than the stop itself.";
  if (P && P.exit && P.exit.why === "manual") return P.R > 0 ? "You banked profit by closing early. Check the scenario boxes: did holding to the plan pay more? Consistent rules usually beat gut exits." : "You cut the trade early. Closing a losing trade before the stop is fine when the reason for entering has gone; just make it a rule, not a feeling.";
  if (bm === 0) return "Price did not move far enough either way to pay. Sometimes the best trade is no trade.";
  if (Math.abs(a.st) > 2.5 && Math.sign(a.st) === -bm) return "Price was stretched far from its average and snapped back. Chasing stretched moves is risky.";
  if (a.lean !== "none" && leanRight) return a.tr.k === "up" || a.tr.k === "down" ? "The trend continued. Trading with the trend is the simplest edge on any chart." : "The textbook clues pointed the right way.";
  if (a.lean !== "none" && !leanRight) return "The textbook read failed this time. That happens often, which is why every trade needs a stop and a fixed risk.";
  if (a.tr.k === "side") return "In a sideways market direction is close to a coin flip. Trade the edges of the range or wait for a breakout.";
  return "Mixed signals make coin-flip trades. The clearer the chart, the better the odds.";
}
function sparkSVG(vals) {
  if (vals.length < 2) return `<p class="small" style="margin:0">Your equity curve appears after your first few rounds.</p>`;
  const w = 320, h = 64, lo = Math.min(...vals), hi = Math.max(...vals), r = hi - lo || 1, X = i => 4 + i / (vals.length - 1) * (w - 8), Y = v => h - 6 - (v - lo) / r * (h - 14);
  const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" "), up = vals[vals.length - 1] >= vals[0];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Account balance over the last ${vals.length} rounds, from ${fbal(vals[0])} to ${fbal(vals[vals.length - 1])}"><line x1="0" x2="${w}" y1="${Y(vals[0])}" y2="${Y(vals[0])}" stroke="${C.line2}" stroke-dasharray="3 4"/><polyline points="${pts}" fill="none" stroke="${up ? C.up : C.down}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><circle cx="${X(vals.length - 1)}" cy="${Y(vals[vals.length - 1])}" r="3.5" fill="${up ? C.up : C.down}"/></svg>`;
}
function finish() { setTimeout(syncFab, 0);
  clearTimeout(G.timer); cancelAnimationFrame(G.raf); G.base = null;
  const Sr = G.Sr, t = G.t, I = G.I, a = G.an, bm = bestMove(G.buy, G.sell), end = t + G.H, P = G.pos;
  if (P && P.open) exitPos(end, Sr.c[end], G.HX && G.H >= G.HX ? G.hxWhy : "time");
  const pbr = G.pbm ? pbFinish() : null; if (pbr) for (const m of pbMarks()) G.overlays.push(m);
  const sr = G.sm ? stratFinish() : null;
  G.phase = "done"; G.cut = G.tEnd; refresh(true); renderLiveBtn();
  ST.rounds++; ST.played.push([I.sym, G.tf, G.tf === "1D" ? t : Sr.di[t]]); if (ST.played.length > 300) ST.played.shift();
  if (G.ev) ST.evDone.push(I.sym + G.ev.d);
  if (P) { ST.trades++; ST.net += P.net; if (P.net > 0) ST.wins++; }
  const leanDir = sr ? sr.want : pbr ? pbr.want : a.lean === "buy" ? 1 : a.lean === "sell" ? -1 : 0, procGood = G.dir === leanDir;
  const proc = procGood ? 1 : leanDir === 0 ? 0.4 : G.dir === 0 ? 0.5 : 0;
  if (!pbr) recordSkill("trading", proc); ST.procN++; if (procGood) ST.procG++;
  ST.eq.push(Math.round(ST.bal)); if (ST.eq.length > 400) ST.eq.shift();
  const roundNet = G.money.reads + G.money.trade;
  ST.jr.unshift({ d: G.tf === "1D" ? I.d[Sr.di[t]] : fWallS(G.tDec), sym: I.sym, tf: G.tf, side: G.dir > 0 ? "Long" : G.dir < 0 ? "Short" : "Flat", R: P ? Math.round(P.R * 100) / 100 : 0, trade: P ? Math.round(P.net) : 0, reads: Math.round(G.money.reads), bal: Math.round(ST.bal), rk: P ? Math.round(P.risk * 100) / 100 : 0, mode: G.rapid ? "rapid" : G.sm ? "strat" : G.pbm ? "pb" : "quiz",
    mg: P && P.exit && (P.moved || P.tmoved || P.exit.why === "manual") ? Math.round((P.R - (P.dir > 0 ? G.buy : G.sell).R) * 100) / 100 : null, wd: P && P.widened ? 1 : 0, ex: P && P.exit ? P.exit.why : null }); if (ST.jr.length > 250) ST.jr.pop();
  save();
  const gain = (procGood ? 12 : 0) + (P && P.R > 0 ? Math.min(10, Math.round(P.R * 4)) : 0) + (G.dir === 0 && bm === 0 ? 4 : 0); if (gain) gainXP(gain);
  if (G.rapid) { renderRapidDone(); return; }
  let hiI = t + 1, loI = t + 1; for (let i = t + 1; i <= end; i++) { if (Sr.h[i] > Sr.h[hiI]) hiI = i; if (Sr.l[i] < Sr.l[loI]) loI = i; }
  const chg = (Sr.c[end] / Sr.c[t] - 1) * 100, dirWord = d => d > 0 ? "BUY" : d < 0 ? "SELL" : "STAY OUT";
  const cell = (lab, r, d) => `<div class="${bm === d ? "best" : ""}">${lab}<b class="${r == null ? "flat" : toneOf(r)}">${r == null ? "$0" : fusd(r * G.riskUSD)}</b>${bm === d ? "best move" : r == null ? "no trade" : (r >= 0 ? "+" : "−") + Math.abs(r).toFixed(1) + "R"}</div>`;
  const leanRight = leanDir === bm;
  const procTxt = sr ? (procGood ? "✓ Followed the strategy rules" : "✕ Broke the strategy rules") : pbr ? (procGood ? "✓ Followed the playbook" : "✕ Broke the playbook") : procGood ? (leanDir === 0 ? "✓ Disciplined: no edge, so you stayed out" : "✓ Followed the evidence") : leanDir === 0 ? "• No clear edge: a coin-flip trade" : G.dir === 0 ? "• Cautious: the chart had a lean" : "✕ Traded against the evidence";
  const recap = G.qs.map(q => { const ic = q.score >= 1 ? ["g", "✓"] : q.score > 0 ? ["p", "≈"] : ["b", "✕"]; return `<details><summary><span class="ic ${ic[0]}">${ic[1]}</span><span><b>${esc(q.tag)}</b> · ${esc(q.title)} <span class="${toneOf(q.cash || 0)}" style="white-space:nowrap">${q.cash ? fusd(q.cash) : ""}</span></span></summary><div>${q.explain(q.kind === "mc" ? q.chosen : q.res)}</div></details>`; }).join("");
  const dr = reviewDrawings(), o = ODDS, lr = o.lean[0] ? Math.round(o.lean[1] / o.lean[0] * 100) : 0, lavg = o.lean[0] ? o.lean[2] / o.lean[0] : 0;
  const T = TIERS[tierOf()], r = rankOf(ST.xp), nextTierXP = (() => { for (let i = 0; i < RANKS.length; i++) if (Math.floor(i / 2) > tierOf()) return RANKS[i][0]; return null; })();
  const balStart = ST.eq.length >= 2 ? ST.eq[ST.eq.length - 2] : ST.acct.start, aev = acctCheck();
  pane().innerHTML = `${headHTML(true)}
    <div class="res"><span class="small" style="text-transform:uppercase;letter-spacing:.09em;font-weight:800">Round result</span><span class="big num ${toneOf(roundNet)}">${fusd(roundNet)}</span>
      <span class="what">Analysis ${fusd(G.money.reads)} · Trade ${P ? fusd(P.net) : "$0 (stayed out)"}${P ? ` (after $${P.fees.toFixed(2)} fees)` : ""}</span></div>
    ${P ? `<div class="kpis"><div class="kpi"><span>Side</span><b class="${P.dir > 0 ? "pos" : "neg"}">${P.dir > 0 ? "Long" : "Short"}</b></div><div class="kpi"><span>Size</span><b>${sizeText(I, P.qty)}</b></div><div class="kpi"><span>Entry</span><b>${fp(I, P.e)}</b></div><div class="kpi"><span>Exit</span><b>${fp(I, P.exit.px)}</b></div><div class="kpi"><span>Result</span><b class="${toneOf(P.R)}">${(P.R >= 0 ? "+" : "−") + Math.abs(P.R).toFixed(2)}R</b></div><div class="kpi"><span>Exit reason</span><b>${exitLabel(P.exit)}</b></div><div class="kpi"><span>Held</span><b>${P.exit.k} candle${P.exit.k === 1 ? "" : "s"}${isIntra(G.tf) && P.exit.at ? ` · ${fmtDur(Math.max(1, Math.round(P.exit.at - G.tDec)))}` : ""}</b></div></div>` : ""}
    <div class="verdicts"><span class="vd ${procGood ? "good" : proc > 0 ? "neu" : "bad"}">${procTxt}</span><span class="vd ${G.dir === bm ? "good" : "neu"}">${G.dir === bm ? "✓ Best move in hindsight" : "Best move: " + dirWord(bm)}</span></div>
    ${copyHTML(G.copyRes)}${pbr ? pbReviewHTML() : ""}${sr ? stratReviewHTML(sr) : ""}
    <div class="sec"><h3>Same plan, three choices</h3><div class="compare">${cell("Sell", G.sell.R, -1)}${cell("Stay out", null, 0)}${cell("Buy", G.buy.R, 1)}</div><p class="small">Each box holds ${G.pbm ? "the playbook stop and target" : "the planned stop and target"} to the end, before fees, risking ${fbal(G.riskUSD)}.</p></div>
    ${G.ev ? `<div class="event"><span class="tag">Real event · what happened next</span><span class="ttl">${esc(G.ev.title)}</span><p>${esc(G.ev.story)}</p></div>` : ""}
    <div class="lesson"><b>Lesson:</b> ${esc(G.ev ? G.ev.lesson : sr ? stratLesson(sr) : pbr ? pbLesson(pbr) : autoLesson(bm, leanRight))}</div>
    <div class="sec"><h3>What the market did next</h3><p>Over the next ${G.H} ${G.tf === "1D" ? "days" : G.tf + " candles"}, price moved from <b>${fp(I, Sr.c[t])}</b> to <b>${fp(I, Sr.c[end])}</b> (${fpct(chg)}). The high was ${fp(I, Sr.h[hiI])} on candle ${hiI - t} and the low ${fp(I, Sr.l[loI])} on candle ${loI - t}.</p>
      ${isIntra(G.tf) ? `<p class="small">These ${G.tf} candles are simulated inside the real daily candles. Treat intraday outcomes as reading practice, not evidence.</p>` : ""}</div>
    ${pbr || sr ? "" : `<div class="sec"><h3>Analysis at the decision</h3>${atable(a.rows)}<p class="small">${a.lean === "none" ? (bm === 0 ? "No clear edge, and staying out was right." : `No clear edge; this time it moved ${bm > 0 ? "up" : "down"} anyway.`) : leanRight ? "The textbook lean worked this time." : "The textbook lean did not work this time."}</p></div>`}
    <div class="sec"><h3>${pbr ? "Your drill answers" : "Your answers"} · tap to review</h3><div class="recap">${recap}</div></div>
    <div class="sec"><h3>Your drawings vs what happened</h3>${dr.length ? bullets(dr) : `<p class="small">No drawings this round. Mark the levels you see before you trade and this section will grade them against what happened.</p>`}</div>
    ${aev ? acctEventHTML(aev) : ""}${acctCardHTML(ST.bal - balStart)}<p class="small" style="margin:6px 0 0">+${G.xp} XP this round</p>
    ${pbr || sr ? "" : `<div class="tierbox"><b>Tier ${tierOf() + 1} · ${T.name}</b><span class="small">${nextTierXP ? `${nextTierXP - ST.xp} XP to Tier ${tierOf() + 2}: ${esc(TIERS[tierOf() + 1].unlock)}` : "Top tier reached."}</span></div>`}

    ${pbr ? `<p class="odds">Scalping practice runs on 1–15 minute candles simulated inside real daily candles. They train the playbook process: reading, discipline and execution. They can't prove the strategy makes money. The next step for that is testing these exact rules on real intraday data and paper trading them.</p>` : `<p class="odds">Honest odds on ${o.n} real daily charts in this app (stop 1.5× ATR, target 2R): the textbook lean won ${lr}% of ${o.lean[0]} trades, averaging ${(lavg >= 0 ? "+" : "−") + Math.abs(lavg).toFixed(2)}R per trade. Buying every chart won ${Math.round(o.buy[1] / o.buy[0] * 100)}%; selling every chart won ${Math.round(o.sell[1] / o.sell[0] * 100)}%. A 2R target breaks even at 33%. Small sample of past data: no guarantee of future results.</p>`}
    <div class="stick">${aev && aev.kind === "payout" ? `<div class="row"><button class="btn" id="next">Keep trading →</button><button class="btn pri" id="acctgo">Take payout ${fbal(aev.amount)}</button></div>`
      : `<button class="btn pri" id="${aev ? "acctgo" : "next"}" style="width:100%">${aev && aev.kind === "breach" ? `Start a new ${AC().name} evaluation →` : aev && aev.kind === "pass" ? "Get funded →" : "Next chart →"}</button>`}</div>`;
  const nx = $("#next"); if (nx) nx.onclick = () => { newRound(); $("#panel").scrollTop = 0; };
  const ag = $("#acctgo"); if (ag) ag.onclick = () => { acctAct(aev.kind); newRound(); $("#panel").scrollTop = 0; };
  const ol = $("#openlib"); if (ol) ol.onclick = () => openStrats(G.strat && G.strat.key);
  $("#panel").scrollTop = 0; renderMini();
}

/* ================= TOOLBAR, LEGEND, TIMEFRAMES ================= */
const ICONS = {
  cursor: '<path d="M5 3l11 6.5-5 1.2L8.7 16z" fill="currentColor"/><path d="M11.5 11.5l4 5" stroke="currentColor" stroke-width="2"/>',
  trend: '<path d="M4 16L16 4" stroke="currentColor" stroke-width="2"/><circle cx="4" cy="16" r="2.2" fill="currentColor"/><circle cx="16" cy="4" r="2.2" fill="currentColor"/>',
  ray: '<path d="M4 15L18 5" stroke="currentColor" stroke-width="2"/><circle cx="4" cy="15" r="2.2" fill="currentColor"/><path d="M14 4.5l4 .5-1.5 3.6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  hline: '<path d="M2 10h16" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="2.4" fill="currentColor"/>',
  hray: '<path d="M5 10h13" stroke="currentColor" stroke-width="2"/><circle cx="5" cy="10" r="2.4" fill="currentColor"/>',
  rect: '<rect x="3.5" y="5" width="13" height="10" rx="1" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1.8"/>',
  fib: '<path d="M3 4h14M3 8h14M3 12h14M3 16h14" stroke="currentColor" stroke-width="1.6"/><path d="M4 16L16 4" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2"/>',
  magnet: '<path d="M5 3v7a5 5 0 0010 0V3h-3v7a2 2 0 01-4 0V3z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 6h3M12 6h3" stroke="currentColor" stroke-width="1.8"/>',
  eye: '<path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="10" cy="10" r="2.5" fill="currentColor"/>',
  undo: '<path d="M7 5L3 9l4 4" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 9H12a5 5 0 010 10h-2" fill="none" stroke="currentColor" stroke-width="1.9"/>',
  trash: '<path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11" fill="none" stroke="currentColor" stroke-width="1.8"/>',
};
const TOOLS = [["cursor", "Cursor: move, zoom and select"], ["trend", "Trend line"], ["ray", "Ray (extends right)"], ["hline", "Horizontal line"], ["hray", "Horizontal ray"], ["rect", "Rectangle zone"], ["fib", "Fibonacci retracement"]];
function renderTools() {
  const tb = $("#tools");
  tb.innerHTML = TOOLS.map(([k, n]) => `<button class="tool" data-t="${k}" title="${n}" aria-label="${n}" aria-pressed="${chart.mode === k}"><svg viewBox="0 0 20 20">${ICONS[k]}</svg></button>`).join("")
    + `<span class="tsep"></span><button class="tool toggle" id="tmag" title="Magnet: snap to candle prices" aria-label="Magnet" aria-pressed="${chart.magnet}"><svg viewBox="0 0 20 20">${ICONS.magnet}</svg></button>`
    + `<button class="tool toggle" id="teye" title="Show breakdown marks" aria-label="Show breakdown marks" aria-pressed="${chart.showMarks}"><svg viewBox="0 0 20 20">${ICONS.eye}</svg></button>`
    + `<button class="tool" id="tundo" title="Undo" aria-label="Undo"><svg viewBox="0 0 20 20">${ICONS.undo}</svg></button>`
    + `<button class="tool" id="tclear" title="Remove all drawings" aria-label="Remove all drawings"><svg viewBox="0 0 20 20">${ICONS.trash}</svg></button>`;
  $$(".tool[data-t]", tb).forEach(b => b.onclick = () => { chart.setMode(chart.mode === b.dataset.t && b.dataset.t !== "cursor" ? "cursor" : b.dataset.t); renderTools(); });
  $("#tmag").onclick = () => { chart.magnet = !chart.magnet; ST.magnet = chart.magnet; save(); renderTools(); toast(chart.magnet ? "Magnet on: points snap to candle prices" : "Magnet off"); };
  $("#teye").onclick = () => { chart.showMarks = !chart.showMarks; ST.marks = chart.showMarks; save(); renderTools(); chart.req(); };
  $("#tundo").onclick = () => chart.doUndo();
  $("#tclear").onclick = () => { chart.clearAll(); toast("Drawings removed (undo brings them back)"); };
}
const MODE_TIP = { trend: "Trend line: drag from point A to point B, or tap twice", ray: "Ray: drag or tap two points; it extends to the right", hline: "Horizontal line: tap the price you want", hray: "Horizontal ray: tap where it should start", rect: "Zone: drag from one corner to the opposite corner", fib: "Fibonacci: drag from the swing start to the swing end" };
chart.onMode = (m, phase) => { renderToolsPressed(); if (phase === "await") toast("Now tap the second point"); else if (m !== "cursor") toast(MODE_TIP[m]); };
function renderToolsPressed() { $$(".tool[data-t]").forEach(b => b.setAttribute("aria-pressed", chart.mode === b.dataset.t)); }
let toastT = 0;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2400); }
function showSel(d) {
  const bar = $("#selbar");
  if (!d) { bar.classList.remove("open"); bar.innerHTML = ""; return; }
  bar.innerHTML = DCOLS.map(c => `<button class="sw" data-c="${c}" style="background:${c}" aria-label="Colour" aria-pressed="${d.color === c}"></button>`).join("") + `<button class="del" id="seldel">Delete</button><button class="ok" id="selok">Done</button>`;
  bar.classList.add("open");
  $$(".sw", bar).forEach(b => b.onclick = () => { chart.pushUndo(); d.color = b.dataset.c; chart.color = d.color; chart.req(); showSel(d); });
  $("#seldel").onclick = () => chart.deleteSel(); $("#selok").onclick = () => chart.select(null);
}
chart.onSelect = d => showSel(d);
chart.onChange = (what, d, isNew) => {
  if (what === "scale") $("#autob").hidden = !chart.ym;
  if (what === "freey" && !ST.freeyTip) { ST.freeyTip = true; save(); toast("Free scroll: tap A (bottom right) to re-fit prices"); }
  if (what === "draw") { renderToolsPressed(); const q = G && G.phase === "quiz" && G.qs[G.qi];
    if (isNew && q && q.kind === "draw" && !q.done) { if ($("#panel").classList.contains("min")) setPanelMin(false); toast("Drawn. Tap Check when you're happy (drag the handles to adjust)"); } }
};
chart.onCross = i => updateLegend(i);
function updateLegend(i) {
  const S = chart.S; if (!S || !S.n) return; const I = S.I;
  if (i == null) i = chart.cross ? chart.cross.i : S.n - 1; i = clamp(i, 0, S.n - 1);
  const up = S.c[i] >= S.o[i], cls = up ? "u" : "d", ch = i > 0 ? S.c[i] - S.c[i - 1] : 0, chp = i > 0 ? ch / S.c[i - 1] * 100 : 0, sim = isIntra(S.tf);
  $("#legend").innerHTML = `<div class="l1"><b>${I.tv}</b> <span class="dim">· ${esc(I.short)} · ${S.tf} · ${I.exch}</span><span class="badge ${sim ? "sim" : "real"}" title="${sim ? "Simulated from real daily candles" : "Real historical data"}">${sim ? "SIM" : "REAL"}</span>${S.brk[i] ? ' <span class="dim" style="color:#e7b35a">· new contract</span>' : ""}${S.partial && i === S.n - 1 ? ' <span class="dim">· forming</span>' : ""}</div>
    <div><span class="v dim">${chart.barLabel(i)}</span><span class="v">O <span class="${cls}">${fnum(I, S.o[i])}</span></span><span class="v">H <span class="${cls}">${fnum(I, S.h[i])}</span></span><span class="v">L <span class="${cls}">${fnum(I, S.l[i])}</span></span><span class="v">C <span class="${cls}">${fnum(I, S.c[i])}</span></span><span class="v ${cls}">${fpct(chp, 2)}</span></div>
    <div>${chart.showEMA ? `<span class="v ema">EMA 20 ${S.ema[i] != null ? fnum(I, S.ema[i]) : "—"}</span>` : ""}${chart.showSMA ? `<span class="v sma">SMA 50 ${S.sma[i] != null ? fnum(I, S.sma[i]) : "—"}</span>` : ""}${chart.showVWAP && S.vwap && S.vwap[i] != null ? `<span class="v" style="color:#e0a43a">VWAP ${fnum(I, S.vwap[i])}</span>` : ""}${chart.showVol && S.v[i] != null ? `<span class="v dim">Vol ${fvol(S.v[i])}</span>` : ""}</div>`;
}
function setView(tf) { if (!G || G.view === tf) return;
  if (G.replay) { if (tf === "1W" || tf === "1M") { toast("Replay runs on 1m to 1D"); return; } G.view = tf; RP.baseKey = null; chart.select(null); RP.follow = true; rpRender(true); renderTF(); rpPanel(); closePops(); toast(`${tf} from the same moment`); return; } G.view = tf; chart.select(null); refresh(false); if (G.phase === "play") { G.base = null; G.follow = true; renderLiveBtn(); showLive(); } closePops(); if (G.phase === "quiz") renderPanel(); toast(isIntra(tf) ? `${tf}: simulated from the real daily candles` : `${tf}: real historical data`); }
function renderTF() {
  $("#tflab").textContent = G.view; $("#tfsim").textContent = isIntra(G.view) ? "SIM" : "";
  $("#tfrow").innerHTML = TF_LIST.map(tf => `<button data-tf="${tf}" aria-pressed="${G.view === tf}" title="${isIntra(tf) ? "Simulated intraday" : "Real data"}">${tf}</button>`).join("");
  $$("#tfrow button").forEach(b => b.onclick = () => setView(b.dataset.tf));
}
function openPop(id, anchor, html, bind) {
  closePops(); const p = $(id); p.innerHTML = html; p.classList.add("open");
  const r = anchor.getBoundingClientRect(), w = p.offsetWidth; p.style.left = clamp(r.left, 8, window.innerWidth - w - 8) + "px"; p.style.top = (r.bottom + 6) + "px"; bind(p);
}
function closePops() { $$(".pop").forEach(p => p.classList.remove("open")); }
document.addEventListener("pointerdown", e => { if (!e.target.closest(".pop") && !e.target.closest("#tfbtn") && !e.target.closest("#indbtn")) closePops(); });
$("#tfbtn").onclick = e => openPop("#tfpop", e.currentTarget, `<h4>Simulated intraday</h4><div class="grid">${["1m", "5m", "15m", "1h"].map(tf => `<button data-tf="${tf}" aria-pressed="${G.view === tf}">${tf}</button>`).join("")}</div><div class="grid">${["4h"].map(tf => `<button data-tf="${tf}" aria-pressed="${G.view === tf}">${tf}</button>`).join("")}</div><h4>Real data</h4><div class="grid">${["1D", "1W", "1M"].map(tf => `<button data-tf="${tf}" aria-pressed="${G.view === tf}">${tf}</button>`).join("")}</div><p class="small" style="margin:4px 6px">Intraday candles are generated inside each real daily candle (its open, high, low and close are exact).</p>`, p => $$("button", p).forEach(b => b.onclick = () => setView(b.dataset.tf)));
$("#indbtn").onclick = e => openPop("#indpop", e.currentTarget, `<h4>Indicators</h4>
  <label>EMA 20 (blue)<input type="checkbox" id="i-ema" ${chart.showEMA ? "checked" : ""}></label><label>VWAP (amber, intraday)<input type="checkbox" id="i-vwap" ${chart.showVWAP ? "checked" : ""}></label><label>SMA 50 (grey dashed)<input type="checkbox" id="i-sma" ${chart.showSMA ? "checked" : ""}></label>
  <label>Volume<input type="checkbox" id="i-vol" ${chart.showVol ? "checked" : ""}></label><label>RSI 14<input type="checkbox" id="i-rsi" ${chart.showRSI ? "checked" : ""}></label>`, p => {
  $("#i-ema", p).onchange = ev => { chart.showEMA = ev.target.checked; chart.req(); updateLegend(); };
  $("#i-vwap", p).onchange = ev => { chart.showVWAP = ST.vwap = ev.target.checked; save(); chart.req(); updateLegend(); };
  $("#i-sma", p).onchange = ev => { chart.showSMA = ST.sma = ev.target.checked; save(); chart.req(); updateLegend(); };
  $("#i-vol", p).onchange = ev => { chart.showVol = ST.vol = ev.target.checked; save(); chart.req(); updateLegend(); };
  $("#i-rsi", p).onchange = ev => { chart.showRSI = ST.rsi = ev.target.checked; save(); chart.req(); };
});
$("#autob").onclick = () => { chart.ym = null; $("#autob").hidden = true; chart.req(); };
$("#fitb").onclick = () => { chart.fit(); if (G && G.phase === "play") { G.follow = true; renderLiveBtn(); } };
$("#liveb").onclick = () => { if (!G || G.phase !== "play") return; G.follow = true; chart.toLatest(liveT()); renderLiveBtn(); };
const FS_IN = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 7.5V3h4.5M12.5 3H17v4.5M17 12.5V17h-4.5M7.5 17H3v-4.5"/></svg>`, FS_OUT = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7.5 3v4.5H3M17 7.5h-4.5V3M12.5 17v-4.5H17M3 12.5h4.5V17"/></svg>`;
function setFS(on) {
  const app = $("#app"); if (on === app.classList.contains("fs")) return;
  if (on && typeof CO !== "undefined" && CO.open) closeCoach();
  app.classList.toggle("fs", on); const b = $("#fsb"); b.innerHTML = on ? FS_OUT : FS_IN; b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "Exit full screen" : "Full screen chart");
  try { if (on && document.fullscreenEnabled && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (_) {}
  chart.req(); setTimeout(() => chart.req(), 80); if (on) toast("Full screen: tap the corner button to go back");
}
$("#fsb").onclick = () => setFS(!$("#app").classList.contains("fs"));
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && $("#app").classList.contains("fs")) setFS(false); });
// Stop the page (or the app around it) from scrolling or rubber-banding when a drag isn't on something meant to scroll
document.addEventListener("touchmove", e => { if (e.cancelable && !(e.target.closest && e.target.closest(".panel, .sheet, .tools, .pop, .cmsgs, .csugg, .cq, .nbody, textarea, .home .hm"))) e.preventDefault(); }, { passive: false });
function setPanelMin(on) { $("#panel").classList.toggle("min", on); $("#gripb").textContent = on ? "▴ show panel" : "▾ hide panel"; chart.req(); }
$("#gripb").onclick = () => setPanelMin(!$("#panel").classList.contains("min"));
$("#pane").addEventListener("click", e => { if (e.target.closest("#pbopen")) openPlaybook(); if (e.target.closest("#stopen")) openStrats(G.strat && G.strat.key); });
document.addEventListener("keydown", e => {
  const tag = (e.target.tagName || "").toLowerCase(); if (tag === "input" || tag === "textarea") return;
  if (MK.screen && !$("#scrim").classList.contains("open") && !$("#nav").classList.contains("open")) { mkKey(e); return; }
  if (e.key === "Escape") { if ($("#nav").classList.contains("open")) { closeNav(); return; } if ($("#scrim").classList.contains("open")) { closeSheet(); return; } if ($("#app").classList.contains("fs")) { setFS(false); return; } closePops(); if (chart.pending || chart.mode !== "cursor") { chart.setMode("cursor"); renderTools(); } else chart.select(null); }
  if ((e.key === "Delete" || e.key === "Backspace") && chart.sel) { e.preventDefault(); chart.deleteSel(); }
  if (G && G.replay && !e.metaKey && !e.ctrlKey && !$("#scrim").classList.contains("open")) { const k = e.key.toLowerCase();
    if (k === " ") { e.preventDefault(); rpToggle(); return; } if (k === "arrowright") { e.preventDefault(); rpStep(1); return; }
    if ((k === "b" || k === "s") && !(RP.pos && RP.pos.open)) { e.preventDefault(); rpOpen(k === "b" ? 1 : -1); return; } }
  if (G && G.rapid && !e.metaKey && !e.ctrlKey) { const k = e.key.toLowerCase();
    if (G.phase === "trade" && (k === "b" || k === "arrowup")) { e.preventDefault(); decide(1); return; }
    if (G.phase === "trade" && (k === "s" || k === "arrowdown")) { e.preventDefault(); decide(-1); return; }
    if (G.phase === "done" && (k === "n" || k === "enter")) { const b = $("#next") || $("#acctgo"); if (b) { e.preventDefault(); b.click(); } return; } }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); chart.doUndo(); }
  if (e.key === " " && G && G.phase === "play") { e.preventDefault(); togglePause(); }
});

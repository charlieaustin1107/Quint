/* ================= SESSION HUD + LUCID GUARD =================
   Two cockpit cards on the Markets home page. Neither makes a single TradingView or FMP call:
   the session clock is worked out from the phone's clock, the news warning reads the economic
   calendar Quint already saved, and the Lucid guard uses numbers the owner types in from their Lucid dashboard. */

// The New York moments that matter for the strategies this app teaches (minutes after midnight, New York time).
const HUD_MARKS = [
  { m: 570, k: "open", lab: "New York open", tip: "The 15-minute opening range starts building." },
  { m: 585, k: "orb", lab: "Opening range set", tip: "NY open breakout: entries allowed from now until 11:30." },
  { m: 690, k: "orbx", lab: "Breakout entries close", tip: "No new NY open breakout entries after 11:30." },
  { m: 960, k: "close", lab: "Stock market close", tip: "Cash session ends; futures liquidity thins out." },
  { m: 1020, k: "brk", lab: "CME daily break", tip: "Futures pause 17:00 to 18:00 New York." },
];
const hudClock = ms => { const e = etNow(ms); return `${String(Math.floor(e.min / 60)).padStart(2, "0")}:${String(e.min % 60).padStart(2, "0")}:${String(new Date(ms).getSeconds()).padStart(2, "0")}`; };
const hudLeft = ms => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}:${String(x).padStart(2, "0")}`; };
function hudPhase(ms) { // what part of the day it is, in plain words
  const e = etNow(ms), m = e.min, wk = e.wd >= 1 && e.wd <= 5, st = mktStatus("fut", ms);
  if (!st.open) return { lab: st.label === "Weekend" ? "Weekend: futures closed" : "CME daily break", cls: "off" };
  if (!wk) return { lab: "Sunday evening session", cls: "dim" };
  if (m < 180) return { lab: "Asia session", cls: "dim" };
  if (m < 570) return { lab: m < 480 ? "London session" : "New York pre-market", cls: "dim" };
  if (m < 690) return { lab: "New York morning: your playbook window", cls: "hot" };
  if (m < 960) return { lab: "New York afternoon", cls: "on" };
  return { lab: "Evening session", cls: "dim" };
}
function hudNext(ms) { // the next key moment, today or on the next weekday
  const e = etNow(ms);
  for (let dd = 0; dd < 5; dd++) { const wd = (e.wd + dd) % 7; if (wd === 0 || wd === 6) continue;
    for (const k of HUD_MARKS) { const t = etAt(ms, dd, k.m); if (t > ms) return Object.assign({ t }, k); } }
  return null;
}
function hudNews(ms) { // the next high-importance US event, from the calendar already saved on this phone
  const c = (typeof DK !== "undefined" && DK.cal) || (HS().dkCal) || null; if (!c || !Array.isArray(c.list)) return null;
  return c.list.filter(x => x.imp >= 1 && x.t > ms - 5 * 6e4 && x.t < ms + 12 * 36e5).sort((a, b) => a.t - b.t)[0] || null;
}
function hudPaint() {
  const el = $("#hmSess"); if (!el) return; const now = Date.now(), e = etNow(now), ph = hudPhase(now), nx = hudNext(now), nw = hudNews(now);
  const wk = e.wd >= 1 && e.wd <= 5, a = 570, b = 960, pct = wk ? clamp((e.min - a) / (b - a) * 100, 0, 100) : 0;
  const ticks = HUD_MARKS.filter(k => k.m >= a && k.m <= b).map(k => `<i style="left:${(k.m - a) / (b - a) * 100}%" title="${esc(k.lab)}"></i>`).join("");
  const soon = nw && nw.t - now < 15 * 6e4, past = nw && nw.t <= now;
  el.innerHTML = `<div class="hud ${ph.cls}" role="group" aria-label="New York session clock">
    <div class="hudt"><span class="hudk">NY</span><b class="num" id="hudClk">${hudClock(now)}</b><span class="hudph">${esc(ph.lab)}</span></div>
    <div class="hudbar" aria-hidden="true"><span class="fill" style="width:${pct}%"></span>${ticks}<span class="now" style="left:${pct}%"></span></div>
    <div class="hudlab" aria-hidden="true"><span>9:30</span><span>11:30</span><span>16:00</span></div>
    ${nx ? `<p class="hudnx"><span>NEXT</span> <b>${esc(nx.lab)}</b> in <b class="num" id="hudLeft">${hudLeft(nx.t - now)}</b><small>${esc(nx.tip)}</small></p>` : ""}
    ${nw ? `<p class="hudnw ${soon || past ? "hot" : ""}">⚠ <b>${esc(nw.title)}</b> ${past ? "just came out: expect fast, jumpy candles." : `in <b class="num">${hudLeft(nw.t - now)}</b> (${new Date(nw.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})${soon ? ". Big news is close: many traders stay flat until it's out." : ""}`}</p>` : ""}
  </div>`;
}
let hudT = 0;
function hudTick() { // one-second clock: only touches the page, never the network
  clearInterval(hudT);
  hudT = setInterval(() => {
    if (document.hidden || typeof MK === "undefined" || MK.screen !== "home") return;
    const now = Date.now(), c = $("#hudClk"); if (!c) return; c.textContent = hudClock(now);
    const nx = hudNext(now), l = $("#hudLeft"); if (l && nx) l.textContent = hudLeft(nx.t - now);
    if (new Date(now).getSeconds() === 0) { hudPaint(); lgPaint(); }
  }, 1000);
}

/* ---------- Lucid guard: how much room the real Lucid account has left ---------- */
// Defaults are the 50K numbers most guides agree on. Lucid's plans differ (daily loss limit, consistency %), so the owner sets their own.
const LG_DEF = { size: 50000, target: 3000, mll: 2000, dll: 0, cons: 50, lock: true, bal: 50000, peak: 50000, today: 0, best: 0, stop: 20, at: 0 };
const LG_COST = 2 * 0.75 + 2 * 0.25 * 2; // $ per MNQ round trip: $0.75 commission a side plus 1 tick ($0.50) of slippage a side
const LG = () => { const g = ST.lucid || (ST.lucid = Object.assign({}, LG_DEF)); for (const k in LG_DEF) if (g[k] == null || g[k] === "" || !isFinite(+g[k]) && typeof LG_DEF[k] === "number") g[k] = LG_DEF[k]; return g; };
function lgCalc() {
  const g = LG(), floor0 = Math.max(g.peak, g.size) - g.mll, floor = g.lock ? Math.min(floor0, g.size) : floor0;
  const roomMll = g.bal - floor, roomDay = g.dll > 0 ? g.dll + Math.min(0, g.today) : Infinity, room = Math.max(0, Math.min(roomMll, roomDay));
  const profit = g.bal - g.size, perStop = g.stop * 2 + LG_COST, maxN = perStop > 0 ? Math.floor(room / perStop) : 0, safeN = perStop > 0 ? Math.floor(room * 0.25 / perStop) : 0;
  const share = g.cons > 0 && profit > 0 && g.best > 0 ? g.best / profit * 100 : null, needFor = g.cons > 0 && g.best > 0 ? Math.max(0, g.best / (g.cons / 100) - profit) : 0;
  const lvl = room <= 0 ? "bad" : room < g.mll * 0.25 ? "bad" : room < g.mll * 0.5 ? "warn" : "ok";
  return { g, floor, roomMll, roomDay, room, profit, perStop, maxN, safeN, share, needFor, lvl, dayLimit: g.dll > 0 && roomDay <= roomMll };
}
function lgPaint() {
  const el = $("#hmLucid"); if (!el) return; const c = lgCalc(), g = c.g;
  if (!g.at) { el.innerHTML = `<button class="lg set" id="lgOpen"><span class="lgk">LUCID GUARD</span><b>Protect your funded account</b><small>Type in your Lucid balance once a day and see exactly how much room you have before the max loss, and how many MNQ that allows. Quint will size his calls to it.</small><span class="lggo">Set up ▸</span></button>`; return; }
  const prog = clamp(c.profit / g.target * 100, 0, 100), used = clamp((1 - c.room / g.mll) * 100, 0, 100);
  el.innerHTML = `<button class="lg ${c.lvl}" id="lgOpen" aria-label="Lucid guard: ${fbal(c.room)} of room left. Tap to update.">
    <span class="lgh"><span class="lgk">LUCID GUARD</span><span class="lgst">${c.lvl === "ok" ? "SAFE" : c.lvl === "warn" ? "CAREFUL" : c.room <= 0 ? "LIMIT HIT" : "DANGER"}</span></span>
    <span class="lgrow"><span><small>Room before ${c.dayLimit ? "daily limit" : "max loss"}</small><b class="num">${fbal(c.room)}</b></span><span><small>Max loss floor</small><b class="num">${fbal(c.floor)}</b></span><span><small>Balance</small><b class="num">${fbal(g.bal)}</b></span></span>
    <span class="lgbar dd" aria-hidden="true"><i style="width:${100 - used}%"></i></span>
    <span class="lgsz">With a <b>${nf(2).format(g.stop).replace(/\.00$/, "")}-point</b> stop: at most <b>${c.maxN} MNQ</b> before one stop-out breaks the limit. Safer: <b>${Math.max(c.safeN, 0)} MNQ</b> (a quarter of your room).</span>
    <span class="lgrow two"><span><small>Profit to target</small><b class="num ${c.profit >= 0 ? "pos" : "neg"}">${fusd(c.profit)} / ${fbal(g.target)}</b></span>${g.cons > 0 ? `<span><small>Consistency (${g.cons}% rule)</small><b class="num ${c.share != null && c.share > g.cons ? "neg" : "pos"}">${c.share == null ? "–" : Math.round(c.share) + "%"}</b></span>` : ""}</span>
    <span class="lgbar" aria-hidden="true"><i style="width:${prog}%"></i></span>
    ${c.share != null && c.share > g.cons ? `<span class="lgw">Your biggest day is more than ${g.cons}% of your profit, so you need about <b>${fbal(c.needFor)}</b> more profit, spread over other days, before you can pass or get paid.</span>` : ""}
    <span class="lgu">Updated ${fAgo(g.at)} · tap to update${Date.now() - g.at > 18 * 36e5 ? " (it's old: update it from your Lucid dashboard)" : ""}</span></button>`;
}
function lgOpen() {
  const g = LG(), fld = (id, lab, v, step, help) => `<label class="lgf"><span>${lab}</span><input id="${id}" type="number" inputmode="decimal" step="${step}" value="${v}">${help ? `<small>${help}</small>` : ""}</label>`;
  openSheet(`${shead("Lucid guard")}<p class="small">Copy these from your Lucid dashboard after each trading day (or after a trade). Nothing is sent anywhere: the numbers stay on this phone and Quint uses them to size his calls. Practice only: the app never places orders.</p>
    <h3>Today</h3><div class="lgform">${fld("lgBal", "Balance now ($)", g.bal, "1")}${fld("lgPeak", "Highest end-of-day balance ($)", g.peak, "1", "Lucid's max loss trails this.")}${fld("lgToday", "Today's P&amp;L ($)", g.today, "1", "Negative if you're down.")}${fld("lgBest", "Your best day so far ($)", g.best, "1", "For the consistency rule.")}${fld("lgStop", "Your usual stop (MNQ points)", g.stop, "0.25")}</div>
    <h3>Your plan's rules</h3><p class="small">Lucid's plans differ, and guides disagree on some numbers, so check your own plan's rules page. The defaults are the usual 50K figures.</p>
    <div class="lgform">${fld("lgSize", "Account size ($)", g.size, "1000")}${fld("lgTarget", "Profit target ($)", g.target, "100")}${fld("lgMll", "Max loss, trailing ($)", g.mll, "100")}${fld("lgDll", "Daily loss limit ($, 0 = none)", g.dll, "100")}${fld("lgCons", "Consistency rule (%, 0 = none)", g.cons, "5", "Biggest day ÷ total profit must stay under this.")}</div>
    <button class="tog lgtog" id="lgLock" aria-pressed="${g.lock}"><span class="k"></span><span>Max loss stops trailing once it reaches the starting balance</span></button>
    <div class="row" style="margin-top:12px"><button class="btn pri" id="lgSave">Save</button><button class="btn" id="lgReset">Reset to defaults</button></div>`, sh => {
    $("#lgLock", sh).onclick = e => { const b = e.currentTarget; b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); };
    $("#lgReset", sh).onclick = () => { ST.lucid = Object.assign({}, LG_DEF); save(); closeSheet(); lgOpen(); };
    $("#lgSave", sh).onclick = () => {
      const v = id => { const x = parseFloat($("#" + id, sh).value); return isFinite(x) ? x : null; }, G = LG();
      const map = { bal: "lgBal", peak: "lgPeak", today: "lgToday", best: "lgBest", stop: "lgStop", size: "lgSize", target: "lgTarget", mll: "lgMll", dll: "lgDll", cons: "lgCons" };
      for (const k in map) { const x = v(map[k]); if (x != null) G[k] = x; }
      G.stop = Math.max(0.25, G.stop); G.mll = Math.max(1, G.mll); G.target = Math.max(1, G.target); G.dll = Math.max(0, G.dll); G.cons = clamp(G.cons, 0, 100); G.best = Math.max(0, G.best);
      G.lock = $("#lgLock", sh).getAttribute("aria-pressed") === "true"; G.at = Date.now(); save(); closeSheet(); lgPaint(); toast("Lucid guard updated"); sfx(lgCalc().lvl === "ok" ? "right" : "warn");
    };
  });
}
function lgBrief() { // one line for Quint's brief, so his calls respect the real account
  const g = ST.lucid; if (!g || !g.at) return null; const c = lgCalc();
  return `LUCID GUARD (the user's REAL Lucid funded account, typed in by them ${fAgo(g.at)}): balance ${fbal(g.bal)}, max-loss floor ${fbal(c.floor)}, ${fbal(c.room)} of room left before ${c.dayLimit ? "the daily loss limit" : "the trailing max loss"}${g.dll > 0 ? ` (daily limit ${fbal(g.dll)}, today ${fusd(g.today)})` : ""}; profit ${fusd(c.profit)} of the ${fbal(g.target)} target${g.cons > 0 ? `, consistency rule ${g.cons}%${c.share != null ? ` (biggest day is ${Math.round(c.share)}% of profit)` : ""}` : ""}. With a ${g.stop}-point MNQ stop one stop-out costs about ${fbal(c.perStop)} per contract, so ${c.maxN} MNQ would use all the room. When you give a trade for their real account, keep the full stop loss under a quarter of that room (about ${c.safeN} MNQ at that stop, fewer with a wider stop), and say plainly if the account is close to its limit.`;
}
document.addEventListener("click", e => { if (e.target.closest("#lgOpen")) lgOpen(); });
hudTick();

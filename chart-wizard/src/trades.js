/* ================= LIVE TRADES: all your live paper trades, updating with every new price ================= */
// One place for every live trade: the open ones, whose profit or loss moves as FMP's prices arrive, both accounts' totals,
// today's result, and the closed trades. Futures and Bitcoin trade on the prop account; stocks on the separate stock paper account.
const LT = { back: false, y: 0, f: "all", more: 0, sig: "", hsig: "", conf: 0, confT: 0 };
function openTrades() { closeNav(); if ($("#scrim").classList.contains("open")) closeSheet(); mkShow("trades"); }
const ltDur = ms => { const m = Math.max(0, Math.round(ms / 6e4)); return m < 1 ? "under a minute" : m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 1440)} d ${Math.floor(m % 1440 / 60)} h`; };
const ltWhen = ms => new Date(ms).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const ltIvText = () => { const s = [90, 180, 300, 0][mkTier()]; if (!s) return "only when FMP calls are available again"; const v = Math.round(s * Math.max(1, lvOpenList().length / 2)); return `about every ${v < 120 ? v + " seconds" : Math.round(v / 60) + " minutes"}`; };
const ltName = (P, m) => P.kind === "stk" ? (m ? m.fmp : P.sym) : (m ? m.name : P.name);
const ltR = R => (R >= 0 ? "+" : "−") + Math.abs(R).toFixed(2) + "R";
const ltUsd = v => fusd(Math.abs(v) < 0.5 ? 0 : v); // a few cents of fees shows as $0, not −$0
function ltNow(P) { // everything about an open trade that moves with the price
  const m = lvMkt(P); if (!m) return null; const I = mkSpec(m), Q = MK.q[P.key], x = Q && Q.p != null ? Q.p : P.last, pv = lvPV(P, I), fee = P.fees || 0;
  const pnl = (x - P.e) * P.dir * P.qty * pv - fee, R = P.sd ? (x - P.e) * P.dir / P.sd : 0;
  const span = P.tgt != null ? P.tgt - P.stop : 0, f = span ? clamp((x - P.stop) / span, 0, 1) : 0.5, fe = span ? clamp((P.e - P.stop) / span, 0, 1) : 0.5;
  return { m, I, x, pnl, R, f, fe, atStop: (P.stop - P.e) * P.dir * P.qty * pv - fee, atTgt: P.tgt != null ? (P.tgt - P.e) * P.dir * P.qty * pv - fee : null, ts: Q && Q.ts ? Q.ts : P.lastTs, st: mktStatus(m.cls) };
}
function ltTotals() {
  let all = 0, prop = 0, stk = 0; for (const P of lvOpenList()) { const v = lvUPL(P); all += v; if (P.kind === "stk") stk += v; else prop += v; }
  return { all, prop, stk };
}
const ltLogged = () => lvState().log.filter(p => p && !p.void && p.exit);

/* ---------- the parts that change with every price (open-trade cards, home rows, chart-page rows, totals) ---------- */
function ltLive() {
  const els = document.querySelectorAll("#home [data-ltid]"), byId = new Map(lvOpenList().map(P => [String(P.id), P]));
  for (const el of els) {
    const P = byId.get(el.dataset.ltid); if (!P) continue; const N = ltNow(P); if (!N) continue;
    const set = (f, t, cls) => { const e = el.querySelector(`[data-f="${f}"]`); if (!e) return; if (e.textContent !== t) { const was = e.textContent; e.textContent = t; if (f === "pnl" && was) { e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); } } if (cls != null && e.className !== cls) e.className = cls; };
    set("pnl", ltUsd(N.pnl), "num " + toneOf(Math.abs(N.pnl) < 0.5 ? 0 : N.pnl)); set("r", ltR(N.R), toneOf(N.R)); set("px", fnum(N.I, N.x));
    set("age", N.ts ? fAgo(N.ts) : "waiting for a price"); { const a = el.querySelector('[data-f="age"]'); if (a && N.ts) a.title = "Price from " + fLocal(N.ts); } set("dur", `open ${ltDur(Date.now() - P.t0)}`);
    const dot = el.querySelector('[data-f="dot"]'); if (dot) dot.style.left = (N.f * 100).toFixed(1) + "%";
    const fill = el.querySelector('[data-f="fill"]'); if (fill) { const a = Math.min(N.f, N.fe), b = Math.max(N.f, N.fe); fill.style.left = (a * 100).toFixed(1) + "%"; fill.style.width = ((b - a) * 100).toFixed(1) + "%"; fill.className = "fill " + (N.pnl >= 0 ? "up" : "dn"); }
  }
  const T = ltTotals(), K = SK(), money = (id, v) => { const e = $(id); if (e) { const t = ltUsd(v); if (e.textContent !== t) e.textContent = t; e.className = "num " + toneOf(Math.abs(v) < 0.5 ? 0 : v); } };
  money("#ltTot", T.all); money("#ltTotP", T.prop); money("#ltTotS", T.stk); money("#hmLTtot", T.all);
  for (const id of ["#ltSkEq", "#stkEq"]) { const e = $(id); if (e) e.textContent = fbal(K.bal + T.stk); }
}

/* ---------- the Live trades screen ---------- */
function ltOpen() {
  const root = $("#hmTrades"), back = LT.back; LT.back = false;
  root.innerHTML = `<header class="hmh"><div class="hmbrand"><span><b>Live trades</b><small>Updating live</small></span></div><span class="spacer"></span><button class="tbtn" id="ltRef" aria-label="Refresh the prices of your open trades">⟳</button><button class="btn pri hmgo" id="ltGo">Trainer ▸</button></header>
    <div class="hmwrap">
      <div class="hmstat" id="ltStat"></div><div id="ltBan"></div><div id="ltSum"></div>
      <section class="hmsec" aria-label="Open trades"><h2>Open trades <span class="mkst" id="ltCnt"></span></h2><div id="ltOpenL"></div></section>
      <section class="hmsec" aria-label="Closed trades"><h2>Closed trades</h2><div id="ltHist"></div></section>
      <footer class="hmfoot"><p>Paper trading with virtual money. Futures and Bitcoin trade on your prop account; stocks trade on a separate ${fbal(STK_START)} stock paper account. While Chart Wizard is open, each open trade's price is checked and its stop and target are tested against it, including the day's high and low. If the app is closed, open trades are settled from the daily candles when you come back. Not financial advice.</p></footer>
    </div>`;
  $("#ltGo", root).onclick = () => mkShow(null);
  $("#ltRef", root).onclick = () => { const ks = [...new Set(lvOpenList().map(P => P.key))].filter(k => MKDEF[k]); if (!ks.length) { hmToast("No open trades to refresh."); return; } mkRefresh(ks); };
  root.onclick = ltClick;
  LT.sig = ""; ltPaint(); root.scrollTop = back ? LT.y : 0;
}
function ltClick(e) {
  const k = e.target.closest("[data-ltk]"); if (k) { ltGoChart(k.dataset.ltk); return; }
  const c = e.target.closest("[data-ltc]");
  if (c) { // closing at market takes two taps, so a stray tap in a list can't close the wrong trade
    const id = +c.dataset.ltc, P = lvOpenList().find(x => x.id === id); if (!P) return;
    if (LT.conf !== id) { LT.conf = id; clearTimeout(LT.confT); LT.confT = setTimeout(() => { LT.conf = 0; ltPaint(); }, 4000); ltPaint(); return; }
    LT.conf = 0; clearTimeout(LT.confT); lvCloseNow(P); return;
  }
  const f = e.target.closest("[data-ltf]"); if (f) { LT.f = f.dataset.ltf; LT.more = 0; ltPaint(); return; }
  if (e.target.closest("[data-ltmore]")) { LT.more += 30; ltPaint(); return; }
  if (e.target.closest("[data-home]")) { mkShow("home"); return; }
  if (e.target.closest("#hmRetry")) { mkConnect(); return; }
}
function ltGoChart(k) {
  if (!MKDEF[k] && String(k).startsWith("s:")) stkDef(String(k).slice(2)); if (!MKDEF[k]) return;
  if (MK.screen === "trades") { LT.y = $("#hmTrades").scrollTop; LT.back = true; } else if (MK.screen === "home") MK.homeY = $("#hmHome").scrollTop;
  mkShow("chart", k);
}
function ltPaint() {
  if (MK.screen !== "trades" || !$("#ltStat")) { ltLive(); return; }
  ltStatPaint();
  const open = lvOpenList(), L = lvState().log;
  const sig = [open.map(P => [P.id, P.stop, P.tgt, P.qty].join(":")).join(","), L.length, L[0] && L[0].id, LT.f, LT.more, LT.conf, LV.busy && LV.busyId, MK.st, ST.bal, SK().bal, acctLabel()].join("|");
  if (sig !== LT.sig) { LT.sig = sig; ltSumPaint(); ltOpenPaint(); ltHistPaint(); }
  ltLive();
}
function ltStatPaint() {
  const open = lvOpenList(), T = mkTier(), n = callsToday();
  const dot = MK.st === "ready" ? (T >= 2 ? "warn" : "on") : MK.st === "wait" ? "warn" : "off";
  const word = MK.st === "ready" ? (T >= 3 ? "PAUSED" : "LIVE") : MK.st === "wait" ? "CONNECTING" : "OFFLINE";
  $("#ltStat").innerHTML = `<span class="ldot ${dot}"><i></i>${word}</span>${MK.st === "ready" ? `<span>${open.length ? `prices checked ${ltIvText()}` : "no open trades"}</span><span class="budget" title="FMP calls this app has made today. The free plan allows 250 a day in total.">FMP <span class="bar"><i style="width:${clamp(n / 250 * 100, 0, 100)}%"></i></span> ~${n}/250 today</span>` : ""}`;
  const ban = $("#ltBan"), rf = $("#ltRef");
  if (rf) rf.hidden = MK.st === "none";
  if (ban) ban.innerHTML = MK.st === "ready" ? (T >= 3 && open.length ? `<div class="hmban"><span><b>Today's FMP calls are used up</b>, so open trades aren't being checked until tomorrow. They'll be settled from the daily candles, gaps included, once prices are back.</span></div>` : "")
    : open.length ? `<div class="hmban${MK.st === "err" ? " bad" : ""}"><span><b>Prices aren't connected</b>, so your open trades aren't being checked right now. They'll be settled from the daily candles, gaps included, once prices are back.${MK.st === "err" ? " " + esc(errText({ code: MK.why, message: MK.whyMsg })) : ""}</span>${MK.st === "err" ? `<button class="btn" id="hmRetry">Try again</button>` : ""}</div>` : "";
}
function ltSumPaint() {
  const K = SK(), T = ltTotals(), open = lvOpenList(), L = ltLogged(), day = new Date().toDateString(), tL = L.filter(p => new Date(p.exit.at).toDateString() === day), tNet = tL.reduce((a, p) => a + (p.net || 0), 0), tW = tL.filter(p => p.net > 0).length;
  $("#ltSum").innerHTML = `<div class="ltsum">
    <div class="lts big"><small>Open P&amp;L · ${open.length} trade${open.length === 1 ? "" : "s"}</small><b class="num ${toneOf(T.all)}" id="ltTot">${fusd(T.all)}</b><span>changes with every new price</span></div>
    <div class="lts"><small>Closed today</small><b class="num ${toneOf(tNet)}">${fusd(tNet)}</b><span>${tL.length ? `${tL.length} trade${tL.length === 1 ? "" : "s"} · ${tW} won` : "no trades closed today"}</span></div>
    <div class="lts"><small>${esc(acctLabel())}</small><b class="num">${fbal(ST.bal)}</b><span>open <b class="num ${toneOf(T.prop)}" id="ltTotP">${fusd(T.prop)}</b> · ${ST.acct.stage === "live" ? "funded" : `room ${fbal(roomLeft())}`}</span></div>
    <div class="lts"><small>Stock account</small><b class="num" id="ltSkEq">${fbal(K.bal + T.stk)}</b><span>open <b class="num ${toneOf(T.stk)}" id="ltTotS">${fusd(T.stk)}</b> · cash ${fbal(Math.max(0, K.bal - stkUsed()))}</span></div></div>`;
}
function ltCard(P) {
  const N = ltNow(P); if (!N) return ""; const { m, I } = N, stk = P.kind === "stk", busy = LV.busy && LV.busyId === P.id, conf = LT.conf === P.id;
  return `<article class="ltc ${P.dir > 0 ? "long" : "short"}" data-ltid="${P.id}">
    <div class="lth"><span class="mlogo ${stk ? "stk" : m.cls === "crypto" ? "btc" : ""} l${Math.min(4, m.logo.length)}">${esc(m.logo)}</span>
      <span class="ltn"><b>${esc(ltName(P, m))} <span class="ltside">${P.dir > 0 ? "LONG" : "SHORT"}</span></b><small>${esc(lvSize(P, I))} @ ${fnum(I, P.e)} · ${stk ? "stock account" : esc(acctLabel())}</small></span>
      <span class="ltp"><b class="num ${toneOf(N.pnl)}" data-f="pnl">${ltUsd(N.pnl)}</b><small class="${toneOf(N.R)}" data-f="r">${ltR(N.R)}</small></span></div>
    <div class="ltbar" aria-hidden="true"><span class="trk"><i class="fill" data-f="fill"></i><i class="ent" style="left:${(N.fe * 100).toFixed(1)}%"></i><i class="dot" data-f="dot" style="left:${(N.f * 100).toFixed(1)}%"></i></span></div>
    <div class="ltlv"><span>Stop <b class="neg">${fnum(I, P.stop)}</b><small>${N.atStop >= 0 ? "locks " : ""}${fusd(N.atStop)}</small></span><span class="mid">Now <b data-f="px">${fnum(I, N.x)}</b><small data-f="age"></small></span><span class="end">Target <b class="pos">${P.tgt != null ? fnum(I, P.tgt) : "none"}</b><small>${N.atTgt != null ? fusd(N.atTgt) : ""}</small></span></div>
    <div class="ltm"><span data-f="dur">open ${ltDur(Date.now() - P.t0)}</span>${P.be ? `<span class="ok">stop at breakeven</span>` : ""}${N.st.open ? "" : `<span class="warn">${esc(stk ? "US stock market" : m.name)} closed · reopens ${esc(fLocal(N.st.next))}; the stop and target still apply</span>`}</div>
    <div class="lta"><button class="btn" data-ltk="${esc(P.key)}">Chart &amp; manage ▸</button><button class="btn ${conf ? "danger sure" : "danger"}" data-ltc="${P.id}" ${busy ? "disabled" : ""}>${busy ? "Getting a price…" : conf ? "Tap again to close" : "✕ Close at market"}</button></div>
  </article>`;
}
function ltOpenPaint() {
  const open = lvOpenList().slice().sort((a, b) => b.t0 - a.t0), box = $("#ltOpenL"), cnt = $("#ltCnt");
  if (cnt) cnt.textContent = `${open.length} of ${LV_MAX}`;
  if (open.length) { box.innerHTML = `<div class="ltlist">${open.map(ltCard).join("")}</div>`; return; }
  const view = shReading() && SH.canWrite !== true;
  box.innerHTML = `<div class="nwempty"><b>No live trades open.</b><br>${view ? "Live paper trading needs FMP connected in your own copy of Chart Wizard; this view only shows the owner's shared prices." : `Open a market on the Markets page and press Buy or Sell. Futures and Bitcoin trade on your ${esc(acctLabel())}; stocks trade on your ${fbal(STK_START)} stock paper account. Up to ${LV_MAX} trades can be open at once, and each one shows here, updating with every new price.`}</div>${view ? "" : `<button class="btn pri" data-home style="width:100%">Markets ▸</button>`}`;
}
function ltHistPaint() {
  const all = ltLogged(), cancelled = lvState().log.filter(p => p && p.void).length, box = $("#ltHist");
  const by = { all, prop: all.filter(p => p.kind !== "stk"), stk: all.filter(p => p.kind === "stk") }, L = by[LT.f] || all;
  if (!all.length) { box.innerHTML = `<div class="nwempty">Your closed live trades will be listed here, with what each one made or lost.${cancelled ? ` (${cancelled} cancelled with no profit or loss.)` : ""}</div>`; return; }
  const net = L.reduce((a, p) => a + (p.net || 0), 0), wins = L.filter(p => p.net > 0).length, avgR = L.length ? L.reduce((a, p) => a + (p.R || 0), 0) / L.length : 0;
  const best = L.length ? Math.max(...L.map(p => p.net || 0)) : 0, worst = L.length ? Math.min(...L.map(p => p.net || 0)) : 0, show = L.slice(0, 30 + LT.more);
  const chip = (k, l) => `<button class="chip" data-ltf="${k}" aria-pressed="${LT.f === k}">${l}<i>${by[k].length}</i></button>`;
  box.innerHTML = `<div class="nwcats" role="group" aria-label="Filter closed trades">${chip("all", "All")}${chip("prop", "Futures &amp; Bitcoin")}${chip("stk", "Stocks")}</div>
    ${L.length ? `<div class="ltstats"><span><small>Net</small><b class="num ${toneOf(net)}">${fusd(net)}</b></span><span><small>Won</small><b>${Math.round(wins / L.length * 100)}%</b></span><span><small>Average</small><b class="${toneOf(avgR)}">${ltR(avgR)}</b></span><span><small>Best</small><b class="num pos">${fusd(best)}</b></span><span><small>Worst</small><b class="num ${toneOf(worst)}">${fusd(worst)}</b></span></div>
    <div class="ltrows">${show.map(p => { const m = lvMkt(p), I = m ? mkSpec(m) : null;
      return `<button class="ltrow" data-ltk="${esc(p.key)}"><span class="a"><b>${esc(ltName(p, m))} <span class="ltside ${p.dir > 0 ? "long" : "short"}">${p.dir > 0 ? "LONG" : "SHORT"}</span></b><small>${I ? `${esc(lvSize(p, I))} · ${fnum(I, p.e)} → ${fnum(I, p.exit.px)} · ` : ""}${esc(exitLabel(p.exit) || "Closed")} · ${esc(ltWhen(p.exit.at))}</small></span><span class="b"><b class="num ${toneOf(p.net)}">${fusd(p.net)}</b><small class="${toneOf(p.R)}">${ltR(p.R || 0)}</small></span></button>`; }).join("")}</div>
    ${L.length > show.length ? `<button class="btn" data-ltmore style="width:100%">Show ${Math.min(30, L.length - show.length)} more</button>` : ""}` : `<div class="nwempty">No closed ${LT.f === "stk" ? "stock" : "futures or Bitcoin"} trades yet.</div>`}
    ${cancelled ? `<p class="small" style="margin:0">${cancelled} trade${cancelled === 1 ? " was" : "s were"} cancelled with no profit or loss (the prop account changed while ${cancelled === 1 ? "it was" : "they were"} open).</p>` : ""}`;
}

/* ---------- the card on the Markets home page ---------- */
function ltPaintHome() {
  const el = $("#hmLT"); if (!el) return; const open = lvOpenList(), L = ltLogged(), nb = $("#hmLTn"), bt = $("#hmLTb");
  if (nb) { nb.hidden = !open.length; nb.textContent = open.length; } if (bt) bt.hidden = shReading() && SH.canWrite !== true;
  if (shReading() && SH.canWrite !== true && !open.length) { if (el.innerHTML) el.innerHTML = ""; LT.hsig = ""; return; } // a shared view can't trade
  const net = L.reduce((a, p) => a + (p.net || 0), 0), sig = open.map(P => [P.id, P.qty].join(":")).join(",") + "|" + L.length + "|" + net;
  if (sig !== LT.hsig) {
    LT.hsig = sig;
    el.innerHTML = !open.length ? "" // closed trades live in the Trades tab; the home screen only shows what's open
      : `<div class="lthome" data-lt role="button" tabindex="0" aria-label="Open live trades"><div class="lthh"><b>💼 Live trades</b><span>${open.length} open · <b id="hmLTtot" class="num">$0</b></span><span class="go">All ▸</span></div>
        ${open.slice().sort((a, b) => b.t0 - a.t0).slice(0, LV_MAX).map(P => { const m = lvMkt(P), I = m && mkSpec(m); if (!m) return "";
          return `<div class="lthr" data-ltid="${P.id}"><span class="mlogo sm ${P.kind === "stk" ? "stk" : m.cls === "crypto" ? "btc" : ""} l${Math.min(4, m.logo.length)}">${esc(m.logo)}</span><span class="n"><b>${esc(ltName(P, m))}</b><small>${P.dir > 0 ? "long" : "short"} ${esc(lvSize(P, I))} · <span data-f="px"></span></small></span><span class="v"><b class="num" data-f="pnl"></b><small data-f="r"></small></span></div>`; }).join("")}</div>`;
    const card = el.querySelector(".lthome"); if (card) card.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); MK.homeY = $("#hmHome").scrollTop; mkShow("trades"); } };
  }
  ltLive();
}

/* ---------- on a chart page: your other open trades ---------- */
function ltMiniHTML(k) {
  const open = lvOpenList(), others = open.filter(P => P.key !== k).sort((a, b) => b.t0 - a.t0), L = ltLogged(); if (!open.length && !L.length) return "";
  const net = L.reduce((a, p) => a + (p.net || 0), 0);
  return `<div class="q ltmini"><span class="qk">Live trades · ${open.length} open</span>
    ${others.map(P => { const m = lvMkt(P), I = m && mkSpec(m); if (!m) return ""; return `<button class="ltmr" data-ltk="${esc(P.key)}" data-ltid="${P.id}"><span><b>${esc(ltName(P, m))}</b> ${P.dir > 0 ? "long" : "short"} · ${esc(lvSize(P, I))}</span><b class="num" data-f="pnl"></b></button>`; }).join("")}
    ${open.length && !others.length ? `<p class="small" style="margin:0">This is your only open trade.</p>` : ""}
    <button class="btn" data-lt>All live trades${L.length ? ` · ${L.length} closed, ${fusd(net)}` : ""} ▸</button></div>`;
}

/* ---------- the stock paper account (chart pages of stocks) ---------- */
function stkCardHTML() {
  const K = SK(), sk = lvOpenList().filter(P => P.kind === "stk"), upl = sk.reduce((a, P) => a + lvUPL(P), 0), wr = K.n ? Math.round(K.wins / K.n * 100) : 0;
  return `<div class="q stkacct"><span class="qk">Stock paper account</span>
    <div class="sa3"><span><small>Equity</small><b class="num" id="stkEq">${fbal(K.bal + upl)}</b></span><span><small>Free cash</small><b class="num">${fbal(Math.max(0, K.bal - stkUsed()))}</b></span><span><small>Closed P&amp;L</small><b class="num ${toneOf(K.net)}">${fusd(K.net)}</b></span></div>
    <p class="small" style="margin:0">Virtual ${fbal(K.start)}, separate from your prop account. ${K.n ? `${K.n} closed trade${K.n === 1 ? "" : "s"} · ${wr}% won.` : "No closed stock trades yet."} A position can't cost more than your free cash, and a short uses it the same way.</p>
    ${sk.length ? `<p class="small" style="margin:0">You can reset this account once your ${sk.length === 1 ? "open stock trade is" : sk.length + " open stock trades are"} closed.</p>` : `<button class="btn" id="stkReset">Reset the stock account to ${fbal(STK_START)}</button>`}</div>`;
}
function lvTicketStkHTML(m) {
  const Q = MK.q[m.k], st = mktStatus(m.cls), n = lvTicketStk(m, Q), plan = lvState().plan, SL = ST.stkLots || (ST.stkLots = { auto: true, n: 10 }), I = mkSpec(m), K = SK();
  const age = Q && Q.ts ? Date.now() - Q.ts : null, stale = age != null && age > 20 * 6e4, ok = MK.st === "ready" && st.open && !!n && !n.z.none && !LV.busy;
  const chips = (id, vals, cur, fmt) => `<div class="chips" id="${id}">${vals.map(v => `<button class="chip" data-v="${v}" aria-pressed="${cur === v}">${fmt(v)}</button>`).join("")}</div>`;
  const why = MK.st !== "ready" ? (shReading() && SH.canWrite !== true ? "The shared feed is view-only. Live paper trading needs your own copy of Chart Wizard with your own FMP connector." : "Connect FMP to trade live.")
    : !st.open ? `US stocks trade 9:30 am to 4 pm New York time, Monday to Friday; the market is ${esc(st.label.toLowerCase())} now. Orders open again ${fLocal(st.next)}.`
    : !Q ? "Waiting for a price…" : !n ? "Loading daily candles to size the stop…" : n.z.none ? "Not enough free cash for one share. Close a stock trade first." : stale ? `FMP's latest price is ${Math.round(age / 6e4)} minutes old; the order will try for a fresher one.` : "";
  const shares = `<div class="lotrow2"><span class="small">Shares</span><div class="seg" role="group" aria-label="Number of shares"><button data-sh="auto" aria-pressed="${SL.auto}">Auto</button><button data-sh="set" aria-pressed="${!SL.auto}">Set</button></div>${!SL.auto ? `<button class="btn" id="lvsm" aria-label="One fewer share">−</button><input id="lvsn" class="lvsn" type="number" inputmode="numeric" min="1" step="1" value="${Math.max(1, SL.n | 0)}" aria-label="Number of shares"><button class="btn" id="lvsp" aria-label="One more share">+</button>` : ""}</div>`;
  return `<div class="q"><span class="qk">Paper trade · stock account ${fbal(K.bal)}</span>
    ${why ? `<p class="small ${!st.open || stale || (n && n.z.none) ? "warn" : ""}" style="margin:0">${why}</p>` : ""}
    <div class="plan"><span>Stop</span>${chips("lvstop", [0.25, 0.5, 1], plan.stop, v => `${v} ATR`)}<span>Target</span>${chips("lvtgt", [1, 1.5, 2, 3], plan.tgt, v => `${v}R`)}<span>Risk</span>${chips("lvsrisk", [0.25, 0.5, 1, 2], ST.stkRisk || 1, v => `${v}%`)}</div>
    ${shares}
    <p class="small" style="margin:0">${n && !n.z.none ? `<b>${n.qty} share${n.qty === 1 ? "" : "s"}</b> (${fbal(n.qty * n.e)} of ${fbal(n.cash)} free cash) · stop ${fnum(I, n.sd)} away (${plan.stop} × daily ATR ${fnum(I, n.A)}) · risking <b>${fbal(n.risk)}</b> (${(n.risk / Math.max(1, K.bal) * 100).toFixed(2)}% of the account) · target ${plan.tgt}R` : "Size appears once the price and daily candles load."}</p>
    ${n && n.z.capped ? `<p class="small warn" style="margin:0">Capped by your free cash: ${n.qty} share${n.qty === 1 ? " is" : "s are"} all ${fbal(n.cash)} buys.</p>` : ""}
    ${n && n.z.tooWide ? `<p class="small warn" style="margin:0">Even 1 share risks more than ${n.pct}% of the account at this stop, so the order is for 1 share.</p>` : ""}
    <div class="orders big"><button class="ord sell" id="lvsell" ${ok ? "" : "disabled"}><b>${LV.busy ? "…" : "SELL"}</b><span>${Q ? fnum(I, Q.p) : "—"}</span></button><button class="ord buy" id="lvbuy" ${ok ? "" : "disabled"}><b>${LV.busy ? "…" : "BUY"}</b><span>${Q ? fnum(I, Q.p) : "—"}</span></button></div>
    <p class="small ordnote">Buy to profit if ${esc(m.fmp)} rises; sell (a short) to profit if it falls. Fills at FMP's latest price with virtual cash and no commission. While this app is open the price is checked ${lvIv(m)}, and your stop and target are tested against it, including the day's high and low. If the app is closed, the trade is settled from the daily candles when you come back.</p></div>`;
}

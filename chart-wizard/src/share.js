/* ================= SHARED FEED (this artifact's own store) ================= */
// Connectors run only for the page's owner and people in the owner's Claude organisation. Anyone else who opens a shared link
// gets no connector at all, so their page can never load FMP, whatever they connect on their own account.
// So the owner's page saves what it loads to this artifact's shared store, and every other signed-in viewer reads it from
// there: live while the owner has the page open, otherwise the last saved prices, shown with their time.
const SHK = "chart-wizard-share-v1";
const SH = { db: null, user: null, st: "wait", role: null, canWrite: null, un: [], at: 0, stocks: null, got: false, empty: false, slow: false, slowT: 0, err: null, timer: 0, busy: false, wrote: {}, lastBoard: 0, hist: {}, H: {}, pause: 0, writes: 0 };
const SH_Q = ["p", "ch", "pct", "lo", "hi", "o", "pc", "v", "yh", "yl", "a50", "a200", "cap", "ts", "at"];
const SH_KEY = /^(BTC|ES|GC|SI|BZ|s:[A-Z][A-Z0-9.\-]{0,6})$/, SH_TICK = /^[A-Z][A-Z0-9.\-]{0,6}$/;
const SH_WHY = "Connectors only work for the page's owner, so this view can't load FMP itself, even with FMP connected on your own Claude account.";
const shReading = () => SH.role === "read";
const shId = k => String(k).replace(/[^A-Za-z0-9_-]/g, "_");
const mkStocks = () => shReading() && SH.stocks && SH.stocks.length ? SH.stocks : HS().stocks;

function shBoot() {
  try { const w = JSON.parse(localStorage.getItem(SHK) || "null"); if (w && typeof w === "object") SH.wrote = w; } catch (e) {}
  let tries = 0;
  const go = () => {
    const c = window.claude;
    if (!c || typeof c.use !== "function") { if (++tries < 40) { setTimeout(go, 250); return; } SH.st = "none"; mkRenderSoon(); return; }
    Promise.all([Promise.resolve(c.use("db")).catch(() => null), Promise.resolve(c.use("user")).catch(() => null)]).then(async ([db, user]) => {
      SH.db = db && typeof db.doc === "function" ? db : null; SH.user = user || null;
      if (SH.user && typeof SH.user.isOwner === "function") { try { SH.canWrite = !!(await SH.user.isOwner()); } catch (e) { SH.canWrite = null; } }
      SH.st = SH.db ? "ready" : "none"; mkRenderSoon();
    }).catch(() => { SH.st = "none"; mkRenderSoon(); });
  };
  go();
}
function shSync() { // the owner's page saves; a view with no working connector reads
  if (SH.st !== "ready") return;
  const want = MK.st === "ready" ? "write" : MK.st === "none" || MK.st === "err" ? "read" : null;
  if (want === SH.role) return;
  if (SH.role === "read") { for (const u of SH.un) { try { u(); } catch (e) {} } SH.un = []; clearTimeout(SH.slowT); SH.got = false; SH.slow = false; }
  SH.role = want;
  if (want === "read") shRead(); else if (want === "write") shQueue();
}

/* ---------- reading (viewers) ---------- */
function shRead() {
  SH.slowT = setTimeout(() => { if (!SH.got) { SH.slow = true; mkRenderSoon(); } }, 10000);
  try {
    SH.un.push(SH.db.doc("live/board").onSnapshot(shOnBoard, e => { SH.err = e || { code: "unavailable" }; SH.got = true; clearTimeout(SH.slowT); mkRenderSoon(); }));
    SH.un.push(SH.db.doc("live/news").onSnapshot(shOnNews, () => {}));
    SH.un.push(SH.db.doc("live/events").onSnapshot(shOnEvents, () => {}));
  } catch (e) { SH.err = { code: "unavailable", message: String(e && e.message || e) }; SH.got = true; clearTimeout(SH.slowT); }
}
function shCleanQ(x) { if (!x || typeof x !== "object") return null; const q = {}; for (const f of SH_Q) q[f] = numv(x[f]); if (q.p == null || q.p <= 0) return null; q.name = x.name ? String(x.name).slice(0, 40) : null; return q; }
function shOnBoard(s) { // shared data is someone else's input: keep only well-formed numbers and known markets
  if (!shReading()) return;
  const d = s && s.exists ? s.data() : null;
  if (!d && s && s.metadata && s.metadata.fromCache) return; // wait for the store's own answer
  SH.got = true; SH.slow = false; clearTimeout(SH.slowT);
  const at = d ? numv(d.at) : null;
  if (!d || !at || !Array.isArray(d.rows)) { SH.empty = true; mkRenderSoon(); return; }
  const q = {}, sp = {};
  for (const r of d.rows.slice(0, 40)) {
    if (!r || typeof r.k !== "string" || !SH_KEY.test(r.k)) continue;
    const Q = shCleanQ(r.q); if (Q) q[r.k] = Q;
    if (Array.isArray(r.sp)) { const v = r.sp.map(numv).filter(x => x != null && x > 0).slice(-30); if (v.length > 1) sp[r.k] = v; }
  }
  SH.stocks = (Array.isArray(d.stocks) ? d.stocks : []).map(String).filter(t => SH_TICK.test(t)).slice(0, 24);
  for (const t of SH.stocks) { const m = stkDef(t), Q = q[m.k]; if (Q && Q.name && !STK_NAME[t]) m.name = Q.name.slice(0, 22); }
  const old = MK.snap.q || {}; for (const k of Object.keys(q)) if (old[k] && old[k].p !== q[k].p) MK.flash[k] = q[k].p > old[k].p ? 1 : -1;
  SH.empty = !Object.keys(q).length; SH.at = Math.min(at, Date.now()); MK.snap = { q, sp, at: SH.at };
  mkRenderSoon();
}
function shOnNews(s) {
  if (!shReading()) return;
  const d = s && s.exists ? s.data() : null, at = d ? numv(d.at) : null; if (!d || !at || !Array.isArray(d.items)) return;
  nwInit(); if (at <= NW.at && NW.items.length) return;
  const items = [];
  for (const x of d.items.slice(0, 40)) {
    if (!x || typeof x !== "object" || !x.k || !x.title || !numv(x.t)) continue;
    let link = null; try { const u = new URL(String(x.link || "")); if (u.protocol === "https:") link = u.href; } catch (e) {}
    const syms = (Array.isArray(x.syms) ? x.syms : []).map(String).filter(t => SH_TICK.test(t)).slice(0, 5), title = String(x.title).replace(/\s+/g, " ").slice(0, 220);
    const pts = (Array.isArray(x.pts) ? x.pts : []).slice(0, 3).map(p => String(p).slice(0, 260)), sum = String(x.sum || "").slice(0, 320);
    items.push({ k: "n" + String(x.k).replace(/[^a-z0-9]/gi, "").slice(0, 16), raw: String(x.raw || "").slice(0, 30), t: Math.min(+x.t, Date.now()), title, pts, sum, body: "", syms, link, site: String(x.site || "FMP").slice(0, 40), tags: nwTags(title, pts.join(" ") + " " + sum, "", syms) });
  }
  if (!items.length) return;
  NW.items = items.sort((a, b) => b.t - a.t); NW.at = Math.min(at, Date.now()); NW.first = false; NW.more = false; NW.dirty = true; mkRenderSoon();
}
function shOnEvents(s) { // each stock's earnings and analyst lines, as the owner's page last loaded them
  if (!shReading()) return; const d = s && s.exists ? s.data() : null; if (!d || !d.ev || typeof d.ev !== "object") return;
  for (const t of Object.keys(d.ev).slice(0, 40)) { const x = d.ev[t], at = x && numv(x.at); if (!SH_TICK.test(t) || !at || !Array.isArray(x.lines)) continue; NW.ev[t] = { at: Math.min(at, Date.now()), lines: x.lines.map(l => String(l).slice(0, 240)).slice(0, 4) }; }
  mkRenderSoon();
}
function shCleanH(d) {
  const n = d && Array.isArray(d.d) ? d.d.length : 0; if (n < 2 || n > 600) return null; const H = { d: [], o: [], h: [], l: [], c: [], v: [] }, at = (a, i) => a && numv(a[i]) > 0 ? +a[i] : null;
  for (let i = 0; i < n; i++) {
    const ds = String(d.d[i]).slice(0, 10), c = at(d.c, i); if (!/^\d{4}-\d\d-\d\d$/.test(ds) || c == null || (H.d.length && ds <= H.d[H.d.length - 1])) continue;
    const o = at(d.o, i) || c; H.d.push(ds); H.o.push(o); H.h.push(Math.max(o, c, at(d.h, i) || c)); H.l.push(Math.min(o, c, at(d.l, i) || c)); H.c.push(c); H.v.push(at(d.vol, i) || 0);
  }
  H.n = H.d.length; return H.n > 1 ? H : null;
}
function shHist(k) { // daily candles for a viewer's chart, fetched once per market per visit
  if (!shReading() || !SH.db || SH.hist[k]) return; SH.hist[k] = "wait";
  SH.db.doc("hist/" + shId(k)).get().then(s => { const H = s && s.exists ? shCleanH(s.data()) : null; SH.hist[k] = H ? "ok" : "none"; if (H) SH.H[k] = H; mkRenderSoon(); }, () => { SH.hist[k] = "none"; mkRenderSoon(); });
}

/* ---------- saving (the owner) ---------- */
function shQueue(ms) { if (SH.role !== "write" || SH.canWrite === false || !SH.db || SH.timer) return; SH.timer = setTimeout(() => { SH.timer = 0; shWrite(); }, ms || 6000); }
function shMergeH(old, H) { // keep the older candles already saved when the fresh series is shorter
  if (!old || !Array.isArray(old.d)) return null; const i = old.d.findIndex(x => String(x) >= H.d[0]), cut = i < 0 ? old.d.length : i; if (cut < 1) return null;
  const tk = f => (Array.isArray(old[f]) ? old[f] : []).slice(0, cut), d = tk("d"), o = tk("o"), h = tk("h"), l = tk("l"), c = tk("c"), v = tk("vol");
  if ([o, h, l, c, v].some(a => a.length !== d.length)) return null;
  const M = { d: d.concat(H.d), o: o.concat(H.o), h: h.concat(H.h), l: l.concat(H.l), c: c.concat(H.c), v: v.concat(H.v) }, x = M.d.length - 420;
  if (x > 0) for (const f of Object.keys(M)) M[f] = M[f].slice(x);
  return M;
}
async function shWrite() { // one write at a time, and only what changed
  if (SH.role !== "write" || SH.canWrite === false || !SH.db || SH.busy || document.hidden) return;
  if (Date.now() < SH.pause) { shQueue(SH.pause - Date.now() + 1000); return; }
  SH.busy = true; let again = 0;
  const put = async (path, body) => { await SH.db.doc(path).set(body); SH.writes++; SH.canWrite = true; };
  try {
    const board = mkBoard(), rows = [];
    for (const m of board) { const Q = MK.q[m.k], H = MK.h[m.k] || MK.s[m.k]; if (!Q) continue; const q = {}; for (const f of SH_Q) if (Q[f] != null) q[f] = Q[f]; if (m.cls === "stk" && m.name && m.name !== m.fmp) q.name = m.name; const r = { k: m.k, q }; if (H && H.c.length > 1) r.sp = H.c.slice(-30); rows.push(r); }
    const fpB = JSON.stringify([HS().stocks, rows.map(r => [r.k, r.q.p, r.q.ts, r.sp ? r.sp.length : 0])]);
    if (rows.length && fpB !== SH.wrote.board) { const wait = 45000 - (Date.now() - SH.lastBoard); if (wait > 0) again = wait + 500; else { await put("live/board", { v: 1, at: Date.now(), stocks: HS().stocks.slice(0, 24), rows }); SH.wrote.board = fpB; SH.lastBoard = Date.now(); } }
    if (NW.at && NW.items.length && SH.wrote.news !== NW.at) { await put("live/news", { v: 1, at: NW.at, utc: !!NW.utc, items: NW.items.slice(0, 25).map(x => ({ k: x.k, raw: x.raw, t: x.t, title: x.title, pts: x.pts, sum: x.sum, syms: x.syms, link: x.link || "", site: x.site })) }); SH.wrote.news = NW.at; }
    const evs = {}; for (const t of Object.keys(NW.ev)) { const x = NW.ev[t]; if (x && x.at && x.lines && x.lines.length && SH_TICK.test(t)) evs[t] = { at: x.at, lines: x.lines }; }
    const fpE = JSON.stringify(Object.keys(evs).sort().map(t => [t, evs[t].at]));
    if (Object.keys(evs).length && fpE !== SH.wrote.ev) { await put("live/events", { v: 1, at: Date.now(), ev: evs }); SH.wrote.ev = fpE; }
    const sel = MKDEF[MK.sel], list = sel && !board.includes(sel) ? board.concat(sel) : board;
    for (const m of list) {
      let H = MK.h[m.k] || MK.s[m.k]; if (!H || H.n < 2) continue;
      const fp = `${H.d[H.n - 1]}|${H.c[H.n - 1]}`, id = "h:" + m.k, w = SH.wrote[id];
      if (w && w.fp === fp && w.n >= H.n) continue;
      const ref = SH.db.doc("hist/" + shId(m.k));
      if (w && w.n > H.n) { try { const s = await ref.get(), M = s && s.exists ? shMergeH(s.data(), H) : null; if (M) H = Object.assign(M, { n: M.d.length }); } catch (e) {} }
      await put("hist/" + shId(m.k), { v: 1, at: Date.now(), k: m.k, n: H.n, d: H.d, o: H.o, h: H.h, l: H.l, c: H.c, vol: H.v }); SH.wrote[id] = { fp, n: H.n };
      await new Promise(r => setTimeout(r, 350));
    }
    try { localStorage.setItem(SHK, JSON.stringify(SH.wrote)); } catch (e) {}
  } catch (e) {
    const c = e && e.code;
    if (c === "invalid_argument" || c === "not_granted" || c === "revoked" || c === "capability_disabled" || c === "capability_removed") SH.canWrite = false; // this viewer may not save: stop asking
    else SH.pause = Date.now() + (c === "quota_exceeded" ? 36e5 : 12e4);
  } finally { SH.busy = false; if (again) shQueue(again); }
}

/* ---------- what a viewer is told ---------- */
function shBanner() {
  const own = SH.canWrite === true;
  if (shReading() && SH.at && !SH.empty) return `<div class="hmban info"><span><b>You're seeing ${own ? "your" : "the owner's"} shared feed</b>, last updated ${fLocal(SH.at)} (${fAgo(SH.at)}). ${own ? "FMP isn't connected in this view, so these are the prices your page last saved." : `It updates while the owner has Chart Wizard open. ${SH_WHY} For your own live prices and live paper trading, ask the owner for your own copy of the app.`}</span></div>`;
  if (own) return `<div class="hmban info"><span><b>Live prices need your FMP connector.</b> They work when Chart Wizard is open inside Claude (web, desktop or mobile app) while you're signed in.${MK.snap.at ? ` Below are the prices saved on this device at ${fLocal(MK.snap.at)}.` : ""}</span></div>`;
  if (SH.st === "wait" || (shReading() && !SH.got && !SH.slow)) return `<div class="hmban info"><span><b>Loading the owner's shared prices…</b></span></div>`;
  if (shReading() && !SH.got) return `<div class="hmban"><span><b>The owner's shared prices can't be reached yet.</b> This page keeps trying. ${SH_WHY}</span></div>`;
  if (shReading()) return `<div class="hmban info"><span><b>No shared prices yet.</b> ${SH_WHY} Prices appear here once the owner opens Chart Wizard with FMP connected.</span></div>`;
  return `<div class="hmban info"><span><b>Live prices can't load in this view.</b> ${SH_WHY} Sign in to Claude and open the link again to see the prices the owner's page shares.${MK.snap.at ? ` Below are the prices saved on this device at ${fLocal(MK.snap.at)}.` : ""}</span></div>`;
}

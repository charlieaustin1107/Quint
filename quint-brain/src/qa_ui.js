/* ================= QUINT: the interface ================= */
const QA = { view: "brain", B: {}, flash: 0 };
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const tk = m => m.k.replace(/^s:/, "");
const tfLab = { "1m": "1M", "5m": "5M", "15m": "15M", "1h": "1H", "1D": "1D" };
const ukT = ms => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const nyT = ms => { const e = etNow(ms); return `${String(Math.floor(e.min / 60)).padStart(2, "0")}:${String(e.min % 60).padStart(2, "0")}`; };
const dkShot = async () => null; // the brief carries the numbers; no picture is sent, which keeps each question cheaper
function hcPaint() { drawTape(); drawScope(); paintVerdict(); }
function hcSetTf(tf) { if (!["1m", "5m", "15m", "1h"].includes(tf)) return false; HC.tf = tf; ST.set.tf = tf; save(); const m = dkM(); const n = tf === "1m" ? 120 : tf === "5m" ? 300 : tf === "15m" ? 320 : 240; dkBars(m.tv, tf, n).then(B => { QA.B[tf] = B; drawScope(); }).catch(() => {}); if (QA.view === "matrix") paintSide(); return true; }

function paintAll() { paintHead(); paintDeck(); paintSide(); dkPaint(true); paintChips(); }
function paintHead() {
  const st = $("#stat"), f = mktStatus("fut"), Q = MK.q[DK.k]; if (!st) return;
  const [cls, txt] = MK.st === "none" ? ["off", "Open in Claude"] : MK.st === "err" ? ["off", "TradingView needed"] : MK.st === "wait" ? ["wait", "Connecting"] : tvCooling() ? ["off", `Cooling · ${Math.max(1, Math.ceil((TVQ.until - Date.now()) / 6e4))}m`] : f.open ? (MK.tvLive ? ["on", "Live · CME"] : ["wait", Q && Q.delay ? `Delayed ${Math.round(Q.delay / 60)}m` : "Globex open"]) : ["wait", f.label];
  st.className = "stat " + cls; st.lastChild.textContent = txt; paintAge();
  const r = dkRec(), n = dkAls().filter(a => !a.gone && a.exp > Date.now()).length;
  $('.seg [data-v="record"]').innerHTML = `Record${r.n ? `<span class="n">${r.w}–${r.n - r.w}</span>` : ""}`;
  $('.seg [data-v="alerts"]').innerHTML = `Alerts${n ? `<span class="n">${n}</span>` : ""}`;
}
function fillMarkets() {
  const sel = $("#mk"); sel.innerHTML = FUT_G.map(([g, l]) => `<optgroup label="${esc(l)}">${FUT_KEYS.filter(k => MKDEF[k].grp === g).map(k => `<option value="${k}" ${k === DK.k ? "selected" : ""}>${esc(k)} · ${esc(MKDEF[k].name)}</option>`).join("")}</optgroup>`).join("");
  sel.onchange = () => { DK.k = MK.sel = ST.set.k = sel.value; save(); DK.img = null; DK.lv = null; QA.B = {}; DK.lights = [0, 0, 0, 0, 0]; const m = dkM(); $("#q").placeholder = `Ask Quint: buy or sell ${tk(m)}?`; paintAll(); if (MK.st === "ready") { const F = fdLoad(m.tv); if (F.m1) fdQuote(m.tv, F); qaScan(true); } };
}

/* ---------- the verdict in the core ---------- */
function liveCall() { const now = Date.now(); return dkCalls().find(c => c.k === DK.k && (c.st === "live" || c.st === "skip") && now - c.t < (Math.max(30, c.hold || 30) + (c.side ? c.hold || 30 : 0)) * 6e4) || null; }
function brFeed() { // the line along the bottom of the brain: everything at a glance, whichever way it's turned
  const el = $("#bfeed"); if (!el) return; const m = dkM(), S = mkSpec(m), Q = MK.q[m.k], C = liveCall(), rows = ["1D", "1h", "15m", "5m"].map(mxRow), L = DK.lv, ar = r => r ? (r.tr > 0 ? "▲" : r.tr < 0 ? "▼" : "◆") : "·";
  const bits = [`${MK.tvLive ? "LIVE FEED" : "FEED"} — QUINT · ${tk(m)}${Q ? ` ${fnum(S, Q.p)}${Q.pct != null ? ` ${Q.pct >= 0 ? "+" : "−"}${Math.abs(Q.pct).toFixed(2)}%` : ""}` : ""}`, DK.busy ? "THINKING" : C && C.side ? `CALL ${C.side > 0 ? "BUY" : "SELL"}${C.conf != null ? ` ${Math.min(85, C.conf)}%` : ""} · ENTRY ${fnum(S, C.entry)} · STOP ${fnum(S, C.stop)} · TARGET ${fnum(S, C.tgt)}` : C ? "CALL NO TRADE" : "READY",
    `1D ${ar(rows[0])} 1H ${ar(rows[1])} 15M ${ar(rows[2])} 5M ${ar(rows[3])}`, L && L.vw ? `VWAP ${fnum(S, L.vw)}` : "", MK.x ? MK.x.rows.filter(r => isFinite(r.ch)).slice(0, 3).map(r => `${({ "CME_MINI:ES1!": "ES", "CBOT_MINI:YM1!": "YM", "CME_MINI:RTY1!": "RTY" })[r.s] || ""} ${r.ch >= 0 ? "+" : "−"}${Math.abs(r.ch).toFixed(2)}%`).join(" ") : "", `NY ${nyT(Date.now())}`, tvCooling() ? "TRADINGVIEW COOLING DOWN" : ""];
  el.textContent = bits.filter(Boolean).join("   ·   ");
}
function paintVerdict() { brFeed();
  const v = $("#vd"), m = dkM(), C = liveCall(), Q = MK.q[m.k]; if (!v) return; let cls = "", big, sub;
  if (DK.busy) { big = "Thinking"; sub = DK.prog || "Reading the charts"; }
  else if (C && C.side) { cls = C.side > 0 ? "buy" : "sell"; big = C.side > 0 ? "Buy" : "Sell"; sub = `${C.conf != null ? Math.min(85, C.conf) + "% · " : ""}${C.ty === "lim" ? "limit " + fnum(mkSpec(m), C.entry) : fAgo(C.t)}`; }
  else if (C) { big = "Stand by"; sub = C.wait ? `Wait for ${C.wait}`.slice(0, 60) : "No trade right now"; }
  else if (MK.st === "none") { big = "Offline"; sub = "Open Quint inside Claude"; }
  else if (MK.st === "err") { big = "No feed"; sub = "Connect TradingView in Claude"; }
  else if (MK.st === "wait") { big = "Booting"; sub = "Connecting to TradingView"; }
  else if (tvCooling()) { big = "Cooling"; sub = `TradingView back at ${ukT(TVQ.until)}`; }
  else { big = "Ready"; sub = "Ask for a call"; }
  v.className = "verdict " + cls; v.innerHTML = `<b>${esc(big)}</b><small>${esc(sub)}</small>`;
  const dm = $("#dminv"); if (dm) { dm.textContent = big.toUpperCase(); dm.style.color = cls === "buy" ? "var(--buy)" : cls === "sell" ? "var(--sell)" : "var(--amber)"; }
  const dp = $("#dminp"); if (dp) dp.textContent = Q ? `${tk(m)} ${fnum(mkSpec(m), Q.p)}` : tk(m);
  coreKick();
}
function paintAge() {
  const el = $("#rfa"), b = $("#rf"); if (!el) return; const m = dkM(), F = FD[m.tv], t = F && F.m1 && F.m1.n ? (F.m1.t[F.m1.n - 1] + 60) * 1000 : null, a = t ? Math.max(0, Date.now() - t) : null;
  el.textContent = QA.rfBusy ? "…" : a == null ? "" : a < 9e4 ? "now" : a < 36e5 ? `${Math.round(a / 6e4)}m` : a < 864e5 ? `${Math.round(a / 36e5)}h` : `${Math.round(a / 864e5)}d`;
  b.classList.toggle("old", a != null && a > 6e5 && mktStatus(m.cls).open); b.disabled = !!QA.rfBusy || MK.st !== "ready"; b.title = `Refresh ${tk(m)} from TradingView (1 call · ${tvLeft()} of ${tvPlan()} left today)`;
}
function paintDeck() {
  drawTape(); drawSess(); paintVerdict(); paintAge(); const m = dkM(), Q = MK.q[m.k];
  $("#dkl").textContent = Q && Q.ts ? `${tk(m)} · ${ukT(Q.ts)} UK` : tk(m);
  $("#dkr").textContent = `NY ${nyT(Date.now())}`;
}

/* ---------- canvas helpers ---------- */
function fitCanvas(cv) { const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1), w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height)); if (cv.width !== w * d || cv.height !== h * d) { cv.width = w * d; cv.height = h * d; } const x = cv.getContext("2d"); x.setTransform(d, 0, 0, d, 0, 0); return { x, w, h }; }
const niceStep = raw => { const p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2.5 : f < 7.5 ? 5 : 10) * p; };
const CSSV = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const COL = {}; function cols() { if (!COL.amber) for (const k of ["amber", "amber2", "buy", "sell", "warn", "ink", "dim", "faint", "line", "line2", "glass", "glass2"]) COL[k] = CSSV("--" + k); return COL; }

/* the key levels of today's session, for the tape and the matrix */
function sessLevels(m) {
  const L = DK.lv, out = []; if (L) {
    const add = (k, p, kind, t) => { if (p != null && isFinite(p)) out.push({ k, p, kind, t }); };
    add("PDH", L.pvh, "r", "Previous New York high"); add("PDL", L.pvl, "s", "Previous New York low"); add("ONH", L.oh, "r", "Overnight high"); add("ONL", L.ol, "s", "Overnight low");
    add("ORH", L.orh, "r", "Opening range high (9:30-9:45 NY)"); add("ORL", L.orl, "s", "Opening range low"); add("VWAP", L.vw, "v", "Session VWAP"); add("NYO", L.ro, "n", "New York open");
  }
  if (HC.lvl && HC.lvl.k === m.k) for (const x of HC.lvl.arr) out.push({ k: x.lab.replace(/^Quint /i, "").slice(0, 10).toUpperCase(), p: x.p, kind: /stop/i.test(x.lab) ? "qs" : /target/i.test(x.lab) ? "qt" : /entry/i.test(x.lab) ? "qe" : "q", t: x.lab, q: 1 });
  return out;
}
function atrOf(tf) { const B = QA.B[tf]; if (!B || B.n < 20) return null; const A = qtATR(B); return A[B.n - 1]; }

/* ---------- the price tape: price in the middle, levels above and below, like an altimeter ---------- */
function drawTape() {
  const cv = $("#tape"); if (!cv || !cv.offsetParent) return; const { x, w, h } = fitCanvas(cv), C = cols(), m = dkM(), S = mkSpec(m), Q = MK.q[m.k], B5 = QA.B["5m"];
  x.clearRect(0, 0, w, h); const px = Q ? Q.p : B5 ? B5.c[B5.n - 1] : null;
  x.font = "600 10px 'Chakra Petch', sans-serif"; x.textBaseline = "middle";
  if (px == null) { x.fillStyle = C.faint; x.textAlign = "center"; x.fillText(MK.st === "ready" ? "AWAITING PRICE" : "NO FEED", w / 2, h / 2); return; }
  const lv = sessLevels(m), a15 = atrOf("15m") || px * 0.0015, aD = atrOf("1D") || a15 * 8, ds = lv.map(l => Math.abs(l.p - px)).sort((a, b) => a - b);
  const half = Math.max(S.tick * 12, Math.min(aD * 1.3, Math.max(a15 * 3, (ds[3] != null ? ds[3] : ds[ds.length - 1] || 0) * 1.12))), mid = h / 2, k = (mid - 14) / half, Y = p => mid - (p - px) * k;
  // the scale
  const step = niceStep(half / 3.2), sub = step / 5, top = px + half, bot = px - half;
  x.strokeStyle = C.line2; x.lineWidth = 1; x.beginPath(); x.moveTo(50.5, 6); x.lineTo(50.5, h - 6); x.stroke();
  for (let v = Math.ceil(bot / sub) * sub; v <= top; v += sub) { const y = Math.round(Y(v)) + 0.5, maj = Math.abs(v / step - Math.round(v / step)) < 1e-6; x.strokeStyle = maj ? C.dim : C.line2; x.beginPath(); x.moveTo(maj ? 42 : 46, y); x.lineTo(50, y); x.stroke();
    if (maj && Math.abs(y - mid) > 16) { x.fillStyle = C.faint; x.textAlign = "right"; x.font = "500 9px 'Martian Mono', monospace"; x.fillText(nf(Math.max(0, S.dec - (step >= 1 ? S.dec : 0))).format(v), 39, y); } }
  // levels on the right, nudged apart so labels never overlap
  const vis = lv.map(l => ({ ...l, y: Y(l.p), off: l.p > top ? 1 : l.p < bot ? -1 : 0 })).map(l => ({ ...l, ly: clamp(l.y, 9, h - 9) })).sort((a, b) => a.ly - b.ly);
  // labels keep clear of the price box in the middle: those above stack upwards from it, those below downwards
  const upL = vis.filter(l => l.ly < mid || (l.ly === mid && l.p >= px)).sort((a, b) => b.ly - a.ly), dnL = vis.filter(l => !upL.includes(l)).sort((a, b) => a.ly - b.ly);
  let lim = mid - 17; for (const l of upL) { l.ly = Math.min(l.ly, lim); lim = l.ly - 12; } lim = mid + 17; for (const l of dnL) { l.ly = Math.max(l.ly, lim); lim = l.ly + 12; }
  for (const l of upL) l.ly = Math.max(8, l.ly); for (const l of dnL) l.ly = Math.min(h - 8, l.ly);
  const colOf = l => l.kind === "qs" ? C.sell : l.kind === "qt" ? C.buy : l.kind === "qe" ? C.ink : l.kind === "q" ? C.amber2 : l.kind === "r" ? "rgba(255,79,110,.85)" : l.kind === "s" ? "rgba(47,217,168,.85)" : l.kind === "v" ? "#b9a6ff" : C.dim;
  for (const l of vis) { const c = colOf(l);
    if (!l.off) { x.strokeStyle = c; x.globalAlpha = l.q ? 0.9 : 0.45; x.setLineDash(l.q ? [] : [3, 3]); x.lineWidth = l.q ? 1.5 : 1; x.beginPath(); x.moveTo(52, Math.round(l.y) + 0.5); x.lineTo(w - 4, Math.round(l.y) + 0.5); x.stroke(); x.setLineDash([]); x.globalAlpha = 1; }
    const d = l.p - px, lab = `${l.off > 0 ? "▲ " : l.off < 0 ? "▼ " : ""}${l.k} ${fnum(S, l.p)}`, ext = l.off ? ` ${d > 0 ? "+" : "−"}${nf(S.dec > 2 ? S.dec : 0).format(Math.abs(d))}` : "";
    x.font = `${l.q ? 700 : 600} 9.5px 'Chakra Petch', sans-serif`; const tw = x.measureText(lab + ext).width + 8;
    x.fillStyle = "rgba(3,6,11,.82)"; x.fillRect(w - 4 - tw, l.ly - 6, tw, 12); x.fillStyle = c; x.textAlign = "right"; x.fillText(lab + ext, w - 8, l.ly + 0.5); }
  // the price box
  const S5 = B5 && B5.n > 3 ? (B5.c[B5.n - 1] - B5.c[B5.n - 4]) : 0, fl = QA.flash; QA.flash = 0;
  x.fillStyle = "rgba(3,6,11,.94)"; x.strokeStyle = C.amber; x.lineWidth = 1.5; x.beginPath(); x.moveTo(2, mid - 13); x.lineTo(112, mid - 13); x.lineTo(122, mid); x.lineTo(112, mid + 13); x.lineTo(2, mid + 13); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = fl > 0 ? C.buy : fl < 0 ? C.sell : C.amber2; x.font = "700 13px 'Martian Mono', monospace"; x.textAlign = "left"; x.fillText(fnum(S, px), 8, mid + 0.5);
  x.font = "600 9px 'Chakra Petch', sans-serif"; x.fillStyle = S5 > 0 ? C.buy : S5 < 0 ? C.sell : C.dim; x.textAlign = "left"; x.fillText(`${S5 > 0 ? "▲" : S5 < 0 ? "▼" : "•"} ${nf(S.dec > 2 ? S.dec : 0).format(Math.abs(S5))} /15m`, 8, mid + 22);
}

/* ---------- the core: five lights (daily, hourly, 15m, 5m, calendar) around Quint's verdict ---------- */
let coreRAF = 0, coreLast = 0;
function coreKick() { BR.dirty = true; if (!coreRAF) coreRAF = requestAnimationFrame(coreFrame); }
function coreFrame(t) { // the deck's little brain and, in the Brain view, the big one
  coreRAF = 0; const touch = BR.pts.size > 0, glide = brGlide(), busy = DK.busy || QT.speaking || DK.lights.some(v => v === 1), gap = touch || glide ? 16 : busy ? 33 : 66;
  if (t - coreLast >= gap || RM) { coreLast = t; if (BR.dirty) { BR.dirty = false; brBuild(); } drawCore(t); const bc = $("#brain"); if (bc && bc.offsetParent) brDraw(bc, t, true); }
  if ((!RM || touch || glide) && !document.hidden) coreRAF = requestAnimationFrame(coreFrame);
}
function drawCore(t) { const cv = $("#core"); if (cv && cv.offsetParent) brDraw(cv, t, false); }

/* ---------- the session tape: where we are in the futures day, in UK and New York time ---------- */
const SESS = [[-360, 120, "Asia"], [120, 480, "London"], [480, 570, "NY pre"], [570, 660, "NY open"], [660, 840, "Midday"], [840, 960, "Close"], [960, 1020, "After"], [1020, 1080, "Break"]];
function drawSess() {
  const cv = $("#sess"); if (!cv || !cv.offsetParent) return; const { x, w, h } = fitCanvas(cv), C = cols(), now = Date.now(), span = 10 * 36e5, t0 = now - span * 0.38, X = ms => (ms - t0) / span * w;
  x.clearRect(0, 0, w, h); x.textBaseline = "middle";
  for (let dd = -1; dd <= 1; dd++) for (const [a, b, lab] of SESS) { const s0 = etAt(now, dd, a), s1 = etAt(now, dd, b), x0 = X(s0), x1 = X(s1); if (x1 < 0 || x0 > w) continue;
    const key = lab === "NY open", brk = lab === "Break"; x.fillStyle = key ? "rgba(41,216,255,.55)" : brk ? "rgba(255,79,110,.25)" : "rgba(122,142,168,.22)"; x.fillRect(x0 + 1, h - 7, Math.max(0, x1 - x0 - 2), 4);
    x.font = "600 8.5px 'Chakra Petch', sans-serif"; x.fillStyle = key ? C.amber2 : C.faint; x.textAlign = "left"; const lx = Math.max(x0 + 3, 2), xnow = X(now); if (x1 - lx > 30 && (lx > xnow + 130 || lx + 48 < xnow - 4)) x.fillText(lab.toUpperCase(), lx, h - 15); }
  for (let ms = Math.ceil(t0 / 36e5) * 36e5; ms < t0 + span; ms += 36e5) { const xx = Math.round(X(ms)) + 0.5; x.strokeStyle = C.line2; x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, 5); x.stroke(); x.font = "500 8.5px 'Martian Mono', monospace"; x.fillStyle = C.faint; x.textAlign = "center"; x.fillText(ukT(ms).slice(0, 2), xx, 11); }
  const ev = DK.cal && DK.cal.list ? DK.cal.list.filter(e => e.imp >= 1 && e.t > t0 && e.t < t0 + span) : [];
  for (const e of ev) { const xx = X(e.t); x.fillStyle = C.warn; x.beginPath(); x.moveTo(xx, h - 11); x.lineTo(xx + 4, h - 7); x.lineTo(xx, h - 3); x.lineTo(xx - 4, h - 7); x.closePath(); x.fill(); }
  const xn = Math.round(X(now)) + 0.5; x.strokeStyle = C.amber; x.lineWidth = 1.5; x.beginPath(); x.moveTo(xn, 3); x.lineTo(xn, h - 2); x.stroke(); x.lineWidth = 1;
  x.font = "700 9px 'Martian Mono', monospace"; x.textAlign = "left"; x.fillStyle = C.amber2; const lab = `${ukT(now)} UK · ${nyT(now)} NY`; x.fillText(lab, Math.min(xn + 6, w - x.measureText(lab).width - 4), 22);
}

/* ---------- the scope: a small candle chart with Quint's levels ---------- */
function drawScope() {
  const cv = $("#scope"); if (!cv || !cv.offsetParent) return; const { x, w, h } = fitCanvas(cv), C = cols(), m = dkM(), S = mkSpec(m), B = QA.B[HC.tf]; x.clearRect(0, 0, w, h);
  if (!B || B.n < 5) { x.fillStyle = C.faint; x.font = "600 10px 'Chakra Petch', sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("LOADING CANDLES", w / 2, h / 2); return; }
  const N = Math.min(B.n, Math.max(30, Math.floor((w - 52) / 5))), a = B.n - N, e20 = dkEma(B.c, 20); let hi = -Infinity, lo = Infinity;
  for (let i = a; i < B.n; i++) { hi = Math.max(hi, B.h[i]); lo = Math.min(lo, B.l[i]); }
  const lv = sessLevels(m).filter(l => l.p < hi + (hi - lo) * 0.25 && l.p > lo - (hi - lo) * 0.25); for (const l of lv) { hi = Math.max(hi, l.p); lo = Math.min(lo, l.p); }
  const pad = (hi - lo) * 0.06 || S.tick * 4, H = hi + pad, L = lo - pad, Y = p => 8 + (H - p) / (H - L) * (h - 22), cw = (w - 52) / N;
  x.strokeStyle = C.line; x.lineWidth = 1; const st = niceStep((H - L) / 4); x.font = "500 8.5px 'Martian Mono', monospace"; x.fillStyle = C.faint; x.textAlign = "left"; x.textBaseline = "middle";
  for (let v = Math.ceil(L / st) * st; v < H; v += st) { const y = Math.round(Y(v)) + 0.5; x.beginPath(); x.moveTo(0, y); x.lineTo(w - 50, y); x.stroke(); x.fillText(nf(st >= 1 ? 0 : S.dec).format(v), w - 46, y); }
  for (const l of lv) { const y = Math.round(Y(l.p)) + 0.5; x.strokeStyle = l.kind === "qs" ? C.sell : l.kind === "qt" ? C.buy : l.kind === "qe" ? C.ink : l.kind === "v" ? "#b9a6ff" : "rgba(41,216,255,.55)"; x.setLineDash(l.q ? [] : [3, 3]); x.beginPath(); x.moveTo(0, y); x.lineTo(w - 50, y); x.stroke(); x.setLineDash([]); x.fillStyle = x.strokeStyle; x.font = "600 8.5px 'Chakra Petch', sans-serif"; x.fillText(l.k, 3, y - 6); }
  for (let i = a; i < B.n; i++) { const xx = (i - a) * cw + cw / 2, up = B.c[i] >= B.o[i]; x.strokeStyle = x.fillStyle = up ? C.buy : C.sell; x.globalAlpha = 0.9; x.beginPath(); x.moveTo(Math.round(xx) + 0.5, Y(B.h[i])); x.lineTo(Math.round(xx) + 0.5, Y(B.l[i])); x.stroke(); const y0 = Y(Math.max(B.o[i], B.c[i])), y1 = Y(Math.min(B.o[i], B.c[i])); x.fillRect(xx - Math.max(1, cw * 0.32), y0, Math.max(2, cw * 0.64), Math.max(1, y1 - y0)); x.globalAlpha = 1; }
  x.strokeStyle = C.amber; x.lineWidth = 1.3; x.beginPath(); for (let i = a; i < B.n; i++) { const xx = (i - a) * cw + cw / 2, y = Y(e20[i]); i === a ? x.moveTo(xx, y) : x.lineTo(xx, y); } x.stroke(); x.lineWidth = 1;
  const lc = B.c[B.n - 1], yl = Y(lc); x.fillStyle = C.amber; x.fillRect(w - 50, yl - 7, 50, 14); x.fillStyle = "#1b1203"; x.font = "700 8.5px 'Martian Mono', monospace"; x.fillText(fnum(S, lc), w - 47, yl);
  x.fillStyle = C.faint; x.font = "500 8.5px 'Martian Mono', monospace"; x.textAlign = "left"; x.fillText(`${tfLab[HC.tf]} · EMA20 · ${N} candles`, 3, h - 6);
}

/* ---------- the matrix: every timeframe at a glance, worked out here without asking Claude ---------- */
function mxRow(tf) {
  const B = QA.B[tf]; if (!B || B.n < 30) return null; const c = B.c, L = B.n - 1, e20 = dkEma(c, 20), e50 = dkEma(c, 50), A = qtATR(B)[L] || 0, R = dkRsi(c)[L], sl = e20[L] - e20[Math.max(0, L - 5)];
  const tr = e20[L] > e50[L] && sl > 0 ? 1 : e20[L] < e50[L] && sl < 0 ? -1 : 0; return { tf, tr, rsi: R, atr: A, vs: A ? (c[L] - e20[L]) / A : 0, last: c[L] };
}
function machineRead(m, rows) {
  const S = mkSpec(m), Q = MK.q[m.k], px = Q ? Q.p : rows[3] ? rows[3].last : null; if (px == null || !rows.some(Boolean)) return "Reading the market…";
  const w = r => r ? (r.tr > 0 ? "up" : r.tr < 0 ? "down" : "flat") : "–", [d, h1, m15, m5] = rows, parts = [];
  parts.push(`Daily <b>${w(d)}</b>, hourly <b>${w(h1)}</b>, 15-minute <b>${w(m15)}</b>, 5-minute <b>${w(m5)}</b>.`);
  if (d && h1 && m15 && d.tr && d.tr === h1.tr && h1.tr === m15.tr) parts.push(`The timeframes agree: the path of least resistance is <b>${d.tr > 0 ? "up" : "down"}</b>.`);
  else if (h1 && m15 && h1.tr && m15.tr && h1.tr !== m15.tr) parts.push(`The 15-minute is moving against the hourly: a ${m15.tr < 0 ? "pullback in an uptrend" : "bounce in a downtrend"} until it breaks.`);
  const L = DK.lv; if (L) { const rel = (p, n) => p == null ? null : `${px > p ? "above" : "below"} ${n} ${fnum(S, p)}`, r = [rel(L.vw, "VWAP"), L.orh != null ? (px > L.orh ? `above the opening range` : px < L.orl ? `below the opening range` : `inside the opening range`) : null].filter(Boolean); if (r.length) parts.push(`Price is ${r.join(" and ")}.`); }
  const lv = sessLevels(m).filter(l => !l.q), up = lv.filter(l => l.p > px).sort((a, b) => a.p - b.p)[0], dn = lv.filter(l => l.p < px).sort((a, b) => b.p - a.p)[0], pv = S.mpv || S.pv, pts = v => nf(S.dec > 2 ? S.dec : 0).format(v);
  if (up) parts.push(`Resistance <b>${up.k} ${fnum(S, up.p)}</b> is ${pts(up.p - px)} points up ($${nf(0).format((up.p - px) * pv)} a ${S.micro || S.sym}).`);
  if (dn) parts.push(`Support <b>${dn.k} ${fnum(S, dn.p)}</b> is ${pts(px - dn.p)} points down.`);
  if (m5 && m5.rsi > 70) parts.push("5-minute RSI is stretched above 70."); else if (m5 && m5.rsi < 30) parts.push("5-minute RSI is washed out below 30.");
  return parts.join(" ");
}
function paintSide() {
  const el = $("#side"); if (!el) return; const v = QA.view === "console" && matchMedia("(min-width: 900px)").matches ? "matrix" : QA.view;
  el.classList.toggle("bv", v === "brain");
  if (v === "brain") { if (!$("#brain", el)) { el.innerHTML = `<div class="brainbox"><canvas id="brain" tabindex="0" role="img" aria-label="Quint's brain in 3D: six layers from what he reads to what he decides. Drag to turn it, tap a neuron to read it."></canvas><p class="bhint">Drag to turn · double-tap to reset · tap a neuron</p><div class="binfo" id="binfo" hidden></div><div class="feed" aria-hidden="true"><span id="bfeed"></span></div></div>`; brBind($("#brain")); } brFeed(); BR.dirty = true; coreKick(); return; }
  if (v === "console") { el.innerHTML = ""; return; }
  if (v === "record") { el.innerHTML = recordHTML(); return; }
  if (v === "alerts") { el.innerHTML = alertsHTML(); return; }
  const m = dkM(), S = mkSpec(m), Q = MK.q[m.k], rows = ["1D", "1h", "15m", "5m"].map(mxRow), px = Q ? Q.p : rows[3] && rows[3].last, pv = S.mpv || S.pv;
  const trd = r => r ? `<span class="tr ${r.tr > 0 ? "up" : r.tr < 0 ? "dn" : "fl"}">${r.tr > 0 ? "▲ UP" : r.tr < 0 ? "▼ DOWN" : "◆ FLAT"}</span>` : "–";
  const lv = sessLevels(m).filter(l => !l.q).concat(HC.lvl && HC.lvl.k === m.k ? sessLevels(m).filter(l => l.q) : []).sort((a, b) => b.p - a.p);
  const ev = DK.cal && DK.cal.list ? DK.cal.list.filter(e => e.t > Date.now() - 36e5 && e.imp >= 0).slice(0, 6) : null, X = MK.x;
  el.innerHTML = `<div><h2 class="h">Machine read <span class="spacer"></span><span class="num" style="letter-spacing:0">${Q && Q.ts ? esc(fAgo(Q.ts)) : ""}</span></h2><p class="read">${machineRead(m, rows)}</p></div>
    <div><h2 class="h">Signal matrix · ${esc(tk(m))}</h2><table class="mx"><thead><tr><th>TF</th><th>Trend</th><th>RSI 14</th><th>ATR</th><th>vs EMA20</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${["1D", "1H", "15M", "5M"][i]}</td><td>${trd(r)}</td><td>${r ? `${Math.round(r.rsi)}<span class="rsi" aria-hidden="true"><i style="left:${clamp(r.rsi, 0, 100)}%"></i></span>` : "–"}</td><td>${r ? nf(S.dec > 2 ? S.dec : 1).format(r.atr) : "–"}</td><td class="${r && r.vs > 0 ? "pos" : r && r.vs < 0 ? "neg" : ""}">${r ? `${r.vs >= 0 ? "+" : "−"}${Math.abs(r.vs).toFixed(1)} ATR` : "–"}</td></tr>`).join("")}</tbody></table></div>
    ${pilHTML(m)}
    <div><h2 class="h">Scope <span class="spacer"></span><span class="tfs" role="group" aria-label="Candle size">${["1m", "5m", "15m", "1h"].map(t => `<button type="button" data-tf="${t}" aria-pressed="${HC.tf === t}">${t}</button>`).join("")}</span></h2><canvas id="scope" role="img" aria-label="${esc(tk(m))} ${esc(TF_NAME[HC.tf] || "")} candles with the 20 EMA and today's levels"></canvas></div>
    <div><h2 class="h">Levels today</h2>${lv.length && px != null ? `<div class="lv">${lv.map(l => `<span class="k" style="color:${l.kind === "r" || l.kind === "qs" ? "var(--sell)" : l.kind === "s" || l.kind === "qt" ? "var(--buy)" : l.kind === "v" ? "#b9a6ff" : "var(--amber2)"}">${esc(l.k)}</span><span class="t">${esc(l.t)}</span><span class="p">${fnum(S, l.p)}</span><span class="d ${l.p > px ? "pos" : "neg"}">${l.p > px ? "+" : "−"}${nf(S.dec > 2 ? S.dec : 0).format(Math.abs(l.p - px))} · $${nf(0).format(Math.abs(l.p - px) * pv)}</span>`).join("")}</div><p class="small" style="margin-top:6px">Distance in points and in dollars for one ${esc(S.micro || S.sym)}.</p>` : `<p class="small">${MK.st === "ready" ? "Working out today's levels…" : "Levels appear once TradingView is connected."}</p>`}</div>
    ${X ? `<div><h2 class="h">Around Nasdaq</h2><div class="xm">${X.rows.map(r => `<div><small>${esc(({ "CME_MINI:ES1!": "S&P ES", "CBOT_MINI:YM1!": "Dow YM", "CME_MINI:RTY1!": "Russell", "CBOT:ZN1!": "10Y note", "TVC:DXY": "Dollar", "CBOE:VIX": "VIX" })[r.s])}</small><b class="${r.ch > 0 ? "pos" : r.ch < 0 ? "neg" : ""}">${isFinite(r.ch) ? `${r.ch >= 0 ? "+" : "−"}${Math.abs(r.ch).toFixed(2)}%` : "–"}</b></div>`).join("")}</div></div>` : ""}
    <div><h2 class="h">US calendar</h2>${ev ? ev.length ? `<div class="ev">${ev.map(e => `<div><span class="tm">${esc(new Date(e.t).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" }))}</span><span class="${e.imp >= 1 ? "hi" : ""}">${e.imp >= 1 ? "◆ " : ""}${esc(e.title)}</span></div>`).join("")}</div>` : `<p class="small">No US releases in the next two days.</p>` : `<p class="small">Loading the calendar…</p>`}</div>`;
  $$("[data-tf]", el).forEach(b => b.onclick = () => hcSetTf(b.dataset.tf)); requestAnimationFrame(drawScope);
}
function pilHTML(m) { // your 5-pillar playbook on the latest 5-minute candle, from the candles on hand (no calls)
  let X = null; try { X = pxNow(FD[m.tv]); } catch (e) {} if (!X) return "";
  const e = X.ev, S = mkSpec(m), f = v => fnum(S, v), names = ["Location", "Liquidity sweep", "CISD", "Displacement", "Execution"];
  const det = [e.poi ? `${e.poi.name} ${e.poi.lvl ? f(e.poi.lo) : `${f(e.poi.lo)}–${f(e.poi.hi)}`}` : "no higher-timeframe level here", e.sw ? `${e.sw.levelKind} ${f(e.sw.lvl)}` : "", e.ci && e.ci.lvl != null ? `level ${f(e.ci.lvl)}` : "", e.dp && e.dp.i > 0 ? `${e.dp.body.toFixed(1)}× ATR body${e.dp.fvg ? ", left a gap" : ""}` : "", e.ex && e.ex.z ? `${e.ex.z.kind} ${f(e.ex.z.lo)}–${f(e.ex.z.hi)} · stop ${f(e.ex.stop)} · target ${f(e.ex.tgt)} · ${e.ex.rr.toFixed(1)}R` : ""];
  const all = X.ok.every(Boolean), miss = X.ok.indexOf(false);
  return `<div class="pil"><h2 class="h">5-pillar playbook · ${e.d > 0 ? "long" : "short"} side <span class="spacer"></span><span class="num" style="letter-spacing:0">5m · ${esc(X.rg || "")}</span></h2><ol>${names.map((n, i) => `<li class="${X.ok[i] ? "ok" : ""}"><b>${X.ok[i] ? "✓" : i + 1}</b><span><b style="all:unset;font-weight:600">${n}</b>${det[i] ? ` · <span class="small">${esc(det[i])}</span>` : ""}</span></li>`).join("")}</ol>
    <p class="pv ${all ? "ok" : ""}">${all ? "All five in place: a valid playbook entry. Ask Quint for the exact order." : `Waiting on pillar ${miss + 1}: ${names[miss].toLowerCase()}.`}</p></div>`;
}
function recordHTML() {
  const r = dkRec(), L = dkCalls().slice(0, 40), cl = Math.min(85, r.conf);
  return `<div><h2 class="h">Quint's record</h2>${r.n ? `<div class="tiles"><div><small>Graded calls</small><b>${r.n}</b></div><div><small>Win rate</small><b>${r.wr}%</b></div><div><small>Total</small><b class="${r.R >= 0 ? "pos" : "neg"}">${r.R >= 0 ? "+" : "−"}${Math.abs(r.R).toFixed(1)}R</b></div><div><small>Said · actual</small><b>${cl}% · ${r.wr}%</b></div></div>
      <div style="margin-top:12px"><div class="cal" aria-label="Confidence he gave against how often he was right"><i class="s" style="left:${cl}%"></i><i class="a" style="left:${r.wr}%"></i></div><p class="small" style="margin-top:8px"><span style="color:var(--amber)">▮</span> the confidence he gave · <span style="color:var(--ink)">▮</span> how often he was right. Close together means his percentages can be trusted.</p></div>` : `<p class="small">No graded calls yet. Every call is checked against TradingView's 1-minute candles once its time has passed: a candle that touches both the stop and the target counts as a loss.</p>`}</div>
    ${L.length ? `<div class="rows">${L.map(c => `<div class="row"><span class="w">${esc(new Date(c.t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</span><span><b>${c.side > 0 ? "Buy" : c.side < 0 ? "Sell" : "No trade"}</b> ${esc(c.k)}${c.conf != null ? ` · ${Math.min(85, c.conf)}%` : ""}${c.src === "shot" ? " · screenshot" : ""}</span><span class="r st-${esc(c.st)}">${esc((DK_ST[c.st] || c.st).replace(/^[^A-Za-z]+/, ""))}${c.R != null ? ` ${c.R >= 0 ? "+" : "−"}${Math.abs(c.R).toFixed(2)}R` : ""}</span></div>`).join("")}</div>` : ""}
    <p class="small">${r.live ? `${r.live} still being tracked. ` : ""}${r.skip ? `${r.skip} times he said stay out. ` : ""}These are tracked calls, not real trades, and past results don't promise future ones.</p>`;
}
function alertsHTML() {
  const A = DK.al, cond = { cross_up: "rises to", cross_down: "falls to", cross: "crosses", greater: "goes above", less: "goes below" };
  const row = x => { const id = +x.alert_id || +x.id, k = FUT_KEYS.find(q => MKDEF[q].tv === x.symbol), S = k ? MKSPEC[k] : null, th = x.threshold != null ? x.threshold : x.price;
    return `<div class="al${x.active ? "" : " off"}"><span><b>${esc(x.name || "Alert")}</b><small>${esc(k || x.symbol || "")} ${esc(cond[x.condition_type] || x.condition_type || "")} ${th != null ? esc(S ? fnum(S, +th) : String(th)) : ""} · ${x.active ? "on" : "off"}${x.expiration ? ` · ends ${esc(dkAlTime(x.expiration))}` : ""}</small></span><button class="btn sm" type="button" data-aldel="${id}">${DK.alConf[id] ? "Tap again" : "Delete"}</button></div>`; };
  const on = A && A.list ? A.list.filter(x => x.active) : [], off = A && A.list ? A.list.filter(x => !x.active).slice(0, 8) : [];
  return `<div><h2 class="h">TradingView alerts <span class="spacer"></span><button class="btn sm" type="button" id="alr" ${DK.alBusy ? "disabled" : ""}>${DK.alBusy ? "Loading" : "Refresh"}</button></h2>
    ${!A ? `<p class="small">Loading your alerts…</p>` : A.err ? `<p class="err">${esc(A.err)}</p>` : `${on.length ? `<div>${on.map(row).join("")}</div>` : `<p class="small">No alerts are on. Ask Quint for a call, then tap an alert button on it.</p>`}${off.length ? `<h2 class="h" style="margin-top:14px">Finished or off</h2><div>${off.map(row).join("")}</div>` : ""}
    <h2 class="h" style="margin-top:14px">Fired in the last 7 days</h2>${A.log && A.log.length ? A.log.map(e => `<div class="al"><span><b>${esc(e.name || e.alert_name || e.message || "Alert")}</b><small>${esc(dkAlTime(e.fire_time || e.time || e.timestamp || e.fired_at))}${e.symbol ? " · " + esc(e.symbol) : ""}</small></span></div>`).join("") : `<p class="small">None yet. An alert fires only when price reaches its level.</p>`}`}</div>
    <div class="note"><p class="small" style="color:var(--ink)"><b>How alerts reach your iPhone</b></p><ol class="small"><li>TradingView sends them. Install the TradingView app and sign in with the account you connected to Claude.</li><li>iPhone Settings → Notifications → TradingView: allow notifications.</li><li>Quint's alerts fire once, then switch off, and each ends when its trade plan runs out.</li><li>Your TradingView plan limits how many alerts can be on at once. Delete old ones here.</li><li>${MK.tvLive ? "Your TradingView has real-time CME data, so alerts trigger on the live price." : "Without real-time CME data, TradingView futures run about 10 minutes behind, and alerts most likely trigger on that delayed price too."}</li></ol></div>`;
}
const dkAlTime = v => { const t = typeof v === "number" ? (v < 1e12 ? v * 1000 : v) : Date.parse(v); return isFinite(t) ? new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""; };
async function dkAlertsLoad(force) {
  if (DK.alBusy) return; if (!force && DK.al && Date.now() - DK.al.at < 6e4) { paintSide(); return; } DK.alBusy = true; paintSide();
  try { const [a, g] = await Promise.all([tvCall("mcp-tv-list-alerts", {}, false), tvCall("mcp-tv-get-alerts-log", { days: 7, limit: 30 }, false).catch(() => null)]);
    const list = (a && (a.alerts || a.items || a.data)) || (Array.isArray(a) ? a : []), log = (g && (g.events || g.log || g.alerts || g.items || g.data)) || (Array.isArray(g) ? g : []);
    DK.al = { at: Date.now(), list: list.slice(0, 60), log: log.slice(0, 20) }; const ids = new Set(DK.al.list.map(x => +x.alert_id || +x.id)); dkAls().forEach(x => { if (!ids.has(+x.id)) x.gone = 1; }); save(); }
  catch (e) { DK.al = { at: Date.now(), list: [], log: [], err: dkAlertErr(e) }; }
  finally { DK.alBusy = false; paintSide(); paintHead(); }
}
async function dkAlertDel(btn) {
  const id = +btn.dataset.aldel; if (!id) return; if (!DK.alConf[id]) { DK.alConf[id] = 1; btn.textContent = "Tap again"; setTimeout(() => { delete DK.alConf[id]; }, 4000); return; }
  delete DK.alConf[id]; btn.disabled = true; btn.textContent = "Deleting";
  try { await tvCall("mcp-tv-delete-alert", { alert_ids: [id] }, false); dkAls().forEach(x => { if (+x.id === id) x.gone = 1; }); save(); hmToast("Alert deleted from your TradingView."); } catch (e) { hmToast(dkAlertErr(e)); }
  DK.al = null; dkAlertsLoad(true);
}

/* ---------- the conversation ---------- */
function dkCallHTML(C, m) {
  const S = mkSpec(m), f = x => fnum(S, x), conf = C.conf != null ? Math.min(85, C.conf) : null, cls = C.side > 0 ? "buy" : C.side < 0 ? "sell" : "none";
  const ring = conf != null ? `<span class="ring" style="--p:${conf}" aria-label="${conf}% sure"><b>${conf}%</b></span>` : "";
  if (!C.side) return `<div class="call none"><div class="ch"><span class="v">No trade · ${esc(tk(m))}</span>${ring}</div>${C.wait ? `<p class="cmeta">Wait for <b>${esc(C.wait)}</b>.</p>` : ""}${C.tv && Date.now() - C.t < 864e5 ? dkCallAlerts(C, m) : ""}</div>`;
  if (C.st === "bad") return `<div class="call ${cls}"><div class="ch"><span class="v">${C.side > 0 ? "Buy" : "Sell"} · ${esc(tk(m))}</span></div><p class="cw">The stop or target is on the wrong side of the entry, so this call isn't tracked. Ask Quint again.</p></div>`;
  const sd = Math.abs(C.entry - C.stop), R = Math.abs(C.tgt - C.entry) / sd, z = qaSize(m, sd), done = C.st !== "live", P = lvPosFor(m.k), mine = P && P.cid === C.id;
  return `<div class="call ${cls}"><div class="ch"><span class="v">${C.side > 0 ? "Buy" : "Sell"} · ${esc(tk(m))}</span>${ring}</div>
    <div class="lvls"><div><small>Entry</small><b>${f(C.entry)}</b><em>${C.ty === "lim" ? "limit" : "at market"}</em></div><div><small>Stop</small><b class="neg">${f(C.stop)}</b><em>−${nf(S.dec > 2 ? S.dec : 2).format(sd)}</em></div><div><small>Target</small><b class="pos">${f(C.tgt)}</b><em>${R.toFixed(1)}R</em></div></div>
    <p class="cmeta">${z ? `${z.qty > 0 ? `<b>${z.qty} ${esc(z.sym)}</b> for your ${fbal(z.A.risk)} risk (${fbal(z.risk)} if stopped)` : `Your ${fbal(z.A.risk)} risk is smaller than one ${esc(z.sym)} at this stop`} · ` : ""}hold up to ${C.hold >= 90 ? (C.hold / 60).toFixed(C.hold % 60 ? 1 : 0) + " h" : C.hold + " min"} · ${esc(C.tf)}</p>
    ${dkWarn(C, m).map(w => `<p class="cw">⚠ ${esc(w)}</p>`).join("")}
    <span class="cst ${esc(C.st)}">${esc((DK_ST[C.st] || C.st).replace(/^[^A-Za-z]+/, ""))}${C.R != null ? ` · ${C.R >= 0 ? "+" : "−"}${Math.abs(C.R).toFixed(2)}R` : ""}</span>
    ${!done ? `<div class="acts"><button class="chipb${mine ? " on" : ""}" type="button" data-in="${C.id}">${mine ? "✓ I'm in · tap when out" : "I took it"}</button></div>${C.tv ? dkCallAlerts(C, m) : ""}` : ""}</div>`;
}
function dkCallAlerts(C, m) {
  if (!m || !m.tv) return ""; const f = x => fnum(mkSpec(m), x), b = (kind, lab, p) => { const a = dkAlFor(C.id, kind); return `<button class="chipb${a ? " on" : ""}" type="button" data-cal="${C.id}:${kind}" ${a ? "disabled" : ""}>${a ? "✓ " : "◉ "}${lab} ${f(p)}</button>`; };
  let h = ""; if (C.side) { if (C.ty === "lim") h += b("e", "Entry", C.entry); h += b("s", "Stop", C.stop) + b("t", "Target", C.tgt); } else { const w = dkAlertWait(C, m); if (w != null) h += b("w", "Wait level", w); }
  return h ? `<div class="acts" aria-label="Alert my phone through TradingView">${h}</div>` : "";
}
async function dkCallAlert(btn) {
  const [id, kind] = btn.dataset.cal.split(":"), C = dkCallById(+id), m = C && MKDEF[C.k]; if (!C || !m) return; const f = x => fnum(mkSpec(m), x);
  const end = C.t + (Math.max(30, C.hold) + (kind === "e" || kind === "w" ? 0 : C.hold)) * 6e4, min = Math.max(20, (end - Date.now()) / 6e4), side = C.side > 0 ? "BUY" : "SELL", plan = `stop ${f(C.stop)}, target ${f(C.tgt)}`;
  const spec = { e: [C.entry, side, `Quint's limit entry. Plan: ${plan}.`, "entry"], s: [C.stop, "EXIT", `Quint's stop for your ${side === "BUY" ? "long" : "short"} from ${f(C.entry)} was hit: close it if you're still in.`, "stop"], t: [C.tgt, "EXIT", `Quint's target for your ${side === "BUY" ? "long" : "short"} from ${f(C.entry)} was reached: take profit.`, "target"], w: [dkAlertWait(C, m), "WATCH", `Quint said wait for ${String(C.wait || "").slice(0, 120)}. Ask him for a fresh call now.`, "wait"] }[kind];
  if (!spec || spec[0] == null) return; btn.disabled = true; btn.textContent = "Setting…";
  const r = await dkAlertMake(m, spec[0], null, spec[1], spec[2], { cid: C.id, kind, min, lab: spec[3] });
  if (r.ok) hmToast(`Alert set: ${tk(m)} ${r.d === "up" ? "rising to" : r.d === "down" ? "falling to" : "at"} ${f(spec[0])}. TradingView will notify your phone.`); else { btn.disabled = false; hmToast(r.msg); }
  dkPaint(false); paintHead();
}
function dkExtras(x, i) {
  if (x.busy || !x.t) return ""; let h = ""; const code = []; x.t.replace(/```[a-z]*\s*\n([\s\S]*?)```/gi, (_, c) => { if (/\/\/@version\s*=\s*\d/.test(c)) code.push(c); return ""; });
  code.forEach((c, k) => { h += `<button class="xbtn" type="button" data-pine="${i}:${k}">Save this script to my TradingView</button>`; });
  const al = dkAlertLines(x.t), m = dkM(), Q = m && MK.q[m.k], C = x.c ? dkCallById(x.c) : null, onCard = C && C.side && C.st !== "bad" ? [C.entry, C.stop, C.tgt] : [];
  al.slice(0, 3).forEach((a, k) => { if (!m || !m.tv || onCard.some(v => v != null && Math.abs(v - a.p) < 1e-9)) return; const d = Q && Q.p ? (a.p > Q.p ? "up" : a.p < Q.p ? "down" : "cross") : a.dir, done = dkAlFor(x.at, "L" + k), px = esc(fnum(mkSpec(m), a.p));
    h += done ? `<button class="xbtn on" type="button" disabled>✓ Alert set: ${esc(a.act)} ${esc(tk(m))} at ${px}</button>` : `<button class="xbtn" type="button" data-alert="${i}:${k}">◉ Alert my phone: ${esc(a.act)} ${esc(tk(m))} when price ${d === "up" ? "rises to" : d === "down" ? "falls to" : "reaches"} ${px}</button>`; });
  return h;
}
async function dkAlert(btn, m) {
  const [i, k] = btn.dataset.alert.split(":").map(Number), x = dkMsgs(m.k)[i], a = x && dkAlertLines(x.t)[k]; if (!a) return; btn.disabled = true; btn.textContent = "Setting the alert on TradingView…";
  const C = x.c ? dkCallById(x.c) : null, end = C ? C.t + (Math.max(30, C.hold) + (a.act === "EXIT" ? C.hold : 0)) * 6e4 : 0;
  const r = await dkAlertMake(m, a.p, a.dir, a.act, a.note, Object.assign({ cid: x.at, kind: "L" + k }, end ? { min: Math.max(30, (end - Date.now()) / 6e4) } : {}));
  if (r.ok) { hmToast("Alert set. TradingView will notify your phone."); dkPaint(false); paintHead(); } else { btn.disabled = false; btn.textContent = `✗ ${r.msg}`; }
}
async function dkPine(btn) {
  const m = dkM(), [i, k] = btn.dataset.pine.split(":").map(Number), x = dkMsgs(m.k)[i]; if (!x) return; const codes = []; x.t.replace(/```[a-z]*\s*\n([\s\S]*?)```/gi, (_, c) => { if (/\/\/@version\s*=\s*\d/.test(c)) codes.push(c); return ""; }); const code = codes[k]; if (!code) return;
  btn.disabled = true; btn.textContent = "Checking it compiles…";
  try { const v = await tvCall("mcp-tv-validate-pine-script", { code }, false); if (!v || !v.valid) { const er = ((v && v.errors) || [])[0]; btn.textContent = `✗ Doesn't compile${er ? `: line ${er.start && er.start.line}, ${er.message}` : ""}. Ask Quint to fix it.`; return; }
    const nm = ((/(?:indicator|strategy)\(\s*["']([^"']+)/.exec(code) || [])[1] || "Quint script").slice(0, 100), p = await tvCall("mcp-tv-create-pine-script", { code, name: nm }, false);
    btn.textContent = `✓ Saved to your TradingView as “${(p && p.name) || nm}”.`; }
  catch (e) { btn.disabled = false; btn.textContent = /name_taken/i.test(String(e && e.message)) ? "You already have a script with that name on TradingView." : tvWhy(e); }
}
function dkMsgHTML(x, i, m) {
  if (x.r === "u") return `<div class="m u">${x.img ? "[screenshot] " : ""}${esc(x.t)}</div>`;
  const C = x.c ? dkCallById(x.c) : null, body = dkClean(x.t);
  return `<div class="m a" data-i="${i}">${x.now ? `<p class="now">${esc(x.now)}</p>` : ""}${x.busy && !body ? `<p class="think">${esc(DK.prog || "Thinking…")}</p>` : ""}${body ? coachMD(body) : ""}${x.busy && body && DK.prog ? `<p class="think">${esc(DK.prog)}</p>` : ""}${C ? dkCallHTML(C, m) : ""}${dkExtras(x, i)}${x.err ? `<p class="err">${esc(x.err)}</p>` : ""}${!x.busy && body ? `<div class="acts"><button class="chipb say" type="button" aria-pressed="false">Listen</button></div>` : ""}</div>`;
}
function helloHTML(m) {
  const rows = ["1D", "1h", "15m", "5m"].map(mxRow), A = qaAcct();
  return `<div class="hello"><b>Quint online · ${esc(tk(m))}</b><p>${CO.sample ? machineRead(m, rows) : "Quint needs Claude to talk. Open this app inside Claude."}</p><p class="small" style="margin-top:10px">Ask for a call and he answers straight: buy, sell or no trade, with entry, stop and target sized for your ${fbal(A.risk)} risk. Every call is graded afterwards against real candles.</p></div>`;
}
function dkPaint(all) {
  const b = $("#log"); if (!b) return; const m = dkM(), L = dkMsgs(m.k), go = $("#go");
  if (go) { go.classList.toggle("stop", DK.busy); go.setAttribute("aria-label", DK.busy ? "Stop" : "Send"); go.innerHTML = DK.busy ? `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="2" width="10" height="10" fill="currentColor"/></svg>` : `<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h12M10 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
  b.innerHTML = L.length ? L.map((x, i) => dkMsgHTML(x, i, m)).join("") : helloHTML(m);
  if (all) b.scrollTop = b.scrollHeight; paintVerdict(); paintChips();
  if (!DK.busy) { const last = L[L.length - 1]; if (last && last.c && !last.seen) { last.seen = 1; paintHead(); if (QA.view !== "console" && !matchMedia("(min-width: 900px)").matches) setView("console"); } }
}
function dkPaintLast() {
  const b = $("#log"), m = dkM(); if (!b) return; const L = dkMsgs(m.k), i = L.length - 1, el = b.querySelector(`.m.a[data-i="${i}"]`); if (!el || !L[i]) { paintVerdict(); return; }
  const near = b.scrollHeight - b.scrollTop - b.clientHeight < 90; el.outerHTML = dkMsgHTML(L[i], i, m); if (near) b.scrollTop = b.scrollHeight; paintVerdict();
}
const CHIPS = [["call", "Call it now"], ["pil", "5-pillar check"], ["ny", "New York open plan"], ["lv", "Key levels"], ["mg", "Manage my trade"], ["why", "What's moving it"], ["mtf", "Bigger picture"], ["al", "Set my alerts"], ["bt", "Backtest an idea"]];
function paintChips() {
  const el = $("#chips"); if (!el) return; const P = lvPosFor(DK.k);
  el.hidden = DK.busy || !CO.sample; el.innerHTML = CHIPS.filter(([k]) => k !== "mg" || P).map(([k, l]) => `<button type="button" data-qq="${k}">${esc(l)}</button>`).join("");
}
function qaAsk(k) {
  const m = dkM(), n = tk(m), t = $("#q");
  if (k === "bt") { t.value = `Backtest this on ${n}: `; t.focus(); return; }
  if (k === "al") { dkSend(`Set TradingView alerts on my phone for the ${n} levels that matter most right now (two at most), each telling me what to do when price gets there.`); return; }
  dkSend(DK_Q[k](n));
}
function setView(v) { QA.view = v; $("#app").dataset.view = v; $$(".seg [data-v]").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === v)); paintSide(); if (v === "alerts") dkAlertsLoad(false); if (v === "console") { const b = $("#log"); if (b) b.scrollTop = b.scrollHeight; } requestAnimationFrame(() => { drawTape(); drawSess(); coreKick(); }); }
function onLog(e) {
  const m = dkM(); let t;
  if ((t = e.target.closest("[data-qq]"))) { qaAsk(t.dataset.qq); return; }
  if ((t = e.target.closest("[data-cal]"))) { dkCallAlert(t); return; }
  if ((t = e.target.closest("[data-alert]"))) { dkAlert(t, m); return; }
  if ((t = e.target.closest("[data-pine]"))) { dkPine(t); return; }
  if ((t = e.target.closest("[data-in]"))) { const C = dkCallById(+t.dataset.in); if (!C) return; ST.pos = ST.pos || {}; const P = ST.pos[C.k];
    if (P && P.open && P.cid === C.id) { P.open = false; hmToast("Noted: you're out. Quint won't count it as open."); } else { const z = qaSize(MKDEF[C.k], Math.abs(C.entry - C.stop)); ST.pos[C.k] = { open: true, k: C.k, cid: C.id, dir: C.side, qty: Math.max(1, z ? z.qty : 1), e: C.entry, stop: C.stop, tgt: C.tgt, t0: Date.now() }; hmToast("Noted. Quint now treats this as your open trade. Tap again when you're out."); }
    save(); dkPaint(false); return; }
  if ((t = e.target.closest(".say"))) { const i = +t.closest("[data-i]").dataset.i, x = dkMsgs(m.k)[i]; if (x) qaSpeak(x.t, t, m.k); return; }
  if ((t = e.target.closest("[data-aldel]"))) { dkAlertDel(t); return; }
  if (e.target.closest("#alr")) { dkAlertsLoad(true); return; }
}

/* ---------- settings: account, risk, style and voice ---------- */
function openSet() {
  const s = ST.set, sh = $("#sheet");
  sh.innerHTML = `<h2 id="sheth">Settings <span class="spacer"></span><button class="ibtn" type="button" id="setx" aria-label="Close settings">✕</button></h2>
    <div class="two"><div class="fld"><label for="sname">Account</label><input type="text" id="sname" value="${esc(s.name)}" maxlength="40"></div><div class="fld"><label for="ssize">Size ($)</label><input type="number" id="ssize" inputmode="numeric" min="1000" step="1000" value="${esc(s.acct)}"></div></div>
    <div class="fld"><label for="spct">Risk per trade: <span id="spctv">${esc(s.pct)}% = ${fbal(qaAcct().risk)}</span></label><input type="range" id="spct" min="0.25" max="3" step="0.25" value="${esc(s.pct)}"></div>
    <div class="fld"><span class="lab">How you trade</span><div class="opts" role="group" aria-label="How you trade">${[["scalp", "Scalper"], ["day", "Day trader"], ["both", "Both"]].map(([k, l]) => `<button type="button" data-st="${k}" aria-pressed="${TS() === k}">${l}</button>`).join("")}</div></div>
    <div class="fld"><span class="lab">TradingView calls today: <span id="tvu">${tvOut() ? "used up, says TradingView" : s.tvPlanSet ? `${tvUsed()} of ${tvPlan()}` : `${tvUsed()} counted · pick your plan`}</span></span><div class="opts" role="group" aria-label="Your TradingView plan">${TV_PLANS.map(([n, nm]) => `<button type="button" data-tvp="${n}" aria-pressed="${!!s.tvPlanSet && tvPlan() === n}">${esc(nm)} ${n}</button>`).join("")}</div><p class="small">TradingView allows its connector a set number of calls a day on each plan (the AI add-on gives 500). A Quint answer costs about one: he keeps the candles on this phone and fetches only the newest minutes. He refreshes on his own only on Ultimate (every 10 minutes) or the AI add-on (every 2); otherwise tap ↻ or ask him.</p></div>
    <div class="fld"><span class="lab">Quint's voice</span><p class="small" id="vnote"></p><div class="voices" id="vlist"></div></div>
    <div class="fld"><label for="srate">Speaking speed: <span id="sratev">${(+s.rate || 1).toFixed(2)}×</span></label><input type="range" id="srate" min="0.7" max="1.5" step="0.05" value="${esc(s.rate || 1)}"></div>
    <p class="small">Prices come from your TradingView connector${MK.tvLive ? ", with real-time CME data" : " (futures run about 10 minutes behind without real-time CME data)"}. Calls, alerts and settings are kept on this device. Quint makes calls to help you learn and decide; he can be wrong, and nothing here places real orders.</p>`;
  $("#scrim").classList.add("open"); paintVoices();
  $("#setx").onclick = closeSet; $("#scrim").onclick = e => { if (e.target.id === "scrim") closeSet(); };
  $("#sname").oninput = e => { s.name = e.target.value.slice(0, 40); save(); };
  $("#ssize").oninput = e => { const v = +e.target.value; if (v >= 1000) { s.acct = v; save(); $("#spctv").textContent = `${s.pct}% = ${fbal(qaAcct().risk)}`; } };
  $("#spct").oninput = e => { s.pct = +e.target.value; save(); $("#spctv").textContent = `${s.pct}% = ${fbal(qaAcct().risk)}`; };
  $$("[data-st]", sh).forEach(b => b.onclick = () => { s.style = b.dataset.st; save(); $$("[data-st]", sh).forEach(x => x.setAttribute("aria-pressed", x === b)); });
  $$("[data-tvp]", sh).forEach(b => b.onclick = () => { s.tvPlan = +b.dataset.tvp; s.tvPlanSet = 1; save(); $$("[data-tvp]", sh).forEach(x => x.setAttribute("aria-pressed", x === b)); $("#tvu").textContent = tvOut() ? "used up, says TradingView" : `${tvUsed()} of ${tvPlan()}`; });
  $("#srate").oninput = e => { s.rate = +e.target.value; save(); $("#sratev").textContent = `${s.rate.toFixed(2)}×`; try { QT.tts && QT.tts.setRate && QT.tts.setRate(s.rate).catch(() => {}); } catch (err) {} };
  setTimeout(() => $("#setx").focus(), 30);
}
function closeSet() { $("#scrim").classList.remove("open"); paintAll(); $("#setb").focus(); }
function paintVoices() {
  const el = $("#vlist"), note = $("#vnote"); if (!el) return; const s = ST.set;
  if (QT.tts) { note.textContent = "Claude's own voices, available here."; el.innerHTML = ["buttery", "airy", "glassy", "rounded"].map(v => `<button type="button" data-tv="${v}" aria-pressed="${(s.tvoice || "buttery") === v}"><span>${v[0].toUpperCase() + v.slice(1)}</span><small>Claude</small></button>`).join("");
    $$("[data-tv]", el).forEach(b => b.onclick = () => { s.tvoice = b.dataset.tv; save(); paintVoices(); QT.speaking = false; qaSpeak("This is Quint. I'll tell you straight: buy, sell, or stay out.", null); }); return; }
  const vs = voiceList().filter(v => /^en/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a)), cur = voicePick();
  note.innerHTML = `On iPhone the Claude app doesn't let pages use Claude's own voice, so Quint uses your phone's voices. <b>For a much more human voice, download a Premium one:</b> Settings → Accessibility → Spoken Content (Read &amp; Speak on newer iPhones) → Voices → English, then tap a voice marked Premium, such as Ava, Zoe or Evan (US) or Jamie or Serena (UK), and download it. Come back here and tap it. Robotic voices are at the bottom.`;
  el.innerHTML = vs.length ? vs.map(v => `<button type="button" data-vu="${esc(v.voiceURI || v.name)}" aria-pressed="${!!cur && (cur.voiceURI || cur.name) === (v.voiceURI || v.name)}"><span>${esc(v.name.replace(/\s*\(.*\)$/, ""))}${voiceScore(v) < 0 ? " · robotic" : ""}</span><small>${esc(v.lang)}${/premium/i.test(v.name + v.voiceURI) ? " · premium" : /enhanced/i.test(v.name + v.voiceURI) ? " · enhanced" : ""}</small></button>`).join("") : `<p class="small" style="padding:10px 12px">No voices are listed yet. Tap Listen on any answer and they'll load.</p>`;
  $$("[data-vu]", el).forEach(b => b.onclick = () => { s.voice = b.dataset.vu; save(); paintVoices(); QT.speaking = false; qaSpeak("This is Quint. I'll tell you straight: buy, sell, or stay out.", null); });
}

/* ---------- typing on a phone: the instruments fold away and the box sits on the keyboard ---------- */
function fitVV() { const vv = window.visualViewport; if (!vv) return; document.documentElement.style.setProperty("--vvh", vv.height + "px"); $("#app").style.top = vv.offsetTop + "px"; const b = $("#log"); if (b) b.scrollTop = b.scrollHeight; }
function kbOn(on) { const app = $("#app"), vv = window.visualViewport; app.classList.toggle("typing", on && window.innerWidth < 900);
  if (vv) { if (on) { vv.addEventListener("resize", fitVV); vv.addEventListener("scroll", fitVV); fitVV(); } else { vv.removeEventListener("resize", fitVV); vv.removeEventListener("scroll", fitVV); document.documentElement.style.removeProperty("--vvh"); app.style.top = ""; } }
  if (!on) requestAnimationFrame(() => { drawTape(); drawSess(); coreKick(); }); }
function paintImg() { let p = $("#prev"); if (!DK.img) { if (p) p.remove(); return; } if (!p) { p = document.createElement("div"); p.id = "prev"; p.className = "prev"; $("#askf").before(p); } p.innerHTML = `<span>Screenshot attached. Ask a question, or just send.</span><button class="btn sm" type="button" id="imgx">Remove</button>`; $("#imgx").onclick = () => { DK.img = null; paintImg(); }; }

function qaStart() {
  fillMarkets(); const m = dkM(); $("#q").placeholder = `Ask Quint: buy or sell ${tk(m)}?`; setView(QA.view);
  $$(".seg [data-v]").forEach(b => b.onclick = () => setView(b.dataset.v));
  $("#log").addEventListener("click", onLog); $("#side").addEventListener("click", onLog); $("#chips").addEventListener("click", onLog);
  $("#setb").onclick = openSet;
  $("#rf").onclick = () => qaRefresh(true);
  const ta = $("#q"), fit = () => { ta.style.height = "auto"; ta.style.height = Math.min(120, ta.scrollHeight) + "px"; };
  ta.oninput = fit; ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("#askf").requestSubmit(); } };
  ta.addEventListener("focus", () => kbOn(true)); ta.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== ta) kbOn(false); }, 150));
  $("#askf").onsubmit = e => { e.preventDefault(); if (DK.busy) { if (DK.ctl) DK.ctl.abort(); return; } const v = ta.value.trim(); if (!v && !DK.img) return; ta.value = ""; fit();
    if (QA.view !== "console" && !matchMedia("(min-width: 900px)").matches) setView("console"); dkSend(v || "Read my chart and give me your call.", DK.img ? { img: DK.img } : {}); DK.img = null; paintImg(); };
  $("#mic").onclick = () => { if (QA.view !== "console" && !matchMedia("(min-width: 900px)").matches) setView("console"); vmToggle(qbVmO()); };
  $("#file").onchange = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; try { DK.img = await qtShrink(f); paintImg(); ta.focus(); } catch (err) { hmToast("That file couldn't be opened as an image."); } };
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#scrim").classList.contains("open")) { e.preventDefault(); closeSet(); } });
  window.addEventListener("resize", () => { drawTape(); drawSess(); drawScope(); coreKick(); });
  setInterval(() => { drawSess(); paintVerdict(); paintHead(); }, 30000);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawTape(); drawSess(); drawScope(); coreKick(); });
  paintAll(); coreKick(); qaInit();
}

function qbVmO() { // voice mode wired to Quint Brain
  return { input: $("#q"), lang: navigator.language || "en-GB", send: t => { if (QA.view !== "console" && !matchMedia("(min-width: 900px)").matches) setView("console"); dkSend(t); }, speak: (t, done) => { const m = dkM(); qaSpeak(t, null, m ? m.k : "", done); }, hush: qaHush, paint: qbVmPaint };
}
function qbVmPaint(V) {
  const f = $("#askf"), mic = $("#mic"); if (!f) return; let bar = $("#vmbar");
  if (mic) { mic.setAttribute("aria-pressed", V.on); mic.classList.toggle("live", V.st === "listen"); }
  if (!V.on) { if (bar) bar.remove(); return; }
  if (!bar) { bar = document.createElement("div"); bar.id = "vmbar"; f.before(bar); }
  bar.className = "vmbar " + V.st; bar.innerHTML = `<span class="vmorb" aria-hidden="true"></span><span class="vmt" aria-live="polite">${esc(vmLabel(V))}</span><button type="button" class="btn sm vmx" aria-label="End voice mode">End</button>`;
  bar.querySelector(".vmx").onclick = vmEnd;
}

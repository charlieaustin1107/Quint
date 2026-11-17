/* ================= CHART MARKING =================
   Adds TradingView-style drawing to every LiveChart: levels, trend lines, zones and a measuring tool,
   with select, drag, delete and undo. The same chart (candles, volume, EMA 20, crosshair, pan and pinch)
   now also draws the practice and "Spot it" questions, cut off at the question candle so the future stays hidden. */
const LC_TOOLS = [["cur", "✥", "Move and select"], ["h", "—", "Level (horizontal line)"], ["t", "╱", "Trend line"], ["z", "▭", "Zone"], ["m", "⇕", "Measure"]];
const LC_COL = { h: "#ffb547", t: "#29d8ff", z: "#9b6bff" };
(() => {
  const P = LiveChart.prototype, down0 = P.down, move0 = P.move, up0 = P.up, draw0 = P.draw;
  P.fi = function (x) { const g = this.geo(), w = this.win(); return w.b - (g.R - 8 - x) / this.bw() - 0.5; }; // x -> fractional candle index
  P.tOf = function (i) { const a = this.B && this.B.t; if (!a || !a.length) return i; const n = a.length, d = n > 1 ? a[n - 1] - a[n - 2] : 6e4; if (i <= 0) return a[0] + i * (n > 1 ? a[1] - a[0] : d); if (i >= n - 1) return a[n - 1] + (i - n + 1) * d; const k = Math.floor(i); return a[k] + (i - k) * (a[k + 1] - a[k]); };
  P.iOfT = function (t) { const a = this.B && this.B.t; if (!a || !a.length) return t; const n = a.length, d = n > 1 ? a[n - 1] - a[n - 2] : 6e4; if (t <= a[0]) return (t - a[0]) / (n > 1 ? a[1] - a[0] : d); if (t >= a[n - 1]) return n - 1 + (t - a[n - 1]) / d; let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] <= t) lo = m; else hi = m; } return lo + (t - a[lo]) / ((a[hi] - a[lo]) || 1); };
  P.snapP = function (p) { // the price under the finger, pulled onto a candle's open, high, low or close when it's close (like TradingView's magnet)
    const B = this.B, i = clamp(Math.round(this.fi(p.x)), 0, B.n - 1); let best = this.pOf(p.y), bd = 14;
    for (const v of [B.o[i], B.h[i], B.l[i], B.c[i]]) { const d = Math.abs(this.yOf(v) - p.y); if (d < bd) { bd = d; best = v; } } return best;
  };
  P.dpt = function (p) { return { t: this.tOf(this.fi(p.x)), p: this.snapP(p) }; };
  P.xy = function (q) { return { x: this.xOf(this.iOfT(q.t)), y: this.yOf(q.p) }; };
  P.setMode = function (m) { this.mode = m; this.tmp = null; if (m !== "m") this.meas = null; this.cv.style.touchAction = m === "cur" && this.panY ? "pan-y" : "none"; this.cv.style.cursor = m === "cur" ? "crosshair" : "copy"; if (this.onMode) this.onMode(m); this.req(); };
  P.hitD = function (p) { // which drawing (and which handle) is under the finger
    const L = this.dr || [], g = this.geo(), tol = 16;
    for (let k = L.length - 1; k >= 0; k--) { const d = L[k], A = this.xy(d.a), Bp = d.b ? this.xy(d.b) : null;
      if (d.k === "h") { if (Math.abs(A.y - p.y) < tol && p.x < g.R + 60) return { k, h: "all" }; continue; }
      if (Math.hypot(A.x - p.x, A.y - p.y) < tol + 4) return { k, h: "a" }; if (Bp && Math.hypot(Bp.x - p.x, Bp.y - p.y) < tol + 4) return { k, h: "b" };
      if (d.k === "t" && segDist(p.x, p.y, A.x, A.y, Bp.x, Bp.y) < tol) return { k, h: "all" };
      if (d.k === "z") { const x0 = Math.min(A.x, Bp.x), x1 = Math.max(A.x, Bp.x), y0 = Math.min(A.y, Bp.y), y1 = Math.max(A.y, Bp.y); if (p.x > x0 - 6 && p.x < x1 + 6 && p.y > y0 - 6 && p.y < y1 + 6) return { k, h: "all" }; } }
    return null;
  };
  P.saveD = function () { if (this.onDraw) this.onDraw(this.dr); };
  P.pushU = function () { (this.und || (this.und = [])).push(JSON.stringify(this.dr || [])); if (this.und.length > 40) this.und.shift(); };
  P.undoD = function () { if (!this.und || !this.und.length || !this.dr) return; this.dr.splice(0, this.dr.length, ...JSON.parse(this.und.pop())); this.selD = null; this.saveD(); this.req(); if (this.onMode) this.onMode(this.mode || "cur"); };
  P.delD = function () { if (!this.dr) return; this.pushU(); if (this.selD != null) this.dr.splice(this.selD, 1); else this.dr.splice(0); this.selD = null; this.saveD(); this.req(); if (this.onMode) this.onMode(this.mode || "cur"); };
  P.down = function (e) {
    const m = this.mode || "cur"; if (!this.B || !this.sc || !this.dr || this.pts.size >= 1) return down0.call(this, e);
    const p = this.pt(e);
    if (m === "cur") { const h = this.hitD(p); if (h && h.k === this.selD) { try { this.cv.setPointerCapture(e.pointerId); } catch (_) {} this.pts.set(e.pointerId, p); this.pushU(); this.drag = { kind: "dmove", h, p0: p, a0: Object.assign({}, this.dr[h.k].a), b0: this.dr[h.k].b && Object.assign({}, this.dr[h.k].b) }; return; } return down0.call(this, e); }
    try { this.cv.setPointerCapture(e.pointerId); } catch (_) {} this.pts.set(e.pointerId, p); e.preventDefault();
    const q = this.dpt(p);
    if (this.tmp && this.tmp.armed) { this.tmp.b = q; this.drag = { kind: "draw", p0: p, second: true }; this.req(); return; }
    this.tmp = { k: m, a: q, b: q }; this.drag = { kind: "draw", p0: p }; this.req();
  };
  P.move = function (e) {
    const d = this.drag;
    if (d && d.kind === "draw") { const p = this.pt(e); this.pts.set(e.pointerId, p); if (this.tmp) { this.tmp.b = this.dpt(p); if (this.tmp.k === "m") this.meas = { a: this.tmp.a, b: this.tmp.b }; } this.req(); return; }
    if (d && d.kind === "dmove") { const p = this.pt(e), D = this.dr[d.h.k], di = this.fi(p.x) - this.fi(d.p0.x), dp = this.pOf(p.y) - this.pOf(d.p0.y), sh = q => ({ t: this.tOf(this.iOfT(q.t) + di), p: q.p + dp });
      if (d.h.h === "a") D.a = this.dpt(p); else if (d.h.h === "b") D.b = this.dpt(p); else { D.a = D.k === "h" ? { t: d.a0.t, p: d.a0.p + dp } : sh(d.a0); if (D.b) D.b = sh(d.b0); } this.req(); return; }
    if (!d && this.tmp && this.tmp.armed && e.pointerType === "mouse") { this.tmp.b = this.dpt(this.pt(e)); this.req(); }
    return move0.call(this, e);
  };
  P.up = function (e, cancel) {
    const d = this.drag;
    if (d && d.kind === "dmove") { this.pts.delete(e.pointerId); this.drag = null; this.saveD(); this.req(); return; }
    if (d && d.kind === "draw") {
      const p = this.pt(e); this.pts.delete(e.pointerId); try { this.cv.releasePointerCapture(e.pointerId); } catch (_) {} this.drag = null; const T = this.tmp; if (!T || cancel) { this.tmp = null; this.req(); return; }
      const far = Math.hypot(p.x - d.p0.x, p.y - d.p0.y) > 8;
      if (T.k === "h") { this.pushU(); this.dr.push({ k: "h", a: T.a }); this.selD = this.dr.length - 1; this.tmp = null; this.saveD(); this.setMode("cur"); return; }
      if (!far && !d.second) { T.armed = true; this.req(); if (this.onHint) this.onHint("Now tap where it ends."); return; } // tap, tap: first point, then the second
      if (T.k === "m") { this.meas = { a: T.a, b: T.b }; this.tmp = null; this.req(); return; }
      this.pushU(); this.dr.push({ k: T.k, a: T.a, b: T.b }); this.selD = this.dr.length - 1; this.tmp = null; this.saveD(); this.setMode("cur"); return;
    }
    if (d && d.kind === "pan" && !d.moved && !cancel && this.dr) { const h = this.hitD(this.pt(e)); if (h || this.selD != null) { this.selD = h ? h.k : null; this.pts.delete(e.pointerId); this.drag = null; this.cross = null; this.legend(); this.req(); if (this.onMode) this.onMode(this.mode || "cur"); return; } }
    return up0.call(this, e, cancel);
  };
  P.draw = function () {
    draw0.call(this); const B = this.B; if (!B || !B.n || !this.sc) return; const ctx = this.ctx, g = this.geo(), S = this.S, f = v => fnum(S, v);
    ctx.save(); ctx.beginPath(); ctx.rect(0, g.T - 8, g.W, g.B - g.T + 8); ctx.clip();
    if (this.mark != null && this.mark > 0 && this.mark < B.n) { const mx = this.xOf(this.mark) - this.bw() / 2; ctx.fillStyle = "rgba(155,107,255,.09)"; ctx.fillRect(mx, g.T - 8, g.R - mx, g.B - g.T + 8); ctx.strokeStyle = "rgba(155,107,255,.8)"; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(Math.round(mx) + 0.5, g.T - 8); ctx.lineTo(Math.round(mx) + 0.5, g.B); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = "700 10px " + FONT; ctx.fillStyle = "#c4b5fd"; ctx.textAlign = "left"; ctx.fillText("WHAT HAPPENED NEXT", mx + 6, g.T + 4); }
    const tag = (y, text, bg, fg) => { ctx.fillStyle = bg; ctx.fillRect(g.R + 1, y - 9, g.W - g.R - 2, 18); ctx.fillStyle = fg; ctx.textAlign = "left"; ctx.font = "11px " + FONT; ctx.fillText(text, g.R + 6, y); };
    const handle = (x, y, col) => { ctx.fillStyle = C.bg; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1; };
    const one = (d, sel, ghost) => {
      const col = LC_COL[d.k] || "#29d8ff", A = this.xy(d.a), Bp = d.b ? this.xy(d.b) : null; ctx.globalAlpha = ghost ? 0.7 : 1; ctx.textBaseline = "middle";
      if (d.k === "h") { const y = Math.round(A.y) + 0.5; ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.4 : 1.6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.R, y); ctx.stroke(); ctx.lineWidth = 1; tag(y, f(d.a.p), col, "#140c00"); if (sel) handle(g.R - 14, y, col); }
      else if (d.k === "t") { ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.4 : 1.8; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(Bp.x, Bp.y); ctx.stroke(); ctx.lineWidth = 1; if (sel || ghost) { handle(A.x, A.y, col); handle(Bp.x, Bp.y, col); } }
      else if (d.k === "z") { const x0 = Math.min(A.x, Bp.x), y0 = Math.min(A.y, Bp.y), w = Math.abs(Bp.x - A.x), h = Math.abs(Bp.y - A.y); ctx.fillStyle = "rgba(155,107,255,.14)"; ctx.fillRect(x0, y0, w, h); ctx.strokeStyle = col; ctx.lineWidth = sel ? 2 : 1.2; ctx.strokeRect(x0 + 0.5, y0 + 0.5, w, h); ctx.lineWidth = 1;
        ctx.font = "600 10px " + FONT; ctx.fillStyle = col; ctx.textAlign = "left"; ctx.fillText(`${f(Math.max(d.a.p, d.b.p))} – ${f(Math.min(d.a.p, d.b.p))}`, x0 + 5, y0 + 9); if (sel || ghost) { handle(A.x, A.y, col); handle(Bp.x, Bp.y, col); } }
      ctx.globalAlpha = 1;
    };
    (this.dr || []).forEach((d, k) => one(d, k === this.selD));
    if (this.tmp && this.tmp.k !== "m") one(this.tmp, false, true);
    const M = this.meas || (this.tmp && this.tmp.k === "m" ? this.tmp : null);
    if (M) { const A = this.xy(M.a), Bp = this.xy(M.b), up = M.b.p >= M.a.p, col = up ? C.up : C.down, dp = M.b.p - M.a.p, bars = Math.round(Math.abs(this.iOfT(M.b.t) - this.iOfT(M.a.t))), usd = dp * (S.mpv || S.pv || 1);
      ctx.fillStyle = up ? "rgba(47,217,168,.13)" : "rgba(255,79,110,.13)"; ctx.fillRect(Math.min(A.x, Bp.x), Math.min(A.y, Bp.y), Math.abs(Bp.x - A.x), Math.abs(Bp.y - A.y));
      ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(Bp.x, Bp.y); ctx.stroke();
      const txt = `${dp >= 0 ? "+" : "−"}${f(Math.abs(dp))} (${fpct(dp / M.a.p * 100, 2)}) · ${bars} bars · ${dp >= 0 ? "+" : "−"}$${nf(0).format(Math.abs(usd))}/${S.micro || "contract"}`;
      ctx.font = "700 11px " + FONT; const tw = ctx.measureText(txt).width + 14, bx = clamp((A.x + Bp.x) / 2 - tw / 2, 2, g.R - tw - 2), by = clamp(Math.min(A.y, Bp.y) - 26, g.T, g.V - 20);
      ctx.fillStyle = "rgba(4,9,20,.94)"; ctx.fillRect(bx, by, tw, 20); ctx.strokeStyle = col; ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, 19); ctx.fillStyle = col; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(txt, bx + 7, by + 10); }
    ctx.restore();
  };
})();
function lcBar(ch, box) { // the drawing toolbar above a chart
  const bar = document.createElement("div"); bar.className = "lcbar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Drawing tools");
  bar.innerHTML = LC_TOOLS.map(([k, ic, lab]) => `<button type="button" data-lt="${k}" aria-label="${lab}" title="${lab}"><span aria-hidden="true">${ic}</span></button>`).join("") + `<span class="lcsp"></span><button type="button" data-la="undo" aria-label="Undo">↶</button><button type="button" data-la="del" aria-label="Delete">🗑</button><span class="lchint" aria-live="polite"></span>`;
  box.parentNode.insertBefore(bar, box);
  const hint = bar.querySelector(".lchint"), sync = m => { bar.querySelectorAll("[data-lt]").forEach(b => b.setAttribute("aria-pressed", b.dataset.lt === m)); const del = bar.querySelector('[data-la="del"]'); const n = (ch.dr || []).length; del.disabled = !n; del.setAttribute("aria-label", ch.selD != null ? "Delete the selected drawing" : "Clear all drawings"); del.title = del.getAttribute("aria-label"); bar.querySelector('[data-la="undo"]').disabled = !(ch.und && ch.und.length);
    hint.textContent = m === "h" ? "Tap a price" : m === "t" ? "Drag, or tap two points" : m === "z" ? "Drag a box over the zone" : m === "m" ? "Drag to measure" : ch.selD != null ? "Drag it to move, or 🗑" : n ? `${n} drawing${n === 1 ? "" : "s"}` : ""; };
  ch.onMode = sync; ch.onHint = t => { hint.textContent = t; };
  bar.onclick = e => { const t = e.target.closest("[data-lt]"), a = e.target.closest("[data-la]");
    if (t) { ch.selD = null; ch.setMode(ch.mode === t.dataset.lt && t.dataset.lt !== "cur" ? "cur" : t.dataset.lt); return; }
    if (a && a.dataset.la === "undo") ch.undoD();
    if (a && a.dataset.la === "del") { if (ch.selD == null && !bar.dataset.sure) { bar.dataset.sure = "1"; hint.textContent = "Tap 🗑 again to clear them all"; setTimeout(() => { delete bar.dataset.sure; sync(ch.mode || "cur"); }, 2500); return; } delete bar.dataset.sure; ch.delD(); } };
  sync("cur"); return bar;
}
const LC_Q = new Map(); // drawings on each practice question, kept while you answer and after the reveal
const LC_LIVE = new Map(); // the LiveChart on each practice canvas, so a repaint replaces rather than stacks them
function lcMini(cv, B, a, b, o = {}) { // a question or example chart drawn with the full live chart
  if (!cv || !B || !B.c) return null; a = Math.max(0, Math.floor(a)); b = Math.min(B.c.length, Math.floor(b)); if (b <= a) return null;
  const H = o.h || 220, tools = o.tools != null ? o.tools : H >= 200, box = document.createElement("div"); box.className = "lcbox"; box.style.height = H + "px";
  cv.replaceWith(box); box.appendChild(cv); cv.classList.add("lccv"); const lg = document.createElement("div"); lg.className = "hclg lclg"; box.appendChild(lg);
  const n = b - a, ms = B.t && B.t.length && B.t[0] < 1e11 ? 1000 : 1, sl = k => Array.prototype.slice.call(B[k], a, b);
  const t = B.t && B.t.length ? sl("t").map(x => x * ms) : Array.from({ length: n }, (_, i) => Date.now() - (n - i) * 9e5);
  const Bv = { t, o: sl("o"), h: sl("h"), l: sl("l"), c: sl("c"), v: B.v ? sl("v").map(x => x || 0) : new Array(n).fill(0), n, tf: o.tf || B.tf || "15m" };
  const old = cv.id && LC_LIVE.get(cv.id); if (old) old.destroy();
  const ch = new LiveChart(cv, lg); if (cv.id) LC_LIVE.set(cv.id, ch);
  ch.panY = true; ch.vis = Math.min(n, o.vis || n); ch.off = 0; ch.lv = (o.lines || []).map(L => ({ p: L.p, lab: L.lab, col: L.col })); ch.mark = o.mark != null ? o.mark - a : null;
  if (tools) { const key = o.key || `${cv.id}|${B.t ? B.t[Math.min(B.t.length, o.mark != null ? o.mark : b) - 1] : b}`; if (!LC_Q.has(key)) { LC_Q.set(key, []); if (LC_Q.size > 60) LC_Q.delete(LC_Q.keys().next().value); } ch.dr = LC_Q.get(key); }
  ch.set(Bv, o.S || (typeof MKSPEC !== "undefined" && MKSPEC.MNQ) || { dec: 2, tick: 0.25 }, null);
  if (tools) lcBar(ch, box); ch.setMode("cur"); return ch;
}
function lcLiveStore(k, tf) { const h = HS(), all = h.draw || (h.draw = {}), key = `${k}|${tf}`; if (!Array.isArray(all[key])) all[key] = []; return all[key]; }
function lcLiveMount(m) { // your drawings on the live chart, saved per market and timeframe on this phone
  const ch = HC.chart, box = $("#hcCv") && $("#hcCv").parentNode; if (!ch || !box) return;
  ch.dr = lcLiveStore(m.k, HC.tf); ch.onDraw = () => { const L = ch.dr; if (L.length > 40) L.splice(0, L.length - 40); saveSoon(); };
  const prev = box.parentNode.querySelector(".lcbar"); if (prev) prev.remove(); lcBar(ch, box);
}

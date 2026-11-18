/* ================= CHART ENGINE (canvas, TradingView-style) ================= */
const css = getComputedStyle(document.documentElement);
const C = {}; ["bg","grid","line","line2","ink","ink-hi","muted","up","down","ema","sma","rsi","amber","acc","acc2","card","card2"].forEach(k => C[k] = css.getPropertyValue("--" + k).trim());
const FONT = css.getPropertyValue("--font");
const DCOLS = ["#f5f5f5", "#ffb547", "#2fd9a8", "#ff4f6e", "#a3a3a3", "#ffd166"]; // white first: drawings read as chalk on the black chart
const FIBS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const ONEPT = new Set(["hline", "hray"]);
function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }
function stepDec(step, I) { let d = 0; while (d < 4 && Math.abs(step * Math.pow(10, d) - Math.round(step * Math.pow(10, d))) > 1e-6) d++; return Math.min(Math.max(d, 0), Math.max(I.dec, 2)); }
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy; let u = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0; u = clamp(u, 0, 1); return Math.hypot(px - ax - u * dx, py - ay - u * dy); }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }
let LBL = null, LBLR = 1e9; // label rects placed in the current frame, so later labels can avoid them
const pillBox = (ctx, text, x, y, align) => { const w = ctx.measureText(text).width + 10, x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x; return { x0, y0: y - 8, x1: x0 + w, y1: y + 8 }; };
const hitsLabel = b => LBL && LBL.some(r => b.x0 < r.x1 + 2 && b.x1 > r.x0 - 2 && b.y0 < r.y1 + 1 && b.y1 > r.y0 - 1);
function pillFit(ctx, text, x, ys, col, align) { if (align === "center") { const w = ctx.measureText(text).width + 10; x = Math.max(w / 2 + 2, Math.min(LBLR - w / 2 - 2, x)); } const y = ys.find(y => !hitsLabel(pillBox(ctx, text, x, y, align))); return pill(ctx, text, x, y != null ? y : ys[0], col, align); }
function pill(ctx, text, x, y, col, align = "left", fg = "#fff") {
  const w = ctx.measureText(text).width + 10, x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  if (LBL) LBL.push({ x0, y0: y - 8, x1: x0 + w, y1: y + 8 });
  ctx.fillStyle = col; ctx.globalAlpha = .94; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0, y - 8, w, 16, 3); else ctx.rect(x0, y - 8, w, 16); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = fg; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, x0 + 5, y + .5); return w;
}

const HAS_TOUCH = typeof window !== "undefined" && ("ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0);
class Chart {
  constructor(cv) {
    this.cv = cv; this.ctx = cv.getContext("2d");
    this.S = null; this.allTs = []; this.dur = 1440; this.sp = 8; this.right = 0; this.ym = null;
    this.mode = "cursor"; this.magnet = true; this.drawings = []; this.sel = null; this.pending = null; this.undo = [];
    this.overlays = []; this.position = null; this.markers = []; this.future = null; this.decisionT = null;
    this.showVol = true; this.showSMA = false; this.showEMA = true; this.showRSI = false; this.showMarks = true; this.showVWAP = true;
    this.cross = null; this.ptrs = new Map(); this.drag = null; this.raf = 0; this.lastTap = 0; this.kin = null; this.navT = 0;
    this.onCross = () => {}; this.onChange = () => {}; this.onSelect = () => {}; this.onMode = () => {}; this.onNav = () => {}; this.onPosEdit = () => null; this.onPosGrab = () => {}; this.posEdit = false; this.posBox = null;
    // Mouse and pen use pointer events. Fingers use touch events: every phone browser and in-app viewer supports them,
    // and preventDefault() on them reliably stops the page (or the app around it) from scrolling instead of the chart.
    const skip = e => e.pointerType === "touch" && HAS_TOUCH;
    cv.addEventListener("pointerdown", e => { if (!skip(e)) this.down(e); });
    cv.addEventListener("pointermove", e => { if (!skip(e)) this.move(e); });
    cv.addEventListener("pointerup", e => { if (!skip(e)) this.up(e); });
    cv.addEventListener("pointercancel", e => { if (!skip(e)) this.up(e, true); });
    const fake = t => ({ pointerId: 1000 + t.identifier, pointerType: "touch", clientX: t.clientX, clientY: t.clientY, preventDefault() {} });
    const each = (e, f) => { if (e.cancelable) e.preventDefault(); for (const t of e.changedTouches) f(fake(t)); };
    cv.addEventListener("touchstart", e => each(e, f => this.down(f)), { passive: false });
    cv.addEventListener("touchmove", e => each(e, f => this.move(f)), { passive: false });
    cv.addEventListener("touchend", e => each(e, f => this.up(f)), { passive: false });
    cv.addEventListener("touchcancel", e => each(e, f => this.up(f, true)), { passive: false });
    cv.addEventListener("pointerleave", e => { if (e.pointerType === "mouse" && !this.ptrs.size) { this.cross = null; this.onCross(null); this.req(); } });
    cv.addEventListener("wheel", e => { e.preventDefault(); if (!this.S) return; this.stopKin();
      const r = cv.getBoundingClientRect(), g = this.geo(), u = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? g.W : 1, px = e.clientX - r.left, py = e.clientY - r.top;
      let dx = e.deltaX * u, dy = e.deltaY * u; if (e.shiftKey && !dx) { dx = dy; dy = 0; }
      if (px > g.R && py < g.PB && !e.ctrlKey) { const f = Math.exp(clamp(dy, -200, 200) * 0.0015), y0 = this.y0, y1 = this.y1, mid = (y0 + y1) / 2, half = (y1 - y0) / 2 * f; this.ym = [mid - half, mid + half]; this.onChange("scale"); this.req(); }
      else if (Math.abs(dx) > Math.abs(dy) && !e.ctrlKey) { this.right += dx / this.sp; this.clampRight(); this.req(); }
      else this.zoomAt(px, Math.exp(-clamp(dy, -200, 200) * (e.ctrlKey ? 0.01 : 0.0015)));
      clearTimeout(this.wheelT); this.wheelT = setTimeout(() => this.nav(), 140); }, { passive: false });
    cv.addEventListener("dblclick", e => { const p = this.pt(e); const g = this.geo(); if (p.x > g.R) { this.ym = null; this.onChange("scale"); this.req(); } else if (this.mode === "cursor" && !this.hit(p.x, p.y)) this.fit(); });
    cv.addEventListener("contextmenu", e => e.preventDefault());
    new ResizeObserver(() => this.req()).observe(cv);
  }
  /* ----- data & view ----- */
  setSeries(S, allTs, keepView) {
    const was = this.S; this.S = S; this.allTs = allTs && allTs.length >= S.n ? allTs : S.ts; this.dur = tfDur(S.tf);
    if (!keepView || !was || was.tf !== S.tf) this.fit(); else { this.clampRight(); this.req(); }
  }
  futureBars() { if (!this.future || !this.S) return 0; return Math.max(0, Math.round(this.tIdx(this.future.t1) - 0.5 - (this.S.n - 1))); }
  fit() {
    if (!this.S) return; this.stopKin(); const g = this.geo(), w = g.R - g.L; if (w <= 0) return;
    const fut = this.futureBars(), n = this.S.n, want = Math.min(w < 420 ? 72 : w < 800 ? 105 : 150, n);
    this.sp = clamp(w / (want + Math.min(fut, want * 0.6) + 3), 2, 24);
    this.right = n - 1 + Math.min(fut, (w / this.sp) * 0.4) + 2.5; this.ym = null; this.clampRight(); this.onChange("scale"); this.req();
  }
  geo() {
    const W = this.cv.clientWidth, Hh = this.cv.clientHeight, R = W - 64, B = Hh - 22;
    const rsiH = this.showRSI ? Math.max(64, Math.round(B * 0.22)) : 0, PB = B - (rsiH ? rsiH + 8 : 0);
    return { W, Hh, L: 0, R, T: 8, PB, B, rT: PB + 8, rB: B };
  }
  x(i, g) { return g.R - (this.right - i) * this.sp; }
  idx(px, g) { return this.right - (g.R - px) / this.sp; }
  tIdx(t) {
    const a = this.allTs, n = a.length; if (!n) return 0;
    if (t <= a[0]) return (t - a[0]) / this.dur;
    let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (a[m] <= t) lo = m; else hi = m - 1; }
    if (lo === n - 1) return lo + (t - a[lo]) / this.dur;
    return lo + (t - a[lo]) / (a[lo + 1] - a[lo]);
  }
  idxT(i) { const a = this.allTs, n = a.length; if (i <= 0) return a[0] + i * this.dur; if (i >= n - 1) return a[n - 1] + (i - (n - 1)) * this.dur; const f = Math.floor(i); return a[f] + (i - f) * (a[f + 1] - a[f]); }
  tx(t, g) { return this.x(this.tIdx(t), g); }          // anchor time → x (bar centre)
  bx(t, g) { return this.x(this.tIdx(t) - 0.5, g); }    // boundary time → x (between candles)
  clampRight() { const g = this.geo(), vis = (g.R - g.L) / this.sp, n = Math.max(this.allTs.length, this.S ? this.S.n : 0); this.right = clamp(this.right, Math.min(vis * 0.25, n) - 1, n - 1 + vis * 0.55); }
  zoomAt(px, f) { const g = this.geo(), i = this.idx(px, g); this.sp = clamp(this.sp * f, 1.5, 48); this.right = i + (g.R - px) / this.sp; this.clampRight(); this.req(); }
  busy() { return this.ptrs.size > 0 || !!this.kin; }
  nav() { this.navT = performance.now(); this.onNav(); }
  stopKin() { if (this.kin) { cancelAnimationFrame(this.kin.raf); this.kin = null; } }
  startKin(v) { // flick → glide with exponential decay (px/ms)
    this.stopKin(); if (Math.abs(v) < 0.25) { this.nav(); return; }
    const k = this.kin = { v: clamp(v, -6, 6), last: performance.now(), raf: 0 };
    const step = now => { if (this.kin !== k) return; const dt = Math.min(40, now - k.last); k.last = now;
      const r0 = this.right; this.right -= k.v * dt / this.sp; this.clampRight(); k.v *= Math.exp(-dt / 325); this.draw();
      if (Math.abs(k.v) < 0.02 || this.right === r0) { this.kin = null; this.nav(); return; } k.raf = requestAnimationFrame(step); };
    k.raf = requestAnimationFrame(step);
  }
  focusRange(t0, t1) { // scroll + zoom so the candles from t0 to t1 sit in the middle of the view
    if (!this.S) return; this.stopKin(); const g = this.geo(), w = g.R - g.L, i0 = this.tIdx(Math.min(t0, t1)), i1 = this.tIdx(Math.max(t0, t1));
    const span = Math.max(1, i1 - i0 + 1), vis = Math.max(span * 1.5 + 8, 30); this.sp = clamp(w / vis, 1.5, 48);
    this.right = (i0 + i1) / 2 + (w / this.sp) / 2; this.ym = null; this.clampRight(); this.onChange("scale"); this.req(); this.onNav();
  }
  toLatest(t) { // keep the zoom, bring the latest candle (or time t) back into view with room on the right
    if (!this.S) return; const g = this.geo(), vis = (g.R - g.L) / this.sp, i = t != null ? this.tIdx(t) : this.S.n - 1;
    this.stopKin(); this.right = i + Math.min(this.futureBars(), vis * 0.4) + 2.5; if (this.ym) { this.ym = null; this.onChange("scale"); } this.clampRight(); this.req();
  }
  Y(p, g) { return g.PB - (p - this.y0) / (this.y1 - this.y0) * (g.PB - g.T); }
  P(y, g) { return this.y0 + (g.PB - y) / (g.PB - g.T) * (this.y1 - this.y0); }
  autoRange(g, i0, i1) {
    const S = this.S; let lo = Infinity, hi = -Infinity;
    for (let i = i0; i <= i1; i++) { lo = Math.min(lo, S.l[i]); hi = Math.max(hi, S.h[i]); if (this.showEMA && S.ema[i] != null) { lo = Math.min(lo, S.ema[i]); hi = Math.max(hi, S.ema[i]); } if (this.showSMA && S.sma[i] != null) { lo = Math.min(lo, S.sma[i]); hi = Math.max(hi, S.sma[i]); } if (this.showVWAP && S.vwap && S.vwap[i] != null) { lo = Math.min(lo, S.vwap[i]); hi = Math.max(hi, S.vwap[i]); } }
    if (this.position) { const P = this.position, ps = P.tgt != null ? [P.stop, P.tgt] : [P.stop]; lo = Math.min(lo, ...ps); hi = Math.max(hi, ...ps); }
    if (this.showMarks) for (const o of this.overlays) { const r = hi - lo; if (o.type === "level") { if (o.p > lo - r && o.p < hi + r) { lo = Math.min(lo, o.p); hi = Math.max(hi, o.p); } } else if (o.type === "zone") { if (o.hi > lo - r && o.lo < hi + r) { lo = Math.min(lo, o.lo); hi = Math.max(hi, o.hi); } } }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    const r = (hi - lo) || Math.abs(hi) * 0.01 || 1;
    return [lo - r * (this.showVol ? 0.2 : 0.07), hi + r * 0.1];
  }
  req() { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); }); }
  pt(e) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  /* ----- drawings ----- */
  snap(px, py, g) {
    const S = this.S; let fi = this.idx(px, g), p = this.P(py, g);
    if (this.magnet) {
      const i = Math.round(fi); fi = i;
      if (i >= 0 && i < S.n) { let best = null, bd = 18; for (const v of [S.o[i], S.h[i], S.l[i], S.c[i]]) { const d = Math.abs(this.Y(v, g) - py); if (d < bd) { bd = d; best = v; } } if (best != null) p = best; }
    }
    return { t: this.idxT(fi), p };
  }
  dpts(d, g) { return d.pts.map(q => ({ x: this.tx(q.t, g), y: this.Y(q.p, g) })); }
  hit(px, py) {
    if (!this.S) return null; const g = this.geo(); if (py > g.PB || px > g.R) return null;
    const tol = 9, all = this.drawings.slice().reverse();
    if (this.sel) { const s = this.dpts(this.sel, g); for (let k = 0; k < s.length; k++) if (Math.hypot(px - s[k].x, py - s[k].y) < 14) return { d: this.sel, part: k }; }
    for (const d of all) {
      const s = this.dpts(d, g), ty = d.type;
      if (ty === "hline" && Math.abs(py - s[0].y) < tol) return { d, part: "body" };
      if (ty === "hray" && px >= s[0].x - tol && Math.abs(py - s[0].y) < tol) return { d, part: "body" };
      if (ty === "trend" && segDist(px, py, s[0].x, s[0].y, s[1].x, s[1].y) < tol) return { d, part: "body" };
      if (ty === "ray") { const e = this.rayEnd(s, g); if (segDist(px, py, s[0].x, s[0].y, e.x, e.y) < tol) return { d, part: "body" }; }
      if (ty === "rect") { const x0 = Math.min(s[0].x, s[1].x), x1 = Math.max(s[0].x, s[1].x), y0 = Math.min(s[0].y, s[1].y), y1 = Math.max(s[0].y, s[1].y); if (px > x0 - tol && px < x1 + tol && py > y0 - tol && py < y1 + tol) return { d, part: "body" }; }
      if (ty === "fib") { const x0 = Math.min(s[0].x, s[1].x); if (px > x0 - tol) for (const f of FIBS) { const y = this.Y(d.pts[1].p + (d.pts[0].p - d.pts[1].p) * f, g); if (Math.abs(py - y) < tol) return { d, part: "body" }; } }
    }
    return null;
  }
  rayEnd(s, g) { const dx = s[1].x - s[0].x, dy = s[1].y - s[0].y; if (Math.abs(dx) < 1e-6) return { x: s[1].x, y: dy > 0 ? g.PB : g.T }; const X = dx > 0 ? g.R : g.L; return { x: X, y: s[0].y + dy * (X - s[0].x) / dx }; }
  pushUndo() { this.undo.push(JSON.stringify(this.drawings)); if (this.undo.length > 60) this.undo.shift(); }
  doUndo() { if (!this.undo.length) return; this.drawings.splice(0, this.drawings.length, ...JSON.parse(this.undo.pop())); this.select(null); this.onChange("draw"); this.req(); }
  select(d) { this.sel = d; this.onSelect(d); this.req(); }
  setMode(m) { this.mode = m; this.pending = null; this.cv.classList.toggle("drawing", m !== "cursor"); this.onMode(m); this.req(); }
  deleteSel() { if (!this.sel) return; this.pushUndo(); const i = this.drawings.indexOf(this.sel); if (i >= 0) this.drawings.splice(i, 1); this.select(null); this.onChange("draw"); }
  clearAll() { if (!this.drawings.length) return; this.pushUndo(); this.drawings.splice(0); this.select(null); this.onChange("draw"); }
  finishPending() { const d = this.pending; this.pending = null; if (!d) return; this.pushUndo(); d.id = Date.now() + Math.random(); d.made = performance.now(); this.drawings.push(d); this.setMode("cursor"); this.select(d); this.onChange("draw", d, true); }
  /* ----- pointer handling ----- */
  down(e) {
    if (!this.S) return; e.preventDefault(); this.stopKin();
    try { this.cv.setPointerCapture(e.pointerId); } catch (_) {}
    const p = this.pt(e), g = this.geo(); p.x0 = p.x; p.y0 = p.y; p.t0 = performance.now(); p.type = e.pointerType;
    this.ptrs.set(e.pointerId, p);
    if (this.ptrs.size === 2) {
      if (this.pending && this.pending.phase !== "await") this.pending = null;
      const [a, b] = [...this.ptrs.values()]; this.drag = { kind: "pinch", d: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), sp: this.sp, i: this.idx((a.x + b.x) / 2, g) }; return;
    }
    if (this.ptrs.size > 2) return;
    if (this.posEdit && this.position && this.mode === "cursor" && p.y < g.PB) { // grab the live stop or target: anywhere on the line, its label or its price tag
      const T = this.position, touch = p.type !== "mouse", tol = touch ? 24 : 9, ys = this.Y(T.stop, g), yt = T.tgt != null ? this.Y(T.tgt, g) : null, B = this.posBox || {};
      const inBox = b => b && p.x >= b.x0 - (touch ? 10 : 3) && p.x <= b.x1 + (touch ? 10 : 3) && p.y >= b.y0 - (touch ? 10 : 3) && p.y <= b.y1 + (touch ? 10 : 3);
      const ds = inBox(B.stop) ? 0 : Math.abs(p.y - ys), dt = yt == null ? Infinity : inBox(B.tgt) ? 0 : Math.abs(p.y - yt);
      if (Math.min(ds, dt) <= tol) { const which = ds <= dt ? "stop" : "tgt"; this.drag = { kind: "posline", which, y0: p.y, off: p.y - (which === "stop" ? ys : yt) }; this.cross = null; this.onPosGrab(true, which); this.req(); return; }
    }
    if (p.x > g.R && p.y < g.PB) { this.drag = { kind: "yscale", y: p.y, r: [this.y0, this.y1] }; return; }
    if (p.y > g.B && this.mode === "cursor" && !this.pending) { this.drag = { kind: "xscale", x: p.x, sp: this.sp, right: this.right }; return; }
    if (this.mode !== "cursor" && p.y < g.PB && p.x < g.R) {
      const q = this.snap(p.x, p.y, g);
      if (this.pending && this.pending.phase === "await") { this.pending.pts[1] = q; this.pending.phase = "second"; this.drag = { kind: "draw" }; this.req(); return; }
      this.pending = { type: this.mode, color: this.color || DCOLS[0], pts: ONEPT.has(this.mode) ? [q] : [q, { t: q.t, p: q.p }], phase: "first" };
      this.drag = { kind: "draw" }; this.req(); return;
    }
    const h = this.hit(p.x, p.y);
    if (h) {
      if (this.sel !== h.d) this.select(h.d);
      this.drag = { kind: "edit", d: h.d, part: h.part, i0: this.idx(p.x, g), p0: this.P(p.y, g), orig: JSON.parse(JSON.stringify(h.d.pts)), moved: false };
      return;
    }
    this.drag = { kind: "pan", x: p.x, y: p.y, right: this.right, r: [this.y0, this.y1], moved: false, vs: [{ t: performance.now(), x: p.x }] };
  }
  move(e) {
    if (!this.S) return; const p = this.pt(e), g = this.geo();
    const P0 = this.ptrs.get(e.pointerId);
    if (!P0) { // hover (mouse)
      if (e.pointerType === "mouse") { this.setCross(p.x, p.y); if (this.pending && this.pending.phase === "await") { this.pending.pts[1] = this.snap(p.x, p.y, g); } this.req(); }
      return;
    }
    P0.x = p.x; P0.y = p.y; const D = this.drag; if (!D) return;
    if (D.kind === "pinch" && this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()], d = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), mid = (a.x + b.x) / 2;
      this.sp = clamp(D.sp * d / D.d, 1.5, 48); this.right = D.i + (g.R - mid) / this.sp; this.clampRight(); this.cross = null; this.req(); return;
    }
    if (D.kind === "posline") { const v = this.onPosEdit(D.which, this.P(p.y - D.off, g), false); if (v != null) this.position[D.which] = v; this.req(); return; }
    if (D.kind === "xscale") { this.sp = clamp(D.sp * Math.exp((p.x - D.x) * 0.008), 1.5, 48); this.right = D.right; this.clampRight(); this.req(); return; }
    if (D.kind === "yscale") { const f = Math.exp((p.y - D.y) * 0.006), mid = (D.r[0] + D.r[1]) / 2, half = (D.r[1] - D.r[0]) / 2 * f; this.ym = [mid - half, mid + half]; this.onChange("scale"); this.req(); return; }
    if (D.kind === "draw" && this.pending) {
      const q = this.snap(p.x, p.y, g);
      if (ONEPT.has(this.pending.type)) this.pending.pts[0] = q; else this.pending.pts[1] = q;
      if (P0.type === "mouse") this.setCross(p.x, p.y, true);
      this.req(); return;
    }
    const far = Math.abs(p.x - P0.x0) > 6 || Math.abs(p.y - P0.y0) > 6;
    if (D.kind === "edit") {
      if (!far && !D.moved) return; D.moved = true;
      if (typeof D.part === "number") { D.d.pts[D.part] = this.snap(p.x, p.y, g); if (D.d.type === "hline" || D.d.type === "hray") D.d.pts[0].t = D.orig[0].t; }
      else { const di = this.idx(p.x, g) - D.i0, dp = this.P(p.y, g) - D.p0; D.d.pts = D.orig.map(q => ({ t: this.idxT(this.tIdx(q.t) + di), p: q.p + dp })); }
      this.req(); return;
    }
    if (D.kind === "pan") {
      if (!far && !D.moved) return; D.moved = true;
      if (!this.ym && !D.pinched && Math.abs(p.y - D.y) > 26 && Math.abs(p.y - D.y) > Math.abs(p.x - D.x) * 0.8) { this.ym = [D.r[0], D.r[1]]; D.yun = true; this.onChange("scale"); this.onChange("freey"); }
      this.right = D.right + (D.x - p.x) / this.sp; this.clampRight();
      const now = performance.now(); D.vs.push({ t: now, x: p.x }); while (D.vs.length > 2 && now - D.vs[0].t > 90) D.vs.shift();
      if (this.ym) { const dp = (p.y - D.y) / (g.PB - g.T) * (D.r[1] - D.r[0]); this.ym = [D.r[0] + dp, D.r[1] + dp]; }
      if (P0.type === "mouse") this.setCross(p.x, p.y, true); else this.cross = null;
      this.req();
    }
  }
  up(e, cancel) {
    const P0 = this.ptrs.get(e.pointerId); this.ptrs.delete(e.pointerId);
    const D = this.drag; const g = this.geo();
    if (this.ptrs.size === 1 && D && D.kind === "pinch") { const q = [...this.ptrs.values()][0]; q.x0 = q.x; q.y0 = q.y; this.drag = { kind: "pan", x: q.x, y: q.y, right: this.right, r: [this.y0, this.y1], moved: true, vs: [{ t: performance.now(), x: q.x }], pinched: true }; return; }
    if (this.ptrs.size) return;
    this.drag = null; if (!P0 || !D) return;
    if (cancel) { if (D.kind === "draw" && this.pending && this.pending.phase === "first") this.pending = null; this.req(); if (D.kind === "pan" || D.kind === "pinch") this.nav(); return; }
    if (D.kind === "pan" && D.moved) {
      const vs = D.vs, now = performance.now(), a = vs[0], b = vs[vs.length - 1];
      if (P0.type !== "mouse" && !D.pinched && vs.length > 1 && now - b.t < 60 && b.t - a.t > 8) this.startKin((b.x - a.x) / (b.t - a.t)); else this.nav();
      return;
    }
    if (D.kind === "pinch" || D.kind === "xscale") { this.nav(); return; }
    if (D.kind === "posline") { if (this.position) this.onPosEdit(D.which, this.position[D.which], true); this.onPosGrab(false, D.which); this.req(); return; }
    if (D.kind === "draw" && this.pending) {
      const d = this.pending;
      if (ONEPT.has(d.type) || d.phase === "second") { this.finishPending(); return; }
      const s = this.dpts(d, g);
      if (Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y) > 14) this.finishPending();
      else { d.phase = "await"; this.onMode(this.mode, "await"); }
      this.req(); return;
    }
    if (D.kind === "edit") { if (D.moved) { this.undo.push(JSON.stringify(this.drawings.map(x => x === D.d ? Object.assign({}, x, { pts: D.orig }) : x))); this.onChange("draw", D.d); } this.req(); return; }
    if (D.kind === "pan" && !D.moved) {
      const now = performance.now();
      if (this.sel) this.select(null);
      if (P0.type !== "mouse") {
        if (now - this.lastTap < 300 && Math.hypot(P0.x - (this.lastTapX || 0), P0.y - (this.lastTapY || 0)) < 30) { this.lastTap = 0; this.fit(); return; }
        this.lastTap = now; this.lastTapX = P0.x; this.lastTapY = P0.y; this.setCross(P0.x, P0.y);
      }
    }
  }
  setCross(x, y, noDraw) {
    if (!this.S) return; const g = this.geo(); if (x > g.R) { this.cross = null; this.onCross(null); return; }
    const i = clamp(Math.round(this.idx(x, g)), 0, this.S.n - 1); this.cross = { i, x, y }; this.onCross(i); if (!noDraw) this.req();
  }
  /* ----- rendering ----- */
  draw() {
    const cv = this.cv, ctx = this.ctx, S = this.S; if (!S || !S.n) return;
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, Hh = cv.clientHeight; if (!W || !Hh) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); LBL = [];
    { const cr = this.cv.getBoundingClientRect(), wrap = this.cv.parentElement; if (wrap) for (const b of wrap.querySelectorAll(".cbtn")) { if (b.hidden || !b.offsetParent) continue; const r = b.getBoundingClientRect(); LBL.push({ x0: r.left - cr.left - 4, y0: r.top - cr.top - 4, x1: r.right - cr.left + 4, y1: r.bottom - cr.top + 4 }); } } // keep labels off the on-chart buttons
    const g = this.geo(), I = S.I; LBLR = g.R;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, Hh);
    const i0 = Math.max(0, Math.floor(this.idx(g.L, g))), i1 = Math.min(S.n - 1, Math.ceil(this.idx(g.R, g)));
    if (this.ym) { this.y0 = this.ym[0]; this.y1 = this.ym[1]; } else if (i1 >= i0) [this.y0, this.y1] = this.autoRange(g, i0, i1);
    else if (this.y0 == null) { this.y0 = S.l[S.n - 1] * 0.98; this.y1 = S.h[S.n - 1] * 1.02; }
    if (!this.ym && i1 >= i0) { const h = g.PB - g.T, pad = 54; this.y1 += (this.y1 - this.y0) * pad / Math.max(60, h - pad); } // keep the legend clear of candles
    const Y = p => this.Y(p, g);
    ctx.font = "11px " + FONT; ctx.lineWidth = 1;
    // price grid + axis labels
    const step = niceStep((this.y1 - this.y0) / Math.max(3, Math.round((g.PB - g.T) / 56))), dd = stepDec(step, I);
    const plabs = [];
    for (let p = Math.ceil(this.y0 / step) * step; p <= this.y1; p += step) { const y = Math.round(Y(p)) + .5; if (y < g.T || y > g.PB) continue; ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(g.L, y); ctx.lineTo(g.R, y); ctx.stroke(); plabs.push([fnum(I, p, dd), y]); }
    // time labels
    const tl = this.timeLabels(g, i0, i1);
    for (const L of tl) { ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(Math.round(L.x) + .5, g.T); ctx.lineTo(Math.round(L.x) + .5, g.B); ctx.stroke(); }
    ctx.save(); ctx.beginPath(); ctx.rect(g.L, 0, g.R - g.L, g.B); ctx.clip();
    // session separators & contract rolls
    let lastRollLbl = -1e9; // label a roll only when there's room, so monthly rolls on a daily chart don't pile up
    for (let i = Math.max(i0, 1); i <= i1; i++) {
      const xs = Math.round(this.x(i - 0.5, g)) + .5;
      if (S.brk[i]) { ctx.strokeStyle = C.amber; ctx.globalAlpha = .7; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xs, g.T); ctx.lineTo(xs, g.B); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.fillStyle = "#e7b35a"; ctx.font = "10px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; if (xs - lastRollLbl > 84 && xs + 70 < g.R) { ctx.fillText("new contract", xs + 3, g.PB - 6); lastRollLbl = xs; } }
      else if (isIntra(S.tf) && S.ds[i] && this.sp * (TF[S.tf] <= 15 ? 1 : 1) > 0.5) { ctx.strokeStyle = C.line2; ctx.globalAlpha = .55; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(xs, g.T); ctx.lineTo(xs, g.B); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    }
    // hidden future
    if (this.future) {
      const xa = this.bx(this.future.t0, g), xb = this.bx(this.future.t1, g);
      if (xb > xa) {
        const grd = ctx.createLinearGradient(xa, 0, xb, 0); grd.addColorStop(0, "rgba(193,193,193,0.07)"); grd.addColorStop(1, "rgba(123,123,123,0.10)");
        ctx.fillStyle = grd; ctx.fillRect(xa, g.T, xb - xa, g.B - g.T);
        if (this.future.label && xb - xa > 26) { const cx = (xa + Math.min(xb, g.R)) / 2; ctx.fillStyle = C.muted; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "600 12px " + FONT; if (xb - xa > 80) ctx.fillText(this.future.label, cx, (g.T + g.PB) / 2 - 12); ctx.font = "26px " + FONT; ctx.fillStyle = "#5eead4"; ctx.fillText("?", cx, (g.T + g.PB) / 2 + 14); }
      }
    }
    // position tool
    const T = this.position;
    if (T) {
      const xa = this.bx(T.t0, g), xb = Math.max(xa + 4, this.bx(T.t1, g)), ye = Y(T.e), ys = Y(T.stop), yt = T.tgt != null ? Y(T.tgt) : ye;
      ctx.fillStyle = "rgba(38,166,154,0.16)"; ctx.fillRect(xa, Math.min(ye, yt), xb - xa, Math.abs(yt - ye));
      ctx.fillStyle = "rgba(239,83,80,0.16)"; ctx.fillRect(xa, Math.min(ye, ys), xb - xa, Math.abs(ys - ye));
      [[ye, C.sma], ...(T.tgt != null ? [[yt, C.up]] : []), [ys, C.down]].forEach(([y, c]) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(xa, Math.round(y) + .5); ctx.lineTo(xb, Math.round(y) + .5); ctx.stroke(); });
      if (T.liq != null && this.posEdit) { // where the prop firm would close the account: the stop can't go past this
        const yl = Math.round(Y(T.liq)) + .5; if (yl > g.T && yl < g.PB) { ctx.save(); ctx.strokeStyle = "#ff3b5c"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(g.L, yl); ctx.lineTo(g.R, yl); ctx.stroke(); ctx.setLineDash([]);
          ctx.font = "700 10.5px " + FONT; const tx = `LOSS LIMIT ${fnum(this.S.I || { dec: 2 }, T.liq)}`, w = ctx.measureText(tx).width + 10, below = (T.liq - T.e) * (T.stop - T.e) > 0 ? 1 : -1;
          const lx = Math.max(g.L + 6, Math.min(g.L + 118, g.R - w - 70)); // clear of the play button
          ctx.fillStyle = "rgba(255,59,92,.9)"; ctx.fillRect(lx, yl + (below > 0 ? 3 : -17), w, 14); ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(tx, lx + 5, yl + (below > 0 ? 10 : -10)); ctx.restore(); } }
    }
    // volume
    if (this.showVol) {
      let vmax = 0; for (let i = i0; i <= i1; i++) if (S.v[i] != null) vmax = Math.max(vmax, S.v[i]);
      if (vmax > 0) { const vh = (g.PB - g.T) * 0.15, bw = Math.max(1, this.sp * 0.72);
        for (let i = i0; i <= i1; i++) { if (S.v[i] == null) continue; const x = this.x(i, g), hh = S.v[i] / vmax * vh; ctx.fillStyle = S.c[i] >= S.o[i] ? "rgba(38,166,154,0.32)" : "rgba(239,83,80,0.32)"; ctx.fillRect(Math.round(x - bw / 2), g.PB - hh, Math.max(1, Math.round(bw)), hh); } }
    }
    // overlays behind candles (boxes)
    if (this.showMarks) for (const o of this.overlays) if (o.type === "box" || o.type === "zone") this.drawOverlay(o, g, ctx);
    // candles
    const bw = Math.max(1, Math.min(22, this.sp * 0.72));
    for (let i = i0; i <= i1; i++) {
      const x = Math.round(this.x(i, g)), up = S.c[i] >= S.o[i], col = up ? C.up : C.down;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + .5, Y(S.h[i])); ctx.lineTo(x + .5, Y(S.l[i])); ctx.stroke();
      if (bw >= 2) { const yo = Y(S.o[i]), yc = Y(S.c[i]); ctx.fillRect(Math.round(x + .5 - bw / 2), Math.min(yo, yc), Math.max(1, Math.round(bw)), Math.max(1, Math.abs(yc - yo))); }
    }
    // moving averages
    const line = (arr, col, dash, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash); ctx.beginPath(); let s = false; for (let i = Math.max(0, i0 - 1); i <= Math.min(S.n - 1, i1 + 1); i++) { const v = arr[i]; if (v == null) { s = false; continue; } const x = this.x(i, g), y = Y(v); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); s = true; } ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; };
    if (this.showSMA) line(S.sma, C.sma, [5, 4], 1.4);
    if (this.showEMA) line(S.ema, C.ema, [], 2);
    if (this.showVWAP && S.vwap) { ctx.strokeStyle = C.amber; ctx.lineWidth = 1.8; ctx.beginPath(); let s = false; for (let i = Math.max(0, i0 - 1); i <= Math.min(S.n - 1, i1 + 1); i++) { const x = this.x(i, g), y = Y(S.vwap[i]); if (s && !S.ds[i]) ctx.lineTo(x, y); else ctx.moveTo(x, y); s = true; } ctx.stroke(); ctx.lineWidth = 1; }
    // teaching overlays
    if (this.showMarks) for (const o of this.overlays) if (o.type !== "box" && o.pane !== "rsi") this.drawOverlay(o, g, ctx, o.type === "zone");
    // user drawings
    for (const d of this.drawings) this.drawDrawing(d, g, ctx, d === this.sel);
    if (this.pending) this.drawDrawing(this.pending, g, ctx, true);
    // decision line + trade markers
    if (this.decisionT != null) { const xd = Math.round(this.bx(this.decisionT, g)) + .5; ctx.strokeStyle = C.ink; ctx.globalAlpha = .45; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xd, g.T); ctx.lineTo(xd, g.B); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    for (const m of this.markers) this.drawMarker(m, g, ctx);
    if (T) { ctx.font = "600 11px " + FONT; const xb = Math.min(Math.max(this.bx(T.t0, g) + 4, this.bx(T.t1, g)), g.R) - 4, ye = Y(T.e), ys = Y(T.stop), yt = T.tgt != null ? Y(T.tgt) : ye;
      const so = ys > ye ? 1 : -1, to = yt < ye ? -1 : 1, roomS = Math.abs(ys - ye) > 22, roomT = Math.abs(yt - ye) > 22;
      const gh = this.posEdit ? "⇕ " : "", D = this.drag && this.drag.kind === "posline" ? this.drag.which : null; this.posBox = {};
      if (T.tgt != null) { pillFit(ctx, `${gh}Target ${fnum(I, T.tgt)}`, xb, [yt + to * 10, ...(roomT ? [yt - to * 10] : []), yt + to * 28], C.up, "right"); this.posBox.tgt = LBL[LBL.length - 1]; }
      pillFit(ctx, `${gh}Stop ${fnum(I, T.stop)}`, xb, [ys + so * 10, ...(roomS ? [ys - so * 10] : []), ys + so * 28], C.down, "right"); this.posBox.stop = LBL[LBL.length - 1];
      if (this.posEdit) { // a thicker line while it is being dragged
        for (const [w, y, col] of [["stop", ys, C.down], ["tgt", T.tgt != null ? yt : null, C.up]]) if (y != null && D === w) { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(g.L, Math.round(y) + .5); ctx.lineTo(g.R, Math.round(y) + .5); ctx.stroke(); ctx.lineWidth = 1; }
      } }
    ctx.restore();
    // RSI pane
    if (this.showRSI) this.drawRSI(g, ctx, i0, i1);
    // axes
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(g.R + .5, 0); ctx.lineTo(g.R + .5, g.B); ctx.moveTo(0, g.B + .5); ctx.lineTo(W, g.B + .5); if (this.showRSI) { ctx.moveTo(0, g.PB + 4.5); ctx.lineTo(W, g.PB + 4.5); } ctx.stroke();
    ctx.font = "11px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = C.muted;
    for (const [t, y] of plabs) ctx.fillText(t, g.R + 7, y);
    ctx.textAlign = "center"; for (const L of tl) { ctx.fillStyle = L.strong ? C.ink : C.muted; ctx.font = (L.strong ? "600 " : "") + "11px " + FONT; ctx.fillText(L.text, L.x, g.B + 11); }
    // axis tags for horizontal drawings and levels
    ctx.font = "600 11px " + FONT;
    for (const d of this.drawings) if (d.type === "hline" || d.type === "hray") { const y = Y(d.pts[0].p); if (y > g.T && y < g.PB) { ctx.fillStyle = d.color; ctx.fillRect(g.R + 1, y - 9, 63, 18); ctx.fillStyle = "#101010"; ctx.textAlign = "left"; ctx.fillText(fnum(I, d.pts[0].p), g.R + 5, y); } }
    // last price
    const li = S.n - 1, lc = S.c[li], ly = Math.round(Y(lc)) + .5, lcol = S.c[li] >= S.o[li] ? C.up : C.down;
    if (ly > g.T && ly < g.PB) { ctx.strokeStyle = lcol; ctx.globalAlpha = .65; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(g.L, ly); ctx.lineTo(g.R, ly); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = lcol; ctx.fillRect(g.R + 1, ly - 9, 63, 18); ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(fnum(I, lc), g.R + 5, ly); }
    // live stop / target price tags on the axis: a second handle you can drag
    if (this.posEdit && this.position) { const T = this.position; ctx.font = "600 11px " + FONT; ctx.textAlign = "left";
      for (const [v, col] of [[T.tgt, C.up], [T.stop, C.down]]) { if (v == null) continue; const y = Math.round(Y(v)) + .5; if (y < g.T + 9 || y > g.PB - 9) continue;
        ctx.fillStyle = col; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(g.R + 1, y - 10, 63, 20, 4); else ctx.rect(g.R + 1, y - 10, 63, 20); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillText(fnum(I, v), g.R + 5, y); } }
    // crosshair
    if (this.cross) {
      const ci = clamp(this.cross.i, 0, S.n - 1), x = Math.round(this.x(ci, g)) + .5, y = this.cross.y;
      ctx.strokeStyle = "#a4a4a4"; ctx.globalAlpha = .65; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, g.T); ctx.lineTo(x, g.B); if (y > g.T && y < g.PB) { ctx.moveTo(g.L, Math.round(y) + .5); ctx.lineTo(g.R, Math.round(y) + .5); } ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (y > g.T && y < g.PB) { ctx.fillStyle = "#383838"; ctx.fillRect(g.R + 1, y - 9, 63, 18); ctx.fillStyle = C["ink-hi"]; ctx.textAlign = "left"; ctx.font = "11px " + FONT; ctx.fillText(fnum(I, this.P(y, g)), g.R + 5, y); }
      const lab = this.barLabel(ci); ctx.font = "11px " + FONT; const w = ctx.measureText(lab).width + 12;
      ctx.fillStyle = "#383838"; ctx.fillRect(clamp(x - w / 2, 0, W - w), g.B + 1, w, 20); ctx.fillStyle = C["ink-hi"]; ctx.textAlign = "center"; ctx.fillText(lab, clamp(x, w / 2, W - w / 2), g.B + 11);
    }
  }
  barLabel(i) { const S = this.S, t = S.ts[i]; if (isIntra(S.tf)) return fWallS(t); const d = S.I.d[S.di[i]]; if (S.tf === "1D") return fDayS(d) + " '" + d.slice(2, 4); if (S.tf === "1W") { const d0 = S.I.d[this.firstDayOf(i)]; return "wk " + fDayS(d0) + " '" + d0.slice(2, 4); } return MON[Number(d.slice(5, 7)) - 1] + " " + d.slice(0, 4); }
  firstDayOf(i) { const S = this.S; return i > 0 ? S.di[i - 1] + 1 : 0; }
  timeLabels(g, i0, i1) {
    const S = this.S, out = [], cand = [];
    for (let i = Math.max(i0, 0); i <= i1; i++) {
      const t = S.ts[i]; let rank = 0, text = "";
      if (isIntra(S.tf)) {
        const wd = tdate(t + (S.I.tz === "ET" ? 360 : 0)); // trading day of this bar
        if (S.ds[i]) { rank = 3; const dd = S.I.d[S.di[i]]; text = fDayS(dd); if (i > 0 && S.I.d[S.di[i - 1]].slice(5, 7) !== dd.slice(5, 7)) rank = 4; }
        else { const mod = ((t % 1440) + 1440) % 1440; rank = mod % 240 === 0 ? 2 : mod % 60 === 0 ? 1.5 : mod % 15 === 0 ? 1 : 0.5; text = fHM(t); }
        void wd;
      } else {
        const d = S.I.d[S.di[i]], prev = i > 0 ? S.I.d[S.di[i - 1]] : null;
        if (S.tf === "1D") { const dn = new Date(dayNum(d) * 86400000);
          if (!prev || prev.slice(0, 4) !== d.slice(0, 4)) { rank = 5; text = d.slice(0, 4); }
          else if (prev.slice(5, 7) !== d.slice(5, 7)) { rank = 4; text = MON[dn.getUTCMonth()]; }
          else if (dn.getUTCDay() === 1 || (prev && dayNum(d) - dayNum(prev) > 2)) { rank = 2; text = String(dn.getUTCDate()); }
          else { rank = 0.5; text = String(dn.getUTCDate()); } }
        else { if (!prev || prev.slice(0, 4) !== d.slice(0, 4)) { rank = 5; text = d.slice(0, 4); } else if (prev.slice(5, 7) !== d.slice(5, 7)) { rank = S.tf === "1M" ? (["01","04","07","10"].includes(d.slice(5, 7)) ? 3 : 2) : 3; text = MON[Number(d.slice(5, 7)) - 1]; } else { rank = 1; text = String(new Date(dayNum(S.I.d[this.firstDayOf(i)]) * 86400000).getUTCDate()); } }
      }
      cand.push({ i, x: this.x(i, g), rank, text, strong: rank >= 3 });
    }
    cand.sort((a, b) => b.rank - a.rank || a.i - b.i);
    const placed = [];
    const ctx = this.ctx; ctx.font = "600 11px " + FONT;
    for (const c of cand) { c.w = ctx.measureText(c.text).width; if (c.x < c.w / 2 + 4 || c.x > g.R - c.w / 2 - 4) continue; if (placed.every(p => Math.abs(p.x - c.x) >= (p.w + c.w) / 2 + 26)) placed.push(c); }
    return placed;
  }
  drawDrawing(d, g, ctx, selected) {
    const s = this.dpts(d, g), col = d.color || DCOLS[0], I = this.S.I; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = selected ? 2.2 : 1.8;
    if (d.type === "trend") { ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); ctx.stroke(); }
    else if (d.type === "ray") { const e = this.rayEnd(s, g); ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(e.x, e.y); ctx.stroke(); }
    else if (d.type === "hline") { ctx.beginPath(); ctx.moveTo(g.L, Math.round(s[0].y) + .5); ctx.lineTo(g.R, Math.round(s[0].y) + .5); ctx.stroke(); }
    else if (d.type === "hray") { ctx.beginPath(); ctx.moveTo(s[0].x, Math.round(s[0].y) + .5); ctx.lineTo(g.R, Math.round(s[0].y) + .5); ctx.stroke(); }
    else if (d.type === "rect") { const x0 = Math.min(s[0].x, s[1].x), y0 = Math.min(s[0].y, s[1].y), w = Math.abs(s[1].x - s[0].x), h = Math.abs(s[1].y - s[0].y); ctx.fillStyle = rgba(col, .13); ctx.fillRect(x0, y0, w, h); ctx.strokeRect(x0 + .5, y0 + .5, w, h); }
    else if (d.type === "fib") {
      const xa = Math.min(s[0].x, s[1].x); ctx.font = "10.5px " + FONT; ctx.textBaseline = "bottom"; ctx.textAlign = "left";
      ctx.globalAlpha = .5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      for (const f of FIBS) { const p = d.pts[1].p + (d.pts[0].p - d.pts[1].p) * f, y = Math.round(this.Y(p, g)) + .5; ctx.globalAlpha = f === 0.5 || f === 0.618 ? 1 : .7; ctx.lineWidth = f === 0.618 ? 1.8 : 1.1; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(g.R, y); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.fillText(`${f} (${fnum(I, p)})`, xa + 3, y - 2); }
      ctx.lineWidth = 1.8;
    }
    if (selected) for (const q of s) { ctx.beginPath(); ctx.arc(q.x, q.y, 5.5, 0, 7); ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke(); }
    ctx.lineWidth = 1;
  }
  drawOverlay(o, g, ctx, labelOnly) {
    const Y = p => this.Y(p, g), I = this.S.I; ctx.font = "700 10.5px " + FONT;
    if (o.type === "zone") {
      const x0 = Math.max(g.L, o.t0 != null ? this.tx(o.t0, g) : g.L), ya = Y(o.hi), yb = Y(o.lo); if (Math.max(ya, yb) < g.T || Math.min(ya, yb) > g.PB || x0 > g.R) return;
      if (!labelOnly) {
        if (Math.abs(yb - ya) < 2.5) { ctx.strokeStyle = o.color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x0, Math.round(ya) + .5); ctx.lineTo(g.R, Math.round(ya) + .5); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; }
        else { ctx.fillStyle = rgba(o.color, o.prep ? .09 : .14); ctx.fillRect(x0, ya, g.R - x0, yb - ya); ctx.strokeStyle = rgba(o.color, .7); ctx.beginPath(); ctx.moveTo(x0, Math.round(ya) + .5); ctx.lineTo(g.R, Math.round(ya) + .5); ctx.moveTo(x0, Math.round(yb) + .5); ctx.lineTo(g.R, Math.round(yb) + .5); ctx.stroke(); }
        return;
      }
      if (o.label) { const ytop = Math.max(g.T + 9, ya - 10), ybot = Math.min(g.PB - 9, yb + 10);
        if (o.ai) pillFit(ctx, o.label, g.R - 4, [ytop, ybot, ytop - 18, ybot + 18], o.color, "right");
        else pillFit(ctx, o.label, clamp(x0 + 4, 6, g.R - 160), [ytop, ybot, ytop - 18], o.color, "left"); }
      return;
    }
    if (o.type === "level") {
      const x0 = Math.max(g.L, o.t0 != null ? this.tx(o.t0, g) : g.L), y = Math.round(Y(o.p)) + .5; if (y < g.T || y > g.PB) return;
      ctx.strokeStyle = o.color; ctx.lineWidth = 1.5; ctx.setLineDash(o.dash || [6, 4]); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(g.R, y); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
      if (o.label) pill(ctx, o.label, Math.min(Math.max(x0 + 4, 6), g.R - 150), y + (o.below ? 11 : -11), o.color);
    } else if (o.type === "zig") {
      ctx.strokeStyle = o.color || C.amber; ctx.lineWidth = 1.6; ctx.globalAlpha = .9; ctx.beginPath(); o.pts.forEach((q, k) => { const x = this.tx(q.t, g), y = Y(q.p); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
      for (const q of o.pts) if (q.lab) { const x = this.tx(q.t, g), y = Y(q.p), c = q.lab === "HH" || q.lab === "HL" ? C.up : q.lab === "LH" || q.lab === "LL" ? C.down : "#606060"; pill(ctx, q.lab, x, y + (q.k === "H" ? -13 : 13), c, "center"); }
    } else if (o.type === "box") {
      const xa = this.bx(o.t0, g), xb = this.bx(o.t1, g) + 0; let hi = -Infinity, lo = Infinity; const S = this.S;
      for (let i = Math.max(0, Math.round(this.tIdx(o.t0))); i <= Math.min(S.n - 1, Math.round(this.tIdx(o.t1)) - 1); i++) { hi = Math.max(hi, S.h[i]); lo = Math.min(lo, S.l[i]); }
      if (!isFinite(hi)) return; const ya = Y(hi) - 6, yb = Y(lo) + 6;
      ctx.fillStyle = rgba(o.color, .1); ctx.fillRect(xa - 2, ya, xb - xa + 4, yb - ya); ctx.strokeStyle = o.color; ctx.lineWidth = 1.5; ctx.strokeRect(xa - 2 + .5, ya + .5, xb - xa + 4, yb - ya); ctx.lineWidth = 1;
      if (o.label) pillFit(ctx, o.label, (xa + xb) / 2, [ya - 11, yb + 11, ya - 29], o.color, "center");
    } else if (o.type === "arrow" || o.type === "seg" || o.type === "tline") {
      let x0 = this.tx(o.t0, g), y0 = Y(o.p0), x1 = this.tx(o.t1, g), y1 = Y(o.p1);
      if (o.type === "tline" && o.extend && x1 !== x0) { const X = g.R; y1 = y0 + (y1 - y0) * (X - x0) / (x1 - x0); x1 = X; }
      ctx.strokeStyle = o.color; ctx.lineWidth = o.type === "arrow" ? 2 : 1.6; ctx.setLineDash(o.dash || []); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
      if (o.type === "arrow") { const a = Math.atan2(y1 - y0, x1 - x0); ctx.fillStyle = o.color; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 10 * Math.cos(a - .4), y1 - 10 * Math.sin(a - .4)); ctx.lineTo(x1 - 10 * Math.cos(a + .4), y1 - 10 * Math.sin(a + .4)); ctx.fill(); }
      if (o.label) { const lx = (this.tx(o.t0, g) + this.tx(o.t1, g)) / 2, ly = (Y(o.p0) + Y(o.p1)) / 2; pillFit(ctx, o.label, lx, o.labelBelow ? [ly + 16, ly - 14, ly + 34] : [ly - 14, ly + 16, ly - 32, ly + 34], o.color, "center"); }
    } else if (o.type === "dot") {
      const x = this.tx(o.t, g), y = Y(o.p); ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
      if (o.label) pillFit(ctx, o.label, x, o.below ? [y + 14, y - 14, y + 32] : [y - 14, y + 14, y - 32, y + 32], o.color, "center");
    }
    void I;
  }
  drawMarker(m, g, ctx) {
    const x = this.tx(m.t, g), y = this.Y(m.p, g); ctx.font = "800 10.5px " + FONT;
    if (m.kind === "buy" || m.kind === "sell") {
      const buy = m.kind === "buy", yb = buy ? y + 8 : y - 8; ctx.fillStyle = buy ? C.up : C.down; ctx.beginPath();
      if (buy) { ctx.moveTo(x, yb); ctx.lineTo(x - 7, yb + 10); ctx.lineTo(x + 7, yb + 10); } else { ctx.moveTo(x, yb); ctx.lineTo(x - 7, yb - 10); ctx.lineTo(x + 7, yb - 10); }
      ctx.fill(); pill(ctx, buy ? "BUY" : "SELL", x, buy ? yb + 20 : yb - 20, buy ? C.up : C.down, "center");
    } else if (m.kind === "exit") {
      if (m.from) { ctx.strokeStyle = C.ink; ctx.globalAlpha = .7; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(this.tx(m.from.t, g), this.Y(m.from.p, g)); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
      ctx.fillStyle = m.win ? C.up : C.down; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 7); ctx.fill(); ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
    }
  }
  drawRSI(g, ctx, i0, i1) {
    const S = this.S, Yr = v => g.rB - v / 100 * (g.rB - g.rT);
    ctx.fillStyle = "rgba(133,133,133,0.07)"; ctx.fillRect(g.L, Yr(70), g.R - g.L, Yr(30) - Yr(70));
    ctx.strokeStyle = C.line2; ctx.setLineDash([4, 4]); ctx.beginPath(); [30, 70].forEach(v => { ctx.moveTo(g.L, Math.round(Yr(v)) + .5); ctx.lineTo(g.R, Math.round(Yr(v)) + .5); }); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.beginPath(); ctx.rect(g.L, g.rT, g.R - g.L, g.rB - g.rT); ctx.clip();
    ctx.strokeStyle = C.rsi; ctx.lineWidth = 1.6; ctx.beginPath(); let s = false;
    for (let i = Math.max(0, i0 - 1); i <= Math.min(S.n - 1, i1 + 1); i++) { const v = S.rsi[i]; if (v == null) { s = false; continue; } const x = this.x(i, g), y = Yr(v); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); s = true; }
    ctx.stroke(); ctx.lineWidth = 1;
    if (this.showMarks) for (const o of this.overlays) if (o.pane === "rsi") { ctx.strokeStyle = o.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.tx(o.t0, g), Yr(o.v0)); ctx.lineTo(this.tx(o.t1, g), Yr(o.v1)); ctx.stroke(); ctx.lineWidth = 1; [[o.t0, o.v0], [o.t1, o.v1]].forEach(([t, v]) => { ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(this.tx(t, g), Yr(v), 3.5, 0, 7); ctx.fill(); }); }
    ctx.restore();
    ctx.font = "11px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = C.muted; ctx.fillText("70", g.R + 7, Yr(70)); ctx.fillText("30", g.R + 7, Yr(30));
    const v = S.rsi[this.cross ? clamp(this.cross.i, 0, S.n - 1) : S.n - 1];
    ctx.fillStyle = "#a7a7a7"; ctx.textBaseline = "top"; ctx.fillText("RSI 14  " + (v == null ? "—" : v.toFixed(1)), g.L + 8, g.rT + 3);
    if (S.rsi[S.n - 1] != null) { const y = Yr(S.rsi[S.n - 1]); ctx.fillStyle = C.rsi; ctx.fillRect(g.R + 1, y - 9, 63, 18); ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(S.rsi[S.n - 1].toFixed(1), g.R + 5, y); }
  }
}

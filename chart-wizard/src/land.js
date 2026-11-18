/* ================= PRICE LANDSCAPE =================
   Behind the main market card: real MNQ prices drawn as a 3D landscape. Each ridge is a stretch of 5-minute closes,
   the front one the latest, older stretches standing further back. White lines on black, nearer ridges brighter;
   the front ridge is mint when price is up over it and rose when it's down. It rises in once when the page opens,
   then stays still (no endless animation), and redraws only when new prices arrive or the card changes size. */
const LAND = { sig: "", w: 0, h: 0, t0: 0, raf: 0 };
function landSeries(k) { // newest last: saved 5-minute candles, else daily closes, else the card's own price line
  try { const m = MKDEF[k], F = m && m.tv && typeof FD !== "undefined" ? FD[m.tv] : null; if (F && F.m5 && F.m5.n > 200) return { c: Array.prototype.slice.call(F.m5.c, -600), src: "5m" }; } catch (e) {}
  try { const D = liveBars(k); if (D && D.n > 60) return { c: D.c.slice(-260), src: "1D" }; } catch (e) {}
  const sp = MK.snap && MK.snap.sp && MK.snap.sp[k]; return sp && sp.length > 20 ? { c: sp.slice(), src: "spark" } : null;
}
function landDraw(cv, S, rise) {
  const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return; const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  const c = S.c, rows = Math.max(6, Math.min(14, Math.floor(c.length / 24))), per = Math.max(20, Math.floor(c.length / (rows * .55 + .45) / 1)), step = Math.max(1, Math.floor((c.length - per) / Math.max(1, rows - 1)));
  const horizon = H * .3, base = H * .8, K = r => 1 / (1 + (r / Math.max(1, rows - 1)) * 3.4), Yb = r => horizon + (base - horizon) * K(r);
  for (let r = rows - 1; r >= 0; r--) { // back to front, each ridge hides the ones behind it
    const end = c.length - r * step, a = Math.max(0, end - per), seg = c.slice(a, end); if (seg.length < 3) continue;
    let lo = Infinity, hi = -Infinity; for (const v of seg) { if (v < lo) lo = v; if (v > hi) hi = v; } const span = hi - lo || 1; // each ridge keeps its own shape
    const d = r / Math.max(1, rows - 1), k = K(r), yb = Yb(r), gap = Yb(r) - Yb(r + 1), amp = Math.max(6, gap * 2.6) * (r === 0 ? 1.1 : 1), half = W * .6 * k + W * .14, cx = W / 2;
    const up = rise == null ? 1 : Math.max(0, Math.min(1, (rise - (rows - 1 - r) * .06) / .5)), e = up * up * (3 - 2 * up); // ridges rise in from the back
    const pts = seg.map((v, i) => [cx - half + (2 * half) * i / (seg.length - 1), yb - ((v - lo) / span) * amp * e]);
    x.beginPath(); x.moveTo(pts[0][0], H); for (const p of pts) x.lineTo(p[0], p[1]); x.lineTo(pts[pts.length - 1][0], H); x.closePath(); x.fillStyle = "#000"; x.fill();
    const front = r === 0, rise1 = seg[seg.length - 1] >= seg[0], col = front ? (rise1 ? "47,217,168" : "255,79,110") : "255,255,255", al = front ? .95 : .1 + .6 * (1 - d) * (1 - d);
    x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.strokeStyle = `rgba(${col},${al.toFixed(3)})`; x.lineWidth = front ? 1.6 : Math.max(.6, 1.3 * k); x.stroke();
    if (front) { const g = x.createLinearGradient(0, yb - amp, 0, H); g.addColorStop(0, `rgba(${col},.12)`); g.addColorStop(1, "rgba(0,0,0,0)"); x.beginPath(); x.moveTo(pts[0][0], H); for (const p of pts) x.lineTo(p[0], p[1]); x.lineTo(pts[pts.length - 1][0], H); x.closePath(); x.fillStyle = g; x.fill(); }
  }
  const fade = x.createLinearGradient(0, 0, 0, H * .5); fade.addColorStop(0, "rgba(0,0,0,1)"); fade.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = fade; x.fillRect(0, 0, W, H * .5); // keep the price readable
  const foot = x.createLinearGradient(0, H * .78, 0, H * .88); foot.addColorStop(0, "rgba(0,0,0,0)"); foot.addColorStop(1, "rgba(0,0,0,1)"); x.fillStyle = foot; x.fillRect(0, H * .78, W, H * .22); // and the range row below it
}
function landMount(host, k) { // called each time the home page paints
  if (!host) return; const S = landSeries(k); let cv = host.querySelector("canvas.land");
  if (!S) { if (cv) cv.remove(); host.classList.remove("hasland"); return; }
  if (!cv) { cv = document.createElement("canvas"); cv.className = "land"; cv.setAttribute("aria-hidden", "true"); host.prepend(cv); host.classList.add("hasland"); LAND.sig = ""; LAND.t0 = 0; }
  const sig = `${S.src}|${S.c.length}|${S.c[S.c.length - 1]}`, w = cv.clientWidth, h = cv.clientHeight;
  if (sig === LAND.sig && w === LAND.w && h === LAND.h) return; LAND.sig = sig; LAND.w = w; LAND.h = h;
  const still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (LAND.t0 || still) { landDraw(cv, S, null); return; }
  LAND.t0 = performance.now(); cancelAnimationFrame(LAND.raf);
  const tick = now => { const p = (now - LAND.t0) / 1400; if (!cv.isConnected) return; landDraw(cv, S, Math.min(1.6, p * 1.6)); if (p < 1) LAND.raf = requestAnimationFrame(tick); else landDraw(cv, S, null); };
  LAND.raf = requestAnimationFrame(tick);
}

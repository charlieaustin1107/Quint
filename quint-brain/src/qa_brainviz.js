/* ================= QUINT: the brain. A 3D network that turns as you drag it, wired from the same live data ================= */
// Six layers stand in a ring: what Quint reads (price, timeframes, today's levels, the markets around, the calendar), four hidden layers,
// then what comes out (the call, the plan, his record, your alerts, the session). Wires from the inputs carry their signal: green bullish, red bearish.
const BR = { nodes: [], layers: [], edges: [], sig: "", pts: new Map(), yaw: 0, pitch: -0.1, vy: 0, vp: 0, moved: 0, lastTap: 0, dirty: true, auto: 1 };
const BR_HID = [[24, "HL 1", "Pattern", "ReLU"], [32, "HL 2", "Structure", "ReLU"], [37, "HL 3", "Resonance", "ReLU"], [28, "HL 4", "Judgement", "GELU"]];
const BR_COL = ["#4d8dff", "#9b6bff", "#ff6ec7", "#ffa14a", "#ff7f8a", "#56d4ff"];
function brRng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const brHash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
// every node carries a short label (zoomed out), a long one (zoomed in) and the lines shown when tapped
function brData() {
  const m = dkM(), S = mkSpec(m), Q = MK.q[m.k], f = x => fnum(S, x), f0 = x => nf(0).format(x), px = Q ? Q.p : null, IN = [], OUT = [];
  const grp = (side, t) => (side === "in" ? IN : OUT).push({ head: t });
  const add = (side, o) => (side === "in" ? IN : OUT).push(o);
  grp("in", "MARKET"); add("in", { id: "px", s: px != null ? `${tk(m)} ${f0(px)}` : tk(m), l: px != null ? `${tk(m)} ${f(px)}${Q && Q.pct != null ? ` ${Q.pct >= 0 ? "▲" : "▼"} ${Math.abs(Q.pct).toFixed(2)}%` : ""}` : `${tk(m)} · waiting`, tone: Q && Q.pct > 0 ? 1 : Q && Q.pct < 0 ? -1 : 0, w: 1, info: [`${m.name}`, px != null ? `Last ${f(px)}${Q.hi != null ? ` · day ${f(Q.lo)} to ${f(Q.hi)}` : ""}` : "No price yet", MK.tvLive ? "Real-time from your TradingView" : "From TradingView"] });
  grp("in", "TIMEFRAMES");
  [["1D", "1D"], ["1h", "1H"], ["15m", "15M"], ["5m", "5M"]].forEach(([tf, lab], i) => { const r = mxRow(tf), lit = DK.lights[i] === 2;
    add("in", { id: "tf" + tf, s: r ? `${lab} ${r.tr > 0 ? "▲" : r.tr < 0 ? "▼" : "◆"} ${Math.round(r.rsi)}` : `${lab} ···`, l: r ? `${lab} ${r.tr > 0 ? "▲ up" : r.tr < 0 ? "▼ down" : "◆ flat"} · RSI ${Math.round(r.rsi)} · ATR ${nf(1).format(r.atr)}` : `${lab} loading`, tone: r ? r.tr : 0, w: lit ? 1 : 0.35,
      info: r ? [`${TF_NAME[tf]} chart`, `Trend ${r.tr > 0 ? "up" : r.tr < 0 ? "down" : "flat"} · RSI ${Math.round(r.rsi)}`, `ATR ${nf(1).format(r.atr)} points · ${r.vs >= 0 ? "+" : "−"}${Math.abs(r.vs).toFixed(1)} ATR from the 20 EMA`] : [`${TF_NAME[tf]} chart`, "Loading candles"] }); });
  grp("in", "LEVELS TODAY");
  const lv = sessLevels(m).filter(l => !l.q).sort((a, b) => b.p - a.p).slice(0, 8);
  if (!lv.length) add("in", { id: "lvwait", s: "levels ···", l: "Working out today's levels", tone: 0, w: 0.3, info: ["Today's levels", "They appear once the 15-minute candles load"] });
  for (const l of lv) { const d = px != null ? l.p - px : 0; add("in", { id: "lv" + l.k, s: `${l.k} ${f0(l.p)}`, l: `${l.k} ${f(l.p)} · ${d >= 0 ? "+" : "−"}${f0(Math.abs(d))} pts`, tone: l.kind === "r" ? -1 : l.kind === "s" ? 1 : 0, w: px != null ? clamp(1 - Math.abs(d) / ((atrOf("15m") || 30) * 6), 0.2, 1) : 0.4, info: [l.t, `${f(l.p)}`, px != null ? `${d >= 0 ? "+" : "−"}${f0(Math.abs(d))} points from price · $${f0(Math.abs(d) * (S.mpv || S.pv))} a ${S.micro || S.sym}` : ""] }); }
  grp("in", "AROUND NASDAQ");
  const AN = { "CME_MINI:ES1!": "ES", "CBOT_MINI:YM1!": "YM", "CME_MINI:RTY1!": "RTY", "CBOT:ZN1!": "10Y", "TVC:DXY": "DXY", "CBOE:VIX": "VIX" };
  (MK.x ? MK.x.rows : Object.keys(AN).map(s => ({ s }))).forEach(r => add("in", { id: "x" + r.s, s: `${AN[r.s]} ${isFinite(r.ch) ? `${r.ch >= 0 ? "+" : "−"}${Math.abs(r.ch).toFixed(2)}%` : "···"}`, l: `${AN[r.s]} ${isFinite(r.ch) ? `${r.ch >= 0 ? "+" : "−"}${Math.abs(r.ch).toFixed(2)}% today` : "loading"}`, tone: isFinite(r.ch) ? (r.s === "CBOE:VIX" || r.s === "TVC:DXY" ? -Math.sign(r.ch) : Math.sign(r.ch)) : 0, w: isFinite(r.ch) ? clamp(Math.abs(r.ch) / 1.2, 0.25, 1) : 0.2, info: [AN[r.s] + " · " + r.s, isFinite(r.ch) ? `${r.ch >= 0 ? "+" : "−"}${Math.abs(r.ch).toFixed(2)}% today` : "Loading"] }));
  grp("in", "CALENDAR");
  const ev = DK.cal && DK.cal.list ? DK.cal.list.filter(e => e.t > Date.now() - 18e5 && e.imp >= 1).slice(0, 2) : [];
  if (!ev.length) add("in", { id: "cal0", s: "no big news", l: "No high-impact US news soon", tone: 0, w: 0.25, info: ["US calendar", DK.cal ? "Nothing high-impact in the next two days" : "Loading"] });
  ev.forEach((e, i) => add("in", { id: "cal" + i, s: `◆ ${ukT(e.t)}`, l: `◆ ${ukT(e.t)} ${e.title.slice(0, 26)}`, tone: 0, w: 0.9, warn: 1, info: [e.title, new Date(e.t).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" }) + " UK", "High importance"] }));

  const C = liveCall(), r = dkRec(), nal = dkAls().filter(a => !a.gone && a.exp > Date.now()).length;
  grp("out", "THE CALL");
  add("out", { id: "vd", big: 1, s: DK.busy ? "THINKING" : C && C.side ? (C.side > 0 ? "BUY" : "SELL") : C ? "STAND BY" : "READY", l: DK.busy ? `THINKING · ${DK.prog || "reading the charts"}`.slice(0, 44) : C && C.side ? `${C.side > 0 ? "BUY" : "SELL"} ${tk(m)}${C.conf != null ? ` · ${Math.min(85, C.conf)}%` : ""}` : C ? `STAND BY${C.conf != null ? ` · ${Math.min(85, C.conf)}%` : ""}` : "READY · ask for a call", tone: C && C.side ? C.side : 0, w: 1, info: C ? [C.side ? `${C.side > 0 ? "Buy" : "Sell"} ${tk(m)}${C.conf != null ? `, ${Math.min(85, C.conf)}% sure` : ""}` : "No trade right now", C.wait ? `Wait for ${C.wait}` : `Made ${fAgo(C.t)}`, "Tap Open console for his reasons"] : ["No live call", "Ask Quint for one: tap Open console"], open: 1 });
  grp("out", "THE PLAN");
  if (C && C.side) { const sd = Math.abs(C.entry - C.stop), z = qaSize(m, sd);
    add("out", { id: "en", s: `ENTRY ${f0(C.entry)}`, l: `ENTRY ${f(C.entry)} ${C.ty === "lim" ? "limit" : "at market"}`, tone: 0, w: 0.9, info: ["Entry", f(C.entry), C.ty === "lim" ? "A limit order: wait for price to come to it" : "At market"] });
    add("out", { id: "sl", s: `STOP ${f0(C.stop)}`, l: `STOP ${f(C.stop)} · −${f0(sd)} pts`, tone: -1, w: 0.9, info: ["Stop", f(C.stop), `${f0(sd)} points of risk`] });
    add("out", { id: "tp", s: `TARGET ${f0(C.tgt)}`, l: `TARGET ${f(C.tgt)} · ${(Math.abs(C.tgt - C.entry) / sd).toFixed(1)}R`, tone: 1, w: 0.9, info: ["Target", f(C.tgt), `${(Math.abs(C.tgt - C.entry) / sd).toFixed(1)} times the risk`] });
    if (z) add("out", { id: "sz", s: `SIZE ${z.qty} ${z.sym}`, l: `SIZE ${z.qty} ${z.sym} · ${fbal(z.risk)} at risk`, tone: 0, w: 0.7, info: ["Size", `${z.qty} ${z.sym} for your ${fbal(z.A.risk)} risk`, `Hold up to ${C.hold} minutes`] }); }
  else add("out", { id: "noplan", s: "no open plan", l: C && C.wait ? `WAIT FOR ${C.wait}`.slice(0, 44) : "No plan until he makes a call", tone: 0, w: 0.3, info: ["The plan", C && C.wait ? `Wait for ${C.wait}` : "Ask for a call to get entry, stop and target"] });
  grp("out", "HIS RECORD");
  add("out", { id: "rec", s: r.n ? `${r.w}W ${r.n - r.w}L` : "no grades yet", l: r.n ? `${r.w}W ${r.n - r.w}L · ${r.R >= 0 ? "+" : "−"}${Math.abs(r.R).toFixed(1)}R` : "No graded calls yet", tone: r.n ? Math.sign(r.R) : 0, w: r.n ? 0.8 : 0.3, info: ["Quint's record", r.n ? `${r.w} wins, ${r.n - r.w} losses, ${r.R >= 0 ? "+" : "−"}${Math.abs(r.R).toFixed(1)}R` : "Calls are graded against real 1-minute candles", r.n ? `Said ${Math.min(85, r.conf)}% · right ${r.wr}%` : ""] });
  add("out", { id: "cal", s: r.n ? `said ${Math.min(85, r.conf)}% · hit ${r.wr}%` : `${r.live} tracking`, l: r.n ? `said ${Math.min(85, r.conf)}% · right ${r.wr}%` : `${r.live} call${r.live === 1 ? "" : "s"} being tracked`, tone: 0, w: 0.5, info: ["Calibration", "How sure he says he is, against how often he's right"] });
  grp("out", "ALERTS");
  add("out", { id: "al", s: `${nal} on`, l: `${nal} TradingView alert${nal === 1 ? "" : "s"} on`, tone: 0, w: nal ? 0.8 : 0.25, info: ["Phone alerts", `${nal} set by Quint and still on`, "Tap an alert button on a call to add one"] });
  grp("out", "SESSION");
  const now = Date.now(), st = mktStatus("fut");
  add("out", { id: "se", s: `NY ${nyT(now)}`, l: `NY ${nyT(now)} · ${dkPhase(now)}`.slice(0, 44), tone: 0, w: 0.6, info: ["Session", `${ukT(now)} UK · ${nyT(now)} New York`, `${dkPhase(now)} · Globex ${st.open ? "open" : st.label.toLowerCase()}`] });
  add("out", { id: "fd", s: MK.tvLive ? "LIVE FEED" : "DELAYED FEED", l: MK.tvLive ? "LIVE · real-time CME data" : "Delayed about 10 minutes", tone: MK.tvLive ? 1 : 0, w: MK.tvLive ? 0.9 : 0.4, info: ["Data feed", MK.tvLive ? "Real-time CME data from your TradingView" : "About 10 minutes behind"] });
  return { IN, OUT };
}
function brBuild() {
  const { IN, OUT } = brData(), ins = IN.filter(n => !n.head), outs = OUT.filter(n => !n.head), sig = JSON.stringify([ins, outs].map(L => L.map(n => `${n.id}:${n.tone}:${Math.round(n.w * 4)}`)));
  if (sig === BR.sig && BR.nodes.length) { const by = {}; for (const n of ins.concat(outs)) by[n.id] = n; for (const n of BR.nodes) { const x = by[n.id]; if (x) { n.s = x.s; n.l = x.l; n.info = x.info; } } return; }
  BR.sig = sig; BR.nodes = []; BR.layers = []; BR.edges = [];
  const specs = [{ name: "INPUT", sub: "What he reads", act: MK.tvLive ? "live" : "delayed", list: ins }].concat(BR_HID.map(([n, a, b, c]) => ({ name: a, sub: b, act: c, n }))).concat([{ name: "OUTPUT", sub: "What he decides", act: "Softmax", list: outs }]);
  const NL = specs.length, R = brRng(11), RR = 1.6, SPR = 1.08, ZM = RR * (1 + Math.cos(SPR)) / 2; BR.zc = -ZM + RR - RR; // the layers stand on an arc, centred on the turning axis
  specs.forEach((sp, L) => { const th = -SPR + 2 * SPR * L / (NL - 1), cx = RR * Math.sin(th), cz = RR * Math.cos(th) - ZM, n = sp.list ? sp.list.length : sp.n, nodes = [];
    for (let i = 0; i < n; i++) { const y = n === 1 ? 0 : 1 - 2 * i / (n - 1), ph = i * 2.39996 + L, rr = sp.list ? 0.03 : 0.08 + 0.06 * Math.sin(i * 0.7);
      const nd = sp.list ? Object.assign(sp.list[i], { L }) : { id: `h${L}.${i}`, L, hid: 1, s: "", l: "", info: [`${sp.name} · ${sp.sub}`, `Neuron ${i + 1} of ${n}`, sp.act === "GELU" ? "Weighs the evidence into a decision" : L === 1 ? "Spots patterns in each input" : L === 2 ? "Links timeframes and levels" : "Where the signals agree or fight"] };
      nd.p = [cx + rr * Math.cos(ph), y * 1.45, cz + rr * Math.sin(ph)]; nodes.push(nd); BR.nodes.push(nd); }
    BR.layers.push(Object.assign(sp, { nodes, top: [cx, 1.62, cz], th })); });
  BR.dust = []; for (let i = 0; i < 140; i++) { const a = R() * Math.PI * 2, r = 1.2 + R() * 1.6; BR.dust.push([Math.cos(a) * r, (R() - 0.5) * 3.6, Math.sin(a) * r - ZM * 0.4]); }
  for (let L = 0; L < NL - 1; L++) { const A = BR.layers[L].nodes, B = BR.layers[L + 1].nodes, k = L === 0 ? 10 : L === NL - 2 ? 12 : 11;
    for (const a of A) { const rr = brRng(brHash(a.id) + L), m = L === 0 ? Math.round(k * (0.55 + (a.w || 0.5))) : k;
      for (let j = 0; j < m; j++) { const b = B[Math.floor(rr() * B.length)], mx = (a.p[0] + b.p[0]) / 2, my = (a.p[1] + b.p[1]) / 2, mz = (a.p[2] + b.p[2]) + ZM, out = 0.18 + rr() * 0.22;
        // bundles pinch towards the middle and bow outward from the axis: the lens shapes between layers
        BR.edges.push({ a, b, c: [mx * (1 + out), my * (0.35 + rr() * 0.55) + (rr() - 0.5) * 0.3, (mz / 2) * (1 + out) - ZM], col: L === 0 ? (a.tone > 0 ? 6 : a.tone < 0 ? 7 : 0) : L, w: L === 0 ? (a.w || 0.5) : 0.5 }); } } }
}
function brProj(p, P) { const cy = Math.cos(BR.yaw), sy = Math.sin(BR.yaw), cp = Math.cos(BR.pitch), sp = Math.sin(BR.pitch); const x1 = p[0] * cy - p[2] * sy, z1 = p[0] * sy + p[2] * cy, y2 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp, f = P.D / (P.D - z2); return [P.cx + x1 * P.S * f, P.cy - y2 * P.S * f, z2, f]; }
// draws the brain into a canvas: big (labels, signals, layer names) or as the small one in the deck
function brDraw(cv, t, big) {
  const { x, w, h } = fitCanvas(cv), C = cols(); if (!BR.nodes.length) brBuild(); const busy = DK.busy, s = t / 1000;
  const P = { cx: w / 2, cy: h * (big ? 0.5 : 0.5), S: Math.min(w * (big ? 0.29 : 0.3), h * (big ? 0.29 : 0.31)), D: 4.6 };
  x.clearRect(0, 0, w, h); const g = x.createRadialGradient(P.cx, P.cy, 0, P.cx, P.cy, Math.max(w, h) * 0.75); g.addColorStop(0, "rgba(110,60,200,.16)"); g.addColorStop(0.5, "rgba(30,60,140,.08)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (const n of BR.nodes) n.q = brProj(n.p, P);
  if (big && BR.dust) { x.fillStyle = "rgba(200,180,255,.35)"; for (const d of BR.dust) { const q = brProj(d, P); x.fillRect(q[0], q[1], 1.2 * q[3], 1.2 * q[3]); } }
  const cols6 = BR_COL.concat([C.buy, C.sell]), bk = cols6.map(() => [[], []]), step = big ? 1 : 2;
  for (let i = 0; i < BR.edges.length; i += step) { const e = BR.edges[i], cq = brProj(e.c, P); e.cq = cq; bk[e.col][(e.a.q[2] + e.b.q[2]) / 2 > -0.2 ? 0 : 1].push(e); }
  x.globalCompositeOperation = "lighter"; x.lineWidth = big ? 1 : 0.7; const lift = busy ? 0.1 + 0.07 * Math.sin(s * 7) : 0;
  bk.forEach((pair, ci) => pair.forEach((list, back) => { if (!list.length) return; x.beginPath(); for (const e of list) { x.moveTo(e.a.q[0], e.a.q[1]); x.quadraticCurveTo(e.cq[0], e.cq[1], e.b.q[0], e.b.q[1]); }
    x.strokeStyle = cols6[ci]; x.globalAlpha = (back ? 0.12 : ci >= 6 ? 0.45 : 0.26) + lift; x.stroke(); }));
  x.globalAlpha = 1;
  // signals running through the layers: thicker and faster while Quint is thinking
  if (!RM) { const K = big ? "pulses" : "tp", LT = big ? "lt" : "tlt", Lp = BR[K] || (BR[K] = []), want = big ? (busy ? 150 : 55) : (busy ? 45 : 16);
    while (Lp.length < want) { const e = BR.edges[Math.floor(Math.random() * BR.edges.length)]; if (!e) break; Lp.push({ e, t: 0, v: (busy ? 1.5 : 0.55) * (0.6 + Math.random() * 0.8) }); }
    const dt = Math.min(0.1, (t - (BR[LT] || t)) / 1000); BR[LT] = t;
    for (const p of Lp) { p.t += p.v * dt; const e = p.e, u = Math.min(1, p.t), cq = e.cq || brProj(e.c, P), a = e.a.q, b = e.b.q, k1 = (1 - u) * (1 - u), k2 = 2 * (1 - u) * u, k3 = u * u;
      x.beginPath(); x.arc(k1 * a[0] + k2 * cq[0] + k3 * b[0], k1 * a[1] + k2 * cq[1] + k3 * b[1], big ? 1.9 : 1.2, 0, Math.PI * 2); x.fillStyle = e.col >= 6 ? cols6[e.col] : "#ffe9f6"; x.fill(); }
    BR[K] = Lp.filter(p => p.t < 1); }
  x.globalCompositeOperation = "source-over";
  // the neurons
  const call = liveCall(), hue = call && call.side ? (call.side > 0 ? C.buy : C.sell) : "#ffd0f0";
  for (const n of BR.nodes) { const [sx, sy, z, f] = n.q, front = z > -0.2, r = (n.hid ? 1.6 : n.big ? 4.5 : 2.8) * f * (big ? 1 : 0.7);
    const col = n.hid ? "#f4d9ff" : n.warn ? C.warn : n.tone > 0 ? C.buy : n.tone < 0 ? C.sell : n.big ? hue : "#cfe6ff"; x.globalAlpha = front ? 0.95 : 0.4; x.beginPath(); x.arc(sx, sy, r, 0, Math.PI * 2); x.fillStyle = col; x.fill();
    if (n.big && big) { x.beginPath(); x.arc(sx, sy, r + 6 + (call ? 3 * Math.sin(s * 3) : 0), 0, Math.PI * 2); x.strokeStyle = hue; x.lineWidth = 1.4; x.stroke(); } }
  x.globalAlpha = 1; if (!big) return;
  // layer names over each column, and the words on the inputs and outputs that face you
  x.textBaseline = "middle"; x.textAlign = "center";
  // nearest columns first; a name that would sit on top of a nearer one is left out until the brain turns
  const heads = BR.layers.map(Ly => ({ Ly, q: brProj(Ly.top, P) })).sort((a, b) => b.q[2] - a.q[2]), placed = [];
  for (const { Ly, q } of heads) { const z = q[2], sy = q[1], sx = clamp(q[0], 34, w - 34); if (placed.some(px => Math.abs(px - sx) < 62)) continue; placed.push(sx); x.globalAlpha = clamp(0.35 + (z + 0.6), 0.15, 1);
    x.font = "700 10px 'Martian Mono', monospace"; x.fillStyle = "#f2ecff"; x.fillText(Ly.name, sx, sy - 30);
    x.font = "500 8.5px 'Martian Mono', monospace"; x.fillStyle = "#b9a6ff"; x.fillText(`(${Ly.sub})`, sx, sy - 19); x.fillStyle = "#c9b8ff"; x.fillText(String(Ly.nodes.length), sx, sy - 8); x.fillStyle = "#ff8fb1"; x.fillText(`[${Ly.act}]`, sx, sy + 3); }
  x.globalAlpha = 1;
  for (const Ly of [BR.layers[0], BR.layers[BR.layers.length - 1]]) { const [lx, , lz] = brProj(Ly.top, P); if (lz < -1.1) continue; const right = lx < P.cx, a = clamp((lz + 1.1) * 1.2, 0, 1);
    for (const n of Ly.nodes) { const [sx, sy] = n.q; x.globalAlpha = a; x.font = `${n.big ? 700 : 500} ${n.big ? 12.5 : 9.5}px ${n.big ? "'Chakra Petch', sans-serif" : "'Martian Mono', monospace"}`; x.textAlign = right ? "left" : "right";
      const tw = x.measureText(n.s).width, tx = right ? sx + 8 : sx - 8; x.fillStyle = "rgba(2,4,10,.62)"; x.fillRect(right ? tx - 2 : tx - tw - 2, sy - 6.5, tw + 4, 13);
      x.fillStyle = n.warn ? C.warn : n.tone > 0 ? C.buy : n.tone < 0 ? C.sell : n.big ? hue : C.ink; x.fillText(n.s, tx, sy); } }
  x.globalAlpha = 1;
}

/* ---------- turning it: drag to rotate, it keeps turning slowly by itself, tap a neuron to read it ---------- */
function brHit(sx, sy) { let best = null, bd = 26; for (const n of BR.nodes) { if (!n.q) continue; const dd = Math.hypot(n.q[0] - sx, n.q[1] - sy) - (n.q[2] > -0.2 ? 6 : 0); if (dd < bd) { bd = dd; best = n; } } return best; }
function brInfo(n) {
  const el = $("#binfo"); if (!el) return; if (!n) { el.hidden = true; return; }
  el.hidden = false; el.innerHTML = `<b>${esc(n.info[0] || "")}</b>${n.info.slice(1).filter(Boolean).map(t => `<span>${esc(t)}</span>`).join("")}${n.open ? `<button class="btn sm pri" type="button" id="bopen">Open console</button>` : ""}<button class="ibtn" type="button" id="bx" aria-label="Close">✕</button>`;
  $("#bx").onclick = () => brInfo(null); const o = $("#bopen"); if (o) o.onclick = () => setView("console");
}
function brBind(cv) {
  const rel = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener("pointerdown", e => { try { cv.setPointerCapture(e.pointerId); } catch (err) {} BR.pts.set(e.pointerId, rel(e)); BR.vy = BR.vp = 0; BR.moved = 0; BR.down = performance.now(); BR.auto = 0; coreKick(); });
  cv.addEventListener("pointermove", e => { const p = BR.pts.get(e.pointerId); if (!p) return; const q = rel(e), dx = q[0] - p[0], dy = q[1] - p[1];
    if (BR.pts.size === 1) { BR.yaw += dx * 0.0085; BR.pitch = clamp(BR.pitch + dy * 0.006, -0.75, 0.75); BR.vy = dx * 0.0085; BR.vp = dy * 0.006; BR.moved += Math.abs(dx) + Math.abs(dy); }
    BR.pts.set(e.pointerId, q); coreKick(); });
  const up = e => { if (!BR.pts.has(e.pointerId)) return; const q = rel(e); BR.pts.delete(e.pointerId); clearTimeout(BR.autoT); BR.autoT = setTimeout(() => { BR.auto = 1; coreKick(); }, 2500);
    if (BR.moved < 8 && performance.now() - BR.down < 350) { const now = performance.now(); if (now - BR.lastTap < 320) { BR.yaw = 0; BR.pitch = -0.1; BR.lastTap = 0; brInfo(null); } else { BR.lastTap = now; brInfo(brHit(q[0], q[1])); } }
    coreKick(); };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("keydown", e => { const k = { ArrowLeft: [-0.2, 0], ArrowRight: [0.2, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] }[e.key]; if (k) { e.preventDefault(); BR.yaw += k[0]; BR.pitch = clamp(BR.pitch + k[1], -0.75, 0.75); coreKick(); } });
}
// a flick keeps it spinning for a moment; left alone it turns slowly on its own (faster while Quint thinks)
let brT0 = 0;
function brGlide(t) { const now = performance.now(), dt = Math.min(0.1, (now - (brT0 || now)) / 1000); brT0 = now; if (BR.pts.size) return true;
  if (Math.abs(BR.vy) > 0.0004 || Math.abs(BR.vp) > 0.0004) { BR.yaw += BR.vy; BR.pitch = clamp(BR.pitch + BR.vp, -0.75, 0.75); BR.vy *= 0.94; BR.vp *= 0.94; return true; }
  if (BR.auto && !RM) { BR.yaw = BR.yaw + dt * (DK.busy ? 0.5 : 0.14); BR.pitch += (-0.1 - BR.pitch) * dt; } return false; }

/* ================= QUINT'S MNQ DESK: trading style, screenshot reader, Nasdaq movers, practice on real MNQ candles, risk ================= */
const QT = { shot: { blob: null, url: null, turns: [], busy: false }, mv: { T: {}, d: null, at: 0, busy: false, err: null }, bars: {}, pr: null, tts: null, speaking: false };
const TV_MNQ = "CME_MINI:MNQ1!";
const TS = () => ["scalp", "day", "both"].includes(ST.tstyle) ? ST.tstyle : "both";
const TS_DEF = {
  scalp: { ic: "⚡", name: "Scalper", hold: "seconds to about 15 minutes", tf: "5m" },
  day: { ic: "🕐", name: "Day trader", hold: "15 minutes to a few hours", tf: "15m" },
  both: { ic: "🔀", name: "Scalps and day trades", hold: "a few minutes up to a few hours", tf: "5m" },
};
function styleLine() {
  const k = TS();
  return k === "scalp" ? "The user trades as a SCALPER: trades last seconds to about 15 minutes. Read the 15m for direction and the 5m and 1m for entries; stops sit just beyond the last 1m or 5m swing; costs and slippage matter a lot, so targets must be worth several times the cost."
    : k === "day" ? "The user trades as a DAY TRADER: trades last from 15 minutes to a few hours and are closed before the session ends. Read the daily and 1h for direction and the 15m and 5m for entries; stops sit beyond the last 15m swing or a level; they hold through small pullbacks and trail the stop behind structure."
    : "The user both SCALPS (minutes) and DAY TRADES (15 minutes to a few hours). Always give the bigger-picture direction first (daily, 1h, 15m), then label separately what a scalp would do and what a day trade lasting an hour or two would do, because the stop, target and hold time differ.";
}
function myLine() {
  const s = ST.mystrat;
  return `The user's main real market is MNQ (Micro E-mini Nasdaq-100 futures: $2 a point, one 0.25 tick = $0.50), traded on a funded-style prop account. ${styleLine()}${s && s.rules ? ` Their own strategy, saved from the Strategy lab: ${s.rules}${s.desc ? ` (their words: "${String(s.desc).slice(0, 300)}")` : ""}. Coach them on executing this strategy well.` : ""}`;
}
const qtToast = msg => { const h = $("#hmtoast"); if (MK.screen && h) { h.textContent = msg; h.classList.add("show"); clearTimeout(qtToast.t); qtToast.t = setTimeout(() => h.classList.remove("show"), 2600); } else toast(msg); };
const qtWhen = ms => new Date(ms).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const qtQ = T => nwQHTML(T).replace("Paper trading only; not financial advice.", "Not financial advice.");
const mdPlain = s => String(s || "").replace(/^\s*\**\s*LEAN[^\n]*\n?/i, "").replace(/```[\s\S]*?```/g, " ").replace(/^#{1,6}\s*/gm, "").replace(/[*_`>|]/g, "").replace(/\[\[[^\]]*\]\]/g, "").replace(/\n{2,}/g, "\n").trim();

/* ---------- TradingView connector ---------- */
async function tvCall(tool, input, stale = 60000) {
  if (!MK.mcp || MK.st !== "ready") throw { code: "not_ready", message: "Live data isn't connected yet." };
  const r = await MK.mcp.callTool(TV_SERVER, tool, input, { cache: stale ? { staleTime: stale, gcTime: WEEK } : false }), p = r && r.payload, em = tvErrOf(p);
  if (em) throw { code: "tool_error", message: em }; return p;
}
// TradingView's answers can carry a "message" that isn't an error (a new alert echoes its own message), so only these count as errors
function tvErrOf(p) {
  if (typeof p === "string") return p; if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  if (p.success === false) return String(p.error || p.message || p.detail || "TradingView couldn't do that");
  if (typeof p.error === "string" && p.error) return p.error; if (p["Error Message"]) return String(p["Error Message"]);
  if (p.message && Object.keys(p).every(k => /^(message|code|status|detail|error|success)$/.test(k))) return String(p.message); return null;
}
const tvWhy = e => e && e.code === "tool_error" && e.message ? `TradingView said: ${String(e.message).slice(0, 160)}` : tvErr(e); // the real reason, when TradingView gave one
const tvErr0 = e => { const c = e && e.code; return c === "not_ready" ? "Live data isn't connected in this view." : PAGE_CODES.has(c) ? "This needs your TradingView connector. Add or reconnect it in claude.ai → Settings → Connectors, then reload." : c === "rate_limited" ? "TradingView is busy. Try again in a minute." : "Couldn't load this from TradingView just now. Try again in a moment."; };
const tvErr = e => e && e.code === "cooldown" ? tvCoolMsg() : tvErr0(e);
const TV_N = { "1m": 5000, "5m": 5000, "15m": 5000, "1h": 5000, "1D": 3000 }, TV_MIN = { "1m": 1, "5m": 5, "15m": 15, "1h": 60, "1D": 1440 };
/* ---------- practice never spends TradingView calls ----------
   It uses the real candles already kept on this phone (MNQ's are saved whenever Quint or a chart loads them). With none yet, it uses
   practice candles: a year of real daily candles for Nasdaq-100, S&P 500, gold and crude oil futures built into the app, with the
   moves inside each day simulated to fit those real highs, lows, opens and closes. */
const PRAC_DAYS = { "1D": 250, "4h": 120, "1h": 90, "15m": 60, "5m": 20, "1m": 3 }, PRAC_INST = { MNQ: "NQ", NQ: "NQ", ES: "ES", MES: "ES", GC: "GC", MGC: "GC", CL: "CL", MCL: "CL" };
const dkCopy = S => ({ t: S.t.slice(), o: S.o.slice(), h: S.h.slice(), l: S.l.slice(), c: S.c.slice(), v: S.v.slice(), n: S.c.length });
function pracSim(tf, k = "MNQ", r = Math.random()) { // practice candles from a different stretch of the year each time
  const I = INST[PRAC_INST[k] || "NQ"], n = I.n, days = Math.min(n - 2, PRAC_DAYS[tf] || 30), end = n - 1 - Math.floor(r * Math.max(0, n - days - 2)), start = Math.max(0, end - days + 1);
  const S = buildSeries(I, tf, I.se[end] + 1, start), off = new Map(), B = { t: [], o: S.o.slice(), h: S.h.slice(), l: S.l.slice(), c: S.c.slice(), v: S.v.map(x => x || 0), n: S.n, tf, sim: true, name: `${I.short} · ${tf}`, from: I.d[start], to: I.d[end], src: I.short };
  for (let i = 0; i < S.n; i++) { const dk = Math.floor(S.ts[i] / 1440), W = dk * 864e5 + 432e5; let o = off.get(dk); if (o == null) { o = -etNow(W + 5 * 36e5).off * 6e4; off.set(dk, o); } B.t.push((S.ts[i] * 6e4 + o) / 1000); } // New York wall-clock times to real ones
  return B;
}
async function pracBars(tf, k = "MNQ") {
  const m = MKDEF[k], sym = m && m.tv;
  if (sym) { const F = FD[sym] || (sym === TV_MNQ ? fdLoad(sym) : null);
    if (F && F.m5 && F.m1 && F.m5.n > 300 && DK_FEEDTF[tf]) { const S = fdTf(F, tf); if (S && S.n >= 120) return Object.assign(dkCopy(S), { tf, real: true, at: F.at, name: `${k} ${tf}` }); }
    const c = QT.bars[sym === TV_MNQ ? tf : sym + "|" + tf]; if (c && c.B && c.B.c.length >= 120) return Object.assign(c.B, { real: true, at: c.at }); }
  if (!PRAC_INST[k]) throw { code: "no_practice", message: `There are no ${k} candles on this phone yet, and practice candles are built in only for MNQ, ES, gold and crude oil.` };
  return pracSim(tf, k);
}
const pracDay = d => new Date(d + "T12:00:00Z").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
const pracSrc = B => B.sim ? `practice candles: real ${esc(B.src)} days (${esc(pracDay(B.from))} to ${esc(pracDay(B.to))}), the moves inside each day simulated · no TradingView calls` : `your real candles, saved on this phone${B.at ? ` (updated ${esc(fAgo(B.at))})` : ""} · no TradingView calls`;
async function qtBars(tf, force, sym = TV_MNQ) { // real candles from TradingView (MNQ unless another market is named), kept for this visit
  const key = sym === TV_MNQ ? tf : sym + "|" + tf, c = QT.bars[key]; if (c && !force && Date.now() - c.at < (tf === "1D" ? 36e5 : 6e5)) return c.B;
  // MNQ comes from the feed: the candles already on the phone, brought up to date with about one call (TradingView counts calls per day)
  if (sym === TV_MNQ && DK_FEEDTF[tf]) { const F = await dkFeed(TV_MNQ, null, force ? 0 : 1e12), S = fdTf(F, tf); if (!S || S.n < 120) throw { code: "tool_error", message: "not enough candles" }; const B = { t: S.t.slice(), o: S.o.slice(), h: S.h.slice(), l: S.l.slice(), c: S.c.slice(), v: S.v.slice(), n: S.n, name: `MNQ ${tf}`, tf }; QT.bars[key] = { B, at: F.at }; return B; }
  const b = tvBars(await tvCall("mcp-tv-get-ohlcv", { symbol: sym, interval: tf, count: TV_N[tf] || 3000, format: "columns" }, tf === "1D" ? 36e5 : 6e5));
  if (!b || b.t.length < 120) throw { code: "tool_error", message: "not enough candles" };
  const B = { t: [], o: [], h: [], l: [], c: [], v: [], name: `MNQ ${tf}`, tf };
  for (let i = 0; i < b.t.length; i++) { const cc = +b.c[i]; if (!(cc > 0)) continue; const o = +b.o[i] > 0 ? +b.o[i] : cc; B.t.push(+b.t[i]); B.o.push(o); B.h.push(Math.max(o, cc, +b.h[i] || cc)); B.l.push(Math.min(o, cc, +b.l[i] > 0 ? +b.l[i] : cc)); B.c.push(cc); B.v.push(+b.v[i] || 0); }
  QT.bars[key] = { B, at: Date.now() }; return B;
}
function qtATR(B, n = 14) { // Wilder's ATR as an array
  const N = B.c.length, A = new Array(N).fill(0); let s = 0;
  for (let i = 1; i < N; i++) { const tr = Math.max(B.h[i] - B.l[i], Math.abs(B.h[i] - B.c[i - 1]), Math.abs(B.l[i] - B.c[i - 1])); if (i <= n) { s += tr; A[i] = s / i; } else A[i] = (A[i - 1] * (n - 1) + tr) / n; }
  return A;
}
function qtAgg(B, k, end) { // group the candles before `end` into bars k times longer (nothing after `end` is used)
  const O = { t: [], o: [], h: [], l: [], c: [], v: [] }, first = end - Math.floor(end / k) * k;
  for (let a = first; a + k <= end; a += k) { let h = -Infinity, l = Infinity, v = 0; for (let i = a; i < a + k; i++) { h = Math.max(h, B.h[i]); l = Math.min(l, B.l[i]); v += B.v ? B.v[i] : 0; } O.t.push(B.t[a]); O.o.push(B.o[a]); O.h.push(h); O.l.push(l); O.c.push(B.c[a + k - 1]); O.v.push(v); }
  return O;
}
function qtDraw(cv, B, a, b, o = {}) { return lcMini(cv, B, a, b, o); } // the full TradingView-style chart, with drawing tools on question charts

/* ---------- voice: Claude's voice where this app offers it, the phone's own voice otherwise ---------- */
function qtVoiceInit() { const c = window.claude; if (c && typeof c.use === "function") Promise.resolve(c.use("tts")).then(t => { QT.tts = t || null; }).catch(() => {}); }
/* ---------- Quint's voice: Claude's own where Claude allows it; on iPhone the best voice the phone gives web pages ---------- */
// iPhones list some voices that sound robotic (the "Eloquence" set and the novelty voices): never picked for you
const VOICE_BAD = /^(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|kathy|ralph|fred)\b/i;
const VOICE_GOOD = /daniel|serena|kate|arthur|martha|oliver|stephanie|jamie|samantha|ava|zoe|allison|susan|tom|evan|nathan|joelle|noelle|karen|lee|moira|tessa|rishi|google uk english|google us english|microsoft .*(natural|online)/i;
function voiceScore(v) {
  if (!v || !/^en/i.test(v.lang || "")) return -1e3; const n = `${v.name} ${v.voiceURI || ""}`; if (VOICE_BAD.test(v.name)) return -500;
  return (/en[-_]GB/i.test(v.lang) ? 30 : /en[-_](US|AU|IE)/i.test(v.lang) ? 20 : 10) + (/premium/i.test(n) ? 60 : /enhanced|natural|neural/i.test(n) ? 45 : 0) + (VOICE_GOOD.test(v.name) ? 20 : 0) + (/compact/i.test(n) ? -5 : 0) + (v.localService ? 2 : 0);
}
function voiceList() { try { return (window.speechSynthesis && speechSynthesis.getVoices()) || []; } catch (e) { return []; } }
function voicePick() { const vs = voiceList(), want = HS().voice && vs.find(v => v.voiceURI === HS().voice || v.name === HS().voice); if (want) return want; return vs.filter(v => voiceScore(v) > 0).sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null; }
if (window.speechSynthesis) { try { speechSynthesis.onvoiceschanged = () => { if ($("#qvl")) qtVoicePaint(); }; speechSynthesis.getVoices(); } catch (e) {} }
function openVoice() {
  openSheet(`${shead("🔊 Voice, sounds &amp; haptics")}<p class="small" id="qvn"></p><div class="qvl" id="qvl"></div><label class="small" for="qvr" style="display:block;margin-top:10px">Speed: <b id="qvrv">${(+HS().vrate || 1).toFixed(2)}×</b></label><input type="range" id="qvr" min="0.7" max="1.5" step="0.05" value="${+HS().vrate || 1}" style="width:100%">${fxSetHTML()}`, fxSetWire);
  $("#qvr").oninput = e => { HS().vrate = +e.target.value; save(); $("#qvrv").textContent = `${HS().vrate.toFixed(2)}×`; }; qtVoicePaint();
}
function qtVoicePaint() {
  const el = $("#qvl"), note = $("#qvn"); if (!el) return; const test = () => { QT.speaking = false; qtSpeak("This is Quint. I'll tell you straight: buy, sell, or stay out.", null); };
  if (QT.tts) { note.textContent = "Claude's own voices are available here. Tap one to hear it."; el.innerHTML = ["buttery", "airy", "glassy", "rounded"].map(v => `<button class="btn${(HS().tvoice || "buttery") === v ? " pri" : ""}" data-tv="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join(""); $$("[data-tv]", el).forEach(b => b.onclick = () => { HS().tvoice = b.dataset.tv; save(); qtVoicePaint(); test(); }); return; }
  const vs = voiceList().filter(v => /^en/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a)), cur = voicePick();
  note.innerHTML = `On iPhone the Claude app doesn't let pages use Claude's own voice, so Quint uses your phone's voices. <b>For a much more human voice, download a Premium one:</b> Settings → Accessibility → Spoken Content (Read &amp; Speak on newer iPhones) → Voices → English, then tap a voice marked Premium, such as Ava, Zoe or Evan (US) or Jamie or Serena (UK), and download it. Come back here and tap it. Robotic voices are marked at the bottom.`;
  el.innerHTML = vs.length ? vs.map(v => `<button class="btn${cur && (cur.voiceURI || cur.name) === (v.voiceURI || v.name) ? " pri" : ""}" data-vu="${esc(v.voiceURI || v.name)}">${esc(v.name.replace(/\s*\(.*\)$/, ""))} <small>${esc(v.lang)}${voiceScore(v) < 0 ? " · robotic" : /premium/i.test(v.name + v.voiceURI) ? " · premium" : /enhanced/i.test(v.name + v.voiceURI) ? " · enhanced" : ""}</small></button>`).join("") : `<p class="small">No voices are listed yet. Tap 🔊 Listen on any answer, then come back.</p>`;
  $$("[data-vu]", el).forEach(b => b.onclick = () => { HS().voice = b.dataset.vu; save(); qtVoicePaint(); test(); });
}
/* ---------- sound effects, haptics and the 3D Quint core ---------- */
// ZzFX - Zuper Zmall Zound Zynth - Micro Edition, v1.4.0 by Frank Force
// MIT License - Copyright 2019 Frank Force - https://github.com/KilledByAPixel/ZzFX
// (vendored; the only change: the audio context is created on the first tap, as iPhones require, and volume follows the setting)
let zzfxV = .3, zzfxX = null;
const zzfx = (volume = 1, randomness = .05, frequency = 220, attack = 0, sustain = 0, release = .1, shape = 0, shapeCurve = 1, slide = 0, deltaSlide = 0, pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0, bitCrush = 0, delay = 0, sustainVolume = 1, decay = 0, tremolo = 0, filter = 0) => {
  if (!zzfxX) return null;
  const sampleRate = 44100; let PI2 = Math.PI * 2, abs = Math.abs, sign = v => v < 0 ? -1 : 1, startSlide = slide *= 500 * PI2 / sampleRate / sampleRate,
    startFrequency = frequency *= (1 + randomness * 2 * Math.random() - randomness) * PI2 / sampleRate, modOffset = 0, repeat = 0, crush = 0, jump = 1, length, b = [], t = 0, i = 0, s = 0, f,
    source = zzfxX.createBufferSource(), buffer, quality = 2, w = PI2 * abs(filter) * 2 / sampleRate, cos = Math.cos(w), alpha = Math.sin(w) / 2 / quality,
    a0 = 1 + alpha, a1 = -2 * cos / a0, a2 = (1 - alpha) / a0, b0 = (1 + sign(filter) * cos) / 2 / a0, b1 = -(sign(filter) + cos) / a0, b2 = b0, x2 = 0, x1 = 0, y2 = 0, y1 = 0;
  const minAttack = 9; attack = attack * sampleRate || minAttack; decay *= sampleRate; sustain *= sampleRate; release *= sampleRate; delay *= sampleRate; deltaSlide *= 500 * PI2 / sampleRate ** 3;
  modulation *= PI2 / sampleRate; pitchJump *= PI2 / sampleRate; pitchJumpTime *= sampleRate; repeatTime = repeatTime * sampleRate | 0; volume *= zzfxV;
  for (length = attack + decay + sustain + release + delay | 0; i < length; b[i++] = s * volume) {
    if (!(++crush % (bitCrush * 100 | 0))) {
      s = shape ? shape > 1 ? shape > 2 ? shape > 3 ? shape > 4 ? (t / PI2 % 1 < shapeCurve / 2) * 2 - 1 : Math.sin(t ** 3) : Math.max(Math.min(Math.tan(t), 1), -1) : 1 - (2 * t / PI2 % 2 + 2) % 2 : 1 - 4 * abs(Math.round(t / PI2) - t / PI2) : Math.sin(t);
      s = (repeatTime ? 1 - tremolo + tremolo * Math.sin(PI2 * i / repeatTime) : 1) * (shape > 4 ? s : sign(s) * abs(s) ** shapeCurve) *
        (i < attack ? i / attack : i < attack + decay ? 1 - ((i - attack) / decay) * (1 - sustainVolume) : i < attack + decay + sustain ? sustainVolume : i < length - delay ? (length - i - delay) / release * sustainVolume : 0);
      s = delay ? s / 2 + (delay > i ? 0 : (i < length - delay ? 1 : (length - i) / delay) * b[i - delay | 0] / 2 / volume) : s;
      if (filter) s = y1 = b2 * x2 + b1 * (x2 = x1) + b0 * (x1 = s) - a2 * y2 - a1 * (y2 = y1);
    }
    f = (frequency += slide += deltaSlide) * Math.cos(modulation * modOffset++); t += f + f * noise * (i * i * PI2 % 2 - 1);
    if (jump && ++jump > pitchJumpTime) { frequency += pitchJump; startFrequency += pitchJump; jump = 0; }
    if (repeatTime && !(++repeat % repeatTime)) { frequency = startFrequency; slide = startSlide; jump ||= 1; }
  }
  buffer = zzfxX.createBuffer(1, b.length, sampleRate); buffer.getChannelData(0).set(b); source.buffer = buffer; source.connect(zzfxX.destination); source.start(); return source;
};
// What each moment sounds like: [delay ms, ZzFX parameters] steps. Short, quiet, and each one means something.
const FX_SND = {
  buy: [[0, [.55, 0, 523, .005, .05, .16, 0]], [85, [.55, 0, 784, .005, .07, .24, 0]]],          // rising: a buy call
  sell: [[0, [.55, 0, 784, .005, .05, .16, 0]], [85, [.55, 0, 523, .005, .07, .24, 0]]],         // falling: a sell call
  flat: [[0, [.4, 0, 392, .005, .04, .18, 0]]],                                                   // no trade
  right: [[0, [.5, 0, 1047, .004, .03, .14, 0]], [80, [.5, 0, 1319, .004, .05, .22, 0]]],       // practice: right
  wrong: [[0, [.45, 0, 196, .01, .07, .2, 2, 1, -.6, , , , , , , , , , , , 900]]],               // practice: wrong
  win: [[0, [.5, 0, 523, .004, .04, .12, 0]], [70, [.5, 0, 659, .004, .04, .12, 0]], [140, [.55, 0, 1047, .004, .08, .3, 0]]], // target hit
  loss: [[0, [.5, 0, 220, .01, .1, .3, 1, 1, -.8]]],                                              // stop hit
  alert: [[0, [.45, 0, 1568, .002, .02, .5, 0, 1, , , , , , , , , .09]]],                          // alert set
  warn: [[0, [.4, 0, 330, .005, .06, .06, 1]], [160, [.4, 0, 330, .005, .06, .06, 1]]],          // careful
  on: [[0, [.4, 0, 660, .005, .04, .1, 0, 1, 6]]], off: [[0, [.4, 0, 880, .005, .04, .1, 0, 1, -6]]], // voice mode on and off
  draw: [[0, [.25, 0, 1400, .002, .01, .04, 1]]],                                                 // a line placed
};
// What each moment feels like: ticks (iPhone) or a vibration pattern in ms (Android)
const FX_HAP = { tick: [1, [8]], draw: [1, [10]], buy: [2, [14, 70, 22]], sell: [2, [22, 70, 14]], flat: [1, [12]], right: [2, [12, 60, 18]], wrong: [3, [30, 50, 30, 50, 30]], win: [3, [12, 50, 12, 50, 30]], loss: [2, [40, 60, 40]], alert: [2, [18, 80, 18]], warn: [2, [25, 90, 25]], on: [1, [16]], off: [1, [10]] };
const fxCfg = () => { const h = HS(); if (!h.fx || typeof h.fx !== "object") h.fx = { snd: true, hap: true }; return h.fx; };
const FXH = { lab: null, inp: null };
function fxUnlock() { // inside a tap: wake the audio, build the haptic switch
  try { if (!zzfxX) { const A = window.AudioContext || window.webkitAudioContext; if (A) zzfxX = new A(); } if (zzfxX && zzfxX.state === "suspended") zzfxX.resume(); } catch (e) {}
  if (!FXH.lab && document.body) { try { const l = document.createElement("label"), i = document.createElement("input"); i.type = "checkbox"; i.setAttribute("switch", ""); i.tabIndex = -1; l.setAttribute("aria-hidden", "true"); l.style.cssText = "position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden"; l.appendChild(i); document.body.appendChild(l); FXH.lab = l; FXH.inp = i; } catch (e) {} }
}
function fxHaptic(name) { // iPhone (Safari 17.4+): toggling a switch inside a tap gives a Taptic tick (the technique from lochie/web-haptics, MIT). Android: the Vibration API.
  if (!fxCfg().hap) return; const h = FX_HAP[name] || FX_HAP.tick;
  try { if (navigator.vibrate && !/iP(hone|ad|od)/.test(navigator.userAgent)) { navigator.vibrate(h[1]); return; } } catch (e) {}
  if (!FXH.lab) return; for (let k = 0; k < h[0]; k++) setTimeout(() => { try { FXH.lab.click(); } catch (e) {} }, k * 70);
  (window.__haps = window.__haps || []).push(name);
}
function sfx(name, o = {}) { // play a moment: its sound and its feel
  const c = fxCfg(); if (o.hap !== false) fxHaptic(name);
  if (!c.snd || o.snd === false || !FX_SND[name]) return; if (QT && QT.speaking && !o.over) return; // never talk over Quint
  zzfxV = clamp(c.vol != null ? +c.vol : .3, 0, 1); (window.__sfx = window.__sfx || []).push(name);
  for (const [ms, p] of FX_SND[name]) setTimeout(() => { try { zzfx(...p); } catch (e) {} }, ms);
}
function fxInit() { // each app calls this once
  if (FXH.init || typeof document === "undefined") return; FXH.init = true;
  document.addEventListener("pointerdown", fxUnlock, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && QCORE.cvs.size && !QCORE.raf) QCORE.raf = requestAnimationFrame(qcLoop); });
  document.addEventListener("click", e => { // a light tick on the buttons that matter, so the app feels physical
    const t = e.target.closest && e.target.closest(".btn.pri, .ord, .tabbar button, .seg button, .opts button, .chips button, .lcbar button, [data-su], [data-g], .ask .go, #go");
    if (t && !t.disabled) fxHaptic("tick");
    const o = e.target.closest && e.target.closest(".opt"); if (o) setTimeout(() => { if (o.classList.contains("right")) sfx("right", { hap: false }); else if (o.classList.contains("wrong")) sfx("wrong", { hap: false }); }, 0);
  }, true);
}

/* the 3D Quint core: a glowing wireframe icosahedron with an orbit of points, drawn with a plain canvas projection.
   It turns slowly at rest, spins while Quint thinks, pulses while he talks and breathes while he listens. */
const QCORE = { cvs: new Set(), raf: 0, t0: 0 };
const QC_V = (() => { const p = (1 + Math.sqrt(5)) / 2, v = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]]; return v.map(a => { const n = Math.hypot(...a); return a.map(x => x / n); }); })();
const QC_E = (() => { const e = []; for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) { const d = Math.hypot(QC_V[i][0] - QC_V[j][0], QC_V[i][1] - QC_V[j][1], QC_V[i][2] - QC_V[j][2]); if (d < 1.1) e.push([i, j]); } return e; })();
const QC_P = Array.from({ length: 42 }, (_, k) => { const y = 1 - (k + .5) / 21, r = Math.sqrt(Math.max(0, 1 - y * y)), a = k * 2.39996; return [Math.cos(a) * r, y, Math.sin(a) * r]; }); // Fibonacci sphere
function qcState() { return typeof VM !== "undefined" && VM.on && VM.st !== "idle" && VM.st !== "type" ? VM.st : (typeof DK !== "undefined" && DK.busy) ? "think" : (QT && QT.speaking) ? "speak" : "idle"; }
function qcDraw(cv, now) {
  const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return; const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const x = cv.getContext("2d"), st = qcState(), t = now / 1000, sp = st === "think" ? 2.6 : st === "speak" ? 1.4 : st === "listen" ? 1 : .45;
  QCORE.ang = (QCORE.ang || 0) + sp * Math.min(.05, (now - (QCORE.last || now)) / 1000); QCORE.last = now; const a = QCORE.ang, b = a * .63 + .4;
  const pulse = st === "speak" ? 1 + .1 * Math.sin(t * 17) * Math.sin(t * 5.3) : st === "listen" ? 1 + .06 * Math.sin(t * 4) : 1, R = Math.min(W, H) * .36 * pulse, cx = W / 2, cy = H / 2;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), pr = v => { const x1 = v[0] * ca + v[2] * sa, z1 = -v[0] * sa + v[2] * ca, y1 = v[1] * cb - z1 * sb, z2 = v[1] * sb + z1 * cb, k = 2.6 / (2.6 + z2); return [cx + x1 * R * k, cy + y1 * R * k, z2]; };
  const c1 = st === "think" ? "155,107,255" : "41,216,255", c2 = st === "think" ? "41,216,255" : "155,107,255";
  x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5); g.addColorStop(0, `rgba(${c1},.32)`); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const P = QC_V.map(pr); x.lineWidth = Math.max(.8, R / 22);
  for (const [i, j] of QC_E) { const z = (P[i][2] + P[j][2]) / 2, al = .35 + .5 * (1 - (z + 1) / 2); x.strokeStyle = `rgba(${c1},${al.toFixed(2)})`; x.beginPath(); x.moveTo(P[i][0], P[i][1]); x.lineTo(P[j][0], P[j][1]); x.stroke(); }
  for (const p of QC_P.map(v => pr([v[0] * 1.35, v[1] * .25 * 1.35, v[2] * 1.35]))) { const al = .3 + .6 * (1 - (p[2] + 1.4) / 2.8); x.fillStyle = `rgba(${c2},${al.toFixed(2)})`; x.beginPath(); x.arc(p[0], p[1], Math.max(.7, R / 26), 0, Math.PI * 2); x.fill(); }
  x.fillStyle = "#fff"; x.globalAlpha = .9; x.beginPath(); x.arc(cx, cy, Math.max(1.2, R * .16), 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
}
function qcLoop(now) {
  QCORE.raf = 0; for (const cv of [...QCORE.cvs]) if (!cv.isConnected) QCORE.cvs.delete(cv); if (!QCORE.cvs.size || document.hidden) return;
  for (const cv of QCORE.cvs) try { qcDraw(cv, now); } catch (e) {}
  if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) QCORE.raf = requestAnimationFrame(qcLoop);
}
function qcMount(host) { // swap a CSS orb (or any empty box) for the 3D core
  if (!host || host.querySelector("canvas.qcore")) return; const cv = document.createElement("canvas"); cv.className = "qcore"; cv.setAttribute("aria-hidden", "true"); host.classList.add("has3d"); host.appendChild(cv); QCORE.cvs.add(cv);
  if (!QCORE.raf) QCORE.raf = requestAnimationFrame(qcLoop);
}
/* ---------- voice mode: talk to Quint, he answers out loud, then listens again ----------
   Each app hands vmToggle an adapter: { input, send(text), speak(text, done), hush(), paint(), lang }.
   Listening uses the phone's speech recognition where the page is allowed it; where it isn't, the keyboard's
   own dictation (the 🎤 key) does the listening and Quint still answers out loud. */
const VM = { on: false, st: "off", rec: null, txt: "", o: null, noRec: false, noAuto: false };
const vmRecog = () => VM.noRec ? null : (window.SpeechRecognition || window.webkitSpeechRecognition || null);
function vmHint() { return VM.on ? "\nVOICE MODE: the user is talking to you out loud and hears your reply read aloud. Answer in a few natural spoken sentences (under about 90 words unless they ask for detail), with no tables, lists, headings or symbols. If you make a trade call, still end with the CALL line." : ""; }
function vmPaint() { if (VM.o && VM.o.paint) try { VM.o.paint(VM); } catch (e) {} }
function vmStopRec() { const r = VM.rec; VM.rec = null; if (r) { try { r.onend = null; r.abort(); } catch (e) {} } }
function vmListen(auto) {
  if (!VM.on) return; const R = vmRecog(); vmStopRec();
  if (!R || (auto && VM.noAuto)) { VM.st = R ? "idle" : "type"; vmPaint(); if (!R && VM.o.input && !auto) try { VM.o.input.focus(); } catch (e) {} return; }
  let rec; try { rec = new R(); } catch (e) { VM.noRec = true; VM.st = "type"; vmPaint(); return; }
  rec.lang = VM.o.lang || navigator.language || "en-GB"; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1; VM.txt = "";
  rec.onresult = e => { let t = ""; for (let k = 0; k < e.results.length; k++) t += e.results[k][0].transcript; VM.txt = t; if (VM.o.input) VM.o.input.value = t; vmPaint(); };
  rec.onerror = e => { const c = e && e.error; if (c === "not-allowed" || c === "service-not-allowed" || c === "audio-capture") { if (auto) VM.noAuto = true; else VM.noRec = true; } };
  rec.onend = () => { if (VM.rec !== rec) return; VM.rec = null; const t = VM.txt.trim(); VM.txt = ""; if (!VM.on) return;
    if (t) { if (VM.o.input) VM.o.input.value = ""; VM.st = "think"; vmPaint(); VM.o.send(t); } else { VM.st = vmRecog() ? "idle" : "type"; vmPaint(); } };
  try { rec.start(); VM.rec = rec; VM.st = "listen"; } catch (e) { if (auto) VM.noAuto = true; else VM.noRec = true; VM.st = vmRecog() ? "idle" : "type"; }
  vmPaint();
}
function vmToggle(o) { // the mic button: start voice mode, talk, cut in while Quint speaks, or finish talking
  if (!VM.on) { VM.on = true; VM.o = o; VM.noAuto = false; vmUnlock(); sfx("on"); vmListen(false); return; } // listening starts inside the tap, as phones require
  VM.o = o;
  if (VM.st === "listen") { const r = VM.rec; if (r) try { r.stop(); } catch (e) { vmStopRec(); VM.st = "idle"; vmPaint(); } return; } // done talking: send what was heard
  if (VM.st === "speak") { try { o.hush(); } catch (e) {} VM.st = "idle"; vmListen(false); return; } // cut in
  if (VM.st === "think") return;
  vmListen(false);
}
function vmEnd() { if (!VM.on) return; sfx("off"); VM.on = false; vmStopRec(); try { VM.o && VM.o.hush(); } catch (e) {} VM.st = "off"; vmPaint(); }
function vmAnswer(text) { // an answer arrived: say it, then listen again
  if (!VM.on || !VM.o) return; if (!text) { VM.st = vmRecog() ? "idle" : "type"; vmPaint(); return; }
  const back = VM.st === "type", id = VM.sid = (VM.sid || 0) + 1; VM.st = "speak"; vmPaint();
  VM.o.speak(text, () => { if (!VM.on || VM.st !== "speak" || VM.sid !== id) return; if (back || !vmRecog()) { VM.st = vmRecog() ? "idle" : "type"; vmPaint(); return; } VM.st = "idle"; vmPaint(); setTimeout(() => { if (VM.on && VM.st === "idle") vmListen(true); }, 400); });
}
function vmLabel(V) { // what the voice strip says in each state
  return V.st === "listen" ? (V.txt ? `“${V.txt}”` : "Listening… speak now, then pause") : V.st === "think" ? "Quint is thinking…" : V.st === "speak" ? "Quint is talking: tap 🎙 to cut in"
    : V.st === "type" ? "Tap the 🎤 on your keyboard, speak, then send. Quint answers out loud." : "Tap 🎙 to talk";
}
function vmUnlock() { // a silent word inside the tap, so the phone lets Quint's voice play later without another tap
  try { if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined") { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } } catch (e) {}
}
/* ---------- speaking like a person: turn screen text into words a trader would say out loud ---------- */
// Chart shorthand a voice would otherwise spell out or garble
const SAY_WORDS = [[/\bVWAP\b/g, "V-wap"], [/\bORH\b/g, "the opening range high"], [/\bORL\b/g, "the opening range low"], [/\bONH\b/g, "the overnight high"], [/\bONL\b/g, "the overnight low"],
  [/\bPDH\b/g, "yesterday's high"], [/\bPDL\b/g, "yesterday's low"], [/\bPDC\b/g, "yesterday's close"], [/\bNYO\b/g, "the New York open"], [/\bFVG\b/g, "fair value gap"], [/\bBOS\b/g, "break of structure"],
  [/\bCHoCH\b/g, "change of character"], [/\bR:R\b/g, "reward to risk"], [/\bATR\b/g, "A T R"], [/\bEMA\b/g, "E M A"], [/\bSMA\b/g, "S M A"], [/\bRSI\b/g, "R S I"], [/\bCISD\b/g, "C I S D"], [/\bP&L\b/g, "P and L"],
  [/\bMNQ\b/g, "M N Q"], [/\bMES\b/g, "M E S"], [/\bNQ\b/g, "N Q"], [/\bES\b/g, "E S"], [/\bYM\b/g, "Y M"], [/\bRTY\b/g, "Russell"], [/\bMGC\b/g, "micro gold"], [/\bCME\b/g, "C M E"], [/\bFOMC\b/g, "F O M C"], [/\bCPI\b/g, "C P I"], [/\bNFP\b/g, "the jobs report"],
  [/\bNY\b/g, "New York"], [/\bET\b/g, "New York time"], [/\be\.g\.\s*/gi, "for example "], [/\bi\.e\.\s*/gi, "that is "], [/\bvs\.?\s/gi, "versus "], [/\bw\/\s?/gi, "with "], [/\bpts?\b/g, m => m === "pt" ? "point" : "points"], [/\b(\d+) min\b/g, "$1 minutes"], [/\bmins\b/g, "minutes"],
  [/\b(\d+)m\b/g, "$1-minute"], [/\b1h\b/g, "hourly"], [/\b(\d+)h\b/g, "$1-hour"], [/\b1D\b/g, "daily"], [/\b(\d+(?:\.\d+)?)\s?R\b/g, (m, x) => `${+x} R`]];
const SAY_HEAD = { why: "Here's why.", levels: "The levels.", plan: "The plan.", risk: "The risk.", news: "The news.", context: "The bigger picture.", summary: "In short." };
function sayNum(s) { // 27347.25 -> "27,347 and a quarter"; other decimals are left as they are
  s = String(s); const neg = /^[−-]/.test(s), x = +s.replace(/[−,+-]/g, ""); if (!isFinite(x)) return s;
  const whole = Math.trunc(x), fr = Math.round((x - whole) * 100), big = whole >= 1000 ? nf(0).format(whole) : String(whole);
  const tail = fr === 0 ? "" : fr === 25 ? " and a quarter" : fr === 50 ? " and a half" : fr === 75 ? " and three quarters" : null;
  return (neg ? "minus " : "") + (tail == null ? (whole >= 1000 && s.includes(".") ? big + "." + s.split(".")[1] : s.replace(/^[−+-]/, "")) : big + tail);
}
function sayable(t) {
  let s = String(t || "").replace(/https?:\/\/\S+/g, "a link").replace(/^\s*(?:[-*+•]|\d{1,2}[.)])\s+/gm, "").replace(/\s*▲/g, " up,").replace(/\s*▼/g, " down,").replace(/\s*◆/g, " flat,").replace(/\s*→\s*/g, " to ").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}️]/gu, " ");
  s = s.replace(/\s*[·•|]\s*/g, ", ").replace(/\s*→\s*/g, " to ").replace(/~\s?|≈\s?/g, "about ").replace(/\s&\s/g, " and ").replace(/\s*\(([^)]{1,80})\)/g, ", $1,");
  for (const [rx, to] of SAY_WORDS) s = s.replace(rx, to);
  s = s.replace(/\b(BUY|SELL|NOW|LONG|SHORT|WAIT|STOP|TARGET|ENTRY|NO TRADE|STAY OUT|HOLD|LEAN|AND|THE|AT|ON|OR)\b/g, w => w.toLowerCase()).replace(/(^|[.!?]\s+|\n)([a-z])/g, (m, a, c) => a + c.toUpperCase());
  s = s.replace(/([+−-])?\$?\b\d[\d,]*\.\d{1,2}\b/g, m => { const d = m.indexOf("$"); return d >= 0 ? m.slice(0, d) + "$" + sayNum(m.slice(d + 1)) : (m[0] === "+" ? "plus " : "") + sayNum(m); })
    .replace(/(^|[\s,])[−-](?=\$?\d)/gm, "$1minus ").replace(/(^|[\s,])\+(?=\$?\d)/gm, "$1plus ");
  return s.split("\n").map(l => l.trim().replace(/^[,\s]+/, "")).filter(Boolean).map(l => { const h = SAY_HEAD[l.toLowerCase().replace(/[:.]$/, "")]; return h || (/[.!?:;,]$/.test(l) ? l : l + "."); })
    .join("\n").replace(/,\s*,/g, ",").replace(/,\s*([.!?])/g, "$1").replace(/[ \t]+([.,!?])/g, "$1").replace(/[ \t]{2,}/g, " ").trim();
}
function sayCall(c, name) { // the trade call, the way a mentor would say it across the desk
  if (!c) return ""; const p = v => sayNum(String(v)), who = sayable(name || "it").replace(/\.$/, "");
  if (!c.side) return c.wait ? `No trade on ${who} yet. I'm waiting for ${sayable(c.wait).replace(/\.$/, "").replace(/^(?!New\b|I\b)[A-Z](?=[a-z\s])/, x => x.toLowerCase())}.` : `No trade on ${who} right now. I'd stay out.`;
  const bits = [`${c.side > 0 ? "Buy" : "Sell"} ${who}.`], risk = c.entry != null && c.stop != null ? Math.abs(c.entry - c.stop) : null;
  bits.push(`${c.now || c.entry == null ? "In at the market" : `In at ${p(c.entry)}`}${c.stop != null ? `, stop ${p(c.stop)}` : ""}${risk ? `, that's ${sayNum(String(Math.round(risk * 100) / 100))} points of risk` : ""}${c.tgt != null ? `, target ${p(c.tgt)}` : ""}.`);
  if (c.conf != null) bits.push(c.conf >= 70 ? `I like this one, about ${c.conf} percent.` : c.conf >= 55 ? `I'm about ${c.conf} percent on it.` : `Only about ${c.conf} percent, so keep it small.`);
  return bits.join(" ");
}
function saySplit(t) { // one sentence per utterance, so phone voices pause naturally between them; tiny fragments ride with the one before
  const out = [];
  for (const para of String(t).split("\n")) for (const x of para.split(/(?<=[.!?])\s+(?=[A-Z0-9$"'])/)) {
    const y = x.trim(); if (!y) continue; if (out.length && y.length < 25 && out[out.length - 1].length < 140) out[out.length - 1] += " " + y; else out.push(y); }
  return out.slice(0, 60);
}
function sayScript(raw, name) { // what Quint says out loud for one answer: the call first, then the reasons
  const c = typeof dkParse === "function" ? dkParse(raw) : null, px = /^\s*PRICE:\s*([0-9][0-9,]*\.?[0-9]*)/im.exec(String(raw || "")); if (c && c.side && c.entry == null && px) c.entry = +px[1].replace(/,/g, ""); let plain = mdPlain(typeof dkClean === "function" ? dkClean(raw) : raw);
  if (c) plain = plain.replace(/^\s*(BUY|SELL|LONG|SHORT|NO TRADE|STAY OUT|WAIT)\b[^\n]*\n?/i, ""); // the spoken call replaces the headline that says the same thing
  plain = plain.replace(/^\s*PRICE:[^\n]*$/gim, ""); const body = sayable(plain);
  return [c ? sayCall(c, name) : "", body].filter(Boolean).join("\n");
}
function sayLines(script) { // Claude's voice reads best a paragraph at a time (each line up to 2,000 characters)
  const out = []; let cur = ""; for (const para of script.split("\n")) { if (cur && (cur + " " + para).length > 600) { out.push(cur); cur = para.slice(0, 1900); } else cur = cur ? cur + " " + para : para.slice(0, 1900); } if (cur) out.push(cur); return out.slice(0, 12);
}
function qtSpeak(text, btn, name, cb) {
  let fin = false; const done = () => { QT.speaking = false; $$(".qtsay").forEach(b => { b.textContent = "🔊 Listen"; }); if (cb && !fin) { fin = true; cb(); } };
  if (QT.speaking && !cb) { try { if (QT.tts) QT.tts.stop(); else window.speechSynthesis.cancel(); } catch (e) {} done(); return; }
  const script = sayScript(text, name); if (!script) { done(); return; }
  QT.speaking = true; if (btn) btn.textContent = "■ Stop"; const rate = clamp(+HS().vrate || 1, 0.7, 1.5);
  if (QT.tts) { QT.tts.speak(sayLines(script).map(t => ({ text: t, voice: HS().tvoice || "buttery", rate, language: "en" }))).catch(() => {}).then(done); return; }
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") { done(); qtToast("This device can't read aloud here."); return; }
  try { window.speechSynthesis.cancel(); const v = voicePick(), parts = saySplit(script);
    parts.forEach((t, i) => { const u = new SpeechSynthesisUtterance(t); if (v) { u.voice = v; u.lang = v.lang; } u.rate = rate; u.pitch = /\?$/.test(t) ? 1.04 : 1; if (i === parts.length - 1) { u.onend = done; u.onerror = done; } window.speechSynthesis.speak(u); }); } catch (e) { done(); }
}
const sayBtn = () => `<button class="chip qtsay" type="button">🔊 Listen</button>`;
function bindSay(root, getText) { $$(".qtsay", root).forEach(b => { b.onclick = () => qtSpeak(getText(b), b); }); }

/* ---------- home card and menu ---------- */
function qtPaintHome() { // one line on the home screen: Quint's own chat is a tab of its own
  const el = $("#hmQT"); if (!el) return; if (shReading() || !CO.sample) { if (el.firstChild) el.innerHTML = ""; return; }
  const r = dkRec(), n = dkAls().filter(a => !a.gone && a.exp > Date.now()).length, sig = [r.n, r.w, r.live, n, TS()].join("|"); if (el.dataset.sig === sig && el.firstChild) return; el.dataset.sig = sig;
  el.innerHTML = `<button class="qask" data-qt="chat"><span class="qorb" aria-hidden="true"><s></s><s></s><i></i></span><span class="tx"><b>Ask Quint: buy or sell MNQ now?</b><small>Straight calls with entry, stop and target${r.n ? ` · record ${r.w}W ${r.n - r.w}L` : r.live ? ` · ${r.live} call${r.live > 1 ? "s" : ""} being tracked` : ""}${n ? ` · 🔔 ${n} alert${n > 1 ? "s" : ""} on` : ""}</small></span><span class="go" aria-hidden="true">›</span></button><button class="qask sm" data-qt="best"><span class="tx"><b>🏆 Learn your 3 strategies</b><small>The 20-candle breakout and the New York open: the two that beat fees on TradingView</small></span><span class="go" aria-hidden="true">›</span></button>`;
}
function qtGo(k) {
  if (k === "chat") { closeSheet(); openQuint(); return; }
  if (k === "voice") { openVoice(); return; }
  if (k === "mnq" || k === "ask") { if (k === "ask") DK.open = true; MK.homeY = $("#hmHome") ? $("#hmHome").scrollTop : 0; closeSheet(); mkShow("chart", "MNQ"); return; }
  ({ shot: openShot, movers: openMovers, prac: openPrac, lab: () => openBL(), style: openStyle, risk: openRisk, best: openBest })[k]();
}

/* ---------- trading style: scalping and day trading ---------- */
function tsCompareHTML() {
  const row = (a, b, c) => `<tr><th>${a}</th><td>${b}</td><td>${c}</td></tr>`;
  return `<div class="qttab"><table><thead><tr><th></th><th>⚡ Scalping</th><th>🕐 Day trading</th></tr></thead><tbody>
    ${row("A trade lasts", "Seconds to about 15 minutes", "15 minutes to a few hours, closed before the session ends")}
    ${row("Charts", "1m and 5m to enter, 15m for direction", "15m and 5m to enter, 1h and daily for direction")}
    ${row("What you're catching", "One small push between two nearby levels", "A leg of the day's move, or the whole trend of the session")}
    ${row("Stop", "Tight: just past the last 1m or 5m swing", "Wider: past the last 15m swing or a key level")}
    ${row("Size", "Bigger size on a small stop", "Smaller size on a wide stop, so the dollars at risk match")}
    ${row("Costs", "A big bite of every trade, so the target must be several times the cost", "A small bite, because each trade aims for more points")}
    ${row("Trades a day", "Many, so one bad habit repeats fast", "One to three good ones is plenty")}
    ${row("Hardest part", "Speed and not overtrading", "Sitting through pullbacks without closing early")}
  </tbody></table></div><p class="small">Neither is "better". Scalping asks for fast, repeated decisions and loses more to costs. Day trading asks for patience and a view on where the whole session is going. Most people find holding winners harder than finding entries.</p>`;
}
function tsDirHTML() {
  return `<p>Before any trade, short or long, answer one question: <b>which way is today leaning?</b> Work from the big chart down:</p><ol style="padding-left:20px;margin:0">
    <li><b>Daily:</b> is price above or below yesterday's high, low and close, and the 20 EMA? Above yesterday's high leans up; below yesterday's low leans down; in between is undecided.</li>
    <li><b>1 hour:</b> are the swing highs and lows stepping up (higher highs, higher lows), stepping down, or overlapping? Overlapping means a range: buy low, sell high, expect breakouts to fail.</li>
    <li><b>15 minutes:</b> where is price inside today's range, and which side of VWAP is it on? Above VWAP with shallow pullbacks is a buyers' day; the mirror image is a sellers' day.</li>
    <li><b>Then the 5m or 1m:</b> only now look for an entry, and only in the direction the first three agree on. If they disagree, trade smaller or wait.</li></ol>
    <p><b>Trend day or range day?</b> A trend day opens, leaves, and does not come back: pullbacks are small and VWAP holds. A range day keeps returning to the middle. On a trend day the day trader's job is to stay in; on a range day the scalper's quick targets work better. The day's biggest moves usually start around the US open (9:30 New York) and scheduled news.</p>
    <p class="small">Holding a trade for an hour or two: decide the stop and the first target before entry, move the stop only in the trade's favour and only behind a new swing, and take the trade off if the bigger chart flips against you.</p>`;
}
LESSONS.unshift(["Scalping vs day trading: pick your game", "Styles", () => `<p>The same chart can be traded on very different clocks. Know which one you're playing before you click, because the stop, the size, the target and the charts you read all change.</p>${tsCompareHTML()}`], ["Reading direction: where is the day heading?", "Direction", tsDirHTML]);
LESSON_SRC["Reading direction: where is the day heading?"] = ["mop", "gao"]; LESSON_SRC["Scalping vs day trading: pick your game"] = ["bllo", "chague"];
function openStyle() {
  const chips = () => Object.entries(TS_DEF).map(([k, d]) => `<button class="chip" data-k="${k}" aria-pressed="${TS() === k}">${d.ic} ${esc(d.name)}</button>`).join("");
  openSheet(`${shead("🎚 How you trade")}<p class="small">Pick how long your trades usually last. Quint matches his reads, stops and targets to it, in chat, on screenshots and on the Nasdaq page.</p><div class="chips" id="tsC">${chips()}</div><p class="small" id="tsNow"></p>
    <h3>Scalping vs day trading</h3>${tsCompareHTML()}<h3>Direction first</h3>${tsDirHTML()}
    <div class="qtrow"><button class="btn pri" id="tsP1">🎯 Practise on MNQ charts</button><button class="btn" id="tsP2">Day-trade charts ▸</button><button class="btn" id="tsP3">Scalp charts ▸</button></div>`, s => {
    const now = () => { const d = TS_DEF[TS()]; $("#tsNow", s).textContent = `Now: ${d.name}. Trades last ${d.hold}.`; }; now();
    $$("#tsC .chip", s).forEach(b => b.onclick = () => { ST.tstyle = b.dataset.k; save(); $$("#tsC .chip", s).forEach(x => x.setAttribute("aria-pressed", x === b)); now(); qtPaintHome(); });
    const go = pack => { ST.mkt = "NQ"; closeSheet(); mkShow(null); playMode("rapid", { rpack: pack }, pack === "scalp" ? "⚡ Nasdaq scalp charts" : "🕐 Nasdaq day-trade charts"); };
    $("#tsP1", s).onclick = openPrac; $("#tsP2", s).onclick = () => go("intraday"); $("#tsP3", s).onclick = () => go("scalp");
  });
}

/* ---------- send Quint a screenshot of your real chart ---------- */
function qtShrink(file) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { try { const k = Math.min(1, 2000 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); c.toBlob(b => { URL.revokeObjectURL(u); b ? res(b) : rej(new Error("blob")); }, "image/jpeg", 0.9); } catch (e) { rej(e); } };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("image")); }; im.src = u; });
}
function shotPrompt(q) {
  const m = MKDEF.MNQ, Q = MK.q.MNQ, k = TS(), ev = mvSoon();
  return `You are Quint, the trading mentor inside Chart Wizard (you run on Claude, made by Anthropic). The user has sent a screenshot of their own real chart, most likely MNQ on NinjaTrader or TradingView. ${myLine()}

Read the screenshot carefully before you answer:
- The instrument, the timeframe, the last price and the time shown.
- Any open position (side, size, entry price, open profit or loss) and any working orders.
- Every line or level the user has drawn, with its price from the price scale, and what the candles did there.
- Structure: swing highs and lows, trend or range, the most recent strong move, and volume if it is shown.
Rules: use only what is visible in the image and the facts below. Quote real prices from the price scale. If something is too small or cut off to read, say so; never guess a number.
Be decisive: give ONE clear call, BUY, SELL or NO TRADE, with an exact entry, stop and target from real levels on the chart. Never answer "it depends" and never list options without choosing. NO TRADE is a call too: say exactly what would make you take one. State your confidence honestly as the chance the target is hit before the stop (50% is a coin flip, good setups are usually 55 to 70%, never above 85%); every call is logged and graded against real candles afterwards.

Answer in this exact shape, in short simple sentences:
**The call in one bold line, e.g. BUY MNQ now: stop 27,321, target 27,420, 64%**
### What I can see
### Which way it's heading
(the bigger picture first, then the next few candles, and say which timeframe each read is for)
### Key levels
### The plan
(${k === "scalp" ? "for a scalp lasting minutes" : k === "day" ? "for a day trade lasting 15 minutes to a couple of hours" : "one line for a quick scalp and one for a day trade lasting an hour or two"}: the entry idea, where the stop goes and why, the first target, and the risk in dollars for 1 MNQ at $2 a point. Say "stay out" if there is no clean trade.)
### What would prove this wrong
### If you're already in a trade
(only when a position is visible: hold, tighten the stop, take profit or get out, and the price that decides it)
Then a line exactly like "PRICE: 27354.25 MNQ" with the last price and instrument you read from the chart, or "PRICE: unknown".
Then, as the very last line, your call in exactly this format: CALL: BUY · ENTRY NOW · STOP 27321.00 · TARGET 27420.75 · CONF 64% · HOLD 45m (SELL for shorts, ENTRY is NOW or a limit price, HOLD in minutes), or CALL: NO TRADE · CONF 70% · WAIT FOR <what you need to see>.
${Q ? `\nApp data for MNQ from TradingView, ${Q.delay ? `about ${Math.round(Q.delay / 60)} minutes behind (the screenshot is newer, so trust it for the latest price)` : "real-time (if the screenshot shows a different price, it was taken a moment ago)"}:\n${nwMarketFacts(m).map(x => "- " + x).join("\n")}` : ""}${ev ? `\nScheduled US events in the next few hours: ${ev}` : ""}

The user asks: ${q || "Read this chart for me."}`;
}
function shotClean(T) { // hide the PRICE and CALL lines and remember the price Quint read
  const t = String(T.text || ""), k = /^[ \t*_]*PRICE[*_ ]*:[*_ ]*([0-9][0-9,]*\.?[0-9]*|unknown)\s*([A-Za-z0-9!]*)[^\n]*$/im.exec(t);
  if (k && !T.busy && !T.synced && k[1] !== "unknown") { T.synced = true; const p = +k[1].replace(/,/g, ""); if (p > 0 && (!k[2] || /NQ/i.test(k[2]))) { ST.mnq = { p, at: Date.now() }; save(); qtPaintHome(); } }
  return dkClean(t.replace(/^[ \t*_]*PRICE[*_ ]*:.*$/gim, ""));
}
function shotPaint() {
  const out = $("#qtOut"); if (!out) return; const S = QT.shot;
  out.innerHTML = S.turns.map((x, i) => `${i ? `<div class="cmsg u">${esc(x.q)}</div>` : ""}<div class="nwq qtans" data-i="${i}">${qtQ(Object.assign({}, x.T, { text: shotClean(x.T) }))}${x.T.c && dkCallById(x.T.c) ? dkCallHTML(dkCallById(x.T.c), MKDEF.MNQ, true) : ""}${x.T.text && !x.T.busy ? sayBtn() : ""}</div>`).join("");
  bindSay(out, b => shotClean(S.turns[+b.closest(".qtans").dataset.i].T));
  const go = $("#qtGo"), f = $("#qtFollow"); if (go) { go.disabled = S.busy || !S.blob; go.textContent = S.busy ? "Quint is reading…" : S.turns.length ? "Read it again" : "Read my chart"; } if (f) f.hidden = !S.turns.length || S.busy;
}
async function shotAsk(q, fresh) {
  const S = QT.shot; if (S.busy || !S.blob || !CO.sample) return; if (fresh) S.turns = [];
  const T = { text: "", busy: true, open: true, t0: Date.now() }, turn = { q: q || "", T }; S.turns.push(turn); S.busy = true; shotPaint();
  const msgs = []; S.turns.forEach((x, i) => { msgs.push({ role: "user", content: i === 0 ? shotPrompt(x.q) : x.q }); if (x !== turn && x.T.text) msgs.push({ role: "assistant", content: x.T.text }); });
  try { const r = await CO.sample(msgs, { images: [S.blob], onText: ({ text }) => { T.text = text; shotPaint(); }, model: "claude-fable-5-2", modelTier: "complex", effort: "high", cache: false }); if (r && r.text) T.text = r.text; if (!T.text) throw { code: "empty_completion" };
    const c = dkParse(T.text), pk = /^[ \t*_]*PRICE[*_ ]*:[*_ ]*([0-9][0-9,]*\.?[0-9]*)\s*([A-Za-z0-9!]*)/im.exec(T.text), seen = pk && (!pk[2] || /NQ/i.test(pk[2])) ? +pk[1].replace(/,/g, "") : null;
    if (c && (seen || !pk)) { const Q = MK.q.MNQ; T.c = dkLog(c, MKDEF.MNQ, { px: seen || (Q ? Q.p : null), tq: Date.now(), atr: null, tf: "your chart" }, "shot").id; } }
  catch (e) { const c = e && e.code; if (e && e.text) T.text = e.text; T.err = c === "images_unavailable" || c === "image_rejected" ? "Claude couldn't take that image here. Try a smaller or clearer screenshot." : NW_ERR[c] || "Something went wrong reaching Quint. Try again in a moment."; }
  finally { T.busy = false; S.busy = false; shotPaint(); }
}
function openShot() {
  const S = QT.shot;
  openSheet(`${shead("📷 Send Quint a chart")}<p class="small">Screenshot your real chart (NinjaTrader, TradingView, anything) and pick it here. Quint reads the price, your lines, your position and the direction, then gives a lean for how you trade.</p>
    ${CO.sample ? "" : `<p class="nwerr">Quint isn't available in this view, so he can't read screenshots here.</p>`}
    <label class="qtpick"><input type="file" accept="image/*" id="qtFile" hidden><span id="qtPickT">${S.url ? "Choose a different screenshot" : "＋ Choose a screenshot"}</span></label>
    <div id="qtPrev" class="qtprev">${S.url ? `<img src="${S.url}" alt="Your screenshot">` : ""}</div>
    <textarea id="qtQ" class="qtin" rows="2" placeholder="Optional: ask something, e.g. should I hold this long?" aria-label="Your question for Quint"></textarea>
    <button class="btn pri qtwide" id="qtGo" disabled>Read my chart</button>
    <div id="qtOut"></div>
    <form id="qtFollow" class="qtfollow" hidden><input id="qtF" class="qtin" placeholder="Ask a follow-up about this chart…" aria-label="Follow-up question" enterkeyhint="send"><button class="btn pri" type="submit" aria-label="Send">➤</button></form>
    <p class="small">Your screenshot goes to Claude only to answer you; this page doesn't keep it. A lean is a tilt in the odds, not a signal. Not financial advice.</p>`, s => {
    $("#qtFile", s).onchange = async e => { const f = e.target.files && e.target.files[0]; if (!f) return;
      try { const b = await qtShrink(f); if (S.url) URL.revokeObjectURL(S.url); S.blob = b; S.url = URL.createObjectURL(b); S.turns = []; $("#qtPrev", s).innerHTML = `<img src="${S.url}" alt="Your screenshot">`; $("#qtPickT", s).textContent = "Choose a different screenshot"; shotPaint(); }
      catch (err) { qtToast("That file couldn't be opened as an image."); } };
    $("#qtGo", s).onclick = () => shotAsk($("#qtQ", s).value.trim(), true);
    $("#qtFollow", s).onsubmit = e => { e.preventDefault(); const v = $("#qtF", s).value.trim(); if (!v) return; $("#qtF", s).value = ""; shotAsk(v, false); };
    shotPaint();
  });
}

/* ---------- what moves Nasdaq: the index, the big stocks, the calendar and the headlines ---------- */
const MV_BIG = [["NVDA", "Nvidia"], ["AAPL", "Apple"], ["MSFT", "Microsoft"], ["AMZN", "Amazon"], ["GOOGL", "Alphabet"], ["META", "Meta"], ["AVGO", "Broadcom"], ["TSLA", "Tesla"]];
function mvSoon() { // high-importance US events in the next 4 hours, for Quint's prompts
  const d = QT.mv.d; if (!d || !d.cal) return ""; const now = Date.now();
  return d.cal.filter(e => e.imp >= 1 && e.t > now - 9e5 && e.t < now + 4 * 36e5).map(e => `${e.title} at ${fLocal(e.t)}`).join("; ");
}
async function mvLoad(force) {
  const M = QT.mv; if (M.busy) return; if (M.d && !force && Date.now() - M.at < 3e5) return; M.busy = true; M.err = null; mvPaint();
  const day = ms => new Date(ms).toISOString().slice(0, 10), now = Date.now(), st = force ? 0 : 3e5, d = { q: null, cal: null, news: null, earn: null };
  const jobs = [
    tvCall("mcp-tv-get-symbol-data-batch", { symbols: ["NASDAQ:NDX", TV_MNQ, "CBOE:VIX", "TVC:US10Y"].concat(MV_BIG.map(x => "NASDAQ:" + x[0])), columns: ["close", "change", "update_mode"] }, st || false).then(p => { d.q = (p && p.data) || null; }),
    tvCall("mcp-tv-get-economic-calendar", { countries: "US", date_from: day(now), date_to: day(now + 7 * DAYMS), min_importance: 0 }, 18e5).then(p => { d.cal = ((p && p.result) || []).map(e => ({ t: Date.parse(e.date), title: String(e.title || e.indicator || ""), imp: +e.importance || 0, fc: e.forecast, pv: e.previous, ac: e.actual, unit: e.unit || "", per: e.period || "" })).filter(e => e.t && e.title).sort((a, b) => a.t - b.t); }),
    tvCall("mcp-tv-get-news", { symbol: TV_MNQ, limit: 14 }, st || false).then(p => { d.news = (((p && p.data) || {}).headlines || []).map(h => ({ t: (+h.published || 0) * 1000, title: String(h.title || ""), by: h.provider && h.provider.name ? String(h.provider.name) : "", link: /^https:\/\//.test(h.link || "") ? h.link : "", top: +h.urgency === 1 })).filter(h => h.title); }),
    tvCall("mcp-tv-get-earnings-calendar", { symbols: MV_BIG.map(x => "NASDAQ:" + x[0]), date_to: day(now + 21 * DAYMS) }, 6 * 36e5).then(p => { d.earn = (((p && p.data) || {}).earnings || []).map(e => ({ s: String(e.name || ""), t: Date.parse(e.release_next_at || e.release_next_date), ok: !!e.next_date_confirmed })).filter(e => e.t > now - 6 * 36e5).sort((a, b) => a.t - b.t); }),
  ];
  const rs = await Promise.allSettled(jobs); if (rs.every(r => r.status === "rejected")) M.err = tvErr(rs[0].reason);
  if (!M.err || !M.d) M.d = d; M.at = Date.now(); M.busy = false; mvPaint();
}
function mvBriefPrompt() {
  const d = QT.mv.d || {}, q = d.q || {}, pc = s => q[s] && q[s].change != null ? `${q[s].change >= 0 ? "+" : ""}${(+q[s].change).toFixed(2)}%` : "n/a", now = Date.now();
  const L = [`Nasdaq-100 index ${pc("NASDAQ:NDX")} today; MNQ futures ${pc(TV_MNQ)}${MK.tvLive ? " (real-time)" : " (about 10 minutes delayed)"}; VIX ${q["CBOE:VIX"] ? (+q["CBOE:VIX"].close).toFixed(1) : "n/a"} (${pc("CBOE:VIX")}); US 10-year yield ${q["TVC:US10Y"] ? (+q["TVC:US10Y"].close).toFixed(2) + "%" : "n/a"} (${pc("TVC:US10Y")})`,
    `Biggest Nasdaq stocks today: ${MV_BIG.map(x => `${x[0]} ${pc("NASDAQ:" + x[0])}`).join(", ")}`,
    `US stock market: ${mktStatus("stk").label}. Futures: ${mktStatus("fut").label}. The user's local time is ${qtWhen(now)}.`];
  if (d.cal && d.cal.length) L.push("Economic calendar, next 7 days (user's local time):\n" + d.cal.filter(e => e.imp >= 0).slice(0, 18).map(e => `- ${qtWhen(e.t)}: ${e.title}${e.imp >= 1 ? " [HIGH importance]" : ""}${e.ac != null ? `, actual ${e.ac}${e.unit}` : ""}${e.fc != null ? `, forecast ${e.fc}${e.unit}` : ""}${e.pv != null ? `, previous ${e.pv}${e.unit}` : ""}`).join("\n"));
  if (d.earn && d.earn.length) L.push("Big-tech earnings coming: " + d.earn.map(e => `${e.s} ${qtWhen(e.t)}${e.ok ? "" : " (date not confirmed)"}`).join("; "));
  if (d.news && d.news.length) L.push("Latest Nasdaq headlines:\n" + d.news.slice(0, 10).map(h => `- [${fAgo(h.t)}${h.by ? ", " + h.by : ""}] ${h.title}`).join("\n"));
  const mf = MK.q.MNQ ? nwMarketFacts(MKDEF.MNQ) : [];
  return `You are Quint, the trading mentor inside Chart Wizard. Tell the user what matters for MNQ (Micro Nasdaq-100 futures) right now and over the rest of this session and week. ${myLine()}
${NW_RULES.replace("This is practice on a paper account with virtual money, not financial advice.", "This is education, not financial advice.")}

Facts:
${L.map(x => "- " + x).join("\n")}${mf.length ? "\nMNQ price facts:\n" + mf.map(x => "- " + x).join("\n") : ""}

Answer in this exact shape, in short simple sentences:
${NW_LEANFMT}
### The big picture today
### What's moving it
### On the calendar
(the next events that can move Nasdaq, with their times as given, and how traders usually handle the minutes around a big release)
### How to trade it
(for how this user trades: what to look for, when to stand aside, and one risk rule for today)
### What would change the picture`;
}
function mvPaint() {
  const el = $("#mvBody"); if (!el) return; const M = QT.mv, d = M.d, now = Date.now();
  if (!d) { el.innerHTML = M.err ? `<p class="nwerr">${esc(M.err)}</p>` : `<p class="dim">Loading from TradingView…</p>`; return; }
  const q = d.q || {}, chip = (lab, s, dec = 2, unit = "") => { const x = q[s]; if (!x || x.close == null) return ""; const c = +x.change || 0; return `<span class="mvchip ${c >= 0 ? "up" : "dn"}"><small>${esc(lab)}</small><b>${(+x.close).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })}${unit}</b><i>${c >= 0 ? "+" : ""}${c.toFixed(2)}%</i></span>`; };
  const up = MV_BIG.filter(x => q["NASDAQ:" + x[0]] && q["NASDAQ:" + x[0]].change >= 0).length, have = MV_BIG.filter(x => q["NASDAQ:" + x[0]]).length;
  const cal = (d.cal || []).filter(e => e.t > now - 2 * 36e5), days = {}; for (const e of cal) { const k = new Date(e.t).toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" }); (days[k] || (days[k] = [])).push(e); }
  const B = QT.mv.T;
  el.innerHTML = `${M.err ? `<p class="nwerr">${esc(M.err)}</p>` : ""}
    <div class="mvrow">${chip("Nasdaq-100", "NASDAQ:NDX")}${chip("MNQ futures", TV_MNQ)}${chip("VIX (fear)", "CBOE:VIX")}${chip("10-year yield", "TVC:US10Y", 2, "%")}</div>
    ${have ? `<h3>The big stocks <span class="dim">${up} of ${have} up</span></h3><div class="mvrow">${MV_BIG.map(x => chip(x[1], "NASDAQ:" + x[0])).join("")}</div><p class="small">These eight are roughly half of the Nasdaq-100, so when most point the same way, MNQ usually follows. Rising yields and a rising VIX tend to weigh on it.</p>` : ""}
    <button class="btn pri qtwide" id="mvAsk" ${CO.sample && !B.busy ? "" : "disabled"}>${B.busy ? "Quint is thinking…" : B.text ? "Ask Quint again" : "✦ Quint: what matters for MNQ now?"}</button><div class="nwq" id="mvOut" ${B.text || B.busy || B.err ? "" : "hidden"}>${qtQ(B)}${B.text && !B.busy ? sayBtn() : ""}</div>
    <h3>Calendar <span class="dim">US · your time</span></h3>${Object.keys(days).length ? Object.entries(days).map(([k, es]) => `<div class="mvday"><b>${esc(k)}</b>${es.map(e => `<div class="mvev${e.imp >= 1 ? " hi" : ""}${e.t < now ? " past" : ""}"><span class="t">${LTF.format(new Date(e.t))}</span><span class="n">${esc(e.title)}${e.per ? ` <small>${esc(e.per)}</small>` : ""}${e.imp >= 1 ? ` <em>HIGH</em>` : ""}</span><span class="v">${e.ac != null ? `<b>${esc(String(e.ac))}${esc(e.unit)}</b> ` : ""}${e.fc != null ? `fc ${esc(String(e.fc))}${esc(e.unit)}` : ""}${e.pv != null ? ` · prev ${esc(String(e.pv))}${esc(e.unit)}` : ""}</span></div>`).join("")}</div>`).join("") : `<p class="dim">${d.cal ? "Nothing scheduled in the next week." : "The calendar didn't load."}</p>`}
    <p class="small">HIGH events (inflation, jobs, Fed decisions, retail sales) can move MNQ hundreds of points in seconds. Many traders are flat for the minute before and after.</p>
    ${d.earn && d.earn.length ? `<h3>Big-tech earnings</h3><div class="mvday">${d.earn.map(e => `<div class="mvev"><span class="t">${esc(e.s)}</span><span class="n">${esc(qtWhen(e.t))}</span><span class="v">${e.ok ? "confirmed" : "expected"}</span></div>`).join("")}</div><p class="small">Results usually come after the US close, so the move shows up in MNQ that evening and at the next open.</p>` : ""}
    <h3>Headlines <span class="dim">Nasdaq futures</span></h3>${d.news && d.news.length ? d.news.map(h => `<${h.link ? `a href="${esc(h.link)}" target="_blank" rel="noopener"` : "div"} class="mvnews${h.top ? " top" : ""}"><b>${esc(h.title)}</b><small>${esc([h.by, fAgo(h.t)].filter(Boolean).join(" · "))}</small></${h.link ? "a" : "div"}>`).join("") : `<p class="dim">${d.news ? "No headlines right now." : "Headlines didn't load."}</p>`}
    <p class="small">From your TradingView connector${MK.tvLive ? ", with real-time CME futures" : ". Index and futures prices can be 10 to 15 minutes behind"}; the loaded time is ${fLocal(M.at)}.</p>`;
  const a = $("#mvAsk"); if (a) a.onclick = () => { const p = nwAsk(B, mvBriefPrompt(), () => { const o = $("#mvOut"); if (o) { o.hidden = false; o.innerHTML = qtQ(B); } }); mvPaint(); if (p && p.then) p.then(mvPaint); };
  bindSay(el, () => B.text);
}
function openMovers() {
  openSheet(`${shead("📅 What moves Nasdaq")}<div class="qtrow"><p class="small" style="margin:0;flex:1">The index, the stocks that drive it, the week's scheduled events and the latest headlines.</p><button class="chip" id="mvRef">⟳ Refresh</button></div><div id="mvBody"></div>`, s => { $("#mvRef", s).onclick = () => mvLoad(true); mvPaint(); mvLoad(false); });
}

/* ---------- MNQ risk: points to dollars ---------- */
function openRisk() {
  const R = ST.mnqr || (ST.mnqr = { n: 1, stop: 30, tgt: 60, lim: 0 }), Q = mkQ("MNQ");
  openSheet(`${shead("🧮 MNQ risk")}<p class="small">1 MNQ moves <b>$2 a point</b> (one 0.25 tick = $0.50). Work out the dollars before you click.${Q ? ` MNQ is near ${fnum(mkSpec(MKDEF.MNQ), Q.p)}${Q.delay ? " (delayed)" : ""}.` : ""}</p>
    <div class="qtform"><label>Contracts (MNQ)<input id="rkN" type="number" inputmode="numeric" min="1" max="100" step="1" value="${R.n}"></label><label>Stop (points)<input id="rkS" type="number" inputmode="decimal" min="0.25" step="0.25" value="${R.stop}"></label><label>Target (points)<input id="rkT" type="number" inputmode="decimal" min="0.25" step="0.25" value="${R.tgt}"></label><label>Daily loss limit ($, optional)<input id="rkL" type="number" inputmode="numeric" min="0" step="50" value="${R.lim || ""}"></label></div>
    <div id="rkOut" class="qtres"></div><p class="small">Costs are extra: commissions plus about a tick of slippage each way. Your prop firm's own rules decide what counts toward its limits, so check them.</p>`, s => {
    const calc = () => { const n = clamp(Math.round(+$("#rkN", s).value || 1), 1, 100), sp = Math.max(0, +$("#rkS", s).value || 0), tp = Math.max(0, +$("#rkT", s).value || 0), lim = Math.max(0, +$("#rkL", s).value || 0); Object.assign(R, { n, stop: sp, tgt: tp, lim }); save();
      const risk = sp * 2 * n, rew = tp * 2 * n, rr = sp > 0 ? tp / sp : 0, be = rr > 0 ? 100 / (1 + rr) : 0;
      $("#rkOut", s).innerHTML = `<div><small>If the stop is hit</small><b class="neg">−$${risk.toFixed(2)}</b></div><div><small>If the target is hit</small><b class="pos">+$${rew.toFixed(2)}</b></div><div><small>Reward to risk</small><b>${rr ? rr.toFixed(2) + " : 1" : "—"}</b></div><div><small>Win rate needed to break even</small><b>${be ? be.toFixed(0) + "%" : "—"}</b></div>${lim ? `<div><small>Share of your daily limit</small><b class="${risk / lim > 0.34 ? "neg" : ""}">${(risk / lim * 100).toFixed(0)}%</b></div><div><small>Losses in a row before the limit</small><b>${risk > 0 ? Math.floor(lim / risk) : "—"}</b></div>` : ""}`; };
    $$("#sheet .qtform input").forEach(i => i.oninput = calc); calc();
  });
}

/* ---------- practise on real MNQ candles: call the direction, then trade it ---------- */
const PR_H = 30;
function prNew(B) {
  const P = QT.pr, n = B.c.length, A = P.A = qtATR(B); let i = 0;
  for (let k = 0; k < 40; k++) { i = 260 + Math.floor(Math.random() * Math.max(1, n - 260 - PR_H - 2)); if (A[i] > 0 && B.t[i + PR_H] - B.t[i] < TV_MIN[P.tf] * 60 * PR_H * 6) break; } // skip weekend gaps
  Object.assign(P, { B, i, dir: null, side: null, done: false, res: null, T: {} });
}
function prReveal() {
  const P = QT.pr, B = P.B, i = P.i, A = P.A[i], end = Math.min(B.c.length - 1, i + PR_H), move = B.c[end] - B.c[i], truth = move > 1.5 * A ? "up" : move < -1.5 * A ? "down" : "side";
  const sim = d => { const e = B.o[i + 1], sd = P.stop * A, st = e - d * sd, tg = e + d * sd * P.tgt; let x = B.c[end], why = "time", j = i + 1;
    for (; j <= end; j++) { if (d > 0) { if (B.l[j] <= st) { x = Math.min(B.o[j], st); why = "stop"; break; } if (B.h[j] >= tg) { x = tg; why = "target"; break; } } else { if (B.h[j] >= st) { x = Math.max(B.o[j], st); why = "stop"; break; } if (B.l[j] <= tg) { x = tg; why = "target"; break; } } }
    return { d, e, st, tg, x, why, bars: Math.min(j, end) - i, pts: (x - e) * d, r: (x - e) * d / sd }; };
  const L = sim(1), S = sim(-1), mine = P.side === "buy" ? L : P.side === "sell" ? S : null;
  P.res = { truth, move, L, S, mine, end }; P.done = true;
  const st = ST.mnqp || (ST.mnqp = { n: 0, dirOk: 0, trades: 0, r: 0, wins: 0, skips: 0 }); st.n++; if (P.dir === truth) st.dirOk++; if (mine) { st.trades++; st.r += mine.r; if (mine.r > 0) st.wins++; } else st.skips++; save(); qtPaintHome();
}
function prWhyPrompt() {
  const P = QT.pr, B = P.B, i = P.i, R = P.res, row = j => `${j - i},${B.o[j].toFixed(2)},${B.h[j].toFixed(2)},${B.l[j].toFixed(2)},${B.c[j].toFixed(2)}`, a = Math.max(0, i - 59), rows = []; for (let j = a; j <= R.end; j++) rows.push(row(j));
  const tr = x => `${x.d > 0 ? "BUY" : "SELL"} at ${x.e.toFixed(2)}, stop ${x.st.toFixed(2)}, target ${x.tg.toFixed(2)}: ${x.why === "target" ? "target hit" : x.why === "stop" ? "stopped out" : "closed on time"} after ${x.bars} candles for ${x.r >= 0 ? "+" : ""}${x.r.toFixed(2)}R (${(x.pts * MKSPEC[P.k].mpv).toFixed(0)} dollars per ${MKSPEC[P.k].micro})`;
  return `You are Quint, the trading mentor inside Chart Wizard. The user just practised on real ${MKDEF[P.k].name} (${P.k}) ${P.tf} candles from TradingView. ${myLine()}
They saw the candles up to candle 0 (the decision point), guessed the direction over the next ${PR_H} candles, then chose a trade. The candles after 0 were hidden until they answered.
Their direction call: ${P.dir === "up" ? "UP" : P.dir === "down" ? "DOWN" : "SIDEWAYS"}. What happened: ${R.truth === "up" ? "UP" : R.truth === "down" ? "DOWN" : "SIDEWAYS"} (${R.move >= 0 ? "+" : ""}${R.move.toFixed(2)} points; ATR at the decision was ${P.A[i].toFixed(2)}).
Their trade: ${R.mine ? tr(R.mine) : "stayed out"}. For comparison, with the same stop and target: ${tr(R.L)}; ${tr(R.S)}.
Candles as index,open,high,low,close (index 0 is the decision candle; negative is before, positive is the hidden future):
${rows.join("\n")}
Rules: use only these numbers. Be honest about luck: some moves could not have been read in advance, and saying so is a valid answer. Never claim the future was certain. Education, not financial advice.
Answer in short simple sentences:
### What the chart was showing at the decision
(structure, the last strong move, the nearest levels, using real prices and candle indexes up to 0 only)
### What hinted at the move, or why it was a coin flip
### How it should have been traded
(for how this user trades: enter, stay out, or wait for what; where the stop belonged)
### One habit to practise next`;
}
function prPaint() {
  const el = $("#prBody"); if (!el) return; const P = QT.pr;
  if (!P.B) { el.innerHTML = P.err ? `<p class="nwerr">${esc(P.err)}</p>${P.canReal ? `<button class="btn" id="prReal">Load real ${esc(P.k)} candles (1 TradingView call)</button>` : `<button class="btn" id="prRetry">Try again</button>`}` : `<p class="dim">Getting the candles…</p>`; const r = $("#prRetry"); if (r) r.onclick = () => prLoad(P.tf); const rl = $("#prReal"); if (rl) rl.onclick = () => { P.real = true; prLoad(P.tf); }; return; }
  const B = P.B, i = P.i, R = P.res, st = ST.mnqp, mins = TV_MIN[P.tf] * PR_H, span = mins >= 120 ? `about ${Math.round(mins / 60)} hours` : `${mins} minutes`, big = P.tf === "1h" ? 4 : P.tf === "15m" ? 4 : P.tf === "5m" ? 6 : 15, bigName = { "1m": "15m", "5m": "30m", "15m": "1h", "1h": "4h" }[P.tf];
  const pick = (grp, k, lab, cls = "") => `<button class="chip ${cls}" data-g="${grp}" data-k="${k}" aria-pressed="${String(P[grp]) === String(k)}" ${P.done ? "disabled" : ""}>${lab}</button>`;
  const res = () => { const ok = P.dir === R.truth, m = R.mine, nm = { up: "up", down: "down", side: "sideways" };
    return `<div class="prres"><div class="${ok ? "ok" : "no"}"><b>${ok ? "✓ Direction right" : "✗ Direction wrong"}</b><span>It went ${nm[R.truth]}: ${R.move >= 0 ? "+" : ""}${R.move.toFixed(2)} points over ${PR_H} candles.</span></div>
      <div class="${m ? (m.r > 0 ? "ok" : "no") : "mid"}"><b>${m ? `${m.r >= 0 ? "+" : ""}${m.r.toFixed(2)}R · ${m.pts * MKSPEC[P.k].mpv >= 0 ? "+" : "−"}$${Math.abs(m.pts * MKSPEC[P.k].mpv).toFixed(0)} per ${esc(MKSPEC[P.k].micro)}` : "You stayed out"}</b><span>${m ? `${m.why === "target" ? "Target hit" : m.why === "stop" ? "Stopped out" : "Closed on time"} after ${m.bars} candles.` : `A buy made ${R.L.r >= 0 ? "+" : ""}${R.L.r.toFixed(2)}R, a sell ${R.S.r >= 0 ? "+" : ""}${R.S.r.toFixed(2)}R. ${R.L.r <= 0 && R.S.r <= 0 ? "Good skip: both lost." : R.truth === "side" ? "It chopped, so skipping was reasonable." : "There was a move to catch here."}`}</span></div></div>
      <div class="qtrow"><button class="btn pri" id="prNext">Next chart ▸</button><button class="btn" id="prWhy" ${CO.sample ? "" : "disabled"}>✦ Quint, explain it</button></div><div class="nwq" id="prOut" ${P.T.text || P.T.busy || P.T.err ? "" : "hidden"}>${qtQ(P.T)}${P.T.text && !P.T.busy ? sayBtn() : ""}</div>`; };
  el.innerHTML = `<p class="small" style="margin:0 0 2px">${B.sim ? "" : `${esc(qtWhen(B.t[i] * 1000))} · `}${esc(P.k)} · each candle ${esc(P.tf)}${st && st.n ? ` · you: direction ${Math.round((st.dirOk || 0) / st.n * 100)}% over ${st.n} rounds${st.trades ? `, trades ${st.r >= 0 ? "+" : ""}${st.r.toFixed(1)}R` : ""}` : ""}</p>
    <p class="small prsrc">${pracSrc(B)}${B.sim && P.k === "MNQ" ? ` · <button class="lnk" id="prReal">load my real MNQ candles (about 3 TradingView calls, once)</button>` : ""}</p>
    <div class="prlab">Bigger picture · ${bigName} candles</div><canvas id="prCv2" class="prcv"></canvas>
    <div class="prlab">${P.done ? "What happened next (shaded)" : `Now · ${esc(P.tf)} candles`}</div><canvas id="prCv" class="prcv"></canvas>
    ${P.done ? res() : `<h3>1. Where is it heading over the next ${PR_H} candles (${span})?</h3><div class="chips">${pick("dir", "up", "▲ Up")}${pick("dir", "side", "▬ Sideways")}${pick("dir", "down", "▼ Down")}</div>
    <h3>2. Your trade</h3><div class="chips">${pick("side", "buy", "Buy", "buy")}${pick("side", "out", "Stay out")}${pick("side", "sell", "Sell", "sell")}</div>
    <div class="prset"><span>Stop</span>${[1, 1.5, 2, 3].map(k => pick("stop", k, `${k}× ATR`)).join("")}</div><div class="prset"><span>Target</span>${[1, 1.5, 2, 3].map(k => pick("tgt", k, `${k}R`)).join("")}</div>
    <p class="small">ATR here is ${fnum(MKSPEC[P.k], P.A[i])}, so a ${P.stop}× stop is ${fnum(MKSPEC[P.k], P.stop * P.A[i])} away ($${(P.stop * P.A[i] * MKSPEC[P.k].mpv).toFixed(0)} per ${esc(MKSPEC[P.k].micro)}).</p>
    <button class="btn pri qtwide" id="prGo" ${P.dir && P.side ? "" : "disabled"}>Reveal</button>`}`;
  const hi = qtAgg(B, big, i + 1); qtDraw($("#prCv2"), hi, hi.c.length - 60, hi.c.length, { h: 150, S: MKSPEC[P.k] });
  if (P.done) { const m = R.mine, lines = m ? [{ p: m.e, col: "#9fb3d9", lab: "entry" }, { p: m.st, col: "#ef5350", lab: "stop" }, { p: m.tg, col: "#26a69a", lab: "target" }] : []; qtDraw($("#prCv"), B, i - 99, R.end + 1, { h: 300, mark: i + 1, lines, S: MKSPEC[P.k], tf: P.tf }); }
  else qtDraw($("#prCv"), B, i - 99, i + 1, { h: 300, S: MKSPEC[P.k], tf: P.tf });
  $$("#prBody [data-g]").forEach(b => b.onclick = () => { const g = b.dataset.g; P[g] = g === "stop" || g === "tgt" ? +b.dataset.k : b.dataset.k; prPaint(); });
  const go = $("#prGo"); if (go) go.onclick = () => { prReveal(); sfx(P.res && P.dir === P.res.truth ? "right" : "wrong"); prPaint(); };
  const nx = $("#prNext"); if (nx) nx.onclick = () => { if (P.B.sim && (P.nSim = (P.nSim || 0) + 1) % 8 === 0) { prLoad(P.tf); return; } prNew(P.B); prPaint(); $("#sheet").scrollTop = 0; }; // practice candles move to a new stretch of the year every 8 charts
  const rl = $("#prReal"); if (rl) rl.onclick = () => { P.real = true; prLoad(P.tf); };
  const why = $("#prWhy"); if (why) why.onclick = () => nwAsk(P.T, prWhyPrompt(), () => { const o = $("#prOut"); if (o) { o.hidden = false; o.innerHTML = qtQ(P.T); } }).then(prPaint);
  bindSay(el, () => P.T.text);
}
async function prLoad(tf) {
  const P = QT.pr; P.tf = tf; P.B = null; P.err = null; $$("#prTf .chip").forEach(x => x.setAttribute("aria-pressed", x.dataset.k === tf)); prPaint();
  try { const B = P.real ? await qtBars(tf, true, MKDEF[P.k].tv) : await pracBars(tf, P.k); P.real = false; if (QT.pr !== P || P.tf !== tf) return; prNew(B); } catch (e) { P.real = false; P.err = e && e.code === "no_practice" ? e.message : tvErr(e); P.canReal = true; }
  prPaint();
}
function openPrac(k0) {
  const tf0 = (QT.pr && QT.pr.tf) || TS_DEF[TS()].tf, k = FUT_KEYS.includes(k0) ? k0 : QT.pr && QT.pr.k || ST.prk || "MNQ"; QT.pr = { tf: tf0, k, B: null, stop: 1.5, tgt: 2, T: {} };
  const S = MKSPEC[k], sel = `<select id="prMk" class="prmk" aria-label="Market to practise">${FUT_G.filter(g => g[0] !== "all").map(([g, l]) => `<optgroup label="${l}">${FUT_KEYS.filter(x => MKDEF[x].grp === g).map(x => `<option value="${x}"${x === k ? " selected" : ""}>${esc(x)} · ${esc(MKDEF[x].name)}</option>`).join("")}</optgroup>`).join("")}</select>`;
  openSheet(`${shead("🎯 Practise on charts")}<p class="small">No TradingView calls: practice uses the real candles already saved on this phone, or built-in practice candles (a year of real Nasdaq, S&P 500, gold and oil days). First call the direction, then decide the trade. The future stays hidden until you answer. Dollars are per ${esc(S.micro)} (${usdOf(S.mpv)} ${S.unit === "points" ? "a point" : "per 1.00 move"}).</p><div class="qtrow" style="margin:6px 0">${sel}</div><div class="chips" id="prTf">${["1m", "5m", "15m", "1h"].map(t => `<button class="chip" data-k="${t}" aria-pressed="${t === tf0}">${t}</button>`).join("")}</div><div id="prBody"></div>`, s => { $$("#prTf .chip", s).forEach(b => b.onclick = () => prLoad(b.dataset.k)); $("#prMk", s).onchange = e => { ST.prk = e.target.value; save(); openPrac(e.target.value); }; prLoad(tf0); });
}
qtVoiceInit();

function qtHush() { try { if (QT.tts) QT.tts.stop(); else if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} QT.speaking = false; $$(".qtsay").forEach(b => { b.textContent = "🔊 Listen"; }); }

function fxSetHTML() { const c = fxCfg(); return `<h3>Sounds and haptics</h3><div class="fxset"><button type="button" class="lgtog" id="fxSnd" aria-pressed="${c.snd}"><span class="k"></span><span>Sound effects: a rising chime for a buy, falling for a sell, right and wrong in practice, target and stop</span></button>
  <label class="small" for="fxVol">Volume: <b id="fxVolV">${Math.round((c.vol != null ? c.vol : .3) * 100)}%</b></label><input type="range" id="fxVol" min="0.05" max="1" step="0.05" value="${c.vol != null ? c.vol : .3}" style="width:100%">
  <button type="button" class="lgtog" id="fxHap" aria-pressed="${c.hap}"><span class="k"></span><span>Haptics: little taps you feel on buttons and answers (iPhone with iOS 17.4 or later, or Android)</span></button>
  <p class="small">The iPhone's silent switch also silences these sounds.</p></div>`; }
function fxSetWire(sh) { const c = fxCfg(), tg = (id, k) => { const b = $("#" + id, sh); if (b) b.onclick = () => { c[k] = !c[k]; b.setAttribute("aria-pressed", c[k]); save(); if (c[k]) sfx(k === "snd" ? "right" : "tick"); }; };
  tg("fxSnd", "snd"); tg("fxHap", "hap"); const v = $("#fxVol", sh); if (v) { v.oninput = () => { c.vol = +v.value; $("#fxVolV", sh).textContent = Math.round(c.vol * 100) + "%"; save(); }; v.onchange = () => sfx("buy"); } }

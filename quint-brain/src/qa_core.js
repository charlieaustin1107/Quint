/* ================= QUINT: the standalone app. State, markets, connectors, voice ================= */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const MKSPEC = {}, MKDEF = {};
for (const r of FUTS) { MKSPEC[r.k] = r.S; MKDEF[r.k] = { k: r.k, tv: r.tv, cls: "fut", grp: r.grp, name: r.name, sub: `${r.tv.split(":")[1]} · TradingView`, logo: r.logo, trade: true, what: r.what }; }
const FUT_KEYS = FUTS.map(r => r.k);
const FUT_G = [["idx", "Indices"], ["nrg", "Energy"], ["met", "Metals"], ["rate", "Rates"], ["fx", "FX"], ["cry", "Crypto"]];
const mkSpec = m => MKSPEC[m.k] || { sym: m.k, dec: 2, money: false, tick: 0.01 };
const TV_MNQ = "CME_MINI:MNQ1!", TV_QCOLS = ["close", "change", "change_abs", "high", "low", "open", "volume", "update_mode"];
const KEY = "quint-app-v1";
const ST = (() => { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && typeof s === "object") return s; } catch (e) {} return {}; })();
ST.set = Object.assign({ k: "MNQ", tf: "5m", style: "day", acct: 50000, pct: 1, name: "Prop account", voice: "", tvoice: "buttery", rate: 1, auto: false }, ST.set || {});
if (!MKDEF[ST.set.k]) ST.set.k = "MNQ";
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} };
const HS = () => ST.set;
const TS = () => ["scalp", "day", "both"].includes(ST.set.style) ? ST.set.style : "day";
const MK = { mcp: null, st: "wait", why: null, q: {}, screen: "quint", sel: ST.set.k, x: null, tvLive: !!ST.tvLive };
const HC = { tf: ["1m", "5m", "15m", "1h"].includes(ST.set.tf) ? ST.set.tf : "5m", lvl: null };
const DK = { k: ST.set.k, busy: false, ctl: null, prog: "", view: "console", lim: undefined, bars: {}, cal: null, gradeAt: 0, grading: false, img: null, noTools: false, conf: {}, al: null, alBusy: false, alConf: {}, lastQ: "", alN: 0, lv: null, lights: [0, 0, 0, 0, 0], scan: 0, think: 0 };
const CO = { sample: null }, QT = { tts: null, mv: null, speaking: false, level: 0 };
const dkM = () => MKDEF[DK.k] || MKDEF.MNQ;
const dkOnChart = m => !!m && m.k === DK.k;
const dkTf = () => HC.tf;
const mkQ = k => MK.q[k] || null;
const liveBars = () => null;
const lvOpenList = () => [];
const lvPosFor = k => { const P = (ST.pos || {})[k]; return P && P.open ? P : null; };
const lvSize = (P, S) => `${P.qty} ${S.micro || S.sym}`;
const lvUPL = P => { const Q = MK.q[P.k], S = MKSPEC[P.k] || {}; return Q ? (Q.p - P.e) * P.dir * P.qty * (S.mpv || S.pv || 1) - 1.5 * P.qty : 0; };
const qaAcct = () => { const s = ST.set, size = Math.max(1000, +s.acct || 50000), pct = clamp(+s.pct || 1, 0.1, 5); return { name: String(s.name || "Prop account").slice(0, 40), size, pct, risk: Math.round(size * pct / 100) }; };
const myLine = () => `The user's main market is MNQ (Micro E-mini Nasdaq-100 futures: $2 a point, one 0.25 tick = $0.50), on a funded-style prop account. They live in the UK, so give times in UK time as well as New York time. ${styleLine()}`;
// how many contracts a stop of sd points allows at the user's risk (micro where there is one, about $1.50 a contract in fees)
function qaSize(m, sd) { const S = mkSpec(m), A = qaAcct(), pv = S.mpv || S.pv; if (!(sd > 0) || !pv) return null; const per = sd * pv + 1.5, qty = Math.floor(A.risk / per); return { qty, risk: qty * per, sym: S.micro || S.sym, A }; }
function qaEasy(t) { // a short "what is…" question with nothing about a trade in it
  t = String(t || "").trim(); if (t.length > 90 || /\n/.test(t)) return false;
  return /^(what('s| is| are| does)|define|meaning of|explain what|what do you mean by)\b/i.test(t) && !/\b(this|that|here|my|chart|candle|trade|buy|sell|long|short|should|now|today|level|stop|target|entry|why|how)\b/i.test(t);
}
// the user asked for Fable on trade decisions and analysis and Opus for simple questions, to save their usage
const qaModel = (text, img) => qaEasy(text) && !img ? { model: "claude-opus-5-5", modelTier: "default", effort: "low" } : { model: "claude-fable-5-2", modelTier: "complex", effort: "high" };
// the five lights of the core: daily, hourly, 15-minute, 5-minute, calendar
const QA_TF = { "1D": 0, "1h": 1, "15m": 2, "5m": 3, news: 4 };
function qaLight(sym, tf, state) { const i = QA_TF[tf]; if (i == null) return; if (sym && sym !== dkM().tv) return; DK.lights[i] = state; if (typeof coreKick === "function") coreKick(); }
let toastT = 0;
function hmToast(msg) { const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3400); }

/* ---------- connectors: TradingView through Claude, and Claude itself ---------- */
function qaInit() {
  const c = window.claude;
  if (!c || typeof c.use !== "function") { MK.st = "none"; paintAll(); return; }
  Promise.resolve(c.use("mcp")).then(ns => { if (!ns) { MK.st = "none"; paintAll(); return; } MK.mcp = qaGate(ns); qaConnect(); }).catch(() => { MK.st = "none"; paintAll(); });
  Promise.resolve(c.use("sample")).then(s => { CO.sample = s || null; paintAll(); }).catch(() => {});
  Promise.resolve(c.use("tts")).then(t => { QT.tts = t || null; if (QT.tts) { try { QT.tts.onState(e => { QT.speaking = e.state !== "idle"; if (!QT.speaking) qaSpoke(); coreKick(); }); QT.tts.onPosition(() => { QT.level = 1; coreKick(); }); } catch (e) {} } }).catch(() => {});
}
/* TradingView's connector has a call limit. Quint stays well under it, and when TradingView says "cool down" he stops calling until it's over */
function qaQuotaHit(e) {
  const s = typeof e === "string" ? e : String((e && (e.message || e.text || e.error)) || ""); if (!/quota|cooldown|cool(ing)? down|TOOL_QUOTA|too many (calls|requests)|usage limit/i.test(s)) return false;
  if (/daily|per day/i.test(s)) HS().tvOut = tvDay(); // the day's calls are gone (TradingView's own count, which includes calls this app never saw)
  const m = /(\d+)[\s-]*min/i.exec(s); TVQ.until = Date.now() + (m ? +m[1] + 0.5 : 6) * 6e4; save(); qaPace(); setTimeout(() => { paintAll(); }, 0); setTimeout(() => { qaPace(); paintAll(); }, TVQ.until - Date.now() + 1500); return true;
}
function qaGate(ns) { // the page's own wrapper; the connector namespace itself is never changed. Every TradingView call is counted against the day's allowance
  return { callTool: (srv, tool, input, opt) => { if (srv !== TV_SERVER) return ns.callTool(srv, tool, input, opt); if (tvCooling()) return Promise.reject({ code: "cooldown", message: tvCoolMsg() });
    tvCount(); const now = Date.now(); TVQ.hist.push(now); if (TVQ.hist.length > 200) TVQ.hist = TVQ.hist.filter(x => x > now - 9e5);
    return ns.callTool(srv, tool, input, opt).then(r => { const p = r && r.payload; if ((typeof p === "string" && qaQuotaHit(p)) || (p && typeof p === "object" && p.success === false && qaQuotaHit(p.error || p.message))) throw { code: "cooldown", message: tvCoolMsg() }; return r; }, e => { if (qaQuotaHit(e)) throw { code: "cooldown", message: tvCoolMsg() }; throw e; }); } };
}
async function qaConnect() {
  if (!HS().tvPlanSet && HS().tvPlan) { delete HS().tvPlan; save(); } // an earlier version guessed the plan from its own count: only the one you pick counts
  // the first call is where Claude asks the user to allow TradingView here; the candles kept on this phone show straight away
  const m = dkM(), F = fdLoad(m.tv); if (F.m1) fdQuote(m.tv, F); MK.st = "ready"; paintAll();
  try { await dkFeed(m.tv, null, MK.tvLive ? 6e4 : 3e5); MK.why = null; }
  catch (e) { if (e && PAGE_CODES.has(e.code)) { MK.st = "err"; MK.why = e.code; paintAll(); return; } }
  paintAll(); qaScan(true); qaCross(); dkGrade(false); qaPace();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) qaTick(); });
}
// TradingView counts calls per day, so Quint refreshes on his own only when your plan has calls to spare (every 2 minutes with the AI add-on,
// every 10 on Ultimate); otherwise the price updates when you ask him or tap ↻. Asking costs about one call: only the newest minutes are fetched.
let tickT = 0, tickBusy = false, tickN = 0;
function qaPace() { clearInterval(tickT); tickT = setInterval(qaTick, 30e3); }
async function qaRefresh(user) { // the newest candles for the market on screen (one call)
  const m = dkM(); if (MK.st !== "ready" || QA.rfBusy) return; QA.rfBusy = true; paintHead();
  try { const p0 = MK.q[m.k] && MK.q[m.k].p; await dkFeed(m.tv, null, 0); const p1 = MK.q[m.k] && MK.q[m.k].p; if (p0 && p1 && p1 !== p0) QA.flash = p1 > p0 ? 1 : -1; qaScan(false); }
  catch (e) { if (user) hmToast(tvErr(e)); } finally { QA.rfBusy = false; QA.bgAt = Date.now(); paintAll(); }
}
async function qaTick() { // every 30 seconds: repaint and grade from what's on hand; fetch only when the plan allows it
  if (document.hidden || MK.st !== "ready" || tickBusy) return; tickBusy = true; tickN++;
  try { const m = dkM(), open = mktStatus(m.cls).open, ev = tvBgEvery(), F = FD[m.tv];
    if (open && ev && !DK.busy && Date.now() - Math.max(QA.bgAt || 0, F ? F.at : 0) >= ev - 5e3) await qaRefresh(false);
    if (ev && !DK.busy && tickN % 20 === 0) qaCross(); dkGrade(false); paintDeck(); paintHead();
  } finally { tickBusy = false; }
}
// the instruments work from the same candles Quint's brief uses, so asking him costs no extra TradingView calls
async function qaScan(full) {
  const m = dkM(), sym = m.tv, S = mkSpec(m), id = ++DK.scan; if (MK.st !== "ready") return;
  if (full) DK.lights = [0, 0, 0, 0, 0];
  const get = (tf, n) => dkBars(sym, tf, n, null, full ? 6e4 : 1e12).catch(() => null);
  const [BD, B1, B15, B5] = await Promise.all([get("1D", 160), get("1h", 240), get("15m", 320), get("5m", 300)]);
  if (id !== DK.scan || dkM() !== m) return;
  QA.B = { "1D": BD, "1h": B1, "15m": B15, "5m": B5 }; DK.lv = null; if (B15) dkSess(B15, B5, S);
  if (HC.tf === "1m") QA.B["1m"] = await get("1m", 120);
  if (!MK.q[m.k] && B5) MK.q[m.k] = { p: B5.c[B5.n - 1], ts: B5.t[B5.n - 1] * 1000 + 3e5, at: Date.now() };
  dkEvents().then(() => { if (id === DK.scan) paintSide(); });
  paintAll();
}
async function qaCross() { // what the markets around Nasdaq are doing: the same single call Quint's brief uses, kept 15 minutes
  try { const m = dkM(); await dkAround(m); const c = (HS().dkAr || {})[m.grp === "idx" ? "idx" : "other"], d = c && c.d; if (!d) return;
    const syms = ["CME_MINI:ES1!", "CBOT_MINI:YM1!", "CME_MINI:RTY1!", "CBOT:ZN1!", "TVC:DXY", "CBOE:VIX"].filter(s => d[s]);
    MK.x = { at: c.at, rows: syms.map(s => ({ s, p: d[s].close, ch: d[s].change })) }; if (QA.view === "matrix") paintSide(); } catch (e) {}
}

/* ---------- voice: Claude's voice where Claude allows it, otherwise the best voice the phone gives web pages ---------- */
// iPhones list some voices that sound robotic (the "Eloquence" set and the novelty voices); Quint never picks those for you
const VOICE_BAD = /^(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|kathy|ralph|fred)\b/i;
const VOICE_GOOD = /daniel|serena|kate|arthur|martha|oliver|stephanie|jamie|samantha|ava|zoe|allison|susan|tom|evan|nathan|joelle|noelle|karen|lee|moira|tessa|rishi|google uk english|google us english|microsoft .*(natural|online)/i;
function voiceScore(v) {
  if (!v || !/^en/i.test(v.lang || "")) return -1e3; const n = `${v.name} ${v.voiceURI || ""}`;
  if (VOICE_BAD.test(v.name)) return -500;
  return (/en[-_]GB/i.test(v.lang) ? 30 : /en[-_](US|AU|IE)/i.test(v.lang) ? 20 : 10) + (/premium/i.test(n) ? 60 : /enhanced|natural|neural/i.test(n) ? 45 : 0) + (VOICE_GOOD.test(v.name) ? 20 : 0) + (/compact/i.test(n) ? -5 : 0) + (v.localService ? 2 : 0);
}
function voiceList() { try { return (window.speechSynthesis && speechSynthesis.getVoices()) || []; } catch (e) { return []; } }
function voicePick() { const vs = voiceList(), want = ST.set.voice && vs.find(v => v.voiceURI === ST.set.voice || v.name === ST.set.voice); if (want) return want; const best = vs.filter(v => voiceScore(v) > 0).sort((a, b) => voiceScore(b) - voiceScore(a))[0]; return best || null; }
if (window.speechSynthesis) { try { speechSynthesis.onvoiceschanged = () => { if ($("#vlist")) paintVoices(); }; speechSynthesis.getVoices(); } catch (e) {} }
function qaSpoke() { QT.speaking = false; QT.level = 0; $$(".say").forEach(b => { b.textContent = "Listen"; b.setAttribute("aria-pressed", "false"); }); coreKick(); }
function qaSpeak(text, btn, name) { // speaks like a person: the call first, trader words, one sentence at a time
  if (QT.speaking) { try { if (QT.tts) QT.tts.stop().catch(() => {}); else speechSynthesis.cancel(); } catch (e) {} qaSpoke(); return; }
  const script = sayScript(text, name); if (!script) return; const rate = clamp(+ST.set.rate || 1, 0.7, 1.5);
  QT.speaking = true; if (btn) { btn.textContent = "Stop"; btn.setAttribute("aria-pressed", "true"); } coreKick();
  if (QT.tts) { QT.tts.speak(sayLines(script).map(t => ({ text: t, voice: ST.set.tvoice || "buttery", rate, language: "en" }))).catch(e => { if (e && e.code === "not_granted") hmToast("Reading aloud is turned off for Quint. Turn it back on in this page's Permissions menu."); }).then(qaSpoke); return; }
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") { qaSpoke(); hmToast("This device can't read aloud here."); return; }
  try { speechSynthesis.cancel(); const v = voicePick(), parts = saySplit(script);
    parts.forEach((t, i) => { const u = new SpeechSynthesisUtterance(t); if (v) u.voice = v; u.lang = v ? v.lang : "en-GB"; u.rate = rate; u.pitch = /\?$/.test(t) ? 1.04 : 1;
      u.onboundary = () => { QT.level = 1; coreKick(); }; if (i === parts.length - 1) { u.onend = qaSpoke; u.onerror = qaSpoke; } speechSynthesis.speak(u); }); } catch (e) { qaSpoke(); }
}

/* ================= LIVE NEWS (FMP connector) ================= */
// Market headlines from the viewer's FMP connector (its market-articles feed), tagged by what they could move,
// with Quint explaining the likely impact. Each refresh is one FMP call, so refreshing is spaced out to protect the 250-a-day limit.
const NWK = "chart-wizard-news-v1", NW_LIMIT = 25, NW_MAXPAGE = 4, NW_MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const NW = { items: [], at: 0, err: null, busy: false, locked: false, utc: false, cat: "all", find: "", page: 0, more: true, manualAt: 0, takes: {}, brief: null, reads: {}, ev: {}, evBoot: false, open: {}, dirty: true, back: false, y: 0, seen0: 0, focus: null, booted: false, first: true };
const NDX_TOP = new Set("NVDA AAPL MSFT AMZN AVGO META GOOGL GOOG TSLA NFLX COST PLTR AMD CSCO TMUS ASML LIN INTU PEP AZN ISRG QCOM TXN BKNG AMGN ADBE SHOP AMAT MU LRCX PANW KLAC CRWD ADI INTC MELI APP ARM MRVL SBUX GILD ADP CMCSA HON VRTX CEG CDNS SNPS ABNB DASH PYPL".split(" "));
const NW_CRYPTO = new Set("COIN MSTR MARA RIOT CLSK HOOD IBIT GBTC HUT BITF CIFR GLXY BMNR CRCL".split(" "));
const NW_COMM = new Set("XOM CVX COP OXY SLB EOG BP SHEL NEM GOLD AEM FCX GLD SLV USO UNG".split(" "));
const NW_RX = {
  musk: /\b(elon|musk|tesla|spacex|starlink|neuralink|xai|grok)\b/i,
  trump: /\b(trump|tariffs?|white house|executive orders?|trade (?:war|deal|talks))\b/i,
  macro: /\b(federal reserve|the fed|fomc|powell|rate (?:cut|hike)s?|inflation|cpi|jobs report|payrolls|government shutdown|sanctions?)\b/i,
  crypto: /\b(bitcoin|btc|ethereum|ether|crypto\w*|stablecoins?|blockchain|solana|xrp|dogecoin|coinbase)\b/i,
  fut: /\b(crude|oil prices?|opec\+?|brent|wti|natural gas|gold|silver|copper|futures|commodit\w+|(?:treasury|bond) yields?)\b/i,
  mnq: /\b(nasdaq[- ]100|nasdaq composite|qqq|mnq|magnificent seven|mega[- ]?caps?|big tech|semiconductors?|chipmakers?)\b/i,
  earn: /\b(earnings|eps|revenue|quarterly results|guidance)\b/i,
  calls: /\b(upgrades?|downgrades?|upgraded|downgraded|price target|initiates? coverage|overweight|underweight|outperform|underperform)\b/i,
};
const NW_CATS = [["all", "All"], ["mnq", "Nasdaq · MNQ"], ["musk", "Musk · Tesla"], ["trump", "Trump · Fed · policy"], ["crypto", "Crypto"], ["fut", "Oil · gold · futures"], ["earn", "Earnings"], ["calls", "Analyst calls"], ["mine", "My stocks"]];
const NW_TAGS = [["trump", "Policy"], ["musk", "Musk"], ["crypto", "Crypto"], ["fut", "Commodities"], ["earn", "Earnings"], ["calls", "Analyst"]];

/* ---------- reading the feed ---------- */
function nwText(html) { // article HTML to plain text, so the feed's own markup never reaches the page
  let pts = [], paras = []; const clean = s => String(s || "").replace(/\s+/g, " ").trim();
  try { const d = new DOMParser().parseFromString(String(html || ""), "text/html"); pts = [...d.querySelectorAll("li")].map(e => clean(e.textContent)).filter(Boolean); paras = [...d.querySelectorAll("p")].map(e => clean(e.textContent)).filter(Boolean); if (!pts.length && !paras.length) { const t = clean(d.body && d.body.textContent); if (t) paras = [t]; } }
  catch (e) { const t = clean(String(html || "").replace(/<[^>]*>/g, " ")); if (t) paras = [t]; }
  return { pts, paras };
}
function nwTime(s, utc) { // FMP stamps its articles in New York time
  const m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?/.exec(String(s || "")); if (!m) return null;
  const g = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)); return utc ? g : g - etNow(g).off * 6e4;
}
function nwKey(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return "n" + h.toString(36); }
function nwTags(title, lead, body, syms) {
  const head = title + " " + lead, all = head + " " + body, has = S => syms.some(s => S.has(s)), g = {};
  if (has(NDX_TOP) || NW_RX.mnq.test(head)) g.mnq = 1;
  if (syms.includes("TSLA") || NW_RX.musk.test(all)) g.musk = 1;
  if (syms.includes("DJT") || NW_RX.trump.test(all) || NW_RX.macro.test(head)) g.trump = 1;
  if (has(NW_CRYPTO) || NW_RX.crypto.test(head)) g.crypto = 1;
  if (has(NW_COMM) || NW_RX.fut.test(head)) g.fut = 1;
  if (NW_RX.earn.test(title)) g.earn = 1;
  if (NW_RX.calls.test(title)) g.calls = 1;
  return g;
}
function nwParse(p) {
  if (!Array.isArray(p)) return null; const out = [], seen = new Set();
  for (const x of p) {
    if (!x || typeof x !== "object" || !x.title) continue;
    const title = String(x.title).replace(/\s+/g, " ").trim().slice(0, 220), T = nwText(x.content), raw = String(x.date || "");
    const syms = [...new Set(String(x.tickers || "").split(/[,;]+/).map(s => s.trim().split(":").pop().trim().toUpperCase()).filter(s => /^[A-Z][A-Z0-9.\-]{0,6}$/.test(s)))].slice(0, 5);
    let link = null; try { const u = new URL(String(x.link || "")); if (u.protocol === "https:" || u.protocol === "http:") link = u.href; } catch (e) {}
    const pts = T.pts.slice(0, 3).map(s => s.slice(0, 260)), sum = (T.paras[0] || "").slice(0, 320), body = T.paras.join(" ").slice(0, 6000), k = nwKey((link || title) + "|" + raw);
    if (seen.has(k)) continue; seen.add(k);
    out.push({ k, raw, title, pts, sum, body, syms, link, site: x.site ? String(x.site).slice(0, 40) : "FMP", tags: nwTags(title, pts.join(" ") + " " + sum, body, syms) });
  }
  return out.length ? out : null;
}
function nwStamp(rows) { // if reading the stamps as New York time puts an article in the future, the feed is in UTC
  const now = Date.now(); if (!NW.utc) for (const r of rows) { const t = nwTime(r.raw, false); if (t && t > now + 12e4) { NW.utc = true; for (const o of NW.items) o.t = nwTime(o.raw, true) || o.t; break; } }
  for (const r of rows) r.t = nwTime(r.raw, NW.utc) || now;
}
function nwWatch(it) { // which of the trainer's markets a headline could plausibly touch
  const w = [], add = x => { if (!w.includes(x)) w.push(x); }, t = it.title + " " + it.pts.join(" ") + " " + it.sum;
  if (it.tags.trump) { add("ES"); add("MNQ"); add("Gold"); }
  if (it.tags.mnq) add("MNQ");
  if (it.tags.crypto) add("Bitcoin");
  if (/\b(crude|oil|opec\+?|brent|wti)\b/i.test(t)) add("Oil");
  if (/\bgold\b/i.test(t)) add("Gold"); if (/\bsilver\b/i.test(t)) add("Silver");
  return w;
}
function nwInit() { // headlines saved on this device show at once, with their age
  if (NW.booted) return; NW.booted = true;
  try { const s = JSON.parse(localStorage.getItem(NWK) || "null"); if (s && Array.isArray(s.items) && s.items.length) { NW.items = s.items.filter(x => x && x.k && x.title && x.t).map(x => Object.assign({ pts: [], sum: "", body: "", syms: [], tags: {} }, x)); NW.at = +s.at || 0; NW.utc = !!s.utc; NW.first = false; } } catch (e) {}
}
function nwSnap() { try { localStorage.setItem(NWK, JSON.stringify({ at: NW.at, utc: NW.utc, items: NW.items.slice(0, 40).map(x => ({ k: x.k, raw: x.raw, t: x.t, title: x.title, pts: x.pts, sum: x.sum, syms: x.syms, link: x.link, site: x.site, tags: x.tags })) })); } catch (e) {} }
const nwUnseen = () => { nwInit(); const s = HS().nwSeen || 0; return s ? NW.items.filter(x => x.t > s).length : 0; };
const nwEvery = () => [15, 30, 0, 0][mkTier()] * 6e4; // minutes between automatic refreshes, slower as the day's FMP calls are used

/* ---------- loading ---------- */
async function nwLoad(o = {}) { // one FMP call
  if (!MK.mcp || MK.st !== "ready" || NW.busy) return;
  const page = o.page || 0; NW.busy = true; NW.dirty = true; mkRenderSoon();
  try {
    const r = await MK.mcp.callTool(MK_SERVER, "news", { endpoint: "fmp-articles", limit: NW_LIMIT, page }, { cache: o.force ? { staleTime: 0, gcTime: WEEK, refresh: true } : { staleTime: Math.max(6e5, nwEvery() - 6e4), gcTime: WEEK } });
    const p = r && r.payload, em = fmpErr(p); if (em) throw { code: "tool_error", message: em };
    const rows = nwParse(p); if (!rows) { if (page) { NW.more = false; return; } throw { code: "tool_error", message: "no headlines came back" }; }
    if (!(r && r.cache)) bumpCalls();
    nwStamp(rows);
    const had = new Set(NW.items.map(x => x.k)), fresh = rows.filter(x => !had.has(x.k)), byK = new Map(rows.map(x => [x.k, x]));
    NW.items = NW.items.filter(x => !byK.has(x.k)).concat(rows).sort((a, b) => b.t - a.t).slice(0, 200);
    if (page) { NW.page = page; if (rows.length < NW_LIMIT * 0.6 || page >= NW_MAXPAGE) NW.more = false; }
    else { NW.at = r && r.cache && r.cache.storedAt ? r.cache.storedAt : Date.now(); if (!NW.first && fresh.length && MK.screen === "home") hmToast(`${fresh.length} new headline${fresh.length === 1 ? "" : "s"}`); }
    NW.first = false; NW.err = null; NW.locked = false; MK.limit = false; nwSnap(); shQueue();
  } catch (e) {
    const code = (e && e.code) || "upstream_error", msg = String(e && e.message || "");
    if (PAGE_CODES.has(code)) { mkPageErr(e); return; }
    NW.err = { code, message: msg };
    if (code === "tool_error" && /access denied|higher plan|upgrade|not available under|subscription/i.test(msg)) NW.locked = true;
    if (/limit reach|limit reached|daily limit|too many requests/i.test(msg)) MK.limit = true;
  } finally { NW.busy = false; NW.dirty = true; mkRenderSoon(); }
}
function nwMaybeLoad(opened) {
  nwInit(); if (!MK.mcp || MK.st !== "ready" || NW.busy || NW.locked || document.hidden) return;
  if (MK.screen !== "news" && MK.screen !== "home") return;
  const iv = nwEvery(), age = Date.now() - NW.at, live = HS().live !== false;
  if (!NW.at) { if (mkTier() < 3 && !NW.err) nwLoad(); return; }
  if (iv && age >= iv && (live || opened)) nwLoad();
}
function nwRefresh() {
  if (MK.st !== "ready") { if (MK.mcp && MK.st === "err") mkConnect(); return; }
  if (mkTier() >= 3) { hmToast("Today's FMP calls are nearly used up, so refreshing is paused until tomorrow."); return; }
  if (Date.now() - NW.manualAt < 60000) { hmToast("Headlines were just refreshed. Try again in a minute."); return; }
  NW.manualAt = Date.now(); NW.locked = false; nwLoad({ force: true });
}
function nwTick() { nwMaybeLoad(false); if (MK.screen === "news") $$("#nwList [data-t]").forEach(e => { e.textContent = fAgo(+e.dataset.t); }); }

/* ---------- Quint on the news ---------- */
const NW_ERR = { cancelled: "Stopped.", not_granted: "Quint needs your permission to use Claude, and it wasn't given. Reload the page to be asked again.", sampling_disabled: "Claude isn't available for this account here.", rate_limited: "Quint is busy or you've hit a usage limit. Give it a minute, then try again.", session_expired: "Your Claude session has expired. Sign in again, then retry.", refused: "Claude couldn't answer that one.", empty_completion: "Claude didn't come up with an answer. Try again." };
const nwWhen = it => `${new Date(it.t).toUTCString()} (${fAgo(it.t)})`;
const NW_RULES = "Rules: use only the facts given here; you may work out levels from the numbers given (day high and low, averages, ATR) but never invent prices, numbers, quotes or events. A lean is a tilt in the odds, not a forecast: never promise a result or say what price will do. Thin or headline-only evidence means low confidence or NO EDGE, and saying so is a valid and often correct answer. Most single-company news barely moves index futures: say so plainly when that is the case. If an item is more than a day old, say the first move is probably over. This is practice on a paper account with virtual money, not financial advice.";
const NW_LEANFMT = "LEAN: <BUY | SELL | MIXED | NO EDGE> for <the market it applies to> · confidence <low | medium | high>";
const nwPct = (a, b) => b ? `${a >= b ? "+" : ""}${((a / b - 1) * 100).toFixed(1)}%` : "?";
function nwMarketFacts(m) { // what this page actually knows about a market right now
  const Q = mkQ(m.k), B = liveBars(m.k), S = mkSpec(m), st = mktStatus(m.cls), L = [`Market status: ${st.label}${shReading() ? " (prices are from a shared feed and may be a few minutes old)" : ""}`];
  if (Q) {
    L.push(`Price ${fnum(S, Q.p)}${Q.pct != null ? `, ${Q.pct >= 0 ? "+" : ""}${Q.pct.toFixed(2)}% today` : ""}${Q.ts ? ` (price from ${fAgo(Q.ts)})` : ""}`);
    if (Q.lo != null && Q.hi != null && Q.hi > Q.lo) L.push(`Today's range ${fnum(S, Q.lo)} to ${fnum(S, Q.hi)}; price is ${Math.round(clamp((Q.p - Q.lo) / (Q.hi - Q.lo), 0, 1) * 100)}% of the way up it${Q.pc != null ? `; previous close ${fnum(S, Q.pc)}` : ""}`);
    if (Q.a50 != null && Q.a200 != null) L.push(`50-day average ${fnum(S, Q.a50)} (price ${nwPct(Q.p, Q.a50)} from it), 200-day average ${fnum(S, Q.a200)} (price ${nwPct(Q.p, Q.a200)} from it)`);
    if (Q.yl != null && Q.yh != null) L.push(`52-week range ${fnum(S, Q.yl)} to ${fnum(S, Q.yh)}`);
  }
  if (B && B.n > 22) {
    const c = B.c, n = B.n, hi20 = Math.max(...B.h.slice(-21, -1)), lo20 = Math.min(...B.l.slice(-21, -1)), A = atr14(B);
    L.push(`Daily candles: ${nwPct(c[n - 1], c[n - 6])} over 5 sessions, ${nwPct(c[n - 1], c[n - 21])} over 20 sessions; the prior 20-session high is ${fnum(S, hi20)} and low ${fnum(S, lo20)}`);
    if (A) L.push(`Daily ATR(14) ${fnum(S, A)} (${(A / c[n - 1] * 100).toFixed(1)}% of price)`);
  }
  return L;
}
function nwTakePrompt(it) {
  const sym = it.syms.find(s => mkQ("s:" + s)), mk = sym ? stkDef(sym) : null;
  return `You are Quint, the trading mentor inside the Chart Wizard training app (you run on Claude, made by Anthropic). The user is learning to trade futures (MNQ and ES index futures, gold, oil), Bitcoin and big US stocks on a paper account. They want to know what this news item means and whether it leans toward buying or selling. It is ${new Date().toUTCString()} now.

HEADLINE: ${it.title}
PUBLISHED: ${nwWhen(it)}
TICKERS: ${it.syms.join(", ") || "none"}
KEY POINTS FROM THE ARTICLE:
${(it.pts.length ? it.pts : [it.sum]).filter(Boolean).map(p => "- " + p).join("\n") || "- (none given)"}
${mk ? `\nLIVE FACTS FOR ${sym}:\n${nwMarketFacts(mk).map(l => "- " + l).join("\n")}\n` : ""}
Answer in under 150 words of plain English, in exactly this shape:
${NW_LEANFMT}
- **What happened:** one sentence.
- **Why it leans that way:** the mechanism in a few words, and whether it matters for MNQ or ES, Bitcoin, gold or oil or only for the named stock.
- **Before any paper trade:** what the chart must show first for a buy or a sell, and what would prove the idea wrong.
${NW_RULES}`;
}
function nwBriefPrompt() {
  const rows = NW.items.slice(0, 18).map(it => `- [${fAgo(it.t)}] ${it.title}${it.syms.length ? ` (${it.syms.join(", ")})` : ""}${it.pts[0] ? ` — ${it.pts[0].slice(0, 170)}` : ""}`).join("\n");
  const px = mkBoard().map(m => { const Q = mkQ(m.k); return Q && Q.pct != null ? `${m.cls === "stk" ? m.fmp : m.name} ${fnum(mkSpec(m), Q.p)} (${Q.pct >= 0 ? "+" : ""}${Q.pct.toFixed(2)}% today)` : null; }).filter(Boolean).join("; ");
  return `You are Quint, the trading mentor inside the Chart Wizard training app (you run on Claude, made by Anthropic). The user is practising futures (MNQ and ES index futures, gold, oil), Bitcoin and big US stocks on a paper account, and wants to know what today's news leans toward: buying or selling. It is ${new Date().toUTCString()} now. These are the latest headlines from their live market feed, newest first:

${rows}
${px ? `\nLIVE PRICES ON THEIR BOARD: ${px}\n` : ""}
From ONLY this, write a briefing of under 190 words in plain English, as markdown:
- **Matters most:** up to three items that could move index futures, crypto, commodities or a stock on their board, each with the mechanism in a few words.
- **Leans:** one short line each for the markets the evidence actually speaks to, as "Market: BUY, SELL, MIXED or NO EDGE (confidence) and why". Leave out markets with nothing to go on.
- **Mostly noise:** one line on what the rest are.
- **Watch:** one concrete thing to keep an eye on.
If nothing here is market-wide, say so plainly: that is a valid answer. ${NW_RULES}`;
}
function nwReadPrompt(m) { // Quint's read on one market: price action, its headlines and, for stocks, earnings and analysts' targets
  const list = nwFor(m).slice(0, 5), E = m.cls === "stk" ? NW.ev[m.fmp] : null, name = m.cls === "stk" ? `${m.name} (${m.fmp}), a US stock` : `${m.name} (${m.sub})`;
  return `You are Quint, the trading mentor inside the Chart Wizard training app (you run on Claude, made by Anthropic). The user is practising on a paper account with virtual money and asks whether the evidence on ${name} leans toward buying or selling right now. It is ${new Date().toUTCString()} now.

LIVE FACTS:
${nwMarketFacts(m).map(l => "- " + l).join("\n")}

RECENT HEADLINES ABOUT IT, newest first:
${list.length ? list.map(it => `- [${fAgo(it.t)}] ${it.title}${it.pts[0] ? ` — ${it.pts[0].slice(0, 170)}` : ""}`).join("\n") : `- none among the latest ${NW.items.length} headlines in their feed, so this read rests on price action${E && E.lines && E.lines.length ? " and the events below" : ""}`}
${E && E.lines && E.lines.length ? `\nEARNINGS AND ANALYSTS:\n${E.lines.map(l => "- " + l).join("\n")}\n` : ""}
Answer in under 170 words of plain English, in exactly this shape:
${NW_LEANFMT}
- **Why:** the two or three facts above that matter most and how they push price.
- **A buy would need:** what the chart should show first, with a level worked out from the numbers above.
- **A sell would need:** the same for a short.
- **Wrong if:** the level or event that breaks the read.
${NW_RULES}`;
}
function nwLean(text) { // the first line of a read, as a badge
  const m = /^\s*\**\s*LEAN\s*\**\s*:\s*\**\s*(BUY|SELL|MIXED|NO EDGE)\b([^\n]*)\n?/i.exec(text || ""); if (!m) return null;
  const conf = (/confidence\W+(low|medium|high)/i.exec(m[2]) || [])[1], mk = (/\bfor\s+([^·|\n]+?)\s*(?:[·|]|$)/i.exec(m[2]) || [])[1];
  return { lean: m[1].toUpperCase(), conf: conf ? conf.toLowerCase() : null, mkt: mk ? mk.replace(/\*+/g, "").trim().slice(0, 28) : null, rest: text.slice(m[0].length) };
}
function nwCoachLines() { // the chat version of Quint knows the same headlines, and nothing beyond them
  nwInit(); if (!NW.items.length || Date.now() - NW.at > 12 * 36e5) return "";
  return `\nLive headlines (from the user's FMP market feed, loaded ${fAgo(NW.at)}; the "Live news" page in the menu shows them, and each live chart page shows the ones about its market):\n${NW.items.slice(0, 10).map(it => `- [${fAgo(it.t)}] ${it.title}`).join("\n")}\nUse these only if the user asks about news or what is moving markets. If they ask what the news means for buying or selling, give a lean (BUY, SELL, MIXED or NO EDGE, with low, medium or high confidence) grounded in these headlines and the chart, say what would prove it wrong, note that news is often priced in by the time it is published, and that this is paper-trading practice, not financial advice. You have no other news source: never invent headlines, and say so if they ask about something not listed.\n`;
}
async function nwAsk(T, prompt, paint) {
  if (!CO.sample || T.busy) return; T.busy = true; T.open = true; T.err = null; T.text = ""; T.t0 = Date.now(); const ctl = new AbortController(); T.ctl = ctl; NW.dirty = true; mkRenderSoon();
  try { const r = await CO.sample(prompt, { onText: ({ text }) => { T.text = text; paint(); }, signal: ctl.signal, model: "claude-fable-5-2", modelTier: "complex", effort: "medium" }); if (r && r.text) T.text = r.text; if (!T.text) throw { code: "empty_completion" }; T.at = Date.now(); }
  catch (e) { const c = e && e.code; if (e && e.text) T.text = e.text; T.err = NW_ERR[c] || "Something went wrong reaching Quint. Try again in a moment."; if (c === "cancelled" && T.text) T.err = null; }
  finally { T.busy = false; T.ctl = null; NW.dirty = true; mkRenderSoon(); }
}
function nwQHTML(T) {
  const L = nwLean(T.text), half = !L && /^\s*\**\s*LEAN/i.test(T.text || ""), cls = L ? { BUY: "buy", SELL: "sell", MIXED: "mixed" }[L.lean] || "none" : "";
  const badge = L ? `<div class="lean ${cls}"><b>${L.lean === "BUY" ? "▲ Leans buy" : L.lean === "SELL" ? "▼ Leans sell" : L.lean === "MIXED" ? "◆ Mixed" : "● No clear edge"}</b><span>${esc([L.mkt, L.conf ? L.conf + " confidence" : ""].filter(Boolean).join(" · "))}</span></div>` : "";
  return badge + (L ? coachMD(L.rest) : T.text && !half ? coachMD(T.text) : "") + (T.busy && (!T.text || half) ? `<p class="dim">Analysing…</p>` : "") + (T.err ? `<p class="nwerr">${esc(T.err)}</p>` : "") + (L && !T.busy ? `<p class="nwfine">A lean is a tilt in the odds from the facts on this page, not a forecast. Paper trading only; not financial advice.</p>` : "");
}
function nwTake(k) {
  const it = NW.items.find(x => x.k === k); if (!it) return; const T = NW.takes[k] || (NW.takes[k] = {});
  if (T.busy) return; if (T.text && !T.err) { T.open = !T.open; NW.dirty = true; nwPaint(); return; }
  nwAsk(T, nwTakePrompt(it), () => { const e = $(`#nwList [data-id="${k}"] [data-q]`); if (e) e.innerHTML = nwQHTML(T); });
}
function nwBrief() {
  if (!NW.items.length) return; const T = NW.brief || (NW.brief = {}); if (T.busy) return;
  nwAsk(T, nwBriefPrompt(), () => { const e = $("#nwBriefOut"); if (e) { e.hidden = false; e.innerHTML = nwQHTML(T); } });
}
function nwLeave() { for (const T of Object.values(NW.takes).concat(Object.values(NW.reads), NW.brief || [])) if (T && T.ctl) { try { T.ctl.abort(); } catch (e) {} } }

/* ---------- every market's chart page: its headlines, its events, Quint's read ---------- */
const nwHead = it => it.title + " " + it.pts.join(" ") + " " + it.sum;
const NW_MKT = { MNQ: it => it.tags.mnq || it.tags.trump || /\b(nasdaq|tech stocks|wall street|stock market)\b/i.test(nwHead(it)), BTC: it => it.tags.crypto, ES: it => it.tags.trump || it.tags.mnq || /\b(s&p 500|wall street|stock market|equities)\b/i.test(nwHead(it)), GC: it => /\bgold\b/i.test(nwHead(it)), SI: it => /\bsilver\b/i.test(nwHead(it)), BZ: it => /\b(crude|oil|opec\+?|brent|wti)\b/i.test(nwHead(it)) };
let nwMemo = { sig: "", map: {} };
const nwCount = m => { const sig = NW.items.length + "|" + NW.at + "|" + (NW.items[0] ? NW.items[0].k : ""); if (nwMemo.sig !== sig) nwMemo = { sig, map: {} }; return nwMemo.map[m.k] != null ? nwMemo.map[m.k] : (nwMemo.map[m.k] = nwFor(m).filter(it => Date.now() - it.t < 3 * DAYMS).length); };
function nwFor(m) { // the loaded headlines that concern one market
  nwInit();
  if (m.cls === "stk") { const nm = STK_NAME[m.fmp], rx = nm && nm.length > 3 ? new RegExp("\\b" + nm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i") : null; return NW.items.filter(it => it.syms.includes(m.fmp) || (rx && rx.test(it.title))); }
  const f = NW_MKT[m.k]; return f ? NW.items.filter(f) : [];
}
const NW_EVK = "chart-wizard-events-v1";
function nwEvInit() { if (NW.evBoot) return; NW.evBoot = true; try { const s = JSON.parse(localStorage.getItem(NW_EVK) || "null"); if (s && typeof s === "object") for (const k of Object.keys(s)) if (s[k] && Array.isArray(s[k].lines) && Date.now() - s[k].at < 12 * 36e5) NW.ev[k] = { at: s[k].at, lines: s[k].lines.map(String).slice(0, 4) }; } catch (e) {} }
const nwDay = s => { const d = new Date(String(s).slice(0, 10) + "T12:00:00Z"); return isNaN(d) ? String(s) : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); };
const nwBig = x => Math.abs(x) >= 1e9 ? "$" + (x / 1e9).toFixed(2) + "B" : Math.abs(x) >= 1e6 ? "$" + (x / 1e6).toFixed(1) + "M" : "$" + Math.round(x).toLocaleString();
function nwEvLines(er, pt, m, gs) {
  const L = [], today = new Date().toISOString().slice(0, 10), rows = (er || []).filter(r => r && /^\d{4}-\d\d-\d\d/.test(String(r.date))).sort((a, b) => String(a.date) < String(b.date) ? -1 : 1);
  const next = rows.find(r => String(r.date).slice(0, 10) >= today && numv(r.epsActual) == null), last = rows.filter(r => numv(r.epsActual) != null).pop();
  if (next) { const days = Math.round((Date.parse(String(next.date).slice(0, 10)) - Date.parse(today)) / DAYMS); L.push(`Next earnings: ${nwDay(next.date)} (${days <= 0 ? "today" : days === 1 ? "tomorrow" : "in " + days + " days"})${numv(next.epsEstimated) != null ? `, earnings of $${(+next.epsEstimated).toFixed(2)} a share expected` : ""}`); }
  if (last) { const a = +last.epsActual, e = numv(last.epsEstimated), ra = numv(last.revenueActual), re = numv(last.revenueEstimated); L.push(`Last earnings (${nwDay(last.date)}): $${a.toFixed(2)} a share${e != null ? ` against $${e.toFixed(2)} expected (${a > e ? "a beat" : a < e ? "a miss" : "in line"})` : ""}${ra != null ? `; revenue ${nwBig(ra)}${re != null ? ` against ${nwBig(re)} expected` : ""}` : ""}`); }
  const t = pt && pt[0], c = t && numv(t.targetConsensus), Q = mkQ(m.k);
  if (c != null) L.push(`Analysts' average price target $${c.toFixed(2)}${numv(t.targetLow) != null && numv(t.targetHigh) != null ? ` (range $${(+t.targetLow).toFixed(0)} to $${(+t.targetHigh).toFixed(0)})` : ""}${Q && Q.p ? `, ${nwPct(c, Q.p)} from the price` : ""}`);
  const g = gs && gs[0], cnt = g ? ["strongBuy", "buy", "hold", "sell", "strongSell"].map(f => numv(g[f]) || 0) : null;
  if (cnt && cnt.some(x => x > 0)) L.push(`Analysts' ratings: ${cnt[0] + cnt[1]} buy, ${cnt[2]} hold, ${cnt[3] + cnt[4]} sell${g.consensus ? ` (consensus ${String(g.consensus).slice(0, 20)})` : ""}`);
  return L;
}
async function nwEvents(m) { // one stock's earnings, analysts' targets and ratings: three FMP calls, kept for 12 hours
  nwEvInit(); if (m.cls !== "stk") return null; const k = m.fmp, E = NW.ev[k] || (NW.ev[k] = {});
  if (E.at && Date.now() - E.at < 12 * 36e5) return E; if (E.busy) return E.p;
  if (!MK.mcp || MK.st !== "ready" || mkTier() >= 3) return null;
  E.busy = true; E.tried = Date.now(); mkRenderSoon();
  const one = async (tool, input) => { try { const r = await MK.mcp.callTool(MK_SERVER, tool, input, { cache: { staleTime: 12 * 36e5, gcTime: WEEK } }), p = r && r.payload; if (fmpErr(p)) return null; if (!(r && r.cache)) bumpCalls(); return Array.isArray(p) ? p : null; } catch (e) { if (e && PAGE_CODES.has(e.code)) mkPageErr(e); return null; } };
  E.p = Promise.all([one("calendar", { endpoint: "earnings-company", symbol: k, limit: 5 }), one("analyst", { endpoint: "price-target-consensus", symbol: k }), one("analyst", { endpoint: "grades-summary", symbol: k })]).then(([er, pt, gs]) => {
    E.busy = false; E.lines = nwEvLines(er, pt, m, gs); E.none = !E.lines.length; if (er || pt || gs) E.at = Date.now();
    try { const s = {}; for (const x of Object.keys(NW.ev)) if (NW.ev[x].at && NW.ev[x].lines) s[x] = { at: NW.ev[x].at, lines: NW.ev[x].lines }; localStorage.setItem(NW_EVK, JSON.stringify(s)); } catch (e) {}
    mkRenderSoon(); shQueue(); return E;
  });
  return E.p;
}
async function nwRead(m) {
  const T = NW.reads[m.k] || (NW.reads[m.k] = {}); if (T.busy || T.pre) return;
  if (T.text && !T.err && Date.now() - (T.at || 0) < 10 * 6e4) { T.open = !T.open; mkRenderSoon(); return; }
  if (m.cls === "stk" && MK.st === "ready" && mkTier() < 2) { T.pre = true; T.open = true; T.text = ""; T.err = null; mkRenderSoon(); try { await nwEvents(m); } catch (e) {} T.pre = false; }
  if (MK.screen !== "chart" || MK.sel !== m.k) { mkRenderSoon(); return; }
  nwAsk(T, nwReadPrompt(m), () => { const e = $("#hcReadOut"); if (e) e.innerHTML = nwQHTML(T); });
}
function hcNewsPaint() {
  const box = $("#hcNews"); if (!box || MK.screen !== "chart") return; const m = MKDEF[MK.sel]; if (!m) return; nwInit(); nwEvInit();
  let E = m.cls === "stk" ? NW.ev[m.fmp] : null;
  if (m.cls === "stk" && MK.st === "ready" && mkTier() < 2 && !(E && (E.at || E.busy)) && !(E && E.tried && Date.now() - E.tried < 6e5)) { nwEvents(m); E = NW.ev[m.fmp]; }
  const list = nwFor(m).slice(0, 4), T = NW.reads[m.k], nm = m.cls === "stk" ? m.fmp : m.name;
  const sig = [m.k, list.map(x => x.k).join(), NW.items.length, NW.busy, MK.st, T && [T.busy, T.pre, T.open, T.err, (T.text || "").length].join(), E && [E.busy, E.at, E.none].join(), CO.sample ? 1 : 0, shReading(), Math.floor(Date.now() / 6e4)].join("|");
  if (box.dataset.sig === sig) return; box.dataset.sig = sig;
  const busy = T && (T.busy || T.pre);
  box.innerHTML = `<div class="q"><span class="qk">News &amp; Quint's read · ${esc(nm)}</span>
    ${CO.sample ? `<button class="btn coachask" id="hcRead" ${busy ? "disabled" : ""}>✦ ${busy ? "Quint is reading the market…" : T && T.text && !T.err && T.open ? "Hide Quint's read" : `Quint: does ${esc(nm)} lean buy or sell?`}</button>` : ""}
    ${T && T.open ? `<div class="nwq" id="hcReadOut">${T.pre ? `<p class="dim">Loading earnings and targets…</p>` : nwQHTML(T)}</div>` : ""}
    ${E && E.lines && E.lines.length ? `<ul class="nwpts nwev">${E.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : m.cls === "stk" && MK.st === "ready" ? (E && E.none ? `<p class="small" style="margin:0">FMP has no earnings dates or analyst targets for ${esc(nm)} on this plan.</p>` : (E && E.busy ? `<p class="small" style="margin:0">Loading earnings, analysts' targets and ratings…</p>` : `<button class="btn" id="hcEv">Earnings, analysts' targets &amp; ratings (3 FMP calls)</button>`)) : ""}
    ${list.length ? `<div class="nwhome one">${list.map(it => `<button class="nwrow" data-nw="${it.k}"><small>${fAgo(it.t)}</small><span>${esc(it.title)}</span></button>`).join("")}</div>` : `<p class="small" style="margin:0">${NW.items.length ? `None of the latest ${NW.items.length} headlines are about ${esc(nm)}. Quint can still read it from price action${m.cls === "stk" ? ", earnings and analysts' targets" : ""}.` : NW.busy || MK.st === "wait" ? "Loading headlines…" : "No headlines are loaded yet."}</p>`}
    <button class="btn" id="hcAllNews">All market news ▸</button></div>`;
  box.onclick = e => {
    if (e.target.closest("#hcRead")) { nwRead(m); return; }
    if (e.target.closest("#hcEv")) { nwEvents(m); return; }
    const r = e.target.closest("[data-nw]"); if (r || e.target.closest("#hcAllNews")) { if (r) NW.focus = r.dataset.nw; mkShow("news"); }
  };
}

/* ---------- the news screen ---------- */
function openNews() { closeNav(); if ($("#scrim").classList.contains("open")) closeSheet(); mkShow("news"); }
function nwOpenSym(s) { const m = stkDef(s); NW.y = $("#hmNews").scrollTop; NW.back = true; mkShow("chart", m.k); }
function nwOpen() {
  nwInit(); const root = $("#hmNews"), back = NW.back; NW.back = false;
  if (!back) NW.seen0 = HS().nwSeen || 0;
  root.innerHTML = `<header class="hmh"><div class="hmbrand"><span><b>Live news</b><small>Market headlines</small></span></div><span class="spacer"></span><button class="tbtn" id="nwRef" aria-label="Refresh headlines">⟳</button><button class="btn pri hmgo" id="nwGo">Trainer ▸</button></header>
    <div class="hmwrap">
      <div class="hmstat" id="nwStat"></div><div id="nwBan"></div>
      <div class="nwbrief" id="nwBriefBox" ${CO.sample ? "" : "hidden"}><div class="nbh"><div class="qorb" aria-hidden="true"><s></s><s></s><i></i></div><div><b>Quint's briefing</b><small>What in these headlines matters for MNQ, ES, Bitcoin, gold and oil</small></div><button class="btn pri" id="nwBriefGo">Brief me</button></div><div class="nwq" id="nwBriefOut" hidden></div></div>
      <div class="nwfind"><input id="nwFind" type="search" inputmode="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search: Trump, Musk, Nvidia, oil…" aria-label="Search the headlines" value="${esc(NW.find)}"></div>
      <div class="nwcats" id="nwCats" role="group" aria-label="Filter headlines"></div>
      <div id="nwList" aria-live="polite"></div><div id="nwMore"></div>
      <footer class="hmfoot"><p>Headlines are FMP's market articles, loaded through your FMP connector: mostly company news such as earnings and analyst calls, tagged here by what they could move. Each refresh uses one of FMP's 250 free calls a day, so it updates every 15 to 30 minutes, or when you tap ⟳. Times are shown in your time zone.</p><p>News is context, not a signal: by the time a headline is published, the first move has usually happened. Not financial advice.</p></footer>
    </div>`;
  $("#nwGo", root).onclick = () => mkShow(null);
  $("#nwRef", root).onclick = nwRefresh;
  $("#nwFind", root).oninput = e => { NW.find = e.target.value; NW.dirty = true; nwPaint(); };
  root.onclick = e => {
    const c = e.target.closest("[data-cat]"); if (c) { NW.cat = c.dataset.cat; NW.dirty = true; nwPaint(); return; }
    const sy = e.target.closest("[data-sym]"); if (sy) { nwOpenSym(sy.dataset.sym); return; }
    const card = e.target.closest("[data-id]"), k = card && card.dataset.id;
    if (k && e.target.closest("[data-take]")) { nwTake(k); return; }
    if (k && e.target.closest("[data-more]")) { NW.open[k] = !NW.open[k]; NW.dirty = true; nwPaint(); return; }
    if (e.target.closest("#nwBriefGo")) { nwBrief(); return; }
    if (e.target.closest("#nwMoreB")) { if (mkTier() >= 3) { hmToast("Today's FMP calls are nearly used up."); return; } nwLoad({ page: NW.page + 1 }); return; }
    if (e.target.closest("#hmRetry")) { mkConnect(); return; }
  };
  NW.dirty = true; nwPaint(); root.scrollTop = back ? NW.y : 0;
  nwMaybeLoad(true);
}
function nwBanner() {
  if (MK.st === "none") {
    if (SH.canWrite === true) return `<div class="hmban info"><span><b>Live news needs your FMP connector.</b> It works when Chart Wizard is open inside Claude (web, desktop or mobile app) while you're signed in.${NW.at ? ` Below are the headlines saved at ${fLocal(NW.at)}.` : ""}</span></div>`;
    if (shReading() && NW.at && NW.items.length) return `<div class="hmban info"><span><b>You're seeing headlines from the owner's shared feed</b>, last updated ${fLocal(NW.at)} (${fAgo(NW.at)}). They update while the owner has Chart Wizard open. ${SH_WHY}</span></div>`;
    return shBanner().replace(/shared prices/g, "shared headlines").replace("Live prices can't load", "Live news can't load").replace("the prices the owner's page shares", "the headlines the owner's page shares").replace("Prices appear here", "Headlines appear here");
  }
  if (MK.st !== "ready") return mkBanner().replace("Live prices can't run", "Live news can't run");
  if (NW.locked) return `<div class="hmban bad"><span><b>FMP's news feed isn't included in the plan on this account.</b> Prices still work; headlines need a plan that includes FMP articles.</span></div>`;
  if (mkTier() >= 2) return mkBanner().replace(/prices only refresh/, "headlines only refresh");
  if (NW.err) return `<div class="hmban"><span><b>Couldn't load new headlines.</b> ${esc(errText(NW.err))}${NW.items.length ? " Showing the last ones." : ""}</span></div>`;
  return "";
}
function nwList() {
  const mine = new Set(HS().stocks), q = NW.find.trim().toLowerCase();
  return NW.items.filter(it => (NW.cat === "all" || (NW.cat === "mine" ? it.syms.some(s => mine.has(s)) : it.tags[NW.cat])) && (!q || (it.title + " " + it.syms.join(" ") + " " + it.pts.join(" ") + " " + it.sum + " " + (it.body || "")).toLowerCase().includes(q)));
}
function nwCard(it) {
  const T = NW.takes[it.k], fresh = NW.seen0 && it.t > NW.seen0, w = nwWatch(it), open = NW.open[it.k], tags = NW_TAGS.filter(([k]) => it.tags[k]).slice(0, 3);
  return `<article class="nwi${fresh ? " new" : ""}" data-id="${it.k}">
    <div class="nwm">${fresh ? `<span class="nwnew">NEW</span>` : ""}<span data-t="${it.t}" title="${esc(fLocal(it.t))}">${fAgo(it.t)}</span>${it.syms.map(s => `<button class="nwsym" data-sym="${esc(s)}" aria-label="Open the live chart of ${esc(s)}">${esc(s)}</button>`).join("")}${tags.map(([, l]) => `<span class="nwtag">${l}</span>`).join("")}</div>
    <h3>${esc(it.title)}</h3>
    ${it.pts.length ? `<ul class="nwpts">${(open ? it.pts : it.pts.slice(0, 1)).map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : it.sum ? `<p class="nwsum">${esc(it.sum)}</p>` : ""}
    <div class="nwwatch">${w.length ? `<span>Could matter for</span>${w.map(x => `<b>${x}</b>`).join("")}` : `<span>Mostly a single-stock story: little effect on index futures</span>`}</div>
    <div class="nwacts">${CO.sample ? `<button class="btn coachask" data-take ${T && T.busy ? "disabled" : ""}>✦ ${T && T.busy ? "Quint is reading…" : T && T.text && !T.err ? (T.open ? "Hide Quint" : "Show Quint") : "Ask Quint"}</button>` : ""}${it.pts.length > 1 ? `<button class="btn" data-more aria-expanded="${!!open}">${open ? "Less" : "Key points"}</button>` : ""}${it.link ? `<a class="btn" href="${esc(it.link)}" target="_blank" rel="noopener">Read ↗</a>` : ""}</div>
    ${T && T.open ? `<div class="nwq" data-q>${nwQHTML(T)}</div>` : ""}
  </article>`;
}
function nwPaint() {
  if (MK.screen !== "news" || !$("#nwStat")) return; nwInit();
  const T = mkTier(), n = callsToday(), live = HS().live !== false, iv = nwEvery();
  const dot = MK.st === "ready" ? (NW.err || NW.locked || T >= 2 || !live ? "warn" : "on") : MK.st === "wait" || (shReading() && NW.at) ? "warn" : "off";
  const shd = shReading() && NW.at && NW.items.length;
  const word = MK.st === "ready" ? (T >= 3 ? "PAUSED" : NW.busy ? "UPDATING" : live && iv ? "LIVE" : "MANUAL") : shd ? "SHARED" : MK.st === "wait" ? "CONNECTING" : "OFFLINE";
  $("#nwStat").innerHTML = `<span class="ldot ${dot}"><i></i>${word}</span>${NW.at ? `<span>${MK.st === "ready" ? "Updated" : shd ? "Owner's feed · updated" : "Saved"} ${fLocal(NW.at)}${shd ? ` (${fAgo(NW.at)})` : ""}</span>` : ""}${MK.st === "ready" && live && iv ? `<span>refreshes every ${Math.round(iv / 6e4)} min</span>` : ""}${MK.st === "none" ? "" : `<span class="budget" title="FMP calls this app has made today. The free plan allows 250 a day in total.">FMP <span class="bar"><i style="width:${clamp(n / 250 * 100, 0, 100)}%"></i></span> ~${n}/250 today</span>`}`;
  $("#nwBan").innerHTML = nwBanner();
  { const rf = $("#nwRef"); if (rf) rf.hidden = MK.st === "none"; }
  const rb = $("#nwRef"); if (rb) rb.disabled = NW.busy;
  if (!NW.dirty) return; NW.dirty = false;
  if (!NW.seen0 && NW.items.length) NW.seen0 = NW.items[0].t; // first visit: only headlines that arrive from now on count as new
  const mine = new Set(HS().stocks), cnt = k => k === "all" ? NW.items.length : NW.items.filter(it => k === "mine" ? it.syms.some(s => mine.has(s)) : it.tags[k]).length;
  const cats = $("#nwCats"), sl = cats.scrollLeft; cats.innerHTML = NW_CATS.map(([k, l]) => `<button class="chip" data-cat="${k}" aria-pressed="${NW.cat === k}">${l}<i>${cnt(k)}</i></button>`).join(""); cats.scrollLeft = sl;
  const list = nwList(), box = $("#nwList"), label = (NW_CATS.find(c => c[0] === NW.cat) || [, "All"])[1], q = NW.find.trim();
  if (!NW.items.length) box.innerHTML = NW.busy || MK.st === "wait" ? `<div class="nwlist">${[0, 1, 2, 3].map(() => `<div class="nwi nwsk"><i></i><i></i><i></i></div>`).join("")}</div>` : `<div class="nwempty">${MK.st === "ready" ? (NW.locked || NW.err ? "No headlines to show yet." : "No headlines yet. Tap ⟳ to load them.") : "Headlines appear here once FMP is connected."}</div>`;
  else if (!list.length) box.innerHTML = `<div class="nwempty"><b>No headlines ${q ? `mention “${esc(q)}”` : `under ${esc(label)}`} right now.</b><br>FMP's feed is mostly company news (earnings, analyst calls), so names like Trump or Musk appear only when an article mentions them.${NW.more && MK.st === "ready" ? " Load older headlines to look further back." : ""}</div>`;
  else box.innerHTML = `<div class="nwlist">${list.map(nwCard).join("")}</div>`;
  $("#nwMore").innerHTML = NW.items.length && NW.more && MK.st === "ready" && !NW.locked ? `<button class="btn" id="nwMoreB" style="width:100%" ${NW.busy ? "disabled" : ""}>${NW.busy ? "Loading…" : "Load older headlines (uses 1 FMP call)"}</button>` : "";
  const bb = $("#nwBriefBox"), bo = $("#nwBriefOut"), B = NW.brief;
  if (bb) { bb.hidden = !CO.sample || !NW.items.length; bb.classList.toggle("busy", !!(B && B.busy)); const g = $("#nwBriefGo"); if (g) { g.disabled = !!(B && B.busy); g.textContent = B && B.busy ? "Reading…" : B && B.text ? "Refresh" : "Brief me"; } if (bo && B && (B.text || B.busy || B.err)) { bo.hidden = false; bo.innerHTML = nwQHTML(B); } }
  if (NW.focus) { const e = $(`#nwList [data-id="${NW.focus}"]`); NW.focus = null; if (e) setTimeout(() => e.scrollIntoView({ block: "center" }), 60); }
  const top = NW.items.length ? NW.items[0].t : 0; if (top && top !== HS().nwSeen) { HS().nwSeen = top; saveSoon(); }
}
function nwPaintHome() { // the latest three headlines on the Markets home page
  const box = $("#hmNewsBox"); if (!box) return; nwInit();
  const top = NW.items.slice(0, 3), un = nwUnseen(), all = $("#hmNewsAll"); if (all) all.textContent = un ? `${un} new ▸` : "All news ▸";
  const sig = top.map(x => x.k).join() + "|" + Math.floor(Date.now() / 6e4) + "|" + NW.busy + MK.st + NW.locked;
  if (box.dataset.sig === sig) return; box.dataset.sig = sig;
  box.innerHTML = top.length ? `<div class="nwhome">${top.map(it => `<button class="nwrow" data-nw="${it.k}"><small>${fAgo(it.t)}</small><span>${esc(it.title)}</span></button>`).join("")}</div>`
    : `<div class="nwempty">${MK.st === "ready" ? (NW.busy ? "Loading headlines…" : NW.locked ? "FMP's news feed isn't included in the plan on this account." : "No headlines yet.") : MK.st === "wait" ? "Connecting…" : "Headlines appear here when FMP is connected."}</div>`;
}

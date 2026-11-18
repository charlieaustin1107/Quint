/* ================= LIVE MARKETS HOME (FMP connector) + LIVE PAPER TRADING ================= */
// The home page: Bitcoin, futures and stocks with prices from the viewer's FMP connector.
// Futures and Bitcoin can be paper traded on the live chart with the prop account (same balance, loss limit, copy trades, journal).
// FMP's free plan allows 250 calls a day, so refreshing is spaced out and slows down as the day's calls are used.
const MK_SERVER = "FMP", TV_SERVER = "Tradingview", WEEK = 6048e5, DAYMS = 864e5;
const MKSPEC = (() => {
  const b = I => ({ sym: I.sym, name: I.name, short: I.short, pv: I.pv, mpv: I.mpv, micro: I.micro, tick: I.tick, dec: I.dec, money: I.money, unit: I.unit });
  return {
    BTC: b(INST.BTC), ES: b(INST.ES), GC: b(INST.GC), MNQ: Object.assign(b(INST.NQ), { short: "Nasdaq (MNQ)" }),
    SI: { sym: "SI", name: "Silver", short: "Silver", pv: 5000, mpv: 1000, micro: "SIL", tick: 0.005, dec: 3, money: true, unit: "$/oz" },
    BZ: { sym: "BZ", name: "Brent crude oil", short: "Brent", pv: 1000, mpv: 1000, micro: "BZ", tick: 0.01, dec: 2, money: true, unit: "$/barrel" },
  };
})();
const MKDEF = {
  MNQ: { k: "MNQ", tv: "CME_MINI:MNQ1!", fmp: "MNQ1!", cls: "fut", name: "Micro Nasdaq-100", sub: "MNQ1! · CME futures · TradingView", logo: "NQ", trade: true, replay: "NQ", what: "1 MNQ micro = $2 a point (one 0.25 tick = $0.50), 1 NQ = $20 a point" },
  BTC: { k: "BTC", fmp: "BTCUSD", cls: "crypto", name: "Bitcoin", sub: "BTC/USD · trades 24/7", logo: "₿", trade: true, replay: "BTC", what: "1 MBT micro = 0.1 BTC" },
  ES: { k: "ES", fmp: "ESUSD", cls: "fut", name: "S&P 500 E-mini", sub: "ES · CME futures", logo: "ES", trade: true, replay: "ES", what: "1 MES micro = $5 a point, 1 ES = $50 a point" },
  GC: { k: "GC", fmp: "GCUSD", cls: "fut", name: "Gold", sub: "GC · COMEX futures", logo: "Au", trade: true, replay: "GC", what: "1 MGC micro = 10 oz, 1 GC = 100 oz" },
  SI: { k: "SI", fmp: "SIUSD", cls: "fut", name: "Silver", sub: "SI · COMEX futures", logo: "Ag", trade: true, what: "1 SIL micro = 1,000 oz, 1 SI = 5,000 oz" },
  BZ: { k: "BZ", fmp: "BZUSD", cls: "fut", name: "Brent crude", sub: "BZ · NYMEX futures", logo: "BZ", trade: true, what: "1 contract = 1,000 barrels ($10 a tick); there's no micro" },
};
// Every futures market below comes from the TradingView connector (about 10 minutes delayed unless the account has real-time CME data).
// All trade on CME Globex hours (Sunday 18:00 to Friday 17:00 New York, break 17:00-18:00), so the futures clock fits them all.
const FUT_G = [["idx", "Indices"], ["nrg", "Energy"], ["met", "Metals"], ["rate", "Rates"], ["fx", "FX"], ["cry", "Crypto"], ["all", "All"]];
const FUT_T = [
  ["MNQ", "CME_MINI:MNQ1!", "idx"], ["ES", "CME_MINI:ES1!", "idx"],
  ["YM", "CBOT_MINI:YM1!", "idx", "YM", { sym: "YM", name: "E-mini Dow", short: "Dow", pv: 5, mpv: 0.5, micro: "MYM", tick: 1, dec: 0, money: false, unit: "points" }],
  ["RTY", "CME_MINI:RTY1!", "idx", "RTY", { sym: "RTY", name: "E-mini Russell 2000", short: "Russell 2000", pv: 50, mpv: 5, micro: "M2K", tick: 0.1, dec: 1, money: false, unit: "points" }],
  ["NKD", "CME:NKD1!", "idx", "NKD", { sym: "NKD", name: "Nikkei 225 (dollar)", short: "Nikkei", pv: 5, mpv: 5, micro: "NKD", tick: 5, dec: 0, money: false, unit: "points" }],
  ["CL", "NYMEX:CL1!", "nrg", "CL", null], ["BZ", "NYMEX:BZ1!", "nrg"],
  ["NG", "NYMEX:NG1!", "nrg", "NG", { sym: "NG", name: "Natural gas", short: "Nat gas", pv: 10000, mpv: 10000, micro: "NG", tick: 0.001, dec: 3, money: true, unit: "$/MMBtu" }],
  ["RB", "NYMEX:RB1!", "nrg", "RB", { sym: "RB", name: "RBOB gasoline", short: "Gasoline", pv: 42000, mpv: 42000, micro: "RB", tick: 0.0001, dec: 4, money: true, unit: "$/gallon" }],
  ["HO", "NYMEX:HO1!", "nrg", "HO", { sym: "HO", name: "Heating oil", short: "Heating oil", pv: 42000, mpv: 42000, micro: "HO", tick: 0.0001, dec: 4, money: true, unit: "$/gallon" }],
  ["GC", "COMEX:GC1!", "met"], ["SI", "COMEX:SI1!", "met"],
  ["HG", "COMEX:HG1!", "met", "Cu", { sym: "HG", name: "Copper", short: "Copper", pv: 25000, mpv: 2500, micro: "MHG", tick: 0.0005, dec: 4, money: true, unit: "$/lb" }],
  ["PL", "NYMEX:PL1!", "met", "Pt", { sym: "PL", name: "Platinum", short: "Platinum", pv: 50, mpv: 50, micro: "PL", tick: 0.1, dec: 1, money: true, unit: "$/oz" }],
  ["PA", "NYMEX:PA1!", "met", "Pd", { sym: "PA", name: "Palladium", short: "Palladium", pv: 100, mpv: 100, micro: "PA", tick: 0.5, dec: 1, money: true, unit: "$/oz" }],
  ["ZB", "CBOT:ZB1!", "rate", "ZB", { sym: "ZB", name: "30-year Treasury bond", short: "30Y bond", pv: 1000, mpv: 1000, micro: "ZB", tick: 0.03125, dec: 5, money: false, unit: "points" }],
  ["ZN", "CBOT:ZN1!", "rate", "ZN", { sym: "ZN", name: "10-year Treasury note", short: "10Y note", pv: 1000, mpv: 1000, micro: "ZN", tick: 0.015625, dec: 6, money: false, unit: "points" }],
  ["6E", "CME:6E1!", "fx", "€", { sym: "6E", name: "Euro FX", short: "Euro", pv: 125000, mpv: 12500, micro: "M6E", tick: 0.00005, dec: 5, money: false, unit: "$ per euro" }],
  ["6B", "CME:6B1!", "fx", "£", { sym: "6B", name: "British pound", short: "Pound", pv: 62500, mpv: 6250, micro: "M6B", tick: 0.0001, dec: 4, money: false, unit: "$ per pound" }],
  ["6J", "CME:6J1!", "fx", "¥", { sym: "6J", name: "Japanese yen", short: "Yen", pv: 12500000, mpv: 12500000, micro: "6J", tick: 0.0000005, dec: 7, money: false, unit: "$ per yen" }],
  ["6A", "CME:6A1!", "fx", "A$", { sym: "6A", name: "Australian dollar", short: "Aussie", pv: 100000, mpv: 10000, micro: "M6A", tick: 0.00005, dec: 5, money: false, unit: "$ per A$" }],
  ["6C", "CME:6C1!", "fx", "C$", { sym: "6C", name: "Canadian dollar", short: "Loonie", pv: 100000, mpv: 100000, micro: "6C", tick: 0.00005, dec: 5, money: false, unit: "$ per C$" }],
  ["MBT", "CME:BTC1!", "cry", "₿F", { sym: "BTCF", big: "BTC", name: "CME Bitcoin futures", short: "Bitcoin futures", pv: 5, mpv: 0.1, micro: "MBT", tick: 5, dec: 0, money: true, unit: "$/BTC" }],
  ["MET", "CME:ETH1!", "cry", "Ξ", { sym: "ETHF", big: "ETH", name: "CME Ether futures", short: "Ether futures", pv: 50, mpv: 0.1, micro: "MET", tick: 0.5, dec: 1, money: true, unit: "$/ETH" }],
];
const usdOf = v => "$" + (v >= 100 ? nf(0).format(v) : nf(2).format(v).replace(/\.00$/, ""));
function whatOf(S) { // contract sizes in plain words
  const big = S.big || S.sym, tk = nf(S.dec).format(S.tick), per = S.unit === "points" ? "a point" : "per 1.00 move";
  return S.mpv !== S.pv ? `1 ${S.micro} micro = ${usdOf(S.mpv)} ${per} (one ${tk} tick = ${usdOf(S.mpv * S.tick)}), 1 ${big} = ${usdOf(S.pv)} ${per} (${usdOf(S.pv * S.tick)} a tick)` : `1 ${big} = ${usdOf(S.pv)} ${per} (one ${tk} tick = ${usdOf(S.pv * S.tick)}); there's no micro`;
}
for (const [k, tv, grp, logo, spec] of FUT_T) {
  if (spec) MKSPEC[k] = spec; else if (!MKSPEC[k] && INST[k]) { const I = INST[k]; MKSPEC[k] = { sym: I.sym, name: I.name, short: I.short, pv: I.pv, mpv: I.mpv, micro: I.micro, tick: I.tick, dec: I.dec, money: I.money, unit: I.unit }; }
  const S = MKSPEC[k], ex = tv.split(":")[0].replace("_MINI", ""), sub = `${tv.split(":")[1]} · ${ex} futures · TradingView`;
  if (MKDEF[k]) Object.assign(MKDEF[k], { tv, grp, sub }); else MKDEF[k] = { k, tv, cls: "fut", grp, name: S.name, sub, logo: logo || k, trade: true, what: whatOf(S) };
  if (INST[k] && !MKDEF[k].replay) MKDEF[k].replay = k;
}
const FUT_KEYS = FUT_T.map(r => r[0]);
const futGrp = () => { const g = HS().fg; return FUT_G.some(x => x[0] === g) ? g : "idx"; };
const futShown = () => { const g = futGrp(); return FUT_KEYS.filter(k => g === "all" || MKDEF[k].grp === g); };
const btcShown = () => futGrp() === "cry" || futGrp() === "all";
const HERO_K = "MNQ";
const TVB = { k: "qb:tv", tv: "batch", cls: "fut" }; // one TradingView call refreshes every futures tile
const srvOf = m => m && m.tv ? TV_SERVER : MK_SERVER;
const TV_QCOLS = ["close", "change", "change_abs", "high", "low", "open", "volume", "update_mode", "price_52_week_high", "price_52_week_low", "SMA50", "SMA200"];
const STK_DEFAULT = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "META", "GOOGL", "SPY", "NFLX", "AMD", "PLTR", "JPM"];
const STK_MAX = 20, STK_MORE = ["NFLX", "AMD", "PLTR", "JPM"], STK_IDEAS = ["DIS", "COIN", "AVGO", "INTC", "UBER", "BA", "WMT", "KO", "NKE", "V"];
const STK_NAME = { AAPL: "Apple", TSLA: "Tesla", NVDA: "Nvidia", MSFT: "Microsoft", AMZN: "Amazon", META: "Meta", GOOGL: "Alphabet", SPY: "S&P 500 ETF", NFLX: "Netflix", AMD: "AMD", GOOG: "Alphabet C", JPM: "JPMorgan", V: "Visa", DIS: "Disney", PLTR: "Palantir", COIN: "Coinbase", AVGO: "Broadcom", INTC: "Intel", UBER: "Uber", BA: "Boeing", WMT: "Walmart", KO: "Coca-Cola", NKE: "Nike" };
function stkDef(t) { const k = "s:" + t; return MKDEF[k] || (MKDEF[k] = { k, fmp: t, cls: "stk", name: STK_NAME[t] || t, sub: `${t} · US stock`, logo: t.slice(0, 4), trade: false }); }
const mkSpec = m => MKSPEC[m.k] || { sym: m.fmp, dec: 2, money: true, tick: 0.01 };
const TV_TFS = ["1m", "5m", "15m", "1h", "4h", "1D"], TF_NAME = { "1m": "1-minute", "5m": "5-minute", "15m": "15-minute", "1h": "hourly", "4h": "4-hour", "1D": "daily" };
const HS = () => { const h = ST.home || (ST.home = {}); if (!Array.isArray(h.stocks)) { h.stocks = STK_DEFAULT.slice(); h.more1 = true; } if (!h.more1) { h.more1 = true; for (const t of STK_MORE) if (!h.stocks.includes(t) && h.stocks.length < STK_MAX) h.stocks.push(t); } if (h.live == null) h.live = true; return h; };
const mkBoard = () => [MKDEF.BTC, ...FUT_KEYS.map(k => MKDEF[k]), ...mkStocks().map(stkDef)];
const MK = { tvLive: false, mcp: null, st: "wait", why: null, whyMsg: "", pollOnly: false, q: {}, h: {}, s: {}, err: {}, W: {}, fp: {}, locked: {}, flash: {}, closeDone: {}, screen: null, sel: null, vis: 66, manualAt: 0, limit: false, snap: { q: {}, sp: {}, at: 0 }, edit: false, adding: false, tut: false };
const HC = { chart: null, tf: "1D", ib: null, ibErr: null, ibBusy: false, ibT: 0, lvl: null };
const LV = { busy: false, resBy: {}, catch: {} };

/* ---------- time: exchange hours are New York time; everything is shown in the viewer's own time zone ---------- */
const ETF = (() => { try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" }); } catch (e) { return null; } })();
const WDX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function etNow(ms) {
  if (!ETF) { const d = new Date(ms - 5 * 36e5); return { wd: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), off: -300, y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate() }; }
  const p = {}; for (const x of ETF.formatToParts(new Date(ms))) p[x.type] = x.value;
  const h = +p.hour % 24, mi = +p.minute, y = +p.year, mo = +p.month, d = +p.day;
  return { wd: WDX[p.weekday], min: h * 60 + mi, off: Math.round((Date.UTC(y, mo - 1, d, h, mi) - Math.floor(ms / 6e4) * 6e4) / 6e4), y, mo, d };
}
function etAt(ms, dd, m) { const e = etNow(ms); return Date.UTC(e.y, e.mo - 1, e.d + dd, 0, 0) + m * 6e4 - e.off * 6e4; } // epoch ms of a New York wall-clock minute
function mktStatus(cls, ms = Date.now()) {
  if (cls === "crypto") return { open: true, cls: "open", label: "24/7" };
  const e = etNow(ms), wd = e.wd, m = e.min;
  if (cls === "fut") { // CME Globex: Sunday 18:00 to Friday 17:00 New York, with a break 17:00–18:00 each weekday
    const brk = wd >= 1 && wd <= 4 && m >= 1020 && m < 1080, wkend = wd === 6 || (wd === 0 && m < 1080) || (wd === 5 && m >= 1020);
    if (!brk && !wkend) return { open: true, cls: "open", label: "Open" };
    return { open: false, cls: "", label: brk ? "Daily break" : "Weekend", next: brk ? etAt(ms, 0, 1080) : etAt(ms, wd === 5 ? 2 : wd === 6 ? 1 : 0, 1080) };
  }
  const wk = wd >= 1 && wd <= 5; // US stocks: 09:30–16:00 New York, Monday to Friday (holidays not shown)
  if (wk && m >= 570 && m < 960) return { open: true, cls: "open", label: "Open" };
  let nx; if (wk && m < 570) nx = etAt(ms, 0, 570); else { let dd = 1; while ((wd + dd) % 7 === 0 || (wd + dd) % 7 === 6) dd++; nx = etAt(ms, dd, 570); }
  if (wk && m >= 240 && m < 570) return { open: false, cls: "ext", label: "Pre-market", next: nx };
  if (wk && m >= 960 && m < 1200) return { open: false, cls: "ext", label: "After hours", next: nx };
  return { open: false, cls: "", label: "Closed", next: nx };
}
function lastClose(cls, ms = Date.now()) {
  if (cls === "crypto") return 0; const e = etNow(ms), cm = cls === "fut" ? 1020 : 960;
  for (let dd = 0; dd <= 7; dd++) { const wd = (e.wd - dd + 7) % 7; if (wd === 0 || wd === 6) continue; const t = etAt(ms, -dd, cm); if (t <= ms) return t; }
  return ms - 3 * DAYMS;
}
function sessDay(m, ts) { // which daily candle a moment belongs to (a futures evening session counts toward the next day)
  if (m.cls === "crypto") return new Date(ts).toISOString().slice(0, 10);
  const e = etNow(ts); let add = m.cls === "fut" && e.min >= 1080 ? 1 : 0; const wd = (e.wd + add) % 7; if (wd === 6) add += 2; else if (wd === 0) add += 1;
  return new Date(Date.UTC(e.y, e.mo - 1, e.d + add)).toISOString().slice(0, 10);
}
const dayMs = s => dayNum(s) * DAYMS;
const LTF = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }), LTD = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
const fLocal = ms => { const d = new Date(ms); return d.toDateString() === new Date().toDateString() ? LTF.format(d) : LTD.format(d); };
const fAgo = ms => { const s = Math.max(0, (Date.now() - ms) / 1000); return s < 50 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`; };
const jrDate = ms => { const d = new Date(ms); return `${d.getDate()} ${MON[d.getMonth()]} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const stLabel = st => st.open ? st.label : `${st.label}${st.next ? ` · opens ${fLocal(st.next)}` : ""}`;

/* ---------- FMP calls ---------- */
function qCall(m) { if (m.tv) return ["mcp-tv-get-symbol-data", { symbol: m.tv, columns: TV_QCOLS }]; return m.cls === "stk" ? ["quote", { endpoint: "quote", symbol: m.fmp }] : m.cls === "fut" ? ["commodity", { endpoint: "commodities-quote", symbol: m.fmp }] : ["crypto", { endpoint: "cryptocurrency-quote", symbol: m.fmp }]; }
function hCall(m, days = 400) {
  if (m.tv) return ["mcp-tv-get-ohlcv", { symbol: m.tv, interval: "1D", count: days >= 400 ? 420 : 60, format: "columns" }];
  const from_date = new Date(Date.now() - days * DAYMS).toISOString().slice(0, 10);
  return m.cls === "stk" ? ["chart", { endpoint: "historical-price-eod-full", symbol: m.fmp, from_date }] : m.cls === "fut" ? ["commodity", { endpoint: "commodities-historical-price-eod-full", symbol: m.fmp, from_date }] : ["crypto", { endpoint: "cryptocurrency-historical-price-eod-full", symbol: m.fmp, from_date }];
}
const numv = v => v == null || v === "" || !isFinite(+v) ? null : +v;
function fmpErr(p) { if (typeof p === "string") return p; if (p && !Array.isArray(p) && typeof p === "object") { const s = p["Error Message"] || p.error || p.message; if (s) return String(s); if (p.success === false) return "TradingView couldn't answer"; } return null; }
// TradingView answers: a quote is { data: { close, change, … } }, candles are { bars: { t, o, h, l, c, v } }
function tvDelay(mode) { const k = /delayed\D*(\d+)/.exec(String(mode || "")); return k ? +k[1] : /delayed|endofday/i.test(String(mode || "")) ? 900 : 0; }
function parseQtv(p, m) {
  const x = p && p.data; if (!x || typeof x !== "object") return null; const c = numv(x.close); if (c == null || c <= 0) return null;
  const ch = numv(x.change_abs), delay = tvDelay(x.update_mode), st = mktStatus(m.cls);
  return { p: c, ch, pct: numv(x.change), lo: numv(x.low), hi: numv(x.high), o: numv(x.open), pc: ch != null ? c - ch : null, v: numv(x.volume), yh: numv(x.price_52_week_high), yl: numv(x.price_52_week_low), a50: numv(x.SMA50), a200: numv(x.SMA200), cap: null, ts: st.open ? Date.now() - delay * 1000 : lastClose(m.cls), name: null, delay, mode: String(x.update_mode || "") };
}
function tvBars(p) { const b = p && p.bars; if (!b) return null; if (Array.isArray(b)) return { t: b.map(r => r.t), o: b.map(r => r.o), h: b.map(r => r.h), l: b.map(r => r.l), c: b.map(r => r.c), v: b.map(r => r.v) }; return Array.isArray(b.t) && Array.isArray(b.c) ? b : null; }
function parseHtv(p, m) {
  const b = tvBars(p); if (!b) return null; const H = { d: [], o: [], h: [], l: [], c: [], v: [] };
  for (let i = 0; i < b.t.length; i++) { const c = +b.c[i]; if (!(c > 0)) continue; const ds = sessDay(m, b.t[i] * 1000); if (H.d.length && H.d[H.d.length - 1] >= ds) continue;
    const o = +b.o[i] > 0 ? +b.o[i] : c; H.d.push(ds); H.o.push(o); H.h.push(Math.max(o, c, +b.h[i] || c)); H.l.push(Math.min(o, c, +b.l[i] > 0 ? +b.l[i] : c)); H.c.push(c); H.v.push(+b.v[i] > 0 ? +b.v[i] : 0); }
  H.n = H.d.length; return H.n ? H : null;
}
function parseQ(p) {
  if (!Array.isArray(p) || !p.length || !p[0] || typeof p[0] !== "object") return null;
  const x = p[0], q = { p: numv(x.price), ch: numv(x.change), pct: numv(x.changePercentage != null ? x.changePercentage : x.changesPercentage), lo: numv(x.dayLow), hi: numv(x.dayHigh), o: numv(x.open), pc: numv(x.previousClose), v: numv(x.volume), yh: numv(x.yearHigh), yl: numv(x.yearLow), a50: numv(x.priceAvg50), a200: numv(x.priceAvg200), cap: numv(x.marketCap), ts: numv(x.timestamp) ? numv(x.timestamp) * 1000 : null, name: x.name ? String(x.name) : null };
  if (q.p == null || q.p <= 0) return null;
  if (q.ch == null && q.pc != null) q.ch = q.p - q.pc;
  if (q.pct == null && q.pc) q.pct = q.ch / q.pc * 100;
  return q;
}
function parseH(p) {
  if (!Array.isArray(p)) return null;
  const rows = p.filter(r => r && r.date && isFinite(+r.close) && +r.close > 0).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0), H = { d: [], o: [], h: [], l: [], c: [], v: [] };
  for (const r of rows) {
    const ds = String(r.date).slice(0, 10); if (H.d.length && H.d[H.d.length - 1] === ds) continue;
    const c = +r.close, o = +r.open > 0 ? +r.open : c, h = Math.max(o, c, +r.high > 0 ? +r.high : c), l = Math.min(o, c, +r.low > 0 ? +r.low : c);
    H.d.push(ds); H.o.push(o); H.h.push(h); H.l.push(l); H.c.push(c); H.v.push(+r.volume > 0 ? +r.volume : 0);
  }
  H.n = H.d.length; return H.n ? H : null;
}
const mkQ = k => MK.q[k] || (MK.st !== "ready" && MK.snap.q[k]) || null; // no live price: the one saved on this device, or the owner's shared one
// daily candles with today's candle kept live from the latest quote
function liveBars(k) {
  const rd = shReading(), H = MK.h[k] || MK.s[k] || (rd ? SH.H[k] : null), Q = rd ? mkQ(k) : MK.q[k], m = MKDEF[k]; if (!H) return null;
  const B = { d: H.d.slice(), o: H.o.slice(), h: H.h.slice(), l: H.l.slice(), c: H.c.slice(), v: H.v.slice() };
  if (Q && Q.p != null) {
    const L = B.d.length - 1, tol = Math.max(1e-9, Math.abs(Q.p) * 2e-5), sameOpen = Q.o != null && Math.abs(B.o[L] - Q.o) <= tol;
    const newSess = !sameOpen && Q.pc != null && Math.abs(B.c[L] - Q.pc) <= Math.max(tol, Math.abs(Q.pc) * 1e-4) && Q.ts && sessDay(m, Q.ts) > B.d[L];
    if (newSess) { B.d.push(sessDay(m, Q.ts)); B.o.push(Q.o != null ? Q.o : Q.p); B.h.push(Math.max(Q.hi != null ? Q.hi : Q.p, Q.p)); B.l.push(Math.min(Q.lo != null ? Q.lo : Q.p, Q.p)); B.c.push(Q.p); B.v.push(Q.v || 0); }
    else if (!Q.ts || sessDay(m, Q.ts) >= B.d[L]) {
      if (sameOpen && Q.hi != null && Q.lo != null) { B.h[L] = Math.max(Q.hi, Q.p, B.o[L]); B.l[L] = Math.min(Q.lo, Q.p, B.o[L]); } else { B.h[L] = Math.max(B.h[L], Q.p); B.l[L] = Math.min(B.l[L], Q.p); }
      B.c[L] = Q.p; if (Q.v) B.v[L] = Math.max(B.v[L], Q.v);
    }
  }
  B.n = B.d.length; return B;
}
function atr14(B) { // daily ATR(14) from completed candles
  if (!B || B.n < 3) return null; const end = B.n - 1; let s = 0, k = 0;
  for (let i = Math.max(1, end - 14); i < end; i++) { s += Math.max(B.h[i] - B.l[i], Math.abs(B.h[i] - B.c[i - 1]), Math.abs(B.l[i] - B.c[i - 1])); k++; }
  return k ? s / k : null;
}

/* ---------- the day's FMP allowance ---------- */
const callDay = () => new Date().toISOString().slice(0, 10);
const callsToday = () => ST.mkc && ST.mkc.d === callDay() ? ST.mkc.n : 0;
let saveT = 0; const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 1500); };
function bumpCalls() { const t = callDay(); if (!ST.mkc || ST.mkc.d !== t) ST.mkc = { d: t, n: 0 }; ST.mkc.n++; saveSoon(); }
function mkTier() { if (MK.limit) return 3; const n = callsToday(); return n >= 235 ? 3 : n >= 200 ? 2 : n >= 120 ? 1 : 0; }

/* ---------- connecting and keeping prices current ---------- */
const PAGE_CODES = new Set(["needs_reauth", "server_not_connected", "selection_required", "server_not_found", "not_in_manifest", "blocked_by_policy", "approval_required", "consent_required", "not_granted", "capability_disabled", "capability_removed", "user_changed"]);
function mkBoot() {
  MK.tut = !ST.seenTut; HS();
  try { const s = JSON.parse(localStorage.getItem(SNAPK) || "null"); if (s && s.q && s.sp) MK.snap = s; } catch (e) {}
  mkShow("home");
  let tries = 0;
  const go = () => {
    const c = window.claude;
    if (!c || typeof c.use !== "function") { if (++tries < 40) { setTimeout(go, 250); return; } MK.st = "none"; mkRenderSoon(); return; }
    Promise.resolve(c.use("mcp")).then(ns => { if (!ns) { MK.st = "none"; mkRenderSoon(); return; } MK.mcp = tvGate(ns); mkConnect(); }).catch(() => { MK.st = "none"; mkRenderSoon(); });
  };
  go();
  setInterval(mkTick, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(mkTick, 400); });
}
async function mkConnect() {
  MK.tvLive = !!HS().tvLive; // remembered from the last visit, then confirmed by the first TradingView price
  if (!HS().tvPlanSet && HS().tvPlan) delete HS().tvPlan; // an earlier version guessed the plan from its own (incomplete) count: only the one you pick counts
  if (!MK.mcp) return; MK.st = "wait"; MK.why = null; mkRenderSoon();
  const m = MKDEF.BTC, [tool, input] = qCall(m);
  try { const r = await MK.mcp.callTool(MK_SERVER, tool, input, { cache: { staleTime: 60000, gcTime: WEEK } }); MK.st = "ready"; mkData("q:BTC", m, "q", r); } // the first call is where Claude asks the viewer to allow FMP
  catch (e) { if (PAGE_CODES.has(e && e.code)) { mkPageErr(e); return; } MK.st = "ready"; mkFail("q:BTC", m, "q", e); }
  try { const lt = await MK.mcp.listTools(MK_SERVER); MK.pollOnly = ((lt && lt.servers) || []).some(sv => (sv.tools || []).some(t => t.annotations && t.annotations.readOnlyHint === false)); } catch (e) {}
  mkSync(); mkRenderSoon(); nwMaybeLoad(false);
}
/* ---------- TradingView's connector allows a fixed number of calls a DAY: 10 on Essential, 20 Plus, 50 Premium, 150 Ultimate,
   500 (and 50 a minute) with TradingView's AI add-on. Every call is counted here; background refreshes run only when the plan
   has calls to spare, so most of the day's calls are kept for the questions you ask Quint. ---------- */
const TVQ = { until: 0, slow: 1, hist: [] };
const TV_PLANS = [[10, "Essential"], [20, "Plus"], [50, "Premium"], [150, "Ultimate"], [500, "AI add-on"]];
const tvDay = () => new Date().toISOString().slice(0, 10);
const tvUsed = () => { const d = HS().tvDay; return d && d.d === tvDay() ? d.n : 0; };
const tvPlan = () => +HS().tvPlan || 50;
const tvPlanName = () => HS().tvPlanSet ? (TV_PLANS.find(p => p[0] === tvPlan()) || [0, `${tvPlan()} a day`])[1] : "plan not set";
const tvLeft = () => Math.max(0, tvPlan() - tvUsed());
const tvOut = () => HS().tvOut === tvDay();
const tvBgEvery = () => { const p = tvPlan(); if (tvOut() || tvCooling() || tvLeft() < p * 0.5) return 0; return p >= 500 ? 12e4 : p >= 150 ? 6e5 : 0; };
function tvCount() { const k = tvDay(), d = HS().tvDay; HS().tvDay = d && d.d === k ? { d: k, n: d.n + 1 } : { d: k, n: 1 }; clearTimeout(TVQ.svT); TVQ.svT = setTimeout(save, 800); }
/* ---------- the TradingView call log: every call this app makes, when, what for and why (kept on this phone) ---------- */
const TVL = { last: 0, t0: 0, on: false };
function tvLogInit() { // each app's gate calls this once: remembers when the app opened and when you last touched it
  if (TVL.on || typeof document === "undefined") return; TVL.on = true; TVL.t0 = Date.now();
  for (const ev of ["pointerdown", "keydown"]) document.addEventListener(ev, () => { TVL.last = Date.now(); }, { capture: true, passive: true });
}
const tvApp = () => /Quint Brain/i.test(document.title || "") ? "Quint Brain" : "Chart Wizard";
function tvWhat(tool, i) { // the call in plain words
  i = i || {}; const t = String(tool || "").replace(/^mcp-tv-/, ""), sym = String(i.symbol || "").split(":").pop().replace(/1!$/, ""), tf = i.interval ? (TF_NAME[i.interval] || i.interval) : "";
  return t === "get-symbol-data-batch" ? `Prices for ${(i.symbols || []).length} markets` : t === "get-symbol-data" ? `${sym} price` : t === "get-ohlcv" ? `${sym} ${tf} candles${i.count ? ` (${i.count})` : ""}`
    : t === "get-economic-calendar" ? "US news calendar" : t === "get-news" ? `${sym || "Market"} headlines` : t === "get-news-story" ? "A news story" : t === "get-technicals-rating" ? `${sym} technical rating`
    : t === "run-pine-backtest" ? `${sym} strategy backtest` : t === "validate-pine-script" ? "Checking a Pine Script" : t === "create-pine-script" ? "Saving a Pine Script"
    : t === "create-alert" ? "Setting a phone alert" : t === "delete-alert" ? "Deleting an alert" : t === "get-alerts-log" ? "Alert history" : /alert/.test(t) ? "Your alerts" : t;
}
function tvReason() { // why it happened, judged from what you were doing at that moment
  const now = Date.now(), touched = now - TVL.last < 30e3;
  if (typeof document !== "undefined" && document.hidden) return "with the app in the background";
  if (typeof DK !== "undefined" && DK.busy) return "Quint answering you";
  if (now - TVL.t0 < 45e3 && !touched) return "the app opening";
  if (!touched) return "an automatic refresh";
  const q = typeof QA !== "undefined" && QA && QA.view, s = typeof MK !== "undefined" && MK.screen;
  const where = q ? { brain: "the brain view", console: "the console", matrix: "the matrix", record: "the record", alerts: "alerts" }[q] : s ? { home: "the Markets page", chart: "a live chart", quint: "Quint's screen", news: "the news page", trades: "trades" }[s] : "the trainer";
  return `you, on ${where || "the app"}`;
}
function tvLog() { const h = HS(); if (!Array.isArray(h.tvLog)) h.tvLog = []; return h.tvLog; }
function tvLogAdd(tool, input, st) {
  const L = tvLog(), e = { t: Date.now(), a: tvApp(), w: tvWhat(tool, input), y: tvReason() }; if (st) e.st = st; L.unshift(e);
  const cut = Date.now() - 3 * DAYMS; while (L.length > 150 || (L.length && L[L.length - 1].t < cut)) L.pop();
  clearTimeout(TVQ.lsT); TVQ.lsT = setTimeout(save, 900); return e;
}
function tvUncount() { const d = HS().tvDay; if (d && d.d === tvDay() && d.n > 0) d.n--; }
function tvLogEnd(e, st) { // saved copies and refusals never reached TradingView, so they don't count
  if (!e || e.st) return; e.st = st; if (st === "saved" || st === "refused") tvUncount(); clearTimeout(TVQ.lsT); TVQ.lsT = setTimeout(save, 900);
}
function tvLogHTML() {
  const L = tvLog(), day = ms => new Date(ms).toDateString(), today = day(Date.now()), real = L.filter(e => !e.st || e.st === "error"), nToday = real.filter(e => day(e.t) === today).length;
  if (!L.length) return `<p class="small">No TradingView calls from ${esc(tvApp())} in the last 3 days.</p>`;
  const lab = { saved: "saved copy, free", refused: "refused: cooling down", blocked: "waited: cooling down", error: "failed" };
  let last = "", rows = "";
  for (const e of L.slice(0, 80)) { const d = day(e.t); if (d !== last) { last = d; rows += `<li class="tvlh">${d === today ? "Today" : new Date(e.t).toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })}</li>`; }
    rows += `<li class="${e.st ? "tvl " + e.st : "tvl"}"><span class="tvt num">${new Date(e.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><span class="tvw"><b>${esc(e.w)}</b><small>${esc(e.y)}${e.st ? ` · ${lab[e.st] || e.st}` : ""}</small></span></li>`; }
  return `<p class="small">${esc(tvApp())} made <b>${nToday}</b> TradingView call${nToday === 1 ? "" : "s"} today. Each app keeps its own list on this phone; calls from Claude chats don't show here but count towards the same TradingView allowance.</p><ul class="tvlog">${rows}</ul>`;
}
const tvCooling = () => Date.now() < TVQ.until;
const tvCoolMsg = () => tvOut() ? `TradingView says your connector calls for today are used up. It counts every call on your TradingView account (Chart Wizard, Quint Brain and Claude chats, plus any earlier today), so its total is higher than the ${tvUsed()} this app counted. Quint still answers from the candles saved on this phone, or from a screenshot of your chart.` : `TradingView's connector is cooling down after too many calls. Live prices and Quint's charts come back at ${new Date(TVQ.until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
function tvQuotaHit(e) {
  const s = typeof e === "string" ? e : String((e && (e.message || e.text || e.error)) || ""); if (!/quota|cooldown|cool(ing)? down|TOOL_QUOTA|too many (calls|requests)|usage limit/i.test(s)) return false;
  if (/daily|per day/i.test(s)) HS().tvOut = tvDay(); // the day's calls are gone (TradingView's count, which includes calls this app never saw)
  const m = /(\d+)[\s-]*min/i.exec(s); TVQ.until = Date.now() + (m ? +m[1] + 0.5 : 6) * 6e4; save();
  setTimeout(() => { mkSync(); if (MK.screen === "chart") hcLive(); mkRenderSoon(); }, 0); setTimeout(() => { mkSync(); mkRenderSoon(); }, TVQ.until - Date.now() + 1500); return true;
}
function tvGate(ns) { // the page's own wrapper around the connector namespace (the namespace itself is never changed)
  tvLogInit();
  const call = (srv, tool, input, opt) => { if (srv !== TV_SERVER) return ns.callTool(srv, tool, input, opt);
    if (tvCooling()) { tvLogAdd(tool, input, "blocked"); return Promise.reject({ code: "cooldown", message: tvCoolMsg() }); } const now = Date.now(); TVQ.hist.push(now); TVQ.hist = TVQ.hist.filter(t => now - t < 6e4); tvCount(); const L = tvLogAdd(tool, input);
    return ns.callTool(srv, tool, input, opt).then(r => { if (r && r.cache) tvLogEnd(L, "saved"); const p = r && r.payload; if ((typeof p === "string" && tvQuotaHit(p)) || (p && typeof p === "object" && p.success === false && tvQuotaHit(p.error || p.message))) { tvLogEnd(L, "refused"); throw { code: "cooldown", message: tvCoolMsg() }; } return r; }, e => { if (tvQuotaHit(e)) { tvLogEnd(L, "refused"); throw { code: "cooldown", message: tvCoolMsg() }; } tvLogEnd(L, "error"); throw e; }); };
  return { callTool: call, watchTool: (...a) => ns.watchTool(...a), listTools: (...a) => ns.listTools(...a) };
}
function mkPoller(w) { // used only if FMP's tools say they aren't read-only (watches refuse those): call now if nothing recent, then on the interval, skipping while hidden
  let on = true, tm = 0; const run = () => { if (!on || document.hidden || (w.m.tv && tvCooling())) return; MK.mcp.callTool(srvOf(w.m), w.tool, w.input, { cache: false }).then(r => { if (on) mkData(w.id, w.m, w.kind, r); }, e => { if (on) mkFail(w.id, w.m, w.kind, e); }); };
  const have = w.kind === "q" ? MK.q[w.m.k] : w.kind === "s" ? MK.s[w.m.k] : MK.h[w.m.k]; if (!have || Date.now() - (have.at || 0) >= w.stale) setTimeout(run, 50);
  if (w.iv) tm = setInterval(run, Math.max(w.m.tv ? 12000 : 30000, w.iv));
  return () => { on = false; clearInterval(tm); };
}
function mkPageErr(e) { MK.st = "err"; MK.why = (e && e.code) || "upstream_error"; MK.whyMsg = String(e && e.message || ""); MK.q = {}; MK.h = {}; MK.s = {}; mkSync(); mkRenderSoon(); }
function quoteWant(m, base, add) {
  const st = mktStatus(m.cls), T = m.tv ? 0 : mkTier(); let iv = T >= 3 ? 0 : base[T] || 0; if (!st.open) iv = 0; if (m.tv) iv = st.open ? tvBgEvery() / 1000 : 0; // TradingView counts calls per day: refreshed in the background only when the plan has calls to spare
  add(m, "q", iv * 1000, iv ? Math.max(25000, iv * 1000 - 5000) : st.open ? 30 * 6e4 : 6 * 36e5);
}
function mkWanted() {
  const out = {}; if (MK.st !== "ready" || !MK.mcp) return out;
  const add = (m, kind, iv, stale) => { const id = kind + ":" + m.k; if (MK.locked[id] || MK.locked["q:" + m.k] || out[id]) return; const [tool, input] = kind === "q" ? qCall(m) : hCall(m, kind === "s" ? 50 : 400); out[id] = { id, m, kind, tool, input, iv, stale, sig: JSON.stringify([tool, input, iv, stale]) }; };
  const live = HS().live !== false, open = lvOpenList(), slow = Math.max(1, open.length / 2), onScr = MK.screen === "chart" ? lvPosFor(MK.sel) : null;
  if (onScr && lvMkt(onScr)) quoteWant(lvMkt(onScr), [90, 180, 300, 0], add); // the trade on screen refreshes fastest
  for (const P of open) { const m = lvMkt(P); if (!m) continue; quoteWant(m, [90, 180, 300, 0].map(x => Math.round(x * slow)), add); add(m, "h", 0, 6 * 36e5); } // every open trade is always watched; with several, each a little less often so the day's FMP calls last
  if (MK.screen === "chart" && MKDEF[MK.sel]) { const m = MKDEF[MK.sel]; quoteWant(m, live ? [120, 360, 0, 0] : [0, 0, 0, 0], add); add(m, "h", 0, 6 * 36e5); }
  if (MK.screen === "quint" && typeof DK !== "undefined" && MKDEF[DK.k]) { const m = MKDEF[DK.k]; quoteWant(m, live ? [120, 360, 0, 0] : [0, 0, 0, 0], add); if (!m.tv) add(m, "h", 0, 6 * 36e5); }
  const sc = Math.max(1, (mkBoard().filter(m => !m.tv).length - 1) / 12); // a longer board refreshes a little less often, so the day's FMP calls still last
  if (MK.screen === "home") {
    const tvs = mkBoard().filter(m => m.tv && !MK.locked["q:" + m.k]), fo = mktStatus("fut").open, shown = futShown();
    if (tvs.length) { const iv = live && fo ? tvBgEvery() : 0, input = { symbols: tvs.map(m => m.tv), columns: TV_QCOLS }; out["qb:tv"] = { id: "qb:tv", m: TVB, kind: "qb", tool: "mcp-tv-get-symbol-data-batch", input, iv, stale: iv ? iv - 3000 : 30 * 6e4, sig: JSON.stringify([input, iv]) }; }
    for (const m of mkBoard()) { if (m.tv) { if (!MK.h[m.k] && (m.k === HERO_K || (tvPlan() >= 150 && shown.includes(m.k)))) add(m, "s", 0, 6 * 36e5); continue; } if (m.k === "BTC" && !btcShown()) continue; quoteWant(m, live ? (m.cls === "crypto" ? [180, 540, 0, 0] : [Math.round(900 * sc), Math.round(2700 * sc), 0, 0]) : [0, 0, 0, 0], add); if (!MK.h[m.k]) add(m, "s", 0, 6 * 36e5); }
  }
  return out;
}
function mkSync() {
  const want = mkWanted();
  for (const id of Object.keys(MK.W)) if (!want[id] || want[id].sig !== MK.W[id].sig) { try { MK.W[id].un(); } catch (e) {} delete MK.W[id]; }
  for (const id of Object.keys(want)) if (!MK.W[id]) {
    const w = want[id], opts = { cache: { staleTime: w.stale, gcTime: WEEK } }; if (w.iv) opts.refetchInterval = w.iv;
    const rec = { sig: w.sig, un: () => {} }; MK.W[id] = rec;
    try { rec.un = MK.pollOnly || w.m.tv ? mkPoller(w) : MK.mcp.watchTool(MK_SERVER, w.tool, w.input, ev => { if (MK.W[id] === rec) mkEv(w, ev); }, opts); } catch (e) { MK.err[id] = { code: "bad_request", message: String(e && e.message || e) }; }
  }
}
function mkEv(w, ev) { if (!ev) return; if (ev.type === "data") mkData(w.id, w.m, w.kind, ev.result); else if (ev.type === "error") mkFail(w.id, w.m, w.kind, ev.error); }
function mkData(id, m, kind, r) {
  if (kind === "qb") { const d = r && r.payload && r.payload.data; if (!d || typeof d !== "object") { mkFail(id, m, kind, { code: "tool_error", message: fmpErr(r && r.payload) || "no data" }); return; }
    for (const x of mkBoard()) if (x.tv && d[x.tv]) mkData("q:" + x.k, x, "q", { payload: { data: d[x.tv] }, cache: r.cache }); return; }
  const p = r && r.payload, em = fmpErr(p);
  if (em) { mkFail(id, m, kind, { code: "tool_error", message: em }); return; }
  const x = m.tv ? (kind === "q" ? parseQtv(p, m) : parseHtv(p, m)) : kind === "q" ? parseQ(p) : parseH(p);
  if (!x) { mkFail(id, m, kind, { code: "tool_error", message: `no data for ${m.fmp}` }); return; }
  if (m.tv && kind === "q" && x.mode) { const lv = !x.delay && /stream/i.test(x.mode); if (lv !== MK.tvLive) { MK.tvLive = lv; HS().tvLive = lv; save(); setTimeout(() => { mkSync(); if (MK.screen === "chart") hcLive(); }, 0); } }
  const fp = kind === "q" ? `${x.ts}|${x.p}|${x.v}` : `${x.n}|${x.d[x.n - 1]}|${x.c[x.n - 1]}|${x.v[x.n - 1]}`;
  if (!m.tv && !(r && r.cache) && MK.fp[id] !== fp) bumpCalls(); // count each new FMP answer once
  MK.fp[id] = fp; x.at = r && r.cache && r.cache.storedAt ? r.cache.storedAt : Date.now(); MK.err[id] = null; MK.limit = false;
  if (kind === "q") { const o = MK.q[m.k]; MK.q[m.k] = x; if (o && o.p !== x.p) MK.flash[m.k] = x.p > o.p ? 1 : -1; if (m.cls === "stk" && !STK_NAME[m.fmp] && x.name) m.name = x.name.replace(/,? (Inc|Corp|Corporation|Ltd|Limited|plc|Co|Company|Holdings|Group)\.?$/i, "").slice(0, 22); }
  else if (kind === "s") MK.s[m.k] = x; else MK.h[m.k] = x;
  mkSnapSoon(); mkRenderSoon(); lvOnData(m.k); shQueue();
}
function mkFail(id, m, kind, e) {
  const code = (e && e.code) || "upstream_error", msg = String(e && e.message || "");
  if (kind === "qb") { for (const x of mkBoard()) if (x.tv) mkFail("q:" + x.k, x, "q", e); return; }
  if (m && m.tv && (PAGE_CODES.has(code) || code === "server_unavailable")) { MK.err[id] = { code: "tool_error", message: "This market needs your TradingView connector. Add or reconnect it in claude.ai → Settings → Connectors, then reload." }; if (PAGE_CODES.has(code)) MK.locked[id] = true; mkRenderSoon(); return; }
  if (PAGE_CODES.has(code)) { mkPageErr(e); return; }
  MK.err[id] = { code, message: msg };
  if (code === "tool_error" && /access denied|higher plan|upgrade/i.test(msg)) { MK.locked[id] = true; setTimeout(mkSync, 0); }
  if (/limit reach|limit reached|daily limit|too many requests/i.test(msg)) MK.limit = true;
  mkRenderSoon();
}
function errText(e) {
  const c = e && e.code, s = String(e && e.message || "");
  const T = { needs_reauth: "FMP needs reconnecting: claude.ai → Settings → Connectors.", server_not_connected: "Add the FMP connector in claude.ai → Settings → Connectors.", server_not_found: "The FMP connector couldn't be found. Add it again in claude.ai → Settings → Connectors.", selection_required: "Choose which FMP connector to use when Claude asks.", server_unavailable: "FMP isn't answering right now. Try again in a minute.", not_in_manifest: "FMP isn't allowed for this page yet.", blocked_by_policy: "Your organisation's settings block FMP here.", approval_required: "FMP needs your approval for this page.", consent_required: "FMP needs your approval for this page.", rate_limited: "Too many requests just now. Try again in a few seconds.", cancelled: "The request was cancelled.", not_granted: "Live prices can't run in this view.", capability_disabled: "Live prices can't run in this view.", capability_removed: "Live prices can't run in this view.", user_changed: "You signed in as someone else. Reload the page." };
  if (T[c]) return T[c];
  if (c === "tool_error") return /access denied|higher plan|upgrade/i.test(s) ? "Needs a paid FMP plan." : /limit/i.test(s) ? "FMP's daily limit is used up." : "FMP: " + s.replace(/\s+/g, " ").slice(0, 90);
  return "Couldn't reach FMP. Try again shortly.";
}
async function mkRefresh(keys) {
  if (MK.st !== "ready") { if (MK.mcp && MK.st === "err") mkConnect(); return; }
  const all = keys.map(k => MKDEF[k]).filter(m => m && !MK.locked["q:" + m.k]), noFmp = mkTier() >= 3;
  if (noFmp && !all.some(m => m.tv)) { hmToast("Today's FMP calls are nearly used up, so refreshing is paused until tomorrow."); return; }
  if (Date.now() - MK.manualAt < 45000) { hmToast("Prices were just refreshed. Try again in a moment."); return; }
  MK.manualAt = Date.now(); const ms = all.filter(m => !m.tv && !noFmp), tvs = all.filter(m => m.tv);
  document.body.classList.add("mkbusy"); mkRenderSoon();
  const tvb = tvs.length > 1 ? MK.mcp.callTool(TV_SERVER, "mcp-tv-get-symbol-data-batch", { symbols: tvs.map(m => m.tv), columns: TV_QCOLS }, { cache: { staleTime: 0, gcTime: WEEK, refresh: true } }).then(r => mkData("qb:tv", TVB, "qb", r), e => mkFail("qb:tv", TVB, "qb", e)) : null;
  await Promise.all(ms.concat(tvs.length === 1 ? tvs : []).map(m => { const [tool, input] = qCall(m); return MK.mcp.callTool(srvOf(m), tool, input, { cache: { staleTime: 0, gcTime: WEEK, refresh: true } }).then(r => mkData("q:" + m.k, m, "q", r), e => mkFail("q:" + m.k, m, "q", e)); }).concat(tvb ? [tvb] : []));
  document.body.classList.remove("mkbusy"); mkRenderSoon();
}
async function mkFresh(m) { // a price to fill an order at: reuses one fetched in the last 15 seconds
  const [tool, input] = qCall(m), r = await MK.mcp.callTool(srvOf(m), tool, input, { cache: { staleTime: 15000, gcTime: WEEK } });
  mkData("q:" + m.k, m, "q", r); return MK.q[m.k] || null;
}
function mkCloseRefresh() { // one call after each close, so the board shows the closing price
  if (MK.st !== "ready" || mkTier() >= 2) return;
  const keys = MK.screen === "home" ? mkBoard().map(m => m.k) : MK.screen === "chart" ? [MK.sel] : [];
  for (const k of keys) {
    const m = MKDEF[k]; if (!m || m.cls === "crypto" || m.tv || MK.locked["q:" + k]) continue; // TradingView prices come from the batch or the chart's own refresh
    const lc = lastClose(m.cls), Q = MK.q[k]; if (!Q || !Q.ts || Q.ts >= lc - 60000 || MK.closeDone[k] === lc || Date.now() - lc < 3 * 6e4 || mktStatus(m.cls).open) continue;
    MK.closeDone[k] = lc; const [tool, input] = qCall(m);
    MK.mcp.callTool(srvOf(m), tool, input, { cache: { staleTime: 0, gcTime: WEEK, refresh: true } }).then(r => mkData("q:" + k, m, "q", r), e => mkFail("q:" + k, m, "q", e));
  }
}
function mkTick() { if (document.hidden) return; mkSync(); mkCloseRefresh(); nwTick(); mkRenderSoon(); if (lvPos()) lvCheck(); }
const SNAPK = "chart-wizard-markets-v1";
let snapT = 0;
function mkSnapSoon() { clearTimeout(snapT); snapT = setTimeout(() => { try { const q = Object.assign({}, MK.snap.q), sp = Object.assign({}, MK.snap.sp); for (const m of mkBoard()) { if (MK.q[m.k]) q[m.k] = MK.q[m.k]; const H = MK.h[m.k] || MK.s[m.k]; if (H) sp[m.k] = H.c.slice(-30); } MK.snap = { q, sp, at: Date.now() }; localStorage.setItem(SNAPK, JSON.stringify(MK.snap)); } catch (e) {} }, 2000); }

/* ---------- screens ---------- */
function mkShow(scr, key) {
  MK.screen = scr || null; if (key) MK.sel = key;
  const el = $("#home"); el.classList.toggle("open", !!scr);
  if (scr) { pauseTimer(); if (typeof RP !== "undefined" && RP.playing) { RP.playing = false; try { rpPanel(); } catch (e) {} } closePops(); }
  else { resumeTimer(); chart.req(); }
  $("#hmHome").hidden = scr !== "home"; $("#hmChart").hidden = scr !== "chart"; $("#hmNews").hidden = scr !== "news"; $("#hmTrades").hidden = scr !== "trades"; $("#hmQuint").hidden = scr !== "quint";
  if (scr !== "chart" && HC.chart) { HC.chart.destroy(); HC.chart = null; $("#hmChart").innerHTML = ""; }
  if (scr !== "chart") { clearInterval(HC.ibT); HC.ibT = 0; if (typeof dkLeave === "function") dkLeave(); }
  if (scr === "quint") qsOpen(); else qsLeave(); if (scr !== "chart") MK.qsBack = false; tabSync(); // after the chart (and its dock) are gone, so the ids are Quint's own
  if (scr === "home") { mkBuildHome(); $("#hmHome").scrollTop = MK.homeY || 0; }
  if (scr === "chart") hcOpen();
  if (scr === "news") nwOpen(); else { nwLeave(); $("#hmNews").innerHTML = ""; if (scr !== "chart") NW.back = false; }
  if (scr === "trades") ltOpen(); else { $("#hmTrades").innerHTML = ""; if (scr !== "chart") LT.back = false; }
  mkSync();
  if (!scr && MK.tut) { MK.tut = false; setTimeout(() => { if (MK.screen) MK.tut = true; else if (!ST.seenTut) openTut(0); }, 250); } // the tour waits until the trainer is actually on screen
}
function openHome() { closeNav(); if ($("#scrim").classList.contains("open")) closeSheet(); mkShow("home"); }
function openQuint() { closeNav(); if ($("#scrim").classList.contains("open")) closeSheet(); if (MK.screen === "home") MK.homeY = $("#hmHome").scrollTop; mkShow("quint"); }
/* ---------- the tab bar: Markets · Quint · Trades · News · Train ---------- */
const TABS = [["home", "📡", "Markets"], ["quint", "", "Quint"], ["learn", "🏆", "Learn"], ["trades", "💼", "Trades"], ["news", "📰", "News"]];
function tabSync() {
  const el = $("#hmTabs"); if (!el) return; const on = ["home", "quint", "trades", "news"].includes(MK.screen); el.hidden = !on; if (!on) return;
  if (!el.firstChild) { el.innerHTML = TABS.map(([k, ic, l]) => `<button type="button" data-tab="${k}">${k === "quint" ? `<span class="qorb" aria-hidden="true"><s></s><s></s><i></i></span>` : `<i aria-hidden="true">${ic}</i>`}<span>${l}</span>${k === "trades" || k === "news" ? `<b class="tbadge" hidden></b>` : ""}</button>`).join(""); el.onclick = e => { const b = e.target.closest("[data-tab]"); if (!b) return; tabGo(b.dataset.tab); }; }
  $$("[data-tab]", el).forEach(b => { if (b.dataset.tab === MK.screen) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  const o = lvOpenList().length, nn = typeof nwUnseen === "function" ? nwUnseen() : 0, bt = $('[data-tab="trades"] .tbadge', el), bn = $('[data-tab="news"] .tbadge', el);
  if (bt) { bt.hidden = !o; bt.textContent = o; } if (bn) { bn.hidden = !nn || MK.screen === "news"; bn.textContent = nn > 9 ? "9+" : nn; }
}
function tabGo(k) {
  if (k === MK.screen) { const r = $({ home: "#hmHome", news: "#hmNews", trades: "#hmTrades", quint: "#qdkB" }[k]); if (r) r.scrollTo({ top: k === "quint" ? r.scrollHeight : 0, behavior: "smooth" }); return; }
  if (MK.screen === "home") MK.homeY = $("#hmHome").scrollTop;
  if (k === "learn") { openBest(); return; } if (k === "train") { mkShow(null); return; } mkShow(k);
}
function mkOpen(k) { if (!MKDEF[k]) return; if (MK.screen === "home") MK.homeY = $("#hmHome").scrollTop; mkShow("chart", k); }
function mkKey(e) { if (e.key === "Escape" && MK.screen === "quint") { if (document.activeElement && document.activeElement.id === "qdkI") return; e.preventDefault(); mkShow("home"); return; } if (e.key === "Escape" && (MK.screen === "chart" || MK.screen === "news" || MK.screen === "trades")) { e.preventDefault(); mkShow(MK.screen === "chart" && MK.qsBack ? "quint" : MK.screen === "chart" && NW.back ? "news" : MK.screen === "chart" && LT.back ? "trades" : "home"); } }
let rendT = 0;
function mkRenderSoon() { shSync(); if (rendT) return; rendT = requestAnimationFrame(() => { rendT = 0; try { if (MK.screen === "home") mkPaintHome(); else if (MK.screen === "chart") { hcPaint(); lvLive(); } else if (MK.screen === "news") nwPaint(); else if (MK.screen === "trades") ltPaint(); else if (MK.screen === "quint") { dkHead(); dkGrade(false); } tabSync(); } catch (e) { console.error("markets", e); } }); }
let toastHT = 0;
function hmToast(msg) { const t = $("#hmtoast"); if (!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(toastHT); toastHT = setTimeout(() => t.classList.remove("show"), 3200); }
function lvNotify(msg) { if (MK.screen) hmToast(msg); else toast(msg); }
const fpx = (m, x) => x == null ? "—" : fp(mkSpec(m), x);
const fchg = (m, Q) => Q && Q.ch != null ? `${Q.ch >= 0 ? "+" : "−"}${fnum(mkSpec(m), Math.abs(Q.ch))} · ${fpct(Q.pct || 0, 2)}` : "";
function sparkPts(vals, w, h, pad = 3) {
  const lo = Math.min(...vals), hi = Math.max(...vals), r = hi - lo || 1, X = i => pad + i / (vals.length - 1) * (w - pad * 2), Y = v => h - pad - (v - lo) / r * (h - pad * 2);
  return vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
}
function sparkHTML(k, w, h, n) {
  const B = liveBars(k), vals = B ? B.c.slice(-n) : (MK.snap.sp[k] || null);
  if (!vals || vals.length < 2) return `<svg class="msp" viewBox="0 0 ${w} ${h}" aria-hidden="true"></svg>`;
  const up = vals[vals.length - 1] >= vals[0], col = up ? C.up : C.down, pts = sparkPts(vals, w, h), gid = "sg" + k.replace(/\W/g, "") + w;
  return `<svg class="msp" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".32"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><polygon points="3,${h} ${pts} ${w - 3},${h}" fill="url(#${gid})"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}
function ageText(m, Q, e) {
  if (e && !Q) return errText(e);
  if (!Q) return MK.st === "err" ? "Not connected" : "Loading…";
  const bits = []; if (Q.ts) bits.push(`price from ${fLocal(Q.ts)}`); if (Q.delay && mktStatus(m.cls).open) bits.push(`${Math.round(Q.delay / 60)} min delayed`); else if (m.tv && !Q.delay && /stream/i.test(Q.mode || "") && mktStatus(m.cls).open) bits.push("● real-time");
  if (e && e.code !== "tool_error") bits.push("couldn't refresh"); else if (!MK.q[m.k]) bits.push(shReading() && SH.at ? "shared feed" : "saved earlier");
  return bits.join(" · ") || "";
}

/* ---------- home page ---------- */
function mkBuildHome() {
  const root = $("#hmHome");
  root.innerHTML = `<header class="hmh"><button class="tbtn" id="hmNav" aria-label="Menu">☰</button><div class="hmbrand"><span>${hexIcon(rankOf(ST.xp) + 1, 30)}</span><span><b>Chart Wizard</b><small>Live markets</small></span></div><span class="spacer"></span><button class="tbtn" id="hmRef" aria-label="Refresh prices">⟳</button></header>
    <div class="hmwrap">
      <div class="hmstat" id="hmStat"></div><div id="hmSess"></div><div id="hmBan"></div><div id="hmLucid"></div><div id="hmAcct"></div><div id="hmQT"></div><div id="hmLT"></div><div id="hmHero"></div>
      <section class="hmsec" aria-label="Futures"><h2>Futures <span class="mkst" id="hmFutSt"></span><span class="spacer"></span><span class="small dim" id="hmFutN"></span></h2><div class="chips fgrp" id="hmFutG" role="tablist" aria-label="Futures groups">${FUT_G.map(([k, l]) => `<button class="chip" data-fg="${k}" aria-pressed="${futGrp() === k}">${l}</button>`).join("")}</div><div class="mkgrid" id="hmFut"></div><p class="small dim" style="margin:0" id="hmFutNote">Tap a market for its live chart, Quint and paper trading.</p></section>
      <section class="hmsec" aria-label="News"><h2>News <span class="mkst" id="hmNewsSt">live headlines</span><span class="spacer"></span><button class="chip" id="hmNewsAll">All news ▸</button></h2><div id="hmNewsBox"></div></section>
      <section class="hmsec" aria-label="US stocks"><h2>US stocks <span class="mkst" id="hmStkSt"></span><span class="spacer"></span><button class="chip" id="hmEdit" aria-pressed="${MK.edit}">${MK.edit ? "Done" : "Edit"}</button></h2><div class="mkgrid" id="hmStk"></div><div id="hmAdd"></div></section>
      <footer class="hmfoot"><p>Futures from TradingView, stocks and Bitcoin from FMP (250 calls a day on the free plan). Paper trading only: no real orders are placed. Not financial advice.</p></footer>
    </div>`;
  $("#hmNav", root).onclick = openNav;
  $("#hmRef", root).onclick = () => mkRefresh(mkBoard().map(m => m.k));
  $("#hmEdit", root).onclick = () => { MK.edit = !MK.edit; MK.adding = false; $("#hmEdit", root).textContent = MK.edit ? "Done" : "Edit"; $("#hmEdit", root).setAttribute("aria-pressed", MK.edit); $("#hmStk", root).innerHTML = ""; mkPaintHome(); };
  root.addEventListener("click", e => {
    const qt = e.target.closest("[data-qt]"); if (qt) { qtGo(qt.dataset.qt); return; }
    const fg = e.target.closest("[data-fg]"); if (fg) { HS().fg = fg.dataset.fg; save(); $$("#hmFutG .chip").forEach(b => b.setAttribute("aria-pressed", b === fg)); mkPaintHome(); mkSync(); return; }
    if (e.target.closest("[data-lt]")) { MK.homeY = $("#hmHome").scrollTop; mkShow("trades"); return; }
    const nw = e.target.closest("[data-nw]"); if (nw || e.target.closest("#hmNewsAll")) { MK.homeY = $("#hmHome").scrollTop; if (nw) NW.focus = nw.dataset.nw; mkShow("news"); return; }
    const rm = e.target.closest("[data-rm]"); if (rm) { const t = rm.dataset.rm, h = HS(); h.stocks = h.stocks.filter(x => x !== t); save(); $("#hmStk").innerHTML = ""; mkPaintHome(); mkSync(); return; }
    const t = e.target.closest("[data-k]"); if (t && !(MK.edit && t.closest("#hmStk"))) { mkOpen(t.dataset.k); return; }
    if (e.target.closest("#hmAddT")) { MK.adding = true; mkPaintAdd(); const i = $("#hmAddI"); if (i) i.focus(); return; }
    if (e.target.closest("#hmLive")) { const h = HS(); h.live = !h.live; save(); mkSync(); mkPaintHome(); return; }
    if (e.target.closest("#hmProf")) { openProfile(); return; }
    if (e.target.closest("#hmRetry")) { mkConnect(); return; }
  });
  mkPaintHome();
}
function mkPaintHome() {
  if (MK.screen !== "home" || !$("#hmStat")) return;
  const now = Date.now(), n = callsToday(), T = mkTier(), live = HS().live !== false;
  const last = Math.max(0, ...Object.values(MK.q).map(q => q.at || 0));
  const shd = shReading() && SH.at && !SH.empty, shLoad = MK.st !== "ready" && (SH.st === "wait" || (shReading() && !SH.got && !SH.slow));
  const dot = MK.st === "ready" ? (T >= 2 || !live ? "warn" : "on") : shd ? (now - SH.at < 15 * 6e4 ? "on" : "warn") : MK.st === "wait" || shLoad ? "warn" : "off";
  const word = MK.st === "ready" ? (T >= 3 ? "PAUSED" : live ? "LIVE" : "MANUAL") : shd ? "SHARED" : MK.st === "wait" ? "CONNECTING" : shLoad ? "LOADING" : "OFFLINE";
  $("#hmStat").innerHTML = `<span class="ldot ${dot}"><i></i>${word}</span>${MK.st === "ready" && last ? `<span>Updated ${fLocal(last)}</span>` : shd ? `<span>Owner's feed · updated ${fLocal(SH.at)} (${fAgo(SH.at)})</span>` : MK.st !== "ready" && MK.snap.at ? `<span>Showing prices saved ${fLocal(MK.snap.at)}</span>` : ""}
    ${MK.st === "none" ? "" : `<span class="budget" title="FMP calls this app has made today. The free plan allows 250 a day in total.">FMP <span class="bar"><i style="width:${clamp(n / 250 * 100, 0, 100)}%"></i></span> ~${n}/250 today</span>
    <button class="sw2" id="hmLive" aria-pressed="${live}"><span class="k"></span>Auto-refresh</button>`}`;
  $("#hmBan").innerHTML = mkBanner();
  mkPaintAcct(); ltPaintHome(); qtPaintHome(); if (typeof hudPaint === "function") { hudPaint(); lgPaint(); }
  const hero = $("#hmHero"), mb = MKDEF[HERO_K];
  if (!hero.firstChild) hero.innerHTML = `<button class="hero" data-k="${HERO_K}" aria-label="${esc(mb.name)}: open the live chart"></button>`;
  const hb = hero.firstChild; hb.innerHTML = heroInner(mb); mkFlash(hb, HERO_K); if (typeof landMount === "function") landMount(hero, HERO_K);
  const fs = mktStatus("fut", now), ss = mktStatus("stk", now);
  $("#hmFutSt").className = "mkst " + fs.cls; $("#hmFutSt").textContent = stLabel(fs);
  $("#hmStkSt").className = "mkst " + ss.cls; $("#hmStkSt").textContent = stLabel(ss);
  mkPaintGrid($("#hmFut"), futShown().map(k => MKDEF[k]).concat(btcShown() ? [MKDEF.BTC] : []), false);
  const fn = $("#hmFutNote"); if (fn) fn.textContent = MK.tvLive ? "● Real-time CME data from your TradingView. Tap a market for its live chart, Quint and paper trading." : "Tap a market for its live chart, Quint and paper trading. TradingView futures run about 10 minutes behind without real-time CME data.";
  { const n = $("#hmFutN"); if (n) { const up = FUT_KEYS.filter(k => MK.q[k] && MK.q[k].ch > 0).length, have = FUT_KEYS.filter(k => MK.q[k]).length; n.textContent = have ? `${up} of ${have} up today` : ""; } }
  mkPaintGrid($("#hmStk"), mkStocks().map(stkDef), !shReading());
  { const ed = $("#hmEdit"), rf = $("#hmRef"), ad = $("#hmAddT"); if (ed) ed.hidden = shReading(); if (rf) rf.hidden = MK.st === "none"; if (ad && shReading()) ad.remove(); }
  mkPaintAdd(); nwPaintHome();
  const rb = $("#hmRef"); if (rb) rb.disabled = document.body.classList.contains("mkbusy");
}
function mkBanner() {
  const btn = (id, l) => `<button class="btn" id="${id}">${l}</button>`, n = callsToday(), T = mkTier();
  if (MK.st === "none") return shBanner();
  if (tvCooling()) return `<div class="hmban"><span><b>TradingView is cooling down.</b> ${esc(tvCoolMsg())} The app now refreshes more slowly so it stays under the limit.</span></div>`;
  if (MK.st === "err") {
    const c = MK.why, allow = ["not_in_manifest", "approval_required", "consent_required"].includes(c), retry = ["server_not_connected", "server_not_found", "needs_reauth", "selection_required"].includes(c);
    const txt = allow ? "<b>FMP isn't allowed for this page yet.</b> Tap Allow FMP, then choose Allow when Claude asks." : c === "needs_reauth" ? "<b>FMP needs reconnecting.</b> Go to claude.ai → Settings → Connectors → FMP, then tap Try again." : c === "server_not_connected" || c === "server_not_found" ? "<b>The FMP connector isn't connected.</b> Add it in claude.ai → Settings → Connectors, then tap Try again." : c === "selection_required" ? "<b>You have more than one FMP connector.</b> Pick one when Claude asks, then tap Try again." : c === "blocked_by_policy" ? "<b>Your organisation's settings block FMP here.</b>" : c === "user_changed" ? "<b>You're signed in as someone else now.</b> Reload the page." : "<b>Live prices can't run in this view.</b> Open Chart Wizard from Claude to see them.";
    return `<div class="hmban bad"><span>${txt}${shReading() && SH.at && !SH.empty ? ` Meanwhile you're seeing the prices shared by the owner's page at ${fLocal(SH.at)}.` : ""}</span>${allow ? btn("hmRetry", "Allow FMP") : retry ? btn("hmRetry", "Try again") : ""}</div>`;
  }
  if (MK.st !== "ready") return "";
  if (T >= 3) return `<div class="hmban bad"><span><b>${MK.limit ? "FMP's daily limit has been reached." : `About ${n} of today's 250 FMP calls are used.`}</b> Automatic refreshing is off until tomorrow so your open trade can still be settled when prices return.</span></div>`;
  if (T === 2) return `<div class="hmban"><span><b>About ${n} of today's 250 FMP calls are used</b>, so prices only refresh when you tap ⟳. An open trade is still checked every few minutes.</span></div>`;
  if (T === 1) return `<div class="hmban info"><span><b>Saving calls:</b> about ${n} of today's 250 are used, so prices refresh more slowly.</span></div>`;
  const qs = mkBoard().map(m => MK.err["q:" + m.k]).filter(Boolean), tr = qs.filter(e => e.code === "server_unavailable" || e.code === "upstream_error");
  if (tr.length >= 3) return `<div class="hmban"><span><b>FMP isn't answering right now.</b> Showing the last prices; they'll update when it's back.</span></div>`;
  return "";
}
function mkPaintAcct() {
  const el = $("#hmAcct"); if (!el) return; const pr = lvProp();
  let pos = `<span class="small dim" style="flex:1">No open trades</span>`;
  if (pr.length) { const v = pr.reduce((a, P) => a + lvUPL(P), 0);
    pos = `<span class="ldot on"><i></i>${pr.length} OPEN</span><span style="flex:1">open P&amp;L <b class="num ${toneOf(Math.abs(v) < 0.5 ? 0 : v)}">${fusd(Math.abs(v) < 0.5 ? 0 : v)}</b></span>`; }
  el.innerHTML = `<div class="hmacct"><span>${hexIcon(rankOf(ST.xp) + 1, 34)}</span><span class="at"><small>${esc(acctLabel())} · paper account</small><b>${fbal(ST.bal)}</b></span><span class="ar"><small>Room to loss limit</small><b>${ST.acct.stage === "live" ? fbal(ST.bal) : fbal(roomLeft())}</b></span><div class="apos">${pos}<button class="chip" id="hmProf">Account ▸</button></div></div>`;
}
function heroInner(m) {
  const Q = mkQ(m.k), e = MK.err["q:" + m.k], S = mkSpec(m), up = Q && Q.ch >= 0, st = mktStatus(m.cls);
  const rng = Q && Q.lo != null && Q.hi != null && Q.hi > Q.lo ? `<div class="drng"><span>${fnum(S, Q.lo)}</span><span class="rb" aria-hidden="true"><i style="left:${clamp((Q.p - Q.lo) / (Q.hi - Q.lo) * 100, 0, 100)}%"></i></span><span>${fnum(S, Q.hi)}</span></div>` : "";
  return `<div class="mt"><span class="mlogo ${m.cls === "crypto" ? "btc" : ""} l${Math.min(4, m.logo.length)}">${esc(m.logo)}</span><span class="mnm"><b>${esc(m.name)}</b><small>${esc(m.k)} · your main market</small></span><span class="mkst ${st.cls}">${esc(stLabel(st))}</span></div>
    <div class="mpx">${Q ? fpx(m, Q.p) : `<span class="sk" style="width:180px"></span>`}</div><div class="mch ${Q ? (up ? "pos" : "neg") : ""}">${Q ? fchg(m, Q) : ""}<br><span class="small">today</span></div>
    ${sparkHTML(m.k, 600, 76, 60)}${rng}<div class="hrow"><span>${esc(ageText(m, Q, e))}</span><span class="hgo">Chart &amp; trade ▸</span></div>`;
}
function tileInner(m, editing) {
  const Q = mkQ(m.k), e = MK.err["q:" + m.k], locked = MK.locked["q:" + m.k], up = Q && Q.ch >= 0;
  const head = `<div class="mt"><span class="mlogo ${m.cls === "stk" ? "stk" : ""} l${Math.min(4, m.logo.length)}">${esc(m.logo)}</span><span class="mnm"><b>${esc(m.cls === "stk" ? m.fmp : m.k)}</b><small>${esc(m.name)}</small></span></div>${m.trade && !editing ? `<span class="tradeok" aria-hidden="true">TRADE</span>` : ""}${editing ? `<button class="rm" data-rm="${esc(m.fmp)}" aria-label="Remove ${esc(m.fmp)}">✕</button>` : ""}`;
  if (locked || (e && !Q)) return `${head}<div class="mpx">${esc(m.tv ? "Needs your TradingView connector" : locked ? "Needs a paid FMP plan" : errText(e))}</div>`;
  const nn = editing ? 0 : nwCount(m);
  return `${head}${nn ? `<span class="nwdot" title="${nn} recent headline${nn === 1 ? "" : "s"}">NEWS ${nn}</span>` : ""}<div class="mpx">${Q ? fpx(m, Q.p) : `<span class="sk" style="width:96px"></span>`}</div><div class="mch ${Q ? (up ? "pos" : "neg") : ""}">${Q ? fchg(m, Q) : `<span class="sk" style="width:70px"></span>`}</div>${m.tv && !liveBars(m.k) && !MK.snap.sp[m.k] && Q && Q.hi > Q.lo ? `<div class="drng tile" aria-label="Today's range"><span>L</span><span class="rb" aria-hidden="true"><i style="left:${clamp((Q.p - Q.lo) / (Q.hi - Q.lo) * 100, 0, 100)}%"></i></span><span>H</span></div>` : sparkHTML(m.k, 160, 36, 30)}<div class="mage">${esc(ageText(m, Q, e))}</div>`;
}
function mkFlash(el, k) { const f = MK.flash[k]; if (!f) return; delete MK.flash[k]; el.classList.remove("fu", "fd"); void el.offsetWidth; el.classList.add(f > 0 ? "fu" : "fd"); setTimeout(() => el.classList.remove("fu", "fd"), 650); }
function mkPaintGrid(grid, list, stocks) {
  if (!grid) return; const editing = stocks && MK.edit, want = list.map(m => m.k);
  for (const c of Array.from(grid.children)) if (c.id !== "hmAddT" && !want.includes(c.dataset.key)) c.remove();
  list.forEach((m, i) => {
    let el = grid.querySelector(`[data-key="${CSS.escape(m.k)}"]`);
    if (!el) { el = document.createElement(editing ? "div" : "button"); el.className = "mtile"; el.dataset.key = m.k; if (!editing) { el.dataset.k = m.k; el.setAttribute("aria-label", `${m.name}: open the live chart`); } }
    if (grid.children[i] !== el) grid.insertBefore(el, grid.children[i] || null);
    el.classList.toggle("err", !!(MK.locked["q:" + m.k] || (MK.err["q:" + m.k] && !mkQ(m.k))));
    el.innerHTML = tileInner(m, editing); mkFlash(el, m.k);
  });
  if (stocks && !editing) { let a = grid.querySelector(".mtile.add"); if (!a) { a = document.createElement("button"); a.className = "mtile add"; a.id = "hmAddT"; a.innerHTML = `<b>＋</b><span>Add a stock</span>`; } grid.appendChild(a); a.hidden = MK.adding || HS().stocks.length >= STK_MAX; }
}
function mkPaintAdd() {
  const box = $("#hmAdd"); if (!box) return;
  if (!MK.adding || MK.edit) { box.innerHTML = ""; return; }
  if ($("#hmAddF", box)) return;
  box.innerHTML = `<form class="addform" id="hmAddF"><input id="hmAddI" maxlength="10" placeholder="Ticker, e.g. NFLX" aria-label="Stock ticker" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done"><button class="btn pri" type="submit">Add</button><button class="btn" type="button" id="hmAddX">Cancel</button><p class="small" id="hmAddM">Uses one FMP call to check the ticker. Your free plan covers many large US stocks, but not all.</p><div class="chips" id="hmAddS">${STK_IDEAS.filter(t => !HS().stocks.includes(t)).slice(0, 8).map(t => `<button type="button" class="chip" data-add="${t}">${t}</button>`).join("")}</div></form>`;
  $("#hmAddS", box).onclick = e => { const c = e.target.closest("[data-add]"); if (c) { $("#hmAddI", box).value = c.dataset.add; addStock(c.dataset.add); } };
  $("#hmAddX", box).onclick = () => { MK.adding = false; mkPaintHome(); };
  $("#hmAddF", box).onsubmit = e => { e.preventDefault(); addStock($("#hmAddI", box).value); };
}
async function addStock(raw) {
  const t = String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10), say = s => { const p = $("#hmAddM"); if (p) p.textContent = s; };
  if (!t) return say("Type a ticker first, like NFLX.");
  if (HS().stocks.includes(t)) return say(`${t} is already on your list.`);
  if (HS().stocks.length >= STK_MAX) return say(`That's the most stocks the page keeps (${STK_MAX}). Remove one with Edit first.`);
  if (MK.st !== "ready") return say("Connect FMP first.");
  say(`Checking ${t}…`);
  const m = stkDef(t), [tool, input] = qCall(m);
  try {
    const r = await MK.mcp.callTool(MK_SERVER, tool, input, { cache: { staleTime: 60000, gcTime: WEEK } }), q = parseQ(r && r.payload);
    if (!q) throw { code: "tool_error", message: fmpErr(r && r.payload) || "not found" };
    HS().stocks.push(t); save(); MK.adding = false; mkData("q:" + m.k, m, "q", r); mkSync(); mkPaintHome(); hmToast(`${t} added`);
  } catch (e) { const s = String(e && e.message || ""); say(/access denied|higher plan|upgrade|not found/i.test(s) ? `${t} isn't available on your FMP plan, or isn't a US ticker.` : errText(e)); }
}

/* ---------- live chart page ---------- */
function hcOpen() {
  const m = MKDEF[MK.sel]; if (!m) { mkShow("home"); return; }
  const root = $("#hmChart"), rng = [["1M", 22], ["3M", 66], ["6M", 130], ["1Y", 260]];
  clearInterval(HC.ibT); HC.ibT = 0; HC.ibErr = null; if (!HC.ib || HC.ib.k !== m.k) HC.ib = null;
  HC.tf = m.tv ? (TV_TFS.includes(HS().tf) ? HS().tf : typeof TS_DEF !== "undefined" ? TS_DEF[TS()].tf : "5m") : "1D";
  root.innerHTML = `<header class="hmh"><button class="tbtn" id="hcBack" aria-label="Back to markets">←</button><div class="hctitle"><span class="mlogo ${m.cls === "stk" ? "stk" : m.cls === "crypto" ? "btc" : ""} l${Math.min(4, m.logo.length)}">${esc(m.logo)}</span><span><b>${esc(m.cls === "stk" ? `${m.fmp} · ${m.name}` : m.name)}</b><small>${esc(m.sub)}<span id="hcTfl">${m.tv ? " · " + TF_NAME[HC.tf] + " candles" : " · daily candles · FMP"}</span></small></span></div><span class="mkst" id="hcSt"></span><button class="tbtn" id="hcRef" aria-label="Refresh price">⟳</button></header>
    <div class="hcbody"><div class="hcmain"><div class="hcpx" id="hcPx"></div>
      <div class="hcchart"><div class="hclg" id="hcLg"></div><canvas id="hcCv" role="img" aria-label="Daily candlestick chart of ${esc(m.name)}; today's candle updates with each new price. Drag to scroll back, pinch or scroll to zoom${m.trade || m.cls === "stk" ? ", drag the red and green lines to move your stop and target" : ""}."></canvas><div class="hcrng" id="hcRng">${m.tv ? TV_TFS.map(t => `<button data-tf="${t}" aria-pressed="${HC.tf === t}">${t === "1D" ? "D" : t}</button>`).join("") : rng.map(([l, n]) => `<button data-n="${n}" aria-pressed="${MK.vis === n}">${l}</button>`).join("")}</div><button class="hclvx" id="hcLvX" hidden>✕ Quint's lines</button><div class="hcnote" id="hcNote"></div></div>
      </div><aside class="hcside" id="hcSide" aria-live="polite"></aside><div class="hcnews hcside" id="hcNews"></div><div class="hcstats" id="hcStats"></div></div>`;
  $("#hcBack", root).onclick = () => mkShow(MK.qsBack ? "quint" : NW.back ? "news" : LT.back ? "trades" : "home");
  $("#hcRef", root).onclick = () => mkRefresh([m.k]);
  $$("#hcRng [data-tf]", root).forEach(b => b.onclick = () => hcSetTf(b.dataset.tf));
  $("#hcLvX", root).onclick = () => { HC.lvl = null; hcPaint(); };
  $$("#hcRng [data-n]", root).forEach(b => b.onclick = () => { MK.vis = +b.dataset.n; if (HC.chart) { HC.chart.vis = MK.vis; HC.chart.off = 0; HC.chart.req(); } $$("#hcRng button", root).forEach(x => x.setAttribute("aria-pressed", x === b)); });
  HC.chart = new LiveChart($("#hcCv", root), $("#hcLg", root)); HC.chart.vis = MK.vis; HC.chart.onLevel = (w, p, done) => lvSetLevel(w, p, done); lcLiveMount(m);
  root.scrollTop = 0; shHist(m.k); hcPaint(); lvPanel();
  if (m.tv && HC.tf !== "1D") hcLoadIB(m, false);
  hcLive();
  if (typeof dkMount === "function") dkMount(m);
}
function hcSetTf(tf) {
  const m = MKDEF[MK.sel]; if (!m || !m.tv || !TV_TFS.includes(tf)) return false;
  HC.tf = tf; HS().tf = tf; save(); $$("#hcRng [data-tf]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tf === tf)); const l = $("#hcTfl"); if (l) l.textContent = " · " + TF_NAME[tf] + " candles";
  if (HC.chart) { HC.chart.off = 0; HC.chart.vis = tf === "1D" ? MK.vis : 90; HC.chart.selD = null; HC.chart.und = []; lcLiveMount(m); }
  if (tf !== "1D") hcLoadIB(m, false); hcPaint(); lvPanel(); return true;
}
function hcLive() { // (re)start the chart's candle refresh at the rate the feed deserves
  clearInterval(HC.ibT); const ev = tvBgEvery(); if (!ev) return; // on a small TradingView plan the chart refreshes when you open it or tap ↻, not on a timer
  HC.ibT = setInterval(() => { const x = MKDEF[MK.sel]; if (MK.screen !== "chart" || !x || !x.tv || HC.tf === "1D" || document.hidden || !mktStatus(x.cls).open) return; if (tvCooling() || !tvBgEvery()) return; if (HC.ib && HC.ib.k === x.k && HC.ib.tf === HC.tf) hcTopUp(x); else hcLoadIB(x, true); }, ev);
}
async function hcTopUp(m) { // the last few candles only, merged into the chart: the forming candle moves with the market
  if (m.tv === TV_MNQ && DK_FEEDTF[HC.tf]) return hcLoadIB(m, true);
  const tf = HC.tf, ib = HC.ib; if (HC.ibBusy || !ib || ib.k !== m.k || ib.tf !== tf || !MK.mcp) return; HC.ibBusy = true;
  try { const r = await MK.mcp.callTool(TV_SERVER, "mcp-tv-get-ohlcv", { symbol: m.tv, interval: tf, count: 3, format: "columns" }, { cache: false }), b = tvBars(r && r.payload); if (!b || !b.t || !b.t.length || HC.ib !== ib) return;
    const B = ib.B; for (let i = 0; i < b.t.length; i++) { const t = b.t[i] * 1000, c = +b.c[i]; if (!(c > 0)) continue; const o = +b.o[i] > 0 ? +b.o[i] : c, h = Math.max(o, c, +b.h[i] || c), l = Math.min(o, c, +b.l[i] > 0 ? +b.l[i] : c), v = +b.v[i] || 0, L = B.n - 1;
      if (t === B.t[L]) { B.o[L] = o; B.h[L] = h; B.l[L] = l; B.c[L] = c; B.v[L] = v; } else if (t > B.t[L]) { B.t.push(t); B.d.push(""); B.o.push(o); B.h.push(h); B.l.push(l); B.c.push(c); B.v.push(v); B.n++; if (B.n > 700) { for (const k of ["t", "d", "o", "h", "l", "c", "v"]) B[k].shift(); B.n--; } } }
    ib.at = Date.now(); }
  catch (e) {} finally { HC.ibBusy = false; if (MK.screen === "chart" && MK.sel === m.k) hcPaint(); }
}
async function hcLoadIB(m, quiet) { // intraday candles from TradingView, refreshed once a minute while the market is open
  const tf = HC.tf; if (!m.tv || tf === "1D" || HC.ibBusy || MK.st !== "ready" || !MK.mcp) return;
  if (!quiet && HC.ib && HC.ib.k === m.k && HC.ib.tf === tf && Date.now() - HC.ib.at < 45000) return;
  HC.ibBusy = true; if (!quiet) { HC.ibErr = null; hcPaint(); }
  try {
    let b; // MNQ's chart comes from the feed Quint uses, so the chart and his answers share the same few calls
    if (m.tv === TV_MNQ && DK_FEEDTF[tf]) { const F = await dkFeed(TV_MNQ, null, quiet ? 0 : 6e4); b = dkTail(fdTf(F, tf), tf === "1m" ? 600 : 500); if (!b || b.n < 5) throw { code: "tool_error", message: "no candles" }; }
    else { const r = await MK.mcp.callTool(TV_SERVER, "mcp-tv-get-ohlcv", { symbol: m.tv, interval: tf, count: tf === "1m" ? 600 : 500, format: "columns" }, { cache: false }); b = tvBars(r && r.payload);
      if (!b || !b.t || b.t.length < 5) throw { code: "tool_error", message: fmpErr(r && r.payload) || "no candles" }; }
    const B = { t: [], d: [], o: [], h: [], l: [], c: [], v: [], tf };
    for (let i = 0; i < b.t.length; i++) { const c = +b.c[i]; if (!(c > 0)) continue; const o = +b.o[i] > 0 ? +b.o[i] : c; B.t.push(b.t[i] * 1000); B.d.push(""); B.o.push(o); B.h.push(Math.max(o, c, +b.h[i] || c)); B.l.push(Math.min(o, c, +b.l[i] > 0 ? +b.l[i] : c)); B.c.push(c); B.v.push(+b.v[i] || 0); }
    B.n = B.c.length; if (MK.sel === m.k && HC.tf === tf) { HC.ib = { k: m.k, tf, B, at: Date.now() }; HC.ibErr = null; }
  } catch (e) { if (MK.sel === m.k && HC.tf === tf) HC.ibErr = e && e.code === "cooldown" ? tvCoolMsg() : PAGE_CODES.has(e && e.code) ? "Intraday charts need your TradingView connector." : "Couldn't load these candles from TradingView. Pick the timeframe again to retry."; }
  finally { HC.ibBusy = false; if (MK.screen === "chart") { hcPaint(); lvPanel(); } }
}
function hcBars(m) { // what the chart shows: intraday candles for the chosen timeframe, or daily candles
  if (!m.tv || HC.tf === "1D") return liveBars(m.k);
  const ib = HC.ib; if (!ib || ib.k !== m.k || ib.tf !== HC.tf) return null;
  const S = ib.B, B = { t: S.t, d: S.d, o: S.o, h: S.h, l: S.l.slice(), c: S.c.slice(), v: S.v, tf: S.tf, n: S.n }, Q = MK.q[m.k], L = B.n - 1;
  if (Q && Q.p != null && (Q.at || 0) > ib.at && L >= 0) { B.h = S.h.slice(); B.c[L] = Q.p; B.h[L] = Math.max(B.h[L], Q.p); B.l[L] = Math.min(B.l[L], Q.p); }
  return B;
}
function hcPaint() {
  if (MK.screen !== "chart" || !$("#hcPx")) return;
  const m = MKDEF[MK.sel], Q = mkQ(m.k), S = mkSpec(m), st = mktStatus(m.cls), e = MK.err["q:" + m.k], eh = MK.err["h:" + m.k], B = hcBars(m), intra = m.tv && HC.tf !== "1D";
  $("#hcSt").className = "mkst " + st.cls; $("#hcSt").textContent = stLabel(st);
  $("#hcPx").innerHTML = Q ? `<b class="num">${fpx(m, Q.p)}</b><span class="ch ${Q.ch >= 0 ? "pos" : "neg"}">${fchg(m, Q)}</span><small>${esc(ageText(m, Q, e))}${Q.ts ? ` (${fAgo(Q.ts)})` : ""}</small>` : `<b><span class="sk" style="width:160px"></span></b><small>${esc(e ? errText(e) : MK.st === "err" ? "FMP isn't connected" : "Loading the price…")}</small>`;
  const note = $("#hcNote"); note.textContent = B ? "" : intra ? (HC.ibErr || (MK.st === "ready" ? `Loading ${TF_NAME[HC.tf]} candles from TradingView…` : "Connecting…")) : eh ? errText(eh) : MK.st === "ready" ? "Loading daily candles…" : MK.st === "wait" ? "Connecting to FMP…" : shReading() ? (SH.hist[m.k] === "none" ? "The owner's page hasn't shared this chart yet." : "Loading the shared chart…") : "Live charts need the FMP connector.";
  if (HC.chart) { HC.chart.lv = HC.lvl && HC.lvl.k === m.k ? HC.lvl.arr : []; HC.chart.set(B, S, hcPosFor(m)); }
  { const x = $("#hcLvX"); if (x) x.hidden = !(HC.lvl && HC.lvl.k === m.k && HC.lvl.arr.length); }
  hcNewsPaint();
  const DB = liveBars(m.k), A = DB ? atr14(DB) : null, row = (l, v) => `<div>${l}<b>${v}</b></div>`;
  $("#hcStats").innerHTML = Q ? [row("Open", fpx(m, Q.o)), row("Day high", fpx(m, Q.hi)), row("Day low", fpx(m, Q.lo)), row("Previous close", fpx(m, Q.pc)), row("Volume", fvol(Q.v)), row("52-week range", Q.yl != null && Q.yh != null ? `${fnum(S, Q.yl)} – ${fnum(S, Q.yh)}` : "—"), row("50-day average", fpx(m, Q.a50)), row("200-day average", fpx(m, Q.a200)), row("Daily ATR (14)", A ? fnum(S, A) : "—")].concat(Q.cap ? [row("Market value", Q.cap >= 1e12 ? "$" + (Q.cap / 1e12).toFixed(2) + "T" : "$" + fvol(Q.cap))] : []).join("") : "";
}
function hcPosFor(m) {
  const P = lvPosFor(m.k); if (!P) return null; const I = mkSpec(m), pv = lvPV(P, I), money = p => fusd((p - P.e) * P.dir * P.qty * pv - P.fees);
  return { dir: P.dir, e: P.e, stop: P.stop, tgt: P.tgt, edit: true, lab: w => w === "e" ? `${P.dir > 0 ? "LONG" : "SHORT"} ${lvSize(P, I)} @ ${fnum(I, P.e)}` : w === "stop" ? `STOP ${fnum(I, P.stop)} · ${money(P.stop)}` : `TARGET ${fnum(I, P.tgt)} · ${money(P.tgt)}` };
}

/* ---------- the live chart: daily candles, 20 EMA, volume, crosshair, draggable stop and target ---------- */
class LiveChart {
  constructor(cv, lg) {
    this.cv = cv; this.lg = lg; this.ctx = cv.getContext("2d"); this.B = null; this.S = { dec: 2, tick: 0.01 }; this.vis = 66; this.off = 0; this.cross = null; this.pos = null; this.drag = null; this.pts = new Map(); this.onLevel = null; this.raf = 0; this.sc = null; this.ema = []; this.lv = [];
    this.ro = new ResizeObserver(() => this.req()); this.ro.observe(cv);
    cv.addEventListener("pointerdown", e => this.down(e)); cv.addEventListener("pointermove", e => this.move(e));
    cv.addEventListener("pointerup", e => this.up(e)); cv.addEventListener("pointercancel", e => this.up(e, true));
    cv.addEventListener("pointerleave", e => { if (e.pointerType === "mouse" && !this.drag) { this.cross = null; this.legend(); this.req(); } });
    cv.addEventListener("wheel", e => { e.preventDefault(); this.zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    cv.addEventListener("dblclick", () => { this.off = 0; this.vis = MK.vis; this.req(); });
  }
  destroy() { try { this.ro.disconnect(); } catch (e) {} cancelAnimationFrame(this.raf); }
  set(B, S, pos) {
    const grew = this.B && B && B.n > this.B.n && this.off > 0; this.B = B; this.S = S || this.S;
    if (!(this.drag && this.drag.kind === "lvl")) this.pos = pos;
    if (B) { const k = 2 / 21, e = []; let v = null; for (let i = 0; i < B.n; i++) { v = v == null ? B.c[i] : B.c[i] * k + v * (1 - k); e.push(i >= 19 ? v : null); } this.ema = e; if (grew) this.off++; this.off = clamp(this.off, 0, Math.max(0, B.n - 10)); }
    this.legend(); this.req();
  }
  req() { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; try { this.draw(); } catch (e) { console.error("live chart", e); } }); }
  geo() { const W = this.cv.clientWidth, H = this.cv.clientHeight, R = W - 68, T = 30, Bt = H - 24, V = Bt - Math.max(26, (Bt - T) * 0.16); return { W, H, R, T, B: Bt, V }; }
  win() { const n = this.B ? this.B.n : 0, vis = clamp(Math.round(this.vis), 10, Math.max(10, n)), b = n - 1 - Math.round(this.off); return { a: Math.max(0, b - vis + 1), b, vis, n }; }
  bw() { const g = this.geo(), w = this.win(); return (g.R - 10) / w.vis; }
  xOf(i) { const g = this.geo(), w = this.win(); return g.R - 8 - (w.b - i + 0.5) * this.bw(); }
  iOf(x) { const g = this.geo(), w = this.win(); return clamp(Math.round(w.b - (g.R - 8 - x) / this.bw() - 0.5), w.a, w.b); }
  yOf(p) { const s = this.sc; return s.T + (s.hi - p) / (s.hi - s.lo) * (s.V - s.T - 6); }
  pOf(y) { const s = this.sc; return s.hi - (y - s.T) / (s.V - s.T - 6) * (s.hi - s.lo); }
  zoom(f) { if (!this.B) return; this.vis = clamp(this.vis * f, 10, Math.max(10, this.B.n)); this.req(); }
  pt(e) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  down(e) {
    if (!this.B) return; const p = this.pt(e); try { this.cv.setPointerCapture(e.pointerId); } catch (_) {}
    this.pts.set(e.pointerId, p);
    if (this.pts.size === 2) { const [a, b] = Array.from(this.pts.values()); this.drag = { kind: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, vis0: this.vis }; return; }
    if (this.pos && this.pos.edit && this.sc) { const tol = e.pointerType === "touch" ? 24 : 12;
      for (const w of ["stop", "tgt"]) { const v = this.pos[w]; if (v != null && Math.abs(this.yOf(v) - p.y) <= tol && p.x < this.geo().R + 66) { this.drag = { kind: "lvl", w }; this.cross = null; this.req(); return; } } }
    this.drag = { kind: "pan", x0: p.x, y0: p.y, off0: this.off, moved: false };
  }
  move(e) {
    const p = this.pt(e); if (this.pts.has(e.pointerId)) this.pts.set(e.pointerId, p);
    const d = this.drag;
    if (d && d.kind === "pinch" && this.pts.size >= 2) { const [a, b] = Array.from(this.pts.values()), dist = Math.hypot(a.x - b.x, a.y - b.y) || 1; this.vis = clamp(d.vis0 * d.d0 / dist, 10, Math.max(10, this.B.n)); this.req(); return; }
    if (d && d.kind === "lvl") { const v = this.onLevel ? this.onLevel(d.w, this.pOf(p.y), false) : this.pOf(p.y); if (v != null) this.pos[d.w] = v; this.req(); return; }
    if (d && d.kind === "pan") { const dx = p.x - d.x0; if (Math.abs(dx) > 5 || Math.abs(p.y - d.y0) > 5) d.moved = true; if (d.moved) { this.off = clamp(d.off0 + dx / this.bw(), 0, Math.max(0, this.B.n - 10)); this.cross = null; this.legend(); this.req(); } return; }
    if (e.pointerType === "mouse" && this.B) { this.cross = p; this.legend(); this.req(); }
  }
  up(e, cancel) {
    const p = this.pt(e), d = this.drag; this.pts.delete(e.pointerId); try { this.cv.releasePointerCapture(e.pointerId); } catch (_) {}
    if (d && d.kind === "pinch") { if (this.pts.size < 2) this.drag = null; return; }
    if (d && d.kind === "lvl") { this.drag = null; if (this.onLevel && !cancel) this.onLevel(d.w, this.pOf(p.y), true); this.req(); return; }
    if (d && d.kind === "pan" && !d.moved && !cancel) { this.cross = e.pointerType === "mouse" ? p : this.cross ? null : p; this.legend(); this.req(); }
    this.drag = null;
  }
  lab(i, k, prev) { // k 0: axis, 1: legend, 2: crosshair
    const B = this.B; if (!B.t) return k === 2 ? fDay(B.d[i]) : fDayS(B.d[i]);
    const d = new Date(B.t[i]), hm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), dt = d.toLocaleDateString([], { day: "numeric", month: "short" });
    if (k === 0) { const p = prev != null && prev >= 0 ? new Date(B.t[prev]) : null; return B.tf === "4h" || (p && p.toDateString() !== d.toDateString()) ? dt : hm; }
    return `${d.toLocaleDateString([], { weekday: "short" })} ${dt} ${hm}`;
  }
  legend() {
    if (!this.lg) return; const B = this.B; if (!B) { this.lg.innerHTML = ""; return; }
    const i = this.cross && this.sc ? this.iOf(this.cross.x) : B.n - 1, S = this.S, ch = i > 0 ? (B.c[i] - B.c[i - 1]) / B.c[i - 1] * 100 : 0, f = x => fnum(S, x);
    this.lg.innerHTML = `<b>${this.lab(i, 1)}${i === B.n - 1 ? (B.t ? " · latest" : " · today") : ""}</b> O <b>${f(B.o[i])}</b> H <b>${f(B.h[i])}</b> L <b>${f(B.l[i])}</b> C <b>${f(B.c[i])}</b> <span class="${ch >= 0 ? "u" : "d"}">${fpct(ch, 2)}</span>${this.ema[i] != null ? ` <span class="e">EMA 20 ${f(this.ema[i])}</span>` : ""}`;
  }
  draw() {
    const cv = this.cv, g = this.geo(), dpr = window.devicePixelRatio || 1, ctx = this.ctx;
    if (!g.W || !g.H) return;
    if (cv.width !== Math.round(g.W * dpr) || cv.height !== Math.round(g.H * dpr)) { cv.width = Math.round(g.W * dpr); cv.height = Math.round(g.H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, g.W, g.H); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, g.W, g.H);
    const B = this.B; if (!B || !B.n) { this.sc = null; return; }
    const w = this.win(), S = this.S, P = this.pos; let lo = Infinity, hi = -Infinity, vmax = 0;
    for (let i = w.a; i <= w.b; i++) { lo = Math.min(lo, B.l[i]); hi = Math.max(hi, B.h[i]); vmax = Math.max(vmax, B.v[i] || 0); }
    if (P) for (const v of [P.e, P.stop, P.tgt]) if (v != null && isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    { const r = hi - lo; for (const L of this.lv || []) if (isFinite(L.p) && L.p > lo - r * 0.6 && L.p < hi + r * 0.6) { lo = Math.min(lo, L.p); hi = Math.max(hi, L.p); } } // Quint's lines stay in view unless they're far away
    const pad = (hi - lo || Math.abs(hi) * 0.01 || 1) * 0.07; lo -= pad; hi += pad; this.sc = { lo, hi, T: g.T, V: g.V };
    ctx.font = "11px " + FONT; ctx.textBaseline = "middle";
    const step = niceStep((hi - lo) / Math.max(3, Math.floor((g.V - g.T) / 48))), dec = Math.max(0, Math.min(S.dec, -Math.floor(Math.log10(step)) + 1));
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.textAlign = "left";
    for (let p = Math.ceil(lo / step) * step; p <= hi; p += step) { const y = Math.round(this.yOf(p)) + 0.5; if (y < g.T - 4 || y > g.V) continue; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.R, y); ctx.stroke(); ctx.fillText(nf(dec).format(p), g.R + 8, y); }
    const bw = this.bw(), body = Math.max(1, Math.min(14, bw * 0.68)), lstep = Math.max(1, Math.ceil(78 / bw));
    ctx.textAlign = "center"; ctx.fillStyle = C.muted;
    for (let i = w.b; i >= w.a; i -= lstep) { const x = this.xOf(i); if (x < 24) continue; ctx.fillText(this.lab(i, 0, i - lstep), x, g.B + 12); ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, g.T - 6); ctx.lineTo(Math.round(x) + 0.5, g.B); ctx.stroke(); }
    if (vmax > 0) for (let i = w.a; i <= w.b; i++) { const x = this.xOf(i), h = (B.v[i] || 0) / vmax * (g.B - g.V - 2); ctx.fillStyle = B.c[i] >= B.o[i] ? "rgba(38,166,154,.28)" : "rgba(239,83,80,.28)"; ctx.fillRect(x - body / 2, g.B - h, body, h); }
    for (let i = w.a; i <= w.b; i++) {
      const x = Math.round(this.xOf(i)) + 0.5, up = B.c[i] >= B.o[i], col = up ? C.up : C.down, yo = this.yOf(B.o[i]), yc = this.yOf(B.c[i]);
      ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x, this.yOf(B.h[i])); ctx.lineTo(x, this.yOf(B.l[i])); ctx.stroke();
      ctx.fillStyle = col; ctx.fillRect(x - body / 2, Math.min(yo, yc), body, Math.max(1, Math.abs(yc - yo)));
      if (i === B.n - 1 && w.b === B.n - 1) { ctx.strokeStyle = "rgba(242,246,255,.55)"; ctx.setLineDash([2, 2]); ctx.strokeRect(x - body / 2 - 2.5, this.yOf(B.h[i]) - 2.5, body + 5, this.yOf(B.l[i]) - this.yOf(B.h[i]) + 5); ctx.setLineDash([]); }
    }
    ctx.strokeStyle = "#999999"; ctx.lineWidth = 1.5; ctx.beginPath(); let on = false;
    for (let i = w.a; i <= w.b; i++) { const v = this.ema[i]; if (v == null) { on = false; continue; } const x = this.xOf(i), y = this.yOf(v); if (!on) { ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y); }
    ctx.stroke(); ctx.lineWidth = 1;
    const tag = (y, text, bg, fg) => { ctx.fillStyle = bg; ctx.fillRect(g.R + 1, y - 9, g.W - g.R - 2, 18); ctx.fillStyle = fg; ctx.textAlign = "left"; ctx.fillText(text, g.R + 6, y); };
    const lastI = B.n - 1, last = B.c[lastI], prev = lastI > 0 ? B.c[lastI - 1] : B.o[lastI], ly = this.yOf(last), lcol = last >= prev ? C.up : C.down;
    ctx.strokeStyle = lcol; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(0, Math.round(ly) + 0.5); ctx.lineTo(g.R, Math.round(ly) + 0.5); ctx.stroke(); ctx.setLineDash([]);
    if (P) {
      const line = (v, col, dash, label, wgt) => { if (v == null) return; const y = Math.round(this.yOf(v)) + 0.5; ctx.strokeStyle = col; ctx.lineWidth = wgt || 1.5; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.R, y); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
        ctx.font = "700 11px " + FONT; const tw = ctx.measureText(label).width; ctx.fillStyle = "rgba(17,17,17,.92)"; ctx.fillRect(6, y - 10, tw + 14, 20); ctx.strokeStyle = col; ctx.strokeRect(6.5, y - 9.5, tw + 13, 19); ctx.fillStyle = col; ctx.textAlign = "left"; ctx.fillText(label, 13, y); ctx.font = "11px " + FONT;
        tag(y, fnum(S, v), col, "#101010"); };
      line(P.e, "#d2d2d2", [5, 4], P.lab ? P.lab("e") : "ENTRY", 1);
      line(P.stop, C.down, null, P.lab ? P.lab("stop") : "STOP", this.drag && this.drag.w === "stop" ? 2.5 : 1.5);
      line(P.tgt, C.up, null, P.lab ? P.lab("tgt") : "TARGET", this.drag && this.drag.w === "tgt" ? 2.5 : 1.5);
    }
    for (const L of this.lv || []) { // levels Quint drew
      if (!(L.p > lo && L.p < hi)) continue; const y = Math.round(this.yOf(L.p)) + 0.5, col = L.col || "#bfbfbf";
      ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.R, y); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
      ctx.font = "700 10.5px " + FONT; const t = "✦ " + L.lab, tw = ctx.measureText(t).width; ctx.fillStyle = "rgba(17,17,17,.88)"; ctx.fillRect(g.R - tw - 14, y - 9, tw + 10, 18); ctx.fillStyle = col; ctx.textAlign = "left"; ctx.fillText(t, g.R - tw - 9, y); ctx.font = "11px " + FONT;
      tag(y, fnum(S, L.p), col, "#111111");
    }
    tag(ly, fnum(S, last), lcol, "#fff");
    if (this.cross) {
      const i = this.iOf(this.cross.x), x = Math.round(this.xOf(i)) + 0.5, y = clamp(this.cross.y, g.T, g.V);
      ctx.strokeStyle = "rgba(210,210,210,.45)"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, g.T - 6); ctx.lineTo(x, g.B); ctx.moveTo(0, y + 0.5); ctx.lineTo(g.R, y + 0.5); ctx.stroke(); ctx.setLineDash([]);
      tag(y, fnum(S, this.pOf(y)), C.card2, C["ink-hi"]);
      const dl = this.lab(i, 2); ctx.font = "11px " + FONT; const tw = ctx.measureText(dl).width + 12; ctx.fillStyle = C.card2; ctx.fillRect(clamp(x - tw / 2, 0, g.R - tw), g.B + 2, tw, 18); ctx.fillStyle = C["ink-hi"]; ctx.textAlign = "center"; ctx.fillText(dl, clamp(x, tw / 2, g.R - tw / 2), g.B + 11);
    }
  }
}

/* ---------- live paper trading through the prop account ---------- */
const LV_MAX = 5; // live trades open at once, across both accounts
function lvState() {
  const s = ST.live || (ST.live = { open: [], log: [], plan: { stop: 0.5, tgt: 2 } });
  if (!Array.isArray(s.open)) s.open = [];
  if ("pos" in s) { if (s.pos && s.pos.open && !s.open.includes(s.pos)) s.open.push(s.pos); delete s.pos; } // one-trade saves from before
  if (!Array.isArray(s.log)) s.log = []; if (!s.plan) s.plan = { stop: 0.5, tgt: 2 }; return s;
}
const lvOpenList = () => lvState().open.filter(P => P && P.open);
const lvPosFor = k => lvOpenList().find(P => P.key === k) || null;
const lvPos = () => lvOpenList()[0] || null; // any open trade
const lvProp = () => lvOpenList().filter(P => P.kind !== "stk");
const lvMkt = P => MKDEF[P.key] || (P.kind === "stk" || String(P.key).startsWith("s:") ? stkDef(P.sym || String(P.key).slice(2)) : null);
const lvPV = (P, I) => P.kind === "stk" ? 1 : I.pv;
const lvSize = (P, I) => P.kind === "stk" ? `${P.qty} share${P.qty === 1 ? "" : "s"}` : sizeText(I, P.qty);
const lvRiskAt = (P, I) => Math.max(0, (P.e - P.stop) * P.dir * P.qty * lvPV(P, I)) + (P.fees || 0); // what a trade loses if its stop is hit
const lvUPL = P => { const m = lvMkt(P); if (!m) return 0; const I = mkSpec(m), Q = MK.q[P.key], x = Q ? Q.p : P.last; return (x - P.e) * P.dir * P.qty * lvPV(P, I) - (P.fees || 0); };
function lvHold(except) { // what the other open prop trades would lose at their stops: kept free under the loss limit
  let h = 0; for (const Q of lvProp()) if (Q !== except) { const m = lvMkt(Q); if (m) h += lvRiskAt(Q, mkSpec(m)); } return h;
}
function lvWith(except, fn) { ROOM_HOLD = lvHold(except); try { return fn(); } finally { ROOM_HOLD = 0; } }
/* ---------- the stock paper account: virtual cash, separate from the prop account ---------- */
const STK_START = 25000;
const SK = () => ST.stk || (ST.stk = { start: STK_START, bal: STK_START, peak: STK_START, n: 0, wins: 0, net: 0, t0: Date.now() });
const stkUsed = () => lvOpenList().filter(p => p.kind === "stk").reduce((a, p) => a + p.qty * p.e, 0);
const acctKeyOf = A => [A.id, A.stage, A.start, A.log && A.log[0] && A.log[0].t].join("|");
const lvIv = m => { if (m && m.tv) return "about every 30 seconds"; const T = mkTier(), s = [90, 180, 300, 0][T]; return s ? `about every ${s < 120 ? s + " seconds" : Math.round(s / 60) + " minutes"}` : "only when FMP calls are available again"; };
function lvTicketStk(m, Q) { // shares sized so the stop risks the chosen % of the stock account, capped by its buying power
  const I = mkSpec(m), B = liveBars(m.k), A = atr14(B), plan = lvState().plan; if (!A || !Q || Q.p == null) return null;
  const t = I.tick || 0.01, e = Math.round(Q.p / t) * t, sd = Math.max(t * 4, Math.round(plan.stop * A / t) * t), S = SK(), pct = ST.stkRisk || 1, budget = Math.round(S.bal * pct) / 100;
  const cash = Math.max(0, S.bal - stkUsed()), L = ST.stkLots || (ST.stkLots = { auto: true, n: 10 }), raw = Math.floor(budget / sd + 1e-9), cap = Math.floor(cash / e + 1e-9);
  let qty = L.auto ? Math.max(1, raw) : Math.max(1, Math.round(L.n) || 1); const capped = qty > cap; qty = Math.max(0, Math.min(qty, cap));
  return { I, A, e, sd, qty, risk: qty * sd, fees: 0, budget, cash, pct, z: { capped, tooWide: L.auto && raw < 1 && qty >= 1, none: qty < 1 } };
}
function lvAtrX(m) { // the ATR the stop is sized from: the chart's intraday timeframe when one is showing, otherwise daily
  const plan = lvState().plan, ib = HC.ib;
  if (m.tv && MK.screen === "chart" && MK.sel === m.k && HC.tf !== "1D" && ib && ib.k === m.k && ib.tf === HC.tf) { const A = atr14(ib.B); if (A) return { A, lab: `${HC.tf} ATR`, mult: plan.istop || 1.5, intra: true, tf: HC.tf }; }
  return { A: atr14(liveBars(m.k)), lab: "daily ATR", mult: plan.stop, intra: false, tf: "1D" };
}
function lvTicket(m, Q, sdOv) {
  const I = mkSpec(m), X = lvAtrX(m), A = X.A, plan = lvState().plan; if (!A || !Q || Q.p == null) return null;
  const e = Math.round(Q.p / I.tick) * I.tick, sd = sdOv > 0 ? Math.max(I.tick, Math.round(sdOv / I.tick) * I.tick) : Math.max(I.tick * 4, Math.round(X.mult * A / I.tick) * I.tick), K = contractSpec(I), cap = AC().cap, per = Math.max(1, Math.round(K.mini / K.micro)), L = ST.lots || (ST.lots = { mini: false, n: 1, auto: true }), budget = riskBudget(ST.riskPct || 1);
  const raw = Math.floor(budget / (sd * K.micro) + 1e-9); let micros = L.auto ? clamp(raw, 1, cap) : (L.mini && per > 1 ? L.n * per : L.n);
  micros = clamp(micros, 1, cap); const fit = lvWith(null, () => roomMicros(I, sd, e)), roomCut = micros > Math.max(1, fit); if (roomCut) micros = Math.max(1, fit);
  const qty = micros * K.micro / I.pv, risk = qty * I.pv * sd;
  return { I, A, X, e, sd, qty, micros, risk, fees: feeFor(I, qty, e), cap, per, K, budget, z: { roomCut, noRoom: fit < 1, micros, qty, tooWide: L.auto && raw < 1, capped: L.auto && raw > cap } };
}
async function lvOpen(dir, ov) { // ov: { stop, tgt, qc } from one of Quint's calls
  const m = MKDEF[MK.sel], stk = !!m && m.cls === "stk"; if (!m || (!m.trade && !stk) || LV.busy || lvPosFor(m.k)) return;
  if (lvOpenList().length >= LV_MAX) { hmToast(`You already have ${LV_MAX} live trades open, the most at once. Close one first.`); return; }
  const st = mktStatus(m.cls); if (!st.open) { hmToast(`${m.name} is closed right now. It opens ${fLocal(st.next)}.`); return; }
  if (MK.st !== "ready") { hmToast("Live prices aren't connected, so the order can't be filled."); return; }
  LV.busy = true; lvPanel(); let Q = null;
  try { Q = await mkFresh(m); } catch (e) { LV.busy = false; mkFail("q:" + m.k, m, "q", e); lvPanel(); hmToast(errText(e)); return; }
  LV.busy = false;
  const age = Q && Q.ts ? Date.now() - Q.ts : 0, maxAge = (m.cls === "crypto" ? 10 : 20) * 6e4;
  if (!Q || age > maxAge) { lvPanel(); hmToast(`${m.tv ? "TradingView's" : "FMP's"} latest ${m.name} price is ${Math.round(age / 6e4)} minutes old, so the order wasn't filled. Try again shortly.`); return; }
  if (!stk) { lvCheck(); if (!lvProp().length) acctOnNewRound(); } // a breached or passed account moves on first, exactly like the start of a trainer round (not while other trades are open on it)
  let sdOv = 0; if (ov && !stk) { const I0 = mkSpec(m), e0 = Math.round(Q.p / I0.tick) * I0.tick; sdOv = (e0 - ov.stop) * dir; if (!(sdOv > 0) || (ov.tgt != null && (ov.tgt - e0) * dir <= 0)) { lvPanel(); hmToast(`Price (${fnum(I0, e0)}) has already moved past Quint's ${sdOv > 0 ? "target" : "stop"}, so that call is off. Ask him again.`); return; } }
  const n = stk ? lvTicketStk(m, Q) : lvTicket(m, Q, sdOv); if (!n) { lvPanel(); hmToast("Still loading this market's candles, which the stop size needs."); return; }
  if (stk && n.z.none) { lvPanel(); hmToast("Not enough buying power for one share. Close a stock trade first."); return; }
  if (!stk && n.z.noRoom && lvProp().length) { lvPanel(); hmToast("No room under the loss limit for another trade while your other trades could still hit their stops. Close one or tighten a stop first."); return; }
  const I = n.I, plan = lvState().plan;
  const P = { id: Date.now(), kind: stk ? "stk" : "prop", key: m.k, sym: stk ? m.fmp : I.sym, name: m.name, dir, e: n.e, sd: n.sd, stop: n.e - dir * n.sd, tgt: ov && ov.tgt != null ? Math.round(ov.tgt / n.I.tick) * n.I.tick : n.e + dir * plan.tgt * n.sd, qty: n.qty, risk: n.risk, fees: n.fees, open: true, t0: Date.now(), mae: 0, mfe: 0, be: false,
    hi: Math.max(Q.hi != null ? Q.hi : Q.p, Q.p), lo: Math.min(Q.lo != null ? Q.lo : Q.p, Q.p), so: Q.o, sess: sessDay(m, Q.ts || Date.now()), lastTs: Q.ts || Date.now(), last: Q.p, pxAt: Q.ts || Date.now(), acct: stk ? "stk" : acctKeyOf(ST.acct), tf: "Live", ctf: n.X ? n.X.tf : "1D", qc: ov && ov.qc || null, plan: Object.assign({}, plan) };
  P.stop0 = P.stop; P.tgt0 = P.tgt;
  if (!stk) { P.liq = lvWith(P, () => liqPrice(P, I)); const f = fitStop(P, I, P.stop); if (f !== P.stop) { P.stop = f; setTimeout(() => hmToast(`Stop pulled in to ${fnum(I, f)} so it sits inside your account's loss limit`), 900); } }
  lvState().open.push(P); delete LV.resBy[m.k]; save();
  hmToast(`${dir > 0 ? "Bought" : "Sold"} ${lvSize(P, I)} @ ${fnum(I, n.e)} · risking ${fbal(n.risk)}`);
  mkSync(); lvPanel(); hcPaint();
}
async function lvCloseNow(P) {
  P = P || lvPosFor(MK.sel); if (!P || !P.open || LV.busy) return; const m = lvMkt(P); if (!m) return;
  const st = mktStatus(m.cls); if (!st.open) { hmToast(`${m.name} is closed, so the trade can't be closed until it reopens ${fLocal(st.next)}. Your stop and target still apply.`); return; }
  if (MK.st !== "ready") { hmToast("Live prices aren't connected, so the trade can't be closed right now."); return; }
  LV.busy = true; LV.busyId = P.id; lvPanel(); ltPaint(); let Q = null;
  try { Q = await mkFresh(m); } catch (e) { LV.busy = false; LV.busyId = 0; mkFail("q:" + m.k, m, "q", e); lvPanel(); ltPaint(); hmToast(errText(e)); return; }
  LV.busy = false; LV.busyId = 0; if (!P.open) return; // the new price hit the stop or target first
  const age = Q && Q.ts ? Date.now() - Q.ts : 0; if (!Q || age > (m.cls === "crypto" ? 10 : 20) * 6e4) { lvPanel(); ltPaint(); hmToast(`FMP's latest price is ${Math.round(age / 6e4)} minutes old, so the trade is still open. Try again shortly.`); return; }
  lvClose(P, Q.p, "manual", Q.ts || Date.now());
}
const lvLiqNow = (P, I) => lvWith(P, () => P.e - P.dir * Math.max(0, roomLeft() - P.fees) / (P.qty * I.pv)); // with other trades open, each one's loss limit assumes they hit their stops
const lvMark = (P, x) => { const ex = (x - P.e) * P.dir; P.mae = Math.min(P.mae, ex); P.mfe = Math.max(P.mfe, ex); };
function lvWalk(P, I, s) { // one stretch of prices since the last check: gap at the open, then the new extremes, then the latest price
  const d = P.dir, liq = P.kind === "stk" ? null : lvLiqNow(P, I), mll = liq != null && (liq - P.stop) * d > 0, sl = mll ? liq : P.stop;
  if (s.k === "bar") {
    if ((s.o - sl) * d <= 0) { lvMark(P, s.o); return lvClose(P, s.o, mll ? "mll" : "gapstop", s.at); }
    if (P.tgt != null && (s.o - P.tgt) * d >= 0) { lvMark(P, s.o); return lvClose(P, s.o, "gaptarget", s.at); }
  }
  const adv = s.k === "bar" ? (d > 0 ? s.l : s.h) : d > 0 ? (s.l < P.lo ? s.l : null) : (s.h > P.hi ? s.h : null);
  const fav = s.k === "bar" ? (d > 0 ? s.h : s.l) : d > 0 ? (s.h > P.hi ? s.h : null) : (s.l < P.lo ? s.l : null);
  for (const x of [adv, fav, s.c]) if (x != null) lvMark(P, x);
  const hitS = [adv, s.c].some(x => x != null && (x - sl) * d <= 0), hitT = P.tgt != null && [fav, s.c].some(x => x != null && (x - P.tgt) * d >= 0);
  if (hitS) return lvClose(P, sl, mll ? "mll" : "stop", s.at, hitT ? "both" : null);
  if (hitT) return lvClose(P, P.tgt, "target", s.at);
  return false;
}
function lvNeedHist(P) {
  if (P.histTried || MK.st !== "ready") return false; P.histTried = true; LV.catch[P.id] = true; lvPanel();
  const m = lvMkt(P), [tool, input] = hCall(m);
  MK.mcp.callTool(srvOf(m), tool, input, { cache: { staleTime: 0, gcTime: WEEK, refresh: true } }).then(r => mkData("h:" + m.k, m, "h", r), e => mkFail("h:" + m.k, m, "h", e)).finally(() => { delete LV.catch[P.id]; lvCheckOne(P); lvPanel(); });
  return true;
}
function lvCheck() { for (const P of lvOpenList()) lvCheckOne(P); }
function lvCheckOne(P) {
  if (!P || !P.open) return; const m = lvMkt(P); if (!m) return; const I = mkSpec(m);
  if (P.kind !== "stk" && (P.acct !== acctKeyOf(ST.acct) || ST.acct.locked)) { lvVoid(P, ST.acct.locked ? `Your account hit its loss limit in the trainer, so the open ${m.name} trade was cancelled with no profit or loss.` : `Your prop account changed (passed, paid out, reset or switched), so the open ${m.name} paper trade was cancelled with no profit or loss.`); return; }
  const Q = MK.q[P.key]; if (!Q || !Q.ts || Q.ts <= P.lastTs) return;
  const tol = I.tick / 2, newSess = Q.o != null && P.so != null && Math.abs(Q.o - P.so) > tol && sessDay(m, Q.ts) > P.sess, segs = [];
  if (newSess) { // a new trading day began since the last check: settle the days in between from their daily candles
    const H = MK.h[P.key]; let i0 = H ? H.d.indexOf(P.sess) : -1; if (H && i0 < 0) i0 = H.o.findIndex(o => Math.abs(o - P.so) <= tol);
    if ((!H || i0 < 0) && lvNeedHist(P)) return;
    if (H && i0 >= 0) {
      segs.push({ k: "rng", h: H.h[i0], l: H.l[i0], c: null, at: dayMs(H.d[i0]) + DAYMS - 6e4 });
      let lastC = H.c[i0];
      for (let i = i0 + 1; i < H.n; i++) { if (H.d[i] >= sessDay(m, Q.ts) || (Q.o != null && Math.abs(H.o[i] - Q.o) <= tol)) break; segs.push({ k: "bar", o: H.o[i], h: H.h[i], l: H.l[i], c: H.c[i], at: dayMs(H.d[i]) + 20 * 36e5 }); lastC = H.c[i]; }
      if (Q.pc != null && Math.abs(lastC - Q.pc) > Math.max(tol, Math.abs(Q.pc) * 3e-4) && lvNeedHist(P)) return; // days are missing: fetch the latest candles first
    }
    segs.push({ k: "bar", o: Q.o, h: Q.hi != null ? Q.hi : Q.p, l: Q.lo != null ? Q.lo : Q.p, c: Q.p, at: Q.ts });
  } else segs.push({ k: "rng", h: Q.hi != null ? Q.hi : Q.p, l: Q.lo != null ? Q.lo : Q.p, c: Q.p, at: Q.ts });
  for (const s of segs) if (lvWalk(P, I, s)) return;
  if (newSess) { P.hi = Math.max(Q.hi != null ? Q.hi : Q.p, Q.p); P.lo = Math.min(Q.lo != null ? Q.lo : Q.p, Q.p); P.so = Q.o; P.sess = sessDay(m, Q.ts); }
  else { P.hi = Math.max(P.hi, Q.hi != null ? Q.hi : Q.p, Q.p); P.lo = Math.min(P.lo, Q.lo != null ? Q.lo : Q.p, Q.p); }
  P.lastTs = Q.ts; P.last = Q.p; P.histTried = false; saveSoon();
}
const lvSlim = P => ({ id: P.id, kind: P.kind || "prop", key: P.key, name: P.name, sym: P.sym, dir: P.dir, e: P.e, qty: P.qty, R: P.R, net: P.net, exit: P.exit, t0: P.t0, void: !!P.void, note: P.note || null });
function lvClose(P, px, why, at, note) {
  if (!P || !P.open) return true; const m = lvMkt(P), I = mkSpec(m), stk = P.kind === "stk";
  px = Math.round(px / I.tick) * I.tick; P.open = false; P.R = (px - P.e) * P.dir / P.sd; P.net = Math.round(((px - P.e) * P.dir * P.qty * lvPV(P, I) - P.fees) * 100) / 100;
  P.exit = { px, why, at: at || Date.now(), be: why === "stop" && Math.abs(P.stop - P.e) < I.tick / 2 }; P.note = note || null;
  if (Date.now() - P.exit.at < 6e4 && typeof sfx === "function") sfx(P.net > 0 ? "win" : "loss", { over: true }); // only for trades closing now, not ones settled on reopening
  let cres = null;
  if (stk) { const K = SK(); K.bal = Math.round((K.bal + P.net) * 100) / 100; K.n++; K.net = Math.round((K.net + P.net) * 100) / 100; if (P.net > 0) K.wins++; K.peak = Math.max(K.peak, K.bal); }
  else { ST.fees += P.fees; bank(P.net, "trade"); cres = copyTrade(P, I); ST.trades++; ST.net += P.net; if (P.net > 0) ST.wins++; ST.eq.push(Math.round(ST.bal)); if (ST.eq.length > 400) ST.eq.shift(); }
  ST.jr.unshift({ d: jrDate(P.t0), sym: P.sym || I.sym, tf: "Live", side: P.dir > 0 ? "Long" : "Short", R: Math.round(P.R * 100) / 100, trade: Math.round(P.net), reads: 0, bal: Math.round(stk ? SK().bal : ST.bal), rk: Math.round(P.risk * 100) / 100, mode: "live", mg: null, wd: P.widened ? 1 : 0, ex: why, ac: stk ? "stk" : "prop" }); if (ST.jr.length > 250) ST.jr.pop();
  const S = lvState(); S.open = S.open.filter(x => x !== P); S.log.unshift(lvSlim(P)); if (S.log.length > 200) S.log.length = 200;
  LV.resBy[P.key] = { P, cres, at: Date.now() }; save();
  lvNotify(`${m.cls === "stk" ? m.fmp : m.name}: ${exitLabel(P.exit)} at ${fnum(I, px)} · ${fusd(P.net)}`);
  setTimeout(() => { mkSync(); lvPanel(); hcPaint(); if (MK.screen === "home") mkPaintHome(); ltPaint(); }, 0);
  return true;
}
function lvVoid(P, msg) {
  P.open = false; P.void = true; P.R = 0; P.net = 0; P.exit = { px: P.last, why: "void", at: Date.now() };
  const S = lvState(); S.open = S.open.filter(x => x !== P); S.log.unshift(lvSlim(P)); if (S.log.length > 200) S.log.length = 200; LV.resBy[P.key] = { P, voided: msg, at: Date.now() }; save();
  lvNotify(msg); setTimeout(() => { mkSync(); lvPanel(); hcPaint(); if (MK.screen === "home") mkPaintHome(); ltPaint(); }, 0);
}
function lvOnData(k) { const P = lvPosFor(k); if (P) lvCheckOne(P); if (MK.screen === "chart" && MK.sel === k) lvLive(); if (MK.screen === "trades") ltLive(); }
function lvSetLevel(which, price, done) {
  const P = lvPosFor(MK.sel); if (!P || !isFinite(price)) return null; const m = lvMkt(P), I = mkSpec(m), Q = MK.q[P.key], x = Q ? Q.p : P.last, d = P.dir;
  const A = atr14(liveBars(P.key)) || P.sd * 2, gap = Math.max(I.tick * 2, A * 0.05), rt = v => Math.round(v / I.tick) * I.tick;
  let v = rt(price), atLimit = false;
  if (which === "stop") { if (P.kind !== "stk") { P.liq = lvLiqNow(P, I); v = fitStop(P, I, v); atLimit = v === fitStop(P, I, d > 0 ? -1e12 : 1e12) && (P.liq - P.e) * d < -2 * I.tick; } v = rt(d > 0 ? Math.min(v, x - gap) : Math.max(v, x + gap)); }
  else v = rt(d > 0 ? Math.max(v, x + gap) : Math.min(v, x - gap));
  if (which === "stop") { if ((P.e - v) * d / P.sd > 1.05) P.widened = Math.max(P.widened || 1, (P.e - v) * d / P.sd); P.stop = v; P.be = Math.abs(v - P.e) < I.tick / 2; } else P.tgt = v;
  if (done) { save(); const risk = (P.e - P.stop) * d * P.qty * lvPV(P, I) + P.fees; hmToast(which === "stop" && atLimit ? `Your stop can't go past your account's loss limit (${fnum(I, P.liq)}), so it's set just inside it.` : which === "stop" ? (risk <= P.fees + 0.01 ? `Stop at ${fnum(I, v)}: profit locked in` : `Stop moved to ${fnum(I, v)}: risking ${fbal(risk)}`) : `Target moved to ${fnum(I, v)}`); lvPanel(); hcPaint(); }
  else if (HC.chart && HC.chart.pos) HC.chart.req();
  return v;
}
function lvPanel() {
  if (MK.screen !== "chart") return; const side = $("#hcSide"); if (!side) return;
  const m = MKDEF[MK.sel], P = lvPosFor(m.k), stk = m.cls === "stk", open = lvOpenList(); let h = "";
  if (!m.trade && !stk) h = `<div class="q"><span class="qk">Watch-only</span><p class="small" style="margin:0">${esc(m.name)} can't be paper traded here.</p></div>`;
  else if (P) h = lvPosHTML(P, m);
  else if (open.length >= LV_MAX) h = lvResHTML(m) + `<div class="q"><span class="qk">${LV_MAX} live trades open</span><p class="small" style="margin:0">That's the most at once. Close one to open a ${esc(stk ? m.fmp : m.name)} trade.</p><div class="row"><button class="btn pri" data-lt>Live trades ▸</button></div></div>`;
  else h = lvResHTML(m) + (stk ? lvTicketStkHTML(m) : lvTicketHTML(m));
  if (m.trade && m.replay && INST[m.replay]) h += `<button class="btn" id="lvrp">⏪ Practise past ${esc(m.name)} charts in the trainer</button>`;
  side.innerHTML = h + (stk ? stkCardHTML() : acctCardHTML()) + ltMiniHTML(m.k); lvBind(side, m); lvLive();
}
function lvTicketHTML(m) {
  const Q = MK.q[m.k], st = mktStatus(m.cls), n = lvTicket(m, Q), plan = lvState().plan, L = ST.lots || (ST.lots = { mini: false, n: 1, auto: true }), I = mkSpec(m), K = contractSpec(I), per = Math.max(1, Math.round(K.mini / K.micro));
  const age = Q && Q.ts ? Date.now() - Q.ts : null, stale = age != null && age > (m.cls === "crypto" ? 10 : 20) * 6e4, ok = MK.st === "ready" && st.open && !!n && !LV.busy;
  const chips = (id, vals, cur, fmt) => `<div class="chips" id="${id}">${vals.map(v => `<button class="chip" data-v="${v}" aria-pressed="${cur === v}">${fmt(v)}</button>`).join("")}</div>`;
  const why = MK.st !== "ready" ? (shReading() && SH.canWrite !== true ? "The shared feed is view-only. Live paper trading needs your own copy of Chart Wizard with your own FMP connector. You can still practise on past charts in the trainer." : "Connect FMP to trade live.") : !st.open ? `${esc(m.name)} is closed (${esc(st.label.toLowerCase())}). Orders open again ${fLocal(st.next)}.` : !Q ? "Waiting for a price…" : !n ? "Loading daily candles to size the stop…" : stale ? `FMP's latest price is ${Math.round(age / 6e4)} minutes old; the order will try for a fresher one.` : "";
  const lots = `<div class="lotrow2"><span class="small">Contracts</span><div class="seg" role="group" aria-label="Contract size"><button data-lot="auto" aria-pressed="${L.auto}">Auto</button><button data-lot="micro" aria-pressed="${!L.auto && !(L.mini && per > 1)}">${esc(per > 1 ? K.mName + " micro" : "Set")}</button>${per > 1 ? `<button data-lot="mini" aria-pressed="${!L.auto && L.mini}">${esc(K.bName)} full</button>` : ""}</div>${!L.auto ? `<button class="btn" id="lvlm" aria-label="One fewer">−</button><b>${L.n}</b><button class="btn" id="lvlp" aria-label="One more">+</button>` : ""}</div>`;
  const others = lvProp().length;
  return `<div class="q"><span class="qk">Paper trade · ${esc(acctLabel())}</span>
    ${why ? `<p class="small ${!st.open || stale ? "warn" : ""}" style="margin:0">${why}</p>` : ""}
    ${others ? `<p class="small" style="margin:0">${others} other trade${others > 1 ? "s" : ""} open on this account: the size leaves room under the loss limit for ${others > 1 ? "them" : "it"} hitting ${others > 1 ? "their stops" : "its stop"}.</p>` : ""}
    <div class="plan"><span>Stop</span>${n && n.X.intra ? chips("lvstop", [1, 1.5, 2, 3], plan.istop || 1.5, v => `${v} ATR`).replace('id="lvstop"', 'id="lvstop" data-i="1"') : chips("lvstop", [0.25, 0.5, 1], plan.stop, v => `${v} ATR`)}<span>Target</span>${chips("lvtgt", [1, 1.5, 2, 3], plan.tgt, v => `${v}R`)}<span>Risk</span>${chips("lvrisk", [0.25, 0.5, 1, 2], ST.riskPct || 1, v => `${v}%`)}</div>
    ${lots}
    <p class="small" style="margin:0">${n ? `<b>${esc(sizeText(n.I, n.qty))}</b> · stop ${fnum(n.I, n.sd)} away (${n.X.mult} × ${n.X.lab} ${fnum(n.I, n.A)}) · risking <b>${fbal(n.risk)}</b> · fees ${fbal(n.fees)} · target ${plan.tgt}R` : "Size appears once the price and daily candles load."}</p>
    ${n ? sizeNote(n) : ""}
    <div class="orders big"><button class="ord sell" id="lvsell" ${ok ? "" : "disabled"}><b>${LV.busy ? "…" : "SELL"}</b><span>${Q ? fnum(I, Q.p) : "—"}</span></button><button class="ord buy" id="lvbuy" ${ok ? "" : "disabled"}><b>${LV.busy ? "…" : "BUY"}</b><span>${Q ? fnum(I, Q.p) : "—"}</span></button></div>
    <p class="small ordnote">Fills at ${m.tv ? `TradingView's latest price (${MK.tvLive ? "real-time" : "about 10 minutes delayed"})` : "FMP's latest price"}. While this app is open, new prices arrive ${lvIv(m)} and your stop and target are checked against them, including the day's high and low. If the app is closed, the trade is settled from the daily candles when you come back. ${esc(m.what || "")}.</p></div>`;
}
function lvPosHTML(P, m) {
  const I = mkSpec(m);
  return `<div class="q posbox"><span class="qk">Open position · ${P.kind === "stk" ? "stock paper account" : "live paper trade"}</span>${LV.catch[P.id] ? `<p class="small" style="margin:0">Checking the daily candles since your last visit…</p>` : ""}
    <div class="live"><div class="side"><b>${P.dir > 0 ? "LONG" : "SHORT"}</b> ${esc(lvSize(P, I))} @ <b>${fnum(I, P.e)}</b><div class="small">Last <b id="lvpx">—</b> · <span id="lvrr">0.00R</span></div><div class="small" id="lvage"></div></div><div class="pnl num flat" id="lvpnl">$0</div></div>
    <div class="mgr"><div class="row act"><button class="btn danger" id="lvclose">${LV.busy && LV.busyId === P.id ? "Getting a price…" : "✕ Close at market"}</button><button class="btn okb" id="lvbe">🔒 Breakeven</button></div>
    <div class="lvls"><div class="lv"><span>Stop <b class="neg">${fnum(I, P.stop)}</b></span><span class="nb"><button class="btn" data-n="stop" data-k="1">Tighter</button><button class="btn" data-n="stop" data-k="-1">Wider</button></span></div>
    <div class="lv"><span>Target <b class="pos">${P.tgt != null ? fnum(I, P.tgt) : "none"}</b></span><span class="nb"><button class="btn" data-n="tgt" data-k="-1">Closer</button><button class="btn" data-n="tgt" data-k="1">Further</button></span></div></div>
    <p class="small hint">Drag the red and green lines on the chart to move them. Prices are checked ${lvIv(m)} while this app is open; if a price runs through both levels between two checks, it counts as stopped out.</p></div></div>`;
}
function lvResHTML(m) {
  const R = LV.resBy[m.k]; if (!R || !R.P || Date.now() - R.at > 15 * 6e4) return "";
  if (R.P.void) return `<div class="fb part"><p>${esc(R.voided || "Trade cancelled.")}</p></div>`;
  const P = R.P, res = `<div class="rapidres ${P.R > 0 ? "win" : "loss"}"><span class="big num">${P.R > 0 ? "✓" : "✕"} ${fusd(P.net)}</span><span>${exitLabel(P.exit)} · ${(P.R >= 0 ? "+" : "−") + Math.abs(P.R).toFixed(2)}R</span></div>`;
  const both = P.note === "both" ? `<p class="mgmt bad">Price reached both your stop and your target between two price checks. The order isn't known, so it counts as stopped out: the cautious assumption.</p>` : "";
  const aev = P.kind === "stk" ? null : acctCheck(), more = aev ? acctEventHTML(aev) + (aev.kind === "payout" ? `<button class="btn pri" id="lvpay">Take payout ${fbal(aev.amount)}</button>` : "") : "";
  const tip = P.R > 0 && P.mae / P.sd > -0.3 ? "Price barely went against you: a clean entry." : P.R <= 0 && P.mfe / P.sd >= 0.8 ? `It reached +${(P.mfe / P.sd).toFixed(1)}R first, then turned: moving the stop to breakeven at +1R would have saved it.` : P.widened ? "You widened the stop. Never move it further away." : "";
  return `${res}${copyHTML(R.cres)}${both}${tip ? `<p class="mgmt ${P.R > 0 ? "good" : "bad"}">${tip}</p>` : ""}${more}`;
}
function lvLogHTML() {
  const L = lvState().log; if (!L.length) return "";
  const net = L.reduce((a, p) => a + (p.net || 0), 0);
  return `<details class="lvlog"><summary>Live paper trades: ${L.length} · <b class="${toneOf(net)}">${fusd(net)}</b></summary>${L.slice(0, 12).map(p => `<div class="rpl"><span>${esc(p.name)} ${p.dir > 0 ? "long" : "short"} · ${jrDate(p.t0)}</span><span>${p.void ? "Cancelled" : esc(exitLabel(p.exit) || "")}</span><b class="${toneOf(p.net)}">${p.void ? "—" : fusd(p.net)}</b></div>`).join("")}</details>`;
}
function lvBind(side, m) {
  const on = (sel, f) => { const el = $(sel, side); if (el) el.onclick = f; };
  $$("[data-go]", side).forEach(b => b.onclick = () => mkOpen(b.dataset.go));
  $$("[data-lt]", side).forEach(b => b.onclick = () => mkShow("trades"));
  $$("[data-ltk]", side).forEach(b => b.onclick = () => { const k = b.dataset.ltk; if (MKDEF[k]) mkShow("chart", k); });
  on("#lvbuy", () => lvOpen(1)); on("#lvsell", () => lvOpen(-1)); on("#lvclose", () => lvCloseNow(lvPosFor(m.k)));
  on("#lvrp", () => { mkShow(null); startReplay(m.replay); toast(`⏪ ${INST[m.replay].short} history. Press ▶ Play.`); });
  on("#lvpay", () => { acctAct("payout"); delete LV.resBy[m.k]; lvPanel(); });
  on("#lvbe", () => { const P = lvPosFor(m.k); if (!P) return; const Q = MK.q[P.key], x = Q ? Q.p : P.last; if ((x - P.e) * P.dir / P.sd < 0.1) { hmToast("Breakeven needs the trade in profit first"); return; } lvSetLevel("stop", P.e, true); });
  $$(".mgr [data-n]", side).forEach(b => b.onclick = () => { const P = lvPosFor(m.k); if (!P) return; const k = +b.dataset.k, A = atr14(liveBars(P.key)) || P.sd; if (b.dataset.n === "stop") lvSetLevel("stop", P.stop + k * P.dir * 0.1 * A, true); else lvSetLevel("tgt", (P.tgt != null ? P.tgt : P.e + P.dir * 2 * P.sd) + k * P.dir * 0.1 * A, true); });
  const plan = lvState().plan;
  $$("#lvstop .chip", side).forEach(b => b.onclick = () => { if (b.closest("#lvstop").dataset.i) plan.istop = +b.dataset.v; else plan.stop = +b.dataset.v; save(); lvPanel(); });
  $$("#lvtgt .chip", side).forEach(b => b.onclick = () => { plan.tgt = +b.dataset.v; save(); lvPanel(); });
  $$("#lvrisk .chip", side).forEach(b => b.onclick = () => { ST.riskPct = +b.dataset.v; save(); lvPanel(); });
  const L = ST.lots || (ST.lots = { mini: false, n: 1, auto: true });
  $$(".lotrow2 [data-lot]", side).forEach(b => b.onclick = () => { const k = b.dataset.lot; L.auto = k === "auto"; if (!L.auto) { if (L.mini !== (k === "mini")) L.n = 1; L.mini = k === "mini"; } save(); lvPanel(); });
  on("#lvlm", () => { L.n = Math.max(1, L.n - 1); save(); lvPanel(); }); on("#lvlp", () => { L.n = L.n + 1; save(); lvPanel(); });
  $$("#lvsrisk .chip", side).forEach(b => b.onclick = () => { ST.stkRisk = +b.dataset.v; save(); lvPanel(); });
  const SL = ST.stkLots || (ST.stkLots = { auto: true, n: 10 });
  $$("[data-sh]", side).forEach(b => b.onclick = () => { const auto = b.dataset.sh === "auto"; if (!auto && SL.auto) { const n = lvTicketStk(m, MK.q[m.k]); if (n && n.qty > 0) SL.n = n.qty; } SL.auto = auto; save(); lvPanel(); }); // "Set" starts from the size Auto would use
  on("#lvsm", () => { SL.n = Math.max(1, (SL.n | 0) - 1); save(); lvPanel(); }); on("#lvsp", () => { SL.n = (SL.n | 0) + 1; save(); lvPanel(); });
  { const inp = $("#lvsn", side); if (inp) inp.onchange = () => { const v = Math.floor(+inp.value); SL.n = clamp(isFinite(v) ? v : 1, 1, 100000); save(); lvPanel(); }; }
  on("#stkReset", () => { const b = $("#stkReset", side); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Tap again to reset the stock account"; return; } ST.stk = null; SK(); save(); hmToast(`Stock account reset to ${fbal(STK_START)}`); lvPanel(); });
}
function lvLive() { // the parts that change with every price
  if (MK.screen !== "chart") return; const m = MKDEF[MK.sel], Q = MK.q[m.k], P = lvPosFor(m.k);
  ltLive();
  if (P) { const I = mkSpec(m), x = Q ? Q.p : P.last, R = (x - P.e) * P.dir / P.sd, v = (x - P.e) * P.dir * P.qty * lvPV(P, I) - P.fees, set = (id, t) => { const el = $(id); if (el) el.textContent = t; };
    set("#lvpx", fnum(I, x)); set("#lvrr", (R >= 0 ? "+" : "−") + Math.abs(R).toFixed(2) + "R"); set("#lvage", Q && Q.ts ? `price from ${fLocal(Q.ts)} (${fAgo(Q.ts)})` : "");
    const pn = $("#lvpnl"); if (pn) { pn.textContent = fusd(v); pn.className = "pnl num " + (v > 0 ? "pos" : v < 0 ? "neg" : "flat"); } }
  else if ((m.trade || m.cls === "stk") && $("#lvbuy")) { const I = mkSpec(m); for (const id of ["#lvbuy span", "#lvsell span"]) { const el = $(id); if (el && Q) el.textContent = fnum(I, Q.p); }
    // the order buttons wait for the candles the stop size needs: once they arrive, the ticket is drawn again so BUY and SELL turn on
    if (m.trade && m.cls !== "stk" && $("#lvbuy").disabled && !lvLive.re && MK.st === "ready" && mktStatus(m.cls).open && !LV.busy && lvTicket(m, Q)) { lvLive.re = true; try { lvPanel(); } finally { lvLive.re = false; } } }
}
$("#homebtn").onclick = openHome;

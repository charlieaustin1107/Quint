// Backtest the strategies Chart Wizard teaches on real MNQ candles.
//
//   node backtest/run.js
//
// Reads  backtest/data/mnq_15m.csv, mnq_5m.csv, mnq_1d.csv   (columns: t,o,h,l,c,v; t = unix seconds UTC)
// Writes backtest/results/summary.json and one trades CSV per strategy.
//
// The rules come from backtest/engine.js, which is Quint Brain's own code (see extract_engine.py).
// Costs: $0.75 commission a side + 1 tick (0.25 pt = $0.50) slippage a side = $2.50 a round trip, 1 MNQ contract.

const fs = require("fs");
const path = require("path");
const E = require("./engine.js");

const DIR = __dirname;
const PT_USD = 2;          // MNQ: $2 a point
const COST_USD = 2.5;      // per round trip
const COST_PTS = COST_USD / PT_USD;

function loadCSV(name) {
  const file = path.join(DIR, "data", name);
  if (!fs.existsSync(file)) return null;
  const rows = fs.readFileSync(file, "utf8").trim().split("\n").slice(1).map(l => l.split(",").map(Number));
  rows.sort((a, b) => a[0] - b[0]);
  const B = { t: [], o: [], h: [], l: [], c: [], v: [] };
  let last = -1;
  for (const [t, o, h, l, c, v] of rows) { if (t === last) continue; last = t; B.t.push(t); B.o.push(o); B.h.push(h); B.l.push(l); B.c.push(c); B.v.push(v || 0); }
  B.n = B.t.length; B.pts = true;
  return B;
}

const nyDay = t => { const e = E.etNow(t * 1000); return `${e.y}-${String(e.mo).padStart(2, "0")}-${String(e.d).padStart(2, "0")}`; };
const iso = t => new Date(t * 1000).toISOString().replace(".000Z", "Z");

function stats(trades) {
  let net = 0, pk = 0, dd = 0, gw = 0, gl = 0, w = 0, ln = 0, sn = 0, r = 0;
  const days = {};
  for (const x of trades) {
    net += x.usd; pk = Math.max(pk, net); dd = Math.max(dd, pk - net);
    if (x.usd > 0) { w++; gw += x.usd; } else gl -= x.usd;
    if (x.d > 0) ln += x.usd; else sn += x.usd;
    r += x.r;
    const k = nyDay(x.tIn); days[k] = (days[k] || 0) + x.usd;
  }
  const dv = Object.values(days), n = trades.length;
  const best = dv.length ? Math.max(...dv) : 0;
  return {
    trades: n,
    winRatePct: n ? +(w / n * 100).toFixed(1) : 0,
    profitFactor: gl > 0 ? +(gw / gl).toFixed(2) : gw > 0 ? null : 0,
    netUSD: +net.toFixed(0),
    avgTradeUSD: n ? +(net / n).toFixed(1) : 0,
    avgR: n ? +(r / n).toFixed(2) : 0,
    maxDrawdownUSD: +dd.toFixed(0),
    longsUSD: +ln.toFixed(0),
    shortsUSD: +sn.toFixed(0),
    tradingDays: dv.length,
    worstDayUSD: dv.length ? +Math.min(...dv).toFixed(0) : 0,
    bestDayUSD: +best.toFixed(0),
    bestDayShareOfNetPct: net > 0 ? +(best / net * 100).toFixed(0) : null,
  };
}

function report(name, trades, from, to) {
  const half = Math.floor(trades.length / 2);
  return { name, from: iso(from), to: iso(to), all: stats(trades), firstHalf: stats(trades.slice(0, half)), secondHalf: stats(trades.slice(half)) };
}

// blEval/orbEval trades -> dollars on 1 contract
const toUSD = (B, x) => {
  const sd = Math.abs(x.e - x.st), pts = (x.x - x.e) * x.d;
  return { tIn: B.t[x.i + 1], tOut: B.t[Math.min(x.j, B.n - 1)], d: x.d, e: x.e, stop: x.st, target: x.tg, exit: x.x, r: +((pts - COST_PTS) / sd).toFixed(3), usd: +(pts * PT_USD - COST_USD).toFixed(2) };
};

function writeTrades(file, rows) {
  const cols = ["tIn", "tOut", "side", "entry", "stop", "target", "exit", "r", "usd", "why"];
  const out = [cols.join(",")].concat(rows.map(x => [iso(x.tIn), iso(x.tOut), x.d > 0 ? "long" : "short", x.e, x.stop, x.target ?? "", x.exit, x.r, x.usd, x.why || ""].join(",")));
  fs.writeFileSync(path.join(DIR, "results", file), out.join("\n") + "\n");
}

fs.mkdirSync(path.join(DIR, "results"), { recursive: true });
const m15 = loadCSV("mnq_15m.csv"), m5 = loadCSV("mnq_5m.csv"), d1 = loadCSV("mnq_1d.csv");
const summary = { generatedAt: new Date().toISOString(), symbol: "CME_MINI:MNQ1!", costPerRoundTripUSD: COST_USD, contracts: 1, strategies: [] };

if (m15) {
  const brk = { f: "breakout", n: 20, stop: 2, tgt: 3, hold: 40, dir: "both" };
  const t1 = E.blEval(brk, [m15], COST_PTS).map(x => ({ ...toUSD(m15, x), why: x.x === x.st || (x.d > 0 ? x.x <= x.st : x.x >= x.st) ? "stop" : x.x === x.tg ? "target" : "time" }));
  summary.strategies.push({ id: "brk", ...report("20-candle breakout (15m)", t1, m15.t[0], m15.t[m15.n - 1]), rules: brk });
  writeTrades("trades_breakout_15m.csv", t1);

  const orb = { f: "orb", or: 15, cut: 120, mid: 0, tgt: 2, dir: "both" };
  const o = []; E.orbEval(orb, m15, COST_PTS, Math.floor(m15.n * E.BL.split), o);
  const t2 = o.map(x => ({ ...toUSD(m15, x), why: x.x === x.tg ? "target" : (x.d > 0 ? x.x <= x.st : x.x >= x.st) ? "stop" : "time" }));
  summary.strategies.push({ id: "orb15", ...report("New York open breakout (15m)", t2, m15.t[0], m15.t[m15.n - 1]), rules: orb });
  writeTrades("trades_ny_open_15m.csv", t2);
}

if (m5) {
  const R = E.pxBacktest({ ver: 1, m5, d1: d1 || null });
  const t3 = R.tr.map(x => ({ tIn: m5.t[x.i], tOut: m5.t[x.j], d: x.d, e: x.e, stop: x.st, target: x.tg, exit: x.x, r: +x.r.toFixed(3), usd: +x.usd.toFixed(2), why: x.why }));
  summary.strategies.push({ id: "pil", ...report("Your 5-pillar playbook (5m)", t3, m5.t[0], m5.t[m5.n - 1]), rules: "Location, liquidity sweep, CISD, displacement, execution; New York session 9:30-15:30; see quint-brain pbEval" });
  writeTrades("trades_5_pillar_5m.csv", t3);
}

fs.writeFileSync(path.join(DIR, "results", "summary.json"), JSON.stringify(summary, null, 2) + "\n");
for (const s of summary.strategies) {
  const a = s.all;
  console.log(`${s.name}: ${a.trades} trades, win ${a.winRatePct}%, PF ${a.profitFactor}, net $${a.netUSD}, max DD $${a.maxDrawdownUSD}, worst day $${a.worstDayUSD} | 1st half $${s.firstHalf.netUSD} (PF ${s.firstHalf.profitFactor}) | 2nd half $${s.secondHalf.netUSD} (PF ${s.secondHalf.profitFactor})`);
}

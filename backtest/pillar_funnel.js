// How far does each New York-session 5-minute candle get through the five pillars?
//
//   node backtest/pillar_funnel.js
//
// Shows where the playbook filters setups out, so a quiet backtest can be explained.
// Writes backtest/results/pillar_funnel.json.

const fs = require("fs");
const path = require("path");
const E = require("./engine.js");

const load = f => {
  const r = fs.readFileSync(path.join(__dirname, "data", f), "utf8").trim().split("\n").slice(1).map(l => l.split(",").map(Number));
  const B = { t: [], o: [], h: [], l: [], c: [], v: [] };
  for (const x of r) { B.t.push(x[0]); B.o.push(x[1]); B.h.push(x[2]); B.l.push(x[3]); B.c.push(x[4]); B.v.push(x[5]); }
  B.n = B.t.length; return B;
};

const m5 = load("mnq_5m.csv"), d1 = load("mnq_1d.csv");
const S = E.pxSeries(m5, "5m"), pois = E.pxPois(S, d1);
const funnel = { nySessionCandles: 0, location: 0, plusSweep: 0, plusCISD: 0, plusDisplacement: 0, plusPullbackConfirmed: 0, plusRiskInRange: 0, plusRoomFor1_5R: 0 };
const nearMisses = [];
for (let t = 80; t < S.n; t++) {
  const e = E.etNow(S.ts[t]);
  if (e.wd === 0 || e.wd === 6 || e.min < 570 || e.min > 930) continue; // same window as the backtest
  funnel.nySessionCandles++;
  const ev = E.pbEval(S, t, pois);
  if (!ev.loc) continue; funnel.location++;
  if (!ev.sweep) continue; funnel.plusSweep++;
  if (!ev.cisd) continue; funnel.plusCISD++;
  if (!ev.disp) continue; funnel.plusDisplacement++;
  const x = ev.ex; if (!(x.z && x.conf)) continue; funnel.plusPullbackConfirmed++;
  const riskOK = x.risk >= 0.3 * ev.A && x.risk <= 5 * ev.A;
  nearMisses.push({ time: new Date(S.ts[t]).toISOString(), side: ev.d > 0 ? "long" : "short", zone: x.z.kind, riskInATR: +(x.risk / ev.A).toFixed(2), rewardToRisk: +x.rr.toFixed(2) });
  if (!riskOK) continue; funnel.plusRiskInRange++;
  if (!(x.rr >= 1.5)) continue; funnel.plusRoomFor1_5R++;
}
const out = { from: new Date(S.ts[0]).toISOString(), to: new Date(S.te[S.n - 1]).toISOString(), pointsOfInterest: pois.length, funnel, nearMisses };
fs.mkdirSync(path.join(__dirname, "results"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "results", "pillar_funnel.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out.funnel), `${nearMisses.length} near misses`);

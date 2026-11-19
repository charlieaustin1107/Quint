'use strict';
// Would this strategy pass a Lucid 50K evaluation? A Monte Carlo answer.
//
// It replays the strategy's own daily results (every session it could trade, including the days it took no trade)
// in a random order, thousands of times, through the LucidDaily 50K rules checked on Lucid's help center
// (quint-control/PLAN.md, 18 Nov 2026):
//   - pass at +$3,000, but only once the best day is no more than 40% of the profit (the evaluation consistency rule)
//   - fail if the balance falls to the max-loss floor: $2,000 below the highest end-of-day balance, and that floor
//     locks at $50,100 once the balance has reached $52,100
// The plan's red line: more than a 25% chance of failing before passing is red.
//
// Limits: it uses end-of-day results, so a dip inside a day that touched the floor and recovered isn't seen (funded
// accounts trail intraday), and it assumes days are independent. Treat it as a guide, not a promise.

const LUCID_DAILY_50K = { start: 50000, target: 3000, maxLoss: 2000, lockAt: 52100, lockFloor: 50100, consistency: 0.4, maxDays: 60 };
const RED_LINE = 0.25;

function rng(seed) { // mulberry32: the same seed gives the same answer every run, so results are reproducible
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function oneRun(daily, rules, rand) {
  let bal = rules.start, high = rules.start, floor = rules.start - rules.maxLoss, best = 0;
  for (let day = 1; day <= rules.maxDays; day++) {
    const pnl = daily[Math.floor(rand() * daily.length)];
    bal += pnl;
    best = Math.max(best, pnl);
    if (bal <= floor) return { outcome: 'fail', day };
    high = Math.max(high, bal);
    floor = high >= rules.lockAt ? rules.lockFloor : Math.max(floor, high - rules.maxLoss);
    const profit = bal - rules.start;
    if (profit >= rules.target && best <= rules.consistency * profit) return { outcome: 'pass', day };
  }
  return { outcome: 'unfinished', day: rules.maxDays };
}

// daily: one number per session the strategy could have traded (0 on days with no trade).
function simulate(daily, opt = {}) {
  const rules = { ...LUCID_DAILY_50K, ...(opt.rules || {}) };
  const runs = opt.runs || 10000;
  if (!daily.length) return null;
  const rand = rng(opt.seed || 20261119);
  let pass = 0, fail = 0;
  const passDays = [];
  for (let i = 0; i < runs; i++) {
    const r = oneRun(daily, rules, rand);
    if (r.outcome === 'pass') { pass++; passDays.push(r.day); } else if (r.outcome === 'fail') fail++;
  }
  passDays.sort((a, b) => a - b);
  const pFail = fail / runs;
  return {
    runs,
    sessions: daily.length,
    pPass: pass / runs,
    pFail,
    pUnfinished: (runs - pass - fail) / runs,
    medianDaysToPass: passDays.length ? passDays[Math.floor(passDays.length / 2)] : null,
    red: pFail > RED_LINE,
  };
}

module.exports = { simulate, LUCID_DAILY_50K, RED_LINE, rng };

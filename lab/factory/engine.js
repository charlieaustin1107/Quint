'use strict';
// Quint Lab strategy factory: test every variation of every family the same way, and only let real survivors through.
//
// For each family:
//   1 Run every variation in its grid on the stored MNQ candles, with the bot lab's engine and costs.
//   2 Split the sessions in time order: the first 60% to tune on, the last 40% unseen.
//   3 Rank variations on the tuning sessions only, then look at how the top ones did on sessions they never saw.
//   4 Probability of backtest overfitting (PBO, Bailey, Borwein, Lopez de Prado & Zhu 2015): split the sessions into 8
//     blocks, and for all 70 ways of tuning on 4 blocks and testing on the other 4, check how often the best tuned
//     variation lands in the bottom half on the blocks it didn't see. High PBO means the "winners" are luck.
//   5 Neighbours: a real edge doesn't vanish when one setting moves a notch. A variation's neighbours (one setting one
//     step away) must also make money on unseen sessions.
//   6 The survivor rule below, fixed before any result. Survivors get the Lucid 50K Monte Carlo and go to the paper
//     forward test. Only the owner can ever take one live, through Quint Control.
// Nothing here is financial advice.

const { runBot } = require('../../quint-control/botlab/botlab');
const noise = require('../../quint-control/proof/noise_momentum');
const { basic } = require('../lib/score');
const { simulate } = require('../lib/prop');
const { FAMILIES } = require('./families');
const wyld = require('./wyld');

const TUNE_SHARE = 0.6;
const COST_STRESS = 2.5; // another $2.50 a trade
const RULE = { minUnseenTrades: 30, minUnseenPF: 1.2, maxDrawdown: 2000, worstDay: -1200, maxPBO: 0.3, minTuneTrades: 10 };

function expand(grid) {
  let out = [{}];
  for (const [k, values] of Object.entries(grid)) out = out.flatMap((p) => values.map((v) => ({ ...p, [k]: v })));
  return out;
}
const keyOf = (p) => Object.entries(p).map(([k, v]) => `${k}=${v}`).join(';');
function parseKey(key, grid) {
  const p = {};
  for (const part of key.split(';')) {
    const [k, v] = part.split('=');
    const match = (grid[k] || []).find((x) => String(x) === v);
    p[k] = match !== undefined ? match : (Number.isFinite(Number(v)) ? Number(v) : v);
  }
  return p;
}

function tradesFor(fam, params, bars, ctx) {
  if (fam.engine === 'noise') return noise.run(bars, params).trades;
  if (fam.engine === 'wyld') return wyld.run(bars, ctx.b15, ctx.daily, fam.options ? fam.options(params) : params).trades;
  return runBot(bars, fam.make(params, ctx), {}).trades;
}

function pf(trades) { const s = basic(trades); return s.profitFactor === Infinity ? 99 : s.profitFactor; }

// PBO by combinatorially symmetric cross-validation. matrix: one row per variation, one column per block (net $).
function probabilityOfOverfitting(matrix, blocks) {
  const idx = [...Array(blocks).keys()], half = blocks / 2, combos = [];
  (function pick(start, chosen) {
    if (chosen.length === half) { combos.push(chosen); return; }
    for (let i = start; i < blocks; i++) pick(i + 1, [...chosen, i]);
  })(0, []);
  let below = 0;
  for (const c of combos) {
    const inSet = new Set(c);
    let best = 0, bestIS = -Infinity;
    const oos = matrix.map((row, i) => {
      let is = 0, os = 0;
      row.forEach((x, j) => { if (inSet.has(j)) is += x; else os += x; });
      if (is > bestIS) { bestIS = is; best = i; }
      return os;
    });
    const v = oos[best];
    let lower = 0, same = 0;
    for (const x of oos) { if (x < v) lower++; else if (x === v) same++; }
    if ((lower + 0.5 * same) / oos.length < 0.5) below++;
  }
  return combos.length ? below / combos.length : null;
}

function neighbours(p, grid, byKey) {
  const out = [];
  for (const [k, values] of Object.entries(grid)) {
    const i = values.indexOf(p[k]);
    for (const j of [i - 1, i + 1]) {
      if (j < 0 || j >= values.length) continue;
      const n = byKey.get(keyOf({ ...p, [k]: values[j] }));
      if (n) out.push(n);
    }
  }
  return out;
}

const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function isSurvivor(v, familyPBO) {
  const u = v.unseen;
  return u.n >= RULE.minUnseenTrades && u.net > 0 && u.pf >= RULE.minUnseenPF && u.net - COST_STRESS * u.n > 0 &&
    v.all.maxDrawdown < RULE.maxDrawdown && v.all.worstDay > RULE.worstDay &&
    v.neighbours.medianUnseen !== null && v.neighbours.medianUnseen > 0 && familyPBO !== null && familyPBO <= RULE.maxPBO;
}

function runFamily(fam, data, opt = {}) {
  const set = data[fam.data] || data[parseInt(fam.data, 10)];
  if (!set) return { id: fam.id, name: fam.name, skipped: `needs ${fam.data} candles` };
  if (fam.minSessions && set.days && set.days.length < fam.minSessions) return { id: fam.id, name: fam.name, skipped: `needs ${fam.minSessions} sessions of ${fam.data} candles (has ${set.days.length})` };
  const missing = (fam.needs || []).filter((k) => !data[k] || !data[k].bars.length);
  if (missing.length) return { id: fam.id, name: fam.name, skipped: `needs ${missing.join(' and ')} candles` };
  const bars = set.bars, days = noise.sessions(bars).days.map((d) => d.day), ctx = fam.context ? fam.context(bars, data) : {};
  const nTune = Math.floor(days.length * TUNE_SHARE), tune = new Set(days.slice(0, nTune));
  const blocks = days.length >= 16 ? 8 : 4, blockOf = new Map(days.map((d, i) => [d, Math.floor((i * blocks) / days.length)]));
  const variants = expand(fam.grid).slice(0, opt.limit || Infinity);
  const rows = [], byKey = new Map();
  for (const params of variants) {
    const trades = tradesFor(fam, params, bars, ctx);
    const tT = trades.filter((t) => tune.has(t.day)), tU = trades.filter((t) => !tune.has(t.day));
    const sa = basic(trades), su = basic(tU), st = basic(tT);
    const blockNet = Array(blocks).fill(0);
    for (const t of trades) blockNet[blockOf.get(t.day)] += t.usd;
    const v = { key: keyOf(params), params,
      tune: { n: st.trades, net: st.net, pf: pf(tT) },
      unseen: { n: su.trades, net: su.net, pf: pf(tU), maxDrawdown: su.maxDrawdown },
      all: { n: sa.trades, net: sa.net, maxDrawdown: sa.maxDrawdown, worstDay: sa.worstDay ? sa.worstDay.usd : 0 },
      blockNet, trades };
    rows.push(v); byKey.set(v.key, v);
  }
  // PBO needs at least two variations that traded; with none it would read 0% ("no overfitting") when it means "no data"
  const pbo = rows.filter((r) => r.all.n > 0).length >= 2 ? probabilityOfOverfitting(rows.map((r) => r.blockNet), blocks) : null;
  for (const v of rows) {
    const nb = neighbours(v.params, fam.grid, byKey);
    v.neighbours = { count: nb.length, medianUnseen: median(nb.map((x) => x.unseen.net)) };
    v.survivor = isSurvivor(v, pbo);
  }
  const ranked = rows.filter((r) => r.tune.n >= RULE.minTuneTrades).sort((a, b) => b.tune.net - a.tune.net);
  const strip = (v) => { const { trades, blockNet, ...rest } = v; return rest; };
  const survivors = rows.filter((r) => r.survivor).sort((a, b) => b.unseen.net - a.unseen.net).slice(0, 10).map((v) => {
    const daily = new Map(days.map((d) => [d, 0]));
    for (const t of v.trades) daily.set(t.day, daily.get(t.day) + t.usd);
    return { ...strip(v), lucid50k: simulate([...daily.values()], { runs: 5000 }) };
  });
  const top = ranked.slice(0, 10).map(strip);
  const withTrades = rows.filter((r) => r.all.n > 0).length;
  const unseenPositive = rows.filter((r) => r.unseen.n > 0 && r.unseen.net > 0).length;
  const best = ranked[0];
  return {
    id: fam.id, name: fam.name, registry: fam.registry,
    data: { file: set.file, from: days[0], to: days[days.length - 1], sessions: days.length, tuneSessions: nTune, unseenSessions: days.length - nTune, unseenFrom: days[nTune] },
    variants: rows.length, withTrades, unseenPositive, blocks, pbo,
    bestTuned: best ? strip(best) : null,
    top, survivors,
    verdict: verdict(fam, rows.length, days.length - nTune, best, pbo, survivors.length),
  };
}

function verdict(fam, n, unseenSessions, best, pbo, survivors) {
  if (survivors) return `${survivors} of ${n} variations passed every check and go to the paper forward test.`;
  if (!best) return `None of the ${n} variations traded enough to rank. More candles needed.`;
  const u = best.unseen, money = (x) => (x < 0 ? '-$' : '+$') + Math.abs(Math.round(x)).toLocaleString('en-US');
  const bits = [`Best on the tuning sessions: ${money(best.tune.net)} over ${best.tune.n} trades; on the ${unseenSessions} unseen sessions it made ${money(u.net)} over ${u.n} trades.`];
  if (pbo !== null && pbo > 0.5) bits.push(`Overfitting is likely (PBO ${Math.round(pbo * 100)}%): the best tuned variations usually end up below average on data they didn't see.`);
  else if (pbo !== null) bits.push(`PBO ${Math.round(pbo * 100)}%.`);
  if (u.n < RULE.minUnseenTrades) bits.push(`Under ${RULE.minUnseenTrades} unseen trades, so no variation can pass yet. It re-runs every night as candles arrive.`);
  else bits.push('No variation passed every check.');
  return bits.join(' ');
}

function runAll(data, opt = {}) {
  const families = FAMILIES.filter((f) => !opt.only || opt.only.includes(f.id));
  const started = Date.now();
  const results = families.map((f) => runFamily(f, data, opt));
  return { rule: RULE, tuneShare: TUNE_SHARE, costStress: COST_STRESS, variants: results.reduce((a, r) => a + (r.variants || 0), 0), seconds: Math.round((Date.now() - started) / 100) / 10, families: results };
}

module.exports = { expand, keyOf, parseKey, tradesFor, probabilityOfOverfitting, neighbours, isSurvivor, runFamily, runAll, RULE, FAMILIES };

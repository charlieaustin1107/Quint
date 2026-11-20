'use strict';
// Tests for the strategy factory. The family code must reproduce the bot lab exactly, the overfitting check must tell
// noise from a real edge, and no variation may use candles from the future.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const engine = require('../factory/engine');
const { FAMILIES } = require('../factory/families');
const { loadData, loadDaily } = require('../run');
const W = require('../factory/wyld');
const candles = require('../lib/candles');
const { run } = require('../../quint-control/botlab/botlab');
const noise = require('../../quint-control/proof/noise_momentum');

const data = { ...loadData(), daily: loadDaily() };
const fam = (id) => FAMILIES.find((f) => f.id === id);
const sum = (ts) => Math.round(ts.reduce((a, t) => a + t.usd, 0));
const tradesOf = (id, p, bars, ctx) => { const f = fam(id), b = bars || data[parseInt(f.data, 10)].bars; return engine.tradesFor(f, p, b, ctx || (f.context ? f.context(b, data) : {})); };

test('grids: every variation is listed once, and keys round-trip', () => {
  for (const f of FAMILIES) {
    const vs = engine.expand(f.grid), keys = new Set(vs.map(engine.keyOf));
    assert.equal(keys.size, vs.length, f.id);
    assert.equal(vs.length, Object.values(f.grid).reduce((a, v) => a * v.length, 1));
    assert.deepEqual(engine.parseKey(engine.keyOf(vs[7 % vs.length]), f.grid), vs[7 % vs.length]);
  }
});

test('families reproduce the bot lab exactly with the bot lab settings', () => {
  const b5 = data[5].bars, b15 = data[15].bars;
  const same = (a, b) => { assert.equal(a.length, b.length); assert.equal(sum(a), sum(b)); };
  same(tradesOf('breakout', { n: 20, stopAtr: 2, targetR: 3, side: 'both', maxTrades: 2 }), run(b15, 3).trades);
  same(tradesOf('orb', { rangeMin: 15, cutoffMin: 120, stop: 'range', targetR: 2, side: 'both' }), run(b5, 1).trades);
  same(tradesOf('vwap-fade', { sd: 2, stopBars: 3, minRR: 1, start: 30, end: 330, maxTrades: 2 }), run(b5, 10).trades);
  same(tradesOf('gap-fade', { minGap: 0.002, maxGap: 0.01, cutoff: 120, target: 'close' }), run(b5, 6).trades);
  same(tradesOf('noise', { lookbackDays: 14, volatilityMultiplier: 1, checkEvery: 30 }), noise.run(b15).trades);
});

test('WYLD family: the indicator\'s rules, stops on the right side, and no candles from the future', () => {
  // With the sweep pillar skipped there are enough trades on 4 weeks of 5-minute candles to check the mechanics.
  const p = { pools: 'eq+pd+on', confirm: 'any', stopBufTicks: 2, be: '1R', skip: 'sweep' };
  const all = tradesOf('wyld', p);
  assert.ok(all.length > 0, 'it should trade with the sweep pillar skipped');
  for (const t of all) {
    assert.ok(t.dir === 1 || t.dir === -1);
    assert.ok(t.risk > 0);
    if (t.why === 'stop') assert.ok(t.r < 0, 'a full stop loses');
    assert.ok(W.CONFIRMS.includes(t.tag.confirm), t.tag.confirm);
  }
  // cut every candle set after the 10th session: every trade before the cut must be identical
  const bars = data[5].bars, days = noise.sessions(bars).days.map((d) => d.day), cut = days[10];
  const before = (arr) => arr.filter((b) => noise.nyTime(b.t).day < cut);
  const early = tradesOf('wyld', p, before(bars), { b15: before(data[15].bars), daily: data.daily.bars.filter((b) => W.tradeDate(b.t) < cut) });
  assert.deepEqual(early, all.filter((t) => t.day < cut));
  // every confirmation can be the entry on its own
  for (const confirm of W.CONFIRMS) assert.ok(tradesOf('wyld', { ...p, confirm }).length > 0, confirm);
});

test('WYLD funnel: each step can only keep or lose setups, never gain them', () => {
  for (const opt of [{}, { usePdPools: true, useOnPools: true }, { skip: 'sweep' }]) {
    const f = W.run(data[5].bars, data[15].bars, data.daily.bars, opt).funnel;
    assert.equal(f.holds + f.noHold <= f.sweeps, true, 'holds');
    assert.ok(f.pdrs + f.noPointB <= f.holds, 'pdrs');
    assert.ok(f.entries <= f.confirmations, 'entries');
    assert.ok(f.confirmations === 0 || f.pdrs > 0, 'confirmations need a PDR');
  }
});

test('overfitting check: noise scores near 50%, a real edge near 0%', () => {
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  const noiseMatrix = Array.from({ length: 200 }, () => Array.from({ length: 8 }, () => rnd() * 1000));
  const p = engine.probabilityOfOverfitting(noiseMatrix, 8);
  assert.ok(p > 0.25 && p < 0.75, `noise PBO ${p}`);
  const edge = noiseMatrix.map((row, i) => (i === 0 ? row.map((x) => x + 5000) : row));
  assert.equal(engine.probabilityOfOverfitting(edge, 8), 0);
});

test('survivor rule: every check must pass', () => {
  const good = { unseen: { n: 40, net: 1500, pf: 1.5 }, all: { maxDrawdown: 900, worstDay: -400 }, neighbours: { medianUnseen: 300 } };
  assert.equal(engine.isSurvivor(good, 0.2), true);
  assert.equal(engine.isSurvivor(good, 0.5), false); // family overfit
  assert.equal(engine.isSurvivor({ ...good, unseen: { ...good.unseen, n: 20 } }, 0.2), false); // too few trades
  assert.equal(engine.isSurvivor({ ...good, unseen: { n: 40, net: 90, pf: 1.3 } }, 0.2), false); // dies at double costs
  assert.equal(engine.isSurvivor({ ...good, neighbours: { medianUnseen: -10 } }, 0.2), false); // a lone spike
  assert.equal(engine.isSurvivor({ ...good, all: { maxDrawdown: 2400, worstDay: -400 } }, 0.2), false); // too deep for Lucid
});

test('a family run reports honestly on a small slice', () => {
  const r = engine.runFamily(fam('orb'), data, { limit: 30 });
  assert.equal(r.variants, 30);
  assert.ok(r.data.tuneSessions > r.data.unseenSessions);
  assert.ok(r.pbo === null || (r.pbo >= 0 && r.pbo <= 1));
  assert.match(r.verdict, /variations|tuning/);
});

test('the lab can run a frozen factory variation in the paper forward test', () => {
  const lab = require('../run');
  const r = lab.runOne({ id: 'x', name: 'Noise test', runner: 'factory:noise:lookbackDays=14;volatilityMultiplier=1;checkEvery=30', frozenAt: '2026-11-18' }, data);
  assert.equal(r.score.trades, noise.run(data[15].bars).trades.length);
  assert.equal(r.bot, null);
  assert.match(lab.runOne({ id: 'y', name: 'y', runner: 'factory:nope:a=1', frozenAt: null }, data).skipped, /no factory family/);
});

test('candle store and factory agree on the data they read', () => {
  const b5 = candles.read(path.join(__dirname, '..', 'data', 'mnq_5m.csv'));
  assert.equal(b5.length, data[5].bars.length);
});

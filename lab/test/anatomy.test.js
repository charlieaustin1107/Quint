'use strict';
// Tests for the sequence analyst: honest statistics, a funnel that only narrows, no verdicts on too few trades, and
// no claim that anything is profitable.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../brain/anatomy');
const { loadData, loadDaily } = require('../run');

test('bootstrap: reproducible, brackets the average, and a constant sample has no spread', () => {
  const xs = [-1, -1, 2, -1, 3, 0.5, -1, 2.2, -0.4, 1];
  const a = A.bootstrap(xs), b = A.bootstrap(xs);
  assert.deepEqual(a, b, 'same seed, same answer');
  assert.ok(a.lo <= a.mean && a.mean <= a.hi);
  const c = A.bootstrap([1.5, 1.5, 1.5]);
  assert.equal(c.lo, 1.5); assert.equal(c.hi, 1.5);
  const d = A.bootstrapDiff(xs, xs);
  assert.equal(d.diff, 0); assert.ok(d.lo <= 0 && d.hi >= 0, 'identical samples: the range must include 0');
  assert.deepEqual(A.bootstrap([]), { mean: null, lo: null, hi: null });
});

test('post-mortem counts losers that were in profit first and winners that nearly stopped', () => {
  const t = (usd, mfe, mae, why, mins) => ({ usd, mfe, mae, why, mins, r: usd / 50 });
  const pm = A.postMortem([t(-50, 1.2, 1, 'stop', 5), t(-50, 0.6, 1, 'stop', 10), t(-50, 0.1, 1, 'stop', 15), t(100, 2, 0.8, 'target', 40), t(60, 1.3, 0.2, 'close', 60)]);
  assert.equal(pm.losers, 3); assert.equal(pm.losersUp1R, 1); assert.equal(pm.losersUpHalfR, 2);
  assert.equal(pm.winners, 2); assert.equal(pm.winnersDeepMae, 1);
  assert.deepEqual(pm.exits, { stop: 3, target: 1, close: 1 });
  assert.equal(pm.medianMinsLoss, 10);
});

test('the analysis on the lab\'s candles: funnels narrow, no verdict below 30 trades, never "profitable"', () => {
  const a = A.analyse({ ...loadData(), daily: loadDaily() }, { queue: ['one-minute-data'] });
  assert.ok(!a.skipped, a.skipped);
  assert.equal(Object.keys(a.runs).length, A.RUNS.length);
  for (const r of Object.values(a.runs)) {
    const f = r.funnel;
    assert.ok(f.holds + f.noHold <= f.sweeps && f.pdrs <= f.holds && f.entries <= f.confirmations, r.id);
    assert.ok(r.n <= f.entries, r.id);
  }
  for (const p of a.pillars) if (p.withN < A.MIN_TRADES || p.withoutN < A.MIN_TRADES) assert.equal(p.verdict, 'too few trades to judge', p.pillar);
  const text = [...a.lessons, A.report(a)].join('\n');
  assert.doesNotMatch(text, /profitable/i);
  for (const p of a.proposals) { assert.ok(p.id && p.rules && p.passMark && p.why, p.id); assert.equal(typeof p.alreadyQueued, 'boolean'); }
  const q = a.proposals.find((p) => p.id === 'one-minute-data');
  if (q) assert.equal(q.alreadyQueued, true);
  for (const h of ['## What Quint learned tonight', '## The funnel', '## Each pillar', '## Each confirmation', '## Proposals']) assert.ok(A.report(a).includes(h), h);
});

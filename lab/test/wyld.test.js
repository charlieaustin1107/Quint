'use strict';
// The WYLD backtest copy (and the indicator it mirrors): a prior-day high that price ran overnight is already taken
// by 9:30, so it can't start a setup; one that is first run after 9:30 is a real sweep.
const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../factory/wyld');

const utc = (s) => Date.parse(s) / 1000;
// Daily candles are stamped at the 18:00 New York session open the evening before (23:00 UTC in November).
const daily = [
  { t: utc('2026-11-15T23:00:00Z'), o: 26950, h: 27020, l: 26880, c: 27000, v: 1 }, // Mon 16 Nov
  { t: utc('2026-11-16T23:00:00Z'), o: 27000, h: 27100, l: 26900, c: 27050, v: 1 }, // Tue 17 Nov: the prior day for Wednesday
  { t: utc('2026-11-17T23:00:00Z'), o: 27050, h: 27150, l: 27000, c: 27100, v: 1 }, // Wed 18 Nov
];
// Five-minute candles for Wednesday's session, from Tuesday 18:00 to Wednesday 11:00 New York, drifting near 27,050.
// `overnightHigh` is the high of one candle at 03:00 New York; `openHigh` the high of the 9:45 candle.
function session(overnightHigh, openHigh) {
  const bars = [];
  for (let t = utc('2026-11-17T23:00:00Z'); t < utc('2026-11-18T16:00:00Z'); t += 300) {
    const ny = (t - utc('2026-11-17T23:00:00Z')) / 60 + 18 * 60; // minutes since Tuesday 00:00 New York
    let h = 27060, l = 27040;
    if (ny === (24 + 3) * 60) h = overnightHigh; // 03:00 New York
    if (ny === (24 + 9) * 60 + 45) h = openHigh; // 9:45 New York
    bars.push({ t, o: 27050, h, l, c: 27050, v: 10 });
  }
  return bars;
}

test('a prior-day high run overnight is already taken by 9:30: no setup starts', () => {
  const r = W.run(session(27120, 27110), [], daily, { usePdPools: true, useOnPools: false });
  assert.equal(r.funnel.sweeps, 0, 'taken overnight, so not a 9:45 sweep');
  assert.ok(r.funnel.takenOvernight >= 1);
});

test('a prior-day high first run after 9:30 is a real sweep', () => {
  const r = W.run(session(27090, 27110), [], daily, { usePdPools: true, useOnPools: false });
  assert.equal(r.funnel.sweeps, 1);
  assert.deepEqual(r.funnel.sweepKinds, { PDH: 1 }, 'labelled as the prior day\'s high');
  assert.equal(r.funnel.takenOvernight, 0);
});

test('with WYLD\'s own pools only, the prior-day high is not a pool at all', () => {
  const r = W.run(session(27090, 27110), [], daily, { usePdPools: false, useOnPools: false });
  assert.equal(r.funnel.sweeps, 0);
});

test('the owner\'s choice: prior-day and overnight highs and lows count as pools by default', () => {
  assert.equal(W.DEFAULTS.usePdPools, true);
  assert.equal(W.DEFAULTS.useOnPools, true);
});

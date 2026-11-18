'use strict';
// The one-week proof's JavaScript version: the paper's rules on made-up candles where the right answer is known.
const test = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('../proof/noise_momentum');

// 30-minute New York bars from 9:30 to 16:00 (13 a day), weekdays from Monday 2 Nov 2026 (after the clocks change, so 9:30 New York = 14:30 UTC)
function makeDays(paths) {
  const bars = [];
  let day = Date.UTC(2026, 10, 2, 14, 30) / 1000;
  for (const closes of paths) {
    while ([0, 6].includes(new Date(day * 1000).getUTCDay())) day += 86400;
    let prev = closes.open;
    closes.c.forEach((c, i) => { bars.push({ t: day + i * 1800, o: prev, h: Math.max(prev, c), l: Math.min(prev, c), c, v: 1000 }); prev = c; });
    day += 86400;
  }
  return bars;
}
const quiet = () => ({ open: 100, c: Array.from({ length: 13 }, (_, i) => (i % 2 ? 99.9 : 100.1)) }); // moves 0.1% from the open all day

test('a day that breaks out of the noise area is bought at the next half hour and held to the close', () => {
  const trend = { open: 100, c: [100.5, 100.6, 100.7, 100.8, 100.9, 101, 101.1, 101.2, 101.3, 101.4, 101.5, 101.6, 101.7] };
  const r = run(makeDays([...Array(14)].map(quiet).concat([quiet(), trend])), { slippageTicksPerSide: 0, commissionPerSide: 0, pointValue: 1, tick: 0.01 });
  assert.equal(r.trades.length, 1);
  const t = r.trades[0];
  assert.equal(t.dir, 1);
  assert.equal(t.entry, 100.5, 'filled at the open of the bar after the 10:00 check');
  assert.equal(t.why, 'close');
  assert.equal(t.exit, 101.7);
});

test('the noise area must be learned first: nothing trades in the first 14 days', () => {
  const trend = { open: 100, c: [101, 101.1, 101.2, 101.3, 101.4, 101.5, 101.6, 101.7, 101.8, 101.9, 102, 102.1, 102.2] };
  const r = run(makeDays([...Array(10)].map(quiet).concat([trend])));
  assert.equal(r.trades.length, 0);
});

test('a long that falls through the lower boundary is reversed into a short', () => {
  const flip = { open: 100, c: [100.5, 100.6, 99.5, 99.4, 99.3, 99.2, 99.1, 99, 98.9, 98.8, 98.7, 98.6, 98.5] };
  const r = run(makeDays([...Array(15)].map(quiet).concat([flip])), { slippageTicksPerSide: 0, commissionPerSide: 0, pointValue: 1, tick: 0.01 });
  assert.deepEqual(r.trades.map((t) => [t.dir, t.why]), [[1, 'reverse'], [-1, 'close']]);
});

test('a long is stopped when price closes back under VWAP at a half-hour check', () => {
  const fade = { open: 100, c: [100.6, 100.7, 100.2, 100.2, 100.2, 100.2, 100.2, 100.2, 100.2, 100.2, 100.2, 100.2, 100.2] };
  const r = run(makeDays([...Array(15)].map(quiet).concat([fade])), { slippageTicksPerSide: 0, commissionPerSide: 0, pointValue: 1, tick: 0.01 });
  assert.equal(r.trades.length, 1);
  assert.equal(r.trades[0].why, 'stop');
});

test('costs: $0.50 a side and a tick of slippage each way come off every MNQ trade', () => {
  const trend = { open: 100, c: [100.5, 100.6, 100.7, 100.8, 100.9, 101, 101.1, 101.2, 101.3, 101.4, 101.5, 101.6, 101.7] };
  const bars = makeDays([...Array(15)].map(quiet).concat([trend]));
  const clean = run(bars, { slippageTicksPerSide: 0, commissionPerSide: 0 }).trades[0].usd, real = run(bars).trades[0].usd;
  assert.equal(Math.round((clean - real) * 100) / 100, 2 * 0.25 * 2 + 2 * 0.5, '1 tick each way on MNQ is $1, commission is $1');
});

test('candle files saved with Windows line endings still read the volume column', () => {
  const fs = require('fs'), os = require('os'), path = require('path');
  const { readCsv } = require('../proof/noise_momentum');
  const file = path.join(os.tmpdir(), 'quint-crlf-test.csv');
  fs.writeFileSync(file, 't,o,h,l,c,v\r\n1793640600,100,101,99,100.5,1200\r\n1793640660,100.5,101,100,100.75,800\r\n');
  const rows = readCsv(file);
  fs.unlinkSync(file);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].v, 1200);
  assert.equal(rows[1].v, 800);
});

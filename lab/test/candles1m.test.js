'use strict';
// Tests for building 5- and 15-minute candles from 1-minute candles: exact where they overlap the stored candles,
// nothing written on a difference or a gap, and a forming period never saved early.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const c = require('../lib/candles');

const T0 = 1795000500; // a 15-minute boundary (so also a 5-minute one)
function minutes(from, n, start = 27000) { // n 1-minute candles from time `from`, drifting up a tick a minute
  return Array.from({ length: n }, (_, i) => { const p = start + i * 0.25; return { t: from + 60 * i, o: p, h: p + 1, l: p - 1, c: p + 0.25, v: 10 }; });
}
function setup(one, five) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'c1m-'));
  const f = { one: path.join(dir, '1.csv'), five: path.join(dir, '5.csv'), fifteen: path.join(dir, '15.csv') };
  c.write(f.one, one); c.write(f.five, five); c.write(f.fifteen, []);
  return f;
}

test('from1m: periods built exactly, a quiet minute is fine, the forming period waits', () => {
  const one = minutes(T0, 13); // 2 full periods and 3 minutes of a third
  one.splice(6, 1); // no trades in the second period's second minute
  const five = c.from1m(one, 5);
  assert.equal(five.length, 2, 'the third period is still forming');
  assert.deepEqual(five[0], { t: T0, o: 27000, h: 27002, l: 26999, c: 27001.25, v: 50 });
  assert.equal(five[1].t, T0 + 300);
  assert.equal(five[1].v, 40, 'four minutes traded');
});

test('rebuildFrom1m: checks the overlap, then extends the 5- and 15-minute stores', () => {
  const one = minutes(T0, 60);
  const truth = c.from1m(one, 5); // 12 five-minute candles
  const f = setup(one, truth.slice(0, 6)); // the store has the first 6
  const r = c.rebuildFrom1m(f.one, f.five, f.fifteen);
  assert.equal(r.status, 'OK');
  assert.equal(r.checked, 5, 'the newest stored candle is left out of the check');
  assert.deepEqual(c.read(f.five), truth);
  assert.equal(c.read(f.fifteen).length, 4);
});

test('rebuildFrom1m: a difference or a gap writes nothing', () => {
  const one = minutes(T0, 60), truth = c.from1m(one, 5);
  const bad = truth.slice(0, 6).map((b, i) => (i === 2 ? { ...b, h: b.h + 0.25 } : b));
  const f = setup(one, bad);
  const before = fs.readFileSync(f.five, 'utf8');
  const r = c.rebuildFrom1m(f.one, f.five, f.fifteen);
  assert.equal(r.status, 'MISMATCH'); assert.equal(r.mismatched, 1);
  assert.equal(fs.readFileSync(f.five, 'utf8'), before);
  const g = setup(minutes(T0 + 3600, 30), truth.slice(0, 6)); // 1-minute candles start an hour after the store ends
  const before2 = fs.readFileSync(g.five, 'utf8');
  assert.equal(c.rebuildFrom1m(g.one, g.five, g.fifteen).status, 'GAP');
  assert.equal(fs.readFileSync(g.five, 'utf8'), before2);
});

test('from1m: a period the 1-minute candles start part-way through is left out', () => {
  const one = minutes(T0 + 120, 13); // starts 2 minutes into a period
  const five = c.from1m(one, 5);
  assert.equal(five[0].t, T0 + 300, 'the part-period is skipped');
  assert.equal(five.length, 2);
});

test('rebuildFrom1m: an old difference between the feeds doesn\'t block the nightly build', () => {
  const one = minutes(T0, 60 * 4), truth = c.from1m(one, 5); // 4 hours, 48 five-minute candles
  const stored = truth.slice(0, 40).map((b, i) => (i === 3 ? { ...b, c: b.c - 1.75 } : b)); // differs 3 hours before the end
  const f = setup(one, stored);
  const r = c.rebuildFrom1m(f.one, f.five, f.fifteen);
  assert.equal(r.status, 'OK');
  assert.equal(r.checked, 24, 'only the 2 hours before the newest stored candle are checked');
  const out = c.read(f.five);
  assert.equal(out.length, 48);
  assert.equal(out[3].c, stored[3].c, 'stored candles are never rewritten from the other feed');
});

test('rebuildFrom1m: a stored candle saved while forming is replaced by the finished one', () => {
  const one = minutes(T0, 30), truth = c.from1m(one, 5);
  const forming = truth.slice(0, 3).map((b, i) => (i === 2 ? { ...b, h: b.h - 0.5, c: b.o } : b));
  const f = setup(one, forming);
  assert.equal(c.rebuildFrom1m(f.one, f.five, f.fifteen).status, 'OK');
  assert.deepEqual(c.read(f.five), truth);
});

'use strict';
// The bot lab's JavaScript reference: shared rules for every bot, and the key rule of several bots on made-up candles
// where the right answer is known.
const test = require('node:test');
const assert = require('node:assert/strict');
const { run, BOTS, NAMES } = require('../botlab/botlab');

const START = Date.UTC(2026, 10, 2, 14, 30) / 1000; // Monday 2 Nov 2026, 9:30 New York (14:30 UK)

// days: arrays of candles { c, o?, h?, l?, v? }, each tf minutes long from 9:30 New York, on weekdays
function build(days, tf) {
  const out = [];
  let t0 = START;
  for (const bars of days) {
    while ([0, 6].includes(new Date(t0 * 1000).getUTCDay())) t0 += 86400;
    let prev = bars[0].o !== undefined ? bars[0].o : bars[0].c;
    bars.forEach((b, i) => {
      const o = b.o !== undefined ? b.o : prev;
      out.push({ t: t0 + i * tf * 60, o, h: b.h !== undefined ? b.h : Math.max(o, b.c), l: b.l !== undefined ? b.l : Math.min(o, b.c), c: b.c, v: b.v || 1000 });
      prev = b.c;
    });
    t0 += 86400;
  }
  return out;
}
const flat = (n, price) => Array.from({ length: n }, () => ({ c: price }));
const pad = (bars, n, price) => bars.concat(flat(n - bars.length, price));

function randomDays(count, seed) {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let p = 20000;
  const days = [];
  for (let d = 0; d < count; d++) {
    const bars = [];
    for (let i = 0; i < 390; i++) {
      const o = p, c = Math.round((p + (rnd() - 0.5) * 12) * 4) / 4;
      bars.push({ o, c, h: Math.max(o, c) + Math.round(rnd() * 8) / 4, l: Math.min(o, c) - Math.round(rnd() * 8) / 4, v: 500 + Math.floor(rnd() * 1500) });
      p = c;
    }
    days.push(bars);
  }
  return days;
}

test('every bot runs on 1-minute candles and keeps the shared rules', () => {
  const bars = build(randomDays(25, 7), 1);
  assert.equal(NAMES.length - 1, 12);
  for (let n = 1; n < BOTS.length; n++) {
    const r = run(bars, n), max = BOTS[n]().maxTrades, perDay = {};
    for (const t of r.trades) {
      assert.ok(t.from >= 1 && t.to <= 390, `${r.name}: a trade outside 9:30-16:00`);
      assert.ok(t.to >= t.from, `${r.name}: a trade ended before it started`);
      assert.equal(Math.round(t.usd * 100), Math.round(((t.exit - t.entry) * t.dir * 2 - 1) * 100), `${r.name}: costs don't add up`);
      perDay[t.day] = (perDay[t.day] || 0) + 1;
    }
    for (const [day, c] of Object.entries(perDay)) assert.ok(c <= max, `${r.name}: ${c} trades on ${day}, more than ${max}`);
  }
});

test('a bot whose candles are longer than the file runs, and one whose candles are shorter is refused', () => {
  const five = build(randomDays(3, 3).map((d) => d.filter((x, i) => i % 5 === 4)), 5);
  assert.doesNotThrow(() => run(five, 1));
  assert.throws(() => run(five, 5), /needs 1-minute candles/);
});

// 1. New York open breakout: range 19,990-20,010, a 9:50 close at 20,015, target 2R = 20,065
const orDay = (after) => pad([{ o: 20000, h: 20010, l: 19990, c: 20005 }, { c: 20008, h: 20010, l: 20000 }, { c: 20002, h: 20009, l: 19995 }, { c: 20015, h: 20016, l: 20001 }].concat(after), 78, 20070);

test('New York open breakout: a close above the first 15 minutes buys, with the stop at the range low and a 2R target', () => {
  const r = run(build([orDay([{ c: 20030 }, { c: 20050 }, { c: 20070 }])], 5), 1);
  assert.equal(r.trades.length, 1);
  const t = r.trades[0];
  assert.deepEqual([t.dir, t.why, t.entry, t.exit], [1, 'target', 20015.25, 20065]);
  assert.equal(t.usd, (20065 - 20015.25) * 2 - 1);
});

test('when one candle reaches both the stop and the target, the stop counts', () => {
  const r = run(build([orDay([{ c: 20020, h: 20070, l: 19985 }])], 5), 1);
  assert.deepEqual([r.trades[0].why, r.trades[0].exit], ['stop', 19989.75]);
});

test('New York open breakout trades once a day at most', () => {
  const r = run(build([orDay([{ c: 19980 }, { c: 20020 }, { c: 19980 }, { c: 20020 }])], 5), 1);
  assert.equal(r.trades.length, 1);
});

test('gap fade: a 0.5% gap up and a red first candle sells, aiming at yesterday\'s close', () => {
  const day2 = pad([{ o: 20100, h: 20110, l: 20040, c: 20060 }, { c: 20050 }, { c: 20030 }, { c: 19995 }], 78, 19995);
  const r = run(build([flat(78, 20000), day2], 5), 6);
  assert.equal(r.trades.length, 1);
  const t = r.trades[0];
  assert.deepEqual([t.dir, t.why, t.entry, t.exit], [-1, 'target', 20059.75, 20000]);
});

test('failed breakout: a poke above yesterday\'s high that closes back under it sells', () => {
  const day1 = pad([{ o: 20000, h: 20050, l: 19990, c: 20000 }], 78, 20000);
  const day2 = pad([{ c: 20010 }, { c: 20020 }, { c: 20030, h: 20060, l: 20020 }, { c: 20040 }], 78, 20040);
  const r = run(build([day1, day2], 5), 11);
  assert.equal(r.trades.length, 1);
  assert.equal(r.trades[0].dir, -1);
});

test('noise-area momentum: a breakout day after 14 quiet ones is bought at 10:00 and held to the close', () => {
  const quiet = () => Array.from({ length: 13 }, (x, i) => ({ c: i % 2 ? 99.9 : 100.1, o: 100 }));
  const trend = [100.5, 100.6, 100.7, 100.8, 100.9, 101, 101.1, 101.2, 101.3, 101.4, 101.5, 101.6, 101.7].map((c, i) => (i ? { c } : { c, o: 100 }));
  const r = run(build([...Array(15)].map(quiet).concat([trend]), 30), 12, { tick: 0.01, slippageTicks: 0, commissionPerSide: 0, pointValue: 1 });
  assert.equal(r.trades.length, 1);
  assert.deepEqual([r.trades[0].dir, r.trades[0].why, r.trades[0].entry], [1, 'close', 100.5]);
});

test('the daily loss limit stops new entries for the rest of the day', () => {
  const zigzag = Array.from({ length: 390 }, (x, i) => ({ c: 20000 + (i % 2 ? 6 : -6) }));
  const free = run(build([zigzag], 1), 5), limited = run(build([zigzag], 1), 5, { dailyLossLimit: 1 });
  assert.ok(free.trades.length > 10);
  assert.ok(limited.trades.length <= 2, `${limited.trades.length} trades`);
});

test('the NinjaScript version has the same twelve bots, candles and trade limits as the reference', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'botlab', 'QuintBotLab.cs'), 'utf8');
  const cs = [...src.matchAll(/Name = "([^"]+)"; Tf = (\d+); MaxTrades = (\d+)/g)].map((m) => [m[1], +m[2], +m[3]]);
  const js = BOTS.slice(1).map((f) => { const b = f(); return [b.name, b.tf, b.maxTrades]; });
  assert.deepEqual(cs, js);
  assert.match(src, /StartsWith\("Sim"/, 'the lab must refuse real accounts');
  assert.match(src, /m >= Last - 1 && pos != 0/, 'the lab must go flat at 15:59');
});

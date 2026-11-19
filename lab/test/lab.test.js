'use strict';
// Tests for Quint Lab. Run: node --test lab/test/   (or: npm test --prefix lab)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { score, basic } = require('../lib/score');
const { simulate, rng } = require('../lib/prop');
const candles = require('../lib/candles');
const lab = require('../run');
const { build } = require('../roundup');

const T = (day, usd, dir = 1) => ({ day, usd, dir });

test('scorecard: profit factor, drawdown, losing streak, best day', () => {
  const trades = [T('2026-01-01', 100), T('2026-01-01', -50), T('2026-01-02', -50), T('2026-01-02', -25, -1), T('2026-01-03', 300, -1)];
  const s = score(trades);
  assert.equal(s.trades, 5);
  assert.equal(s.net, 275);
  assert.equal(s.profitFactor, 400 / 125);
  assert.equal(s.maxDrawdown, 125); // +100 down to -25
  assert.equal(s.longestLosingStreak, 3);
  assert.deepEqual(s.bestDay, { day: '2026-01-03', usd: 300 });
  assert.deepEqual(s.worstDay, { day: '2026-01-02', usd: -75 });
  assert.equal(s.withoutBestDay, -25);
  assert.equal(s.checks.notOneLuckyDay, false); // all the profit came from one day
  assert.equal(s.long.net, 0);
  assert.equal(s.short.net, 275);
  assert.equal(s.firstHalf.trades + s.secondHalf.trades, 5);
});

test('scorecard: grades are strict', () => {
  assert.equal(score([]).grade, 'No trades');
  assert.equal(score([T('2026-01-01', -10)]).grade, 'Loses money');
  assert.equal(score([T('2026-01-01', 10)]).grade, 'Too few trades');
  const steady = Array.from({ length: 120 }, (_, i) => T(`2026-01-${String(1 + (i % 28)).padStart(2, '0')}-${i}`, i % 3 ? 40 : -30));
  assert.equal(score(steady).grade, 'Candidate');
});

test('scorecard: double costs takes $2.50 more a trade', () => {
  const s = score([T('d1', 10), T('d2', 10)]);
  assert.equal(s.doubleCostsNet, 15);
  assert.equal(basic([T('d1', 10)], 2.5).net, 7.5);
});

test('Lucid 50K: a steady winner passes, a steady loser fails, and the answer is repeatable', () => {
  const win = simulate([600, 500, 700], { runs: 2000 });
  assert.equal(win.pPass, 1);
  assert.equal(win.pFail, 0);
  assert.ok(win.medianDaysToPass >= 5 && win.medianDaysToPass <= 6);
  const lose = simulate([-300], { runs: 100 });
  assert.equal(lose.pFail, 1);
  assert.equal(lose.red, true);
  assert.deepEqual(simulate([400, -300, 50, 0], { runs: 3000 }), simulate([400, -300, 50, 0], { runs: 3000 }));
  const a = rng(1), b = rng(1);
  assert.equal(a(), b());
});

test('Lucid 50K: the consistency rule holds back a pass made on one huge day', () => {
  // +$3,500 in one day is 100% of the profit, over the 40% cap, so it doesn't pass that day...
  assert.equal(simulate([3500], { runs: 100, rules: { maxDays: 1 } }).pPass, 0);
  // ...and it does when the rule is switched off.
  assert.equal(simulate([3500], { runs: 100, rules: { maxDays: 1, consistency: 1 } }).pPass, 1);
  // Three +$3,500 days spread the profit (each is 33%), so it passes on day 3.
  const r = simulate([3500], { runs: 100, rules: { maxDays: 3 } });
  assert.equal(r.pPass, 1);
  assert.equal(r.medianDaysToPass, 3);
});

test('Lucid 50K: the max-loss floor trails, then locks at $50,100', () => {
  // Day 1 -$2,300 fails at once (47,700 is under the 48,000 floor): half the runs.
  // Day 1 +$2,500 lifts the high to 52,500, so the floor locks at 50,100 rather than trailing to 50,500;
  // a -$2,300 day 2 then leaves 50,200 and survives. Without the lock it would fail, and pFail would be 75%.
  const r = simulate([2500, -2300], { runs: 4000, rules: { maxDays: 2 } });
  assert.ok(r.pFail > 0.45 && r.pFail < 0.55, `pFail ${r.pFail}`);
  assert.equal(r.pPass, 0);
});

test('candles: merges TradingView rows and columns, drops duplicates, newest copy wins', () => {
  const old = [{ t: 60, o: 1, h: 2, l: 0, c: 1, v: 5 }, { t: 120, o: 1, h: 2, l: 0, c: 1.5, v: 5 }];
  const rows = candles.fromTradingView({ bars: [{ t: 120, o: 1, h: 2, l: 0, c: 1.75, v: 9 }, { t: 180, o: 2, h: 3, l: 1, c: 2, v: 1 }] });
  const { bars, added } = candles.merge(old, rows);
  assert.equal(added, 1);
  assert.deepEqual(bars.map((b) => b.t), [60, 120, 180]);
  assert.equal(bars[1].c, 1.75);
  const cols = candles.fromTradingView({ t: [240], o: [1], h: [2], l: [0], c: [1], v: [3] });
  assert.equal(cols[0].t, 240);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lab-')), 'x.csv');
  candles.write(file, bars);
  assert.deepEqual(candles.read(file), bars);
});

test('lab run: matches the bot lab first read in quint-control/botlab/README.md', () => {
  const data = lab.loadData();
  const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'brain', 'registry.json'), 'utf8'));
  const entry = (n) => registry.strategies.find((s) => s.runner === `botlab:${n}`);
  const r3 = lab.runOne(entry(3), data); // 20-candle breakout on the 15-minute file
  assert.equal(r3.score.trades, 40);
  assert.equal(Math.round(r3.score.net), 3711);
  assert.equal(Math.round(r3.score.maxDrawdown), 1720);
  const r10 = lab.runOne(entry(10), data); // VWAP band fade on the 5-minute file
  assert.equal(r10.score.trades, 30);
  assert.equal(Math.round(r10.score.net), 1741);
  const r5 = lab.runOne(entry(5), data); // VWAP trend needs 1-minute candles
  assert.match(r5.skipped, /1-minute/);
});

test('lab run: every result is a real number and no forward trade comes before its rules were fixed', () => {
  const out = lab.main();
  for (const r of out.results.filter((x) => !x.skipped)) {
    for (const k of ['net', 'maxDrawdown', 'winRate']) assert.ok(Number.isFinite(r.score[k]), `${r.name} ${k}`);
    assert.ok(r.lucid50k.pPass >= 0 && r.lucid50k.pPass <= 1);
    for (const t of r.trades.filter((x) => x.day > r.forward.since)) assert.ok(t.day > r.forward.since);
  }
});

test('Quint HQ build: puts the roundup in the page and can never close its script tag early', () => {
  const { build: buildPage } = require('../jarvis/build');
  const html = buildPage('<script id="lab-data" type="application/json">/*LAB_DATA*/</script>', { headline: 'a </script><b>x', n: 1 });
  assert.ok(!html.includes('</script><b>'));
  const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));
  assert.deepEqual(JSON.parse(json), { headline: 'a </script><b>x', n: 1 });
  const template = fs.readFileSync(path.join(__dirname, '..', 'jarvis', 'template.html'), 'utf8');
  assert.match(template.slice(0, 8192), /<title>Quint HQ<\/title>/);
  assert.throws(() => buildPage('<p>no placeholder</p>', {}));
});

test('candles: 15-minute candles built from 5-minute ones match TradingView exactly', () => {
  const dir = path.join(__dirname, '..', 'data');
  const b15 = new Map(candles.read(path.join(dir, 'mnq_15m.csv')).map((b) => [b.t, b]));
  let overlap = 0, diff = 0;
  for (const a of candles.aggregate(candles.read(path.join(dir, 'mnq_5m.csv')), 15)) {
    const t = b15.get(a.t);
    if (!t) continue;
    overlap++;
    if (a.o !== t.o || a.h !== t.h || a.l !== t.l || a.c !== t.c || a.v !== t.v) diff++;
  }
  assert.ok(overlap > 1000, `only ${overlap} overlapping candles`);
  assert.equal(diff, 0);
  // an incomplete quarter hour (two of its three 5-minute candles) is skipped
  assert.equal(candles.aggregate([{ t: 900, o: 1, h: 2, l: 0, c: 1, v: 1 }, { t: 1200, o: 1, h: 2, l: 0, c: 1, v: 1 }], 15).length, 0);
});

test('roundup: says plainly when nothing is live, and is the same for the same inputs', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'brain', 'registry.json'), 'utf8'));
  const latest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'results', 'latest.json'), 'utf8'));
  process.env.LAB_HOUR = '20';
  const a = build(registry, latest, null, '2026-11-19');
  const b = build(registry, latest, null, '2026-11-19');
  assert.deepEqual(a, b);
  assert.match(a.spoken[0], /^Evening\. Here's your Quint roundup for Thursday 19 November\./);
  assert.match(a.spoken[1], /no bot is trading a real or prop account/);
  assert.ok(a.spoken.every((s) => !/the owner/i.test(s)));
  assert.equal(a.realMoney.liveBots, 0);
});

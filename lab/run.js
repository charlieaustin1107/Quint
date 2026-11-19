'use strict';
// Quint Lab: runs every strategy the lab can run on the saved MNQ candles, scores it the same way every time, keeps the
// paper forward test, and writes the scoreboard. Nothing here places orders or is financial advice.
//
//   node lab/run.js            -> lab/results/latest.json and lab/SCOREBOARD.md
//
// Which strategies run: every entry in lab/brain/registry.json with a "runner". Today that's the bot lab's bots
// (quint-control/botlab/botlab.js), so the lab tests exactly the rules NinjaTrader will run.
// Paper forward test: trades on days after a strategy's "frozenAt" date, the day its rules were fixed. Those candles
// didn't exist when the rules were written, so they're an honest test. They arrive as the nightly refresh adds candles.

const fs = require('fs');
const path = require('path');
const botlab = require('../quint-control/botlab/botlab');
const { sessions } = require('../quint-control/proof/noise_momentum');
const { score, basic, MIN_TRADES } = require('./lib/score');
const { simulate } = require('./lib/prop');
const candles = require('./lib/candles');

const DIR = __dirname;
const DATA = { 5: 'mnq_5m.csv', 15: 'mnq_15m.csv' };

function loadData() {
  const out = {};
  for (const [mins, file] of Object.entries(DATA)) {
    const bars = candles.read(path.join(DIR, 'data', file));
    if (bars.length) out[mins] = { file, bars, span: candles.span(bars), days: sessions(bars).days.map((d) => d.day) };
  }
  return out;
}

// The candle file with the most sessions whose candles divide the bot's own timeframe.
function pickData(data, tf) {
  const fits = Object.keys(data).map(Number).filter((m) => tf % m === 0);
  if (!fits.length) return null;
  return fits.map((m) => data[m]).sort((a, b) => b.days.length - a.days.length)[0];
}

// A runner is "botlab:<number>" (a bot-lab bot) or "factory:<family>:<settings key>" (a variation the strategy factory
// froze for the paper forward test, e.g. "factory:noise:lookbackDays=14;volatilityMultiplier=1;checkEvery=30").
function runOne(entry, data) {
  const [kind, a, ...rest] = entry.runner.split(':');
  let d, raw, tf, n = null;
  if (kind === 'factory') {
    const factory = require('./factory/engine');
    const fam = factory.FAMILIES.find((f) => f.id === a);
    if (!fam) return { id: entry.id, name: entry.name, skipped: `no factory family "${a}"` };
    tf = parseInt(fam.data, 10);
    d = data[tf];
    if (!d) return { id: entry.id, name: entry.name, skipped: `needs ${fam.data} candles` };
    raw = factory.tradesFor(fam, factory.parseKey(rest.join(':'), fam.grid), d.bars, fam.context ? fam.context(d.bars) : {});
  } else {
    n = Number(a);
    tf = botlab.BOTS[n]().tf;
    d = pickData(data, tf);
    if (!d) return { id: entry.id, name: entry.name, skipped: `needs ${tf}-minute candles or smaller, and the lab only has ${Object.keys(data).join(' and ')}-minute candles` };
    raw = botlab.run(d.bars, n).trades;
  }
  const trades = raw.map((t) => ({ day: t.day, dir: t.dir, usd: t.usd, why: t.why }));
  const byDay = new Map(d.days.map((day) => [day, 0]));
  for (const t of trades) byDay.set(t.day, byDay.get(t.day) + t.usd);
  const forward = entry.frozenAt ? trades.filter((t) => t.day > entry.frozenAt) : [];
  const exits = {};
  for (const t of trades) exits[t.why] = (exits[t.why] || 0) + 1;
  return {
    id: entry.id, name: entry.name, bot: n, timeframe: `${tf}m`, data: { file: d.file, ...d.span, sessions: d.days.length },
    score: score(trades),
    lucid50k: simulate([...byDay.values()]),
    exits,
    forward: { since: entry.frozenAt, ...basic(forward), lastDay: d.span.to },
    trades,
  };
}

function money(x) { return x === null || x === undefined ? '' : (x < 0 ? '-$' : '+$') + Math.abs(Math.round(x)).toLocaleString('en-US'); }
function pct(x) { return x === null || x === undefined ? 'n/a' : `${Math.round(x * 100)}%`; }

function scoreboard(results, when) {
  const ran = results.filter((r) => !r.skipped).sort((a, b) => b.score.net - a.score.net);
  const lines = [
    '# Quint Lab scoreboard',
    '',
    `Updated ${when} by \`node lab/run.js\`. 1 MNQ, $0.50 commission a side, 1 tick of slippage on market and stop fills. Rules fixed before testing.`,
    '',
    '**Read this first:** these are short samples (weeks, not years). Under 100 trades the rulebook calls a result an anecdote, so no bot here is proven. The real test is years of data in NinjaTrader and the paper forward test below.',
    '',
    '## Backtest on the saved candles',
    '',
    '| Bot | Trades | Net | Later half | Worst drawdown | Worst day | Lucid 50K: pass / fail | Grade |',
    '|---|---|---|---|---|---|---|---|',
    ...ran.map((r) => {
      const s = r.score, m = r.lucid50k;
      const guess = s.trades < MIN_TRADES ? '*' : '';
      return `| ${r.bot === null ? "" : r.bot + ". "}${r.name} (${r.timeframe}) | ${s.trades} | ${money(s.net)} | ${money(s.secondHalf.net)} | $${Math.round(s.maxDrawdown).toLocaleString('en-US')} | ${s.worstDay ? money(s.worstDay.usd) : ''} | ${pct(m.pPass)} / ${pct(m.pFail)}${guess}${m.red ? ' 🔴' : ''} | ${s.grade} |`;
    }),
    '',
    'Lucid 50K column: 10,000 replays of the bot\'s own days through the LucidDaily 50K rules ($3,000 target, $2,000 trailing max loss, 40% consistency, 60 trading days). 🔴 means over a 25% chance of failing first, the plan\'s red line. * Fewer than 100 trades: the replays only reshuffle a few weeks of results, so the percentage is a guess, not evidence.',
    '',
    '## Paper forward test (candles that arrived after the rules were fixed)',
    '',
    '| Bot | Since | Trades | Net |',
    '|---|---|---|---|',
    ...ran.map((r) => `| ${r.bot === null ? "" : r.bot + ". "}${r.name} | ${r.forward.since} | ${r.forward.trades} | ${money(r.forward.net) || '$0'} |`),
    '',
    `Forward total: ${money(ran.reduce((a, r) => a + r.forward.net, 0)) || '$0'} on paper, from ${ran.reduce((a, r) => a + r.forward.trades, 0)} trades.`,
    '',
  ];
  const skipped = results.filter((r) => r.skipped);
  if (skipped.length) lines.push('## Not run here', '', ...skipped.map((r) => `- ${r.name}: ${r.skipped}.`), '');
  lines.push('Nothing here is financial advice.', '');
  return lines.join('\n');
}

function main() {
  const registry = JSON.parse(fs.readFileSync(path.join(DIR, 'brain', 'registry.json'), 'utf8'));
  const data = loadData();
  const results = registry.strategies.filter((s) => s.runner && /^(botlab|factory):/.test(s.runner)).map((s) => runOne(s, data));
  // The run date is the newest candle's date, so re-running on the same candles gives the same files.
  const newest = Object.values(data).map((d) => d.span.to).sort().pop();
  const out = { asOf: newest, data: Object.fromEntries(Object.entries(data).map(([m, d]) => [m + 'm', { file: d.file, ...d.span, sessions: d.days.length }])), results };
  fs.mkdirSync(path.join(DIR, 'results'), { recursive: true });
  fs.writeFileSync(path.join(DIR, 'results', 'latest.json'), JSON.stringify(out, null, 1) + '\n');
  fs.writeFileSync(path.join(DIR, 'SCOREBOARD.md'), scoreboard(results, newest));
  for (const r of results) {
    if (r.skipped) { console.log(`- ${r.name}: skipped (${r.skipped})`); continue; }
    const s = r.score;
    console.log(`${String(r.bot).padStart(2)}. ${r.name.padEnd(28)} ${String(s.trades).padStart(4)} trades  net ${money(s.net).padStart(7)}  later half ${money(s.secondHalf.net).padStart(7)}  DD $${Math.round(s.maxDrawdown)}  pass ${pct(r.lucid50k.pPass)} fail ${pct(r.lucid50k.pFail)}  ${s.grade}`);
  }
  return out;
}

module.exports = { runOne, loadData, pickData, scoreboard, main };
if (require.main === module) main();

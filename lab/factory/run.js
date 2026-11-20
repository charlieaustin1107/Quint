'use strict';
// node lab/factory/run.js  ->  lab/results/factory.json and lab/FACTORY_REPORT.md
// Runs every variation of every family on the stored candles. See lab/FACTORY.md. Nothing here is financial advice.

const fs = require('fs');
const path = require('path');
const { loadData, loadDaily, loadMinute } = require('../run');
const { runAll } = require('./engine');

const money = (x) => (x === null || x === undefined ? '' : (x < 0 ? '-$' : '+$') + Math.abs(Math.round(x)).toLocaleString('en-US'));
const pct = (x) => (x === null || x === undefined ? 'n/a' : `${Math.round(x * 100)}%`);

function report(out, asOf) {
  const lines = [
    '# Strategy factory report',
    '',
    `Candles up to ${asOf}. ${out.variants.toLocaleString('en-US')} variations tested in ${out.seconds}s. Every variation: 1 MNQ, $0.50 commission a side, 1 tick of slippage, the bot lab's fills.`,
    '',
    `**How a variation survives** (fixed before testing): on unseen sessions at least ${out.rule.minUnseenTrades} trades, a profit, profit factor ${out.rule.minUnseenPF}+, still a profit with $2.50 more costs a trade; worst drawdown under $${out.rule.maxDrawdown.toLocaleString('en-US')} and no day worse than -$${Math.abs(out.rule.worstDay).toLocaleString('en-US')}; its neighbouring variations also profitable unseen; and its family's chance of overfitting (PBO) ${Math.round(out.rule.maxPBO * 100)}% or less.`,
    '',
    '| Family | Variations | Sessions (tune / unseen) | Profitable unseen | PBO | Survivors |',
    '|---|---|---|---|---|---|',
    ...out.families.map((f) => f.skipped ? `| ${f.name} | skipped: ${f.skipped} | | | | |` :
      `| ${f.name} | ${f.variants.toLocaleString('en-US')} | ${f.data.tuneSessions} / ${f.data.unseenSessions} | ${f.unseenPositive} of ${f.withTrades} that traded | ${pct(f.pbo)} | ${f.survivors.length} |`),
    '',
  ];
  for (const f of out.families.filter((x) => !x.skipped)) {
    lines.push(`## ${f.name}`, '', f.verdict, '');
    if (f.top.length) {
      lines.push('Top 5 by the tuning sessions, then how they did unseen:', '', '| Settings | Tune | Unseen | Neighbours unseen (median) |', '|---|---|---|---|');
      for (const v of f.top.slice(0, 5)) lines.push(`| ${v.key.replace(/;/g, ', ')} | ${money(v.tune.net)} (${v.tune.n}) | ${money(v.unseen.net)} (${v.unseen.n}) | ${money(v.neighbours.medianUnseen)} |`);
      lines.push('');
    }
    for (const s of f.survivors) lines.push(`- Survivor: ${s.key.replace(/;/g, ', ')}: unseen ${money(s.unseen.net)} over ${s.unseen.n} trades; Lucid 50K pass ${pct(s.lucid50k.pPass)}, fail ${pct(s.lucid50k.pFail)}.`);
  }
  lines.push(`**Ready for the paper forward test** (survived ${out.promoteAfter} nights in a row): ${out.readyForPaper && out.readyForPaper.length ? out.readyForPaper.map((r) => r.id).join(', ') : 'none yet'}.`, '');
  lines.push('PBO is the probability of backtest overfitting: how often the best variation on some sessions lands in the bottom half on the others. Over 50% means the winners are mostly luck.', '', 'Nothing here is financial advice.', '');
  return lines.join('\n');
}

// Survival streaks: how many nights in a row each variation has survived. A night counts only when the candles moved
// on (a new asOf), so re-running on the same candles can't inflate a streak. 5 nights in a row earns the paper test.
const PROMOTE_AFTER = 5;
function updateStreaks(file, out, asOf) {
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { prev = {}; }
  const next = {}, alive = new Set();
  for (const f of out.families) for (const s of f.survivors || []) alive.add(`${f.id}:${s.key}`);
  for (const id of new Set([...Object.keys(prev), ...alive])) {
    const p = prev[id] || { nights: 0, asOf: null };
    if (!alive.has(id)) continue; // a night without surviving ends the streak
    next[id] = p.asOf === asOf ? p : { nights: p.nights + 1, asOf };
  }
  fs.writeFileSync(file, JSON.stringify(next, null, 1) + '\n');
  return Object.entries(next).filter(([, v]) => v.nights >= PROMOTE_AFTER).map(([id, v]) => ({ id, nights: v.nights }));
}

function main(opt = {}) {
  const data = loadData();
  const asOf = Object.values(data).map((d) => d.span.to).sort().pop();
  const out = runAll({ ...data, daily: loadDaily(), 1: loadMinute() }, opt);
  out.readyForPaper = updateStreaks(path.join(__dirname, '..', 'results', 'factory_streaks.json'), out, asOf);
  out.promoteAfter = PROMOTE_AFTER;
  fs.writeFileSync(path.join(__dirname, '..', 'results', 'factory.json'), JSON.stringify({ asOf, ...out }, null, 1) + '\n');
  fs.writeFileSync(path.join(__dirname, '..', 'FACTORY_REPORT.md'), report(out, asOf));
  for (const f of out.families) console.log(f.skipped ? `${f.name}: skipped` : `${f.name}: ${f.variants} variations, PBO ${pct(f.pbo)}, ${f.survivors.length} survivors. ${f.verdict}`);
  console.log(`${out.variants} variations in ${out.seconds}s`);
  return out;
}

module.exports = { main, report };
if (require.main === module) main();

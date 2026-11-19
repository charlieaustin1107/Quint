'use strict';
// Quint's roundup: the short briefing Jarvis-style Quint reads out. It turns the lab's memory (lab/brain/registry.json)
// and the latest run (lab/results/latest.json) into plain sentences, and notes what changed since the last roundup.
//
//   node lab/roundup.js        -> lab/roundup.json (for the Quint HQ page) and lab/ROUNDUP.md
//
// Set LAB_DATE=YYYY-MM-DD to fix the date (tests do); otherwise it's today's date. Nothing here is financial advice.

const fs = require('fs');
const path = require('path');
const { MIN_TRADES } = require('./lib/score');

const DIR = __dirname;
const usd = (x) => (x < 0 ? 'minus $' : '$') + Math.abs(Math.round(x)).toLocaleString('en-US');
const signed = (x) => (x < 0 ? '-$' : '+$') + Math.abs(Math.round(x)).toLocaleString('en-US');
const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n) => (n < words.length ? words[n] : String(n));
const say = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

function build(registry, latest, previous, today) {
  const ran = latest.results.filter((r) => !r.skipped);
  const fwdTrades = ran.reduce((a, r) => a + r.forward.trades, 0);
  const fwdNet = ran.reduce((a, r) => a + r.forward.net, 0);
  const since = ran.map((r) => r.forward.since).filter(Boolean).sort()[0];
  const leaders = [...ran].sort((a, b) => b.score.net - a.score.net).slice(0, 3);
  const best = leaders[0];
  const red = ran.filter((r) => r.lucid50k && r.lucid50k.red && r.score.trades > 0);
  const losing = ran.filter((r) => r.score.net < 0);
  const statusCount = {};
  for (const s of registry.strategies) statusCount[s.status] = (statusCount[s.status] || 0) + 1;
  const approved = statusCount.Approved || 0;
  const live = registry.realMoney ? registry.realMoney.liveBots : 0;
  const lessons = [...registry.lessons].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3); // newest first; same day keeps the registry's order
  const next = registry.queue.slice(0, 3);
  const prevFwd = previous && previous.paper ? previous.paper.net : null;

  const spoken = [];
  const hour = Number(process.env.LAB_HOUR || new Date().getUTCHours());
  spoken.push(`${hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'}. Here's your Quint roundup for ${say(today)}.`);
  spoken.push(live ? `Real money: ${count(live)} bot${live === 1 ? ' is' : 's are'} trading your accounts.` : 'Real money: no bot is trading a real or prop account yet, so nothing has been made or lost.');
  if (fwdTrades === 0) spoken.push(`Paper forward test: ${count(ran.length)} bots are on paper since ${say(since)}. No trades yet, because no new candles have come in since their rules were fixed.`);
  else spoken.push(`Paper forward test: ${count(ran.length)} bots, ${fwdTrades} trades since ${say(since)}, ${usd(fwdNet)} on paper on one MNQ each${prevFwd !== null && prevFwd !== fwdNet ? `, ${fwdNet >= prevFwd ? 'up' : 'down'} ${usd(Math.abs(fwdNet - prevFwd))} since the last roundup` : ''}.`);
  if (best) spoken.push(`Best backtest so far: the ${best.name}, ${usd(best.score.net)} over ${best.score.trades} trades on one MNQ.${best.score.trades < MIN_TRADES ? ' That is too few trades to trust yet.' : ''}`);
  spoken.push(approved ? `${count(approved)} strateg${approved === 1 ? 'y is' : 'ies are'} approved.` : 'No strategy has earned approval yet. That needs years of data and a clean paper test.');
  if (red.length) spoken.push(`Warning: ${count(red.length)} bot${red.length === 1 ? '' : 's'} would likely fail a Lucid 50K before passing: ${red.map((r) => r.name).join(', ')}.`);
  if (lessons[0]) spoken.push(`Latest lesson: ${lessons[0].lesson.split('. ')[0]}.`);
  if (next[0]) spoken.push(`Next up: ${next[0].what.split('. ')[0]}.`);
  for (let i = 0; i < spoken.length; i++) spoken[i] = spoken[i].replace(/\bthe owner's\b/gi, 'your').replace(/\bthe owner\b/gi, 'you'); // it's spoken to the owner

  return {
    date: today,
    dataTo: latest.asOf,
    headline: live ? `${count(live)} bots live` : (fwdTrades ? `${signed(fwdNet)} on paper from ${fwdTrades} forward trades` : 'Nothing live yet. Paper forward test running.'),
    spoken,
    realMoney: { liveBots: live, note: registry.realMoney ? registry.realMoney.note : '' },
    paper: { bots: ran.length, since, trades: fwdTrades, net: fwdNet, byBot: ran.map((r) => ({ name: r.name, trades: r.forward.trades, net: r.forward.net })) },
    leaders: leaders.map((r) => ({ name: r.name, timeframe: r.timeframe, trades: r.score.trades, net: r.score.net, laterHalf: r.score.secondHalf.net, maxDrawdown: r.score.maxDrawdown, pass: r.lucid50k.pPass, fail: r.lucid50k.pFail, grade: r.score.grade })),
    scoreboard: ran.map((r) => ({ name: r.name, bot: r.bot, timeframe: r.timeframe, trades: r.score.trades, net: r.score.net, laterHalf: r.score.secondHalf.net, maxDrawdown: r.score.maxDrawdown, worstDay: r.score.worstDay ? r.score.worstDay.usd : 0, pass: r.lucid50k.pPass, fail: r.lucid50k.pFail, grade: r.score.grade })).sort((a, b) => b.net - a.net),
    warnings: [
      ...red.map((r) => `${r.name}: ${Math.round(r.lucid50k.pFail * 100)}% chance of failing a Lucid 50K first.`),
      ...losing.map((r) => `${r.name} is losing money on the saved candles.`),
    ],
    strategies: registry.strategies.map((s) => ({ name: s.name, status: s.status, horizon: s.horizon, timeframe: s.timeframe, verdict: s.verdict })),
    statusCount,
    lessons,
    next: next.map((q) => ({ id: q.id, what: q.what, cost: q.cost })),
    data: latest.data,
  };
}

function markdown(r) {
  return [
    `# Quint roundup: ${say(r.date)}`,
    '',
    `**${r.headline}** · candles up to ${r.dataTo}`,
    '',
    ...r.spoken.map((s) => `- ${s}`),
    '',
    'Full numbers: `lab/SCOREBOARD.md`. Every strategy and its verdict: `lab/brain/registry.json`. Nothing here is financial advice.',
    '',
  ].join('\n');
}

function main() {
  const registry = readJson(path.join(DIR, 'brain', 'registry.json'));
  const latest = readJson(path.join(DIR, 'results', 'latest.json'));
  if (!latest) { console.error('Run node lab/run.js first.'); process.exit(1); }
  const previous = readJson(path.join(DIR, 'roundup.json'), null);
  const today = process.env.LAB_DATE || new Date().toISOString().slice(0, 10);
  const r = build(registry, latest, previous, today);
  fs.writeFileSync(path.join(DIR, 'roundup.json'), JSON.stringify(r, null, 1) + '\n');
  fs.writeFileSync(path.join(DIR, 'ROUNDUP.md'), markdown(r));
  console.log(r.spoken.join('\n'));
  return r;
}

module.exports = { build, markdown };
if (require.main === module) main();

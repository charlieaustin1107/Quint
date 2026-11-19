'use strict';
// Builds Quint HQ (lab/jarvis/index.html) from template.html plus the lab's public data.
// Never hand-edit index.html: change template.html or the lab, then run `node lab/jarvis/build.js`.
//
// The repo is public, so ONLY public research data is built into the page: the roundup, the registry, bot results,
// the strategy factory, the owner's strategy checklist, Lucid presets, the news calendar and the roadmap. Anything
// about the owner's money (prop accounts, journal, bot P&L, Trading Mastery data) lives in the page's private storage.

const fs = require('fs');
const path = require('path');

function build(templateText, data) {
  // JSON inside a <script> tag: escape "<" so a value can never close the tag early.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  if (!templateText.includes('/*LAB_DATA*/')) throw new Error('template.html has no /*LAB_DATA*/ placeholder');
  return templateText.replace('/*LAB_DATA*/', () => json);
}

function curve(trades, points = 40) {
  let net = 0;
  const all = [0, ...trades.map((t) => (net += t.usd))];
  if (all.length <= points) return all.map((x) => Math.round(x));
  const out = [];
  for (let i = 0; i < points; i++) out.push(Math.round(all[Math.round((i * (all.length - 1)) / (points - 1))]));
  return out;
}

function hubData(src) {
  const { roundup, registry, latest, factory, playbooks, firm, calendar, vision } = src;
  const bots = (latest.results || []).filter((r) => !r.skipped).map((r) => ({
    id: r.id, name: r.name, bot: r.bot, timeframe: r.timeframe, data: r.data,
    trades: r.score.trades, net: r.score.net, laterHalf: r.score.secondHalf.net, maxDrawdown: r.score.maxDrawdown,
    worstDay: r.score.worstDay ? r.score.worstDay.usd : 0, winRate: r.score.winRate, profitFactor: r.score.profitFactor === Infinity ? null : r.score.profitFactor,
    grade: r.score.grade, checks: r.score.checks, pass: r.lucid50k.pPass, fail: r.lucid50k.pFail,
    forward: { since: r.forward.since, trades: r.forward.trades, net: r.forward.net }, curve: curve(r.trades),
  })).sort((a, b) => b.net - a.net);
  const skipped = (latest.results || []).filter((r) => r.skipped).map((r) => ({ name: r.name, why: r.skipped }));
  const fac = factory ? {
    asOf: factory.asOf, variants: factory.variants, seconds: factory.seconds, rule: factory.rule, promoteAfter: factory.promoteAfter,
    readyForPaper: factory.readyForPaper || [],
    families: factory.families.map((f) => f.skipped ? { id: f.id, name: f.name, skipped: f.skipped } : ({
      id: f.id, name: f.name, registry: f.registry, variants: f.variants, withTrades: f.withTrades, unseenPositive: f.unseenPositive,
      pbo: f.pbo, data: f.data, verdict: f.verdict,
      survivors: f.survivors.map((s) => ({ key: s.key, unseen: s.unseen, tune: s.tune, all: s.all, pass: s.lucid50k.pPass, fail: s.lucid50k.pFail })),
      top: f.top.slice(0, 3).map((v) => ({ key: v.key, tune: v.tune, unseen: v.unseen, neighbours: v.neighbours })),
    })),
  } : null;
  const size = firm ? firm.sizes : [];
  return {
    builtFor: roundup.date, dataTo: roundup.dataTo,
    roundup: { headline: roundup.headline, spoken: roundup.spoken, paper: roundup.paper, warnings: roundup.warnings, statusCount: roundup.statusCount },
    bots, skipped, factory: fac,
    strategies: registry.strategies.map((s) => ({ id: s.id, name: s.name, horizon: s.horizon, timeframe: s.timeframe, status: s.status, rules: s.rules,
      source: s.source, verdict: s.verdict, next: s.next, versions: s.versions || [], evidence: (s.evidence || []).slice(-4) })),
    queue: registry.queue, lessons: registry.lessons.slice(0, 8),
    playbook: playbooks.playbooks.find((p) => p.id === playbooks.default) || playbooks.playbooks[0],
    firm: firm ? { firm: firm.firm, plan: firm.plan, lastChecked: firm.lastChecked, costs: firm.costs, sizes: size.map((s) => ({
      size: s.size, target: s.profitTarget, maxLoss: s.maxLossLimit, lockAt: s.initialTrailBalance, lockFloor: s.lockedMllBalance,
      dailyLoss: s.dailyLossLimit, maxMicros: s.maxMicros })) } : null,
    calendar,
    roadmap: vision,
    links: {
      apps: [
        { name: 'Trading Mastery', what: 'Your six-step model, signals, backtest lab and Jarvis', url: 'https://claude.ai/artifact/4AhyMBBvRs9j4P3LKEmhnZ' },
        { name: 'Four Pillars Trainer', what: 'Drill WYLD Will\'s Four Pillars', url: 'https://claude.ai/artifact/SuUYodEDjKUqrdTAMBFWF1' },
        { name: 'WYLD Will System rulebook', what: 'Your strategy\'s full rules', url: 'https://claude.ai/artifact/KF6hmvDJWm3cPFbgxi3CKy' },
        { name: 'MNQ Intelligence Layer', what: 'The signal and learning plan for Trading Mastery', url: 'https://claude.ai/artifact/GPiurQUfktf67uXxV55Wwa' },
      ],
      repo: 'https://github.com/charlieaustin1107/Quint',
      labCode: 'https://github.com/charlieaustin1107/Quint/pull/17',
      nightlyChanges: 'https://github.com/charlieaustin1107/Quint/pulls?q=is%3Apr+head%3Alab%2Fnightly',
      lucidRules: 'https://support.lucidtrading.com/en/articles/15996664-luciddaily-evaluation',
    },
    jobs: [
      { name: 'Quint Lab nightly run', when: 'Weeknights 22:15 UK', what: 'New candles, every bot, the strategy factory, the paper test, your ideas, this page' },
      { name: 'Quint HQ sync', when: 'Weeknights 23:25 UK', what: 'Copies your Trading Mastery bot results, last night\'s Jarvis report and your pinned rules into this page\'s private storage' },
      { name: 'Jarvis nightly dream run', when: 'Weeknights 22:40 UK', what: 'Trading Mastery\'s own audit (yours, unchanged)' },
    ],
  };
}

const ROADMAP = [
  { stage: 'Lab, scoreboard, Lucid simulator, paper test, spoken roundup', status: 'Done' },
  { stage: 'Strategy factory: thousands of variations, judged on unseen data', status: 'Done' },
  { stage: 'Quint HQ v2: Today, Ask, Desk, Lab, More, Trading Mastery sync, nightly controls', status: 'Done' },
  { stage: '1-minute data and exact rules for your Four Pillars', status: 'Next' },
  { stage: 'Years of data from NinjaTrader\'s Strategy Analyzer', status: 'Needs your Windows computer' },
  { stage: 'Quint Control: engine, guardian, first bots on simulation', status: 'Planned' },
  { stage: 'Live bots in the hub, copy trading across prop accounts', status: 'Planned' },
  { stage: 'Ventures: other businesses on the same platform', status: 'Later' },
];

if (require.main === module) {
  const dir = __dirname, lab = path.join(dir, '..'), read = (p, fallback) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; } };
  const data = hubData({
    roundup: read(path.join(lab, 'roundup.json')),
    registry: read(path.join(lab, 'brain', 'registry.json')),
    latest: read(path.join(lab, 'results', 'latest.json'), { results: [] }),
    factory: read(path.join(lab, 'results', 'factory.json'), null),
    playbooks: read(path.join(lab, 'brain', 'playbooks.json')),
    firm: read(path.join(lab, '..', 'quint-control', 'firms', 'lucid-daily.json'), null),
    calendar: read(path.join(lab, 'data', 'calendar.json'), { events: [] }),
    vision: ROADMAP,
  });
  const html = build(fs.readFileSync(path.join(dir, 'template.html'), 'utf8'), data);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log(`lab/jarvis/index.html: ${(html.length / 1024).toFixed(0)} KB (data ${(JSON.stringify(data).length / 1024).toFixed(0)} KB), roundup ${data.builtFor}`);
}

module.exports = { build, hubData, curve, ROADMAP };

'use strict';
// Quint's sequence analyst: what each step of WYLD Will's Four Pillars is really worth, and why trades worked or didn't.
//
// The strategy factory asks "which settings won?". This asks the questions that make the system smarter instead:
//   1 The funnel: how many setups reach each step (① sweep → ② level holds → ③ PDR → ④ confirmation → entry), and
//     where the rest die. That shows which rule is doing the filtering.
//   2 Ablations: take one pillar away at a time (and the window) and see what happens to the trades. A pillar earns its
//     place if the trades are better with it than without it.
//   3 Each confirmation on its own, so the entry that actually works can be found.
//   4 Attribution: the trades split by what made them (the level's timeframe, past the 0.5 or not, the time, the room to
//     Point B, the first entry or a re-entry, long or short).
//   5 Post-mortem: why trades worked or didn't. How far losers went in profit before they were stopped (would
//     break-even have saved them?), how far winners went against first (is the stop too tight?), how each one ended.
//   6 Lessons in plain English, and proposals: exact experiments with a pass mark, for the nightly job to pre-register
//     in the registry queue before anything is tested. Nothing changes the rules by itself.
//
// Every average comes with a 95% range from 10,000 bootstrap resamples, and nothing is called a finding below 30
// trades. The same candles replayed 10,000 times teach nothing new: each night's new sessions do. So the analyst runs
// every night on all the candles the lab has, keeps a history, and its ranges narrow as the data grows.
// Signals only; nothing here places orders or is financial advice.

const fs = require('fs');
const path = require('path');
const W = require('../factory/wyld');
const { rng } = require('../lib/prop');
const { basic } = require('../lib/score');

const MIN_TRADES = 30; // below this, counts only: no verdicts
const REPS = 10000;
const SEED = 20261119;
const WIDER = { usePdPools: true, useOnPools: true }; // the indicator's setting that also counts prior-day and overnight highs and lows

const RUNS = [
  { id: 'asWritten', name: 'As written (his 15m equal highs and lows only)', opt: {} },
  { id: 'base', name: 'With prior-day and overnight highs/lows as pools too', opt: { ...WIDER } },
  { id: 'noSweep', name: 'Without ① the sweep (price simply trades into a level)', opt: { ...WIDER, skip: 'sweep' }, without: 'sweep' },
  { id: 'noLevel', name: 'Without ② the HTF level (a close back beyond the swept pool)', opt: { ...WIDER, skip: 'level' }, without: 'level' },
  { id: 'noPdr', name: 'Without ③ the PDR (a fixed 2R target)', opt: { ...WIDER, skip: 'pdr' }, without: 'pdr' },
  { id: 'noWindow', name: 'Without the 3-hour window (until 15:30 New York)', opt: { ...WIDER, noWindow: true }, without: 'window' },
  ...W.CONFIRMS.map((c) => ({ id: `only-${c}`, name: `④ only: ${W.NAMES[c]} (① skipped so there are trades to study)`, opt: { ...WIDER, skip: 'sweep', confirm: c }, confirm: c })),
];
const PILLAR_NAMES = { sweep: '① the sweep', level: '② the HTF level', pdr: '③ the PDR', window: 'the 3-hour window' };

// ---------- statistics ----------
const mean = (xs) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : null);
const round = (x, k = 2) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10 ** k) / 10 ** k);
function median(xs) { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

// 95% range of the average by resampling the trades with replacement.
function bootstrap(xs, reps = REPS, seed = SEED) {
  if (!xs.length) return { mean: null, lo: null, hi: null };
  const r = rng(seed), n = xs.length, means = new Float64Array(reps);
  for (let k = 0; k < reps; k++) { let s = 0; for (let i = 0; i < n; i++) s += xs[Math.floor(r() * n)]; means[k] = s / n; }
  means.sort();
  return { mean: mean(xs), lo: means[Math.floor(reps * 0.025)], hi: means[Math.min(reps - 1, Math.floor(reps * 0.975))] };
}

// 95% range of the difference in averages, b minus a.
function bootstrapDiff(a, b, reps = REPS, seed = SEED) {
  if (!a.length || !b.length) return { diff: null, lo: null, hi: null };
  const r = rng(seed), d = new Float64Array(reps);
  for (let k = 0; k < reps; k++) {
    let sa = 0, sb = 0;
    for (let i = 0; i < a.length; i++) sa += a[Math.floor(r() * a.length)];
    for (let i = 0; i < b.length; i++) sb += b[Math.floor(r() * b.length)];
    d[k] = sb / b.length - sa / a.length;
  }
  d.sort();
  return { diff: mean(b) - mean(a), lo: d[Math.floor(reps * 0.025)], hi: d[Math.min(reps - 1, Math.floor(reps * 0.975))] };
}

// ---------- one set of trades ----------
function postMortem(trades) {
  const losers = trades.filter((t) => t.usd <= 0), winners = trades.filter((t) => t.usd > 0);
  const exits = {};
  for (const t of trades) exits[t.why] = (exits[t.why] || 0) + 1;
  return {
    exits,
    losers: losers.length,
    losersUpHalfR: losers.filter((t) => t.mfe >= 0.5).length, // were +0.5R before they lost
    losersUp1R: losers.filter((t) => t.mfe >= 1).length, // were +1R: break-even at 1R would have saved them
    winners: winners.length,
    winnersMedianMaeR: round(median(winners.map((t) => t.mae))), // how far winners went against first
    winnersDeepMae: winners.filter((t) => t.mae >= 0.75).length, // nearly stopped first
    medianMinsWin: round(median(winners.map((t) => t.mins)), 0),
    medianMinsLoss: round(median(losers.map((t) => t.mins)), 0),
  };
}

function summarise(trades) {
  const rs = trades.map((t) => t.r), b = basic(trades), ci = bootstrap(rs);
  return {
    n: trades.length, wins: trades.filter((t) => t.usd > 0).length,
    winRate: trades.length ? round(trades.filter((t) => t.usd > 0).length / trades.length, 3) : null,
    net: round(b.net, 0), maxDrawdown: round(b.maxDrawdown, 0),
    avgR: round(ci.mean), lo: round(ci.lo), hi: round(ci.hi),
    enough: trades.length >= MIN_TRADES,
    postMortem: postMortem(trades),
  };
}

const BUCKETS = {
  confirm: (t) => t.tag.confirm,
  side: (t) => t.tag.side,
  level: (t) => ({ 0: 'swept pool', 1: 'daily', 2: 'weekly', 3: 'monthly' })[t.tag.levelRank] || 'other',
  pastHalf: (t) => (t.tag.pastMid === null ? 'no Point B' : t.tag.pastMid ? 'past the 0.5' : 'before the 0.5'),
  entry: (t) => (t.tag.entryNo === 1 ? 'first entry' : 're-entry'),
  time: (t) => (t.tag.entryMin < 30 ? '9:30–10:00' : t.tag.entryMin < 60 ? '10:00–10:30' : t.tag.entryMin < 120 ? '10:30–11:30' : 'after 11:30'),
  room: (t) => (t.tag.roomR < 2 ? '1–2R to B' : t.tag.roomR < 3 ? '2–3R to B' : '3R+ to B'),
  stop: (t) => (t.tag.stopTicks <= 20 ? 'stop ≤ 5 pts' : t.tag.stopTicks <= 40 ? 'stop 5–10 pts' : 'stop > 10 pts'),
};
function attribution(trades) {
  const out = {};
  for (const [feature, fn] of Object.entries(BUCKETS)) {
    const groups = new Map();
    for (const t of trades) { const k = fn(t); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
    out[feature] = [...groups.entries()].map(([bucket, ts]) => ({ bucket, n: ts.length, winRate: round(ts.filter((t) => t.usd > 0).length / ts.length, 3), avgR: round(mean(ts.map((t) => t.r))), net: round(ts.reduce((a, t) => a + t.usd, 0), 0) }))
      .sort((a, b) => b.n - a.n);
  }
  return out;
}

// ---------- the whole analysis ----------
function pickBars(data) { // 1-minute candles once there are 10 sessions of them: WYLD confirms on the 1m
  if (data[1] && data[1].days && data[1].days.length >= 10) return { tf: 1, set: data[1] };
  return data[5] ? { tf: 5, set: data[5] } : null;
}

function analyse(data, opt = {}) {
  const pick = pickBars(data);
  if (!pick || !data[15] || !data.daily || !data.daily.bars.length) return { skipped: 'needs 5-minute (or 1-minute), 15-minute and daily candles' };
  const bars = pick.set.bars, runs = {};
  for (const r of RUNS) {
    const out = W.run(bars, data[15].bars, data.daily.bars, r.opt);
    runs[r.id] = { id: r.id, name: r.name, without: r.without || null, confirm: r.confirm || null, funnel: out.funnel, ...summarise(out.trades), trades: out.trades };
  }
  const base = runs.base, rsOf = (id) => runs[id].trades.map((t) => t.r);
  const pillars = RUNS.filter((r) => r.without).map((r) => {
    const d = bootstrapDiff(rsOf(r.id), rsOf('base')); // with the pillar minus without it
    const enough = base.n >= MIN_TRADES && runs[r.id].n >= MIN_TRADES;
    const verdict = !enough ? 'too few trades to judge' : d.lo > 0 ? 'earns its place' : d.hi < 0 ? 'costs more than it adds' : 'no clear difference yet';
    return { pillar: r.without, name: PILLAR_NAMES[r.without], withN: base.n, withoutN: runs[r.id].n, withAvgR: base.avgR, withoutAvgR: runs[r.id].avgR, diff: round(d.diff), lo: round(d.lo), hi: round(d.hi), verdict };
  });
  const confirmations = W.CONFIRMS.map((c) => { const r = runs[`only-${c}`]; return { confirm: c, name: W.NAMES[c], n: r.n, avgR: r.avgR, lo: r.lo, hi: r.hi, net: r.net, enough: r.enough }; })
    .sort((a, b) => (b.avgR ?? -99) - (a.avgR ?? -99));
  // the biggest population of trades to learn from: the run with the most trades
  const population = Object.values(runs).filter((r) => !r.confirm).sort((a, b) => b.n - a.n)[0];
  const study = { from: population.id, name: population.name, n: population.n, attribution: attribution(population.trades), postMortem: population.postMortem };
  const queued = new Set(opt.queue || []);
  const result = {
    asOf: pick.set.span ? pick.set.span.to : null, candles: `${pick.tf}-minute`, sessions: pick.set.days ? pick.set.days.length : null,
    minTrades: MIN_TRADES, reps: REPS,
    runs: Object.fromEntries(Object.entries(runs).map(([k, v]) => { const { trades, ...rest } = v; return [k, rest]; })),
    pillars, confirmations, study,
  };
  result.lessons = lessons(result);
  result.proposals = proposals(result).map((p) => ({ ...p, alreadyQueued: queued.has(p.id) }));
  return result;
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—');
const sR = (x) => (x === null ? '—' : `${x >= 0 ? '+' : ''}${x.toFixed(2)}R`);
const range = (lo, hi) => (lo === null ? '' : ` (95% range ${sR(lo)} to ${sR(hi)})`);

function lessons(a) {
  const L = [], w = a.runs.asWritten, b = a.runs.base, f = b.funnel;
  if (w.funnel.sweeps === 0) L.push(`As written, no setup started: all ${w.funnel.takenOvernight} pools marked before the open had already been run before 9:30, so there was nothing left to sweep in the window.`);
  else L.push(`As written: ${w.funnel.sweeps} sweeps in the window, ${w.n} trades.`);
  if (f.sweeps) {
    L.push(`With prior-day and overnight highs and lows as pools too: ${f.sweeps} sweeps → ${f.holds} held a level (${pct(f.holds, f.sweeps)}) → ${f.pdrs} PDRs → ${f.confirmations} confirmations → ${f.entries} entries.`);
    if (f.noHold >= f.sweeps / 2) L.push(`Most sweeps die at ②: ${f.noHold} of ${f.sweeps} had no higher-timeframe level hold nearby in time. Pillar ② is the main filter.`);
    if (f.pdrs && f.confirmations === 0 && f.completeB + f.broken >= f.pdrs / 2) L.push(`Every PDR ended before a ${a.candles} confirmation formed (Point B reached ${f.completeB}, broken ${f.broken}). WYLD confirms on the 1-minute chart; this needs 1-minute candles to judge.`);
  }
  for (const p of a.pillars) {
    if (p.verdict === 'too few trades to judge') L.push(`${cap(p.name)}: ${p.withN} trades with it, ${p.withoutN} without. Too few to judge (needs ${a.minTrades} in both).`);
    else L.push(`${cap(p.name)} ${p.verdict}: with it ${sR(p.withAvgR)} a trade, without it ${sR(p.withoutAvgR)}; difference ${sR(p.diff)}${range(p.lo, p.hi)}.`);
  }
  const s = a.study, pm = s.postMortem;
  if (s.n) {
    L.push(`Most trades to study: ${s.name.toLowerCase()}, ${s.n} trades, average ${sR(a.runs[s.from].avgR)}${range(a.runs[s.from].lo, a.runs[s.from].hi)}${s.n < a.minTrades ? `. Below ${a.minTrades} trades, so a description, not a finding` : ''}.`);
    if (pm.losers) L.push(`Why losers lost: ${pm.losersUp1R} of ${pm.losers} were +1R up first (break-even at 1R would have saved them), ${pm.losersUpHalfR} were +0.5R up first.`);
    if (pm.winners) L.push(`How winners won: they went a median ${pm.winnersMedianMaeR}R against first, and ${pm.winnersDeepMae} of ${pm.winners} came within a quarter of the stop.`);
  }
  const best = a.confirmations.find((c) => c.enough);
  if (best) L.push(`Best confirmation so far: ${best.name}, ${sR(best.avgR)} a trade over ${best.n} trades${range(best.lo, best.hi)}.`);
  else L.push(`No confirmation has ${a.minTrades} trades yet: ${a.confirmations.map((c) => `${c.confirm} ${c.n}`).join(', ')}.`);
  return L;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Exact experiments for the nightly job to pre-register (rules and pass mark written before testing). Never applied here.
function proposals(a) {
  const P = [], f = a.runs.base.funnel, pm = a.study.postMortem;
  if (f.pdrs && f.confirmations === 0) P.push({ id: 'one-minute-data', why: 'Every PDR ended before a confirmation on 5-minute candles.', rules: 'Fetch 1-minute MNQ candles nightly and run the analyst on them once there are 10 sessions.', passMark: 'At least 30 confirmations across the 1-minute sessions.' });
  if (pm.losers >= 10 && pm.losersUp1R / pm.losers >= 0.4) P.push({ id: 'wyld-be-1r', why: `${pm.losersUp1R} of ${pm.losers} losers were +1R up before they were stopped.`, rules: 'Break-even at 1R (be: 1R) against no break-even, everything else as written.', passMark: `On sessions after ${a.asOf} only: 30+ trades each, average R at least 0.1R better, and the 95% range of the difference above 0.` });
  if (f.sweeps >= 10 && f.noHold / f.sweeps >= 0.6) P.push({ id: 'wyld-hold-60', why: `${f.noHold} of ${f.sweeps} sweeps died at ②.`, rules: 'Let a level hold within 60 minutes of the sweep (holdMinutes 60) instead of 30.', passMark: `On sessions after ${a.asOf} only: 30+ trades, average R not worse than as written, and more setups reaching ③.` });
  for (const c of a.confirmations) if (c.enough && c.lo > 0) P.push({ id: `wyld-confirm-${c.confirm}`, why: `${c.name}: ${sR(c.avgR)} over ${c.n} trades, range above 0.`, rules: `Paper forward test with ${c.confirm} as the only entry, everything else as written.`, passMark: '30 forward trades with average R above 0 and Lucid limits never hit.' });
  return P;
}

// ---------- the report ----------
function report(a) {
  if (a.skipped) return `# The sequence analyst\n\nSkipped: ${a.skipped}.\n`;
  const L = [];
  L.push('# The sequence analyst: what each pillar of WYLD\'s strategy is worth');
  L.push('');
  L.push(`As of ${a.asOf}, on ${a.sessions} sessions of ${a.candles} MNQ candles. Every average has a 95% range from ${a.reps.toLocaleString('en-GB')} bootstrap resamples; nothing below ${a.minTrades} trades is a finding. Costs included ($0.50 a side and 1 tick of slippage). Not financial advice. Built by \`lab/brain/anatomy.js\`.`);
  L.push('');
  L.push('## What Quint learned tonight');
  for (const x of a.lessons) L.push(`- ${x}`);
  L.push('');
  L.push('## The funnel: how far setups get');
  L.push('| Run | Sweeps | Held ② | PDRs ③ | Confirmations ④ | Entries | Trades | Avg R (95% range) | Net |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of Object.values(a.runs).filter((x) => !x.confirm)) L.push(`| ${r.name} | ${r.funnel.sweeps} | ${r.funnel.holds} | ${r.funnel.pdrs} | ${r.funnel.confirmations} | ${r.funnel.entries} | ${r.n} | ${r.n ? `${sR(r.avgR)}${range(r.lo, r.hi)}` : '—'} | ${r.n ? `$${r.net}` : '—'} |`);
  L.push('');
  L.push('## Each pillar: with it against without it');
  L.push('| Pillar | Trades with / without | Avg R with | Avg R without | Difference (95% range) | Verdict |');
  L.push('|---|---|---|---|---|---|');
  for (const p of a.pillars) L.push(`| ${p.name} | ${p.withN} / ${p.withoutN} | ${sR(p.withAvgR)} | ${sR(p.withoutAvgR)} | ${p.diff === null ? '—' : `${sR(p.diff)}${range(p.lo, p.hi)}`} | ${p.verdict} |`);
  L.push('');
  L.push('## Each confirmation on its own');
  L.push('| Confirmation | Trades | Avg R (95% range) | Net |');
  L.push('|---|---|---|---|');
  for (const c of a.confirmations) L.push(`| ${c.name} | ${c.n} | ${c.n ? `${sR(c.avgR)}${range(c.lo, c.hi)}` : '—'} | ${c.n ? `$${c.net}` : '—'} |`);
  L.push('');
  L.push(`## Why trades worked or didn't (${a.study.name.toLowerCase()}, ${a.study.n} trades)`);
  const pm = a.study.postMortem;
  L.push(`- How they ended: ${Object.entries(pm.exits).map(([k, v]) => `${k} ${v}`).join(', ') || 'no trades'}.`);
  L.push(`- Losers: ${pm.losers}. Up +0.5R first: ${pm.losersUpHalfR}. Up +1R first: ${pm.losersUp1R}. Median time ${pm.medianMinsLoss ?? '—'} minutes.`);
  L.push(`- Winners: ${pm.winners}. Median heat taken first: ${pm.winnersMedianMaeR ?? '—'}R. Came within a quarter of the stop: ${pm.winnersDeepMae}. Median time ${pm.medianMinsWin ?? '—'} minutes.`);
  L.push('');
  L.push('**What made the trades** (a description until each line has 30 trades):');
  for (const [feature, rows] of Object.entries(a.study.attribution)) L.push(`- ${feature}: ${rows.map((r) => `${r.bucket} ${r.n} (${sR(r.avgR)})`).join(' · ')}`);
  L.push('');
  L.push('## Proposals for the queue (pre-register before testing)');
  if (!a.proposals.length) L.push('- None tonight.');
  for (const p of a.proposals) L.push(`- **${p.id}**${p.alreadyQueued ? ' (already queued)' : ''}: ${p.rules} Why: ${p.why} Pass mark: ${p.passMark}`);
  L.push('');
  return L.join('\n');
}

// Keep one line per night so the brain can show how its ranges narrow as the data grows.
function remember(file, a) {
  let hist = [];
  try { hist = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { hist = []; }
  const entry = { asOf: a.asOf, sessions: a.sessions, candles: a.candles, base: a.runs.base.funnel,
    runs: Object.fromEntries(Object.entries(a.runs).map(([k, r]) => [k, { n: r.n, avgR: r.avgR, lo: r.lo, hi: r.hi }])) };
  hist = hist.filter((h) => h.asOf !== a.asOf).concat([entry]).slice(-365);
  fs.writeFileSync(file, JSON.stringify(hist, null, 1) + '\n');
  return hist;
}

function main() {
  const { loadData, loadDaily, loadMinute } = require('../run');
  const lab = path.join(__dirname, '..');
  let queue = [];
  try { queue = JSON.parse(fs.readFileSync(path.join(__dirname, 'registry.json'), 'utf8')).queue.map((q) => q.id); } catch (e) { queue = []; }
  const a = analyse({ ...loadData(), daily: loadDaily(), 1: loadMinute() }, { queue });
  fs.writeFileSync(path.join(lab, 'results', 'anatomy.json'), JSON.stringify(a, null, 1) + '\n');
  fs.writeFileSync(path.join(lab, 'ANATOMY.md'), report(a));
  if (!a.skipped) remember(path.join(lab, 'results', 'anatomy_history.json'), a);
  console.log(a.skipped ? `Sequence analyst skipped: ${a.skipped}` : `Sequence analyst: ${a.sessions} sessions of ${a.candles} candles. ${a.lessons[0]}`);
  return a;
}

module.exports = { analyse, report, bootstrap, bootstrapDiff, summarise, postMortem, attribution, lessons, proposals, RUNS, MIN_TRADES };
if (require.main === module) main();

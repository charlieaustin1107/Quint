'use strict';

// Exploratory use only. No brokerage, network calls, or changes to Quint.
// Usage: node quint-fomc-reversal-backtest.cjs path/to/mnq_1d.csv [trade-log.csv]
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

// Federal Reserve meeting calendar and historical materials. Last date of scheduled
// meetings only; December 2020 statement separately verified. No notation votes.
const meetings = `
2019-01-30 2019-03-20 2019-05-01 2019-06-19 2019-07-31 2019-09-18 2019-10-30 2019-12-11
2020-01-29 2020-04-29 2020-06-10 2020-07-29 2020-09-16 2020-11-05 2020-12-16
2021-01-27 2021-03-17 2021-04-28 2021-06-16 2021-07-28 2021-09-22 2021-11-03 2021-12-15
2022-01-26 2022-03-16 2022-05-04 2022-06-15 2022-07-27 2022-09-21 2022-11-02 2022-12-14
2023-02-01 2023-03-22 2023-05-03 2023-06-14 2023-07-26 2023-09-20 2023-11-01 2023-12-13
2024-01-31 2024-03-20 2024-05-01 2024-06-12 2024-07-31 2024-09-18 2024-11-07 2024-12-18
2025-01-29 2025-03-19 2025-05-07 2025-06-18 2025-07-30 2025-09-17 2025-10-29 2025-12-10
2026-01-28 2026-03-18 2026-04-29 2026-06-17 2026-07-29 2026-09-16 2026-10-28`.trim().split(/\s+/);
// For placebo windows only: exclude major unscheduled spring 2020 announcements.
// March 15 was a Sunday before Globex trade dated March 16.
const emergency = ['2020-03-03', '2020-03-16', '2020-03-23'];
const dayMs = 86400000;
const split = '2025-01-01';
const baseCost = 2;
const stressCost = 4;
const usdPerPoint = 2;
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const rounded = n => Number(n.toFixed(4));
const time = d => Date.parse(d + 'T00:00:00Z');
const formatDate = ms => new Date(ms).toISOString().slice(0, 10);
const weekday = d => new Date(time(d)).getUTCDay();
const east = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
function parseBars(bytes) {
  const [header, ...lines] = bytes.toString('utf8').trim().split(/\r?\n/);
  assert.equal(header, 't,o,h,l,c,v');
  return lines.map((line, i, all) => {
    const raw = line.split(',');
    const [t, o, h, l, c, v] = raw.map(Number);
    assert(raw.length === 6 && raw.every(x => x.length) && [t, o, h, l, c, v].every(Number.isFinite), `bad row ${i + 2}`);
    assert(Number.isInteger(t) && (i === 0 || t > +all[i - 1].split(',')[0]), `unordered or duplicate timestamp: ${i + 2}`);
    assert(l > 0 && l <= Math.min(o,c) && h >= Math.max(o,c) && v >= 0, `invalid OHLCV ${i + 2}`);
    assert([o,h,l,c].every(p => Number.isInteger(p * 4)), `non-tick increment ${i + 2}`);
    const p = Object.fromEntries(east.formatToParts(t * 1000).map(({type,value}) => [type,value]));
    assert.equal(`${p.hour}:${p.minute}:${p.second}`, '18:00:00', `unexpected bar start ${i + 2}`);
    const date = formatDate(time(`${p.year}-${p.month}-${p.day}`) + dayMs);
    assert(weekday(date) >= 1 && weekday(date) <= 5, `non-weekday trade date ${date}`);
    return {t, o, h, l, c, v, date};
  });
}

function interval(b, i, delay) {
  if (i < 1 || i + 10 >= b.length) return null;
  const prior = b[i - 1], signal = b[i + 3], entry = b[i + delay], exit = b[i + 10];
  assert(prior.t < signal.t && signal.t < entry.t && entry.t < exit.t);
  const move = signal.c - prior.c;
  if (!move) return null;
  return {
    event: b[i].date, prior: prior.date, signal: signal.date, entry: entry.date, exit: exit.date,
    move, signalPct: 100 * move / prior.c, side: -Math.sign(move), enter: entry.o, leave: exit.c,
    grossLong: usdPerPoint * (exit.c - entry.o), bars: b.slice(i + delay, i + 11)
  };
}
function nearQuarterRoll(row) {
  // Sensitivity only. Flag windows touching the calendar week before third Friday
  // through expiry, never claim this identifies the data vendor's roll.
  const start = time(row.prior), end = time(row.exit);
  for (const y of [new Date(start).getUTCFullYear(), new Date(end).getUTCFullYear()]) {
    for (const m of [2,5,8,11]) {
      const first = new Date(Date.UTC(y,m,1));
      const thirdFri = +first + ((5 - first.getUTCDay() + 7) % 7 + 14) * dayMs;
      if (start <= thirdFri && end >= thirdFri - 7 * dayMs) return true;
    }
  }
  return false;
}
function nearWeekdayGap(row, index) {
  // Include one weekday after exit to screen for holiday sessions whose recorded
  // start implies the holiday itself even when CME assigns the next trade date.
  let end = time(row.exit) + dayMs;
  while ([0,6].includes(weekday(formatDate(end)))) end += dayMs;
  for (let ms = time(row.prior); ms <= end; ms += dayMs) {
    const d = formatDate(ms);
    if (![0,6].includes(weekday(d)) && !index.has(d)) return true;
  }
  return false;
}
const pnl = (t, cost) => t.side * t.grossLong - cost;
function bootstrap(a) {
  if (!a.length) return [];
  let s = 14607883;
  const draws = [];
  for (let j = 0; j < 15000; j++) {
    let sum = 0;
    for (let k = 0; k < a.length; k++) {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      sum += a[Math.floor(s / 4294967296 * a.length)];
    }
    draws.push(sum / a.length);
  }
  draws.sort((x,y) => x-y);
  return [draws[375], draws[14625]].map(rounded);
}
function summarize(rows, cost, side = t => t.side) {
  const a = rows.map(t => side(t) * t.grossLong - cost);
  if (!a.length) return {n: 0};
  let equity = 0, maxClosed = 0, maxMarked = 0, closedDD = 0, markedDD = 0;
  let maxAdverseFromEntry = 0;
  rows.forEach((t,i) => {
    const direction = side(t);
    for (const b of t.bars) {
      const mark = equity + direction * (b.c - t.enter) * usdPerPoint - cost;
      const adverse = direction * ((direction === 1 ? b.l : b.h) - t.enter) * usdPerPoint - cost;
      maxMarked = Math.max(maxMarked, mark);
      markedDD = Math.max(markedDD, maxMarked - mark);
      maxAdverseFromEntry = Math.max(maxAdverseFromEntry, -adverse);
    }
    equity += a[i];
    maxClosed = Math.max(maxClosed, equity);
    closedDD = Math.max(closedDD, maxClosed - equity);
  });
  const sorted = [...a].sort((x,y) => x-y);
  const gain = a.filter(x=>x>0).reduce((x,y)=>x+y,0);
  const loss = -a.filter(x=>x<0).reduce((x,y)=>x+y,0);
  return {
    n: a.length, win: a.filter(x=>x>0).length, net: rounded(equity), avg: rounded(mean(a)),
    med: rounded((sorted[Math.floor((a.length-1)/2)] + sorted[Math.floor(a.length/2)])/2),
    pf: loss ? rounded(gain/loss) : null, dailyCloseDD: rounded(markedDD), closedDD: rounded(closedDD),
    maxAdverseFromEntry: rounded(maxAdverseFromEntry), best: sorted.at(-1), worst: sorted[0],
    withoutBest: rounded(equity - sorted.at(-1)), meanCI: bootstrap(a)
  };
}

function run(b, index, delay) {
  const dropped = [];
  const calendarDates = [...meetings, ...emergency];
  const events = meetings.flatMap(d => {
    const i = index.get(d);
    if (i === undefined) {
      if (d >= b[0].date && d <= b.at(-1).date) dropped.push([d, 'no matching trade date']);
      return [];
    }
    const row = interval(b, i, delay);
    if (!row) { dropped.push([d, 'incomplete window or zero signal']); return []; }
    if (calendarDates.some(x => x !== d && x > d && x <= row.exit)) {
      dropped.push([d, 'another policy event before exit']); return [];
    }
    row.nearRoll = nearQuarterRoll(row);
    row.nearGap = nearWeekdayGap(row,index);
    return [row];
  });
  events.forEach((x,i) => assert(!i || events[i-1].exit < x.entry, `overlapping trades ${x.event}`));
  const pre = events.filter(x => x.exit < split);
  const later = events.filter(x => x.event >= split);
  const eventIndices = calendarDates.map(d=>index.get(d)).filter(Number.isInteger);
  const controls = b.flatMap((_,i) => {
    // Exclude overlaps between the full [D-1, D+10] Fed and placebo windows.
    if (eventIndices.some(j => j + 10 >= i-1 && j - 1 <= i+10)) return [];
    const row = interval(b,i,delay);
    return row ? [row] : [];
  });
  const used = new Set();
  const pairs = [];
  for (const e of events) {
    const found = controls.filter(x =>
      !used.has(x.event) && x.event.slice(0,4) === e.event.slice(0,4)
      && weekday(x.event) === weekday(e.event) && x.side === e.side
      && Math.abs(time(x.event) - time(e.event)) <= 60*dayMs
      && ((e.event >= split && x.event >= split) || (e.exit < split && x.exit < split))
    ).sort((x,y) =>
      Math.abs(x.signalPct-e.signalPct)-Math.abs(y.signalPct-e.signalPct)
      || Math.abs(time(x.event)-time(e.event))-Math.abs(time(y.event)-time(e.event))
      || x.event.localeCompare(y.event))[0];
    if (!found) continue;
    used.add(found.event);
    e.placebo = found.event;
    e.placeboNet = pnl(found,baseCost);
    pairs.push(pnl(e,baseCost)-e.placeboNet);
  }
  const sum = (r, cost = baseCost, s) => summarize(r,cost,s);
  return {
    eventCount: events.length, dropped, full: sum(events), early: sum(pre),
    later: sum(later), splitStraddled: events.length - pre.length - later.length,
    stressed: sum(events, stressCost), longOnly: sum(events,baseCost,()=>1),
    momentum: sum(events,baseCost,t=>-t.side), exRoll: sum(events.filter(t=>!t.nearRoll)),
    exWeekdayGap: sum(events.filter(t=>!t.nearGap)),
    longSignals: sum(events.filter(t=>t.side===1)), shortSignals: sum(events.filter(t=>t.side===-1)),
    byYear: Object.fromEntries([...new Set(events.map(x=>x.event.slice(0,4)))].map(y=>
      [y,sum(events.filter(x=>x.event.startsWith(y)))])),
    matched: pairs.length && {
      n:pairs.length, eventMean: rounded(mean(events.filter(t=>t.placebo).map(t=>pnl(t,baseCost)))),
      placeboMean: rounded(mean(events.filter(t=>t.placebo).map(t=>t.placeboNet))),
      differenceMean: rounded(mean(pairs)), meanCI:bootstrap(pairs)
    },
    extremes: [...events].sort((a,b)=>pnl(a,baseCost)-pnl(b,baseCost)).filter((_,i)=>i===0||i===events.length-1)
      .map(t=>({event:t.event,side:t.side,net:pnl(t,baseCost)})),
    events
  };
}

const data = fs.readFileSync(process.argv[2]);
const raw = parseBars(data);
// Quint notes the final saved bar can be in progress, so never use it in a result.
const b = raw.slice(0,-1);
const ix = new Map(b.map((x,i)=>[x.date,i]));
assert.equal(ix.size,b.length,'duplicate trade date');
assert.equal(ix.get('2024-06-12') !== undefined,true,'trade date mapping failed');
assert.equal(formatDate(time(b[0].date)-dayMs),'2019-05-05','unexpected starting date');
const censored = run(b,ix,5);  // Timing check: skip D+4, enter at D+5 open.
const nextOpen = run(b,ix,4);  // Originally proposed rule; finalized D+3 assumed by next open.
assert.equal(censored.eventCount,nextOpen.eventCount);
const {events: censoredRows,...cs} = censored;
const {events: nextRows,...ns} = nextOpen;
assert(censoredRows.every((t,i) => t.event === nextRows[i].event && t.exit === nextRows[i].exit && t.side === nextRows[i].side));
if (process.argv[3]) {
  const csv = ['timing,event_date,signal_bar_date,entry_bar_date,exit_bar_date,side,signal_move_points,entry_bar_open,exit_bar_close,net_usd,cost_usd,near_calendar_roll,matched_placebo,matched_placebo_net_usd,near_weekday_gap'];
  for (const [label,rows] of [['day5_censored',censoredRows],['day4_original',nextRows]])
    for (const t of rows) csv.push([
      label,t.event,t.signal,t.entry,t.exit,t.side===1?'long':'short',t.move,t.enter,t.leave,
      pnl(t,baseCost),baseCost,t.nearRoll,t.placebo??'',t.placeboNet??'',t.nearGap
    ].join(','));
  fs.writeFileSync(process.argv[3],csv.join('\n')+'\n');
}
console.log(JSON.stringify({
  input:{sha256:crypto.createHash('sha256').update(data).digest('hex'), rawRows:raw.length,
    screenedRows:b.length, first:b[0].date, last:b.at(-1).date, lastRaw:raw.at(-1).date},
  settings:{split,baseCost,stressCost,scheduledDates:meetings.length},
  day5Censored:cs, day4Original:ns
},null,2));

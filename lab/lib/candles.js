'use strict';
// The lab's candle store: CSV files in lab/data (t = bar start in unix seconds UTC, o, h, l, c, v).
// The store only grows. New candles from TradingView are merged in, duplicates are dropped, and the newest copy of a
// candle wins (the last candle of a download may still have been forming).

const fs = require('fs');

function read(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
    const [t, o, h, l, c, v] = line.split(',').map(Number);
    return { t, o, h, l, c, v };
  });
}

function write(file, bars) {
  const lines = ['t,o,h,l,c,v', ...bars.map((b) => [b.t, b.o, b.h, b.l, b.c, b.v].join(','))];
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

// TradingView's OHLCV tool answers with rows [{t,o,h,l,c,v}] or columns {t:[],o:[],...}. Accept either, or a
// whole tool response that has them under "bars" or "data".
function fromTradingView(json) {
  const x = json.bars || json.data || json;
  if (Array.isArray(x)) return x.map((b) => ({ t: Number(b.t), o: +b.o, h: +b.h, l: +b.l, c: +b.c, v: +(b.v || 0) }));
  if (x && Array.isArray(x.t)) return x.t.map((t, i) => ({ t: Number(t), o: +x.o[i], h: +x.h[i], l: +x.l[i], c: +x.c[i], v: +((x.v || [])[i] || 0) }));
  throw new Error('no candles found: expected rows [{t,o,h,l,c,v}] or columns {t:[],o:[],...}');
}

function merge(oldBars, newBars) {
  const byTime = new Map();
  for (const b of oldBars) byTime.set(b.t, b);
  let added = 0;
  for (const b of newBars) {
    if (![b.t, b.o, b.h, b.l, b.c].every(Number.isFinite)) continue;
    if (!byTime.has(b.t)) added++;
    byTime.set(b.t, b);
  }
  return { bars: [...byTime.values()].sort((a, b) => a.t - b.t), added };
}

// The first and last candle as UTC dates, for reports.
function span(bars) {
  if (!bars.length) return null;
  const d = (t) => new Date(t * 1000).toISOString().slice(0, 10);
  return { from: d(bars[0].t), to: d(bars[bars.length - 1].t), candles: bars.length };
}

// Build longer candles from shorter ones (5-minute to 15-minute), so the nightly run needs one TradingView call, not two.
// Only complete periods count: a 15-minute candle needs all three of its 5-minute candles, starting on the quarter hour.
function aggregate(bars, minutes, base = 5) {
  const size = minutes * 60, need = minutes / base, groups = new Map();
  for (const b of bars) {
    const k = Math.floor(b.t / size) * size;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(b);
  }
  const out = [];
  for (const [t, g] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    if (g.length !== need || g[0].t !== t) continue;
    out.push({ t, o: g[0].o, h: Math.max(...g.map((b) => b.h)), l: Math.min(...g.map((b) => b.l)), c: g[g.length - 1].c, v: g.reduce((a, b) => a + (b.v || 0), 0) });
  }
  return out;
}

// Add 15-minute candles built from the 5-minute store, only after the newest 15-minute candle already saved.
function rebuild15(file5, file15) {
  const old = read(file15), last = old.length ? old[old.length - 1].t : 0;
  const fresh = aggregate(read(file5), 15).filter((b) => b.t > last);
  const { bars, added } = merge(old, fresh);
  write(file15, bars);
  return { added, total: bars.length };
}

// 1-minute to longer candles. A minute with no trades has no candle, so a period counts if it has any 1-minute candles,
// except the newest one while it may still be forming (its last minute hasn't been reached yet), and the oldest one if
// the 1-minute candles start part-way through it.
function from1m(bars, minutes = 5) {
  const size = minutes * 60, groups = new Map(), lastT = bars.length ? bars[bars.length - 1].t : 0, firstT = bars.length ? bars[0].t : 0;
  for (const b of bars) {
    const k = Math.floor(b.t / size) * size;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(b);
  }
  const out = [];
  for (const [t, g] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    if (lastT < t + size - 60 || t < firstT) continue;
    g.sort((a, b) => a.t - b.t);
    out.push({ t, o: g[0].o, h: Math.max(...g.map((b) => b.h)), l: Math.min(...g.map((b) => b.l)), c: g[g.length - 1].c, v: g.reduce((a, b) => a + (b.v || 0), 0) });
  }
  return out;
}

// Build the 5-minute store forward from the 1-minute store, so one TradingView call (1-minute candles) feeds every
// timeframe. Before writing, the built candles are checked against the stored 5-minute candles in the 2 hours before
// the newest one, where the two meet (the newest is left out: it may have been saved while still forming; older
// candles are left out so a single old difference between TradingView's two feeds can't block every night). Any
// difference there, or a gap between the stored 5-minute candles and the first built one, and nothing is written: the
// nightly job fetches 5-minute candles instead.
const CHECK_SECONDS = 2 * 3600;
function rebuildFrom1m(file1, file5, file15) {
  const one = read(file1), five = read(file5), built = from1m(one, 5);
  if (!built.length) return { status: 'EMPTY', added: 0, checked: 0, mismatched: 0 };
  const last5 = five.length ? five[five.length - 1].t : null, stored = new Map(five.map((b) => [b.t, b]));
  let checked = 0, mismatched = 0;
  const diffs = [];
  for (const b of built) {
    const s = stored.get(b.t);
    if (!s || b.t === last5 || b.t < last5 - CHECK_SECONDS) continue;
    checked++;
    if (s.o !== b.o || s.h !== b.h || s.l !== b.l || s.c !== b.c) { mismatched++; if (diffs.length < 3) diffs.push({ t: b.t, stored: [s.o, s.h, s.l, s.c], built: [b.o, b.h, b.l, b.c] }); }
  }
  if (mismatched) return { status: 'MISMATCH', added: 0, checked, mismatched, diffs };
  const fresh = last5 === null ? built : built.filter((b) => b.t >= last5);
  const gap = last5 !== null && fresh.length && fresh[0].t > last5 + 300 && !built.some((b) => b.t <= last5 + 300 && b.t >= last5);
  if (gap) return { status: 'GAP', added: 0, checked, mismatched, from: new Date(last5 * 1000).toISOString(), to: new Date(fresh[0].t * 1000).toISOString() };
  const { bars, added } = merge(five, fresh);
  write(file5, bars);
  const r15 = file15 ? rebuild15(file5, file15) : null;
  return { status: 'OK', added, checked, mismatched, total: bars.length, added15: r15 ? r15.added : 0 };
}

module.exports = { read, write, merge, fromTradingView, span, aggregate, rebuild15, from1m, rebuildFrom1m };

// node lab/lib/candles.js lab/data/mnq_5m.csv download.json  ->  merges a TradingView download into the store
// node lab/lib/candles.js --rebuild-15m                        ->  adds 15-minute candles built from the 5-minute store
// node lab/lib/candles.js --rebuild-from-1m                    ->  adds 5- and 15-minute candles built from the 1-minute store
if (require.main === module) {
  if (process.argv[2] === '--rebuild-from-1m') {
    const path = require('path'), dir = path.join(__dirname, '..', 'data');
    const r = rebuildFrom1m(path.join(dir, 'mnq_1m.csv'), path.join(dir, 'mnq_5m.csv'), path.join(dir, 'mnq_15m.csv'));
    if (r.status === 'OK') console.log(`OK: ${r.added} new 5-minute candles built from 1-minute candles (${r.checked} overlapping ones checked, all identical), ${r.total} in total; ${r.added15} new 15-minute candles`);
    else if (r.status === 'MISMATCH') console.log(`MISMATCH: ${r.mismatched} of ${r.checked} overlapping 5-minute candles differ from the ones built from 1-minute candles, so the 5-minute store is unchanged. Fetch 5-minute candles instead. ${JSON.stringify(r.diffs)}`);
    else if (r.status === 'GAP') console.log(`GAP: the 1-minute candles start at ${r.to} but the 5-minute store ends at ${r.from}. Fetch 5-minute candles to fill it, then run this again.`);
    else console.log('EMPTY: no 1-minute candles stored yet.');
    process.exit(r.status === 'OK' ? 0 : r.status === 'MISMATCH' ? 2 : r.status === 'GAP' ? 3 : 4);
  }
  if (process.argv[2] === '--rebuild-15m') {
    const dir = require('path').join(__dirname, '..', 'data');
    const r = rebuild15(require('path').join(dir, 'mnq_5m.csv'), require('path').join(dir, 'mnq_15m.csv'));
    console.log(`mnq_15m.csv: ${r.added} new candles built from 5-minute candles, ${r.total} in total`);
    process.exit(0);
  }
  const [csv, json] = process.argv.slice(2);
  if (!csv || !json) { console.error('usage: node lab/lib/candles.js lab/data/mnq_1m.csv tradingview-download.json'); process.exit(1); }
  const before = read(csv);
  const { bars, added } = merge(before, fromTradingView(JSON.parse(fs.readFileSync(json, 'utf8'))));
  write(csv, bars);
  console.log(`${csv}: ${added} new candles, ${bars.length} in total (${JSON.stringify(span(bars))})`);
}

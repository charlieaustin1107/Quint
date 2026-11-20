'use strict';
// Quint HQ end to end, at iPhone size, with a fake window.claude (storage, Claude, connectors, file saving), so it never
// spends real calls. Needs Playwright's Chromium (pre-installed in the cloud workspace). Screenshots go to the temp folder.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

let chromium = null;
try { ({ chromium } = require('playwright')); } catch (e) { /* skipped below */ }
const SHOTS = process.env.HQ_SHOTS || os.tmpdir();

function page(file) {
  // the same skeleton the Artifact tool wraps the page in
  const html = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + fs.readFileSync(file, 'utf8') + '</body></html>';
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hq-')), 'hq.html');
  fs.writeFileSync(out, html);
  return 'file://' + out;
}

const MOCKS = () => {
  window.__calls = [];
  const store = {};
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const doc = (p) => ({ id: p.split('/').pop(), path: p,
    async get() { const d = store[p]; return { id: p.split('/').pop(), exists: d !== undefined, data: () => (d === undefined ? undefined : clone(d)) }; },
    async set(d) { store[p] = clone(d); }, async update(d) { store[p] = { ...(store[p] || {}), ...clone(d) }; }, async delete() { delete store[p]; } });
  const col = (p) => ({ path: p,
    doc: (id) => doc(p + '/' + (id || Math.random().toString(36).slice(2))),
    async add(d) { const id = 'id' + Math.random().toString(36).slice(2, 8); store[p + '/' + id] = clone(d); return doc(p + '/' + id); },
    async get() { const docs = Object.keys(store).filter((k) => k.startsWith(p + '/') && !k.slice(p.length + 1).includes('/')).map((k) => ({ id: k.split('/').pop(), exists: true, data: () => clone(store[k]) })); return { docs, size: docs.length, empty: !docs.length }; } });
  store['feeds/tm'] = { at: '2026-11-19T23:30:00Z', dream: { date: '2026-11-19', status: 'Healthy', top: 'Level Sniper still needs its margin fix.', priorities: ['Fix the Level Sniper margin'] },
    bots: [{ name: 'Level Sniper', status: 'running', byType: { live: { n: 3, net: 120, today: { n: 2, net: 80 }, last5: { n: 9, net: 240 } }, sim: { n: 40, net: 900 } } }], rules: [{ title: 'Daily stop', text: 'Stop after -$300' }] };
  const mcp = { async callTool(server, tool) {
    window.__calls.push(['mcp', server, tool]);
    if (tool === 'list_triggers') return { payload: { data: [{ id: 't1', name: 'Quint Lab nightly run', enabled: true, next_run_at: '2026-11-20T22:15:00Z' }, { id: 't2', name: 'Quint HQ sync', enabled: true, next_run_at: '2026-11-20T23:25:00Z' }, { id: 't3', name: 'Jarvis nightly dream run', enabled: true, next_run_at: '2026-11-20T22:40:00Z' }] } };
    if (tool === 'mcp-tv-get-ohlcv') return { payload: { symbol: 'CME_MINI:MNQ1!', bars: Array.from({ length: 20 }, (_, i) => ({ t: 1795000000 + i * 300, o: 27000 + i, h: 27005 + i, l: 26995 + i, c: 27002 + i, v: 100 })) } };
    if (tool === 'get_signal_stats') return { payload: { totalSignals: 4, failedDispatches: 0 } };
    if (tool === 'list_strategies') return { payload: [{ mode: 'dev' }, { mode: 'deployed' }] };
    if (tool === 'get_credits') return { payload: { balance: 987 } };
    if (tool === 'fire_trigger' || tool === 'update_trigger') return { payload: { ok: true } };
    throw { code: 'tool_error', message: 'unknown tool' };
  } };
  const sample = async (input, opts) => {
    window.__calls.push(['sample', String(input).includes('WYLD')]);
    const acc = await opts.tools.find((t) => t.name === 'get_accounts').execute({});
    const sz = await opts.tools.find((t) => t.name === 'size_trade').execute({ stop_points: 10 });
    const text = `You have $${Array.isArray(acc) ? acc[0].room : 0} of room; ${sz.contracts} MNQ on a 10-point stop.`;
    if (opts.onText) opts.onText({ text, delta: text });
    return { text, truncated: false };
  };
  const caps = { db: { doc, collection: col }, user: { id: async () => 'u1', isOwner: async () => true }, sample, mcp, downloads: { async save(r) { window.__calls.push(['download', r.filename, r.data.split('\n').length]); return { status: 'saved' }; } } };
  window.claude = { use: async (name) => caps[name] || null };
  window.__store = store;
  if (window.speechSynthesis) { speechSynthesis.speak = (u) => setTimeout(() => { if (u.onstart) u.onstart(); if (u.onend) u.onend(); }, 5); speechSynthesis.cancel = () => {}; }
};

test('Quint HQ works end to end on an iPhone-size screen', { skip: !chromium && 'Playwright not installed' }, async () => {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.addInitScript(MOCKS);
    await p.goto(page(path.join(__dirname, '..', 'jarvis', 'index.html')));
    await p.waitForTimeout(400);
    const wide = () => p.evaluate(() => document.documentElement.scrollWidth);
    const tab = async (name) => { await p.click(`.tabbar button[data-tab="${name}"]`); await p.waitForTimeout(150); };

    // Today renders, with the Trading Mastery feed
    assert.match(await p.textContent('#money'), /Bots live today/);
    await p.screenshot({ path: path.join(SHOTS, 'hq-today.png') });

    // Desk: add a Lucid 50K, then size a trade on it
    await tab('desk');
    await p.click('#deskSeg button:has-text("Prop accounts")');
    await p.click('button:has-text("+ Lucid 50K")');
    await p.fill('#ac_balance', '50800');
    await p.fill('#ac_eodHigh', '51000');
    await p.click('#sheetCard button:has-text("Save")');
    await p.waitForTimeout(150);
    assert.match(await p.textContent('#deskBody'), /\$1,800 room/); // floor 49,000 = 51,000 high - 2,000
    await p.screenshot({ path: path.join(SHOTS, 'hq-desk-accounts.png') });
    await p.click('#deskSeg button:has-text("Size it")');
    await p.fill('#szEntry', '27000');
    await p.fill('#szStop', '26990');
    await p.fill('#szTarget', '27030');
    await p.waitForTimeout(80);
    const sized = await p.textContent('#szOut');
    assert.match(sized, /20 MNQ/); // a quarter of $1,800 = $450; 10 points = $20 + $2 costs a contract
    assert.match(sized, /3\.0R/);
    await p.screenshot({ path: path.join(SHOTS, 'hq-desk-size.png') });

    // Desk: pre-trade check gives a verdict, and the pillars tick
    await p.click('#deskSeg button:has-text("Pre-trade check")');
    await p.click('.check:has-text("Liquidity sweep")');
    assert.equal(await p.getAttribute('.check:has-text("Liquidity sweep")', 'aria-pressed'), 'true');
    assert.match(await p.textContent('.verdict'), /No trade|Wait|All four/);
    await p.screenshot({ path: path.join(SHOTS, 'hq-desk-check.png'), fullPage: true });

    // Desk: log a trade; P&L fills from the prices
    await p.click('#deskSeg button:has-text("Journal")');
    await p.click('button:has-text("Log a trade")');
    await p.fill('#tr_entry', '27000');
    await p.fill('#tr_exit', '27010');
    await p.fill('#tr_contracts', '2');
    assert.equal(await p.inputValue('#tr_pnl'), '38.00'); // 10 pts x $2 x 2 - $1 x 2 commission
    await p.click('#sheetCard button:has-text("Save")');
    await p.waitForTimeout(150);
    assert.match(await p.textContent('#deskBody'), /\+\$38/);
    await p.click('button:has-text("Export CSV")');
    await p.waitForTimeout(80);

    // Lab: every section renders; add an idea to the shared inbox
    await tab('lab');
    for (const s of ['Factory', 'Pillars', 'Bots', 'Library', 'Memory', 'Ideas']) { await p.click(`#labSeg button:has-text("${s}")`); await p.waitForTimeout(60); assert.ok((await wide()) <= 390, `Lab ${s} scrolls sideways`); }
    await p.fill('#idText', 'Test the Four Pillars on London session lows');
    await p.click('button:has-text("Add to the lab")');
    await p.waitForTimeout(150);
    assert.match(await p.textContent('#labBody'), /London session lows/);
    await p.click('#labSeg button:has-text("Factory")');
    await p.screenshot({ path: path.join(SHOTS, 'hq-lab-factory.png'), fullPage: true });
    await p.click('#labSeg button:has-text("Pillars")');
    await p.waitForTimeout(60);
    const pillars = await p.textContent('#labBody');
    assert.match(pillars, /Your four pillars, dissected/);
    assert.match(pillars, /Where setups die/);
    assert.match(pillars, /Each confirmation on its own/);
    assert.doesNotMatch(pillars, /profitable/i);
    await p.screenshot({ path: path.join(SHOTS, 'hq-lab-pillars.png'), fullPage: true });
    await p.click('#labSeg button:has-text("Memory")');
    await p.click('button:has-text("Load TraderDev")');
    await p.waitForTimeout(100);
    assert.match(await p.textContent('#tdOut'), /987/);

    // Ask: Quint uses the tools to answer
    await tab('ask');
    await p.fill('#q', 'How much room do I have?');
    await p.click('#askForm button[type=submit]');
    await p.waitForTimeout(200);
    assert.match(await p.textContent('#chat'), /\$1800 of room; 20 MNQ/);
    await p.screenshot({ path: path.join(SHOTS, 'hq-ask.png') });

    // More: nightly jobs and the on-demand MNQ check (two taps: the first warns about the call)
    await tab('more');
    await p.click('button:has-text("Check the jobs")');
    await p.waitForTimeout(150);
    assert.match(await p.textContent('#jobsList'), /Quint Lab nightly run/);
    assert.ok(await p.isVisible('#jobsList button:has-text("Run now")'));
    await p.click('button:has-text("Check MNQ (1 call)")');
    await p.click('button:has-text("Check MNQ (1 call)")');
    await p.waitForTimeout(150);
    assert.match(await p.textContent('#mnqOut'), /27,021/);
    await p.screenshot({ path: path.join(SHOTS, 'hq-more.png'), fullPage: true });

    // Today: the briefing uses everything above
    await tab('today');
    await p.click('#play');
    await p.waitForTimeout(150);
    const lines = await p.textContent('#lines');
    assert.match(lines, /Tightest account: Lucid 50K, with \$1,800 of room/);
    assert.match(lines, /NinjaTrader bots/);
    assert.match(lines, /strategy factory tested/);

    for (const t of ['today', 'ask', 'desk', 'lab', 'more']) { await tab(t); assert.ok((await wide()) <= 390, `${t} scrolls sideways`); }
    const calls = await p.evaluate(() => window.__calls);
    assert.ok(calls.some((c) => c[0] === 'download'), 'journal export');
    assert.ok(calls.some((c) => c[0] === 'sample' && c[1] === true), 'Quint was briefed on the strategy');
    const stored = await p.evaluate(() => Object.keys(window.__store));
    assert.ok(stored.some((k) => k.startsWith('data/users/u1/desk/accounts/')), 'accounts are private');
    assert.ok(stored.some((k) => k.startsWith('ideas/')), 'ideas reach the nightly run');
    assert.deepEqual(errs, []);
  } finally { await browser.close(); }
});

test('Quint HQ still works outside Claude, saving on the device', { skip: !chromium && 'Playwright not installed' }, async () => {
  const browser = await chromium.launch();
  try {
    const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(page(path.join(__dirname, '..', 'jarvis', 'index.html')) + '#ask');
    await p.waitForTimeout(200);
    await p.fill('#q', 'hello');
    await p.click('#askForm button[type=submit]');
    assert.match(await p.textContent('#chat'), /works when this page is open in Claude/);
    await p.click('.tabbar button[data-tab="desk"]');
    await p.click('#deskSeg button:has-text("Prop accounts")');
    assert.match(await p.textContent('#deskBody'), /saved on this device/);
    assert.deepEqual(errs, []);
  } finally { await browser.close(); }
});

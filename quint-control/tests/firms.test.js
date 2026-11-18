'use strict';
// Checks every prop firm preset in firms/ against the firm schema and against Quint's decisions.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { Registry } = require('../reference/lib/schema');

const FIRMS = path.join(__dirname, '..', 'firms');
const reg = new Registry(FIRMS);
const presets = fs.readdirSync(FIRMS).filter((f) => f.endsWith('.json') && f !== 'firm.schema.json');

// Reads a path like "sizes[0].profitTarget" out of an object.
function getPath(obj, p) {
  return p.split('.').reduce((node, part) => {
    if (node === undefined) return undefined;
    const m = part.match(/^([A-Za-z]+)(?:\[(\d+)\])?$/);
    if (!m) return undefined;
    const next = node[m[1]];
    return m[2] === undefined ? next : (next || [])[Number(m[2])];
  }, obj);
}

test('there is at least the LucidDaily preset', () => {
  assert.ok(presets.includes('lucid-daily.json'));
});

for (const f of presets) {
  const firm = JSON.parse(fs.readFileSync(path.join(FIRMS, f), 'utf8'));

  test(f + ' matches the firm schema', () => {
    assert.deepEqual(reg.validate('firm.schema.json', firm), []);
    assert.equal(firm.id + '.json', f, 'file name must be the id');
  });

  test(f + ': every verify and quintDefaults path exists', () => {
    for (const p of [...firm.verify, ...firm.quintDefaults]) {
      assert.notEqual(getPath(firm, p), undefined, f + ': ' + p + ' does not exist');
    }
    const both = firm.verify.filter((p) => firm.quintDefaults.includes(p));
    assert.deepEqual(both, [], 'a number is either a firm rule to verify or a Quint default, not both');
  });

  test(f + ': lastChecked is a real date that is not in the future', () => {
    const d = Date.parse(firm.lastChecked + 'T00:00:00Z');
    assert.ok(!Number.isNaN(d));
    assert.ok(d <= Date.now() + 24 * 3600 * 1000);
  });

  test(f + ': the sizes make sense', () => {
    for (const s of firm.sizes) {
      assert.ok(s.maxLossLimit < s.size, 'max loss must be smaller than the account');
      if (s.profitTarget !== null) assert.ok(s.profitTarget < s.size);
      if (s.dailyLossLimit !== null) assert.ok(s.dailyLossLimit <= s.maxLossLimit);
    }
  });

  test(f + ': a Rithmic route is never marked as several connections at once', () => {
    if (firm.connection.route === 'Rithmic') assert.equal(firm.connection.severalAtOnce, false);
  });
}

test('LucidDaily matches the decisions the owner made', () => {
  const l = JSON.parse(fs.readFileSync(path.join(FIRMS, 'lucid-daily.json'), 'utf8'));
  assert.equal(l.connection.route, 'Tradovate');
  assert.equal(l.costs.commissionPerSide.MNQ, 0.5);
  assert.equal(l.costs.slippageTicksPerSide, 1);
  const fifty = l.sizes.find((s) => s.size === 50000);
  assert.equal(fifty.maxLossLimit, 2000);
  assert.equal(fifty.drawdownFunded, 'intradayTrailing');
  assert.equal(l.rules.news.redFolder, 'hardBreach');
  assert.equal(l.rules.news.blockNewEntries, true);
  assert.equal(l.rules.hedging.allowed, false);
  assert.ok(l.rules.hedging.correlatedGroups.some((g) => g.includes('MNQ') && g.includes('MES')), 'MNQ against MES counts as hedging');
  assert.equal(l.rules.microscalping.minHoldSeconds, 30);
  assert.equal(l.rules.hft.maxOrdersPerMinutePerAccount, 6);
  assert.equal(l.rules.sizing.maxStopOutShareOfRoom, 0.25);
});

test('every preset keeps Quint\'s news margin at least as wide as the firm\'s own', () => {
  for (const f of presets) {
    const n = JSON.parse(fs.readFileSync(path.join(FIRMS, f), 'utf8')).rules.news;
    if (n.firmFlatMinutesBefore !== undefined) assert.ok(n.flatMinutesBefore >= n.firmFlatMinutesBefore, f);
    if (n.firmFlatMinutesAfter !== undefined) assert.ok(n.flatMinutesAfter >= n.firmFlatMinutesAfter, f);
  }
});

test('LucidDaily 50K matches Lucid\'s help center (checked 2026-11-18)', () => {
  const l = JSON.parse(fs.readFileSync(path.join(FIRMS, 'lucid-daily.json'), 'utf8'));
  const fifty = l.sizes.find((s) => s.size === 50000);
  assert.equal(fifty.profitTarget, 3000);
  assert.equal(fifty.maxLossLimit, 2000);
  assert.equal(fifty.initialTrailBalance, 52100, 'the max loss stops trailing here');
  assert.equal(fifty.lockedMllBalance, 50100, 'and locks here');
  assert.equal(fifty.dailyLossLimit, 1200);
  assert.equal(fifty.dailyLossLimitOptional, true, 'the daily loss limit is chosen at checkout');
  assert.equal(fifty.maxMicros, 40);
  assert.equal(fifty.maxMinis, 4);
  assert.equal(l.rules.dailyLoss.breach, 'soft', 'hitting it pauses trading until the next session');
  assert.equal(l.rules.maxFundedAccounts, 5);
  assert.equal(l.rules.maxAccountsTotal, 10);
  assert.equal(l.rules.news.firmFlatMinutesBefore, 1);
  assert.equal(l.rules.news.firmFlatMinutesAfter, 1);
  assert.equal(l.rules.consistency.funded, null, 'no consistency rule once funded');
  assert.ok(l.rules.consistency.evaluationOptions.includes(l.rules.consistency.evaluation));
  for (const s of l.sizes) assert.ok(s.lockedMllBalance === s.size + 100 && s.initialTrailBalance === s.size + s.maxLossLimit + 100, s.size + ': trail and lock balances');
});

module.exports = { getPath };

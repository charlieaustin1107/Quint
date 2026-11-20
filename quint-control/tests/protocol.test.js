'use strict';
// Checks the engine-to-website protocol: every schema loads, every example passes its schema,
// protocol.md lists exactly the message types that have schemas, and bad messages are refused.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { Registry } = require('../reference/lib/schema');

const ROOT = path.join(__dirname, '..');
const SCHEMAS = path.join(ROOT, 'protocol', 'schemas');
const EXAMPLES = path.join(ROOT, 'protocol', 'examples');
const reg = new Registry(SCHEMAS);

const schemaTypes = fs.readdirSync(SCHEMAS).filter((f) => f.endsWith('.json') && f !== 'common.json' && !f.endsWith('.schema.json')).map((f) => f.replace(/\.json$/, '')).sort();
const exampleFiles = fs.readdirSync(EXAMPLES).filter((f) => f.endsWith('.json')).sort();
const load = (f) => JSON.parse(fs.readFileSync(path.join(EXAMPLES, f), 'utf8'));
const example = (name) => JSON.parse(JSON.stringify(load(name + '.json')));
const check = (msg) => reg.validate(msg.type + '.json', msg);

test('every schema file is valid JSON with a title and its own type name', () => {
  assert.ok(schemaTypes.length >= 15, 'expected at least 15 message types, found ' + schemaTypes.length);
  for (const t of schemaTypes) {
    const s = reg.load(t + '.json');
    assert.ok(s.title, t + ' needs a title');
    assert.ok(s.description, t + ' needs a description');
    assert.equal(s.$id, t + '.json');
    assert.deepEqual(s.properties.type, { const: t }, t + ': the type field must be the const "' + t + '"');
    assert.deepEqual(s.properties.v, { $ref: 'common.json#/$defs/version' });
  }
});

test('every example passes its schema', () => {
  for (const f of exampleFiles) {
    const msg = load(f);
    assert.ok(schemaTypes.includes(msg.type), f + ': unknown type ' + msg.type);
    assert.ok(f === msg.type + '.json' || f.startsWith(msg.type + '.'), f + ': file name should start with its type');
    assert.deepEqual(check(msg), [], f);
  }
});

test('every message type has at least one example', () => {
  const covered = new Set(exampleFiles.map((f) => load(f).type));
  for (const t of schemaTypes) assert.ok(covered.has(t), 'no example for ' + t);
});

test('protocol.md lists exactly the message types that have schemas', () => {
  const md = fs.readFileSync(path.join(ROOT, 'protocol.md'), 'utf8');
  const listed = [...md.matchAll(/^\| `([a-z_]+)` \| (website|engine) → (website|engine) \|/gm)].map((m) => m[1]).sort();
  assert.deepEqual(listed, schemaTypes);
  for (const t of schemaTypes) {
    const dir = md.match(new RegExp('^\\| `' + t + '` \\| (website|engine) →', 'm'))[1];
    const s = reg.load(t + '.json');
    // Messages from the website carry an id; messages from the engine carry a seq.
    assert.ok(dir === 'website' ? s.required.includes('id') : s.required.includes('seq'), t + ' has the wrong envelope for its direction');
  }
});

test('protocol.md lists exactly the commands in the command schema', () => {
  const md = fs.readFileSync(path.join(ROOT, 'protocol.md'), 'utf8');
  const listed = [...md.matchAll(/^\| `([a-zA-Z]+\.[a-zA-Z]+)` \| (raises|lowers|depends) \|/gm)].map((m) => m[1]).sort();
  const inSchema = reg.load('command.json').properties.data.oneOf.map((c) => c.properties.name.const).sort();
  assert.deepEqual(listed, inSchema);
});

test('every command example matches exactly one command shape', () => {
  const shapes = reg.load('command.json').properties.data.oneOf;
  for (const f of exampleFiles.filter((x) => x.startsWith('command.'))) {
    const data = load(f).data;
    const matches = shapes.filter((s) => s.properties.name.const === data.name);
    assert.equal(matches.length, 1, f);
  }
});

test('wrong version, unknown fields and missing fields are refused', () => {
  const m = example('account');
  m.v = 2;
  assert.ok(check(m).length > 0, 'v=2 should fail');
  const extra = example('account');
  extra.data.accountNumber = '123';
  assert.ok(check(extra).some((e) => /unexpected field "accountNumber"/.test(e)));
  const missing = example('position');
  delete missing.data.protected;
  assert.ok(check(missing).some((e) => /missing "protected"/.test(e)));
  const noSeq = example('heartbeat');
  delete noSeq.seq;
  assert.ok(check(noSeq).length > 0);
});

test('bad values are refused: sides, order states, times, instruments, bot ids', () => {
  const o = example('order');
  o.data.side = 'Long';
  assert.ok(check(o).length > 0, 'side must be Buy or Sell');
  const s = example('order');
  s.data.state = 'Done';
  assert.ok(check(s).length > 0, 'state must be a NinjaTrader OrderState');
  const t = example('fill');
  t.data.time = '18/11/2026 14:33';
  assert.ok(check(t).length > 0, 'time must be ISO 8601');
  const i = example('market');
  i.data.instrument = 'mnq dec';
  assert.ok(check(i).length > 0, 'instrument must look like "MNQ 12-26"');
  const b = example('bot');
  b.data.id = 'Noise Area!';
  assert.ok(check(b).length > 0, 'bot ids are lower-case with dashes');
  const q = example('fill');
  q.data.quantity = 0;
  assert.ok(check(q).length > 0, 'a fill has at least 1 contract');
});

test('hello needs a long enough token', () => {
  const h = example('hello');
  h.data.token = 'short';
  assert.ok(check(h).length > 0);
  delete h.data.token;
  assert.ok(check(h).length > 0);
});

test('commands: unknown names, wrong arguments and bad tokens are refused', () => {
  const unknown = example('command.kill-all');
  unknown.data.name = 'order.submit';
  assert.ok(check(unknown).length > 0, 'the website can never send a raw order');
  const noAccount = example('command.go-live');
  delete noAccount.data.args.account;
  assert.ok(check(noAccount).length > 0, 'go live needs the account');
  const extraArg = example('command.bot-stop');
  extraArg.data.args.skipGuardian = true;
  assert.ok(check(extraArg).length > 0, 'there is no argument that skips the guardian');
  const badToken = example('command.go-live-confirmed');
  badToken.data.confirmToken = 'x';
  assert.ok(check(badToken).length > 0);
  const tooMany = example('command.kill-all');
  tooMany.data.args = { flatten: 'yes' };
  assert.ok(check(tooMany).length > 0);
});

test('the confirm flow examples fit together', () => {
  const ask = example('command.go-live');
  const reply = example('command_result.needs-confirm');
  const again = example('command.go-live-confirmed');
  assert.equal(ask.data.confirmToken, undefined, 'the first send has no token');
  assert.equal(reply.data.commandId, ask.id);
  assert.equal(reply.data.status, 'needs_confirm');
  assert.equal(again.data.confirmToken, reply.data.confirm.token);
  assert.equal(again.data.typedConfirm, reply.data.confirm.requireTyped);
  assert.deepEqual(again.data.args, ask.data.args, 'the confirmed command must be the same command');
  assert.ok(Date.parse(reply.data.confirm.expiresAt) - Date.parse(reply.ts) <= 60000, 'tokens last at most 60 seconds');
});

test('example numbers are sensible for MNQ', () => {
  const pos = example('position').data;
  assert.ok(pos.stop < pos.avgPrice && pos.target > pos.avgPrice, 'a long has its stop below and target above');
  for (const p of [pos.avgPrice, pos.stop, pos.target]) assert.equal((p * 4) % 1, 0, p + ' is not on a 0.25 tick');
  const fill = example('fill').data;
  assert.equal(fill.commission, 0.5, 'LucidDaily MNQ commission is $0.50 a side');
  const acct = example('account').data;
  assert.equal(acct.dayHighBalance - acct.lossFloor, 2000, 'LucidDaily 50K max loss is $2,000 from the day high');
  const snap = example('snapshot').data;
  assert.ok(snap.positions.every((p) => p.marketPosition === 'Flat' || p.protected), 'every open position in the example is protected');
  const seqs = exampleFiles.map(load).filter((m) => 'seq' in m).map((m) => m.seq);
  assert.equal(new Set(seqs).size, seqs.length, 'example seq numbers are unique');
});

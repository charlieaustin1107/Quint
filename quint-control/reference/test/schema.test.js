'use strict';
// Tests for the hand-written schema checker, so we can trust it when it says a message is fine.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Registry, typeOf } = require('../lib/schema');

function registryWith(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quint-schema-'));
  for (const [name, schema] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), JSON.stringify(schema));
  }
  return new Registry(dir);
}

test('typeOf tells integers, numbers, arrays and null apart', () => {
  assert.equal(typeOf(1), 'integer');
  assert.equal(typeOf(1.5), 'number');
  assert.equal(typeOf([]), 'array');
  assert.equal(typeOf(null), 'null');
  assert.equal(typeOf({}), 'object');
  assert.equal(typeOf('x'), 'string');
});

test('types, including integer counting as number and nullable lists', () => {
  const r = registryWith({ 's.json': { type: 'object', properties: { a: { type: 'number' }, b: { type: ['integer', 'null'] } } } });
  assert.deepEqual(r.validate('s.json', { a: 2, b: null }), []);
  assert.deepEqual(r.validate('s.json', { a: 2.5, b: 3 }), []);
  assert.equal(r.validate('s.json', { a: 'x' }).length, 1);
  assert.equal(r.validate('s.json', { b: 1.5 }).length, 1);
  assert.equal(r.validate('s.json', []).length, 1);
});

test('required, unexpected fields and additionalProperties schemas', () => {
  const r = registryWith({
    's.json': { type: 'object', required: ['a'], additionalProperties: false, properties: { a: { type: 'string' } } },
    'm.json': { type: 'object', additionalProperties: { type: 'number', minimum: 0 } },
  });
  assert.deepEqual(r.validate('s.json', { a: 'x' }), []);
  assert.match(r.validate('s.json', {})[0], /missing "a"/);
  assert.match(r.validate('s.json', { a: 'x', b: 1 })[0], /unexpected field "b"/);
  assert.deepEqual(r.validate('m.json', { MNQ: 0.5, MES: 0.5 }), []);
  assert.equal(r.validate('m.json', { MNQ: -1 }).length, 1);
});

test('enum, const, numbers and strings', () => {
  const r = registryWith({
    's.json': {
      type: 'object',
      properties: {
        side: { enum: ['Buy', 'Sell'] },
        v: { const: 1 },
        n: { type: 'number', minimum: 0, maximum: 10 },
        x: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1 },
        s: { type: 'string', minLength: 2, maxLength: 4, pattern: '^[A-Z]+$' },
      },
    },
  });
  assert.deepEqual(r.validate('s.json', { side: 'Buy', v: 1, n: 10, x: 0.5, s: 'MNQ' }), []);
  const bad = r.validate('s.json', { side: 'Long', v: 2, n: 11, x: 0, s: 'm' });
  assert.equal(bad.length, 6, bad.join('\n')); // enum, const, max, exclusiveMin, minLength, pattern
});

test('date-time and date formats', () => {
  const r = registryWith({ 's.json': { type: 'object', properties: { t: { type: 'string', format: 'date-time' }, d: { type: 'string', format: 'date' } } } });
  assert.deepEqual(r.validate('s.json', { t: '2026-11-18T14:35:02.120Z', d: '2026-11-18' }), []);
  assert.deepEqual(r.validate('s.json', { t: '2026-11-18T09:35:02-05:00' }), []);
  assert.equal(r.validate('s.json', { t: '18/11/2026 14:35' }).length, 1);
  assert.equal(r.validate('s.json', { t: '2026-13-45T99:00:00Z' }).length, 1);
  assert.equal(r.validate('s.json', { d: '2026-11-18T00:00:00Z' }).length, 1);
});

test('arrays: items, min, max and unique', () => {
  const r = registryWith({ 's.json': { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 2, uniqueItems: true } });
  assert.deepEqual(r.validate('s.json', ['a', 'b']), []);
  assert.equal(r.validate('s.json', []).length, 1);
  assert.equal(r.validate('s.json', ['a', 'b', 'c']).length, 1);
  assert.equal(r.validate('s.json', ['a', 'a']).length, 1);
  assert.match(r.validate('s.json', [1])[0], /\$\[0\]/);
});

test('$ref inside a file and across files, including refs inside the referenced file', () => {
  const r = registryWith({
    'common.json': { $defs: { price: { type: 'number', minimum: 0 }, maybePrice: { anyOf: [{ $ref: '#/$defs/price' }, { type: 'null' }] } } },
    's.json': { type: 'object', properties: { p: { $ref: 'common.json#/$defs/maybePrice' }, q: { $ref: '#/$defs/q' } }, $defs: { q: { type: 'integer' } } },
  });
  assert.deepEqual(r.validate('s.json', { p: 1.25, q: 3 }), []);
  assert.deepEqual(r.validate('s.json', { p: null }), []);
  assert.equal(r.validate('s.json', { p: -1 }).length, 1);
  assert.equal(r.validate('s.json', { q: 'x' }).length, 1);
  const broken = registryWith({ 's.json': { $ref: '#/$defs/missing' } });
  assert.throws(() => broken.validate('s.json', 1), /Unresolvable/);
});

test('oneOf needs exactly one match; anyOf needs at least one', () => {
  const r = registryWith({
    'one.json': { oneOf: [{ type: 'integer' }, { type: 'number', minimum: 5 }] },
    'any.json': { anyOf: [{ type: 'integer' }, { type: 'number', minimum: 5 }] },
  });
  assert.deepEqual(r.validate('one.json', 2), []);
  assert.match(r.validate('one.json', 7)[0], /exactly one/);
  assert.equal(r.validate('one.json', 2.5).length, 1);
  assert.deepEqual(r.validate('any.json', 7), []);
  assert.equal(r.validate('any.json', 2.5).length, 1);
});

test('an unsupported keyword is reported, not silently ignored', () => {
  const r = registryWith({ 's.json': { type: 'string', contentEncoding: 'base64' } });
  assert.match(r.validate('s.json', 'x')[0], /unsupported keyword "contentEncoding"/);
});

test('an empty schema allows anything', () => {
  const r = registryWith({ 's.json': { type: 'object', properties: { value: {} } } });
  for (const value of [1, 'x', null, [1], { a: 1 }, true]) assert.deepEqual(r.validate('s.json', { value }), []);
});

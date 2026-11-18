'use strict';
// A small JSON Schema checker for the parts of draft 2020-12 that Quint Control's
// schemas use. Written by hand because package installs are off in the cloud
// workspace, and so the engine's C# self-tests can mirror it line for line.
//
// Supported: type, enum, const, properties, required, additionalProperties (true,
// false or a schema), items, minItems, maxItems, uniqueItems, minimum, maximum,
// exclusiveMinimum, exclusiveMaximum, minLength, maxLength, pattern,
// format (date-time, date), $ref (inside a file and across files), oneOf, anyOf, allOf.
// Anything else in a schema is a mistake, so it is reported instead of ignored.

const fs = require('fs');
const path = require('path');

const KNOWN = new Set(['$schema', '$id', '$defs', 'title', 'description', 'type', 'enum', 'const',
  'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems', 'uniqueItems',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'pattern',
  'format', '$ref', 'oneOf', 'anyOf', 'allOf']);

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,7})?(Z|[+-]\d{2}:\d{2})$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v; // string, boolean, object
}

function typeMatches(want, v) {
  const got = typeOf(v);
  if (want === got) return true;
  if (want === 'number' && got === 'integer') return true;
  return false;
}

function equal(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function validDate(s) {
  const d = new Date(s.length === 10 ? s + 'T00:00:00Z' : s);
  return !Number.isNaN(d.getTime());
}

// A Registry loads schema files from one folder and resolves $ref between them.
class Registry {
  constructor(dir) {
    this.dir = dir;
    this.files = new Map();
  }

  load(file) {
    if (!this.files.has(file)) {
      const full = path.join(this.dir, file);
      this.files.set(file, JSON.parse(fs.readFileSync(full, 'utf8')));
    }
    return this.files.get(file);
  }

  resolve(ref, baseFile) {
    const hash = ref.indexOf('#');
    const file = hash === 0 ? baseFile : (hash < 0 ? ref : ref.slice(0, hash));
    const pointer = hash < 0 ? '' : ref.slice(hash + 1);
    let node = this.load(file);
    for (const part of pointer.split('/').filter(Boolean)) {
      const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
      if (node === undefined || node === null || !(key in node)) {
        throw new Error('Unresolvable $ref "' + ref + '" from ' + baseFile);
      }
      node = node[key];
    }
    return { schema: node, file };
  }

  // Returns a list of problems; an empty list means the value is valid.
  validate(file, value) {
    const errors = [];
    check(this, this.load(file), file, value, '$', errors);
    return errors;
  }
}

function check(reg, schema, file, v, at, errors) {
  if (schema === true || (schema && typeof schema === 'object' && Object.keys(schema).length === 0)) return;
  if (schema === false) { errors.push(at + ': nothing is allowed here'); return; }

  for (const key of Object.keys(schema)) {
    if (!KNOWN.has(key)) errors.push(at + ': schema uses unsupported keyword "' + key + '" (' + file + ')');
  }

  if (schema.$ref) {
    const r = reg.resolve(schema.$ref, file);
    check(reg, r.schema, r.file, v, at, errors);
  }

  if (schema.type !== undefined) {
    const wants = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!wants.some((t) => typeMatches(t, v))) {
      errors.push(at + ': expected ' + wants.join(' or ') + ', got ' + typeOf(v));
      return;
    }
  }

  if (schema.const !== undefined && !equal(schema.const, v)) {
    errors.push(at + ': must be ' + JSON.stringify(schema.const));
  }
  if (schema.enum && !schema.enum.some((e) => equal(e, v))) {
    errors.push(at + ': must be one of ' + schema.enum.map((e) => JSON.stringify(e)).join(', '));
  }

  const t = typeOf(v);
  if (t === 'integer' || t === 'number') {
    if (schema.minimum !== undefined && v < schema.minimum) errors.push(at + ': must be at least ' + schema.minimum);
    if (schema.maximum !== undefined && v > schema.maximum) errors.push(at + ': must be at most ' + schema.maximum);
    if (schema.exclusiveMinimum !== undefined && v <= schema.exclusiveMinimum) errors.push(at + ': must be more than ' + schema.exclusiveMinimum);
    if (schema.exclusiveMaximum !== undefined && v >= schema.exclusiveMaximum) errors.push(at + ': must be less than ' + schema.exclusiveMaximum);
  }

  if (t === 'string') {
    if (schema.minLength !== undefined && v.length < schema.minLength) errors.push(at + ': must be at least ' + schema.minLength + ' characters');
    if (schema.maxLength !== undefined && v.length > schema.maxLength) errors.push(at + ': must be at most ' + schema.maxLength + ' characters');
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(v)) errors.push(at + ': does not match ' + schema.pattern);
    if (schema.format === 'date-time' && !(DATE_TIME.test(v) && validDate(v))) errors.push(at + ': must be an ISO 8601 date-time');
    if (schema.format === 'date' && !(DATE.test(v) && validDate(v))) errors.push(at + ': must be a date like 2026-11-18');
  }

  if (t === 'array') {
    if (schema.minItems !== undefined && v.length < schema.minItems) errors.push(at + ': needs at least ' + schema.minItems + ' items');
    if (schema.maxItems !== undefined && v.length > schema.maxItems) errors.push(at + ': allows at most ' + schema.maxItems + ' items');
    if (schema.uniqueItems) {
      const seen = new Set(v.map((x) => JSON.stringify(x)));
      if (seen.size !== v.length) errors.push(at + ': items must be unique');
    }
    if (schema.items !== undefined) v.forEach((item, i) => check(reg, schema.items, file, item, at + '[' + i + ']', errors));
  }

  if (t === 'object') {
    const props = schema.properties || {};
    for (const name of schema.required || []) {
      if (!(name in v)) errors.push(at + ': missing "' + name + '"');
    }
    for (const [name, value] of Object.entries(v)) {
      if (name in props) check(reg, props[name], file, value, at + '.' + name, errors);
      else if (schema.additionalProperties === false) errors.push(at + ': unexpected field "' + name + '"');
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        check(reg, schema.additionalProperties, file, value, at + '.' + name, errors);
      }
    }
  }

  if (schema.allOf) schema.allOf.forEach((s) => check(reg, s, file, v, at, errors));

  if (schema.anyOf || schema.oneOf) {
    const list = schema.anyOf || schema.oneOf;
    const results = list.map((s) => { const e = []; check(reg, s, file, v, at, e); return e; });
    const passing = results.filter((e) => e.length === 0).length;
    if (schema.anyOf && passing === 0) errors.push(at + ': matches none of the allowed shapes (' + closest(results) + ')');
    if (schema.oneOf && passing !== 1) {
      errors.push(at + (passing === 0 ? ': matches none of the allowed shapes (' + closest(results) + ')'
        : ': matches ' + passing + ' shapes, should match exactly one'));
    }
  }
}

// The shortest error list is usually the shape the sender meant.
function closest(results) {
  const best = results.slice().sort((a, b) => a.length - b.length)[0] || [];
  return best.slice(0, 3).join('; ');
}

module.exports = { Registry, typeOf };

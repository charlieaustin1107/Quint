'use strict';
// Checks the project is laid out the way the plan says, that the install scripts only touch
// Quint's own folders, and that no secret or account number has slipped into the repo.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPO = path.join(ROOT, '..');
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

test('every planned folder exists with a README', () => {
  for (const d of ['core', 'engine', 'strategies', 'reference', 'web', 'tests', 'tests/golden', 'help', 'install', 'firms', 'protocol']) {
    assert.ok(fs.existsSync(path.join(ROOT, d, 'README.md')), d + '/README.md is missing');
  }
});

test('the handover files are there: plan, prompts, status, setup, protocol', () => {
  const plan = read(ROOT, 'PLAN.md');
  for (const h of ['## Lucid Trading', '## Copying your own trades', '## Strategies', '## Build phases for Fable', '## Decisions']) {
    assert.ok(plan.includes(h), 'PLAN.md is missing "' + h + '"');
  }
  const prompts = read(ROOT, 'FABLE-PROMPTS.md');
  assert.ok(prompts.includes('## Master prompt'));
  for (const p of ['0', '1', '2', '3', '4', '4b', '5', '6', '7']) {
    assert.ok(prompts.includes('### Phase ' + p + ':'), 'FABLE-PROMPTS.md is missing phase ' + p);
  }
  const status = read(ROOT, 'STATUS.md');
  for (const p of ['| Phase 0 — project foundation |', '| Phase 1 — engine and website shell |', '| Phase 2 — Guardian, OrderRouter, copier |', '| Phase 3 — strategy plug-ins and bots |', '| Phase 4 / 4b — validation, account setup, alerts |', '| Phase 5 — Quint assistant, journal and brain |', '| Phase 6 — release candidate / live readiness |', '| Phase 7 — extras |']) {
    assert.ok(status.includes(p), 'STATUS.md is missing the current phase row ' + p);
  }
  assert.ok(status.includes('## Next actions'));
  assert.ok(status.includes('## Resume protocol'));
  const setup = read(ROOT, 'SETUP.md');
  for (const s of ['Multi-provider', 'trader.tradovate.com', 'Simulation', 'Sim101', 'Install-Quint.ps1', 'F5']) {
    assert.ok(setup.includes(s), 'SETUP.md should mention ' + s);
  }
});

test('the quint-control skill and CLAUDE.md carry the rules', () => {
  const skill = read(REPO, '.claude', 'skills', 'quint-control', 'SKILL.md');
  assert.match(skill, /^---\nname: quint-control\ndescription: .+\n---\n/);
  for (const s of ['Guardian.Check', 'OrderRouter', 'C# 7.3', 'DPAPI', '127.0.0.1', '$0.50', '25%', 'Go Live Now', 'Manual Copy', 'three times']) {
    assert.ok(skill.includes(s), 'SKILL.md should mention ' + s);
  }
  const claude = read(REPO, 'CLAUDE.md');
  assert.ok(claude.includes('`quint-control/`'), 'CLAUDE.md should list the quint-control folder');
  assert.ok(claude.includes('Only the Quint Engine'), 'CLAUDE.md should say only the engine places orders');
  assert.ok(!claude.includes('the apps should never place real orders'), 'the old rule should be replaced');
});

test('package.json runs tests with nothing to install', () => {
  const pkg = JSON.parse(read(ROOT, 'package.json'));
  assert.match(pkg.scripts.test, /^node --test /);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
});

const scripts = ['Install-Quint.ps1', 'Uninstall-Quint.ps1'].map((f) => ({ f, src: read(ROOT, 'install', f) }));

test('the install scripts are plain ASCII (Windows PowerShell 5.1 misreads anything else)', () => {
  for (const { f, src } of scripts) {
    const bad = [...src].findIndex((ch) => ch.charCodeAt(0) > 126 || (ch.charCodeAt(0) < 32 && !'\r\n\t'.includes(ch)));
    assert.equal(bad, -1, f + ' has a non-ASCII character at position ' + bad);
  }
});

test('the install scripts stop on errors and use exact paths', () => {
  for (const { f, src } of scripts) {
    assert.ok(src.includes("$ErrorActionPreference = 'Stop'"), f + ' should stop on the first error');
    assert.ok(src.includes("[Environment]::GetFolderPath('MyDocuments')"), f + ' should find Documents the OneDrive-safe way');
    for (const line of src.split('\n').filter((l) => /Remove-Item/.test(l))) {
      assert.match(line, /-LiteralPath/, f + ': Remove-Item must use -LiteralPath: ' + line.trim());
    }
  }
});

test('the installer only ever deletes Quint folders, and backs up first', () => {
  const src = scripts[0].src;
  const removes = src.split('\n').filter((l) => /Remove-Item/.test(l)).map((l) => l.trim());
  assert.equal(removes.length, 2, 'expected exactly two Remove-Item lines in the installer');
  assert.ok(removes.some((l) => l.includes('$_.FullName')) && src.includes("Join-Path $data 'backups'"), 'one prunes old backups');
  assert.ok(removes.some((l) => l.includes('$t.To')), 'the other replaces a Quint target folder');
  const targets = [...src.matchAll(/To = \(Join-Path \$(custom|data) '([^']+)'\)/g)].map((m) => m[1] + ':' + m[2]);
  assert.ok(targets.length >= 5);
  for (const t of targets) {
    assert.ok(/^custom:(AddOns\\Quint\\|Strategies\\Quint$|Indicators\\Quint$)/.test(t) || /^data:/.test(t), 'unexpected target ' + t);
  }
  assert.ok(src.indexOf('# 3. Back up') < src.indexOf('# 4. Replace'), 'the backup must happen before anything is replaced');
  for (const keep of ['settings', 'journal']) assert.ok(!targets.includes('data:' + keep), 'the installer must never replace ' + keep);
});

test('the uninstaller removes only Quint folders and asks before deleting data', () => {
  const src = scripts[1].src;
  const folders = [...src.matchAll(/\(Join-Path \$custom '([^']+)'\)/g)].map((m) => m[1]).sort();
  assert.deepEqual(folders, ['AddOns\\Quint', 'Indicators\\Quint', 'Strategies\\Quint']);
  assert.ok(src.includes("-ceq 'DELETE'"), 'deleting data needs DELETE typed exactly');
  assert.ok(src.indexOf('Copy-Item') < src.indexOf('Remove-Item -LiteralPath $folder'), 'back up before removing');
});

test('no secrets or real account numbers anywhere in quint-control or the skill', () => {
  const files = [...walk(ROOT), path.join(REPO, '.claude', 'skills', 'quint-control', 'SKILL.md'), path.join(REPO, 'CLAUDE.md')]
    .filter((f) => /\.(md|json|js|cs|ps1|html|css|txt)$/.test(f));
  const patterns = [
    [/sk-ant-[A-Za-z0-9_-]{10,}/, 'a Claude API key'],
    [/\b\d{8,10}:AA[A-Za-z0-9_-]{30,}/, 'a Telegram bot token'],
    [/hc-ping\.com\/[0-9a-f-]{36}/, 'a Healthchecks ping link'],
    [/password\s*[:=]\s*["'][^"']+["']/i, 'a password'],
  ];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const [re, what] of patterns) assert.ok(!re.test(text), path.relative(REPO, f) + ' looks like it contains ' + what);
  }
});

test('example account names are obviously made up', () => {
  const dir = path.join(ROOT, 'protocol', 'examples');
  const names = new Set();
  const collect = (v) => {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (['account', 'name', 'leader'].includes(k) && typeof x === 'string' && /\d/.test(x)) names.add(x);
        collect(x);
      }
    }
  };
  for (const f of fs.readdirSync(dir)) collect(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  for (const n of names) assert.ok(n === 'Sim101' || n.includes('EXAMPLE') || /^Lucid \d$/.test(n), 'account name "' + n + '" might be real');
});

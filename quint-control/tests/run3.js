'use strict';
// Runs the whole test suite three times in a row and prints one line per run.
// A phase only counts as done when all three runs pass.
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
let allPassed = true;
for (let run = 1; run <= 3; run++) {
  const r = spawnSync('npm', ['test', '--silent'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  const out = (r.stdout || '') + (r.stderr || '');
  const num = (name) => Number((out.match(new RegExp('^# ' + name + ' (\\d+)', 'm')) || [])[1] || 0);
  const ran = num('tests');
  const passed = num('pass');
  const failed = num('fail');
  const ok = r.status === 0 && failed === 0 && ran > 0 && passed === ran;
  if (!ok) allPassed = false;
  console.log('Run ' + run + ': ran ' + ran + ', passed ' + passed + ', failed ' + failed + (ok ? '' : '  <-- FAILED'));
  if (!ok) console.log(out.split('\n').filter((l) => /^not ok|Error|expected|actual/.test(l.trim())).slice(0, 20).join('\n'));
}
console.log(allPassed ? 'All three runs passed.' : 'Not all runs passed.');
process.exit(allPassed ? 0 : 1);

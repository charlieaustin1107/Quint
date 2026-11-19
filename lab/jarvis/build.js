'use strict';
// Builds Quint HQ (lab/jarvis/index.html) from template.html and the latest roundup (lab/roundup.json).
// Never hand-edit index.html: change template.html or the lab, then run `node lab/jarvis/build.js`.
// The nightly loop rebuilds it and republishes the Quint HQ artifact.

const fs = require('fs');
const path = require('path');

function build(templateText, roundup) {
  // JSON inside a <script> tag: escape "<" so a value can never close the tag early.
  const json = JSON.stringify(roundup).replace(/</g, "\\u003c");
  if (!templateText.includes('/*LAB_DATA*/')) throw new Error('template.html has no /*LAB_DATA*/ placeholder');
  return templateText.replace('/*LAB_DATA*/', () => json);
}

if (require.main === module) {
  const dir = __dirname;
  const roundup = JSON.parse(fs.readFileSync(path.join(dir, '..', 'roundup.json'), 'utf8'));
  const html = build(fs.readFileSync(path.join(dir, 'template.html'), 'utf8'), roundup);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log(`lab/jarvis/index.html: ${(html.length / 1024).toFixed(0)} KB, roundup ${roundup.date}`);
}

module.exports = { build };

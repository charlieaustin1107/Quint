'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'..','strategy-lab');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'app.js'),'utf8');
test('Strategy Lab prototype exposes bot creation, manual paper setup and library',()=>{
 for(const text of ['Create a bot','Manual paper setup','Strategy library','Save strategy draft','Save paper scenario']) assert.ok(html.includes(text),text+' missing');
});
test('prototype is clearly local and does not expose a live order route',()=>{
 assert.ok(html.includes('stored in this browser only'));
 assert.ok(html.includes('Nothing here can place a trade'));
 assert.ok(js.includes("mode:'paper'"));
 assert.ok(!/OrderRouter|Account\.Submit|fetch\s*\(|WebSocket\s*\(/.test(js));
});
test('saved draft UI uses textContent for user-controlled labels',()=>{
 assert.ok(js.includes('h.textContent=item.name'));
 assert.ok(js.includes('p.textContent='));
});

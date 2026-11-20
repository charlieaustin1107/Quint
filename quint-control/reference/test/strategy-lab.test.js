'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {createStrategyDraft,validateStrategyDefinition,validatePaperScenario,createPaperScenario,evaluateExpression,validateExpression}=require('../strategy-lab/definition');
const NOW='2026-11-19T12:00:00.000Z';

test('creates a safe MNQ paper draft with non-runnable defaults',()=>{
 const d=createStrategyDraft({name:'Opening range idea',sourcePrompt:'Breakout retest'},{now:NOW,id:'strategy-test'});
 assert.equal(d.execution.mode,'paper'); assert.equal(d.status,'draft'); assert.equal(d.entry.long,null);
 const r=validateStrategyDefinition(d); assert.equal(r.valid,true); assert.equal(r.executable,false); assert.ok(r.warnings.length>=2);
});
test('rejects live execution mode and unsupported instrument',()=>{
 const d=createStrategyDraft({name:'Bad bot'},{now:NOW,id:'bad'}); d.execution.mode='live'; d.instrument.symbol='NQ';
 const r=validateStrategyDefinition(d); assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.includes('MNQ only'))); assert.ok(r.errors.some(x=>x.includes('paper mode only')));
});
test('validates a specified executable rule set',()=>{
 const d=createStrategyDraft({name:'Close above opening level'},{now:NOW,id:'specified'});
 d.status='forward-paper'; d.entry.long={op:'gt',left:{op:'var',name:'close'},right:{op:'var',name:'openingHigh'}};
 d.exit.initialStop={kind:'ticks',value:24}; d.exit.targets=[{rMultiple:2,percent:100}]; d.risk.maxDollarRisk=24;
 const r=validateStrategyDefinition(d); assert.equal(r.valid,true,r.errors.join('; ')); assert.equal(r.executable,true);
});
test('rejects unsafe DSL operators and missing stop',()=>{
 const d=createStrategyDraft({name:'Unsafe'},{now:NOW,id:'unsafe'}); d.entry.long={op:'eval',code:'process.exit()'};
 const r=validateStrategyDefinition(d); assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.includes('unsupported expression'))); assert.ok(r.warnings.some(x=>x.includes('No numeric initial stop')));
 const extra=[]; validateExpression({op:'const',value:true,run:'arbitrary'},extra); assert.ok(extra.some(x=>x.includes('unexpected field')));
});
test('expression evaluator supports bounded arithmetic and comparisons',()=>{
 const e={op:'and',args:[
  {op:'gt',left:{op:'var',name:'close'},right:{op:'var',name:'openingHigh'}},
  {op:'gte',left:{op:'div',left:{op:'var',name:'volume'},right:{op:'const',value:2}},right:{op:'const',value:500}}
 ]};
 assert.equal(evaluateExpression(e,{close:21000,openingHigh:20980,volume:1200}),true);
 assert.equal(evaluateExpression(e,{close:20900,openingHigh:20980,volume:1200}),false);
});
test('expression evaluator refuses missing fields, prototype access and division by zero',()=>{
 assert.throws(()=>evaluateExpression({op:'var',name:'missing'},{}),/Missing market field/);
 assert.throws(()=>evaluateExpression({op:'var',name:'__proto__'},{}),/Invalid variable/);
 assert.throws(()=>evaluateExpression({op:'div',left:{op:'const',value:1},right:{op:'const',value:0}},{}),/Division by zero/);
});
test('expression validator enforces node limits and argument bounds',()=>{
 const errors=[]; validateExpression({op:'and',args:Array.from({length:17},()=>({op:'const',value:true}))},errors);
 assert.ok(errors.some(x=>x.includes('2–16 arguments')));
});
test('creates and validates a paper-only manual scenario',()=>{
 const s=createPaperScenario({name:'London low sweep',side:'long',trigger:{op:'gt',left:{op:'var',name:'close'},right:{op:'var',name:'sweptLevel'}},entryReference:21000,stopPrice:20980,targetPrice:21040},{now:NOW,id:'paper-test'});
 assert.equal(s.mode,'paper'); assert.equal(validatePaperScenario(s).valid,true);
});
test('rejects expired and incorrectly oriented paper scenarios',()=>{
 const s=createPaperScenario({name:'Bad short',side:'short',trigger:{op:'const',value:true},entryReference:21000,stopPrice:20980,targetPrice:21040},{now:NOW,expiresAt:'2026-11-19T11:00:00.000Z',id:'paper-bad'});
 const r=validatePaperScenario(s); assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.includes('short scenario'))); assert.ok(r.errors.some(x=>x.includes('expiresAt')));
});

test('expression evaluator rejects non-numeric comparisons and oversized trees',()=>{
 assert.throws(()=>evaluateExpression({op:'gt',left:{op:'const',value:'high'},right:{op:'const',value:'low'}},{}),/Numeric comparisons require numeric/);
 const many={op:'and',args:Array.from({length:16},()=>({op:'and',args:Array.from({length:16},()=>({op:'const',value:true}))}))};
 assert.throws(()=>evaluateExpression(many,{}),/node limit/);
});

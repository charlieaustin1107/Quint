'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {Registry}=require('../lib/schema');
const root=path.join(__dirname,'..','..','protocol','schemas');
const registry=new Registry(root);
test('Strategy Definition schema accepts the canonical draft',()=>{
 const d=require('../strategy-lab/definition').createStrategyDraft({name:'Schema test'},{now:'2026-11-19T12:00:00.000Z',id:'schema-test'});
 assert.deepEqual(registry.validate('strategy-definition.schema.json',d),[]);
});
test('Paper Scenario schema accepts a valid manual setup',()=>{
 const s=require('../strategy-lab/definition').createPaperScenario({name:'Test',side:'long',trigger:{op:'const',value:true},entryReference:21000,stopPrice:20990,targetPrice:21020},{now:'2026-11-19T12:00:00.000Z',expiresAt:'2026-11-19T13:00:00.000Z',id:'paper-schema'});
 assert.deepEqual(registry.validate('paper-scenario.schema.json',s),[]);
});
test('schemas reject live execution and unknown fields',()=>{
 const d=require('../strategy-lab/definition').createStrategyDraft({name:'Bad'},{now:'2026-11-19T12:00:00.000Z',id:'bad'});
 d.execution.mode='live'; d.arbitraryCode='run me';
 assert.ok(registry.validate('strategy-definition.schema.json',d).length>=2);
});

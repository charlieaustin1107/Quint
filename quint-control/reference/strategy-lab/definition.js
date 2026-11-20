'use strict';
const OPS = new Set(['and','or','not','gt','gte','lt','lte','eq','neq','add','sub','mul','div']);
const SAFE_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const MAX_DEPTH = 12, MAX_NODES = 128;
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const iso = v => typeof v === 'string' && !Number.isNaN(Date.parse(v)) && /^\d{4}-\d\d-\d\dT/.test(v);
const slug = v => String(v || 'strategy').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) || 'strategy';

function createStrategyDraft(input, options = {}) {
  if (!obj(input)) throw new TypeError('Draft input must be an object');
  const now = options.now || new Date().toISOString();
  const id = options.id || ('strategy-' + slug(input.name) + '-' + Date.parse(now));
  const text = (v,n) => typeof v === 'string' ? v.trim().slice(0,n) : '';
  return {
    schemaVersion: 1, strategyId: id, version: 1,
    name: text(input.name,80) || 'Untitled strategy',
    description: text(input.description,1000), status: 'draft',
    instrument: {symbol:'MNQ',contract:'front-month',rollPolicy:'volume-switch'},
    market: {timeframe:input.timeframe || '5m',timezone:input.timezone || 'America/New_York',session:input.session || 'RTH'},
    entry: {long:null,short:null},
    exit: {initialStop:{kind:'ticks',value:null},targets:[],maxHoldingMinutes:null},
    risk: {maxContracts:1,maxDollarRisk:null},
    execution: {mode:'paper',fillModel:'conservative',signalExpirySeconds:60},
    provenance: {sourcePrompt:text(input.sourcePrompt,4000),createdAt:now,createdBy:'user'}
  };
}

function validateExpression(node, errors, path='$', depth=0, count={value:0}) {
  count.value++;
  if (count.value > MAX_NODES) { errors.push(path+': expression exceeds '+MAX_NODES+' nodes'); return; }
  if (depth > MAX_DEPTH) { errors.push(path+': expression exceeds maximum depth '+MAX_DEPTH); return; }
  if (!obj(node) || typeof node.op !== 'string' || !OPS.has(node.op)) { errors.push(path+': unsupported expression node'); return; }
  const allowedKeys = node.op === 'const' ? ['op','value'] : node.op === 'var' ? ['op','name']
    : (node.op === 'and' || node.op === 'or') ? ['op','args'] : node.op === 'not' ? ['op','arg'] : ['op','left','right'];
  for (const key of Object.keys(node)) if (!allowedKeys.includes(key)) errors.push(path+': unexpected field "'+key+'"');
  const child = (v,s) => validateExpression(v,errors,path+s,depth+1,count);
  if (node.op === 'const') {
    if (!(typeof node.value === 'boolean' || finite(node.value) || typeof node.value === 'string')) errors.push(path+': invalid constant');
    return;
  }
  if (node.op === 'var') {
    if (typeof node.name !== 'string' || !SAFE_NAME.test(node.name) || ['__proto__','prototype','constructor'].includes(node.name)) errors.push(path+': invalid variable name');
    return;
  }
  if (node.op === 'and' || node.op === 'or') {
    if (!Array.isArray(node.args) || node.args.length < 2 || node.args.length > 16) errors.push(path+': '+node.op+' requires 2–16 arguments');
    else node.args.forEach((x,i)=>child(x,'.args['+i+']'));
  } else if (node.op === 'not') child(node.arg,'.arg');
  else { child(node.left,'.left'); child(node.right,'.right'); }
}

function leaf(node, context) {
  if (!obj(node)) throw new TypeError('Expected expression object');
  if (node.op === 'const') {
    if (!(typeof node.value === 'boolean' || finite(node.value) || typeof node.value === 'string')) throw new TypeError('Invalid constant');
    return node.value;
  }
  if (node.op === 'var') {
    if (typeof node.name !== 'string' || !SAFE_NAME.test(node.name) || ['__proto__','prototype','constructor'].includes(node.name)) throw new TypeError('Invalid variable name');
    if (!Object.prototype.hasOwnProperty.call(context,node.name)) throw new TypeError('Missing market field "'+node.name+'"');
    const v=context[node.name];
    if (!(typeof v === 'boolean' || finite(v) || typeof v === 'string')) throw new TypeError('Market field has unsupported type');
    return v;
  }
  return undefined;
}

function evaluateExpression(node, context, depth=0, count={value:0}) {
  count.value++;
  if (count.value > MAX_NODES) throw new RangeError('Expression node limit exceeded');
  if (depth > MAX_DEPTH) throw new RangeError('Expression depth limit exceeded');
  if (!obj(context)) throw new TypeError('Market context must be an object');
  if (!obj(node) || typeof node.op !== 'string') throw new TypeError('Invalid expression');
  if (node.op === 'const' || node.op === 'var') return leaf(node,context);
  const get = n => evaluateExpression(n,context,depth+1,count);
  if (node.op === 'and') {
    if (!Array.isArray(node.args) || node.args.length < 2 || node.args.length > 16) throw new TypeError('and requires 2–16 arguments');
    return node.args.every(x=>Boolean(get(x)));
  }
  if (node.op === 'or') {
    if (!Array.isArray(node.args) || node.args.length < 2 || node.args.length > 16) throw new TypeError('or requires 2–16 arguments');
    return node.args.some(x=>Boolean(get(x)));
  }
  if (node.op === 'not') return !get(node.arg);
  if (!OPS.has(node.op)) throw new TypeError('Unsupported operator');
  const a=get(node.left), b=get(node.right);
  switch(node.op) {
    case 'gt': case 'gte': case 'lt': case 'lte':
      if (!finite(a) || !finite(b)) throw new TypeError('Numeric comparisons require numeric market fields');
      if (node.op==='gt') return a>b; if (node.op==='gte') return a>=b; if (node.op==='lt') return a<b; return a<=b;
    case 'eq': return a===b; case 'neq': return a!==b;
    case 'add': case 'sub': case 'mul': case 'div':
      if (!finite(a) || !finite(b)) throw new TypeError('Arithmetic requires numeric values');
      if (node.op==='add') return a+b; if (node.op==='sub') return a-b; if (node.op==='mul') return a*b;
      if (b===0) throw new RangeError('Division by zero'); return a/b;
    default: throw new TypeError('Unsupported operator');
  }
}

function validateStrategyDefinition(d) {
  const errors=[], warnings=[];
  if (!obj(d)) return {valid:false,executable:false,errors:['$: expected an object'],warnings};
  if (d.schemaVersion!==1) errors.push('schemaVersion: expected 1');
  if (typeof d.strategyId!=='string'||!d.strategyId.trim()) errors.push('strategyId: required');
  if (!Number.isInteger(d.version)||d.version<1) errors.push('version: must be a positive integer');
  if (typeof d.name!=='string'||!d.name.trim()||d.name.length>80) errors.push('name: required (maximum 80 characters)');
  if (!['draft','specified','validating','backtesting','replay','forward-paper','approved','rejected','paused'].includes(d.status)) errors.push('status: unsupported');
  if (!obj(d.instrument)||d.instrument.symbol!=='MNQ') errors.push('instrument: this first implementation supports MNQ only');
  if (!obj(d.market)) errors.push('market: required');
  else {
    if (!['1m','2m','5m','15m','30m','60m','1d','1w'].includes(d.market.timeframe)) errors.push('market.timeframe: unsupported');
    if (typeof d.market.timezone!=='string'||!d.market.timezone.trim()) errors.push('market.timezone: required');
    if (!['RTH','ETH','CUSTOM'].includes(d.market.session)) errors.push('market.session: must be RTH, ETH or CUSTOM');
  }
  if (!obj(d.entry)) errors.push('entry: required');
  else for (const side of ['long','short']) if (d.entry[side]!=null) validateExpression(d.entry[side],errors,'$.entry.'+side);
  if (!obj(d.exit)) errors.push('exit: required');
  else {
    const s=d.exit.initialStop;
    if (!obj(s)||!['ticks','points','atr','structure'].includes(s.kind)) errors.push('exit.initialStop: choose ticks, points, atr or structure');
    else if (s.value!=null&&(!finite(s.value)||s.value<=0)) errors.push('exit.initialStop.value: must be positive');
    if (!Array.isArray(d.exit.targets)) errors.push('exit.targets: must be an array');
    else d.exit.targets.forEach((t,i)=>{if(!obj(t)||!finite(t.rMultiple)||t.rMultiple<=0||!Number.isInteger(t.percent)||t.percent<1||t.percent>100) errors.push('exit.targets['+i+']: requires positive rMultiple and percent 1–100');});
    if (d.exit.maxHoldingMinutes!=null&&(!finite(d.exit.maxHoldingMinutes)||d.exit.maxHoldingMinutes<=0)) errors.push('exit.maxHoldingMinutes: must be positive');
  }
  if (!obj(d.risk)||!Number.isInteger(d.risk.maxContracts)||d.risk.maxContracts<1||d.risk.maxContracts>40) errors.push('risk.maxContracts: must be an integer from 1 to 40');
  else if (d.risk.maxDollarRisk!=null&&(!finite(d.risk.maxDollarRisk)||d.risk.maxDollarRisk<=0)) errors.push('risk.maxDollarRisk: must be positive');
  if (!obj(d.execution)||d.execution.mode!=='paper'||d.execution.fillModel!=='conservative') errors.push('execution: this phase supports conservative paper mode only');
  if (d.execution&&(!Number.isInteger(d.execution.signalExpirySeconds)||d.execution.signalExpirySeconds<1||d.execution.signalExpirySeconds>3600)) errors.push('execution.signalExpirySeconds: must be 1–3600');
  if (!obj(d.provenance)||!iso(d.provenance.createdAt)||typeof d.provenance.sourcePrompt!=='string') errors.push('provenance: createdAt and sourcePrompt are required');
  const hasRule=!!(d.entry&&(d.entry.long||d.entry.short));
  const hasStop=!!(d.exit&&d.exit.initialStop&&finite(d.exit.initialStop.value));
  const hasTargets=!!(d.exit&&Array.isArray(d.exit.targets)&&d.exit.targets.length>0);
  if(!hasRule) warnings.push('No executable entry rule is defined yet. This is a saved idea, not a runnable bot.');
  if(!hasStop) warnings.push('No numeric initial stop is defined yet. Testing and order submission are blocked.');
  if(!hasTargets) warnings.push('No profit target is defined yet.');
  if(['approved','forward-paper'].includes(d.status)) {
    if(!hasRule) errors.push('status: cannot advance without at least one executable entry rule');
    if(!hasStop) errors.push('status: cannot advance without a numeric initial stop');
    if(!hasTargets) errors.push('status: cannot advance without at least one target');
  }
  return {valid:errors.length===0,executable:errors.length===0&&hasRule&&hasStop&&hasTargets,errors,warnings};
}

function validatePaperScenario(s) {
  const errors=[];
  if(!obj(s)) return {valid:false,errors:['$: expected an object']};
  if(s.schemaVersion!==1) errors.push('schemaVersion: expected 1');
  if(typeof s.scenarioId!=='string'||!s.scenarioId.trim()) errors.push('scenarioId: required');
  if(s.mode!=='paper') errors.push('mode: must be paper');
  if(!['draft','armed','expired','cancelled'].includes(s.status)) errors.push('status: unsupported');
  if(s.instrument!=='MNQ') errors.push('instrument: this phase supports MNQ only');
  if(!['long','short'].includes(s.side)) errors.push('side: must be long or short');
  if(!obj(s.trigger)) errors.push('trigger: a deterministic expression is required');
  else validateExpression(s.trigger,errors,'$.trigger');
  for(const f of ['entryReference','stopPrice','targetPrice']) if(!finite(s[f])||s[f]<=0) errors.push(f+': must be a positive price');
  if(finite(s.entryReference)&&finite(s.stopPrice)&&finite(s.targetPrice)) {
    if(s.side==='long'&&!(s.stopPrice<s.entryReference&&s.targetPrice>s.entryReference)) errors.push('prices: long scenario requires stop < entry < target');
    if(s.side==='short'&&!(s.targetPrice<s.entryReference&&s.stopPrice>s.entryReference)) errors.push('prices: short scenario requires target < entry < stop');
  }
  if(!iso(s.createdAt)||!iso(s.expiresAt)||Date.parse(s.expiresAt)<=Date.parse(s.createdAt)) errors.push('expiry: expiresAt must be later than createdAt');
  return {valid:errors.length===0,errors};
}

function createPaperScenario(input,options={}) {
  const now=options.now||new Date().toISOString();
  return {
    schemaVersion:1,scenarioId:options.id||('paper-'+slug(input.name)+'-'+Date.parse(now)),
    name:String(input.name||'Untitled paper setup').trim().slice(0,80),
    mode:'paper',instrument:'MNQ',side:input.side,trigger:input.trigger||null,
    entryReference:input.entryReference,stopPrice:input.stopPrice,targetPrice:input.targetPrice,
    createdAt:now,expiresAt:options.expiresAt||new Date(Date.parse(now)+3600000).toISOString(),status:'draft'
  };
}
module.exports={createStrategyDraft,validateStrategyDefinition,validatePaperScenario,createPaperScenario,validateExpression,evaluateExpression};

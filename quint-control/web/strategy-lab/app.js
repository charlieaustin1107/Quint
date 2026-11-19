'use strict';
(function(){
 const KEY='quint.strategyLab.local.v1';
 const allowed=new Set(['and','or','not','gt','gte','lt','lte','eq','neq','add','sub','mul','div','const','var']);
 const safeName=/^[A-Za-z][A-Za-z0-9_]{0,63}$/;
 const $=id=>document.getElementById(id);
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(_){return []}};
 const write=items=>localStorage.setItem(KEY,JSON.stringify(items));
 const id=prefix=>prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
 const isoNow=()=>new Date().toISOString();
 function validateExpr(node,depth=0,count={n:0}){
  count.n++; if(count.n>128||depth>12) throw Error('Expression is too large or deeply nested.');
  if(!node||typeof node!=='object'||Array.isArray(node)||!allowed.has(node.op)) throw Error('Unsupported expression node.');
  if(node.op==='const'){if(!['number','string','boolean'].includes(typeof node.value)|| (typeof node.value==='number'&&!Number.isFinite(node.value))) throw Error('Invalid constant.');return;}
  if(node.op==='var'){if(typeof node.name!=='string'||!safeName.test(node.name)||['__proto__','prototype','constructor'].includes(node.name)) throw Error('Invalid market field name.');return;}
  if(node.op==='and'||node.op==='or'){if(!Array.isArray(node.args)||node.args.length<2||node.args.length>16)throw Error('and/or require 2–16 arguments.');node.args.forEach(x=>validateExpr(x,depth+1,count));return;}
  if(node.op==='not'){validateExpr(node.arg,depth+1,count);return;}
  validateExpr(node.left,depth+1,count);validateExpr(node.right,depth+1,count);
 }
 function feedback(el,kind,message){el.className='feedback '+kind;el.textContent=message;}
 function add(item){const items=read();items.unshift(item);write(items);render();}
 function render(){
  const items=read();$('library-count').textContent=String(items.length);
  const host=$('library-list');host.innerHTML='';
  if(!items.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='No saved drafts yet. Create a strategy or paper setup to get started.';host.appendChild(empty);return;}
  items.forEach(item=>{
   const card=document.createElement('article');card.className='item';
   const info=document.createElement('div');const h=document.createElement('h3');h.textContent=item.name||'Untitled';
   const tag=document.createElement('span');tag.className='tag';tag.textContent=item.kind==='paper-scenario'?'PAPER SCENARIO':'STRATEGY DRAFT';h.appendChild(tag);
   const p=document.createElement('p');p.textContent=(item.instrument||'MNQ')+' · '+(item.status||'draft')+' · '+new Date(item.createdAt||item.provenance?.createdAt||Date.now()).toLocaleString();
   info.append(h,p);
   const actions=document.createElement('div');actions.className='item-actions';
   const exp=document.createElement('button');exp.textContent='Export JSON';exp.addEventListener('click',()=>download(item));
   const del=document.createElement('button');del.textContent='Delete';del.addEventListener('click',()=>{write(read().filter(x=>x.id!==item.id));render()});
   actions.append(exp,del);card.append(info,actions);host.appendChild(card);
  });
 }
 function download(value){
  const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(value.strategyId||value.scenarioId||'quint-draft')+'.json';a.click();URL.revokeObjectURL(url);
 }
 function tab(name){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  ['strategy','scenario','library'].forEach(n=>$(n+'-panel').classList.toggle('hidden',n!==name));
  if(name==='library')render();
 }
 document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
 $('strategy-form').addEventListener('submit',e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);let rule=null;
  try{
   const raw=String(f.get('entryRule')||'').trim();if(raw){rule=JSON.parse(raw);validateExpr(rule);}
   const stop=String(f.get('stopTicks')||'').trim(),target=String(f.get('targetR')||'').trim();
   const direction=String(f.get('direction'));
   const draft={
    schemaVersion:1,strategyId:id('strategy'),version:1,name:String(f.get('name')).trim(),
    description:'',status:'draft',instrument:{symbol:'MNQ',contract:'front-month',rollPolicy:'volume-switch'},
    market:{timeframe:String(f.get('timeframe')),timezone:'America/New_York',session:String(f.get('session'))},
    entry:{long:rule&&direction!=='short'?rule:null,short:rule&&direction!=='long'?rule:null},
    exit:{initialStop:{kind:'ticks',value:stop?Number(stop):null},targets:target?[{rMultiple:Number(target),percent:100}]:[],maxHoldingMinutes:null},
    risk:{maxContracts:Number(f.get('maxContracts')),maxDollarRisk:null},
    execution:{mode:'paper',fillModel:'conservative',signalExpirySeconds:60},
    provenance:{sourcePrompt:String(f.get('sourcePrompt')||''),createdAt:isoNow(),createdBy:'user'}
   };
   if(!draft.name||!Number.isInteger(draft.risk.maxContracts)||draft.risk.maxContracts<1||draft.risk.maxContracts>40)throw Error('Enter a name and a contract limit from 1 to 40.');
   if(stop&&(!Number.isFinite(Number(stop))||Number(stop)<=0))throw Error('Stop ticks must be positive.');
   if(target&&(!Number.isFinite(Number(target))||Number(target)<=0))throw Error('Target R must be positive.');
   add({id:draft.strategyId,kind:'strategy',name:draft.name,instrument:'MNQ',status:'draft',createdAt:draft.provenance.createdAt,definition:draft});
   feedback($('strategy-feedback'),'good','Draft saved in this browser. '+(rule?'The entry expression passed the safe syntax check.':'No executable entry rule yet: this remains an idea draft.')+' Export its JSON for the next Quint integration step.');
   e.currentTarget.reset();
  }catch(err){feedback($('strategy-feedback'),'bad',err.message||'Could not save this draft.');}
 });
 $('scenario-form').addEventListener('submit',e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);
  try{
   const trigger=JSON.parse(String(f.get('trigger')));validateExpr(trigger);
   const side=String(f.get('side')),entry=Number(f.get('entryReference')),stop=Number(f.get('stopPrice')),target=Number(f.get('targetPrice'));
   if(![entry,stop,target].every(x=>Number.isFinite(x)&&x>0))throw Error('Enter positive prices.');
   if(side==='long'&&!(stop<entry&&target>entry))throw Error('For a long: stop must be below entry and target above entry.');
   if(side==='short'&&!(target<entry&&stop>entry))throw Error('For a short: target must be below entry and stop above entry.');
   const createdAt=isoNow(),scenario={
    schemaVersion:1,scenarioId:id('paper'),name:String(f.get('name')).trim(),mode:'paper',instrument:'MNQ',side,trigger,
    entryReference:entry,stopPrice:stop,targetPrice:target,createdAt,
    expiresAt:new Date(Date.now()+Number(f.get('expiry'))*60000).toISOString(),status:'draft'
   };
   add({id:scenario.scenarioId,kind:'paper-scenario',name:scenario.name,instrument:'MNQ',status:'draft',createdAt,definition:scenario});
   feedback($('scenario-feedback'),'good','Paper scenario saved locally. This does not monitor the market or simulate a fill yet. Export JSON for integration.');
   e.currentTarget.reset();
  }catch(err){feedback($('scenario-feedback'),'bad',err.message||'Could not save scenario.');}
 });
 $('export-all').addEventListener('click',()=>download({exportType:'quint-strategy-lab',schemaVersion:1,items:read()}));
 render();
})();
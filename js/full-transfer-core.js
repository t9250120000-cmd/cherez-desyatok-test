/* Additional transfer container. Existing storage strings and legacy export stay unchanged. */
(function(root){
'use strict';
const MAIN='terem_v3',FACTS='terem_facts_v1',VOICE='terem_voice_v1',INSIGHTS='terem_insights_v1',JOURNAL='terem_transfer_pending_v1';
const legacyKeys=[MAIN,FACTS,VOICE],keys=[...legacyKeys,INSIGHTS],limit=16*1024*1024;
const sameKeys=(o,expected)=>Object.keys(o).sort().join('|')===expected.slice().sort().join('|');
const payloadKeys=version=>version===1?[MAIN,FACTS]:[MAIN,FACTS,INSIGHTS];
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function parse(raw){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>limit)fail('INVALID_SIZE');
  try{return JSON.parse(raw,(k,v)=>{if(['__proto__','constructor','prototype'].includes(k))fail('UNSAFE_KEY');return v;});}
  catch(e){if(e.code)throw e;fail('INVALID_JSON');}
}
const number=(x,min=0,max=1e12)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const integer=(x,min,max)=>number(x,min,max)&&Number.isInteger(x);
const date=x=>x===''||typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const validFactKey=k=>{let m=/^(\d+)([+-])(\d+)$/.exec(k);if(!m)return false;const a=+m[1],b=+m[3];return m[2]==='+'?a>=2&&a<=9&&b>=2&&b<=9&&a+b>10:a>=11&&a<=18&&b>=2&&b<=9&&b>a-10;};
function validateFacts(f){
  if(!object(f))return false;
  for(const [id,p] of Object.entries(f)){
    if(id==='settings'){if(!object(p)||typeof p.noTimers!=='boolean'||typeof p.numberLine!=='boolean')return false;continue;}
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||!object(p)||!object(p.facts)||!number(p.delay,2000,4000)||!Array.isArray(p.log)||p.log.length>10000)return false;
    for(const [k,r] of Object.entries(p.facts))if(!validFactKey(k)||!object(r)||!integer(r.b,0,5)||!date(r.due)||!integer(r.n,0,1e12)||!integer(r.l,0,1e12)||!number(r.rt))return false;
    if(p.flash&&(!object(p.flash)||!integer(p.flash.level,1,2)||!number(p.flash.expo,0,60000)||!integer(p.flash.best,0,8)))return false;
  }
  return true;
}
// Validate the observations actually consumed by the parent report; retain their exact bytes.
function validateInsights(s){
  if(!object(s)||s.v!==1||!object(s.profiles))return false;
  const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
  const count=x=>integer(x,0,Number.MAX_SAFE_INTEGER);
  const record=x=>object(x)&&count(x.at);
  for(const [pid,p] of Object.entries(s.profiles)){
    if(!id(pid)||!object(p)||!Array.isArray(p.tasks)||!Array.isArray(p.fatigue)||!Array.isArray(p.games)||p.tasks.length>400||p.fatigue.length>80||p.games.length>150)return false;
    for(const r of p.tasks){
      if(!record(r)||!['see','to10','split','teen','add','sub','mix'].includes(r.sk)||!integer(r.ph,1,3)||typeof r.key!=='string'||r.key.length>100||!object(r.wr))return false;
      if(Object.entries(r.wr).some(([k,v])=>!['answer','toTen','rest','total','whole'].includes(k)||!count(v)))return false;
      if(['w','ex','pos','len'].some(k=>!count(r[k]))||['nl','clean','focus'].some(k=>!integer(r[k],0,1))||!number(r.sec,0,600))return false;
    }
    for(const r of p.fatigue)if(!record(r)||!id(r.reason)||!id(r.choice))return false;
    for(const r of p.games)if(!record(r)||!id(r.game)||!id(r.level)||['rounds','errors','supported'].some(k=>!count(r[k]))||r.won!=null&&typeof r.won!=='boolean')return false;
  }
  return true;
}
async function digest(raw){return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),x=>x.toString(16).padStart(2,'0')).join('');}
function safeMain(m){
  if(!object(m)||!Array.isArray(m.profiles))return false;
  const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
  const image=x=>x==null||x===''||typeof x==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x);
  const parent=m.parent||{};
  if(parent.pin!=null&&(typeof parent.pin!=='string'||!/^([0-9]{4})?$/.test(parent.pin)))return false;
  for(const k of ['voice','sfx','music','explain'])if(parent[k]!=null&&typeof parent[k]!=='boolean')return false;
  for(const k of ['rate','session','flash','coinsTask','coinsSeries','coinsDay'])if(parent[k]!=null&&!number(parent[k]))return false;
  for(const w of parent.wishes||[])if(!id(w.id)||!image(w.img))return false;
  for(const p of m.profiles){
    if(!object(p)||!object(p.hard)||!object(p.days)||!object(p.streak)||!Array.isArray(p.purchases))return false;
    if(!id(p.id)||!/^#[0-9a-fA-F]{6}$/.test(p.color)||p.created!=null&&!date(p.created))return false;
    if(Object.entries(p.hard).some(([k,v])=>!validFactKey(k)||!number(v)))return false;
    if(Object.entries(p.days).some(([k,v])=>!date(k)||['tasks','clean','secs'].some(n=>v[n]!=null&&!number(v[n]))))return false;
    if(p.streak.n!=null&&!integer(p.streak.n,0,1e12)||p.streak.last!=null&&!date(p.streak.last))return false;
    for(const purchase of p.purchases)if(!id(purchase.id)||!image(purchase.img))return false;
  }
  return true;
}
function validate(main,facts,validMain){
  if(typeof validMain!=='function')fail('MAIN_VALIDATOR_REQUIRED');
  const m=parse(main);if(!validMain(m)||!safeMain(m))fail('INVALID_MAIN');
  if(!validateFacts(parse(facts)))fail('INVALID_FACTS');
}
async function create(storage,validMain){
  if(storage.getItem(JOURNAL)!==null)fail('RECOVERY_REQUIRED');
  const main=storage.getItem(MAIN),facts=storage.getItem(FACTS)??'{}',insights=storage.getItem(INSIGHTS)??'{"v":1,"profiles":{}}';
  validate(main,facts,validMain);if(!validateInsights(parse(insights)))fail('INVALID_INSIGHTS');
  const payload={[MAIN]:main,[FACTS]:facts,[INSIGHTS]:insights},sha256={};
  for(const k of payloadKeys(2))sha256[k]=await digest(payload[k]);
  const raw=JSON.stringify({format:'cherez-desyatok-full-transfer',version:2,payload,sha256});
  parse(raw);return raw;
}
async function inspect(raw,validMain){
  const e=parse(raw);
  if(!object(e)||e.format!=='cherez-desyatok-full-transfer'||![1,2].includes(e.version)||!object(e.payload)||!object(e.sha256))fail('INVALID_CONTAINER');
  const expected=payloadKeys(e.version);
  if(!sameKeys(e.payload,expected)||!sameKeys(e.sha256,expected))fail('UNEXPECTED_PAYLOAD');
  // All payloads and hashes are checked before restore can write even its undo record.
  for(const k of expected){
    if(typeof e.payload[k]!=='string'||typeof e.sha256[k]!=='string'||!/^[a-f0-9]{64}$/.test(e.sha256[k]))fail('INVALID_CONTAINER');
    if(e.sha256[k]!==await digest(e.payload[k]))fail('CHECKSUM_MISMATCH');
  }
  validate(e.payload[MAIN],e.payload[FACTS],validMain);
  if(e.version===2&&!validateInsights(parse(e.payload[INSIGHTS])))fail('INVALID_INSIGHTS');
  const main=parse(e.payload[MAIN]),facts=parse(e.payload[FACTS]);
  return {version:e.version,main:e.payload[MAIN],facts:e.payload[FACTS],insights:e.payload[INSIGHTS],preview:{journal:e.version===2?'replace':'preserve',profiles:main.profiles.map(p=>({name:p.name,stars:p.stars,coins:p.coins,facts:Object.values(facts[p.id]?.facts||{}).filter(r=>r.b>0).length})),microphone:'requires-new-parent-and-child-consent'}};
}
function snapshot(storage,affected){return Object.fromEntries(affected.map(k=>[k,storage.getItem(k)]));}
function put(storage,k,value){if(value===null)storage.removeItem(k);else storage.setItem(k,value);}
function recover(storage){
  const raw=storage.getItem(JOURNAL);if(raw===null)return false;
  const j=parse(raw);
  if(!object(j)||![1,2].includes(j.version)||!object(j.old))fail('INVALID_RECOVERY_JOURNAL');
  const affected=j.version===1?legacyKeys:keys;
  if(!sameKeys(j.old,affected)||affected.some(k=>j.old[k]!==null&&typeof j.old[k]!=='string'))fail('INVALID_RECOVERY_JOURNAL');
  // Called before app.js reads either save. On failure stop startup; never load a mixed state.
  for(const k of affected)put(storage,k,j.old[k]);
  storage.removeItem(JOURNAL);return true;
}
async function restore(storage,raw,validMain,{confirmed=false}={}){
  if(!confirmed)fail('CONFIRMATION_REQUIRED');
  if(storage.getItem(JOURNAL)!==null)fail('RECOVERY_REQUIRED');
  const data=await inspect(raw,validMain);
  // Recheck after asynchronous inspection; never overwrite another pending undo.
  if(storage.getItem(JOURNAL)!==null)fail('RECOVERY_REQUIRED');
  const affected=data.version===1?legacyKeys:keys;
  // Durable undo is written first. Quota failure here leaves every data store untouched.
  const undo=JSON.stringify({version:data.version,old:snapshot(storage,affected)});parse(undo);
  storage.setItem(JOURNAL,undo);
  try{
    storage.setItem(MAIN,data.main);storage.setItem(FACTS,data.facts);
    if(data.version===2)storage.setItem(INSIGHTS,data.insights);
    storage.setItem(VOICE,JSON.stringify({allowed:false}));
    storage.removeItem(JOURNAL);
  }catch(error){
    try{recover(storage);}catch(_){fail('RECOVERY_REQUIRED');}
    fail('RESTORE_FAILED_ROLLED_BACK');
  }
  return data.preview;
}
const api={create,inspect,restore,recover,validateFacts,validateInsights,safeMain,keys:{MAIN,FACTS,VOICE,INSIGHTS,JOURNAL}};
if(typeof module==='object'&&module.exports)module.exports=api;else root.TEREM_FULL_TRANSFER=api;
})(typeof globalThis==='object'?globalThis:window);

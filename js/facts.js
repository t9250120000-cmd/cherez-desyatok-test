/* «Копилка фактов»: интервальное повторение 72 примеров через десяток.
   Три игры: «Новая бусинка» (Incremental Rehearsal), «Слаймовый забег» (3×20 с), «Обгони Булька» (taped problems).
   Состояние хранится отдельно от основного сохранения: ключ terem_facts_v1. Движок, фразы и сохранения игры не меняются. */
(function(root){
'use strict';
if(!root.__app) return; // Failed transfer recovery must not read the facts store.
const PH=root.PH, FP=root.FP, E=root.ENGINE, CH=root.CH, AU=root.AUDIO;
const $=s=>document.querySelector(s);
const today=()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const addDays=(n)=>{ const d=new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const reduce=root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MINUS='−';
const KEY='terem_facts_v1';
const INTERVALS=[0,1,3,7,14,30];            // дни до следующего повторения по полкам 0..5
const JARS=['Новые','Завтра','Через 3 дня','Неделя','Наизусть'];
const SPRINT_MS=20000, REST_MS=10000, ROUNDS=3;

/* ---------- факты ---------- */
const ALL=[];
for(let a=2;a<=9;a++) for(let b=2;b<=9;b++) if(a+b>10) ALL.push({key:a+'+'+b, op:'add', a, b, ans:a+b, html:'<span class="ca">'+a+'</span> + <span class="cb">'+b+'</span>', o:{op:'add',a,b,k:10-a,r:b-(10-a),sum:a+b}});
for(let m=11;m<=18;m++) for(let s=2;s<=9;s++) if(s>m-10) ALL.push({key:m+'-'+s, op:'sub', m, s, ans:m-s, html:'<span class="ca">'+m+'</span> '+MINUS+' <span class="cb">'+s+'</span>', o:{op:'sub',m,s,u:m-10,r:s-(m-10),res:m-s}});
const BYKEY={}; ALL.forEach(f=>BYKEY[f.key]=f);

/* ---------- хранилище ---------- */
let ST={};
try{ ST=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ ST={}; }
function store(){ try{ localStorage.setItem(KEY, JSON.stringify(ST)); }catch(e){} }
function settings(){ if(!ST.settings) ST.settings={noTimers:false, numberLine:true}; return ST.settings; }
const noTimers=()=>!!settings().noTimers;
const introPhrase=timed=>noTimers()?FP.ui.noTimers:timed;
function prof(){ const p=root.__app.P(); if(!p) return null; if(!ST[p.id]) ST[p.id]={facts:{}, delay:3000, log:[]}; const s=ST[p.id]; if(!s.flash) s.flash={level:1, expo:2000, best:0}; return s; }
function rec(k){ const s=prof(); return s.facts[k]||(s.facts[k]={b:0,due:'',n:0,l:0,rt:0}); }
function ops(){ const p=root.__app.P(); const r=[]; if(p.skills.add.done||p.skills.add.phase>=2) r.push('add'); if(p.skills.sub.done||p.skills.sub.phase>=2) r.push('sub'); return r; }
function pool(){ const o=ops(); return ALL.filter(f=>o.includes(f.op)); }
const known=()=>pool().filter(f=>rec(f.key).b>=1);
const due=()=>known().filter(f=>rec(f.key).due<=today());
const fresh=()=>pool().filter(f=>rec(f.key).b===0);
function promote(f, ok, rt){
  const r=rec(f.key); r.n++;
  if(ok && (!rt || rt<5000)){ r.b=Math.min(5,r.b+1); r.due=addDays(INTERVALS[r.b]); }
  else if(ok){ r.due=addDays(1); }
  else { r.l++; r.b=1; r.due=addDays(1); }
  r.rt=rt||r.rt; store();
}
function shelves(){ const c=[0,0,0,0,0,0]; pool().forEach(f=>c[rec(f.key).b]++); return c; }

/* ---------- состояние игры ---------- */
const G={mode:'home', kp:'', item:null, queue:[], i:0, reveal:null, msg:null, msgT:'', timer:null, tStart:0, round:0, results:[], correct:0, wrong:0, pos:0, bulk:0, won:0, lost:0, streak:0, newFact:null, deck:[], busy:false, bead:null, restLeft:0, log:[]};
const app=()=>root.__app;
function render(){ app().render(); }
/* поколение сеанса: любой выход из игры (home/leave) обесценивает старые callback и таймеры */
let GEN=0;
function say(ph,opt){ const gen=GEN; const o=Object.assign({},opt||{}); if(o.onend){ const f=o.onend; o.onend=()=>{ if(GEN===gen) f(); }; } AU.say(ph,o); }
function later(fn,ms){ const gen=GEN; return setTimeout(()=>{ if(GEN===gen) fn(); },ms); }
function stopTimers(){ if(G.timer){ clearTimeout(G.timer); clearInterval(G.timer); G.timer=null; } if(G.tick){ clearInterval(G.tick); G.tick=null; } }
function cancelAll(){ GEN++; stopTimers(); AU.stop(); G.busy=false; }
function home(){ cancelAll(); G.mode='home'; G.kp=''; G.msg=null; G.reveal=null; G.bead=null; render(); }
function open(){ cancelAll(); app().go('facts'); G.mode='home'; G.kp=''; G.msg=null; render(); const d=due(); say(d.length?FP.ui.due:(fresh().length?FP.ui.noDue:FP.ui.allKnown)); }

/* ---------- «Новая бусинка»: Incremental Rehearsal ---------- */
function startNew(){
  const p=app().P(); const fr=fresh(); if(!fr.length){ say(FP.ui.allKnown); return; }
  const hard=fr.filter(f=>p.hard&&p.hard[f.key]>0);
  const f=(hard.length?hard:fr)[Math.floor(Math.random()*(hard.length?hard:fr).length)];
  G.newFact=f; G.mode='intro'; G.kp=''; G.msg=null; G.reveal=null; render();
  say(FP.ui.intro,{onend:()=>say(FP.full(f.o),{onend:()=>say(FP.ui.aloud)})});
}
function startIR(){
  const f=G.newFact; const kn=E.shuffle(known().filter(x=>x.key!==f.key)).slice(0,6);
  const seq=[]; if(!kn.length){ seq.push(f,f,f); } else { for(let i=1;i<=kn.length;i++){ seq.push(f); for(let j=0;j<i;j++) seq.push(kn[j]); } }
  G.queue=seq.map(x=>({f:x, isNew:x.key===f.key})); G.i=0; G.mode='ir'; G.kp=''; G.msg=null; G.reveal=null; G.results=[]; render();
  say(FP.ui.irStart,{onend:()=>askCurrent()});
}
function askCurrent(){ const q=G.queue[G.i]; if(!q) return; G.tStart=Date.now(); say(FP.problem(q.f.o)); }
function irAnswer(v){
  const q=G.queue[G.i]; const ok=v===q.f.ans; const rt=Date.now()-G.tStart;
  G.results.push({key:q.f.key, ok, rt, isNew:q.isNew});
  if(ok){ AU.sfx.ok(); G.msg=E.pick(PH.praise); G.msgT='ok'; G.reveal=null; G.i++; if(G.i>=G.queue.length){ finishIR(); return; } render(); say(G.msg,{onend:()=>askCurrent()}); }
  else{ AU.sfx.no(); G.reveal=q.f; G.msg=FP.ui.wrongShow; G.msgT='reveal'; G.kp=''; render(); say(FP.full(q.f.o)); if(!q.isNew) promote(q.f,false,rt); }
}
function finishIR(){
  const f=G.newFact, r=rec(f.key); r.b=1; r.due=addDays(1); r.n++; store();
  const p=app().P(); p.stars++; p.coins+=2; app().save();
  G.mode='result'; G.bead={f, jar:1}; G.summary={title:'Новая бусинка в банке!', lines:['Пример '+f.html+' = <b>'+f.ans+'</b> теперь в копилке.','Завтра он попросится на повторение.'], reward:'+1 ★ · +2 ●'};
  render(); AU.sfx.coin(); say(FP.ui.bead,{onend:()=>say(FP.ui.learned)});
}

/* ---------- «Слаймовый забег»: 3×20 с ---------- */
function sprintPool(){ let d=due(); if(d.length<4) d=known(); return d; }
function startSprint(){
  const pl=sprintPool(); if(pl.length<4) return;
  G.mode='sprint'; G.round=0; G.results=[]; G.correct=0; G.wrong=0; G.pos=0; G.streak=0; G.kp=''; G.msg=null; G.reveal=null; G.phase='intro'; render();
  say(introPhrase(FP.ui.sprintIntro),{onend:()=>sprintRound()});
}
function sprintRound(){
  G.round++; G.phase='run'; G.kp=''; G.msg=null; G.reveal=null; G.roundCorrect=0; G.pos=0;
  G.queue=E.shuffle(sprintPool().slice()); G.i=0; G.item=G.queue[0];
  G.tStart=Date.now(); G.roundStart=Date.now(); render();
  const ph=noTimers()?FP.ui.go:(G.round===1?FP.ui.raceStart:(G.round===2?FP.ui.round2:FP.ui.round3));
  G.roundN=0;
  if(!noTimers()) G.timer=later(()=>sprintRest(), SPRINT_MS+1200);
  say(ph);
}
function nextSprintItem(){ G.i++; if(G.i>=G.queue.length){ G.queue=E.shuffle(sprintPool().slice()); G.i=0; } G.item=G.queue[G.i]; G.tStart=Date.now(); G.kp=''; }
function sprintAnswer(v){
  const f=G.item, ok=v===f.ans, rt=Date.now()-G.tStart;
  G.results.push({key:f.key, ok, rt});
  G.roundN=(G.roundN||0)+1;
  if(ok){ G.correct++; G.roundCorrect++; G.pos=Math.min(10,G.pos+1); G.streak++; AU.sfx.tick(); if(G.streak===3){ say(FP.ui.streak); } G.reveal=null; G.msg=null; nextSprintItem(); }
  else { G.wrong++; G.streak=0; AU.sfx.no(); G.reveal=f; G.kp=''; const again=Object.assign({},f); G.queue.splice(G.i+3,0,again); G.msg=null; nextSprintItem(); }
  if(noTimers() && G.roundN>=8){ render(); sprintRest(); return; }
  render();
}
function sprintRest(){
  stopTimers(); if(G.mode!=='sprint') return;
  G.reveal=null; G.kp='';
  if(G.round>=ROUNDS){ finishSprint(); return; }
  G.phase='rest'; G.restLeft=REST_MS/1000; render(); say(FP.ui.rest);
  if(noTimers()) return;
  const gen=GEN; G.tick=setInterval(()=>{ if(GEN!==gen){ clearInterval(G.tick); G.tick=null; return; } G.restLeft--; if(G.restLeft<=0){ clearInterval(G.tick); G.tick=null; sprintRound(); } else render(); },1000);
}
function finishSprint(){
  stopTimers(); G.phase='done';
  const by={}; G.results.forEach(r=>{ const b=by[r.key]||(by[r.key]={ok:true,rt:0,n:0}); b.ok=b.ok&&r.ok; b.rt+=r.rt; b.n++; });
  let up=0; Object.keys(by).forEach(k=>{ const b=by[k]; const before=rec(k).b; promote(BYKEY[k], b.ok, b.rt/b.n); if(rec(k).b>before) up++; });
  const p=app().P(); const coins=Math.min(6,Math.floor(G.correct/4))+(G.wrong===0&&G.correct>=6?3:0); p.coins+=coins; if(G.correct>=8) p.stars++; app().save();
  G.mode='result'; G.summary={title:'Забег окончен!', lines:['Правильных ответов: <b>'+G.correct+'</b>'+(G.wrong?', с ошибкой: '+G.wrong:', без единой ошибки'),(up?'Бусинок поднялось на полку выше: <b>'+up+'</b>':'Бусинки остались на своих полках, повторим завтра.')], reward:'+'+coins+' ●'+(G.correct>=8?' · +1 ★':'')};
  render(); AU.sfx.end(); say(noTimers()?PH.ui.seriesDone:FP.ui.sprintDone,{onend:()=>{ if(up) say(FP.ui.jarUp); }});
}

/* ---------- «Обгони Булька»: taped problems ---------- */
function startTaped(){
  const pl=sprintPool(); if(pl.length<4) return;
  G.mode='taped'; G.phase='intro'; G.queue=E.shuffle(pl.slice()).slice(0,8); G.i=0; G.won=0; G.lost=0; G.streak=0; G.lstreak=0; G.pos=0; G.bulk=0; G.kp=''; G.msg=null; G.reveal=null; G.results=[]; render();
  say(introPhrase(FP.ui.tapedIntro),{onend:()=>tapedItem()});
}
function tapedItem(){
  if(G.i>=G.queue.length){ finishTaped(); return; }
  G.item=G.queue[G.i]; G.phase='listen'; G.kp=''; G.reveal=null; G.msg=null; G.late=false; render();
  say(FP.problem(G.item.o),{onend:()=>{ if(G.mode!=='taped'||G.item!==G.queue[G.i]) return; G.phase='race'; G.tStart=Date.now(); G.delay=prof().delay; render(); if(!noTimers()) G.timer=later(()=>tapedLate(), G.delay); }});
}
function tapedLate(){
  stopTimers(); if(G.mode!=='taped'||G.phase!=='race') return;
  const f=G.item; G.phase='late'; G.reveal=f; G.kp=''; G.lost++; G.lstreak++; G.streak=0; G.bulk=Math.min(10,G.bulk+1); G.results.push({key:f.key, ok:false});
  const s=prof(); if(!noTimers() && G.lstreak>=2){ s.delay=Math.min(4000,s.delay+500); G.lstreak=0; store(); }
  render(); say(FP.answer(f.ans),{onend:()=>say(noTimers()?FP.ui.wrongShow:FP.ui.late)});
}
function tapedAnswer(v){
  const f=G.item;
  if(G.phase==='race'){
    const rt=Date.now()-G.tStart;
    if(v===f.ans){ stopTimers(); G.phase='win'; G.won++; G.streak++; G.lstreak=0; G.pos=Math.min(10,G.pos+1); G.results.push({key:f.key, ok:true, rt}); promote(f,true,rt); AU.sfx.ok();
      const s=prof(); if(!noTimers() && G.streak>=5){ s.delay=Math.max(2000,s.delay-500); G.streak=0; store(); }
      G.msg=noTimers()?PH.praise[0]:FP.ui.beat; G.msgT='ok'; render(); say(G.msg,{onend:()=>{ G.i++; tapedItem(); }}); }
    else { AU.sfx.no(); G.kp=''; tapedLate(); }
  } else if(G.phase==='late'){
    if(v===f.ans){ G.phase='retypeWait'; AU.sfx.tick(); G.msg=E.pick(PH.praise); G.msgT='ok'; render(); G.i++; later(()=>tapedItem(), reduce?200:500); }
    else { AU.sfx.no(); G.kp=''; render(); say(FP.answer(f.ans)); }
  }
}
function finishTaped(){
  stopTimers(); const p=app().P(); const coins=Math.floor(G.won/2); p.coins+=coins; if(G.won>=6) p.stars++; app().save();
  G.mode='result'; G.summary={title:noTimers()?'Серия готова!':(G.won>G.lost?'Ты обогнал Булька!':'Бульк сегодня быстрее'), lines:[(noTimers()?'Правильных ответов: <b>':'Успел раньше голоса: <b>')+G.won+'</b> из '+G.queue.length,noTimers()?'Без таймера, в своём темпе.':('Пауза сейчас: '+(prof().delay/1000).toFixed(1)+' с. Чем чаще успеваешь, тем короче пауза.')], reward:'+'+coins+' ●'+(G.won>=6?' · +1 ★':'')};
  render(); AU.sfx.end(); say(noTimers()?PH.ui.seriesDone:FP.ui.tapedDone);
}

/* ---------- «Вспышка»: субитизация 1–5, затем 6–10 на рамке ---------- */
const DICE={1:[[2,2]],2:[[1,1],[3,3]],3:[[1,1],[2,2],[3,3]],4:[[1,1],[3,1],[1,3],[3,3]],5:[[1,1],[3,1],[2,2],[1,3],[3,3]],6:[[1,1],[3,1],[1,2],[3,2],[1,3],[3,3]]};
function flashPattern(n, level){
  const kind = level>=2 ? (Math.random()<.6?'frame':'dice') : (n<=6 && Math.random()<.6 ? 'dice' : 'frame');
  if(kind==='dice' && n<=6) return {kind:'dice', n, pts:DICE[n]};
  const cells=[]; if(level>=2 || Math.random()<.5){ for(let i=0;i<n;i++) cells.push(i); } else { const all=E.shuffle([0,1,2,3,4,5,6,7,8,9]); for(let i=0;i<n;i++) cells.push(all[i]); }
  return {kind:'frame', n, cells};
}
function startFlash(){
  const fl=prof().flash; G.mode='flash'; G.phase='intro'; G.i=0; G.correct=0; G.wrong=0; G.streak=0; G.lstreak=0; G.kp=''; G.msg=null; G.results=[]; G.queue=[];
  const max= fl.level>=2 ? 10 : 5, min= fl.level>=2 ? 5 : 1;
  for(let i=0;i<8;i++){ G.queue.push(E.rand(min,max)); }
  render(); say(introPhrase(FP.ui.flashIntro),{onend:()=>flashItem()});
}
function flashItem(){
  if(G.i>=G.queue.length){ finishFlash(); return; }
  const fl=prof().flash; const n=G.queue[G.i]; G.item={n, pat:flashPattern(n, fl.level), ans:n};
  G.phase='show'; G.kp=''; G.reveal=null; G.msg=null; render();
  if(!noTimers()) G.timer=later(()=>{ G.phase='ask'; render(); say(FP.ui.flashAsk); }, fl.expo);
}
function flashAnswer(v){
  const fl=prof().flash, ok=v===G.item.ans; G.results.push(ok);
  if(ok){ G.correct++; G.streak++; G.lstreak=0; AU.sfx.ok(); G.msg=E.pick(PH.praise); G.msgT='ok';
    if(G.streak>=3 && !noTimers() && fl.expo>500){ fl.expo=Math.max(500,fl.expo-300); G.streak=0; store(); G.msg=FP.ui.flashFaster; }
    G.phase='reveal'; render(); say(G.msg,{onend:()=>{ G.i++; flashItem(); }});
  } else { G.wrong++; G.streak=0; G.lstreak++; AU.sfx.no();
    if(G.lstreak>=2 && !noTimers()){ fl.expo=Math.min(2500,fl.expo+300); G.lstreak=0; store(); say(FP.ui.flashSlower); }
    G.phase='reveal'; G.reveal=true; G.kp=''; G.msg=FP.ui.wrongShow; G.msgT='reveal'; render(); say(FP.answer(G.item.ans)); }
}
function flashRetype(v){
  if(G.phase!=='reveal'||!G.reveal) return;
  if(v===G.item.ans){ G.phase='retypeWait'; G.kp=''; AU.sfx.tick(); render(); G.i++; later(()=>flashItem(), reduce?150:400); }
  else { AU.sfx.no(); G.kp=''; render(); }
}
function finishFlash(){
  stopTimers(); const fl=prof().flash, p=app().P(); let up=false;
  if(fl.level===1 && G.correct>=7 && fl.expo<=800){ fl.level=2; fl.expo=2000; up=true; }
  fl.best=Math.max(fl.best||0,G.correct); store();
  const coins=Math.floor(G.correct/2); p.coins+=coins; if(G.correct>=7) p.stars++; app().save();
  G.mode='result'; G.bead=null; G.summary={title: up?'Новый уровень!':'Вспышка окончена', lines:['Увидел сразу: <b>'+G.correct+'</b> из '+G.queue.length, up?'Теперь слаймики будут жить в теремке до десяти.':('Показ: '+(noTimers()?'без таймера':(fl.expo/1000).toFixed(1)+' с')+(fl.level>=2?' · уровень 2':''))], reward:'+'+coins+' ●'+(G.correct>=7?' · +1 ★':'')};
  render(); AU.sfx.end(); say(up?FP.ui.flashLevel:FP.ui.flashDone);
}
function flashSVG(pat, hidden){
  if(pat.kind==='dice'){ return '<svg class="flash dice'+(hidden?' hidden':'')+'" viewBox="0 0 120 120" aria-hidden="true"><rect x="4" y="4" width="112" height="112" rx="22" class="face"/>'+pat.pts.map(([x,y])=>'<circle cx="'+(x*30)+'" cy="'+(y*30)+'" r="11" class="dot"/>').join('')+'</svg>'; }
  let h='<svg class="flash flash-frame'+(hidden?' hidden':'')+'" viewBox="0 0 200 84" aria-hidden="true"><rect x="2" y="2" width="196" height="80" rx="8" class="face"/>';
  for(let i=1;i<5;i++) h+='<line x1="'+(2+i*39.2)+'" y1="2" x2="'+(2+i*39.2)+'" y2="82" class="grid"/>'; h+='<line x1="2" y1="42" x2="198" y2="42" class="grid"/>';
  pat.cells.forEach(c=>{ const x=2+(c%5)*39.2+19.6, y=c<5?22:62; h+='<circle cx="'+x+'" cy="'+y+'" r="13" class="dot '+(c<5?'rd':'bl')+'"/>'; });
  return h+'</svg>';
}
function viewFlash(){
  let h='<section class="card stage facts">';
  if(G.phase==='intro'){ h+='<div class="endbox">'+pal('see','bob','Бульк','happy')+'<h2>Вспышка</h2><p>'+introPhrase(FP.ui.flashIntro).text+'</p><p class="muted">Показ: '+(noTimers()?'без таймера':(prof().flash.expo/1000).toFixed(1)+' с')+'</p></div><div class="row"><button type="button" class="btn ghost" data-act="factsHome">Назад</button></div></section>'; return h; }
  h+='<div class="meta"><div class="bar">'+G.queue.map((x,i)=>'<i class="'+(i<G.results.length?(G.results[i]?'good':'meh'):(i===G.i?'cur':''))+'"></i>').join('')+'</div><span>✓ '+G.correct+'</span></div>';
  const showing=G.phase==='show';
  h+='<div class="instr"><p>'+(showing?'Смотри!':(G.phase==='ask'?FP.ui.flashAsk.text:(G.reveal?FP.ui.wrongShow.text:'')))+'</p></div>';
  h+='<div class="visual"><div class="flashbox">'+flashSVG(G.item.pat, !(showing||G.reveal))+(G.reveal?'<div class="example"><span class="ans">'+G.item.ans+'</span></div>':'')+'</div>';
  if(showing && noTimers()) h+='<button type="button" class="btn ghost small" data-act="flashSeen">Увидел!</button>';
  if(G.msg&&!G.reveal) h+='<div class="say-row">'+pal('see','',null,'happy')+'<p class="msg '+G.msgT+'">'+G.msg.text+'</p></div>';
  h+='</div><div class="ask">'+keypad(!(G.phase==='ask'||(G.phase==='reveal'&&G.reveal)))+'</div></section>';
  return h;
}

/* ---------- числовая прямая 0–20 ---------- */
function numberLineSVG(o, stage){
  // stage: 0 — пусто, 1 — первый прыжок до 10, 2 — оба прыжка
  const W=400, L=18, R=382, y=46, step=(R-L)/20, X=n=>L+n*step;
  let h='<svg class="numline" viewBox="0 0 400 70" role="img" aria-label="Числовая прямая от нуля до двадцати"><line x1="'+L+'" y1="'+y+'" x2="'+R+'" y2="'+y+'" class="axis"/>';
  for(let n=0;n<=20;n++){ const big=n%5===0; h+='<line x1="'+X(n)+'" y1="'+(y-(big?7:4))+'" x2="'+X(n)+'" y2="'+(y+(big?7:4))+'" class="tick'+(n===10?' ten':'')+'"/>'; if(big) h+='<text x="'+X(n)+'" y="'+(y+20)+'" class="lbl'+(n===10?' ten':'')+'">'+n+'</text>'; }
  const arc=(a,b,cls,label)=>{ const d=Math.abs(b-a)*step, hgt=Math.min(30,10+d*0.5), dir=b>a?1:-1; return '<path d="M'+X(a)+' '+y+' Q '+((X(a)+X(b))/2)+' '+(y-hgt*2)+' '+X(b)+' '+y+'" class="jump '+cls+'"/><polygon points="'+X(b)+','+y+' '+(X(b)-6*dir)+','+(y-9)+' '+(X(b)-10*dir)+','+(y-2)+'" class="arrow '+cls+'"/><text x="'+((X(a)+X(b))/2)+'" y="'+(y-hgt-6)+'" class="jl '+cls+'">'+label+'</text>'; };
  if(o.op==='add'){ h+='<circle cx="'+X(o.a)+'" cy="'+y+'" r="6" class="start"/>'; if(stage>=1) h+=arc(o.a,10,'first','+'+o.k); if(stage>=2) h+=arc(10,o.sum,'second','+'+o.r)+'<circle cx="'+X(o.sum)+'" cy="'+y+'" r="6" class="end"/>'; }
  else { h+='<circle cx="'+X(o.m)+'" cy="'+y+'" r="6" class="start"/>'; if(stage>=1) h+=arc(o.m,10,'first','−'+o.u); if(stage>=2) h+=arc(10,o.res,'second','−'+o.r)+'<circle cx="'+X(o.res)+'" cy="'+y+'" r="6" class="end"/>'; }
  return h+'</svg>';
}
function taskExtra(t){
  if(!settings().numberLine || !t || !t.o) return '';
  if(t.skill!=='add' && t.skill!=='sub' && t.skill!=='mix') return '';
  const stage = t.done ? 2 : (t.hintChain ? 2 : (t.house && t.house[2]!=='?' ? 2 : (t.house ? 1 : (t.explaining ? 1 : 0))));
  if(!stage && !t.explaining) return '';
  return '<div class="numline-wrap">'+numberLineSVG(t.o, stage)+'</div>';
}

/* ---------- ввод ---------- */
function press(k){
  if(G.busy||(G.mode==='flash'&&G.phase==='retypeWait')) return;
  if(k==='del'){ G.kp=G.kp.slice(0,-1); render(); return; }
  if(k==='go'){ submit(); return; }
  if(G.kp.length<2) G.kp=(G.kp==='0'?'':G.kp)+k; AU.sfx.key(); render();
}
function submit(){
  if(G.kp==='') return; const v=parseInt(G.kp,10); G.kp='';
  if(G.mode==='ir') irAnswer(v);
  else if(G.mode==='sprint'&&G.phase==='run') sprintAnswer(v);
  else if(G.mode==='taped'&&(G.phase==='race'||G.phase==='late')) tapedAnswer(v);
  else if(G.mode==='flash'&&G.phase==='ask') flashAnswer(v);
  else if(G.mode==='flash'&&G.reveal) flashRetype(v);
  else render();
}

/* ---------- представление ---------- */
const pal=(id,cls,label,mood)=>CH.pal(id,cls,label,mood);
function jarSVG(level, count, label){
  const fill=Math.min(1,count/12), h=52*fill;
  return '<div class="jar l'+level+'" role="img" aria-label="'+label+': '+count+'"><svg viewBox="0 0 60 80" aria-hidden="true"><rect x="16" y="4" width="28" height="8" rx="3" class="lid"/><path d="M12 14h36v52a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8z" class="glass"/><rect x="14" y="'+(66-h)+'" width="32" height="'+h+'" rx="4" class="jelly"/>'+beads(count,66-h)+'</svg><b>'+count+'</b><span>'+label+'</span></div>';
}
function beads(n,top){ let s=''; const m=Math.min(n,14); for(let i=0;i<m;i++){ const x=18+(i%4)*8+(Math.floor(i/4)%2?4:0), y=62-Math.floor(i/4)*8; if(y<top-2) break; s+='<circle cx="'+x+'" cy="'+y+'" r="3.2" class="bead '+(i%2?'bl':'rd')+'"/>'; } return s; }
function keypad(disabled){
  const off=disabled?' disabled':'';
  let h='<div class="display'+(G.kp===''?' empty':'')+'" aria-live="polite">'+(G.kp===''?'?':G.kp)+'</div><div class="keys">';
  [1,2,3,4,5,6,7,8,9].forEach(k=>{ h+='<button type="button" class="key" data-fk="'+k+'"'+off+'>'+k+'</button>'; });
  h+='<button type="button" class="key del" data-fk="del" aria-label="Стереть"'+off+'>⌫</button><button type="button" class="key" data-fk="0"'+off+'>0</button><button type="button" class="key go" data-fk="go"'+(G.kp===''||disabled?' disabled':'')+'>Готово</button></div>';
  return h;
}
function track(pos, bulk){
  const steps=10; let h='<div class="track" aria-label="Дорожка забега">';
  h+='<div class="lane"><span class="runner me" style="left:'+(pos/steps*100)+'%">'+pal('avatar','', '', pos>=steps?'happy':undefined)+'</span></div>';
  if(bulk!=null) h+='<div class="lane"><span class="runner bulk" style="left:'+(bulk/steps*100)+'%">'+pal('see','', 'Бульк')+'</span></div>';
  h+='<i class="finish" aria-hidden="true">🏁</i></div>';
  return h;
}
function problemBig(f, reveal){ return '<div class="example">'+f.html+' = '+(reveal?'<span class="ans">'+f.ans+'</span>':'<span class="q">?</span>')+'</div>'; }
function homeGameCopy(can){
  return {
    factsSprint:can?(noTimers()?'Три части по 8 ответов с передышкой':'Три рывка по 20 секунд с передышкой'):'Откроется, когда в копилке будет 4 бусинки',
    factsFlash:(noTimers()?'Посмотри и нажми «Увидел!», когда будешь готов':'Слаймики показываются на миг. Сколько их? Не считай, просто смотри')+(prof().flash.level>=2?' · уровень 2':''),
    factsTaped:can?(noTimers()?'Послушай пример и ответь в своём темпе':'Бульк читает пример, а ты отвечай раньше него'):'Откроется, когда в копилке будет 4 бусинки'
  };
}
function refreshHomeGameCopy(){
  if(app().S.screen!=='facts'||G.mode!=='home') return;
  const copy=homeGameCopy(sprintPool().length>=4);
  // Keep the checkbox, open details, focus and scroll position intact.
  Object.keys(copy).forEach(act=>{ const node=$('#app .games [data-act="'+act+'"] small'); if(node) node.textContent=copy[act]; });
}
function viewHome(){
  const o=ops(); const sh=shelves(); const d=due(), kn=known(), fr=fresh();
  let h='<section class="card stage facts">';
  if(!o.length){ h+='<div class="endbox">'+pal('add','bob','Фея Капелька','think')+'<h2>Копилка фактов</h2><p class="muted">'+FP.ui.locked.text+'</p></div><div class="row"><button type="button" class="btn ghost" data-act="map">На карту</button></div></section>'; return h; }
  h+='<div class="facts-head">'+pal('add','', 'Фея Капелька','happy')+'<div><h2>Копилка фактов</h2><p class="muted">Волшебные банки памяти. Каждая бусинка — пример, который ты помнишь.</p></div></div>';
  h+='<div class="jars">'+JARS.map((n,i)=>jarSVG(i+1, sh[i+1], n)).join('')+'</div>';
  h+='<p class="facts-line">'+(d.length?'<b>'+d.length+'</b> '+PH.pl(d.length,['бусинка просится','бусинки просятся','бусинок просятся'])+' на повторение сегодня':(kn.length?'Сегодня всё повторено':'Банки пока пустые'))+' · ещё не в копилке: <b>'+fr.length+'</b></p>';
  const can=sprintPool().length>=4;
  const copy=homeGameCopy(can);
  h+='<div class="games">';
  h+='<button type="button" class="game" data-act="factsNew"'+(fr.length?'':' disabled')+'><span class="gi">'+beadIcon()+'</span><span><b>Новая бусинка</b><small>Запомнить один пример: сначала вслух, потом вперемешку со знакомыми</small></span></button>';
  h+='<button type="button" class="game" data-act="factsSprint"'+(can?'':' disabled')+'><span class="gi">🏃</span><span><b>Слаймовый забег</b><small>'+copy.factsSprint+'</small></span></button>';
  h+='<button type="button" class="game" data-act="factsFlash"><span class="gi">👁</span><span><b>Вспышка</b><small>'+copy.factsFlash+'</small></span></button>';
  h+='<button type="button" class="game" data-act="factsTaped"'+(can?'':' disabled')+'><span class="gi">'+pal('see')+'</span><span><b>Обгони Булька</b><small>'+copy.factsTaped+'</small></span></button>';
  h+='</div>';
  h+='<details class="facts-parent"><summary>Для взрослого</summary>'+
    '<label class="fset"><input type="checkbox" data-fset="noTimers"'+(settings().noTimers?' checked':'')+'><span><b>Спокойный режим: без таймеров</b><small>Забег, гонка и вспышка идут в темпе ребёнка. Рекомендуется при дискалькулии и тревожности.</small></span></label>'+
    '<label class="fset"><input type="checkbox" data-fset="numberLine"'+(settings().numberLine?' checked':'')+'><span><b>Числовая прямая в разборе</b><small>Вторая картинка к теремку: прыжок до 10 и остаток на дорожке 0–20.</small></span></label>'+
    '<p>Полки — это интервальное повторение: новая бусинка возвращается завтра, потом через 3 дня, неделю, две недели и месяц. Ошибка возвращает бусинку на первую полку. «Новая бусинка» — метод Incremental Rehearsal: новый пример чередуется со знакомыми, чтобы 90% ответов были верными. «Забег» — три отрезка по 20 с: короткие рывки удерживают внимание лучше одной долгой минуты. «Обгони Булька» — taped problems: ответ всегда прозвучит, ошибки невозможны, пауза сама подстраивается ('+(prof().delay/1000).toFixed(1)+' с). Лучшее время для копилки — вечером, перед сном.</p></details>';
  h+='<div class="row"><button type="button" class="btn ghost" data-act="map">На карту</button></div></section>';
  return h;
}
function beadIcon(){ return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="var(--ca)"/><ellipse cx="9" cy="8.5" rx="2.5" ry="1.6" fill="#fff" opacity=".7"/></svg>'; }
function viewIntro(){
  const f=G.newFact;
  return '<section class="card stage facts"><div class="meta"><span>Новая бусинка</span></div><div class="instr"><p>'+FP.ui.intro.text+' '+FP.ui.aloud.text+'</p><button type="button" class="say" data-act="factsSayFull" aria-label="Прочитать вслух">'+ICON_SAY+'</button></div>'+
    '<div class="visual"><div class="bigcard">'+problemBig(f,true)+'</div>'+(settings().numberLine?'<div class="numline-wrap">'+numberLineSVG(f.o,2)+'</div>':'')+pal('add','talk','Фея Капелька','happy')+'</div>'+
    '<div class="ask"><button type="button" class="btn" data-act="factsSaid">Я сказал вслух!</button><button type="button" class="btn ghost" data-act="factsHome">Назад</button></div></section>';
}
function viewIR(){
  const q=G.queue[G.i]; const total=G.queue.length;
  let h='<section class="card stage facts"><div class="meta"><div class="bar">'+G.queue.map((x,i)=>'<i class="'+(i<G.i?(G.results[i]&&G.results[i].ok?'good':'meh'):(i===G.i?'cur':''))+(x.isNew?' new':'')+'"></i>').join('')+'</div><span>'+(q.isNew?'новый':'знакомый')+'</span></div>';
  h+='<div class="instr"><p>'+(q.isNew?'Новый пример. Сколько будет?':'Знакомый пример.')+'</p><button type="button" class="say" data-act="factsSayProblem" aria-label="Прочитать вслух">'+ICON_SAY+'</button></div>';
  h+='<div class="visual"><div class="bigcard'+(q.isNew?' new':'')+'">'+problemBig(q.f, !!G.reveal)+'</div>'+(G.reveal&&settings().numberLine?'<div class="numline-wrap">'+numberLineSVG(q.f.o,2)+'</div>':'')+'</div>';
  h+='<div class="ask">'+(G.msg?'<div class="say-row">'+pal('add','',null,G.msgT==='ok'?'happy':'think')+'<p class="msg '+G.msgT+'">'+G.msg.text+'</p></div>':'<p class="msg">&nbsp;</p>')+keypad(false)+'</div></section>';
  return h;
}
function viewSprint(){
  let h='<section class="card stage facts">';
  if(G.phase==='intro'){ h+='<div class="endbox">'+pal('see','bob','Бульк','happy')+'<h2>Слаймовый забег</h2><p>'+introPhrase(FP.ui.sprintIntro).text+'</p></div><div class="row"><button type="button" class="btn ghost" data-act="factsHome">Назад</button></div></section>'; return h; }
  if(G.phase==='rest'){ h+='<div class="endbox"><h2>Передышка</h2>'+(noTimers()?'':'<div class="restnum">'+G.restLeft+'</div>')+'<p class="move">'+FP.ui.rest.text+'</p><p class="muted">Рывок '+G.round+' из '+ROUNDS+': правильных '+G.roundCorrect+'</p></div>'+(noTimers()?'<div class="row"><button type="button" class="btn" data-act="sprintNext">Дальше</button></div>':'')+'</section>'; return h; }
  const left=Math.max(0,SPRINT_MS+1200-(Date.now()-G.roundStart));
  h+='<div class="meta"><span>Рывок '+G.round+' из '+ROUNDS+'</span><span>✓ '+G.correct+'</span></div>';
  if(noTimers()) h+='<p class="facts-line">Ответов в рывке: '+(G.roundN||0)+' из 8</p>'; else h+='<div class="timer big" aria-hidden="true"><i style="animation-duration:'+(SPRINT_MS+1200)+'ms;animation-delay:-'+(SPRINT_MS+1200-left)+'ms"></i></div>';
  h+=track(G.pos,null);
  h+='<div class="visual"><div class="bigcard">'+problemBig(G.item, !!G.reveal&&G.reveal.key===G.item.key)+'</div>'+(G.reveal?'<p class="msg reveal">Было: '+G.reveal.html+' = '+G.reveal.ans+'</p>':'')+'</div>';
  h+='<div class="ask">'+keypad(false)+'</div></section>';
  return h;
}
function viewTaped(){
  let h='<section class="card stage facts">';
  if(G.phase==='intro'){ h+='<div class="endbox">'+pal('see','bob','Бульк','happy')+'<h2>Обгони Булька</h2><p>'+introPhrase(FP.ui.tapedIntro).text+'</p>'+(noTimers()?'':'<p class="muted">Пауза: '+(prof().delay/1000).toFixed(1)+' с</p>')+'</div><div class="row"><button type="button" class="btn ghost" data-act="factsHome">Назад</button></div></section>'; return h; }
  h+='<div class="meta"><span>'+(noTimers()?'Пример ':'Гонка ')+(G.i+1)+' из '+G.queue.length+'</span><span>'+(noTimers()?'Верно: '+G.won:'Ты '+G.won+' · Бульк '+G.lost)+'</span></div>';
  h+=track(G.pos,noTimers()?null:G.bulk);
  const racing=G.phase==='race';
  h+='<div class="visual"><div class="bigcard'+(G.phase==='listen'?' listen':'')+'">'+problemBig(G.item, G.phase==='late')+'</div>';
  if(racing && !noTimers()) h+='<div class="timer big race" aria-hidden="true"><i style="animation-duration:'+G.delay+'ms"></i></div>';
  if(G.phase==='listen') h+='<p class="msg muted">Бульк читает…</p>';
  if(G.phase==='late') h+='<div class="say-row">'+pal('see','',null,'happy')+'<p class="msg reveal">'+(noTimers()?FP.ui.wrongShow:FP.ui.late).text+'</p></div>';
  if(G.phase==='win') h+='<div class="say-row">'+pal('add','',null,'happy')+'<p class="msg ok">'+(noTimers()?PH.praise[0]:FP.ui.beat).text+'</p></div>';
  h+='</div><div class="ask">'+keypad(!(racing||G.phase==='late'))+'</div></section>';
  return h;
}
function viewResult(){
  const s=G.summary;
  let h='<section class="card stage facts"><div class="endbox">'+(G.bead?'<div class="beaddrop">'+jarSVG(1, shelves()[1], JARS[0])+'<span class="bead-fly" aria-hidden="true"></span></div>':pal('add','bob','Фея Капелька','happy'))+'<h2>'+s.title+'</h2>'+s.lines.map(l=>'<p>'+l+'</p>').join('')+'<p class="bonus">'+s.reward+'</p></div>';
  h+='<div class="row"><button type="button" class="btn" data-act="factsHome">В копилку</button><button type="button" class="btn ghost" data-act="map">На карту</button></div></section>';
  return h;
}
const ICON_SAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>';
function view(){ return ({home:viewHome, intro:viewIntro, said:viewIntro, ir:viewIR, sprint:viewSprint, taped:viewTaped, flash:viewFlash, result:viewResult})[G.mode](); }

/* кнопка входа для карты/острова/перерыва */
function entry(kind){
  if(!ops().length) return '';
  const d=due().length;
  if(kind==='map') return '<button type="button" class="facts-fab" data-act="facts" aria-label="Копилка фактов">'+beadIcon()+'<span>Копилка'+(d?' · '+d:'')+'</span></button>';
  return '<button type="button" class="btn ghost" data-act="facts">'+beadIcon()+' Копилка фактов'+(d?' · повторить '+d:'')+'</button>';
}

/* ---------- регистрация ---------- */
const EXT=root.__ext;
EXT.views.facts=view;
EXT.hooks.mapExtra=()=>entry('map');
EXT.hooks.breakExtra=()=>entry('break');
EXT.hooks.islandExtra=(id)=>(['add','sub','mix'].includes(id)?entry('island'):(id==='see'?'<button type="button" class="btn ghost" data-act="factsFlashDirect">👁 Вспышка: сколько слаймиков?</button>':''));
EXT.hooks.taskExtra=taskExtra;
EXT.hooks.leave=(screen)=>{ if(screen!=='facts') cancelAll(); };
Object.assign(EXT.acts,{
  facts:()=>open(),
  factsHome:()=>home(),
  factsNew:()=>startNew(),
  factsSaid:()=>{ if(G.mode!=='intro') return; G.mode='said'; render(); say(FP.ui.said,{onend:()=>{ if(G.mode==='said') startIR(); }}); },
  factsSprint:()=>startSprint(),
  factsTaped:()=>startTaped(),
  factsFlash:()=>startFlash(),
  factsFlashDirect:()=>{ cancelAll(); app().go('facts'); startFlash(); },
  flashSeen:()=>{ if(G.mode==='flash'&&G.phase==='show'){ stopTimers(); G.phase='ask'; render(); say(FP.ui.flashAsk); } },
  sprintNext:()=>{ if(G.mode==='sprint'&&G.phase==='rest'){ sprintRound(); } },
  factsSayFull:()=>{ if(G.newFact) say(FP.full(G.newFact.o),{force:true}); },
  factsSayProblem:()=>{ const q=G.queue[G.i]; if(q) say(FP.problem(q.f.o),{force:true}); }
});
$('#app').addEventListener('change', e=>{ const k=e.target.dataset&&e.target.dataset.fset; if(k){ settings()[k]=!!e.target.checked; store(); if(k==='noTimers'){ refreshHomeGameCopy(); if(e.target.checked) say(FP.ui.noTimers,{force:true}); } } });
$('#app').addEventListener('click', e=>{ const k=e.target.closest('[data-fk]'); if(k && app().S.screen==='facts'){ press(k.dataset.fk); } });
document.addEventListener('keydown', e=>{
  if(app().S.screen!=='facts' || (e.target.closest && e.target.closest('input,textarea,summary'))) return;
  if(/^[0-9]$/.test(e.key)){ e.preventDefault(); press(e.key); } else if(e.key==='Backspace'){ e.preventDefault(); press('del'); } else if(e.key==='Enter'){ e.preventDefault(); press('go'); }
});
root.__facts={G, ALL, rec, prof, shelves, due, known, fresh, store, settings, numberLineSVG, get ST(){return ST;}};
// app.js paints a saved profile before this module registers its map entry.
// Refresh only that initial map; never restart a story, task, or parent screen.
if(app().S.screen==='map') render();
})(window);

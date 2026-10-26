/* Приложение «Через десяток»: экраны, профили, награды, магазин, кабинет родителя. */
(function(root){
'use strict';
// Recover both legacy stores before either module reads them. On failure do not boot.
try{
  if(!root.TEREM_FULL_TRANSFER) throw new Error('TRANSFER_UNAVAILABLE');
  root.TEREM_FULL_TRANSFER.recover(localStorage);
}catch(error){
  const host=document.getElementById('app');
  host.innerHTML='<section class="card stage" role="alert"><h1>Нужно восстановить данные</h1><p>Предыдущий перенос не завершился. Игра остановлена, чтобы не смешать старый и новый прогресс.</p><p>Не очищайте данные приложения. Освободите немного места на устройстве и попробуйте снова.</p><button type="button" class="btn" id="transfer-retry">Повторить восстановление</button></section>';
  document.getElementById('transfer-retry').addEventListener('click',()=>root.location.reload());
  return;
}
const PH=root.PH, E=root.ENGINE, CH=root.CH, AU=root.AUDIO;
/* точка расширения для дополнительных модулей (js/facts.js): экраны, действия, вставки */
const EXT=root.__ext=root.__ext||{views:{},acts:{},hooks:{}};
const hook=(n,...a)=>{ try{ return EXT.hooks[n]?(EXT.hooks[n](...a)||''):''; }catch(e){ return ''; } };
const $ = s => document.querySelector(s);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const uid = () => Math.random().toString(36).slice(2,10);
const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MINUS='−';
const safeLink=s=>{try{const u=new URL(String(s));return /^(https?:)$/.test(u.protocol)?u.href:'';}catch(e){return '';}};

/* ---------- данные ---------- */
const KEY='terem_v3';
function newProfile(name, color){ const skills={}; E.SKILLS.forEach(s=>skills[s.id]={phase:1,hist:[],done:false}); return {id:uid(), name, color, created:today(), skills, cur:'see', stars:0, coins:0, hard:{}, diag:false, days:{}, stickers:[], purchases:[], streak:{last:'',n:0}, pendingChest:0, chestsOpened:0, nextChestAt:10}; }
function defaults(){ return {v:3, seenStory:false, active:null, profiles:[], parent:{pin:'', rate:1, wishes:[], voice:true, sfx:true, music:true, explain:true, session:8, flash:7, coinsTask:2, coinsSeries:5, coinsDay:5}}; }
let DB = defaults();
try{ const s=JSON.parse(localStorage.getItem(KEY)||'null'); if(s && s.v===3){ DB=Object.assign(defaults(), s); DB.parent=Object.assign(defaults().parent, s.parent||{}); } }catch(e){}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){ toast('Не удалось сохранить: мало места в памяти браузера.'); } }
function P(){ return DB.profiles.find(p=>p.id===DB.active) || null; }
function applySettings(){ AU.settings.voice=DB.parent.voice; AU.settings.sfx=DB.parent.sfx; AU.settings.music=DB.parent.music; if(!DB.parent.music) AU.musicOff(); }

/* ---------- состояние сессии ---------- */
const S = {screen:'map', skill:null, t:null, count:0, results:[], retry:[], kp:'', diag:null, notice:'', busy:false, unlocked:null, say:null, earned:0, island:null, tab:'stats', pinBuf:'', pinStage:null, toast:'', chestOffer:null, storyI:0, newName:'', newColor:CH.AVATARS[0], wishForm:null, confirm:null};
function SESSION(){ return S.lessonLen||DB.parent.session||8; }
function FLASH_MS(){ return (DB.parent.flash||7)*1000; }

/* ---------- навигация ---------- */
function go(screen, extra){
  stopFlash(); stopExplain(); AU.stop(); hook('leave',screen);
  S.screen=screen; S.toast=''; Object.assign(S, extra||{});
  if(screen==='map') AU.musicOn(); else AU.musicOff();
  render();
}
function toast(msg){ S.toast=msg; render(); setTimeout(()=>{ if(S.toast===msg){ S.toast=''; render(); } }, 2600); }

/* ---------- серия заданий ---------- */
function startSession(skill, len){
  const p=P(); S.lessonLen=len||(+hook('sessionLen',skill||p.cur)||0); S.skill=skill||p.cur; S.count=0; S.results=[]; S.retry=[]; S.notice=''; S.diag=null; S.earned=0; E.setLast(null);
  go('task'); nextTask();
}
function nextTask(){
  stopFlash(); stopExplain(); S.unlocked=null;
  const p=P();
  if(!S.diag && S.count>=SESSION()){ endSession(); return; }
  let t;
  if(S.diag){ const d=S.diag.list[S.diag.i]; t=E.G[d.skill](3, d.item, p.hard); }
  else{
    const sk=S.skill, ph=p.skills[sk].phase; let it=null;
    const di=S.retry.findIndex(r=>r.due<=S.count && r.skill===sk);
    if(di>=0){ it=S.retry[di].item; S.retry.splice(di,1); }
    t=E.G[sk](ph, it, p.hard);
  }
  t.onUncover = () => { stopFlash(); };
  S.t=t; E.setLast(t.key); S.kp=''; t.startAt=Date.now();
  startStep();
}
function curStep(){ const t=S.t; return t && !t.done ? t.steps[t.si] : null; }
function startStep(){
  const t=S.t, st=curStep(); render();
  if(st){ AU.say(S.diag ? null : st.instr); if(t.flash && st.kind==='num') startFlash(); }
}
let flashTimer=null;
function stopFlash(){ if(flashTimer){ clearTimeout(flashTimer); flashTimer=null; } }
function coverNow(t){ stopFlash(); t.covered=true; t.flashStart=0; render(); const st=curStep(); if(st && st.instr2) AU.say(st.instr2); }
function startFlash(){ const t=S.t; stopFlash(); t.covered=false; t.flashStart=Date.now(); render(); flashTimer=setTimeout(()=>{ if(S.t===t && !t.done && t.flash) coverNow(t); }, FLASH_MS()); }

/* объяснение голосом */
let EX=null;
function stopExplain(){ if(EX){ EX.t.explaining=false; EX=null; } AU.stop(); }
function runExplain(){
  const t=S.t, st=curStep(); if(!t||!st||!st.ex) return;
  stopExplain(); stopFlash(); E.clearH(t);
  EX={t, beats:st.ex(), i:0, play:0, tok:{}}; t.explaining=true; t.exText=''; t.heard=true; AU.duck(true);
  nextBeat(EX.tok);
}
function nextBeat(tok){
  if(!EX||EX.tok!==tok) return; const t=EX.t;
  if(S.t!==t||t.done){ EX=null; return; }
  if(EX.i>=EX.beats.length){ t.explaining=false; EX=null; E.clearH(t); AU.duck(false); t.msg=PH.ui.typeNow; t.msgT='reveal'; render(); AU.say(PH.ui.typeNow); return; }
  const idx=++EX.i, b=EX.beats[idx-1];
  E.clearH(t); if(b.do) b.do(); t.exText=b.say.text; render();
  speakExplainBeat(tok, false);
}
function speakExplainBeat(tok, force){
  const ex=EX; if(!ex||ex.tok!==tok||!ex.i) return;
  const idx=ex.i, b=ex.beats[idx-1], play=++ex.play;
  const advance=()=>{ if(EX===ex&&ex.i===idx&&ex.play===play) nextBeat(tok); };
  if(DB.parent.explain||force) AU.say(b.say, {force:!!force,onend:()=>{ setTimeout(advance,350); }});
  else setTimeout(advance,900+b.say.say.length*70);
}

function onCell(fi, ci){
  const t=S.t, st=curStep(); if(!t||!st||st.kind!=='act'||S.busy) return;
  if(!st.can(fi,ci)) return;
  t.sfx=null; st.tap(fi,ci);
  if(t.sfx==='no') AU.sfx.no(); else AU.sfx.tick();
  if(t.msg && t.sfx) { AU.say(t.msg); }
  if(st.ready()){
    S.busy=true; render();
    setTimeout(()=>{ S.busy=false; if(S.t!==t) return; t.msg=st.doneMsg||E.pick(PH.praise); t.msgT='ok'; AU.sfx.ok(); t.si++; startStep(); }, reduce?150:550);
  }else render();
}
function press(k){
  const st=curStep(); if(!st||st.kind!=='num'||(S.t&&S.t.explaining)) return;
  if(k==='del') S.kp=S.kp.slice(0,-1);
  else if(k==='go'){ submit(); return; }
  else if(S.kp.length<2) S.kp=(S.kp==='0'?'':S.kp)+k;
  AU.sfx.key(); render();
}
function submit(){
  const t=S.t, st=curStep(); if(!t||!st||st.kind!=='num'||S.busy||S.kp==='') return;
  const v=parseInt(S.kp,10); S.kp='';
  if(S.diag){ diagAnswer(v===st.ans); return; }
  hook('answer',t,st,v===st.ans,v);
  if(v===st.ans){
    AU.sfx.ok(); E.clearH(t); t.msg=E.pick(PH.praise); t.msgT='ok'; t.wr=0; stopFlash(); t.covered=false;
    if(st.ok) st.ok(); t.si++; t.heard=false; t.hintChain='';
    if(t.si>=t.steps.length) finishTask(); else { AU.say(t.msg, {onend:()=>{}}); startStep(); }
  }else{
    AU.sfx.no(); t.clean=false; t.wr++; E.clearH(t);
    if(t.wr===2 && st.ex){ t.msg=null; runExplain(); return; }
    const lv=Math.min(t.wr,2); t.msg=st.hint(lv); t.msgT=lv===2?'reveal':'no'; render(); AU.say(t.msg);
  }
}
function dayRec(p){ const d=today(); if(!p.days[d]) p.days[d]={tasks:0,clean:0,secs:0,series:0,coins:0}; return p.days[d]; }
function finishTask(){
  const t=S.t, p=P(); t.done=true; stopFlash(); t.covered=false; t.show=t.show||t.skill!=='mix';
  S.results.push(t.clean);
  const st=p.skills[t.skill], d=dayRec(p);
  d.tasks++; d.secs+=Math.min(300, Math.round((Date.now()-t.startAt)/1000));
  let sayExtra=[];
  if(t.clean){ p.stars++; d.clean++; const c=DB.parent.coinsTask; p.coins+=c; d.coins+=c; S.earned+=c; t.coins=c; if(p.stars>=p.nextChestAt){ p.pendingChest++; p.nextChestAt+=10; } }
  else S.retry.push({skill:t.skill, item:t.item, due:S.count+3});
  if(t.o){ const k=t.item.key; if(!t.clean) p.hard[k]=Math.min((p.hard[k]||0)+2,4); else if(p.hard[k]){ p.hard[k]--; if(p.hard[k]<=0) delete p.hard[k]; } }
  S.notice=''; S.unlocked=null; S.say=null;
  if(t.ph===st.phase||t.skill==='mix'){
    st.hist.push(t.clean?1:0); if(st.hist.length>8) st.hist.shift();
    const last5=st.hist.slice(-5), last4=st.hist.slice(-4);
    if(last5.length>=5 && last5.reduce((a,b)=>a+b,0)>=4){
      if(st.phase<E.SK[t.skill].phases){ st.phase++; st.hist=[]; const ph = st.phase===2?PH.ui.phaseUp2:PH.ui.phaseUp3; S.notice=ph.text; S.say=ph; }
      else if(!st.done){
        st.done=true; st.hist=[];
        const nx=E.SKILLS[E.SK[t.skill].n];
        if(nx){ p.cur=nx.id; S.skill=nx.id; S.retry=[]; S.unlocked=nx.id; S.notice='<b>'+CH.HEROES[nx.id].name+'</b>Навык «'+E.SK[t.skill].title+'» освоен! Новый друг ждёт тебя на карте.'; S.say=PH.heroes[nx.id].unlock; }
        else { S.unlocked=t.skill; S.notice='<b>Все друзья собраны!</b>Все навыки освоены. Тренируйся в уме.'; S.say=PH.ui.allDone; }
      }
    }else if(st.phase>1 && last4.length===4 && last4.filter(x=>!x).length>=3){ st.phase--; st.hist=[]; S.notice=PH.ui.phaseDown.text; S.say=PH.ui.phaseDown; }
  }
  save(); hook('taskDone',t,p); render();
  if(t.clean) AU.sfx.coin();
  if(S.unlocked) AU.sfx.unlock();
  AU.say(t.msg, {onend:()=>{ if(S.say) AU.say(S.say); }});
}
function next(){ if(S.screen!=='task') return; S.count++; nextTask(); }
function endSession(){
  const p=P(), d=dayRec(p); d.series++;
  let bonus=0, lines=[];
  if(S.results.length && S.results.every(Boolean)){ bonus+=DB.parent.coinsSeries; lines.push('Серия без ошибок: +'+DB.parent.coinsSeries); }
  const td=today();
  if(p.streak.last!==td){
    const y=new Date(); y.setDate(y.getDate()-1); const yd=y.getFullYear()+'-'+String(y.getMonth()+1).padStart(2,'0')+'-'+String(y.getDate()).padStart(2,'0');
    p.streak.n = p.streak.last===yd ? p.streak.n+1 : 1; p.streak.last=td;
    bonus+=DB.parent.coinsDay; lines.push('Занятие сегодня: +'+DB.parent.coinsDay+(p.streak.n>1?' · '+p.streak.n+' дн. подряд':''));
  }
  p.coins+=bonus; d.coins+=bonus; S.earned+=bonus; S.bonusLines=lines; save();
  go('break'); AU.sfx.end(); AU.say(PH.ui.seriesDone, {onend:()=>{ AU.say(S.move); }});
}

/* ---------- проверка ---------- */
function startDiag(){ S.lessonLen=0; S.diag={i:0, list:E.diagList(), fail:null}; S.count=0; S.results=[]; S.notice=''; go('task'); AU.say(PH.ui.diagStart, {onend:()=>{}}); nextTask(); }
function diagAnswer(ok){
  const d=S.diag; S.results.push(ok); AU.sfx.key();
  if(!ok && !d.fail) d.fail=d.list[d.i].skill;
  d.i++;
  if(d.fail || d.i>=d.list.length){ finishDiag(); return; }
  nextTask();
}
function finishDiag(){
  const p=P(), fail=S.diag.fail, start=fail==='to10'?'see':(fail||'mix');
  const si=E.SKILLS.findIndex(s=>s.id===start);
  E.SKILLS.forEach((s,i)=>{ const st=p.skills[s.id]; if(i<si){ st.done=true; st.phase=s.phases; st.hist=[]; } else { st.done=false; st.phase=1; st.hist=[]; } });
  p.cur=start; p.diag=true; save();
  S.diag=null; S.t=null; S.diagStart=start;
  go('diagres'); AU.sfx.end(); AU.say(start==='mix'?PH.ui.diagPerfect:PH.ui.diagRes, {onend:()=>AU.say(PH.heroes[start].hello)});
}

/* ---------- сундучок и магазин ---------- */
function openChest(){
  const p=P(); if(!p.pendingChest) return;
  const owned=new Set(p.stickers); let pool=CH.STICKERS.map(s=>s[0]).filter(id=>!owned.has(id)); if(pool.length<3) pool=CH.STICKERS.map(s=>s[0]);
  S.chestOffer=E.shuffle(pool.slice()).slice(0,3); S.chestPicked=null; go('chest'); AU.sfx.chest(); AU.say(PH.ui.chest);
}
function pickSticker(id){ const p=P(); if(!S.chestOffer||S.chestPicked) return; S.chestPicked=id; p.stickers.push(id); p.pendingChest--; p.chestsOpened++; save(); AU.sfx.ok(); render(); }
function coinsFor(w){ return Math.max(1, Math.ceil(w.price/(DB.parent.rate||1))); }
function avgCoinsPerDay(p){ const ds=Object.keys(p.days).sort().slice(-7); const tot=ds.reduce((a,d)=>a+(p.days[d].coins||0),0); return ds.length? Math.max(5, tot/ds.length) : DB.parent.coinsTask*SESSION()+DB.parent.coinsDay; }
function buy(wid){
  const p=P(), w=DB.parent.wishes.find(x=>x.id===wid); if(!w) return;
  const need=coinsFor(w); if(p.coins<need) return;
  p.coins-=need; p.purchases.push({id:uid(), wishId:w.id, name:w.name, price:w.price, coins:need, at:today(), done:false, img:w.img||'', link:w.link||''});
  w.boughtBy=p.id; save(); AU.sfx.chest(); S.bought=w.id; render();
}

/* ---------- кабинет родителя ---------- */
function pinPress(k){
  if(k==='del'){ S.pinBuf=S.pinBuf.slice(0,-1); render(); return; }
  if(S.pinBuf.length>=4) return; S.pinBuf+=k; AU.sfx.key();
  if(S.pinBuf.length===4){
    const b=S.pinBuf; S.pinBuf='';
    if(S.pinStage==='set'){ S.pinFirst=b; S.pinStage='confirm'; }
    else if(S.pinStage==='confirm'){ if(b===S.pinFirst){ DB.parent.pin=b; save(); S.pinStage=null; go('parent'); return; } S.pinStage='set'; S.pinErr='Коды не совпали. Попробуйте ещё раз.'; }
    else { if(b===DB.parent.pin){ S.pinErr=''; go('parent'); return; } S.pinErr='Неверный код.'; AU.sfx.no(); }
  }
  render();
}
function openParent(){ S.pinBuf=''; S.pinErr=''; S.pinStage = DB.parent.pin ? null : 'set'; go('parentPin'); }
function resizeImage(file, cb){
  const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{ const m=320, k=Math.min(1, m/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k); c.getContext('2d').drawImage(img,0,0,c.width,c.height); cb(c.toDataURL('image/jpeg',0.72)); }; img.src=r.result; }; r.readAsDataURL(file);
}

/* ---------- представления ---------- */
const pal = CH.pal;
function topbar(){
  const p=P(); const home = S.screen!=='map';
  if(!home&&CH.mapHeader)return CH.mapHeader(p);
  let h='<header class="topbar'+(home?' inner':'')+'">';
  if(home) h+='<button type="button" class="iconbtn" data-act="map" aria-label="На карту"><svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/></svg></button>';
  else h+='<button type="button" class="avatar" data-act="profiles" aria-label="Сменить игрока">'+pal('avatar','', '', 'happy', p.color)+'<span>'+esc(p.name)+'</span></button>';
  const screenTitle={chest:'Наклейки',shop:'Магазин',parent:'Родителю',break:'Перерыв',diagres:'Проверка'}[S.screen];
  if(screenTitle)h+='<span class="screen-title">'+screenTitle+'</span>';
  h+='<span class="spacer"></span>';
  h+='<span class="pill"><span class="s">★</span>'+p.stars+'</span><span class="pill coin"><span class="c">●</span>'+p.coins+'</span>';
  if(!home && !CH.bottomNav){
    h+='<button type="button" class="iconbtn'+(p.pendingChest?' glow':'')+'" data-act="chest" aria-label="Сундучок"><svg viewBox="0 0 24 24"><path d="M3 9h18v10H3z"/><path d="M3 9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4"/><path d="M12 9v4"/></svg>'+(p.pendingChest?'<i class="badge">'+p.pendingChest+'</i>':'')+'</button>';
    h+='<button type="button" class="iconbtn" data-act="shop" aria-label="Магазин желаний"><svg viewBox="0 0 24 24"><path d="M4 8h16l-1.5 11h-13z"/><path d="M8 8a4 4 0 0 1 8 0"/></svg></button>';
    h+='<button type="button" class="iconbtn" data-act="parent" aria-label="Для родителя"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></button>';
  }
  return h+'</header>';
}
function frameHTML(f, fi, t){
  const st=curStep(), act=st&&st.kind==='act'&&!S.busy;
  const interactive=!!(act&&f.some((_,ci)=>st.can(fi,ci)));
  let h='<div class="terem" data-fi="'+fi+'" data-interactive="'+interactive+'"><img class="house-art" src="art/terem-frame.webp" alt="" aria-hidden="true"><div class="frame'+(t.covered?' covered':'')+'" role="group" aria-label="Теремок '+(fi+1)+'">';
  f.forEach((c,ci)=>{
    const cls='cell '+c.k+(c.lab&&(c.k==='a'||c.k==='b')?' n':'')+(c.h?' h':'')+(c.an?' '+c.an:'');
    const lab=c.lab?'<span class="lab">'+c.lab+'</span>':'';
    if(act&&st.can(fi,ci)) h+='<button type="button" class="'+cls+'" data-f="'+fi+'" data-c="'+ci+'" aria-label="Слаймик. Теремок '+(fi+1)+', комнатка '+(ci+1)+'">'+lab+'</button>';
    else h+='<div class="'+cls+'">'+lab+'</div>';
  });
  return h+'</div></div>';
}
function houseHTML(hs){ const [top,l,r]=hs; return '<div class="split" aria-label="'+top+' это '+l+' и '+r+'"><span class="bub top">'+top+'</span><svg viewBox="0 0 96 24" aria-hidden="true"><path d="M48 2 L18 22 M48 2 L78 22"/></svg><div class="bots"><span class="bub">'+l+'</span><span class="bub'+(r==='?'?' qm':'')+'">'+r+'</span></div></div>'; }
function keypadHTML(){
  const off=S.t&&S.t.explaining?' disabled':'';
  let h='<div class="display'+(S.kp===''?' empty':'')+'" aria-live="polite">'+(S.kp===''?'?':S.kp)+'</div><div class="keys">';
  [1,2,3,4,5,6,7,8,9].forEach(k=>{ h+='<button type="button" class="key" data-k="'+k+'"'+off+'>'+k+'</button>'; });
  h+='<button type="button" class="key del" data-k="del" aria-label="Стереть"'+off+'>⌫</button><button type="button" class="key" data-k="0"'+off+'>0</button><button type="button" class="key go" data-k="go"'+(S.kp===''||off?' disabled':'')+'>Готово</button>';
  return h+'</div>';
}
const ICON_SAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>';
const ICON_EAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9a5 5 0 0 1 10 0c0 3-3 3.5-3 6.5a2.5 2.5 0 0 1-5 0"/><path d="M10 9a2 2 0 0 1 4 0"/></svg>';
function viewTask(){
  const t=S.t; if(!t) return '<section class="card stage"></section>';
  const st=curStep(), sk=E.SK[t.skill];
  let h='<section class="card stage" data-kind="'+(st?st.kind:'done')+'">';
  if(S.diag) h+='<div class="meta"><span>Проверка</span><span>'+(S.diag.i+1)+' из '+S.diag.list.length+'</span></div>';
  else{
    let bar='<div class="bar" aria-label="Задание '+(S.count+1)+' из '+SESSION()+'">';
    for(let i=0;i<SESSION();i++) bar+='<i class="'+(i<S.results.length?(S.results[i]?'good':'meh'):(i===S.count?'cur':''))+'"></i>';
    bar+='</div>';
    h+='<div class="meta">'+bar+'<span>'+sk.n+' · '+sk.title+' · '+E.phaseName(t.skill,t.ph)+'</span></div>';
  }
  const instr = st ? ((t.covered&&st.instr2)?st.instr2:st.instr) : null;
  if(instr) h+='<div class="instr"><p>'+instr.text+'</p><button type="button" class="say" data-act="say" aria-label="Прочитать вслух">'+ICON_SAY+'</button></div>';
  if(t.story){ h+='<p class="story">'+t.story.text+'</p>'; if(t.done) h+='<div class="example small">'+t.big()+'</div>'; }
  else { const b=t.big(); if(b) h+='<div class="example">'+b+'</div>'; }
  h+='<div class="visual">';
  if(t.frames&&t.show) h+='<div class="frames'+(t.frames.length===1?' single':'')+(t.frames.length>1&&st&&st.kind==='act'?' tap':'')+'">'+t.frames.map((f,i)=>frameHTML(f,i,t)).join('')+(t.frames.length>1&&!t.explaining?pal(t.skill,'task-buddy',CH.HEROES[t.skill].name,t.done?'happy':t.wr?'think':'neutral'):'')+'</div>';
  if(st&&st.kind==='act'){ const inf=st.info?st.info():''; h+='<p class="info">'+(inf||'&nbsp;')+'</p>'; }
  if(t.flash&&t.covered&&st) h+='<button type="button" class="btn ghost small" data-act="peek">Показать ещё раз</button>';
  if(t.flash&&!t.covered&&t.flashStart&&st){ const left=Math.max(0,FLASH_MS()-(Date.now()-t.flashStart)); h+='<div class="timer" aria-hidden="true"><i style="animation-duration:'+FLASH_MS()+'ms;animation-delay:-'+(FLASH_MS()-left)+'ms"></i></div><button type="button" class="btn ghost small" data-act="cover">Запомнил!</button>'; }
  if(t.house) h+=houseHTML(t.house);
  if(t.done&&t.chain) h+='<div class="chain">'+t.chain+'</div>'; else if(!t.done&&t.hintChain) h+='<div class="chain">'+t.hintChain+'</div>';
  h+=hook('taskExtra',t);
  h+='</div><div class="ask">';
  if(S.diag) h+='<p class="msg muted">'+PH.ui.diag.text+'</p>';
  else if(t.explaining){ h+='<div class="explain" role="status">'+pal(t.skill,'talk')+'<div class="bubble"><p>'+t.exText+'</p></div></div><button type="button" class="linkbtn" data-act="exstop">Понятно, дальше сам</button>'; }
  else{
    h+= t.msg ? '<div class="say-row">'+pal(t.skill,'',null,t.msgT==='ok'?'happy':'think')+'<p class="msg '+t.msgT+'" id="msg">'+t.msg.text+(t.done&&t.coins?' <span class="coinget">+'+t.coins+' ●</span>':'')+'</p></div>' : '<p class="msg" id="msg">&nbsp;</p>';
    if(st&&st.kind==='num'&&st.ex&&t.wr>=1) h+='<button type="button" class="linkbtn" data-act="explain">'+ICON_EAR+(t.heard?'Послушать ещё раз':'Объясни мне')+'</button>';
  }
  if(t.done){
    if(S.unlocked) h+='<div class="unlock">'+pal(S.unlocked,'bob',null,'happy')+'<p>'+S.notice+'</p></div>'; else if(S.notice) h+='<p class="notice">'+S.notice+'</p>';
    h+='<button type="button" class="btn" data-act="next" id="nextBtn">'+(S.count<SESSION()-1?'Дальше →':'Готово →')+'</button>';
  }else if(st&&st.kind==='num'&&!t.explaining) h+=keypadHTML();
  return h+'</div></section>';
}
function viewStory(){
  const i=S.storyI, n=PH.story.length, line=PH.story[i];
  const moods=['','','','happy','','happy','happy'];
  return '<section class="card stage story-scene"><div class="endbox">'+pal('see','bob','Слаймик Бульк',moods[i])+'<p class="storytext">'+line.text+'</p><div class="dots">'+PH.story.map((_,j)=>'<i class="'+(j===i?'on':'')+'"></i>').join('')+'</div></div>'+
    '<div class="row"><button type="button" class="btn" data-act="storyNext">'+(i<n-1?'Дальше →':'Познакомиться!')+'</button>'+(i<n-1?'<button type="button" class="btn ghost" data-act="storySkip">Пропустить сказку</button>':'')+'</div></section>';
}
function viewNewProfile(){
  return '<section class="card stage"><div class="endbox form"><h2>Как тебя зовут?</h2>'+pal('avatar','bob','', 'happy', S.newColor)+
    '<input id="nameInput" class="input" type="text" maxlength="16" placeholder="Имя" value="'+esc(S.newName)+'" autocomplete="off">'+
    '<p class="muted">Выбери цвет своего слаймика</p><div class="swatches">'+CH.AVATARS.map(c=>'<button type="button" class="sw'+(c===S.newColor?' on':'')+'" style="--sw:'+c+'" data-act="color" data-color="'+c+'" aria-label="Цвет"></button>').join('')+'</div></div>'+
    '<div class="row"><button type="button" class="btn" data-act="createProfile">Готово</button>'+(DB.profiles.length?'<button type="button" class="btn ghost" data-act="profiles">Отмена</button>':'')+'</div></section>';
}
function viewProfiles(){
  let h='<section class="card stage"><div class="endbox form"><h2>Кто играет?</h2><div class="plist">';
  DB.profiles.forEach(p=>{ h+='<button type="button" class="prow'+(p.id===DB.active?' on':'')+'" data-act="pickProfile" data-id="'+p.id+'">'+pal('avatar','', '', 'happy', p.color)+'<span class="txt"><b>'+esc(p.name)+'</b><small>★ '+p.stars+' · ● '+p.coins+' · друзей '+E.SKILLS.filter(s=>p.skills[s.id].done).length+' из 7</small></span></button>'; });
  h+='</div></div><div class="row"><button type="button" class="btn ghost" data-act="addProfile">+ Новый игрок</button></div></section>';
  return h;
}
function viewMap(){
  const p=P(); const done=new Set(E.SKILLS.filter(s=>p.skills[s.id].done).map(s=>s.id)); const curN=E.SK[p.cur].n; const locked=new Set(E.SKILLS.filter(s=>s.n>curN&&!p.skills[s.id].done).map(s=>s.id));
  let h='<section class="mapwrap">'+CH.mapSVG({done, cur:p.cur, locked})+hook('mapExtra',p)+'</section>'+(CH.bottomNav?CH.bottomNav(p):'');
  if(S.island) h+=islandSheet(S.island);
  return h;
}
function islandSheet(id){
  const p=P(), s=E.SK[id], st=p.skills[id], H=CH.HEROES[id];
  const curN=E.SK[p.cur].n, locked=s.n>curN&&!st.done;
  let h='<div class="sheet-bg" data-act="closeIsland"></div><section class="card sheet"><button type="button" class="close" data-act="closeIsland" aria-label="Закрыть">✕</button>';
  h+='<div class="herohead">'+pal(id,'bob',H.name,st.done?'happy':undefined)+'<div class="txt"><p class="eyebrow">'+(st.done?'Освоено':(locked?'Пока закрыто':(id===p.cur?'Сейчас учимся':'')))+'</p><h2>'+s.n+' · '+s.title+'</h2><p class="muted">'+s.desc+'</p><p class="guide">'+H.name+'</p></div></div>';
  if(s.phases>1&&!locked){ h+='<div class="phasebar">'; E.PHASES.forEach((ph,i)=>{ const cls=st.done||i+1<st.phase?'past':(i+1===st.phase?'on':''); h+='<span class="'+cls+'">'+(cls==='past'?'✓ ':'')+ph+'</span>'; }); h+='</div>'; }
  if(locked){ const prev=E.SKILLS[s.n-2]; h+='<p class="notice">Сначала подружись с героем острова '+(s.n-1)+': '+CH.HEROES[prev.id].name+'.</p><button type="button" class="btn ghost" data-act="hello" data-id="'+id+'">Послушать, кто здесь живёт</button>'; }
  else{
    if(!p.diag&&id===p.cur) h+='<button type="button" class="btn" data-act="diag">Начать с проверки</button><button type="button" class="btn ghost" data-act="start" data-id="'+id+'">Без проверки · '+SESSION()+' заданий</button>';
    else h+='<button type="button" class="btn" data-act="start" data-id="'+id+'">'+(st.done?'Повторить':'Играть')+' · '+SESSION()+' заданий</button><button type="button" class="btn ghost" data-act="hello" data-id="'+id+'">'+H.name+', привет!</button>';
  }
  h+=hook('islandExtra',id);
  return h+'</section>';
}
function viewBreak(){
  const p=P(); const good=S.results.filter(Boolean).length;
  let stars=''; S.results.forEach((r,i)=>{ stars+=r?'<span class="on" style="animation-delay:'+(i*.08)+'s">★</span>':'<span class="off">★</span>'; });
  if(!S.move) S.move=E.pick(PH.moves);
  return '<section class="card stage"><div class="endbox">'+pal(S.skill||p.cur,'bob',null,'happy')+'<h2>Серия готова! Перерыв</h2><div class="bigstars">'+stars+'</div><p class="muted">Без ошибок: '+good+' из '+S.results.length+' · заработано <b>'+S.earned+' ●</b></p>'+(S.bonusLines&&S.bonusLines.length?'<p class="bonus">'+S.bonusLines.join('<br>')+'</p>':'')+'<p class="move">'+S.move.text+'</p></div>'+
    '<div class="row"><button type="button" class="btn" data-act="again">Ещё '+SESSION()+' заданий</button>'+hook('breakExtra',p)+'<button type="button" class="btn ghost" data-act="map">На карту</button></div></section>';
}
function viewDiagRes(){
  const s=E.SK[S.diagStart], H=CH.HEROES[S.diagStart];
  const msg=S.diagStart==='mix'?'Всё решено верно! Будем тренироваться в уме.':'Начнём с навыка «'+s.title+'». Всё, что до него, уже получается.';
  return '<section class="card stage"><div class="endbox">'+pal(S.diagStart,'bob',H.name,'happy')+'<h2>Проверка пройдена</h2><p>'+msg+'</p><p class="muted">Тебя встречает <b>'+H.name+'</b>.</p></div><div class="row"><button type="button" class="btn" data-act="start" data-id="'+S.diagStart+'">Играть: '+s.title+'</button><button type="button" class="btn ghost" data-act="map">На карту</button></div></section>';
}
function viewChest(){
  const p=P();
  let h='<section class="card stage"><div class="endbox">'+CH.chestSVG(!!(S.chestOffer&&!S.chestPicked));
  if(S.chestOffer&&!S.chestPicked){ h+='<h2>Сундучок открылся!</h2><p class="muted">Выбери одну наклейку</p><div class="offer">'+S.chestOffer.map(id=>'<button type="button" class="stk big" data-act="pick" data-id="'+id+'">'+CH.stickerSVG(id)+'<span>'+CH.stickerName(id)+'</span></button>').join('')+'</div>'; }
  else if(S.chestPicked){ h+='<h2>Наклейка твоя!</h2><div class="stk big on">'+CH.stickerSVG(S.chestPicked)+'<span>'+CH.stickerName(S.chestPicked)+'</span></div>'+(p.pendingChest?'<p class="muted">Есть ещё сундучок!</p>':''); }
  else { h+='<h2>Мои наклейки</h2><p class="muted">Сундучок открывается за каждые 10 звёзд. До следующего: '+Math.max(0,p.nextChestAt-p.stars)+' ★</p>'; }
  if(p.pendingChest&&(!S.chestOffer||S.chestPicked))h+='<button type="button" class="btn chest-open-action" data-act="openChest">Открыть сундучок ('+p.pendingChest+')</button>';
  if(!(S.chestOffer&&!S.chestPicked))h+='<div class="album">'+CH.STICKERS.map(s=>'<span class="stk'+(p.stickers.includes(s[0])?' on':' off')+'" role="img" aria-label="'+s[1]+(p.stickers.includes(s[0])?'. Есть в альбоме':'. Ещё не получено')+'">'+CH.stickerSVG(s[0])+'<span class="album-name" aria-hidden="true">'+s[1]+'</span></span>').join('')+'</div>';
  h+='</div><div class="row"><button type="button" class="btn ghost" data-act="map">На карту</button></div></section>';
  return h;
}
function viewShop(){
  const p=P(), ws=DB.parent.wishes.filter(w=>!w.boughtBy||w.boughtBy===p.id);
  let h='<section class="card stage shop"><h2 class="h">Магазин желаний</h2><p class="muted center">У тебя <b>'+p.coins+' ●</b>. Монетки дают задания без ошибок.</p>';
  if(!ws.length) h+='<p class="notice">Пока пусто. Попроси родителя добавить подарки в кабинете.</p>';
  h+='<div class="wishes">';
  ws.forEach(w=>{
    const need=coinsFor(w), bought=w.boughtBy===p.id, pct=Math.min(100,Math.round(p.coins/need*100)), can=p.coins>=need;
    const days=Math.ceil(Math.max(0,need-p.coins)/avgCoinsPerDay(p));
    h+='<div class="wish'+(bought?' bought':'')+'">'+(w.img?'<img src="'+esc(w.img)+'" alt="">':'<div class="noimg">'+CH.stickerSVG('star')+'</div>')+'<div class="wt"><b>'+esc(w.name)+'</b><span class="muted">'+need+' ● · '+w.price+' ₽</span>';
    if(bought) h+='<span class="tag">Куплено! Жди подарок</span>';
    else { h+='<div class="prog"><i style="width:'+pct+'%"></i></div><span class="muted small">'+(can?'Можно купить!':'ещё '+(need-p.coins)+' ● · примерно '+days+' '+PH.pl(days,['день','дня','дней'])+' занятий')+'</span>'; }
    h+='</div>'+(bought?'':'<button type="button" class="btn small'+(can?'':' ghost')+'" data-act="buy" data-id="'+w.id+'"'+(can?'':' disabled')+'>Купить</button>')+'</div>';
  });
  h+='</div><div class="row"><button type="button" class="btn ghost" data-act="map">На карту</button></div></section>';
  return h;
}
function viewPin(){
  const t = S.pinStage==='set' ? 'Придумайте код родителя' : S.pinStage==='confirm' ? 'Повторите код' : 'Код родителя';
  let h='<section class="card stage"><div class="endbox form"><h2>'+t+'</h2><p class="muted">'+(S.pinStage?'4 цифры. Код закрывает кабинет от ребёнка.':'Введите 4 цифры')+'</p><div class="pin">'+[0,1,2,3].map(i=>'<i class="'+(i<S.pinBuf.length?'on':'')+'"></i>').join('')+'</div>'+(S.pinErr?'<p class="msg no">'+S.pinErr+'</p>':'')+'<div class="keys pinkeys">'+[1,2,3,4,5,6,7,8,9].map(k=>'<button type="button" class="key" data-pin="'+k+'">'+k+'</button>').join('')+'<button type="button" class="key del" data-pin="del">⌫</button><button type="button" class="key" data-pin="0">0</button><span></span></div></div><div class="row"><button type="button" class="btn ghost" data-act="map">Отмена</button></div></section>';
  return h;
}
function viewParent(){
  const p=P(), tabs=[['stats','Успехи'],['wishes','Подарки'],['buy','Купить'],['settings','Настройки'],['profiles','Игроки']];
  let h='<section class="card stage parent"><nav class="tabs">'+tabs.map(([id,n])=>'<button type="button" class="tab'+(S.tab===id?' on':'')+'" data-act="tab" data-id="'+id+'">'+n+(id==='buy'&&p.purchases.filter(x=>!x.done).length?' <i class="badge">'+p.purchases.filter(x=>!x.done).length+'</i>':'')+'</button>').join('')+'</nav><div class="pane">';
  if(S.tab==='stats'){
    const days=Object.keys(p.days).sort(); const last=[]; for(let i=13;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); last.push([k,p.days[k]||{tasks:0,clean:0,secs:0}]); }
    const tot=days.reduce((a,k)=>{ const d=p.days[k]; a.t+=d.tasks; a.c+=d.clean; a.s+=d.secs; return a; },{t:0,c:0,s:0});
    const mx=Math.max(1,...last.map(x=>x[1].tasks));
    h+='<h3>'+esc(p.name)+'</h3><div class="stats"><div><b>'+tot.t+'</b><span>заданий</span></div><div><b>'+(tot.t?Math.round(tot.c/tot.t*100):0)+'%</b><span>без ошибок</span></div><div><b>'+Math.round(tot.s/60)+'</b><span>минут</span></div><div><b>'+p.streak.n+'</b><span>дней подряд</span></div></div>';
    h+='<h3>Последние 14 дней</h3><div class="chart" aria-label="Заданий по дням">'+last.map(([k,d])=>'<div class="col"><i style="height:'+Math.round(d.tasks/mx*100)+'%" title="'+k+': '+d.tasks+'"></i><span>'+k.slice(8)+'</span></div>').join('')+'</div>';
    h+='<h3>Навыки</h3><ul class="skl">'+E.SKILLS.map(s=>{ const st=p.skills[s.id]; return '<li><span>'+s.n+' · '+s.title+'</span><b>'+(st.done?'освоено':(s.id===p.cur?'сейчас · ':'')+E.phaseName(s.id,st.phase))+'</b></li>'; }).join('')+'</ul>';
    const hard=Object.keys(p.hard).filter(k=>p.hard[k]>0);
    h+='<h3>Трудные примеры</h3>'+(hard.length?'<div class="hardlist">'+hard.map(k=>'<span>'+k.replace('-',' − ').replace('+',' + ')+'</span>').join('')+'</div>':'<p class="muted">Пока нет.</p>');
    h+=hook('parentStats',p);
    h+='<h3>Как устроена программа</h3><ul class="help"><li><b>Лесенка из 7 навыков.</b> Через десяток не получится без трёх опор: состав 10, разбиение чисел, «13 — это 10 и 3». Проверка находит ступеньку с пробелом.</li><li><b>Три этапа:</b> руками (двигает слаймиков) → по картинке → в уме. 4 из 5 без ошибок — вперёд, 3 ошибки из 4 — шаг назад.</li><li><b>Ошибки:</b> первая — подсказка, вторая — разбор голосом, ответ ребёнок вводит сам. Пример возвращается через 3 задания.</li><li><b>Монетки:</b> '+DB.parent.coinsTask+' за задание без ошибок, +'+DB.parent.coinsSeries+' за серию без ошибок, +'+DB.parent.coinsDay+' за первое занятие в день.</li><li><b>Дома:</b> лоток для яиц на 10 ячеек и пуговицы двух цветов — те же действия, что на экране.</li></ul>';
  }else if(S.tab==='wishes'){
    h+='<h3>Подарки в магазине</h3><p class="muted">Курс: 1 монетка = '+DB.parent.rate+' ₽. Ребёнок видит цену в монетках и сколько дней осталось.</p>';
    const f=S.wishForm;
    if(f){ h+='<div class="wform"><input class="input" id="wName" placeholder="Название подарка" value="'+esc(f.name)+'" maxlength="40"><input class="input" id="wPrice" type="number" inputmode="numeric" placeholder="Цена, ₽" value="'+esc(f.price)+'"><input class="input" id="wLink" placeholder="Ссылка (Wildberries, Ozon…)" value="'+esc(f.link)+'"><label class="filebtn">'+(f.img?'<img src="'+esc(f.img)+'" alt="">':'')+'<span>'+(f.img?'Заменить фото':'Добавить фото')+'</span><input type="file" id="wImg" accept="image/*"></label><div class="row2"><button type="button" class="btn small" data-act="wishSave">Сохранить</button><button type="button" class="btn ghost small" data-act="wishCancel">Отмена</button></div></div>'; }
    else h+='<button type="button" class="btn small" data-act="wishNew">+ Добавить подарок</button>';
    h+='<div class="wlist">'+DB.parent.wishes.map(w=>'<div class="wrow">'+(w.img?'<img src="'+esc(w.img)+'" alt="">':'<div class="noimg small">'+CH.stickerSVG('star')+'</div>')+'<span class="txt"><b>'+esc(w.name)+'</b><small>'+w.price+' ₽ = '+coinsFor(w)+' ●'+(w.boughtBy?' · куплено':'')+'</small>'+(safeLink(w.link)?'<a href="'+esc(safeLink(w.link))+'" target="_blank" rel="noopener">Открыть ссылку</a>':'')+'</span><button type="button" class="iconbtn sm" data-act="wishEdit" data-id="'+w.id+'" aria-label="Изменить">✎</button><button type="button" class="iconbtn sm" data-act="wishDel" data-id="'+w.id+'" aria-label="Удалить">✕</button></div>').join('')+'</div>';
  }else if(S.tab==='buy'){
    const list=p.purchases.slice().reverse();
    h+='<h3>Нужно купить</h3><p class="muted">Ребёнок «купил» эти подарки за монетки. Купите и отметьте «Вручено».</p>';
    if(!list.length) h+='<p class="muted">Пока ничего.</p>';
    h+='<div class="wlist">'+list.map(x=>'<div class="wrow'+(x.done?' done':'')+'">'+(x.img?'<img src="'+esc(x.img)+'" alt="">':'<div class="noimg small">'+CH.stickerSVG('star')+'</div>')+'<span class="txt"><b>'+esc(x.name)+'</b><small>'+x.price+' ₽ · '+x.coins+' ● · '+x.at+'</small>'+(safeLink(x.link)?'<a href="'+esc(safeLink(x.link))+'" target="_blank" rel="noopener">Открыть ссылку и купить</a>':'')+'</span>'+(x.done?'<span class="tag">Вручено</span>':'<button type="button" class="btn small" data-act="given" data-id="'+x.id+'">Вручено</button>')+'</div>').join('')+'</div>';
  }else if(S.tab==='settings'){
    const sw=(k,label,desc)=>'<label class="switch"><span><b>'+label+'</b>'+(desc?'<small>'+desc+'</small>':'')+'</span><input type="checkbox" data-set="'+k+'"'+(DB.parent[k]?' checked':'')+'></label>';
    h+='<h3>Звук</h3>'+sw('voice','Озвучка заданий','Записанный голос читает задания')+sw('explain','Разбор голосом при ошибке','После второй ошибки герой объясняет по шагам')+sw('sfx','Звуковые эффекты')+sw('music','Фоновая музыка','Только на карте, не во время заданий');
    h+=hook('parentSettings');
    h+='<h3>Занятия</h3><label class="num"><span>Заданий в серии</span><input type="number" min="4" max="15" data-set="session" value="'+DB.parent.session+'"></label><label class="num"><span>Секунд на запоминание (навык 1)</span><input type="number" min="3" max="20" data-set="flash" value="'+DB.parent.flash+'"></label>';
    h+='<h3>Монетки</h3><label class="num"><span>1 монетка = … ₽</span><input type="number" min="0.1" step="0.1" data-set="rate" value="'+DB.parent.rate+'"></label><label class="num"><span>За задание без ошибок</span><input type="number" min="0" max="50" data-set="coinsTask" value="'+DB.parent.coinsTask+'"></label><label class="num"><span>За серию без ошибок</span><input type="number" min="0" max="100" data-set="coinsSeries" value="'+DB.parent.coinsSeries+'"></label><label class="num"><span>За первое занятие в день</span><input type="number" min="0" max="100" data-set="coinsDay" value="'+DB.parent.coinsDay+'"></label>';
    h+='<h3>Код родителя</h3><button type="button" class="btn ghost small" data-act="pinChange">Сменить код</button>';
    h+='<h3>О приложении</h3><a class="btn ghost small" href="licenses.html">Лицензии компонентов</a>';
    h+='<h3>Данные</h3><p class="muted">Всё хранится на этом устройстве. Можно сохранить копию и перенести на другой телефон.</p><div class="row2"><button type="button" class="btn ghost small" data-act="export">Скопировать резервную копию</button><label class="btn ghost small filelbl">Загрузить копию<input type="file" id="importFile" accept=".json,application/json"></label></div><textarea id="exportBox" class="input" aria-label="Резервная копия" rows="3"'+(S.exportData?'':' hidden')+'>'+esc(S.exportData||'')+'</textarea>';
  }else if(S.tab==='profiles'){
    h+='<h3>Игроки</h3><div class="wlist">'+DB.profiles.map(x=>'<div class="wrow">'+pal('avatar','','', 'happy', x.color)+'<span class="txt"><b>'+esc(x.name)+'</b><small>★ '+x.stars+' · ● '+x.coins+' · с '+x.created+'</small></span>'+(S.confirm==='del'+x.id?'<button type="button" class="btn small danger" data-act="profDelYes" data-id="'+x.id+'">Удалить</button><button type="button" class="btn ghost small" data-act="confirmNo">Нет</button>':'<button type="button" class="iconbtn sm" data-act="profDel" data-id="'+x.id+'" aria-label="Удалить">✕</button>')+'</div>').join('')+'</div>';
    h+='<button type="button" class="btn ghost small" data-act="addProfile">+ Новый игрок</button>';
    h+='<h3>Сброс прогресса</h3>'+(S.confirm==='reset'?'<div class="row2"><button type="button" class="btn small danger" data-act="resetYes">Да, сбросить у '+esc(p.name)+'</button><button type="button" class="btn ghost small" data-act="confirmNo">Отмена</button></div>':'<button type="button" class="btn ghost small" data-act="reset">Сбросить прогресс '+esc(p.name)+'</button>');
  }
  h+='</div><div class="row"><button type="button" class="btn ghost" data-act="map">Закрыть кабинет</button></div></section>';
  return h;
}

function render(){
  const app=$('#app'); let h='';
  const views={task:viewTask, story:viewStory, newProfile:viewNewProfile, profiles:viewProfiles, map:viewMap, break:viewBreak, diagres:viewDiagRes, chest:viewChest, shop:viewShop, parentPin:viewPin, parent:viewParent};
  const tb = ['story','newProfile','profiles','parentPin'].includes(S.screen) ? (CH.brandStrip?CH.brandStrip():'') : topbar();
  h = tb + (views[S.screen]||EXT.views[S.screen]||viewMap)();
  if(S.toast) h+='<div class="toast">'+S.toast+'</div>';
  app.innerHTML=h;
  document.body.dataset.screen=S.screen;
  document.body.classList.toggle('map-bg', S.screen==='map');
  if(S.t&&S.t.frames) S.t.frames.forEach(f=>f.forEach(c=>{ c.an=''; }));
  const nb=$('#nextBtn'); if(nb) nb.focus({preventScroll:true});
  const ni=$('#nameInput'); if(ni && !S.newName) ni.focus({preventScroll:true});
}

/* ---------- события ---------- */
document.addEventListener('pointerdown', ()=>AU.unlock(), {once:true, passive:true});
$('#app').addEventListener('click', e=>{
  const cell=e.target.closest('[data-f]'); if(cell){ onCell(+cell.dataset.f,+cell.dataset.c); return; }
  const key=e.target.closest('[data-k]'); if(key){ press(key.dataset.k); return; }
  const pk=e.target.closest('[data-pin]'); if(pk){ pinPress(pk.dataset.pin); return; }
  const isl=e.target.closest('[data-isl]'); if(isl){ S.island=isl.dataset.isl; AU.sfx.plop(); render(); return; }
  const a=e.target.closest('[data-act]'); if(!a) return;
  const act=a.dataset.act, id=a.dataset.id, p=P();
  if(EXT.acts[act]){ EXT.acts[act](a,id,p); return; }
  switch(act){
    case 'map': go('map',{island:null}); break;
    case 'closeIsland': S.island=null; render(); break;
    case 'start': S.island=null; startSession(id||p.cur); break;
    case 'diag': S.island=null; startDiag(); break;
    case 'hello': AU.say(PH.heroes[id].hello, {force:true}); break;
    case 'next': next(); break;
    case 'again': S.move=null; S.bonusLines=null; startSession(S.skill||p.cur); break;
    case 'peek': startFlash(); break;
    case 'cover': if(S.t&&S.t.flash) coverNow(S.t); break;
    case 'say': { if(EX&&S.t&&S.t.explaining){ speakExplainBeat(EX.tok,true); break; } const st=curStep(); if(st) AU.say((S.t.covered&&st.instr2)?st.instr2:st.instr, {force:true}); break; }
    case 'explain': runExplain(); break;
    case 'exstop': stopExplain(); AU.duck(false); S.t.msg=PH.ui.typeNow; S.t.msgT='reveal'; render(); break;
    case 'chest': go('chest',{chestOffer:null,chestPicked:null}); if(p.pendingChest) openChest(); break;
    case 'openChest': openChest(); break;
    case 'pick': pickSticker(id); break;
    case 'shop': go('shop',{bought:null}); break;
    case 'buy': buy(id); break;
    case 'parent': openParent(); break;
    case 'tab': S.tab=id; S.confirm=null; render(); break;
    case 'profiles': go('profiles'); break;
    case 'pickProfile': DB.active=id; save(); go('map',{island:null}); AU.say(PH.ui.welcome); break;
    case 'addProfile': S.newName=''; S.newColor=CH.AVATARS[DB.profiles.length%CH.AVATARS.length]; go('newProfile'); break;
    case 'color': { const ni=$('#nameInput'); if(ni) S.newName=ni.value; S.newColor=a.dataset.color; render(); break; }
    case 'createProfile': { const ni=$('#nameInput'); const name=(ni?ni.value:'').trim()||'Игрок'; const np=newProfile(name,S.newColor); DB.profiles.push(np); DB.active=np.id; DB.seenStory=true; save(); go('map',{island:'see'}); AU.say(PH.heroes.see.hello); break; }
    case 'storyNext': if(S.storyI<PH.story.length-1){ S.storyI++; render(); AU.say(PH.story[S.storyI]); } else { DB.seenStory=true; save(); S.newName=''; go('newProfile'); } break;
    case 'storySkip': DB.seenStory=true; save(); go('newProfile'); break;
    case 'wishNew': S.wishForm={id:null,name:'',price:'',link:'',img:''}; render(); break;
    case 'wishEdit': { const w=DB.parent.wishes.find(x=>x.id===id); S.wishForm=Object.assign({},w); render(); break; }
    case 'wishCancel': S.wishForm=null; render(); break;
    case 'wishSave': { const f=S.wishForm; f.name=($('#wName').value||'').trim(); f.price=parseFloat($('#wPrice').value)||0; f.link=($('#wLink').value||'').trim(); if(!f.name||!Number.isFinite(f.price)||f.price<=0){ toast('Укажите название и цену.'); return; } if(f.id){ const w=DB.parent.wishes.find(x=>x.id===f.id); Object.assign(w,{name:f.name,price:f.price,link:f.link,img:f.img}); } else DB.parent.wishes.push({id:uid(),name:f.name,price:f.price,link:f.link,img:f.img}); S.wishForm=null; save(); render(); break; }
    case 'wishDel': DB.parent.wishes=DB.parent.wishes.filter(x=>x.id!==id); save(); render(); break;
    case 'given': { const x=p.purchases.find(y=>y.id===id); if(x) x.done=true; save(); render(); break; }
    case 'pinChange': S.pinStage='set'; S.pinBuf=''; S.pinErr=''; go('parentPin'); break;
    case 'export': { S.exportData=JSON.stringify(DB); render(); const box=$('#exportBox'); box.select(); try{ navigator.clipboard.writeText(box.value).then(()=>toast('Копия скопирована. Вставьте её в заметки или письмо.')).catch(()=>toast('Выделите текст и скопируйте вручную.')); }catch(e){ toast('Выделите текст и скопируйте вручную.'); } break; }
    case 'profDel': S.confirm='del'+id; render(); break;
    case 'profDelYes': DB.profiles=DB.profiles.filter(x=>x.id!==id); if(DB.active===id) DB.active=DB.profiles.length?DB.profiles[0].id:null; S.confirm=null; save(); if(!DB.profiles.length){ go('newProfile'); } else render(); break;
    case 'confirmNo': S.confirm=null; render(); break;
    case 'reset': S.confirm='reset'; render(); break;
    case 'resetYes': { const np=newProfile(p.name,p.color); np.id=p.id; const i=DB.profiles.findIndex(x=>x.id===p.id); DB.profiles[i]=np; S.confirm=null; save(); render(); break; }
  }
});
function validBackup(s){
  const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
  if(!obj(s)||s.v!==3||!Array.isArray(s.profiles)||s.parent!=null&&!obj(s.parent))return false;
  if(Object.prototype.hasOwnProperty.call(s,'__proto__')||s.parent&&Object.prototype.hasOwnProperty.call(s.parent,'__proto__'))return false;
  const ids=new Set();for(const p of s.profiles){
    if(!obj(p)||typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.name!=='string'||typeof p.color!=='string'||!obj(p.skills)||!Array.isArray(p.stickers)||!p.stickers.every(x=>typeof x==='string')||!Array.isArray(p.purchases)||!p.purchases.every(x=>obj(x)&&typeof x.id==='string'&&typeof x.name==='string'&&Number.isFinite(x.coins))||!obj(p.days)||!Object.values(p.days).every(obj)||!obj(p.hard)||!obj(p.streak))return false;
    ids.add(p.id);if(!E.SK[p.cur]||!['stars','coins','pendingChest','chestsOpened','nextChestAt'].every(k=>Number.isFinite(p[k])&&p[k]>=0))return false;
    if(!E.SKILLS.every(sk=>{const st=p.skills[sk.id];return st&&Number.isInteger(st.phase)&&st.phase>=1&&st.phase<=sk.phases&&Array.isArray(st.hist)&&typeof st.done==='boolean';}))return false;
  }
  return (!s.active||ids.has(s.active))&&(!s.parent||!s.parent.wishes||Array.isArray(s.parent.wishes)&&s.parent.wishes.every(w=>obj(w)&&typeof w.id==='string'&&typeof w.name==='string'&&Number.isFinite(w.price)))&&root.TEREM_FULL_TRANSFER.safeMain(s);
}
$('#app').addEventListener('change', e=>{
  const set=e.target.dataset.set;
  if(set){ const v = e.target.type==='checkbox' ? e.target.checked : parseFloat(e.target.value); if(e.target.type!=='checkbox' && (!Number.isFinite(v)||!e.target.checkValidity())){e.target.value=DB.parent[set];return;} DB.parent[set]=v; save(); applySettings(); return; }
  if(e.target.id==='wImg' && e.target.files[0]){ resizeImage(e.target.files[0], url=>{ if(S.wishForm){ const n=$('#wName'), pr=$('#wPrice'), l=$('#wLink'); S.wishForm.name=n.value; S.wishForm.price=pr.value; S.wishForm.link=l.value; S.wishForm.img=url; render(); } }); return; }
  if(e.target.id==='importFile' && e.target.files[0]){ const r=new FileReader(); r.onload=()=>{ try{ const s=JSON.parse(r.result); if(validBackup(s)){ DB=Object.assign(defaults(),s); DB.parent=Object.assign(defaults().parent,s.parent||{}); if(!DB.active&&DB.profiles.length)DB.active=DB.profiles[0].id; save(); applySettings(); go(DB.profiles.length?'map':'newProfile',{island:null}); toast('Копия загружена.'); } else toast('Это не файл копии.'); }catch(err){ toast('Не удалось прочитать файл.'); } }; r.readAsText(e.target.files[0]); }
});
$('#app').addEventListener('keydown', e=>{ if(e.target.id==='nameInput' && e.key==='Enter'){ e.preventDefault(); $('[data-act="createProfile"]').click(); } });
document.addEventListener('keydown', e=>{
  if(e.target.closest && e.target.closest('input,textarea,summary')) return;
  if(S.screen==='task'){ if(/^[0-9]$/.test(e.key)){ e.preventDefault(); press(e.key); } else if(e.key==='Backspace'){ e.preventDefault(); press('del'); } else if(e.key==='Enter'){ if(S.t&&S.t.done){ e.preventDefault(); next(); } else if(curStep()&&curStep().kind==='num'){ e.preventDefault(); press('go'); } } }
  else if(S.screen==='parentPin'){ if(/^[0-9]$/.test(e.key)) pinPress(e.key); else if(e.key==='Backspace') pinPress('del'); }
  else if(S.screen==='map' && e.key==='Enter'){ const el=document.activeElement; if(el&&el.dataset&&el.dataset.isl){ S.island=el.dataset.isl; render(); } }
});

/* ---------- запуск ---------- */
applySettings();
const BASE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/js\/app\.js.*$/,'') : '';
AU.init(BASE).then(()=>{});
if(!DB.profiles.length){ S.screen = DB.seenStory ? 'newProfile' : 'story'; S.storyI=0; render(); if(S.screen==='story') setTimeout(()=>AU.say(PH.story[0]), 300); }
else { if(!DB.active) DB.active=DB.profiles[0].id; S.screen='map'; render(); }
root.__app = {S, get DB(){return DB}, P, curStep, render, go, startSession, E, save, toast, validBackup};
/* Optional spoken input uses exactly the same lesson actions as the keypad. */
root.__app.voice={
 answer(n){ if(S.screen!=='task'||S.diag||S.busy||S.t?.explaining||curStep()?.kind!=='num'||!Number.isInteger(n)||n<0||n>20)return false;S.kp=String(n);submit();return true; },
 command(name){
  if(S.screen!=='task'||S.diag||S.busy)return false;
  if(name==='next'&&S.t?.done){next();return true;}
  // A requested explanation reveals the answer: keep original assisted scoring,
  // without inventing a wrong answer or changing the existing reward rules.
  if(name==='help'&&curStep()?.ex&&!S.t?.explaining){S.t.clean=false;runExplain();return true;}
  if(name==='repeat'){if(EX&&S.t?.explaining)speakExplainBeat(EX.tok,true);else{const st=curStep();if(!st)return false;AU.say((S.t.covered&&st.instr2)?st.instr2:st.instr,{force:true});}return true;}
  return false;
 }
};
})(window);

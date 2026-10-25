/* «Фонарики теремка» — разговорный урок с Бульком.
   Три настоящих задания текущего навыка ребёнка по исходной методике (руки → картинка → ум).
   Ребёнок сам выбирает: говорить или нажимать. Голос распознаётся только на устройстве
   (js/voice-asr.js), число всегда переспрашивается, и лишь после «да» уходит в исходный submit.
   Неразборчивая речь — не ошибка. Кнопки работают всегда. Ни звук, ни расшифровки не сохраняются. */
(function(root){
'use strict';
const EXT=root.__ext, AU=root.AUDIO, LP=root.LP, ASR=root.TEREM_ASR, CH=root.CH;
const VKEY='terem_voice_v1';           // только настройка взрослого; согласие ребёнка не хранится
const LESSON_LEN=3;
let a=null, appEl=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduce=root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- настройка взрослого ---------- */
function vs(){ try{ return Object.assign({allowed:false},JSON.parse(localStorage.getItem(VKEY)||'{}')); }catch(e){ return {allowed:false}; } }
function vsSave(o){ try{ localStorage.setItem(VKEY,JSON.stringify(o)); }catch(e){} }
let model={status:'unknown', progress:0, error:''};
const modelAvailable=()=>model.status==='cached'||model.status==='bundled';
function refreshModel(){ if(!ASR){ model.status='nosupport'; return Promise.resolve(); } return ASR.status().then(s=>{ if(model.status!=='downloading') model.status=s; }); }

/* ---------- состояние урока (только в памяти) ---------- */
const L={on:false, mode:null, lit:[false,false,false], helped:[false,false,false], phase:'off', pending:null, misses:0, silences:0,
         task:null, step:-1, done:false, pausedStep:false, tok:0, line:null, log:[], doneHandled:-1, chapterSaid:-1, sayItOnce:false, micError:''};
function resetLesson(){ Object.assign(L,{on:false, mode:null, lit:[false,false,false], helped:[false,false,false], phase:'off', pending:null, misses:0, silences:0, task:null, step:-1, done:false, pausedStep:false, line:null, doneHandled:-1, chapterSaid:-1, sayItOnce:false, micError:''}); L.tok++; }
function logTurn(o){ L.log.push(Object.assign({t:Date.now()},o)); if(L.log.length>60) L.log.shift(); }

const speaking=()=>!!AU.cur||!!(root.COMPANION&&root.COMPANION.phrase)||!!(root.speechSynthesis&&root.speechSynthesis.speaking);
function say(ph,cb){ const tok=L.tok; L.line=ph; paint(a&&a.S.screen==='talk'); AU.say(ph,{force:true,onend:()=>{ if(tok===L.tok&&cb) cb(); }}); }
function chain(list,cb){ const tok=L.tok; const go=i=>{ if(tok!==L.tok) return; if(i>=list.length){ cb&&cb(); return; } say(list[i],()=>go(i+1)); }; go(0); }

/* ---------- микрофон ---------- */
function micStop(){ if(ASR){ ASR.cancel(); ASR.close(); } }
function endVoice(text){ L.tok++; micStop(); if(L.mode==='voice'){ L.mode='buttons'; } L.phase='off'; L.pending=null; if(text) L.micError=text; paint(a&&a.S.screen==='talk'); }

/* ---------- экран-вступление ---------- */
function lantern(on,i){
  return '<svg class="lantern'+(on?' lit':'')+'" viewBox="0 0 40 64" aria-label="Фонарик '+(i+1)+(on?' горит':' не горит')+'" role="img"><path class="hook" d="M20 0v8"/><path class="cap" d="M11 10h18l-3 6H14z"/><rect class="glass" x="10" y="16" width="20" height="30" rx="7"/><path class="flame" d="M20 23c4 5 5 8 5 11a5 5 0 0 1-10 0c0-3 1-6 5-11z"/><path class="cap" d="M13 46h14l2 5H11z"/></svg>';
}
function lanterns(){ return '<div class="lanterns" aria-label="Фонарики теремка">'+L.lit.map((x,i)=>lantern(x,i)).join('')+'</div>'; }
function viewTalk(){
  const v=vs(), canVoice=v.allowed&&modelAvailable();
  let h='<section class="card stage talk"><div class="talk-scene">'+lanterns()+CH.pal('see','talk-hero','Слаймик Бульк',L.phase==='ready'?'happy':'neutral')+'</div>';
  h+='<div class="talk-bubble" role="status"><p>'+(L.line?L.line.text:LP.ui.hi.text)+'</p><button type="button" class="say" data-act="talkRepeat" aria-label="Послушать ещё раз"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg></button></div>';
  if(L.phase==='warmup'||L.phase==='micStart'||L.phase==='warmThinking'||L.phase==='listening'){
    h+=panelHTML();
  }else if(canVoice){
    h+='<div class="talk-choice"><button type="button" class="btn talk-voice" data-act="talkVoice">'+MIC+'Хочу говорить</button><button type="button" class="btn talk-keys" data-act="talkKeys">'+KEYS+'Буду кнопками</button></div>';
    h+='<p class="talk-note">Микрофон включится только после твоего выбора. Его можно выключить в любой момент.</p>';
  }else{
    h+='<div class="talk-choice one"><button type="button" class="btn" data-act="talkKeys">Начать · '+LESSON_LEN+' задания</button></div>';
    h+='<p class="talk-note">Отвечать голосом можно, если взрослый включит это в кабинете родителя → Настройки.</p>';
  }
  if(L.micError) h+='<p class="talk-note warn">'+esc(L.micError)+'</p>';
  return h+'</section>';
}
const MIC='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8"/></svg>';
const KEYS='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 10h1M11 10h2M16 10h1M7 14h10"/></svg>';

function openTalk(){
  if(!a.P()) return;
  resetLesson(); L.on=true; L.phase='intro';
  a.go('talk');
  const tok=L.tok;
  refreshModel().then(()=>{
    if(tok!==L.tok||!L.on||a.S.screen!=='talk') return;
    paint(true);
    const v=vs(), canVoice=v.allowed&&modelAvailable();
    if(canVoice){ ASR.prepare().catch(()=>{}); chain([LP.ui.hi,LP.ui.choose]); } else say(LP.ui.hi);
  });
}

/* ---------- старт урока ---------- */
function startLesson(){
  L.phase='idle'; L.chapterSaid=-1; L.doneHandled=-1;
  const p=a.P(); a.startSession(p.cur, LESSON_LEN);
}
async function chooseVoice(){
  if(L.phase!=='intro'&&L.phase!=='off') return;
  if(!vs().allowed||!modelAvailable()) return;
  L.mode='voice'; L.phase='micStart'; L.micError=''; AU.stop(); paint(true);
  const tok=++L.tok;
  try{
    await ASR.prepare();
    if(tok!==L.tok) return;
    await ASR.open();
    if(tok!==L.tok){ micStop(); return; }
  }catch(e){
    if(tok!==L.tok) return;
    L.mode=null; L.phase='intro'; micStop();
    L.micError=/NotAllowed|Permission|denied/i.test(String(e&&(e.name||e.message)))?'Микрофон не разрешён. Можно играть кнопками — это тоже здорово.':'Голос сейчас не включился. Можно играть кнопками.';
    paint(true); say(LP.ui.buttons); return;
  }
  // разминка: Бульк просит сказать «да» — проверка, что он слышит, ещё до математики
  L.phase='warmup'; L.misses=0; paint(true);
  say(LP.ui.micOn,()=>warmListen());
}
function warmListen(){
  const tok=L.tok; if(L.phase!=='warmup') return;
  L.listenState='confirm'; L.phase='listening'; paint(true);
  ASR.listen('confirm',{timeout:9000,onSpeech:()=>{},onThinking:()=>{ if(tok===L.tok){ L.phase='warmThinking'; paint(true); } }}).then(r=>{
    if(tok!==L.tok) return;
    const k=r.intent.kind; logTurn({where:'warmup',kind:k,value:r.intent.value});
    if(k==='cancelled') return;
    L.phase='warmup';
    if(k==='confirm'||k==='next'){ say(LP.ui.micTest,()=>startLesson()); return; }
    if(k==='stop'||k==='reject'){ endVoice(); say(LP.ui.buttons,()=>startLesson()); return; }
    L.misses++;
    if(L.misses>=2){ endVoice(); say(LP.ui.tryButtons,()=>startLesson()); return; }
    say(k==='silence'?LP.ui.quiet:LP.ui.again,()=>warmListen());
  });
}
function chooseKeys(){
  if(!L.on) return;
  L.tok++; micStop(); L.mode='buttons'; L.phase='idle'; AU.stop();
  say(LP.ui.buttons,()=>startLesson());
}

/* ---------- панель разговора на экране задания ---------- */
function panelHTML(){
  const ph=L.phase;
  let h='<section class="talk-panel" data-state="'+ph+'" aria-label="Разговор с Бульком">';
  if(ph==='listening') h+='<p class="talk-state" role="status"><i class="dot" aria-hidden="true"></i>Слушаю…</p>';
  else if(ph==='thinking'||ph==='warmThinking') h+='<p class="talk-state" role="status">Думаю…</p>';
  else if(ph==='micStart') h+='<p class="talk-state" role="status">Включаю микрофон…</p>';
  else if(ph==='confirm'&&L.pending!==null) h+='<p class="talk-heard">Ты сказал <b>'+L.pending+'</b>?</p>';
  else if(ph==='paused') h+='<p class="talk-state">Можно сказать ещё раз или нажать цифры.</p>';
  else h+='<p class="talk-state" role="status">'+(speaking()?'Бульк говорит…':'Можно ответить голосом')+'</p>';
  h+='<div class="talk-buttons">';
  if(ph==='confirm') h+='<button type="button" class="btn small" data-act="talkYes">Да</button><button type="button" class="btn ghost small" data-act="talkNo">Нет</button>';
  if(a.S.screen==='talk'&&(ph==='warmup'||ph==='listening'||ph==='warmThinking')) h+='<button type="button" class="btn small" data-act="talkReady">Да, готов</button>';
  if(ph==='paused') h+='<button type="button" class="btn small" data-act="talkListen">'+MIC+'Сказать голосом</button>';
  h+='<button type="button" class="linkbtn talk-off" data-act="talkOff">Выключить микрофон</button>';
  return h+'</div></section>';
}
function strip(){
  const n=Math.min(a.S.count,LESSON_LEN-1);
  return '<div class="talk-strip">'+lanterns()+'<span>Фонарики теремка · '+(n+1)+' из '+LESSON_LEN+'</span></div>';
}
function lessonTask(){ return L.on&&a.S.screen==='task'&&!a.S.diag&&a.S.lessonLen===LESSON_LEN&&!!a.S.t; }
let painting=false;
function paint(full){
  if(!a||painting) return;
  if(a.S.screen==='talk'){ if(full){ painting=true; a.render(); painting=false; } return; }
  if(!lessonTask()) return;
  const stage=appEl.querySelector('.stage'); if(!stage) return;
  if(!stage.querySelector('.talk-strip')) stage.insertAdjacentHTML('afterbegin',strip());
  else { const s=stage.querySelector('.talk-strip'); const tmp=document.createElement('div'); tmp.innerHTML=strip(); if(s.innerHTML!==tmp.firstChild.innerHTML) s.replaceWith(tmp.firstChild); }
  const ask=stage.querySelector('.ask'); let pn=stage.querySelector('.talk-panel');
  if(L.mode!=='voice'){ if(pn) pn.remove(); return; }
  if(!ask) return;
  const html=panelHTML();
  if(!pn){ ask.insertAdjacentHTML('afterbegin',html); }
  else if(pn.outerHTML!==html){ const tmp=document.createElement('div'); tmp.innerHTML=html; pn.replaceWith(tmp.firstChild); }
  appEl.querySelectorAll('.companion-portrait').forEach(el=>{ el.dataset.listening=String(L.phase==='listening'); });
}

/* ---------- ход разговора на задании ---------- */
function curNum(){ const st=a.curStep(); return !!st&&st.kind==='num'&&!a.S.t.explaining&&!a.S.busy; }
function listenTurn(state){
  if(L.mode!=='voice'||!ASR||!ASR.micOpen) return;
  const tok=++L.tok, t=a.S.t, si=t.si;
  L.phase='listening'; L.listenState=state; paint();
  ASR.listen(state==='next'?'confirm':state,{timeout:9000,reject:state==='answer'?6:4.5,onThinking:()=>{ if(tok===L.tok){ L.phase='thinking'; paint(); } }}).then(r=>{
    if(tok!==L.tok) return;
    if(a.S.t!==t||t.si!==si&&!t.done){ L.phase='idle'; paint(); return; }
    handle(r.intent,state);
  });
}
function relisten(state){ if(L.mode==='voice') listenTurn(state); }
function handle(intent,state){
  const k=intent.kind; logTurn({where:state,kind:k,value:intent.value,step:a.S.t.si,count:a.S.count});
  if(k==='cancelled') return;
  if(k==='unavailable'){ endVoice('Микрофон отключился. Отвечай кнопками.'); return; }
  if(k==='stop'){ L.tok++; endVoice(); say(LP.ui.micOff); return; }
  const t=a.S.t;
  if(state==='next'){
    if(k==='confirm'||k==='next'){ L.phase='idle'; paint(); a.voice.command('next'); return; }
    if(k==='repeat'){ say(LP.ui.goOn,()=>relisten('next')); return; }
    L.phase='paused'; L.pausedStep=true; paint(); return;
  }
  if(k==='repeat'){ L.phase='speaking'; paint(); const st=a.curStep(); if(!st){ return; } const tok=L.tok; a.voice.command('repeat'); waitQuiet(tok,()=>relisten('answer')); return; }
  if(k==='help'){
    const st=a.curStep();
    L.pending=null;
    if(st&&st.ex){ L.helped[Math.min(a.S.count,2)]=true; L.phase='speaking'; paint(); a.voice.command('help'); return; }   // разбор: clean=false, ошибок не добавляет
    say(LP.ui.helpNoEx,()=>{ const tok=L.tok; a.voice.command('repeat'); waitQuiet(tok,()=>relisten('answer')); }); return;
  }
  if(k==='number'&&curNum()){ L.pending=intent.value; L.misses=0; L.silences=0; L.phase='confirm'; paint(); say(LP.heard(intent.value),()=>relisten('confirm')); return; }
  if(state==='confirm'&&L.pending!==null){
    if(k==='confirm'){ submitPending(); return; }
    if(k==='reject'){ L.pending=null; L.phase='speaking'; paint(); say(LP.ui.sayAgain,()=>relisten('answer')); return; }
  }
  // не расслышали — это не ошибка в задании
  if(k==='silence') L.silences++; else L.misses++;
  if(L.misses+L.silences>=3){ L.phase='paused'; L.pausedStep=true; paint(); say(LP.ui.tryButtons); return; }
  const line=state==='confirm'?LP.ui.yesNo:(k==='silence'?LP.ui.quiet:LP.ui.again);
  L.phase='speaking'; paint(); say(line,()=>relisten(state==='confirm'&&L.pending!==null?'confirm':'answer'));
}
function submitPending(){
  const n=L.pending; L.pending=null; L.phase='idle'; L.misses=0; L.silences=0;
  logTurn({where:'submit',value:n,count:a.S.count});
  a.voice.answer(n); paint();
}
function waitQuiet(tok,cb){ let since=0; const iv=setInterval(()=>{ if(tok!==L.tok){ clearInterval(iv); return; } if(speaking()||a.S.t&&a.S.t.explaining){ since=0; return; } if(!since) since=Date.now(); if(Date.now()-since>300){ clearInterval(iv); cb(); } },100); }

/* главный цикл: решает, когда Бульк говорит и когда слушает */
let quietSince=0;
function tick(){
  if(!a||!L.on) return;
  const S=a.S;
  if(S.screen==='talk') return;
  if(!lessonTask()) return;
  const t=S.t;
  for(let i=0;i<Math.min(S.results.length,LESSON_LEN);i++) if(!L.lit[i]){ L.lit[i]=true; paint(); }   // фонарик = выполненное задание, даже если «Дальше» нажали сразу
  if(L.task!==t){ L.task=t; L.step=t.si; L.done=!!t.done; L.pausedStep=false; L.pending=null; L.misses=0; L.silences=0; if(L.phase!=='off') L.phase='idle'; quietSince=0; L.tok++; if(ASR) ASR.cancel(); paint();
    // новая глава истории перед исходным заданием
    if(L.chapterSaid!==S.count){ L.chapterSaid=S.count; const st=a.curStep(); const ch=[LP.ui.ch1,LP.ui.ch2,LP.ui.ch3][Math.min(S.count,2)]; AU.stop(); say(ch,()=>{ if(st&&a.curStep()===st) AU.say((t.covered&&st.instr2)?st.instr2:st.instr,{force:true}); }); }
    return; }
  if(L.step!==t.si||L.done!==!!t.done){ L.step=t.si; L.done=!!t.done; L.pausedStep=false; L.pending=null; L.misses=0; L.silences=0; if(L.phase==='listening'||L.phase==='thinking'||L.phase==='confirm'){ L.tok++; ASR&&ASR.cancel(); } if(L.mode==='voice') L.phase='idle'; quietSince=0; paint(); }
  if(document.hidden) return;
  if(L.phase==='listening'&&speaking()){ L.tok++; ASR&&ASR.cancel(); L.phase='idle'; paint(); }   // герой заговорил — уши закрыты
  if(speaking()||t.explaining||S.busy){ quietSince=0; if(L.phase==='idle') paint(); return; }
  if(!quietSince){ quietSince=Date.now(); return; }
  if(L.phase==='speaking'&&Date.now()-quietSince>1500){ L.phase='idle'; paint(); }   // реплику прервали кнопкой — возвращаемся к ожиданию
  if(Date.now()-quietSince<350) return;
  // задание выполнено: зажигаем фонарик (по истории), затем «идём дальше?»
  if(t.done&&L.doneHandled!==S.count){
    L.doneHandled=S.count; const i=Math.min(S.count,2); L.lit[i]=true; paint();
    if(!reduce){ const lt=appEl.querySelectorAll('.talk-strip .lantern')[i]; if(lt) lt.classList.add('pop'); }
    const lines=[]; if(!t.clean) lines.push(LP.ui.together);
    lines.push([LP.ui.lit1,LP.ui.lit2,LP.ui.lit3][i]); if(i===2) lines.push(LP.ui.bye); else lines.push(LP.ui.goOn);
    const tok=L.tok; chain(lines,()=>{ if(tok!==L.tok) return; if(L.mode==='voice') listenTurn('next'); });
    return;
  }
  if(L.mode!=='voice'||L.phase!=='idle'||L.pausedStep) return;
  if(!curNum()) return;
  if(!L.sayItOnce){ L.sayItOnce=true; say(LP.ui.sayIt,()=>listenTurn('answer')); return; }
  listenTurn('answer');
}

/* ---------- кабинет родителя ---------- */
function parentSettings(){
  const v=vs(); const mb=Math.round((ASR?ASR.TOTAL:0)/1e6);
  let h='<h3>Разговор с героем</h3><p class="muted">Ребёнок может отвечать Бульку голосом. Речь распознаётся прямо на этом устройстве, не отправляется в интернет и не записывается. Ребёнок сам выбирает перед каждым уроком: говорить или нажимать кнопки.</p>';
  if(!ASR||model.status==='nosupport'||model.status==='nocache') h+='<p class="notice">Этот браузер не поддерживает локальное распознавание. Кнопки работают как обычно.</p>';
  else if(model.status==='downloading') h+='<p class="muted" role="status">Загрузка: '+Math.round(model.progress*100)+'%</p>';
  else if(model.status==='bundled') h+='<p class="muted">Распознавание включено в приложение. Дополнительная загрузка не нужна. Голосовые ответы можно отключить ниже.</p>';
  else if(model.status==='cached') h+='<p class="muted">Распознавание установлено на устройство (≈'+mb+' МБ).</p><button type="button" class="btn ghost small" data-act="voiceRemove">Удалить с устройства</button>';
  else h+='<button type="button" class="btn small" data-act="voiceDownload">Установить распознавание · ≈'+mb+' МБ, один раз</button>'+(model.error?'<p class="notice">'+esc(model.error)+'</p>':'');
  h+='<label class="switch"><span><b>Разрешить голосовые ответы</b><small>Без этого ребёнок отвечает только кнопками</small></span><input type="checkbox" data-voiceset="allowed"'+(v.allowed?' checked':'')+'></label>';
  return h;
}

/* ---------- подключение ---------- */
function wrapHook(name,fn){ const prev=EXT.hooks[name]; EXT.hooks[name]=(...x)=>{ let s=''; try{ s=prev?(prev(...x)||''):''; }catch(e){} return s+(fn(...x)||''); }; }
function init(){
  a=root.__app; appEl=document.getElementById('app'); if(!a||!a.voice||!appEl) return;
  EXT.views.talk=viewTalk;
  EXT.acts.talk=()=>{ a.S.island=null; openTalk(); };
  EXT.acts.talkVoice=()=>chooseVoice();
  EXT.acts.talkKeys=()=>chooseKeys();
  EXT.acts.talkRepeat=()=>{ if(L.line) AU.say(L.line,{force:true}); };
  EXT.acts.talkReady=()=>{ if(a.S.screen==='talk'&&(L.phase==='warmup'||L.phase==='warmThinking'||L.phase==='listening')){ L.tok++; ASR.cancel(); L.phase='warmup'; logTurn({where:'warmup',kind:'button'}); say(LP.ui.micTest,()=>startLesson()); } };
  EXT.acts.talkYes=()=>{ if(L.phase==='confirm'&&L.pending!==null){ L.tok++; ASR&&ASR.cancel(); logTurn({where:'confirm',kind:'button-yes'}); AU.stop(); submitPending(); } };
  EXT.acts.talkNo=()=>{ if(L.phase==='confirm'){ L.tok++; ASR&&ASR.cancel(); L.pending=null; L.phase='speaking'; paint(); say(LP.ui.sayAgain,()=>relisten('answer')); } };
  EXT.acts.talkListen=()=>{ if(L.mode==='voice'){ L.pausedStep=false; L.misses=0; L.silences=0; if(a.S.t&&a.S.t.done) listenTurn('next'); else listenTurn('answer'); } };
  EXT.acts.talkOff=()=>{ L.tok++; endVoice(); if(a.S.screen==='talk'){ L.phase='intro'; paint(true); } else say(LP.ui.micOff); };
  EXT.acts.voiceDownload=()=>{ if(!ASR) return; model.status='downloading'; model.progress=0; model.error=''; a.render();
    let last=0; ASR.download(p=>{ model.progress=p; if(Date.now()-last>400){ last=Date.now(); if(a.S.screen==='parent') a.render(); } })
      .then(s=>{ model.status=s; a.render(); }).catch(e=>{ model.status='absent'; model.error='Не удалось загрузить: '+(e&&e.message||e)+'. Проверьте интернет и попробуйте снова.'; a.render(); }); };
  EXT.acts.voiceRemove=()=>{ ASR.remove().then(()=>{ model.status='absent'; a.render(); }); };
  wrapHook('parentSettings',parentSettings);
  wrapHook('islandExtra',id=>{ const p=a.P(); return p&&id===p.cur?'<button type="button" class="btn talk-entry" data-act="talk">'+CH.pal('see','talk-mini','')+'Поговорить с Бульком · '+LESSON_LEN+' задания</button>':''; });
  wrapHook('breakExtra',()=>L.wasLesson?'<button type="button" class="btn ghost" data-act="talk">Ещё разговор с Бульком</button>':'');
  wrapHook('leave',screen=>{ if(screen!=='task'&&screen!=='talk'){ L.tok++; micStop(); const was=L.on&&a.S.lessonLen===LESSON_LEN; if(screen!=='break') resetLesson(); else { L.on=false; L.phase='off'; } L.wasLesson=screen==='break'&&was; if(screen==='break') a.S.lessonLen=0; } });
  appEl.addEventListener('change',e=>{ const k=e.target.dataset&&e.target.dataset.voiceset; if(!k) return; const v=vs(); v[k]=!!e.target.checked; vsSave(v); if(!v.allowed){ L.tok++; micStop(); } });
  // нажатие цифр — ответ кнопками: текущий голосовой ход отменяется, кнопки главнее
  appEl.addEventListener('click',e=>{ if(!L.on) return; if(e.target.closest('[data-k],[data-f],[data-act="say"],[data-act="explain"],[data-act="exstop"]')){ if(L.phase==='listening'||L.phase==='thinking'||L.phase==='confirm'){ L.tok++; ASR&&ASR.cancel(); L.pending=null; L.phase='paused'; L.pausedStep=true; paint(); } } },true);
  document.addEventListener('keydown',e=>{ if(L.on&&/^[0-9]$/.test(e.key)&&(L.phase==='listening'||L.phase==='thinking'||L.phase==='confirm')){ L.tok++; ASR&&ASR.cancel(); L.pending=null; L.phase='paused'; L.pausedStep=true; paint(); } },true);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&L.on&&L.mode==='voice'){ L.tok++; endVoice('Микрофон выключился, пока приложение было свернуто. Отвечай кнопками.'); } });
  root.addEventListener('pagehide',()=>{ if(L.on&&L.mode==='voice') endVoice(); else { L.tok++; micStop(); } });
  new MutationObserver(()=>{ if(!painting) paint(); }).observe(appEl,{childList:true});
  setInterval(tick,120);
  refreshModel();
  root.VOICE_LESSON={get state(){ return {on:L.on, mode:L.mode, phase:L.phase, listenState:L.listenState, pending:L.pending, lit:L.lit.slice(), count:a.S.count, micOpen:!!(ASR&&ASR.micOpen), listening:L.phase==='listening', model:model.status, allowed:vs().allowed}; }, get log(){ return L.log.slice(); }, stop:()=>{ L.tok++; endVoice(); }, open:openTalk};
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})(window);

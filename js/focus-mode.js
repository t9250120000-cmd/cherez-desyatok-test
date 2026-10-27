/* «Спокойный фокус» — режим для детей с СДВГ, дискалькулией или быстрой утомляемостью.
   Включает родитель для конкретного игрока. Короткие серии, крупный теремок, меньше движения и украшений,
   без таймеров в Копилке, перерыв с движением при признаках усталости.
   Плюс подсказка «числовая прямая» в счёте в уме. Методику, награды и terem_v3 не меняет. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext,I=root.TEREM_INSIGHTS;
  if(!app||!ext)return;
  const KEY='terem_focus_v1',IDLE_MS=60000,COOLDOWN=3;
  let ST;
  try{ST=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){ST=null;}
  if(!ST||typeof ST!=='object'||ST.v!==1||typeof ST.profiles!=='object'||!ST.profiles)ST={v:1,profiles:{}};
  function store(){try{localStorage.setItem(KEY,JSON.stringify(ST));}catch(e){}}
  function cfg(id){const pid=id||(app.P()||{}).id;if(!pid)return null;const c=ST.profiles[pid];if(c&&typeof c==='object')return Object.assign({on:false,len:5,rest:true},c);return {on:false,len:5,rest:true};}
  function setCfg(patch){const p=app.P();if(!p)return;ST.profiles[p.id]=Object.assign(cfg(p.id),patch);store();}
  const active=()=>{const c=cfg();return !!(c&&c.on);};
  const facts=()=>root.__facts;
  function applyBody(){document.body.classList.toggle('focus-calm',active());}

  function chainStr(name,fn){const prev=ext.hooks[name];ext.hooks[name]=function(...a){let out='';try{out=prev?prev.apply(this,a):'';}catch(e){out='';}return (out||'')+(fn.apply(this,a)||'');};}

  /* ---------- длина серии ---------- */
  const prevLen=ext.hooks.sessionLen;
  ext.hooks.sessionLen=function(...a){let v='';try{v=prevLen?prevLen.apply(this,a):'';}catch(e){}offeredAt=-COOLDOWN;const c=cfg();return v||(c&&c.on?Math.max(3,Math.min(8,c.len|0||5)):'');};

  /* ---------- настройки родителя ---------- */
  chainStr('parentSettings',()=>{
    const p=app.P();if(!p)return '';const c=cfg(p.id);
    const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    return '<h3>Внимание и счёт</h3>'+
      '<label class="switch"><span><b>Спокойный фокус</b><small>Для детей с СДВГ, дискалькулией или быстрой утомляемостью: короткие серии, крупный теремок, меньше картинок и движения, Копилка без таймеров, перерыв с движением при усталости.</small></span><input type="checkbox" data-focus="on"'+(c.on?' checked':'')+'></label>'+
      '<label class="num"><span>Заданий в серии в этом режиме</span><input type="number" min="3" max="8" data-focus="len" value="'+(c.len||5)+'"'+(c.on?'':' disabled')+'></label>'+
      '<label class="switch"><span><b>Предлагать перерыв</b><small>После нескольких ошибок подряд, очень долгого задания или минуты без действий.</small></span><input type="checkbox" data-focus="rest"'+(c.rest?' checked':'')+(c.on?'':' disabled')+'></label>'+
      '<p class="muted">Настройка для игрока «'+esc(p.name)+'». Подсказка «числовая прямая» в счёте в уме работает при включённой «Числовой прямой» в Копилке фактов. Трудности и советы — во вкладке статистики.</p>';
  });
  document.getElementById('app').addEventListener('change',e=>{
    const k=e.target.dataset&&e.target.dataset.focus;if(!k)return;
    if(k==='len'){const v=parseInt(e.target.value,10);if(!Number.isFinite(v)||v<3||v>8){e.target.value=cfg().len;return;}setCfg({len:v});return;}
    if(k==='rest'){setCfg({rest:!!e.target.checked});return;}
    if(k==='on'){
      const on=!!e.target.checked,F=facts();
      if(on){const prev=F?{noTimers:!!F.settings().noTimers,numberLine:!!F.settings().numberLine}:null;setCfg({on:true,prevFacts:prev});if(F){F.settings().noTimers=true;F.settings().numberLine=true;F.store();}}
      else{const c=cfg();setCfg({on:false});if(F&&c.prevFacts){F.settings().noTimers=c.prevFacts.noTimers;F.settings().numberLine=c.prevFacts.numberLine;F.store();}}
      applyBody();app.render();
    }
  });
  chainStr('leave',()=>{closeOverlay(false);setTimeout(applyBody,0);return '';});

  /* ---------- числовая прямая как опора в счёте в уме ---------- */
  function canLine(t){
    const st=app.curStep(),F=facts();
    return !!(t&&t.o&&(t.o.op==='add'||t.o.op==='sub')&&['add','sub','mix'].includes(t.skill)&&(t.ph===3||t.skill==='mix')&&!t.done&&!t.explaining&&st&&st.kind==='num'&&F&&F.settings().numberLine&&!t.house&&!t.hintChain&&!app.S.diag);
  }
  const prevExtra=ext.hooks.taskExtra;
  ext.hooks.taskExtra=function(t){
    let out='';try{out=prevExtra?prevExtra.apply(this,arguments)||'':'';}catch(e){out='';}
    if(out||!t)return out;
    const used=t._ins&&t._ins.nl;
    if(used&&!t.done&&facts()){const o=t.o,first=o.op==='add'?'+'+o.k:'−'+o.u;return '<div class="numline-wrap nl-support">'+facts().numberLineSVG(o,1)+'<p class="nl-note">Сначала прыжок до 10: <b>'+first+'</b>. Сколько ещё?</p></div>';}
    if(canLine(t))return '<button type="button" class="btn ghost small nl-hint" data-act="nlHint"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15h18M6 12v6M12 12v6M18 12v6"/><path d="M6 10c2-4 4-4 6 0" fill="none"/></svg>Подсказка: числовая прямая</button>';
    return '';
  };
  ext.acts.nlHint=()=>{
    const t=app.S.t;if(!canLine(t)||t._ins&&t._ins.nl)return;
    t.clean=false;                       // подсказка — помощь: как и после ошибки, задание вернётся позже
    if(root.__insights)root.__insights.markNumberLine(t);else (t._ins=t._ins||{wr:{},nl:0,ex:0}).nl=1;
    app.render();
    if(root.SP360)root.SP360.speak(root.SP360.line,{force:true});
  };

  /* ---------- перерыв при усталости ---------- */
  let overlay=null,offeredAt=-COOLDOWN,lastInput=Date.now(),lastTask=null,idleFired=null;
  function seriesLen(){return root.__insights?root.__insights.series().length:0;}
  function offer(reason){
    if(overlay||!active()||!cfg().rest)return;
    offeredAt=seriesLen();
    const moves=root.PH&&root.PH.moves||[];const mv=moves.length?moves[Math.floor(Math.random()*moves.length)]:null;
    overlay=document.createElement('div');overlay.className='focus-rest';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','focus-rest-title');
    overlay.dataset.reason=reason;
    const title=reason==='pause'?'Задание тебя подождёт':'Давай передохнём';
    const lead=reason==='pause'?'Можно немного размяться и вернуться.':'Мозгу тоже нужен отдых. Сделай зарядку вместе с Бульком.';
    overlay.innerHTML='<div class="focus-rest-card"><img src="art/companion/bulk-explaining.webp" alt="" draggable="false"><h2 id="focus-rest-title">'+title+'</h2><p>'+lead+'</p>'+(mv?'<p class="move">'+mv.text+'</p>':'')+
      '<button type="button" class="btn" data-rest="continue">Размялись — продолжаем</button><button type="button" class="btn ghost" data-rest="stop">На сегодня хватит</button></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-rest="continue"]').focus({preventScroll:true});
    const SP=root.SP360,intro=SP&&SP.rest[reason==='pause'?'pause':'errors'];
    const sayMove=()=>{if(overlay&&mv)root.AUDIO.say(mv,{force:true});};
    setTimeout(()=>{if(!overlay)return;if(!(SP&&SP.speak(intro,{force:true,onend:sayMove})))sayMove();},reason==='pause'?0:1600);
  }
  function closeOverlay(log,choice){
    if(!overlay)return;const reason=overlay.dataset.reason;overlay.remove();overlay=null;lastInput=Date.now();
    if(log&&root.__insights)root.__insights.logFatigue(reason,choice);
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('[data-rest]');if(!b||!overlay)return;
    const choice=b.dataset.rest;closeOverlay(true,choice);root.AUDIO.stop();
    if(choice==='stop')app.go('map',{island:null});
  });
  // Пока открыт перерыв, цифры и Enter не уходят в задание под ним.
  root.addEventListener('keydown',e=>{
    if(!overlay)return;
    if(e.key==='Escape'){e.preventDefault();closeOverlay(true,'continue');return;}
    if(overlay.contains(e.target)){e.stopPropagation();if(e.key==='Tab'){const bs=[...overlay.querySelectorAll('button')];const i=bs.indexOf(document.activeElement);e.preventDefault();bs[(i+(e.shiftKey?bs.length-1:1))%bs.length].focus();}return;}
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  chainStr('taskDone',()=>{
    if(!active()||!cfg().rest||!I||!root.__insights)return '';
    const series=root.__insights.series();
    if(series.length-offeredAt<COOLDOWN)return '';
    const why=I.fatigueSignal(series,{slowSec:120});
    if(why){const t=app.S.t;setTimeout(()=>{if(app.S.screen==='task'&&app.S.t===t)offer(why);},1800);}
    return '';
  });
  ['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{lastInput=Date.now();},{passive:true,capture:true}));
  setInterval(()=>{
    const S=app.S,t=S.t;
    if(t!==lastTask){lastTask=t;lastInput=Date.now();}
    if(document.hidden||S.screen!=='task'||!t||t.done||t.explaining||S.diag||overlay||idleFired===t)return;
    if(!active()||!cfg().rest)return;
    if(Date.now()-lastInput>=IDLE_MS&&!(root.AUDIO.speaking&&root.AUDIO.speaking())){idleFired=t;offer('pause');}
  },5000);

  applyBody();
  root.__focus={active,cfg,offer,closeOverlay,KEY,get open(){return !!overlay;}};
})(window);

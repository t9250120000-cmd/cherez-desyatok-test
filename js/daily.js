/* Дневная норма занятий (по умолчанию 15 минут, мягкий стоп) и автоматический отчёт родителю в Telegram.
   Хранится в отдельном ключе terem_daily_v1; terem_v3 меняется только бонусом монеток за норму. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext,D=root.TEREM_DAILY;
  if(!app||!ext||!D)return;
  // Адрес облачной функции и имя бота заполняются после развёртывания (docs/PARENT-REPORT.md). Пусто — отчёты выключены.
  const REPORT={endpoint:'',bot:''};
  const KEY='terem_daily_v1',TICK=1000;
  let ST;try{ST=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){ST=null;}
  if(!ST||ST.v!==1||typeof ST!=='object')ST={v:1,settings:{},days:{},report:{}};
  ['settings','days','report'].forEach(k=>{if(!ST[k]||typeof ST[k]!=='object')ST[k]={};});
  // Получатели отчёта по каждому игроку: до 4 чатов Telegram (мама, папа, бабушка…). Старый вид {token,since} переводится в список.
  const MAX_CHATS=4;
  for(const id of Object.keys(ST.report)){const r=ST.report[id];if(r&&r.token&&!r.chats)ST.report[id]={chats:[{token:r.token,since:r.since||Date.now(),who:''}]};else if(!r||!Array.isArray(r.chats))delete ST.report[id];}
  const chats=id=>{const r=ST.report[id||pid()];return r&&Array.isArray(r.chats)?r.chats.filter(c=>c&&c.token):[];};
  const chatId=t=>String(t).split('.')[0];
  const store=()=>{try{localStorage.setItem(KEY,JSON.stringify(ST));}catch(e){}};
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pid=()=>(app.P()||{}).id;
  const cfg=id=>D.settings(ST.settings[id||pid()]);
  function day(id){id=id||pid();if(!id)return null;const t=today();const all=ST.days[id]||(ST.days[id]={});const ks=Object.keys(all).sort();while(ks.length>14)delete all[ks.shift()];return all[t]||(all[t]={sec:0,goalAt:0,bonus:0,sentSec:0,activeAt:0});}

  /* ---------- учёт времени ---------- */
  let lastInput=Date.now(),overlay=null,pending=false;
  ['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{lastInput=Date.now();},{passive:true,capture:true}));
  setInterval(()=>{
    const p=app.P();if(!p)return;const c=cfg(p.id);
    const st={screen:app.S.screen,visible:!document.hidden,idleMs:Date.now()-lastInput,paused:!!(root.__focus&&root.__focus.open)};
    const d=day(p.id);
    if(D.counts(st)){d.sec+=TICK/1000;d.activeAt=Date.now();if(d.sec%10===0)store();}
    if(c.on&&!d.goalAt&&D.progress(d.sec,c.goal).done){d.goalAt=Date.now();pending=true;store();}
    if(pending&&!overlay&&naturalPause())celebrate();
    // отчёт: 10 минут без занятий после новой игры
    if(REPORT.endpoint&&c.report&&d.sec-d.sentSec>=120&&d.activeAt&&Date.now()-d.activeAt>600000)send('idle');
    if(app.S.screen==='map')chipRefresh();
  },TICK);
  function naturalPause(){
    const S=app.S,sc=S.screen;
    if(sc==='map'||sc==='break'||sc==='diagres')return true;
    if(sc==='task')return !!(S.t&&S.t.done);
    if(sc==='facts')return !!(root.__facts&&['result','home'].includes(root.__facts.G.mode));
    if(sc==='senseGames'||sc==='numberGames'||sc==='foundations')return !!document.querySelector('[data-sg=again],[data-ng=again],[data-picnic=home],.ng-library');
    return false;
  }

  /* ---------- норма выполнена ---------- */
  function celebrate(){
    pending=false;const p=app.P();if(!p)return;const c=cfg(p.id),d=day(p.id);
    if(c.bonus&&!d.bonus){d.bonus=c.bonus;p.coins+=c.bonus;const dd=p.days&&p.days[today()];if(dd)dd.coins=(dd.coins||0)+c.bonus;app.save();store();}
    overlay=document.createElement('div');overlay.className='focus-rest daily-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','daily-title');
    overlay.innerHTML='<div class="focus-rest-card"><img src="art/bulk-happy.webp" alt="" draggable="false" onerror="this.src=\'art/companion/bulk-waiting.webp\'"><h2 id="daily-title">Норма на сегодня выполнена!</h2><p>'+c.goal+' минут занятий. Ты молодец!</p>'+(c.bonus?'<p class="move">Бонус: +'+c.bonus+' ●</p>':'')+
      '<button type="button" class="btn" data-daily="stop">На сегодня хватит</button><button type="button" class="btn ghost" data-daily="more">Доиграть ещё немного</button></div>';
    document.body.appendChild(overlay);overlay.querySelector('[data-daily=stop]').focus({preventScroll:true});
    const ph=root.PH&&root.PH.praise;if(ph&&ph.length)root.AUDIO.say(ph[Math.floor(Math.random()*ph.length)],{force:true});
    if(root.AUDIO.sfx&&root.AUDIO.sfx.unlock)try{root.AUDIO.sfx.unlock();}catch(e){}
    if(REPORT.endpoint&&c.report)send('goal');
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('[data-daily]');if(!b||!overlay||!overlay.contains(b))return;
    const a=b.dataset.daily;overlay.remove();overlay=null;root.AUDIO.stop();
    if(a==='stop')app.go('map',{island:null});else if(app.S.screen==='map')app.render();
  });
  root.addEventListener('keydown',e=>{if(!overlay)return;if(overlay.contains(e.target)){e.stopPropagation();return;}e.preventDefault();e.stopImmediatePropagation();},true);

  /* ---------- шкала на карте ---------- */
  function chip(){
    const p=app.P();if(!p)return '';const c=cfg(p.id);if(!c.on)return '';const d=day(p.id),pr=D.progress(d.sec,c.goal);
    const R=15,L=2*Math.PI*R,off=L*(1-pr.ratio);
    return '<div class="daily-chip'+(pr.done?' done':'')+'" role="status" aria-label="Сегодня '+pr.min+' из '+c.goal+' минут"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="'+R+'" class="bg"/><circle cx="18" cy="18" r="'+R+'" class="fg" stroke-dasharray="'+L.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/></svg><span>'+(pr.done?'Норма ✓':'<b>'+pr.min+'</b> из '+c.goal+' мин')+'</span></div>';
  }
  let lastChip='';
  function chipRefresh(){const el=document.querySelector('.daily-chip');const h=chip();if(el&&h!==lastChip){lastChip=h;el.outerHTML=h;}}
  const prevMap=ext.hooks.mapExtra;
  ext.hooks.mapExtra=function(...a){let h='';try{h=prevMap?prevMap.apply(this,a)||'':'';}catch(e){}const c=chip();lastChip=c;return h+c;};

  /* ---------- текст отчёта ---------- */
  function reportText(reason){
    const p=app.P(),c=cfg(p.id),d=day(p.id),t=today();
    const start=new Date();start.setHours(0,0,0,0);const from=start.getTime();
    const ip=root.__insights&&root.__insights.prof(p.id);
    let facts=null;try{const F=root.__facts;if(F)facts={known:F.known().length,new:0};}catch(e){}
    const dd=(p.days&&p.days[t])||{tasks:0,clean:0,coins:0};
    return D.report({name:p.name,date:t.split('-').reverse().join('.'),sec:d.sec,goalMin:c.on?c.goal:0,goalDone:!!d.goalAt,day:dd,skill:p.cur,phase:p.skills[p.cur]&&p.skills[p.cur].phase,
      tasks:ip?ip.tasks.filter(r=>r.at>=from):[],fatigue:ip?ip.fatigue.filter(r=>r.at>=from):[],games:ip?ip.games.filter(r=>r.at>=from):[],facts})+(reason==='goal'?'':'');
  }

  /* ---------- отправка ---------- */
  function send(reason,beacon){
    const p=app.P();if(!p||!REPORT.endpoint)return false;const list=chats(p.id);if(!list.length)return false;
    const d=day(p.id);if(d.sec-d.sentSec<60&&reason!=='goal'&&reason!=='manual')return false;
    // Один запрос на всех получателей этого ребёнка: при закрытии игры успевает уйти даже через sendBeacon.
    const body=JSON.stringify({action:'report',tokens:list.map(c=>c.token),text:reportText(reason)});
    d.sentSec=d.sec;ST.report[p.id].lastSent=Date.now();store();
    try{
      if(beacon&&navigator.sendBeacon){navigator.sendBeacon(REPORT.endpoint,new Blob([body],{type:'text/plain'}));return true;}
      fetch(REPORT.endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body,keepalive:true}).then(x=>x.json()).then(j=>{if(!j||!j.ok){d.sentSec=0;store();}}).catch(()=>{d.sentSec=0;store();});
    }catch(e){d.sentSec=0;store();}
    return true;
  }
  // Ушли из приложения или свернули — итог уходит родителю, если с прошлого отчёта было хотя бы 2 минуты занятий.
  const away=()=>{const p=app.P();if(!p||!REPORT.endpoint||!cfg(p.id).report)return;const d=day(p.id);if(d.sec-d.sentSec>=120)send('away',true);};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){store();away();}});
  root.addEventListener('pagehide',()=>{store();away();});

  /* ---------- кабинет родителя ---------- */
  let pairing=null;
  const prevSet=ext.hooks.parentSettings;
  ext.hooks.parentSettings=function(...a){
    let h='';try{h=prevSet?prevSet.apply(this,a)||'':'';}catch(e){}
    const p=app.P();if(!p)return h;const c=cfg(p.id),d=day(p.id),pr=D.progress(d.sec,c.goal);
    h+='<h3>Время занятий</h3><label class="switch"><span><b>Дневная норма</b><small>Шкала на карте. Когда норма выполнена — праздник, бонус и предложение закончить. Доиграть начатое можно. Сегодня: '+pr.min+' мин.</small></span><input type="checkbox" data-daily-set="on"'+(c.on?' checked':'')+'></label>'+
      '<label class="num"><span>Минут в день</span><input type="number" min="5" max="60" data-daily-set="goal" value="'+c.goal+'"></label>'+
      '<label class="num"><span>Бонус за норму, монеток</span><input type="number" min="0" max="20" data-daily-set="bonus" value="'+c.bonus+'"></label>';
    if(REPORT.endpoint){
      const list=chats(p.id),mine=pairing&&pairing.pid===p.id;
      h+='<h3>Отчёт родителям в Telegram</h3>';
      if(list.length){
        h+='<p class="muted">Итог дня по игроку «'+esc(p.name)+'» приходит сам: когда игру свернули или закрыли, после 10 минут без занятий и при выполнении нормы. Получает каждый подключённый Telegram.</p><ul class="rep-list">'+
          list.map((c,i)=>'<li><span><b>'+esc(c.who||('Получатель '+(i+1)))+'</b><small>с '+new Date(c.since).toLocaleDateString('ru-RU')+'</small></span><button type="button" class="btn ghost small" data-act="repOff" data-id="'+i+'" aria-label="Отключить '+esc(c.who||('получателя '+(i+1)))+'">Отключить</button></li>').join('')+'</ul>';
      }
      if(mine)h+='<p class="muted">Откройте Telegram'+(list.length?' на телефоне второго родителя':'')+' и нажмите «Запустить» (Start) у бота. Игра ждёт подтверждения…</p><div class="row2"><a class="btn small" href="https://t.me/'+esc(REPORT.bot)+'?start='+esc(pairing.nonce)+'" target="_blank" rel="noopener">Открыть Telegram</a><button type="button" class="btn ghost small" data-act="repCancel">Отмена</button></div>'+
        (list.length?'<p class="muted">Телефон второго родителя не рядом? Отправьте ему эту ссылку (действует 10 минут, на одно подключение) — достаточно открыть её и нажать «Запустить»: <span class="rep-link">t.me/'+esc(REPORT.bot)+'?start='+esc(pairing.nonce)+'</span></p><button type="button" class="btn ghost small" data-act="repShare">Поделиться ссылкой</button>':'')+'<p class="muted" role="status">'+esc(pairing.msg||'')+'</p>';
      else if(list.length){
        h+='<div class="row2"><button type="button" class="btn ghost small" data-act="repSend">Отправить итог сейчас</button>'+(list.length<MAX_CHATS?'<button type="button" class="btn ghost small" data-act="repPair">Добавить ещё родителя</button>':'')+'</div>';
      }
      else h+='<p class="muted">Итог дня (имя игрока, минуты, задания, ошибки, трудные примеры, подсказки, перерывы) будет приходить в Telegram — можно подключить и маму, и папу. Он передаётся через облачную функцию разработчика в Yandex Cloud и там не хранится. Записи голоса и другие данные не передаются. Отключить можно здесь же.</p><button type="button" class="btn small" data-act="repPair">Подключить Telegram</button>';
    }
    return h;
  };
  document.getElementById('app').addEventListener('change',e=>{
    const k=e.target.dataset&&e.target.dataset.dailySet;if(!k)return;const p=app.P();if(!p)return;
    const s=Object.assign({},ST.settings[p.id]||{});
    if(k==='on')s.on=!!e.target.checked;else{const v=parseInt(e.target.value,10);if(!e.target.checkValidity()||!Number.isFinite(v)){e.target.value=cfg(p.id)[k];return;}s[k]=v;}
    ST.settings[p.id]=D.settings(s);store();
  });
  const rnd=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>'abcdefghijkmnpqrstuvwxyz23456789'[b%32]).join('');
  async function poll(){
    const pr=pairing;if(!pr)return;
    if(Date.now()-pr.at>600000){pr.msg='Не дождались подтверждения. Нажмите «Отмена» и попробуйте ещё раз.';if(app.S.screen==='parent')app.render();return;}
    try{const j=await (await fetch(REPORT.endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'pair',nonce:pr.nonce,name:(app.P()||{}).name})})).json();
      if(pairing!==pr)return;
      if(j&&j.token){
        const r=ST.report[pr.pid]||(ST.report[pr.pid]={chats:[]});const who=String(j.who||'').slice(0,30);
        const same=r.chats.findIndex(c=>chatId(c.token)===chatId(j.token));
        if(same>=0){r.chats[same].token=j.token;if(who)r.chats[same].who=who;}else r.chats.push({token:j.token,since:Date.now(),who});
        r.chats=r.chats.slice(-MAX_CHATS);store();pairing=null;
        app.toast(same>=0?'Этот Telegram уже был подключён.':'Telegram'+(who?' ('+who+')':'')+' подключён. Отчёт уже отправлен для проверки.');
        if(same<0&&app.P()&&app.P().id===pr.pid){if(r.chats.length===1)send('manual');else sendOne(j.token);}
        if(app.S.screen==='parent')app.render();return;}
    }catch(e){pr.msg='Нет связи с сервером. Проверьте интернет.';}
    setTimeout(poll,Date.now()-pr.at<180000?3000:8000);
  }
  ext.acts.repPair=()=>{const p=app.P();if(!p||chats(p.id).length>=MAX_CHATS)return;pairing={nonce:rnd(),pid:p.id,at:Date.now(),msg:''};app.render();setTimeout(poll,3000);};
  ext.acts.repShare=async()=>{if(!pairing)return;const url='https://t.me/'+REPORT.bot+'?start='+pairing.nonce,text='Подключи отчёты «Через десяток»: открой ссылку и нажми «Запустить»';
    try{if(navigator.share){await navigator.share({title:'Через десяток',text,url});return;}}catch(e){if(e&&e.name==='AbortError')return;}
    try{await navigator.clipboard.writeText(url);app.toast('Ссылка скопирована.');}catch(e){app.toast('Скопируйте ссылку вручную.');}};
  ext.acts.repCancel=()=>{pairing=null;app.render();};
  ext.acts.repOff=(el,id)=>{const p=app.P();if(!p)return;const r=ST.report[p.id];if(!r)return;const i=Number(id)||0,c=r.chats[i];if(!c)return;
    if(REPORT.endpoint){try{fetch(REPORT.endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'unpair',token:c.token})}).catch(()=>{});}catch(e){}}
    r.chats.splice(i,1);if(!r.chats.length)delete ST.report[p.id];store();app.render();};
  // Новому получателю — проверочный итог только ему, остальные родители повтор не получают.
  function sendOne(token){try{fetch(REPORT.endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'report',tokens:[token],text:reportText('manual')})}).catch(()=>{});}catch(e){}}
  ext.acts.repSend=()=>{send('manual')?app.toast('Итог отправлен в Telegram.'):app.toast('Не удалось отправить. Проверьте интернет.');};

  root.__daily={cfg,day,reportText,send,chats,REPORT,get ST(){return ST;},celebrate:()=>{pending=true;},KEY};
})(window);

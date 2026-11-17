/* «Большой день Сказочного Теремка» — глава T02 (Пряничный остров, Тестик).
   Тот же проверенный каркас обвязки, что у T01 (js/story-t01.js): только
   разрешённые точки ext.views/acts, hooks islandExtra/mapExtra/breakExtra/leave,
   журнал __insights.logGame. Состояние главы — проекция журнала
   terem_insights_v1 (записи story-t02-*), отдельного ключа нет; terem_v3,
   награды, фазы и skills.done этим модулем не пишутся. Перенос T02.4 — игра
   house («Домик числа») с origin сцены; угощение/чужие игры не присваиваются.
   Озвучка — только существующая записанная фраза (приветствие Тестика). */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext;
  if(!app||!ext)return;
  const PH=root.PH,CH=root.CH;

  let active=null;       // {ep, at} — серия движка to10 из сцены

  const REQ={1:1,2:2,3:3}; // фактическая фаза заданий, необходимая эпизоду
  const EP={
    1:{name:'Свободные комнаты', what:'Доселить гостей до десяти — по одному, руками.'},
    2:{name:'Заказ Тестика', what:'По заполненному теремку узнать, сколько мест свободно.'},
    3:{name:'Друзья десяти', what:'Назвать недостающую часть без рамки. Помощь вернёт картинку.'},
    4:{name:'Десять мест для встречи', what:'Разместить пришедших и ожидающих: чтобы хватило каждому, без лишних мест.'}
  };

  function journal(){
    const I=root.__insights, p=I&&I.prof&&I.prof();
    return p&&Array.isArray(p.games)&&Array.isArray(p.tasks)?p:{games:[],tasks:[]};
  }
  function lastEntry(ep){
    const l=journal().games.filter(g=>g.game==='story-t02-'+ep);
    return l.length?l[l.length-1]:null;
  }
  function derive(){ return {1:lastEntry(1),2:lastEntry(2),3:lastEntry(3),4:lastEntry(4)}; }
  /* Вход в главу — после T01 этого же профиля (журнал профильный). */
  function t01Done(){ return journal().games.some(g=>g.game==='story-t01-4'); }
  /* Остров to10 может быть ещё закрыт правилом карты — тогда честно говорим,
     что сначала осваиваем счёт у Булька, и серии не предлагаем. */
  function islandLocked(){
    const p=app.P(), s=app.E.SK.to10;
    return !!(p&&s&&app.E.SK[p.cur].n<s.n&&!p.skills.to10.done);
  }
  /* Рассадка засчитывается только с доказанным сюжетным происхождением:
     запись house сама несёт origin сцены. Игра из хаба главу не продвигает. */
  function sceneHouse(){
    const e1=lastEntry(1);
    if(!e1)return null;
    const l=journal().games.filter(g=>g.game==='house'&&g.origin==='story-t02-4'&&g.at>e1.at);
    return l.length?l[l.length-1]:null;
  }
  function seatDraft(){
    const id=(app.P()||{}).id; if(!id)return null;
    const slot='t02-e4-'+id;
    return journal().games.find(g=>g&&g.slot===slot&&g.origin==='story-t02-4'&&g.level==='draft'&&g.seat)||null;
  }
  function to10Phase(){ const p=app.P(); const st=p&&p.skills&&p.skills.to10; return st?(st.done?3:st.phase):1; }
  function pid(){ return (app.P()&&app.P().id)||''; }
  function lesson(ep){
    const credit=lastEntry(ep);
    const rows=journal().games.filter(g=>g.origin==='story-t02-lesson'&&g.ep===ep&&g.pid===pid()&&g.item&&g.item.key&&(!credit||g.since>credit.at));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayTry(ep, level){
    const slot='t02-replay-try-'+pid()+'-'+ep;
    const rows=journal().games.filter(g=>g.origin==='story-t02-replay-draft'&&g.slot===slot&&g.pid===pid()&&g.ep===ep&&(!level||g.level===level));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayCovered(ep, since, at){
    return journal().games.some(g=>g.origin==='story-t02-replay'&&g.ep===ep&&(g.since===since||(g.since==null&&at!=null&&g.at>=at)));
  }
  function legacyReplay(ep, level){
    const credit=lastEntry(ep);
    if(!credit)return null;
    const rows=journal().games.filter(g=>{
      if(!(g.origin==='story-t02-lesson'&&g.ep===ep&&g.pid===pid()&&g.item&&g.item.key&&g.since>credit.at)||(level&&g.level!==level)||replayCovered(ep,g.since,g.at))return false;
      if(g.level==='closed'){ const len=g.len|0; return !!(len&&g.count===len&&Array.isArray(g.results)&&g.results.length===len); }
      return true;
    });
    return rows.length?rows[rows.length-1]:null;
  }
  function newer(a,b){ if(!a)return b; if(!b)return a; return (a.at||0)>=(b.at||0)?a:b; }
  function openReplay(ep){ return newer(replayTry(ep,'open'),legacyReplay(ep,'open')); }
  function closedReplay(ep){
    const slot=replayTry(ep,'closed');
    const len=slot&&slot.len|0;
    const slotOk=slot&&!replayCovered(ep,slot.since,slot.at)&&len&&slot.count===len&&Array.isArray(slot.results)&&slot.results.length===len;
    return newer(slotOk?slot:null, legacyReplay(ep,'closed'));
  }
  function creditedReplay(ep){
    const rows=journal().games.filter(g=>g.origin==='story-t02-replay'&&g.ep===ep&&(g.rounds|0)>0);
    return rows.length?rows[rows.length-1]:null;
  }
  function resultLine(label,row){
    const indep=(row.rounds|0)-(row.supported|0);
    return '<p class="story-state ok">'+label+': заданий '+row.rounds+(row.errors?', ошибок '+row.errors:', без ошибок')+'; самостоятельно '+indep+((row.supported|0)>0?', с подсказкой '+row.supported:'')+'</p>';
  }
  function pendingReplay(ep){
    const open=openReplay(ep), closed=closedReplay(ep);
    if(closed&&(!open||(closed.at||0)>=(open.at||0)))return {kind:'closed',row:closed};
    if(open)return {kind:'open',row:open};
    return null;
  }

  function chain(name,fn){
    const prev=ext.hooks[name];
    ext.hooks[name]=function(...a){
      let out=''; try{ out=prev?prev.apply(this,a)||'':''; }catch(e){ out=''; }
      let mine=''; try{ mine=fn.apply(this,a)||''; }catch(e){ mine=''; }
      return out+mine;
    };
  }

  const BTN='<button type="button" class="btn" data-act="';
  function actBtn(act,ep,label){
    return '<button type="button" class="btn" data-act="'+act+'" data-ep="'+ep+'" aria-label="'+label+': '+EP[ep].name+'">'+label+'</button>';
  }
  function epRow(ep,d,effPh,locked){
    const done=d[ep], e1=d[1];
    let state,btn='';
    if(done){
      if(ep===4){
        const indep=done.rounds-(done.supported||0);
        state='<p class="story-state ok">Сделано: заданий '+done.rounds+(done.errors?', ошибок '+done.errors:', без ошибок')+'; самостоятельно '+indep+((done.supported||0)>0?', с подсказкой '+done.supported:'')+'</p>';
      }else{
        state=resultLine('Первый раз',done);
        const again=creditedReplay(ep);
        if(again)state+=resultLine('Последний повтор',again);
        const pending=pendingReplay(ep);
        if(pending&&pending.kind==='closed'){ state+='<p class="story-state ok">Серия собрана. Можно рассказать Тестику.</p>'; btn=actBtn('storyBack2',ep,'Вернуться к Тестику'); }
        else if(pending){ state+='<p class="story-state">Можно продолжить то же занятие.</p>'; btn=actBtn('storyReplay2',ep,'Продолжить'); }
        else btn=actBtn('storyReplay2',ep,'Повторить');
      }
    }else if(ep===4){
      if(e1){
        const he=sceneHouse();
        if(he){ state='<p class="story-state ok">Все десять мест размещены!</p>'; btn=BTN+'storyHouseBack">Рассказать Тестику про рассадку</button>'; }
        else{
          const draft=seatDraft();
          state='<p class="story-state">'+(draft?'Можно продолжить ту же рассадку.':'Свободные места посчитаны — можно размещать гостей.')+'</p>';
          btn=BTN+'storyHouse">'+(draft?'Продолжить':'Разместить гостей')+'</button>';
        }
      }
      else state='<p class="story-state">Сначала первое дело: узнать, сколько мест свободно.</p>';
    }else if(locked){
      state='<p class="story-state">Остров ещё закрыт: сначала освой счёт у Булька на Мятном лугу.</p>';
    }else{
      const need=REQ[ep];
      const prevDone=ep===1||d[ep-1];
      if(!prevDone){
        state='<p class="story-state">Сначала — «'+EP[ep-1].name+'».</p>';
      }else if(effPh>=need){
        const row=lesson(ep);
        if(row&&!(row.item&&row.item.key)){
          state='<p class="story-state">Черновик есть, но пример из него однозначно не читается. Серия не засчитана. Прежние главы не стёрты.</p>';
        }else if(row&&row.level==='closed'){
          state='<p class="story-state ok">Серия собрана. Можно рассказать Тестику.</p>'; btn=actBtn('storyBack2',ep,'Вернуться к Тестику');
        }else if(row){
          state='<p class="story-state">Можно продолжить с того же места.</p>'; btn=actBtn('storyEp2',ep,'Продолжить');
        }else{
          state='<p class="story-state">Готово к делу.</p>'; btn=actBtn('storyEp2',ep,'Начать');
        }
      }else{
        state='<p class="story-state">Откроется, когда дополнение до десяти '+(need===2?'по картинке':'без рамки')+' станет привычным (сейчас этап: '+app.E.phaseName('to10',effPh)+').</p>';
        btn=BTN+'storyTrain2">Тренироваться на острове</button>';
      }
    }
    return '<li class="story-ep'+(done?' done':'')+'" data-ep="'+ep+'" tabindex="-1"><div class="story-ep-txt"><b>'+EP[ep].name+'</b><p>'+EP[ep].what+'</p>'+state+'</div>'+btn+'</li>';
  }

  function view(){
    const d=derive(), effPh=to10Phase(), locked=islandLocked();
    let h='<section class="card stage story-wrap" aria-labelledby="story-title">';
    h+='<p class="story-kicker">Большой день Сказочного Теремка · глава 2</p>';
    h+='<div class="story-hero">'+CH.pal('to10','bob','Пельмешек Тестик',d[4]?'happy':undefined)+'</div>';
    h+='<h1 id="story-title">Десять мест для встречи</h1>';
    if(d[4]){
      h+='<p class="story-say">Тестик: «Все десять мест заняты — и ни одного лишнего. Первая остановка между домами готова!»</p>';
      h+='<p class="story-next">Дальше — Желейный лес: Дракоша Желе делит припасы по двум маршрутам. Загляни к нему в лес!</p>';
    }else{
      h+='<p class="story-say">Тестик: «К празднику гости пойдут через мою остановку. Помоги: узнаем, сколько мест свободно, и разместим всех так, чтобы хватило каждому».</p>';
    }
    h+='<ol class="story-list">'+[1,2,3,4].map(ep=>epRow(ep,d,effPh,locked)).join('')+'</ol>';
    h+='<div class="row"><button type="button" class="btn ghost" data-act="map">← На карту</button></div>';
    return h+'</section>';
  }

  function focusMain(ep){
    const btn=ep&&document.querySelector('.story-wrap button[data-ep="'+ep+'"]');
    const row=!btn&&ep&&document.querySelector('.story-wrap li[data-ep="'+ep+'"]');
    const el=btn||row||document.querySelector('.story-wrap [data-act="storyHouseBack"],.story-wrap [data-act="storyBack2"],.story-wrap [data-act="storyReplay2"],.story-wrap [data-act="storyEp2"],.story-wrap [data-act="storyHouse"],.story-wrap [data-act="map"]');
    if(el)el.focus({preventScroll:true});
  }
  function open(){
    active=null;
    app.go('storyT02',{island:null});
    if(PH&&PH.heroes&&PH.heroes.to10)root.AUDIO.say(PH.heroes.to10.hello);
    focusMain();
  }

  function savedRow(a){
    if(a.replay){
      const slot=replayTry(a.ep,'closed'), old=legacyReplay(a.ep,'closed');
      if(slot&&slot.since===a.at)return slot;
      if(old&&old.since===a.at)return old;
      return null;
    }
    const row=lesson(a.ep);
    return row&&row.level==='closed'?row:null;
  }
  function seriesOf(a,row){
    const len=row&&row.len|0;
    if(!a||!row||row.level!=='closed'||row.ep!==a.ep||row.since!==a.at||row.phase!==REQ[a.ep])return null;
    if(!len||row.count!==len||!Array.isArray(row.results)||row.results.length!==len)return null;
    const pool=journal().tasks.filter(t=>t.at>=a.at&&(typeof row.at!=='number'||t.at<=row.at)&&(t.since==null||t.since===a.at)&&t.sk==='to10'&&(t.ph||1)===REQ[a.ep]);
    const picked=[];
    for(let i=0;i<len;i++){
      const atPos=pool.filter(t=>(t.pos|0)===i);
      const marked=atPos.filter(t=>t.since===a.at);
      const plain=atPos.filter(t=>t.since==null);
      const use=marked.length?marked:plain;
      if(use.length!==1||(use[0].clean?1:0)!==(row.results[i]?1:0))return null;
      picked.push(use[0]);
    }
    return picked;
  }
  function backFromSeries(){
    const a=active; active=null;
    if(a&&root.__insights){
      const row=savedRow(a);
      const qual=seriesOf(a,row);
      if(qual){
        const rec={level:'ph'+REQ[a.ep],rounds:qual.length,errors:qual.reduce((n,t)=>n+(t.w||0),0),supported:qual.filter(t=>(t.ex||0)>0||t.nl||(t.peek|0)>0).length,ep:a.ep,since:a.at};
        if(a.replay){
          if(!journal().games.some(g=>g.origin==='story-t02-replay'&&g.ep===a.ep&&g.since===a.at))root.__insights.logGame(Object.assign({game:'ten-bridge',origin:'story-t02-replay'},rec));
        }else if(!lastEntry(a.ep))root.__insights.logGame(Object.assign({game:'story-t02-'+a.ep},rec));
      }
    }
    app.go('storyT02',{island:null}); focusMain(a&&a.ep);
  }
  /* Возврат из рассадки: запись story-t02-4 повторяет фактический результат
     house, сыгранного из сцены (origin в записи журнала). */
  function backFromHouse(){
    const d=derive();
    if(!d[4]&&root.__insights){
      const he=sceneHouse();
      if(he)root.__insights.logGame({game:'story-t02-4',level:he.level,rounds:he.rounds,errors:he.errors,supported:he.supported});
    }
    app.go('storyT02',{island:null}); focusMain(4);
  }

  ext.views.storyT02=view;
  ext.acts.storyT02=open;
  function begin(ep, row, replay){
    const fresh=!row||row.level==='closed';
    active={ep,at:fresh?Date.now():row.since,replay:replay?1:0};
    app.S.storyHold=1;
    app.S.replayPhase=REQ[ep];
    app.S.resume=fresh?null:row;
    if(root.__insights&&root.__insights.bindSeries)root.__insights.bindSeries(active.at);
    app.startSession('to10');
  }
  ext.acts.storyEp2=(a)=>{ const ep=Number(a.dataset.ep); const d=derive();
    if(!REQ[ep]||d[ep])return;
    if(ep>1&&!d[ep-1])return;
    if(islandLocked())return;
    if(to10Phase()<REQ[ep])return;
    let row=lesson(ep);
    if(row&&row.level!=='closed'&&row.item&&app.lessonItem&&!app.lessonItem('to10',row.item)){ app.go('storyT02',{island:null}); return; }
    const backed=row&&journal().tasks.some(t=>t.sk==='to10'&&t.at>=row.since&&(t.ph||1)===REQ[ep]);
    if(row&&row.level==='closed'&&backed){ active={ep,at:row.since}; app.go('storyT02',{island:null}); return; }
    if(row&&row.level==='closed')row=null;
    begin(ep,row); };
  ext.acts.storyReplay2=(a)=>{ const ep=Number(a.dataset.ep); const d=derive();
    if(!REQ[ep]||!d[ep]||islandLocked()||to10Phase()<REQ[ep])return;
    const pending=pendingReplay(ep);
    if(pending&&pending.kind==='closed'){ active={ep,at:pending.row.since,replay:1}; app.go('storyT02',{island:null}); return; }
    const open=pending?pending.row:null;
    if(open&&open.item&&app.lessonItem&&!app.lessonItem('to10',open.item)){ app.go('storyT02',{island:null}); return; }
    begin(ep,open,1); };
  ext.acts.storyBack2=(a)=>{
    if(!active){
      const ep=Number(a&&a.dataset&&a.dataset.ep)||0;
      const waiting=ep?closedReplay(ep):null;
      const row=waiting||(ep&&lesson(ep)&&lesson(ep).level==='closed'&&!lastEntry(ep)?lesson(ep):null);
      if(row)active={ep:row.ep||ep,at:row.since,replay:waiting?1:0};
    }
    backFromSeries();
  };
  ext.acts.storyHouse=()=>{ const d=derive(); if(!d[1]||d[4]||sceneHouse())return;
    if(ext.acts.numberGames)ext.acts.numberGames({origin:'story-t02-4',game:'house'}); };
  /* Закрытая сцена — честный путь к штатной тренировке (без зачёта эпизода). */
  ext.acts.storyTrain2=()=>{ if(!islandLocked()){ app.S.storyHold=0; app.S.resume=null; app.S.replayPhase=0; app.startSession('to10'); } };
  chain('lessonSnap',(info)=>{
    if(!active||!info||!info.item||!info.item.key)return '';
    const replay=active.replay?1:0;
    root.__insights&&root.__insights.logGame({game:'ten-bridge',origin:replay?'story-t02-replay-draft':'story-t02-lesson',slot:(replay?'t02-replay-try-':'t02-lesson-')+pid()+'-'+active.ep,level:info.closed?'closed':'open',rounds:0,ep:active.ep,since:active.at,pid:pid(),replay:replay,
      len:info.len,phase:info.phase,count:info.count,results:info.results,item:info.item,si:info.si,wr:info.wr,kp:info.kp,clean:info.clean,done:info.done,taps:info.taps,heard:info.heard,ins:info.ins,covered:info.covered?1:0,earned:info.earned});
    return '';
  });
  ext.acts.storyHouseBack=backFromHouse;

  /* Серия, прерванная уходом с экрана заданий/перерыва, не засчитывается. */
  chain('leave',(screen)=>{ if(active&&screen!=='task'&&screen!=='break')active=null; return ''; });

  chain('islandExtra',(id)=>{
    if(id!=='to10'||!t01Done())return '';
    if(islandLocked())return '<p class="story-badge">Большой день: остров Тестика откроется после навыка Булька</p>';
    const d=derive();
    return '<button type="button" class="btn ghost" data-act="storyT02">Помочь Тестику · Большой день</button>'
      +(d[4]?'<p class="story-badge">Первая остановка готова ✓</p>':'');
  });

  chain('breakExtra',()=> active?BTN+'storyBack2">Вернуться к Тестику</button>':'');

  /* Регистрация в едином компактном чипе кампании (координатор —
     js/story-t01.js, root.__storyMap): свой чип глава больше не рисует. */
  const REG=root.__storyMap;
  if(REG)REG.items.push({
    done:()=>!!derive()[4],
    action:()=>{
      if(!t01Done())return null;
      const d=derive();
      if(d[4])return null;
      if(sceneHouse())return {act:'storyHouseBack',label:'Рассказать Тестику'};
      if(!d[1]&&!islandLocked())return {act:'storyT02',label:'Помочь Тестику'};
      return null;
    }
  });

  if(app.S.screen==='map')app.render();
})(window);

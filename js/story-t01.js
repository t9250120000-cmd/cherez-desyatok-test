/* «Большой день Сказочного Теремка» — глава T01 (Мятный луг, Бульк).
   Сюжетная обвязка существующих режимов через разрешённые точки расширения:
   ext.views/acts, hooks islandExtra/mapExtra/breakExtra/leave, __insights.logGame.
   Состояние главы — проекция существующего журнала terem_insights_v1
   (записи story-t01-*), пересчитывается на каждый рендер; отдельного ключа
   прогресса нет. terem_v3, награды, фазы и skills.done этим модулем не пишутся.
   Озвучка — только существующие записанные фразы (приветствие Булька);
   новые сюжетные тексты — экранные. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext;
  if(!app||!ext)return;
  const PH=root.PH,CH=root.CH;

  /* Черновик серии лежит в журнале. Память только указывает, какую серию
     закрывать при возврате. Угощение по-прежнему выводится из журнала. */
  let active=null;       // {ep, at, replay} — серия see из сцены

  const REQ={1:1,2:2,3:3}; // фактическая фаза заданий, необходимая эпизоду
  const EP={
    1:{name:'Кто уже пришёл?', what:'Посчитать гостей у дома — по одному, руками.'},
    2:{name:'Полный этаж', what:'Узнать, сколько гостей, по картинке: полная пятёрка и остаток.'},
    3:{name:'Короткий взгляд', what:'Запомнить гостей с первого взгляда. Картинку можно попросить ещё раз.'},
    4:{name:'Первое угощение', what:'Дать каждому гостю по ягоде и проверить, всем ли хватило.'}
  };

  function journal(){
    const I=root.__insights, p=I&&I.prof&&I.prof();
    return p&&Array.isArray(p.games)&&Array.isArray(p.tasks)?p:{games:[],tasks:[]};
  }
  function lastEntry(ep){
    const l=journal().games.filter(g=>g.game==='story-t01-'+ep);
    return l.length?l[l.length-1]:null;
  }
  function derive(){ return {1:lastEntry(1),2:lastEntry(2),3:lastEntry(3),4:lastEntry(4)}; }
  /* Угощение засчитывается только с доказанным сюжетным происхождением:
     запись feed сама несёт origin сцены (передаётся при запуске из сцены).
     Обычный feed из хаба игр после T01.1 главу не продвигает. */
  function sceneFeed(){
    const e1=lastEntry(1);
    if(!e1)return null;
    const l=journal().games.filter(g=>g.game==='feed'&&g.origin==='story-t01-4'&&g.at>e1.at);
    return l.length?l[l.length-1]:null;
  }
  function seePhase(){ const p=app.P(); const st=p&&p.skills&&p.skills.see; return st?(st.done?3:st.phase):1; }
  function pid(){ return (app.P()&&app.P().id)||''; }
  function lesson(ep){
    const credit=lastEntry(ep);
    const rows=journal().games.filter(g=>g.origin==='story-t01-lesson'&&g.ep===ep&&g.pid===pid()&&g.item&&g.item.key&&(!credit||g.since>credit.at));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayTry(ep, level){
    const slot='t01-replay-try-'+pid()+'-'+ep;
    const rows=journal().games.filter(g=>g.origin==='story-t01-replay-draft'&&g.slot===slot&&g.pid===pid()&&g.ep===ep&&(!level||g.level===level));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayCovered(ep, since, at){
    return journal().games.some(g=>g.origin==='story-t01-replay'&&g.ep===ep&&(g.since===since||(g.since==null&&at!=null&&g.at>=at)));
  }
  function legacyReplay(ep, level){
    const credit=lastEntry(ep);
    if(!credit)return null;
    const rows=journal().games.filter(g=>{
      if(!(g.origin==='story-t01-lesson'&&g.ep===ep&&g.pid===pid()&&g.item&&g.item.key&&g.since>credit.at)||(level&&g.level!==level)||replayCovered(ep,g.since,g.at))return false;
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
    const rows=journal().games.filter(g=>g.origin==='story-t01-replay'&&g.ep===ep&&(g.rounds|0)>0);
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
  function epRow(ep,d,effPh){
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
      }
      if(ep!==4){
        const pending=pendingReplay(ep);
        if(pending&&pending.kind==='closed'){ state+='<p class="story-state ok">Серия собрана. Можно рассказать Бульку.</p>'; btn=actBtn('storyBack',ep,'Вернуться к Бульку'); }
        else if(pending){ state+='<p class="story-state">Можно продолжить то же занятие.</p>'; btn=actBtn('storyReplay',ep,'Продолжить'); }
        else btn=actBtn('storyReplay',ep,'Повторить');
      }
    }else if(ep===4){
      if(e1){
        const fe=sceneFeed();
        if(fe){ state='<p class="story-state ok">Угощение раздано!</p>'; btn=BTN+'storyFeedBack">Рассказать Бульку про угощение</button>'; }
        else{ state='<p class="story-state">Гости посчитаны — можно угощать.</p>'; btn=BTN+'storyFeed">Угостить друзей</button>'; }
      }
      else state='<p class="story-state">Сначала первое дело: узнать, сколько гостей.</p>';
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
          state='<p class="story-state ok">Серия собрана. Можно рассказать Бульку.</p>'; btn=actBtn('storyBack',ep,'Вернуться к Бульку');
        }else if(row){
          state='<p class="story-state">Можно продолжить с того же места.</p>'; btn=actBtn('storyEp',ep,'Продолжить');
        }else{
          state='<p class="story-state">Готово к делу.</p>'; btn=actBtn('storyEp',ep,'Начать');
        }
      }else{
        state='<p class="story-state">Откроется, когда счёт '+(need===2?'по картинке':'с первого взгляда')+' станет привычным (сейчас этап: '+app.E.phaseName('see',effPh)+').</p>';
        btn=BTN+'storyTrain">Тренироваться на острове</button>';
      }
    }
    return '<li class="story-ep'+(done?' done':'')+'"><div class="story-ep-txt"><b>'+EP[ep].name+'</b><p>'+EP[ep].what+'</p>'+state+'</div>'+btn+'</li>';
  }

  function view(){
    const d=derive(), effPh=seePhase();
    let h='<section class="card stage story-wrap" aria-labelledby="story-title">';
    h+='<p class="story-kicker">Большой день Сказочного Теремка · глава 1</p>';
    h+='<div class="story-hero">'+CH.pal('see','bob','Слаймик Бульк',d[4]?'happy':undefined)+'</div>';
    h+='<h1 id="story-title">Дом встречает первых гостей</h1>';
    if(d[4]){
      h+='<p class="story-say">Бульк: «Гости посчитаны, и каждый получил ягоду. Дом ожил — спасибо!»</p>';
      h+='<p class="story-next">Дальше — Пряничный остров: Тестик готовит десять мест для встречи. Загляни к нему на остров!</p>';
    }else{
      h+='<p class="story-say">Бульк: «Скоро праздник! К моему дому идут гости. Помоги: узнаем, сколько их, а потом угостим каждого».</p>';
    }
    h+='<ol class="story-list">'+[1,2,3,4].map(ep=>epRow(ep,d,effPh)).join('')+'</ol>';
    h+='<div class="row"><button type="button" class="btn ghost" data-act="map">← На карту</button></div>';
    return h+'</section>';
  }

  function focusMain(ep){
    const prefer=ep&&document.querySelector('.story-wrap [data-ep="'+ep+'"]');
    const el=prefer||document.querySelector('.story-wrap [data-act="storyFeedBack"],.story-wrap [data-act="storyBack"],.story-wrap [data-act="storyReplay"],.story-wrap [data-act="storyEp"],.story-wrap [data-act="storyFeed"],.story-wrap [data-act="map"]');
    if(el)el.focus({preventScroll:true});
  }
  function open(){
    active=null;
    app.go('storyT01',{island:null});
    if(PH&&PH.heroes&&PH.heroes.see)root.AUDIO.say(PH.heroes.see.hello);
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
    const pool=journal().tasks.filter(t=>t.at>=a.at&&(typeof row.at!=='number'||t.at<=row.at)&&(t.since==null||t.since===a.at)&&t.sk==='see'&&(t.ph||1)===REQ[a.ep]);
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
          if(!journal().games.some(g=>g.origin==='story-t01-replay'&&g.ep===a.ep&&g.since===a.at))root.__insights.logGame(Object.assign({game:'ten-bridge',origin:'story-t01-replay'},rec));
        }else if(!lastEntry(a.ep))root.__insights.logGame(Object.assign({game:'story-t01-'+a.ep},rec));
      }
    }
    app.go('storyT01',{island:null}); focusMain(a&&a.ep);
  }
  /* Возврат из угощения: запись story-t01-4 повторяет фактический результат
     feed, разданного из сцены (origin в записи журнала). */
  function backFromFeed(){
    const d=derive();
    if(!d[4]&&root.__insights){
      const fe=sceneFeed();
      if(fe)root.__insights.logGame({game:'story-t01-4',level:fe.level,rounds:fe.rounds,errors:fe.errors,supported:fe.supported});
    }
    app.go('storyT01',{island:null}); focusMain();
  }

  ext.views.storyT01=view;
  ext.acts.storyT01=open;
  function begin(ep, row, replay){
    const fresh=!row||row.level==='closed';
    active={ep,at:fresh?Date.now():row.since,replay:replay?1:0};
    app.S.storyHold=1;
    app.S.replayPhase=REQ[ep];
    app.S.resume=fresh?null:row;
    if(root.__insights&&root.__insights.bindSeries)root.__insights.bindSeries(active.at);
    app.startSession('see');
  }
  ext.acts.storyEp=(a)=>{ const ep=Number(a.dataset.ep); const d=derive();
    if(!REQ[ep]||d[ep])return;
    if(ep>1&&!d[ep-1])return;
    if(seePhase()<REQ[ep])return;
    let row=lesson(ep);
    if(row&&row.level!=='closed'&&row.item&&app.lessonItem&&!app.lessonItem('see',row.item)){ app.go('storyT01',{island:null}); return; }
    const backed=row&&journal().tasks.some(t=>t.sk==='see'&&t.at>=row.since&&(t.ph||1)===REQ[ep]);
    if(row&&row.level==='closed'&&backed){ active={ep,at:row.since}; app.go('storyT01',{island:null}); return; }
    if(row&&row.level==='closed')row=null;
    begin(ep,row); };
  ext.acts.storyReplay=(a)=>{ const ep=Number(a.dataset.ep); const d=derive();
    if(!REQ[ep]||!d[ep]||seePhase()<REQ[ep])return;
    const pending=pendingReplay(ep);
    if(pending&&pending.kind==='closed'){ active={ep,at:pending.row.since,replay:1}; app.go('storyT01',{island:null}); return; }
    const open=pending?pending.row:null;
    if(open&&open.item&&app.lessonItem&&!app.lessonItem('see',open.item)){ app.go('storyT01',{island:null}); return; }
    begin(ep,open,1); };
  ext.acts.storyBack=(a)=>{
    if(!active){
      const ep=Number(a&&a.dataset&&a.dataset.ep)||0;
      const waiting=ep?closedReplay(ep):null;
      const row=waiting||(ep&&lesson(ep)&&lesson(ep).level==='closed'&&!lastEntry(ep)?lesson(ep):null);
      if(row)active={ep:row.ep||ep,at:row.since,replay:waiting?1:0};
    }
    backFromSeries();
  };
  ext.acts.storyFeed=()=>{ const d=derive(); if(!d[1]||d[4]||sceneFeed())return;
    if(ext.acts.foundations)ext.acts.foundations({origin:'story-t01-4'}); };
  /* Закрытая сцена — честный путь к штатной тренировке (без зачёта эпизода). */
  ext.acts.storyTrain=()=>{ app.S.storyHold=0; app.S.resume=null; app.S.replayPhase=0; app.startSession('see'); };
  chain('lessonSnap',(info)=>{
    if(!active||!info||!info.item||!info.item.key)return '';
    const replay=active.replay?1:0;
    root.__insights&&root.__insights.logGame({game:'ten-bridge',origin:replay?'story-t01-replay-draft':'story-t01-lesson',slot:(replay?'t01-replay-try-':'t01-lesson-')+pid()+'-'+active.ep,level:info.closed?'closed':'open',rounds:0,ep:active.ep,since:active.at,pid:pid(),replay:replay,
      len:info.len,phase:info.phase,count:info.count,results:info.results,item:info.item,si:info.si,wr:info.wr,kp:info.kp,clean:info.clean,done:info.done,taps:info.taps,heard:info.heard,ins:info.ins,covered:info.covered?1:0,earned:info.earned});
    return '';
  });
  ext.acts.storyFeedBack=backFromFeed;

  /* Серия, прерванная уходом с экрана заданий/перерыва, не засчитывается. */
  chain('leave',(screen)=>{ if(active&&screen!=='task'&&screen!=='break')active=null; return ''; });

  chain('islandExtra',(id)=>{
    if(id!=='see')return '';
    const d=derive();
    return '<button type="button" class="btn ghost" data-act="storyT01">Помочь Бульку · Большой день</button>'
      +(d[4]?'<p class="story-badge">Дом встретил первых гостей ✓</p>':'');
  });

  /* Единый компактный чип кампании на карте (регрессия 320×844: отдельные
     чипы глав нарастали поверх карты и закрывали заголовок, профиль и
     острова). Все главы регистрируются в root.__storyMap; координатор
     (здесь, в первой загруженной главе) рисует НЕ БОЛЕЕ ОДНОГО чипа:
     приоритет — ожидающий отчёт, затем приглашение следующей главы,
     иначе сводка «N/7 глав ✓». Детали по островам остаются в шторках
     островов (story-badge). */
  const REG=root.__storyMap=root.__storyMap||{items:[]};
  REG.items.push({
    done:()=>!!derive()[4],
    action:()=>{
      const d=derive();
      if(d[4])return null;
      if(sceneFeed())return {act:'storyFeedBack',label:'Рассказать Бульку'};
      if(!d[1])return {act:'storyT01',label:'Помочь Бульку'};
      return null;
    }
  });

  chain('breakExtra',()=> active?BTN+'storyBack">Вернуться к Бульку</button>':'');

  chain('mapExtra',()=>{
    const items=REG.items;
    let done=0,action=null;
    for(const it of items){try{if(it.done())done++;}catch(e){}}
    for(const it of items){try{const a=it.action&&it.action();if(a){action=a;break;}}catch(e){}}
    let yard='';
    for(const it of items){try{if(it.yard)yard+=it.yard()||'';}catch(e){}}
    if(!done&&!action&&!yard)return '';
    const count=done?'<span class="story-chip-count" aria-label="Большой день: '+done+' из 7 глав готово">'+done+'/7</span>':'';
    let h='';
    if(action)h+='<p class="story-chip" role="status">'+count+'<button type="button" class="btn" data-act="'+action.act+'">'+action.label+' →</button></p>';
    else if(done)h+='<p class="story-chip ok" role="status" aria-label="Большой день: готово '+done+' глав из 7">Большой день: '+done+'/7 глав ✓</p>';
    if(yard||done)h+='<details class="map-board"><summary>Площадка</summary><img class="map-board-art" src="art/fest-isle.webp" alt="">'+(done?'<p>Большой день: '+done+' из 7.</p>':'')+yard+'</details>';
    return h;
  });

  root.layoutMapSide=function(){
    const map=document.querySelector('.mapwrap');
    if(!map||!app.S||app.S.screen!=='map')return;
    const wide=window.matchMedia('(min-width:1100px)').matches;
    let side=document.querySelector('.map-side');
    if(wide){
      if(!side){ side=document.createElement('aside'); side.className='map-side'; side.setAttribute('aria-label','Площадка'); map.parentNode.insertBefore(side, map.nextSibling); }
      ['.story-chip','.map-board','.daily-chip','.facts-fab'].forEach(sel=>{ const n=document.querySelector(sel); if(n) side.appendChild(n); });
      const board=side.querySelector('.map-board'); if(board) board.open=true;
    }else if(side){
      ['.story-chip','.map-board','.daily-chip','.facts-fab'].forEach(sel=>{ const n=side.querySelector(sel); if(n) map.appendChild(n); });
      side.remove();
    }
  };
  if(window.addEventListener)window.addEventListener('resize',()=>{ if(root.layoutMapSide) root.layoutMapSide(); });
  if(app.S.screen==='map')app.render();
  if(document.addEventListener)document.addEventListener('keydown',function(e){
    if(!app.S||!app.S.storyLesson||e.key!=='Enter')return;
    const t=e.target;
    if(!t||!t.closest||!t.closest('button,a,[role="button"]'))return;
    if(e.stopPropagation)e.stopPropagation();
  },true);
})(window);

/* «Большой день Сказочного Теремка» — глава T03 (Желейный лес, Дракоша Желе).
   Тот же проверенный каркас обвязки, что у T01/T02 (js/story-t01.js,
   js/story-t02.js): только разрешённые точки ext.views/acts, hooks
   islandExtra/breakExtra/leave, регистрация в едином чипе карты
   (root.__storyMap, координатор в story-t01.js), журнал __insights.logGame.
   Состояние главы — проекция журнала terem_insights_v1 (записи story-t03-*),
   отдельного ключа нет; terem_v3, награды, фазы и skills.done этим модулем
   не пишутся. E1/E2 — серии движка split из сцены; E3 «Другой способ» и
   E4 «Заказ двум друзьям» — предметные сцены существующей игры
   «Две корзинки» (split-baskets, уровни again/order) с origin сцены; записи
   без origin сцены и старые записи hidden-part сцене не засчитываются.
   Озвучка — только существующая записанная фраза (приветствие Желе). */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext;
  if(!app||!ext)return;
  const PH=root.PH,CH=root.CH;

  let active=null;       // {ep, at} — серия движка split из сцены (E1/E2)

  const REQ={1:1,2:2}; // фаза заданий движка нужна только сериям E1/E2
  const EP={
    1:{name:'Две корзинки', what:'Разделить припасы на две корзинки без потерь — по одному, руками.'},
    2:{name:'Закрытая корзинка', what:'По целому и видимой части узнать, сколько в закрытой корзинке.'},
    3:{name:'Другой способ', what:'То же число — другая пара. Посмотри, что уже собрано, и разложи иначе: три разных способа подряд.'},
    4:{name:'Заказ двум друзьям', what:'Бульку — ровно по заказу, Тестику — точный остаток. Собери обе корзинки и проверь доставку.'}
  };

  function journal(){
    const I=root.__insights, p=I&&I.prof&&I.prof();
    return p&&Array.isArray(p.games)&&Array.isArray(p.tasks)?p:{games:[],tasks:[]};
  }
  function entries(ep){ return journal().games.filter(g=>g.game==='story-t03-'+ep); }
  function lastEntry(ep){ const l=entries(ep); return l.length?l[l.length-1]:null; }
  /* E1/E2 — проекция серии движка. E3/E4 закрыты только парой: сырая
     split-baskets (origin + уровень) после предыдущего эпизода и запись
     story-t03-N с тем же уровнем строго позже. Старый story-id сам главу не закрывает. */
  function rawScene(ep,level,afterAt){
    const l=journal().games.filter(g=>g.game==='split-baskets'&&g.origin==='story-t03-'+ep&&g.level===level&&g.at>afterAt);
    return l.length?l[l.length-1]:null;
  }
  function proven(ep,level,after){
    if(!after)return null;
    const raws=journal().games.filter(g=>g.game==='split-baskets'&&g.origin==='story-t03-'+ep&&g.level===level&&g.at>after.at);
    const credits=entries(ep).filter(g=>g.level===level&&g.at>after.at);
    let found=null;
    credits.forEach(c=>{ if(raws.some(r=>r.at<c.at))found=c; });
    return found;
  }
  function sceneRaw(ep,level,after){
    if(!after)return null;
    const done=proven(ep,level,after);
    const raws=journal().games.filter(g=>g.game==='split-baskets'&&g.origin==='story-t03-'+ep&&g.level===level&&g.at>after.at);
    if(done){ const paired=raws.filter(r=>r.at<done.at); return paired.length?paired[paired.length-1]:null; }
    return raws.length?raws[raws.length-1]:null;
  }
  function sceneAgain(){ const e2=lastEntry(2); return sceneRaw(3,'again',e2); }
  function sceneOrder(){ const e3=derive()[3]; return sceneRaw(4,'order',e3); }
  function derive(){
    const e1=lastEntry(1), e2=lastEntry(2);
    const e3=proven(3,'again',e2);
    return {1:e1,2:e2,3:e3,4:proven(4,'order',e3)};
  }
  function prior(ep,level){
    const l=entries(ep).filter(g=>g.level!==level);
    return l.length?l[l.length-1]:null;
  }
  /* Вход в главу — после T02 этого же профиля (журнал профильный). */
  function t02Done(){ return journal().games.some(g=>g.game==='story-t02-4'); }
  /* Остров split может быть ещё закрыт правилом карты — тогда честно говорим,
     что сначала осваиваем десяток у Тестика, и серии не предлагаем. */
  function islandLocked(){
    const p=app.P(), s=app.E.SK.split;
    return !!(p&&s&&app.E.SK[p.cur].n<s.n&&!p.skills.split.done);
  }
  /* Сырая split-baskets с origin и уровнем сцены. Игра из хаба и старый
     hidden-part главу не продвигают. Сданный заказ не смотрит более поздний
     сырой заход, у которого ещё нет своего зачёта. */
  /* Две корзины на карте и в главе — только из подтверждённого order.
     Старый hidden-part сюда не попадает: для него derive()[4] пуст.
     Числа берём из deliveries той же записи; без них корзины есть, выдуманного остатка нет. */
  function drops(){
    const done=derive()[4];
    if(!done)return '';
    const raw=sceneOrder();
    const packs=Array.isArray(done.deliveries)?done.deliveries:(raw&&Array.isArray(raw.deliveries)?raw.deliveries:null);
    const spoken=ns=>ns.length<2?String(ns[0]):ns.slice(0,-1).join(', ')+' и '+ns[ns.length-1];
    const cell=(who,id,ns)=>{
      const label=who+(ns?`, три корзины: ${spoken(ns)}`:', корзина доставлена');
      return '<div class="story-drop" tabindex="0" role="group" aria-label="'+label+'">'+(CH?CH.pal(id,'np-pal',who):'')+'<span class="story-drop-txt"><b>'+who+'</b>'+(ns?'<span>'+spoken(ns)+'</span>':'')+'</span></div>';
    };
    const body=packs&&packs.length?cell('Бульк','see',packs.map(p=>p[0]))+cell('Тестик','to10',packs.map(p=>p[1])):cell('Бульк','see',null)+cell('Тестик','to10',null);
    return '<div class="story-drops">'+body+'</div>';
  }
  function splitPhase(){ const p=app.P(); const st=p&&p.skills&&p.skills.split; return st?(st.done?3:st.phase):1; }
  function pid(){ return (app.P()&&app.P().id)||''; }
  function lesson(ep){
    const credit=lastEntry(ep);
    const rows=journal().games.filter(g=>g.origin==='story-t03-lesson'&&g.ep===ep&&g.pid===pid()&&g.item&&g.item.key&&(!credit||g.since>credit.at));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayTry(ep, level){
    const slot='t03-replay-try-'+pid()+'-'+ep;
    const rows=journal().games.filter(g=>g.origin==='story-t03-replay-draft'&&g.slot===slot&&g.pid===pid()&&g.ep===ep&&(!level||g.level===level));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayCovered(ep, since, at){
    return journal().games.some(g=>g.origin==='story-t03-replay'&&g.ep===ep&&(g.since===since||(g.since==null&&at!=null&&g.at>=at)));
  }
  function legacyReplay(ep, level){
    const credit=lastEntry(ep);
    if(!credit)return null;
    const rows=journal().games.filter(g=>{
      if(!(g.origin==='story-t03-lesson'&&g.ep===ep&&g.pid===pid()&&g.item&&g.item.key&&g.since>credit.at)||(level&&g.level!==level)||replayCovered(ep,g.since,g.at))return false;
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
    const rows=journal().games.filter(g=>g.origin==='story-t03-replay'&&g.ep===ep&&(g.rounds|0)>0);
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
      const indep=done.rounds-(done.supported||0);
      if(ep>2) state='<p class="story-state ok">Сделано: заданий '+done.rounds+(done.errors?', ошибок '+done.errors:', без ошибок')+'; самостоятельно '+indep+((done.supported||0)>0?', с подсказкой '+done.supported:'')+'</p>';
      else{
        state=resultLine('Первый раз',done);
        const again=creditedReplay(ep);
        if(again)state+=resultLine('Последний повтор',again);
        const pending=pendingReplay(ep);
        if(pending&&pending.kind==='closed'){ state+='<p class="story-state ok">Серия собрана. Можно рассказать Желе.</p>'; btn=actBtn('storyBack3',ep,'Вернуться к Желе'); }
        else if(pending){ state+='<p class="story-state">Можно продолжить то же занятие.</p>'; btn=actBtn('storyReplay3',ep,'Продолжить'); }
        else btn=actBtn('storyReplay3',ep,'Повторить');
      }
    }else if(ep===3){
      if(!e1)state='<p class="story-state">Сначала первое дело: разделить припасы без потерь.</p>';
      else if(!d[2])state='<p class="story-state">Сначала — «'+EP[2].name+'».</p>';
      else{
        const ae=sceneAgain();
        const old=prior(3,'again');
        const was=old?'<p class="story-state">Раньше здесь было другое дело: заданий '+old.rounds+(old.errors?', ошибок '+old.errors:', без ошибок')+'. Новый способ ещё не сыгран.</p>':'';
        if(ae){ state=was+'<p class="story-state ok">Три разных способа собраны!</p>'; btn=BTN+'storyAgainBack">Рассказать Желе</button>'; }
        else{ state=(was||'<p class="story-state">Корзинки посчитаны — можно искать другой способ.</p>'); btn=BTN+'storyAgain">Найти другой способ</button>'; }
      }
    }else if(ep===4){
      if(!e1)state='<p class="story-state">Сначала первое дело: разделить припасы без потерь.</p>';
      else if(!d[3])state='<p class="story-state">Сначала — «'+EP[3].name+'».</p>';
      else{
        const oe=sceneOrder();
        const old=prior(4,'order');
        const was=old?'<p class="story-state">Раньше здесь было другое дело: заданий '+old.rounds+(old.errors?', ошибок '+old.errors:', без ошибок')+'. Новая доставка ещё не сыграна.</p>':'';
        if(oe){ state=was+'<p class="story-state ok">Заказ собран: у Булька и Тестика есть припасы!</p>'; btn=BTN+'storyOrderBack">Рассказать Желе о доставке</button>'; }
        else{ state=(was||'<p class="story-state">Разные способы известны — можно собирать заказ друзьям.</p>'); btn=BTN+'storyOrder">Собрать заказ</button>'; }
      }
    }else if(locked){
      state='<p class="story-state">Лес ещё закрыт: сначала освой десяток у Тестика на Пряничном острове.</p>';
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
          state='<p class="story-state ok">Серия собрана. Можно рассказать Желе.</p>'; btn=actBtn('storyBack3',ep,'Вернуться к Желе');
        }else if(row){
          state='<p class="story-state">Можно продолжить с того же места.</p>'; btn=actBtn('storyEp3',ep,'Продолжить');
        }else{
          state='<p class="story-state">Готово к делу.</p>'; btn=actBtn('storyEp3',ep,'Начать');
        }
      }else{
        state='<p class="story-state">Откроется, когда разбиение чисел '+(need===2?'по картинке':'без рамки')+' станет привычным (сейчас этап: '+app.E.phaseName('split',effPh)+').</p>';
        btn=BTN+'storyTrain3">Тренироваться на острове</button>';
      }
    }
    return '<li class="story-ep'+(done?' done':'')+'" data-ep="'+ep+'" tabindex="-1"><div class="story-ep-txt"><b>'+EP[ep].name+'</b><p>'+EP[ep].what+'</p>'+state+'</div>'+btn+'</li>';
  }

  function view(){
    const d=derive(), effPh=splitPhase(), locked=islandLocked();
    let h='<section class="card stage story-wrap" aria-labelledby="story-title">';
    h+='<p class="story-kicker">Большой день Сказочного Теремка · глава 3</p>';
    h+='<div class="story-hero">'+CH.pal('split','bob','Дракоша Желе',d[4]?'happy':undefined)+'</div>';
    h+='<h1 id="story-title">Припасы по двум маршрутам</h1>';
    h+='<img class="np-fork-art" src="art/jelly-fork.webp" alt="Развилка: слева дом Булька, справа мельница Тестика">';
    if(d[4]){
      h+='<p class="story-say">Желе: «Две корзины дошли: у Булька и Тестика есть припасы к празднику. Желейный лес готов к большому дню!»</p>';
      h+=drops();
      h+='<p class="story-next">Дальше — Королевство: Король Пельмень собирает гостей десятками. Загляни к нему на остров.</p>';
    }else{
      h+='<p class="story-say">Желе: «К празднику припасы идут по двум маршрутам — к Бульку и к Тестику. Помоги: разделим ягоды без потерь и узнаем, сколько в каждой корзинке».</p>';
    }
    h+='<ol class="story-list">'+[1,2,3,4].map(ep=>epRow(ep,d,effPh,locked)).join('')+'</ol>';
    h+='<div class="row"><button type="button" class="btn ghost" data-act="map">← На карту</button></div>';
    return h+'</section>';
  }

  function focusMain(ep){
    const btn=ep&&document.querySelector('.story-wrap button[data-ep="'+ep+'"]');
    const row=!btn&&ep&&document.querySelector('.story-wrap li[data-ep="'+ep+'"]');
    const el=btn||row||document.querySelector('.story-wrap [data-act="storyOrderBack"],.story-wrap [data-act="storyAgainBack"],.story-wrap [data-act="storyBack3"],.story-wrap [data-act="storyReplay3"],.story-wrap [data-act="storyEp3"],.story-wrap [data-act="storyAgain"],.story-wrap [data-act="storyOrder"],.story-wrap [data-act="map"]');
    if(el)el.focus({preventScroll:true});
  }
  function open(){
    active=null;
    app.go('storyT03',{island:null});
    if(PH&&PH.heroes&&PH.heroes.split)root.AUDIO.say(PH.heroes.split.hello);
    focusMain();
  }

  /* Возврат из серии движка: засчитываем эпизод только по фактическим
     заданиям НУЖНОЙ фазы из журнала — требуется минимум два таких задания;
     самостоятельный результат хранится отдельно от поддержанного. */
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
    const pool=journal().tasks.filter(t=>t.at>=a.at&&(typeof row.at!=='number'||t.at<=row.at)&&(t.since==null||t.since===a.at)&&t.sk==='split'&&(t.ph||1)===REQ[a.ep]);
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
          if(!journal().games.some(g=>g.origin==='story-t03-replay'&&g.ep===a.ep&&g.since===a.at))root.__insights.logGame(Object.assign({game:'ten-bridge',origin:'story-t03-replay'},rec));
        }else if(!lastEntry(a.ep))root.__insights.logGame(Object.assign({game:'story-t03-'+a.ep},rec));
      }
    }
    app.go('storyT03',{island:null}); focusMain(a&&a.ep);
  }
  /* Возврат из сценарной игры: запись story-t03-N повторяет фактический
     результат split-baskets, сыгранного из сцены (origin и уровень в записи
     журнала). Без фактической записи эпизод не засчитывается. */
  function backFromScene(ep,sceneFn){
    const d=derive();
    if(!d[ep]&&root.__insights){
      const se=sceneFn();
      if(se){const rec={game:'story-t03-'+ep,level:se.level,rounds:se.rounds,errors:se.errors,supported:se.supported};
        if(Array.isArray(se.deliveries))rec.deliveries=se.deliveries;
        root.__insights.logGame(rec);}
    }
    app.go('storyT03',{island:null}); focusMain(ep);
  }

  ext.views.storyT03=view;
  ext.acts.storyT03=open;
  function begin(ep, row, replay){
    const fresh=!row||row.level==='closed';
    active={ep,at:fresh?Date.now():row.since,replay:replay?1:0};
    app.S.storyHold=1;
    app.S.replayPhase=REQ[ep];
    app.S.resume=fresh?null:row;
    if(root.__insights&&root.__insights.bindSeries)root.__insights.bindSeries(active.at);
    app.startSession('split');
  }
  ext.acts.storyEp3=(a)=>{ const ep=Number(a.dataset.ep); const d=derive();
    if(!REQ[ep]||d[ep])return;
    if(ep>1&&!d[ep-1])return;
    if(islandLocked())return;
    if(splitPhase()<REQ[ep])return;
    let row=lesson(ep);
    if(row&&row.level!=='closed'&&row.item&&app.lessonItem&&!app.lessonItem('split',row.item)){ app.go('storyT03',{island:null}); return; }
    const backed=row&&journal().tasks.some(t=>t.sk==='split'&&t.at>=row.since&&(t.ph||1)===REQ[ep]);
    if(row&&row.level==='closed'&&backed){ active={ep,at:row.since}; app.go('storyT03',{island:null}); return; }
    if(row&&row.level==='closed')row=null;
    begin(ep,row); };
  ext.acts.storyReplay3=(a)=>{ const ep=Number(a.dataset.ep); const d=derive();
    if(!REQ[ep]||!d[ep]||islandLocked()||splitPhase()<REQ[ep])return;
    const pending=pendingReplay(ep);
    if(pending&&pending.kind==='closed'){ active={ep,at:pending.row.since,replay:1}; app.go('storyT03',{island:null}); return; }
    const open=pending?pending.row:null;
    if(open&&open.item&&app.lessonItem&&!app.lessonItem('split',open.item)){ app.go('storyT03',{island:null}); return; }
    begin(ep,open,1); };
  ext.acts.storyBack3=(a)=>{
    if(!active){
      const ep=Number(a&&a.dataset&&a.dataset.ep)||0;
      const waiting=ep?closedReplay(ep):null;
      const row=waiting||(ep&&lesson(ep)&&lesson(ep).level==='closed'&&!lastEntry(ep)?lesson(ep):null);
      if(row)active={ep:row.ep||ep,at:row.since,replay:waiting?1:0};
    }
    backFromSeries();
  };
  ext.acts.storyAgain=()=>{ const d=derive(); if(!d[2]||d[3]||sceneAgain())return;
    if(root.__numberPlay)root.__numberPlay.open('split-baskets','story-t03-3','again'); };
  ext.acts.storyOrder=()=>{ const d=derive(); if(!d[3]||d[4]||sceneOrder())return;
    if(root.__numberPlay)root.__numberPlay.open('split-baskets','story-t03-4','order'); };
  /* Закрытая сцена — честный путь к штатной тренировке (без зачёта эпизода). */
  ext.acts.storyTrain3=()=>{ if(!islandLocked()){ app.S.storyHold=0; app.S.resume=null; app.S.replayPhase=0; app.startSession('split'); } };
  chain('lessonSnap',(info)=>{
    if(!active||!info||!info.item||!info.item.key)return '';
    const replay=active.replay?1:0;
    root.__insights&&root.__insights.logGame({game:'ten-bridge',origin:replay?'story-t03-replay-draft':'story-t03-lesson',slot:(replay?'t03-replay-try-':'t03-lesson-')+pid()+'-'+active.ep,level:info.closed?'closed':'open',rounds:0,ep:active.ep,since:active.at,pid:pid(),replay:replay,
      len:info.len,phase:info.phase,count:info.count,results:info.results,item:info.item,si:info.si,wr:info.wr,kp:info.kp,clean:info.clean,done:info.done,taps:info.taps,heard:info.heard,ins:info.ins,covered:info.covered?1:0,earned:info.earned});
    return '';
  });
  ext.acts.storyAgainBack=()=>backFromScene(3,sceneAgain);
  ext.acts.storyOrderBack=()=>backFromScene(4,sceneOrder);

  /* Серия, прерванная уходом с экрана заданий/перерыва, не засчитывается. */
  chain('leave',(screen)=>{ if(active&&screen!=='task'&&screen!=='break')active=null; return ''; });

  chain('islandExtra',(id)=>{
    if(id!=='split'||!t02Done())return '';
    if(islandLocked())return '<p class="story-badge">Большой день: лес Желе откроется после навыка Тестика</p>';
    const d=derive();
    return '<button type="button" class="btn ghost" data-act="storyT03">Помочь Желе · Большой день</button>'
      +(d[4]?'<p class="story-badge">Припасы дошли по двум маршрутам ✓</p>'+drops():'');
  });

  chain('breakExtra',()=> active?BTN+'storyBack3">Вернуться к Желе</button>':'');

  /* Регистрация в едином компактном чипе кампании (координатор —
     js/story-t01.js, root.__storyMap): свой чип глава больше не рисует.
     Ожидающих отчётов может быть два (E3 и E4) — приоритет у доставки. */
  const REG=root.__storyMap;
  if(REG)REG.items.push({
    done:()=>!!derive()[4],
    yard:()=>drops(),
    action:()=>{
      if(!t02Done())return null;
      const d=derive();
      if(d[4])return null;
      if(sceneOrder())return {act:'storyOrderBack',label:'Рассказать Желе'};
      if(sceneAgain())return {act:'storyAgainBack',label:'Рассказать Желе'};
      if(!d[1]&&!islandLocked())return {act:'storyT03',label:'Помочь Желе'};
      return null;
    }
  });

  chain('mapExtra',()=>'');

  if(app.S.screen==='map')app.render();
})(window);

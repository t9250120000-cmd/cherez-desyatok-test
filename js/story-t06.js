/* «Большой день» — глава T06 (Гномья гора, Хинкалик).
   Вызов: index.html после story-t05.js. Отдельного модуля главы раньше не было.
   E1–E3 — занятия sub той же оболочки и контракта storyHold.
   E4 читает итог T05 из terem_insights_v1. Один черновик на слот. Нового ключа нет. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext;
  if(!app||!ext)return;
  const PH=root.PH,CH=root.CH;
  const REQ={1:1,2:2,3:3};
  const EP={
    1:{name:'Сначала убрать до десяти', what:'Руками убери единицы до полного десятка, затем назови остаток вычитаемого.'},
    2:{name:'Что ушло?', what:'По картинке свяжи, сколько было, сколько убрали и сколько осталось.'},
    3:{name:'Проверь расчёт', what:'Новый пример в уме. Модель — только если попросить.'},
    4:{name:'Два рейса', what:'Сам погрузи первый рейс и отправь. Потом из остатка собери второй другому герою.'}
  };
  function journal(){
    const I=root.__insights, p=I&&I.prof&&I.prof();
    return p&&Array.isArray(p.games)&&Array.isArray(p.tasks)?p:{games:[],tasks:[]};
  }
  function entries(ep){ return journal().games.filter(g=>g.game==='story-t06-'+ep); }
  function lastEntry(ep){ const l=entries(ep); return l.length?l[l.length-1]:null; }
  function fact(level, afterAt){
    const l=journal().games.filter(g=>g.game==='ten-bridge'&&g.origin==='story-t06-4'&&g.level===level&&g.at>afterAt);
    return l.length?l[l.length-1]:null;
  }
  function t05Credit(){
    const g=journal().games;
    const e3=g.filter(x=>x.game==='story-t05-3'); const e3l=e3.length?e3[e3.length-1]:null;
    if(!e3l)return null;
    const raw=g.filter(x=>x.game==='ten-bridge'&&x.origin==='story-t05-4'&&x.level==='meet-guests'&&x.at>e3l.at);
    const r=raw.length?raw[raw.length-1]:null;
    if(!r)return null;
    const credit=g.filter(x=>x.game==='story-t05-4'&&x.level==='meet-guests'&&x.at>r.at);
    return credit.length?credit[credit.length-1]:null;
  }
  function stockOf(){ const c=t05Credit(); return c&&c.guests>1?c.guests:0; }
  function seatsOf(){ const c=t05Credit(); return c&&c.seats>0?c.seats:0; }
  function trip1(after){ return after?fact('trip-1',after.at):null; }
  function trip2(step){ return step?fact('trip-2',step.at):null; }
  function proven(after){
    const raw=trip2(trip1(after));
    if(!raw)return null;
    const credit=entries(4).filter(g=>g.level==='two-trips'&&g.at>raw.at);
    return credit.length?credit[credit.length-1]:null;
  }
  function derive(){ return {1:lastEntry(1),2:lastEntry(2),3:lastEntry(3),4:proven(lastEntry(3))}; }
  function subPhase(){ const p=app.P(); const st=p&&p.skills&&p.skills.sub; return st?(st.done?3:st.phase):1; }
  function pid(){ return (app.P()&&app.P().id)||''; }
  function islandLocked(){
    const p=app.P(), s=app.E.SK.sub;
    return !!(p&&s&&app.E.SK[p.cur].n<s.n&&!p.skills.sub.done);
  }
  function lesson(ep){
    const credit=lastEntry(ep);
    const rows=journal().games.filter(g=>g.origin==='story-t06-lesson'&&g.ep===ep&&g.pid===pid()&&g.item&&g.item.key&&(!credit||g.since>credit.at));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayTry(ep, level){
    const slot='t06-replay-try-'+pid()+'-'+ep;
    const rows=journal().games.filter(g=>g.origin==='story-t06-replay-draft'&&g.slot===slot&&g.pid===pid()&&g.ep===ep&&(!level||g.level===level));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayCovered(ep, since, at){
    return journal().games.some(g=>g.origin==='story-t06-replay'&&g.ep===ep&&(g.since===since||(g.since==null&&at!=null&&g.at>=at)));
  }
  function legacyReplay(ep, level){
    const credit=lastEntry(ep);
    if(!credit)return null;
    const rows=journal().games.filter(g=>{
      if(!(g.origin==='story-t06-lesson'&&g.ep===ep&&g.pid===pid()&&g.item&&g.item.key&&g.since>credit.at)||(level&&g.level!==level)||replayCovered(ep,g.since,g.at))return false;
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
  function pendingReplay(ep){
    const open=openReplay(ep), closed=closedReplay(ep);
    if(closed&&(!open||(closed.at||0)>=(open.at||0)))return {kind:'closed',row:closed};
    if(open)return {kind:'open',row:open};
    return null;
  }
  let active=null;
  function planOf(stock){
    const salt=(t05Credit()||{}).at|0;
    const recent=journal().tasks.filter(t=>t.sk==='sub');
    const ban=recent.length?(recent[recent.length-1].s|0):0;
    const opts=[8,7,9,6,5].filter(n=>n>0&&n<stock&&stock-n>0&&n!==ban);
    return opts.length?opts[Math.abs(salt)%opts.length]:Math.max(1,stock-1);
  }
  let hand={loaded:0,sent1:0,sent2:0,stock:0,plan:0,named:0,namedOk:false,errors:0,help:false,ok:false,goal:'',msg:'',stamp:''};
  function stage(){
    const e3=lastEntry(3);
    if(!e3||derive()[4]||!stockOf())return 'done';
    if(trip2(trip1(e3)))return 'tell';
    const d=latestDraft();
    if(d&&d.goal==='two')return 'two';
    if(trip1(e3))return 'two';
    return 'one';
  }
  function latestDraft(){
    const rows=journal().games.filter(g=>g.slot==='t06-e4-'+pid()&&g.level==='draft');
    return rows.length?rows[rows.length-1]:null;
  }
  function syncHand(){
    const st=stage();
    if(st!=='one'&&st!=='two'){hand.stamp='';return;}
    const stock=stockOf(), stamp=pid()+'|'+stock+'|'+st;
    if(hand.stamp===stamp)return;
    const d=latestDraft();
    if(d&&d.goal===st&&d.stock===stock){
      hand={loaded:d.loaded|0,sent1:d.sent1|0,sent2:d.sent2|0,stock,plan:d.plan|0,named:d.named|0,namedOk:!!d.namedOk,errors:d.errors|0,help:!!d.supported,ok:!!d.checked,goal:d.goal,msg:d.msg||'',stamp};
    }else{
      const sent=trip1(lastEntry(3));
      hand={loaded:0,sent1:sent?sent.n|0:0,sent2:0,stock,plan:sent?sent.n|0:planOf(stock),named:0,namedOk:false,errors:0,help:false,ok:false,goal:st,msg:'',stamp};
    }
  }
  function saveDraft(){
    if(!root.__insights||!hand.goal)return;
    root.__insights.logGame({game:'ten-bridge',origin:'story-t06-4',level:'draft',slot:'t06-e4-'+pid(),rounds:0,errors:hand.errors,supported:hand.help?1:0,
      loaded:hand.loaded,sent1:hand.sent1,sent2:hand.sent2,stock:hand.stock,plan:hand.plan,named:hand.named,namedOk:hand.namedOk?1:0,goal:hand.goal,checked:hand.ok?1:0,msg:hand.ok||hand.namedOk?hand.msg:''});
  }
  function dots(n,cls){ return Array.from({length:Math.max(0,n)},()=>'<i class="story-piece '+cls+'"></i>').join(''); }
  function pack(n,cls){
    n=Math.max(0,n|0);
    const tens=Math.floor(n/10), rest=n%10;
    let h='';
    for(let i=0;i<tens;i++)h+='<div class="story-bundle full" aria-hidden="true">'+dots(10,cls)+'</div>';
    if(rest)h+='<div class="story-bundle" aria-hidden="true">'+dots(rest,cls)+'</div>';
    if(!tens&&!rest)h='<p class="story-badge">пусто</p>';
    return h;
  }
  function lane(title,n,cls,aria){
    return '<div class="story-lane"><p class="story-role">'+title+'</p><div role="img" aria-label="'+aria+'">'+pack(n,cls)+'</div></div>';
  }
  function cargoView(stock,sent1,sent2,loaded,quiet){
    const left=stock-sent1-sent2-loaded;
    const flight=sent1&&!sent2?'Второй рейс':'Первый рейс';
    return '<div class="story-haul">'+lane('На складе',left,'cargo',quiet?'На складе':'На складе '+left)+lane(flight,loaded,'trip','В рейсе '+loaded)+lane('Бульку',sent1,'guest','Бульку отправлено '+sent1)+lane('Королю',sent2,'guest2','Королю отправлено '+sent2)+'</div>';
  }
  function piles(){ return cargoView(hand.stock,hand.sent1,hand.sent2,hand.loaded,hand.goal==='two'&&!hand.namedOk); }
  function chain(name,fn){
    const prev=ext.hooks[name];
    ext.hooks[name]=function(...args){
      let out=''; try{ out=prev?prev.apply(this,args)||'':''; }catch(e){ out=''; }
      let mine=''; try{ mine=fn.apply(this,args)||''; }catch(e){ mine=''; }
      return out+mine;
    };
  }
  const BTN='<button type="button" class="btn" data-act="';
  function miss(){
    hand.ok=false; hand.errors++; if(hand.errors>=2)hand.help=true;
    if(hand.goal==='one'){
      hand.msg=hand.loaded>hand.plan?'Пока не сходится. Лишний груз верни на склад.':'Пока не сходится. Бульк ждёт больше, чем сейчас в рейсе.';
      return;
    }
    hand.msg=hand.loaded>hand.named
      ?'Пока не сходится. Лишний груз верни на склад.'
      :'Пока не сходится. Погружено не столько, сколько ты назвал.';
  }
  function missLeft(){
    hand.ok=false; hand.namedOk=false; hand.errors++; if(hand.errors>=2)hand.help=true;
    hand.msg='Пока не сходится. Уже отправленное и названный остаток вместе не равны всему запасу.';
  }
  function builder(){
    syncHand();
    if(hand.goal==='two'&&!hand.namedOk){
      let h='<div class="story-haul-scene'+(hand.msg.includes('не сходится')?' is-wrong':hand.msg.includes('не подставится')?' is-help':'')+'"><p class="story-goal">Остаток — Королю. Назови, сколько осталось.</p>';
      h+='<p class="story-state">Бульку уже отправлено '+hand.sent1+' из '+hand.stock+'. Сколько осталось Королю? Назови сам.</p>';
      h+=piles();
      h+='<p class="story-state" role="status">Названо: '+hand.named+'.</p>';
      h+=BTN+'storyCargo" data-part="more">Больше</button>'+BTN+'storyCargo" data-part="less">Меньше</button>'+BTN+'storyCargoCheck">Проверить остаток</button>'+'<button type="button" class="btn ghost" data-act="storyCargoHelp">Объясни мне</button>';
      if(hand.msg)h+='<p class="story-state">'+hand.msg+'</p>';
      return h+'</div>';
    }
    const ask=hand.goal==='one'
      ?'Подготовлено гостями Капельки: '+hand.stock+'.'+(seatsOf()?' Площадка после встречи: '+seatsOf()+' мест.':'')+' Бульк ждёт '+hand.plan+'. Перенеси сам. Лишнее можно вернуть до отправки.'
      :'Остаток ты уже назвал. Погрузи сам столько и отправь. Король ждёт этот рейс.';
    const goal=hand.goal==='one'?'Первый рейс — Бульку. Перенеси нужное.':'Второй рейс — Королю. Погрузи названный остаток.';
    const tone=hand.ok?' is-ready':hand.msg.includes('не сходится')?' is-wrong':hand.msg.includes('Число само')||hand.msg.includes('не подставится')||hand.msg.includes('сама не нажмётся')?' is-help':hand.loaded> (hand.goal==='one'?hand.plan:hand.named)?' is-over':'';
    let h='<div class="story-haul-scene'+tone+'"><p class="story-goal">'+goal+'</p><p class="story-state">'+ask+'</p>';
    h+=piles();
    h+='<p class="story-state" role="status">В рейсе '+hand.loaded+'. Уже отправлено Бульку '+hand.sent1+'.</p>';
    h+=BTN+'storyCargo" data-part="load">В рейс</button>'+'<button type="button" class="btn ghost" data-act="storyCargo" data-part="back">Вернуть на склад</button>'+BTN+'storyCargoCheck">Проверить рейс</button>'+'<button type="button" class="btn ghost" data-act="storyCargoHelp">Объясни мне</button>';
    if(hand.ok)h+=BTN+'storyCargoSend">Отправить '+(hand.goal==='two'?'Королю':'Бульку')+'</button>';
    if(hand.msg)h+='<p class="story-state'+(hand.ok?' ok':'')+'">'+hand.msg+'</p>';
    return h+'</div>';
  }
  function shown(fin){
    if(!fin)return '';
    const left=(fin.stock|0)-(fin.sent1|0)-(fin.sent2|0);
    return cargoView(fin.stock|0,fin.sent1|0,fin.sent2|0,0)+'<p class="story-role">Бульку '+fin.sent1+', Королю '+fin.sent2+', на складе '+left+'</p>';
  }
  function trail(fin){ return shown(fin); }
  function mapTrail(fin){
    if(!fin)return '';
    const left=(fin.stock|0)-(fin.sent1|0)-(fin.sent2|0);
    const label='Бульку '+fin.sent1+', Королю '+fin.sent2+', на складе '+left;
    return '<div class="story-cargo" role="status" aria-label="'+label+'">'+shown(fin).replace('Бульку '+fin.sent1,'Бульк '+fin.sent1).replace('Королю '+fin.sent2,'Король '+fin.sent2).replace('на складе '+left,'склад '+left)+'</div>';
  }
  function finale(){
    const c=entries(4).filter(g=>g.level==='two-trips');
    return c.length?c[c.length-1]:null;
  }
  function epRow(ep,d){
    const done=d[ep];
    let state,btn='';
    if(done){
      const indep=done.rounds-(done.supported||0);
      state='<p class="story-state ok">Сделано: заданий '+done.rounds+(done.errors?', ошибок '+done.errors:', без ошибок')+'; самостоятельно '+indep+((done.supported||0)>0?', с подсказкой '+done.supported:'')+'</p>';
      if(ep===4){ const left=(done.stock|0)-(done.sent1|0)-(done.sent2|0); state+='<p class="story-role">Бульку '+done.sent1+', Королю '+done.sent2+', на складе '+left+'</p>'; }
      else{
        const again=journal().games.filter(g=>g.origin==='story-t06-replay'&&g.ep===ep);
        const last=again.length?again[again.length-1]:null;
        if(last)state+='<p class="story-state">Последняя попытка: заданий '+last.rounds+(last.errors?', ошибок '+last.errors:', без ошибок')+((last.supported||0)>0?', с подсказкой '+last.supported:'')+'</p>';
        const pending=pendingReplay(ep);
        if(pending&&pending.kind==='closed')btn=BTN+'storyBack6" data-ep="'+ep+'" aria-label="Вернуться к Хинкалику: '+EP[ep].name+'">Вернуться к Хинкалику</button>';
        else if(pending)btn=BTN+'storyReplay6" data-ep="'+ep+'" aria-label="Продолжить: '+EP[ep].name+'">Продолжить повторение</button>';
        else btn=BTN+'storyReplay6" data-ep="'+ep+'" aria-label="Повторить: '+EP[ep].name+'">Повторить занятие</button>';
      }
    }else if(ep===4){
      if(!d[3])state='<p class="story-state">Сначала — «'+EP[3].name+'».</p>';
      else if(stage()==='tell'){ state='<p class="story-state ok">Оба рейса отправлены. Можно рассказать Хинкалику.</p>'; btn=BTN+'storyCargoBack" data-ep="4" aria-label="Рассказать Хинкалику: '+EP[4].name+'">Рассказать Хинкалику</button>'; }
      else if(!stockOf())state='<p class="story-state">Сначала нужен итог гостей Капельки.</p>';
      else if(stage()==='one'||stage()==='two')state='<p class="story-state">Груз на площадке выше.</p>';
      else { state='<p class="story-state">Готово к погрузке. Груз берётся из уже принятых гостей.</p>'; btn=BTN+'storyCargoOpen">К рейсам</button>'; }
    }else if(islandLocked()){
      state='<p class="story-state">Гномья гора ещё закрыта: сначала освой предыдущий остров.</p>';
    }else if(ep>1&&!d[ep-1]){
      state='<p class="story-state">Сначала — «'+EP[ep-1].name+'».</p>';
    }else if(subPhase()<REQ[ep]){
      state='<p class="story-state">Откроется на этапе «'+app.E.phaseName('sub',REQ[ep])+'» (сейчас: '+app.E.phaseName('sub',subPhase())+').</p>';
      btn=BTN+'storyTrain6">Тренироваться</button>';
    }else{
      const row=lesson(ep);
      if(row&&row.level!=='closed'&&row.item&&app.lessonItem&&!app.lessonItem('sub',row.item)){
        state='<p class="story-state">Черновик есть, но пример из него однозначно не читается. Серия не засчитана. Прежние главы не стёрты.</p>';
        return '<li><h2>'+EP[ep].name+'</h2><p>'+EP[ep].what+'</p>'+state+'</li>';
      }
      if(row&&row.level==='closed'){ state='<p class="story-state ok">Серия собрана. Можно рассказать Хинкалику.</p>'; btn=BTN+'storyBack6" data-ep="'+ep+'" aria-label="Вернуться к Хинкалику: '+EP[ep].name+'">Вернуться к Хинкалику</button>'; }
      else if(row){ state='<p class="story-state">Можно продолжить с того же места.</p>'; btn=BTN+'storyEp6" data-ep="'+ep+'" aria-label="Продолжить: '+EP[ep].name+'">Продолжить</button>'; }
      else { state='<p class="story-state">Готово к делу. Обычное занятие своим способом.</p>'; btn=BTN+'storyEp6" data-ep="'+ep+'" aria-label="Начать: '+EP[ep].name+'">Начать</button>'; }
    }
    return '<li class="story-ep" data-ep="'+ep+'" tabindex="-1"><h2>'+EP[ep].name+'</h2><p>'+EP[ep].what+'</p>'+state+btn+'</li>';
  }
  function view(){
    const d=derive(), fin=finale();
    const hauling=stage()==='one'||stage()==='two';
    let h='<section class="card stage story-wrap'+(hauling?' story-order':'')+'" aria-labelledby="story-title">';
    h+='<p class="story-kicker">Большой день Сказочного Теремка · глава 6</p>';
    h+='<div class="story-hero">'+(CH?CH.pal('sub','bob','Хинкалик',d[4]?'happy':undefined):'')+'</div>';
    h+='<h1 id="story-title">Два рейса</h1>';
    if(!d[4]&&hauling)h+=builder();
    h+=d[4]
      ?'<p class="story-say">Хинкалик: «Оба рейса ушли своим адресатам. На складе не осталось того, что уже отправлено.»</p>'+trail(fin)+'<p class="story-next">Дальше — Волшебная башня: Маг Мармелад собирает общий праздник.</p>'
      :'<p class="story-say">Хинкалик: «Капелька уже встретила гостей. Часть приготовленного уедет Бульку, остаток — Королю. Сначала проверим вычитание.»</p>';
    h+='<ol class="story-list">'+[1,2,3,4].map(ep=>epRow(ep,d)).join('')+'</ol>';
    h+='<div class="row"><button type="button" class="btn ghost" data-act="map">← На карту</button></div></section>';
    return h;
  }
  function focusMain(ep){
    const btn=ep&&document.querySelector('.story-wrap button[data-ep="'+ep+'"]');
    const row=!btn&&ep&&document.querySelector('.story-wrap li[data-ep="'+ep+'"]');
    const el=btn||row||document.querySelector('.story-wrap [data-act="storyCargoBack"],.story-wrap [data-act="storyEp6"],.story-wrap [data-act="storyReplay6"],.story-wrap [data-act="map"]');
    if(el)el.focus({preventScroll:true});
  }
  function focusSel(sel){const el=document.querySelector(sel);if(el)el.focus({preventScroll:true});}
  function focusScene(){
    const st=stage();
    if(st==='tell'){focusMain(4);return;}
    if(st==='one'||st==='two'){
      syncHand();
      if(hand.ok)focusSel('.story-wrap [data-act="storyCargoSend"]');
      else if(st==='two'&&!hand.namedOk)focusSel('.story-wrap [data-act="storyCargoCheck"]');
      else focusSel('.story-wrap [data-act="storyCargo"][data-part="load"]');
      return;
    }
    focusMain();
  }
  function open(){ active=null; app.go('storyT06',{island:null}); if(PH&&PH.heroes&&PH.heroes.sub)root.AUDIO.say(PH.heroes.sub.hello); focusScene(); }
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
    const pool=journal().tasks.filter(t=>t.at>=a.at&&(typeof row.at!=='number'||t.at<=row.at)&&(t.since==null||t.since===a.at)&&t.sk==='sub'&&(t.ph||1)===REQ[a.ep]);
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
        const rec={level:'ph'+REQ[a.ep],rounds:qual.length,errors:qual.reduce((n,t)=>n+(t.w||0),0),supported:qual.filter(t=>(t.ex||0)>0||t.nl).length,ep:a.ep,since:a.at};
        if(a.replay){
          if(!journal().games.some(g=>g.origin==='story-t06-replay'&&g.ep===a.ep&&g.since===a.at))root.__insights.logGame(Object.assign({game:'ten-bridge',origin:'story-t06-replay'},rec));
        }else if(!lastEntry(a.ep))root.__insights.logGame(Object.assign({game:'story-t06-'+a.ep},rec));
      }
    }
    app.go('storyT06',{island:null}); focusMain(a&&a.ep);
  }
  ext.views.storyT06=view;
  ext.acts.storyT06=open;
  function begin(ep, row, replay){
    const fresh=!row||row.level==='closed';
    active={ep,at:fresh?Date.now():row.since,replay:replay?1:0};
    app.S.storyHold=1;
    app.S.replayPhase=REQ[ep];
    app.S.resume=fresh?null:row;
    if(root.__insights&&root.__insights.bindSeries)root.__insights.bindSeries(active.at);
    app.startSession('sub');
  }
  ext.acts.storyEp6=(a)=>{
    const ep=Number(a.dataset.ep), d=derive();
    if(!REQ[ep]||d[ep]||(ep>1&&!d[ep-1])||islandLocked()||subPhase()<REQ[ep]||!t05Credit())return;
    let row=lesson(ep);
    if(row&&row.level!=='closed'&&row.item&&app.lessonItem&&!app.lessonItem('sub',row.item)){ app.go('storyT06',{island:null}); return; }
    const backed=row&&journal().tasks.some(t=>t.sk==='sub'&&t.at>=row.since&&(t.ph||1)===REQ[ep]);
    if(row&&row.level==='closed'&&backed){ active={ep,at:row.since}; app.go('storyT06',{island:null}); return; }
    if(row&&row.level==='closed')row=null;
    begin(ep,row);
  };
  ext.acts.storyReplay6=(a)=>{
    const ep=Number(a.dataset.ep), d=derive();
    if(!REQ[ep]||!d[ep]||islandLocked()||subPhase()<REQ[ep]||!t05Credit())return;
    const pending=pendingReplay(ep);
    if(pending&&pending.kind==='closed'){ active={ep,at:pending.row.since,replay:1}; app.go('storyT06',{island:null}); return; }
    const open=pending?pending.row:null;
    if(open&&open.item&&app.lessonItem&&!app.lessonItem('sub',open.item)){ app.go('storyT06',{island:null}); return; }
    begin(ep,open,1);
  };
  ext.acts.storyTrain6=()=>{ if(!islandLocked()){ app.S.storyHold=0; app.S.resume=null; app.S.replayPhase=0; app.startSession('sub'); } };
  ext.acts.storyBack6=(a)=>{
    if(!active){
      const ep=Number(a&&a.dataset&&a.dataset.ep)||0;
      const waiting=ep?closedReplay(ep):null;
      const row=waiting||(ep&&lesson(ep)&&lesson(ep).level==='closed'&&!lastEntry(ep)?lesson(ep):null);
      if(row)active={ep:row.ep||ep,at:row.since,replay:waiting?1:0};
    }
    backFromSeries();
  };
  ext.acts.storyCargoOpen=()=>{ if(stage()==='done'||stage()==='tell'||!stockOf())return; syncHand(); app.go('storyT06',{island:null}); focusScene(); };
  ext.acts.storyCargo=(a)=>{
    const st=stage(); if(st!=='one'&&st!=='two')return;
    syncHand();
    const part=a&&a.dataset&&a.dataset.part;
    const left=hand.stock-hand.sent1-hand.sent2-hand.loaded;
    if(hand.goal==='two'&&!hand.namedOk){
      if(part==='more'&&hand.named<hand.stock)hand.named++;
      else if(part==='less'&&hand.named>0)hand.named--;
    }else if(part==='load'&&left>0)hand.loaded++;
    else if(part==='back'&&hand.loaded>0)hand.loaded--;
    hand.ok=false; hand.msg=''; saveDraft(); app.go('storyT06',{island:null});
    focusSel('.story-wrap [data-act="storyCargo"][data-part="'+(part||'load')+'"]');
  };
  ext.acts.storyCargoHelp=()=>{
    if(stage()!=='one'&&stage()!=='two')return;
    syncHand();
    hand.help=true; hand.ok=false;
    hand.msg=hand.goal==='one'
      ?'Склад — то, что ещё не уехало. Первый рейс везёт Бульку ровно столько, сколько он ждёт. Лишнее верни до отправки. Число само в рейс не встанет.'
      :(!hand.namedOk
        ?'Бульку уже уехало '+hand.sent1+' из '+hand.stock+'. Остаток для Короля — всё, что ещё на складе. Назови его сам. Число не подставится.'
        :'Король ждёт ровно названный остаток. Погрузи сам. Лишнее верни на склад. Отправка сама не нажмётся.');
    saveDraft(); app.go('storyT06',{island:null});
    focusSel('.story-wrap [data-act="storyCargoHelp"]');
  };
  ext.acts.storyCargoCheck=()=>{
    const st=stage(); if(st!=='one'&&st!=='two')return;
    syncHand();
    if(st==='two'&&!hand.namedOk){
      if(hand.named===hand.stock-hand.sent1){hand.namedOk=true;hand.ok=false;hand.msg='Сходится. Теперь погрузи сам столько, сколько назвал.';}
      else missLeft();
    }else{
      const need=st==='one'?hand.plan:hand.named;
      if(hand.loaded===need){hand.ok=true;hand.msg=st==='one'?'Сходится. Теперь отправь этот рейс. Второй сам не уедет.':'Сходится. Теперь отправь Королю.';}
      else miss();
    }
    saveDraft(); app.go('storyT06',{island:null});
    if(hand.ok)focusSel('.story-wrap [data-act="storyCargoSend"]');
    else if(hand.namedOk)focusSel('.story-wrap [data-act="storyCargo"][data-part="load"]');
    else focusSel('.story-wrap [data-act="storyCargoCheck"]');
  };
  ext.acts.storyCargoSend=()=>{
    const st=stage(); if((st!=='one'&&st!=='two')||!hand.ok)return;
    syncHand();
    if(!hand.ok)return;
    if(st==='one'){
      root.__insights&&root.__insights.logGame({game:'ten-bridge',origin:'story-t06-4',level:'trip-1',rounds:1,errors:hand.errors,supported:hand.help?1:0,n:hand.loaded,stock:hand.stock,to:'Бульк'});
      hand.sent1=hand.loaded; hand.loaded=0; hand.named=0; hand.namedOk=false; hand.ok=false; hand.errors=0; hand.help=false; hand.msg=''; hand.goal='two'; hand.stamp='';
    }else{
      root.__insights&&root.__insights.logGame({game:'ten-bridge',origin:'story-t06-4',level:'trip-2',rounds:1,errors:hand.errors,supported:hand.help?1:0,n:hand.loaded,stock:hand.stock,to:'Король'});
      hand.sent2=hand.loaded; hand.loaded=0; hand.ok=false; hand.goal=''; hand.stamp='';
    }
    saveDraft(); app.go('storyT06',{island:null}); focusScene();
  };
  ext.acts.storyCargoBack=()=>{
    if(!derive()[4]&&root.__insights){
      const a=trip1(lastEntry(3)), b=trip2(a);
      if(a&&b)root.__insights.logGame({game:'story-t06-4',level:'two-trips',rounds:2,errors:(a.errors|0)+(b.errors|0),supported:(a.supported|0)+(b.supported|0),
        sent1:a.n,sent2:b.n,stock:a.stock,to1:a.to,to2:b.to});
    }
    app.go('storyT06',{island:null}); focusMain(4);
  };
  chain('lessonSnap',(info)=>{
    if(!active||!info||!info.item||!info.item.key)return '';
    const replay=active.replay?1:0;
    root.__insights&&root.__insights.logGame({game:'ten-bridge',origin:replay?'story-t06-replay-draft':'story-t06-lesson',slot:(replay?'t06-replay-try-':'t06-lesson-')+pid()+'-'+active.ep,level:info.closed?'closed':'open',rounds:0,ep:active.ep,since:active.at,pid:pid(),replay:replay,
      len:info.len,phase:info.phase,count:info.count,results:info.results,item:info.item,si:info.si,wr:info.wr,kp:info.kp,clean:info.clean,done:info.done,taps:info.taps,heard:info.heard,ins:info.ins,earned:info.earned});
    return '';
  });
  chain('leave',(screen)=>{ if(active&&screen!=='task'&&screen!=='break')active=null; return ''; });
  chain('islandExtra',(id)=>{
    if(id!=='sub'||!t05Credit())return '';
    if(islandLocked())return '<p class="story-badge">Большой день: Гномья гора откроется после Облачного острова</p>';
    return '<button type="button" class="btn ghost" data-act="storyT06">К Хинкалику · Большой день</button>'+trail(finale());
  });
  chain('breakExtra',()=> active?BTN+'storyBack6">Вернуться к Хинкалику</button>':'');
  const REG=root.__storyMap;
  if(REG)REG.items.push({
    done:()=>!!derive()[4],
    yard:()=>mapTrail(finale()),
    action:()=>{
      if(!t05Credit()||derive()[4])return null;
      if(stage()==='tell')return {act:'storyCargoBack',label:'Рассказать Хинкалику'};
      if(!islandLocked())return {act:'storyT06',label:'Помочь Хинкалику'};
      return null;
    }
  });
  if(app.S.screen==='map')app.render();
})(window);

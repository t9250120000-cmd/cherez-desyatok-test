/* «Большой день» — глава T04 (Королевство, Король Пельмень).
   Тот же журнал, что у T01–T03: проекция terem_insights_v1, без нового ключа.
   E1–E3 — серии движка teen из сцены (фазы 1, 2, 3). Фазу сюжет не поднимает.
   E4 — существующая мастерская десятков, заказ 13 затем 16, origin сцены.
   terem_v3, награды и skills.done этим модулем не пишутся.
   Вызов: index.html после story-t03.js. Отдельного модуля главы раньше не было. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext;
  if(!app||!ext)return;
  const PH=root.PH,CH=root.CH;
  let active=null;
  const REQ={1:1,2:2,3:3};
  const EP={
    1:{name:'Связка десяти', what:'Собери полный десяток руками и оставь единицы. Лишнее можно вернуть.'},
    2:{name:'Два теремка', what:'По картинке узнай десяток и остаток. Числа меняются.'},
    3:{name:'Сообщение Королю', what:'Восстанови целое или единицы без постоянной картинки. Подсказка вернёт модель.'},
    4:{name:'Большой заказ', what:'Королю нужны места для гостей: сначала 13, потом 16 и 19. Связка десять и единицы.'}
  };
  function journal(){
    const I=root.__insights, p=I&&I.prof&&I.prof();
    return p&&Array.isArray(p.games)&&Array.isArray(p.tasks)?p:{games:[],tasks:[]};
  }
  function entries(ep){ return journal().games.filter(g=>g.game==='story-t04-'+ep); }
  function lastEntry(ep){ const l=entries(ep); return l.length?l[l.length-1]:null; }
  /* Старый абстрактный level first (r38) сюда не входит. */
  function fact(level, afterAt){
    const l=journal().games.filter(g=>g.game==='tens-workshop'&&g.origin==='story-t04-4'&&g.level===level&&g.at>afterAt);
    return l.length?l[l.length-1]:null;
  }
  function placed13(after){ return after?fact('yard-13',after.at):null; }
  function placed16(step13){ return step13?fact('yard-16',step13.at):null; }
  function placed19(step16){ return step16?fact('yard-19',step16.at):null; }
  function proven(after){
    const raw16=placed16(placed13(after));
    const raw19=placed19(raw16);
    if(raw19){
      const credit=entries(4).filter(g=>g.level==='yard-19'&&g.at>raw19.at);
      return credit.length?credit[credit.length-1]:null;
    }
    const old=entries(4).filter(g=>g.level==='yard-16'&&raw16&&g.at>raw16.at);
    return old.length?old[old.length-1]:null;
  }
  function derive(){
    return {1:lastEntry(1),2:lastEntry(2),3:lastEntry(3),4:proven(lastEntry(3))};
  }
  /* Та же проекция, что закрывает T03: сырой order после E3 и более поздний credit.
     Одно имя story-t03-4 (старый hidden-part) вход не открывает. */
  function t03Done(){
    const g=journal().games;
    const e2=g.filter(x=>x.game==='story-t03-2'); const e2l=e2.length?e2[e2.length-1]:null;
    if(!e2l)return false;
    const raw3=g.filter(x=>x.game==='split-baskets'&&x.origin==='story-t03-3'&&x.level==='again'&&x.at>e2l.at);
    const r3=raw3.length?raw3[raw3.length-1]:null;
    if(!r3)return false;
    const c3=g.filter(x=>x.game==='story-t03-3'&&x.level==='again'&&x.at>r3.at);
    const e3=c3.length?c3[c3.length-1]:null;
    if(!e3)return false;
    const raw4=g.filter(x=>x.game==='split-baskets'&&x.origin==='story-t03-4'&&x.level==='order'&&x.at>e3.at);
    const r4=raw4.length?raw4[raw4.length-1]:null;
    if(!r4)return false;
    return g.some(x=>x.game==='story-t03-4'&&x.level==='order'&&x.at>r4.at);
  }
  function islandLocked(){
    const p=app.P(), s=app.E.SK.teen;
    return !!(p&&s&&app.E.SK[p.cur].n<s.n&&!p.skills.teen.done);
  }
  function pid(){ return (app.P()&&app.P().id)||''; }
  function teenPhase(){ const p=app.P(); const st=p&&p.skills&&p.skills.teen; return st?(st.done?3:st.phase):1; }
  function lesson(ep){
    const credit=lastEntry(ep);
    const rows=journal().games.filter(g=>g.origin==='story-t04-lesson'&&g.slot==='t04-lesson-'+pid()+'-'+ep&&g.pid===pid()&&g.ep===ep&&(!credit||g.since>credit.at));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayTry(ep, level){
    const slot='t04-replay-try-'+pid()+'-'+ep;
    const rows=journal().games.filter(g=>g.origin==='story-t04-replay-draft'&&g.slot===slot&&g.pid===pid()&&g.ep===ep&&(!level||g.level===level));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayWaiting(ep){
    const row=replayTry(ep,'closed');
    if(!row)return null;
    return journal().games.some(g=>g.origin==='story-t04-replay'&&g.ep===ep&&g.since===row.since)?null:row;
  }
  function sceneOrder(){ return placed19(placed16(placed13(lastEntry(3)))); }
  function orderTally(){
    const a=placed13(lastEntry(3)), b=placed16(a), c=placed19(b);
    if(!a||!b)return null;
    const rows=c?[a,b,c]:[a,b];
    return {rounds:rows.length,errors:rows.reduce((n,r)=>n+(r.errors|0),0),supported:rows.reduce((n,r)=>n+(r.supported|0),0)};
  }
  let hand={bundle:0,units:0,help:false,errors:0,ok:false,goal:0,msg:'',stamp:''};
  function stage(){
    const e3=lastEntry(3);
    if(!e3||derive()[4])return 'done';
    if(placed19(placed16(placed13(e3))))return 'tell';
    if(placed16(placed13(e3)))return 'more';
    if(placed13(e3))return 'grow';
    return 'build';
  }
  function floorAt(){
    const e3=lastEntry(3);
    const p13=placed13(e3);
    const p16=placed16(p13);
    const p19=placed19(p16);
    if(p19)return p19.at;
    if(p16&&!derive()[4])return p16.at;
    return p13?p13.at:(e3?e3.at:0);
  }
  function latestDraft(){
    const l=journal().games.filter(g=>g.game==='tens-workshop'&&g.origin==='story-t04-4'&&g.level==='draft'&&g.at>floorAt());
    return l.length?l[l.length-1]:null;
  }
  function syncHand(){
    const st=stage();
    const goal=st==='more'?19:st==='grow'?16:13;
    if(st!=='build'&&st!=='grow'&&st!=='more'){hand.stamp='';return;}
    const who=(app.P()&&app.P().id)||'';
    const stamp=who+'|'+floorAt()+'|'+goal;
    if(hand.stamp===stamp)return;
    const d=latestDraft();
    if(d&&d.goal===goal){
      hand={bundle:d.bundle|0,units:d.units|0,help:!!d.supported,errors:d.errors|0,ok:!!d.checked,goal,msg:d.checked?'Проверено. Осталось передать на площадку.':'',stamp};
    }else hand={bundle:goal===13?0:10,units:goal===19?6:goal===16?3:0,help:false,errors:0,ok:false,goal,msg:'',stamp};
  }
  function saveDraft(){
    if(!root.__insights||!hand.goal)return;
    root.__insights.logGame({game:'tens-workshop',origin:'story-t04-4',level:'draft',rounds:0,errors:hand.errors,supported:hand.help?1:0,bundle:hand.bundle,units:hand.units,goal:hand.goal,checked:hand.ok?1:0});
  }
  function pile(){
    const placed=seats();
    const placedUnits=placed>10?placed-10:0;
    const cells=Array.from({length:10},(_,i)=>{
      const on=i<hand.bundle;
      return '<i class="story-piece'+(on?' in':'')+(placed>=10&&on?' set':'')+'"></i>';
    }).join('');
    const loose=Array.from({length:hand.units},(_,i)=>'<i class="story-piece loose'+(i<placedUnits?' set':' now')+'"></i>').join('');
    const full=hand.bundle===10?' full':'';
    return '<div class="story-pile"><div class="story-bundle'+full+'" role="img" aria-label="'+(hand.bundle===10?'Связка из десяти':'В связке '+hand.bundle+' из десяти')+'">'+cells+'</div><div class="story-loose" role="img" aria-label="Отдельные единицы: '+hand.units+'">'+loose+'</div></div>';
  }
  function seats(){
    const e3=lastEntry(3);
    if(placed19(placed16(placed13(e3))))return 19;
    if(placed16(placed13(e3)))return 16;
    if(placed13(e3))return 13;
    return 0;
  }
  function yardHtml(n){
    if(!n)return '';
    const dots=Array.from({length:n},()=>'<i class="story-seat"></i>').join('');
    const was=n===19?' Сначала было 16, площадка расширена.':n===16?' Сначала было 13, площадка расширена.':'';
    return '<span class="story-yard" role="img" aria-label="Общая площадка, мест: '+n+'.'+was+'">'+dots+'<b>'+n+' мест</b></span>';
  }
  function places(){ const n=seats(); return n?yardHtml(n):''; }
  function chain(name,fn){
    const prev=ext.hooks[name];
    ext.hooks[name]=function(...a){
      let out=''; try{ out=prev?prev.apply(this,a)||'':''; }catch(e){ out=''; }
      let mine=''; try{ mine=fn.apply(this,a)||''; }catch(e){ mine=''; }
      return out+mine;
    };
  }
  const BTN='<button type="button" class="btn" data-act="';
  function epRow(ep,d,effPh,locked){
    const done=d[ep];
    let state,btn='';
    if(done){
      const src=ep===4&&orderTally()?orderTally():done;
      const indep=src.rounds-(src.supported||0);
      state='<p class="story-state ok">Сделано: заданий '+src.rounds+(src.errors?', ошибок '+src.errors:', без ошибок')+'; самостоятельно '+indep+((src.supported||0)>0?', с подсказкой '+src.supported:'')+'</p>';
      if(ep<4){
        if(replayWaiting(ep))btn=BTN+'storyBack4" data-ep="'+ep+'" aria-label="Вернуться к Королю: '+EP[ep].name+'">Вернуться к Королю</button>';
        else if(replayTry(ep,'open'))btn=BTN+'storyReplay4" data-ep="'+ep+'" aria-label="Продолжить: '+EP[ep].name+'">Продолжить: '+EP[ep].name+'</button>';
        else btn=BTN+'storyReplay4" data-ep="'+ep+'" aria-label="Повторить: '+EP[ep].name+'">Повторить: '+EP[ep].name+'</button>';
      }
    }else if(ep===4){
      if(!d[3])state='<p class="story-state">Сначала — «'+EP[3].name+'».</p>';
      else if(sceneOrder()){ state='<p class="story-state ok">Площадка расширена до '+seats()+' мест.</p>'; btn=BTN+'storyOrderBack4" data-ep="4" aria-label="Рассказать Королю: '+EP[4].name+'">Рассказать Королю</button>'; }
      else if(stage()==='build'||stage()==='grow'||stage()==='more')state='<p class="story-state">Заказ открыт на площадке.</p>';
      else state=builder();
    }else if(locked){
      state='<p class="story-state">Королевство ещё закрыто: сначала освой предыдущий остров.</p>';
    }else if(!(ep===1||d[ep-1])){
      state='<p class="story-state">Сначала — «'+EP[ep-1].name+'».</p>';
    }else if(effPh>=REQ[ep]){
      const row=lesson(ep);
      if(row&&row.level==='closed'){ state='<p class="story-state ok">Серия собрана. Можно вернуться к Королю.</p>'; btn=BTN+'storyBack4" data-ep="'+ep+'" aria-label="Вернуться к Королю: '+EP[ep].name+'">Вернуться к Королю</button>'; }
      else if(row){ state='<p class="story-state">Можно продолжить с того же места.</p>'; btn=BTN+'storyEp4" data-ep="'+ep+'" aria-label="Продолжить: '+EP[ep].name+'">Продолжить</button>'; }
      else { state='<p class="story-state">Готово к делу.</p>'; btn=BTN+'storyEp4" data-ep="'+ep+'" aria-label="Начать: '+EP[ep].name+'">Начать</button>'; }
    }else{
      state='<p class="story-state">Откроется на этапе «'+app.E.phaseName('teen',REQ[ep])+'» (сейчас: '+app.E.phaseName('teen',effPh)+').</p>';
      btn=BTN+'storyTrain4">Тренироваться на острове</button>';
    }
    return '<li class="story-ep'+(done?' done':'')+'" data-ep="'+ep+'" tabindex="-1"><div class="story-ep-txt"><b>'+EP[ep].name+'</b><p>'+EP[ep].what+'</p>'+state+'</div>'+btn+'</li>';
  }
  function view(){
    const d=derive();
    const ordering=stage()==='build'||stage()==='grow'||stage()==='more';
    let h='<section class="card stage story-wrap'+(ordering?' story-order':'')+'" aria-labelledby="story-title">';
    h+='<p class="story-kicker">Большой день Сказочного Теремка · глава 4</p>';
    if(!ordering)h+='<div class="story-hero">'+(CH?CH.pal('teen','bob','Король Пельмень',d[4]?'happy':undefined):'')+'</div>';
    h+='<h1 id="story-title">Встреча становится общей</h1>';
    if(ordering)h+=builder();
    else h+=places();
    h+=d[4]
      ?'<p class="story-say">Король: «Маленькие встречи стали одной площадкой. Места для гостей готовы.»</p><p class="story-next">Дальше — Облачный остров: Капелька приводит ещё гостей. Загляни к ней.</p>'
      :'<p class="story-say">Король: «Корзины Бульку и Тестику уже дошли. Гостей стало больше, и я теряюсь среди отдельных мест. Помоги собрать десяток и оставить единицы.»</p>';
    h+='<ol class="story-list">'+[1,2,3,4].map(ep=>epRow(ep,d,teenPhase(),islandLocked())).join('')+'</ol>';
    h+='<div class="row"><button type="button" class="btn ghost" data-act="map">← На карту</button></div></section>';
    return h;
  }
  function focusMain(ep){
    const btn=ep&&document.querySelector('.story-wrap button[data-ep="'+ep+'"]');
    const row=!btn&&ep&&document.querySelector('.story-wrap li[data-ep="'+ep+'"]');
    const el=btn||row||document.querySelector('.story-wrap [data-act="storyOrderBack4"],.story-wrap [data-act="storyEp4"],.story-wrap [data-act="storyOrder4"],.story-wrap [data-act="map"]');
    if(el)el.focus({preventScroll:true});
  }
  function focusSel(sel){const el=document.querySelector(sel);if(el)el.focus({preventScroll:true});}
  function focusOrder(){
    const st=stage();
    if(st==='tell'){focusMain(4);return;}
    if(st==='build'||st==='grow'||st==='more'){
      syncHand();
      focusSel(hand.ok?'.story-wrap [data-act="storyYardPlace"]':'.story-wrap [data-act="storyYardCheck"]');
      return;
    }
    focusMain();
  }
  function open(){
    active=null;
    app.go('storyT04',{island:null});
    if(PH&&PH.heroes&&PH.heroes.teen)root.AUDIO.say(PH.heroes.teen.hello);
    focusOrder();
  }
  function savedRow(a){
    if(a.replay)return replayTry(a.ep,'closed');
    const row=lesson(a.ep);
    return row&&row.level==='closed'?row:null;
  }
  function seriesOf(a,row){
    const len=row&&row.len|0;
    if(!a||!row||row.level!=='closed'||row.ep!==a.ep||row.since!==a.at||row.phase!==REQ[a.ep])return null;
    if(!len||row.count!==len||!Array.isArray(row.results)||row.results.length!==len)return null;
    const pool=journal().tasks.filter(t=>t.at>=a.at&&(typeof row.at!=='number'||t.at<=row.at)&&(t.since==null||t.since===a.at)&&t.sk==='teen'&&(t.ph||1)===REQ[a.ep]);
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
        const rec={level:'ph'+REQ[a.ep],rounds:qual.length,errors:qual.reduce((n,t)=>n+(t.w||0),0),supported:qual.filter(t=>t.ex>0||t.nl).length,ep:a.ep,since:a.at};
        if(a.replay){
          if(!journal().games.some(g=>g.origin==='story-t04-replay'&&g.ep===a.ep&&g.since===a.at))root.__insights.logGame(Object.assign({game:'ten-bridge',origin:'story-t04-replay'},rec));
        }else if(!lastEntry(a.ep))root.__insights.logGame(Object.assign({game:'story-t04-'+a.ep},rec));
      }
    }
    app.go('storyT04',{island:null}); focusMain(a&&a.ep);
  }
  function backFromScene(){
    if(!derive()[4]&&root.__insights){
      const se=sceneOrder();
      const tally=orderTally();
      if(se&&tally){const rec={game:'story-t04-4',level:se.level,rounds:tally.rounds,errors:tally.errors,supported:tally.supported};
        if(Array.isArray(se.deliveries))rec.deliveries=se.deliveries;
        root.__insights.logGame(rec);}
    }
    app.go('storyT04',{island:null}); focusMain(4);
  }
  ext.views.storyT04=view;
  ext.acts.storyT04=open;
  function begin(ep, row, replay){
    const fresh=!row||row.level==='closed';
    active={ep:ep,at:fresh?Date.now():row.since,replay:replay?1:0};
    app.S.storyHold=1; app.S.replayPhase=REQ[ep];
    app.S.resume=fresh?null:row;
    if(root.__insights&&root.__insights.bindSeries)root.__insights.bindSeries(active.at);
    app.startSession('teen');
  }
  ext.acts.storyEp4=(a)=>{ const ep=Number(a.dataset.ep); const d=derive();
    if(!REQ[ep]||d[ep]||(ep>1&&!d[ep-1])||islandLocked()||teenPhase()<REQ[ep])return;
    let row=lesson(ep);
    if(row&&row.level==='closed'){ active={ep:ep,at:row.since,replay:0}; app.go('storyT04',{island:null}); focusMain(ep); return; }
    begin(ep,row,0); };
  ext.acts.storyReplay4=(a)=>{
    const ep=Number(a.dataset.ep);
    if(!REQ[ep]||!lastEntry(ep))return;
    const open=replayTry(ep,'open');
    begin(ep,open,1);
  };
  function builder(){
    syncHand();
    const total=hand.bundle+hand.units;
    const goal=hand.goal;
    const lead=goal===19
      ?'16 мест уже на площадке. Гостей стало 19. Добавь единицы сам и проверь.'
      :goal===16
      ?'13 мест уже на площадке. Гостей стало 16. Добавь единицы сам и проверь.'
      :'Собери связку из 10 и единицы, чтобы вместе было 13. Лишнее можно убрать.';
    const n=seats();
    const king=CH?CH.pal('teen','story-court-king','Король Пельмень'):'';
    const label=n?'Общая площадка, мест: '+n+'. Уже стоит связка из десяти и '+(n-10)+' единиц.':'Площадка до заказа пустая';
    const tone=hand.ok?' is-ready':hand.msg.includes('не сходится')?' is-wrong':hand.msg.includes('Полная связка')?' is-help':'';
    let h='<div class="story-court'+tone+'"><p class="story-state">'+lead+'</p><div class="story-ground" role="img" aria-label="'+label+'"><span class="story-court-king">'+king+'</span>'+pile()+'</div>';
    h+='<p class="story-state" role="status">Связка '+hand.bundle+', единицы '+hand.units+', вместе '+total+'.</p>';
    if(hand.msg)h+='<p class="story-state'+(hand.ok?' ok':'')+'">'+hand.msg+'</p>';
    h+=BTN+'storyYard" data-part="bundle">В связку</button>';
    h+=BTN+'storyYard" data-part="unit">Единица</button>';
    h+='<button type="button" class="btn ghost" data-act="storyYard" data-part="undo">Убрать лишнее</button>';
    h+=BTN+'storyYardCheck">Проверить '+goal+'</button>';
    h+='<button type="button" class="btn ghost" data-act="storyYardHelp">Объясни мне</button>';
    if(hand.ok)h+=BTN+'storyYardPlace">'+(goal===13?'Передать на площадку':goal===16?'Расширить площадку':'Добавить места')+'</button>';
    return h+'</div>';
  }
  function logYard(level,deliveries){
    if(!root.__insights)return;
    root.__insights.logGame({game:'tens-workshop',origin:'story-t04-4',level,rounds:1,errors:hand.errors,supported:hand.help?1:0,deliveries});
    hand.goal=0; hand.stamp='';
  }
  ext.acts.storyYard=(a)=>{
    if(stage()!=='build'&&stage()!=='grow'&&stage()!=='more')return;
    syncHand();
    const part=a&&a.dataset&&a.dataset.part;
    const total=hand.bundle+hand.units;
    if(part==='bundle'&&hand.bundle<10)hand.bundle++;
    else if(part==='unit'&&total<20)hand.units++;
    else if(part==='undo'){ if(hand.units>0)hand.units--; else if(hand.bundle>0)hand.bundle--; }
    hand.ok=false;
    saveDraft();
    app.go('storyT04',{island:null});
    focusSel('.story-wrap [data-act="storyYard"][data-part="'+(part||'')+'"]');
  };
  ext.acts.storyYardCheck=()=>{
    if(stage()!=='build'&&stage()!=='grow'&&stage()!=='more')return;
    syncHand();
    const total=hand.bundle+hand.units;
    if(hand.bundle===10&&total===hand.goal){hand.ok=true;hand.msg='Сходится: '+hand.goal+'. Теперь передай на площадку.';}
    else{hand.ok=false;hand.errors++;hand.help=true;hand.msg='Пока не сходится с заказом. Смотри связку и отдельные предметы.';}
    saveDraft();
    app.go('storyT04',{island:null});
    focusSel(hand.ok?'.story-wrap [data-act="storyYardPlace"]':'.story-wrap [data-act="storyYardCheck"]');
  };
  ext.acts.storyYardHelp=()=>{
    if(stage()!=='build'&&stage()!=='grow'&&stage()!=='more')return;
    syncHand();
    hand.help=true;
    hand.msg='Полная связка — десять предметов вместе. Остальные лежат отдельно. Число само не подставится.';
    saveDraft();
    app.go('storyT04',{island:null});
    focusSel('.story-wrap [data-act="storyYardHelp"]');
  };
  ext.acts.storyYardPlace=()=>{
    if(stage()!=='build'&&stage()!=='grow'&&stage()!=='more')return;
    syncHand();
    if(!hand.ok)return;
    if(hand.goal===13&&!placed13(lastEntry(3)))logYard('yard-13',[[10,3]]);
    else if(hand.goal===16&&placed13(lastEntry(3))&&!placed16(placed13(lastEntry(3))))logYard('yard-16',[[10,3],[10,6]]);
    else if(hand.goal===19&&placed16(placed13(lastEntry(3)))&&!placed19(placed16(placed13(lastEntry(3)))))logYard('yard-19',[[10,3],[10,6],[10,9]]);
    app.go('storyT04',{island:null}); focusMain(4);
  };
  ext.acts.storyOrder4=()=>{ const d=derive(); if(!d[3]||d[4])return; app.go('storyT04',{island:null}); };
  ext.acts.storyTrain4=()=>{ if(!islandLocked())app.startSession('teen'); };
  ext.acts.storyBack4=(a)=>{
    if(!active){
      const ep=Number(a&&a.dataset&&a.dataset.ep)||0;
      const waiting=ep?replayWaiting(ep):null;
      const row=waiting||(ep&&lesson(ep)&&lesson(ep).level==='closed'?lesson(ep):null);
      if(row)active={ep:row.ep||ep,at:row.since,replay:waiting?1:0};
    }
    backFromSeries();
  };
  ext.acts.storyOrderBack4=backFromScene;
  chain('lessonSnap',(info)=>{
    if(!active||!info||!info.item||!info.item.key)return '';
    const replay=active.replay?1:0;
    root.__insights&&root.__insights.logGame({game:'ten-bridge',origin:replay?'story-t04-replay-draft':'story-t04-lesson',slot:(replay?'t04-replay-try-':'t04-lesson-')+pid()+'-'+active.ep,level:info.closed?'closed':'open',rounds:0,ep:active.ep,pid:pid(),since:active.at,skill:'teen',replay:replay,
      len:info.len,phase:info.phase,count:info.count,results:info.results,item:info.item,si:info.si,wr:info.wr,kp:info.kp,clean:info.clean,done:info.done,taps:info.taps,heard:info.heard,ins:info.ins,earned:info.earned});
    return '';
  });
  chain('leave',(screen)=>{ if(active&&screen!=='task'&&screen!=='break')active=null; return ''; });
  chain('islandExtra',(id)=>{
    if(id!=='teen'||!t03Done())return '';
    if(islandLocked())return '<p class="story-badge">Большой день: Королевство откроется после предыдущего острова</p>';
    return '<button type="button" class="btn ghost" data-act="storyT04">Помочь Королю · Большой день</button>'+places();
  });
  chain('breakExtra',()=> active?BTN+'storyBack4">Вернуться к Королю</button>':'');
  const REG=root.__storyMap;
  if(REG)REG.items.push({
    done:()=>!!derive()[4],
    yard:()=>places(),
    action:()=>{
      if(!t03Done()||derive()[4])return null;
      if(sceneOrder())return {act:'storyOrderBack4',label:'Рассказать Королю'};
      if(!derive()[1]&&!islandLocked())return {act:'storyT04',label:'Помочь Королю'};
      return null;
    }
  });
  if(app.S.screen==='map')app.render();
})(window);

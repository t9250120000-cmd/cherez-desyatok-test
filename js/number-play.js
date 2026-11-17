/* Волна 1: четыре игры в библиотеке «Игры с числами» (экран numberPlay). Подключается через хуки
   numberGameCards/numberGamePick, сохраняя цепочку прежних хуков. Без таймеров, звёзд и монеток;
   итог серии пишется только в наблюдения для родителя. Голос — только существующие записи Дениса
   (похвала, числа, отдых, «Можно отдохнуть!»), новые инструкции пока только на экране. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext,C=root.TEREM_NUMBER_PLAY;
  if(!app||!ext||!C)return;
  const SP=root.SP360;
  const base=new URL('../',document.currentScript.src),asset=p=>new URL(p,base).href;
  let game=null,s=null,paused=false,logged=false,origin=null;
  const rng=()=>Math.random();
  const BERRY='<span class="np-berry" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M11 15C6 24 16 40 24 43C32 40 42 24 37 15C32 9 16 9 11 15Z" fill="currentColor"/><path d="M24 16L11 10L21 9L24 3L27 9L37 10Z" fill="#376E4B"/></svg></span>';
  const BERRY_ART='<img class="np-berry-art" alt="" draggable="false" src="'+asset('art/berry.webp')+'">';
  let receiver='';
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plural=(n,a,b,c)=>{const m=n%100,k=n%10;return m>10&&m<20?c:k===1?a:k>=2&&k<=4?b:c;};
  const berries=n=>n+' '+plural(n,'ягода','ягоды','ягод');
  function btn(action,text,secondary,attrs){return '<button type="button" class="ng-button'+(secondary?' ng-secondary':'')+'" data-np="'+action+'" '+(attrs||'')+'>'+text+'</button>';}
  const rd=()=>'data-round="'+(s?s.round:0)+'"';
  function hero(){return '<img class="ng-hero" src="'+asset('art/companion/bulk-waiting.webp')+'" alt="" draggable="false">';}
  function row(n,cls){return Array.from({length:n},()=>'<span class="np-item '+(cls||'')+'">'+BERRY+'</span>').join('');}
  function say(ph){if(ph&&SP&&SP.speak)SP.speak(ph);}
  function sayNumber(n){if(root.FP&&root.FP.answer)root.AUDIO.say(root.FP.answer(n),{force:true});}
  function praise(){const p=root.PH&&root.PH.praise;return p&&p.length?p[Math.floor(Math.random()*p.length)]:null;}

  /* ---------- каркас ---------- */
  function shell(body){
    const seat=origin==='story-t03-3'||origin==='story-t03-4'?' jelly-seat':'';
    const forest=game==='split-baskets'&&s&&s.task&&(s.task.again||s.task.order)?' forest-seat':'';
    const top=s&&s.phase==='finish'&&seat?btn('exit','На карту',true):btn(game?'hub':'exit',game?'← Все игры':'← На карту',true);
    return '<section class="number-games number-play'+seat+forest+'" aria-labelledby="ng-title"><nav class="ng-nav" aria-label="Навигация">'+top+(s&&s.phase!=='finish'&&!paused?btn('pause','Перерыв',true):'')+'</nav>'+body+'</section>';
  }
  function intro(){
    const d=C.GAMES[game];
    return '<div class="ng-intro">'+hero()+'<p class="ng-kicker">'+d.skill+'</p><h1 id="ng-title">'+d.name+'</h1><p>'+d.intro+'</p><div class="ng-start">'+d.levels.map(([id,label],i)=>btn('level',label,i>0,'data-level="'+id+'"')).join('')+'</div><p class="ng-footnote">Три задания. Без таймера, предметы не исчезают.<br>Игра не меняет звёзды и монетки.</p></div>';
  }
  function progress(){const n=s.queue.length;return '<div class="ng-progress np-progress" aria-label="Задание '+(s.round+1)+' из '+n+'">'+s.queue.map((_,i)=>'<span class="'+(i<s.round?'done':i===s.round?'current':'')+'"></span>').join('')+'</div>';}
  function heading(title,desc){return '<header class="ng-heading"><h1 id="ng-title">'+title+'</h1><p>'+desc+'</p></header>';}
  function feedback(){
    const m=s.msg==='need'&&s.task&&s.task.order?'Бульку нужно ровно '+s.task.need+'. Отсчитай его ягоды по одной.':(s.msg?C.MSG[s.msg]||'':'');
    return '<p class="ng-feedback" role="status">'+esc(m)+'</p>';
  }
  function controls(checkLabel){
    if(s.phase==='success')return '<div class="ng-controls">'+btn('next',s.round===s.queue.length-1?'Завершить':'Следующее задание',false,rd())+'</div>';
    return '<div class="ng-controls">'+(checkLabel?btn('check',checkLabel,false,rd()):'')+btn('help','Подсказка',true,rd()+(s.help?' aria-pressed="true"':''))+'</div>';
  }
  function view(){
    if(!game)return shell('');
    if(paused)return shell('<div class="ng-intro">'+hero()+'<h1 id="ng-title">Отдыхаем</h1><p>Продолжим, когда захочешь.<br>Задание тебя подождёт.</p>'+btn('resume','Продолжить')+'</div>');
    if(!s)return shell(intro());
    if(s.phase==='finish')return shell(finish());
    const v=game==='split-baskets'?baskets():game==='equalize'?equalize():game==='order-train'?train():hidden();
    return shell(progress()+v);
  }
  function finish(){
    const r=s.results;let list='';
    if(game==='split-baskets')list=r.map((x,i)=>s.level==='order'?'<span>Бульку '+x.parts[0]+' · Тестику '+x.parts[1]+'</span>':'<span>'+s.queue[i].total+' = '+x.parts[0]+' + '+x.parts[1]+'</span>').join('');
    else if(game==='equalize')list=r.map(x=>'<span>'+x.to[0]+' = '+x.to[1]+'</span>').join('');
    else if(game==='order-train')list=r.map(x=>'<span>'+x.order.join(' &lt; ')+'</span>').join('');
    else list=r.map((x,i)=>'<span>'+(s.queue[i].total-x.hidden)+' + '+x.hidden+' = '+s.queue[i].total+'</span>').join('');
    const next=game==='split-baskets'&&origin==='story-t03-4'?'<p class="np-next">Дальше — Королевство: Король Пельмень собирает гостей десятками.</p>':'';
    const fork=game==='split-baskets'&&(origin==='story-t03-3'||origin==='story-t03-4')?'<img class="np-fork-art" src="'+asset('art/jelly-fork.webp')+'" alt="Развилка: слева дом Булька, справа мельница Тестика">':'';
    return '<div class="ng-intro">'+fork+hero()+'<p class="ng-kicker">Три задания позади</p><h1 id="ng-title">Можно отдохнуть!</h1><p>Или выбрать другую игру.</p><div class="np-done" aria-label="Что получилось">'+list+'</div>'+next+btn('hub','Выбрать другую игру')+btn('again','Ещё три задания',true)+btn('exit','На карту',true)+'</div>';
  }

  /* ---------- Две корзинки ---------- */
  function baskets(){
    const t=s.task,table=t.total-s.left-s.right,ok=s.phase==='success';
    const order=!!t.order,again=!!t.again;
    const story=origin==='story-t03-3'||origin==='story-t03-4';
    const friends=!!(again||order);
    const names=friends?{left:'Бульку',right:'Тестику'}:{left:'Слева',right:'Справа'};
    const CH=root.CH;
    const palImg=(id,label)=>CH?CH.pal(id,'np-pal',label,ok?'happy':undefined):'';
    const basket=(side,label)=>{
      /* Справа цель — точный остаток. До успеха и до кнопки «Подсказка» его нет:
         ошибка выставляет help, но это не подсказка. */
      const told=ok||s.msg==='helpOrder';
      const goal=side==='left'?t.need:(told?t.total-t.need:null);
      const count='<b>'+s[side]+'</b>';
      const aim=order&&goal!=null?'<span class="np-goal">из '+goal+'</span>':'';
      const head=friends?'<span class="np-who">'+label+'</span><span class="np-basket-count">'+count+aim+'</span>':(order?(label+' '+count+(goal==null?'':' из '+goal)):label+' '+count);
      const face=story&&!friends?palImg(side==='left'?'see':'to10',label):'';
      const put=friends?'+ '+label:'+ Положить', take=friends?'− '+label:'− Вернуть';
      const items=friends?Array.from({length:s[side]},(_,i)=>{
        const fly=receiver&&i===s[side]-1&&((side==='left'&&receiver==='a')||(side==='right'&&receiver==='b'));
        return '<span class="np-item '+(fly?'np-fly ':'')+side+'">'+BERRY_ART+'</span>';
      }).join(''):row(s[side],side);
      return '<div class="np-basket '+side+'"><h2>'+face+head+'</h2><div class="np-items" aria-label="'+label+': '+berries(s[side])+'">'+items+'</div>'+
      (ok?'':'<div class="np-pair">'+btn('take',take,true,rd()+' data-repeat="take-'+side+'" data-side="'+side+'" aria-label="'+label+': вернуть одну ягоду на стол" '+(s[side]?'':'disabled'))+btn('put',put,false,rd()+' data-repeat="put-'+side+'" data-side="'+side+'" aria-label="'+label+': положить одну ягоду" '+(table?'':'disabled'))+'</div>')+'</div>';
    };
    const bar='<div class="np-bar" aria-hidden="true">'+Array.from({length:t.total},(_,i)=>'<i class="'+(i<s.left?'left':i<s.left+s.right?'right':'')+'"></i>').join('')+'</div>';
    const heroes=friends?'':(order?'<div class="np-heroes" aria-hidden="true">'+palImg('see','Бульк')+palImg('to10','Тестик')+'</div>':'');
    const fork=story&&!friends?'<img class="np-fork-art" src="'+asset('art/jelly-fork.webp')+'" alt="Развилка: слева дом Булька, справа мельница Тестика">':'';
    const wood=friends?'<div class="forest-frame" data-receiver="'+receiver+'"><img class="forest-plate" src="'+asset('art/forest.webp')+'" alt="Желейный лес: Бульк и Тестик"><div class="forest-acting" aria-hidden="true"><img class="forest-pose forest-pose-a" alt="" src="'+asset('art/forest-bulk-catch.webp')+'"><img class="forest-pose forest-pose-b" alt="" src="'+asset('art/forest-testik-peek.webp')+'"></div></div>':'';
    const tableItems=friends?Array.from({length:table},()=>'<span class="np-item table">'+BERRY_ART+'</span>').join(''):row(table,'table');
    const prevList=again&&(t.prevPairs||[]).length?'<p class="np-prev">Уже собрано: '+t.prevPairs.map(p=>p[0]+' и '+p[1]).join(' · ')+'</p>':'';
    const title=ok?(order?'Заказ собран!':'Получилось!'):order?'Заказ двум друзьям':again&&(t.prevPairs||[]).length?'Собери по-другому':'Разложи '+t.total+' '+plural(t.total,'ягоду','ягоды','ягод')+' в две корзинки';
    const desc=ok?(order?'Обе корзинки собраны по заказу.':'Две части — одно число.'):order?'Бульку нужно ровно '+t.need+'. Остальные — Тестику.':again?((t.prevPairs||[]).length?'Эти способы уже были — придумай новый.':'Одно и то же число можно разложить по-разному.'):t.allowZero?'Подойдёт любой способ — можно оставить одну корзинку пустой.':'В каждую корзинку — хотя бы одну ягоду. Остальные раскладывай как хочешь.';
    return heading(title,desc)+heroes+prevList+wood+fork+
      '<div class="ng-scene np-scene"><div class="np-table"><span>На столе: <b>'+table+'</b></span><div class="np-items">'+tableItems+'</div>'+btn('listen','Послушать: всего '+t.total,true,'data-n="'+t.total+'"')+'</div>'+
      '<div class="np-baskets">'+basket('left',names.left)+basket('right',names.right)+'</div>'+
      ((s.help||ok||story)?bar+'<p class="np-sum">'+s.left+' и '+s.right+(ok||table===0?' — вместе '+t.total:' · на столе ещё '+table)+'</p>':'')+'</div>'+
      (ok?'<p class="ng-solution">'+t.total+' = '+s.left+' + '+s.right+'</p>':'')+feedback()+controls(ok?null:'Проверить');
  }

  /* ---------- Сделай поровну ---------- */
  function equalize(){
    const t=s.task,ok=s.phase==='success',n=Math.max(s.left,s.right,t.left,t.right);
    const side=(k,label)=>{
      const extra=Math.max(0,s[k]-t[k]),kept=Math.min(s[k],t[k]);
      const cells=Array.from({length:n},(_,i)=>'<span class="np-slot'+(s.help&&i<Math.min(s.left,s.right)?' paired':'')+'">'+(i<kept?'<span class="np-item">'+BERRY+'</span>':i<kept+extra?'<span class="np-item added">'+BERRY+'</span>':'')+'</span>').join('');
      const minus=s.level==='add'?(extra?btn('remove','− Вернуть',true,rd()+' data-repeat="remove-'+k+'" data-side="'+k+'" aria-label="'+label+': вернуть добавленную ягоду"'):''):btn('remove','− Убрать',true,rd()+' data-repeat="remove-'+k+'" data-side="'+k+'" aria-label="'+label+': убрать одну ягоду" '+(s[k]>1?'':'disabled'));
      return '<div class="np-basket '+k+'"><h2>'+label+' <b>'+s[k]+'</b></h2><div class="np-column" aria-label="'+label+': '+berries(s[k])+'">'+cells+'</div>'+(ok?'':'<div class="np-pair">'+minus+btn('add','+ Добавить',false,rd()+' data-repeat="add-'+k+'" data-side="'+k+'" aria-label="'+label+': добавить одну ягоду" '+(s[k]<C.MAXQ?'':'disabled'))+'</div>')+'</div>';
    };
    const desc=s.level==='add'?'Добавь ягоды, чтобы стало поровну.':'Можно добавить или убрать. Подойдёт любой способ.';
    return heading(ok?'Получилось!':'Сделай поровну',ok?'В корзинках поровну.':desc)+
      '<div class="ng-scene"><div class="np-baskets eq'+(s.help?' paired':'')+'">'+side('left','Слева')+side('right','Справа')+'</div>'+'</div>'+
      (ok?'<p class="ng-solution">'+s.left+' = '+s.right+'</p>':'')+feedback()+controls(ok?null:'Проверить');
  }

  /* ---------- Поезд чисел ---------- */
  function dots(n){return '<span class="np-dots" aria-hidden="true">'+Array.from({length:n},()=>'<i></i>').join('')+'</span>';}
  function train(){
    const t=s.task,ok=s.phase==='success',small=s.level==='small';
    const wag=s.order.map((v,i)=>{
      const sel=s.sel===i,bad=s.bad&&s.bad.includes(i);
      return '<button type="button" class="np-wagon'+(sel?' selected':'')+(bad?' bad':'')+'" data-np="tap" data-index="'+i+'" '+rd()+' aria-pressed="'+sel+'" aria-label="Вагон '+(i+1)+': число '+v+(sel?', выбран':'')+'" '+(ok?'disabled':'')+'><b>'+v+'</b>'+(small||s.help?dots(v):'')+'</button>';
    }).join('');
    const line=s.help||ok?'<div class="np-line" aria-label="Числовая дорожка от '+(small?0:0)+' до '+(small?5:10)+'">'+Array.from({length:(small?5:10)+1},(_,n)=>'<span class="'+(s.order.includes(n)?'on':'')+'">'+n+'</span>').join('')+'</div>':'';
    return heading(ok?'Поезд готов!':'Расставь вагоны по порядку',ok?'От меньшего к большему.':'Слева — меньшее число, справа — большее. Нажми на два вагона, чтобы поменять их.')+
      '<div class="ng-scene"><div class="np-train" role="group" aria-label="Поезд"><span class="np-engine" aria-hidden="true"><svg viewBox="0 0 64 48"><rect x="4" y="16" width="38" height="20" rx="5" fill="var(--ca,#D43F57)"/><rect x="30" y="6" width="16" height="30" rx="4" fill="var(--ca,#D43F57)"/><rect x="34" y="10" width="8" height="8" rx="2" fill="#FFF4D6"/><rect x="10" y="8" width="7" height="10" rx="2" fill="#5B4636"/><circle cx="14" cy="39" r="6" fill="#3A3A4A"/><circle cx="36" cy="39" r="6" fill="#3A3A4A"/><path d="M46 30h10l4 6H46z" fill="#5B4636"/></svg></span>'+wag+'</div><p class="ng-small">меньше → больше</p>'+line+'</div>'+
      (ok?'<p class="ng-solution">'+s.order.join(' &lt; ')+'</p>':'')+feedback()+controls(ok?null:'Проверить порядок');
  }

  /* ---------- Сколько спряталось? ---------- */
  function hidden(){
    const t=s.task,ok=s.phase==='success',vis=t.total-t.hidden;
    const cover='<span class="np-leaf'+(s.help?' open':'')+'" role="img" aria-label="Листик: здесь спрятались ягоды'+(s.help?', пустых мест '+t.hidden:'')+'">'+(s.help?Array.from({length:t.hidden},()=>'<i class="np-empty"></i>').join(''):'<b aria-hidden="true">?</b>')+'</span>';
    const scene=ok?row(vis)+row(t.hidden,'found'):row(vis)+cover;
    const ch=ok?'':'<div class="ng-choices">'+t.choices.map(v=>btn('answer',String(v),false,rd()+' data-value="'+v+'"')).join('')+'</div>';
    return heading(ok?'Получилось!':'Сколько спряталось?',ok?'Видно '+vis+', спряталось '+t.hidden+'.':'Видно '+vis+'. Остальные — под листиком.')+
      '<div class="ng-scene"><div class="np-total">Всего <b>'+t.total+'</b>'+btn('listen','Послушать',true,'data-n="'+t.total+'" aria-label="Послушать: всего '+t.total+'"')+'</div><div class="np-hide'+(t.total>5?' two':'')+'" aria-label="Видно '+berries(vis)+(ok?', спряталось '+t.hidden:'')+'">'+scene+'</div></div>'+
      (ok?'<p class="ng-solution">'+vis+' + '+t.hidden+' = '+t.total+'</p>':'')+feedback()+(ok?'':ch)+controls(null);
  }

  /* ---------- ход игры ---------- */
  function stopVoice(reset){if(root.LIBRARY_VOICE)root.LIBRARY_VOICE.cancel(reset);root.AUDIO.stop();}
  function narrate(action,lead){
    const V=root.LIBRARY_VOICE,current=s;
    if(!V){if(lead)root.AUDIO.say(lead);return;}
    V.present({screen:'numberPlay',game,level:s&&s.level,round:s?s.round:-1,phase:s?s.phase:'intro',paused,
      repeat:action==='help'||action==='resume',valid:()=>app.S.screen==='numberPlay'&&s===current&&!paused},lead);
  }
  function paint(sel,action,lead){app.render();narrate(action,lead);if(sel){const el=document.querySelector(sel);if(el)el.focus({preventScroll:true});}}
  function log(){if(logged||!s||s.phase!=='finish')return;logged=true;if(root.__insights){
    const pack=s.level==='order'&&s.results.every(r=>Array.isArray(r.parts))?{deliveries:s.results.map(r=>[r.parts[0],r.parts[1]])}:null;
    root.__insights.logGame({...C.result(s),...(pack||{}),...(origin?{origin}:null)});
  }}
  function sceneDraft(){return origin==='story-t03-3'||origin==='story-t03-4';}
  function draftSlot(level){
    const pid=app.P&&app.P()&&app.P().id;
    if(!pid||(level!=='again'&&level!=='order'))return '';
    return 't03-scene-'+pid+'-'+level;
  }
  function packTask(t){
    if(!t||!Number.isInteger(t.total))return null;
    const o={id:String(t.id||''),total:t.total,allowZero:!!t.allowZero};
    if(t.again)o.again=true;
    if(t.order){o.order=true;if(!Number.isInteger(t.need))return null;o.need=t.need;}
    if(Array.isArray(t.prevPairs))o.prevPairs=t.prevPairs.filter(p=>Array.isArray(p)&&p.length===2&&Number.isInteger(p[0])&&Number.isInteger(p[1])).map(p=>[p[0],p[1]]);
    return o;
  }
  function saveDraft(){
    if(!sceneDraft()||!s||!root.__insights||!root.__insights.logGame)return;
    const slot=draftSlot(s.level);
    const queue=(s.queue||[]).map(packTask);
    if(!slot||queue.some(t=>!t))return;
    root.__insights.logGame({game:'split-baskets-draft',origin:'story-t03-scene-draft',slot,pid:app.P().id,level:s.level,phase:s.phase,round:s.round,left:s.left|0,right:s.right|0,help:s.help?1:0,wrong:s.wrong|0,errors:s.errors|0,msg:typeof s.msg==='string'?s.msg:'',queue,results:Array.isArray(s.results)?s.results:[]});
  }
  function readDraft(level){
    const I=root.__insights,p=I&&I.prof&&I.prof(),slot=draftSlot(level),pid=app.P&&app.P()&&app.P().id;
    if(!p||!slot)return null;
    const rows=(p.games||[]).filter(g=>g&&g.slot===slot);
    const row=rows.length?rows[rows.length-1]:null;
    if(!row||row.pid!==pid||row.level!==level||row.game!=='split-baskets-draft')return null;
    if(row.phase!=='play'&&row.phase!=='success')return null;
    if(!Array.isArray(row.queue)||row.queue.length!==3||!Number.isInteger(row.round)||row.round<0||row.round>2)return null;
    const queue=row.queue.map(packTask);
    if(queue.some(t=>!t)||queue.some(t=>t.total<6||t.total>9))return null;
    if(level==='again'&&queue.some(t=>!t.again))return null;
    if(level==='order'&&queue.some(t=>!t.order||t.need<1||t.need>=t.total))return null;
    const task=queue[row.round];
    if(!Number.isInteger(row.left)||!Number.isInteger(row.right)||row.left<0||row.right<0||row.left+row.right>task.total)return null;
    const results=Array.isArray(row.results)?row.results:[];
    if(results.length!==row.round+(row.phase==='success'?1:0))return null;
    return {game:'split-baskets',level,queue,results,errors:row.errors|0,round:row.round,phase:row.phase,help:!!row.help,msg:row.msg||'',wrong:row.wrong|0,task,sel:null,left:row.left,right:row.right};
  }
  function start(level){s=(sceneDraft()&&readDraft(level))||C.create(game,level,rng);logged=false;paused=false;stopVoice();paint(FIRST);}
  const FIRST='[data-np="put"]:not(:disabled),[data-np="add"],[data-np="tap"],[data-np="answer"]';
  /* origin — доказанное сюжетное происхождение одной серии (сцена «Большого
     дня»); действует до первого завершённого лога и сбрасывается при выходе,
     возврате в хаб и повторной серии. Игры вне сцены поведением не меняются. */
  function open(id,org,level){game=id;s=null;paused=false;origin=typeof org==='string'?org:null;stopVoice(true);app.go('numberPlay',{island:null});
    /* Сцена может открыть конкретный уровень сразу (предметный предвыбор),
       хаб по-прежнему показывает выбор уровня. */
    if(level&&C.GAMES[id]&&C.GAMES[id].levels.some(([lv])=>lv===level)){start(level);return;}
    narrate('intro');}

  ext.views.numberPlay=view;
  ext.acts.numberPlay=(a)=>open(a&&a.dataset&&a.dataset.game||'split-baskets');
  const art={
    'split-baskets':()=>'<div class="ng-card-art np-card-baskets"><span>'+BERRY+BERRY+'</span><span>'+BERRY+BERRY+BERRY+'</span></div>',
    'equalize':()=>'<div class="ng-card-art np-card-eq"><span>'+BERRY+BERRY+'</span><b>=</b><span>'+BERRY+BERRY+'</span></div>',
    'order-train':()=>'<div class="ng-card-art np-card-train"><span>2</span><span>3</span><span>5</span></div>',
    'hidden-part':()=>'<div class="ng-card-art np-card-hidden"><span>'+BERRY+BERRY+'</span><i>?</i></div>'
  };
  const priorCards=ext.hooks.numberGameCards;
  ext.hooks.numberGameCards=function(card,berry){
    let h='';try{h=priorCards?priorCards(card,berry):'';}catch(e){}
    return h+Object.keys(C.GAMES).map(id=>card(id,C.GAMES[id].name,C.GAMES[id].skill,art[id]())).join('');
  };
  const priorPick=ext.hooks.numberGamePick;
  ext.hooks.numberGamePick=function(id){if(priorPick&&priorPick(id))return true;if(!Object.hasOwn(C.GAMES,id))return false;open(id);return true;};
  // Кнопка на острове показывает настоящее число игр в библиотеке.
  const priorIsland=ext.hooks.islandExtra;
  ext.hooks.islandExtra=function(){
    const h=priorIsland?priorIsland.apply(this,arguments)||'':'';
    if(!/Игры с числами · \d+ игр/.test(h)||!ext.hooks.numberGameCards)return h;
    let n=0;try{ext.hooks.numberGameCards(()=>{n++;return '';},'');}catch(e){}
    return h.replace(/Игры с числами · \d+ игр/,'Игры с числами · '+(6+n)+' '+plural(6+n,'игра','игры','игр'));
  };

  const FOCUS={put:'[data-np="put"][data-side="SIDE"]',take:'[data-np="take"][data-side="SIDE"]',add:'[data-np="add"][data-side="SIDE"]',remove:'[data-np="remove"][data-side="SIDE"]'};
  document.getElementById('app').addEventListener('click',e=>{
    const b=e.target.closest('[data-np]');if(!b||app.S.screen!=='numberPlay')return;
    const action=b.dataset.np;
    if(action==='exit'){saveDraft();stopVoice(true);s=null;game=null;origin=null;app.go('map',{island:null});return;}
    if(action==='hub'){saveDraft();stopVoice(true);s=null;game=null;origin=null;if(ext.acts.numberGames)ext.acts.numberGames();else app.go('map',{island:null});return;}
    if(action==='level'){if(s)return;start(b.dataset.level);return;}
    if(action==='again'){if(!s||s.phase!=='finish')return;origin=null;start(s.level);return;}
    if(!s)return;
    if(action==='pause'){paused=true;stopVoice(true);say(SP&&SP.games&&SP.games.pause);paint('[data-np="resume"]');return;}
    if(action==='resume'){paused=false;stopVoice();paint(null,'resume');return;}
    if(paused)return;
    if(action==='listen'){stopVoice();sayNumber(Number(b.dataset.n));return;}
    const prev=s;
    s=C.reduce(s,{type:action,round:Number(b.dataset.round),side:b.dataset.side,index:Number(b.dataset.index),value:Number(b.dataset.value)});
    if(s===prev){if(action==='help')narrate(action);return;}
    stopVoice();
    const lead=s.phase==='success'&&prev.phase!=='success'?praise():null;
    if(s.phase==='finish'){log();saveDraft();say(SP&&SP.games&&SP.games.finish);}
    else saveDraft();
    const side=b.dataset.side;
    if(game==='split-baskets'&&s.task&&(s.task.again||s.task.order))receiver=action==='put'?(side==='left'?'a':side==='right'?'b':''):'';
    const f=s.phase==='success'?'[data-np="next"]':s.phase==='finish'?'[data-np="exit"]':FOCUS[action]?FOCUS[action].replace('SIDE',side):action==='tap'?'[data-np="tap"][data-index="'+b.dataset.index+'"]':action==='next'?FIRST:action==='answer'?'[data-np="answer"]':action==='check'?'[data-np="check"]':action==='help'?'[data-np="help"]':null;
    paint(f,action,lead);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&app.S.screen==='numberPlay'&&s&&s.phase!=='finish'){saveDraft();paused=true;stopVoice(true);paint();}});
  root.__numberPlay={get state(){return s;},get game(){return game;},open};
})(window);

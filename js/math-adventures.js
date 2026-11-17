/* Subject-based number adventures. Existing extension API; no saved-progress format changes. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext,C=root.TEREM_ADVENTURES;
  if(!app||!ext||!C)return;
  const asset=p=>new URL('../'+p,document.currentScript.src).href;
  const heroSrc=asset('art/companion/bulk-waiting.webp');
  let game=null,s=null,paused=false,logged=false,storyOrigin=null;
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button=(action,label,attrs='',secondary=false)=>{
    const repeat=['step','undo','add','remove','adjust','tile'].includes(action)?' data-repeat="'+esc(game+'|'+(s?s.round:-1)+'|'+action+'|'+attrs)+'"':'';
    return '<button type="button" class="ng-button'+(secondary?' ng-secondary':'')+'" data-ma="'+action+'"'+repeat+' '+attrs+'>'+label+'</button>';
  };
  const round=()=>'data-round="'+s.round+'"';
  const hero=()=>'<img class="ng-hero" alt="" src="'+heroSrc+'" draggable="false">';
  const dot=(kind='',removed=false)=>'<span class="ma-object '+kind+(removed?' removed':'')+'" aria-hidden="true">'+(kind==='cup'?'<svg viewBox="0 0 32 32"><path d="M7 7h16v14a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5zM23 10h3a4 4 0 0 1 0 8h-3"/></svg>':kind==='passenger'?'<svg viewBox="0 0 32 32"><circle cx="16" cy="9" r="6"/><path d="M6 29v-6a10 10 0 0 1 20 0v6z"/></svg>':'')+'</span>';
  const objects=(n,kind='',removed=0)=>'<div class="ma-objects" role="img" aria-label="'+n+' предметов'+(removed?', из них убрали '+removed:'')+'">'+Array.from({length:n},(_,i)=>dot(kind,i>=n-removed)).join('')+(n===0?'<span class="ma-zero">0</span>':'')+'</div>';
  const frame=(n,blue=0)=>'<div class="ma-frame" role="img" aria-label="Теремок: '+n+' жителей, '+(10-n)+' пустых мест">'+Array.from({length:10},(_,i)=>'<span class="ma-room">'+(i<n?'<img src="'+assetImage(i>=n-blue?'blue':'red')+'" alt="" draggable="false">':'<i aria-hidden="true"></i>')+'</span>').join('')+'</div>';
  const redSrc=asset('art/counter-red.webp'),blueSrc=asset('art/counter-blue.webp');
  function assetImage(color){return color==='blue'?blueSrc:redSrc;}
  const heading=(title,text)=>'<header class="ng-heading"><h1 id="ma-title">'+title+'</h1><p>'+text+'</p></header>';
  function shell(body){return '<section class="number-games math-adventures" aria-labelledby="ma-title"><nav class="ng-nav" aria-label="Навигация">'+button('hub','← Все игры','',true)+(s&&s.phase!=='finish'&&!paused?button('pause','Перерыв','',true):'')+'</nav>'+body+'</section>';}
  function intro(){const d=C.GAMES[game];return '<div class="ng-intro">'+hero()+'<p class="ng-kicker">'+d.skill+'</p><h1 id="ma-title">'+d.name+'</h1><p>'+d.intro+'</p><div class="ng-start">'+d.levels.map(([id,label],i)=>button('level',label,'data-level="'+id+'"',i>0)).join('')+'</div><p class="ng-footnote">Три задания в своём темпе.<br>Можно попросить взрослого прочитать инструкцию.</p></div>';}
  function summary(t){switch(game){case 'tens-workshop':return t.total+' = 10 + '+(t.total-10);case 'balance-sums':return t.a+' + '+t.b+' = '+t.c+' + '+t.answer;case 'unit-builder':return 'Длина '+t.answer;case 'number-domino':return t.answer+' → '+t.next;default:return t.a+' '+(t.op||'+')+' '+t.b+' = '+t.answer;}}
  function finish(){const n=s.queue.length;return '<div class="ng-intro">'+hero()+'<p class="ng-kicker">'+(n===2?'Два заказа готовы':'Три задания позади')+'</p><h1 id="ma-title">'+(storyOrigin?'Можно рассказать Королю':'Можно отдохнуть!')+'</h1><div class="ma-summary">'+s.queue.map(t=>'<span>'+summary(t)+'</span>').join('')+'</div>'+(storyOrigin?'':button('hub','Выбрать другую игру')+button('again','Ещё три задания','',true))+button('exit','На карту','',true)+'</div>';}
  function choices(){return '<div class="ng-choices">'+s.task.choices.map(v=>button('answer',String(v),round()+' data-value="'+v+'"')).join('')+'</div>';}
  function stepper(addLabel,removeLabel,canAdd,canRemove){return '<div class="ma-actions">'+button('add',addLabel,round()+(canAdd?'':' disabled'))+button('remove',removeLabel,round()+(canRemove?'':' disabled'),true)+'</div>';}
  function bus(){
    const t=s.task,ok=s.phase==='success',current=t.op==='+'?t.a+s.moved:t.a-s.moved,remaining=t.b-s.moved;
    const seats='<div class="ma-bus" role="img" aria-label="В автобусе пассажиров: '+current+'"><div class="ma-bus-sign">БУЛЬК · '+current+'</div><div class="ma-seats">'+Array.from({length:10},(_,i)=>'<span class="ma-seat">'+(i<current?dot('passenger'):'')+'</span>').join('')+'</div><i class="ma-wheel first"></i><i class="ma-wheel last"></i></div>';
    return heading(ok?'Получилось!':remaining?(t.op==='+'?'Посади пассажиров':'Высади пассажиров'):'Сколько теперь в автобусе?',remaining?'Было '+t.a+'. На этой остановке '+(t.op==='+'?'садятся ':'выходят ')+t.b+'.':'Посчитай занятые места.')+'<div class="ng-scene ma-scene">'+seats+(remaining?'<div class="ma-stop"><strong>'+ (t.op==='+'?'Ждут на остановке':'Ещё выйдут')+': '+remaining+'</strong>'+objects(remaining,'passenger')+'</div>':'')+'</div>'+(ok?'':remaining?'<div class="ma-actions">'+button('step',t.op==='+'?'Посадить одного':'Высадить одного',round())+(s.moved?button('undo','Вернуть одного',round(),true):'')+'</div>':choices());
  }
  function bridge(){const t=s.task,ok=s.phase==='success',remaining=t.toTen-s.moved;return heading(ok?'Мост построен!':remaining?'Сначала собери десять':'Десять и ещё сколько?',t.a+' + '+t.b+'. '+(remaining?(s.level==='first'||s.help?'До десяти не хватает '+remaining+'.':'Заполни пустые места первого домика.'):'В первом домике десять. Посчитай всех.'))+'<div class="ng-scene ma-scene"><div class="ma-houses"><div><h2>Первый домик</h2>'+frame(t.a+s.moved,s.moved)+'</div><div><h2>Второй домик</h2>'+frame(t.b-s.moved,t.b-s.moved)+'</div></div>'+(s.help||!remaining?'<p class="ma-equation">'+t.b+' = '+t.toTen+' + '+(t.b-t.toTen)+'</p>':'')+'</div>'+(ok?'':remaining?button('step','Переселить одного',round()):choices());}
  function workshop(){
    const t=s.task,ok=s.phase==='success',packing=s.level==='first',bundled=packing?s.exchanged:!s.exchanged;
    const ten='<div class="ma-frame ma-bundle-grid" role="img" aria-label="10 отдельных деталей">'+Array.from({length:10},()=>'<span class="ma-room">'+dot()+'</span>').join('')+'</div>';
    const bundle='<div class="ma-bundle" role="img" aria-label="Один десяток: 10 деталей">'+ten+'<strong>10</strong></div>';
    const quiet=s.story&&!ok;
    return heading(ok?'Количество сохранилось!':s.exchanged?(packing?'Сколько отдельных деталей?':'Сколько деталей всего?'):(packing?'Собери десять деталей вместе':'Разбери десяток на единицы'),'Всего '+t.total+'. '+(quiet?(bundled?'Десяток собран. Посчитай детали рядом и выбери число.':'Собери ровно десять. Ответ появится после связки.'):(bundled?'Один десяток и '+(t.total-10)+' отдельно.':'Все детали отдельно.')))+'<div class="ng-scene ma-scene"><div class="ma-workshop">'+(bundled?bundle:ten)+objects(t.total-10)+'</div><p class="ma-total">Всего '+t.total+'</p></div>'+(ok?'':s.exchanged?choices():button('exchange',packing?'Собрать 10 в десяток':'Разобрать десяток',round()));
  }
  function balance(){const t=s.task,ok=s.phase==='success',right=t.c+s.pieces;return heading(ok?'Весы уравновешены!':'Сделай чаши равными','Слева '+t.a+' + '+t.b+'. Справа '+t.c+' + сколько?')+'<div class="ng-scene ma-scene"><div class="ma-scales"><div class="ma-pan"><h2>Слева</h2>'+objects(t.a)+objects(t.b,'blue')+'<b>'+t.total+'</b></div><div class="ma-pan"><h2>Справа</h2>'+objects(t.c)+objects(s.pieces,'blue')+'<b>'+right+'</b></div></div><p class="ma-scale-status">'+(right===t.total?'Поровну':right<t.total?'Слева больше':'Справа больше')+'</p></div>'+(ok?'':stepper('+ Один кубик','− Вернуть кубик',s.pieces<10-t.c,s.pieces>0)+button('check','Проверить равенство',round()));}
  function repair(){const t=s.task,ok=s.phase==='success';return heading(ok?'Пример починен!':'Проверь ответ Булька','Измени число после знака «равно». Предметы помогут проверить.')+'<div class="ng-scene ma-scene">'+(t.op==='+'?'<div class="ma-joined">'+objects(t.a)+'<b>+</b>'+objects(t.b,'blue')+'</div>':objects(t.a,'',t.b))+'<div class="ma-equation">'+t.a+' '+t.op+' '+t.b+' = <strong class="ma-answer">'+s.value+'</strong></div></div>'+(ok?'':'<div class="ma-actions">'+button('adjust','− 1',round()+' data-delta="-1" aria-label="Уменьшить ответ на один"'+(s.value>0?'':' disabled'),true)+button('adjust','+ 1',round()+' data-delta="1" aria-label="Увеличить ответ на один"'+(s.value<10?'':' disabled'))+'</div>'+button('check','Проверить пример',round()));}
  const picnicGuests=n=>n+' '+(n===1?'гость':n>=2&&n<=4?'гостя':'гостей');
  function picnic(){const t=s.task,ok=s.phase==='success';return heading(ok?'Всем хватит чашек!':s.model===null?'Что сделать с чашками?':'Приготовь чашки','На пикнике '+picnicGuests(t.a)+'. '+(t.op==='+'?(t.b===1?'Пришёл ещё ':'Пришли ещё '):(t.b===1?'Ушёл ':'Ушли '))+picnicGuests(t.b)+'.')+'<div class="ng-scene ma-scene"><div class="ma-picnic">'+objects(s.cups,'cup')+'</div><p class="ma-total">Чашек: '+s.cups+'</p></div>'+(ok?'':s.model===null?'<div class="ma-actions">'+button('model','+ Добавить',round()+' data-value="+"')+button('model','− Убрать',round()+' data-value="−"',true)+'</div>':stepper('+ Одна чашка','− Убрать чашку',s.cups<10,s.cups>0)+button('check','Проверить чашки',round()));}
  function builder(){const t=s.task,ok=s.phase==='success',length=s.tiles.reduce((a,b)=>a+b,0);let at=0;const cells=Array.from({length:10},(_,i)=>'<span class="ma-unit '+(i<t.answer?'target':'')+'">'+(i===t.answer-1?'<b class="ma-flag" aria-label="Финиш">⚑</b>':'')+'</span>').join('');const tiles=s.tiles.map((n,i)=>{const start=at;at+=n;return '<span class="ma-tile tone'+i%2+'" style="grid-column:'+(start+1)+' / span '+n+'" aria-label="Плитка длиной '+n+'">'+Array.from({length:n},()=>'<i></i>').join('')+'</span>';}).join('');return heading(ok?'Дорожка нужной длины!':'Построй дорожку длины '+t.answer,'Одна клетка — одна единица. Начинай от нуля.')+'<div class="ng-scene ma-scene"><div class="ma-measure" tabindex="0" role="region" aria-label="Линейка и дорожка"><div class="ma-measure-content"><div class="ma-ruler" aria-label="Линейка от 0 до 10">'+Array.from({length:11},(_,i)=>'<span>'+i+'</span>').join('')+'</div><div class="ma-track" aria-label="Нужно '+t.answer+' единиц">'+cells+'</div><div class="ma-built" aria-label="Построено '+length+' единиц">'+tiles+'</div></div></div><p class="ma-total">Длина: '+length+'</p></div>'+(ok?'':'<div class="ma-actions">'+button('tile','Плитка 1',round()+' data-value="1"'+(length<10?'':' disabled'))+(s.level==='next'?button('tile','Плитка 2',round()+' data-value="2"'+(length<=8?'':' disabled')):'')+button('undo','Вернуть последнюю',round()+(s.tiles.length?'':' disabled'),true)+'</div>'+button('check','Проверить длину',round()));}
  function domino(){const t=s.task,ok=s.phase==='success';return heading(ok?'Карточка подошла!':'Продолжи дорожку',ok?'Теперь на конце '+t.next+'.':'На конце '+t.answer+'. Сравни с левой половиной карточки.')+'<div class="ng-scene ma-scene"><div class="ma-chain" aria-label="Дорожка домино">'+s.chain.map(x=>'<span>'+x.from+' | '+x.to+'</span>').join('')+'<strong class="ma-chain-end">'+(ok?t.next:t.answer)+'</strong></div></div><div class="ma-domino-options">'+t.choices.map(c=>'<button type="button" data-ma="answer" '+round()+' data-value="'+c.value+'" class="ma-domino '+(ok&&c.value===t.answer?'chosen':'')+'" '+(ok?'disabled':'')+' aria-label="Слева '+(s.level==='first'?c.value+' точек':c.a+' плюс '+c.b)+', справа '+t.next+'"><span>'+(s.level==='first'?objects(c.value):'<b>'+c.a+' + '+c.b+'</b>')+'</span><strong>'+t.next+'</strong></button>').join('')+'</div>';
  }
  const views={'number-bus':bus,'ten-bridge':bridge,'tens-workshop':workshop,'balance-sums':balance,'repair-equation':repair,'picnic-stories':picnic,'unit-builder':builder,'number-domino':domino};
  function view(){
    if(paused)return shell('<div class="ng-intro">'+hero()+'<h1 id="ma-title">Отдыхаем</h1><p>Задание тебя подождёт.</p>'+button('resume','Продолжить')+'</div>');
    if(!s)return shell(intro());if(s.phase==='finish')return shell(finish());
    const ok=s.phase==='success';
    const n=s.queue.length;
    return shell('<div class="ng-progress" aria-label="Задание '+(s.round+1)+' из '+n+'">'+Array.from({length:n},(_,i)=>'<span class="'+(i<s.round?'done':i===s.round?'current':'')+'"></span>').join('')+'</div>'+views[game]()+'<p class="ng-feedback" role="status">'+esc(s.message)+'</p>'+(ok?'<p class="ng-solution">'+summary(s.task)+'</p>'+button('next',s.round+1>=n?'Завершить':'Следующее задание',round()):button('help','Подсказка',round()+(s.help?' aria-pressed="true"':''),true)));
  }
  function stopVoice(reset){if(root.LIBRARY_VOICE)root.LIBRARY_VOICE.cancel(reset);root.AUDIO.stop();}
  function narrate(action,lead){
    const V=root.LIBRARY_VOICE,current=s;
    if(!V){if(lead)root.AUDIO.say(lead);return;}
    V.present({screen:'mathAdventures',game,level:s&&s.level,round:s?s.round:-1,phase:s?s.phase:'intro',paused,
      repeat:action==='help'||action==='resume',valid:()=>app.S.screen==='mathAdventures'&&s===current&&!paused},lead);
  }
  function render(selector,action,lead,scene=false){
    app.render();narrate(action,lead);
    if(scene){
      // A new scene begins with its instruction, even after a long scrolled screen.
      const title=document.getElementById('ma-title');
      if(title){title.setAttribute('tabindex','-1');title.focus({preventScroll:true});}
      root.scrollTo({top:0,left:0,behavior:'instant'});
    }else if(selector){const el=document.querySelector(selector);if(el)el.focus();}
  }
  function start(level){s=C.create(game,level);paused=false;logged=false;stopVoice();render(null,'start',null,true);}
  function open(id, origin){game=id;storyOrigin=origin||null;s=null;paused=false;logged=false;stopVoice(true);app.go('mathAdventures',{island:null});if(storyOrigin==='story-t04-4'){s=C.order([13,16]);render(null,'start',null,true);return;}narrate('intro');}
  root.__mathAdventures={open};
  ext.views.mathAdventures=view;
  const oldCards=ext.hooks.numberGameCards;
  const signs={'number-bus':'3 + 2','ten-bridge':'8 → 10','tens-workshop':'10 + 4','balance-sums':'3 + 2 = 5','repair-equation':'4 + 2 = ?','picnic-stories':'4 → 6','unit-builder':'0 — 5','number-domino':'5 | ●●●●●'};
  ext.hooks.numberGameCards=function(card,berry){return (oldCards?oldCards(card,berry):'')+Object.entries(C.GAMES).map(([id,d])=>card(id,d.name,d.skill,'<div class="ng-card-art ma-card-art"><span>'+signs[id]+'</span></div>')).join('');};
  const oldPick=ext.hooks.numberGamePick;
  ext.hooks.numberGamePick=function(id){if(Object.hasOwn(C.GAMES,id)){open(id);return true;}return oldPick?oldPick(id):false;};
  // Keep only three starting choices on screen; the full library remains one click away.
  // Move existing cards (never copy them), so their action handlers and identities are retained.
  const oldLibrary=ext.views.numberGames;
  const groups=[['Считаем и сравниваем',['feed','collect','match','compare','equalize']],['Число и его части',['house','triple','split-baskets','hidden-part','tens-workshop']],['Складываем и вычитаем',['number-bus','ten-bridge','balance-sums','repair-equation','picnic-stories']],['Порядок и измерение',['path','race','order-train','unit-builder','number-domino']]];
  let allOpen=false;
  ext.views.numberGames=function(){
    const html=oldLibrary.apply(this,arguments),tpl=document.createElement('template');tpl.innerHTML=html;
    const lib=tpl.content.querySelector('.ng-library');if(!lib)return html;
    const cards=new Map([...lib.querySelectorAll('[data-game]')].map(b=>[b.dataset.game,b]));
    lib.classList.add('ma-library');lib.textContent='';
    const starters=document.createElement('div');starters.className='ma-library-starters';
    for(const id of ['feed','collect','match']){const card=cards.get(id);if(card){starters.append(card);cards.delete(id);}}
    lib.append(starters);
    const details=document.createElement('details');details.className='ma-library-all';details.open=allOpen;
    const summary=document.createElement('summary');summary.textContent='Ещё '+cards.size+' игр · по навыкам';details.append(summary);
    for(const [name,ids] of groups){const section=document.createElement('section');section.className='ma-library-group';const title=document.createElement('h2');title.textContent=name;section.append(title);const grid=document.createElement('div');grid.className='ma-library-grid';for(const id of ids){const card=cards.get(id);if(card){grid.append(card);cards.delete(id);}}if(grid.childElementCount){section.append(grid);details.append(section);}}
    for(const card of cards.values())details.append(card);
    lib.append(details);return tpl.innerHTML;
  };
  document.getElementById('app').addEventListener('toggle',e=>{if(e.target.matches('.ma-library-all'))allOpen=e.target.open;},true);
  document.getElementById('app').addEventListener('click',e=>{
    const b=e.target.closest('[data-ma]');if(!b||app.S.screen!=='mathAdventures')return;
    const action=b.dataset.ma;
    if(action==='hub'||action==='exit'){stopVoice(true);s=null;game=null;paused=false;if(action==='hub')ext.acts.numberGames();else app.go('map',{island:null});return;}
    if(action==='level'){if(!s)start(b.dataset.level);return;}
    if(!s)return;
    if(action==='again'){if(s.phase==='finish')start(s.level);return;}
    if(action==='pause'){paused=true;stopVoice(true);root.SP360.speak(root.SP360.games.pause);render(null,null,null,true);return;}
    if(action==='resume'){paused=false;stopVoice();render(null,'resume',null,true);return;}
    if(paused)return;
    const previous=s;
    const value=action==='model'?b.dataset.value:Number(b.dataset.value);
    s=C.reduce(s,{type:action,round:Number(b.dataset.round),value,delta:Number(b.dataset.delta)});
    if(s===previous){if(action==='help')narrate(action);return;}
    stopVoice();
    let lead=null;if(s.phase==='success'&&previous.phase!=='success'){const p=root.PH.praise;lead=p[Math.floor(Math.random()*p.length)];}
    if(s.phase==='finish'&&!logged){logged=true;if(root.__insights){const rec=C.result(s);if(storyOrigin){rec.origin=storyOrigin;rec.deliveries=s.queue.map(t=>[10,t.total-10]);}root.__insights.logGame(rec);}root.SP360.speak(root.SP360.games.finish);}
    const selector=s.phase==='success'?'[data-ma="next"]':s.phase==='finish'?'[data-ma="hub"]':'[data-ma="'+action+'"]'+(b.hasAttribute('data-value')?'[data-value="'+b.dataset.value+'"]':'')+(b.hasAttribute('data-delta')?'[data-delta="'+b.dataset.delta+'"]':'');
    render(selector,action,lead,action==='next');
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&app.S.screen==='mathAdventures'&&s&&s.phase!=='finish'){paused=true;stopVoice(true);render();}});
})(window);

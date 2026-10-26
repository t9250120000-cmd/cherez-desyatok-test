/* Number playground: existing extension hooks, independent short sessions. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext,C=root.TEREM_NUMBER_GAMES;
  if(!app||!ext||!C)return;
  const base=new URL('../',document.currentScript.src),asset=p=>new URL(p,base).href;
  let selectedGame=null,state=null,paused=false;
  const names={left:'Слева',right:'Справа',equal:'Поровну'};
  const berry='<svg class="ng-berry" viewBox="0 0 48 48" aria-hidden="true"><path d="M11 15C6 24 16 40 24 43C32 40 42 24 37 15C32 9 16 9 11 15Z" fill="#C44258"/><path d="M24 16L11 10L21 9L24 3L27 9L37 10Z" fill="#376E4B"/><path d="M17 22L18 25M29 21L28 24M23 30L24 33" stroke="#FFF4D6" stroke-width="2.5" stroke-linecap="round"/></svg>';
  function hero(id){return id==='see'?'<img class="ng-hero" src="'+asset('art/companion/bulk-waiting.webp')+'" alt="" draggable="false">':root.CH.pal(id,'ng-hero','','neutral');}
  function button(action,text,secondary=false,attrs=''){return '<button type="button" class="ng-button'+(secondary?' ng-secondary':'')+'" data-ng="'+action+'" '+attrs+'>'+text+'</button>';}
  function ra(){return 'data-round="'+state.round+'"';}
  function dots(n,numbered=false){return '<div class="ng-dots" aria-label="'+n+' огоньков">'+Array.from({length:n},(_,i)=>'<span class="ng-dot">'+(numbered?'<b>'+(i+1)+'</b>':'')+'</span>').join('')+'</div>';}
  function card(id,title,skill,body){return '<button type="button" class="ng-card" data-ng="pick" data-game="'+id+'">'+body+'<strong>'+title+'</strong><span>'+skill+'</span></button>';}
  function hub(){return '<header class="ng-hub-heading">'+hero('see')+'<div><p class="ng-kicker">В своём темпе</p><h1 id="ng-title">Игры с числами</h1><p>Выбери, во что поиграем.</p></div></header><div class="ng-library">'+
    card('feed','Угости друзей','Каждому — по одной','<div class="ng-card-art ng-card-feed">'+hero('to10')+'<span>'+berry+'</span></div>')+
    card('collect',C.catalog.collect.name,C.catalog.collect.skill,'<div class="ng-card-art"><span class="ng-card-number">3</span><span class="ng-card-berries">'+berry+berry+berry+'</span></div>')+
    card('compare',C.catalog.compare.name,C.catalog.compare.skill,'<div class="ng-card-art ng-card-pair"><span>'+berry+'</span><span>'+berry+berry+'</span></div>')+
    card('match',C.catalog.match.name,C.catalog.match.skill,'<div class="ng-card-art">'+dots(4)+'<span class="ng-card-number">4</span></div>')+
    card('house',C.catalog.house.name,C.catalog.house.skill,'<div class="ng-card-art"><div class="ng-mini-house"><span>10</span><div>'+Array.from({length:10},(_,i)=>'<i class="'+(i<8?'occupied':'')+'"></i>').join('')+'</div></div></div>')+
    card('path',C.catalog.path.name,C.catalog.path.skill,'<div class="ng-card-art ng-card-path"><span>2</span><span>?</span><span>4</span></div>')+
    (ext.hooks.numberGameCards?ext.hooks.numberGameCards(card,berry):'')+
    '</div><p class="ng-footnote">Короткие серии без таймера. Можно сделать перерыв.<br>Тренировки не меняют звёзды и монетки основной игры.</p>';}
  function intro(){const def=C.catalog[selectedGame];return '<div class="ng-intro">'+hero(def.hero)+'<p class="ng-kicker">'+def.skill+'</p><h1 id="ng-title">'+def.name+'</h1><p>'+def.intro+'</p><div class="ng-start">'+button('first',selectedGame==='house'?'Начать · добавить 1–4':selectedGame==='path'?'Начать · дорожка 0–5':'Начать · числа до 5')+button('nextLevel',selectedGame==='house'?'Добавить 3–7':selectedGame==='path'?'Дорожка 5–10':'Числа до 10',true)+'</div><p class="ng-footnote">Три задания. Предметы не исчезают.<br>Подсказка всегда рядом.</p></div>';}
  function collect(){return '<div class="ng-order">Заказ <strong>'+state.task.answer+'</strong>'+button('targetVoice','Послушать число',true)+'</div><div class="ng-picking" aria-label="Ягоды: нажми, чтобы выбрать или убрать">'+Array.from({length:10},(_,i)=>'<button type="button" class="ng-fruit '+(state.selected.includes(i)?'chosen':'')+'" data-ng="toggle" data-index="'+i+'" '+ra()+' aria-pressed="'+state.selected.includes(i)+'" aria-label="Ягода '+(i+1)+'" '+(state.phase==='success'?'disabled':'')+'>'+berry+(state.selected.includes(i)?'<span class="ng-picked" aria-hidden="true">✓</span>':'')+'</button>').join('')+'</div><p class="ng-tally">В корзинке: <strong>'+state.selected.length+'</strong></p>'+(state.help?'<div class="ng-reference"><span>Столько нужно:</span>'+dots(state.task.answer,true)+'</div>':'');}
  function compare(){const n=Math.max(state.task.left,state.task.right);return '<div class="ng-baskets '+(state.help?'ng-paired':'')+'">'+['left','right'].map(side=>'<div class="ng-basket"><h2>'+names[side]+'</h2><div class="ng-compare-row">'+Array.from({length:n},(_,i)=>'<span class="ng-compare-slot">'+(i<state.task[side]?berry:'')+'</span>').join('')+'</div>'+(state.help?'<p>Ягод: '+state.task[side]+'</p>':'')+'</div>').join('')+'</div>'+(state.help?'<p class="ng-small">В каждой строке — пара. Посмотри, остались ли ягоды без пары.</p>':'');}
  function house(){return '<div class="ng-house"><div class="ng-roof">Домик на <strong>10</strong> жителей</div><div class="ng-rooms">'+Array.from({length:10},(_,i)=>{const given=i<state.task.given,added=state.selected.includes(i);return '<button type="button" class="ng-room '+(given?'given':added?'added':state.help?'ng-hint':'')+'" data-ng="place" data-index="'+i+'" '+ra()+' aria-label="Комната '+(i+1)+': '+(given?'житель уже здесь':added?'житель добавлен':'поселить жителя')+'" '+(given||added||state.phase==='success'?'disabled':'')+'>'+(given||added?'<img src="'+asset(given?'art/counter-red.webp':'art/counter-blue.webp')+'" alt="" draggable="false">':'<span aria-hidden="true">○</span>')+'</button>';}).join('')+'</div></div><p class="ng-tally">Было '+state.task.given+'. Добавили <strong>'+state.selected.length+'</strong>.</p>';}
  function path(){return '<div class="ng-path" aria-label="Дорожка чисел от '+state.task.start+' до '+state.task.end+'">'+Array.from({length:6},(_,i)=>{const n=i+state.task.start,missing=n===state.task.answer;return '<div class="ng-stone '+(missing?'missing':'')+'">'+(missing&&state.phase!=='success'?'?':n)+'</div>';}).join('')+'</div><p class="ng-small">От меньшего к большему →</p>'+(state.help?'<div class="ng-path-help">'+(state.task.answer-1)+' <span>+ 1 →</span> '+state.task.answer+'</div>':'');}
  function choices(){return '<div class="ng-choices">'+state.task.choices.map(value=>button('answer',names[value]||String(value),false,'data-value="'+value+'" '+ra())).join('')+'</div>';}
  function play(){
    const success=state.phase==='success',g=state.game,filled=g==='house'&&state.selected.length===state.task.answer;
    const title=success?'Получилось!':g==='collect'?'Собери ягоды по заказу':g==='compare'?'Где ягод больше?':g==='match'?'Сколько огоньков?':g==='house'?(filled?'Сколько жителей ты добавил?':'Заполни пустые комнаты'):'Какое число потерялось?';
    const desc=g==='collect'?'Нажми на ягоду, чтобы взять или вернуть.':g==='compare'?'Выбери корзинку или «Поровну».':g==='match'?'Огоньки остаются. Выбери их число.':g==='house'?(filled?'Новые жители — синие.':'Нажми на пустую комнату.'):'Выбери число для пустого места.';
    const art=g==='collect'?collect():g==='compare'?compare():g==='match'?'<div class="ng-lanterns">'+dots(state.task.answer,state.help)+'</div>':g==='house'?house():path();
    let controls;
    if(success){const answer=typeof state.task.answer==='number'?state.task.answer:names[state.task.answer];controls='<p class="ng-solution">'+(g==='house'?state.task.given+' + '+answer+' = 10':g==='compare'?(answer==='Поровну'?'Ягод поровну':answer+' ягод больше'):answer)+'</p>'+button('next',state.round===2?'Завершить':'Следующее задание',false,ra());}
    else controls=(g==='collect'?button('check','Проверить корзинку',false,ra()):g==='house'&&!filled?'':choices())+button('help','Подсказка',true,ra());
    return '<div class="ng-progress" aria-label="Задание '+(state.round+1)+' из 3">'+[0,1,2].map(i=>'<span class="'+(i<state.round?'done':i===state.round?'current':'')+'"></span>').join('')+'</div><header class="ng-heading"><h1 id="ng-title">'+title+'</h1><p>'+desc+'</p></header><div class="ng-scene">'+art+'</div><p class="ng-feedback" role="status">'+state.message+'</p><div class="ng-controls">'+controls+'</div>';
  }
  function finish(){return '<div class="ng-intro">'+hero(C.catalog[state.game].hero)+'<p class="ng-kicker">Три задания позади</p><h1 id="ng-title">Можно отдохнуть!</h1><p>Или выбрать другую игру.</p><div class="ng-finish-count" aria-label="Три задания завершены">✓ ✓ ✓</div>'+button('hub','Выбрать другую игру')+button('again','Ещё три задания',true)+button('exit','На карту',true)+'</div>';}
  function view(){const body=paused?'<div class="ng-intro">'+hero('see')+'<h1 id="ng-title">Отдыхаем</h1><p>Продолжим, когда захочешь.<br>Задание тебя подождёт.</p>'+button('resume','Продолжить')+'</div>':!selectedGame?hub():!state?intro():state.phase==='finish'?finish():play();return '<section class="number-games" aria-labelledby="ng-title"><nav class="ng-nav" aria-label="Навигация">'+button(selectedGame?'hub':'exit',selectedGame?'← Все игры':'← На карту',true)+(state&&state.phase!=='finish'&&!paused?button('pause','Перерыв',true):'')+'</nav>'+body+'</section>';}
  function paint(focus){app.render();if(focus)document.querySelector(focus)?.focus({preventScroll:true});}
  function open(){selectedGame=null;state=null;paused=false;app.go('numberGames',{island:null});}
  ext.views.numberGames=view;ext.acts.numberGames=open;
  document.getElementById('app').addEventListener('click',e=>{
    const b=e.target.closest('[data-ng]');if(!b||app.S.screen!=='numberGames')return;
    const action=b.dataset.ng;
    if(action==='exit'){root.AUDIO.stop();state=null;app.go('map',{island:null});return;}
    if(action==='hub'){root.AUDIO.stop();open();return;}
    if(action==='pick'){
      if(selectedGame)return;
      if(b.dataset.game==='feed'){ext.acts.foundations();return;}
      if(ext.hooks.numberGamePick&&ext.hooks.numberGamePick(b.dataset.game))return;
      if(!Object.hasOwn(C.catalog,b.dataset.game))return;
      selectedGame=b.dataset.game;paint();return;
    }
    if(action==='first'||action==='nextLevel'||action==='again'){
      if(!selectedGame||state&&state.phase!=='finish')return;
      state=C.create(selectedGame,action==='again'?state.level:action==='first'?'first':'next');paused=false;paint();return;
    }
    if(!state)return;
    if(action==='pause'){paused=true;root.AUDIO.stop();paint('[data-ng="resume"]');return;}
    if(action==='resume'){paused=false;paint();return;}
    if(paused)return;
    if(action==='targetVoice'){root.AUDIO.say(root.FP.answer(state.task.answer),{force:true});return;}
    const prev=state;
    state=C.reduce(state,{type:action,round:Number(b.dataset.round),index:Number(b.dataset.index),value:state.game==='compare'?b.dataset.value:Number(b.dataset.value)});
    if(state===prev)return;
    root.AUDIO.stop();
    const focus=state.phase==='success'?'[data-ng="next"]':action==='toggle'?'[data-ng="toggle"][data-index="'+b.dataset.index+'"]':action==='place'?(state.selected.length===state.task.answer?'[data-ng="answer"]':'[data-ng="place"]:not(:disabled)'):action==='help'?'[data-ng="help"]':action==='answer'?'[data-ng="answer"]':null;
    paint(focus);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&app.S.screen==='numberGames'&&state&&state.phase!=='finish'){paused=true;root.AUDIO.stop();paint();}});
  if(app.S.screen==='map')app.render();
})(window);

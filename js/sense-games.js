/* Экран двух игр на чувство числа. Подключается к библиотеке «Игры с числами» через хуки.
   Без таймеров, звёзд и монеток; результат пишется только в наблюдения для родителя. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext,C=root.TEREM_SENSE;
  if(!app||!ext||!C)return;
  const base=new URL('../',document.currentScript.src),asset=p=>new URL(p,base).href;
  let game=null,s=null,paused=false,logged=false;
  const rng=()=>Math.random();
  const focus=()=>!!(root.__focus&&root.__focus.active());
  const INFO={
    race:{name:'Слаймовая дорожка',skill:'Числа по порядку 0–20',intro:'Бросай кубик и угадай, на какую клетку прыгнет твой слаймик. Кто первым доберётся до конца — Бульк или ты?',levels:[['ten','Дорожка до 10 · кубик 1–3'],['twenty','Дорожка до 20 · кубик 1–6']]},
    triple:{name:'Собери тройку',skill:'Цифра, слово, количество',intro:'Одно число можно написать цифрой, сказать словом и показать слаймиками. Найди всю тройку.',levels:[['small','Числа 1–10'],['teen','Числа 11–20']]}
  };
  function btn(action,text,secondary,attrs){return '<button type="button" class="ng-button'+(secondary?' ng-secondary':'')+'" data-sg="'+action+'" '+(attrs||'')+'>'+text+'</button>';}
  function hero(){return '<img class="ng-hero" src="'+asset('art/companion/bulk-waiting.webp')+'" alt="" draggable="false">';}
  function pips(n){const pos={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[n]||[];return '<div class="sg-die" role="img" aria-label="На кубике '+n+'">'+Array.from({length:9},(_,i)=>'<i class="'+(pos.includes(i)?'on':'')+'"></i>').join('')+'</div>';}
  function frame(k,cls){return '<span class="sg-frame '+(cls||'')+'" aria-hidden="true">'+Array.from({length:10},(_,i)=>'<i class="'+(i<k?'on':'')+'"></i>').join('')+'</span>';}
  function picture(n,cls){return '<span class="sg-pic '+(cls||'')+'">'+(n>10?frame(10)+frame(n-10,'rest'):frame(n))+'</span>';}
  function face(kind,n,cls){
    if(kind==='digit')return '<span class="sg-digit '+(cls||'')+'">'+n+'</span>';
    if(kind==='word')return '<span class="sg-word '+(cls||'')+'">'+C.WORDS[n]+'</span>';
    return picture(n,cls);
  }

  /* ---------- общий каркас ---------- */
  function shell(body){
    return '<section class="number-games sense-games" aria-labelledby="ng-title"><nav class="ng-nav" aria-label="Навигация">'+btn('hub','← Все игры',true)+(s&&s.phase!=='finish'&&!paused?btn('pause','Перерыв',true):'')+'</nav>'+body+'</section>';
  }
  function intro(){
    const d=INFO[game];
    return '<div class="ng-intro">'+hero()+'<p class="ng-kicker">'+d.skill+'</p><h1 id="ng-title">'+d.name+'</h1><p>'+d.intro+'</p><div class="ng-start">'+d.levels.map(([id,label],i)=>btn('level',label,i>0,'data-level="'+id+'"')).join('')+'</div><p class="ng-footnote">Без таймера. Подсказка всегда рядом.<br>Игра не меняет звёзды и монетки.</p></div>';
  }
  function view(){
    if(!game)return shell('');
    if(paused)return shell('<div class="ng-intro">'+hero()+'<h1 id="ng-title">Отдыхаем</h1><p>Встань, потянись.<br>Игра тебя подождёт.</p>'+btn('resume','Продолжить')+'</div>');
    if(!s)return shell(intro());
    return shell(game==='race'?raceView():tripleView());
  }

  /* ---------- Слаймовая дорожка ---------- */
  function cellHTML(n){
    const help=s.help&&s.phase==='move'&&n>s.you&&n<=s.target;
    const you=s.you===n,bulk=s.bulk===n;
    const can=s.phase==='move';
    const tok=(you?'<span class="sg-tok you" aria-hidden="true">'+root.CH.pal('avatar','','','happy',(app.P()||{}).color)+'</span>':'')+(bulk?'<img class="sg-tok bulk" src="'+asset('art/companion/bulk-waiting.webp')+'" alt="" draggable="false">':'');
    const lab='Клетка '+n+(you?', здесь ты':'')+(bulk?', здесь Бульк':'');
    return '<button type="button" class="sg-cell'+(n===10?' ten':'')+(n%5===0&&n?' five':'')+(help?' hop':'')+(you?' at':'')+'" data-sg="cell" data-value="'+n+'" aria-label="'+lab+'" '+(can?'':'disabled')+'><b>'+n+'</b>'+tok+'</button>';
  }
  function board(){
    const blocks=[];for(let b=0;b<s.end/10;b++){let h='<div class="sg-block" aria-label="Клетки '+(b*10+1)+'–'+(b*10+10)+'">';for(let n=b*10+1;n<=b*10+10;n++)h+=cellHTML(n);blocks.push(h+'</div>');}
    return '<div class="sg-board"><div class="sg-start">'+cellHTML(0).replace('<b>0</b>','<b>Старт</b>')+'</div>'+blocks.join('')+'</div>';
  }
  function raceView(){
    const P=app.P()||{name:'Ты'};
    let title,desc,controls='';
    if(s.phase==='roll'){title='Твой ход';desc='Ты на клетке '+s.you+'. Бросай кубик.';controls=btn('roll','Бросить кубик');}
    else if(s.phase==='move'){title='Куда прыгнет слаймик?';desc='Ты на '+s.you+'. На кубике '+s.die+'. Нажми на клетку.';controls=btn('help','Подсказка',true);}
    else if(s.phase==='bulk'){title='Получилось!';desc='Ты на клетке '+s.you+'. Теперь ходит Бульк.';controls=btn('bulk','Ход Булька');}
    else{const win=s.winner==='you';title=win?'Ты первый!':'Бульк первый!';desc=win?'Ты добрался до '+s.end+'.':'В этот раз Бульк быстрее. Сыграем ещё?';controls=btn('again','Ещё раз')+btn('hub','Другая игра',true)+btn('exit','На карту',true);}
    const bl=s.bulkLast&&s.phase==='roll'?'<p class="ng-small">Бульк: '+s.bulkLast.from+' → '+s.bulkLast.to+' (кубик '+s.bulkLast.die+')</p>':'';
    const hint=s.help&&s.phase==='move'?C.raceHint(s):null;
    return '<header class="ng-heading"><h1 id="ng-title">'+title+'</h1><p>'+desc+'</p></header>'+
      '<div class="sg-race-top"><span class="sg-score"><span class="sg-tok you" aria-hidden="true">'+root.CH.pal('avatar','','','happy',P.color)+'</span>'+esc(P.name)+': <b>'+s.you+'</b></span>'+(s.die&&s.phase==='move'?pips(s.die):'')+'<span class="sg-score"><img class="sg-tok bulk" src="'+asset('art/companion/bulk-waiting.webp')+'" alt="" draggable="false">Бульк: <b>'+s.bulk+'</b></span></div>'+
      board()+bl+(hint&&hint.cross?'<div class="ng-path-help">'+s.you+' <span>+'+hint.cross.toTen+' →</span> 10 <span>+'+hint.cross.rest+' →</span> '+s.target+'</div>':'')+
      '<p class="ng-feedback" role="status">'+s.message+'</p><div class="ng-controls">'+controls+'</div>';
  }

  /* ---------- Собери тройку ---------- */
  const KIND_LABEL={picture:'Слаймики',digit:'Цифра',word:'Слово'};
  function tripleView(){
    if(s.phase==='finish'){
      return '<div class="ng-intro">'+hero()+'<p class="ng-kicker">'+s.results.length+' '+(s.results.length===3?'тройки':'троек')+' собрано</p><h1 id="ng-title">Можно отдохнуть!</h1><div class="sg-done-list">'+s.results.map(r=>'<span>'+r.n+'</span>').join('')+'</div>'+btn('again','Ещё раз')+btn('hub','Другая игра',true)+btn('exit','На карту',true)+'</div>';
    }
    const t=s.task,ok=s.phase==='success',total=s.queue.length;
    const rows=Object.keys(t.rows).map(kind=>'<div class="sg-row '+kind+'"><h2>'+KIND_LABEL[kind]+'</h2><div class="sg-options">'+t.rows[kind].map(v=>{const on=s.picked[kind]===v;return '<button type="button" class="sg-opt'+(on?' chosen':'')+'" data-sg="pick" data-kind="'+kind+'" data-value="'+v+'" data-round="'+s.round+'" aria-pressed="'+on+'" '+(ok||on?'disabled':'')+' aria-label="'+KIND_LABEL[kind]+': '+(kind==='word'?C.WORDS[v]:v)+'">'+face(kind,v,'small')+'</button>';}).join('')+'</div></div>').join('');
    return '<div class="ng-progress" aria-label="Задание '+(s.round+1)+' из '+total+'">'+s.queue.map((_,i)=>'<span class="'+(i<s.round?'done':i===s.round?'current':'')+'"></span>').join('')+'</div>'+
      '<header class="ng-heading"><h1 id="ng-title">'+(ok?'Тройка собрана!':'Найди это число в других видах')+'</h1><p>'+(ok?'Одно число — три вида.':'Выбери по одной карточке в каждом ряду.')+'</p></header>'+
      '<div class="sg-given">'+face(t.given,t.n,'big'+(s.help&&t.given!=='picture'?'':''))+btn('listen','Послушать число',true)+'</div>'+
      (s.help&&t.given!=='picture'&&!ok?'<div class="sg-helpcard">'+picture(t.n)+'</div>':'')+
      (ok?'<p class="ng-solution">'+t.n+' = '+C.WORDS[t.n]+'</p>':rows)+
      '<p class="ng-feedback" role="status">'+s.message+'</p><div class="ng-controls">'+(ok?btn('next',s.round===total-1?'Завершить':'Следующее число',false,'data-round="'+s.round+'"'):btn('help','Подсказка',true,'data-round="'+s.round+'"'))+'</div>';
  }

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function paint(focusSel){app.render();if(focusSel){const el=document.querySelector(focusSel);if(el)el.focus({preventScroll:true});}}
  function log(){if(logged||!s||s.phase!=='finish')return;logged=true;const r=game==='race'?C.raceResult(s):C.tripleResult(s);if(root.__insights)root.__insights.logGame(r);}
  function start(level){s=game==='race'?C.raceCreate(level):C.tripleCreate(level,rng,focus()?3:5);logged=false;paused=false;paint(game==='race'?'[data-sg="roll"]':null);}
  function open(id){game=id;s=null;paused=false;app.go('senseGames',{island:null});}
  function praise(){const ph=root.PH&&root.PH.praise;if(ph&&ph.length)root.AUDIO.say(ph[Math.floor(Math.random()*ph.length)]);}

  ext.views.senseGames=view;
  ext.acts.senseGames=(a)=>open(a&&a.dataset&&a.dataset.game||'race');
  const priorCards=ext.hooks.numberGameCards;
  ext.hooks.numberGameCards=function(card,berry){
    let h='';try{h=priorCards?priorCards(card,berry):'';}catch(e){}
    return h+card('race',INFO.race.name,INFO.race.skill,'<div class="ng-card-art sg-card-race"><span>8</span><span class="ten">10</span><span>13</span></div>')+
      card('triple',INFO.triple.name,INFO.triple.skill,'<div class="ng-card-art sg-card-triple"><span>7</span><span class="w">семь</span>'+frame(7,'mini')+'</div>');
  };
  const priorPick=ext.hooks.numberGamePick;
  ext.hooks.numberGamePick=function(id){if(priorPick&&priorPick(id))return true;if(!INFO[id])return false;open(id);return true;};

  document.getElementById('app').addEventListener('click',e=>{
    const b=e.target.closest('[data-sg]');if(!b||app.S.screen!=='senseGames')return;
    const action=b.dataset.sg;
    if(action==='exit'){root.AUDIO.stop();s=null;game=null;app.go('map',{island:null});return;}
    if(action==='hub'){root.AUDIO.stop();s=null;game=null;if(ext.acts.numberGames)ext.acts.numberGames();else app.go('map',{island:null});return;}
    if(action==='level'){if(s)return;start(b.dataset.level);return;}
    if(action==='again'){if(!s||s.phase!=='finish')return;start(s.level);return;}
    if(!s)return;
    if(action==='pause'){paused=true;root.AUDIO.stop();paint('[data-sg="resume"]');return;}
    if(action==='resume'){paused=false;paint();return;}
    if(paused)return;
    const prev=s;
    if(game==='race'){
      s=C.raceReduce(s,{type:action,value:Number(b.dataset.value)},rng);
      if(s===prev)return;
      root.AUDIO.stop();
      if(action==='cell'&&s.you!==prev.you){root.AUDIO.say(root.FP.answer(s.you),{onend:()=>{if(s&&s.phase==='finish'&&s.winner==='you')praise();}});}
      if(action==='bulk'&&root.FP)root.AUDIO.say(root.FP.answer(s.bulk));
      log();
      paint(s.phase==='move'?(s.help?'.sg-cell.hop':'[data-sg="help"]'):s.phase==='bulk'?'[data-sg="bulk"]':s.phase==='roll'?'[data-sg="roll"]':'[data-sg="again"]');
      return;
    }
    if(action==='listen'){root.AUDIO.say(root.FP.answer(s.task.n),{force:true});return;}
    s=C.tripleReduce(s,{type:action,round:Number(b.dataset.round),kind:b.dataset.kind,value:Number(b.dataset.value)});
    if(s===prev)return;
    root.AUDIO.stop();
    if(s.phase==='success')praise();
    log();
    paint(s.phase==='success'?'[data-sg="next"]':s.phase==='finish'?'[data-sg="again"]':action==='help'?'[data-sg="listen"]':null);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&app.S.screen==='senseGames'&&s&&s.phase!=='finish'){paused=true;root.AUDIO.stop();paint();}});
})(window);

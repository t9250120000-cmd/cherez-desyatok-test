/* A separate practice screen registered through the existing extension API. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext,core=root.TEREM_FOUNDATIONS;
  if(!app||!ext||!core)return;
  let session=null,paused=false;
  const base=new URL('../',document.currentScript.src);
  const berry='<span class="picnic-berry" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M11 15C6 24 16 40 24 43C32 40 42 24 37 15C32 9 16 9 11 15Z" fill="#C44258"/><path d="M24 16L11 10L21 9L24 3L27 9L37 10Z" fill="#376E4B"/><path d="M17 22L18 25M29 21L28 24M23 30L24 33" stroke="#FFF4D6" stroke-width="2.5" stroke-linecap="round"/></svg></span>';
  function hero(id){return id==='see'?'<img class="picnic-hero" src="'+new URL('art/companion/bulk-waiting.webp',base).href+'" alt="" draggable="false">':root.CH.pal(id,'picnic-hero','','neutral');}
  const friends=['see','to10','split','add','mix'];
  function button(action,text,secondary=false,extra=''){
    return '<button type="button" class="picnic-button'+(secondary?' picnic-secondary':'')+'" data-picnic="'+action+'" '+extra+'>'+text+'</button>';
  }
  function shell(content){return '<section class="picnic" aria-labelledby="picnic-title"><nav class="picnic-nav" aria-label="Навигация игры">'+button('exit','← На карту',true)+'<span>Угости друзей</span>'+((session&&session.phase!=='finish')?button(paused?'resume':'pause',paused?'Продолжить':'Перерыв',true):'')+'</nav>'+content+'</section>';}
  function view(){
    if(!session)return shell('<div class="picnic-intro">'+hero('see')+'<p class="picnic-kicker">Первые шаги с числами</p><h1 id="picnic-title">Угости друзей</h1><p>Каждому другу — одна ягода.<br>Потом узнаем, сколько их всего.</p><div class="picnic-demo" aria-label="Один друг — одна ягода">'+hero('to10')+'<span aria-hidden="true">→</span><span class="picnic-plate">'+berry+'</span></div><div class="picnic-start">'+button('small','Начать · от 1 до 3')+button('large','Уже считаю до 5',true)+'</div><p class="picnic-note">Три коротких задания. Без спешки.<br>Эта тренировка не меняет звёзды и монетки.</p></div>');
    if(paused)return shell('<div class="picnic-intro">'+hero('see')+'<h1 id="picnic-title">Можно отдохнуть</h1><p>Встань, потянись или просто посиди.<br>Продолжим, когда захочешь.</p>'+button('resume','Вернуться к друзьям')+'</div>');
    if(session.phase==='finish')return shell('<div class="picnic-intro">'+hero('see')+'<p class="picnic-kicker">Три задания позади</p><h1 id="picnic-title">Все друзья с угощением!</h1><div class="picnic-totals" aria-label="Мы посчитали">'+session.results.map(r=>'<span>'+r.quantity+'</span>').join('')+'</div><p>Каждому — по одной.<br>Ты раздал ягоды и посчитал их.</p>'+button('exit','Закончить и вернуться на карту')+button('home','Выбрать тренировку',true)+'</div>');
    const feeding=session.phase==='feed',success=session.phase==='success';
    const title=feeding?'Угости каждого друга':success?'Всем хватило!':'Сколько ягод всего?';
    const subtitle=feeding?'Нажми на пустую тарелку.':success?'Каждому другу — одна ягода.':'Выбери число. Ягоды остаются перед тобой.';
    const plates=session.fed.map((fed,i)=>'<div class="picnic-place">'+hero(friends[i])+'<button type="button" class="picnic-plate'+(session.help&&!fed?' picnic-hint':'')+'" data-picnic="feed" data-index="'+i+'" data-round="'+session.round+'" '+(!feeding?'disabled ':'')+'aria-label="'+root.CH.HEROES[friends[i]].name+': '+(fed?'ягода уже есть':'дать одну ягоду')+'">'+(fed?berry:'<span class="picnic-empty" aria-hidden="true">+</span>')+'</button><span class="picnic-count" aria-hidden="true">'+((session.help&&!feeding||success)?i+1:'')+'</span></div>').join('');
    const progress='<div class="picnic-progress" aria-label="Задание '+(session.round+1)+' из 3">'+[0,1,2].map(i=>'<span class="'+(i<session.round?'is-done':i===session.round?'is-current':'')+'" aria-hidden="true"></span>').join('')+'</div>';
    const actions=success?'<div class="picnic-answer">'+core.target(session)+'</div>'+button('number','Послушать число',true)+button('next',session.round===2?'Завершить':'Следующие друзья',false,'data-round="'+session.round+'"'):!feeding?'<div class="picnic-choices" aria-label="Выбери количество ягод">'+Array.from({length:session.level==='small'?3:5},(_,i)=>button('answer',String(i+1),false,'data-value="'+(i+1)+'" data-round="'+session.round+'"')).join('')+'</div>'+button('help','Посчитаем вместе',true,'data-round="'+session.round+'"'):button('help','Подсказка',true,'data-round="'+session.round+'"');
    return shell(progress+'<header class="picnic-heading"><h1 id="picnic-title">'+title+'</h1><p>'+subtitle+'</p></header><div class="picnic-table" data-count="'+session.fed.length+'">'+plates+'</div><p class="picnic-feedback" role="status">'+session.message+'</p><div class="picnic-actions">'+actions+'</div>');
  }
  function paint(focus){
    app.render();
    const el=focus&&document.querySelector(focus);if(el)el.focus({preventScroll:true});
  }
  function open(){session=null;paused=false;app.go('foundations',{island:null});}
  ext.views.foundations=view;
  ext.acts.foundations=open;
  const prior=ext.hooks.islandExtra;
  ext.hooks.islandExtra=function(id){return (prior?prior.apply(this,arguments):'')+(id==='see'?'<button type="button" class="btn ghost" data-act="numberGames">Игры с числами · 8 игр</button>':'');};
  document.getElementById('app').addEventListener('click',e=>{
    const b=e.target.closest('[data-picnic]');if(!b||app.S.screen!=='foundations')return;
    const action=b.dataset.picnic;
    if(action==='exit'){session=null;paused=false;app.go('map',{island:null});return;}
    if(action==='home'){session=null;paused=false;if(ext.acts.numberGames)ext.acts.numberGames();else paint();return;}
    if(action==='small'||action==='large'){if(session)return;session=core.create(action);paint();return;}
    if(!session)return;
    if(action==='pause'){paused=true;root.AUDIO.stop();paint('[data-picnic="resume"]');return;}
    if(action==='resume'){paused=false;paint();return;}
    if(paused)return;
    if(action==='number'){if(session.phase==='success')root.AUDIO.say(root.FP.answer(core.target(session)),{force:true});return;}
    const before=session;
    session=core.reduce(session,{type:action,round:Number(b.dataset.round),index:Number(b.dataset.index),value:Number(b.dataset.value)});
    if(before===session)return;
    root.AUDIO.stop();
    // Keep keyboard focus meaningful when the app replaces its DOM.
    const focus=session.phase==='success'?'[data-picnic="next"]':session.phase==='count'?'[data-picnic="answer"]':session.phase==='feed'?'[data-picnic="feed"][data-index="'+Math.max(0,session.fed.indexOf(false))+'"]':null;
    paint(focus);
  });
  // Backgrounding must not finish a round, start speech or lose the session.
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&app.S.screen==='foundations'&&session&&session.phase!=='finish'){paused=true;root.AUDIO.stop();paint();}
  });
  if(app.S.screen==='map')app.render();
})(window);

/* Голос Дениса для «Игр с числами» и «Угости друзей» (модули Codex) без изменения их кода.
   После каждой отрисовки читаем то, что видит ребёнок: сообщение, заголовок с подсказкой или вступление,
   и произносим ровно этот текст, если он записан (js/sense-phrases.js → games). Успех — похвала Дениса. */
(function(root){
  'use strict';
  const app=root.__app,SP=root.SP360;
  if(!app||!SP)return;
  const table=new Map(Object.values(SP.games).map(ph=>[SP.norm(ph.text),ph]));
  const SUCCESS=new Set(['Получилось!']);
  let last='',lastScreen='';
  const txt=el=>el?SP.norm(el.innerText||el.textContent):'';
  const join=(a,b)=>!a?b:!b?a:/[!?.]$/.test(a)?a+' '+b:a+'. '+b;
  function scan(){
    const screen=app.S.screen;
    if(screen!=='numberGames'&&screen!=='foundations'){lastScreen=screen;last='';return;}
    const box=document.querySelector(screen==='numberGames'?'.number-games':'.picnic');if(!box)return;
    const h=box.querySelector(screen==='numberGames'?'#ng-title':'#picnic-title');
    const title=txt(h);
    const sub=h?txt([...h.parentElement.querySelectorAll(':scope > p')].find(p=>!/kicker/.test(p.className)&&p.compareDocumentPosition(h)&Node.DOCUMENT_POSITION_PRECEDING)):'';
    const fb=txt(box.querySelector(screen==='numberGames'?'.ng-feedback':'.picnic-feedback'));
    const sig=screen+'|'+title+'|'+sub+'|'+fb;
    if(sig===last)return;last=sig;lastScreen=screen;
    for(const c of [fb,join(title,sub),sub]){const ph=c&&table.get(c);if(ph){SP.speak(ph);return;}}
    if(SUCCESS.has(title)){const p=root.PH&&root.PH.praise;if(p&&p.length)root.AUDIO.say(p[Math.floor(Math.random()*p.length)]);}
  }
  const host=document.getElementById('app');
  new MutationObserver(()=>{try{scan();}catch(e){}}).observe(host,{childList:true});
  root.__gamesVoice={scan,lines:table.size};
})(window);

/* Character performance layer. It observes the existing lesson and audio;
   it never chooses answers, advances lessons or writes saved progress. */
(function(root){
'use strict';
const base=new URL('../',document.currentScript.src);
const url=p=>new URL(p,base).href;
const shortNames={see:'Бульк',to10:'Тестик',split:'Желе',teen:'Король Пельмень',add:'Капелька',sub:'Хинкалик',mix:'Мармелад'};
const escape=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduce=root.matchMedia('(prefers-reduced-motion: reduce)');
const greeted=new Set();
let app,AU,CH,PH,voiceToken=0,speaking=false,voicePhrase=null,poll=null,pendingGreeting=null;
let lastTask=null,lastStep=-1,lastDone=false,lastHighFive=0;

function portrait(id,extra){
  id=shortNames[id]?id:'see';
  const moods=['waiting','talking','think','happy'];
  const html=moods.map(m=>{
    const art=id==='see'?'<img src="'+url(m==='waiting'?'art/companion/bulk-waiting.webp':m==='talking'?'art/companion/bulk-explaining.webp':'art/bulk-'+m+'.webp')+'" alt="" draggable="false">':CH.palSVG(id,m==='happy'?'happy':m==='think'?'think':'neutral');
    return '<span class="companion-pose" data-pose="'+m+'">'+art+'</span>';
  }).join('');
  return '<span class="companion-portrait '+(extra||'')+'" data-hero="'+id+'" data-mood="waiting" role="img" aria-label="'+escape(CH.HEROES[id].name)+'">'+html+'</span>';
}
function nameTag(id){return '<span class="companion-name">'+escape(shortNames[id]||shortNames.see)+'<span class="companion-status" aria-hidden="true"></span></span>';}
function element(html){const box=document.createElement('div');box.innerHTML=html;return box.firstElementChild;}
function idleMood(){const s=root.__app?.S,t=s?.t,f=s?.screen==='facts'&&root.__facts?.G;return s?.screen==='break'||s?.screen==='task'&&t?.done||f?.mode==='result'?'happy':s?.screen==='task'&&t?.wr||f?.reveal?'think':'waiting';}
function updatePortraits(){
  if(!app)return;
  const mood=speaking?'talking':idleMood();
  app.querySelectorAll('.companion-portrait').forEach(el=>{el.dataset.mood=mood;});
  app.querySelectorAll('.companion-dialog,.companion-intro-bubble').forEach(el=>{el.dataset.speaking=String(speaking);});
  app.querySelectorAll('.companion-status').forEach(el=>{const s=root.__app?.S;el.textContent=speaking?'говорит':s?.screen==='task'&&s.t?.explaining?'объясняет':s?.screen==='task'&&!s.t?.done?'твой ход':'';});
}
function reaction(name){
  if(reduce.matches)return;
  for(const el of app.querySelectorAll('.companion-portrait')){
    el.classList.remove('companion-nod','companion-joy');
    void el.offsetWidth;
    el.classList.add(name);
    el.addEventListener('animationend',()=>el.classList.remove(name),{once:true});
  }
}
function clearVoice(){
  voiceToken++;if(poll){clearInterval(poll);poll=null;}speaking=false;voicePhrase=null;updatePortraits();
}
function observeAudio(){
  const stop=AU.stop,say=AU.say;
  AU.stop=function(){clearVoice();return stop.apply(this,arguments);};
  AU.say=function(ph,opt){
    const options=opt||{},text=typeof ph==='string'?ph:ph?.say;
    let token,finished=false;
    const result=say.call(this,ph,Object.assign({},options,{onend:()=>{
      finished=true;
      if(token===voiceToken){if(poll){clearInterval(poll);poll=null;}speaking=false;voicePhrase=null;updatePortraits();}
      if(options.onend)options.onend();
    }}));
    token=voiceToken;
    if(!text||!AU.settings.voice&&!options.force||finished)return result;
    voicePhrase=ph;
    const started=Date.now();
    const check=()=>{
      if(token!==voiceToken)return;
      // Show speech only once an actual audio source or device utterance runs.
      const active=!!AU.cur||!!root.speechSynthesis?.speaking;
      if(active!==speaking){speaking=active;updatePortraits();if(active)reaction('companion-nod');}
      if(!active&&Date.now()-started>90000){clearVoice();}
    };
    poll=setInterval(check,80);check();return result;
  };
}
function decorateTask(s){
  const t=s.t,stage=app.querySelector('.stage');
  if(!t||!stage||s.diag)return;
  stage.classList.add('companion-lesson');
  stage.dataset.explaining=String(!!t.explaining);
  stage.querySelectorAll('.task-buddy').forEach(el=>el.remove());
  const instr=stage.querySelector('.instr'),visual=stage.querySelector('.visual');
  let dialog;
  if(t.explaining){
    dialog=stage.querySelector('.explain');
    if(dialog){
      dialog.querySelector('.pal')?.remove();
      dialog.classList.add('companion-dialog');
      const bubble=dialog.querySelector('.bubble');bubble.classList.add('companion-bubble');
      bubble.prepend(element(nameTag(t.skill)));
      if(instr?.querySelector('.say'))bubble.append(instr.querySelector('.say'));
      dialog.prepend(element(portrait(t.skill)));
      stage.insertBefore(dialog,visual);instr?.remove();
    }
  }else if(instr){
    dialog=instr;dialog.classList.add('companion-dialog');
    const bubble=element('<div class="companion-bubble">'+nameTag(t.skill)+'</div>');
    while(dialog.firstChild)bubble.append(dialog.firstChild);
    dialog.append(element(portrait(t.skill)),bubble);
  }else if(t.done){
    const line=stage.querySelector('.say-row'),message=line?.querySelector('.msg');
    if(message){
      dialog=element('<div class="companion-dialog companion-congratulation"><button type="button" class="companion-highfive" data-companion-action="highfive" aria-label="Дай пять!">'+portrait(t.skill)+'<span class="companion-five-label">Дай пять!</span></button><div class="companion-bubble">'+nameTag(t.skill)+'</div></div>');
      dialog.querySelector('.companion-bubble').append(message);line.remove();stage.insertBefore(dialog,visual);
    }
  }
  const earnedStep=lastTask===t&&(t.si>lastStep||t.done&&!lastDone);
  lastTask=t;lastStep=t.si;lastDone=!!t.done;
  if(earnedStep)reaction('companion-joy');
}
function decorateSheet(s){
  const id=s.island,sheet=app.querySelector('.sheet'),head=sheet?.querySelector('.herohead');
  if(!id||!head)return;
  sheet.classList.add('companion-welcome');
  head.querySelector('.pal')?.replaceWith(element(portrait(id,'companion-large')));
  const bubble=element('<div class="companion-intro-bubble">'+nameTag(id)+'<p>'+escape(PH.heroes[id].hello.text)+'</p></div>');
  head.after(bubble);
  if(pendingGreeting===id){
    pendingGreeting=null;
    const key=root.__app.P()?.id+':'+id;
    if(!greeted.has(key)){
      greeted.add(key);
      // This happens only after a real island tap, never on automatic rendering.
      if(AU.settings.voice)AU.say(PH.heroes[id].hello);
    }
  }
}
function decorateStory(s){
  const box=app.querySelector('.endbox');if(!box)return;
  const id=s.screen==='story'?'see':s.skill||root.__app.P()?.cur||'see';
  box.querySelector(':scope > .pal')?.replaceWith(element(portrait(id,'companion-large')));
  box.classList.add('companion-scene');
  if(s.screen==='story'){
    box.querySelector('.storytext')?.classList.add('companion-story-bubble');
    const repeat=element('<button type="button" class="companion-story-repeat" data-companion-action="story-repeat" aria-label="Послушать Булька ещё раз"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zM17 8a6 6 0 0 1 0 8"/></svg>Ещё раз</button>');
    box.querySelector('.dots')?.before(repeat);
  }
}
function decorateFacts(){
  const g=root.__facts?.G,stage=app.querySelector('.stage.facts');if(!g||!stage)return;
  stage.classList.add('companion-facts');stage.dataset.mode=g.mode;
  const id=['sprint','taped'].includes(g.mode)?'see':'add';
  const head=stage.querySelector('.facts-head'),box=stage.querySelector('.endbox');
  head?.querySelector(':scope > .pal')?.replaceWith(element(portrait('add')));
  if(box){
    box.querySelector(':scope > .pal')?.replaceWith(element(portrait(id,'companion-large')));
    box.classList.add('companion-scene');
  }
  const instr=stage.querySelector('.instr');
  if(instr){
    instr.classList.add('companion-dialog');
    const bubble=element('<div class="companion-bubble">'+nameTag(id)+'</div>');
    while(instr.firstChild)bubble.append(instr.firstChild);
    instr.append(element(portrait(id)),bubble);
    stage.querySelector('.visual > .pal')?.remove();
    stage.querySelector('.ask .say-row > .pal')?.remove();
  }
  // Quiet, matching tactile symbols instead of platform-specific emoji.
  const sprintIcon=stage.querySelector('[data-act="factsSprint"] .gi');
  if(sprintIcon)sprintIcon.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 33V8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M10 8h21l-5 7 5 7H10z" fill="var(--ca)"/><path d="M16 8h7v7h-7zm7 7h7v7h-7z" fill="var(--card)"/></svg>';
}
function decorate(){
  const s=root.__app?.S;if(!s)return;
  if(s.screen==='task')decorateTask(s);
  else if(s.screen==='map')decorateSheet(s);
  else if(s.screen==='story'||s.screen==='break')decorateStory(s);
  else if(s.screen==='facts')decorateFacts();
  updatePortraits();
}
function init(){
  if(root.COMPANION||!root.__app||!root.AUDIO)return;
  app=document.getElementById('app');AU=root.AUDIO;CH=root.CH;PH=root.PH;
  observeAudio();
  // app.js replaces only #app's direct children. Decorating descendants cannot
  // retrigger this observer, and typing keeps the original delegated handlers.
  new MutationObserver(decorate).observe(app,{childList:true});
  app.addEventListener('click',e=>{
    const island=e.target.closest('[data-isl]');if(island)pendingGreeting=island.dataset.isl;
    if(e.target.closest('[data-act="closeIsland"]')&&root.__app.S.screen==='map'){pendingGreeting=null;AU.stop();}
    if(e.target.closest('[data-companion-action="highfive"]')&&root.__app.S.t?.done&&Date.now()-lastHighFive>800){lastHighFive=Date.now();AU.sfx.tick();reaction('companion-joy');}
    const repeat=e.target.closest('[data-companion-action="story-repeat"]');
    if(repeat&&root.__app.S.screen==='story'){AU.say(PH.story[root.__app.S.storyI],{force:true});}
  },true);
  root.COMPANION={get speaking(){return speaking},get phrase(){return voicePhrase},decorate};
  decorate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);

/* Звук: записанные фразы (спрайты mp3), эффекты и фоновая музыка на Web Audio. Запасной вариант — синтезатор устройства. */
(function(root){
'use strict';
const A = {ctx:null, sprites:null, buffers:{}, loading:{}, cur:null, music:{on:false, timer:null, gain:null}, settings:{voice:true, sfx:true, music:true}, ready:false, base:''};
function ctx(){ if(!A.ctx){ try{ A.ctx = new (root.AudioContext||root.webkitAudioContext)(); }catch(e){} } if(A.ctx && A.ctx.state!=='running' && A.ctx.state!=='closed'){ try{ A.ctx.resume().catch(()=>{}); }catch(e){} } return A.ctx; }
function hash(s){ /* md5 первые 10 hex — считается в сборке; здесь ищем по готовому индексу say→id */ return A.sprites && A.sprites.index[s]; }
A.init = function(base){
  A.base = base||'';
  const main=fetch(A.base+'audio/sprites.json').then(r=>r.ok?r.json():null).catch(()=>null);
  const extra=['facts-sprites.json','lesson-sprites.json','denis-sprites.json'].map(f=>fetch(A.base+'audio/'+f).then(r=>r.ok?r.json():null).catch(()=>null));
  return Promise.all([main].concat(extra)).then(([j,...xs])=>{ if(j) xs.forEach(x=>{ if(x){ Object.assign(j.files,x.files); Object.assign(j.index,x.index); } }); A.sprites=j; A.ready=!!j; return !!j; });
};
function loadSprite(file){
  if(A.buffers[file]) return Promise.resolve(A.buffers[file]);
  if(A.loading[file]) return A.loading[file];
  const c = ctx(); if(!c) return Promise.reject();
  A.loading[file] = fetch(A.base+'audio/'+file).then(r=>r.arrayBuffer()).then(ab=>new Promise((res,rej)=>{ c.decodeAudioData(ab, b=>res(b), rej); })).then(b=>{ A.buffers[file]=b; delete A.loading[file]; return b; }).catch(e=>{ delete A.loading[file]; throw e; });
  return A.loading[file];
}
A.preload = function(){ if(!A.sprites) return; Object.keys(A.sprites.files).slice(0,2).forEach(f=>loadSprite(f).catch(()=>{})); };
A.unlock = function(){ const c=ctx(); if(c && A.sprites) A.preload(); };
let speakTok = 0;
A.stop = function(){
  speakTok++;
  if(A.duck) A.duck(false);
  if(A.cur){ try{ A.cur.stop(); }catch(e){} A.cur=null; }
  if(root.speechSynthesis) try{ speechSynthesis.cancel(); }catch(e){}
};
/* say(phrase, {force, onend}) — phrase = {text, say} или строка */
A.say = function(ph, opt){
  opt = opt||{};
  const text = typeof ph==='string' ? ph : (ph && ph.say);
  A.stop();
  if(!text || (!A.settings.voice && !opt.force)){ if(opt.onend) setTimeout(opt.onend, 0); return; }
  const tok = ++speakTok;
  A.duck(true);
  const done = () => { if(tok===speakTok){ A.duck(false); if(opt.onend) opt.onend(); } };
  const rec = A.sprites && A.sprites.index[text];
  if(rec && ctx()){
    const [file, start, dur] = rec;
    loadSprite(file).then(buf=>{
      if(tok!==speakTok) return;
      const c = ctx(); const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain(); g.gain.value = 1; src.connect(g); g.connect(c.destination);
      let fired=false; const fin=()=>{ if(fired) return; fired=true; if(A.cur===src) A.cur=null; done(); };
      src.onended = fin; setTimeout(fin, dur*1000+1500);
      A.cur = src; src.start(0, start, dur);
    }).catch(()=>fallback());
    return;
  }
  fallback();
  function fallback(){
    if(tok!==speakTok) return;
    if(!('speechSynthesis' in root) || typeof SpeechSynthesisUtterance==='undefined'){ setTimeout(done, 600+text.length*60); return; }
    try{
      const u = new SpeechSynthesisUtterance(text); u.lang='ru-RU'; u.rate=0.92; u.pitch=1.3;
      const v = (speechSynthesis.getVoices()||[]).find(x=>/^ru/i.test(x.lang)); if(v) u.voice=v;
      const guard = setTimeout(done, 1500+text.length*90);
      u.onend = () => { clearTimeout(guard); done(); }; u.onerror = () => { clearTimeout(guard); done(); };
      speechSynthesis.speak(u);
    }catch(e){ setTimeout(done, 600+text.length*60); }
  }
};
/* эффекты */
function tone(notes, gap, vol, type){
  if(!A.settings.sfx) return; const c=ctx(); if(!c) return;
  try{ notes.forEach((f,i)=>{ const o=c.createOscillator(), g=c.createGain(); o.type=type||'sine'; o.frequency.value=f;
    const t0=c.currentTime+i*(gap||0.09); g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol||0.15,t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.26);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0+0.3); }); }catch(e){}
}
A.sfx = {
  ok:()=>tone([659,880],0.09,0.07), no:()=>{}, tick:()=>tone([520],0,0.035), key:()=>tone([440],0,0.025),
  plop:()=>tone([330,494],0.05,0.05,'sine'), end:()=>tone([523,659,784],0.1,0.07), coin:()=>tone([1046,1318],0.07,0.045,'sine'),
  unlock:()=>tone([523,659,784,1046],0.08,0.07), chest:()=>tone([392,523,659,784],0.08,0.07)
};
/* фоновая музыка: мягкий пентатонический перебор */
const SCALE = [261.6,329.6,392.0,440.0,392.0,329.6,293.7,329.6];
let musicNote=0;
function musicStep(){
  const c=ctx(); if(!c || !A.music.on) return;
  const g = A.music.gain;
  const n = SCALE[musicNote++ % SCALE.length];
  const o=c.createOscillator(), e=c.createGain(); o.type='triangle'; o.frequency.value=n;
  const t0=c.currentTime; e.gain.setValueAtTime(0.0001,t0); e.gain.exponentialRampToValueAtTime(0.5,t0+0.04); e.gain.exponentialRampToValueAtTime(0.0001,t0+1.4);
  o.connect(e); e.connect(g); o.start(t0); o.stop(t0+1.5);
  A.music.timer = setTimeout(musicStep, 900);
}
A.musicOn = function(){
  if(!A.settings.music || A.music.on) return; const c=ctx(); if(!c) return;
  try{ if(!A.music.gain){ const g=c.createGain(); g.gain.value=0.05; const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1800; g.connect(lp); lp.connect(c.destination); A.music.gain=g; }
    A.music.gain.gain.setValueAtTime(0.035,c.currentTime); A.music.on=true; musicStep(); }catch(e){}
};
A.musicOff = function(){ A.music.on=false; if(A.music.timer){ clearTimeout(A.music.timer); A.music.timer=null; } if(A.music.gain) A.music.gain.gain.value=0; };
A.duck = function(on){ if(A.music.gain) A.music.gain.gain.value = A.music.on ? (on ? 0.009 : 0.035) : 0; };
/* iOS: после блокировки, звонка или ухода в фон контекст бывает «interrupted»/«suspended».
   Пробуждаем его при каждом касании и при возвращении на экран, а не только при первом касании. */
A.wake = function(){ if(A.ctx) ctx(); };
if(root.document && root.document.addEventListener){
  root.document.addEventListener('pointerdown', ()=>A.wake(), {passive:true});
  root.document.addEventListener('visibilitychange', ()=>{ if(!root.document.hidden) A.wake(); });
}
root.AUDIO = A;
})(typeof window!=='undefined' ? window : globalThis);

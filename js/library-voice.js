/* Optional recorded-only narration for the 12 number adventures. Empty manifest means silence.
   No system TTS, progress writes, timers, word stitching or changes to existing phrase catalogues. */
(function(root){
  'use strict';
  const catalog=root.LIBRARY_VOICE_CATALOG;if(!catalog)return;
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'').toLowerCase();
  const modeMatches=(item,c)=>item.modes.some(m=>c.level?m===c.game+'/'+c.level:m.split('/')[0]===c.game);
  function select(c){
    if(!c||!c.game||c.phase==='finish'||c.paused)return [];
    const text=c.phase==='intro'?[c.description]:c.phase==='success'?[c.title,c.description]:c.feedback?[c.feedback]:[c.title,c.description];
    const chunks=text.map(norm).filter(Boolean),covered=new Set(),out=[];
    const candidates=catalog.items.filter(i=>!i.needsScreenReview&&modeMatches(i,c)&&(c.phase==='success'?i.optional:!i.optional)&&i.parts.every(p=>chunks.includes(norm(p))));
    candidates.sort((a,b)=>b.parts.length-a.parts.length);
    for(const i of candidates){const keys=i.parts.map(norm);if(keys.some(k=>covered.has(k)))continue;out.push(i);keys.forEach(k=>covered.add(k));}
    // Prefer the story before its question; otherwise keep the visible heading/description order.
    out.sort((a,b)=>{const pos=i=>Math.min(...i.parts.map(p=>chunks.indexOf(norm(p))));return c.game==='picnic-stories'?pos(b)-pos(a):pos(a)-pos(b);});
    return out;
  }
  function validate(data){
    if(!data||data.schema!==1||data.catalogSHA256!==catalog.sha256||!['ready','awaiting_recordings'].includes(data.status))return null;
    const known=new Map(catalog.items.map(i=>[i.id,i])),files=data.files||{},index=data.index||{};
    if(data.status==='awaiting_recordings')return Object.keys(index).length===0?{files:{},index:{}}:null;
    for(const [file,duration] of Object.entries(files))if(!/^denis-library-\d{3}\.mp3$/.test(file)||!Number.isFinite(duration)||duration<=0)return null;
    for(const [id,seg] of Object.entries(index))if(!known.has(id)||!Array.isArray(seg)||seg.length!==3||!Object.hasOwn(files,seg[0])||!Number.isFinite(seg[1])||seg[1]<0||!Number.isFinite(seg[2])||seg[2]<=0||seg[1]+seg[2]>files[seg[0]]+.01)return null;
    return {files,index};
  }
  let epoch=0,last='',manifest=null;
  const A=root.AUDIO;
  const ready=typeof root.fetch==='function'?root.fetch((A&&A.base||'')+'audio/library-voice-index.json').then(r=>r.ok?r.json():null).then(x=>(manifest=validate(x))).catch(()=>null):Promise.resolve(null);
  function cancel(reset){epoch++;if(reset)last='';}
  function snapshot(c){
    const box=root.document&&root.document.querySelector(c.screen==='numberPlay'?'.number-play':'.math-adventures');if(!box)return {...c};
    const h=box.querySelector('h1'),parent=h&&h.parentElement;
    const desc=parent&&[...parent.querySelectorAll(':scope > p')].find(p=>!/kicker/.test(p.className)&&p.compareDocumentPosition(h)&root.Node.DOCUMENT_POSITION_PRECEDING);
    return {...c,title:h&&h.textContent||'',description:desc&&(desc.innerText||desc.textContent)||'',feedback:(box.querySelector('.ng-feedback')||{}).textContent||''};
  }
  function present(context,lead){
    const c=snapshot(context),items=select(c),sig=JSON.stringify([c.game,c.level,c.round,c.phase,c.title,c.description,c.feedback]);
    const my=++epoch;if(!context.repeat&&sig===last&&!lead)return;last=sig;
    const valid=()=>my===epoch&&A&&A.settings.voice&&(!context.valid||context.valid());
    function future(){const revision=A&&A.speechRevision?A.speechRevision():null;ready.then(()=>{
      if(revision!==null&&A.speechRevision()!==revision)return;
      if(!valid()||!manifest||!items.length||items.some(i=>!manifest.index[i.id]))return;
      let at=0;
      function next(){if(!valid()||at>=items.length)return;const item=items[at++];let missing=false;
        A.say({text:item.speech,say:item.speech},{recordedOnly:true,recording:manifest.index[item.id],onmissing:()=>{missing=true;},onend:()=>{if(!missing)next();}});
      }
      next();
    });}
    if(lead&&valid())A.say(lead,{recordedOnly:true,onend:()=>{if(valid())future();}});else future();
  }
  root.LIBRARY_VOICE={present,cancel,select,validate,ready,get status(){return manifest&&Object.keys(manifest.index).length?'recordings-indexed':'awaiting-recordings';}};
})(typeof window!=='undefined'?window:globalThis);

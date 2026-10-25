/* Уши Булька: микрофон → поиск фразы по громкости → локальное распознавание в отдельном потоке.
   Правила: микрофон открывается только после явного выбора ребёнка; слушаем только в свой ход;
   звук держится в памяти до конца одной фразы и обнуляется; в сеть и в хранилище ничего не уходит. */
(function(root){
'use strict';
const CACHE='voicemodel-ru-v1';            // не начинается с terem-: обновление игры его не стирает
const FILES=[
  ['vendor/ort/ort.wasm.min.js',50196],
  ['vendor/ort/ort-wasm-simd-threaded.mjs',24218],
  ['vendor/ort/ort-wasm-simd-threaded.wasm',13961845],
  ['voice-model/grammar.json',39804],
  ['voice-model/encoder.int8.onnx',25090964],
  ['voice-model/decoder.int8.onnx',1307950],
  ['voice-model/joiner.int8.onnx',259572],
  ['js/voice-asr-core.js',0],
  ['js/voice-asr-worker.js',0]
];
const TOTAL=FILES.reduce((a,f)=>a+f[1],0);
const base=()=>{ const s=document.querySelector('script[src*="voice-asr.js"]'); return s?s.src.replace(/js\/voice-asr\.js.*$/,''):''; };
const A={ worker:null, ready:false, readyP:null, loadReject:null, loadTimer:null, micSession:null, stream:null, ctx:null, node:null, src:null, turn:null, reqId:0, pending:new Map(), lastInfo:null };
// iOS ships these assets in App.app. Cache.put only accepts HTTP(S) requests;
// capacitor:// resources must be read directly, never re-downloaded into CacheStorage.
const bundled=()=>root.location&&root.location.protocol==='capacitor:'&&
  !!(root.Capacitor&&root.Capacitor.isNativePlatform&&root.Capacitor.isNativePlatform());

/* ---------- модель на устройстве ---------- */
async function status(){
  if(bundled()) return 'bundled'; // availability of packaged files, not microphone/model readiness
  try{ const c=await caches.open(CACHE); const keys=await c.keys(); const have=new Set(keys.map(k=>new URL(k.url).pathname.replace(/^.*?(vendor\/|voice-model\/|js\/)/,'$1')));
    return FILES.filter(f=>f[1]>0).every(f=>have.has(f[0]))?'cached':'absent'; }catch(e){ return 'nocache'; }
}
async function download(onProgress){
  if(bundled()){ if(onProgress) onProgress(1); return 'bundled'; }
  const c=await caches.open(CACHE), B=base(); let done=0;
  for(const [f,size] of FILES){
    const url=B+f, r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(f+' '+r.status);
    const reader=r.body&&r.body.getReader?r.body.getReader():null, chunks=[]; let got=0;
    if(reader){ for(;;){ const {done:d,value}=await reader.read(); if(d) break; chunks.push(value); got+=value.length; onProgress&&onProgress(Math.min(1,(done+got)/TOTAL)); } }
    else { const b=new Uint8Array(await r.arrayBuffer()); chunks.push(b); got=b.length; }
    await c.put(url,new Response(new Blob(chunks),{headers:{'Content-Type':r.headers.get('Content-Type')||'application/octet-stream'}}));
    done+=size||got; onProgress&&onProgress(Math.min(1,done/TOTAL));
  }
  return status();
}
async function remove(){ dispose(); try{ await caches.delete(CACHE); }catch(e){} }
function prepare(){
  if(A.readyP) return A.readyP;
  let res,rej; const promise=new Promise((a,b)=>{ res=a; rej=b; });
  A.readyP=promise; A.loadReject=rej;
  try{
    const w=new Worker(base()+'js/voice-asr-worker.js');
    A.worker=w;
    w.onmessage=e=>{ if(A.worker!==w) return; const m=e.data;
      if(m.type==='ready'){ clearTimeout(A.loadTimer); A.loadReject=null; A.ready=true; res(true); }
      else if(m.type==='error'){ resetWorker(new Error(m.error)); close(); }
      else if(m.type==='result'){ const p=A.pending.get(m.id); if(p){ A.pending.delete(m.id); p({intent:m.intent, info:m.info}); } }
    };
    w.onerror=e=>{ if(A.worker!==w) return; resetWorker(new Error(e.message||'worker')); close(); };
    A.loadTimer=setTimeout(()=>{ if(A.worker===w&&!A.ready){ resetWorker(new Error('model-timeout')); close(); } },60000);
    w.postMessage({type:'load'});
  }catch(e){ resetWorker(e); }
  return promise;
}
function resetWorker(error){
  const w=A.worker, reject=A.loadReject;
  A.worker=null; A.ready=false; A.readyP=null; A.loadReject=null; clearTimeout(A.loadTimer);
  if(w){ try{ w.terminate(); }catch(e){} }
  if(A.turn) A.turn.finish({intent:{kind:'unavailable'}});
  A.pending.clear(); if(reject) reject(error);
}
function dispose(){ close(); resetWorker(new Error('cancelled')); A.lastInfo=null; }

/* ---------- микрофон ---------- */
const WORKLET='class Tap extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor("terem-tap",Tap);';
function open(){
  if(A.micSession) return A.micSession.promise;
  const md=navigator.mediaDevices; if(!md||!md.getUserMedia) throw new Error('no-mic-api');
  const session={stream:null,ctx:null,node:null,src:null,mute:null,promise:null}; A.micSession=session;
  const active=()=>{ if(A.micSession!==session) throw new Error('cancelled'); };
  session.promise=(async()=>{
    try{
      session.stream=await md.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
      active();
      const AC=root.AudioContext||root.webkitAudioContext; session.ctx=new AC();
      if(session.ctx.state==='suspended') await session.ctx.resume();
      active(); session.src=session.ctx.createMediaStreamSource(session.stream);
      const onChunk=x=>{ if(A.micSession===session&&A.turn) A.turn.push(x); };
      let url;
      try{
        url=URL.createObjectURL(new Blob([WORKLET],{type:'application/javascript'}));
        await session.ctx.audioWorklet.addModule(url); active();
        session.node=new AudioWorkletNode(session.ctx,'terem-tap'); session.node.port.onmessage=e=>onChunk(e.data);
      }catch(e){
        active(); session.node=session.ctx.createScriptProcessor(2048,1,1);
        session.node.onaudioprocess=e=>onChunk(e.inputBuffer.getChannelData(0).slice(0));
      }finally{ if(url) URL.revokeObjectURL(url); }
      active(); session.mute=session.ctx.createGain(); session.mute.gain.value=0;
      session.src.connect(session.node); session.node.connect(session.mute); session.mute.connect(session.ctx.destination);
      A.stream=session.stream; A.ctx=session.ctx; A.node=session.node; A.src=session.src;
      return true;
    }catch(e){
      releaseMic(session);
      if(A.micSession===session){ A.micSession=null; A.stream=A.ctx=A.node=A.src=null; }
      throw e;
    }
  })();
  return session.promise;
}
function releaseMic(s){
  if(!s) return;
  if(s.stream){ s.stream.getTracks().forEach(t=>{ try{ t.stop(); }catch(e){} }); s.stream=null; }
  for(const n of [s.src,s.node,s.mute]){ if(n){ try{ n.disconnect(); }catch(e){} if(n.port) n.port.onmessage=null; n.onaudioprocess=null; } }
  s.src=s.node=s.mute=null;
  if(s.ctx){ try{ const p=s.ctx.close(); if(p&&p.catch) p.catch(()=>{}); }catch(e){} s.ctx=null; }
}
function close(){
  cancel();
  const s=A.micSession; A.micSession=null; releaseMic(s);
  A.stream=A.ctx=A.node=A.src=null;
}
const micOpen=()=>!!(A.stream&&A.stream.getAudioTracks().some(t=>t.readyState==='live'));

function to16k(x,sr){
  if(sr===16000) return Promise.resolve(x);
  const OAC=root.OfflineAudioContext||root.webkitOfflineAudioContext; if(!OAC) return Promise.reject(new Error('no-oac'));
  const n=Math.ceil(x.length*16000/sr), oc=new OAC(1,n,16000), b=oc.createBuffer(1,x.length,sr); b.getChannelData(0).set(x);
  const s=oc.createBufferSource(); s.buffer=b; s.connect(oc.destination); s.start();
  return oc.startRendering().then(r=>{ const y=Float32Array.from(r.getChannelData(0)); b.getChannelData(0).fill(0); return y; });
}
/* ---------- один ход: ждём фразу, вырезаем её по громкости, распознаём ---------- */
function cancel(){ const t=A.turn; A.turn=null; if(t) t.finish({intent:{kind:'cancelled'}}); A.lastInfo=null; }
function listen(state, opt){
  opt=opt||{};
  cancel();
  if(!A.ready||!micOpen()) return Promise.resolve({intent:{kind:'unavailable'}});
  const sr=A.ctx.sampleRate, frame=Math.round(sr*0.02);
  return new Promise(resolve=>{
    const T={buf:[], acc:new Float32Array(0), frames:0, noise:[], floor:0.004, speech:false, voiced:0, quiet:0, pre:[], started:0};
    let finished=false, processing=false, pendingId=null;
    const wipe=()=>{ T.buf.forEach(b=>b.fill(0)); T.pre.forEach(b=>b.fill(0)); T.buf=[]; T.pre=[]; T.acc.fill(0); T.acc=new Float32Array(0); };
    T.finish=r=>{ if(finished) return; finished=true; clearTimeout(T.to); if(pendingId!==null) A.pending.delete(pendingId); if(A.turn===T) A.turn=null; wipe(); resolve(r); };
    T.to=setTimeout(()=>T.finish({intent:{kind:'silence'}}), opt.timeout||10000);
    T.push=x=>{
      if(finished||processing) return;
      const a=new Float32Array(T.acc.length+x.length); a.set(T.acc); a.set(x,T.acc.length); T.acc=a;
      while(T.acc.length>=frame){
        const f=T.acc.slice(0,frame); T.acc=T.acc.slice(frame); T.frames++;
        let e=0; for(let i=0;i<f.length;i++) e+=f[i]*f[i]; const rms=Math.sqrt(e/f.length);
        if(T.frames<=12 && !T.speech){ T.noise.push(rms); T.floor=Math.max(0.003, T.noise.reduce((p,q)=>p+q,0)/T.noise.length); }
        const thr=Math.max(0.012, T.floor*3.2);
        if(!T.speech){
          T.pre.push(f); if(T.pre.length>15) T.pre.shift().fill(0);
          if(T.frames>6 && rms>thr){ T.voiced++; if(T.voiced>=3){ T.speech=true; T.started=T.frames; T.buf=T.pre; T.pre=[]; opt.onSpeech&&opt.onSpeech(); } }
          else T.voiced=0;
        }else{
          T.buf.push(f);
          T.quiet = rms>thr*0.7 ? 0 : T.quiet+1;
          const len=T.frames-T.started;
          if((T.quiet>=33 && len>=15) || len>=200){ finishSpeech(); return; }   // 0,66 с тишины или 4 с речи
        }
      }
    };
    async function finishSpeech(){
      const n=T.buf.reduce((p,b)=>p+b.length,0), x=new Float32Array(n); let o=0; T.buf.forEach(b=>{ x.set(b,o); o+=b.length; });
      processing=true; clearTimeout(T.to); wipe();
      T.to=setTimeout(()=>T.finish({intent:{kind:'unavailable'},info:{reason:'inference-timeout'}}),15000);
      opt.onThinking&&opt.onThinking();
      let y=x, ysr=sr;
      try{ y=await to16k(x,sr); ysr=16000; if(y!==x) x.fill(0); }catch(e){ y=x; ysr=sr; }
      if(finished||!A.ready||!A.worker){ y.fill(0); T.finish({intent:{kind:'unavailable'}}); return; }
      pendingId=++A.reqId;
      A.pending.set(pendingId,r=>{ if(finished) return; A.lastInfo=r.info||null; T.finish(r); });
      try{ A.worker.postMessage({type:'recognize', id:pendingId, samples:y, sr:ysr, state, reject:opt.reject},[y.buffer]); }
      catch(e){ y.fill(0); T.finish({intent:{kind:'unavailable'},info:{reason:'worker-send'}}); }
    }
    A.turn=T;
  });
}
root.TEREM_ASR={status, download, remove, prepare, open, close, listen, cancel, dispose, get ready(){ return A.ready; }, get micOpen(){ return micOpen(); }, get lastInfo(){ return A.lastInfo; }, TOTAL, CACHE};
})(window);

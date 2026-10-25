/* Поток распознавания. Модель и движок загружаются только с того же адреса, что и игра
   (папки vendor/ort и voice-model), никаких внешних запросов. Аудио приходит одним
   массивом, разбирается и сразу обнуляется; ничего не сохраняется и не отправляется. */
'use strict';
let R=null, loading=null;
function base(){ return self.location.href.replace(/js\/voice-asr-worker\.js.*$/,''); }
async function fetchCached(url){
  // модель кладётся в собственный кэш при загрузке взрослым; если его нет — обычный запрос к своему серверу
  try{ if(self.caches){ const hit=await caches.match(url); if(hit) return new Uint8Array(await hit.arrayBuffer()); } }catch(e){}
  const r=await fetch(url); if(!r.ok) throw new Error('model '+r.status); return new Uint8Array(await r.arrayBuffer());
}
async function load(){
  const B=base();
  importScripts(B+'vendor/ort/ort.wasm.min.js', B+'js/voice-asr-core.js');
  const ort=self.ort; ort.env.wasm.numThreads=1; ort.env.wasm.wasmPaths=B+'vendor/ort/'; ort.env.wasm.proxy=false;
  const M=B+'voice-model/';
  const grammar=JSON.parse(new TextDecoder().decode(await fetchCached(M+'grammar.json')));
  const opt={executionProviders:['wasm'], graphOptimizationLevel:'all'};
  const mk=async f=>ort.InferenceSession.create(await fetchCached(M+f), opt);
  const enc=await mk('encoder.int8.onnx'), dec=await mk('decoder.int8.onnx'), joi=await mk('joiner.int8.onnx');
  R=new self.TEREM_ASR_CORE.Recognizer(ort,{enc,dec,joi},grammar);
  // прогрев: один пустой проход, чтобы первый ответ ребёнка не ждал компиляции
  const warm=new Float32Array(16000*0.6); for(let i=0;i<warm.length;i++) warm[i]=Math.sin(i/7)*0.001;
  await R.recognize(warm,16000,'answer').catch(()=>{});
}
self.onmessage=async e=>{
  const m=e.data||{};
  if(m.type==='load'){
    try{ if(!loading) loading=load(); await loading; self.postMessage({type:'ready'}); }
    catch(err){ loading=null; self.postMessage({type:'error', error:String(err&&err.message||err)}); }
    return;
  }
  if(m.type==='recognize'){
    const samples=m.samples;
    try{
      if(!R) throw new Error('not-ready');
      const r=await R.recognize(samples, m.sr, m.state||'answer', {reject:m.reject});
      samples.fill(0);
      // наружу уходит только намерение; сырой текст оставляем лишь для диагностики длины/отбраковки
      self.postMessage({type:'result', id:m.id, intent:{kind:r.kind, value:r.value}, info:{margin:r.margin, ms:r.ms, phrase:r.phrase, reason:r.reason}});
    }catch(err){ samples.fill(0); self.postMessage({type:'result', id:m.id, intent:{kind:'unknown'}, info:{reason:'error', error:String(err&&err.message||err)}}); }
  }
};

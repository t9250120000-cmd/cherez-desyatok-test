/* Локальное распознавание короткого ответа ребёнка. Без сети: признаки, кодировщик и
   поиск по закрытому словарю (числа 0–20 и несколько команд) выполняются на устройстве.
   Аудио живёт только в памяти одного хода и после разбора обнуляется. */
(function(root){
'use strict';
const SR=16000, SHIFT=160, FLEN=400, NFFT=512, NB=80;

/* ---- ресемплинг в 16 кГц: простой ФНЧ + линейная интерполяция ---- */
function resample(x, sr){
  if(sr===SR) return Float32Array.from(x);
  const ratio=sr/SR, n=Math.floor(x.length/ratio);
  let y=x;
  if(ratio>1.05){ // сглаживание скользящим окном против наложения спектра
    const w=Math.max(1,Math.round(ratio)); y=new Float32Array(x.length); let acc=0;
    for(let i=0;i<x.length;i++){ acc+=x[i]; if(i>=w) acc-=x[i-w]; y[i]=acc/Math.min(i+1,w); }
  }
  const out=new Float32Array(n);
  for(let i=0;i<n;i++){ const t=i*ratio, k=Math.floor(t), f=t-k; out[i]=(y[k]||0)*(1-f)+(y[k+1]!==undefined?y[k+1]:y[k]||0)*f; }
  return out;
}

/* ---- Kaldi-совместимые fbank (povey, preemph .97, 80 мел, snip_edges=false) ---- */
let MEL=null, WIN=null, COS=null, SIN=null, REV=null;
function initTables(){
  if(MEL) return;
  const mel=f=>1127*Math.log(1+f/700), lo=mel(20), hi=mel(SR/2-400), d=(hi-lo)/(NB+1), nbin=NFFT/2;
  MEL=[];
  for(let b=0;b<NB;b++){
    const l=lo+b*d, c=lo+(b+1)*d, r=lo+(b+2)*d, row=new Float32Array(nbin+1);
    let first=-1,last=-1;
    for(let k=0;k<nbin;k++){ const m=mel(k*SR/NFFT); if(m>l&&m<r){ row[k]=Math.max(0,Math.min((m-l)/(c-l),(r-m)/(r-c))); if(first<0) first=k; last=k; } }
    MEL.push({row,first,last});
  }
  WIN=new Float64Array(FLEN);
  for(let i=0;i<FLEN;i++) WIN[i]=Math.pow(0.5-0.5*Math.cos(2*Math.PI*i/(FLEN-1)),0.85);
  COS=new Float64Array(NFFT/2); SIN=new Float64Array(NFFT/2);
  for(let i=0;i<NFFT/2;i++){ COS[i]=Math.cos(-2*Math.PI*i/NFFT); SIN[i]=Math.sin(-2*Math.PI*i/NFFT); }
  REV=new Uint16Array(NFFT); const bits=Math.log2(NFFT);
  for(let i=0;i<NFFT;i++){ let r=0; for(let b=0;b<bits;b++) if(i&(1<<b)) r|=1<<(bits-1-b); REV[i]=r; }
}
function fft(re,im){
  const n=NFFT;
  for(let i=0;i<n;i++){ const j=REV[i]; if(j>i){ let t=re[i]; re[i]=re[j]; re[j]=t; t=im[i]; im[i]=im[j]; im[j]=t; } }
  for(let size=2;size<=n;size<<=1){
    const half=size>>1, step=n/size;
    for(let s=0;s<n;s+=size) for(let k=0;k<half;k++){
      const wr=COS[k*step], wi=SIN[k*step], a=s+k, b=a+half;
      const tr=re[b]*wr-im[b]*wi, ti=re[b]*wi+im[b]*wr;
      re[b]=re[a]-tr; im[b]=im[a]-ti; re[a]+=tr; im[a]+=ti;
    }
  }
}
function fbank(x){
  initTables();
  const N=x.length, nf=Math.floor((N+SHIFT/2)/SHIFT), out=new Float32Array(nf*NB);
  const fr=new Float64Array(FLEN), re=new Float64Array(NFFT), im=new Float64Array(NFFT), pw=new Float64Array(NFFT/2+1);
  for(let i=0;i<nf;i++){
    const st=i*SHIFT+SHIFT/2-FLEN/2; let mean=0;
    for(let j=0;j<FLEN;j++){ let k=st+j; if(k<0) k=-k-1; if(k>=N) k=2*N-1-k; k=Math.min(Math.max(k,0),N-1); fr[j]=x[k]; mean+=fr[j]; }
    mean/=FLEN; for(let j=0;j<FLEN;j++) fr[j]-=mean;
    for(let j=FLEN-1;j>0;j--) fr[j]-=0.97*fr[j-1]; fr[0]-=0.97*fr[0];
    re.fill(0); im.fill(0); for(let j=0;j<FLEN;j++) re[j]=fr[j]*WIN[j];
    fft(re,im);
    for(let k=0;k<=NFFT/2;k++) pw[k]=re[k]*re[k]+im[k]*im[k];
    for(let b=0;b<NB;b++){ const m=MEL[b]; let s=0; for(let k=m.first;k<=m.last;k++) s+=m.row[k]*pw[k]; out[i*NB+b]=Math.log(Math.max(s,1.1920929e-7)); }
  }
  return {data:out, frames:nf};
}

/* ---- префиксное дерево фраз одного состояния ---- */
function buildTrie(phrases){
  const nodes=[{parent:-1,tok:-1,ctx:'0,0',kids:new Map(),end:[]}];
  phrases.forEach((p,pi)=>{
    let n=0, c1=0, c2=0;
    for(const id of p.ids){
      let k=nodes[n].kids.get(id);
      if(k===undefined){ k=nodes.length; c1=c2; c2=id; nodes.push({parent:n,tok:id,ctx:c1+','+c2,kids:new Map(),end:[]}); nodes[n].kids.set(id,k); }
      else { c1=c2; c2=id; }
      n=k;
    }
    nodes[n].end.push(pi);
  });
  const ctxIndex=new Map(), ctxList=[];
  nodes.forEach(nd=>{ if(!ctxIndex.has(nd.ctx)){ ctxIndex.set(nd.ctx,ctxList.length); ctxList.push(nd.ctx.split(',').map(Number)); } nd.ci=ctxIndex.get(nd.ctx); });
  return {nodes, ctxList};
}

function lae(a,b){ if(a===-Infinity) return b; if(b===-Infinity) return a; const m=Math.max(a,b); return m+Math.log1p(Math.exp(-Math.abs(a-b))); }
function lse(row, off, V){ let m=-Infinity; for(let v=0;v<V;v++) if(row[off+v]>m) m=row[off+v]; let s=0; for(let v=0;v<V;v++) s+=Math.exp(row[off+v]-m); return m+Math.log(s); }

/* ---- распознаватель поверх onnxruntime (web или node) ---- */
function Recognizer(ort, sessions, grammar){
  this.ort=ort; this.enc=sessions.enc; this.dec=sessions.dec; this.joi=sessions.joi; this.g=grammar;
  this.tries={}; this.decCache={};
  for(const st in grammar.states) this.tries[st]=buildTrie(grammar.states[st]);
}
Recognizer.prototype.encode=async function(x16){
  const {data,frames}=fbank(x16), T=this.ort.Tensor;
  const r=await this.enc.run({x:new T('float32',data,[1,frames,NB]), x_lens:new T('int64',BigInt64Array.from([BigInt(frames)]),[1])});
  const len=Number(r.encoder_out_lens.data[0]); return {E:r.encoder_out.data, T:len, D:r.encoder_out.dims[2]};
};
Recognizer.prototype.decoderOut=async function(ctxs){
  const T=this.ort.Tensor, y=new BigInt64Array(ctxs.length*2);
  ctxs.forEach((c,i)=>{ y[2*i]=BigInt(c[0]); y[2*i+1]=BigInt(c[1]); });
  const r=await this.dec.run({y:new T('int64',y,[ctxs.length,2])}); return r.decoder_out.data;
};
Recognizer.prototype.joiner=async function(encRows, decRows, n, D){
  const T=this.ort.Tensor;
  const r=await this.joi.run({encoder_out:new T('float32',encRows,[n,D]), decoder_out:new T('float32',decRows,[n,D])});
  return r.logit.data;
};
/* жадный поиск без словаря — эталон для отбраковки посторонней речи */
Recognizer.prototype.greedy=async function(enc){
  const {E,T,D}=enc, V=this.g.tokens.length-0; let ctx=[0,0], score=0, hyp=[];
  let d=await this.decoderOut([ctx]);
  for(let t=0;t<T;t++){
    const lg=await this.joiner(E.subarray(t*D,(t+1)*D), d, 1, D), Vn=lg.length;
    const z=lse(lg,0,Vn); let k=0; for(let v=1;v<Vn;v++) if(lg[v]>lg[k]) k=v;
    score+=lg[k]-z;
    if(k!==0){ hyp.push(k); ctx=[ctx[1],k]; d=await this.decoderOut([ctx]); }
  }
  const text=hyp.map(k=>this.g.tokens[k]).join('').replace(/▁/g,' ').trim();
  return {text, score};
};
/* полный прямой проход RNN-T по дереву фраз с отсечением по лучу */
Recognizer.prototype.grammarScores=async function(enc, state, beam){
  beam=beam||18;
  const {E,T,D}=enc, tr=this.tries[state], nodes=tr.nodes, NN=nodes.length;
  const key=state; if(!this.decCache[key]) this.decCache[key]=await this.decoderOut(tr.ctxList);
  const DO=this.decCache[key];
  let alpha=new Float64Array(NN).fill(-Infinity); alpha[0]=0;
  for(let t=0;t<T;t++){
    let best=-Infinity; for(let n=0;n<NN;n++) if(alpha[n]>best) best=alpha[n];
    // активные узлы и их контексты; внутри кадра возможны несколько излучений подряд
    const need=new Map(); const active=[];
    for(let n=0;n<NN;n++) if(alpha[n]>best-beam) active.push(n);
    // расширяем активный набор потомками (излучения в этом же кадре) до глубины 3
    const act=new Set(active); let frontier=active;
    for(let depth=0;depth<3;depth++){ const nx=[]; for(const n of frontier) for(const k of nodes[n].kids.values()) if(!act.has(k)){ act.add(k); nx.push(k); } frontier=nx; }
    for(const n of act) if(!need.has(nodes[n].ci)) need.set(nodes[n].ci,need.size);
    const cis=[...need.keys()], m=cis.length, er=new Float32Array(m*D), dr=new Float32Array(m*D), erow=E.subarray(t*D,(t+1)*D);
    cis.forEach((ci,i)=>{ er.set(erow,i*D); dr.set(DO.subarray(ci*D,(ci+1)*D),i*D); });
    const lg=await this.joiner(er,dr,m,D), V=lg.length/m, Z=new Float64Array(m);
    for(let i=0;i<m;i++) Z[i]=lse(lg,i*V,V);
    const lp=(ci,tok)=>{ const i=need.get(ci); return lg[i*V+tok]-Z[i]; };
    // излучения внутри кадра: узлы упорядочены так, что родитель раньше ребёнка
    const ordered=[...act].sort((a,b)=>a-b);
    for(const n of ordered){ if(n===0) continue; const p=nodes[n].parent; if(alpha[p]===-Infinity||!need.has(nodes[p].ci)) continue; alpha[n]=lae(alpha[n],alpha[p]+lp(nodes[p].ci,nodes[n].tok)); }
    const next=new Float64Array(NN).fill(-Infinity);
    for(const n of ordered) if(alpha[n]>-Infinity) next[n]=alpha[n]+lp(nodes[n].ci,0);
    alpha=next;
  }
  const res=[];
  nodes.forEach((nd,n)=>{ for(const pi of nd.end) res.push({pi, ll:alpha[n]}); });
  return res;
};
Recognizer.prototype.recognize=async function(samples, sr, state, opts){
  opts=opts||{};
  const t0=Date.now(), x=resample(samples,sr);
  if(x.length<SR*0.25) return {kind:'unknown', reason:'short'};
  const enc=await this.encode(x);
  const g=await this.greedy(enc);
  const sc=await this.grammarScores(enc,state,opts.beam);
  let best=null; for(const s of sc) if(!best||s.ll>best.ll) best=s;
  x.fill(0);
  const P=this.g.states[state];
  const margin=best?g.score-best.ll:Infinity, thr=opts.reject||4.5;
  const out={greedy:g.text, margin:+margin.toFixed(2), ms:Date.now()-t0, phrase:best?P[best.pi].t:null};
  if(!best||margin>=thr) return Object.assign(out,{kind:'unknown',reason:'outside-grammar'});
  return Object.assign(out, P[best.pi].i);
};
const api={resample, fbank, buildTrie, Recognizer, SR};
root.TEREM_ASR_CORE=api; if(typeof module!=='undefined') module.exports=api;
})(typeof self!=='undefined'?self:globalThis);

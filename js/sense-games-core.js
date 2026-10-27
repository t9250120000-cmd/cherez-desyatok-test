/* Чувство числа: чистые правила двух игр без хранилища, таймеров и звука.
   «Слаймовая дорожка» — линейная настольная игра 0–10 / 0–20 (ход = отсчёт от своей клетки).
   «Собери тройку» — одно число в трёх видах: цифра, слово, количество в теремке. */
(function(root){
  'use strict';
  const WORDS=['ноль','один','два','три','четыре','пять','шесть','семь','восемь','девять','десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать','шестнадцать','семнадцать','восемнадцать','девятнадцать','двадцать'];
  const RACE={ten:{end:10,die:3,bulkDie:2},twenty:{end:20,die:6,bulkDie:5}};
  function rnd(rng,n){const r=rng();if(!Number.isFinite(r)||r<0||r>=1)throw new RangeError('Invalid random source');return 1+Math.floor(r*n);}
  function shuffle(a,rng){const o=a.slice();for(let i=o.length-1;i>0;i--){const j=rnd(rng,i+1)-1;[o[i],o[j]]=[o[j],o[i]];}return o;}

  /* ---------- Слаймовая дорожка ---------- */
  function raceCreate(level){
    if(!Object.hasOwn(RACE,level))throw new RangeError('Unknown race level');
    const c=RACE[level];
    return {game:'race',level,end:c.end,maxDie:c.die,bulkDie:c.bulkDie,you:0,bulk:0,phase:'roll',die:null,target:null,help:false,wrongTurn:0,msgKey:'',turns:[],winner:null,bulkLast:null};
  }
  // Подсказка: шаги по одному, а при переходе через 10 — два прыжка «до 10 и ещё».
  function raceHint(s){
    const from=s.you,to=s.target;if(to==null)return null;
    const hops=[];for(let n=from+1;n<=to;n++)hops.push(n);
    const cross=from<10&&to>10?{toTen:10-from,rest:to-10}:null;
    return {hops,cross,key:cross?'cross':'hop'};
  }
  function raceReduce(s,a,rng){
    if(s.phase==='finish')return s;
    if(a.type==='roll'&&s.phase==='roll'){const die=rnd(rng,s.maxDie);return {...s,phase:'move',die,target:Math.min(s.end,s.you+die),help:false,wrongTurn:0,msgKey:''};}
    if(a.type==='help'&&s.phase==='move')return {...s,help:true,msgKey:raceHint(s).key};
    if(a.type==='cell'&&s.phase==='move'){
      if(!Number.isInteger(a.value)||a.value<0||a.value>s.end)return s;
      if(a.value!==s.target){
        const msgKey=a.value<=s.you?'back':a.value<s.target?'short':'far';
        return {...s,help:true,wrongTurn:s.wrongTurn+1,msgKey};
      }
      const turn={from:s.you,die:s.die,to:s.target,wrong:s.wrongTurn,supported:s.help,cross:s.you<10&&s.target>10};
      const next={...s,you:s.target,turns:[...s.turns,turn],msgKey:''};
      if(next.you>=s.end)return {...next,phase:'finish',winner:'you'};
      return {...next,phase:'bulk'};
    }
    if(a.type==='bulk'&&s.phase==='bulk'){
      const die=rnd(rng,s.bulkDie),to=Math.min(s.end,s.bulk+die);
      const next={...s,bulk:to,bulkLast:{from:s.bulk,die,to},die:null,target:null,help:false};
      if(to>=s.end)return {...next,phase:'finish',winner:'bulk'};
      return {...next,phase:'roll'};
    }
    return s;
  }
  function raceResult(s){return {game:'race',level:s.level,rounds:s.turns.length,errors:s.turns.reduce((a,t)=>a+t.wrong,0),supported:s.turns.filter(t=>t.supported).length,won:s.winner==='you'};}

  /* ---------- Собери тройку ---------- */
  const KINDS=['picture','digit','word'];
  const TRIPLE={small:{min:1,max:10},teen:{min:11,max:20}};
  // Похожие на слух и по записи числа — самые полезные отвлекающие варианты.
  const CONFUSE={7:[17],17:[7,16],12:[20,2],20:[12,2],2:[12,20],13:[3,30],14:[4,40],11:[1,10],16:[6,17],6:[16],19:[9,18],15:[5,14]};
  function distractors(n,cfg,rng){
    const pool=new Set();(CONFUSE[n]||[]).forEach(x=>{if(x>=cfg.min-1&&x<=cfg.max&&x!==n&&x>0)pool.add(x);});
    for(const d of [1,-1,2,-2,3,-3])if(n+d>=Math.max(1,cfg.min-1)&&n+d<=cfg.max)pool.add(n+d);
    const near=[...pool].filter(x=>x!==n);
    const pick=shuffle(near.slice(0,4),rng).slice(0,2);
    while(pick.length<2){const x=cfg.min+rnd(rng,cfg.max-cfg.min+1)-1;if(x!==n&&!pick.includes(x))pick.push(x);}
    return pick;
  }
  function tripleCreate(level,rng,rounds){
    if(!Object.hasOwn(TRIPLE,level))throw new RangeError('Unknown triple level');
    const cfg=TRIPLE[level],count=rounds||5;
    const nums=shuffle(Array.from({length:cfg.max-cfg.min+1},(_,i)=>cfg.min+i),rng).slice(0,count);
    const queue=nums.map((n,i)=>{
      const given=KINDS[i%3];
      const rows={};for(const k of KINDS)if(k!==given)rows[k]=shuffle([n,...distractors(n,cfg,rng)],rng);
      return {n,given,rows};
    });
    return tripleRound({game:'triple',level,queue,results:[],round:0},0);
  }
  function tripleRound(s,round){return {...s,round,phase:'play',picked:{},help:false,wrong:0,msgKey:'',task:s.queue[round]};}
  function tripleReduce(s,a){
    if(a.round!==s.round||s.phase==='finish')return s;
    if(a.type==='next'&&s.phase==='success')return s.round===s.queue.length-1?{...s,phase:'finish'}:tripleRound(s,s.round+1);
    if(s.phase!=='play')return s;
    if(a.type==='help')return {...s,help:true,msgKey:'help'};
    if(a.type==='pick'){
      const row=s.task.rows[a.kind];if(!row||!row.includes(a.value))return s;
      if(a.value!==s.task.n){return {...s,wrong:s.wrong+1,help:s.wrong+1>=2||s.help,picked:{...s.picked,[a.kind]:null},msgKey:a.kind};}
      const picked={...s.picked,[a.kind]:a.value};
      const done=Object.keys(s.task.rows).every(k=>picked[k]===s.task.n);
      if(done)return {...s,picked,phase:'success',msgKey:'',results:[...s.results,{n:s.task.n,given:s.task.given,wrong:s.wrong,supported:s.help}]};
      return {...s,picked,msgKey:''};
    }
    return s;
  }
  function tripleResult(s){return {game:'triple',level:s.level,rounds:s.results.length,errors:s.results.reduce((a,r)=>a+r.wrong,0),supported:s.results.filter(r=>r.supported).length};}

  const api={WORDS,RACE,TRIPLE,KINDS,raceCreate,raceReduce,raceHint,raceResult,tripleCreate,tripleReduce,tripleResult,distractors};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TEREM_SENSE=api;
})(typeof window!=='undefined'?window:globalThis);

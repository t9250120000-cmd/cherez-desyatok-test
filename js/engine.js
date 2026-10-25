/* Движок заданий: 7 навыков × 3 этапа. Все реплики берутся из PH (phrases.js). */
(function(root){
'use strict';
const PH = root.PH;
const rand = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const shuffle = arr => { for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]} return arr; };
const range = (a,b) => { const r=[]; for(let i=a;i<=b;i++) r.push(i); return r; };
const MINUS='−';

const SKILLS = [
  {id:'see',   title:'Сколько слаймиков', desc:'Узнавать, сколько слаймиков в теремке, не пересчитывая', phases:3},
  {id:'to10',  title:'Дружные с 10',      desc:'Сколько не хватает до 10 и сколько остаётся', phases:3},
  {id:'split', title:'Разбей число',      desc:'Состав чисел от 3 до 9: 7 — это 3 и 4', phases:3},
  {id:'teen',  title:'Десяток и ещё',     desc:'13 — это 10 и 3', phases:3},
  {id:'add',   title:'Плюс через 10',     desc:'8 + 5: сначала добиваем до 10', phases:3},
  {id:'sub',   title:'Минус через 10',    desc:'13 − 5: сначала убираем до 10', phases:3},
  {id:'mix',   title:'В уме',             desc:'Примеры, пропущенные числа, задачи', phases:1}
];
const SK = {}; SKILLS.forEach((s,i)=>{ s.n=i+1; SK[s.id]=s; });
const PHASES = ['руками','по картинке','в уме'];
const phaseName = (id,ph) => id==='mix' ? 'в уме' : PHASES[ph-1];

/* ---- рамки ---- */
const C = k => ({k, lab:'', h:false, an:''});
function fr(spec){ const f=[]; spec.forEach(([k,n])=>{ for(let i=0;i<n;i++) f.push(C(k)); }); while(f.length<10) f.push(C('e')); return f; }
const count = (f,k) => f.filter(c=>c.k===k).length;
function hl(f, pred){ f.forEach((c,i)=>{ if(pred(c,i)) c.h=true; }); }
function clearH(t){ if(t.frames) t.frames.forEach(f=>f.forEach(c=>{ c.h=false; })); }
function labelKind(f, k){ let i=0; f.forEach(c=>{ if(c.k===k) c.lab=++i; }); }
function fillEmpty(f){ let i=0; f.forEach(c=>{ if(c.k==='e'){ c.k='b'; c.an='in'; c.lab=++i; } }); }
function countOn(f, k){ let i=10; f.forEach(c=>{ if(c.k===k) c.lab=++i; }); }

const Q = '<span class="q">?</span>';
const ca = x => '<span class="ca">'+x+'</span>';
const cb = x => '<span class="cb">'+x+'</span>';
function chainHTML(o, full){
  if(o.op==='add'){
    const h = ca(o.a)+' + '+cb(o.b)+' = '+ca(o.a)+' + '+cb(o.k)+' + '+cb(o.r);
    return full ? h+' = 10 + '+cb(o.r)+' = <strong>'+o.sum+'</strong>' : h+' = 10 + '+cb(o.r)+' = …';
  }
  const h = ca(o.m)+' '+MINUS+' '+cb(o.s)+' = '+ca(o.m)+' '+MINUS+' '+cb(o.u)+' '+MINUS+' '+cb(o.r);
  return full ? h+' = 10 '+MINUS+' '+cb(o.r)+' = <strong>'+o.res+'</strong>' : h+' = 10 '+MINUS+' '+cb(o.r)+' = …';
}
const addObj = (a,b) => ({op:'add', a, b, k:10-a, r:b-(10-a), sum:a+b});
const subObj = (m,s) => ({op:'sub', m, s, u:m-10, r:s-(m-10), res:m-s});
const ADD_ALL = () => { const r=[]; for(let a=2;a<=9;a++) for(let b=2;b<=9;b++) if(a+b>10) r.push({a,b,key:a+'+'+b}); return r; };
const SUB_ALL = () => { const r=[]; for(let m=11;m<=18;m++) for(let s=2;s<=9;s++) if(s>m-10) r.push({m,s,key:m+'-'+s}); return r; };

/* колоды: каждый пример один раз, потом перетасовка */
const decks = {};
let lastKey = null;
function draw(name, build){
  let d = decks[name]; if(!d || !d.length) d = decks[name] = shuffle(build());
  let it = d.pop();
  if(it.key===lastKey && d.length){ d.unshift(it); it = d.pop(); }
  return it;
}
function hardPick(hard, op){
  const keys = Object.keys(hard).filter(k=>hard[k]>0 && (op==='add' ? k.includes('+') : k.includes('-')) && k!==lastKey);
  if(!keys.length || Math.random()>.35) return null;
  const k = pick(keys);
  if(k.includes('+')){ const [a,b]=k.split('+').map(Number); return {a,b,key:k}; }
  const [m,s]=k.split('-').map(Number); return {m,s,key:k};
}

let uid = 0;
function mk(skill, ph, it){ return {id:++uid, skill, ph, item:it, key:it.key, frames:null, show:true, house:null, steps:[], si:0, clean:true, wr:0, done:false, msg:null, msgT:'', big:()=>'', story:null, chain:'', hintChain:'', cnt:0, sfx:null}; }
const FISH = PH.FISHN;
const S = PH.see, T10 = PH.to10, SP = PH.split, TE = PH.teen, AD = PH.add, SU = PH.sub, MX = PH.mix;

const G = {};
G.see = (ph, it) => {
  it = it || draw('see', ()=>range(1,10).map(n=>({n,key:'s'+n})));
  const n = it.n, t = mk('see', ph, it);
  t.frames = [fr([['a',n]])];
  t.big = () => t.done ? ca(n) : '';
  const labelAll = () => labelKind(t.frames[0],'a');
  const uncover = () => { t.covered=false; t.flash=false; t.show=true; if(t.onUncover) t.onUncover(); };
  const ex = () => n>5 ? [
    {say:S.exTop, do:()=>{ uncover(); hl(t.frames[0],(c,i)=>i<5); t.frames[0].forEach((c,i)=>{ c.lab = i<5 ? i+1 : ''; }); }},
    {say:S.exBottom(n), do:()=>{ hl(t.frames[0],(c,i)=>i>=5 && c.k==='a'); labelAll(); }},
    {say:S.exFive(n)}
  ] : [
    {say:S.exOne(n), do:()=>{ uncover(); hl(t.frames[0],c=>c.k==='a'); labelAll(); }},
    {say:S.exAll(n)}
  ];
  if(ph===1){
    t.steps = [
      {kind:'act', instr:S.countTap, can:(fi,ci)=>t.frames[0][ci].k==='a' && !t.frames[0][ci].lab,
       tap:(fi,ci)=>{ const c=t.frames[0][ci]; c.lab=++t.cnt; c.an='pulse'; },
       ready:()=>t.cnt===n, info:()=>t.cnt ? 'Насчитал: <b>'+t.cnt+'</b>' : ''},
      {kind:'num', instr:S.howMany, ans:n, hint:lv=> lv===1 ? S.lastDigit : S.lastIs(n),
       ex:()=>[{say:S.exCounted(n), do:()=>{ hl(t.frames[0],c=>c.k==='a'); }},{say:S.exTotal(n)}]}
    ];
  }else if(ph===2){
    t.steps = [{kind:'num', instr:S.floor5, ans:n, ex,
      hint:lv=>{ if(lv===1){ if(n>5){ hl(t.frames[0],(c,i)=>i<5); return S.topFull; } hl(t.frames[0],c=>c.k==='a'); return S.countTop; } labelAll(); return S.total(n); }}];
  }else{
    t.flash = true; t.covered = false;
    t.steps = [{kind:'num', instr:S.memorize, instr2:S.howWas, ans:n, ex,
      hint:lv=>{ uncover(); if(lv===2) labelAll(); return lv===1 ? S.lookAgain : S.total(n); }}];
  }
  return t;
};

G.to10 = (ph, it) => {
  it = it || (ph===1 ? draw('to10a', ()=>range(1,9).map(n=>({n,f:'plus',key:'p'+n})))
                     : draw('to10b', ()=>range(1,9).flatMap(n=>[{n,f:'plus',key:'p'+n},{n,f:'minus',key:'m'+n}])));
  if(ph===1 && it.f!=='plus') it = {n:it.n, f:'plus', key:'p'+it.n};
  const n = it.n, k = 10-n, t = mk('to10', ph, it);
  if(it.f==='plus'){
    t.frames = [fr([['a',n]])];
    t.big = () => ca(n)+' + '+(t.done ? cb(k) : Q)+' = 10';
    const ex = () => [
      {say:T10.exRooms(n), do:()=>{ t.show=true; hl(t.frames[0],c=>c.k==='a'); }},
      {say:T10.exFree(k), do:()=>{ hl(t.frames[0],c=>c.k==='e'); labelKind(t.frames[0],'e'); }},
      {say:T10.exSum(n,k)}
    ];
    if(ph===1){
      t.steps = [
        {kind:'act', instr:T10.fillTap, can:(fi,ci)=>t.frames[0][ci].k==='e',
         tap:(fi,ci)=>{ const c=t.frames[0][ci]; c.k='b'; c.lab=++t.cnt; c.an='in'; },
         ready:()=>count(t.frames[0],'e')===0, info:()=>t.cnt ? 'Поселил: <b>'+t.cnt+'</b>' : '', doneMsg:PH.ui.terem},
        {kind:'num', instr:T10.howAdded, ans:k, hint:lv=> lv===1 ? T10.lastBlue : T10.youAdded(k),
         ex:()=>[{say:T10.exBlue(k), do:()=>{ hl(t.frames[0],c=>c.k==='b'); }},{say:T10.exLast(n,k)}]}
      ];
    }else{
      t.show = ph===2;
      t.steps = [{kind:'num', instr:T10.missing, ans:k, ex,
        hint:lv=>{ t.show=true; hl(t.frames[0],c=>c.k==='e'); if(lv===1) return T10.countFree; fillEmpty(t.frames[0]); return T10.missingIs(k); },
        ok:()=>{ t.show=true; t.frames[0].forEach(c=>{ if(c.k==='e'){ c.k='b'; c.an='in'; } }); }}];
    }
  }else{
    t.frames = [fr([['a',k],['x',n]])];
    t.big = () => '10 '+MINUS+' '+cb(n)+' = '+(t.done ? k : Q);
    t.show = ph===2;
    t.steps = [{kind:'num', instr: ph===2 ? T10.left(n) : T10.result, ans:k,
      ex:()=>[
        {say:T10.exWent(n), do:()=>{ t.show=true; hl(t.frames[0],c=>c.k==='x'); }},
        {say:T10.exRed(k), do:()=>{ hl(t.frames[0],c=>c.k==='a'); labelKind(t.frames[0],'a'); }},
        {say:T10.exMinus(n,k)}
      ],
      hint:lv=>{ t.show=true; hl(t.frames[0],c=>c.k==='a'); if(lv===1) return T10.countRed; labelKind(t.frames[0],'a'); return T10.leftIs(k); },
      ok:()=>{ t.show=true; }}];
  }
  return t;
};

G.split = (ph, it) => {
  it = it || draw('split', ()=>{ const r=[]; for(let b=3;b<=9;b++) for(let k=1;k<b;k++) r.push({b,k,key:b+'='+k}); return r; });
  const {b,k} = it, r = b-k, t = mk('split', ph, it);
  t.big = () => cb(b)+' = '+ca(k)+' + '+(t.done ? cb(r) : Q);
  t.house = [b,k,'?'];
  const done = () => { t.house=[b,k,r]; };
  const ex = () => [
    {say:SP.exAll(b,k), do:()=>{ t.show=true; hl(t.frames[0],c=>c.k==='a'); }},
    {say:SP.exBlue(r), do:()=>{ hl(t.frames[0],c=>c.k==='b'); labelKind(t.frames[0],'b'); }},
    {say:SP.isAnd(b,k,r), do:()=>{ t.house=[b,k,r]; }}
  ];
  if(ph===1){
    t.frames = [fr([['b',b]])];
    t.steps = [
      {kind:'act', instr:SP.paint(k), can:(fi,ci)=>['a','b'].includes(t.frames[0][ci].k),
       tap:(fi,ci)=>{ const c=t.frames[0][ci]; c.k = c.k==='b' ? 'a' : 'b'; c.an='pulse';
         const red = count(t.frames[0],'a'); if(red>k){ t.msg=PH.ui.tooMany; t.msgT='no'; t.sfx='no'; } else { t.msg=null; } },
       ready:()=>count(t.frames[0],'a')===k, info:()=>'Красных: <b>'+count(t.frames[0],'a')+'</b> из '+k},
      {kind:'num', instr:SP.blueLeft, ans:r, ex,
       hint:lv=>{ hl(t.frames[0],c=>c.k==='b'); if(lv===1) return SP.countBlue; labelKind(t.frames[0],'b'); return SP.blueIs(r); }, ok:done}
    ];
  }else{
    t.frames = [fr([['a',k],['b',r]])];
    t.show = ph===2;
    t.steps = [{kind:'num', instr:SP.ask(b,k), ans:r, ex,
      hint:lv=>{ t.show=true; hl(t.frames[0],c=>c.k==='b'); if(lv===1) return SP.countBlue; labelKind(t.frames[0],'b'); return SP.isAnd(b,k,r); }, ok:done}];
  }
  return t;
};

G.teen = (ph, it) => {
  it = it || (ph===1 ? draw('teenA', ()=>range(1,9).map(u=>({u,f:'sum',key:'t'+u})))
                     : draw('teenB', ()=>range(1,9).flatMap(u=>[{u,f:'sum',key:'t'+u},{u,f:'part',key:'q'+u},{u,f:'minus',key:'r'+u}])));
  if(ph===1 && it.f!=='sum') it = {u:it.u, f:'sum', key:'t'+it.u};
  const u = it.u, n = 10+u, t = mk('teen', ph, it);
  if(it.f==='sum'){
    t.big = () => '10 + '+cb(u)+' = '+(t.done ? n : Q);
    const ex = () => [
      {say:TE.exFull, do:()=>{ t.show=true; hl(t.frames[0],()=>true); }},
      {say:TE.exSecond(u), do:()=>{ hl(t.frames[1],c=>c.k==='b'); }},
      {say:TE.exCountOn(n), do:()=>{ countOn(t.frames[1],'b'); hl(t.frames[1],c=>c.k==='b'); }},
      {say:TE.tenIs(u,n)}
    ];
    if(ph===1){
      t.frames = [fr([['a',10]]), fr([])];
      t.steps = [
        {kind:'act', instr:TE.put(u), can:(fi,ci)=>fi===1 && t.frames[1][ci].k==='e' && count(t.frames[1],'b')<u,
         tap:(fi,ci)=>{ const c=t.frames[1][ci]; c.k='b'; c.lab=++t.cnt; c.an='in'; },
         ready:()=>count(t.frames[1],'b')===u, info:()=>'Поселил: <b>'+count(t.frames[1],'b')+'</b> из '+u},
        {kind:'num', instr:TE.tenAnd(u), ans:n, ex, hint:lv=>{ countOn(t.frames[1],'b'); return lv===1 ? TE.countOn : TE.tenIs(u,n); }}
      ];
    }else{
      t.frames = [fr([['a',10]]), fr([['b',u]])];
      t.show = ph===2;
      t.steps = [{kind:'num', instr:TE.howTotal, ans:n, ex, hint:lv=>{ t.show=true; countOn(t.frames[1],'b'); return lv===1 ? TE.countOn : TE.tenIs(u,n); }}];
    }
  }else if(it.f==='part'){
    t.big = () => n+' = 10 + '+(t.done ? cb(u) : Q);
    t.frames = [fr([['a',10]]), fr([['b',u]])];
    t.show = ph===2;
    t.steps = [{kind:'num', instr: ph===2 ? TE.hasTen(n) : TE.hidden, ans:u,
      ex:()=>[
        {say:TE.exPart(n), do:()=>{ t.show=true; hl(t.frames[0],()=>true); }},
        {say:TE.exSecondSeq(u), do:()=>{ hl(t.frames[1],c=>c.k==='b'); labelKind(t.frames[1],'b'); }},
        {say:TE.exPartIs(n,u)}
      ],
      hint:lv=>{ t.show=true; hl(t.frames[1],c=>c.k==='b'); if(lv===1) return TE.countSecond; labelKind(t.frames[1],'b'); return TE.partIs(n,u); }}];
  }else{
    t.big = () => n+' '+MINUS+' '+cb(u)+' = '+(t.done ? 10 : Q);
    t.frames = [fr([['a',10]]), fr([['x',u]])];
    t.show = ph===2;
    t.steps = [{kind:'num', instr: ph===2 ? TE.allGone : TE.result || MX.result, ans:10,
      ex:()=>[
        {say:TE.exGone(n,u), do:()=>{ t.show=true; hl(t.frames[1],()=>true); }},
        {say:TE.exTenLeft, do:()=>{ hl(t.frames[0],()=>true); }}
      ],
      hint:lv=>{ t.show=true; hl(t.frames[0],c=>c.k==='a'); return lv===1 ? TE.lookFirst : TE.tenLeft; }}];
  }
  return t;
};

function addKit(t, o){
  const f0 = () => t.frames[0], f1 = () => t.frames[1];
  const moveAll = () => {
    let need = o.k; f0().forEach(c=>{ if(c.k==='e' && need>0){ c.k='b'; c.an='in'; need--; } });
    for(let j=o.r;j<o.b;j++){ const c=f1()[j]; if(c.k==='b'){ c.k='e'; c.an='leave'; c.lab=''; } }
  };
  const bK = () => [
    {say:AD.exRooms(o.a,o.k), do:()=>{ t.show=true; hl(f0(),c=>c.k==='e'); labelKind(f0(),'e'); }},
    {say:AD.exMissing(o.k)}
  ];
  const bR = () => [
    {say:AD.exSplit(o.b,o.k,o.r), do:()=>{ t.show=true; t.house=[o.b,o.k,o.r]; hl(f1(),(c,j)=>c.k==='b' && j>=o.r); }},
    {say:AD.exMove(o.k), do:()=>{ moveAll(); hl(f0(),()=>true); }},
    {say:AD.exLeft(o.r), do:()=>{ hl(f1(),c=>c.k==='b'); }}
  ];
  const bSum = () => [
    {say:AD.exFull, do:()=>{ t.show=true; moveAll(); hl(f0(),()=>true); }},
    {say:AD.exCountOn(o.sum), do:()=>{ countOn(f1(),'b'); hl(f1(),c=>c.k==='b'); }},
    {say:AD.exTenIs(o.r,o.sum)}
  ];
  const full = () => [{say:AD.exStart(o.a,o.b), do:()=>{ t.show=true; }}, ...bK(), ...bR(), ...bSum(), {say:AD.exEq(o.a,o.b,o.sum)}];
  return {moveAll, bK, bR, bSum, full};
}
function subKit(t, o){
  const f0 = () => t.frames[0], f1 = () => t.frames[1];
  const cross2 = () => { f1().forEach(c=>{ if(c.k==='a'){ c.k='x'; c.an='out'; c.lab=''; } }); };
  const cross1 = () => { for(let j=10-o.r;j<10;j++){ const c=f0()[j]; if(c.k==='a'){ c.k='x'; c.an='out'; c.lab=''; } } };
  const bU = () => [
    {say:SU.exSecond(o.u), do:()=>{ t.show=true; hl(f1(),c=>c.k==='a'); }},
    {say:SU.exRemoved(o.u), do:()=>{ cross2(); hl(f0(),()=>true); }}
  ];
  const bR = () => [
    {say:SU.exNeed(o.s,o.u,o.r), do:()=>{ t.show=true; cross2(); t.house=[o.s,o.u,o.r]; }},
    {say:SU.exMore(o.u,o.r), do:()=>{ hl(f0(),(c,j)=>j>=10-o.r && c.k==='a'); }}
  ];
  const bRes = () => [
    {say:SU.exTake(o.r), do:()=>{ t.show=true; cross2(); cross1(); }},
    {say:SU.exCount(o.res), do:()=>{ hl(f0(),c=>c.k==='a'); labelKind(f0(),'a'); }},
    {say:SU.exTenMinus(o.r,o.res)}
  ];
  const full = () => [{say:SU.exStart(o.m,o.s), do:()=>{ t.show=true; }}, ...bU(), ...bR(), ...bRes(), {say:SU.exEq(o.m,o.s,o.res)}];
  return {cross1, cross2, bU, bR, bRes, full};
}

G.add = (ph, it, hard) => {
  it = it || hardPick(hard||{}, 'add') || draw('add', ADD_ALL);
  const o = addObj(it.a, it.b), t = mk('add', ph, it); t.o = o;
  t.frames = [fr([['a',o.a]]), fr([['b',o.b]])];
  t.big = () => ca(o.a)+' + '+cb(o.b)+' = '+(t.done ? o.sum : Q);
  t.chain = chainHTML(o, true);
  const K = addKit(t, o);
  const stepRest = {kind:'num', instr:AD.tenAnd(o.r), ans:o.sum, ex:K.bSum,
    hint:lv=>{ countOn(t.frames[1],'b'); return lv===1 ? AD.countOn2 : AD.tenIs(o.r,o.sum); }};
  if(ph===1){
    t.steps = [
      {kind:'act', instr:AD.moveTap, can:(fi,ci)=>fi===1 && t.frames[1][ci].k==='b',
       tap:()=>{
         if(count(t.frames[0],'e')===0) return;
         const f2 = t.frames[1]; let last=-1; f2.forEach((c,j)=>{ if(c.k==='b') last=j; });
         f2[last].k='e'; f2[last].an='leave';
         const tgt = t.frames[0].find(c=>c.k==='e'); tgt.k='b'; tgt.an='in'; t.cnt++;
       },
       ready:()=>count(t.frames[0],'e')===0, info:()=>'Переселил: <b>'+t.cnt+'</b>', doneMsg:PH.ui.terem},
      {kind:'num', instr:AD.blueLeft2, ans:o.r,
       ex:()=>[{say:AD.exFirstFull, do:()=>{ hl(t.frames[1],c=>c.k==='b'); }},{say:AD.exBlueSeq(o.r), do:()=>{ labelKind(t.frames[1],'b'); }},{say:AD.exLeft2(o.r)}],
       hint:lv=>{ hl(t.frames[1],c=>c.k==='b'); if(lv===1) return AD.countBlue2; labelKind(t.frames[1],'b'); return AD.leftIs(o.r); }},
      stepRest
    ];
  }else if(ph===2){
    t.steps = [
      {kind:'num', instr:AD.missingFirst, ans:o.k, ex:K.bK,
       hint:lv=>{ hl(t.frames[0],c=>c.k==='e'); if(lv===1) return AD.countFree; labelKind(t.frames[0],'e'); return AD.missingIs(o.k); },
       ok:()=>{ t.frames[0].forEach(c=>{ c.lab=''; }); t.house=[o.b,o.k,'?']; }},
      {kind:'num', instr:AD.splitAsk(o.b,o.k), ans:o.r, ex:K.bR,
       hint:lv=>{ hl(t.frames[1],(c,j)=>c.k==='b' && j>=o.r); if(lv===1) return AD.yellowMove(o.k); return AD.splitIs(o.b,o.k,o.r); },
       ok:()=>{ t.house=[o.b,o.k,o.r]; K.moveAll(); }},
      {kind:'num', instr:AD.tenPlus(o.r), ans:o.sum, hint:stepRest.hint, ex:K.bSum}
    ];
  }else{
    t.show = false;
    t.steps = [{kind:'num', instr:AD.result, ans:o.sum, ex:K.full,
      hint:lv=>{
        if(lv===1){ t.house=[o.b,o.k,o.r]; return AD.hint1(o.a,o.k,o.b,o.r); }
        t.show=true; K.moveAll(); t.hintChain = chainHTML(o,true); return AD.hint2(o.a,o.k,o.r,o.sum);
      }}];
  }
  return t;
};

G.sub = (ph, it, hard) => {
  it = it || hardPick(hard||{}, 'sub') || draw('sub', SUB_ALL);
  const o = subObj(it.m, it.s), t = mk('sub', ph, it); t.o = o;
  t.frames = [fr([['a',10]]), fr([['a',o.u]])];
  t.big = () => ca(o.m)+' '+MINUS+' '+cb(o.s)+' = '+(t.done ? o.res : Q);
  t.chain = chainHTML(o, true);
  const K = subKit(t, o);
  const stepRes = {kind:'num', instr:SU.howLeft, ans:o.res,
    ex:()=>[{say:SU.exRedSeq(o.res), do:()=>{ hl(t.frames[0],c=>c.k==='a'); labelKind(t.frames[0],'a'); }},{say:SU.exLeftEq(o.res,o.m,o.s)}],
    hint:lv=>{ hl(t.frames[0],c=>c.k==='a'); if(lv===1) return SU.countRed; labelKind(t.frames[0],'a'); return SU.leftIs(o.res); }};
  if(ph===1){
    t.steps = [
      {kind:'act', instr:SU.goTap(o.s), can:(fi,ci)=>t.frames[fi][ci].k==='a' && t.cnt<o.s,
       tap:(fi,ci)=>{
         if(fi===0 && count(t.frames[1],'a')>0){ t.msg=PH.ui.secondFirst; t.msgT='no'; t.sfx='no'; return; }
         const c=t.frames[fi][ci]; c.k='x'; c.an='out'; t.cnt++;
         if(count(t.frames[1],'a')===0 && t.cnt<o.s){ t.msg=SU.emptyMore(o.s-t.cnt); t.msgT='ok'; t.sfx='say'; } else t.msg=null;
       },
       ready:()=>t.cnt===o.s, info:()=>'Ушли гулять: <b>'+t.cnt+'</b> из '+o.s},
      stepRes
    ];
  }else if(ph===2){
    t.steps = [
      {kind:'num', instr:SU.howSecond, ans:o.u,
       ex:()=>[{say:SU.exSecondSeq(o.u), do:()=>{ hl(t.frames[1],c=>c.k==='a'); labelKind(t.frames[1],'a'); }},{say:SU.exSecondFirst(o.u)}],
       hint:lv=>{ hl(t.frames[1],c=>c.k==='a'); if(lv===1) return SU.countSecond; labelKind(t.frames[1],'a'); return SU.secondIs(o.u); },
       ok:()=>{ K.cross2(); t.house=[o.s,o.u,'?']; }},
      {kind:'num', instr:SU.removedAsk(o.u,o.s), ans:o.r, ex:K.bR,
       hint:lv=> lv===1 ? SU.howMore(o.s) : SU.splitIs(o.s,o.u,o.r),
       ok:()=>{ t.house=[o.s,o.u,o.r]; K.cross1(); }},
      {kind:'num', instr:SU.tenMinus(o.r), ans:o.res, hint:stepRes.hint, ex:K.bRes}
    ];
  }else{
    t.show = false;
    t.steps = [{kind:'num', instr:SU.result, ans:o.res, ex:K.full,
      hint:lv=>{
        if(lv===1){ t.house=[o.s,o.u,o.r]; return SU.hint1(o.u,o.s,o.r); }
        t.show=true; K.cross2(); K.cross1(); t.hintChain = chainHTML(o,true); return SU.hint2(o.m,o.u,o.r,o.res);
      }}];
  }
  return t;
};

G.mix = (ph, it, hard) => {
  const isAdd = it ? ('a' in it) : Math.random()<.5;
  it = it || hardPick(hard||{}, isAdd?'add':'sub') || (isAdd ? draw('madd', ADD_ALL) : draw('msub', SUB_ALL));
  const o = isAdd ? addObj(it.a,it.b) : subObj(it.m,it.s);
  const t = mk('mix', 1, it); t.o = o;
  t.frames = isAdd ? [fr([['a',o.a]]), fr([['b',o.b]])] : [fr([['a',10]]), fr([['a',o.u]])];
  t.show = false;
  const K = isAdd ? addKit(t,o) : subKit(t,o);
  const rnd = Math.random();
  let form = rnd<.4 ? 'plain' : (rnd<.68 ? 'word' : 'miss');
  if(form==='miss') form = isAdd ? pick(['missR','missL']) : 'missS';
  t.form = form; t.chain = chainHTML(o,true);
  const sep = ' <span class="muted">·</span> ';
  let ans, instr = MX.result, ex = K.full;
  if(form==='missR'){ ans=o.b; instr=MX.hidden; t.big=()=>ca(o.a)+' + '+(t.done?cb(o.b):Q)+' = '+o.sum;
    ex = () => [
      {say:MX.exSeekR(o.a,o.sum)},
      {say:MX.exFromTo10(o.a,o.k), do:()=>{ t.hintChain = ca(o.a)+' + '+cb(o.k)+' = 10'; }},
      {say:MX.exFrom10(o.sum,o.r), do:()=>{ t.hintChain = ca(o.a)+' + '+cb(o.k)+' = 10'+sep+'10 + '+cb(o.r)+' = '+o.sum; }},
      {say:MX.exHiddenR(o.k,o.r,o.b)}
    ]; }
  else if(form==='missL'){ ans=o.a; instr=MX.hidden; t.big=()=>(t.done?ca(o.a):Q)+' + '+cb(o.b)+' = '+o.sum;
    const s2 = subObj(o.sum,o.b);
    ex = () => [
      {say:MX.exSeekL(o.b,o.sum), do:()=>{ t.hintChain = ca(o.sum)+' '+MINUS+' '+cb(o.b)+' = ?'; }},
      {say:MX.exTo10L(o.sum,s2.u), do:()=>{ t.hintChain = chainHTML(s2,false); }},
      {say:MX.exThenL(s2.r,o.a), do:()=>{ t.hintChain = chainHTML(s2,true); }},
      {say:MX.exHiddenA(o.a)}
    ]; }
  else if(form==='missS'){ ans=o.s; instr=MX.hidden; t.big=()=>ca(o.m)+' '+MINUS+' '+(t.done?cb(o.s):Q)+' = '+o.res;
    ex = () => [
      {say:MX.exSeekS(o.m,o.res)},
      {say:MX.exRemoved10(o.m,o.u), do:()=>{ t.hintChain = ca(o.m)+' '+MINUS+' '+cb(o.u)+' = 10'; }},
      {say:MX.exFrom10S(o.res,o.r), do:()=>{ t.hintChain = ca(o.m)+' '+MINUS+' '+cb(o.u)+' = 10'+sep+'10 '+MINUS+' '+cb(o.r)+' = '+o.res; }},
      {say:MX.exHiddenS(o.u,o.r,o.s)}
    ]; }
  else {
    ans = isAdd ? o.sum : o.res;
    t.big = () => isAdd ? ca(o.a)+' + '+cb(o.b)+' = '+(t.done?o.sum:Q) : ca(o.m)+' '+MINUS+' '+cb(o.s)+' = '+(t.done?o.res:Q);
    if(form==='word'){
      t.story = isAdd ? PH.wordAdd(o.a,o.b) : PH.wordSub(o.m,o.s); instr = MX.solve;
      ex = () => [{say: isAdd ? MX.exWordAdd(o.a,o.b) : MX.exWordSub(o.m,o.s)}, ...K.full().slice(1)];
    }
  }
  t.steps = [{kind:'num', instr, ans, ex,
    hint:lv=>{
      if(lv===1){
        if(form==='missR'){ t.hintChain = ca(o.a)+' + '+cb(o.k)+' = 10'+sep+'10 + '+cb(o.r)+' = '+o.sum; return MX.hintR; }
        if(form==='missL'){ const s2=subObj(o.sum,o.b); t.hintChain = chainHTML(s2,false); return MX.hintL(o.sum,o.b); }
        if(form==='missS'){ t.hintChain = ca(o.m)+' '+MINUS+' '+cb(o.u)+' = 10'+sep+'10 '+MINUS+' '+cb(o.r)+' = '+o.res; return MX.hintS; }
        t.hintChain = chainHTML(o,false);
        return isAdd ? MX.hintAdd : MX.hintSub;
      }
      if(form==='plain' || form==='word') t.show = true;
      if(form==='missR') return MX.revR(o.k,o.r,o.b);
      if(form==='missL') return MX.revL(o.sum,o.b,o.a);
      if(form==='missS') return MX.revS(o.u,o.r,o.s);
      t.hintChain = chainHTML(o,true);
      return MX.answer(ans);
    }}];
  return t;
};

/* диагностика: 10 заданий «в уме», стоп на первой ошибке */
function diagList(){
  const list = [];
  const add = (skill, item) => list.push({skill, item});
  add('to10', {n:rand(2,8), f:'plus', key:'d1'}); add('to10', {n:rand(2,8), f:'minus', key:'d2'});
  { const b=rand(5,9), k=rand(2,b-2); add('split', {b,k,key:'d3'}); } { const b=rand(5,9), k=rand(1,b-1); add('split', {b,k,key:'d4'}); }
  add('teen', {u:rand(2,8), f:'sum', key:'d5'}); add('teen', {u:rand(2,8), f:'part', key:'d6'});
  add('add', pick(ADD_ALL())); add('add', pick(ADD_ALL())); add('sub', pick(SUB_ALL())); add('sub', pick(SUB_ALL()));
  return list;
}

root.ENGINE = {SKILLS, SK, PHASES, phaseName, G, diagList, clearH, count, chainHTML, setLast:k=>{ lastKey=k; }, rand, pick, shuffle, ADD_ALL, SUB_ALL};
})(typeof window!=='undefined' ? window : globalThis);

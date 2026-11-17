/* Волна 1 библиотеки «Игры с числами»: «Две корзинки», «Сделай поровну», «Поезд чисел», «Сколько спряталось?».
   Чистые правила: без хранилища, таймеров, звука и движка обучения. Каждое действие несёт номер задания (round),
   поэтому двойное касание или старое нажатие после перехода ничего не меняет. */
(function(root){
  'use strict';
  const MAXQ=10;
  const GAMES=Object.freeze({
    'split-baskets':{name:'Две корзинки',skill:'Число из двух частей',intro:'Разложи все ягоды в две корзинки. Способов несколько — выбери свой.',
      levels:[['small','Ягод 3–5 · обе корзинки не пустые'],['big','Ягод 6–10 · можно и пустую'],['again','Другой способ · 6–9 ягод · три разных'],['order','Заказ друзьям · по списку']]},
    'equalize':{name:'Сделай поровну',skill:'Поровну: добавить или убрать',intro:'Сделай, чтобы в корзинках стало поровну.',
      levels:[['add','Только добавлять · до 6'],['choose','Добавить или убрать · до 10']]},
    'order-train':{name:'Поезд чисел',skill:'Порядок: меньше → больше',intro:'Расставь вагоны от меньшего числа к большему. Нажми на два вагона — они поменяются местами.',
      levels:[['small','3 вагона · 1–5'],['big','4 вагона · 0–10']]},
    'hidden-part':{name:'Сколько спряталось?',skill:'Целое и части',intro:'Часть ягод спряталась под листиком. Всего ягод столько, сколько написано. Сколько спряталось?',
      levels:[['small','Всего 3–5'],['big','Всего 6–10']]}
  });
  // Тексты на экране. Записей Дениса для них пока нет — они только показываются (см. evidence/claude-wave1-audio.json).
  const MSG=Object.freeze({
    table:'На столе ещё есть ягоды. Положи их в корзинки.',
    empty:'Пусть в каждой корзинке будет хотя бы одна ягода.',
    helpBaskets:'Клади ягоды по одной. Когда стол опустеет — нажми «Проверить».',
    moreLeft:'Слева пока больше. Сравни ягоды на одинаковых местах.',
    moreRight:'Справа пока больше. Сравни ягоды на одинаковых местах.',
    helpEqualAdd:'Сравни ягоды на одинаковых местах. Добавь туда, где места пустые.',
    helpEqualChoose:'Сравни ягоды на одинаковых местах. Можно добавить туда, где места пустые, или убрать лишние там, где больше.',
    limit:'Больше десяти не помещается.',
    keep:'Свои ягоды не убираем — только те, что ты добавил.',
    swap:'Вагоны пока не по порядку. Посмотри на подсвеченные: слева должно быть меньшее число.',
    helpTrain:'Под вагонами — числовая дорожка. Кто левее на дорожке, тот и меньше.',
    pick:'Выбран вагон. Нажми на другой — они поменяются местами.',
    hidden:'Пока не так. Посмотри: сколько видно и сколько всего. Досчитай от видимых до всего.',
    helpHidden:'Пустые кружки — места спрятанных ягод. Досчитай от видимых до всего.',
    same:'Так уже было. Найди другой способ — разложи иначе.',
    helpAgain:'Разложи все ягоды со стола: часть Бульку, часть Тестику. Такой пары ещё не должно быть.',
    helpOrder:'Сначала отсчитай первому другу ровно столько, сколько в заказе, — по одной. Остальные достанутся второму.'
  });
  function rnd(rng,n){const r=rng();if(!Number.isFinite(r)||r<0||r>=1)throw new RangeError('Invalid random source');return Math.floor(r*n);}
  function shuffle(a,rng){const o=a.slice();for(let i=o.length-1;i>0;i--){const j=rnd(rng,i+1);[o[i],o[j]]=[o[j],o[i]];}return o;}
  const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
  const sorted=a=>a.every((v,i)=>i===0||a[i-1]<v);

  /* ---------- банки заданий ---------- */
  function bank(game,level){
    if(!Object.hasOwn(GAMES,game)||!GAMES[game].levels.some(([id])=>id===level))throw new RangeError('Unknown game or level');
    if(game==='split-baskets'){
      if(level==='again')return range(6,9).map(total=>({id:game+'-again-'+total,total,allowZero:false,again:true})); // у каждого ≥3 разных разложения без нуля
      if(level==='order'){const out=[];for(const total of range(6,9))for(let need=1;need<total;need++)out.push({id:game+'-order-'+total+'-'+need,total,need,allowZero:false,order:true});return out;}
      return (level==='small'?range(3,5):range(6,10)).map(total=>({id:game+'-'+total,total,allowZero:level==='big'}));
    }
    if(game==='equalize'){
      const max=level==='add'?6:10,out=[];
      for(let a=1;a<=max;a++)for(let b=1;b<=max;b++){const d=Math.abs(a-b);if(d>=1&&d<=(level==='add'?3:4))out.push({id:game+'-'+a+'-'+b,left:a,right:b});}
      return out;
    }
    if(game==='hidden-part'){
      const out=[];for(const total of (level==='small'?range(3,5):range(6,10)))for(let hidden=1;hidden<total;hidden++)out.push({id:game+'-'+total+'-'+hidden,total,hidden});
      return out;
    }
    return [{id:game+'-'+level,count:level==='small'?3:4,lo:level==='small'?1:0,hi:level==='small'?5:10}];
  }
  function trainTask(spec,rng){
    const values=shuffle(range(spec.lo,spec.hi),rng).slice(0,spec.count).sort((a,b)=>a-b);
    let order=shuffle(values,rng),guard=0;while(sorted(order)&&guard++<20)order=shuffle(values,rng);
    if(sorted(order))order=values.slice().reverse();
    return {id:spec.id+'-'+values.join('.'),values,start:order};
  }
  function hiddenChoices(t,rng){
    const hi=t.total-1,lo=1;let a=Math.max(lo,Math.min(t.hidden-1,hi-2));const c=range(a,Math.min(hi,a+2));
    while(c.length<3&&c[0]>0)c.unshift(c[0]-1); // при всего 3 — варианты 0..2 не нужны: оставляем сколько есть, но не меньше двух
    return shuffle(c.filter(v=>v>=0),rng);
  }
  function pickQueue(game,level,rng){
    const pool=bank(game,level);
    if(game==='order-train')return [0,1,2].map(()=>trainTask(pool[0],rng));
    if(game==='split-baskets'&&level==='again'){ // одно целое — три разных способа подряд
      const t=shuffle(pool,rng)[0];return [0,1,2].map(i=>({...t,id:t.id+'-r'+(i+1)}));
    }
    if(game==='hidden-part'||(game==='split-baskets'&&level==='order')){ // три разных «всего», где возможно
      const by={};for(const t of shuffle(pool,rng))(by[t.total]=by[t.total]||[]).push(t);
      const totals=shuffle(Object.keys(by),rng);const q=[];for(let i=0;q.length<3;i++)q.push(by[totals[i%totals.length]][Math.floor(i/totals.length)]);
      return q.map(t=>game==='hidden-part'?{...t,choices:hiddenChoices(t,rng)}:{...t});
    }
    return shuffle(pool,rng).slice(0,3);
  }
  function roundState(s,round){
    const task=s.queue[round],base={...s,round,phase:'play',help:false,msg:'',wrong:0,task,sel:null};
    if(s.game==='split-baskets')return {...base,left:0,right:0};
    if(s.game==='equalize')return {...base,left:task.left,right:task.right};
    if(s.game==='order-train')return {...base,order:task.start.slice(),bad:null};
    return base;
  }
  function create(game,level,rng=Math.random){
    const queue=pickQueue(game,level,rng);
    return roundState({game,level,queue,results:[],errors:0},0);
  }

  /* ---------- проверка и ход ---------- */
  function success(s,extra){return {...s,phase:'success',msg:'',bad:null,sel:null,results:[...s.results,{id:s.task.id,wrong:s.wrong,supported:s.help,...extra}]};}
  function wrong(s,msg,extra){return {...s,msg,help:true,wrong:s.wrong+1,errors:s.errors+1,...(extra||{})};}
  const isInt=v=>Number.isInteger(v);
  function reduce(s,a){
    if(!s||!a||s.phase==='finish')return s;
    if(a.round!==s.round)return s;
    if(a.type==='next'){if(s.phase!=='success')return s;return s.round===s.queue.length-1?{...s,phase:'finish'}:roundState(s,s.round+1);}
    if(s.phase!=='play')return s;
    if(a.type==='help'){
      const msg=s.game==='split-baskets'?(s.task.again?'helpAgain':s.task.order?'helpOrder':'helpBaskets'):s.game==='equalize'?(s.level==='add'?'helpEqualAdd':'helpEqualChoose'):s.game==='order-train'?'helpTrain':'helpHidden';
      /* Ошибка уже ставит help. Повтор той же подсказки ничего не меняет.
         Остаток заказа открывает только helpOrder, не сам флаг help. */
      if(s.msg===msg)return s;
      return {...s,help:true,msg};
    }
    const side=a.side==='left'||a.side==='right'?a.side:null;
    if(s.game==='split-baskets'){
      const table=s.task.total-s.left-s.right;
      if(a.type==='put'&&side){if(table<=0)return s;return {...s,[side]:s[side]+1,msg:''};}
      if(a.type==='take'&&side){if(s[side]<=0)return s;return {...s,[side]:s[side]-1,msg:''};}
      if(a.type==='check'){
        if(table>0)return wrong(s,'table');
        if(!s.task.allowZero&&(s.left===0||s.right===0))return wrong(s,'empty');
        /* «Другой способ»: пара, совпадающая с уже собранной (в любом порядке
           корзинок), новым решением не считается. */
        if(s.task.again){
          const k=Math.min(s.left,s.right)+','+Math.max(s.left,s.right);
          if((s.task.prevPairs||[]).some(p=>Math.min(p[0],p[1])+','+Math.max(p[0],p[1])===k))return wrong(s,'same');
        }
        /* «Заказ друзьям»: первому — ровно по заказу, второму — точный остаток. */
        if(s.task.order&&s.left!==s.task.need)return wrong(s,'need');
        const ok=success(s,{parts:[s.left,s.right]});
        if(s.task.again&&s.round+1<ok.queue.length){
          const q=ok.queue.slice();
          q[s.round+1]={...q[s.round+1],prevPairs:[...(s.task.prevPairs||[]),[s.left,s.right]]};
          return {...ok,queue:q};
        }
        return ok;
      }
      return s;
    }
    if(s.game==='equalize'){
      if(a.type==='add'&&side){if(s[side]>=MAXQ)return {...s,msg:'limit'};return {...s,[side]:s[side]+1,msg:''};}
      if(a.type==='remove'&&side){
        const floor=s.level==='add'?s.task[side]:1;
        if(s[side]<=floor)return s.level==='add'?{...s,msg:'keep'}:s;
        return {...s,[side]:s[side]-1,msg:''};
      }
      if(a.type==='check'){
        if(s.left===s.right)return success(s,{from:[s.task.left,s.task.right],to:[s.left,s.right],removed:s.left<s.task.left||s.right<s.task.right});
        return wrong(s,s.left>s.right?'moreLeft':'moreRight');
      }
      return s;
    }
    if(s.game==='order-train'){
      if(a.type==='tap'){
        if(!isInt(a.index)||a.index<0||a.index>=s.order.length)return s;
        if(s.sel===null)return {...s,sel:a.index,msg:'pick',bad:null};
        if(s.sel===a.index)return {...s,sel:null,msg:''};
        const order=s.order.slice();[order[s.sel],order[a.index]]=[order[a.index],order[s.sel]];
        return {...s,order,sel:null,msg:'',bad:null};
      }
      if(a.type==='check'){
        if(sorted(s.order))return success(s,{order:s.order.slice()});
        const i=s.order.findIndex((v,k)=>k<s.order.length-1&&v>s.order[k+1]);
        return wrong(s,'swap',{bad:[i,i+1],sel:null});
      }
      return s;
    }
    if(s.game==='hidden-part'){
      if(a.type==='answer'){
        if(!isInt(a.value)||!s.task.choices.includes(a.value))return s;
        if(a.value===s.task.hidden)return success(s,{hidden:s.task.hidden});
        return wrong(s,'hidden');
      }
      return s;
    }
    return s;
  }
  function result(s){return {game:s.game,level:s.level,rounds:s.results.length,errors:s.results.reduce((n,r)=>n+r.wrong,0),supported:s.results.filter(r=>r.supported).length};}
  const api={GAMES,MSG,MAXQ,bank,create,reduce,result,sorted,hiddenChoices};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TEREM_NUMBER_PLAY=api;
})(typeof window!=='undefined'?window:globalThis);

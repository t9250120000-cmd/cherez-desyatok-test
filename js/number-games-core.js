/* Pure rules for optional number practice. No storage, clock, audio or engine. */
(function(root){
  'use strict';
  const catalog=Object.freeze({
    collect:{name:'Собери число',hero:'to10',skill:'Число → количество',intro:'Собери столько ягод, сколько написано в заказе.',help:'Добавляй или убирай по одной ягоде. Сравни с заказом.'},
    compare:{name:'Где больше?',hero:'split',skill:'Больше, меньше, поровну',intro:'Сравни две корзинки. Где ягод больше?',help:'Сравни ягоды парами. Где остались без пары — там больше.'},
    match:{name:'Найди число',hero:'add',skill:'Количество → число',intro:'Посчитай огоньки и найди их число.',help:'Считай огоньки по порядку. Последнее число — сколько их всего.'},
    house:{name:'Домик числа',hero:'teen',skill:'Дополняем до десяти',intro:'Засели пустые комнаты. В полном домике десять жителей.',help:'Нажимай на пустые комнаты. В каждом ряду пять мест.'},
    path:{name:'Дорожка Булька',hero:'see',skill:'Порядок чисел',intro:'На дорожке потерялось число. Найди его место.',help:'Каждый шаг вправо — на один больше.'}
  });
  const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
  function shuffle(items,rng){
    const out=items.slice();for(let i=out.length-1;i>0;i--){const r=rng();if(!Number.isFinite(r)||r<0||r>=1)throw new RangeError('Invalid random source');const j=Math.floor(r*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;
  }
  function bank(game,level){
    if(!Object.hasOwn(catalog,game)||!['first','next'].includes(level))throw new RangeError('Unknown game or level');
    const high=level==='next',max=high?10:5;
    if(game==='compare')return range(high?3:1,max).flatMap(left=>range(high?3:1,max).map(right=>({id:`compare-${level}-${left}-${right}`,left,right,answer:left===right?'equal':left>right?'left':'right'})));
    if(game==='house')return range(high?3:6,high?7:9).map(given=>({id:`house-${level}-${given}`,given,answer:10-given}));
    if(game==='path')return range(high?6:1,high?9:4).map(answer=>({id:`path-${level}-${answer}`,start:high?5:0,end:high?10:5,answer}));
    return range(high?6:1,max).map(answer=>({id:`${game}-${level}-${answer}`,answer}));
  }
  function choices(answer,max,rng){
    const low=Math.max(1,Math.min(answer-1,max-2));return shuffle(range(low,low+2),rng);
  }
  function roundState(s,round){
    const task=s.queue[round];return {...s,round,phase:'play',selected:[],help:false,message:'',task};
  }
  function create(game,level='first',rng=Math.random){
    const pool=bank(game,level);let queue;
    // Every comparison series includes left, right and equal, in varying order.
    if(game==='compare')queue=shuffle(['left','right','equal'].map(answer=>shuffle(pool.filter(t=>t.answer===answer),rng)[0]),rng);
    else queue=shuffle(pool,rng).slice(0,3);
    queue=queue.map(task=>({...task,choices:typeof task.answer==='number'?choices(task.answer,game==='house'?10:level==='next'?10:5,rng):['left','equal','right']}));
    return roundState({game,level,queue,results:[]},0);
  }
  function success(s){return {...s,phase:'success',message:'',results:[...s.results,{id:s.task.id,answer:s.task.answer,supported:s.help}]};}
  function hint(s){return s.game==='house'&&s.selected.length===s.task.answer?'Посчитай синих жителей. Именно их ты добавил.':catalog[s.game].help;}
  function reduce(s,a){
    if(a.round!==s.round||s.phase==='finish')return s;
    if(a.type==='next'&&s.phase==='success')return s.round===2?{...s,phase:'finish'}:roundState(s,s.round+1);
    if(s.phase!=='play')return s;
    if(a.type==='help')return {...s,help:true,message:hint(s)};
    if(a.type==='toggle'&&s.game==='collect'){
      if(!Number.isInteger(a.index)||a.index<0||a.index>=10)return s;
      const selected=s.selected.includes(a.index)?s.selected.filter(i=>i!==a.index):[...s.selected,a.index];return {...s,selected,message:''};
    }
    if(a.type==='place'&&s.game==='house'){
      if(!Number.isInteger(a.index)||a.index<s.task.given||a.index>=10||s.selected.includes(a.index))return s;
      return {...s,selected:[...s.selected,a.index],message:''};
    }
    if(a.type==='check'&&s.game==='collect'){
      if(s.selected.length===s.task.answer)return success(s);
      return {...s,help:true,message:s.selected.length<s.task.answer?'Пока меньше, чем в заказе. Добавь ягоды.':'Пока больше, чем в заказе. Нажми на лишние ягоды, чтобы убрать.'};
    }
    if(a.type==='answer'&&s.game!=='collect'){
      if(s.game==='house'&&s.selected.length!==s.task.answer)return s;
      if(!s.task.choices.includes(a.value))return s;
      if(a.value===s.task.answer)return success(s);
      return {...s,help:true,message:hint(s)};
    }
    return s;
  }
  const api={catalog,bank,create,reduce};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TEREM_NUMBER_GAMES=api;
})(typeof window!=='undefined'?window:globalThis);

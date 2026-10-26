/* Optional practice: no engine, storage, rewards, timers or network access. */
(function(root){
  'use strict';
  const plans={small:[1,2,3],large:[3,4,5]};
  function create(level='small'){
    if(!Object.hasOwn(plans,level))throw new RangeError('Unknown practice level');
    return {level,round:0,phase:'feed',fed:Array(plans[level][0]).fill(false),help:false,message:'',results:[]};
  }
  function target(s){return plans[s.level][s.round];}
  function reduce(s,a){
    // Each UI action belongs to a round. Old clicks cannot advance a new one.
    if(a.round!==s.round||s.phase==='finish')return s;
    if(a.type==='feed'&&s.phase==='feed'){
      if(!Number.isInteger(a.index)||a.index<0||a.index>=s.fed.length)return s;
      if(s.fed[a.index])return {...s,message:'У этого друга уже есть ягода. Найди пустую тарелку.'};
      const fed=s.fed.map((v,i)=>i===a.index||v);
      return {...s,fed,phase:fed.every(Boolean)?'count':'feed',message:''};
    }
    if(a.type==='help'&&['feed','count'].includes(s.phase))return {...s,help:true,message:s.phase==='feed'?'Нажми на пустую тарелку. Каждому — одна ягода.':'Посчитай ягоды по порядку. Последнее число — сколько их всего.'};
    if(a.type==='answer'&&s.phase==='count'){
      if(!Number.isInteger(a.value)||a.value<1||a.value>5)return s;
      if(a.value!==target(s))return {...s,help:true,message:'Давай посчитаем вместе. Посмотри на числа у ягод.'};
      return {...s,phase:'success',message:'',results:[...s.results,{quantity:target(s),supported:s.help}]};
    }
    if(a.type==='next'&&s.phase==='success'){
      if(s.round===2)return {...s,phase:'finish'};
      const round=s.round+1;
      return {...s,round,phase:'feed',fed:Array(plans[s.level][round]).fill(false),help:false,message:''};
    }
    return s;
  }
  const api={create,reduce,target};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.TEREM_FOUNDATIONS=api;
})(typeof window!=='undefined'?window:globalThis);

/* Eight optional number adventures. Pure rules; no engine, storage, audio or clock. */
(function(root){
  'use strict';
  const GAMES={
    'number-bus':{name:'Автобус Булька',skill:'Прибавить и убавить',intro:'Помоги пассажирам сесть или выйти. Потом посчитай, сколько осталось в автобусе.',levels:[['first','Пассажиры садятся'],['next','Пассажиры выходят']]},
    'ten-bridge':{name:'Мост через десяток',skill:'Сначала до десяти',intro:'Пересели слаймиков в первый домик, чтобы их стало десять. Остальные останутся во втором.',levels:[['first','С подсказкой до десяти'],['next','Сам найду недостающую часть']]},
    'tens-workshop':{name:'Мастерская десятков',skill:'Десять единиц — один десяток',intro:'Десять отдельных деталей можно собрать в один десяток и снова разобрать. Количество останется тем же.',levels:[['first','Собери десяток'],['next','Разбери десяток']]},
    'balance-sums':{name:'Весы равенства',skill:'Две равные суммы',intro:'Добавь недостающие кубики на правую чашу. На обеих чашах должно стать поровну.',levels:[['first','Суммы до 6'],['next','Суммы до 10']]},
    'repair-equation':{name:'Почини пример',skill:'Проверяем на предметах',intro:'Бульк перепутал ответ. Посчитай предметы и исправь число после знака равенства.',levels:[['first','Исправь сложение'],['next','Исправь вычитание']]},
    'picnic-stories':{name:'Пикник по заказу',skill:'История → действие',intro:'Прочитай историю вместе со взрослым. Выбери действие и приготовь нужное количество чашек.',levels:[['first','Гости приходят'],['next','Приходят или уходят']]},
    'unit-builder':{name:'Линейка строителя',skill:'Длина из одинаковых единиц',intro:'Построй дорожку точно до флажка. Сравни её с линейкой: одна клетка — одна единица.',levels:[['first','Плитки по одной'],['next','Плитки по одной и по две']]},
    'number-domino':{name:'Числовое домино',skill:'Одинаковое число в разных видах',intro:'Найди карточку, у которой слева столько же, сколько на конце дорожки. Карточки остаются открытыми.',levels:[['first','Число и точки'],['next','Число и сумма']]}
  };
  const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
  function random(rng,n){const r=rng();if(!Number.isFinite(r)||r<0||r>=1)throw new RangeError('Invalid random source');return Math.floor(r*n);}
  function shuffle(items,rng){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=random(rng,i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
  function bank(game,level){
    if(!Object.hasOwn(GAMES,game)||!['first','next'].includes(level))throw new RangeError('Unknown game or level');
    const next=level==='next',out=[];
    const push=t=>out.push({id:game+'-'+level+'-'+out.length,...t});
    if(game==='number-bus'||game==='repair-equation'||game==='picnic-stories'){
      const ops=game==='picnic-stories'&&next?['+','−']:[next?'−':'+'];
      for(const op of ops)for(let a=2;a<=7;a++)for(let b=1;b<=3;b++){
        const answer=op==='+'?a+b:a-b;if(answer<0)continue;
        /* Ошибка Булька не всегда «+1»: иначе любой пример чинится одним
           «−1» без счёта предметов. Направление и расстояние (1–2) заданы
           детерминированно от самого примера и держатся в пределах 0…10. */
        const dist=1+(a+b+(op==='−'?1:0))%2;
        let wrong=a%2===0?answer+dist:answer-dist;
        if(wrong>10)wrong=answer-dist;
        if(wrong<0)wrong=answer+dist;
        push({a,b,op,answer,wrong});
      }
    }else if(game==='ten-bridge'){
      for(let a=next?5:8;a<=9;a++)for(let b=11-a;b<=9;b++)push({a,b,answer:a+b,toTen:10-a});
    }else if(game==='tens-workshop'){
      for(let total=11;total<=20;total++)push({total,answer:next?total:total-10});
    }else if(game==='balance-sums'){
      for(let total=3;total<=(next?10:6);total++)for(let a=1;a<total;a++)for(let c=1;c<total;c++)push({a,b:total-a,c,total,answer:total-c});
    }else if(game==='unit-builder'){
      for(let answer=next?6:3;answer<=(next?10:5);answer++)push({answer});
    }else{
      for(let answer=next?2:1;answer<=(next?10:5);answer++)push({answer});
    }
    return out;
  }
  function options(n,max,rng){const lo=Math.max(0,Math.min(n-1,max-2));return shuffle(range(lo,lo+2),rng);}
  function create(game,level,rng=Math.random){
    const pool=bank(game,level);let queue=shuffle(pool,rng).slice(0,3);
    if(game==='number-domino'){
      const max=level==='next'?10:5;
      const ends=shuffle(range(level==='next'?2:1,max),rng).slice(0,4);
      queue=ends.slice(0,3).map((answer,i)=>({id:game+'-'+level+'-'+answer+'-'+ends[i+1],answer,next:ends[i+1],choices:options(answer,max,rng).map(value=>({value,a:Math.floor(value/2),b:value-Math.floor(value/2)}))}));
    }else queue=queue.map(t=>({...t,choices:options(t.answer,game==='ten-bridge'||game==='tens-workshop'?20:10,rng)}));
    return roundState({game,level,queue,results:[],chain:[],errors:0},0);
  }
  function roundState(s,round){const t=s.queue[round];return {...s,round,task:t,phase:'play',help:false,wrong:0,message:'',moved:0,exchanged:false,pieces:0,value:t.wrong??0,model:null,cups:t.a??0,tiles:[]};}
  function help(s){
    const t=s.task;
    switch(s.game){
      case 'number-bus':if(s.moved===t.b)return t.answer===0?'Автобус пустой. В нём ноль пассажиров.':t.op==='+'?'Все ожидающие пассажиры уже сели. Посчитай занятые места.':'Пассажиры уже вышли на остановке. Посчитай занятые места.';return t.op==='+'?'Посади каждого ожидающего пассажира. Потом посчитай занятые места.':'Высади столько пассажиров, сколько указано на остановке. Посчитай оставшихся.';
      case 'ten-bridge':return s.moved===t.toTen?'В первом домике уже десять. Посчитай жителей во втором и прибавь к десяти.':'В первом домике не хватает '+(t.toTen-s.moved)+'. Пересели ровно столько. Затем посчитай: десять и остаток.';
      case 'tens-workshop':if(s.exchanged)return s.level==='first'?'Десяток уже собран. Посчитай только отдельные детали рядом со связкой.':'Десяток уже разобран. Посчитай все детали.';return s.level==='first'?'В рамке десять деталей. Собери их вместе, затем посчитай отдельные детали.':'Разверни десяток. Посчитай: десять и ещё '+(t.total-10)+'. Вместе '+t.total+'.';
      case 'balance-sums':return 'Слева '+t.total+'. Справа уже '+t.c+'. Добавляй по одному и сравнивай обе чаши.';
      case 'repair-equation':return t.op==='+'?'Посчитай обе группы вместе. Измени только ответ.':'Зачёркнутые предметы убрали. Посчитай те, что остались.';
      case 'picnic-stories':return (t.b===1?'Гость ':'Гости ')+(t.op==='+'?(t.b===1?'пришёл':'пришли'):(t.b===1?'ушёл':'ушли'))+' — чашек понадобится '+(t.op==='+'?'больше. Добавь ':'меньше. Убери ')+t.b+' '+(t.b===1?'чашку':'чашки')+'.';
      case 'unit-builder':return 'Начало обеих дорожек — ноль. Заполняй клетки до флажка. Лишнюю плитку можно вернуть.';
      default:return 'На конце дорожки '+t.answer+'. Сравни это число с левой половиной каждой карточки.';
    }
  }
  function mistake(s,text){return {...s,help:true,wrong:s.wrong+1,errors:s.errors+1,message:text||help(s)};}
  function success(s){return {...s,phase:'success',message:'',chain:s.game==='number-domino'?[...s.chain,{from:s.task.answer,to:s.task.next}]:s.chain,results:[...s.results,{id:s.task.id,answer:s.task.answer,wrong:s.wrong,supported:s.help}]};}
  function ready(s){if(s.game==='number-bus')return s.moved===s.task.b;if(s.game==='ten-bridge')return s.moved===s.task.toTen;if(s.game==='tens-workshop')return s.exchanged;if(s.game==='picnic-stories')return s.model===s.task.op;return true;}
  function reduce(s,a){
    if(!s||!a||a.round!==s.round||s.phase==='finish')return s;
    if(a.type==='next')return s.phase==='success'?(s.round+1>=s.queue.length?{...s,phase:'finish'}:roundState(s,s.round+1)):s;
    if(s.phase!=='play')return s;
    if(a.type==='help')return {...s,help:true,message:help(s)};
    const t=s.task,g=s.game;
    if(g==='number-bus'||g==='ten-bridge'){
      const max=g==='number-bus'?t.b:t.toTen;
      if(a.type==='step'&&s.moved<max)return {...s,moved:s.moved+1,message:''};
      if(a.type==='undo'&&s.moved>0)return {...s,moved:s.moved-1,message:''};
    }
    if(g==='tens-workshop'&&a.type==='exchange'&&!s.exchanged)return {...s,exchanged:true,message:''};
    if(g==='balance-sums'){
      if(a.type==='add'&&s.pieces<10-t.c)return {...s,pieces:s.pieces+1,message:''};
      if(a.type==='remove'&&s.pieces>0)return {...s,pieces:s.pieces-1,message:''};
      if(a.type==='check')return s.pieces===t.answer?success(s):mistake(s,'На чашах пока разное количество. '+help(s));
    }
    if(g==='repair-equation'){
      if(a.type==='adjust'&&[-1,1].includes(a.delta)&&s.value+a.delta>=0&&s.value+a.delta<=10)return {...s,value:s.value+a.delta,message:''};
      if(a.type==='check')return s.value===t.answer?success(s):mistake(s);
    }
    if(g==='picnic-stories'){
      if(a.type==='model'&&s.model===null&&['+','−'].includes(a.value))return a.value===t.op?{...s,model:a.value,message:''}:mistake(s);
      if(s.model!==null){
        if(a.type==='add'&&s.cups<10)return {...s,cups:s.cups+1,message:''};
        if(a.type==='remove'&&s.cups>0)return {...s,cups:s.cups-1,message:''};
        if(a.type==='check')return s.cups===t.answer?success(s):mistake(s);
      }
    }
    if(g==='unit-builder'){
      const length=s.tiles.reduce((n,v)=>n+v,0),allowed=s.level==='first'?[1]:[1,2];
      if(a.type==='tile'&&allowed.includes(a.value)&&length+a.value<=10)return {...s,tiles:[...s.tiles,a.value],message:''};
      if(a.type==='undo'&&s.tiles.length)return {...s,tiles:s.tiles.slice(0,-1),message:''};
      if(a.type==='check')return length===t.answer?success(s):mistake(s,length<t.answer?'Дорожка ещё не дошла до флажка. Добавь плитку.':'Дорожка прошла флажок. Верни последнюю плитку.');
    }
    if(a.type==='answer'&&['number-bus','ten-bridge','tens-workshop','number-domino'].includes(g)&&ready(s)){
      const offered=g==='number-domino'?t.choices.map(c=>c.value):t.choices;
      if(!offered.includes(a.value))return s;
      return a.value===t.answer?success(s):mistake(s);
    }
    return s;
  }
  /* Заказ главы: два разных числа 11–20. Ребёнок сам собирает десяток
     (exchange) и называет остаток. Второе число приходит только после
     «следующее», это не копия первого. Хабовый create() не меняется. */
  function order(totals){
    if(!Array.isArray(totals)||totals.length!==2||new Set(totals).size!==2)throw new RangeError('Story order needs two different totals');
    const queue=totals.map(total=>{
      if(!Number.isInteger(total)||total<11||total>20)throw new RangeError('Total out of range');
      const answer=total-10;
      const choices=[answer-1,answer,answer+1].filter(n=>n>=0&&n<=9);
      return {id:'tens-workshop-order-'+total,total,answer,choices};
    });
    return roundState({game:'tens-workshop',level:'first',queue,results:[],chain:[],errors:0,story:true},0);
  }
  const result=s=>({game:s.game,level:s.level,rounds:s.results.length,errors:s.results.reduce((n,r)=>n+r.wrong,0),supported:s.results.filter(r=>r.supported).length});
  const api={GAMES,bank,create,reduce,ready,help,result,order};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TEREM_ADVENTURES=api;
})(typeof window!=='undefined'?window:globalThis);

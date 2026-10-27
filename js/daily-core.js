/* Дневная норма и текст отчёта родителю: чистые правила без хранилища, таймеров и сети. */
(function(root){
  'use strict';
  const DEF={on:true,goal:15,bonus:5,report:true};
  const clamp=(v,a,b,d)=>{v=Math.round(Number(v));return Number.isFinite(v)?Math.max(a,Math.min(b,v)):d;};
  function settings(s){s=Object.assign({},DEF,s||{});return {on:!!s.on,goal:clamp(s.goal,5,60,15),bonus:clamp(s.bonus,0,20,5),report:s.report!==false};}
  // Секунда засчитывается, только если ребёнок занимается: нужный экран, приложение на виду, касание не дольше минуты назад.
  const ACTIVE=new Set(['task','facts','talk','numberGames','foundations','senseGames','break']);
  function counts(st){return !!(st&&ACTIVE.has(st.screen)&&st.visible&&st.idleMs<60000&&!st.paused);}
  function progress(sec,goalMin){const goal=goalMin*60;return {sec,min:Math.floor(sec/60),goalMin,ratio:Math.min(1,sec/goal),done:sec>=goal};}
  const SKILL={see:'Сколько слаймиков',to10:'Дружные с 10',split:'Разбей число',teen:'Десяток и ещё',add:'Плюс через 10',sub:'Минус через 10',mix:'В уме'};
  const PHASE=['руками','по картинке','в уме'];
  const GAME={race:'Слаймовая дорожка',triple:'Собери тройку',collect:'Собери число',compare:'Где больше?',match:'Найди число',house:'Домик числа',path:'Дорожка Булька',feed:'Угости друзей'};
  const pretty=k=>String(k).replace('-',' − ').replace('+',' + ');
  const pct=(a,b)=>b?Math.round(a/b*100):0;
  /* r: {name,date,sec,goalMin,goalDone,day:{tasks,clean,coins},skill,phase,tasks:[записи журнала за день],fatigue:[...],games:[...],facts:{known,new}} */
  function report(r){
    const L=[],min=Math.round((r.sec||0)/60),d=r.day||{tasks:0,clean:0,coins:0};
    L.push('«Через десяток» · '+r.name+' · '+r.date);
    L.push('Занимался: '+min+' мин'+(r.goalMin?' из '+r.goalMin+(r.goalDone?' — норма выполнена ✅':''):''));
    if(d.tasks)L.push('Заданий: '+d.tasks+', без ошибок '+d.clean+' ('+pct(d.clean,d.tasks)+'%). Монеток +'+(d.coins||0)+'.');
    else L.push('Заданий основной программы сегодня не было.');
    if(r.skill)L.push('Сейчас учит: '+(SKILL[r.skill]||r.skill)+(r.skill==='mix'?'':' — '+(PHASE[(r.phase||1)-1]||'')));
    const tasks=r.tasks||[];
    if(tasks.length){
      const keys={};let nl=0,ex=0;
      for(const t of tasks){if(t.w>0&&t.key)keys[t.key]=(keys[t.key]||0)+t.w;nl+=t.nl?1:0;ex+=t.ex?1:0;}
      const hard=Object.entries(keys).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k])=>pretty(k));
      if(hard.length)L.push('Трудно: '+hard.join(', '));
      const help=[];if(nl)help.push('числовая прямая '+nl);if(ex)help.push('разбор по шагам '+ex);
      if(help.length)L.push('Подсказки: '+help.join(', '));
    }
    if((r.fatigue||[]).length)L.push('Перерывов из-за усталости: '+r.fatigue.length);
    const games=r.games||[];
    if(games.length){const by={};for(const g of games){const x=by[g.game]||(by[g.game]={n:0,e:0});x.n++;x.e+=g.errors||0;}
      L.push('Игры с числами: '+Object.entries(by).map(([g,x])=>(GAME[g]||g)+(x.n>1?' ×'+x.n:'')+(x.e?' (ошибок '+x.e+')':'')).join(', '));}
    if(r.facts&&(r.facts.known||r.facts.new))L.push('Копилка фактов: знает '+r.facts.known+(r.facts.new?', новых сегодня '+r.facts.new:''));
    return L.join('\n');
  }
  const api={DEF,settings,counts,progress,report,ACTIVE};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TEREM_DAILY=api;
})(typeof window!=='undefined'?window:globalThis);

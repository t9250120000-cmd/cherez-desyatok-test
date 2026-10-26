/* Наблюдения для родителя: чистые правила без хранилища, звука и движка.
   Роль шага, сводка трудностей за период, признаки усталости и советы для игры за столом.
   Это наблюдения за игрой, а не диагностика. */
(function(root){
  'use strict';
  const ROLE_NAMES={
    toTen:{add:'сколько не хватает до 10',sub:'сколько убрать, чтобы осталось 10'},
    rest:{add:'на какие части разбить второе число',sub:'сколько ещё убрать после 10'},
    total:{add:'10 и остаток: сколько всего',sub:'сколько осталось'},
    whole:{add:'весь пример в уме',sub:'весь пример в уме',mix:'пример в уме'},
    answer:{}
  };
  const SKILL_NAMES={see:'Сколько слаймиков',to10:'Дружные с 10',split:'Разбей число',teen:'Десяток и ещё',add:'Плюс через 10',sub:'Минус через 10',mix:'В уме'};
  const GAME_NAMES={race:'Слаймовая дорожка',triple:'Собери тройку',collect:'Собери число',compare:'Где больше?',match:'Найди число',house:'Домик числа',path:'Дорожка Булька',feed:'Угости друзей'};

  // Какой шаг стратегии «через десяток» сейчас решается. si — номер шага в задании.
  function role(skill,ph,si){
    if(skill==='mix')return 'whole';
    if(skill==='add'){
      if(ph===3)return 'whole';
      if(ph===2)return ['toTen','rest','total'][si]||'total';
      return si<=1?'rest':'total';           // руками: шаг 0 — переселение (действие), 1 — остаток, 2 — итог
    }
    if(skill==='sub'){
      if(ph===3)return 'whole';
      if(ph===2)return ['toTen','rest','total'][si]||'total';
      return 'total';
    }
    return 'answer';
  }
  function roleName(r,skill){const n=ROLE_NAMES[r]||{};return n[skill]||n.add||'ответ';}

  const day=ms=>{const d=new Date(ms);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  function emptyProfile(){return {tasks:[],fatigue:[],games:[]};}
  const CAPS={tasks:400,fatigue:80,games:150};
  function push(prof,list,item){prof[list].push(item);if(prof[list].length>CAPS[list])prof[list].splice(0,prof[list].length-CAPS[list]);return prof;}

  // Запись одного задания из объекта задания игры (поля движка не меняются, читаются).
  function taskRecord(t,ctx){
    const wr={};let total=0;
    for(const k of Object.keys(t._ins&&t._ins.wr||{})){wr[k]=t._ins.wr[k];total+=wr[k];}
    return {at:ctx.now,sk:t.skill,ph:t.ph,key:t.item&&t.item.key||t.key||'',wr,w:total,nl:t._ins&&t._ins.nl?1:0,ex:t._ins&&t._ins.ex||0,
      sec:Math.max(0,Math.min(600,Math.round((ctx.now-(t.startAt||ctx.now))/1000))),clean:t.clean?1:0,pos:ctx.pos,len:ctx.len,focus:ctx.focus?1:0};
  }

  // Предложить перерыв? recent — записи заданий текущей серии (последние в конце).
  function fatigueSignal(recent,opts){
    opts=opts||{};const last=recent.slice(-3);
    if(last.length>=2&&last.reduce((a,r)=>a+(r.w||0),0)>=3)return 'errors';
    if(last.length>=2&&last.filter(r=>r.ex>0).length>=2)return 'errors';
    if(last.length&&last[last.length-1].sec>=(opts.slowSec||120))return 'slow';
    return null;
  }

  function summarize(prof,now,days){
    days=days||14;const from=now-days*864e5;
    const tasks=(prof&&prof.tasks||[]).filter(r=>r.at>=from);
    const fatigue=(prof&&prof.fatigue||[]).filter(r=>r.at>=from);
    const games=(prof&&prof.games||[]).filter(r=>r.at>=from);
    const s={days,n:tasks.length,clean:0,nl:0,ex:0,secs:[],bySkill:{},keys:{},half:{first:[0,0],second:[0,0]},mind:{n:0,nl:0,wrong:0,secs:[]},
      fatigue:{n:fatigue.length,errors:0,slow:0,pause:0,stopped:0},games:{},slow:0};
    for(const r of tasks){
      s.clean+=r.clean;s.nl+=r.nl;s.ex+=r.ex?1:0;s.secs.push(r.sec);if(r.sec>=90)s.slow++;
      const b=s.bySkill[r.sk]||(s.bySkill[r.sk]={n:0,clean:0,w:0,roles:{},phases:{}});
      b.n++;b.clean+=r.clean;b.w+=r.w;b.phases[r.ph]=(b.phases[r.ph]||0)+1;
      for(const k of Object.keys(r.wr||{}))b.roles[k]=(b.roles[k]||0)+r.wr[k];
      if(r.key&&r.w>0){const k=s.keys[r.key]||(s.keys[r.key]={key:r.key,w:0,n:0});k.w+=r.w;k.n++;}
      if(r.len>=4){const h=r.pos<r.len/2?s.half.first:s.half.second;h[0]++;if(!r.clean)h[1]++;}
      if(r.ph===3&&['add','sub'].includes(r.sk)||r.sk==='mix'){s.mind.n++;s.mind.nl+=r.nl;s.mind.wrong+=r.clean?0:1;s.mind.secs.push(r.sec);}
    }
    for(const f of fatigue){if(s.fatigue[f.reason]!=null)s.fatigue[f.reason]++;if(f.choice==='stop')s.fatigue.stopped++;}
    for(const g of games){const x=s.games[g.game]||(s.games[g.game]={plays:0,rounds:0,errors:0,supported:0,levels:{}});x.plays++;x.rounds+=g.rounds||0;x.errors+=g.errors||0;x.supported+=g.supported||0;x.levels[g.level]=(x.levels[g.level]||0)+1;}
    const med=a=>{if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};
    s.medianSec=med(s.secs);s.mind.medianSec=med(s.mind.secs);delete s.secs;delete s.mind.secs;
    s.hard=Object.values(s.keys).sort((a,b)=>b.w-a.w||b.n-a.n).slice(0,6);delete s.keys;
    const rate=h=>h[0]?h[1]/h[0]:0;s.half.firstRate=rate(s.half.first);s.half.secondRate=rate(s.half.second);
    return s;
  }

  // Главная трудность в навыках «через десяток»: какой шаг даёт больше всего ошибок.
  function weakStep(s){
    const tot={toTen:0,rest:0,total:0,whole:0};let sum=0;
    for(const sk of ['add','sub','mix']){const b=s.bySkill[sk];if(!b)continue;for(const k of Object.keys(tot)){tot[k]+=b.roles[k]||0;sum+=b.roles[k]||0;}}
    if(sum<3)return null;
    const top=Object.keys(tot).sort((a,b)=>tot[b]-tot[a])[0];
    return tot[top]/sum>=0.4?{role:top,wrongs:tot[top],share:tot[top]/sum}:null;
  }

  function advice(s){
    const out=[];
    if(s.n<5&&!Object.keys(s.games).length){out.push({id:'more',title:'Пока мало наблюдений',text:'Советы появятся после двух-трёх серий заданий. Для начала достаточно 5–10 минут в день.'});return out;}
    const ws=weakStep(s);
    if(ws&&ws.role==='toTen')out.push({id:'toTen',title:'Состав числа 10',text:'Больше всего ошибок на шаге «сколько до 10». За столом: нарисуйте теремок из 10 клеток (2 ряда по 5) и кладите фишки двух цветов. «Здесь 7. Сколько не хватает до 10?» Сначала с фишками, потом закрыв часть ладонью. 3–5 минут, 5–6 вопросов.'});
    if(ws&&ws.role==='rest')out.push({id:'rest',title:'Разбить число на части',text:'Чаще всего трудно разбить второе число: «5 — это 2 и ещё 3». Разложите 5 фишек и разделите их карандашом на две кучки. Пусть ребёнок назовёт обе части вслух. Потом то же с 6, 7, 8.'});
    if(ws&&ws.role==='total')out.push({id:'total',title:'«10 и ещё»',text:'Трудно сказать, сколько получится из 10 и остатка. Используйте пучок из 10 палочек (или монету 10 ₽) и отдельные палочки: «10 и 3 — это 13». Называйте число и показывайте его на дорожке 0–20.'});
    if(ws&&ws.role==='whole')out.push({id:'whole',title:'Опора перед глазами',text:'Ошибки в основном в счёте в уме. Это нормально для перехода: верните на время опору — бумажный теремок или дорожку 0–20 на столе. Попросите проговаривать шаги вслух: «8 и 2 — это 10, и ещё 3 — 13».'});
    if(s.mind.n>=5&&s.mind.nl/s.mind.n>=0.3)out.push({id:'line',title:'Дорожка 0–20',text:'Ребёнок часто открывает числовую прямую. Нарисуйте дорожку 0–20 на полоске бумаги или скотчем на полу и прыгайте: «от 8 до 10 — два прыжка, дальше ещё три». Отметьте 10 ярким цветом.'});
    if(s.half.first[0]>=5&&s.half.second[0]>=5&&s.half.secondRate-s.half.firstRate>=0.2)out.push({id:'tail',title:'Ошибки к концу серии',text:'Во второй половине серии ошибок заметно больше, чем в первой. Попробуйте серии короче (4–5 заданий) и включите режим «Спокойный фокус» в Настройках: он предлагает перерыв с движением.'});
    if(s.fatigue.n>=3)out.push({id:'fatigue',title:'Перерывы',text:'Игра предлагала перерыв '+s.fatigue.n+' раз за '+s.days+' дней. Лучше заниматься понемногу и в одно и то же время, когда ребёнок не голоден и не устал. 2 коротких подхода по 5 минут полезнее одного длинного.'});
    if(s.mind.n>=5&&s.mind.medianSec>=40)out.push({id:'slow',title:'Медленный темп — это нормально',text:'Обычно на пример в уме уходит больше 40 секунд. Не торопите: таймеры в основной игре отсутствуют, важна точность. Скорость придёт после того, как шаги станут привычными.'});
    if(s.n>=5&&s.ex/s.n>=0.3)out.push({id:'explain',title:'Разбор помогает',text:'Ребёнок часто слушает разбор по шагам. После занятия попросите его самого объяснить один пример — тем же порядком, на бумажном теремке.'});
    if(s.hard.length)out.push({id:'cards',title:'Карточки трудных примеров',text:'Напишите на карточках: '+s.hard.slice(0,4).map(h=>pretty(h.key)).join(', ')+'. 2–3 карточки в день вперемешку с уже лёгкими примерами (на одну трудную — две лёгкие).'});
    const race=s.games.race;if(race&&race.plays>=1&&race.supported>=2)out.push({id:'board',title:'Настольная игра с дорожкой',text:'В «Слаймовой дорожке» ребёнок часто смотрит шаги по одному. Поиграйте дома в любую игру с кубиком на прямой дорожке с числами 1–20 и называйте клетку, куда придёт фишка, прежде чем ходить.'});
    const tri=s.games.triple;if(tri&&tri.errors>=3)out.push({id:'words',title:'Число, слово и количество',text:'Есть путаница между записью числа, словом и количеством. Сделайте три набора карточек (цифра, слово, точки) для 1–10 и собирайте «тройки». Особенно: 12 и 20, 7 и 17.'});
    if(!out.length)out.push({id:'fine',title:'Заметных трудностей нет',text:'Продолжайте в том же темпе: коротко и регулярно. Хвалите за усилие и за объяснение решения, а не только за верный ответ.'});
    return out;
  }
  function pretty(k){return String(k).replace('-',' − ').replace('+',' + ');}

  function reportText(name,s,adv){
    const lines=['Наблюдения за игрой «Через десяток» — '+name,'Период: последние '+s.days+' дней. Заданий: '+s.n+(s.n?', без ошибок: '+Math.round(s.clean/s.n*100)+'%':'')+'.'];
    if(s.n)lines.push('Обычное время на задание: '+s.medianSec+' с. Числовая прямая: '+s.nl+' раз. Разбор по шагам: '+s.ex+' заданий. Предложено перерывов: '+s.fatigue.n+'.');
    for(const sk of Object.keys(s.bySkill)){const b=s.bySkill[sk];const roles=Object.keys(b.roles).filter(r=>b.roles[r]>0).map(r=>roleName(r,sk)+' — '+b.roles[r]);lines.push((SKILL_NAMES[sk]||sk)+': '+b.n+' зад., без ошибок '+b.clean+(roles.length?'; ошибки: '+roles.join(', '):''));}
    if(s.hard.length)lines.push('Трудные примеры: '+s.hard.map(h=>pretty(h.key)+' ('+h.w+')').join(', '));
    for(const g of Object.keys(s.games)){const x=s.games[g];lines.push((GAME_NAMES[g]||g)+': '+x.plays+' игр, ошибок '+x.errors+', с подсказкой '+x.supported);}
    lines.push('','Советы:');adv.forEach(a=>lines.push('— '+a.title+'. '+a.text));
    lines.push('','Это наблюдения за игрой, а не диагноз.');
    return lines.join('\n');
  }

  const api={role,roleName,day,emptyProfile,push,taskRecord,fatigueSignal,summarize,weakStep,advice,reportText,pretty,SKILL_NAMES,GAME_NAMES,CAPS};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TEREM_INSIGHTS=api;
})(typeof window!=='undefined'?window:globalThis);

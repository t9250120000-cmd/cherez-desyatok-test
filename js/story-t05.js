/* «Большой день» — глава T05 (Облачный остров, Фея Капелька).
   Вызов: index.html после story-t04.js. Файл уже есть, это возврат r43.
   Журнал terem_insights_v1 через logGame. E1–E3 — занятия add той же оболочки.
   Повтор нижней фазы: S.replayPhase, навык не понижается.
   E4 — ten-bridge origin story-t05-4. 16 мест не стираются. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext;
  if(!app||!ext)return;
  const PH=root.PH,CH=root.CH;
  const REQ={1:1,2:2,3:3};
  const BANK=[[8,5],[7,6],[9,4],[6,7],[8,6]];
  const NEXT=[[9,8],[8,9],[9,7],[7,9],[6,9]];
  const EP={
    1:{name:'Сначала до десяти', what:'Перенеси из второй группы только тех, кому хватает места в первом доме. Лишних можно вернуть.'},
    2:{name:'Что осталось?', what:'По двум группам пойми, сколько останется после полного десятка.'},
    3:{name:'Без переселения', what:'Новый пример. Модель — только если попросить.'},
    4:{name:'Ещё гости', what:'Новая группа приходит на готовую площадку. Собери десяток, назови итог и рассади гостей.'}
  };
  function yardSeats(){
    const g=journal().games;
    const e3=g.filter(x=>x.game==='story-t04-3'); const e3l=e3.length?e3[e3.length-1]:null;
    if(!e3l)return 16;
    const y13=g.filter(x=>x.game==='tens-workshop'&&x.origin==='story-t04-4'&&x.level==='yard-13'&&x.at>e3l.at);
    const a=y13.length?y13[y13.length-1]:null;
    if(!a)return 16;
    const y16=g.filter(x=>x.game==='tens-workshop'&&x.origin==='story-t04-4'&&x.level==='yard-16'&&x.at>a.at);
    const b=y16.length?y16[y16.length-1]:null;
    if(!b)return 16;
    return g.some(x=>x.game==='tens-workshop'&&x.origin==='story-t04-4'&&x.level==='yard-19'&&x.at>b.at)?19:16;
  }
  function journal(){
    const I=root.__insights, p=I&&I.prof&&I.prof();
    return p&&Array.isArray(p.games)&&Array.isArray(p.tasks)?p:{games:[],tasks:[]};
  }
  function entries(ep){ return journal().games.filter(g=>g.game==='story-t05-'+ep); }
  function addPhase(){ const p=app.P(); const st=p&&p.skills&&p.skills.add; return st?(st.done?3:st.phase):1; }
  function pid(){ return (app.P()&&app.P().id)||''; }
  function lesson(ep){
    const credit=lastEntry(ep);
    const slot='t05-lesson-'+pid()+'-'+ep;
    const rows=journal().games.filter(g=>g.origin==='story-t05-lesson'&&g.ep===ep&&g.pid===pid()&&g.item&&g.item.key&&(g.slot===slot||!g.slot)&&(!credit||g.since>credit.at));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayTry(ep, level){
    const slot='t05-replay-try-'+pid()+'-'+ep;
    const rows=journal().games.filter(g=>g.origin==='story-t05-replay-draft'&&g.slot===slot&&g.pid===pid()&&g.ep===ep&&(!level||g.level===level));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayWaiting(ep){
    const row=replayTry(ep,'closed');
    if(!row)return null;
    return journal().games.some(g=>g.origin==='story-t05-replay'&&g.ep===ep&&g.since===row.since)?null:row;
  }
  let active=null;
  function lastEntry(ep){ const l=entries(ep); return l.length?l[l.length-1]:null; }
  function fact(level, afterAt){
    const l=journal().games.filter(g=>g.game==='ten-bridge'&&g.origin==='story-t05-4'&&g.level===level&&g.at>afterAt);
    return l.length?l[l.length-1]:null;
  }
  function step10(after){ return after?fact('meet-10',after.at):null; }
  function stepGuests(step){ return step?fact('meet-guests',step.at):null; }
  function proven(after){
    const raw=stepGuests(step10(after));
    if(!raw)return null;
    const credit=entries(4).filter(g=>g.level==='meet-guests'&&g.at>raw.at);
    return credit.length?credit[credit.length-1]:null;
  }
  function derive(){ return {1:lastEntry(1),2:lastEntry(2),3:lastEntry(3),4:proven(lastEntry(3))}; }
  function t04Done(){
    const g=journal().games;
    const e3=g.filter(x=>x.game==='story-t04-3'); const e3l=e3.length?e3[e3.length-1]:null;
    if(!e3l)return false;
    const y13=g.filter(x=>x.game==='tens-workshop'&&x.origin==='story-t04-4'&&x.level==='yard-13'&&x.at>e3l.at);
    const a=y13.length?y13[y13.length-1]:null;
    if(!a)return false;
    const y16=g.filter(x=>x.game==='tens-workshop'&&x.origin==='story-t04-4'&&x.level==='yard-16'&&x.at>a.at);
    const b=y16.length?y16[y16.length-1]:null;
    if(!b)return false;
    return g.some(x=>x.game==='story-t04-4'&&(x.level==='yard-16'||x.level==='yard-19')&&x.at>b.at);
  }
  function orderTally(){
    const a=step10(lastEntry(3)), b=stepGuests(a);
    if(!a||!b)return null;
    return {rounds:2,errors:(a.errors|0)+(b.errors|0),supported:(a.supported|0)+(b.supported|0),guests:b.guests|0,seats:b.seats|0};
  }
  function islandLocked(){
    const p=app.P(), s=app.E.SK.add;
    return !!(p&&s&&app.E.SK[p.cur]&&app.E.SK[p.cur].n<s.n&&!(p.skills.add&&p.skills.add.done));
  }
  function sceneDone(){ return stepGuests(step10(lastEntry(3))); }
  function anchorAt(){
    const e3=lastEntry(3), s10=step10(e3);
    return s10?s10.at:(e3?e3.at:0);
  }
  function latestDraft(goal){
    const l=journal().games.filter(g=>g.game==='ten-bridge'&&g.origin==='story-t05-4'&&g.level==='draft'&&g.at>anchorAt()&&(!goal||g.goal===goal));
    return l.length?l[l.length-1]:null;
  }
  function pair(which){
    const done=journal().games.filter(g=>g.game==='story-t04-4'&&(g.level==='yard-16'||g.level==='yard-19'));
    const at=done.length?done[done.length-1].at:0;
    const i=Math.abs(at|0)%BANK.length;
    return which==='grow'?NEXT[i]:BANK[i];
  }
  let hand={moved:0,took:0,sum:0,cups:0,extra:0,errors:0,help:false,ok:false,goal:'',a:0,b:0,msg:'',stamp:''};
  function stage(){
    const e3=lastEntry(3);
    if(!e3||derive()[4])return 'done';
    if(sceneDone())return 'tell';
    if(step10(e3)){
      const d=latestDraft();
      if(d&&d.goal==='seat')return 'seat';
      return 'grow';
    }
    return 'build';
  }
  function syncHand(){
    const st=stage();
    if(st!=='build'&&st!=='grow'&&st!=='seat'){hand.stamp='';return;}
    const stamp=pid()+'|'+anchorAt()+'|'+st;
    if(hand.stamp===stamp)return;
    const d=latestDraft();
    const base=pair(st==='build'?'build':'grow');
    if(d&&(d.goal===st||(st==='grow'&&d.goal==='grow')||(st==='seat'&&d.goal==='seat'))){
      hand={moved:d.moved|0,took:d.took|0,sum:d.sum|0,cups:d.cups|0,extra:d.extra|0,errors:d.errors|0,help:!!d.supported,ok:!!d.checked,goal:d.goal,a:d.a|0,b:d.b|0,msg:d.checked?'Проверено. Можно продолжить.':'',stamp};
    }else hand={moved:0,took:0,sum:0,cups:0,extra:0,errors:0,help:false,ok:false,goal:st,a:base[0],b:base[1],msg:'',stamp};
  }
  function saveDraft(){
    if(!root.__insights||!hand.goal)return;
    root.__insights.logGame({game:'ten-bridge',origin:'story-t05-4',level:'draft',slot:'t05-e4-'+pid(),rounds:0,errors:hand.errors,supported:hand.help?1:0,moved:hand.moved,took:hand.took,sum:hand.sum,cups:hand.cups,extra:hand.extra,goal:hand.goal,a:hand.a,b:hand.b,checked:hand.ok?1:0});
  }
  function dots(n,cls){ return Array.from({length:Math.max(0,n)},()=>'<i class="story-piece '+cls+'"></i>').join(''); }
  function frame(){
    const inside=Math.min(10,hand.a+hand.moved);
    const extra=Math.max(0,hand.a+hand.moved-10);
    const rooms=Array.from({length:10},(_,i)=>{
      const on=i<inside, settled=on&&i<hand.a, fresh=on&&i>=hand.a;
      return '<i class="story-piece seat'+(on?' on':'')+(settled?' set':'')+(fresh?' now':'')+'"></i>';
    }).join('');
    const fairy=CH?CH.pal('add','story-court-king','Капелька'):'';
    return '<div class="story-ground"><span class="story-court-king">'+fairy+'</span><div class="story-pile"><p class="story-role">Дом, пять и пять</p><div class="story-bundle'+(inside===10?' full':'')+'" role="img" aria-label="Первый дом: '+inside+' из 10">'+rooms+'</div><p class="story-role">Лишние</p><div class="story-loose" role="img" aria-label="Лишние у дома: '+extra+'">'+dots(extra,'guest2')+'</div><p class="story-role">Ещё не перенесены</p><div class="story-loose" role="img" aria-label="Вторая группа: '+(hand.b-hand.moved)+'">'+dots(hand.b-hand.moved,'guest')+'</div></div></div>';
  }
  function groups(a,b,whoA,whoB){
    return '<div class="story-pile"><p class="story-role">'+whoA+'</p><div class="story-bundle" role="img" aria-label="'+whoA+' '+a+'">'+dots(a,'guest')+'</div><p class="story-role">'+whoB+'</p><div class="story-loose" role="img" aria-label="'+whoB+' '+b+'">'+dots(b,'guest2')+'</div></div>';
  }
  function chain(name,fn){
    const prev=ext.hooks[name];
    ext.hooks[name]=function(...args){
      let out=''; try{ out=prev?prev.apply(this,args)||'':''; }catch(e){ out=''; }
      let mine=''; try{ mine=fn.apply(this,args)||''; }catch(e){ mine=''; }
      return out+mine;
    };
  }
  const BTN='<button type="button" class="btn" data-act="';
  function needOf(a){ return 10-a; }
  function seatGap(){
    const guests=hand.a+hand.b, seats=yardSeats()+hand.extra;
    return {guests,seats,base:yardSeats(),extra:hand.extra|0,free:Math.max(0,seats-guests),noSeat:Math.max(0,guests-seats),lack:Math.max(0,guests-hand.cups),over:Math.max(0,hand.cups-guests)};
  }
  function helpText(){
    if(hand.goal==='seat'){
      const g=seatGap();
      let t='Король приготовил '+g.base+' мест.';
      if(g.extra)t+=' Ты добавил ещё '+g.extra+'. Вместе '+g.seats+'.';
      t+=' Гостей '+g.guests+'.';
      if(g.noSeat)t+=' Без места: '+g.noSeat+'. Место добавляй, только если свободных не осталось.';
      else t+=' Свободных мест: '+g.free+'. Пустые можно не занимать.';
      if(g.lack)t+=' Угощений не хватает: '+g.lack+'. Поставь ещё.';
      else if(g.over)t+=' Лишних угощений: '+g.over+'. Убери.';
      else t+=' Угощений столько же, сколько гостей.';
      return t+' Число само не подставится.';
    }
    if(hand.goal==='grow')return 'До десяти от '+hand.a+' не хватает '+(10-hand.a)+'. Вместе должно быть '+(hand.a+hand.b)+'. Ответ сам не встанет.';
    return 'В первом доме уже '+hand.a+'. До десяти не хватает '+(10-hand.a)+'. Из группы '+hand.b+' перенеси '+(10-hand.a)+', остальные остаются.';
  }
  function miss(){
    hand.ok=false; hand.errors++; if(hand.errors>=2)hand.help=true;
    const need=needOf(hand.a);
    const guests=hand.a+hand.b, seats=yardSeats()+hand.extra, have=hand.goal==='grow'?hand.took:hand.moved;
    const first=hand.goal==='seat'
      ?(hand.cups>guests?'Пока не сходится. Лишнее угощение можно убрать.'
        :hand.cups<guests?'Пока не сходится. Угощений не хватает: '+(guests-hand.cups)+'. Поставь ещё.'
        :seats<guests?'Пока не сходится. Мест не хватает: '+(guests-seats)+'. Добавь место.'
        :'Пока не сходится.')
      :(have>need?'Пока не сходится. Лишних можно вернуть.'
        :have<need?'Пока не сходится. До десяти не хватает '+(need-have)+'.'
        :'Пока не сходится. Вместе должно быть '+(hand.a+hand.b)+'.');
    hand.msg=hand.errors>=2?(hand.goal==='seat'?helpText():'В первом доме уже '+hand.a+'. До десяти не хватает '+need+'. Из группы '+hand.b+' перенеси '+need+', остальные остаются. Сейчас перенесено '+hand.moved+', названо вместе '+hand.sum+'.'):first;
  }
  function builder(){
    syncHand();
    const tone=hand.ok?' is-ready':hand.msg.includes('не сходится')?' is-wrong':(hand.msg.includes('Число само')||hand.msg.includes('Ответ сам')||hand.msg.includes('остальные остаются'))?' is-help':(hand.goal==='build'&&hand.moved>needOf(hand.a)?' is-over':'');
    let h='<div class="story-cloud'+tone+'">';
    if(hand.goal==='build'){
      h+='<p class="story-state cloud-goal">Свободные места в доме. Перенеси из новой группы.</p>';
      h+='<p class="story-state">У Капельки уже '+hand.a+'. Бульк приводит группу '+hand.b+'. Перенеси нужную часть. Лишних можно поставить и вернуть. Рамка — пять и пять.</p>';
      h+=frame();
      h+='<p class="story-state" role="status">Перенесено '+hand.moved+'.</p>';
      h+=BTN+'storyCloud" data-part="move">Перенести одного</button>'+'<button type="button" class="btn ghost" data-act="storyCloud" data-part="back">Вернуть одного</button>'+BTN+'storyCloudCheck">Проверить десяток</button>';
    }else if(hand.goal==='grow'){
      h+='<p class="story-state cloud-goal">Другой приход. Назови, сколько взять до десяти.</p>';
      h+='<p class="story-state">Это другой приход, не повтор первого. Группа к Тестику: '+hand.a+'. Группа к Королю: '+hand.b+'. Назови перенос и всех вместе. Места сами не считаются.</p>';
      h+=groups(hand.a,hand.b,'К Тестику','К Королю');
      h+='<p class="story-state" role="status">Взяли до десяти: '+hand.took+'. Вместе названо: '+hand.sum+'.</p>';
      h+=BTN+'storyCloud" data-part="took">Взяли ещё</button>'+BTN+'storyCloud" data-part="sum">Вместе ещё</button>'+BTN+'storyCloud" data-part="less">Убрать</button>'+BTN+'storyCloudCheck">Проверить итог</button>';
    }else{
      const g=seatGap();
      h+='<p class="story-state cloud-goal">Угощение каждому гостю. Пустые места не занимай.</p>';
      let lead='Поставь угощение каждому названному гостю. Король приготовил '+g.base+' мест.';
      if(g.extra)lead+=' Ты добавил ещё '+g.extra+'. Вместе '+g.seats+'.';
      lead+=' Пустые остаются пустыми.';
      h+='<p class="story-state">'+lead+'</p>';
      h+=groups(hand.a,hand.b,'Гости Тестика','Гости Короля');
      h+='<p class="story-role">Места Короля, угощение на каждом занятом</p><div class="story-bundle" role="img" aria-label="Места '+g.seats+', угощений '+hand.cups+'">'+Array.from({length:g.seats},(_,i)=>'<i class="story-piece seat'+(i<hand.cups?' on':'')+(i>=g.base?' more':'')+'"></i>').join('')+'</div>';
      let status='Угощений: '+hand.cups+'.';
      if(g.lack)status+=' Не хватает угощений: '+g.lack+'.';
      if(g.over)status+=' Лишних угощений: '+g.over+'.';
      if(g.noSeat)status+=' Без места: '+g.noSeat+'.';
      else status+=' Свободных мест: '+g.free+'.';
      h+='<p class="story-state" role="status">'+status+'</p>';
      h+=BTN+'storyCloud" data-part="cup">Поставить угощение</button>'+BTN+'storyCloud" data-part="uncup">Убрать угощение</button>';
      if(hand.cups>=g.seats&&g.noSeat>0)h+=BTN+'storyCloud" data-part="addseat">Добавить место</button>';
      h+=BTN+'storyCloudCheck">Принять гостей</button>';
    }
    if(hand.msg)h+='<p class="story-state'+(hand.ok?' ok':'')+'">'+hand.msg+'</p>';
    h+='<button type="button" class="btn ghost" data-act="storyCloudHelp">Объясни мне</button>';
    if(hand.ok&&hand.goal!=='seat')h+=BTN+'storyCloudPlace">'+(hand.goal==='build'?'Оставить остаток':'К местам')+'</button>';
    return h+'</div>';
  }
  function epRow(ep,d,locked){
    const done=d[ep];
    let state,btn='';
    if(done){
      const src=ep===4&&orderTally()?orderTally():done;
      const indep=src.rounds-(src.supported||0);
      state='<p class="story-state ok">Сделано: заданий '+src.rounds+(src.errors?', ошибок '+src.errors:', без ошибок')+'; самостоятельно '+indep+((src.supported||0)>0?', с подсказкой '+src.supported:'')+'</p>';
      if(ep<4){
        if(replayWaiting(ep))btn=BTN+'storyBack5" data-ep="'+ep+'" aria-label="Вернуться к Капельке: '+EP[ep].name+'">Вернуться к Капельке</button>';
        else if(replayTry(ep,'open'))btn=BTN+'storyReplay5" data-ep="'+ep+'" aria-label="Продолжить: '+EP[ep].name+'">Продолжить: '+EP[ep].name+'</button>';
        else btn=BTN+'storyReplay5" data-ep="'+ep+'" aria-label="Повторить: '+EP[ep].name+'">Повторить: '+EP[ep].name+'</button>';
      }
    }else if(ep===4){
      if(!d[3])state='<p class="story-state">Сначала — «'+EP[3].name+'».</p>';
      else if(sceneDone()){ state='<p class="story-state ok">Гости сосчитаны и рассажены.</p>'; btn=BTN+'storyCloudBack" data-ep="4" aria-label="Рассказать Капельке: '+EP[4].name+'">Рассказать Капельке</button>'; }
      else if(stage()==='build'||stage()==='grow'||stage()==='seat')state='<p class="story-state">Гости на площадке выше.</p>';
      else state=builder();
    }else if(locked){
      state='<p class="story-state">Облачный остров ещё закрыт: сначала освой предыдущий остров.</p>';
    }else if(!(ep===1||d[ep-1])){
      state='<p class="story-state">Сначала — «'+EP[ep-1].name+'».</p>';
    }else if(lesson(ep)&&lesson(ep).level!=='closed'){
      state='<p class="story-state">Можно продолжить с того же места.</p>';
      btn=BTN+'storyEp5" data-ep="'+ep+'" aria-label="Продолжить: '+EP[ep].name+'">Продолжить</button>';
    }else if(lesson(ep)&&lesson(ep).level==='closed'){
      const tasks=journal().tasks.filter(t=>t.sk==='add'&&t.at>=lesson(ep).since&&(t.ph||1)===REQ[ep]);
      if(tasks.length){ state='<p class="story-state ok">Серия собрана. Можно рассказать Капельке.</p>'; btn=BTN+'storyBack5" data-ep="'+ep+'" aria-label="Вернуться к Капельке: '+EP[ep].name+'">Вернуться к Капельке</button>'; }
      else { state='<p class="story-state">Готово к делу. Обычное занятие своим способом.</p>'; btn=BTN+'storyEp5" data-ep="'+ep+'" aria-label="Начать: '+EP[ep].name+'">Начать</button>'; }
    }else if(addPhase()<REQ[ep]){
      state='<p class="story-state">Откроется на этапе «'+app.E.phaseName('add',REQ[ep])+'» (сейчас: '+app.E.phaseName('add',addPhase())+').</p>';
      btn=BTN+'storyTrain5">Тренироваться на острове</button>';
    }else{
      state='<p class="story-state">Готово к делу. Обычное занятие своим способом.</p>';
      btn=BTN+'storyEp5" data-ep="'+ep+'" aria-label="Начать: '+EP[ep].name+'">Начать</button>';
    }
    return '<li class="story-ep'+(done?' done':'')+'" data-ep="'+ep+'" tabindex="-1"><div class="story-ep-txt"><b>'+EP[ep].name+'</b><p>'+EP[ep].what+'</p>'+state+'</div>'+btn+'</li>';
  }
  function trail(guests,seats){
    if(!guests)return '';
    const made=Math.max(0,(seats||yardSeats())-yardSeats());
    const tens=Math.floor(guests/10), rest=guests%10;
    let piles='';
    for(let i=0;i<tens;i++)piles+='<div class="story-ten"><p class="story-badge">Десяток</p><div class="story-bundle full" aria-hidden="true">'+dots(10,'in')+'</div></div>';
    if(rest||!tens)piles+='<div class="story-ten"><p class="story-badge">'+(tens?'Ещё '+rest:'Гости '+guests)+'</p><div class="story-bundle" aria-hidden="true">'+dots(rest||guests,'in')+'</div></div>';
    const heard=tens?(rest?'десяток и '+rest:'десяток'):String(guests);
    return '<div class="story-trail story-pile" role="img" aria-label="Тропа Капельки, принято '+guests+' гостей: '+heard+'"><p class="story-badge">Тропа Капельки</p>'+piles+'</div><p class="story-badge" role="status">Принято '+guests+' гостей и столько же угощений. Площадка Короля была '+yardSeats()+' мест'+(made?'. Мест добавлено руками: '+made:'. Свободные места остались пустыми')+'.</p>';
  }
  function nextHill(){
    if(!ext.views.storyT06)return 'Дальше — Гномья гора: часть приготовленного повезут двумя рейсами. Эта глава ещё готовится.';
    const sent=journal().games.some(g=>g.game==='story-t06-4'&&g.level==='two-trips');
    if(sent&&ext.views.storyT07)return 'Дальше — Волшебная башня: Маг Мармелад собирает общий праздник. Загляни к нему.';
    if(sent)return 'Дальше — Гномья гора: оба рейса уже ушли своим адресатам.';
    return 'Дальше — Гномья гора: часть приготовленного повезут двумя рейсами. Загляни к Хинкалику.';
  }
  function view(){
    const d=derive();
    const tally=orderTally();
    const ordering=stage()==='build'||stage()==='grow'||stage()==='seat';
    let h='<section class="card stage story-wrap'+(ordering?' story-order':'')+'" aria-labelledby="story-title">';
    h+='<p class="story-kicker">Большой день Сказочного Теремка · глава 5</p>';
    if(!ordering)h+='<div class="story-hero">'+(CH?CH.pal('add','bob','Фея Капелька',d[4]?'happy':undefined):'')+'</div>';
    h+='<h1 id="story-title">Ещё гости</h1>';
    if(ordering)h+=builder();
    h+=d[4]
      ?'<p class="story-say">Капелька: «Новая группа устроена. Площадка Короля на месте, гости и угощения совпали.»</p>'+trail(tally?tally.guests:0,tally?tally.seats:yardSeats())+'<p class="story-next">'+nextHill()+'</p>'
      :'<p class="story-say">Капелька: «Король уже приготовил '+yardSeats()+' мест. Бульк и Тестик получили корзины. Я привела новую группу — помоги встретить их до десяти.»</p>';
    h+='<ol class="story-list">'+[1,2,3,4].map(ep=>epRow(ep,d,islandLocked())).join('')+'</ol>';
    h+='<div class="row"><button type="button" class="btn ghost" data-act="map">← На карту</button></div></section>';
    return h;
  }
  function focusMain(ep){
    const btn=ep&&document.querySelector('.story-wrap button[data-ep="'+ep+'"]');
    const row=!btn&&ep&&document.querySelector('.story-wrap li[data-ep="'+ep+'"]');
    const el=btn||row||document.querySelector('.story-wrap [data-act="storyCloudBack"],.story-wrap [data-act="storyEp5"],.story-wrap [data-act="map"]');
    if(el)el.focus({preventScroll:true});
  }
  function focusSel(sel){const el=document.querySelector(sel);if(el)el.focus({preventScroll:true});}
  function focusScene(){
    const st=stage();
    if(st==='tell'){focusMain(4);return;}
    if(st==='build'||st==='grow'||st==='seat'){
      syncHand();
      if(hand.ok&&hand.goal!=='seat')focusSel('.story-wrap [data-act="storyCloudPlace"]');
      else if(st==='seat'&&hand.cups>0)focusSel('.story-wrap [data-act="storyCloud"][data-part="cup"]');
      else focusSel('.story-wrap [data-act="storyCloudCheck"]');
      return;
    }
    focusMain();
  }
  function open(){ active=null; app.go('storyT05',{island:null}); if(PH&&PH.heroes&&PH.heroes.add)root.AUDIO.say(PH.heroes.add.hello); focusScene(); }
  function savedRow(a){
    if(a.replay)return replayTry(a.ep,'closed');
    const row=lesson(a.ep);
    return row&&row.level==='closed'?row:null;
  }
  function seriesOf(a,row){
    const len=row&&row.len|0;
    if(!a||!row||row.level!=='closed'||row.ep!==a.ep||row.since!==a.at||row.phase!==REQ[a.ep])return null;
    if(!len||row.count!==len||!Array.isArray(row.results)||row.results.length!==len)return null;
    const pool=journal().tasks.filter(t=>t.at>=a.at&&(typeof row.at!=='number'||t.at<=row.at)&&(t.since==null||t.since===a.at)&&t.sk==='add'&&(t.ph||1)===REQ[a.ep]);
    const picked=[];
    for(let i=0;i<len;i++){
      const atPos=pool.filter(t=>(t.pos|0)===i);
      const marked=atPos.filter(t=>t.since===a.at);
      const plain=atPos.filter(t=>t.since==null);
      const use=marked.length?marked:plain;
      if(use.length!==1||(use[0].clean?1:0)!==(row.results[i]?1:0))return null;
      picked.push(use[0]);
    }
    return picked;
  }
  function backFromSeries(){
    const a=active; active=null;
    if(a&&root.__insights){
      const row=savedRow(a);
      const qual=seriesOf(a,row);
      if(qual){
        const rec={level:'ph'+REQ[a.ep],rounds:qual.length,errors:qual.reduce((n,t)=>n+(t.w||0),0),supported:qual.filter(t=>(t.ex||0)>0||t.nl).length,ep:a.ep,since:a.at};
        if(a.replay){
          if(!journal().games.some(g=>g.origin==='story-t05-replay'&&g.ep===a.ep&&g.since===a.at))root.__insights.logGame(Object.assign({game:'ten-bridge',origin:'story-t05-replay'},rec));
        }else if(!lastEntry(a.ep))root.__insights.logGame(Object.assign({game:'story-t05-'+a.ep},rec));
      }
    }
    app.go('storyT05',{island:null}); focusMain(a&&a.ep);
  }
  function logStep(level,extra){
    if(!root.__insights)return;
    root.__insights.logGame(Object.assign({game:'ten-bridge',origin:'story-t05-4',level,rounds:1,errors:hand.errors,supported:hand.help?1:0,a:hand.a,b:hand.b},extra));
    hand.stamp='';
  }
  ext.views.storyT05=view;
  ext.acts.storyT05=open;
  function begin(ep, row, replay){
    const fresh=!row||row.level==='closed';
    active={ep:ep,at:fresh?Date.now():row.since,replay:replay?1:0};
    app.S.storyHold=1;
    app.S.replayPhase=REQ[ep];
    app.S.resume=fresh?null:row;
    if(root.__insights&&root.__insights.bindSeries)root.__insights.bindSeries(active.at);
    app.startSession('add');
  }
  ext.acts.storyEp5=(a)=>{
    const ep=Number(a.dataset.ep), d=derive();
    if(!REQ[ep]||d[ep]||(ep>1&&!d[ep-1])||islandLocked()||addPhase()<REQ[ep])return;
    let row=lesson(ep);
    const backed=row&&journal().tasks.some(t=>t.sk==='add'&&t.at>=row.since&&(t.ph||1)===REQ[ep]);
    if(row&&row.level==='closed'&&backed){ active={ep,at:row.since}; app.go('storyT05',{island:null}); return; }
    if(row&&row.level==='closed')row=null;
    begin(ep,row,0);
  };
  ext.acts.storyReplay5=(a)=>{
    const ep=Number(a.dataset.ep);
    if(!REQ[ep]||!lastEntry(ep))return;
    begin(ep,replayTry(ep,'open'),1);
  };
  ext.acts.storyTrain5=()=>{ if(!islandLocked()){ app.S.storyLesson=0; app.S.resume=null; app.S.replayPhase=0; app.startSession('add'); } };
  ext.acts.storyBack5=(a)=>{
    if(!active){
      const ep=Number(a&&a.dataset&&a.dataset.ep)||0;
      const waiting=ep?replayWaiting(ep):null;
      const row=waiting||(ep&&lesson(ep)&&lesson(ep).level==='closed'?lesson(ep):null);
      if(row)active={ep:row.ep||ep,at:row.since,replay:waiting?1:0};
    }
    backFromSeries();
  };
  ext.acts.storyCloudBack=()=>{
    if(!derive()[4]&&root.__insights){
      const se=sceneDone(), tally=orderTally();
      if(se&&tally)root.__insights.logGame({game:'story-t05-4',level:'meet-guests',rounds:tally.rounds,errors:tally.errors,supported:tally.supported,guests:tally.guests,seats:tally.seats,deliveries:se.deliveries});
    }
    app.go('storyT05',{island:null}); focusMain(4);
  };
  ext.acts.storyCloud=(a)=>{
    const st=stage(); if(st!=='build'&&st!=='grow'&&st!=='seat')return;
    syncHand();
    const part=a&&a.dataset&&a.dataset.part;
    if(hand.goal==='build'){
      if(part==='move'&&hand.moved<hand.b)hand.moved++;
      else if(part==='back'&&hand.moved>0)hand.moved--;
    }else if(hand.goal==='grow'){
      if(part==='took'&&hand.took<9)hand.took++;
      else if(part==='sum'&&hand.sum<20)hand.sum++;
      else if(part==='less'){ if(hand.sum>0)hand.sum--; else if(hand.took>0)hand.took--; }
    }else if(part==='cup'&&hand.cups<yardSeats()+hand.extra)hand.cups++;
    else if(part==='uncup'&&hand.cups>0)hand.cups--;
    else if(part==='addseat'&&hand.cups>=yardSeats()+hand.extra&&hand.cups<hand.a+hand.b)hand.extra++;
    hand.ok=false; hand.msg=''; saveDraft(); app.go('storyT05',{island:null});
    focusSel('.story-wrap [data-act="storyCloud"][data-part="'+(part||'')+'"]');
  };
  ext.acts.storyCloudCheck=()=>{
    const st=stage(); if(st!=='build'&&st!=='grow'&&st!=='seat')return;
    syncHand();
    const need=needOf(hand.a);
    if(hand.goal==='build'){
      if(hand.moved===need){hand.ok=true;hand.msg='Дом полон. Во второй группе остались остальные.';}
      else miss();
    }else if(hand.goal==='grow'){
      if(hand.took===need&&hand.sum===hand.a+hand.b){hand.ok=true;hand.msg='Сходится. Теперь сам рассади гостей.';}
      else miss();
    }else if(hand.cups===hand.a+hand.b&&yardSeats()+hand.extra>=hand.cups){
      hand.ok=true; hand.msg='Каждому гостю есть место и угощение.';
      if(!sceneDone())logStep('meet-guests',{guests:hand.a+hand.b,seats:yardSeats()+hand.extra,deliveries:[[hand.a+hand.b,yardSeats()+hand.extra]]});
    }else miss();
    if(hand.goal!=='seat'||!hand.ok)saveDraft();
    app.go('storyT05',{island:null});
    if(hand.ok&&hand.goal==='seat')focusScene();
    else focusSel(hand.ok&&hand.goal!=='seat'?'.story-wrap [data-act="storyCloudPlace"]':'.story-wrap [data-act="storyCloudCheck"]');
  };
  ext.acts.storyCloudHelp=()=>{
    if(stage()!=='build'&&stage()!=='grow'&&stage()!=='seat')return;
    syncHand(); hand.help=true;
    hand.msg=helpText();
    saveDraft(); app.go('storyT05',{island:null});
    focusSel('.story-wrap [data-act="storyCloudHelp"]');
  };
  ext.acts.storyCloudPlace=()=>{
    const st=stage(); if(st!=='build'&&st!=='grow')return;
    syncHand(); if(!hand.ok)return;
    if(hand.goal==='build'&&!step10(lastEntry(3)))logStep('meet-10',{moved:hand.moved,deliveries:[[hand.a,hand.moved,hand.b-hand.moved]]});
    else if(hand.goal==='grow'){ hand.goal='seat'; hand.ok=false; hand.cups=0; hand.extra=0; hand.msg=''; hand.stamp=''; saveDraft(); }
    app.go('storyT05',{island:null}); focusScene();
  };
  chain('lessonSnap',(info)=>{
    if(!active||!info||!info.item||!info.item.key)return '';
    const replay=active.replay?1:0;
    root.__insights&&root.__insights.logGame({game:'ten-bridge',origin:replay?'story-t05-replay-draft':'story-t05-lesson',slot:(replay?'t05-replay-try-':'t05-lesson-')+pid()+'-'+active.ep,level:info.closed?'closed':'open',rounds:0,ep:active.ep,since:active.at,pid:pid(),replay:replay,
      len:info.len,phase:info.phase,count:info.count,results:info.results,item:info.item,si:info.si,wr:info.wr,kp:info.kp,clean:info.clean,done:info.done,taps:info.taps,heard:info.heard,ins:info.ins,earned:info.earned});
    return '';
  });
  chain('leave',(screen)=>{ if(active&&screen!=='task'&&screen!=='break')active=null; return ''; });
  chain('islandExtra',(id)=>{
    if(id!=='add'||!t04Done())return '';
    if(islandLocked())return '<p class="story-badge">Большой день: Облачный остров откроется после Королевства</p>';
    const tally=orderTally();
    return '<button type="button" class="btn ghost" data-act="storyT05">Помочь Капельке · Большой день</button>'+(tally?trail(tally.guests,tally.seats):'');
  });
  chain('breakExtra',()=> active?BTN+'storyBack5">Вернуться к Капельке</button>':'');
  const REG=root.__storyMap;
  if(REG)REG.items.push({
    done:()=>!!derive()[4],
    action:()=>{
      if(!t04Done()||derive()[4])return null;
      if(sceneDone())return {act:'storyCloudBack',label:'Рассказать Капельке'};
      if(!islandLocked())return {act:'storyT05',label:'Помочь Капельке'};
      return null;
    }
  });
  if(app.S.screen==='map')app.render();
})(window);

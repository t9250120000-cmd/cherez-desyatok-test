/* Глава T07 — Волшебная башня, Маг Мармелад. Финал сюжета.
   E1 и E2 — выбор в истории, не серия движка и не skills.done.
   E3 — обычная серия mix через storyHold и фазу 1.
   E4 читает уже записанные вклады и не выдумывает отсутствующие.
   Один слот черновика. terem_v3 и награды этот модуль не пишет. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext;
  if(!app||!ext)return;
  const PH=root.PH,CH=root.CH;
  const EP={
    1:{name:'Разобраться в просьбе', what:'По ситуации понять: собрать вместе, убрать часть или найти, сколько не хватает.'},
    2:{name:'План праздника', what:'Самому выбрать, что раньше: места или угощение. Оба порядка годятся.'},
    3:{name:'Новый заказ', what:'Мармелад меняет условие. Новый пример знакомым способом, без готового ответа.'},
    4:{name:'Все друзья вместе', what:'Рассадить, разложить угощение и назвать остаток. Это финал истории, не вся математика.'}
  };
  const ACTS=[['add','Собрать всех вместе'],['sub','Убрать часть'],['part','Узнать, сколько не хватает']];
  function journal(){
    const I=root.__insights, p=I&&I.prof&&I.prof();
    return p&&Array.isArray(p.games)&&Array.isArray(p.tasks)?p:{games:[],tasks:[]};
  }
  function pid(){ return (app.P()&&app.P().id)||''; }
  function lastEntry(ep){
    const l=journal().games.filter(g=>g.game==='story-t07-'+ep);
    return l.length?l[l.length-1]:null;
  }
  function t06(){
    const l=journal().games.filter(g=>g.game==='story-t06-4'&&g.level==='two-trips');
    return l.length?l[l.length-1]:null;
  }
  function guestsOf(){
    const l=journal().games.filter(g=>g.game==='story-t05-4'&&g.level==='meet-guests'&&g.guests>1);
    return l.length?l[l.length-1].guests:0;
  }
  function seatsWas(){
    if(journal().games.some(g=>g.game==='tens-workshop'&&g.origin==='story-t04-4'&&g.level==='yard-19'))return 19;
    return journal().games.some(g=>g.game==='story-t04-4'&&g.level==='yard-16')?16:0;
  }
  function seatsOf(){
    const l=journal().games.filter(g=>g.game==='story-t05-4'&&g.level==='meet-guests'&&g.seats>0);
    return l.length?l[l.length-1].seats:seatsWas();
  }
  function basketsOf(){
    return journal().games.some(g=>g.game==='story-t03-4');
  }
  function derive(){ return {1:lastEntry(1),2:lastEntry(2),3:lastEntry(3),4:lastEntry(4)}; }
  function mixPhase(){ const p=app.P(); const st=p&&p.skills&&p.skills.mix; return st?(st.done?1:st.phase||1):1; }
  function islandLocked(){
    const p=app.P(), s=app.E.SK.mix;
    return !!(p&&s&&app.E.SK[p.cur]&&app.E.SK[p.cur].n<s.n&&!(p.skills.mix&&p.skills.mix.done));
  }
  function chain(name,fn){
    const prev=ext.hooks[name];
    ext.hooks[name]=function(...a){
      let out=''; try{ out=prev?prev.apply(this,a)||'':''; }catch(e){ out=''; }
      let mine=''; try{ mine=fn.apply(this,a)||''; }catch(e){ mine=''; }
      return out+mine;
    };
  }
  const BTN='<button type="button" class="btn" data-act="';
  let active=null;
  let hand=null;
  function slot(){ return hand&&hand.replay?'t07-replay-scene-'+pid()+'-'+hand.ep:'t07-draft-'+pid(); }
  function draftRow(){
    const rows=journal().games.filter(g=>g.origin==='story-t07-draft'&&g.slot===slot()&&g.pid===pid());
    return rows.length?rows[rows.length-1]:null;
  }
  function saveDraft(){
    if(!hand||!root.__insights)return;
    root.__insights.logGame(Object.assign({game:'ten-bridge',origin:hand.replay?'story-t07-replay-scene':'story-t07-draft',slot:slot(),level:'open',pid:pid(),rounds:0}, hand));
  }
  function sync(){
    if(hand&&hand.replay){
      const rows=journal().games.filter(g=>g.origin==='story-t07-replay-scene'&&g.slot===slot()&&g.pid===pid());
      if(rows.length)hand=Object.assign({},rows[rows.length-1]);
      return;
    }
    const row=draftRow();
    if(row&&row.ep)hand=upgrade(Object.assign({},row));
    else if(!hand)hand={ep:0};
  }
  const KINDS=['add','sub','part'];
  const SKILL={add:'add',sub:'sub',part:'to10',seats:'teen',treats:'add'};
  const PHASE={add:1,sub:1,part:1,seats:2,treats:2};
  function fresh(ep){
    const salt=(t06()||{}).at|0;
    hand={ep:ep,kind:KINDS[Math.abs(salt)%3],picked:'',order:'',jobs:[],job:0,placed:0,cups:0,leftNamed:0,leftSet:0,errors:0,help:false,ok:false,msg:'',ready:0,pid:pid()};
    saveDraft();
  }
  function askText(){
    if(hand.kind==='add')return 'На площадке уже есть друзья, и подходят ещё. Что сделать?';
    if(hand.kind==='sub')return 'Часть друзей уезжает с площадки. Что сделать с числом?';
    return 'Мест десять, часть уже занята. Что нужно узнать?';
  }
  function dots(n,cls){ let h=''; for(let i=0;i<n;i++)h+='<i class="story-piece '+cls+'"></i>'; return h; }
  function rows(n,cls){
    n=n|0; if(n<0)n=0;
    let h='', full=Math.floor(n/5), rem=n%5;
    for(let i=0;i<full;i++)h+='<span class="story-row" role="group" aria-label="Пятёрка">'+dots(5,cls)+'</span>';
    if(rem)h+='<span class="story-row" role="group" aria-label="Остаток '+rem+'">'+dots(rem,cls)+'</span>';
    if(!n)h+='<span class="story-row" role="group" aria-label="Пусто">пусто</span>';
    return '<span class="story-rows">'+h+'</span>';
  }
  function modelOf(kind){
    if(kind==='sub')return '<p class="story-state">Это одни и те же тринадцать. Десять остаются, три отмечены как уехавшие. Новой группы нет.</p><div class="story-pile" role="img" aria-label="Из тринадцати три уезжают, десять остаются"><span class="story-drop" role="group" aria-label="Остаются 10"><b>Остаются 10</b>'+dots(10,'guest')+'</span><span class="story-drop" role="group" aria-label="Уезжают 3"><b>Уезжают 3</b>'+dots(3,'trip')+'</span></div>';
    if(kind==='part')return '<p class="story-state">Один десяток: семь мест заняты, три пустые. Вместе десять, не две новые кучи.</p><div class="story-pile" role="img" aria-label="Один десяток: семь занятых и три пустых">'+dots(7,'in')+dots(3,'seat')+'</div>';
    return '<p class="story-state">Две группы сходятся в одну: восемь и ещё три.</p><div class="story-pile" role="img" aria-label="Модель сложения: восемь и три">'+dots(8,'guest')+dots(3,'guest2')+'</div>';
  }
  function scene1(){
    sync();
    if(!hand||hand.ep!==1)fresh(1);
    if(hand.model){
      return modelOf(hand.modelKind||hand.kind)+(hand.msg?'<p class="story-state" role="status">'+hand.msg+'</p>':'')+BTN+'storyAsk" data-part="next">Новая просьба</button>';
    }
    let h='<p class="story-state">'+askText()+'</p>';
    if(hand.msg)h+='<p class="story-state'+(hand.ok?' ok':'')+'" role="status">'+hand.msg+'</p>';
    h+=ACTS.map(x=>BTN+'storyAsk" data-part="'+x[0]+'">'+x[1]+'</button>').join('');
    h+=BTN+'storyAsk" data-part="help">Показать модель</button>';
    return h;
  }
  function scene2(){
    sync();
    if(!hand||hand.ep!==2)fresh(2);
    const g=guestsOf();
    if(!hand.order){
      return '<p class="story-state">Два дела не зависят друг от друга. Оба порядка подходят.</p>'
        +BTN+'storyPlan" data-part="seats">Сначала места</button>'+BTN+'storyPlan" data-part="treats">Сначала угощение</button>';
    }
    const job=hand.jobs[hand.job];
    let h='<p class="story-state">Порядок: '+(hand.order==='seats'?'сначала места, потом угощение':'сначала угощение, потом места')+'. Сейчас — '+(job==='seats'?'места, картинка десятка':'угощение, картинка сложения')+'.</p>';
    h+=BTN+'storyPlan" data-part="go">Начать это дело</button>';
    if(hand.msg)h+='<p class="story-state'+(hand.ok?' ok':'')+'">'+hand.msg+'</p>';
    return h;
  }
  function upgrade(h){
    if(!h||h.ep!==4||h.ready||h.upgraded)return h;
    h.upgraded=1;
    if(Array.isArray(h.jobs)&&h.jobs.indexOf('left')>=0&&h.bulb==null){
      h.jobs=h.jobs.filter(j=>j!=='left');
      const at=h.jobs.indexOf('treats');
      h.job=at>=0?at:0;
      h.msg='Угощение ещё не разложено по двум столам. Прежние ошибки и помощь сохранены.';
    }
    return h;
  }
  function face(id,label){ return CH?CH.pal(id,'',label):''; }
  function card(title, body, who, label){
    return '<div class="story-drop" role="group" aria-label="'+title+'">'+face(who,label)+'<span class="story-drop-txt"><b>'+title+'</b>'+body+'</span></div>';
  }
  function festRow(){
    const rows=journal().games.filter(g=>g.origin==='story-t07-draft'&&g.slot==='t07-draft-'+pid()&&g.pid===pid());
    return rows.length?rows[rows.length-1]:null;
  }
  function groups(items){
    const tens=Math.floor(items.length/10), rest=items.length%10;
    let h='';
    for(let i=0;i<tens;i++)h+='<span class="story-ten"><span class="story-badge">Десяток</span><span class="story-bundle full" aria-hidden="true">'+items.slice(i*10,i*10+10).join('')+'</span></span>';
    if(rest)h+='<span class="story-ten"><span class="story-badge">'+(tens?'Ещё '+rest:String(rest))+'</span><span class="story-bundle" aria-hidden="true">'+items.slice(tens*10).join('')+'</span></span>';
    return h;
  }
  function pieces(n,cls){ return Array.from({length:Math.max(0,n|0)},()=>'<i class="story-piece '+cls+'"></i>'); }
  function facts(){
    const trip=t06(), g=guestsOf(), now=seatsOf(), was=seatsWas();
    const has=re=>journal().games.some(x=>x.game===re);
    const fest=festRow();
    const taken=Math.min(g||0, was||0);
    let h='<div class="story-drops story-friends">';
    if(has('story-t01-1')||has('story-t01-4'))h+=card('Мятный луг','<span>Бульк встретил первых гостей</span>','see','Бульк');
    if(has('story-t02-4'))h+=card('Пряничный остров','<span>Тестик открыл переход</span>','to10','Тестик');
    if(basketsOf())h+=card('Желейный лес','<span>Корзины Желе у Булька и Тестика</span><span class="story-baskets"><img src="art/forest-bulk-catch.webp" alt="Корзина Булька"><img src="art/forest-testik-peek.webp" alt="Корзина Тестика"></span>','split','Желе');
    if(was){
      const seats=pieces(was,'seat').map((cell,i)=>i<taken?cell.replace('seat"','seat on"'):cell);
      const added=Math.max(0,(now||0)-was);
      h+=card('Королевство','<span>Прежняя площадка '+was+'. Занято '+taken+', свободно '+(was-taken)+'.'+(added?' Игрок добавил '+added+'.':'')+'</span>'+groups(seats),'teen','Король');
    }
    if(g)h+=card('Облачный остров','<span>Гостей '+g+(now?', мест сейчас '+now:'')+'</span>'+groups(pieces(g,'guest')),'add','Капелька');
    if(trip)h+=card('Гномья гора','<span>Груз: Бульку '+trip.sent1+', Королю '+trip.sent2+'</span>'+groups(pieces(trip.sent1,'trip'))+groups(pieces(trip.sent2,'guest2')),'sub','Хинкалик');
    h+=card('Волшебная башня','<span>Мармелад собирает уже сделанное</span>','mix','Мармелад');
    h+='</div>';
    if(fest&&fest.bulb!=null&&fest.king!=null){
      h+='<p class="story-state">На празднике так и осталось: стол Булька '+(fest.bulb|0)+', стол Короля '+(fest.king|0)+', посажено '+(fest.placed|0)+'.</p>';
    }else if(lastEntry(4)){
      h+='<p class="story-state">Разложение столов в журнале не сохранилось. Зачёт праздника на месте. Его можно собрать ещё раз, без новой награды.</p>';
    }
    return h;
  }
  function ensureJobs(){
    if(hand.jobs&&hand.jobs.length)return;
    const plan=lastEntry(2);
    hand.jobs=plan&&plan.order==='treats'?['treats','seats']:['seats','treats'];
    hand.job=hand.job||0;
    saveDraft();
  }
  function seatRows(placed, cap){
    placed=placed|0; cap=cap|0;
    const total=Math.max(placed, cap);
    if(!total)return '<span class="story-rows"><span class="story-row" role="group" aria-label="Пусто">пусто</span></span>';
    let h='', i=0;
    const ids=['see','to10','split','teen','add','sub','mix'];
    while(i<total){
      const n=Math.min(5, total-i);
      let row='';
      for(let k=0;k<n;k++){
        const on=i+k<placed;
        row+=on
          ?'<span class="story-piece who">'+face(ids[(i+k)%ids.length],'гость')+'</span>'
          :'<i class="story-piece free" role="img" aria-label="свободное место"></i>';
      }
      const full=n===5, occ=Math.max(0, Math.min(placed, i+n)-i);
      h+='<span class="story-row" role="group" aria-label="'+(full?'Пятёрка':'Остаток '+n)+', занято '+occ+'">'+row+'</span>';
      i+=n;
    }
    return '<span class="story-rows">'+h+'</span>';
  }
  function buns(n){
    const one='<i class="story-piece treat" role="img" aria-label="булочка"><svg viewBox="0 0 28 20" aria-hidden="true"><ellipse cx="14" cy="13" rx="12" ry="6" fill="#E7B56A"/><path d="M4 12 Q14 2 24 12 Q14 8 4 12" fill="#FFE0A3"/><path d="M9 8.5 Q14 6 19 8.5" fill="none" stroke="#C47A3A" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="10" cy="7" rx="2.2" ry="1.1" fill="#fff" opacity=".75"/></svg></i>';
    let h=''; for(let i=0;i<n;i++)h+=one; return h;
  }
  function yardFrom(src, confirm){
    const bulb=src&&src.bulb|0, king=src&&src.king|0, placed=src&&src.placed|0;
    const cap=Math.max(placed, seatsOf());
    return '<div class="story-finale meadow" role="group" aria-label="Площадка праздника">'
      +'<figure class="fest-place" tabindex="0" aria-label="Вечерняя башня. Мармелад на уступе. У Булька '+bulb+', у Короля '+king+', гостей '+placed+'.">'
      +'<img src="art/tower.webp" alt="" width="370" height="268">'
      +'<span class="fest-stand mage">'+face('mix','Мармелад')+'</span>'
      +'<span class="fest-stand bulk">'+face('see','Бульк')+'</span>'
      +'<span class="fest-stand king">'+face('teen','Король')+'</span>'
      +'</figure>'
      +(confirm?'<p class="story-state ok" role="status" aria-live="polite">Праздник собран. Можно закончить.</p>':'')
      +'<div class="story-tables"><div class="fest-table">'
      +'<span class="fest-leg" aria-hidden="true"></span><span class="fest-leg r" aria-hidden="true"></span>'
      +'<div class="fest-half" role="group" aria-label="Стол Булька '+bulb+'"><b>Бульк <span class="fest-num">'+bulb+'</span></b><span class="fest-plate">'+buns(bulb)+'</span></div>'
      +'<div class="fest-half" role="group" aria-label="Стол Короля '+king+'"><b>Король <span class="fest-num">'+king+'</span></b><span class="fest-plate">'+buns(king)+'</span></div>'
      +'</div></div>'
      +'<div class="fest-bench" role="group" aria-label="Посажено '+placed+' из '+cap+'"><b>Гости на местах <span class="fest-num">'+placed+'</span></b>'+seatRows(placed, cap)+'</div>'
      +(confirm?BTN+'storyFestBack">Закончить праздник</button>':'')
      +'</div>';
  }
  function yard(){ return yardFrom(hand, !!(hand&&hand.ready&&(!lastEntry(4)||hand.replay))); }
  function scene4(){
    sync();
    if(!hand||hand.ep!==4)fresh(4);
    ensureJobs();
    const trip=t06(), g=guestsOf(), cap=seatsOf(), was=seatsWas();
    if(hand.ready)return yard()+facts();
    const job=hand.jobs[hand.job]||'cargo';
    let h='';
    if(job==='seats'){
      h+='<p class="story-state">Рассади гостей. Их '+g+'. Мест сейчас '+cap+(was&&was!==cap?', прежняя площадка была '+was:'')+'.</p>';
      h+=yard();
      h+=BTN+'storyFest" data-part="more">Посадить</button>'+BTN+'storyFest" data-part="less">Вернуть</button>'+BTN+'storyFest" data-part="check">Проверить рассадку</button>';
    }else if(job==='treats'){
      const bulb=hand.bulb|0, king=hand.king|0;
      h+='<p class="story-state">Разложи '+g+' угощений по двум столам. Подойдёт любое разложение, если вместе их '+g+'.</p>';
      h+=yard();
      h+=BTN+'storyFest" data-part="bulb">Бульку</button>'+BTN+'storyFest" data-part="king">Королю</button>';
      h+=BTN+'storyFest" data-part="unbulb">Вернуть от Булька</button>'+BTN+'storyFest" data-part="unking">Вернуть от Короля</button>';
      h+=BTN+'storyFest" data-part="check">Проверить столы</button>';
    }else{
      if(hand.cargoModel){
        h+='<p class="story-state">Другой груз, не этот склад. Было десять: четыре из них уехали, шесть остались. Это не четырнадцать.</p><div class="story-pile" role="img" aria-label="Из десяти четыре уехали, шесть остались"><span class="story-drop" role="group" aria-label="Уехало 4"><b>Уехало 4</b>'+dots(4,'trip')+'</span><span class="story-drop" role="group" aria-label="Осталось 6"><b>Осталось 6</b>'+dots(6,'cargo')+'</span></div>';
        h+=BTN+'storyFest" data-part="own">Назвать свой склад</button>';
      }else{
        h+='<p class="story-state">Это груз, не гости. Бульку отправлено '+trip.sent1+', Королю '+trip.sent2+', весь груз был '+trip.stock+'. Сколько груза осталось на складе?</p>';
        h+=BTN+'storyFest" data-part="zero">Ноль</button>'+BTN+'storyFest" data-part="more">Больше</button>'+BTN+'storyFest" data-part="less">Меньше</button>'+BTN+'storyFest" data-part="check">Проверить склад</button>';
        h+=BTN+'storyFest" data-part="help">Показать модель</button>';
        h+='<p class="story-state" role="status">'+(hand.leftSet?'Названо '+hand.leftNamed+'.':'Ещё не названо.')+'</p>';
      }
    }
    if(hand.msg)h+='<p class="story-state'+(hand.ok?' ok':'')+'" role="status">'+hand.msg+'</p>';
    h+=facts();
    return h;
  }
  function epRow(ep,d){
    const done=d[ep];
    let state,btn='';
    if(done){
      const indep=(done.rounds||0)-(done.supported||0);
      state='<p class="story-state ok">Сделано'+(done.rounds?': заданий '+done.rounds+(done.errors?', ошибок '+done.errors:', без ошибок')+'; самостоятельно '+indep:'')+(done.order?'. Порядок: '+(done.order==='seats'?'сначала места':'сначала угощение'):'')+'</p>';
      if(ep===4)state+='<p class="story-state">Сюжетные главы собраны. Это не значит, что вся математика уже освоена.</p>';
      if(replayWaiting(ep))btn=BTN+'storyBack7" data-ep="'+ep+'">Вернуться к Мармеладу</button>';
      else if(replayTry(ep,'open'))btn=BTN+'storyReplay7" data-ep="'+ep+'" aria-label="Продолжить занятие: '+EP[ep].name+'">Продолжить: '+EP[ep].name+'</button>';
      else if(ep===4||!pending(ep))btn=BTN+'storyReplay7" data-ep="'+ep+'" aria-label="Повторить занятие: '+EP[ep].name+'">Повторить: '+EP[ep].name+'</button>';
    }else if(!t06()){
      state='<p class="story-state">Сначала — оба рейса Хинкалика.</p>';
    }else if(ep>1&&!d[ep-1]){
      state='<p class="story-state">Сначала — «'+EP[ep-1].name+'».</p>';
    }else if(pending(ep)){
      state='<p class="story-state ok">Серия собрана. Можно вернуться к Мармеладу.</p>';
      btn=BTN+'storyBack7" data-ep="'+ep+'">Вернуться к Мармеладу</button>';
    }else if(ep===3){
      if(islandLocked()||mixPhase()<1){
        state='<p class="story-state">Откроется, когда башня Мармелада доступна.</p>';
        btn=BTN+'storyTrain7">Тренироваться</button>';
      }else{
        const row=lesson(3);
        const mid=row&&row.level==='open';
        state='<p class="story-state">'+(mid?'Можно продолжить с того же места.':'Новое условие. Обычное занятие своим способом.')+'</p>';
        btn=BTN+'storyEp7" data-ep="3">'+(mid?'Продолжить':'Начать')+'</button>';
      }
    }else{
      const row=draftRow();
      if(ep===4&&row&&row.ready){ state='<p class="story-state ok">Праздник собран. Можно закончить.</p>'; btn=BTN+'storyFestBack">Закончить</button>'; }
      else{
        const open=row&&row.ep===ep&&row.level!=='closed';
        state='<p class="story-state">'+(open?'Можно продолжить с того же места.':'Готово к делу.')+'</p>';
        btn=BTN+'storyEp7" data-ep="'+ep+'">'+(open?'Продолжить':'Начать')+'</button>';
      }
    }
    return '<li class="story-ep'+(done?' done':'')+'"><div class="story-ep-txt"><b>'+EP[ep].name+'</b><p>'+EP[ep].what+'</p>'+state+'</div>'+btn+'</li>';
  }
  function lesson(ep){
    const credit=lastEntry(ep||3);
    const rows=journal().games.filter(g=>g.origin==='story-t07-lesson'&&g.pid===pid()&&g.ep===(ep||3)&&(!credit||g.since>credit.at));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayTry(ep, level){
    const slot='t07-replay-try-'+pid()+'-'+ep;
    const rows=journal().games.filter(g=>g.origin==='story-t07-replay-draft'&&g.slot===slot&&g.pid===pid()&&g.ep===ep&&(!level||g.level===level));
    return rows.length?rows[rows.length-1]:null;
  }
  function replayWaiting(ep){
    const row=replayTry(ep,'closed');
    if(!row)return null;
    return journal().games.some(g=>g.origin==='story-t07-replay'&&g.ep===ep&&g.since===row.since)?null:row;
  }
  function pending(ep){
    const row=lesson(ep);
    if(!row||row.level!=='closed')return null;
    const d=draftRow();
    if(d&&d.ep===ep&&d.settledSince===row.since)return null;
    const skill=row.skill||(ep===3?'mix':ep===1&&d?SKILL[d.kind]:'');
    const phase=row.phase||(ep===3?1:PHASE[skill]||1);
    if(!skill)return null;
    const tasks=journal().tasks.filter(t=>t.sk===skill&&t.at>=row.since&&(typeof row.at!=='number'||t.at<=row.at)&&(t.since==null||t.since===row.since)&&(t.ph||1)===phase);
    return tasks.length?row:null;
  }
  function begin(ep, skill, phase){
    const replay=!!(hand&&hand.replay);
    const row=replay?replayTry(ep,'open'):lesson(ep);
    if(!replay&&row&&row.level==='closed'&&pending(ep))return;
    const fresh=!row||row.level==='closed';
    const since=fresh?Date.now():row.since;
    if(hand){ hand.since=since; saveDraft(); }
    active={ep:ep,at:since,skill:fresh?skill:(row.skill||skill),phase:fresh?phase:(row.phase||phase),replay:replay?1:0};
    app.S.storyHold=1; app.S.replayPhase=active.phase;
    app.S.resume=fresh?null:row;
    if(root.__insights&&root.__insights.bindSeries)root.__insights.bindSeries(active.at);
    app.startSession(active.skill);
  }
  function layoutOf(row){
    if(!row||row.bulb==null||row.king==null||row.placed==null)return null;
    return {bulb:row.bulb|0,king:row.king|0,placed:row.placed|0};
  }
  function replayFest(){
    const rows=journal().games.filter(g=>g.origin==='story-t07-replay-scene'&&g.pid===pid()&&g.ep===4&&g.level==='closed');
    return rows.length?rows[rows.length-1]:null;
  }
  function view(){
    const d=derive();
    if(hand&&hand.replay&&hand.level!=='closed'){
      const mine=journal().games.filter(g=>g.origin==='story-t07-replay-scene'&&g.slot===slot()&&g.pid===pid()&&g.level!=='closed');
      if(mine.length)hand=Object.assign({},mine[mine.length-1]);
    }
    const replaying=!!(hand&&hand.replay&&hand.level!=='closed');
    let h='<section class="card stage story-wrap" aria-labelledby="story-title">';
    h+=(d[4]&&!replaying)?'':'<p class="story-kicker">Большой день Сказочного Теремка · глава 7</p>';
    if(!(d[4]&&!replaying))h+='<div class="story-hero">'+(CH?CH.pal('mix','bob','Маг Мармелад',undefined):'')+'</div>';
    h+='<h1 id="story-title">Все друзья вместе</h1>';
    if(replaying){
      h+='<p class="story-state">Это повтор. Прежний праздник и его зачёт остаются.</p>';
      if(hand.ep===1)h+=scene1();
      else if(hand.ep===2)h+=scene2();
      else if(hand.ep===4)h+=scene4();
    }else if(d[4]){
      const first=layoutOf(festRow()), again=layoutOf(replayFest()), shown=again||first;
      let detail='', archive='';
      if(again&&first&&(again.bulb!==first.bulb||again.king!==first.king||again.placed!==first.placed)){
        detail='Сейчас у Булька '+again.bulb+', у Короля '+again.king+', гостей '+again.placed+'.';
        archive='Первый праздник остаётся: '+first.bulb+', '+first.king+' и '+first.placed+'.';
      }else if(shown){
        detail='У Булька '+shown.bulb+', у Короля '+shown.king+', гостей '+shown.placed+'.';
      }else detail='Раскладка в журнале не сохранилась.';
      h+='<p class="story-say">Мармелад: «Праздник на месте.»</p>'+(shown?yardFrom(shown, false):'');
      h+='<button type="button" class="btn story-finale-exit" data-act="map">Закончить</button>';
      h+='<p class="fest-sr">'+detail+'</p>';
      if(archive)h+='<details class="fest-archive"><summary>Первый праздник</summary><p>'+archive+'</p></details>';
      h+='<p class="story-next">Семь сюжетных глав — это история праздника. Вся математика этим не закрывается.</p>'+facts();
      h+='<p class="story-state">Любимый остров, если хочешь:</p>';
      [['see','Бульк'],['to10','Тестик'],['split','Желе'],['teen','Король'],['add','Капелька'],['sub','Хинкалик'],['mix','Мармелад']].forEach(x=>{
        h+=BTN+'storyFav" data-isl="'+x[0]+'">'+x[1]+'</button>';
      });
    }else{
      const trip=t06();
      const left=trip?(trip.stock|0)-(trip.sent1|0)-(trip.sent2|0):0;
      const open=draftRow();
      const sceneNow=!hand||!hand.aside?(
        (hand&&hand.replay&&hand.level!=='closed'&&(hand.ep===1||hand.ep===2||hand.ep===4))
        ||(!d[1]&&open&&open.ep===1&&!pending(1))
        ||(d[1]&&!d[2]&&open&&open.ep===2&&!pending(2))
        ||(d[3]&&!d[4]&&open&&open.ep===4)
      ):false;
      if(!sceneNow){
        h+=trip?'<p class="story-say">Мармелад: «Бульку привезли '+trip.sent1+', Королю '+trip.sent2+'. На складе '+(left?'ещё '+left:'ничего не осталось')+'. Для праздника им нужны места и угощение. Сначала пойми, о чём просят.»</p>'
          +'<div class="story-pile story-arrival" role="group" aria-label="Доставлено Бульку '+(trip.sent1|0)+', Королю '+(trip.sent2|0)+', склад '+left+'">'
          +'<span class="story-drop"><b>Бульку</b>'+rows(trip.sent1,'guest')+'</span>'
          +'<span class="story-drop"><b>Королю</b>'+rows(trip.sent2,'guest')+'</span>'
          +'<span class="story-drop"><b>Склад</b>'+rows(left,'guest')+'</span></div>'
          :'<p class="story-say">Мармелад: «Сначала пойми, о чём просят. Потом сам реши, что на празднике раньше.»</p>';
      }
      if(app.S.mixFormBlocked)h+='<p class="story-state">Черновик примера в уме хранит форму «'+app.S.mixFormBlocked+'», но движок выбирает форму заново. Другой пример не подставлен, серия не засчитана.</p>';
      if(sceneNow){
        if(hand&&hand.replay&&hand.level!=='closed'&&hand.ep===1)h+=scene1();
        else if(hand&&hand.replay&&hand.level!=='closed'&&hand.ep===2)h+=scene2();
        else if(hand&&hand.replay&&hand.level!=='closed'&&hand.ep===4)h+=scene4();
        else if(!d[1]&&open&&open.ep===1&&!pending(1))h+=scene1();
        else if(d[1]&&!d[2]&&open&&open.ep===2&&!pending(2))h+=scene2();
        else if(d[3]&&!d[4]&&open&&open.ep===4)h+=scene4();
        h+=BTN+'storyAside">К занятиям</button>';
      }
    }
    const sceneOpen=h.includes('data-act="storyAside"')||(replaying&&hand&&(hand.ep===1||hand.ep===2||hand.ep===4));
    const lessonOpen=[1,2,3,4].some(ep=>replayTry(ep,'open')||pending(ep)||replayWaiting(ep));
    if(!sceneOpen||lessonOpen)h+='<ol class="story-list">'+[1,2,3,4].map(ep=>epRow(ep,d)).join('')+'</ol>';
    h+='<div class="row"><button type="button" class="btn ghost" data-act="map">← На карту</button></div></section>';
    return h;
  }
  function focusPart(part){
    const exit=!part&&document.querySelector('.story-finale-exit');
    const el=exit||(part?document.querySelector('.story-wrap [data-part="'+part+'"]'):document.querySelector('.story-wrap [data-act="storyAsk"],.story-wrap [data-act="storyPlan"],.story-wrap [data-act="storyFest"],.story-wrap [data-act="storyFestBack"],.story-wrap [data-act="storyEp7"],.story-wrap [data-act="storyBack7"],.story-wrap [data-act="map"]'));
    if(el)el.focus({preventScroll:true});
  }
  function focusMain(){ focusPart(''); }
  function open(){ active=null; app.go('storyT07',{island:null}); if(PH&&PH.heroes&&PH.heroes.mix)root.AUDIO.say(PH.heroes.mix.hello); focusMain(); }
  function credit(ep,rec){
    if(lastEntry(ep)||!root.__insights)return;
    root.__insights.logGame(Object.assign({game:'story-t07-'+ep},rec));
    if(hand){ hand.level='closed'; saveDraft(); }
  }
  ext.views.storyT07=view;
  ext.acts.storyT07=open;
  ext.acts.storyAside=()=>{ sync(); if(hand){ hand.aside=1; saveDraft(); } app.go('storyT07',{island:null}); focusMain(); };
  ext.acts.storyEp7=(a)=>{
    const ep=Number(a.dataset.ep), d=derive();
    if(!t06()||d[ep]||(ep>1&&!d[ep-1]))return;
    if(pending(ep)){ app.go('storyT07',{island:null}); focusMain(); return; }
    if(ep===3){
      if(islandLocked())return;
      begin(3,'mix',1);
      return;
    }
    const row=draftRow();
    if(!(row&&row.ep===ep&&row.level!=='closed'))fresh(ep);
    else hand=Object.assign({},row);
    if(hand)hand.aside=0;
    app.go('storyT07',{island:null}); focusMain();
  };
  ext.acts.storyTrain7=()=>{ if(!islandLocked()){ app.S.storyHold=0; app.S.resume=null; app.S.replayPhase=0; app.startSession('mix'); } };
  function freshReplay(ep){
    const salt=(t06()||{}).at|0;
    hand={ep:ep,replay:1,pid:pid(),kind:ep===1?KINDS[Math.abs(salt)%3]:'',picked:'',order:'',jobs:[],job:0,placed:0,bulb:null,king:null,leftNamed:0,leftSet:0,errors:0,help:false,ok:false,msg:'',ready:0,model:0,level:'open'};
    saveDraft();
  }
  ext.acts.storyReplay7=(a)=>{
    const ep=Number(a.dataset.ep);
    if(!lastEntry(ep)||ep>4)return;
    const openLesson=replayTry(ep,'open');
    if(openLesson&&openLesson.item&&openLesson.item.key){
      const scene=journal().games.filter(g=>g.origin==='story-t07-replay-scene'&&g.pid===pid()&&g.ep===ep&&g.level!=='closed').pop();
      hand=Object.assign({ep:ep,replay:1,pid:pid(),level:'open'}, scene||{});
      hand.replay=1; hand.level='open'; hand.ep=ep; hand.pid=pid();
      begin(ep, openLesson.skill, openLesson.phase||1);
      return;
    }
    if(ep===3){
      hand={ep:3,replay:1,pid:pid(),level:'open'};
      begin(3,'mix',1);
      return;
    }
    const rows=journal().games.filter(g=>g.origin==='story-t07-replay-scene'&&g.pid===pid()&&g.ep===ep&&g.level!=='closed');
    if(rows.length)hand=Object.assign({},rows[rows.length-1]);
    else freshReplay(ep);
    app.S.resume=null;
    app.go('storyT07',{island:null}); focusMain();
  };
  ext.acts.storyAsk=(a)=>{
    sync(); if(!hand||hand.ep!==1||(lastEntry(1)&&!hand.replay))return;
    const part=a&&a.dataset&&a.dataset.part;
    if(part==='help'){
      hand.help=true; hand.model=1; hand.modelKind=hand.kind;
      hand.msg='Сначала посмотри модель этой просьбы. Новую выберешь сам следующим шагом.';
      saveDraft(); app.go('storyT07',{island:null}); focusPart('next'); return;
    }
    if(part==='next'&&hand.model){
      const next={add:'sub',sub:'part',part:'add'};
      hand.kind=next[hand.modelKind||hand.kind]||'add';
      hand.model=0; hand.picked=''; hand.msg='Новая просьба. Выбери действие сам.';
      hand.aside=0;
      saveDraft(); app.go('storyT07',{island:null}); focusPart('add'); return;
    }
    if(part!==hand.kind){
      hand.errors++; hand.ok=false;
      hand.msg=hand.kind==='add'?'Здесь друзья сходятся. Их не отправляют и не ищут пустые места.':hand.kind==='sub'?'Здесь часть уезжает. Это не сбор всех и не поиск пустых мест.':'Здесь нужно узнать, сколько не хватает до десяти. Это не сбор и не отправка.';
      saveDraft(); app.go('storyT07',{island:null}); focusPart(part); return;
    }
    hand.picked=part; saveDraft();
    begin(1, SKILL[part], PHASE[part]);
  };
  ext.acts.storyPlan=(a)=>{
    sync(); if(!hand||hand.ep!==2||(lastEntry(2)&&!hand.replay))return;
    const part=a&&a.dataset&&a.dataset.part;
    const g=guestsOf();
    if(!hand.order){
      if(part!=='seats'&&part!=='treats')return;
      hand.order=part; hand.jobs=part==='seats'?['seats','treats']:['treats','seats']; hand.job=0;
      hand.msg=''; saveDraft(); app.go('storyT07',{island:null}); return;
    }
    if(part!=='go')return;
    const job=hand.jobs[hand.job];
    if(!job)return;
    saveDraft();
    begin(2, SKILL[job], PHASE[job]);
  };
  ext.acts.storyFest=(a)=>{
    sync(); if(!hand||hand.ep!==4||(lastEntry(4)&&!hand.replay))return;
    ensureJobs();
    const part=a&&a.dataset&&a.dataset.part;
    const trip=t06(), g=guestsOf(), cap=seatsOf();
    const job=hand.jobs[hand.job]||'cargo';
    if(part==='help'&&job==='cargo'){
      hand.help=true; hand.cargoModel=1; hand.leftNamed=0; hand.leftSet=0; hand.ok=false;
      hand.msg='Модель другого груза. Потом назови остаток уже этого склада.';
      saveDraft(); app.go('storyT07',{island:null}); return;
    }
    if(part==='own'){ hand.cargoModel=0; saveDraft(); app.go('storyT07',{island:null}); return; }
    if(job==='cargo'){
      const need=(trip.stock|0)-(trip.sent1|0)-(trip.sent2|0);
      if(part==='zero'){ hand.leftNamed=0; hand.leftSet=1; }
      else if(part==='more'){ hand.leftNamed++; hand.leftSet=1; }
      else if(part==='less'&&hand.leftNamed>0){ hand.leftNamed--; hand.leftSet=1; }
      else if(part==='check'){
        if(hand.leftSet&&hand.leftNamed===need){ hand.ready=1; hand.ok=true; hand.msg='Склад сходится. Гости при этом остаются на празднике.'; }
        else { hand.errors++; hand.ok=false; hand.msg='Названный остаток груза не сходится со складом.'; }
      }
    }else if(job==='seats'){
      if(part==='more'&&hand.placed<cap)hand.placed++;
      else if(part==='less'&&hand.placed>0)hand.placed--;
      else if(part==='check'){
        if(g>cap){ hand.errors++; hand.ok=false; hand.msg='Мест меньше, чем гостей. Лишних посадить нельзя.'; }
        else if(hand.placed===g){ hand.ok=true; hand.job++; if(hand.job>=2){ hand.jobs.push('cargo'); hand.msg='Теперь остаток груза на складе.'; } else hand.msg='Дальше второе дело.'; }
        else { hand.errors++; hand.ok=false; hand.msg='Посажено не столько, сколько гостей, и не больше мест.'; }
      }
    }else{
      if(part==='bulb')hand.bulb=(hand.bulb|0)+1;
      else if(part==='king')hand.king=(hand.king|0)+1;
      else if(part==='unbulb'&&hand.bulb>0)hand.bulb--;
      else if(part==='unking'&&hand.king>0)hand.king--;
      else if(part==='check'){
        const sum=(hand.bulb|0)+(hand.king|0);
        if(sum===g){ hand.ok=true; hand.job++; if(hand.job>=2){ hand.jobs.push('cargo'); hand.msg='Столы сходятся. Теперь остаток груза.'; } else hand.msg='Дальше второе дело.'; }
        else { hand.errors++; hand.ok=false; hand.msg='На двух столах вместе не '+g+'. Подойдёт другое разложение.'; }
      }
    }
    saveDraft(); app.go('storyT07',{island:null});
    if(hand&&hand.ready)focusPart('');
    else focusPart(part||'check');
  };
  ext.acts.storyFestBack=()=>{
    if(hand&&hand.replay&&hand.ready){
      if(root.__insights&&!journal().games.some(g=>g.origin==='story-t07-replay'&&g.ep===4&&g.since===hand.since))root.__insights.logGame({game:'ten-bridge',origin:'story-t07-replay',level:'together',ep:4,since:hand.since,rounds:3,errors:hand.errors|0,supported:hand.help?1:0});
      hand.level='closed'; saveDraft();
      app.go('storyT07',{island:null}); focusMain(); return;
    }
    if(!lastEntry(4)){
      const row=draftRow();
      if(row&&row.ready)credit(4,{level:'together',rounds:3,errors:row.errors|0,supported:row.help?1:0,order:(lastEntry(2)||{}).order||''});
    }
    app.go('storyT07',{island:null}); focusMain();
  };
  ext.acts.storyFav=(a)=>{
    const id=a&&a.dataset&&a.dataset.isl;
    if(!id||!app.E.SK[id])return;
    app.go('map',{island:id});
  };
  function tally(a){
    const bound=a.replay?replayTry(a.ep,'closed'):lesson(a.ep);
    const until=bound&&bound.since===a.at&&typeof bound.at==='number'?bound.at:null;
    const window=journal().tasks.filter(t=>t.at>=a.at&&(until==null||t.at<=until)&&(t.since==null||t.since===a.at));
    const qual=window.filter(t=>t.sk===a.skill&&(t.ph||1)===a.phase);
    if(!window.length||qual.length!==window.length)return null;
    return {rounds:qual.length, errors:qual.reduce((n,t)=>n+(t.w||0),0), supported:qual.filter(t=>(t.ex||0)>0||t.nl).length};
  }
  ext.acts.storyBack7=(a)=>{
    if(!active){
      const ep=Number(a&&a.dataset&&a.dataset.ep)||0;
      const waiting=ep?replayWaiting(ep):[1,2,3,4].map(replayWaiting).filter(Boolean).pop();
      if(waiting)active={ep:waiting.ep,at:waiting.since,skill:waiting.skill||(waiting.ep===3?'mix':'add'),phase:waiting.phase||1,replay:1};
      else{
        const lessonEp=ep||[1,2,3].find(n=>pending(n));
        const row=lessonEp&&lesson(lessonEp);
        if(row&&row.level==='closed')active={ep:lessonEp,at:row.since,skill:row.skill||(lessonEp===3?'mix':'add'),phase:row.phase||1};
      }
    }
    const back=active; active=null;
    if(back&&back.replay&&root.__insights){
      const got=tally(back);
      if(back.ep===2&&hand&&hand.replay){
        hand.job=(hand.job|0)+1;
        hand.rounds=(hand.rounds|0)+(got?got.rounds:0);
        hand.seriesErrors=(hand.seriesErrors|0)+(got?got.errors:0);
        hand.seriesHelp=(hand.seriesHelp|0)+(got?got.supported:0);
        hand.msg='Это дело готово.'; saveDraft();
        if(hand.job<2){ app.go('storyT07',{island:null}); focusMain(); return; }
        if(!journal().games.some(g=>g.origin==='story-t07-replay'&&g.ep===2&&g.since===hand.since))root.__insights.logGame({game:'ten-bridge',origin:'story-t07-replay',level:'plan',ep:2,since:hand.since,rounds:hand.rounds,errors:hand.seriesErrors,supported:hand.seriesHelp,order:hand.order});
        hand.level='closed'; saveDraft();
        app.go('storyT07',{island:null}); focusMain(); return;
      }
      const already=journal().games.some(g=>g.origin==='story-t07-replay'&&g.ep===back.ep&&g.since===back.at);
      if(!already&&got)root.__insights.logGame({game:'ten-bridge',origin:'story-t07-replay',level:'ph'+back.phase,ep:back.ep,since:back.at,rounds:got.rounds,errors:got.errors+(hand&&hand.errors||0),supported:got.supported||(hand&&hand.help?1:0)});
      if(hand&&hand.replay){ hand.level='closed'; saveDraft(); }
      app.go('storyT07',{island:null}); focusMain(); return;
    }
    if(back&&root.__insights){
      const got=tally(back);
      if(back.ep===1&&!lastEntry(1)&&got){
        const row=draftRow();
        if(row){ row.settledSince=back.at; hand=Object.assign({},row); }
        credit(1,{level:'ph1',rounds:got.rounds,since:back.at,skill:back.skill,errors:got.errors+(row&&row.errors||0),supported:got.supported||(row&&row.help?1:0)});
      }else if(back.ep===2&&!lastEntry(2)&&got){
        sync();
        if(hand&&hand.ep===2){
          hand.job=(hand.job|0)+1; hand.rounds=(hand.rounds|0)+got.rounds;
          hand.seriesErrors=(hand.seriesErrors|0)+got.errors; hand.seriesHelp=(hand.seriesHelp|0)+got.supported;
          hand.settledSince=back.at; hand.msg='Это дело готово.'; saveDraft();
          if(hand.job>=2)credit(2,{level:'plan',rounds:hand.rounds,since:back.at,order:hand.order,errors:hand.seriesErrors,supported:hand.seriesHelp});
        }
      }else if(back.ep===3&&!lastEntry(3)&&got){
        root.__insights.logGame({game:'story-t07-3',level:'ph1',rounds:got.rounds,since:back.at,errors:got.errors,supported:got.supported});
      }
    }
    app.go('storyT07',{island:null}); focusMain();
  };
  chain('lessonSnap',(info)=>{
    if(!active||!info||!info.item||!info.item.key)return '';
    const replay=active.replay?1:0;
    root.__insights&&root.__insights.logGame({game:'ten-bridge',origin:replay?'story-t07-replay-draft':'story-t07-lesson',slot:(replay?'t07-replay-try-':'t07-lesson-')+pid()+'-'+active.ep,level:info.closed?'closed':'open',rounds:0,ep:active.ep,pid:pid(),since:active.at,skill:active.skill,form:info.form||'',replay:replay,
      len:info.len,phase:info.phase,count:info.count,results:info.results,item:info.item,si:info.si,wr:info.wr,kp:info.kp,clean:info.clean,done:info.done,taps:info.taps,heard:info.heard,ins:info.ins,earned:info.earned});
    return '';
  });
  chain('leave',(screen)=>{ if(active&&screen!=='task'&&screen!=='break')active=null; return ''; });
  chain('islandExtra',(id)=>{
    if(id!=='mix'||!t06())return '';
    if(islandLocked())return '<p class="story-badge">Большой день: башня откроется после Гномьей горы</p>';
    return '<button type="button" class="btn ghost" data-act="storyT07">'+(derive()[4]?'К Мармеладу · праздник':'К Мармеладу · Большой день')+'</button>';
  });
  chain('breakExtra',()=> active?BTN+'storyBack7">Вернуться к Мармеладу</button>':'');
  const REG=root.__storyMap;
  if(REG)REG.items.push({
    done:()=>!!derive()[4],
    action:()=>{
      if(!t06()||derive()[4])return null;
      const d=derive();
      if(d[3]&&!d[4]){
        const row=draftRow();
        if(row&&row.ready)return {act:'storyFestBack',label:'Закончить праздник'};
      }
      if(!islandLocked())return {act:'storyT07',label:'Помочь Мармеладу'};
      return null;
    }
  });
  if(app.S.screen==='map')app.render();
})(window);

/* Журнал наблюдений для родителя: ошибки по шагам, подсказки, разборы, усталость, игры на чувство числа.
   Хранится только на этом устройстве в отдельном ключе; terem_v3 и награды не меняет. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext,I=root.TEREM_INSIGHTS;
  if(!app||!ext||!I)return;
  const KEY='terem_insights_v1';
  let ST;
  try{ST=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){ST=null;}
  if(!ST||typeof ST!=='object'||ST.v!==1||typeof ST.profiles!=='object'||!ST.profiles)ST={v:1,profiles:{}};
  function store(){try{localStorage.setItem(KEY,JSON.stringify(ST));}catch(e){}}
  function prof(id){const pid=id||(app.P()||{}).id;if(!pid)return null;const p=ST.profiles[pid];if(p&&Array.isArray(p.tasks)&&Array.isArray(p.fatigue)&&Array.isArray(p.games))return p;return ST.profiles[pid]=I.emptyProfile();}
  const ins=t=>t._ins||(t._ins={wr:{},nl:0,ex:0});
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let series=[];                        // записи заданий текущей серии — для признаков усталости

  function chain(name,fn){const prev=ext.hooks[name];ext.hooks[name]=function(...a){let out='';try{out=prev?prev.apply(this,a):'';}catch(e){out='';}const mine=fn.apply(this,a);return (out||'')+(mine||'');};}
  function chainValue(name,fn){const prev=ext.hooks[name];ext.hooks[name]=function(...a){let v;try{v=prev?prev.apply(this,a):'';}catch(e){v='';}const mine=fn.apply(this,a);return v||mine||'';};}

  chainValue('sessionLen',()=>{series=[];return '';});
  chain('answer',(t,st,ok)=>{
    if(!t||!st||ok)return '';
    const r=I.role(t.skill,t.ph,t.si),x=ins(t);x.wr[r]=(x.wr[r]||0)+1;
    if(t.wr===1&&st.ex)x.ex++;          // вторая ошибка запускает разбор по шагам
    return '';
  });
  chain('taskDone',(t)=>{
    const p=prof();if(!p||!t)return '';
    const S=app.S,len=S.lessonLen||app.DB.parent.session||8;
    const rec=I.taskRecord(t,{now:Date.now(),pos:S.count,len,focus:!!(root.__focus&&root.__focus.active())});
    I.push(p,'tasks',rec);series.push(rec);store();
    return '';
  });
  // «Объясни мне» / «Послушать ещё раз» вручную — тоже разбор.
  document.getElementById('app').addEventListener('click',e=>{
    const a=e.target.closest('[data-act="explain"]');if(!a||app.S.screen!=='task'||!app.S.t)return;
    ins(app.S.t).ex++;
  },true);

  function logFatigue(reason,choice){const p=prof();if(!p)return;I.push(p,'fatigue',{at:Date.now(),reason,choice:choice||'shown'});store();}
  function logGame(res){const p=prof();if(!p||!res)return;I.push(p,'games',Object.assign({at:Date.now()},res));store();}
  function markNumberLine(t){ins(t).nl=1;}

  /* ---------- отчёт в кабинете родителя ---------- */
  const STEP_ORDER=['toTen','rest','total','whole','answer'];
  function report(p){
    const s=I.summarize(prof(p.id),Date.now(),14),adv=I.advice(s);
    let h='<section class="ins-report" aria-labelledby="ins-title"><h3 id="ins-title">Трудности и подсказки · 14 дней</h3>';
    if(s.n){
      h+='<div class="stats ins-stats"><div><b>'+s.medianSec+' с</b><span>обычно на задание</span></div><div><b>'+s.nl+'</b><span>числовая прямая</span></div><div><b>'+s.ex+'</b><span>разборов</span></div><div><b>'+s.fatigue.n+'</b><span>перерывов</span></div></div>';
      const ws=I.weakStep(s);
      const sk=['add','sub','mix'].filter(k=>s.bySkill[k]&&s.bySkill[k].w>0);
      if(sk.length){
        h+='<p class="muted">Где ошибается в примерах «через десяток» (число ошибок на шаге):</p><ul class="skl ins-steps">';
        sk.forEach(k=>{const b=s.bySkill[k];STEP_ORDER.forEach(r=>{if(b.roles[r])h+='<li><span>'+I.SKILL_NAMES[k]+' · '+I.roleName(r,k)+'</span><b'+(ws&&ws.role===r?' class="ins-top"':'')+'>'+b.roles[r]+'</b></li>';});});
        h+='</ul>';
      }
      const other=Object.keys(s.bySkill).filter(k=>!['add','sub','mix'].includes(k)&&s.bySkill[k].w>0);
      if(other.length)h+='<p class="muted">Ошибки в опорных навыках: '+other.map(k=>I.SKILL_NAMES[k]+' — '+s.bySkill[k].w).join(', ')+'.</p>';
      if(s.half.first[0]>=4&&s.half.second[0]>=4)h+='<p class="muted">Задания с ошибкой: в начале серии '+Math.round(s.half.firstRate*100)+'%, в конце '+Math.round(s.half.secondRate*100)+'%.</p>';
      if(s.hard.length)h+='<p class="muted">Больше всего ошибок: '+s.hard.map(x=>'<b>'+esc(I.pretty(x.key))+'</b>').join(', ')+'.</p>';
    }else h+='<p class="muted">Записей пока нет. Журнал начинается с версии 3.6.0.</p>';
    const games=Object.keys(s.games);
    if(games.length)h+='<p class="muted">Игры с числами: '+games.map(g=>esc(I.GAME_NAMES[g]||g)+' — '+s.games[g].plays+' ('+s.games[g].errors+' ош., с подсказкой '+s.games[g].supported+')').join('; ')+'.</p>';
    h+='<h3>Что попробовать за столом</h3><div class="ins-advice">'+adv.map(a=>'<div class="ins-tip"><b>'+esc(a.title)+'</b><p>'+esc(a.text)+'</p></div>').join('')+'</div>';
    h+='<p class="muted ins-note">Это наблюдения за игрой, а не диагноз. Если трудности держатся месяцами, обсудите их с учителем, нейропсихологом или дефектологом — этот текст можно показать им.</p>';
    h+='<button type="button" class="btn ghost small" data-act="insCopy">Скопировать отчёт</button>';
    if(app.S.insText)h+='<textarea class="input ins-text" readonly rows="6" aria-label="Текст отчёта">'+esc(app.S.insText)+'</textarea>';
    return h+'</section>';
  }
  chain('parentStats',p=>p?report(p):'');
  ext.acts.insCopy=(a,id,p)=>{
    const s=I.summarize(prof(p.id),Date.now(),14),txt=I.reportText(p.name,s,I.advice(s));
    app.S.insText=txt;app.render();
    const box=document.querySelector('.ins-text');if(box)box.select();
    try{navigator.clipboard.writeText(txt).then(()=>app.toast('Отчёт скопирован.')).catch(()=>app.toast('Выделите текст и скопируйте.'));}catch(e){app.toast('Выделите текст и скопируйте.');}
  };
  chain('leave',screen=>{if(screen!=='parent')app.S.insText='';return '';});

  root.__insights={logFatigue,logGame,markNumberLine,series:()=>series.slice(),get ST(){return ST;},prof,KEY};
})(window);

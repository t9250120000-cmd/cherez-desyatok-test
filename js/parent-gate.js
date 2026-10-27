/* Барьер для взрослого перед созданием первого кода родителя (правило App Store 1.3 для детских приложений)
   и подтверждение покупки в магазине желаний. Логику кабинета и магазина не меняет: после подтверждения
   срабатывает прежний обработчик игры. */
(function(root){
  'use strict';
  const app=root.__app,ext=root.__ext;
  if(!app||!ext)return;
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let pass=null,overlay=null;

  // Повторить исходное действие игры: на время клика наш перехват отключён.
  function replay(act,id){
    pass=act;const b=document.createElement('button');b.type='button';b.hidden=true;b.dataset.act=act;if(id)b.dataset.id=id;
    document.getElementById('app').appendChild(b);try{b.click();}finally{b.remove();pass=null;}
  }
  function close(){if(overlay){overlay.remove();overlay=null;}}
  function open(html,focusSel){
    close();overlay=document.createElement('div');overlay.className='focus-rest pg-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','pg-title');
    overlay.innerHTML='<div class="focus-rest-card pg-card">'+html+'</div>';document.body.appendChild(overlay);
    const f=overlay.querySelector(focusSel||'button');if(f)f.focus({preventScroll:true});
  }

  /* ---------- барьер для взрослого ---------- */
  const gate={a:0,b:0,buf:'',tries:0};
  function question(){gate.a=12+Math.floor(Math.random()*17);gate.b=3+Math.floor(Math.random()*6);gate.buf='';}
  function gateView(msg){
    const keys=[1,2,3,4,5,6,7,8,9,'del',0,'ok'].map(k=>'<button type="button" class="key'+(k==='ok'?' go':k==='del'?' del':'')+'" data-pg="'+k+'"'+(k==='del'?' aria-label="Стереть"':'')+'>'+(k==='del'?'⌫':k==='ok'?'Готово':k)+'</button>').join('');
    open('<h2 id="pg-title">Для взрослых</h2><p>Кабинет родителя защищается кодом. Чтобы создать код, решите пример:</p><p class="pg-q"><b>'+gate.a+' × '+gate.b+'</b> = <span class="pg-buf" aria-live="polite">'+(gate.buf||'?')+'</span></p>'+(msg?'<p class="pg-msg" role="status">'+msg+'</p>':'')+'<div class="keys pg-keys">'+keys+'</div><button type="button" class="btn ghost" data-pg="cancel">Отмена</button>','[data-pg="1"]');
  }
  function gateKey(k){
    if(k==='cancel'){close();return;}
    if(k==='del'){gate.buf=gate.buf.slice(0,-1);gateView();return;}
    if(k==='ok'){
      if(!gate.buf)return;
      if(+gate.buf===gate.a*gate.b){close();replay('parent');return;}
      gate.tries++;question();gateView('Неверно. Вот другой пример.');return;
    }
    if(gate.buf.length<4){gate.buf+=k;gateView();}
  }
  Object.defineProperty(ext.acts,'parent',{configurable:true,enumerable:true,get(){
    if(pass==='parent'||app.DB.parent.pin)return undefined;
    return ()=>{gate.tries=0;question();gateView();};
  }});

  /* ---------- подтверждение покупки ---------- */
  Object.defineProperty(ext.acts,'buy',{configurable:true,enumerable:true,get(){
    if(pass==='buy')return undefined;
    return (a,id,p)=>{
      const w=app.DB.parent.wishes.find(x=>x.id===id);if(!w||!p)return;
      const need=Math.max(1,Math.ceil(w.price/(app.DB.parent.rate||1)));if(p.coins<need)return;
      open('<h2 id="pg-title">Купить подарок?</h2><p><b>'+esc(w.name)+'</b></p><p>Спишется <b>'+need+' ●</b>. Останется '+(p.coins-need)+' ●.</p><button type="button" class="btn" data-pg-buy="'+esc(id)+'">Купить</button><button type="button" class="btn ghost" data-pg="cancel">Не сейчас</button>','[data-pg="cancel"]');
    };
  }});

  document.addEventListener('click',e=>{
    if(!overlay)return;
    const b=e.target.closest&&e.target.closest('[data-pg],[data-pg-buy]');if(!b||!overlay.contains(b))return;
    if(b.dataset.pgBuy){const id=b.dataset.pgBuy;close();replay('buy',id);return;}
    gateKey(b.dataset.pg);
  });
  root.addEventListener('keydown',e=>{
    if(!overlay)return;
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(overlay.querySelector('.pg-keys')&&/^([0-9]|Backspace|Enter)$/.test(e.key)){
      if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.pg==='cancel'){e.preventDefault();e.stopImmediatePropagation();close();return;}
      if(/^[0-9]$/.test(e.key)){e.preventDefault();e.stopImmediatePropagation();gateKey(e.key);return;}
      if(e.key==='Backspace'){e.preventDefault();e.stopImmediatePropagation();gateKey('del');return;}
      if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();gateKey('ok');return;}
    }
    if(overlay.contains(e.target)){e.stopPropagation();return;}
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  const prevLeave=ext.hooks.leave;
  ext.hooks.leave=function(...a){close();try{return prevLeave?prevLeave.apply(this,a):'';}catch(e){return '';}};
  root.__parentGate={get open(){return !!overlay;},answer:()=>gate.a*gate.b};
})(window);

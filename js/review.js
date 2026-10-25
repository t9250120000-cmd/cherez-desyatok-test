/* Review-only entry. Uses a separate ordinary demo profile; production entry does not load this file. */
(function(){
'use strict';
const frame=document.querySelector('#game');let mode='map',phase=1,dark=false,ready=false,demoId=sessionStorage.getItem('terem_visual_demo_id');
function win(){return frame.contentWindow;}
function demo(){const w=win(),a=w.__app;let p=a.DB.profiles.find(p=>p.id===demoId);if(!p){a.go('newProfile');w.document.querySelector('#nameInput').value='Соня · демо';w.document.querySelector('[data-act="createProfile"]').click();p=a.P();demoId=p.id;sessionStorage.setItem('terem_visual_demo_id',demoId);}else if(a.DB.active!==p.id){a.go('profiles');w.document.querySelector('[data-act="pickProfile"][data-id="'+p.id+'"]').click();}return p;}
function show(){if(!ready)return;const w=win(),a=w.__app,p=demo();w.document.documentElement.dataset.theme=dark?'dark':'light';w.AUDIO.unlock();
 if(mode==='map')a.go('map',{island:null});
 else{p.skills[mode].phase=phase;a.startSession(mode);const item=mode==='add'?{a:8,b:5,key:'8+5'}:{m:13,s:6,key:'13-6'};a.S.t=a.E.G[mode](phase,item,{});a.S.t.startAt=Date.now();a.S.kp='';a.S.busy=false;a.render();w.AUDIO.say(a.curStep().instr);}
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));document.querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.phase===phase)));document.querySelector('#status').textContent=mode==='map'?'Нажмите на остров, чтобы познакомиться с героем.':phase===1?'Нажимайте на фишки: всё переселение работает.':phase===2?'Введите ответ на текущий вопрос.':'Теремки скрыты: ответьте в уме.';
}
frame.addEventListener('load',()=>{const timer=setInterval(()=>{if(!win().__app)return;clearInterval(timer);ready=true;show();},30);});
document.querySelector('#modes').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b){mode=b.dataset.mode;show();}});
document.querySelector('#phases').addEventListener('click',e=>{const b=e.target.closest('[data-phase]');if(b){phase=+b.dataset.phase;show();}});
document.querySelector('#theme').addEventListener('click',()=>{dark=!dark;document.querySelector('#theme').textContent=dark?'Дневная тема':'Вечерняя тема';if(ready)win().document.documentElement.dataset.theme=dark?'dark':'light';});
document.querySelector('#restart').addEventListener('click',show);
})();

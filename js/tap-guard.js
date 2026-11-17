/* Защита от двойного касания в играх с числами и на дорожке: если после нажатия на этом же месте экрана
   появилась другая кнопка (например «Следующее задание» вместо ответа или «Подсказка» вместо «Бросить кубик»),
   она первые 450 мс не срабатывает. Ребёнок с СДВГ часто нажимает дважды — так он не пропустит успех и не
   возьмёт подсказку случайно. Нажатия в других местах экрана не задерживаются. Логику игр не меняет. */
(function(root){
  'use strict';
  const app=root.__app;if(!app)return;
  const SCREENS=new Set(['numberGames','foundations','senseGames','numberPlay','mathAdventures']);
  const SEL='[data-ng],[data-picnic],[data-sg],[data-np],[data-ma]';
  const MS=450;
  let last=null,guard=null;      // last — точка и время последнего нажатия; guard — кнопка под этой точкой после перерисовки
  const host=document.getElementById('app');
  const under=(x,y)=>{const el=document.elementFromPoint(x,y);return el&&el.closest?el.closest(SEL):null;};
  new MutationObserver(()=>{
    if(!last||!SCREENS.has(app.S.screen)||Date.now()-last.t>MS)return;
    const b=under(last.x,last.y);
    // Кнопки-счётчики («+ Положить», «− Убрать») можно нажимать подряд: та же кнопка после перерисовки не блокируется.
    const same=b&&b.hasAttribute('data-repeat')&&last.el&&b.getAttribute('data-repeat')===last.el.getAttribute('data-repeat');
    if(b&&b!==last.el&&!same)guard={el:b,until:last.t+MS};
  }).observe(host,{childList:true});
  host.addEventListener('click',e=>{
    if(!SCREENS.has(app.S.screen))return;
    const b=e.target.closest(SEL);
    if(b&&guard&&guard.el===b&&Date.now()<guard.until){e.stopImmediatePropagation();e.preventDefault();return;}
    if(b)last={x:e.clientX,y:e.clientY,t:Date.now(),el:b};
  },true);
  root.__tapGuard={ms:MS};
})(window);

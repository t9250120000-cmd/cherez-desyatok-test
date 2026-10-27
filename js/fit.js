/* Подгонка задания под реальную высоту экрана. В приложении iOS страница идёт под «чёлку» и полоску «Домой»
   (viewport-fit=cover), поэтому высота окна обманчива: считаем доступную высоту без безопасных зон.
   fit-short — меньше 900 px, fit-tiny — меньше 800 px (почти все iPhone в приложении и в Safari с панелями). */
(function(root){
  'use strict';
  const probe=document.createElement('div');
  probe.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
  function apply(){
    if(!probe.isConnected)document.body.appendChild(probe);
    const cs=getComputedStyle(probe),avail=root.innerHeight-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0);
    document.body.classList.toggle('fit-short',avail<900);
    document.body.classList.toggle('fit-tiny',avail<800);
    root.__fit={avail:Math.round(avail)};
  }
  // Безопасные зоны в приложении приходят чуть позже первой отрисовки: пересчитываем при каждой смене экрана игры.
  function start(){apply();const host=document.getElementById('app');if(host)new MutationObserver(apply).observe(host,{childList:true});[300,1000,2500].forEach(t=>setTimeout(apply,t));}
  root.addEventListener('resize',apply);root.addEventListener('orientationchange',()=>setTimeout(apply,300));
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})(window);

(async () => {
  const status=document.querySelector('[role=status]');
  const retry=document.querySelector('button');
  retry.onclick=()=>location.reload();
  const scope=new URL('./',location.href);
  addEventListener('hashchange',()=>{ if(new URLSearchParams(location.hash.slice(1)).has('k')) location.reload(); });
  const key=new URLSearchParams(location.hash.slice(1)).get('k');
  const script=new URL('preview-worker.js',scope).href;
  function send(worker,body) {
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel();
      const timer=setTimeout(()=>{channel.port1.close();reject(Error('timeout'));},120000);
      channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};
      worker.postMessage(body,[channel.port2]);
    });
  }
  try {
    if(!navigator.serviceWorker || !crypto.subtle) throw Error('browser');
    const reg=await navigator.serviceWorker.register(script,{scope:scope.href,updateViaCache:'none'});
    const end=Date.now()+20000;
    while ((!reg.active || navigator.serviceWorker.controller?.scriptURL!==script) && Date.now()<end)
      await new Promise(resolve=>setTimeout(resolve,80));
    if(!reg.active || navigator.serviceWorker.controller?.scriptURL!==script) throw Error('worker');
    if (key) status.textContent='Загружаем игру. При первом открытии это может занять немного времени.';
    const result=await send(reg.active,{type:'open',key});
    if(result==='locked'){
      status.textContent='Для первого входа откройте полную ссылку-приглашение.';
      return;
    }
    if(result!=='ready') throw Error(result);
    const entry=new URL('play/qa/act1-preview.html',scope);
    const check=await fetch(entry,{method:'HEAD',cache:'no-store'});
    if(!check.ok || check.headers.get('X-Barsik-Preview')!=='BR130') throw Error('entry');
    history.replaceState(null,'',scope.href);
    location.replace(entry);
  } catch(error) {
    if(error.message==='invalid'){
      status.textContent='Приглашение не подошло. Откройте исходную ссылку целиком.';
    } else {
      status.textContent=error.message==='browser'?'Откройте приглашение в Safari или Chrome.':'Не удалось загрузить игру. Проверьте соединение и попробуйте ещё раз.';
      retry.hidden=false;
    }
  }
})();

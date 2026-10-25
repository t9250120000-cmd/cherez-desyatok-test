/* Full transfer is an additional parent-only flow; the legacy export remains intact. */
(function(root){
'use strict';
function init(){
  const a=root.__app,core=root.TEREM_FULL_TRANSFER,ext=root.__ext;
  if(!a||!core||!ext)return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let dialog=null,pending=null,exportRaw=null,busy=false,recoveryBlocked=false,token=0;
  let overlay=null,nativeModal=true,previousFocus=null,mainHidden=null;
  const parent=()=>a.S.screen==='parent'&&a.S.tab==='settings';
  function keepFocus(e){if(dialog&&!nativeModal&&!dialog.contains(e.target)){e.stopPropagation();(dialog.querySelector('button')||dialog).focus();}}
  function keydown(e){
    e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key!=='Tab'||nativeModal)return;
    const list=Array.from(dialog.querySelectorAll('button:not([disabled]),input:not([hidden]):not([disabled]),a[href]')).filter(x=>x.getClientRects().length);
    if(!list.length){e.preventDefault();dialog.focus();return;}
    const first=list[0],last=list[list.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===dialog)){e.preventDefault();first.focus();}
  }
  function close(){
    if(busy||recoveryBlocked)return;token++;pending=null;exportRaw=null;
    if(dialog){if(nativeModal)dialog.close();dialog.remove();dialog=null;}
    if(overlay){overlay.remove();overlay=null;const host=document.getElementById('app');if(mainHidden===null)host.removeAttribute('aria-hidden');else host.setAttribute('aria-hidden',mainHidden);document.removeEventListener('focusin',keepFocus,true);}
    if(previousFocus?.isConnected)previousFocus.focus();previousFocus=null;
  }
  function show(body){
    if(!dialog){
      previousFocus=document.activeElement;dialog=document.createElement('dialog');nativeModal=typeof dialog.showModal==='function';
      if(!nativeModal){dialog=document.createElement('section');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');overlay=document.createElement('div');overlay.className='transfer-overlay';document.body.append(overlay);overlay.append(dialog);const host=document.getElementById('app');mainHidden=host.getAttribute('aria-hidden');host.setAttribute('aria-hidden','true');document.addEventListener('focusin',keepFocus,true);}
      else document.body.append(dialog);
      dialog.className='transfer-dialog';dialog.setAttribute('aria-labelledby','transfer-title');dialog.setAttribute('tabindex','-1');dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('click',click);dialog.addEventListener('change',change);dialog.addEventListener('keydown',keydown);if(nativeModal)dialog.showModal();
    }
    dialog.innerHTML='<h2 id="transfer-title">Полная копия игры</h2>'+body;
    (dialog.querySelector('button')||dialog).focus();
  }
  const button=(action,text,ghost=false)=>'<button type="button" class="btn'+(ghost?' ghost':'')+'" data-transfer="'+action+'">'+text+'</button>';
  function errorMessage(error){
    const code=error&&error.code;
    if(error?.name==='QuotaExceededError')return 'Не хватает места для безопасного переноса. Освободите место на устройстве. Прежние данные не заменены.';
    if(code==='RECOVERY_REQUIRED')return 'Запись прервалась. Нажмите «Повторить восстановление»; не очищайте данные приложения.';
    if(code==='RESTORE_FAILED_ROLLED_BACK')return 'Перенос не удался. Прежние данные восстановлены. Освободите место и попробуйте снова.';
    if(code==='INVALID_SIZE')return 'Этот файл слишком большой. Нужна полная копия размером до 16 МБ.';
    if(code==='CHECKSUM_MISMATCH')return 'Файл повреждён. Сделайте новую полную копию на исходном устройстве.';
    return 'Не удалось использовать эту копию. Выберите файл полной копии. Старую копию можно загрузить прежней кнопкой в настройках.';
  }
  function fail(error){busy=false;recoveryBlocked=error?.code==='RECOVERY_REQUIRED';if(recoveryBlocked)document.getElementById('app').inert=true;show('<p role="alert">'+esc(errorMessage(error))+'</p>'+button(recoveryBlocked?'reload':'home',recoveryBlocked?'Повторить восстановление':'Назад')+(recoveryBlocked?'':button('close','Закрыть',true)));}
  function home(){pending=null;exportRaw=null;show('<p>Переносит игроков, навыки, монетки, наклейки и всю копилку фактов.</p><p>Файл содержит личные данные, код родителя и фото подарков. Храните его у себя, не публикуйте. Разрешение на микрофон на новом устройстве нужно дать заново.</p><div class="transfer-actions">'+button('export','Сохранить полную копию')+button('choose','Выбрать полную копию',true)+'<input type="file" accept=".json,application/json" data-transfer-file aria-label="Файл полной копии" hidden>'+button('close','Закрыть',true)+'</div>');}
  const onIOS=()=>root.Capacitor?.getPlatform?.()==='ios';
  function prepared(message='Копия подготовлена.'){
    show('<p role="status">'+esc(message)+'</p><p>'+(onIOS()?'Выберите папку в системном окне «Файлы».':'Сохраните файл на устройстве или передайте его себе через системное меню.')+'</p><p class="muted">Не отправляйте файл посторонним: внутри код родителя и данные игроков. Сам файл не зашифрован.</p><div class="transfer-actions">'+(onIOS()?button('nativeSave','Сохранить в «Файлы»'):button('download','Скачать файл')+(typeof root.navigator.share==='function'?button('share','Поделиться файлом',true):''))+button('home','Назад',true)+button('close','Закрыть',true)+'</div>');
  }
  async function click(e){
    const control=e.target.closest('[data-transfer]');if(!control||busy)return;
    const action=control.dataset.transfer;
    if(recoveryBlocked&&action!=='reload')return;
    if(action==='close'){close();return;}if(action==='reload'){root.location.reload();return;}
    if(!parent()){close();return;}if(action==='home'){home();return;}
    if(action==='choose'){dialog.querySelector('[data-transfer-file]').click();return;}
    if(action==='export'){
      const current=++token;busy=true;show('<p role="status">Подготавливаю копию…</p>');
      try{const raw=await core.create(localStorage,a.validBackup);if(current!==token)return;exportRaw=raw;busy=false;
        prepared();
      }catch(error){fail(error);}return;
    }
    if(action==='nativeSave'&&exportRaw&&onIOS()){
      const native=root.Capacitor?.Plugins?.TeremBackup;
      if(typeof native?.exportCopy!=='function'){prepared('Для сохранения в «Файлы» нужно обновление приложения. Данные игры не изменены.');return;}
      busy=true;show('<p role="status">Выберите папку и нажмите «Экспортировать» в системном окне. Можно отменить сохранение.</p>');
      try{const result=await native.exportCopy({raw:exportRaw});busy=false;
        if(result?.saved===true)prepared('iOS подтвердил сохранение копии. Проверьте файл в выбранной папке.');
        else if(result?.cancelled===true)prepared('Сохранение отменено. Можно выбрать папку ещё раз.');
        else prepared('Не удалось сохранить файл. Попробуйте ещё раз. Данные игры не изменены.');
      }catch(_){busy=false;prepared('Не удалось сохранить файл. Проверьте свободное место и попробуйте ещё раз. Данные игры не изменены.');}return;
    }
    if(action==='download'&&exportRaw&&!onIOS()){const url=URL.createObjectURL(new Blob([exportRaw],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='cherez-desyatok-full.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);return;}
    if(action==='share'&&exportRaw&&!onIOS()){
      const file=new File([exportRaw],'cherez-desyatok-full.json',{type:'application/json'});
      if(!root.navigator.canShare?.({files:[file]})){show('<p>Передача файла здесь недоступна. Скачайте его и отправьте себе из приложения «Файлы».</p>'+button('download','Скачать файл')+button('close','Закрыть',true));return;}
      try{await root.navigator.share({files:[file],title:'Полная копия «Через десяток»'});}catch(error){if(error?.name!=='AbortError')fail(error);}return;
    }
    if(action==='restore'&&pending){
      busy=true;show('<p role="status">Восстанавливаю копию. Не закрывайте приложение…</p>');
      try{await core.restore(localStorage,pending,a.validBackup,{confirmed:true});pending=null;root.location.reload();}
      catch(error){fail(error);}return;
    }
  }
  async function change(e){
    if(!e.target.matches('[data-transfer-file]')||!parent()||busy)return;
    const file=e.target.files?.[0];if(!file)return;
    const current=++token;busy=true;
    try{
      if(file.size>16*1024*1024)throw Object.assign(new Error('INVALID_SIZE'),{code:'INVALID_SIZE'});
      const raw=await file.text(),result=await core.inspect(raw,a.validBackup);if(current!==token)return;
      pending=raw;busy=false;
      show('<p>В файле игроков: '+result.preview.profiles.length+'.</p><ul>'+result.preview.profiles.map(p=>'<li>'+esc(p.name)+': '+p.stars+' ★, '+p.coins+' монет, фактов '+p.facts+'</li>').join('')+'</ul><p><strong>Все игроки и прогресс на этом устройстве будут заменены данными из файла.</strong> Сначала сохраните собственную полную копию. Код родителя будет взят из файла; голосовые ответы выключатся.</p><div class="transfer-actions">'+button('restore','Заменить данные этой копией')+button('home','Не заменять',true)+'</div>');
    }catch(error){fail(error);}
  }
  const previous=ext.hooks.parentSettings;
  ext.hooks.parentSettings=(...args)=>(previous?previous(...args):'')+'<h3>Перенос всей игры</h3><p class="muted">В отличие от старой копии включает копилку фактов и Вспышку.</p><button type="button" class="btn ghost small" data-act="fullTransfer">Полная копия и перенос</button>';
  ext.acts.fullTransfer=()=>{if(parent()){root.AUDIO?.stop();home();}};
  const leave=ext.hooks.leave;ext.hooks.leave=(...args)=>{if(!busy)close();return leave?leave(...args):'';};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);

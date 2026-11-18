'use strict';
const root=new URL(self.registration.scope);
const base=new URL('play/',root).pathname;
const packageName='br130-53638b6a20c9b508.bin';
const databaseName='barsik-private-preview-53638b6a20c9b508';
const metaKey=':invitation';
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
const dbPromise=new Promise((resolve,reject)=>{
  const open=indexedDB.open(databaseName,1);
  open.onupgradeneeded=()=>open.result.createObjectStore('files');
  open.onsuccess=()=>resolve(open.result);
  open.onerror=()=>reject(open.error);
});
async function read(key) {
  const db=await dbPromise;
  return new Promise((resolve,reject)=>{
    const req=db.transaction('files').objectStore('files').get(key);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function install(key) {
  const known=await read(metaKey);
  if(!key) return known?'ready':'locked';
  if(!/^[A-Za-z0-9_-]{43}$/.test(key)) return 'invalid';
  const raw=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='),c=>c.charCodeAt(0));
  const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),v=>v.toString(16).padStart(2,'0')).join('');
  if(known) return known===fingerprint?'ready':'invalid';
  const res=await fetch(new URL(packageName,root),{cache:'default',credentials:'omit'});
  if(!res.ok) throw Error('download');
  const encrypted=new Uint8Array(await res.arrayBuffer());
  const cryptoKey=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
  let plain;
  try { plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:encrypted.subarray(0,12)},cryptoKey,encrypted.subarray(12))); }
  catch { return 'invalid'; }
  const size=new DataView(plain.buffer).getUint32(0);
  const offset=4+size;
  const index=JSON.parse(new TextDecoder().decode(plain.subarray(4,offset)));
  if(!index['qa/act1-preview.html'] || !index['qa/act3-preview.html']) throw Error('package');
  const db=await dbPromise;
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('files','readwrite');
    tx.oncomplete=resolve;
    tx.onabort=()=>reject(tx.error||Error('storage'));
    tx.onerror=()=>reject(tx.error);
    const files=tx.objectStore('files');
    for(const [name,[start,length,type]] of Object.entries(index)) {
      files.put(new Blob([plain.subarray(offset+start,offset+start+length)],{type}),name);
    }
    files.put(fingerprint,metaKey);
  });
  return 'ready';
}
self.addEventListener('message',event=>{
  const port=event.ports[0];
  if(!port || event.data?.type!=='open' || !event.source?.url || !event.source.url.startsWith(root.href))return;
  event.waitUntil(install(event.data.key).then(state=>port.postMessage(state),()=>port.postMessage('unavailable')));
});
async function serve(request,name) {
  const blob=await read(name||'index.html');
  if(!(blob instanceof Blob)){
    if(request.mode==='navigate' && !(await read(metaKey)))return Response.redirect(root,302);
    return new Response(null,{status:404});
  }
  const headers=new Headers({'Content-Type':blob.type,'Content-Length':String(blob.size),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Barsik-Preview':'BR130','Referrer-Policy':'no-referrer'});
  const range=request.headers.get('Range');
  if(range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(range);
    let start,end;
    if(match && (match[1]||match[2])) {
      start=match[1]?Number(match[1]):Math.max(0,blob.size-Number(match[2]));
      end=match[1]&&match[2]?Math.min(Number(match[2]),blob.size-1):blob.size-1;
    }
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=blob.size) {
      headers.set('Content-Range','bytes */'+blob.size);headers.set('Content-Length','0');return new Response(null,{status:416,headers});
    }
    headers.set('Content-Range','bytes '+start+'-'+end+'/'+blob.size);headers.set('Content-Length',String(end-start+1));
    return new Response(request.method==='HEAD'?null:blob.slice(start,end+1),{status:206,headers});
  }
  return new Response(request.method==='HEAD'?null:blob,{headers});
}
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);
  if(u.origin!==root.origin || !u.pathname.startsWith(base) || !['GET','HEAD'].includes(event.request.method)) return;
  event.respondWith(serve(event.request,decodeURIComponent(u.pathname.slice(base.length))).catch(()=>new Response(null,{status:503})));
});

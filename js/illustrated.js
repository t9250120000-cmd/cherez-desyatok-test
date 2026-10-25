/* Illustrated screen layer. The learning engine and persistence stay unchanged. */
(function(root){
'use strict';
const CH=root.CH, oldSVG=CH.palSVG;
const asset=name=>new URL('../art/'+name+'.webp',document.currentScript?.src||root.location.href).href;
// Resolve once while currentScript points to this file, not to app.js.
const images={};for(const name of ['bulk-neutral','bulk-happy','bulk-think','map-day','map-night'])images[name]=asset(name);
CH.palSVG=function(id,mood,colOverride){
 const greenAvatar=id==='avatar'&&(!colOverride||colOverride.toLowerCase()===CH.AVATARS[0].toLowerCase());
 if(id!=='see'&&!greenAvatar)return oldSVG(id,mood,colOverride);
 const state=mood==='happy'?'happy':mood==='think'?'think':'neutral';
 return '<svg class="illustrated-pal" viewBox="0 0 100 100" aria-hidden="true"><g class="body"><image href="'+images['bulk-'+state]+'" width="100" height="100"/></g><g class="acc"></g><g class="face"></g><g class="gloss"></g></svg>';
};
CH.pal=function(id,cls,label,mood,col){const painted=id==='see'||(id==='avatar'&&(!col||col.toLowerCase()===CH.AVATARS[0].toLowerCase()));return '<span class="pal'+(painted?' painted':'')+(cls?' '+cls:'')+'"'+(label?' role="img" aria-label="'+label+'"':' aria-hidden="true"')+'>'+CH.palSVG(id,mood,col)+'</span>';};
const sites=[
 {id:'see',name:'Мятный луг',x:90,y:180},
 {id:'to10',name:'Пряничный остров',x:270,y:192},
 {id:'split',name:'Желейный лес',x:88,y:315},
 {id:'teen',name:'Королевство',x:272,y:333},
 {id:'add',name:'Облачный остров',x:88,y:451},
 {id:'sub',name:'Гномья гора',x:270,y:468},
 {id:'mix',name:'Волшебная башня',x:185,y:572}
];
const lock='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="10" width="12" height="10" rx="3"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/></svg>';
CH.mapSVG=function(state){
 let h='<div class="illustrated-world"><svg class="map" viewBox="0 0 360 610" preserveAspectRatio="none" role="img" aria-label="Семь островов сказочной тропинки"><image class="world-day" href="'+images['map-day']+'" width="360" height="610" preserveAspectRatio="none"/><image class="world-night" href="'+images['map-night']+'" width="360" height="610" preserveAspectRatio="none"/></svg><div class="map-hotspots">';
 for(const o of sites){const cur=state.cur===o.id,closed=state.locked.has(o.id),done=state.done.has(o.id);const pos='left:'+o.x/360*100+'%;top:'+o.y/610*100+'%;';
  // Locked state stays legible without obscuring the chosen artwork.
  if(o.id==='see')h+='<span class="map-guide" style="left:25%;top:23%" aria-hidden="true">'+CH.palSVG('see','neutral')+'</span>';
  h+='<button type="button" class="map-pin'+(cur?' current':'')+(closed?' locked':'')+'" data-isl="'+o.id+'" style="'+pos+'"'+(cur?' aria-current="step"':'')+' aria-label="'+o.name+'. '+CH.HEROES[o.id].name+(closed?'. Пока закрыто':done?'. Освоено':'. Сейчас учимся')+'">'+'<span class="island-label">'+o.name+'</span><span class="island-state">'+(closed?lock:done?'✓ Освоено':'Сейчас учимся')+'</span></button>';
 }
 return h+'</div></div>';
};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
CH.mapHeader=function(profile){return '<header class="tactile-header"><h1>Через<br>десяток<span class="brand-rays" aria-hidden="true">✦</span></h1><button type="button" class="avatar" data-act="profiles" aria-label="Сменить игрока">'+CH.pal('avatar','','','neutral',profile.color)+'<span>'+escape(profile.name)+'</span></button><span class="map-wallet" aria-label="Звёзды '+profile.stars+', монеты '+profile.coins+'">★ '+profile.stars+' · ● '+profile.coins+'</span></header>';};
CH.bottomNav=function(profile){return '<nav class="world-nav" aria-label="Разделы приложения">'+[
 ['map','Карта','<path d="M3 7l6-3 6 3 6-3v14l-6 3-6-3-6 3V7zM9 4v14M15 7v14"/>'],
 ['chest','Наклейки','<path d="M3 10h18v10H3zM3 10a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5M12 10v5"/>'],
 ['shop','Магазин','<path d="M4 9h16l-1 11H5L4 9zM8 9V7a4 4 0 0 1 8 0v2"/>'],
 ['parent','Родителю','<rect x="6" y="10" width="12" height="10" rx="3"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>']
 ].map(([act,label,svg])=>'<button type="button" data-act="'+act+'"'+(act==='map'?' class="selected" aria-current="page"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+svg+'</svg><span>'+label+'</span>'+(act==='chest'&&profile?.pendingChest?'<i class="badge">'+profile.pendingChest+'</i>':'')+'</button>').join('')+'</nav>';};
})(window);

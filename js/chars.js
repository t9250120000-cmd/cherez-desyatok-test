/* Персонажи, наклейки, карта. Всё оригинальное, рисуется кодом (SVG). */
(function(root){
'use strict';
const OUT = '#2B2245';
const HEROES = {
  see:  {name:'Слаймик Бульк',   body:'blob', col:'#5BD48F', dark:'#3BAE6F', acc:[]},
  to10: {name:'Пельмешек Тестик', body:'dump', col:'#FFEFD2', dark:'#E9CFA0', acc:['bow']},
  split:{name:'Дракоша Желе',    body:'blob', col:'#B48CFF', dark:'#8C63E6', acc:['dwings','horns']},
  teen: {name:'Король Пельмень', body:'dump', col:'#FFE4AE', dark:'#E7C27A', acc:['crown']},
  add:  {name:'Фея Капелька',    body:'blob', col:'#6CCBFF', dark:'#3FA3E0', acc:['fwings','wand']},
  sub:  {name:'Гном Хинкалик',   body:'dump', col:'#F6E6D2', dark:'#DCC3A4', acc:['gnome']},
  mix:  {name:'Маг Мармелад',    body:'blob', col:'#FF92BC', dark:'#E66A9A', acc:['wizard']}
};
const AVATARS = ['#5BD48F','#FF92BC','#6CCBFF','#FFC83D','#B48CFF','#FF8A5B'];
function starPts(cx,cy,r){ let p=[]; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.45:r; p.push((cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1)); } return p.join(' '); }
function palSVG(id, mood, colOverride){
  const H = id==='avatar' ? {body:'blob', col:colOverride||AVATARS[0], dark:'#3BAE6F', acc:[]} : HEROES[id];
  const A = H.acc, blob = H.body==='blob';
  const st = 'stroke="'+OUT+'" stroke-width="3" stroke-linejoin="round"';
  let back = '', front = '';
  if(A.includes('dwings')) back += '<path class="acc" d="M26 66 C8 60 4 42 10 32 C16 40 22 40 28 36 C26 46 30 54 34 58 Z" fill="'+H.dark+'" '+st+'/><path class="acc" d="M94 66 C112 60 116 42 110 32 C104 40 98 40 92 36 C94 46 90 54 86 58 Z" fill="'+H.dark+'" '+st+'/>';
  if(A.includes('fwings')) back += '<ellipse class="acc" cx="22" cy="54" rx="14" ry="21" transform="rotate(-28 22 54)" fill="#FFFFFF" fill-opacity=".85" '+st+'/><ellipse class="acc" cx="98" cy="54" rx="14" ry="21" transform="rotate(28 98 54)" fill="#FFFFFF" fill-opacity=".85" '+st+'/>';
  const body = blob
    ? '<path class="body" d="M60 20 C67 34 99 40 101 74 C103 99 84 106 60 106 C36 106 17 99 19 74 C21 40 53 34 60 20 Z" fill="'+H.col+'" '+st+'/>'
    : '<path class="body" d="M12 88 C12 58 34 40 60 40 C86 40 108 58 108 88 C108 100 92 106 60 106 C28 106 12 100 12 88 Z" fill="'+H.col+'" '+st+'/>'+
      '<path class="body" d="M26 60 Q30 46 40 52 Q46 38 55 46 Q60 34 65 46 Q74 38 80 52 Q90 46 94 60" fill="'+H.col+'" '+st+'/>';
  const gloss = blob
    ? '<ellipse class="gloss" cx="42" cy="56" rx="6" ry="11" transform="rotate(25 42 56)" fill="#FFFFFF" fill-opacity=".6"/>'
    : '<ellipse class="gloss" cx="34" cy="74" rx="5" ry="8" transform="rotate(30 34 74)" fill="#FFFFFF" fill-opacity=".7"/>';
  const ey = blob ? 74 : 80;
  const eyes = mood==='happy'
    ? '<path d="M42 '+ey+' q6 -8 12 0" fill="none" stroke="'+OUT+'" stroke-width="3.5" stroke-linecap="round"/><path d="M66 '+ey+' q6 -8 12 0" fill="none" stroke="'+OUT+'" stroke-width="3.5" stroke-linecap="round"/>'
    : '<ellipse cx="48" cy="'+ey+'" rx="5.5" ry="7" fill="'+OUT+'"/><ellipse cx="72" cy="'+ey+'" rx="5.5" ry="7" fill="'+OUT+'"/><circle cx="50" cy="'+(ey-2.5)+'" r="2" fill="#FFFFFF"/><circle cx="74" cy="'+(ey-2.5)+'" r="2" fill="#FFFFFF"/>';
  const mouth = mood==='happy' ? '<path d="M52 '+(ey+8)+' q8 9 16 0" fill="'+OUT+'"/>' : mood==='think' ? '<path d="M55 '+(ey+10)+' h10" fill="none" stroke="'+OUT+'" stroke-width="3" stroke-linecap="round"/>' : '<path d="M55 '+(ey+9)+' q5 5 10 0" fill="none" stroke="'+OUT+'" stroke-width="3" stroke-linecap="round"/>';
  const face = '<g class="face">'+eyes+
    '<ellipse cx="38" cy="'+(ey+9)+'" rx="6" ry="3.5" fill="#FF6F93" fill-opacity=".55"/><ellipse cx="82" cy="'+(ey+9)+'" rx="6" ry="3.5" fill="#FF6F93" fill-opacity=".55"/>'+mouth+'</g>';
  if(A.includes('bow')) front += '<path class="acc" d="M88 46 L76 38 L76 54 Z M88 46 L100 38 L100 54 Z" fill="#FF5C7A" '+st+'/><circle class="acc" cx="88" cy="46" r="4.5" fill="#FF5C7A" '+st+'/>';
  if(A.includes('crown')) front += '<path class="acc" d="M40 42 L40 20 L50 32 L60 14 L70 32 L80 20 L80 42 Z" fill="#FFC83D" '+st+'/><circle class="acc" cx="60" cy="33" r="3.5" fill="#FF5C7A"/>';
  if(A.includes('horns')) front += '<path class="acc" d="M38 46 L38 30 L50 40 Z" fill="#FFC83D" '+st+'/><path class="acc" d="M82 46 L82 30 L70 40 Z" fill="#FFC83D" '+st+'/>';
  if(A.includes('wand')) front += '<path class="acc" d="M98 92 L112 62" stroke="'+OUT+'" stroke-width="4" stroke-linecap="round"/><polygon class="acc" points="'+starPts(113,58,10)+'" fill="#FFD23D" '+st+'/>';
  if(A.includes('gnome')) front += '<path class="acc" d="M36 52 Q48 6 66 2 Q62 24 86 52 Z" fill="#FF5C7A" '+st+'/><circle class="acc" cx="66" cy="4" r="6" fill="#FFFFFF" '+st+'/>';
  if(A.includes('wizard')) front += '<path class="acc" d="M32 46 L58 -2 L88 46 Z" fill="#6A4BE0" '+st+'/><ellipse class="acc" cx="60" cy="46" rx="34" ry="7" fill="#6A4BE0" '+st+'/><polygon class="acc" points="'+starPts(60,28,7)+'" fill="#FFD23D"/>';
  return '<svg viewBox="0 -6 124 118" aria-hidden="true"><ellipse cx="60" cy="108" rx="36" ry="5" fill="'+OUT+'" fill-opacity=".12"/>'+back+body+gloss+face+front+'</svg>';
}
function pal(id, cls, label, mood, col){ return '<span class="pal'+(cls?' '+cls:'')+'"'+(label?' role="img" aria-label="'+label+'"':' aria-hidden="true"')+'>'+palSVG(id, mood, col)+'</span>'; }

/* ---- наклейки (24 штуки), простые формы ---- */
const STICKERS = [
  ['star','Звезда','<polygon points="'+starPts(50,52,42)+'" fill="#FFD23D" stroke="'+OUT+'" stroke-width="4" stroke-linejoin="round"/>'],
  ['heart','Сердечко','<path d="M50 88 C20 66 8 48 20 32 C30 20 46 24 50 36 C54 24 70 20 80 32 C92 48 80 66 50 88 Z" fill="#FF5C7A" stroke="'+OUT+'" stroke-width="4"/>'],
  ['terem','Теремок','<path d="M14 46 L50 12 L86 46 Z" fill="#FF8A5B" stroke="'+OUT+'" stroke-width="4" stroke-linejoin="round"/><rect x="22" y="46" width="56" height="40" rx="6" fill="#fff" stroke="'+OUT+'" stroke-width="4"/><circle cx="38" cy="64" r="7" fill="#FF5C7A"/><circle cx="62" cy="64" r="7" fill="#3FA7F5"/>'],
  ['sun','Солнышко','<circle cx="50" cy="50" r="22" fill="#FFD23D" stroke="'+OUT+'" stroke-width="4"/><g stroke="'+OUT+'" stroke-width="4" stroke-linecap="round">'+[0,45,90,135,180,225,270,315].map(a=>'<line x1="'+(50+30*Math.cos(a*Math.PI/180)).toFixed(1)+'" y1="'+(50+30*Math.sin(a*Math.PI/180)).toFixed(1)+'" x2="'+(50+40*Math.cos(a*Math.PI/180)).toFixed(1)+'" y2="'+(50+40*Math.sin(a*Math.PI/180)).toFixed(1)+'"/>').join('')+'</g>'],
  ['cloud','Облачко','<path d="M28 72 C12 72 12 50 28 50 C28 34 52 30 58 44 C72 38 86 50 80 62 C92 64 90 72 80 72 Z" fill="#fff" stroke="'+OUT+'" stroke-width="4"/>'],
  ['rainbow','Радуга','<path d="M12 80 A38 38 0 0 1 88 80" fill="none" stroke="#FF5C7A" stroke-width="9"/><path d="M22 80 A28 28 0 0 1 78 80" fill="none" stroke="#FFD23D" stroke-width="9"/><path d="M32 80 A18 18 0 0 1 68 80" fill="none" stroke="#5BD48F" stroke-width="9"/><path d="M12 80 A38 38 0 0 1 88 80 M22 80 A28 28 0 0 1 78 80 M32 80 A18 18 0 0 1 68 80" fill="none" stroke="'+OUT+'" stroke-width="2" stroke-opacity=".3"/>'],
  ['ten','Десятка','<rect x="12" y="30" width="76" height="40" rx="8" fill="#fff" stroke="'+OUT+'" stroke-width="4"/><text x="50" y="62" text-anchor="middle" font-size="32" font-weight="900" font-family="Nunito,sans-serif" fill="'+OUT+'">10</text>'],
  ['apple','Яблоко','<circle cx="50" cy="56" r="30" fill="#FF5C7A" stroke="'+OUT+'" stroke-width="4"/><path d="M50 26 q4 -12 14 -12" fill="none" stroke="#3BAE6F" stroke-width="5" stroke-linecap="round"/><ellipse cx="38" cy="46" rx="5" ry="8" fill="#fff" fill-opacity=".5"/>'],
  ['balloon','Шарик','<ellipse cx="50" cy="42" rx="26" ry="32" fill="#3FA7F5" stroke="'+OUT+'" stroke-width="4"/><path d="M50 74 q-6 10 6 20" fill="none" stroke="'+OUT+'" stroke-width="3"/><ellipse cx="40" cy="30" rx="5" ry="9" fill="#fff" fill-opacity=".5"/>'],
  ['crownS','Корона','<path d="M14 72 L14 34 L34 52 L50 20 L66 52 L86 34 L86 72 Z" fill="#FFC83D" stroke="'+OUT+'" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="56" r="5" fill="#FF5C7A"/>'],
  ['rocket','Ракета','<path d="M50 10 C70 30 70 60 62 76 L38 76 C30 60 30 30 50 10 Z" fill="#fff" stroke="'+OUT+'" stroke-width="4"/><circle cx="50" cy="42" r="8" fill="#3FA7F5" stroke="'+OUT+'" stroke-width="3"/><path d="M38 60 L24 76 L38 76 Z M62 60 L76 76 L62 76 Z" fill="#FF5C7A" stroke="'+OUT+'" stroke-width="3"/><path d="M42 78 L50 92 L58 78 Z" fill="#FFD23D"/>'],
  ['flower','Цветок','<g fill="#FF92BC" stroke="'+OUT+'" stroke-width="3">'+[0,72,144,216,288].map(a=>'<ellipse cx="'+(50+18*Math.cos((a-90)*Math.PI/180)).toFixed(1)+'" cy="'+(50+18*Math.sin((a-90)*Math.PI/180)).toFixed(1)+'" rx="11" ry="15" transform="rotate('+a+' '+(50+18*Math.cos((a-90)*Math.PI/180)).toFixed(1)+' '+(50+18*Math.sin((a-90)*Math.PI/180)).toFixed(1)+')"/>').join('')+'</g><circle cx="50" cy="50" r="10" fill="#FFD23D" stroke="'+OUT+'" stroke-width="3"/>'],
  ['fish','Рыбка','<path d="M18 50 C30 28 60 24 78 50 C60 76 30 72 18 50 Z" fill="#FFC83D" stroke="'+OUT+'" stroke-width="4"/><path d="M78 50 L94 36 L94 64 Z" fill="#FFC83D" stroke="'+OUT+'" stroke-width="4" stroke-linejoin="round"/><circle cx="34" cy="46" r="4" fill="'+OUT+'"/>'],
  ['moon','Месяц','<path d="M62 14 A36 36 0 1 0 62 86 A28 28 0 1 1 62 14 Z" fill="#FFD23D" stroke="'+OUT+'" stroke-width="4"/>'],
  ['mushroom','Грибок','<path d="M14 52 C14 20 86 20 86 52 Z" fill="#FF5C7A" stroke="'+OUT+'" stroke-width="4"/><rect x="36" y="52" width="28" height="34" rx="8" fill="#FFEFD2" stroke="'+OUT+'" stroke-width="4"/><circle cx="34" cy="38" r="5" fill="#fff"/><circle cx="58" cy="32" r="6" fill="#fff"/>'],
  ['cherry','Вишенки','<path d="M38 56 Q44 24 66 16 M62 56 Q58 30 66 16" fill="none" stroke="#3BAE6F" stroke-width="4" stroke-linecap="round"/><circle cx="36" cy="66" r="16" fill="#FF5C7A" stroke="'+OUT+'" stroke-width="4"/><circle cx="64" cy="68" r="16" fill="#FF5C7A" stroke="'+OUT+'" stroke-width="4"/>'],
  ['gem','Самоцвет','<path d="M30 22 L70 22 L90 46 L50 90 L10 46 Z" fill="#B48CFF" stroke="'+OUT+'" stroke-width="4" stroke-linejoin="round"/><path d="M30 22 L50 46 L70 22 M10 46 L90 46 M50 46 L50 90" fill="none" stroke="'+OUT+'" stroke-width="2" stroke-opacity=".5"/>'],
  ['bell','Колокольчик','<path d="M30 66 C30 36 34 24 50 20 C66 24 70 36 70 66 L80 76 L20 76 Z" fill="#FFD23D" stroke="'+OUT+'" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="84" r="7" fill="#FFC83D" stroke="'+OUT+'" stroke-width="3"/>'],
  ['candy','Конфета','<rect x="28" y="36" width="44" height="28" rx="14" fill="#FF92BC" stroke="'+OUT+'" stroke-width="4"/><path d="M28 50 L10 36 L14 50 L10 64 Z M72 50 L90 36 L86 50 L90 64 Z" fill="#FF92BC" stroke="'+OUT+'" stroke-width="4" stroke-linejoin="round"/><path d="M40 40 l-6 20 M52 40 l-6 20 M64 40 l-6 20" stroke="#fff" stroke-width="4" stroke-opacity=".6"/>'],
  ['ship','Кораблик','<path d="M14 62 L86 62 L74 84 L26 84 Z" fill="#FF8A5B" stroke="'+OUT+'" stroke-width="4" stroke-linejoin="round"/><rect x="48" y="16" width="4" height="46" fill="'+OUT+'"/><path d="M52 18 L80 56 L52 56 Z" fill="#fff" stroke="'+OUT+'" stroke-width="4" stroke-linejoin="round"/>'],
  ['butterfly','Бабочка','<g fill="#6CCBFF" stroke="'+OUT+'" stroke-width="4"><ellipse cx="32" cy="38" rx="18" ry="22"/><ellipse cx="68" cy="38" rx="18" ry="22"/><ellipse cx="34" cy="68" rx="14" ry="14"/><ellipse cx="66" cy="68" rx="14" ry="14"/></g><rect x="46" y="28" width="8" height="52" rx="4" fill="'+OUT+'"/>'],
  ['pie','Пирожок','<path d="M12 60 C12 36 88 36 88 60 C88 72 12 72 12 60 Z" fill="#FFC83D" stroke="'+OUT+'" stroke-width="4"/><path d="M30 52 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0" fill="none" stroke="#E9A020" stroke-width="4" stroke-linecap="round"/>'],
  ['key','Ключик','<circle cx="34" cy="40" r="18" fill="#FFD23D" stroke="'+OUT+'" stroke-width="4"/><circle cx="34" cy="40" r="6" fill="#fff" stroke="'+OUT+'" stroke-width="3"/><path d="M48 50 L84 86 M72 74 L80 66 M64 82 L72 74" fill="none" stroke="'+OUT+'" stroke-width="7" stroke-linecap="round"/><path d="M48 50 L84 86" stroke="#FFD23D" stroke-width="3"/>'],
  ['medal','Медаль','<path d="M36 10 L50 40 L64 10 Z" fill="#3FA7F5" stroke="'+OUT+'" stroke-width="3"/><circle cx="50" cy="62" r="26" fill="#FFD23D" stroke="'+OUT+'" stroke-width="4"/><text x="50" y="72" text-anchor="middle" font-size="26" font-weight="900" font-family="Nunito,sans-serif" fill="'+OUT+'">1</text>']
];
function stickerSVG(id){ const s = STICKERS.find(x=>x[0]===id); return s ? '<svg viewBox="0 0 100 100" aria-hidden="true">'+s[2]+'</svg>' : ''; }
function stickerName(id){ const s = STICKERS.find(x=>x[0]===id); return s ? s[1] : ''; }

/* ---- карта: 7 островов вдоль тропинки, viewBox 360×760 ---- */
const ISLANDS = [
  {id:'see',  x:80,  y:548, r:34, col:'#BFF0D4'},
  {id:'to10', x:250, y:488, r:34, col:'#FFE7C2'},
  {id:'split',x:100, y:400, r:34, col:'#E3D4FF'},
  {id:'teen', x:265, y:318, r:34, col:'#FFF0C2'},
  {id:'add',  x:95,  y:240, r:34, col:'#CFEAFF'},
  {id:'sub',  x:258, y:160, r:34, col:'#F6E6D2'},
  {id:'mix',  x:150, y:72,  r:38, col:'#FFD6E6'}
];
function mapSVG(state){
  // state: {done:Set, cur:id, locked:Set}
  let path = '';
  ISLANDS.forEach((o,i)=>{ path += (i?' Q ':'M ')+(i? ((ISLANDS[i-1].x+o.x)/2 + (i%2?50:-50))+' '+((ISLANDS[i-1].y+o.y)/2)+' ' : '')+o.x+' '+o.y; });
  let h = '<svg class="map" viewBox="0 0 360 610" aria-label="Карта сказочной тропинки">';
  h += '<defs><radialGradient id="pond" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff" stop-opacity=".5"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>';
  h += '<path d="'+path+'" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" stroke-opacity=".55"/>';
  h += '<path d="'+path+'" fill="none" stroke="#C9B5F0" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 16"/>';
  ISLANDS.forEach((o,i)=>{
    const done = state.done.has(o.id), cur = state.cur===o.id, locked = state.locked.has(o.id);
    h += '<g class="isl'+(cur?' cur':'')+(locked?' locked':'')+(done?' done':'')+'" data-isl="'+o.id+'" transform="translate('+o.x+' '+o.y+')" role="button" tabindex="0" aria-label="'+HEROES[o.id].name+(locked?' (пока закрыт)':'')+'">';
    h += '<ellipse cx="0" cy="'+(o.r*0.55)+'" rx="'+(o.r*1.35)+'" ry="'+(o.r*0.5)+'" fill="'+(locked?'#E6E2F2':o.col)+'" stroke="'+OUT+'" stroke-width="3" stroke-opacity=".35"/>';
    h += '<ellipse cx="0" cy="'+(o.r*0.55)+'" rx="'+(o.r*1.0)+'" ry="'+(o.r*0.3)+'" fill="url(#pond)"/>';
    if(cur) h += '<circle class="ring" cx="0" cy="'+(o.r*0.55)+'" r="'+(o.r*1.45)+'" fill="none" stroke="#6A4BE0" stroke-width="3" stroke-dasharray="6 8"/>';
    h += '<foreignObject x="-'+(o.r*0.95)+'" y="-'+(o.r*1.45)+'" width="'+(o.r*1.9)+'" height="'+(o.r*1.9)+'"><div xmlns="http://www.w3.org/1999/xhtml" class="pal'+(locked?' locked':'')+(cur?' bob':'')+'">'+palSVG(o.id, done?'happy':undefined)+'</div></foreignObject>';
    if(done) h += '<circle cx="'+(o.r*0.9)+'" cy="-'+(o.r*0.9)+'" r="12" fill="#1E9160" stroke="#fff" stroke-width="3"/><path d="M'+(o.r*0.9-5)+' -'+(o.r*0.9)+' l4 4 l7 -8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>';
    h += '<text class="lbl" x="0" y="'+(o.r*1.25)+'" text-anchor="middle">'+(i+1)+'</text>';
    h += '</g>';
  });
  h += '</svg>';
  return h;
}
root.CH = {HEROES, AVATARS, palSVG, pal, STICKERS, stickerSVG, stickerName, ISLANDS, mapSVG};
})(typeof window!=='undefined' ? window : globalThis);

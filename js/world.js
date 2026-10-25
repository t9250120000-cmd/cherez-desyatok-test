/* Storybook artwork. Extends CH while preserving public character contracts. */
(function(root){
'use strict';
const CH=root.CH;
const paint=(name)=>'var(--'+name+')';
const INK=paint('art-ink'), WHITE=paint('art-white');
const line='stroke="'+INK+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
function palSVG(id,mood,colOverride){
  const H=id==='avatar'?{body:'blob',col:colOverride||CH.AVATARS[0],dark:INK,acc:[]}:CH.HEROES[id];
  if(!H)return '';
  const a=H.acc, blob=H.body==='blob';
  const shape=blob?'M61 20 C68 36 97 39 103 69 C109 96 90 106 61 106 C30 106 14 97 19 74 C24 47 48 42 61 20Z':'M16 84 C16 64 31 49 43 47 Q48 36 56 43 Q61 32 67 43 Q77 36 82 49 C97 57 108 73 106 88 C104 103 84 107 60 107 C35 107 16 101 16 84Z';
  let back='',acc='';
  if(a.includes('dwings'))back='<g class="acc" fill="'+H.dark+'" '+line+'><path d="M29 74C8 71 3 51 9 37L20 47 30 43 31 59 42 64Z"/><path d="M91 74C113 71 118 51 112 37L101 47 91 43 90 59 79 64Z"/><path d="M11 40L24 59M110 40L97 59" fill="none" stroke-opacity=".3"/></g>';
  if(a.includes('fwings'))back='<g class="acc" fill="'+WHITE+'" '+line+' stroke-opacity=".2"><path d="M33 84C5 81 2 56 12 42C27 44 36 59 33 84Z"/><path d="M88 84C117 81 121 56 111 42C96 44 87 59 88 84Z"/></g>';
  if(a.includes('bow'))acc+='<g class="acc" fill="'+paint('art-rose')+'" '+line+'><path d="M87 48Q68 28 72 53L87 48Q107 28 103 54Z"/><circle cx="87" cy="48" r="5"/><path d="M79 53L76 64 88 57 98 62 94 51"/></g>';
  if(a.includes('horns'))acc+='<g class="acc" fill="'+paint('art-gold')+'" '+line+'><path d="M34 45Q31 30 39 25L48 42Z"/><path d="M77 42L86 25Q94 30 90 45Z"/></g>';
  if(a.includes('crown'))acc+='<g class="acc" '+line+'><path d="M35 43L32 20 48 30 60 12 73 30 90 20 87 43Z" fill="'+paint('art-gold')+'"/><path d="M37 38H85" stroke="'+WHITE+'" stroke-opacity=".6"/><circle cx="61" cy="32" r="4" fill="'+paint('art-rose')+'"/>'+[32,60,90].map((x,i)=>'<circle cx="'+x+'" cy="'+(i===1?12:20)+'" r="3" fill="'+paint('art-gold')+'"/>').join('')+'</g>';
  if(a.includes('wand'))acc+='<g class="acc" '+line+'><path d="M99 97L112 58"/><polygon points="'+CH.starPts(113,54,10)+'" fill="'+paint('art-gold')+'"/></g>';
  if(a.includes('gnome'))acc+='<g class="acc" '+line+'><path d="M29 55Q41 12 79 6Q62 28 94 55Z" fill="'+paint('art-rose')+'"/><path d="M30 55Q60 48 94 55" fill="none" stroke="'+WHITE+'" stroke-width="7"/><circle cx="80" cy="7" r="7" fill="'+WHITE+'"/></g>';
  if(a.includes('wizard'))acc+='<g class="acc" '+line+'><path d="M33 43L56 0Q63 14 85 43Z" fill="'+paint('art-violet')+'"/><ellipse cx="60" cy="44" rx="35" ry="7" fill="'+paint('art-violet')+'"/><path d="M42 33L78 36" stroke="'+paint('art-gold')+'" stroke-width="5"/><polygon points="'+CH.starPts(57,22,6)+'" fill="'+paint('art-gold')+'" stroke="none"/></g>';
  const ey=blob?74:79;
  const eyes=mood==='happy'?'<path d="M40 '+ey+'Q46 '+(ey-9)+' 52 '+ey+'M69 '+ey+'Q75 '+(ey-9)+' 81 '+ey+'" fill="none" stroke="'+INK+'" stroke-width="3.5" stroke-linecap="round"/>':'<ellipse cx="46" cy="'+ey+'" rx="4.7" ry="6.5" fill="'+INK+'"/><ellipse cx="75" cy="'+ey+'" rx="4.7" ry="6.5" fill="'+INK+'"/><g fill="'+WHITE+'"><circle cx="45" cy="'+(ey-2)+'" r="1.6"/><circle cx="74" cy="'+(ey-2)+'" r="1.6"/></g>';
  const mouth=mood==='happy'?'<path d="M53 '+(ey+9)+'Q60 '+(ey+21)+' 68 '+(ey+9)+'Z" fill="'+INK+'"/>':mood==='think'?'<path d="M57 '+(ey+11)+'Q61 '+(ey+8)+' 65 '+(ey+10)+'" fill="none" '+line+'/>':'<path d="M55 '+(ey+10)+'Q61 '+(ey+16)+' 67 '+(ey+10)+'" fill="none" '+line+'/>';
  return '<svg viewBox="0 -4 124 120" aria-hidden="true"><ellipse cx="61" cy="109" rx="39" ry="4" fill="'+INK+'" opacity=".1"/>'+back+'<path class="body" d="'+shape+'" fill="'+H.dark+'" '+line+'/><path class="body" d="'+shape+'" fill="'+H.col+'" transform="translate(0 -2) scale(1 .97)" '+line+'/><path class="body" d="M25 89Q59 113 99 87Q95 105 61 105Q33 105 25 89Z" fill="'+H.dark+'" opacity=".35"/>'+(blob?'':'<path class="body" d="M30 60L39 69M43 49L49 62M58 44L60 60M74 48L71 62M87 58L81 69" fill="none" stroke="'+H.dark+'" stroke-width="2.5" stroke-linecap="round"/>')+'<g class="gloss" fill="'+WHITE+'" opacity=".64"><path d="M32 65Q32 51 45 46Q51 45 47 52L39 65Q33 71 32 65Z"/><circle cx="30" cy="75" r="2.6"/></g><g class="face">'+eyes+'<g fill="'+paint('art-rose')+'" opacity=".42"><ellipse cx="34" cy="'+(ey+10)+'" rx="7" ry="3.5"/><ellipse cx="88" cy="'+(ey+10)+'" rx="7" ry="3.5"/></g>'+mouth+(mood==='think'?'<path d="M77 92Q89 82 92 90Q93 99 79 100" fill="'+H.col+'" '+line+'/>':'')+'</g>'+acc+'</svg>';
}
CH.starPts=function(cx,cy,r){return Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,k=i%2?r*.45:r;return(cx+k*Math.cos(a)).toFixed(1)+','+(cy+k*Math.sin(a)).toFixed(1);}).join(' ');};
CH.palSVG=palSVG;
CH.pal=function(id,cls,label,mood,col){return '<span class="pal'+(cls?' '+cls:'')+'"'+(label?' role="img" aria-label="'+label+'"':' aria-hidden="true"')+'>'+palSVG(id,mood,col)+'</span>';};
function tree(x,y,col){return '<g transform="translate('+x+' '+y+')"><path d="M0 0V-25" stroke="'+INK+'" stroke-width="3"/><path d="M-13-10Q-18-33 0-40Q18-33 13-10Z" fill="'+col+'"/><path d="M0-12V-26" stroke="'+WHITE+'" opacity=".4" stroke-width="2"/></g>';}
function home(x,y,kind){let h='<g transform="translate('+x+' '+y+')" '+line+'>';if(kind==='tower')h+='<path d="M-9 0V-31H9V0" fill="'+paint('art-lilac')+'"/><path d="M-14-31L0-51 14-31Z" fill="'+paint('art-violet')+'"/><path d="M-3-20H3V-12H-3Z" fill="'+paint('art-gold')+'"/>';else if(kind==='castle')h+='<path d="M-24 0V-28H-16V-34H-8V-24H8V-34H16V-28H24V0Z" fill="'+paint('art-gold')+'"/><path d="M-5 0V-12Q0-19 5-12V0" fill="'+paint('art-violet')+'"/>';else h+='<rect x="-18" y="-22" width="36" height="25" rx="4" fill="'+paint('art-cream')+'"/><path d="M-24-22L0-43 24-22Z" fill="'+paint('art-peach')+'"/><path d="M-21-22L0-38 21-22" fill="none" stroke="'+WHITE+'" stroke-width="4"/><rect x="-5" y="-14" width="10" height="12" rx="3" fill="'+paint('art-violet')+'"/>';return h+'</g>';}
function biome(i){
  if(i===0)return tree(-43,14,paint('art-leaf'))+'<path d="M-60 19Q-55 5-48 19M38 20Q44 7 51 20" fill="none" stroke="'+paint('art-grass')+'" stroke-width="3"/>'+home(41,12,'house');
  if(i===1)return home(-43,12,'ginger')+'<g fill="'+paint('art-rose')+'"><circle cx="46" cy="2" r="8"/><circle cx="57" cy="13" r="6"/></g>';
  if(i===2)return tree(-44,9,paint('art-lilac'))+tree(47,12,paint('art-violet'))+'<g fill="'+paint('art-rose')+'"><circle cx="-53" cy="19" r="4"/><circle cx="36" cy="20" r="5"/></g>';
  if(i===3)return home(-43,12,'castle')+'<path d="M45 10V-28L63-22 45-17" fill="'+paint('art-rose')+'" stroke="'+INK+'" stroke-width="2"/>';
  if(i===4)return '<path d="M-64 23Q-78 9-61 5Q-61-8-49-5Q-36-9-33 4Q-17 11-29 23ZM29 23Q18 12 32 6Q29-7 44-8Q59-12 62 3Q80 6 67 23Z" fill="'+WHITE+'" stroke="'+paint('art-sky')+'" stroke-width="2"/>';
  if(i===5)return '<path d="M-68 19L-48-25-23 19M24 20L48-37 73 20" fill="'+paint('art-stone')+'"/><path d="M39-16L48-37 57-16 49-21Z" fill="'+WHITE+'"/><path d="M-53 19V8Q-45-5-37 8V19" fill="'+paint('art-ink')+'"/>';
  return home(-44,13,'tower')+'<g fill="'+paint('art-gold')+'"><path d="M43-29L46-20 55-17 46-14 43-5 40-14 31-17 40-20Z"/><circle cx="61" cy="3" r="3"/></g>';
}
CH.mapSVG=function(state){
  const islands=CH.ISLANDS;
  let path='';islands.forEach((o,i)=>{path+=(i?' Q '+((islands[i-1].x+o.x)/2+(i%2?45:-45))+' '+((islands[i-1].y+o.y)/2)+' ':'M ')+o.x+' '+o.y;});
  let h='<svg class="map" viewBox="0 0 360 610" role="group" aria-label="Карта сказочной тропинки"><g class="world-scenery" fill="'+paint('art-grass')+'" opacity=".12"><path d="M0 125Q100 25 210 130T360 140V180Q195 110 0 202Z"/><path d="M0 359Q120 290 360 356V397Q120 337 0 420Z"/><path d="M0 550Q190 473 360 551V610H0Z"/></g><path d="'+path+'" fill="none" stroke="'+paint('art-path-shadow')+'" stroke-width="17" stroke-linecap="round"/><path d="'+path+'" fill="none" stroke="'+paint('art-path')+'" stroke-width="12" stroke-linecap="round"/><path d="'+path+'" fill="none" stroke="'+paint('art-path-dot')+'" stroke-width="2.5" stroke-dasharray="1 10" stroke-linecap="round"/>';
  islands.forEach((o,i)=>{const done=state.done.has(o.id),cur=state.cur===o.id,locked=state.locked.has(o.id);const ground=[paint('art-mint'),paint('art-cream'),paint('art-lilac'),paint('art-cream'),paint('art-sky'),paint('art-stone'),paint('art-pink')][i];
    h+='<g class="isl'+(cur?' cur':'')+(locked?' locked':'')+(done?' done':'')+'" transform="translate('+o.x+' '+o.y+')" data-isl="'+o.id+'" role="button" tabindex="0" aria-label="'+(i+1)+'. '+CH.HEROES[o.id].name+(locked?', пока закрыт':'')+'"><ellipse cx="0" cy="31" rx="64" ry="15" fill="'+INK+'" opacity=".07"/>';
    if(cur)h+='<ellipse class="ring" cx="0" cy="19" rx="73" ry="30" fill="none" stroke="'+paint('btn')+'" stroke-width="2.5" stroke-dasharray="4 6"/>';
    h+='<path d="M-61 16Q-56 47 0 47Q57 45 61 16Z" fill="'+paint('art-earth')+'"/><path d="M-48 27Q-28 39 0 38Q30 38 49 28" stroke="'+WHITE+'" stroke-width="2" stroke-opacity=".3" fill="none"/><ellipse cy="15" rx="64" ry="21" fill="'+ground+'" stroke="'+paint('art-island-edge')+'" stroke-width="1.5"/>'+biome(i)+'<foreignObject x="-34" y="-48" width="68" height="68"><div xmlns="http://www.w3.org/1999/xhtml" class="pal'+(locked?' locked':'')+'">'+palSVG(o.id,done?'happy':undefined)+'</div></foreignObject>';
    if(locked)h+='<ellipse class="island-fog" cx="0" cy="15" rx="66" ry="21" fill="'+paint('art-fog')+'" opacity=".32"/>';
    h+='<g class="island-number"><circle cx="0" cy="39" r="11" fill="'+(cur?paint('btn'):paint('card'))+'" stroke="'+(cur?paint('btn'):paint('line'))+'"/><text class="lbl'+(cur?' active':'')+'" x="0" y="44" text-anchor="middle">'+(done?'✓':i+1)+'</text></g></g>';});
  return h+'</svg>';
};
const oldSticker=CH.stickerSVG;
CH.chestSVG=function(open){return '<svg class="treasure'+(open?' open':'')+'" viewBox="0 0 140 115" aria-hidden="true"><ellipse cx="70" cy="108" rx="56" ry="5" fill="'+INK+'" opacity=".08"/><g'+(open?' transform="translate(0 -8) rotate(-5 20 42)"':'')+'><path d="M17 43Q17 8 70 8Q123 8 123 43Z" fill="'+paint('art-peach')+'" '+line+'/><path d="M38 38Q38 17 70 17Q104 17 104 38" fill="none" stroke="'+WHITE+'" stroke-width="3" opacity=".4"/></g><rect x="17" y="44" width="106" height="58" rx="12" fill="'+paint('art-gold')+'" '+line+'/><path d="M36 45V101M105 45V101" stroke="'+paint('art-cream')+'" stroke-width="8"/><rect x="60" y="41" width="20" height="30" rx="7" fill="'+paint('art-cream')+'" '+line+'/><circle cx="70" cy="53" r="3" fill="'+INK+'"/><path d="M70 54V60" '+line+'/></svg>';};
CH.stickerSVG=function(id){
  let s=id==='moon'?'<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M69 15C26 4 10 44 28 74C41 96 72 96 86 75C48 86 29 38 69 15Z" fill="#FFD23D" stroke="#2B2245" stroke-width="3"/></svg>':oldSticker(id);
  const colors={'#2B2245':'art-ink','#FFD23D':'art-gold','#FFC83D':'art-gold','#FF5C7A':'art-rose','#FF92BC':'art-pink','#FF8A5B':'art-peach','#B48CFF':'art-violet','#3FA7F5':'chip-b','#6CCBFF':'art-sky','#5BD48F':'art-mint','#3BAE6F':'art-grass','#FFEFD2':'art-cream','#E9A020':'coin-art','#fff':'art-white'};
  s=s.replace(/#[\dA-Fa-f]{3,6}\b/g,c=>colors[c]?paint(colors[c]):c).replace(/stroke-width="4"/g,'stroke-width="2.8"');
  return s.replace('<svg viewBox="0 0 100 100"','<svg class="sticker-art" viewBox="0 0 100 100"');
};
})(window);

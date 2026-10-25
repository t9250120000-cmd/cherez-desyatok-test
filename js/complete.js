/* Full tactile character/reward layer. No learning or persistence logic. */
(function(root){
'use strict';
const CH=root.CH,C=root.ART_CATALOG,originalSVG=CH.palSVG;
const base=new URL('../',document.currentScript.src),url=p=>new URL(p,base).href;
function cell(c,col,row,cls){const w=c.width/c.columns,h=c.height/c.rows,r=c.rects?c.rects[row*c.columns+col]:[col*w,row*h,w,h],limit=c.rects?88:100,scale=Math.min(limit/r[2],limit/r[3]),vw=r[2]*scale,vh=r[3]*scale;return '<svg class="'+(cls||'sprite-art')+'" viewBox="0 0 100 100" aria-hidden="true"><svg x="'+((100-vw)/2)+'" y="'+((100-vh)/2)+'" width="'+vw+'" height="'+vh+'" style="overflow:hidden" viewBox="'+r.join(' ')+'" preserveAspectRatio="xMidYMid meet"><image href="'+url(c.file)+'" width="'+c.width+'" height="'+c.height+'"/></svg></svg>';}
const hues={'#5bd48f':0,'#ff92bc':236,'#6ccbff':101,'#ffc83d':-56,'#b48cff':160,'#ff8a5b':-83};
CH.palSVG=function(id,mood,color){const c=C.characters[id],frame=mood==='happy'?1:mood==='think'?2:0;
 if(c){const art=cell(c,frame,0);return art.replace('</svg>','</svg><g class="body"></g><g class="acc"></g><g class="face"></g><g class="gloss"></g>');}
 if(id==='avatar'){const key=(color||CH.AVATARS[0]).toLowerCase();if(Object.prototype.hasOwnProperty.call(hues,key)){const art=originalSVG('see',mood);return art.replace('class="illustrated-pal"','class="illustrated-pal" style="filter:hue-rotate('+hues[key]+'deg)"');}}
 return originalSVG(id,mood,color);
};
CH.pal=function(id,cls,label,mood,color){return '<span class="pal painted'+(cls?' '+cls:'')+'"'+(label?' role="img" aria-label="'+String(label).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"':' aria-hidden="true"')+'>'+CH.palSVG(id,mood,color)+'</span>';};
CH.stickerSVG=function(id){const i=CH.STICKERS.findIndex(s=>s[0]===id);if(i<0)return '';let s=cell(C.stickers,i%6,Math.floor(i/6),'sticker-art');const label=id==='ten'?'10':id==='medal'?'1':'';if(label)s=s.replace(/<\/svg>$/,'<text x="50" y="'+(id==='ten'?'61':'52')+'" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="'+(id==='ten'?'34':'30')+'" fill="#25283B">'+label+'</text></svg>');return s;};
CH.chestSVG=function(open){return cell(C.chest,open?1:0,0,'treasure'+(open?' open':''));};
CH.brandStrip=function(){return '<header class="brand-strip"><img src="icons/icon-192.png" alt="" width="36" height="36"><span>Через десяток</span></header>';};
})(window);

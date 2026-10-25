/* A deliberately small vocabulary, never a second arithmetic engine. */
(function(root){
'use strict';
const values=['ноль','один','два','три','четыре','пять','шесть','семь','восемь','девять','десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать','шестнадцать','семнадцать','восемнадцать','девятнадцать','двадцать'];
const words=Object.fromEntries(values.map((word,n)=>[word,n]));Object.assign(words,{нуль:0,одна:1,одно:1,две:2});
function parse(raw){
 const text=String(raw||'').toLowerCase().replace(/ё/g,'е').trim();
 if(!text||text.length>160)return{kind:'unknown'};
 const s=text.replace(/[.,!?;:«»"']/g,' ').replace(/\s+/g,' ').trim();
 if(/^(?:бульк )?(?:стоп|остановись|хватит|пауза)(?: пожалуйста)?$/.test(s))return{kind:'stop'};
 if(/^(?:бульк )?(?:помоги(?: мне)?|объясни(?: мне)?|не знаю|не понимаю|не понял|не поняла)(?: пожалуйста)?$/.test(s))return{kind:'help'};
 if(/^(?:бульк )?(?:повтори(?: вопрос)?|еще раз)(?: пожалуйста)?$/.test(s))return{kind:'repeat'};
 if(/^(?:бульк )?(?:дальше|продолжай|готов|готово)(?: пожалуйста)?$/.test(s))return{kind:'next'};
 if(/^(?:да|верно|правильно|да верно|да правильно)$/.test(s))return{kind:'confirm'};
 if(/^(?:нет|неверно|неправильно|нет не так)$/.test(s))return{kind:'reject'};
 const number=s.replace(/^(?:я думаю|думаю|это|ответ|получится|будет|всего|там|их) /,'').replace(/ (?:слаймик(?:а|ов)?|штук(?:а|и)?|получится)$/,'');
 if(Object.hasOwn(words,number))return{kind:'number',value:words[number]};
 if(/^(?:[0-9]|1[0-9]|20)$/.test(number))return{kind:'number',value:Number(number)};
 return{kind:'unknown'};
}
const api={parse};root.TEREM_VOICE_INTENTS=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

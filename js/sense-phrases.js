/* Реплики 3.6.0 (фокус, чувство числа, числовая прямая). Текст на экране = текст для записи голосом Дениса.
   Пока записи нет, реплика только показывается: системный синтезатор вместо Дениса не включается. */
(function(root){
  'use strict';
  const L=(text)=>({text,say:text});
  const SP={
    race:{
      intro:L('Бросай кубик и угадай, на какую клетку прыгнет твой слаймик. Кто первым доберётся до конца: Бульк или ты?'),
      roll:L('Твой ход. Бросай кубик.'),
      move:L('Куда прыгнет слаймик? Нажми на клетку.'),
      bulk:L('Получилось! Теперь ходит Бульк.'),
      win:L('Ты первый! Ты добрался до конца дорожки.'),
      lose:L('Бульк первый. Сыграем ещё?'),
      back:L('Слаймик прыгает вперёд, к большим числам.'),
      short:L('Чуть дальше. Прыгай по одной клетке и считай.'),
      far:L('Слишком далеко. Прыгай по одной клетке и считай.'),
      hop:L('Прыгай по одной клетке и считай.'),
      cross:L('Сначала допрыгни до десяти, а потом прыгай дальше.')
    },
    triple:{
      intro:L('Одно число можно написать цифрой, сказать словом и показать слаймиками. Найди всю тройку.'),
      task:L('Найди это число в других видах. Выбери по одной карточке в каждом ряду.'),
      done:L('Тройка собрана!'),
      word:L('Это другое слово. Послушай число ещё раз.'),
      digit:L('Это другое число. Сравни со слаймиками.'),
      picture:L('Здесь другое количество. Посчитай: десять и ещё сколько?'),
      help:L('Послушай число и посчитай слаймиков. В полном теремке десять.')
    },
    rest:{
      errors:L('Давай передохнём. Мозгу тоже нужен отдых. Сделай зарядку вместе с Бульком.'),
      pause:L('Задание тебя подождёт. Можно немного размяться и вернуться.'),
      game:L('Отдыхаем. Встань, потянись. Игра тебя подождёт.')
    },
    line:L('Посмотри на дорожку. Сначала прыжок до десяти. Сколько ещё?')
  };
  SP.enumerate=()=>{const out=[];const walk=o=>{for(const v of Object.values(o)){if(v&&typeof v==='object'){if(typeof v.say==='string')out.push([v.say,v.text]);else walk(v);}}};walk({race:SP.race,triple:SP.triple,rest:SP.rest,line:{l:SP.line}});return out;};
  SP.SPRITES='denis-360-sprites.json';
  if(typeof module!=='undefined'&&module.exports){module.exports=SP;return;}
  // Голос Дениса для новых реплик подключается, только если записи лежат в audio/.
  SP.has=ph=>!!(ph&&root.AUDIO&&root.AUDIO.sprites&&root.AUDIO.sprites.index[ph.say]);
  SP.speak=(ph,opt)=>{opt=opt||{};if(SP.has(ph)){root.AUDIO.say(ph,opt);return true;}if(opt.onend)setTimeout(opt.onend,0);return false;};
  function merge(){
    const A=root.AUDIO;if(!A)return;
    const base=A.base||'';
    fetch(base+'audio/'+SP.SPRITES).then(r=>r.ok?r.json():null).then(x=>{if(!x||!A.sprites)return;Object.assign(A.sprites.files,x.files);Object.assign(A.sprites.index,x.index);}).catch(()=>{});
  }
  let tries=0;(function wait(){if(root.AUDIO&&root.AUDIO.ready){merge();return;}if(++tries<100)setTimeout(wait,100);})();
  root.SP360=SP;
})(typeof window!=='undefined'?window:globalThis);

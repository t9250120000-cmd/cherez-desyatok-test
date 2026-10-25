/* Фразы «Копилки фактов». Отдельный каталог: основной phrases.js и его озвучка не меняются. */
(function(root){
'use strict';
const PH=root.PH, T=PH.T, num=PH.num;
const F={};
F.ui={
  intro:T`Запомни этот пример.`,
  aloud:T`Скажи его вслух вместе со мной.`,
  said:T`Отлично! Теперь потренируем.`,
  irStart:T`Сначала новый пример, потом знакомые. Поехали!`,
  sprintIntro:T`Три коротких рывка по двадцать секунд. Отвечай быстро, как можешь.`,
  rest:T`Передохни. Вдох, выдох.`,
  go:T`Поехали!`,
  round2:T`Второй рывок!`,
  round3:T`Последний рывок!`,
  tapedIntro:T`Я читаю пример, а ты отвечай раньше меня. Готов?`,
  beat:T`Успел!`,
  late:T`Я первый. Теперь введи ответ сам.`,
  learned:T`Новый пример в копилке!`,
  sprintDone:T`Рывки готовы! Молодец.`,
  tapedDone:T`Гонка окончена! Ты здорово разогнался.`,
  allKnown:T`Все примеры уже в копилке. Повторяем!`,
  locked:T`Копилка откроется, когда ты дойдёшь до острова Феи Капельки.`,
  due:T`Сегодня есть что повторить.`,
  noDue:T`На сегодня всё повторено. Можно добавить новый пример.`,
  wrongShow:T`Вот ответ. Повтори его.`,
  jar:T`Это волшебные банки памяти. Чем дольше помнишь пример, тем выше банка.`,
  bead:T`Бусинка в банке!`,
  jarUp:T`Бусинка прыгнула на полку выше!`,
  raceStart:T`Слаймовый забег! На старт, внимание, марш!`,
  mastered:T`Этот пример ты знаешь наизусть. Волшебно!`,
  streak:T`Три подряд! Ты разогнался.`,
  flashIntro:T`Сколько слаймиков? Я покажу их на секундочку. Не считай, просто посмотри.`,
  flashAsk:T`Сколько было?`,
  flashFaster:T`Быстрее! Теперь показываю короче.`,
  flashSlower:T`Ничего, покажу подольше.`,
  flashDone:T`Твои глаза видят число сразу. Волшебно!`,
  flashLevel:T`Новый уровень: теперь до десяти. Верхний этаж полный, это пять.`,
  lineIntro:T`Смотри на дорожку чисел: сначала прыгаем до десяти, потом остаток.`,
  noTimers:T`Спокойный режим: без секундомера, в своём темпе.`
};
F.problem=(o)=> o.op==='add' ? T`${num(o.a)} плюс ${num(o.b)}` : T`${num(o.m)} минус ${num(o.s)}`;
F.answer=(n)=>T`${num(n)}`;
F.full=(o)=> o.op==='add' ? PH.add.exEq(o.a,o.b,o.sum) : PH.sub.exEq(o.m,o.s,o.res);
F.enumerate=function(){
  const out=new Map(); const add=p=>{ if(p&&p.say) out.set(p.say,p.text); };
  Object.values(F.ui).forEach(add);
  for(let a=2;a<=9;a++) for(let b=2;b<=9;b++) if(a+b>10) add(F.problem({op:'add',a,b}));
  for(let m=11;m<=18;m++) for(let s=2;s<=9;s++) if(s>m-10) add(F.problem({op:'sub',m,s}));
  for(let n=0;n<=20;n++) add(F.answer(n));
  return out;
};
root.FP=F;
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined') module.exports=globalThis.FP;

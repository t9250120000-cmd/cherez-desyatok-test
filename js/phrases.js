/* Каталог всех фраз приложения. Каждая фраза = {text, say}: text показывается (с цифрами), say озвучивается (словами).
   Модуль общий для браузера и Node (перечисление вариантов для записи голоса). */
(function(root){
'use strict';
const M = ['ноль','один','два','три','четыре','пять','шесть','семь','восемь','девять','десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать','шестнадцать','семнадцать','восемнадцать','девятнадцать','двадцать'];
const F = M.slice(); F[1]='одна'; F[2]='две';
const G = ['ноля','одного','двух','трёх','четырёх','пяти','шести','семи','восьми','девяти','десяти','одиннадцати','двенадцати','тринадцати','четырнадцати','пятнадцати','шестнадцати','семнадцати','восемнадцати','девятнадцати','двадцати'];
function num(n, form){ return {d:String(n), w:(form==='f'?F:form==='g'?G:M)[n]}; }
function pl(n,f){ const a=n%10, b=n%100; if(a===1&&b!==11) return f[0]; if(a>=2&&a<=4&&(b<12||b>14)) return f[1]; return f[2]; }
const FISHN = ['слаймик','слаймика','слаймиков'];
const ROOM = ['комнатка','комнатки','комнаток'];
/* tagged template: numbers as num(), everything else as strings */
function T(strs, ...vals){
  let text='', say='';
  strs.forEach((s,i)=>{ text+=s; say+=s; if(i<vals.length){ const v=vals[i]; if(v && typeof v==='object' && 'd' in v){ text+=v.d; say+=v.w; } else { text+=v; say+=v; } } });
  say = say.replace(/(^|[^а-яё0-9])(до|из|от|после|с|у) 10(?![0-9])/gi,'$1$2 десяти').replace(/(^|[^0-9])10(?![0-9])/g,'$1десять');
  return {text, say};
}
function seq(a,b){ const d=[], w=[]; for(let i=a;i<=b;i++){ d.push(i); w.push(M[i]); } return {d:d.join(', '), w:w.join(', ')}; }
const PLUS='плюс', MINUS='минус', EQ='равно';
function eq(a,op,b,res){ const o = op==='+' ? {d:'+',w:PLUS} : {d:'−',w:MINUS}; return T`${num(a)} ${o} ${num(b)} ${{d:'=',w:EQ}} ${res==null?{d:'?',w:'сколько?'}:num(res)}`; }

const P = {};
/* --- общие --- */
P.praise = ['Верно!','Ура!','Волшебно!','Точно!','Молодец!','Так держать!'].map(s=>({text:s,say:s}));
P.ui = {
  voiceOn:T`Озвучка включена`, typeNow:T`Теперь введи ответ сам.`, remembered:T`Запомнил? Теперь теремок закрылся.`,
  diag:T`Реши, как умеешь. Подсказок не будет.`, diagStart:T`Сначала небольшая проверка. Реши примеры, как умеешь.`,
  phaseUp2:T`Получается! Теперь по картинке.`, phaseUp3:T`Получается! Теперь в уме.`, phaseDown:T`Вернёмся к слаймикам, так понятнее.`,
  allDone:T`Все друзья собраны! Ты освоил все навыки.`, seriesDone:T`Серия готова! Перерыв.`, welcome:T`Привет! Рад тебя видеть. Пойдём считать?`,
  diagRes:T`Проверка пройдена. Начнём с того, что пока не получается.`, diagPerfect:T`Всё решено верно! Будем тренироваться в уме.`,
  tooMany:T`Многовато. Нажми на лишнего красного, чтобы вернуть.`, secondFirst:T`Сначала отправь гулять всех из второго теремка.`,
  chest:T`Сундучок открылся! Выбери наклейку.`, streak:T`Ты занимаешься уже несколько дней подряд. Так держать!`,
  terem:T`Теремок полный!`, back:T`Возвращаемся на карту.`
};
P.moves = ['Попрыгай как слаймик десять раз и считай вслух.','Похлопай в ладоши десять раз, как на королевском балу.','Помаши руками, как фея крыльями: десять взмахов!','Присядь пять раз, потом ещё пять. Сколько всего?','Потянись вверх, как волшебник, и медленно досчитай до десяти.','Пройди десять маленьких шажков, как гном, считая вслух.'].map(s=>({text:s.replace('десять раз','10 раз').replace('десять взмахов','10 взмахов').replace('пять раз, потом ещё пять','5 раз, потом ещё 5').replace('до десяти','до 10').replace('десять маленьких','10 маленьких'),say:s}));
P.heroes = {
  see:  {name:'Слаймик Бульк', hello:T`Привет! Я Слаймик Бульк. Я умею видеть, сколько слаймиков в теремке, не считая по одному. Научу и тебя!`, unlock:T`Навык освоен! Теперь тебя ведёт Слаймик Бульк.`},
  to10: {name:'Пельмешек Тестик', hello:T`Привет! Я Пельмешек Тестик. Я знаю всех друзей числа десять. Два и восемь, три и семь. Пойдём знакомиться!`, unlock:T`Навык освоен! Теперь тебя ведёт Пельмешек Тестик.`},
  split:{name:'Дракоша Желе', hello:T`Привет! Я Дракоша Желе. Я умею разбивать числа на части. Семь, это три и четыре!`, unlock:T`Навык освоен! Теперь тебя ведёт Дракоша Желе.`},
  teen: {name:'Король Пельмень', hello:T`Приветствую! Я Король Пельмень. В моём королевстве каждое число больше десяти, это десяток и ещё немного.`, unlock:T`Навык освоен! Теперь тебя ведёт Король Пельмень.`},
  add:  {name:'Фея Капелька', hello:T`Привет! Я Фея Капелька. Я складываю через десяток: сначала до десяти, потом остаток. Волшебство!`, unlock:T`Навык освоен! Теперь тебя ведёт Фея Капелька.`},
  sub:  {name:'Гном Хинкалик', hello:T`Здравствуй! Я Гном Хинкалик. Я вычитаю через десяток: сначала убираю до десяти, потом остаток.`, unlock:T`Навык освоен! Теперь тебя ведёт Гном Хинкалик.`},
  mix:  {name:'Маг Мармелад', hello:T`Приветствую, юный волшебник! Я Маг Мармелад. Здесь мы считаем в уме, без теремков. Ты готов!`, unlock:T`Навык освоен! Теперь тебя ведёт Маг Мармелад.`}
};
P.story = [
  T`Далеко-далеко, за мятными холмами, стоит Сказочный Теремок.`,
  T`В нём десять комнаток: пять наверху и пять внизу.`,
  T`В теремке живут слаймики: красные клубничные и синие черничные.`,
  T`Когда все десять комнаток заняты, теремок полный. Это десяток!`,
  T`Семь друзей помогут тебе научиться считать через десяток.`,
  T`За каждое задание без ошибок ты получаешь звезду. За десять звёзд открывается сундучок с наклейкой.`,
  T`Пойдём! Нас уже ждёт Слаймик Бульк.`
];

/* --- навык 1: сколько слаймиков --- */
P.see = {
  countTap:T`Посчитай слаймиков. Нажимай на каждого по очереди.`,
  howMany:T`Сколько всего слаймиков?`,
  lastDigit:T`Посмотри на последнюю цифру.`,
  lastIs:n=>T`Последняя цифра ${num(n,'f')}. Значит, слаймиков ${num(n)}.`,
  exCounted:n=>T`Мы считали по порядку. Последняя цифра: ${num(n,'f')}.`,
  exTotal:n=>T`Значит, всего ${num(n)} ${pl(n,FISHN)}.`,
  floor5:T`Сколько слаймиков? На одном этаже живут ${num(5)}.`,
  topFull:T`Жёлтый этаж полный, это ${num(5)}. Сколько ещё внизу?`,
  countTop:T`Посчитай слаймиков на верхнем этаже.`,
  total:n=>T`Слаймиков: ${num(n)}.`,
  memorize:T`Запомни, сколько слаймиков. Потом теремок закроется.`,
  howWas:T`Сколько было слаймиков?`,
  lookAgain:T`Смотри ещё раз. На одном этаже ${num(5)}.`,
  exTop:T`Смотри. Верхний этаж полный, это пять.`,
  exBottom:n=>T`Внизу ещё ${num(n-5)}: ${seq(6,n)}.`,
  exFive:n=>T`Пять и ${num(n-5)}, это ${num(n)}. Всего ${num(n)} ${pl(n,FISHN)}.`,
  exOne:n=>T`Считаем по одному: ${seq(1,n)}.`,
  exAll:n=>T`Всего ${num(n)} ${pl(n,FISHN)}.`
};
/* --- навык 2: дружные с 10 --- */
P.to10 = {
  fillTap:T`Посели синих слаймиков, чтобы теремок стал полным.`,
  howAdded:T`Сколько синих слаймиков ты поселил?`,
  lastBlue:T`Посмотри на последнюю цифру на синих слаймиках.`,
  youAdded:k=>T`Ты поселил ${num(k)}.`,
  exBlue:k=>T`Посмотри на синих слаймиков. Ты считал их по порядку: ${seq(1,k)}.`,
  exLast:(n,k)=>T`Последняя цифра: ${num(k,'f')}. Ты поселил ${num(k)}. ${num(n)} и ${num(k)}, это десять.`,
  missing:T`Сколько не хватает до 10?`,
  countFree:T`Посчитай свободные комнатки, они жёлтые.`,
  missingIs:k=>T`Не хватает ${num(k,'g')}.`,
  exRooms:n=>T`В теремке десять комнаток. Красных слаймиков ${num(n)}.`,
  exFree:k=>T`Считаем свободные комнатки: ${seq(1,k)}.`,
  exSum:(n,k)=>T`Значит, до десяти не хватает ${num(k,'g')}. ${num(n)} и ${num(k)}, это десять.`,
  left:n=>T`Из 10 слаймиков гулять ушли ${num(n)}. Сколько осталось?`,
  result:T`Сколько получится?`,
  countRed:T`Посчитай красных слаймиков, которые остались.`,
  leftIs:k=>T`Осталось ${num(k)}.`,
  exWent:n=>T`Было десять слаймиков. Гулять ушли ${num(n)}, их комнатки пустые.`,
  exRed:k=>T`Считаем красных, которые остались: ${seq(1,k)}.`,
  exMinus:(n,k)=>T`Десять минус ${num(n)}, это ${num(k)}.`
};
/* --- навык 3: разбей число --- */
P.split = {
  paint:k=>T`Сделай красными: ${num(k)}. Нажимай на слаймиков.`,
  blueLeft:T`Сколько синих осталось?`,
  countBlue:T`Посчитай синих слаймиков.`,
  blueIs:r=>T`Синих ${num(r)}.`,
  ask:(b,k)=>T`${num(b)}, это ${num(k)} и сколько?`,
  isAnd:(b,k,r)=>T`${num(b)}, это ${num(k)} и ${num(r)}.`,
  exAll:(b,k)=>T`Всего ${num(b)} ${pl(b,FISHN)}. Красных ${num(k)}.`,
  exBlue:r=>T`Считаем синих: ${seq(1,r)}.`
};
/* --- навык 4: десяток и ещё --- */
P.teen = {
  put:u=>T`Посели во второй теремок: ${num(u)}. Нажимай на комнатки.`,
  tenAnd:u=>T`Полный десяток и ещё ${num(u)}. Сколько всего?`,
  countOn:T`Считай дальше от 10 по синим слаймикам.`,
  tenIs:(u,n)=>T`Десять и ${num(u)}, это ${num(n)}.`,
  howTotal:T`Сколько всего?`,
  exFull:T`Первый теремок полный, это десять.`,
  exSecond:u=>T`Во втором теремке ${num(u)}.`,
  exCountOn:n=>T`Считаем дальше от десяти: ${seq(11,n)}.`,
  hasTen:n=>T`В числе ${num(n)} есть полный десяток. Сколько ещё?`,
  hidden:T`Какое число спряталось?`,
  countSecond:T`Посчитай слаймиков во втором теремке.`,
  partIs:(n,u)=>T`${num(n)}, это 10 и ${num(u)}.`,
  exPart:n=>T`${num(n)}, это полный десяток и ещё несколько.`,
  exSecondSeq:u=>T`Во втором теремке: ${seq(1,u)}.`,
  exPartIs:(n,u)=>T`${num(n)}, это десять и ${num(u)}.`,
  allGone:T`Из второго теремка все ушли гулять. Сколько осталось?`,
  lookFirst:T`Посмотри на первый теремок. Он полный.`,
  tenLeft:T`Остался полный десяток, 10.`,
  exGone:(n,u)=>T`${num(n)}, это десять и ${num(u)}. Убираем ${num(u)}, весь второй теремок.`,
  exTenLeft:T`Остаётся полный десяток. Это десять.`
};
/* --- навык 5: плюс --- */
P.add = {
  moveTap:T`Переселяй синих слаймиков в первый теремок, пока он не заполнится. Нажимай на синих.`,
  blueLeft2:T`Сколько синих осталось во втором теремке?`,
  countBlue2:T`Посчитай синих слаймиков во втором теремке.`,
  leftIs:r=>T`Осталось ${num(r)}.`,
  exFirstFull:T`Первый теремок уже полный. Смотрим на второй.`,
  exBlueSeq:r=>T`Считаем синих: ${seq(1,r)}.`,
  exLeft2:r=>T`Во втором теремке осталось ${num(r)}.`,
  tenAnd:r=>T`Десяток и ещё ${num(r)}. Сколько всего?`,
  countOn2:T`Считай дальше от 10 по синим слаймикам во втором теремке.`,
  tenIs:(r,s)=>T`Десять и ${num(r)}, это ${num(s)}.`,
  missingFirst:T`Сколько не хватает первому теремку до 10?`,
  countFree:T`Посчитай свободные комнатки, они жёлтые.`,
  missingIs:k=>T`Не хватает ${num(k,'g')}.`,
  splitAsk:(b,k)=>T`${num(b)}, это ${num(k)} и сколько?`,
  yellowMove:k=>T`Жёлтые ${num(k)} переедут в первый теремок. Сколько синих останется?`,
  splitIs:(b,k,r)=>T`${num(b)}, это ${num(k)} и ${num(r)}.`,
  tenPlus:r=>eq(10,'+',r,null),
  result:T`Сколько получится?`,
  hint1:(a,k,b,r)=>T`Сначала до 10: ${num(a)} и ещё ${num(k)}. Разбей ${num(b)} на ${num(k)} и ${num(r)}.`,
  hint2:(a,k,r,s)=>T`${num(a)} плюс ${num(k)} равно 10, 10 плюс ${num(r)} равно ${num(s)}.`,
  exStart:(a,b)=>T`Решаем: ${num(a)} плюс ${num(b)}. Сначала дополняем до десяти.`,
  exRooms:(a,k)=>T`В первом теремке ${num(a)} ${pl(a,FISHN)}. Свободные комнатки: ${seq(1,k)}.`,
  exMissing:k=>T`Значит, до десяти не хватает ${num(k,'g')}.`,
  exSplit:(b,k,r)=>T`Разбиваем ${num(b)} на ${num(k)} и ${num(r)}.`,
  exMove:k=>T`${num(k)} ${pl(k,FISHN)} переезжают в первый теремок. Теремок полный, получился десяток.`,
  exLeft:r=>T`Во втором теремке осталось ${num(r)}.`,
  exFull:T`Первый теремок полный, это десять.`,
  exCountOn:s=>T`Считаем дальше от десяти: ${seq(11,s)}.`,
  exTenIs:(r,s)=>T`Десять и ${num(r)}, это ${num(s)}.`,
  exEq:(a,b,s)=>eq(a,'+',b,s)
};
/* --- навык 6: минус --- */
P.sub = {
  goTap:s=>T`Гулять уходят: ${num(s)}. Нажимай на слаймиков. Начни со второго теремка.`,
  emptyMore:n=>T`Второй теремок пустой! Отправь гулять ещё ${num(n,'g')} из десятка.`,
  howLeft:T`Сколько слаймиков осталось?`,
  countRed:T`Посчитай красных слаймиков, которые остались.`,
  leftIs:r=>T`Осталось ${num(r)}.`,
  exRedSeq:r=>T`Считаем красных, которые остались: ${seq(1,r)}.`,
  exLeftEq:(r,m,s)=>T`Осталось ${num(r)}. ${num(m)} минус ${num(s)} равно ${num(r)}.`,
  howSecond:T`Сколько слаймиков во втором теремке? Они уходят первыми.`,
  countSecond:T`Посчитай слаймиков во втором теремке.`,
  secondIs:u=>T`Во втором теремке ${num(u)}.`,
  exSecondSeq:u=>T`Смотрим на второй теремок. Считаем: ${seq(1,u)}.`,
  exSecondFirst:u=>T`Во втором теремке ${num(u)}. Они уходят первыми, чтобы осталось ровно десять.`,
  removedAsk:(u,s)=>T`Убрали ${num(u)}. ${num(s)}, это ${num(u)} и сколько?`,
  howMore:s=>T`Сколько ещё убрать, чтобы всего убрать ${num(s)}?`,
  splitIs:(s,u,r)=>T`${num(s)}, это ${num(u)} и ${num(r)}.`,
  tenMinus:r=>eq(10,'−',r,null),
  result:T`Сколько получится?`,
  hint1:(u,s,r)=>T`Сначала до 10: убери ${num(u)}. Разбей ${num(s)} на ${num(u)} и ${num(r)}.`,
  hint2:(m,u,r,res)=>T`${num(m)} минус ${num(u)} равно 10, 10 минус ${num(r)} равно ${num(res)}.`,
  exStart:(m,s)=>T`Решаем: ${num(m)} минус ${num(s)}. Сначала убираем до десяти.`,
  exSecond:u=>T`Во втором теремке ${num(u)} ${pl(u,FISHN)}. Они уходят гулять первыми.`,
  exRemoved:u=>T`Убрали ${num(u)}. Остался ровно один полный теремок, десять.`,
  exNeed:(s,u,r)=>T`Всего нужно убрать ${num(s)}. ${num(s)}, это ${num(u)} и ${num(r)}.`,
  exMore:(u,r)=>T`${num(u)} уже убрали. Из десятка убираем ещё ${num(r)}.`,
  exTake:r=>T`Убираем ${num(r)} из десятка.`,
  exCount:res=>T`Считаем, сколько осталось: ${seq(1,res)}.`,
  exTenMinus:(r,res)=>T`Десять минус ${num(r)}, это ${num(res)}.`,
  exEq:(m,s,res)=>eq(m,'−',s,res)
};
/* --- навык 7: в уме --- */
P.mix = {
  result:T`Сколько получится?`, hidden:T`Какое число спряталось?`, solve:T`Реши задачу.`,
  hintNo:T`Не угадывай. Посмотри подсказку и разбей число.`,
  hintAdd:T`Сначала до 10, потом остаток.`, hintSub:T`Сначала убери до 10, потом остаток из десятка.`,
  hintR:T`Сколько до 10, и сколько ещё после 10? Сложи эти два числа.`,
  hintL:(s,b)=>T`Это то же, что ${num(s)} минус ${num(b)}.`,
  hintS:T`Сколько убрали до 10, и сколько ещё из десятка? Сложи.`,
  revR:(k,r,b)=>T`Спряталось ${num(k)} плюс ${num(r)} равно ${num(b)}.`,
  revL:(s,b,a)=>T`${num(s)} минус ${num(b)} равно ${num(a)}.`,
  revS:(u,r,s)=>T`Спряталось ${num(u)} плюс ${num(r)} равно ${num(s)}.`,
  answer:a=>T`Ответ: ${num(a)}.`,
  exSeekR:(a,s)=>T`Ищем, сколько прибавили к ${num(a,'g')}, чтобы получилось ${num(s)}.`,
  exFromTo10:(a,k)=>T`От ${num(a,'g')} до десяти, это ${num(k)}.`,
  exFrom10:(s,r)=>T`От десяти до ${num(s,'g')}, ещё ${num(r)}.`,
  exHiddenR:(k,r,b)=>T`${num(k)} и ${num(r)}, это ${num(b)}. Спряталось ${num(b)}.`,
  exSeekL:(b,s)=>T`Ищем число, к которому прибавили ${num(b)} и получили ${num(s)}. Для этого из ${num(s,'g')} вычитаем ${num(b)}.`,
  exTo10L:(s,u)=>T`Сначала до десяти: ${num(s)} минус ${num(u)} равно 10.`,
  exThenL:(r,a)=>T`Потом ещё ${num(r)}: 10 минус ${num(r)} равно ${num(a)}.`,
  exHiddenA:a=>T`Спряталось ${num(a)}.`,
  exSeekS:(m,res)=>T`Ищем, сколько убрали из ${num(m,'g')}, чтобы осталось ${num(res)}.`,
  exRemoved10:(m,u)=>T`От ${num(m,'g')} до десяти убрали ${num(u)}.`,
  exFrom10S:(res,r)=>T`От десяти до ${num(res,'g')}, ещё ${num(r)}.`,
  exHiddenS:(u,r,s)=>T`${num(u)} и ${num(r)}, это ${num(s)}. Спряталось ${num(s)}.`,
  exWordAdd:(a,b)=>T`В задаче стало больше, значит, складываем: ${num(a)} плюс ${num(b)}.`,
  exWordSub:(m,s)=>T`В задаче стало меньше, значит, вычитаем: ${num(m)} минус ${num(s)}.`
};
/* --- текстовые задачи (детерминированный выбор по числам) --- */
const NAMES = [['Маша','Маши','f'],['Петя','Пети','m'],['Лиза','Лизы','f'],['Миша','Миши','m'],['Катя','Кати','f'],['Ваня','Вани','m'],['Даша','Даши','f'],['Саша','Саши','m']];
const OBJS = [['конфета','конфеты','конфет','f'],['наклейка','наклейки','наклеек','f'],['машинка','машинки','машинок','f'],['марка','марки','марок','f'],
  ['карточка','карточки','карточек','f'],['ракушка','ракушки','ракушек','f'],['шарик','шарика','шариков','m'],['орех','ореха','орехов','m']];
const NOUN = {pt:['птица','птицы','птиц','f'], str:['страница','страницы','страниц','f'], kar:['карандаш','карандаша','карандашей','m'],
  chel:['человек','человека','человек','m'], pir:['пирожок','пирожка','пирожков','m'], uch:['ученик','ученика','учеников','m'], ybl:['яблоко','яблока','яблок','n']};
const nn = (n,o)=>num(n, o[3]==='f'?'f':'m');
P.wordAdd = (a,b)=>{
  const [N,Gn,g]=NAMES[(a+b)%8], f=g==='f', o=OBJS[(a*3+b)%8], i=(a*7+b)%5;
  return [
    ()=>T`У ${Gn} было ${nn(a,o)} ${pl(a,o)}. ${f?'Ей':'Ему'} подарили ещё ${nn(b,o)}. Сколько ${o[2]} стало?`,
    ()=>T`На ветке сидели ${nn(a,NOUN.pt)} ${pl(a,NOUN.pt)}. Прилетели ещё ${nn(b,NOUN.pt)}. Сколько птиц стало на ветке?`,
    ()=>T`${N} ${f?'прочитала':'прочитал'} утром ${nn(a,NOUN.str)} ${pl(a,NOUN.str)}, а вечером ещё ${nn(b,NOUN.str)}. Сколько страниц всего?`,
    ()=>T`В одной коробке ${nn(a,NOUN.kar)} ${pl(a,NOUN.kar)}, в другой ${nn(b,NOUN.kar)}. Сколько карандашей в двух коробках?`,
    ()=>T`${N} ${f?'нашла':'нашёл'} ${nn(a,o)} ${pl(a,o)}, а потом ещё ${nn(b,o)}. Сколько ${o[2]} у ${f?'неё':'него'} теперь?`
  ][i]();
};
P.wordSub = (m,s)=>{
  const [N,Gn,g]=NAMES[(m+s)%8], f=g==='f', o=OBJS[(m*3+s)%8], i=(m*7+s)%5;
  return [
    ()=>T`У ${Gn} было ${nn(m,o)} ${pl(m,o)}. ${N} ${f?'отдала':'отдал'} ${nn(s,o)} ${f?'подруге':'другу'}. Сколько ${o[2]} осталось?`,
    ()=>T`В автобусе ехали ${nn(m,NOUN.chel)} ${pl(m,NOUN.chel)}. На остановке вышли ${nn(s,NOUN.chel)}. Сколько человек осталось в автобусе?`,
    ()=>T`На тарелке лежали ${nn(m,NOUN.pir)} ${pl(m,NOUN.pir)}. Съели ${nn(s,NOUN.pir)}. Сколько пирожков осталось?`,
    ()=>T`В классе было ${nn(m,NOUN.uch)} ${pl(m,NOUN.uch)}. Домой ушли ${nn(s,NOUN.uch)}. Сколько учеников осталось в классе?`,
    ()=>T`На дереве висели ${nn(m,NOUN.ybl)} ${pl(m,NOUN.ybl)}. Сорвали ${nn(s,NOUN.ybl)}. Сколько яблок осталось?`
  ][i]();
};
P.eq = eq; P.num = num; P.pl = pl; P.FISHN = FISHN; P.T = T; P.seq = seq;

/* Перечисление всех фраз, которые приложение может произнести */
P.enumerate = function(){
  const out = new Map();
  const add = p => { if(p && p.say) out.set(p.say, p.text); };
  const each = (obj) => Object.values(obj).forEach(v=>{ if(v && v.say) add(v); });
  P.praise.forEach(add); each(P.ui); P.moves.forEach(add); P.story.forEach(add);
  Object.values(P.heroes).forEach(h=>{ add(h.hello); add(h.unlock); });
  const R = (a,b)=>{ const r=[]; for(let i=a;i<=b;i++) r.push(i); return r; };
  // see
  each(P.see); R(1,10).forEach(n=>{ ['lastIs','exCounted','exTotal','total','exOne','exAll'].forEach(f=>add(P.see[f](n))); if(n>5){ add(P.see.exBottom(n)); add(P.see.exFive(n)); } });
  // to10
  each(P.to10); R(1,9).forEach(n=>{ const k=10-n; ['youAdded','exBlue','missingIs','exFree','leftIs','exRed'].forEach(f=>add(P.to10[f](k))); add(P.to10.exLast(n,k)); add(P.to10.exRooms(n)); add(P.to10.exSum(n,k)); add(P.to10.left(n)); add(P.to10.exWent(n)); add(P.to10.exMinus(n,k)); });
  // split
  each(P.split); for(let b=3;b<=9;b++) for(let k=1;k<b;k++){ const r=b-k; add(P.split.paint(k)); add(P.split.blueIs(r)); add(P.split.ask(b,k)); add(P.split.isAnd(b,k,r)); add(P.split.exAll(b,k)); add(P.split.exBlue(r)); }
  // teen
  each(P.teen); R(1,9).forEach(u=>{ const n=10+u; add(P.teen.put(u)); add(P.teen.tenAnd(u)); add(P.teen.tenIs(u,n)); add(P.teen.exSecond(u)); add(P.teen.exCountOn(n)); add(P.teen.hasTen(n)); add(P.teen.partIs(n,u)); add(P.teen.exPart(n)); add(P.teen.exSecondSeq(u)); add(P.teen.exPartIs(n,u)); add(P.teen.exGone(n,u)); });
  // add
  each(P.add);
  for(let a=2;a<=9;a++) for(let b=2;b<=9;b++) if(a+b>10){ const k=10-a, r=b-k, s=a+b;
    add(P.add.leftIs(r)); add(P.add.exBlueSeq(r)); add(P.add.exLeft2(r)); add(P.add.tenAnd(r)); add(P.add.tenIs(r,s)); add(P.add.missingIs(k)); add(P.add.splitAsk(b,k)); add(P.add.yellowMove(k)); add(P.add.splitIs(b,k,r)); add(P.add.tenPlus(r));
    add(P.add.hint1(a,k,b,r)); add(P.add.hint2(a,k,r,s)); add(P.add.exStart(a,b)); add(P.add.exRooms(a,k)); add(P.add.exMissing(k)); add(P.add.exSplit(b,k,r)); add(P.add.exMove(k)); add(P.add.exLeft(r)); add(P.add.exCountOn(s)); add(P.add.exTenIs(r,s)); add(P.add.exEq(a,b,s));
    // mix add forms
    add(P.mix.hintL(s,b)); add(P.mix.revR(k,r,b)); add(P.mix.revL(s,b,a)); add(P.mix.answer(s)); add(P.mix.exSeekR(a,s)); add(P.mix.exFromTo10(a,k)); add(P.mix.exFrom10(s,r)); add(P.mix.exHiddenR(k,r,b)); add(P.mix.exSeekL(b,s));
    const u2=s-10, r2=b-u2; add(P.mix.exTo10L(s,u2)); add(P.mix.exThenL(r2,a)); add(P.mix.exHiddenA(a)); add(P.mix.exWordAdd(a,b)); add(P.wordAdd(a,b));
  }
  // sub
  each(P.sub);
  for(let m=11;m<=18;m++) for(let s=2;s<=9;s++) if(s>m-10){ const u=m-10, r=s-u, res=m-s;
    add(P.sub.goTap(s)); add(P.sub.emptyMore(r)); add(P.sub.leftIs(res)); add(P.sub.exRedSeq(res)); add(P.sub.exLeftEq(res,m,s)); add(P.sub.secondIs(u)); add(P.sub.exSecondSeq(u)); add(P.sub.exSecondFirst(u)); add(P.sub.removedAsk(u,s)); add(P.sub.howMore(s)); add(P.sub.splitIs(s,u,r)); add(P.sub.tenMinus(r));
    add(P.sub.hint1(u,s,r)); add(P.sub.hint2(m,u,r,res)); add(P.sub.exStart(m,s)); add(P.sub.exSecond(u)); add(P.sub.exRemoved(u)); add(P.sub.exNeed(s,u,r)); add(P.sub.exMore(u,r)); add(P.sub.exTake(r)); add(P.sub.exCount(res)); add(P.sub.exTenMinus(r,res)); add(P.sub.exEq(m,s,res));
    add(P.mix.revS(u,r,s)); add(P.mix.answer(res)); add(P.mix.exSeekS(m,res)); add(P.mix.exRemoved10(m,u)); add(P.mix.exFrom10S(res,r)); add(P.mix.exHiddenS(u,r,s)); add(P.mix.exWordSub(m,s)); add(P.wordSub(m,s));
  }
  each(P.mix);
  // emptyMore can be 1..8
  R(1,8).forEach(n=>add(P.sub.emptyMore(n)));
  return out;
};
root.PH = P;
})(typeof window!=='undefined' ? window : globalThis);
if(typeof module!=='undefined') module.exports = globalThis.PH;

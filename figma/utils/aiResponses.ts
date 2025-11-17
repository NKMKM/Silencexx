// Эмпатичные ответы ИИ с мягким, понимающим тоном

interface EmotionalContext {
  text: string;
  mood?: string;
}

// Детектор кризисных фраз
export function detectCrisis(text: string): boolean {
  const crisisKeywords = [
    'не вижу смысла',
    'хочу исчезнуть',
    'бессмысленно жить',
    'не хочу жить',
    'покончить',
    'суицид',
    'умереть',
    'нет выхода',
    'всё бесполезно',
    'никому не нужен',
    'want to die',
    'kill myself',
    'no point',
    'end it all',
  ];

  const lowerText = text.toLowerCase();
  return crisisKeywords.some(keyword => lowerText.includes(keyword));
}

// Детектор эмоционального состояния
export function detectEmotion(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Гнев
  if (/(зол|бесит|раздражает|ненавижу|злость|furious|angry|hate)/i.test(lowerText)) {
    return 'anger';
  }
  
  // Грусть/подавленность
  if (/(грустн|печаль|одинок|устал|пустота|депресс|sad|lonely|tired|empty|depressed)/i.test(lowerText)) {
    return 'sadness';
  }
  
  // Тревога
  if (/(беспокоюсь|боюсь|тревож|паник|страшно|anxious|worried|scared|panic|fear)/i.test(lowerText)) {
    return 'anxiety';
  }
  
  // Вина
  if (/(виноват|стыдно|guilt|shame|sorry)/i.test(lowerText)) {
    return 'guilt';
  }
  
  return 'neutral';
}

// Генерация эмпатичных ответов
export function generateEmpathicResponse(context: EmotionalContext): string {
  const { text, mood } = context;
  const emotion = detectEmotion(text);
  const isCrisis = detectCrisis(text);

  // Кризисная ситуация
  if (isCrisis) {
    return 'Я слышу, что тебе очень тяжело прямо сейчас. То, что ты чувствуешь — это серьёзно, и это требует поддержки. Я здесь, но сейчас важно, чтобы рядом был кто-то, кто может по-настоящему помочь.';
  }

  // Ответы на основе эмоции
  switch (emotion) {
    case 'anger':
      return getAngerResponse(text);
    case 'sadness':
      return getSadnessResponse(text);
    case 'anxiety':
      return getAnxietyResponse(text);
    case 'guilt':
      return getGuiltResponse(text);
    default:
      return getGeneralResponse(text, mood);
  }
}

function getAngerResponse(text: string): string {
  const responses = [
    'Похоже, ты действительно зол. Это нормально. Твоя злость имеет право быть.',
    'Я слышу, насколько это тебя задевает. Не нужно гасить это чувство — просто дай себе почувствовать его.',
    'Ты имеешь право злиться. Иногда это единственный способ сказать "это несправедливо".',
    'Сейчас внутри много напряжения. Хочешь просто выдохнуть минуту?',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function getSadnessResponse(text: string): string {
  const responses = [
    'Сейчас ты, похоже, очень устал. Хочешь просто посидим вместе?',
    'Ты имеешь право быть в этом состоянии. Не нужно бежать от него.',
    'Слышу, что сейчас тяжело. Ты не обязан справляться идеально.',
    'Иногда грусть — это просто знак, что нужно остановиться. Дай себе время.',
    'Ты не один в этом чувстве. Я здесь, просто рядом.',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function getAnxietyResponse(text: string): string {
  const responses = [
    'Я вижу, что тебя это тревожит. Хочешь попробуем вместе подышать?',
    'Тревога громкая, я знаю. Но сейчас ты в безопасности. Давай просто на секунду выдохнем.',
    'То, что ты боишься — это не слабость. Это просто знак, что тебе важно.',
    'Иногда тревога говорит громче, чем нужно. Давай послушаем, что она хочет сказать.',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function getGuiltResponse(text: string): string {
  const responses = [
    'Ты не обязан быть идеальным. То, что ты чувствуешь вину, говорит о том, что тебе не всё равно.',
    'Слышу, что ты сейчас в самокритике. Хочешь попробуем говорить с собой помягче?',
    'Ты имеешь право ошибаться. Это часть того, как мы живём.',
    'Вина иногда громче, чем она есть на самом деле. Давай посмотрим на это вместе.',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function getGeneralResponse(text: string, mood?: string): string {
  // Ответы на основе настроения
  if (mood === 'Amazing') {
    return 'Это прекрасно, что ты чувствуешь такой подъём. Просто будь с этим чувством.';
  }
  if (mood === 'Good') {
    return 'Я рад, что сейчас хорошо. Иногда важно просто заметить это.';
  }
  if (mood === 'Okay') {
    return 'Окей — тоже нормально. Не всегда нужно быть на подъёме.';
  }
  if (mood === 'Low') {
    return 'Я с тобой. Не нужно ничего объяснять — просто знай, что я рядом.';
  }
  if (mood === 'Stressed') {
    return 'Сейчас на тебе много. Хочешь просто выдохнем вместе минуту?';
  }

  // Общие эмпатичные ответы
  const generalResponses = [
    'Я слышу тебя. Расскажи больше, если хочешь.',
    'Это звучит важно. Я здесь, чтобы слушать.',
    'Ты не обязан справляться идеально. Главное — не замолкать.',
    'Я рядом. Можешь говорить обо всём, что на душе.',
    'Иногда просто важно, чтобы кто-то услышал. Я слушаю.',
  ];
  
  return generalResponses[Math.floor(Math.random() * generalResponses.length)];
}

// Ответы на поделившиеся мысли из дневника
export function generateJournalResponse(thoughts: string): string {
  const isCrisis = detectCrisis(thoughts);
  
  if (isCrisis) {
    return 'Спасибо, что доверился мне. То, что ты написал — очень важно. Мне кажется, сейчас тебе нужна настоящая поддержка, не просто слова.';
  }

  const emotion = detectEmotion(thoughts);
  
  const responses = {
    anger: 'Спасибо, что поделился этим. Я вижу, сколько в тебе напряжения. Это правда, что ты чувствуешь?',
    sadness: 'Благодарю за доверие. Я слышу твою усталость. Ты не обязан сейчас что-то решать — просто можешь быть с этим.',
    anxiety: 'Спасибо, что написал об этом. Я вижу твою тревогу. Хочешь попробуем назвать, чего конкретно ты боишься?',
    guilt: 'Спасибо за честность. Я вижу, как ты строг к себе. А что бы ты сказал другу в такой ситуации?',
    neutral: 'Благодарю, что поделился. Я слышу тебя. Есть что-то, что хочешь понять в этих чувствах?',
  };

  return responses[emotion as keyof typeof responses] || responses.neutral;
}

// Подсказки для рефлексии
export function getReflectionPrompt(emotion: string): string {
  const prompts = {
    anger: 'Это злость или что-то под ней? Может, обида? Беспомощность?',
    sadness: 'Ты чувствуешь грусть, усталость или что-то ещё?',
    anxiety: 'Это тревога, страх или беспокойство? Все три разные.',
    guilt: 'Это вина или стыд? Или, может, просто усталость от самокритики?',
  };

  return prompts[emotion as keyof typeof prompts] || 'Как бы ты назвал то, что сейчас чувствуешь?';
}

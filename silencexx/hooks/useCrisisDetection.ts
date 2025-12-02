import { useState, useCallback } from 'react';
import { chatApi } from '@/services/api';

export interface CrisisDetectionResult {
  isCrisis: boolean;
  message: string;
  keywords?: string[];
  recommendations?: string[];
}

const CRISIS_KEYWORDS = [
  // Суицид / самовред
  'суицид',
  'самоубийство',
  'повеситься',
  'отравиться',
  'прыгнуть',
  'вскрыть',
  'умереть',
  'заканчивать жизнь',
  'нет смысла жить',
  'не хочу жить',
  'лучше умереть',
  'режу себя',
  'порезы',
  'самоповреждение',
  'наносить себе травмы',
  'голодовка',
  'отравление',
  'удушье',
  'выброситься',
  
  // Злоупотребление веществами
  'передоз',
  'передозировка',
  'наркотики',
  'наркомания',
  'героин',
  'кокаин',
  'метамфетамин',
  'фентанил',
  'опиоиды',
  'алкоголь',
  'алкоголизм',
  'запой',
  'спирт',
  
  // Психоз / галлюцинации
  'психоз',
  'галлюцинации',
  'видения',
  'голоса в голове',
  'слышу голоса',
  'параноя',
  'параноик',
  'бред',
  'потеря реальности',
  'расстройство личности',
  'шизофрения',
  
  // Насилие
  'убить',
  'убийство',
  'расправиться',
  'избить',
  'изнасиловать',
  'насилие',
  'мстить',
  'мщение',
];

const TOXICITY_KEYWORDS = [
  // Оскорбления
  'идиот',
  'дебил',
  'дура',
  'мудак',
  'козел',
  'ублюдок',
  
  // Неприличные выражения
  'блядь',
  'пиздец',
  'еб',
  'ёб',
];

export const useCrisisDetection = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastDetectionResult, setLastDetectionResult] = useState<CrisisDetectionResult | null>(null);

  const detectCrisis = useCallback(async (message: string): Promise<CrisisDetectionResult> => {
    try {
      setIsDetecting(true);

      // Проверка локальных ключевых слов
      const lowerMessage = message.toLowerCase();
      
      // Проверка кризиса
      const crisisKeywordsFound = CRISIS_KEYWORDS.filter(keyword =>
        lowerMessage.includes(keyword)
      );
      
      const isCrisis = crisisKeywordsFound.length > 0;

      // Проверка токсичности
      const toxicityKeywordsFound = TOXICITY_KEYWORDS.filter(keyword =>
        lowerMessage.includes(keyword)
      );

      // Попытка получить детальный анализ от backend
      let backendResult = null;
      try {
        backendResult = await chatApi.detectCrisis({ message });
      } catch (error) {
        console.warn('Backend crisis detection failed, using local detection:', error);
      }

      const result: CrisisDetectionResult = {
        isCrisis: isCrisis || (backendResult?.isCrisis ?? false),
        message: message,
        keywords: [
          ...crisisKeywordsFound,
          ...(backendResult?.keywords ?? []),
        ],
        recommendations: isCrisis
          ? [
              'Вы можете получить срочную помощь прямо сейчас',
              'Свяжитесь с горячей линией психологической помощи',
              'Обратитесь в ближайший центр здоровья или больницу',
            ]
          : toxicityKeywordsFound.length > 0
          ? [
              'Приложение работает в дружелюбной среде',
              'Пожалуйста, общайтесь уважительно',
            ]
          : undefined,
      };

      setLastDetectionResult(result);
      return result;
    } catch (error) {
      console.error('Error detecting crisis:', error);
      return {
        isCrisis: false,
        message: message,
      };
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const resetDetection = useCallback(() => {
    setLastDetectionResult(null);
  }, []);

  return {
    detectCrisis,
    isDetecting,
    lastDetectionResult,
    resetDetection,
  };
};

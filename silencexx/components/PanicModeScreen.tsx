import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  FadeIn,
  SlideInRight, 
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Theme } from '@/constants/theme';
import { api } from '@/services/api';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// ======================== TYPES ========================
type PanicStep =
  | 'welcome'
  | 'mode_selection'
  | 'anxiety_level_start'
  | 'breathing'
  | 'breathing_complete'
  | 'grounding_intro'
  | 'grounding_see'
  | 'grounding_touch'
  | 'grounding_hear'
  | 'grounding_smell'
  | 'grounding_grateful'
  | 'anxiety_talk'
  | 'ai_response'
  | 'final_check'
  | 'safety_plan'
  | 'complete'
  | 'crisis_resources';

type InteractionMode = 'text' | 'voice' | null;

interface GroundingStep {
  key: string;
  number: number;
  question: string;
  questionRu: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  placeholderRu: string;
  color: string;
}

// ======================== CONSTANTS ========================
const GROUNDING_STEPS: GroundingStep[] = [
  { 
    key: 'see',
    number: 5, 
    question: 'Look around. Name 5 things you can SEE right now.',
    questionRu: 'Посмотри вокруг. Назови 5 вещей, которые ты ВИДИШЬ.',
    icon: 'eye-outline', 
    placeholder: 'Wall, lamp, window, phone, plant...',
    placeholderRu: 'Стена, лампа, окно, телефон, растение...',
    color: Theme.accent.primary
  },
  { 
    key: 'touch',
    number: 4, 
    question: 'Now 4 things you can TOUCH or feel.',
    questionRu: 'Теперь 4 вещи, которые ты можешь ПОТРОГАТЬ.',
    icon: 'hand-left-outline', 
    placeholder: 'Soft blanket, cool table, warm cup...',
    placeholderRu: 'Мягкое одеяло, прохладный стол, тёплая чашка...',
    color: Theme.accent.secondary
  },
  { 
    key: 'hear',
    number: 3, 
    question: '3 sounds you can HEAR around you.',
    questionRu: '3 звука, которые ты СЛЫШИШЬ вокруг.',
    icon: 'ear-outline', 
    placeholder: 'Clock ticking, cars outside, breathing...',
    placeholderRu: 'Тиканье часов, машины за окном, дыхание...',
    color: Theme.accent.primary
  },
  { 
    key: 'smell',
    number: 2, 
    question: '2 things you can SMELL or TASTE.',
    questionRu: '2 вещи, которые ты можешь ПОЧУВСТВОВАТЬ на вкус или запах.',
    icon: 'flower-outline', 
    placeholder: 'Coffee aroma, fresh air...',
    placeholderRu: 'Аромат кофе, свежий воздух...',
    color: '#10b981'
  },
  { 
    key: 'grateful',
    number: 1, 
    question: '1 thing that gives you a sense of safety or gratitude.',
    questionRu: '1 вещь, за которую ты благодарен или которая даёт чувство опоры.',
    icon: 'heart-outline', 
    placeholder: 'My family, this moment of calm...',
    placeholderRu: 'Моя семья, этот момент спокойствия...',
    color: Theme.accent.primary
  },
];

const HELPLINES = {
  RU: [
    { name: 'Телефон доверия (бесплатно)', number: '8-800-2000-122', hours: 'Круглосуточно' },
    { name: 'Центр экстренной психологической помощи МЧС', number: '8-499-216-50-50', hours: 'Круглосуточно' },
    { name: 'Линия психологической помощи', number: '051 (с мобильного)', hours: 'Круглосуточно' },
    { name: 'Помощь при суицидальных мыслях', number: '8-800-100-49-94', hours: 'Круглосуточно' },
  ],
};

// ======================== MAIN COMPONENT ========================
export function PanicModeScreen() {
  const isDark = true;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // State
  const [currentStep, setCurrentStep] = useState<PanicStep>('welcome');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(null);
  const [anxietyLevelStart, setAnxietyLevelStart] = useState<number | null>(null);
  const [anxietyLevelEnd, setAnxietyLevelEnd] = useState<number | null>(null);
  const [scaryThought, setScaryThought] = useState('');
  const [groundingAnswers, setGroundingAnswers] = useState<Record<string, string>>({});
  const [aiResponse, setAiResponse] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Theme colors
  const colors = {
    bg: Theme.background.primary,
    card: Theme.background.card,
    cardBorder: 'rgba(255, 107, 0, 0.15)',
    text: Theme.text.primary,
    textSecondary: Theme.text.secondary,
    textMuted: Theme.text.tertiary,
    accent: Theme.accent.primary,
    accentLight: 'rgba(255, 107, 0, 0.15)',
    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
  };

  // Scroll to top on step change
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [currentStep]);

  // Haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        type === 'light' ? Haptics.ImpactFeedbackStyle.Light :
        type === 'medium' ? Haptics.ImpactFeedbackStyle.Medium :
        Haptics.ImpactFeedbackStyle.Heavy
      );
    }
  }, []);

  // Start panic mode
  const initiatePanicMode = async () => {
    try {
      setLoading(true);
      const response = await api.post('/panic/start', {});
      if (response.data?.success) {
        setSessionId(response.data.sessionId);
      }
    } catch (error) {
      console.error('Failed to start panic mode:', error);
      // Continue without session ID - local support still works
    } finally {
      setLoading(false);
      setCurrentStep('mode_selection');
    }
  };

  // Record anxiety level
  const recordAnxietyLevel = async (level: number, isStart: boolean) => {
    triggerHaptic('medium');
    
    if (sessionId) {
      try {
        await api.post('/panic/anxiety-level', {
          sessionId,
          level,
          isStart,
        });
      } catch (error) {
        console.error('Failed to record anxiety level:', error);
      }
    }

    if (isStart) {
      setAnxietyLevelStart(level);
      setCurrentStep('breathing');
    } else {
      setAnxietyLevelEnd(level);
      handleFinalAssessment(level);
    }
  };

  // Handle final assessment based on anxiety level
  const handleFinalAssessment = (level: number) => {
    if (level <= 4) {
      setCurrentStep('complete');
    } else if (level <= 7) {
      // Offer to repeat exercises
      Alert.alert(
        'Хочешь повторить?',
        'Ты можешь пройти дыхательное упражнение или заземление ещё раз.',
        [
          { text: 'Повторить дыхание', onPress: () => setCurrentStep('breathing') },
          { text: 'Повторить заземление', onPress: () => setCurrentStep('grounding_intro') },
          { text: 'Завершить', onPress: () => setCurrentStep('complete') },
        ]
      );
    } else {
      // High anxiety - show crisis resources
      setCurrentStep('crisis_resources');
    }
  };

  // Handle scary thought submission
  const handleScaryThoughtSubmit = async () => {
    if (!scaryThought.trim()) {
      Alert.alert('Поделись', 'Напиши мысль, которая тебя пугает');
      return;
    }

    setLoading(true);
    
    // Generate AI response
    const thoughtLower = scaryThought.toLowerCase();
    let response = '';
    
    // Simple pattern matching for compassionate responses
    if (thoughtLower.includes('умр') || thoughtLower.includes('смерт') || thoughtLower.includes('конец')) {
      response = `Я слышу: тебе страшно, что связано со смертью или концом чего-то важного.\n\nЭто очень пугающая мысль. Паника часто усиливает такие страхи, делая их более реальными, чем они есть. Прямо сейчас ты в безопасности. Эта мысль — не факт, а тревожная волна.\n\nЧто ты можешь сделать сейчас: сосредоточься на дыхании, почувствуй опору под ногами.`;
    } else if (thoughtLower.includes('схожу с ума') || thoughtLower.includes('теряю контроль') || thoughtLower.includes('сойду')) {
      response = `Я слышу: тебе страшно потерять контроль или рассудок.\n\nПаника часто создаёт именно это ощущение, но это иллюзия. Ты не сходишь с ума — твой мозг просто перегружен тревогой. То, что ты осознаёшь свой страх и можешь его описать — уже доказательство, что ты в контакте с реальностью.\n\nПриступ паники всегда проходит. Ты уже пережил такие моменты раньше.`;
    } else if (thoughtLower.includes('сердце') || thoughtLower.includes('инфаркт') || thoughtLower.includes('задыха')) {
      response = `Я слышу: тебе страшно за своё тело — сердце или дыхание.\n\nПаническая атака действительно вызывает учащённое сердцебиение и ощущение нехватки воздуха. Но это реакция тела на стресс, а не реальная угроза. Сердце здорового человека выдерживает панику без вреда.\n\nПопробуй дышать медленно: вдох на 4 счёта, выдох на 6. Твоё тело справится.`;
    } else {
      response = `Я слышу: тебе страшно, что "${scaryThought}".\n\nЭто понятный страх, и он имеет право быть. Паника часто усиливает пугающие мысли, но сама мысль — это не факт и не пророчество. Прямо сейчас ты в безопасности.\n\nЧто ты можешь сделать: сделай один маленький шаг к ощущению контроля — выпей воды, позвони близкому, просто посиди спокойно минуту.`;
    }

    setAiResponse(response);
    setLoading(false);
    setCurrentStep('ai_response');
  };

  // Complete session
  const handleComplete = async () => {
    if (sessionId && anxietyLevelEnd !== null) {
      try {
        await api.post('/panic/complete', {
          sessionId,
          endAnxietyLevel: anxietyLevelEnd,
          scaryThought: scaryThought || null,
          groundingAnswers,
        });
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
    }
    router.back();
  };

  // Call helpline
  const callHelpline = (number: string) => {
    const phoneNumber = number.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  // Exit confirmation
  const handleExit = () => {
    Alert.alert(
      'Выйти из режима паники?',
      'Ты всегда можешь вернуться, если понадобится.',
      [
        { text: 'Остаться', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  // ======================== RENDER STEPS ========================

  // Welcome Screen
  const renderWelcome = () => (
    <View style={styles.fullScreen}>
      <Animated.View entering={ZoomIn.duration(600)} style={styles.welcomeContainer}>
        <LinearGradient
          colors={Theme.accent.gradient as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeIconBg}
        >
          <Ionicons name="heart" size={64} color="#fff" />
        </LinearGradient>
        
        <Animated.Text 
          entering={FadeInDown.delay(300).duration(500)} 
          style={[styles.welcomeTitle, { color: colors.text }]}
        >
          Я с тобой
        </Animated.Text>
        
        <Animated.Text 
          entering={FadeInDown.delay(500).duration(500)} 
          style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}
        >
          Похоже, у тебя паническая волна.{'\n'}
          Это очень неприятно, но обычно не опасно для тела.{'\n\n'}
          Давай пройдём это вместе, шаг за шагом.
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(800).duration(500)} style={styles.welcomeButtonContainer}>
          <TouchableOpacity
            style={styles.welcomeButton}
            onPress={() => {
              triggerHaptic('medium');
              initiatePanicMode();
            }}
          >
            <LinearGradient
              colors={Theme.accent.gradient as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.welcomeButtonGradient}
            >
              <Text style={styles.welcomeButtonText}>Начать</Text>
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );

  // Mode Selection
  const renderModeSelection = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Как тебе удобнее?
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Выбери формат, в котором будем работать
      </Text>

      <View style={styles.modeButtons}>
        <TouchableOpacity
          style={[styles.modeButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => {
            triggerHaptic();
            setInteractionMode('text');
            setCurrentStep('anxiety_level_start');
          }}
        >
        <LinearGradient
            colors={['rgba(255, 107, 0, 0.2)', 'rgba(255, 140, 51, 0.1)']}
            style={styles.modeButtonIcon}
          >
            <Ionicons name="chatbubble-outline" size={32} color={colors.accent} />
          </LinearGradient>
          <Text style={[styles.modeButtonTitle, { color: colors.text }]}>💬 Читать текстом</Text>
          <Text style={[styles.modeButtonDesc, { color: colors.textSecondary }]}>
            Пошаговые инструкции на экране
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: 0.5 }]}
          disabled
        >
          <LinearGradient
            colors={['rgba(255, 140, 51, 0.2)', 'rgba(255, 107, 0, 0.1)']}
            style={styles.modeButtonIcon}
          >
            <Ionicons name="headset-outline" size={32} color={Theme.accent.primary} />
          </LinearGradient>
          <Text style={[styles.modeButtonTitle, { color: colors.text }]}>🎧 Слушать голосом</Text>
          <Text style={[styles.modeButtonDesc, { color: colors.textMuted }]}>
            Скоро будет доступно
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Anxiety Level Start
  const renderAnxietyLevelStart = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContainer}>
      <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Ionicons name="pulse-outline" size={28} color={colors.accent} />
        <Text style={[styles.messageText, { color: colors.text }]}>
          Сначала давай поймём, как ты себя чувствуешь
        </Text>
      </View>

      <Text style={[styles.stepTitle, { color: colors.text, marginTop: 24 }]}>
        По шкале от 0 до 10
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Насколько сильную тревогу ты чувствуешь прямо сейчас?
      </Text>

      <View style={styles.anxietyScaleLabels}>
        <Text style={[styles.scaleLabel, { color: colors.success }]}>Спокойно</Text>
        <Text style={[styles.scaleLabel, { color: colors.danger }]}>Очень плохо</Text>
      </View>

      <View style={styles.anxietyScale}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
          const bgColor = level <= 3 ? colors.success : level <= 6 ? colors.warning : colors.danger;
          return (
            <TouchableOpacity
              key={level}
              onPress={() => recordAnxietyLevel(level, true)}
              style={[styles.anxietyButton, { backgroundColor: bgColor }]}
            >
              <Text style={styles.anxietyButtonText}>{level}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );

  // Breathing Exercise
  const renderBreathing = () => (
    <BreathingExercise 
      isDark={isDark} 
      colors={colors}
      onComplete={() => {
        triggerHaptic('medium');
        setCurrentStep('breathing_complete');
      }} 
    />
  );

  // Breathing Complete
  const renderBreathingComplete = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContainer}>
      <View style={[styles.successCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        <Text style={[styles.successTitle, { color: colors.text }]}>
          Отлично! 🌟
        </Text>
        <Text style={[styles.successText, { color: colors.textSecondary }]}>
          Ты справился с дыхательным упражнением.{'\n'}
          Тело уже начинает успокаиваться.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          triggerHaptic();
          setCurrentStep('grounding_intro');
        }}
      >
        <LinearGradient
          colors={Theme.accent.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.primaryButtonText}>Продолжить</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // Grounding Intro
  const renderGroundingIntro = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContainer}>
      <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Ionicons name="leaf-outline" size={28} color={colors.accent} />
        <Text style={[styles.messageText, { color: colors.text }]}>
          Теперь давай вернём тебя в настоящий момент
        </Text>
      </View>

      <Text style={[styles.stepTitle, { color: colors.text, marginTop: 24 }]}>
        Упражнение «Заземление» 5-4-3-2-1
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Это переводит фокус из головы в реальность.{'\n'}
        Я буду задавать простые вопросы — отвечай честно.
      </Text>

      <View style={styles.groundingPreview}>
        {GROUNDING_STEPS.map((step) => (
          <View key={step.key} style={[styles.groundingPreviewItem, { borderColor: step.color + '40' }]}>
            <View style={[styles.groundingPreviewNumber, { backgroundColor: step.color + '20' }]}>
              <Text style={[styles.groundingPreviewNumberText, { color: step.color }]}>{step.number}</Text>
            </View>
            <Ionicons name={step.icon} size={20} color={step.color} />
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          triggerHaptic();
          setCurrentStep('grounding_see');
        }}
      >
        <LinearGradient
          colors={Theme.accent.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.primaryButtonText}>Начать заземление</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // Grounding Step
  const renderGroundingStep = (stepKey: string) => {
    const stepIndex = GROUNDING_STEPS.findIndex(s => s.key === stepKey);
    const step = GROUNDING_STEPS[stepIndex];
    const nextStepKey = stepIndex < GROUNDING_STEPS.length - 1 
      ? GROUNDING_STEPS[stepIndex + 1].key 
      : null;

    return (
      <GroundingStepComponent
        step={step}
        colors={colors}
        isDark={isDark}
        value={groundingAnswers[stepKey] || ''}
        onChange={(text) => setGroundingAnswers(prev => ({ ...prev, [stepKey]: text }))}
        onNext={() => {
          triggerHaptic();
          if (nextStepKey) {
            setCurrentStep(`grounding_${nextStepKey}` as PanicStep);
          } else {
            setCurrentStep('anxiety_talk');
          }
        }}
        isLast={!nextStepKey}
        progress={(stepIndex + 1) / GROUNDING_STEPS.length}
      />
    );
  };

  // Anxiety Talk
  const renderAnxietyTalk = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContainer}>
      <View style={[styles.successCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)', marginBottom: 24 }]}>
        <Ionicons name="checkmark-circle" size={32} color={colors.success} />
        <Text style={[styles.successText, { color: colors.textSecondary }]}>
          Ты прошёл заземление! Молодец 💪
        </Text>
      </View>

      <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Ionicons name="chatbubbles-outline" size={28} color={colors.accent} />
        <Text style={[styles.messageText, { color: colors.text }]}>
          Теперь, когда тело немного успокоилось, давай поговорим о том, что тебя пугает
        </Text>
      </View>

      <Text style={[styles.stepTitle, { color: colors.text, marginTop: 24 }]}>
        Какая мысль сейчас пугает больше всего?
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Напиши одной фразой — то, что крутится в голове
      </Text>

      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: colors.cardBorder,
          },
        ]}
        placeholder="Боюсь, что..."
        placeholderTextColor={colors.textMuted}
        value={scaryThought}
        onChangeText={setScaryThought}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleScaryThoughtSubmit}
        disabled={loading}
      >
        <LinearGradient
          colors={Theme.accent.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Думаю...' : 'Продолжить'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => {
          triggerHaptic();
          setCurrentStep('final_check');
        }}
      >
        <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>
          Пропустить этот шаг
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // AI Response
  const renderAiResponse = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContainer}>
      <View style={[styles.aiResponseCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.aiResponseHeader}>
          <LinearGradient
            colors={Theme.accent.gradient}
            style={styles.aiAvatar}
          >
            <Ionicons name="heart" size={20} color="#fff" />
          </LinearGradient>
          <Text style={[styles.aiResponseLabel, { color: colors.textMuted }]}>
            Я слышу тебя
          </Text>
        </View>
        
        <Text style={[styles.aiResponseText, { color: colors.text }]}>
          {aiResponse}
        </Text>

        <View style={[styles.disclaimerBox, { backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            Помни: паника часто усиливает страшные мысли, но это не значит, что они правда.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          triggerHaptic();
          setCurrentStep('final_check');
        }}
      >
        <LinearGradient
          colors={Theme.accent.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.primaryButtonText}>Продолжить</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // Final Check
  const renderFinalCheck = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContainer}>
      <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Ionicons name="analytics-outline" size={28} color={colors.accent} />
        <Text style={[styles.messageText, { color: colors.text }]}>
          Ты прошёл через это. Давай проверим, как ты себя чувствуешь сейчас
        </Text>
      </View>

      <Text style={[styles.stepTitle, { color: colors.text, marginTop: 24 }]}>
        По шкале от 0 до 10
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Насколько тебе плохо сейчас?
      </Text>

      <View style={styles.anxietyScaleLabels}>
        <Text style={[styles.scaleLabel, { color: colors.success }]}>Спокойно</Text>
        <Text style={[styles.scaleLabel, { color: colors.danger }]}>Очень плохо</Text>
      </View>

      <View style={styles.anxietyScale}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
          const bgColor = level <= 3 ? colors.success : level <= 6 ? colors.warning : colors.danger;
          return (
            <TouchableOpacity
              key={level}
              onPress={() => recordAnxietyLevel(level, false)}
              style={[styles.anxietyButton, { backgroundColor: bgColor }]}
            >
              <Text style={styles.anxietyButtonText}>{level}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );

  // Complete Screen
  const renderComplete = () => {
    const improvement = anxietyLevelStart !== null && anxietyLevelEnd !== null
      ? anxietyLevelStart - anxietyLevelEnd
      : 0;

    return (
      <Animated.View entering={FadeInDown.duration(400)} style={styles.fullScreen}>
        <LinearGradient
          colors={isDark ? ['#0a0a0f', '#1a1a2e'] : ['#fafafa', '#f0f4f8']}
          style={styles.completeGradient}
        >
          <Animated.View entering={ZoomIn.delay(200).duration(500)} style={styles.completeIconContainer}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.completeIcon}
            >
              <Ionicons name="checkmark" size={48} color="#fff" />
            </LinearGradient>
          </Animated.View>

          <Animated.Text 
            entering={FadeInDown.delay(400).duration(400)}
            style={[styles.completeTitle, { color: colors.text }]}
          >
            Ты справился! 💚
          </Animated.Text>

          <Animated.Text 
            entering={FadeInDown.delay(500).duration(400)}
            style={[styles.completeSubtitle, { color: colors.textSecondary }]}
          >
            Горжусь, что ты прошёл через это
          </Animated.Text>

          {anxietyLevelStart !== null && anxietyLevelEnd !== null && (
            <Animated.View 
              entering={FadeInDown.delay(600).duration(400)}
              style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Было</Text>
                <Text style={[styles.statValue, { color: colors.danger }]}>{anxietyLevelStart}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Стало</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>{anxietyLevelEnd}</Text>
              </View>
              {improvement > 0 && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Улучшение</Text>
                    <Text style={[styles.statValue, { color: colors.accent }]}>-{improvement}</Text>
                  </View>
                </>
              )}
            </Animated.View>
          )}

          <Animated.View 
            entering={FadeInDown.delay(700).duration(400)}
            style={[styles.reminderCard, { backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}
          >
            <Ionicons name="bulb-outline" size={20} color={colors.accent} />
            <Text style={[styles.reminderText, { color: colors.textSecondary }]}>
              Ты пережил 100% своих плохих дней. Эта паника тоже прошла.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(800).duration(400)} style={styles.completeActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleComplete}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>Спасибо, выйти</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Disclaimer */}
          <Animated.View 
            entering={FadeIn.delay(1000).duration(400)}
            style={styles.disclaimerContainer}
          >
            <Text style={[styles.disclaimerSmall, { color: colors.textMuted }]}>
              Я — не врач и не заменяю психотерапевта.{'\n'}
              Если приступы повторяются часто, обратись к специалисту.
            </Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Crisis Resources
  const renderCrisisResources = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContainer}>
      <View style={[styles.crisisHeader, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
        <Ionicons name="alert-circle" size={32} color={colors.danger} />
        <Text style={[styles.crisisTitle, { color: colors.text }]}>
          Тебе всё ещё очень плохо
        </Text>
        <Text style={[styles.crisisSubtitle, { color: colors.textSecondary }]}>
          Это нормально — иногда нужна помощь живого человека
        </Text>
      </View>

      <View style={[styles.crisisCard, { backgroundColor: colors.card, borderColor: colors.danger + '30' }]}>
        <Text style={[styles.crisisCardTitle, { color: colors.text }]}>
          Позвони близкому
        </Text>
        <Text style={[styles.crisisCardDesc, { color: colors.textSecondary }]}>
          Иногда просто услышать знакомый голос помогает
        </Text>
        <TouchableOpacity style={[styles.crisisButton, { backgroundColor: colors.accent }]}>
          <Ionicons name="call-outline" size={20} color="#fff" />
          <Text style={styles.crisisButtonText}>Позвонить маме/другу</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.helplineCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.helplineTitle, { color: colors.text }]}>
          Телефоны экстренной психологической помощи
        </Text>
        
        {HELPLINES.RU.map((line, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={styles.helplineItem}
            onPress={() => callHelpline(line.number)}
          >
            <View style={[styles.helplineIcon, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="call" size={18} color={colors.accent} />
            </View>
            <View style={styles.helplineInfo}>
              <Text style={[styles.helplineName, { color: colors.text }]}>{line.name}</Text>
              <Text style={[styles.helplineNumber, { color: colors.accent }]}>{line.number}</Text>
              <Text style={[styles.helplineHours, { color: colors.textMuted }]}>{line.hours}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.importantNotice, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: colors.danger + '30' }]}>
        <Ionicons name="warning-outline" size={24} color={colors.danger} />
        <Text style={[styles.importantText, { color: colors.text }]}>
          Я — не врач и не могу помочь в экстренной ситуации.{'\n\n'}
          Если тебе кажется, что ты можешь причинить себе вред — срочно обратись к живому человеку или вызови скорую.
        </Text>
      </View>

      <View style={styles.crisisActions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setCurrentStep('breathing')}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>
            Повторить дыхание
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setAnxietyLevelEnd(anxietyLevelEnd || 8);
            setCurrentStep('complete');
          }}
        >
          <LinearGradient
            colors={Theme.accent.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={styles.primaryButtonText}>Мне стало лучше</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // ======================== MAIN RENDER ========================
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      {currentStep !== 'welcome' && currentStep !== 'complete' && (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleExit} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          
          <View style={styles.headerTitle}>
            <Ionicons name="heart" size={18} color={Theme.accent.primary} />
            <Text style={[styles.headerTitleText, { color: colors.textSecondary }]}>
              Режим поддержки
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 'welcome' && renderWelcome()}
        {currentStep === 'mode_selection' && renderModeSelection()}
        {currentStep === 'anxiety_level_start' && renderAnxietyLevelStart()}
        {currentStep === 'breathing' && renderBreathing()}
        {currentStep === 'breathing_complete' && renderBreathingComplete()}
        {currentStep === 'grounding_intro' && renderGroundingIntro()}
        {currentStep === 'grounding_see' && renderGroundingStep('see')}
        {currentStep === 'grounding_touch' && renderGroundingStep('touch')}
        {currentStep === 'grounding_hear' && renderGroundingStep('hear')}
        {currentStep === 'grounding_smell' && renderGroundingStep('smell')}
        {currentStep === 'grounding_grateful' && renderGroundingStep('grateful')}
        {currentStep === 'anxiety_talk' && renderAnxietyTalk()}
        {currentStep === 'ai_response' && renderAiResponse()}
        {currentStep === 'final_check' && renderFinalCheck()}
        {currentStep === 'complete' && renderComplete()}
        {currentStep === 'crisis_resources' && renderCrisisResources()}
      </ScrollView>
    </View>
  );
}

// ======================== BREATHING COMPONENT ========================
function BreathingExercise({ 
  isDark, 
  colors,
  onComplete 
}: { 
  isDark: boolean;
  colors: any;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [cycle, setCycle] = useState(1);
  const [timer, setTimer] = useState(4);
  const maxCycles = 10;
  
  const circleScale = useSharedValue(0.6);
  const circleOpacity = useSharedValue(0.5);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let isMounted = true;
    
    const runBreathingCycle = () => {
      if (!isMounted) return;
      
      // Inhale - 4 seconds
      setPhase('inhale');
      setTimer(4);
      circleScale.value = withTiming(1.3, { duration: 4000, easing: Easing.inOut(Easing.ease) });
      circleOpacity.value = withTiming(1, { duration: 4000 });

      let countdown = 4;
      interval = setInterval(() => {
        if (!isMounted) {
          clearInterval(interval);
          return;
        }
        countdown--;
        setTimer(countdown);
        
        if (countdown === 0) {
          clearInterval(interval);
          
          // Hold - 2 seconds
          setPhase('hold');
          setTimer(2);
          let holdCountdown = 2;
          interval = setInterval(() => {
            if (!isMounted) {
              clearInterval(interval);
              return;
            }
            holdCountdown--;
            setTimer(holdCountdown);
            
            if (holdCountdown === 0) {
              clearInterval(interval);
              
              // Exhale - 6 seconds
              setPhase('exhale');
              setTimer(6);
              circleScale.value = withTiming(0.6, { duration: 6000, easing: Easing.inOut(Easing.ease) });
              circleOpacity.value = withTiming(0.5, { duration: 6000 });
              
              let exhaleCountdown = 6;
              interval = setInterval(() => {
                if (!isMounted) {
                  clearInterval(interval);
                  return;
                }
                exhaleCountdown--;
                setTimer(exhaleCountdown);
                
                if (exhaleCountdown === 0) {
                  clearInterval(interval);
                  
                  setCycle(prev => {
                    if (prev >= maxCycles) {
                      onComplete();
                      return prev;
                    }
                    return prev + 1;
                  });
                  
                  // Start next cycle
                  if (cycle < maxCycles) {
                    setTimeout(runBreathingCycle, 500);
                  }
                }
              }, 1000);
            }
          }, 1000);
        }
      }, 1000);
    };

    runBreathingCycle();

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
    opacity: circleOpacity.value,
  }));

  const phaseText = {
    inhale: 'Вдох',
    hold: 'Задержка',
    exhale: 'Выдох',
  };

  const phaseEmoji = {
    inhale: '🌬️',
    hold: '⏸️',
    exhale: '💨',
  };

  return (
    <View style={styles.breathingContainer}>
      <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 32 }]}>
        <Ionicons name="fitness-outline" size={28} color={colors.accent} />
        <Text style={[styles.messageText, { color: colors.text }]}>
          Дышим вместе. Следуй за кругом:{'\n'}
          Вдох 4 сек → Задержка 2 сек → Выдох 6 сек
        </Text>
      </View>

      <View style={styles.breathingCircleContainer}>
        <Animated.View style={[styles.breathingCircle, animatedCircleStyle]}>
          <LinearGradient
            colors={
              phase === 'inhale' ? Theme.accent.gradient :
              phase === 'hold' ? ['#f59e0b', '#d97706'] :
              ['#10b981', '#059669']
            }
            style={styles.breathingCircleGradient}
          >
            <Text style={styles.breathingEmoji}>{phaseEmoji[phase]}</Text>
            <Text style={styles.breathingPhaseText}>{phaseText[phase]}</Text>
            <Text style={styles.breathingTimer}>{timer}</Text>
          </LinearGradient>
        </Animated.View>

        <View style={styles.breathingRings}>
          {[1, 2, 3].map(ring => (
            <View 
              key={ring} 
              style={[
                styles.breathingRing, 
                { 
                  width: 160 + ring * 40, 
                  height: 160 + ring * 40,
                  borderColor: colors.accent + (20 - ring * 5).toString(16),
                }
              ]} 
            />
          ))}
        </View>
      </View>

      <View style={styles.breathingProgress}>
        <Text style={[styles.breathingCycleText, { color: colors.textSecondary }]}>
          Цикл {cycle} из {maxCycles}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: colors.accentLight }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: colors.accent,
                width: `${(cycle / maxCycles) * 100}%` 
              }
            ]} 
          />
        </View>
      </View>

      {cycle >= maxCycles && (
        <Animated.View entering={FadeInUp.duration(400)}>
          <TouchableOpacity style={styles.primaryButton} onPress={onComplete}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>Готово!</Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ======================== GROUNDING STEP COMPONENT ========================
function GroundingStepComponent({
  step,
  colors,
  isDark,
  value,
  onChange,
  onNext,
  isLast,
  progress,
}: {
  step: GroundingStep;
  colors: any;
  isDark: boolean;
  value: string;
  onChange: (text: string) => void;
  onNext: () => void;
  isLast: boolean;
  progress: number;
}) {
  return (
    <Animated.View entering={SlideInRight.duration(300)} style={styles.stepContainer}>
      {/* Progress */}
      <View style={styles.groundingProgressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.accentLight }]}>
          <View 
            style={[
              styles.progressFill, 
              { backgroundColor: step.color, width: `${progress * 100}%` }
            ]} 
          />
        </View>
        <Text style={[styles.groundingProgressText, { color: colors.textMuted }]}>
          Шаг {GROUNDING_STEPS.indexOf(step) + 1} из {GROUNDING_STEPS.length}
        </Text>
      </View>

      {/* Question Card */}
      <View style={[styles.groundingCard, { backgroundColor: colors.card, borderColor: step.color + '30' }]}>
        <View style={[styles.groundingNumberBadge, { backgroundColor: step.color + '20' }]}>
          <Text style={[styles.groundingNumber, { color: step.color }]}>{step.number}</Text>
        </View>
        
        <Ionicons name={step.icon} size={48} color={step.color} style={styles.groundingStepIcon} />
        
        <Text style={[styles.groundingQuestion, { color: colors.text }]}>
          {step.questionRu}
        </Text>
      </View>

      {/* Input */}
      <TextInput
        style={[
          styles.groundingInput,
          {
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: step.color + '40',
          },
        ]}
        placeholder={step.placeholderRu}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChange}
        multiline
        numberOfLines={3}
      />

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.primaryButton, !value.trim() && styles.buttonDisabled]}
        onPress={() => {
          if (value.trim()) {
            onNext();
          } else {
            Alert.alert('Пожалуйста', `Назови ${step.number} ${step.number === 1 ? 'вещь' : 'вещи'}`);
          }
        }}
      >
        <LinearGradient
          colors={[step.color, step.color + 'cc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.primaryButtonText}>
            {isLast ? 'Завершить заземление' : 'Далее'}
          </Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ======================== STYLES ========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
    minHeight: height - 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },

  // Welcome
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  welcomeIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  welcomeButtonContainer: {
    marginTop: 48,
    width: '100%',
  },
  welcomeButton: {
    width: '100%',
  },
  welcomeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  welcomeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // Mode Selection
  modeButtons: {
    gap: 16,
    marginTop: 24,
  },
  modeButton: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  modeButtonIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modeButtonDesc: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Message Card
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  messageText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },

  // Step styles
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },

  // Anxiety Scale
  anxietyScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scaleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  anxietyScale: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  anxietyButton: {
    width: (width - 88) / 6,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anxietyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Buttons
  primaryButton: {
    marginTop: 24,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Success Card
  successCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    gap: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  successText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Grounding
  groundingPreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 24,
  },
  groundingPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  groundingPreviewNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundingPreviewNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  groundingProgressContainer: {
    marginBottom: 24,
  },
  groundingProgressText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  groundingCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  groundingNumberBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  groundingNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  groundingStepIcon: {
    marginBottom: 16,
  },
  groundingQuestion: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  groundingInput: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Text Input
  textInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    marginTop: 16,
  },

  // AI Response
  aiResponseCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  aiResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiResponseLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  aiResponseText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Breathing
  breathingContainer: {
    flex: 1,
    alignItems: 'center',
  },
  breathingCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
  },
  breathingCircle: {
    position: 'absolute',
    zIndex: 1,
  },
  breathingCircleGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  breathingPhaseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  breathingTimer: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 4,
  },
  breathingRings: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  breathingProgress: {
    alignItems: 'center',
    marginTop: 32,
    width: '100%',
  },
  breathingCycleText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Complete
  completeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  completeIconContainer: {
    marginBottom: 24,
  },
  completeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
  },
  reminderText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  completeActions: {
    width: '100%',
  },
  disclaimerContainer: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  disclaimerSmall: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Crisis Resources
  crisisHeader: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    gap: 12,
  },
  crisisTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  crisisSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  crisisCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  crisisCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  crisisCardDesc: {
    fontSize: 14,
  },
  crisisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  crisisButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  helplineCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  helplineTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  helplineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 0, 0.1)',
  },
  helplineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  helplineInfo: {
    flex: 1,
  },
  helplineName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  helplineNumber: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  helplineHours: {
    fontSize: 12,
  },
  importantNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  importantText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  crisisActions: {
    gap: 12,
  },
});

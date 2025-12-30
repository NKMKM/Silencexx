import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { generateAIResponse, detectCrisisKeywords, analyzeMood, aiTranscribeVoice } from './ai';
import { 
  register, 
  login, 
  verifyOTP, 
  resendOTP, 
  resetPassword,
  getProfile,
  getSessions,
  deleteSession,
  logout,
  checkSessionActive,
  verifyToken
} from './auth';
import { googleAuth, appleAuth } from './oauth';
import { 
  createChat, 
  getChatList, 
  getChatMessages, 
  saveChatMessage,
  deleteChat as deleteChatHistory
} from './chat';
import {
  sendAnonymousMessage,
  getReceivedMessages,
  canSendMessage,
  markMessageAsRead
} from './inbox';
import {
  transcribeAudio,
  synthesizeSpeech,
  processChatWithVoice,
  getSupportedLanguages
} from './voice';
import { query } from './db'; // Добавляем импорт query
import './db'; // Initialize database connection
import {
  checkChatLimit,
  checkFeatureAccess,
  incrementLimitCounter,
  getUserLimits,
} from './subscriptions';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Логирование запросов
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Authentication Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/verify-otp', verifyOTP);
app.post('/api/auth/resend-otp', resendOTP);
app.post('/api/auth/reset-password', resetPassword);

// Profile & Sessions (защищенные роуты - проверяем активность сессии)
app.get('/api/auth/profile', checkSessionActive, getProfile);
app.get('/api/auth/sessions', checkSessionActive, getSessions);
app.delete('/api/auth/sessions/:sessionId', checkSessionActive, deleteSession);
app.post('/api/auth/logout', checkSessionActive, logout);

// Chat History Routes
app.post('/api/chats/create', checkSessionActive, createChat);
app.get('/api/chats/list', checkSessionActive, getChatList);
app.get('/api/chats/:chatId/messages', checkSessionActive, getChatMessages);

// Voice routes
app.post('/api/transcribe', transcribeAudio);
app.post('/api/synthesize', synthesizeSpeech);
app.post('/api/chat-with-voice', checkSessionActive, processChatWithVoice);
app.get('/api/supported-languages', getSupportedLanguages);

// Inbox
app.post('/api/anonymous-message', canSendMessage, sendAnonymousMessage);
app.get('/api/inbox/received', checkSessionActive, getReceivedMessages);
app.patch('/api/inbox/messages/:messageId/read', checkSessionActive, markMessageAsRead);

// Server info and startup logs
const startupMessage = () => {
  console.log('🚀 CloudMind Backend is starting up...');
};
startupMessage();

app.post('/api/chats/:chatId/message', checkSessionActive, saveChatMessage);
app.delete('/api/chats/:chatId', checkSessionActive, deleteChatHistory);
// OAuth Routes
app.post('/api/auth/oauth/google', googleAuth);
app.post('/api/auth/oauth/apple', appleAuth);

// Inbox Routes
app.post('/api/inbox/send', checkSessionActive, sendAnonymousMessage);
app.get('/api/inbox/received', checkSessionActive, getReceivedMessages);
app.get('/api/inbox/can-send', checkSessionActive, canSendMessage);
app.post('/api/inbox/:id/mark-read', checkSessionActive, markMessageAsRead);

// API Routes

/**
 * POST /api/chat
 * Отправляет сообщение AI и получает ответ
 * 
 * Body:
 * - message: string (обязательно) - Сообщение пользователя
 * - mood?: string (enum) - Текущее настроение: Happy, Neutral, Sad, Anxious, Angry, Low, Stressed
 * - conversationHistory?: Array - История чата
 * - chatId?: number - ID чата для сохранения истории
 * 
 * УЛУЧШЕНИЯ:
 * - Валидация mood перед обработкой
 * - Логирование информации о подписке пользователя
 * - Правильное сохранение mood в БД
 * - Гарантированная изоляция сообщений между пользователями
 * - Автоматическое обновление счётчика лимита
 */
app.post('/api/chat', checkSessionActive, checkChatLimit, async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(7);
  try {
    const { 
      message, 
      mood, 
      conversationHistory, 
      chatId, 
      audioUri, 
      isVoiceMessage,
      language = 'ru',
      transcript,
      isTranscribed
    } = req.body;

    console.log(`\n🔹 [${requestId}] POST /api/chat - NEW REQUEST`);

    // ===== ВАЛИДАЦИЯ MOOD =====
    // Валидируем mood перед тем как использовать его
    const validMoods = ['Happy', 'Neutral', 'Sad', 'Anxious', 'Angry', 'Low', 'Stressed'];
    let validatedMood: string | undefined = undefined;

    if (mood) {
      if (!validMoods.includes(mood)) {
        console.warn(`⚠️ [${requestId}] Invalid mood value: "${mood}". Valid: ${validMoods.join(', ')}`);
        return res.status(400).json({
          success: false,
          error: `Недопустимое значение mood. Допустимые: ${validMoods.join(', ')}`,
        });
      }
      validatedMood = mood;
      console.log(`📊 [${requestId}] Mood validated: ${validatedMood}`);
    } else {
      console.log(`📊 [${requestId}] No mood provided (undefined is acceptable)`);
    }

    // Если это голосовое сообщение без транскрипции - используем ИИ для транскрипции
    let processedMessage = message;
    if (isVoiceMessage && (!message || message.trim().length === 0) && audioUri) {
      console.log(`🎤 [${requestId}] Voice message without transcription, using AI to transcribe...`);
      try {
        processedMessage = await aiTranscribeVoice({ conversationHistory });
        console.log(`✅ [${requestId}] AI Transcription: "${processedMessage.substring(0, 80)}..."`);
      } catch (error) {
        console.warn(`⚠️ [${requestId}] AI Transcription failed, using fallback text`);
        processedMessage = '🎙️ Голосовое сообщение (не распознано)';
      }
    }

    if (!processedMessage || typeof processedMessage !== 'string') {
      console.warn(`⚠️ [${requestId}] Invalid message parameter`);
      return res.status(400).json({
        error: 'Требуется поле "message" (строка)',
      });
    }

    // ===== ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ПОЛЬЗОВАТЕЛЕ И ЕГО ПОДПИСКЕ =====
    let userName: string | undefined;
    let userId: number | undefined;
    let subscriptionInfo: any = null;
    
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      console.log(`🔑 [${requestId}] Token exists:`, !!token);
      
      if (token) {
        const decoded = verifyToken(token);
        userId = decoded.userId;
        console.log(`👤 [${requestId}] User ID from token: ${userId}`);
        
        // Получаем информацию о пользователе и его подписке
        const userQuery = `
          SELECT 
            ud.name,
            st.slug as subscription_tier,
            st.name as subscription_name,
            st.daily_chat_limit,
            st.daily_voice_limit,
            st.daily_mood_analysis_limit,
            st.daily_journal_limit,
            st.priority_level,
            (SELECT COUNT(*) FROM daily_limits 
             WHERE user_id = u.id AND reset_date = CURRENT_DATE AND chat_requests_used > 0) as has_usage_today
          FROM users u
          LEFT JOIN user_description ud ON u.user_desc_id = ud.id
          LEFT JOIN user_subscriptions us ON u.id = us.user_id
          LEFT JOIN subscription_tiers st ON us.tier_id = st.id
          WHERE u.id = $1
        `;
        const userResult = await query(userQuery, [userId]);
        
        console.log(`📊 [${requestId}] User query result rows:`, userResult.rows.length);
        
        if (userResult.rows.length > 0) {
          const userData = userResult.rows[0];
          
          if (userData.name) {
            userName = userData.name;
            console.log(`✅👤 [${requestId}] User name from DB: "${userName}"`);
          }
          
          // Логируем информацию о подписке
          if (userData.subscription_tier) {
            subscriptionInfo = {
              tier: userData.subscription_tier,
              tierName: userData.subscription_name,
              dailyChatLimit: userData.daily_chat_limit,
              dailyVoiceLimit: userData.daily_voice_limit,
              dailyMoodLimit: userData.daily_mood_analysis_limit,
              dailyJournalLimit: userData.daily_journal_limit,
              priority: userData.priority_level,
            };
            console.log(`💳 [${requestId}] Subscription Info:`);
            console.log(`   Tier: ${subscriptionInfo.tierName} (${subscriptionInfo.tier})`);
            console.log(`   Daily Chat Limit: ${subscriptionInfo.dailyChatLimit}`);
            console.log(`   Has usage today: ${userData.has_usage_today > 0 ? 'YES' : 'NO'}`);
          } else {
            console.log(`⚠️ [${requestId}] No subscription found - user may be Free tier or uninitialized`);
          }
        } else {
          console.log(`⚠️ [${requestId}] No user data found in DB`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ [${requestId}] Could not get user info:`, error);
    }

    console.log(`📨 [${requestId}] User message: "${processedMessage.substring(0, 50)}..."`);
    if (conversationHistory) {
      console.log(`📜 [${requestId}] History size: ${conversationHistory.length}`);
    }

    console.log(`⏳ [${requestId}] Calling generateAIResponse with mood=${validatedMood || 'undefined'}...`);
    const response = await generateAIResponse(processedMessage, {
      mood: validatedMood, // Передаём валидированное значение
      conversationHistory,
      userName,
    });

    // Доп. рекомендация: предложить посмотреть календарь, если пользователь говорит о дневнике
    let suggestViewCalendar = false;
    try {
      const lower = (message || '').toLowerCase();
      const calendarKeywords = ['календар', 'дневник', 'запис', 'журнал', 'дневник мыслей'];
      if (calendarKeywords.some(k => lower.includes(k))) {
        suggestViewCalendar = true;
      } else {
        // если настроение анализируется как плохое/стресс — предложим обсудить на основе календаря
        try {
          const moodAnalysis = await analyzeMood(message);
          if (moodAnalysis && (moodAnalysis.detectedMood === 'Low' || moodAnalysis.detectedMood === 'Stressed')) {
            suggestViewCalendar = true;
          }
        } catch (e) {
          // ignore mood analysis errors
          console.warn('Mood analysis failed for suggestViewCalendar:', e);
        }
      }
    } catch (e) {
      console.warn('Error determining suggestViewCalendar:', e);
    }

    console.log(`✅ [${requestId}] Response received`);
    console.log(`🤖 [${requestId}] AI response length: ${response.response.length}`);
    console.log(`🤖 [${requestId}] AI preview: "${response.response.substring(0, 80)}..."`);

    // ===== СОХРАНЕНИЕ СООБЩЕНИЙ В БД =====
    if (chatId && userId) {
      try {
        console.log(`💾 [${requestId}] Saving messages to chat ${chatId} with mood=${validatedMood || 'null'}`);
        
        // Проверяем что чат принадлежит пользователю (двойная проверка безопасности)
        const chatCheck = await query(
          'SELECT id, is_first_message FROM chat_id WHERE id = $1 AND user_id = $2',
          [chatId, userId]
        );

        if (chatCheck.rows.length > 0) {
          const isFirstMessage = chatCheck.rows[0].is_first_message;
          
          // Сохраняем сообщение пользователя с user_id и mood
          if (isVoiceMessage && audioUri) {
            await query(
              `INSERT INTO user_chat (chat_id, user_id, message, senddate, audio_uri, language, transcript, is_transcribed, mood) 
               VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)`,
              [chatId, userId, processedMessage, audioUri, language, transcript || processedMessage, isTranscribed || true, validatedMood || null]
            );
          } else {
            await query(
              `INSERT INTO user_chat (chat_id, user_id, message, senddate, language, mood) 
               VALUES ($1, $2, $3, NOW(), $4, $5)`,
              [chatId, userId, processedMessage, language, validatedMood || null]
            );
          }
          
          // Сохраняем ответ AI с user_id и mood
          await query(
            `INSERT INTO ai_response (chat_id, user_id, message, senddate, language, mood) 
             VALUES ($1, $2, $3, NOW(), $4, $5)`,
            [chatId, userId, response.response, language, validatedMood || null]
          );
          
          // Обновляем is_first_message флаг если это первое сообщение
          if (isFirstMessage) {
            await query(
              'UPDATE chat_id SET is_first_message = false, updated_at = NOW() WHERE id = $1 AND user_id = $2',
              [chatId, userId]
            );
            console.log(`✅ [${requestId}] First message flag updated to false`);
          }
          
          console.log(`✅ [${requestId}] Messages saved to database with user isolation`);
        } else {
          console.warn(`⚠️ [${requestId}] Chat ${chatId} not found or access denied for user ${userId}`);
        }
      } catch (saveError) {
        console.error(`❌ [${requestId}] Error saving messages:`, saveError);
        // Не прерываем выполнение, если не удалось сохранить
      }
    }

    res.json({
      success: true,
      response: response.response,
      isCrisis: response.isCrisis,
      mood: validatedMood, // Возвращаем валидированное значение mood
      suggestViewCalendar,
      requestId,
      subscription: subscriptionInfo, // Добавляем информацию о подписке в ответ
    });
    
    // ===== УВЕЛИЧЕНИЕ СЧЁТЧИКА ЛИМИТА =====
    // После успешного ответа уменьшаем лимит запросов пользователя
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token && userId) {
      try {
        const decoded = verifyToken(token);
        console.log(`📊 [${requestId}] Incrementing chat request counter for user ${decoded.userId}...`);
        
        const limitResult = await incrementLimitCounter(decoded.userId, 'chat_requests');
        console.log(`✅ [${requestId}] Counter incremented:`, limitResult);
        
        // Логируем текущее состояние лимитов
        try {
          const limitsQuery = `
            SELECT 
              dl.chat_requests_used,
              st.daily_chat_limit,
              (st.daily_chat_limit - dl.chat_requests_used) as remaining_requests,
              dl.reset_date
            FROM daily_limits dl
            JOIN user_subscriptions us ON dl.user_id = us.user_id
            JOIN subscription_tiers st ON us.tier_id = st.id
            WHERE dl.user_id = $1 AND dl.reset_date = CURRENT_DATE
          `;
          const currentLimits = await query(limitsQuery, [decoded.userId]);
          if (currentLimits.rows.length > 0) {
            const limits = currentLimits.rows[0];
            console.log(`📈 [${requestId}] Current limits for user ${decoded.userId}:`);
            console.log(`   Used: ${limits.chat_requests_used}/${limits.daily_chat_limit}`);
            console.log(`   Remaining: ${limits.remaining_requests}`);
            console.log(`   Reset at: ${limits.reset_date}`);
          }
        } catch (limitsError) {
          console.warn(`⚠️ [${requestId}] Could not log current limits:`, limitsError);
        }
      } catch (e) {
        console.warn(`⚠️ [${requestId}] Could not increment chat request counter:`, e);
      }
    }
    
    console.log(`✨ [${requestId}] Response sent successfully\n`);
  } catch (error) {
    console.error(`\n❌ [${requestId}] ERROR in /api/chat:`);
    console.error(`   Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`   Error type: ${error?.constructor?.name}`);
    console.error(`   Full error:`, error);
    
    res.status(500).json({
      success: false,
      error: 'Ошибка при обработке сообщения',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId,
    });
  }
});

/**
 * POST /api/detect-crisis
 * Проверяет, является ли сообщение кризисным
 */
app.post('/api/detect-crisis', (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Требуется поле "message" (строка)',
      });
    }

    const isCrisis = detectCrisisKeywords(message);

    if (isCrisis) {
      console.log('🆘 КРИЗИС ОБНАРУЖЕН!');
    }

    res.json({
      success: true,
      isCrisis,
      helplines: isCrisis
        ? [
            {
              name: 'Телефон доверия',
              number: '8-800-2000-122',
              country: 'Россия',
            },
            {
              name: 'Ясное утро',
              number: '8-800-100-49-94',
              country: 'Россия',
            },
          ]
        : [],
    });
  } catch (error) {
    console.error('Ошибка в /api/detect-crisis:', error);
    res.status(500).json({
      error: 'Ошибка при проверке кризиса',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Middleware для проверки функции анализа настроения
 */
const checkMoodAnalysisLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    const access = await checkFeatureAccess(decoded.userId, 'mood_analysis');

    if (!access.allowed) {
      return res.status(429).json({
        success: false,
        error: access.reason,
        limits: access.limitsInfo,
      });
    }

    (req as any).userLimits = access.limitsInfo;
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    console.error('❌ Error in checkMoodAnalysisLimit:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * POST /api/analyze-mood
 * Анализирует текст и определяет эмоциональное состояние
 */
app.post('/api/analyze-mood', checkSessionActive, checkMoodAnalysisLimit, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Требуется поле "text" (строка)',
      });
    }

    console.log(`🎭 Анализ настроения: ${text.substring(0, 50)}...`);

    const analysis = await analyzeMood(text);

    // Увеличиваем счётчик анализа настроения
    if ((req as any).userId) {
      await incrementLimitCounter((req as any).userId, 'mood_analysis');
    }

    res.json({
      success: true,
      ...analysis,
    });
  } catch (error) {
    console.error('Ошибка в /api/analyze-mood:', error);
    res.status(500).json({
      error: 'Ошибка при анализе настроения',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Middleware для проверки функции журнала
 */
const checkJournalLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    const access = await checkFeatureAccess(decoded.userId, 'journal');

    if (!access.allowed) {
      return res.status(429).json({
        success: false,
        error: access.reason,
        limits: access.limitsInfo,
      });
    }

    (req as any).userLimits = access.limitsInfo;
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    console.error('❌ Error in checkJournalLimit:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * POST /api/journal
 * Обрабатывает запись в журнал с AI анализом
 */
app.post('/api/journal', checkSessionActive, checkJournalLimit, async (req: Request, res: Response) => {
  try {
    const { thoughts } = req.body;

    if (!thoughts || typeof thoughts !== 'string') {
      return res.status(400).json({
        error: 'Требуется поле "thoughts" (строка)',
      });
    }

    console.log(`📖 Запись в журнал: ${thoughts.substring(0, 50)}...`);

    // Генерируем ответ для записи в журнал
    const systemPrompt =
      'Ты слушаешь проникновенную запись человека в журнал. Ответь с глубокой эмпатией, признав его чувства и, если нужно, предложив мягко переформулировать мысли позитивно. Ответ кратким и тёплым.';

    const response = await generateAIResponse(
      `Я написал в своём журнал это:\n\n${thoughts}`,
      {}
    );

    // Увеличиваем счётчик записей в журнал
    if ((req as any).userId) {
      await incrementLimitCounter((req as any).userId, 'journal_entries');
    }

    res.json({
      success: true,
      aiResponse: response.response,
      isCrisis: response.isCrisis,
    });
  } catch (error) {
    console.error('Ошибка в /api/journal:', error);
    res.status(500).json({
      error: 'Ошибка при обработке записи в журнал',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/journal/entry?date=YYYY-MM-DD
 * Возвращает запись пользователя за конкретную дату (если есть)
 * Требует авторизации (Bearer token)
 */
app.get('/api/journal/entry', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const { date } = req.query;
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ success: false, error: 'Query param "date" required in YYYY-MM-DD format' });
    }

    const entry = await query(
      'SELECT id, diary_date, diary_content FROM diary WHERE user_id = $1 AND DATE(diary_date) = $2',
      [userId, date]
    );

    if (entry.rows.length === 0) {
      return res.json({ success: true, exists: false, entry: null });
    }

    return res.json({ success: true, exists: true, entry: entry.rows[0] });
  } catch (error) {
    console.error('Ошибка в GET /api/journal/entry:', error);
    return res.status(500).json({ success: false, error: 'Ошибка при получении записи' });
  }
});

/**
 * GET /api/journal/list
 * Возвращает список дат, в которые пользователь делал записи
 */
app.get('/api/journal/list', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const rows = await query(
      `SELECT id, diary_date FROM diary WHERE user_id = $1 ORDER BY diary_date DESC`,
      [userId]
    );

    // map to simple date-only strings
    const dates = rows.rows.map((r: any) => ({ id: r.id, date: r.diary_date.toISOString().slice(0,10) }));

    return res.json({ success: true, dates });
  } catch (error) {
    console.error('Ошибка в GET /api/journal/list:', error);
    return res.status(500).json({ success: false, error: 'Ошибка при получении списка записей' });
  }
});

/**
 * POST /api/journal/entry
 * Создать запись в журнал для указанной даты.
 * Правила: можно создать только одну запись в день; нельзя создавать записи для прошлых дат; редактирование не предусмотрено.
 * Body: { date: 'YYYY-MM-DD', content: string }
 */
app.post('/api/journal/entry', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const { date, content } = req.body;
    if (!date || typeof date !== 'string' || !content || typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'Fields "date" and "content" are required' });
    }

    // check date format (basic)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Дата должна быть в формате YYYY-MM-DD' });
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0,10);

    // disallow creating for past dates
    if (date < todayStr) {
      return res.status(403).json({ success: false, error: 'Нельзя создавать записи за прошлые даты' });
    }

    // allow only one entry per day
    const existing = await query('SELECT id FROM diary WHERE user_id = $1 AND DATE(diary_date) = $2', [userId, date]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Запись на эту дату уже существует' });
    }

    // AI moderation: detect crisis and analyze mood
    try {
      const isCrisis = detectCrisisKeywords(content);
      if (isCrisis) {
        // If crisis — do not save, respond with helplines
        return res.status(422).json({
          success: false,
          isCrisis: true,
          helplines: [
            { name: 'Телефон доверия', number: '8-800-2000-122', country: 'Россия' },
            { name: 'Ясное утро', number: '8-800-100-49-94', country: 'Россия' },
          ],
          error: 'Обнаружены кризисные сигналы — требуются немедленные действия и поддержка',
        });
      }

      // analyze mood
      let moodResult: any = null;
      try {
        moodResult = await analyzeMood(content);
      } catch (moodErr) {
        console.warn('Mood analysis failed:', moodErr);
      }

      // Optionally create a short supportive AI feedback (ask permission to view calendar)
      let aiFeedback: string | null = null;
      try {
        const prompt = `Пользователь написал в дневник: "${content}"\n\nДай короткий (1-2 предложения) эмпатичный отклик и в конце спроси: можно ли посмотреть его календарь и обсудить записи на его основе?`;
        const aiResp = await generateAIResponse(prompt, {});
        aiFeedback = aiResp.response;
      } catch (feedErr) {
        console.warn('AI feedback generation failed:', feedErr);
      }

      // insert (set timestamp to date at midnight)
      const insert = await query(
        'INSERT INTO diary (user_id, diary_date, diary_content) VALUES ($1, $2::timestamp, $3) RETURNING id',
        [userId, date, content]
      );

      return res.json({ success: true, id: insert.rows[0].id, mood: moodResult?.detectedMood || null, aiFeedback });

    } catch (moderationErr) {
      console.error('Error during moderation for journal entry:', moderationErr);
      return res.status(500).json({ success: false, error: 'Ошибка модерации записи' });
    }
  } catch (error) {
    console.error('Ошибка в POST /api/journal/entry:', error);
    return res.status(500).json({ success: false, error: 'Ошибка при создании записи' });
  }
});

// 404 обработчик
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint не найден',
    path: req.path,
    method: req.method,
  });
});

// Запуск сервера
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         🌥️  CloudMind Backend запущен! 🌥️          ║
╠══════════════════════════════════════════════════════╣
║  Port: ${PORT}                                     ║
║  Environment: ${config.nodeEnv}                     ║
║  Ollama API: ${config.ollamaUrl ? '✅ Готов' : '❌ Не настроен'}                              ║
╠══════════════════════════════════════════════════════╣
║  Endpoints:                                          ║
║  ✓ GET  /health                                      ║
║                                                      ║
║  Auth:                                               ║
║  ✓ POST /api/auth/register                           ║
║  ✓ POST /api/auth/login                              ║
║  ✓ POST /api/auth/verify-otp                         ║
║  ✓ POST /api/auth/resend-otp                         ║
║  ✓ POST /api/auth/reset-password                     ║
║                                                      ║
║  OAuth:                                              ║
║  ✓ POST /api/auth/oauth/google                       ║
║  ✓ POST /api/auth/oauth/apple                        ║
║                                                      ║
║  AI:                                                 ║
║  ✓ POST /api/chat                                    ║
║  ✓ POST /api/detect-crisis                           ║
║  ✓ POST /api/analyze-mood                            ║
║  ✓ POST /api/journal                                 ║
║                                                      ║
║  Subscriptions:                                      ║
║  ✓ GET /api/subscription/limits                      ║
╚══════════════════════════════════════════════════════╝
  `);
});

// Subscription Routes
/**
 * GET /api/subscription/limits
 * Получить информацию о лимитах пользователя
 */
app.get('/api/subscription/limits', checkSessionActive, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token' });
    }

    const decoded = verifyToken(token);
    const limits = await getUserLimits(decoded.userId);

    if (!limits) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      limits,
    });
  } catch (error) {
    console.error('Error getting user limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription limits',
    });
  }
});

export default app;

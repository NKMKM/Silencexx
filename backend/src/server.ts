import { readConversation, saveConversationTurn } from './conversation';
import { rateLimit } from 'express-rate-limit';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer'; // New architecture requirement
import path from 'path';
import { config } from './config';
import { aiContext } from './aiContext';
import { getAIUsage } from './aiUsage';
import { getDailyWish } from './dailyWish';
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
  verifyToken,
  updateProfile,
  changePassword,
  requestEmailChange,
  verifyEmailChange,
  requestPasswordReset,
  resetPasswordWithToken,
  getEmailChangeStatus,
  uploadAvatar
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
  getSupportedLanguages,
  processVoiceMessage
} from './voice';
import { 
  getDailyTask, 
  openDailyTask, 
  completeDailyTask 
} from './dailyTasks';
import { query } from './db'; // Добавляем импорт query
import './db'; // Initialize database connection
import {
  checkChatLimit,
  checkFeatureAccess,
  reserveDailyLimit,
  getUserLimits,
} from './subscriptions';
import {
  createPayment,
  confirmPayment,
  getPaymentHistory,
  getAvailablePlans,
  cancelSubscription,
  getCurrentSubscription,
} from './payments';
import {
  startPanicMode,
  recordAnxietyLevel,
  processPanicStep,
  completePanicMode,
  getPanicHistory,
} from './panicMode';
import {
  sendMessage,
  getMessages,
  deleteMessage,
  getMessageStatus,
  clearChat,
} from './messages';
import { initializeQueue } from './aiQueue';
import { preloadCommonResponses } from './cache';

const app = express();

// Voice Architecture: Multer setup
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10 } });


// Middleware
app.use(cors());
app.use(express.json());
app.disable('x-powered-by');
const trustedProxy = process.env.TRUST_PROXY?.trim();
if (trustedProxy) {
  // Prefer an explicit proxy address/subnet (for example `loopback` for ngrok
  // forwarding to this machine) over trusting an arbitrary number of hops.
  app.set('trust proxy', trustedProxy);
} else {
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (Number.isInteger(proxyHops) && proxyHops > 0) app.set('trust proxy', proxyHops);
}
app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: 'Too many requests. Please try later.' } }));
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: 'Too many requests. Please try later.' } });
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/request-password-reset', '/api/auth/reset-password-with-token', '/api/auth/oauth'], authLimiter);
// Carry verified account identity through every asynchronous AI operation.
app.use('/api', (req, _res, next) => {
  let userId: number | undefined;
  try { userId = verifyToken(req.headers.authorization?.replace(/^Bearer /, '') || '').userId; } catch { /* Route auth still applies. */ }
  aiContext.run({ userId, feature: req.path.split('/').filter(Boolean)[0] || 'other' }, next);
});
const publicApiPaths = new Set([
  '/auth/register', '/auth/login', '/auth/verify-otp', '/auth/resend-otp',
  '/auth/reset-password', '/auth/request-password-reset', '/auth/reset-password-with-token',
  '/auth/verify-email-change', '/auth/oauth/google', '/auth/oauth/apple',
  '/supported-languages', '/subscriptions/available-plans', '/detect-crisis',
]);
app.use('/api', (req, res, next) => publicApiPaths.has(req.path) ? next() : checkSessionActive(req, res, next));
app.get('/api/ai/usage', checkSessionActive, getAIUsage);

// Serve static files from uploads directory
app.get('/uploads/:filename', async (req, res) => {
  const filename = req.params.filename;
  if (!/^[a-f0-9]{32}$/.test(filename)) return res.status(404).end();
  try {
    const avatar = await query('SELECT 1 FROM user_description WHERE avatar=$1 LIMIT 1', [filename]);
    const send = () => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');
      res.sendFile(path.join(__dirname, '../uploads', filename), error => {
        if (error && !res.headersSent) res.status(404).end();
      });
    };
    if (avatar.rows.length) return send();
    await checkSessionActive(req, res, async () => {
      try {
        const userId = res.locals.verifiedSession.userId;
        const owned = await query('SELECT 1 FROM messages WHERE user_id=$1 AND audio_url=$2 LIMIT 1', [userId, `uploads/${filename}`]);
        if (!owned.rows.length) return res.status(404).end();
        send();
      } catch { if (!res.headersSent) res.status(503).end(); }
    });
  } catch { if (!res.headersSent) res.status(503).end(); }
});

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
app.post('/api/auth/request-password-reset', requestPasswordReset);
app.post('/api/auth/reset-password-with-token', resetPasswordWithToken);

// Profile & Sessions (защищенные роуты - проверяем активность сессии)
app.get('/api/auth/profile', checkSessionActive, getProfile);
app.put('/api/auth/profile', checkSessionActive, updateProfile);
app.post('/api/auth/change-password', checkSessionActive, changePassword);
app.post('/api/auth/request-email-change', checkSessionActive, requestEmailChange);
app.post('/api/auth/verify-email-change', verifyEmailChange);
app.get('/api/auth/email-change-status', checkSessionActive, getEmailChangeStatus);
app.post('/api/auth/upload-avatar', checkSessionActive, upload.single('avatar') as any, uploadAvatar);
app.get('/api/auth/sessions', checkSessionActive, getSessions);
app.delete('/api/auth/sessions/:sessionId', checkSessionActive, deleteSession);
app.post('/api/auth/logout', checkSessionActive, logout);

// Chat History Routes
app.post('/api/chats/create', checkSessionActive, createChat);
app.get('/api/chats/list', checkSessionActive, getChatList);
app.get('/api/chats/:chatId/messages', checkSessionActive, getChatMessages);

// Voice routes
// New Architecture: Voice Messages
app.post('/api/messages/voice', checkSessionActive, upload.single('audio') as any, processVoiceMessage);

// Test endpoint for WhisperX
app.post('/api/test/voice', (_req, res) => { res.status(404).json({ error: 'Not found' }); }, upload.single('audio') as any, async (req: Request, res: Response) => {
  try {
    console.log('\n🧪 [TEST] =======================================');
    console.log('🧪 [TEST] Voice upload test endpoint hit');
    console.log('🧪 [TEST] File:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file received' });
    }

    const fs = require('fs');
    const path = require('path');
    const { exec } = require('child_process');

    const audioPath = req.file.path;
    console.log('🧪 [TEST] Audio path:', audioPath);
    console.log('🧪 [TEST] File exists:', fs.existsSync(audioPath));
    console.log('🧪 [TEST] File size:', fs.statSync(audioPath).size, 'bytes');

    const scriptPath = path.join(__dirname, '../scripts/transcribe.py');
    console.log('🧪 [TEST] Script path:', scriptPath);
    console.log('🧪 [TEST] Script exists:', fs.existsSync(scriptPath));

    // Use full path to Python 3.13 where WhisperX is installed
    const pythonPath = process.platform === 'win32' 
        ? 'C:\\Users\\artem\\AppData\\Local\\Programs\\Python\\Python313\\python.exe'
        : 'python';

    const result: any = await new Promise((resolve, reject) => {
      const command = `"${pythonPath}" "${scriptPath}" "${audioPath}" ru`;
      console.log('🧪 [TEST] Running command:', command);
      
      exec(command, { timeout: 120000 }, (err: any, stdout: string, stderr: string) => {
        console.log('🧪 [TEST] stdout:', stdout);
        console.log('🧪 [TEST] stderr:', stderr);
        
        if (err && !stdout) {
          console.error('🧪 [TEST] Exec error:', err);
          reject(new Error(stderr || err.message));
          return;
        }
        
        try {
          const json = JSON.parse(stdout);
          resolve(json);
        } catch (e) {
          console.error('🧪 [TEST] JSON parse error');
          reject(e);
        }
      });
    });

    console.log('🧪 [TEST] Result:', result);
    console.log('🧪 [TEST] =======================================\n');

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('🧪 [TEST] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/supported-languages', getSupportedLanguages);

// Inbox
app.post('/api/anonymous-message', checkSessionActive, sendAnonymousMessage);
app.get('/api/inbox/received', checkSessionActive, getReceivedMessages);
app.patch('/api/inbox/messages/:messageId/read', checkSessionActive, markMessageAsRead);

// Daily Tasks
app.get('/api/daily-wish', checkSessionActive, getDailyWish);
app.get('/api/daily-task', checkSessionActive, getDailyTask);
app.put('/api/daily-task/open', checkSessionActive, openDailyTask);
app.put('/api/daily-task/complete', checkSessionActive, completeDailyTask);

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
      } catch (error) {
        console.warn(`⚠️ [${requestId}] Audio transcription unavailable; rejecting untranscribed audio`);
        return res.status(422).json({ success: false, error: 'Audio must be transcribed through /api/voice/message before chat generation' });
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

    if (conversationHistory) {
      console.log(`📜 [${requestId}] History size: ${conversationHistory.length}`);
    }

    console.log(`⏳ [${requestId}] Calling generateAIResponse with mood=${validatedMood || 'undefined'}...`);
    let verifiedHistory = conversationHistory;
    const ownerId = res.locals.verifiedSession.userId as number;
    if (chatId !== undefined && chatId !== null) {
      if (!Number.isSafeInteger(Number(chatId)) || Number(chatId) <= 0) return res.status(400).json({ success: false, error: 'Invalid chat ID' });
      const owner = await query('SELECT id FROM chat_id WHERE id=$1 AND user_id=$2', [Number(chatId),ownerId]);
      if (!owner.rows.length) return res.status(403).json({ success: false, error: 'Chat not found or access denied' });
      verifiedHistory = (await readConversation(Number(chatId), ownerId))
        .filter(row => row.status === 'ready' && row.text && ['user','assistant'].includes(row.role))
        .map(row => ({ role: row.role, content: row.text }));
    }
    const response = await generateAIResponse(processedMessage, {
      mood: validatedMood, // Передаём валидированное значение
      conversationHistory: verifiedHistory,
      userName,
      language,
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

    if (chatId) {
      await saveConversationTurn(Number(chatId), ownerId, processedMessage, response.response,
        isVoiceMessage ? audioUri : undefined);
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

    if (!await reserveDailyLimit(decoded.userId, 'mood_analysis', access.limitsInfo!.dailyMoodAnalysisLimit)) return res.status(429).json({ success: false, error: 'Daily limit reached' });
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

    if (!await reserveDailyLimit(decoded.userId, 'journal_entries', access.limitsInfo!.dailyJournalLimit)) return res.status(429).json({ success: false, error: 'Daily limit reached' });
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
      `SELECT id, diary_date, diary_content FROM diary WHERE user_id = $1 AND diary_date >= $2::date AND diary_date < $2::date + INTERVAL '1 day'`,
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
app.post('/api/journal/entry', checkSessionActive, checkJournalLimit, async (req: Request, res: Response) => {
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

    const offset = Number(req.body.utcOffsetMinutes ?? 0);
    if (!Number.isInteger(offset) || offset < -840 || offset > 840 || content.length > 8000) return res.status(400).json({ success: false, error: 'Invalid offset or entry too long' });
    const today = new Date(Date.now() + offset * 60000);
    const todayStr = today.toISOString().slice(0,10);

    // disallow creating for past dates
    if (date !== todayStr) {
      return res.status(403).json({ success: false, error: 'Можно создать запись только за сегодняшний день' });
    }

    // allow only one entry per day
    const existing = await query(`SELECT id FROM diary WHERE user_id = $1 AND diary_date >= $2::date AND diary_date < $2::date + INTERVAL '1 day'`, [userId, date]);
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

// Запуск сервера
const PORT = config.port;

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

// Payment Routes
app.post('/api/payments/create', checkSessionActive, createPayment);
app.post('/api/payments/confirm', checkSessionActive, confirmPayment);
app.get('/api/payments/history', checkSessionActive, getPaymentHistory);

/**
 * GET /api/subscriptions/limits
 * Получить лимиты пользователя (plural form)
 */
app.get('/api/subscriptions/limits', checkSessionActive, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token required' });
    }

    const decoded = verifyToken(token);
    const limits = await getUserLimits(decoded.userId);

    if (!limits) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      limits: {
        tier: limits.tierName,
        dailyChatUsed: limits.dailyChatUsed,
        dailyChatLimit: limits.dailyChatLimit,
        dailyVoiceUsed: limits.dailyVoiceUsed,
        dailyVoiceLimit: limits.dailyVoiceLimit,
        dailyAnalysisUsed: limits.dailyMoodAnalysisUsed,
        dailyAnalysisLimit: limits.dailyMoodAnalysisLimit,
        dailyJournalUsed: limits.dailyJournalUsed,
        dailyJournalLimit: limits.dailyJournalLimit,
        hasTTS: limits.hasTTS,
        hasExport: limits.hasExport,
        chatHistoryDays: limits.chatHistoryDays,
        subscriptionExpiresAt: limits.subscriptionExpiresAt,
        isExpired: limits.isExpired,
      },
    });
  } catch (error) {
    console.error('Error getting subscription limits:', error);
    res.status(500).json({ success: false, error: 'Failed to get limits' });
  }
});

app.get('/api/subscriptions/available-plans', getAvailablePlans);
app.get('/api/subscriptions/current', checkSessionActive, getCurrentSubscription);
app.post('/api/subscriptions/cancel', checkSessionActive, cancelSubscription);

// Panic Mode Routes
app.post('/api/panic/start', checkSessionActive, startPanicMode);
app.post('/api/panic/anxiety-level', checkSessionActive, recordAnxietyLevel);
app.post('/api/panic/step', checkSessionActive, processPanicStep);
app.post('/api/panic/complete', checkSessionActive, completePanicMode);
app.get('/api/panic/history', checkSessionActive, getPanicHistory);

// Message Routes
app.post('/api/messages/send', checkSessionActive, sendMessage);
app.get('/api/messages/:chatId', checkSessionActive, getMessages);
app.delete('/api/messages/:messageId', checkSessionActive, deleteMessage);
app.get('/api/messages/status/:jobId', checkSessionActive, getMessageStatus);
app.delete('/api/chat/:chatId/clear', checkSessionActive, clearChat);

// 404 обработчик - должен быть последним!
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = error instanceof multer.MulterError ? 413 : error?.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({ success: false, error: status === 413 ? 'Upload exceeds the allowed limits' : status === 400 ? 'Invalid JSON body' : 'Request failed' });
});
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint не найден',
    path: req.path,
    method: req.method,
  });
});

// Initialize AI Queue and Cache
initializeQueue();
preloadCommonResponses();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         🌥️  CloudMind Backend запущен! 🌥️          ║
╠══════════════════════════════════════════════════════╣
║  Port: ${PORT}                                     ║
║  Environment: ${config.nodeEnv}                     ║
║  Qwen API: ${config.qwenApiKey ? '✅ Готов' : '❌ Нужен ключ'}                              ║
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
║  ✓ POST /api/payments/create                         ║
║  ✓ POST /api/payments/confirm                        ║
║  ✓ GET /api/payments/history                         ║
║  ✓ GET /api/subscriptions/available-plans           ║
║  ✓ GET /api/subscriptions/current                    ║
║  ✓ POST /api/subscriptions/cancel                    ║
║                                                      ║
║  Panic Mode (Emergency Support):                     ║
║  ✓ POST /api/panic/start                             ║
║  ✓ POST /api/panic/anxiety-level                     ║
║  ✓ POST /api/panic/step                              ║
║  ✓ POST /api/panic/complete                          ║
║  ✓ GET /api/panic/history                            ║
╚══════════════════════════════════════════════════════╝
  `);
});

export default app;

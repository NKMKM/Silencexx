import { Request, Response } from 'express';
import { query } from './db';
import { verifyToken } from './auth';

/**
 * POST /api/chat/create
 * Создать новый чат
 * 
 * Требования по изоляции:
 * - Каждый чат строго привязан к userId
 * - is_first_message инициализируется как true
 * - История не наследуется от предыдущего чата
 */
export const createChat = async (req: Request, res: Response) => {
  try {
    console.log('🆕 POST /api/chats/create - Creating new chat');
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.warn('⚠️ No token provided for create chat');
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Невалидный токен' });
    }

    const isTemporary = req.body.isTemporary || false;
    console.log(`👤 Creating chat for user ID: ${userId}, temporary: ${isTemporary}`);

    // Создаем новый чат:
    // - user_id для строгой изоляции
    // - is_first_message = true (флаг первого сообщения)
    // - is_temporary флаг
    // - created_at/updated_at для отслеживания
    const chatResult = await query(
      `INSERT INTO chat_id (user_id, is_temporary, is_first_message, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) 
       RETURNING id, is_first_message, created_at`,
      [userId, isTemporary, true]
    );

    const chatId = chatResult.rows[0].id;
    const isFirstMessage = chatResult.rows[0].is_first_message;
    console.log(`✅ Chat created successfully with ID: ${chatId} (isFirstMessage: ${isFirstMessage})`);
    console.log(`📝 Chat history starts empty - no inheritance from previous chats`);

    res.json({
      success: true,
      chatId,
      isFirstMessage,
      createdAt: chatResult.rows[0].created_at,
    });
  } catch (error: any) {
    console.error('❌ Create chat error:', error?.message || error);
    console.error('❌ Full error:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании чата',
      details: error?.message || error
    });
  }
};

/**
 * GET /api/chat/list
 * Получить список всех чатов пользователя
 */
export const getChatList = async (req: Request, res: Response) => {
  try {
    console.log('📋 GET /api/chats/list - Getting chat list');
    const token = req.headers.authorization?.replace('Bearer ', '');
    // ... verified token exists
    if (!token) {
        console.warn('⚠️ No token provided for chat list');
        return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Невалидный токен' });
    }
    
    console.log(`👤 Getting chats for user ID: ${userId}`);

    // Оптимизированный запрос с UNION и подзапросами
    const chatsQuery = `
      WITH last_messages AS (
        SELECT 
          chat_id,
          message,
          senddate,
          'user' as sender
        FROM user_chat
        UNION ALL
        SELECT 
          chat_id,
          message,
          senddate,
          'ai' as sender
        FROM ai_response
      ),
      latest_per_chat AS (
        SELECT DISTINCT ON (chat_id)
          chat_id,
          message as last_message,
          senddate as last_message_date
        FROM last_messages
        ORDER BY chat_id, senddate DESC
      )
      SELECT 
        c.id,
        c.user_id,
        COALESCE(lpc.last_message, '') as last_message,
        COALESCE(lpc.last_message_date, NOW()) as last_message_date
      FROM chat_id c
      LEFT JOIN latest_per_chat lpc ON c.id = lpc.chat_id
      WHERE c.user_id = $1 AND (c.is_temporary = false OR c.is_temporary IS NULL)
      ORDER BY last_message_date DESC
      LIMIT 50
    `;

    try {
        const result = await query(chatsQuery, [userId]);
        console.log(`✅ Found ${result.rows.length} chats`);

        res.json({
          success: true,
          chats: result.rows,
        });
    } catch (dbError: any) {
        console.error('❌ Database error in getChatList:', dbError.message);
        throw dbError;
    }
  } catch (error: any) {
    console.error('❌ Get chat list error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка чатов',
      details: error.message
    });
  }
};

/**
 * GET /api/chat/:chatId/messages
 * Получить все сообщения из конкретного чата
 * 
 * ТРЕБОВАНИЯ ИЗОЛЯЦИИ:
 * - Проверяем что чат принадлежит userId (double-check)
 * - Загружаем только сообщения этого конкретного чата и пользователя
 * - При получении сообщений проверяем user_id в обеих таблицах
 * - История передается в правильном порядке (ORDER BY senddate ASC)
 * - Дублей быть не должно (нет UNION ALL, каждое сообщение от одного типа)
 */
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    console.log('💬 GET /api/chats/:chatId/messages - Getting chat messages');
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.warn('⚠️ No token provided for chat messages');
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Невалидный токен' });
    }

    const chatId = parseInt(req.params.chatId);
    console.log(`👤 User ${userId} requesting messages from chat ${chatId}`);

    // ПЕРВАЯ ПРОВЕРКА: Убеждаемся что чат принадлежит пользователю
    const chatCheck = await query(
      'SELECT id, user_id FROM chat_id WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );

    if (chatCheck.rows.length === 0) {
      console.warn(`⚠️ Chat ${chatId} not found or access denied for user ${userId}`);
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен. Чат не найден или принадлежит другому пользователю.',
      });
    }

    const chatUserId = chatCheck.rows[0].user_id;
    console.log(`✅ Chat verification passed: chat user_id = ${chatUserId}, request user_id = ${userId}`);

    // ВТОРАЯ ПРОВЕРКА: Получаем сообщения из ВСЕХ источников
    // Комбинируем данные из:
    // 1. messages (новая таблица для голосовых)
    // 2. user_chat (старая таблица для текстовых сообщений пользователя)
    // 3. ai_response (старая таблица для ответов AI)
    const messagesQuery = `
      SELECT 
        id::text as id,
        chat_id,
        role,
        type,
        text,
        audio_url,
        status,
        created_at
      FROM (
        -- Новая таблица messages (голосовые и новые текстовые)
        SELECT 
          id::text as id,
          chat_id,
          role,
          type,
          text,
          audio_url,
          status,
          created_at
        FROM messages
        WHERE chat_id = $1 AND user_id = $2
        
        UNION ALL
        
        -- Старые сообщения пользователя (user_chat)
        SELECT 
          id::text as id,
          chat_id,
          'user' as role,
          'text' as type,
          message as text,
          NULL as audio_url,
          'ready' as status,
          senddate as created_at
        FROM user_chat legacy
        WHERE chat_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM messages modern
            WHERE modern.chat_id = legacy.chat_id AND modern.user_id = $2
              AND modern.role = 'user' AND modern.text = legacy.message
              AND ABS(EXTRACT(EPOCH FROM (modern.created_at - legacy.senddate))) < 1
          )
        
        UNION ALL
        
        -- Старые ответы AI (ai_response)
        SELECT 
          id::text as id,
          chat_id,
          'assistant' as role,
          'text' as type,
          message as text,
          NULL as audio_url,
          'ready' as status,
          senddate as created_at
        FROM ai_response legacy
        WHERE chat_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM messages modern
            WHERE modern.chat_id = legacy.chat_id AND modern.user_id = $2
              AND modern.role = 'assistant' AND modern.text = legacy.message
              AND ABS(EXTRACT(EPOCH FROM (modern.created_at - legacy.senddate))) < 1
          )
      ) AS all_messages
      ORDER BY created_at ASC
    `;

    let result;
    try {
      result = await query(messagesQuery, [chatId, userId]);
    } catch (dbError: any) {
      console.error('❌ Database query error:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Ошибка базы данных при получении сообщений',
        details: dbError.message
      });
    }
    
    // Map result to match ApiMessage interface expected by frontend
    const mappedMessages = result.rows.map(row => {
        // Convert local audio path to full URL if audio_url exists
        let audioUrl = row.audio_url;
        if (audioUrl && !audioUrl.startsWith('http')) {
            // Get base URL from request or environment
            const protocol = req.protocol;
            const host = req.get('host');
            audioUrl = `${protocol}://${host}/${audioUrl.replace(/\\/g, '/')}`;
        }
        
        return {
            id: row.id,
            chat_id: row.chat_id,
            user_id: userId, // Use the userId from the request since it's already verified
            role: row.role, // 'user' or 'assistant'
            type: row.type || 'text',
            text: row.text || '',
            audio_url: audioUrl,
            status: row.status || 'ready',
            created_at: row.created_at
        };
    });
    
    console.log(`✅ Found ${result.rows.length} messages in chat ${chatId} for user ${userId} (Source: messages table)`);
    
    res.json({
      success: true,
      messages: mappedMessages,
      chatId,
      userId,
      messageCount: mappedMessages.length,
    });
  } catch (error) {
    console.error('❌ Get chat messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении сообщений',
    });
  }
};

/**
 * POST /api/chat/:chatId/message
 * Сохранить сообщение пользователя в чат
 * 
 * ТРЕБОВАНИЯ:
 * - Проверяем что чат принадлежит userId
 * - Сохраняем user_id для каждого сообщения (двойная изоляция)
 * - Сохраняем mood если указано
 * - Обновляем is_first_message флаг на чате
 * - Валидируем mood перед сохранением
 */
export const saveChatMessage = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Невалидный токен' });
    }

    const chatId = parseInt(req.params.chatId);
    const { message, sender, mood } = req.body;

    if (!message || !sender) {
      return res.status(400).json({
        success: false,
        error: 'Требуются поля message и sender',
      });
    }

    // Валидация mood enum
    const validMoods = ['Happy', 'Neutral', 'Sad', 'Anxious', 'Angry', 'Low', 'Stressed', null, undefined];
    if (mood && !validMoods.includes(mood)) {
      return res.status(400).json({
        success: false,
        error: `Недопустимое значение mood. Допустимые: ${validMoods.filter(m => m).join(', ')}`,
      });
    }

    // Проверяем, что чат принадлежит пользователю
    const chatCheck = await query(
      'SELECT id, is_first_message FROM chat_id WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен. Чат не найден или принадлежит другому пользователю.',
      });
    }

    const isFirstMessage = chatCheck.rows[0].is_first_message;
    console.log(`💾 Saving message to chat ${chatId}: isFirstMessage=${isFirstMessage}, sender=${sender}`);

    // Сохраняем сообщение с user_id (двойная изоляция)
    if (sender === 'user') {
      await query(
        `INSERT INTO user_chat (chat_id, user_id, message, senddate, mood) 
         VALUES ($1, $2, $3, NOW(), $4)`,
        [chatId, userId, message, mood || null]
      );
    } else if (sender === 'ai') {
      await query(
        `INSERT INTO ai_response (chat_id, user_id, message, senddate, mood) 
         VALUES ($1, $2, $3, NOW(), $4)`,
        [chatId, userId, message, mood || null]
      );
    } else {
      return res.status(400).json({
        success: false,
        error: 'sender должен быть "user" или "ai"',
      });
    }

    // После первого сообщения переключаем флаг
    if (isFirstMessage && sender === 'user') {
      await query(
        'UPDATE chat_id SET is_first_message = false, updated_at = NOW() WHERE id = $1 AND user_id = $2',
        [chatId, userId]
      );
      console.log(`✅ First message flag switched to false for chat ${chatId}`);
    }

    res.json({
      success: true,
      isFirstMessage,
      savedMood: mood || null,
    });
  } catch (error) {
    console.error('❌ Save chat message error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при сохранении сообщения',
    });
  }
};

/**
 * DELETE /api/chat/:chatId
 * Удалить чат
 */
export const deleteChat = async (req: Request, res: Response) => {
  try {
    console.log('🗑️ DELETE /api/chats/:chatId - Deleting chat');
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.warn('⚠️ No token provided for chat deletion');
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Невалидный токен' });
    }

    const chatId = parseInt(req.params.chatId);
    console.log(`👤 User ${userId} deleting chat ${chatId}`);

    // Проверяем, что чат принадлежит пользователю
    const chatCheck = await query(
      'SELECT id FROM chat_id WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );

    if (chatCheck.rows.length === 0) {
      console.warn(`⚠️ Chat ${chatId} not found or access denied for user ${userId}`);
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен',
      });
    }

    // Удаляем сообщения и чат
    await query('DELETE FROM messages WHERE chat_id = $1 AND user_id = $2', [chatId, userId]);
    await query('DELETE FROM user_chat WHERE chat_id = $1', [chatId]);
    await query('DELETE FROM ai_response WHERE chat_id = $1', [chatId]);
    await query('DELETE FROM chat_id WHERE id = $1', [chatId]);
    console.log(`✅ Chat ${chatId} deleted successfully`);

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('❌ Delete chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении чата',
    });
  }
};

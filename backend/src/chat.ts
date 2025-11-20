import { Request, Response } from 'express';
import { query } from './db';
import { verifyToken } from './auth';

/**
 * POST /api/chat/create
 * Создать новый чат
 */
export const createChat = async (req: Request, res: Response) => {
  try {
    console.log('🆕 POST /api/chats/create - Creating new chat');
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.warn('⚠️ No token provided for create chat');
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;
    const isTemporary = req.body.isTemporary || false; // Флаг временного чата
    console.log(`👤 Creating chat for user ID: ${userId}, temporary: ${isTemporary}`);

    // Создаем новый чат с флагом is_temporary
    const chatResult = await query(
      'INSERT INTO chat_id (user_id, is_temporary) VALUES ($1, $2) RETURNING id',
      [userId, isTemporary]
    );

    const chatId = chatResult.rows[0].id;
    console.log(`✅ Chat created successfully with ID: ${chatId}`);

    res.json({
      success: true,
      chatId,
    });
  } catch (error) {
    console.error('❌ Create chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании чата',
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
    if (!token) {
      console.warn('⚠️ No token provided for chat list');
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;
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

    const result = await query(chatsQuery, [userId]);
    console.log(`✅ Found ${result.rows.length} chats`);

    res.json({
      success: true,
      chats: result.rows,
    });
  } catch (error) {
    console.error('❌ Get chat list error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка чатов',
    });
  }
};

/**
 * GET /api/chat/:chatId/messages
 * Получить все сообщения из конкретного чата
 */
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    console.log('💬 GET /api/chats/:chatId/messages - Getting chat messages');
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.warn('⚠️ No token provided for chat messages');
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;
    const chatId = parseInt(req.params.chatId);
    console.log(`👤 User ${userId} requesting messages from chat ${chatId}`);

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

    // Получаем все сообщения из чата (пользователя и AI)
    const messagesQuery = `
      SELECT 
        'user' as sender,
        message,
        senddate
      FROM user_chat
      WHERE chat_id = $1
      UNION ALL
      SELECT 
        'ai' as sender,
        message,
        senddate
      FROM ai_response
      WHERE chat_id = $1
      ORDER BY senddate ASC
    `;

    const result = await query(messagesQuery, [chatId]);
    console.log(`✅ Found ${result.rows.length} messages in chat ${chatId}`);

    res.json({
      success: true,
      messages: result.rows,
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
 */
export const saveChatMessage = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;
    const chatId = parseInt(req.params.chatId);
    const { message, sender } = req.body;

    if (!message || !sender) {
      return res.status(400).json({
        success: false,
        error: 'Требуются поля message и sender',
      });
    }

    // Проверяем, что чат принадлежит пользователю
    const chatCheck = await query(
      'SELECT id FROM chat_id WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен',
      });
    }

    // Сохраняем сообщение
    if (sender === 'user') {
      await query(
        'INSERT INTO user_chat (chat_id, message, senddate) VALUES ($1, $2, NOW())',
        [chatId, message]
      );
    } else if (sender === 'ai') {
      await query(
        'INSERT INTO ai_response (chat_id, message, senddate) VALUES ($1, $2, NOW())',
        [chatId, message]
      );
    } else {
      return res.status(400).json({
        success: false,
        error: 'sender должен быть "user" или "ai"',
      });
    }

    res.json({
      success: true,
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

    const decoded = verifyToken(token);
    const userId = decoded.userId;
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

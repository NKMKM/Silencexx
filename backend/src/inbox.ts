import { Request, Response } from 'express';
import { query } from './db';
import { verifyToken } from './auth';
import { moderateMessage } from './moderation';

/**
 * POST /api/inbox/send
 * Отправить анонимное пожелание
 */
export const sendAnonymousMessage = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    const decoded = verifyToken(token);
    const senderId = decoded.userId;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Сообщение не может быть пустым' });
    }

    if (message.length > 500) {
      return res.status(400).json({ success: false, error: 'Сообщение слишком длинное (макс. 500 символов)' });
    }

    // Проверяем ограничение по времени (8 часов)
    const senderCheck = await query(
      'SELECT last_message_sent_at FROM users WHERE id = $1',
      [senderId]
    );

    if (senderCheck.rows.length > 0 && senderCheck.rows[0].last_message_sent_at) {
      const lastSent = new Date(senderCheck.rows[0].last_message_sent_at);
      const now = new Date();
      const hoursPassed = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

      if (hoursPassed < 8) {
        const hoursLeft = Math.ceil(8 - hoursPassed);
        return res.status(429).json({
          success: false,
          error: `Можно отправлять только 1 сообщение в 8 часов. Попробуйте через ${hoursLeft} ч.`,
          hoursLeft
        });
      }
    }

    // Модерация сообщения через AI
    console.log('🔍 Moderating message...');
    const moderation = await moderateMessage(message);

    if (!moderation.allowed) {
      console.log('❌ Message rejected:', moderation.reason);
      return res.status(400).json({
        success: false,
        error: moderation.reason || 'Сообщение содержит запрещенный контент'
      });
    }

    console.log('✅ Message approved by AI');

    // Выбираем случайного получателя (кто не получал сообщение последние 3 часа)
    const recipientQuery = await query(
      `SELECT id FROM users 
       WHERE id != $1 
       AND (
         last_message_received_at IS NULL 
         OR last_message_received_at < NOW() - INTERVAL '3 hours'
       )
       ORDER BY RANDOM() 
       LIMIT 1`,
      [senderId]
    );

    if (recipientQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Нет доступных получателей. Все пользователи уже получили сообщения.'
      });
    }

    const receiverId = recipientQuery.rows[0].id;

    // Сохраняем сообщение
    await query(
      'INSERT INTO anonymous_messages (sender_id, receiver_id, message) VALUES ($1, $2, $3)',
      [senderId, receiverId, message]
    );

    // Обновляем время отправки у отправителя
    await query(
      'UPDATE users SET last_message_sent_at = NOW() WHERE id = $1',
      [senderId]
    );

    // Обновляем время получения у получателя
    await query(
      'UPDATE users SET last_message_received_at = NOW() WHERE id = $1',
      [receiverId]
    );

    // TODO: Отправить push-уведомление получателю

    console.log(`✅ Anonymous message sent from user ${senderId} to user ${receiverId}`);

    res.json({
      success: true,
      message: 'Пожелание отправлено! 💌'
    });

  } catch (error) {
    console.error('❌ Send anonymous message error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при отправке сообщения'
    });
  }
};

/**
 * GET /api/inbox/received
 * Получить все полученные анонимные пожелания
 */
export const getReceivedMessages = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const result = await query(
      `SELECT id, message, sent_at, is_read 
       FROM anonymous_messages 
       WHERE receiver_id = $1 
       ORDER BY sent_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      messages: result.rows
    });

  } catch (error) {
    console.error('❌ Get received messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении сообщений'
    });
  }
};

/**
 * GET /api/inbox/can-send
 * Проверить, может ли пользователь отправить сообщение
 */
export const canSendMessage = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const result = await query(
      'SELECT last_message_sent_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].last_message_sent_at) {
      return res.json({
        success: true,
        canSend: true,
        hoursLeft: 0
      });
    }

    const lastSent = new Date(result.rows[0].last_message_sent_at);
    const now = new Date();
    const millisecondsPassed = now.getTime() - lastSent.getTime();
    const hoursPassed = millisecondsPassed / (1000 * 60 * 60);

    if (hoursPassed >= 8) {
      return res.json({
        success: true,
        canSend: true,
        hoursLeft: 0,
        minutesLeft: 0
      });
    }

    const millisecondsLeft = (8 * 60 * 60 * 1000) - millisecondsPassed;
    const hoursLeft = millisecondsLeft / (1000 * 60 * 60);
    const minutesLeft = Math.ceil(millisecondsLeft / (1000 * 60));

    res.json({
      success: true,
      canSend: false,
      hoursLeft: Math.ceil(hoursLeft),
      minutesLeft: minutesLeft,
      nextAvailable: new Date(lastSent.getTime() + 8 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('❌ Can send check error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при проверке'
    });
  }
};

/**
 * POST /api/inbox/:id/mark-read
 * Пометить сообщение как прочитанное
 */
export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;
    const messageId = parseInt(req.params.id ?? req.params.messageId);

    // Проверяем что сообщение принадлежит пользователю
    const check = await query(
      'SELECT id FROM anonymous_messages WHERE id = $1 AND receiver_id = $2',
      [messageId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Сообщение не найдено' });
    }

    await query(
      'UPDATE anonymous_messages SET is_read = true WHERE id = $1',
      [messageId]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении'
    });
  }
};

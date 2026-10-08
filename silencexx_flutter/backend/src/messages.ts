import { Request, Response } from 'express';
import { query } from './db';
import { verifyToken } from './auth';
import { queueAIRequest, getJobStatus } from './aiQueue';
import { getUserLimits, reserveDailyLimit } from './subscriptions';

// Send a message
export async function sendMessage(req: Request, res: Response) {
  try {
    const { chatId, message, type } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;

    // Validation
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
    }

    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID required' });
    }

    const owner = await query('SELECT id FROM chat_id WHERE id=$1 AND user_id=$2', [chatId, userId]);
    if (!owner.rows.length) return res.status(403).json({ error: 'Access denied' });

    // Check rate limit (max 1 message per 300ms)
    const lastMessage = await query(
      `SELECT senddate FROM user_chat 
       WHERE chat_id = $1 AND user_id = $2 
       ORDER BY senddate DESC LIMIT 1`,
      [chatId, userId]
    );

    if (lastMessage.rows.length > 0) {
      const timeSinceLastMsg = Date.now() - new Date(lastMessage.rows[0].senddate).getTime();
      if (timeSinceLastMsg < 300) {
        return res.status(429).json({ error: 'Please wait before sending another message' });
      }
    }

    // Check subscription limits
    const limits = await getUserLimits(userId);
    if (!limits) {
      return res.status(500).json({ error: 'Could not fetch user limits' });
    }

    if (limits.dailyChatUsed >= limits.dailyChatLimit) {
      return res.status(403).json({
        error: 'Daily chat limit reached',
        used: limits.dailyChatUsed,
        limit: limits.dailyChatLimit,
        upgrade: true
      });
    }

    if (!await reserveDailyLimit(userId, 'chat_requests', limits.dailyChatLimit)) return res.status(429).json({ error: 'Daily chat limit reached' });

    // Save user message
    const userMsgResult = await query(
      `INSERT INTO user_chat (chat_id, user_id, message, type, senddate)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, senddate`,
      [chatId, userId, message, type || 'text']
    );

    const messageId = userMsgResult.rows[0].id;
    const sentAt = userMsgResult.rows[0].senddate;

    // Get chat context for AI
    const chatContext = await query(
      `SELECT uc.message, uc.is_ai_response 
       FROM user_chat uc
       WHERE uc.chat_id = $1
       ORDER BY uc.senddate DESC
       LIMIT 20`,
      [chatId]
    );

    // Queue AI response with priority based on subscription
    const aiContext = {
      chatId,
      conversationHistory: chatContext.rows.reverse().map((row: any) => ({ role: row.is_ai_response ? 'assistant' : 'user', content: row.message })),
      subscriptionTier: limits.tierName,
    };

    const jobResult = await queueAIRequest(
      message,
      aiContext,
      userId,
      chatId,
      limits.tierName.toLowerCase() === 'pro' ? 1 : limits.tierName.toLowerCase() === 'plus' ? 5 : 10 // Priority: pro highest
    );



    res.json({
      success: true,
      messageId,
      sentAt,
      jobId: jobResult.jobId,
      status: 'queued'
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

// Get messages for a chat
export async function getMessages(req: Request, res: Response) {
  try {
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;

    // Verify user owns this chat
    const chatCheck = await query(
      `SELECT id FROM chat_id WHERE id = $1 AND user_id = $2`,
      [chatId, userId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get messages
    const messages = await query(
      `SELECT id, user_id, message, type, is_ai_response, senddate
       FROM user_chat
       WHERE chat_id = $1
       ORDER BY senddate DESC
       LIMIT $2 OFFSET $3`,
      [chatId, Math.max(1, Math.min(100, Number.parseInt(String(limit), 10) || 50)), Math.max(0, Number.parseInt(String(offset), 10) || 0)]
    );

    res.json({
      success: true,
      messages: messages.rows.reverse(),
      count: messages.rows.length
    });

  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
}

// Delete a message
export async function deleteMessage(req: Request, res: Response) {
  try {
    const { messageId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;

    // Verify user owns this message
    const messageCheck = await query(
      `SELECT id FROM user_chat WHERE id = $1 AND user_id = $2`,
      [messageId, userId]
    );

    if (messageCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete message
    await query(
      `DELETE FROM user_chat WHERE id = $1`,
      [messageId]
    );

    res.json({
      success: true,
      message: 'Message deleted'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
}

// Get message status/AI response status
export async function getMessageStatus(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const status = await getJobStatus(jobId, decoded.userId);
    
    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Error getting message status:', error);
    res.status(500).json({ error: 'Failed to get message status' });
  }
}

// Clear chat history
export async function clearChat(req: Request, res: Response) {
  try {
    const { chatId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;

    // Verify user owns this chat
    const chatCheck = await query(
      `SELECT id FROM chat_id WHERE id = $1 AND user_id = $2`,
      [chatId, userId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete all messages
    await query(
      `DELETE FROM user_chat WHERE chat_id = $1`,
      [chatId]
    );

    res.json({
      success: true,
      message: 'Chat history cleared'
    });

  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ error: 'Failed to clear chat' });
  }
}

import { Request, Response } from 'express';
import { query } from './db';
import { generateAIResponse } from './ai';
import { verifyToken } from './auth';

/**
 * Получить текущее задание пользователя
 * GET /api/daily-task
 */
export const getDailyTask = async (req: Request, res: Response) => {
  try {
    console.log('📅 POST /api/daily-task - Getting daily task');
    
    // Manually verify token since middleware might not set req.user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      console.error('❌ No token provided');
      return res.status(401).json({ success: false, error: 'Unauthorized: No token' });
    }
    
    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (e) {
      console.error('❌ Token verification failed:', e);
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }
    
    console.log(`👤 Request for user ID: ${userId}`);

    // 1. Проверяем наличие активного задания на сегодня
    // Используем raw SQL для проверки дат
    const activeTaskQuery = `
      SELECT * FROM daily_tasks 
      WHERE user_id = $1 
      AND (
        (expires_at > NOW() AND status != 'completed')
        OR
        (status = 'completed' AND completed_at::date = CURRENT_DATE)
      )
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    let activeTaskResult;
    try {
      activeTaskResult = await query(activeTaskQuery, [userId]);
    } catch (dbError: any) {
      console.error('❌ Database error in getDailyTask (activeTaskQuery):', dbError.message);
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (activeTaskResult && activeTaskResult.rows.length > 0) {
      const task = activeTaskResult.rows[0];
      console.log(`✅ Found active task: ${task.id}`);
      
      const streak = await getUserStreak(userId);
      console.log(`🔥 Start streak: ${streak}`);

      return res.json({
        success: true,
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          theme: task.theme,
          streak: streak,
          expiresAt: task.expires_at,
          createdAt: task.created_at
        }
      });
    }

    console.log('ℹ️ No active task found, generating new one...');
    const newTask = await generateNewDailyTask(userId);
    
    if (!newTask) {
      throw new Error('Failed to generate new task (result is null)');
    }

    // Получаем стрик после возможной генерации
    const streak = await getUserStreak(userId);

    console.log(`✅ Generated new task: ${newTask.id}`);
    
    res.json({
      success: true,
      task: {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description,
        status: 'locked',
        theme: newTask.theme,
        streak: streak,
        expiresAt: newTask.expires_at,
        createdAt: newTask.created_at
      }
    });

  } catch (error: any) {
    console.error('❌ Critical Error getting daily task:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get daily task',
      details: error.message 
    });
  }
};

/**
 * Открыть задание (перевернуть карточку)
 * PUT /api/daily-task/open
 */
export const openDailyTask = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    
    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ success: false, error: 'Task ID required' });
    }

    // Проверяем, принадлежит ли задание пользователю и не истекло ли оно
    const taskCheck = await query(
      `SELECT * FROM daily_tasks WHERE id = $1 AND user_id = $2`,
      [taskId, userId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const task = taskCheck.rows[0];

    // Если уже открыто или завершено, просто возвращаем успех
    if (task.status !== 'locked') {
      return res.json({ success: true, status: task.status });
    }

    // Обновляем статус на opened
    await query(
      `UPDATE daily_tasks SET status = 'opened', updated_at = NOW() WHERE id = $1`,
      [taskId]
    );

    res.json({ success: true, status: 'opened' });

  } catch (error) {
    console.error('Error opening task:', error);
    res.status(500).json({ success: false, error: 'Failed to open task' });
  }
};

/**
 * Выполнить задание
 * PUT /api/daily-task/complete
 */
export const completeDailyTask = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ success: false, error: 'Task ID required' });
    }

    const taskCheck = await query(
      `SELECT * FROM daily_tasks WHERE id = $1 AND user_id = $2`,
      [taskId, userId]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const task = taskCheck.rows[0];

    if (task.status === 'completed') {
      return res.json({ success: true, status: 'completed', alreadyCompleted: true });
    }

    // Начинаем транзакцию для обновления статуса и стрика
    const client = await import('./db').then(m => m.pool.connect());
    
    try {
      await client.query('BEGIN');

      // 1. Обновляем статус задания
      await client.query(
        `UPDATE daily_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [taskId]
      );

      // 2. Обновляем user_streaks
      // Проверяем, когда было поcледнее выполнение
      const streakQuery = `SELECT * FROM user_streaks WHERE user_id = $1`;
      const streakResult = await client.query(streakQuery, [userId]);
      
      let newStreak = 1;
      let lastCompletedAt = null;

      if (streakResult.rows.length > 0) {
        const streakData = streakResult.rows[0];
        const lastDate = new Date(streakData.last_completed_at);
        const today = new Date();
        
        // Разница в днях
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays <= 1) {
          // Если выполнено вчера или сегодня (повторно), увеличиваем или оставляем
          // Если сегодня - не увеличиваем, но мы уже проверили это выше (статус completed)
          // Значит выполнено ВЧЕРА, увеличиваем стрик
           newStreak = streakData.current_streak + 1;
        } else {
          // Стрик оборвался
          newStreak = 1;
        }

        // Обновляем стрик
        await client.query(
          `UPDATE user_streaks SET 
             current_streak = $1, 
             longest_streak = GREATEST(longest_streak, $1),
             last_completed_at = NOW(),
             updated_at = NOW()
           WHERE user_id = $2`,
          [newStreak, userId]
        );
      } else {
        // Создаем запись о стрике
        await client.query(
          `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_completed_at)
           VALUES ($1, 1, 1, NOW())`,
          [userId]
        );
      }

      await client.query('COMMIT');
      
      res.json({ 
        success: true, 
        status: 'completed',
        streak: newStreak 
      });

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ success: false, error: 'Failed to complete task' });
  }
};

// --- Helpers ---

async function getUserStreak(userId: number): Promise<number> {
  const res = await query('SELECT current_streak FROM user_streaks WHERE user_id = $1', [userId]);
  return res.rows.length > 0 ? res.rows[0].current_streak : 0;
}

async function generateNewDailyTask(userId: number) {
  console.log(`🎲 Generating new task for user ${userId}`);
  // Темы для заданий
  const themes = ['Саморефлексия', 'Благодарность', 'Осознанность', 'Эмоциональный интеллект', 'Цели'];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  // Генерируем задание через AI
  // TODO: Подключить реальный AI. Пока используем заглушки или простой генератор
  
  let taskTitle = `Задание на тему: ${theme}`;
  let taskDescription = 'Подумайте о том, что произошло сегодня хорошего. Запишите 3 момента.';

  try {
      // Попытка сгенерировать через Ollama, если доступна
      // const aiPrompt = `Придумай короткое психологическое задание на день на тему "${theme}". Формат: только текст задания.`;
      // const aiResponse = await generateAIResponse(aiPrompt, 'ru');
      // if (aiResponse) taskDescription = aiResponse;
  } catch (e) {
      console.warn('AI generation failed, using default task');
  }

  try {
    // Создаем запись в БД
    // status = 'locked' по умолчанию
    // expires_at = завтра в это же время (24 часа)
    const result = await query(
      `INSERT INTO daily_tasks (user_id, title, description, theme, status, expires_at)
       VALUES ($1, $2, $3, $4, 'locked', NOW() + INTERVAL '24 hours')
       RETURNING *`,
      [userId, taskTitle, taskDescription, theme]
    );

    return result.rows[0];
  } catch (e: any) {
    console.error('❌ Error saving new task to DB:', e.message);
    throw e;
  }
}

import { Request, Response } from 'express';
import { query } from './db';
import { generateToken, hashPassword } from './auth';

/**
 * POST /api/auth/oauth/google
 * Аутентификация через Google
 * 
 * Body:
 * - idToken: string (Google ID Token)
 * - email: string
 * - name: string
 * - googleId: string
 */
export const googleAuth = async (req: Request, res: Response) => {
  try {
    console.log('📱 Google Auth Request Body:', req.body);
    
    const { idToken, email, name, googleId } = req.body;

    if (!idToken || !email || !googleId) {
      console.error('❌ Missing fields:', { idToken: !!idToken, email: !!email, googleId: !!googleId });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    console.log('✅ Processing Google auth for:', email);

    // TODO: Verify Google ID Token with Google API
    // const ticket = await client.verifyIdToken({
    //   idToken,
    //   audience: process.env.GOOGLE_CLIENT_ID,
    // });

    // Проверка существования пользователя
    const existingUser = await query(
      'SELECT u.id FROM users u JOIN user_description ud ON u.user_desc_id = ud.id WHERE ud.email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      // Пользователь существует - логин
      const userId = existingUser.rows[0].id;
      const token = generateToken(userId);

      console.log('✅ Existing user logged in:', userId);

      return res.json({
        success: true,
        token,
        user: {
          id: userId,
          email,
          name,
          provider: 'google',
        },
      });
    }

    // Новый пользователь - регистрация
    // 1. Создать user_description
    const userDescResult = await query(
      `INSERT INTO user_description (name, email, registration_date)
       VALUES ($1, $2, NOW())
       RETURNING id`,
      [name || 'Google User', email]
    );
    const userDescId = userDescResult.rows[0].id;

    // 2. Создать роль (free с пробным периодом 30 дней)
    const roleResult = await query(
      `INSERT INTO roles (user_role, expiration_date)
       VALUES ('free', NOW() + INTERVAL '30 days')
       RETURNING id`,
      []
    );
    const roleId = roleResult.rows[0].id;

    // 3. Создать session (OAuth пользователи не имеют пароля)
    const dummyPassword = await hashPassword(`google_${googleId}_${Date.now()}`);
    const sessionResult = await query(
      `INSERT INTO session (ip_adress, session_key, device)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['0.0.0.0', dummyPassword, 'google_oauth']
    );
    const sessionId = sessionResult.rows[0].id;

    // 4. Создать пользователя
    const userResult = await query(
      `INSERT INTO users (user_desc_id, user_role, session_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userDescId, roleId, sessionId]
    );
    const userId = userResult.rows[0].id;

    // 5. Создать настройки по умолчанию
    await query(
      `INSERT INTO settings (id_user, theme, language)
       VALUES ($1, 0, 1)`,
      [userId]
    );

    // 6. Создать chat_id
    await query(
      `INSERT INTO chat_id (user_id)
       VALUES ($1)`,
      [userId]
    );

    // Генерация JWT токена
    const token = generateToken(userId);

    console.log(`✅ Новый пользователь через Google: ${email}`);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        name,
        provider: 'google',
      },
    });

  } catch (error) {
    console.error('❌ Google Auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during Google authentication',
    });
  }
};

/**
 * POST /api/auth/oauth/apple
 * Аутентификация через Apple
 * 
 * Body:
 * - identityToken: string (Apple Identity Token)
 * - email?: string (может быть null при повторном входе)
 * - name?: string
 * - appleId: string (user identifier from Apple)
 */
export const appleAuth = async (req: Request, res: Response) => {
  try {
    const { identityToken, email, name, appleId } = req.body;

    if (!identityToken || !appleId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // TODO: Verify Apple Identity Token
    // const decodedToken = jwt.decode(identityToken);

    // Поиск по appleId в session.device
    const existingByAppleId = await query(
      `SELECT u.id, ud.email, ud.name 
       FROM users u 
       JOIN session s ON u.session_id = s.id
       JOIN user_description ud ON u.user_desc_id = ud.id
       WHERE s.device = $1`,
      [`apple_${appleId}`]
    );

    if (existingByAppleId.rows.length > 0) {
      // Пользователь существует
      const user = existingByAppleId.rows[0];
      const token = generateToken(user.id);

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          provider: 'apple',
        },
      });
    }

    // Новый пользователь
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email required for first-time Apple Sign In',
      });
    }

    // 1. Создать user_description
    const userDescResult = await query(
      `INSERT INTO user_description (name, email, registration_date)
       VALUES ($1, $2, NOW())
       RETURNING id`,
      [name || 'Apple User', email]
    );
    const userDescId = userDescResult.rows[0].id;

    // 2. Создать роль
    const roleResult = await query(
      `INSERT INTO roles (user_role, expiration_date)
       VALUES ('free', NOW() + INTERVAL '30 days')
       RETURNING id`,
      []
    );
    const roleId = roleResult.rows[0].id;

    // 3. Создать session с appleId в device
    const dummyPassword = await hashPassword(`apple_${appleId}_${Date.now()}`);
    const sessionResult = await query(
      `INSERT INTO session (ip_adress, session_key, device)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['0.0.0.0', dummyPassword, `apple_${appleId}`]
    );
    const sessionId = sessionResult.rows[0].id;

    // 4. Создать пользователя
    const userResult = await query(
      `INSERT INTO users (user_desc_id, user_role, session_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userDescId, roleId, sessionId]
    );
    const userId = userResult.rows[0].id;

    // 5. Настройки
    await query(
      `INSERT INTO settings (id_user, theme, language)
       VALUES ($1, 0, 1)`,
      [userId]
    );

    // 6. Chat
    await query(
      `INSERT INTO chat_id (user_id)
       VALUES ($1)`,
      [userId]
    );

    const token = generateToken(userId);

    console.log(`🍎 Новый пользователь через Apple: ${email}`);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        name,
        provider: 'apple',
      },
    });

  } catch (error) {
    console.error('❌ Apple Auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during Apple authentication',
    });
  }
};

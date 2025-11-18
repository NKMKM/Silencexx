import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db';
import { Request, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// OTP storage (в продакшене использовать Redis)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// Генерация 6-значного OTP кода
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Валидация email (только латиница)
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Валидация телефона (международный формат)
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

// Валидация пароля (минимум 8 символов, латиница + цифры, без кириллицы)
export const isValidPassword = (password: string): boolean => {
  if (password.length < 8) return false;
  
  // Проверка на кириллицу
  const hasCyrillic = /[а-яА-ЯёЁ]/.test(password);
  if (hasCyrillic) return false;
  
  // Разрешены латиница, цифры и спецсимволы
  const validChars = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
  if (!validChars.test(password)) return false;
  
  // Хотя бы одна буква и одна цифра
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return hasLetter && hasNumber;
};

// Валидация имени (латиница/кириллица, 2-50 символов)
export const isValidName = (name: string): boolean => {
  if (name.length < 2 || name.length > 50) return false;
  const nameRegex = /^[a-zA-Zа-яА-ЯёЁ\s-]+$/;
  return nameRegex.test(name);
};

// Хеширование пароля
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Сравнение пароля
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Генерация JWT токена
export const generateToken = (userId: number, sessionId: number): string => {
  return jwt.sign({ userId, sessionId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Проверка JWT токена
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 * 
 * Body:
 * - method: 'email' | 'phone'
 * - contact: string (email или phone)
 * - name: string
 * - password: string
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { method, contact, name, password } = req.body;

    // Валидация
    if (!method || !contact || !name || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
    }

    if (method === 'email' && !isValidEmail(contact)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format. Use only Latin letters',
      });
    }

    if (method === 'phone' && !isValidPhone(contact)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone format. Use international format',
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be 8+ chars, Latin letters + numbers. No Cyrillic allowed',
      });
    }

    if (!isValidName(name)) {
      return res.status(400).json({
        success: false,
        error: 'Name must be 2-50 characters',
      });
    }

    // Проверка существования пользователя
    const checkQuery = method === 'email'
      ? 'SELECT id FROM user_description WHERE email = $1'
      : 'SELECT id FROM user_description WHERE phone = $1';
    
    const existing = await query(checkQuery, [contact]);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Пользователь с таким ' + (method === 'email' ? 'email' : 'телефоном') + ' уже существует',
      });
    }

    // Создание пользователя
    const hashedPassword = await hashPassword(password);
    
    // 1. Создать запись в user_description
    const userDescResult = await query(
      `INSERT INTO user_description (name, ${method === 'email' ? 'email' : 'phone'}, registration)
       VALUES ($1, $2, NOW())
       RETURNING id`,
      [name, contact]
    );
    
    const userDescId = userDescResult.rows[0].id;

    // 2. Создать роль (базовая роль по умолчанию)
    const roleResult = await query(
      `INSERT INTO roles (role, till, autorefresh)
       VALUES ('free', NOW() + INTERVAL '30 days', false)
       RETURNING id`,
      []
    );
    
    const roleId = roleResult.rows[0].id;

    // 3. Создать сессию с паролем
    const sessionResult = await query(
      `INSERT INTO session (session_ip, session_key, device_type, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [req.ip || 'unknown', hashedPassword, req.headers['user-agent'] || 'unknown', hashedPassword]
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
      `INSERT INTO settings (user_id, theme, language_id)
       VALUES ($1, 0, 1)`,
      [userId]
    );

    // 6. Создать chat_id для пользователя
    await query(
      `INSERT INTO chat_id (user_id)
       VALUES ($1)`,
      [userId]
    );

    // Генерация токена с sessionId
    const token = generateToken(userId, sessionId);

    // Если регистрация через телефон - отправить OTP
    if (method === 'phone') {
      const otp = generateOTP();
      otpStore.set(contact, {
        code: otp,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 минут
      });
      
      console.log(`📱 OTP для ${contact}: ${otp}`); // В продакшене отправить SMS
      
      return res.json({
        success: true,
        requiresOTP: true,
        contact,
        message: 'OTP код отправлен на телефон',
      });
    }

    // Если email - вернуть токен сразу
    res.json({
      success: true,
      token,
      user: {
        id: userId,
        name,
        contact,
      },
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при регистрации',
    });
  }
};

/**
 * POST /api/auth/login
 * Вход пользователя
 * 
 * Body:
 * - method: 'email' | 'phone'
 * - contact: string (email или phone)
 * - password?: string (только для email)
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { method, contact, password } = req.body;

    console.log('🔐 Login attempt:', { method, contact });

    // Валидация
    if (!method || !contact) {
      return res.status(400).json({
        success: false,
        error: 'Method and contact are required',
      });
    }

    if (method === 'email') {
      if (!isValidEmail(contact)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }
      if (!password || !isValidPassword(password)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid password format',
        });
      }
    } else if (method === 'phone') {
      if (!isValidPhone(contact)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone format',
        });
      }
    }

    // Поиск пользователя
    const userQuery = method === 'email'
      ? `SELECT u.id, u.session_id, ud.name, ud.email as contact, s.password
         FROM users u
         JOIN user_description ud ON u.user_desc_id = ud.id
         JOIN session s ON u.session_id = s.id
         WHERE ud.email = $1`
      : `SELECT u.id, u.session_id, ud.name, ud.phone as contact
         FROM users u
         JOIN user_description ud ON u.user_desc_id = ud.id
         WHERE ud.phone = $1`;
    
    const result = await query(userQuery, [contact]);

    console.log('🔍 User search result:', { 
      found: result.rows.length > 0,
      count: result.rows.length,
      email: result.rows[0]?.contact || 'N/A'
    });

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    const user = result.rows[0];

    // Проверка пароля для email
    if (method === 'email') {
      const isValidPassword = await comparePassword(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Неверный пароль',
        });
      }

      // Генерация токена с sessionId
      const token = generateToken(user.id, user.session_id);

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          contact: user.contact,
        },
      });
    }

    // Для телефона - отправить OTP
    if (method === 'phone') {
      const otp = generateOTP();
      otpStore.set(contact, {
        code: otp,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 минут
      });
      
      console.log(`📱 OTP для ${contact}: ${otp}`); // В продакшене отправить SMS
      
      return res.json({
        success: true,
        requiresOTP: true,
        contact,
        message: 'OTP код отправлен на телефон',
      });
    }

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при входе',
    });
  }
};

/**
 * POST /api/auth/verify-otp
 * Проверка OTP кода
 * 
 * Body:
 * - contact: string (phone)
 * - code: string (6-значный код)
 */
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { contact, code } = req.body;

    if (!contact || !code) {
      return res.status(400).json({
        success: false,
        error: 'Телефон и код обязательны',
      });
    }

    const storedOTP = otpStore.get(contact);

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        error: 'OTP код не найден или истек',
      });
    }

    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(contact);
      return res.status(400).json({
        success: false,
        error: 'OTP код истек',
      });
    }

    if (storedOTP.code !== code) {
      return res.status(400).json({
        success: false,
        error: 'Неверный OTP код',
      });
    }

    // Код верный - удалить из хранилища
    otpStore.delete(contact);

    // Найти пользователя с session_id
    const userQuery = `
      SELECT u.id, u.session_id, ud.name, ud.phone as contact
      FROM users u
      JOIN user_description ud ON u.user_desc_id = ud.id
      WHERE ud.phone = $1
    `;
    
    const result = await query(userQuery, [contact]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    const user = result.rows[0];

    // Генерация токена с sessionId
    const token = generateToken(user.id, user.session_id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        contact: user.contact,
      },
    });

  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при проверке OTP',
    });
  }
};

/**
 * POST /api/auth/resend-otp
 * Повторная отправка OTP кода
 * 
 * Body:
 * - contact: string (phone)
 */
export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { contact } = req.body;

    if (!contact) {
      return res.status(400).json({
        success: false,
        error: 'Телефон обязателен',
      });
    }

    const otp = generateOTP();
    otpStore.set(contact, {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 минут
    });
    
    console.log(`📱 Новый OTP для ${contact}: ${otp}`); // В продакшене отправить SMS
    
    res.json({
      success: true,
      message: 'OTP код отправлен повторно',
    });

  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при отправке OTP',
    });
  }
};

/**
 * POST /api/auth/reset-password
 * Восстановление пароля
 * 
 * Body:
 * - contact: string (email или phone)
 * - newPassword: string
 * - otpCode?: string (только для phone)
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { contact, newPassword, otpCode } = req.body;

    if (!contact || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Контакт и новый пароль обязательны',
      });
    }

    const isEmail = isValidEmail(contact);
    const isPhone = isValidPhone(contact);

    if (!isEmail && !isPhone) {
      return res.status(400).json({
        success: false,
        error: 'Неверный формат контакта',
      });
    }

    // Для телефона нужна проверка OTP
    if (isPhone) {
      if (!otpCode) {
        // Отправить OTP
        const otp = generateOTP();
        otpStore.set(contact, {
          code: otp,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
        
        console.log(`📱 OTP для сброса пароля ${contact}: ${otp}`);
        
        return res.json({
          success: true,
          requiresOTP: true,
          message: 'OTP код отправлен',
        });
      }

      // Проверить OTP
      const storedOTP = otpStore.get(contact);
      if (!storedOTP || storedOTP.code !== otpCode || Date.now() > storedOTP.expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'Неверный или истекший OTP код',
        });
      }
      otpStore.delete(contact);
    }

    // Обновить пароль
    const hashedPassword = await hashPassword(newPassword);
    
    const field = isEmail ? 'email' : 'phone';
    const updateQuery = `
      UPDATE session
      SET session_key = $1
      WHERE id = (
        SELECT u.session_id
        FROM users u
        JOIN user_description ud ON u.user_desc_id = ud.id
        WHERE ud.${field} = $2
      )
      RETURNING id
    `;
    
    const result = await query(updateQuery, [hashedPassword, contact]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    res.json({
      success: true,
      message: 'Пароль успешно изменен',
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при сбросе пароля',
    });
  }
};

/**
 * GET /api/auth/profile
 * Получить данные профиля текущего пользователя
 * 
 * Headers:
 * - Authorization: Bearer <token>
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Токен не предоставлен',
      });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const profileQuery = `
      SELECT 
        u.id,
        ud.name,
        ud.email,
        ud.phone,
        u.created_at as "createdAt"
      FROM users u
      JOIN user_description ud ON u.user_desc_id = ud.id
      WHERE u.id = $1
    `;

    const result = await query(profileQuery, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении профиля',
    });
  }
};

/**
 * GET /api/auth/sessions
 * Получить список всех активных сессий пользователя
 * 
 * Headers:
 * - Authorization: Bearer <token>
 */
export const getSessions = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Токен не предоставлен',
      });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const sessionsQuery = `
      SELECT 
        s.id,
        s.device_type,
        s.session_ip,
        s.created_at,
        s.user_id
      FROM session s
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
    `;

    const result = await query(sessionsQuery, [userId]);

    // Отмечаем текущую сессию
    const sessions = result.rows.map(session => ({
      ...session,
      is_current: session.id === decoded.sessionId
    }));

    res.json({
      success: true,
      sessions: sessions,
    });

  } catch (error) {
    console.error('❌ Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка сессий',
    });
  }
};

/**
 * DELETE /api/auth/sessions/:sessionId
 * Удалить сессию (выйти с устройства)
 * 
 * Headers:
 * - Authorization: Bearer <token>
 */
export const deleteSession = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Токен не предоставлен',
      });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;
    const sessionId = parseInt(req.params.sessionId);

    // Проверяем, что сессия принадлежит пользователю
    const checkQuery = `
      SELECT id
      FROM session
      WHERE id = $1 AND user_id = $2
    `;

    const checkResult = await query(checkQuery, [sessionId, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Сессия не найдена',
      });
    }

    // Удаляем сессию
    const deleteQuery = `
      DELETE FROM session
      WHERE id = $1
      RETURNING id
    `;

    await query(deleteQuery, [sessionId]);

    res.json({
      success: true,
      message: 'Сессия удалена',
    });

  } catch (error) {
    console.error('❌ Delete session error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении сессии',
    });
  }
};

/**
 * POST /api/auth/logout
 * Выход из системы (удаление текущей сессии)
 * 
 * Headers:
 * - Authorization: Bearer <token>
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Токен не предоставлен',
      });
    }

    const decoded = verifyToken(token);
    const sessionId = decoded.sessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID не найден в токене',
      });
    }

    // Удаляем текущую сессию
    const deleteQuery = `
      DELETE FROM session
      WHERE id = $1
      RETURNING id
    `;

    await query(deleteQuery, [sessionId]);

    res.json({
      success: true,
      message: 'Выход выполнен успешно',
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при выходе',
    });
  }
};

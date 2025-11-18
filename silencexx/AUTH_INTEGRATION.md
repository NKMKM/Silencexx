# Интеграция Auth API в React Native

## ✅ Что сделано

### Backend (Node.js + PostgreSQL)

1. **Database Connection** (`src/db.ts`)
   - PostgreSQL connection pool
   - Query helper functions

2. **Auth Controller** (`src/auth.ts`)
   - ✅ `POST /api/auth/register` - Регистрация (email/phone)
   - ✅ `POST /api/auth/login` - Вход (email/phone)
   - ✅ `POST /api/auth/verify-otp` - Проверка OTP
   - ✅ `POST /api/auth/resend-otp` - Повторная отправка OTP
   - ✅ `POST /api/auth/reset-password` - Восстановление пароля

3. **Security**
   - Bcrypt для хешир ования паролей
   - JWT токены (7 дней)
   - OTP коды (5 минут)

### Frontend (React Native)

1. **API Service** (`services/api.ts`)
   - Auth interceptors для автоматического добавления токенов
   - AsyncStorage для хранения токенов
   - Все auth методы готовы

---

## 🚀 Как использовать

### Шаг 1: Настроить Backend

```bash
# Перейти в папку backend
cd backend

# Создать .env файл
cp .env.example .env

# Открыть .env и заполнить:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=cloudmind
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your-secret-key

# Создать базу данных
psql -U postgres -c "CREATE DATABASE cloudmind;"

# Выполнить SQL скрипт
psql -U postgres -d cloudmind -f 1.sql

# Запустить сервер
npm run dev
```

### Шаг 2: Использовать в компонентах

#### LoginPage.tsx

```typescript
import { authApi } from '@/services/api';

// Email вход
const handleEmailLogin = async () => {
  setIsLoading(true);
  
  const response = await authApi.login('email', email, password);
  
  if (response.success && response.token) {
    // Токен уже сохранен в AsyncStorage
    onLogin(); // Навигация на главный экран
  } else {
    setErrors({ contact: '', password: response.error || 'Ошибка входа' });
  }
  
  setIsLoading(false);
};

// Phone вход - отправка OTP
const handlePhoneLogin = async () => {
  setIsLoading(true);
  
  const response = await authApi.login('phone', phone);
  
  if (response.success && response.requiresOTP) {
    onNavigateToOTP(phone); // Переход на экран OTP
  } else {
    setErrors({ contact: response.error || 'Ошибка входа', password: '' });
  }
  
  setIsLoading(false);
};
```

#### RegisterPage.tsx

```typescript
import { authApi } from '@/services/api';

// Email регистрация
const handleEmailRegister = async () => {
  setIsLoading(true);
  
  const response = await authApi.register('email', email, name, password);
  
  if (response.success && response.token) {
    onLogin(); // Сразу вход после регистрации
  } else {
    setError(response.error || 'Ошибка регистрации');
  }
  
  setIsLoading(false);
};

// Phone регистрация - отправка OTP
const handlePhoneRegister = async () => {
  setIsLoading(true);
  
  const response = await authApi.register('phone', phone, name, password);
  
  if (response.success && response.requiresOTP) {
    onNavigateToOTP(phone); // Переход на OTP
  } else {
    setError(response.error || 'Ошибка регистрации');
  }
  
  setIsLoading(false);
};
```

#### OTPPage.tsx

```typescript
import { authApi } from '@/services/api';

// Проверка OTP
const handleVerify = async () => {
  const codeString = code.join('');
  
  if (codeString.length !== 6) {
    setError('Введите полный код');
    return;
  }
  
  setIsLoading(true);
  
  const response = await authApi.verifyOTP(contact, codeString);
  
  if (response.success && response.token) {
    onVerify(codeString); // Успешная верификация
  } else {
    setError(response.error || 'Неверный код');
    triggerShake(); // Анимация ошибки
  }
  
  setIsLoading(false);
};

// Повторная отправка OTP
const handleResend = async () => {
  const response = await authApi.resendOTP(contact);
  
  if (response.success) {
    setTimer(60); // Перезапустить таймер
    setError('');
  } else {
    setError(response.error || 'Ошибка отправки');
  }
};
```

#### ForgotPasswordPage.tsx

```typescript
import { authApi } from '@/services/api';

// Восстановление пароля
const handleResetPassword = async () => {
  setIsLoading(true);
  
  const response = await authApi.resetPassword(contact, newPassword);
  
  if (response.success) {
    if (response.requiresOTP) {
      // Для телефона - перейти на OTP
      onNavigateToOTP(contact);
    } else {
      // Для email - готово
      onBack(); // Вернуться на логин
    }
  } else {
    setError(response.error || 'Ошибка сброса пароля');
  }
  
  setIsLoading(false);
};
```

---

## 📱 Проверка авторизации

### В корневом компоненте (_layout.tsx)

```typescript
import { authApi } from '@/services/api';
import { useEffect, useState } from 'react';

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await authApi.isAuthenticated();
    setIsAuthenticated(authenticated);
    setIsLoading(false);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
}
```

### Выход из системы

```typescript
const handleLogout = async () => {
  await authApi.logout();
  // Навигация на экран логина
};
```

---

## 🧪 Тестирование

### 1. Запустить backend

```bash
cd backend
npm run dev
```

Должно появиться:
```
╔══════════════════════════════════════════════════════╗
║         🌥️  CloudMind Backend запущен! 🌥️          ║
╠══════════════════════════════════════════════════════╣
║  Port: 3000                                          ║
...
║  Auth:                                               ║
║  ✓ POST /api/auth/register                           ║
║  ✓ POST /api/auth/login                              ║
...
```

### 2. Запустить React Native

```bash
cd silencexx
npx expo start
```

### 3. Тестовый сценарий

**Email регистрация:**
1. Открыть RegisterPage
2. Выбрать Email
3. Ввести: test@example.com, Иван, password123
4. Нажать "Зарегистрироваться"
5. Должен сразу войти (получить токен)

**Phone регистрация:**
1. Открыть RegisterPage
2. Выбрать Phone
3. Ввести: +79001234567, Иван, password123
4. Нажать "Зарегистрироваться"
5. Перейти на OTP экран
6. В консоли backend увидите код (например: `📱 OTP для +79001234567: 123456`)
7. Ввести код 123456
8. Должен войти

**Email вход:**
1. Открыть LoginPage
2. Выбрать Email
3. Ввести: test@example.com, password123
4. Войти

**Phone вход:**
1. Открыть LoginPage
2. Выбрать Phone
3. Ввести: +79001234567
4. Получить OTP из консоли
5. Ввести код

---

## 🔧 Настройки для разных устройств

### Android Emulator

В `services/api.ts` уже настроено:
```typescript
const API_URL = __DEV__ 
  ? 'http://10.0.2.2:3000/api' // Android эмулятор
  : 'https://your-production-api.com/api';
```

### iOS Simulator

Используйте `http://localhost:3000/api`

### Real Device

Найдите IP вашего компьютера:
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

Замените в `services/api.ts`:
```typescript
const API_URL = 'http://192.168.1.100:3000/api'; // Ваш IP
```

---

## 🔐 Безопасность (Production)

1. **Изменить JWT_SECRET** в `.env`
2. **Использовать HTTPS**
3. **Настроить CORS** только для вашего домена
4. **Интегрировать SMS** сервис (Twilio, SMS.ru) для реальной отправки OTP
5. **Использовать Redis** для хранения OTP вместо Map
6. **Добавить rate limiting**
7. **Включить логирование**

---

## 📊 Структура базы данных

Auth использует следующие таблицы из вашего SQL:
- `user_description` - данные пользователя (name, email, phone)
- `users` - главная таблица пользователей
- `roles` - роли (free, premium)
- `session` - сессии (session_key хранит хеш пароля)
- `settings` - настройки пользователя
- `chat_id` - для чатов с AI

---

## ✨ Готово!

Теперь у вас есть:
- ✅ Полноценный backend с PostgreSQL
- ✅ JWT авторизация
- ✅ Email и Phone регистрация/вход
- ✅ OTP коды для телефонов
- ✅ Восстановление пароля
- ✅ React Native интеграция
- ✅ AsyncStorage для токенов
- ✅ Все компоненты готовы к использованию

Следующий шаг: интегрировать auth в ваши существующие компоненты LoginPage, RegisterPage, OTPPage!

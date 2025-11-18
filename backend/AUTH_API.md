# CloudMind Authentication API

## Настройка базы данных

### 1. Создать базу данных PostgreSQL

```bash
# Подключиться к PostgreSQL
psql -U postgres

# Создать базу данных
CREATE DATABASE cloudmind;

# Подключиться к базе
\c cloudmind

# Выполнить SQL скрипт
\i 1.sql
```

### 2. Настроить переменные окружения

Скопировать `.env.example` в `.env` и заполнить:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cloudmind
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
```

### 3. Запустить сервер

```bash
npm run dev
```

---

## API Endpoints

### Регистрация

**POST** `/api/auth/register`

#### Регистрация через Email

```json
{
  "method": "email",
  "contact": "user@example.com",
  "name": "Иван Иванов",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Иван Иванов",
    "contact": "user@example.com"
  }
}
```

#### Регистрация через Телефон

```json
{
  "method": "phone",
  "contact": "+79001234567",
  "name": "Иван Иванов",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "requiresOTP": true,
  "contact": "+79001234567",
  "message": "OTP код отправлен на телефон"
}
```

---

### Вход

**POST** `/api/auth/login`

#### Вход через Email

```json
{
  "method": "email",
  "contact": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Иван Иванов",
    "contact": "user@example.com"
  }
}
```

#### Вход через Телефон

```json
{
  "method": "phone",
  "contact": "+79001234567"
}
```

**Response:**
```json
{
  "success": true,
  "requiresOTP": true,
  "contact": "+79001234567",
  "message": "OTP код отправлен на телефон"
}
```

---

### Проверка OTP

**POST** `/api/auth/verify-otp`

```json
{
  "contact": "+79001234567",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Иван Иванов",
    "contact": "+79001234567"
  }
}
```

---

### Повторная отправка OTP

**POST** `/api/auth/resend-otp`

```json
{
  "contact": "+79001234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP код отправлен повторно"
}
```

---

### Восстановление пароля

**POST** `/api/auth/reset-password`

#### Шаг 1: Запрос OTP (для телефона)

```json
{
  "contact": "+79001234567",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "requiresOTP": true,
  "message": "OTP код отправлен"
}
```

#### Шаг 2: Подтверждение и смена пароля

```json
{
  "contact": "+79001234567",
  "newPassword": "newpassword123",
  "otpCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Пароль успешно изменен"
}
```

#### Для Email (без OTP)

```json
{
  "contact": "user@example.com",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Пароль успешно изменен"
}
```

---

## Интеграция с React Native

### Установка зависимостей

```bash
npm install axios @react-native-async-storage/async-storage
```

### Создать API сервис

```typescript
// services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  // Регистрация
  register: async (method: 'email' | 'phone', contact: string, name: string, password: string) => {
    const response = await api.post('/auth/register', {
      method,
      contact,
      name,
      password,
    });
    return response.data;
  },

  // Вход
  login: async (method: 'email' | 'phone', contact: string, password?: string) => {
    const response = await api.post('/auth/login', {
      method,
      contact,
      password,
    });
    return response.data;
  },

  // Проверка OTP
  verifyOTP: async (contact: string, code: string) => {
    const response = await api.post('/auth/verify-otp', {
      contact,
      code,
    });
    return response.data;
  },

  // Повторная отправка OTP
  resendOTP: async (contact: string) => {
    const response = await api.post('/auth/resend-otp', {
      contact,
    });
    return response.data;
  },

  // Восстановление пароля
  resetPassword: async (contact: string, newPassword: string, otpCode?: string) => {
    const response = await api.post('/auth/reset-password', {
      contact,
      newPassword,
      otpCode,
    });
    return response.data;
  },
};

export default api;
```

### Использование в компонентах

```typescript
// LoginPage.tsx
const handleEmailLogin = async () => {
  try {
    const response = await authAPI.login('email', email, password);
    
    if (response.success && response.token) {
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      onLogin();
    }
  } catch (error) {
    console.error('Login error:', error);
    setErrors({ contact: '', password: 'Ошибка входа' });
  }
};

const handlePhoneLogin = async () => {
  try {
    const response = await authAPI.login('phone', phone);
    
    if (response.success && response.requiresOTP) {
      onNavigateToOTP(phone);
    }
  } catch (error) {
    console.error('Login error:', error);
  }
};
```

---

## Тестирование через cURL

### Регистрация Email

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "method": "email",
    "contact": "test@example.com",
    "name": "Test User",
    "password": "password123"
  }'
```

### Вход Email

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "method": "email",
    "contact": "test@example.com",
    "password": "password123"
  }'
```

### Регистрация Phone

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "method": "phone",
    "contact": "+79001234567",
    "name": "Test User",
    "password": "password123"
  }'
```

### Проверка OTP

```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "+79001234567",
    "code": "123456"
  }'
```

---

## Безопасность

### В продакшене обязательно:

1. **Изменить JWT_SECRET** на длинный случайный ключ
2. **Использовать HTTPS** для всех запросов
3. **Настроить CORS** только для разрешенных доменов
4. **Использовать Redis** для хранения OTP вместо Map
5. **Интегрировать SMS сервис** (Twilio, SMS.ru) для отправки OTP
6. **Добавить rate limiting** для защиты от брутфорса
7. **Логировать попытки входа** и подозрительную активность

---

## OTP в разработке

В режиме разработки OTP коды выводятся в консоль:

```
📱 OTP для +79001234567: 123456
```

Для тестирования используйте код `123456`.

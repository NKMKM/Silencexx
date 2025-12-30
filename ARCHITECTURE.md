# 🏗️ АРХИТЕКТУРА: Многопользовательская система чатов CloudMind

## Обзор системы

```
┌─────────────────────────────────────────────────────────────────┐
│                    МОБИЛЬНОЕ ПРИЛОЖЕНИЕ                         │
│                    (React Native + Expo)                        │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS API GATEWAY                       │
│                  (backend/src/server.ts)                        │
├─────────────────────────────────────────────────────────────────┤
│ Endpoints:                                                      │
│  • POST /api/chat                (send message + get response)  │
│  • GET  /api/chats/:chatId/messages  (load history)            │
│  • POST /api/chats/create        (create new chat)             │
│  • GET  /api/chats/list          (get all user chats)          │
│  • DELETE /api/chats/:chatId     (delete chat)                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       ┌──────┐  ┌──────┐  ┌────────┐
       │ Auth │  │ Chat │  │ Ollama │
       │ Mgmt │  │ Mgmt │  │  AI    │
       └──┬───┘  └──┬───┘  └────┬───┘
          │         │           │
          └─────────┼───────────┘
                    │ (check access, validate data)
                    ▼
        ┌──────────────────────────────┐
        │  POSTGRESQL DATABASE         │
        ├──────────────────────────────┤
        │  Tables:                     │
        │  • users                     │
        │  • chat_id (with user_id)    │
        │  • user_chat (with user_id)  │
        │  • ai_response (with user_id)│
        │  • daily_limits              │
        │  • subscription_tiers        │
        │  • user_subscriptions        │
        └──────────────────────────────┘
```

---

## 1. СЛОЙ АУТЕНТИФИКАЦИИ (Auth Layer)

```
┌─────────────────────────────────────────────────────┐
│             JWT TOKEN VERIFICATION                  │
├─────────────────────────────────────────────────────┤
│ 1. Клиент отправляет: Bearer <JWT>                 │
│ 2. Извлекаем userId из токена                      │
│ 3. Проверяем что пользователь существует           │
│ 4. Устанавливаем: req.user = { userId, ... }      │
└─────────────────────────────────────────────────────┘
```

**Файл:** `backend/src/auth.ts`
**Функция:** `verifyToken(token: string)`

---

## 2. СЛОЙ ИЗОЛЯЦИИ (Isolation Layer)

### Принцип: (userId, chatId) = уникальная пара

```
Request от User 1:
  GET /api/chats/5/messages
  Authorization: Bearer <token_user_1>

Проверка:
  1. Извлечь userId = 1 из токена
  2. Получить chatId = 5 из параметра
  3. Проверить в БД: SELECT FROM chat_id 
     WHERE id = 5 AND user_id = 1
  4. Если нет результата → 403 Forbidden
  5. Если есть → загрузить ТОЛЬКО сообщения этого пользователя:
     SELECT FROM user_chat 
     WHERE chat_id = 5 AND user_id = 1
```

### Двойная проверка (Defense in Depth)

```
Уровень 1: API Middleware
  ✅ checkSessionActive
  ✅ checkChatLimit
  ✅ Verify Token

Уровень 2: Функция обработки
  ✅ getChatMessages()
    - Проверить chat_id принадлежит userId
    - Загрузить только WHERE chat_id AND user_id

Уровень 3: Database Constraints
  ✅ Foreign keys
  ✅ NOT NULL constraints
  ✅ CHECK constraints для mood enum
  ✅ Индексы для быстрого поиска (chat_id, user_id)
```

---

## 3. СЛОЙ УПРАВЛЕНИЯ ЧАТАМИ (Chat Management)

### Жизненный цикл чата

```
CREATE CHAT:
┌─────────────────────────────────────────┐
│ POST /api/chats/create                  │
├─────────────────────────────────────────┤
│ 1. Проверить token → userId             │
│ 2. INSERT INTO chat_id                  │
│    (user_id, is_first_message=true)     │
│ 3. Return: { chatId, isFirstMessage }   │
└─────────────────────────────────────────┘
              ▼
FIRST MESSAGE:
┌─────────────────────────────────────────┐
│ POST /api/chat (с chatId)               │
├─────────────────────────────────────────┤
│ 1. Сохранить user_chat                  │
│    (chat_id, user_id, message, mood)    │
│ 2. Сохранить ai_response                │
│    (chat_id, user_id, response, mood)   │
│ 3. UPDATE chat_id SET                   │
│    is_first_message = false              │
│ 4. incrementLimitCounter()               │
└─────────────────────────────────────────┘
              ▼
HISTORY:
┌─────────────────────────────────────────┐
│ GET /api/chats/:chatId/messages         │
├─────────────────────────────────────────┤
│ SELECT * FROM user_chat                 │
│ WHERE chat_id AND user_id               │
│ UNION ALL                               │
│ SELECT * FROM ai_response               │
│ WHERE chat_id AND user_id               │
│ ORDER BY senddate ASC                   │
└─────────────────────────────────────────┘
              ▼
DELETE CHAT:
┌─────────────────────────────────────────┐
│ DELETE /api/chats/:chatId               │
├─────────────────────────────────────────┤
│ 1. Проверить ownership (userId)         │
│ 2. DELETE FROM user_chat                │
│    WHERE chat_id AND user_id            │
│ 3. DELETE FROM ai_response              │
│    WHERE chat_id AND user_id            │
│ 4. DELETE FROM chat_id                  │
│    WHERE id AND user_id                 │
└─────────────────────────────────────────┘
```

---

## 4. СЛОЙ ВАЛИДАЦИИ (Validation Layer)

### Mood Enum

```
Valid Values:
  'Happy'    - Положительное настроение
  'Neutral'  - Нейтральное
  'Sad'      - Грустное
  'Anxious'  - Тревожное
  'Angry'    - Гневное
  'Low'      - Низкое
  'Stressed' - Стрессовое

Валидация:
  1. Frontend отправляет mood
  2. Backend проверяет в validMoods[]
  3. Если ошибка → 400 Bad Request
  4. Если ок → сохраняем в БД
  5. БД constraint CHECK гарантирует целостность
```

---

## 5. СЛОЙ ЛИМИТОВ ПОДПИСКИ (Subscription Limits)

### Архитектура лимитов

```
┌──────────────────────────────────────────┐
│        SUBSCRIPTION TIERS TABLE          │
├──────────────────────────────────────────┤
│ Free:         5 chat/day                 │
│ Plus:        50 chat/day                 │
│ Professional: 200 chat/day               │
└────────────┬────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│      DAILY LIMITS TABLE (per user)       │
├──────────────────────────────────────────┤
│ user_id          | 3                     │
│ chat_requests_used | 42                  │
│ reset_date       | 2025-12-28            │
│ Created: 2025-12-28 00:00:00             │
│ Resets: 2025-12-29 00:00:00              │
└──────────────────────────────────────────┘

Auto-reset at 00:00 UTC:
  UPDATE daily_limits
  SET chat_requests_used = 0, reset_date = CURRENT_DATE
  WHERE reset_date < CURRENT_DATE
```

### Flow при отправке сообщения

```
POST /api/chat
    │
    ├─→ Middleware: checkChatLimit
    │     SELECT daily_limits WHERE user_id, reset_date=TODAY
    │     Если used >= limit → 429 Too Many Requests
    │     Иначе → continue
    │
    ├─→ Генерировать ответ AI
    │
    ├─→ Сохранить сообщения
    │
    └─→ INCREMENT лимит
          UPDATE daily_limits
          SET chat_requests_used = chat_requests_used + 1
          WHERE user_id AND reset_date=TODAY
          
          Log:
            📊 Incrementing chat request counter...
            ✅ Counter incremented
            📈 Current limits:
               Used: 42/200
               Remaining: 158
```

---

## 6. СТРУКТУРА ДАННЫХ (Data Model)

### Основные таблицы

```sql
╔════════════════════════════════════════════════════════════╗
║                       USERS                               ║
╠════════════════════════════════════════════════════════════╣
║ id (PK) | name | email | created_at | updated_at         ║
╚════════════════════════════════════════════════════════════╝
               │
               ├──→ CHAT_ID (1:N)
               │
               ├──→ USER_SUBSCRIPTIONS (1:1)
               │
               └──→ DAILY_LIMITS (1:1 per day)

╔════════════════════════════════════════════════════════════╗
║                    CHAT_ID                                ║
╠════════════════════════════════════════════════════════════╣
║ id (PK) | user_id (FK) | is_first_message | mood          ║
║ created_at | updated_at | is_temporary                    ║
╠════════════════════════════════════════════════════════════╣
║ Indices:                                                   ║
║   - PRIMARY KEY (id)                                       ║
║   - (user_id) - для быстрого поиска чатов пользователя   ║
║   - (created_at DESC) - для сортировки по времени         ║
╚════════════════════════════════════════════════════════════╝
               │
               ├──→ USER_CHAT (1:N)
               │
               └──→ AI_RESPONSE (1:N)

╔════════════════════════════════════════════════════════════╗
║                   USER_CHAT                               ║
╠════════════════════════════════════════════════════════════╣
║ id (PK) | chat_id (FK) | user_id (FK) | message          ║
║ senddate | audio_uri | language | transcript              ║
║ is_transcribed | mood                                      ║
╠════════════════════════════════════════════════════════════╣
║ Constraints:                                               ║
║   - user_id NOT NULL                                       ║
║   - mood IN (enum values)                                  ║
║ Indices:                                                   ║
║   - (chat_id, user_id) - DOUBLE CHECK для изоляции        ║
║   - (user_id) - быстро найти все сообщения пользователя   ║
║   - (senddate DESC) - сортировка по времени               ║
╚════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════╗
║                  AI_RESPONSE                              ║
╠════════════════════════════════════════════════════════════╣
║ id (PK) | chat_id (FK) | user_id (FK) | message          ║
║ senddate | language | mood | is_voice_response            ║
║ tts_audio_uri                                              ║
╠════════════════════════════════════════════════════════════╣
║ Constraints:                                               ║
║   - user_id NOT NULL                                       ║
║   - mood IN (enum values)                                  ║
║ Indices:                                                   ║
║   - (chat_id, user_id) - DOUBLE CHECK для изоляции        ║
║   - (user_id) - быстро найти все ответы пользователя      ║
╚════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════╗
║                 DAILY_LIMITS                              ║
╠════════════════════════════════════════════════════════════╣
║ id (PK) | user_id (FK) | reset_date | chat_requests_used ║
║ voice_messages_used | mood_analyses_used                   ║
║ journal_entries_used | created_at                          ║
╠════════════════════════════════════════════════════════════╣
║ Constraints:                                               ║
║   - UNIQUE(user_id, reset_date)                           ║
║   - Автоматический сброс в 00:00                          ║
╚════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════╗
║              SUBSCRIPTION_TIERS                           ║
╠════════════════════════════════════════════════════════════╣
║ id (PK) | slug | name | daily_chat_limit                 ║
║ daily_voice_limit | daily_mood_analysis_limit             ║
║ daily_journal_limit | priority_level | price              ║
╚════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════╗
║            USER_SUBSCRIPTIONS                             ║
╠════════════════════════════════════════════════════════════╣
║ id (PK) | user_id (FK) | tier_id (FK) | expires_at       ║
║ created_at | updated_at                                    ║
╚════════════════════════════════════════════════════════════╝
```

---

## 7. ЛОГИРОВАНИЕ (Logging Strategy)

### Уровни и форматы

```
1. REQUEST LEVEL:
   🔹 [requestId] POST /api/chat - NEW REQUEST
   
2. AUTH LEVEL:
   🔑 Token exists: true
   👤 User ID from token: 3
   
3. VALIDATION LEVEL:
   📊 Mood validated: Sad
   ✅ User name from DB: "Артем"
   
4. SUBSCRIPTION LEVEL:
   💳 Subscription Info:
      Tier: professional
      Daily Chat Limit: 200
   
5. DATABASE LEVEL:
   💾 Saving messages to chat 5 with mood=Sad
   ✅ Messages saved to database with user isolation
   
6. LIMITS LEVEL:
   📊 Incrementing chat request counter...
   📈 Current limits:
      Used: 42/200
      Remaining: 158
      Reset at: 2025-12-29
      
7. RESPONSE LEVEL:
   ✨ Response sent successfully
```

---

## 8. БЕЗОПАСНОСТЬ (Security Measures)

```
┌─────────────────────────────────────────────────────────┐
│          SECURITY LAYERS                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Layer 1: AUTHENTICATION                               │
│    ✅ JWT token validation                             │
│    ✅ Token expiration check                           │
│                                                         │
│  Layer 2: AUTHORIZATION                                │
│    ✅ Check (chatId, userId) ownership                 │
│    ✅ Return 403 Forbidden if denied                   │
│                                                         │
│  Layer 3: DATA ISOLATION                               │
│    ✅ All WHERE clauses include user_id                │
│    ✅ Double-check in code + DB constraints            │
│    ✅ Foreign keys prevent orphaned data               │
│                                                         │
│  Layer 4: INPUT VALIDATION                             │
│    ✅ mood enum validation                             │
│    ✅ message length limits                            │
│    ✅ sanitize user input                              │
│                                                         │
│  Layer 5: DATABASE CONSTRAINTS                         │
│    ✅ NOT NULL constraints                             │
│    ✅ UNIQUE constraints                               │
│    ✅ CHECK constraints for enums                      │
│    ✅ Foreign key constraints                          │
│                                                         │
│  Layer 6: RATE LIMITING                                │
│    ✅ Daily limits per subscription tier               │
│    ✅ Return 429 if limit exceeded                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 9. ПРОИЗВОДИТЕЛЬНОСТЬ (Performance)

### Индексная стратегия

```
Критические запросы:

1. getChatMessages(chatId, userId)
   Query:  SELECT * FROM user_chat 
           WHERE chat_id = $1 AND user_id = $2
   Index:  idx_user_chat_chat_id_user_id (composite)
   Speed:  O(log n) → < 50ms даже для 1M rows

2. getChatList(userId)
   Query:  SELECT * FROM chat_id WHERE user_id = $1
   Index:  idx_chat_id_user_id
   Speed:  O(log n) → < 100ms

3. getSubscriptionInfo(userId)
   Query:  JOIN users, subscriptions, daily_limits
           WHERE users.id = $1
   Index:  Primary keys + Foreign keys
   Speed:  < 10ms

Размер индексов:
   idx_user_chat_chat_id_user_id:   ~50 MB (for 1M messages)
   idx_ai_response_chat_id_user_id:  ~50 MB (for 1M responses)
   idx_chat_id_user_id:              ~5 MB (for 100K chats)
   
   Total: ~105 MB для 1M сообщений
```

### Масштабирование

```
Current architecture supports:
  • 1,000 users: < 10ms per request
  • 10,000 users: < 50ms per request (с кешированием лимитов)
  • 100,000 users: < 100ms per request (требуется горизонтальное масштабирование БД)

Bottlenecks:
  1. PostgreSQL CPU - решение: read replicas
  2. Memory - решение: Redis cache для лимитов
  3. Network - решение: CDN для статики
```

---

## 10. РАЗВЕРТЫВАНИЕ (Deployment)

### Компоненты

```
┌──────────────────────────────────────┐
│         DOCKER / KUBERNETES          │
├──────────────────────────────────────┤
│                                      │
│  ├─ Backend Container (Express.js)  │
│  │  └─ Port 3000                    │
│  │                                   │
│  ├─ PostgreSQL Container             │
│  │  └─ Port 5432                     │
│  │                                   │
│  ├─ Redis Container (optional)       │
│  │  └─ Port 6379                     │
│  │                                   │
│  └─ Ollama Container (AI)            │
│     └─ Port 11434 (local или ngrok)  │
│                                      │
└──────────────────────────────────────┘
```

---

## ИТОГИ

✅ **Strict user isolation** - (userId, chatId) пара
✅ **Double-check validation** - Code + DB constraints
✅ **Mood management** - Enum validation + persistence
✅ **Subscription logging** - Full audit trail
✅ **Daily limits** - Auto-reset at 00:00
✅ **High performance** - Composite indices
✅ **Secure architecture** - 6-layer security
✅ **Scalable design** - Ready for 100K+ users

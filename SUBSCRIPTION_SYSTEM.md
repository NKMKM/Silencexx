# 📊 Система подписок CloudMind

## 🎯 Обзор

Реализована система из 3 уровней подписок с автоматическими лимитами на использование функций:

### Уровни подписок:

| Функция | Free | Plus | Pro |
|---------|------|------|-----|
| **Цена** | Бесплатно | 99₽/мес | 299₽/мес |
| **Сообщения в день** | 5 | 50 | 200 |
| **Голосовые сообщения/день** | 1 | Неограниченно | Неограниченно |
| **Анализ настроения/день** | 3 | Неограниченно | Неограниченно |
| **Записи в журнал/день** | 1 | Неограниченно | Неограниченно |
| **История чатов** | 30 дней | 180 дней | Всю историю |
| **Синтез речи (TTS)** | ❌ | ✅ | ✅ |
| **Экспорт дневника** | ❌ | ✅ | ✅ |
| **Приоритет запросов** | ⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Анонимные сообщения** | ✅ Неограниченно | ✅ Неограниченно | ✅ Неограниченно |

---

## 🗄️ Структура БД

### Таблица `subscription_tiers`
Содержит информацию о типах подписок:
```sql
CREATE TABLE subscription_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,           -- 'Free', 'Plus', 'Professional'
  slug VARCHAR(50) NOT NULL,           -- 'free', 'plus', 'pro'
  daily_chat_limit INTEGER,            -- Лимит сообщений в день
  daily_voice_limit INTEGER,           -- Лимит голосовых сообщений
  daily_mood_analysis_limit INTEGER,   -- Лимит анализов настроения
  daily_journal_limit INTEGER,         -- Лимит записей в журнал
  chat_history_days INTEGER,           -- Дней истории чатов
  has_tts BOOLEAN,                     -- Доступен синтез речи
  has_export BOOLEAN,                  -- Доступен экспорт
  priority_level INTEGER               -- Уровень приоритета (1-3)
);
```

### Таблица `daily_limits`
Отслеживает использование лимитов за день:
```sql
CREATE TABLE daily_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  reset_date DATE NOT NULL,
  chat_requests_used INTEGER,
  voice_messages_used INTEGER,
  mood_analysis_used INTEGER,
  journal_entries_used INTEGER,
  UNIQUE(user_id, reset_date)          -- Одна запись на день на пользователя
);
```

### Таблица `subscription_history`
Логирует всю историю подписок:
```sql
CREATE TABLE subscription_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  tier_id INTEGER,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  payment_id VARCHAR(255),
  amount DECIMAL(10, 2),
  currency VARCHAR(3),
  status VARCHAR(50)                   -- 'active', 'cancelled', 'expired'
);
```

---

## 🔌 API Endpoints

### Получить лимиты пользователя
```http
GET /api/subscription/limits
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "success": true,
  "limits": {
    "userId": 123,
    "tierName": "Plus",
    "dailyChatLimit": 50,
    "dailyChatUsed": 23,
    "dailyVoiceLimit": 999,
    "dailyVoiceUsed": 5,
    "dailyMoodAnalysisLimit": 999,
    "dailyMoodAnalysisUsed": 2,
    "dailyJournalLimit": 999,
    "dailyJournalUsed": 1,
    "chatHistoryDays": 180,
    "hasTTS": true,
    "hasExport": true,
    "subscriptionExpiresAt": "2025-01-25T00:00:00Z",
    "isExpired": false
  }
}
```

### Коды ошибок

**429 Too Many Requests** - лимит превышен:
```json
{
  "success": false,
  "error": "Daily chat limit reached (50/50). Next reset at 00:00 UTC",
  "limits": { ... }
}
```

**401 Unauthorized** - требуется авторизация для функций с ограничением

---

## 🔧 Использование в Backend

### Проверка лимита перед выполнением действия

```typescript
import { checkFeatureAccess, incrementLimitCounter } from './subscriptions';

// Проверить доступ к функции
const access = await checkFeatureAccess(userId, 'voice'); // voice | mood_analysis | journal | tts | export
if (!access.allowed) {
  return res.status(429).json({ error: access.reason, limits: access.limitsInfo });
}

// Выполнить действие...

// Увеличить счётчик
await incrementLimitCounter(userId, 'voice_messages'); // или chat_requests, mood_analysis, journal_entries
```

### Middleware для endpoint'ов

Все endpoint'ы, требующие проверку лимитов, используют middleware:

```typescript
// Для чата
app.post('/api/chat', checkSessionActive, checkChatLimit, async (req, res) => { ... });

// Для голосовых сообщений
app.post('/api/chat-with-voice', checkSessionActive, checkVoiceLimit, async (req, res) => { ... });

// Для анализа настроения
app.post('/api/analyze-mood', checkSessionActive, checkMoodAnalysisLimit, async (req, res) => { ... });

// Для журнала
app.post('/api/journal', checkSessionActive, checkJournalLimit, async (req, res) => { ... });
```

---

## 📱 Использование на Frontend

### Получить информацию о лимитах

```typescript
import { APIService } from '@/services/api';

const limitsResponse = await APIService.get('/subscription/limits');
const limits = limitsResponse.limits;

console.log(`Осталось ${limits.dailyChatLimit - limits.dailyChatUsed} сообщений`);
```

### Типы для TypeScript

```typescript
import { SubscriptionLimits, getRemainingRequests, isLimitReached } from '@/types/subscriptions';

const remaining = getRemainingRequests(limits, 'chat');
const isReached = isLimitReached(limits, 'voice');
```

### Утилиты

```typescript
import { 
  getRemainingRequests,      // Получить оставшееся количество
  isLimitReached,            // Проверить, достигнут ли лимит
  getLimitPercentage,        // Процент использования (0-100)
  getLimitMessage            // Сообщение для пользователя
} from '@/types/subscriptions';

const remaining = getRemainingRequests(limits, 'chat');
const percentage = getLimitPercentage(limits, 'mood');
const message = getLimitMessage(limits, 'voice');
```

---

## 🔄 Сброс лимитов

Лимиты сбрасываются автоматически каждый день в 00:00 UTC. 

Для ручного сброса (если требуется):

```typescript
import { resetDailyLimits } from './subscriptions';

await resetDailyLimits();
```

**Рекомендуется** настроить cron-job для автоматического запуска каждую ночь:

```typescript
// В server.ts
import cron from 'node-cron';

// Запускать каждый день в 00:01 UTC
cron.schedule('1 0 * * *', async () => {
  console.log('🔄 Resetting daily limits...');
  await resetDailyLimits();
});
```

---

## 👤 Установка подписки пользователю

```typescript
import { setUserSubscription } from './subscriptions';

// Бесплатный план (по умолчанию)
await setUserSubscription(userId, 'free');

// Plus (на 1 месяц)
const expiresAt = new Date();
expiresAt.setMonth(expiresAt.getMonth() + 1);
await setUserSubscription(userId, 'plus', expiresAt);

// Professional (до конца года)
const expiresAt = new Date('2025-12-31');
await setUserSubscription(userId, 'pro', expiresAt);
```

---

## 🚀 Миграция БД

Для применения изменений запустите:

```bash
npm run migrate
```

Или вручную:

```bash
psql -d cloudmind -f backend/migrations/add_subscriptions.sql
```

---

## 📝 Примеры использования

### 1. Проверить лимит перед отправкой сообщения

```typescript
const access = await checkChatLimitAccess(userId);
if (!access.allowed) {
  showAlert('Лимит сообщений исчерпан. Попробуйте завтра.');
  return;
}
// Отправить сообщение
```

### 2. Показать информацию о подписке в профиле

```typescript
const limits = await getUserLimits(userId);
console.log(`Ваш план: ${limits.tierName}`);
console.log(`Осталось чатов: ${limits.dailyChatLimit - limits.dailyChatUsed}/${limits.dailyChatLimit}`);
console.log(`История: ${limits.chatHistoryDays} дней`);
```

### 3. Ограничить функцию для Free пользователей

```typescript
if (limits.tierName === 'Free') {
  // Показать баннер "Upgrade to Plus"
  showUpgradeBanner();
}

// Или проверить конкретную функцию
if (!limits.hasTTS) {
  disableTTSButton();
}
```

---

## 🔗 Файлы

- **Backend**: [backend/src/subscriptions.ts](../backend/src/subscriptions.ts)
- **Migration**: [backend/migrations/add_subscriptions.sql](../backend/migrations/add_subscriptions.sql)
- **Types**: [silencexx/types/subscriptions.ts](../silencexx/types/subscriptions.ts)
- **Server routes**: [backend/src/server.ts](../backend/src/server.ts) (см. строки с middleware)

---

## ⚙️ Настройка

Все лимиты хранятся в таблице `subscription_tiers`. Для изменения лимитов:

```sql
UPDATE subscription_tiers 
SET daily_chat_limit = 10 
WHERE slug = 'free';
```

Изменения вступают в силу сразу для новых пользователей. Существующие пользователи продолжат использовать старые лимиты до истечения подписки.

---

## ✅ Тестирование

```bash
# Проверить лимиты пользователя
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/subscription/limits

# Отправить сообщение (проверит лимит)
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

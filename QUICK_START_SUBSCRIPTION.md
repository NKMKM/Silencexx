# 🚀 Быстрый старт системы подписок

## ⚡ Что было сделано

✅ Создана **система подписок с 3 уровнями**:
- **Free** - 5 сообщений/день, 1 голос/день
- **Plus** - 50 сообщений/день (99₽/мес)
- **Pro** - 200 сообщений/день (299₽/мес)

✅ Реализована **проверка лимитов** на:
- Обычные сообщения (`/api/chat`)
- Голосовые сообщения (`/api/chat-with-voice`)
- Анализ настроения (`/api/analyze-mood`)
- Записи в журнал (`/api/journal`)

✅ Автоматическое **отслеживание использования** лимитов за день

✅ **API endpoint** для получения информации о лимитах

✅ **Types & Utils** для фронтенда

---

## 📦 Установка

### 1. Примените миграцию БД

```bash
cd backend
npm run migrate
```

Или вручную:
```bash
psql -U postgres -d cloudmind -f migrations/add_subscriptions.sql
```

### 2. Проверьте, что все компилируется

```bash
# Backend
cd backend
npm run build

# Frontend
cd ../silencexx
npm run build
```

### 3. Обновите фронтенд компоненты (если нужно)

Обновлены файлы:
- `silencexx/app/billing.tsx` - новые тарифы
- `silencexx/types/subscriptions.ts` - типы и утилиты (новый файл)

---

## 🧪 Тестирование

### 1. Проверить лимиты пользователя

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/subscription/limits
```

**Ответ:**
```json
{
  "success": true,
  "limits": {
    "tierName": "Free",
    "dailyChatLimit": 5,
    "dailyChatUsed": 2,
    "dailyVoiceLimit": 1,
    "dailyVoiceUsed": 0,
    ...
  }
}
```

### 2. Отправить сообщение (проверяет лимит)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello!",
    "conversationHistory": []
  }'
```

Если лимит превышен, получите:
```json
{
  "success": false,
  "error": "Daily chat limit reached (5/5). Next reset at 00:00 UTC",
  "limits": { ... }
}
```

### 3. Отправить голосовое сообщение

```bash
curl -X POST http://localhost:3000/api/chat-with-voice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "audioBase64": "...",
    "chatId": 1
  }'
```

Если Free пользователь исчерпал лимит голосовых:
```json
{
  "success": false,
  "error": "Daily voice message limit reached (1/1). Next reset at 00:00 UTC"
}
```

### 4. Проверить анализ настроения (только для Plus/Pro)

```bash
curl -X POST http://localhost:3000/api/analyze-mood \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Я очень счастлив!"}'
```

Для Free пользователя (если лимит 3 в день исчерпан):
```json
{
  "success": false,
  "error": "Daily mood analysis limit reached (3/3). Next reset at 00:00 UTC"
}
```

---

## 🔧 Установка подписки пользователю (admin)

### Via DB

```sql
-- Установить Plus подписку на месяц
UPDATE users 
SET subscription_tier_id = 2, 
    subscription_expires_at = NOW() + INTERVAL '1 month'
WHERE id = 123;
```

### Via Backend API (если создадите endpoint)

```typescript
import { setUserSubscription } from './subscriptions';

// Когда пользователь купит подписку
await setUserSubscription(userId, 'plus', expiresAt);
```

---

## 📊 Структура данных

### subscription_tiers (типы подписок)
```
id | name                | slug | daily_chat_limit | daily_voice_limit | ...
1  | Free               | free | 5                | 1                 | ...
2  | Plus               | plus | 50               | 999               | ...
3  | Professional       | pro  | 200              | 999               | ...
```

### daily_limits (отслеживание за день)
```
id | user_id | reset_date | chat_requests_used | voice_messages_used | ...
1  | 123     | 2025-12-25 | 3                  | 0                   | ...
```

### users (обновлено)
```
id | ... | subscription_tier_id | subscription_expires_at | ...
123|...  | 2                    | 2025-01-25 00:00:00     | ...
```

---

## 🔄 Как работают лимиты

1. **Пользователь отправляет запрос** → POST /api/chat
2. **Middleware проверяет** → `checkChatLimit`
3. **Получается информация о лимитах** за сегодня (reset_date = TODAY)
4. **Если лимит не превышен** → обрабатывается запрос
5. **После успеха** → увеличивается счётчик `chat_requests_used`
6. **Каждый новый день** → автоматически создаётся новая запись

---

## 📋 Файлы проекта

**Backend:**
- `src/subscriptions.ts` - основная логика лимитов
- `src/server.ts` - интеграция middleware'ов
- `migrations/add_subscriptions.sql` - схема БД

**Frontend:**
- `app/billing.tsx` - обновлены тарифы (React Native)
- `types/subscriptions.ts` - типы и утилиты (новый файл)

**Документация:**
- `SUBSCRIPTION_SYSTEM.md` - полная документация
- `QUICK_START_SUBSCRIPTION.md` - этот файл

---

## 💡 Примеры кода

### Получить оставшиеся запросы
```typescript
import { getRemainingRequests } from '@/types/subscriptions';

const remaining = getRemainingRequests(limits, 'chat');
console.log(`Осталось: ${remaining} сообщений`);
```

### Показать сообщение об ошибке
```typescript
import { getLimitMessage } from '@/types/subscriptions';

if (isLimitReached(limits, 'voice')) {
  Alert.alert('Ограничение', getLimitMessage(limits, 'voice'));
}
```

### Проверить, доступна ли функция
```typescript
if (!limits.hasTTS) {
  // TTS недоступен - покажи кнопку "Upgrade"
  showUpgradeButton();
}
```

---

## ❓ FAQ

**Q: Когда сбрасываются лимиты?**
A: Каждый день в 00:00 UTC. Автоматически создаётся новая запись в `daily_limits`.

**Q: Что если подписка истекла?**
A: Пользователь автоматически переходит на Free тариф.

**Q: Как изменить лимиты?**
A: Отредактируйте строку в `subscription_tiers` таблице.

**Q: Если пользователь на Free с лимитом 1 голос в день, но я хочу ему дать 3?**
A: Обновите его на Plus или Pro подписку.

---

## 🐛 Отладка

**Проверить текущие лимиты пользователя:**
```sql
SELECT u.id, st.name, dl.reset_date, 
       dl.chat_requests_used, dl.voice_messages_used
FROM users u
LEFT JOIN subscription_tiers st ON u.subscription_tier_id = st.id
LEFT JOIN daily_limits dl ON u.id = dl.user_id AND dl.reset_date = CURRENT_DATE
WHERE u.id = 123;
```

**Сбросить лимиты пользователя вручную:**
```sql
DELETE FROM daily_limits 
WHERE user_id = 123 AND reset_date = CURRENT_DATE;
```

**Проверить, когда истекает подписка:**
```sql
SELECT id, subscription_expires_at 
FROM users 
WHERE subscription_tier_id IS NOT NULL;
```

---

## ✨ Что дальше

1. **Интегрировать платежи** - добавить обработку платежей через Stripe/YooKassa
2. **Admin panel** - создать панель управления подписками
3. **Email уведомления** - отправлять напоминания о пополнении лимитов
4. **Upgrade banners** - показывать предложения обновиться в приложении
5. **Trial период** - добавить бесплатный пробный период для Plus/Pro

---

**Готово к использованию! 🎉**

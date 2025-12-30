# 🚀 Ollama + Expo - Полная Интеграция

## ✅ ДА, Промпт Будет Работать!

Текущий setup **полностью совместим** с Ollama. Вот как:

```
Expo (мобильное приложение)
    ↓
silencexx/services/api.ts (вызывает /api/chat)
    ↓
backend/src/server.ts (express сервер)
    ↓
backend/src/ai.ts (Ollama API)
    ↓
Ollama (http://localhost:11434)
```

**Вся магия (промпт, система кризис-детектор и т.д.) находится в `backend/src/ai.ts` и работает как раньше!**

---

## 🎯 Архитектура

### Текущая Структура (Уже Работает!)

```typescript
// silencexx/services/api.ts
api.sendMessage(request) 
  → POST /api/chat
  → backend/src/server.ts
  → backend/src/ai.ts → generateAIResponse()
  → Ollama (localhost:11434)
  → Ответ идет обратно в приложение
```

### Что Вам Нужно

1. **Backend запущен** (npm run dev на порту 3000)
2. **Ollama запущен** (ollama serve на порту 11434)
3. **Expo приложение** (подключается к backend через api.ts)

---

## 🔧 Что Нужно Изменить в api.ts

Единственное - **IP адрес** для мобильного девайса.

### Текущий Код
```typescript
// silencexx/services/api.ts (строка ~35)
return 'http://192.168.100.120:3000/api';  // ← ЗАМЕНИТЕ НА ВАШЕ!
```

### Как Найти Ваш IP
```bash
# Windows
ipconfig  # Ищите IPv4 Address под вашей сетью

# macOS/Linux
ifconfig  # Ищите inet под en0 или eth0
```

### Пример
Если ваше на машине IP `192.168.1.100`, то:
```typescript
return 'http://192.168.1.100:3000/api';
```

**Это единственное, что нужно!** Все остальное работает как есть.

---

## 📱 Запуск в Expo

### Шаг 1: Запустить Backend
```bash
# Терминал 1 - Ollama
ollama serve

# Терминал 2 - Backend
cd backend
npm run dev
# Слушает на http://localhost:3000
```

### Шаг 2: Запустить Expo
```bash
# Терминал 3 - Frontend
cd silencexx
npm start
# или
npm run start
```

### Шаг 3: Запустить на Мобильном
- **iOS**: Нажмите `i` в терминале
- **Android**: Нажмите `a` в терминале
- **Web**: Нажмите `w` в терминале

---

## 🎓 Обучение Модели (Fine-tuning)

### Вариант 1: Использовать Другую Модель (Рекомендуется)

**Не нужно обучать!** Просто выберите лучшую модель:

```bash
# Для психологической поддержки:
ollama pull neural-chat      # Отлично для разговоров
ollama pull zephyr          # Умная и аккуратная

# Потом обновите в .env:
OLLAMA_MODEL=neural-chat
```

Модели уже обучены на нужных данных!

### Вариант 2: Fine-tuning Собственной Модели (Advanced)

Это требует:
1. Данных для обучения (диалоги, примеры)
2. Мощного ПК (16GB+ RAM, GPU рекомендуется)
3. Много времени (часы/дни обучения)

**Для MVP рекомендую вариант 1 + System Prompt в ai.ts**

---

## 💡 Система Промптов (Работает Отлично!)

Вся суть приложения - в **System Prompt** в `backend/src/ai.ts`:

```typescript
const SYSTEM_PROMPT = `Ты - CloudMind, сопереживающий AI ассистент...
• Всегда отвечай с эмпатией и теплотой
• Слушай активно и покажи, что ты понимаешь чувства пользователя
• Не диагностируй психические расстройства
• Рекомендуй профессиональную помощь при необходимости
[и т.д. - 50+ строк инструкций]
`;
```

### Как Адаптировать Под Свою Идею

**Отредактируйте промпт в `backend/src/ai.ts`:**

```typescript
const SYSTEM_PROMPT = `Ты - [ВАШ ПЕРСОНАЖ]

ТВОИ ПРИНЦИПЫ:
• [Принцип 1]
• [Принцип 2]
• [и т.д.]

ТОНУС И СТИЛЬ:
[Как должен общаться]

КОГДА [СИТУАЦИЯ]:
[Как реагировать]
`;
```

**Примеры:**

```typescript
// Вариант 1: Учитель
const SYSTEM_PROMPT = `Ты - умный учитель для школьников.
Твоя задача объяснять сложные темы простым языком...`;

// Вариант 2: Coach
const SYSTEM_PROMPT = `Ты - мотивирующий жизненный коуч.
Помогаешь людям достигать целей...`;

// Вариант 3: Assistant
const SYSTEM_PROMPT = `Ты - персональный помощник для ежедневных задач.
Помогаешь планировать день...`;
```

---

## 📨 Запросы Любой Длины

### ✅ ДА, РАБОТАЕТ!

Текущий код поддерживает запросы любой длины:

```typescript
// backend/src/ai.ts
const messages: MessageContent[] = [
  ...((context?.conversationHistory || []) as MessageContent[]),
  { role: 'user', content: enhancedMessage }  // ← Любой размер!
];
```

**Максимальный размер зависит от:**
1. **Модели** - mistral поддерживает до 32K токенов
2. **Памяти** - если запрос очень большой, может использовать RAM
3. **Timeout** - по умолчанию 60 секунд (можно увеличить)

### Примеры Больших Запросов

```typescript
// Запрос с полным контекстом (можно очень длинный)
const largeRequest = {
  message: "Вот весь контекст проекта: " + veryLongText, // 100KB+
  mood: "Focused",
  conversationHistory: historyWith100Messages // ← Работает!
};

await api.sendMessage(largeRequest);
```

---

## 🔄 Streaming для Больших Ответов (Optional)

Если хотите **потоковые ответы** (буква за буквой появляется):

### Вариант 1: Текущий (Полный ответ целиком)
```typescript
// backend/src/ai.ts
stream: false  // ← Текущее значение

// Expo ждет полный ответ, потом показывает
```

### Вариант 2: Streaming (По мере генерации)
```typescript
// backend/src/ai.ts
stream: true  // ← Включить streaming

// Нужно будет обновить Expo UI для обработки chunks
```

**Текущий вариант хорош для большинства случаев!**

---

## 📋 Тестирование

### Тест 1: Базовый Функционал

```bash
# 1. Запустить все три компонента
ollama serve           # Терминал 1
cd backend && npm run dev  # Терминал 2
cd silencexx && npm start  # Терминал 3

# 2. Проверить backend
curl http://localhost:3000/health
# Должно вернуть: {"status":"ok"}

# 3. Запустить Expo на устройстве/эмуляторе
# Должно подключиться и отправить сообщение
```

### Тест 2: Большой Запрос

```typescript
// В Expo приложении
const bigRequest = `
  Вот огромный текст...
  ${Array(1000).fill("текст").join(" ")}
`;

await api.sendMessage({
  message: bigRequest,
  mood: "Neutral",
  conversationHistory: []
});
```

### Тест 3: Долгая История

```typescript
// Тест с 50+ сообщениями в истории
const historyWith50 = Array(50).fill(null).map((_, i) => ({
  role: i % 2 === 0 ? 'user' : 'assistant',
  content: `Сообщение ${i}`
}));

await api.sendMessage({
  message: "Новое сообщение",
  conversationHistory: historyWith50
});
```

---

## 🐛 Решение Проблем

### Проблема: "Cannot Connect to localhost:3000"

**Решение:**
```typescript
// silencexx/services/api.ts
// Используйте правильный IP:
return 'http://192.168.X.X:3000/api';  // Замените X.X на ваш IP
```

### Проблема: "Ollama Connection Refused"

**Решение:**
```bash
# Убедитесь Ollama запущена
ollama serve

# Проверьте что работает
curl http://localhost:11434/api/tags
```

### Проблема: "Message Too Long"

**Решение:**
```typescript
// Увеличьте timeout в backend/src/ai.ts
const ollamaClient = axios.create({
  baseURL: config.ollamaUrl,
  timeout: 120000,  // 120 секунд вместо 60
});
```

---

## 🎯 Full Stack Flow

### Полный путь сообщения:

```
┌─ EXPO (silencexx)
│  └─ User typing message
│     ↓
│  ChatPage.tsx
│     ↓
│  api.sendMessage()
│     ↓
│  HTTP POST http://192.168.X.X:3000/api/chat
│     │
│     └─→ BACKEND (backend)
│        └─ server.ts receives request
│           ↓
│        ai.ts → generateAIResponse()
│           ↓
│        OLLAMA (localhost:11434)
│        └─ Ollama processes with SYSTEM_PROMPT
│           ↓
│        Returns response
│           ↓
└── EXPO
   └─ Shows response to user
      Saves to conversationHistory
      Updates mood/crisis status
```

---

## ✨ Ваше Приложение - Готово!

### Что уже работает:

✅ **Suanity Промпт** - полностью в `ai.ts`, адаптируется под вашу идею
✅ **Кризис-Детектор** - `detectCrisisKeywords()`
✅ **Анализ Настроения** - `analyzeMood()`
✅ **История Чатов** - сохраняется в БД
✅ **Голос** - интеграция с `VoiceService.ts`
✅ **Аутентификация** - JWT токены
✅ **Локальное AI** - полная приватность

### Что нужно сделать:

1. **Отредактировать IP в api.ts** ← 5 минут
2. **Адаптировать промпт в ai.ts** под свою идею ← 30 минут
3. **Запустить 3 терминала** ← 2 минуты

---

## 📚 Файлы для Изменения

| Файл | Зачем | Сложность |
|------|-------|-----------|
| `silencexx/services/api.ts` (строка 35) | Изменить IP | ⭐ Очень легко |
| `backend/src/ai.ts` (строка 8-60) | Адаптировать промпт | ⭐ Легко |
| `.env` | Выбрать модель | ⭐ Очень легко |

---

## 🚀 Quick Start (5 минут)

```bash
# 1. Изменить IP
# Откройте silencexx/services/api.ts
# Измените строку 35 на ваш IP

# 2. Адаптировать промпт
# Откройте backend/src/ai.ts
# Отредактируйте SYSTEM_PROMPT (строки 8-60)

# 3. Запустить
ollama serve                    # Терминал 1
cd backend && npm run dev       # Терминал 2
cd silencexx && npm start       # Терминал 3

# 4. Запустить на устройстве
# В Expo: нажмите i (iOS) или a (Android)
```

**Готово! 🎉**

---

## ❓ Ответы на Вопросы

**Q: Будет ли работать с большими запросами?**
A: Да! Поддерживает запросы до ~30K токенов (зависит от модели)

**Q: Нужно ли fine-tuning?**
A: Нет для MVP. System Prompt достаточно. Fine-tuning позже при необходимости.

**Q: Промпт из ai.ts работает на мобильном?**
A: Да! Он выполняется на backend, в Expo ничего не меняется.

**Q: Какая модель лучше?**
A: `neural-chat` или `mistral` - оба отлично работают для разговоров.

**Q: Суть приложения изменится?**
A: Нет! Все функции остаются: кризис-детектор, настроение, история, голос.

---

## 📞 Все Готово!

Ваше приложение **полностью совместимо** с Ollama.

**Нужно только:**
1. Изменить IP в api.ts
2. Адаптировать промпт в ai.ts
3. Запустить 3 компонента

**Начните прямо сейчас! 🚀**

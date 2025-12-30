# CloudMind Backend 🧠

AI-powered backend для CloudMind приложения на базе Ollama - локальной LLM платформы.

## 🚀 Технологии

- **Node.js** + **Express** - веб-сервер
- **TypeScript** - типизация
- **Ollama** - локальная LLM платформа (работает на вашем ПК)
- **Axios** - HTTP клиент для Ollama
- **PostgreSQL** - база данных
- **JWT** - аутентификация

## 🎯 Что такое Ollama?

Ollama позволяет запускать большие языковые модели (LLMs) прямо на вашем компьютере. Это означает:

✅ Полную приватность - ваши данные никуда не отправляются
✅ Бесплатное использование - нет счетов за API
✅ Полный контроль - выбирайте любую модель
✅ Работает офлайн - интернет нужен только для загрузки модели

## 📦 Быстрый Старт (5 минут)

### 1. Установить Ollama

- Скачайте с https://ollama.ai
- Установите для вашей ОС (Windows, Mac, Linux)

### 2. Загрузить Модель

```bash
ollama pull mistral
```

Доступные модели:
- `mistral` - быстро, хорошо (рекомендуется)
- `neural-chat` - отлично для разговоров
- `openchat` - очень быстро
- `zephyr` - умная, аккуратная

### 3. Запустить Ollama

```bash
ollama serve
```

Оставьте терминал открытым!

### 4. Запустить Backend

```bash
npm install
cp .env.example .env
npm run dev
```

Готово! 🎉

## ⚙️ Детальная Настройка

Смотрите подробные инструкции:
- [OLLAMA_QUICKSTART.md](./OLLAMA_QUICKSTART.md) - быстрый старт
- [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) - полная документация

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
PORT=3000
NODE_ENV=development
```

## 🔗 API Endpoints

### Основные роуты чата

```
POST /api/chat/send - Отправить сообщение AI
POST /api/chat/with-voice - Чат с голосом
GET /api/chats/list - Список чатов
GET /api/chats/:chatId/messages - Сообщения чата
```

### Аутентификация

```
POST /api/auth/register - Регистрация
POST /api/auth/login - Вход
POST /api/auth/verify-otp - Проверка OTP
POST /api/auth/logout - Выход
```

### Голос

```
POST /api/transcribe - Транскрипция аудио
POST /api/synthesize - Синтез речи
```

### Другое

```
GET /health - Проверка здоровья сервера
```

## 📝 Переменные Окружения

Обязательные:
```env
HTTPS_PROXY=http://username:password@proxy.example.com:8080
```

## 🏃 Запуск

**Development (с hot reload):**
```bash
npm run dev
```

**Production build:**
```bash
npm run build
npm start
```

## 📡 API Endpoints

### POST `/api/chat`

Отправка сообщения AI ассистенту.

**Request Body:**
```json
{
  "message": "Привет, как дела?"
}
```

**Response:**
```json
{
  "response": "Здравствуйте! Я CloudMind, ваш ИИ-помощник..."
}
```

**Errors:**
- `400` - Отсутствует сообщение
- `500` - Ошибка сервера

### GET `/api/health`

Проверка работоспособности сервера.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🛠️ Разработка

### Структура файлов

```
backend/
├── src/
│   ├── server.ts      # Express сервер, endpoints
│   ├── ai.ts          # Интеграция с Ollama AI
│   └── config.ts      # Конфигурация (env variables)
├── .env.example       # Шаблон переменных окружения
├── OLLAMA_SETUP.md    # Подробная документация Ollama
├── OLLAMA_QUICKSTART.md # Быстрый старт
├── package.json
└── tsconfig.json
```

### Тестирование

Доступны готовые тестовые скрипты:

```bash
# Простой тест API
node test-api.js

# Тест чата
node chat-test.js

# Тест ответов
node test-responses.js
```

## 🌐 Deployment

### Локальная сеть (для тестирования на физическом устройстве)

```bash
# Узнайте ваш IP
ipconfig  # Windows
ifconfig  # macOS/Linux

# Backend будет доступен на http://YOUR_IP:3000
```

### Ngrok (туннелирование)

Для тестирования на устройствах вне локальной сети:

```bash
# Установите ngrok
npm install -g ngrok

# Запустите туннель
ngrok http 3000

# Используйте выданный URL в frontend (silencexx/services/api.ts)
```

### Production

Для деплоя на сервер (Heroku, Railway, Render и т.д.):

1. Установите переменные окружения на платформе
2. Убедитесь, что `NODE_ENV=production`
3. Настройте CORS для вашего фронтенда
4. Обновите `BASE_URL` в `silencexx/services/api.ts`

## 🔐 Безопасность

- ⚠️ **Никогда** не коммитьте `.env` файл в git
- ✅ `.env.example` можно коммитить (без реальных ключей)
- ✅ Все sensitive данные только в переменных окружения
- ✅ CORS настроен для безопасного взаимодействия

## 📝 Environment Variables

| Переменная | Описание | Обязательно | По умолчанию |
|------------|----------|-------------|--------------|
| `OLLAMA_URL` | URL Ollama сервера | Нет | http://localhost:11434 |
| `OLLAMA_MODEL` | Модель для Ollama | Нет | mistral |
| `PORT` | Порт сервера | Нет | 3000 |
| `NODE_ENV` | Окружение (development/production) | Нет | development |
| `DB_HOST` | PostgreSQL хост | Нет | localhost |
| `DB_PORT` | PostgreSQL порт | Нет | 5432 |
| `DB_NAME` | Имя БД | Нет | cloudmind |
| `DB_USER` | Пользователь БД | Нет | postgres |
| `DB_PASSWORD` | Пароль БД | Нет | - |
| `JWT_SECRET` | Секрет для JWT токенов | Да | - |

## 🐛 Troubleshooting

**Ошибка "Connection refused to localhost:11434":**
- Убедитесь, что Ollama запущена: `ollama serve`
- Проверьте, что `OLLAMA_URL` верно указан в `.env`

**Ошибка "Model not found":**
- Выполните: `ollama pull mistral`
- Проверьте, что `OLLAMA_MODEL` совпадает с установленной моделью

**Ошибка "Network Error" во фронтенде:**
- Проверьте, что backend запущен (`npm run dev`)
- Проверьте URL в `silencexx/services/api.ts`
- Для физического устройства используйте ngrok или IP компьютера

**Ошибка "Cannot find module...":**
```bash
# Переустановите зависимости
rm -rf node_modules package-lock.json
npm install
```

## 📄 Лицензия

MIT


> **Node.js + TypeScript API для AI интеграции с Ollama**

## 🚀 Быстрый старт

### 1. Установить Ollama

- Скачайте с https://ollama.ai
- Выполните: `ollama pull mistral`
- Запустите: `ollama serve` (оставьте окно открытым)

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка переменных окружения
```bash
cp .env.example .env
```

Обновите `.env`:
```
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
PORT=3000
NODE_ENV=development
```

### 4. Запуск сервера

**Development режим (с автоперезагрузкой):**
```bash
npm run dev
```

Проверьте: http://localhost:3000/health

**Production:**
```bash
npm run build
npm start
```

## 📚 Документация

- [OLLAMA_QUICKSTART.md](./OLLAMA_QUICKSTART.md) - Быстрый старт за 5 минут
- [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) - Полная документация, оптимизация, GPU

## 📡 API Endpoints

### 1️⃣ Health Check
```
GET /health
```
Проверяет, что сервер работает.

**Ответ:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-07T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

### 2️⃣ Chat - Получить ответ AI
```
POST /api/chat
```

Отправляет сообщение пользователя в Ollama и получает эмпатичный ответ.

**Body:**
```json
{
  "message": "Я чувствую себя грустно",
  "mood": "Low",
  "previousMessages": [
    {
      "role": "user",
      "content": "Привет"
    },
    {
      "role": "assistant",
      "content": "Привет! Как дела?"
    }
  ]
}
```

**Параметры:**
- `message` (string) ✅ **Обязательно** - Сообщение пользователя
- `mood` (string) ❌ Опционально - Текущее настроение (Amazing, Good, Okay, Low, Stressed)
- `previousMessages` (array) ❌ Опционально - История чата для контекста

**Ответ:**
```json
{
  "success": true,
  "response": "Я слышу, что ты грустишь. Это естественное чувство...",
  "isCrisis": false,
  "mood": "Low"
}
```

**Пример cURL:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Мне очень тяжело",
    "mood": "Stressed"
  }'
```

---

### 3️⃣ Detect Crisis - Проверить кризис
```
POST /api/detect-crisis
```

Проверяет, содержит ли сообщение признаки кризисного состояния (суицидальные мысли).

**Body:**
```json
{
  "message": "Я хочу умереть"
}
```

**Параметры:**
- `message` (string) ✅ **Обязательно** - Текст для анализа

**Ответ:**
```json
{
  "success": true,
  "isCrisis": true,
  "helplines": [
    {
      "name": "Телефон доверия",
      "number": "8-800-2000-122",
      "country": "Россия"
    },
    {
      "name": "Ясное утро",
      "number": "8-800-100-49-94",
      "country": "Россия"
    }
  ]
}
```

**Пример cURL:**
```bash
curl -X POST http://localhost:3000/api/detect-crisis \
  -H "Content-Type: application/json" \
  -d '{"message": "Не хочу жить"}'
```

---

### 4️⃣ Analyze Mood - Анализ настроения
```
POST /api/analyze-mood
```

Анализирует текст и определяет эмоциональное состояние человека.

**Body:**
```json
{
  "text": "Я просто обалдел от счастья! Это лучший день в моей жизни!"
}
```

**Параметры:**
- `text` (string) ✅ **Обязательно** - Текст для анализа

**Ответ:**
```json
{
  "success": true,
  "detectedMood": "Amazing",
  "explanation": "Пользователь выражает энтузиазм и радость"
}
```

**Пример cURL:**
```bash
curl -X POST http://localhost:3000/api/analyze-mood \
  -H "Content-Type: application/json" \
  -d '{"text": "Мне так грустно"}'
```

---

### 5️⃣ Journal - Обработка записи в журнал
```
POST /api/journal
```

Обрабатывает запись в журнал с AI анализом и эмпатичным ответом.

**Body:**
```json
{
  "thoughts": "Сегодня я поняла, что нужно изменить свой подход к жизни. Я устала от постоянного стресса и хочу начать жить для себя."
}
```

**Параметры:**
- `thoughts` (string) ✅ **Обязательно** - Запись пользователя

**Ответ:**
```json
{
  "success": true,
  "aiResponse": "Это осознание - уже большой шаг. Принять себя и свои границы...",
  "isCrisis": false
}
```

**Пример cURL:**
```bash
curl -X POST http://localhost:3000/api/journal \
  -H "Content-Type: application/json" \
  -d '{"thoughts": "Я хочу начать новую жизнь"}'
```

---

## 🔧 Как работает внутри

### AI System Prompt
Сервер использует специальный system prompt для Ollama, который:
- ✅ Настраивает AI на эмпатичные ответы
- ✅ Определяет ключевые слова кризиса
- ✅ Рекомендует обращение к профессионалам
- ✅ Ограничивает размер ответа (100-200 слов)
- ✅ Поддерживает русский язык

### Обнаружение кризиса
Используется список ключевых слов:
- суицид, убить себя, не хочу жить
- умереть, нет смысла жить, лучше бы я умер
- порежу, режу себя, самоповреждение
- конец всему, покончить с собой, и др.

При обнаружении - автоматически предлагаются номера кризисной помощи.

### История чата
Можно передать `previousMessages` для сохранения контекста разговора:
```javascript
{
  "message": "А что ты об этом думаешь?",
  "previousMessages": [
    { "role": "user", "content": "У меня проблема с работой" },
    { "role": "assistant", "content": "Расскажи подробнее..." }
  ]
}
```

---

## 📋 Тестирование

### Тест 1: Health Check
```bash
curl http://localhost:3000/health
```

### Тест 2: Простой чат
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Привет!"}'
```

### Тест 3: Кризис
```bash
curl -X POST http://localhost:3000/api/detect-crisis \
  -H "Content-Type: application/json" \
  -d '{"message": "Мне не хочу жить"}'
```

### Тест 4: Анализ настроения
```bash
curl -X POST http://localhost:3000/api/analyze-mood \
  -H "Content-Type: application/json" \
  -d '{"text": "Я так счастлив!"}'
```

### Тест 5: Журнал
```bash
curl -X POST http://localhost:3000/api/journal \
  -H "Content-Type: application/json" \
  -d '{"thoughts": "Мои мысли и чувства..."}'
```

---

## ⚙️ Переменные окружения

| Переменная | Описание | Пример |
|-----------|---------|--------|
| `OLLAMA_URL` | URL Ollama сервера | `http://localhost:11434` |
| `OLLAMA_MODEL` | Модель для Ollama | `mistral` |
| `PORT` | Порт сервера | `3000` |
| `NODE_ENV` | Окружение | `development` \| `production` |

---

## 🐛 Решение проблем

### "Connection refused to localhost:11434"
```
❌ Ollama не запущена или недоступна
```
**Решение:** 
1. Убедитесь, что Ollama запущена: `ollama serve`
2. Проверьте URL в `.env`: `OLLAMA_URL=http://localhost:11434`

### "Cannot POST /api/chat"
**Решение:** Убедитесь, что:
1. Сервер запущен на правильном порте
2. URL правильный (без лишних слэшей)
3. Body в формате JSON

### "Model not found"
**Решение:**
1. Выполните: `ollama pull mistral`
2. Проверьте, что модель установлена: `ollama list`
3. Обновите `OLLAMA_MODEL` в `.env`

---

## 📦 Структура проекта

```
backend/
├── src/
│   ├── server.ts      # Express сервер и endpoints
│   ├── ai.ts          # Логика интеграции с Gemini
│   └── config.ts      # Конфигурация и переменные окружения
├── dist/              # Скомпилированный JavaScript
├── package.json       # Зависимости
├── tsconfig.json      # TypeScript конфиг
├── .env.example       # Пример переменных окружения
└── README.md          # Этот файл
```

---

## 🚀 Деплой

### Локально
```bash
npm run dev
```

### Docker
```bash
# Убедитесь, что Ollama запущена на хосте
# Или используйте Docker для Ollama

docker build -t cloudmind-backend .
docker run -p 3000:3000 -e OLLAMA_URL=http://host.docker.internal:11434 cloudmind-backend
```

### Heroku
```bash
git push heroku main
```

---

## 📝 Логирование

Сервер выводит логи с эмодзи для удобства:
- 📨 `Сообщение` - входящее сообщение пользователя
- 🤖 `AI ответ` - сгенерированный ответ
- 🆘 `КРИЗИС ОБНАРУЖЕН!` - кризисное состояние
- 🎭 `Анализ настроения` - анализ эмоций
- 📖 `Запись в журнал` - новая запись в журнал

Пример:
```
[2025-11-07T10:30:00.000Z] POST /api/chat
📨 Сообщение: Мне грустно...
🤖 AI ответ: Я слышу, что ты грустишь. Это...
```

---

## 💡 Примеры интеграции

### Использование с React Native
```javascript
// Отправить сообщение
const response = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userInput,
    mood: currentMood,
  }),
});

const data = await response.json();
console.log(data.response);
```

### Проверка кризиса
```javascript
const crisis = await fetch('http://localhost:3000/api/detect-crisis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMessage }),
});

const { isCrisis, helplines } = await crisis.json();
```

---

## 📞 Поддержка

Встроенные номера кризисной помощи:
- 🇷🇺 **Телефон доверия**: 8-800-2000-122
- 🇷🇺 **Ясное утро**: 8-800-100-49-94

---

## 📄 Лицензия

ISC

---

**Version 1.0.0** | November 2025 | ✅ Ready
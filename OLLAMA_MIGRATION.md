# Миграция на Ollama - Сводка Изменений

## ✅ Завершено

Проект полностью переделан на использование Ollama вместо Google Gemini API.

## 📋 Что изменилось

### 1. **AI Интеграция** (`backend/src/ai.ts`)
- ❌ Удалено: Google Generative AI (`@google/generative-ai`)
- ✅ Добавлено: Ollama HTTP API через Axios
- ✅ Добавлено: Проверка подключения к Ollama при запуске
- ✅ Сохранены: Все функции и логика (интерфейсы совместимы)

**Функции:**
- `generateAIResponse()` - теперь использует Ollama
- `analyzeMood()` - теперь использует Ollama
- `aiTranscribeVoice()` - теперь использует Ollama
- `detectCrisisKeywords()` - не изменилась

### 2. **Конфигурация** (`backend/src/config.ts`)
- ❌ Удалено: `GEMINI_API_KEY`
- ✅ Добавлено: `OLLAMA_URL` (default: http://localhost:11434)
- ✅ Добавлено: `OLLAMA_MODEL` (default: mistral)
- ✅ Валидация конфигурации при загрузке

### 3. **Dependencies** (`backend/package.json`)
- ❌ Удалено: `@google/generative-ai` (^0.17.1)
- ✅ Сохранено: Axios (уже был) для HTTP запросов
- ✅ Обновлено: Описание и keywords

### 4. **Server** (`backend/src/server.ts`)
- ❌ Удалено: Код настройки прокси для Gemini
- ✅ Сохранены: Все endpoints и маршруты
- ✅ Сохранены: Импорты и логика

### 5. **Документация**

#### Новые файлы:
- **`OLLAMA_QUICKSTART.md`** - Быстрый старт за 5 минут
- **`OLLAMA_SETUP.md`** - Полная документация (70+ строк)
- **`OLLAMA_MIGRATION.md`** - Этот файл

#### Обновленные файлы:
- **`README.md`** - Полностью переписана первая половина
- **`.env.example`** - Обновлены переменные

## 🚀 Быстрый Старт

### Для пользователей

1. **Установить Ollama**
   ```bash
   # Скачать с https://ollama.ai
   ```

2. **Загрузить модель**
   ```bash
   ollama pull mistral
   ```

3. **Запустить Ollama**
   ```bash
   ollama serve
   ```

4. **Запустить Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```

5. **Проверить**
   ```bash
   curl http://localhost:3000/health
   ```

### Для разработчиков

- Смотрите [OLLAMA_QUICKSTART.md](./backend/OLLAMA_QUICKSTART.md) для быстрого старта
- Смотрите [OLLAMA_SETUP.md](./backend/OLLAMA_SETUP.md) для полной документации
- Смотрите `backend/src/ai.ts` для примера использования API

## 📊 Сравнение: Gemini vs Ollama

| Параметр | Gemini API | Ollama |
|----------|-----------|--------|
| **Цена** | Платная (после бесплатного уровня) | Бесплатная |
| **Приватность** | Данные отправляются Google | Локально на вашем ПК |
| **Интернет** | Требуется для каждого запроса | Только для загрузки модели |
| **Модели** | Gemini, Gemini Pro | 50+ моделей (Mistral, Llama, etc) |
| **Скорость** | Зависит от интернета | Зависит от ПК |
| **Контроль** | Google ограничивает | Полный контроль |
| **Блокировки** | Может быть заблокирована в регионах | Нет |

## ⚙️ Переменные Окружения

**Старые (Gemini):**
```env
GEMINI_API_KEY=xxx
```

**Новые (Ollama):**
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

## 🔧 Технические Детали

### API Endpoint

**Старый (Gemini):**
```typescript
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({model: 'gemini-2.5-flash'});
const result = await model.generateContent(prompt);
```

**Новый (Ollama):**
```typescript
const response = await ollamaClient.post('/api/chat', {
  model: config.ollamaModel,
  messages: [...],
  stream: false,
});
```

### Структура Ответа

**Gemini:**
```typescript
result.response.text()
```

**Ollama:**
```typescript
result.data.message.content
```

## 📦 Установленные Модели

Рекомендуемые модели Ollama:

1. **mistral** (7B) - Быстро, хорошо - 🎯 Рекомендуется
   ```bash
   ollama pull mistral
   ```

2. **neural-chat** (7B) - Отлично для разговоров
   ```bash
   ollama pull neural-chat
   ```

3. **openchat** (3.5B) - Очень быстро
   ```bash
   ollama pull openchat
   ```

4. **zephyr** (7B) - Умная, аккуратная
   ```bash
   ollama pull zephyr
   ```

5. **llama2** (7B/13B) - Универсальная
   ```bash
   ollama pull llama2
   ```

## 🖥️ Требования к ПК

### Минимальные
- CPU: Dual-core
- RAM: 8GB
- Интернет: Только для загрузки модели

### Рекомендуемые
- CPU: Quad-core или лучше
- RAM: 16GB+
- GPU: NVIDIA (CUDA), AMD (ROCm), Apple Silicon (Metal)

## 🐛 Частые Вопросы

**Q: Как изменить модель?**
A: `ollama pull имя-модели` и обновите `OLLAMA_MODEL` в `.env`

**Q: Почему медленно?**
A: Используйте меньшую модель (`openchat`) или включите GPU

**Q: Как включить GPU?**
A: Ollama автоматически использует GPU если доступна. Для NVIDIA нужен CUDA.

**Q: Работает офлайн?**
A: Да, после загрузки модели работает полностью офлайн

**Q: Могу ли я использовать другой сервис?**
A: Да, отредактируйте `backend/src/ai.ts` для любого LLM API

## 📝 Замечания

- ✅ Все endpoints остались прежними
- ✅ Все функции работают как раньше
- ✅ Нет необходимости менять фронтенд
- ✅ Нет необходимости менять БД
- ✅ Нет необходимости менять мобильное приложение

## 🔐 Безопасность

- Нет отправки данных третьим сторонам
- Все обрабатывается локально
- JWT аутентификация сохранена
- CORS конфигурация сохранена

## 📚 Документация

- [OLLAMA_QUICKSTART.md](./backend/OLLAMA_QUICKSTART.md) - 5 минут до работы
- [OLLAMA_SETUP.md](./backend/OLLAMA_SETUP.md) - Полная техническая документация
- [backend/README.md](./backend/README.md) - Основная документация проекта
- https://ollama.ai - Официальный сайт Ollama

## ✨ Готово!

Ваш проект полностью настроен на Ollama и готов к использованию. 🚀

Запустите `ollama serve` и `npm run dev` и начните разговаривать с AI!

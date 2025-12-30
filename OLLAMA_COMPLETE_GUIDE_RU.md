# 🚀 CloudMind с Ollama - Полная Инструкция

## ✨ Что произошло?

Ваш проект полностью переделан с Google Gemini на **Ollama** - локальное AI, которое работает на вашем ПК без интернета и без платежей!

## 📋 Быстрый Чеклист (15 минут)

### Шаг 1: Установить Ollama (5 минут)

```bash
# Скачайте Ollama с https://ollama.ai для вашей ОС
# Установите обычно как приложение
# После установки Ollama будет доступна из командной строки
```

**Проверка установки:**
```bash
ollama --version
```

### Шаг 2: Загрузить Модель (2-5 минут, зависит от интернета)

```bash
ollama pull mistral
```

**Это скачает модель (~5GB). Можете выбрать меньшую:**
```bash
ollama pull openchat    # Меньше и быстрее (3.5GB)
ollama pull neural-chat # Лучше для чатов (4GB)
```

**Проверка модели:**
```bash
ollama list
```

### Шаг 3: Запустить Ollama (1-2 минуты)

```bash
ollama serve
```

✅ **Оставьте это окно открытым!** Это запускает AI сервер.

### Шаг 4: Запустить Backend (2 минуты)

**В НОВОМ терминале:**

```bash
cd backend
npm install  # Первый раз, затем не нужно
npm run dev
```

### Шаг 5: Проверить

```bash
curl http://localhost:3000/health
```

Должно вернуть:
```json
{"status":"ok","version":"1.0.0"}
```

✅ **Готово!**

---

## 📁 Что Изменилось в Проекте?

### Файлы, которые обновлены:

```
backend/
├── src/
│   ├── ai.ts                    # ✏️ Переписан для Ollama
│   ├── config.ts                # ✏️ Новые переменные
│   └── server.ts                # ✏️ Удален код про Gemini
├── package.json                 # ✏️ Удален Google Generative AI
├── .env.example                 # ✏️ Новые переменные
├── README.md                    # ✏️ Обновлена информация
├── OLLAMA_SETUP.md              # ✨ НОВЫЙ файл - полная документация
└── OLLAMA_QUICKSTART.md         # ✨ НОВЫЙ файл - быстрый старт
```

### Что НЕ изменилось:

- ✅ Все routes остались прежними
- ✅ База данных не изменилась
- ✅ Фронтенд не нужно менять
- ✅ Мобильное приложение работает как раньше

---

## 🎯 Что Такое Ollama?

**Ollama** = Большая языковая модель (LLM), запущенная **локально на вашем ПК**

### Преимущества:
- 🔒 **Приватность** - данные никуда не отправляются
- 💰 **Бесплатно** - нет никаких платежей
- ⚡ **Оффлайн** - работает без интернета (после загрузки)
- 🎛️ **Контроль** - выбирайте любую модель
- 🚫 **Без блокировок** - не зависит от геолокации

### Как это работает?

```
[Приложение] → [Localhost:11434] → [Ollama с моделью на вашем ПК]
```

Вот и всё! Прямая связь, никаких внешних сервисов.

---

## 🛠️ Конфигурация

### Файл `.env`

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

**Основные переменные:**

```env
# Ollama
OLLAMA_URL=http://localhost:11434      # Адрес Ollama (по умолчанию)
OLLAMA_MODEL=mistral                    # Модель (mistral, neural-chat, openchat...)

# Сервер
PORT=3000
NODE_ENV=development

# База данных (если используется)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cloudmind
DB_USER=postgres
DB_PASSWORD=your_password

# Аутентификация
JWT_SECRET=your_secret_key_here
```

---

## 🎯 Выбор Модели

### Рекомендуемые модели:

| Модель | Размер | Скорость | Качество | Команда |
|--------|--------|----------|----------|---------|
| **openchat** | 3.5B | ⚡⚡⚡ Очень быстро | 🎯 Хорошо | `ollama pull openchat` |
| **mistral** | 7B | ⚡⚡ Быстро | 🎯 Отлично | `ollama pull mistral` |
| **neural-chat** | 7B | ⚡⚡ Быстро | 🎯⭐ Лучше для чатов | `ollama pull neural-chat` |
| **zephyr** | 7B | ⚡ Нормально | 🎯⭐⭐ Умная | `ollama pull zephyr` |
| **llama2** | 13B | ⚡ Нормально | 🎯⭐⭐ Универсальная | `ollama pull llama2` |

**Какую выбрать?**
- 💻 Слабый ПК (8GB RAM) → `openchat`
- 🖥️ Средний ПК (16GB RAM) → `mistral` или `neural-chat`
- 🚀 Мощный ПК (32GB+ RAM) → `zephyr` или `llama2`

**Изменить модель:**

1. Загрузить: `ollama pull имя-модели`
2. Обновить `.env`: `OLLAMA_MODEL=имя-модели`
3. Перезагрузить backend

---

## ⚙️ Требования к ПК

### Минимум для работы:
- **ОС**: Windows 10+, macOS, Linux
- **CPU**: Dual-core (лучше quad-core)
- **RAM**: 8GB (для mistral)
- **Диск**: 10GB свободно

### Рекомендуется:
- **RAM**: 16GB+
- **GPU**: NVIDIA, AMD или Apple Silicon (намного быстрее)
- **Диск**: 20GB+ (для нескольких моделей)

### Первый запрос может быть медленным!
Ollama загружает модель в память - первый запрос может занять 10-30 секунд. Остальные быстрые.

---

## 🚀 Варианты Запуска

### 1️⃣ Локально на ПК (рекомендуется)

```bash
# Терминал 1 - Ollama
ollama serve

# Терминал 2 - Backend
cd backend && npm run dev

# Терминал 3 - Фронтенд (опционально)
cd silencexx && npm start
```

### 2️⃣ Docker (для продвинутых)

**Если у вас есть Docker:**

```bash
# Запустить Ollama в Docker
docker run -d -v ollama:/root/.ollama -p 11434:11434 ollama/ollama

# Загрузить модель
docker exec ollama ollama pull mistral

# Запустить backend
docker run -p 3000:3000 -e OLLAMA_URL=http://host.docker.internal:11434 cloudmind-backend
```

### 3️⃣ В облаке (advanced)

Если захотите запустить на сервере - используйте Docker образ Ollama.

---

## 🐛 Решение Проблем

### ❌ "Connection refused to localhost:11434"

**Проблема:** Ollama не запущена
**Решение:**
```bash
# Убедитесь, что запущено
ollama serve

# Проверьте в .env
OLLAMA_URL=http://localhost:11434
```

### ❌ "Model not found"

**Проблема:** Модель не загружена
**Решение:**
```bash
ollama pull mistral
ollama list  # Проверить что установлено
```

### ❌ Медленные ответы

**Проблема:** Модель слишком большая для вашего ПК
**Решение:**
- Используйте меньшую модель (`openchat`)
- Закройте другие приложения
- Если есть GPU - убедитесь что она используется

### ❌ "Out of memory"

**Проблема:** Не хватает ОЗУ
**Решение:**
- Используйте меньшую модель (3.5B вместо 7B)
- Увеличьте RAM компьютера
- Включите swap (виртуальную память)

### ❌ Backend не подключается к Ollama

**Проверка:**
```bash
# Убедитесь что Ollama работает
curl http://localhost:11434/api/tags

# Если не работает - проверьте:
# 1. Ollama запущена? (ollama serve)
# 2. Правильный port в .env?
# 3. Модель загружена? (ollama list)
```

---

## 📚 Документация

Подробная информация в файлах:

1. **[backend/OLLAMA_QUICKSTART.md](./backend/OLLAMA_QUICKSTART.md)**
   - Быстрый старт за 5 минут
   - Основные команды

2. **[backend/OLLAMA_SETUP.md](./backend/OLLAMA_SETUP.md)**
   - Полная техническая документация
   - Оптимизация производительности
   - Использование GPU
   - Тонкая настройка

3. **[OLLAMA_MIGRATION.md](./OLLAMA_MIGRATION.md)**
   - Что изменилось в проекте
   - Сравнение Gemini vs Ollama
   - Технические детали

4. **[backend/README.md](./backend/README.md)**
   - Основная документация API
   - Endpoints
   - Аутентификация

---

## 🎓 Дополнительно

### Все Модели Ollama

Полный список: https://ollama.ai/library

### GPU Ускорение

**NVIDIA (CUDA):**
```bash
# Убедитесь что у вас CUDA установлена
ollama serve  # Автоматически использует GPU
```

**AMD (ROCm):**
```bash
# Linux только
OLLAMA_CUDA_DRIVER=/path/to/amd ollama serve
```

**Apple Silicon (Metal):**
```bash
# Автоматически используется
ollama serve
```

### Тонкая Настройка AI

В `backend/src/ai.ts` можно изменять:

```typescript
options: {
  temperature: 0.7,    // 0=сосредоточенно, 1=творчество
  top_p: 0.95,        // 0-1, влияет на разнообразие
  top_k: 40,          // Количество вариантов для выбора
}
```

---

## 🎉 Готово!

Теперь у вас есть:
- ✅ AI на вашем ПК (без платежей, без интернета)
- ✅ Полная приватность данных
- ✅ Полный контроль над моделью
- ✅ Быстрые ответы (с GPU)

**Начните:**

```bash
ollama pull mistral
ollama serve          # Терминал 1
cd backend && npm run dev  # Терминал 2
```

**Вопросы?** Смотрите документацию выше или откройте GitHub Issues.

---

**Happy coding with Ollama! 🚀**

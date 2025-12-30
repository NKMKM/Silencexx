# ⚡ Ollama Quick Reference - Шпаргалка

## 🚀 Основные Команды

### Управление Моделями

```bash
# Загрузить модель
ollama pull mistral
ollama pull neural-chat
ollama pull openchat

# Список установленных
ollama list

# Удалить модель
ollama rm mistral

# Все модели
# https://ollama.ai/library
```

### Запуск Ollama

```bash
# Базовый запуск
ollama serve

# На другом порту
ollama serve --port 11435

# С переменными окружения
OLLAMA_NUM_GPU=1 ollama serve         # Использовать GPU
OLLAMA_NUM_CPU=4 ollama serve         # Использовать N ядер CPU
```

### Тестирование

```bash
# Проверить что Ollama работает
curl http://localhost:11434/api/tags

# Отправить сообщение
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "messages": [{"role": "user", "content": "Привет"}],
    "stream": false
  }'
```

---

## 🔧 Backend (Node.js)

### Установка и Запуск

```bash
cd backend

# Установить зависимости
npm install

# Скопировать конфиг
cp .env.example .env

# Development
npm run dev

# Production
npm run build
npm start

# Проверка здоровья
curl http://localhost:3000/health
```

### Конфигурация `.env`

```env
# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cloudmind
DB_USER=postgres
DB_PASSWORD=secret

# Auth
JWT_SECRET=super_secret_key
```

---

## 📱 Фронтенд (React Native/Expo)

```bash
cd silencexx

# Установить зависимости
npm install

# Запустить локально
npm start

# Для Android
npm run android

# Для iOS
npm run ios
```

---

## 🐳 Docker

### Ollama в Docker

```bash
# Запустить Ollama контейнер
docker run -d -v ollama:/root/.ollama -p 11434:11434 ollama/ollama

# Загрузить модель
docker exec ollama ollama pull mistral

# Проверить модели
docker exec ollama ollama list
```

### Backend в Docker

```bash
# Build образа
docker build -t cloudmind-backend backend/

# Запустить
docker run -p 3000:3000 \
  -e OLLAMA_URL=http://host.docker.internal:11434 \
  cloudmind-backend
```

---

## 🎯 Рекомендуемые Модели

```bash
# Быстро и хорошо (рекомендуется)
ollama pull mistral          # 7B, ~5GB

# Для чатов
ollama pull neural-chat      # 7B, ~4GB

# Очень быстро (если медленно)
ollama pull openchat         # 3.5B, ~2GB

# Умная и аккуратная
ollama pull zephyr          # 7B, ~4GB

# Универсальная
ollama pull llama2          # 7B, ~4GB (или 13B ~8GB)

# Creative
ollama pull dolphin-mixtral  # 46B, ~30GB (очень мощная)
```

---

## 📊 Требования к ПК

| Модель | RAM | Диск | Скорость |
|--------|-----|------|----------|
| openchat | 4GB | 4GB | ⚡⚡⚡ Очень быстро |
| mistral | 8GB | 5GB | ⚡⚡ Быстро |
| neural-chat | 8GB | 4GB | ⚡⚡ Быстро |
| zephyr | 8GB | 4GB | ⚡⚡ Быстро |
| llama2-7b | 8GB | 4GB | ⚡⚡ Быстро |
| llama2-13b | 16GB | 8GB | ⚡ Нормально |
| dolphin | 32GB+ | 30GB+ | ⚡ Медленно, но умно |

---

## 🔍 Отладка

### Проверка Подключения

```bash
# Ollama работает?
curl http://localhost:11434/api/tags

# Backend работает?
curl http://localhost:3000/health

# Модель загружена?
ollama list | grep mistral

# Логи Ollama
ollama serve  # будут выведены в терминал
```

### Найти Процесс

```bash
# Какой процесс использует порт 11434?
lsof -i :11434              # macOS/Linux
netstat -ano | findstr 11434 # Windows

# Какой процесс использует 3000?
lsof -i :3000               # macOS/Linux
netstat -ano | findstr 3000  # Windows
```

### Остановить Процесс

```bash
# Graceful shutdown
Ctrl+C в терминале Ollama

# Или убить процесс
kill -9 <PID>               # macOS/Linux
taskkill /PID <PID> /F      # Windows
```

---

## 🔧 Параметры AI

В `backend/src/ai.ts`:

```typescript
options: {
  temperature: 0.7,    // 0=сосредоточенно, 2=творческо
  top_p: 0.95,        // 0-1, разнообразие ответов
  top_k: 40,          // Кол-во вариантов для выбора
}
```

---

## 📚 Документация

```
Корневая папка (silence_xx/):
├── OLLAMA_COMPLETE_GUIDE_RU.md    ← НАЧНИТЕ ОТСЮДА (200+ строк)
├── OLLAMA_MIGRATION.md             ← Что изменилось
├── MIGRATION_STATUS.md             ← Статус проекта
└── README.md                       ← Основной README

Backend папка (backend/):
├── OLLAMA_QUICKSTART.md           ← 5 минут до работы
├── OLLAMA_SETUP.md                ← Полная техническая документация
└── README.md                      ← Backend документация
```

---

## 🎓 Полезные Ссылки

- **Ollama**: https://ollama.ai
- **Библиотека моделей**: https://ollama.ai/library
- **GitHub**: https://github.com/jmorganca/ollama
- **Документация API**: Смотрите в OLLAMA_SETUP.md

---

## ⚡ Быстрые Команды

```bash
# Все за раз (в разных терминалах)
# Терминал 1
ollama pull mistral && ollama serve

# Терминал 2
cd backend && npm install && npm run dev

# Терминал 3
curl http://localhost:3000/health
```

---

## 🆘 SOS

**Что-то не работает?**

```bash
# 1. Проверить Ollama
curl http://localhost:11434/api/tags

# 2. Проверить Backend
curl http://localhost:3000/health

# 3. Проверить логи
ollama serve      # смотрите вывод
npm run dev       # смотрите вывод

# 4. Перезагрузить всё
# Ctrl+C везде
# Заново запустить ollama serve, потом npm run dev
```

---

**Удачи! 🚀**

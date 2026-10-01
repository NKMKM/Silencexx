# CloudMind с Ollama - Быстрый Старт

## 🚀 За 5 минут до первого сообщения

### 1. Установка Ollama (2 минуты)

**Windows/Mac:**
- Скачайте с https://ollama.ai
- Установите обычно
- Откройте приложение

**Linux:**
```bash
curl https://ollama.ai/install.sh | sh
```

### 2. Загрузить Модель (1-2 минуты)

Откройте терминал и выполните:
```bash
ollama pull mistral
```

(Или `neural-chat` для лучших разговоров)

### 3. Запустить Ollama

```bash
ollama serve
```

Оставьте терминал открытым! ✅ Ollama готова

### 4. Запустить Бэкенд (1 минута)

В новом терминале, в папке `backend`:

```bash
# Первый раз
npm install
cp .env.example .env

# Отредактируйте .env если нужно (обычно не нужно)
# OLLAMA_URL=http://localhost:11434
# OLLAMA_MODEL=mistral

# Запуск
npm run dev
```

✅ Бэкенд готов на порту 3000!

## ✅ Проверка Работы

1. Ollama работает (терминал 1): `ollama serve`
2. Бэкенд работает (терминал 2): `npm run dev`
3. Откройте браузер: http://localhost:3000/health

Должно вернуть:
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

## 🎯 Популярные Модели

```bash
ollama pull mistral          # Быстро, хорошо (7B)
ollama pull neural-chat      # Отлично для чата (7B)
ollama pull openchat         # Очень быстро (3.5B)
ollama pull zephyr          # Умная (7B)
```

Выбрали модель? Обновите в `.env`:
```env
OLLAMA_MODEL=mistral
```

## 🔧 Если Что-то Не Работает

### Порт занят
```bash
ollama serve --port 11435
# Обновить .env: OLLAMA_URL=http://localhost:11435
```

### Модель не найдена
```bash
ollama list              # Смотреть что установлено
ollama pull mistral      # Загрузить модель
```

### Ollama не отвечает
```bash
# Проверить статус
curl http://localhost:11434/api/tags

# Перезагрузить
# Закройте терминал с ollama serve и запустите заново
```

### Много памяти используется
- Используйте меньшую модель: `openchat` вместо `mistral`
- Или включите GPU в Ollama

## 📱 Запуск Фронтенда

В папке `silencexx`:
```bash
npm install
npm start
```

Приложение готово к использованию!

## 🎛️ Управление Моделями

```bash
# Смотреть установленные
ollama list

# Загрузить новую
ollama pull имя-модели

# Удалить модель
ollama rm имя-модели

# Все модели: https://ollama.ai/library
```

## ⚡ Оптимизация Скорости

**Хотите быстрее?**
1. Используйте `openchat` вместо `mistral`
2. Включите GPU (в настройках Ollama)
3. Закройте другие приложения

**Хотите умнее?**
1. Используйте `zephyr` или `dolphin-mixtral`
2. Может быть медленнее, но качество выше

---

**Готово!** Теперь можете начать разговаривать с AI! 🤖

Подробнее см. [OLLAMA_SETUP.md](./OLLAMA_SETUP.md)

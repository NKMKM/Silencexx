# 🔐 Ngrok + Expo Tunnel Setup

## Ваша Текущая Конфигурация

```
┌─ Expo (Tunnel)         📱
│  └─ npx expo start --tunnel
│
├─ Backend               🖥️
│  └─ npm run dev (порт 3000)
│
└─ Ngrok                 🌐
   └─ ngrok http 3000
      ↓
   Exposes backend to internet
   (для доступа из Expo Tunnel)
```

---

## ⚙️ Как Использовать

### Шаг 1: Запустить Backend

```bash
cd backend
npm run dev
# Слушает на http://localhost:3000
```

### Шаг 2: Запустить Ngrok

```bash
ngrok http 3000
```

**⚠️ ВАЖНО!** Скопируйте URL из консоли ngrok:

```
Session Status                online
Forwarding    https://abcd1234-5678-90ef.ngrok-free.app -> http://localhost:3000
                                    ↑↑↑ СКОПИРУЙТЕ ЭТО ↑↑↑
```

### Шаг 3: Обновить `ngrok-url.json`

Отредактируйте файл `silencexx/ngrok-url.json`:

```json
{
  "url": "https://abcd1234-5678-90ef.ngrok-free.app",
  "apiUrl": "https://abcd1234-5678-90ef.ngrok-free.app/api",
  "timestamp": "2025-12-23T00:00:00.000Z"
}
```

**Замените `abcd1234-5678-90ef.ngrok-free.app` на ВАШ URL из ngrok!**

### Шаг 4: Запустить Expo с Туннелем

```bash
cd silencexx
npx expo start --tunnel
```

---

## 🔄 Как Это Работает

```typescript
// silencexx/services/api.ts

// 1. Приложение загружает ngrok-url.json
const ngrokConfig = require('../ngrok-url.json');
// Получает: { apiUrl: "https://abcd...ngrok-free.app/api" }

// 2. Если ngrok URL есть, используем его
if (ngrokConfig.apiUrl && ngrokConfig.apiUrl !== 'http://localhost:3000/api') {
  return ngrokConfig.apiUrl;  // ← Используем ngrok!
}

// 3. Запрос идет через ngrok -> backend -> Ollama
// Expo (Tunnel) → Ngrok URL → Backend (localhost:3000) → Ollama
```

---

## 🚀 Полный Flow

```
┌────────────────────────────────────────┐
│ 1. Запустить Backend                   │
│    cd backend && npm run dev            │
│    ✅ Слушает на localhost:3000         │
└────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────┐
│ 2. Запустить Ngrok                     │
│    ngrok http 3000                     │
│    📋 Скопировать URL!                 │
└────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────┐
│ 3. Обновить ngrok-url.json             │
│    "apiUrl": "https://your-url/api"    │
│    ✅ Готово!                          │
└────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────┐
│ 4. Запустить Expo Tunnel               │
│    npx expo start --tunnel             │
│    ✅ Готово к тестированию!           │
└────────────────────────────────────────┘
          ↓
       Мобильное приложение
       подключается через:
       Expo Tunnel → Ngrok → Backend
```

---

## 📱 Тестирование

### Тест 1: Backend Доступен

```bash
# Проверить что backend работает
curl http://localhost:3000/health
# Должно вернуть: {"status":"ok"}
```

### Тест 2: Ngrok Работает

```bash
# В другом терминале проверить ngrok URL
curl https://your-ngrok-url.ngrok-free.app/health
# Должно вернуть то же самое
```

### Тест 3: В Приложении

1. Откройте приложение через Expo
2. Отправьте сообщение
3. Проверьте консоль:
   ```
   🌐 Using ngrok URL from config
   🔌 API URL: https://your-ngrok-url.ngrok-free.app/api
   ```

---

## ⚠️ Важные Моменты

### Каждый Раз Новый URL!

```bash
$ ngrok http 3000
# Сеанс 1: https://abc123.ngrok-free.app
# (через час ngrok закроет туннель)

$ ngrok http 3000
# Сеанс 2: https://xyz789.ngrok-free.app ← НОВЫЙ URL!
```

**Решение:** Обновите `ngrok-url.json` с новым URL.

### Автоматическое Обновление (Optional)

Если хотите автоматическое обновление, установите ngrok auth:

```bash
# 1. Создайте аккаунт на ngrok.com
# 2. Скопируйте auth token
ngrok config add-authtoken YOUR_TOKEN

# 3. Используйте reserved domain (платно) или reserved tcp (бесплатно)
ngrok http 3000 --domain=your-static-domain.ngrok.io
```

Тогда URL будет одинаковым!

---

## 🔐 Безопасность

### ⚠️ Важно!

```
❌ НЕ публикуйте ngrok-url.json в Git!
✅ Добавьте в .gitignore:

   ngrok-url.json
   .env
```

Потому что он содержит публичный URL вашего backend!

---

## 🐛 Решение Проблем

### Проблема: "Cannot Connect to Ngrok URL"

```
Возможные причины:
1. ❌ URL в ngrok-url.json неправильный
2. ❌ Backend не запущен (npm run dev)
3. ❌ Ngrok закрыл туннель (истекло время)

Решение:
✅ Проверьте URL в консоли ngrok
✅ Обновите ngrok-url.json
✅ Перезапустите ngrok
```

### Проблема: "Invalid URL Format"

```
❌ Неправильно:
  "apiUrl": "https://abc123.ngrok-free.app"
  
✅ Правильно:
  "apiUrl": "https://abc123.ngrok-free.app/api"
                                        ^^^^
```

### Проблема: "Ngrok Says Too Many Connections"

```
Решение:
1. Закройте все старые сеансы в Expo
2. Перезапустите ngrok
3. Обновите URL в ngrok-url.json
```

---

## 📋 Чек-лист Запуска

```
┌─ Перед Запуском
│  ☐ Backend установлен (npm install)
│  ☐ .env файл с Ollama переменными
│  ☐ Ollama установлена и готова
│
├─ Запуск
│  ☐ Терминал 1: ollama serve
│  ☐ Терминал 2: cd backend && npm run dev
│  ☐ Терминал 3: ngrok http 3000
│  ☐ Скопировать ngrok URL
│  ☐ Обновить ngrok-url.json
│  ☐ Терминал 4: cd silencexx && npx expo start --tunnel
│
└─ Тестирование
   ☐ Приложение запустилось
   ☐ Консоль показывает "Using ngrok URL"
   ☐ Сообщение отправляется и приходит ответ
```

---

## 🎯 Быстрый Старт

```bash
# Терминал 1
ollama serve

# Терминал 2
cd backend && npm run dev

# Терминал 3
ngrok http 3000
# 👀 Скопируйте URL из вывода!

# Обновите ngrok-url.json
# "apiUrl": "https://ваш-скопированный-url/api"

# Терминал 4
cd silencexx && npx expo start --tunnel
```

**Готово! 🚀**

---

## 💡 Совет

Если часто обновляется ngrok URL, создайте скрипт для автоматизации:

```javascript
// update-ngrok.js
const fs = require('fs');
const axios = require('axios');

// Получить URL из ngrok API
const updateNgrokUrl = async () => {
  try {
    const response = await axios.get('http://localhost:4040/api/tunnels');
    const url = response.data.tunnels[0].public_url;
    
    fs.writeFileSync('silencexx/ngrok-url.json', JSON.stringify({
      url: url,
      apiUrl: url + '/api',
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log('✅ Updated ngrok URL:', url);
  } catch (error) {
    console.error('❌ Failed to update:', error.message);
  }
};

updateNgrokUrl();
```

Запустить:
```bash
node update-ngrok.js
```

Или добавить в npm scripts:
```json
{
  "scripts": {
    "update-ngrok": "node update-ngrok.js"
  }
}
```

---

**Все готово! Ваша система работает через Expo Tunnel + Ngrok! 🎉**

# SilenceXX 🆘❤️

**Complete Mental Health Platform with Emergency Support**

SilenceXX is a production-ready React Native (Expo) application for mental health support featuring an AI assistant, emergency panic button, subscription system, and voice messages.

## ✨ Features (All Implemented ✅)

### Mental Health Support
- ✅ **AI Chat Assistant** - Compassionate responses using local Ollama model
- ✅ **Emergency Panic Button** - 10-step guided anxiety management
- ✅ **Journal System** - Daily mood tracking and reflection
- ✅ **Daily Tasks** - Motivation and progress tracking

### Monetization
- ✅ **Subscription Tiers** - Free, Plus, Pro with different limits
- ✅ **Payment Processing** - Demo system ready for Stripe/YooKasha
- ✅ **Limit Enforcement** - Daily limits per subscription tier
- ✅ **Upgrade Prompts** - Smart upgrade suggestions

### Performance & Scale
- ✅ **Concurrent AI Processing** - 5 simultaneous users with Bull queue
- ✅ **Response Caching** - 1-hour TTL for instant responses
- ✅ **Optimized Chat** - FlatList with smooth scrolling
- ✅ **Voice Messages** - High-quality audio recording & playback

### User Experience
- ✅ **Dark/Light Themes** - System-aware theme switching
- ✅ **Design System** - Consistent colors, spacing, typography
- ✅ **Animations** - Smooth transitions with Reanimated
- ✅ **Profile Management** - Real subscription data display

## 📊 Project Structure

```
silence_xx/
├── backend/                    # Node.js + Express
│   ├── src/
│   │   ├── aiQueue.ts         # ✅ Concurrent AI processing
│   │   ├── cache.ts           # ✅ Response caching
│   │   ├── messages.ts        # ✅ Message validation & routing
│   │   ├── payments.ts        # ✅ Subscription payments
│   │   ├── panicMode.ts       # ✅ Emergency support
│   │   ├── ai.ts              # AI integration with Ollama
│   │   ├── auth.ts            # Authentication
│   │   ├── chat.ts            # Chat management
│   │   ├── subscriptions.ts   # Subscription logic
│   │   └── server.ts          # Express server (27 API endpoints)
│   └── migrations/
│       ├── add_payment_transactions.sql     # ✅ Payment tracking
│       └── add_panic_mode.sql               # ✅ Panic sessions
│
├── silencexx/                  # React Native + Expo
│   ├── app/                    # Screens (file-based routing)
│   ├── components/
│   │   ├── ChatPage.tsx                # ✅ With limit checks
│   │   ├── AccountSettings.tsx         # ✅ Real subscription data
│   │   ├── PanicModeScreen.tsx         # ✅ 10-step guided flow
│   │   ├── VoiceRecorder.tsx           # ✅ Audio recording
│   │   └── VoiceMessage.tsx            # ✅ Audio playback
│   ├── hooks/
│   │   └── useSubscriptionLimits.ts    # ✅ Limit management
│   ├── utils/
│   │   └── designSystem.ts             # ✅ Global design tokens
│   └── services/                       # API integration
│
└── docs/
    ├── FINAL_IMPLEMENTATION_REPORT.md  # ✅ Complete breakdown
    ├── QUICK_START.md                  # ✅ Testing guide
    ├── IMPLEMENTATION_GUIDE.md         # ✅ Dev reference
    └── FILES_SUMMARY.md                # ✅ This file
```

## 🚀 Deployment (5 minutes)

### 1. Start Redis
```bash
docker run -d -p 6379:6379 redis:latest

npm install
```

### Настройка Backend

1. Создайте файл `.env` в папке `backend`:

```bash
cp .env.example .env
```

2. Добавьте ваш Gemini API ключ в `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
NODE_ENV=development
```

### Запуск приложения

**Терминал 1 - Backend:**
```bash
cd backend
npm run dev
```

**Терминал 2 - Frontend:**
```bash
cd silencexx
npx expo start
```

Затем:
- Нажмите `a` для Android эмулятора
- Нажмите `i` для iOS симулятора
- Сканируйте QR код в Expo Go на физическом устройстве

### Настройка API URL

В файле `silencexx/services/api.ts`:

- **Для локальной разработки**: используйте `http://localhost:3000/api` (эмулятор) или IP вашего компьютера
- **Для физического устройства**: используйте ngrok или IP в локальной сети
- **Для продакшена**: замените на ваш production API URL

## 🛠️ Технологии

### Frontend
- **React Native** - кроссплатформенная разработка
- **Expo SDK 54** - инструменты и библиотеки
- **TypeScript** - типизация
- **React Native Reanimated** - анимации
- **Expo Router** - навигация (file-based)
- **Axios** - HTTP клиент

### Backend
- **Node.js** + **Express** - сервер
- **TypeScript** - типизация
- **Google Generative AI (Gemini)** - AI модель
- **dotenv** - управление переменными окружения
- **ts-node** - выполнение TypeScript

## 📁 Основные файлы

- `silencexx/app/(tabs)/_layout.tsx` - Конфигурация нижней навигации
- `silencexx/components/ChatPage.tsx` - Главный экран чата с AI
- `silencexx/app/(tabs)/calendar.tsx` - Календарь и дневник мыслей
- `silencexx/services/api.ts` - API клиент для backend
- `backend/src/server.ts` - Express сервер
- `backend/src/ai.ts` - Интеграция с Gemini AI

## 🎨 Темы и стили

Приложение поддерживает светлую и темную темы с автоматическим переключением. Основные цвета:

- **Primary**: Purple/Violet градиенты (#8b5cf6, #a78bfa)
- **Accent**: Blue (#3b82f6)
- **Background Dark**: Deep blue/purple (#0f172a, #1e1b4b)
- **Background Light**: Soft purple/pink (#e0e7ff, #ddd6fe)

## 🔐 Безопасность

- Все API ключи хранятся в `.env` файлах (не коммитятся в git)
- Backend использует переменные окружения
- CORS настроен для безопасного взаимодействия

## 📝 TODO

- [ ] Интеграция с реальной базой данных (PostgreSQL/MongoDB)
- [ ] Аутентификация пользователей (Firebase/Supabase)
- [ ] Push уведомления
- [ ] Экспорт данных дневника
- [ ] Статистика и аналитика настроения
- [ ] Многоязычность (i18n)

## 🤝 Вклад в проект

Pull requests приветствуются! Для крупных изменений сначала откройте issue для обсуждения.

## 📄 Лицензия

MIT

## 👨‍💻 Автор

Разработано с ❤️ для поддержки ментального здоровья

---

**Важно**: Это приложение не заменяет профессиональную медицинскую помощь. При серьезных проблемах обращайтесь к специалистам.

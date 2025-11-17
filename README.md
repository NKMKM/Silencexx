# CloudMind 🧠☁️

CloudMind - это мобильное приложение для поддержки ментального здоровья, разработанное на React Native (Expo) с AI-ассистентом на базе Google Gemini.

## 📱 Возможности

- **AI Чат-ассистент**: Умный помощник для поддержки ментального здоровья с использованием Google Gemini API
- **Дневник мыслей**: Ведение записей с календарем и отслеживанием настроения
- **Темная тема**: Автоматическое переключение между светлой и темной темами
- **Адаптивный дизайн**: Полная поддержка iOS и Android с учетом safe areas
- **Анимации**: Плавные переходы и анимированные элементы UI
- **Управление устройствами**: Просмотр всех устройств, привязанных к аккаунту
- **Голосовой ввод**: Поддержка голосового взаимодействия с AI

## 🏗️ Структура проекта

```
silence_xx/
├── silencexx/          # Frontend (React Native + Expo)
│   ├── app/            # Экраны приложения (file-based routing)
│   ├── components/     # Переиспользуемые компоненты
│   ├── services/       # API клиенты и сервисы
│   ├── utils/          # Утилиты и хелперы
│   └── constants/      # Константы и темы
├── backend/            # Backend (Node.js + Express + Gemini AI)
│   └── src/            # Исходный код сервера
└── figma/              # Figma компоненты (deprecated)
```

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- npm или yarn
- Expo CLI
- Android Studio / Xcode (для эмуляторов)
- Google Gemini API ключ

### Установка Frontend

```bash
cd silencexx
npm install
```

### Установка Backend

```bash
cd backend
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

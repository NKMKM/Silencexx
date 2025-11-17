# CloudMind Mobile App 📱

Frontend приложение CloudMind на React Native (Expo) - ваш AI-помощник для ментального здоровья.

## 🚀 Технологии

- **React Native** - кроссплатформенная разработка
- **Expo SDK 54** - инструменты и библиотеки  
- **TypeScript** - типизация
- **Expo Router** - файловая навигация
- **React Native Reanimated** - анимации
- **Axios** - HTTP клиент для API

## 📦 Установка

```bash
npm install
```

## ⚙️ Настройка

### API Configuration

Откройте файл `services/api.ts` и настройте URL backend сервера:

**Для локальной разработки (эмулятор):**
```typescript
return 'http://localhost:3000/api';
```

**Для физического устройства:**
```typescript
// Используйте IP вашего компьютера в локальной сети
return 'http://192.168.1.XXX:3000/api';

// ИЛИ используйте ngrok
return 'https://your-ngrok-url.ngrok-free.app/api';
```

**Для production:**
```typescript
return 'https://your-production-api.com/api';
```

## 🏃 Запуск

```bash
npx expo start
```

Затем:
- Нажмите `a` для Android эмулятора
- Нажмите `i` для iOS симулятора  
- Сканируйте QR код в Expo Go на физическом устройстве

## 📱 Основные экраны

- **Чат** (`app/(tabs)/index.tsx`) - AI-ассистент CloudMind
- **Календарь** (`app/(tabs)/calendar.tsx`) - Дневник мыслей и трекинг настроения
- **Настройки** (`app/(tabs)/settings.tsx`) - Настройки приложения, тема, устройства

## 🎨 Кастомизация темы

Тема настраивается в `constants/theme.ts`. Приложение поддерживает автоматическое переключение между светлой и темной темами.

## 🛠️ Разработка

### Структура папок

```
silencexx/
├── app/                    # Экраны (file-based routing)
│   ├── (tabs)/             # Табы навигации
│   ├── login.tsx           # Авторизация
│   ├── register.tsx        # Регистрация
│   └── devices.tsx         # Управление устройствами
├── components/             # React компоненты
│   ├── ChatPage.tsx        # Главный чат
│   ├── MoodTracker.tsx     # Трекер настроения
│   └── ui/                 # UI компоненты
├── services/              
│   └── api.ts              # API клиент
├── utils/
│   ├── aiResponses.ts      # Типы AI ответов
│   └── ThemeContext.tsx    # Контекст темы
└── constants/
    └── theme.ts            # Конфигурация темы
```

### Добавление нового экрана

Создайте файл в папке `app/`:

```typescript
// app/new-screen.tsx
export default function NewScreen() {
  return <View>...</View>;
}
```

Навигация:
```typescript
import { router } from 'expo-router';
router.push('/new-screen');
```

## 🌐 Backend

Для работы приложения требуется запущенный backend сервер. См. `../backend/README.md` для инструкций по настройке.

## 🐛 Troubleshooting

**Ошибка "Network Error" при отправке сообщений:**
1. Убедитесь, что backend запущен
2. Проверьте URL в `services/api.ts`
3. Для физического устройства используйте IP или ngrok

**Белый/черный экран при запуске:**
1. Очистите кеш: `npx expo start -c`
2. Переустановите зависимости:
   ```bash
   rm -rf node_modules
   npm install
   ```

**Ошибки TypeScript:**
```bash
npx expo start --clear
```

## 📄 Лицензия

MIT


This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

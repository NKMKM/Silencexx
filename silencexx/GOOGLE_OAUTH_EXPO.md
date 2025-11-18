# Google OAuth Setup для Expo

## ✅ Изменения

### Удалено:
- ❌ `@react-native-google-signin/google-signin` (требует native build)

### Установлено:
- ✅ `expo-auth-session` - OAuth через WebBrowser
- ✅ `expo-crypto` - Генерация кодов
- ✅ `expo-web-browser` - OAuth popup

---

## 🔧 Настройка Google Cloud Console

### 1. Создайте проект

1. Перейдите: https://console.cloud.google.com
2. **New Project** → Введите название → **Create**

### 2. OAuth Consent Screen

1. **APIs & Services** → **OAuth consent screen**
2. User Type: **External** → **Create**
3. Заполните:
   - App name: `SilenceXX`
   - User support email: ваш email
   - Developer contact: ваш email
4. **Save and Continue**
5. Scopes: пропустите → **Save and Continue**
6. Test users: можете добавить тестовые emails → **Save and Continue**

### 3. Создайте Credentials

#### Для Web (обязательно!)

1. **Credentials** → **Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `Web Client`
4. Authorized JavaScript origins:
   - `http://localhost`
   - `https://auth.expo.io`
5. Authorized redirect URIs:
   - `https://auth.expo.io/@your-username/silencexx`
   - `http://localhost`
6. **Create**
7. **Скопируйте Client ID** (формат: `xxx.apps.googleusercontent.com`)

#### Для Android (опционально)

1. **Create Credentials** → **OAuth client ID**
2. Application type: **Android**
3. Name: `Android Client`
4. Package name: `com.anonymous.silencexx` (из app.json)
5. SHA-1: получите командой:
   ```bash
   # Windows
   keytool -keystore %USERPROFILE%\.android\debug.keystore -list -v -alias androiddebugkey -storepass android -keypass android
   
   # Mac/Linux
   keytool -keystore ~/.android/debug.keystore -list -v
   ```
   Пароль: `android`
6. Скопируйте SHA1 (например: `A1:B2:C3:...`)
7. **Create**

#### Для iOS (опционально)

1. **Create Credentials** → **OAuth client ID**
2. Application type: **iOS**
3. Name: `iOS Client`
4. Bundle ID: `com.anonymous.silencexx` (из app.json)
5. **Create**

---

## 📝 Обновите `services/oauth.ts`

Замените Client IDs:

```typescript
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com'; // или тот же Web Client ID
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com'; // или тот же Web Client ID
```

**Важно:** Если у вас только Web Client ID - используйте его для всех платформ!

---

## 🚀 Тестирование

### 1. Запустите Backend

```bash
cd backend
npm run dev
```

Проверьте вывод:
```
✓ POST /api/auth/oauth/google
✓ POST /api/auth/oauth/apple
```

### 2. Запустите Expo

```bash
cd silencexx
npx expo start
```

### 3. Тест в Expo Go

1. Откройте приложение в Expo Go
2. Перейдите на Login screen
3. Нажмите кнопку **Google**
4. Должен открыться браузер с Google Sign-In
5. Выберите аккаунт
6. Разрешите доступ
7. Автоматический редирект в приложение

**Debug:**
- В консоли Metro: логи `handleGoogleResponse`
- В консоли Backend: `✅ Новый пользователь через Google: email@example.com`

---

## 🔍 Troubleshooting

### Ошибка: "Invalid OAuth client"
- Проверьте, что `GOOGLE_WEB_CLIENT_ID` правильный
- Убедитесь, что добавили `https://auth.expo.io` в Authorized redirect URIs

### Ошибка: "redirect_uri_mismatch"
- В Google Cloud Console → Credentials → Web Client
- Добавьте: `https://auth.expo.io/@your-expo-username/silencexx`
- Или используйте `exp://` схему для локальной разработки

### Ошибка: "Access blocked"
- OAuth Consent Screen должен быть в режиме Testing или Published
- Добавьте ваш email в Test users (если в Testing mode)

### Не открывается браузер
- Убедитесь, что `expo-web-browser` установлен
- Проверьте, что в `app.json` есть плагин:
  ```json
  "plugins": ["expo-web-browser"]
  ```

---

## 📱 Схема работы

```
1. User нажимает "Sign in with Google"
   ↓
2. useGoogleAuth() вызывает promptAsync()
   ↓
3. Открывается WebBrowser с Google OAuth
   ↓
4. User выбирает аккаунт Google
   ↓
5. Google редиректит с idToken в URL
   ↓
6. expo-auth-session перехватывает редирект
   ↓
7. useEffect ловит response
   ↓
8. handleGoogleResponse() обрабатывает токен
   ↓
9. Запрос к Google API для userInfo
   ↓
10. Отправка idToken + userInfo на backend
    ↓
11. Backend создает/находит юзера в БД
    ↓
12. Backend возвращает JWT token
    ↓
13. Сохранение в AsyncStorage
    ↓
14. onLogin() - переход в приложение
```

---

## 🍎 Apple Sign-In

Для Apple Sign-In нужен:
- Физическое iOS устройство (iOS 13+)
- Apple Developer Account ($99/год)
- Настроенный Bundle ID с включенным Sign In with Apple

**Development режим:**
Apple Sign-In работает только после build (`eas build`) или `expo prebuild`.

---

## 🔒 Production Checklist

- [ ] Используйте реальные Client IDs (не тестовые)
- [ ] OAuth Consent Screen в режиме **Published** (после ревью Google)
- [ ] Добавьте production домен в Authorized origins
- [ ] Используйте HTTPS для backend
- [ ] Добавьте верификацию Google ID Token на backend:
  ```bash
  npm install google-auth-library
  ```
  ```typescript
  import { OAuth2Client } from 'google-auth-library';
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  ```

---

## ✨ Готово!

Теперь Google OAuth работает через Expo Go без необходимости native build!

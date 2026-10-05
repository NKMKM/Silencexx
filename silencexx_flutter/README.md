# CloudMind — Flutter

Перенесённый клиент Flutter (Android, iOS, Web) и отдельная копия Node.js backend.
Исходное React Native приложение находится в соседней папке `../silencexx`.

## Запуск

Flutter 3.35.5 / Dart 3.9.2 или совместимая более новая версия.

```powershell
cd silencexx_flutter
flutter pub get
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000/api
```

По умолчанию клиент использует настроенный HTTPS-туннель из `lib/core/api.dart`.
Адрес можно заменить через `--dart-define=API_BASE_URL=https://your-server.example/api`.
Для Android-эмулятора локальный сервер доступен через `http://10.0.2.2:3000/api`;
для физического телефона нужен доступный ему адрес сервера.
Для production нужен HTTPS; Android разрешает HTTP только в debug-сборке.
Web-запись микрофона и защищённое хранилище требуют HTTPS или localhost.

### Вход Apple и Google

Экран входа использует native Sign in with Apple на iOS и Google Sign-In. Для Apple
включите Sign in with Apple для Bundle ID `com.silencexx.silencexx` в Apple Developer
и настройте `APPLE_BUNDLE_ID` на backend. Backend проверяет подпись и аудиторию токена.
Google требует OAuth client ID для платформы и web/server client ID. Передайте их при
сборке/запуске Flutter через `GOOGLE_CLIENT_ID` и `GOOGLE_SERVER_CLIENT_ID`, а список
допустимых аудиторий задайте в `GOOGLE_OAUTH_CLIENT_IDS` backend. Без этих ключей
провайдер не сможет выдать рабочую сессию. Не принимайте email или ID пользователя из
клиента как доказательство личности: backend доверяет только проверенному ID token.

Список кризисных ресурсов настраивается владельцем backend через
`CRISIS_RESOURCES_JSON`; приложение не подставляет номера экстренных служб по догадке.

### iPhone: запуск без компьютера

Для самостоятельного запуска с домашнего экрана устанавливайте **release**, а не debug:

```sh
# После замены assets/images/cloudmind_icon.png обновите системные иконки:
dart run flutter_launcher_icons
flutter build ios --release
flutter install --release -d <IPHONE_DEVICE_ID>
```

Для сборки нужна настроенная подпись Xcode. Срок работы установленной сборки ограничен
сроком её provisioning profile; у бесплатной Personal Team профиль действует 7 дней.
Release не требует подключённого отладчика, но сетевые функции по-прежнему требуют
работающего backend. Если backend, Ollama или ngrok запущены на компьютере, выключение
этого компьютера отключит соответствующие функции. Для постоянной доступности сервер
и его зависимости должны работать на постоянно включённом хосте.

### Backend

Можно использовать уже настроенный исходный backend, указав его адрес клиенту,
или запустить отдельную копию:

```powershell
cd backend
npm.cmd ci
Copy-Item .env.example .env
# Заполните .env своими настройками PostgreSQL, JWT, Ollama, Redis и SMTP.
npm.cmd run build
npm.cmd run dev
```

Нужны PostgreSQL с существующей схемой SilenceXX, Redis и Ollama с выбранной моделью.
Для распознавания голоса нужен Python с зависимостями из `backend/requirements.txt`;
путь задаётся через `PYTHON_EXECUTABLE`. Схема и SQL сохранены в `backend/flyway` и
`backend/migrations`. Существующие SQL-скрипты не запускались против вашей базы.
Не применяйте весь набор миграций повторно к рабочей базе без проверки её состояния.

`.env`, credentials, `uploads`, `venv`, `node_modules` и содержимое базы не копировались.
Новая копия backend использует порт 3000: запускайте только один сервер на этом порту.

## Сборка и проверка

```powershell
flutter analyze
flutter test
flutter build web --dart-define=API_BASE_URL=https://your-server.example/api
flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
```

Для путей Windows с кириллицей предусмотрена сборка из временной папки с латинским путём:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build.ps1 -Target web
powershell -ExecutionPolicy Bypass -File scripts/build.ps1 -Target apk -Debug
```

Скрипт выводит путь результата в `build/` и временной копии. Он не удаляет исходники
или временные папки. Для обычного SDK работает команда `flutter`; если установленный
`flutter.bat` зависает, укажите ASCII-путь в системных `TEMP` и `TMP` и повторите.
APK собирается через Android Gradle, поэтому требуется установленный JDK/Android SDK.

Готовая Web-версия находится в `build/web-final`. Для публикации клиентских файлов,
переместите содержимое этой папки в корень сайта или настройте сервер на этот путь.
Используйте HTTPS. Если размещаете приложение в подпапке, пересоберите его с верным
`--base-href`, например `/silencexx_flutter/`.

## Структура

| Путь | Назначение |
|---|---|
| `lib/core` | API, сессия, тема, локальные напоминания |
| `lib/screens` | Авторизация, чат, дневник, задания, почта, профиль, подписки, помощь |
| `lib/widgets` | Общие элементы, обработка загрузки и ошибок |
| `test` | Тесты API и пользовательских сценариев |
| `backend` | Сервер, Python-скрипты и SQL из исходного проекта |
| `android`, `ios`, `web` | Платформенные проекты |

Подробности совместимости и ограничения: [MIGRATION.md](MIGRATION.md).

## Интерфейс

Общая тема использует графитовые поверхности и один лавандовый акцент. Цвета,
типографика, интервалы и длительности переходов находятся в `lib/core/theme/`.
Стандартные поля, переключатели, меню и кнопки оформляются через `theme.dart`.

- `widgets/app_navigation.dart`: боковое меню от 900 px, нижняя навигация на
  небольших экранах, перемещающееся выделение и переходы с сохранением состояния вкладок.
- `widgets/common.dart`: карточки, группы форм, скелетоны, ошибки, плавающая панель
  действий и стеклянные диалоги `showAppDialog` / `AppDialog`.
- `widgets/design.dart`: адаптивный экран входа, бейджи, переходы и рисуемый мотив орбит.
- `widgets/glass.dart`: стеклянные поверхности; размытие ограничено навигацией,
  диалогами и плавающими панелями. Обычные карточки не размывают фон.

Новые переходы учитывают системное отключение анимаций. Светлая тема и выбор языка
сохраняются. Дневник сохраняет черновик при смене вкладки и размера окна.

`test/design_test.dart` проверяет desktop/mobile навигацию, сохранение черновика,
экраны на ширинах 320 / 768 / 1280 px в обеих темах и закрытие диалога с клавиатуры.
Для локального визуального обзора можно сохранить PNG с тестовыми данными:

```sh
flutter test test/design_test.dart \
  --dart-define=DESIGN_REVIEW_FONT=/path/to/font-with-cyrillic.ttf \
  --dart-define=DESIGN_REVIEW_DIR=/tmp/cloudmind-design-review
```

Эти проверки используют подменённый API; устройства, микрофон и платёжный сервер
требуют отдельной проверки в работающем приложении.

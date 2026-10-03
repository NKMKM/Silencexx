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

Android-эмулятор использует `http://10.0.2.2:3000/api` по умолчанию. Для телефона
задайте адрес компьютера в локальной сети через `--dart-define=API_BASE_URL=...`.
Для production нужен HTTPS; Android разрешает HTTP только в debug-сборке.
Web-запись микрофона и защищённое хранилище требуют HTTPS или localhost.

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

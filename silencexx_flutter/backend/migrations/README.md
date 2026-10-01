# Применение индексов для оптимизации

## Как применить миграцию:

### Вариант 1: Через psql (рекомендуется для Aiven)
```bash
psql "postgresql://avnadmin:ПАРОЛЬ@ХОСТ:ПОРТ/defaultdb?sslmode=require" < migrations/add_indexes.sql
```

### Вариант 2: Через pgAdmin
1. Подключитесь к БД
2. Откройте Query Tool
3. Скопируйте содержимое `migrations/add_indexes.sql`
4. Выполните запрос

### Вариант 3: Через Node.js скрипт
```bash
npm run migrate
```

## Что делают индексы:

- **idx_user_chat_chat_senddate** - ускоряет поиск последних сообщений в чате
- **idx_ai_response_chat_senddate** - ускоряет поиск ответов AI
- **idx_chat_id_user_id** - ускоряет поиск чатов пользователя
- **idx_sessions_token** - ускоряет проверку сессий

## Ожидаемые результаты:

- GET /api/chats/list: с ~580ms до ~50ms ⚡
- GET /api/chats/:id/messages: с ~300ms до ~30ms ⚡
- Проверка сессий: кэшируется на 30 секунд 🚀

# 📋 ЧЕК-ЛИСТ: Применение системы многопользовательской изоляции чатов

## Этап 1: Подготовка (15 мин)

- [ ] Закоммитить все текущие изменения
  ```bash
  git add .
  git commit -m "backup: current state before chat isolation"
  ```

- [ ] Создать резервную копию БД
  ```bash
  pg_dump -U postgres cloudmind > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] Проверить, что приложение работает
  - [ ] Backend запущен на http://localhost:3000
  - [ ] Мобильное приложение может подключиться

---

## Этап 2: Применение миграции БД (5 мин)

- [ ] Остановить backend сервер
  ```bash
  # Ctrl+C или используйте:
  lsof -i :3000 | grep node | awk '{print $2}' | xargs kill -9
  ```

- [ ] Применить миграцию
  ```bash
  cd backend
  psql -U postgres -d cloudmind < migrations/add_chat_improvements.sql
  ```

- [ ] Проверить результат применения
  ```sql
  -- Проверить новые столбцы в user_chat
  SELECT column_name, data_type FROM information_schema.columns 
  WHERE table_name='user_chat' AND column_name='user_id';
  
  -- Должен вывести: user_id | integer
  ```

- [ ] Запустить базовую проверку целостности
  ```sql
  -- Все таблицы должны быть доступны
  SELECT COUNT(*) as table_count FROM information_schema.tables 
  WHERE table_schema='public' AND table_type='BASE TABLE';
  ```

---

## Этап 3: Обновление кода (2 мин)

- [ ] Убедиться что файлы обновлены:
  - [ ] `backend/src/chat.ts` - все функции с user_id проверками
  - [ ] `backend/src/server.ts` - POST /api/chat с валидацией mood и логами
  - [ ] `backend/src/subscriptions.ts` - улучшенное логирование лимитов

- [ ] Проверить синтаксис TypeScript
  ```bash
  cd backend
  npx tsc --noEmit
  ```

---

## Этап 4: Запуск backend (3 мин)

- [ ] Запустить backend в режиме разработки
  ```bash
  cd backend
  npm run dev
  ```

- [ ] Дождаться вывода:
  ```
  ✅ Connected to PostgreSQL database
  🚀 CloudMind Backend is running on port 3000
  ```

- [ ] Проверить отсутствие ошибок в логах

---

## Этап 5: Тестирование изоляции (15 мин)

### Тест 1: Создание чата

- [ ] Создать новый чат в мобильном приложении
  - [ ] Проверить в логах backend:
    ```
    🆕 Chat created successfully with ID: 123 (isFirstMessage: true)
    📝 Chat history starts empty - no inheritance from previous chats
    ```
  - [ ] Проверить в БД:
    ```sql
    SELECT id, user_id, is_first_message FROM chat_id WHERE id = 123;
    -- Должно быть: 123 | 1 | true
    ```

### Тест 2: Отправка сообщения с mood

- [ ] Отправить сообщение "Привет" с mood=Happy
  - [ ] Проверить в логах:
    ```
    📊 Mood validated: Happy
    💾 Saving messages to chat 123 with mood=Happy
    ✅ Messages saved to database with user isolation
    ```
  - [ ] Проверить в БД:
    ```sql
    SELECT * FROM user_chat WHERE chat_id = 123 AND user_id = 1;
    -- Должны быть сообщения с mood='Happy'
    ```

### Тест 3: Проверка изоляции (КРИТИЧНО!)

- [ ] Запустить SQL проверку
  ```bash
  psql -U postgres -d cloudmind < CHAT_SYSTEM_SQL_CHECKS.sql > test_results.txt
  
  # Проверить что нет "утечек"
  grep -i "orphaned\|inconsistency" test_results.txt
  # Должно быть пусто!
  ```

### Тест 4: Загрузка истории

- [ ] Закрыть и открыть чат заново
  - [ ] Проверить что история осталась
  - [ ] Проверить в логах:
    ```
    ✅ Found 2 messages in chat 123 for user 1
    📋 First message: user at 2025-12-28 10:00:00
    📋 Last message: ai at 2025-12-28 10:15:00
    ```

### Тест 5: Логирование подписки

- [ ] Отправить несколько сообщений
  - [ ] Проверить в логах появление информации о подписке:
    ```
    💳 Subscription Info:
       Tier: professional
       Daily Chat Limit: 200
    ```
  - [ ] Проверить информацию о лимитах:
    ```
    📈 Current limits for user 1:
       Used: 3/200
       Remaining: 197
    ```

---

## Этап 6: Multi-user тестирование (20 мин)

### Сценарий 1: Два пользователя в разных браузерах

- [ ] Открыть приложение для User 1 в Firefox
  - [ ] Создать чат 1
  - [ ] Отправить сообщение "User 1 message"

- [ ] Открыть приложение для User 2 в Chrome
  - [ ] Создать чат 1
  - [ ] Отправить сообщение "User 2 message"

- [ ] Проверить изоляцию
  - [ ] User 1: видит только свои сообщения
  - [ ] User 2: видит только свои сообщения
  - [ ] Проверить в БД:
    ```sql
    SELECT 
      uc.user_id, 
      uc.message, 
      uc.chat_id 
    FROM user_chat uc 
    WHERE chat_id = 1;
    
    -- Должны быть 2 строки с разными user_id
    ```

### Сценарий 2: Попытка доступа к чужому чату

- [ ] Попытаться в User 2 получить сообщения из чата User 1
  - [ ] Должна быть ошибка 403 в логах backend:
    ```
    ⚠️ Chat 1 not found or access denied for user 2
    ```

### Сценарий 3: Лимиты для разных подписок

- [ ] User 1 (Professional tier): 200 лимит
- [ ] User 2 (Free tier): 5 лимит
  - [ ] User 2 отправляет 6 сообщений
  - [ ] 6-е сообщение должно быть заблокировано (429)
  - [ ] Проверить логи:
    ```
    📈 Current limits for user 2:
       Used: 5/5
       Remaining: 0
    ❌ 429 Too Many Requests
    ```

---

## Этап 7: Стресс-тестирование (30 мин)

### Тест большого чата

- [ ] Отправить 100+ сообщений в один чат
  - [ ] Проверить время загрузки истории (должно быть < 1 секунды)
  - [ ] Проверить что все сообщения загрузились
  - [ ] Проверить в БД что индексы работают:
    ```
    EXPLAIN ANALYZE SELECT * FROM user_chat 
    WHERE chat_id = ? AND user_id = ?;
    
    -- Должен использовать индекс idx_user_chat_chat_id_user_id
    ```

### Тест большого количества чатов

- [ ] Создать 50 чатов для User 1
  - [ ] Проверить время получения списка чатов (должно быть < 500ms)
  - [ ] Проверить что getChatList работает быстро

### Тест concurrency (параллельные запросы)

- [ ] Отправить 10 сообщений одновременно
  - [ ] Проверить что все сообщения сохранены
  - [ ] Проверить что лимит увеличился на 10
  - [ ] Нет ошибок в логах backend

---

## Этап 8: Проверка логирования (10 мин)

### Проверить полноту логов

- [ ] В логах backend должны быть:
  - [ ] `🔹 [requestId] POST /api/chat - NEW REQUEST`
  - [ ] `📊 Mood validated: ...` или `📊 No mood provided`
  - [ ] `💳 [requestId] Subscription Info:`
  - [ ] `💾 [requestId] Saving messages to chat`
  - [ ] `📈 Current limits for user`:

### Проверить отсутствие ошибок

- [ ] Нет ошибок типа:
  - [ ] `❌ ERROR in /api/chat`
  - [ ] `⚠️ Could not get user info`
  - [ ] `SQL constraint violation`

- [ ] Запустить проверку логов:
  ```bash
  # Должно быть 0 ошибок за последний час
  tail -f backend.log | grep "ERROR" | wc -l
  ```

---

## Этап 9: Документирование (5 мин)

- [ ] Убедиться что созданы файлы:
  - [ ] ✅ [CHAT_SYSTEM_FIXES.md](CHAT_SYSTEM_FIXES.md) - полная документация
  - [ ] ✅ [CHAT_FIXES_SUMMARY.md](CHAT_FIXES_SUMMARY.md) - краткое резюме
  - [ ] ✅ [CHAT_SYSTEM_SQL_CHECKS.sql](CHAT_SYSTEM_SQL_CHECKS.sql) - SQL проверки

- [ ] Обновить README с информацией о системе

---

## Этап 10: Коммит изменений (2 мин)

- [ ] Закоммитить успешное применение
  ```bash
  git add backend/
  git add *.md *.sql
  git commit -m "feat: multi-user chat isolation and subscription logging

  - Added user_id to chat messages for strict isolation
  - Implemented double-check validation for chat access
  - Added mood enum validation and persistence
  - Implemented subscription logging on each request
  - Added daily limits tracking and logging
  - Created comprehensive SQL checks and documentation
  - All multi-user scenarios tested and working"
  ```

---

## ⚠️ ОТКАТ (если что-то пошло не так)

```bash
# 1. Остановить backend
Ctrl+C

# 2. Восстановить БД из резервной копии
psql -U postgres cloudmind < backup_YYYYMMDD_HHMMSS.sql

# 3. Откатить код (если нужно)
git revert <commit-hash>
git checkout backend/

# 4. Запустить backend заново
npm run dev
```

---

## 🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!

Если все чек-листы выполнены ✅, система готова к:
- ✅ Продакшену
- ✅ Масштабированию на 1000+ пользователей
- ✅ Расширению функциональности

**Дата применения:** _______________
**Применено:** _______________
**Проверено:** _______________
**Утверждено:** _______________

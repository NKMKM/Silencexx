# Облачко и эмоция голосового сообщения

Новая версия клиента читает `voice_emotion` из сообщений. Без обновления сервера голосовой интерфейс остаётся нейтральным; сервер должен содержать актуальные `src/voice.ts`, `src/conversation.ts` и новый `src/voiceEmotion.ts`.

После переноса исходников на сервер:

```bash
cd /var/backend
npm ci
npm run build
systemctl restart cloudmind
```

Нужны работающие настройки Qwen и цен токенов в .env. Отдельный небольшой анализ текста учтён в `ai_usage` как `voice_emotion`; это часть голосового запроса, отдельная mood-quota не списывается. Результат выбирает визуальную реакцию, не диагноз и не анализ интонации. Неуверенный или недоступный анализ даёт neutral, не блокируя основной ответ.

Колонка `messages.voice_emotion` добавляется лениво при первом запросе голоса (роль приложения должна иметь право ALTER своей таблицы). При ручном управлении схемой заранее примените `migrations/add_voice_emotion.sql` к активной БД. Не запускайте старые setup-db.js/run-migrations.js: для этого обновления пересоздание таблиц не нужно.

Для реального распознавания нужен faster-whisper. Текущий `scripts/transcribe-v2.py` использует CPU/int8 и модель base. Если venv ещё нет, на Ubuntu/Debian:

```bash
apt-get install -y python3-venv
cd /var/backend
python3 -m venv venv
venv/bin/python -m pip install faster-whisper
systemctl restart cloudmind
```

Не используйте MOCK_WHISPER=true в рабочем окружении. Первое использование загружает модель, поэтому проверьте доступ сервера к хранилищу моделей и свободную память. Для TTS сохраняется текущая проверка hasTTS подписки.

Cloudflare-туннель не требуется перезапускать, адрес API не менялся.

# Python Environment Setup для WhisperX

## Проблема

Node.js запускает Python через `child_process`, но системный Python не имеет установленных модулей (`torch`, `whisperx`).

**Ошибка**: `Module not found: No module named 'torch'`

## Production-Ready решение

Используем **виртуальное окружение Python** с изолированными зависимостями.

---

## Быстрая установка (Windows)

### 1. Создайте виртуальное окружение

```bash
cd backend

# Используйте Windows Python напрямую
C:\Users\artem\AppData\Local\Programs\Python\Python313\python.exe -m venv venv

# Или системный Python (если в PATH)
python -m venv venv
```

⚠️ **Важно**: НЕ используйте `python` из msys64/Git Bash - это создаст неправильную структуру (bin/ вместо Scripts/)

### 2. Установите PyTorch и WhisperX

```bash
# Установка PyTorch CPU version (быстрая установка)
.\venv\Scripts\pip.exe install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Установка WhisperX
.\venv\Scripts\pip.exe install git+https://github.com/m-bain/whisperx.git
```

### 3. Проверьте установку

```bash
.\venv\Scripts\python.exe -c "import torch; print('PyTorch:', torch.__version__)"
.\venv\Scripts\python.exe -c "import whisperx; print('WhisperX: OK')"
```

Ожидаемый вывод:
```
PyTorch: 2.8.0+cpu
WhisperX: OK
```

### 4. Запустите backend

```bash
npm run dev
```

Backend автоматически обнаружит `venv/Scripts/python.exe` и будет использовать его для транскрибации.

---

## Ручная установка (Linux/Mac)

```bash
cd backend

# Создать виртуальное окружение
python3 -m venv venv

# Активировать
source venv/bin/activate

# Установить зависимости
pip install --upgrade pip
pip install torch==2.5.1 torchaudio==2.5.1
pip install git+https://github.com/m-bain/whisperx.git
pip install numpy<2.0.0 omegaconf

# Проверка
python -c "import torch; print(torch.__version__)"
```

---

## Как это работает

### 1. Автоматическое обнаружение Python (config.ts)

```typescript
function getPythonExecutable(): string {
  // Priority 1: Virtual environment (production)
  const venvPath = path.join(__dirname, '../../venv/Scripts/python.exe');
  if (fs.existsSync(venvPath)) {
    return venvPath;
  }
  
  // Priority 2: System Python (fallback)
  return 'python3';
}
```

### 2. Безопасный запуск транскрибации (voice.ts)

```typescript
const pythonPath = config.pythonExecutable;

exec(`"${pythonPath}" "${scriptPath}" "${audioPath}" ru`, {
  timeout: 120000,
  maxBuffer: 10 * 1024 * 1024,
}, (err, stdout, stderr) => {
  // Improved error handling
  if (err && err.message.includes('No module named')) {
    console.error('❌ Run setup-python-env.bat to install dependencies');
    reject(new Error('Python dependencies not installed'));
    return;
  }
  
  // Parse JSON result from Python
  const result = JSON.parse(stdout);
  resolve(result.text);
});
```

### 3. Обработка ошибок

| Ошибка | Решение |
|--------|---------|
| `No module named 'torch'` | Запустите `setup-python-env.bat` |
| `Python not found` | Установите Python 3.10+ с python.org |
| `CUDA error` | Используется CPU fallback автоматически |
| `Timeout` | Увеличьте `transcriptionTimeout` в config.ts |

---

## Mock Mode для тестирования

Если Python не установлен, можно использовать mock-режим:

```bash
# В .env файле
MOCK_WHISPER=true
```

В этом режиме вместо реальной транскрибации вернётся текст:
```
"Mock transcription text for testing"
```

---

## Совместимость с аудио форматами

WhisperX поддерживает:
- ✅ **m4a** (iOS/Expo Audio Recording)
- ✅ **AAC** codec
- ✅ **MP3**, **WAV**, **FLAC**
- ✅ **44.1kHz** sample rate
- ✅ **Mono** и **Stereo**

Expo Audio записывает в формате:
```typescript
{
  android: {
    extension: '.m4a',
    outputFormat: AndroidOutputFormat.MPEG_4,
    audioEncoder: AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: IOSAudioQuality.MAX,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
}
```

---

## Почему виртуальное окружение?

### ✅ Преимущества

1. **Изоляция зависимостей**
   - PyTorch 2.5.1 не конфликтует с системными пакетами
   - Точная версия для production

2. **Воспроизводимость**
   - Одинаковая среда на development и production
   - Легко перенести на другие машины

3. **Безопасность**
   - Не требует прав администратора
   - Не загрязняет системный Python

4. **Откат изменений**
   - Просто удалите папку `venv/`
   - Создайте заново за 2 минуты

### ❌ Альтернативы (не рекомендуется)

- **Системный Python**: Конфликты версий, сложная установка
- **Conda**: Избыточен для production, медленный
- **Docker**: Overkill для простой транскрибации

---

## Production Checklist

- [ ] Виртуальное окружение создано (`venv/` существует)
- [ ] PyTorch 2.5.1 установлен (`import torch` работает)
- [ ] WhisperX установлен (`import whisperx` работает)
- [ ] Backend логирует `Using Python: .../venv/Scripts/python.exe`
- [ ] Транскрибация работает (проверьте тестовый файл)
- [ ] Error handling настроен (ошибки логируются в PostgreSQL)
- [ ] Timeout установлен (120 секунд для длинных аудио)

---

## Troubleshooting

### "Python not found at: .../venv/Scripts/python.exe"

```bash
cd backend
rm -rf venv
setup-python-env.bat
```

### "Module 'torch' has no attribute 'load'"

Неправильная версия PyTorch. Переустановите:

```bash
venv\Scripts\pip uninstall torch torchaudio -y
venv\Scripts\pip install torch==2.5.1 torchaudio==2.5.1
```

### "CUDA not available"

Это нормально! WhisperX автоматически использует CPU. Для GPU:

```bash
pip install torch==2.5.1+cu118 torchaudio==2.5.1+cu118 --index-url https://download.pytorch.org/whl/cu118
```

### Транскрибация медленная (>30 сек на 10 сек аудио)

- Используйте GPU версию (см. выше)
- Или уменьшите модель: `base` вместо `large-v2`

---

## Логи для отладки

Backend автоматически логирует все шаги:

```
🐍 [PIPELINE] Using Python: C:\...\backend\venv\Scripts\python.exe
🔄 [PIPELINE] Running command: "C:\...\venv\Scripts\python.exe" "..." "..." ru
🔄 [PIPELINE] Python stdout: {"text": "transcribed text", "language": "ru"}
✅ [PIPELINE] WhisperX success! Language: ru
```

Если видите ошибку:
```
❌ [PIPELINE] Python module 'torch' not found. Run setup-python-env.bat
```

Значит виртуальное окружение не настроено - запустите `setup-python-env.bat`.

---

## Дополнительные ресурсы

- [WhisperX GitHub](https://github.com/m-bain/whisperx)
- [PyTorch Installation Guide](https://pytorch.org/get-started/locally/)
- [Python venv Documentation](https://docs.python.org/3/library/venv.html)

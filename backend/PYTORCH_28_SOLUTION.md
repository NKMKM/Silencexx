# PyTorch 2.8 Breaking Change & Production Solution

## 🔴 Проблема

```
PyTorch version: 2.8.0
Weights only load failed
Unsupported global: omegaconf.listconfig.ListConfig
```

### Корневая причина

**PyTorch 2.6+ Breaking Change**: `torch.load()` теперь по умолчанию использует `weights_only=True` для безопасности.

WhisperX хранит модели с OmegaConf объектами, которые **не входят** в `safe_globals` PyTorch.

```python
# PyTorch < 2.6 (old behavior)
torch.load(file, weights_only=False)  # Allows arbitrary objects

# PyTorch >= 2.6 (new behavior)  
torch.load(file, weights_only=True)   # Blocks OmegaConf, custom classes
```

### Почему это происходит

1. **Security hardening**: PyTorch предотвращает атаки через pickle deserialization
2. **WhisperX legacy**: Модели содержат `omegaconf.listconfig.ListConfig`
3. **Конфликт**: OmegaConf не в whitelist PyTorch

---

## ✅ Production-Ready Solution

### Вариант 1: faster-whisper (РЕКОМЕНДУЕТСЯ)

**Преимущества**:
- ✅ Полная совместимость с PyTorch 2.8+
- ✅ Нет OmegaConf зависимостей
- ✅ Быстрее чем standard Whisper (CTranslate2 backend)
- ✅ Та же точность что у WhisperX
- ✅ Нет компромиссов в безопасности

**Установка**:
```bash
cd backend
.\venv\Scripts\pip.exe install faster-whisper
```

**Использование** (см. `scripts/transcribe-v2.py`):
```python
from faster_whisper import WhisperModel

model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe(audio_path, language="ru")

text = " ".join([seg.text.strip() for seg in segments])
```

---

### Вариант 2: Downgrade PyTorch (временное решение)

Если нужен именно WhisperX (для alignment/diarization):

```bash
cd backend
.\venv\Scripts\pip.exe uninstall torch torchaudio -y
.\venv\Scripts\pip.exe install torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cpu
.\venv\Scripts\pip.exe install git+https://github.com/m-bain/whisperx.git
```

**Недостатки**:
- ⚠️ Временное решение до обновления WhisperX
- ⚠️ Пропускаете security fixes PyTorch 2.8+
- ⚠️ Потребуется миграция позже

---

## 🚫 НЕ ДЕЛАЙТЕ ТАК

### ❌ Вариант 1: weights_only=False

```python
# НЕ ИСПОЛЬЗУЙТЕ - УЯЗВИМОСТЬ БЕЗОПАСНОСТИ
torch.load(file, weights_only=False)
```

**Почему плохо**: Позволяет выполнение произвольного кода через pickle.

### ❌ Вариант 2: add_safe_globals

```python
# НЕ ИСПОЛЬЗУЙТЕ - ОБХОДИТ БЕЗОПАСНОСТЬ
torch.serialization.add_safe_globals([omegaconf.listconfig.ListConfig])
```

**Почему плохо**: 
- Глобально отключает защиту для всех torch.load()
- Требует патчинга каждого нового типа
- Не production-ready

---

## 📦 Production Requirements

### requirements.txt (faster-whisper)
```txt
# Production-ready transcription stack
# Compatible with PyTorch 2.8+

# PyTorch (latest stable)
torch>=2.8.0
torchaudio>=2.8.0

# Transcription engine (bypasses WhisperX OmegaConf issue)
faster-whisper>=1.0.0

# Optional: for advanced features
# numpy<2.0.0
```

### requirements.txt (WhisperX + PyTorch 2.5)
```txt
# Temporary: Pin PyTorch until WhisperX updates
torch==2.5.1
torchaudio==2.5.1

# WhisperX (alignment, diarization)
git+https://github.com/m-bain/whisperx.git

# Dependencies
numpy<2.0.0
omegaconf>=2.1
```

---

## 🏗️ Voice Pipeline Architecture

### Полный Flow

```
┌─────────────┐
│ Expo App    │ (iOS/Android)
│ Audio.Recording │
└──────┬──────┘
       │ m4a/AAC, 44.1kHz, mono
       │ POST /api/messages/voice
       ▼
┌─────────────────┐
│ Node.js Backend │
│ Express + multer│
│ - Save to uploads/│
│ - Create message │
│   in PostgreSQL  │
└──────┬──────────┘
       │ spawn Python process
       │ transcribe-v2.py audio.m4a ru
       ▼
┌──────────────────┐
│ Python venv      │
│ faster-whisper   │
│ - Load model     │
│ - Transcribe     │
│ - Return JSON    │
└──────┬───────────┘
       │ {"text": "...", "language": "ru"}
       ▼
┌──────────────────┐
│ Node.js Backend  │
│ - Update message │
│   text in DB     │
│ - Send to Ollama │
│ - Get AI response│
└──────┬───────────┘
       │ AI response
       ▼
┌──────────────────┐
│ PostgreSQL       │
│ messages table   │
│ - user voice     │
│ - transcription  │
│ - AI response    │
└──────────────────┘
```

---

## 🔧 Backend Integration

### config.ts (Python Detection)
```typescript
function getPythonExecutable(): string {
  const venvPath = path.join(__dirname, '../../venv/Scripts/python.exe');
  if (fs.existsSync(venvPath)) {
    console.log('✅ Using Python from venv:', venvPath);
    return venvPath;
  }
  return 'python3'; // Fallback
}

export const config = {
  pythonExecutable: getPythonExecutable(),
  transcriptionTimeout: 120000, // 2 minutes
  transcriptionScript: path.join(__dirname, '../scripts/transcribe-v2.py'),
};
```

### voice.ts (Запуск транскрибации)
```typescript
import { exec } from 'child_process';
import { config } from './config';

const pythonPath = config.pythonExecutable;
const scriptPath = config.transcriptionScript;

const command = `"${pythonPath}" "${scriptPath}" "${audioPath}" ru`;

exec(command, { 
  timeout: config.transcriptionTimeout,
  maxBuffer: 10 * 1024 * 1024 
}, (err, stdout, stderr) => {
  if (err) {
    if (err.message.includes('No module named')) {
      console.error('❌ Python module not found. Run: pip install faster-whisper');
    }
    return;
  }
  
  const result = JSON.parse(stdout);
  // Update database with result.text
});
```

---

## 🧪 Тестирование

### 1. Проверка окружения
```bash
cd backend

# Check Python
.\venv\Scripts\python.exe -c "import sys; print(f'Python: {sys.version}')"

# Check PyTorch
.\venv\Scripts\python.exe -c "import torch; print(f'PyTorch: {torch.__version__}')"

# Check faster-whisper
.\venv\Scripts\python.exe -c "from faster_whisper import WhisperModel; print('✅ OK')"
```

### 2. Test транскрибации
```bash
# Create test audio (or use real file)
.\venv\Scripts\python.exe scripts\transcribe-v2.py uploads\test.m4a ru
```

Ожидаемый вывод:
```json
{"text": "расшифрованный текст", "language": "ru", "duration": 5.2}
```

### 3. Mock режим (без Python)
```bash
# .env file
MOCK_WHISPER=true

# Backend will return mock text instead of real transcription
```

---

## 📊 Сравнение решений

| Критерий | faster-whisper | WhisperX + PyTorch 2.5 | weights_only=False |
|----------|----------------|------------------------|---------------------|
| PyTorch 2.8+ | ✅ Да | ❌ Нет | ✅ Да |
| Безопасность | ✅ Высокая | ✅ Средняя (старая версия) | ❌ Низкая |
| Скорость | ✅ Быстро | ✅ Быстро | ⚠️ Медленно |
| Alignment | ❌ Нет | ✅ Да | N/A |
| Diarization | ❌ Нет | ✅ Да | N/A |
| Production-ready | ✅ Да | ⚠️ Временно | ❌ Нет |

**Рекомендация**: Используйте **faster-whisper** для базовой транскрибации. Переходите на WhisperX только если нужны alignment/diarization.

---

## 🚀 Quick Start

### Установка (5 минут)

```bash
cd backend

# 1. Create venv (if not exists)
python -m venv venv

# 2. Install faster-whisper
.\venv\Scripts\pip.exe install torch torchaudio faster-whisper

# 3. Test
.\venv\Scripts\python.exe scripts\transcribe-v2.py uploads\audio.m4a ru

# 4. Run backend
npm run dev
```

### Первый запуск

1. Backend автоматически обнаружит `venv/Scripts/python.exe`
2. При первой транскрибации скачается модель (~150MB)
3. Последующие запуски будут мгновенными (модель в кэше)

---

## 📚 Дополнительные ресурсы

- [PyTorch 2.6 Release Notes](https://github.com/pytorch/pytorch/releases/tag/v2.6.0)
- [faster-whisper GitHub](https://github.com/SYSTRAN/faster-whisper)
- [WhisperX GitHub](https://github.com/m-bain/whisperx)
- [Secure PyTorch Model Loading](https://pytorch.org/docs/stable/generated/torch.load.html)

---

## ❓ FAQ

**Q: Почему не использовать weights_only=False?**  
A: Это security vulnerability. Pickle может выполнять произвольный код.

**Q: Когда WhisperX обновится?**  
A: Следите за [issues](https://github.com/m-bain/whisperx/issues). Пока используйте faster-whisper.

**Q: Потеряю ли я качество с faster-whisper?**  
A: Нет. Та же модель Whisper, тот же CTranslate2 backend.

**Q: Нужен ли мне alignment/diarization?**  
A: Для базовой транскрибации - нет. Для speaker recognition - да (используйте WhisperX + PyTorch 2.5).

**Q: Можно ли использовать GPU?**  
A: Да. Измените `compute_type="float16"` и `device="cuda"` в transcribe-v2.py.

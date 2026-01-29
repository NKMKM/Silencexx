# Production Audio Recording Guide (Expo + iOS + Android)

## Проблема, которую мы решили

### Ошибка: `-11828 AVFoundationErrorDomain`
```
Error: This media format is not supported
The AVPlayerItem instance has failed with the error code -11828
```

**Причины**:
1. ❌ URI получается ДО завершения записи (`getURI()` перед `stopAndUnloadAsync()`)
2. ❌ Файл не finalized (recording не unloaded)
3. ❌ Неправильный формат или настройки кодека
4. ❌ Audio mode не восстановлен после записи

## Production-Ready решение

### 1. Правильная последовательность остановки записи

```typescript
async function stopRecording() {
  if (!recording) return;
  
  // ✅ ШАГ 1: Остановить таймер
  if (recordingIntervalRef.current) {
    clearInterval(recordingIntervalRef.current);
  }
  
  // ✅ ШАГ 2: Обновить UI состояние
  setIsRecording(false);
  
  try {
    // ✅ ШАГ 3: СНАЧАЛА stopAndUnloadAsync - finalize файл
    await recording.stopAndUnloadAsync();
    
    // ✅ ШАГ 4: Восстановить audio mode
    await Audio.setAudioModeAsync({ 
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true 
    });
  } catch(e) {
    console.error('Error stopping recording:', e);
  }
  
  // ✅ ШАГ 5: ТОЛЬКО ПОСЛЕ stopAndUnloadAsync получаем URI
  const uri = recording.getURI(); 
  
  // ✅ ШАГ 6: Очищаем state
  setRecording(null);
  setRecordingTime(0);
  
  // ✅ ШАГ 7: Теперь файл готов к отправке
  if (uri && activeChatId) {
    await sendVoiceMessage(uri);
  }
}
```

### 2. Правильные настройки записи для iOS + Android

```typescript
// ✅ Production-ready настройки
const recordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,  // Mono для меньшего размера
    bitRate: 128000,       // 128 kbps - баланс качество/размер
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  }
};
```

### 3. Почему именно эти настройки?

| Параметр | Значение | Причина |
|----------|----------|---------|
| **Format** | `.m4a` | ✅ Нативно поддерживается iOS/Android<br>✅ WhisperX работает<br>✅ Малый размер |
| **Codec** | AAC | ✅ Hardware-accelerated на iOS<br>✅ Лучшее сжатие<br>✅ WhisperX понимает |
| **Sample Rate** | 44100 Hz | ✅ Standard для голоса<br>✅ Баланс качество/размер |
| **Channels** | 1 (Mono) | ✅ Голос не требует стерео<br>✅ Размер файла в 2 раза меньше |
| **Bit Rate** | 128 kbps | ✅ Оптимальное качество для голоса<br>✅ ~1 MB на минуту |

### 4. Правильное получение duration

```typescript
// ✅ Используем Expo AV напрямую
const { sound } = await Audio.Sound.createAsync(
  { uri: audioUri },
  { shouldPlay: false },
  (status) => {
    if (status.isLoaded) {
      const durationSeconds = Math.floor((status.durationMillis || 0) / 1000);
      setDuration(durationSeconds);
    }
  }
);
```

**Почему это работает:**
- Файл уже finalized после `stopAndUnloadAsync()`
- Expo AV знает как читать m4a на iOS
- Callback дает duration сразу после загрузки

### 5. Полный pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                   RECORDING PIPELINE                        │
└─────────────────────────────────────────────────────────────┘

1. Permission Request
   ↓
2. Set Audio Mode (allowsRecordingIOS: true)
   ↓
3. Create Recording with m4a/AAC settings
   ↓
4. Start Recording + Timer
   ↓
5. User stops
   ↓
6. Stop Timer
   ↓
7. stopAndUnloadAsync() ← FINALIZE FILE
   ↓
8. Restore Audio Mode
   ↓
9. getURI() ← NOW SAFE
   ↓
10. Send to Backend
    ↓
11. Backend serves via /uploads endpoint
    ↓
12. Frontend loads with Audio.Sound
    ↓
13. Get duration from status callback
    ↓
14. Play with sound.playAsync()
```

## Почему НЕ работали другие подходы?

### ❌ RecordingOptionsPresets.HIGH_QUALITY
```typescript
// Проблема: непредсказуемые настройки
const { recording } = await Audio.Recording.createAsync(
  Audio.RecordingOptionsPresets.HIGH_QUALITY
);
```
**Почему плохо**: Preset может выбрать формат, который iOS не может воспроизвести сразу.

### ❌ getURI() перед stopAndUnloadAsync()
```typescript
// Проблема: файл не finalized
const uri = recording.getURI();
await recording.stopAndUnloadAsync();
```
**Почему плохо**: Файл записан, но headers не закрыты. iOS не может его прочитать.

### ❌ Не восстановлен audio mode
```typescript
// Проблема: audio mode остается в recording state
await recording.stopAndUnloadAsync();
// Забыли setAudioModeAsync({ allowsRecordingIOS: false })
```
**Почему плохо**: Может конфликтовать с playback.

## Production Checklist

- [x] ✅ Правильная последовательность stop → unload → getURI
- [x] ✅ Явные настройки m4a/AAC для iOS и Android
- [x] ✅ Восстановление audio mode после записи
- [x] ✅ Cleanup в useEffect (unload sound)
- [x] ✅ Error handling на каждом этапе
- [x] ✅ Backend раздает файлы через express.static
- [ ] Мониторинг размера файлов (должно быть ~1 MB/min)
- [ ] Тестирование на реальных iOS/Android устройствах
- [ ] Fallback UI если duration = 0

## Troubleshooting

### Ошибка: "duration is 0"
```typescript
// Решение: добавьте delay перед загрузкой
await new Promise(resolve => setTimeout(resolve, 100));
const { sound } = await Audio.Sound.createAsync({ uri });
```

### Ошибка: "File not found on backend"
```typescript
// Решение: проверьте что backend раздает статику
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

### Ошибка: "Recording not stopped"
```typescript
// Решение: всегда проверяйте recording state
if (recording && recording._canRecord) {
  await recording.stopAndUnloadAsync();
}
```

## Мониторинг Production

Добавьте логи для отладки:

```typescript
console.log('[Recording] Started:', {
  format: 'm4a',
  sampleRate: 44100,
  codec: 'AAC'
});

console.log('[Recording] Stopped:', {
  uri,
  duration: recordingTime,
  size: fileInfo.size
});

console.log('[Playback] Loading:', {
  uri,
  duration: durationSeconds
});
```

## Размеры файлов (reference)

| Duration | Size (128 kbps mono) |
|----------|----------------------|
| 10 sec   | ~160 KB             |
| 30 sec   | ~480 KB             |
| 1 min    | ~960 KB (~1 MB)     |
| 3 min    | ~3 MB               |

Если размеры больше - проверьте настройки bitRate и channels.

---

**Итог**: Теперь у вас production-ready audio pipeline с правильными форматами, последовательностью операций и error handling! 🎙️✨

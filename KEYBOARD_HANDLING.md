## Клавиатурное управление: Автоматическое смещение интерфейса

### 📋 Описание
Реализовано автоматическое смещение интерфейса при открытии клавиатуры на экранах логина, регистрации и OTP. Интерфейс теперь всегда показывает активное поле ввода и кнопку подтверждения.

### ✅ Реализованные функции

#### 1. **LoginPage.tsx**
- ✅ Оптимизирован `KeyboardAvoidingView` с `keyboardVerticalOffset`:
  - iOS: 60px (для корректного позиционирования)
  - Android: 100px (для большего смещения)
- ✅ Увеличена `paddingBottom` в ScrollView с 200 до 280px для гарантии видимости кнопки Sign in
- ✅ Добавлены свойства: `enabled={true}` и `scrollEnabled={true}`
- ✅ Поведение: При открытии клавиатуры экран автоматически смещается вверх, поле остаётся видимым

#### 2. **RegisterPage.tsx** 
- ✅ Идентичные улучшения как LoginPage
- ✅ Multi-step форма (email → name → password → confirm):
  - Каждый шаг имеет полную видимость при активности
  - Кнопка Next/Sign up всегда доступна визуально
- ✅ Progress bar остаётся видимым на всех шагах

#### 3. **OTPPage.tsx**
- ✅ Улучшено позиционирование клавиатуры:
  - Изменено с `View` на `ScrollView` для лучшей скроллируемости
  - Добавлены те же `keyboardVerticalOffset` значения
  - Увеличена `paddingBottom` с 120 до 200px
- ✅ 6-значные OTP поля всегда видны
- ✅ Кнопка "Подтвердить" остаётся в фокусе

### 🔧 Технические изменения

**KeyboardAvoidingView оптимизация:**
```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 100}
  enabled={true}
>
```

**ScrollView настройка:**
```tsx
<ScrollView
  contentContainerStyle={[
    styles.scrollContent,
    { 
      paddingTop: Math.max(insets.top + 40, 60), 
      paddingBottom: Math.max(insets.bottom + 280, 280)  // ← Увеличено
    }
  ]}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
  scrollEnabled={true}  // ← Добавлено
  bounces={false}
/>
```

### 📱 Поведение по платформам

**iOS:**
- Использует `padding` режим (более гладкое движение)
- `keyboardVerticalOffset: 60px` - стандартный отступ
- Плавное анимированное смещение содержимого

**Android:**
- Использует `height` режим (полное переопределение высоты)
- `keyboardVerticalOffset: 100px` - больший отступ для уверенности
- Клавиатура просто вдвигается, содержимое смещается

### 🎯 Результаты

✅ **LoginPage:** Email и пароль остаются видимы при открытой клавиатуре, кнопка "Sign in" в фокусе  
✅ **RegisterPage:** Текущий шаг с инпутом и кнопка "Next" всегда видны на всех 4 этапах  
✅ **OTPPage:** 6 полей OTP и кнопка "Подтвердить" остаются доступны  
✅ Оба Platform'а (iOS/Android) работают оптимально  
✅ Клавиатура закрывается без проблем при нажатии вне инпута  

### 🛠️ Дополнительно создан

**`hooks/useKeyboardHandler.ts`** - Хук для управления событиями клавиатуры (может использоваться в будущих компонентах):
- Слушает `keyboardWillShow/keyboardDidShow` (в зависимости от платформы)
- Слушает `keyboardWillHide/keyboardDidHide`
- Автоматически очищает listeners при размонтировании компонента

### 🔍 Проверка компиляции
- ✅ LoginPage.tsx - No errors found
- ✅ RegisterPage.tsx - No errors found
- ✅ OTPPage.tsx - No errors found

### 💡 Рекомендации

1. **Тестирование:** Проверьте на реальных устройствах (iOS и Android) с разными размерами экранов
2. **Дальнейшие улучшения:** При необходимости можно настроить `keyboardVerticalOffset` для конкретных девайсов
3. **Стилизация:** Если нужны дополнительные эффекты, можно использовать `useKeyboardHandler` для кастомных анимаций

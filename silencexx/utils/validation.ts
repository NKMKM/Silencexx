/**
 * Утилиты для валидации и форматирования контактов (email и телефон)
 */

/**
 * Проверка валидности email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Проверка валидности телефонного номера (международные номера)
 * Поддерживает номера от 10 до 15 цифр с необязательным знаком +
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Определение типа контакта (email или телефон)
 */
export function getContactType(value: string): 'email' | 'phone' | 'unknown' {
  const trimmed = value.trim();
  if (trimmed.includes('@')) return 'email';
  if (/^\+?[\d\s()-]+$/.test(trimmed)) return 'phone';
  return 'unknown';
}

/**
 * Форматирование телефонного номера для отображения
 * Поддерживает международный формат с маской
 */
export function formatPhoneNumber(phone: string, countryCode: string = '+7'): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // Если начинается с кода страны, убираем его
  const withoutCountry = cleaned.startsWith('7') || cleaned.startsWith('8') 
    ? cleaned.substring(1) 
    : cleaned;
  
  // Форматируем для России/СНГ (+7)
  if (countryCode === '+7' && withoutCountry.length <= 10) {
    if (withoutCountry.length === 0) return '';
    if (withoutCountry.length <= 3) return `+7 (${withoutCountry}`;
    if (withoutCountry.length <= 6) return `+7 (${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3)}`;
    if (withoutCountry.length <= 8) return `+7 (${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3, 6)}-${withoutCountry.slice(6)}`;
    return `+7 (${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3, 6)}-${withoutCountry.slice(6, 8)}-${withoutCountry.slice(8, 10)}`;
  }
  
  // Общий международный формат
  return `${countryCode} ${withoutCountry}`;
}

/**
 * Получение маскированной версии контакта для отображения
 * Например: exa***@mail.com или +7 900 *** 45-67
 */
export function maskContact(contact: string): string {
  if (getContactType(contact) === 'email') {
    const [local, domain] = contact.split('@');
    if (local.length <= 3) return `${local}***@${domain}`;
    return `${local.substring(0, 2)}***@${domain}`;
  }
  
  if (getContactType(contact) === 'phone') {
    const cleaned = contact.replace(/\D/g, '');
    if (cleaned.length < 10) return contact;
    
    const country = cleaned.substring(0, 1);
    const first = cleaned.substring(1, 4);
    const last = cleaned.substring(cleaned.length - 4);
    
    return `+${country} ${first} *** ${last}`;
  }
  
  return contact;
}

/**
 * Валидация пароля
 */
export function validatePassword(password: string): { isValid: boolean; error: string } {
  if (!password) {
    return { isValid: false, error: 'Введите пароль' };
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'Пароль должен содержать минимум 6 символов' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Пароль слишком длинный (максимум 128 символов)' };
  }
  
  // Опционально: проверка на сложность
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { isValid: false, error: 'Пароль должен содержать буквы и цифры' };
  }
  
  return { isValid: true, error: '' };
}

/**
 * Проверка совпадения паролей
 */
export function passwordsMatch(password: string, confirmPassword: string): { match: boolean; error: string } {
  if (!confirmPassword) {
    return { match: false, error: 'Подтвердите пароль' };
  }
  
  if (password !== confirmPassword) {
    return { match: false, error: 'Пароли не совпадают' };
  }
  
  return { match: true, error: '' };
}

/**
 * Валидация имени пользователя
 */
export function validateName(name: string): { isValid: boolean; error: string } {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { isValid: false, error: 'Введите ваше имя' };
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Имя должно содержать минимум 2 символа' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Имя слишком длинное (максимум 50 символов)' };
  }
  
  // Проверка на допустимые символы (буквы, пробелы, дефисы)
  const validNameRegex = /^[a-zA-Zа-яА-ЯёЁ\s-]+$/;
  if (!validNameRegex.test(trimmed)) {
    return { isValid: false, error: 'Имя может содержать только буквы, пробелы и дефисы' };
  }
  
  return { isValid: true, error: '' };
}

/**
 * Валидация кода OTP
 */
export function validateOTP(code: string, length: number = 6): { isValid: boolean; error: string } {
  if (!code) {
    return { isValid: false, error: 'Введите код подтверждения' };
  }
  
  if (code.length !== length) {
    return { isValid: false, error: `Код должен содержать ${length} цифр` };
  }
  
  if (!/^\d+$/.test(code)) {
    return { isValid: false, error: 'Код может содержать только цифры' };
  }
  
  return { isValid: true, error: '' };
}

/**
 * Очистка номера телефона от всех символов кроме цифр
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Определение кода страны по номеру телефона
 */
export function getCountryCode(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  
  if (cleaned.startsWith('1')) return '+1'; // USA/Canada
  if (cleaned.startsWith('7')) return '+7'; // Russia/Kazakhstan
  if (cleaned.startsWith('44')) return '+44'; // UK
  if (cleaned.startsWith('49')) return '+49'; // Germany
  if (cleaned.startsWith('33')) return '+33'; // France
  if (cleaned.startsWith('39')) return '+39'; // Italy
  if (cleaned.startsWith('34')) return '+34'; // Spain
  if (cleaned.startsWith('380')) return '+380'; // Ukraine
  if (cleaned.startsWith('375')) return '+375'; // Belarus
  
  return '+';
}

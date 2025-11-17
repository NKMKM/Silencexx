import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, Lock, Eye, EyeOff, User, Chrome, Apple, Cloud, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { FloatingClouds } from './FloatingClouds';

interface RegisterPageProps {
  onRegister: () => void;
  onNavigateToLogin: () => void;
  onNavigateToOTP: (phone: string) => void;
}

type RegisterMethod = 'email' | 'phone';

export function RegisterPage({ onRegister, onNavigateToLogin, onNavigateToOTP }: RegisterPageProps) {
  const [registerMethod, setRegisterMethod] = useState<RegisterMethod>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 1) return cleaned;
    if (cleaned.length <= 4) return `+7 (${cleaned.slice(1)}`;
    if (cleaned.length <= 7) return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4)}`;
    if (cleaned.length <= 9) return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    if (formatted.length <= 18) {
      setPhone(formatted);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }
    if (!agreeTerms) {
      alert('Пожалуйста, согласитесь с условиями использования');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onRegister();
    }, 1000);
  };

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      alert('Пожалуйста, согласитесь с условиями использования');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onNavigateToOTP(phone);
    }, 800);
  };

  const handleSocialRegister = (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onRegister();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/90 via-purple-50/90 to-pink-50/90 flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingClouds />
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo and Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, -5, 5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-2xl"
          >
            <Cloud className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-slate-800 mb-2">Создать аккаунт</h1>
          <p className="text-slate-600">Начните свой путь к покою</p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/40"
        >
          {/* Social Register Buttons */}
          <div className="space-y-3 mb-6">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                onClick={() => handleSocialRegister('google')}
                disabled={isLoading}
                className="w-full rounded-2xl bg-white hover:bg-gray-50 text-slate-800 border-2 border-slate-200 shadow-sm"
              >
                <Chrome className="w-5 h-5 mr-2 text-blue-500" />
                Зарегистрироваться с Google
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                onClick={() => handleSocialRegister('apple')}
                disabled={isLoading}
                className="w-full rounded-2xl bg-black hover:bg-gray-900 text-white shadow-sm"
              >
                <Apple className="w-5 h-5 mr-2" />
                Зарегистрироваться с Apple
              </Button>
            </motion.div>
          </div>

          <div className="flex items-center gap-3 my-6">
            <Separator className="flex-1" />
            <span className="text-sm text-slate-500">или</span>
            <Separator className="flex-1" />
          </div>

          {/* Register Method Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100/50 rounded-2xl">
            <button
              onClick={() => setRegisterMethod('email')}
              className={`flex-1 py-2 px-4 rounded-xl transition-all ${
                registerMethod === 'email'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <Mail className="w-4 h-4 inline-block mr-2" />
              Email
            </button>
            <button
              onClick={() => setRegisterMethod('phone')}
              className={`flex-1 py-2 px-4 rounded-xl transition-all ${
                registerMethod === 'phone'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <Phone className="w-4 h-4 inline-block mr-2" />
              Телефон
            </button>
          </div>

          {/* Register Forms */}
          <AnimatePresence mode="wait">
            {registerMethod === 'email' ? (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleEmailRegister}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700">Имя</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ваше имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-2xl border-slate-200 bg-white/50 focus:bg-white transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-2xl border-slate-200 bg-white/50 focus:bg-white transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-2xl border-slate-200 bg-white/50 focus:bg-white transition-colors pr-12"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">Минимум 8 символов</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700">Подтвердите пароль</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="rounded-2xl border-slate-200 bg-white/50 focus:bg-white transition-colors pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm text-slate-600 leading-tight">
                    Я согласен с{' '}
                    <button type="button" className="text-purple-600 hover:text-purple-700">
                      условиями использования
                    </button>{' '}
                    и{' '}
                    <button type="button" className="text-purple-600 hover:text-purple-700">
                      политикой конфиденциальности
                    </button>
                  </label>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Регистрация...
                      </>
                    ) : (
                      <>
                        <User className="w-5 h-5 mr-2" />
                        Создать аккаунт
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            ) : (
              <motion.form
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handlePhoneRegister}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name-phone" className="text-slate-700">Имя</Label>
                  <Input
                    id="name-phone"
                    type="text"
                    placeholder="Ваше имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-2xl border-slate-200 bg-white/50 focus:bg-white transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-register" className="text-slate-700">Номер телефона</Label>
                  <Input
                    id="phone-register"
                    type="tel"
                    placeholder="+7 (___) ___-__-__"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="rounded-2xl border-slate-200 bg-white/50 focus:bg-white transition-colors"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Мы отправим код подтверждения на этот номер
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms-phone"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="terms-phone" className="text-sm text-slate-600 leading-tight">
                    Я согласен с{' '}
                    <button type="button" className="text-purple-600 hover:text-purple-700">
                      условиями использования
                    </button>{' '}
                    и{' '}
                    <button type="button" className="text-purple-600 hover:text-purple-700">
                      политикой конфиденциальности
                    </button>
                  </label>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Phone className="w-5 h-5 mr-2" />
                        Получить код
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Login Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6"
        >
          <p className="text-slate-600">
            Уже есть аккаунт?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Войти
            </button>
          </p>
        </motion.div>

        {/* Bottom sparkles decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-2 mt-8"
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -10, 0],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            >
              <Sparkles className="w-4 h-4 text-pink-400" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

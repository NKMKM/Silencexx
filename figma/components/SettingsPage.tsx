import { useState } from 'react';
import { User, Bell, Moon, Palette, LogOut, Shield, HelpCircle, CreditCard, Crown, Image } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { useTheme, ChatBackground } from '../utils/ThemeContext';

interface SettingsPageProps {
  onLogout: () => void;
  onNavigateToBilling: () => void;
  onNavigateToAccount: () => void;
}

export function SettingsPage({ onLogout, onNavigateToBilling, onNavigateToAccount }: SettingsPageProps) {
  const { theme, setTheme, chatBackground, setChatBackground } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  const backgrounds: { id: ChatBackground; name: string; description: string }[] = [
    { id: 'gradient', name: 'Градиент', description: 'Классический мягкий градиент' },
    { id: 'clouds', name: 'Облака', description: 'Плавающие облачные формы' },
    { id: 'aurora', name: 'Аврора', description: 'Анимированное северное сияние' },
    { id: 'minimal', name: 'Минимал', description: 'Чистый простой фон' },
    { id: 'stars', name: 'Звезды', description: 'Мерцающие звездочки' },
  ];

  return (
    <div className={`h-full flex flex-col relative transition-all duration-500 ${
      theme === 'dark'
        ? 'bg-gradient-to-b from-slate-900 via-purple-950 to-slate-950'
        : 'bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50'
    }`}>
      {/* Header */}
      <div className={`backdrop-blur-2xl border-b px-4 py-4 shadow-sm transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-slate-900/60 border-slate-700/30'
          : 'bg-white/60 border-white/30'
      }`}>
        <div className="max-w-2xl mx-auto">
          <h1 className={`text-center transition-colors duration-300 ${
            theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
          }`}>Настройки</h1>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="max-w-2xl mx-auto p-3 md:p-4 space-y-4 md:space-y-6 pb-24">
          {/* Account Section */}
          <motion.div 
            className={`backdrop-blur-2xl rounded-3xl p-4 md:p-6 border shadow-xl transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-800/70 to-slate-900/50 border-slate-700/30'
                : 'bg-gradient-to-br from-white/70 to-white/50 border-white/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <User className="w-5 h-5 text-white" />
                </motion.div>
                <h2 className={`transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                }`}>Аккаунт</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/30'
                  : 'bg-white/50 border-white/30'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white">
                    ИИ
                  </div>
                  <div>
                    <p className={`transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                    }`}>Иван Иванов</p>
                    <p className={`text-sm transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>ivan@cloudmind.app</p>
                  </div>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={onNavigateToAccount}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                >
                  <User className="w-4 h-4 mr-2" />
                  Управление аккаунтом
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Billing Section */}
          <motion.div 
            className={`backdrop-blur-2xl rounded-3xl p-4 md:p-6 border shadow-xl transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-800/70 to-slate-900/50 border-slate-700/30'
                : 'bg-gradient-to-br from-white/70 to-white/50 border-white/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <CreditCard className="w-5 h-5 text-white" />
                </motion.div>
                <h2 className={`transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                }`}>Подписка</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700/30'
                  : 'bg-white/50 border-white/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`transition-colors duration-300 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>Текущий план</span>
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 text-white text-sm">
                    Бесплатный
                  </span>
                </div>
                <p className={`text-sm transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  10 сообщений в день, базовые функции
                </p>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={onNavigateToBilling}
                  className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Посмотреть все тарифы
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Preferences Section */}
          <motion.div 
            className={`backdrop-blur-2xl rounded-3xl p-4 md:p-6 border shadow-xl transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-800/70 to-slate-900/50 border-slate-700/30'
                : 'bg-gradient-to-br from-white/70 to-white/50 border-white/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <motion.div 
                className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Palette className="w-5 h-5 text-white" />
              </motion.div>
              <h2 className={`transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>Настройки</h2>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className={`w-5 h-5 transition-colors duration-300 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
                  }`} />
                  <div>
                    <Label className={`transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>Уведомления</Label>
                    <p className={`text-xs transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                    }`}>Получать уведомления об ответах</p>
                  </div>
                </div>
                <Switch 
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>

              <Separator className={theme === 'dark' ? 'bg-slate-700' : ''} />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Moon className={`w-5 h-5 transition-colors duration-300 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
                  }`} />
                  <div>
                    <Label className={`transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>Темная тема</Label>
                    <p className={`text-xs transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                    }`}>Использовать темную тему</p>
                  </div>
                </div>
                <Switch 
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>

              <Separator className={theme === 'dark' ? 'bg-slate-700' : ''} />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className={`w-5 h-5 transition-colors duration-300 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
                  }`} />
                  <div>
                    <Label className={`transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>Режим приватности</Label>
                    <p className={`text-xs transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                    }`}>Улучшенные настройки конфиденциальности</p>
                  </div>
                </div>
                <Switch 
                  checked={privacyMode}
                  onCheckedChange={setPrivacyMode}
                />
              </div>
            </div>
          </motion.div>

          {/* Chat Background Section */}
          <motion.div 
            className={`backdrop-blur-2xl rounded-3xl p-4 md:p-6 border shadow-xl transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-800/70 to-slate-900/50 border-slate-700/30'
                : 'bg-gradient-to-br from-white/70 to-white/50 border-white/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div 
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Image className="w-5 h-5 text-white" />
              </motion.div>
              <h2 className={`transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>Фон чата</h2>
            </div>

            <div className="space-y-2">
              {backgrounds.map((bg) => (
                <motion.button
                  key={bg.id}
                  onClick={() => setChatBackground(bg.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all duration-300 ${
                    chatBackground === bg.id
                      ? theme === 'dark'
                        ? 'bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-2 border-purple-500'
                        : 'bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-purple-400'
                      : theme === 'dark'
                      ? 'bg-slate-800/30 border border-slate-700/30 hover:bg-slate-700/50'
                      : 'bg-white/30 border border-white/30 hover:bg-white/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`transition-colors duration-300 ${
                        chatBackground === bg.id
                          ? theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
                          : theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>{bg.name}</p>
                      <p className={`text-xs transition-colors duration-300 ${
                        theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                      }`}>{bg.description}</p>
                    </div>
                    {chatBackground === bg.id && (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Support Section */}
          <motion.div 
            className={`backdrop-blur-2xl rounded-3xl p-4 md:p-6 border shadow-xl transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-800/70 to-slate-900/50 border-slate-700/30'
                : 'bg-gradient-to-br from-white/70 to-white/50 border-white/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div 
                className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <HelpCircle className="w-5 h-5 text-white" />
              </motion.div>
              <h2 className={`transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>Поддержка</h2>
            </div>

            <div className="space-y-2">
              <motion.button 
                className={`w-full text-left p-3 rounded-2xl transition-all duration-300 ${
                  theme === 'dark'
                    ? 'hover:bg-purple-500/20 text-slate-300'
                    : 'hover:bg-purple-50 text-slate-700'
                }`}
                whileHover={{ x: 5 }}
              >
                Центр помощи
              </motion.button>
              <motion.button 
                className={`w-full text-left p-3 rounded-2xl transition-all duration-300 ${
                  theme === 'dark'
                    ? 'hover:bg-purple-500/20 text-slate-300'
                    : 'hover:bg-purple-50 text-slate-700'
                }`}
                whileHover={{ x: 5 }}
              >
                Политика конфиденциальности
              </motion.button>
              <motion.button 
                className={`w-full text-left p-3 rounded-2xl transition-all duration-300 ${
                  theme === 'dark'
                    ? 'hover:bg-purple-500/20 text-slate-300'
                    : 'hover:bg-purple-50 text-slate-700'
                }`}
                whileHover={{ x: 5 }}
              >
                Условия использования
              </motion.button>
            </div>
          </motion.div>

          {/* Logout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={onLogout}
              variant="outline"
              className={`w-full rounded-2xl transition-all duration-300 ${
                theme === 'dark'
                  ? 'border-red-800 text-red-400 hover:bg-red-950/50 hover:text-red-300'
                  : 'border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Выйти
            </Button>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}

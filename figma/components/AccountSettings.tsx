import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, Mail, Phone, Lock, Camera, Save, Trash2, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

interface AccountSettingsProps {
  onNavigateBack: () => void;
}

export function AccountSettings({ onNavigateBack }: AccountSettingsProps) {
  const [name, setName] = useState('Иван Иванов');
  const [email, setEmail] = useState('ivan@cloudmind.app');
  const [phone, setPhone] = useState('+7 (999) 123-45-67');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Профиль обновлен!');
    }, 1000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Пароль изменен!');
    }, 1000);
  };

  const handleDeleteAccount = () => {
    // Confirm and delete account
    alert('Функция удаления аккаунта');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/80 via-purple-50/80 to-pink-50/80 relative">
      {/* Cloud-like background gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-white/40 via-transparent to-transparent opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="bg-white/60 backdrop-blur-2xl border-b border-white/30 px-4 py-3 flex items-center gap-3 shadow-sm relative z-10">
        <button
          onClick={onNavigateBack}
          className="p-2 hover:bg-purple-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-purple-600" />
        </button>
        <span className="text-slate-800">Настройки аккаунта</span>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-6 space-y-6 pb-12">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-2xl rounded-3xl p-6 border border-white/30 shadow-xl"
        >
          <h3 className="text-slate-800 mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Профиль
          </h3>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src="" alt={name} />
                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-2xl">
                  {name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <div>
              <h4 className="text-slate-800">{name}</h4>
              <p className="text-sm text-slate-600">Бесплатный план</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700">Имя</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-2xl border-slate-200 bg-white/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-2xl border-slate-200 bg-white/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-700 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Телефон
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-2xl border-slate-200 bg-white/50"
              />
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-6"
          >
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isSaving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Сохранить изменения
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-2xl rounded-3xl p-6 border border-white/30 shadow-xl"
        >
          <h3 className="text-slate-800 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Безопасность
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-slate-700">Текущий пароль</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="rounded-2xl border-slate-200 bg-white/50"
                placeholder="••••••••"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-700">Новый пароль</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-2xl border-slate-200 bg-white/50"
                placeholder="••••••••"
                minLength={8}
              />
              <p className="text-xs text-slate-500">Минимум 8 символов</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700">Подтвердите новый пароль</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-2xl border-slate-200 bg-white/50"
                placeholder="••••••••"
              />
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                <Lock className="w-5 h-5 mr-2" />
                Изменить пароль
              </Button>
            </motion.div>
          </form>
        </motion.div>

        {/* Connected Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-2xl rounded-3xl p-6 border border-white/30 shadow-xl"
        >
          <h3 className="text-slate-800 mb-4">Подключенные аккаунты</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-white/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-slate-800 text-sm">Google</p>
                  <p className="text-xs text-slate-600">{email}</p>
                </div>
              </div>
              <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
                Подключено
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/30 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                  <span className="text-white text-xl">🍎</span>
                </div>
                <div>
                  <p className="text-slate-800 text-sm">Apple ID</p>
                  <p className="text-xs text-slate-500">Не подключено</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl">
                Подключить
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-red-50/70 to-red-50/50 backdrop-blur-2xl rounded-3xl p-6 border border-red-200/30 shadow-xl"
        >
          <h3 className="text-red-800 mb-4">Опасная зона</h3>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full rounded-2xl">
                <Trash2 className="w-5 h-5 mr-2" />
                Удалить аккаунт
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие нельзя отменить. Все ваши данные, включая дневники, настроения и настройки будут удалены навсегда.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-2xl">Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="rounded-2xl bg-red-600 hover:bg-red-700"
                >
                  Удалить аккаунт
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      </div>
    </div>
  );
}

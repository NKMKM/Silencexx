import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Phone, Shield, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { FloatingClouds } from './FloatingClouds';

interface OTPPageProps {
  phone: string;
  onVerify: () => void;
  onNavigateBack: () => void;
}

export function OTPPage({ phone, onVerify, onNavigateBack }: OTPPageProps) {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onVerify();
    }, 1000);
  };

  const handleResend = () => {
    setCountdown(60);
    setCanResend(false);
    setOtp('');
    // Simulate resending
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/90 via-purple-50/90 to-pink-50/90 flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingClouds />
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onNavigateBack}
          className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад
        </motion.button>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/40"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-xl"
          >
            <Shield className="w-10 h-10 text-white" />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h2 className="text-slate-800 mb-2">Введите код</h2>
            <p className="text-slate-600 text-sm">
              Мы отправили 6-значный код на номер
            </p>
            <p className="text-slate-800 mt-1">{phone}</p>
          </motion.div>

          {/* OTP Input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp(value)}
              onComplete={handleVerify}
            >
              <InputOTPGroup className="gap-2 justify-center w-full">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="w-12 h-14 text-xl rounded-2xl border-2 border-slate-200 bg-white/50 focus:bg-white focus:border-purple-400 transition-all"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </motion.div>

          {/* Verify Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleVerify}
              disabled={otp.length !== 6 || isLoading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Проверка...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Подтвердить
                </>
              )}
            </Button>
          </motion.div>

          {/* Resend Code */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-6"
          >
            {canResend ? (
              <button
                onClick={handleResend}
                className="text-purple-600 hover:text-purple-700 transition-colors"
              >
                Отправить код повторно
              </button>
            ) : (
              <p className="text-slate-500 text-sm">
                Отправить повторно через{' '}
                <span className="text-purple-600">{countdown}с</span>
              </p>
            )}
          </motion.div>

          {/* Help Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 p-4 rounded-2xl bg-blue-50/50 border border-blue-200/30"
          >
            <p className="text-xs text-blue-900 text-center">
              💡 Не получили код? Проверьте папку "Спам" или запросите новый код
            </p>
          </motion.div>
        </motion.div>

        {/* Bottom sparkles decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
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
              <Sparkles className="w-4 h-4 text-blue-400" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

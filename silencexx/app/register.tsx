import { useState } from 'react';
import { useRouter } from 'expo-router';
import { RegisterPage } from '@/components/RegisterPage';
import { OTPPage } from '@/components/OTPPage';
import { DisclaimerModal } from '@/components/DisclaimerModal';
import { useDisclaimerState } from '@/hooks/useDisclaimerState';

type Screen = 'register' | 'otp';

export default function RegisterScreen() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<Screen>('register');
  const [contactForOTP, setContactForOTP] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { setShowDisclaimerAfterLogin } = useDisclaimerState();

  const handleRegister = () => {
    // Устанавливаем флаг что нужно показать дисклеймер после входа в чат
    setShowDisclaimerAfterLogin();
    // Переходим в чат
    router.replace('/(tabs)');
  };

  const handleNavigateToLogin = () => {
    router.back();
  };

  const handleNavigateToOTP = (contact: string) => {
    setContactForOTP(contact);
    setCurrentScreen('otp');
  };

  const handleOTPVerify = (code: string) => {
    // После успешной верификации регистрируем пользователя
    // Устанавливаем флаг что нужно показать дисклеймер после входа в чат
    setShowDisclaimerAfterLogin();
    // Переходим в чат
    router.replace('/(tabs)');
  };

  const handleDisclaimerAccept = () => {
    setShowDisclaimer(false);
    // Пользователь уже в чате, просто закрываем модаль
  };

  const handleDisclaimerReject = () => {
    setShowDisclaimer(false);
    // Пользователь не согласился - выходим из приложения
    router.replace('/(auth)');
  };

  const handleOTPBack = () => {
    setCurrentScreen('register');
  };

  if (currentScreen === 'otp') {
    return (
      <OTPPage
        contact={contactForOTP}
        onVerify={handleOTPVerify}
        onBack={handleOTPBack}
      />
    );
  }

  return (
    <>
      <RegisterPage
        onRegister={handleRegister}
        onNavigateToLogin={handleNavigateToLogin}
        onNavigateToOTP={handleNavigateToOTP}
      />
      <DisclaimerModal
        visible={showDisclaimer}
        onAccept={handleDisclaimerAccept}
        onReject={handleDisclaimerReject}
      />
    </>
  );
}


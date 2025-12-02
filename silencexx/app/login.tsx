import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LoginPage } from '@/components/LoginPage';
import { OTPPage } from '@/components/OTPPage';
import { ForgotPasswordPage } from '@/components/ForgotPasswordPage';
import { DisclaimerModal } from '@/components/DisclaimerModal';
import { useDisclaimerState } from '@/hooks/useDisclaimerState';

type Screen = 'login' | 'otp' | 'forgotPassword';

export default function LoginScreen() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [contactForOTP, setContactForOTP] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { setShowDisclaimerAfterLogin } = useDisclaimerState();

  const handleLogin = () => {
    // Устанавливаем флаг что нужно показать дисклеймер после входа в чат
    setShowDisclaimerAfterLogin();
    // Переходим в чат
    router.replace('/(tabs)');
  };

  const handleNavigateToRegister = () => {
    router.push('/register');
  };

  const handleNavigateToOTP = (contact: string) => {
    setContactForOTP(contact);
    setCurrentScreen('otp');
  };

  const handleNavigateToForgotPassword = () => {
    setCurrentScreen('forgotPassword');
  };

  const handleOTPVerify = (code: string) => {
    // После успешной верификации OTP
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
    setCurrentScreen('login');
  };

  const handleForgotPasswordBack = () => {
    setCurrentScreen('login');
  };

  const handlePasswordReset = () => {
    // После успешного сброса пароля
    setCurrentScreen('login');
  };

  const handleForgotPasswordNavigateToOTP = (contact: string) => {
    setContactForOTP(contact);
    setCurrentScreen('otp');
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

  if (currentScreen === 'forgotPassword') {
    return (
      <ForgotPasswordPage
        onBack={handleForgotPasswordBack}
        onPasswordReset={handlePasswordReset}
        onNavigateToOTP={handleForgotPasswordNavigateToOTP}
      />
    );
  }

  return (
    <>
      <LoginPage
        onLogin={handleLogin}
        onNavigateToRegister={handleNavigateToRegister}
        onNavigateToOTP={handleNavigateToOTP}
        onNavigateToForgotPassword={handleNavigateToForgotPassword}
      />
      <DisclaimerModal
        visible={showDisclaimer}
        onAccept={handleDisclaimerAccept}
        onReject={handleDisclaimerReject}
      />
    </>
  );
}


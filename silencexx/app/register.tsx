import { useState } from 'react';
import { useRouter } from 'expo-router';
import { RegisterPage } from '@/components/RegisterPage';
import { OTPPage } from '@/components/OTPPage';

type Screen = 'register' | 'otp';

export default function RegisterScreen() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<Screen>('register');
  const [contactForOTP, setContactForOTP] = useState('');

  const handleRegister = () => {
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
    router.replace('/(tabs)');
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
    <RegisterPage
      onRegister={handleRegister}
      onNavigateToLogin={handleNavigateToLogin}
      onNavigateToOTP={handleNavigateToOTP}
    />
  );
}


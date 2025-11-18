import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LoginPage } from '@/components/LoginPage';
import { OTPPage } from '@/components/OTPPage';
import { ForgotPasswordPage } from '@/components/ForgotPasswordPage';

type Screen = 'login' | 'otp' | 'forgotPassword';

export default function LoginScreen() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [contactForOTP, setContactForOTP] = useState('');

  const handleLogin = () => {
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
    router.replace('/(tabs)');
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
    <LoginPage
      onLogin={handleLogin}
      onNavigateToRegister={handleNavigateToRegister}
      onNavigateToOTP={handleNavigateToOTP}
      onNavigateToForgotPassword={handleNavigateToForgotPassword}
    />
  );
}


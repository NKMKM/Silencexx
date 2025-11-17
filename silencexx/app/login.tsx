import { useRouter } from 'expo-router';
import { LoginPage } from '@/components/LoginPage';

export default function LoginScreen() {
  const router = useRouter();

  const handleLogin = () => {
    router.replace('/(tabs)');
  };

  const handleNavigateToRegister = () => {
    router.push('/register');
  };

  const handleNavigateToOTP = (phone: string) => {
    // Could navigate to OTP screen with phone param
    // For now just login
    router.replace('/(tabs)');
  };

  return (
    <LoginPage
      onLogin={handleLogin}
      onNavigateToRegister={handleNavigateToRegister}
      onNavigateToOTP={handleNavigateToOTP}
    />
  );
}


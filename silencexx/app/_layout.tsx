import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider } from '@/utils/ThemeContext';
import { LanguageProvider } from '@/utils/LanguageProvider';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              animation: 'fade',
              animationDuration: 300,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="register" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="chat" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="settings" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="billing" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="payment" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </NavigationThemeProvider>
      </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, Alert } from 'react-native';
import { axiosInstance } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Google Sign-In 
 * NOTE: Not available in Expo Go - requires development build
 */
export const signInWithGoogle = async () => {
  Alert.alert(
    'Development Build Required',
    'Google Sign-In requires a development build and cannot work in Expo Go. Please use email/phone authentication or create a development build with `npx expo prebuild`.',
    [{ text: 'OK' }]
  );
  
  return { 
    success: false, 
    error: 'Google OAuth requires native modules not available in Expo Go' 
  };
};

/**
 * Apple Sign-In (iOS only)
 */
export const signInWithApple = async () => {
  try {
    console.log('🍎 Starting Apple Sign-In...');
    
    // Check availability (iOS 13+)
    if (Platform.OS !== 'ios') {
      const msg = 'Apple Sign-In is only available on iOS';
      Alert.alert('Not Available', msg);
      return {
        success: false,
        error: msg,
      };
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      const msg = 'Apple Sign-In not available on this device (requires iOS 13+)';
      Alert.alert('Not Available', msg);
      return {
        success: false,
        error: msg,
      };
    }

    console.log('✅ Apple authentication available');

    // Request Apple authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    console.log('🔑 Apple credentials received:', {
      hasToken: !!credential.identityToken,
      hasUser: !!credential.user,
      hasEmail: !!credential.email,
    });

    if (!credential.identityToken || !credential.user) {
      throw new Error('Missing identityToken or user from Apple');
    }

    // Build user name (Apple may not provide email on repeat logins)
    const fullName = credential.fullName;
    const name = fullName?.givenName 
      ? `${fullName.givenName} ${fullName.familyName || ''}`.trim()
      : 'Apple User';

    console.log('📤 Sending to backend:', { email: credential.email, name, appleId: credential.user });

    // Send to backend
    const response = await axiosInstance.post('/auth/oauth/apple', {
      identityToken: credential.identityToken,
      email: credential.email, // May be null on repeat logins
      name,
      appleId: credential.user,
    });

    console.log('✅ Backend response:', response.data);

    if (response.data.success && response.data.token) {
      // Save token
      await AsyncStorage.setItem('authToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      Alert.alert('Success', 'Successfully signed in with Apple!');
      
      return {
        success: true,
        user: response.data.user,
        token: response.data.token,
      };
    }

    throw new Error(response.data.error || 'Apple auth failed');

  } catch (error: any) {
    console.error('❌ Apple Sign-In error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
    });

    // Handle Apple Sign-In errors
    if (error.code === 'ERR_CANCELED') {
      console.log('User cancelled Apple Sign-In');
      return { success: false, error: 'User cancelled Apple Sign-In' };
    }

    // Network error - backend not reachable
    if (error.message === 'Network Error') {
      Alert.alert(
        'Connection Error',
        'Cannot connect to server. Make sure:\n1. Backend server is running\n2. You are on the same Wi-Fi network\n3. Firewall allows connections'
      );
      return { success: false, error: 'Network Error - cannot reach backend' };
    }

    const errorMsg = error.response?.data?.error || error.message || 'Failed to sign in with Apple';
    Alert.alert('Apple Sign-In Error', errorMsg);
    
    return {
      success: false,
      error: errorMsg,
    };
  }
};

/**
 * Sign out
 */
export const signOutOAuth = async () => {
  try {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
    return { success: true };
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return { success: false, error: error.message };
  }
};

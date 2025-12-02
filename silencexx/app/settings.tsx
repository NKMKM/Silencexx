import React from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/utils/ThemeContext';
import SettingsPage from '../components/SettingsPage';

export default function Settings() {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={isDark ? ['#0f172a', '#1e293b', '#334155'] : ['#e0e7ff', '#ddd6fe', '#e9d5ff']}
          style={StyleSheet.absoluteFillObject}
        />
        
        <SettingsPage />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

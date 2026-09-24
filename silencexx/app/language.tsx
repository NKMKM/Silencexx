import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export default function LanguageScreen() {
  const isDark = true; // Force dark theme
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedLanguage, setSelectedLanguage] = useState('ru');

  const handleSelectLanguage = (code: string) => {
    setSelectedLanguage(code);
    // TODO: Сохранить выбор языка
    setTimeout(() => {
      router.back();
    }, 300);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Theme.accent.gradient}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={Theme.accent.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={[styles.headerIconContainer, { backgroundColor: 'rgba(255, 107, 0, 0.2)' }]}>
            <Ionicons name="language" size={24} color={Theme.accent.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: Theme.text.primary }]}>
              Язык приложения
            </Text>
            <Text style={[styles.headerSubtitle, { color: Theme.text.secondary }]}>
              Выберите предпочитаемый язык
            </Text>
          </View>
        </View>
      </View>

      {/* Languages List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}>
        {LANGUAGES.map((language, index) => (
          <Animated.View
            key={language.code}
            entering={FadeInDown.duration(400).delay(index * 50)}>
            <TouchableOpacity
              style={[
                styles.languageCard,
                {
                  backgroundColor: selectedLanguage === language.code
                    ? 'rgba(255, 107, 0, 0.15)'
                    : Theme.background.card,
                  borderColor: selectedLanguage === language.code
                    ? Theme.accent.primary
                    : Theme.background.tertiary,
                  borderWidth: selectedLanguage === language.code ? 2 : 1.5,
                },
              ]}
              onPress={() => handleSelectLanguage(language.code)}>
              <View style={styles.languageLeft}>
                <Text style={styles.flag}>{language.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={[styles.languageName, { color: Theme.text.primary }]}>
                    {language.nativeName}
                  </Text>
                  <Text style={[styles.languageEnglish, { color: Theme.text.secondary }]}>
                    {language.name}
                  </Text>
                </View>
              </View>
              {selectedLanguage === language.code && (
                <View style={[styles.checkContainer, { backgroundColor: Theme.accent.primary }]}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background.primary,
  },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: Theme.background.elevated,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: Theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.background.elevated,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 5,
    color: Theme.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    gap: 14,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.border.primary,
    backgroundColor: Theme.background.card,
    shadowColor: '#0A0A0F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    flex: 1,
  },
  flag: {
    fontSize: 34,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 3,
    color: Theme.text.primary,
  },
  languageEnglish: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.text.secondary,
  },
  checkContainer: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.accent.primary,
  },
});

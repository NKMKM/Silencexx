import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState('User');
  const [email, setEmail] = useState('user@example.com');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  const handleLogout = () => {
    router.replace('/login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.container}>
      <LinearGradient
        colors={['#EEF2FF', '#FAF5FF', '#FFF1F2']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#9333EA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройки</Text>
        <View style={{ width: 50 }} />
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Account Section */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#60A5FA', '#A78BFA']}
              style={styles.sectionIcon}
            >
              <Ionicons name="person" size={20} color="white" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Аккаунт</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Имя</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <TouchableOpacity>
            <LinearGradient
              colors={['#3B82F6', '#9333EA']}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Сохранить изменения</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Preferences Section */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#A78BFA', '#EC4899']}
              style={styles.sectionIcon}
            >
              <Ionicons name="color-palette" size={20} color="white" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Настройки</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications" size={20} color="#A78BFA" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Уведомления</Text>
                <Text style={styles.settingDescription}>
                  Получать уведомления о сообщениях
                </Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#E2E8F0', true: '#A78BFA' }}
              thumbColor={notifications ? '#7C3AED' : '#CBD5E1'}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={20} color="#A78BFA" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Тёмная тема</Text>
                <Text style={styles.settingDescription}>
                  Использовать тёмную тему
                </Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E2E8F0', true: '#A78BFA' }}
              thumbColor={darkMode ? '#7C3AED' : '#CBD5E1'}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield" size={20} color="#A78BFA" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Режим приватности</Text>
                <Text style={styles.settingDescription}>
                  Расширенные настройки приватности
                </Text>
              </View>
            </View>
            <Switch
              value={privacyMode}
              onValueChange={setPrivacyMode}
              trackColor={{ false: '#E2E8F0', true: '#A78BFA' }}
              thumbColor={privacyMode ? '#7C3AED' : '#CBD5E1'}
            />
          </View>
        </Animated.View>

        {/* Devices Section */}
        <Animated.View
          entering={FadeInDown.delay(250)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#34D399', '#22C55E']}
              style={styles.sectionIcon}
            >
              <Ionicons name="phone-portrait" size={20} color="white" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Устройства</Text>
          </View>

          <Text style={styles.devicesDescription}>
            Здесь будут отображаться все устройства, привязанные к вашему аккаунту.
          </Text>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/devices')}
          >
            <Text style={styles.linkText}>Управление устройствами</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </Animated.View>

        {/* Support Section */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#EC4899', '#FB923C']}
              style={styles.sectionIcon}
            >
              <Ionicons name="help-circle" size={20} color="white" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Поддержка</Text>
          </View>

          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>Центр помощи</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>Политика конфиденциальности</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>Условия использования</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Выйти</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    devicesDescription: {
      fontSize: 13,
      color: '#64748B',
      marginTop: 8,
      marginBottom: 12,
    },
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#94A3B8',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 15,
    color: '#475569',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});

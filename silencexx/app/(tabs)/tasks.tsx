/**
 * Ежедневные задания от ИИ
 * Каждый день генерируется новое персонализированное задание
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { dailyTasksApi, DailyTask } from '@/services/api';
import { Theme } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Цвета для тем заданий
const THEME_COLORS: Record<string, { primary: string; gradient: string[] }> = {
  mindfulness: { primary: '#8B5CF6', gradient: ['#8B5CF6', '#6D28D9'] },
  gratitude: { primary: '#EC4899', gradient: ['#EC4899', '#DB2777'] },
  connection: { primary: '#06B6D4', gradient: ['#06B6D4', '#0891B2'] },
  growth: { primary: '#10B981', gradient: ['#10B981', '#059669'] },
  creativity: { primary: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
  reflection: { primary: '#6366F1', gradient: ['#6366F1', '#4F46E5'] },
  default: { primary: '#A855F7', gradient: ['#A855F7', '#7C3AED'] },
};

// Иконки для тем
const THEME_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  mindfulness: 'leaf',
  gratitude: 'heart',
  connection: 'people',
  growth: 'trending-up',
  creativity: 'color-palette',
  reflection: 'book',
  default: 'sparkles',
};

export default function DailyTasksScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [task, setTask] = useState<DailyTask | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  
  // Анимации
  const cardScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  
  // Загрузка данных
  const loadTask = useCallback(async () => {
    try {
      const response = await dailyTasksApi.getTask();
      if (response.success && response.task) {
        setTask(response.task);
      }
    } catch (error) {
      console.log('Failed to load daily task');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    loadTask();
    
    // Анимации
    cardScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1500 }),
        withTiming(0.2, { duration: 1500 })
      ),
      -1,
      true
    );
  }, [loadTask]);
  
  // Таймер до обновления
  useEffect(() => {
    const updateTimer = () => {
      if (!task?.expiresAt) return;
      
      const now = new Date();
      const expires = new Date(task.expiresAt);
      const diff = expires.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Обновляется...');
        loadTask();
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}ч ${minutes}м`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [task?.expiresAt, loadTask]);
  
  // Открыть задание
  const handleOpenTask = async () => {
    if (!task || task.status !== 'locked') return;
    
    try {
      const response = await dailyTasksApi.openTask(task.id);
      if (response.success) {
        // Перезагружаем задание для получения полных данных
        await loadTask();
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось открыть задание');
    }
  };
  
  // Завершить задание
  const handleCompleteTask = async () => {
    if (!task || task.status !== 'opened') return;
    
    Alert.alert(
      '✨ Завершить задание?',
      'Вы уверены, что выполнили это задание?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Да, выполнил!',
          onPress: async () => {
            try {
              const response = await dailyTasksApi.completeTask(task.id);
              if (response.success) {
                // Перезагружаем для получения обновленного стрика
                await loadTask();
                const updatedStreak = task.streak + 1;
                Alert.alert(
                  '🎉 Отлично!',
                  `Задание выполнено!\nВаш стрик: ${updatedStreak} 🔥`
                );
              }
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось завершить задание');
            }
          },
        },
      ]
    );
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadTask();
  };
  
  // Анимированные стили
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
  
  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));
  
  // Получить цвет и иконку для темы
  const getThemeStyle = () => {
    const theme = task?.theme?.toLowerCase() || 'default';
    return THEME_COLORS[theme] || THEME_COLORS.default;
  };
  
  const getThemeIcon = () => {
    const theme = task?.theme?.toLowerCase() || 'default';
    return THEME_ICONS[theme] || THEME_ICONS.default;
  };
  
  // Статус-бейдж
  const renderStatusBadge = () => {
    if (!task) return null;
    
    const statusConfig = {
      locked: { color: '#6B7280', text: '🔒 Заблокировано', icon: 'lock-closed' },
      opened: { color: '#10B981', text: '✅ Открыто', icon: 'checkmark-circle' },
      completed: { color: '#A855F7', text: '🎉 Выполнено', icon: 'trophy' },
    };
    
    const config = statusConfig[task.status];
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
        <Ionicons name={config.icon as any} size={14} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
      </View>
    );
  };
  
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LinearGradient
          colors={Theme.gradients.backgroundMain}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={Theme.accent.primary} />
        <Text style={styles.loadingText}>Загрузка задания...</Text>
      </View>
    );
  }
  
  const themeStyle = getThemeStyle();
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Theme.gradients.backgroundMain}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 100 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Theme.accent.primary}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ваше задание</Text>
            <Text style={styles.title}>на сегодня</Text>
          </View>
          
          {/* Streak Badge */}
          <View style={styles.streakContainer}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.streakBadge}
            >
              <Ionicons name="flame" size={20} color="#fff" />
              <Text style={styles.streakNumber}>{task?.streak || 0}</Text>
            </LinearGradient>
            <Text style={styles.streakLabel}>стрик</Text>
          </View>
        </Animated.View>
        
        {/* Timer */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.timerContainer}>
          <Ionicons name="time-outline" size={16} color={Theme.text.tertiary} />
          <Text style={styles.timerText}>Обновится через {timeLeft}</Text>
        </Animated.View>
        
        {/* Task Card */}
        {task ? (
          <Animated.View entering={ZoomIn.delay(300)}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={task.status === 'locked' ? handleOpenTask : undefined}
            >
              <Animated.View style={[styles.taskCard, cardAnimatedStyle]}>
                {/* Glow Effect */}
                <Animated.View 
                  style={[
                    styles.cardGlow, 
                    glowAnimatedStyle,
                    { backgroundColor: themeStyle.primary }
                  ]} 
                />
                
                <LinearGradient
                  colors={themeStyle.gradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.taskCardGradient}
                >
                  {/* Theme Icon */}
                  <View style={styles.themeIconContainer}>
                    <Ionicons name={getThemeIcon()} size={48} color="rgba(255,255,255,0.9)" />
                  </View>
                  
                  {/* Status Badge */}
                  {renderStatusBadge()}
                  
                  {/* Task Content */}
                  <View style={styles.taskContent}>
                    <Text style={styles.taskTheme}>{task.theme || 'Задание дня'}</Text>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskDescription}>{task.description}</Text>
                  </View>
                  
                  {/* Action Hint */}
                  {task.status === 'locked' && (
                    <View style={styles.actionHint}>
                      <Ionicons name="hand-left" size={20} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.actionHintText}>Нажмите, чтобы открыть</Text>
                    </View>
                  )}
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.noTaskContainer}>
            <Ionicons name="sparkles-outline" size={64} color={Theme.text.tertiary} />
            <Text style={styles.noTaskTitle}>Задание скоро появится</Text>
            <Text style={styles.noTaskText}>
              Потяните вниз, чтобы обновить
            </Text>
          </View>
        )}
        
        {/* Complete Button */}
        {task?.status === 'opened' && (
          <Animated.View entering={FadeInUp.delay(400)}>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleCompleteTask}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.completeButtonGradient}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.completeButtonText}>Задание выполнено</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
        
        {/* Completed Message */}
        {task?.status === 'completed' && (
          <Animated.View entering={FadeInUp.delay(400)} style={styles.completedMessage}>
            <Ionicons name="trophy" size={32} color="#F59E0B" />
            <Text style={styles.completedTitle}>Отличная работа!</Text>
            <Text style={styles.completedText}>
              Вы выполнили сегодняшнее задание.{'\n'}
              Новое появится завтра.
            </Text>
          </Animated.View>
        )}
        
        {/* Tips Section */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Советы</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              • Выполняйте задания каждый день для роста стрика
            </Text>
            <Text style={styles.tipText}>
              • Задания персонализированы под вас с помощью ИИ
            </Text>
            <Text style={styles.tipText}>
              • Не торопитесь - важен процесс, а не скорость
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background.primary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Theme.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  greeting: {
    fontSize: 14,
    color: Theme.text.tertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    color: Theme.text.primary,
    fontWeight: '700',
  },
  
  // Streak
  streakContainer: {
    alignItems: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  streakLabel: {
    fontSize: 11,
    color: Theme.text.tertiary,
    marginTop: 4,
  },
  
  // Timer
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  timerText: {
    fontSize: 13,
    color: Theme.text.tertiary,
  },
  
  // Task Card
  taskCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
  },
  cardGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 44,
  },
  taskCardGradient: {
    padding: 24,
    minHeight: 280,
  },
  themeIconContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    opacity: 0.3,
  },
  taskContent: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTheme: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  taskDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24,
  },
  
  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Action Hint
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  actionHintText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  
  // No Task
  noTaskContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noTaskTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noTaskText: {
    fontSize: 14,
    color: Theme.text.secondary,
    textAlign: 'center',
  },
  
  // Complete Button
  completeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  
  // Completed Message
  completedMessage: {
    alignItems: 'center',
    backgroundColor: Theme.background.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Theme.border.primary,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  completedText: {
    fontSize: 14,
    color: Theme.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Tips
  tipsSection: {
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.text.primary,
    marginBottom: 12,
  },
  tipCard: {
    backgroundColor: Theme.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.border.primary,
  },
  tipText: {
    fontSize: 14,
    color: Theme.text.secondary,
    lineHeight: 22,
    marginBottom: 4,
  },
});

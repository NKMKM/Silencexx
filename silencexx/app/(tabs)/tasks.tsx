import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useTheme } from '@/utils/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, ZoomIn, Layout } from 'react-native-reanimated';

interface DailyTask {
  id: number;
  title: string;
  description: string;
  theme: string;
  status: 'locked' | 'opened' | 'completed';
  streak: number;
}

export default function DailyTasksScreen() {
  const insets = useSafeAreaInsets();
  const { theme, activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  
  const [task, setTask] = useState<DailyTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipping, setFlipping] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Таймер до обновления
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const diff = tomorrow.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000); // Добавим секунды для живости

      setTimeLeft(`${hours}ч ${minutes}м`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Обновляем раз в минуту
    return () => clearInterval(interval);
  }, []);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const response = await api.get('/daily-task');
      if (response.data.success) {
        setTask(response.data.task);
      }
    } catch (error) {
      console.error('Failed to fetch daily task', error);
      Alert.alert('Ошибка', 'Не удалось загрузить задание');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, []);

  const handleOpenTask = async () => {
    if (!task) return;
    setFlipping(true);
    try {
      const response = await api.put('/daily-task/open', { taskId: task.id });
      if (response.data.success) {
        setTask(prev => prev ? { ...prev, status: 'opened' } : null);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось открыть задание');
    } finally {
      setFlipping(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!task) return;
    try {
      const response = await api.put('/daily-task/complete', { taskId: task.id });
      if (response.data.success) {
        setTask(prev => prev ? { ...prev, status: 'completed', streak: response.data.streak } : null);
        Alert.alert('Поздравляем!', `Задание выполнено! Ваш стрик: ${response.data.streak} 🔥`);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось завершить задание');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const isLocked = task?.status === 'locked';
  const isCompleted = task?.status === 'completed';

  // Gradient Colors based on Theme
  const backgroundColors = isDark 
    ? ['#1E293B', '#0F172A'] 
    : ['#F8FAFC', '#E2E8F0'];

  const lockedGradient = ['#6366f1', '#4338ca'];
  const completedGradient = ['#10b981', '#059669'];
  const cardGradient = isDark
    ? ['#334155', '#1e293b']
    : ['#ffffff', '#f1f5f9'];

  return (
    <LinearGradient
      colors={backgroundColors as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.dateText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={[styles.title, { color: isDark ? '#f8fafc' : '#1e293b' }]}>Задание дня</Text>
          
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={14} color={isDark ? '#64748b' : '#94a3b8'} />
            <Text style={[styles.timerText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
              Обновление через: {timeLeft}
            </Text>
          </View>
        </View>

        <View style={styles.streakContainer}>
          <LinearGradient
            colors={['#F59E0B', '#EA580C']}
            style={styles.streakBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="flame" size={18} color="#fff" />
            <Text style={styles.streakText}>{task?.streak || 0}</Text>
          </LinearGradient>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.cardWrapper}
        >
          <TouchableOpacity 
            activeOpacity={isLocked ? 0.8 : 1}
            onPress={isLocked ? handleOpenTask : undefined}
            style={styles.cardContainer}
            disabled={!isLocked}
          >
            <LinearGradient
              colors={isLocked 
                ? lockedGradient as any
                : isCompleted 
                  ? completedGradient as any
                  : cardGradient as any}
              style={[
                styles.card, 
                { 
                  borderColor: isLocked || isCompleted 
                    ? 'transparent' 
                    : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderWidth: 1
                }
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isLocked ? (
                 <Animated.View entering={ZoomIn} style={styles.lockedContent}>
                    <View style={styles.lockIconCircle}>
                      <Ionicons name="gift" size={32} color="#4f46e5" />
                    </View>
                    <Text style={styles.lockedText}>Новое задание ожидает</Text>
                    <View style={styles.themeTagLocked}>
                      <Text style={styles.lockedSubText}>{task?.theme}</Text>
                    </View>
                    <Text style={styles.tapToOpen}>Коснитесь, чтобы открыть</Text>
                 </Animated.View>
              ) : (
                <Animated.View entering={FadeIn} style={styles.openedContent}>
                  <View style={styles.cardHeader}>
                    <View style={[
                        styles.themeBadge, 
                        { backgroundColor: isCompleted ? 'rgba(255,255,255,0.2)' : isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)' }
                      ]}>
                      <Text style={[styles.themeText, { color: isCompleted ? '#fff' : '#6366f1' }]}>{task?.theme}</Text>
                    </View>
                    {isCompleted && (
                      <Animated.View entering={ZoomIn.springify()}>
                        <Ionicons name="checkmark-circle" size={28} color="#fff" />
                      </Animated.View>
                    )}
                  </View>

                  <Text style={[styles.taskTitle, { color: isCompleted ? '#fff' : (isDark ? '#f1f5f9' : '#1e293b') }]}>
                    {task?.title}
                  </Text>
                  
                  <View style={[styles.divider, { backgroundColor: isCompleted ? 'rgba(255,255,255,0.3)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') }]} />
                  
                  <Text style={[styles.taskDescription, { color: isCompleted ? '#f1f5f9' : (isDark ? '#cbd5e1' : '#475569') }]}>
                    {task?.description}
                  </Text>

                  {isCompleted && (
                     <View style={styles.completedFooter}>
                       <Text style={styles.completedText}>Вы отлично справились! {'\n'}Новое задание завтра.</Text>
                     </View>
                  )}
                </Animated.View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {!isLocked && !isCompleted && (
          <Animated.View 
            entering={FadeInDown.delay(300).springify()}
            layout={Layout.springify()}
          >
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleCompleteTask}
              style={{ shadowColor: '#6366f1', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}
            >
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                style={styles.completeButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>Отметить как выполненное</Text>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 14,
    textTransform: 'capitalize',
    marginBottom: 4,
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  streakContainer: {
    paddingTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  streakText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 10,
  },
  cardContainer: {
    minHeight: 340,
    marginBottom: 24,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    borderRadius: 32,
    padding: 32,
    minHeight: 340,
    justifyContent: 'center',
  },
  lockedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  timerContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardWrapper: {
    marginBottom: 24,
  },
  lockIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  lockedText: {
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
    fontWeight: '800',
    marginTop: 8,
  },
  themeTagLocked: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  lockedSubText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tapToOpen: {
    color: '#fff',
    fontSize: 12,
    marginTop: 24,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  openedContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  themeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  themeText: {
    fontWeight: '700',
    fontSize: 13,
  },
  taskTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 24,
  },
  taskDescription: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
  },
  completedFooter: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
  },
  completedText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  completeButton: {
    paddingVertical: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

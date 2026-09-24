/**
 * Календарь + Дневник настроения
 * Просмотр записей по датам, визуализация настроения
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
} from 'react-native-reanimated';
import { journalApi } from '@/services/api';
import { Theme } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// 40 = paddingHorizontal (20*2) from scrollContent, 16 = padding from calendarGrid (8*2)
const DAY_SIZE = Math.floor((SCREEN_WIDTH - 40 - 16) / 7);

// Настроения с цветами
const MOODS = [
  { emoji: '😊', label: 'Отлично', color: '#10B981' },
  { emoji: '🙂', label: 'Хорошо', color: '#3B82F6' },
  { emoji: '😐', label: 'Нормально', color: '#F59E0B' },
  { emoji: '😔', label: 'Грустно', color: '#6366F1' },
  { emoji: '😰', label: 'Тревожно', color: '#EF4444' },
];

// Дни недели
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

interface JournalEntry {
  date: string;
  mood: string;
  content: string;
  color: string;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entries, setEntries] = useState<Map<string, JournalEntry>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [entryText, setEntryText] = useState('');
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  
  // Загрузка данных
  const loadEntries = useCallback(async () => {
    try {
      const listRes = await journalApi.listEntries();
      if (listRes?.dates) {
        const entriesMap = new Map<string, JournalEntry>();
        
        for (const d of listRes.dates) {
          try {
            const entryRes = await journalApi.getEntry(d.date);
            if (entryRes?.entry) {
              const content = entryRes.entry.diary_content || '';
              // Парсим emoji настроения из начала записи
              const moodMatch = content.match(/^([\u{1F600}-\u{1F64F}]|[\u{1F910}-\u{1F9FF}]|😊|🙂|😐|😔|😰)/u);
              const moodEmoji = moodMatch ? moodMatch[1] : '📝';
              const text = content.replace(/^[\u{1F600}-\u{1F64F}\u{1F910}-\u{1F9FF}😊🙂😐😔😰]\s*/u, '').trim();
              
              const moodData = MOODS.find(m => m.emoji === moodEmoji);
              
              entriesMap.set(d.date, {
                date: d.date,
                mood: moodEmoji,
                content: text,
                color: moodData?.color || Theme.accent.primary,
              });
            }
          } catch (e) {
            console.log('Error loading entry for', d.date);
          }
        }
        
        setEntries(entriesMap);
      }
    } catch (error) {
      console.log('Error loading journal entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);
  
  const onRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };
  
  // Навигация по месяцам
  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentMonth(new Date());
  };
  
  // Генерация дней для календаря
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Корректируем день недели (0=Пн, 6=Вс)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;
    
    const days: (number | null)[] = [];
    
    // Пустые ячейки до первого дня
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Дни месяца
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i);
    }
    
    return days;
  };
  
  // Форматирование даты
  const formatDate = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };
  
  // Проверка: сегодня ли это
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };
  
  // Проверка: будущая ли это дата
  const isFuture = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };
  
  // Нажатие на день
  const handleDayPress = (day: number) => {
    if (isFuture(day)) return;
    
    const dateStr = formatDate(day);
    const entry = entries.get(dateStr);
    
    if (entry) {
      setViewingEntry(entry);
    } else {
      setSelectedDate(dateStr);
      setShowModal(true);
    }
  };
  
  // Сохранить запись
  const saveEntry = async () => {
    if (!selectedDate || !entryText.trim()) return;
    
    try {
      const content = `${selectedMood.emoji} ${entryText}`;
      await journalApi.createEntry(selectedDate, content);
      
      const newEntry: JournalEntry = {
        date: selectedDate,
        mood: selectedMood.emoji,
        content: entryText,
        color: selectedMood.color,
      };
      
      setEntries(prev => new Map(prev).set(selectedDate, newEntry));
      setShowModal(false);
      setEntryText('');
      setSelectedDate(null);
      
      Alert.alert('✨ Сохранено!', 'Запись добавлена в дневник');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить запись');
    }
  };
  
  const days = generateCalendarDays();
  
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LinearGradient colors={Theme.gradients.backgroundMain} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={Theme.accent.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <LinearGradient colors={Theme.gradients.backgroundMain} style={StyleSheet.absoluteFill} />
      
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
          <Text style={styles.title}>Календарь</Text>
          <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
            <Text style={styles.todayButtonText}>Сегодня</Text>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Month Navigation */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.monthNav}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={Theme.text.primary} />
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={Theme.text.primary} />
          </TouchableOpacity>
        </Animated.View>
        
        {/* Weekdays Header */}
        <View style={styles.weekdaysRow}>
          {WEEKDAYS.map((day, index) => (
            <View key={day} style={styles.weekdayCell}>
              <Text style={[
                styles.weekdayText,
                index >= 5 && styles.weekendText
              ]}>
                {day}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Calendar Grid */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.calendarGrid}>
          {days.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }
            
            const dateStr = formatDate(day);
            const entry = entries.get(dateStr);
            const today = isToday(day);
            const future = isFuture(day);
            
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  today && styles.todayCell,
                  entry && { backgroundColor: `${entry.color}20` },
                ]}
                onPress={() => handleDayPress(day)}
                disabled={future}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayText,
                  today && styles.todayText,
                  future && styles.futureText,
                  entry && { color: entry.color },
                ]}>
                  {day}
                </Text>
                
                {entry && (
                  <Text style={styles.dayMood}>{entry.mood}</Text>
                )}
                
                {today && !entry && (
                  <View style={styles.todayDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
        
        {/* Legend */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.legend}>
          <Text style={styles.legendTitle}>Настроения:</Text>
          <View style={styles.legendItems}>
            {MOODS.map((mood) => (
              <View key={mood.label} style={styles.legendItem}>
                <Text style={styles.legendEmoji}>{mood.emoji}</Text>
                <Text style={[styles.legendLabel, { color: mood.color }]}>{mood.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
        
        {/* Recent Entries */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.recentSection}>
          <Text style={styles.recentTitle}>Последние записи</Text>
          
          {Array.from(entries.values())
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)
            .map((entry, index) => (
              <Animated.View
                key={entry.date}
                entering={SlideInRight.delay(600 + index * 100)}
              >
                <TouchableOpacity
                  style={styles.recentCard}
                  onPress={() => setViewingEntry(entry)}
                >
                  <View style={[styles.recentMood, { backgroundColor: `${entry.color}20` }]}>
                    <Text style={styles.recentEmoji}>{entry.mood}</Text>
                  </View>
                  <View style={styles.recentContent}>
                    <Text style={styles.recentDate}>
                      {new Date(entry.date).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </Text>
                    <Text style={styles.recentText} numberOfLines={2}>
                      {entry.content || 'Без текста'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Theme.text.tertiary} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          
          {entries.size === 0 && (
            <View style={styles.emptyRecent}>
              <Ionicons name="book-outline" size={48} color={Theme.text.tertiary} />
              <Text style={styles.emptyText}>Нет записей</Text>
              <Text style={styles.emptySubtext}>Нажмите на день, чтобы добавить запись</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
      
      {/* New Entry Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <LinearGradient
              colors={[Theme.background.secondary, Theme.background.primary]}
              style={StyleSheet.absoluteFill}
            />
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Новая запись</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Theme.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDate}>
              {selectedDate && new Date(selectedDate).toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            
            {/* Mood Selection */}
            <Text style={styles.moodLabel}>Как вы себя чувствуете?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moodPicker}
            >
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.label}
                  onPress={() => setSelectedMood(mood)}
                  style={[
                    styles.moodOption,
                    selectedMood.label === mood.label && {
                      borderColor: mood.color,
                      backgroundColor: `${mood.color}15`,
                    },
                  ]}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={[
                    styles.moodOptionLabel,
                    selectedMood.label === mood.label && { color: mood.color },
                  ]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Text Input */}
            <Text style={styles.textLabel}>Что у вас на душе?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Напишите о своём дне..."
              placeholderTextColor={Theme.text.tertiary}
              multiline
              value={entryText}
              onChangeText={setEntryText}
              maxLength={1000}
            />
            <Text style={styles.charCount}>{entryText.length}/1000</Text>
            
            {/* Save Button */}
            <TouchableOpacity
              onPress={saveEntry}
              disabled={!entryText.trim()}
              style={[styles.saveButton, !entryText.trim() && styles.saveButtonDisabled]}
            >
              <LinearGradient
                colors={[selectedMood.color, Theme.accent.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>Сохранить</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* View Entry Modal */}
      <Modal
        visible={!!viewingEntry}
        animationType="slide"
        transparent
        onRequestClose={() => setViewingEntry(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <LinearGradient
              colors={[Theme.background.secondary, Theme.background.primary]}
              style={StyleSheet.absoluteFill}
            />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Запись</Text>
              <TouchableOpacity onPress={() => setViewingEntry(null)}>
                <Ionicons name="close" size={24} color={Theme.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {viewingEntry && (
              <>
                <Text style={styles.modalDate}>
                  {new Date(viewingEntry.date).toLocaleDateString('ru-RU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                
                <View style={[
                  styles.viewMoodBadge,
                  { backgroundColor: `${viewingEntry.color}20` }
                ]}>
                  <Text style={styles.viewMoodEmoji}>{viewingEntry.mood}</Text>
                </View>
                
                <Text style={styles.viewContent}>
                  {viewingEntry.content || 'Без текста'}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Theme.text.primary,
  },
  todayButton: {
    backgroundColor: Theme.accent.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  todayButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Month Navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.text.primary,
  },
  
  // Weekdays
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 8, // Match calendarGrid padding
  },
  weekdayCell: {
    width: DAY_SIZE,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.text.tertiary,
  },
  weekendText: {
    color: Theme.accent.primary,
  },
  
  // Calendar Grid
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Theme.background.card,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: Theme.border.primary,
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginVertical: 2,
  },
  todayCell: {
    backgroundColor: `${Theme.accent.primary}20`,
    borderWidth: 2,
    borderColor: Theme.accent.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.text.primary,
  },
  todayText: {
    fontWeight: '700',
    color: Theme.accent.primary,
  },
  futureText: {
    color: Theme.text.tertiary,
    opacity: 0.5,
  },
  dayMood: {
    fontSize: 12,
    marginTop: 2,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.accent.primary,
    marginTop: 4,
  },
  
  // Legend
  legend: {
    marginTop: 20,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text.secondary,
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendEmoji: {
    fontSize: 16,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Recent
  recentSection: {
    marginTop: 28,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.text.primary,
    marginBottom: 16,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.border.primary,
  },
  recentMood: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentEmoji: {
    fontSize: 24,
  },
  recentContent: {
    flex: 1,
  },
  recentDate: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.text.secondary,
    marginBottom: 4,
  },
  recentText: {
    fontSize: 14,
    color: Theme.text.primary,
    lineHeight: 20,
  },
  emptyRecent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.text.secondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: Theme.text.tertiary,
    marginTop: 4,
  },
  
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.text.primary,
  },
  modalDate: {
    fontSize: 14,
    color: Theme.text.secondary,
    marginBottom: 20,
    textTransform: 'capitalize',
  },
  
  // Mood Picker
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text.primary,
    marginBottom: 12,
  },
  moodPicker: {
    paddingBottom: 16,
    gap: 12,
  },
  moodOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Theme.border.primary,
    minWidth: 72,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodOptionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.text.secondary,
  },
  
  // Text Input
  textLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.text.primary,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: Theme.background.card,
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    color: Theme.text.primary,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Theme.border.primary,
  },
  charCount: {
    fontSize: 12,
    color: Theme.text.tertiary,
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 16,
  },
  
  // Save Button
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  
  // View Entry
  viewMoodBadge: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  viewMoodEmoji: {
    fontSize: 40,
  },
  viewContent: {
    fontSize: 16,
    color: Theme.text.primary,
    lineHeight: 26,
    textAlign: 'center',
  },
});

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/ThemeContext';
import { NewEntryModal } from '@/components/NewEntryModal';
import { AnimatedGradient } from '@/components/AnimatedGradient';

const { width } = Dimensions.get('window');

interface Entry {
  id: number;
  date: string;
  time: string;
  mood: string;
  text: string;
  fullDate: string;
}

export default function CalendarScreen() {
  const { activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const today = new Date().toISOString().split('T')[0];
  
  const [entries, setEntries] = useState<Entry[]>([
    {
      id: 1,
      date: 'Сегодня',
      time: '18:30',
      mood: '😊',
      text: 'Сегодня был отличный день! Много работы, но всё получилось.',
      fullDate: new Date().toISOString().split('T')[0],
    },
    {
      id: 2,
      date: 'Вчера',
      time: '20:15',
      mood: '😌',
      text: 'Чувствую себя спокойно. Медитация помогла.',
      fullDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    },
    {
      id: 3,
      date: '2 дня назад',
      time: '14:20',
      mood: '😐',
      text: 'Обычный день, ничего особенного.',
      fullDate: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    },
  ]);

  const handleDayPress = (day: DateData) => {
    // Разрешаем выбирать только сегодня и прошлые даты
    if (day.dateString <= today) {
      setSelectedDate(day.dateString);
      // Если выбрана прошлая дата или сегодня - показываем записи
      // Если сегодня и нет записей - показываем модал создания
      const hasEntries = entries.some(e => e.fullDate === day.dateString);
      if (day.dateString === today && !hasEntries) {
        setShowNewEntry(true);
      }
    }
  };

  const handleSaveEntry = (mood: string, text: string) => {
    const now = new Date();
    const newEntry: Entry = {
      id: entries.length + 1,
      date: 'Только что',
      time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      mood,
      text,
      fullDate: now.toISOString().split('T')[0],
    };
    setEntries([newEntry, ...entries]);
  };

  const markedDates = entries.reduce((acc, entry) => {
    acc[entry.fullDate] = {
      marked: true,
      dotColor: isDark ? '#a78bfa' : '#8b5cf6',
    };
    return acc;
  }, {} as any);

  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: isDark ? '#8b5cf6' : '#a78bfa',
    };
  }

  return (
    <View style={styles.container}>
      <AnimatedGradient
        lightColors={['#e0e7ff', '#ddd6fe', '#e9d5ff']}
        darkColors={['#0f172a', '#1e1b4b', '#312e81', '#1e293b']}
        isDark={isDark}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <LinearGradient
            colors={isDark ? ['#8b5cf6', '#ec4899'] : ['#a78bfa', '#f472b6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerIconContainer}
          >
            <Ionicons name="calendar" size={28} color="#fff" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text
              style={[
                styles.headerTitle,
                { color: isDark ? '#e2e8f0' : '#1e293b' },
              ]}
            >
              Дневник мыслей
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: isDark ? '#94a3b8' : '#64748b' },
              ]}
            >
              {entries.length} {entries.length === 1 ? 'запись' : entries.length < 5 ? 'записи' : 'записей'}
            </Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarSection}>
          <View
            style={[
              styles.calendarCard,
              {
                backgroundColor: isDark
                  ? 'rgba(30, 41, 59, 0.6)'
                  : 'rgba(255, 255, 255, 0.7)',
                borderColor: isDark
                  ? 'rgba(71, 85, 105, 0.3)'
                  : 'rgba(226, 232, 240, 0.5)',
              },
            ]}
          >
            <Calendar
              markedDates={markedDates}
              onDayPress={handleDayPress}
              maxDate={today}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: isDark ? '#94a3b8' : '#64748b',
                selectedDayBackgroundColor: isDark ? '#8b5cf6' : '#a78bfa',
                selectedDayTextColor: '#ffffff',
                todayTextColor: isDark ? '#a78bfa' : '#8b5cf6',
                dayTextColor: isDark ? '#cbd5e1' : '#334155',
                textDisabledColor: isDark ? '#334155' : '#cbd5e1',
                dotColor: isDark ? '#a78bfa' : '#8b5cf6',
                selectedDotColor: '#ffffff',
                arrowColor: isDark ? '#a78bfa' : '#8b5cf6',
                monthTextColor: isDark ? '#f1f5f9' : '#1e293b',
                indicatorColor: isDark ? '#a78bfa' : '#8b5cf6',
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 15,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 13,
              }}
              style={styles.calendar}
            />
          </View>
        </View>

        {/* New Entry Button */}
        <View style={{ marginVertical: 16 }}>
          <TouchableOpacity onPress={() => setShowNewEntry(true)}>
            <LinearGradient
              colors={['#3b82f6', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.newEntryGradient}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.newEntryText}>Новая запись</Text>
              <View style={styles.sparkle}>
                <Ionicons name="sparkles" size={16} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* New Entry Modal */}
        <NewEntryModal
          visible={showNewEntry}
          onClose={() => setShowNewEntry(false)}
          onSave={handleSaveEntry}
        />

        {/* Entries List - показываем только если выбрана дата */}
        {selectedDate && (
          <View style={styles.entriesSection}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? '#cbd5e1' : '#334155' },
                ]}
              >
                Записи за {selectedDate === today ? 'сегодня' : selectedDate}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate('')}>
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={isDark ? '#64748b' : '#94a3b8'}
                />
              </TouchableOpacity>
            </View>
            {entries
              .filter((entry) => entry.fullDate === selectedDate)
              .map((entry, index) => (
            <View key={entry.id} style={{ marginBottom: 12 }}>
              <View
                style={[
                  styles.entryCard,
                  {
                    backgroundColor: isDark
                      ? 'rgba(30, 41, 59, 0.6)'
                      : 'rgba(255, 255, 255, 0.7)',
                    borderColor: isDark
                      ? 'rgba(71, 85, 105, 0.3)'
                      : 'rgba(226, 232, 240, 0.5)',
                  },
                ]}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.entryHeaderLeft}>
                    <View style={styles.moodContainer}>
                      <Text style={styles.entryMood}>{entry.mood}</Text>
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.entryDate,
                          { color: isDark ? '#e2e8f0' : '#1e293b' },
                        ]}
                      >
                        {entry.date}
                      </Text>
                      <Text
                        style={[
                          styles.entryTime,
                          { color: isDark ? '#64748b' : '#94a3b8' },
                        ]}
                      >
                        {entry.time}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.entryMenu}>
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={20}
                      color={isDark ? '#64748b' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={[
                    styles.entryText,
                    { color: isDark ? '#cbd5e1' : '#475569' },
                  ]}
                >
                  {entry.text}
                </Text>
              </View>
            </View>
            ))}
            {entries.filter((entry) => entry.fullDate === selectedDate)
              .length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color={isDark ? '#475569' : '#cbd5e1'}
                />
                <Text
                  style={[
                    styles.emptyStateText,
                    { color: isDark ? '#64748b' : '#94a3b8' },
                  ]}
                >
                  Нет записей за эту дату
                </Text>
                {selectedDate === today && (
                  <TouchableOpacity
                    onPress={() => setShowNewEntry(true)}
                    style={styles.emptyStateButton}
                  >
                    <LinearGradient
                      colors={['#3b82f6', '#8b5cf6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.emptyStateGradient}
                    >
                      <Text style={styles.emptyStateButtonText}>
                        Создать запись
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  calendarSection: {
    marginBottom: 24,
  },
  calendarCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  calendar: {
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  newEntryButton: {
    marginBottom: 24,
  },
  newEntryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
  },
  newEntryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sparkle: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
  entriesSection: {
    gap: 12,
  },
  entryCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  entryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moodContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  entryMood: {
    fontSize: 28,
  },
  entryMenu: {
    padding: 4,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  entryTime: {
    fontSize: 12,
  },
  entryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyStateButton: {
    marginTop: 16,
    width: '80%',
  },
  emptyStateGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

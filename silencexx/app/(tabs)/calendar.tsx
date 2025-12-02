import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/ThemeContext';
import { NewEntryModal } from '@/components/NewEntryModal';
import { ViewEntryModal } from '@/components/ViewEntryModal';
import { AnimatedGradient } from '@/components/AnimatedGradient';
import { journalApi } from '@/services/api';

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
  const [markedDatesState, setMarkedDatesState] = useState<any>({});
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showViewEntry, setShowViewEntry] = useState(false);
  const [isLoadingEntry, setIsLoadingEntry] = useState(false);
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
    if (day.dateString > today) return;
    setShowNewEntry(false);
    setShowViewEntry(false);
    setSelectedEntry(null);
    setSelectedDate(day.dateString);
    setIsLoadingEntry(true);

    // подгружаем данные сразу
    journalApi.getEntry(day.dateString)
      .then((res) => {
        const isToday = day.dateString === today;
        if (res && res.exists) {
          setSelectedEntry(res.entry);
          setShowViewEntry(true);
        } else if (isToday) {
          setShowNewEntry(true);
        } else {
          setShowViewEntry(true);
        }
      })
      .catch((error) => {
        console.log('Error fetching entry', error);
        const isToday = day.dateString === today;
        if (isToday) {
          setShowNewEntry(true);
        } else {
          setShowViewEntry(true);
        }
      })
      .finally(() => setIsLoadingEntry(false));
  };

  const handleSaveEntry = (mood: string, text: string) => {
    // Save to backend for today's date only
    const date = new Date().toISOString().split('T')[0];
    const content = `${mood} ${text}`;
    journalApi.createEntry(date, content)
      .then(() => {
        // refresh marked dates
        return journalApi.listEntries();
      })
      .then((listRes) => {
        if (listRes && listRes.dates) {
          const md: any = {};
          listRes.dates.forEach((d: any) => {
            md[d.date] = { marked: true, dotColor: isDark ? '#a78bfa' : '#8b5cf6' };
          });
          setMarkedDatesState(md);
        }
      })
      .catch((err) => {
        console.error('Ошибка при сохранении записи:', err);
      });
  };

  // use markedDatesState fetched from server
  const markedDates = { ...markedDatesState } as any;
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: isDark ? '#8b5cf6' : '#a78bfa',
    };
  }

  React.useEffect(() => {
    // load marked dates from backend
    let mounted = true;
    journalApi.listEntries()
      .then((res) => {
        if (!mounted) return;
        if (res && res.dates) {
          const md: any = {};
          res.dates.forEach((d: any) => {
            md[d.date] = { marked: true, dotColor: isDark ? '#a78bfa' : '#8b5cf6' };
          });
          setMarkedDatesState(md);
        }
      })
      .catch((err) => console.log('Error loading journal list', err));
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <AnimatedGradient
        lightColors={['#e0e7ff', '#ddd6fe', '#e9d5ff']}
        darkColors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
        isDark={isDark}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={isDark ? ['#6366f1', '#a855f7'] : ['#8b5cf6', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIconContainer}
              >
                <Ionicons name="book" size={24} color="#fff" />
              </LinearGradient>
              <View style={styles.headerTextContainer}>
                <Text
                  style={[
                    styles.headerTitle,
                    { color: isDark ? '#f1f5f9' : '#0f172a' },
                  ]}
                >
                  Дневник
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
            <TouchableOpacity 
              style={[styles.menuButton, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(139, 92, 246, 0.1)' }]}
              onPress={() => setShowNewEntry(true)}
            >
              <Ionicons name="add" size={24} color={isDark ? '#818cf8' : '#8b5cf6'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarSection}>
          <View style={[styles.calendarCard, { 
            backgroundColor: isDark
              ? Platform.OS === 'ios'
                ? 'rgba(30, 41, 59, 0.6)'
                : '#1e293b'
              : Platform.OS === 'ios'
              ? '#ffffff'
              : '#f8fafc',
            borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(139, 92, 246, 0.2)',
            borderWidth: 1.5,
            shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0,
            elevation: Platform.OS === 'ios' ? 6 : 0,
          }]}>
            <Calendar
              markedDates={markedDates}
              onDayPress={handleDayPress}
              maxDate={today}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: isDark ? '#94a3b8' : '#64748b',
                selectedDayBackgroundColor: isDark ? '#6366f1' : '#8b5cf6',
                selectedDayTextColor: '#ffffff',
                todayTextColor: isDark ? '#818cf8' : '#8b5cf6',
                dayTextColor: isDark ? '#e2e8f0' : '#334155',
                textDisabledColor: isDark ? '#475569' : '#cbd5e1',
                dotColor: isDark ? '#818cf8' : '#8b5cf6',
                selectedDotColor: '#ffffff',
                arrowColor: isDark ? '#818cf8' : '#8b5cf6',
                monthTextColor: isDark ? '#f1f5f9' : '#1e293b',
                indicatorColor: isDark ? '#818cf8' : '#8b5cf6',
                textDayFontWeight: '600',
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

        {/* New Entry Modal */}
        <NewEntryModal
          visible={showNewEntry}
          onClose={() => setShowNewEntry(false)}
          onSave={handleSaveEntry}
        />

        <ViewEntryModal
          visible={showViewEntry}
          onClose={() => { setShowViewEntry(false); setSelectedEntry(null); setSelectedDate(''); }}
          entry={selectedEntry}
        />

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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  header: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTextContainer: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  calendarSection: {
    marginBottom: 24,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0,
    shadowRadius: 12,
    elevation: Platform.OS === 'ios' ? 4 : 0,
    width: '100%',
    maxWidth: 400,
  },
  calendar: {
    borderRadius: 20,
  },
});

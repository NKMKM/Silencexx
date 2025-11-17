import { useState } from 'react';
import { ChevronLeft, ChevronRight, Cloud, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { useTheme } from '../utils/ThemeContext';

interface ThoughtEntry {
  date: string;
  content: string;
}

export function ThoughtsCalendar() {
  const { theme } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [thoughts, setThoughts] = useState<ThoughtEntry[]>([
    { date: '2025-11-08', content: 'Сегодня был хороший день. Погода отличная, встретился с друзьями.' },
    { date: '2025-11-07', content: 'Немного устал, но чувствую себя хорошо. Закончил важный проект.' },
  ]);
  const [currentThought, setCurrentThought] = useState('');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Получить дни месяца
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Добавляем пустые дни в начале
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Добавляем дни месяца
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const hasThought = (date: Date) => {
    return thoughts.some((t) => t.date === formatDate(date));
  };

  const getThought = (date: Date) => {
    return thoughts.find((t) => t.date === formatDate(date));
  };

  const isToday = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const isFutureDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  };

  const handleDateClick = (date: Date) => {
    if (isFutureDate(date)) return; // Нельзя выбирать будущие даты
    setSelectedDate(date);
    const thought = getThought(date);
    setCurrentThought(thought ? thought.content : '');
  };

  const handleSaveThought = () => {
    if (!selectedDate || !currentThought.trim()) return;
    if (!isToday(selectedDate)) return; // Можно сохранять только сегодняшний день

    const dateStr = formatDate(selectedDate);
    const existingIndex = thoughts.findIndex((t) => t.date === dateStr);

    if (existingIndex >= 0) {
      const newThoughts = [...thoughts];
      newThoughts[existingIndex] = { date: dateStr, content: currentThought };
      setThoughts(newThoughts);
    } else {
      setThoughts([...thoughts, { date: dateStr, content: currentThought }]);
    }

    setSelectedDate(null);
    setCurrentThought('');
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const monthName = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentDate);
  const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  return (
    <div className={`h-full flex flex-col relative transition-all duration-500 ${
      theme === 'dark'
        ? 'bg-gradient-to-b from-slate-900 via-purple-950 to-slate-950'
        : 'bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50'
    }`}>
      {/* Заголовок */}
      <div className={`backdrop-blur-2xl border-b px-4 py-4 shadow-sm transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-slate-900/60 border-slate-700/30'
          : 'bg-white/60 border-white/30'
      }`}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Cloud className={`w-6 h-6 transition-colors duration-300 ${
              theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
            }`} />
            <h1 className={`transition-colors duration-300 ${
              theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
            }`}>Место для мыслей</h1>
          </div>
          <p className={`text-sm text-center transition-colors duration-300 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Записывайте свои мысли каждый день. Прошлые записи можно только читать.
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
          {/* Навигация по месяцам */}
          <motion.div
            className={`backdrop-blur-2xl rounded-3xl p-4 border shadow-xl transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-800/70 to-slate-900/50 border-slate-700/30'
                : 'bg-gradient-to-br from-white/70 to-white/50 border-white/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <motion.button
                onClick={() => changeMonth('prev')}
                className={`p-2 rounded-xl transition-all duration-300 ${
                  theme === 'dark' ? 'hover:bg-purple-500/20' : 'hover:bg-purple-100'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeft className={`w-5 h-5 transition-colors duration-300 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`} />
              </motion.button>
              <h2 className={`capitalize transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>{monthName}</h2>
              <motion.button
                onClick={() => changeMonth('next')}
                className={`p-2 rounded-xl transition-all duration-300 ${
                  theme === 'dark' ? 'hover:bg-purple-500/20' : 'hover:bg-purple-100'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className={`w-5 h-5 transition-colors duration-300 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`} />
              </motion.button>
            </div>

            {/* Дни недели */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className={`text-center text-xs py-1 transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                }`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Календарная сетка */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const isCurrentDay = isToday(date);
                const isFuture = isFutureDate(date);
                const hasEntry = hasThought(date);

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleDateClick(date)}
                    disabled={isFuture}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-300 ${
                      isCurrentDay
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                        : isFuture
                        ? theme === 'dark'
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        : hasEntry
                        ? theme === 'dark'
                          ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-900/70'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        : theme === 'dark'
                        ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                        : 'bg-white/50 text-slate-700 hover:bg-white'
                    }`}
                    whileHover={!isFuture ? { scale: 1.05 } : {}}
                    whileTap={!isFuture ? { scale: 0.95 } : {}}
                  >
                    <span className="text-sm">{date.getDate()}</span>
                    {hasEntry && !isCurrentDay && (
                      <div className={`absolute bottom-1 w-1 h-1 rounded-full transition-colors duration-300 ${
                        theme === 'dark' ? 'bg-purple-400' : 'bg-purple-500'
                      }`} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Легенда */}
          <motion.div
            className={`backdrop-blur-2xl rounded-2xl p-3 border shadow-lg transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-slate-800/70 to-slate-900/50 border-slate-700/30'
                : 'bg-gradient-to-br from-white/70 to-white/50 border-white/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-around text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-purple-500" />
                <span className={`transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>Сегодня</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-purple-900/50' : 'bg-purple-100'
                }`} />
                <span className={`transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>Есть запись</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                }`} />
                <span className={`transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>Будущее</span>
              </div>
            </div>
          </motion.div>

          {/* Подсказка */}
          <motion.div
            className={`backdrop-blur-2xl rounded-2xl p-4 border transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-800/30'
                : 'bg-gradient-to-br from-blue-100/50 to-purple-100/50 border-white/30'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className={`text-sm text-center transition-colors duration-300 ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              💭 Нажмите на сегодняшнюю дату, чтобы записать свои мысли
            </p>
          </motion.div>
        </div>
      </ScrollArea>

      {/* Модальное окно для просмотра/редактирования мыслей */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`backdrop-blur-2xl rounded-3xl p-6 border shadow-2xl max-w-lg w-full transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/70 border-slate-700/30'
                  : 'bg-gradient-to-br from-white/90 to-white/70 border-white/30'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cloud className={`w-5 h-5 transition-colors duration-300 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
                  }`} />
                  <h3 className={`transition-colors duration-300 ${
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {selectedDate.toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className={`p-2 rounded-xl transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'hover:bg-purple-500/20' 
                      : 'hover:bg-purple-100'
                  }`}
                >
                  <X className={`w-5 h-5 transition-colors duration-300 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`} />
                </button>
              </div>

              {isToday(selectedDate) ? (
                <>
                  <Textarea
                    value={currentThought}
                    onChange={(e) => setCurrentThought(e.target.value)}
                    placeholder="Что у тебя на душе сегодня?"
                    className={`min-h-[200px] rounded-2xl mb-4 transition-all duration-300 ${
                      theme === 'dark'
                        ? 'border-slate-600 bg-slate-800/50 focus:bg-slate-800 text-slate-200 placeholder:text-slate-500'
                        : 'border-slate-200 bg-white/50 focus:bg-white text-slate-800 placeholder:text-slate-400'
                    }`}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveThought}
                      className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      disabled={!currentThought.trim()}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Сохранить
                    </Button>
                    <Button
                      onClick={() => setSelectedDate(null)}
                      variant="outline"
                      className="rounded-2xl"
                    >
                      Отмена
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {currentThought ? (
                    <div className={`rounded-2xl p-4 border transition-all duration-300 ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/30'
                        : 'bg-white/50 border-white/30'
                    }`}>
                      <p className={`whitespace-pre-wrap transition-colors duration-300 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>{currentThought}</p>
                    </div>
                  ) : (
                    <div className={`rounded-2xl p-8 border text-center transition-all duration-300 ${
                      theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700/30'
                        : 'bg-white/50 border-white/30'
                    }`}>
                      <Cloud className={`w-12 h-12 mx-auto mb-2 transition-colors duration-300 ${
                        theme === 'dark' ? 'text-slate-600' : 'text-slate-300'
                      }`} />
                      <p className={`transition-colors duration-300 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>Нет записей на этот день</p>
                    </div>
                  )}
                  <Button
                    onClick={() => setSelectedDate(null)}
                    variant="outline"
                    className="w-full rounded-2xl mt-4"
                  >
                    Закрыть
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

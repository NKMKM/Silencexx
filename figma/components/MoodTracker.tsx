import { useState } from 'react';
import { motion } from 'motion/react';
import { Smile, Frown, Meh, Laugh, CloudRain } from 'lucide-react';

interface MoodTrackerProps {
  onMoodSelect: (mood: string) => void;
}

const moods = [
  { name: 'Amazing', icon: Laugh, color: 'from-yellow-400 to-orange-400', emoji: '😄' },
  { name: 'Good', icon: Smile, color: 'from-green-400 to-teal-400', emoji: '😊' },
  { name: 'Okay', icon: Meh, color: 'from-blue-400 to-cyan-400', emoji: '😐' },
  { name: 'Low', icon: Frown, color: 'from-purple-400 to-pink-400', emoji: '😔' },
  { name: 'Stressed', icon: CloudRain, color: 'from-gray-400 to-slate-400', emoji: '😰' },
];

export function MoodTracker({ onMoodSelect }: MoodTrackerProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [hoveredMood, setHoveredMood] = useState<string | null>(null);

  const handleMoodClick = (mood: string) => {
    setSelectedMood(mood);
    onMoodSelect(mood);
  };

  return (
    <div className="py-4 md:py-6 px-3 md:px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-3 md:mb-4"
      >
        <h3 className="text-slate-700 mb-1 text-sm md:text-base">Как ты сейчас?</h3>
        <p className="text-xs text-slate-500">Не обязан объяснять. Просто покажи.</p>
      </motion.div>

      <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
        {moods.map((mood, index) => {
          const Icon = mood.icon;
          const isSelected = selectedMood === mood.name;
          const isHovered = hoveredMood === mood.name;

          return (
            <motion.button
              key={mood.name}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMoodClick(mood.name)}
              onMouseEnter={() => setHoveredMood(mood.name)}
              onMouseLeave={() => setHoveredMood(null)}
              className={`relative flex flex-col items-center gap-1.5 md:gap-2 p-2 md:p-3 rounded-2xl transition-all backdrop-blur-xl border ${
                isSelected
                  ? 'bg-white/90 shadow-xl border-white/50'
                  : 'bg-white/40 hover:bg-white/70 border-white/30'
              }`}
            >
              <motion.div
                animate={{
                  rotate: isHovered ? [0, -10, 10, -10, 0] : 0,
                }}
                transition={{ duration: 0.5 }}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br ${mood.color} flex items-center justify-center text-xl md:text-2xl`}
              >
                {mood.emoji}
              </motion.div>
              <span className="text-xs text-slate-700">{mood.name}</span>

              {isSelected && (
                <motion.div
                  layoutId="mood-indicator"
                  className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-purple-500"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {selectedMood && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 text-center"
        >
          <p className="text-sm text-slate-600">
            {selectedMood === 'Amazing' && "Я вижу это. Просто побудь с этим."}
            {selectedMood === 'Good' && "Спасибо, что поделился."}
            {selectedMood === 'Okay' && "Окей — тоже нормально."}
            {selectedMood === 'Low' && "Я с тобой. Ты не один."}
            {selectedMood === 'Stressed' && "Слышу. Хочешь выдохнем?"}
          </p>
        </motion.div>
      )}
    </div>
  );
}

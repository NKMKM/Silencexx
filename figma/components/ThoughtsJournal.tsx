import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface ThoughtsJournalProps {
  onClose: () => void;
  onSendToAI: (text: string) => void;
}

export function ThoughtsJournal({ onClose, onSendToAI }: ThoughtsJournalProps) {
  const [thoughts, setThoughts] = useState('');

  const handleShare = () => {
    if (thoughts.trim()) {
      onSendToAI(thoughts);
      setThoughts('');
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-b from-slate-900/95 via-purple-900/95 to-blue-900/95 backdrop-blur-xl z-50 flex flex-col p-4 md:p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-lg">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl text-white">Место для мыслей</h2>
            <p className="text-sm text-white/60">Просто напиши всё, что на душе</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 backdrop-blur-xl hover:bg-white/20 transition-colors border border-white/20 shadow-lg"
        >
          <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </button>
      </div>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col"
        >
          <Textarea
            value={thoughts}
            onChange={(e) => setThoughts(e.target.value)}
            placeholder="Здесь безопасно. Напиши всё, что чувствуешь..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-3xl p-6 resize-none focus:bg-white/15 text-base md:text-lg min-h-[300px]"
            autoFocus
          />

          <div className="mt-6 space-y-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center text-white/50 text-sm"
            >
              Ты не обязан делиться этим. Но если хочешь, я здесь.
            </motion.div>

            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 rounded-2xl bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Оставить себе
              </Button>
              <Button
                onClick={handleShare}
                disabled={!thoughts.trim()}
                className="flex-1 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Поделиться со мной
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

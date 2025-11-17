import { useState, useEffect } from 'react';
import { Mic, MicOff, Cloud, Volume2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface VoiceAssistantProps {
  onClose: () => void;
}

export function VoiceAssistant({ onClose }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Привет. Я твой голосовой помощник. Нажми на облачко, чтобы начать говорить.',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);

  const cloudStates = {
    idle: {
      scale: [1, 1.05, 1],
      rotate: [0, 2, -2, 0],
    },
    listening: {
      scale: [1, 1.15, 1.1, 1.15],
      rotate: [0, 5, -5, 0],
    },
    speaking: {
      scale: [1, 1.08, 1.03, 1.08],
      y: [0, -5, 0, -5],
    },
  };

  useEffect(() => {
    if (isListening) {
      // Симуляция распознавания речи
      const timer = setTimeout(() => {
        const mockTexts = [
          'Я чувствую себя немного уставшим сегодня',
          'Мне нужно поговорить о своих переживаниях',
          'Как справиться со стрессом?',
          'Расскажи мне что-нибудь успокаивающее',
          'Я беспокоюсь о будущем',
        ];
        const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
        setCurrentText(randomText);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isListening]);

  useEffect(() => {
    if (currentText && !isListening) {
      // Добавляем сообщение пользователя
      const userMessage: Message = {
        id: messages.length + 1,
        text: currentText,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages([...messages, userMessage]);
      setCurrentText('');

      // Симуляция ответа AI
      setTimeout(() => {
        setIsSpeaking(true);
        const responses = [
          'Я слышу тебя. Усталость — это нормально. Позволь себе отдохнуть.',
          'Спасибо, что поделился. Твои чувства важны. Я здесь, чтобы слушать.',
          'Стресс может быть тяжёлым. Попробуй дышать глубже. Вдох... выдох...',
          'Представь себе облака, плывущие по небу. Медленно, спокойно. Всё будет хорошо.',
          'Тревога о будущем — это часть жизни. Но сейчас ты здесь, в безопасности.',
        ];
        const response = responses[Math.floor(Math.random() * responses.length)];
        
        const aiMessage: Message = {
          id: messages.length + 2,
          text: response,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);

        // Через 3 секунды перестаём "говорить"
        setTimeout(() => {
          setIsSpeaking(false);
        }, 3000);
      }, 1000);
    }
  }, [currentText, isListening]);

  const handleToggleListening = () => {
    setIsListening(!isListening);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Плавающие облака на фоне */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-20 opacity-20"
            initial={{ x: -100, y: Math.random() * 600 }}
            animate={{
              x: [null, typeof window !== 'undefined' ? window.innerWidth + 100 : 800],
              y: [null, Math.random() * 600],
            }}
            transition={{
              duration: 30 + Math.random() * 20,
              repeat: Infinity,
              delay: i * 5,
            }}
          >
            <Cloud className="w-full h-full text-purple-300" />
          </motion.div>
        ))}
      </div>

      {/* Заголовок */}
      <div className="bg-white/60 backdrop-blur-2xl border-b border-white/30 px-4 py-4 shadow-sm relative z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-purple-500" />
            <h1 className="text-slate-800">Голосовой помощник</h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <p className="text-sm text-center text-slate-600 mt-2">
          Говорите с вашим AI-помощником
        </p>
      </div>

      {/* Основная область */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
        {/* Анимированное облачко */}
        <motion.div
          className="relative mb-8"
          animate={
            isListening
              ? cloudStates.listening
              : isSpeaking
              ? cloudStates.speaking
              : cloudStates.idle
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Внешнее свечение */}
          <div
            className={`absolute inset-0 rounded-full blur-3xl transition-all duration-500 ${
              isListening
                ? 'bg-blue-400/40 scale-150'
                : isSpeaking
                ? 'bg-purple-400/40 scale-140'
                : 'bg-purple-300/30 scale-100'
            }`}
          />

          {/* Главное облачко */}
          <motion.button
            onClick={handleToggleListening}
            className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening
                ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-2xl'
                : isSpeaking
                ? 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-2xl'
                : 'bg-gradient-to-br from-purple-300 to-pink-300 shadow-xl'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            <Cloud
              className={`w-24 h-24 transition-all duration-300 ${
                isListening || isSpeaking ? 'text-white' : 'text-white/80'
              }`}
            />

            {/* Иконка микрофона в центре */}
            <motion.div
              className="absolute"
              animate={isListening ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {isListening ? (
                <Mic className="w-12 h-12 text-white" />
              ) : isSpeaking ? (
                <Volume2 className="w-12 h-12 text-white" />
              ) : (
                <MicOff className="w-12 h-12 text-white/70" />
              )}
            </motion.div>

            {/* Пульсирующие круги при прослушивании */}
            {isListening && (
              <>
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-white/30"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.6,
                    }}
                  />
                ))}
              </>
            )}

            {/* Звуковые волны при говорении */}
            {isSpeaking && (
              <div className="absolute -right-16 flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-white rounded-full"
                    animate={{
                      height: [10, 30, 10],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            )}
          </motion.button>
        </motion.div>

        {/* Статус */}
        <motion.div
          className="text-center mb-6"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-slate-700">
            {isListening
              ? 'Слушаю вас...'
              : isSpeaking
              ? 'Отвечаю...'
              : 'Нажмите на облачко для начала'}
          </p>
        </motion.div>

        {/* Кнопка управления */}
        <Button
          onClick={handleToggleListening}
          className={`rounded-2xl px-8 transition-all ${
            isListening
              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4 mr-2" />
              Остановить
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              Начать разговор
            </>
          )}
        </Button>
      </div>

      {/* История сообщений внизу */}
      <div className="bg-white/60 backdrop-blur-2xl border-t border-white/30 relative z-10">
        <div className="max-w-2xl mx-auto p-4">
          <h3 className="text-sm text-slate-600 mb-2">История разговора</h3>
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {messages.slice(-5).map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : 'bg-white/70 text-slate-700 border border-white/30'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

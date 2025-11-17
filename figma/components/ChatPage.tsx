import { useState } from 'react';
import { Send, Plus, MessageCircle, Cloud, Menu, X, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { VoiceAssistant } from './VoiceAssistant';
import { MobileBackdrop } from './MobileBackdrop';
import { CrisisSupport } from './CrisisSupport';
import { generateEmpathicResponse, detectCrisis } from '../utils/aiResponses';
import { useTheme } from '../utils/ThemeContext';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface Chat {
  id: number;
  title: string;
  preview: string;
  timestamp: Date;
}

export function ChatPage() {
  const { theme, chatBackground } = useTheme();
  const [message, setMessage] = useState('');
  const [currentChatId, setCurrentChatId] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [showCrisisSupport, setShowCrisisSupport] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Привет. Я здесь, чтобы слушать. Как ты сейчас?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);

  const getBackgroundClass = () => {
    switch (chatBackground) {
      case 'gradient':
        return 'chat-bg-gradient';
      case 'clouds':
        return 'chat-bg-clouds';
      case 'aurora':
        return 'chat-bg-aurora';
      case 'minimal':
        return 'chat-bg-minimal';
      case 'stars':
        return 'chat-bg-stars';
      default:
        return 'chat-bg-gradient';
    }
  };

  const [chats] = useState<Chat[]>([
    {
      id: 1,
      title: 'Сегодня',
      preview: 'Привет. Я здесь...',
      timestamp: new Date(),
    },
    {
      id: 2,
      title: 'Вчера вечером',
      preview: 'Я слышу, что тяжело...',
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: 3,
      title: 'Позавчера',
      preview: 'Хочешь выдохнем вместе...',
      timestamp: new Date(Date.now() - 7200000),
    },
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newUserMessage: Message = {
      id: messages.length + 1,
      text: message,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, newUserMessage]);
    const userText = message;
    setMessage('');

    // Проверка на кризис
    if (detectCrisis(userText)) {
      setTimeout(() => {
        const crisisResponse: Message = {
          id: messages.length + 2,
          text: generateEmpathicResponse({ text: userText }),
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, crisisResponse]);
        
        // Показать поддержку через небольшую задержку
        setTimeout(() => {
          setShowCrisisSupport(true);
        }, 1500);
      }, 800);
      return;
    }

    // Обычный эмпатичный ответ
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        text: generateEmpathicResponse({ text: userText }),
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`h-full flex flex-col ${getBackgroundClass()} relative transition-all duration-500`}>
      <MobileBackdrop isOpen={isSidebarOpen} onClick={() => setIsSidebarOpen(false)} />

      {/* Voice Assistant Modal */}
      <AnimatePresence>
        {showVoiceAssistant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowVoiceAssistant(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <VoiceAssistant onClose={() => setShowVoiceAssistant(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crisis Support Modal */}
      <AnimatePresence>
        {showCrisisSupport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCrisisSupport(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <CrisisSupport onClose={() => setShowCrisisSupport(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className={`backdrop-blur-2xl border-b px-3 md:px-4 py-3 flex items-center justify-between relative z-10 shadow-sm transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-slate-900/60 border-slate-700/30' 
          : 'bg-white/60 border-white/30'
      }`}>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-xl transition-all duration-300 ${
              theme === 'dark' 
                ? 'hover:bg-purple-500/20' 
                : 'hover:bg-purple-100'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isSidebarOpen ? (
              <X className={`w-5 h-5 transition-colors duration-300 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            ) : (
              <Menu className={`w-5 h-5 transition-colors duration-300 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            )}
          </motion.button>
          <motion.div 
            className="flex items-center gap-2"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center shadow-lg">
              <Cloud className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
            </div>
            <span className={`text-sm md:text-base transition-colors duration-300 ${
              theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
            }`}>CloudMind</span>
          </motion.div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowVoiceAssistant(true)}
            className={`p-2 rounded-xl transition-all duration-300 ${
              theme === 'dark' 
                ? 'hover:bg-purple-500/20' 
                : 'hover:bg-purple-100'
            }`}
            title="Голосовой помощник"
          >
            <Mic className={`w-5 h-5 transition-colors duration-300 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
          </motion.button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <div
          className={`${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed md:relative md:translate-x-0 z-20 w-72 md:w-64 backdrop-blur-2xl border-r transition-all duration-300 h-full shadow-xl flex flex-col ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-slate-800/70 to-slate-900/50 border-slate-700/30'
              : 'bg-gradient-to-br from-white/70 to-white/50 border-white/30'
          }`}
        >
          <div className={`p-4 border-b space-y-3 flex-shrink-0 transition-colors duration-300 ${
            theme === 'dark' ? 'border-slate-700/20' : 'border-white/20'
          }`}>
            <Button className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-sm md:text-base transition-all duration-300">
              <Plus className="w-4 h-4 mr-2" />
              Новый разговор
            </Button>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-2">
              {chats.map((chat) => (
                <motion.button
                  key={chat.id}
                  onClick={() => {
                    setCurrentChatId(chat.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-2xl transition-all duration-300 ${
                    currentChatId === chat.id
                      ? theme === 'dark'
                        ? 'bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-purple-700/50'
                        : 'bg-gradient-to-r from-blue-100 to-purple-100 border border-purple-200'
                      : theme === 'dark'
                      ? 'hover:bg-slate-700/50'
                      : 'hover:bg-white/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-2">
                    <MessageCircle className={`w-4 h-4 mt-0.5 transition-colors duration-300 ${
                      currentChatId === chat.id 
                        ? theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className={`truncate transition-colors duration-300 ${
                        currentChatId === chat.id 
                          ? theme === 'dark' ? 'text-purple-300' : 'text-purple-900'
                          : theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        {chat.title}
                      </div>
                      <div className={`text-xs truncate transition-colors duration-300 ${
                        theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                      }`}>{chat.preview}</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative min-w-0">
          <ScrollArea className="flex-1 p-3 md:p-4 pb-6">
            <div className="max-w-2xl mx-auto space-y-3 md:space-y-4">
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`max-w-[85%] md:max-w-[80%] rounded-3xl px-4 py-2.5 md:px-5 md:py-3 text-sm md:text-base transition-all duration-300 ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-xl'
                        : theme === 'dark'
                        ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/60 backdrop-blur-2xl text-slate-200 border border-slate-700/30 shadow-lg'
                        : 'bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-2xl text-slate-800 border border-white/30 shadow-lg'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className={`p-3 md:p-4 pb-24 backdrop-blur-2xl border-t flex-shrink-0 relative z-10 shadow-sm transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-slate-900/60 border-slate-700/30'
              : 'bg-white/60 border-white/30'
          }`}>
            <div className="max-w-2xl mx-auto flex gap-2">
              <motion.div 
                className="flex-1"
                whileFocus={{ scale: 1.01 }}
              >
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Напиши всё, что чувствуешь..."
                  className={`min-h-[45px] md:min-h-[50px] max-h-[120px] md:max-h-[150px] rounded-2xl resize-none transition-all duration-300 text-sm md:text-base ${
                    theme === 'dark'
                      ? 'border-slate-600 bg-slate-800/50 focus:bg-slate-800 text-slate-200 placeholder:text-slate-500'
                      : 'border-slate-200 bg-white/50 focus:bg-white text-slate-800 placeholder:text-slate-400'
                  }`}
                />
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleSendMessage}
                  className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-4 md:px-6 shadow-lg h-auto transition-all duration-300"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Home, Calendar, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../utils/ThemeContext';

type NavPage = 'home' | 'calendar' | 'settings';

interface BottomNavigationProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
}

export function BottomNavigation({ currentPage, onNavigate }: BottomNavigationProps) {
  const { theme } = useTheme();
  const navItems = [
    { id: 'home' as NavPage, icon: Home, label: 'Главная' },
    { id: 'calendar' as NavPage, icon: Calendar, label: 'Дневник' },
    { id: 'settings' as NavPage, icon: Settings, label: 'Настройки' },
  ];

  return (
    <div className={`fixed bottom-0 left-0 right-0 backdrop-blur-2xl border-t shadow-lg z-50 transition-all duration-300 ${
      theme === 'dark'
        ? 'bg-slate-900/80 border-slate-700/30'
        : 'bg-white/80 border-white/30'
    }`}>
      <div className="flex items-center justify-around px-4 py-3 max-w-2xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center gap-1 flex-1 relative"
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                className={`p-3 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                    : 'bg-transparent'
                }`}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Icon
                  className={`w-6 h-6 transition-colors duration-300 ${
                    isActive 
                      ? 'text-white' 
                      : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}
                />
              </motion.div>
              <span
                className={`text-xs transition-colors duration-300 ${
                  isActive 
                    ? theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    : theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

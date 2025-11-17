import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { OTPPage } from './components/OTPPage';
import { ChatPage } from './components/ChatPage';
import { ThoughtsCalendar } from './components/ThoughtsCalendar';
import { SettingsPage } from './components/SettingsPage';
import { AccountSettings } from './components/AccountSettings';
import { BillingPage } from './components/BillingPage';
import { PaymentPage } from './components/PaymentPage';
import { BottomNavigation } from './components/BottomNavigation';
import { ThemeProvider, useTheme } from './utils/ThemeContext';

type Page = 'login' | 'register' | 'otp' | 'app' | 'account' | 'billing' | 'payment';
type NavPage = 'home' | 'calendar' | 'settings';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [currentNavPage, setCurrentNavPage] = useState<NavPage>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: string }>({ name: '', price: '' });
  const [phoneNumber, setPhoneNumber] = useState('');
  const { theme } = useTheme();

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentPage('app');
    setCurrentNavPage('home');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('login');
  };

  const handleNavigateToOTP = (phone: string) => {
    setPhoneNumber(phone);
    setCurrentPage('otp');
  };

  const handleNavigateToBilling = () => {
    setCurrentPage('billing');
  };

  const handleNavigateToPayment = (planName: string, planPrice: string) => {
    setSelectedPlan({ name: planName, price: planPrice });
    setCurrentPage('payment');
  };

  const handlePaymentSuccess = () => {
    setCurrentPage('app');
    setCurrentNavPage('home');
  };

  const handleNavigateToAccount = () => {
    setCurrentPage('account');
  };

  const handleNavigate = (page: NavPage) => {
    setCurrentNavPage(page);
  };

  const pageVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 }
  };

  const renderAuthPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onLogin={handleLogin} onNavigateToRegister={() => setCurrentPage('register')} onNavigateToOTP={handleNavigateToOTP} />;
      case 'register':
        return <RegisterPage onRegister={handleLogin} onNavigateToLogin={() => setCurrentPage('login')} onNavigateToOTP={handleNavigateToOTP} />;
      case 'otp':
        return <OTPPage phone={phoneNumber} onVerify={handleLogin} onNavigateBack={() => setCurrentPage('login')} />;
      case 'account':
        return <AccountSettings onNavigateBack={() => setCurrentPage('app')} />;
      case 'billing':
        return <BillingPage onNavigateBack={() => setCurrentPage('app')} onNavigateToPayment={handleNavigateToPayment} />;
      case 'payment':
        return <PaymentPage planName={selectedPlan.name} planPrice={selectedPlan.price} onNavigateBack={() => setCurrentPage('billing')} onPaymentSuccess={handlePaymentSuccess} />;
      default:
        return null;
    }
  };

  const renderAppContent = () => {
    switch (currentNavPage) {
      case 'home':
        return <ChatPage />;
      case 'calendar':
        return <ThoughtsCalendar />;
      case 'settings':
        return <SettingsPage onLogout={handleLogout} onNavigateToBilling={handleNavigateToBilling} onNavigateToAccount={handleNavigateToAccount} />;
      default:
        return <ChatPage />;
    }
  };

  if (!isAuthenticated || currentPage !== 'app') {
    return (
      <div className={`min-h-screen overflow-x-hidden relative transition-colors duration-500 ${
        theme === 'dark' 
          ? 'bg-gradient-to-b from-slate-900 via-purple-950 to-slate-950' 
          : 'bg-gradient-to-b from-blue-50/80 via-purple-50/80 to-pink-50/80'
      }`}>
        {/* Cloud-like background gradient overlay */}
        <div className="fixed inset-0 pointer-events-none transition-opacity duration-500">
          <div className={`absolute inset-0 ${
            theme === 'dark' 
              ? 'bg-gradient-radial from-purple-900/20 via-transparent to-transparent' 
              : 'bg-gradient-radial from-white/40 via-transparent to-transparent'
          } opacity-50`} />
          <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-500 ${
            theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-200/20'
          }`} />
          <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-500 ${
            theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-200/20'
          }`} />
          <div className={`absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl transition-colors duration-500 ${
            theme === 'dark' ? 'bg-pink-500/10' : 'bg-pink-200/20'
          }`} />
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full"
          >
            {renderAuthPage()}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-hidden relative transition-colors duration-500 ${
      theme === 'dark' 
        ? 'bg-gradient-to-b from-slate-900 via-purple-950 to-slate-950' 
        : 'bg-gradient-to-b from-blue-50/80 via-purple-50/80 to-pink-50/80'
    }`}>
      {/* Cloud-like background gradient overlay */}
      <div className="fixed inset-0 pointer-events-none transition-opacity duration-500">
        <div className={`absolute inset-0 ${
          theme === 'dark' 
            ? 'bg-gradient-radial from-purple-900/20 via-transparent to-transparent' 
            : 'bg-gradient-radial from-white/40 via-transparent to-transparent'
        } opacity-50`} />
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-500 ${
          theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-200/20'
        }`} />
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl transition-colors duration-500 ${
          theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-200/20'
        }`} />
        <div className={`absolute top-1/2 left-1/2 w-96 h-96 rounded-full blur-3xl transition-colors duration-500 ${
          theme === 'dark' ? 'bg-pink-500/10' : 'bg-pink-200/20'
        }`} />
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentNavPage}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="h-full"
        >
          {renderAppContent()}
        </motion.div>
      </AnimatePresence>
      
      <BottomNavigation currentPage={currentNavPage} onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

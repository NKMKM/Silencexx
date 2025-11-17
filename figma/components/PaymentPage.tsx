import { useState } from 'react';
import { ArrowLeft, CreditCard, Lock, Check, Apple, Smartphone, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { CreditCardVisual } from './CreditCardVisual';

interface PaymentPageProps {
  planName: string;
  planPrice: string;
  onNavigateBack: () => void;
  onPaymentSuccess: () => void;
}

export function PaymentPage({ planName, planPrice, onNavigateBack, onPaymentSuccess }: PaymentPageProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | 'google' | 'sbp'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [email, setEmail] = useState('');

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.length <= 19) {
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    if (formatted.length <= 5) {
      setExpiry(formatted);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/gi, '');
    if (value.length <= 3) {
      setCvv(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      
      // Redirect after success
      setTimeout(() => {
        onPaymentSuccess();
      }, 2000);
    }, 2000);
  };

  const paymentMethods = [
    { id: 'card' as const, name: 'Банковская карта', icon: CreditCard },
    { id: 'apple' as const, name: 'Apple Pay', icon: Apple },
    { id: 'google' as const, name: 'Google Pay', icon: Smartphone },
    { id: 'sbp' as const, name: 'СБП', icon: Smartphone },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/80 via-purple-50/80 to-pink-50/80 relative">
      {/* Cloud-like background gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-white/40 via-transparent to-transparent opacity-50" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="bg-white/60 backdrop-blur-2xl border-b border-white/30 px-4 py-3 flex items-center gap-3 shadow-sm relative z-10">
        <button
          onClick={onNavigateBack}
          className="p-2 hover:bg-purple-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-purple-600" />
        </button>
        <span className="text-slate-800">Оформление подписки</span>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-6 space-y-6 pb-12">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-2xl rounded-3xl p-8 border border-white/30 shadow-xl text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.6 }}
                className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-slate-900">Оплата прошла успешно!</h2>
              <p className="text-slate-600">
                Подписка "{planName}" активирована. Спасибо за доверие! 💙
              </p>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-sm text-slate-500"
              >
                Перенаправление...
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Order Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-2xl rounded-3xl p-6 border border-white/30 shadow-xl"
              >
                <h3 className="text-slate-800 mb-4">Детали заказа</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">План подписки</span>
                    <span className="text-slate-900">{planName}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-900">Итого к оплате</span>
                    <span className="text-slate-900 text-xl">{planPrice}/месяц</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    * Следующее списание произойдет автоматически через месяц
                  </div>
                </div>
              </motion.div>

              {/* Payment Method Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-2xl rounded-3xl p-6 border border-white/30 shadow-xl"
              >
                <h3 className="text-slate-800 mb-4">Способ оплаты</h3>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <motion.button
                        key={method.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-4 rounded-2xl border-2 transition-all ${
                          paymentMethod === method.id
                            ? 'border-purple-400 bg-purple-50/50 shadow-lg'
                            : 'border-white/30 bg-white/30 hover:border-white/50'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${
                          paymentMethod === method.id ? 'text-purple-600' : 'text-slate-500'
                        }`} />
                        <span className={`text-sm ${
                          paymentMethod === method.id ? 'text-purple-900' : 'text-slate-700'
                        }`}>
                          {method.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Payment Form */}
              {paymentMethod === 'card' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-2xl rounded-3xl p-6 border border-white/30 shadow-xl"
                >
                  {/* Credit Card Visual */}
                  <div className="mb-6">
                    <CreditCardVisual
                      cardNumber={cardNumber}
                      cardName={cardName}
                      expiry={expiry}
                      cvv={cvv}
                      showCVV={false}
                    />
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700">Email для чека</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="rounded-2xl border-slate-200 bg-white/50"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cardNumber" className="text-slate-700">Номер карты</Label>
                      <Input
                        id="cardNumber"
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="rounded-2xl border-slate-200 bg-white/50"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cardName" className="text-slate-700">Имя владельца карты</Label>
                      <Input
                        id="cardName"
                        type="text"
                        placeholder="IVAN IVANOV"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        className="rounded-2xl border-slate-200 bg-white/50"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry" className="text-slate-700">Срок действия</Label>
                        <Input
                          id="expiry"
                          type="text"
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={handleExpiryChange}
                          className="rounded-2xl border-slate-200 bg-white/50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv" className="text-slate-700">CVV</Label>
                        <Input
                          id="cvv"
                          type="text"
                          placeholder="123"
                          value={cvv}
                          onChange={handleCvvChange}
                          className="rounded-2xl border-slate-200 bg-white/50"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-blue-50/50 border border-blue-200/30">
                      <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <p className="text-xs text-blue-900">
                        Ваши данные защищены шифрованием по стандарту PCI DSS
                      </p>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Обработка платежа...
                          </>
                        ) : (
                          <>
                            <Lock className="w-5 h-5 mr-2" />
                            Оплатить {planPrice}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </motion.div>
              )}

              {/* Alternative Payment Methods */}
              {paymentMethod !== 'card' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-2xl rounded-3xl p-8 border border-white/30 shadow-xl text-center space-y-4"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    {paymentMethod === 'apple' && <Apple className="w-8 h-8 text-white" />}
                    {(paymentMethod === 'google' || paymentMethod === 'sbp') && <Smartphone className="w-8 h-8 text-white" />}
                  </div>
                  <h3 className="text-slate-900">
                    {paymentMethod === 'apple' && 'Оплата через Apple Pay'}
                    {paymentMethod === 'google' && 'Оплата через Google Pay'}
                    {paymentMethod === 'sbp' && 'Оплата через СБП'}
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Для завершения оплаты вы будете перенаправлены в приложение
                  </p>
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Перенаправление...
                      </>
                    ) : (
                      `Продолжить с ${paymentMethod === 'apple' ? 'Apple Pay' : paymentMethod === 'google' ? 'Google Pay' : 'СБП'}`
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Security Notice */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center p-4 rounded-2xl bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl border border-white/30"
              >
                <p className="text-slate-600 text-xs">
                  🔒 Безопасная оплата через защищенное соединение. Мы не храним данные вашей карты.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

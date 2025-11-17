import { motion } from 'motion/react';
import { CreditCard, Waves } from 'lucide-react';

interface CreditCardVisualProps {
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv?: string;
  showCVV?: boolean;
}

export function CreditCardVisual({ cardNumber, cardName, expiry, cvv, showCVV = false }: CreditCardVisualProps) {
  const formatCardDisplay = (number: string) => {
    if (!number) return '•••• •••• •••• ••••';
    const formatted = number.padEnd(19, '•');
    return formatted;
  };

  const getCardType = (number: string) => {
    const firstDigit = number.replace(/\s/g, '')[0];
    if (firstDigit === '4') return 'visa';
    if (firstDigit === '5') return 'mastercard';
    if (firstDigit === '2') return 'mir';
    return 'default';
  };

  const cardType = getCardType(cardNumber);

  return (
    <div className="w-full max-w-sm mx-auto perspective-1000">
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ rotateY: showCVV ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        className="relative preserve-3d"
      >
        {/* Front of card */}
        <motion.div
          className={`backface-hidden ${showCVV ? 'invisible' : 'visible'}`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="relative w-full aspect-[1.586/1] rounded-3xl overflow-hidden shadow-2xl">
            {/* Card Background with Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900">
              {/* Animated gradient overlay */}
              <motion.div
                animate={{
                  background: [
                    'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(236,72,153,0.3) 100%)',
                    'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(139,92,246,0.3) 100%)',
                    'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(236,72,153,0.3) 100%)',
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0"
              />

              {/* Decorative circles */}
              <div className="absolute top-8 right-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute bottom-8 left-8 w-32 h-32 rounded-full bg-purple-500/20 blur-3xl" />

              {/* Wave pattern */}
              <svg
                className="absolute bottom-0 left-0 w-full opacity-20"
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
              >
                <motion.path
                  d="M0,0 C150,50 350,0 600,50 C850,100 1050,50 1200,0 L1200,120 L0,120 Z"
                  fill="white"
                  initial={{ d: "M0,0 C150,50 350,0 600,50 C850,100 1050,50 1200,0 L1200,120 L0,120 Z" }}
                  animate={{
                    d: [
                      "M0,0 C150,50 350,0 600,50 C850,100 1050,50 1200,0 L1200,120 L0,120 Z",
                      "M0,50 C150,0 350,100 600,50 C850,0 1050,100 1200,50 L1200,120 L0,120 Z",
                      "M0,0 C150,50 350,0 600,50 C850,100 1050,50 1200,0 L1200,120 L0,120 Z",
                    ],
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
              </svg>
            </div>

            {/* Card Content */}
            <div className="relative h-full p-6 flex flex-col justify-between text-white">
              {/* Top Section */}
              <div className="flex justify-between items-start">
                <motion.div
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-12 h-10 rounded-lg bg-gradient-to-br from-yellow-400/80 to-yellow-600/80 flex items-center justify-center"
                >
                  <div className="w-8 h-6 bg-yellow-300/50 rounded" />
                </motion.div>

                <div className="text-right">
                  {cardType === 'visa' && (
                    <div className="text-2xl tracking-wider">VISA</div>
                  )}
                  {cardType === 'mastercard' && (
                    <div className="flex gap-1">
                      <div className="w-6 h-6 rounded-full bg-red-500/80" />
                      <div className="w-6 h-6 rounded-full bg-orange-400/80 -ml-3" />
                    </div>
                  )}
                  {cardType === 'mir' && (
                    <div className="text-xl">МИР</div>
                  )}
                </div>
              </div>

              {/* Card Number */}
              <div>
                <motion.div
                  key={cardNumber}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-2xl tracking-wider mb-1"
                >
                  {formatCardDisplay(cardNumber)}
                </motion.div>
              </div>

              {/* Bottom Section */}
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs text-white/60 mb-1">Владелец карты</div>
                  <motion.div
                    key={cardName}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm tracking-wide"
                  >
                    {cardName || 'YOUR NAME'}
                  </motion.div>
                </div>
                <div>
                  <div className="text-xs text-white/60 mb-1">Действительна до</div>
                  <motion.div
                    key={expiry}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm tracking-wide"
                  >
                    {expiry || 'MM/YY'}
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Back of card */}
        {showCVV && (
          <motion.div
            className="absolute inset-0 backface-hidden"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="relative w-full aspect-[1.586/1] rounded-3xl overflow-hidden shadow-2xl">
              {/* Card Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" />

              {/* Card Content */}
              <div className="relative h-full flex flex-col">
                {/* Magnetic stripe */}
                <div className="w-full h-12 bg-black mt-6" />

                {/* CVV Section */}
                <div className="flex-1 p-6 flex items-center">
                  <div className="w-full">
                    <div className="bg-white/90 rounded-lg p-4 flex justify-end items-center">
                      <motion.div
                        key={cvv}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-slate-800 tracking-widest text-xl italic"
                      >
                        {cvv || '•••'}
                      </motion.div>
                    </div>
                    <p className="text-white/60 text-xs mt-2 text-right">CVV код</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

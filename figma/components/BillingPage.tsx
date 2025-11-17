import { useState, useRef } from 'react';
import { ArrowLeft, Crown, Sparkles, Zap, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import Slider from 'react-slick';

interface BillingPageProps {
  onNavigateBack: () => void;
  onNavigateToPayment: (planName: string, price: string) => void;
}

const plans = [
  {
    name: 'Бесплатный',
    nameEn: 'Free',
    price: '0₽',
    priceNum: 0,
    period: 'навсегда',
    icon: Sparkles,
    iconColor: 'text-slate-500',
    gradient: 'from-slate-400/20 to-slate-500/20',
    borderGradient: 'from-slate-300 to-slate-400',
    features: [
      '10 сообщений в день',
      'Базовые дыхательные упражнения',
      'Дневник мыслей',
      'Отслеживание настроения',
      'Ежедневные аффирмации',
    ],
    isCurrent: true,
  },
  {
    name: 'Премиум',
    nameEn: 'Premium',
    price: '399₽',
    priceNum: 399,
    period: 'в месяц',
    icon: Crown,
    iconColor: 'text-purple-600',
    gradient: 'from-purple-400/30 to-pink-500/30',
    borderGradient: 'from-purple-400 to-pink-500',
    features: [
      'Неограниченные сообщения',
      'Продвинутые упражнения',
      'Приоритетная поддержка',
      'Все звуковые ландшафты',
      'Экспорт дневника',
      'Без рекламы',
    ],
    isPopular: true,
  },
  {
    name: 'Профессиональный',
    nameEn: 'Professional',
    price: '699₽',
    priceNum: 699,
    period: 'в месяц',
    icon: Zap,
    iconColor: 'text-blue-600',
    gradient: 'from-blue-400/30 to-cyan-500/30',
    borderGradient: 'from-blue-400 to-cyan-500',
    features: [
      'Всё из Премиум',
      'Персональные рекомендации',
      'Аналитика эмоций',
      'Видеозвонки с терапевтом',
      'Семейный доступ (до 5 человек)',
      'Кризисная поддержка 24/7',
    ],
  },
];

export function BillingPage({ onNavigateBack, onNavigateToPayment }: BillingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const sliderRef = useRef<any>(null);

  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    centerMode: true,
    centerPadding: '20px',
    beforeChange: (current: number, next: number) => setCurrentSlide(next),
    arrows: false,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          centerMode: true,
          centerPadding: '40px',
        }
      }
    ]
  };

  const handleNext = () => {
    sliderRef.current?.slickNext();
  };

  const handlePrev = () => {
    sliderRef.current?.slickPrev();
  };

  const PlanCard = ({ plan, index }: { plan: typeof plans[0], index: number }) => {
    const Icon = plan.icon;
    
    return (
      <div className="px-2 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative group h-full"
        >
          {/* Glass card with cloud effect */}
          <div
            className={`relative h-full rounded-3xl p-6 backdrop-blur-2xl border-2 transition-all duration-300 ${
              plan.isPopular
                ? 'bg-gradient-to-br from-white/90 to-white/70 border-transparent shadow-2xl shadow-purple-500/20'
                : 'bg-gradient-to-br from-white/70 to-white/50 border-white/30 hover:border-white/50'
            }`}
            style={{
              background: plan.isPopular
                ? 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)',
            }}
          >
            {/* Gradient border effect */}
            <div
              className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl bg-gradient-to-r ${plan.borderGradient}`}
            />

            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg">
                  Популярный
                </Badge>
              </div>
            )}

            {plan.isCurrent && (
              <div className="absolute -top-3 right-4">
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
                  Текущий
                </Badge>
              </div>
            )}

            <div className="space-y-6">
              {/* Icon and name */}
              <div className="space-y-3">
                <motion.div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.gradient} backdrop-blur-xl flex items-center justify-center border border-white/30`}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Icon className={`w-6 h-6 ${plan.iconColor}`} />
                </motion.div>
                <div>
                  <h3 className="text-slate-900">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-slate-900 text-2xl">{plan.price}</span>
                    <span className="text-slate-600 text-sm">/{plan.period}</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3 min-h-[200px]">
                {plan.features.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + i * 0.05 }}
                    className="flex items-start gap-2"
                  >
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-slate-700 text-sm leading-tight">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {plan.isCurrent ? (
                  <Button
                    className="w-full rounded-2xl bg-gradient-to-r from-slate-400 to-slate-500 text-white hover:from-slate-500 hover:to-slate-600 shadow-lg"
                    disabled
                  >
                    Текущий план
                  </Button>
                ) : (
                  <Button
                    onClick={() => onNavigateToPayment(plan.name, plan.price)}
                    className={`w-full rounded-2xl shadow-lg ${
                      plan.isPopular
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white'
                    }`}
                  >
                    {plan.isPopular ? 'Попробовать' : 'Обновить'}
                  </Button>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/80 via-purple-50/80 to-pink-50/80 relative">
      {/* Cloud-like background gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-white/40 via-transparent to-transparent opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="bg-white/60 backdrop-blur-2xl border-b border-white/30 px-4 py-3 flex items-center gap-3 shadow-sm relative z-10">
        <button
          onClick={onNavigateBack}
          className="p-2 hover:bg-purple-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-purple-600" />
        </button>
        <span className="text-slate-800">Тарифы и подписка</span>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-12">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 pt-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 backdrop-blur-xl border border-white/30">
            <Crown className="w-4 h-4 text-purple-600" />
            <span className="text-purple-900 text-sm">Выберите свой путь к покою</span>
          </div>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Выберите план, который подходит вам. Отмените в любое время.
          </p>
        </motion.div>

        {/* Desktop Grid View */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {plans.map((plan, index) => (
            <PlanCard key={plan.nameEn} plan={plan} index={index} />
          ))}
        </div>

        {/* Mobile Slider View */}
        <div className="md:hidden relative">
          <style>{`
            .slick-dots {
              bottom: -35px;
            }
            .slick-dots li button:before {
              font-size: 8px;
              color: #a78bfa;
            }
            .slick-dots li.slick-active button:before {
              color: #8b5cf6;
            }
          `}</style>
          
          <Slider ref={sliderRef} {...settings}>
            {plans.map((plan, index) => (
              <PlanCard key={plan.nameEn} plan={plan} index={index} />
            ))}
          </Slider>

          {/* Navigation Arrows */}
          {currentSlide > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handlePrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/80 backdrop-blur-xl border border-white/30 shadow-lg"
            >
              <ChevronLeft className="w-5 h-5 text-purple-600" />
            </motion.button>
          )}
          
          {currentSlide < plans.length - 1 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/80 backdrop-blur-xl border border-white/30 shadow-lg"
            >
              <ChevronRight className="w-5 h-5 text-purple-600" />
            </motion.button>
          )}
        </div>

        {/* Additional info with glass effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center p-4 rounded-2xl bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl border border-white/30 mt-8"
        >
          <p className="text-slate-600 text-sm">
            💙 Все планы включают полную конфиденциальность и шифрование данных
          </p>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl border border-white/30 rounded-3xl p-6 space-y-4"
        >
          <h3 className="text-slate-800 text-center">Часто задаваемые вопросы</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-700">🔄 Могу ли я отменить подписку в любое время?</p>
              <p className="text-slate-600 text-xs mt-1 ml-5">Да, вы можете отменить подписку в любой момент без штрафов.</p>
            </div>
            <div>
              <p className="text-slate-700">💳 Какие способы оплаты доступны?</p>
              <p className="text-slate-600 text-xs mt-1 ml-5">Мы принимаем карты, Apple Pay, Google Pay и СБП.</p>
            </div>
            <div>
              <p className="text-slate-700">🔒 Безопасны ли мои данные?</p>
              <p className="text-slate-600 text-xs mt-1 ml-5">Все данные зашифрованы и защищены по стандартам банковской безопасности.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

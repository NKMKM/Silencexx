import { motion } from 'motion/react';
import { Phone, MessageCircle, ExternalLink, Heart } from 'lucide-react';
import { Button } from './ui/button';

interface CrisisSupportProps {
  onClose: () => void;
}

const helplines = [
  {
    country: 'Россия',
    resources: [
      { name: 'Телефон доверия', number: '8-800-2000-122', type: 'phone', description: 'Круглосуточно, бесплатно' },
      { name: 'Ясное утро', number: '8-800-100-49-94', type: 'phone', description: 'Психологическая помощь' },
    ]
  },
  {
    country: 'Международный',
    resources: [
      { name: 'Befrienders Worldwide', url: 'https://www.befrienders.org', type: 'web', description: 'Поддержка по всему миру' },
    ]
  }
];

export function CrisisSupport({ onClose }: CrisisSupportProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/95 backdrop-blur-lg rounded-3xl p-6 md:p-8 border border-white/20 max-w-2xl mx-auto shadow-2xl"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-red-400 flex items-center justify-center flex-shrink-0">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl md:text-2xl text-slate-800 mb-2">Я слышу, что тебе очень тяжело</h3>
          <p className="text-slate-600 text-sm md:text-base">
            Это состояние требует заботы. Я не психолог, но сейчас важно, чтобы ты не был один.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50/50 rounded-2xl p-4">
          <p className="text-slate-700 text-sm md:text-base">
            То, что ты чувствуешь прямо сейчас — это не вся твоя жизнь. Это очень болезненный момент, 
            но есть люди, которые готовы помочь тебе через него пройти.
          </p>
        </div>

        {helplines.map((region, idx) => (
          <div key={idx} className="space-y-3">
            <h4 className="text-slate-700 font-medium">{region.country}</h4>
            <div className="space-y-2">
              {region.resources.map((resource, ridx) => (
                <motion.div
                  key={ridx}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {resource.type === 'phone' ? (
                      <Phone className="w-5 h-5 text-purple-600" />
                    ) : resource.type === 'web' ? (
                      <ExternalLink className="w-5 h-5 text-purple-600" />
                    ) : (
                      <MessageCircle className="w-5 h-5 text-purple-600" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{resource.name}</div>
                      <div className="text-sm text-slate-600">{resource.description}</div>
                    </div>
                    {resource.number && (
                      <a
                        href={`tel:${resource.number}`}
                        className="text-purple-600 font-medium hover:text-purple-700"
                      >
                        {resource.number}
                      </a>
                    )}
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 font-medium hover:text-purple-700"
                      >
                        Перейти
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-3 pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 rounded-2xl border-slate-200 hover:bg-slate-50"
          >
            Закрыть
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

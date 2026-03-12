import { motion } from 'motion/react';
import { Check, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';

const pricingPlans = [
  {
    name: 'Бесплатный',
    price: '0',
    period: 'навсегда',
    description: 'Для знакомства с сервисом',
    features: [
      'До 5 документов в месяц',
      'Простая электронная подпись',
      '1 пользователь',
      'Email поддержка',
      'Базовые шаблоны',
    ],
    cta: 'Начать бесплатно',
    ctaHref: '/register',
    popular: false,
    cardStyle: 'bg-white border-2 border-[#A6C5D7]/60',
    btnStyle: 'bg-[#000926] hover:bg-[#000926]/85 text-white',
  },
  {
    name: 'Стартовый',
    price: '1,990',
    period: 'в месяц',
    description: 'Для малого бизнеса',
    features: [
      'До 50 документов в месяц',
      'Усиленная электронная подпись',
      'До 5 пользователей',
      'Шаблоны документов',
      'Приоритетная поддержка',
      'API доступ',
      'Брендирование документов',
    ],
    cta: 'Попробовать 14 дней',
    ctaHref: '/register',
    popular: true,
    cardStyle: 'bg-white border-2 border-[#0F52BA] shadow-2xl',
    btnStyle: 'bg-[#0F52BA] hover:bg-[#0036A3] text-white',
  },
  {
    name: 'Бизнес',
    price: '4,990',
    period: 'в месяц',
    description: 'Для растущих компаний',
    features: [
      'До 200 документов в месяц',
      'Все типы подписей',
      'До 20 пользователей',
      'Интеграция с CRM/ERP',
      'Персональный менеджер',
      'Аналитика и отчеты',
      'Автоматизация процессов',
      'SLA 99.5%',
    ],
    cta: 'Попробовать 14 дней',
    ctaHref: '/register',
    popular: false,
    cardStyle: 'bg-white border-2 border-[#A6C5D7]/60',
    btnStyle: 'bg-[#000926] hover:bg-[#000926]/85 text-white',
  },
  {
    name: 'Корпоративный',
    price: 'По запросу',
    period: '',
    description: 'Для крупных организаций',
    features: [
      'Безлимитные документы',
      'Все возможности системы',
      'Неограниченно пользователей',
      'Dedicated сервер',
      'SLA 99.9%',
      'Кастомные интеграции',
      'Обучение команды',
      'Юридическое сопровождение',
    ],
    cta: 'Связаться с нами',
    ctaHref: '#contact',
    popular: false,
    cardStyle: 'bg-white border-2 border-[#A6C5D7]/60',
    btnStyle: 'bg-[#000926] hover:bg-[#000926]/85 text-white',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-[#A6C5D7]/15">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-[#000926] mb-5"
          >
            Прозрачные тарифы
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#000926]/60 max-w-2xl mx-auto"
          >
            Выберите план, который подходит вашему бизнесу. Все планы включают 14 дней бесплатно.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start mb-12">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-5 left-0 right-0 flex justify-center z-10">
                  <div className="bg-[#0F52BA] text-white px-5 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg">
                    <Zap className="w-3.5 h-3.5" />
                    Популярный
                  </div>
                </div>
              )}

              <div className={`${plan.cardStyle} rounded-2xl p-7 h-full flex flex-col`}>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-[#000926] mb-1">{plan.name}</h3>
                  <p className="text-base text-[#000926]/55 mb-5">{plan.description}</p>

                  <div className="flex items-baseline gap-1">
                    {plan.price === 'По запросу' ? (
                      <span className="text-3xl font-bold text-[#000926]">{plan.price}</span>
                    ) : (
                      <>
                        <span className="text-5xl font-bold text-[#0F52BA]">{plan.price}₽</span>
                        {plan.period && <span className="text-[#000926]/50 text-base">/{plan.period}</span>}
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check className="w-5 h-5 text-[#16a34a] flex-shrink-0 mt-0.5" />
                      <span className="text-base text-[#000926]/75">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.ctaHref.startsWith('/') ? (
                  <Link to={plan.ctaHref}>
                    <Button className={`w-full py-6 text-lg font-semibold rounded-xl ${plan.btnStyle}`}>
                      {plan.cta}
                    </Button>
                  </Link>
                ) : (
                  <a href={plan.ctaHref}>
                    <Button className={`w-full py-6 text-lg font-semibold rounded-xl ${plan.btnStyle}`}>
                      {plan.cta}
                    </Button>
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 bg-[#16a34a]/10 border border-[#16a34a]/20 text-[#16a34a] px-6 py-3 rounded-full mb-3">
            <Check className="w-5 h-5" />
            <span className="font-semibold">Все тарифы включают 14 дней бесплатного периода</span>
          </div>
          <p className="text-sm text-[#000926]/45">
            Кредитная карта не требуется. Отмените в любое время.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

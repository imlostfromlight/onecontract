import { motion } from 'motion/react';
import { Check, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

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
    popular: false,
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
    popular: true,
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
    popular: false,
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
    popular: false,
  },
];

export function Pricing() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Прозрачные тарифы
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Выберите план, который подходит вашему бизнесу. Все планы включают 14 дней бесплатно.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center z-10">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-lg">
                    <Zap className="w-3 h-3" />
                    Популярный
                  </div>
                </div>
              )}

              <Card className={`p-6 h-full flex flex-col ${
                plan.popular 
                  ? 'border-2 border-blue-600 shadow-xl bg-gradient-to-br from-blue-50 to-purple-50' 
                  : 'bg-white'
              }`}>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  
                  <div className="flex items-baseline gap-1">
                    {plan.price === 'По запросу' ? (
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-gray-900">{plan.price}₽</span>
                        {plan.period && <span className="text-gray-600">/{plan.period}</span>}
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {plan.cta}
                </Button>
              </Card>
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
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-6 py-3 rounded-full mb-4">
            <Check className="w-5 h-5" />
            <span className="font-medium">Все тарифы включают 14 дней бесплатного периода</span>
          </div>
          <p className="text-sm text-gray-600">
            Кредитная карта не требуется. Отмените в любое время.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

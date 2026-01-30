import { motion } from 'motion/react';
import { Star, TrendingUp, Clock, Shield } from 'lucide-react';

const testimonials = [
  {
    name: 'Алексей Иванов',
    role: 'Директор, ТехКомпани',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    text: 'Сократили время на подписание договоров с 3 дней до 2 часов. Это просто невероятно!',
    metrics: '↓ 95% времени',
  },
  {
    name: 'Мария Петрова',
    role: 'Юрист, ПравоГрупп',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    text: 'Полностью юридически корректно. Все наши клиенты довольны скоростью и удобством.',
    metrics: '0 ошибок',
  },
  {
    name: 'Дмитрий Соколов',
    role: 'CEO, СтартапХаб',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    text: 'OneContract стал нашим основным инструментом для работы с партнерами по всему миру.',
    metrics: '200+ договоров/месяц',
  },
  {
    name: 'Елена Смирнова',
    role: 'HR-директор, МегаХолдинг',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
    text: 'Подписываем трудовые договоры дистанционно. Сотрудники в восторге от простоты!',
    metrics: '↑ 87% удовлетворенности',
  },
];

const logos = [
  { name: 'TechCorp' },
  { name: 'InnovateHub' },
  { name: 'GlobalTrade' },
  { name: 'SmartSolutions' },
  { name: 'FutureVentures' },
  { name: 'NextGenBiz' },
];

export function SocialProof() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Client Logos */}
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-wider text-gray-500 mb-8">
            Нам доверяют лидеры рынка
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {logos.map((logo, index) => (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-gray-400 font-bold text-xl md:text-2xl hover:text-gray-600 transition-colors"
              >
                {logo.name}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">2,500+</p>
            <p className="text-gray-600">Активных компаний</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">1 мин</p>
            <p className="text-gray-600">Средняя подпись</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">100%</p>
            <p className="text-gray-600">Юр. корректность</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mb-4">
              <Star className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">4.9/5</p>
            <p className="text-gray-600">Рейтинг</p>
          </motion.div>
        </div>

        {/* Testimonials */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Что говорят наши клиенты
          </h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
            Реальные отзывы от компаний, которые уже экономят время и деньги
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-gray-700 text-sm mb-4">{testimonial.text}</p>

              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-blue-700 font-semibold text-sm">{testimonial.metrics}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

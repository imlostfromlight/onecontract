import { motion } from 'motion/react';
import { Star, TrendingUp, Clock, Shield, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Алексей Иванов',
    role: 'Директор',
    company: 'ТехКомпани',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    text: 'Сократили время на подписание договоров с 3 дней до 2 часов. Это просто невероятно!',
    metrics: '↓ 95% времени',
    source: 'Google Review',
  },
  {
    name: 'Мария Петрова',
    role: 'Юрист',
    company: 'ПравоГрупп',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    text: 'Полностью юридически корректно. Все наши клиенты довольны скоростью и удобством.',
    metrics: '0 ошибок',
    source: 'Trustpilot',
  },
  {
    name: 'Дмитрий Соколов',
    role: 'CEO',
    company: 'СтартапХаб',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    text: 'OneContract стал нашим основным инструментом для работы с партнерами по всему миру.',
    metrics: '200+ договоров/месяц',
    source: 'G2',
  },
  {
    name: 'Елена Смирнова',
    role: 'HR-директор',
    company: 'МегаХолдинг',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
    text: 'Подписываем трудовые договоры дистанционно. Сотрудники в восторге от простоты!',
    metrics: '↑ 87% удовлетворённости',
    source: 'Capterra',
  },
];

const logos = [
  { name: 'TechCorp', abbr: 'TC' },
  { name: 'InnovateHub', abbr: 'IH' },
  { name: 'GlobalTrade', abbr: 'GT' },
  { name: 'SmartSolutions', abbr: 'SS' },
  { name: 'FutureVentures', abbr: 'FV' },
  { name: 'NextGenBiz', abbr: 'NB' },
];

/** Top block: logos + stats — shown right after HowItWorks */
export function SocialStats() {
  return (
    <section className="py-16 bg-[#A6C5D7]/20">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Client Logos */}
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-widest text-[#000926]/50 font-semibold mb-10">
            Нам доверяют лидеры рынка
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
            {logos.map((logo, index) => (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="flex items-center gap-2 group"
              >
                {/* Logo circle placeholder */}
                <div className="w-10 h-10 rounded-xl bg-[#0F52BA]/10 flex items-center justify-center text-[#0F52BA] font-bold text-xs border border-[#0F52BA]/20 group-hover:bg-[#0F52BA] group-hover:text-white transition-all duration-300">
                  {logo.abbr}
                </div>
                <span className="text-[#000926]/60 font-bold text-lg md:text-xl group-hover:text-[#000926] transition-colors">
                  {logo.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { Icon: TrendingUp, value: '2,500+', label: 'Активных компаний', color: 'bg-[#0F52BA]/10 text-[#0F52BA]' },
            { Icon: Clock, value: '1 мин', label: 'Средняя подпись', color: 'bg-[#16a34a]/10 text-[#16a34a]' },
            { Icon: Shield, value: '100%', label: 'Юр. корректность', color: 'bg-[#0F52BA]/10 text-[#0F52BA]' },
            { Icon: Star, value: '4.9', label: 'Рейтинг', color: 'bg-[#16a34a]/10 text-[#16a34a]' },
          ].map(({ Icon, value, label, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center bg-white rounded-2xl p-6 shadow-sm border border-[#A6C5D7]/40 hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 ${color} rounded-xl mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <p className="text-4xl font-bold text-[#0F52BA] mb-1">{value}</p>
              <p className="text-[#000926]/60 text-sm">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Testimonials block — shown after Quiz */
export function Testimonials() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-[#000926] mb-4"
          >
            Что говорят наши клиенты
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-[#000926]/60 max-w-2xl mx-auto"
          >
            Реальные отзывы от компаний, которые уже экономят время и деньги
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t, index) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative bg-white border border-[#A6C5D7]/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-[#0F52BA]/20 mb-3 flex-shrink-0" />

              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>

              {/* Quote text */}
              <p className="text-[#000926]/80 text-sm leading-relaxed mb-4 flex-grow">
                "{t.text}"
              </p>

              {/* Metrics badge */}
              <div className="inline-flex items-center bg-[#16a34a]/10 border border-[#16a34a]/20 rounded-full px-3 py-1 mb-4">
                <span className="text-[#16a34a] font-semibold text-xs">{t.metrics}</span>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#A6C5D7]/30">
                <img
                  src={t.image}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#A6C5D7]/50"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#000926] text-sm truncate">{t.name}</p>
                  <p className="text-[#000926]/50 text-xs truncate">{t.role}, {t.company}</p>
                </div>
                <span className="text-[#000926]/30 text-xs flex-shrink-0">{t.source}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** @deprecated Use SocialStats + Testimonials separately */
export function SocialProof() {
  return (
    <>
      <SocialStats />
      <Testimonials />
    </>
  );
}

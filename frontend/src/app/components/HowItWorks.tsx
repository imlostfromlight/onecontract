import { motion } from 'motion/react';
import { Upload, Edit3, CheckCircle, Eye, Users, Bell, Database, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useState } from 'react';

const steps = [
  {
    icon: Upload,
    title: 'Загрузите документ',
    description: 'Перетащите файл или загрузите из облака. Поддерживаем PDF, DOCX и другие форматы.',
    color: 'blue',
  },
  {
    icon: Edit3,
    title: 'Добавьте подписантов',
    description: 'Укажите email получателей, настройте порядок подписания и поля для заполнения.',
    color: 'purple',
  },
  {
    icon: CheckCircle,
    title: 'Получите готовый договор',
    description: 'Все стороны получат уведомления. После подписания документ сохранится автоматически.',
    color: 'green',
  },
];

const features = [
  {
    icon: Eye,
    title: 'Полный контроль документа',
    description: 'Отслеживайте статус в реальном времени. Видите, кто и когда открыл документ, внес изменения или поставил подпись.',
  },
  {
    icon: Users,
    title: 'Многосторонние договоры',
    description: 'Настройте последовательность подписания для нескольких сторон. Каждый участник получит уведомление в свою очередь.',
  },
  {
    icon: Bell,
    title: 'Мгновенные уведомления',
    description: 'Получайте уведомления на email и в Telegram о каждом действии с документом. Будьте всегда в курсе.',
  },
  {
    icon: Database,
    title: 'Автоматическое хранение',
    description: 'Все подписанные документы автоматически сохраняются в защищенном облаке с возможностью поиска и фильтрации.',
  },
];

function FeatureItem({ feature, index }: { feature: typeof features[0], index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = feature.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-gray-100"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 text-left">
              <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm">{feature.title}</h4>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </motion.div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-2">
          <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function HowItWorks() {
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
            Как это работает
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Три простых шага от загрузки до подписанного документа
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-20 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-secondary/50 via-primary/50 to-secondary/50"></div>

          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ y: -10 }}
                className="relative group"
              >
                <div className="bg-card rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 relative z-10 border border-border/50">
                  {/* Step number */}
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl mb-6 transition-all duration-300 group-hover:scale-110`}>
                    <Icon className="w-8 h-8 text-secondary-foreground" />
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>

                  <p className="text-foreground/70 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Hover effect indicator */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Additional info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-full">
            <CheckCircle className="w-5 h-5 bg-transparent" />
            <span className="font-medium">
              Среднее время от загрузки до подписания: <span className="text-foreground font-bold">1 минута</span>
            </span>
          </div>
        </motion.div>

        {/* Features Section - Mobile Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 md:hidden"
        >
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
            Дополнительные возможности
          </h3>
          <div className="space-y-3">
            {features.map((feature, index) => (
              <FeatureItem key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
import { motion } from 'motion/react';
import { Shield } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

const faqs = [
  {
    question: 'Электронная подпись юридически действительна?',
    answer: 'Да, абсолютно. Мы используем усиленную квалифицированную электронную подпись (УКЭП), которая полностью соответствует Федеральному закону №63-ФЗ "Об электронной подписи". Документы, подписанные через OneContract, имеют такую же юридическую силу, как и бумажные с собственноручной подписью. Мы являемся аккредитованным удостоверяющим центром.',
  },
  {
    question: 'Как быстро можно начать работу?',
    answer: 'Регистрация занимает менее 2 минут. После регистрации вы сразу можете загрузить документ и отправить его на подпись. Для простой электронной подписи это всё - можно сразу работать. Для получения усиленной подписи потребуется пройти верификацию (обычно занимает 1-2 рабочих дня).',
  },
  {
    question: 'Можно ли интегрировать OneContract с нашей CRM?',
    answer: 'Да, мы предлагаем готовые интеграции с популярными CRM-системами (AmoCRM, Битрикс24, Salesforce) и API для кастомной интеграции. API доступен на тарифах "Стартовый" и выше. Наша техническая команда поможет с настройкой интеграции.',
  },
  {
    question: 'Где хранятся наши документы?',
    answer: 'Все документы хранятся на защищенных серверах в России с шифрованием по стандарту AES-256. Мы используем распределенное хранилище с резервным копированием. Доступ к документам имеете только вы и указанные вами пользователи. Мы соблюдаем требования 152-ФЗ о персональных данных.',
  },
  {
    question: 'Что если контрагент не хочет регистрироваться?',
    answer: 'Контрагенту не нужно создавать аккаунт или устанавливать приложения. Он получит письмо со ссылкой на документ, где сможет просмотреть его и подписать в браузере за пару кликов. Процесс максимально упрощен для подписантов.',
  },
  {
    question: 'Можно ли отменить подписку?',
    answer: 'Да, вы можете отменить подписку в любой момент из личного кабинета. При отмене подписка останется активной до конца оплаченного периода. Все ваши документы останутся доступны для скачивания в течение 30 дней после отмены.',
  },
  {
    question: 'Есть ли ограничения по размеру файлов?',
    answer: 'На бесплатном тарифе - до 10 МБ на файл. На платных тарифах - до 100 МБ. Мы поддерживаем форматы PDF, DOCX, DOC, RTF, ODT, PNG, JPG. При необходимости можем добавить поддержку других форматов.',
  },
  {
    question: 'Какая техподдержка предоставляется?',
    answer: 'Бесплатный тариф - поддержка по email с ответом в течение 24 часов. Платные тарифы - приоритетная поддержка с ответом в течение 4 часов, доступен онлайн-чат. На тарифе "Бизнес" и выше - персональный менеджер и возможность экстренной связи по телефону.',
  },
];

export function FAQ() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-6"
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Частые вопросы</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Ответы на ваши вопросы
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600"
          >
            Развеиваем сомнения о юридической силе и безопасности
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-gray-50 rounded-lg px-6 border border-gray-200"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
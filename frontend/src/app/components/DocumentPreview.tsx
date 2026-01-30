import { motion } from 'motion/react';
import { FileText, CheckCircle2, Users, Zap } from 'lucide-react';

export function DocumentPreview() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Предпросмотр в реальном времени
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Видите каждое изменение мгновенно. Контролируйте процесс от начала до конца.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Browser window mockup */}
            <div className="bg-gray-100 rounded-t-xl p-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-500">
                onecontract.ru/preview/contract-2026...
              </div>
            </div>

            {/* Document preview */}
            <div className="bg-white border-2 border-gray-200 rounded-b-xl shadow-2xl overflow-hidden">
              <div className="p-8 space-y-6">
                {/* Document header */}
                <div className="text-center pb-4 border-b-2 border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">ДОГОВОР №123/2026</h3>
                  <p className="text-sm text-gray-600">на оказание услуг</p>
                </div>

                {/* Document content */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">Исполнитель:</p>
                      <p className="text-sm text-gray-600">ООО "ТехКомпани"</p>
                      <p className="text-xs text-gray-500">ИНН: 7700123456</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-sm font-semibold text-gray-900">Заказчик:</p>
                      <p className="text-sm text-gray-600">ИП Иванов А.И.</p>
                      <p className="text-xs text-gray-500">ИНН: 770098765</p>
                    </div>
                  </div>

                  {/* Signature fields with animation */}
                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                    <motion.div
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: 1 }}
                      transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}
                      className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">Подписано</p>
                        <p className="text-xs text-gray-600">Иванов А.И. • 15:30, 7 янв 2026</p>
                      </div>
                    </motion.div>

                    <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">Ожидает подписи</p>
                        <p className="text-xs text-gray-600">ООО "ТехКомпани"</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating status cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="absolute -right-4 -top-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">Действительна</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Features List */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Полный контроль документа
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Отслеживайте статус в реальном времени. Видите, кто и когда открыл документ, внес изменения или поставил подпись.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Многосторонние договоры
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Настройте последовательность подписания для нескольких сторон. Каждый участник получит уведомление в свою очередь.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Мгновенные уведомления
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Получайте уведомления на email и в Telegram о каждом действии с документом. Будьте всегда в курсе.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Автоматическое хранение
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Все подписанные документы автоматически сохраняются в защищенном облаке с возможностью поиска и фильтрации.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

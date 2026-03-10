import { useState } from 'react';
import { motion } from 'motion/react';
import { Calculator as CalcIcon, TrendingDown, Clock, DollarSign, MessageCircle } from 'lucide-react';
import { Slider } from './ui/slider';
import { Card } from './ui/card';

export function Calculator() {
  const [contracts, setContracts] = useState(50);
  const [timePerContract, setTimePerContract] = useState(120); // minutes
  const [hourlyRate, setHourlyRate] = useState(1000); // rubles

  // Calculations
  const oldTime = (contracts * timePerContract) / 60; // hours
  const newTime = (contracts * 1) / 60; // 1 minute per contract
  const timeSaved = oldTime - newTime;
  const moneySaved = timeSaved * hourlyRate;
  const percentSaved = ((timeSaved / oldTime) * 100).toFixed(0);

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full mb-6"
          >
            <CalcIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Интерактивный калькулятор</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Рассчитайте вашу экономию
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Узнайте, сколько времени и денег вы сэкономите с OneContract
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Calculator Inputs - Fixed on desktop */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-24"
          >
            <Card className="p-8 bg-white shadow-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Введите ваши данные</h3>

              <div className="space-y-8">
                {/* Contracts per month */}
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Договоров в месяц
                    </label>
                    <span className="text-sm font-bold text-blue-600">{contracts}</span>
                  </div>
                  <Slider
                    value={[contracts]}
                    onValueChange={(value) => setContracts(value[0])}
                    min={10}
                    max={500}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>10</span>
                    <span>500</span>
                  </div>
                </div>

                {/* Time per contract */}
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Время на 1 договор (минут)
                    </label>
                    <span className="text-sm font-bold text-purple-600">{timePerContract}</span>
                  </div>
                  <Slider
                    value={[timePerContract]}
                    onValueChange={(value) => setTimePerContract(value[0])}
                    min={30}
                    max={300}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>30 мин</span>
                    <span>5 часов</span>
                  </div>
                </div>

                {/* Hourly rate */}
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Стоимость часа работы (₽)
                    </label>
                    <span className="text-sm font-bold text-green-600">{hourlyRate.toLocaleString('ru-RU')}₽</span>
                  </div>
                  <Slider
                    value={[hourlyRate]}
                    onValueChange={(value) => setHourlyRate(value[0])}
                    min={500}
                    max={10000}
                    step={500}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>500₽</span>
                    <span>10,000₽</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Results - Scrollable */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {/* Time Saved */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-semibold">Экономия времени</h4>
              </div>
              <p className="text-5xl font-bold mb-2">{timeSaved.toFixed(0)} часов</p>
              <p className="text-blue-100">в месяц</p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-blue-100">Это {percentSaved}% вашего времени!</p>
              </div>
            </motion.div>

            {/* Money Saved */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-white shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-semibold">Экономия денег</h4>
              </div>
              <p className="text-5xl font-bold mb-2">{moneySaved.toLocaleString('ru-RU')}₽</p>
              <p className="text-green-100">в месяц</p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-green-100">
                  {(moneySaved * 12).toLocaleString('ru-RU')}₽ в год
                </p>
              </div>
            </motion.div>

            {/* Productivity */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-3 rounded-lg">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-semibold">Рост эффективности</h4>
              </div>
              <p className="text-5xl font-bold mb-2">{percentSaved}%</p>
              <p className="text-purple-100">ускорение процесса</p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-purple-100">
                  Было: {oldTime.toFixed(0)}ч → Стало: {newTime.toFixed(1)}ч
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <p className="text-gray-600">Готовы начать экономить?</p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
              Попробовать бесплатно
            </button>
            <a 
              href="https://wa.me/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium transition-colors group"
            >
              <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Свяжитесь с нами</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
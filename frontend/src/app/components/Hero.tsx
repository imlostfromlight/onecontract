import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function Hero() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  return (
    <section className="relative overflow-hidden bg-white pt-20 pb-24">
      {/* Subtle powder-blue gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-[#D6E6F3]/30 to-white -z-10" />

      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-6xl font-bold text-[#000926] mb-6 leading-tight">
              Экономьте{' '}
              <span className="text-[#0F52BA]">50%</span>{' '}
              времени на подписании документов
            </h1>

            <p className="text-xl text-[#000926]/70 mb-8">
              Юридически действительная подпись онлайн за 1 минуту.
              Никакой бумажной волокиты, только современные решения для вашего бизнеса.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link to="/register">
                <Button size="lg" className="bg-[#0F52BA] hover:bg-[#0F52BA]/90 text-white px-8 py-6 text-lg w-full sm:w-auto">
                  Попробовать бесплатно
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-[#A6C5D7] text-[#000926] hover:bg-[#D6E6F3]/40">
                Смотреть демо
              </Button>
            </div>
          </motion.div>

          {/* Right Content - Video Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#0F52BA] to-[#0F52BA]/80 aspect-video">
              {!isVideoPlaying ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Preview thumbnail background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0F52BA] to-[#0036A3]">
                    {/* Mock document preview UI */}
                    <div className="absolute inset-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 flex flex-col p-4">
                      <div className="h-2 w-24 bg-white/40 rounded mb-2" />
                      <div className="h-1.5 w-40 bg-white/25 rounded mb-4" />
                      <div className="flex-1 space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-1.5 bg-white/20 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <div className="h-6 w-16 bg-white/30 rounded-full" />
                        <div className="h-6 w-20 bg-[#16a34a]/60 rounded-full" />
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsVideoPlaying(true)}
                    className="relative z-10 bg-white rounded-full p-6 shadow-xl"
                  >
                    <Play className="w-12 h-12 text-[#0F52BA] fill-[#0F52BA]" />
                  </motion.button>

                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <p className="text-white/70 text-sm">Демо: Подпись документа за 20 секунд</p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-[#000926] flex items-center justify-center">
                  <p className="text-white">Video Player Placeholder (15-20s demo)</p>
                </div>
              )}
            </div>

            {/* Floating stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-[#A6C5D7]/50"
            >
              <p className="text-3xl font-bold text-[#0F52BA]">2,500+</p>
              <p className="text-sm text-[#000926]/60">Компаний используют</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="absolute -top-6 -right-6 bg-white rounded-xl shadow-xl p-4 border border-[#A6C5D7]/50"
            >
              <p className="text-3xl font-bold text-[#16a34a]">99.9%</p>
              <p className="text-sm text-[#000926]/60">Uptime</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

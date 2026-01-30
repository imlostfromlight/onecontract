import { motion } from 'motion/react';
import { FileSignature, Play } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';

export function Hero() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  return (
    <section className="relative overflow-hidden bg-background pt-20 pb-24">
      <div className="absolute inset-0 bg-muted/20 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>

      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-full mb-6">
              <FileSignature className="w-4 h-4" />
              <span className="text-sm font-medium">Юридически действительные подписи</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Экономьте 50% времени на договоры
            </h1>

            <p className="text-xl text-foreground/70 mb-8">
              Подпись онлайн за 1 минуту. Никакой бумажной волокиты, только современные решения для вашего бизнеса.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
                Попробовать бесплатно
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-primary/20 text-foreground hover:bg-accent">
                Смотреть демо
              </Button>
            </div>

            <div className="flex items-center gap-8 text-sm text-foreground/70">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Бесплатный тариф</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Без кредитной карты</span>
              </div>
            </div>
          </motion.div>

          {/* Right Content - Video Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary to-primary/80 aspect-video">
              {!isVideoPlaying ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsVideoPlaying(true)}
                    className="relative z-10 bg-white rounded-full p-6 shadow-xl"
                  >
                    <Play className="w-12 h-12 text-primary fill-primary" />
                  </motion.button>

                  {/* Mock interface preview */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <div className="text-white text-center p-8">
                      <FileSignature className="w-24 h-24 mx-auto mb-4 opacity-50" />
                      <p className="text-sm opacity-75">Демо видео: Подпись документа за 20 секунд</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 bg-foreground flex items-center justify-center">
                  <p className="text-white">Video Player Placeholder (15-20s demo)</p>
                </div>
              )}
            </div>

            {/* Floating stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -bottom-6 -left-6 bg-card rounded-lg shadow-xl p-4 max-w-[200px]"
            >
              <p className="text-3xl font-bold text-primary">2,500+</p>
              <p className="text-sm text-foreground/70">Компаний используют</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="absolute -top-6 -right-6 bg-card rounded-lg shadow-xl p-4 max-w-[200px]"
            >
              <p className="text-3xl font-bold text-green-600">99.9%</p>
              <p className="text-sm text-foreground/70">Uptime</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

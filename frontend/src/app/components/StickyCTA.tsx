import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X } from 'lucide-react';
import { Button } from './ui/button';

export function StickyCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky CTA after scrolling 500px
      if (window.scrollY > 500 && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  if (isDismissed) return null;

  return (
    <>
      {/* Main Sticky CTA */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-4 md:left-1/2 md:-translate-x-1/2 z-40 w-[calc(100%-88px)] md:w-full md:max-w-3xl"
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-3 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-base md:text-xl mb-0.5 md:mb-1">
                    Готовы попробовать OneContract?
                  </h3>
                  <p className="text-blue-100 text-xs md:text-base">
                    Начните экономить время уже сегодня. Первые 14 дней бесплатно.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    className="bg-white hover:bg-gray-100 text-blue-600 font-semibold shadow-lg hidden md:flex"
                  >
                    Попробовать бесплатно
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>

                  <Button
                    size="sm"
                    className="bg-white hover:bg-gray-100 text-blue-600 font-semibold shadow-lg md:hidden px-4 py-2 text-xs"
                  >
                    Начать
                  </Button>

                  <button
                    onClick={() => setIsDismissed(true)}
                    className="p-1.5 md:p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                    aria-label="Закрыть"
                  >
                    <X className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
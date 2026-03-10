import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send } from 'lucide-react';

export function Whatsapp() {
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

    return (
        <>
            {/* Telegram Fixed Button */}
            <AnimatePresence>
                {isVisible && (
                    <motion.a
                        href="https://t.me/"
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed right-4 bottom-6 z-[60] bg-[#2AABEE] hover:bg-[#229ED9] text-white w-14 h-14 md:w-auto md:h-auto md:px-5 md:py-3 rounded-full shadow-2xl transition-all hover:scale-105 flex items-center justify-center md:gap-2"
                        aria-label="Связаться в Telegram"
                    >
                        <Send className="w-6 h-6 md:w-5 md:h-5 md:-ml-1 md:pr-0.5 relative left-[1px] md:left-0" />
                        <span className="hidden md:inline font-semibold text-sm whitespace-nowrap">
                            Свяжитесь с нами
                        </span>
                    </motion.a>
                )}
            </AnimatePresence>
        </>
    );
};

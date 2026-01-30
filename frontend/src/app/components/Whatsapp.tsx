import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle } from 'lucide-react';

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
            {/* WhatsApp Fixed Button */}
            <AnimatePresence>
                {isVisible && (
                    <motion.a
                        href="https://wa.me/"
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ x: 120, opacity: 0 }}
                        animate={{ x: 100, opacity: 1 }}
                        exit={{ x: 120, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed right-6 bottom-6 z-50 bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-2xl transition-colors group flex items-center justify-center"
                        aria-label="Связаться в WhatsApp"
                    >
                        <MessageCircle className="w-8 h-8" />
                        <span className="absolute right-full mr-4 bg-white text-gray-800 px-4 py-2 rounded-xl text-sm font-medium shadow-lg whitespace-nowrap opacity-100 transition-opacity">
                            Свяжитесь с нами
                        </span>
                    </motion.a>
                )}
            </AnimatePresence>
        </>
    );
};

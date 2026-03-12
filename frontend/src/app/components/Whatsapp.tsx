import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Instagram } from 'lucide-react';

interface ContactOption {
  id: string;
  label: string;
  color: string;
  hoverColor: string;
  href: string;
  icon: React.ReactNode;
}

const contactOptions: ContactOption[] = [
  {
    id: 'chat',
    label: 'Онлайн-чат',
    color: 'bg-[#0F52BA]',
    hoverColor: 'hover:bg-[#0036A3]',
    href: '#contact',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
        <path d="M8 10h8v2H8zm0 4h5v2H8z" />
        <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9zm-1 13H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    ),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: 'bg-[#25D366]',
    hoverColor: 'hover:bg-[#20bd5a]',
    href: 'https://wa.me/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    color: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    hoverColor: 'hover:opacity-90',
    href: 'https://instagram.com/',
    icon: <Instagram className="w-5 h-5" />,
  },
];

export function FloatingContact() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);

  return (
    <div className="fixed right-4 bottom-6 z-[60] flex flex-col items-end gap-3">
      {/* Speech bubble */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => setShowBubble(false)}
            className="relative bg-white rounded-[20px] shadow-2xl px-7 py-4 cursor-pointer select-none"
            style={{ borderBottomRightRadius: '4px' }}
          >
            {/* Triangle tail pointing down-right */}
            <div
              className="absolute -bottom-3 right-3"
              style={{
                width: 0,
                height: 0,
                borderLeft: '12px solid transparent',
                borderTop: '14px solid white',
                borderRight: '0px solid transparent',
                filter: 'drop-shadow(1px 2px 1px rgba(0,0,0,0.08))',
              }}
            />
            <p className="text-lg font-semibold text-[#1a1a1a] whitespace-nowrap">Мы онлайн!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact options */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#A6C5D7]/30 min-w-[200px]"
          >
            {contactOptions.map((opt, i) => (
              <motion.a
                key={opt.id}
                href={opt.href}
                target={opt.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 px-5 py-4 hover:bg-[#D6E6F3]/30 transition-colors border-b last:border-b-0 border-[#A6C5D7]/20"
                onClick={() => { if (opt.id === 'chat') setIsOpen(false); }}
              >
                <div className={`${opt.color} ${opt.hoverColor} w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                  {opt.icon}
                </div>
                <span className="font-semibold text-[#000926] text-sm">{opt.label}</span>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => { setIsOpen(!isOpen); setShowBubble(false); }}
        className="w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full shadow-2xl flex items-center justify-center transition-colors relative"
        aria-label="Связаться с нами"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Notification dot */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#0F52BA] rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
            1
          </span>
        )}
      </motion.button>
    </div>
  );
}

/** @deprecated use FloatingContact */
export function Whatsapp() {
  return <FloatingContact />;
}

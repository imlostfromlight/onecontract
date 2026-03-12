import { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Building, Send, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', phone: '', company: '' });
    }, 3000);
  };

  const inputClass = "w-full h-12 px-4 rounded-xl border-2 border-[#A6C5D7] bg-white text-[#000926] placeholder-[#000926]/35 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/20 transition-all text-base";

  return (
    <section id="contact" className="py-20 bg-[#A6C5D7]/15">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[#000926] mb-4">
            Остались вопросы?
          </h2>
          <p className="text-xl text-[#000926]/60">
            Оставьте свои контакты, и мы свяжемся с вами в ближайшее время
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-[#A6C5D7]/40 p-8 md:p-12">
            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#16a34a]/10 rounded-full mb-6">
                  <CheckCircle className="w-8 h-8 text-[#16a34a]" />
                </div>
                <h3 className="text-2xl font-bold text-[#000926] mb-2">
                  Спасибо за обращение!
                </h3>
                <p className="text-[#000926]/60">
                  Мы свяжемся с вами в ближайшее время
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold text-[#000926] mb-2">
                    <User className="w-4 h-4 text-[#0F52BA]" />
                    Имя *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Введите ваше имя"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-[#000926] mb-2">
                    <Mail className="w-4 h-4 text-[#0F52BA]" />
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@company.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="flex items-center gap-2 text-sm font-semibold text-[#000926] mb-2">
                    <Phone className="w-4 h-4 text-[#0F52BA]" />
                    Телефон *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+7 (999) 123-45-67"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="company" className="flex items-center gap-2 text-sm font-semibold text-[#000926] mb-2">
                    <Building className="w-4 h-4 text-[#0F52BA]" />
                    Компания
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Название компании (необязательно)"
                    className={inputClass}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[#0F52BA] hover:bg-[#0036A3] text-white text-lg py-6 rounded-xl mt-2"
                >
                  Отправить заявку
                  <Send className="w-5 h-5 ml-2" />
                </Button>

                <p className="text-sm text-[#000926]/40 text-center">
                  Нажимая кнопку, вы соглашаетесь с{' '}
                  <a href="#" className="text-[#0F52BA] hover:underline">
                    политикой конфиденциальности
                  </a>
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

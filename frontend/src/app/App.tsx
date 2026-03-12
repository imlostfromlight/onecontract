import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { SocialStats } from './components/SocialProof';
import { DocumentPreview } from './components/DocumentPreview';
import { HowItWorks } from './components/HowItWorks';
import { Calculator } from './components/Calculator';
import { Quiz } from './components/Quiz';
import { ContactForm } from './components/ContactForm';
import { Pricing } from './components/Pricing';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { StickyCTA } from './components/StickyCTA';
import { ExitIntentPopup } from './components/ExitIntentPopup';
import { FloatingContact } from './components/Whatsapp';
import { Testimonials } from './components/SocialProof';

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        {/* 1. Hero */}
        <Hero />
        {/* 2. Как это работает */}
        <HowItWorks />
        {/* 3. Лидеры рынка + Stats */}
        <SocialStats />
        {/* 4. Предпросмотр в реальном времени */}
        <DocumentPreview />
        {/* 5. Рассчитайте вашу экономию */}
        <Calculator />
        {/* 6. Прозрачные тарифы */}
        <Pricing />
        {/* 7. Подберите идеальный тариф */}
        <Quiz />
        {/* 8. Отзывы клиентов */}
        <Testimonials />
        {/* 9. FAQ + Связь */}
        <FAQ />
        <ContactForm />
      </main>
      <Footer />

      {/* Interactive Elements */}
      <StickyCTA />
      <FloatingContact />
      <ExitIntentPopup />
    </div>
  );
}
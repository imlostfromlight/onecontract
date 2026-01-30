import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { SocialProof } from './components/SocialProof';
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
import { Whatsapp } from './components/Whatsapp';

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <SocialProof />
        <DocumentPreview />
        <HowItWorks />
        <Calculator />
        <Quiz />
        <ContactForm />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
      
      {/* Interactive Elements */}
      <StickyCTA />
      <Whatsapp /> 
      <ExitIntentPopup />
    </div>
  );
}
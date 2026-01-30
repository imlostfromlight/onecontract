import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ArrowRight, ArrowLeft, Check, User, Mail, Phone, Building } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

const questions = [
  {
    id: 1,
    question: 'Сколько договоров вы подписываете в месяц?',
    options: [
      { label: 'Менее 10', value: 'small', plan: 'free' },
      { label: '10-50', value: 'medium', plan: 'starter' },
      { label: '50-200', value: 'large', plan: 'business' },
      { label: 'Более 200', value: 'enterprise', plan: 'enterprise' },
    ],
  },
  {
    id: 2,
    question: 'Какой тип документов вы чаще всего используете?',
    options: [
      { label: 'Договоры с клиентами', value: 'clients' },
      { label: 'HR документы (трудовые договоры)', value: 'hr' },
      { label: 'Договоры с поставщиками', value: 'suppliers' },
      { label: 'Все типы', value: 'all' },
    ],
  },
  {
    id: 3,
    question: 'Сколько человек будут работать с системой?',
    options: [
      { label: 'Только я', value: '1', plan: 'free' },
      { label: '2-5 человек', value: '2-5', plan: 'starter' },
      { label: '6-20 человек', value: '6-20', plan: 'business' },
      { label: 'Более 20', value: '20+', plan: 'enterprise' },
    ],
  },
  {
    id: 4,
    question: 'Какие функции для вас наиболее важны?',
    options: [
      { label: 'Простота и скорость', value: 'simple' },
      { label: 'Интеграция с CRM/ERP', value: 'integration' },
      { label: 'Шаблоны и автоматизация', value: 'templates' },
      { label: 'Все вместе', value: 'all' },
    ],
  },
];

const plans = {
  free: {
    name: 'Бесплатный',
    price: '0₽',
    description: 'Идеально для начала работы',
    features: ['До 5 документов/месяц', 'Базовая электронная подпись', '1 пользователь', 'Email поддержка'],
  },
  starter: {
    name: 'Стартовый',
    price: '1,990₽',
    description: 'Для малого бизнеса и стартапов',
    features: ['До 50 документов/месяц', 'Усиленная электронная подпись', 'До 5 пользователей', 'Шаблоны документов', 'Приоритетная поддержка'],
  },
  business: {
    name: 'Бизнес',
    price: '4,990₽',
    description: 'Для растущих компаний',
    features: ['До 200 документов/месяц', 'Все типы подписей', 'До 20 пользователей', 'API интеграция', 'Персональный менеджер', 'Аналитика и отчеты'],
  },
  enterprise: {
    name: 'Корпоративный',
    price: 'По запросу',
    description: 'Для крупных организаций',
    features: ['Безлимитные документы', 'Все возможности системы', 'Неограниченно пользователей', 'Dedicated сервер', 'SLA 99.9%', 'Кастомные интеграции'],
  },
};

export function Quiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [currentQuestion]: value });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResult(false);
  };

  // Determine recommended plan based on answers
  const getRecommendedPlan = () => {
    const planScores: Record<string, number> = { free: 0, starter: 0, business: 0, enterprise: 0 };
    
    Object.values(answers).forEach((answer) => {
      const option = questions
        .flatMap(q => q.options)
        .find(opt => opt.value === answer);
      
      if (option && 'plan' in option) {
        planScores[option.plan as string]++;
      }
    });

    const recommendedPlanKey = Object.keys(planScores).reduce((a, b) => 
      planScores[a] > planScores[b] ? a : b
    ) as keyof typeof plans;

    return plans[recommendedPlanKey];
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (showResult) {
    const recommendedPlan = getRecommendedPlan();
    
    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ваш идеальный тариф найден!
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              На основе ваших ответов мы рекомендуем
            </p>

            <Card className="p-8 md:p-12 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{recommendedPlan.name}</h3>
                <p className="text-5xl font-bold text-blue-600 mb-3">{recommendedPlan.price}</p>
                <p className="text-gray-600">{recommendedPlan.description}</p>
              </div>

              <div className="bg-white rounded-xl p-6 mb-8">
                <h4 className="font-semibold text-gray-900 mb-4">Что включено:</h4>
                <ul className="space-y-3">
                  {recommendedPlan.features.map((feature, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                  Начать бесплатный период
                </Button>
                <Button size="lg" variant="outline" onClick={handleRestart}>
                  Пройти заново
                </Button>
              </div>
            </Card>

            <p className="text-sm text-gray-500 mt-6">
              Первые 14 дней бесплатно, кредитная карта не требуется
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  const question = questions[currentQuestion];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-full mb-6"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Интерактивный квиз</span>
          </motion.div>

          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Подберите идеальный тариф
          </h2>
          <p className="text-xl text-gray-600">
            Ответьте на 4 вопроса и получите персональную рекомендацию
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Вопрос {currentQuestion + 1} из {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 md:p-12 bg-gradient-to-br from-gray-50 to-white">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">
                {question.question}
              </h3>

              <div className="grid gap-4 mb-8">
                {question.options.map((option) => (
                  <motion.button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      answers[currentQuestion] === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium text-gray-900">{option.label}</span>
                      {answers[currentQuestion] === option.value && (
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentQuestion === 0}
                  className="px-6"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Назад
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={!answers[currentQuestion]}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                  {currentQuestion === questions.length - 1 ? 'Показать результат' : 'Далее'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
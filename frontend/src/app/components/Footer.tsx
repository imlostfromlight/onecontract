import { FileSignature, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-foreground text-zinc-300">
      <div className="container mx-auto px-4 max-w-7xl py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileSignature className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold text-white">OneContract</span>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Современное решение для подписания договоров онлайн. Экономьте время и деньги.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors text-white">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors text-white">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors text-white">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors text-white">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">Продукт</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Возможности</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Тарифы</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Интеграции</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Безопасность</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Обновления</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Компания</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">О нас</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Блог</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Карьера</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Партнёры</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Пресс-кит</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Контакты</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Контакты</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-1 flex-shrink-0" />
                <a href="mailto:info@onecontract.ru" className="hover:text-white transition-colors">
                  info@onecontract.ru
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-1 flex-shrink-0" />
                <a href="tel:+78001234567" className="hover:text-white transition-colors">
                  8 800 123 45 67
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>
                  г. Москва, ул. Тверская, д. 1<br />
                  БЦ "Центральный", офис 501
                </span>
              </li>
            </ul>

            {/* Newsletter */}
            <div className="mt-6">
              <h5 className="text-white font-semibold mb-2 text-sm">Подписка на новости</h5>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Ваш email"
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm focus:outline-none focus:border-primary text-white placeholder:text-zinc-500"
                />
                <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors">
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-zinc-500">
              © 2026 OneContract. Все права защищены.
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Политика конфиденциальности</a>
              <a href="#" className="hover:text-white transition-colors">Условия использования</a>
              <a href="#" className="hover:text-white transition-colors">Публичная оферта</a>
              <a href="#" className="hover:text-white transition-colors">Правовая информация</a>
            </div>
          </div>

          <div className="mt-6 text-xs text-zinc-600 text-center md:text-left">
            <p className="mb-2">
              ООО "ВанКонтракт" | ИНН 7700123456 | ОГРН 1234567890123
            </p>
            <p>
              Аккредитованный удостоверяющий центр. Лицензия ФСБ России №123456 от 01.01.2020.
              Услуги соответствуют 63-ФЗ "Об электронной подписи" и 152-ФЗ "О персональных данных".
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

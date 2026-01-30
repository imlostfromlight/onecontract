import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { FileSignature, Menu, X, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../hooks/useAuth';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Возможности', href: '#features' },
    { label: 'Тарифы', href: '#pricing' },
    { label: 'О нас', href: '#about' },
    { label: 'Контакты', href: '#contact' },
  ];

  // Helper to format name correctly (handling swapped First/Last name issues)
  const formatUserName = (user: any) => {
    if (!user) return '';
    if (!user.first_name) return user.email;
    if (!user.last_name) return user.first_name;

    // Check if "first_name" is actually a patronymic (ends with ULY/KYZY etc)
    // If so, swap them to show "RealName Patronymic"
    const patronymicSuffixes = ['ULY', 'KYZY', 'VICH', 'VNA', 'OGLY', 'УЛЫ', 'КЫЗЫ', 'ВИЧ', 'ВНА', 'ОГЛЫ', 'ҰЛЫ', 'ҚЫЗЫ'];
    const firstUpper = user.first_name.trim().toUpperCase();
    const isFirstPatronymic = patronymicSuffixes.some(s => firstUpper.endsWith(s));

    if (isFirstPatronymic) {
      return `${user.last_name} ${user.first_name}`;
    }

    return `${user.first_name} ${user.last_name}`;
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? 'bg-background/95 backdrop-blur-md shadow-md border-b border-border'
        : 'bg-transparent'
        }`}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <FileSignature className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold text-foreground">OneContract</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-foreground/80 hover:text-primary font-medium transition-colors relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link to="/documents">
                  <Button variant="ghost" className="text-foreground/80 hover:text-primary">
                    Документы
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="ghost" className="text-foreground/80 hover:text-primary">
                    Dashboard
                  </Button>
                </Link>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/20 border border-secondary/50">
                  <span className="text-sm font-medium text-foreground">
                    {formatUserName(user)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-foreground/80 hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-foreground/80 hover:text-primary">
                    Войти
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Попробовать бесплатно
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-foreground/80 hover:bg-muted rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-t border-border"
          >
            <nav className="container mx-auto px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block py-2 text-foreground/80 hover:text-primary font-medium transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 space-y-3 border-t border-border">
                {user ? (
                  <>
                    <div className="px-3 py-2 rounded-lg bg-secondary/20">
                      <p className="text-sm font-medium text-foreground">
                        {formatUserName(user)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleLogout}
                      className="w-full text-destructive hover:text-destructive/90 border-destructive/20"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block">
                      <Button variant="outline" className="w-full border-border">
                        Войти
                      </Button>
                    </Link>
                    <Link to="/register" className="block">
                      <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                        Попробовать бесплатно
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
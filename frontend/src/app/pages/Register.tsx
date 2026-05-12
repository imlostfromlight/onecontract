import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    try {
      await register({ email, password, password2, first_name: firstName, role: 'CLIENT' });
      setRegistered(true);
    } catch (err: any) {
      setError(err?.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-white border border-[#A6C5D7] px-4 py-3 rounded-xl text-sm text-[#0D1B2A] placeholder-[#A6C5D7] focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/30 focus:border-[#0F52BA] transition-colors';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-[#D6E6F3] shadow-sm p-8">
            {registered ? (
              <div className="text-center">
                <div className="w-14 h-14 bg-[#D6E6F3] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✉️</span>
                </div>
                <h2 className="text-xl font-bold text-[#000926] mb-2">Проверьте почту</h2>
                <p className="text-sm text-[#6B7E92] mb-2">Аккаунт создан! Мы отправили письмо на</p>
                <p className="text-sm font-semibold text-[#000926] mb-6">{email}</p>
                <p className="text-xs text-[#6B7E92] mb-6">Подтвердите email по ссылке в письме, чтобы активировать аккаунт.</p>
                <button onClick={() => navigate('/dashboard')} className="bg-[#0F52BA] hover:bg-[#0a3d8f] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
                  Перейти в дашборд
                </button>
              </div>
            ) : (
            <>
            <h2 className="text-2xl font-bold text-[#000926] mb-1 tracking-tight">Создать аккаунт</h2>
            <p className="text-sm text-[#6B7E92] mb-8">Зарегистрируйтесь чтобы начать</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Имя</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={inputClass}
                  type="text"
                  placeholder="Иван"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Email</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  type="email"
                  required
                  placeholder="вы@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Пароль</label>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass}
                  type="password"
                  required
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Повторите пароль</label>
                <input
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  className={inputClass}
                  type="password"
                  required
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                {loading ? 'Создание...' : 'Создать аккаунт'}
              </button>
            </form>

            <p className="text-center text-sm text-[#6B7E92] mt-6">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-[#0F52BA] hover:underline font-semibold">
                Войдите
              </Link>
            </p>
            </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginUser } from '../lib/auth';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Mail } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

export default function Login() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      if (data.user?.role === 'CLIENT') {
        setError('Клиенты не могут входить. Используйте одноразовую ссылку для подписания.');
        return;
      }
      setAuth({ token: data.token, user: data.user });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Ошибка входа');
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
            <h2 className="text-2xl font-bold text-[#000926] mb-1 tracking-tight">Вход в аккаунт</h2>
            <p className="text-sm text-[#6B7E92] mb-8">Войдите чтобы продолжить работу</p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-[#6B7E92] hover:text-[#0F52BA] transition-colors">
                  Забыли пароль?
                </Link>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>

            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#D6E6F3]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-[#6B7E92]">или войдите через</span>
              </div>
            </div>

            <button
              onClick={() => window.location.href = `${API_BASE}/api/auth/google/`}
              className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#A6C5D7] rounded-xl hover:bg-[#D6E6F3] transition-colors text-sm font-medium text-[#0D1B2A]"
            >
              <Mail className="w-4 h-4 text-[#0F52BA]" />
              Войти через Google
            </button>

            <p className="text-center text-sm text-[#6B7E92] mt-6">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-[#0F52BA] hover:underline font-semibold">
                Зарегистрируйтесь
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

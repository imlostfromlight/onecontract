import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { EGovQRLogin } from './EGovQRLogin';
import { Mail, QrCode } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

export default function Login() {
  const { login, setAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'default' | 'qr'>('default');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleQRSuccess = (data: { token: string; user: any }) => {
    setAuth(data);
    navigate('/dashboard');
  };

  const inputClass =
    'w-full bg-white border border-[#A6C5D7] px-4 py-3 rounded-xl text-sm text-[#0D1B2A] placeholder-[#A6C5D7] focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/30 focus:border-[#0F52BA] transition-colors';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          {loginMode === 'default' ? (
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

              <div className="mt-6">
                <button
                  onClick={() => setLoginMode('qr')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-[#0F7B55] rounded-xl hover:bg-green-50 transition-colors text-[#0F7B55] font-medium text-sm"
                >
                  <QrCode className="w-4 h-4" />
                  eGov QR
                </button>
              </div>

              <p className="text-center text-sm text-[#6B7E92] mt-6">
                Нет аккаунта?{' '}
                <Link to="/register" className="text-[#0F52BA] hover:underline font-semibold">
                  Зарегистрируйтесь
                </Link>
              </p>

              {/* Quick test login */}
              <div className="mt-6 pt-6 border-t border-dashed border-[#D6E6F3]">
                <p className="text-[10px] font-semibold text-[#A6C5D7] uppercase tracking-widest mb-3 text-center">Быстрый вход для теста</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Организация', role: 'ORGANIZATION', color: 'text-[#0F52BA] border-[#A6C5D7] hover:bg-[#D6E6F3]' },
                    { label: 'Админ', role: 'ADMIN', color: 'text-purple-600 border-purple-200 hover:bg-purple-50' },
                    { label: 'Клиент', role: 'CLIENT', color: 'text-[#0F7B55] border-[#A6C5D7] hover:bg-green-50' },
                  ].map(({ label, role, color }) => (
                    <button
                      key={role}
                      type="button"
                      className={`text-xs py-1.5 px-2 border rounded-lg font-medium transition-colors ${color}`}
                      onClick={async () => {
                        setError(null);
                        setLoading(true);
                        try {
                          const r = await fetch(`${API_BASE}/api/auth/fast-login/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ role }),
                          });
                          const data = await r.json();
                          if (!r.ok) throw new Error(data.detail || 'Ошибка');
                          setAuth({ token: data.token, user: data.user });
                          navigate('/dashboard');
                        } catch (err: any) {
                          setError(err?.message || 'Ошибка входа');
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#D6E6F3] shadow-sm p-8">
              <button
                onClick={() => setLoginMode('default')}
                className="flex items-center gap-1 text-sm text-[#0F52BA] hover:underline mb-6 font-medium"
              >
                ← Назад
              </button>
              <h2 className="text-2xl font-bold text-[#000926] mb-1 tracking-tight">Вход через eGov QR</h2>
              <p className="text-sm text-[#6B7E92] mb-8">Сканируйте QR код через приложение eGov Mobile</p>
              <EGovQRLogin onSuccess={handleQRSuccess} onCancel={() => setLoginMode('default')} />
              <p className="text-center text-sm text-[#6B7E92] mt-6">
                Нет аккаунта?{' '}
                <Link to="/register" className="text-[#0F52BA] hover:underline font-semibold">Зарегистрируйтесь</Link>
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

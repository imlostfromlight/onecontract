import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== password2) { setError('Пароли не совпадают'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/password-reset-confirm/${token}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-white border border-[#A6C5D7] px-4 py-3 rounded-xl text-sm text-[#0D1B2A] placeholder-[#A6C5D7] focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/30 focus:border-[#0F52BA] transition-colors';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-[#D6E6F3] shadow-sm p-8">
            {done ? (
              <div className="text-center">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <h2 className="text-xl font-bold text-[#000926] mb-2">Пароль изменён</h2>
                <p className="text-sm text-[#6B7E92] mb-6">Теперь вы можете войти с новым паролем.</p>
                <button
                  onClick={() => navigate('/login')}
                  className="bg-[#0F52BA] hover:bg-[#0a3d8f] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Войти
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-[#000926] mb-1 tracking-tight">Новый пароль</h2>
                <p className="text-sm text-[#6B7E92] mb-8">Введите новый пароль для вашего аккаунта</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Новый пароль</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Повторите пароль</label>
                    <input
                      type="password"
                      required
                      value={password2}
                      onChange={e => setPassword2(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                  >
                    {loading ? 'Сохранение...' : 'Сохранить пароль'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

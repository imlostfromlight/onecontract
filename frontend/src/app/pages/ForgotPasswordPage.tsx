import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch(`${API_BASE}/api/auth/password-reset/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setLoading(false);
  };

  const inputClass = 'w-full bg-white border border-[#A6C5D7] px-4 py-3 rounded-xl text-sm text-[#0D1B2A] placeholder-[#A6C5D7] focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/30 focus:border-[#0F52BA] transition-colors';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-[#D6E6F3] shadow-sm p-8">
            {sent ? (
              <div className="text-center">
                <div className="w-14 h-14 bg-[#D6E6F3] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✉️</span>
                </div>
                <h2 className="text-xl font-bold text-[#000926] mb-2">Проверьте почту</h2>
                <p className="text-sm text-[#6B7E92] mb-6">
                  Если аккаунт с таким email существует, мы отправили письмо со ссылкой для сброса пароля.
                </p>
                <Link to="/login" className="text-[#0F52BA] font-semibold text-sm hover:underline">
                  ← Вернуться к входу
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-[#000926] mb-1 tracking-tight">Забыли пароль?</h2>
                <p className="text-sm text-[#6B7E92] mb-8">Введите email — мы отправим ссылку для сброса</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="вы@example.com"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                  >
                    {loading ? 'Отправка...' : 'Отправить ссылку'}
                  </button>
                </form>
                <p className="text-center text-sm text-[#6B7E92] mt-6">
                  <Link to="/login" className="text-[#0F52BA] font-semibold hover:underline">← Вернуться к входу</Link>
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

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

export default function EmailVerifyPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    fetch(`${API_BASE}/api/auth/verify-email/${token}/`, { method: 'POST' })
      .then(res => setStatus(res.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-[#D6E6F3] shadow-sm p-8 text-center">
            {status === 'loading' && (
              <>
                <div className="w-10 h-10 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-[#6B7E92]">Подтверждение email...</p>
              </>
            )}
            {status === 'success' && (
              <>
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <h2 className="text-xl font-bold text-[#000926] mb-2">Email подтверждён!</h2>
                <p className="text-sm text-[#6B7E92] mb-6">Ваш аккаунт успешно активирован.</p>
                <Link to="/dashboard" className="bg-[#0F52BA] hover:bg-[#0a3d8f] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
                  Перейти в дашборд
                </Link>
              </>
            )}
            {status === 'error' && (
              <>
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h2 className="text-xl font-bold text-[#000926] mb-2">Ссылка недействительна</h2>
                <p className="text-sm text-[#6B7E92] mb-6">Ссылка устарела или уже использована.</p>
                <Link to="/login" className="text-[#0F52BA] font-semibold text-sm hover:underline">
                  Вернуться к входу
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

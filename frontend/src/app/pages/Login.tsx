import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';
import { ECPLogin } from './ECPLogin';
import { EGovQRLogin } from './EGovQRLogin';
import { Mail, MessageCircle, Lock, QrCode } from 'lucide-react';

import NCALayerService from '../lib/ncalayer';

export default function Login() {
  const { login, setAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'default' | 'ecp' | 'qr'>('default');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.body?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQRSuccess = (data: { token: string; user: any }) => {
    setAuth(data);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
            {loginMode === 'default' ? (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Вход</h2>
                <p className="text-gray-600 mb-8">Войдите в свой аккаунт</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      type="email"
                      required
                      placeholder="вы@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
                    <input
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      type="password"
                      required
                      placeholder="••••••••"
                    />
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2" disabled={loading}>
                    {loading ? 'Вход...' : 'Войти'}
                  </Button>
                </form>

                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">или войдите через</span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => window.location.href = 'https://onecontract.onrender.com/api/auth/google/'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      <span className="text-sm font-medium">Google</span>
                    </button>
                    <button
                      onClick={() => window.location.href = 'https://onecontract.onrender.com/api/auth/facebook/'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-medium">Facebook</span>
                    </button>
                    <button
                      onClick={() => window.location.href = 'https://onecontract.onrender.com/api/auth/telegram/'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Telegram</span>
                    </button>
                    <button
                      onClick={() => window.location.href = 'https://onecontract.onrender.com/api/auth/whatsapp/'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">WhatsApp</span>
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setLoginMode('ecp')}
                    className="w-full flex items-center justify-center gap-2 px-2 py-2 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-blue-600 font-medium text-sm"
                  >
                    <Lock className="w-4 h-4" />
                    <span>ЕЦП</span>
                  </button>
                  <button
                    onClick={() => setLoginMode('qr')}
                    className="w-full flex items-center justify-center gap-2 px-2 py-2 border border-green-600 rounded-lg hover:bg-green-50 transition-colors text-green-600 font-medium text-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>eGov QR</span>
                  </button>
                </div>

                <p className="text-center text-gray-600 mt-6">
                  Нет аккаунта?{' '}
                  <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                    Зарегистрируйтесь
                  </Link>
                </p>

                {/* Dev Tools: Quick Login */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-8 pt-6 border-t border-dashed border-gray-300">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3 text-center">Dev Tools: Quick Login</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => {
                          setEmail('org@example.com');
                          setPassword('password123');
                          // We can also auto-submit if we want, but filling is safer
                        }}
                      >
                        Fill Org
                      </Button>
                      <Button
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => {
                          setEmail('client@example.com');
                          setPassword('password123');
                        }}
                      >
                        Fill Client
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : loginMode === 'ecp' ? (
              <>
                <div className="flex items-center gap-2 mb-8">
                  <button
                    onClick={() => setLoginMode('default')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Назад
                  </button>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Вход через ЕЦП</h2>
                <p className="text-gray-600 mb-8">Аутентификация с помощью электронной цифровой подписи</p>

                <ECPLogin onSuccess={() => navigate('/dashboard')} />

                <p className="text-center text-gray-600 mt-6">
                  Нет аккаунта?{' '}
                  <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                    Зарегистрируйтесь
                  </Link>
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-8">
                  <button
                    onClick={() => setLoginMode('default')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Назад
                  </button>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Вход через eGov QR</h2>
                <p className="text-gray-600 mb-8">Сканируйте QR код через приложение eGov Mobile</p>

                <EGovQRLogin onSuccess={handleQRSuccess} onCancel={() => setLoginMode('default')} />

                <p className="text-center text-gray-600 mt-6">
                  Нет аккаунта?{' '}
                  <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                    Зарегистрируйтесь
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

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/button';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [firstName, setFirstName] = useState('');
  const [role, setRole] = useState<'ORGANIZATION' | 'CLIENT'>('CLIENT');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== password2) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({ email, password, password2, first_name: firstName, role });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.body?.detail || err?.body?.password?.[0] || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Регистрация</h2>
            <p className="text-gray-600 mb-8">Создайте новый аккаунт</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  type="text"
                  placeholder="Иван"
                />
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Роль</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('ORGANIZATION')}
                    className={`p-3 border rounded-lg text-sm font-medium transition-colors ${role === 'ORGANIZATION'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-200 text-gray-600'
                      }`}
                  >
                    🏢 Организация
                    <span className="block text-xs font-normal mt-1 text-gray-500">Для бизнеса</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('CLIENT')}
                    className={`p-3 border rounded-lg text-sm font-medium transition-colors ${role === 'CLIENT'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-200 text-gray-600'
                      }`}
                  >
                    👤 Клиент
                    <span className="block text-xs font-normal mt-1 text-gray-500">Подписание</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Повторите пароль</label>
                <input
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  type="password"
                  required
                  placeholder="••••••••"
                />
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2" disabled={loading}>
                {loading ? 'Создание...' : 'Создать аккаунт'}
              </Button>
            </form>

            <p className="text-center text-gray-600 mt-6">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Войдите
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

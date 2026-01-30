// src/app/components/ECPLogin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NCALayerService from '@/lib/ncalayer';
import { saveAuth } from '@/lib/auth';

export function ECPLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await NCALayerService.authenticateWithKeyFile();
      if (result && result.token) {
        saveAuth(result.token, result.user);
        navigate('/');
      } else {
        setError('Не удалось получить токен');
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка аутентификации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Вход через ЕЦП</h2>

      <form onSubmit={handleLogin} className="space-y-4">
        <p className="text-sm text-gray-600">
          Для входа выберите файл ключа и введите пароль в окне NCALayer.
        </p>

        {error && <div className="text-red-600">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Ожидание NCALayer...' : 'Войти через ЕЦП'}
        </button>
      </form>
    </div>
  );
}

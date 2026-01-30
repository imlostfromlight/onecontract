import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NCALayerService from '../lib/ncalayer';
import { loginWithECP, saveAuth } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';

interface ECPLoginProps {
  onSuccess?: () => void;
}

export function ECPLogin({ onSuccess }: ECPLoginProps) {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<string>('idle');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('\n=== ECP Login Flow Started ===\n');
      
      // Шаг 1: Проверка доступности (встроена в сервис, но можно оставить для логов)
      setStep('checking');
      const available = await NCALayerService.isAvailable();
      if (!available) {
        throw new Error('NCALayer не запущен.');
      }

      // Шаг 2 и 3: Единый процесс подписи и авторизации
      setStep('authenticating');
      console.log('Step 2 & 3: Starting integrated Auth flow...');
      
      // В authResult придет { token: "...", user: {...} }
      const authResult = await NCALayerService.authenticateWithKeyFile();
      
      console.log('✅ Auth successful. Result:', authResult);

      // Шаг 4: Обновление состояния приложения
      if (authResult.token) {
        setAuth({ token: authResult.token, user: authResult.user });
        
        console.log('\n=== ECP Login Successful ===\n');

        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/');
        }
      } else {
        throw new Error('Не получен токен от сервера');
      }
    } catch (err: any) {
      console.error('\n❌ ECP Login Error:', err);
      setError(err.message || 'Ошибка аутентификации');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const getStepMessage = (): string => {
    switch (step) {
      case 'checking':
        return 'Проверка NCALayer...';
      case 'authenticating':
        return 'Ожидание NCALayer, выберите сертификат и введите пароль...';
      case 'sending':
        return 'Отправка данных на сервер...';
      case 'error':
        return 'Ошибка при входе';
      default:
        return 'Войти через ЕЦП';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Вход через ЕЦП</h2>

      <form onSubmit={handleLogin} className="space-y-4">
        <p className="text-sm text-gray-600">
          Для входа выберите файл ключа и введите пароль в окне NCALayer.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <div className="font-medium mb-2">Ошибка: {getStepMessage()}</div>
            <div className="whitespace-pre-wrap text-xs">{error}</div>
          </div>
        )}

        {loading && step === 'authenticating' && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Ожидание ответа от NCALayer...</span>
            </div>
            <p className="text-xs mt-2">
              Проверьте окно NCALayer на рабочем столе. Может потребоваться выбрать сертификат и ввести пароль.
            </p>
          </div>
        )}

        {loading && step !== 'authenticating' && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>{getStepMessage()}</span>
            </div>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition-colors"
        >
          {loading ? getStepMessage() : 'Войти через ЕЦП'}
        </button>
      </form>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-gray-100 rounded text-xs text-gray-700">
          <p className="font-mono">Current step: <strong>{step}</strong></p>
          <p className="font-mono mt-1">Loading: <strong>{loading ? 'true' : 'false'}</strong></p>
          <p className="mt-2 text-gray-600">
            Откройте DevTools (F12) → Console для детального логирования процесса аутентификации
          </p>
        </div>
      )}
    </div>
  );
}

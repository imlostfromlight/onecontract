import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NCALayerService from '../lib/ncalayer';
import { loginWithECP, saveAuth } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

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
      setStep('checking');
      const available = await NCALayerService.isAvailable();
      if (!available) throw new Error('NCALayer не запущен. Запустите приложение NCALayer и повторите попытку.');

      setStep('authenticating');
      const authResult = await NCALayerService.authenticateWithKeyFile();

      if (authResult.token) {
        setAuth({ token: authResult.token, user: authResult.user });
        if (onSuccess) onSuccess();
        else navigate('/');
      } else {
        throw new Error('Не получен токен от сервера');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка аутентификации');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">

      {/* Icon + description */}
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-blue-600" />
        </div>
        <p className="text-base text-gray-600 max-w-xs">
          Нажмите кнопку ниже, выберите файл ключа <strong>(.p12)</strong> и введите пароль в окне NCALayer.
        </p>
      </div>

      {/* Waiting state */}
      {loading && step === 'authenticating' && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-blue-800 font-semibold text-base">Ожидание ответа от NCALayer...</p>
          <p className="text-blue-600 text-sm">
            Проверьте окно NCALayer на рабочем столе. Выберите сертификат и введите пароль.
          </p>
        </div>
      )}

      {loading && step === 'checking' && (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-blue-800 font-semibold text-base">Проверка NCALayer...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5 space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-base">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Ошибка при входе</span>
          </div>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg transition-colors shadow-md"
      >
        {loading
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Подождите...</>
          : <><ShieldCheck className="w-5 h-5" /> Войти через ЕЦП</>
        }
      </button>

      <p className="text-center text-sm text-gray-400">
        Требуется установленный <strong>NCALayer</strong> на вашем компьютере
      </p>
    </div>
  );
}

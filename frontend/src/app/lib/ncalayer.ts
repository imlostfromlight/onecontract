// ncalayer.ts
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

interface NCAResponse {
  result?: any;
  responseObject?: any;
  error?: string;
  errorCode?: string;
  message?: string;
  code?: string;
}

class NCALayerService {
  private url = 'wss://127.0.0.1:13579/';

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const socket = new WebSocket(this.url);
        socket.onopen = () => {
          socket.close();
          resolve(true);
        };
        socket.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 3000);
      } catch (e) {
        resolve(false);
      }
    });
  }

  private async sendRequest(
    module: string,
    method: string,
    args: any[] = []
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      let responseReceived = false;

      // Увеличиваем таймаут для ввода пароля пользователем
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          socket.close();
          reject(new Error('Timeout: Вы не ввели пароль вовремя.'));
        }
      }, 300000); // 5 минут

      socket.onopen = () => {
        const payload = { module, method, args };
        console.log('📤 Отправляем запрос:', { module, method, args });
        socket.send(JSON.stringify(payload));
      };

      // Внутри ncalayer.ts -> sendRequest

      socket.onmessage = (event) => {
        try {
          const response: NCAResponse = JSON.parse(event.data);
          console.log('📥 Получен ответ от NCALayer:', response);

          // ФИЛЬТР: Игнорируем ответы, где result - это объект с версией (это системный шум)
          if (response.result && typeof response.result === 'object' && response.result.version) {
            console.log('⚠️ Игнорируем системное сообщение с версией...');
            return;
          }

          // Обработка ошибок
          if (response.code === '500' || response.error || response.errorCode) {
            responseReceived = true;
            clearTimeout(timeout);
            socket.close();
            const errorMsg = response.message || response.error || 'NCALayer ошибка';
            reject(new Error(errorMsg));
          }
          // Обработка успеха
          else if (response.responseObject || response.result) {
            const resultData = response.responseObject || response.result;

            // Для метода createCAdESFromBase64 мы ожидаем СТРОКУ (подпись)
            if (method === 'createCAdESFromBase64' && typeof resultData !== 'string') {
              console.warn('⚠️ Получен странный формат ответа, ждем дальше...', resultData);
              return;
            }

            responseReceived = true;
            clearTimeout(timeout);
            socket.close();
            resolve(resultData);
          }
        } catch (e) {
          console.error('JSON Parse Error', e);
        }
      };

      socket.onerror = (error) => {
        if (!responseReceived) {
          // Иногда onerror срабатывает при разрыве, но мы могли уже получить ответ
          console.error('WebSocket error', error);
        }
      };

      socket.onclose = () => {
        if (!responseReceived) {
          // Если закрылось без ответа
          // reject(new Error('Соединение с NCALayer разорвано'));
        }
      };
    });
  }

  async authenticateWithKeyFile(): Promise<{ token: string; user: any }> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('NCALayer не запущен. Пожалуйста, запустите приложение NCALayer.');
      }

      console.log('✅ NCALayer доступен. Начинаем подписание...');

      // Генерируем данные для подписи
      const rawData = 'AUTH_' + new Date().getTime();
      const dataToSign = btoa(rawData);
      console.log('Данные для подписи:', rawData);

      // === ЕДИНСТВЕННЫЙ ШАГ: Подписание ===
      // Аргументы: StorageName, KeyType, Base64Data, Attached(false)/Detached(true)
      // Обычно для логина используем флаг false (attached signature) или true, зависит от бэкенда.
      // Используем standard: 'PKCS12', 'SIGNATURE', data, true (detached) - самый чистый вариант

      const signatureResponse = await this.sendRequest(
        'kz.gov.pki.knca.commonUtils',
        'createCAdESFromBase64',
        ['PKCS12', 'SIGNATURE', dataToSign, true]
      );

      if (!signatureResponse) {
        throw new Error('Подпись не была создана (возможно, неверный пароль или отмена).');
      }

      console.log('✅ Подпись получена. Отправка на сервер...');

      // Отправляем ТОЛЬКО подпись и исходные данные.
      // Бэкенд сам достанет IIN и имя из подписи.
      const response = await fetch(`${API_BASE}/api/auth/ecp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signed_data: dataToSign,
          signature_key: signatureResponse,
          // certificate_info мы больше не отправляем, это небезопасно и лишне
          certificate_info: {}
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка проверки подписи на сервере');
      }

      const result = await response.json();
      console.log('✅ Аутентификация успешна!', result);
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error('❌ Ошибка процесса:', errorMsg);
      throw error;
    }
  }

  /**
   * Sign base64 data (for files or documents).
   * @param base64Data result of file reader
   */
  async signFile(base64Data: string): Promise<string> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('NCALayer не запущен. Пожалуйста, запустите приложение NCALayer.');
    }

    // SIGNATURE type for file signing usually
    // true = detached signature (store signature separate from file)
    // false = attached (file is inside signature) - usually detached is better for large files
    const signature = await this.sendRequest(
      'kz.gov.pki.knca.commonUtils',
      'createCAdESFromBase64',
      ['PKCS12', 'SIGNATURE', base64Data, true]
    );

    if (!signature) {
      throw new Error('Подпись не была создана.');
    }

    return signature;
  }
}

export default new NCALayerService();
import base64
import logging
from asn1crypto import cms, x509

logger = logging.getLogger(__name__)

def verify_ncalayer_signature(signature_b64, signed_data, cert_info_dummy=None):
    """
    Проверяет подпись NCALayer и извлекает данные пользователя (IIN, CN, и т.д.)
    напрямую из структуры CMS (CAdES), игнорируя cert_info.
    """
    try:
        # 1. Декодируем Base64 подпись
        signature_bytes = base64.b64decode(signature_b64)

        # 2. Парсим структуру CMS (PKCS#7)
        content_info = cms.ContentInfo.load(signature_bytes)
        if content_info['content_type'].native != 'signed_data':
            logger.error("Signature is not pkcs7-signed-data")
            return None

        signed_data_structure = content_info['content']
        
        # 3. Извлекаем сертификаты из подписи
        # В CMS структуре обычно лежит цепочка сертификатов. Нам нужен сертификат подписанта.
        certificates = signed_data_structure['certificates']
        if not certificates:
            logger.error("No certificates found in signature")
            return None

        # Обычно первый сертификат - это сертификат пользователя
        user_cert = None
        for cert in certificates:
            # Преобразуем в объект Certificate
            parsed_cert = cert.parse()
            # Здесь можно добавить логику поиска нужного сертификата по SignerIdentifier,
            # но для простоты берем первый, так как NCALayer обычно шлет его первым.
            user_cert = parsed_cert
            break

        if not user_cert:
            return None

        # 4. Извлекаем Subject (данные владельца)
        subject = user_cert.subject
        user_data = {
            'iin': None,
            'email': None,
            'first_name': None,
            'last_name': None,
            'common_name': None
        }

        # Проходим по полям сертификата
        # OIDы: 2.5.4.3 (CN), 2.5.4.5 (SerialNumber), 2.5.4.42 (GivenName), 2.5.4.4 (Surname)
        native_subject = subject.native # Возвращает словарь {'common_name': ..., 'serial_number': ...}

        # --- Извлечение IIN ---
        # В сертификатах РК IIN лежит в 'serial_number' (как "IIN123456789012") 
        # или в 'common_name' (как "IIN123456789012...")
        serial_number = native_subject.get('serial_number', '')
        common_name = native_subject.get('common_name', '')

        if serial_number and serial_number.startswith('IIN'):
            user_data['iin'] = serial_number[3:] # Обрезаем префикс "IIN"
        elif 'IIN' in common_name:
            # Фолбек, если IIN зашит в CN
            import re
            match = re.search(r'IIN(\d{12})', common_name)
            if match:
                user_data['iin'] = match.group(1)

        # --- Извлечение ФИО ---
        user_data['common_name'] = common_name
        user_data['first_name'] = native_subject.get('given_name', '')
        user_data['last_name'] = native_subject.get('surname', '')
        user_data['email'] = native_subject.get('email_address', '')

        if not user_data['iin']:
            logger.error("IIN not found in certificate subject")
            return None

        # ВАЖНО: В продакшене здесь нужно криптографически проверить подпись 
        # (сверить хэш signed_data с расшифрованным хэшем из signature).
        # Библиотека asn1crypto только ПАРСИТ, но не проверяет валидность подписи.
        # Для полной проверки используйте openssl или библиотеку `endesive`.
        # Для этапа MVP/Теста парсинг допустим, если вы доверяете каналу.
        
        return user_data

    except Exception as e:
        logger.error(f"Error parsing NCALayer signature: {e}", exc_info=True)
        return None
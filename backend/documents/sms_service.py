import requests
from django.conf import settings
from django.core.cache import cache
import random
import logging

logger = logging.getLogger(__name__)

_OTP_TTL = 600  # 10 minutes


def _normalize_phone(phone: str) -> str:
    digits = phone.lstrip('+')
    if digits.startswith('8') and len(digits) == 11:
        digits = '7' + digits[1:]
    return f'+{digits}'


def otp_send(phone: str) -> str:
    """Generate OTP, store in cache, send via SMS. Returns the code."""
    code = str(random.randint(100000, 999999))
    key = f'otp_{phone}'
    cache.set(key, code, timeout=_OTP_TTL)

    message = f'Ваш код для подписания договора OneContract: {code}. Действителен 10 минут.'

    if getattr(settings, 'SMS_DEBUG', True):
        print(f"\n{'='*50}\n[OTP] To: {phone} | Code: {code}\n{'='*50}\n")
        return code

    send_sms(_normalize_phone(phone), message)
    return code


def otp_check(phone: str, code: str) -> bool:
    """Verify OTP code. Returns True if valid."""
    key = f'otp_{phone}'
    stored = cache.get(key)
    if stored and stored == code.strip():
        cache.delete(key)
        return True
    return False


def send_sms(phone: str, message: str) -> bool:
    api_key = getattr(settings, 'MOBIZON_API_KEY', '')
    if api_key:
        try:
            digits = phone.lstrip('+')
            if digits.startswith('8') and len(digits) == 11:
                digits = '7' + digits[1:]
            payload = {'recipient': digits, 'text': message}
            r = requests.post(
                f'https://api.mobizon.kz/service/message/sendSmsMessage?output=json&apiKey={api_key}',
                json=payload,
                timeout=10,
            )
            data = r.json()
            if data.get('code') == 0:
                return True
            logger.error(f'Mobizon error: {data}')
        except Exception as e:
            logger.error(f'Mobizon SMS failed: {e}')

    sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    from_num = getattr(settings, 'TWILIO_FROM_NUMBER', '')
    if sid and token and from_num:
        try:
            r = requests.post(
                f'https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json',
                auth=(sid, token),
                data={'To': phone, 'From': from_num, 'Body': message},
                timeout=10,
            )
            if r.status_code == 201:
                return True
            logger.error(f'Twilio SMS error: {r.json()}')
            return False
        except Exception as e:
            logger.error(f'Twilio SMS failed: {e}')
            return False

    smsc_login = getattr(settings, 'SMSC_LOGIN', '')
    smsc_password = getattr(settings, 'SMSC_PASSWORD', '')
    if smsc_login and smsc_password:
        try:
            r = requests.get(
                'https://smsc.ru/sys/send.php',
                params={
                    'login': smsc_login,
                    'psw': smsc_password,
                    'phones': phone.lstrip('+'),
                    'mes': message,
                    'fmt': 3,
                    'charset': 'utf-8',
                },
                timeout=10,
            )
            data = r.json()
            if 'error' not in data:
                return True
            logger.error(f'SMSC error: {data}')
            return False
        except Exception as e:
            logger.error(f'SMSC failed: {e}')
            return False

            return False

    logger.warning('No SMS provider configured')
    return False

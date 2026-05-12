import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_sms(phone: str, message: str) -> bool:
    """Send SMS. In debug mode logs to console. In production uses Mobizon."""
    if getattr(settings, 'SMS_DEBUG', True):
        logger.info(f"[SMS DEBUG] To: {phone} | Message: {message}")
        print(f"\n{'='*50}\n[SMS] To: {phone}\n{message}\n{'='*50}\n")
        return True

    api_key = getattr(settings, 'MOBIZON_API_KEY', '')
    if not api_key:
        logger.warning("MOBIZON_API_KEY not configured, SMS not sent")
        return False

    try:
        res = requests.post(
            'https://api.mobizon.kz/service/message/sendsmsmessage',
            data={
                'recipient': phone,
                'text': message,
                'apiKey': api_key,
            },
            timeout=10,
        )
        data = res.json()
        if data.get('code') == 0:
            return True
        logger.error(f"Mobizon error: {data}")
        return False
    except Exception as e:
        logger.error(f"SMS send failed: {e}")
        return False

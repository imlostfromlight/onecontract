import base64
import threading
import requests
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

SIGEX_BASE = 'https://sigex.kz'
_CACHE_TTL = 600  # 10 min


def _send_documents(data_url: str, payload: dict):
    """Background thread: POST documents to SIGEX (blocks until user scans QR)."""
    try:
        r = requests.post(data_url, json=payload, timeout=300)
        r.raise_for_status()
        logger.info(f'SIGEX documents delivered to {data_url}')
    except Exception as e:
        logger.error(f'SIGEX send documents failed: {e}')


def create_signing_session(title: str, file_b64: str = None, file_mime: str = '@file/pdf') -> dict:
    # Step 1: Register QR session (fast)
    r = requests.post(
        f'{SIGEX_BASE}/api/egovQr',
        json={'description': title},
        timeout=10,
    )
    r.raise_for_status()
    data = r.json()

    data_url = data['dataURL']
    sign_url = data['signURL']
    qr_code = data['qrCode']  # base64-encoded PNG
    expire_at = data['expireAt']

    qr_id = data_url.rstrip('/').split('/')[-1]

    doc = {'id': 1, 'nameRu': title, 'nameKz': title, 'nameEn': title}
    if file_b64:
        doc['document'] = {'file': {'mime': file_mime, 'data': file_b64}}

    # Step 2: Send documents in background — this call blocks until user scans
    threading.Thread(
        target=_send_documents,
        args=(data_url, {'signMethod': 'CMS_SIGN_ONLY', 'documentsToSign': [doc]}),
        daemon=True,
    ).start()

    cache.set(f'sigex_{qr_id}', {'sign_url': sign_url, 'expire_at': expire_at}, timeout=_CACHE_TTL)

    return {'id': qr_id, 'qr_image': qr_code, 'expire_at': expire_at}


def get_session_status(session_id: str) -> dict:
    cached = cache.get(f'sigex_{session_id}')
    if not cached:
        return {'status': 'EXPIRED'}

    try:
        r = requests.get(cached['sign_url'], timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        logger.error(f'Sigex status error: {e}')
        return {'status': 'ERROR'}

    if data.get('status') == 'CANCELED':
        return {'status': 'CANCELED'}

    docs = data.get('documentsToSign', [])
    if docs:
        iin = data.get('signerIin', '')
        return {'status': 'SIGNED', 'iin': iin}

    return {'status': 'WAITING'}

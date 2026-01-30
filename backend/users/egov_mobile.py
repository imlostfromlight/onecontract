import uuid
import json
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

class EGovMobileAuth:
    """
    Mock implementation of eGov Mobile (Digital ID) QR Authentication.
    In a real scenario, this would communicate with the Digital ID API.
    """
    
    CACHE_PREFIX = "egov_qr_session_"
    CACHE_TIMEOUT = 300  # 5 minutes

    @staticmethod
    def generate_qr_request():
        """
        Generates a new QR login session.
        Returns the session_id and the QR code content (URL).
        """
        session_id = str(uuid.uuid4())
        
        # In a real app, you would request this URL from the external eGov/Digital ID API
        # The URL usually follows a scheme like 'egovmobile://sign?request_id=...' or similar
        # For this mock, we'll create a dummy URL that contains our session ID.
        sign_url = f"https://id.egov.kz/qr-api/sign?session_id={session_id}"
        
        # Store initial status in cache
        cache.set(f"{EGovMobileAuth.CACHE_PREFIX}{session_id}", {
            "status": "WAITING",
            "created_at": str(uuid.uuid1()) # Just a timestamp
        }, timeout=EGovMobileAuth.CACHE_TIMEOUT)
        
        return {
            "session_id": session_id,
            "sign_url": sign_url
        }

    @staticmethod
    def check_status(session_id):
        """
        Checks the status of a QR session.
        """
        data = cache.get(f"{EGovMobileAuth.CACHE_PREFIX}{session_id}")
        if not data:
            return {"status": "EXPIRED"}
        
        return data

    @staticmethod
    def mock_approve_session(session_id, iin, email, first_name, last_name):
        """
        Dev/Test helper to simulate a successful scan and signing.
        """
        key = f"{EGovMobileAuth.CACHE_PREFIX}{session_id}"
        if not cache.get(key):
            return False
            
        cache.set(key, {
            "status": "SIGNED",
            "user_data": {
                "iin": iin,
                "email": email,
                "first_name": first_name,
                "last_name": last_name
            }
        }, timeout=EGovMobileAuth.CACHE_TIMEOUT)
        return True

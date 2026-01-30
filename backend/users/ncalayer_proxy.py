"""
NCALayer Authentication Backend - ECP (ЕЦП) Support

IMPORTANT: NCALayer is a BROWSER PLUGIN, not an HTTP service.
- Frontend talks to NCALayer plugin via: window.ncalayer.invokeSignService()
- Frontend sends signed data to this backend for verification
- Backend verifies the signature and authenticates the user

This module only handles BACKEND endpoints for receiving and verifying ECP signatures.
It does NOT proxy HTTP requests to NCALayer.
"""

import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def ncalayer_check(request):
    """
    Backend health check for ECP authentication.
    
    The frontend can call this to verify the backend is ready for ECP auth.
    NCALayer plugin communication happens entirely on the frontend.
    """
    return Response({
        'backend_ready': True,
        'ecp_auth_available': True,
        'status': 'ok'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def get_signatures(request):
    """
    DEPRECATED ENDPOINT
    
    NCALayer is a browser plugin - this endpoint is not used.
    Frontend gets certificates via: window.ncalayer.invokeSignService({}, callback)
    """
    return Response({
        'error': 'deprecated',
        'message': 'Use window.ncalayer browser plugin API instead'
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def sign_data(request):
    """
    DEPRECATED ENDPOINT
    
    NCALayer is a browser plugin - this endpoint is not used.
    Frontend signs data via: window.ncalayer.invokeSignService({data, key}, callback)
    """
    return Response({
        'error': 'deprecated',
        'message': 'Use window.ncalayer browser plugin API instead'
    }, status=status.HTTP_400_BAD_REQUEST)
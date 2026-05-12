from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import redirect
from django.conf import settings
from rest_framework.authtoken.models import Token
from users.models import User
import requests


@api_view(['GET'])
@permission_classes([AllowAny])
def google_login(request):
    """Redirect user to Google OAuth"""
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        return Response({'error': 'GOOGLE_CLIENT_ID is not configured'}, status=500)

    redirect_uri = settings.GOOGLE_REDIRECT_URI
    google_auth_url = (
        f'https://accounts.google.com/o/oauth2/v2/auth?'
        f'client_id={client_id}&'
        f'redirect_uri={redirect_uri}&'
        f'response_type=code&'
        f'scope=openid%20profile%20email'
    )
    return redirect(google_auth_url)


@api_view(['GET'])
@permission_classes([AllowAny])
def google_callback(request):
    """Handle Google OAuth callback"""
    code = request.query_params.get('code')

    if not code:
        return Response({'error': 'No authorization code'}, status=400)

    try:
        token_url = 'https://oauth2.googleapis.com/token'
        data = {
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': settings.GOOGLE_REDIRECT_URI,
            'grant_type': 'authorization_code',
        }

        token_response = requests.post(token_url, data=data)
        tokens = token_response.json()

        if 'error' in tokens:
            return Response({'error': tokens['error']}, status=400)

        headers = {'Authorization': f"Bearer {tokens['access_token']}"}
        user_info_response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers=headers
        )
        user_info = user_info_response.json()

        email = user_info.get('email')
        first_name = user_info.get('given_name', '')

        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': first_name,
            }
        )

        token, _ = Token.objects.get_or_create(user=user)

        frontend_url = settings.FRONTEND_URL
        return redirect(f'{frontend_url}/auth/callback?token={token.key}')

    except Exception as e:
        return Response({'error': str(e)}, status=500)

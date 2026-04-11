from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import redirect
from django.conf import settings
from rest_framework.authtoken.models import Token
from users.models import User
import requests
import json


# Login redirect functions
@api_view(['GET'])
@permission_classes([AllowAny])
def google_login(request):
    """Redirect user to Google OAuth"""
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        return Response({'error': 'GOOGLE_CLIENT_ID is not configured on the server. Set it in Render environment variables.'}, status=500)

    redirect_uri = 'https://onecontract.onrender.com/accounts/google/login/callback/'
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
def facebook_login(request):
    """Redirect user to Facebook OAuth"""
    redirect_uri = 'https://onecontract.onrender.com/api/auth/facebook/callback/'
    
    facebook_auth_url = (
        f'https://www.facebook.com/v18.0/dialog/oauth?'
        f'client_id={settings.FACEBOOK_APP_ID}&'
        f'redirect_uri={redirect_uri}&'
        f'scope=email,public_profile&'
        f'response_type=code'
    )
    return redirect(facebook_auth_url)


@api_view(['GET'])
@permission_classes([AllowAny])
def telegram_login(request):
    """Telegram login not yet configured"""
    return Response({
        'message': 'Telegram login not yet configured',
        'instructions': 'Use Telegram Bot API with /start command'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def whatsapp_login(request):
    """WhatsApp login not yet configured"""
    return Response({
        'message': 'WhatsApp login not yet configured',
        'instructions': 'WhatsApp requires business account and webhook setup'
    })

# Google OAuth callback handler
@api_view(['GET'])
@permission_classes([AllowAny])
def google_callback(request):
    """Handle Google OAuth callback"""
    code = request.query_params.get('code')
    
    if not code:
        return Response({'error': 'No authorization code'}, status=400)
    
    try:
        # Exchange code for access token
        token_url = 'https://oauth2.googleapis.com/token'
        data = {
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': 'https://onecontract.onrender.com/accounts/google/login/callback/',
            'grant_type': 'authorization_code',
        }
        
        token_response = requests.post(token_url, data=data)
        tokens = token_response.json()
        
        if 'error' in tokens:
            return Response({'error': tokens['error']}, status=400)
        
        # Get user info
        headers = {'Authorization': f"Bearer {tokens['access_token']}"}
        user_info_response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers=headers
        )
        user_info = user_info_response.json()
        
        # Create or get user
        email = user_info.get('email')
        first_name = user_info.get('given_name', '')
        
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': first_name,
            }
        )
        
        # Create token
        token, _ = Token.objects.get_or_create(user=user)
        
        # Redirect to frontend with token
        return redirect(f'https://onecontract.pages.dev/auth/callback?token={token.key}')
    
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# Facebook OAuth callback handler  
@api_view(['GET'])
@permission_classes([AllowAny])
def facebook_callback(request):
    """Handle Facebook OAuth callback"""
    code = request.query_params.get('code')
    
    if not code:
        return Response({'error': 'No authorization code'}, status=400)
    
    try:
        # Exchange code for access token
        token_url = 'https://graph.facebook.com/v18.0/oauth/access_token'
        data = {
            'client_id': settings.FACEBOOK_APP_ID,
            'client_secret': settings.FACEBOOK_APP_SECRET,
            'redirect_uri': 'https://onecontract.onrender.com/api/auth/facebook/callback/',
            'code': code,
        }
        
        token_response = requests.post(token_url, data=data)
        tokens = token_response.json()
        
        if 'error' in tokens:
            return Response({'error': tokens['error']['message']}, status=400)
        
        # Get user info
        user_info_response = requests.get(
            f"https://graph.facebook.com/me?access_token={tokens['access_token']}&fields=id,email,first_name,last_name"
        )
        user_info = user_info_response.json()
        
        email = user_info.get('email')
        if not email:
            return Response({'error': 'Could not get email from Facebook'}, status=400)
        
        first_name = user_info.get('first_name', '')
        
        # Create or get user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': first_name,
            }
        )
        
        # Create token
        token, _ = Token.objects.get_or_create(user=user)
        
        # Redirect to frontend with token
        return redirect(f'https://onecontract.pages.dev/auth/callback?token={token.key}')
    
    except Exception as e:
        return Response({'error': str(e)}, status=500)


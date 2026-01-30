import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.contrib.auth.models import User as DjangoUser
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer, ECPSignatureSerializer
from .models import User
from .ncalayer_auth import verify_ncalayer_signature
from .egov_mobile import EGovMobileAuth
from .permissions import IsSuperAdmin, IsAdminUser, IsOrganization, IsClient, IsOrganizationOrClient
import core.settings as settings
import logging


logger = logging.getLogger(__name__)

@api_view(['POST'])
def register(request):
    """Register a new user"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Пользователь не найден'},
                            status=status.HTTP_404_NOT_FOUND)

        # если у тебя пароли не захэшированы – временно можешь убрать проверку
        if password != 'dummy' and not user.check_password(password):
            return Response({'detail': 'Неверный пароль'},
                            status=status.HTTP_401_UNAUTHORIZED)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def ecp_authenticate(request):
    signature = request.data.get('signature_key')
    signed_data = request.data.get('signed_data')
    # Frontend может прислать пустой объект, это нормально
    cert_info_dummy = request.data.get('certificate_info', {}) 

    if not signature or not signed_data:
        return Response({'detail': 'Отсутствует подпись или данные'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # 1. Проверяем подпись.
        # ВАЖНО: Ваша функция verify_ncalayer_signature должна парсить CMS подпись.
        # Если она раньше полагалась только на cert_info, её нужно доработать, 
        # но обычно библиотеки (Kalkan/PyCP) достают subject из самой CMS.
        
        verified = verify_ncalayer_signature(signature, signed_data, cert_info_dummy)
        
        # Если verified вернул данные пользователя (значит подпись валидна)
        if not verified or not verified.get('iin'):
            return Response({'detail': 'Ошибка проверки ЭЦП или сертификата'}, status=status.HTTP_400_BAD_REQUEST)

        iin = verified['iin']
        email = verified.get('email', '')
        # NCALayer часто возвращает CommonName (CN) как "LASTNAME FIRSTNAME"
        cn = verified.get('common_name') or verified.get('cn', '')
        
        # Попытка разбить CN на имя/фамилию, если они не пришли отдельно
        # Always parse CN to ensure consistent First/Last/Patronymic separation
        # ignoring cert's given_name/surname fields which might be mixed up
        if cn:
            # Clean up CN if it contains IIN prefix (e.g. "IIN123... NAME")
            clean_cn = cn
            if 'IIN' in clean_cn:
                parts_raw = clean_cn.split(' ')
                # If first part looks like "IIN123...", drop it
                if parts_raw[0].startswith('IIN') and any(c.isdigit() for c in parts_raw[0]):
                    clean_cn = ' '.join(parts_raw[1:])
            
            parts = clean_cn.split(' ')
            parts = clean_cn.split(' ')
            if len(parts) > 0:
                # 1. Identify Patronymic (any part ending in suffix)
                patronymic_suffixes = ('ULY', 'KYZY', 'VICH', 'VNA', 'OGLY', 'УЛЫ', 'КЫЗЫ', 'ВИЧ', 'ВНА', 'ОГЛЫ', 'ҰЛЫ', 'ҚЫЗЫ')
                patronymic = None
                
                # Filter out the patronymic from parts
                remaining_parts = []
                for p in parts:
                    if not patronymic and p.strip().upper().endswith(patronymic_suffixes):
                        patronymic = p
                    else:
                        remaining_parts.append(p)
                
                # 2. Assign remaining parts to Last/First
                # Standard assumption: Surname is first, Name is second in the remaining list
                if len(remaining_parts) >= 2:
                    last_name = remaining_parts[0]
                    first_name = ' '.join(remaining_parts[1:]) # Join rest as first name (or middle)
                elif len(remaining_parts) == 1:
                    # If only one part remains, it's ambiguous. 
                    # If we found a patronymic, this is likely "Name Patronymic" -> "Name"
                    # But if no patronymic, likely "Surname" or "Cn" fallback.
                    # Let's assume it is Name if Patronymic exists, else Surname?
                    # Actually, usually "Name Patronymic" logic:
                    if patronymic:
                         # e.g. "NADYRKHAN NURLANULY" -> Patronymic=NURLANULY, Rem=NADYRKHAN
                         # NADYRKHAN is the Name (First Name)
                         first_name = remaining_parts[0]
                         last_name = patronymic # Use patronymic as surname fallback
                    else:
                        # No patronymic, single word -> Surname?
                        last_name = remaining_parts[0]
                        first_name = ''
                else: 
                     # No remaining parts (only patronymic?)
                     if patronymic:
                         last_name = patronymic
                     else:
                         last_name = clean_cn

        # 2. Находим или создаём пользователя (IIN - это username)
        user, created = User.objects.get_or_create(
            username=iin,
            defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'is_ecp_verified': True,
            }
        )
        
        # Обновляем данные существующего пользователя
        if not created:
            user.is_ecp_verified = True
            # Always update names from cert as it's the source of truth
            if first_name:
                user.first_name = first_name
            if last_name:
                user.last_name = last_name
            user.save()

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_ecp_verified': user.is_ecp_verified,
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"ECP auth failed: {e}", exc_info=True)
        return Response({'detail': f'Внутренняя ошибка сервера: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_info(request):
    """Get current authenticated user info"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


# --- eGov Mobile QR Authentication ---

@api_view(['POST'])
@permission_classes([AllowAny])
def egov_qr_init(request):
    """
    Initialize eGov Mobile QR authentication session.
    Returns session_id and QR code URL/content.
    """
    try:
        data = EGovMobileAuth.generate_qr_request()
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"eGov QR init failed: {e}", exc_info=True)
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def egov_qr_status(request):
    """
    Check status of eGov Mobile QR session.
    If SIGNED, logs in the user and returns token.
    GET params: session_id
    """
    session_id = request.query_params.get('session_id')
    if not session_id:
        return Response({'detail': 'session_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        status_data = EGovMobileAuth.check_status(session_id)
        
        if status_data['status'] == 'SIGNED':
            user_data = status_data['user_data']
            
            # Find or create user
            user, created = User.objects.get_or_create(
                username=user_data['iin'],
                defaults={
                    'email': user_data['email'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'is_ecp_verified': True,
                }
            )
            
            if not created:
                user.is_ecp_verified = True
                user.save()

            token, _ = Token.objects.get_or_create(user=user)
            
            return Response({
                'status': 'SIGNED',
                'token': token.key,
                'user': {
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                }
            }, status=status.HTTP_200_OK)
            
        return Response({'status': status_data['status']}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"eGov status check failed: {e}", exc_info=True)
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def egov_qr_mock_confirm(request):
    """
    DEV ONLY: Mock confirmation of a QR session.
    Body: { "session_id": "...", "iin": "...", "email": "..." }
    """
    session_id = request.data.get('session_id')
    iin = request.data.get('iin', '111111111111')
    email = request.data.get('email', 'mock.user@egov.kz')
    first_name = request.data.get('first_name', 'Mock')
    last_name = request.data.get('last_name', 'User')

    if not session_id:
        return Response({'detail': 'session_id required'}, status=status.HTTP_400_BAD_REQUEST)

    success = EGovMobileAuth.mock_approve_session(session_id, iin, email, first_name, last_name)
    if success:
        return Response({'detail': 'Session signed successfully'}, status=status.HTTP_200_OK)

# --- User Management (Admin Only) ---

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    Restricted to Superadmins.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]

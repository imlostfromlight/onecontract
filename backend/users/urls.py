from django.urls import path
from . import views
from . import social_auth
from . import chat_views

urlpatterns = [
    path('auth/login/', views.login, name='login'),
    path('auth/register/', views.register, name='register'),
    path('auth/fast-login/', views.fast_login, name='fast_login'),
    path('auth/user/', views.get_user_info, name='get_user_info'),

    # Email verification & password reset
    path('auth/verify-email/<str:token>/', views.verify_email, name='verify_email'),
    path('auth/password-reset/', views.password_reset_request, name='password_reset_request'),
    path('auth/password-reset-confirm/<str:token>/', views.password_reset_confirm, name='password_reset_confirm'),

    # NCALayer (ЕЦП) Digital Signature Authentication
    path('auth/ecp/', views.ecp_authenticate, name='ecp_authenticate'),

    # eGov Mobile QR Authentication
    path('auth/egov/qr/init/', views.egov_qr_init, name='egov_qr_init'),
    path('auth/egov/qr/status/', views.egov_qr_status, name='egov_qr_status'),
    path('auth/egov/qr/confirm/', views.egov_qr_mock_confirm, name='egov_qr_mock_confirm'),

    # AI Chat
    path('chat/message/', chat_views.chat_message, name='chat_message'),
    path('chat/history/', chat_views.chat_history, name='chat_history'),
    path('chat/clear/', chat_views.chat_clear, name='chat_clear'),

    # Google OAuth only
    path('auth/google/', social_auth.google_login, name='google_login'),
]

from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user-admin')

urlpatterns += router.urls

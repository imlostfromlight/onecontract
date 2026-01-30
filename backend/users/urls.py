from django.urls import path
from . import views
from . import social_auth

urlpatterns = [
    path('auth/login/', views.login, name='login'),
    path('auth/register/', views.register, name='register'),
    path('auth/user/', views.get_user_info, name='get_user_info'),

    # NCALayer (ЕЦП) Digital Signature Authentication
    path('auth/ecp/', views.ecp_authenticate, name='ecp_authenticate'),

    # eGov Mobile QR Authentication
    path('auth/egov/qr/init/', views.egov_qr_init, name='egov_qr_init'),
    path('auth/egov/qr/status/', views.egov_qr_status, name='egov_qr_status'),
    path('auth/egov/qr/confirm/', views.egov_qr_mock_confirm, name='egov_qr_mock_confirm'),

    # Social auth login
    path('auth/telegram/', social_auth.telegram_login, name='telegram_login'),
    path('auth/whatsapp/', social_auth.whatsapp_login, name='whatsapp_login'),
]

from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user-admin')

urlpatterns += router.urls

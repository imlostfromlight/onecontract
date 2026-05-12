from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_verification_email(user, token: str):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5174')
    link = f"{frontend_url}/verify-email/{token}"
    try:
        send_mail(
            subject='Подтвердите ваш email — OneContract',
            message=f'Перейдите по ссылке для подтверждения email:\n\n{link}\n\nСсылка действительна 24 часа.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send verification email to {user.email}: {e}")


def send_password_reset_email(user, token: str):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5174')
    link = f"{frontend_url}/reset-password/{token}"
    try:
        send_mail(
            subject='Сброс пароля — OneContract',
            message=f'Для сброса пароля перейдите по ссылке:\n\n{link}\n\nСсылка действительна 1 час.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {e}")

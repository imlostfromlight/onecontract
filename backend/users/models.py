from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True, blank=True)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    # Roles
    class Role(models.TextChoices):
        SUPERADMIN = 'SUPERADMIN', 'Superadmin'
        ADMIN = 'ADMIN', 'Admin'
        ORGANIZATION = 'ORGANIZATION', 'Organization'
        CLIENT = 'CLIENT', 'Client'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CLIENT,
        help_text="User role for permission handling"
    )
    
    # NCALayer (ЕЦП) digital signature fields
    signature_key = models.CharField(max_length=500, blank=True, null=True,
                                     help_text="NCALayer signature key")
    certificate_serial = models.CharField(max_length=255, blank=True, null=True,
                                          help_text="Certificate serial number")
    certificate_issuer = models.CharField(max_length=500, blank=True, null=True,
                                          help_text="Certificate issuer")
    certificate_subject = models.CharField(max_length=500, blank=True, null=True,
                                           help_text="Certificate subject")
    is_ecp_verified = models.BooleanField(default=False,
                                          help_text="ECP (ЕЦП) signature verified")
    ecp_verification_date = models.DateTimeField(null=True, blank=True,
                                                 help_text="Date of ECP verification date")

    # Email verification
    is_email_verified = models.BooleanField(default=False)
    email_verify_token = models.CharField(max_length=64, blank=True)

    # Password reset
    password_reset_token = models.CharField(max_length=64, blank=True)
    password_reset_expires = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.username
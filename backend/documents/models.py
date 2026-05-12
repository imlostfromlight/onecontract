from django.db import models
from django.conf import settings
import uuid


class Template(models.Model):
    organization = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='templates')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='templates/')
    # Auto-extracted list of {{placeholder}} names found in the DOCX
    template_fields = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class Document(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),       # Accepting signatures
        ('CLOSED', 'Closed'),     # Org closed the document
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documents')
    template = models.ForeignKey(Template, on_delete=models.SET_NULL, null=True, blank=True, related_name='documents')
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, null=True, blank=True)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')

    # Organization signature
    org_signature = models.TextField(blank=True, null=True)
    org_signed_at = models.DateTimeField(blank=True, null=True)

    # Fields clients must fill before signing
    client_fields = models.JSONField(default=list, blank=True)
    manager_fields = models.JSONField(default=dict, blank=True)

    # Phone-based signing: manager sets client phone, verified by SMS OTP
    client_phone = models.CharField(max_length=20, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.status})"


class OTPSession(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='otp_sessions')
    phone = models.CharField(max_length=20)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP {self.document_id} {self.phone}"


class DocumentSignature(models.Model):
    """One row per client who signed the document."""
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='signatures')
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='document_signatures'
    )
    client_email = models.EmailField(blank=True)   # Saved at sign time in case user is anonymous
    signature = models.TextField(blank=True, null=True)
    signed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One signature per client per document
        unique_together = ('document', 'client')

    def __str__(self):
        return f"{self.document.title} — {self.client_email or self.client}"

from django.db import models
from django.conf import settings

class Document(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SIGNED', 'Signed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documents')
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_documents')
    import uuid
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, null=True, blank=True)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Signature details
    signature = models.TextField(blank=True, null=True)  # The raw signature (CMS)
    signed_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.status})"

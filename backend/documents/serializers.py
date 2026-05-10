import os
from rest_framework import serializers
from .models import Document, Template, DocumentSignature


class DocumentSignatureSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = DocumentSignature
        fields = ['id', 'client', 'client_email', 'client_name', 'signed_at']
        read_only_fields = ['signed_at']

    def get_client_name(self, obj):
        if obj.client:
            return obj.client.get_full_name() or obj.client.username
        return obj.client_email or 'Anonymous'


class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = ['id', 'title', 'description', 'file', 'template_fields', 'created_at']
        read_only_fields = ['created_at', 'organization', 'template_fields']

    def create(self, validated_data):
        validated_data['organization'] = self.context['request'].user
        instance = super().create(validated_data)
        # Auto-extract placeholders from DOCX after save
        try:
            from .docx_utils import extract_placeholders
            fields = extract_placeholders(instance.file.path)
            if fields:
                instance.template_fields = fields
                instance.save(update_fields=['template_fields'])
        except Exception:
            pass
        return instance


class DocumentSerializer(serializers.ModelSerializer):
    signatures = DocumentSignatureSerializer(many=True, read_only=True)
    signature_count = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file', 'file_name', 'status', 'created_at', 'uuid', 'template',
            'org_signature', 'org_signed_at', 'client_fields',
            'signatures', 'signature_count',
        ]
        read_only_fields = ['status', 'created_at', 'user', 'org_signature', 'org_signed_at', 'signatures']

    def get_signature_count(self, obj):
        return obj.signatures.count()

    def get_file_name(self, obj):
        return os.path.basename(obj.file.name) if obj.file else None

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

from rest_framework import serializers
from .models import Document, Template


class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = ['id', 'title', 'description', 'file', 'created_at']
        read_only_fields = ['created_at', 'organization']

    def create(self, validated_data):
        validated_data['organization'] = self.context['request'].user
        return super().create(validated_data)


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file', 'status', 'created_at', 'client', 'uuid', 'template',
            # Client signature
            'signature', 'signed_at',
            # Org signature
            'org_signature', 'org_signed_at',
        ]
        read_only_fields = ['status', 'signed_at', 'created_at', 'user', 'org_signature', 'org_signed_at', 'signature']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

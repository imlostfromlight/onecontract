"""
Serializers for ECP/NCALayer authentication and user management.
"""

from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serialize user information"""
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role',
            'date_joined', 'is_ecp_verified', 'ecp_verification_date',
            'certificate_subject', 'certificate_serial', 'certificate_issuer'
        ]
        read_only_fields = ['id', 'date_joined', 'is_ecp_verified']


class RegisterSerializer(serializers.ModelSerializer):
    """Validate and create new user accounts"""
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password2', 'first_name', 'last_name', 'role']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Пароли не совпадают'})
        if not data.get('username'):
            data['username'] = data['email'].split('@')[0]
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    """Validate login credentials"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ECPSignatureSerializer(serializers.Serializer):
    """Validate ECP signature data from NCALayer"""
    signature_key = serializers.CharField()
    signed_data = serializers.CharField()
    certificate_info = serializers.JSONField(required=False)


class ECPAuthResponseSerializer(serializers.Serializer):
    """Response after successful ECP authentication"""
    token = serializers.CharField()
    user = UserSerializer()
    
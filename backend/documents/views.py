import os
import logging
import tempfile

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.core.files import File

from .models import Document, Template, DocumentSignature
from .serializers import DocumentSerializer, TemplateSerializer, DocumentSignatureSerializer
from .docx_utils import fill_placeholders
from .ai_summarizer import extract_text, summarize_document
from users.ncalayer_auth import verify_ncalayer_signature
from users.models import User
from users.egov_mobile import EGovMobileAuth
from users.permissions import IsSuperAdmin, IsAdminUser, IsOrganization, IsClient, IsOrganizationOrClient

logger = logging.getLogger(__name__)


class TemplateViewSet(viewsets.ModelViewSet):
    serializer_class = TemplateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        permission_classes = [permissions.IsAuthenticated, IsOrganization | IsSuperAdmin]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.SUPERADMIN:
            return Template.objects.all().order_by('-created_at')
        return Template.objects.filter(organization=user).order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='use')
    def use_template(self, request, pk=None):
        """
        Create a new Document from this template.
        Body (JSON):
          - title: str  (optional, defaults to template title)
          - fields: dict  (placeholder values, e.g. {"client_name": "Иван", "date": "2026-04-11"})
        """
        template = self.get_object()
        title = request.data.get('title') or template.title
        fields = request.data.get('fields') or {}

        try:
            src_path = template.file.path
            src_name = os.path.basename(src_path)

            # Generate filled file in a temp dir
            with tempfile.TemporaryDirectory() as tmp:
                dest_path = os.path.join(tmp, src_name)
                fill_placeholders(src_path, fields, dest_path)

                document = Document(user=request.user, template=template, title=title)
                with open(dest_path, 'rb') as f:
                    document.file.save(src_name, File(f), save=False)
                document.save()

            return Response(DocumentSerializer(document, context={'request': request}).data,
                            status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"use_template failed: {e}")
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ['public_retrieve', 'public_summarize']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'public_sign':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsOrganization | IsSuperAdmin]
        elif self.action == 'org_sign':
            permission_classes = [permissions.IsAuthenticated, IsOrganization | IsSuperAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Document.objects.none()
        if user.role in (User.Role.SUPERADMIN, User.Role.ADMIN):
            return Document.objects.all().order_by('-created_at')
        elif user.role == User.Role.ORGANIZATION:
            return Document.objects.filter(user=user).order_by('-created_at')
        elif user.role == User.Role.CLIENT:
            # Documents the client has signed
            signed_doc_ids = DocumentSignature.objects.filter(client=user).values_list('document_id', flat=True)
            return Document.objects.filter(id__in=signed_doc_ids).order_by('-created_at')
        return Document.objects.none()

    # ── Public endpoints ──────────────────────────────────────────────────────

    @action(detail=False, methods=['get'],
            url_path='public/(?P<uuid>[^/.]+)',
            permission_classes=[permissions.AllowAny])
    def public_retrieve(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)
            return Response(DocumentSerializer(document, context={'request': request}).data)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'],
            url_path='public/(?P<uuid>[^/.]+)/sign',
            permission_classes=[permissions.IsAuthenticated])
    def public_sign(self, request, uuid=None):
        """
        Client signs the document via the invite UUID link.
        Creates a DocumentSignature record — one document can be signed by many clients.
        """
        try:
            document = Document.objects.get(uuid=uuid)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

        if document.status == 'CLOSED':
            return Response({'detail': 'This document is closed and no longer accepting signatures'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate signature from same client
        if DocumentSignature.objects.filter(document=document, client=request.user).exists():
            return Response({'detail': 'You have already signed this document'},
                            status=status.HTTP_400_BAD_REQUEST)

        signature = request.data.get('signature')
        cert_info = request.data.get('certificate_info', {})
        if not signature:
            return Response({'detail': 'Signature is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            signed_data = request.data.get('signed_data')
            verified_info = verify_ncalayer_signature(signature, signed_data, cert_info)
            if not verified_info:
                return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
            if verified_info.get('iin') != request.user.username:
                return Response({'detail': 'Signature IIN does not match current user'},
                                status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"Sign verification failed: {e}")
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        sig = DocumentSignature.objects.create(
            document=document,
            client=request.user,
            client_email=request.user.email,
            signature=signature,
        )
        return Response({
            'detail': 'Document signed successfully',
            'signature': DocumentSignatureSerializer(sig).data,
            'document': DocumentSerializer(document, context={'request': request}).data,
        })

    # ── Org signature ─────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='org_sign')
    def org_sign(self, request, pk=None):
        document = self.get_object()
        if document.org_signed_at:
            return Response({'detail': 'Document already signed by organization'},
                            status=status.HTTP_400_BAD_REQUEST)

        signature = request.data.get('signature', f'ORG_APPROVED_{request.user.id}')

        if request.data.get('signed_data') or request.data.get('certificate_info'):
            try:
                verified_info = verify_ncalayer_signature(
                    signature,
                    request.data.get('signed_data'),
                    request.data.get('certificate_info', {}),
                )
                if not verified_info:
                    return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        document.org_signature = signature
        document.org_signed_at = timezone.now()
        document.save()
        return Response(DocumentSerializer(document, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='close')
    def close_document(self, request, pk=None):
        """Org closes the document — no more signatures accepted."""
        document = self.get_object()
        document.status = 'CLOSED'
        document.save()
        return Response(DocumentSerializer(document, context={'request': request}).data)

    # ── Verify / Summarize ────────────────────────────────────────────────────

    @action(detail=True, methods=['get'])
    def verify(self, request, pk=None):
        document = self.get_object()
        signatures = document.signatures.all()
        if not signatures.exists() and not document.org_signed_at:
            return Response({'detail': 'No signatures yet'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'org_signed_at': document.org_signed_at,
            'org_signer': document.user.get_full_name() or document.user.username,
            'client_signatures': DocumentSignatureSerializer(signatures, many=True).data,
        })

    @action(detail=True, methods=['get'])
    def summarize(self, request, pk=None):
        document = self.get_object()
        try:
            text = extract_text(document.file.path)
            summary = summarize_document(text)
            return Response({
                'document_id': document.id,
                'title': document.title,
                'key_points': summary.get('key_points', []),
                'suspicious_clauses': summary.get('suspicious_clauses', []),
            })
        except Exception as e:
            logger.error(f"Summarize failed: {e}")
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'],
            url_path='public/(?P<uuid>[^/.]+)/summarize',
            permission_classes=[permissions.AllowAny])
    def public_summarize(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)
            text = extract_text(document.file.path)
            summary = summarize_document(text)
            return Response({
                'document_id': document.id,
                'title': document.title,
                'key_points': summary.get('key_points', []),
                'suspicious_clauses': summary.get('suspicious_clauses', []),
            })
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── eGov Mobile signing ───────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def sign_egov_init(self, request, pk=None):
        document = self.get_object()
        if document.status == 'CLOSED':
            return Response({'detail': 'Document is closed'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            data = EGovMobileAuth.generate_qr_request()
            return Response(data)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def sign_egov_status(self, request, pk=None):
        document = self.get_object()
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response({'detail': 'session_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            status_data = EGovMobileAuth.check_status(session_id)
            if status_data['status'] == 'SIGNED':
                user_data = status_data['user_data']

                if DocumentSignature.objects.filter(document=document, client=request.user).exists():
                    return Response({'status': 'SIGNED',
                                     'document': DocumentSerializer(document, context={'request': request}).data})

                if user_data['iin'] != request.user.username:
                    return Response({'status': 'ERROR',
                                     'detail': f'ИИН подписанта не совпадает'})

                sig = DocumentSignature.objects.create(
                    document=document,
                    client=request.user,
                    client_email=request.user.email,
                    signature=f"MOCK_EGOV_SIGNATURE_SESSION_{session_id}",
                )
                return Response({'status': 'SIGNED',
                                 'document': DocumentSerializer(document, context={'request': request}).data})

            return Response({'status': status_data['status']})
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

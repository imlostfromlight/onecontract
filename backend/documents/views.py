from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from .models import Document, Template
from .serializers import DocumentSerializer, TemplateSerializer
from users.ncalayer_auth import verify_ncalayer_signature
from .ai_summarizer import extract_text, summarize_document
import logging

logger = logging.getLogger(__name__)

from users.models import User
from users.egov_mobile import EGovMobileAuth
from users.permissions import IsSuperAdmin, IsAdminUser, IsOrganization, IsClient, IsOrganizationOrClient


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
        elif self.action == 'sign':
             permission_classes = [permissions.IsAuthenticated, IsOrganizationOrClient | IsSuperAdmin]
        elif self.action == 'org_sign':
            permission_classes = [permissions.IsAuthenticated, IsOrganization | IsSuperAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Document.objects.none()

        if user.role == User.Role.SUPERADMIN or user.role == User.Role.ADMIN:
            return Document.objects.all().order_by('-created_at')
        elif user.role == User.Role.ORGANIZATION:
            return Document.objects.filter(user=user).order_by('-created_at')
        elif user.role == User.Role.CLIENT:
            return Document.objects.filter(client=user).order_by('-created_at')

        return Document.objects.none()

    @action(detail=False, methods=['get'], url_path='public/(?P<uuid>[^/.]+)', permission_classes=[permissions.AllowAny])
    def public_retrieve(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)
            return Response(DocumentSerializer(document).data)
        except Document.DoesNotExist:
             return Response({'detail': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='public/(?P<uuid>[^/.]+)/sign', permission_classes=[permissions.IsAuthenticated])
    def public_sign(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)

            if not document.client and request.user.role == User.Role.CLIENT:
                document.client = request.user
                document.save()

            signature = request.data.get('signature')
            cert_info = request.data.get('certificate_info', {})

            if not signature:
                return Response({'detail': 'Signature is required'}, status=status.HTTP_400_BAD_REQUEST)

            if document.status == 'SIGNED':
                 return Response({'detail': 'Document already signed'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                signed_data = request.data.get('signed_data')
                verified_info = verify_ncalayer_signature(signature, signed_data, cert_info)

                if not verified_info:
                    return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

                if verified_info.get('iin') != request.user.username:
                     return Response({'detail': 'Signature IIN does not match current user'}, status=status.HTTP_403_FORBIDDEN)

                document.status = 'SIGNED'
                document.signature = signature
                document.signed_at = timezone.now()
                document.save()

                return Response(DocumentSerializer(document).data)

            except Exception as e:
                logger.error(f"Sign verification failed: {e}")
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Document.DoesNotExist:
             return Response({'detail': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        document = self.get_object()

        signature = request.data.get('signature')
        cert_info = request.data.get('certificate_info', {})

        if not signature:
            return Response({'detail': 'Signature is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            signed_data = request.data.get('signed_data')
            verified_info = verify_ncalayer_signature(signature, signed_data, cert_info)

            if not verified_info:
                return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

            if verified_info.get('iin') != self.request.user.username:
                 return Response({'detail': 'Signature IIN does not match current user'}, status=status.HTTP_403_FORBIDDEN)

            document.status = 'SIGNED'
            document.signature = signature
            document.signed_at = timezone.now()
            document.save()

            return Response(DocumentSerializer(document).data)

        except Exception as e:
            logger.error(f"Sign failed: {e}")
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='org_sign')
    def org_sign(self, request, pk=None):
        """
        Organization signs the document. Stores org_signature and org_signed_at.
        Org can sign with NCALayer (if available) or with a simple approval.
        """
        document = self.get_object()

        if document.org_signed_at:
            return Response({'detail': 'Document already signed by organization'}, status=status.HTTP_400_BAD_REQUEST)

        signature = request.data.get('signature', f'ORG_APPROVED_{request.user.id}')

        # If NCALayer signature provided, try to verify it
        if request.data.get('signed_data') or request.data.get('certificate_info'):
            try:
                cert_info = request.data.get('certificate_info', {})
                signed_data = request.data.get('signed_data')
                verified_info = verify_ncalayer_signature(signature, signed_data, cert_info)
                if not verified_info:
                    return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Org sign verification failed: {e}")
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        document.org_signature = signature
        document.org_signed_at = timezone.now()
        document.save()

        return Response(DocumentSerializer(document).data)

    @action(detail=True, methods=['get'])
    def verify(self, request, pk=None):
        document = self.get_object()
        if document.status != 'SIGNED' or not document.signature:
            return Response({'detail': 'Document is not signed'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with document.file.open('rb') as f:
                  file_content = f.read()

            import base64
            b64_data = base64.b64encode(file_content).decode('utf-8')

            info = verify_ncalayer_signature(document.signature, b64_data)

            result = {
                "status": "VALID",
                "client_signer": info.get('common_name') or info.get('subject'),
                "client_iin": info.get('iin'),
                "client_email": info.get('email'),
                "client_signed_at": document.signed_at,
            }

            if document.org_signed_at:
                result["org_signed_at"] = document.org_signed_at
                result["org_signer"] = document.user.get_full_name() or document.user.username

            return Response(result)
        except Exception as e:
             return Response({
                 "status": "INVALID",
                 "error": str(e)
             })

    @action(detail=True, methods=['get'])
    def summarize(self, request, pk=None):
        document = self.get_object()

        try:
            file_path = document.file.path
            text = extract_text(file_path)
            summary = summarize_document(text)

            return Response({
                "document_id": document.id,
                "title": document.title,
                "key_points": summary.get('key_points', []),
                "suspicious_clauses": summary.get('suspicious_clauses', [])
            })
        except Exception as e:
            logger.error(f"Document summarization failed: {e}")
            return Response({
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='public/(?P<uuid>[^/.]+)/summarize', permission_classes=[permissions.AllowAny])
    def public_summarize(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)

            file_path = document.file.path
            text = extract_text(file_path)
            summary = summarize_document(text)

            return Response({
                "document_id": document.id,
                "title": document.title,
                "key_points": summary.get('key_points', []),
                "suspicious_clauses": summary.get('suspicious_clauses', [])
            })
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Public document summarization failed: {e}")
            return Response({
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def sign_egov_init(self, request, pk=None):
        document = self.get_object()
        if document.status == 'SIGNED':
             return Response({'detail': 'Document already signed'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = EGovMobileAuth.generate_qr_request()
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"eGov QR init failed: {e}")
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

                if document.status == 'SIGNED':
                    return Response({
                        'status': 'SIGNED',
                        'document': DocumentSerializer(document).data
                    })

                if user_data['iin'] != request.user.username:
                     return Response({
                         'status': 'ERROR',
                         'detail': f'ИИН подписанта ({user_data["iin"]}) не совпадает с текущим пользователем'
                     }, status=status.HTTP_200_OK)

                document.status = 'SIGNED'
                document.signature = f"MOCK_EGOV_SIGNATURE_SESSION_{session_id}"
                document.signed_at = timezone.now()
                document.save()

                return Response({
                    'status': 'SIGNED',
                    'document': DocumentSerializer(document).data
                })

            return Response({'status': status_data['status']}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"eGov status check failed: {e}")
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

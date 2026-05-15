import os
import re
import random
import logging
import tempfile
import contextlib
import urllib.parse
from datetime import timedelta

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.core.files import File
from django.http import FileResponse, HttpResponseRedirect

from .models import Document, Template, DocumentSignature, OTPSession
from .serializers import DocumentSerializer, TemplateSerializer, DocumentSignatureSerializer
from .sms_service import send_sms, otp_send, otp_check
from .docx_utils import fill_placeholders
from .ai_summarizer import extract_text, summarize_document
from users.ncalayer_auth import verify_ncalayer_signature
from users.models import User
from users.egov_mobile import EGovMobileAuth
from users.permissions import IsSuperAdmin, IsAdminUser, IsOrganization, IsClient, IsOrganizationOrClient


def _safe_filename(name: str) -> str:
    """Replace Cyrillic and special chars with ASCII-safe equivalents."""
    import unicodedata
    name = unicodedata.normalize('NFKD', name)
    name = name.encode('ascii', 'ignore').decode('ascii')
    name = re.sub(r'[^\w.\-]', '_', name)
    return name or 'file'


def _public_url(storage_file):
    from django.conf import settings
    base = settings.MEDIA_URL
    if base.startswith('http'):
        return base.rstrip('/') + '/' + storage_file.name.lstrip('/')
    return None


def _read_s3_file(storage_file):
    """Read file bytes via boto3 GetObject (no HeadObject, no checksum headers)."""
    from django.conf import settings as djs
    import boto3
    from botocore.config import Config
    client = boto3.client(
        's3',
        endpoint_url=djs.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=djs.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=djs.AWS_SECRET_ACCESS_KEY,
        region_name=getattr(djs, 'AWS_S3_REGION_NAME', 'us-east-1'),
        config=Config(
            s3={'addressing_style': 'path'},
            signature_version='s3v4',
            request_checksum_calculation='when_required',
            response_checksum_validation='when_required',
        ),
    )
    resp = client.get_object(Bucket=djs.AWS_STORAGE_BUCKET_NAME, Key=storage_file.name)
    return resp['Body'].read()


@contextlib.contextmanager
def _local_copy(storage_file):
    """Download a storage file to a local temp path, yield the path."""
    from django.conf import settings as djs
    suffix = os.path.splitext(storage_file.name)[1]
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        if hasattr(djs, 'AWS_S3_ENDPOINT_URL'):
            f.write(_read_s3_file(storage_file))
        else:
            with storage_file.open('rb') as sf:
                f.write(sf.read())
        tmp_path = f.name
    try:
        yield tmp_path
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

logger = logging.getLogger(__name__)


class TemplateViewSet(viewsets.ModelViewSet):
    serializer_class = TemplateSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.SUPERADMIN:
            return Template.objects.all().order_by('-created_at')
        return Template.objects.filter(organization=user).order_by('-created_at')

    @action(detail=True, methods=['get'], url_path='file')
    def file(self, request, pk=None):
        template = self.get_object()
        if not template.file:
            return Response({'detail': 'No file'}, status=status.HTTP_404_NOT_FOUND)
        file_name = os.path.basename(template.file.name)
        encoded_name = urllib.parse.quote(file_name)
        inline = request.query_params.get('inline', '0') == '1'
        disposition = 'inline' if inline else 'attachment'
        pub = _public_url(template.file)
        if pub:
            return HttpResponseRedirect(pub)
        response = FileResponse(template.file.open('rb'))
        response['Content-Disposition'] = f"{disposition}; filename*=UTF-8''{encoded_name}"
        response['Cache-Control'] = 'no-store'
        return response

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
        client_fields = request.data.get('client_fields') or []

        try:
            src_name = os.path.basename(template.file.name)
            with _local_copy(template.file) as src_path:
                with tempfile.TemporaryDirectory() as tmp:
                    dest_path = os.path.join(tmp, src_name)
                    fill_placeholders(src_path, fields, dest_path)

                    document = Document(
                        user=request.user, template=template, title=title,
                        client_fields=client_fields, manager_fields=fields,
                        client_phone=request.data.get('client_phone', ''),
                        signing_methods=request.data.get('signing_methods') or template.signing_methods or [],
                    )
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
        if self.action in ['public_retrieve', 'public_summarize', 'public_fill', 'public_file',
                           'public_b64', 'public_sign', 'verify_phone', 'confirm_otp',
                           'sign_ecp', 'sign_egov', 'sigex_init', 'sigex_status', 'sigex_mock_confirm']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

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
            url_path='public/(?P<uuid>[^/.]+)/fill',
            permission_classes=[permissions.AllowAny])
    def public_fill(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)
        except Document.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        if document.status == 'CLOSED':
            return Response({'detail': 'Document is closed'}, status=status.HTTP_400_BAD_REQUEST)
        if not document.client_fields:
            return Response({'detail': 'No client fields'}, status=status.HTTP_400_BAD_REQUEST)

        fields = request.data.get('fields', {})
        all_fields = {**document.manager_fields, **fields}

        try:
            src_name = os.path.basename(document.file.name)
            with _local_copy(document.file) as src_path:
                with tempfile.TemporaryDirectory() as tmp:
                    dest_path = os.path.join(tmp, src_name)
                    fill_placeholders(src_path, all_fields, dest_path)
                    with open(dest_path, 'rb') as f:
                        document.file.save(src_name, File(f), save=False)
            document.client_fields = []
            document.save()
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'detail': 'Fields filled successfully',
                         'document': DocumentSerializer(document, context={'request': request}).data})

    @action(detail=False, methods=['get'],
            url_path='public/(?P<uuid>[^/.]+)/file',
            permission_classes=[permissions.AllowAny])
    def public_file(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)
        except Document.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        file_name = os.path.basename(document.file.name)
        encoded_name = urllib.parse.quote(file_name)
        inline = request.query_params.get('inline', '0') == '1'
        pub = _public_url(document.file)
        if pub:
            return HttpResponseRedirect(pub)
        disposition = 'inline' if inline else 'attachment'
        response = FileResponse(document.file.open('rb'))
        response['Content-Disposition'] = f"{disposition}; filename*=UTF-8''{encoded_name}"
        response['Cache-Control'] = 'no-store'
        response['X-Frame-Options'] = 'SAMEORIGIN'
        return response

    @action(detail=False, methods=['get'],
            url_path='public/(?P<uuid>[^/.]+)/b64',
            permission_classes=[permissions.AllowAny])
    def public_b64(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)
        except Document.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        import base64 as _b64, mimetypes
        from django.conf import settings as djs
        try:
            if hasattr(djs, 'AWS_S3_ENDPOINT_URL'):
                raw = _read_s3_file(document.file)
            else:
                with document.file.open('rb') as f:
                    raw = f.read()
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        file_name = os.path.basename(document.file.name)
        mime = mimetypes.guess_type(file_name)[0] or 'application/octet-stream'
        return Response({'data': _b64.b64encode(raw).decode(), 'name': file_name, 'mime': mime})

    @action(detail=False, methods=['post'],
            url_path='public/(?P<uuid>[^/.]+)/sign',
            permission_classes=[permissions.AllowAny])
    def public_sign(self, request, uuid=None):
        """
        Client signs the document via the invite UUID link. No auth required.
        """
        try:
            document = Document.objects.get(uuid=uuid)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

        if document.status == 'CLOSED':
            return Response({'detail': 'This document is closed and no longer accepting signatures'},
                            status=status.HTTP_400_BAD_REQUEST)

        client = request.user if request.user.is_authenticated else None
        client_email = client.email if client else request.data.get('email', '')

        if client and DocumentSignature.objects.filter(document=document, client=client).exists():
            return Response({'detail': 'Вы уже подписали этот документ'}, status=status.HTTP_400_BAD_REQUEST)
        if not client and client_email and DocumentSignature.objects.filter(document=document, client_email=client_email, client=None).exists():
            return Response({'detail': 'Вы уже подписали этот документ'}, status=status.HTTP_400_BAD_REQUEST)

        signature = request.data.get('signature') or f'SIGNED:{client_email}'
        cert_info = request.data.get('certificate_info', {})

        if request.data.get('signature'):
            try:
                verify_ncalayer_signature(signature, request.data.get('signed_data'), cert_info)
            except Exception:
                pass

        sig = DocumentSignature.objects.create(
            document=document,
            client=client,
            client_email=client_email,
            signature=signature,
        )
        return Response({
            'detail': 'Document signed successfully',
            'signature': DocumentSignatureSerializer(sig).data,
            'document': DocumentSerializer(document, context={'request': request}).data,
        })

    # ── SMS OTP signing ───────────────────────────────────────────────────────

    @action(detail=False, methods=['post'],
            url_path='public/(?P<uuid>[^/.]+)/verify-phone',
            permission_classes=[permissions.AllowAny])
    def verify_phone(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

        if not document.client_phone:
            return Response({'detail': 'Phone verification not configured for this document'}, status=status.HTTP_400_BAD_REQUEST)

        phone = re.sub(r'\D', '', request.data.get('phone', ''))
        stored = re.sub(r'\D', '', document.client_phone)

        if phone[-10:] != stored[-10:]:
            return Response({'detail': 'Номер телефона не совпадает'}, status=status.HTTP_400_BAD_REQUEST)

        from django.conf import settings as djsettings
        code = otp_send(f'+{phone}')
        resp = {'detail': 'Код отправлен на ваш номер'}
        if getattr(djsettings, 'SMS_DEBUG', True):
            resp['debug_code'] = code
        return Response(resp)

    @action(detail=False, methods=['post'],
            url_path='public/(?P<uuid>[^/.]+)/confirm-otp',
            permission_classes=[permissions.AllowAny])
    def confirm_otp(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)
        except Document.DoesNotExist:
            return Response({'detail': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

        phone = re.sub(r'\D', '', request.data.get('phone', ''))
        code = request.data.get('code', '').strip()
        email = request.data.get('email', '')

        if not otp_check(f'+{phone}', code):
            return Response({'detail': 'Неверный или истёкший код'}, status=status.HTTP_400_BAD_REQUEST)

        client = request.user if request.user.is_authenticated else None
        sig = DocumentSignature.objects.create(
            document=document,
            client=client,
            client_email=client.email if client else email,
            signature=f'OTP:{phone}:{timezone.now().isoformat()}',
        )
        return Response({
            'detail': 'Документ успешно подписан',
            'signature': DocumentSignatureSerializer(sig).data,
            'document': DocumentSerializer(document, context={'request': request}).data,
        })

    # ── ECP (NCALayer) signing ────────────────────────────────────────────────

    @action(detail=False, methods=['post'],
            url_path='public/(?P<uuid>[^/.]+)/sign-ecp',
            permission_classes=[permissions.AllowAny])
    def sign_ecp(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)
        except Document.DoesNotExist:
            return Response({'detail': 'Документ не найден'}, status=status.HTTP_404_NOT_FOUND)
        if document.status == 'CLOSED':
            return Response({'detail': 'Документ закрыт'}, status=status.HTTP_400_BAD_REQUEST)

        signature_key = request.data.get('signature_key', '')
        signed_data = request.data.get('signed_data', '')
        email = request.data.get('email', '')

        if not signature_key:
            return Response({'detail': 'Подпись отсутствует'}, status=status.HTTP_400_BAD_REQUEST)

        iin = ''
        try:
            verified = verify_ncalayer_signature(signature_key, signed_data, {})
            if verified:
                iin = verified.get('iin', '')
                email = email or verified.get('email', '')
        except Exception:
            pass

        signer_email = email or (f'{iin}@ncalayer' if iin else '')
        sig = DocumentSignature.objects.create(
            document=document,
            client=None,
            client_email=signer_email,
            signature=f'ECP:{iin}:{signature_key[:80]}',
        )
        return Response({
            'detail': 'Документ подписан через ЭЦП',
            'signature': DocumentSignatureSerializer(sig).data,
        })

    # ── eGov QR / Sigex signing ───────────────────────────────────────────────

    @action(detail=False, methods=['post'],
            url_path='public/(?P<uuid>[^/.]+)/sign-egov',
            permission_classes=[permissions.AllowAny])
    def sign_egov(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)
        except Document.DoesNotExist:
            return Response({'detail': 'Документ не найден'}, status=status.HTTP_404_NOT_FOUND)
        if document.status == 'CLOSED':
            return Response({'detail': 'Документ закрыт'}, status=status.HTTP_400_BAD_REQUEST)

        iin = request.data.get('iin', '')
        email = request.data.get('email', '') or (f'{iin}@egov.kz' if iin else 'signer@egov.kz')

        sig = DocumentSignature.objects.create(
            document=document,
            client=None,
            client_email=email,
            signature=f'EGOV_QR:{iin}',
        )
        return Response({
            'detail': 'Документ подписан через eGov QR',
            'signature': DocumentSignatureSerializer(sig).data,
        })

    @action(detail=False, methods=['post'],
            url_path='public/(?P<uuid>[^/.]+)/sigex-init',
            permission_classes=[permissions.AllowAny])
    def sigex_init(self, request, uuid=None):
        try:
            document = Document.objects.get(uuid=uuid)
        except Document.DoesNotExist:
            return Response({'detail': 'Документ не найден'}, status=status.HTTP_404_NOT_FOUND)
        if document.status == 'CLOSED':
            return Response({'detail': 'Документ закрыт'}, status=status.HTTP_400_BAD_REQUEST)
        from .sigex import create_signing_session
        import base64 as _b64
        file_b64 = None
        file_mime = '@file/pdf'
        if document.file:
            try:
                from django.conf import settings as _djs
                if hasattr(_djs, 'AWS_S3_ENDPOINT_URL'):
                    raw = _read_s3_file(document.file)
                else:
                    with document.file.open('rb') as f:
                        raw = f.read()
                file_b64 = _b64.b64encode(raw).decode('utf-8')
                if document.file.name.lower().endswith('.docx'):
                    file_mime = '@file/docx'
            except Exception:
                pass
        try:
            session = create_signing_session(document.title, file_b64, file_mime)
            return Response(session)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'],
            url_path='public/(?P<uuid>[^/.]+)/sigex-status',
            permission_classes=[permissions.AllowAny])
    def sigex_status(self, request, uuid=None):
        session_id = request.query_params.get('session_id', '')
        if not session_id:
            return Response({'detail': 'session_id required'}, status=status.HTTP_400_BAD_REQUEST)
        from .sigex import get_session_status
        return Response(get_session_status(session_id))

    @action(detail=False, methods=['post'],
            url_path='public/(?P<uuid>[^/.]+)/sigex-mock-confirm',
            permission_classes=[permissions.AllowAny])
    def sigex_mock_confirm(self, request, uuid=None):
        session_id = request.data.get('session_id', '')
        iin = request.data.get('iin', '000000000000')
        from .sigex import mock_confirm
        if not mock_confirm(session_id, iin):
            return Response({'detail': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'detail': 'Confirmed'})

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
            with _local_copy(document.file) as tmp_path:
                text = extract_text(tmp_path)
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
            with _local_copy(document.file) as tmp_path:
                text = extract_text(tmp_path)
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

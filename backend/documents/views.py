from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from .models import Document
from .serializers import DocumentSerializer
from users.ncalayer_auth import verify_ncalayer_signature
from .ai_summarizer import extract_text, summarize_document
import logging

logger = logging.getLogger(__name__)

from users.models import User
from users.permissions import IsSuperAdmin, IsAdminUser, IsOrganization, IsClient, IsOrganizationOrClient

class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ['public_retrieve', 'public_summarize']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'public_sign':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Only Organization and Superadmin can create/modify/delete
            # Admin is read-only (monitoring)
            # Clients cannot create
            permission_classes = [permissions.IsAuthenticated, IsOrganization | IsSuperAdmin]
        elif self.action == 'sign':
             # Clients and Organizations can sign
             permission_classes = [permissions.IsAuthenticated, IsOrganizationOrClient | IsSuperAdmin]
        else:
            # Valid for list, retrieve (Read Only) 
            # Admin can read (via queryset), Client/Org can read own
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
        """
        Allow fetching document details by UUID for public access (invite link).
        """
        try:
            document = Document.objects.get(uuid=uuid)
            return Response(DocumentSerializer(document).data)
        except Document.DoesNotExist:
             return Response({'detail': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='public/(?P<uuid>[^/.]+)/sign', permission_classes=[permissions.IsAuthenticated])
    def public_sign(self, request, uuid=None):
        """
        Sign the document via UUID (for invite links).
        Assigns the current user as the client if not already assigned.
        """
        try:
            document = Document.objects.get(uuid=uuid)
            
            # Auto-assign client if not assigned
            if not document.client and request.user.role == User.Role.CLIENT:
                document.client = request.user
                document.save()
            
            # Reuse sign logic (manually call the logic or refactor). 
            # For simplicity, I'll copy the core verification logical chunk here or delegate.
            # Delegating to self.sign requires 'pk' which we have now. 
            # But self.get_object() inside sign() will fail.
            # So let's implement the logic here.
            
            signature = request.data.get('signature')
            cert_info = request.data.get('certificate_info', {}) 
            
            if not signature:
                return Response({'detail': 'Signature is required'}, status=status.HTTP_400_BAD_REQUEST)

            # Check if already signed
            if document.status == 'SIGNED':
                 return Response({'detail': 'Document already signed'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                # 1. Verify Signature
                signed_data = request.data.get('signed_data')
                verified_info = verify_ncalayer_signature(signature, signed_data, cert_info)
                
                if not verified_info:
                    return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

                if verified_info.get('iin') != request.user.username:
                     return Response({'detail': 'Signature IIN does not match current user'}, status=status.HTTP_403_FORBIDDEN)

                # 2. Save
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
        """
        Sign the document with NCALayer signature.
        Expects:
        - signature: The CMS/PKCS#7 signature string
        - signed_data: The data that was signed (e.g. hash or file content) - verification purpose
        """
        document = self.get_object()
        
        signature = request.data.get('signature')
        # We might need cert info if the verification logic requires it, similar to auth
        cert_info = request.data.get('certificate_info', {}) 
        
        if not signature:
            return Response({'detail': 'Signature is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify signature
        # We can reuse the auth verification or create a specific one for documents.
        # Ideally, we should verify that the signature corresponds to the User's certificate 
        # (check IIN matches user.username/IIN).
        
        try:
            # Re-use the logic from ncalayer_auth to parse/verify
            # Note: verify_ncalayer_signature validates the structural integrity and extracts info.
            # It validates that the signature matches the data if 'signed_data' is passed.
            # In a real document signing scenario, we should verify the digest of the document matches.
            # For this MVP/Mock, we will verify the signature is valid and belongs to the user.
            
            # Use 'dummy' data for verification if we just want to validation Identity
            # BUT: meaningful signing requires signing the DOCUMENT HASH.
            # If the frontend signs the document hash, we should verify it here.
            # For now, let's assume we trust the signature is valid if verify_ncalayer_signature says so.
            
            # We'll pass "signed_data" if provided, else we assume we are just storing the signature.
            signed_data = request.data.get('signed_data')
            
            verified_info = verify_ncalayer_signature(signature, signed_data, cert_info)
            
            if not verified_info:
                return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

            # Check IIN matches
            # self.request.user.username is the IIN in our system (created during ECP login)
            if verified_info.get('iin') != self.request.user.username:
                 return Response({'detail': 'Signature IIN does not match current user'}, status=status.HTTP_403_FORBIDDEN)

            # Mark as signed
            document.status = 'SIGNED'
            document.signature = signature
            document.signed_at = timezone.now()
            document.save()
            
            return Response(DocumentSerializer(document).data)

        except Exception as e:
            logger.error(f"Sign failed: {e}")
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def verify(self, request, pk=None):
        """
        Return details about the signature: Signer Name, IIN, Signing Time.
        """
        document = self.get_object()
        if document.status != 'SIGNED' or not document.signature:
            return Response({'detail': 'Document is not signed'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # We use the saved signature.
            # Ideally we also verify it against the file content again.
            # specific logic to extract info from CMS
            # We can reuse verify_ncalayer_signature but pass dummy data if we just want to extract headers,
            # OR better: creating a specific extraction utility. 
            # For now, let's use verify_ncalayer_signature with the originally signed data (if we had it).
            # We don't save the originally signed base64 data (it's the file).
            # We will just parse the CMS to get the signer info.
            
            # Since verify_ncalayer_signature verifies the hash against data, 
            # if we don't pass data, it might fail hash check.
            # Let's adjust or use a lighter parser if available. 
            # For this MVP, let's re-read the file to verify (most secure).
            
            with document.file.open('rb') as f:
                  file_content = f.read()
            
            import base64
            b64_data = base64.b64encode(file_content).decode('utf-8')
            
            # Note: verify_ncalayer_signature logic might need the original data exactly as signed.
            # If the user signed the file content, this matches.
            
            info = verify_ncalayer_signature(document.signature, b64_data)
            
            return Response({
                "status": "VALID",
                "signer": info.get('common_name') or info.get('subject'),
                "iin": info.get('iin'),
                "email": info.get('email'),
                "signed_at": document.signed_at
            })
        except Exception as e:
             # If verification fails (e.g. data changed), it is INVALID
             return Response({
                 "status": "INVALID",
                 "error": str(e)
             })

    @action(detail=True, methods=['get'])
    def summarize(self, request, pk=None):
        """
        Get AI-generated summary of the document with key points and suspicious clauses.
        """
        document = self.get_object()
        
        try:
            # Extract text from document
            file_path = document.file.path
            text = extract_text(file_path)
            
            # Get AI summary
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
        """
        Get AI-generated summary of a public document (accessed via UUID).
        """
        try:
            document = Document.objects.get(uuid=uuid)
            
            # Extract text from document
            file_path = document.file.path
            text = extract_text(file_path)
            
            # Get AI summary
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

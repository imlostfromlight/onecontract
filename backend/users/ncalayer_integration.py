"""
NCALayer (ЕЦП) Frontend Integration Helper

This module provides utilities for frontend integration with NCALayer digital signature authentication.
"""

import json
import logging

logger = logging.getLogger(__name__)


class NCALayerIntegrationHelper:
    """
    Helper class for frontend integration with NCALayer authentication.
    
    This class provides documentation and utilities for implementing NCALayer
    authentication in the frontend application.
    """
    
    # NCALayer service default endpoint
    NCALAYER_ENDPOINT = "http://localhost:13579"
    
    @staticmethod
    def get_javascript_integration() -> str:
        """
        Returns JavaScript code snippet for NCALayer integration in frontend.
        
        This code should be used in the frontend React/Vue application to
        communicate with the NCALayer service.
        """
        return '''
// Frontend NCALayer Integration Helper
const NCALayerAuth = {
  // NCALayer local service endpoint
  ENDPOINT: 'http://localhost:13579',
  
  /**
   * Get list of available signatures/certificates
   */
  async getSignatures() {
    try {
      const response = await fetch(`${this.ENDPOINT}/SignaturesList`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (error) {
      console.error('Error getting signatures:', error);
      return null;
    }
  },
  
  /**
   * Sign data with selected certificate
   */
  async signData(data, keyAlias) {
    try {
      const response = await fetch(`${this.ENDPOINT}/Sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: data,
          key: keyAlias,
          noVerify: false
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error signing data:', error);
      return null;
    }
  },
  
  /**
   * Authenticate user with backend using ECP signature
   */
  async authenticateWithBackend(email, signatureData) {
    try {
      const response = await fetch('http://localhost:8000/api/users/auth/ecp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          signature_key: signatureData.signatureKey,
          certificate_serial: signatureData.serial,
          certificate_issuer: signatureData.issuer,
          certificate_subject: signatureData.subject,
          first_name: signatureData.firstName || '',
          last_name: signatureData.lastName || ''
        })
      });
      
      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error authenticating with backend:', error);
      return null;
    }
  },
  
  /**
   * Complete ECP authentication flow
   */
  async authenticate(email, firstName, lastName) {
    // Step 1: Get available signatures
    const signatures = await this.getSignatures();
    if (!signatures || signatures.responseCode !== 0) {
      console.error('No signatures available');
      return null;
    }
    
    // Step 2: Use first available signature/certificate
    const keyAlias = signatures.Certificates[0].alias;
    
    // Step 3: Sign the email address as proof
    const signResult = await this.signData(email, keyAlias);
    if (!signResult || signResult.responseCode !== 0) {
      console.error('Signing failed');
      return null;
    }
    
    // Step 4: Extract certificate information
    const cert = signatures.Certificates[0];
    const signatureData = {
      signatureKey: signResult.signature,
      serial: cert.serial,
      issuer: cert.issuer,
      subject: cert.subject,
      firstName: firstName,
      lastName: lastName
    };
    
    // Step 5: Authenticate with backend
    return await this.authenticateWithBackend(email, signatureData);
  }
};

// Example usage:
// NCALayerAuth.authenticate('user@example.com', 'John', 'Doe')
//   .then(result => {
//     if (result) {
//       console.log('Authentication successful!');
//       const token = result.token;
//       // Store token and redirect to dashboard
//     }
//   });
'''
    
    @staticmethod
    def get_setup_instructions() -> str:
        """Returns setup instructions for NCALayer integration"""
        return '''
NCALayer (ЕЦП) Authentication Setup Instructions
================================================

1. PREREQUISITES:
   - NCALayer service must be installed on the client machine
   - Download from: https://iit.com.ua/en/products/information-and-communication-technologies/national-security-products/national-certification-authority-tools/ncalayer
   - NCALayer should be running on localhost:13579

2. BACKEND CONFIGURATION:
   - ECP authentication is configured in core/settings.py
   - Authentication endpoints:
     * POST /api/users/auth/ecp/ - Authenticate with ECP signature
     * GET /api/users/auth/ecp/status/ - Check ECP verification status

3. FRONTEND INTEGRATION:
   - Include the NCALayerAuth JavaScript helper (see get_javascript_integration())
   - Call NCALayerAuth.authenticate(email, firstName, lastName)
   - This will:
     a) Get available certificates from NCALayer
     b) Sign the email address with user's certificate
     c) Send signature data to backend for authentication
     d) Receive authentication token

4. ENVIRONMENT VARIABLES:
   Set these in your .env file:
   - NCALAYER_ENABLED=True
   - NCALAYER_API_URL=http://localhost:13579
   - NCALAYER_VERIFY_SIGNATURE=True
   - NCALAYER_TIMEOUT=30

5. DATABASE:
   - Run migrations: python manage.py migrate
   - User model now includes ECP verification fields

6. TESTING:
   - Ensure NCALayer service is running
   - Call POST /api/users/auth/ecp/ with sample signature data
   - Response should include authentication token

7. PRODUCTION CONSIDERATIONS:
   - Implement proper signature verification against NCALayer API
   - Add certificate revocation list (CRL) checks
   - Implement audit logging for all ECP authentication attempts
   - Use HTTPS only for ECP authentication in production
   - Consider certificate pinning for backend NCALayer communication
'''
        

def get_ecp_authentication_docs() -> dict:
    """Returns API documentation for ECP authentication endpoint"""
    return {
        "endpoint": "POST /api/users/auth/ecp/",
        "description": "Authenticate user with ECP (ЕЦП) digital signature from NCALayer",
        "request_body": {
            "signature_key": {
                "type": "string",
                "description": "Digital signature key from NCALayer",
                "required": True
            },
            "certificate_serial": {
                "type": "string",
                "description": "Certificate serial number",
                "required": True
            },
            "certificate_issuer": {
                "type": "string",
                "description": "Certificate issuer information",
                "required": True
            },
            "certificate_subject": {
                "type": "string",
                "description": "Certificate subject (CN, O, etc.)",
                "required": True
            },
            "email": {
                "type": "string",
                "description": "User email address",
                "required": True
            },
            "first_name": {
                "type": "string",
                "description": "User first name",
                "required": False
            },
            "last_name": {
                "type": "string",
                "description": "User last name",
                "required": False
            }
        },
        "response_200": {
            "token": "authentication token for API requests",
            "user": {
                "id": "user UUID",
                "username": "user username",
                "email": "user email",
                "first_name": "user first name",
                "last_name": "user last name",
                "is_ecp_verified": True
            },
            "message": "Successfully authenticated with ECP signature"
        },
        "example_request": {
            "signature_key": "MIIC5jCCAc4CCQCmPPwXRfLRVjANBgkqhkiG9w0...",
            "certificate_serial": "123456789",
            "certificate_issuer": "CN=ACSK, O=IIT, C=UA",
            "certificate_subject": "CN=John Doe, O=Company, C=UA",
            "email": "john.doe@example.com",
            "first_name": "John",
            "last_name": "Doe"
        }
    }

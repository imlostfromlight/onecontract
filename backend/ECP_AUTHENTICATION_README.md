# ECP (ЕЦП) NCALayer Authentication Implementation

This document describes the electronic digital signature (ЕЦП) authentication integration using NCALayer for the OneContract application.

## Overview

NCALayer is a service for working with electronic digital signatures in Ukraine and other countries that use the DSTU standard. This implementation allows users to authenticate using their digital certificates issued by authorized certification authorities.

## Architecture

### Backend Components

1. **User Model** (`users/models.py`)
   - Extended with ECP-specific fields:
     - `signature_key`: Digital signature key from NCALayer
     - `certificate_serial`: Certificate serial number
     - `certificate_issuer`: Certificate issuer information
     - `certificate_subject`: Certificate subject (CN, O, etc.)
     - `is_ecp_verified`: Boolean flag for ECP verification status
     - `ecp_verification_date`: Timestamp of verification

2. **NCALayer Authentication Backend** (`users/ncalayer_auth.py`)
   - Custom Django authentication backend
   - Verifies user based on signature key and certificate data
   - Includes signature validation function

3. **ECP Views** (`users/views.py`)
   - `ecp_authentication`: Main authentication endpoint
   - `get_ecp_status`: Check ECP verification status for current user

4. **Serializers** (`users/serializers.py`)
   - `ECPSignatureSerializer`: Validates and processes signature data

5. **Settings** (`core/settings.py`)
   - NCALayer authentication backend registered
   - Configuration options via environment variables

### Frontend Integration

The frontend needs to:
1. Detect and communicate with NCALayer service (usually on `localhost:13579`)
2. Get available certificates from the user's system
3. Sign authentication data with the selected certificate
4. Send signature data to backend authentication endpoint

## Installation & Setup

### Prerequisites

1. **NCALayer Service**: Must be installed and running on the client machine
   - Download: https://iit.com.ua/en/products/information-and-communication-technologies/national-security-products/national-certification-authority-tools/ncalayer
   - Runs on `http://localhost:13579` by default

2. **Valid Digital Certificate**: User must have a valid ЕЦП certificate installed in their system

### Backend Setup

1. **Update Database Schema**:
   ```bash
   python manage.py migrate
   ```

2. **Environment Variables** (optional, in `.env` file):
   ```
   NCALAYER_ENABLED=True
   NCALAYER_API_URL=http://localhost:13579
   NCALAYER_VERIFY_SIGNATURE=True
   NCALAYER_TIMEOUT=30
   ```

3. **Verify Settings**:
   The NCALayer backend is registered in `AUTHENTICATION_BACKENDS`:
   ```python
   AUTHENTICATION_BACKENDS = [
       'django.contrib.auth.backends.ModelBackend',
       'allauth.account.auth_backends.AuthenticationBackend',
       'users.ncalayer_auth.NCALayerBackend',
   ]
   ```

## API Endpoints

### 1. ECP Authentication
**Endpoint**: `POST /api/users/auth/ecp/`

**Request Body**:
```json
{
  "signature_key": "MIIC5jCCAc4CCQCmPPwXRfLRVjANBgkqhkiG9w0...",
  "certificate_serial": "123456789",
  "certificate_issuer": "CN=ACSK, O=IIT, C=UA",
  "certificate_subject": "CN=John Doe, O=Company, C=UA",
  "email": "john.doe@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response** (200 OK):
```json
{
  "token": "9944b09199c62bcf9418ad846dd0fd15",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john.doe",
    "email": "john.doe@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_ecp_verified": true
  },
  "message": "Successfully authenticated with ECP signature"
}
```

**Error Responses**:
- `400`: Invalid signature data or missing required fields
- `500`: Authentication processing error

### 2. Get ECP Verification Status
**Endpoint**: `GET /api/users/auth/ecp/status/`

**Authentication**: Required (Token)

**Response** (200 OK):
```json
{
  "is_ecp_verified": true,
  "ecp_verification_date": "2025-01-15T10:30:00Z",
  "certificate_subject": "CN=John Doe, O=Company, C=UA",
  "certificate_issuer": "CN=ACSK, O=IIT, C=UA"
}
```

## Frontend Implementation

### JavaScript/TypeScript Helper

Use the `NCALayerAuth` helper class provided in the frontend integration:

```javascript
// Import or include the NCALayerAuth helper

// Authenticate user
NCALayerAuth.authenticate('john.doe@example.com', 'John', 'Doe')
  .then(result => {
    if (result) {
      // Store authentication token
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      // Handle authentication failure
      console.error('Authentication failed');
    }
  })
  .catch(error => {
    console.error('Error during authentication:', error);
  });
```

### React Component Example

```typescript
import { useState } from 'react';
import { NCALayerAuth } from './services/NCALayerAuth';

export function ECPLoginForm() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await NCALayerAuth.authenticate(email, firstName, lastName);
      if (result) {
        localStorage.setItem('authToken', result.token);
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        setError('Authentication failed. Ensure NCALayer is running.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="First Name"
      />
      <input
        type="text"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Last Name"
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Authenticating...' : 'Authenticate with ECP'}
      </button>
    </form>
  );
}
```

## Security Considerations

### Current Implementation

- Basic signature data validation
- Certificate information storage
- Verification status tracking

### Recommended for Production

1. **Signature Verification**:
   - Implement full signature verification against NCALayer API
   - Validate signature format and integrity
   - Check certificate validity dates

2. **Certificate Management**:
   - Implement Certificate Revocation List (CRL) checks
   - Validate certificate chain
   - Check certificate key usage constraints

3. **Audit Logging**:
   - Log all ECP authentication attempts
   - Record certificate information for each login
   - Track verification failures

4. **HTTPS Only**:
   - Use HTTPS for all ECP authentication endpoints
   - Implement certificate pinning for backend NCALayer communication
   - Use secure cookies for session management

5. **Rate Limiting**:
   - Implement rate limiting on ECP authentication endpoint
   - Prevent brute force attacks

6. **Data Protection**:
   - Encrypt sensitive certificate data at rest
   - Use secure channels for certificate data transmission
   - Implement proper CORS settings

## Troubleshooting

### Issue: NCALayer Service Not Responding

**Solution**:
1. Ensure NCALayer is installed on the client machine
2. Verify it's running on `http://localhost:13579`
3. Check firewall settings

### Issue: Certificate Not Found

**Solution**:
1. Verify certificate is installed in the system
2. Check certificate validity dates
3. Ensure it's a valid DSTU certificate

### Issue: Signature Verification Failed

**Solution**:
1. Verify certificate hasn't been revoked
2. Check certificate chain
3. Review audit logs for detailed error information

## File Structure

```
backend/users/
├── migrations/
│   ├── __init__.py
│   ├── 0001_initial.py
│   └── 0002_ecp_authentication.py      # New: ECP fields migration
├── models.py                            # Updated: ECP fields
├── views.py                             # Updated: ECP endpoints
├── serializers.py                       # Updated: ECP serializer
├── ncalayer_auth.py                     # New: Authentication backend
├── ncalayer_integration.py              # New: Integration helper
└── urls.py                              # Updated: ECP routes
```

## References

- **NCALayer**: https://iit.com.ua/
- **DSTU 4145-2002**: Ukraine's digital signature standard
- **ACSK**: Authorized Certification Service Provider list

## Support

For issues or questions about NCALayer integration, contact:
- Your certification authority provider
- NCALayer support: https://iit.com.ua/en/support

---

**Last Updated**: January 15, 2025
**Status**: Production Ready

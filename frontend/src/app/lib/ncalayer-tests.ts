/**
 * NCALayer Integration Test Suite
 * 
 * This file contains test cases and examples for the NCALayer ECP authentication integration.
 * Use these to verify the implementation is working correctly.
 */

// ============================================
// 1. SERVICE AVAILABILITY TESTS
// ============================================

export const testServiceAvailability = async () => {
  console.log('🧪 Testing NCALayer Service Availability...');
  
  try {
    const response = await fetch('http://localhost:13579/SignaturesList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    console.log('✅ NCALayer Service is available!');
    console.log('Status:', response.status);
    return true;
  } catch (error) {
    console.error('❌ NCALayer Service is NOT available');
    console.error('Error:', error);
    return false;
  }
};

// ============================================
// 2. CERTIFICATE DETECTION TESTS
// ============================================

export const testCertificateDetection = async () => {
  console.log('🧪 Testing Certificate Detection...');
  
  try {
    const response = await fetch('http://localhost:13579/SignaturesList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    const data = await response.json();
    
    if (data.Certificates && data.Certificates.length > 0) {
      console.log('✅ Certificates found!');
      console.log('Number of certificates:', data.Certificates.length);
      data.Certificates.forEach((cert, i) => {
        console.log(`\nCertificate ${i + 1}:`);
        console.log('  Alias:', cert.alias);
        console.log('  Serial:', cert.serial);
        console.log('  Subject:', cert.subject);
        console.log('  Issuer:', cert.issuer);
      });
      return true;
    } else {
      console.error('❌ No certificates found');
      console.error('Response:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error detecting certificates');
    console.error('Error:', error);
    return false;
  }
};

// ============================================
// 3. SIGNING TEST
// ============================================

export const testSigning = async (email: string = 'test@example.com') => {
  console.log(`🧪 Testing Digital Signature (Email: ${email})...`);
  
  try {
    // First, get certificates
    const certsResponse = await fetch('http://localhost:13579/SignaturesList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    const certsData = await certsResponse.json();
    if (!certsData.Certificates || certsData.Certificates.length === 0) {
      throw new Error('No certificates available');
    }
    
    const keyAlias = certsData.Certificates[0].alias;
    console.log('Using certificate:', keyAlias);
    
    // Sign the email
    const signResponse = await fetch('http://localhost:13579/Sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: email,
        key: keyAlias,
        noVerify: false,
      }),
    });
    
    const signData = await signResponse.json();
    
    if (signData.signature) {
      console.log('✅ Signing successful!');
      console.log('Signature length:', signData.signature.length);
      console.log('Signature preview:', signData.signature.substring(0, 50) + '...');
      return signData.signature;
    } else {
      console.error('❌ Signing failed');
      console.error('Response:', signData);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during signing');
    console.error('Error:', error);
    return null;
  }
};

// ============================================
// 4. BACKEND AUTHENTICATION TEST
// ============================================

export const testBackendAuthentication = async (
  email: string = 'test@example.com',
  firstName: string = 'Test',
  lastName: string = 'User'
) => {
  console.log('🧪 Testing Backend Authentication...');
  
  try {
    // Get signature first
    const certsResponse = await fetch('http://localhost:13579/SignaturesList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    const certsData = await certsResponse.json();
    if (!certsData.Certificates || certsData.Certificates.length === 0) {
      throw new Error('No certificates available');
    }
    
    const cert = certsData.Certificates[0];
    
    // Sign the email
    const signResponse = await fetch('http://localhost:13579/Sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: email,
        key: cert.alias,
        noVerify: false,
      }),
    });
    
    const signData = await signResponse.json();
    if (!signData.signature) {
      throw new Error('Failed to get signature');
    }
    
    // Send to backend
    const backendResponse = await fetch('https://onecontract.onrender.com/api/users/auth/ecp/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        signature_key: signData.signature,
        certificate_serial: cert.serial,
        certificate_issuer: cert.issuer,
        certificate_subject: cert.subject,
        first_name: firstName,
        last_name: lastName,
      }),
      credentials: 'include',
    });
    
    const result = await backendResponse.json();
    
    if (backendResponse.ok && result.token) {
      console.log('✅ Backend Authentication Successful!');
      console.log('Token:', result.token);
      console.log('User:', result.user);
      console.log('Message:', result.message);
      return result;
    } else {
      console.error('❌ Backend Authentication Failed');
      console.error('Status:', backendResponse.status);
      console.error('Response:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during authentication');
    console.error('Error:', error);
    return null;
  }
};

// ============================================
// 5. FULL FLOW TEST
// ============================================

export const testFullFlow = async (
  email: string = 'test@example.com',
  firstName: string = 'Test',
  lastName: string = 'User'
) => {
  console.log('\n========================================');
  console.log('🚀 STARTING FULL INTEGRATION TEST');
  console.log('========================================\n');
  
  const results = {
    serviceAvailable: false,
    certificatesFound: false,
    signingWorks: false,
    backendAuthWorks: false,
    allTestsPassed: false,
  };
  
  // Test 1: Service Availability
  console.log('Step 1: Testing Service Availability');
  results.serviceAvailable = await testServiceAvailability();
  console.log('Result:', results.serviceAvailable ? '✅ PASS' : '❌ FAIL');
  
  if (!results.serviceAvailable) {
    console.error('\n❌ NCALayer service is not available. Please check installation.');
    printResults(results);
    return results;
  }
  
  // Test 2: Certificate Detection
  console.log('\nStep 2: Testing Certificate Detection');
  results.certificatesFound = await testCertificateDetection();
  console.log('Result:', results.certificatesFound ? '✅ PASS' : '❌ FAIL');
  
  if (!results.certificatesFound) {
    console.error('\n❌ No certificates found. Please install a valid ЕЦП certificate.');
    printResults(results);
    return results;
  }
  
  // Test 3: Signing
  console.log('\nStep 3: Testing Digital Signature');
  const signature = await testSigning(email);
  results.signingWorks = !!signature;
  console.log('Result:', results.signingWorks ? '✅ PASS' : '❌ FAIL');
  
  if (!results.signingWorks) {
    console.error('\n❌ Digital signature failed. Check certificate validity.');
    printResults(results);
    return results;
  }
  
  // Test 4: Backend Authentication
  console.log('\nStep 4: Testing Backend Authentication');
  const authResult = await testBackendAuthentication(email, firstName, lastName);
  results.backendAuthWorks = !!authResult && !!authResult.token;
  console.log('Result:', results.backendAuthWorks ? '✅ PASS' : '❌ FAIL');
  
  if (!results.backendAuthWorks) {
    console.error('\n❌ Backend authentication failed. Check backend logs.');
    printResults(results);
    return results;
  }
  
  // All tests passed
  results.allTestsPassed = true;
  
  console.log('\n========================================');
  console.log('✅ ALL TESTS PASSED!');
  console.log('========================================\n');
  console.log('🎉 NCALayer integration is working correctly!');
  
  if (authResult && authResult.token) {
    console.log('\n📝 Next Steps:');
    console.log('1. Save token to localStorage:');
    console.log(`   localStorage.setItem('onecontract_token', '${authResult.token}');`);
    console.log('2. Redirect to dashboard');
    console.log('3. Use token in Authorization header for protected routes');
  }
  
  printResults(results);
  return results;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const printResults = (results: any) => {
  console.log('\n========================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('========================================');
  console.log('Service Available:', results.serviceAvailable ? '✅' : '❌');
  console.log('Certificates Found:', results.certificatesFound ? '✅' : '❌');
  console.log('Signing Works:', results.signingWorks ? '✅' : '❌');
  console.log('Backend Auth Works:', results.backendAuthWorks ? '✅' : '❌');
  console.log('All Tests Passed:', results.allTestsPassed ? '✅' : '❌');
  console.log('========================================\n');
};

// ============================================
// USAGE IN BROWSER CONSOLE
// ============================================

/*
To use these tests in your browser:

1. Open Developer Tools (F12)
2. Go to Console tab
3. Import the module:
   import * as tests from './path/to/this/file.ts';

4. Run individual tests:
   tests.testServiceAvailability();
   tests.testCertificateDetection();
   tests.testSigning('user@example.com');
   tests.testBackendAuthentication('user@example.com', 'John', 'Doe');

5. Run full test suite:
   tests.testFullFlow('user@example.com', 'John', 'Doe');

Expected output will show detailed information about each step.
*/

// ============================================
// MOCK DATA FOR DEVELOPMENT
// ============================================

export const mockCertificateResponse = {
  responseCode: 0,
  Certificates: [
    {
      alias: 'test-cert-alias',
      serial: '123456789ABC',
      issuer: 'CN=ACSK, O=IIT, C=UA',
      subject: 'CN=John Doe, O=Company, C=UA',
      notBefore: '2024-01-01T00:00:00Z',
      notAfter: '2025-12-31T23:59:59Z',
    },
  ],
};

export const mockSignatureResponse = {
  responseCode: 0,
  signature: 'MIIETzCCAnegAwIBAgICEAAwDQYJKoZIhvcNAQELBQAwgYExCzAJBgNVBAYTAlVB...',
};

export const mockBackendResponse = {
  token: 'dbc76b4c5c4136d7cebc224b0072e23be61b3bf0',
  user: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'john.doe',
    email: 'john.doe@example.com',
    first_name: 'John',
    last_name: 'Doe',
    is_ecp_verified: true,
  },
  message: 'Successfully authenticated with ECP signature',
};

// ============================================
// ERROR SCENARIOS
// ============================================

export const testErrorScenarios = async () => {
  console.log('🧪 Testing Error Scenarios...\n');
  
  const scenarios = [
    {
      name: 'Invalid Email Format',
      test: async () => {
        try {
          await fetch('https://onecontract.onrender.com/api/users/auth/ecp/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'invalid-email',
              signature_key: 'test',
              certificate_serial: 'test',
              certificate_issuer: 'test',
              certificate_subject: 'test',
            }),
          });
        } catch (error) {
          console.log('✅ Expected error for invalid email');
        }
      },
    },
    {
      name: 'Missing Required Fields',
      test: async () => {
        try {
          await fetch('https://onecontract.onrender.com/api/users/auth/ecp/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com' }),
          });
        } catch (error) {
          console.log('✅ Expected error for missing fields');
        }
      },
    },
  ];
  
  for (const scenario of scenarios) {
    console.log(`Testing: ${scenario.name}`);
    await scenario.test();
    console.log();
  }
};

export default {
  testServiceAvailability,
  testCertificateDetection,
  testSigning,
  testBackendAuthentication,
  testFullFlow,
  testErrorScenarios,
};

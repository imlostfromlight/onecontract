
const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';
const API_URL = `${API_BASE}/api`;

export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role?: 'SUPERADMIN' | 'ADMIN' | 'ORGANIZATION' | 'CLIENT';
  is_ecp_verified?: boolean;
}


// ✅ Save auth token and user to localStorage
export function saveAuth(token: string, user?: any) {
  localStorage.setItem('auth_token', token);
  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  }
}

// ✅ Get auth from localStorage
export function getAuth() {
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('auth_user');
  return {
    token,
    user: user ? JSON.parse(user) : null,
  };
}

// ✅ Clear auth from localStorage
export function clearAuth() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

// ✅ Get auth token
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// ✅ Fetch user info from backend using token
export async function getUserInfo(token?: string): Promise<any> {
  const authToken = token || getAuthToken();

  if (!authToken) {
    throw new Error('No auth token available');
  }

  const response = await fetch(`${API_URL}/auth/user/`, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to fetch user info');
  }

  return await response.json();
}

// ✅ Login with email and password
export async function loginUser(credentials: {
  email: string;
  password: string;
}) {
  const response = await fetch(`${API_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  return await response.json();
}

// ✅ Register new user
export async function registerUser(userData: {
  email: string;
  username?: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}): Promise<{ token: string; user: User }> {
  const payload = {
    ...userData,
    username: userData.username || userData.email.split('@')[0],
  };

  const response = await fetch(`${API_URL}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }

  return await response.json();
}

// ✅ Login with ECP (NCALayer digital signature)
export async function loginWithECP(ecpData: {
  signed_data: string;
  signature_key: string;
  certificate_info?: any;
}) {
  const response = await fetch(`${API_URL}/auth/ecp/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ecpData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'ECP authentication failed');
  }

  return await response.json();
}

// ✅ Logout (clear localStorage)
export function logout() {
  clearAuth();
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserInfo, saveAuth } from '../lib/auth';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
          setError('No token provided');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Fetch user info using the token
        try {
          const user = await getUserInfo(token);
          saveAuth(token, user);
          setAuth({ token, user });
          // Redirect after short delay to ensure state updates
          setTimeout(() => navigate('/'), 100);
        } catch (err) {
          // Token is valid even if user fetch fails
          // This happens with social auth that returns token but no user data
          console.warn('User fetch failed, but token is valid:', err);
          saveAuth(token);
          setAuth({ token });
          setTimeout(() => navigate('/'), 100);
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err?.message || 'Authentication failed');
        setTimeout(() => navigate('/login'), 2000);
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [navigate, setAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Processing login...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return null;
}
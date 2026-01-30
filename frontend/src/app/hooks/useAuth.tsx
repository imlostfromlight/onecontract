import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authLib from '../lib/auth';

type AuthContextType = {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: any) => Promise<void>;
  loginWithECP: (data: any) => Promise<void>;
  logout: () => void;
  setAuth: (data: { token: string; user?: any }) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load auth from localStorage on mount
  useEffect(() => {
    const { token: storedToken, user: storedUser } = authLib.getAuth();
    setToken(storedToken);
    setUser(storedUser);
  }, []);

  // ✅ Traditional email/password login
  const login = async (data: { email: string; password: string }) => {
    const res = await authLib.loginUser(data);
    if (res.token) {
      authLib.saveAuth(res.token, res.user);
      setToken(res.token);
      setUser(res.user || null);
    }
  };

  // ✅ Register new user
  const register = async (userData: any) => {
    const res = await authLib.registerUser(userData);
    if (res.token) {
      authLib.saveAuth(res.token, res.user);
      setToken(res.token);
      setUser(res.user || null);
    }
  };

  // ✅ ECP/NCALayer digital signature login
  const loginWithECPAuth = async (ecpData: any) => {
    const res = await authLib.loginWithECP(ecpData);
    if (res.token) {
      authLib.saveAuth(res.token, res.user);
      setToken(res.token);
      setUser(res.user || null);
    }
  };

  // ✅ Logout
  const logout = () => {
    authLib.clearAuth();
    setToken(null);
    setUser(null);
  };

  // ✅ Manually set auth (for OAuth callback)
  const setAuth = (data: { token: string; user?: any }) => {
    authLib.saveAuth(data.token, data.user);
    setToken(data.token);
    setUser(data.user || null);
  };

  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    register,
    loginWithECP: loginWithECPAuth,
    logout,
    setAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
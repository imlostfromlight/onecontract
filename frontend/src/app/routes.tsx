import { Routes, Route } from 'react-router-dom';
import App from './App';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import { DocumentSign } from './pages/DocumentSign';
import { Dashboard } from './pages/Dashboard';
import { PublicDocumentSign } from './pages/PublicDocumentSign';
import { AdminPanel } from './pages/AdminPanel';
import { Templates } from './pages/Templates';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import EmailVerifyPage from './pages/EmailVerifyPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/documents" element={<DocumentSign />} />
      <Route path="/templates" element={<Templates />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/sign/:uuid" element={<PublicDocumentSign />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/verify-email/:token" element={<EmailVerifyPage />} />
    </Routes>
  );
}

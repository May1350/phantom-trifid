import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css'
import { MainLayout } from '../shared/ui'
import { storage } from '../shared/lib/storage';

// Lazy load page components for better performance
const LoginPage = lazy(() => import('../pages/login/ui/Page').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('../pages/signup/ui/Page').then(m => ({ default: m.SignupPage })));
const LandingPage = lazy(() => import('../pages/landing/ui/Page').then(m => ({ default: m.LandingPage })));
const AdminPage = lazy(() => import('../pages/admin/ui/Page').then(m => ({ default: m.AdminPage })));
const DashboardPage = lazy(() => import('../pages/dashboard/ui/Page').then(m => ({ default: m.DashboardPage })));
const SettingsPage = lazy(() => import('../pages/settings/ui/Page').then(m => ({ default: m.SettingsPage })));
const ConnectionsPage = lazy(() => import('../pages/connections/ui/Page').then(m => ({ default: m.ConnectionsPage })));
const MockOAuthPage = lazy(() => import('../pages/mock-oauth/ui/Page').then(m => ({ default: m.MockOAuthPage })));
const AuthCallbackPage = lazy(() => import('../pages/auth/callback/ui/Page').then(m => ({ default: m.AuthCallbackPage })));
const PrivacyPolicy = lazy(() => import('../pages/legal/ui/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('../pages/legal/ui/TermsOfService').then(m => ({ default: m.TermsOfService })));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="font-mono text-xs uppercase text-gray-500">Loading...</div>
    </div>
  </div>
);

// Simple Auth Wrapper
const AuthGuard: React.FC<{ children: React.ReactNode, requiredRole?: 'admin' | 'agency' }> = ({ children, requiredRole }) => {
  const navigate = useNavigate();
  const role = storage.get<'admin' | 'agency' | null>('user_role', null);

  useEffect(() => {
    if (!role) {
      navigate('/login');
    } else if (requiredRole && role !== requiredRole) {
      // Redirect if wrong role
      if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    }
  }, [role, navigate, requiredRole]);

  if (!role) return null; // or loading spinner

  return <>{children}</>;
};


function AppLayout() {
  const navigate = useNavigate();
  const role = storage.get<'admin' | 'agency' | null>('user_role', null);

  useEffect(() => {
    if (!role) {
      navigate('/login');
    }
  }, [role, navigate]);

  if (!role) return <PageLoader />;

  const handleLogout = () => {
    storage.remove('user_role');
    navigate('/login');
  };

  return (
    <MainLayout userRole={role} onLogout={handleLogout}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/dashboard" element={<AuthGuard requiredRole="agency"><DashboardPage /></AuthGuard>} />
          <Route path="/connections" element={<AuthGuard requiredRole="agency"><ConnectionsPage /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard requiredRole="agency"><SettingsPage /></AuthGuard>} />
          <Route path="/mock-oauth/:provider" element={<MockOAuthPage />} />

          <Route path="/admin" element={<AuthGuard requiredRole="admin"><AdminPage /></AuthGuard>} />
          <Route path="/users" element={
            <AuthGuard requiredRole="admin">
              <div className="p-8">
                <h1 className="text-2xl font-black uppercase mb-4">USER MANAGEMENT</h1>
                <div className="border border-black p-4 font-mono text-sm text-gray-400">
                  User List (Coming Soon)
                </div>
              </div>
            </AuthGuard>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={role === 'admin' ? '/admin' : '/dashboard'} replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth-callback" element={<AuthCallbackPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App

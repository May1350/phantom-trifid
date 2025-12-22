import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css'
import { MainLayout } from '../shared/ui'
import { storage } from '../shared/lib/storage';

// Lazy load page components for better performance
const LoginPage = lazy(() => import('../pages/login/ui/Page').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('../pages/signup/ui/Page').then(m => ({ default: m.SignupPage })));
const AdminPage = lazy(() => import('../pages/admin/ui/Page').then(m => ({ default: m.AdminPage })));
const DashboardPage = lazy(() => import('../pages/dashboard/ui/Page').then(m => ({ default: m.DashboardPage })));
const SettingsPage = lazy(() => import('../pages/settings/ui/Page').then(m => ({ default: m.SettingsPage })));
const MockOAuthPage = lazy(() => import('../pages/mock-oauth/ui/Page').then(m => ({ default: m.MockOAuthPage })));
const AuthCallbackPage = lazy(() => import('../pages/auth/callback/ui/Page').then(m => ({ default: m.AuthCallbackPage })));

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
  // We read from storage directly for simplicity in this prototype
  const role = storage.get<'admin' | 'agency' | null>('user_role', null) || 'agency';

  const handleLogout = () => {
    storage.remove('user_role');
    navigate('/login');
  };

  return (
    <MainLayout userRole={role} onLogout={handleLogout}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/dashboard" element={<AuthGuard requiredRole="agency"><DashboardPage /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard requiredRole="agency"><SettingsPage /></AuthGuard>} />
          <Route path="/mock-oauth/:provider" element={<MockOAuthPage />} />
          <Route path="/campaigns" element={
            <AuthGuard requiredRole="agency">
              <div className="p-8">
                <h1 className="text-2xl font-black uppercase mb-4">CAMPAIGNS</h1>
                <div className="border border-black p-4 font-mono text-sm text-gray-400">
                  Campaign Management (Coming Soon)
                </div>
              </div>
            </AuthGuard>
          } />

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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth-callback" element={<AuthCallbackPage />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ShopkeeperDashboard } from './pages/ShopkeeperDashboard';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { HiddenAdminPage } from './pages/HiddenAdminPage';

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SHOP_OWNER') return <Navigate to="/dashboard" replace />;
  if (user.role === 'CUSTOMER') return <Navigate to="/portal" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/hidden-admin-panel" replace />;

  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SHOP_OWNER']}>
                <ShopkeeperDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <CustomerPortalPage />
              </ProtectedRoute>
            }
          />

          <Route path="/hidden-admin-panel" element={<HiddenAdminPage />} />

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;

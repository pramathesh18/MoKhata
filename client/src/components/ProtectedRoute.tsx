import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface GuardProps {
  children: React.ReactNode;
  allowedRoles?: Array<'ADMIN' | 'SHOP_OWNER' | 'CUSTOMER'>;
}

export const ProtectedRoute: React.FC<GuardProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#3b82f6', marginBottom: '8px' }}>MoKhata</div>
          <div style={{ color: '#6b7280' }}>Loading session...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'SHOP_OWNER') return <Navigate to="/dashboard" replace />;
    if (user.role === 'CUSTOMER') return <Navigate to="/portal" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/hidden-admin-panel" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

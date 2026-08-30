import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api/client';

export interface AuthUser {
  id: string;
  userId: string;
  role: 'ADMIN' | 'SHOP_OWNER' | 'CUSTOMER';
  shopOwnerId?: string;
  customerId?: string;
  shopName?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginOwner: (userId: string, password: string) => Promise<void>;
  loginCustomer: (userId: string, password: string) => Promise<void>;
  loginAdmin: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginOwner = async (userId: string, password: string) => {
    const res = await apiRequest('/auth/owner/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    });
    if (res.success && res.data?.user) {
      setUser(res.data.user);
    }
  };

  const loginCustomer = async (userId: string, password: string) => {
    const res = await apiRequest('/auth/customer/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    });
    if (res.success && res.data?.user) {
      setUser(res.data.user);
    }
  };

  const loginAdmin = async (password: string) => {
    const res = await apiRequest('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (res.success) {
      setUser({
        id: 'admin',
        userId: 'admin',
        role: 'ADMIN',
      });
    }
  };

  const logout = async () => {
    try {
      if (user?.role === 'ADMIN') {
        await apiRequest('/admin/logout', { method: 'POST' });
      } else {
        await apiRequest('/auth/logout', { method: 'POST' });
      }
    } catch (err) {
      // Ignore logout API error if session already expired
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginOwner,
        loginCustomer,
        loginAdmin,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

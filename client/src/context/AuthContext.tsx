import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api/client';

export interface AuthUser {
  id: string;
  userId: string;
  role: 'ADMIN' | 'SHOP_OWNER' | 'CUSTOMER';
  shopOwnerId?: string;
  customerId?: string;
  shopName?: string;
  name?: string;
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

const getSavedUser = (): AuthUser | null => {
  try {
    const saved = localStorage.getItem('mokhata_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(getSavedUser);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      const res = await apiRequest('/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('mokhata_user', JSON.stringify(res.data.user));
      } else {
        setUser(null);
        localStorage.removeItem('mokhata_user');
      }
    } catch (error) {
      // Network lag/server restart: retain local session so refresh doesn't prematurely log out user
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
      localStorage.setItem('mokhata_user', JSON.stringify(res.data.user));
    }
  };

  const loginCustomer = async (userId: string, password: string) => {
    const res = await apiRequest('/auth/customer/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password }),
    });
    if (res.success && res.data?.user) {
      setUser(res.data.user);
      localStorage.setItem('mokhata_user', JSON.stringify(res.data.user));
    }
  };

  const loginAdmin = async (password: string) => {
    const res = await apiRequest('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (res.success) {
      const adminUser: AuthUser = {
        id: 'admin',
        userId: 'admin',
        role: 'ADMIN',
      };
      setUser(adminUser);
      localStorage.setItem('mokhata_user', JSON.stringify(adminUser));
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
      localStorage.removeItem('mokhata_user');
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

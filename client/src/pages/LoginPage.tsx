import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, UserCheck, ShieldCheck, Lock, User as UserIcon } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'owner' | 'customer'>('owner');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { loginOwner, loginCustomer } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (activeTab === 'owner') {
        await loginOwner(userId, password);
        navigate('/dashboard');
      } else {
        await loginCustomer(userId, password);
        navigate('/portal');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-badge">
            <Store className="logo-icon" size={28} />
          </div>
          <h1 className="app-title">MoKhata</h1>
          <p className="app-subtitle">Secure Multi-Tenant Ledger System</p>
        </div>

        <div className="tab-buttons">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'owner' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('owner');
              setError('');
            }}
          >
            <Store size={16} style={{ marginRight: 6 }} />
            Shop Owner
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'customer' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('customer');
              setError('');
            }}
          >
            <UserCheck size={16} style={{ marginRight: 6 }} />
            Customer
          </button>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="userId">
              {activeTab === 'owner' ? 'Shopkeeper User ID' : 'Customer User ID'}
            </label>
            <div className="input-wrapper">
              <UserIcon className="input-icon" size={18} />
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={activeTab === 'owner' ? 'e.g. shopowner1' : 'e.g. RAH48291'}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Authenticating...' : `Log In as ${activeTab === 'owner' ? 'Shopkeeper' : 'Customer'}`}
          </button>
        </form>

        <div className="login-footer">
          <ShieldCheck size={14} style={{ marginRight: 4 }} />
          Server-Side Session Encrypted
        </div>
      </div>
    </div>
  );
};

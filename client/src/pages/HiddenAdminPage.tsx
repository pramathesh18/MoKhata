import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { Shield, Key, Plus, Lock, LogOut } from 'lucide-react';

export const HiddenAdminPage: React.FC = () => {
  const { user, loginAdmin, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [is404, setIs404] = useState(false);

  // Admin Dashboard State
  const [owners, setOwners] = useState<any[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [createMsg, setCreateMsg] = useState('');

  const [resetOwnerId, setResetOwnerId] = useState('');
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIs404(false);
    try {
      await loginAdmin(password);
      fetchOwners();
    } catch (err: any) {
      // 404 behavior requirement for failed admin login
      setIs404(true);
    }
  };

  const fetchOwners = async () => {
    setLoadingOwners(true);
    try {
      const res = await apiRequest('/admin/owners');
      if (res.success) {
        setOwners(res.data.owners);
      }
    } catch (err: any) {
      setIs404(true);
    } finally {
      setLoadingOwners(false);
    }
  };

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg('');
    try {
      const res = await apiRequest('/admin/owners', {
        method: 'POST',
        body: JSON.stringify({
          userId: newUserId,
          password: newOwnerPassword,
          shopName: newShopName,
        }),
      });
      if (res.success) {
        setCreateMsg(`✅ Owner '${newUserId}' created successfully!`);
        setNewUserId('');
        setNewOwnerPassword('');
        setNewShopName('');
        fetchOwners();
      }
    } catch (err: any) {
      setCreateMsg(`❌ ${err.message || 'Failed to create owner'}`);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg('');
    try {
      const res = await apiRequest(`/admin/owners/${resetOwnerId}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ newPassword: resetPasswordVal }),
      });
      if (res.success) {
        setResetMsg(`✅ Password updated successfully!`);
        setResetPasswordVal('');
        setResetOwnerId('');
      }
    } catch (err: any) {
      setResetMsg(`❌ ${err.message || 'Failed to update password'}`);
    }
  };

  if (is404) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '4rem', margin: 0, color: '#374151' }}>404</h1>
        <p style={{ color: '#6b7280', fontSize: '1.2rem' }}>Page Not Found</p>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-badge" style={{ backgroundColor: '#ef4444' }}>
              <Shield className="logo-icon" size={28} />
            </div>
            <h1 className="app-title">Admin Access</h1>
            <p className="app-subtitle">Protected System Console</p>
          </div>

          <form onSubmit={handleAdminLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="adminPassword">Master Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="adminPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" style={{ backgroundColor: '#ef4444' }}>
              Authenticate Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-brand">
          <Shield size={24} style={{ color: '#ef4444' }} />
          <h2>MoKhata Admin Panel</h2>
        </div>
        <button onClick={logout} className="logout-btn">
          <LogOut size={16} style={{ marginRight: 6 }} /> Logout
        </button>
      </header>

      <main className="admin-main">
        {/* Create Owner Section */}
        <section className="admin-card">
          <h3>Create New Shop Owner</h3>
          {createMsg && <div className="admin-alert">{createMsg}</div>}
          <form onSubmit={handleCreateOwner} className="admin-form">
            <input
              type="text"
              placeholder="Shopkeeper User ID (e.g. owner_ramesh)"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Shop Name (e.g. Ramesh Kirana Store)"
              value={newShopName}
              onChange={(e) => setNewShopName(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={newOwnerPassword}
              onChange={(e) => setNewOwnerPassword(e.target.value)}
              required
            />
            <button type="submit" className="action-btn">
              <Plus size={16} /> Create Shop Owner
            </button>
          </form>
        </section>

        {/* List Owners Section */}
        <section className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Registered Shop Owners</h3>
            <button onClick={fetchOwners} className="secondary-btn">Refresh</button>
          </div>

          {loadingOwners ? (
            <p>Loading owners...</p>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Shop Owner User ID</th>
                    <th>Shop Name</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner: any) => (
                    <tr key={owner.id}>
                      <td><strong>{owner.userId}</strong></td>
                      <td>{owner.shopName}</td>
                      <td>{new Date(owner.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => setResetOwnerId(owner.id)}
                          className="reset-btn"
                        >
                          <Key size={14} style={{ marginRight: 4 }} /> Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Reset Password Modal / Section */}
        {resetOwnerId && (
          <section className="admin-card highlight-card">
            <h3>Reset Owner Password</h3>
            {resetMsg && <div className="admin-alert">{resetMsg}</div>}
            <form onSubmit={handleResetPassword} className="admin-form">
              <input
                type="password"
                placeholder="New Password (min 6 chars)"
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="action-btn">Confirm Reset</button>
                <button type="button" onClick={() => setResetOwnerId('')} className="secondary-btn">Cancel</button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
};

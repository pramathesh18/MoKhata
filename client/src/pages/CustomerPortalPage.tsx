import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { formatTimestamp } from '../utils/dateFormatter';
import { UserCheck, Store, LogOut, Key, History } from 'lucide-react';

export const CustomerPortalPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    if (!user?.customerId) return;
    setLoading(true);

    try {
      const [custRes, txRes] = await Promise.all([
        apiRequest(`/customers/${user.customerId}`),
        apiRequest(`/customers/${user.customerId}/transactions`),
      ]);

      if (custRes.success) setCustomerDetails(custRes.data.customer);
      if (txRes.success) setTransactions(txRes.data.transactions);
    } catch (err: any) {
      console.error('Failed to fetch portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdSubmitting(true);

    try {
      const res = await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.success) {
        setPwdMsg('✅ Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err: any) {
      setPwdMsg(`❌ ${err.message || 'Failed to change password'}`);
    } finally {
      setPwdSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading portal...</div>;
  }

  const balanceRupees = customerDetails ? customerDetails.balance / 100 : 0;
  const isOwed = balanceRupees > 0;

  return (
    <div className="portal-container">
      <header className="portal-header">
        <div className="header-brand">
          <UserCheck size={24} style={{ color: '#3b82f6' }} />
          <div>
            <h2>MoKhata Customer Portal</h2>
            <span className="sub-text">Welcome, {customerDetails?.name || user?.userId}</span>
          </div>
        </div>
        <button onClick={logout} className="logout-btn-subtle">
          <LogOut size={16} style={{ marginRight: 6 }} /> Logout
        </button>
      </header>

      <main className="portal-main">
        {/* Shop Name & Balance Summary */}
        <section className="portal-card">
          <div className="shop-badge">
            <Store size={18} style={{ marginRight: 6 }} />
            Shop: <strong>{customerDetails?.shopName || 'Ledger'}</strong>
          </div>

          <div className="portal-balance-card">
            <span>Outstanding Balance</span>
            <div className={`portal-balance-val ${isOwed ? 'text-danger' : 'text-success'}`}>
              ₹{Math.abs(balanceRupees).toFixed(2)}
            </div>
            <div className="portal-balance-subtitle">
              {isOwed
                ? 'You owe this amount to shopkeeper'
                : balanceRupees < 0
                ? 'You have advance credit balance'
                : 'Account balance is completely clear!'}
            </div>
          </div>
        </section>

        {/* Transaction History Section */}
        <section className="portal-card">
          <h3><History size={18} style={{ marginRight: 6 }} /> Your Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="sub-text">No transactions recorded yet.</p>
          ) : (
            <div className="tx-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="tx-item">
                  <div className="tx-info">
                    <span className={`tx-type-badge ${tx.type === 'CREDIT' ? 'badge-credit' : 'badge-payment'}`}>
                      {tx.type === 'CREDIT' ? '+ CREDIT' : '- PAYMENT'}
                    </span>
                    {tx.itemName && <span className="tx-item-name">{tx.itemName}</span>}
                    <span className="tx-date">{formatTimestamp(tx.createdAt)}</span>
                  </div>
                  <div className={`tx-amount ${tx.type === 'CREDIT' ? 'text-danger' : 'text-success'}`}>
                    ₹{tx.amountInRupees.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Password Reset Section */}
        <section className="portal-card">
          <h3><Key size={18} style={{ marginRight: 6 }} /> Change Password</h3>
          {pwdMsg && <div className="portal-alert">{pwdMsg}</div>}
          <form onSubmit={handleChangePassword} className="portal-form">
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="New Password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button type="submit" className="submit-btn" disabled={pwdSubmitting}>
              {pwdSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

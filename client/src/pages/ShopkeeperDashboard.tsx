import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import {
  Store,
  Search,
  Moon,
  Sun,
  LogOut,
  UserPlus,
  Trash2,
  X,
  History,
  TrendingUp,
  TrendingDown,
  Copy,
  Check,
} from 'lucide-react';

export const ShopkeeperDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  // Data states
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPassword, setNewCustPassword] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ userId: string; password: string } | null>(null);

  // Selected Customer & Transaction Modal
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
  const [txAmount, setTxAmount] = useState('');
  const [txItemName, setTxItemName] = useState('');
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/customers');
      if (res.success) {
        setCustomers(res.data.customers);
      }
    } catch (err: any) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: newCustName, password: newCustPassword }),
      });
      if (res.success) {
        setCreatedCredentials(res.data.credentials);
        setNewCustName('');
        setNewCustPassword('');
        fetchCustomers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  const openCustomerDetails = async (customer: any) => {
    setSelectedCustomer(customer);
    setLoadingTx(true);
    try {
      const res = await apiRequest(`/customers/${customer.id}/transactions`);
      if (res.success) {
        setTransactions(res.data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setTxSubmitting(true);

    try {
      const res = await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          type: txType,
          amount: parseFloat(txAmount),
          itemName: txItemName,
        }),
      });

      if (res.success) {
        setTxAmount('');
        setTxItemName('');
        setShowTxModal(false);
        // Refresh customer list & details
        await fetchCustomers();
        openCustomerDetails({
          ...selectedCustomer,
          balance: res.data.currentBalanceInRupees * 100,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Transaction failed');
    } finally {
      setTxSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`Deactivate customer '${name}'? Historical transactions will be preserved.`)) return;
    try {
      const res = await apiRequest(`/customers/${id}`, { method: 'DELETE' });
      if (res.success) {
        setSelectedCustomer(null);
        fetchCustomers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate customer');
    }
  };

  const totalOutstandingPaise = customers.reduce((sum, c) => sum + Math.max(0, c.balance), 0);
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`dashboard-root ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* Navbar */}
      <header className="navbar">
        <div className="nav-brand">
          <Store size={24} className="nav-logo" />
          <div>
            <h1 className="nav-title">{user?.shopName || 'MoKhata Ledger'}</h1>
            <span className="nav-user">Owner ID: {user?.userId}</span>
          </div>
        </div>

        <div className="nav-actions">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="icon-btn"
            title="Toggle Light/Dark Theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={logout} className="logout-btn-subtle">
            <LogOut size={16} style={{ marginRight: 6 }} /> Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Total Ledger Summary Header */}
        <div className="summary-banner">
          <div className="summary-info">
            <span className="summary-label">Total Outstanding Debt</span>
            <div className="summary-amount">
              ₹{(totalOutstandingPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <button onClick={() => setShowAddCustomer(true)} className="primary-action-btn">
            <UserPlus size={18} style={{ marginRight: 6 }} /> Add Customer
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search customer by name or User ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Keep-Style Customer Cards Grid */}
        {loading ? (
          <div className="loading-spinner">Loading customer cards...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <Store size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No customers found.</p>
          </div>
        ) : (
          <div className="keep-grid">
            {filteredCustomers.map((cust) => {
              const balanceRupees = cust.balance / 100;
              const isOwed = balanceRupees > 0;

              return (
                <div
                  key={cust.id}
                  className={`keep-card ${isOwed ? 'card-debt' : 'card-clear'}`}
                  onClick={() => openCustomerDetails(cust)}
                >
                  <div className="card-header">
                    <h3 className="cust-name">{cust.name}</h3>
                    <span className="cust-id">ID: {cust.userId}</span>
                  </div>

                  <div className="card-body">
                    <span className="balance-label">Balance</span>
                    <div className={`cust-balance ${isOwed ? 'text-danger' : 'text-success'}`}>
                      ₹{Math.abs(balanceRupees).toFixed(2)}
                      {balanceRupees > 0 && <span className="balance-badge">OWES</span>}
                      {balanceRupees < 0 && <span className="balance-badge-advance">ADVANCE</span>}
                    </div>
                  </div>

                  <div className="card-footer">
                    <span>Tap to view ledger history</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create Customer Account</h3>
              <button onClick={() => { setShowAddCustomer(false); setCreatedCredentials(null); }} className="close-btn">
                <X size={20} />
              </button>
            </div>

            {createdCredentials ? (
              <div className="credentials-success">
                <h4>✅ Customer Created!</h4>
                <p>Share these login credentials with customer:</p>
                <div className="cred-box">
                  <div><strong>Customer User ID:</strong> {createdCredentials.userId}</div>
                  <div><strong>Password:</strong> {createdCredentials.password}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`User ID: ${createdCredentials.userId}\nPassword: ${createdCredentials.password}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="secondary-btn"
                  style={{ width: '100%', marginTop: 12 }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied!' : 'Copy Credentials'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateCustomer} className="modal-form">
                <div className="form-group">
                  <label>Customer Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Initial Password</label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={newCustPassword}
                    onChange={(e) => setNewCustPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="submit-btn">
                  Generate Account & ID
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="modal-overlay">
          <div className="drawer-card">
            <div className="modal-header">
              <div>
                <h2>{selectedCustomer.name}</h2>
                <span className="sub-text">User ID: {selectedCustomer.userId}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
                  className="icon-btn danger"
                  title="Deactivate Customer"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={() => setSelectedCustomer(null)} className="close-btn">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="drawer-balance-summary">
              <div>
                <span>Current Balance</span>
                <div className="balance-val">
                  ₹{(selectedCustomer.balance / 100).toFixed(2)}
                </div>
              </div>
              <div className="drawer-btn-group">
                <button
                  onClick={() => { setTxType('CREDIT'); setShowTxModal(true); }}
                  className="btn-credit"
                >
                  <TrendingUp size={16} /> + Give Credit
                </button>
                <button
                  onClick={() => { setTxType('PAYMENT'); setShowTxModal(true); }}
                  className="btn-payment"
                >
                  <TrendingDown size={16} /> - Record Payment
                </button>
              </div>
            </div>

            {/* Transaction History */}
            <div className="tx-history-section">
              <h4><History size={16} style={{ marginRight: 6 }} /> Transaction History</h4>
              {loadingTx ? (
                <p>Loading history...</p>
              ) : transactions.length === 0 ? (
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
                        <span className="tx-date">{new Date(tx.createdAt).toLocaleString()}</span>
                      </div>
                      <div className={`tx-amount ${tx.type === 'CREDIT' ? 'text-danger' : 'text-success'}`}>
                        ₹{tx.amountInRupees.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Entry Modal */}
      {showTxModal && selectedCustomer && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-card">
            <div className="modal-header">
              <h3>{txType === 'CREDIT' ? 'Give Credit (+)' : 'Record Payment (-)'}</h3>
              <button onClick={() => setShowTxModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="modal-form">
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 150.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Item Name / Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 2kg Rice & Sugar"
                  value={txItemName}
                  onChange={(e) => setTxItemName(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className={`submit-btn ${txType === 'CREDIT' ? 'bg-danger' : 'bg-success'}`}
                disabled={txSubmitting}
              >
                {txSubmitting ? 'Saving...' : `Confirm ${txType === 'CREDIT' ? 'Credit' : 'Payment'}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

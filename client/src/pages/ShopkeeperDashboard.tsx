import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { formatTimestamp } from '../utils/dateFormatter';
import {
  Plus,
  Minus,
  Search,
  Moon,
  Sun,
  LogOut,
  X,
  Trash2,
  History,
  Copy,
  Check,
} from 'lucide-react';

export const ShopkeeperDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  // Synchronize dark theme class directly onto body element so entire background stays dark on mobile/overflows
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [darkMode]);

  // Data states
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Customer Modal
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPassword, setNewCustPassword] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ userId: string; password: string } | null>(null);

  // Direct Transaction Modal (opened via + or - on card)
  const [txCustomer, setTxCustomer] = useState<any>(null);
  const [txType, setTxType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
  const [txAmount, setTxAmount] = useState('');
  const [txItemName, setTxItemName] = useState('');
  const [txSubmitting, setTxSubmitting] = useState(false);

  // Customer Transaction History Modal (opened on clicking card body)
  const [historyCustomer, setHistoryCustomer] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await apiRequest('/customers');
      if (res.success) {
        setCustomers(res.data.customers || []);
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

  const openTxModal = (customer: any, type: 'CREDIT' | 'PAYMENT', e: React.MouseEvent) => {
    e.stopPropagation();
    setTxCustomer(customer);
    setTxType(type);
    setTxAmount('');
    setTxItemName('');
  };

  const openHistoryModal = async (customer: any) => {
    setHistoryCustomer(customer);
    setLoadingTx(true);
    try {
      const res = await apiRequest(`/customers/${customer.id}/transactions`);
      if (res.success) {
        setTransactions(res.data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txCustomer || txSubmitting) return;

    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    setTxSubmitting(true);

    try {
      const res = await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          customerId: txCustomer.id,
          type: txType,
          amount: amountNum,
          itemName: txItemName,
        }),
      });

      if (res.success) {
        const paiseDelta = (txType === 'CREDIT' ? 1 : -1) * Math.round(amountNum * 100);

        // Optimistically update customer balance in local state
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === txCustomer.id ? { ...c, balance: (c.balance || 0) + paiseDelta } : c
          )
        );

        setTxCustomer(null);
        setTxAmount('');
        setTxItemName('');

        // Refresh customer list from server
        fetchCustomers();
      }
    } catch (err: any) {
      alert(err.message || 'Transaction failed');
    } finally {
      setTxSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`Deactivate customer '${name}'?`)) return;
    try {
      const res = await apiRequest(`/customers/${id}`, { method: 'DELETE' });
      if (res.success) {
        setHistoryCustomer(null);
        fetchCustomers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate customer');
    }
  };

  // Calculate total outstanding balance safely (sum of all positive balances in Paise)
  const totalOutstandingPaise = useMemo(() => {
    return customers.reduce((sum, c) => {
      const bal = Number(c.balance) || 0;
      return sum + (bal > 0 ? bal : 0);
    }, 0);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.userId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  return (
    <div className={`dashboard-root ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* Header */}
      <header className="navbar">
        <div className="nav-brand">
          <h1 className="nav-title">Customers</h1>
        </div>

        <div className="nav-center">
          <div className="outstanding-badge">
            <span className="outstanding-label">Total Outstanding:</span>
            <span className="outstanding-value">
              ₹{(totalOutstandingPaise / 100).toLocaleString('en-IN')}
            </span>
          </div>
          {user?.userId && <span className="shop-code-tag">Shop Code: {user.userId}</span>}
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
            <LogOut size={16} style={{ marginRight: 4 }} /> Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Search Bar */}
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Customer Cards Grid matching uploaded design */}
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <p>No customers found.</p>
          </div>
        ) : (
          <div className="keep-grid">
            {filteredCustomers.map((cust) => {
              const balanceRupees = Math.round((cust.balance || 0) / 100);

              return (
                <div
                  key={cust.id}
                  className="keep-card"
                  onClick={() => openHistoryModal(cust)}
                >
                  <div className="card-header">
                    <h3 className="cust-name">{cust.name}</h3>
                    <span className="cust-id">{cust.userId}</span>
                  </div>

                  <div className="cust-balance">
                    ₹{balanceRupees}
                  </div>

                  <div className="card-actions">
                    <button
                      className="card-btn btn-plus"
                      onClick={(e) => openTxModal(cust, 'CREDIT', e)}
                      title="Add Credit (+)"
                    >
                      <Plus size={24} />
                    </button>
                    <button
                      className="card-btn btn-minus"
                      onClick={(e) => openTxModal(cust, 'PAYMENT', e)}
                      title="Record Payment (-)"
                    >
                      <Minus size={24} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Action Button (+) for Add Customer */}
        <button
          className="fab-btn"
          onClick={() => setShowAddCustomer(true)}
          title="Add New Customer"
        >
          <Plus size={28} />
        </button>
      </main>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>New Customer</h3>
              <button
                onClick={() => {
                  setShowAddCustomer(false);
                  setCreatedCredentials(null);
                }}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>

            {createdCredentials ? (
              <div className="credentials-success">
                <p>Customer created successfully!</p>
                <div className="cred-box">
                  <div><strong>User ID:</strong> {createdCredentials.userId}</div>
                  <div><strong>Password:</strong> {createdCredentials.password}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `User ID: ${createdCredentials.userId}\nPassword: ${createdCredentials.password}`
                    );
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
                  <label>Customer Name</label>
                  <input
                    type="text"
                    placeholder="Enter name"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={newCustPassword}
                    onChange={(e) => setNewCustPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="submit-btn">
                  Create Customer
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Quick Direct Transaction Modal (+ / - clicked on card) */}
      {txCustomer && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>
                {txType === 'CREDIT' ? `Add Credit (+) for ${txCustomer.name}` : `Record Payment (-) for ${txCustomer.name}`}
              </h3>
              <button onClick={() => setTxCustomer(null)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="modal-form">
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="Enter amount"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label>Note (Optional)</label>
                <input
                  type="text"
                  placeholder="Item details..."
                  value={txItemName}
                  onChange={(e) => setTxItemName(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className={`submit-btn ${txType === 'CREDIT' ? 'bg-danger' : 'bg-success'}`}
                disabled={txSubmitting}
              >
                {txSubmitting ? 'Saving...' : `Save ${txType === 'CREDIT' ? 'Credit' : 'Payment'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail & Transaction History Modal (Card clicked) */}
      {historyCustomer && (
        <div className="modal-overlay">
          <div className="drawer-card">
            <div className="modal-header">
              <div>
                <h2>{historyCustomer.name}</h2>
                <span className="sub-text">{historyCustomer.userId}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleDeleteCustomer(historyCustomer.id, historyCustomer.name)}
                  className="icon-btn danger"
                  title="Deactivate Customer"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={() => setHistoryCustomer(null)} className="close-btn">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="drawer-balance-summary">
              <div>
                <span>Balance</span>
                <div className="balance-val">
                  ₹{Math.round((historyCustomer.balance || 0) / 100)}
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="tx-history-section">
              <h4>
                <History size={16} style={{ marginRight: 6 }} /> Past Transactions
              </h4>
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
                        <span className="tx-date">{formatTimestamp(tx.createdAt)}</span>
                      </div>
                      <div className={`tx-amount ${tx.type === 'CREDIT' ? 'text-danger' : 'text-success'}`}>
                        ₹{tx.amountInRupees}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

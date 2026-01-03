-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- =========================
-- OWNERS TABLE
-- =========================
CREATE TABLE owners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- CUSTOMERS TABLE
-- =========================
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    customer_code TEXT NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(owner_id, customer_code),
    FOREIGN KEY (owner_id) REFERENCES owners(id)
);

-- =========================
-- TRANSACTIONS TABLE
-- =========================
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES owners(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- =========================
-- INDEX FOR FAST LOOKUPS
-- =========================
CREATE INDEX idx_transactions_owner_customer
ON transactions(owner_id, customer_id, created_at);

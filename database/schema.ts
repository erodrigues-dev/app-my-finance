export const schemaVersion = 2;

export const migrations = [
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    spending_limit REAL,
    color TEXT NOT NULL DEFAULT '#BD93F9'
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    category_id INTEGER,
    note TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)`,
  `CREATE TABLE IF NOT EXISTS fixed_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    due_day INTEGER NOT NULL,
    category_id INTEGER,
    note TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`,
  `ALTER TABLE transactions ADD COLUMN fixed_expense_id INTEGER REFERENCES fixed_expenses(id)`,
  `ALTER TABLE transactions ADD COLUMN paid INTEGER DEFAULT 0`,
  `ALTER TABLE transactions ADD COLUMN planned INTEGER DEFAULT 0`,
  `ALTER TABLE transactions ADD COLUMN installment_group_id INTEGER`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_installment_group ON transactions(installment_group_id, date, id)`,
  `CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    credit_enabled INTEGER NOT NULL DEFAULT 0,
    debit_enabled INTEGER NOT NULL DEFAULT 0,
    pix_enabled INTEGER NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    closing_day INTEGER,
    due_day INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS credit_invoice_payments (
    account_id INTEGER NOT NULL,
    invoice_month TEXT NOT NULL,
    paid INTEGER NOT NULL DEFAULT 0,
    paid_at TEXT,
    PRIMARY KEY (account_id, invoice_month),
    FOREIGN KEY (account_id) REFERENCES bank_accounts(id)
  )`,
  `ALTER TABLE transactions ADD COLUMN account_id INTEGER REFERENCES bank_accounts(id)`,
  `ALTER TABLE transactions ADD COLUMN payment_method TEXT CHECK(payment_method IS NULL OR payment_method IN ('credit','debit','pix'))`,
  `ALTER TABLE transactions ADD COLUMN invoice_month TEXT`,
  `ALTER TABLE bank_accounts ADD COLUMN default_payment_method TEXT CHECK(default_payment_method IS NULL OR default_payment_method IN ('credit','debit','pix'))`,
];

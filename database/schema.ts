export const schemaVersion = 1;

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
];

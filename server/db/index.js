const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../data/switchradar.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode
db.pragma('journal_mode = WAL');

// Initialize core tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_sync DATETIME,
    total_businesses INTEGER DEFAULT 0,
    storage_used_mb REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    town TEXT,
    province TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    business_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY(created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    userId INTEGER,
    name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    provider TEXT,
    category TEXT,
    town TEXT,
    province TEXT,
    lat REAL,
    lng REAL,
    status TEXT,
    notes TEXT,
    importedAt DATETIME,
    source TEXT,
    metadata TEXT,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'synced',
    dataset_id INTEGER,
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(dataset_id) REFERENCES datasets(id)
  );

  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    businessId TEXT,
    "order" INTEGER,
    addedAt DATETIME,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

// Add performance indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(userId);
  CREATE INDEX IF NOT EXISTS idx_routes_user ON routes(userId);
  CREATE INDEX IF NOT EXISTS idx_datasets_user ON datasets(created_by);
`);

module.exports = db;

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/switchradar.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = 1000000');
db.pragma('temp_store = memory');

// Initialize core tables with enhanced schema
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
`);

// Add missing columns to existing users table (ignore errors if columns exist)
try {
  db.exec(`ALTER TABLE users ADD COLUMN last_sync DATETIME;`);
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN total_businesses INTEGER DEFAULT 0;`);
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN storage_used_mb REAL DEFAULT 0;`);
} catch (e) {
  // Column already exists, ignore
}

// Add missing dataset_id column to existing leads table
try {
  db.exec(`ALTER TABLE leads ADD COLUMN dataset_id INTEGER DEFAULT 1;`);
} catch (e) {
  // Column already exists, ignore
}

// Add missing columns to existing datasets table
try {
  db.exec(`ALTER TABLE datasets ADD COLUMN town TEXT;`);
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE datasets ADD COLUMN province TEXT;`);
} catch (e) {
  // Column already exists, ignore
}

db.exec(`
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

  CREATE TABLE IF NOT EXISTS dataset_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER,
    user_id INTEGER,
    permission_level TEXT DEFAULT 'read', -- 'read', 'write', 'admin'
    granted_by INTEGER,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(dataset_id) REFERENCES datasets(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(granted_by) REFERENCES users(id),
    UNIQUE(dataset_id, user_id)
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
    dataset_id INTEGER DEFAULT 1,
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

  CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    sync_type TEXT,
    records_count INTEGER,
    success BOOLEAN,
    error_message TEXT,
    sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

// Create performance indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_leads_user_dataset ON leads(userId, dataset_id);
  CREATE INDEX IF NOT EXISTS idx_leads_dataset_name ON leads(dataset_id, name);
  CREATE INDEX IF NOT EXISTS idx_leads_dataset_provider ON leads(dataset_id, provider);
  CREATE INDEX IF NOT EXISTS idx_leads_dataset_category ON leads(dataset_id, category);
  CREATE INDEX IF NOT EXISTS idx_leads_dataset_town ON leads(dataset_id, town);
  CREATE INDEX IF NOT EXISTS idx_leads_dataset_status ON leads(dataset_id, status);
  CREATE INDEX IF NOT EXISTS idx_leads_coordinates ON leads(lat, lng);
  CREATE INDEX IF NOT EXISTS idx_leads_search ON leads(dataset_id, name, address, phone);
  CREATE INDEX IF NOT EXISTS idx_routes_user_order ON routes(userId, "order");
  CREATE INDEX IF NOT EXISTS idx_datasets_user ON datasets(created_by);
  CREATE INDEX IF NOT EXISTS idx_datasets_town ON datasets(town, province);
  CREATE INDEX IF NOT EXISTS idx_dataset_permissions_user ON dataset_permissions(user_id);
`);

console.log('Database initialized successfully');

module.exports = db;

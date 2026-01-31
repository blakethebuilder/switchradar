const Database = require('better-sqlite3');
const path = require('path');
const SchemaMigrator = require('../migrations/migrator');

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
    FOREIGN KEY(userId) REFERENCES users(id)
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
  CREATE INDEX IF NOT EXISTS idx_leads_user_name ON leads(userId, name);
  CREATE INDEX IF NOT EXISTS idx_leads_user_provider ON leads(userId, provider);
  CREATE INDEX IF NOT EXISTS idx_leads_user_category ON leads(userId, category);
  CREATE INDEX IF NOT EXISTS idx_leads_user_town ON leads(userId, town);
  CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(userId, status);
  CREATE INDEX IF NOT EXISTS idx_leads_coordinates ON leads(lat, lng);
  CREATE INDEX IF NOT EXISTS idx_leads_search ON leads(userId, name, address, phone);
  CREATE INDEX IF NOT EXISTS idx_routes_user_order ON routes(userId, "order");
`);

// Initialize migrator and run pending migrations
const migrator = new SchemaMigrator(db);

// Run datasets migration if needed
async function runMigrations() {
  try {
    // Check if datasets table exists
    const tablesResult = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='datasets'
    `).get();
    
    if (!tablesResult) {
      console.log('Running datasets migration...');
      const datasetsMigration = require('../migrations/001_add_datasets');
      const result = await migrator.applyMigration(datasetsMigration);
      
      if (result.success) {
        console.log('Datasets migration completed successfully');
      } else {
        console.error('Datasets migration failed:', result.error);
      }
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  }
}

// Run migrations on startup
runMigrations();

module.exports = db;

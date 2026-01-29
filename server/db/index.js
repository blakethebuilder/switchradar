const Database = require('better-sqlite3');
const path = require('path');
const SchemaMigrator = require('../migrations/migrator');

const dbPath = path.resolve(__dirname, '../../data/switchradar.db');
const db = new Database(dbPath);

// Initialize core tables (existing schema)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    businessId TEXT,
    "order" INTEGER,
    addedAt DATETIME,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
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

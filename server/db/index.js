const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/switchradar.db');
const db = new Database(dbPath);

// Initialize tables
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

module.exports = db;

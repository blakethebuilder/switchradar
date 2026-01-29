// Migration: Add datasets table and junction table for business/leads compatibility

const migration = {
  id: '001_add_datasets',
  description: 'Add datasets table and dataset_businesses junction table for business/leads compatibility',
  
  upQueries: [
    // Create datasets table
    `CREATE TABLE IF NOT EXISTS datasets (
      id TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`,
    
    // Create junction table for dataset-business relationships
    // Note: Using 'leads' table name to maintain compatibility with existing backend
    `CREATE TABLE IF NOT EXISTS dataset_businesses (
      dataset_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (dataset_id, business_id),
      FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES leads(id) ON DELETE CASCADE
    )`,
    
    // Create indexes for better performance
    `CREATE INDEX IF NOT EXISTS idx_datasets_user ON datasets(userId)`,
    `CREATE INDEX IF NOT EXISTS idx_dataset_businesses_dataset ON dataset_businesses(dataset_id)`,
    `CREATE INDEX IF NOT EXISTS idx_dataset_businesses_business ON dataset_businesses(business_id)`
  ],
  
  downQueries: [
    'DROP INDEX IF EXISTS idx_dataset_businesses_business',
    'DROP INDEX IF EXISTS idx_dataset_businesses_dataset', 
    'DROP INDEX IF EXISTS idx_datasets_user',
    'DROP TABLE IF EXISTS dataset_businesses',
    'DROP TABLE IF EXISTS datasets'
  ],
  
  dataTransforms: [
    // No data transforms needed for this migration
    // This is a pure schema addition that doesn't affect existing data
  ]
};

module.exports = migration;
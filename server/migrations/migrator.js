const fs = require('fs');
const path = require('path');

class SchemaMigrator {
  constructor(db) {
    this.db = db;
    this.backupDir = path.resolve(__dirname, '../backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async backupCurrentSchema() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}`;
    const backupPath = path.join(this.backupDir, `${backupId}.sql`);

    try {
      // Get all table schemas
      const tables = this.db.prepare(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      let backupSql = `-- Schema backup created at ${new Date().toISOString()}\n\n`;
      
      // Add table creation statements
      for (const table of tables) {
        backupSql += `${table.sql};\n\n`;
        
        // Export data
        const rows = this.db.prepare(`SELECT * FROM ${table.name}`).all();
        if (rows.length > 0) {
          backupSql += `-- Data for table ${table.name}\n`;
          for (const row of rows) {
            const columns = Object.keys(row).join(', ');
            const values = Object.values(row).map(v => 
              v === null ? 'NULL' : 
              typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : 
              v
            ).join(', ');
            backupSql += `INSERT INTO ${table.name} (${columns}) VALUES (${values});\n`;
          }
          backupSql += '\n';
        }
      }

      fs.writeFileSync(backupPath, backupSql);
      
      return {
        success: true,
        backupId,
        backupPath,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async applyMigration(migration) {
    const backup = await this.backupCurrentSchema();
    if (!backup.success) {
      throw new Error(`Failed to create backup: ${backup.error}`);
    }

    const transaction = this.db.transaction(() => {
      try {
        // Apply migration queries using named parameters
        for (const query of migration.upQueries) {
          this.db.prepare(query).run();
        }
        
        // Apply data transforms if any
        if (migration.dataTransforms) {
          for (const transform of migration.dataTransforms) {
            this.applyDataTransform(transform);
          }
        }
        
        return { success: true, backupId: backup.backupId };
      } catch (error) {
        throw error; // Will trigger rollback
      }
    });

    try {
      const result = transaction();
      return {
        success: true,
        migrationId: migration.id,
        backupId: result.backupId,
        timestamp: new Date()
      };
    } catch (error) {
      // Migration failed, backup is already created for manual recovery
      return {
        success: false,
        error: error.message,
        migrationId: migration.id,
        backupId: backup.backupId,
        timestamp: new Date()
      };
    }
  }

  applyDataTransform(transform) {
    // Apply data transformation using named parameters
    const stmt = this.db.prepare(transform.query);
    if (transform.parameters) {
      stmt.run(transform.parameters);
    } else {
      stmt.run();
    }
  }

  async rollbackMigration(backupId) {
    const backupPath = path.join(this.backupDir, `${backupId}.sql`);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupId}`);
    }

    try {
      const backupSql = fs.readFileSync(backupPath, 'utf8');
      
      // This is a simplified rollback - in production you'd want more sophisticated handling
      const transaction = this.db.transaction(() => {
        // Drop existing tables (be very careful here)
        const tables = this.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `).all();
        
        for (const table of tables) {
          this.db.prepare(`DROP TABLE IF EXISTS ${table.name}`).run();
        }
        
        // Execute backup SQL
        this.db.exec(backupSql);
      });

      transaction();
      
      return {
        success: true,
        backupId,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        backupId,
        timestamp: new Date()
      };
    }
  }

  async validateSchema() {
    try {
      // Check if all expected tables exist
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      const tableNames = tables.map(t => t.name);
      const expectedTables = ['users', 'leads', 'routes'];
      
      const missingTables = expectedTables.filter(t => !tableNames.includes(t));
      
      return {
        isValid: missingTables.length === 0,
        tables: tableNames,
        missingTables,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async checkDataIntegrity() {
    try {
      const checks = [];
      
      // Check for orphaned records
      const orphanedRoutes = this.db.prepare(`
        SELECT COUNT(*) as count FROM routes r 
        LEFT JOIN users u ON r.userId = u.id 
        WHERE u.id IS NULL
      `).get();
      
      checks.push({
        check: 'orphaned_routes',
        passed: orphanedRoutes.count === 0,
        count: orphanedRoutes.count
      });

      const orphanedLeads = this.db.prepare(`
        SELECT COUNT(*) as count FROM leads l 
        LEFT JOIN users u ON l.userId = u.id 
        WHERE u.id IS NULL
      `).get();
      
      checks.push({
        check: 'orphaned_leads',
        passed: orphanedLeads.count === 0,
        count: orphanedLeads.count
      });

      const allPassed = checks.every(c => c.passed);
      
      return {
        isValid: allPassed,
        checks,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = SchemaMigrator;
#!/usr/bin/env node

/**
 * Script to update user statistics for existing users
 * This fixes the issue where user stats show 0 businesses even when they have data
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'data', 'switchradar.db');

console.log('🔄 Updating user statistics...');
console.log('📁 Database path:', dbPath);

try {
    const db = new Database(dbPath);
    
    // Get all users
    const users = db.prepare('SELECT id, username FROM users').all();
    console.log(`👥 Found ${users.length} users`);
    
    for (const user of users) {
        console.log(`\n📊 Updating stats for user: ${user.username} (ID: ${user.id})`);
        
        // Count businesses for this user
        const businessCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE userId = ?').get(user.id);
        
        // Calculate storage used (rough estimate based on data size)
        const storageQuery = db.prepare(`
            SELECT 
                COUNT(*) * 2 + 
                SUM(LENGTH(COALESCE(name, '')) + LENGTH(COALESCE(address, '')) + 
                    LENGTH(COALESCE(phone, '')) + LENGTH(COALESCE(email, '')) + 
                    LENGTH(COALESCE(notes, '')) + LENGTH(COALESCE(metadata, ''))) / 1024 as storage_kb
            FROM leads WHERE userId = ?
        `).get(user.id);
        
        const storageMB = Math.round((storageQuery?.storage_kb || 0) / 1024 * 100) / 100;
        
        // Update user statistics
        const result = db.prepare(`
            UPDATE users 
            SET total_businesses = ?, storage_used_mb = ?, last_sync = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(businessCount?.count || 0, storageMB, user.id);
        
        console.log(`   ✅ Updated: ${businessCount?.count || 0} businesses, ${storageMB} MB storage`);
    }
    
    console.log('\n🎉 User statistics update completed successfully!');
    
    // Show final stats
    console.log('\n📈 Final user statistics:');
    const finalStats = db.prepare(`
        SELECT username, total_businesses, storage_used_mb, last_sync 
        FROM users 
        ORDER BY total_businesses DESC
    `).all();
    
    finalStats.forEach(user => {
        console.log(`   ${user.username}: ${user.total_businesses} businesses, ${user.storage_used_mb} MB`);
    });
    
    db.close();
    
} catch (error) {
    console.error('❌ Error updating user statistics:', error);
    process.exit(1);
}
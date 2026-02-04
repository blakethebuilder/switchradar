const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

// Configuration
const PRODUCTION_API = 'https://map.smartintegrate.co.za/api';
const LOCAL_DB_PATH = path.resolve(__dirname, '../data/switchradar.db');

// Production credentials
const PROD_USERNAME = 'blake';
const PROD_PASSWORD = 'Smart@2026!';

async function syncUsersFromProduction() {
    console.log('🚀 Starting user sync from production...');
    
    try {
        // 1. Login to production
        console.log('🔐 Logging into production...');
        const loginResponse = await fetch(`${PRODUCTION_API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: PROD_USERNAME,
                password: PROD_PASSWORD
            })
        });
        
        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Successfully logged into production');
        
        // 2. Fetch users from production
        console.log('📥 Fetching users from production...');
        const usersResponse = await fetch(`${PRODUCTION_API}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!usersResponse.ok) {
            throw new Error(`Failed to fetch users: ${usersResponse.status}`);
        }
        
        const usersData = await usersResponse.json();
        const productionUsers = usersData.data || usersData;
        console.log(`📊 Found ${productionUsers.length} users in production:`, 
            productionUsers.map(u => u.username));
        
        // 3. Open local database
        console.log('💾 Opening local database...');
        const db = new Database(LOCAL_DB_PATH);
        
        // 4. Get existing local users
        const existingUsers = db.prepare('SELECT username FROM users').all();
        const existingUsernames = existingUsers.map(u => u.username);
        console.log(`📊 Found ${existingUsers.length} existing local users:`, existingUsernames);
        
        // 5. Sync users
        let syncedCount = 0;
        let skippedCount = 0;
        
        for (const prodUser of productionUsers) {
            if (existingUsernames.includes(prodUser.username)) {
                console.log(`⏭️ Skipping existing user: ${prodUser.username}`);
                skippedCount++;
                continue;
            }
            
            // Create user with a default password (they'll need to reset)
            const defaultPassword = 'TempPass123!';
            const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
            
            try {
                const result = db.prepare(`
                    INSERT INTO users (username, password, created_at, last_sync, total_businesses, storage_used_mb)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    prodUser.username,
                    hashedPassword,
                    prodUser.created_at || new Date().toISOString(),
                    prodUser.last_sync,
                    prodUser.total_businesses || 0,
                    prodUser.storage_used_mb || 0
                );
                
                console.log(`✅ Created user: ${prodUser.username} (ID: ${result.lastInsertRowid})`);
                syncedCount++;
            } catch (error) {
                console.error(`❌ Failed to create user ${prodUser.username}:`, error.message);
            }
        }
        
        db.close();
        
        console.log('🎉 User sync completed!');
        console.log(`📊 Summary: ${syncedCount} synced, ${skippedCount} skipped`);
        console.log('⚠️ Note: New users have default password "TempPass123!" - they should change it');
        
    } catch (error) {
        console.error('💥 Sync failed:', error.message);
        process.exit(1);
    }
}

// Run the sync
syncUsersFromProduction();
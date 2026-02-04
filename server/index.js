require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const auth = require('./middleware/auth');
const APIAlignmentService = require('./services/apiAlignment');

const app = express();
const PORT = process.env.PORT || 5001;

// Debug environment variables
console.log('🔍 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);

// JWT_SECRET with fallback for production
let JWT_SECRET = process.env.JWT_SECRET;

// If no JWT_SECRET in production, try to use the known production key
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.log('⚠️ No JWT_SECRET found, using production fallback');
    JWT_SECRET = '10WLkV5qHvXMgADdHm78e6DlBdH8SC4kmFUBSWaEDIQ';
}

if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is required');
    console.error('Please set JWT_SECRET in your environment variables');
    process.exit(1);
}

console.log('✅ JWT_SECRET configured successfully');

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase JSON payload limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Increase URL-encoded payload limit

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: 'SwitchRadar API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'SwitchRadar API Server',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Initialize API Alignment Service
const apiAlignment = new APIAlignmentService(app);

// Seed default users for authentication
const seedDefaultUsers = async () => {
    const defaultUsers = [
        { username: 'blake', password: 'Smart@2026!' }
    ];
    
    for (const user of defaultUsers) {
        try {
            const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(user.username);
            if (!existing) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(user.username, hashedPassword);
                console.log(`✓ Seeded user: ${user.username} with ID: ${result.lastInsertRowid}`);
            }
        } catch (err) {
            console.error(`✗ Error seeding user ${user.username}:`, err.message);
        }
    }
    
    // Create default dataset after users are seeded
    try {
        const defaultDataset = db.prepare('SELECT * FROM datasets WHERE id = 1').get();
        if (!defaultDataset) {
            // Get the first user (should be blake with ID 1)
            const firstUser = db.prepare('SELECT * FROM users ORDER BY id LIMIT 1').get();
            if (firstUser) {
                db.prepare(`
                    INSERT INTO datasets (id, name, description, created_by, business_count, is_active)
                    VALUES (1, 'Default Dataset', 'Default dataset for imported businesses', ?, 0, 1)
                `).run(firstUser.id);
                console.log(`✓ Created default dataset with creator ID: ${firstUser.id}`);
            } else {
                console.error('✗ No users found to create default dataset');
            }
        }
    } catch (e) {
        console.error('✗ Error creating default dataset:', e.message);
    }
};

// Seed users on startup
seedDefaultUsers();

// Auth Routes
app.get('/api/auth/ping', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        server: 'SwitchRadar API',
        version: '1.0.0'
    });
});

// Test database connection
app.get('/api/health', (req, res) => {
    try {
        // Test database connection
        const testQuery = db.prepare('SELECT COUNT(*) as count FROM users').get();
        res.json({
            status: 'healthy',
            database: 'connected',
            userCount: testQuery.count,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        const result = stmt.run(username, hashedPassword);
        res.status(201).json({ message: 'User created', userId: result.lastInsertRowid });
    } catch (error) {
        res.status(400).json({ message: 'Username already exists' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('🔐 Login attempt for username:', username);
    
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        console.log('❌ Login failed: Invalid credentials for', username);
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Determine user role - blake is always admin
    let role = 'user';
    if (username.toLowerCase() === 'blake') {
        role = 'admin';
    }

    console.log('🎫 Generating JWT token with secret:', JWT_SECRET.substring(0, 10) + '...');
    const tokenPayload = { userId: user.id, username: user.username, role };
    console.log('📦 Token payload:', tokenPayload);
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
    console.log('✅ Token generated successfully:', token.substring(0, 20) + '...');
    
    const response = { 
        token, 
        userId: user.id, 
        username: user.username,
        role,
        email: username.toLowerCase() === 'blake' ? 'blake@smartintegrateco.za' : `${username.toLowerCase()}@switchradar.com`,
        createdAt: user.created_at
    };
    
    console.log('📤 Login response:', { ...response, token: token.substring(0, 20) + '...' });
    res.json(response);
});

// Route Planner Routes
app.get('/api/route', auth, (req, res) => {
    const routes = db.prepare('SELECT * FROM routes WHERE userId = ? ORDER BY "order"').all(req.userData.userId);
    res.json(routes);
});

app.post('/api/route/sync', auth, (req, res) => {
    const { routeItems } = req.body;
    const userId = req.userData.userId;

    const deleteStmt = db.prepare('DELETE FROM routes WHERE userId = ?');
    const insertStmt = db.prepare('INSERT INTO routes (userId, businessId, "order", addedAt) VALUES (?, ?, ?, ?)');

    const transaction = db.transaction((items) => {
        deleteStmt.run(userId);
        for (const item of items) {
            insertStmt.run(userId, item.businessId, item.order, item.addedAt);
        }
    });

    transaction(routeItems);
    res.json({ message: 'Route sync successful' });
});

// Dataset Management Routes
app.get('/api/datasets', auth, (req, res) => {
    try {
        const userId = req.userData.userId;
        const { role } = req.userData;
        
        let datasets;
        if (role === 'admin') {
            // Admins can see all datasets
            datasets = db.prepare(`
                SELECT d.*, u.username as created_by_name,
                       COUNT(l.id) as business_count
                FROM datasets d
                LEFT JOIN users u ON d.created_by = u.id
                LEFT JOIN leads l ON d.id = l.dataset_id
                WHERE d.is_active = 1
                GROUP BY d.id
                ORDER BY d.created_at DESC
            `).all();
        } else {
            // Regular users can only see datasets they have permission for
            datasets = db.prepare(`
                SELECT d.*, u.username as created_by_name,
                       COUNT(l.id) as business_count,
                       dp.permission_level
                FROM datasets d
                LEFT JOIN users u ON d.created_by = u.id
                LEFT JOIN dataset_permissions dp ON d.id = dp.dataset_id AND dp.user_id = ?
                LEFT JOIN leads l ON d.id = l.dataset_id
                WHERE d.is_active = 1 AND (d.created_by = ? OR dp.user_id = ?)
                GROUP BY d.id
                ORDER BY d.created_at DESC
            `).all(userId, userId, userId);
        }
        
        res.json({
            datasets,
            userRole: role,
            canCreateDatasets: role === 'admin'
        });
    } catch (error) {
        console.error('Failed to fetch datasets:', error);
        res.status(500).json({ message: 'Failed to fetch datasets', error: error.message });
    }
});

app.post('/api/datasets', auth, (req, res) => {
    try {
        const { name, description, town, province } = req.body;
        const userId = req.userData.userId;
        const { role } = req.userData;
        
        if (role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can create datasets' });
        }
        
        if (!name || !town) {
            return res.status(400).json({ message: 'Dataset name and town are required' });
        }
        
        const result = db.prepare(`
            INSERT INTO datasets (name, description, town, province, created_by)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, description, town, province, userId);
        
        // Grant admin permission to creator
        db.prepare(`
            INSERT INTO dataset_permissions (dataset_id, user_id, permission_level, granted_by)
            VALUES (?, ?, 'admin', ?)
        `).run(result.lastInsertRowid, userId, userId);
        
        res.status(201).json({
            message: 'Dataset created successfully',
            datasetId: result.lastInsertRowid,
            name,
            town,
            province
        });
    } catch (error) {
        console.error('Failed to create dataset:', error);
        res.status(500).json({ message: 'Failed to create dataset', error: error.message });
    }
});

// Grant dataset access to user
app.post('/api/datasets/:datasetId/permissions', auth, (req, res) => {
    try {
        const { datasetId } = req.params;
        const { userId: targetUserId, permissionLevel = 'read' } = req.body;
        const grantedBy = req.userData.userId;
        const { role } = req.userData;
        
        if (role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can grant dataset permissions' });
        }
        
        // Check if dataset exists
        const dataset = db.prepare('SELECT * FROM datasets WHERE id = ? AND is_active = 1').get(datasetId);
        if (!dataset) {
            return res.status(404).json({ message: 'Dataset not found' });
        }
        
        // Check if user exists
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Grant or update permission
        db.prepare(`
            INSERT OR REPLACE INTO dataset_permissions (dataset_id, user_id, permission_level, granted_by)
            VALUES (?, ?, ?, ?)
        `).run(datasetId, targetUserId, permissionLevel, grantedBy);
        
        res.json({
            message: 'Permission granted successfully',
            datasetId,
            userId: targetUserId,
            permissionLevel
        });
    } catch (error) {
        console.error('Failed to grant dataset permission:', error);
        res.status(500).json({ message: 'Failed to grant permission', error: error.message });
    }
});
app.delete('/api/workspace', auth, (req, res) => {
    const userId = req.userData.userId;
    const deleteLeads = db.prepare('DELETE FROM leads WHERE userId = ?');
    const deleteRoutes = db.prepare('DELETE FROM routes WHERE userId = ?');

    const transaction = db.transaction(() => {
        deleteLeads.run(userId);
        deleteRoutes.run(userId);
    });

    try {
        transaction();
        res.json({ message: 'Cloud workspace cleared successfully' });
    } catch (err) {
        console.error('Workspace clear error:', err);
        res.status(500).json({ message: 'Failed to clear workspace' });
    }
});

// Business Routes with enhanced filtering and multi-dataset support
app.get('/api/businesses', auth, (req, res) => {
    const startTime = Date.now();
    console.log('📥 GET /api/businesses - Request received');
    
    try {
        const { 
            page = 1, 
            limit = 10000, // Increase default limit for better performance
            search = '', 
            category = '', 
            provider = '', 
            town = '',
            status = '',
            phoneType = 'all',
            datasets = '', // Comma-separated dataset IDs
            lat,
            lng,
            radius
        } = req.query;
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const userId = req.userData.userId;
        const { role } = req.userData;
        
        console.log('🔍 Query params:', { page, limit, search, category, provider, town, userId, role });
        
        // Simplified query for better performance
        let baseQuery = `
            SELECT l.*, d.name as dataset_name 
            FROM leads l 
            LEFT JOIN datasets d ON l.dataset_id = d.id 
            WHERE 1=1
        `;
        
        let params = [];
        
        // For regular users, only show their data or data they have permission to see
        if (role !== 'admin') {
            baseQuery += ` AND (l.userId = ? OR l.dataset_id IN (
                SELECT dp.dataset_id FROM dataset_permissions dp 
                WHERE dp.user_id = ?
            ))`;
            params.push(userId, userId);
        }
        
        // Add filters
        if (search) {
            baseQuery += ` AND (l.name LIKE ? OR l.address LIKE ? OR l.phone LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (category) {
            baseQuery += ` AND l.category = ?`;
            params.push(category);
        }
        
        if (provider) {
            baseQuery += ` AND l.provider = ?`;
            params.push(provider);
        }
        
        if (town) {
            baseQuery += ` AND l.town = ?`;
            params.push(town);
        }
        
        if (status) {
            baseQuery += ` AND l.status = ?`;
            params.push(status);
        }
        
        // Phone type filter
        if (phoneType === 'landline') {
            baseQuery += ` AND (l.phone LIKE '0%' OR l.phone LIKE '+27%')`;
        } else if (phoneType === 'mobile') {
            baseQuery += ` AND (l.phone LIKE '06%' OR l.phone LIKE '07%' OR l.phone LIKE '08%' OR l.phone LIKE '09%')`;
        }
        
        // Add ordering and pagination
        baseQuery += ` ORDER BY l.last_modified DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        
        console.log('🔍 Executing query with', params.length, 'parameters');
        const queryStart = Date.now();
        
        const businesses = db.prepare(baseQuery).all(...params);
        
        const queryTime = Date.now() - queryStart;
        console.log('⚡ Query executed in', queryTime, 'ms, found', businesses.length, 'businesses');
        
        // Transform the data to match frontend expectations
        const transformedBusinesses = businesses.map(business => ({
            ...business,
            coordinates: business.lat && business.lng ? {
                lat: parseFloat(business.lat),
                lng: parseFloat(business.lng)
            } : null,
            notes: business.notes ? JSON.parse(business.notes) : [],
            metadata: business.metadata ? JSON.parse(business.metadata) : {}
        }));
        
        console.log('🔄 Transformed businesses with coordinates:', {
            total: transformedBusinesses.length,
            withCoordinates: transformedBusinesses.filter(b => b.coordinates).length,
            sampleCoordinates: transformedBusinesses.slice(0, 3).map(b => ({
                id: b.id,
                name: b.name,
                coordinates: b.coordinates,
                rawLat: b.lat,
                rawLng: b.lng
            }))
        });
        
        // Get total count for pagination (simplified)
        let countQuery = `SELECT COUNT(*) as total FROM leads l WHERE 1=1`;
        let countParams = [];
        
        if (role !== 'admin') {
            countQuery += ` AND (l.userId = ? OR l.dataset_id IN (
                SELECT dp.dataset_id FROM dataset_permissions dp 
                WHERE dp.user_id = ?
            ))`;
            countParams.push(userId, userId);
        }
        
        const totalResult = db.prepare(countQuery).get(...countParams);
        const total = totalResult?.total || 0;
        
        const totalTime = Date.now() - startTime;
        console.log('✅ GET /api/businesses completed in', totalTime, 'ms');
        
        res.json({
            data: transformedBusinesses,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            performance: {
                queryTime,
                totalTime,
                resultCount: transformedBusinesses.length
            }
        });
        
    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error('❌ GET /api/businesses error after', totalTime, 'ms:', error);
        res.status(500).json({ 
            message: 'Failed to fetch businesses', 
            error: error.message,
            performance: { totalTime }
        });
    }
});

// Enhanced business sync with better error handling and chunked upload support
app.post('/api/businesses/sync', auth, (req, res) => {
    console.log('=== BUSINESS SYNC REQUEST RECEIVED ===');
    console.log('User ID:', req.userData.userId);
    console.log('Username:', req.userData.username);
    console.log('Request body keys:', Object.keys(req.body));
    
    // Debug: Check datasets table
    try {
        const datasets = db.prepare('SELECT * FROM datasets').all();
        console.log('📊 Available datasets:', datasets);
        
        const defaultDataset = db.prepare('SELECT * FROM datasets WHERE id = 1').get();
        console.log('📊 Default dataset (id=1):', defaultDataset);
    } catch (error) {
        console.error('❌ Error checking datasets:', error.message);
    }
    
    const { businesses, isChunked, chunkIndex, totalChunks, clearFirst } = req.body;
    const userId = req.userData.userId;

    if (!businesses || !Array.isArray(businesses)) {
        console.log('❌ Invalid businesses data:', typeof businesses, Array.isArray(businesses));
        return res.status(400).json({ message: 'Invalid businesses data' });
    }

    console.log('✅ Received', businesses.length, 'businesses for sync');
    if (isChunked) {
        console.log(`📦 Chunked upload: chunk ${chunkIndex + 1}/${totalChunks}`);
    }

    // Create or find dataset for this import
    let datasetId = 1; // Default fallback
    try {
        const importSource = req.body.source || req.body.fileName || 'Import';
        const importTown = req.body.town || 'Mixed';
        
        // First, ensure default dataset exists
        let defaultDataset = db.prepare('SELECT * FROM datasets WHERE id = 1').get();
        if (!defaultDataset) {
            console.log('🔧 Creating missing default dataset...');
            try {
                db.prepare(`
                    INSERT INTO datasets (id, name, description, created_by, business_count, is_active)
                    VALUES (1, 'Default Dataset', 'Default dataset for imported businesses', ?, 0, 1)
                `).run(userId);
                console.log('✅ Created default dataset with ID: 1');
            } catch (createError) {
                console.error('❌ Failed to create default dataset:', createError.message);
                // Continue with datasetId = 1, might work anyway
            }
        }
        
        // Try to find existing dataset with same name
        let dataset = db.prepare(`
            SELECT id FROM datasets 
            WHERE name = ? AND created_by = ? AND is_active = 1
        `).get(importSource, userId);
        
        if (!dataset) {
            // Create new dataset for this import
            const result = db.prepare(`
                INSERT INTO datasets (name, description, town, province, created_by)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                importSource,
                `Imported dataset: ${importSource}`,
                importTown,
                'Various',
                userId
            );
            
            datasetId = result.lastInsertRowid;
            
            // Grant admin permission to creator
            db.prepare(`
                INSERT INTO dataset_permissions (dataset_id, user_id, permission_level, granted_by)
                VALUES (?, ?, 'admin', ?)
            `).run(datasetId, userId, userId);
            
            console.log(`✓ Created new dataset "${importSource}" with ID:`, datasetId);
        } else {
            datasetId = dataset.id;
            console.log(`✓ Using existing dataset "${importSource}" with ID:`, datasetId);
        }
    } catch (error) {
        console.error('❌ Failed to create/find dataset:', error.message);
        // Continue with default dataset
        datasetId = 1;
    }

    const deleteStmt = db.prepare('DELETE FROM leads WHERE userId = ?');
    const insertStmt = db.prepare(`
        INSERT INTO leads (id, userId, name, address, phone, email, website, provider, category, town, province, lat, lng, status, notes, importedAt, source, metadata, dataset_id)
        VALUES (@id, @userId, @name, @address, @phone, @email, @website, @provider, @category, @town, @province, @lat, @lng, @status, @notes, @importedAt, @source, @metadata, @dataset_id)
    `);

    const transaction = db.transaction((businessesToSync) => {
        console.log(`🔄 Starting transaction for ${businessesToSync.length} businesses`);
        
        // Only clear existing data on first chunk or non-chunked uploads
        if (!isChunked || (isChunked && chunkIndex === 0) || clearFirst !== false) {
            try {
                const deleteResult = deleteStmt.run(userId);
                console.log(`🗑️ Cleared ${deleteResult.changes} existing businesses for user ${userId}`);
            } catch (error) {
                console.error('❌ Failed to clear existing businesses:', error);
                throw error;
            }
        }
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (let i = 0; i < businessesToSync.length; i++) {
            const business = businessesToSync[i];
            try {
                const businessData = {
                    id: business.id,
                    userId,
                    name: business.name || null,
                    address: business.address || null,
                    phone: business.phone || null,
                    email: business.email || null,
                    website: business.website || null,
                    provider: business.provider || null,
                    category: business.category || null,
                    town: business.town || null,
                    province: business.province || null,
                    lat: business.coordinates?.lat || business.lat || null,
                    lng: business.coordinates?.lng || business.lng || null,
                    status: business.status || 'active',
                    notes: JSON.stringify(business.notes || []),
                    metadata: JSON.stringify(business.metadata || {}),
                    importedAt: business.importedAt || new Date().toISOString(),
                    source: business.source || 'import',
                    dataset_id: datasetId // Use the created/found dataset
                };
                
                // Log first few businesses for debugging
                if (i < 3) {
                    console.log(`📊 Business ${i} data sample:`, {
                        id: businessData.id,
                        name: businessData.name,
                        userId: businessData.userId,
                        dataset_id: businessData.dataset_id,
                        coordinates: { lat: businessData.lat, lng: businessData.lng }
                    });
                }
                
                const result = insertStmt.run(businessData);
                successCount++;
                
                if (i < 3) {
                    console.log(`✅ Business ${i} inserted successfully, rowid:`, result.lastInsertRowid);
                }
            } catch (error) {
                errorCount++;
                const errorDetail = {
                    businessId: business.id,
                    businessName: business.name,
                    error: error.message,
                    code: error.code,
                    errno: error.errno
                };
                errors.push(errorDetail);
                
                // Log first few errors in detail
                if (errorCount <= 3) {
                    console.error(`❌ Failed to sync business ${business.id} (${business.name}):`, {
                        error: error.message,
                        code: error.code,
                        errno: error.errno,
                        businessData: {
                            id: business.id,
                            name: business.name,
                            userId,
                            dataset_id: datasetId
                        }
                    });
                }
            }
        }
        
        console.log(`✅ Sync completed: ${successCount} success, ${errorCount} errors`);
        return { successCount, errorCount, errors };
    });

    try {
        const result = transaction(businesses);
        
        // Update user's last sync timestamp
        db.prepare('UPDATE users SET last_sync = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
        
        console.log('🎉 Business sync transaction completed successfully');
        
        res.json({ 
            message: isChunked ? `Chunk ${chunkIndex + 1}/${totalChunks} sync completed` : 'Business sync completed',
            totalReceived: businesses.length,
            successCount: result.successCount,
            errorCount: result.errorCount,
            errors: result.errors,
            timestamp: new Date().toISOString(),
            isChunked,
            chunkIndex,
            totalChunks
        });
    } catch (error) {
        console.error('💥 Business sync transaction error:', error);
        res.status(500).json({ 
            message: 'Business sync failed', 
            error: error.message,
            totalReceived: businesses.length
        });
    }
});

// User Management Routes (Admin only)
app.get('/api/users', auth, (req, res) => {
    console.log('📥 GET /api/users - Request received from user:', req.userData.username);
    const { role } = req.userData;
    
    if (role !== 'admin') {
        console.log('❌ Access denied - user is not admin:', role);
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
        const users = db.prepare(`
            SELECT id, username, created_at, last_sync, total_businesses, storage_used_mb
            FROM users 
            ORDER BY created_at DESC
        `).all();
        
        console.log('✅ Returning', users.length, 'users');
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

app.post('/api/users', auth, (req, res) => {
    console.log('📥 POST /api/users - Create user request received from:', req.userData.username);
    const { role } = req.userData;
    const { username, password } = req.body;
    
    console.log('📊 Request data:', { username, passwordLength: password?.length, userRole: role });
    
    if (role !== 'admin') {
        console.log('❌ Access denied - user is not admin:', role);
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (!username || !password) {
        console.log('❌ Missing required fields:', { username: !!username, password: !!password });
        return res.status(400).json({ message: 'Username and password required' });
    }
    
    try {
        console.log('🔐 Hashing password for user:', username);
        const hashedPassword = bcrypt.hashSync(password, 10);
        console.log('💾 Inserting user into database...');
        
        // Test database connection first
        try {
            const testQuery = db.prepare('SELECT COUNT(*) as count FROM users').get();
            console.log('✅ Database connection test passed, current user count:', testQuery.count);
        } catch (dbError) {
            console.error('❌ Database connection test failed:', dbError);
            throw new Error('Database connection failed: ' + dbError.message);
        }
        
        const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
        
        console.log('✅ User created successfully:', { userId: result.lastInsertRowid, username });
        res.status(201).json({ 
            message: 'User created successfully',
            userId: result.lastInsertRowid,
            username 
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            console.log('❌ Username already exists:', username);
            res.status(400).json({ message: 'Username already exists' });
        } else {
            console.error('❌ Failed to create user:', error);
            res.status(500).json({ message: 'Failed to create user' });
        }
    }
});

app.delete('/api/users/:userId', auth, (req, res) => {
    const { role, userId: currentUserId } = req.userData;
    const { userId } = req.params;
    
    if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (parseInt(userId) === currentUserId) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    try {
        // Delete user's data first
        db.prepare('DELETE FROM leads WHERE userId = ?').run(userId);
        db.prepare('DELETE FROM routes WHERE userId = ?').run(userId);
        
        // Delete user
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        
        if (result.changes === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({ message: 'User and all associated data deleted successfully' });
    } catch (error) {
        console.error('Failed to delete user:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

app.get('/api/users/:userId/businesses', auth, (req, res) => {
    const { role } = req.userData;
    const { userId } = req.params;
    
    if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
        const businesses = db.prepare('SELECT * FROM leads WHERE userId = ? ORDER BY name').all(userId);
        
        const formattedBusinesses = businesses.map(business => ({
            ...business,
            coordinates: { lat: business.lat, lng: business.lng },
            notes: JSON.parse(business.notes || '[]'),
            metadata: JSON.parse(business.metadata || '{}')
        }));
        
        res.json(formattedBusinesses);
    } catch (error) {
        console.error('Failed to fetch user businesses:', error);
        res.status(500).json({ message: 'Failed to fetch user businesses' });
    }
});

app.delete('/api/users/:userId/businesses/:businessId', auth, (req, res) => {
    const { role } = req.userData;
    const { userId, businessId } = req.params;
    
    if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
        const result = db.prepare('DELETE FROM leads WHERE userId = ? AND id = ?').run(userId, businessId);
        
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Business not found' });
        }
        
        res.json({ message: 'Business deleted successfully' });
    } catch (error) {
        console.error('Failed to delete business:', error);
        res.status(500).json({ message: 'Failed to delete business' });
    }
});

app.delete('/api/users/:userId/businesses', auth, (req, res) => {
    const { role } = req.userData;
    const { userId } = req.params;
    
    if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
        const result = db.prepare('DELETE FROM leads WHERE userId = ?').run(userId);
        
        res.json({ 
            message: 'All user businesses deleted successfully',
            deletedCount: result.changes 
        });
    } catch (error) {
        console.error('Failed to delete user businesses:', error);
        res.status(500).json({ message: 'Failed to delete user businesses' });
    }
});

// Get aggregated statistics for current user's workspace
app.get('/api/stats', auth, (req, res) => {
    try {
        const userId = req.userData.userId;
        
        // Get total counts for this user
        const totalBusinesses = db.prepare('SELECT COUNT(*) as count FROM leads WHERE userId = ?').get(userId).count;
        
        // Get provider breakdown for this user
        const providerStats = db.prepare(`
            SELECT provider, COUNT(*) as count 
            FROM leads 
            WHERE userId = ? 
            GROUP BY provider 
            ORDER BY count DESC
        `).all(userId);
        
        // Get category breakdown for this user
        const categoryStats = db.prepare(`
            SELECT category, COUNT(*) as count 
            FROM leads 
            WHERE userId = ? 
            GROUP BY category 
            ORDER BY count DESC
        `).all(userId);
        
        // Get town breakdown for this user
        const townStats = db.prepare(`
            SELECT town, COUNT(*) as count 
            FROM leads 
            WHERE userId = ? 
            GROUP BY town 
            ORDER BY count DESC 
            LIMIT 20
        `).all(userId);
        
        // Get status breakdown for this user
        const statusStats = db.prepare(`
            SELECT status, COUNT(*) as count 
            FROM leads 
            WHERE userId = ? 
            GROUP BY status
        `).all(userId);
        
        res.json({
            userId,
            username: req.userData.username,
            totalBusinesses,
            providerStats,
            categoryStats,
            townStats,
            statusStats,
            workspaceInfo: {
                isPersonalWorkspace: true,
                canViewOtherWorkspaces: req.userData.role === 'admin'
            }
        });
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
    }
});

// Admin-only: Get all workspaces overview
app.get('/api/workspaces', auth, (req, res) => {
    const { role } = req.userData;
    
    if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
        const workspaces = db.prepare(`
            SELECT 
                u.id as userId,
                u.username,
                u.created_at,
                u.last_sync,
                COUNT(l.id) as businessCount,
                COUNT(DISTINCT l.provider) as providerCount,
                COUNT(DISTINCT l.town) as townCount,
                COUNT(DISTINCT l.category) as categoryCount,
                MIN(l.importedAt) as firstImport,
                MAX(l.importedAt) as lastImport
            FROM users u
            LEFT JOIN leads l ON u.id = l.userId
            GROUP BY u.id, u.username, u.created_at, u.last_sync
            ORDER BY businessCount DESC
        `).all();
        
        res.json({
            workspaces: workspaces.map(workspace => ({
                ...workspace,
                storageUsedMB: (workspace.businessCount * 0.002).toFixed(2), // Rough estimate
                isActive: workspace.businessCount > 0
            }))
        });
    } catch (error) {
        console.error('Workspaces fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch workspaces', error: error.message });
    }
});

// Sharing endpoints - Share towns with users
app.post('/api/share/towns', auth, (req, res) => {
    const { role } = req.userData;
    const { targetUserId, towns } = req.body;
    const sharedBy = req.userData.userId;
    
    if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (!targetUserId || !towns || !Array.isArray(towns)) {
        return res.status(400).json({ message: 'Target user ID and towns array required' });
    }
    
    try {
        // Check if target user exists
        const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }
        
        // Get businesses from specified towns
        const townPlaceholders = towns.map(() => '?').join(',');
        const businesses = db.prepare(`
            SELECT * FROM leads 
            WHERE userId = ? AND town IN (${townPlaceholders})
            ORDER BY town, name
        `).all(sharedBy, ...towns);
        
        if (businesses.length === 0) {
            return res.status(404).json({ message: 'No businesses found in specified towns' });
        }
        
        // Copy businesses to target user
        const insertStmt = db.prepare(`
            INSERT INTO leads (id, userId, name, address, phone, email, website, provider, category, town, province, lat, lng, status, notes, importedAt, source, metadata, dataset_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        let copiedCount = 0;
        const transaction = db.transaction(() => {
            for (const business of businesses) {
                const newId = `shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                try {
                    insertStmt.run(
                        newId,
                        targetUserId,
                        business.name,
                        business.address,
                        business.phone,
                        business.email,
                        business.website,
                        business.provider,
                        business.category,
                        business.town,
                        business.province,
                        business.lat,
                        business.lng,
                        business.status,
                        business.notes,
                        new Date().toISOString(),
                        `shared_from_${req.userData.username}`,
                        business.metadata,
                        business.dataset_id || 1
                    );
                    copiedCount++;
                } catch (error) {
                    console.error('Failed to copy business:', business.id, error.message);
                }
            }
        });
        
        transaction();
        
        res.json({
            message: `Successfully shared ${copiedCount} businesses from ${towns.length} towns`,
            sharedTowns: towns,
            businessesShared: copiedCount,
            targetUser: targetUser.username
        });
        
    } catch (error) {
        console.error('Failed to share towns:', error);
        res.status(500).json({ message: 'Failed to share towns', error: error.message });
    }
});

// Share specific businesses with users
app.post('/api/share/businesses', auth, (req, res) => {
    const { role } = req.userData;
    const { targetUserId, businessIds } = req.body;
    const sharedBy = req.userData.userId;
    
    if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (!targetUserId || !businessIds || !Array.isArray(businessIds)) {
        return res.status(400).json({ message: 'Target user ID and business IDs array required' });
    }
    
    try {
        // Check if target user exists
        const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }
        
        // Get specified businesses
        const businessPlaceholders = businessIds.map(() => '?').join(',');
        const businesses = db.prepare(`
            SELECT * FROM leads 
            WHERE userId = ? AND id IN (${businessPlaceholders})
            ORDER BY name
        `).all(sharedBy, ...businessIds);
        
        if (businesses.length === 0) {
            return res.status(404).json({ message: 'No businesses found with specified IDs' });
        }
        
        // Copy businesses to target user
        const insertStmt = db.prepare(`
            INSERT INTO leads (id, userId, name, address, phone, email, website, provider, category, town, province, lat, lng, status, notes, importedAt, source, metadata, dataset_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        let copiedCount = 0;
        const transaction = db.transaction(() => {
            for (const business of businesses) {
                const newId = `shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                try {
                    insertStmt.run(
                        newId,
                        targetUserId,
                        business.name,
                        business.address,
                        business.phone,
                        business.email,
                        business.website,
                        business.provider,
                        business.category,
                        business.town,
                        business.province,
                        business.lat,
                        business.lng,
                        business.status,
                        business.notes,
                        new Date().toISOString(),
                        `shared_from_${req.userData.username}`,
                        business.metadata,
                        business.dataset_id || 1
                    );
                    copiedCount++;
                } catch (error) {
                    console.error('Failed to copy business:', business.id, error.message);
                }
            }
        });
        
        transaction();
        
        res.json({
            message: `Successfully shared ${copiedCount} businesses`,
            businessesShared: copiedCount,
            targetUser: targetUser.username
        });
        
    } catch (error) {
        console.error('Failed to share businesses:', error);
        res.status(500).json({ message: 'Failed to share businesses', error: error.message });
    }
});

// Get available towns for sharing
app.get('/api/share/towns', auth, (req, res) => {
    const { role } = req.userData;
    const userId = req.userData.userId;
    
    if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
        const towns = db.prepare(`
            SELECT town, COUNT(*) as businessCount
            FROM leads 
            WHERE userId = ? AND town IS NOT NULL AND town != ''
            GROUP BY town
            ORDER BY businessCount DESC, town ASC
        `).all(userId);
        
        res.json({
            towns: towns.map(t => ({
                name: t.town,
                businessCount: t.businessCount
            }))
        });
        
    } catch (error) {
        console.error('Failed to fetch towns:', error);
        res.status(500).json({ message: 'Failed to fetch towns', error: error.message });
    }
});

// Bulk operations endpoint
app.post('/api/businesses/bulk', auth, (req, res) => {
    const { action, businessIds, updates } = req.body;
    const userId = req.userData.userId;
    
    try {
        if (action === 'update' && updates) {
            const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const updateValues = Object.values(updates);
            
            const stmt = db.prepare(`
                UPDATE leads 
                SET ${updateFields}, last_modified = CURRENT_TIMESTAMP
                WHERE userId = ? AND id IN (${businessIds.map(() => '?').join(',')})
            `);
            
            const result = stmt.run(...updateValues, userId, ...businessIds);
            res.json({ message: 'Bulk update successful', affected: result.changes });
            
        } else if (action === 'delete') {
            const stmt = db.prepare(`
                DELETE FROM leads 
                WHERE userId = ? AND id IN (${businessIds.map(() => '?').join(',')})
            `);
            
            const result = stmt.run(userId, ...businessIds);
            res.json({ message: 'Bulk delete successful', affected: result.changes });
            
        } else {
            res.status(400).json({ message: 'Invalid bulk action' });
        }
    } catch (error) {
        console.error('Bulk operation error:', error);
        res.status(500).json({ message: 'Bulk operation failed', error: error.message });
    }
});

// Export data for backup
app.get('/api/export/full', auth, (req, res) => {
    try {
        const userId = req.userData.userId;
        
        const businesses = db.prepare('SELECT * FROM leads WHERE userId = ?').all(userId);
        const routes = db.prepare('SELECT * FROM routes WHERE userId = ?').all(userId);
        const user = db.prepare('SELECT username, created_at FROM users WHERE id = ?').get(userId);
        
        const exportData = {
            exportedAt: new Date().toISOString(),
            user,
            businesses: businesses.map(business => ({
                ...business,
                coordinates: { lat: business.lat, lng: business.lng },
                notes: JSON.parse(business.notes || '[]'),
                metadata: JSON.parse(business.metadata || '{}')
            })),
            routes,
            summary: {
                totalBusinesses: businesses.length,
                totalRoutes: routes.length
            }
        };
        
        res.setHeader('Content-Disposition', `attachment; filename="switchradar-backup-${user.username}-${new Date().toISOString().split('T')[0]}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);
        
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Export failed', error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Server accessible at http://0.0.0.0:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Validate API endpoints on startup
    setTimeout(() => {
        apiAlignment.logEndpointStatus();
    }, 1000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});

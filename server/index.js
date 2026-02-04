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
    try {
        const { 
            page = 1, 
            limit = 1000, 
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
        
        // Build dataset filter
        let datasetFilter = '';
        let datasetParams = [];
        
        if (datasets && datasets.trim()) {
            const datasetIds = datasets.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (datasetIds.length > 0) {
                if (role === 'admin') {
                    // Admins can access any dataset
                    datasetFilter = `AND l.dataset_id IN (${datasetIds.map(() => '?').join(',')})`;
                    datasetParams = datasetIds;
                } else {
                    // Regular users need permission
                    datasetFilter = `AND l.dataset_id IN (
                        SELECT dp.dataset_id FROM dataset_permissions dp 
                        WHERE dp.user_id = ? AND dp.dataset_id IN (${datasetIds.map(() => '?').join(',')})
                    )`;
                    datasetParams = [userId, ...datasetIds];
                }
            }
        } else if (role !== 'admin') {
            // If no specific datasets requested, show user's accessible datasets
            datasetFilter = `AND l.dataset_id IN (
                SELECT dp.dataset_id FROM dataset_permissions dp WHERE dp.user_id = ?
                UNION
                SELECT d.id FROM datasets d WHERE d.created_by = ?
            )`;
            datasetParams = [userId, userId];
        }
        
        // Build dynamic query
        let whereClause = 'WHERE 1=1';
        let params = [];
        
        // Add dataset filter
        if (datasetFilter) {
            whereClause += ` ${datasetFilter}`;
            params.push(...datasetParams);
        }
        
        if (search) {
            whereClause += ' AND (l.name LIKE ? OR l.address LIKE ? OR l.phone LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (category) {
            whereClause += ' AND l.category = ?';
            params.push(category);
        }
        
        if (provider) {
            whereClause += ' AND l.provider = ?';
            params.push(provider);
        }
        
        if (town) {
            whereClause += ' AND l.town = ?';
            params.push(town);
        }
        
        if (status) {
            whereClause += ' AND l.status = ?';
            params.push(status);
        }
        
        // Distance filtering using Haversine formula in SQLite
        if (lat && lng && radius) {
            whereClause += ` AND (
                6371 * acos(
                    cos(radians(?)) * cos(radians(l.lat)) * 
                    cos(radians(l.lng) - radians(?)) + 
                    sin(radians(?)) * sin(radians(l.lat))
                )
            ) <= ?`;
            params.push(parseFloat(lat), parseFloat(lng), parseFloat(lat), parseFloat(radius));
        }
        
        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM leads l 
            LEFT JOIN datasets d ON l.dataset_id = d.id 
            ${whereClause}
        `;
        const totalResult = db.prepare(countQuery).get(...params);
        const total = totalResult.total;
        
        // Get paginated results with dataset info
        const dataQuery = `
            SELECT l.*, d.name as dataset_name, d.town as dataset_town, d.province as dataset_province
            FROM leads l 
            LEFT JOIN datasets d ON l.dataset_id = d.id 
            ${whereClause} 
            ORDER BY l.name 
            LIMIT ? OFFSET ?
        `;
        const businesses = db.prepare(dataQuery).all(...params, parseInt(limit), offset);
        
        console.log(`✅ Fetched ${businesses.length} businesses for user ${req.userData.userId} (${req.userData.username}) from ${datasets || 'all accessible'} datasets`);
        
        res.json({
            data: businesses.map(business => ({
                ...business,
                coordinates: { lat: business.lat, lng: business.lng },
                notes: JSON.parse(business.notes || '[]'),
                metadata: JSON.parse(business.metadata || '{}'),
                dataset: {
                    id: business.dataset_id,
                    name: business.dataset_name,
                    town: business.dataset_town,
                    province: business.dataset_province
                }
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
                hasNext: offset + parseInt(limit) < total,
                hasPrev: parseInt(page) > 1
            },
            summary: {
                totalBusinesses: total,
                currentPage: parseInt(page),
                showing: Math.min(parseInt(limit), total - offset),
                datasetsQueried: datasets || 'all accessible'
            }
        });
    } catch (error) {
        console.error('❌ Error fetching businesses:', error);
        res.status(500).json({ 
            message: 'Failed to fetch businesses', 
            error: error.message,
            userId: req.userData?.userId,
            username: req.userData?.username
        });
    }
});

// Enhanced business sync with better error handling and chunked upload support
app.post('/api/businesses/sync', auth, (req, res) => {
    console.log('=== BUSINESS SYNC REQUEST RECEIVED ===');
    console.log('User ID:', req.userData.userId);
    console.log('Username:', req.userData.username);
    console.log('Request body keys:', Object.keys(req.body));
    
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

    // Ensure default dataset exists before inserting businesses
    try {
        let defaultDataset = db.prepare('SELECT * FROM datasets WHERE id = 1').get();
        if (!defaultDataset) {
            console.log('🔧 Default dataset not found, creating it...');
            db.prepare(`
                INSERT INTO datasets (id, name, description, created_by, business_count, is_active)
                VALUES (1, 'Default Dataset', 'Default dataset for imported businesses', ?, 0, 1)
            `).run(userId);
            console.log('✓ Created default dataset for user:', userId);
        }
    } catch (error) {
        console.error('❌ Failed to ensure default dataset exists:', error.message);
        return res.status(500).json({ 
            message: 'Database setup error', 
            error: error.message 
        });
    }

    const deleteStmt = db.prepare('DELETE FROM leads WHERE userId = ?');
    const insertStmt = db.prepare(`
        INSERT INTO leads (id, userId, name, address, phone, email, website, provider, category, town, province, lat, lng, status, notes, importedAt, source, metadata, dataset_id)
        VALUES (@id, @userId, @name, @address, @phone, @email, @website, @provider, @category, @town, @province, @lat, @lng, @status, @notes, @importedAt, @source, @metadata, @dataset_id)
    `);

    const transaction = db.transaction((businessesToSync) => {
        // Only clear existing data on first chunk or non-chunked uploads
        if (!isChunked || (isChunked && chunkIndex === 0) || clearFirst !== false) {
            const deleteResult = deleteStmt.run(userId);
            console.log(`🗑️ Cleared ${deleteResult.changes} existing businesses for user ${userId}`);
        }
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const business of businessesToSync) {
            try {
                insertStmt.run({
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
                    dataset_id: 1 // Use default dataset for now
                });
                successCount++;
            } catch (error) {
                errorCount++;
                errors.push({
                    businessId: business.id,
                    businessName: business.name,
                    error: error.message
                });
                console.error(`❌ Failed to sync business ${business.id}:`, error);
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
    const { role } = req.userData;
    
    if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
        const users = db.prepare(`
            SELECT id, username, created_at, last_sync, total_businesses, storage_used_mb
            FROM users 
            ORDER BY created_at DESC
        `).all();
        
        res.json(users);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

app.post('/api/users', auth, (req, res) => {
    const { role } = req.userData;
    const { username, password } = req.body;
    
    if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
    }
    
    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
        
        res.status(201).json({ 
            message: 'User created successfully',
            userId: result.lastInsertRowid,
            username 
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ message: 'Username already exists' });
        } else {
            console.error('Failed to create user:', error);
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

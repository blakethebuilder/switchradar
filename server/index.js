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
const JWT_SECRET = process.env.JWT_SECRET || 'switchradar_secret_key';

app.use(cors());
app.use(express.json());

// Initialize API Alignment Service
const apiAlignment = new APIAlignmentService(app);

// Auth Routes
app.get('/api/auth/ping', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, userId: user.id, username: user.username });
});

// Lead Routes with pagination and filtering
app.get('/api/leads', auth, (req, res) => {
    const { 
        page = 1, 
        limit = 1000, 
        search = '', 
        category = '', 
        provider = '', 
        town = '',
        status = '',
        phoneType = 'all'
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build dynamic query
    let whereClause = 'WHERE userId = ?';
    let params = [req.userData.userId];
    
    if (search) {
        whereClause += ' AND (name LIKE ? OR address LIKE ? OR phone LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (category) {
        whereClause += ' AND category = ?';
        params.push(category);
    }
    
    if (provider) {
        whereClause += ' AND provider = ?';
        params.push(provider);
    }
    
    if (town) {
        whereClause += ' AND town = ?';
        params.push(town);
    }
    
    if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
    }
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM leads ${whereClause}`;
    const totalResult = db.prepare(countQuery).get(...params);
    const total = totalResult.total;
    
    // Get paginated results
    const dataQuery = `SELECT * FROM leads ${whereClause} ORDER BY name LIMIT ? OFFSET ?`;
    const leads = db.prepare(dataQuery).all(...params, parseInt(limit), offset);
    
    res.json({
        data: leads.map(lead => ({
            ...lead,
            coordinates: { lat: lead.lat, lng: lead.lng },
            notes: JSON.parse(lead.notes || '[]'),
            metadata: JSON.parse(lead.metadata || '{}')
        })),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            hasNext: offset + parseInt(limit) < total,
            hasPrev: parseInt(page) > 1
        }
    });
});

app.post('/api/leads/sync', auth, (req, res) => {
    const { leads } = req.body;
    const userId = req.userData.userId;

    const deleteStmt = db.prepare('DELETE FROM leads WHERE userId = ?');
    const insertStmt = db.prepare(`
    INSERT INTO leads (id, userId, name, address, phone, email, website, provider, category, town, province, lat, lng, status, notes, importedAt, source, metadata)
    VALUES (@id, @userId, @name, @address, @phone, @email, @website, @provider, @category, @town, @province, @lat, @lng, @status, @notes, @importedAt, @source, @metadata)
  `);

    const transaction = db.transaction((leadsToSync) => {
        deleteStmt.run(userId);
        for (const lead of leadsToSync) {
            insertStmt.run({
                ...lead,
                userId,
                lat: lead.coordinates.lat,
                lng: lead.coordinates.lng,
                notes: JSON.stringify(lead.notes || []),
                metadata: JSON.stringify(lead.metadata || {}),
                importedAt: lead.importedAt
            });
        }
    });

    transaction(leads);
    res.json({ message: 'Sync successful' });
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

// Workspace Control Routes
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

// Business Routes with enhanced filtering and pagination
app.get('/api/businesses', auth, (req, res) => {
    const { 
        page = 1, 
        limit = 1000, 
        search = '', 
        category = '', 
        provider = '', 
        town = '',
        status = '',
        phoneType = 'all',
        lat,
        lng,
        radius
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build dynamic query
    let whereClause = 'WHERE userId = ?';
    let params = [req.userData.userId];
    
    if (search) {
        whereClause += ' AND (name LIKE ? OR address LIKE ? OR phone LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (category) {
        whereClause += ' AND category = ?';
        params.push(category);
    }
    
    if (provider) {
        whereClause += ' AND provider = ?';
        params.push(provider);
    }
    
    if (town) {
        whereClause += ' AND town = ?';
        params.push(town);
    }
    
    if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
    }
    
    // Distance filtering using Haversine formula in SQLite
    if (lat && lng && radius) {
        whereClause += ` AND (
            6371 * acos(
                cos(radians(?)) * cos(radians(lat)) * 
                cos(radians(lng) - radians(?)) + 
                sin(radians(?)) * sin(radians(lat))
            )
        ) <= ?`;
        params.push(parseFloat(lat), parseFloat(lng), parseFloat(lat), parseFloat(radius));
    }
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM leads ${whereClause}`;
    const totalResult = db.prepare(countQuery).get(...params);
    const total = totalResult.total;
    
    // Get paginated results
    const dataQuery = `SELECT * FROM leads ${whereClause} ORDER BY name LIMIT ? OFFSET ?`;
    const businesses = db.prepare(dataQuery).all(...params, parseInt(limit), offset);
    
    res.json({
        data: businesses.map(business => ({
            ...business,
            coordinates: { lat: business.lat, lng: business.lng },
            notes: JSON.parse(business.notes || '[]'),
            metadata: JSON.parse(business.metadata || '{}')
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
            showing: Math.min(parseInt(limit), total - offset)
        }
    });
});

// Enhanced business sync with better error handling and progress tracking
app.post('/api/businesses/sync', auth, (req, res) => {
    const { businesses } = req.body;
    const userId = req.userData.userId;

    if (!businesses || !Array.isArray(businesses)) {
        return res.status(400).json({ message: 'Invalid businesses data' });
    }

    const deleteStmt = db.prepare('DELETE FROM leads WHERE userId = ?');
    const insertStmt = db.prepare(`
        INSERT INTO leads (id, userId, name, address, phone, email, website, provider, category, town, province, lat, lng, status, notes, importedAt, source, metadata)
        VALUES (@id, @userId, @name, @address, @phone, @email, @website, @provider, @category, @town, @province, @lat, @lng, @status, @notes, @importedAt, @source, @metadata)
    `);

    const transaction = db.transaction((businessesToSync) => {
        // Clear existing data for this user
        const deleteResult = deleteStmt.run(userId);
        console.log(`Cleared ${deleteResult.changes} existing businesses for user ${userId}`);
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (const business of businessesToSync) {
            try {
                insertStmt.run({
                    ...business,
                    userId,
                    lat: business.coordinates?.lat || business.lat || null,
                    lng: business.coordinates?.lng || business.lng || null,
                    notes: JSON.stringify(business.notes || []),
                    metadata: JSON.stringify(business.metadata || {}),
                    importedAt: business.importedAt || new Date().toISOString()
                });
                successCount++;
            } catch (error) {
                errorCount++;
                errors.push({
                    businessId: business.id,
                    businessName: business.name,
                    error: error.message
                });
                console.error(`Failed to sync business ${business.id}:`, error);
            }
        }
        
        return { successCount, errorCount, errors };
    });

    try {
        const result = transaction(businesses);
        
        // Update user's last sync timestamp
        db.prepare('UPDATE users SET last_sync = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
        
        res.json({ 
            message: 'Business sync completed', 
            totalReceived: businesses.length,
            successCount: result.successCount,
            errorCount: result.errorCount,
            errors: result.errors,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Business sync transaction error:', error);
        res.status(500).json({ 
            message: 'Business sync failed', 
            error: error.message,
            totalReceived: businesses.length
        });
    }
});

// Dataset Routes
app.get('/api/datasets', auth, (req, res) => {
    try {
        const datasets = db.prepare(`
            SELECT d.*, COUNT(db.business_id) as business_count
            FROM datasets d
            LEFT JOIN dataset_businesses db ON d.id = db.dataset_id
            WHERE d.userId = ?
            GROUP BY d.id
            ORDER BY d.last_modified DESC
        `).all(req.userData.userId);

        res.json(datasets);
    } catch (error) {
        console.error('Dataset fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch datasets', error: error.message });
    }
});

// Get aggregated statistics
app.get('/api/stats', auth, (req, res) => {
    try {
        const userId = req.userData.userId;
        
        // Get total counts
        const totalBusinesses = db.prepare('SELECT COUNT(*) as count FROM leads WHERE userId = ?').get(userId).count;
        
        // Get provider breakdown
        const providerStats = db.prepare(`
            SELECT provider, COUNT(*) as count 
            FROM leads 
            WHERE userId = ? 
            GROUP BY provider 
            ORDER BY count DESC
        `).all(userId);
        
        // Get category breakdown
        const categoryStats = db.prepare(`
            SELECT category, COUNT(*) as count 
            FROM leads 
            WHERE userId = ? 
            GROUP BY category 
            ORDER BY count DESC
        `).all(userId);
        
        // Get town breakdown
        const townStats = db.prepare(`
            SELECT town, COUNT(*) as count 
            FROM leads 
            WHERE userId = ? 
            GROUP BY town 
            ORDER BY count DESC 
            LIMIT 20
        `).all(userId);
        
        // Get status breakdown
        const statusStats = db.prepare(`
            SELECT status, COUNT(*) as count 
            FROM leads 
            WHERE userId = ? 
            GROUP BY status
        `).all(userId);
        
        res.json({
            totalBusinesses,
            providerStats,
            categoryStats,
            townStats,
            statusStats
        });
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
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

// Sync status and monitoring
app.get('/api/sync/status', auth, (req, res) => {
    try {
        const userId = req.userData.userId;
        
        // Get user sync info
        const userInfo = db.prepare(`
            SELECT username, last_sync, total_businesses, storage_used_mb, created_at
            FROM users 
            WHERE id = ?
        `).get(userId);
        
        // Get recent sync history
        const syncHistory = db.prepare(`
            SELECT sync_type, records_count, success, error_message, sync_timestamp
            FROM sync_log 
            WHERE userId = ? 
            ORDER BY sync_timestamp DESC 
            LIMIT 10
        `).all(userId);
        
        // Get current data counts
        const businessCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE userId = ?').get(userId).count;
        const routeCount = db.prepare('SELECT COUNT(*) as count FROM routes WHERE userId = ?').get(userId).count;
        
        // Calculate storage usage (rough estimate)
        const storageInfo = db.prepare(`
            SELECT 
                COUNT(*) as total_records,
                AVG(LENGTH(name) + LENGTH(address) + LENGTH(phone) + LENGTH(notes) + LENGTH(metadata)) as avg_record_size
            FROM leads 
            WHERE userId = ?
        `).get(userId);
        
        const estimatedStorageMB = (storageInfo.total_records * (storageInfo.avg_record_size || 0)) / (1024 * 1024);
        
        res.json({
            user: {
                username: userInfo.username,
                memberSince: userInfo.created_at,
                lastSync: userInfo.last_sync
            },
            currentData: {
                businesses: businessCount,
                routes: routeCount,
                estimatedStorageMB: Math.round(estimatedStorageMB * 100) / 100
            },
            syncHistory,
            cloudSyncEnabled: true,
            serverTime: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Sync status error:', error);
        res.status(500).json({ message: 'Failed to get sync status', error: error.message });
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

app.post('/api/datasets', auth, (req, res) => {
    const { name, description, businessIds = [] } = req.body;
    const userId = req.userData.userId;
    const datasetId = `dataset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transaction = db.transaction(() => {
        // Create dataset
        const insertDataset = db.prepare(`
            INSERT INTO datasets (id, userId, name, description)
            VALUES (@id, @userId, @name, @description)
        `);
        
        insertDataset.run({
            id: datasetId,
            userId,
            name,
            description: description || ''
        });

        // Add businesses to dataset if provided
        if (businessIds.length > 0) {
            const insertBusiness = db.prepare(`
                INSERT INTO dataset_businesses (dataset_id, business_id)
                VALUES (@datasetId, @businessId)
            `);
            
            for (const businessId of businessIds) {
                insertBusiness.run({ datasetId, businessId });
            }
        }

        return datasetId;
    });

    try {
        const createdId = transaction();
        res.status(201).json({ 
            message: 'Dataset created successfully', 
            datasetId: createdId,
            businessCount: businessIds.length
        });
    } catch (error) {
        console.error('Dataset creation error:', error);
        res.status(500).json({ message: 'Failed to create dataset', error: error.message });
    }
});

app.get('/api/datasets/:id/businesses', auth, (req, res) => {
    const { id } = req.params;
    const userId = req.userData.userId;

    try {
        const businesses = db.prepare(`
            SELECT l.*, db.added_at
            FROM leads l
            JOIN dataset_businesses db ON l.id = db.business_id
            JOIN datasets d ON db.dataset_id = d.id
            WHERE d.id = ? AND d.userId = ?
            ORDER BY db.added_at DESC
        `).all(id, userId);

        res.json(businesses.map(business => ({
            ...business,
            coordinates: { lat: business.lat, lng: business.lng },
            notes: JSON.parse(business.notes || '[]'),
            metadata: JSON.parse(business.metadata || '{}')
        })));
    } catch (error) {
        console.error('Dataset businesses fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch dataset businesses', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Validate API endpoints on startup
    setTimeout(() => {
        apiAlignment.logEndpointStatus();
    }, 1000);
});

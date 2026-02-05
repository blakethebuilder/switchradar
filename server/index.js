require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'switchradar_secret_key';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Helper to update user statistics
const updateUserStats = (userId) => {
    try {
        const count = db.prepare('SELECT COUNT(*) as count FROM leads WHERE userId = ?').get(userId).count;
        db.prepare('UPDATE users SET total_businesses = ?, last_sync = CURRENT_TIMESTAMP WHERE id = ?').run(count, userId);
    } catch (err) {
        console.error('Failed to update user stats:', err);
    }
};

// Auto-seed requested users
const seedUsers = async () => {
    const users = [
        { username: 'blake', password: 'Smart@2026!', role: 'admin' },
        { username: 'smartAdmin', password: 'Smart@2026!', role: 'super_admin' },
        { username: 'Sean', password: 'Smart@2026!', role: 'user' },
        { username: 'Jarred', password: 'Smart@2026!', role: 'user' }
    ];
    for (const u of users) {
        try {
            const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(u.username);
            if (!existing) {
                const hashedPassword = await bcrypt.hash(u.password, 10);
                db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(u.username, hashedPassword, u.role || 'user');
                console.log(`Successfully seeded user: ${u.username} as ${u.role || 'user'}`);
            }
        } catch (err) {
            console.error(`Error seeding user ${u.username}:`, err.message);
        }
    }

    // DATA MIGRATION: If smartAdmin is empty, but blake has leads, move them to smartAdmin
    try {
        const blake = db.prepare('SELECT id FROM users WHERE username = ?').get('blake');
        const smartAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('smartAdmin');

        if (blake && smartAdmin) {
            const blakeLeadCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE userId = ?').get(blake.id).count;
            const smartAdminLeadCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE userId = ?').get(smartAdmin.id).count;

            if (blakeLeadCount > 0 && smartAdminLeadCount === 0) {
                console.log(`📦 DATA MIGRATION: Moving ${blakeLeadCount} leads from blake to smartAdmin...`);
                db.prepare('UPDATE leads SET userId = ? WHERE userId = ?').run(smartAdmin.id, blake.id);
                db.prepare('UPDATE routes SET userId = ? WHERE userId = ?').run(smartAdmin.id, blake.id);
                db.prepare('UPDATE datasets SET created_by = ? WHERE created_by = ?').run(smartAdmin.id, blake.id);
                updateUserStats(smartAdmin.id);
                updateUserStats(blake.id);
                console.log('✅ DATA MIGRATION: Successful');
            }
        }
    } catch (err) {
        console.error('❌ Data migration failed:', err.message);
    }
};
seedUsers();

// Auth Routes
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
    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const role = user.role || (user.username === 'blake' ? 'admin' : 'user');
        const token = jwt.sign({ userId: user.id, username: user.username, role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            userId: user.id,
            username: user.username,
            role: role
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error during login' });
    }
});

// User Management Routes (Admin only)
app.get('/api/users', auth, (req, res) => {
    if (req.userData.role !== 'admin' && req.userData.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied: Admin only' });
    }

    try {
        const users = db.prepare(`
            SELECT u.id, u.username, u.created_at, u.last_sync, u.total_businesses, u.storage_used_mb,
                   (SELECT COUNT(*) FROM shared_towns WHERE targetUserId = u.id) as shared_town_count,
                   (SELECT COUNT(*) FROM shared_businesses WHERE targetUserId = u.id) as shared_business_count
            FROM users u
        `).all();
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

app.post('/api/users', auth, async (req, res) => {
    if (req.userData.role !== 'admin' && req.userData.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied: Admin only' });
    }

    const { username, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
        const result = stmt.run(username, hashedPassword, role || 'user');
        res.status(201).json({ success: true, userId: result.lastInsertRowid });
    } catch (error) {
        res.status(400).json({ success: false, error: 'Username already exists' });
    }
});

app.put('/api/users/:id', auth, async (req, res) => {
    if (req.userData.role !== 'admin' && req.userData.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied: Admin only' });
    }

    const { id } = req.params;
    const { username, password, role } = req.body;
    try {
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.prepare('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?').run(username, hashedPassword, role || 'user', id);
        } else {
            db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?').run(username, role || 'user', id);
        }
        res.json({ success: true, message: 'User updated' });
    } catch (error) {
        res.status(400).json({ success: false, error: 'Update failed' });
    }
});

app.delete('/api/users/:id', auth, (req, res) => {
    if (req.userData.role !== 'admin' && req.userData.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied: Admin only' });
    }

    const { id } = req.params;
    if (parseInt(id) === req.userData.userId) {
        return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    try {
        // Find user first to prevent deleting the 'blake' user
        const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id);
        if (user && user.username === 'blake') {
            return res.status(403).json({ success: false, error: 'Cannot delete master admin' });
        }

        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, error: 'Delete failed' });
    }
});

// Business Routes
app.get('/api/businesses', auth, (req, res) => {
    try {
        let leads;
        if (req.userData.role === 'super_admin') {
            leads = db.prepare(`
                SELECT l.* FROM leads l
                LEFT JOIN datasets d ON l.dataset_id = d.id
                WHERE d.is_active = 1 OR l.dataset_id IS NULL
            `).all();
        } else {
            leads = db.prepare(`
                SELECT l.* FROM leads l
                LEFT JOIN datasets d ON l.dataset_id = d.id
                WHERE (l.userId = ? 
                OR l.town IN (SELECT town FROM shared_towns WHERE targetUserId = ?)
                OR l.id IN (SELECT businessId FROM shared_businesses WHERE targetUserId = ?))
                AND (d.is_active = 1 OR l.dataset_id IS NULL)
            `).all(req.userData.userId, req.userData.userId, req.userData.userId);
        }
        res.json(leads.map(lead => ({
            ...lead,
            coordinates: { lat: lead.lat, lng: lead.lng },
            notes: JSON.parse(lead.notes || '[]'),
            metadata: JSON.parse(lead.metadata || '{}')
        })));
    } catch (error) {
        console.error('Businesses fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch businesses' });
    }
});

app.post('/api/businesses/sync', auth, (req, res) => {
    const { businesses, clearFirst } = req.body;
    const userId = req.userData.userId;

    if (!businesses || !Array.isArray(businesses)) {
        return res.status(400).json({ message: 'Invalid businesses data' });
    }

    const deleteStmt = db.prepare('DELETE FROM leads WHERE userId = ?');
    const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO leads (id, userId, name, address, phone, email, website, provider, category, town, province, lat, lng, status, notes, importedAt, source, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((businessesToSync, shouldClear) => {
        if (shouldClear) {
            deleteStmt.run(userId);
        }
        for (const business of businessesToSync) {
            insertStmt.run(
                business.id,
                userId,
                business.name || null,
                business.address || null,
                business.phone || null,
                business.email || null,
                business.website || null,
                business.provider || null,
                business.category || null,
                business.town || null,
                business.province || null,
                business.coordinates?.lat || business.lat || null,
                business.coordinates?.lng || business.lng || null,
                business.status || 'active',
                JSON.stringify(business.notes || []),
                business.importedAt || new Date().toISOString(),
                business.source || 'sync',
                JSON.stringify(business.metadata || {})
            );
        }
    });

    try {
        transaction(businesses, clearFirst === true);
        updateUserStats(userId);
        res.json({ message: 'Sync successful', count: businesses.length });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
});

// Route Routes
app.get('/api/routes', auth, (req, res) => {
    try {
        let routes;
        if (req.userData.role === 'super_admin') {
            routes = db.prepare('SELECT * FROM routes ORDER BY "order"').all();
        } else {
            routes = db.prepare('SELECT * FROM routes WHERE userId = ? ORDER BY "order"').all(req.userData.userId);
        }
        res.json(routes);
    } catch (error) {
        console.error('Route fetch error:', error);
        res.status(500).json({ message: 'Failed to fetch routes' });
    }
});

app.post('/api/routes', auth, (req, res) => {
    const { routeItems } = req.body;
    const userId = req.userData.userId;

    const deleteStmt = db.prepare('DELETE FROM routes WHERE userId = ?');
    const insertStmt = db.prepare('INSERT INTO routes (userId, businessId, "order", addedAt) VALUES (?, ?, ?, ?)');

    const transaction = db.transaction((items) => {
        deleteStmt.run(userId);
        for (const item of items) {
            insertStmt.run(userId, item.businessId, item.order, item.addedAt || new Date().toISOString());
        }
    });

    try {
        transaction(routeItems || []);
        res.json({ message: 'Routes saved successfully' });
    } catch (error) {
        console.error('Route sync error:', error);
        res.status(500).json({ message: 'Route sync failed' });
    }
});

// Dataset Routes
app.get('/api/datasets', auth, (req, res) => {
    const userId = req.userData.userId;
    try {
        let datasets;
        if (req.userData.role === 'super_admin') {
            datasets = db.prepare(`
                SELECT d.*, COUNT(l.id) as business_count 
                FROM datasets d 
                LEFT JOIN leads l ON d.id = l.dataset_id 
                GROUP BY d.id
            `).all();
        } else {
            datasets = db.prepare(`
                SELECT d.*, COUNT(l.id) as business_count 
                FROM datasets d 
                LEFT JOIN leads l ON d.id = l.dataset_id 
                WHERE d.created_by = ? OR d.created_by IS NULL
                GROUP BY d.id
            `).all(userId);
        }
        res.json({ success: true, datasets });
    } catch (err) {
        console.error('Error fetching datasets:', err);
        res.status(500).json({ message: 'Failed to retrieve datasets' });
    }
});

app.put('/api/datasets/:id', auth, (req, res) => {
    const { id } = req.params;
    const { name, description, town, province, is_active } = req.body;
    try {
        const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(id);
        if (!dataset) {
            return res.status(404).json({ success: false, error: 'Dataset not found' });
        }

        // Only super_admin or owner can update
        if (req.userData.role !== 'super_admin' && dataset.created_by !== req.userData.userId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        db.prepare(`
            UPDATE datasets 
            SET name = COALESCE(?, name),
                description = COALESCE(?, description),
                town = COALESCE(?, town),
                province = COALESCE(?, province),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(name, description, town, province, is_active !== undefined ? (is_active ? 1 : 0) : null, id);

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating dataset:', err);
        res.status(500).json({ success: false, error: 'Failed to update dataset' });
    }
});

app.post('/api/datasets', auth, (req, res) => {
    const { name, description, town, province } = req.body;
    const userId = req.userData.userId;
    try {
        const result = db.prepare(`
            INSERT INTO datasets (name, description, town, province, created_by)
            VALUES (?, ?, ?, ?, ?)
        `).run(name || 'New Dataset', description || '', town || '', province || '', userId);
        res.status(201).json({ id: result.lastInsertRowid, name });
    } catch (err) {
        console.error('Error creating dataset:', err);
        res.status(500).json({ message: 'Failed to create dataset' });
    }
});

// User Data Management & Sharing Routes
app.get('/api/user-businesses/:userId', auth, (req, res) => {
    if (req.userData.role !== 'admin' && req.userData.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { userId } = req.params;
    try {
        const businesses = db.prepare(`
            SELECT * FROM leads 
            WHERE userId = ? 
            OR town IN (SELECT town FROM shared_towns WHERE targetUserId = ?)
            OR id IN (SELECT businessId FROM shared_businesses WHERE targetUserId = ?)
        `).all(userId, userId, userId);

        res.json({
            success: true,
            data: businesses.map(lead => ({
                ...lead,
                isShared: lead.userId != userId,
                coordinates: { lat: lead.lat, lng: lead.lng },
                notes: JSON.parse(lead.notes || '[]'),
                metadata: JSON.parse(lead.metadata || '{}')
            }))
        });
    } catch (err) {
        console.error('User businesses fetch error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch user businesses' });
    }
});

app.get('/api/share/towns/available', auth, (req, res) => {
    if (req.userData.role !== 'admin' && req.userData.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const towns = db.prepare('SELECT town as name, COUNT(*) as businessCount FROM leads GROUP BY town').all();
        res.json({ success: true, data: towns });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch available towns' });
    }
});

app.post('/api/share/towns', auth, (req, res) => {
    if (req.userData.role !== 'admin' && req.userData.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { targetUserId, towns } = req.body;
    try {
        const insert = db.prepare('INSERT INTO shared_towns (targetUserId, town) VALUES (?, ?)');
        const transaction = db.transaction((userId, townList) => {
            for (const town of townList) {
                insert.run(userId, town);
            }
        });
        transaction(targetUserId, towns);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to share towns' });
    }
});

app.delete('/api/share/towns', auth, (req, res) => {
    if (req.userData.role !== 'admin' && req.userData.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { targetUserId, towns } = req.body;
    try {
        const del = db.prepare('DELETE FROM shared_towns WHERE targetUserId = ? AND town = ?');
        const transaction = db.transaction((userId, townList) => {
            for (const town of townList) {
                del.run(userId, town);
            }
        });
        transaction(targetUserId, towns);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to unshare towns' });
    }
});

app.post('/api/share/businesses', auth, (req, res) => {
    if (req.userData.role !== 'admin' && req.userData.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { targetUserId, businessIds } = req.body;
    try {
        const insert = db.prepare('INSERT INTO shared_businesses (targetUserId, businessId) VALUES (?, ?)');
        const transaction = db.transaction((userId, ids) => {
            for (const id of ids) {
                insert.run(userId, id);
            }
        });
        transaction(targetUserId, businessIds);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to share businesses' });
    }
});

app.delete('/api/share/businesses', auth, (req, res) => {
    if (req.userData.role !== 'admin' && req.userData.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { targetUserId, businessIds } = req.body;
    try {
        const del = db.prepare('DELETE FROM shared_businesses WHERE targetUserId = ? AND businessId = ?');
        const transaction = db.transaction((userId, ids) => {
            for (const id of ids) {
                del.run(userId, id);
            }
        });
        transaction(targetUserId, businessIds);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to unshare businesses' });
    }
});

app.get('/api/share/shared', auth, (req, res) => {
    if (req.userData.role !== 'admin' && req.userData.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const users = db.prepare('SELECT id as userId, username FROM users').all();
        const sharedData = users.map(user => {
            const sharedTowns = db.prepare('SELECT town FROM shared_towns WHERE targetUserId = ?').all(user.userId);
            const sharedBusIds = db.prepare('SELECT businessId FROM shared_businesses WHERE targetUserId = ?').all(user.userId);

            let sharedBusinesses = [];
            if (sharedBusIds.length > 0) {
                const placeholders = sharedBusIds.map(() => '?').join(',');
                sharedBusinesses = db.prepare(`SELECT * FROM leads WHERE id IN (${placeholders})`).all(sharedBusIds.map(b => b.businessId));
            }

            return {
                userId: user.userId,
                username: user.username,
                sharedTowns: sharedTowns.map(t => ({ town: t.town })),
                sharedBusinesses
            };
        });
        res.json({ success: true, data: sharedData });
    } catch (err) {
        console.error('Shared data fetch error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch shared data' });
    }
});

// Workspace Control Routes
app.delete('/api/workspace/clear', auth, (req, res) => {
    const userId = req.userData.userId;
    const deleteLeads = db.prepare('DELETE FROM leads WHERE userId = ?');
    const deleteRoutes = db.prepare('DELETE FROM routes WHERE userId = ?');

    const transaction = db.transaction(() => {
        deleteLeads.run(userId);
        deleteRoutes.run(userId);
    });

    try {
        transaction();
        updateUserStats(userId);
        res.json({ message: 'Cloud workspace cleared successfully' });
    } catch (err) {
        console.error('Workspace clear error:', err);
        res.status(500).json({ message: 'Failed to clear workspace' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

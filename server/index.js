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
        const users = db.prepare('SELECT id, username, created_at, last_sync, total_businesses, storage_used_mb FROM users').all();
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
        const leads = db.prepare('SELECT * FROM leads WHERE userId = ?').all(req.userData.userId);
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
    const { businesses } = req.body;
    const userId = req.userData.userId;

    if (!businesses || !Array.isArray(businesses)) {
        return res.status(400).json({ message: 'Invalid businesses data' });
    }

    const deleteStmt = db.prepare('DELETE FROM leads WHERE userId = ?');
    const insertStmt = db.prepare(`
        INSERT INTO leads (id, userId, name, address, phone, email, website, provider, category, town, province, lat, lng, status, notes, importedAt, source, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((businessesToSync) => {
        deleteStmt.run(userId);
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
        transaction(businesses);
        updateUserStats(userId);
        res.json({ message: 'Sync successful' });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
});

// Route Routes
app.get('/api/routes', auth, (req, res) => {
    try {
        const routes = db.prepare('SELECT * FROM routes WHERE userId = ? ORDER BY "order"').all(req.userData.userId);
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
        const datasets = db.prepare('SELECT * FROM datasets WHERE created_by = ? OR created_by IS NULL').all(userId);
        res.json(datasets);
    } catch (err) {
        console.error('Error fetching datasets:', err);
        res.status(500).json({ message: 'Failed to retrieve datasets' });
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

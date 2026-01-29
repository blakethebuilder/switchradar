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

// Auto-seed requested users
const seedUsers = async () => {
    const users = [
        { username: 'blake', password: 'Smart@2026!' },
        { username: 'Sean', password: 'Smart@2026!' },
        { username: 'Jarred', password: 'Smart@2026!' }
    ];
    for (const u of users) {
        try {
            const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(u.username);
            if (!existing) {
                const hashedPassword = await bcrypt.hash(u.password, 10);
                db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(u.username, hashedPassword);
                console.log(`Successfully seeded user: ${u.username}`);
            }
        } catch (err) {
            console.error(`Error seeding user ${u.username}:`, err.message);
        }
    }
};
seedUsers();

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

// Lead Routes
app.get('/api/leads', auth, (req, res) => {
    const leads = db.prepare('SELECT * FROM leads WHERE userId = ?').all(req.userData.userId);
    res.json(leads.map(lead => ({
        ...lead,
        coordinates: { lat: lead.lat, lng: lead.lng },
        notes: JSON.parse(lead.notes || '[]'),
        metadata: JSON.parse(lead.metadata || '{}')
    })));
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

// Business Routes (alias for leads to match frontend expectations)
app.get('/api/businesses', auth, (req, res) => {
    const businesses = db.prepare('SELECT * FROM leads WHERE userId = ?').all(req.userData.userId);
    res.json(businesses.map(business => ({
        ...business,
        coordinates: { lat: business.lat, lng: business.lng },
        notes: JSON.parse(business.notes || '[]'),
        metadata: JSON.parse(business.metadata || '{}')
    })));
});

app.post('/api/businesses/sync', auth, (req, res) => {
    const { businesses } = req.body;
    const userId = req.userData.userId;

    const deleteStmt = db.prepare('DELETE FROM leads WHERE userId = ?');
    const insertStmt = db.prepare(`
        INSERT INTO leads (id, userId, name, address, phone, email, website, provider, category, town, province, lat, lng, status, notes, importedAt, source, metadata)
        VALUES (@id, @userId, @name, @address, @phone, @email, @website, @provider, @category, @town, @province, @lat, @lng, @status, @notes, @importedAt, @source, @metadata)
    `);

    const transaction = db.transaction((businessesToSync) => {
        deleteStmt.run(userId);
        for (const business of businessesToSync) {
            insertStmt.run({
                ...business,
                userId,
                lat: business.coordinates?.lat || business.lat,
                lng: business.coordinates?.lng || business.lng,
                notes: JSON.stringify(business.notes || []),
                metadata: JSON.stringify(business.metadata || {}),
                importedAt: business.importedAt
            });
        }
    });

    try {
        transaction(businesses);
        res.json({ message: 'Business sync successful', count: businesses.length });
    } catch (error) {
        console.error('Business sync error:', error);
        res.status(500).json({ message: 'Business sync failed', error: error.message });
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

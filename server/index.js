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
app.use(express.json());

// Auto-seed requested users
const seedUsers = async () => {
    const users = [
        { username: 'blake', password: 'Smart@2026!' },
        { username: 'Sean', password: 'Smart@2026!' }
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

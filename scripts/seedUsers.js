import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../data/switchradar.db');
const db = new Database(dbPath);

async function seed() {
    const users = [
        { username: 'blake', password: 'Smart@2026!' },
        { username: 'Sean', password: 'Smart@2026!' }
    ];

    for (const user of users) {
        try {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
            stmt.run(user.username, hashedPassword);
            console.log(`User ${user.username} created successfully.`);
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                console.log(`User ${user.username} already exists.`);
            } else {
                console.error(`Error creating user ${user.username}:`, error.message);
            }
        }
    }
}

seed();

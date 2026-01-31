import Dexie, { type Table } from 'dexie';
import type { Business, RouteItem } from './types';

export class SwitchRadarDB extends Dexie {
    businesses!: Table<Business>;
    route!: Table<RouteItem>;

    constructor() {
        super('SwitchRadarDB');
        
        // Simple, stable schema - no complex upgrades
        this.version(1).stores({
            businesses: 'id, name, provider, town, status, category, [provider+category], [town+provider]',
            route: '++id, businessId, order'
        });
    }
}

// Database initialization with error recovery
export const initializeDatabase = async (): Promise<SwitchRadarDB> => {
    try {
        const database = new SwitchRadarDB();
        // Test the database connection
        await database.businesses.limit(1).toArray();
        return database;
    } catch (error) {
        console.warn('Database initialization failed, resetting database:', error);
        
        // Delete the problematic database
        try {
            await Dexie.delete('SwitchRadarDB');
            console.log('Old database deleted successfully');
        } catch (deleteError) {
            console.warn('Could not delete old database:', deleteError);
        }
        
        // Create a fresh database
        const freshDatabase = new SwitchRadarDB();
        console.log('Fresh database created');
        return freshDatabase;
    }
};

// Initialize database instance
export let db: SwitchRadarDB;

// Initialize database on module load
initializeDatabase().then(database => {
    db = database;
}).catch(error => {
    console.error('Critical database error:', error);
    // Fallback: create basic instance
    db = new SwitchRadarDB();
});

// Export a function to reset database if needed
export const resetDatabase = async (): Promise<void> => {
    try {
        await Dexie.delete('SwitchRadarDB');
        db = await initializeDatabase();
        console.log('Database reset successfully');
    } catch (error) {
        console.error('Database reset failed:', error);
        throw error;
    }
};

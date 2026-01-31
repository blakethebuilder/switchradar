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

// Create a single database instance
export const db = new SwitchRadarDB();

// Export a function to reset database if needed
export const resetDatabase = async (): Promise<void> => {
    try {
        await db.delete();
        await db.open();
        console.log('Database reset successfully');
    } catch (error) {
        console.error('Database reset failed:', error);
        // Force a page reload as last resort
        window.location.reload();
    }
};

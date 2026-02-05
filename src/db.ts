import Dexie, { type Table } from 'dexie';
import type { Business, RouteItem } from './types';

export interface Dataset {
    id: number;
    name: string;
    description?: string;
    town?: string;
    province?: string;
    created_by?: number;
    created_at?: Date;
    business_count?: number;
    is_active?: boolean;
}

export interface BusinessWithDataset extends Business {
    datasetId?: number;
}

export class SwitchRadarDB extends Dexie {
    businesses!: Table<BusinessWithDataset>;
    route!: Table<RouteItem>;
    datasets!: Table<Dataset>;

    constructor() {
        super('SwitchRadarDB');
        // Define tables and indexes
        this.version(4).stores({
            datasets: '++id, name, created_by',
            businesses: 'id, datasetId, name, provider, town, status',
            route: '++id, businessId, order'
        });
    }
}

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

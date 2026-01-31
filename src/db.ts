import Dexie, { type Table } from 'dexie';
import type { Business, RouteItem } from './types';

export class SwitchRadarDB extends Dexie {
    businesses!: Table<Business>;
    route!: Table<RouteItem>;

    constructor() {
        super('SwitchRadarDB');
        
        // Version 1: Original schema
        this.version(1).stores({
            businesses: 'id, name, provider, town, status, category',
            route: '++id, businessId, order'
        });
        
        // Version 2: Add compound indexes
        this.version(2).stores({
            businesses: 'id, name, provider, town, status, category, [provider+category], [town+provider]',
            route: '++id, businessId, order'
        });
        
        // Version 3: Performance optimizations (no schema changes)
        this.version(3).upgrade(() => {
            // Just ensure indexes are properly created
            return Promise.resolve();
        });
        
        // Version 4: Enhanced schema for manual sync
        this.version(4).stores({
            businesses: 'id, name, provider, town, status, category, [provider+category], [town+provider], importedAt',
            route: '++id, businessId, order, addedAt'
        });
    }
}

export const db = new SwitchRadarDB();

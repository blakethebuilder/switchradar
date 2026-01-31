import Dexie, { type Table } from 'dexie';
import type { Business, RouteItem } from './types';

export class SwitchRadarDB extends Dexie {
    businesses!: Table<Business>;
    route!: Table<RouteItem>;

    constructor() {
        super('SwitchRadarDB');
        this.version(3).stores({
            businesses: 'id, name, provider, town, status, category, [provider+category], [town+provider]',
            route: '++id, businessId, order'
        });
        
        // Add performance optimizations
        this.version(3).upgrade(trans => {
            // Add compound indexes for common filter combinations
            return trans.table('businesses').toCollection().modify(() => {});
        });
    }
}

export const db = new SwitchRadarDB();

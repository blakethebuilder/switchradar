import Dexie, { type Table } from 'dexie';
import type { Business, RouteItem } from './types';

export class SwitchRadarDB extends Dexie {
    businesses!: Table<Business>;
    route!: Table<RouteItem>;

    constructor() {
        super('SwitchRadarDB');
        this.version(2).stores({
            businesses: 'id, name, provider, town, status',
            route: '++id, businessId, order'
        });
    }
}

export const db = new SwitchRadarDB();

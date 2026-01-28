import Dexie, { type Table } from 'dexie';
import type { Business } from './types';

export class SwitchRadarDB extends Dexie {
    businesses!: Table<Business>;

    constructor() {
        super('SwitchRadarDB');
        this.version(1).stores({
            businesses: '++id, name, provider, town, status'
        });
    }
}

export const db = new SwitchRadarDB();

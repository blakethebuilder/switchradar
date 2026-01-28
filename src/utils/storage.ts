import Dexie, { type Table } from 'dexie';
import type { Business } from '../types';

export class AppDatabase extends Dexie {
  businesses!: Table<Business>;

  constructor() {
    super('SwitchRadarDB');
    
    this.version(1).stores({
      businesses: 'id, name, provider, town, status, importedAt'
    });
  }

  async importBusinesses(businesses: Business[]) {
    return this.businesses.bulkAdd(businesses);
  }

  async getBusinesses() {
    return this.businesses.toArray();
  }

  async clearAll() {
    return this.businesses.clear();
  }

  async getProviderStats() {
    const businesses = await this.businesses.toArray();
    return businesses.reduce((acc, biz) => {
      acc[biz.provider] = (acc[biz.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

export const db = new AppDatabase();

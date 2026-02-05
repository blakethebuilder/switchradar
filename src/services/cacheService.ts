import type { Business, RouteItem } from '../types';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

interface CacheConfig {
  businesses: number;    // Cache businesses for 5 minutes
  routes: number;       // Cache routes for 10 minutes  
  datasets: number;     // Cache datasets for 15 minutes
  users: number;        // Cache users for 2 minutes (admin data changes more frequently)
}

class CacheService {
  private readonly CACHE_VERSION = '1.0.0';
  private readonly CACHE_PREFIX = 'sr_cache_';
  
  // Cache durations in milliseconds
  private readonly CACHE_DURATIONS: CacheConfig = {
    businesses: 5 * 60 * 1000,   // 5 minutes
    routes: 10 * 60 * 1000,      // 10 minutes
    datasets: 15 * 60 * 1000,    // 15 minutes
    users: 2 * 60 * 1000         // 2 minutes
  };

  private getCacheKey(key: string, userId?: string): string {
    // Include user ID in cache key for user-specific data
    const userSuffix = userId ? `_${userId}` : '';
    return `${this.CACHE_PREFIX}${key}${userSuffix}`;
  }

  private isValidCache<T>(item: CacheItem<T> | null): boolean {
    if (!item) return false;
    
    // Check version compatibility
    if (item.version !== this.CACHE_VERSION) {
      console.log('🗑️ CACHE: Version mismatch, invalidating cache');
      return false;
    }
    
    // Check expiration
    const now = Date.now();
    if (now > item.expiresAt) {
      console.log('🗑️ CACHE: Cache expired, invalidating');
      return false;
    }
    
    return true;
  }

  // Generic cache methods
  set<T>(key: keyof CacheConfig, data: T, userId?: string): void {
    try {
      const now = Date.now();
      const duration = this.CACHE_DURATIONS[key];
      
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: now,
        expiresAt: now + duration,
        version: this.CACHE_VERSION
      };
      
      const cacheKey = this.getCacheKey(key, userId);
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      
      console.log(`💾 CACHE: Stored ${key} (expires in ${Math.round(duration / 1000)}s)`);
    } catch (error) {
      console.warn('⚠️ CACHE: Failed to store cache:', error);
      // Gracefully handle localStorage quota exceeded
    }
  }

  get<T>(key: keyof CacheConfig, userId?: string): T | null {
    try {
      const cacheKey = this.getCacheKey(key, userId);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        console.log(`📭 CACHE: No cache found for ${key}`);
        return null;
      }
      
      const item: CacheItem<T> = JSON.parse(cached);
      
      if (!this.isValidCache(item)) {
        this.invalidate(key, userId);
        return null;
      }
      
      const ageSeconds = Math.round((Date.now() - item.timestamp) / 1000);
      console.log(`📦 CACHE: Retrieved ${key} (${ageSeconds}s old)`);
      
      return item.data;
    } catch (error) {
      console.warn('⚠️ CACHE: Failed to retrieve cache:', error);
      return null;
    }
  }

  invalidate(key: keyof CacheConfig, userId?: string): void {
    try {
      const cacheKey = this.getCacheKey(key, userId);
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ CACHE: Invalidated ${key}`);
    } catch (error) {
      console.warn('⚠️ CACHE: Failed to invalidate cache:', error);
    }
  }

  // Clear all cache for a user or globally
  clearAll(userId?: string): void {
    try {
      const keys = Object.keys(localStorage);
      const prefix = userId ? this.getCacheKey('', userId).slice(0, -1) : this.CACHE_PREFIX;
      
      keys.forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
      
      console.log(`🗑️ CACHE: Cleared all cache${userId ? ` for user ${userId}` : ''}`);
    } catch (error) {
      console.warn('⚠️ CACHE: Failed to clear cache:', error);
    }
  }

  // Check if cache exists and is valid
  has(key: keyof CacheConfig, userId?: string): boolean {
    return this.get(key, userId) !== null;
  }

  // Get cache info for debugging
  getInfo(key: keyof CacheConfig, userId?: string): { exists: boolean; age?: number; expiresIn?: number } {
    try {
      const cacheKey = this.getCacheKey(key, userId);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return { exists: false };
      }
      
      const item: CacheItem<any> = JSON.parse(cached);
      const now = Date.now();
      
      return {
        exists: true,
        age: Math.round((now - item.timestamp) / 1000),
        expiresIn: Math.max(0, Math.round((item.expiresAt - now) / 1000))
      };
    } catch (error) {
      return { exists: false };
    }
  }

  // Specific cache methods for type safety
  setBusinesses(businesses: Business[], userId?: string): void {
    this.set('businesses', businesses, userId);
  }

  getBusinesses(userId?: string): Business[] | null {
    return this.get<Business[]>('businesses', userId);
  }

  setRoutes(routes: RouteItem[], userId?: string): void {
    this.set('routes', routes, userId);
  }

  getRoutes(userId?: string): RouteItem[] | null {
    return this.get<RouteItem[]>('routes', userId);
  }

  setDatasets(datasets: any[], userId?: string): void {
    this.set('datasets', datasets, userId);
  }

  getDatasets(userId?: string): any[] | null {
    return this.get<any[]>('datasets', userId);
  }

  setUsers(users: any[], userId?: string): void {
    this.set('users', users, userId);
  }

  getUsers(userId?: string): any[] | null {
    return this.get<any[]>('users', userId);
  }

  // Cache invalidation strategies
  invalidateBusinesses(userId?: string): void {
    this.invalidate('businesses', userId);
  }

  invalidateRoutes(userId?: string): void {
    this.invalidate('routes', userId);
  }

  invalidateDatasets(userId?: string): void {
    this.invalidate('datasets', userId);
  }

  invalidateUsers(userId?: string): void {
    this.invalidate('users', userId);
  }

  // Smart invalidation - invalidate related caches
  invalidateRelated(key: keyof CacheConfig, userId?: string): void {
    switch (key) {
      case 'businesses':
        // When businesses change, datasets might be affected
        this.invalidate('businesses', userId);
        this.invalidate('datasets', userId);
        break;
      case 'datasets':
        // When datasets change, businesses might be affected
        this.invalidate('datasets', userId);
        this.invalidate('businesses', userId);
        break;
      default:
        this.invalidate(key, userId);
    }
  }

  // Get cache statistics for debugging
  getStats(): { totalSize: number; itemCount: number; items: Array<{ key: string; size: number; age: number }> } {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      const items: Array<{ key: string; size: number; age: number }> = [];
      
      cacheKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;
          
          try {
            const item: CacheItem<any> = JSON.parse(value);
            const age = Math.round((Date.now() - item.timestamp) / 1000);
            items.push({ key: key.replace(this.CACHE_PREFIX, ''), size, age });
          } catch {
            items.push({ key: key.replace(this.CACHE_PREFIX, ''), size, age: -1 });
          }
        }
      });
      
      return { totalSize, itemCount: items.length, items };
    } catch (error) {
      console.warn('⚠️ CACHE: Failed to get stats:', error);
      return { totalSize: 0, itemCount: 0, items: [] };
    }
  }
}

export const cacheService = new CacheService();
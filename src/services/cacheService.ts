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

  constructor() {
    // Initialize cache management
    this.manageCacheSize();
    
    // Set up periodic cache cleanup (every 5 minutes)
    setInterval(() => {
      this.clearExpiredCache();
      this.manageCacheSize();
    }, 5 * 60 * 1000);
  }

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
      // Pre-process data to reduce size before attempting to cache
      let cacheData = this.preprocessDataForCache(key, data);
      
      const now = Date.now();
      const duration = this.CACHE_DURATIONS[key];
      
      const cacheItem: CacheItem<T> = {
        data: cacheData,
        timestamp: now,
        expiresAt: now + duration,
        version: this.CACHE_VERSION
      };
      
      const cacheKey = this.getCacheKey(key, userId);
      const serialized = JSON.stringify(cacheItem);
      
      // Check size before storing and reduce if necessary
      const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
      
      if (sizeInMB > 3) { // Reduced from 5MB to 3MB
        console.warn(`⚠️ CACHE: Cache item too large (${sizeInMB.toFixed(2)}MB), reducing size for ${key}`);
        cacheData = this.aggressivelyReduceSize(key, cacheData);
        
        // Recreate cache item with reduced data
        const reducedCacheItem: CacheItem<T> = {
          data: cacheData,
          timestamp: now,
          expiresAt: now + duration,
          version: this.CACHE_VERSION
        };
        
        const reducedSerialized = JSON.stringify(reducedCacheItem);
        const reducedSizeInMB = new Blob([reducedSerialized]).size / (1024 * 1024);
        
        if (reducedSizeInMB > 2) { // Still too large, skip caching
          console.warn(`⚠️ CACHE: Even reduced cache too large (${reducedSizeInMB.toFixed(2)}MB), skipping storage for ${key}`);
          return;
        }
        
        localStorage.setItem(cacheKey, reducedSerialized);
        console.log(`💾 CACHE: Stored reduced ${key} (${reducedSizeInMB.toFixed(2)}MB, expires in ${Math.round(duration / 1000)}s)`);
      } else {
        localStorage.setItem(cacheKey, serialized);
        console.log(`💾 CACHE: Stored ${key} (${sizeInMB.toFixed(2)}MB, expires in ${Math.round(duration / 1000)}s)`);
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn(`⚠️ CACHE: Storage quota exceeded for ${key}, attempting emergency cleanup`);
        this.handleQuotaExceeded(key, data, userId);
      } else {
        console.warn('⚠️ CACHE: Failed to store cache:', error);
      }
    }
  }

  // Pre-process data to reduce cache size
  private preprocessDataForCache<T>(key: keyof CacheConfig, data: T): T {
    if (key === 'businesses' && Array.isArray(data)) {
      const businesses = data as any[];
      
      // For very large datasets, immediately reduce to essential fields only
      if (businesses.length > 3000) {
        console.log(`📦 CACHE: Large dataset (${businesses.length}), using minimal fields only`);
        
        return businesses.map(business => ({
          id: business.id,
          name: business.name?.substring(0, 100) || '', // Limit name length
          coordinates: business.coordinates,
          provider: business.provider,
          category: business.category?.substring(0, 50) || '', // Limit category length
          town: business.town?.substring(0, 50) || '', // Limit town length
          phone: business.phone?.substring(0, 20) || '', // Limit phone length
          // Remove all other fields to save space
        })) as T;
      }
      
      // For medium datasets, keep more fields but limit string lengths
      if (businesses.length > 1000) {
        console.log(`📦 CACHE: Medium dataset (${businesses.length}), using reduced fields`);
        
        return businesses.map(business => ({
          id: business.id,
          name: business.name?.substring(0, 150) || '',
          coordinates: business.coordinates,
          provider: business.provider,
          category: business.category?.substring(0, 100) || '',
          town: business.town?.substring(0, 100) || '',
          phone: business.phone?.substring(0, 30) || '',
          address: business.address?.substring(0, 200) || '',
          // Skip description and other large fields
        })) as T;
      }
    }
    
    return data;
  }

  // Aggressively reduce data size for caching
  private aggressivelyReduceSize<T>(key: keyof CacheConfig, data: T): T {
    if (key === 'businesses' && Array.isArray(data)) {
      const businesses = data as any[];
      
      // Take only the first 500 businesses with minimal data
      const minimalBusinesses = businesses.slice(0, 500).map(business => ({
        id: business.id,
        name: business.name?.substring(0, 50) || '',
        coordinates: business.coordinates,
        provider: business.provider?.substring(0, 20) || '',
        town: business.town?.substring(0, 30) || '',
      }));
      
      console.log(`📦 CACHE: Aggressively reduced from ${businesses.length} to ${minimalBusinesses.length} minimal records`);
      return minimalBusinesses as T;
    }
    
    return data;
  }

  // Handle quota exceeded by cleaning up old cache and retrying with smaller data
  private handleQuotaExceeded<T>(key: keyof CacheConfig, data: T, userId?: string): void {
    try {
      console.log('🧹 CACHE: Emergency cleanup - clearing all cache to free space');
      
      // Emergency: Clear ALL cache to free up maximum space
      this.clearAll();
      
      // Also clear any other localStorage items that might be taking space
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(storageKey => {
        if (!storageKey.startsWith('sr_token') && !storageKey.startsWith('sr_user')) {
          // Keep auth tokens but clear everything else
          try {
            localStorage.removeItem(storageKey);
          } catch (e) {
            // Ignore errors when clearing
          }
        }
      });
      
      // If it's businesses data, try with a very minimal sample
      if (key === 'businesses' && Array.isArray(data)) {
        const businesses = data as any[];
        
        // Ultra-minimal sample - only 100 businesses with bare minimum data
        const ultraMinimal = businesses.slice(0, 100).map(business => ({
          id: business.id,
          name: (business.name || '').substring(0, 30),
          coordinates: business.coordinates,
          provider: (business.provider || '').substring(0, 10),
        }));
        
        console.log(`📦 CACHE: Emergency storage - ultra minimal sample (${ultraMinimal.length} records)`);
        
        try {
          const now = Date.now();
          const duration = this.CACHE_DURATIONS[key];
          const cacheItem: CacheItem<T> = {
            data: ultraMinimal as T,
            timestamp: now,
            expiresAt: now + duration,
            version: this.CACHE_VERSION
          };
          
          const cacheKey = this.getCacheKey(key, userId);
          const serialized = JSON.stringify(cacheItem);
          const sizeKB = new Blob([serialized]).size / 1024;
          
          if (sizeKB < 500) { // Only store if less than 500KB
            localStorage.setItem(cacheKey, serialized);
            console.log(`💾 CACHE: Emergency storage successful (${sizeKB.toFixed(1)}KB)`);
          } else {
            console.warn(`⚠️ CACHE: Even emergency cache too large (${sizeKB.toFixed(1)}KB), giving up`);
          }
        } catch (emergencyError) {
          console.warn(`⚠️ CACHE: Emergency storage also failed:`, emergencyError);
          // Complete failure - disable caching for this session
          console.log('🚫 CACHE: Disabling cache for this session due to persistent quota issues');
        }
      }
    } catch (retryError) {
      console.warn(`⚠️ CACHE: Emergency cleanup failed:`, retryError);
    }
  }

  // Clear expired cache entries to free up space
  private clearExpiredCache(): void {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      const now = Date.now();
      let clearedCount = 0;
      
      cacheKeys.forEach(key => {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const item: CacheItem<any> = JSON.parse(cached);
            if (now > item.expiresAt) {
              localStorage.removeItem(key);
              clearedCount++;
            }
          }
        } catch {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
          clearedCount++;
        }
      });
      
      if (clearedCount > 0) {
        console.log(`🗑️ CACHE: Cleared ${clearedCount} expired cache entries`);
      }
    } catch (error) {
      console.warn('⚠️ CACHE: Failed to clear expired cache:', error);
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

  // Monitor and manage cache size
  manageCacheSize(): void {
    try {
      const stats = this.getStats();
      const sizeMB = stats.totalSize / (1024 * 1024);
      
      console.log(`📊 CACHE: Current size: ${sizeMB.toFixed(2)}MB (${stats.itemCount} items)`);
      
      // If cache is getting large (>8MB), clean up
      if (sizeMB > 8) {
        console.log('🧹 CACHE: Cache size exceeded 8MB, cleaning up...');
        
        // Remove expired items first
        this.clearExpiredCache();
        
        // If still too large, remove oldest items
        const updatedStats = this.getStats();
        if (updatedStats.totalSize / (1024 * 1024) > 8) {
          const sortedItems = updatedStats.items.sort((a, b) => b.age - a.age);
          const itemsToRemove = sortedItems.slice(0, Math.ceil(sortedItems.length / 2));
          
          itemsToRemove.forEach(item => {
            localStorage.removeItem(this.CACHE_PREFIX + item.key);
          });
          
          console.log(`🗑️ CACHE: Removed ${itemsToRemove.length} oldest cache items`);
        }
      }
    } catch (error) {
      console.warn('⚠️ CACHE: Failed to manage cache size:', error);
    }
  }
}

export const cacheService = new CacheService();
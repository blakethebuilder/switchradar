import type { Business, RouteItem } from '../types';
import { environmentConfig } from '../config/environment';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: SyncError[];
  timestamp: Date;
}

export interface SyncError {
  type: 'network' | 'server' | 'data' | 'auth';
  message: string;
  details?: any;
}

class CloudSyncService {
  private isOnlineStatus: boolean = navigator.onLine;

  constructor() {
    // Only track online status, no automatic syncing
    window.addEventListener('online', () => {
      this.isOnlineStatus = true;
    });

    window.addEventListener('offline', () => {
      this.isOnlineStatus = false;
    });
  }

  public isOnline(): boolean {
    return this.isOnlineStatus && environmentConfig.isCloudSyncEnabled();
  }

  // Manual sync to cloud - user initiated
  public async syncToCloud(businesses: Business[], routeItems: RouteItem[], token: string): Promise<SyncResult> {
    if (!this.isOnline()) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: businesses.length + routeItems.length,
        errors: [{
          type: 'network',
          message: 'No internet connection available'
        }],
        timestamp: new Date()
      };
    }

    const errors: SyncError[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    try {
      // Sync businesses
      if (businesses.length > 0) {
        const businessResult = await this.syncBusinessesToCloud(businesses, token);
        if (businessResult.success) {
          syncedCount += businesses.length;
        } else {
          failedCount += businesses.length;
          errors.push(...businessResult.errors);
        }
      }

      // Sync route items
      if (routeItems.length > 0) {
        const routeResult = await this.syncRoutesToCloud(routeItems, token);
        if (routeResult.success) {
          syncedCount += routeItems.length;
        } else {
          failedCount += routeItems.length;
          errors.push(...routeResult.errors);
        }
      }

      return {
        success: errors.length === 0,
        syncedCount,
        failedCount,
        errors,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: businesses.length + routeItems.length,
        errors: [{
          type: 'network',
          message: 'Sync operation failed',
          details: error
        }],
        timestamp: new Date()
      };
    }
  }

  private async syncBusinessesToCloud(businesses: Business[], token: string): Promise<SyncResult> {
    try {
      const apiUrl = environmentConfig.getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/businesses/sync` : '/api/businesses/sync';
      
      console.log('📤 Manual sync: Uploading businesses to cloud:', { 
        count: businesses.length, 
        fullUrl
      });

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ businesses })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📤 Business sync error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📤 Business sync success:', result);

      return {
        success: true,
        syncedCount: businesses.length,
        failedCount: 0,
        errors: [],
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: businesses.length,
        errors: [{
          type: 'network',
          message: 'Failed to sync businesses to cloud',
          details: error
        }],
        timestamp: new Date()
      };
    }
  }

  private async syncRoutesToCloud(routeItems: RouteItem[], token: string): Promise<SyncResult> {
    try {
      const apiUrl = environmentConfig.getApiUrl();
      const fullUrl = apiUrl ? `${apiUrl}/api/route/sync` : '/api/route/sync';
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ routeItems })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        syncedCount: routeItems.length,
        failedCount: 0,
        errors: [],
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: routeItems.length,
        errors: [{
          type: 'network',
          message: 'Failed to sync routes to cloud',
          details: error
        }],
        timestamp: new Date()
      };
    }
  }

  // Manual sync from cloud - user initiated
  public async syncFromCloud(token: string): Promise<{ businesses: Business[]; routeItems: RouteItem[] }> {
    if (!this.isOnline()) {
      console.log('⬇️ Manual sync: Offline - cannot download from cloud');
      return { businesses: [], routeItems: [] };
    }

    try {
      const apiUrl = environmentConfig.getApiUrl();
      console.log('⬇️ Manual sync: Downloading from cloud:', { apiUrl: apiUrl || 'relative' });

      // Fetch businesses from cloud
      const businessUrl = apiUrl ? `${apiUrl}/api/businesses` : '/api/businesses';
      const businessResponse = await fetch(businessUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Fetch routes from cloud
      const routeUrl = apiUrl ? `${apiUrl}/api/route` : '/api/route';
      const routeResponse = await fetch(routeUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let cloudBusinesses = [];
      let cloudRouteItems = [];

      if (businessResponse.ok) {
        const businessData = await businessResponse.json();
        // Handle both paginated and direct array responses
        cloudBusinesses = businessData.data || businessData;
      }

      if (routeResponse.ok) {
        cloudRouteItems = await routeResponse.json();
      }

      console.log('⬇️ Manual sync: Downloaded from cloud:', { 
        businessCount: cloudBusinesses.length, 
        routeCount: cloudRouteItems.length 
      });

      return { 
        businesses: cloudBusinesses, 
        routeItems: cloudRouteItems 
      };

    } catch (error) {
      console.error('Manual sync: Failed to download from cloud:', error);
      return { businesses: [], routeItems: [] };
    }
  }

  // Check connection status
  public async checkConnection(): Promise<boolean> {
    if (!environmentConfig.isCloudSyncEnabled()) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const apiUrl = environmentConfig.getApiUrl();
      const pingUrl = apiUrl ? `${apiUrl}/api/auth/ping` : '/api/auth/ping';
      
      const response = await fetch(pingUrl, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.isOnlineStatus = response.ok;
      return response.ok;
    } catch {
      this.isOnlineStatus = false;
      return false;
    }
  }
}

export const cloudSyncService = new CloudSyncService();
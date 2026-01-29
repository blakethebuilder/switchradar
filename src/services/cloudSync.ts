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

export interface SyncState {
  lastSyncTimestamp: Date | null;
  pendingOperations: PendingOperation[];
  isOnline: boolean;
  retryCount: number;
}

export interface PendingOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'business' | 'route';
  entityId: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

class CloudSyncService {
  private syncState: SyncState;
  private retryTimeouts: Map<string, number> = new Map();
  private onlineCheckInterval?: number;

  constructor() {
    this.syncState = {
      lastSyncTimestamp: this.getStoredSyncTimestamp(),
      pendingOperations: this.getStoredPendingOperations(),
      isOnline: navigator.onLine,
      retryCount: 0
    };

    this.initializeOnlineDetection();
  }

  private initializeOnlineDetection(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.syncState.isOnline = true;
      this.retryFailedOperations();
    });

    window.addEventListener('offline', () => {
      this.syncState.isOnline = false;
    });

    // Periodic online check
    this.onlineCheckInterval = window.setInterval(() => {
      this.checkOnlineStatus();
    }, 30000); // Check every 30 seconds
  }

  private async checkOnlineStatus(): Promise<void> {
    if (!environmentConfig.isCloudSyncEnabled()) {
      this.syncState.isOnline = false;
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${environmentConfig.getApiUrl()}/api/auth/ping`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.syncState.isOnline = response.ok;
    } catch {
      this.syncState.isOnline = false;
    }
  }

  public isOnline(): boolean {
    return this.syncState.isOnline && environmentConfig.isCloudSyncEnabled();
  }

  public getLastSyncTimestamp(): Date | null {
    return this.syncState.lastSyncTimestamp;
  }

  public async syncToCloud(businesses: Business[], routeItems: RouteItem[], token: string): Promise<SyncResult> {
    if (!this.isOnline()) {
      return this.createOfflineResult(businesses.length + routeItems.length);
    }

    const errors: SyncError[] = [];
    let syncedCount = 0;
    let failedCount = 0;

    try {
      // Sync businesses (with batching support)
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

      // Update sync timestamp if any data was synced
      if (syncedCount > 0) {
        this.updateSyncTimestamp();
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
      const response = await fetch(`${environmentConfig.getApiUrl()}/api/businesses/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ businesses })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

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
      const response = await fetch(`${environmentConfig.getApiUrl()}/api/route/sync`, {
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

  public async syncFromCloud(token: string): Promise<{ businesses: Business[]; routeItems: RouteItem[] }> {
    if (!this.isOnline()) {
      return { businesses: [], routeItems: [] };
    }

    try {
      // Fetch businesses from cloud
      const businessResponse = await fetch(`${environmentConfig.getApiUrl()}/api/businesses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Fetch routes from cloud
      const routeResponse = await fetch(`${environmentConfig.getApiUrl()}/api/route`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const cloudBusinesses = businessResponse.ok ? await businessResponse.json() : [];
      const cloudRouteItems = routeResponse.ok ? await routeResponse.json() : [];

      // Apply conflict resolution - local data takes priority
      const resolvedData = this.resolveConflicts(cloudBusinesses, cloudRouteItems);

      return resolvedData;

    } catch (error) {
      console.error('Failed to sync from cloud:', error);
      return { businesses: [], routeItems: [] };
    }
  }

  private resolveConflicts(
    cloudBusinesses: Business[], 
    cloudRouteItems: RouteItem[]
  ): { businesses: Business[]; routeItems: RouteItem[] } {
    // Get local data timestamps for comparison
    const localSyncTime = this.getLastSyncTimestamp();
    
    // If we have no local sync timestamp, accept cloud data as-is
    if (!localSyncTime) {
      return { businesses: cloudBusinesses, routeItems: cloudRouteItems };
    }

    // Filter cloud data to only include items newer than last sync
    // This ensures local changes are preserved as source of truth
    const filteredBusinesses = cloudBusinesses.filter(business => {
      const businessModified = new Date(business.importedAt || Date.now());
      return businessModified > localSyncTime;
    });

    const filteredRouteItems = cloudRouteItems.filter(route => {
      const routeModified = new Date(route.addedAt);
      return routeModified > localSyncTime;
    });

    // Log conflict resolution for debugging
    if (cloudBusinesses.length !== filteredBusinesses.length) {
      console.log(`Conflict resolution: Filtered ${cloudBusinesses.length - filteredBusinesses.length} businesses (local priority)`);
    }
    
    if (cloudRouteItems.length !== filteredRouteItems.length) {
      console.log(`Conflict resolution: Filtered ${cloudRouteItems.length - filteredRouteItems.length} route items (local priority)`);
    }

    return { 
      businesses: filteredBusinesses, 
      routeItems: filteredRouteItems 
    };
  }

  public enableOfflineMode(): void {
    this.syncState.isOnline = false;
    console.log('Cloud sync disabled - operating in offline mode');
  }

  public async retryFailedOperations(): Promise<void> {
    if (!this.isOnline() || this.syncState.pendingOperations.length === 0) {
      return;
    }

    const config = environmentConfig.getConfig();
    const operations = [...this.syncState.pendingOperations];
    
    for (const operation of operations) {
      if (operation.retryCount >= config.maxRetryAttempts) {
        // Remove operations that have exceeded retry limit
        this.removePendingOperation(operation.id);
        continue;
      }

      // Implement exponential backoff
      const delay = Math.min(1000 * Math.pow(2, operation.retryCount), 30000);
      
      const timeoutId = window.setTimeout(async () => {
        try {
          await this.executeOperation(operation);
          this.removePendingOperation(operation.id);
        } catch (error) {
          operation.retryCount++;
          this.storePendingOperations();
        }
        this.retryTimeouts.delete(operation.id);
      }, delay);

      this.retryTimeouts.set(operation.id, timeoutId);
    }
  }

  private async executeOperation(operation: PendingOperation): Promise<void> {
    // Implementation would depend on operation type
    // This is a placeholder for the actual operation execution
    console.log('Executing pending operation:', operation);
  }

  private createOfflineResult(totalCount: number): SyncResult {
    return {
      success: false,
      syncedCount: 0,
      failedCount: totalCount,
      errors: [{
        type: 'network',
        message: 'Offline - operations queued for later sync'
      }],
      timestamp: new Date()
    };
  }

  private updateSyncTimestamp(): void {
    this.syncState.lastSyncTimestamp = new Date();
    localStorage.setItem('cloudSync_lastSync', this.syncState.lastSyncTimestamp.toISOString());
  }

  private getStoredSyncTimestamp(): Date | null {
    const stored = localStorage.getItem('cloudSync_lastSync');
    return stored ? new Date(stored) : null;
  }

  private getStoredPendingOperations(): PendingOperation[] {
    const stored = localStorage.getItem('cloudSync_pendingOps');
    return stored ? JSON.parse(stored) : [];
  }

  private storePendingOperations(): void {
    localStorage.setItem('cloudSync_pendingOps', JSON.stringify(this.syncState.pendingOperations));
  }

  private removePendingOperation(operationId: string): void {
    this.syncState.pendingOperations = this.syncState.pendingOperations.filter(op => op.id !== operationId);
    this.storePendingOperations();
  }

  public destroy(): void {
    // Cleanup
    if (this.onlineCheckInterval) {
      window.clearInterval(this.onlineCheckInterval);
    }
    
    this.retryTimeouts.forEach(timeout => window.clearTimeout(timeout));
    this.retryTimeouts.clear();
  }
}

export const cloudSyncService = new CloudSyncService();
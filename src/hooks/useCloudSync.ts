import { useEffect, useState, useCallback } from 'react';
import type { Business, RouteItem } from '../types';
import { cloudSyncService } from '../services/cloudSync';
import { environmentConfig } from '../config/environment';

export const useCloudSync = (
  businesses: Business[],
  routeItems: RouteItem[],
  isAuthenticated: boolean,
  token: string | null
) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);

    // Initialize sync state
    useEffect(() => {
        setLastSyncTime(cloudSyncService.getLastSyncTimestamp());
    }, []);

    const pushToCloud = useCallback(async () => {
        if (!isAuthenticated || !token || !environmentConfig.isCloudSyncEnabled()) {
            console.log('Cloud sync disabled or not authenticated');
            return;
        }

        if (isSyncing) {
            console.log('Sync already in progress');
            return;
        }

        setIsSyncing(true);
        setSyncError(null);

        try {
            const result = await cloudSyncService.syncToCloud(businesses, routeItems, token);
            
            if (result.success) {
                setLastSyncTime(result.timestamp);
                console.log(`Sync successful: ${result.syncedCount} items synced`);
            } else {
                const errorMessage = result.errors.map(e => e.message).join(', ');
                setSyncError(errorMessage);
                console.error('Sync failed:', errorMessage);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
            setSyncError(errorMessage);
            console.error('Sync error:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [businesses, routeItems, isAuthenticated, token, isSyncing]);

    // Auto-sync effect
    useEffect(() => {
        if (!isAuthenticated || !token || !environmentConfig.isCloudSyncEnabled()) {
            return;
        }

        // Initial sync when authenticated
        if (businesses.length > 0 || routeItems.length > 0) {
            pushToCloud();
        }

        // Set up periodic sync
        const config = environmentConfig.getConfig();
        const syncInterval = setInterval(() => {
            if (cloudSyncService.isOnline() && !isSyncing) {
                pushToCloud();
            }
        }, config.syncIntervalMs);

        return () => clearInterval(syncInterval);
    }, [isAuthenticated, token, pushToCloud, isSyncing]);

    const clearCloudData = async () => {
        if (!isAuthenticated || !token || !environmentConfig.isCloudSyncEnabled()) {
            return;
        }

        try {
            const response = await fetch(`${environmentConfig.getApiUrl()}/api/workspace`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                console.log('Cloud workspace cleared successfully');
                setLastSyncTime(null);
            } else {
                throw new Error('Failed to clear cloud workspace');
            }
        } catch (error) {
            console.error('Error clearing cloud data:', error);
            setSyncError(error instanceof Error ? error.message : 'Failed to clear cloud data');
        }
    };

    return { 
        isSyncing, 
        lastSyncTime,
        syncError,
        isOnline: cloudSyncService.isOnline(),
        clearCloudData, 
        pushToCloud 
    };
};

import { useEffect, useState, useCallback } from 'react';
import type { Business, RouteItem } from '../types';

export const useCloudSync = (
    businesses: Business[],
    routeItems: RouteItem[],
    isAuthenticated: boolean,
    token: string | null
) => {
    const [isSyncing, setIsSyncing] = useState(false);

    const pushToCloud = useCallback(async () => {
        // Cloud sync disabled to prevent errors
        return;
    }, []);

    // Auto-Sync Effect (disabled)
    useEffect(() => {
        // Disabled
    }, []);

    const clearCloudData = async () => {
        // Disabled
        return;
    };

    return { isSyncing, clearCloudData, pushToCloud };
};

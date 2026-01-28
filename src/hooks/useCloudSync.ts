import { useEffect, useState } from 'react';
import type { Business, RouteItem } from '../types';

export const useCloudSync = (
    businesses: Business[],
    routeItems: RouteItem[],
    isAuthenticated: boolean,
    token: string | null
) => {
    const [isSyncing, setIsSyncing] = useState(false);

    // Sync to Cloud
    useEffect(() => {
        if (!isAuthenticated || !token) return;

        const syncToCloud = async () => {
            setIsSyncing(true);
            try {
                const API_URL = import.meta.env.VITE_API_URL || '';

                // Sync Businesses
                await fetch(`${API_URL}/api/leads/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ leads: businesses }),
                });

                // Sync Routes
                await fetch(`${API_URL}/api/route/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ routeItems }),
                });
            } catch (err) {
                console.error('Cloud synchronization failed:', err);
            } finally {
                setIsSyncing(false);
            }
        };

        const timer = setTimeout(syncToCloud, 3000); // 3s debounce for stability
        return () => clearTimeout(timer);
    }, [businesses, routeItems, isAuthenticated, token]);

    return { isSyncing };
};

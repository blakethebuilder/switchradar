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
        if (!isAuthenticated || !token) return;
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
    }, [businesses, routeItems, isAuthenticated, token]);

    // Auto-Sync Effect (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            pushToCloud();
        }, 5000); // 5s debounce for auto-sync
        return () => clearTimeout(timer);
    }, [businesses, routeItems, pushToCloud]);

    const clearCloudData = async () => {
        if (!isAuthenticated || !token) return;
        const API_URL = import.meta.env.VITE_API_URL || '';
        try {
            await fetch(`${API_URL}/api/workspace`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (err) {
            console.error('Failed to clear cloud data:', err);
        }
    };

    return { isSyncing, clearCloudData, pushToCloud };
};

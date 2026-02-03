import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { serverDataService } from '../services/serverData';
import { filterBusinesses, clearFilterCaches } from '../utils/dataProcessors';
import { useDebounce } from './useDebounce';
import { PerformanceMonitor } from '../utils/performance';
import type { Business, RouteItem } from '../types';

export const useBusinessData = () => {
    const { token, isAuthenticated } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [routeItems, setRouteItems] = useState<RouteItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);

    // Fetch businesses from server
    const fetchBusinesses = async (forceRefresh = false) => {
        if (!token || !isAuthenticated) {
            setBusinesses([]);
            setError(null);
            return;
        }

        // Don't refetch if we have recent data (unless forced)
        if (!forceRefresh && lastFetch && Date.now() - lastFetch.getTime() < 30000) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await serverDataService.getBusinesses(token);
            if (result.success) {
                setBusinesses(result.data || []);
                setLastFetch(new Date());
                setError(null); // Clear any previous errors
            } else {
                // Don't set error for empty data - just log it
                console.warn('Failed to fetch businesses:', result.error);
                setBusinesses([]); // Set empty array instead of error
                setError(null); // Don't show error to user for data loading failures
            }
        } catch (err) {
            console.error('Network error fetching businesses:', err);
            setBusinesses([]); // Set empty array instead of error
            setError(null); // Don't show error to user for network failures
        } finally {
            setLoading(false);
        }
    };

    // Fetch routes from server
    const fetchRoutes = async () => {
        if (!token || !isAuthenticated) {
            setRouteItems([]);
            return;
        }

        try {
            const result = await serverDataService.getRoutes(token);
            if (result.success) {
                setRouteItems(result.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch routes:', err);
        }
    };

    // Auto-fetch on mount and auth changes
    useEffect(() => {
        if (isAuthenticated && token) {
            fetchBusinesses();
            fetchRoutes();
        } else {
            setBusinesses([]);
            setRouteItems([]);
            setError(null);
        }
    }, [token, isAuthenticated]);

    const [searchInput, setSearchInput] = useState('');
    const searchTerm = useDebounce(searchInput, 300);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [visibleProviders, setVisibleProviders] = useState<string[]>([]);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [phoneType, setPhoneType] = useState<'all' | 'landline' | 'mobile'>('all');
    
    // Dropped Pin State for Filtering
    const [droppedPin, setDroppedPin] = useState<{ lat: number, lng: number } | null>(null);
    const [radiusKm, setRadiusKm] = useState<number>(0.5);

    // Clear caches when businesses change
    useEffect(() => {
        clearFilterCaches();
    }, [businesses.length]);

    const categories = useMemo(
        () => Array.from(new Set(businesses.map(b => b.category))).filter(Boolean).sort(),
        [businesses]
    );

    const availableProviders = useMemo(
        () => Array.from(new Set(businesses.map(b => b.provider))).filter(Boolean).sort(),
        [businesses]
    );

    // Initialize visibleProviders with all available providers when businesses change
    useEffect(() => {
        if (availableProviders.length > 0 && visibleProviders.length === 0 && !hasUserInteracted) {
            setVisibleProviders(availableProviders);
        }
    }, [availableProviders, visibleProviders.length, hasUserInteracted]);

    const filteredBusinesses = useMemo(() => {
        if (!businesses.length) return [];
        
        return PerformanceMonitor.measure('filterBusinesses', () => {
            return filterBusinesses(businesses, {
                searchTerm,
                selectedCategory,
                visibleProviders,
                phoneType,
                droppedPin: droppedPin ?? undefined,
                radiusKm
            });
        });
    }, [businesses, searchTerm, selectedCategory, visibleProviders, phoneType, droppedPin, radiusKm]);

    return {
        businesses,
        routeItems,
        filteredBusinesses,
        categories,
        availableProviders,
        searchTerm: searchInput, 
        setSearchTerm: setSearchInput,
        selectedCategory,
        setSelectedCategory,
        visibleProviders,
        setVisibleProviders,
        setHasUserInteracted,
        phoneType,
        setPhoneType,
        droppedPin,
        setDroppedPin,
        radiusKm,
        setRadiusKm,
        // Data insights
        totalBusinesses: businesses.length,
        filteredCount: filteredBusinesses.length,
        isLargeDataset: businesses.length > 1000,
        // Server status
        loading,
        error,
        lastFetch,
        refetch: () => fetchBusinesses(true),
        isDbReady: isAuthenticated && !error,
        dbError: error,
        // Database reset function (for compatibility)
        handleDatabaseReset: async () => {
            // In server-first architecture, this would clear server data
            if (token) {
                try {
                    await serverDataService.clearWorkspace(token);
                    await fetchBusinesses(true);
                } catch (err) {
                    console.error('Failed to reset database:', err);
                }
            }
        }
    };
};

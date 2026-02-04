import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { serverDataService } from '../services/serverData';
import { filterBusinesses, clearFilterCaches } from '../utils/dataProcessors';
import { useDebounce } from './useDebounce';
import { PerformanceMonitor } from '../utils/performance';
import { environmentConfig } from '../config/environment';
import type { Business, RouteItem } from '../types';

export const useBusinessData = () => {
    const { token, isAuthenticated } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [routeItems, setRouteItems] = useState<RouteItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);

    // Memoized fetch function to prevent unnecessary re-renders
    const fetchBusinesses = useCallback(async (forceRefresh = false) => {
        console.log('🚀 FETCH: fetchBusinesses called, forceRefresh:', forceRefresh);
        console.log('🔐 FETCH: Auth status - token present:', !!token, 'isAuthenticated:', isAuthenticated);
        
        if (!token || !isAuthenticated) {
            console.log('❌ FETCH: No auth, clearing businesses');
            setBusinesses([]);
            setError(null);
            return;
        }

        // Don't refetch if we have recent data (unless forced)
        if (!forceRefresh && lastFetch && Date.now() - lastFetch.getTime() < 30000) {
            console.log('⏭️ FETCH: Skipping fetch, recent data available');
            return;
        }

        console.log('🚀 FETCH: Starting data fetch from server');
        setLoading(true);
        setError(null);

        try {
            const result = await serverDataService.getBusinesses(token);
            console.log('📥 FETCH: Server response:', result);
            
            if (result.success) {
                console.log('✅ FETCH: Success, businesses count:', result.data?.length || 0);
                setBusinesses(result.data || []);
                setLastFetch(new Date());
                setError(null); // Clear any previous errors
            } else {
                // Don't set error for empty data - just log it
                console.warn('⚠️ FETCH: Failed to fetch businesses:', result.error);
                setBusinesses([]); // Set empty array instead of error
                setError(null); // Don't show error to user for data loading failures
            }
        } catch (err) {
            console.error('❌ FETCH: Network error fetching businesses:', err);
            setBusinesses([]); // Set empty array instead of error
            setError(null); // Don't show error to user for network failures
        } finally {
            console.log('🏁 FETCH: Fetch completed, setting loading to false');
            setLoading(false);
        }
    }, [token, isAuthenticated, lastFetch]);

    // Memoized fetch routes function
    const fetchRoutes = useCallback(async () => {
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
    }, [token, isAuthenticated]);

    const [searchInput, setSearchInput] = useState('');
    const searchTerm = useDebounce(searchInput, 300);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [visibleProviders, setVisibleProviders] = useState<string[]>([]);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [phoneType, setPhoneType] = useState<'all' | 'landline' | 'mobile'>('all');
    
    // Dataset state
    const [availableDatasets, setAvailableDatasets] = useState<Array<{id: number, name: string, town?: string}>>([]);
    const [selectedDatasets, setSelectedDatasets] = useState<number[]>([]);
    
    // Dropped Pin State for Filtering
    const [droppedPin, setDroppedPin] = useState<{ lat: number, lng: number } | null>(null);
    const [radiusKm, setRadiusKm] = useState<number>(0.5);

    // Fetch available datasets
    const fetchDatasets = useCallback(async () => {
        if (!token || !isAuthenticated) {
            setAvailableDatasets([]);
            return;
        }

        try {
            const response = await fetch(`${environmentConfig.getApiUrl()}/api/datasets`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const datasets = await response.json();
                setAvailableDatasets(datasets.map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    town: d.town
                })));
                
                // Auto-select all datasets if none selected
                if (selectedDatasets.length === 0) {
                    setSelectedDatasets(datasets.map((d: any) => d.id));
                }
            }
        } catch (err) {
            console.error('Failed to fetch datasets:', err);
        }
    }, [token, isAuthenticated, selectedDatasets.length]);

    // Auto-fetch on mount and auth changes
    useEffect(() => {
        if (isAuthenticated && token) {
            fetchBusinesses();
            fetchRoutes();
            fetchDatasets();
        } else {
            setBusinesses([]);
            setRouteItems([]);
            setAvailableDatasets([]);
            setSelectedDatasets([]);
            setError(null);
        }
    }, [token, isAuthenticated, fetchBusinesses, fetchRoutes, fetchDatasets]);

    // Clear caches when businesses change
    useEffect(() => {
        clearFilterCaches();
    }, [businesses.length]);

    // Memoized categories calculation with better performance
    const categories = useMemo(
        () => {
            if (!businesses.length) return [];
            return PerformanceMonitor.measure('calculateCategories', () => {
                const categorySet = new Set<string>();
                for (const business of businesses) {
                    if (business.category) {
                        categorySet.add(business.category);
                    }
                }
                return Array.from(categorySet).sort();
            });
        },
        [businesses]
    );

    // Memoized providers calculation with better performance
    const availableProviders = useMemo(
        () => {
            if (!businesses.length) return [];
            return PerformanceMonitor.measure('calculateProviders', () => {
                const providerSet = new Set<string>();
                for (const business of businesses) {
                    if (business.provider) {
                        providerSet.add(business.provider);
                    }
                }
                return Array.from(providerSet).sort();
            });
        },
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
        // Dataset management
        availableDatasets,
        selectedDatasets,
        setSelectedDatasets,
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

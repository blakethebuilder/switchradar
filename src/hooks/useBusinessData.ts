import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { serverDataService } from '../services/serverData';
import { cacheService } from '../services/cacheService';
import { filterBusinesses, clearFilterCaches } from '../utils/dataProcessors';
import { useDebounce } from './useDebounce';
import { PerformanceMonitor } from '../utils/performance';
import { environmentConfig } from '../config/environment';
import type { Business, RouteItem } from '../types';

export const useBusinessData = () => {
    const { token, isAuthenticated } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [routeItems, setRouteItems] = useState<RouteItem[]>([]);
    const [loading, setLoading] = useState(true); // Default to true to prevent "No Data" flash
    const [error, setError] = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);
    const [cacheStatus, setCacheStatus] = useState<'loading' | 'cached' | 'fresh' | 'error'>('loading');

    // Note: fetchBusinesses removed - businesses are now fetched in the initialization effect

    const [searchInput, setSearchInput] = useState('');
    const searchTerm = useDebounce(searchInput, 500); // Increased from 300ms to 500ms to reduce API calls

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedTown, setSelectedTown] = useState('');
    const [visibleProviders, setVisibleProviders] = useState<string[]>([]);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [phoneType, setPhoneType] = useState<'all' | 'landline' | 'mobile'>('all');

    // Dataset state
    const [availableDatasets, setAvailableDatasets] = useState<Array<{ id: number, name: string, town?: string }>>([]);
    const [selectedDatasets, setSelectedDatasets] = useState<number[]>([]);

    // Dropped Pin State for Filtering
    const [droppedPin, setDroppedPin] = useState<{ lat: number, lng: number } | null>(null);
    const [radiusKm, setRadiusKm] = useState<number>(0.5);

    // Note: fetchDatasets removed - datasets are now fetched in the initialization effect

    // Auto-fetch on mount and auth changes - Prevent duplicate calls with ref
    const initializationRef = useRef(false);
    const isInitializing = useRef(false);
    const backgroundRefreshScheduled = useRef(false);

    useEffect(() => {
        console.log('🔐 DATA: Auth effect triggered', { isAuthenticated, tokenPresent: !!token });

        // If not authenticated (and not waiting for auth), stop loading
        if (!isAuthenticated && !token) {
            console.log('🔐 DATA: Not authenticated, clearing data');
            setBusinesses([]);
            setRouteItems([]);
            setAvailableDatasets([]);
            setSelectedDatasets([]);
            setError(null);
            setLoading(false);
            setCacheStatus('loading');
            initializationRef.current = false;
            isInitializing.current = false;
            backgroundRefreshScheduled.current = false;
            return;
        }

        // Prevent duplicate initialization
        if (initializationRef.current || isInitializing.current) {
            console.log('🔐 DATA: Initialization already completed or in progress, skipping');
            return;
        }

        if (isAuthenticated && token) {
            // Check if we have cached data first
            const cachedBusinesses = cacheService.getBusinesses();
            const cachedRoutes = cacheService.getRoutes();
            const cachedDatasets = cacheService.getDatasets();

            if (cachedBusinesses || cachedRoutes || cachedDatasets) {
                console.log('📦 CACHE: Found cached data, loading immediately');
                setCacheStatus('cached');

                if (cachedBusinesses) {
                    setBusinesses(cachedBusinesses);
                    setLastFetch(new Date());
                }
                if (cachedRoutes) {
                    setRouteItems(cachedRoutes);
                }
                if (cachedDatasets) {
                    setAvailableDatasets(cachedDatasets);
                    if (cachedDatasets.length > 0) {
                        setSelectedDatasets(prev => prev.length === 0 ? cachedDatasets.map((d: any) => d.id) : prev);
                    }
                }

                // Set loading to false since we have cached data
                setLoading(false);
                initializationRef.current = true;
                isInitializing.current = false;

                // Optionally fetch fresh data in background after a delay (only once)
                if (!backgroundRefreshScheduled.current) {
                    backgroundRefreshScheduled.current = true;
                    const backgroundRefreshTimer = setTimeout(() => {
                        console.log('🔄 CACHE: Refreshing data in background');
                        initializeDataFromServer(true); // Background refresh
                    }, 3000); // Increased delay to prevent immediate refetch

                    return () => clearTimeout(backgroundRefreshTimer);
                }
            } else {
                // No cached data, ENSURE loading is true before fetching
                console.log('📡 DATA: No cached data, fetching from server...');
                setLoading(true);
                setCacheStatus('loading');
                initializeDataFromServer(false);
            }
        }
    }, [token, isAuthenticated]); // CRITICAL: Only depend on auth state to prevent infinite loops

    const [loadingProgress, setLoadingProgress] = useState<string>('');

    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 1000;

    // Load initial data from Cloud if available
    const initializeDataFromServer = useCallback(async (isBackgroundRefresh = false) => {
        if (isInitializing.current && !isBackgroundRefresh) {
            console.log('⏭️ DATA: Skipping fetch - already initializing');
            return;
        }

        if (!token) {
            console.log('⏭️ DATA: Skipping fetch - no token');
            return;
        }

        isInitializing.current = true;
        console.log('🚀 DATA: Starting server fetch...', { isBackgroundRefresh });

        try {
            // Fetch first page of businesses
            const businessesResult = await serverDataService.getBusinessesPaginated(token || '', 1, PAGE_SIZE);

            // Fetch datasets and routes in parallel
            const [datasetsResult, routesResult] = await Promise.all([
                fetch(`${environmentConfig.getApiUrl()}/api/datasets`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.ok ? r.json() : []).catch(() => []),
                serverDataService.getRoutes(token || '', isBackgroundRefresh)
            ]);

            // Process datasets
            if (datasetsResult) {
                let datasets = [];
                if (Array.isArray(datasetsResult)) {
                    datasets = datasetsResult;
                } else if (datasetsResult && typeof datasetsResult === 'object') {
                    if (Array.isArray(datasetsResult.data)) {
                        datasets = datasetsResult.data;
                    } else if (Array.isArray(datasetsResult.datasets)) {
                        datasets = datasetsResult.datasets;
                    }
                }

                const validDatasets = datasets
                    .filter((d: any) => d && typeof d === 'object' && d.id && d.name)
                    .map((d: any) => ({
                        id: d.id,
                        name: d.name,
                        town: d.town || ''
                    }));

                setAvailableDatasets(validDatasets);
                cacheService.setDatasets(validDatasets);

                if (validDatasets.length > 0) {
                    setSelectedDatasets(prev => prev.length === 0 ? validDatasets.map((d: any) => d.id) : prev);
                }
            }

            // Process businesses
            if (businessesResult.success) {
                const businessData = businessesResult.data || [];
                setBusinesses(businessData);
                setHasMore(businessData.length === PAGE_SIZE);
                setPage(1);
                setLastFetch(new Date());
            }

            // Process routes
            if (routesResult.success) {
                setRouteItems(routesResult.data || []);
            }

            console.log('✅ DATA: Initial data fetched successfully');
            setCacheStatus('fresh');
            initializationRef.current = true;
        } catch (error) {
            console.error('❌ DATA: Error during data initialization:', error);
            setCacheStatus('error');
        } finally {
            isInitializing.current = false;
            if (!isBackgroundRefresh) {
                setLoading(false);
            }
        }
    }, [token]);

    const loadMore = useCallback(async () => {
        if (!hasMore || loading || !token) return;

        setLoading(true);
        const nextPage = page + 1;

        try {
            console.log(`📥 DATA: Loading more businesses (Page ${nextPage})...`);
            const result = await serverDataService.getBusinessesPaginated(token, nextPage, PAGE_SIZE);

            if (result.success) {
                const newData = result.data || [];
                setBusinesses(prev => [...prev, ...newData]);
                setHasMore(newData.length === PAGE_SIZE);
                setPage(nextPage);
            }
        } catch (err) {
            console.error('Failed to load more businesses:', err);
        } finally {
            setLoading(false);
        }
    }, [hasMore, loading, page, token]);
    // Clear caches when businesses change
    useEffect(() => {
        clearFilterCaches();
    }, [businesses.length]);

    // Memoized categories calculation with better performance for large datasets
    const categories = useMemo(
        () => {
            if (!businesses.length) return [];
            return PerformanceMonitor.measure('calculateCategories', () => {
                const categorySet = new Set<string>();
                // For large datasets, limit processing to improve performance and use sampling
                const sampleSize = businesses.length > 2000 ? 1000 : businesses.length;
                const step = Math.max(1, Math.floor(businesses.length / sampleSize));

                for (let i = 0; i < businesses.length; i += step) {
                    const business = businesses[i];
                    if (business.category) {
                        categorySet.add(business.category);
                    }
                }
                const result = Array.from(categorySet).sort();
                console.log('📊 CATEGORIES: Calculated', result.length, 'categories from', Math.min(sampleSize, businesses.length), 'businesses (sampled)');
                return result;
            });
        },
        [businesses.length] // Only recalculate when business count changes, not on every business change
    );

    // Memoized towns calculation with better performance for large datasets
    const availableTowns = useMemo(
        () => {
            if (!businesses.length) return [];
            return PerformanceMonitor.measure('calculateTowns', () => {
                const townSet = new Set<string>();
                // For large datasets, limit processing to improve performance and use sampling
                const sampleSize = businesses.length > 2000 ? 1000 : businesses.length;
                const step = Math.max(1, Math.floor(businesses.length / sampleSize));

                for (let i = 0; i < businesses.length; i += step) {
                    const business = businesses[i];
                    if (business.town) {
                        townSet.add(business.town);
                    }
                }
                const result = Array.from(townSet).sort();
                console.log('🏘️ TOWNS: Calculated', result.length, 'towns from', Math.min(sampleSize, businesses.length), 'businesses (sampled)');
                return result;
            });
        },
        [businesses.length] // Only recalculate when business count changes
    );

    // Memoized providers calculation with better performance for large datasets
    const availableProviders = useMemo(
        () => {
            if (!businesses.length) return [];
            return PerformanceMonitor.measure('calculateProviders', () => {
                const providerSet = new Set<string>();
                // For large datasets, limit processing to improve performance and use sampling
                const sampleSize = businesses.length > 2000 ? 1000 : businesses.length;
                const step = Math.max(1, Math.floor(businesses.length / sampleSize));

                for (let i = 0; i < businesses.length; i += step) {
                    const business = businesses[i];
                    if (business.provider) {
                        providerSet.add(business.provider);
                    }
                }
                const result = Array.from(providerSet).sort();
                console.log('🏢 PROVIDERS: Calculated', result.length, 'providers from', Math.min(sampleSize, businesses.length), 'businesses (sampled)');
                return result;
            });
        },
        [businesses.length] // Only recalculate when business count changes
    );

    // Initialize visibleProviders with all available providers when businesses change
    useEffect(() => {
        if (availableProviders.length > 0 && visibleProviders.length === 0 && !hasUserInteracted) {
            setVisibleProviders(availableProviders);
        }
    }, [availableProviders, visibleProviders.length, hasUserInteracted]);

    const filteredBusinesses = useMemo(() => {
        console.log('🔍 FILTER: Starting filteredBusinesses calculation', {
            businessesCount: businesses.length,
            searchTerm,
            selectedCategory,
            selectedTown,
            visibleProviders: visibleProviders.length,
            phoneType
        });

        if (!businesses.length && !loading) {
            console.log('🔍 FILTER: No businesses, returning empty array');
            return [];
        }

        // For very large datasets (>2000), show loading indicator and defer heavy calculations
        if (businesses.length > 2000) {
            console.log('🔍 FILTER: Large dataset detected, optimizing performance');
        }

        return PerformanceMonitor.measure('filterBusinesses', () => {
            // CRITICAL FIX: Skip dataset filtering for now since it's causing all businesses to be filtered out
            // The dataset matching logic needs to be fixed on the backend first
            let datasetFilteredBusinesses = businesses;

            console.log('🔍 FILTER: Skipping dataset filtering - showing all businesses to prevent empty results');

            const finalFiltered = filterBusinesses(datasetFilteredBusinesses, {
                searchTerm,
                selectedCategory,
                selectedTown,
                visibleProviders,
                phoneType,
                droppedPin: droppedPin ?? undefined,
                radiusKm
            });

            console.log('🔍 FILTER: Final filtering result:', {
                afterDatasetFilter: datasetFilteredBusinesses.length,
                finalCount: finalFiltered.length,
                sampleBusiness: finalFiltered[0] ? {
                    id: finalFiltered[0].id,
                    name: finalFiltered[0].name,
                    coordinates: finalFiltered[0].coordinates
                } : null
            });

            return finalFiltered;
        });
    }, [businesses, searchTerm, selectedCategory, selectedTown, visibleProviders, phoneType, droppedPin, radiusKm, loading]);

    return {
        businesses,
        routeItems,
        filteredBusinesses,
        categories,
        availableTowns,
        availableProviders,
        searchTerm: searchInput,
        setSearchTerm: setSearchInput,
        selectedCategory,
        setSelectedCategory,
        selectedTown,
        setSelectedTown,
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
        cacheStatus,
        hasMore,
        loadMore,
        refetch: useCallback(async (forceRefresh = false) => {
            console.log('🔄 REFETCH: Manual refetch triggered', { forceRefresh });

            if (isInitializing.current) {
                console.log('🔄 REFETCH: Already initializing, skipping refetch');
                return;
            }

            if (forceRefresh) {
                cacheService.clearAll();
                console.log('🗑️ CACHE: Cleared all caches for force refresh');
            }

            setLastFetch(null);
            setLoading(true);
            setCacheStatus('loading');
            isInitializing.current = true;

            try {
                setLoadingProgress('Initializing refetch...');

                // 1. Fetch Datasets
                const datasetsResponse = await fetch(`${environmentConfig.getApiUrl()}/api/datasets`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });

                if (datasetsResponse.ok) {
                    const result = await datasetsResponse.json();
                    let datasets = Array.isArray(result) ? result : (result.data || result.datasets || []);
                    const validDatasets = datasets
                        .filter((d: any) => d && typeof d === 'object' && d.id && d.name)
                        .map((d: any) => ({ id: d.id, name: d.name, town: d.town || '' }));
                    setAvailableDatasets(validDatasets);
                    cacheService.setDatasets(validDatasets);
                    setSelectedDatasets(prev => prev.length === 0 && validDatasets.length > 0 ? validDatasets.map((d: any) => d.id) : prev);
                }

                // 2. Fetch Routes
                const routeResult = await serverDataService.getRoutes(token || '', forceRefresh);
                if (routeResult.success) {
                    setRouteItems(routeResult.data || []);
                }

                // 3. Progressive Fetch Businesses
                let allBusinesses: Business[] = [];
                let page = 1;
                let hasMore = true;
                const chunkSize = 2000;

                while (hasMore) {
                    setLoadingProgress(`Refreshing businesses (Page ${page})...`);
                    const response = await fetch(`${environmentConfig.getApiUrl()}/api/businesses?page=${page}&limit=${chunkSize}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    const businessesChunk = result.data || result.businesses || [];

                    if (!Array.isArray(businessesChunk) || businessesChunk.length === 0) {
                        hasMore = false;
                    } else {
                        allBusinesses = [...allBusinesses, ...businessesChunk];
                        // Only update state every 5 chunks (10k items) to prevent UI freezing
                        if (page % 5 === 0 || businessesChunk.length < chunkSize) {
                            setBusinesses([...allBusinesses]);
                        }
                        hasMore = businessesChunk.length === chunkSize;
                        page++;
                    }
                    if (page > 200) break; // Safety limit
                }

                setBusinesses(allBusinesses);
                cacheService.setBusinesses(allBusinesses);
                setLastFetch(new Date());
                setCacheStatus('fresh');
            } catch (error) {
                console.error('❌ REFETCH: Error during manual refetch:', error);
                setCacheStatus('error');
                setError('Failed to refresh data');
            } finally {
                isInitializing.current = false;
                setLoading(false);
                setLoadingProgress('');
            }
        }, [token]),
        // Lightweight route-only refetch (doesn't refetch businesses)
        refetchRoutes: useCallback(async () => {
            if (!token) return;

            try {
                console.log('🔄 ROUTES: Fetching updated routes only...');
                const routeResult = await serverDataService.getRoutes(token, true);
                if (routeResult.success) {
                    setRouteItems(routeResult.data || []);
                    console.log('✅ ROUTES: Routes updated successfully');
                }
            } catch (error) {
                console.error('❌ ROUTES: Failed to refetch routes:', error);
            }
        }, [token]),
        isDbReady: isAuthenticated && !error,
        dbError: error,
        loadingProgress,
        // Database reset function (for compatibility)
        handleDatabaseReset: async () => {
            // In server-first architecture, this would clear server data
            if (token) {
                try {
                    await serverDataService.clearWorkspace(token);
                    // Clear caches and trigger a refetch
                    cacheService.clearAll();
                    setLastFetch(null);
                    setBusinesses([]);
                } catch (err) {
                    console.error('Failed to reset database:', err);
                }
            }
        },
        // Cache management functions
        clearCache: () => {
            cacheService.clearAll();
            console.log('🗑️ CACHE: Manually cleared all caches');
        },
        getCacheStats: () => cacheService.getStats(),
        getCacheInfo: (key: 'businesses' | 'routes' | 'datasets') => cacheService.getInfo(key)
    };
};

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

    const [searchInput, setSearchInput] = useState('');
    const searchTerm = useDebounce(searchInput, 500);

    const [selectedCategoryInput, setSelectedCategoryInput] = useState('');
    const selectedCategory = useDebounce(selectedCategoryInput, 300);

    const [selectedTownInput, setSelectedTownInput] = useState('');
    const selectedTown = useDebounce(selectedTownInput, 300);

    const [visibleProviders, setVisibleProviders] = useState<string[]>([]);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [phoneType, setPhoneType] = useState<'all' | 'landline' | 'mobile'>('all');

    // Dataset state
    const [availableDatasets, setAvailableDatasets] = useState<Array<{ id: number, name: string, town?: string }>>([]);
    const [selectedDatasets, setSelectedDatasets] = useState<number[]>([]);

    // Dropped Pin State for Filtering
    const [droppedPin, setDroppedPin] = useState<{ lat: number, lng: number } | null>(null);
    const [radiusKm, setRadiusKm] = useState<number>(0.5);

    const [loadingProgress, setLoadingProgress] = useState<string>('');

    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 1000;

    // Refs for initialization control
    const initializationRef = useRef(false);
    const isInitializing = useRef(false);
    const backgroundRefreshScheduled = useRef(false);

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

    useEffect(() => {
        console.log('🔐 DATA: Auth effect triggered', { isAuthenticated, tokenPresent: !!token });

        if (!isAuthenticated && !token) {
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

        if (initializationRef.current || isInitializing.current) {
            console.log('🔐 DATA: Initialization already completed or in progress, skipping');
            return;
        }

        if (isAuthenticated && token) {
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
                        setBusinesses(b => [...b]); 
                    }
                }

                setLoading(false);
                initializationRef.current = true;

                if (!backgroundRefreshScheduled.current) {
                    backgroundRefreshScheduled.current = true;
                    const backgroundRefreshTimer = setTimeout(() => {
                        console.log('🔄 CACHE: Refreshing data in background');
                        initializeDataFromServer(true);
                    }, 60000);

                    return () => clearTimeout(backgroundRefreshTimer);
                }
            } else {
                console.log('📡 DATA: No cached data, fetching from server...');
                setLoading(true);
                setCacheStatus('loading');
                initializeDataFromServer(false);
            }
        }
    }, [token, isAuthenticated, initializeDataFromServer]);

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

    useEffect(() => {
        clearFilterCaches();
    }, [businesses.length]);

    const categories = useMemo(() => {
        if (!businesses.length) return [];
        return PerformanceMonitor.measure('calculateCategories', () => {
            const categorySet = new Set<string>();
            const sampleSize = businesses.length > 2000 ? 1000 : businesses.length;
            const step = Math.max(1, Math.floor(businesses.length / sampleSize));

            for (let i = 0; i < businesses.length; i += step) {
                const business = businesses[i];
                if (business.category) {
                    categorySet.add(business.category);
                }
            }
            const result = Array.from(categorySet).sort();
            return result;
        });
    }, [businesses.length]);

    const availableTowns = useMemo(() => {
        if (!businesses.length) return [];
        return PerformanceMonitor.measure('calculateTowns', () => {
            const townSet = new Set<string>();
            const sampleSize = businesses.length > 2000 ? 1000 : businesses.length;
            const step = Math.max(1, Math.floor(businesses.length / sampleSize));

            for (let i = 0; i < businesses.length; i += step) {
                const business = businesses[i];
                if (business.town) {
                    townSet.add(business.town);
                }
            }
            const result = Array.from(townSet).sort();
            return result;
        });
    }, [businesses.length]);

    const availableProviders = useMemo(() => {
        if (!businesses.length) return [];
        return PerformanceMonitor.measure('calculateProviders', () => {
            const providerSet = new Set<string>();
            const sampleSize = businesses.length > 2000 ? 1000 : businesses.length;
            const step = Math.max(1, Math.floor(businesses.length / sampleSize));

            for (let i = 0; i < businesses.length; i += step) {
                const business = businesses[i];
                if (business.provider) {
                    providerSet.add(business.provider);
                }
            }
            const result = Array.from(providerSet).sort();
            return result;
        });
    }, [businesses.length]);

    useEffect(() => {
        if (availableProviders.length > 0 && visibleProviders.length === 0 && !hasUserInteracted) {
            setVisibleProviders(availableProviders);
        }
    }, [availableProviders, visibleProviders.length, hasUserInteracted]);

    const filteredBusinesses = useMemo(() => {
        if (!businesses.length && !loading) {
            return [];
        }

        return PerformanceMonitor.measure('filterBusinesses', () => {
            const datasetFilteredBusinesses = businesses;
            const finalFiltered = filterBusinesses(datasetFilteredBusinesses, {
                searchTerm,
                selectedCategory,
                selectedTown,
                visibleProviders,
                phoneType,
                droppedPin: droppedPin ?? undefined,
                radiusKm
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
        selectedCategory: selectedCategoryInput,
        setSelectedCategory: setSelectedCategoryInput,
        selectedTown: selectedTownInput,
        setSelectedTown: setSelectedTownInput,
        visibleProviders,
        setVisibleProviders,
        setHasUserInteracted,
        phoneType,
        setPhoneType,
        droppedPin,
        setDroppedPin,
        radiusKm,
        setRadiusKm,
        availableDatasets,
        selectedDatasets,
        setSelectedDatasets,
        totalBusinesses: businesses.length,
        filteredCount: filteredBusinesses.length,
        isLargeDataset: businesses.length > 1000,
        loading,
        error,
        lastFetch,
        cacheStatus,
        hasMore,
        loadMore,
        refetch: useCallback(async (forceRefresh = false) => {
            if (isInitializing.current) return;
            if (forceRefresh) cacheService.clearAll();

            setLastFetch(null);
            setLoading(true);
            setCacheStatus('loading');
            isInitializing.current = true;

            try {
                setLoadingProgress('Initializing refetch...');
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

                const routeResult = await serverDataService.getRoutes(token || '', forceRefresh);
                if (routeResult.success) setRouteItems(routeResult.data || []);

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
                        if (page % 5 === 0 || businessesChunk.length < chunkSize) setBusinesses([...allBusinesses]);
                        hasMore = businessesChunk.length === chunkSize;
                        page++;
                    }
                    if (page > 200) break;
                }

                setBusinesses(allBusinesses);
                cacheService.setBusinesses(allBusinesses);
                setLastFetch(new Date());
                setCacheStatus('fresh');
            } catch (error) {
                setCacheStatus('error');
                setError('Failed to refresh data');
            } finally {
                isInitializing.current = false;
                setLoading(false);
                setLoadingProgress('');
            }
        }, [token]),
        refetchRoutes: useCallback(async () => {
            if (!token) return;
            try {
                const routeResult = await serverDataService.getRoutes(token, true);
                if (routeResult.success) setRouteItems(routeResult.data || []);
            } catch (error) {
                console.error('❌ ROUTES: Failed to refetch routes:', error);
            }
        }, [token]),
        isDbReady: isAuthenticated && !error,
        dbError: error,
        loadingProgress,
        handleDatabaseReset: async () => {
            if (token) {
                try {
                    await serverDataService.clearWorkspace(token);
                    cacheService.clearAll();
                    setLastFetch(null);
                    setBusinesses([]);
                } catch (err) {
                    console.error('Failed to reset database:', err);
                }
            }
        },
        clearCache: () => cacheService.clearAll(),
        getCacheStats: () => cacheService.getStats(),
        getCacheInfo: (key: 'businesses' | 'routes' | 'datasets') => cacheService.getInfo(key)
    };
};

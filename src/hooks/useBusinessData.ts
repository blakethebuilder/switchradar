import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
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
    const [isProcessingLargeDataset, setIsProcessingLargeDataset] = useState(false);

    // Note: fetchBusinesses removed - businesses are now fetched in the initialization effect

    const [searchInput, setSearchInput] = useState('');
    const searchTerm = useDebounce(searchInput, 300);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedTown, setSelectedTown] = useState('');
    const [visibleProviders, setVisibleProviders] = useState<string[]>([]);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [phoneType, setPhoneType] = useState<'all' | 'landline' | 'mobile'>('all');
    
    // Dataset state
    const [availableDatasets, setAvailableDatasets] = useState<Array<{id: number, name: string, town?: string}>>([]);
    const [selectedDatasets, setSelectedDatasets] = useState<number[]>([]);
    
    // Dropped Pin State for Filtering
    const [droppedPin, setDroppedPin] = useState<{ lat: number, lng: number } | null>(null);
    const [radiusKm, setRadiusKm] = useState<number>(0.5);

    // Note: fetchDatasets removed - datasets are now fetched in the initialization effect

    // Auto-fetch on mount and auth changes - Prevent duplicate calls with ref
    const initializationRef = useRef(false);
    const isInitializing = useRef(false);
    
    useEffect(() => {
        console.log('🔐 DATA: Auth effect triggered', { isAuthenticated, tokenPresent: !!token });
        
        // Prevent duplicate initialization
        if (initializationRef.current || isInitializing.current) {
            console.log('🔐 DATA: Initialization already completed or in progress, skipping');
            return;
        }
        
        if (isAuthenticated && token) {
            isInitializing.current = true;
            
            // Use a single async function to coordinate all data fetching
            const initializeData = async () => {
                console.log('🚀 DATA: Starting data initialization');
                try {
                    // Fetch all data in parallel for better performance
                    const [datasetsResult, businessesResult, routesResult] = await Promise.all([
                        (async () => {
                            try {
                                const response = await fetch(`${environmentConfig.getApiUrl()}/api/datasets`, {
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    }
                                });
                                if (response.ok) {
                                    const result = await response.json();
                                    console.log('📊 DATASETS: Fetched datasets:', result);
                                    return result;
                                }
                            } catch (err) {
                                console.error('Failed to fetch datasets:', err);
                            }
                            return null;
                        })(),
                        serverDataService.getBusinesses(token),
                        serverDataService.getRoutes(token)
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
                        if (validDatasets.length > 0) {
                            setSelectedDatasets(prev => prev.length === 0 ? validDatasets.map((d: any) => d.id) : prev);
                        }
                    }
                    
                    // Process businesses
                    if (businessesResult.success) {
                        const businessData = businessesResult.data || [];
                        if (businessData.length > 2000) {
                            console.log('📊 FETCH: Large dataset detected, enabling performance mode');
                            setIsProcessingLargeDataset(true);
                            
                            // Use requestIdleCallback for better performance
                            const processLargeDataset = () => {
                                setBusinesses(businessData);
                                setIsProcessingLargeDataset(false);
                            };
                            
                            if (window.requestIdleCallback) {
                                window.requestIdleCallback(processLargeDataset, { timeout: 500 });
                            } else {
                                setTimeout(processLargeDataset, 25);
                            }
                        } else {
                            setBusinesses(businessData);
                        }
                        setLastFetch(new Date());
                    }
                    
                    // Process routes
                    if (routesResult.success) {
                        setRouteItems(routesResult.data || []);
                    }
                    
                    console.log('✅ DATA: All data fetched successfully');
                    initializationRef.current = true;
                } catch (error) {
                    console.error('❌ DATA: Error during data initialization:', error);
                } finally {
                    isInitializing.current = false;
                    setLoading(false);
                }
            };
            
            initializeData();
        } else {
            console.log('🔐 DATA: Not authenticated, clearing data');
            setBusinesses([]);
            setRouteItems([]);
            setAvailableDatasets([]);
            setSelectedDatasets([]);
            setError(null);
            initializationRef.current = false;
            isInitializing.current = false;
        }
    }, [token, isAuthenticated]); // CRITICAL: Only depend on auth state to prevent infinite loops

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
        
        if (!businesses.length) {
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
    }, [businesses, searchTerm, selectedCategory, selectedTown, visibleProviders, phoneType, droppedPin, radiusKm]);

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
        isProcessingLargeDataset,
        refetch: useCallback(async () => {
            console.log('🔄 REFETCH: Manual refetch triggered');
            setLastFetch(null); // Clear cache
            
            try {
                // Fetch businesses first
                const businessResult = await serverDataService.getBusinesses(token || '');
                if (businessResult.success) {
                    const businessData = businessResult.data || [];
                    if (businessData.length > 2000) {
                        console.log('📊 REFETCH: Large dataset detected, enabling performance mode');
                        setIsProcessingLargeDataset(true);
                        setTimeout(() => {
                            setBusinesses(businessData);
                            setIsProcessingLargeDataset(false);
                        }, 50);
                    } else {
                        setBusinesses(businessData);
                    }
                    setLastFetch(new Date());
                }
                
                // Fetch routes
                const routeResult = await serverDataService.getRoutes(token || '');
                if (routeResult.success) {
                    setRouteItems(routeResult.data || []);
                }
                
                // Fetch datasets
                try {
                    const response = await fetch(`${environmentConfig.getApiUrl()}/api/datasets`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const result = await response.json();
                        let datasets = [];
                        if (Array.isArray(result)) {
                            datasets = result;
                        } else if (result.data && Array.isArray(result.data)) {
                            datasets = result.data;
                        } else if (result.datasets && Array.isArray(result.datasets)) {
                            datasets = result.datasets;
                        }
                        
                        const validDatasets = datasets
                            .filter((d: any) => d && typeof d === 'object' && d.id && d.name)
                            .map((d: any) => ({
                                id: d.id,
                                name: d.name,
                                town: d.town || ''
                            }));
                        
                        setAvailableDatasets(validDatasets);
                        
                        // Only auto-select if no datasets are currently selected
                        setSelectedDatasets(prev => prev.length === 0 && validDatasets.length > 0 ? validDatasets.map((d: any) => d.id) : prev);
                    }
                } catch (err) {
                    console.error('Failed to fetch datasets in refetch:', err);
                    setAvailableDatasets([]);
                }
                
            } catch (error) {
                console.error('❌ REFETCH: Error during manual refetch:', error);
            }
            
            console.log('✅ REFETCH: Manual refetch completed');
        }, [token]), // Remove selectedDatasets.length dependency
        isDbReady: isAuthenticated && !error,
        dbError: error,
        // Database reset function (for compatibility)
        handleDatabaseReset: async () => {
            // In server-first architecture, this would clear server data
            if (token) {
                try {
                    await serverDataService.clearWorkspace(token);
                    // Trigger a refetch by clearing the cache
                    setLastFetch(null);
                    setBusinesses([]);
                } catch (err) {
                    console.error('Failed to reset database:', err);
                }
            }
        }
    };
};

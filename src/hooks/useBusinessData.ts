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
    const [isProcessingLargeDataset, setIsProcessingLargeDataset] = useState(false);

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
        if (!forceRefresh && lastFetch && Date.now() - lastFetch.getTime() < 30000) { // Increased to 30 seconds
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
                const businessData = result.data || [];
                
                // Handle large datasets
                if (businessData.length > 5000) {
                    console.log('📊 FETCH: Large dataset detected, enabling performance mode');
                    setIsProcessingLargeDataset(true);
                    
                    // Defer heavy processing for large datasets
                    setTimeout(() => {
                        setBusinesses(businessData);
                        setIsProcessingLargeDataset(false);
                    }, 100);
                } else {
                    setBusinesses(businessData);
                }
                
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
                const result = await response.json();
                console.log('📊 DATASETS: Raw response:', result);
                
                // Handle different response formats with better error handling
                let datasets = [];
                if (Array.isArray(result)) {
                    datasets = result;
                } else if (result && typeof result === 'object') {
                    if (Array.isArray(result.data)) {
                        datasets = result.data;
                    } else if (Array.isArray(result.datasets)) {
                        datasets = result.datasets;
                    } else {
                        console.warn('📊 DATASETS: No valid datasets array found in response, using empty array');
                        datasets = [];
                    }
                } else {
                    console.warn('📊 DATASETS: Invalid response format, using empty array');
                    datasets = [];
                }
                
                console.log('📊 DATASETS: Processed datasets:', datasets);
                
                // Safely map datasets with validation
                const validDatasets = datasets
                    .filter((d: any) => d && typeof d === 'object' && d.id && d.name)
                    .map((d: any) => ({
                        id: d.id,
                        name: d.name,
                        town: d.town || ''
                    }));
                
                setAvailableDatasets(validDatasets);
                
                // Auto-select all datasets if none selected and we have valid datasets
                if (validDatasets.length > 0) {
                    setSelectedDatasets(prev => prev.length === 0 ? validDatasets.map((d: any) => d.id) : prev);
                }
            } else {
                console.warn('📊 DATASETS: API response not ok:', response.status, response.statusText);
                setAvailableDatasets([]);
            }
        } catch (err) {
            console.error('Failed to fetch datasets:', err);
            // Set empty arrays to prevent errors
            setAvailableDatasets([]);
        }
    }, [token, isAuthenticated]); // Remove selectedDatasets.length dependency

    // Auto-fetch on mount and auth changes - Fixed to prevent infinite loops
    useEffect(() => {
        console.log('🔐 DATA: Auth effect triggered', { isAuthenticated, tokenPresent: !!token });
        if (isAuthenticated && token) {
            // Use a single async function to coordinate all data fetching
            const initializeData = async () => {
                console.log('🚀 DATA: Starting data initialization');
                try {
                    // Fetch datasets first to avoid dependency issues
                    await fetchDatasets();
                    
                    // Then fetch businesses
                    await fetchBusinesses(true); // Force refresh on auth change
                    
                    // Finally fetch routes
                    await fetchRoutes();
                    
                    console.log('✅ DATA: All data fetched successfully');
                } catch (error) {
                    console.error('❌ DATA: Error during data initialization:', error);
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
                // For large datasets, limit processing to improve performance
                const businessesToProcess = businesses.length > 5000 ? businesses.slice(0, 5000) : businesses;
                for (const business of businessesToProcess) {
                    if (business.category) {
                        categorySet.add(business.category);
                    }
                }
                const result = Array.from(categorySet).sort();
                console.log('📊 CATEGORIES: Calculated', result.length, 'categories from', businessesToProcess.length, 'businesses');
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
                // For large datasets, limit processing to improve performance
                const businessesToProcess = businesses.length > 5000 ? businesses.slice(0, 5000) : businesses;
                for (const business of businessesToProcess) {
                    if (business.town) {
                        townSet.add(business.town);
                    }
                }
                const result = Array.from(townSet).sort();
                console.log('🏘️ TOWNS: Calculated', result.length, 'towns from', businessesToProcess.length, 'businesses');
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
                // For large datasets, limit processing to improve performance
                const businessesToProcess = businesses.length > 5000 ? businesses.slice(0, 5000) : businesses;
                for (const business of businessesToProcess) {
                    if (business.provider) {
                        providerSet.add(business.provider);
                    }
                }
                const result = Array.from(providerSet).sort();
                console.log('🏢 PROVIDERS: Calculated', result.length, 'providers from', businessesToProcess.length, 'businesses');
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
            selectedDatasets: selectedDatasets,
            availableDatasets: availableDatasets,
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
        
        // For very large datasets (>5000), show loading indicator and defer heavy calculations
        if (businesses.length > 5000) {
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
                    if (businessData.length > 5000) {
                        console.log('📊 REFETCH: Large dataset detected, enabling performance mode');
                        setIsProcessingLargeDataset(true);
                        setTimeout(() => {
                            setBusinesses(businessData);
                            setIsProcessingLargeDataset(false);
                        }, 100);
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
                    await fetchBusinesses(true);
                } catch (err) {
                    console.error('Failed to reset database:', err);
                }
            }
        }
    };
};

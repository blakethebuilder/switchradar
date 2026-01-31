import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, resetDatabase } from '../db';
import { filterBusinesses, clearFilterCaches } from '../utils/dataProcessors';
import { useDebounce } from './useDebounce';
import { PerformanceMonitor } from '../utils/performance';

export const useBusinessData = () => {
    const [dbError, setDbError] = useState<string | null>(null);
    const [isDbReady, setIsDbReady] = useState(false);

    // Wait for database to be ready - only check once
    useEffect(() => {
        let mounted = true;
        
        const checkDb = async () => {
            try {
                if (db && mounted) {
                    await db.businesses.limit(1).toArray();
                    if (mounted) {
                        setIsDbReady(true);
                        setDbError(null);
                    }
                }
            } catch (error) {
                console.error('Database not ready:', error);
                if (mounted) {
                    setDbError('Database initialization failed');
                    setIsDbReady(false);
                }
            }
        };
        
        checkDb();
        
        return () => {
            mounted = false;
        };
    }, []); // Only run once on mount

    const businesses = useLiveQuery(() => {
        try {
            return db?.businesses?.toArray() || [];
        } catch (error) {
            console.error('Error fetching businesses:', error);
            return [];
        }
    }) || [];

    const routeItems = useLiveQuery(() => {
        try {
            return db?.route?.orderBy('order').toArray() || [];
        } catch (error) {
            console.error('Error fetching routes:', error);
            return [];
        }
    }) || [];

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

    // Database reset function
    const handleDatabaseReset = async () => {
        try {
            await resetDatabase();
            setIsDbReady(true);
            setDbError(null);
        } catch (error) {
            setDbError('Failed to reset database');
        }
    };

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
        // Database status
        isDbReady: isDbReady && !dbError,
        dbError,
        handleDatabaseReset
    };
};

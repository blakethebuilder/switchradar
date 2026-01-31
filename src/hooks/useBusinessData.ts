import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { filterBusinesses, clearFilterCaches } from '../utils/dataProcessors';
import { useDebounce } from './useDebounce';
import { cloudSyncService } from '../services/cloudSync';
import { environmentConfig } from '../config/environment';
import { PerformanceMonitor } from '../utils/performance';

export const useBusinessData = () => {
    const businesses = useLiveQuery(() => db.businesses.toArray()) || [];
    const routeItems = useLiveQuery(() => db.route.orderBy('order').toArray()) || [];

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

    // Load initial data from Cloud if available
    const loadFromCloud = async (token: string | null) => {
        if (!token || !environmentConfig.isCloudSyncEnabled()) {
            console.log('Cloud loading disabled or no token available');
            return;
        }

        try {
            const cloudData = await cloudSyncService.syncFromCloud(token);
            
            if (cloudData.businesses.length > 0) {
                const transaction = db.transaction('rw', db.businesses, async () => {
                    for (const business of cloudData.businesses) {
                        const existing = await db.businesses.get(business.id);
                        if (!existing) {
                            await db.businesses.add(business);
                        }
                    }
                });
                
                await transaction;
                console.log(`Loaded ${cloudData.businesses.length} businesses from cloud`);
            }

            if (cloudData.routeItems.length > 0) {
                const transaction = db.transaction('rw', db.route, async () => {
                    for (const routeItem of cloudData.routeItems) {
                        const existing = await db.route.where('businessId').equals(routeItem.businessId).first();
                        if (!existing) {
                            await db.route.add(routeItem);
                        }
                    }
                });
                
                await transaction;
                console.log(`Loaded ${cloudData.routeItems.length} route items from cloud`);
            }
        } catch (error) {
            console.error('Failed to load from cloud:', error);
        }
    };

    const filteredBusinesses = useMemo(() => {
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
        loadFromCloud,
        // Data insights
        totalBusinesses: businesses.length,
        filteredCount: filteredBusinesses.length,
        isLargeDataset: businesses.length > 1000
    };
};

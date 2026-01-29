import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { filterBusinesses } from '../utils/dataProcessors';
import { useDebounce } from './useDebounce';
import { cloudSyncService } from '../services/cloudSync';
import { environmentConfig } from '../config/environment';

export const useBusinessData = () => {
    const businesses = useLiveQuery(() => db.businesses.toArray()) || [];
    const routeItems = useLiveQuery(() => db.route.orderBy('order').toArray()) || [];

    const [searchInput, setSearchInput] = useState('');
    const searchTerm = useDebounce(searchInput, 300); // Debounced value for filtering

    const [selectedCategory, setSelectedCategory] = useState('');
    const [visibleProviders, setVisibleProviders] = useState<string[]>([]);
    const [phoneType, setPhoneType] = useState<'all' | 'landline' | 'mobile'>('all');
    
    // Dropped Pin State for Filtering
    const [droppedPin, setDroppedPin] = useState<{ lat: number, lng: number } | null>(null);
    const [radiusKm, setRadiusKm] = useState<number>(0.5); // Default radius of 0.5km

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
        if (availableProviders.length > 0 && visibleProviders.length === 0) {
            setVisibleProviders(availableProviders);
        }
    }, [availableProviders, visibleProviders.length]);

    // Load initial data from Cloud if available
    const loadFromCloud = async (token: string | null) => {
        if (!token || !environmentConfig.isCloudSyncEnabled()) {
            console.log('Cloud loading disabled or no token available');
            return;
        }

        try {
            const cloudData = await cloudSyncService.syncFromCloud(token);
            
            if (cloudData.businesses.length > 0) {
                // Merge cloud businesses with local data (local takes priority)
                const transaction = db.transaction('rw', db.businesses, async () => {
                    for (const business of cloudData.businesses) {
                        // Only add if not already exists locally
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
                // Merge cloud route items with local data
                const transaction = db.transaction('rw', db.route, async () => {
                    for (const routeItem of cloudData.routeItems) {
                        // Only add if not already exists locally
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
            // Gracefully continue with local data only
        }
    };

    const filteredBusinesses = useMemo(() => {
        return filterBusinesses(businesses, {
            searchTerm, // <-- Use debounced term for filtering
            selectedCategory,
            visibleProviders,
            phoneType,
            droppedPin: droppedPin ?? undefined,
            radiusKm
        });
    }, [businesses, searchTerm, selectedCategory, visibleProviders, phoneType, droppedPin, radiusKm]);

    return {
        businesses,
        routeItems,
        filteredBusinesses,
        categories,
        availableProviders,
        // Expose original input value and setter for UI interaction
        searchTerm: searchInput, 
        setSearchTerm: setSearchInput,
        selectedCategory,
        setSelectedCategory,
        visibleProviders,
        setVisibleProviders,
        phoneType,
        setPhoneType,
        droppedPin,
        setDroppedPin,
        radiusKm,
        setRadiusKm,
        loadFromCloud
    };
};

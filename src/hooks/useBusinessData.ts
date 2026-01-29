import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { filterBusinesses } from '../utils/dataProcessors';
import { useDebounce } from './useDebounce';

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

    // Load initial data from Cloud if available (Disabled)
    const loadFromCloud = async (token: string | null) => {
        // Cloud loading disabled to prevent 404s
        return;
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

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { filterBusinesses } from '../utils/dataProcessors';

export const useBusinessData = () => {
    const businesses = useLiveQuery(() => db.businesses.toArray()) || [];
    const routeItems = useLiveQuery(() => db.route.orderBy('order').toArray()) || [];

    const [searchTerm, setSearchTerm] = useState('');
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

    // Load initial data from Cloud if available
    const loadFromCloud = async (token: string | null) => {
        if (!token) return;
        try {
            const API_URL = import.meta.env.VITE_API_URL || '';

            const businessesRes = await fetch(`${API_URL}/api/businesses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (businessesRes.ok) {
                const cloudBusinesses = await businessesRes.json();
                if (cloudBusinesses.length > 0) {
                    await db.businesses.clear();
                    await db.businesses.bulkAdd(cloudBusinesses);
                }
            }

            const routeRes = await fetch(`${API_URL}/api/route`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (routeRes.ok) {
                const cloudRoutes = await routeRes.json();
                if (cloudRoutes.length > 0) {
                    await db.route.clear();
                    await db.route.bulkAdd(cloudRoutes);
                }
            }
        } catch (error) {
            console.error('Failed to load data from cloud:', error);
        }
    };

    const filteredBusinesses = useMemo(() => {
        return filterBusinesses(businesses, {
            searchTerm,
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
        searchTerm,
        setSearchTerm,
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

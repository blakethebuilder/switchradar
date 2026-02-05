import { useState, useCallback } from 'react';
import type { Business, ViewMode } from '../types';

export interface AppState {
  viewMode: ViewMode;
  isFiltersVisible: boolean;
  selectedBusiness: Business | null;
  selectedBusinessIds: string[];
  mapTarget: { center: [number, number], zoom: number } | null;
}

export const useAppState = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [mapTarget, setMapTarget] = useState<{ center: [number, number], zoom: number } | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedBusinessIds([]);
  }, []);

  const selectBusiness = useCallback((business: Business) => {
    setSelectedBusiness(business);
  }, []);

  const clearSelectedBusiness = useCallback(() => {
    setSelectedBusiness(null);
  }, []);

  const setMapTargetFromBusiness = useCallback((business: Business, zoom?: number) => {
    if (business.coordinates && typeof business.coordinates.lat === 'number' && typeof business.coordinates.lng === 'number') {
      setMapTarget({ center: [business.coordinates.lat, business.coordinates.lng], zoom: zoom || 15 });
    }
  }, []);

  const selectBusinessAndShowOnMap = useCallback((business: Business, preserveView = false) => {
    setSelectedBusiness(business);
    setViewMode('map');
    
    // Only change map target if not preserving current view
    if (!preserveView) {
      setMapTargetFromBusiness(business);
    }
  }, [setMapTargetFromBusiness]);

  // Handler for table business selection - only shows client details, doesn't change view
  const selectBusinessForDetails = useCallback((business: Business) => {
    console.log('🎯 SELECT BUSINESS: selectBusinessForDetails called', {
      businessId: business.id,
      businessName: business.name,
      businessTown: business.town,
      businessProvider: business.provider,
      timestamp: new Date().toISOString()
    });
    
    setSelectedBusiness(business);
    // Don't change view mode or map target - just show the client details modal
  }, []);

  // Handler for map business selection - preserves current zoom and only centers on business
  const selectBusinessOnMap = useCallback((business: Business, currentZoom?: number) => {
    console.log('🗺️ SELECT BUSINESS: selectBusinessOnMap called', {
      businessId: business.id,
      businessName: business.name,
      currentZoom,
      timestamp: new Date().toISOString()
    });
    
    setSelectedBusiness(business);
    
    // Center on business but preserve current zoom level
    if (business.coordinates && typeof business.coordinates.lat === 'number' && typeof business.coordinates.lng === 'number') {
      setMapTarget({ 
        center: [business.coordinates.lat, business.coordinates.lng], 
        zoom: currentZoom || 15 // Use current zoom if provided, otherwise default to 15
      });
    }
  }, []);

  return {
    // State
    viewMode,
    isFiltersVisible,
    selectedBusiness,
    selectedBusinessIds,
    mapTarget,
    
    // Actions
    setViewMode,
    setIsFiltersVisible,
    setSelectedBusiness: selectBusiness,
    setSelectedBusinessIds,
    setMapTarget,
    clearSelection,
    clearSelectedBusiness,
    setMapTargetFromBusiness,
    selectBusinessAndShowOnMap,
    selectBusinessForDetails,
    selectBusinessOnMap,
  };
};
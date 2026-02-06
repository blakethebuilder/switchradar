import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import type { Business } from '../types';
import { MapController } from './MapController';
import { MapMarkers } from './MapMarkers';
import { MapControls } from './MapControls';
import { DroppedPinIcon, UserLocationIcon } from '../utils/mapIcons';
import { LoadingSpinner } from './LoadingStates';

// Fix for default markers
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface BusinessMapProps {
  businesses: Business[];
  targetLocation?: [number, number];
  zoom?: number;
  fullScreen?: boolean;
  onBusinessSelect?: (business: Business) => void;
  onMapBusinessSelect?: (business: Business, currentZoom?: number) => void; // New prop for map-specific selection
  selectedBusinessId?: string;
  selectedBusinessIds?: string[];
  droppedPin: { lat: number, lng: number } | null;
  setDroppedPin: (pin: { lat: number, lng: number } | null) => void;
  radiusKm: number;
}

export const BusinessMap: React.FC<BusinessMapProps> = ({
  businesses,
  targetLocation,
  zoom,
  fullScreen = false,
  onBusinessSelect,
  onMapBusinessSelect,
  selectedBusinessId,
  selectedBusinessIds = [],
  droppedPin,
  setDroppedPin,
  radiusKm
}) => {
  const [isDropMode, setIsDropMode] = useState(false);
  const [currentBusinessIndex, setCurrentBusinessIndex] = useState(0);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [currentZoom, setCurrentZoom] = useState(13); // Better default zoom level
  const [isMapLoading, setIsMapLoading] = useState(true);
  const previousBusinessCountRef = React.useRef<number>(0);
  const hasInitialFitRef = React.useRef<boolean>(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const watchIdRef = React.useRef<number | null>(null);

  // Memoize businesses to prevent unnecessary re-renders and limit for performance
  const memoizedBusinesses = React.useMemo(() => {
    const validBusinesses = (businesses || []).filter(business =>
      business?.id &&
      business.coordinates &&
      typeof business.coordinates.lat === 'number' &&
      typeof business.coordinates.lng === 'number' &&
      !isNaN(business.coordinates.lat) &&
      !isNaN(business.coordinates.lng) &&
      Math.abs(business.coordinates.lat) > 0.001 &&
      Math.abs(business.coordinates.lng) > 0.001
    );

    // CRITICAL: Limit businesses for map performance
    const MAX_MAP_BUSINESSES = 5000;
    if (validBusinesses.length > MAX_MAP_BUSINESSES) {
      console.log(`🗺️ MAP: Limiting businesses from ${validBusinesses.length} to ${MAX_MAP_BUSINESSES} for performance`);

      // Always include selected business
      let result = [];
      if (selectedBusinessId) {
        const selected = validBusinesses.find(b => b.id === selectedBusinessId);
        if (selected) result.push(selected);
      }

      // Sample the rest
      const remaining = validBusinesses.filter(b => b.id !== selectedBusinessId);
      const step = Math.ceil(remaining.length / (MAX_MAP_BUSINESSES - result.length));
      const sampled = remaining.filter((_, index) => index % step === 0);

      return [...result, ...sampled].slice(0, MAX_MAP_BUSINESSES);
    }

    return validBusinesses;
  }, [businesses, selectedBusinessId]);

  // Only log when businesses count actually changes
  React.useEffect(() => {
    console.log('🗺️ MAP: BusinessMap businesses updated', {
      businessesCount: memoizedBusinesses.length,
      fullScreen,
      selectedBusinessId,
      selectedBusinessIds: selectedBusinessIds.length
    });
  }, [memoizedBusinesses.length, fullScreen, selectedBusinessId, selectedBusinessIds.length]);

  // Handle map ready
  const handleMapReady = useCallback((map: L.Map) => {
    console.log('🗺️ MAP: Map ready');
    setMapInstance(map);
    setCurrentZoom(map.getZoom());
    setIsMapLoading(false);
  }, []);

  // Map control handlers
  const handleZoomIn = useCallback(() => {
    mapInstance?.zoomIn();
  }, [mapInstance]);

  const handleZoomOut = useCallback(() => {
    mapInstance?.zoomOut();
  }, [mapInstance]);

  const handleFitBounds = useCallback(() => {
    if (businesses.length > 0 && mapInstance) {
      try {
        const validBusinesses = businesses.filter(b =>
          b.coordinates &&
          typeof b.coordinates.lat === 'number' &&
          typeof b.coordinates.lng === 'number' &&
          !isNaN(b.coordinates.lat) &&
          !isNaN(b.coordinates.lng) &&
          b.coordinates.lat >= -90 && b.coordinates.lat <= 90 &&
          b.coordinates.lng >= -180 && b.coordinates.lng <= 180 &&
          // Exclude suspicious coordinates like 0,0
          !(Math.abs(b.coordinates.lat) < 0.001 && Math.abs(b.coordinates.lng) < 0.001) &&
          !(b.coordinates.lat === 0 && b.coordinates.lng === 0)
        );

        console.log('🗺️ FIT BOUNDS: Valid businesses:', validBusinesses.length, 'out of', businesses.length);

        if (validBusinesses.length === 0) {
          console.warn('🗺️ FIT BOUNDS: No valid businesses with coordinates');
          return;
        }

        if (validBusinesses.length === 1) {
          // Single business - center on it with reasonable zoom
          const business = validBusinesses[0];
          mapInstance.setView([business.coordinates.lat, business.coordinates.lng], 14, {
            animate: true,
            duration: 1
          });
        } else {
          // Multiple businesses - fit bounds with padding
          const coordinates: [number, number][] = validBusinesses.map(b => [b.coordinates.lat, b.coordinates.lng]);
          const bounds = L.latLngBounds(coordinates);

          // Calculate appropriate padding based on screen size
          const isMobile = window.innerWidth < 768;
          const padding: [number, number] = isMobile ? [30, 30] : [50, 50];

          mapInstance.fitBounds(bounds, {
            padding: padding,
            maxZoom: 15, // Max zoom 15 for fit bounds to ensure businesses scatter
            animate: true,
            duration: 1.2
          });
        }

        console.log('✅ FIT BOUNDS: Successfully fitted bounds');
      } catch (error) {
        console.error('❌ FIT BOUNDS: Error fitting bounds:', error);
      }
    } else {
      console.warn('🗺️ FIT BOUNDS: No businesses or map instance available');
    }
  }, [businesses, mapInstance]);

  // Auto-fit bounds when businesses change (but not when just selection changes)
  useEffect(() => {
    const currentBusinessCount = businesses.length;
    const previousBusinessCount = previousBusinessCountRef.current;

    // Only fit bounds if:
    // 1. This is the initial load (no previous fit)
    // 2. The business count has significantly changed (not just +1/-1 from selection)
    // 3. We don't have a target location (user isn't navigating to specific business)
    const shouldFitBounds = (
      (!hasInitialFitRef.current && currentBusinessCount > 0) || // Initial load
      (Math.abs(currentBusinessCount - previousBusinessCount) > 1) // Significant change
    ) && !targetLocation; // Not navigating to specific location

    if (shouldFitBounds && mapInstance) {
      console.log('🗺️ AUTO-FIT: Fitting bounds', {
        currentCount: currentBusinessCount,
        previousCount: previousBusinessCount,
        isInitial: !hasInitialFitRef.current,
        hasTarget: !!targetLocation
      });

      // Small delay to ensure markers are rendered
      const timer = setTimeout(() => {
        handleFitBounds();
        hasInitialFitRef.current = true;
      }, 500);

      // Update the ref
      previousBusinessCountRef.current = currentBusinessCount;

      return () => clearTimeout(timer);
    } else {
      // Just update the ref without fitting bounds
      previousBusinessCountRef.current = currentBusinessCount;
    }
  }, [businesses.length, mapInstance, handleFitBounds, targetLocation]);

  const handleToggleDropMode = useCallback(() => {
    if (isDropMode) {
      setIsDropMode(false);
    } else {
      setIsDropMode(true);
      setDroppedPin(null);
      mapInstance?.getContainer().focus();
    }
  }, [isDropMode, setDroppedPin, mapInstance]);

  const handleClearPin = useCallback(() => {
    setDroppedPin(null);
  }, [setDroppedPin]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);

    // One-time high accuracy position fetch to center the map immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('📍 GEOLOCATION: User located', { latitude, longitude, accuracy });

        setUserLocation([latitude, longitude]);
        setLocationAccuracy(accuracy);

        if (mapInstance) {
          mapInstance.setView([latitude, longitude], 15, {
            animate: true,
            duration: 1
          });
        }
        setIsLocating(false);
      },
      (error) => {
        console.error('❌ GEOLOCATION: Error', error);
        setIsLocating(false);
        alert(`Could not determine your location: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Start watching position for real-time updates if not already watching
    if (watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setUserLocation([latitude, longitude]);
          setLocationAccuracy(accuracy);
        },
        (error) => console.warn('📍 GEOLOCATION: Watch error', error),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
      );
    }
  }, [mapInstance]);

  // Clean up geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Navigation handlers
  const navigateToNextBusiness = useCallback(() => {
    if (businesses.length === 0) return;
    const nextIndex = (currentBusinessIndex + 1) % businesses.length;
    setCurrentBusinessIndex(nextIndex);
    onBusinessSelect?.(businesses[nextIndex]);
  }, [businesses, currentBusinessIndex, onBusinessSelect]);

  const navigateToPrevBusiness = useCallback(() => {
    if (businesses.length === 0) return;
    const prevIndex = currentBusinessIndex === 0 ? businesses.length - 1 : currentBusinessIndex - 1;
    setCurrentBusinessIndex(prevIndex);
    onBusinessSelect?.(businesses[prevIndex]);
  }, [businesses, currentBusinessIndex, onBusinessSelect]);

  // Update current business index when selectedBusinessId changes
  useEffect(() => {
    if (selectedBusinessId && businesses.length > 0) {
      const index = businesses.findIndex(b => b.id === selectedBusinessId);
      if (index !== -1) {
        setCurrentBusinessIndex(index);
      }
    }
  }, [selectedBusinessId, businesses]);

  // Handle map invalidation when fullScreen changes
  useEffect(() => {
    if (mapInstance && fullScreen) {
      setTimeout(() => {
        try {
          mapInstance.invalidateSize();
        } catch (error) {
          console.error('Error invalidating map size:', error);
        }
      }, 100);
    }
  }, [mapInstance, fullScreen]);

  // South Africa Bounds
  const SA_BOUNDS: L.LatLngBoundsExpression = [
    [-35.5, 15.0], // Southwest (Cape Point/Alexander Bay area)
    [-21.5, 34.0]  // Northeast (Musina/Kosi Bay area)
  ];

  return (
    <div className={`relative group transition-all duration-700 ${fullScreen
      ? 'h-full w-full bg-slate-100'
      : 'rounded-[2.5rem] border-[12px] border-white bg-white shadow-2xl shadow-indigo-100 overflow-hidden min-h-[600px] h-[700px]'
      }`}>

      {/* Loading overlay */}
      {isMapLoading && (
        <div className="absolute inset-0 z-[3000] bg-slate-100 flex items-center justify-center">
          <LoadingSpinner size="lg" message="Loading map..." />
        </div>
      )}

      {/* Drop mode instruction */}
      {isDropMode && (
        <div className="absolute top-0 left-0 right-0 z-[999] p-4 flex items-start justify-center pointer-events-none">
          <p className="w-full max-w-sm px-4 py-2 bg-white rounded-xl text-center text-sm font-bold text-slate-900 shadow-2xl border border-slate-100 animate-in fade-in duration-300 pointer-events-auto">
            Click on the map to place the filter pin.
          </p>
        </div>
      )}

      <MapContainer
        center={[-29.0, 24.0]} // Geometric center of South Africa
        zoom={6} // Zoom level to see the whole country
        style={{ height: '100%', width: '100%', borderRadius: fullScreen ? '0' : '1.5rem' }}
        zoomControl={false}
        preferCanvas={true}
        worldCopyJump={false} // Disable wrapping for restricted bounds
        minZoom={5}
        maxZoom={18}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={100}
        dragging={!isDropMode}
        touchZoom={!isDropMode}
        doubleClickZoom={!isDropMode}
        scrollWheelZoom={!isDropMode}
        boxZoom={!isDropMode}
        keyboard={!isDropMode}
        maxBounds={SA_BOUNDS} // Restrict view to SA
        maxBoundsViscosity={1.0} // Hard stop at bounds
      >
        <MapController
          targetLocation={targetLocation}
          zoom={zoom}
          businesses={businesses}
          isDropMode={isDropMode}
          setIsDropMode={setIsDropMode}
          setDroppedPin={setDroppedPin}
          onMapReady={handleMapReady}
          currentZoom={currentZoom}
          setCurrentZoom={setCurrentZoom}
          radiusKm={radiusKm}
        />

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={18}
          tileSize={256}
          zoomOffset={0}
          keepBuffer={2}
          detectRetina={true}
          crossOrigin={true}
        />

        {/* Dropped pin and radius circle */}
        {droppedPin && (
          <>
            <Marker
              position={[droppedPin.lat, droppedPin.lng]}
              icon={DroppedPinIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  setDroppedPin({ lat, lng });
                },
              }}
            />
            <Circle
              center={[droppedPin.lat, droppedPin.lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                fillColor: '#ef4444',
                fillOpacity: 0.1,
                color: '#ef4444',
                weight: 2,
                opacity: 0.5
              }}
            />
          </>
        )}

        {/* User location marker */}
        {userLocation && (
          <>
            <Marker
              position={userLocation}
              icon={UserLocationIcon}
              zIndexOffset={1000}
            />
            {locationAccuracy && locationAccuracy > 20 && (
              <Circle
                center={userLocation}
                radius={locationAccuracy}
                pathOptions={{
                  fillColor: '#4f46e5',
                  fillOpacity: 0.1,
                  color: '#4f46e5',
                  weight: 1,
                  opacity: 0.3,
                  dashArray: '5, 5'
                }}
              />
            )}
          </>
        )}

        {/* Business markers */}
        <MapMarkers
          key="business-markers"
          businesses={memoizedBusinesses}
          selectedBusinessId={selectedBusinessId}
          onBusinessSelect={onMapBusinessSelect ?
            (business) => {
              // Get actual current zoom from map instance if available, otherwise use state
              const actualZoom = mapInstance ? mapInstance.getZoom() : currentZoom;
              console.log('🗺️ BUSINESS SELECT: Using zoom', actualZoom, 'from', mapInstance ? 'map instance' : 'state');
              onMapBusinessSelect(business, actualZoom);
            } :
            onBusinessSelect
          }
        />
      </MapContainer>

      {/* Map controls */}
      <MapControls
        businesses={businesses}
        currentZoom={currentZoom}
        droppedPin={droppedPin}
        isDropMode={isDropMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitBounds={handleFitBounds}
        onToggleDropMode={handleToggleDropMode}
        onClearPin={handleClearPin}
        onLocateMe={handleLocateMe}
        isLocating={isLocating}
      />

      {/* Navigation controls */}
      {businesses.length > 1 && selectedBusinessId && (
        <div className="absolute bottom-6 right-6 z-[1000] flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-white/40 shadow-xl animate-in slide-in-from-right-4 duration-300">
          <button
            onClick={navigateToPrevBusiness}
            className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
            title="Previous business"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center px-2">
            <span className="text-xs font-bold text-slate-900">
              {currentBusinessIndex + 1} of {businesses.length}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Navigate
            </span>
          </div>

          <button
            onClick={navigateToNextBusiness}
            className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
            title="Next business"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
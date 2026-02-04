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
import { DroppedPinIcon } from '../utils/mapIcons';

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
  selectedBusinessId,
  selectedBusinessIds = [],
  droppedPin,
  setDroppedPin,
  radiusKm
}) => {
  const [isDropMode, setIsDropMode] = useState(false);
  const [currentBusinessIndex, setCurrentBusinessIndex] = useState(0);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [currentZoom, setCurrentZoom] = useState(6);
  const [isMapLoading, setIsMapLoading] = useState(true);

  console.log('🗺️ MAP: BusinessMap render', {
    businessesCount: businesses?.length || 0,
    fullScreen,
    selectedBusinessId,
    selectedBusinessIds: selectedBusinessIds.length
  });

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
          b.coordinates.lng >= -180 && b.coordinates.lng <= 180
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
            maxZoom: 15, // Increased max zoom for better visibility
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

  // Auto-fit bounds when businesses change
  useEffect(() => {
    if (businesses.length > 0 && mapInstance) {
      // Small delay to ensure markers are rendered
      const timer = setTimeout(() => {
        handleFitBounds();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [businesses.length, mapInstance, handleFitBounds]);

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

  return (
    <div className={`relative group transition-all duration-700 ${fullScreen
      ? 'h-full w-full bg-slate-100'
      : 'rounded-[2.5rem] border-[12px] border-white bg-white shadow-2xl shadow-indigo-100 overflow-hidden min-h-[600px] h-[700px]'
      }`}>
      
      {/* Loading overlay */}
      {isMapLoading && (
        <div className="absolute inset-0 z-[3000] bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Loading map...</p>
          </div>
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
        center={[-26.2041, 28.0473]} // Johannesburg center - better for SA data
        zoom={7} // Slightly more zoomed in
        style={{ height: '100%', width: '100%', borderRadius: fullScreen ? '0' : '1.5rem' }}
        zoomControl={false}
        preferCanvas={true}
        worldCopyJump={true}
        minZoom={5}
        maxZoom={18}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={window.innerWidth < 768 ? 80 : 120}
        dragging={!isDropMode}
        touchZoom={!isDropMode}
        doubleClickZoom={!isDropMode}
        scrollWheelZoom={!isDropMode}
        boxZoom={!isDropMode}
        keyboard={!isDropMode}
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

        {/* Business markers */}
        <MapMarkers
          key={`markers-${businesses.length}-${businesses.map(b => b.id).slice(0, 3).join('-')}`}
          businesses={businesses}
          selectedBusinessId={selectedBusinessId}
          selectedBusinessIds={selectedBusinessIds}
          onBusinessSelect={onBusinessSelect}
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
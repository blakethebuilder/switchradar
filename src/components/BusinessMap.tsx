import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Plus, Minus, Target, MapPin, X, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Business } from '../types';
import { getProviderColor } from '../utils/providerColors';
import { PerformanceMonitor, throttle } from '../utils/performance';

// Helper component to handle center/zoom and fit bounds
function MapController({ 
  targetLocation, 
  zoom, 
  businesses, 
  isDropMode, 
  setIsDropMode, 
  setDroppedPin, 
  droppedPin,
  onMultiSelect,
  onMapReady,
  currentZoom,
  setCurrentZoom,
  // @ts-ignore - selectedBusinessIds is used in memoizedMarkers
  selectedBusinessIds = []
}: { 
  targetLocation?: [number, number], 
  zoom?: number, 
  businesses: Business[],
  isDropMode: boolean,
  setIsDropMode: Dispatch<SetStateAction<boolean>>,
  setDroppedPin: (pin: { lat: number, lng: number } | null) => void,
  droppedPin: { lat: number, lng: number } | null,
  onMultiSelect?: (businesses: Business[]) => void,
  onMapReady?: (map: L.Map) => void,
  currentZoom: number,
  setCurrentZoom: Dispatch<SetStateAction<number>>,
  selectedBusinessIds?: string[]
}) {
  const map = useMap();
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [dragEnd, setDragEnd] = useState<{x: number, y: number} | null>(null);
  const [selectionBox, setSelectionBox] = useState<HTMLDivElement | null>(null);

  // Notify parent component when map is ready
  useEffect(() => {
    if (map && onMapReady) {
      try {
        onMapReady(map);
        setCurrentZoom(map.getZoom());
        
        // Add zoom event listener for real-time updates
        map.on('zoomend', () => {
          setCurrentZoom(map.getZoom());
        });
      } catch (error) {
        console.error('Error in map ready callback:', error);
      }
    }
  }, [map, onMapReady, setCurrentZoom]);



  useEffect(() => {
    // Only set view if targetLocation is provided AND we're not in drop mode
    if (targetLocation && !isDropMode) {
      map.setView(targetLocation, zoom || map.getZoom(), { animate: true });
    }
  }, [targetLocation, zoom, map, isDropMode]);

  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (isDropMode) {
      setDroppedPin({ lat: e.latlng.lat, lng: e.latlng.lng });
      setIsDropMode(false);
    }
  }, [isDropMode, setDroppedPin, setIsDropMode]);

  // Drag selection handlers
  const handleMouseDown = useCallback((e: L.LeafletMouseEvent) => {
    if (e.originalEvent.shiftKey && !isDropMode) {
      setIsDragSelecting(true);
      const containerPoint = map.mouseEventToContainerPoint(e.originalEvent as MouseEvent);
      setDragStart({ x: containerPoint.x, y: containerPoint.y });
      setDragEnd({ x: containerPoint.x, y: containerPoint.y });
      
      // Create selection box
      const box = document.createElement('div');
      box.style.position = 'absolute';
      box.style.border = '2px dashed #3b82f6';
      box.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      box.style.pointerEvents = 'none';
      box.style.zIndex = '1000';
      map.getContainer().appendChild(box);
      setSelectionBox(box);
      
      e.originalEvent.preventDefault();
    }
  }, [map, isDropMode]);

  const handleMouseMove = useCallback((e: L.LeafletMouseEvent) => {
    if (isDragSelecting && dragStart && selectionBox) {
      const containerPoint = map.mouseEventToContainerPoint(e.originalEvent as MouseEvent);
      setDragEnd({ x: containerPoint.x, y: containerPoint.y });
      
      // Update selection box
      const left = Math.min(dragStart.x, containerPoint.x);
      const top = Math.min(dragStart.y, containerPoint.y);
      const width = Math.abs(containerPoint.x - dragStart.x);
      const height = Math.abs(containerPoint.y - dragStart.y);
      
      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
    }
  }, [isDragSelecting, dragStart, selectionBox, map]);

  const handleMouseUp = useCallback((_e: L.LeafletMouseEvent) => {
    if (isDragSelecting && dragStart && dragEnd && onMultiSelect) {
      // Calculate bounds of selection
      const startLatLng = map.containerPointToLatLng([dragStart.x, dragStart.y]);
      const endLatLng = map.containerPointToLatLng([dragEnd.x, dragEnd.y]);
      
      const bounds = L.latLngBounds([
        [Math.min(startLatLng.lat, endLatLng.lat), Math.min(startLatLng.lng, endLatLng.lng)],
        [Math.max(startLatLng.lat, endLatLng.lat), Math.max(startLatLng.lng, endLatLng.lng)]
      ]);
      
      // Find businesses within selection
      const selectedBusinesses = businesses.filter(business => 
        bounds.contains([business.coordinates.lat, business.coordinates.lng])
      );
      
      onMultiSelect(selectedBusinesses);
      
      // Clean up
      if (selectionBox) {
        selectionBox.remove();
        setSelectionBox(null);
      }
      setIsDragSelecting(false);
      setDragStart(null);
      setDragEnd(null);
    }
  }, [isDragSelecting, dragStart, dragEnd, map, businesses, onMultiSelect, selectionBox]);

  useEffect(() => {
    if (isDropMode) {
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    } else {
      map.getContainer().style.cursor = '';
      map.off('click', handleMapClick);
    }
    
    // Add drag selection listeners
    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    
    return () => {
      map.off('click', handleMapClick);
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
    };
  }, [isDropMode, handleMapClick, handleMouseDown, handleMouseMove, handleMouseUp, map]);

  return (
    <>
      {/* Combined Map Info & Controls - Absolute Right Edge */}
      <div className="absolute top-4 right-0 z-[1000] flex flex-col gap-1 md:gap-2">
        {/* Map Info Panel - Compact Mobile */}
        <div className="bg-white/95 backdrop-blur-md rounded-l-xl shadow-xl border-l border-t border-b border-white/40 p-1.5 md:p-3 min-w-[100px] md:min-w-[160px]">
          <div className="flex items-center gap-1 mb-1 md:mb-2">
            <Info className="h-2.5 w-2.5 md:h-4 md:w-4 text-indigo-600" />
            <span className="text-[8px] md:text-xs font-bold text-slate-600 uppercase tracking-wider">Info</span>
          </div>
          <div className="space-y-0.5 md:space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[8px] md:text-xs text-slate-500">Count:</span>
              <span className="text-[9px] md:text-sm font-bold text-slate-900">{businesses.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[8px] md:text-xs text-slate-500">Zoom:</span>
              <span className="text-[9px] md:text-sm font-bold text-slate-900">{currentZoom.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[8px] md:text-xs text-slate-500">View:</span>
              <span className="text-[8px] md:text-xs font-bold text-indigo-600">
                {currentZoom >= 15 ? 'Scattered' : currentZoom >= 12 ? 'Spirals' : 'Clustered'}
              </span>
            </div>
            {droppedPin && (
              <div className="pt-1 md:pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1">
                  <div className="h-1 w-1 md:h-2 md:w-2 bg-rose-500 rounded-full"></div>
                  <span className="text-[8px] md:text-xs font-bold text-rose-600">Pin Active</span>
                </div>
                <button
                  onClick={() => setDroppedPin(null)}
                  className="mt-0.5 text-[8px] md:text-xs text-rose-600 hover:text-rose-700 font-medium"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modern Map Controls - Below Info, Right Aligned */}
        <div className="bg-white/95 backdrop-blur-md shadow-xl border-t border-b border-r border-white/40 overflow-hidden w-8 md:w-12 ml-auto flex flex-col">
          {/* Zoom Controls */}
          <div className="flex flex-col">
            <button
              onClick={() => map.zoomIn()}
              className="p-1 md:p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 border-b border-slate-100/50 flex items-center justify-center"
              title="Zoom In"
            >
              <Plus className="h-2.5 w-2.5 md:h-4 md:w-4" />
            </button>
            <button
              onClick={() => map.zoomOut()}
              className="p-1 md:p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 border-b border-slate-100/50 flex items-center justify-center"
              title="Zoom Out"
            >
              <Minus className="h-2.5 w-2.5 md:h-4 md:w-4" />
            </button>
          </div>
          
          {/* Action Controls */}
          <div className="flex flex-col">
            <button
              onClick={() => {
                if (businesses.length > 0 && map) {
                  try {
                    // Filter out businesses with invalid coordinates
                    const validBusinesses = businesses.filter(b => 
                      b.coordinates && 
                      typeof b.coordinates.lat === 'number' && 
                      typeof b.coordinates.lng === 'number' &&
                      !isNaN(b.coordinates.lat) && 
                      !isNaN(b.coordinates.lng) &&
                      b.coordinates.lat >= -90 && b.coordinates.lat <= 90 &&
                      b.coordinates.lng >= -180 && b.coordinates.lng <= 180
                    );
                    
                    if (validBusinesses.length > 0) {
                      const coordinates: [number, number][] = validBusinesses.map(b => [b.coordinates.lat, b.coordinates.lng]);
                      const bounds = L.latLngBounds(coordinates);
                      
                      map.fitBounds(bounds, { 
                        padding: [50, 50], 
                        maxZoom: 12,
                        animate: true,
                        duration: 1
                      });
                    }
                  } catch (error) {
                    console.error('Error fitting bounds:', error);
                  }
                }
              }}
              className="p-1 md:p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-200 border-b border-slate-100/50 flex items-center justify-center"
              title="Fit All Businesses"
            >
              <Target className="h-2.5 w-2.5 md:h-4 md:w-4" />
            </button>
            <button
              onClick={() => {
                if (isDropMode) {
                  setIsDropMode(false);
                } else {
                  setIsDropMode(true);
                  setDroppedPin(null);
                  map.getContainer().focus();
                }
              }}
              className={`p-1 md:p-2 transition-all duration-200 flex items-center justify-center ${
                isDropMode 
                  ? 'bg-rose-500 text-white hover:bg-rose-600' 
                  : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600'
              }`}
              title={isDropMode ? 'Cancel Drop Pin' : 'Drop Filter Pin (500m radius)'}
            >
              {isDropMode ? <X className="h-2.5 w-2.5 md:h-4 md:w-4" /> : <MapPin className="h-2.5 w-2.5 md:h-4 md:w-4" />}
            </button>
          </div>
        </div>
      </div>

      {isDropMode && (
        <div className="absolute top-0 left-0 right-0 z-[999] p-4 flex items-start justify-center pointer-events-none">
          <p className="w-full max-w-sm px-4 py-2 bg-white rounded-xl text-center text-sm font-bold text-slate-900 shadow-2xl border border-slate-100 animate-in fade-in duration-300 pointer-events-auto">
            Click on the map to place the filter pin.
          </p>
        </div>
      )}
    </>
  );
}

// Fix for default markers (unchanged)
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

// Custom icon for the dropped pin (unchanged)
const DroppedPinIcon = L.divIcon({
  className: 'dropped-pin-marker',
  html: `<div style="
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background-color: #ef4444; /* Red */
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  "><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface BusinessMapProps {
  businesses: Business[];
  targetLocation?: [number, number];
  zoom?: number;
  fullScreen?: boolean;
  onBusinessSelect?: (business: Business) => void;
  onMultiSelect?: (businesses: Business[]) => void; // New prop for multi-select
  selectedBusinessId?: string;
  selectedBusinessIds?: string[]; // New prop for multi-select
  // Props for dropped pin filtering
  droppedPin: { lat: number, lng: number } | null;
  setDroppedPin: (pin: { lat: number, lng: number } | null) => void;
  radiusKm: number;
}

// Simple fallback icon that should never fail
const createFallbackIcon = () => {
  return L.divIcon({
    className: 'fallback-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background: #6b7280;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">?</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const getProviderLabel = (provider: string) => {
  try {
    if (!provider || typeof provider !== 'string') return '?';
    const trimmed = provider.trim();
    if (!trimmed) return '?';
    const words = trimmed.split(' ').filter(Boolean);
    if (words.length === 1) return trimmed.slice(0, 3).toUpperCase();
    return words.map(word => word[0]).join('').slice(0, 3).toUpperCase();
  } catch (error) {
    console.error('Error in getProviderLabel:', error);
    return '?';
  }
};

const iconCache: Record<string, L.DivIcon> = {};

const createProviderIcon = (provider: string, isSelected: boolean = false) => {
  try {
    // Always ensure we have a valid provider string
    const safeProvider = (provider && typeof provider === 'string') ? provider.trim() : 'Unknown';
    if (!safeProvider) {
      console.warn('Empty provider, using fallback');
      return createFallbackIcon();
    }

    const cacheKey = `${safeProvider}-${isSelected}`;
    
    // Check cache first
    if (iconCache[cacheKey]) {
      return iconCache[cacheKey];
    }

    // Get color and label with fallbacks
    let color;
    let label;
    
    try {
      color = getProviderColor(safeProvider);
      if (!color || typeof color !== 'string') {
        color = '#6b7280'; // Default gray
      }
    } catch (error) {
      console.error('Error getting provider color:', error);
      color = '#6b7280';
    }

    try {
      label = getProviderLabel(safeProvider);
      if (!label || typeof label !== 'string') {
        label = '?';
      }
    } catch (error) {
      console.error('Error getting provider label:', error);
      label = '?';
    }
    
    const size = isSelected ? 32 : 24;
    const borderWidth = isSelected ? 3 : 2;
    const fontSize = isSelected ? '10px' : '8px';
    
    // Create the icon with maximum safety
    const iconOptions = {
      className: 'custom-marker',
      html: `<div style="
        background: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${borderWidth}px solid ${isSelected ? '#fbbf24' : 'white'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${fontSize};
        cursor: pointer;
      ">${label}</div>`,
      iconSize: [size, size] as [number, number],
      iconAnchor: [size/2, size/2] as [number, number],
    };

    const icon = L.divIcon(iconOptions);
    
    // Verify the icon was created successfully
    if (!icon) {
      console.error('L.divIcon returned null/undefined');
      return createFallbackIcon();
    }

    // Cache the successful icon
    iconCache[cacheKey] = icon;
    return icon;
    
  } catch (error) {
    console.error('Critical error in createProviderIcon:', error, { provider, isSelected });
    // Always return a fallback icon, never null
    return createFallbackIcon();
  }
};

export const BusinessMap = React.memo(({
  businesses,
  targetLocation,
  zoom,
  fullScreen = false,
  onBusinessSelect,
  onMultiSelect,
  selectedBusinessId,
  selectedBusinessIds = [],
  droppedPin,
  setDroppedPin,
  radiusKm
}: BusinessMapProps) => {
  
  console.log('🗺️ MAP: BusinessMap render', {
    businessesCount: businesses?.length || 0,
    businessesSample: businesses?.slice(0, 3)?.map(b => ({
      id: b.id,
      name: b.name,
      provider: b.provider,
      hasCoords: !!b.coordinates,
      coords: b.coordinates
    })),
    fullScreen,
    selectedBusinessId,
    selectedBusinessIds: selectedBusinessIds.length
  });
  
  const [isDropMode, setIsDropMode] = useState(false);
  const [currentBusinessIndex, setCurrentBusinessIndex] = useState(0);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(6);
  const [markersLoaded, setMarkersLoaded] = useState(false); // New state for lazy marker loading

  // Lazy load markers after map is ready for better initial performance
  useEffect(() => {
    console.log('🗺️ MAP: Markers loading effect', { mapInstance: !!mapInstance, markersLoaded, businessesCount: businesses.length });
    if (mapInstance && !markersLoaded && businesses.length > 0) {
      // Delay marker loading slightly to let map render first
      const timer = setTimeout(() => {
        console.log('🗺️ MAP: Setting markersLoaded to true');
        setMarkersLoaded(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [mapInstance, markersLoaded, businesses.length]);

  // Handle map invalidation when fullScreen changes
  useEffect(() => {
    if (mapInstance && fullScreen) {
      setTimeout(() => {
        try {
          mapInstance.invalidateSize();
          setIsMapLoading(false);
        } catch (error) {
          console.error('Error invalidating map size:', error);
          setMapError('Map resize failed');
        }
      }, 100);
    }
  }, [mapInstance, fullScreen]);

  // Handle map ready with performance monitoring
  const handleMapReady = useCallback((map: L.Map) => {
    console.log('🗺️ MAP: handleMapReady called');
    PerformanceMonitor.startTimer('map-setup');
    try {
      setMapInstance(map);
      setCurrentZoom(map.getZoom());
      setIsMapLoading(false);
      setMapError(null);
      console.log('🗺️ MAP: Map instance set successfully');
      PerformanceMonitor.endTimer('map-setup');
    } catch (error) {
      console.error('Error setting up map:', error);
      setMapError('Map initialization failed');
      PerformanceMonitor.endTimer('map-setup');
    }
  }, []);

  // Error boundary for map rendering
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('leaflet') || event.message.includes('map') || event.message.includes('createIcon')) {
        console.error('Map error:', event.error);
        setMapError('Map rendering error');
        
        // Clear icon cache to prevent corrupted icons
        Object.keys(iconCache).forEach(key => delete iconCache[key]);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Icon scroll navigation functions with performance optimization
  const navigateToNextBusiness = useCallback(() => {
    if (businesses.length === 0) return;
    PerformanceMonitor.startTimer('navigate-next');
    const nextIndex = (currentBusinessIndex + 1) % businesses.length;
    setCurrentBusinessIndex(nextIndex);
    onBusinessSelect?.(businesses[nextIndex]);
    PerformanceMonitor.endTimer('navigate-next');
  }, [businesses, currentBusinessIndex, onBusinessSelect]);

  const navigateToPrevBusiness = useCallback(() => {
    if (businesses.length === 0) return;
    PerformanceMonitor.startTimer('navigate-prev');
    const prevIndex = currentBusinessIndex === 0 ? businesses.length - 1 : currentBusinessIndex - 1;
    setCurrentBusinessIndex(prevIndex);
    onBusinessSelect?.(businesses[prevIndex]);
    PerformanceMonitor.endTimer('navigate-prev');
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

  // Show error state if map fails to load
  if (mapError) {
    return (
      <div className={`relative group transition-all duration-700 ${fullScreen
        ? 'h-full w-full bg-slate-100'
        : 'rounded-[2.5rem] border-[12px] border-white bg-white shadow-2xl shadow-indigo-100 overflow-hidden min-h-[600px] h-[700px]'
        }`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Map Error</h3>
            <p className="text-slate-600 mb-4">{mapError}</p>
            <button
              onClick={() => {
                setMapError(null);
                window.location.reload();
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Reload Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle spiral navigation (commented out for now to fix unused warning)
  // const handleSpiralNavigation = useCallback((businesses: Business[]) => {
  //   setSpiralBusinesses(businesses);
  //   setCurrentSpiralIndex(0);
  //   setIsSpiralMode(true);
  //   if (businesses.length > 0) {
  //     onBusinessSelect?.(businesses[0]);
  //   }
  // }, [onBusinessSelect]);

  // Map Interaction Locks based on isDropMode
  const mapInteractive = !isDropMode;
  const mapOptions = useMemo(() => ({
    // Disable all interaction when in drop mode
    dragging: mapInteractive,
    touchZoom: mapInteractive,
    doubleClickZoom: mapInteractive,
    scrollWheelZoom: mapInteractive,
    boxZoom: mapInteractive,
    keyboard: mapInteractive,
    tap: mapInteractive,
  }), [mapInteractive]);

  // CRITICAL PERFORMANCE OPTIMIZATION: Memoize markers with stable dependencies and chunked processing
  const memoizedMarkers = React.useMemo(() => {
    console.log('🗺️ MARKERS: Creating markers...', {
      markersLoaded,
      businessesCount: businesses?.length || 0,
      businessesSample: businesses?.slice(0, 2)?.map(b => ({ id: b.id, name: b.name, hasCoords: !!b.coordinates }))
    });
    
    // Don't create markers until they should be loaded
    if (!markersLoaded) {
      console.log('🗺️ MARKERS: Markers not loaded yet, returning empty array');
      return [];
    }
    
    PerformanceMonitor.startTimer('create-markers');
    
    // Return empty array if no businesses
    if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
      console.log('🗺️ MARKERS: No businesses available', { businesses: businesses?.length });
      PerformanceMonitor.endTimer('create-markers');
      return [];
    }
    
    const validMarkers: React.ReactElement[] = [];
    const selectedSet = new Set([selectedBusinessId, ...selectedBusinessIds].filter(Boolean));
    
    // Enhanced chunked processing for better performance
    const CHUNK_SIZE = 50; // Smaller chunks for smoother rendering
    const processChunk = (startIndex: number) => {
      const endIndex = Math.min(startIndex + CHUNK_SIZE, businesses.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const business = businesses[i];
        
        try {
          // Extensive validation of business data
          if (!business?.id || !business.coordinates) {
            console.log('🗺️ MARKERS: Skipping business - missing id or coordinates', { 
              id: business?.id, 
              hasCoords: !!business?.coordinates 
            });
            continue;
          }
          
          if (typeof business.coordinates.lat !== 'number' || 
              typeof business.coordinates.lng !== 'number' ||
              isNaN(business.coordinates.lat) || 
              isNaN(business.coordinates.lng)) {
            console.log('🗺️ MARKERS: Skipping business - invalid coordinates', { 
              id: business.id,
              lat: business.coordinates.lat,
              lng: business.coordinates.lng
            });
            continue;
          }

          // Create icon with maximum safety and caching
          let icon;
          try {
            const isSelected = selectedSet.has(business.id);
            icon = createProviderIcon(business.provider || 'Unknown', isSelected);
            
            if (!icon) {
              icon = createFallbackIcon();
            }
          } catch (iconError) {
            console.error(`Error creating icon for business ${business.id}:`, iconError);
            icon = createFallbackIcon();
          }

          if (!icon) continue;

          // Enhanced throttled click handlers with better performance
          const throttledClick = throttle((e: L.LeafletMouseEvent) => {
            try {
              e.originalEvent?.stopPropagation();
              // Use requestAnimationFrame for smoother UI updates
              requestAnimationFrame(() => {
                onBusinessSelect?.(business);
              });
            } catch (error) {
              console.error('Error in marker click handler:', error);
            }
          }, 150); // Slightly faster response

          const throttledDoubleClick = throttle((e: L.LeafletMouseEvent) => {
            try {
              e.originalEvent?.stopPropagation();
              requestAnimationFrame(() => {
                onBusinessSelect?.(business);
                // Auto-expand the customer details toolbar
                setTimeout(() => {
                  const expandButton = document.querySelector('[title="Expand"]') as HTMLButtonElement;
                  if (expandButton) {
                    expandButton.click();
                  }
                }, 100);
              });
            } catch (error) {
              console.error('Error in marker double-click handler:', error);
            }
          }, 250);

          const marker = (
            <Marker
              key={business.id}
              position={[business.coordinates.lat, business.coordinates.lng]}
              icon={icon}
              eventHandlers={{
                click: throttledClick,
                dblclick: throttledDoubleClick,
              }}
            />
          );

          validMarkers.push(marker);
          
        } catch (error) {
          console.error(`Critical error creating marker for business at index ${i}:`, error);
          continue;
        }
      }
    };

    // Process all businesses in chunks
    for (let i = 0; i < businesses.length; i += CHUNK_SIZE) {
      processChunk(i);
    }

    console.log(`🗺️ MARKERS: Created ${validMarkers.length} markers out of ${businesses.length} businesses`);
    PerformanceMonitor.endTimer('create-markers');
    return validMarkers;
  }, [
    // CRITICAL: Only depend on essential data that actually affects marker rendering
    markersLoaded, // Include markersLoaded in dependencies
    businesses, // Use full businesses array instead of just length
    selectedBusinessId, 
    selectedBusinessIds.join(','), // Stable string representation
    onBusinessSelect
  ]);

  return (
    <div className={`relative group transition-all duration-700 ${fullScreen
      ? 'h-full w-full bg-slate-100'
      : 'rounded-[2.5rem] border-[12px] border-white bg-white shadow-2xl shadow-indigo-100 overflow-hidden min-h-[600px] h-[700px]'
      }`}>
      
      {/* Loading overlay */}
      {(isMapLoading || !markersLoaded) && (
        <div className="absolute inset-0 z-[3000] bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">
              {isMapLoading ? 'Loading map...' : 'Loading markers...'}
            </p>
            {!isMapLoading && !markersLoaded && businesses.length > 0 && (
              <p className="text-slate-500 text-sm mt-2">
                Preparing {businesses.length} business locations
              </p>
            )}
          </div>
        </div>
      )}

      <MapContainer
        center={[-29.0000, 24.0000]}
        zoom={6}
        style={{ height: '100%', width: '100%', borderRadius: fullScreen ? '0' : '1.5rem' }}
        zoomControl={false}
        preferCanvas={true}
        worldCopyJump={true}
        minZoom={5}
        maxZoom={(() => {
          // Responsive max zoom based on device
          const isMobile = window.innerWidth < 768;
          const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
          
          if (isMobile) return 17;    // Limit mobile zoom to prevent performance issues
          if (isTablet) return 18;    // Slightly higher for tablets
          return 18;                  // Full zoom for desktop
        })()} 
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={(() => {
          // Smoother zoom on mobile devices
          const isMobile = window.innerWidth < 768;
          return isMobile ? 80 : 120;
        })()}
        {...mapOptions} // Apply interaction locks
      >
        <MapController 
          targetLocation={targetLocation} 
          zoom={zoom} 
          businesses={businesses} 
          isDropMode={isDropMode}
          setIsDropMode={setIsDropMode}
          setDroppedPin={setDroppedPin}
          droppedPin={droppedPin}
          onMultiSelect={onMultiSelect}
          onMapReady={handleMapReady}
          currentZoom={currentZoom}
          setCurrentZoom={setCurrentZoom}
          selectedBusinessIds={selectedBusinessIds}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          // Performance optimizations
          maxZoom={18}
          tileSize={256}
          zoomOffset={0}
          keepBuffer={2} // Keep 2 screens worth of tiles in memory
          // Responsive tile loading
          detectRetina={true}
          // Faster loading
          crossOrigin={true}
        />

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
            {/* Radius is in meters for Leaflet, so radiusKm * 1000 */}
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

        {markersLoaded && (
          <MarkerClusterGroup
            chunkedLoading={true} // Enable chunked loading for better performance
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            animate={true}
            animateAddingMarkers={false}
            removeOutsideVisibleBounds={true}
            disableClusteringAtZoom={16} // Scatter at zoom 16+ (was 15)
            maxClusterRadius={(zoom: number) => {
              // Responsive clustering based on device type
              const isMobile = window.innerWidth < 768;
              const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
              
              // Base radius adjustments for different devices
              const mobileMultiplier = 0.8; // Smaller clusters on mobile
              const tabletMultiplier = 0.9; // Slightly smaller on tablet
              const baseMultiplier = isMobile ? mobileMultiplier : isTablet ? tabletMultiplier : 1.0;
              
              // Progressive clustering with device-aware sizing
              if (zoom <= 6) return Math.round(100 * baseMultiplier);  // Country level
              if (zoom <= 8) return Math.round(85 * baseMultiplier);   // Province level  
              if (zoom <= 10) return Math.round(70 * baseMultiplier);  // City level
              if (zoom <= 12) return Math.round(55 * baseMultiplier);  // District level
              if (zoom <= 14) return Math.round(40 * baseMultiplier);  // Neighborhood level
              if (zoom <= 15) return Math.round(30 * baseMultiplier);  // Street level
              return Math.round(20 * baseMultiplier);                  // Very tight before scatter
            }}
            spiderfyDistanceMultiplier={(() => {
              // Responsive spiral sizing
              const isMobile = window.innerWidth < 768;
              const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
              
              if (isMobile) return 0.8;  // Smaller spirals on mobile
              if (isTablet) return 0.9;  // Medium spirals on tablet
              return 1.0;                // Full size on desktop
            })()} 
            spiderfyOnEveryZoom={true}
            zoomToBoundsOnClick={false} // Disable automatic zoom on cluster click
            maxZoom={17} // Cluster clicks won't zoom past 17
            eventHandlers={{
              clusterclick: (cluster: any) => {
                const clusterGroup = cluster.target;
                const map = clusterGroup._map;
                const currentZoom = map.getZoom();
                const childCount = clusterGroup.getChildCount();
                
                // Prevent default behavior
                if (cluster.originalEvent) {
                  cluster.originalEvent.preventDefault();
                  cluster.originalEvent.stopPropagation();
                }
                
                // Enhanced progressive zoom behavior
                if (currentZoom <= 8) {
                  // At very low zoom (overview), first click zooms in for better overview
                  const targetZoom = Math.min(currentZoom + 2, 10);
                  map.setView(clusterGroup.getLatLng(), targetZoom, { 
                    animate: true, 
                    duration: 0.8 
                  });
                } else if (currentZoom <= 10 && childCount > 20) {
                  // Medium zoom with many businesses - zoom in to start scattering
                  const targetZoom = Math.min(currentZoom + 2, 13);
                  map.setView(clusterGroup.getLatLng(), targetZoom, { 
                    animate: true, 
                    duration: 0.6 
                  });
                } else if (currentZoom >= 14 || childCount <= 8) {
                  // High zoom or small clusters - always spiderfy
                  clusterGroup.spiderfy();
                } else {
                  // Medium zoom, medium cluster size - spiderfy with condensed layout
                  clusterGroup.spiderfy();
                }
                
                return false; // Prevent any default behavior
              }
            }}
            iconCreateFunction={(cluster: any) => {
              try {
                const count = cluster.getChildCount();
                const map = cluster._group._map;
                const currentZoom = map ? map.getZoom() : 10;
                
                // Responsive sizing based on device and count
                const isMobile = window.innerWidth < 768;
                const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
                
                let size = 32;
                let bgColor = '#3b82f6';
                let textColor = 'white';
                let borderColor = 'white';
                
                // Size based on count with device adjustments
                const sizeMultiplier = isMobile ? 0.85 : isTablet ? 0.92 : 1.0;
                
                if (count >= 1000) {
                  size = Math.round(60 * sizeMultiplier);
                  bgColor = '#7c2d12'; // Dark red for 1000+
                } else if (count >= 500) {
                  size = Math.round(55 * sizeMultiplier);
                  bgColor = '#dc2626'; // Red for 500+
                } else if (count >= 100) {
                  size = Math.round(50 * sizeMultiplier);
                  bgColor = '#ea580c'; // Orange for 100+
                } else if (count >= 50) {
                  size = Math.round(45 * sizeMultiplier);
                  bgColor = '#d97706'; // Amber for 50+
                } else if (count >= 20) {
                  size = Math.round(40 * sizeMultiplier);
                  bgColor = '#ca8a04'; // Yellow for 20+
                } else if (count >= 10) {
                  size = Math.round(36 * sizeMultiplier);
                  bgColor = '#16a34a'; // Green for 10+
                } else {
                  size = Math.round(32 * sizeMultiplier);
                }
                
                // Adjust size slightly based on zoom for better visibility
                if (currentZoom >= 12) {
                  size += Math.round(4 * sizeMultiplier);
                } else if (currentZoom <= 8) {
                  size += Math.round(2 * sizeMultiplier);
                }
                
                const fontSize = size > 50 ? '14px' : size > 40 ? '12px' : size > 35 ? '11px' : '10px';
                
                return L.divIcon({
                  html: `<div style="
                    background: ${bgColor};
                    color: ${textColor};
                    border-radius: 50%;
                    width: ${size}px;
                    height: ${size}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    border: 3px solid ${borderColor};
                    box-shadow: 0 3px 12px rgba(0,0,0,0.3);
                    font-size: ${fontSize};
                    cursor: pointer;
                    transition: transform 0.2s ease;
                  ">${count}</div>`,
                  className: 'cluster-icon',
                  iconSize: [size, size],
                  iconAnchor: [size/2, size/2]
                });
              } catch (error) {
                console.error('Cluster icon error:', error);
                const fallbackSize = window.innerWidth < 768 ? 28 : 32;
                return L.divIcon({
                  html: `<div style="background: #6b7280; color: white; border-radius: 50%; width: ${fallbackSize}px; height: ${fallbackSize}px; display: flex; align-items: center; justify-content: center; font-weight: bold;">•</div>`,
                  iconSize: [fallbackSize, fallbackSize],
                  iconAnchor: [fallbackSize/2, fallbackSize/2]
                });
              }
            }}
          >
            {memoizedMarkers.length > 0 ? memoizedMarkers : []}
          </MarkerClusterGroup>
        )}
      </MapContainer>

      {/* Icon Scroll Navigation Controls */}
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
});
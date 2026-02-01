import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Plus, Minus, Target, MapPin, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, HelpCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Business } from '../types';
import { getProviderColor } from '../utils/providerColors';
import { ShiftDragModal } from './ShiftDragModal';

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
  setShowShiftDragModal,
  onMapReady,
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
  setShowShiftDragModal: Dispatch<SetStateAction<boolean>>,
  onMapReady?: (map: L.Map) => void,
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
      } catch (error) {
        console.error('Error in map ready callback:', error);
      }
    }
  }, [map, onMapReady]);



  useEffect(() => {
    if (targetLocation) {
      map.setView(targetLocation, zoom || map.getZoom(), { animate: true });
    }
  }, [targetLocation, zoom, map]);

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
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Zoom Controls */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/80 backdrop-blur-md shadow-xl">
          <button
            onClick={() => map.zoomIn()}
            className="p-3 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors border-b border-slate-100"
            title="Zoom In"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={() => map.zoomOut()}
            className="p-3 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
            title="Zoom Out"
          >
            <Minus className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Controls */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/80 backdrop-blur-md shadow-xl">
          <button
            onClick={() => {
              const center = map.getCenter();
              map.panTo([center.lat + 0.01, center.lng]);
            }}
            className="p-3 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors border-b border-slate-100"
            title="Pan North"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <div className="flex">
            <button
              onClick={() => {
                const center = map.getCenter();
                map.panTo([center.lat, center.lng - 0.01]);
              }}
              className="p-3 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors border-r border-slate-100"
              title="Pan West"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                const center = map.getCenter();
                map.panTo([center.lat, center.lng + 0.01]);
              }}
              className="p-3 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              title="Pan East"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={() => {
              const center = map.getCenter();
              map.panTo([center.lat - 0.01, center.lng]);
            }}
            className="p-3 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors border-t border-slate-100"
            title="Pan South"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Fit All Button */}
        <button
          onClick={() => {
            if (businesses.length > 0) {
              const bounds = L.latLngBounds(businesses.map(b => [b.coordinates.lat, b.coordinates.lng]));
              map.fitBounds(bounds, { 
                padding: [20, 20],
                maxZoom: 12
              });
            }
          }}
          className="flex items-center justify-center p-3 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-md shadow-xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all active:scale-95"
          title="Fit All Businesses"
        >
          <Target className="h-5 w-5" />
        </button>

        {/* Drop Pin Button */}
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
          className={`flex items-center justify-center p-3 rounded-2xl border border-white/40 backdrop-blur-md shadow-xl transition-all active:scale-95 ${
            isDropMode 
              ? 'bg-rose-500 text-white' 
              : 'bg-white/80 text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
          }`}
          title={isDropMode ? 'Cancel Drop Pin' : 'Drop Filter Pin (500m radius)'}
        >
          {isDropMode ? <X className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
        </button>

        {droppedPin && (
          <button
            onClick={() => setDroppedPin(null)}
            className="flex items-center justify-center p-3 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-md shadow-xl text-rose-600 hover:bg-rose-50 transition-all active:scale-95"
            title="Clear Filter Pin"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Help Button */}
        <button
          onClick={() => setShowShiftDragModal(true)}
          className="flex items-center justify-center p-3 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-md shadow-xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all active:scale-95"
          title="Map Controls Help"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
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
  
  // New State Management for Map Locking and Spiral Navigation
  const [isDropMode, setIsDropMode] = useState(false);
  const [spiralBusinesses, setSpiralBusinesses] = useState<Business[]>([]);
  const [currentSpiralIndex, setCurrentSpiralIndex] = useState(0);
  const [isSpiralMode, setIsSpiralMode] = useState(false);
  const [showShiftDragModal, setShowShiftDragModal] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [currentBusinessIndex, setCurrentBusinessIndex] = useState(0);

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

  // Handle map ready
  const handleMapReady = useCallback((map: L.Map) => {
    try {
      setMapInstance(map);
      setIsMapLoading(false);
      setMapError(null);
    } catch (error) {
      console.error('Error setting up map:', error);
      setMapError('Map initialization failed');
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

  // Icon scroll navigation functions
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

  const navigateSpiral = useCallback((direction: 'prev' | 'next') => {
    if (spiralBusinesses.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSpiralIndex + 1) % spiralBusinesses.length;
    } else {
      newIndex = currentSpiralIndex === 0 ? spiralBusinesses.length - 1 : currentSpiralIndex - 1;
    }
    
    setCurrentSpiralIndex(newIndex);
    onBusinessSelect?.(spiralBusinesses[newIndex]);
  }, [spiralBusinesses, currentSpiralIndex, onBusinessSelect]);

  const exitSpiralMode = useCallback(() => {
    setIsSpiralMode(false);
    setSpiralBusinesses([]);
    setCurrentSpiralIndex(0);
  }, []);

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

  const memoizedMarkers = React.useMemo(() => {
    // Return empty array if no businesses
    if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
      return [];
    }
    
    const validMarkers: React.ReactElement[] = [];
    
    businesses.forEach((business, index) => {
      try {
        // Extensive validation of business data
        if (!business) {
          console.warn(`Business at index ${index} is null/undefined`);
          return;
        }

        if (!business.id || typeof business.id !== 'string') {
          console.warn(`Business at index ${index} has invalid id:`, business.id);
          return;
        }

        if (!business.coordinates) {
          console.warn(`Business ${business.id} has no coordinates`);
          return;
        }

        if (typeof business.coordinates.lat !== 'number' || typeof business.coordinates.lng !== 'number') {
          console.warn(`Business ${business.id} has invalid coordinates:`, business.coordinates);
          return;
        }

        if (isNaN(business.coordinates.lat) || isNaN(business.coordinates.lng)) {
          console.warn(`Business ${business.id} has NaN coordinates:`, business.coordinates);
          return;
        }

        // Create icon with maximum safety
        let icon;
        try {
          const isSelected = business.id === selectedBusinessId || selectedBusinessIds.includes(business.id);
          icon = createProviderIcon(business.provider || 'Unknown', isSelected);
          
          // Double-check the icon was created
          if (!icon) {
            console.error(`Failed to create icon for business ${business.id}`);
            icon = createFallbackIcon();
          }
        } catch (iconError) {
          console.error(`Error creating icon for business ${business.id}:`, iconError);
          icon = createFallbackIcon();
        }

        // Final safety check
        if (!icon) {
          console.error(`Still no icon for business ${business.id}, skipping marker`);
          return;
        }

        const marker = (
          <Marker
            key={business.id}
            position={[business.coordinates.lat, business.coordinates.lng]}
            icon={icon}
            eventHandlers={{
              click: (e) => {
                try {
                  e.originalEvent?.stopPropagation();
                  onBusinessSelect?.(business);
                } catch (error) {
                  console.error('Error in marker click handler:', error);
                }
              },
              dblclick: (e) => {
                try {
                  e.originalEvent?.stopPropagation();
                  onBusinessSelect?.(business);
                  // Auto-expand the customer details toolbar
                  setTimeout(() => {
                    const expandButton = document.querySelector('[title="Expand"]') as HTMLButtonElement;
                    if (expandButton) {
                      expandButton.click();
                    }
                  }, 100);
                } catch (error) {
                  console.error('Error in marker double-click handler:', error);
                }
              },
            }}
          />
        );

        validMarkers.push(marker);
        
      } catch (error) {
        console.error(`Critical error creating marker for business at index ${index}:`, error);
        // Continue with next business instead of breaking
      }
    });

    console.log(`Created ${validMarkers.length} valid markers out of ${businesses.length} businesses`);
    return validMarkers;
  }, [businesses, onBusinessSelect, selectedBusinessId, selectedBusinessIds]);

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

      <MapContainer
        center={[-29.0000, 24.0000]}
        zoom={6}
        style={{ height: '100%', width: '100%', borderRadius: fullScreen ? '0' : '1.5rem' }}
        zoomControl={false}
        preferCanvas={true}
        worldCopyJump={true}
        maxBounds={[[-35, 16], [-22, 33]]} // Rough bounds for South Africa
        minZoom={5}
        maxZoom={19}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={120}
        {...mapOptions} // Apply interaction locks
      >
        <MapController 
          targetLocation={targetLocation} 
          zoom={zoom} 
          businesses={businesses} 
          droppedPin={droppedPin}
          setDroppedPin={setDroppedPin}
          isDropMode={isDropMode}
          setIsDropMode={setIsDropMode}
          onMultiSelect={onMultiSelect}
          setShowShiftDragModal={setShowShiftDragModal}
          onMapReady={handleMapReady}
          selectedBusinessIds={selectedBusinessIds}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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

        <MarkerClusterGroup
          chunkedLoading={false}
          spiderfyOnMaxZoom={false}
          showCoverageOnHover={false}
          animate={false}
          animateAddingMarkers={false}
          removeOutsideVisibleBounds={false}
          disableClusteringAtZoom={14} // Scatter at zoom 14 and above
          maxClusterRadius={80} // Reasonable clustering distance
          iconCreateFunction={(cluster: any) => {
            try {
              const count = cluster.getChildCount();
              
              // Different sizes based on count
              let size = 40;
              let bgColor = '#3b82f6';
              
              if (count >= 100) {
                size = 50;
                bgColor = '#dc2626'; // Red for 100+
              } else if (count >= 50) {
                size = 45;
                bgColor = '#ea580c'; // Orange for 50+
              } else if (count >= 20) {
                size = 42;
                bgColor = '#ca8a04'; // Yellow for 20+
              }
              
              return L.divIcon({
                html: `<div style="
                  background: ${bgColor};
                  color: white;
                  border-radius: 50%;
                  width: ${size}px;
                  height: ${size}px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  border: 3px solid white;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                  font-size: ${size > 45 ? '14px' : '12px'};
                ">${count}</div>`,
                className: 'cluster-icon',
                iconSize: [size, size],
                iconAnchor: [size/2, size/2]
              });
            } catch (error) {
              console.error('Cluster icon error:', error);
              return L.divIcon({
                html: '<div style="background: #6b7280; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">•</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              });
            }
          }}
        >
          {memoizedMarkers.length > 0 ? memoizedMarkers : []}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Map Stats Overlay - Enhanced for Testing */}
      <div className="absolute bottom-6 left-6 z-[1000] glass-card rounded-2xl p-4 flex items-center gap-4 border-white/40 shadow-xl animate-in slide-in-from-left-4 duration-1000">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Map Info</span>
          <span className="text-sm font-black text-slate-900 leading-none">
            {businesses.length} businesses • Zoom: {mapInstance?.getZoom()?.toFixed(1) || 'Loading...'}
          </span>
          <span className="text-xs text-slate-500 mt-1">
            {mapInstance?.getZoom() && mapInstance.getZoom() >= 14 ? 'Scattered View' : 'Clustered View'}
          </span>
        </div>
        <button
          onClick={() => setShowShiftDragModal(true)}
          className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          title="Map Controls Help"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Icon Scroll Navigation Controls */}
      {businesses.length > 1 && selectedBusinessId && (
        <div className="absolute bottom-6 right-6 z-[1000] flex items-center gap-2 glass-card rounded-2xl p-3 border-white/40 shadow-xl animate-in slide-in-from-right-4 duration-300">
          <button
            onClick={navigateToPrevBusiness}
            className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white/50 transition-all active:scale-95"
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
            className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white/50 transition-all active:scale-95"
            title="Next business"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Spiral Navigation Controls */}
      {isSpiralMode && spiralBusinesses.length > 1 && (
        <div className="absolute bottom-6 right-6 z-[1000] flex items-center gap-2 glass-card rounded-2xl p-3 border-white/40 shadow-xl animate-in slide-in-from-right-4 duration-300">
          <button
            onClick={() => navigateSpiral('prev')}
            className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white/50 transition-all active:scale-95"
            title="Previous business"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="flex flex-col items-center px-2">
            <span className="text-xs font-bold text-slate-900">
              {currentSpiralIndex + 1} of {spiralBusinesses.length}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Cluster
            </span>
          </div>
          
          <button
            onClick={() => navigateSpiral('next')}
            className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white/50 transition-all active:scale-95"
            title="Next business"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          
          <button
            onClick={exitSpiralMode}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white/50 transition-all active:scale-95"
            title="Exit cluster navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Shift Drag Modal */}
      <ShiftDragModal 
        isOpen={showShiftDragModal} 
        onClose={() => setShowShiftDragModal(false)} 
      />
    </div>
  );
});
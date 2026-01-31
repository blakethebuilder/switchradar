import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Plus, Minus, Target, MapPin, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Business } from '../types';
import { getProviderColor } from '../utils/providerColors';

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
  selectedBusinessIds?: string[]
}) {
  const map = useMap();
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [dragEnd, setDragEnd] = useState<{x: number, y: number} | null>(null);
  const [selectionBox, setSelectionBox] = useState<HTMLDivElement | null>(null);



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

        {/* Mobile/Desktop Drop Pin Button */}
        <button
          onClick={() => {
            if (isDropMode) {
              setIsDropMode(false);
            } else {
              setIsDropMode(true);
              setDroppedPin(null); // Clear previous pin when starting new drop mode
              map.getContainer().focus();
            }
          }}
          className={`flex items-center justify-center p-3 rounded-2xl border border-white/40 backdrop-blur-md shadow-xl transition-all active:scale-95 ${
            isDropMode 
              ? 'bg-rose-500 text-white' 
              : 'bg-white/80 text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
          }`}
          title={isDropMode ? 'Cancel Drop Pin' : 'Drop Filter Pin'}
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

const getProviderLabel = (provider: string) => {
  const trimmed = provider.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(' ').filter(Boolean);
  if (words.length === 1) return trimmed.slice(0, 3).toUpperCase();
  return words.map(word => word[0]).join('').slice(0, 3).toUpperCase();
};

const iconCache: Record<string, L.DivIcon> = {};

const createProviderIcon = (provider: string, isSelected: boolean = false) => {
  const cacheKey = `${provider}-${isSelected}`;
  if (iconCache[cacheKey]) return iconCache[cacheKey];

  const color = getProviderColor(provider);
  const label = getProviderLabel(provider);
  
  const size = isSelected ? 36 : 28;
  const borderWidth = isSelected ? 4 : 3;
  const fontSize = isSelected ? '10px' : '8px';
  const borderRadius = isSelected ? '14px' : '10px';
  
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
        width: ${size}px;
        height: ${size}px;
        border-radius: ${borderRadius};
        border: ${borderWidth}px solid ${isSelected ? '#fbbf24' : 'white'};
        box-shadow: ${isSelected ? 
          '0 8px 25px -5px rgb(0 0 0 / 0.3), 0 4px 6px -2px rgb(0 0 0 / 0.1), 0 0 0 4px rgb(251 191 36 / 0.3)' : 
          '0 6px 20px -5px rgb(0 0 0 / 0.2), 0 4px 6px -2px rgb(0 0 0 / 0.1)'
        };
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 900;
        font-size: ${fontSize};
        letter-spacing: -0.2px;
        transform: rotate(45deg);
        transition: all 0.2s ease;
        cursor: pointer;
        ${isSelected ? 'animation: pulse 2s infinite;' : ''}
      ">
        <div style="transform: rotate(-45deg); text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${label}</div>
      </div>
      ${isSelected ? `
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1) rotate(45deg); }
            50% { transform: scale(1.1) rotate(45deg); }
          }
        </style>
      ` : ''}
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });

  iconCache[cacheKey] = icon;
  return icon;
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
  
  // New State Management for Map Locking
  const [isDropMode, setIsDropMode] = useState(false); 

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
    // Limit markers on mobile for performance
    const maxMarkers = window.innerWidth < 768 ? 200 : businesses.length;
    const markersToRender = businesses.slice(0, maxMarkers);
    
    return markersToRender.map((business) => {
      const isSelected = business.id === selectedBusinessId || selectedBusinessIds.includes(business.id);
      return (
        <Marker
          key={business.id}
          position={[business.coordinates.lat, business.coordinates.lng]}
          icon={createProviderIcon(business.provider, isSelected)}
          eventHandlers={{
          click: (e) => {
            e.originalEvent.stopPropagation();
            onBusinessSelect?.(business);
          },
          mouseover: (e) => {
            // Add hover effect - scale up the marker (only if not selected)
            if (!isSelected) {
              const marker = e.target;
              const icon = marker.getIcon();
              if (icon && icon.options && icon.options.html) {
                const newHtml = icon.options.html.replace(
                  /width: (\d+)px; height: (\d+)px;/,
                  'width: 36px; height: 36px; transform: scale(1.15) rotate(45deg);'
                );
                const hoverIcon = L.divIcon({
                  ...icon.options,
                  html: newHtml,
                  iconSize: [36, 36],
                  iconAnchor: [18, 18],
                });
                marker.setIcon(hoverIcon);
              }
            }
          },
          mouseout: (e) => {
            // Reset to original size (only if not selected)
            if (!isSelected) {
              const marker = e.target;
              marker.setIcon(createProviderIcon(business.provider, false));
            }
          },
        }}
      />
    );
    });
  }, [businesses, onBusinessSelect, selectedBusinessId, selectedBusinessIds]);

  return (
    <div className={`relative group transition-all duration-700 ${fullScreen
      ? 'h-full w-full bg-slate-100'
      : 'rounded-[2.5rem] border-[12px] border-white bg-white shadow-2xl shadow-indigo-100 overflow-hidden min-h-[600px] h-[700px]'
      }`}>
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
          chunkedLoading
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          maxClusterRadius={window.innerWidth < 768 ? 80 : 60}
          disableClusteringAtZoom={window.innerWidth < 768 ? 14 : 16}
          removeOutsideVisibleBounds={true}
          spiderfyDistanceMultiplier={window.innerWidth < 768 ? 1.2 : 1.5}
          animate={window.innerWidth >= 768}
          animateAddingMarkers={window.innerWidth >= 768}
          spiderfyShapePositions={(count: number, centerPt: any) => {
            // Enhanced spiral algorithm for better distribution
            let distanceFromCenter;
            let spiralTurns = 1;
            
            if (count <= 3) {
              // Very small clusters: tight circle
              distanceFromCenter = 35;
            } else if (count <= 8) {
              // Small clusters: single ring
              distanceFromCenter = 45;
            } else if (count <= 15) {
              // Medium clusters: wider ring
              distanceFromCenter = 55;
              spiralTurns = 1.2;
            } else if (count <= 30) {
              // Large clusters: spiral pattern
              distanceFromCenter = 65;
              spiralTurns = 1.5;
            } else if (count <= 50) {
              // Very large clusters: extended spiral
              distanceFromCenter = 75;
              spiralTurns = 2;
            } else {
              // Massive clusters: full spiral
              distanceFromCenter = 85;
              spiralTurns = 2.5;
            }
            
            return Array.from({ length: count }, (_, i) => {
              // Create spiral pattern
              const angle = (i / count) * (2 * Math.PI * spiralTurns);
              const radius = distanceFromCenter * (0.3 + 0.7 * (i / count));
              
              return [
                centerPt.x + radius * Math.cos(angle),
                centerPt.y + radius * Math.sin(angle)
              ];
            });
          }}
          polygonOptions={{
            fillColor: '#6366f1',
            color: '#6366f1',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.15
          }}
          iconCreateFunction={(cluster: any) => {
            const count = cluster.getChildCount();
            let size = 'small';
            let colorClass = 'bg-indigo-500';
            let iconSize = [36, 36];
            let textSize = 'text-sm';
            
            if (count >= 100) {
              size = 'large';
              colorClass = 'bg-rose-500';
              iconSize = [48, 48];
              textSize = 'text-lg';
            } else if (count >= 50) {
              size = 'medium';
              colorClass = 'bg-orange-500';
              iconSize = [42, 42];
              textSize = 'text-base';
            } else if (count >= 20) {
              size = 'medium';
              colorClass = 'bg-amber-500';
              iconSize = [40, 40];
              textSize = 'text-base';
            } else if (count >= 10) {
              size = 'small';
              colorClass = 'bg-emerald-500';
              iconSize = [38, 38];
              textSize = 'text-sm';
            }
            
            const sizeClass = size === 'large' ? 'w-12 h-12' : 
                             size === 'medium' ? 'w-10 h-10' : 'w-9 h-9';
            
            return L.divIcon({
              html: `<div class="flex items-center justify-center ${sizeClass} ${colorClass} text-white font-bold rounded-full border-3 border-white shadow-xl hover:scale-110 transition-transform cursor-pointer ${textSize}">${count}</div>`,
              className: 'custom-cluster-icon',
              iconSize: iconSize as [number, number],
              iconAnchor: [iconSize[0]/2, iconSize[1]/2] as [number, number]
            });
          }}
        >
          {memoizedMarkers}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Map Stats Overlay - Floating Glass */}
      <div className="absolute bottom-6 left-6 z-[1000] glass-card rounded-2xl p-4 md:flex hidden items-center gap-4 border-white/40 shadow-xl animate-in slide-in-from-left-4 duration-1000">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Active Insight</span>
          <span className="text-sm font-black text-slate-900 leading-none">{businesses.length} Visible Businesses</span>
        </div>
      </div>
    </div>
  );
});
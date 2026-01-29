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
function MapController({ targetLocation, zoom, businesses, isDropMode, setIsDropMode, setDroppedPin, droppedPin }: { 
  targetLocation?: [number, number], 
  zoom?: number, 
  businesses: Business[],
  isDropMode: boolean,
  setIsDropMode: Dispatch<SetStateAction<boolean>>,
  setDroppedPin: (pin: { lat: number, lng: number } | null) => void,
  droppedPin: { lat: number, lng: number } | null
}) {
  const map = useMap();



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

  useEffect(() => {
    if (isDropMode) {
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    } else {
      map.getContainer().style.cursor = '';
      map.off('click', handleMapClick);
    }
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDropMode, map, handleMapClick]);

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

const createProviderIcon = (provider: string) => {
  if (iconCache[provider]) return iconCache[provider];

  const color = getProviderColor(provider);
  const label = getProviderLabel(provider);
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 8px;
        border: 2px solid white;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 900;
        font-size: 7.5px;
        letter-spacing: -0.2px;
        transform: rotate(45deg);
      ">
        <div style="transform: rotate(-45deg);">${label}</div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  iconCache[provider] = icon;
  return icon;
};

export const BusinessMap = React.memo(({
  businesses,
  targetLocation,
  zoom,
  fullScreen = false,
  onBusinessSelect,
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

  const memoizedMarkers = React.useMemo(() => businesses.map((business) => (
    <Marker
      key={business.id}
      position={[business.coordinates.lat, business.coordinates.lng]}
      icon={createProviderIcon(business.provider)}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          onBusinessSelect?.(business);
        },
      }}
    />
  )), [businesses, onBusinessSelect]);

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
        maxZoom={18}
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
          maxClusterRadius={40}
          disableClusteringAtZoom={15}
          removeOutsideVisibleBounds={true}
          spiderfyDistanceMultiplier={1.2}
          animate={false}
          animateAddingMarkers={false}
          spiderfyShapePositions={(count: number, centerPt: any) => {
            const distanceFromCenter = 30;
            const angleStep = (2 * Math.PI) / count;
            
            return Array.from({ length: count }, (_, i) => {
              const angle = angleStep * i;
              return [
                centerPt.x + distanceFromCenter * Math.cos(angle),
                centerPt.y + distanceFromCenter * Math.sin(angle)
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
            
            if (count >= 100) {
              size = 'large';
              colorClass = 'bg-rose-500';
            } else if (count >= 50) {
              size = 'medium';
              colorClass = 'bg-orange-500';
            } else if (count >= 10) {
              size = 'medium';
              colorClass = 'bg-amber-500';
            }
            
            const sizeClass = size === 'large' ? 'w-12 h-12 text-lg' : 
                             size === 'medium' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
            
            return L.divIcon({
              html: `<div class="flex items-center justify-center ${sizeClass} ${colorClass} text-white font-bold rounded-full border-2 border-white shadow-lg">${count}</div>`,
              className: 'custom-cluster-icon',
              iconSize: [40, 40],
              iconAnchor: [20, 20]
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
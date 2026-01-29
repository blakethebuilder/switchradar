import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Plus, Minus, Target } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Business } from '../types';
import { getProviderColor } from '../utils/providerColors';

// Helper component to handle center/zoom and fit bounds
function MapController({ targetLocation, zoom, businesses }: { targetLocation?: [number, number], zoom?: number, businesses: Business[] }) {
  const map = useMap();

  useEffect(() => {
    if (targetLocation) {
      map.setView(targetLocation, zoom || map.getZoom(), { animate: true });
    }
  }, [targetLocation, zoom, map]);

  return (
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
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        }}
        className="flex items-center justify-center p-3 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-md shadow-xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all active:scale-95"
        title="Fit All Businesses"
      >
        <Target className="h-5 w-5" />
      </button>
    </div>
  );
}

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
}: BusinessMapProps) => {
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
        center={[-26.8521, 26.6667]}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: fullScreen ? '0' : '1.5rem' }}
        zoomControl={false}
        preferCanvas={true}
      >
        <MapController targetLocation={targetLocation} zoom={zoom} businesses={businesses} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MarkerClusterGroup
          chunkedLoading
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={true}
          maxClusterRadius={30}
          disableClusteringAtZoom={15}
          removeOutsideVisibleBounds={true}
          spiderfyDistanceMultiplier={1.2}
          polygonOptions={{
            fillColor: '#6366f1',
            color: '#6366f1',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.1
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
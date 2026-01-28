import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { Business } from '../types';
import { getProviderColor } from '../utils/providerColors';
import { ProviderBadge } from './ProviderBadge';
import { Phone, MapPin, ExternalLink, Globe } from 'lucide-react';

// Helper component to handle view changes
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
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
  center?: [number, number];
  zoom?: number;
  fullScreen?: boolean;
}

const getProviderLabel = (provider: string) => {
  const trimmed = provider.trim();
  if (!trimmed) {
    return '?';
  }
  const words = trimmed.split(' ').filter(Boolean);
  if (words.length === 1) {
    return trimmed.slice(0, 3).toUpperCase();
  }
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
        width: 22px;
        height: 22px;
        border-radius: 6px;
        border: 2px solid white;
        box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 7px;
        letter-spacing: -0.2px;
        transform: rotate(45deg);
      ">
        <div style="transform: rotate(-45deg);">${label}</div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  iconCache[provider] = icon;
  return icon;
};

export const BusinessMap: React.FC<BusinessMapProps> = ({
  businesses,
  center = [-26.8521, 26.6667],
  zoom = 13,
  fullScreen = false
}) => {
  return (
    <div className={`relative group transition-all duration-700 ${fullScreen
      ? 'h-full w-full'
      : 'rounded-[2.5rem] border-[12px] border-white bg-white shadow-2xl shadow-indigo-100 overflow-hidden min-h-[600px] h-[700px]'
      }`}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: fullScreen ? '0' : '1.5rem' }}
        zoomControl={false}
      >
        <ChangeView center={center} zoom={zoom} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MarkerClusterGroup
          chunkedLoading
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          maxClusterRadius={40}
          disableClusteringAtZoom={14}
        >
          {businesses.map((business) => (
            <Marker
              key={business.id}
              position={[business.coordinates.lat, business.coordinates.lng]}
              icon={createProviderIcon(business.provider)}
            >
              <Popup keepInView={true}>
                <div className="p-0 min-w-[220px] max-w-[260px]">
                  <div className="relative h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 leading-tight mb-0.5">
                          {business.name}
                        </h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{business.category}</p>
                      </div>
                      <ProviderBadge provider={business.provider} className="font-bold shrink-0 text-[10px] scale-90" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <div className="h-6 w-6 rounded-md bg-slate-50 flex items-center justify-center shrink-0">
                          <MapPin className="w-3 h-3 text-slate-400" />
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 leading-relaxed">
                          {business.address}
                          <div className="mt-0.5 text-indigo-500 font-bold uppercase tracking-wider text-[8px]">
                            {business.town}
                          </div>
                        </div>
                      </div>

                      {business.phone && (
                        <div className="flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-md bg-slate-50 flex items-center justify-center shrink-0">
                            <Phone className="w-3 h-3 text-slate-400" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600">{business.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 text-white text-[9px] font-black tracking-widest hover:bg-indigo-700 transition-colors">
                        <ExternalLink className="w-3 h-3" />
                        INFO
                      </button>
                      <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 text-slate-600 text-[9px] font-black tracking-widest hover:bg-slate-100 transition-colors">
                        <Globe className="w-3 h-3" />
                        MAPS
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Map Stats Overlay */}
      <div className="absolute top-6 left-6 z-[1000] glass-card rounded-2xl p-4 md:flex hidden items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Visible</span>
          <span className="text-lg font-extrabold text-slate-900">{businesses.length} Leads</span>
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <div className="flex -space-x-2">
          {Array.from(new Set(businesses.map(b => b.provider))).slice(0, 4).map((p, i) => (
            <div
              key={p}
              className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
              style={{ backgroundColor: getProviderColor(p), zIndex: 10 - i }}
            >
              {getProviderLabel(p)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Navigation, Trash2, ExternalLink, MapPin } from 'lucide-react';
import type { Business, RouteItem } from '../types';

interface RouteViewProps {
  routeItems: RouteItem[];
  businesses: Business[];
  onRemoveFromRoute: (id: string) => void;
  onClearRoute: () => void;
  onSelectBusiness: (business: Business) => void;
}

export const RouteView: React.FC<RouteViewProps> = ({
  routeItems,
  businesses,
  onRemoveFromRoute,
  onClearRoute,
  onSelectBusiness,
}) => {
  const routeBusinesses = React.useMemo(() => routeItems
    .map(item => businesses.find(b => b.id === item.businessId))
    .filter((b): b is Business => !!b), [routeItems, businesses]);

  if (routeBusinesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
          <MapPin className="h-10 w-10 opacity-20" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Route is Empty</h3>
        <p className="max-w-xs text-center text-sm font-medium">Add businesses from the map or table to build your route.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden max-w-4xl mx-auto my-4 md:my-8">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-none">Route Plan</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">{routeBusinesses.length} stops</p>
          </div>
        </div>
        <button 
          onClick={onClearRoute}
          className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
        >
          Clear Route
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 custom-scrollbar">
        {routeBusinesses.map((b, idx) => (
          <div
            key={b.id}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all group"
          >
            <span className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">
              {idx + 1}
            </span>
            
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelectBusiness(b)}>
              <div className="text-sm font-bold text-slate-900 truncate">{b.name}</div>
              <div className="text-xs text-slate-500 truncate mt-0.5">{b.address}, {b.town}</div>
            </div>

            <button
              onClick={() => onRemoveFromRoute(b.id)}
              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              title="Remove stop"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
        <button
          onClick={() => {
            const coords = routeBusinesses.map(b => `${b.coordinates.lat},${b.coordinates.lng}`).join('/');
            window.open(`https://www.google.com/maps/dir/${coords}`, '_blank');
          }}
          className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 text-white text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
        >
          <ExternalLink className="h-5 w-5" />
          Open in Google Maps
        </button>
      </div>
    </div>
  );
};

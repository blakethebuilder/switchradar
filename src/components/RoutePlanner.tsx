import React from 'react';
import { Route, Trash2, MapPin, Phone, ExternalLink, ChevronRight, X } from 'lucide-react';
import type { Business, RouteItem } from '../types';
import { getProviderColor } from '../utils/providerColors';

interface RoutePlannerProps {
    routeItems: RouteItem[];
    businesses: Business[];
    onRemoveFromRoute: (id: string) => void;
    onClearRoute: () => void;
    onSelectBusiness: (business: Business) => void;
    onClose: () => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
    routeItems,
    businesses,
    onRemoveFromRoute,
    onClearRoute,
    onSelectBusiness,
    onClose
}) => {
    const routeBusinesses = routeItems
        .map(item => businesses.find(b => b.id === item.businessId))
        .filter((b): b is Business => !!b);

    if (routeItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-300">
                    <Route className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No route planned</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[180px]">Select leads on the map to build your visit schedule.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <Route className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-900 leading-tight">Visit Route</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{routeBusinesses.length} stops planned</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onClearRoute}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Clear all stops"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {routeBusinesses.map((business, index) => (
                    <div
                        key={business.id}
                        className="group relative flex items-start gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer"
                        onClick={() => onSelectBusiness(business)}
                    >
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white shadow-lg border-2 border-white z-10">
                            {index + 1}
                        </div>

                        <div className="flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h4 className="text-sm font-bold text-slate-900 truncate leading-tight group-hover:text-indigo-600 transition-colors">
                                    {business.name}
                                </h4>
                                <div
                                    className="h-2 w-2 rounded-full shrink-0 mt-1 shadow-sm"
                                    style={{ backgroundColor: getProviderColor(business.provider) }}
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center text-[10px] font-semibold text-slate-500 truncate">
                                    <MapPin className="h-3 w-3 mr-1.5 text-slate-300" />
                                    {business.address}
                                </div>
                                {business.phone && (
                                    <div className="flex items-center text-[10px] font-semibold text-slate-500">
                                        <Phone className="h-3 w-3 mr-1.5 text-slate-300" />
                                        {business.phone}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveFromRoute(business.id);
                            }}
                            className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <button
                    onClick={() => {
                        const coords = routeBusinesses.map(b => `${b.coordinates.lat},${b.coordinates.lng}`).join('/');
                        window.open(`https://www.google.com/maps/dir/${coords}`, '_blank');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
                >
                    <ExternalLink className="h-4 w-4" />
                    Open in Google Maps
                </button>
            </div>
        </div>
    );
};

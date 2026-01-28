import { MapPin, ExternalLink, X, Plus, Minus, Globe, Smartphone, Trash2, Navigation, Landmark } from 'lucide-react';
import type { Business, RouteItem } from '../types';
import { isMobileProvider } from '../utils/phoneUtils';
import { ProviderBadge } from './ProviderBadge';

interface RoutePlannerProps {
    routeItems: RouteItem[];
    businesses: Business[];
    selectedBusiness?: Business | null;
    onRemoveFromRoute: (id: string) => void;
    onAddToRoute: (id: string) => void;
    onClearRoute: () => void;
    onSelectBusiness: (business: Business | null) => void;
    onClose: () => void;
    onTogglePhoneType?: (id: string, currentType: 'landline' | 'mobile') => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
    routeItems,
    businesses,
    selectedBusiness,
    onRemoveFromRoute,
    onAddToRoute,
    onClearRoute,
    onSelectBusiness,
    onClose,
    onTogglePhoneType
}) => {
    const routeBusinesses = routeItems
        .map(item => businesses.find(b => b.id === item.businessId))
        .filter((b): b is Business => !!b);

    const isInRoute = selectedBusiness ? routeItems.some(item => item.businessId === selectedBusiness.id) : false;

    if (!selectedBusiness && routeBusinesses.length === 0) {
        return (
            <div className="h-full flex items-center justify-between px-6 py-4 bg-white">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                        <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900">Ready to explore</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select a pin to view details</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
                    <X className="h-5 w-5" />
                </button>
            </div>
        );
    }

    // View: Route List (No Selection)
    if (!selectedBusiness) {
        return (
            <div className="flex flex-col h-full bg-white max-h-[300px]">
                <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-indigo-600" />
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Route Plan ({routeBusinesses.length})</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {routeBusinesses.length > 0 && (
                            <button onClick={onClearRoute} className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2">
                                CLEAR
                            </button>
                        )}
                        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {routeBusinesses.map((b, idx) => (
                        <div
                            key={b.id}
                            onClick={() => onSelectBusiness(b)}
                            className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 bg-white hover:border-indigo-100 hover:shadow-sm cursor-pointer"
                        >
                            <div className="h-6 w-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 truncate">{b.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">{b.town}</div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemoveFromRoute(b.id); }}
                                className="p-2 text-slate-300 hover:text-rose-500"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {routeBusinesses.length > 0 && (
                    <div className="p-3 border-t border-slate-100 bg-white">
                        <button
                            onClick={() => {
                                const coords = routeBusinesses.map(b => `${b.coordinates.lat},${b.coordinates.lng}`).join('/');
                                window.open(`https://www.google.com/maps/dir/${coords}`, '_blank');
                            }}
                            className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                        >
                            <ExternalLink className="h-3 w-3" />
                            Navigate Route
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // View: Selected Business Detail
    const isMobile = selectedBusiness.phoneTypeOverride
        ? selectedBusiness.phoneTypeOverride === 'mobile'
        : isMobileProvider(selectedBusiness.provider, selectedBusiness.phone);

    return (
        <div className="bg-white h-auto max-h-[400px] overflow-y-auto">
            <div className="sticky top-0 right-0 z-20 flex justify-end p-2 absolute">
                <button onClick={onClose} className="h-8 w-8 rounded-full bg-white/80 backdrop-blur shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="p-5 md:p-6 pb-2">
                {/* Header Row */}
                <div className="flex items-start gap-4 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Landmark className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <ProviderBadge provider={selectedBusiness.provider} className="scale-90 origin-left" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 leading-tight truncate">{selectedBusiness.name}</h2>
                        <p className="text-xs text-slate-500 font-medium truncate">{selectedBusiness.address}, {selectedBusiness.town}</p>
                    </div>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <button
                        onClick={() => isInRoute ? onRemoveFromRoute(selectedBusiness.id) : onAddToRoute(selectedBusiness.id)}
                        className={`flex-1 min-w-[140px] h-10 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isInRoute
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            }`}
                    >
                        {isInRoute ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {isInRoute ? 'Remove Stop' : 'Add to Route'}
                    </button>

                    <div className="flex gap-2 flex-1">
                        <button
                            onClick={() => {
                                const mapsUrl = selectedBusiness.mapsLink && selectedBusiness.mapsLink.startsWith('http')
                                    ? selectedBusiness.mapsLink
                                    : `https://www.google.com/maps/search/?api=1&query=${selectedBusiness.coordinates.lat},${selectedBusiness.coordinates.lng}`;
                                window.open(mapsUrl, '_blank');
                            }}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Open in Maps"
                        >
                            <Globe className="h-4 w-4" />
                        </button>

                        {selectedBusiness.phone && (
                            <button
                                onClick={() => onTogglePhoneType?.(selectedBusiness.id, isMobile ? 'mobile' : 'landline')}
                                className={`flex-1 h-10 px-3 rounded-xl border flex items-center justify-center gap-2 transition-colors ${isMobile
                                        ? 'bg-rose-50 border-rose-100 text-rose-600'
                                        : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                    }`}
                                title="Toggle Phone Type"
                            >
                                {isMobile ? <Smartphone className="h-3 w-3" /> : <Landmark className="h-3 w-3" />}
                                <span className="text-[10px] font-black uppercase">{isMobile ? 'Mobile' : 'Landline'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Phone Number Display */}
                {selectedBusiness.phone && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-2 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Number</span>
                        <span className="text-sm font-black text-slate-900 font-mono tracking-tight">{selectedBusiness.phone}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

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

    // View: Empty State
    if (!selectedBusiness && routeBusinesses.length === 0) {
        return (
            <div className="flex items-center justify-between px-6 py-6 bg-white rounded-t-[2rem]">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                        <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 leading-none">Ready to explore</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select a pin to view details</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900">
                    <X className="h-5 w-5" />
                </button>
            </div>
        );
    }

    // View: Route List (No Selection)
    if (!selectedBusiness) {
        return (
            <div className="flex flex-col bg-white rounded-t-[2rem] max-h-[40vh]">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-[2rem]">
                    <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-indigo-600" />
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Route Plan ({routeBusinesses.length})</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {routeBusinesses.length > 0 && (
                            <button onClick={onClearRoute} className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2 uppercase tracking-wide">
                                Clear
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
                    {routeBusinesses.map((b, idx) => (
                        <div
                            key={b.id}
                            onClick={() => onSelectBusiness(b)}
                            className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer"
                        >
                            <span className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                                {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-900 truncate leading-tight">{b.name}</div>
                                <div className="text-[10px] text-slate-400 truncate font-semibold">{b.town}</div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemoveFromRoute(b.id); }}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-white border-t border-slate-100 pb-8 md:pb-4">
                    <button
                        onClick={() => {
                            const coords = routeBusinesses.map(b => `${b.coordinates.lat},${b.coordinates.lng}`).join('/');
                            window.open(`https://www.google.com/maps/dir/${coords}`, '_blank');
                        }}
                        className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Start Navigation
                    </button>
                </div>
            </div>
        );
    }

    // View: Selected Business Detail (Compact)
    const isMobile = selectedBusiness.phoneTypeOverride
        ? selectedBusiness.phoneTypeOverride === 'mobile'
        : isMobileProvider(selectedBusiness.provider, selectedBusiness.phone);

    return (
        <div className="bg-white rounded-t-[2rem] shadow-2xl relative">
            {/* Close Button Absolute */}
            <button onClick={onClose} className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center transition-colors">
                <X className="h-4 w-4" />
            </button>

            <div className="p-6 pb-8 md:pb-6">
                {/* Top Row: Icon + Info */}
                <div className="flex gap-4 items-start mb-6 pr-8">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-indigo-100">
                        <Landmark className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <ProviderBadge provider={selectedBusiness.provider} className="scale-90 origin-left shadow-sm" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 leading-none truncate mb-1">{selectedBusiness.name}</h2>
                        <p className="text-xs font-semibold text-slate-400 truncate">{selectedBusiness.address}, {selectedBusiness.town}</p>
                    </div>
                </div>

                {/* Phone Row (Compact) */}
                {selectedBusiness.phone && (
                    <div className="flex items-center justify-between py-2 px-1 mb-4 border-t border-b border-slate-50">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onTogglePhoneType?.(selectedBusiness.id, isMobile ? 'mobile' : 'landline')}
                                className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${isMobile ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
                                    }`}
                            >
                                {isMobile ? <Smartphone className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
                            </button>
                            <span className="text-sm font-black text-slate-700 font-mono tracking-tight">{selectedBusiness.phone}</span>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isMobile ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
                            }`}>
                            {isMobile ? 'Mobile' : 'Landline'}
                        </span>
                    </div>
                )}

                {/* Action Buttons (Big & Tappable) */}
                <div className="grid grid-cols-[1fr_auto] gap-3">
                    <button
                        onClick={() => isInRoute ? onRemoveFromRoute(selectedBusiness.id) : onAddToRoute(selectedBusiness.id)}
                        className={`h-14 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isInRoute
                            ? 'bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50'
                            : 'bg-indigo-600 text-white shadow-indigo-300/50 hover:bg-indigo-700'
                            }`}
                    >
                        {isInRoute ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {isInRoute ? 'Remove Stop' : 'Add to Route'}
                    </button>

                    <button
                        onClick={() => {
                            const mapsUrl = selectedBusiness.mapsLink && selectedBusiness.mapsLink.startsWith('http')
                                ? selectedBusiness.mapsLink
                                : `https://www.google.com/maps/search/?api=1&query=${selectedBusiness.coordinates.lat},${selectedBusiness.coordinates.lng}`;
                            window.open(mapsUrl, '_blank');
                        }}
                        className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-100 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                        title="Open in Google Maps"
                    >
                        <Globe className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

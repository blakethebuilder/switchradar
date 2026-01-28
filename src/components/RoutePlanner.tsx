import { MapPin, ExternalLink, X, Plus, Minus, Globe, Landmark, Smartphone, Trash2, Route } from 'lucide-react';
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

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                        <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-900 leading-tight">Business Info</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workspace Details</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar">
                {selectedBusiness ? (
                    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Selected Business Card */}
                        <div className="glass-card rounded-[2.5rem] overflow-hidden border-2 border-slate-100 shadow-xl shadow-slate-200/50">
                            <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedBusiness.name}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedBusiness.category}</p>
                                    </div>
                                    <ProviderBadge provider={selectedBusiness.provider} className="scale-125 origin-top-right font-black" />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                                            <MapPin className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div className="text-sm font-semibold text-slate-600 leading-relaxed pt-2">
                                            {selectedBusiness.address}
                                            <div className="text-indigo-600 font-bold uppercase tracking-wider text-[10px] mt-1">{selectedBusiness.town}</div>
                                        </div>
                                    </div>

                                    {selectedBusiness.phone && (
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => {
                                                    const isMobile = selectedBusiness.phoneTypeOverride
                                                        ? selectedBusiness.phoneTypeOverride === 'mobile'
                                                        : isMobileProvider(selectedBusiness.provider, selectedBusiness.phone);
                                                    onTogglePhoneType?.(selectedBusiness.id, isMobile ? 'mobile' : 'landline');
                                                }}
                                                className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95 ${(selectedBusiness.phoneTypeOverride ? selectedBusiness.phoneTypeOverride === 'mobile' : isMobileProvider(selectedBusiness.provider, selectedBusiness.phone))
                                                    ? 'bg-rose-50 text-rose-500'
                                                    : 'bg-emerald-50 text-emerald-500'
                                                    }`}
                                                title="Toggle Phone Type"
                                            >
                                                {(selectedBusiness.phoneTypeOverride ? selectedBusiness.phoneTypeOverride === 'mobile' : isMobileProvider(selectedBusiness.provider, selectedBusiness.phone))
                                                    ? <Smartphone className="h-5 w-5" />
                                                    : <Landmark className="h-5 w-5" />
                                                }
                                            </button>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900">{selectedBusiness.phone}</span>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {(selectedBusiness.phoneTypeOverride ? selectedBusiness.phoneTypeOverride === 'mobile' : isMobileProvider(selectedBusiness.provider, selectedBusiness.phone)) ? (
                                                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Mobile Device</span>
                                                    ) : (
                                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Fixed Landline</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => isInRoute ? onRemoveFromRoute(selectedBusiness.id) : onAddToRoute(selectedBusiness.id)}
                                        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-xs font-black tracking-widest transition-all ${isInRoute
                                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-lg shadow-emerald-200/50'
                                            }`}
                                    >
                                        {isInRoute ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                        {isInRoute ? 'REMOVE FROM ROUTE' : 'ADD TO VISIT ROUTE'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const mapsUrl = selectedBusiness.mapsLink && selectedBusiness.mapsLink.startsWith('http')
                                                ? selectedBusiness.mapsLink
                                                : `https://www.google.com/maps/search/?api=1&query=${selectedBusiness.coordinates.lat},${selectedBusiness.coordinates.lng}`;
                                            window.open(mapsUrl, '_blank');
                                        }}
                                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-slate-900 text-white text-xs font-black tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
                                    >
                                        <Globe className="h-4 w-4" />
                                        OPEN IN GOOGLE MAPS
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Route Section within Detail View */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Planned Route ({routeBusinesses.length})</h4>
                                {routeBusinesses.length > 0 && (
                                    <button onClick={onClearRoute} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700">Clear All</button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {routeBusinesses.map((b, idx) => (
                                    <div
                                        key={b.id}
                                        onClick={() => onSelectBusiness(b)}
                                        className={`group flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-pointer ${selectedBusiness.id === b.id
                                            ? 'bg-indigo-50 border-indigo-200 shadow-md translate-x-1'
                                            : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-slate-200/50'
                                            }`}
                                    >
                                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black ${selectedBusiness.id === b.id ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'
                                            }`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="text-xs font-bold text-slate-900 truncate">{b.name}</div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{b.town}</div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRemoveFromRoute(b.id); }}
                                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {routeBusinesses.length === 0 && (
                                    <div className="p-8 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                        <Route className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No stops added yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                        <div className="h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-6 text-slate-200 animate-pulse">
                            <MapPin className="h-10 w-10" />
                        </div>
                        <h3 className="text-base font-black text-slate-900">Select a Business</h3>
                        <p className="text-xs font-bold text-slate-400 mt-2 max-w-[200px] uppercase tracking-widest leading-loose">
                            Click on a pin on the map to see full details and manage visits
                        </p>
                    </div>
                )}
            </div>

            {routeBusinesses.length > 0 && (
                <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0">
                    <button
                        onClick={() => {
                            const coords = routeBusinesses.map(b => `${b.coordinates.lat},${b.coordinates.lng}`).join('/');
                            window.open(`https://www.google.com/maps/dir/${coords}`, '_blank');
                        }}
                        className="w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Start Navigating ({routeBusinesses.length} stops)
                    </button>
                </div>
            )}
        </div>
    );
};

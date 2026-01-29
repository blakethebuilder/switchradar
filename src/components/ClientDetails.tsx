import React, { useState } from 'react';
import { X, Plus, Minus, Globe, Smartphone, Landmark, MessageSquare, Phone, Smile, Frown, DollarSign, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Business } from '../types';
import { isMobileProvider } from '../utils/phoneUtils';
import { ProviderBadge } from './ProviderBadge';

interface ClientDetailsProps {
    business: Business;
    isInRoute: boolean;
    onAddToRoute: (id: string) => void;
    onRemoveFromRoute: (id: string) => void;
    onClose: () => void;
    onTogglePhoneType?: (id: string, currentType: 'landline' | 'mobile') => void;
    onUpdateBusiness: (id: string, updates: Partial<Business>) => void;
    // Navigation props
    allBusinesses?: Business[];
    currentIndex?: number;
    onNavigateToNext?: (business: Business) => void;
}

const INTEREST_OPTIONS = [
  { label: 'High Interest', icon: Smile, value: 'high', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { label: 'Low Interest', icon: Frown, value: 'low', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { label: 'Not Interested', icon: X, value: 'none', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
];

export const ClientDetails: React.FC<ClientDetailsProps> = ({
    business,
    isInRoute,
    onAddToRoute,
    onRemoveFromRoute,
    onClose,
    onTogglePhoneType,
    onUpdateBusiness,
    allBusinesses = [],
    currentIndex = 0,
    onNavigateToNext
}) => {
    const isMobile = business.phoneTypeOverride
        ? business.phoneTypeOverride === 'mobile'
        : isMobileProvider(business.provider, business.phone);
    
    // Internal state for notes
    const [notes, setNotes] = useState(business.notes.join('\n'));
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveNotes = async () => {
        setIsSaving(true);
        const newNotesArray = notes.split('\n').filter(n => n.trim() !== '');
        await onUpdateBusiness(business.id, { notes: newNotesArray });
        setIsSaving(false);
    };

    const handleUpdateSimpleStatus = async (key: keyof Business, value: string) => {
        await onUpdateBusiness(business.id, { [key]: value });
    };

    const handleUpdateInterest = async (interest: string) => {
        await onUpdateBusiness(business.id, { metadata: { ...business.metadata, interest } });
    };

    // Navigation functions
    const canNavigatePrev = allBusinesses.length > 1 && currentIndex > 0;
    const canNavigateNext = allBusinesses.length > 1 && currentIndex < allBusinesses.length - 1;

    const handleNavigatePrev = () => {
        if (canNavigatePrev && onNavigateToNext) {
            const prevBusiness = allBusinesses[currentIndex - 1];
            onNavigateToNext(prevBusiness);
        }
    };

    const handleNavigateNext = () => {
        if (canNavigateNext && onNavigateToNext) {
            const nextBusiness = allBusinesses[currentIndex + 1];
            onNavigateToNext(nextBusiness);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="p-6 pb-4 border-b border-slate-100 shrink-0">
                <div className="flex justify-between items-center mb-4">
                    {/* Navigation buttons */}
                    <div className="flex items-center gap-2">
                        {allBusinesses.length > 1 && (
                            <>
                                <button
                                    onClick={handleNavigatePrev}
                                    disabled={!canNavigatePrev}
                                    className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Previous client"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="text-xs font-bold text-slate-400 px-2">
                                    {currentIndex + 1} of {allBusinesses.length}
                                </span>
                                <button
                                    onClick={handleNavigateNext}
                                    disabled={!canNavigateNext}
                                    className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Next client"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={onClose} 
                        className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                
                
                <div className="flex gap-4 items-start">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-indigo-100">
                        <Landmark className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <ProviderBadge provider={business.provider} className="scale-90 origin-left shadow-sm" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 leading-none truncate mb-1">{business.name}</h2>
                        <p className="text-xs font-semibold text-slate-400 truncate">{business.address}, {business.town}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Contact and Add to Route */}
                <div className="space-y-3">
                    {business.phone && (
                        <div className="flex items-center justify-between py-2 px-1 border-t border-b border-slate-50">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onTogglePhoneType?.(business.id, isMobile ? 'mobile' : 'landline')}
                                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${isMobile ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}
                                >
                                    {isMobile ? <Smartphone className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
                                </button>
                                <span className="text-sm font-black text-slate-700 font-mono tracking-tight">{business.phone}</span>
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isMobile ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                {isMobile ? 'Mobile' : 'Landline'}
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-[1fr_auto] gap-3">
                        <button
                            onClick={() => isInRoute ? onRemoveFromRoute(business.id) : onAddToRoute(business.id)}
                            className={`h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isInRoute
                                ? 'bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50'
                                : 'bg-indigo-600 text-white shadow-indigo-300/50 hover:bg-indigo-700'
                                }`}
                        >
                            {isInRoute ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {isInRoute ? 'Remove Stop' : 'Add to Route'}
                        </button>

                        <button
                            onClick={() => {
                                const mapsUrl = business.mapsLink && business.mapsLink.startsWith('http')
                                    ? business.mapsLink
                                    : `https://www.google.com/maps/search/?api=1&query=${business.coordinates.lat},${business.coordinates.lng}`;
                                window.open(mapsUrl, '_blank');
                            }}
                            className="h-12 w-12 flex items-center justify-center rounded-xl bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-100 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                            title="Open in Google Maps"
                        >
                            <Globe className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Status Section */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        CONTACT STATUS
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {['active', 'contacted', 'converted', 'inactive'].map(status => (
                            <button
                                key={status}
                                onClick={() => handleUpdateSimpleStatus('status', status)}
                                className={`flex items-center justify-center h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    business.status === status
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300/50'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Interest Section */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />
                        PROSPECT INTEREST
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        {INTEREST_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                onClick={() => handleUpdateInterest(option.value)}
                                className={`flex flex-col items-center justify-center p-2 h-16 rounded-xl transition-all ${
                                    business.metadata?.interest === option.value
                                        ? `bg-white border-2 ${option.border} ${option.color} shadow-lg shadow-slate-200/50`
                                        : `bg-white/50 border border-slate-100 text-slate-400 hover:bg-white`
                                }`}
                            >
                                <option.icon className={`h-5 w-5 mb-1 ${business.metadata?.interest === option.value ? option.color : 'text-slate-400'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${business.metadata?.interest === option.value ? option.color : 'text-slate-600'}`}>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" />
                        NOTES
                    </h3>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add call/visit notes here..."
                        rows={6}
                        className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:border-indigo-500/50 transition-colors"
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveNotes}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            {isSaving ? 'Saving...' : 'Save Notes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

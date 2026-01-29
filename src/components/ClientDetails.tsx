import React, { useState } from 'react';
import { X, Plus, Minus, Globe, Smartphone, Landmark, MessageSquare, Phone, Smile, Frown, DollarSign, CheckCircle2, Loader2, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Clock, User, FileText, PhoneCall, MapPin, Calendar, Lightbulb } from 'lucide-react';
import type { Business, NoteEntry } from '../types';
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

const NOTE_CATEGORIES = [
  { value: 'call', label: 'Call Notes', icon: PhoneCall, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'visit', label: 'Visit Notes', icon: MapPin, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'follow-up', label: 'Follow-up', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'issue', label: 'Issue', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  { value: 'opportunity', label: 'Opportunity', icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { value: 'general', label: 'General', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50' },
] as const;

const NOTE_TEMPLATES = {
  call: [
    "Called - no answer, will try again later",
    "Spoke with [name] - interested in switching",
    "Not interested at this time",
    "Requested callback at [time]",
    "Left voicemail message"
  ],
  visit: [
    "Visited location - spoke with manager",
    "Business closed - will return during business hours",
    "Positive reception - scheduled follow-up",
    "Not the decision maker - got contact details"
  ],
  'follow-up': [
    "Schedule follow-up call in 1 week",
    "Send information packet",
    "Waiting for current contract to expire",
    "Requested quote comparison"
  ],
  issue: [
    "Experiencing connectivity issues with current provider",
    "Billing disputes with current provider",
    "Poor customer service from current provider",
    "Service outages affecting business"
  ],
  opportunity: [
    "Expanding business - needs additional lines",
    "Unhappy with current pricing",
    "Contract expiring soon",
    "Looking for better service package"
  ],
  general: [
    "Initial contact made",
    "Information gathered",
    "Positive interaction",
    "Needs more time to decide"
  ]
};

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
    
    // Rich notes state
    const [newNoteContent, setNewNoteContent] = useState('');
    const [selectedNoteCategory, setSelectedNoteCategory] = useState<'call' | 'visit' | 'follow-up' | 'general' | 'issue' | 'opportunity'>('general');
    const [showTemplates, setShowTemplates] = useState(false);
    
    // Enhanced contact status state
    const [contactStatusExpanded, setContactStatusExpanded] = useState(false);

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

    const handleUpdateMetadata = async (key: keyof BusinessMetadata, value: any) => {
        await onUpdateBusiness(business.id, { metadata: { ...business.metadata, [key]: value } });
    };

    const handleAddRichNote = async () => {
        if (!newNoteContent.trim()) return;
        
        const newNote: NoteEntry = {
            id: Date.now().toString(),
            content: newNoteContent.trim(),
            category: selectedNoteCategory,
            timestamp: new Date()
        };
        
        const currentRichNotes = business.richNotes || [];
        await onUpdateBusiness(business.id, { 
            richNotes: [...currentRichNotes, newNote] 
        });
        
        setNewNoteContent('');
        setShowTemplates(false);
    };

    const handleUseTemplate = (template: string) => {
        setNewNoteContent(template);
        setShowTemplates(false);
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
                    
                    {/* Big Issue Buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                            onClick={() => handleUpdateMetadata('hasIssues', true)}
                            className={`flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                                business.metadata?.hasIssues === true
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-300/50'
                                    : 'bg-white text-red-600 border-2 border-red-200 hover:bg-red-50'
                            }`}
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Issues
                        </button>
                        <button
                            onClick={() => handleUpdateMetadata('hasIssues', false)}
                            className={`flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                                business.metadata?.hasIssues === false
                                    ? 'bg-green-600 text-white shadow-lg shadow-green-300/50'
                                    : 'bg-white text-green-600 border-2 border-green-200 hover:bg-green-50'
                            }`}
                        >
                            <CheckCircle className="h-4 w-4" />
                            No Issues
                        </button>
                    </div>

                    {/* Traditional Status Buttons */}
                    <div className="grid grid-cols-1 gap-2">
                        {['active', 'contacted', 'converted', 'inactive'].map(status => (
                            <button
                                key={status}
                                onClick={() => handleUpdateSimpleStatus('status', status)}
                                className={`flex items-center justify-center h-9 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    business.status === status
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300/50'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Enhanced Contact Fields */}
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                        {/* Active on Current Provider */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">Active on Current Provider</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleUpdateMetadata('isActiveOnCurrentProvider', true)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        business.metadata?.isActiveOnCurrentProvider === true
                                            ? 'bg-green-600 text-white'
                                            : 'bg-slate-200 text-slate-600 hover:bg-green-100'
                                    }`}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => handleUpdateMetadata('isActiveOnCurrentProvider', false)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        business.metadata?.isActiveOnCurrentProvider === false
                                            ? 'bg-red-600 text-white'
                                            : 'bg-slate-200 text-slate-600 hover:bg-red-100'
                                    }`}
                                >
                                    No
                                </button>
                            </div>
                        </div>

                        {/* Changed Provider */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">Changed Provider</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleUpdateMetadata('hasChangedProvider', true)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        business.metadata?.hasChangedProvider === true
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-200 text-slate-600 hover:bg-blue-100'
                                    }`}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => handleUpdateMetadata('hasChangedProvider', false)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        business.metadata?.hasChangedProvider === false
                                            ? 'bg-slate-600 text-white'
                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                    }`}
                                >
                                    No
                                </button>
                            </div>
                        </div>

                        {/* Length with Current Provider */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600">Length with Current Provider</label>
                            <input
                                type="text"
                                value={business.metadata?.lengthWithCurrentProvider || ''}
                                onChange={(e) => handleUpdateMetadata('lengthWithCurrentProvider', e.target.value)}
                                placeholder="e.g., 2 years, 6 months"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-indigo-500/50 transition-colors"
                            />
                        </div>

                        {/* Can We Contact You */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600">Can We Contact You?</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleUpdateMetadata('canContact', true)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        business.metadata?.canContact === true
                                            ? 'bg-green-600 text-white'
                                            : 'bg-slate-200 text-slate-600 hover:bg-green-100'
                                    }`}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => handleUpdateMetadata('canContact', false)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        business.metadata?.canContact === false
                                            ? 'bg-red-600 text-white'
                                            : 'bg-slate-200 text-slate-600 hover:bg-red-100'
                                    }`}
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interest Section */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />
                        PROSPECT INTEREST
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {INTEREST_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                onClick={() => handleUpdateInterest(option.value)}
                                className={`flex items-center justify-center gap-2 p-3 h-12 rounded-xl transition-all ${
                                    business.metadata?.interest === option.value
                                        ? `bg-white border-2 ${option.border} ${option.color} shadow-lg shadow-slate-200/50`
                                        : `bg-white/50 border border-slate-100 text-slate-400 hover:bg-white`
                                }`}
                            >
                                <option.icon className={`h-4 w-4 ${business.metadata?.interest === option.value ? option.color : 'text-slate-400'}`} />
                                <span className={`text-xs font-black uppercase tracking-widest ${business.metadata?.interest === option.value ? option.color : 'text-slate-600'}`}>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Enhanced Notes Section */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" />
                        NOTES
                    </h3>

                    {/* Rich Notes Display */}
                    {business.richNotes && business.richNotes.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {business.richNotes.map((note) => {
                                const category = NOTE_CATEGORIES.find(cat => cat.value === note.category);
                                return (
                                    <div key={note.id} className="p-3 bg-white rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-2 mb-1">
                                            {category && <category.icon className={`h-3 w-3 ${category.color}`} />}
                                            <span className={`text-xs font-bold uppercase tracking-wider ${category?.color || 'text-slate-600'}`}>
                                                {category?.label || 'General'}
                                            </span>
                                            <span className="text-xs text-slate-400 ml-auto">
                                                {new Date(note.timestamp).toLocaleDateString()} {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-700">{note.content}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add New Note */}
                    <div className="space-y-3 p-3 bg-white rounded-lg border border-slate-200">
                        {/* Category Selection */}
                        <div className="flex flex-wrap gap-1">
                            {NOTE_CATEGORIES.map((category) => (
                                <button
                                    key={category.value}
                                    onClick={() => setSelectedNoteCategory(category.value)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                                        selectedNoteCategory === category.value
                                            ? `${category.bg} ${category.color} border border-current`
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    <category.icon className="h-3 w-3" />
                                    {category.label}
                                </button>
                            ))}
                        </div>

                        {/* Note Input */}
                        <textarea
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder={`Add ${NOTE_CATEGORIES.find(c => c.value === selectedNoteCategory)?.label.toLowerCase()} note...`}
                            rows={3}
                            className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium focus:border-indigo-500/50 transition-colors resize-none"
                        />

                        {/* Templates and Actions */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setShowTemplates(!showTemplates)}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                                {showTemplates ? 'Hide Templates' : 'Quick Templates'}
                            </button>
                            <button
                                onClick={handleAddRichNote}
                                disabled={!newNoteContent.trim()}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="h-3 w-3" />
                                Add Note
                            </button>
                        </div>

                        {/* Templates */}
                        {showTemplates && NOTE_TEMPLATES[selectedNoteCategory] && (
                            <div className="space-y-1 pt-2 border-t border-slate-200">
                                <p className="text-xs font-bold text-slate-600 mb-2">Quick Templates:</p>
                                {NOTE_TEMPLATES[selectedNoteCategory].map((template, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleUseTemplate(template)}
                                        className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition-colors"
                                    >
                                        {template}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Legacy Notes (for backward compatibility) */}
                    {business.notes.length > 0 && business.notes.some(note => note.trim()) && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500">Legacy Notes:</h4>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add call/visit notes here..."
                                rows={4}
                                className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium focus:border-indigo-500/50 transition-colors"
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-600 text-white text-xs font-bold hover:bg-slate-700 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                    {isSaving ? 'Saving...' : 'Save Legacy Notes'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Phone, Mail, MapPin, Building2, Smartphone, Landmark, MessageSquare, Route, Trash2, DollarSign, AlertTriangle, CheckCircle, Loader2, Plus, Smile, Frown, PhoneCall, Calendar, Lightbulb, FileText, ExternalLink, Eye } from 'lucide-react';
import type { Business, NoteEntry, BusinessMetadata } from '../types';
import { isMobileProvider } from '../utils/phoneUtils';
import { ProviderBadge } from './ProviderBadge';

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

interface ClientDetailsToolbarProps {
  business: Business;
  isInRoute: boolean;
  onAddToRoute: (id: string) => void;
  onRemoveFromRoute: (id: string) => void;
  onClose: () => void;
  onTogglePhoneType?: (id: string, currentType: 'landline' | 'mobile') => void;
  onUpdateBusiness: (id: string, updates: Partial<Business>) => void;
  onDelete?: (id: string) => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

export const ClientDetailsToolbar: React.FC<ClientDetailsToolbarProps> = ({
  business,
  isInRoute,
  onAddToRoute,
  onRemoveFromRoute,
  onClose,
  onTogglePhoneType,
  onUpdateBusiness,
  onDelete,
  onNavigateNext,
  onNavigatePrev,
  currentIndex,
  totalCount
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<'call' | 'visit' | 'follow-up' | 'general' | 'issue' | 'opportunity'>('general');
  const [showTemplates, setShowTemplates] = useState(false);
  
  const isMobile = business.phoneTypeOverride
    ? business.phoneTypeOverride === 'mobile'
    : isMobileProvider(business.provider, business.phone);

  const handleUpdateInterest = async (interest: string) => {
    setIsUpdating(`interest-${interest}`);
    try {
      await onUpdateBusiness(business.id, { metadata: { ...business.metadata, interest } });
      setTimeout(() => setIsUpdating(null), 300);
    } catch (error) {
      setIsUpdating(null);
    }
  };

  const handleUpdateMetadata = async (key: keyof BusinessMetadata, value: any) => {
    setIsUpdating(`metadata-${key}-${value}`);
    try {
      await onUpdateBusiness(business.id, { metadata: { ...business.metadata, [key]: value } });
      setTimeout(() => setIsUpdating(null), 300);
    } catch (error) {
      setIsUpdating(null);
    }
  };

  // Debounced text input handler to prevent excessive API calls
  const [textInputValues, setTextInputValues] = useState<Record<string, string>>({
    lengthWithCurrentProvider: business.metadata?.lengthWithCurrentProvider || '',
    ispProvider: business.metadata?.ispProvider || '',
    pabxProvider: business.metadata?.pabxProvider || ''
  });

  // Debounce timer ref
  const debounceTimerRef = React.useRef<Record<string, number>>({});

  const handleUpdateTextMetadata = (key: keyof BusinessMetadata, value: string) => {
    // Update local state immediately for responsive UI
    setTextInputValues(prev => ({ ...prev, [key]: value }));
    
    // Clear existing timer for this field
    if (debounceTimerRef.current[key]) {
      clearTimeout(debounceTimerRef.current[key]);
    }
    
    // Set new timer to update server after user stops typing
    debounceTimerRef.current[key] = setTimeout(async () => {
      try {
        await onUpdateBusiness(business.id, { metadata: { ...business.metadata, [key]: value } });
      } catch (error) {
        console.error('Error updating metadata:', error);
        // Revert local state on error
        setTextInputValues(prev => ({ 
          ...prev, 
          [key]: String(business.metadata?.[key] || '') 
        }));
      }
    }, 1000); // 1 second delay
  };

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      Object.values(debounceTimerRef.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // Update local state when business prop changes
  React.useEffect(() => {
    setTextInputValues({
      lengthWithCurrentProvider: business.metadata?.lengthWithCurrentProvider || '',
      ispProvider: business.metadata?.ispProvider || '',
      pabxProvider: business.metadata?.pabxProvider || ''
    });
  }, [business.metadata?.lengthWithCurrentProvider, business.metadata?.ispProvider, business.metadata?.pabxProvider]);

  const handleAddRichNote = async () => {
    if (!newNoteContent.trim()) return;
    
    setIsUpdating('add-note');
    try {
      const newNote: NoteEntry = {
        id: Date.now().toString(),
        content: newNoteContent.trim(),
        category: selectedNoteCategory,
        timestamp: new Date()
      };
      
      const currentRichNotes = business.richNotes || [];
      
      // Update business with new note
      await onUpdateBusiness(business.id, { 
        richNotes: [...currentRichNotes, newNote] 
      });
      
      setNewNoteContent('');
      setShowTemplates(false);
      
      // Show success feedback
      setTimeout(() => {
        setIsUpdating(null);
      }, 500);
    } catch (error) {
      console.error('❌ Failed to add note:', error);
      setIsUpdating(null);
    }
  };

  const handleUseTemplate = (template: string) => {
    setNewNoteContent(template);
    setShowTemplates(false);
  };

  return (
    <>
      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-[1000] bg-white border-t border-slate-200 shadow-2xl">
        {/* Collapsed State - Mobile-Optimized Business Info Bar */}
        <div className="px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Business Info - Mobile-First Layout */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Mobile: Single line with name + notes */}
                <div className="md:hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 truncate text-sm">
                      {business.name}
                    </h3>
                    {business.richNotes && business.richNotes.length > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 flex-shrink-0">
                        {business.richNotes.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <ProviderBadge provider={business.provider} className="scale-75 origin-left flex-shrink-0" />
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 truncate">{business.town}</span>
                  </div>
                </div>

                {/* Desktop: Multi-line layout */}
                <div className="hidden md:block">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 truncate text-sm">
                      {business.name}
                    </h3>
                    {business.richNotes && business.richNotes.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 flex-shrink-0">
                        {business.richNotes.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-slate-600 font-medium mb-1 truncate">
                    {business.category}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs">
                    <ProviderBadge provider={business.provider} className="scale-75 origin-left flex-shrink-0" />
                    {business.phone && (
                      <>
                        <span className="text-slate-400">•</span>
                        <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-600 font-medium">{business.phone}</span>
                      </>
                    )}
                    <span className="text-slate-400">•</span>
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500 truncate">{business.town}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - Mobile Optimized */}
            <div className="flex items-center gap-1">
              {/* Call Button */}
              {business.phone && (
                  <a
                   href={`tel:${business.phone}`}
                   className="p-2.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                   title="Call"
                 >
                   <Phone className="w-4 h-4" />
                 </a>
              )}

              {/* Google Maps Button */}
              {business.mapsLink ? (
                <a
                  href={business.mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 md:p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  title="Open in Google Maps"
                >
                  <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />
                </a>
              ) : (
                  <a
                   href={business.mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address + ', ' + business.town + ', ' + business.province)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="p-2.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                   title="Open in Google Maps"
                 >
                   <ExternalLink className="w-4 h-4" />
                 </a>
              )}

               <button
                   onClick={(e) => {
                     e.stopPropagation();
                     isInRoute ? onRemoveFromRoute(business.id) : onAddToRoute(business.id);
                   }}
                   className={`p-2.5 rounded-lg transition-colors ${
                     isInRoute
                       ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                       : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                   }`}
                   title={isInRoute ? "Remove from Route" : "Add to Route"}
                 >
                   <Route className="w-4 h-4" />
                 </button>

               {/* Navigation Controls - Hidden on small mobile */}
               {onNavigateNext && onNavigatePrev && totalCount && totalCount > 1 && (
                 <div className="hidden sm:flex items-center bg-slate-50 rounded-lg overflow-hidden ml-1">
                   <button
                     onClick={onNavigatePrev}
                     className="p-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                     title="Previous Business"
                   >
                     <ChevronLeft className="w-4 h-4" />
                   </button>
                   <div className="px-2 py-1 text-xs font-bold text-slate-600 bg-slate-100">
                     {currentIndex !== undefined ? `${currentIndex + 1}/${totalCount}` : 'Nav'}
                   </div>
                   <button
                     onClick={onNavigateNext}
                     className="p-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                     title="Next Business"
                   >
                     <ChevronRight className="w-4 h-4" />
                   </button>
                 </div>
               )}
               
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
               
               {/* Close Button */}
               <button
                 onClick={onClose}
                 className="p-2.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                 title="Close"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>

        {/* Expanded State - Full Details */}
        {isExpanded && (
          <div className="border-t border-slate-100 bg-slate-50">
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Contact Information */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact Information
                  </h4>
                  
                  <div className="space-y-3">
                    {business.phone && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onTogglePhoneType?.(business.id, isMobile ? 'mobile' : 'landline')}
                            className={`p-2 rounded-lg transition-all ${
                              isMobile ? 'text-rose-500 bg-rose-50' : 'text-emerald-500 bg-emerald-50'
                            }`}
                            title={`Switch to ${isMobile ? 'Landline' : 'Cellphone'}`}
                          >
                            {isMobile ? <Smartphone className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                          </button>
                          <div>
                            <p className="font-medium text-slate-900">{business.phone}</p>
                            <p className="text-xs text-slate-500">{isMobile ? 'Mobile' : 'Landline'}</p>
                          </div>
                        </div>
                        <a
                          href={`tel:${business.phone}`}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          Call
                        </a>
                      </div>
                    )}

                    {business.email && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <p className="text-slate-700">{business.email}</p>
                        </div>
                        <a
                          href={`mailto:${business.email}`}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Email
                        </a>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-slate-700">{business.address}</p>
                        <p className="text-xs text-slate-500">{business.town}, {business.province}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Details */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Business Details
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Category</p>
                      <p className="text-slate-900 font-medium">{business.category}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</p>
                      <p className="text-slate-900 font-medium capitalize">{business.status}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Status Section */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact Status
                  </h4>
                  
                  {/* Big Issue Buttons - Fixed Radio Button Behavior */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => handleUpdateMetadata('hasIssues', business.metadata?.hasIssues === true ? null : true)}
                      disabled={isUpdating === 'metadata-hasIssues-true'}
                      className={`flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold uppercase tracking-wider transition-all transform active:scale-95 relative ${
                        isUpdating === 'metadata-hasIssues-true'
                          ? 'bg-red-500 text-white scale-95 animate-pulse'
                          : business.metadata?.hasIssues === true
                          ? 'bg-red-600 text-white shadow-lg shadow-red-300/50 hover:shadow-red-400/60 hover:bg-red-700'
                          : 'bg-white text-red-600 border-2 border-red-200 hover:bg-red-50 hover:border-red-300 hover:shadow-md'
                      }`}
                    >
                      {business.metadata?.hasIssues === true && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                      )}
                      {isUpdating === 'metadata-hasIssues-true' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      Issues
                    </button>
                    <button
                      onClick={() => handleUpdateMetadata('hasIssues', business.metadata?.hasIssues === false ? null : false)}
                      disabled={isUpdating === 'metadata-hasIssues-false'}
                      className={`flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold uppercase tracking-wider transition-all transform active:scale-95 relative ${
                        isUpdating === 'metadata-hasIssues-false'
                          ? 'bg-green-500 text-white scale-95 animate-pulse'
                          : business.metadata?.hasIssues === false
                          ? 'bg-green-600 text-white shadow-lg shadow-green-300/50 hover:shadow-green-400/60 hover:bg-green-700'
                          : 'bg-white text-green-600 border-2 border-green-200 hover:bg-green-50 hover:border-green-300 hover:shadow-md'
                      }`}
                    >
                      {business.metadata?.hasIssues === false && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                      {isUpdating === 'metadata-hasIssues-false' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      No Issues
                    </button>
                  </div>
                  
                  {/* Manual Seen Button */}
                  <div className="pt-3 border-t border-slate-200">
                    <button
                      onClick={() => handleUpdateMetadata('isManuallySeen', business.metadata?.isManuallySeen === true ? null : true)}
                      disabled={isUpdating === 'metadata-isManuallySeen'}
                      className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold transition-all transform active:scale-95 relative ${
                        isUpdating === 'metadata-isManuallySeen'
                          ? 'bg-slate-300 text-slate-600 scale-95 animate-pulse'
                          : business.metadata?.isManuallySeen === true
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300/50 hover:bg-indigo-700'
                          : 'bg-white text-indigo-600 border-2 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-md'
                      }`}
                    >
                      {business.metadata?.isManuallySeen === true && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full border-2 border-white"></div>
                      )}
                      {isUpdating === 'metadata-isManuallySeen' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {business.metadata?.isManuallySeen === true ? 'Marked Seen' : 'Mark as Seen Manually'}
                    </button>
                  </div>
                  
                  {/* Enhanced Contact Fields */}
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    {/* Active on Current Provider */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Active on Current Provider</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleUpdateMetadata('isActiveOnCurrentProvider', business.metadata?.isActiveOnCurrentProvider === true ? null : true)}
                          disabled={isUpdating === 'metadata-isActiveOnCurrentProvider-true'}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all transform active:scale-95 relative ${
                            isUpdating === 'metadata-isActiveOnCurrentProvider-true'
                              ? 'bg-green-500 text-white scale-95 animate-pulse'
                              : business.metadata?.isActiveOnCurrentProvider === true
                              ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                              : 'bg-slate-200 text-slate-600 hover:bg-green-100 hover:text-green-700'
                          }`}
                        >
                          {business.metadata?.isActiveOnCurrentProvider === true && (
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white"></div>
                          )}
                          {isUpdating === 'metadata-isActiveOnCurrentProvider-true' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Yes'
                          )}
                        </button>
                        <button
                          onClick={() => handleUpdateMetadata('isActiveOnCurrentProvider', business.metadata?.isActiveOnCurrentProvider === false ? null : false)}
                          disabled={isUpdating === 'metadata-isActiveOnCurrentProvider-false'}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all transform active:scale-95 relative ${
                            isUpdating === 'metadata-isActiveOnCurrentProvider-false'
                              ? 'bg-red-500 text-white scale-95 animate-pulse'
                              : business.metadata?.isActiveOnCurrentProvider === false
                              ? 'bg-red-600 text-white shadow-md hover:bg-red-700'
                              : 'bg-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-700'
                          }`}
                        >
                          {business.metadata?.isActiveOnCurrentProvider === false && (
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 rounded-full border border-white"></div>
                          )}
                          {isUpdating === 'metadata-isActiveOnCurrentProvider-false' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'No'
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Length with Current Provider - Fixed Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600">Length with Current Provider</label>
                      <input
                        type="text"
                        value={textInputValues.lengthWithCurrentProvider}
                        onChange={(e) => handleUpdateTextMetadata('lengthWithCurrentProvider', e.target.value)}
                        placeholder="e.g., 2 years, 6 months"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors bg-white"
                      />
                    </div>

                    {/* ISP Provider */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600">ISP Provider</label>
                      <input
                        type="text"
                        value={textInputValues.ispProvider}
                        onChange={(e) => handleUpdateTextMetadata('ispProvider', e.target.value)}
                        placeholder="e.g., Telkom, Vodacom, MTN"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors bg-white"
                      />
                    </div>

                    {/* PABX Provider */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600">PABX Provider</label>
                      <input
                        type="text"
                        value={textInputValues.pabxProvider}
                        onChange={(e) => handleUpdateTextMetadata('pabxProvider', e.target.value)}
                        placeholder="e.g., Panasonic, Avaya, Cisco"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors bg-white"
                      />
                    </div>

                    {/* Can We Contact You */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Can We Contact You?</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleUpdateMetadata('canContact', business.metadata?.canContact === true ? null : true)}
                          disabled={isUpdating === 'metadata-canContact-true'}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all transform active:scale-95 relative ${
                            isUpdating === 'metadata-canContact-true'
                              ? 'bg-green-500 text-white scale-95 animate-pulse'
                              : business.metadata?.canContact === true
                              ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                              : 'bg-slate-200 text-slate-600 hover:bg-green-100 hover:text-green-700'
                          }`}
                        >
                          {business.metadata?.canContact === true && (
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white"></div>
                          )}
                          {isUpdating === 'metadata-canContact-true' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Yes'
                          )}
                        </button>
                        <button
                          onClick={() => handleUpdateMetadata('canContact', business.metadata?.canContact === false ? null : false)}
                          disabled={isUpdating === 'metadata-canContact-false'}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all transform active:scale-95 relative ${
                            isUpdating === 'metadata-canContact-false'
                              ? 'bg-red-500 text-white scale-95 animate-pulse'
                              : business.metadata?.canContact === false
                              ? 'bg-red-600 text-white shadow-md hover:bg-red-700'
                              : 'bg-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-700'
                          }`}
                        >
                          {business.metadata?.canContact === false && (
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 rounded-full border border-white"></div>
                          )}
                          {isUpdating === 'metadata-canContact-false' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'No'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Notes Section */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Notes
                    </h4>
                  </div>
                  
                  {/* Rich Notes Display */}
                  {business.richNotes && business.richNotes.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                      {business.richNotes.map((note) => {
                        const category = NOTE_CATEGORIES.find(cat => cat.value === note.category);
                        return (
                          <div key={note.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
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
                  <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
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
                        disabled={!newNoteContent.trim() || isUpdating === 'add-note'}
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition-all transform active:scale-95 ${
                          isUpdating === 'add-note'
                            ? 'bg-indigo-500 text-white scale-95 animate-pulse'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isUpdating === 'add-note' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        {isUpdating === 'add-note' ? 'Adding...' : 'Add Note'}
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
                            className="w-full text-left p-2 rounded-lg bg-white hover:bg-slate-100 text-xs text-slate-700 transition-colors"
                          >
                            {template}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Business Interest Section */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Business Interest
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {INTEREST_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleUpdateInterest(option.value)}
                        disabled={isUpdating === `interest-${option.value}`}
                        className={`flex items-center justify-center gap-2 p-3 h-12 rounded-xl transition-all transform active:scale-95 relative ${
                          isUpdating === `interest-${option.value}`
                            ? `bg-slate-300 text-slate-600 scale-95 animate-pulse`
                            : business.metadata?.interest === option.value
                            ? `bg-white border-2 ${option.border} ${option.color} shadow-lg shadow-slate-200/50 hover:shadow-lg ring-1 ring-current`
                            : `bg-white/50 border border-slate-100 text-slate-400 hover:bg-white hover:border-slate-200 hover:shadow-md`
                        }`}
                      >
                        {business.metadata?.interest === option.value && (
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${option.color === 'text-emerald-600' ? 'bg-emerald-500' : option.color === 'text-yellow-600' ? 'bg-yellow-500' : 'bg-rose-500'}`}></div>
                        )}
                        {isUpdating === `interest-${option.value}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <option.icon className={`h-4 w-4 ${business.metadata?.interest === option.value ? option.color : 'text-slate-400'}`} />
                        )}
                        <span className={`text-xs font-bold uppercase tracking-widest ${business.metadata?.interest === option.value ? option.color : 'text-slate-600'}`}>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          isInRoute ? onRemoveFromRoute(business.id) : onAddToRoute(business.id);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                          isInRoute
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        <Route className="w-4 h-4" />
                        {isInRoute ? 'Remove from Route' : 'Add to Route'}
                      </button>
                      
                      {onDelete && (
                        <button
                          onClick={() => onDelete(business.id)}
                          className="px-4 py-3 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-[999]"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
};

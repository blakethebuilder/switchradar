import React, { useState, useMemo } from 'react';
import { Building2, Mail, Map, Trash2, Landmark, Smartphone, Route, CheckSquare, Square } from 'lucide-react';
import type { Business } from '../types';
import { ProviderBadge } from './ProviderBadge';
import { isMobileProvider } from '../utils/phoneUtils';

interface MobileBusinessListProps {
  businesses: Business[];
  onBusinessSelect?: (business: Business) => void;
  onDelete?: (id: string) => void;
  onTogglePhoneType?: (id: string, currentType: 'landline' | 'mobile') => void;
  onAddToRoute?: (id: string) => void;
  selectedBusinessIds: string[];
  onSelectBusiness: (businessId: string, isSelected: boolean) => void;
}

export const MobileBusinessList: React.FC<MobileBusinessListProps> = ({
  businesses,
  onBusinessSelect,
  onDelete,
  onTogglePhoneType,
  onAddToRoute,
  selectedBusinessIds,
  onSelectBusiness
}) => {
  const [visibleCount, setVisibleCount] = useState(20);
  
  // Only render visible items for performance
  const visibleBusinesses = useMemo(() => 
    businesses.slice(0, visibleCount), 
    [businesses, visibleCount]
  );

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + 20, businesses.length));
  };

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
          <Building2 className="w-10 h-10 opacity-20" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No results found</h3>
        <p className="max-w-xs text-center text-sm font-medium">Try adjusting your search or filters to find what you're looking for.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleBusinesses.map((business) => {
        const isMobile = business.phoneTypeOverride
          ? business.phoneTypeOverride === 'mobile'
          : isMobileProvider(business.provider);
        const isSelected = selectedBusinessIds.includes(business.id);
        
        return (
          <div
            key={business.id}
            className={`bg-white rounded-2xl border border-slate-200 p-4 transition-all ${
              isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : 'hover:shadow-md'
            }`}
          >
            {/* Header Row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBusiness(business.id, !isSelected);
                  }}
                  className="mt-1 flex-shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-400" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div 
                    className="cursor-pointer"
                    onClick={() => onBusinessSelect?.(business)}
                  >
                    <h3 className="text-base font-bold text-slate-900 leading-tight mb-1 truncate">
                      {business.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {business.category}
                      </span>
                      <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                      <span className="text-xs font-bold text-indigo-600 uppercase">
                        {business.town}
                      </span>
                    </div>
                  </div>
                  
                  {/* Provider Badge */}
                  <div className="mb-3">
                    <ProviderBadge provider={business.provider} className="scale-90 origin-left" />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            {(business.phone || business.email) && (
              <div className="space-y-2 mb-3 pl-8">
                {business.phone && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePhoneType?.(business.id, isMobile ? 'mobile' : 'landline');
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        isMobile ? 'text-rose-500 bg-rose-50' : 'text-emerald-500 bg-emerald-50'
                      }`}
                      title={`Switch to ${isMobile ? 'Landline' : 'Cellphone'}`}
                    >
                      {isMobile ? <Smartphone className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                    </button>
                    <a 
                      href={`tel:${business.phone}`}
                      className="text-sm font-medium text-slate-700 hover:text-indigo-600"
                    >
                      {business.phone}
                    </a>
                  </div>
                )}
                {business.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a 
                      href={`mailto:${business.email}`}
                      className="text-sm text-slate-600 hover:text-indigo-600 truncate"
                    >
                      {business.email}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Address */}
            <div className="text-xs text-slate-500 mb-3 pl-8 line-clamp-2">
              {business.address}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onBusinessSelect?.(business); 
                }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              >
                <Map className="w-4 h-4" />
                Map
              </button>
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onAddToRoute?.(business.id); 
                }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
              >
                <Route className="w-4 h-4" />
                Route
              </button>
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onDelete?.(business.id); 
                }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        );
      })}

      {/* Load More Button */}
      {visibleCount < businesses.length && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Load More ({businesses.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-center text-sm text-slate-500 py-4">
        Showing {visibleCount} of {businesses.length} businesses
      </div>
    </div>
  );
};
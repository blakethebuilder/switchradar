import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Building2, Map, Trash2, Landmark, Smartphone, Route, CheckSquare, Square, Plus } from 'lucide-react';
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
  hasMore?: boolean;
  onLoadMore?: () => void;
  loading?: boolean;
}

export const MobileBusinessList: React.FC<MobileBusinessListProps> = ({
  businesses,
  onBusinessSelect,
  onDelete,
  onTogglePhoneType,
  onAddToRoute,
  selectedBusinessIds,
  onSelectBusiness,
  hasMore = false,
  onLoadMore,
  loading = false
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(window.innerHeight - 300); // Approximate
  const containerRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling parameters
  const ITEM_HEIGHT = 200; // Approximate height of each mobile card
  const BUFFER_SIZE = 3;

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight || (window.innerHeight - 300));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(
      businesses.length,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, businesses.length]);

  const visibleBusinesses = useMemo(() =>
    businesses.slice(visibleRange.startIndex, visibleRange.endIndex),
    [businesses, visibleRange]
  );

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
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
    <div
      ref={containerRef}
      className="overflow-auto custom-scrollbar pr-1"
      style={{ maxHeight: 'calc(100vh - 350px)' }}
      onScroll={handleScroll}
    >
      <div
        className="relative"
        style={{ height: businesses.length * ITEM_HEIGHT }}
      >
        <div
          className="absolute top-0 left-0 right-0 space-y-3"
          style={{ transform: `translateY(${visibleRange.startIndex * ITEM_HEIGHT}px)` }}
        >
          {visibleBusinesses.map((business) => {
            const isMobile = business.phoneTypeOverride
              ? business.phoneTypeOverride === 'mobile'
              : isMobileProvider(business.provider);
            const isSelected = selectedBusinessIds.includes(business.id);

            return (
              <div
                key={business.id}
                className={`bg-white rounded-2xl border border-slate-200 p-4 transition-all shadow-sm ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : 'hover:shadow-md'
                  }`}
                style={{ height: ITEM_HEIGHT - 12 - 12 }} // Subtracting margins/padding to fit
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-2">
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
                        <h3 className="text-base font-bold text-slate-900 leading-tight mb-0.5 truncate">
                          {business.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold">
                          <span className="text-slate-400 uppercase tracking-wider truncate max-w-[120px]">
                            {business.category}
                          </span>
                          <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                          <span className="text-indigo-600 uppercase">
                            {business.town}
                          </span>
                        </div>
                      </div>

                      {/* Provider Badge */}
                      <div className="mb-2">
                        <ProviderBadge provider={business.provider} className="scale-75 origin-left" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                {(business.phone || business.email) && (
                  <div className="space-y-1.5 mb-2 pl-8">
                    {business.phone && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePhoneType?.(business.id, isMobile ? 'mobile' : 'landline');
                          }}
                          className={`p-1 rounded-md transition-all ${isMobile ? 'text-rose-500 bg-rose-50' : 'text-emerald-500 bg-emerald-50'
                            }`}
                        >
                          {isMobile ? <Smartphone className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={`tel:${business.phone}`}
                          className="text-xs font-medium text-slate-700 hover:text-indigo-600"
                        >
                          {business.phone}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-50">
                  <button
                    onClick={(e) => { e.stopPropagation(); onBusinessSelect?.(business); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Map className="w-3.5 h-3.5" />
                    Map
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddToRoute?.(business.id); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                  >
                    <Route className="w-3.5 h-3.5" />
                    Route
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete?.(business.id); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Summary & Load More */}
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Showing {businesses.length} businesses
        </div>

        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-3 w-3 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load More
                <Plus className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
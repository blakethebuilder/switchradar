import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Mail, Map, Trash2, Landmark, Smartphone, Route, CheckSquare, Square } from 'lucide-react';
import type { Business } from '../types';
import { ProviderBadge } from './ProviderBadge';
import { BulkActions } from './BulkActions';
import { MobileBusinessList } from './MobileBusinessList';
import { isMobileProvider } from '../utils/phoneUtils';

interface BusinessTableProps {
  businesses: Business[];
  onBusinessSelect?: (business: Business) => void;
  onDelete?: (id: string) => void;
  onTogglePhoneType?: (id: string, currentType: 'landline' | 'mobile') => void;
  onAddToRoute?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onDeleteNonSelectedProviders?: () => void;
  availableProviders?: string[];
  categories?: string[];
  onProviderSearch?: (provider: string) => void;
  onCategorySearch?: (category: string) => void;
  currentSearchTerm?: string;
}

export const BusinessTable = React.memo(({
  businesses,
  onBusinessSelect,
  onDelete,
  onTogglePhoneType,
  onAddToRoute,
  onBulkDelete,
  onDeleteNonSelectedProviders,
  availableProviders = [],
  categories = [],
  onProviderSearch,
  onCategorySearch,
  currentSearchTerm = ''
}: BusinessTableProps) => {
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Virtual scrolling parameters
  const ITEM_HEIGHT = 60; // Height of each table row
  const BUFFER_SIZE = 5; // Extra items to render outside viewport

  // Calculate visible range for virtualization
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(
      businesses.length,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, businesses.length]);

  // Get visible businesses for rendering
  const visibleBusinesses = useMemo(() => {
    return businesses.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [businesses, visibleRange]);

  // Handle scroll for virtualization
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      const container = document.getElementById('business-table-container');
      if (container) {
        setContainerHeight(container.clientHeight);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleSelectBusiness = (businessId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedBusinessIds(prev => [...prev, businessId]);
    } else {
      setSelectedBusinessIds(prev => prev.filter(id => id !== businessId));
    }
  };

  const handleSelectAll = () => {
    setSelectedBusinessIds(businesses.map(b => b.id));
  };

  const handleClearSelection = () => {
    setSelectedBusinessIds([]);
  };

  const handleBulkDelete = (ids: string[]) => {
    if (onBulkDelete) {
      onBulkDelete(ids);
      setSelectedBusinessIds([]);
    }
  };

  const handleDeleteNonSelectedProviders = () => {
    if (onDeleteNonSelectedProviders) {
      onDeleteNonSelectedProviders();
      setSelectedBusinessIds([]);
    }
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
    <div className="space-y-4">
      {/* Bulk Actions */}
      <BulkActions
        businesses={businesses}
        selectedBusinessIds={selectedBusinessIds}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onDeleteNonSelectedProviders={handleDeleteNonSelectedProviders}
        onBulkDelete={handleBulkDelete}
        availableProviders={availableProviders}
        categories={categories}
        onProviderSearch={onProviderSearch || (() => {})}
        onCategorySearch={onCategorySearch || (() => {})}
        currentSearchTerm={currentSearchTerm}
      />

      {/* Mobile List or Desktop Table */}
      {isMobile ? (
        <MobileBusinessList
          businesses={businesses}
          onBusinessSelect={onBusinessSelect}
          onDelete={onDelete}
          onTogglePhoneType={onTogglePhoneType}
          onAddToRoute={onAddToRoute}
          selectedBusinessIds={selectedBusinessIds}
          onSelectBusiness={handleSelectBusiness}
        />
      ) : (
        /* Desktop Table with Virtualization */
        <div 
          id="business-table-container"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40 transition-all"
          style={{ height: '600px' }}
        >
          <div 
            className="overflow-auto custom-scrollbar h-full"
            onScroll={handleScroll}
          >
            <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="w-[4%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <button
                      onClick={selectedBusinessIds.length === businesses.length ? handleClearSelection : handleSelectAll}
                      className="flex items-center justify-center"
                    >
                      {selectedBusinessIds.length === businesses.length ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="w-[28%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Business Details</th>
                  <th className="w-[20%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contact</th>
                  <th className="w-[18%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Location</th>
                  <th className="w-[15%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Network</th>
                  <th className="w-[15%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Virtual spacer for items before visible range */}
                {visibleRange.startIndex > 0 && (
                  <tr>
                    <td colSpan={6} style={{ height: visibleRange.startIndex * ITEM_HEIGHT }} />
                  </tr>
                )}
                
                {/* Render visible businesses */}
                {visibleBusinesses.map((business) => {
                  const isMobile = business.phoneTypeOverride
                    ? business.phoneTypeOverride === 'mobile'
                    : isMobileProvider(business.provider);
                  const isSelected = selectedBusinessIds.includes(business.id);
                  
                  return (
                    <tr
                      key={business.id}
                      className={`group cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/50' : 'hover:bg-indigo-50/30'
                      }`}
                      style={{ height: ITEM_HEIGHT }}
                    >
                    <td className="px-6 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectBusiness(business.id, !isSelected);
                        }}
                        className="flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                        )}
                      </button>
                    </td>
                  <td className="px-6 py-3" onClick={() => onBusinessSelect?.(business)}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                        {business.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 leading-none mb-1 truncate">
                          {business.name}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                          {business.category}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-3">
                    <div className="flex flex-col gap-0.5">
                      {business.phone && (
                        <div className="flex items-center text-[11px] font-bold text-slate-700">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePhoneType?.(business.id, isMobile ? 'mobile' : 'landline');
                            }}
                            className={`mr-1.5 p-1 rounded-md transition-all hover:scale-110 active:scale-95 ${isMobile ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'
                              }`}
                            title={`Switch to ${isMobile ? 'Landline' : 'Cellphone'}`}
                          >
                            {isMobile ? <Smartphone className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5" />}
                          </button>
                          {business.phone}
                        </div>
                      )}
                      {business.email && (
                        <div className="flex items-center text-[10px] font-semibold text-slate-400 truncate">
                          <Mail className="w-2.5 h-2.5 mr-1.5 opacity-60" />
                          {business.email}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <div className="text-[11px] font-black text-indigo-600 uppercase tracking-tighter">
                        {business.town}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 truncate max-w-[180px]">
                        {business.address}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-3">
                    <ProviderBadge provider={business.provider} className="scale-90 origin-left" />
                  </td>

                  <td className="px-2 md:px-6 py-3">
                    <div className="flex items-center justify-end gap-0.5 md:gap-1 pr-2 md:pr-6">
                      <button
                        onClick={(e) => { e.stopPropagation(); onBusinessSelect?.(business); }}
                        className="p-1.5 md:p-2 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-white hover:shadow-md transition-all"
                        title="Show on map"
                      >
                        <Map className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddToRoute?.(business.id); }}
                        className="p-1.5 md:p-2 rounded-lg text-slate-300 hover:text-green-600 hover:bg-white hover:shadow-md transition-all"
                        title="Add to Route"
                      >
                        <Route className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete?.(business.id); }}
                        className="p-1.5 md:p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-white hover:shadow-md transition-all"
                        title="Delete business"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {/* Virtual spacer for items after visible range */}
            {visibleRange.endIndex < businesses.length && (
              <tr>
                <td colSpan={6} style={{ height: (businesses.length - visibleRange.endIndex) * ITEM_HEIGHT }} />
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-10">
            <tr className="bg-slate-50/50 border-t border-slate-100">
              <td colSpan={6} className="px-6 py-3 text-center text-xs font-bold text-slate-500">
                Displaying all {businesses.length} businesses
              </td>
            </tr>
          </tfoot>
        </table>
          </div>
        </div>
      )}
    </div>
  );
});
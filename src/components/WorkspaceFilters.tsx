import React from 'react';
import { SlidersHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { ProviderBar } from './ProviderBar';

interface WorkspaceFiltersProps {
  // Filter state
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  phoneType: 'all' | 'landline' | 'mobile';
  onPhoneTypeChange: (type: 'all' | 'landline' | 'mobile') => void;
  categories: string[];
  
  // Provider state
  availableProviders: string[];
  visibleProviders: string[];
  onToggleProvider: (provider: string) => void;
  onSelectAllProviders: () => void;
  onClearProviders: () => void;
  onClearFilters: () => void;
  
  // UI state
  isVisible: boolean;
  onToggleVisibility: () => void;
  
  // Optional props for map view
  droppedPin?: { lat: number; lng: number } | null;
  radiusKm?: number;
  setRadiusKm?: (radius: number) => void;
  
  // Styling variant
  variant?: 'table' | 'map';
}

export const WorkspaceFilters: React.FC<WorkspaceFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  phoneType,
  onPhoneTypeChange,
  categories,
  availableProviders,
  visibleProviders,
  onToggleProvider,
  onSelectAllProviders,
  onClearProviders,
  onClearFilters,
  isVisible,
  onToggleVisibility,
  droppedPin,
  radiusKm,
  setRadiusKm,
  variant = 'table'
}) => {
  const isMapView = variant === 'map';
  
  return (
    <div className={`glass-card rounded-[2rem] shadow-2xl overflow-hidden ${
      isMapView 
        ? 'border border-white/50 backdrop-blur-xl' 
        : 'border border-slate-100'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        isMapView 
          ? 'border-white/20 bg-white/90' 
          : 'border-slate-100 bg-white'
      }`}>
        <div className="flex items-center gap-3">
          <SlidersHorizontal className={`h-4 w-4 ${
            isMapView ? 'text-indigo-600' : 'text-slate-600'
          }`} />
          <span className={`text-xs font-black uppercase tracking-widest ${
            isMapView ? 'text-slate-900' : 'text-slate-700'
          }`}>
            Workspace Filters
          </span>
        </div>
        <button 
          onClick={onToggleVisibility}
          className={`p-2 rounded-lg transition-colors duration-150 ${
            isMapView 
              ? 'hover:bg-white/50 text-slate-700 active:scale-95' 
              : 'hover:bg-slate-50 text-slate-600 active:scale-95'
          }`}
        >
          {isVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Content - No animation, just show/hide */}
      {isVisible && (
        <div className={`p-6 ${
          isMapView ? 'bg-white/90' : 'bg-white'
        }`}>
          {/* Provider Bar */}
          <div className="mb-6">
            <ProviderBar
              availableProviders={availableProviders}
              visibleProviders={visibleProviders}
              onToggleProvider={onToggleProvider}
              onSelectAll={onSelectAllProviders}
              onClearAll={onClearProviders}
            />
          </div>

          {/* Filter Panel */}
          <FilterPanel
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
            phoneType={phoneType}
            onPhoneTypeChange={onPhoneTypeChange}
            categories={categories}
            onClearFilters={onClearFilters}
          />
          
          {/* Radius Filter Control (Map View Only) */}
          {isMapView && droppedPin && radiusKm !== undefined && setRadiusKm && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">
                    Filter Radius
                  </label>
                  <span className="text-sm font-bold text-indigo-600">
                    {radiusKm} km
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(radiusKm - 0.5) / 9.5 * 100}%, #e2e8f0 ${(radiusKm - 0.5) / 9.5 * 100}%, #e2e8f0 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0.5km</span>
                  <span>10km</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
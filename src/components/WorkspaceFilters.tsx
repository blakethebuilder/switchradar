import React from 'react';
import { SlidersHorizontal, ChevronDown, Filter, X } from 'lucide-react';
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
  
  // Dataset state
  availableDatasets?: Array<{id: number, name: string, town?: string}>;
  selectedDatasets?: number[];
  onDatasetChange?: (datasetIds: number[]) => void;
  
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
  availableDatasets = [],
  selectedDatasets = [],
  onDatasetChange,
  isVisible,
  onToggleVisibility,
  droppedPin,
  radiusKm,
  setRadiusKm,
  variant = 'table'
}) => {
  const isMapView = variant === 'map';
  const hasActiveFilters = searchTerm || selectedCategory || phoneType !== 'all' || visibleProviders.length !== availableProviders.length;
  const activeFilterCount = [
    searchTerm,
    selectedCategory,
    phoneType !== 'all' ? phoneType : null,
    visibleProviders.length !== availableProviders.length ? 'providers' : null
  ].filter(Boolean).length;
  
  return (
    <>
      {/* Mobile Filter Toggle Button - Only visible on mobile */}
      <div className={`md:hidden fixed top-4 left-4 z-50 ${isMapView ? 'block' : 'hidden'}`}>
        <button
          onClick={onToggleVisibility}
          className={`h-12 w-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 ${
            hasActiveFilters 
              ? 'bg-indigo-600 text-white shadow-indigo-200' 
              : 'bg-white/90 backdrop-blur-xl text-slate-700 shadow-slate-200'
          } ${isVisible ? 'scale-110' : 'hover:scale-105'} active:scale-95`}
        >
          {hasActiveFilters ? (
            <div className="relative">
              <Filter className="h-5 w-5" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-white text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black">
                {activeFilterCount}
              </div>
            </div>
          ) : (
            <SlidersHorizontal className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Overlay - Only on mobile when visible */}
      {isVisible && isMapView && (
        <div className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onToggleVisibility} />
      )}

      {/* Main Filter Panel */}
      <div className={`
        ${isMapView ? (
          // Map view: Mobile modal, desktop sidebar
          `md:relative md:block ${
            isVisible 
              ? 'fixed top-0 left-0 right-0 bottom-0 md:relative md:top-auto md:left-auto md:right-auto md:bottom-auto z-50 md:z-auto' 
              : 'hidden md:block'
          }`
        ) : (
          // Table view: Always visible, responsive
          'block'
        )}
        glass-card rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-300 ${
          isMapView 
            ? 'border border-white/50 backdrop-blur-xl md:max-w-sm md:w-80' 
            : 'border border-slate-100 w-full max-w-none'
        } ${isVisible ? 'shadow-2xl' : 'shadow-lg'}
        ${isMapView && isVisible ? 'md:rounded-[2rem] rounded-none md:m-0 m-4 md:mt-0 mt-20' : ''}
      `}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between transition-all ${
          isMapView 
            ? 'border-white/20 bg-white/90' 
            : 'border-slate-100 bg-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm transition-all ${
              hasActiveFilters 
                ? 'bg-indigo-100 text-indigo-600 shadow-indigo-100' 
                : isMapView 
                  ? 'bg-white/50 text-indigo-600' 
                  : 'bg-slate-50 text-slate-600'
            }`}>
              {hasActiveFilters ? <Filter className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            </div>
            <div className="flex flex-col">
              <span className={`text-xs font-black uppercase tracking-widest ${
                isMapView ? 'text-slate-900' : 'text-slate-700'
              }`}>
                Workspace Filters
              </span>
              {hasActiveFilters && (
                <span className="text-[10px] font-bold text-indigo-600">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Desktop toggle button */}
            <button 
              onClick={onToggleVisibility}
              className={`hidden md:block p-2 rounded-lg transition-all duration-200 ${
                isMapView 
                  ? 'hover:bg-white/50 text-slate-700 active:scale-95' 
                  : 'hover:bg-slate-50 text-slate-600 active:scale-95'
              } ${isVisible ? 'rotate-180' : ''}`}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {/* Mobile close button */}
            <button 
              onClick={onToggleVisibility}
              className={`md:hidden p-2 rounded-lg transition-all duration-200 ${
                isMapView 
                  ? 'hover:bg-white/50 text-slate-700 active:scale-95' 
                  : 'hover:bg-slate-50 text-slate-600 active:scale-95'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content with smooth animation */}
        <div className={`transition-all duration-300 ease-in-out ${
          isVisible 
            ? 'max-h-[80vh] md:max-h-[600px] opacity-100 overflow-y-auto' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className={`${
            isMapView ? 'bg-white/90' : 'bg-white'
          }`}>
            <div className="p-6">
              {/* Dataset Selector */}
              {availableDatasets.length > 0 && onDatasetChange && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-700">Datasets</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onDatasetChange(availableDatasets.map(d => d.id))}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        All
                      </button>
                      <button
                        onClick={() => onDatasetChange([])}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableDatasets.map((dataset) => (
                      <button
                        key={dataset.id}
                        onClick={() => {
                          const isSelected = selectedDatasets.includes(dataset.id);
                          if (isSelected) {
                            onDatasetChange(selectedDatasets.filter(id => id !== dataset.id));
                          } else {
                            onDatasetChange([...selectedDatasets, dataset.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedDatasets.includes(dataset.id)
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {dataset.name}
                        {dataset.town && (
                          <span className="ml-1 opacity-60">({dataset.town})</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider Bar - Scrollable only on map view */}
              <div className={`mb-6 ${isMapView ? 'max-h-[300px] overflow-y-auto custom-scrollbar' : ''}`}>
                <ProviderBar
                  availableProviders={availableProviders}
                  visibleProviders={visibleProviders}
                  onToggleProvider={onToggleProvider}
                  onSelectAll={onSelectAllProviders}
                  onClearAll={onClearProviders}
                />
              </div>

              {/* Filter Panel - Fixed height */}
              <div className="mb-6">
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
              </div>
              
              {/* Radius Filter Control (Map View Only) */}
              {isMapView && droppedPin && radiusKm !== undefined && setRadiusKm && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                        Search Radius
                      </label>
                      <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
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
                      <span>5km</span>
                      <span>10km</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
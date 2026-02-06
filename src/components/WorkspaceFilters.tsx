import React from 'react';
import { SlidersHorizontal, ChevronDown, Filter, X, MapPin } from 'lucide-react';
import { FilterPanel } from './FilterPanel';
import { ProviderBar } from './ProviderBar';

interface WorkspaceFiltersProps {
  // Filter state
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedTown: string;
  onTownChange: (town: string) => void;
  phoneType: 'all' | 'landline' | 'mobile';
  onPhoneTypeChange: (type: 'all' | 'landline' | 'mobile') => void;
  categories: string[];
  availableTowns: string[];

  // Provider state
  availableProviders: string[];
  visibleProviders: string[];
  onToggleProvider: (provider: string) => void;
  onSelectAllProviders: () => void;
  onClearProviders: () => void;
  onClearFilters: () => void;

  // Dataset state
  availableDatasets?: Array<{ id: number, name: string, town?: string }>;
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

export const WorkspaceFiltersComponent: React.FC<WorkspaceFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedTown,
  onTownChange,
  phoneType,
  onPhoneTypeChange,
  categories,
  availableTowns,
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
  const hasActiveFilters = searchTerm || selectedCategory || selectedTown || phoneType !== 'all' || visibleProviders.length !== availableProviders.length;
  const activeFilterCount = [
    searchTerm,
    selectedCategory,
    selectedTown,
    phoneType !== 'all' ? phoneType : null,
    visibleProviders.length !== availableProviders.length ? 'providers' : null
  ].filter(Boolean).length;

  if (!isMapView) {
    // Table view - keep existing simple layout
    return (
      <div className="block w-full max-w-none glass-card rounded-[2rem] shadow-2xl overflow-hidden border-white/50 backdrop-blur-xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm transition-all ${hasActiveFilters
              ? 'bg-indigo-100 text-indigo-600 shadow-indigo-100'
              : 'bg-slate-50 text-slate-600'
              }`}>
              {hasActiveFilters ? <Filter className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                Workspace Filters
              </span>
              {hasActiveFilters && (
                <span className="text-[10px] font-bold text-indigo-600">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onToggleVisibility}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-slate-50 text-slate-600 active:scale-95"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isVisible ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Content - Collapsible */}
        <div className={`transition-all duration-300 ease-in-out ${isVisible
          ? 'max-h-[80vh] md:max-h-[600px] opacity-100 overflow-y-auto'
          : 'max-h-0 opacity-0 overflow-hidden'
          }`}>
          <div className="bg-white p-4 space-y-4">
            {/* Dataset Selector */}
            {availableDatasets.length > 0 && onDatasetChange && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Datasets</h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onDatasetChange(availableDatasets.map(d => d.id))}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded"
                    >
                      All
                    </button>
                    <button
                      onClick={() => onDatasetChange([])}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
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
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${selectedDatasets.includes(dataset.id)
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {dataset.name.length > 15 ? dataset.name.substring(0, 15) + '...' : dataset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Provider Bar */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <ProviderBar
                availableProviders={availableProviders}
                visibleProviders={visibleProviders}
                onToggleProvider={onToggleProvider}
                onSelectAll={onSelectAllProviders}
                onClearAll={onClearProviders}
              />
            </div>

            {/* Filter Panel */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <FilterPanel
                searchTerm={searchTerm}
                onSearchChange={onSearchChange}
                selectedCategory={selectedCategory}
                onCategoryChange={onCategoryChange}
                selectedTown={selectedTown}
                onTownChange={onTownChange}
                phoneType={phoneType}
                onPhoneTypeChange={onPhoneTypeChange}
                categories={categories}
                availableTowns={availableTowns}
                onClearFilters={onClearFilters}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Map view - Completely redesigned responsive sidebar
  return (
    <>
      {/* Toggle Button - Fixed position for all screen sizes */}
      <button
        onClick={onToggleVisibility}
        className={`fixed top-24 left-4 z-[60] h-12 w-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 ${hasActiveFilters
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

      {/* Overlay for all screen sizes when visible */}
      {isVisible && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[50]"
          onClick={onToggleVisibility}
        />
      )}

      {/* Sidebar - Responsive for all screen sizes */}
      <div className={`
        fixed top-0 left-0 h-screen bg-white/95 backdrop-blur-xl border-r border-white/40 shadow-2xl z-[55]
        transform transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-x-0' : '-translate-x-full'}
        w-80 sm:w-96 md:w-80 lg:w-96
        flex flex-col
      `}>
        {/* Header - Account for navbar height */}
        <div className="h-16 md:h-20 flex items-center justify-between px-4 border-b border-white/20 bg-white/90 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm transition-all ${hasActiveFilters
              ? 'bg-indigo-100 text-indigo-600 shadow-indigo-100'
              : 'bg-white/50 text-indigo-600'
              }`}>
              {hasActiveFilters ? <Filter className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">
                Filters
              </span>
              {hasActiveFilters && (
                <span className="text-[10px] font-bold text-indigo-600">
                  {activeFilterCount} active
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onToggleVisibility}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-white/50 text-slate-700 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content - Scrollable area with proper spacing */}
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="p-4 space-y-4">
            {/* Dataset Selector - Full width */}
            {availableDatasets.length > 0 && onDatasetChange && (
              <div className="bg-white/80 rounded-xl p-4 border border-white/40 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Datasets</h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onDatasetChange(availableDatasets.map(d => d.id))}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded"
                    >
                      All
                    </button>
                    <button
                      onClick={() => onDatasetChange([])}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
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
                      className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all text-center ${selectedDatasets.includes(dataset.id)
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                    >
                      {dataset.name.length > 12 ? dataset.name.substring(0, 12) + '...' : dataset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Provider Bar - Full width with grid layout */}
            <div className="bg-white/80 rounded-xl p-4 border border-white/40 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Providers</h4>
                  <span className="text-[10px] font-bold text-slate-500">
                    {visibleProviders.length}/{availableProviders.length}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={onSelectAllProviders}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded"
                  >
                    All
                  </button>
                  <button
                    onClick={onClearProviders}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded"
                  >
                    None
                  </button>
                </div>
              </div>

              {/* Provider Pills - Full width grid */}
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {availableProviders.map(provider => {
                  const isActive = visibleProviders.includes(provider);
                  return (
                    <button
                      key={provider}
                      onClick={() => onToggleProvider(provider)}
                      className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all text-center ${isActive
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                    >
                      {provider.length > 12 ? provider.substring(0, 12) + '...' : provider}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Radius Filter Control - Only when pin is dropped */}
            {droppedPin && radiusKm !== undefined && setRadiusKm && (
              <div className="bg-white/80 rounded-xl p-4 border border-white/40 shadow-sm">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      Radius Filter
                    </label>
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
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
                      background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${(radiusKm - 0.5) / 9.5 * 100}%, #e2e8f0 ${(radiusKm - 0.5) / 9.5 * 100}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0.5km</span>
                    <span>5km</span>
                    <span>10km</span>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Panel - Search, Category, Town, Phone Type */}
            <div className="bg-white/80 rounded-xl p-4 border border-white/40 shadow-sm">
              <FilterPanel
                searchTerm={searchTerm}
                onSearchChange={onSearchChange}
                selectedCategory={selectedCategory}
                onCategoryChange={onCategoryChange}
                selectedTown={selectedTown}
                onTownChange={onTownChange}
                phoneType={phoneType}
                onPhoneTypeChange={onPhoneTypeChange}
                categories={categories}
                availableTowns={availableTowns}
                onClearFilters={onClearFilters}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const WorkspaceFilters = React.memo(WorkspaceFiltersComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  // This prevents re-renders when typing in search or changing filters
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.searchTerm === nextProps.searchTerm &&
    prevProps.selectedCategory === nextProps.selectedCategory &&
    prevProps.selectedTown === nextProps.selectedTown &&
    prevProps.phoneType === nextProps.phoneType &&
    prevProps.visibleProviders.length === nextProps.visibleProviders.length &&
    (prevProps.selectedDatasets?.length || 0) === (nextProps.selectedDatasets?.length || 0) &&
    prevProps.categories.length === nextProps.categories.length &&
    prevProps.availableTowns.length === nextProps.availableTowns.length &&
    prevProps.availableProviders.length === nextProps.availableProviders.length &&
    (prevProps.availableDatasets?.length || 0) === (nextProps.availableDatasets?.length || 0) &&
    prevProps.variant === nextProps.variant &&
    prevProps.droppedPin === nextProps.droppedPin &&
    prevProps.radiusKm === nextProps.radiusKm
  );
});
import React, { Suspense } from 'react';
import { Plus, X, Target } from 'lucide-react';
import { WorkspaceFilters } from './WorkspaceFilters';
import { BusinessTable } from './BusinessTable';
import { BusinessMap } from './BusinessMap';
import { Dashboard } from './Dashboard';
import { DatasetSelector } from './DatasetSelector';
import AdminConsole from './AdminConsole';
import { LoadingSpinner, DataLoading } from './LoadingStates';
import type { Business, ViewMode } from '../types';

// Lazy load heavy components
const MarketIntelligence = React.lazy(() => import('./MarketIntelligence'));
const RouteView = React.lazy(() => import('./RouteView'));
const SeenClients = React.lazy(() => import('./SeenClients'));
const PresentationView = React.lazy(() => import('./PresentationView'));

interface ViewRendererProps {
  viewMode: ViewMode;
  businesses: Business[];
  filteredBusinesses: Business[];
  categories: string[];
  availableTowns: string[];
  availableProviders: string[];
  availableDatasets: any[];
  selectedDatasets: number[];
  routeItems: any[];
  selectedBusiness: Business | null;
  selectedBusinessIds: string[];
  mapTarget: { center: [number, number], zoom: number } | null;
  isFiltersVisible: boolean;
  lastImportName: string;
  loading: boolean;
  isProcessingLargeDataset?: boolean;
  
  // Filter props
  searchTerm: string;
  selectedCategory: string;
  selectedTown: string;
  phoneType: 'all' | 'landline' | 'mobile';
  visibleProviders: string[];
  droppedPin: any;
  radiusKm: number;
  
  // Handlers
  onSearchChange: (term: string) => void;
  onCategoryChange: (category: string) => void;
  onTownChange: (town: string) => void;
  onPhoneTypeChange: (type: 'all' | 'landline' | 'mobile') => void;
  onToggleProvider: (provider: string) => void;
  onSelectAllProviders: () => void;
  onClearProviders: () => void;
  onClearFilters: () => void;
  onDatasetChange: (datasets: number[]) => void;
  onToggleFiltersVisibility: () => void;
  onBusinessSelect: (business: Business) => void;
  onMapBusinessSelect?: (business: Business) => void; // Map-specific handler that preserves view
  onDeleteBusiness: (id: string) => void;
  onTogglePhoneType: (id: string, currentType: 'landline' | 'mobile') => void;
  onAddToRoute: (businessId: string) => void;
  onRemoveFromRoute: (businessId: string) => void;
  onClearRoute: () => void;
  onBulkDelete: (ids: string[]) => void;
  onDeleteNonSelectedProviders: () => void;
  onProviderSearch: (provider: string) => void;
  onCategorySearch: (category: string) => void;
  onImportClick: () => void;
  onExportClick?: () => void;
  onClearData?: () => void;
  onAddSelectedToRoute: () => void;
  onClearSelection: () => void;
  onProviderFilter: (provider: string) => void;
  onViewOnMap: (business: Business) => void;
  onDatasetSelected: (datasetIds: number[]) => void;
  setDroppedPin: (pin: any) => void;
  setRadiusKm: (radius: number) => void;
  setViewMode: (mode: ViewMode) => void;
  
  // Auth props
  isAdmin: boolean;
}

export const ViewRenderer: React.FC<ViewRendererProps> = ({
  viewMode,
  businesses,
  filteredBusinesses,
  categories,
  availableTowns,
  availableProviders,
  availableDatasets,
  selectedDatasets,
  routeItems,
  selectedBusiness,
  selectedBusinessIds,
  mapTarget,
  isFiltersVisible,
  lastImportName,
  loading,
  isProcessingLargeDataset,
  searchTerm,
  selectedCategory,
  selectedTown,
  phoneType,
  visibleProviders,
  droppedPin,
  radiusKm,
  onSearchChange,
  onCategoryChange,
  onTownChange,
  onPhoneTypeChange,
  onToggleProvider,
  onSelectAllProviders,
  onClearProviders,
  onClearFilters,
  onDatasetChange,
  onToggleFiltersVisibility,
  onBusinessSelect,
  onMapBusinessSelect,
  onDeleteBusiness,
  onTogglePhoneType,
  onAddToRoute,
  onRemoveFromRoute,
  onClearRoute,
  onBulkDelete,
  onDeleteNonSelectedProviders,
  onProviderSearch,
  onCategorySearch,
  onImportClick,
  onExportClick,
  onClearData,
  onAddSelectedToRoute,
  onClearSelection,
  onProviderFilter,
  onViewOnMap,
  onDatasetSelected,
  setDroppedPin,
  setRadiusKm,
  setViewMode,
  isAdmin,
}) => {
  const providerCount = availableProviders.length;

  // Show loading only when:
  // 1. We're loading/processing AND we have no businesses at all
  // 2. BUT never show loading on dashboard if we have any businesses (even if processing)
  const shouldShowLoading = (loading || isProcessingLargeDataset) && businesses.length === 0;

  if (shouldShowLoading) {
    return (
      <DataLoading
        type="businesses"
        count={businesses.length}
        isLargeDataset={isProcessingLargeDataset}
      />
    );
  }

  if (businesses.length === 0) {
    if (availableDatasets.length > 0) {
      return (
        <DatasetSelector
          onDatasetSelected={onDatasetSelected}
          onImportClick={onImportClick}
        />
      );
    }

    if (viewMode === 'settings') {
      // Only admins can access settings when no data
      if (!isAdmin) {
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-600">
                Settings are only available to administrators.
              </p>
            </div>
          </div>
        );
      }
      
      return (
        <div className="flex-1 overflow-auto p-3 md:p-4 lg:p-6 xl:p-8">
          <div className="max-w-6xl mx-auto">
            <AdminConsole />
          </div>
        </div>
      );
    }

    if (viewMode === 'present') {
      return (
        <div className="flex-1 h-full">
          <Suspense fallback={<LoadingSpinner size="lg" message="Loading presentation..." />}>
            <PresentationView onBack={() => setViewMode('table')} />
          </Suspense>
        </div>
      );
    }

    return (
      <Dashboard
        businessCount={businesses.length}
        providerCount={providerCount}
        onImportClick={onImportClick}
        onViewMapClick={() => setViewMode('map')}
      />
    );
  }

  // Render header for table/stats/seen views
  const renderHeader = () => (
    <div className="p-3 md:p-4 lg:p-6 xl:p-8 pb-0">
      <div className="flex flex-col gap-4 md:gap-6 md:flex-row md:items-end md:justify-between mb-6 md:mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Active</span>
          </div>
          <h1 className="text-xl md:text-2xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
            {lastImportName || 'Workspace Live'}
          </h1>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-white px-3 py-3 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto no-scrollbar">
          <div className="flex flex-col items-center px-3 md:px-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Businesses</span>
            <span className="text-lg md:text-xl font-black text-slate-900">{businesses.length.toLocaleString()}</span>
          </div>
          <div className="h-6 md:h-8 w-px bg-slate-100 hidden md:block" />
          <div className="flex flex-col items-center px-3 md:px-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Providers</span>
            <span className="text-lg md:text-xl font-black text-slate-900">{providerCount}</span>
          </div>
          <div className="h-6 md:h-8 w-px bg-slate-100 hidden md:block" />
          <div className="flex flex-col items-center px-3 md:px-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Selected</span>
            <span className="text-lg md:text-xl font-black text-emerald-600">{filteredBusinesses.length.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );

  switch (viewMode) {
    case 'dashboard':
      return (
        <Dashboard
          businessCount={businesses.length}
          providerCount={availableProviders.length}
          onImportClick={onImportClick}
          onViewMapClick={() => setViewMode('map')}
          onViewModeChange={setViewMode}
          onTownSelect={onTownChange}
        />
      );

    case 'table':
      return (
        <div className="flex-1 flex flex-col h-full relative">
          {renderHeader()}
          <div className="mb-6 md:mb-8">
            <WorkspaceFilters
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
              availableProviders={availableProviders}
              visibleProviders={visibleProviders}
              onToggleProvider={onToggleProvider}
              onSelectAllProviders={onSelectAllProviders}
              onClearProviders={onClearProviders}
              onClearFilters={onClearFilters}
              availableDatasets={availableDatasets}
              selectedDatasets={selectedDatasets}
              onDatasetChange={onDatasetChange}
              isVisible={isFiltersVisible}
              onToggleVisibility={onToggleFiltersVisibility}
              variant="table"
            />
          </div>
          
          <BusinessTable
            businesses={filteredBusinesses}
            onBusinessSelect={onBusinessSelect}
            onDelete={onDeleteBusiness}
            onTogglePhoneType={onTogglePhoneType}
            onAddToRoute={onAddToRoute}
            onBulkDelete={onBulkDelete}
            onDeleteNonSelectedProviders={onDeleteNonSelectedProviders}
            availableProviders={availableProviders}
            categories={categories}
            onProviderSearch={onProviderSearch}
            onCategorySearch={onCategorySearch}
            currentSearchTerm={searchTerm}
          />
        </div>
      );

    case 'map':
      return (
        <div className="absolute inset-0 w-full h-full flex">
          <WorkspaceFilters
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
            availableProviders={availableProviders}
            visibleProviders={visibleProviders}
            onToggleProvider={onToggleProvider}
            onSelectAllProviders={onSelectAllProviders}
            onClearProviders={onClearProviders}
            onClearFilters={onClearFilters}
            availableDatasets={availableDatasets}
            selectedDatasets={selectedDatasets}
            onDatasetChange={onDatasetChange}
            isVisible={isFiltersVisible}
            onToggleVisibility={onToggleFiltersVisibility}
            droppedPin={droppedPin}
            radiusKm={radiusKm}
            setRadiusKm={setRadiusKm}
            variant="map"
          />

          <div className="flex-1 relative">
            {selectedBusinessIds.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 z-[2000]">
                <div className="max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                      <span className="text-sm font-bold text-slate-900">
                        {selectedBusinessIds.length} businesses selected
                      </span>
                    </div>
                    <button
                      onClick={onClearSelection}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      title="Clear selection"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onAddSelectedToRoute}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      Add to Route
                    </button>
                    <button
                      onClick={() => {
                        if (selectedBusinessIds.length > 0) {
                          const firstSelected = businesses.find(b => b.id === selectedBusinessIds[0]);
                          if (firstSelected) {
                            onBusinessSelect(firstSelected);
                          }
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-600 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all active:scale-95"
                      title="Navigate through selected"
                    >
                      <Target className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 text-center">
                    Hold Shift + drag to select multiple businesses
                  </div>
                </div>
              </div>
            )}

            <BusinessMap
              key={`map-${viewMode}`}
              businesses={React.useMemo(() => {
                // CRITICAL FIX: Always include the selected business in the map, even if it's filtered out
                // This prevents markers from disappearing when clicked
                const mapBusinesses = [...filteredBusinesses];
                
                if (selectedBusiness && !mapBusinesses.find(b => b.id === selectedBusiness.id)) {
                  console.log('🗺️ MAP: Adding selected business to map businesses', {
                    selectedBusinessId: selectedBusiness.id,
                    selectedBusinessName: selectedBusiness.name,
                    filteredCount: filteredBusinesses.length
                  });
                  mapBusinesses.push(selectedBusiness);
                }
                
                // Also include any selected businesses from multi-select
                selectedBusinessIds.forEach(id => {
                  if (!mapBusinesses.find(b => b.id === id)) {
                    const business = businesses.find(b => b.id === id);
                    if (business) {
                      console.log('🗺️ MAP: Adding multi-selected business to map', business.name);
                      mapBusinesses.push(business);
                    }
                  }
                });
                
                return mapBusinesses;
              }, [filteredBusinesses, selectedBusiness, selectedBusinessIds, businesses])}
              targetLocation={mapTarget?.center}
              zoom={mapTarget?.zoom}
              fullScreen={true}
              onBusinessSelect={onMapBusinessSelect || onBusinessSelect}
              selectedBusinessId={selectedBusiness?.id}
              selectedBusinessIds={selectedBusinessIds}
              droppedPin={droppedPin}
              setDroppedPin={setDroppedPin}
              radiusKm={radiusKm}
            />
          </div>
        </div>
      );

    case 'route':
      return (
        <div className="flex-1 overflow-auto p-3 md:p-4 lg:p-6 xl:p-8">
          <Suspense fallback={<LoadingSpinner size="lg" message="Loading routes..." />}>
            <RouteView 
              routeItems={routeItems} 
              businesses={businesses} 
              onRemoveFromRoute={onRemoveFromRoute}
              onClearRoute={onClearRoute}
              onSelectBusiness={onBusinessSelect}
            />
          </Suspense>
        </div>
      );

    case 'settings':
      // Only admins can access settings
      if (!isAdmin) {
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-600">
                Settings are only available to administrators.
              </p>
            </div>
          </div>
        );
      }
      
      return (
        <div className="flex-1 overflow-auto p-3 md:p-4 lg:p-6 xl:p-8">
          <div className="max-w-6xl mx-auto">
            <AdminConsole 
              onImportClick={onImportClick}
              onExportClick={onExportClick}
              onClearData={onClearData}
              totalCount={businesses.length}
              businesses={businesses}
              availableTowns={availableTowns}
              availableProviders={availableProviders}
              availableCategories={categories}
              onDeleteBusiness={onDeleteBusiness}
              onBulkDelete={onBulkDelete}
            />
          </div>
        </div>
      );

    case 'stats':
      return (
        <div className="flex-1 flex flex-col h-full relative">
          {renderHeader()}
          <div className="flex-1 overflow-auto p-3 md:p-4 lg:p-6 xl:p-8 pt-0">
            <Suspense fallback={<LoadingSpinner size="lg" message="Loading analytics..." />}>
              <MarketIntelligence 
                businesses={filteredBusinesses} 
                droppedPin={droppedPin} 
                radiusKm={radiusKm}
                onProviderFilter={onProviderFilter}
              />
            </Suspense>
          </div>
        </div>
      );

    case 'seen':
      return (
        <div className="flex-1 flex flex-col h-full relative">
          {renderHeader()}
          <div className="flex-1 overflow-auto p-3 md:p-4 lg:p-6 xl:p-8 pt-0">
            <Suspense fallback={<LoadingSpinner size="lg" message="Loading client history..." />}>
              <SeenClients 
                businesses={businesses} 
                onDeleteBusiness={onDeleteBusiness}
                onViewOnMap={onViewOnMap}
              />
            </Suspense>
          </div>
        </div>
      );

    case 'present':
      return (
        <div className="flex-1 h-full">
          <Suspense fallback={<LoadingSpinner size="lg" message="Loading presentation..." />}>
            <PresentationView onBack={() => setViewMode('map')} />
          </Suspense>
        </div>
      );

    default:
      return null;
  }
};
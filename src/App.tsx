import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { FilterPanel } from './components/FilterPanel';
import { BusinessTable } from './components/BusinessTable';
import { BusinessMap } from './components/BusinessMap';
import { MarketIntelligence } from './components/MarketIntelligence';
import { Dashboard } from './components/Dashboard';
import { ImportModal } from './components/ImportModal';
import { ImportMappingModal } from './components/ImportMappingModal';
import { TopNav } from './components/TopNav';
import { LoginModal } from './components/LoginModal';
import { ProviderBar } from './components/ProviderBar';
import { RoutePlanner } from './components/RoutePlanner';
import { DbSettingsPage } from './components/DbSettingsPage';
import { useAuth } from './context/AuthContext';
import { useBusinessData } from './hooks/useBusinessData';
import { useCloudSync } from './hooks/useCloudSync';
import { processImportedData, sampleData } from './utils/dataProcessors';
import { db } from './db';
import './App.css';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import type { Business, ImportMapping, ViewMode } from './types';

function App() {
  const {
    businesses,
    routeItems,
    filteredBusinesses,
    categories,
    availableProviders,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    visibleProviders,
    setVisibleProviders,
    phoneType,
    setPhoneType,
    loadFromCloud
  } = useBusinessData();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [lastImportName, setLastImportName] = useState('');
  const [importRows, setImportRows] = useState<Record<string, any>[]>([]);
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [pendingFileName, setPendingFileName] = useState('');
  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<{ center: [number, number], zoom: number } | null>(null);

  const { isAuthenticated, token } = useAuth();
  const { isSyncing, clearCloudData, pushToCloud } = useCloudSync(businesses, routeItems, isAuthenticated, token);

  const handleUpdateBusiness = async (id: string, updates: Partial<Business>) => {
    await db.businesses.update(id, updates);
  };
  
  useEffect(() => {
    if (isAuthenticated && token) {
      loadFromCloud(token);
    }
  }, [isAuthenticated, token]);

  const providerCount = availableProviders.length;

  const handleFileSelected = (file: File) => {
    // ... file selection logic
  };
  const handleConfirmMapping = async (mapping: ImportMapping) => {
    // ... mapping logic
  };
  const applyNewBusinesses = async (items: Business[], sourceName: string) => {
    // ... apply new businesses logic
  };
  const handleImportSample = async () => {
    // ... import sample logic
  };
  const handleToggleProvider = (provider: string) => {
    setVisibleProviders(prev =>
      prev.includes(provider) ? prev.filter(p => p !== provider) : [...prev, provider]
    );
  };
  const handleSelectAllProviders = () => setVisibleProviders(availableProviders);
  const handleClearProviders = () => setVisibleProviders([]);
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setVisibleProviders(availableProviders);
  };

  const handleAddToRoute = async (businessId: string) => {
    const maxOrder = Math.max(...routeItems.map(i => i.order), 0);
    await db.route.add({ businessId, order: maxOrder + 1, addedAt: new Date() });
  };

  const handleRemoveFromRoute = async (businessId: string) => {
    await db.route.where('businessId').equals(businessId).delete();
  };
  
  const handleClearRoute = async () => {
    await db.route.clear();
    setSelectedBusiness(null);
  };

  const handleDeleteBusiness = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this business?')) {
      await db.businesses.delete(id);
      await db.route.where('businessId').equals(id).delete();
      if (selectedBusiness?.id === id) setSelectedBusiness(null);
    }
  };

  const handleSelectBusinessOnMap = (b: Business) => {
    setSelectedBusiness(b);
    setIsRoutePlannerOpen(true);
  };
  
  const handleTogglePhoneType = async (id: string, currentType: 'landline' | 'mobile') => {
    const newType = currentType === 'landline' ? 'mobile' : 'landline';
    await db.businesses.update(id, { phoneTypeOverride: newType });
  };

  const handleExport = () => {
    // ... export logic
  };

  const handleClearAll = async () => {
    // ... clear all logic
  };

  const openImportModal = () => {
    setImportError('');
    setIsImportOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <LoginModal isOpen={true} onClose={() => {}} onLoginSuccess={() => loadFromCloud(token)} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      <TopNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onImportClick={openImportModal}
        onExportClick={handleExport}
        onClearData={handleClearAll}
        totalCount={businesses.length}
        lastImportName={lastImportName}
        isSyncing={isSyncing}
        onLoginClick={() => setIsLoginOpen(true)}
        onClearCloudData={clearCloudData}
        onPushToCloud={pushToCloud}
        onRouteClick={() => setIsRoutePlannerOpen(!isRoutePlannerOpen)}
      />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {businesses.length > 0 ? (
            <div className="h-full">
              {(viewMode === 'table' || viewMode === 'stats') && (
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
                  {/* Stats Header */}
                </div>
              )}
              {(viewMode === 'table' || viewMode === 'map') && (
                <div className="mb-8">
                  <div className="glass-card rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>Workspace Filters</span>
                      </div>
                      <button onClick={() => setIsFiltersVisible(!isFiltersVisible)}>
                        {isFiltersVisible ? <ChevronUp /> : <ChevronDown />}
                      </button>
                    </div>
                    {isFiltersVisible && (
                      <div className="p-6">
                        <ProviderBar
                          availableProviders={availableProviders}
                          visibleProviders={visibleProviders}
                          onToggleProvider={handleToggleProvider}
                          onSelectAll={handleSelectAllProviders}
                          onClearAll={handleClearProviders}
                        />
                        <FilterPanel
                          searchTerm={searchTerm}
                          onSearchChange={setSearchTerm}
                          selectedCategory={selectedCategory}
                          onCategoryChange={setSelectedCategory}
                          phoneType={phoneType}
                          onPhoneTypeChange={setPhoneType}
                          categories={categories}
                          onClearFilters={handleClearFilters}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {viewMode === 'table' ? (
                <BusinessTable
                  businesses={filteredBusinesses}
                  onBusinessSelect={(b) => {
                    setSelectedBusiness(b);
                    setViewMode('map');
                    setIsRoutePlannerOpen(true);
                    setMapTarget({ center: [b.coordinates.lat, b.coordinates.lng], zoom: 15 });
                  }}
                  onDelete={handleDeleteBusiness}
                  onTogglePhoneType={handleTogglePhoneType}
                  onAddToRoute={handleAddToRoute}
                />
              ) : viewMode === 'map' ? (
                <BusinessMap
                  businesses={filteredBusinesses}
                  targetLocation={mapTarget?.center}
                  zoom={mapTarget?.zoom}
                  fullScreen={true}
                  onBusinessSelect={handleSelectBusinessOnMap}
                />
              ) : (
                <MarketIntelligence businesses={filteredBusinesses} />
              )}
            </div>
          ) : viewMode === 'settings' ? (
            <DbSettingsPage businesses={businesses} onClose={() => setViewMode('table')} />
          ) : (
            <Dashboard
              businessCount={businesses.length}
              providerCount={providerCount}
              onImportClick={openImportModal}
              onViewMapClick={() => setViewMode('map')}
            />
          )}
        </main>
        <aside className={`transition-all duration-300 ease-in-out ${isRoutePlannerOpen ? 'w-96' : 'w-0'} bg-white shadow-lg border-l border-slate-100 flex-shrink-0 overflow-hidden`}>
          {isRoutePlannerOpen && (
            <RoutePlanner
              routeItems={routeItems}
              businesses={businesses}
              selectedBusiness={selectedBusiness}
              onAddToRoute={handleAddToRoute}
              onRemoveFromRoute={handleRemoveFromRoute}
              onClearRoute={handleClearRoute}
              onSelectBusiness={setSelectedBusiness}
              onClose={() => setIsRoutePlannerOpen(false)}
              onTogglePhoneType={handleTogglePhoneType}
              onUpdateBusiness={handleUpdateBusiness}
            />
          )}
        </aside>
      </div>
      {/* ... Modals ... */}
    </div>
  );
}

export default App;

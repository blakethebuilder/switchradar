import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// Components
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

// Hooks
import { useAuth } from './context/AuthContext';
import { useBusinessData } from './hooks/useBusinessData';
import { useCloudSync } from './hooks/useCloudSync';

// Utils & Assets
import { processImportedData, sampleData } from './utils/dataProcessors';
import { db } from './db';
import './App.css';
import {
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  PanelRightOpen
} from 'lucide-react';
import type { Business, ImportMapping, ViewMode } from './types';

/**
 * Main Application Component
 * 
 * SwitchRadar: A visual business intelligence and route planning tool.
 * Handles data import, cloud synchronization, mapping, and analytics.
 */
function App() {
  const {
    businesses,
    routeItems,
    filteredBusinesses,
    towns,
    availableProviders,
    searchTerm,
    setSearchTerm,
    selectedTown,
    setSelectedTown,
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
  const { isSyncing, clearCloudData } = useCloudSync(businesses, routeItems, isAuthenticated, token);


  // Initial Load from Cloud
  useEffect(() => {
    if (isAuthenticated && token) {
      loadFromCloud(token);
    }
  }, [isAuthenticated, token]);

  const providerCount = availableProviders.length;
  const townCount = towns.length;

  // --- Handlers ---

  const handleFileSelected = (file: File) => {
    setPendingFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(data as string);
          const rows = Array.isArray(json) ? json : [json];
          setImportRows(rows);
          setImportColumns(Object.keys(rows[0] || {}));
          setIsMappingOpen(true);
          setIsImportOpen(false);
        } catch (err) {
          setImportError('Invalid JSON file format.');
        }
      } else {
        try {
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          if (!rows || rows.length === 0) {
            setImportError('The selected file appears to be empty.');
            return;
          }
          setImportRows(rows as any[]);
          setImportColumns(Object.keys(rows[0] || {}));
          setIsMappingOpen(true);
          setIsImportOpen(false);
        } catch (err) {
          setImportError('Failed to read Excel/CSV file. Ensure it is not corrupted.');
        }
      }
    };
    if (file.name.endsWith('.json')) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  };

  const handleConfirmMapping = async (mapping: ImportMapping) => {
    setIsMappingOpen(false);
    setIsImporting(true);
    setImportError('');
    try {
      const processed = processImportedData(importRows, mapping);
      await applyNewBusinesses(processed, pendingFileName);
    } catch (err) {
      setImportError('Failed to process data. Check column mappings.');
    } finally {
      setIsImporting(false);
    }
  };

  const applyNewBusinesses = async (items: Business[], sourceName: string) => {
    const providers = Array.from(new Set(items.map(b => b.provider))).filter(Boolean);
    await db.businesses.clear();
    await db.businesses.bulkAdd(items);
    setVisibleProviders(providers);
    setLastImportName(sourceName);
  };

  const handleImportSample = async () => {
    setIsImporting(true);
    setTimeout(async () => {
      await applyNewBusinesses(sampleData, 'Global Sample Dataset');
      setIsImporting(false);
      setIsImportOpen(false);
    }, 1000);
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
    setSelectedTown('');
    setVisibleProviders(availableProviders);
  };

  const handleAddToRoute = async (businessId: string) => {
    const maxOrder = Math.max(...routeItems.map(i => i.order), 0);
    await db.route.add({
      businessId,
      order: maxOrder + 1,
      addedAt: new Date()
    });
  };

  const handleRemoveFromRoute = async (businessId: string) => {
    await db.route.where('businessId').equals(businessId).delete();
  };

  const handleClearRoute = async () => {
    await db.route.clear();
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
    // Explicitly don't set mapTarget here so the map doesn't move
  };

  const handleTogglePhoneType = async (id: string, currentType: 'landline' | 'mobile') => {
    const newType = currentType === 'landline' ? 'mobile' : 'landline';
    await db.businesses.update(id, { phoneTypeOverride: newType });
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredBusinesses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Businesses");
    XLSX.writeFile(workbook, "switchradar_export.xlsx");
  };

  const handleClearAll = async () => {
    if (window.confirm('Delete ALL businesses and routes? This cannot be undone.')) {
      await db.businesses.clear();
      await db.route.clear();
      setSelectedBusiness(null);
    }
  };

  const openImportModal = () => {
    setImportError('');
    setIsImportOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
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
      />

      <main className={`${viewMode === 'map' ? 'h-[calc(100vh-80px)] w-full relative' : 'container mx-auto px-4 md:px-6 pt-20 md:pt-24 pb-12 relative'}`}>
        {businesses.length > 0 ? (
          <div className={`flex flex-col ${viewMode === 'map' ? 'h-full' : 'gap-10'}`}>
            {/* Header Section - Only for Table/Stats */}
            {(viewMode === 'table' || viewMode === 'stats') && (
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Active</span>
                  </div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                    {lastImportName || 'Workspace Live'}
                  </h1>
                </div>
              </div>
            )}


            {/* Main Content Area */}
            <div className={`flex-grow h-full ${viewMode === 'map' ? 'relative' : 'mt-8'}`}>
              {viewMode === 'table' ? (
                <>
                  {/* Workspace Filters for Table View */}
                  <div className="mb-8">
                    <div className="glass-card rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden transition-all duration-500">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                            <SlidersHorizontal className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-widest text-slate-900">Workspace Filters</span>
                        </div>
                        <button
                          onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/5 hover:bg-slate-900/10 transition-colors"
                        >
                          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                            {isFiltersVisible ? 'Hide Controls' : 'Show Controls'}
                          </span>
                          {isFiltersVisible ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </button>
                      </div>

                      <div className={`transition-all duration-500 ${isFiltersVisible ? 'opacity-100 p-6' : 'max-h-0 opacity-0 overflow-hidden'}`}>
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
                          selectedTown={selectedTown}
                          onTownChange={setSelectedTown}
                          phoneType={phoneType}
                          onPhoneTypeChange={setPhoneType}
                          towns={towns}
                          onClearFilters={handleClearFilters}
                        />
                      </div>
                    </div>
                  </div>

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
                  />
                </>
              ) : viewMode === 'map' ? (
                <div className="h-full w-full flex overflow-hidden rounded-[2.5rem] shadow-2xl border border-white relative group/map-container">
                  <div className="flex-grow h-full relative">
                    {/* Workspace Filters (Center-aligned within map area) */}
                    <div className="absolute top-4 md:top-6 left-0 right-0 z-[1002] pointer-events-none px-4 md:px-6">
                      <div className="max-w-4xl mx-auto w-full pointer-events-auto flex flex-col gap-4 transition-all duration-500">
                        <div className={`glass-card rounded-[2rem] shadow-2xl border-white/50 backdrop-blur-xl overflow-hidden transition-all duration-500`}>
                          <div className="p-4 border-b border-white/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                                <SlidersHorizontal className="h-4 w-4" />
                              </div>
                              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Workspace Filters</span>
                            </div>
                            <button
                              onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/5 hover:bg-slate-900/10 transition-colors"
                            >
                              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                                {isFiltersVisible ? 'Hide Controls' : 'Show Controls'}
                              </span>
                              {isFiltersVisible ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </button>
                          </div>

                          <div className={`transition-all duration-500 ${isFiltersVisible ? 'opacity-100 p-6' : 'max-h-0 opacity-0 overflow-hidden'}`}>
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
                              selectedTown={selectedTown}
                              onTownChange={setSelectedTown}
                              phoneType={phoneType}
                              onPhoneTypeChange={setPhoneType}
                              towns={towns}
                              onClearFilters={handleClearFilters}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <BusinessMap
                      businesses={filteredBusinesses}
                      targetLocation={mapTarget?.center}
                      zoom={mapTarget?.zoom}
                      fullScreen={true}
                      onBusinessSelect={handleSelectBusinessOnMap}
                    />

                    {/* Minimized Toolbar Toggle */}
                    {!isRoutePlannerOpen && (
                      <button
                        onClick={() => setIsRoutePlannerOpen(true)}
                        className="absolute bottom-6 right-6 z-[1001] h-14 w-14 bg-white rounded-2xl shadow-xl flex items-center justify-center text-indigo-600 hover:scale-110 transition-all duration-300 border border-slate-100"
                        title="Open Details"
                      >
                        <div className="relative">
                          <PanelRightOpen className="w-6 h-6 rotate-90" />
                          {routeItems.length > 0 && (
                            <span className="absolute -top-2 -right-2 h-4 w-4 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-white">
                              {routeItems.length}
                            </span>
                          )}
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Route Planner / Detail Bottom Sheet */}
                  <div
                    className={`fixed bottom-0 left-0 right-0 z-[1003] transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${isRoutePlannerOpen ? 'translate-y-0' : 'translate-y-[110%]'
                      }`}
                  >
                    <div className="mx-auto max-w-2xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] rounded-t-[2rem] overflow-hidden">
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
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <MarketIntelligence businesses={filteredBusinesses} />
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-1000">
            <Dashboard
              businessCount={businesses.length}
              providerCount={providerCount}
              townCount={townCount}
              onImportClick={openImportModal}
              onViewMapClick={() => setViewMode('map')}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <ImportModal
        isOpen={isImportOpen}
        isImporting={isImporting}
        onClose={() => setIsImportOpen(false)}
        onFileSelected={handleFileSelected}
        onLoadSample={handleImportSample}
        errorMessage={importError}
      />

      <ImportMappingModal
        isOpen={isMappingOpen}
        columns={importColumns}
        initialMapping={{}}
        onConfirm={handleConfirmMapping}
        onBack={() => { setIsMappingOpen(false); setIsImportOpen(true); }}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  );
}

export default App;


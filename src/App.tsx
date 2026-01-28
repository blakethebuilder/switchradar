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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto mb-6 h-20 w-20 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-200">
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">
                Switch<span className="text-indigo-600">Radar</span>
              </h1>
              <p className="text-sm font-semibold text-slate-400">Powered by Smart Integrate</p>
              <p className="text-xs text-slate-500 mt-4 max-w-sm mx-auto">
                Lead Intelligence & Route Planning Platform
              </p>
            </div>
            <div className="glass-card rounded-3xl shadow-2xl border border-slate-100 p-8">
              <h2 className="text-xl font-black text-slate-900 mb-6 text-center">Sign In to Continue</h2>
              <LoginModal isOpen={true} onClose={() => {}} onLoginSuccess={() => loadFromCloud(token)} />
            </div>
            <div className="mt-8 text-center">
              <p className="text-xs text-slate-400">
                Secure cloud-synced workspace for your business intelligence
              </p>
            </div>
          </div>
        </div>
      </div>
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
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Active</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                      {lastImportName || 'Workspace Live'}
                    </h1>
                  </div>

                  <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex flex-col items-center px-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Leads</span>
                      <span className="text-xl font-black text-slate-900">{businesses.length.toLocaleString()}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="flex flex-col items-center px-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Providers</span>
                      <span className="text-xl font-black text-slate-900">{providerCount}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="flex flex-col items-center px-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Selected</span>
                      <span className="text-xl font-black text-emerald-600">{filteredBusinesses.length.toLocaleString()}</span>
                    </div>
                  </div>
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
              ) : viewMode === 'settings' ? (
                <DbSettingsPage businesses={businesses} onClose={() => setViewMode('table')} />
              ) : (
                <MarketIntelligence businesses={filteredBusinesses} />
              )}
            </div>
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
      <ImportModal isOpen={isImportOpen} isImporting={isImporting} onClose={() => setIsImportOpen(false)} onFileSelected={handleFileSelected} onLoadSample={handleImportSample} errorMessage={importError} />
      <ImportMappingModal isOpen={isMappingOpen} columns={importColumns} initialMapping={{}} onConfirm={handleConfirmMapping} onBack={() => { setIsMappingOpen(false); setIsImportOpen(true); }} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLoginSuccess={() => loadFromCloud(token)} />
    </div>
  );
}

export default App;

import { useState, useEffect, useCallback, useMemo } from 'react';
import { WorkspaceFilters } from './components/WorkspaceFilters';
import { BusinessTable } from './components/BusinessTable';
import { BusinessMap } from './components/BusinessMap';
import { MarketIntelligence } from './components/MarketIntelligence';
import { Dashboard } from './components/Dashboard';
import { ImportModal } from './components/ImportModal';
import { ImportMappingModal } from './components/ImportMappingModal';
import { TopNav } from './components/TopNav';
import { LoginModal } from './components/LoginModal';
import { ClientDetails } from './components/ClientDetails';
import { RouteView } from './components/RouteView';
import { DbSettingsPage } from './components/DbSettingsPage';
import { useAuth } from './context/AuthContext';
import { useBusinessData } from './hooks/useBusinessData';
import { useCloudSync } from './hooks/useCloudSync';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { processImportedData, sampleData } from './utils/dataProcessors';
import { db } from './db';
import './App.css';
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
    loadFromCloud,
    droppedPin,
    setDroppedPin,
    radiusKm,
    setRadiusKm
  } = useBusinessData();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [lastImportName, setLastImportName] = useState('');
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [pendingFileName, setPendingFileName] = useState('');
  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<{ center: [number, number], zoom: number } | null>(null);

  const { isAuthenticated, token } = useAuth();
  const { isSyncing, lastSyncTime, clearCloudData, pushToCloud } = useCloudSync(businesses, routeItems, isAuthenticated, token);

  const handleUpdateBusiness = async (id: string, updates: Partial<Business>) => {
    await db.businesses.update(id, updates);
  };
  
  useEffect(() => {
    if (isAuthenticated && token) {
      loadFromCloud(token);
    }
  }, [isAuthenticated, token, loadFromCloud]);

  const providerCount = useMemo(() => availableProviders.length, [availableProviders]);

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
        } catch (error) {
          setImportError('Invalid JSON file format.');
        }
      } else {
        import('xlsx').then(XLSX => {
             const workbook = XLSX.read(data, { type: 'array' });
             const sheetName = workbook.SheetNames[0];
             const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<string, unknown>[];
             setImportRows(rows as any[]);
             setImportColumns(Object.keys(rows[0] || {}));
             setIsMappingOpen(true);
             setIsImportOpen(false);
         }).catch((_error) => setImportError('Failed to load Excel parser'));
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
    } catch (error) {
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

  const handleToggleProvider = useCallback((provider: string) => {
    setVisibleProviders(prev =>
      prev.includes(provider) ? prev.filter(p => p !== provider) : [...prev, provider]
    );
  }, []);
  
  const handleSelectAllProviders = useCallback(() => setVisibleProviders(availableProviders), [availableProviders]);
  const handleClearProviders = useCallback(() => setVisibleProviders([]), []);
  
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('');
    setVisibleProviders(availableProviders);
  }, [availableProviders]);

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

  const handleSelectBusinessOnMap = useCallback((b: Business) => {
    setSelectedBusiness(b);
  }, []);
  
  const handleTogglePhoneType = async (id: string, currentType: 'landline' | 'mobile') => {
    const newType = currentType === 'landline' ? 'mobile' : 'landline';
    await db.businesses.update(id, { phoneTypeOverride: newType });
  };

  const handleExport = () => {
    import('xlsx').then(XLSX => {
        const worksheet = XLSX.utils.json_to_sheet(filteredBusinesses);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Businesses");
        XLSX.writeFile(workbook, "switchradar_export.xlsx");
    });
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
      <LoginModal isOpen={true} onClose={() => {}} onLoginSuccess={() => loadFromCloud(token)} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 flex flex-col relative overflow-hidden">
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
        onPullFromCloud={() => loadFromCloud(token)}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {businesses.length > 0 ? (
          <div className="flex-1 flex flex-col h-full relative">
            {(viewMode === 'table' || viewMode === 'stats') && (
              <div className="p-4 md:p-6 lg:p-8 pb-0">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Active</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                      {lastImportName || 'Workspace Live'}
                    </h1>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white px-3 py-3 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto no-scrollbar">
                    <div className="flex flex-col items-center px-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Businesses</span>
                      <span className="text-xl font-black text-slate-900">{businesses.length.toLocaleString()}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-100 hidden md:block" />
                    <div className="flex flex-col items-center px-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Providers</span>
                      <span className="text-xl font-black text-slate-900">{providerCount}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-100 hidden md:block" />
                    <div className="flex flex-col items-center px-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Selected</span>
                      <span className="text-xl font-black text-emerald-600">{filteredBusinesses.length.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'table' && (
              <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 pt-0">
                <div className="mb-8">
                  <WorkspaceFilters
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    phoneType={phoneType}
                    onPhoneTypeChange={setPhoneType}
                    categories={categories}
                    availableProviders={availableProviders}
                    visibleProviders={visibleProviders}
                    onToggleProvider={handleToggleProvider}
                    onSelectAllProviders={handleSelectAllProviders}
                    onClearProviders={handleClearProviders}
                    onClearFilters={handleClearFilters}
                    isVisible={isFiltersVisible}
                    onToggleVisibility={() => setIsFiltersVisible(!isFiltersVisible)}
                    variant="table"
                  />
                </div>
                
                <BusinessTable
                  businesses={filteredBusinesses}
                  onBusinessSelect={(b) => {
                    setSelectedBusiness(b);
                    setViewMode('map');
                    setMapTarget({ center: [b.coordinates.lat, b.coordinates.lng], zoom: 15 });
                  }}
                  onDelete={handleDeleteBusiness}
                  onTogglePhoneType={handleTogglePhoneType}
                  onAddToRoute={handleAddToRoute}
                />
              </div>
            )}

            {viewMode === 'map' && (
              <div className="absolute inset-0 w-full h-full">
                <div className="absolute top-4 left-0 right-0 z-[2000] px-4">
                  <div className="max-w-4xl mx-auto">
                    <WorkspaceFilters
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      selectedCategory={selectedCategory}
                      onCategoryChange={setSelectedCategory}
                      phoneType={phoneType}
                      onPhoneTypeChange={setPhoneType}
                      categories={categories}
                      availableProviders={availableProviders}
                      visibleProviders={visibleProviders}
                      onToggleProvider={handleToggleProvider}
                      onSelectAllProviders={handleSelectAllProviders}
                      onClearProviders={handleClearProviders}
                      onClearFilters={handleClearFilters}
                      isVisible={isFiltersVisible}
                      onToggleVisibility={() => setIsFiltersVisible(!isFiltersVisible)}
                      droppedPin={droppedPin}
                      radiusKm={radiusKm}
                      setRadiusKm={setRadiusKm}
                      variant="map"
                    />
                  </div>
                </div>

                <BusinessMap
                  businesses={filteredBusinesses}
                  targetLocation={mapTarget?.center}
                  zoom={mapTarget?.zoom}
                  fullScreen={true}
                  onBusinessSelect={handleSelectBusinessOnMap}
                  droppedPin={droppedPin}
                  setDroppedPin={setDroppedPin}
                  radiusKm={radiusKm}
                />
              </div>
            )}

            {viewMode === 'route' && (
                <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                    <RouteView 
                        routeItems={routeItems} 
                        businesses={businesses} 
                        onRemoveFromRoute={handleRemoveFromRoute}
                        onClearRoute={handleClearRoute}
                        onSelectBusiness={(b) => {
                            setSelectedBusiness(b);
                        }}
                    />
                </div>
            )}

            {viewMode === 'settings' && (
              <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                  <CloudSyncPanel
                    businesses={businesses}
                    routeItems={routeItems}
                    onSyncComplete={() => loadFromCloud(token)}
                    lastSyncTime={lastSyncTime}
                    isSyncing={isSyncing}
                  />
                  <DbSettingsPage businesses={businesses} onClose={() => setViewMode('table')} />
                </div>
              </div>
            )}

            {viewMode === 'stats' && (
              <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 pt-0">
                <MarketIntelligence businesses={filteredBusinesses} droppedPin={droppedPin} radiusKm={radiusKm} />
              </div>
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

      {/* Client Detail Sidebar */}
      <div 
        className={`fixed top-0 right-0 bottom-0 z-[1003] w-full md:max-w-sm lg:max-w-md bg-white shadow-2xl transition-transform duration-300 ease-in-out border-l border-slate-100 ${
          selectedBusiness ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedBusiness && (
          <ClientDetails
              business={selectedBusiness}
              isInRoute={routeItems.some(i => i.businessId === selectedBusiness.id)}
              onAddToRoute={handleAddToRoute}
              onRemoveFromRoute={handleRemoveFromRoute}
              onClose={() => setSelectedBusiness(null)}
              onTogglePhoneType={handleTogglePhoneType}
              onUpdateBusiness={handleUpdateBusiness}
          />
        )}
      </div>

      <ImportModal isOpen={isImportOpen} isImporting={isImporting} onClose={() => setIsImportOpen(false)} onFileSelected={handleFileSelected} onLoadSample={handleImportSample} errorMessage={importError} />
      <ImportMappingModal isOpen={isMappingOpen} columns={importColumns} initialMapping={{}} onConfirm={handleConfirmMapping} onBack={() => { setIsMappingOpen(false); setIsImportOpen(true); }} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLoginSuccess={() => loadFromCloud(token)} />
    </div>
  );
}

export default App;

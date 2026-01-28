import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { FilterPanel } from './components/FilterPanel';
import { BusinessTable } from './components/BusinessTable';
import { BusinessMap } from './components/BusinessMap';
import { Dashboard } from './components/Dashboard';
import { ImportModal } from './components/ImportModal';
import { ImportMappingModal } from './components/ImportMappingModal';
import { TopNav } from './components/TopNav';
import { ProviderBar } from './components/ProviderBar';
import type { Business, ImportMapping, ViewMode } from './types';
import { sampleData, filterBusinesses, processImportedData } from './utils/dataProcessors';
import './App.css';
import { Database, Network, MapPin as MapPinIcon, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';

import { db } from './db';
import { useLiveQuery } from 'dexie-react-hooks';

const defaultMapCenter: [number, number] = [-26.8521, 26.6667];

function App() {
  const businesses = useLiveQuery(() => db.businesses.toArray()) || [];
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [visibleProviders, setVisibleProviders] = useState<string[]>([]);
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

  const filteredBusinesses = useMemo(() => {
    return filterBusinesses(businesses, {
      searchTerm,
      selectedTown,
      visibleProviders
    });
  }, [businesses, searchTerm, selectedTown, visibleProviders]);

  const towns = useMemo(
    () => Array.from(new Set(businesses.map(b => b.town))).filter(Boolean).sort(),
    [businesses]
  );
  const availableProviders = useMemo(
    () => Array.from(new Set(businesses.map(b => b.provider))).filter(Boolean).sort(),
    [businesses]
  );
  const providerCount = availableProviders.length;
  const townCount = towns.length;

  const applyNewBusinesses = async (items: Business[], sourceName: string) => {
    const providers = Array.from(new Set(items.map(b => b.provider))).filter(Boolean);
    await db.businesses.clear();
    await db.businesses.bulkAdd(items);
    setVisibleProviders(providers);
    setSearchTerm('');
    setSelectedTown('');
    setLastImportName(sourceName);
  };

  const openImportModal = () => {
    setImportError('');
    setIsMappingOpen(false);
    setIsImportOpen(true);
  };

  const handleImportSample = () => {
    applyNewBusinesses(sampleData, 'Demo Dataset');
    setViewMode('table');
    setIsImportOpen(false);
    setIsMappingOpen(false);
    setImportRows([]);
    setImportColumns([]);
    setPendingFileName('');
  };

  const parseFileToRows = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.json')) {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array of objects.');
      }
      return parsed as Record<string, any>[];
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No worksheet found in file.');
    }
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];
  };

  const handleFileSelected = async (file: File) => {
    setIsImporting(true);
    setImportError('');
    try {
      const rows = await parseFileToRows(file);
      if (rows.length === 0) {
        throw new Error('No rows found to import.');
      }
      const columns = Array.from(
        new Set(rows.slice(0, 100).flatMap(row => Object.keys(row)))
      ).sort();

      setImportRows(rows);
      setImportColumns(columns);
      setPendingFileName(file.name);
      setIsImportOpen(false);
      setIsMappingOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed.';
      setImportError(message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmMapping = (mapping: ImportMapping) => {
    const importedBusinesses = processImportedData(importRows, mapping);
    if (importedBusinesses.length > 0) {
      applyNewBusinesses(importedBusinesses, pendingFileName || 'Recent Upload');
      setViewMode('table');
    }
    setIsMappingOpen(false);
    setImportRows([]);
    setImportColumns([]);
    setPendingFileName('');
  };

  const handleBackToImport = () => {
    setIsMappingOpen(false);
    setIsImportOpen(true);
  };

  const handleToggleProvider = (provider: string) => {
    setVisibleProviders(prev =>
      prev.includes(provider)
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    );
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedTown('');
    setSelectedBusiness(null);
  };

  const handleSelectAllProviders = () => {
    setVisibleProviders(availableProviders);
  };

  const handleClearProviders = () => {
    setVisibleProviders([]);
  };

  const handleExportData = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Name,Address,Phone,Provider,Town,Status\n"
      + filteredBusinesses.map(b =>
        `"${b.name}","${b.address}","${b.phone}","${b.provider}","${b.town}","${b.status}"`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'switchradar_export.csv');
    document.body.appendChild(link);
    link.click();
  };

  const handleClearData = async () => {
    await db.businesses.clear();
    setVisibleProviders([]);
    setSearchTerm('');
    setSelectedTown('');
    setLastImportName('');
  };

  const mapCenter = useMemo(() => {
    if (selectedBusiness) {
      return [selectedBusiness.coordinates.lat, selectedBusiness.coordinates.lng] as [number, number];
    }
    if (filteredBusinesses.length > 0) {
      const firstWithCoords = filteredBusinesses.find(b => b.coordinates.lat && b.coordinates.lng);
      if (firstWithCoords) {
        return [firstWithCoords.coordinates.lat, firstWithCoords.coordinates.lng] as [number, number];
      }
    }
    return defaultMapCenter;
  }, [filteredBusinesses, selectedBusiness]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      <TopNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onImportClick={openImportModal}
        onExportClick={handleExportData}
        onClearData={handleClearData}
        totalCount={businesses.length}
        lastImportName={lastImportName}
      />

      <main className={`flex-grow flex flex-col ${viewMode === 'map' ? 'p-0' : 'max-w-[1600px] mx-auto w-full px-6 py-10 lg:px-12'}`}>
        {businesses.length > 0 ? (
          <div className={`flex flex-col h-full ${viewMode === 'map' ? '' : 'animate-in fade-in slide-in-from-bottom-4 duration-700'}`}>

            {/* Context Header - Only show in Table view or Dashboard */}
            {viewMode === 'table' && (
              <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Workspace</span>
                  </div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                    {lastImportName}
                  </h1>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-100 p-4 px-6 shadow-sm">
                    <Database className="h-5 w-5 text-indigo-500" />
                    <div>
                      <div className="text-lg font-extrabold text-slate-900">{filteredBusinesses.length}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-100 p-4 px-6 shadow-sm">
                    <Network className="h-5 w-5 text-emerald-500" />
                    <div>
                      <div className="text-lg font-extrabold text-slate-900">{providerCount}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Networks</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-100 p-4 px-6 shadow-sm">
                    <MapPinIcon className="h-5 w-5 text-rose-500" />
                    <div>
                      <div className="text-lg font-extrabold text-slate-900">{townCount}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Towns</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* UI Filters Overlay for Map or Standard for Table */}
            <div className={viewMode === 'map' ? 'absolute top-24 left-6 right-6 z-[1000] pointer-events-none' : ''}>
              <div className={viewMode === 'map' ? 'max-w-4xl mx-auto w-full pointer-events-auto flex flex-col gap-4' : ''}>
                {viewMode === 'map' && (
                  <div className="glass-card rounded-[2rem] shadow-2xl border-white/50 backdrop-blur-xl overflow-hidden transition-all duration-500">
                    <div className="p-4 border-b border-white/20 flex items-center justify-between pointer-events-auto">
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
                        towns={towns}
                        onClearFilters={handleClearFilters}
                      />
                    </div>
                  </div>
                )}

                {viewMode === 'table' && (
                  <>
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
                      towns={towns}
                      onClearFilters={handleClearFilters}
                    />
                  </>
                )}
              </div>
            </div>

            <div className={`transition-all duration-500 ${viewMode === 'map' ? 'h-[calc(100vh-80px)] w-full relative' : 'mt-8'}`}>
              {viewMode === 'table' ? (
                <BusinessTable
                  businesses={filteredBusinesses}
                  onBusinessSelect={(b) => {
                    setSelectedBusiness(b);
                    setViewMode('map');
                  }}
                />
              ) : (
                <BusinessMap
                  businesses={filteredBusinesses}
                  center={mapCenter}
                  zoom={12}
                  fullScreen={true}
                />
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
        onBack={handleBackToImport}
      />
    </div>
  );
}

export default App;

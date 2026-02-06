import { useState, useCallback, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { TopNav } from './components/TopNav';
import { LoginModal } from './components/LoginModal';
import { ClientDetailsToolbar } from './components/ClientDetailsToolbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ImportModal } from './components/ImportModal';
import { ImportMappingModal } from './components/ImportMappingModal';
import { ViewRenderer } from './components/ViewRenderer';
import LandingPage from './components/LandingPage';
import { useAuth } from './context/AuthContext';
import { useBusinessData } from './hooks/useBusinessData';
import { useAppState } from './hooks/useAppState';
import { useImportState } from './hooks/useImportState';
import { useBusinessOperations } from './hooks/useBusinessOperations';
import { useRouteOperations } from './hooks/useRouteOperations';
import { ImportService } from './services/importService';
import { ImportLoading } from './components/LoadingStates';
import './App.css';
import type { ImportMapping } from './types';

// Debug log to verify code is running
console.log('🚀 APP: App.tsx loaded at', new Date().toISOString());
// TEMP FORCE COMMIT: CHECK DATA FLOW


function App() {
  console.log('🚀 APP: App component rendering at', new Date().toISOString());

  const { isAuthenticated, token, isAdmin } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Business data hook
  const {
    businesses,
    routeItems,
    filteredBusinesses,
    categories,
    availableTowns,
    availableProviders,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedTown,
    setSelectedTown,
    visibleProviders,
    setVisibleProviders,
    setHasUserInteracted,
    phoneType,
    setPhoneType,
    droppedPin,
    setDroppedPin,
    radiusKm,
    setRadiusKm,
    availableDatasets,
    selectedDatasets,
    setSelectedDatasets,
    loading,
    dbError,
    handleDatabaseReset,
    refetch,
    refetchRoutes,
    loadingProgress,
    cacheStatus,
    hasMore,
    loadMore
  } = useBusinessData();

  // App state hook
  const {
    viewMode,
    isFiltersVisible,
    selectedBusiness,
    selectedBusinessIds,
    mapTarget,
    setViewMode,
    setIsFiltersVisible,
    setSelectedBusiness,
    clearSelection,
    clearSelectedBusiness,
    setMapTargetFromBusiness,
    selectBusinessAndShowOnMap,
    selectBusinessForDetails,
    selectBusinessOnMap,
  } = useAppState();

  // Import state hook
  const {
    isImportOpen,
    isMappingOpen,
    isImporting,
    importError,
    importProgress,
    lastImportName,
    importRows,
    importColumns,
    pendingFileName,
    setImportError,
    setImportProgress,
    setLastImportName,
    setPendingFileName,
    openImportModal,
    closeImportModal,
    openMappingModal,
    closeMappingModal,
    startImporting,
    stopImporting,
    setImportData,
    clearImportData,
  } = useImportState();

  // Business operations hook
  const {
    updateBusiness,
    deleteBusiness,
    bulkDeleteBusinesses,
    togglePhoneType,
    clearAllData,
  } = useBusinessOperations(refetch);

  // Route operations hook
  const {
    addToRoute,
    removeFromRoute,
    clearRoute,
    addSelectedToRoute,
  } = useRouteOperations(routeItems, refetchRoutes);

  console.log('🔐 APP: Auth status check:', {
    isAuthenticated,
    tokenPresent: !!token,
    tokenLength: token?.length,
    timestamp: new Date().toISOString()
  });

  // Force map re-render when switching to map view
  useEffect(() => {
    if (viewMode === 'map') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [viewMode]);

  // Show database error if there's an issue
  if (dbError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Database Error</h2>
            <p className="text-gray-600 mb-6">
              There was an issue with the local database. This usually happens after an update.
            </p>
            <button
              onClick={handleDatabaseReset}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Reset Database
            </button>
            <p className="text-xs text-gray-500 mt-4">
              This will clear your local data. You can re-import or sync from cloud after reset.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [importClearFirst, setImportClearFirst] = useState(false);

  // Import handlers
  const handleFileSelected = async (file: File, clearFirst = false) => {
    console.log('Server import - File selected:', file.name, file.size, file.type, 'clearFirst:', clearFirst);
    setPendingFileName(file.name);
    setImportClearFirst(clearFirst);
    startImporting();

    try {
      const { rows, columns } = await ImportService.processFile(file, setImportProgress);
      setImportData(rows, columns);
      stopImporting();
      openMappingModal();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to process file');
      stopImporting();
    }
  };

  const handleConfirmMapping = async (mapping: ImportMapping) => {
    console.log('🚀 IMPORT: handleConfirmMapping called');

    closeMappingModal();
    startImporting();

    try {
      if (!token) {
        throw new Error('You must be logged in to import data');
      }

      await ImportService.importData(
        importRows,
        mapping,
        token,
        pendingFileName,
        setImportProgress,
        importClearFirst
      );

      // Update UI state
      const providers = Array.from(new Set(importRows.map((row: any) => row[mapping.provider || '']).filter(Boolean)));
      setVisibleProviders(providers);
      setLastImportName(pendingFileName);

      // Refresh data from server
      await refetch();

      closeImportModal();
      console.log('🎉 IMPORT COMPLETE: Import process finished successfully');

    } catch (error) {
      console.error('❌ IMPORT: Import error:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to process data');
      openImportModal();
    } finally {
      stopImporting();
      clearImportData();
    }
  };

  const handleImportSample = async () => {
    console.log('🚀 SAMPLE IMPORT: Starting sample data import');
    startImporting();

    try {
      if (!token) {
        throw new Error('You must be logged in to import data');
      }

      await ImportService.importSampleData(token);
      setLastImportName('Global Sample Dataset');
      await refetch();
      closeImportModal();
      console.log('✅ SAMPLE IMPORT: Sample import completed successfully');
    } catch (error) {
      console.error('❌ SAMPLE IMPORT: Sample import error:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import sample data');
    } finally {
      stopImporting();
    }
  };

  // Filter handlers
  const handleToggleProvider = useCallback((provider: string) => {
    setHasUserInteracted(true);
    setVisibleProviders(prev =>
      prev.includes(provider) ? prev.filter(p => p !== provider) : [...prev, provider]
    );
  }, [setHasUserInteracted, setVisibleProviders]);

  const handleSelectAllProviders = useCallback(() => {
    setHasUserInteracted(true);
    setVisibleProviders(availableProviders);
  }, [availableProviders, setHasUserInteracted, setVisibleProviders]);

  const handleClearProviders = useCallback(() => {
    setHasUserInteracted(true);
    setVisibleProviders([]);
  }, [setHasUserInteracted, setVisibleProviders]);

  const handleClearFilters = useCallback(() => {
    setHasUserInteracted(true);
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedTown('');
    setPhoneType('all');
    setVisibleProviders(availableProviders);
  }, [availableProviders, setHasUserInteracted, setSearchTerm, setSelectedCategory, setSelectedTown, setPhoneType, setVisibleProviders]);

  // Business handlers
  const handleDeleteBusiness = async (id: string) => {
    const deleted = await deleteBusiness(id);
    if (deleted && selectedBusiness?.id === id) {
      clearSelectedBusiness();
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    const deleted = await bulkDeleteBusinesses(ids);
    if (deleted && selectedBusiness && ids.includes(selectedBusiness.id)) {
      clearSelectedBusiness();
    }
  };

  const handleDeleteNonSelectedProviders = async () => {
    if (!token) return;

    if (window.confirm('Delete all businesses from non-selected providers? This cannot be undone.')) {
      try {
        const businessesToDelete = businesses.filter(b => !visibleProviders.includes(b.provider));
        const idsToDelete = businessesToDelete.map(b => b.id);

        const deleted = await bulkDeleteBusinesses(idsToDelete);
        if (deleted && selectedBusiness && businessesToDelete.some(b => b.id === selectedBusiness.id)) {
          clearSelectedBusiness();
        }
      } catch (error) {
        console.error('Failed to delete non-selected providers:', error);
      }
    }
  };

  const handleClearRoute = async () => {
    const cleared = await clearRoute();
    if (cleared) {
      clearSelectedBusiness();
    }
  };

  const handleClearAll = async () => {
    const cleared = await clearAllData();
    if (cleared) {
      clearSelectedBusiness();
    }
  };

  const handleAddSelectedToRoute = async () => {
    const added = await addSelectedToRoute(selectedBusinessIds);
    if (added) {
      clearSelection();
    }
  };

  // Navigation logic for ClientDetails
  const currentBusinessIndex = useMemo(() => {
    if (!selectedBusiness) return -1;
    return filteredBusinesses.findIndex(b => b.id === selectedBusiness.id);
  }, [selectedBusiness, filteredBusinesses]);

  const handleNavigateToNextBusiness = useCallback(() => {
    if (filteredBusinesses.length === 0 || currentBusinessIndex === -1) return;
    const nextIndex = (currentBusinessIndex + 1) % filteredBusinesses.length;
    const nextBusiness = filteredBusinesses[nextIndex];
    setSelectedBusiness(nextBusiness);
    if (viewMode === 'map') {
      setMapTargetFromBusiness(nextBusiness);
    }
  }, [filteredBusinesses, currentBusinessIndex, viewMode, setMapTargetFromBusiness, setSelectedBusiness]);

  const handleNavigateToPrevBusiness = useCallback(() => {
    if (filteredBusinesses.length === 0 || currentBusinessIndex === -1) return;
    const prevIndex = currentBusinessIndex === 0 ? filteredBusinesses.length - 1 : currentBusinessIndex - 1;
    const prevBusiness = filteredBusinesses[prevIndex];
    setSelectedBusiness(prevBusiness);
    if (viewMode === 'map') {
      setMapTargetFromBusiness(prevBusiness);
    }
  }, [filteredBusinesses, currentBusinessIndex, viewMode, setMapTargetFromBusiness, setSelectedBusiness]);

  const handleExport = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(filteredBusinesses);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Businesses");
      XLSX.writeFile(workbook, "switchradar_export.xlsx");
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 flex flex-col relative overflow-hidden">
        <TopNav
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onImportClick={openImportModal}
          onExportClick={handleExport}
          onClearData={handleClearAll}
          totalCount={businesses.length}
          onLoginClick={() => setIsLoginOpen(true)}
          routeItemsCount={routeItems.length}
          cacheStatus={cacheStatus}
          onRefresh={refetch}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {isImporting ? (
            <ImportLoading
              progress={importProgress}
              stage={importProgress?.includes('Uploading') ? 'uploading' :
                importProgress?.includes('Validating') ? 'validating' :
                  importProgress?.includes('Completing') ? 'completing' : 'processing'}
            />
          ) : (
            <ViewRenderer
              viewMode={viewMode}
              businesses={businesses}
              filteredBusinesses={filteredBusinesses}
              categories={categories}
              availableTowns={availableTowns}
              availableProviders={availableProviders}
              availableDatasets={availableDatasets}
              selectedDatasets={selectedDatasets}
              routeItems={routeItems}
              selectedBusiness={selectedBusiness}
              selectedBusinessIds={selectedBusinessIds}
              mapTarget={mapTarget}
              isFiltersVisible={isFiltersVisible}
              lastImportName={lastImportName}
              loading={loading}
              loadingProgress={loadingProgress}
              hasMore={hasMore}
              onLoadMore={loadMore}
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
              selectedTown={selectedTown}
              phoneType={phoneType}
              visibleProviders={visibleProviders}
              droppedPin={droppedPin}
              radiusKm={radiusKm}
              onSearchChange={setSearchTerm}
              onCategoryChange={setSelectedCategory}
              onTownChange={setSelectedTown}
              onPhoneTypeChange={(type: string) => setPhoneType(type as 'all' | 'landline' | 'mobile')}
              onToggleProvider={handleToggleProvider}
              onSelectAllProviders={handleSelectAllProviders}
              onClearProviders={handleClearProviders}
              onClearFilters={handleClearFilters}
              onDatasetChange={setSelectedDatasets}
              onToggleFiltersVisibility={() => setIsFiltersVisible(!isFiltersVisible)}
              onBusinessSelect={selectBusinessForDetails}
              onMapBusinessSelect={selectBusinessOnMap}
              onDeleteBusiness={handleDeleteBusiness}
              onTogglePhoneType={togglePhoneType}
              onAddToRoute={addToRoute}
              onRemoveFromRoute={removeFromRoute}
              onClearRoute={handleClearRoute}
              onBulkDelete={handleBulkDelete}
              onDeleteNonSelectedProviders={handleDeleteNonSelectedProviders}
              onProviderSearch={setSearchTerm}
              onCategorySearch={setSearchTerm}
              onImportClick={openImportModal}
              onExportClick={handleExport}
              onClearData={handleClearAll}
              onAddSelectedToRoute={handleAddSelectedToRoute}
              onClearSelection={clearSelection}
              onProviderFilter={(provider) => {
                setVisibleProviders([provider]);
                setViewMode('map');
              }}
              onViewOnMap={selectBusinessAndShowOnMap}
              onDatasetSelected={(datasetIds: number[]) => {
                setSelectedDatasets(datasetIds);
                refetch();
              }}
              setDroppedPin={setDroppedPin}
              setRadiusKm={setRadiusKm}
              setViewMode={setViewMode}
              isAdmin={isAdmin}
            />
          )}
        </main>

        {/* Client Details Toolbar - Bottom */}
        {selectedBusiness && (
          <ClientDetailsToolbar
            business={selectedBusiness}
            isInRoute={routeItems.some(i => i.businessId === selectedBusiness.id)}
            onAddToRoute={addToRoute}
            onRemoveFromRoute={removeFromRoute}
            onClose={clearSelectedBusiness}
            onTogglePhoneType={togglePhoneType}
            onUpdateBusiness={updateBusiness}
            onDelete={handleDeleteBusiness}
            onNavigateNext={handleNavigateToNextBusiness}
            onNavigatePrev={handleNavigateToPrevBusiness}
            currentIndex={currentBusinessIndex}
            totalCount={filteredBusinesses.length}
          />
        )}

        <ImportModal
          isOpen={isImportOpen}
          isImporting={isImporting}
          onClose={closeImportModal}
          onFileSelected={handleFileSelected}
          onLoadSample={handleImportSample}
          errorMessage={importError}
        />
        <ImportMappingModal
          isOpen={isMappingOpen}
          columns={importColumns}
          initialMapping={{}}
          onConfirm={handleConfirmMapping}
          onBack={closeMappingModal}
        />
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={() => { }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Plus, X, Target } from 'lucide-react';
import * as XLSX from 'xlsx';
import { WorkspaceFilters } from './components/WorkspaceFilters';
import { BusinessTable } from './components/BusinessTable';
import { BusinessMap } from './components/BusinessMap';
import { Dashboard } from './components/Dashboard';
import { TopNav } from './components/TopNav';
import { LoginModal } from './components/LoginModal';
import { ClientDetailsToolbar } from './components/ClientDetailsToolbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import { useAuth } from './context/AuthContext';
import { useBusinessData } from './hooks/useBusinessData';
import { serverDataService } from './services/serverData';
import { processImportedData, sampleData } from './utils/dataProcessors';
import './App.css';
import type { Business, ImportMapping, ViewMode } from './types';

// Debug log to verify code is running
console.log('🚀 APP: App.tsx loaded at', new Date().toISOString());
console.log('🔧 APP: Environment check:', {
  isDev: import.meta.env.DEV,
  mode: import.meta.env.MODE,
  apiUrl: import.meta.env.VITE_API_URL,
  hostname: window.location.hostname
});

// Lazy load heavy components that aren't immediately needed
const MarketIntelligence = lazy(() => import('./components/MarketIntelligence'));
const ImportModal = lazy(() => import('./components/ImportModal'));
const ImportMappingModal = lazy(() => import('./components/ImportMappingModal'));
const RouteView = lazy(() => import('./components/RouteView'));
const DbSettingsPage = lazy(() => import('./components/DbSettingsPage'));
const ManualSyncPanel = lazy(() => import('./components/ManualSyncPanel'));
const SeenClients = lazy(() => import('./components/SeenClients'));
const PresentationView = lazy(() => import('./components/PresentationView'));

// Loading component for lazy-loaded components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);


function App() {
  console.log('🚀 APP: App component rendering at', new Date().toISOString());

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
    refetch
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
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<{ center: [number, number], zoom: number } | null>(null);

  const { isAuthenticated, token } = useAuth();
  
  console.log('🔐 APP: Auth status check:', {
    isAuthenticated,
    tokenPresent: !!token,
    tokenLength: token?.length,
    timestamp: new Date().toISOString()
  });

  // Force map re-render when switching to map view
  useEffect(() => {
    if (viewMode === 'map') {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [viewMode]);

  const handleUpdateBusiness = async (id: string, updates: Partial<Business>) => {
    if (!token) return;
    
    try {
      const result = await serverDataService.updateBusiness(id, updates, token);
      if (result.success) {
        await refetch(); // Refresh data from server
      }
    } catch (error) {
      console.error('Failed to update business:', error);
    }
  };

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

  const providerCount = useMemo(() => availableProviders.length, [availableProviders]);

  const handleFileSelected = (file: File) => {
    console.log('Server import - File selected:', file.name, file.size, file.type);
    setPendingFileName(file.name);
    setImportError(''); // Clear any previous errors
    setIsImporting(true); // Start loading immediately after file selection
    
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setImportError('File is too large. Maximum size is 50MB.');
      setIsImporting(false);
      return;
    }
    
    // Validate file type
    const validExtensions = ['.csv', '.xlsx', '.xls', '.json'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
      setImportError(`Unsupported file type: ${fileExtension}. Please use CSV, Excel, or JSON files.`);
      setIsImporting(false);
      return;
    }
    
    const reader = new FileReader();
    reader.onerror = (error) => {
      console.error('Server import - FileReader error:', error);
      setImportError('Failed to read file. The file may be corrupted or in an unsupported format.');
      setIsImporting(false);
    };
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        console.log('Server import - File read successfully, data type:', typeof data, 'size:', data?.toString().length || 0);
        
        if (!data) {
          setImportError('File appears to be empty or corrupted.');
          setIsImporting(false);
          return;
        }
        
        if (file.name.endsWith('.json')) {
          try {
            const json = JSON.parse(data as string);
            const rows = Array.isArray(json) ? json : [json];
            console.log('Server import - JSON parsed, rows:', rows.length);
            
            if (rows.length === 0) {
              setImportError('JSON file is empty or contains no data.');
              setIsImporting(false);
              return;
            }
            
            // Validate JSON structure
            if (rows.length > 0 && typeof rows[0] !== 'object') {
              setImportError('JSON file must contain an array of objects or a single object.');
              setIsImporting(false);
              return;
            }
            
            setImportRows(rows);
            setImportColumns(Object.keys(rows[0] || {}));
            setIsImporting(false);
            setIsMappingOpen(true);
            setIsImportOpen(false);
          } catch (error) {
            console.error('Server import - JSON parse error:', error);
            setImportError('Invalid JSON file format. Please check the file structure.');
            setIsImporting(false);
          }
        } else {
          // Excel/CSV files
          console.log('Server import - Processing Excel/CSV file');
          
          try {
            // XLSX is already imported at the top, no need for dynamic import
            const workbook = XLSX.read(data, { type: 'array' });
            console.log('Server import - Workbook read, sheets:', workbook.SheetNames);
            
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
              setImportError('No sheets found in the file. Please check the Excel file.');
              setIsImporting(false);
              return;
            }
            
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
              setImportError('Selected sheet is empty or corrupted.');
              setIsImporting(false);
              return;
            }
            
            const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
            console.log('Server import - Sheet parsed, rows:', rows.length);
            
            if (rows.length === 0) {
              setImportError('The spreadsheet appears to be empty. Please check that it contains data.');
              setIsImporting(false);
              return;
            }
            
            // Validate that we have columns
            const columns = Object.keys(rows[0] || {});
            if (columns.length === 0) {
              setImportError('No columns found in the spreadsheet. Please check the file format.');
              setIsImporting(false);
              return;
            }
            
            setImportRows(rows as any[]);
            setImportColumns(columns);
            setIsImporting(false);
            setIsMappingOpen(true);
            setIsImportOpen(false);
          } catch (error) {
            console.error('Server import - XLSX processing error:', error);
            setImportError(`Failed to process spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the file format.`);
            setIsImporting(false);
          }
        }
      } catch (error) {
        console.error('Server import - General file processing error:', error);
        setImportError(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsImporting(false);
      }
    };
    
    // Read file based on type
    try {
      if (file.name.endsWith('.json')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (error) {
      console.error('Server import - File read initiation error:', error);
      setImportError('Failed to start reading file. Please try again.');
      setIsImporting(false);
    }
  };

  const handleConfirmMapping = async (mapping: ImportMapping) => {
    console.log('🚀 IMPORT STEP 4: handleConfirmMapping called');
    console.log('📋 IMPORT STEP 4: Mapping:', mapping);
    console.log('📊 IMPORT STEP 4: Import rows length:', importRows?.length);
    console.log('📊 IMPORT STEP 4: Import columns:', importColumns);
    
    // Close mapping modal and show loading immediately
    setIsMappingOpen(false);
    setIsImporting(true);
    setImportError('');
    
    // Show processing message
    console.log('⏳ IMPORT: Starting data processing...');
    
    // Add a small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      console.log('🚀 IMPORT STEP 5: Processing import with mapping');
      console.log('📊 IMPORT STEP 5: Import rows sample:', importRows?.slice(0, 2));
      
      if (!importRows || importRows.length === 0) {
        console.log('❌ IMPORT STEP 5: No data to import');
        throw new Error('No data to import');
      }
      
      // Check if mapping has required fields
      if (!mapping.name) {
        console.log('❌ IMPORT STEP 5: Business name mapping missing');
        throw new Error('Business name mapping is required');
      }
      
      console.log('🚀 IMPORT STEP 6: Processing imported data');
      
      // Process data in chunks with progress updates
      const processed = await processImportedData(importRows, mapping, (processed, total) => {
        const percentage = Math.round((processed / total) * 100);
        console.log(`📊 Processing progress: ${processed}/${total} (${percentage}%)`);
        
        // Update import status for user feedback more frequently
        setImportError(`Processing data... ${percentage}% complete (${processed}/${total} records)`);
      });
      
      console.log('✅ IMPORT STEP 6: Processed businesses count:', processed.length);
      console.log('📊 IMPORT STEP 6: Processed businesses sample:', processed.slice(0, 2));
      
      if (processed.length === 0) {
        console.log('❌ IMPORT STEP 6: No businesses processed');
        throw new Error('No businesses were processed from the data. Please check your field mappings.');
      }
      
      // Validate processed data
      const validBusinesses = processed.filter(b => b.name && b.name.trim() !== '');
      console.log('✅ IMPORT STEP 6: Valid businesses count:', validBusinesses.length);
      
      if (validBusinesses.length === 0) {
        console.log('❌ IMPORT STEP 6: No valid businesses found');
        throw new Error('No valid businesses found. Please check that the name field is mapped correctly.');
      }
      
      // Update status for server upload
      setImportError('Uploading to server...');
      
      console.log('🚀 IMPORT STEP 7: Calling applyNewBusinesses');
      await applyNewBusinesses(validBusinesses, pendingFileName);
      console.log('✅ IMPORT STEP 7: applyNewBusinesses completed successfully');
      
      // Close import modal on success
      setIsImportOpen(false);
      
    } catch (error) {
      console.error('❌ IMPORT STEP 4-7: Import error:', error);
      setImportError(`Failed to process data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Reopen import modal to show error
      setIsImportOpen(true);
    } finally {
      setIsImporting(false);
      // Clear import data
      setImportRows([]);
      setImportColumns([]);
      setPendingFileName('');
    }
  };

  const applyNewBusinesses = async (items: Business[], sourceName: string) => {
    console.log('🚀 IMPORT STEP 8: applyNewBusinesses called');
    console.log('📊 IMPORT STEP 8: Items count:', items.length);
    console.log('📊 IMPORT STEP 8: Source name:', sourceName);
    console.log('🔐 IMPORT STEP 8: Auth check - token present:', !!token, 'isAuthenticated:', isAuthenticated);
    
    try {
      const providers = Array.from(new Set(items.map(b => b.provider))).filter(Boolean);
      console.log('📊 IMPORT STEP 8: Providers found:', providers);
      
      // Check if user is authenticated
      if (!token || !isAuthenticated) {
        console.log('❌ IMPORT STEP 8: User not authenticated');
        throw new Error('You must be logged in to import data');
      }
      
      // Send data to server instead of IndexedDB
      console.log('🚀 IMPORT STEP 9: Sending data to server...');
      console.log('📊 IMPORT STEP 9: Sample business data:', items[0]);
      
      const result = await serverDataService.saveBusinesses(items, token, {
        source: sourceName,
        town: items[0]?.town || 'Mixed'
      });
      console.log('📥 IMPORT STEP 9: Server response:', result);
      
      if (!result.success) {
        console.log('❌ IMPORT STEP 9: Server save failed:', result.error);
        throw new Error(result.error || 'Failed to save data to server');
      }
      
      console.log('✅ IMPORT STEP 9: Data saved to server successfully');
      
      // Update UI state
      console.log('🚀 IMPORT STEP 10: Updating UI state');
      setVisibleProviders(providers);
      setLastImportName(sourceName);
      console.log('✅ IMPORT STEP 10: UI state updated');
      
      // Refresh data from server to update the UI
      console.log('🚀 IMPORT STEP 11: Refreshing data from server...');
      console.log('📊 IMPORT STEP 11: Current businesses count before refresh:', businesses.length);
      
      try {
        await refetch(); // Force refresh the data
        console.log('✅ IMPORT STEP 11: Data refresh completed');
      } catch (refreshError) {
        console.error('❌ IMPORT STEP 11: Data refresh failed:', refreshError);
        // Don't throw here, import was successful even if refresh failed
      }
      
      console.log('🎉 IMPORT COMPLETE: Import process finished successfully');
      console.log('📊 IMPORT COMPLETE: Final businesses count:', businesses.length);
      
    } catch (error) {
      console.error('❌ IMPORT STEP 8-11: Error in applyNewBusinesses:', error);
      throw error;
    }
  };

  const handleImportSample = async () => {
    console.log('🚀 SAMPLE IMPORT: Starting sample data import');
    console.log('📊 SAMPLE IMPORT: Sample data:', sampleData.length, 'businesses');
    console.log('🔐 SAMPLE IMPORT: Auth status - isAuthenticated:', isAuthenticated, 'token present:', !!token);
    
    setIsImporting(true);
    try {
      await applyNewBusinesses(sampleData, 'Global Sample Dataset');
      console.log('✅ SAMPLE IMPORT: Sample import completed successfully');
      setIsImportOpen(false);
    } catch (error) {
      console.error('❌ SAMPLE IMPORT: Sample import error:', error);
      setImportError(`Failed to import sample data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleToggleProvider = useCallback((provider: string) => {
    setHasUserInteracted(true);
    setVisibleProviders(prev =>
      prev.includes(provider) ? prev.filter(p => p !== provider) : [...prev, provider]
    );
  }, [setHasUserInteracted]);
  
  const handleSelectAllProviders = useCallback(() => {
    setHasUserInteracted(true);
    setVisibleProviders(availableProviders);
  }, [availableProviders, setHasUserInteracted]);
  
  const handleClearProviders = useCallback(() => {
    setHasUserInteracted(true);
    setVisibleProviders([]);
  }, [setHasUserInteracted]);
  
  const handleClearFilters = useCallback(() => {
    setHasUserInteracted(true);
    setSearchTerm('');
    setSelectedCategory('');
    setPhoneType('all');
    setVisibleProviders(availableProviders);
  }, [availableProviders, setHasUserInteracted]);

  const handleAddToRoute = async (businessId: string) => {
    if (!token) return;
    
    try {
      const maxOrder = Math.max(...routeItems.map(i => i.order), 0);
      const newRouteItem = { businessId, order: maxOrder + 1, addedAt: new Date() };
      
      // Save to server
      const result = await serverDataService.saveRoutes([...routeItems, newRouteItem], token);
      if (result.success) {
        // Refresh routes from server
        await refetch();
      }
    } catch (error) {
      console.error('Failed to add to route:', error);
    }
  };

  const handleRemoveFromRoute = async (businessId: string) => {
    if (!token) return;
    
    try {
      const updatedRoutes = routeItems.filter(item => item.businessId !== businessId);
      
      // Save to server
      const result = await serverDataService.saveRoutes(updatedRoutes, token);
      if (result.success) {
        // Refresh routes from server
        await refetch();
      }
    } catch (error) {
      console.error('Failed to remove from route:', error);
    }
  };
  
  const handleClearRoute = async () => {
    if (!token) return;
    
    try {
      // Save empty routes to server
      const result = await serverDataService.saveRoutes([], token);
      if (result.success) {
        setSelectedBusiness(null);
        // Refresh routes from server
        await refetch();
      }
    } catch (error) {
      console.error('Failed to clear route:', error);
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    if (!token) return;
    
    if (window.confirm('Are you sure you want to delete this business?')) {
      try {
        const result = await serverDataService.deleteBusiness(id, token);
        if (result.success) {
          if (selectedBusiness?.id === id) setSelectedBusiness(null);
          await refetch(); // Refresh data from server
        }
      } catch (error) {
        console.error('Failed to delete business:', error);
      }
    }
  };

  const handleSelectBusinessOnMap = useCallback((b: Business) => {
    // Use requestAnimationFrame for smoother UI updates on mobile
    requestAnimationFrame(() => {
      setSelectedBusiness(b);
    });
  }, []);

  const handleMultiSelect = useCallback((businesses: Business[]) => {
    setSelectedBusinessIds(businesses.map(b => b.id));
  }, []);

  const handleAddSelectedToRoute = useCallback(async () => {
    if (!token) return;
    
    try {
      const newRouteItems = [...routeItems];
      for (const businessId of selectedBusinessIds) {
        const maxOrder = Math.max(...newRouteItems.map(i => i.order), 0);
        newRouteItems.push({ businessId, order: maxOrder + 1, addedAt: new Date() });
      }
      
      const result = await serverDataService.saveRoutes(newRouteItems, token);
      if (result.success) {
        setSelectedBusinessIds([]);
        await refetch(); // Refresh data from server
      }
    } catch (error) {
      console.error('Failed to add selected to route:', error);
    }
  }, [selectedBusinessIds, routeItems, token, refetch]);

  const handleClearSelection = useCallback(() => {
    setSelectedBusinessIds([]);
  }, []);

  // Navigation logic for ClientDetails - proximity-based
  const currentBusinessIndex = useMemo(() => {
    if (!selectedBusiness) return -1;
    return filteredBusinesses.findIndex(b => b.id === selectedBusiness.id);
  }, [selectedBusiness, filteredBusinesses]);

  const handleNavigateToNextBusiness = useCallback(() => {
    if (filteredBusinesses.length === 0 || currentBusinessIndex === -1) return;
    const nextIndex = (currentBusinessIndex + 1) % filteredBusinesses.length;
    const nextBusiness = filteredBusinesses[nextIndex];
    setSelectedBusiness(nextBusiness);
    // If we're on map view, also update the map target
    if (viewMode === 'map') {
      setMapTarget({ center: [nextBusiness.coordinates.lat, nextBusiness.coordinates.lng], zoom: 15 });
    }
  }, [filteredBusinesses, currentBusinessIndex, viewMode]);

  const handleNavigateToPrevBusiness = useCallback(() => {
    if (filteredBusinesses.length === 0 || currentBusinessIndex === -1) return;
    const prevIndex = currentBusinessIndex === 0 ? filteredBusinesses.length - 1 : currentBusinessIndex - 1;
    const prevBusiness = filteredBusinesses[prevIndex];
    setSelectedBusiness(prevBusiness);
    // If we're on map view, also update the map target
    if (viewMode === 'map') {
      setMapTarget({ center: [prevBusiness.coordinates.lat, prevBusiness.coordinates.lng], zoom: 15 });
    }
  }, [filteredBusinesses, currentBusinessIndex, viewMode]);
  
  const handleTogglePhoneType = async (id: string, currentType: 'landline' | 'mobile') => {
    if (!token) return;
    
    const newType = currentType === 'landline' ? 'mobile' : 'landline';
    try {
      const result = await serverDataService.updateBusiness(id, { phoneTypeOverride: newType }, token);
      if (result.success) {
        await refetch(); // Refresh data from server
      }
    } catch (error) {
      console.error('Failed to toggle phone type:', error);
    }
  };

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

  const handleClearAll = async () => {
    if (!token) return;
    
    if (window.confirm('Delete ALL businesses and routes? This cannot be undone.')) {
      try {
        const result = await serverDataService.clearWorkspace(token);
        if (result.success) {
          setSelectedBusiness(null);
          await refetch(); // Refresh data from server
        }
      } catch (error) {
        console.error('Failed to clear all data:', error);
      }
    }
  };

  const openImportModal = () => {
    setImportError('');
    setIsImportOpen(true);
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
          lastImportName={lastImportName}
          onLoginClick={() => setIsLoginOpen(true)}
        />
        
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {loading || isImporting ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-slate-600">
                  {isImporting ? (importError && importError.includes('%') ? importError : 'Processing import...') : 'Loading businesses...'}
                </p>
                {isImporting && importError && importError.includes('%') && (
                  <div className="mt-4 w-64 mx-auto">
                    <div className="bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${importError.match(/(\d+)%/)?.[1] || 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : businesses.length > 0 ? (
            <div className="flex-1 flex flex-col h-full relative">
            {(viewMode === 'table' || viewMode === 'stats' || viewMode === 'seen') && (
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
            )}

            {viewMode === 'table' && (
              <div className="flex-1 overflow-auto p-3 md:p-4 lg:p-6 xl:p-8 pt-0">
                <div className="mb-6 md:mb-8">
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
                    availableDatasets={availableDatasets}
                    selectedDatasets={selectedDatasets}
                    onDatasetChange={setSelectedDatasets}
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
                  onBulkDelete={async (ids) => {
                    if (!token) return;
                    
                    if (window.confirm(`Delete ${ids.length} selected businesses? This cannot be undone.`)) {
                      try {
                        const result = await serverDataService.bulkDelete(ids, token);
                        if (result.success) {
                          if (selectedBusiness && ids.includes(selectedBusiness.id)) {
                            setSelectedBusiness(null);
                          }
                          await refetch(); // Refresh data from server
                        }
                      } catch (error) {
                        console.error('Failed to bulk delete:', error);
                      }
                    }
                  }}
                  onDeleteNonSelectedProviders={async () => {
                    if (!token) return;
                    
                    if (window.confirm('Delete all businesses from non-selected providers? This cannot be undone.')) {
                      try {
                        const businessesToDelete = businesses.filter(b => !visibleProviders.includes(b.provider));
                        const idsToDelete = businessesToDelete.map(b => b.id);
                        
                        const result = await serverDataService.bulkDelete(idsToDelete, token);
                        if (result.success) {
                          if (selectedBusiness && businessesToDelete.some(b => b.id === selectedBusiness.id)) {
                            setSelectedBusiness(null);
                          }
                          await refetch(); // Refresh data from server
                        }
                      } catch (error) {
                        console.error('Failed to delete non-selected providers:', error);
                      }
                    }
                  }}
                  availableProviders={availableProviders}
                  categories={categories}
                  onProviderSearch={(provider) => {
                    setSearchTerm(provider);
                  }}
                  onCategorySearch={(category) => {
                    setSearchTerm(category);
                  }}
                  currentSearchTerm={searchTerm}
                />
              </div>
            )}

            {viewMode === 'map' && (
              <div className="absolute inset-0 w-full h-full flex">
                {/* Sidebar Filters */}
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
                  availableDatasets={availableDatasets}
                  selectedDatasets={selectedDatasets}
                  onDatasetChange={setSelectedDatasets}
                  isVisible={isFiltersVisible}
                  onToggleVisibility={() => setIsFiltersVisible(!isFiltersVisible)}
                  droppedPin={droppedPin}
                  radiusKm={radiusKm}
                  setRadiusKm={setRadiusKm}
                  variant="map"
                />

                {/* Map Container */}
                <div className="flex-1 relative">
                  {/* Multi-Select Panel */}
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
                            onClick={handleClearSelection}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            title="Clear selection"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddSelectedToRoute}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all active:scale-95"
                          >
                            <Plus className="h-4 w-4" />
                            Add to Route
                          </button>
                          <button
                            onClick={() => {
                              // Navigate through selected businesses
                              if (selectedBusinessIds.length > 0) {
                                const firstSelected = businesses.find(b => b.id === selectedBusinessIds[0]);
                                if (firstSelected) {
                                  setSelectedBusiness(firstSelected);
                                  setMapTarget({ center: [firstSelected.coordinates.lat, firstSelected.coordinates.lng], zoom: 15 });
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
                    key={`map-${viewMode}-${filteredBusinesses.length}`}
                    businesses={filteredBusinesses}
                    targetLocation={mapTarget?.center}
                    zoom={mapTarget?.zoom}
                    fullScreen={true}
                    onBusinessSelect={handleSelectBusinessOnMap}
                    onMultiSelect={handleMultiSelect}
                    selectedBusinessId={selectedBusiness?.id}
                    selectedBusinessIds={selectedBusinessIds}
                    droppedPin={droppedPin}
                    setDroppedPin={setDroppedPin}
                    radiusKm={radiusKm}
                  />
                </div>
              </div>
            )}

            {viewMode === 'route' && (
                <div className="flex-1 overflow-auto p-3 md:p-4 lg:p-6 xl:p-8">
                    <Suspense fallback={<LoadingSpinner />}>
                        <RouteView 
                            routeItems={routeItems} 
                            businesses={businesses} 
                            onRemoveFromRoute={handleRemoveFromRoute}
                            onClearRoute={handleClearRoute}
                            onSelectBusiness={(b) => {
                                setSelectedBusiness(b);
                            }}
                        />
                    </Suspense>
                </div>
            )}

            {viewMode === 'settings' && (
              <div className="flex-1 overflow-auto p-3 md:p-4 lg:p-6 xl:p-8">
                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
                  <Suspense fallback={<LoadingSpinner />}>
                    <ManualSyncPanel />
                    <DbSettingsPage 
                      businesses={businesses} 
                      onClose={() => setViewMode('table')} 
                      onImport={openImportModal}
                    />
                  </Suspense>
                </div>
              </div>
            )}

            {viewMode === 'stats' && (
              <div className="flex-1 overflow-auto p-3 md:p-4 lg:p-6 xl:p-8 pt-0">
                <Suspense fallback={<LoadingSpinner />}>
                  <MarketIntelligence 
                    businesses={filteredBusinesses} 
                    droppedPin={droppedPin} 
                    radiusKm={radiusKm}
                    onProviderFilter={(provider) => {
                      setVisibleProviders([provider]);
                      setViewMode('map');
                    }}
                  />
                </Suspense>
              </div>
            )}

            {viewMode === 'seen' && (
              <div className="flex-1 overflow-auto p-3 md:p-4 lg:p-6 xl:p-8 pt-0">
                <Suspense fallback={<LoadingSpinner />}>
                  <SeenClients 
                    businesses={businesses} 
                    onDeleteBusiness={handleDeleteBusiness}
                    onViewOnMap={(business) => {
                      setSelectedBusiness(business);
                      setViewMode('map');
                      setMapTarget({ center: [business.coordinates.lat, business.coordinates.lng], zoom: 15 });
                    }}
                  />
                </Suspense>
              </div>
            )}

            {viewMode === 'present' && (
              <div className="flex-1 h-full">
                <Suspense fallback={<LoadingSpinner />}>
                  <PresentationView 
                    onBack={() => setViewMode('map')}
                  />
                </Suspense>
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

      {/* Client Details Toolbar - Bottom */}
      {selectedBusiness && (
        <ClientDetailsToolbar
          business={selectedBusiness}
          isInRoute={routeItems.some(i => i.businessId === selectedBusiness.id)}
          onAddToRoute={handleAddToRoute}
          onRemoveFromRoute={handleRemoveFromRoute}
          onClose={() => setSelectedBusiness(null)}
          onTogglePhoneType={handleTogglePhoneType}
          onUpdateBusiness={handleUpdateBusiness}
          onDelete={handleDeleteBusiness}
          onNavigateNext={handleNavigateToNextBusiness}
          onNavigatePrev={handleNavigateToPrevBusiness}
          currentIndex={currentBusinessIndex}
          totalCount={filteredBusinesses.length}
        />
      )}

      <Suspense fallback={null}>
        <ImportModal isOpen={isImportOpen} isImporting={isImporting} onClose={() => setIsImportOpen(false)} onFileSelected={handleFileSelected} onLoadSample={handleImportSample} errorMessage={importError} />
        <ImportMappingModal isOpen={isMappingOpen} columns={importColumns} initialMapping={{}} onConfirm={handleConfirmMapping} onBack={() => { setIsMappingOpen(false); setIsImportOpen(true); }} />
      </Suspense>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLoginSuccess={() => {}} />
    </div>
    </ErrorBoundary>
  );
}

export default App;

import { useState, useCallback } from 'react';

export const useImportState = () => {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importProgress, setImportProgress] = useState('');
  const [lastImportName, setLastImportName] = useState('');
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [pendingFileName, setPendingFileName] = useState('');

  const openImportModal = useCallback(() => {
    setImportError('');
    setImportProgress('');
    setIsImportOpen(true);
  }, []);

  const closeImportModal = useCallback(() => {
    setIsImportOpen(false);
  }, []);

  const openMappingModal = useCallback(() => {
    setIsMappingOpen(true);
    setIsImportOpen(false);
  }, []);

  const closeMappingModal = useCallback(() => {
    setIsMappingOpen(false);
    setIsImportOpen(true);
  }, []);

  const startImporting = useCallback(() => {
    setIsImporting(true);
    setImportError('');
    setImportProgress('');
  }, []);

  const stopImporting = useCallback(() => {
    setIsImporting(false);
  }, []);

  const setImportData = useCallback((rows: Record<string, unknown>[], columns: string[]) => {
    setImportRows(rows);
    setImportColumns(columns);
  }, []);

  const clearImportData = useCallback(() => {
    setImportRows([]);
    setImportColumns([]);
    setPendingFileName('');
  }, []);

  return {
    // State
    isImportOpen,
    isMappingOpen,
    isImporting,
    importError,
    importProgress,
    lastImportName,
    importRows,
    importColumns,
    pendingFileName,
    
    // Actions
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
  };
};
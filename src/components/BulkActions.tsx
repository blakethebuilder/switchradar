import React, { useState } from 'react';
import { Trash2, Filter, CheckSquare, Square, Users, Building2 } from 'lucide-react';
import type { Business } from '../types';

interface BulkActionsProps {
  businesses: Business[];
  selectedBusinessIds: string[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteNonSelectedProviders: () => void;
  onBulkDelete: (ids: string[]) => void;
  availableProviders: string[];
  categories: string[];
  onProviderSearch: (provider: string) => void;
  onCategorySearch: (category: string) => void;
  currentSearchTerm: string;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  businesses,
  selectedBusinessIds,
  onSelectAll,
  onClearSelection,
  onDeleteNonSelectedProviders,
  onBulkDelete,
  availableProviders,
  categories,
  onProviderSearch,
  onCategorySearch,
  currentSearchTerm
}) => {
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const allSelected = businesses.length > 0 && selectedBusinessIds.length === businesses.length;
  const someSelected = selectedBusinessIds.length > 0;

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            onSelectAll();
            break;
          case 'd':
            if (someSelected) {
              e.preventDefault();
              onClearSelection();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSelectAll, onClearSelection, someSelected]);

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      await onBulkDelete(selectedBusinessIds);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteNonSelected = async () => {
    setIsProcessing(true);
    try {
      await onDeleteNonSelectedProviders();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Selection Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={allSelected ? onClearSelection : onSelectAll}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title={allSelected ? "Deselect All (Ctrl+D)" : "Select All (Ctrl+A)"}
            disabled={isProcessing}
            aria-label={allSelected ? "Deselect all businesses" : "Select all businesses"}
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-indigo-600" />
            ) : (
              <Square className="h-4 w-4 text-slate-400" />
            )}
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">
              {selectedBusinessIds.length > 0 ? `${selectedBusinessIds.length} selected` : 'Select All'}
            </span>
            <span className="text-sm font-medium text-slate-700 sm:hidden">
              {selectedBusinessIds.length > 0 ? selectedBusinessIds.length : 'All'}
            </span>
          </button>
        </div>

        {/* Search by Provider */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProviderDropdown(!showProviderDropdown);
              setShowCategoryDropdown(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
            disabled={isProcessing}
            aria-label="Search by provider"
          >
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">Search Provider</span>
            <span className="text-sm font-medium text-slate-700 sm:hidden">Provider</span>
          </button>
          
          {showProviderDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              <div className="p-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                  Select Provider ({availableProviders.length})
                </div>
                {availableProviders.map(provider => (
                  <button
                    key={provider}
                    onClick={() => {
                      onProviderSearch(provider);
                      setShowProviderDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded-md transition-colors"
                  >
                    {provider}
                  </button>
                ))}
                {currentSearchTerm && (
                  <button
                    onClick={() => {
                      onProviderSearch('');
                      setShowProviderDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-md transition-colors border-t border-slate-100 mt-1"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search by Category */}
        <div className="relative">
          <button
            onClick={() => {
              setShowCategoryDropdown(!showCategoryDropdown);
              setShowProviderDropdown(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
            disabled={isProcessing}
            aria-label="Search by category"
          >
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">Search Category</span>
            <span className="text-sm font-medium text-slate-700 sm:hidden">Category</span>
          </button>
          
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              <div className="p-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                  Select Category ({categories.length})
                </div>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      onCategorySearch(category);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded-md transition-colors"
                  >
                    {category}
                  </button>
                ))}
                {currentSearchTerm && (
                  <button
                    onClick={() => {
                      onCategorySearch('');
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-md transition-colors border-t border-slate-100 mt-1"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions - Only show when items are selected */}
        {someSelected && (
          <>
            <div className="h-6 w-px bg-slate-200" />
            
            <button
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Delete ${selectedBusinessIds.length} selected businesses`}
            >
              <Trash2 className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium hidden sm:inline">
                {isProcessing ? 'Deleting...' : 'Delete Selected'}
              </span>
              <span className="text-sm font-medium sm:hidden">
                {isProcessing ? '...' : 'Delete'}
              </span>
            </button>

            <button
              onClick={handleDeleteNonSelected}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Delete businesses from non-selected providers"
            >
              <Filter className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium hidden lg:inline">
                {isProcessing ? 'Processing...' : 'Delete Non-Selected Providers'}
              </span>
              <span className="text-sm font-medium lg:hidden">
                {isProcessing ? '...' : 'Clean Up'}
              </span>
            </button>
          </>
        )}

        {/* Close dropdowns when clicking outside */}
        {(showProviderDropdown || showCategoryDropdown) && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setShowProviderDropdown(false);
              setShowCategoryDropdown(false);
            }}
          />
        )}
      </div>
    </div>
  );
};
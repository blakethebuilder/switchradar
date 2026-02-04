import React, { memo, useState, useMemo } from 'react';
import { Layers, CheckCircle2, Search, X, Eye, EyeOff } from 'lucide-react';
import { getProviderColor } from '../utils/providerColors';

interface ProviderBarProps {
  availableProviders: string[];
  visibleProviders: string[];
  onToggleProvider: (provider: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  compact?: boolean;
}

const ProviderBarComponent: React.FC<ProviderBarProps> = ({
  availableProviders,
  visibleProviders,
  onToggleProvider,
  onSelectAll,
  onClearAll,
  compact = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProviders = useMemo(() => {
    if (!searchTerm) return availableProviders;
    return availableProviders.filter(provider =>
      provider.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableProviders, searchTerm]);

  const selectedCount = visibleProviders.length;
  const totalCount = availableProviders.length;

  if (availableProviders.length === 0) return null;

  const clearSearch = () => setSearchTerm('');

  const handleSelectAll = () => {
    console.log('ProviderBar: Select All clicked');
    onSelectAll();
  };

  const handleClearAll = () => {
    console.log('ProviderBar: Clear All clicked');
    onClearAll();
  };

  const handleToggleProvider = (provider: string) => {
    console.log('ProviderBar: Toggle provider:', provider);
    onToggleProvider(provider);
  };

  return (
    <div className="mb-4 flex flex-col gap-3">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Layers className="h-3 w-3" />
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Providers</h2>
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
              <span>{selectedCount}/{totalCount}</span>
              {searchTerm && (
                <span className="text-indigo-600">• {filteredProviders.length} found</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {selectedCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md">
              <Eye className="h-2.5 w-2.5" />
              <span className="text-[10px] font-bold">{selectedCount}</span>
            </div>
          )}
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-all text-[9px] font-black uppercase tracking-wider"
            title="Select all providers"
          >
            <CheckCircle2 className="h-2.5 w-2.5" />
            All
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all text-[9px] font-black uppercase tracking-wider"
            title="Clear all selections"
          >
            <EyeOff className="h-2.5 w-2.5" />
            None
          </button>
        </div>
      </div>

      {/* Search Bar - Always visible for large lists */}
      {availableProviders.length > 6 && (
        <div className="relative">
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-3 w-3" />
          </div>
          <input
            type="text"
            placeholder="Search providers..."
            className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-8 text-xs font-medium text-slate-700 shadow-sm transition-all focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 outline-none placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      )}

      {/* Scrollable Provider Pills Container - Optimized for sidebar */}
      <div className="relative">
        <div className={`flex gap-1.5 flex-wrap overflow-y-auto custom-scrollbar pb-2 ${
          compact ? 'max-h-32' : 'max-h-48'
        }`}>
          {filteredProviders.map(provider => {
            const isActive = visibleProviders.includes(provider);
            const color = getProviderColor(provider);

            return (
              <button
                key={provider}
                onClick={() => handleToggleProvider(provider)}
                className={`group relative flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-all duration-200 hover:scale-105 shrink-0 ${
                  compact ? 'text-[9px]' : 'text-[10px]'
                } ${isActive
                  ? 'border-indigo-200 bg-white shadow-md ring-1 ring-indigo-100'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 opacity-70 hover:opacity-100 hover:shadow-sm'
                  }`}
                title={`${isActive ? 'Hide' : 'Show'} ${provider} businesses`}
              >
                <div
                  className={`rounded-full ring-1 ring-white shadow-sm transition-transform group-hover:scale-110 flex-shrink-0 ${
                    compact ? 'h-2 w-2' : 'h-2.5 w-2.5'
                  }`}
                  style={{ backgroundColor: color }}
                />
                <span className={`font-bold tracking-tight ${
                  compact ? 'text-[9px]' : 'text-[10px]'
                } ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                  {compact && provider.length > 8 ? provider.substring(0, 8) + '...' : provider}
                </span>
                {isActive && (
                  <CheckCircle2 className={`text-indigo-500 flex-shrink-0 ${
                    compact ? 'h-2 w-2' : 'h-2.5 w-2.5'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Scroll Indicator */}
        {filteredProviders.length > 8 && (
          <div className="absolute right-0 top-0 bottom-2 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        )}
      </div>

      {/* No Results Message */}
      {searchTerm && filteredProviders.length === 0 && (
        <div className="text-center py-3 text-slate-500">
          <div className="text-xs font-medium">No providers found for "{searchTerm}"</div>
          <button
            onClick={clearSearch}
            className="text-[10px] text-indigo-600 hover:text-indigo-700 mt-1 font-medium"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
};

export const ProviderBar = memo(ProviderBarComponent);

import React, { memo, useState, useMemo } from 'react';
import { Layers, CheckCircle2, Search, X, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { getProviderColor } from '../utils/providerColors';

interface ProviderBarProps {
  availableProviders: string[];
  visibleProviders: string[];
  onToggleProvider: (provider: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

const ProviderBarComponent: React.FC<ProviderBarProps> = ({
  availableProviders,
  visibleProviders,
  onToggleProvider,
  onSelectAll,
  onClearAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filteredProviders = useMemo(() => {
    return availableProviders.filter(provider =>
      provider.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableProviders, searchTerm]);

  const displayedProviders = useMemo(() => {
    if (showAll || searchTerm) return filteredProviders;
    return filteredProviders.slice(0, 12); // Show first 12 providers by default
  }, [filteredProviders, showAll, searchTerm]);

  const hiddenCount = filteredProviders.length - displayedProviders.length;
  const selectedCount = visibleProviders.length;
  const totalCount = availableProviders.length;

  if (availableProviders.length === 0) return null;

  const clearSearch = () => setSearchTerm('');

  return (
    <div className="mb-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Network Providers</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <span>{selectedCount} of {totalCount} selected</span>
              {searchTerm && (
                <span className="text-indigo-600">• {filteredProviders.length} found</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg">
              <Eye className="h-3 w-3" />
              <span className="text-xs font-bold">{selectedCount}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <button
              onClick={onSelectAll}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-all"
              title="Select all providers"
            >
              <CheckCircle2 className="h-3 w-3" />
              All
            </button>
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
              title="Clear all selections"
            >
              <EyeOff className="h-3 w-3" />
              None
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar for Providers */}
      {availableProviders.length > 8 && (
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search providers..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-700 shadow-sm transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Provider Pills */}
      <div className="flex flex-wrap gap-2">
        {displayedProviders.map(provider => {
          const isActive = visibleProviders.includes(provider);
          const color = getProviderColor(provider);

          return (
            <button
              key={provider}
              onClick={() => onToggleProvider(provider)}
              className={`group relative flex items-center gap-2 rounded-xl border-2 px-3 py-2 transition-all duration-300 hover:scale-105 ${isActive
                ? 'border-white bg-white shadow-lg ring-2 ring-indigo-100'
                : 'border-slate-100 bg-white/50 hover:border-slate-200 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:shadow-md'
                }`}
              title={`${isActive ? 'Hide' : 'Show'} ${provider} businesses`}
            >
              <div
                className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm transition-transform group-hover:scale-125"
                style={{ backgroundColor: color }}
              />
              <span className={`text-[11px] font-bold tracking-wide ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                {provider}
              </span>
              {isActive && (
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 animate-in zoom-in" />
              )}
            </button>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {!searchTerm && hiddenCount > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-700 text-sm font-medium transition-all hover:shadow-sm"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show {hiddenCount} More
              </>
            )}
          </button>
        </div>
      )}

      {/* No Results Message */}
      {searchTerm && filteredProviders.length === 0 && (
        <div className="text-center py-4 text-slate-500">
          <div className="text-sm font-medium">No providers found for "{searchTerm}"</div>
          <button
            onClick={clearSearch}
            className="text-xs text-indigo-600 hover:text-indigo-700 mt-1"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
};

export const ProviderBar = memo(ProviderBarComponent);

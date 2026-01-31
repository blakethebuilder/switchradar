import { memo } from 'react';
import { Search, X, SlidersHorizontal, Smartphone, Landmark, LayoutGrid, Layers, RotateCcw } from 'lucide-react';

interface FilterPanelProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  phoneType: 'all' | 'landline' | 'mobile';
  onPhoneTypeChange: (type: 'all' | 'landline' | 'mobile') => void;
  categories: string[];
  onClearFilters: () => void;
}

const FilterPanelComponent = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  phoneType,
  onPhoneTypeChange,
  categories,
  onClearFilters
}: FilterPanelProps) => {
  const hasActiveFilters = searchTerm || selectedCategory || phoneType !== 'all';

  const clearSearch = () => {
    console.log('FilterPanel: Clear search');
    onSearchChange('');
  };

  const clearCategory = () => {
    console.log('FilterPanel: Clear category');
    onCategoryChange('');
  };

  const handlePhoneTypeChange = (type: 'all' | 'landline' | 'mobile') => {
    console.log('FilterPanel: Phone type change:', type);
    onPhoneTypeChange(type);
  };

  const handleClearFilters = () => {
    console.log('FilterPanel: Clear all filters');
    onClearFilters();
  };

  return (
    <div className="group relative mb-6">
      <div className="flex flex-col gap-4 lg:gap-6">
        {/* Search Bar - Full Width with Clear Button */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="Search by business name, category or provider..."
            className="h-16 w-full rounded-2xl border-2 border-slate-100 bg-white pl-14 pr-14 text-base font-medium text-slate-700 shadow-sm transition-all focus:border-indigo-500/30 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Phone Type Segment Control */}
          <div className="flex rounded-2xl border-2 border-slate-100 bg-white p-1.5 shadow-sm">
            <button
              onClick={() => handlePhoneTypeChange('all')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${phoneType === 'all'
                ? 'bg-slate-900 text-white shadow-lg scale-105'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:scale-105'
                }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">All Types</span>
              <span className="sm:hidden">All</span>
            </button>
            <button
              onClick={() => handlePhoneTypeChange('landline')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${phoneType === 'landline'
                ? 'bg-emerald-500 text-white shadow-lg scale-105'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:scale-105'
                }`}
            >
              <Landmark className="h-4 w-4" />
              <span className="hidden sm:inline">Landline</span>
              <span className="sm:hidden">Fixed</span>
            </button>
            <button
              onClick={() => handlePhoneTypeChange('mobile')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${phoneType === 'mobile'
                ? 'bg-rose-500 text-white shadow-lg scale-105'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:scale-105'
                }`}
            >
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Mobile</span>
              <span className="sm:hidden">Mobile</span>
            </button>
          </div>

          {/* Category Filter with Clear Button */}
          <div className="relative min-w-[240px]">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500">
              <Layers className="h-5 w-5" />
            </div>
            <select
              className="h-14 w-full appearance-none rounded-2xl border-2 border-slate-100 bg-white pl-14 pr-14 text-base font-medium text-slate-700 shadow-sm transition-all focus:border-indigo-500/30 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none cursor-pointer"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {selectedCategory ? (
              <button
                onClick={clearCategory}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                title="Clear category filter"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Reset All Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex h-14 items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-200 px-6 text-xs font-bold uppercase tracking-wider text-slate-600 transition-all hover:from-slate-200 hover:to-slate-300 hover:text-slate-800 hover:shadow-md active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              Reset All
            </button>
          )}
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium">
                Search: "{searchTerm}"
                <button onClick={clearSearch} className="hover:bg-indigo-200 rounded p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
                Category: {selectedCategory}
                <button onClick={clearCategory} className="hover:bg-emerald-200 rounded p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {phoneType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-medium">
                Type: {phoneType}
                <button onClick={() => handlePhoneTypeChange('all')} className="hover:bg-rose-200 rounded p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const FilterPanel = memo(FilterPanelComponent);

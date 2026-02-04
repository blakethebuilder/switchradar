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
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filters</h4>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded"
          >
            Reset
          </button>
        )}
      </div>

      {/* Compact Search Bar */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Search className="h-3 w-3" />
        </div>
        <input
          type="text"
          placeholder="Search businesses..."
          className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-xs font-medium text-slate-700 shadow-sm transition-all focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 outline-none placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title="Clear search"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {/* Compact Phone Type Buttons */}
      <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
        <button
          onClick={() => handlePhoneTypeChange('all')}
          className={`flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${phoneType === 'all'
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
        >
          <LayoutGrid className="h-2.5 w-2.5" />
          All
        </button>
        <button
          onClick={() => handlePhoneTypeChange('landline')}
          className={`flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${phoneType === 'landline'
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
        >
          <Landmark className="h-2.5 w-2.5" />
          Fixed
        </button>
        <button
          onClick={() => handlePhoneTypeChange('mobile')}
          className={`flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${phoneType === 'mobile'
            ? 'bg-rose-500 text-white shadow-sm'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
        >
          <Smartphone className="h-2.5 w-2.5" />
          Mobile
        </button>
      </div>

      {/* Compact Category Dropdown */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500">
          <Layers className="h-3 w-3" />
        </div>
        <select
          className="h-8 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-xs font-medium text-slate-700 shadow-sm transition-all focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 outline-none cursor-pointer"
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
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title="Clear category filter"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        ) : (
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
            <SlidersHorizontal className="h-2.5 w-2.5" />
          </div>
        )}
      </div>

      {/* Active Filters Summary - Compact */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Active:</span>
          {searchTerm && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-medium">
              "{searchTerm.length > 10 ? searchTerm.substring(0, 10) + '...' : searchTerm}"
              <button onClick={clearSearch} className="hover:bg-indigo-200 rounded p-0.5">
                <X className="h-2 w-2" />
              </button>
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-medium">
              {selectedCategory.length > 8 ? selectedCategory.substring(0, 8) + '...' : selectedCategory}
              <button onClick={clearCategory} className="hover:bg-emerald-200 rounded p-0.5">
                <X className="h-2 w-2" />
              </button>
            </span>
          )}
          {phoneType !== 'all' && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-medium">
              {phoneType}
              <button onClick={() => handlePhoneTypeChange('all')} className="hover:bg-rose-200 rounded p-0.5">
                <X className="h-2 w-2" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const FilterPanel = memo(FilterPanelComponent);

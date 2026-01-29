import { memo } from 'react';
import { Search, X, SlidersHorizontal, Smartphone, Landmark, LayoutGrid, Layers } from 'lucide-react';

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

  return (
    <div className="group relative mb-6">
      <div className="flex flex-col gap-4 lg:gap-6">
        {/* Search Bar - Full Width */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="Search by business name, category or provider..."
            className="h-16 w-full rounded-2xl border-2 border-slate-100 bg-white pl-14 pr-6 text-base font-medium text-slate-700 shadow-sm transition-all focus:border-indigo-500/30 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Phone Type Segment Control */}
          <div className="flex rounded-2xl border-2 border-slate-100 bg-white p-1.5 shadow-sm">
            <button
              onClick={() => onPhoneTypeChange('all')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors duration-150 ${phoneType === 'all'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">All Types</span>
              <span className="sm:hidden">All</span>
            </button>
            <button
              onClick={() => onPhoneTypeChange('landline')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors duration-150 ${phoneType === 'landline'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <Landmark className="h-4 w-4" />
              <span className="hidden sm:inline">Landline</span>
              <span className="sm:hidden">Fixed</span>
            </button>
            <button
              onClick={() => onPhoneTypeChange('mobile')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors duration-150 ${phoneType === 'mobile'
                ? 'bg-rose-500 text-white shadow-lg'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Mobile</span>
              <span className="sm:hidden">Mobile</span>
            </button>
          </div>

          {/* Category Filter */}
          <div className="relative min-w-[240px]">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500">
              <Layers className="h-5 w-5" />
            </div>
            <select
              className="h-14 w-full appearance-none rounded-2xl border-2 border-slate-100 bg-white pl-14 pr-12 text-base font-medium text-slate-700 shadow-sm transition-all focus:border-indigo-500/30 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none cursor-pointer"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex h-14 items-center gap-3 rounded-2xl bg-slate-100 px-6 text-xs font-bold uppercase tracking-wider text-slate-600 transition-all hover:bg-slate-200 hover:text-slate-800 active:scale-95"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const FilterPanel = memo(FilterPanelComponent);

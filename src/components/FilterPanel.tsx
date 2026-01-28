import { Search, X, MapPin, SlidersHorizontal, Smartphone, Landmark, LayoutGrid } from 'lucide-react';

interface FilterPanelProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedTown: string;
  onTownChange: (town: string) => void;
  phoneType: 'all' | 'landline' | 'mobile';
  onPhoneTypeChange: (type: 'all' | 'landline' | 'mobile') => void;
  towns: string[];
  onClearFilters: () => void;
}

export const FilterPanel = ({
  searchTerm,
  onSearchChange,
  selectedTown,
  onTownChange,
  phoneType,
  onPhoneTypeChange,
  towns,
  onClearFilters
}: FilterPanelProps) => {
  const hasActiveFilters = searchTerm || selectedTown || phoneType !== 'all';

  return (
    <div className="group relative mb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search by business name, category or provider..."
            className="h-14 w-full rounded-2xl border-2 border-slate-100 bg-white pl-12 pr-6 text-sm font-semibold text-slate-700 shadow-sm transition-all focus:border-indigo-500/30 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none placeholder:text-slate-300"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Phone Type Segment Control */}
        <div className="flex rounded-2xl border-2 border-slate-100 bg-white p-1 shadow-sm">
          <button
            onClick={() => onPhoneTypeChange('all')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${phoneType === 'all'
              ? 'bg-slate-900 text-white shadow-lg'
              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">All</span>
          </button>
          <button
            onClick={() => onPhoneTypeChange('landline')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${phoneType === 'landline'
              ? 'bg-emerald-500 text-white shadow-lg'
              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
          >
            <Landmark className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Fixed</span>
          </button>
          <button
            onClick={() => onPhoneTypeChange('mobile')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${phoneType === 'mobile'
              ? 'bg-rose-500 text-white shadow-lg'
              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Mobile</span>
          </button>
        </div>

        {/* Town Filter */}
        <div className="relative min-w-[200px]">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500">
            <MapPin className="h-4 w-4" />
          </div>
          <select
            className="h-14 w-full appearance-none rounded-2xl border-2 border-slate-100 bg-white pl-12 pr-10 text-sm font-bold text-slate-700 shadow-sm transition-all focus:border-indigo-500/30 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none cursor-pointer"
            value={selectedTown}
            onChange={(e) => onTownChange(e.target.value)}
          >
            <option value="">Select Town...</option>
            {towns.map(town => (
              <option key={town} value={town}>{town}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex h-14 items-center gap-2 rounded-2xl bg-slate-50 px-6 text-[10px] font-black tracking-widest text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
            RESET
          </button>
        )}
      </div>
    </div>
  );
};

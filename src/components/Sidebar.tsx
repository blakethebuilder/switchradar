import { Database, Download, Filter, Layers, Map, Table, Trash2, Upload } from 'lucide-react';
import { PROVIDER_COLORS } from '../utils/providerColors';
import type { ViewMode } from '../types';

type SidebarTab = 'import' | 'manage' | 'layers';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onImportClick: () => void;
  onExportClick: () => void;
  onClearData: () => void;
  totalCount: number;
  filteredCount: number;
  providerCount: number;
  townCount: number;
  availableProviders: string[];
  visibleProviders: string[];
  onToggleProvider: (provider: string) => void;
  onSelectAllProviders: () => void;
  onClearProviders: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedTown: string;
  onTownChange: (town: string) => void;
  towns: string[];
}

export const Sidebar = ({
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  onImportClick,
  onExportClick,
  onClearData,
  totalCount,
  filteredCount,
  providerCount,
  townCount,
  availableProviders,
  visibleProviders,
  onToggleProvider,
  onSelectAllProviders,
  onClearProviders,
  searchTerm,
  onSearchChange,
  selectedTown,
  onTownChange,
  towns
}: SidebarProps) => {
  return (
    <aside className="w-full border-r border-slate-200 bg-white shadow-xl lg:w-80">
      <div className="border-b border-slate-200 bg-indigo-600 px-6 py-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Local dataset</p>
            <h2 className="text-2xl font-black">{totalCount.toLocaleString()}</h2>
          </div>
          <button
            type="button"
            onClick={onClearData}
            disabled={totalCount === 0}
            className="rounded-full border border-white/30 p-2 text-white/80 transition hover:bg-white/10 disabled:opacity-50"
            title="Clear all data"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
          {filteredCount.toLocaleString()} visible
        </p>
      </div>

      <div className="flex border-b border-slate-200 bg-slate-50">
        {([
          { id: 'import', label: 'Import', icon: Upload },
          { id: 'manage', label: 'Manage', icon: Database },
          { id: 'layers', label: 'Layers', icon: Layers }
        ] as const).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition ${
              activeTab === tab.id
                ? 'bg-white text-indigo-600 border-b-4 border-indigo-600'
                : 'text-slate-400'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        {activeTab === 'import' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Quick import</p>
              <p className="mt-2 text-sm font-bold text-slate-700">CSV / XLSX / JSON</p>
              <p className="text-xs text-slate-500">Use the import button above to load new leads.</p>
              <button
                type="button"
                onClick={onImportClick}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg hover:from-indigo-700 hover:to-purple-700"
              >
                Import dataset
              </button>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Search database</p>
              <div className="relative mt-3">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  placeholder="Filter businesses..."
                  value={searchTerm}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {filteredCount.toLocaleString()} results
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Town filter</p>
              <select
                value={selectedTown}
                onChange={(event) => onTownChange(event.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All towns</option>
                {towns.map(town => (
                  <option key={town} value={town}>{town}</option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Exports</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onExportClick}
                  disabled={totalCount === 0}
                  className="rounded-xl border border-slate-200 bg-white py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-50"
                >
                  <Download className="mx-auto h-4 w-4 mb-1" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={onExportClick}
                  disabled={totalCount === 0}
                  className="rounded-xl border border-slate-200 bg-white py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-50"
                >
                  <Download className="mx-auto h-4 w-4 mb-1" />
                  JSON
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'layers' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">View mode</p>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => onViewModeChange('table')}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${
                    viewMode === 'table'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    Table view
                  </span>
                  <span className="h-2 w-2 rounded-full bg-current" />
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange('map')}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${
                    viewMode === 'map'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    Map view
                  </span>
                  <span className="h-2 w-2 rounded-full bg-current" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Provider filter</p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                  <button type="button" onClick={onSelectAllProviders} className="hover:text-indigo-600">Show all</button>
                  <span>|</span>
                  <button type="button" onClick={onClearProviders} className="hover:text-rose-500">Clear</button>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {availableProviders.map(provider => {
                  const active = visibleProviders.includes(provider);
                  const color = PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS] || PROVIDER_COLORS.Default;
                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => onToggleProvider(provider)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${
                        active ? 'border-indigo-600 bg-white text-slate-700 shadow-sm' : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                        {provider}
                      </span>
                      <span className={`h-3 w-3 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Coverage stats</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-slate-500">
                  <div className="text-lg text-indigo-600">{providerCount}</div>
                  Providers
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-slate-500">
                  <div className="text-lg text-emerald-600">{townCount}</div>
                  Towns
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

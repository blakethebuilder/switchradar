import { Database, Download, Map, Table, Trash2, Upload, LayoutPanelLeft, BarChart3, Cloud, User as UserIcon, LogOut } from 'lucide-react';
import type { ViewMode } from '../types';
import { useAuth } from '../context/AuthContext';

interface TopNavProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onImportClick: () => void;
  onExportClick: () => void;
  onClearData: () => void;
  totalCount: number;
  lastImportName?: string;
  onLoginClick: () => void;
  isSyncing?: boolean;
}

export const TopNav = ({
  viewMode,
  onViewModeChange,
  onImportClick,
  onExportClick,
  onClearData,
  totalCount,
  lastImportName,
  onLoginClick,
  isSyncing
}: TopNavProps) => {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
            <LayoutPanelLeft className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 lg:text-2xl">
              Switch<span className="text-indigo-600">Radar</span>
            </h1>
            {lastImportName ? (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Database className="h-3 w-3" />
                {lastImportName} • {totalCount.toLocaleString()} leads
              </p>
            ) : (
              <p className="text-xs font-semibold text-slate-400">Lead management dashboard</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <nav className="hidden items-center gap-1 rounded-2xl bg-slate-100 p-1 md:flex shadow-inner">
            <button
              onClick={() => onViewModeChange('table')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all ${viewMode === 'table'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Table className="h-4 w-4" />
              Table
            </button>
            <button
              onClick={() => onViewModeChange('map')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all ${viewMode === 'map'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Map className="h-4 w-4" />
              Map
            </button>
            <button
              onClick={() => onViewModeChange('stats')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all ${viewMode === 'stats'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <BarChart3 className="h-4 w-4" />
              Intelligence
            </button>
          </nav>

          <div className="h-8 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                {isSyncing && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 animate-pulse">
                    <Cloud className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Syncing</span>
                  </div>
                )}
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex items-center gap-3 pl-2 group relative">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-slate-900 leading-none">{user?.username}</span>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Cloud Connected</span>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-100"
              >
                <UserIcon className="h-3.5 w-3.5" />
                Connect Cloud
              </button>
            )}

            <div className="h-8 w-px bg-slate-200" />

            <button onClick={onImportClick} className="btn-primary">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import Leads</span>
              <span className="sm:hidden">Import</span>
            </button>

            <div className="flex items-center">
              <button
                disabled={totalCount === 0}
                onClick={onExportClick}
                className="btn-secondary rounded-r-none border-r-0"
                title="Export to CSV"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                disabled={totalCount === 0}
                onClick={onClearData}
                className="btn-secondary rounded-l-none border-l border-slate-200 text-slate-400 hover:text-rose-600"
                title="Clear all data"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

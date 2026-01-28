import { useState } from 'react';
import { Database, Download, Map, Table, Trash2, Upload, LayoutPanelLeft, BarChart3, Cloud, User as UserIcon, LogOut, Menu, X } from 'lucide-react';
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
  onClearCloudData?: () => Promise<void>;
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
  isSyncing,
  onClearCloudData
}: TopNavProps) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 md:h-20 max-w-[1600px] items-center justify-between px-4 md:px-6 lg:px-10">

        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
            <LayoutPanelLeft className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900 lg:text-2xl">
              Switch<span className="text-indigo-600">Radar</span>
            </h1>
            {lastImportName ? (
              <p className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-slate-500">
                <Database className="h-3 w-3" />
                {lastImportName} • {totalCount.toLocaleString()} leads
              </p>
            ) : (
              <p className="text-[10px] md:text-xs font-semibold text-slate-400">Lead management dashboard</p>
            )}
          </div>
        </div>

        {/* Center: View Switcher (Visible on all screens, compact on mobile) */}
        <nav className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 shadow-inner mx-2 md:mx-6 shrink-0">
          <button
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ${viewMode === 'table'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
            title="Table View"
          >
            <Table className="h-4 w-4" />
            <span className="hidden md:inline">Table</span>
          </button>
          <button
            onClick={() => onViewModeChange('map')}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ${viewMode === 'map'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
            title="Map View"
          >
            <Map className="h-4 w-4" />
            <span className="hidden md:inline">Map</span>
          </button>
          <button
            onClick={() => onViewModeChange('stats')}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ${viewMode === 'stats'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
            title="Intelligence View"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden md:inline">Intel</span>
          </button>
        </nav>

        {/* Right: Desktop Actions */}
        <div className="hidden md:flex items-center gap-3 md:gap-6">
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

                  <div className="flex items-center gap-1">
                    <button
                      onClick={async () => {
                        if (window.confirm('WARNING: This will wipe all data from your Cloud Workspace. Local data will remain. Continue?')) {
                          await onClearCloudData?.();
                        }
                      }}
                      className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm border border-slate-100"
                      title="Clear Cloud Data"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => logout()}
                      className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all shadow-sm border border-slate-100"
                      title="Sign Out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
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

        {/* Right: Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white absolute top-full left-0 right-0 shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
          {isAuthenticated ? (
            <div className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">{user?.username}</p>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Cloud Connected</p>
                </div>
                {isSyncing && <Cloud className="h-4 w-4 text-indigo-500 animate-pulse" />}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    if (window.confirm('WARNING: This will wipe all data from your Cloud Workspace. Local data will remain. Continue?')) {
                      await onClearCloudData?.();
                      setIsMenuOpen(false);
                    }
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-600 text-xs font-bold"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Cloud
                </button>
                <button onClick={() => { logout(); setIsMenuOpen(false); }} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { onLoginClick(); setIsMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-900 text-white font-bold"
            >
              <UserIcon className="h-4 w-4" />
              Connect To Cloud
            </button>
          )}

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => { onImportClick(); setIsMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-100"
            >
              <Upload className="h-4 w-4" />
              Import New Leads
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={totalCount === 0}
                onClick={() => { onExportClick(); setIsMenuOpen(false); }}
                className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                disabled={totalCount === 0}
                onClick={() => { onClearData(); setIsMenuOpen(false); }}
                className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 font-bold"
              >
                <Trash2 className="h-4 w-4" />
                Clear Local
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

import { useState } from 'react';
import { Database, Download, Map, Table, Trash2, Upload, LayoutPanelLeft, BarChart3, User as UserIcon, LogOut, Menu, X, Route, Settings, Eye, Presentation } from 'lucide-react';
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
  routeItemsCount?: number; // Add route items count
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
  routeItemsCount = 0, // Add default value
}: TopNavProps) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="sticky-navbar border-b border-slate-200/60 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 md:h-20 max-w-[1600px] items-center justify-between px-3 md:px-6 lg:px-10 gap-2 md:gap-4">

        {/* Left: Logo & Title */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0 min-w-0">
          <div className="flex h-8 w-8 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
            <LayoutPanelLeft className="h-4 w-4 md:h-6 md:w-6" />
          </div>
          <div className="hidden sm:block min-w-0">
            <h1 className="text-sm md:text-xl font-extrabold tracking-tight text-slate-900 lg:text-2xl truncate">
              Switch<span className="text-indigo-600">Radar</span>
            </h1>
            {lastImportName ? (
              <p className="flex items-center gap-1.5 text-[9px] md:text-xs font-semibold text-slate-500 truncate">
                <Database className="h-2.5 w-2.5 md:h-3 md:w-3 shrink-0" />
                <span className="truncate">{lastImportName}</span> • {totalCount.toLocaleString()}
              </p>
            ) : (
              <p className="text-[9px] md:text-xs font-semibold text-slate-400 truncate">Powered by Smart Integrate</p>
            )}
          </div>
        </div>

        {/* Center: View Switcher - More compact for tablets */}
        <nav className="flex items-center gap-0.5 md:gap-1 rounded-2xl bg-slate-100 p-0.5 md:p-1 shadow-inner shrink-0">
          <button
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-1 md:gap-2 rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-bold transition-all ${viewMode === 'table'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
            title="Table View"
          >
            <Table className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden lg:inline">Table</span>
          </button>
          <button
            onClick={() => onViewModeChange('map')}
            className={`flex items-center gap-1 md:gap-2 rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-bold transition-all ${viewMode === 'map'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
            title="Map View"
          >
            <Map className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden lg:inline">Map</span>
          </button>
          <button
            onClick={() => onViewModeChange('stats')}
            className={`flex items-center gap-1 md:gap-2 rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-bold transition-all ${viewMode === 'stats'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
            title="Intelligence View"
          >
            <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden lg:inline">Intel</span>
          </button>
          <button
            onClick={() => onViewModeChange('route')}
            className={`flex items-center gap-1 md:gap-2 rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-bold transition-all relative ${viewMode === 'route'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
            title="Route Planner"
          >
            <Route className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden lg:inline">Route</span>
            {routeItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {routeItemsCount > 99 ? '99+' : routeItemsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onViewModeChange('seen')}
            className={`flex items-center gap-1 md:gap-2 rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-bold transition-all ${viewMode === 'seen'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
            title="Seen Clients"
          >
            <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden lg:inline">Seen</span>
          </button>
        </nav>

        {/* Right: Actions - Responsive layout */}
        <div className="hidden sm:flex items-center gap-2 md:gap-3 lg:gap-6 shrink-0">
          <div className="hidden lg:block h-8 w-px bg-slate-200" />
          
          {/* Main Actions - Compact on tablet */}
          <button 
            onClick={onImportClick} 
            className="px-2 md:px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs md:text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1 md:gap-1.5 shadow-md shadow-indigo-100"
          >
            <Upload className="h-3 w-3 md:h-3.5 md:w-3.5" />
            <span className="hidden md:inline">Import</span>
          </button>

          <div className="flex items-center">
            <button
              disabled={totalCount === 0}
              onClick={onExportClick}
              className="p-1.5 md:p-2 rounded-l-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Export to CSV"
            >
              <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </button>
            <button
              disabled={totalCount === 0}
              onClick={onClearData}
              className="p-1.5 md:p-2 rounded-r-lg border-l-0 border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Clear all local data"
            >
              <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </button>
          </div>

          {/* User/Login Menu - Compact */}
          <div className="relative">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1 md:gap-2 group"
                >
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-xs font-black text-slate-900 leading-none">{user?.username}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Local Mode</span>
                  </div>
                  <UserIcon className="h-7 w-7 md:h-8 md:w-8 p-1.5 rounded-full bg-slate-100 text-slate-500" />
                </button>
                {isUserMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 md:w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-10 animate-in fade-in zoom-in-95">
                    {/* Present */}
                    <button
                      onClick={() => { onViewModeChange('present'); setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-bold"
                    >
                      <Presentation className="h-4 w-4" />
                      <span>Present</span>
                    </button>
                    
                    {/* Settings */}
                    <button
                      onClick={() => { onViewModeChange('settings'); setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-bold"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                    
                    <div className="h-px bg-slate-100 my-2" />
                    
                    {/* Sign Out */}
                    <button
                      onClick={() => { logout(); setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors text-sm font-bold"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-xl bg-slate-50 text-slate-600 text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-100"
              >
                <UserIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span className="hidden md:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="sm:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md absolute top-full left-0 right-0 shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200 z-40">
          {isAuthenticated ? (
            <div className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">{user?.username}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Local Mode</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { onViewModeChange('present'); setIsMenuOpen(false); }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 text-xs font-bold"
                >
                  <Presentation className="h-4 w-4" />
                  Present
                </button>
                <button
                  onClick={() => { onViewModeChange('settings'); setIsMenuOpen(false); }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 text-xs font-bold"
                >
                  <Settings className="h-4 w-4" />
                  Settings
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
              Sign In
            </button>
          )}

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => { onImportClick(); setIsMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-100"
            >
              <Upload className="h-4 w-4" />
              Import New Businesses
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={totalCount === 0}
                onClick={() => { onExportClick(); setIsMenuOpen(false); }}
                className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                disabled={totalCount === 0}
                onClick={() => { onClearData(); setIsMenuOpen(false); }}
                className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 font-bold disabled:opacity-50"
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

import React, { useState } from 'react';
import { 
  MapPin, 
  BarChart3, 
  Route, 
  Eye, 
  Table, 
  Sparkles, 
  Building2, 
  Users, 
  TrendingUp,
  ArrowRight,
  Filter,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBusinessData } from '../hooks/useBusinessData';
import type { ViewMode } from '../types';

interface DashboardProps {
  businessCount: number;
  providerCount: number;
  onImportClick: () => void;
  onViewMapClick: () => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onTownSelect?: (town: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  businessCount,
  providerCount,
  onImportClick,
  onViewModeChange,
  onTownSelect
}) => {
  const { user } = useAuth();
  const { 
    availableTowns, 
    routeItems
  } = useBusinessData();

  const [selectedTownForView, setSelectedTownForView] = useState<string>('');

  // Calculate data overview using props instead of hook data
  const dataOverview = {
    totalBusinesses: businessCount,
    totalTowns: availableTowns.length,
    totalProviders: providerCount,
    routeItems: routeItems.length
  };

  const handleTownSelection = (town: string) => {
    setSelectedTownForView(town);
    if (onTownSelect) {
      onTownSelect(town);
    }
  };

  const handleViewNavigation = (mode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Remove the loading check since it's handled by ViewRenderer now

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-7xl">
          
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider">
                {getGreeting()}
              </span>
              <Sparkles className="h-4 w-4 text-indigo-500" />
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-4">
              Hello, {user?.username}!
              <span className="block text-indigo-600">Your Business Intelligence Hub</span>
            </h2>
            
            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Access your business data, explore market insights, and manage your workspace with powerful visualization tools.
            </p>
          </div>

          {/* Data Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <div className="glass-card rounded-2xl p-6 border-white/60 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-4">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-slate-900">{dataOverview.totalBusinesses.toLocaleString()}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Businesses</p>
              </div>
            </div>
            
            <div className="glass-card rounded-2xl p-6 border-white/60 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                <MapPin className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-slate-900">{dataOverview.totalTowns}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Towns Available</p>
              </div>
            </div>
            
            <div className="glass-card rounded-2xl p-6 border-white/60 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-slate-900">{dataOverview.totalProviders}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Providers</p>
              </div>
            </div>
            
            <div className="glass-card rounded-2xl p-6 border-white/60 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                <Route className="h-5 w-5 text-purple-600" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-slate-900">{dataOverview.routeItems}</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Route Items</p>
              </div>
            </div>
          </div>

          {/* Town Selection */}
          {availableTowns.length > 0 && (
            <div className="mb-12">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 mb-2">Select Your Focus Area</h3>
                <p className="text-slate-600">Choose a town to filter your data and get targeted insights</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-w-5xl mx-auto">
                <button
                  onClick={() => handleTownSelection('')}
                  className={`p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedTownForView === '' 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900' 
                      : 'border-white/60 bg-white/60 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="h-4 w-4" />
                    <span className="font-bold text-sm">All Towns</span>
                  </div>
                  <p className="text-xs opacity-75">View all data</p>
                </button>
                
                {availableTowns.map((town) => {
                  return (
                    <button
                      key={town}
                      onClick={() => handleTownSelection(town)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${
                        selectedTownForView === town 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900' 
                          : 'border-white/60 bg-white/60 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4" />
                        <span className="font-bold text-sm">{town}</span>
                      </div>
                      <p className="text-xs opacity-75">Explore {town}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <button
              onClick={() => handleViewNavigation('table')}
              className="glass-card rounded-[2rem] p-8 border-white/60 shadow-lg hover:shadow-xl transition-all group text-left active:scale-95"
            >
              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-6 group-hover:bg-slate-200 transition-colors">
                <Table className="h-6 w-6 text-slate-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Business Table</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Browse, search, and manage your business data in a comprehensive table view with advanced filtering.
              </p>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <span>Explore Data</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => handleViewNavigation('map')}
              className="glass-card rounded-[2rem] p-8 border-white/60 shadow-lg hover:shadow-xl transition-all group text-left active:scale-95"
            >
              <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-6 group-hover:bg-indigo-200 transition-colors">
                <MapPin className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Interactive Map</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Visualize business locations with high-performance clustering and geospatial analysis tools.
              </p>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <span>View Map</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => handleViewNavigation('stats')}
              className="glass-card rounded-[2rem] p-8 border-white/60 shadow-lg hover:shadow-xl transition-all group text-left active:scale-95"
            >
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6 group-hover:bg-emerald-200 transition-colors">
                <BarChart3 className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Market Intelligence</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Analyze market trends, provider distribution, and business insights with interactive charts.
              </p>
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <span>View Analytics</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => handleViewNavigation('route')}
              className="glass-card rounded-[2rem] p-8 border-white/60 shadow-lg hover:shadow-xl transition-all group text-left active:scale-95"
            >
              <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors">
                <Route className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Route Planning</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Plan and optimize your business visits with intelligent route management and tracking.
              </p>
              <div className="flex items-center gap-2 text-orange-600 font-bold text-sm">
                <span>Plan Routes</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => handleViewNavigation('seen')}
              className="glass-card rounded-[2rem] p-8 border-white/60 shadow-lg hover:shadow-xl transition-all group text-left active:scale-95"
            >
              <div className="h-12 w-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-6 group-hover:bg-purple-200 transition-colors">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Seen Clients</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Track and manage your client interactions, follow-ups, and relationship history.
              </p>
              <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
                <span>View History</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Quick Actions Card */}
            <div className="glass-card rounded-[2rem] p-8 border-white/60 shadow-lg">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={onImportClick}
                  className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-all active:scale-95"
                >
                  Import New Data
                </button>
                
                {dataOverview.totalBusinesses === 0 && (
                  <p className="text-xs text-slate-500 text-center">
                    Start by importing your business data
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-white/40">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-slate-600">System Online</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-600">High Performance</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-bold text-slate-600">Real-time Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-xs text-slate-400">
          © 2026 SwitchRadar. Advanced Business Intelligence Platform.
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
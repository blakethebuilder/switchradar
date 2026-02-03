import React, { useState, useEffect } from 'react';
import { Database, X, CheckCircle2, Wifi, WifiOff, Server, Users, UserCheck, MapPin, Trash2, Plus, Upload, Eye, Settings } from 'lucide-react';
import type { Business } from '../types';
import { useAuth } from '../context/AuthContext';
import { serverDataService } from '../services/serverData';
import UserManagement from './UserManagement';
import UserDataManagement from './UserDataManagement';
import ManualSyncPanel from './ManualSyncPanel';

interface DbSettingsPageProps {
  businesses: Business[];
  onClose: () => void;
}

interface TownData {
  name: string;
  businessCount: number;
  providers: string[];
  categories: string[];
}

export const DbSettingsPage: React.FC<DbSettingsPageProps> = ({ businesses, onClose }) => {
  const { user, token, isAuthenticated, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'towns' | 'users' | 'userdata' | 'database'>('overview');
  const [townData, setTownData] = useState<TownData[]>([]);
  const [selectedTowns, setSelectedTowns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const totalBusinesses = businesses.length;
  const providers = new Set(businesses.map(b => b.provider)).size;
  const towns = new Set(businesses.map(b => b.town)).size;
  const categories = new Set(businesses.map(b => b.category)).size;

  // Process town data for admin view
  useEffect(() => {
    const townMap = new Map<string, TownData>();
    
    businesses.forEach(business => {
      const townName = business.town || 'Unknown';
      if (!townMap.has(townName)) {
        townMap.set(townName, {
          name: townName,
          businessCount: 0,
          providers: [],
          categories: []
        });
      }
      
      const town = townMap.get(townName)!;
      town.businessCount++;
      
      if (business.provider && !town.providers.includes(business.provider)) {
        town.providers.push(business.provider);
      }
      
      if (business.category && !town.categories.includes(business.category)) {
        town.categories.push(business.category);
      }
    });
    
    setTownData(Array.from(townMap.values()).sort((a, b) => b.businessCount - a.businessCount));
  }, [businesses]);

  const handleDeleteSelectedTowns = async () => {
    if (selectedTowns.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTowns.length} town(s) and all their businesses? This action cannot be undone.`)) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Filter out businesses from selected towns
      const remainingBusinesses = businesses.filter(b => !selectedTowns.includes(b.town || 'Unknown'));
      
      if (token) {
        const result = await serverDataService.saveBusinesses(remainingBusinesses, token);
        if (result.success) {
          setSelectedTowns([]);
          // Refresh would happen via parent component
          alert(`Successfully deleted ${selectedTowns.length} town(s)`);
        } else {
          alert(`Failed to delete towns: ${result.error}`);
        }
      }
    } catch (error) {
      alert(`Error deleting towns: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getDatabaseSource = () => {
    if (totalBusinesses === 0) return 'Empty';
    return 'Server Database';
  };

  const databaseSource = getDatabaseSource();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Admin Console</h1>
            <p className="text-sm font-medium text-slate-400">
              {isAdmin ? 'Full system management and oversight' : 'Database settings and sync'}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="flex gap-1 mb-8 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="h-4 w-4" />
          Overview
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('towns')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'towns'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="h-4 w-4" />
              Towns ({towns})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('userdata')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'userdata'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              User Data
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'database'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Server className="h-4 w-4" />
          Database
        </button>
      </div>

      {activeTab === 'towns' && isAdmin && (
        <div className="space-y-6">
          {/* Towns Management Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Dataset Management</h2>
              <p className="text-sm text-slate-600">Manage towns, datasets, and business data</p>
            </div>
            <div className="flex items-center gap-3">
              {selectedTowns.length > 0 && (
                <button
                  onClick={handleDeleteSelectedTowns}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedTowns.length})
                </button>
              )}
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
                <Plus className="h-4 w-4" />
                Import New Dataset
              </button>
            </div>
          </div>

          {/* Towns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {townData.map((town) => (
              <div
                key={town.name}
                className={`bg-white rounded-2xl p-6 shadow-lg border-2 transition-all cursor-pointer ${
                  selectedTowns.includes(town.name)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
                onClick={() => {
                  setSelectedTowns(prev => 
                    prev.includes(town.name)
                      ? prev.filter(t => t !== town.name)
                      : [...prev, town.name]
                  );
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{town.name}</h3>
                      <p className="text-sm text-slate-600">{town.businessCount} businesses</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedTowns.includes(town.name)}
                    onChange={() => {}}
                    className="h-5 w-5 text-indigo-600 rounded border-slate-300"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Providers</p>
                    <div className="flex flex-wrap gap-1">
                      {town.providers.slice(0, 3).map((provider) => (
                        <span
                          key={provider}
                          className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                        >
                          {provider}
                        </span>
                      ))}
                      {town.providers.length > 3 && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                          +{town.providers.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Categories</p>
                    <div className="flex flex-wrap gap-1">
                      {town.categories.slice(0, 2).map((category) => (
                        <span
                          key={category}
                          className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium"
                        >
                          {category}
                        </span>
                      ))}
                      {town.categories.length > 2 && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium">
                          +{town.categories.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    <span className="font-bold text-slate-900">{town.businessCount}</span> businesses
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {townData.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Towns Found</h3>
              <p className="text-slate-600 mb-6">Import some business data to see town management options.</p>
              <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors mx-auto">
                <Upload className="h-5 w-5" />
                Import Business Data
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Database className="h-8 w-8 text-indigo-200" />
                <span className="text-2xl font-black">{totalBusinesses.toLocaleString()}</span>
              </div>
              <div className="text-sm font-bold text-indigo-100">Total Businesses</div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <MapPin className="h-8 w-8 text-emerald-200" />
                <span className="text-2xl font-black">{towns}</span>
              </div>
              <div className="text-sm font-bold text-emerald-100">Active Towns</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-8 w-8 text-purple-200" />
                <span className="text-2xl font-black">{providers}</span>
              </div>
              <div className="text-sm font-bold text-purple-100">Providers</div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Server className="h-8 w-8 text-orange-200" />
                <span className="text-2xl font-black">{categories}</span>
              </div>
              <div className="text-sm font-bold text-orange-100">Categories</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => setActiveTab('towns')}
                className="flex items-center gap-3 p-4 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <MapPin className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-bold">Manage Towns</div>
                  <div className="text-sm opacity-80">View and manage datasets</div>
                </div>
              </button>
              
              <button 
                onClick={() => setActiveTab('users')}
                className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                <Users className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-bold">Manage Users</div>
                  <div className="text-sm opacity-80">User accounts and permissions</div>
                </div>
              </button>
              
              <button 
                onClick={() => setActiveTab('database')}
                className="flex items-center gap-3 p-4 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors"
              >
                <Database className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-bold">Database Tools</div>
                  <div className="text-sm opacity-80">Sync and maintenance</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Database Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Dataset Card */}
            <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Database className="h-32 w-32 text-indigo-600" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Current Workspace Data</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="text-4xl font-black text-slate-900 mb-1">{totalBusinesses.toLocaleString()}</div>
                    <div className="text-sm font-bold text-slate-400">Total Businesses Available</div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-2xl font-black text-indigo-600 mb-1">{providers}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Providers</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-2xl font-black text-indigo-600 mb-1">{towns}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Towns</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="text-2xl font-black text-indigo-600 mb-1">{categories}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Categories</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <div>
                      <span className="text-sm font-bold text-slate-600">Database Source: </span>
                      <span className="text-sm font-black text-slate-900">{databaseSource}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Status & Cloud Connection */}
            <div className="flex flex-col gap-4">
              {/* Server-First Architecture */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl shadow-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <Server className="h-6 w-6 text-indigo-200" />
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-200">Server-First</span>
                </div>
                <div className="text-lg font-bold mb-4">All data stored securely on the server for massive scale.</div>
                <div className="text-xs font-medium text-indigo-100 opacity-80">
                  Storage Mode: Server SQLite / Multi-User
                </div>
              </div>

              {/* Cloud Connection Status */}
              <div className={`rounded-[2rem] p-6 shadow-xl shadow-slate-200 ${
                isAuthenticated 
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' 
                  : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {isAuthenticated ? (
                    <>
                      <Wifi className="h-6 w-6" />
                      <span className="text-xs font-black uppercase tracking-widest opacity-80">Cloud Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-6 w-6" />
                      <span className="text-xs font-black uppercase tracking-widest opacity-80">Cloud Disconnected</span>
                    </>
                  )}
                </div>
                <div className="text-lg font-bold mb-2">
                  {isAuthenticated ? `Signed in as ${user?.username}` : 'Not connected to cloud'}
                </div>
                <div className="text-xs font-medium opacity-80">
                  {isAuthenticated 
                    ? 'Server database available for sync' 
                    : 'Sign in to enable cloud sync features'
                  }
                </div>
              </div>

              {/* Database Info */}
              <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <Server className="h-6 w-6 text-indigo-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Database Info</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Architecture:</span>
                    <span className="font-bold text-slate-900">Server-First</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Database:</span>
                    <span className="font-bold text-slate-900">SQLite (Server)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status:</span>
                    <span className="font-bold text-emerald-600">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Capacity:</span>
                    <span className="font-bold text-slate-900">Unlimited</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Database Controls */}
          {isAuthenticated && (
            <ManualSyncPanel />
          )}
        </div>
      )}

      {activeTab === 'users' && isAdmin && (
        <UserManagement />
      )}

      {activeTab === 'userdata' && isAdmin && (
        <UserDataManagement />
      )}
    </div>
  );
};
export default DbSettingsPage;
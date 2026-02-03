import React, { useState } from 'react';
import { Database, X, CheckCircle2, Wifi, WifiOff, Server, Users, UserCheck } from 'lucide-react';
import type { Business } from '../types';
import { useAuth } from '../context/AuthContext';
import UserManagement from './UserManagement';
import UserDataManagement from './UserDataManagement';
import ManualSyncPanel from './ManualSyncPanel';

interface DbSettingsPageProps {
  businesses: Business[];
  onClose: () => void;
}

export const DbSettingsPage: React.FC<DbSettingsPageProps> = ({ businesses, onClose }) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'database' | 'users' | 'userdata'>('database');
  const totalBusinesses = businesses.length;
  const providers = new Set(businesses.map(b => b.provider)).size;
  const towns = new Set(businesses.map(b => b.town)).size;
  const categories = new Set(businesses.map(b => b.category)).size;

  // Determine database source
  const getDatabaseSource = () => {
    if (totalBusinesses === 0) return 'Empty';
    // You could add logic here to detect if data came from cloud vs local import
    return 'Local Import';
  };

  const databaseSource = getDatabaseSource();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Settings & Management</h1>
            <p className="text-sm font-medium text-slate-400">Manage your database and system users</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-8 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('database')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'database'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="h-4 w-4" />
          Database
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
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
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
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
      </div>

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
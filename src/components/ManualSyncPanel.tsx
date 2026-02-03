import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, Trash2, RefreshCw, Server, HardDrive, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { serverDataService } from '../services/serverData';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Business } from '../types';

interface DatabaseStats {
  local: {
    businesses: number;
    routes: number;
    lastUpdated: string;
  };
  server: {
    businesses: number;
    connected: boolean;
    lastSync: string | null;
  };
}

export const ManualSyncPanel: React.FC = () => {
  const { user, token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [stats, setStats] = useState<DatabaseStats>({
    local: { businesses: 0, routes: 0, lastUpdated: new Date().toISOString() },
    server: { businesses: 0, connected: false, lastSync: null }
  });

  const localBusinesses = useLiveQuery(() => db.businesses.toArray()) || [];
  const localRoutes = useLiveQuery(() => db.route.toArray()) || [];

  useEffect(() => {
    updateLocalStats();
    if (isAuthenticated) {
      checkServerConnection();
    }
  }, [localBusinesses, localRoutes, isAuthenticated]);

  const updateLocalStats = () => {
    setStats(prev => ({
      ...prev,
      local: {
        businesses: localBusinesses.length,
        routes: localRoutes.length,
        lastUpdated: new Date().toISOString()
      }
    }));
  };

  const checkServerConnection = async () => {
    if (!token) return;
    
    try {
      const result = await serverDataService.getBusinesses(token);
      setStats(prev => ({
        ...prev,
        server: {
          businesses: result.data?.length || 0,
          connected: result.success,
          lastSync: result.success ? new Date().toISOString() : null
        }
      }));
    } catch (error) {
      setStats(prev => ({
        ...prev,
        server: { ...prev.server, connected: false }
      }));
    }
  };

  const showStatus = (type: 'success' | 'error' | 'info', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 5000);
  };

  const uploadToServer = async () => {
    if (!token || localBusinesses.length === 0) return;
    
    setLoading(true);
    try {
      const result = await serverDataService.saveBusinesses(localBusinesses, token);
      if (result.success) {
        showStatus('success', `Uploaded ${localBusinesses.length} businesses to server`);
        await checkServerConnection();
      } else {
        showStatus('error', result.error || 'Upload failed');
      }
    } catch (error) {
      showStatus('error', 'Network error during upload');
    } finally {
      setLoading(false);
    }
  };

  const downloadFromServer = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const result = await serverDataService.getBusinesses(token);
      if (result.success && result.data) {
        await db.transaction('rw', [db.businesses], async () => {
          await db.businesses.clear();
          await db.businesses.bulkAdd(result.data);
        });
        showStatus('success', `Downloaded ${result.data.length} businesses from server`);
        updateLocalStats();
      } else {
        showStatus('error', result.error || 'Download failed');
      }
    } catch (error) {
      showStatus('error', 'Network error during download');
    } finally {
      setLoading(false);
    }
  };

  const clearLocalDatabase = async () => {
    if (!window.confirm('Are you sure you want to clear all local data? This cannot be undone.')) return;
    
    setLoading(true);
    try {
      await db.transaction('rw', [db.businesses, db.route], async () => {
        await db.businesses.clear();
        await db.route.clear();
      });
      showStatus('success', 'Local database cleared');
      updateLocalStats();
    } catch (error) {
      showStatus('error', 'Failed to clear local database');
    } finally {
      setLoading(false);
    }
  };

  const clearServerDatabase = async () => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to clear all server data? This cannot be undone.')) return;
    
    setLoading(true);
    try {
      const result = await serverDataService.clearWorkspace(token);
      if (result.success) {
        showStatus('success', 'Server database cleared');
        await checkServerConnection();
      } else {
        showStatus('error', result.error || 'Failed to clear server database');
      }
    } catch (error) {
      showStatus('error', 'Network error during server clear');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    if (localBusinesses.length === 0) return;
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: user?.username,
      businesses: localBusinesses,
      routes: localRoutes,
      summary: {
        totalBusinesses: localBusinesses.length,
        totalRoutes: localRoutes.length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `switchradar-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('success', 'Data exported successfully');
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Database Controls</h3>
          <p className="text-slate-600">Please sign in to access database management features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Database className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Database Controls</h2>
            <p className="text-sm text-slate-600">Manage your local and server databases</p>
          </div>
        </div>

        {/* Status Message */}
        {status && (
          <div className={`p-3 rounded-lg mb-4 ${
            status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            status.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {status.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {status.type === 'error' && <AlertCircle className="h-4 w-4" />}
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span className="text-sm font-medium">{status.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* Database Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Database */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="h-6 w-6 text-slate-600" />
            <div>
              <h3 className="font-bold text-slate-900">Local Database</h3>
              <p className="text-xs text-slate-500">Browser Storage</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Businesses:</span>
              <span className="text-sm font-bold text-slate-900">{stats.local.businesses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Routes:</span>
              <span className="text-sm font-bold text-slate-900">{stats.local.routes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Last Updated:</span>
              <span className="text-sm font-bold text-slate-900">
                {new Date(stats.local.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={exportData}
              disabled={loading || stats.local.businesses === 0}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={clearLocalDatabase}
              disabled={loading || stats.local.businesses === 0}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Server Database */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <Server className="h-6 w-6 text-slate-600" />
            <div>
              <h3 className="font-bold text-slate-900">Server Database</h3>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${stats.server.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <p className="text-xs text-slate-500">
                  {stats.server.connected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Businesses:</span>
              <span className="text-sm font-bold text-slate-900">
                {stats.server.connected ? stats.server.businesses.toLocaleString() : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Last Sync:</span>
              <span className="text-sm font-bold text-slate-900">
                {stats.server.lastSync ? new Date(stats.server.lastSync).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={checkServerConnection}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={clearServerDatabase}
              disabled={loading || !stats.server.connected}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Clear Server
            </button>
          </div>
        </div>
      </div>

      {/* Sync Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-4">Data Synchronization</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={uploadToServer}
            disabled={loading || stats.local.businesses === 0 || !stats.server.connected}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Upload to Server</div>
              <div className="text-sm opacity-90">Push local data to server</div>
            </div>
          </button>

          <button
            onClick={downloadFromServer}
            disabled={loading || !stats.server.connected}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Download from Server</div>
              <div className="text-sm opacity-90">Pull server data to local</div>
            </div>
          </button>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">
            <strong>Note:</strong> Upload will replace all server data with your local data. 
            Download will replace all local data with server data. Always export your data before syncing.
          </p>
        </div>
      </div>
    </div>
  );
};
export default ManualSyncPanel;
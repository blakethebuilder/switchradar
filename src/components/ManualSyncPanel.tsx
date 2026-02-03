import React, { useState, useEffect } from 'react';
import { Database, Download, Trash2, RefreshCw, Server, Cloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { serverDataService } from '../services/serverData';
import { useBusinessData } from '../hooks/useBusinessData';
import { environmentConfig } from '../config/environment';

interface DatabaseStats {
  server: {
    businesses: number;
    connected: boolean;
    lastSync: string | null;
  };
}

export const ManualSyncPanel: React.FC = () => {
  const { user, token, isAuthenticated } = useAuth();
  const { businesses, refetch, loading: dataLoading } = useBusinessData();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [stats, setStats] = useState<DatabaseStats>({
    server: { businesses: 0, connected: false, lastSync: null }
  });

  useEffect(() => {
    updateStats();
    if (isAuthenticated) {
      console.log('User authenticated, checking server connection...');
      checkServerConnection();
    } else {
      console.log('User not authenticated, skipping server connection check');
    }
  }, [businesses, isAuthenticated]);

  const updateStats = () => {
    setStats(prev => ({
      ...prev,
      server: {
        ...prev.server,
        businesses: businesses.length
      }
    }));
  };

  const checkServerConnection = async () => {
    if (!token) return;
    
    console.log('🔍 Checking server connection...');
    console.log('API URL:', environmentConfig.getApiUrl());
    console.log('Current hostname:', window.location.hostname);
    console.log('Is development:', environmentConfig.getConfig().isDevelopment);
    
    try {
      const connected = await serverDataService.testConnection();
      console.log('Server connection result:', connected);
      
      setStats(prev => ({
        ...prev,
        server: {
          businesses: businesses.length,
          connected,
          lastSync: connected ? new Date().toISOString() : null
        }
      }));
      
      if (!connected) {
        showStatus('error', 'Cannot connect to server. Check your internet connection.');
      }
    } catch (error) {
      console.error('Server connection error:', error);
      setStats(prev => ({
        ...prev,
        server: { ...prev.server, connected: false }
      }));
      showStatus('error', `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const showStatus = (type: 'success' | 'error' | 'info', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 5000);
  };

  const refreshData = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      await refetch();
      showStatus('success', 'Data refreshed from server');
      await checkServerConnection();
    } catch (error) {
      showStatus('error', 'Failed to refresh data');
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
        await refetch();
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
    if (!token) return;
    
    setLoading(true);
    try {
      // Create a download link for the server export
      const exportUrl = `${environmentConfig.getApiUrl()}/api/export/full`;
      const response = await fetch(exportUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `switchradar-export-${user?.username}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus('success', 'Data exported successfully');
      } else {
        showStatus('error', 'Failed to export data');
      }
    } catch (error) {
      showStatus('error', 'Export failed');
    } finally {
      setLoading(false);
    }
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
            <Cloud className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Server Database</h2>
            <p className="text-sm text-slate-600">All data is stored and managed on the server</p>
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

      {/* Server Database Stats */}
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
            <span className="text-sm text-slate-600">Last Updated:</span>
            <span className="text-sm font-bold text-slate-900">
              {stats.server.lastSync ? new Date(stats.server.lastSync).toLocaleDateString() : 'Never'}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={refreshData}
            disabled={loading || dataLoading}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${(loading || dataLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportData}
            disabled={loading || !stats.server.connected}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={clearServerDatabase}
            disabled={loading || !stats.server.connected}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-4">Server-First Architecture</h3>
        
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>All data stored securely on server</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Handle massive datasets (millions of records)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Real-time collaboration between users</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Advanced server-side filtering and search</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">
            <strong>Connection Info:</strong> 
            {environmentConfig.getConfig().isDevelopment ? (
              <span className="text-blue-600"> Development Mode - Using localhost:5001</span>
            ) : (
              <span className="text-green-600"> Production Mode - Using relative URLs</span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            API URL: {environmentConfig.getApiUrl() || 'Relative paths'}
          </p>
          <p className="text-sm text-slate-600 mt-2">
            <strong>Note:</strong> Data is automatically synced with the server. 
            Use the import tools to add new datasets, and the refresh button to get the latest data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManualSyncPanel;
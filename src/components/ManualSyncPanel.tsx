import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { serverDataService } from '../services/serverData';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

interface SyncStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  details?: any;
}

interface ServerStats {
  totalBusinesses: number;
  lastSync: string | null;
  storageUsed: number;
}

export const ManualSyncPanel: React.FC = () => {
  const { user, token } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ type: 'idle', message: '' });
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);

  const localBusinesses = useLiveQuery(() => db.businesses.toArray()) || [];
  const localRoutes = useLiveQuery(() => db.route.toArray()) || [];

  // Fetch server statistics
  const fetchServerStats = async () => {
    if (!token) return;
    
    setSyncStatus({ type: 'loading', message: 'Fetching server statistics...' });
    
    try {
      const result = await serverDataService.getStats(token);
      if (result.success) {
        setServerStats({
          totalBusinesses: result.data?.totalBusinesses || 0,
          lastSync: new Date().toISOString(),
          storageUsed: 0
        });
        setSyncStatus({ type: 'success', message: 'Server statistics updated' });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Failed to fetch server statistics',
        details: error
      });
    }
  };

  // Upload local data to server
  const uploadToServer = async () => {
    if (!token) return;
    
    setSyncStatus({ type: 'loading', message: 'Uploading data to server...' });
    
    try {
      const result = await serverDataService.saveBusinesses(localBusinesses, token);
      
      if (result.success) {
        setSyncStatus({ 
          type: 'success', 
          message: `Successfully uploaded ${result.count} businesses to server`
        });
        await fetchServerStats();
      } else {
        setSyncStatus({ 
          type: 'error', 
          message: `Upload failed: ${result.error}`
        });
      }
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Upload failed: Network error'
      });
    }
  };

  // Download data from server
  const downloadFromServer = async () => {
    if (!token) return;
    
    setSyncStatus({ type: 'loading', message: 'Downloading data from server...' });
    
    try {
      const result = await serverDataService.getBusinesses(token);
      
      if (result.success && result.data) {
        // Add server data to local database
        await db.transaction('rw', [db.businesses], async () => {
          await db.businesses.clear();
          await db.businesses.bulkAdd(result.data);
        });
        
        setSyncStatus({ 
          type: 'success', 
          message: `Downloaded ${result.count} businesses from server`
        });
      } else {
        setSyncStatus({ 
          type: 'error', 
          message: result.error || 'Download failed'
        });
      }
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Download failed: Network error'
      });
    }
  };

  // Clear server database
  const clearServerDatabase = async () => {
    if (!token) return;
    
    setSyncStatus({ type: 'loading', message: 'Clearing server database...' });
    
    try {
      const result = await serverDataService.clearWorkspace(token);
      
      if (result.success) {
        setSyncStatus({ 
          type: 'success', 
          message: 'Server database cleared successfully'
        });
        await fetchServerStats();
        setShowConfirmDialog(null);
      } else {
        setSyncStatus({ 
          type: 'error', 
          message: result.error || 'Failed to clear server database'
        });
      }
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Failed to clear server database'
      });
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Server Sync</h3>
        <p className="text-gray-600">Please log in to access server sync features.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Server Database Sync</h3>
      
      {/* Status Display */}
      {syncStatus.message && (
        <div className={`mb-4 p-3 rounded-md ${
          syncStatus.type === 'loading' ? 'bg-blue-50 text-blue-700' :
          syncStatus.type === 'success' ? 'bg-green-50 text-green-700' :
          syncStatus.type === 'error' ? 'bg-red-50 text-red-700' :
          'bg-gray-50 text-gray-700'
        }`}>
          <div className="flex items-center">
            {syncStatus.type === 'loading' && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
            )}
            <span>{syncStatus.message}</span>
          </div>
        </div>
      )}

      {/* Data Overview */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium text-gray-900">Local Data</h4>
          <p className="text-sm text-gray-600">{localBusinesses.length} businesses</p>
          <p className="text-sm text-gray-600">{localRoutes.length} routes</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">Server Data</h4>
            <button
              onClick={fetchServerStats}
              disabled={syncStatus.type === 'loading'}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              {syncStatus.type === 'loading' ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          {serverStats ? (
            <>
              <p className="text-sm text-gray-600">{serverStats.totalBusinesses} businesses</p>
              <p className="text-sm text-gray-600">Connected to server</p>
            </>
          ) : (
            <p className="text-sm text-gray-600">Click refresh to load server stats</p>
          )}
        </div>
      </div>

      {/* Sync Actions */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={uploadToServer}
            disabled={syncStatus.type === 'loading' || localBusinesses.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            📤 Upload to Server
          </button>
          
          <button
            onClick={downloadFromServer}
            disabled={syncStatus.type === 'loading'}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            📥 Download from Server
          </button>
        </div>

        <button
          onClick={() => setShowConfirmDialog('clearServer')}
          disabled={syncStatus.type === 'loading'}
          className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          🗑️ Clear Server Database
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Confirm Action</h4>
            <p className="text-gray-600 mb-6">
              This will permanently delete all data from the server database.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={clearServerDatabase}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ManualSyncPanel;
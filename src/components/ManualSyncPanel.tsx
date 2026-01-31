import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { cloudSyncService } from '../services/cloudSync';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

interface SyncStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  details?: any;
}

interface CloudStats {
  totalBusinesses: number;
  lastSync: string | null;
  storageUsed: number;
}

export const ManualSyncPanel: React.FC = () => {
  const { user, token } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ type: 'idle', message: '' });
  const [cloudStats, setCloudStats] = useState<CloudStats | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);

  const localBusinesses = useLiveQuery(() => db.businesses.toArray()) || [];
  const localRoutes = useLiveQuery(() => db.route.toArray()) || [];

  // Fetch cloud statistics
  const fetchCloudStats = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/sync/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCloudStats({
          totalBusinesses: data.currentData.businesses,
          lastSync: data.user.lastSync,
          storageUsed: data.currentData.estimatedStorageMB
        });
      }
    } catch (error) {
      console.error('Failed to fetch cloud stats:', error);
    }
  };

  useEffect(() => {
    // Only fetch stats when user explicitly requests it - no automatic calls
  }, []);

  // Upload local data to cloud
  const uploadToCloud = async () => {
    if (!token) return;
    
    setSyncStatus({ type: 'loading', message: 'Uploading data to cloud...' });
    
    try {
      const result = await cloudSyncService.syncToCloud(localBusinesses, localRoutes, token);
      
      if (result.success) {
        setSyncStatus({ 
          type: 'success', 
          message: `Successfully uploaded ${result.syncedCount} items to cloud`,
          details: { syncedCount: result.syncedCount }
        });
        await fetchCloudStats();
      } else {
        setSyncStatus({ 
          type: 'error', 
          message: `Upload failed: ${result.errors[0]?.message || 'Unknown error'}`,
          details: result.errors
        });
      }
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Upload failed: Network error',
        details: error
      });
    }
  };

  // Download data from cloud
  const downloadFromCloud = async () => {
    if (!token) return;
    
    setSyncStatus({ type: 'loading', message: 'Downloading data from cloud...' });
    
    try {
      const cloudData = await cloudSyncService.syncFromCloud(token);
      
      if (cloudData.businesses.length > 0 || cloudData.routeItems.length > 0) {
        // Add cloud data to local database
        const transaction = db.transaction('rw', [db.businesses, db.route], async () => {
          let addedBusinesses = 0;
          let addedRoutes = 0;
          
          for (const business of cloudData.businesses) {
            const existing = await db.businesses.get(business.id);
            if (!existing) {
              await db.businesses.add(business);
              addedBusinesses++;
            }
          }
          
          for (const route of cloudData.routeItems) {
            const existing = await db.route.where('businessId').equals(route.businessId).first();
            if (!existing) {
              await db.route.add(route);
              addedRoutes++;
            }
          }
          
          return { addedBusinesses, addedRoutes };
        });
        
        const result = await transaction;
        setSyncStatus({ 
          type: 'success', 
          message: `Downloaded ${result.addedBusinesses} businesses and ${result.addedRoutes} routes from cloud`,
          details: result
        });
      } else {
        setSyncStatus({ 
          type: 'success', 
          message: 'No new data found in cloud'
        });
      }
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Download failed: Network error',
        details: error
      });
    }
  };

  // Replace local data with cloud data
  const replaceWithCloudData = async () => {
    if (!token) return;
    
    setSyncStatus({ type: 'loading', message: 'Replacing local data with cloud data...' });
    
    try {
      const cloudData = await cloudSyncService.syncFromCloud(token);
      
      // Clear local data and replace with cloud data
      const transaction = db.transaction('rw', [db.businesses, db.route], async () => {
        await db.businesses.clear();
        await db.route.clear();
        
        await db.businesses.bulkAdd(cloudData.businesses);
        await db.route.bulkAdd(cloudData.routeItems);
        
        return {
          businesses: cloudData.businesses.length,
          routes: cloudData.routeItems.length
        };
      });
      
      const result = await transaction;
      setSyncStatus({ 
        type: 'success', 
        message: `Replaced local data with ${result.businesses} businesses and ${result.routes} routes from cloud`,
        details: result
      });
      setShowConfirmDialog(null);
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Replace failed: Network error',
        details: error
      });
    }
  };

  // Clear cloud database
  const clearCloudDatabase = async () => {
    if (!token) return;
    
    setSyncStatus({ type: 'loading', message: 'Clearing cloud database...' });
    
    try {
      const response = await fetch('/api/workspace', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setSyncStatus({ 
          type: 'success', 
          message: 'Cloud database cleared successfully'
        });
        await fetchCloudStats();
        setShowConfirmDialog(null);
      } else {
        throw new Error('Failed to clear cloud database');
      }
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Failed to clear cloud database',
        details: error
      });
    }
  };

  // Clear local database
  const clearLocalDatabase = async () => {
    setSyncStatus({ type: 'loading', message: 'Clearing local database...' });
    
    try {
      await db.transaction('rw', [db.businesses, db.route], async () => {
        await db.businesses.clear();
        await db.route.clear();
      });
      
      setSyncStatus({ 
        type: 'success', 
        message: 'Local database cleared successfully'
      });
      setShowConfirmDialog(null);
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Failed to clear local database',
        details: error
      });
    }
  };

  // Export data as backup
  const exportData = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/export/full', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `switchradar-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setSyncStatus({ 
          type: 'success', 
          message: 'Data exported successfully'
        });
      }
    } catch (error) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Export failed',
        details: error
      });
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Manual Sync</h3>
        <p className="text-gray-600">Please log in to access cloud sync features.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Manual Database Sync</h3>
      
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
            <h4 className="font-medium text-gray-900">Cloud Data</h4>
            <button
              onClick={fetchCloudStats}
              disabled={syncStatus.type === 'loading'}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
          {cloudStats ? (
            <>
              <p className="text-sm text-gray-600">{cloudStats.totalBusinesses} businesses</p>
              <p className="text-sm text-gray-600">
                Last sync: {cloudStats.lastSync ? new Date(cloudStats.lastSync).toLocaleDateString() : 'Never'}
              </p>
              <p className="text-sm text-gray-600">{cloudStats.storageUsed.toFixed(2)} MB used</p>
            </>
          ) : (
            <p className="text-sm text-gray-600">Click refresh to load cloud stats</p>
          )}
        </div>
      </div>

      {/* Sync Actions */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={uploadToCloud}
            disabled={syncStatus.type === 'loading' || localBusinesses.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📤 Upload to Cloud
          </button>
          
          <button
            onClick={downloadFromCloud}
            disabled={syncStatus.type === 'loading'}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 Download from Cloud
          </button>
        </div>

        <button
          onClick={() => setShowConfirmDialog('replace')}
          disabled={syncStatus.type === 'loading'}
          className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Replace Local with Cloud Data
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowConfirmDialog('clearCloud')}
            disabled={syncStatus.type === 'loading'}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ Clear Cloud DB
          </button>
          
          <button
            onClick={() => setShowConfirmDialog('clearLocal')}
            disabled={syncStatus.type === 'loading'}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ Clear Local DB
          </button>
        </div>

        <button
          onClick={exportData}
          disabled={syncStatus.type === 'loading'}
          className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          💾 Export Backup
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Confirm Action</h4>
            <p className="text-gray-600 mb-6">
              {showConfirmDialog === 'replace' && 'This will replace all local data with cloud data. Local changes will be lost.'}
              {showConfirmDialog === 'clearCloud' && 'This will permanently delete all data from the cloud database.'}
              {showConfirmDialog === 'clearLocal' && 'This will permanently delete all local data.'}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showConfirmDialog === 'replace') replaceWithCloudData();
                  else if (showConfirmDialog === 'clearCloud') clearCloudDatabase();
                  else if (showConfirmDialog === 'clearLocal') clearLocalDatabase();
                }}
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
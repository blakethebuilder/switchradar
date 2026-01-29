import React, { useState } from 'react';
import { CloudUpload, CloudDownload, Database, Wifi, WifiOff, AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cloudSyncService } from '../services/cloudSync';
import type { Business, RouteItem } from '../types';

interface CloudSyncPanelProps {
  businesses: Business[];
  routeItems: RouteItem[];
  onSyncComplete: () => void;
  lastSyncTime: Date | null;
  isSyncing: boolean;
}

const BATCH_SIZE = 3000;

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({
  businesses,
  routeItems,
  onSyncComplete,
  lastSyncTime,
  isSyncing
}) => {
  const { isAuthenticated, token } = useAuth();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'pushing' | 'pulling' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  const isOnline = cloudSyncService.isOnline();
  const totalItems = businesses.length + routeItems.length;
  const needsBatching = totalItems > BATCH_SIZE;
  const batchCount = Math.ceil(totalItems / BATCH_SIZE);

  const handlePushToCloud = async () => {
    if (!isAuthenticated || !token || isSyncing) return;

    setSyncStatus('pushing');
    setSyncMessage('Preparing to sync to cloud...');
    setSyncProgress({ current: 0, total: totalItems });

    try {
      if (needsBatching) {
        // Batch sync for large datasets
        let successCount = 0;
        let errorCount = 0;

        for (let batch = 0; batch < batchCount; batch++) {
          const batchStart = batch * BATCH_SIZE;
          const batchEnd = Math.min(batchStart + BATCH_SIZE, businesses.length);
          const businessBatch = businesses.slice(batchStart, batchEnd);
          
          // For routes, we'll sync all at once since they're typically smaller
          const routeBatch = batch === 0 ? routeItems : [];

          setSyncMessage(`Syncing batch ${batch + 1} of ${batchCount} (${businessBatch.length} businesses)...`);
          
          const result = await cloudSyncService.syncToCloud(businessBatch, routeBatch, token);
          
          if (result.success) {
            successCount += result.syncedCount;
            setSyncProgress({ current: batchStart + businessBatch.length, total: totalItems });
          } else {
            errorCount += result.failedCount;
            console.error('Batch sync error:', result.errors);
          }

          // Small delay between batches to prevent overwhelming the server
          if (batch < batchCount - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (errorCount === 0) {
          setSyncStatus('success');
          setSyncMessage(`Successfully synced ${successCount} items to cloud in ${batchCount} batches`);
        } else {
          setSyncStatus('error');
          setSyncMessage(`Synced ${successCount} items, ${errorCount} failed`);
        }
      } else {
        // Single sync for smaller datasets
        setSyncMessage('Syncing to cloud...');
        const result = await cloudSyncService.syncToCloud(businesses, routeItems, token);
        
        if (result.success) {
          setSyncStatus('success');
          setSyncMessage(`Successfully synced ${result.syncedCount} items to cloud`);
        } else {
          setSyncStatus('error');
          setSyncMessage(`Sync failed: ${result.errors.map(e => e.message).join(', ')}`);
        }
      }

      onSyncComplete();
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset status after 5 seconds
    setTimeout(() => {
      setSyncStatus('idle');
      setSyncMessage('');
      setSyncProgress({ current: 0, total: 0 });
    }, 5000);
  };

  const handlePullFromCloud = async () => {
    if (!isAuthenticated || !token || isSyncing) return;

    setSyncStatus('pulling');
    setSyncMessage('Downloading from cloud...');

    try {
      const cloudData = await cloudSyncService.syncFromCloud(token);
      
      if (cloudData.businesses.length > 0 || cloudData.routeItems.length > 0) {
        setSyncStatus('success');
        setSyncMessage(`Downloaded ${cloudData.businesses.length} businesses and ${cloudData.routeItems.length} routes from cloud`);
        onSyncComplete();
      } else {
        setSyncStatus('success');
        setSyncMessage('No new data found in cloud');
      }
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset status after 5 seconds
    setTimeout(() => {
      setSyncStatus('idle');
      setSyncMessage('');
    }, 5000);
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 text-slate-500">
          <Database className="h-5 w-5" />
          <span className="text-sm font-medium">Sign in to enable cloud sync</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
            {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Cloud Sync</h3>
            <p className="text-xs text-slate-500">
              {isOnline ? 'Connected' : 'Offline'} • {totalItems.toLocaleString()} items locally
            </p>
          </div>
        </div>

        {lastSyncTime && (
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Last Sync</p>
            <p className="text-sm font-medium text-slate-600">
              {lastSyncTime.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* Sync Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <button
          onClick={handlePushToCloud}
          disabled={!isOnline || syncStatus === 'pushing' || totalItems === 0}
          className="flex items-center justify-center gap-3 p-4 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <CloudUpload className="h-5 w-5" />
          <div className="text-left">
            <div>Push to Cloud</div>
            {needsBatching && (
              <div className="text-xs opacity-75">
                {batchCount} batches of {BATCH_SIZE.toLocaleString()}
              </div>
            )}
          </div>
        </button>

        <button
          onClick={handlePullFromCloud}
          disabled={!isOnline || syncStatus === 'pulling'}
          className="flex items-center justify-center gap-3 p-4 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <CloudDownload className="h-5 w-5" />
          Pull from Cloud
        </button>
      </div>

      {/* Batch Warning */}
      {needsBatching && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <Users className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Large Dataset Detected</p>
            <p className="text-xs text-amber-700">
              {totalItems.toLocaleString()} items will be synced in {batchCount} batches of {BATCH_SIZE.toLocaleString()} each
            </p>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {syncMessage && (
        <div className={`p-4 rounded-xl flex items-start gap-3 ${
          syncStatus === 'success' ? 'bg-emerald-50 border border-emerald-200' :
          syncStatus === 'error' ? 'bg-rose-50 border border-rose-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          {syncStatus === 'success' && <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />}
          {syncStatus === 'error' && <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5" />}
          {(syncStatus === 'pushing' || syncStatus === 'pulling') && <Clock className="h-5 w-5 text-blue-600 mt-0.5 animate-spin" />}
          
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              syncStatus === 'success' ? 'text-emerald-800' :
              syncStatus === 'error' ? 'text-rose-800' :
              'text-blue-800'
            }`}>
              {syncMessage}
            </p>
            
            {syncProgress.total > 0 && syncStatus === 'pushing' && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-blue-700 mb-1">
                  <span>Progress</span>
                  <span>{syncProgress.current} / {syncProgress.total}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
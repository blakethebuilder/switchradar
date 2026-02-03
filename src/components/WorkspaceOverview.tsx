import React, { useState, useEffect } from 'react';
import { Database, Users, BarChart3, MapPin, Building, Eye, Trash2, RefreshCw } from 'lucide-react';
import { serverDataService } from '../services/serverData';
import { useAuth } from '../context/AuthContext';

interface WorkspaceData {
  userId: number;
  username: string;
  created_at: string;
  last_sync: string | null;
  businessCount: number;
  providerCount: number;
  townCount: number;
  categoryCount: number;
  firstImport: string | null;
  lastImport: string | null;
  storageUsedMB: string;
  isActive: boolean;
}

export const WorkspaceOverview: React.FC = () => {
  const { token, isAdmin } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin && token) {
      loadWorkspaces();
    }
  }, [isAdmin, token]);

  const loadWorkspaces = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const result = await serverDataService.getWorkspaces(token);
      if (result.success) {
        setWorkspaces(result.data?.workspaces || []);
      } else {
        setError(result.error || 'Failed to load workspaces');
      }
    } catch (error) {
      setError('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleViewWorkspace = (userId: number, username: string) => {
    // This could navigate to a detailed view or open a modal
    console.log(`Viewing workspace for user ${username} (ID: ${userId})`);
  };

  const handleClearWorkspace = async (userId: number, username: string) => {
    if (!token) return;
    
    if (window.confirm(`Are you sure you want to clear all data for ${username}? This cannot be undone.`)) {
      try {
        setLoading(true);
        const result = await serverDataService.clearUserBusinesses(userId, token);
        if (result.success) {
          await loadWorkspaces(); // Refresh the list
        } else {
          setError(result.error || 'Failed to clear workspace');
        }
      } catch (error) {
        setError('Failed to clear workspace');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Access Restricted</h3>
          <p className="text-slate-600">You need Admin privileges to view workspace overview.</p>
        </div>
      </div>
    );
  }

  const totalBusinesses = workspaces.reduce((sum, ws) => sum + ws.businessCount, 0);
  const activeWorkspaces = workspaces.filter(ws => ws.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Workspace Overview</h2>
              <p className="text-sm text-slate-600">Monitor all user workspaces and data</p>
            </div>
          </div>
          <button
            onClick={loadWorkspaces}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-slate-900">{workspaces.length}</div>
              <div className="text-sm text-slate-600">Total Users</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-slate-900">{activeWorkspaces}</div>
              <div className="text-sm text-slate-600">Active Workspaces</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <Building className="h-8 w-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold text-slate-900">{totalBusinesses.toLocaleString()}</div>
              <div className="text-sm text-slate-600">Total Businesses</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-orange-600" />
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {workspaces.reduce((sum, ws) => sum + parseFloat(ws.storageUsedMB), 0).toFixed(1)} MB
              </div>
              <div className="text-sm text-slate-600">Total Storage</div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspaces List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">User Workspaces</h3>
        </div>
        
        <div className="divide-y divide-slate-200">
          {workspaces.map((workspace) => (
            <div key={workspace.userId} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    workspace.isActive ? 'bg-green-100' : 'bg-slate-100'
                  }`}>
                    <Database className={`h-6 w-6 ${
                      workspace.isActive ? 'text-green-600' : 'text-slate-400'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{workspace.username}</h4>
                      {workspace.username.toLowerCase() === 'blake' && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Admin</span>
                      )}
                      {workspace.isActive && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {workspace.businessCount.toLocaleString()} businesses
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {workspace.townCount} towns
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {workspace.providerCount} providers
                      </div>
                      <div className="text-xs text-slate-500">
                        {workspace.storageUsedMB} MB used
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {workspace.last_sync ? (
                        <>Last sync: {new Date(workspace.last_sync).toLocaleDateString()}</>
                      ) : (
                        <>Joined: {new Date(workspace.created_at).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewWorkspace(workspace.userId, workspace.username)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View workspace details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {workspace.businessCount > 0 && workspace.username.toLowerCase() !== 'blake' && (
                    <button
                      onClick={() => handleClearWorkspace(workspace.userId, workspace.username)}
                      disabled={loading}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Clear workspace data"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {workspaces.length === 0 && !loading && (
            <div className="p-8 text-center">
              <Database className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No workspaces found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceOverview;
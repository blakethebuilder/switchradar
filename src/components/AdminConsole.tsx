import React, { useState } from 'react';
import { Users, Share2, Database, Upload, Download, Trash2, Shield, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserManagement from './UserManagement';
import UserDataManagement from './UserDataManagement';

interface AdminConsoleProps {
  onImportClick?: () => void;
  onExportClick?: () => void;
  onClearData?: () => void;
  totalCount?: number;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  onImportClick,
  onExportClick,
  onClearData,
  totalCount = 0
}) => {
  const { isAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'sharing' | 'data'>('overview');

  // Only admins can access this component
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <Shield className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">
            This area is restricted to administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Console</h1>
            <p className="text-sm text-slate-600">
              Welcome back, {user?.username}. Manage your SwitchRadar system.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'data'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="h-4 w-4" />
            Data Management
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('sharing')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sharing'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 className="h-4 w-4" />
            Data Sharing
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* System Stats */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Database</h3>
                <p className="text-xs text-slate-500">Current records</p>
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mb-2">
              {totalCount.toLocaleString()}
            </div>
            <p className="text-xs text-slate-600">Total businesses loaded</p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {onImportClick && (
                <button
                  onClick={onImportClick}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span className="font-medium">Import Data</span>
                </button>
              )}
              {onExportClick && (
                <button
                  onClick={onExportClick}
                  disabled={totalCount === 0}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span className="font-medium">Export Data</span>
                </button>
              )}
              {onClearData && (
                <button
                  onClick={onClearData}
                  disabled={totalCount === 0}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="font-medium">Clear Data</span>
                </button>
              )}
            </div>
          </div>

          {/* Admin Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Admin Access</h3>
                <p className="text-xs text-slate-500">System privileges</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Data Import</span>
                <span className="text-green-600 font-medium">✓ Enabled</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">User Management</span>
                <span className="text-green-600 font-medium">✓ Enabled</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Data Sharing</span>
                <span className="text-green-600 font-medium">✓ Enabled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Data Management</h3>
              <p className="text-sm text-slate-600">Import, export, and manage business data</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {onImportClick && (
              <div className="p-6 border border-slate-200 rounded-xl">
                <div className="text-center">
                  <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">Import Data</h4>
                  <p className="text-sm text-slate-600 mb-4">
                    Load new business data from Excel or CSV files
                  </p>
                  <button
                    onClick={onImportClick}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Import Businesses
                  </button>
                </div>
              </div>
            )}

            {onExportClick && (
              <div className="p-6 border border-slate-200 rounded-xl">
                <div className="text-center">
                  <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Download className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">Export Data</h4>
                  <p className="text-sm text-slate-600 mb-4">
                    Download current data as CSV for backup or analysis
                  </p>
                  <button
                    onClick={onExportClick}
                    disabled={totalCount === 0}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Export to CSV
                  </button>
                </div>
              </div>
            )}

            {onClearData && (
              <div className="p-6 border border-red-200 rounded-xl">
                <div className="text-center">
                  <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">Clear Data</h4>
                  <p className="text-sm text-slate-600 mb-4">
                    Remove all business data from the system
                  </p>
                  <button
                    onClick={onClearData}
                    disabled={totalCount === 0}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 text-amber-600 mt-0.5">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h5 className="font-bold text-amber-800 mb-1">Admin Only</h5>
                <p className="text-sm text-amber-700">
                  Only administrators can import, export, or clear data. Regular users can only view data that has been shared with them.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'sharing' && <UserDataManagement />}
    </div>
  );
};

export default AdminConsole;
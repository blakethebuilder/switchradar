import React, { useState, useMemo } from 'react';
import { Users, Share2, Database, Upload, Download, Trash2, Shield, BarChart3, Search, Filter, MapPin, Building2, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserManagement from './UserManagement';
import UserDataManagement from './UserDataManagement';

interface AdminConsoleProps {
  onImportClick?: () => void;
  onExportClick?: () => void;
  onClearData?: () => void;
  totalCount?: number;
  businesses?: any[];
  availableTowns?: string[];
  availableProviders?: string[];
  availableCategories?: string[];
  onDeleteBusiness?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  onImportClick,
  onExportClick,
  onClearData,
  totalCount = 0,
  businesses = [],
  availableTowns = [],
  availableProviders = [],
  availableCategories = [],
  onDeleteBusiness,
  onBulkDelete
}) => {
  const { isAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'database' | 'users' | 'sharing' | 'data'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Filter businesses based on search and filters
  const filteredBusinesses = useMemo(() => {
    return businesses.filter(business => {
      const matchesSearch = !searchTerm || 
        business.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.phone?.includes(searchTerm);
      
      const matchesTown = !selectedTown || business.town === selectedTown;
      const matchesProvider = !selectedProvider || business.provider === selectedProvider;
      const matchesCategory = !selectedCategory || business.category === selectedCategory;
      
      return matchesSearch && matchesTown && matchesProvider && matchesCategory;
    });
  }, [businesses, searchTerm, selectedTown, selectedProvider, selectedCategory]);

  // Statistics
  const stats = useMemo(() => {
    const totalBusinesses = businesses.length;
    const uniqueTowns = new Set(businesses.map(b => b.town)).size;
    const uniqueProviders = new Set(businesses.map(b => b.provider)).size;
    const uniqueCategories = new Set(businesses.map(b => b.category)).size;
    
    const providerBreakdown = businesses.reduce((acc: Record<string, number>, business: any) => {
      acc[business.provider] = (acc[business.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalBusinesses,
      uniqueTowns,
      uniqueProviders,
      uniqueCategories,
      providerBreakdown
    };
  }, [businesses]);

  // Handle business selection
  const handleSelectBusiness = (businessId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedBusinesses(prev => [...prev, businessId]);
    } else {
      setSelectedBusinesses(prev => prev.filter(id => id !== businessId));
    }
  };

  const handleSelectAll = () => {
    if (selectedBusinesses.length === filteredBusinesses.length) {
      setSelectedBusinesses([]);
    } else {
      setSelectedBusinesses(filteredBusinesses.map(b => b.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedBusinesses.length > 0 && onBulkDelete) {
      if (confirm(`Delete ${selectedBusinesses.length} selected businesses? This cannot be undone.`)) {
        onBulkDelete(selectedBusinesses);
        setSelectedBusinesses([]);
      }
    }
  };

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
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'database'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="h-4 w-4" />
            Database
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'data'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="h-4 w-4" />
            Data Management
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('sharing')}
            className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sharing'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 className="h-4 w-4" />
            Sharing
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Total Records</h3>
                  <p className="text-xs text-slate-500">Businesses in database</p>
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mb-2">
                {stats.totalBusinesses.toLocaleString()}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Towns</h3>
                  <p className="text-xs text-slate-500">Unique locations</p>
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mb-2">
                {stats.uniqueTowns}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Providers</h3>
                  <p className="text-xs text-slate-500">Network operators</p>
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mb-2">
                {stats.uniqueProviders}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Categories</h3>
                  <p className="text-xs text-slate-500">Business types</p>
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mb-2">
                {stats.uniqueCategories}
              </div>
            </div>
          </div>

          {/* Provider Breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Provider Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(stats.providerBreakdown)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 8)
                .map(([provider, count]) => (
                <div key={provider} className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-bold text-slate-900 truncate" title={provider}>
                    {provider}
                  </div>
                  <div className="text-sm text-slate-600">
                    {(count as number).toLocaleString()} businesses
                  </div>
                  <div className="text-xs text-slate-500">
                    {(((count as number) / stats.totalBusinesses) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {onImportClick && (
                <button
                  onClick={onImportClick}
                  className="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <Upload className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Import Data</div>
                    <div className="text-xs text-indigo-600">Add new businesses</div>
                  </div>
                </button>
              )}
              <button
                onClick={() => setActiveTab('database')}
                className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Database className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Browse Database</div>
                  <div className="text-xs text-blue-600">View & manage records</div>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className="flex items-center gap-3 p-4 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
              >
                <Users className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Manage Users</div>
                  <div className="text-xs text-green-600">User accounts & access</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Database Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Database Browser</h3>
                  <p className="text-sm text-slate-600">
                    {filteredBusinesses.length.toLocaleString()} of {businesses.length.toLocaleString()} records
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showFilters ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search businesses by name, address, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <select
                  value={selectedTown}
                  onChange={(e) => setSelectedTown(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Towns</option>
                  {availableTowns.map(town => (
                    <option key={town} value={town}>{town}</option>
                  ))}
                </select>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Providers</option>
                  {availableProviders.map(provider => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {availableCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Bulk Actions */}
            {selectedBusinesses.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedBusinesses.length} businesses selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete Selected
                  </button>
                  <button
                    onClick={() => setSelectedBusinesses([])}
                    className="px-3 py-1 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Database Content */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedBusinesses.length === filteredBusinesses.length && filteredBusinesses.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-slate-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Provider</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredBusinesses.slice(0, 100).map((business) => (
                      <tr key={business.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedBusinesses.includes(business.id)}
                            onChange={(e) => handleSelectBusiness(business.id, e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{business.name}</div>
                          <div className="text-sm text-slate-500">{business.address}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-900">{business.town}</div>
                          <div className="text-xs text-slate-500">{business.province}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {business.provider}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">{business.category}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{business.phone}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onDeleteBusiness?.(business.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Delete business"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredBusinesses.length > 100 && (
                  <div className="p-4 text-center text-sm text-slate-600 bg-slate-50">
                    Showing first 100 results. Use filters to narrow down the list.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBusinesses.slice(0, 50).map((business) => (
                    <div key={business.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <input
                          type="checkbox"
                          checked={selectedBusinesses.includes(business.id)}
                          onChange={(e) => handleSelectBusiness(business.id, e.target.checked)}
                          className="rounded border-slate-300 mt-1"
                        />
                        <button
                          onClick={() => onDeleteBusiness?.(business.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2">{business.name}</h4>
                      <div className="space-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {business.town}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {business.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {business.category}
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {business.provider}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredBusinesses.length > 50 && (
                  <div className="mt-4 text-center text-sm text-slate-600">
                    Showing first 50 results in grid view. Use filters to narrow down the list.
                  </div>
                )}
              </div>
            )}
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
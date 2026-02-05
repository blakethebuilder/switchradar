import React, { useState, useMemo, useEffect } from 'react';
import { Users, Share2, Database, Upload, Trash2, Shield, BarChart3, Search, MapPin, Building2, Phone, FolderOpen, Edit3, Plus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { serverDataService } from '../services/serverData';
import { environmentConfig } from '../config/environment';
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
  const { isAdmin, isSuperAdmin, user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'data-hub' | 'users' | 'sharing'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Dataset management state
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<any>(null);
  const [showCreateDataset, setShowCreateDataset] = useState(false);
  const [showEditDataset, setShowEditDataset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newDataset, setNewDataset] = useState({
    name: '',
    description: '',
    town: '',
    province: ''
  });

  // Load datasets on component mount
  useEffect(() => {
    if (isAdmin && token) {
      loadDatasets();
    }
  }, [isAdmin, token]);

  const loadDatasets = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const apiUrl = environmentConfig.getApiUrl();
      const response = await fetch(`${apiUrl}/api/datasets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setDatasets(result.datasets || []);
      }
    } catch (error) {
      console.error('Failed to load datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDataset = async () => {
    if (!token || !newDataset.name || !newDataset.town) return;

    try {
      setLoading(true);
      const result = await serverDataService.createDataset(
        newDataset.name,
        newDataset.description,
        newDataset.town,
        newDataset.province,
        token
      );

      if (result.success) {
        await loadDatasets();
        setShowCreateDataset(false);
        setNewDataset({ name: '', description: '', town: '', province: '' });
      }
    } catch (error) {
      console.error('Failed to create dataset:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDataset = async () => {
    if (!token || !selectedDataset) return;

    try {
      setLoading(true);
      const result = await serverDataService.updateDataset(
        selectedDataset.id,
        {
          name: selectedDataset.name,
          description: selectedDataset.description,
          town: selectedDataset.town,
          province: selectedDataset.province
        },
        token
      );

      if (result.success) {
        await loadDatasets();
        setShowEditDataset(false);
        setSelectedDataset(null);
      }
    } catch (error) {
      console.error('Failed to update dataset:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDataset = async (datasetId: number) => {
    if (!token || !isSuperAdmin) return;

    if (confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      try {
        setLoading(true);
        const result = await serverDataService.deleteDataset(datasetId, token);

        if (result.success) {
          await loadDatasets();
        }
      } catch (error) {
        console.error('Failed to delete dataset:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // No-op for removed methods
  const handleViewDatasetDetails = (dataset: any) => setSelectedDataset(dataset);

  // Filter businesses based on search and filters
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((business: any) => {
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
    const uniqueTowns = new Set(businesses.map((b: any) => b.town)).size;
    const uniqueProviders = new Set(businesses.map((b: any) => b.provider)).size;
    const uniqueCategories = new Set(businesses.map((b: any) => b.category)).size;

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

  const handleToggleDatasetStatus = async (dataset: any) => {
    if (!token) return;

    try {
      setLoading(true);
      const newStatus = !dataset.is_active;
      const result = await serverDataService.updateDataset(
        dataset.id,
        { is_active: newStatus },
        token
      );

      if (result.success) {
        await loadDatasets();
      }
    } catch (error) {
      console.error('Failed to toggle dataset status:', error);
    } finally {
      setLoading(false);
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
            className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('data-hub')}
            className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'data-hub'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Database className="h-4 w-4" />
            Data Hub
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'users'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Users className="h-4 w-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('sharing')}
            className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'sharing'
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
                .sort(([, a], [, b]) => (b as number) - (a as number))
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
                onClick={() => setActiveTab('data-hub')}
                className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Database className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Data Hub</div>
                  <div className="text-xs text-blue-600">View & manage all lead data</div>
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

      {activeTab === 'data-hub' && (
        <div className="space-y-6">
          {/* Section 1: Data Management (Import/Export/Clear) */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Upload className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Import & Export</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {onImportClick && (
                <div className="p-4 border border-slate-200 rounded-xl">
                  <div className="text-center">
                    <h4 className="font-bold text-slate-900 mb-2">Import Data</h4>
                    <p className="text-sm text-slate-600 mb-4">Load leads from Excel/CSV</p>
                    <button onClick={onImportClick} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                      Import Businesses
                    </button>
                  </div>
                </div>
              )}
              {onExportClick && (
                <div className="p-4 border border-slate-200 rounded-xl">
                  <div className="text-center">
                    <h4 className="font-bold text-slate-900 mb-2">Export Data</h4>
                    <p className="text-sm text-slate-600 mb-4">Download all lead data</p>
                    <button onClick={onExportClick} disabled={totalCount === 0} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                      Export to CSV
                    </button>
                  </div>
                </div>
              )}
              {onClearData && (
                <div className="p-4 border border-red-200 rounded-xl">
                  <div className="text-center">
                    <h4 className="font-bold text-slate-900 mb-2">Clear Data</h4>
                    <p className="text-sm text-slate-600 mb-4">Wipe local/cloud DB</p>
                    <button onClick={onClearData} disabled={totalCount === 0} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
                      Clear All Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Datasets */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Datasets</h3>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={onImportClick}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Import
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((dataset) => (
                <div key={dataset.id} className={`border rounded-lg p-4 transition-colors ${dataset.is_active ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200 bg-slate-50 opacity-75 opacity-75'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold truncate ${dataset.is_active ? 'text-slate-900' : 'text-slate-500'}`}>{dataset.name}</h4>
                        {!dataset.is_active && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">DISABLED</span>}
                      </div>
                      <p className="text-sm text-slate-600 truncate">{dataset.town}{dataset.province && `, ${dataset.province}`}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleDatasetStatus(dataset)}
                        className={`p-1 transition-colors ${dataset.is_active ? 'text-green-600 hover:text-green-700' : 'text-slate-400 hover:text-slate-600'}`}
                        title={dataset.is_active ? 'Disable Dataset' : 'Enable Dataset'}
                      >
                        {dataset.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button onClick={() => handleViewDatasetDetails(dataset)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                        <FolderOpen className="h-4 w-4" />
                      </button>
                      {isSuperAdmin && (
                        <>
                          <button onClick={() => { setSelectedDataset(dataset); setShowEditDataset(true); }} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteDataset(dataset.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <span>{dataset.business_count || 0} businesses</span>
                    <span>{new Date(dataset.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Database Browser */}
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  <Database className="h-4 w-4" />
                  Filters
                </button>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                  >
                    Grid
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg mb-4">
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

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search lead database..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Bulk Actions */}
              {selectedBusinesses.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
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
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                {viewMode === 'table' ? (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left w-10">
                          <input
                            type="checkbox"
                            checked={selectedBusinesses.length === filteredBusinesses.length && filteredBusinesses.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-slate-300"
                          />
                        </th>
                        <th className="px-4 py-3 text-left">Business</th>
                        <th className="px-4 py-3 text-left">Location</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBusinesses.slice(0, 50).map((business: any) => (
                        <tr key={business.id}>
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
                            <div className="text-xs text-slate-500">{business.provider}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{business.town}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => onDeleteBusiness?.(business.id)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredBusinesses.slice(0, 50).map((business: any) => (
                      <div key={business.id} className="p-3 border border-slate-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-slate-900">{business.name}</div>
                            <div className="text-xs text-slate-500">{business.provider}</div>
                            <div className="text-xs text-slate-600 mt-1">{business.town}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedBusinesses.includes(business.id)}
                            onChange={(e) => handleSelectBusiness(business.id, e.target.checked)}
                            className="rounded border-slate-300"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-2">
                  {filteredBusinesses.length > 50 ? 'Showing first 50 results' : `Showing all ${filteredBusinesses.length} results`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'sharing' && <UserDataManagement />}

      {/* Create Dataset Modal */}
      {showCreateDataset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Dataset</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newDataset.name}
                  onChange={(e) => setNewDataset((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Dataset name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Town *</label>
                <input
                  type="text"
                  value={newDataset.town}
                  onChange={(e) => setNewDataset((prev: any) => ({ ...prev, town: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Town name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Province</label>
                <input
                  type="text"
                  value={newDataset.province}
                  onChange={(e) => setNewDataset((prev: any) => ({ ...prev, province: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Province name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newDataset.description}
                  onChange={(e) => setNewDataset((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                  placeholder="Dataset description"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleCreateDataset}
                disabled={!newDataset.name || !newDataset.town || loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Importing...' : 'Import'}
              </button>
              <button
                onClick={() => {
                  setShowCreateDataset(false);
                  setNewDataset({ name: '', description: '', town: '', province: '' });
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dataset Modal */}
      {showEditDataset && selectedDataset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Dataset</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={selectedDataset.name}
                  onChange={(e) => setSelectedDataset((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Dataset name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Town *</label>
                <input
                  type="text"
                  value={selectedDataset.town}
                  onChange={(e) => setSelectedDataset((prev: any) => ({ ...prev, town: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Town name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Province</label>
                <input
                  type="text"
                  value={selectedDataset.province || ''}
                  onChange={(e) => setSelectedDataset((prev: any) => ({ ...prev, province: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Province name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={selectedDataset.description || ''}
                  onChange={(e) => setSelectedDataset((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                  placeholder="Dataset description"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleUpdateDataset}
                disabled={!selectedDataset.name || !selectedDataset.town || loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Updating...' : 'Update Dataset'}
              </button>
              <button
                onClick={() => {
                  setShowEditDataset(false);
                  setSelectedDataset(null);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConsole;
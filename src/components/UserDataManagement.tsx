import React, { useState, useEffect } from 'react';
import { Users, Database, Eye, Edit, Plus, Trash2, Search, Share2, MapPin, Building2, X } from 'lucide-react';
import { serverDataService } from '../services/serverData';
import { useAuth } from '../context/AuthContext';
import type { Business } from '../types';

interface UserDataStats {
  userId: number;
  username: string;
  businessCount: number;
  routeCount: number;
  lastSync: string;
  storageUsed: number;
}

interface AvailableTown {
  name: string;
  businessCount: number;
}

export const UserDataManagement: React.FC = () => {
  const { token } = useAuth();
  const [userStats, setUserStats] = useState<UserDataStats[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserBusinesses, setSelectedUserBusinesses] = useState<Business[]>([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddBusinessModal, setShowAddBusinessModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState<'towns' | 'businesses'>('towns');
  const [availableTowns, setAvailableTowns] = useState<AvailableTown[]>([]);
  const [selectedTowns, setSelectedTowns] = useState<string[]>([]);
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showSharedDataModal, setShowSharedDataModal] = useState(false);
  const [newBusiness, setNewBusiness] = useState<Partial<Business>>({
    name: '',
    address: '',
    phone: '',
    provider: '',
    category: '',
    town: ''
  });

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    if (!token) return;
    
    try {
      const result = await serverDataService.getUsers(token);
      if (result.success) {
        const users = result.data || [];
        const stats: UserDataStats[] = users.map((user: any) => ({
          userId: user.id,
          username: user.username,
          businessCount: user.total_businesses || 0,
          routeCount: 0, // Would need separate endpoint for routes
          lastSync: user.last_sync || new Date().toISOString(),
          storageUsed: user.storage_used_mb || 0
        }));
        setUserStats(stats);
      } else {
        setError(result.error || 'Failed to load user statistics');
      }
    } catch (err) {
      setError('Failed to load user statistics');
    }
  };

  const loadUserBusinesses = async (businessUserId: number) => {
    if (!token) return;
    
    try {
      const result = await serverDataService.getUserBusinesses(businessUserId, token);
      if (result.success) {
        setSelectedUserBusinesses(result.data || []);
      } else {
        setError(result.error || 'Failed to load user businesses');
      }
    } catch (err) {
      setError('Failed to load user businesses');
    }
  };

  const handleViewUserData = (userId: number) => {
    setSelectedUserId(userId);
    loadUserBusinesses(userId);
  };

  const handleAddBusiness = async () => {
    if (!token || !selectedUserId) return;
    
    try {
      const businessToAdd: Business = {
        id: `business_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name: newBusiness.name || '',
        address: newBusiness.address || '',
        phone: newBusiness.phone || '',
        email: newBusiness.email || '',
        website: newBusiness.website || '',
        provider: newBusiness.provider || '',
        category: newBusiness.category || '',
        town: newBusiness.town || '',
        province: newBusiness.province || '',
        coordinates: { lat: 0, lng: 0 }, // Would need geocoding
        status: 'active',
        notes: [],
        importedAt: new Date(),
        source: 'manual',
        metadata: {}
      };

      const result = await serverDataService.addBusiness(businessToAdd, token);
      if (result.success) {
        setShowAddBusinessModal(false);
        setNewBusiness({
          name: '',
          address: '',
          phone: '',
          provider: '',
          category: '',
          town: ''
        });
        loadUserBusinesses(selectedUserId);
        loadUserStats(); // Refresh stats
      } else {
        setError(result.error || 'Failed to add business');
      }
    } catch (err) {
      setError('Failed to add business');
    }
  };

  const loadAvailableTowns = async () => {
    if (!token) return;
    
    try {
      const result = await serverDataService.getAvailableTowns(token);
      if (result.success) {
        setAvailableTowns(result.data || []);
      } else {
        setError(result.error || 'Failed to load available towns');
      }
    } catch (err) {
      setError('Failed to load available towns');
    }
  };

  const handleShareTowns = async () => {
    if (!token || !targetUserId || selectedTowns.length === 0) return;
    
    setIsSharing(true);
    try {
      const result = await serverDataService.shareTowns(targetUserId, selectedTowns, token);
      if (result.success) {
        setShowShareModal(false);
        setSelectedTowns([]);
        setTargetUserId(null);
        loadUserStats(); // Refresh stats
        alert(`Successfully shared ${selectedTowns.length} towns with user!`);
      } else {
        setError(result.error || 'Failed to share towns');
      }
    } catch (err) {
      setError('Failed to share towns');
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareBusinesses = async () => {
    if (!token || !targetUserId || selectedBusinesses.length === 0) return;
    
    setIsSharing(true);
    try {
      const result = await serverDataService.shareBusinesses(targetUserId, selectedBusinesses, token);
      if (result.success) {
        setShowShareModal(false);
        setSelectedBusinesses([]);
        setTargetUserId(null);
        loadUserStats(); // Refresh stats
        alert(`Successfully shared ${selectedBusinesses.length} businesses with user!`);
      } else {
        setError(result.error || 'Failed to share businesses');
      }
    } catch (err) {
      setError('Failed to share businesses');
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshareTowns = async (targetUserId: number, towns: string[]) => {
    if (!token) return;
    
    try {
      const result = await serverDataService.unshareTowns(targetUserId, towns, token);
      if (result.success) {
        alert(`Successfully unshared ${towns.length} towns from user!`);
        loadUserStats(); // Refresh stats
      } else {
        setError(result.error || 'Failed to unshare towns');
      }
    } catch (err) {
      setError('Failed to unshare towns');
    }
  };

  const handleUnshareBusinesses = async (targetUserId: number, businessIds: string[]) => {
    if (!token) return;
    
    try {
      const result = await serverDataService.unshareBusinesses(targetUserId, businessIds, token);
      if (result.success) {
        alert(`Successfully unshared ${businessIds.length} businesses from user!`);
        loadUserStats(); // Refresh stats
      } else {
        setError(result.error || 'Failed to unshare businesses');
      }
    } catch (err) {
      setError('Failed to unshare businesses');
    }
  };

  const openShareModal = (type: 'towns' | 'businesses') => {
    setShareType(type);
    setShowShareModal(true);
    if (type === 'towns') {
      loadAvailableTowns();
    }
    setSelectedTowns([]);
    setSelectedBusinesses([]);
    setTargetUserId(null);
  };

  const handleDeleteBusiness = async (businessId: string) => {
    if (!token || !window.confirm('Are you sure you want to delete this business?')) return;
    
    try {
      const result = await serverDataService.deleteBusiness(businessId, token);
      if (result.success) {
        loadUserBusinesses(selectedUserId!);
        loadUserStats(); // Refresh stats
      } else {
        setError(result.error || 'Failed to delete business');
      }
    } catch (err) {
      setError('Failed to delete business');
    }
  };

  const filteredBusinesses = selectedUserBusinesses.filter(business =>
    business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Database className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">User Data Management</h2>
              <p className="text-sm text-slate-600">View and manage all users' business data</p>
            </div>
          </div>
          
          {/* Share Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSharedDataModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Eye className="h-4 w-4" />
              View Shared Data
            </button>
            <button
              onClick={() => openShareModal('towns')}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <MapPin className="h-4 w-4" />
              Share Towns
            </button>
            <button
              onClick={() => openShareModal('businesses')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Building2 className="h-4 w-4" />
              Share Businesses
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* User Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {userStats.map((stat) => (
          <div key={stat.userId} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{stat.username}</h3>
                  <p className="text-xs text-slate-500">User ID: {stat.userId}</p>
                </div>
              </div>
              <button
                onClick={() => handleViewUserData(stat.userId)}
                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="View user data"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Businesses:</span>
                <span className="text-sm font-bold text-slate-900">{stat.businessCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Routes:</span>
                <span className="text-sm font-bold text-slate-900">{stat.routeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Storage:</span>
                <span className="text-sm font-bold text-slate-900">{stat.storageUsed} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Last Sync:</span>
                <span className="text-sm font-bold text-slate-900">
                  {new Date(stat.lastSync).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* User Business Data View */}
      {selectedUserId && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {userStats.find(u => u.userId === selectedUserId)?.username}'s Business Data
                </h3>
                <p className="text-sm text-slate-600">
                  {filteredBusinesses.length} businesses
                  {selectedBusinesses.length > 0 && (
                    <span className="ml-2 text-indigo-600">
                      • {selectedBusinesses.length} selected
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedBusinesses.length > 0 && (
                  <button
                    onClick={() => openShareModal('businesses')}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Share2 className="h-4 w-4" />
                    Share Selected ({selectedBusinesses.length})
                  </button>
                )}
                <button
                  onClick={() => setShowAddBusinessModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Business
                </button>
              </div>
            </div>

            {/* Bulk Selection Controls */}
            {filteredBusinesses.length > 0 && (
              <div className="mt-4 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={selectedBusinesses.length === filteredBusinesses.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBusinesses(filteredBusinesses.map(b => b.id));
                      } else {
                        setSelectedBusinesses([]);
                      }
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Select All
                </label>
                {selectedBusinesses.length > 0 && (
                  <button
                    onClick={() => setSelectedBusinesses([])}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            )}

            {/* Search */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Search businesses..."
              />
            </div>
          </div>

          {/* Business List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredBusinesses.map((business) => (
              <div key={business.id} className="p-4 border-b border-slate-100 hover:bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedBusinesses.includes(business.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBusinesses([...selectedBusinesses, business.id]);
                        } else {
                          setSelectedBusinesses(selectedBusinesses.filter(b => b !== business.id));
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{business.name}</h4>
                      <p className="text-sm text-slate-600">{business.address}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-slate-500">{business.phone}</span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {business.provider}
                        </span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                          {business.category}
                        </span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {business.town}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {/* Edit functionality */}}
                      className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit business"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBusiness(business.id)}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete business"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Business Modal */}
      {showAddBusinessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Business</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                value={newBusiness.name}
                onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Business name *"
              />
              <input
                type="text"
                value={newBusiness.address}
                onChange={(e) => setNewBusiness({ ...newBusiness, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Address"
              />
              <input
                type="text"
                value={newBusiness.phone}
                onChange={(e) => setNewBusiness({ ...newBusiness, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Phone"
              />
              <input
                type="text"
                value={newBusiness.provider}
                onChange={(e) => setNewBusiness({ ...newBusiness, provider: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Provider"
              />
              <input
                type="text"
                value={newBusiness.category}
                onChange={(e) => setNewBusiness({ ...newBusiness, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Category"
              />
              <input
                type="text"
                value={newBusiness.town}
                onChange={(e) => setNewBusiness({ ...newBusiness, town: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Town"
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddBusinessModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBusiness}
                disabled={!newBusiness.name}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Business
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Share {shareType === 'towns' ? 'Towns' : 'Businesses'}
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Target User Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Target User
              </label>
              <select
                value={targetUserId || ''}
                onChange={(e) => setTargetUserId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Choose a user...</option>
                {userStats.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.username} ({user.businessCount} businesses)
                  </option>
                ))}
              </select>
            </div>

            {shareType === 'towns' ? (
              /* Towns Selection */
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Towns to Share ({selectedTowns.length} selected)
                </label>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                  {availableTowns.map((town) => (
                    <label
                      key={town.name}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTowns.includes(town.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTowns([...selectedTowns, town.name]);
                          } else {
                            setSelectedTowns(selectedTowns.filter(t => t !== town.name));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{town.name}</div>
                        <div className="text-sm text-slate-500">{town.businessCount} businesses</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              /* Businesses Selection */
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Businesses to Share ({selectedBusinesses.length} selected)
                </label>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                  {filteredBusinesses.map((business) => (
                    <label
                      key={business.id}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBusinesses.includes(business.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBusinesses([...selectedBusinesses, business.id]);
                          } else {
                            setSelectedBusinesses(selectedBusinesses.filter(b => b !== business.id));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{business.name}</div>
                        <div className="text-sm text-slate-500">{business.address}</div>
                        <div className="text-xs text-slate-400">{business.town} • {business.provider}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={shareType === 'towns' ? handleShareTowns : handleShareBusinesses}
                disabled={
                  !targetUserId || 
                  isSharing || 
                  (shareType === 'towns' ? selectedTowns.length === 0 : selectedBusinesses.length === 0)
                }
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSharing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    Share {shareType === 'towns' ? `${selectedTowns.length} Towns` : `${selectedBusinesses.length} Businesses`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Data Viewing Modal */}
      {showSharedDataModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Shared Data Overview</h3>
              <button
                onClick={() => setShowSharedDataModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {userStats.map((user) => (
                <div key={user.userId} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-900">{user.username}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUnshareTowns(user.userId, ['example-town'])}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Unshare Towns
                      </button>
                      <button
                        onClick={() => handleUnshareBusinesses(user.userId, ['example-business'])}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Unshare Businesses
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>Shared data will be displayed here when the backend API is fully implemented.</p>
                    <p className="mt-1">This includes shared towns and businesses for each user.</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSharedDataModal(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDataManagement;
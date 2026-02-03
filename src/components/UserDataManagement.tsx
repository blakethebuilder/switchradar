import React, { useState, useEffect } from 'react';
import { Users, Database, Eye, Edit, Plus, Trash2, Search } from 'lucide-react';
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

export const UserDataManagement: React.FC = () => {
  const { token } = useAuth();
  const [userStats, setUserStats] = useState<UserDataStats[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserBusinesses, setSelectedUserBusinesses] = useState<Business[]>([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddBusinessModal, setShowAddBusinessModal] = useState(false);
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
      // This would need a new server endpoint to get all users' stats
      // For now, we'll simulate it
      const mockStats: UserDataStats[] = [
        {
          userId: 1,
          username: 'blake',
          businessCount: 1250,
          routeCount: 15,
          lastSync: '2026-02-03T10:30:00Z',
          storageUsed: 2.4
        },
        {
          userId: 2,
          username: 'Sean',
          businessCount: 890,
          routeCount: 8,
          lastSync: '2026-02-02T16:45:00Z',
          storageUsed: 1.8
        },
        {
          userId: 3,
          username: 'Jarred',
          businessCount: 456,
          routeCount: 3,
          lastSync: '2026-02-01T09:15:00Z',
          storageUsed: 0.9
        }
      ];
      
      setUserStats(mockStats);
    } catch (err) {
      setError('Failed to load user statistics');
    }
  };

  const loadUserBusinesses = async (businessUserId: number) => {
    if (!token) return;
    
    try {
      // This would need a server endpoint to get businesses for a specific user
      // For now, we'll use the current user's businesses as a demo
      console.log('Loading businesses for user:', businessUserId);
      const result = await serverDataService.getBusinesses(token);
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
        id: `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Database className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">User Data Management</h2>
            <p className="text-sm text-slate-600">View and manage all users' business data</p>
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
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddBusinessModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Business
                </button>
              </div>
            </div>

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
    </div>
  );
};

export default UserDataManagement;
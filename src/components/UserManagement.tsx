import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Shield, User as UserIcon, Calendar, CheckCircle, Edit, Key, X } from 'lucide-react';
import { serverDataService } from '../services/serverData';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, ButtonLoading } from './LoadingStates';

interface ServerUser {
  id: number;
  username: string;
  created_at: string;
  last_sync: string | null;
  total_businesses: number;
  storage_used_mb: number;
}

export const UserManagement: React.FC = () => {
  const { user: currentUser, isAdmin, token } = useAuth();
  const [users, setUsers] = useState<ServerUser[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ServerUser | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: ''
  });
  const [editUser, setEditUser] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin && token) {
      loadUsers();
    }
  }, [isAdmin, token]);

  const loadUsers = async () => {
    if (!token) return;

    setLoading(true);
    try {
      console.log('🔍 Loading users with token:', token?.substring(0, 20) + '...');
      const result = await serverDataService.getUsers(token);
      console.log('📥 Users result:', result);
      if (result.success) {
        console.log('✅ Setting users:', result.data);
        // Handle both direct array and nested { success: true, data: [...] } format
        const userData = Array.isArray(result.data) ? result.data : (result.data.data || []);
        setUsers(userData);
      } else {
        console.error('❌ Failed to load users:', result.error);
        setError(result.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('💥 Exception loading users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!token) return;

    try {
      setError('');

      if (!newUser.username.trim()) {
        setError('Username is required');
        return;
      }

      if (!newUser.password.trim()) {
        setError('Password is required');
        return;
      }

      setLoading(true);
      console.log('🚀 Creating user:', newUser.username);
      const result = await serverDataService.createUser(newUser.username.trim(), newUser.password, token);
      console.log('📥 Create user result:', result);

      if (result.success) {
        setSuccess(`User "${newUser.username}" created successfully`);
        setNewUser({ username: '', password: '' });
        setIsAddModalOpen(false);
        console.log('🔄 Reloading users after creation...');
        await loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        console.error('❌ Failed to create user:', result.error);
        setError(result.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('💥 Exception creating user:', error);
      setError(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!token) return;

    if (userId === currentUser?.id) {
      setError('Cannot delete your own account');
      return;
    }

    if (window.confirm(`Are you sure you want to delete user "${username}" and all their data? This action cannot be undone.`)) {
      try {
        setLoading(true);
        const result = await serverDataService.deleteUser(userId, token);

        if (result.success) {
          setSuccess(`User "${username}" deleted successfully`);
          await loadUsers();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError(result.error || 'Failed to delete user');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to delete user');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditUser = (user: ServerUser) => {
    setEditingUser(user);
    setEditUser({
      username: user.username,
      password: ''
    });
    setIsEditModalOpen(true);
    setError('');
  };

  const handleUpdateUser = async () => {
    if (!token || !editingUser) return;

    try {
      setError('');

      if (!editUser.username.trim()) {
        setError('Username is required');
        return;
      }

      setLoading(true);
      console.log('🔄 Updating user:', editingUser.id);

      const updates: { username?: string; password?: string } = {};

      // Only update username if it changed
      if (editUser.username.trim() !== editingUser.username) {
        updates.username = editUser.username.trim();
      }

      // Only update password if provided
      if (editUser.password.trim()) {
        updates.password = editUser.password.trim();
      }

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        return;
      }

      const result = await serverDataService.updateUser(editingUser.id, updates, token);

      if (result.success) {
        setSuccess(`User "${editUser.username}" updated successfully`);
        setEditUser({ username: '', password: '' });
        setEditingUser(null);
        setIsEditModalOpen(false);
        await loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        console.error('❌ Failed to update user:', result.error);
        setError(result.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('💥 Exception updating user:', error);
      setError(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Access Restricted</h3>
          <p className="text-slate-600">You need Admin privileges to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">User Management</h2>
              <p className="text-sm text-slate-600">Manage system users and their access</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm font-medium">{success}</p>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            System Users ({users.length})
            {loading && <LoadingSpinner size="sm" inline />}
          </h3>
        </div>

        <div className="divide-y divide-slate-200">
          {users.map((user) => (
            <div key={user.id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    {user.username.toLowerCase() === 'blake' ? (
                      <Shield className="h-4 w-4 text-blue-600" />
                    ) : (
                      <UserIcon className="h-4 w-4 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{user.username}</h4>
                      {user.id === currentUser?.id && (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">You</span>
                      )}
                      {user.username.toLowerCase() === 'blake' && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Admin</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="h-3 w-3" />
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                      {user.last_sync && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Last sync {new Date(user.last_sync).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <span>{user.total_businesses || 0} businesses</span>
                      <span>{user.storage_used_mb?.toFixed(1) || '0.0'} MB used</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {user.id !== currentUser?.id && (
                    <button
                      onClick={() => handleEditUser(user)}
                      disabled={loading}
                      className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Edit User"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  {user.id !== currentUser?.id && user.username.toLowerCase() !== 'blake' && (
                    <button
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      disabled={loading}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {users.length === 0 && !loading && (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No users found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New User</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter username"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter password"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNewUser({ username: '', password: '' });
                  setError('');
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={loading || !newUser.username.trim() || !newUser.password.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ButtonLoading loading={loading} loadingText="Creating...">
                  Add User
                </ButtonLoading>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit User</h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
                  setEditUser({ username: '', password: '' });
                  setError('');
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={editUser.username}
                  onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter username"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Password
                  <span className="text-slate-500 font-normal"> (leave blank to keep current)</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={editUser.password}
                    onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter new password (optional)"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
                  setEditUser({ username: '', password: '' });
                  setError('');
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={loading || !editUser.username.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ButtonLoading loading={loading} loadingText="Updating...">
                  Update User
                </ButtonLoading>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
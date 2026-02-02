import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, User as UserIcon, Mail, Calendar, CheckCircle, XCircle, Crown } from 'lucide-react';
import { UserManager, type User } from '../utils/userManager';
import { useAuth } from '../context/AuthContext';

export const UserManagement: React.FC = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    role: 'user' as 'superAdmin' | 'admin' | 'user'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    try {
      const allUsers = UserManager.getUsers();
      setUsers(allUsers);
    } catch (error) {
      setError('Failed to load users');
    }
  };

  const handleAddUser = async () => {
    try {
      setError('');
      
      if (!newUser.username.trim()) {
        setError('Username is required');
        return;
      }

      UserManager.addUser({
        username: newUser.username.trim(),
        email: newUser.email.trim() || undefined,
        role: newUser.role
      });

      setSuccess(`User "${newUser.username}" created successfully`);
      setNewUser({ username: '', email: '', role: 'user' });
      setIsAddModalOpen(false);
      loadUsers();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setError('');
      
      UserManager.updateUser(editingUser.id, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        isActive: editingUser.isActive
      });

      setSuccess(`User "${editingUser.username}" updated successfully`);
      setEditingUser(null);
      loadUsers();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (userId === currentUser?.id) {
      setError('Cannot delete your own account');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        UserManager.deleteUser(userId);
        setSuccess('User deleted successfully');
        loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to delete user');
      }
    }
  };

  const handleImportUsers = () => {
    try {
      const userData = JSON.parse(importData);
      const importCount = UserManager.importUsersFromData(Array.isArray(userData) ? userData : [userData]);
      setSuccess(`Successfully imported ${importCount} users`);
      setShowImportModal(false);
      setImportData('');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Invalid JSON format. Please check your data.');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superAdmin':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-slate-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superAdmin':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Access Restricted</h3>
          <p className="text-slate-600">You need Super Admin privileges to manage users.</p>
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
              <p className="text-sm text-slate-600">Manage system users and permissions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
            >
              Import Users
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Users ({users.length})</h3>
        </div>
        
        <div className="divide-y divide-slate-200">
          {users.map((user) => (
            <div key={user.id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{user.username}</h4>
                      {user.id === currentUser?.id && (
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">You</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      {user.email && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Calendar className="h-3 w-3" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadge(user.role)}`}>
                    {getRoleIcon(user.role)}
                    {user.role}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    {user.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit User"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {users.length === 0 && (
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
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter email (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superAdmin">Super Admin</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNewUser({ username: '', email: '', role: 'user' });
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={editingUser.id === currentUser?.id} // Can't change own role
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superAdmin">Super Admin</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingUser.isActive}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={editingUser.id === currentUser?.id} // Can't deactivate own account
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active</label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Update User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Users Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Import Users</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  User Data (JSON format)
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="w-full h-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder={`[
  {
    "username": "john",
    "email": "john@example.com",
    "role": "user"
  },
  {
    "username": "admin",
    "email": "admin@example.com", 
    "role": "admin"
  }
]`}
                />
              </div>
              
              <div className="text-xs text-slate-600">
                <p className="mb-2"><strong>Format:</strong> JSON array of user objects</p>
                <p><strong>Required fields:</strong> username</p>
                <p><strong>Optional fields:</strong> email, role (user/admin/superAdmin), isActive (true/false)</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData('');
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportUsers}
                disabled={!importData.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Users
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
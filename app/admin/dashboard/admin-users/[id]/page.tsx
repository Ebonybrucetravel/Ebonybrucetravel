// app/admin/dashboard/admin-users/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  getAdminUser, 
  updateAdminUser, 
  deleteAdminUser, 
  assignAdminPermissions 
} from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

export default function AdminUserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    role: '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin');
          return;
        }

        const response = await getAdminUser(params.id as string);
        
        if (response.success && response.data) {
          setUser(response.data);
          setEditForm({
            name: response.data.name || '',
            phone: response.data.phone || '',
            role: response.data.role || '',
          });
          setPermissions(response.data.permissions || {});
        } else {
          throw new Error(response.message || 'Failed to fetch user');
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchUser();
    }
  }, [params.id, router]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const response = await updateAdminUser(params.id as string, editForm);
      if (response.success) {
        setUser({ ...user, ...editForm });
        setIsEditing(false);
        alert('User updated successfully');
      } else {
        throw new Error(response.message || 'Failed to update user');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Failed to update user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsUpdating(true);
    try {
      const response = await deleteAdminUser(params.id as string);
      if (response.success) {
        alert('User deleted successfully');
        router.push('/admin/dashboard/admin-users');
      } else {
        throw new Error(response.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user');
    } finally {
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAssignPermissions = async () => {
    setIsUpdating(true);
    try {
      const response = await assignAdminPermissions(params.id as string, { permissions });
      if (response.success) {
        setUser({ ...user, permissions: response.data.permissions });
        setShowPermissionsModal(false);
        alert('Permissions updated successfully');
      } else {
        throw new Error(response.message || 'Failed to assign permissions');
      }
    } catch (err) {
      console.error('Error assigning permissions:', err);
      alert('Failed to assign permissions');
    } finally {
      setIsUpdating(false);
    }
  };

  const availablePermissions = [
    { key: 'manage_users', label: 'Manage Users' },
    { key: 'manage_bookings', label: 'Manage Bookings' },
    { key: 'manage_customers', label: 'Manage Customers' },
    { key: 'view_analytics', label: 'View Analytics' },
    { key: 'manage_rewards', label: 'Manage Rewards' },
    { key: 'manage_coupons', label: 'Manage Coupons' },
    { key: 'manage_cancellations', label: 'Manage Cancellations' },
    { key: 'view_audit_logs', label: 'View Audit Logs' },
  ];

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!user) return <div className="p-8 text-gray-500">User not found</div>;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Back button */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition group"
      >
        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-[#33a8da] group-hover:text-white transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <span className="text-sm font-medium">Back to Admin Users</span>
      </button>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Admin User Details
          </h1>
          <p className="text-gray-500 mt-2">View and manage administrator</p>
        </div>
        <div className="flex gap-3">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
              >
                Edit User
              </button>
              <button
                onClick={() => setShowPermissionsModal(true)}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 transition-all"
              >
                Manage Permissions
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition-all"
              >
                Delete User
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition-all disabled:opacity-50"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 bg-gray-500 text-white rounded-xl font-medium text-sm hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* User Details Card */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 mb-6">
        <div className="flex items-center gap-6 mb-6">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white ${
            user.role === 'SUPER_ADMIN' 
              ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
              : 'bg-gradient-to-br from-[#33a8da] to-[#2c8fc0]'
          }`}>
            {user.role === 'SUPER_ADMIN' ? '👑' : user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-500">{user.email}</p>
            <div className="flex gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                user.role === 'SUPER_ADMIN'
                  ? 'bg-purple-50 text-purple-600'
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {user.role}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                user.emailVerified 
                  ? 'bg-green-50 text-green-600' 
                  : 'bg-yellow-50 text-yellow-600'
              }`}>
                {user.emailVerified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-gray-500 mb-2">Name</label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">{user.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">Phone</label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">{user.phone || 'Not provided'}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">Role</label>
            {isEditing ? (
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20"
              >
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            ) : (
              <p className="text-lg font-semibold text-gray-900">{user.role}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">Created At</label>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Section */}
      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Permissions</h3>
          <button
            onClick={() => setShowPermissionsModal(true)}
            className="text-sm text-[#33a8da] hover:underline"
          >
            Edit Permissions
          </button>
        </div>
        
        {user.permissions && Object.keys(user.permissions).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(user.permissions).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-xs text-gray-600">
                  {availablePermissions.find(p => p.key === key)?.label || key}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No permissions assigned</p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Admin User</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete {user.name}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isUpdating}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition-all disabled:opacity-50"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Permissions</h3>
            <div className="space-y-3 mb-6">
              {availablePermissions.map((perm) => (
                <label key={perm.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-700">{perm.label}</span>
                  <input
                    type="checkbox"
                    checked={permissions[perm.key] || false}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      [perm.key]: e.target.checked
                    })}
                    className="w-5 h-5 rounded border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAssignPermissions}
                disabled={isUpdating}
                className="flex-1 py-3 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
              >
                Save Permissions
              </button>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
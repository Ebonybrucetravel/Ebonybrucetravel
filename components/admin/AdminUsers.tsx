'use client';

import React, { useEffect, useState } from 'react';
import {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  assignAdminPermissions,
} from '@/lib/adminApi';
import { useAdmin } from '@/context/AdminContext';

const PERMISSION_KEYS = [
  'canManageBookings',
  'canManageUsers',
  'canManageMarkups',
  'canViewReports',
  'canCancelBookings',
  'canViewAllBookings',
];

export default function AdminUsers() {
  const { user: currentUser } = useAdmin();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'ADMIN' | 'SUPER_ADMIN' | ''>('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
    phone: '',
  });
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminUsers(roleFilter || undefined);
      setAdmins(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admins');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [roleFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAdminUser({
        email: form.email,
        name: form.name,
        password: form.password,
        role: form.role,
        phone: form.phone || undefined,
      });
      setShowAdd(false);
      setForm({ email: '', name: '', password: '', role: 'ADMIN', phone: '' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSubmitting(true);
    try {
      await updateAdminUser(id, {
        name: form.name,
        phone: form.phone || undefined,
        role: form.role,
        permissions: Object.keys(perms).length ? perms : undefined,
      });
      setEditing(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      alert('You cannot delete your own account');
      return;
    }
    if (!window.confirm('Delete this admin user? This cannot be undone.')) return;
    setSubmitting(true);
    try {
      await deleteAdminUser(id);
      setEditing(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignPerms = async (id: string) => {
    setSubmitting(true);
    try {
      await assignAdminPermissions(id, { permissions: perms });
      setEditing(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign permissions');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (a: any) => {
    setEditing(a.id);
    setForm({
      name: a.name || '',
      email: a.email || '',
      password: '',
      role: a.role || 'ADMIN',
      phone: a.phone || '',
    });
    setPerms(a.permissions ?? {});
  };

  return (
    <div className="animate-in fade-in duration-500 p-6 lg:p-10">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Admin Users</h2>
          <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">SUPER_ADMIN only</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd(true);
            setForm({ email: '', name: '', password: '', role: 'ADMIN', phone: '' });
          }}
          className="bg-[#33a8da] text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#2c98c7] transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path d="M12 4v16m8-8H4" />
          </svg>
          Add Admin
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['', 'ADMIN', 'SUPER_ADMIN'] as const).map((r) => (
          <button
            key={r || 'all'}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
              roleFilter === r ? 'bg-[#33a8da] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {r || 'All'}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm mb-8">
          <h3 className="text-lg font-black text-gray-900 mb-6">Create Admin User</h3>
          <form onSubmit={handleCreate} className="space-y-4 max-w-md">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Password * (min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as any }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200"
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#33a8da] text-white px-6 py-3 rounded-xl font-black text-sm uppercase disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#33a8da]" />
          </div>
        ) : error ? (
          <div className="p-16 text-center">
            <p className="text-red-600 font-bold">{error}</p>
            <button type="button" onClick={load} className="mt-4 text-[#33a8da] font-bold hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f8fbfe] border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Created</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center text-gray-400 font-bold">
                      No admin users found
                    </td>
                  </tr>
                ) : (
                  admins.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-8 py-6">
                        <div>
                          <p className="text-sm font-black text-gray-900">{a.name}</p>
                          <p className="text-xs text-gray-500">{a.email}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                            a.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {a.role}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-xs text-gray-500">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-8 py-6">
                        {editing === a.id ? (
                          <div className="space-y-4 max-w-md">
                            <input
                              type="text"
                              value={form.name}
                              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                              placeholder="Name"
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                            />
                            {a.role === 'ADMIN' && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-500 uppercase">Permissions</p>
                                {PERMISSION_KEYS.map((k) => (
                                  <label key={k} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={!!perms[k]}
                                      onChange={(e) => setPerms((p) => ({ ...p, [k]: e.target.checked }))}
                                    />
                                    {k.replace(/([A-Z])/g, ' $1').trim()}
                                  </label>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => (a.role === 'ADMIN' ? handleAssignPerms(a.id) : handleUpdate(a.id))}
                                disabled={submitting}
                                className="px-4 py-2 bg-[#33a8da] text-white rounded-lg text-sm font-bold disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                              >
                                Cancel
                              </button>
                              {a.id !== currentUser?.id && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(a.id)}
                                  disabled={submitting}
                                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            className="text-[#33a8da] font-bold text-sm hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Admin API – centralized client for all admin endpoints.
 * Base: /api/v1/admin (except dashboard: /api/v1/dashboard)
 * Auth: Bearer token (adminToken)
 */

import { config } from './config';

const BASE = config.apiBaseUrl;

function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') ?? '';
}

function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface AdminFetchOpts {
  method?: string;
  body?: object;
}

async function adminFetch<T>(
  path: string,
  opts?: AdminFetchOpts
): Promise<{ success: boolean; data?: T; message?: string; meta?: any }> {
  const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: opts?.method ?? 'GET',
    headers: authHeaders(),
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? json.error ?? `Request failed: ${res.status}`);
  return json;
}

// ─── Dashboard (lives under /dashboard, not /admin) ─────────────────────────
export async function getDashboardStats(params?: {
  startDate?: string;
  endDate?: string;
}) {
  const q = new URLSearchParams();
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  const query = q.toString();
  return adminFetch<any>(`/api/v1/dashboard/stats${query ? `?${query}` : ''}`);
}

// ─── Admin users (SUPER_ADMIN only) ────────────────────────────────────────
export async function createAdminUser(body: {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  phone?: string;
}) {
  return adminFetch<any>('/api/v1/admin/users', { method: 'POST', body });
}

export async function listAdminUsers(role?: 'ADMIN' | 'SUPER_ADMIN') {
  const q = role ? `?role=${role}` : '';
  return adminFetch<any[]>(`/api/v1/admin/users${q}`);
}

export async function getAdminUser(id: string) {
  return adminFetch<any>(`/api/v1/admin/users/${id}`);
}

export async function updateAdminUser(
  id: string,
  body: Partial<{ name: string; phone: string; role: string; permissions: Record<string, boolean> }>
) {
  return adminFetch<any>(`/api/v1/admin/users/${id}`, { method: 'PUT', body });
}

export async function deleteAdminUser(id: string) {
  return adminFetch<void>(`/api/v1/admin/users/${id}`, { method: 'DELETE' });
}

export async function assignAdminPermissions(
  id: string,
  body: { permissions: Record<string, boolean> }
) {
  return adminFetch<any>(`/api/v1/admin/users/${id}/permissions`, { method: 'POST', body });
}

// ─── Customers ─────────────────────────────────────────────────────────────
export async function listCustomers(params?: {
  status?: 'all' | 'active' | 'suspended';
  page?: number;
  limit?: number;
  search?: string;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.search) q.set('search', params.search);
  const query = q.toString();
  return adminFetch<any>(`/api/v1/admin/customers${query ? `?${query}` : ''}`);
}

export async function getCustomer(id: string) {
  return adminFetch<any>(`/api/v1/admin/customers/${id}`);
}

export async function updateCustomerNotes(id: string, notes: string | null) {
  return adminFetch<void>(`/api/v1/admin/customers/${id}/notes`, {
    method: 'PATCH',
    body: { notes },
  });
}

export async function suspendCustomer(id: string, reason?: string) {
  return adminFetch<void>(`/api/v1/admin/customers/${id}/suspend`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

export async function activateCustomer(id: string) {
  return adminFetch<void>(`/api/v1/admin/customers/${id}/activate`, { method: 'POST' });
}

export async function sendCustomerPasswordReset(id: string) {
  return adminFetch<void>(`/api/v1/admin/customers/${id}/reset-password-link`, {
    method: 'POST',
  });
}

// ─── Bookings ─────────────────────────────────────────────────────────────
export async function listBookings(params?: {
  status?: string;
  productType?: string;
  provider?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v != null && v !== '') q.set(k, String(v));
  });
  const query = q.toString();
  return adminFetch<any>(`/api/v1/admin/bookings${query ? `?${query}` : ''}`);
}

export async function exportBookingsCsv(params?: {
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const q = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v != null && v !== '') q.set(k, String(v));
  });
  const query = q.toString();
  const token = getAdminToken();
  const url = `${BASE}/api/v1/admin/bookings/export${query ? `?${query}` : ''}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const filename =
    disposition?.match(/filename="([^"]+)"/)?.[1] ?? `bookings_export_${new Date().toISOString().split('T')[0]}.csv`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function getBookingDisputeEvidence(bookingId: string) {
  return adminFetch<any>(`/api/v1/admin/bookings/${bookingId}/dispute-evidence`);
}

// ─── Audit logs (SUPER_ADMIN only) ─────────────────────────────────────────
export async function listAuditLogs(params?: {
  userId?: string;
  action?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v != null && v !== '') q.set(k, String(v));
  });
  const query = q.toString();
  return adminFetch<any>(`/api/v1/admin/audit-logs${query ? `?${query}` : ''}`);
}

// ─── Rewards ───────────────────────────────────────────────────────────────
export async function getRewardsDashboard() {
  return adminFetch<any>('/api/v1/admin/rewards/dashboard');
}

export async function listRewardRules(activeOnly?: boolean) {
  const q = activeOnly ? '?activeOnly=true' : '';
  return adminFetch<any[]>(`/api/v1/admin/rewards/rules${q}`);
}

export async function createRewardRule(body: Record<string, unknown>) {
  return adminFetch<any>('/api/v1/admin/rewards/rules', { method: 'POST', body });
}

export async function getRewardRule(id: string) {
  return adminFetch<any>(`/api/v1/admin/rewards/rules/${id}`);
}

export async function updateRewardRule(id: string, body: Record<string, unknown>) {
  return adminFetch<any>(`/api/v1/admin/rewards/rules/${id}`, { method: 'PUT', body });
}

export async function deleteRewardRule(id: string) {
  return adminFetch<void>(`/api/v1/admin/rewards/rules/${id}`, { method: 'DELETE' });
}

export async function listRewardTiers() {
  return adminFetch<any>('/api/v1/admin/rewards/tiers');
}

export async function upsertRewardTiers(body: Record<string, unknown>) {
  return adminFetch<any>('/api/v1/admin/rewards/tiers', { method: 'PUT', body });
}

export async function seedRewardTiers() {
  return adminFetch<any>('/api/v1/admin/rewards/tiers/seed-defaults', { method: 'POST' });
}

export async function listEarningRules() {
  return adminFetch<any>('/api/v1/admin/rewards/earning-rules');
}

export async function upsertEarningRule(body: Record<string, unknown>) {
  return adminFetch<any>('/api/v1/admin/rewards/earning-rules', { method: 'PUT', body });
}

export async function seedEarningRules() {
  return adminFetch<any>('/api/v1/admin/rewards/earning-rules/seed-defaults', { method: 'POST' });
}

export async function listVouchers(params?: {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v != null && v !== '') q.set(k, String(v));
  });
  const query = q.toString();
  return adminFetch<any>(`/api/v1/admin/rewards/vouchers${query ? `?${query}` : ''}`);
}

export async function cancelVoucher(id: string) {
  return adminFetch<void>(`/api/v1/admin/rewards/vouchers/${id}`, { method: 'DELETE' });
}

export async function adjustUserPoints(userId: string, points: number, reason: string) {
  return adminFetch<any>(`/api/v1/admin/rewards/users/${userId}/adjust-points`, {
    method: 'POST',
    body: { points, reason },
  });
}

export async function getUserLoyalty(userId: string) {
  return adminFetch<any>(`/api/v1/admin/rewards/users/${userId}/loyalty`);
}

// ─── Cancellation requests ──────────────────────────────────────────────────
export async function listCancellationRequests() {
  return adminFetch<any>('/api/v1/admin/cancellation-requests');
}

export async function processCancellationRequest(
  id: string,
  body: {
    action: 'REJECT' | 'APPROVE_PARTIAL_REFUND' | 'APPROVE_FULL_REFUND';
    refundAmount?: number;
    adminNotes?: string;
    rejectionReason?: string;
  }
) {
  return adminFetch<any>(`/api/v1/admin/cancellation-requests/${id}/process`, {
    method: 'POST',
    body,
  });
}

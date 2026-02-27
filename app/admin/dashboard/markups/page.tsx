'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  listMarkups, 
  createMarkup, 
  updateMarkup, 
  deleteMarkup 
} from '@/lib/adminApi';

interface Markup {
  id: string;
  productType: string;
  markupPercentage: number;
  serviceFeeAmount: number;
  currency: string;
  description: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function MarkupsPage() {
  const router = useRouter();
  const [markups, setMarkups] = useState<Markup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingMarkup, setEditingMarkup] = useState<Markup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    productType: 'FLIGHT_DOMESTIC' as const,
    markupPercentage: '',
    serviceFeeAmount: '',
    currency: 'GBP',
    description: '',
    isActive: true,
  });

  // Fetch markups on load
  useEffect(() => {
    fetchMarkups();
  }, []);

  const fetchMarkups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await listMarkups();
      
      if (response.success && response.data) {
        // Handle different response structures
        const markupData = Array.isArray(response.data) 
          ? response.data 
          : response.data.markups || response.data.items || [];
        setMarkups(markupData);
      } else {
        throw new Error(response.message || 'Failed to fetch markups');
      }
    } catch (err) {
      console.error('Error fetching markups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load markups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const markupData = {
        productType: formData.productType,
        markupPercentage: parseFloat(formData.markupPercentage),
        serviceFeeAmount: parseFloat(formData.serviceFeeAmount),
        currency: formData.currency,
        description: formData.description,
        ...(editingMarkup && { isActive: formData.isActive }),
      };

      let response;
      if (editingMarkup) {
        response = await updateMarkup(editingMarkup.id, markupData);
      } else {
        response = await createMarkup(markupData);
      }

      if (response.success) {
        await fetchMarkups();
        resetForm();
        setShowModal(false);
      } else {
        throw new Error(response.message || `Failed to ${editingMarkup ? 'update' : 'create'} markup`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this markup?')) return;

    try {
      const response = await deleteMarkup(id);
      if (response.success) {
        await fetchMarkups();
      } else {
        throw new Error(response.message || 'Failed to deactivate markup');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate markup');
    }
  };

  const handleEdit = (markup: Markup) => {
    setEditingMarkup(markup);
    setFormData({
      productType: markup.productType as any,
      markupPercentage: markup.markupPercentage.toString(),
      serviceFeeAmount: markup.serviceFeeAmount.toString(),
      currency: markup.currency,
      description: markup.description,
      isActive: markup.isActive,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      productType: 'FLIGHT_DOMESTIC',
      markupPercentage: '',
      serviceFeeAmount: '',
      currency: 'GBP',
      description: '',
      isActive: true,
    });
    setEditingMarkup(null);
    setError(null);
  };

  const productTypeLabels: Record<string, string> = {
    FLIGHT_DOMESTIC: 'Domestic Flight',
    FLIGHT_INTERNATIONAL: 'International Flight',
    HOTEL: 'Hotel',
    CAR_RENTAL: 'Car Rental',
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Markups Management
            </h1>
            <p className="text-gray-500 mt-2">Configure pricing markups and service fees</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-6 py-3 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Markup
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Markups Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#33a8da] rounded-full border-t-transparent animate-spin"></div>
            </div>
          </div>
        ) : markups.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-xl border border-gray-100">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Markups Found</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first markup rule.</p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-6 py-3 bg-[#33a8da] text-white rounded-xl font-medium hover:bg-[#2c8fc0] transition-all"
            >
              Create Markup
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markups.map((markup) => (
              <div
                key={markup.id}
                className={`bg-white rounded-2xl p-6 shadow-xl border transition-all ${
                  markup.isActive ? 'border-gray-100' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      markup.isActive 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {markup.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(markup)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(markup.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition group"
                    >
                      <svg className="w-4 h-4 text-gray-500 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {productTypeLabels[markup.productType] || markup.productType}
                </h3>
                
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{markup.description}</p>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-500">Markup %</span>
                    <span className="font-semibold text-[#33a8da]">{markup.markupPercentage}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-500">Service Fee</span>
                    <span className="font-semibold text-gray-900">
                      {markup.currency} {markup.serviceFeeAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {markup.createdAt && (
                  <p className="text-xs text-gray-400 mt-4">
                    Created: {new Date(markup.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingMarkup ? 'Edit Markup' : 'Create New Markup'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Product Type</label>
                  <select
                    value={formData.productType}
                    onChange={(e) => setFormData(prev => ({ ...prev, productType: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    required
                  >
                    <option value="FLIGHT_DOMESTIC">Domestic Flight</option>
                    <option value="FLIGHT_INTERNATIONAL">International Flight</option>
                    <option value="HOTEL">Hotel</option>
                    <option value="CAR_RENTAL">Car Rental</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-2">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Domestic flights markup"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Markup %</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.markupPercentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, markupPercentage: e.target.value }))}
                      placeholder="5.0"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Service Fee (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.serviceFeeAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, serviceFeeAmount: e.target.value }))}
                      placeholder="10.00"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                      required
                    />
                  </div>
                </div>

                {editingMarkup && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 text-[#33a8da] rounded focus:ring-[#33a8da]"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">
                      Markup is active
                    </label>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                      isSubmitting
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white hover:shadow-lg'
                    }`}
                  >
                    {isSubmitting ? 'Saving...' : (editingMarkup ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
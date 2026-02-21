'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const newUser = {
      name: formData.get('name'),
      email: formData.get('email'),
      role: formData.get('role'),
    };
    
    try {
      // TODO: Implement API call
      console.log('Creating user:', newUser);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      alert('User created successfully!');
      router.push('/admin/dashboard/users');
    } catch (error) {
      alert('Failed to create user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-[#33a8da] group-hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="text-sm font-medium">Back to Users</span>
        </button>
        
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Create Identity
          </h1>
          <p className="text-gray-500 mt-2">Onboard a new platform user</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input 
              name="name" 
              required 
              type="text" 
              placeholder="John Doe" 
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input 
              name="email" 
              required 
              type="email" 
              placeholder="john@example.com" 
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <div className="relative">
              <select 
                name="role" 
                required
                defaultValue="user"
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] appearance-none cursor-pointer"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input 
              name="password" 
              required 
              type="password" 
              placeholder="••••••••" 
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  );
}
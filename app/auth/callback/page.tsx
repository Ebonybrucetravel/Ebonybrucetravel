'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token and user data from URL params facebook/google
        const token = searchParams.get('token');
        const userDataParam = searchParams.get('user');
        
        if (!token) {
          setError('No authentication token received');
          return;
        }

        // Parse user data if exists
        let userData = null;
        if (userDataParam) {
          try {
            userData = JSON.parse(decodeURIComponent(userDataParam));
          } catch (e) {
            console.error('Failed to parse user data:', e);
          }
        }

        // Store the token
        api.setAuthToken(token);

        // If user data exists, store it
        if (userData) {
          localStorage.setItem('travelUser', JSON.stringify(userData));
        }

        // Fetch user profile if we don't have user data
        if (!userData) {
          try {
            const profile = await api.userApi.getProfile();
            localStorage.setItem('travelUser', JSON.stringify(profile));
          } catch (err) {
            console.error('Failed to fetch user profile:', err);
          }
        }

        // Close any open modals and redirect to home
        window.dispatchEvent(new CustomEvent('auth-success', { 
          detail: { token, user: userData } 
        }));

        // Redirect to home page
        router.push('/');
        
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication failed');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin h-10 w-10 text-[#33a8da] mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
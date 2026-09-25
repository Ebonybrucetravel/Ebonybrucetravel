'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  // ✅ Guard against React 18 Strict Mode running the effect twice
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      try {
        // Check for error parameters
        const errorParam = searchParams.get('error');
        const errorMessage = searchParams.get('error_message');

        if (errorParam) {
          setError(errorMessage || 'Authentication failed');
          setIsProcessing(false);
          return;
        }

        
        const code = searchParams.get('code');
        let token = searchParams.get('token');
        const userDataParam = searchParams.get('user');

        console.log('🔵 Callback params:', { code: code ? code.substring(0, 40) + '...' : null, token: !!token, userDataParam: !!userDataParam });

        let userData: any = null;

     
        if (code && !token) {
          const API_BASE =
            process.env.NEXT_PUBLIC_API_BASE_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            'https://ebony-bruce-production.up.railway.app';

          console.log('🔵 Exchanging code...');
          const exchangeResponse = await fetch(`${API_BASE}/api/v1/auth/ott/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          const rawText = await exchangeResponse.text();
          console.log('🟢 Exchange status:', exchangeResponse.status);
          console.log('🟢 Exchange body:', rawText);

          if (!exchangeResponse.ok) {
            setError('Authentication token exchange failed. Please try again.');
            setIsProcessing(false);
            return;
          }

          let exchangeData: any;
          try {
            exchangeData = JSON.parse(rawText);
          } catch (e) {
            console.error('❌ Failed to parse exchange response:', e);
            setError('Invalid response from server');
            setIsProcessing(false);
            return;
          }

         
          const payload = exchangeData?.data ?? exchangeData;
          token = payload?.token ?? payload?.accessToken;
          userData = payload?.user ?? null;

          console.log('🟢 Extracted token?', !!token, '| Extracted user?', !!userData);

          if (!token) {
            console.error('❌ Exchange succeeded but no token in payload:', exchangeData);
            setError('No authentication token received');
            setIsProcessing(false);
            return;
          }
        }

        if (!token) {
          console.error('❌ No code and no token in URL');
          setError('No authentication token received');
          setIsProcessing(false);
          return;
        }

      
        if (userDataParam && !userData) {
          try {
            userData = JSON.parse(decodeURIComponent(userDataParam));
          } catch (e) {
            console.error('Failed to parse user data:', e);
          }
        }

       
        api.setAuthToken(token);

        
        if (userData) {
          localStorage.setItem('travelUser', JSON.stringify(userData));
        }

     
        if (!userData) {
          try {
            const profile = await api.userApi.getProfile();
            localStorage.setItem('travelUser', JSON.stringify(profile));
            userData = profile;
          } catch (err) {
            console.error('Failed to fetch user profile:', err);
          }
        }

    
        const pendingBookingRef = localStorage.getItem('pendingBookingRef');


        window.dispatchEvent(new CustomEvent('auth-success', {
          detail: { token, user: userData },
        }));

       
        if (pendingBookingRef) {
          localStorage.removeItem('pendingBookingRef');
          localStorage.removeItem('pendingBookingEmail');
          router.push(`/booking/success?ref=${pendingBookingRef}`);
        } else {
          const returnTo = sessionStorage.getItem('authReturnTo') || '/';
          sessionStorage.removeItem('authReturnTo');
          router.push(returnTo);
        }
      } catch (err) {
        console.error('❌ Auth callback error:', err);
        setError('Authentication failed');
        setIsProcessing(false);
      }
    };

    handleCallback();

  }, []);
 

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="text-center">
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
      </div>
    );
  }

  if (!isProcessing) {
    return null;
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
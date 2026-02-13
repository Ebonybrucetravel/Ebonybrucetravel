'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token. Please use the link from your email.');
      return;
    }

    let cancelled = false;

    authApi
      .verifyEmail(token)
      .then((res: any) => {
        if (cancelled) return;
        setStatus('success');
        setMessage(res?.message || 'Email verified successfully.');
      })
      .catch((err: any) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(err?.message || err?.data?.message || 'Verification failed. The link may have expired.');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8fbfe] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-[#33a8da] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Verifying your email…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fbfe] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
        {status === 'success' ? (
          <>
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Email verified</h1>
            <p className="text-gray-600 text-sm mb-6">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-[#33a8da] text-white font-bold py-3 rounded-xl hover:bg-[#2c98c7] transition"
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h1>
            <p className="text-gray-600 text-sm mb-6">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition"
            >
              Back to Sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}

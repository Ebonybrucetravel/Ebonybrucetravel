'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
export default function BookingFailedPage() {
    const router = useRouter();
    return (<div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking failed</h1>
      <p className="text-gray-600 mb-8">
        We couldn’t complete your booking. Your card has not been charged. Please try again or contact support.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button onClick={() => router.back()} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition">
          Try again
        </button>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 border border-gray-300">
          Back to home
        </button>
      </div>
    </div>);
}
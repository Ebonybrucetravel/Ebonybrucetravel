import { Suspense } from 'react';
import VerifyEmailContent from './VerifyEmailContent';

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fbfe] flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin w-10 h-10 border-2 border-[#33a8da] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">Loading…</p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
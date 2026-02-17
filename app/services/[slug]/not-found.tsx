
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-[#B11E43] mb-4">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Service Not Found</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
          The service you're looking for doesn't exist or may have been moved.
        </p>
        <Link
          href="/services"
          className="inline-flex items-center px-6 py-3 bg-[#B11E43] text-white font-semibold rounded-full hover:bg-[#8f1836] transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Services
        </Link>
      </div>
    </div>
  );
}
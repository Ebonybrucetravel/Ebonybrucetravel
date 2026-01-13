
'use client';
import React from 'react';

interface Booking {
  id: string;
  type: 'flight' | 'hotel' | 'car';
  title: string;
  provider: string;
  subtitle: string;
  date: string;
  duration?: string;
  status: 'Confirmed' | 'Completed' | 'Cancel' | 'Active';
  price: string;
  currency: string;
  iconBg: string;
}

interface ManageBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

const ManageBookingModal: React.FC<ManageBookingModalProps> = ({ isOpen, onClose, booking }) => {
  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[20px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Manage Bookings</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Select an action for your booking <span className="text-[#33a8da]">#LND-8824</span>
            </h3>
            <p className="text-sm text-gray-400 mt-1 font-medium">
              Change may be subject to airline fees and fare difference.
            </p>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-[#f7f9fa] rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#33a8da] shadow-sm">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1 font-bold text-gray-900">
                  <span>LOS</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span>ABJ</span>
                </div>
                <p className="text-xs text-gray-400 font-bold">
                  Air Peace <span className="text-gray-900">. Dec 26, 08:00 AM</span>
                </p>
              </div>
            </div>
            <span className="bg-[#e7f6ed] text-[#5cb85c] text-[10px] font-bold px-3 py-1 rounded-full border border-[#d4edda]">
              Confirmed
            </span>
          </div>

          {/* Info Banner */}
          <div className="bg-[#ebf5ff] rounded-xl p-4 flex items-start gap-3 border border-[#cfe2ff]">
            <div className="text-[#33a8da] mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-900 leading-tight">
              You can cancel this booking within next 12 hours for full refund.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-3 border border-red-500 text-red-500 font-bold rounded-xl text-sm hover:bg-red-50 transition active:scale-95"
          >
            Cancel Booking
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-xl text-sm hover:bg-[#2c98c7] transition shadow-lg shadow-blue-500/10 active:scale-95"
          >
            Save Booking
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageBookingModal;

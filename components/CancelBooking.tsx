'use client';
import React, { useState } from 'react';

interface CancelBookingProps {
  item: any;
  searchParams: any;
  onBack: () => void;
}

const CancelBooking: React.FC<CancelBookingProps> = ({ item, searchParams, onBack }) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  const destination = searchParams?.segments?.[0]?.to || 'Abuja';
  const origin = searchParams?.segments?.[0]?.from || 'Lagos';
  const travelersCount = parseInt(searchParams?.travellers?.match(/\d+/) ? searchParams.travellers.match(/\d+/)[0] : '1');
  
  const getCode = (str: string) => {
    const match = str.match(/\((.*?)\)/);
    return match ? match[1] : str.substring(0, 3).toUpperCase();
  };

  const originCode = getCode(origin);
  const destCode = getCode(destination);
  const originCity = origin.split('(')[0].trim();
  const destCity = destination.split('(')[0].trim();

  const handleConfirmCancellation = () => {
    setIsCancelling(true);
    setTimeout(() => {
      setIsCancelling(false);
      setIsCancelled(true);
    }, 2000);
  };

  if (isCancelled) {
    return (
      <div className="bg-[#f8fafc] min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-12 rounded-[32px] shadow-sm border border-gray-100">
           <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto">
             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
           </div>
           <h1 className="text-2xl font-black text-gray-900">Cancellation Confirmed</h1>
           <p className="text-gray-500 font-medium">Your refund is being processed. You will receive an email confirmation shortly.</p>
           <button onClick={onBack} className="w-full bg-[#33a8da] text-white font-black py-4 rounded-xl shadow-lg">Back to Profile</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-3xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="text-red-500">
               <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
             </div>
             <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Cancel Booking</h1>
          </div>
          <p className="text-gray-400 font-medium text-lg max-w-xl leading-relaxed">
            You are about to cancel <span className="text-[#33a8da] font-black underline cursor-pointer">#LND-8824</span>. 
            Please review the refund details below carefully. This action cannot be undone.
          </p>
        </div>

        {/* Flight Details Card with Map */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <span className="bg-[#f0f9ff] text-[#33a8da] text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full border border-blue-50">
                  Flight
                </span>
                <span className="text-gray-300 font-bold text-xs uppercase tracking-tight">
                  {item?.date || 'Dec 26, 2025'} • 08:00 AM
                </span>
              </div>
              <div className="bg-green-50 text-green-600 text-xs font-black px-3 py-1 rounded-full">
                CONFIRMED
              </div>
            </div>

            {/* Map Visualization */}
            <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
              {/* Map Route Line */}
              <div className="relative h-2 bg-gradient-to-r from-blue-200 via-blue-400 to-indigo-400 rounded-full mb-10">
                {/* Origin Dot */}
                <div className="absolute left-0 -top-3 flex flex-col items-center">
                  <div className="w-6 h-6 bg-[#33a8da] rounded-full border-4 border-white shadow-lg"></div>
                  <div className="mt-2 text-xs font-black text-gray-900">{originCode}</div>
                  <div className="text-xs font-bold text-gray-500">{originCity}</div>
                </div>
                
                {/* Destination Dot */}
                <div className="absolute right-0 -top-3 flex flex-col items-center">
                  <div className="w-6 h-6 bg-indigo-500 rounded-full border-4 border-white shadow-lg"></div>
                  <div className="mt-2 text-xs font-black text-gray-900">{destCode}</div>
                  <div className="text-xs font-bold text-gray-500">{destCity}</div>
                </div>

                {/* Airplane Icon */}
                <div className="absolute left-1/2 -top-5 transform -translate-x-1/2">
                  <div className="bg-white p-2 rounded-full shadow-lg border border-blue-100">
                    <svg className="w-5 h-5 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Flight Info */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-black text-gray-900">{originCode}</div>
                  <div className="text-xs font-bold text-gray-500">Departure</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-sm font-black text-gray-900">→</div>
                  <div className="text-xs font-bold text-gray-500 mt-1">1h 45m</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-gray-900">{destCode}</div>
                  <div className="text-xs font-bold text-gray-500">Arrival</div>
                </div>
              </div>
            </div>

            {/* Flight Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{item?.title || 'Air Peace Flight'}</h3>
                <p className="text-sm font-bold text-gray-500">
                  {item?.provider || 'Airline'} • {item?.subtitle || 'Economy Class'} • Flight #{item?.id || 'LND-8824'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Departure</p>
                  <p className="text-sm font-black text-gray-900">{item?.date || 'Dec 26, 2025'} • 08:00 AM</p>
                  <p className="text-xs font-bold text-gray-500">Murtala Muhammed Intl (LOS)</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Arrival</p>
                  <p className="text-sm font-black text-gray-900">{item?.date || 'Dec 26, 2025'} • 09:45 AM</p>
                  <p className="text-xs font-bold text-gray-500">Nnamdi Azikiwe Intl (ABV)</p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Passengers</p>
                  <p className="text-sm font-black text-gray-900">{travelersCount} Traveler{travelersCount > 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Booking Reference</p>
                  <p className="text-sm font-black text-[#33a8da]">#LND-8824</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Refund Summary Card */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10 space-y-8">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Refund Summary</h3>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Original Price</span>
                <span className="text-lg font-black text-[#33a8da] tracking-tight">
                  {item?.price || 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Cancellation Fee</span>
                <span className="text-lg font-black text-red-500 tracking-tight">- N0.00</span>
              </div>
              
              <div className="pt-8 border-t border-gray-50 flex justify-between items-center">
                <span className="text-2xl font-black text-gray-900 tracking-tighter">Total Refund</span>
                <span className="text-2xl font-black text-[#33a8da] tracking-tighter">
                  {item?.price || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Refund Footer Banner */}
          <div className="bg-[#f7f9fa] p-6 border-t border-gray-50 flex items-center gap-3">
            <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 shadow-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </div>
            <p className="text-sm font-black text-gray-900 tracking-tight leading-none">
              Refund will be processed to <span className="text-blue-600">Visa ending in 4324</span> within 3-5 business days.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-10 pt-4">
          <button 
            onClick={onBack}
            className="text-sm font-black text-[#33a8da] uppercase tracking-widest hover:underline"
          >
            Return to Booking
          </button>
          
          <button 
            onClick={handleConfirmCancellation}
            disabled={isCancelling}
            className="flex items-center gap-3 px-10 py-5 bg-[#e11d48] text-white rounded-2xl font-black text-lg shadow-2xl shadow-red-200 hover:bg-[#be123c] transition transform active:scale-95 disabled:opacity-50"
          >
             {isCancelling ? (
               <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             ) : (
               <div className="bg-white/20 rounded-full p-1 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M6 18L18 6M6 6l12 12" /></svg>
               </div>
             )}
             {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBooking;
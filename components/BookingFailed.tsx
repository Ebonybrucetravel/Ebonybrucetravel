
'use client';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface BookingFailedProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onRetry: () => void;
}

const BookingFailed: React.FC<BookingFailedProps> = ({ item, searchParams, onBack, onRetry }) => {
  const { currency } = useLanguage();
  
  // Determine booking type
  const rawType = (item.type || searchParams?.type || 'flights').toLowerCase();
  const isHotel = rawType.includes('hotel');
  const isCar = rawType.includes('car');
  const isFlight = !isHotel && !isCar;

  // General Data
  const travelersCount = parseInt(searchParams?.travellers?.match(/\d+/) ? searchParams.travellers.match(/\d+/)[0] : '1');
  const destination = searchParams?.segments?.[0]?.to || searchParams?.location || searchParams?.carPickUp || 'Your Destination';
  const cityName = destination.split('(')[0].trim();

  // Price Logic matching Review/Success pages
  const numericPrice = parseInt(item.price?.replace(/[^\d]/g, '')) || 75000;
  const unitCount = isHotel ? 3 : (isCar ? 2 : travelersCount); 
  const cleaningFee = isHotel ? 45 : 0;
  const subtotal = (numericPrice * unitCount);
  const totalPrice = subtotal + (isHotel ? (cleaningFee * (currency.code === 'USD' ? 1 : 1500)) : 0);
  const formattedTotal = `${currency.symbol}${totalPrice.toLocaleString()}.00`;

  const renderHotelDetails = () => (
    <div className="space-y-8">
      {/* Stay Details Card */}
      <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-10">
        <div className="flex items-center gap-3 mb-12">
          <div className="text-[#33a8da]">
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Stay Details</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12 mb-12">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Check In</p>
            <p className="text-sm font-black text-gray-900">Jan 10, 2026</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">10:00 AM</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Check Out</p>
            <p className="text-sm font-black text-gray-900">Jan 15, 2026</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">10:00 AM</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-gray-400 pt-8 border-t border-gray-50">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{travelersCount} Adults, 0 Children</span>
        </div>
      </div>

      {/* Check-in Instruction Card */}
      <div className="bg-[#f0f7ff] rounded-[16px] border border-[#dbeafe] p-8 flex items-start gap-4">
        <div className="text-[#33a8da] mt-0.5 shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-black text-[#1e40af] uppercase tracking-tight">Check-in Instruction</h4>
          <p className="text-[13px] font-bold text-[#1e40af]/80 leading-relaxed">
            The front desk is open 24/7. Please have your confirmation ID and a Valid photo ID ready.
          </p>
        </div>
      </div>
    </div>
  );

  const renderFlightDetails = () => (
    <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-10">
      <div className="flex items-center gap-3 mb-10 text-gray-400">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Flight Information</h3>
      </div>
      <p className="text-sm font-bold text-gray-400 italic">Itinerary preview unavailable for failed bookings. Please try again.</p>
    </div>
  );

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-10">
          <button onClick={onBack} className="hover:text-blue-600 transition flex items-center gap-1">
            Home <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
          </button>
          <span className="hover:text-blue-600 cursor-pointer flex items-center gap-1">
            My Bookings <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
          </span>
          <span className="text-blue-600">Booking History</span>
        </nav>

        {/* Failed Banner */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              </div>
              <h1 className="text-xl font-black text-red-500 uppercase tracking-tight">Booking Unsuccessful</h1>
            </div>
            <p className="text-lg md:text-xl font-bold text-red-500 max-w-xl">
              Sorry, but we are unable to complete your booking at this time. Please try again later.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Download PDF', icon: <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /> },
              { label: 'Email', icon: <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
              { label: 'Add to Calendar', icon: <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> }
            ].map((btn) => (
              <button key={btn.label} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-black text-gray-600 hover:bg-gray-50 transition shadow-sm active:scale-95 uppercase tracking-tight">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{btn.icon}</svg>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          <div className="flex-1 space-y-8 w-full">
             {isHotel ? renderHotelDetails() : renderFlightDetails()}
          </div>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-[460px]">
            <div className="bg-white rounded-[24px] shadow-lg border border-gray-100 overflow-hidden">
              {/* Skip Image for Flights */}
              {!isFlight && (
                <div className="relative h-60">
                  <img src={item.imageUrl || "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=600"} className="w-full h-full object-cover" alt="Item" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-white font-black text-xl leading-tight tracking-tight">{item.title || item.provider}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                      </div>
                      <span className="text-white font-black text-xs">5.0</span>
                    </div>
                  </div>
                </div>
              )}

              {isFlight && (
                 <div className="p-10 border-b border-gray-50">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{item.provider}</h3>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-70">Flight Failed Summary</p>
                 </div>
              )}

              <div className="p-10 space-y-8">
                <h4 className="text-lg font-black text-gray-900 tracking-tight">Price Breakdown</h4>
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-600 font-bold">
                      {isHotel ? `${unitCount} nights x ${currency.symbol}${numericPrice.toLocaleString()}` : 
                       isCar ? `${unitCount} days x ${currency.symbol}${numericPrice.toLocaleString()}` :
                       `${unitCount} travelers x ${currency.symbol}${numericPrice.toLocaleString()}`}
                    </span>
                    <span className={`font-black ${isCar ? 'text-purple-600' : 'text-[#33a8da]'}`}>{currency.symbol}{subtotal.toLocaleString()}.00</span>
                  </div>
                  
                  {isHotel && (
                    <div className="flex justify-between items-center text-base">
                      <span className="text-gray-600 font-bold">Cleaning fee</span>
                      <span className="text-[#33a8da] font-black">{currency.symbol}{(cleaningFee * (currency.code === 'USD' ? 1 : 1500)).toLocaleString()}.00</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-600 font-bold">Service fee</span>
                    <span className={`font-black uppercase ${isCar ? 'text-purple-600' : 'text-[#33a8da]'}`}>Free</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-base border-b border-gray-50 pb-8">
                    <span className="text-gray-600 font-bold">Taxes</span>
                    <span className={`font-black uppercase ${isCar ? 'text-purple-600' : 'text-[#33a8da]'}`}>Included</span>
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-2xl font-black text-gray-900 tracking-tighter">Total</span>
                    <span className={`text-2xl font-black tracking-tighter ${isCar ? 'text-purple-600' : 'text-[#33a8da]'}`}>{formattedTotal}</span>
                  </div>
                </div>

                <button 
                  onClick={onRetry}
                  className={`w-full text-white font-black py-6 rounded-2xl shadow-2xl transition transform active:scale-95 text-lg mt-6 ${isCar ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-100' : 'bg-[#33a8da] hover:bg-[#2c98c7] shadow-blue-100'}`}
                >
                  Manage Booking
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* Dynamic Cross Promotion Banner */}
        <div className="mt-16 bg-white rounded-[24px] p-10 border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="flex items-center gap-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl shrink-0 ${isHotel ? 'bg-[#33a8da] shadow-blue-100' : isCar ? 'bg-[#33a8da] shadow-blue-100' : 'bg-yellow-500 shadow-yellow-100'}`}>
               {isFlight ? (
                 <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2zm3-8h4c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2zM3 21h18v-2H3v2zM3 8c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10H3V8z" /></svg>
               ) : (
                 <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
               )}
            </div>
            <div>
              <h4 className="text-lg font-black text-gray-900 tracking-tight leading-tight mb-1">
                {isFlight ? 'Need a Hotel for your stay?' : 'Need a Flight for your trip?'}
              </h4>
              <p className="text-sm font-bold text-gray-400">Experience the perfect blend of comfort and affordability</p>
            </div>
          </div>
          <button onClick={onBack} className="px-10 py-4 bg-[#33a8da] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#2c98c7] transition active:scale-95 shadow-lg shadow-blue-100">
            {isFlight ? 'Browse Hotels' : 'Browse Flights'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingFailed;

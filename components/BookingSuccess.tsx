'use client';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface BookingSuccessProps {
  item: any;
  searchParams: any;
  onBack: () => void;
}

const BookingSuccess: React.FC<BookingSuccessProps> = ({ item, searchParams, onBack }) => {
  const { currency } = useLanguage();
  
  const destination = searchParams?.segments?.[0]?.to || 'Abuja';
  const origin = searchParams?.segments?.[0]?.from || 'Lagos';
  const travelersCount = parseInt(searchParams?.travellers?.match(/\d+/) ? searchParams.travellers.match(/\d+/)[0] : '1');
  
  const getCode = (str: string) => {
    const match = str.match(/\((.*?)\)/);
    return match ? match[1] : str.substring(0, 3).toUpperCase();
  };

  const originCode = getCode(origin);
  const destCode = getCode(destination);
  const cityName = destination.split('(')[0].trim();

  const numericPrice = parseInt(item.price.replace(/[^\d]/g, '')) || 75000;
  const totalPrice = numericPrice * travelersCount;
  const formattedTotal = `${currency.symbol}${totalPrice.toLocaleString()}`;

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">
          <button onClick={onBack} className="hover:text-blue-600 transition">Home</button>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth={3} /></svg>
          <span className="hover:text-blue-600 cursor-pointer">My Bookings</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth={3} /></svg>
          <span className="text-blue-600">Booking History</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth={3} /></svg>
        </nav>

        {/* Success Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#e7f6ed] text-[#5cb85c] px-4 py-2 rounded-full mb-6 border border-[#d4edda]">
              <div className="bg-[#5cb85c] rounded-full p-0.5">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Booking Successful</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-4">
              {cityName}, here you come!
            </h1>
            <p className="text-sm font-bold text-gray-400">
              Your booking reference is <span className="text-[#33a8da] underline cursor-pointer">#LND-8824</span>
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

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-8">
            {/* Flight Itinerary Card */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Flight Itinerary</h3>
                <span className="bg-[#e7f6ed] text-[#5cb85c] text-[9px] font-black uppercase px-3 py-1 rounded-full border border-[#d4edda] tracking-widest">Confirmed</span>
              </div>
              <div className="p-10">
                <div className="flex items-center gap-3 mb-10">
                   <div className="text-[#33a8da]">
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                   </div>
                   <span className="text-sm font-black text-gray-900">Outbound: {origin} to {cityName}</span>
                   <span className="text-[11px] text-gray-400 font-bold ml-auto">Dec 26, 2025</span>
                </div>

                <div className="relative pl-10 ml-1">
                  <div className="absolute left-[3px] top-[10px] bottom-[10px] w-[1.5px] bg-gray-100"></div>
                  
                  {/* Origin */}
                  <div className="relative mb-16">
                    <div className="absolute -left-[40px] top-1 w-3 h-3 rounded-full bg-[#33a8da] border-2 border-white shadow-sm z-10"></div>
                    <div className="flex flex-col md:flex-row md:items-start justify-between">
                      <div>
                        <p className="text-xl font-black text-gray-900">08:00 AM</p>
                        <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">{origin} ({originCode})</p>
                      </div>
                      <div className="mt-4 md:mt-0 md:text-right">
                        <p className="text-xs font-black text-gray-900">{item.provider} (P4 7121)</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Flight BA117 . Economy</p>
                      </div>
                    </div>
                  </div>

                  {/* Duration marker */}
                  <div className="relative mb-16">
                     <div className="absolute -left-[40px] top-1/2 -translate-y-1/2 flex flex-col items-center">
                        <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                     </div>
                     <span className="ml-4 bg-gray-100 text-gray-400 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest">Duration</span>
                  </div>

                  {/* Destination */}
                  <div className="relative">
                    <div className="absolute -left-[40px] bottom-1 w-3 h-3 rounded-full border-2 border-[#33a8da] bg-white shadow-sm z-10"></div>
                    <div className="flex flex-col md:flex-row md:items-start justify-between">
                      <div>
                        <p className="text-xl font-black text-gray-900">{item.time || '09:15 AM'}</p>
                        <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">{cityName} ({destCode})</p>
                      </div>
                      <div className="mt-4 md:mt-0 text-right self-end md:self-auto">
                        <span className="text-[#f97316] text-[10px] font-black uppercase tracking-widest">Arrive same day</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inclusive Features Card */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
               <h3 className="text-lg font-black text-gray-900 tracking-tight mb-8">Inclusive Features</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                  {[
                    { label: 'Cabin Baggage', desc: '7kg included per person' },
                    { label: 'Checked Baggage', desc: '2x23kg included per person' },
                    { label: 'Non-Stop', desc: 'Direct flight route' },
                    { label: '24/7 Support', desc: 'Expert assistance' },
                    { label: 'Flexible Booking', desc: 'Changeable tickets' },
                    { label: 'Ebony Bruce Verified', desc: 'Trusted by travelers' }
                  ].map((feat) => (
                    <div key={feat.label} className="flex items-start gap-3">
                       <div className="w-5 h-5 bg-[#33a8da] rounded flex items-center justify-center text-white shrink-0 mt-0.5">
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
                       </div>
                       <div>
                         <p className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1">{feat.label}</p>
                         <p className="text-[10px] text-gray-300 font-bold">{feat.desc}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <aside className="w-full lg:w-[420px] space-y-8">
            {/* Flight Summary Card */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden sticky top-24">
               <div className="p-10 border-b border-gray-50">
                 <h3 className="text-xl font-black text-gray-900 mb-10 tracking-tight">Flight Summary</h3>
                 <div className="space-y-6">
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-400 font-bold">Base Fare</span>
                     <span className="text-[#33a8da] font-black uppercase tracking-tight">NGN 75,000</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-400 font-bold">Taxes & Fees</span>
                     <span className="text-[#33a8da] font-black uppercase tracking-tight">Included</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-400 font-bold">Baggage</span>
                     <span className="text-[#33a8da] font-black uppercase tracking-tight">Free</span>
                   </div>
                 </div>
               </div>
               <div className="p-10 space-y-8">
                 <div className="flex justify-between items-center">
                   <span className="text-2xl font-black text-gray-900 tracking-tighter">Total</span>
                   <span className="text-2xl font-black text-[#33a8da] tracking-tighter">{formattedTotal}</span>
                 </div>
                 <button className="w-full bg-[#33a8da] text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-[#2c98c7] transition transform active:scale-95 text-lg">
                   Manage Booking
                 </button>
               </div>
            </div>

            {/* Hotel Recommendation Card */}
            <div className="bg-[#f0f9ff] rounded-[32px] p-8 border border-blue-50">
              <div className="flex items-center gap-3 mb-4">
                 <div className="text-[#33a8da]">
                   <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2zm3-8h4c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2zM3 21h18v-2H3v2zM3 8c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10H3V8z" /></svg>
                 </div>
                 <h3 className="text-lg font-black text-gray-900 tracking-tight">Need a place to stay?</h3>
              </div>
              <p className="text-xs text-gray-500 font-bold mb-6 leading-relaxed">
                Get up to 15% off hotels in {cityName} when you bundle with your flight.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                  { name: 'Summerset Continental Hotel', location: 'Wuse', price: '160,000', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Summerset Continental Hotel', location: 'Wuse', price: '160,000', image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=400' }
                ].map((hotel, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-blue-50/50 group cursor-pointer hover:shadow-md transition">
                    <div className="h-28 overflow-hidden">
                      <img src={hotel.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt="" />
                    </div>
                    <div className="p-3">
                      <h4 className="text-[10px] font-black text-gray-900 tracking-tight line-clamp-1">{hotel.name}</h4>
                      <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{hotel.location}</p>
                      <p className="text-[10px] font-black text-[#33a8da] mt-1">NGN {hotel.price}<span className="text-[8px] text-gray-400 font-bold ml-0.5 uppercase">/night</span></p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline w-full text-center">
                View all hotels in {cityName}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;


'use client';
import React, { useEffect } from 'react';

interface FlightDetailsProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onBook: () => void;
}

const FlightDetails: React.FC<FlightDetailsProps> = ({ item, searchParams, onBack, onBook }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[#f8fbfe] min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">
        <button onClick={onBack} className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#33a8da] transition mb-8 group">
          <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
          Back to Results
        </button>

        <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8 md:p-12 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center p-3 border border-gray-100">
                <img src={item.image || `https://ui-avatars.com/api/?name=${item.provider}`} className="max-w-full max-h-full object-contain" alt="" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{item.provider}</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.subtitle}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-[#33a8da] tracking-tighter">{item.price}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Per Passenger</p>
            </div>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            <div>
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-8">Outbound Journey</h3>
              <div className="flex items-center justify-between relative">
                <div className="text-center md:text-left">
                  <p className="text-3xl font-black text-gray-900">{item.time || '08:00'}</p>
                  <p className="text-sm font-bold text-gray-400 mt-1 uppercase">Lagos (LOS)</p>
                </div>
                
                <div className="flex-1 px-8 hidden md:block">
                  <div className="w-full h-[2px] bg-gray-100 relative">
                    <div className="absolute left-1/2 -translate-x-1/2 -top-[11px] bg-white px-3">
                      <svg className="w-6 h-6 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase text-center mt-3 tracking-widest">{item.duration || '1h 15m'}</p>
                </div>

                <div className="text-center md:text-right">
                  <p className="text-3xl font-black text-gray-900">09:15</p>
                  <p className="text-sm font-bold text-gray-400 mt-1 uppercase">Abuja (ABV)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Baggage', val: '2 x 23kg included', icon: '🧳' },
                { label: 'Cabin', val: item.subtitle || 'Economy', icon: '💺' },
                { label: 'Refund', val: 'Partial Refundable', icon: '💳' }
              ].map(feat => (
                <div key={feat.label} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-xl mb-3 block">{feat.icon}</span>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{feat.label}</p>
                  <p className="text-xs font-bold text-gray-900">{feat.val}</p>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm font-bold text-gray-600">Selected seats are confirmed for immediate booking.</p>
              </div>
              <button onClick={onBook} className="w-full md:w-auto px-12 py-5 bg-[#33a8da] text-white font-black rounded-2xl shadow-xl hover:bg-[#2c98c7] transition active:scale-95 uppercase tracking-widest text-xs">
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightDetails;

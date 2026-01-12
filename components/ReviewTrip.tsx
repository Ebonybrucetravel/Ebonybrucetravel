
'use client';
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface ReviewTripProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onSignIn?: () => void;
  isLoggedIn?: boolean;
  user?: {
    name: string;
    email: string;
  };
}

const ReviewTrip: React.FC<ReviewTripProps> = ({ item, searchParams, onBack, onSignIn, isLoggedIn, user }) => {
  const { currency } = useLanguage();
  const [view, setView] = useState<'review' | 'checkout'>('review');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const destination = searchParams?.segments?.[0]?.to || 'Abuja';
  const origin = searchParams?.segments?.[0]?.from || 'Lagos';
  const travelersCount = parseInt(searchParams?.travellers?.match(/\d+/) ? searchParams.travellers.match(/\d+/)[0] : '1');
  const isRoundTrip = searchParams?.tripType === 'round-trip';
  
  const getCode = (str: string) => {
    const match = str.match(/\((.*?)\)/);
    return match ? match[1] : str.substring(0, 3).toUpperCase();
  };

  const originCode = getCode(origin);
  const destCode = getCode(destination);
  
  const numericPrice = parseInt(item.price.replace(/[^\d]/g, '')) || 75000;
  const totalPrice = numericPrice * travelersCount;
  const formattedTotal = `${currency.symbol}${totalPrice.toLocaleString()}`;
  const perPersonPrice = `${currency.symbol}${numericPrice.toLocaleString()}`;

  const handleCompleteBooking = () => {
    setIsBooking(true);
    setTimeout(() => {
      setIsBooking(false);
      setBookingSuccess(true);
    }, 2000);
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-8">
           <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Booking Confirmed!</h1>
        <p className="text-gray-500 max-w-md mb-10 font-medium">Your tickets for {origin} to {destination} have been issued. Check your email for confirmation.</p>
        <button onClick={onBack} className="px-12 py-4 bg-[#33a8da] text-white font-black rounded-2xl shadow-2xl hover:bg-[#2c98c7] transition transform active:scale-95">Return to Home</button>
      </div>
    );
  }

  // --- REVIEW VIEW (Step 1) ---
  if (view === 'review') {
    return (
      <div className="bg-[#f0f2f5] min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Bar with Modify Button */}
          <div className="flex justify-between items-center mb-6">
            <button onClick={onBack} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
              Go back
            </button>
            <button className="bg-white border border-gray-300 rounded-lg px-4 py-1.5 text-sm font-bold flex items-center gap-2 hover:bg-gray-50">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
              Share
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-12">
              
              {/* Step 1: Inclusions */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-2">Step 1: Review what’s included in your fare</h2>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  <span className="text-blue-600 font-bold hover:underline cursor-pointer">See baggage size and weight limit.</span> Total prices may include estimated baggage fees and flexibility. Some options may require added baggage or flexibility when checking out. Check terms and conditions on the booking site.
                </p>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="font-black text-gray-900">Economy</h3>
                    <p className="text-lg font-black text-gray-900 mt-1">{item.price}</p>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                    <div className="flex items-center gap-3">
                      <div className="text-green-600"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>
                      <span className="text-sm text-gray-600 font-medium">1 carry-on bag</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-gray-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                      <span className="text-sm text-gray-500 font-medium">Legroom info unavailable</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-green-600"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>
                      <span className="text-sm text-gray-600 font-medium">1 checked bag</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-gray-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                      <span className="text-sm text-gray-500 font-medium">Ticket change info unavailable</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-gray-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                      <span className="text-sm text-gray-500 font-medium">Seat selection info unavailable</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-gray-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                      <span className="text-sm text-gray-500 font-medium">Refund info unavailable</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-4 font-bold">Fare and baggage fees apply to the entire trip.</p>
              </section>

              {/* Step 2: Book your ticket */}
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-2">Step 2: Book your ticket on Ebony Bruce</h2>
                <p className="text-xs text-gray-500 mb-6">Ebony Bruce Travels compares hundreds of travel sites at once to show prices available for your trip.</p>
                
                <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white border border-gray-100 rounded-full flex items-center justify-center p-2 shadow-sm">
                       <div className="bg-blue-900 rounded p-1"><span className="text-white text-[10px] font-black italic">EB</span></div>
                    </div>
                    <span className="font-black text-gray-900">Ebony Bruce</span>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-black text-gray-900">{item.price}</span>
                        <span className="text-xs text-gray-400 font-bold">/ person</span>
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold">{formattedTotal} total</p>
                    </div>
                    <button 
                      onClick={() => setView('checkout')}
                      className="bg-[#1a73e8] text-white px-10 py-3 rounded-lg font-black text-sm hover:bg-[#1557b0] transition active:scale-95 shadow-lg shadow-blue-500/10"
                    >
                      Book
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar with Route Summary */}
            <aside className="w-full lg:w-[380px]">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-24">
                <h3 className="text-2xl font-black text-gray-900 mb-1">{origin} to {destination}</h3>
                <p className="text-sm text-gray-500 font-bold mb-6 capitalize">{searchParams?.tripType?.replace('-', ' ') || 'One-way'}, {travelersCount} Travelers</p>
                
                <div className="space-y-4">
                  {/* Segment 1 */}
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.provider)}&background=fff&color=33a8da`} className="w-8 h-8 rounded border border-gray-100" alt="" />
                        <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{originCode} → {destCode}</span>
                        <span className="text-[10px] text-gray-400 font-bold">{searchParams?.segments?.[0]?.date || 'Oct 24'}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-900">Nonstop • 1h 15m</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-black text-gray-900">{item.time || '15:20'}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{origin} ({originCode})</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-900">16:35</p>
                          <p className="text-[10px] text-gray-500 font-medium">{destination} ({destCode})</p>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold space-y-0.5 pt-2 border-t border-gray-100">
                        <p>{item.provider} 7121</p>
                        <p>{item.aircraft || 'Regional jet'}</p>
                        <div className="inline-block mt-2 px-2 py-0.5 bg-gray-100 rounded text-gray-500 border border-gray-200">Embraer ERJ-135</div>
                      </div>
                    </div>
                  </div>

                  {/* Segment 2 (Inbound) */}
                  {isRoundTrip && (
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.provider)}&background=fff&color=33a8da`} className="w-8 h-8 rounded border border-gray-100" alt="" />
                          <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{destCode} → {originCode}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{searchParams?.returnDate || 'Oct 30'}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-900">Nonstop • 1h 20m</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-black text-gray-900">14:05</p>
                            <p className="text-[10px] text-gray-500 font-medium">{destination} ({destCode})</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-gray-900">15:25</p>
                            <p className="text-[10px] text-gray-500 font-medium">{origin} ({originCode})</p>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold space-y-0.5 pt-2 border-t border-gray-100">
                          <p>{item.provider} 7429</p>
                          <p>Narrow-body jet</p>
                          <div className="inline-block mt-2 px-2 py-0.5 bg-gray-100 rounded text-gray-500 border border-gray-200">Boeing 737-700</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // --- CHECKOUT VIEW (Step 2) ---
  return (
    <div className="bg-[#f8fbfe] min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Check Out</h1>
            <p className="text-gray-400 font-medium mt-1">Review your traveler information and select payment method.</p>
          </div>
          <button onClick={() => setView('review')} className="text-[#33a8da] font-black uppercase text-xs tracking-widest hover:underline">Edit Selection</button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-8">
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#33a8da]">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <h2 className="text-xl font-black text-gray-900">Traveler Information</h2>
              </div>
              
              {!isLoggedIn && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center mb-8">
                  <p className="text-gray-900 font-black mb-1">You are Booking as Guest</p>
                  <button 
                    onClick={onSignIn}
                    className="text-[#33a8da] text-[10px] font-black uppercase tracking-widest hover:underline"
                  >
                    Sign in to get reward
                  </button>
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Full Name</label>
                  <input type="text" defaultValue={isLoggedIn ? user?.name : ''} placeholder="Ebony Life" className="w-full px-5 py-4 bg-gray-50 border-none rounded-xl font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#33a8da]/10 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Email Address</label>
                  <input type="email" defaultValue={isLoggedIn ? user?.email : ''} placeholder="Enter your email address" className="w-full px-5 py-4 bg-gray-50 border-none rounded-xl font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#33a8da]/10 transition-all" />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#33a8da]">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                </div>
                <h2 className="text-xl font-black text-gray-900">Payment Method</h2>
              </div>
              <div className="space-y-3">
                <label className={`flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-[#33a8da] bg-blue-50/20' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex items-center gap-4">
                    <input type="radio" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="w-5 h-5 accent-[#33a8da]" />
                    <span className="font-bold text-gray-700">Credit / Debit Card (Local & Int'l)</span>
                  </div>
                  <div className="flex gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" className="h-4 w-auto grayscale opacity-50" alt="Visa" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-4 w-auto grayscale opacity-50" alt="Mastercard" />
                  </div>
                </label>
                <label className={`flex items-center justify-between p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'bank' ? 'border-[#33a8da] bg-blue-50/20' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex items-center gap-4">
                    <input type="radio" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} className="w-5 h-5 accent-[#33a8da]" />
                    <span className="font-bold text-gray-700">Bank Transfer / USSD</span>
                  </div>
                  <div className="text-gray-300">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/></svg>
                  </div>
                </label>
              </div>
            </section>
          </div>

          <aside className="w-full lg:w-[420px]">
            <div className="sticky top-24 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50">
                <h3 className="text-lg font-black text-gray-900 mb-6">Flight Summary</h3>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-2">
                     <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.provider)}&background=fff&color=33a8da&bold=true`} className="w-full h-full object-contain" alt="" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-sm">{item.provider} (P4 7121)</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Powered by <span className="text-[#33a8da]">Ebony</span> • Economy</p>
                  </div>
                </div>
                <div className="relative pl-8 space-y-10">
                  <div className="absolute left-[3px] top-[10px] bottom-[10px] w-0.5 bg-gray-200"></div>
                  <div className="relative">
                    <div className="absolute -left-8 top-1.5 w-2 h-2 rounded-full border-2 border-gray-400 bg-white z-10"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-gray-900 text-sm">{item.time || '08:00AM'}</p>
                        <p className="text-[11px] font-bold text-gray-400 uppercase">{originCode} ({origin})</p>
                      </div>
                      <div className="bg-gray-100 text-gray-400 text-[9px] font-black px-2 py-0.5 rounded uppercase">1h 15m</div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-8 top-1.5 w-2 h-2 rounded-full bg-gray-900 z-10"></div>
                    <div>
                      <p className="font-black text-gray-900 text-sm">09:15AM</p>
                      <p className="text-[11px] font-bold text-gray-400 uppercase">{destCode} ({destination})</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">Base Fare</span>
                  <span className="text-[#33a8da] font-black">{perPersonPrice} x {travelersCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">Taxes & Fees</span>
                  <span className="text-[#33a8da] font-black italic">Included</span>
                </div>
                <div className="pt-6 mt-6 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-lg font-black text-gray-900 uppercase tracking-tighter">Total</span>
                  <span className="text-xl font-black text-[#33a8da]">{formattedTotal}</span>
                </div>
                <button 
                  onClick={handleCompleteBooking}
                  disabled={isBooking}
                  className="w-full mt-6 bg-[#33a8da] text-white font-black py-4 rounded-xl shadow-xl shadow-blue-500/10 hover:bg-[#2c98c7] transition active:scale-95 uppercase tracking-tight text-sm flex items-center justify-center"
                >
                  {isBooking ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Complete Booking'}
                </button>
                <button onClick={onBack} className="w-full text-center text-[#33a8da] text-[11px] font-black uppercase tracking-widest mt-4 hover:underline">Cancel & Return</button>
              </div>
              <div className="m-6 p-6 bg-gray-50 rounded-xl">
                 <p className="text-[10px] text-gray-400 font-bold leading-relaxed text-center">
                   By completing this booking, you agree to our terms of use and the {item.provider} (P4 7121) cancellation policy.
                 </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ReviewTrip;

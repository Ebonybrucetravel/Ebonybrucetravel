
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
  onSuccess?: () => void;
}

const ReviewTrip: React.FC<ReviewTripProps> = ({ item, searchParams, onBack, onSignIn, isLoggedIn, user, onSuccess }) => {
  const { currency } = useLanguage();
  const [view, setView] = useState<'review' | 'checkout'>('review');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('bank');
  const [isBooking, setIsBooking] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  const destination = searchParams?.segments?.[0]?.to || 'Abuja';
  const origin = searchParams?.segments?.[0]?.from || 'Lagos';
  const travelersCount = parseInt(searchParams?.travellers?.match(/\d+/) ? searchParams.travellers.match(/\d+/)[0] : '1');
  
  const getCode = (str: string) => {
    const match = str.match(/\((.*?)\)/);
    return match ? match[1] : str.substring(0, 3).toUpperCase();
  };

  const originCode = getCode(origin);
  const destCode = getCode(destination);
  
  const numericPrice = parseInt(item.price.replace(/[^\d]/g, '')) || 75000;
  const discount = isPromoApplied ? 5000 : 0;
  const totalPrice = (numericPrice * travelersCount) - discount;
  const formattedTotal = `${currency.symbol}${totalPrice.toLocaleString()}`;

  const handleApplyPromo = () => {
    setPromoError('');
    const code = promoCode.toUpperCase().trim();
    if (code === 'EBONY5' || code === 'WELCOME' || code === 'FLYEBONY') {
      setIsPromoApplied(true);
    } else if (code === '') {
      setPromoError('Please enter a code');
    } else {
      setPromoError('Invalid coupon code');
    }
  };

  const handleCompleteBooking = () => {
    setIsBooking(true);
    setTimeout(() => {
      setIsBooking(false);
      if (onSuccess) onSuccess();
    }, 1500);
  };

  if (view === 'review') {
    return (
      <div className="bg-[#f0f2f5] min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <button onClick={onBack} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
              Go back
            </button>
            <button className="bg-white border border-gray-300 rounded-lg px-4 py-1.5 text-sm font-bold flex items-center gap-2 hover:bg-gray-50">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
              Share
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-12">
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
                      <div className="text-green-600"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>
                      <span className="text-sm text-gray-600 font-medium">1 checked bag</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-black text-gray-900 mb-2">Step 2: Book your ticket on Ebony Bruce</h2>
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
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold">{currency.symbol}{(numericPrice * travelersCount).toLocaleString()} total</p>
                    </div>
                    <button onClick={() => setView('checkout')} className="bg-[#1a73e8] text-white px-10 py-3 rounded-lg font-black text-sm hover:bg-[#1557b0] transition shadow-lg shadow-blue-500/10">Book</button>
                  </div>
                </div>
              </section>
            </div>

            <aside className="w-full lg:w-[380px]">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-24">
                <h3 className="text-2xl font-black text-gray-900 mb-1">{origin} to {destination}</h3>
                <p className="text-sm text-gray-500 font-bold mb-6 capitalize">{searchParams?.tripType?.replace('-', ' ') || 'One-way'}, {travelersCount} Travelers</p>
                <div className="space-y-4">
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.provider)}&background=fff&color=33a8da`} className="w-8 h-8 rounded border border-gray-100" alt="" />
                        <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{originCode} → {destCode}</span>
                        <span className="text-[10px] text-gray-400 font-bold">Dec 26, Fri</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-black text-gray-900">{item.time || '08:00AM'}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{origin} ({originCode})</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-900">09:15AM</p>
                          <p className="text-[10px] text-gray-500 font-medium">{destination} ({destCode})</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fbfe] min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Check Out</h1>
          <p className="text-gray-400 font-bold mt-1">Review your trip details and confirm your booking.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-10">
            {/* Traveler Information Card */}
            <section className="bg-white rounded-[16px] p-10 shadow-sm border-2 border-[#33a8da]">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-6 h-6 text-[#33a8da]">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Traveler Information</h2>
              </div>
              
              {!isLoggedIn && (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center mb-10">
                  <p className="text-gray-900 font-bold text-sm mb-1">You are Booking as Guest</p>
                  <button onClick={onSignIn} className="text-[#33a8da] text-[10px] font-black uppercase tracking-widest hover:underline">SIGN IN TO GET REWARD</button>
                </div>
              )}
              
              <div className="space-y-8">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-3">Ful Name</label>
                  <input 
                    type="text" 
                    defaultValue={isLoggedIn ? user?.name : 'Ebony Life'} 
                    placeholder="Enter your full name"
                    className="w-full px-6 py-4 bg-[#f7f8f9] border-none rounded-xl font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#33a8da]/10 transition-all placeholder:text-gray-400" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-3">Email Address</label>
                  <input 
                    type="email" 
                    defaultValue={isLoggedIn ? user?.email : ''} 
                    placeholder="Enter your email adsress" 
                    className="w-full px-6 py-4 bg-[#f7f8f9] border-none rounded-xl font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#33a8da]/10 transition-all placeholder:text-gray-400" 
                  />
                </div>
              </div>
            </section>

            {/* Payment Method Card */}
            <section className="bg-white rounded-[16px] p-10 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-6 h-6 text-[#33a8da]">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Payment Method</h2>
              </div>
              <div className="space-y-4">
                <label onClick={() => setPaymentMethod('card')} className={`flex items-center justify-between p-6 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-[#33a8da] bg-blue-50/5 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'card' ? 'border-[#33a8da]' : 'border-gray-300'}`}>
                      {paymentMethod === 'card' && <div className="w-2.5 h-2.5 bg-[#33a8da] rounded-full" />}
                    </div>
                    <span className={`font-bold text-sm transition-colors ${paymentMethod === 'card' ? 'text-gray-900' : 'text-gray-500'}`}>Credit / Debit Card (Local & Int'l)</span>
                  </div>
                  <div className="flex gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" className="h-4 w-auto" alt="Visa" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-4 w-auto" alt="Mastercard" />
                  </div>
                </label>
                <label onClick={() => setPaymentMethod('bank')} className={`flex items-center justify-between p-6 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'bank' ? 'border-[#33a8da] bg-blue-50/5 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'bank' ? 'border-[#33a8da]' : 'border-gray-300'}`}>
                      {paymentMethod === 'bank' && <div className="w-2.5 h-2.5 bg-[#33a8da] rounded-full" />}
                    </div>
                    <span className={`font-bold text-sm transition-colors ${paymentMethod === 'bank' ? 'text-gray-900' : 'text-gray-500'}`}>Bank Transfer / USSD</span>
                  </div>
                  <div className="text-[#33a8da]">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/></svg>
                  </div>
                </label>
              </div>
            </section>
          </div>

          <aside className="w-full lg:w-[420px]">
            <div className="sticky top-24 bg-white rounded-[16px] shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-10 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-10 tracking-tight uppercase">Flight Summary</h3>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-2">
                     <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.provider)}&background=fff&color=33a8da&bold=true`} className="w-full h-full object-contain" alt="" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{item.provider} (P4 7121)</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Powered by • Economy</p>
                  </div>
                </div>
                
                {/* Vertical Timeline */}
                <div className="relative pl-6">
                  <div className="absolute left-[3px] top-[10px] bottom-[10px] w-[1px] bg-gray-200"></div>
                  
                  <div className="relative mb-10">
                    <div className="absolute -left-[26px] top-1 w-2 h-2 rounded-full border border-gray-300 bg-white z-10"></div>
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <p className="font-bold text-gray-900 text-xs">{item.time || '08:00AM'}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{origin} ({originCode})</p>
                        <p className="text-[9px] text-gray-400 font-medium">Dec 26, Fri</p>
                      </div>
                      <div className="bg-gray-200 text-gray-500 text-[9px] font-bold px-2 py-0.5 rounded uppercase">1h 15m</div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[26px] top-1 w-2 h-2 rounded-full bg-gray-900 z-10"></div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-gray-900 text-xs">09:15AM</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{destination} ({destCode})</p>
                      <p className="text-[9px] text-gray-400 font-medium">Dec 26, Fri</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 space-y-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 font-medium">Base Fare</span>
                  <span className="text-[#33a8da] font-bold">{currency.symbol}75,000</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 font-medium">Taxes & Fees</span>
                  <span className="text-[#33a8da] font-bold">Included</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-6">
                  <span className="text-gray-700 font-medium">Baggage</span>
                  <span className="text-[#33a8da] font-bold">Free</span>
                </div>
                
                {isPromoApplied && (
                  <div className="flex justify-between items-center text-sm text-green-600 font-bold bg-green-50/50 p-2 rounded-lg animate-in fade-in zoom-in-95">
                    <span>Discount (Promo)</span>
                    <span>- {currency.symbol}5,000</span>
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-[#33a8da]">{formattedTotal}</span>
                </div>

                {/* Promo Code Section */}
                <div className="mt-8 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Promo Code</p>
                    {isPromoApplied && <span className="text-[10px] font-bold text-green-600 uppercase">Code Applied!</span>}
                  </div>
                  <div className="flex gap-2">
                    <div className={`flex-1 bg-[#f1f2f3] rounded-lg px-4 py-3 flex items-center gap-3 border transition-colors ${promoError ? 'border-red-300' : isPromoApplied ? 'border-green-300' : 'border-transparent'}`}>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeWidth={2}/></svg>
                      <input 
                        type="text" 
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                        placeholder="Enter coupon code" 
                        className="bg-transparent border-none focus:ring-0 w-full text-sm font-bold text-gray-900 placeholder:text-gray-500" 
                      />
                    </div>
                    <button 
                      onClick={handleApplyPromo}
                      disabled={isPromoApplied}
                      className={`px-6 py-2 rounded-lg font-bold text-xs uppercase transition active:scale-95 ${isPromoApplied ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                      {isPromoApplied ? 'Applied' : 'Apply'}
                    </button>
                  </div>
                  {promoError && <p className="text-[10px] font-bold text-red-500 mt-1">{promoError}</p>}
                </div>

                <button 
                  onClick={handleCompleteBooking}
                  disabled={isBooking}
                  className="w-full bg-[#33a8da] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#2c98c7] transition transform active:scale-95 text-sm mt-4 uppercase tracking-tight disabled:opacity-70"
                >
                  {isBooking ? 'Processing...' : 'Complete Booking'}
                </button>
                
                <button onClick={() => setView('review')} className="w-full text-center text-[#33a8da] text-[11px] font-bold uppercase tracking-widest mt-2 hover:underline">Cancel & Return</button>
              </div>

              <div className="m-8 p-6 bg-[#f7f8f9] rounded-[12px]">
                 <p className="text-[10px] text-gray-400 font-medium leading-relaxed text-center px-2">
                   By completing this booking, you agree to our terms of use and the Air Peace (P4 7121) cancellation policy.
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

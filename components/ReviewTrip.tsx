
'use client';
import React, { useState, useEffect } from 'react';
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
  onFailure?: () => void;
}

const ReviewTrip: React.FC<ReviewTripProps> = ({ item, searchParams, onBack, onSignIn, isLoggedIn, user, onSuccess, onFailure }) => {
  const { currency } = useLanguage();
  
  // Robust detection for booking type
  const rawType = (item.type || searchParams?.type || 'flights').toLowerCase();
  const isHotel = rawType.includes('hotel') || item.id?.toLowerCase().includes('hotel');
  const isCar = rawType.includes('car') || item.id?.toLowerCase().includes('car');
  const isFlight = !isHotel && !isCar;

  // Jump directly to checkout for hotels and cars as requested
  const [view, setView] = useState<'review' | 'checkout'>(isHotel || isCar ? 'checkout' : 'review');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('bank');
  const [isBooking, setIsBooking] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [name, setName] = useState(isLoggedIn ? user?.name || '' : 'Ebony Life');
  const [specialReq, setSpecialReq] = useState('');

  // Auto-scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const travelersCount = parseInt(searchParams?.travellers?.match(/\d+/) ? searchParams.travellers.match(/\d+/)[0] : '1');
  
  // Locations
  const destination = searchParams?.segments?.[0]?.to || searchParams?.location || searchParams?.carPickUp || 'Your Destination';
  const origin = searchParams?.segments?.[0]?.from || 'Lagos';
  
  const getCode = (str: string) => {
    if (!str || typeof str !== 'string') return 'LOC';
    const match = str.match(/\((.*?)\)/);
    return match ? match[1] : str.substring(0, 3).toUpperCase();
  };

  const originCode = getCode(origin);
  const destCode = getCode(destination);
  const cityName = destination.split('(')[0].trim();

  // Price logic
  const numericPrice = parseInt(item.price?.replace(/[^\d]/g, '')) || 75000;
  const unitCount = isHotel ? 3 : (isCar ? 2 : travelersCount); 
  const cleaningFee = isHotel ? 45 : 0;
  const discount = isPromoApplied ? 5000 : 0;
  
  // Scale fees by currency
  const scaleFee = (fee: number) => currency.code === 'USD' ? fee : fee * 1500;
  
  const subtotal = (numericPrice * unitCount);
  const totalPrice = subtotal + (isHotel ? scaleFee(cleaningFee) : 0) - discount;
  const formattedTotal = `${currency.symbol}${totalPrice.toLocaleString()}.00`;

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
      // Logic for testing failures
      if (name.toLowerCase().includes('fail') && paymentMethod === 'card') {
        if (onFailure) onFailure();
      } else {
        if (onSuccess) onSuccess();
      }
    }, 1500);
  };

  // Review screen only for Flights
  if (isFlight && view === 'review') {
    return (
      <div className="bg-[#f0f2f5] min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <button onClick={onBack} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
              Go back
            </button>
            <button className="bg-white border border-gray-300 rounded-lg px-4 py-1.5 text-sm font-bold flex items-center gap-2 hover:bg-gray-50">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
              Share
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-12">
              <section>
                <h2 className="text-xl font-black text-gray-900 mb-2">Step 1: Review what’s included in your fare</h2>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  Total prices include estimated taxes and platform fees. Review full terms and conditions on the next page.
                </p>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="font-black text-gray-900">Economy</h3>
                    <p className="text-lg font-black text-gray-900 mt-1">{item.price}</p>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                    <div className="flex items-center gap-3">
                      <div className="text-green-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg></div>
                      <span className="text-sm text-gray-600 font-medium">1 carry-on bag</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-green-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg></div>
                      <span className="text-sm text-gray-600 font-medium">1 checked bag</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-black text-gray-900 mb-2">Step 2: Confirm your booking</h2>
                <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white border border-gray-100 rounded-full flex items-center justify-center p-2 shadow-sm overflow-hidden">
                       <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.provider)}&background=fff&color=33a8da`} className="w-full h-full object-contain" alt="" />
                    </div>
                    <span className="font-black text-gray-900">{item.provider}</span>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-black text-gray-900">{item.price}</span>
                        <span className="text-xs text-gray-400 font-bold">/ person</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold">{currency.symbol}{subtotal.toLocaleString()} estimated total</p>
                    </div>
                    <button onClick={() => setView('checkout')} className="bg-[#1a73e8] text-white px-10 py-3 rounded-lg font-black text-sm hover:bg-[#1557b0] transition shadow-lg shadow-blue-500/10">Book Now</button>
                  </div>
                </div>
              </section>
            </div>

            <aside className="w-full lg:w-[380px]">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-24">
                <h3 className="text-2xl font-black text-gray-900 mb-1">{cityName}</h3>
                <p className="text-sm text-gray-500 font-bold mb-6 capitalize">{rawType}, {travelersCount} Travelers</p>
                <div className="space-y-4">
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.provider)}&background=fff&color=33a8da`} className="w-8 h-8 rounded border border-gray-100" alt="" />
                        <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{originCode} → {destCode}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-black text-gray-900">Dec 26, 2025</p>
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

  // Checkout screen for everyone (Hotels go here directly)
  return (
    <div className="bg-[#f8fbfe] min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Check Out</h1>
            <p className="text-gray-400 font-bold mt-1">
              {isHotel ? 'Complete your hotel reservation securely.' : 'Review your details and confirm your booking.'}
            </p>
          </div>
          <button onClick={onBack} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
            Cancel
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-8">
            {/* Identity Section */}
            <section className="bg-white rounded-[16px] p-10 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-5 h-5 text-[#33a8da]">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  {isHotel ? 'Guest Information' : 'Traveler Information'}
                </h2>
              </div>
              
              {!isLoggedIn && (
                <div className="bg-[#f7f8f9] border border-dashed border-gray-200 rounded-2xl p-10 text-center mb-10">
                  <p className="text-gray-900 font-bold text-base mb-1">Booking as Guest</p>
                  <button onClick={onSignIn} className="text-[#33a8da] text-[10px] font-black uppercase tracking-widest hover:underline mt-2">SIGN IN TO EARN EBONY POINTS</button>
                </div>
              )}
              
              <div className="space-y-8">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-3">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-6 py-4 bg-[#f7f8f9] border-none rounded-xl font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#33a8da]/10 transition-all placeholder:text-gray-500" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest mb-3">Email Address</label>
                  <input 
                    type="email" 
                    defaultValue={isLoggedIn ? user?.email : ''} 
                    placeholder="Enter your email address" 
                    className="w-full px-6 py-4 bg-[#f7f8f9] border-none rounded-xl font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#33a8da]/10 transition-all placeholder:text-gray-500" 
                  />
                </div>
              </div>
            </section>

            {/* Special Requirements Section */}
            {isHotel && (
              <section className="bg-white rounded-[16px] p-10 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-5 h-5 text-[#33a8da]">
                    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">Special Requests</h2>
                </div>
                <p className="text-sm font-bold text-gray-600 mb-4">Let the hotel know if you have any special requirements (optional)</p>
                <textarea 
                  value={specialReq}
                  onChange={(e) => setSpecialReq(e.target.value)}
                  placeholder="e.g. Quiet room, early check-in, dietary restrictions..."
                  className="w-full px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl font-medium text-gray-700 focus:border-[#33a8da] focus:ring-4 focus:ring-[#33a8da]/5 transition-all min-h-[160px] outline-none placeholder:text-gray-500"
                />
              </section>
            )}

            {/* Payment Method Section */}
            <section className="bg-white rounded-[16px] p-10 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-6 h-6 text-[#33a8da]">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Payment Method</h2>
              </div>
              <div className="space-y-4">
                <label onClick={() => setPaymentMethod('card')} className={`flex items-center justify-between p-6 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-[#33a8da] bg-blue-50/10' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'card' ? 'border-[#33a8da]' : 'border-gray-300'}`}>
                      {paymentMethod === 'card' && <div className="w-2.5 h-2.5 bg-[#33a8da] rounded-full" />}
                    </div>
                    <span className="font-bold text-base text-gray-700">Credit / Debit Card</span>
                  </div>
                  <div className="flex gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" className="h-4 w-auto" alt="Visa" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-4 w-auto" alt="Mastercard" />
                  </div>
                </label>
                <label onClick={() => setPaymentMethod('bank')} className={`flex items-center justify-between p-6 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'bank' ? 'border-[#33a8da] bg-blue-50/10' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${paymentMethod === 'bank' ? 'border-[#33a8da]' : 'border-gray-300'}`}>
                      {paymentMethod === 'bank' && <div className="w-2.5 h-2.5 bg-[#33a8da] rounded-full" />}
                    </div>
                    <span className="font-bold text-base text-gray-700">Bank Transfer / USSD</span>
                  </div>
                  <div className="text-gray-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/></svg>
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-[460px]">
            <div className="sticky top-24 bg-white rounded-[24px] shadow-lg border border-gray-100 overflow-hidden">
              
              {/* Context-aware Header Picture (Hotels & Cars only) */}
              {!isFlight && (
                <div className="relative h-60">
                  <img src={item.imageUrl || "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=600"} className="w-full h-full object-cover" alt="Property" />
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

              <div className="p-10 border-b border-gray-50">
                <h3 className="text-xl font-bold text-gray-900 mb-8 tracking-tight uppercase">
                  {isHotel ? 'Stay Summary' : isCar ? 'Rental Summary' : 'Flight Summary'}
                </h3>
                
                <div className="space-y-5">
                  <div className="flex items-center gap-4 text-gray-400">
                    <div className="shrink-0"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                    <span className="text-xs font-bold text-gray-500">
                      {isHotel ? `Oct 24, 2024 - Oct 27, 2024 (${unitCount} Nights)` : isFlight ? 'Dec 26, 2025' : 'Dec 26 - Dec 28'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400">
                    <div className="shrink-0"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
                    <span className="text-xs font-bold text-gray-500">
                      {isHotel ? `${travelersCount} Adults, 0 Children` : isFlight ? `${travelersCount} Traveler(s)` : 'Standard Rental'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="p-10 space-y-8">
                <h4 className="text-lg font-black text-gray-900 tracking-tight">Price Breakdown</h4>
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-600 font-bold">
                      {isHotel ? `${unitCount} nights x ${currency.symbol}${numericPrice.toLocaleString()}.00` : 'Base Fare'}
                    </span>
                    <span className="text-[#33a8da] font-black">{currency.symbol}{subtotal.toLocaleString()}.00</span>
                  </div>
                  
                  {isHotel && (
                    <div className="flex justify-between items-center text-base">
                      <span className="text-gray-600 font-bold">Cleaning fee</span>
                      <span className="text-[#33a8da] font-black">{currency.symbol}{scaleFee(cleaningFee).toLocaleString()}.00</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-600 font-bold">Service fee</span>
                    <span className="text-[#33a8da] font-black uppercase">Free</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-base border-b border-gray-50 pb-8">
                    <span className="text-gray-600 font-bold">Taxes</span>
                    <span className="text-[#33a8da] font-black uppercase">Included</span>
                  </div>

                  {isPromoApplied && (
                    <div className="flex justify-between items-center text-base text-green-600 font-black">
                      <span>Discount (Promo)</span>
                      <span>- {currency.symbol}{discount.toLocaleString()}.00</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-2xl font-black text-gray-900 tracking-tighter">Total</span>
                    <span className="text-2xl font-black text-[#33a8da] tracking-tighter">{formattedTotal}</span>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="mt-12">
                  <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-4">Promo Code</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#f1f2f3] rounded-xl px-5 py-3 flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeWidth={2}/></svg>
                      <input 
                        type="text" 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter coupon code" 
                        className="bg-transparent border-none focus:ring-0 w-full text-sm font-bold text-gray-900 placeholder:text-gray-500" 
                      />
                    </div>
                    <button 
                      onClick={handleApplyPromo}
                      className="bg-black text-white px-8 py-2 rounded-xl font-black text-[11px] uppercase hover:bg-gray-800 transition"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && <p className="text-[10px] font-black text-red-500 mt-2">{promoError}</p>}
                </div>

                <button 
                  onClick={handleCompleteBooking}
                  disabled={isBooking}
                  className="w-full bg-[#33a8da] text-white font-black py-6 rounded-2xl shadow-2xl shadow-blue-500/10 hover:bg-[#2c98c7] transition transform active:scale-95 text-lg mt-6"
                >
                  {isBooking ? 'Processing...' : 'Confirm & Complete'}
                </button>
                
                <div className="flex items-center justify-center gap-3 mt-6 text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  Secure SSL Transaction
                </div>
              </div>

              <div className="mx-10 mb-10 p-6 bg-[#f7f8f9] rounded-2xl">
                 <p className="text-[10px] text-gray-400 font-bold leading-relaxed text-center">
                   By completing this booking, you agree to our terms of use and the {item.provider} reservation policy.
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

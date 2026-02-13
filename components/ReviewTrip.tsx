'use client';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { SearchResult, SearchParams, PassengerInfo, User } from '../lib/types';
import { userApi, ApiError } from '../lib/api';
import { formatPrice, currencySymbol } from '../lib/utils';

interface ReviewTripProps {
  item: SearchResult | null;
  searchParams: SearchParams | null;
  onBack: () => void;
  isLoggedIn: boolean;
  user?: User | null;
  isCreating?: boolean;
  onProceedToPayment: (passengerInfo: PassengerInfo, voucherCode?: string) => Promise<void>;
  onSignInRequired?: () => void;
}

const ReviewTrip: React.FC<ReviewTripProps> = ({ 
  item, 
  searchParams, 
  onBack, 
  isLoggedIn, 
  user, 
  isCreating,
  onProceedToPayment,
  onSignInRequired,
}) => {
  useLanguage(); // keep for any future display preference
  // Use offer currency for checkout (backend expects amount in offer currency)
  const offerCurrency = (item?.realData?.currency ?? 'GBP').toUpperCase();
  
  if (!item) {
    return (
      <div className="bg-[#f8fbfe] min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-black text-[#001f3f]">No item selected</h1>
          <button onClick={onBack} className="mt-8 px-6 py-3 bg-[#33a8da] text-white rounded-lg">
            Back to Selection
          </button>
        </div>
      </div>
    );
  }

  const rawType = (item.type || searchParams?.type || 'flights').toLowerCase();
  const isHotel = rawType.includes('hotel');
  const isCar = rawType.includes('car');
  const isFlight = !isHotel && !isCar;

  // Pre-fill from user profile when logged in
  const splitName = (user?.name || '').trim().split(/\s+/);
  const defaultFirstName = splitName[0] || '';
  const defaultLastName = splitName.slice(1).join(' ') || '';

  const [isBooking, setIsBooking] = useState(false);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherApplied, setVoucherApplied] = useState<any | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // Sync if user data loads after mount
  useEffect(() => {
    if (user) {
      const parts = (user.name || '').trim().split(/\s+/);
      if (!firstName) setFirstName(parts[0] || '');
      if (!lastName) setLastName(parts.slice(1).join(' ') || '');
      if (!email) setEmail(user.email || '');
      if (!phone) setPhone(user.phone || '');
    }
  }, [user]);

  // Total for the stay/trip in offer currency
  const subtotal = typeof item.realData?.price === 'number'
    ? item.realData.price
    : parseFloat((item.price || '0').replace(/[^\d.]/g, '') || '0');
  const serviceFeeAmount = typeof item.realData?.serviceFee === 'number' ? item.realData.serviceFee : 0;
  // Amadeus hotel flow: total is final_price (no extra markup); generic hotel flow: backend adds 15% + service
  const isAmadeusHotel = isHotel && !!item.realData?.offerId && (typeof item.realData?.finalPrice === 'number' || typeof item.realData?.price === 'number');
  const effectiveSubtotal = voucherApplied?.finalAmount ?? (isAmadeusHotel && typeof item.realData?.finalPrice === 'number' ? item.realData.finalPrice : subtotal);
  const BACKEND_MARKUP_PERCENT_HOTEL = 0.15;
  const markupAmount = isHotel && !isAmadeusHotel ? effectiveSubtotal * BACKEND_MARKUP_PERCENT_HOTEL : 0;
  const totalDue = isAmadeusHotel ? effectiveSubtotal : (effectiveSubtotal + markupAmount + serviceFeeAmount);
  const formattedReservation = formatPrice(effectiveSubtotal, offerCurrency);
  const formattedMarkup = formatPrice(markupAmount, offerCurrency);
  const formattedTotalDue = formatPrice(totalDue, offerCurrency);

  const productTypeForVoucher = (() => {
    if (isHotel) return 'HOTEL';
    if (isCar) return 'CAR_RENTAL';
    return 'FLIGHT_INTERNATIONAL';
  })();

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim();
    if (!code) {
      setVoucherError('Enter a voucher code');
      return;
    }
    setVoucherError(null);
    setIsValidatingVoucher(true);
    try {
      const result = await userApi.validateVoucher({
        voucherCode: code,
        productType: productTypeForVoucher,
        bookingAmount: subtotal,
        currency: offerCurrency,
      });
      if (!result.valid) {
        setVoucherApplied(null);
        setVoucherError(result.message || 'Voucher is not valid for this booking');
      } else {
        setVoucherApplied(result);
      }
    } catch (error: any) {
      console.error('Failed to validate voucher:', error);
      const msg =
        error instanceof ApiError ? error.message : (error?.message || 'Failed to validate voucher');
      setVoucherError(msg);
      setVoucherApplied(null);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleCompleteBooking = async () => {
    if (!firstName || !lastName || !email || !phone) {
      alert('All passenger fields are required.');
      return;
    }
  
    setIsBooking(true);
    try {
      await onProceedToPayment(
        { firstName, lastName, email, phone },
        voucherApplied?.valid ? voucherCode.trim() : undefined
      );
    } catch (error: any) {
      console.error('Booking preparation error:', error);
    } finally {
      setIsBooking(false);
    }
  };

  // Common input styles
  const inputCls = 'w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:border-[#33a8da] outline-none transition-all placeholder-gray-400';

  return (
    <div className="bg-[#f8fbfe] min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#33a8da] transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
          Back to Selection
        </button>

        <h1 className="text-5xl font-black text-[#001f3f] tracking-tighter uppercase mb-10">Checkout</h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-8">
            {/* ── Identity & Contact ── */}
            <section className="bg-white rounded-[32px] p-10 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-[#001f3f] uppercase">Identity & Contact</h2>
                {isLoggedIn && user && (
                  <span className="text-[10px] font-black text-green-500 bg-green-50 px-3 py-1 rounded-full uppercase tracking-widest">
                    ✓ From your profile
                  </span>
                )}
              </div>

              {isLoggedIn && user ? (
                /* ── Logged-in: Show pre-filled summary (editable) ── */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+234..." />
                  </div>
                </div>
              ) : (
                /* ── Guest: Empty form ── */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} placeholder="Enter first name" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} placeholder="Enter last name" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="name@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+234..." />
                </div>
              </div>
              )}

              {!isLoggedIn && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#33a8da] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-gray-600">
                    <button onClick={onSignInRequired} className="font-bold text-[#33a8da] hover:underline">Sign in</button>
                    {' '}to auto-fill your details and track your booking.
                  </p>
                </div>
              )}
            </section>

            {/* ── Trip Summary ── */}
            <section className="bg-white rounded-[32px] p-10 shadow-xl border border-gray-100">
               <h2 className="text-2xl font-black text-[#001f3f] mb-8 uppercase">Trip Summary</h2>
               <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-sm">
                    {isFlight ? '✈️' : isHotel ? '🏨' : '🚗'}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{item.title}</h3>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{item.subtitle} • {item.provider}</p>
                  </div>
               </div>
            </section>
          </div>

          {/* ── Price Sidebar ── */}
          <aside className="w-full lg:w-[460px]">
            <div className="bg-white rounded-[32px] shadow-2xl p-10 sticky top-24 border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Price Breakdown</h3>
              <div className="space-y-6 mb-10">
                 <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-400">Reservation Amount</span>
                    <span className="text-lg font-bold text-gray-900">{formattedReservation}</span>
                 </div>
                 {markupAmount > 0 && (
                   <div className="flex justify-between items-center">
                     <span className="text-sm font-bold text-gray-400">Markup</span>
                     <span className="text-sm font-bold text-gray-900">{formattedMarkup}</span>
                   </div>
                 )}
                 <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-400">Service Fee</span>
                    {isAmadeusHotel ? (
                      <span className="text-[10px] font-black text-gray-500 uppercase">Included</span>
                    ) : serviceFeeAmount > 0 ? (
                      <span className="text-sm font-bold text-gray-900">{formatPrice(serviceFeeAmount, offerCurrency)}</span>
                    ) : (
                      <span className="text-[10px] font-black text-green-500 uppercase">Waived</span>
                    )}
                 </div>
                 <div className="pt-2 border-t border-gray-100">
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                     Voucher Code (optional)
                   </label>
                   <div className="flex gap-2">
                     <input
                       type="text"
                       value={voucherCode}
                       onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                       placeholder="EBT-V-ABC123"
                       className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                     />
                     <button
                       type="button"
                       disabled={isValidatingVoucher || !voucherCode.trim()}
                       onClick={handleApplyVoucher}
                       className="px-4 py-2.5 bg-[#33a8da] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#2c98c7] disabled:opacity-50"
                     >
                       {isValidatingVoucher ? 'Checking…' : 'Apply'}
                     </button>
                   </div>
                   {voucherError && (
                     <p className="mt-2 text-[11px] text-red-500 font-bold">{voucherError}</p>
                   )}
                   {voucherApplied?.valid && (
                     <p className="mt-2 text-[11px] text-green-600 font-bold">
                       Discount applied: {currencySymbol(offerCurrency)}
                       {voucherApplied.discountAmount?.toLocaleString()} off
                     </p>
                   )}
                 </div>
                 <div className="h-px bg-gray-100 w-full"></div>
                 <div className="flex justify-between items-center">
                    <span className="text-xl font-black text-gray-900 uppercase">Total Due</span>
                    <span className="text-3xl font-black text-[#33a8da] tracking-tighter">{formattedTotalDue}</span>
                 </div>
              </div>
              
              <button 
  onClick={handleCompleteBooking} 
                disabled={isBooking || isCreating} 
  className="w-full bg-[#33a8da] text-white font-black py-6 rounded-2xl shadow-xl hover:bg-[#2c98c7] transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm"
>
                {isCreating ? 'Creating Booking...' : isBooking ? 'Preparing Payment...' : 'Proceed to Payment'}
</button>

              <div className="mt-8 flex items-center justify-center gap-2">
                 <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">256-bit SSL Secure Payment</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ReviewTrip;

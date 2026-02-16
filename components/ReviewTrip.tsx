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
  productType?: 'FLIGHT_INTERNATIONAL' | 'HOTEL' | 'CAR_RENTAL';
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
  productType: propProductType,
}) => {
  const { currency } = useLanguage();
  
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

  // Determine product type
  const productType = propProductType || (
    isFlight ? 'FLIGHT_INTERNATIONAL' : 
    isHotel ? 'HOTEL' : 
    'CAR_RENTAL'
  );

  // Use offer currency for checkout
  const offerCurrency = (item?.realData?.currency ?? currency.code ?? 'GBP').toUpperCase();

  // Pre-fill from user profile
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
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  // Sync user data
  useEffect(() => {
    if (user) {
      const parts = (user.name || '').trim().split(/\s+/);
      if (!firstName) setFirstName(parts[0] || '');
      if (!lastName) setLastName(parts.slice(1).join(' ') || '');
      if (!email) setEmail(user.email || '');
      if (!phone) setPhone(user.phone || '');
    }
  }, [user]);

  // Calculate totals
  const subtotal = typeof item.realData?.price === 'number'
    ? item.realData.price
    : parseFloat((item.price || '0').replace(/[^\d.]/g, '') || '0');
  
  const serviceFeeAmount = typeof item.realData?.serviceFee === 'number' ? item.realData.serviceFee : 0;
  
  // Amadeus hotel flow: total is final_price (no extra markup)
  const isAmadeusHotel = isHotel && !!item.realData?.offerId && 
    (typeof item.realData?.finalPrice === 'number' || typeof item.realData?.price === 'number');
  
  const effectiveSubtotal = voucherApplied?.finalAmount ?? 
    (isAmadeusHotel && typeof item.realData?.finalPrice === 'number' ? item.realData.finalPrice : subtotal);
  
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
      const msg = error instanceof ApiError ? error.message : (error?.message || 'Failed to validate voucher');
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

    if (isHotel && !agreedToPolicy) {
      alert('Please agree to the cancellation policy to continue.');
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
      alert('Failed to prepare booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  // Second UI design input styles
  const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#33a8da]/30 focus:border-[#33a8da] transition-all text-sm font-medium text-gray-900 placeholder-gray-400';

  return (
    <div className="bg-[#f8fbfe] min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="mb-8 flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-[#33a8da] transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Back to Selection
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Complete your booking</h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            {/* Identity & Contact Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Your details</h2>
                {isLoggedIn && user && (
                  <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    Logged in
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">First name</label>
                  <input 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                    className={inputCls} 
                    placeholder="John" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last name</label>
                  <input 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                    className={inputCls} 
                    placeholder="Doe" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className={inputCls} 
                    placeholder="john@example.com" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className={inputCls} 
                    placeholder="+234 123 456 789" 
                  />
                </div>
              </div>

              {!isLoggedIn && onSignInRequired && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-gray-600">
                    <button onClick={onSignInRequired} className="font-medium text-[#33a8da] hover:underline">Sign in</button>
                    {' '}to auto-fill your details
                  </p>
                </div>
              )}
            </div>

            {/* Trip Summary Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Trip summary</h2>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                  {isFlight ? '✈️' : isHotel ? '🏨' : '🚗'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.provider}</p>
                </div>
              </div>
              
              {/* Cancellation Policy - Only show for hotels */}
              {isHotel && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Cancellation Policy</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-green-600">Free cancellation</span> until {
                        item?.realData?.cancellationDeadline || "16 Feb 2026, 23:59 UTC"
                      }.
                    </p>
                    <p className="text-sm text-gray-600">
                      {item?.realData?.cancellationPolicy || "In case of no-show, the hotel may charge the full stay amount to the card used at booking. Our service fee is non-refundable once the booking is confirmed."}
                    </p>
                    <div className="flex items-start gap-2 mt-4 p-3 bg-gray-50 rounded-lg">
                      <input 
                        type="checkbox" 
                        id="cancellationPolicy" 
                        checked={agreedToPolicy}
                        onChange={(e) => setAgreedToPolicy(e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#33a8da] border-gray-300 rounded focus:ring-[#33a8da]"
                        required 
                      />
                      <label htmlFor="cancellationPolicy" className="text-sm text-gray-700">
                        By booking, I agree to the cancellation and no-show policy.
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price Sidebar */}
          <aside className="w-full lg:w-[380px]">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Price details</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base price</span>
                  <span className="font-medium text-gray-900">{formattedReservation}</span>
                </div>
                
                {markupAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Markup</span>
                    <span className="font-medium text-gray-900">{formattedMarkup}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service fee</span>
                  {isAmadeusHotel ? (
                    <span className="text-xs text-gray-500">Included</span>
                  ) : serviceFeeAmount > 0 ? (
                    <span className="font-medium text-gray-900">{formatPrice(serviceFeeAmount, offerCurrency)}</span>
                  ) : (
                    <span className="text-xs text-green-600">Free</span>
                  )}
                </div>

                {/* Voucher Section */}
                <div className="pt-3 border-t border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Voucher code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                    <button
                      type="button"
                      disabled={isValidatingVoucher || !voucherCode.trim()}
                      onClick={handleApplyVoucher}
                      className="px-4 py-2 bg-[#33a8da] text-white text-sm font-medium rounded-lg hover:bg-[#2c98c7] disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  {voucherError && (
                    <p className="mt-1 text-xs text-red-500">{voucherError}</p>
                  )}
                  {voucherApplied?.valid && (
                    <p className="mt-1 text-xs text-green-600">
                      Discount: {currencySymbol(offerCurrency)}{voucherApplied.discountAmount?.toLocaleString()} off
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-[#33a8da]">{formattedTotalDue}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleCompleteBooking} 
                disabled={isBooking || isCreating || (isHotel && !agreedToPolicy)} 
                className="w-full bg-[#33a8da] text-white font-medium py-3 rounded-xl hover:bg-[#2c98c7] transition disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : isBooking ? 'Please wait...' : 'Continue to payment'}
              </button>

              <p className="mt-4 text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001z" clipRule="evenodd" />
                </svg>
                Secure checkout
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ReviewTrip;
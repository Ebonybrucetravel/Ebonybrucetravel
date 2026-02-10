'use client';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../lib/api';
// ADD THESE IMPORT STATEMENTS
import { SearchResult, SearchParams } from '../lib/types';
import { User } from '../app/page'; // Or wherever your User type is defined

// ReviewTrip component props interface
interface ReviewTripProps {
  item: SearchResult | null;
  searchParams: SearchParams | null;
  onBack: () => void;
  isLoggedIn: boolean;
  user: User;
  onFlightBooking?: (
      onSuccess: () => void,
      onFailure: () => void
  ) => void;
  onHotelBooking?: (
      hotelData: any,
      dates: any,
      passengerInfo: any
  ) => void;
  onCarBooking?: (
      carData: any,
      dates: any,
      passengerInfo: any
  ) => void;
  onSuccess: () => void;
  onFailure: () => void;
  onOpenPaymentModal?: (bookingData: any) => void;
  productType: 'FLIGHT_INTERNATIONAL' | 'HOTEL' | 'CAR_RENTAL';
}

const ReviewTrip: React.FC<ReviewTripProps> = ({ 
  item, 
  searchParams, 
  onBack, 
  isLoggedIn, 
  user, 
  onSuccess, 
  onFailure,
  onOpenPaymentModal,
  productType
}) => {
  const { currency } = useLanguage();
  
  // Add null check for item
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

  const [isBooking, setIsBooking] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(isLoggedIn ? user?.email || '' : '');
  const [phone, setPhone] = useState(isLoggedIn ? user?.phone || '' : '');

  const getProviderForProductType = (): 'DUFFEL' | 'AMADEUS' | 'TRIPS_AFRICA' | 'BOOKING_COM' => {
    switch (productType) {
      case 'FLIGHT_INTERNATIONAL':
        return 'DUFFEL';
      case 'HOTEL':
        return 'AMADEUS';
      case 'CAR_RENTAL':
        return 'AMADEUS';
      default:
        // Fallback based on item type
        if (isFlight) return 'DUFFEL';
        if (isHotel) return 'AMADEUS';
        return 'AMADEUS'; // Default for car rentals
    }
  };

  useEffect(() => {
    if (isLoggedIn && user?.name) {
      const parts = user.name.trim().split(/\s+/);
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || 'User');
    }
    if (isLoggedIn && user?.email) setEmail(user.email);
    if (isLoggedIn && user?.phone) setPhone(user.phone);
  }, [isLoggedIn, user]);

  // Fix: Add null check for item.price
  const subtotal = parseFloat((item.price || '0').replace(/[^\d.]/g, '') || '0');
  const formattedTotal = `${currency.symbol}${subtotal.toLocaleString()}`;

  const handleCompleteBooking = async () => {
    if (!firstName || !lastName || !email || !phone) {
      alert('Identity fields required.');
      return;
    }
  
    setIsBooking(true);
    try {
      // IMPORTANT: DON'T create booking here - just prepare data for payment
      
      // Extract origin and destination from item or searchParams
      let origin = 'LOS';
      let destination = 'ABV';
      let departureDate = searchParams?.segments?.[0]?.date || new Date().toISOString().split('T')[0];
      
      // Try to extract from subtitle (e.g., "Lagos (LOS) → Abuja (ABV)")
      if (item.subtitle) {
        const match = item.subtitle.match(/([A-Z]{3})\s*→\s*([A-Z]{3})/);
        if (match) {
          origin = match[1];
          destination = match[2];
        }
      }
      
      // Try to extract from searchParams
      if (searchParams?.segments?.[0]?.from) {
        const fromMatch = searchParams.segments[0].from.match(/\(([A-Z]{3})\)/);
        if (fromMatch) origin = fromMatch[1];
      }
      
      if (searchParams?.segments?.[0]?.to) {
        const toMatch = searchParams.segments[0].to.match(/\(([A-Z]{3})\)/);
        if (toMatch) destination = toMatch[1];
      }
  
      // Get correct provider based on product type
      const getCorrectProvider = () => {
        switch (productType) {
          case 'FLIGHT_INTERNATIONAL':
            return 'DUFFEL';
          case 'HOTEL':
            return 'AMADEUS';
          case 'CAR_RENTAL':
            return 'AMADEUS';
          default:
            return isFlight ? 'DUFFEL' : 'AMADEUS';
        }
      };
  
      // Prepare passenger info WITHOUT nested 'name' field
      const passengerInfo = { 
        firstName, 
        lastName, 
        email, 
        phone
        // REMOVED: name: `${firstName} ${lastName}` - this causes backend error
      };
  
      // Calculate amount (do NOT send totalAmount to backend)
      const amount = subtotal; // Keep as number
  
      // Prepare data for payment modal ONLY (no API call yet)
      const paymentData = {
        // Core booking info
        productType: productType || (isFlight ? "FLIGHT_INTERNATIONAL" : isHotel ? "HOTEL" : "CAR_RENTAL"),
        provider: getCorrectProvider(),
        
        // Price info (for display only)
        price: amount,
        basePrice: amount,
        currency: currency.code,
        
        // Item info
        itemId: item.id,
        title: item.title,
        subtitle: item.subtitle,
        offerId: item.realData?.id || item.id,
        offerRequestId: item.realData?.offerRequestId,
        
        // Flight-specific data (if applicable)
        ...(isFlight && {
          origin,
          destination,
          departureDate,
          airline: item.provider,
          flightNumber: item.title?.match(/\d+/)?.[0] || 'N/A',
        }),
        
        // Hotel-specific data (if applicable)
        ...(isHotel && searchParams && {
          hotelId: item.id,
          checkInDate: searchParams.checkInDate,
          checkOutDate: searchParams.checkOutDate,
          guests: searchParams.adults || 1,
        }),
        
        // Car rental-specific data (if applicable)
        ...(isCar && searchParams && {
          carRentalId: item.id,
          pickupDate: searchParams.pickupDateTime,
          dropoffDate: searchParams.dropoffDateTime,
          pickupLocation: searchParams.carPickUp,
          dropoffLocation: searchParams.carDropOff,
        }),
        
        // Passenger info (for payment modal)
        passengerInfo,
        
        // Also include passenger fields separately for easier access
        firstName,
        lastName,
        email,
        phone,
        
        // DO NOT include totalAmount - this causes backend error
        // DO NOT call bookingApi.createBooking here - wait until after payment
      };
  
      console.log('📤 Sending data to payment modal:', paymentData);
      
      // IMPORTANT: Only call the payment modal callback
      // The actual booking creation will happen in PaymentModal AFTER successful payment
      if (onOpenPaymentModal) {
        onOpenPaymentModal(paymentData);
      } else {
        // Fallback: If no payment modal, proceed directly (for testing)
        console.warn('No payment modal handler available');
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error preparing booking:', error);
      alert('Failed to prepare booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

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
            <section className="bg-white rounded-[32px] p-10 shadow-xl border border-gray-100">
              <h2 className="text-2xl font-black text-[#001f3f] mb-10 uppercase">Identity & Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-[#33a8da] outline-none transition-all" placeholder="Enter first name" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-[#33a8da] outline-none transition-all" placeholder="Enter last name" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-[#33a8da] outline-none transition-all" placeholder="name@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-[#33a8da] outline-none transition-all" placeholder="+234..." />
                </div>
              </div>
            </section>

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

          <aside className="w-full lg:w-[460px]">
            <div className="bg-white rounded-[32px] shadow-2xl p-10 sticky top-24 border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Price Breakdown</h3>
              <div className="space-y-6 mb-10">
                 <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-400">Reservation Amount</span>
                    <span className="text-lg font-bold text-gray-900">{formattedTotal}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-400">Service Fee</span>
                    <span className="text-[10px] font-black text-green-500 uppercase">Waived</span>
                 </div>
                 <div className="h-px bg-gray-100 w-full"></div>
                 <div className="flex justify-between items-center">
                    <span className="text-xl font-black text-gray-900 uppercase">Total Due</span>
                    <span className="text-3xl font-black text-[#33a8da] tracking-tighter">{formattedTotal}</span>
                 </div>
              </div>
              
              <button 
  onClick={handleCompleteBooking} 
  disabled={isBooking} 
  className="w-full bg-[#33a8da] text-white font-black py-6 rounded-2xl shadow-xl hover:bg-[#2c98c7] transition transform active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm"
>
  {isBooking ? 'Preparing Payment...' : 'Proceed to Payment'}
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
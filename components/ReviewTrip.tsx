'use client';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { SearchResult, SearchParams, PassengerInfo, User, Booking } from '../lib/types';
import { userApi, ApiError, hotelApi } from '../lib/api';
import { formatPrice, currencySymbol } from '../lib/utils';

// Extended interface for Amadeus hotel data
interface ExtendedSearchResult extends SearchResult {
  realData?: {
    hotelId: string;
    rateKey?: string;
    offers: Array<{
      id: string;
      checkInDate: string;
      checkOutDate: string;
      price: {
        currency: string;
        base: string;
        total: string;
        variations?: any;
      };
      room: {
        type: string;
        typeEstimated?: {
          category: string;
          beds: number;
          bedType: string;
        };
        description: {
          text: string;
        };
      };
      guests: {
        adults: number;
      };
      policies?: {
        cancellations?: Array<{
          description: { text: string };
        }>;
        refundable?: {
          cancellationRefund: string;
        };
      };
    }>;
    originalData: any;
  };
  markup_percentage?: number;
  markup_amount?: string;
  service_fee?: string;
  conversion_fee?: string;
  conversion_fee_percentage?: string;
}

interface ReviewTripProps {
  item: SearchResult | null;
  searchParams: SearchParams | null;
  onBack: () => void;
  isLoggedIn: boolean;
  user?: User | null;
  isCreating?: boolean;
  onProceedToPayment: (passengerInfo: PassengerInfo, voucherCode?: string, hbxMetadata?: any) => Promise<void>;
  onSignInRequired?: () => void;
  productType?: 'FLIGHT_INTERNATIONAL' | 'HOTEL' | 'CAR_RENTAL';
  createdBooking?: Booking | null;
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
  createdBooking,
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

  // Cast to extended type to access realData (Amadeus and HBX)
  const extendedItem = item as ExtendedSearchResult;

  const rawType = (item.type || searchParams?.type || 'flights').toLowerCase();
  const isHotel = rawType.includes('hotel');
  const isCar = rawType.includes('car');
  const isFlight = !isHotel && !isCar;

  // Get the first offer from realData for Amadeus hotels
  const firstOffer = extendedItem?.realData?.offers?.[0];

  // Determine if this is an Amadeus hotel
  const isAmadeusHotel = isHotel && !!firstOffer;

  // Determine product type
  const productType = propProductType || (
    isFlight ? 'FLIGHT_INTERNATIONAL' :
      isHotel ? 'HOTEL' :
        'CAR_RENTAL'
  );

  // Use currency from created booking if available, otherwise from item/offer or context
  const offerCurrency = createdBooking?.currency ||
    firstOffer?.price?.currency ||
    item?.realData?.currency ||
    currency.code ||
    'GBP';

  // Pre-fill from user profile or created booking
  const splitName = (user?.name || createdBooking?.passengerInfo?.firstName || '').trim().split(/\s+/);
  const defaultFirstName = createdBooking?.passengerInfo?.firstName || splitName[0] || '';
  const defaultLastName = createdBooking?.passengerInfo?.lastName || splitName.slice(1).join(' ') || '';

  const [isBooking, setIsBooking] = useState(false);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [email, setEmail] = useState(user?.email || createdBooking?.passengerInfo?.email || '');
  const [phone, setPhone] = useState(user?.phone || createdBooking?.passengerInfo?.phone || '');
  const [title, setTitle] = useState<'mr' | 'ms' | 'mrs' | 'miss' | 'dr' | ''>('');
  const [gender, setGender] = useState<'m' | 'f' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherApplied, setVoucherApplied] = useState<any | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const isHBXHotel = isHotel && extendedItem.provider?.toLowerCase() === 'hotelbeds';
  const [hbxQuote, setHbxQuote] = useState<any | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [additionalGuests, setAdditionalGuests] = useState<Array<{ firstName: string; lastName: string; title: string }>>([]);

  // Initialize additional guests based on adults count for HBX
  useEffect(() => {
    if (isHBXHotel && !createdBooking) {
      const adultsCount = searchParams?.adults || 1;
      if (adultsCount > 1) {
        setAdditionalGuests(Array(adultsCount - 1).fill({ firstName: '', lastName: '', title: 'MR' }));
      }
    }
  }, [isHBXHotel, searchParams, createdBooking]);

  useEffect(() => {
    if (isHBXHotel && extendedItem?.realData?.rateKey && !createdBooking) {
      const performQuote = async () => {
        setIsQuoting(true);
        setQuoteError(null);
        try {
          const rateKey = extendedItem.realData!.rateKey!;
          const result = await hotelApi.quoteHotelHBX({ rateKey });
          if (result.success) {
            setHbxQuote(result);
          } else {
            setQuoteError('Failed to verify rate');
          }
        } catch (err: any) {
          setQuoteError(err.message || 'Error verifying rate');
        } finally {
          setIsQuoting(false);
        }
      };
      performQuote();
    }
  }, [isHBXHotel, extendedItem, createdBooking]);

  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);

  // Sync user data
  useEffect(() => {
    if (user) {
      const parts = (user.name || '').trim().split(/\s+/);
      if (!firstName) setFirstName(parts[0] || '');
      if (!lastName) setLastName(parts.slice(1).join(' ') || '');
      if (!email) setEmail(user.email || '');
      if (!phone) setPhone(user.phone || '');
      if (user.dateOfBirth) setDateOfBirth(user.dateOfBirth);
      if (user.gender) setGender(user.gender as 'm' | 'f');
    }
  }, [user]);

  // Extract HBX hotel details (updated for Amadeus-compatible server schema)
  const hbxHotelDetails = (() => {
    const quoteData = hbxQuote?.data?.data || hbxQuote?.data;
    if (!isHBXHotel || !quoteData?.hotel) return null;

    const hotel = quoteData.hotel;
    const firstOffer = quoteData.offers?.[0];

    return {
      hotelName: hotel.name,
      checkIn: firstOffer?.checkInDate || searchParams?.checkInDate || '',
      checkOut: firstOffer?.checkOutDate || searchParams?.checkOutDate || '',
      roomType: firstOffer?.room?.description?.text || firstOffer?.room?.type || 'Standard Room',
      bedType: firstOffer?.room?.typeEstimated?.bedType || 'Standard',
      adults: firstOffer?.guests?.adults || searchParams?.adults || 2,
      description: hotel.address?.cityName || hotel.destinationName || '',
      cancellationPolicy: firstOffer?.policies?.cancellations?.[0]?.description?.text ||
        (firstOffer?.policies?.refundable?.cancellationRefund === 'NON_REFUNDABLE'
          ? 'Non-refundable'
          : 'Free cancellation')
    };
  })();

  // Extract Amadeus hotel details
  const getHotelDetails = () => {
    if (!isAmadeusHotel || !firstOffer) return null;

    return {
      hotelName: item.title,
      checkIn: firstOffer.checkInDate,
      checkOut: firstOffer.checkOutDate,
      roomType: firstOffer.room?.typeEstimated?.category?.replace(/_/g, ' ') || 'Standard Room',
      bedType: firstOffer.room?.typeEstimated?.bedType || 'Unknown',
      adults: firstOffer.guests?.adults || 2,
      description: firstOffer.room?.description?.text || 'Room description not available',
      cancellationPolicy: firstOffer.policies?.cancellations?.[0]?.description?.text ||
        (firstOffer.policies?.refundable?.cancellationRefund === 'NON_REFUNDABLE'
          ? 'Non-refundable'
          : 'Free cancellation within policy period')
    };
  };

  const hotelDetails = getHotelDetails();

  // Price calculation for Amadeus hotels
  let basePrice = 0;
  let taxes = 0;
  let conversionFee = 0;
  let conversionPercentage = 0;
  let totalDue = 0;
  let displayBasePrice = '';
  let displayTaxes = '';
  let displayConversionFee = '';
  let displayTotalDue = '';

  if (createdBooking) {
    // Use created booking values
    basePrice = createdBooking.basePrice || 0;
    taxes = (createdBooking.markupAmount || 0) + (createdBooking.serviceFee || 0);
    conversionFee = (createdBooking as any).conversionFee || 0;
    conversionPercentage = (createdBooking as any).conversionPercentage || 0;
    totalDue = createdBooking.totalAmount || 0;

    displayBasePrice = formatPrice(basePrice, offerCurrency);
    displayTaxes = formatPrice(taxes, offerCurrency);
    displayConversionFee = conversionFee > 0 ? formatPrice(conversionFee, offerCurrency) : '';
    displayTotalDue = formatPrice(totalDue, offerCurrency);
  } else if (isAmadeusHotel && firstOffer) {
    // Amadeus hotel price calculation
    basePrice = parseFloat(firstOffer.price.base || firstOffer.price.total || '0');

    // Calculate taxes (total - base = taxes + fees)
    const totalAmount = parseFloat(firstOffer.price.total || '0');
    taxes = totalAmount - basePrice;

    // Add our markup and service fee
    const markupAmount = parseFloat(extendedItem.markup_amount || '0');
    const serviceFee = parseFloat(extendedItem.service_fee || '0');
    taxes += markupAmount + serviceFee;

    conversionFee = parseFloat(extendedItem.conversion_fee || '0');
    conversionPercentage = parseFloat(extendedItem.conversion_fee_percentage || '0');
    totalDue = basePrice + taxes + conversionFee;

    displayTotalDue = formatPrice(totalDue, offerCurrency);
  } else if (isHBXHotel && hbxQuote) {
    // Hotelbeds hotel price calculation (updated for Amadeus-compatible server schema)
    const quoteData = hbxQuote?.data?.data || hbxQuote?.data;
    const firstOffer = quoteData?.offers?.[0];

    basePrice = parseFloat(firstOffer?.price?.base || firstOffer?.price?.total || '0');

    // Add our markup and service fee
    const markupAmount = parseFloat(extendedItem.markup_amount || '0');
    const serviceFee = parseFloat(extendedItem.service_fee || '0');
    taxes = markupAmount + serviceFee;

    conversionFee = parseFloat(extendedItem.conversion_fee || '0');
    conversionPercentage = parseFloat(extendedItem.conversion_fee_percentage || '0');
    totalDue = basePrice + taxes + conversionFee;

    displayBasePrice = formatPrice(basePrice, offerCurrency);
    displayTaxes = formatPrice(taxes, offerCurrency);
    displayConversionFee = conversionFee > 0 ? formatPrice(conversionFee, offerCurrency) : '';
    displayTotalDue = formatPrice(totalDue, offerCurrency);
  } else {
    // For car rentals and other items
    if ((item as any).type === 'car-rentals') {
      displayBasePrice = (item as any).displayBasePrice || `${currencySymbol(offerCurrency)}0.00`;
      displayTaxes = (item as any).displayTaxes || `${currencySymbol(offerCurrency)}0.00`;
      displayConversionFee = (item as any).displayConversionFee || '';
      conversionPercentage = (item as any).displayConversionPercentage || 0;
      displayTotalDue = (item as any).displayTotalPrice || `${currencySymbol(offerCurrency)}0.00`;

      basePrice = (item as any).calculatedBasePrice || 0;
      taxes = (item as any).calculatedTaxes || 0;
      conversionFee = (item as any).calculatedConversionFee || 0;
      totalDue = (item as any).calculatedTotal || 0;
    } else {
      // For flights
      let priceValue = 0;
      if (typeof item.realData?.price === 'number') {
        priceValue = item.realData.price;
      } else if (item.price) {
        if (typeof item.price === 'string') {
          priceValue = parseFloat(item.price.replace(/[^\d.]/g, '') || '0');
        } else if (typeof item.price === 'number') {
          priceValue = item.price;
        }
      }

      basePrice = priceValue;
      const markupAmount = parseFloat((item as any).markup_amount || '0');
      const serviceFee = parseFloat((item as any).service_fee || '0');
      taxes = markupAmount + serviceFee;
      conversionFee = parseFloat((item as any).conversion_fee || '0');
      conversionPercentage = parseFloat((item as any).conversion_fee_percentage || '0');
      totalDue = basePrice + taxes + conversionFee;

      displayBasePrice = formatPrice(basePrice, offerCurrency);
      displayTaxes = formatPrice(taxes, offerCurrency);
      displayConversionFee = conversionFee > 0 ? formatPrice(conversionFee, offerCurrency) : '';
      displayTotalDue = formatPrice(totalDue, offerCurrency);
    }
  }

  const formattedDiscountedTotal = appliedPromo?.discountAmount
    ? formatPrice(appliedPromo.discountAmount, offerCurrency)
    : '';

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
        bookingAmount: basePrice,
        currency: offerCurrency,
      });
      if (!result.valid) {
        setVoucherApplied(null);
        setAppliedPromo(null);
        setVoucherError(result.message || 'Voucher is not valid for this booking');
      } else {
        setVoucherApplied(result);
        setAppliedPromo(result);
      }
    } catch (error: any) {
      console.error('Failed to validate voucher:', error);
      const msg = error instanceof ApiError ? error.message : (error?.message || 'Failed to validate voucher');
      setVoucherError(msg);
      setVoucherApplied(null);
      setAppliedPromo(null);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleCompleteBooking = async () => {
    if (!firstName || !lastName || !email || !phone) {
      alert('All passenger fields are required.');
      return;
    }

    if (isFlight) {
      if (!title) {
        alert('Title is required for flight bookings.');
        return;
      }
      if (!gender) {
        alert('Gender is required for flight bookings.');
        return;
      }
      if (!dateOfBirth) {
        alert('Date of birth is required for flight bookings.');
        return;
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateOfBirth)) {
        alert('Date of birth must be in YYYY-MM-DD format.');
        return;
      }

      const dob = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 2) {
        alert('Passenger must be at least 2 years old for flight bookings.');
        return;
      }
    }

    if (isHotel && !agreedToPolicy) {
      alert('Please agree to the cancellation policy to continue.');
      return;
    }

    setIsBooking(true);
    try {
      const passengerInfo: PassengerInfo = {
        firstName,
        lastName,
        email,
        phone,
        ...(isFlight && {
          title: title as 'mr' | 'ms' | 'mrs' | 'miss' | 'dr',
          gender: gender as 'm' | 'f',
          dateOfBirth
        })
      };

      // Prepare HBX metadata if applicable
      let hbxMetadata: any = undefined;
      const provider = (item as any).provider || searchParams?.provider;
      if (provider?.toLowerCase() === 'hotelbeds' && hbxQuote) {
        const quoteData = hbxQuote?.data?.data || hbxQuote?.data;
        const firstOffer = quoteData?.offers?.[0];

        hbxMetadata = {
          totalAmount: totalDue,
          currency: (firstOffer?.price?.currency || item.currency || 'GBP').toUpperCase(),
          cancellationPolicySnapshot: hbxHotelDetails?.cancellationPolicy || "Standard policy",
          cancellationDeadline: firstOffer?.policies?.cancellations?.[0]?.deadline || new Date().toISOString(),
          policyAccepted: true
        };
      }

      // Add additional guests to passengerInfo if HBX
      if (isHBXHotel && additionalGuests.length > 0) {
        (passengerInfo as any).guests = [
          {
            name: { firstName, lastName, title: (title || 'mr').toUpperCase() },
            travelerId: 1
          },
          ...additionalGuests.map((g, idx) => ({
            name: { firstName: g.firstName, lastName: g.lastName, title: g.title.toUpperCase() },
            travelerId: idx + 2
          }))
        ];
      }

      await onProceedToPayment(
        passengerInfo,
        voucherApplied?.valid ? voucherCode.trim() : undefined,
        hbxMetadata
      );
    } catch (error: any) {
      console.error('Booking preparation error:', error);
      alert('Failed to prepare booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#33a8da]/30 focus:border-[#33a8da] transition-all text-sm font-medium text-gray-900 placeholder-gray-400';

  const bookingReference = createdBooking?.reference;

  return (
    <div className="bg-[#f8fbfe] min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="mb-8 flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-[#33a8da] transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Back to Selection
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {createdBooking ? 'Complete your payment' : 'Complete your booking'}
        </h1>

        {/* Booking Reference */}
        {bookingReference && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Booking Reference:</span> {bookingReference}
            </p>
          </div>
        )}

        {/* Amadeus Hotel Notice */}
        {isAmadeusHotel && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-100 rounded-lg">
            <p className="text-sm text-purple-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Amadeus hotel booking • Real-time availability and pricing
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            {/* Rate Verification Notice for HBX */}
            {isHBXHotel && (
              <div className={`p-4 rounded-xl border ${isQuoting ? 'bg-blue-50 border-blue-100' : quoteError ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                <div className="flex items-center gap-3">
                  {isQuoting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#33a8da]"></div>
                  ) : quoteError ? (
                    <span className="text-xl">⚠️</span>
                  ) : (
                    <span className="text-xl">✅</span>
                  )}
                  <div>
                    <h3 className={`text-sm font-bold ${isQuoting ? 'text-blue-800' : quoteError ? 'text-red-800' : 'text-green-800'}`}>
                      {isQuoting ? 'Verifying live rate...' : quoteError ? 'Rate verification failed' : 'Rate verified!'}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {isQuoting ? 'We are checking the latest availability and price for your room.' : quoteError ? (quoteError + '. Please go back and select another room.') : 'Your selected room is available at the displayed price.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                    readOnly={!!createdBooking}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last name</label>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className={inputCls}
                    placeholder="Doe"
                    readOnly={!!createdBooking}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="john@example.com"
                    readOnly={!!createdBooking}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className={inputCls}
                    placeholder="+44 7911 123456"
                    readOnly={!!createdBooking}
                  />
                </div>
              </div>

              {/* Additional Guests for HBX */}
              {isHBXHotel && additionalGuests.length > 0 && !createdBooking && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-6">
                  <h3 className="text-sm font-semibold text-gray-900">Additional Guests</h3>
                  {additionalGuests.map((guest, idx) => (
                    <div key={idx} className="space-y-4">
                      <p className="text-xs font-bold text-[#33a8da]">Guest {idx + 2}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                          <select
                            value={guest.title}
                            onChange={e => {
                              const newGuests = [...additionalGuests];
                              newGuests[idx] = { ...newGuests[idx], title: e.target.value };
                              setAdditionalGuests(newGuests);
                            }}
                            className={inputCls}
                          >
                            <option value="MR">Mr</option>
                            <option value="MS">Ms</option>
                            <option value="MRS">Mrs</option>
                            <option value="MISS">Miss</option>
                            <option value="DR">Dr</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">First name</label>
                          <input
                            value={guest.firstName}
                            onChange={e => {
                              const newGuests = [...additionalGuests];
                              newGuests[idx] = { ...newGuests[idx], firstName: e.target.value };
                              setAdditionalGuests(newGuests);
                            }}
                            className={inputCls}
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Last name</label>
                          <input
                            value={guest.lastName}
                            onChange={e => {
                              const newGuests = [...additionalGuests];
                              newGuests[idx] = { ...newGuests[idx], lastName: e.target.value };
                              setAdditionalGuests(newGuests);
                            }}
                            className={inputCls}
                            placeholder="Last name"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Flight-specific fields */}
              {isFlight && !createdBooking && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Passenger Information (Required for flights)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                      <select
                        value={title}
                        onChange={(e) => setTitle(e.target.value as any)}
                        className={inputCls}
                        required
                      >
                        <option value="">Select title</option>
                        <option value="mr">Mr</option>
                        <option value="ms">Ms</option>
                        <option value="mrs">Mrs</option>
                        <option value="miss">Miss</option>
                        <option value="dr">Dr</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Gender *</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className={inputCls}
                        required
                      >
                        <option value="">Select gender</option>
                        <option value="m">Male</option>
                        <option value="f">Female</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Date of Birth *</label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className={inputCls}
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">Format: YYYY-MM-DD</p>
                    </div>
                  </div>
                </div>
              )}

              {!isLoggedIn && onSignInRequired && !createdBooking && (
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

            {/* Trip Summary Section - Enhanced for Amadeus Hotels */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Trip summary</h2>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                  {isHotel ? '🏨' : isFlight ? '✈️' : '🚗'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {isHotel ? 'London, United Kingdom' : (createdBooking?.bookingData?.origin || '') + ' → ' + (createdBooking?.bookingData?.destination || item.subtitle)}
                  </p>

                  {/* Amadeus Hotel Details */}
                  {isAmadeusHotel && hotelDetails && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                          {hotelDetails.roomType}
                        </span>
                        <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-full">
                          {hotelDetails.bedType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {hotelDetails.description}
                      </p>
                    </div>
                  )}

                  {/* HBX Hotel Details (NEW) */}
                  {isHBXHotel && hbxHotelDetails && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                          {hbxHotelDetails.roomType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {hbxQuote?.hotel?.categoryName} • {hbxQuote?.hotel?.destinationName}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    {isAmadeusHotel ? 'Amadeus • Direct booking' : isHBXHotel ? 'Hotelbeds • Direct booking' : (createdBooking?.provider || item.provider)}
                  </p>

                  {/* Dates for Amadeus Hotels */}
                  {isAmadeusHotel && hotelDetails && (
                    <p className="text-xs text-gray-500 mt-2">
                      📅 {new Date(hotelDetails.checkIn).toLocaleDateString()} - {new Date(hotelDetails.checkOut).toLocaleDateString()}
                      {' • '}{hotelDetails.adults} Adult{hotelDetails.adults > 1 ? 's' : ''}
                    </p>
                  )}

                  {/* Dates for HBX Hotels (NEW) */}
                  {isHBXHotel && hbxHotelDetails && (
                    <p className="text-xs text-gray-500 mt-2">
                      📅 {new Date(hbxHotelDetails.checkIn).toLocaleDateString()} - {new Date(hbxHotelDetails.checkOut).toLocaleDateString()}
                      {' • '}{hbxHotelDetails.adults} Adult{hbxHotelDetails.adults > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Cancellation Policy - Enhanced for Amadeus/HBX Hotels */}
              {isHotel && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Cancellation Policy</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-green-600">
                        {(isAmadeusHotel && firstOffer?.policies?.refundable?.cancellationRefund !== 'NON_REFUNDABLE') ||
                          (isHBXHotel && !hbxHotelDetails?.cancellationPolicy?.includes('fee'))
                          ? 'Free cancellation'
                          : 'Non-refundable / Specific conditions apply'}
                      </span>
                      {isAmadeusHotel && hotelDetails?.cancellationPolicy && (
                        <span className="block mt-1 text-xs text-gray-500">
                          {hotelDetails.cancellationPolicy}
                        </span>
                      )}
                      {isHBXHotel && hbxHotelDetails?.cancellationPolicy && (
                        <span className="block mt-1 text-xs text-gray-500">
                          {hbxHotelDetails.cancellationPolicy}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {isAmadeusHotel
                        ? "Please review the cancellation policy carefully. Some rates may be non-refundable."
                        : (item?.realData?.cancellationPolicy || "In case of no-show, the hotel may charge the full stay amount to the card used at booking. Our service fee is non-refundable once the booking is confirmed.")}
                    </p>
                    <div className="flex items-start gap-2 mt-4 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="cancellationPolicy"
                        checked={agreedToPolicy}
                        onChange={(e) => setAgreedToPolicy(e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#33a8da] border-gray-300 rounded focus:ring-[#33a8da]"
                        required
                        disabled={!!createdBooking}
                      />
                      <label htmlFor="cancellationPolicy" className="text-sm text-gray-700">
                        I have read and agree to the cancellation policy.
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price Sidebar - Enhanced for Amadeus Hotels */}
          <aside className="w-full lg:w-[380px]">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Price details</h3>

              <div className="space-y-3 mb-6">
                {/* Fare Breakdown */}
                <div>
                  <h3 className="text-sm font-black text-gray-900 mb-4 uppercase">Fare Breakdown</h3>
                  <div className="space-y-3">
                    {/* Base Price */}
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                      <span>Base Fare</span>
                      <span className="text-gray-900">{displayBasePrice}</span>
                    </div>

                    {/* Taxes */}
                    {parseFloat(taxes.toString()) > 0 && (
                      <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                        <span>Taxes & Fees</span>
                        <span className="text-gray-900">{displayTaxes}</span>
                      </div>
                    )}

                    {/* Conversion Fee */}
                    {conversionFee > 0 && displayConversionFee && (
                      <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                        <span>Conversion Fee ({conversionPercentage}%)</span>
                        <span className="text-gray-900">{displayConversionFee}</span>
                      </div>
                    )}

                    {/* Discount */}
                    {appliedPromo && (
                      <div className="flex justify-between items-center text-xs font-bold text-green-600">
                        <span>Discount ({appliedPromo.code})</span>
                        <span>- {formattedDiscountedTotal}</span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-2 border-t border-gray-100">
                      <span>Total Fare</span>
                      <span className="text-lg font-black text-[#33a8da]">
                        {displayTotalDue}
                      </span>
                    </div>

                    {/* Amadeus Price Breakdown */}
                    {isAmadeusHotel && firstOffer && (
                      <div className="mt-2 text-[10px] text-gray-400 border-t border-gray-50 pt-2">
                        <p>Original price: {firstOffer.price.currency} {parseFloat(firstOffer.price.total).toFixed(2)}</p>
                        {extendedItem.markup_percentage && (
                          <p>Includes {extendedItem.markup_percentage}% markup</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Voucher Section */}
                {!createdBooking && (
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
                )}
              </div>

              <button
                onClick={handleCompleteBooking}
                disabled={isBooking || isCreating || (isHotel && !agreedToPolicy)}
                className="w-full bg-[#33a8da] text-white font-medium py-3 rounded-xl hover:bg-[#2c98c7] transition disabled:opacity-50"
              >
                {isCreating ? 'Creating Booking...' :
                  isBooking ? 'Please wait...' :
                    createdBooking ? 'Proceed to Payment' : 'Continue to payment'}
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
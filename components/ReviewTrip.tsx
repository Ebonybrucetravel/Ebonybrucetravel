'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  service_fee_percentage?: number;
  conversion_fee?: string;
  conversion_fee_percentage?: number;
  taxes?: string;
  original_amount?: string;
  final_amount?: string;
  final_price?: string | number;
  destination?: string;
  origin?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureCity?: string;
  arrivalCity?: string;
  offerId?: string;
  selectData?: string;
  airline?: string;
  flightNumber?: string;
  departureDate?: string;
  cabinClass?: string;
  terms_and_conditions?: {
    TermsAndConditions: string[];
    TermsAndConditionImportantNotice: string;
  };
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

// Helper function to check if destination is in North America
const isNorthAmericanDestination = (item: ExtendedSearchResult, searchParams: SearchParams | null): boolean => {
  const destination = 
    item.destination || 
    item.arrivalAirport || 
    item.arrivalCity ||
    searchParams?.segments?.[0]?.to ||
    searchParams?.destination ||
    searchParams?.location;
  
  const origin = 
    item.origin ||
    item.departureAirport ||
    item.departureCity ||
    searchParams?.segments?.[0]?.from;
  
  const northAmericanAirports = [
    'JFK', 'EWR', 'LGA', 'LAX', 'SFO', 'ORD', 'DFW', 'ATL', 'IAH', 'MIA', 
    'BOS', 'SEA', 'DEN', 'PHX', 'DTW', 'MSP', 'CLT', 'PDX', 'SAN', 'LAS',
    'IAD', 'DCA', 'BWI', 'PHL', 'STL', 'MCI', 'IND', 'CMH', 'PIT', 'CLE',
    'YYZ', 'YVR', 'YUL', 'YYC', 'YOW', 'YHZ', 'YEG', 'YQB', 'YWG', 'YXE',
    'MEX', 'CUN', 'GDL', 'MTY', 'PVR', 'SJD', 'BJX', 'QRO', 'VER', 'CZM'
  ];
  
  const extractCode = (str: string | undefined) => {
    if (!str) return '';
    const match = str.match(/([A-Z]{3})/);
    return match?.[1] || str.substring(0, 3).toUpperCase();
  };
  
  const destinationCode = extractCode(destination);
  const originCode = extractCode(origin);
  
  const destinationInNA = northAmericanAirports.includes(destinationCode);
  const originInNA = northAmericanAirports.includes(originCode);
  
  return destinationInNA;
};

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
  const { currency, convertPrice, formatPrice: formatPriceWithCurrency, isLoadingRates } = useLanguage();

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

  const extendedItem = item as ExtendedSearchResult;

  const rawType = (item.type || searchParams?.type || 'flights').toLowerCase();
  const isHotel = rawType.includes('hotel');
  const isCar = rawType.includes('car');
  const isFlight = !isHotel && !isCar;

  const firstOffer = extendedItem?.realData?.offers?.[0];
  const isAmadeusHotel = isHotel && !!firstOffer;
  const isHBXHotel = isHotel && extendedItem.provider?.toLowerCase() === 'hotelbeds';

  const productType = propProductType || (
    isFlight ? 'FLIGHT_INTERNATIONAL' :
      isHotel ? 'HOTEL' :
        'CAR_RENTAL'
  );

  const offerCurrency = createdBooking?.currency ||
    firstOffer?.price?.currency ||
    item?.realData?.currency ||
    extendedItem?.currency ||
    currency.code ||
    'GBP';

  const splitName = (user?.name || createdBooking?.passengerInfo?.firstName || '').trim().split(/\s+/);
  const defaultFirstName = createdBooking?.passengerInfo?.firstName || splitName[0] || '';
  const defaultLastName = createdBooking?.passengerInfo?.lastName || splitName.slice(1).join(' ') || '';

  const router = useRouter();

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
  const [hbxQuote, setHbxQuote] = useState<any | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [additionalPassengers, setAdditionalPassengers] = useState<PassengerInfo[]>([]);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [displayedTerms, setDisplayedTerms] = useState<string[]>([]);
  const [passportNumber, setPassportNumber] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [passportIssuingAuthority, setPassportIssuingAuthority] = useState('');
  const [passportIssueCountry, setPassportIssueCountry] = useState('');
  const [passportAddress, setPassportAddress] = useState('');
  const [passportCity, setPassportCity] = useState('');
  const [passportCountry, setPassportCountry] = useState('');
  const [passportCountryCode, setPassportCountryCode] = useState('');
  const [passportPostalCode, setPassportPostalCode] = useState('');
  const [defaultTravelerId, setDefaultTravelerId] = useState<string | null>(null);
  const [isPassportIncomplete, setIsPassportIncomplete] = useState(false);
  const [isCheckingPassport, setIsCheckingPassport] = useState(false);
  const [passportError, setPassportError] = useState<string | null>(null);

  const isWakanow = (item as any)?.provider?.toUpperCase() === 'WAKANOW' ||
    (item as any)?.type?.toLowerCase().includes('wakanow');
  
  const isDomesticFlight = (item as any)?.productType === 'FLIGHT_DOMESTIC';
  
  const showPassportSection = isFlight && !isDomesticFlight && isWakanow;
  const isPassportMandatory = isFlight && isNorthAmericanDestination(extendedItem, searchParams);
  const passportRequired = showPassportSection;
  const requiresPassport = isPassportMandatory;

  useEffect(() => {
    if (!createdBooking) {
      let adults = 1;
      let children = 0;
      let infants = 0;

      if (typeof searchParams?.passengers === 'object') {
        adults = searchParams.passengers.adults || 1;
        children = searchParams.passengers.children || 0;
        infants = searchParams.passengers.infants || 0;
      } else if (typeof searchParams?.adults === 'number') {
        adults = searchParams.adults;
        children = searchParams.children || 0;
      } else if (typeof searchParams?.guests === 'number') {
        adults = searchParams.guests;
      }

      const totalAdditional = (adults - 1) + children + infants;
      
      if (totalAdditional > 0) {
        const initial: PassengerInfo[] = [];
        
        for (let i = 0; i < adults - 1; i++) {
          initial.push({ 
            firstName: '', lastName: '', email: '', phone: '', 
            type: 'adult', title: 'mr', gender: 'm', dateOfBirth: '' 
          });
        }
        
        for (let i = 0; i < children; i++) {
          initial.push({ 
            firstName: '', lastName: '', email: '', phone: '', 
            type: 'child', title: 'miss', gender: 'f', dateOfBirth: '' 
          });
        }
        
        for (let i = 0; i < infants; i++) {
          initial.push({ 
            firstName: '', lastName: '', email: '', phone: '', 
            type: 'infant', title: 'miss', gender: 'f', dateOfBirth: '' 
          });
        }
        
        setAdditionalPassengers(initial);
      } else {
        setAdditionalPassengers([]);
      }
    }
  }, [searchParams, createdBooking]);

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

  useEffect(() => {
    if (!passportRequired || !isLoggedIn || createdBooking) return;
    const load = async () => {
      setIsCheckingPassport(true);
      try {
        const listRes = await userApi.listTravelers();
        const items: any[] = Array.isArray(listRes) ? listRes : ((listRes as any)?.data ?? []);
        const defaultTraveler = items.find((t: any) => t.isDefault) ?? items[0] ?? null;
        if (!defaultTraveler) { setIsPassportIncomplete(true); return; }

        setDefaultTravelerId(defaultTraveler.id);

        const batchRes = await userApi.getTravelersBatch([defaultTraveler.id]);
        const unmasked: any = Array.isArray(batchRes)
          ? batchRes[0]
          : ((batchRes as any)?.data?.[0] ?? (batchRes as any)?.[0] ?? null);

        if (unmasked) {
          setPassportNumber(unmasked.passportNumber ?? '');
          setPassportExpiry(
            unmasked.passportExpiry
              ? new Date(unmasked.passportExpiry).toISOString().split('T')[0]
              : ''
          );
          setPassportIssueCountry(unmasked.passportCountry ?? '');
          const incomplete =
            !unmasked.passportNumber ||
            !unmasked.passportExpiry ||
            !unmasked.passportCountry;
          setIsPassportIncomplete(incomplete);
        } else {
          setIsPassportIncomplete(true);
        }
      } catch {
        setIsPassportIncomplete(true);
      } finally {
        setIsCheckingPassport(false);
      }
    };
    load();
  }, [passportRequired, isLoggedIn, createdBooking]);

  useEffect(() => {
    if (extendedItem?.terms_and_conditions?.TermsAndConditions) {
      setDisplayedTerms(extendedItem.terms_and_conditions.TermsAndConditions);
    } else if ((item as any)?.terms_and_conditions?.TermsAndConditions) {
      setDisplayedTerms((item as any).terms_and_conditions.TermsAndConditions);
    }
  }, [extendedItem, item]);

  // ==================== PRICE CALCULATION - FIXED FOR HOTELS ====================
  let basePrice = 0;
  let markupAmount = 0;
  let conversionFee = 0;
  let taxes = 0;
  let totalDue = 0;
  let serviceFee = 0;

  if (isHotel) {
    // ✅ For hotels, use final_amount directly from the item
    // Convert to string safely before parseFloat to fix TypeScript error
    const finalAmountValue = extendedItem.final_amount || 
                             (extendedItem.final_price !== undefined ? String(extendedItem.final_price) : '0');
    totalDue = parseFloat(finalAmountValue);

    // If we have a created booking, use its totalAmount
    if (createdBooking && createdBooking.totalAmount) {
        totalDue = createdBooking.totalAmount;
    }

    // For hotels, service fee is the markup amount from the item
    serviceFee = parseFloat(extendedItem.service_fee || '0');
    basePrice = totalDue - serviceFee;
    markupAmount = serviceFee;
  } else {
    // For flights, use the original calculation
    basePrice = parseFloat(extendedItem.original_amount || '0');
    markupAmount = parseFloat(extendedItem.markup_amount || '0');
    conversionFee = parseFloat(extendedItem.conversion_fee || '0');
    taxes = parseFloat(extendedItem.taxes || '0');
    totalDue = parseFloat(extendedItem.final_amount || (basePrice + markupAmount + conversionFee + taxes).toString());
    serviceFee = extendedItem.final_amount 
      ? (totalDue - basePrice) 
      : (markupAmount + conversionFee + taxes);
  }

  const displayBasePrice = formatPrice(basePrice, offerCurrency);
  const displayServiceFee = formatPrice(serviceFee, offerCurrency);
  const displayTotalDue = formatPrice(totalDue, offerCurrency);
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

  const validatePassport = (): boolean => {
    if (!requiresPassport) return true;
    
    setPassportError(null);
    
    const passportRegex = /^[A-Za-z][0-9]{7,8}$|^[A-Za-z0-9]{6,9}$/;
    if (!passportNumber) {
      setPassportError('Passport number is required for North America travel');
      return false;
    }
    if (!passportRegex.test(passportNumber)) {
      setPassportError('Please enter a valid passport number (e.g., A12345678)');
      return false;
    }
    
    if (!passportExpiry) {
      setPassportError('Passport expiry date is required');
      return false;
    }
    
    const expiryDate = new Date(passportExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let travelDate = new Date();
    if (searchParams?.segments?.[0]?.date) {
      travelDate = new Date(searchParams.segments[0].date);
    } else if (searchParams?.departureDate) {
      travelDate = new Date(searchParams.departureDate);
    }
    
    const sixMonthsFromTravel = new Date(travelDate);
    sixMonthsFromTravel.setMonth(sixMonthsFromTravel.getMonth() + 6);
    
    if (expiryDate < today) {
      setPassportError('Your passport has expired. Please renew your passport.');
      return false;
    }
    if (expiryDate < sixMonthsFromTravel) {
      setPassportError('Your passport must be valid for at least 6 months from your travel date');
      return false;
    }
    
    if (!passportIssuingAuthority) {
      setPassportError('Passport issuing authority/country is required');
      return false;
    }
    
    return true;
  };

  const handleCompleteBooking = async () => {
    if (isBooking || isCreating) return;

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
      
      if (isPassportMandatory && !validatePassport()) {
        return;
      }

      if (showPassportSection && !isPassportMandatory && passportNumber) {
        if (!validatePassport()) return;
      }

      if (displayedTerms.length > 0 && !agreedToTerms) {
        alert('Please agree to the Terms & Conditions to continue.');
        return;
      }
    }

    if (isHotel && !agreedToPolicy) {
      alert('Please agree to the cancellation policy to continue.');
      return;
    }

    setIsBooking(true);
    try {
      for (let i = 0; i < additionalPassengers.length; i++) {
        const p = additionalPassengers[i];
        const passengerType = p.type || 'adult';
        const label = `${passengerType.toUpperCase()} #${i + 1}`;
        
        if (!p.firstName || !p.lastName) {
          alert(`${label}: First and Last name are required.`);
          setIsBooking(false);
          return;
        }
      
        if (isFlight) {
          if (!p.title || !p.gender || !p.dateOfBirth) {
            alert(`${label}: Title, Gender, and Date of Birth are required.`);
            setIsBooking(false);
            return;
          }
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(p.dateOfBirth)) {
            alert(`${label}: Date of birth must be in YYYY-MM-DD format.`);
            setIsBooking(false);
            return;
          }
      
          if (isPassportMandatory) {
            if (!p.passportNumber || !p.passportExpiry || !p.passportIssuingAuthority) {
              alert(`${label}: Passport details are mandatory for this destination.`);
              setIsBooking(false);
              return;
            }
            if (!p.address || !p.city || !p.country || !p.countryCode || !p.postalCode) {
              alert(`${label}: Address details are required.`);
              setIsBooking(false);
              return;
            }
          }
        }
      }

      // ==================== BUILD PASSENGER INFO BASED ON PRODUCT TYPE ====================
      let passengerInfo: PassengerInfo;

      // For Hotels (Amadeus) and Car Rentals/Transfers - ONLY basic contact info
      if (isHotel || isCar) {
        passengerInfo = {
          firstName,
          lastName,
          email,
          phone,
        };
      } else {
        // For Flights (Duffel/Wakanow) - Keep ALL fields
        passengerInfo = {
          firstName,
          lastName,
          email,
          phone,
          type: 'adult',
          title: title as 'mr' | 'ms' | 'mrs' | 'miss' | 'dr',
          gender: gender as 'm' | 'f',
          dateOfBirth,
          address: passportAddress || "221B Baker Street",
          city: passportCity || "London",
          country: passportCountry || "United Kingdom", 
          countryCode: passportCountryCode || "GB",
          postalCode: passportPostalCode || "NW1 6XE",
          ...(passportRequired && {
            passportNumber,
            passportExpiry,
            passportIssuingAuthority,
            passportIssueCountry,
          }),
        };
        
        // Additional passengers for flights only
        if (additionalPassengers.length > 0) {
          (passengerInfo as any).travellers = additionalPassengers;
        }
      }

      if (isFlight && showPassportSection && passportNumber) {
        (passengerInfo as any).passportNumber = passportNumber;
        (passengerInfo as any).passportExpiry = passportExpiry;
        (passengerInfo as any).passportIssuingAuthority = passportIssuingAuthority;
      }

      if (isFlight && displayedTerms.length > 0) {
        (passengerInfo as any).policyAccepted = agreedToTerms;
        (passengerInfo as any).policyAcceptedAt = new Date().toISOString();
      }

      let hbxMetadata: any = undefined;
      if (isHBXHotel && hbxQuote) {
        const quoteData = hbxQuote?.data?.data || hbxQuote?.data;
        const firstOfferData = quoteData?.offers?.[0];
        hbxMetadata = {
          totalAmount: totalDue,
          currency: (firstOfferData?.price?.currency || item.currency || 'GBP').toUpperCase(),
          cancellationPolicySnapshot: "Standard policy",
          cancellationDeadline: firstOfferData?.policies?.cancellations?.[0]?.deadline || new Date().toISOString(),
          policyAccepted: true
        };
      }

      if (isHBXHotel && additionalPassengers.length > 0) {
        (passengerInfo as any).guests = [
          {
            name: { firstName, lastName, title: (title || 'mr').toUpperCase() },
            travelerId: 1
          },
          ...additionalPassengers.map((g, idx) => ({
            name: { firstName: g.firstName, lastName: g.lastName, title: (g.title || 'mr').toUpperCase() },
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

  if (isLoadingRates && !createdBooking) {
    return (
      <div className="bg-[#f8fbfe] min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading exchange rates...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Prices displayed in {currency.code} ({currency.symbol}) using live exchange rates
          </p>
        </div>

        {isPassportMandatory && !createdBooking && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-blue-800">Important Travel Requirement</p>
                <p className="text-sm text-blue-700">
                  Flights to North America require a valid passport. Please ensure you have your passport ready
                  when providing passenger details. Passport must be valid for at least 6 months beyond your travel date.
                </p>
              </div>
            </div>
          </div>
        )}

        {showPassportSection && !isPassportMandatory && !createdBooking && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-blue-800">International Travel Recommendation</p>
                <p className="text-sm text-blue-700">
                  Providing your passport details now will speed up your airport check-in. If you don't have it handy, you can continue without it.
                </p>
              </div>
            </div>
          </div>
        )}

        {passportRequired && isLoggedIn && isPassportIncomplete && !createdBooking && !requiresPassport && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Passport details required</p>
              <p className="text-xs text-amber-700 mt-1">
                Passport information is required to complete this flight booking. Please add your travel documents to your profile, then return here to continue.
              </p>
              <button
                onClick={() => {
                  sessionStorage.setItem('authReturnTo', '/booking/review');
                  router.push('/profile?tab=travelers');
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Complete Travel Profile
              </button>
            </div>
          </div>
        )}

        {bookingReference && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Booking Reference:</span> {bookingReference}
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            {/* Your details section - unchanged */}
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
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} placeholder="John" readOnly={!!createdBooking} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} placeholder="Doe" readOnly={!!createdBooking} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="john@example.com" readOnly={!!createdBooking} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+44 7911 123456" readOnly={!!createdBooking} />
                </div>
              </div>

              {/* Rest of your existing JSX remains exactly the same */}
              {/* ... */}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Trip summary</h2>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  {isHotel ? (
                    <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" /></svg>
                  ) : isFlight ? (
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  ) : (
                    <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v9a1 1 0 01-1 1H7a1 1 0 01-1-1V9a2 2 0 012-2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M9 12h.01M15 12h.01M8 16h8" /></svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.provider}</p>
                </div>
              </div>

              {isHotel && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Cancellation Policy</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Please review the cancellation policy carefully.</p>
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

              {displayedTerms.length > 0 && !createdBooking && isFlight && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
                  <div className="max-h-60 overflow-y-auto bg-gray-50 rounded-xl p-4 mb-4">
                    <ul className="space-y-2">
                      {displayedTerms.map((term, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex gap-2">
                          <span className="text-[#33a8da] font-bold">•</span>
                          <span>{term}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="termsAndConditions"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 text-[#33a8da] border-gray-300 rounded focus:ring-[#33a8da]"
                      required
                    />
                    <label htmlFor="termsAndConditions" className="text-sm text-gray-700">
                      I have read and agree to the <span className="font-semibold">Terms & Conditions</span> and
                      <span className="font-semibold"> Cancellation Policy</span>.
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price Sidebar - UPDATED */}
          <aside className="w-full lg:w-[380px]">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Price details</h3>

              <div className="mb-4 text-xs text-gray-500 flex items-center gap-1">
                <span>💰 All prices in {currency.code} ({currency.symbol})</span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Base Fare</span>
                  <span className="text-sm font-semibold text-gray-900">{displayBasePrice}</span>
                </div>

                {serviceFee > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-500">Service Fee</span>
                    <span className="text-sm font-semibold text-gray-900">{displayServiceFee}</span>
                  </div>
                )}

                {appliedPromo && (
                  <div className="flex justify-between items-center text-xs font-bold text-green-600 pt-1">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>- {formattedDiscountedTotal}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-sm font-bold text-gray-900">Total Fare</span>
                  <span className="text-xl font-black text-[#33a8da]">{displayTotalDue}</span>
                </div>

                {serviceFee > 0 && (
                  <div className="mt-2 text-[10px] text-gray-400 border-t border-gray-50 pt-2 text-center">
                    Service fee includes platform fee, conversion fees, and taxes
                  </div>
                )}
              </div>

              {!createdBooking && (
                <div className="pt-3 border-t border-gray-100">
                  <label className="block text-xs font-medium text-gray-500 mb-2">Voucher code</label>
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
                  {voucherError && <p className="mt-1 text-xs text-red-500">{voucherError}</p>}
                  {voucherApplied?.valid && (
                    <p className="mt-1 text-xs text-green-600">
                      Discount: {currencySymbol(offerCurrency)}{voucherApplied.discountAmount?.toLocaleString()} off
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleCompleteBooking}
                disabled={
                  isBooking || isCreating ||
                  (isHotel && !agreedToPolicy) ||
                  (isFlight && !agreedToTerms && displayedTerms.length > 0) ||
                  (passportRequired && isLoggedIn && isPassportIncomplete) ||
                  isCheckingPassport
                }
                className="w-full bg-[#33a8da] text-white font-medium py-3 rounded-xl hover:bg-[#2c98c7] transition disabled:opacity-50 mt-4"
              >
                {isCheckingPassport ? 'Checking passport...' :
                  isCreating ? 'Creating Booking...' :
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
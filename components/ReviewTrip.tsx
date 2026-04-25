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
  // Get destination from multiple possible sources
  const destination = 
    item.destination || 
    item.arrivalAirport || 
    item.arrivalCity ||
    searchParams?.segments?.[0]?.to ||
    searchParams?.destination ||
    searchParams?.location;
  
  // Also check origin (for round trips, departure might be from North America too)
  const origin = 
    item.origin ||
    item.departureAirport ||
    item.departureCity ||
    searchParams?.segments?.[0]?.from;
  
  // List of North American airport codes
  const northAmericanAirports = [
    // USA
    'JFK', 'EWR', 'LGA', 'LAX', 'SFO', 'ORD', 'DFW', 'ATL', 'IAH', 'MIA', 
    'BOS', 'SEA', 'DEN', 'PHX', 'DTW', 'MSP', 'CLT', 'PDX', 'SAN', 'LAS',
    'IAD', 'DCA', 'BWI', 'PHL', 'STL', 'MCI', 'IND', 'CMH', 'PIT', 'CLE',
    // Canada  
    'YYZ', 'YVR', 'YUL', 'YYC', 'YOW', 'YHZ', 'YEG', 'YQB', 'YWG', 'YXE',
    // Mexico
    'MEX', 'CUN', 'GDL', 'MTY', 'PVR', 'SJD', 'BJX', 'QRO', 'VER', 'CZM'
  ];
  
  // Extract airport code from string (e.g., "JFK" or "JFK (New York)")
  const extractCode = (str: string | undefined) => {
    if (!str) return '';
    const match = str.match(/([A-Z]{3})/);
    return match?.[1] || str.substring(0, 3).toUpperCase();
  };
  
  const destinationCode = extractCode(destination);
  const originCode = extractCode(origin);
  
  // Check if either destination OR origin is in North America
  const destinationInNA = northAmericanAirports.includes(destinationCode);
  const originInNA = northAmericanAirports.includes(originCode);
  
  // For passport requirement, check if traveling TO North America
  // (arriving at a North American destination)
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

  // Cast to extended type
  const extendedItem = item as ExtendedSearchResult;

  const rawType = (item.type || searchParams?.type || 'flights').toLowerCase();
  const isHotel = rawType.includes('hotel');
  const isCar = rawType.includes('car');
  const isFlight = !isHotel && !isCar;

  // Get the first offer from realData for Amadeus hotels
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

  // Pre-fill from user profile
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

  // Passport / travel document state
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
  
  // Visibility: Show for all international Wakanow flights
  const showPassportSection = isFlight && !isDomesticFlight && isWakanow;
  
  // Mandatory: Only for North America
  const isPassportMandatory = isFlight && isNorthAmericanDestination(extendedItem, searchParams);
  
  // Legacy flag for background profile checks
  const passportRequired = showPassportSection;
  const requiresPassport = isPassportMandatory;

  // Initialize additional passengers based on search results
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
        
        // Additional adults (excluding the lead)
        for (let i = 0; i < adults - 1; i++) {
          initial.push({ 
            firstName: '', lastName: '', email: '', phone: '', 
            type: 'adult', title: 'mr', gender: 'm', dateOfBirth: '' 
          });
        }
        
        // Children
        for (let i = 0; i < children; i++) {
          initial.push({ 
            firstName: '', lastName: '', email: '', phone: '', 
            type: 'child', title: 'miss', gender: 'f', dateOfBirth: '' 
          });
        }
        
        // Infants
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

  // HBX quote
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

  // Load saved traveler passport details for Wakanow flights
  useEffect(() => {
    if (!passportRequired || !isLoggedIn || createdBooking) return;
    const load = async () => {
      setIsCheckingPassport(true);
      try {
        // Step 1: List to find default traveler ID
        const listRes = await userApi.listTravelers();
        const items: any[] = Array.isArray(listRes) ? listRes : ((listRes as any)?.data ?? []);
        const defaultTraveler = items.find((t: any) => t.isDefault) ?? items[0] ?? null;
        if (!defaultTraveler) { setIsPassportIncomplete(true); return; }

        setDefaultTravelerId(defaultTraveler.id);

        // Step 2: Batch fetch to get unmasked passport data
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
        // silently fail — let the gate catch it
      } finally {
        setIsCheckingPassport(false);
      }
    };
    load();
  }, [passportRequired, isLoggedIn, createdBooking]);

  // ==================== PRICE CALCULATION WITH SERVICE FEE ====================
  // Extract values from the selected item (these are already set in SearchContext)
  // Consistent price calculation for display
  const basePrice = parseFloat(extendedItem.original_amount || '0');
  const markupAmount = parseFloat(extendedItem.markup_amount || '0');
  const conversionFee = parseFloat(extendedItem.conversion_fee || '0');
  const taxes = parseFloat(extendedItem.taxes || '0');
  
  // ✅ FIX: Ensure mathematical consistency in display. 
  // If final_amount is provided, the service fee MUST be the difference between total and base.
  // This prevents discrepancies like £804.31 + £607.57 = £884.74.
  const totalDue = parseFloat(extendedItem.final_amount || (basePrice + markupAmount + conversionFee + taxes).toString());
  const serviceFee = extendedItem.final_amount 
    ? (totalDue - basePrice) 
    : (markupAmount + conversionFee + taxes);

  // Format prices for display
  const displayBasePrice = formatPrice(basePrice, offerCurrency);
  const displayServiceFee = formatPrice(serviceFee, offerCurrency);
  const displayTotalDue = formatPrice(totalDue, offerCurrency);

  // Debug log
  console.log('💰 ReviewTrip - Price Breakdown:', {
    basePrice,
    markupAmount,
    conversionFee,
    taxes,
    serviceFee,
    totalDue,
    currency: offerCurrency,
    requiresPassport
  });

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

  // Passport validation function
  const validatePassport = (): boolean => {
    if (!requiresPassport) return true;
    
    setPassportError(null);
    
    // Check passport number (letter + 7-8 digits or standard format)
    const passportRegex = /^[A-Za-z][0-9]{7,8}$|^[A-Za-z0-9]{6,9}$/;
    if (!passportNumber) {
      setPassportError('Passport number is required for North America travel');
      return false;
    }
    if (!passportRegex.test(passportNumber)) {
      setPassportError('Please enter a valid passport number (e.g., A12345678)');
      return false;
    }
    
    // Check expiry date
    if (!passportExpiry) {
      setPassportError('Passport expiry date is required');
      return false;
    }
    
    const expiryDate = new Date(passportExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get travel date from searchParams
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
    
    // Check issuing authority
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
      // Validate passport for North America (MANDATORY)
      if (isPassportMandatory && !validatePassport()) {
        return;
      }

      // For other international flights, passport is optional but must be valid if partially filled
      if (showPassportSection && !isPassportMandatory && passportNumber) {
        if (!validatePassport()) return;
      }
    }

    if (isHotel && !agreedToPolicy) {
      alert('Please agree to the cancellation policy to continue.');
      return;
    }

    setIsBooking(true);
    try {
      // Validate additional passengers if any
      for (let i = 0; i < additionalPassengers.length; i++) {
        const p = additionalPassengers[i];
        const label = `${p.type.toUpperCase()} #${i + 1}`;
        
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

          // Mandatory passport validation for additional passengers
          if (isPassportMandatory) {
            if (!p.passportNumber || !p.passportExpiry || !p.passportIssuingAuthority) {
              alert(`${label}: Passport details are mandatory for this destination.`);
              setIsBooking(false);
              return;
            }
          }
        }
      }

      const passengerInfo: PassengerInfo = {
        firstName,
        lastName,
        email,
        phone,
        type: 'adult', // Lead is always adult
        ...(isFlight && {
          title: title as 'mr' | 'ms' | 'mrs' | 'miss' | 'dr',
          gender: gender as 'm' | 'f',
          dateOfBirth
        }),
        ...(passportRequired && {
          passportNumber,
          passportExpiry,
          passportIssuingAuthority,
          passportIssueCountry,
          address: passportAddress,
          city: passportCity,
          country: passportCountry,
          countryCode: passportCountryCode,
          postalCode: passportPostalCode,
        }),
        travellers: additionalPassengers // Include all additional passengers
      };
      
      // Add passport info to passengerInfo for international flights if provided
      if (isFlight && showPassportSection && passportNumber) {
        (passengerInfo as any).passportNumber = passportNumber;
        (passengerInfo as any).passportExpiry = passportExpiry;
        (passengerInfo as any).passportIssuingAuthority = passportIssuingAuthority;
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

        {/* Currency Info Banner */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Prices displayed in {currency.code} ({currency.symbol}) using live exchange rates
          </p>
        </div>

        {/* North America Travel Warning Banner */}
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

        {/* International Travel Info Banner (Optional) */}
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

        {/* Passport incomplete gate — redirect to profile */}
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
            {/* Identity Section */}
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

              {isFlight && !createdBooking && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Passenger Information (Required for flights)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                      <select value={title} onChange={(e) => setTitle(e.target.value as any)} className={inputCls} required>
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
                      <select value={gender} onChange={(e) => setGender(e.target.value as any)} className={inputCls} required>
                        <option value="">Select gender</option>
                        <option value="m">Male</option>
                        <option value="f">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Date of Birth *</label>
                      <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} max={new Date().toISOString().split('T')[0]} className={inputCls} required />
                      <p className="text-xs text-gray-400 mt-1">Format: YYYY-MM-DD</p>
                    </div>
                  </div>
                  
                  {/* PASSPORT SECTION FOR INTERNATIONAL FLIGHTS */}
                  {showPassportSection && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2 mb-4">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="font-semibold text-yellow-800">
                            Passport Details {isPassportMandatory ? '(Required)' : '(Optional but Recommended)'}
                          </p>
                          <p className="text-sm text-yellow-700">
                            {isPassportMandatory 
                              ? 'Please provide your passport details exactly as shown on your passport. Passport must be valid for at least 6 months from travel.'
                              : 'Providing passport details now will save time during airport check-in.'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Passport Number {isPassportMandatory && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={passportNumber}
                            onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                            className={inputCls}
                            placeholder="e.g., A12345678"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Passport Expiry Date {isPassportMandatory && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="date"
                            value={passportExpiry}
                            onChange={(e) => setPassportExpiry(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className={inputCls}
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Passport Issuing Authority / Country {isPassportMandatory && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={passportIssuingAuthority}
                            onChange={(e) => setPassportIssuingAuthority(e.target.value)}
                            className={inputCls}
                            placeholder="e.g., UK Visas and Immigration (UKVI)"
                          />
                        </div>
                      </div>
                      
                      {passportError && (
                        <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">{passportError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Passport fields section — shown for logged-in Wakanow flights */}
              {passportRequired && isLoggedIn && !createdBooking && !isPassportIncomplete && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-900">Travel Documents</h3>
                    <span className="ml-auto text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Loaded from profile</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Passport Number *</label>
                      <input value={passportNumber} onChange={e => setPassportNumber(e.target.value)} className={inputCls} placeholder="e.g. A12345678" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Expiry Date *</label>
                      <input type="date" value={passportExpiry} onChange={e => setPassportExpiry(e.target.value)} min={new Date().toISOString().split('T')[0]} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Issuing Authority *</label>
                      <input value={passportIssuingAuthority} onChange={e => setPassportIssuingAuthority(e.target.value)} className={inputCls} placeholder="e.g. Nigerian Immigration" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Issue Country *</label>
                      <input value={passportIssueCountry} onChange={e => setPassportIssueCountry(e.target.value)} className={inputCls} placeholder="e.g. NG" maxLength={2} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                      <input value={passportAddress} onChange={e => setPassportAddress(e.target.value)} className={inputCls} placeholder="Street address" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                      <input value={passportCity} onChange={e => setPassportCity(e.target.value)} className={inputCls} placeholder="City" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
                      <input value={passportCountry} onChange={e => setPassportCountry(e.target.value)} className={inputCls} placeholder="Country" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Country Code</label>
                      <input value={passportCountryCode} onChange={e => setPassportCountryCode(e.target.value)} className={inputCls} placeholder="e.g. NG" maxLength={2} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Postal Code</label>
                      <input value={passportPostalCode} onChange={e => setPassportPostalCode(e.target.value)} className={inputCls} placeholder="Postal code" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">These details are pre-filled from your Travel Profile. Update them in your profile settings if needed.</p>
                </div>
              )}

              {/* ADDITIONAL PASSENGERS SECTION */}
              {additionalPassengers.length > 0 && !createdBooking && (
                <div className="mt-8 space-y-6">
                  {additionalPassengers.map((passenger, idx) => (
                    <div key={`passenger-${idx}`} className="pt-6 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-[#33a8da]/10 text-[#33a8da] flex items-center justify-center font-bold text-sm">
                          {idx + 2}
                        </div>
                        <h3 className="text-md font-bold text-gray-900 capitalize">
                          {passenger.type} Passenger details
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">First name *</label>
                          <input 
                            value={passenger.firstName} 
                            onChange={e => {
                              const newArr = [...additionalPassengers];
                              newArr[idx] = { ...newArr[idx], firstName: e.target.value };
                              setAdditionalPassengers(newArr);
                            }} 
                            className={inputCls} 
                            placeholder="First Name" 
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Last name *</label>
                          <input 
                            value={passenger.lastName} 
                            onChange={e => {
                              const newArr = [...additionalPassengers];
                              newArr[idx] = { ...newArr[idx], lastName: e.target.value };
                              setAdditionalPassengers(newArr);
                            }} 
                            className={inputCls} 
                            placeholder="Last Name" 
                            required
                          />
                        </div>
                        
                        {(isFlight || isHotel) && (
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                              <select 
                                value={passenger.title} 
                                onChange={e => {
                                  const newArr = [...additionalPassengers];
                                  newArr[idx] = { ...newArr[idx], title: e.target.value as any };
                                  setAdditionalPassengers(newArr);
                                }} 
                                className={inputCls}
                                required
                              >
                                <option value="mr">Mr</option>
                                <option value="ms">Ms</option>
                                <option value="mrs">Mrs</option>
                                <option value="miss">Miss</option>
                                <option value="dr">Dr</option>
                              </select>
                            </div>
                            {isFlight && (
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Gender *</label>
                                  <select 
                                    value={passenger.gender} 
                                    onChange={e => {
                                      const newArr = [...additionalPassengers];
                                      newArr[idx] = { ...newArr[idx], gender: e.target.value as any };
                                      setAdditionalPassengers(newArr);
                                    }} 
                                    className={inputCls}
                                    required
                                  >
                                    <option value="m">Male</option>
                                    <option value="f">Female</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Date of Birth *</label>
                                  <input 
                                    type="date" 
                                    value={passenger.dateOfBirth} 
                                    onChange={e => {
                                      const newArr = [...additionalPassengers];
                                      newArr[idx] = { ...newArr[idx], dateOfBirth: e.target.value };
                                      setAdditionalPassengers(newArr);
                                    }} 
                                    className={inputCls} 
                                    required
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Additional Passenger Passport Section */}
                        {showPassportSection && (
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                            <div className="md:col-span-2 flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                              <span className="text-xs font-bold text-yellow-800">Passport Details {isPassportMandatory ? '(Required)' : '(Optional)'}</span>
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-yellow-700 mb-1">Passport Number</label>
                              <input 
                                value={passenger.passportNumber || ''} 
                                onChange={e => {
                                  const newArr = [...additionalPassengers];
                                  newArr[idx] = { ...newArr[idx], passportNumber: e.target.value.toUpperCase() };
                                  setAdditionalPassengers(newArr);
                                }} 
                                className="w-full px-3 py-2 bg-white/50 border border-yellow-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
                                placeholder="Number"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-yellow-700 mb-1">Expiry Date</label>
                              <input 
                                type="date"
                                value={passenger.passportExpiry || ''} 
                                onChange={e => {
                                  const newArr = [...additionalPassengers];
                                  newArr[idx] = { ...newArr[idx], passportExpiry: e.target.value };
                                  setAdditionalPassengers(newArr);
                                }} 
                                className="w-full px-3 py-2 bg-white/50 border border-yellow-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-medium text-yellow-700 mb-1">Issuing Authority</label>
                              <input 
                                value={passenger.passportIssuingAuthority || ''} 
                                onChange={e => {
                                  const newArr = [...additionalPassengers];
                                  newArr[idx] = { ...newArr[idx], passportIssuingAuthority: e.target.value };
                                  setAdditionalPassengers(newArr);
                                }} 
                                className="w-full px-3 py-2 bg-white/50 border border-yellow-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400"
                                placeholder="Authority"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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

            {/* Trip Summary */}
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
            </div>
          </div>

          {/* PRICE SIDEBAR - CLEAN SERVICE FEE (NO PERCENTAGE, NO BREAKDOWN) */}
          <aside className="w-full lg:w-[380px]">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Price details</h3>

              <div className="mb-4 text-xs text-gray-500 flex items-center gap-1">
                <span>💰 All prices in {currency.code} ({currency.symbol})</span>
              </div>

              <div className="space-y-3 mb-6">
                {/* Base Fare */}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Base Fare</span>
                  <span className="text-sm font-semibold text-gray-900">{displayBasePrice}</span>
                </div>

                {/* Service Fee - Combined (NO PERCENTAGE) */}
                {serviceFee > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-500">Service Fee</span>
                    <span className="text-sm font-semibold text-gray-900">{displayServiceFee}</span>
                  </div>
                )}

                {/* Discount */}
                {appliedPromo && (
                  <div className="flex justify-between items-center text-xs font-bold text-green-600 pt-1">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>- {formattedDiscountedTotal}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-sm font-bold text-gray-900">Total Fare</span>
                  <span className="text-xl font-black text-[#33a8da]">{displayTotalDue}</span>
                </div>

                {/* Note about service fee */}
                {serviceFee > 0 && (
                  <div className="mt-2 text-[10px] text-gray-400 border-t border-gray-50 pt-2 text-center">
                    Service fee includes platform fee, conversion fees, and taxes
                  </div>
                )}
              </div>

              {/* Voucher Section */}
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
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import type { SearchResult, SearchParams, PassengerInfo, User, Booking } from '../lib/types';
import { userApi, ApiError, hotelApi } from '../lib/api';
import { formatPrice, currencySymbol } from '../lib/utils';
import toast from 'react-hot-toast';

// ✅ Extended Booking type - adds missing price fields
type ExtendedBooking = Booking & {
  markupAmount?: number;
  serviceFee?: number;
  markupPercentage?: number;
  serviceFeePercentage?: number;
  taxes?: number;
  taxPercentage?: number;
  total?: number;
  breakdown?: string;
  [key: string]: any;
};

// Extended interface for Amadeus hotel data
interface ExtendedSearchResult extends SearchResult {
  final_amount?: string;
  original_amount?: string;
  final_price?: string;
  original_price?: string;
  base_price?: string;
  original_currency?: string;
  markup_percentage?: number;
  markup_amount?: string;
  service_fee?: string;
  service_fee_percentage?: number;
  conversion_fee?: string;
  conversion_fee_percentage?: number;
  taxes?: string;
  currency?: string;
  originalPriceAmount?: number;
  originalPriceCurrency?: string;
  calculatedBasePrice?: number;
  calculatedMarkup?: number;
  calculatedServiceFee?: number;
  calculatedTaxes?: number;
  calculatedTotal?: number;
  price_after_conversion?: string;
  priceObject?: { total?: string; amount?: string; currency?: string };
  realData?: {
    offerId?: string;
    finalPrice?: number;
    price?: number;
    currency?: string;
    [key: string]: any;
  };
  isDomestic?: boolean;
  isWakanow?: boolean;
  selectData?: string;
  terms_and_conditions?: {
    TermsAndConditions: string[];
    TermsAndConditionImportantNotice: string;
  } | null;
  bookingId?: string;
  offer_request_id?: string;
  offer_id?: string;
  connection_code?: string;
  token?: string;
  session_id?: string;
  booking_token?: string;
  totalAmount?: number;
  markupAmount?: number;
  serviceFee?: number;
  basePrice?: number;
  total_price?: string;
  TotalPrice?: string;
  totalFare?: string;
  GrandTotal?: string;
  grandTotal?: string;
  amount?: string;
  rawPrice?: number;
  productType?: string;
  breakdown?: string;
  markupPercentage?: number;
  serviceFeePercentage?: number;
  priceBreakdown?: {
    basePrice: number;
    markupAmount: number;
    markupPercentage: number;
    serviceFee: number;
    serviceFeePercentage: number;
    taxes: number;
    taxPercentage: number;
    totalAmount: number;
    currency: string;
    breakdown?: string;
  };
  // ✅ CAR RENTAL FIELDS
  vehicle?: {
    code: string;
    category: string;
    description: string;
    imageURL?: string;
    seats?: Array<{ count: number }>;
    baggages?: Array<{ count: number; size?: string }>;
  };
  serviceProvider?: {
    code: string;
    name: string;
    logoUrl?: string;
    termsUrl?: string;
  };
  cancellationRules?: Array<{
    ruleDescription: string;
    feeType?: string;
    feeValue?: string;
    metricType?: string;
    metricMin?: string;
    metricMax?: string;
  }>;
  distance?: { value: number; unit: string };
  start?: { dateTime: string; locationCode: string; address?: { countryCode?: string } };
  end?: { dateTime: string; locationCode: string; address?: { countryCode?: string } };
  methodsOfPaymentAccepted?: string[];
  supportedPaymentInstruments?: Array<{ vendorCode: string; description: string }>;
  extraServices?: Array<{
    code: string;
    description: string;
    quotation: { monetaryAmount: string; currencyCode: string };
    isBookable: boolean;
    includedInTotal: boolean;
  }>;
  conditionSummary?: Array<{
    descriptions?: Array<{ descriptionType: string; text: string }>;
  }>;
  transferType?: string;
  duration?: string;
  [key: string]: any;
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

// ==================== AIRPORT COUNTRY MAPPING ====================
const AIRPORT_COUNTRY_MAP: Record<string, string> = {
  'LOS': 'NG', 'ABV': 'NG', 'PHC': 'NG', 'KAN': 'NG', 'ENU': 'NG',
  'QOW': 'NG', 'BNI': 'NG', 'JOS': 'NG', 'KAD': 'NG', 'YOL': 'NG',
  'ILR': 'NG', 'MDI': 'NG', 'CBQ': 'NG', 'QRW': 'NG', 'SKO': 'NG',
  'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'DFW': 'US', 'DEN': 'US',
  'SFO': 'US', 'SEA': 'US', 'LAS': 'US', 'MCO': 'US', 'EWR': 'US',
  'MIA': 'US', 'BOS': 'US', 'ATL': 'US', 'IAH': 'US', 'PHX': 'US',
  'LGA': 'US', 'DCA': 'US', 'IAD': 'US', 'CLT': 'US', 'MSP': 'US',
  'DTW': 'US', 'FLL': 'US', 'TPA': 'US', 'SAN': 'US', 'PDX': 'US',
  'LHR': 'GB', 'LGW': 'GB', 'MAN': 'GB', 'EDI': 'GB', 'GLA': 'GB',
  'BHX': 'GB', 'BRS': 'GB', 'LTN': 'GB', 'STN': 'GB', 'LCY': 'GB',
  'NCL': 'GB', 'BFS': 'GB', 'ABZ': 'GB',
  'YYZ': 'CA', 'YVR': 'CA', 'YUL': 'CA', 'YYC': 'CA', 'YOW': 'CA',
  'YEG': 'CA', 'YHZ': 'CA', 'YWG': 'CA',
  'DXB': 'AE', 'AUH': 'AE', 'SHJ': 'AE',
  'DEL': 'IN', 'BOM': 'IN', 'BLR': 'IN', 'MAA': 'IN', 'CCU': 'IN',
  'HYD': 'IN', 'COK': 'IN', 'GOI': 'IN',
  'PEK': 'CN', 'PVG': 'CN', 'CAN': 'CN', 'SZX': 'CN', 'CTU': 'CN',
  'HND': 'JP', 'NRT': 'JP', 'KIX': 'JP', 'CTS': 'JP', 'FUK': 'JP',
  'SYD': 'AU', 'MEL': 'AU', 'BNE': 'AU', 'PER': 'AU', 'ADL': 'AU',
  'FRA': 'DE', 'MUC': 'DE', 'BER': 'DE', 'HAM': 'DE', 'CGN': 'DE',
  'DUS': 'DE', 'STR': 'DE',
  'CDG': 'FR', 'ORY': 'FR', 'NCE': 'FR', 'LYS': 'FR', 'MRS': 'FR',
  'JNB': 'ZA', 'CPT': 'ZA', 'DUR': 'ZA', 'PLZ': 'ZA',
  'NBO': 'KE', 'MBA': 'KE',
  'CAI': 'EG', 'HRG': 'EG', 'SSH': 'EG',
  'ACC': 'GH',
  'ADD': 'ET',
  'IST': 'TR', 'SAW': 'TR', 'ESB': 'TR',
  'SIN': 'SG',
  'KUL': 'MY', 'PEN': 'MY',
  'BKK': 'TH', 'HKT': 'TH', 'CNX': 'TH',
  'HAN': 'VN', 'SGN': 'VN', 'DAD': 'VN',
  'MNL': 'PH', 'CEB': 'PH',
  'GRU': 'BR', 'GIG': 'BR', 'BSB': 'BR',
  'MEX': 'MX', 'CUN': 'MX', 'GDL': 'MX',
  'MAD': 'ES', 'BCN': 'ES', 'AGP': 'ES',
  'FCO': 'IT', 'MXP': 'IT', 'VCE': 'IT',
  'AMS': 'NL',
  'ZRH': 'CH', 'GVA': 'CH',
  'BRU': 'BE',
  'VIE': 'AT',
  'ARN': 'SE',
  'OSL': 'NO',
  'CPH': 'DK',
  'DOH': 'QA',
  'MCT': 'OM',
  'BAH': 'BH',
  'KWI': 'KW',
  'JED': 'SA', 'RUH': 'SA', 'DMM': 'SA',
  'AMM': 'JO',
  'TLV': 'IL',
  'BEY': 'LB',
  'KHI': 'PK', 'LHE': 'PK', 'ISB': 'PK',
  'DAC': 'BD',
  'CMB': 'LK',
  'CGK': 'ID', 'DPS': 'ID',
  'ICN': 'KR', 'GMP': 'KR', 'PUS': 'KR',
  'AKL': 'NZ', 'WLG': 'NZ', 'CHC': 'NZ',
  'EZE': 'AR', 'AEP': 'AR',
  'SCL': 'CL',
  'BOG': 'CO',
  'PTY': 'PA',
  'DUB': 'IE', 'SNN': 'IE',
  'LIS': 'PT', 'OPO': 'PT',
  'ATH': 'GR', 'SKG': 'GR',
  'WAW': 'PL', 'KRK': 'PL',
  'PRG': 'CZ',
  'BUD': 'HU',
  'OTP': 'RO',
  'SOF': 'BG',
  'ZAG': 'HR',
  'CMN': 'MA', 'RAK': 'MA',
  'TUN': 'TN',
  'DSS': 'SN', 'DKR': 'SN',
  'ABJ': 'CI',
  'DLA': 'CM', 'NSI': 'CM',
  'LAD': 'AO',
  'HRE': 'ZW',
  'LUN': 'ZM',
  'GBE': 'BW',
  'MRU': 'MU',
  'SEZ': 'SC',
  'MLE': 'MV',
  'KTM': 'NP',
  'TAS': 'UZ',
  'ALA': 'KZ',
  'GYD': 'AZ',
  'TBS': 'GE',
  'EVN': 'AM',
  'BEG': 'RS',
  'HEL': 'FI',
};

const getCountryCodeFromAirport = (airportCode: string): string | null => {
  if (!airportCode) return null;
  const normalizedCode = airportCode.toUpperCase().trim();
  const match = normalizedCode.match(/\b([A-Z]{3})\b/);
  const code = match ? match[1] : normalizedCode.substring(0, 3);
  return AIRPORT_COUNTRY_MAP[code] || null;
};

const isDomesticFlight = (origin: string, destination: string): boolean => {
  if (!origin || !destination) return false;
  
  const originCountry = getCountryCodeFromAirport(origin);
  const destinationCountry = getCountryCodeFromAirport(destination);
  
  if (originCountry && destinationCountry) {
    return originCountry === destinationCountry;
  }
  
  const normalizedOrigin = origin?.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
  const normalizedDest = destination?.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
  
  return !!normalizedOrigin && !!normalizedDest && normalizedOrigin === normalizedDest;
};

const isNorthAmericanDestination = (item: ExtendedSearchResult, searchParams: SearchParams | null): boolean => {
  
  const destination = 
    item.destination || 
    item.arrivalAirport || 
    item.arrivalCity ||
    searchParams?.segments?.[0]?.to ||
    searchParams?.destination ||
    searchParams?.location ||
    '';
  
  // Extract 3-letter airport code
  const extractCode = (str: string | undefined): string => {
    if (!str) return '';
    // Try to match a 3-letter airport code
    const match = str.match(/\b([A-Z]{3})\b/);
    if (match) return match[1].toUpperCase();
    // If no match, take first 3 characters
    return str.substring(0, 3).toUpperCase();
  };
  
  const destinationCode = extractCode(destination);
  
  // ✅ North America airport codes (US, Canada, Mexico)
  const northAmericanAirports = [
    // USA - Major airports
    'JFK', 'EWR', 'LGA', 'LAX', 'SFO', 'ORD', 'DFW', 'ATL', 'IAH', 'MIA', 
    'BOS', 'SEA', 'DEN', 'PHX', 'DTW', 'MSP', 'CLT', 'PDX', 'SAN', 'LAS',
    'IAD', 'DCA', 'BWI', 'PHL', 'STL', 'MCI', 'IND', 'CMH', 'PIT', 'CLE',
    'MCO', 'TPA', 'FLL', 'PBI', 'RSW', 'JAX', 'BNA', 'MSY', 'SLC', 'ABQ',
    'OKC', 'TUL', 'SAT', 'AUS', 'ELP', 'HNL', 'OGG', 'ANC', 'FAI',
    // Canada
    'YYZ', 'YVR', 'YUL', 'YYC', 'YOW', 'YHZ', 'YEG', 'YQB', 'YWG', 'YXE',
    'YQR', 'YXY', 'YQT', 'YAM', 'YQY', 'YDF', 'YHZ',
    // Mexico
    'MEX', 'CUN', 'GDL', 'MTY', 'PVR', 'SJD', 'BJX', 'QRO', 'VER', 'CZM',
    'TIJ', 'HMO', 'CJS', 'LAP', 'VSA', 'MID', 'TRC', 'CUU', 'AGU', 'MZT'
  ];
  
  // ✅ Check if destination code is in North America
  const isNorthAmerica = northAmericanAirports.includes(destinationCode);
  
  // ✅ Debug logging
  console.log('🔍 North America detection:', {
    destination,
    destinationCode,
    isNorthAmerica,
    searchParams: searchParams?.segments,
  });
  
  return isNorthAmerica;
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

  const extBooking = createdBooking as ExtendedBooking | null;

  console.log('🟡 ReviewTrip - Received item:', {
    id: item?.id,
    title: item?.title,
    type: item?.type,
    provider: (item as any)?.provider,
    isWakanow: (item as any)?.isWakanow,
  });

  const [fixedItem, setFixedItem] = useState<SearchResult | null>(null);
  
  useEffect(() => {
    if (!item) {
      setFixedItem(null);
      return;
    }
    
    const extItem = item as ExtendedSearchResult;
    
    console.log('🟡 ReviewTrip - Processing item:', {
      id: extItem.id,
      title: extItem.title,
      totalAmount: extItem.totalAmount,
      selectedRoomType: extItem.selectedRoomType,
      hasSelectedRoomData: !!extItem.selectedRoomData,
      final_amount: extItem.final_amount,
    });
    
    // ✅ ALWAYS use the item directly - it has the correct data from getItemForReview
    setFixedItem(item);
    
    // Log what we're using
    if (extItem.selectedRoomData || extItem.selectedRoomType) {
      console.log('🟡 ReviewTrip - Hotel with selected room detected:', {
        selectedRoomType: extItem.selectedRoomType,
        totalAmount: extItem.totalAmount,
        roomTypeName: extItem.roomTypeName,
      });
    }
    
    if (extItem.basePrice && extItem.totalAmount) {
      console.log('🟡 ReviewTrip - Item has direct price fields from backend:', {
        basePrice: extItem.basePrice,
        markupAmount: extItem.markupAmount,
        totalAmount: extItem.totalAmount,
      });
    }
  }, [item]);

  const actualItem = fixedItem || item;
  
  if (!actualItem) {
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

  const extendedItem = actualItem as ExtendedSearchResult;
const rawType = (actualItem.type || searchParams?.type || 'flights').toLowerCase();

const isAmadeusHotel = (actualItem as any)?.provider?.toLowerCase() === 'amadeus' ||
                       !!(actualItem as any)?.realData?.offerId ||
                       !!(actualItem as any)?.offers?.length ||
                       !!(actualItem as any)?.hotelData?.offerId;

const isWakanowFlight = (actualItem as any)?.provider?.toUpperCase() === 'WAKANOW' ||
                        (actualItem as any)?.isWakanow === true ||
                        (actualItem as any)?.type?.toLowerCase().includes('wakanow') ||
                        !!(actualItem as any)?.selectData ||
                        !!(actualItem as any)?.offer_request_id ||
                        !!(actualItem as any)?.slices ||
                        !!(actualItem as any)?.airlineName ||
                        !!(actualItem as any)?.airlineCode;

// ✅ FIRST: Check if it's a car rental by looking for vehicle data
const hasVehicle = !!(actualItem as any)?.vehicle;
const hasServiceProvider = !!(actualItem as any)?.serviceProvider;
const isCarRental = rawType.includes('car') || 
                    rawType.includes('car-rentals') || 
                    hasVehicle ||
                    hasServiceProvider ||
                    (actualItem as any)?.type === 'car-rentals';

// ✅ SECOND: Check if it's a hotel - ONLY if it has hotel data AND is NOT a car
const hasHotelData = !!(actualItem as any)?.hotelData || 
                     !!(actualItem as any)?.offers?.length ||
                     !!(actualItem as any)?.realData?.offerId ||
                     rawType.includes('hotel');

// ✅ Set isHotel ONLY if it has hotel data and is NOT a car
let isHotel = hasHotelData && !isCarRental;

// ✅ Set isCar based on car detection
let isCar = isCarRental;

// ✅ Wakanow logic - but DON'T override car rentals
if (isWakanowFlight && !isAmadeusHotel) {
  // ✅ ONLY reset isHotel if it's NOT a car
  if (!isCarRental) {
    isHotel = false;
    isCar = false;
  }
}

const isFlight = isWakanowFlight || (!isHotel && !isCar);

console.log('🔍 ReviewTrip - Product type detection:', {
  rawType,
  isHotel,
  isCar,
  isFlight,
  isWakanowFlight,
  isAmadeusHotel,
  hasSelectData: !!(actualItem as any)?.selectData, 
  provider: (actualItem as any)?.provider,
  hasVehicle: !!(actualItem as any)?.vehicle,
  hasServiceProvider: !!(actualItem as any)?.serviceProvider,
  hasHotelData,
  isCarRental,
});


  const firstOffer = extendedItem?.realData?.offers?.[0];
  const isHBXHotel = isHotel && extendedItem.provider?.toLowerCase() === 'hotelbeds';

  const productType = propProductType || (
    isFlight ? 'FLIGHT_INTERNATIONAL' :
      isHotel ? 'HOTEL' :
        'CAR_RENTAL'
  );

  let offerCurrency = extBooking?.currency ||
  firstOffer?.price?.currency ||
  actualItem?.realData?.currency ||
  extendedItem?.currency ||
  currency.code ||
  'GBP';

  const splitName = (user?.name || extBooking?.passengerInfo?.firstName || '').trim().split(/\s+/);
  const defaultFirstName = extBooking?.passengerInfo?.firstName || splitName[0] || '';
  const defaultLastName = extBooking?.passengerInfo?.lastName || splitName.slice(1).join(' ') || '';

  const router = useRouter();

  const [isBooking, setIsBooking] = useState(false);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [email, setEmail] = useState(user?.email || extBooking?.passengerInfo?.email || '');
  const [phone, setPhone] = useState(user?.phone || extBooking?.passengerInfo?.phone || '');
  
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

  const [carPriceBreakdown, setCarPriceBreakdown] = useState<{
  basePrice: number;
  markupAmount: number;
  serviceFee: number;
  totalDue: number;
  markupPercentage: number;
  serviceFeePercentage: number;
  combinedTaxes: number;
  combinedTaxPercentage: number;
} | null>(null);


  const isWakanow = (actualItem as any)?.provider?.toUpperCase() === 'WAKANOW' ||
                    (actualItem as any)?.type?.toLowerCase().includes('wakanow');

  const isDuffel = (actualItem as any)?.provider?.toUpperCase() === 'DUFFEL' ||
                   (actualItem as any)?.type?.toLowerCase().includes('duffel');

  const [convertedPrices, setConvertedPrices] = useState({
    basePrice: 0,
    totalDue: 0,
    combinedTaxes: 0,
    serviceFee: 0,
    currency: currency.code,
  });
  const [isConverting, setIsConverting] = useState(false);

  const originCode = extendedItem.departureAirport || 
                     extendedItem.origin || 
                     searchParams?.segments?.[0]?.from ||
                     '';
                     
  const destinationCode = extendedItem.arrivalAirport || 
                          extendedItem.destination || 
                          searchParams?.segments?.[0]?.to ||
                          '';

  const isDomesticByAirport = originCode && destinationCode && isDomesticFlight(originCode, destinationCode);
  const isDomesticByProduct = (actualItem as any)?.productType === 'FLIGHT_DOMESTIC';
  const isDomesticFlightResult = isDomesticByAirport || isDomesticByProduct;

  const isNorthAmerica = isFlight && isWakanow && isNorthAmericanDestination(extendedItem, searchParams);
  const showPassportSection = isFlight && isWakanow && isNorthAmerica;
  const passportRequired = showPassportSection;
  const requiresPassport = isNorthAmerica;
  const isPassportMandatory = isNorthAmerica;
  const shouldSkipPassport = isDuffel || (isFlight && !isWakanow);
  const isPassportIncompleteForDuffel = false; 

  useEffect(() => {
    if (!extBooking) {
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
        
        const isWakanowFlight = (actualItem as any)?.provider?.toUpperCase() === 'WAKANOW' ||
                                (actualItem as any)?.type?.toLowerCase().includes('wakanow');
        const isDomesticFlight = isDomesticByAirport || isDomesticByProduct;
        const needsPassport = isWakanowFlight && !isDomesticFlight && isFlight;
        
        console.log('👶 Initializing additional passengers with needsPassport:', {
          needsPassport,
          isWakanowFlight,
          isDomesticFlight,
          adults,
          children,
          infants,
        });
        
        for (let i = 0; i < adults - 1; i++) {
          initial.push({ 
            firstName: '', lastName: '', email: '', phone: '', 
            type: 'adult', title: 'mr', gender: 'm', dateOfBirth: '',
            ...(needsPassport && {
              passportNumber: '',
              passportExpiry: '',
              passportIssuingAuthority: '',
              passportIssueCountry: '',
              address: '',
              city: '',
              country: '',
              countryCode: '',
              postalCode: '',
            })
          });
        }
        
        for (let i = 0; i < children; i++) {
          initial.push({ 
            firstName: '', lastName: '', email: '', phone: '', 
            type: 'child', title: 'miss', gender: 'f', dateOfBirth: '',
            ...(needsPassport && {
              passportNumber: '',
              passportExpiry: '',
              passportIssuingAuthority: '',
              passportIssueCountry: '',
              address: '',
              city: '',
              country: '',
              countryCode: '',
              postalCode: '',
            })
          });
        }
        
        for (let i = 0; i < infants; i++) {
          initial.push({ 
            firstName: '', lastName: '', email: '', phone: '', 
            type: 'infant', title: 'miss', gender: 'f', dateOfBirth: '',
            ...(needsPassport && {
              passportNumber: '',
              passportExpiry: '',
              passportIssuingAuthority: '',
              passportIssueCountry: '',
              address: '',
              city: '',
              country: '',
              countryCode: '',
              postalCode: '',
            })
          });
        }
        
        setAdditionalPassengers(initial);
      } else {
        setAdditionalPassengers([]);
      }
    }
  }, [searchParams, extBooking, actualItem, extendedItem, isFlight, isDomesticByAirport, isDomesticByProduct]);

  useEffect(() => {
    if (isHBXHotel && extendedItem?.realData?.rateKey && !extBooking) {
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
  }, [isHBXHotel, extendedItem, extBooking]);

  useEffect(() => {
    if (user) {
      const parts = (user.name || '').trim().split(/\s+/);
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      if (user.dateOfBirth) setDateOfBirth(user.dateOfBirth);
      if (user.gender) setGender(user.gender as 'm' | 'f');
      if ((user as any).title) {
        setTitle((user as any).title as 'mr' | 'ms' | 'mrs' | 'miss' | 'dr');
      }
    }
  }, [user]);

  // ✅ DUFFEL: Skip passport loading
  useEffect(() => {
    if (shouldSkipPassport || extBooking) return;
    
    if (!passportRequired || !isLoggedIn) return;
    
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
  }, [passportRequired, isLoggedIn, extBooking, shouldSkipPassport]);

  useEffect(() => {
    if (extendedItem?.terms_and_conditions?.TermsAndConditions) {
      setDisplayedTerms(extendedItem.terms_and_conditions.TermsAndConditions);
    } else if ((actualItem as any)?.terms_and_conditions?.TermsAndConditions) {
      setDisplayedTerms((actualItem as any).terms_and_conditions.TermsAndConditions);
    }
  }, [extendedItem, actualItem]);

  // ==================== PRICE CALCULATION ====================
  let basePrice = 0;
  let markupAmount = 0;
  let serviceFee = 0;
  let totalDue = 0;
  let markupPercentage = 10;
  let serviceFeePercentage = 5;
  let combinedTaxes = 0;
  let combinedTaxPercentage = 15;
  let breakdownDescription = '';

  // ✅ DUFFEL FLIGHT
  if (isDuffel) {
    console.log('💰 ReviewTrip - Duffel flight detected');
    
    if (extendedItem.totalAmount && extendedItem.totalAmount > 0) {
      totalDue = extendedItem.totalAmount;
      basePrice = extendedItem.basePrice || totalDue / 1.15;
      markupAmount = extendedItem.markupAmount || (totalDue * 0.10);
      serviceFee = extendedItem.serviceFee || (totalDue * 0.05);
      markupPercentage = extendedItem.markupPercentage || 10;
      serviceFeePercentage = extendedItem.serviceFeePercentage || 5;
      breakdownDescription = extendedItem.breakdown || `Total fare: ${extendedItem.currency || 'GBP'} ${totalDue.toFixed(2)}`;
      console.log('💰 ReviewTrip - Duffel: Using totalAmount', { totalDue });
    } else if (extendedItem.final_amount) {
      totalDue = parseFloat(extendedItem.final_amount);
      basePrice = extendedItem.basePrice || totalDue / 1.15;
      markupAmount = extendedItem.markupAmount || (totalDue * 0.10);
      serviceFee = extendedItem.serviceFee || (totalDue * 0.05);
      markupPercentage = extendedItem.markupPercentage || 10;
      serviceFeePercentage = extendedItem.serviceFeePercentage || 5;
      breakdownDescription = extendedItem.breakdown || `Total fare: ${extendedItem.currency || 'GBP'} ${totalDue.toFixed(2)}`;
      console.log('💰 ReviewTrip - Duffel: Using final_amount', { totalDue });
    } else if (extendedItem.final_price) {
      totalDue = parseFloat(extendedItem.final_price);
      basePrice = extendedItem.basePrice || totalDue / 1.15;
      markupAmount = extendedItem.markupAmount || (totalDue * 0.10);
      serviceFee = extendedItem.serviceFee || (totalDue * 0.05);
      markupPercentage = extendedItem.markupPercentage || 10;
      serviceFeePercentage = extendedItem.serviceFeePercentage || 5;
      breakdownDescription = extendedItem.breakdown || `Total fare: ${extendedItem.currency || 'GBP'} ${totalDue.toFixed(2)}`;
      console.log('💰 ReviewTrip - Duffel: Using final_price', { totalDue });
    } else if (extendedItem.price && typeof extendedItem.price === 'string') {
      const parsed = parseFloat(extendedItem.price.replace(/[^0-9.]/g, ''));
      if (parsed > 0) {
        totalDue = parsed;
        basePrice = extendedItem.basePrice || totalDue / 1.15;
        markupAmount = extendedItem.markupAmount || (totalDue * 0.10);
        serviceFee = extendedItem.serviceFee || (totalDue * 0.05);
        markupPercentage = extendedItem.markupPercentage || 10;
        serviceFeePercentage = extendedItem.serviceFeePercentage || 5;
        breakdownDescription = extendedItem.breakdown || `Total fare: ${extendedItem.currency || 'GBP'} ${totalDue.toFixed(2)}`;
        console.log('💰 ReviewTrip - Duffel: Using price string', { totalDue });
      }
    }
    
    if (totalDue === 0 && extendedItem.priceBreakdown) {
      const pb = extendedItem.priceBreakdown;
      totalDue = pb.totalAmount || 0;
      basePrice = pb.basePrice || 0;
      markupAmount = pb.markupAmount || 0;
      serviceFee = pb.serviceFee || 0;
      markupPercentage = pb.markupPercentage || 10;
      serviceFeePercentage = pb.serviceFeePercentage || 5;
      combinedTaxes = pb.taxes || 0;
      combinedTaxPercentage = pb.taxPercentage || 15;
      breakdownDescription = pb.breakdown || '';
      console.log('💰 ReviewTrip - Duffel: Using priceBreakdown', { totalDue, basePrice, markupAmount, serviceFee });
    }
    
    if (totalDue === 0 && extendedItem.calculatedTotal && extendedItem.calculatedTotal > 0) {
      totalDue = extendedItem.calculatedTotal;
      basePrice = extendedItem.calculatedBasePrice || totalDue / 1.15;
      markupAmount = extendedItem.calculatedMarkup || (totalDue * 0.10);
      serviceFee = extendedItem.calculatedServiceFee || (totalDue * 0.05);
      markupPercentage = extendedItem.markup_percentage || 10;
      serviceFeePercentage = extendedItem.service_fee_percentage || 5;
      breakdownDescription = `Total fare: ${extendedItem.currency || 'GBP'} ${totalDue.toFixed(2)}`;
      console.log('💰 ReviewTrip - Duffel: Using calculatedTotal', { totalDue });
    }
    
    if (extendedItem.currency) {
      offerCurrency = extendedItem.currency;
    } else if (extendedItem.priceBreakdown?.currency) {
      offerCurrency = extendedItem.priceBreakdown.currency;
    }
    
    combinedTaxes = markupAmount + serviceFee;
    combinedTaxPercentage = markupPercentage + serviceFeePercentage;
    
    console.log('💰 ReviewTrip - Duffel: Final prices', {
      basePrice,
      markupAmount,
      serviceFee,
      totalDue,
      combinedTaxes,
      combinedTaxPercentage,
      currency: offerCurrency,
      breakdown: breakdownDescription,
    });
  }
  // ✅ WAKANOW FLIGHTS
  else if (isWakanow) {
    console.log('💰 ReviewTrip - Wakanow flight detected', {
      hasWakanowData: !!extendedItem._wakanowData,
      hasPriceBreakdown: !!extendedItem._wakanowData?.priceBreakdown,
      itemBasePrice: extendedItem.basePrice,
      itemTotalAmount: extendedItem.totalAmount,
    });
    
    if (extendedItem._wakanowData?.priceBreakdown) {
      const pb = extendedItem._wakanowData.priceBreakdown;
      basePrice = pb.basePrice || 0;
      markupAmount = pb.markupAmount || 0;
      markupPercentage = pb.markupPercentage || 10;
      serviceFee = pb.serviceFee || 0;
      serviceFeePercentage = pb.serviceFeePercentage || 5;
      combinedTaxes = pb.taxes || 0;
      combinedTaxPercentage = pb.taxPercentage || 15;
      totalDue = pb.totalAmount || 0;
      breakdownDescription = pb.breakdown || '';
      offerCurrency = pb.currency || 'NGN';
      
      console.log('💰 ReviewTrip - Wakanow: Using _wakanowData.priceBreakdown:', {
        basePrice,
        markupAmount,
        serviceFee,
        combinedTaxes,
        totalDue,
      });
    } else if (extendedItem.priceBreakdown) {
      const pb = extendedItem.priceBreakdown;
      basePrice = pb.basePrice || 0;
      markupAmount = pb.markupAmount || 0;
      markupPercentage = pb.markupPercentage || 10;
      serviceFee = pb.serviceFee || 0;
      serviceFeePercentage = pb.serviceFeePercentage || 5;
      combinedTaxes = pb.taxes || 0;
      combinedTaxPercentage = pb.taxPercentage || 15;
      totalDue = pb.totalAmount || 0;
      breakdownDescription = pb.breakdown || '';
      offerCurrency = pb.currency || 'NGN';
      
      console.log('💰 ReviewTrip - Wakanow: Using priceBreakdown:', {
        basePrice,
        markupAmount,
        serviceFee,
        combinedTaxes,
        totalDue,
      });
    } else if (extendedItem.totalAmount && extendedItem.totalAmount > 0) {
      totalDue = extendedItem.totalAmount;
      markupPercentage = extendedItem.markupPercentage || 10;
      serviceFeePercentage = extendedItem.serviceFeePercentage || 5;
      combinedTaxPercentage = extendedItem.taxPercentage || 15;
      
      const totalFactor = 1 + (markupPercentage / 100) + (serviceFeePercentage / 100) + (combinedTaxPercentage / 100);
      basePrice = totalDue / totalFactor;
      markupAmount = (basePrice * markupPercentage) / 100;
      serviceFee = (basePrice * serviceFeePercentage) / 100;
      combinedTaxes = (basePrice * combinedTaxPercentage) / 100;
      offerCurrency = extendedItem.currency || 'NGN';
      
      console.log('💰 ReviewTrip - Wakanow: Calculated from totalAmount:', {
        totalDue,
        basePrice,
        markupAmount,
        serviceFee,
        combinedTaxes,
      });
    } else if (extendedItem.basePrice && extendedItem.basePrice > 0) {
      basePrice = extendedItem.basePrice;
      markupAmount = extendedItem.markupAmount || 0;
      markupPercentage = extendedItem.markupPercentage || 10;
      serviceFee = extendedItem.serviceFee || 0;
      serviceFeePercentage = extendedItem.serviceFeePercentage || 5;
      combinedTaxes = extendedItem.taxes ? parseFloat(extendedItem.taxes as any) : 0;
      combinedTaxPercentage = extendedItem.taxPercentage || 15;
      totalDue = extendedItem.totalAmount || 0;
      breakdownDescription = extendedItem.breakdown || '';
      offerCurrency = extendedItem.currency || 'NGN';
      
      console.log('💰 ReviewTrip - Wakanow: Using direct fields:', {
        basePrice,
        markupAmount,
        serviceFee,
        combinedTaxes,
        totalDue,
      });
    }
  }
// ✅ HOTELS AND CARS - FIXED FOR CARS (WITHOUT priceBreakdown OVERRIDE)
else if (isHotel || isCar) {
  console.log('💰 ReviewTrip - Hotel/Car detected');
  
  const effectiveItem = (item as ExtendedSearchResult) || extendedItem;
  
  console.log('💰 Effective item for hotel/car:', {
    totalAmount: effectiveItem?.totalAmount,
    originalPriceAmount: effectiveItem?.originalPriceAmount,
    final_amount: effectiveItem?.final_amount,
    final_price: effectiveItem?.final_price,
    selectedRoomData: effectiveItem?.selectedRoomData?.type,
    selectedRoomType: effectiveItem?.selectedRoomType,
    roomTypeName: effectiveItem?.roomTypeName,
    sourceTotalAmount: effectiveItem?.totalAmount,
    isCar: isCar,
  });
  
  if (extBooking && extBooking.id && extBooking.totalAmount > 0) {
    basePrice = extBooking.basePrice || 0;
    markupAmount = extBooking.markupAmount || 0;
    serviceFee = extBooking.serviceFee || 0;
    totalDue = extBooking.totalAmount || 0;
    markupPercentage = extBooking.markupPercentage || 10;
    serviceFeePercentage = extBooking.serviceFeePercentage || 5;
    combinedTaxes = extBooking.taxes || markupAmount + serviceFee || 0;
    combinedTaxPercentage = extBooking.taxPercentage || markupPercentage + serviceFeePercentage;
    breakdownDescription = extBooking.breakdown || '';
    console.log('💰 ReviewTrip - Using booking data:', { totalDue, basePrice });
  } else {
    let priceValue = 0;
    
    // ✅ PRIORITY 1: Use totalAmount from effectiveItem (most reliable)
    if (effectiveItem?.totalAmount && effectiveItem.totalAmount > 0) {
      priceValue = effectiveItem.totalAmount;
      console.log('💰 ReviewTrip - Using totalAmount from effectiveItem:', priceValue);
    }
    // ✅ PRIORITY 2: Use originalPriceAmount
    else if (effectiveItem?.originalPriceAmount && effectiveItem.originalPriceAmount > 0) {
      priceValue = effectiveItem.originalPriceAmount;
      console.log('💰 ReviewTrip - Using originalPriceAmount:', priceValue);
    }
    // ✅ PRIORITY 3: Use final_amount
    else if (effectiveItem?.final_amount) {
      priceValue = parseFloat(effectiveItem.final_amount);
      console.log('💰 ReviewTrip - Using final_amount:', priceValue);
    }
    // ✅ PRIORITY 4: Use final_price
    else if (effectiveItem?.final_price) {
      priceValue = typeof effectiveItem.final_price === 'string' 
        ? parseFloat(effectiveItem.final_price) 
        : effectiveItem.final_price;
      console.log('💰 ReviewTrip - Using final_price:', priceValue);
    }
    // ✅ PRIORITY 5: Use price string
    else if (effectiveItem?.price) {
      priceValue = typeof effectiveItem.price === 'string' 
        ? parseFloat(effectiveItem.price.replace(/[^0-9.]/g, '')) 
        : effectiveItem.price;
      console.log('💰 ReviewTrip - Using price:', priceValue);
    }
    
    // ✅ Get markup and service fee percentages from item
    const markupPercent = effectiveItem?.markup_percentage || effectiveItem?.markupPercentage || 10;
    const serviceFeePercent = effectiveItem?.service_fee_percentage || effectiveItem?.serviceFeePercentage || 5;
    const taxPercent = effectiveItem?.taxPercentage || 15;
    
    // ✅ Set the percentages
    markupPercentage = markupPercent;
    serviceFeePercentage = serviceFeePercent;
    combinedTaxPercentage = taxPercent;
    
    // ✅ Calculate base price from total
    const totalFactor = 1 + (markupPercentage / 100) + (serviceFeePercentage / 100) + (combinedTaxPercentage / 100);
    basePrice = priceValue / totalFactor;
    markupAmount = (basePrice * markupPercentage) / 100;
    serviceFee = (basePrice * serviceFeePercentage) / 100;
    combinedTaxes = (basePrice * combinedTaxPercentage) / 100;
    
    // ✅ CRITICAL FIX: totalDue MUST be the sum of all components
    totalDue = basePrice + markupAmount + serviceFee + combinedTaxes;
    
    // ✅ Get currency from the effective item
    if (effectiveItem?.currency) {
      offerCurrency = effectiveItem.currency;
    } else if (effectiveItem?.originalPriceCurrency) {
      offerCurrency = effectiveItem.originalPriceCurrency;
    } else if (effectiveItem?.selectedCurrency) {
      offerCurrency = effectiveItem.selectedCurrency;
    }
    
    // ❌ REMOVE THIS BLOCK - It's overriding your calculation with incorrect values!
    // if (effectiveItem?.priceBreakdown) {
    //   const pb = effectiveItem.priceBreakdown;
    //   basePrice = pb.basePrice || basePrice;
    //   markupAmount = pb.markupAmount || markupAmount;
    //   markupPercentage = pb.markupPercentage || markupPercentage;
    //   serviceFee = pb.serviceFee || serviceFee;
    //   serviceFeePercentage = pb.serviceFeePercentage || serviceFeePercentage;
    //   combinedTaxes = pb.taxes || combinedTaxes;
    //   combinedTaxPercentage = pb.taxPercentage || combinedTaxPercentage;
    //   totalDue = pb.totalAmount || totalDue;  // ❌ This is setting totalDue to 175682!
    //   offerCurrency = pb.currency || offerCurrency;
    //   breakdownDescription = pb.breakdown || breakdownDescription;
    // }
    
    console.log('💰 ReviewTrip - Final car/hotel price (WITHOUT priceBreakdown override):', { 
      basePrice, 
      markupAmount, 
      markupPercentage, 
      serviceFee, 
      serviceFeePercentage,
      combinedTaxes,
      combinedTaxPercentage,
      totalDue,  // ✅ Now correctly calculated as the sum
      currency: offerCurrency,
      isCar,
    });
    
    // ✅ Store car breakdown for later use
    if (isCar && !carPriceBreakdown) {
      setCarPriceBreakdown({
        basePrice,
        markupAmount,
        serviceFee,
        totalDue,  // ✅ Now correctly set to the sum
        markupPercentage,
        serviceFeePercentage,
        combinedTaxes,
        combinedTaxPercentage,
      });
    }
  }
}


// ✅ Price conversion effect - FIXED FOR CARS
useEffect(() => {
  const convertPrices = async () => {
    const userCurrency = currency.code;
    const originalCurrency = offerCurrency || 'GBP';
    
    console.log('💰 Converting prices:', {
      isCar,
      carPriceBreakdown,
      totalDue,
      basePrice,
      serviceFee,
      markupAmount,
      combinedTaxes,
      originalCurrency,
      userCurrency,
    });
    
    // ✅ For cars: Use the stored breakdown
    if (isCar && carPriceBreakdown) {
      const { basePrice: bp, serviceFee: sf, combinedTaxes: ct, totalDue: td } = carPriceBreakdown;
      
      // If no price or same currency
      if (td <= 0) {
        setConvertedPrices({
          basePrice: 0,
          totalDue: 0,
          combinedTaxes: 0,
          serviceFee: 0,
          currency: userCurrency,
        });
        return;
      }
      
      // ✅ If same currency, use the values directly
      if (userCurrency === originalCurrency) {
        setConvertedPrices({
          basePrice: bp,
          totalDue: td,
          combinedTaxes: ct,  // ✅ This should be set
          serviceFee: sf,
          currency: userCurrency,
        });
        return;
      }
      
      setIsConverting(true);
      try {
        console.log('💰 Converting car prices from', originalCurrency, 'to', userCurrency);
        
        const [convertedBase, convertedService, convertedTaxes, convertedTotal] = await Promise.all([
          convertPrice(bp, originalCurrency),
          convertPrice(sf, originalCurrency),
          convertPrice(ct, originalCurrency),  // ✅ Convert combinedTaxes
          convertPrice(td, originalCurrency),
        ]);
        
        setConvertedPrices({
          basePrice: convertedBase || bp,
          totalDue: convertedTotal || td,
          combinedTaxes: convertedTaxes || ct,  // ✅ Set combinedTaxes
          serviceFee: convertedService || sf,
          currency: userCurrency,
        });
        
        console.log('✅ Car prices converted to', userCurrency);
      } catch (error) {
        console.error('Failed to convert car prices:', error);
        setConvertedPrices({
          basePrice: bp,
          totalDue: td,
          combinedTaxes: ct,  // ✅ Set combinedTaxes
          serviceFee: sf,
          currency: originalCurrency,
        });
      } finally {
        setIsConverting(false);
      }
      return;
    }
    
    // ✅ For flights and hotels
    if (totalDue <= 0) return;
    
    if (userCurrency === originalCurrency) {
      setConvertedPrices({
        basePrice: basePrice,
        totalDue: totalDue,
        combinedTaxes: combinedTaxes,
        serviceFee: serviceFee,
        currency: userCurrency,
      });
      return;
    }
    
    setIsConverting(true);
    try {
      console.log('💰 Converting prices from', originalCurrency, 'to', userCurrency);
      
      const [convertedBase, convertedTotal, convertedTaxes, convertedService] = await Promise.all([
        convertPrice(basePrice, originalCurrency),
        convertPrice(totalDue, originalCurrency),
        convertPrice(combinedTaxes, originalCurrency),
        convertPrice(serviceFee, originalCurrency),
      ]);
      
      setConvertedPrices({
        basePrice: convertedBase || basePrice,
        totalDue: convertedTotal || totalDue,
        combinedTaxes: convertedTaxes || combinedTaxes,
        serviceFee: convertedService || serviceFee,
        currency: userCurrency,
      });
      
      console.log('✅ Prices converted to', userCurrency);
    } catch (error) {
      console.error('Failed to convert prices:', error);
      setConvertedPrices({
        basePrice: basePrice,
        totalDue: totalDue,
        combinedTaxes: combinedTaxes,
        serviceFee: serviceFee,
        currency: originalCurrency,
      });
    } finally {
      setIsConverting(false);
    }
  };
  
  convertPrices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [basePrice, totalDue, combinedTaxes, serviceFee, offerCurrency, currency.code, isCar, carPriceBreakdown]);


  const displayCurrency = convertedPrices.currency || currency.code || 'GBP';
  const displayBasePrice = formatPrice(convertedPrices.basePrice, displayCurrency);
  const displayCombinedTaxes = formatPrice(convertedPrices.combinedTaxes, displayCurrency);
  const displayTotalDue = formatPrice(convertedPrices.totalDue, displayCurrency);
  const displayServiceFee = formatPrice(convertedPrices.serviceFee, displayCurrency);
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

  // ✅ DUFFEL: Skip passport validation
  const validatePassport = (): boolean => {
    if (shouldSkipPassport) return true;
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

  const validateAllPassengers = (): boolean => {
    const skipPassportValidation = shouldSkipPassport;
    
    for (let i = 0; i < additionalPassengers.length; i++) {
      const p = additionalPassengers[i];
      const passengerType = p.type || 'adult';
      const label = `${passengerType.toUpperCase()} #${i + 1}`;
      
      if (!p.firstName || !p.firstName.trim()) {
        alert(`${label}: First name is required.`);
        return false;
      }
      if (!p.lastName || !p.lastName.trim()) {
        alert(`${label}: Last name is required.`);
        return false;
      }

      if (isFlight) {
        if (!p.title) {
          alert(`${label}: Title is required.`);
          return false;
        }
        if (!p.gender) {
          alert(`${label}: Gender is required.`);
          return false;
        }
        if (!p.dateOfBirth) {
          alert(`${label}: Date of Birth is required.`);
          return false;
        }
        
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(p.dateOfBirth)) {
          alert(`${label}: Date of birth must be in YYYY-MM-DD format.`);
          return false;
        }

        const dob = new Date(p.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 2) {
          alert(`${label}: Passenger must be at least 2 years old for flight bookings.`);
          return false;
        }

        if (!skipPassportValidation && isWakanow && !isDomesticFlightResult) {
          if (!p.passportNumber || !p.passportNumber.trim()) {
            alert(`${label}: Passport number is required for flights to North America.`);
            return false;
          }
          if (!p.passportExpiry) {
            alert(`${label}: Passport expiry date is required for flights to North America.`);
            return false;
          }
          if (!p.passportIssuingAuthority || !p.passportIssuingAuthority.trim()) {
            alert(`${label}: Passport issuing authority is required for flights to North America.`);
            return false;
          }
        }
      }
    }
    return true;
  };

  // ==================== HANDLE COMPLETE BOOKING ====================
  const handleCompleteBooking = async () => {
    console.log('🔍🔍🔍 CRITICAL DEBUG - Passport State Values:', {
      passportNumber: passportNumber || '(empty)',
      passportExpiry: passportExpiry || '(empty)',
      passportIssuingAuthority: passportIssuingAuthority || '(empty)',
      passportIssueCountry: passportIssueCountry || '(empty)',
      isWakanowFlight: (actualItem as any)?.provider?.toUpperCase() === 'WAKANOW',
      isNorthAmerica: isNorthAmericanDestination(extendedItem, searchParams),
      isDomestic: isDomesticByAirport || isDomesticByProduct,
    });

    if (isBooking || isCreating) return;

    if (!firstName || !firstName.trim()) {
      alert('First name is required.');
      return;
    }
    if (!lastName || !lastName.trim()) {
      alert('Last name is required.');
      return;
    }
    if (!email || !email.trim()) {
      alert('Email is required.');
      return;
    }
    if (!phone || !phone.trim()) {
      alert('Phone number is required.');
      return;
    }

    if (isCar && !agreedToPolicy) {
    alert('Please agree to the Rental Terms & Conditions and Cancellation Policy to continue.');
    return;
  }

    if (isFlight) {
      console.log('🔍 BEFORE VALIDATION - Form values:', {
        title: title,
        gender: gender,
        dateOfBirth: dateOfBirth,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
      });
  
      if (!title) {
        alert('Title is required for flight bookings. Please select your title.');
        return;
      }
  
      if (!gender) {
        alert('Gender is required for flight bookings. Please select your gender.');
        return;
      }
  
      if (!dateOfBirth) {
        alert('Date of birth is required for flight bookings. Please enter your date of birth.');
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

      const isWakanowFlight = (actualItem as any)?.provider?.toUpperCase() === 'WAKANOW' ||
                              (actualItem as any)?.type?.toLowerCase().includes('wakanow');
      const isDomesticFlight = isDomesticByAirport || isDomesticByProduct;
      const isInternational = isWakanowFlight && !isDomesticFlight;
      
      if (!shouldSkipPassport && isFlight && isInternational) {
        if (!passportNumber || !passportNumber.trim()) {
          alert('Passport number is required for international flights.\n\nPlease provide:\n- Passport Number');
          return;
        }
        
        const passportRegex = /^[A-Za-z][0-9]{7,8}$|^[A-Za-z0-9]{6,9}$/;
        if (!passportRegex.test(passportNumber)) {
          alert('Please enter a valid passport number (e.g., A12345678)');
          return;
        }
        
        if (!passportExpiry) {
          alert('Passport expiry date is required for international flights.');
          return;
        }
        
        const expiryDate = new Date(passportExpiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate < today) {
          alert('Your passport has expired. Please renew your passport.');
          return;
        }
        
        if (!passportIssuingAuthority || !passportIssuingAuthority.trim()) {
          alert('Passport Issuing Authority is required for international flights.');
          return;
        }
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

    if (!validateAllPassengers()) {
      return;
    }

    setIsBooking(true);
    try {
      let passengerInfo: PassengerInfo;

      if (isHotel || isCar) {
        passengerInfo = {
          firstName,
          lastName,
          email,
          phone,
        };
      } else {
        passengerInfo = {
          firstName,
          lastName,
          email,
          phone,
          type: 'adult',
          title: title as 'mr' | 'ms' | 'mrs' | 'miss' | 'dr',
          gender: gender as 'm' | 'f',
          dateOfBirth: dateOfBirth,
          address: passportAddress || "221B Baker Street",
          city: passportCity || "London",
          country: passportCountry || "United Kingdom", 
          countryCode: passportCountryCode || "GB",
          postalCode: passportPostalCode || "NW1 6XE",
        };
        
        const isWakanowFlight = (actualItem as any)?.provider?.toUpperCase() === 'WAKANOW' ||
                                (actualItem as any)?.type?.toLowerCase().includes('wakanow');
        
        const isDomesticFlight = isDomesticByAirport || isDomesticByProduct;
        const needsPassport = isWakanowFlight && !isDomesticFlight;
        
        console.log('🔍 Passport condition check in handleCompleteBooking:', {
          isWakanowFlight,
          isDomesticFlight,
          needsPassport,
          passportNumber,
          passportExpiry,
          passportIssuingAuthority,
        });
        
        if (needsPassport) {
          (passengerInfo as any).PassportNumber = passportNumber;
          (passengerInfo as any).ExpiryDate = passportExpiry;
          (passengerInfo as any).PassportIssuingAuthority = passportIssuingAuthority;
          (passengerInfo as any).PassportIssueCountryCode = passportIssueCountry || 'Nigeria';
          
          (passengerInfo as any).passportNumber = passportNumber;
          (passengerInfo as any).passportExpiry = passportExpiry;
          (passengerInfo as any).passportIssuingAuthority = passportIssuingAuthority;
          (passengerInfo as any).passportIssueCountry = passportIssueCountry || 'Nigeria';
          
          console.log('📄 Adding passport fields to lead passenger:', {
            PassportNumber: (passengerInfo as any).PassportNumber,
            ExpiryDate: (passengerInfo as any).ExpiryDate,
            PassportIssuingAuthority: (passengerInfo as any).PassportIssuingAuthority,
            PassportIssueCountryCode: (passengerInfo as any).PassportIssueCountryCode,
          });
        }
      }
      
      if (additionalPassengers.length > 0) {
        const isWakanowFlightForTravellers = (actualItem as any)?.provider?.toUpperCase() === 'WAKANOW' ||
                                             (actualItem as any)?.type?.toLowerCase().includes('wakanow');
        const isDomesticFlightForTravellers = isDomesticByAirport || isDomesticByProduct;
        const needsPassportForTraveller = isWakanowFlightForTravellers && !isDomesticFlightForTravellers;
        
        const travellers = additionalPassengers.map((p) => {
          let passengerType = 'Adult';
          const typeLower = (p.type || 'adult').toLowerCase();
          if (typeLower === 'child') {
            passengerType = 'Child';
          } else if (typeLower === 'infant') {
            passengerType = 'Infant';
          }
          
          let dateOfBirth = p.dateOfBirth || '';
          if (!dateOfBirth) {
            const today = new Date();
            let yearOffset = 0;
            if (passengerType === 'Child') {
              yearOffset = 8;
            } else if (passengerType === 'Infant') {
              yearOffset = 1;
            }
            if (yearOffset > 0) {
              const defaultDate = new Date(today);
              defaultDate.setFullYear(today.getFullYear() - yearOffset);
              defaultDate.setMonth(6);
              defaultDate.setDate(15);
              dateOfBirth = defaultDate.toISOString().split('T')[0];
            }
          }
          
          const traveller: any = {
            PassengerType: passengerType,
            FirstName: p.firstName || '',
            LastName: p.lastName || '',
            DateOfBirth: dateOfBirth,
            PhoneNumber: p.phone || phone,
            Email: p.email || email,
            Gender: p.gender === 'f' ? 'Female' : 'Male',
            Title: p.title || 'Mr',
            Address: p.address || passportAddress || '123 Fake Street',
            Country: p.country || passportCountry || 'Nigeria',
            CountryCode: p.countryCode || passportCountryCode || 'NG',
            City: p.city || passportCity || 'Lagos',
            PostalCode: p.postalCode || passportPostalCode || '100001',
          };
          
          if (needsPassportForTraveller) {
            traveller.PassportNumber = p.passportNumber || '';
            traveller.ExpiryDate = p.passportExpiry || '';
            traveller.PassportIssuingAuthority = p.passportIssuingAuthority || '';
            traveller.PassportIssueCountryCode = p.passportIssueCountry || 'NG';
            
            traveller.passportNumber = p.passportNumber || '';
            traveller.passportExpiry = p.passportExpiry || '';
            traveller.passportIssuingAuthority = p.passportIssuingAuthority || '';
            traveller.passportIssueCountry = p.passportIssueCountry || 'NG';
          }
          
          return traveller;
        });
        
        (passengerInfo as any).additionalPassengers = additionalPassengers;
        (passengerInfo as any).travellers = travellers;
        
        console.log('👤 Attached additional passengers:', {
          additionalCount: additionalPassengers.length,
          travellersCount: travellers.length,
        });
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
          currency: (firstOfferData?.price?.currency || actualItem.currency || 'GBP').toUpperCase(),
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

      console.log('👥 Sending to payment with passengers:', {
        provider: isDuffel ? 'DUFFEL' : isWakanow ? 'WAKANOW' : 'OTHER',
        lead: `${firstName} ${lastName}`,
        additionalCount: (passengerInfo as any).additionalPassengers?.length || 0,
        travellersCount: (passengerInfo as any).travellers?.length || 0,
      });
      console.log('🛫 FINAL passengerInfo BEFORE sending to onProceedToPayment:', {
        passengerInfo,
        hasAdditionalPassengers: !!(passengerInfo as any).additionalPassengers?.length,
        hasTravellers: !!(passengerInfo as any).travellers?.length,
        travellersCount: (passengerInfo as any).travellers?.length || 0,
        PassportNumber: (passengerInfo as any).PassportNumber,
      });

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
  const bookingReference = extBooking?.reference;

  if (isLoadingRates && !extBooking) {
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
          {extBooking ? 'Complete your payment' : 'Complete your booking'}
        </h1>
  
        <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Prices displayed in {currency.code} ({currency.symbol}) using live exchange rates
          </p>
        </div>
  
        {/* ✅ ADD CUSTOM MESSAGES HERE - RIGHT AFTER PRICE DISCLAIMER */}
        {isWakanow && extendedItem?.custom_messages && extendedItem.custom_messages.length > 0 && (
          <div className="space-y-3 mb-6">
            {extendedItem.custom_messages.map((msg: { Title: string; Message: string; SeverityLevel: 'High' | 'Medium' | 'Low' }, index: number) => {
              const severityColors = {
                High: 'bg-red-50 border-red-200 text-red-800',
                Medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                Low: 'bg-blue-50 border-blue-200 text-blue-800',
              };
              const iconColors = {
                High: 'text-red-500',
                Medium: 'text-yellow-500',
                Low: 'text-blue-500',
              };
              
              return (
                <div 
                  key={index} 
                  className={`p-4 rounded-xl border ${severityColors[msg.SeverityLevel as keyof typeof severityColors] || severityColors.Medium}`}
                >
                  <div className="flex items-start gap-3">
                    <svg 
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[msg.SeverityLevel as keyof typeof iconColors] || iconColors.Medium}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      {msg.SeverityLevel === 'High' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${
                        msg.SeverityLevel === 'High' ? 'text-red-800' : 
                        msg.SeverityLevel === 'Medium' ? 'text-yellow-800' : 
                        'text-blue-800'
                      }`}>
                        {msg.Title}
                      </p>
                      <p 
                        className="text-sm mt-0.5"
                        dangerouslySetInnerHTML={{ __html: msg.Message }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
  
        {isPassportMandatory && !extBooking && !shouldSkipPassport && (
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
  
        {passportRequired && isLoggedIn && isPassportIncomplete && !extBooking && !requiresPassport && !shouldSkipPassport && (
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
            {/* ========== YOUR DETAILS ========== */}
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
                {isFlight && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={title}
                      onChange={(e) => {
                        console.log('🔄 Title changed to:', e.target.value);
                        setTitle(e.target.value as 'mr' | 'ms' | 'mrs' | 'miss' | 'dr');
                      }}
                      className={inputCls}
                      disabled={!!extBooking}
                      required
                    >
                      <option value="">Select Title</option>
                      <option value="mr">Mr</option>
                      <option value="ms">Ms</option>
                      <option value="mrs">Mrs</option>
                      <option value="miss">Miss</option>
                      <option value="dr">Dr</option>
                    </select>
                  </div>
                )}
  
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                    className={inputCls} 
                    placeholder="John" 
                    readOnly={!!extBooking} 
                    required
                  />
                </div>
  
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Last name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                    className={inputCls} 
                    placeholder="Doe" 
                    readOnly={!!extBooking} 
                    required
                  />
                </div>
  
                {isFlight && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'm' | 'f')}
                      className={inputCls}
                      disabled={!!extBooking}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="m">Male</option>
                      <option value="f">Female</option>
                    </select>
                  </div>
                )}
  
                {isFlight && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => {
                        console.log('🔄 Date of Birth changed to:', e.target.value);
                        setDateOfBirth(e.target.value);
                      }}
                      className={inputCls}
                      readOnly={!!extBooking}
                      required
                    />
                  </div>
                )}
  
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className={inputCls} 
                    placeholder="john@example.com" 
                    readOnly={!!extBooking} 
                    required
                  />
                </div>
  
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className={inputCls} 
                    placeholder="+44 7911 123456" 
                    readOnly={!!extBooking} 
                    required
                  />
                </div>
              </div>
            </div>
  
            {/* ========== PASSPORT FIELDS - WAKANOW INTERNATIONAL FLIGHTS ========== */}
            {isFlight && isWakanow && !isDomesticFlightResult && !extBooking && !shouldSkipPassport && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-md font-semibold text-gray-900 mb-3">
                  Passport Details <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Passport details are required for international flights.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Passport Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      className={inputCls}
                      placeholder="A12345678"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Passport Expiry <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={passportExpiry}
                      onChange={(e) => setPassportExpiry(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Passport Issuing Authority <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={passportIssuingAuthority}
                      onChange={(e) => setPassportIssuingAuthority(e.target.value)}
                      className={inputCls}
                      placeholder="e.g., Nigerian Immigration Service"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Passport Issue Country
                    </label>
                    <input
                      type="text"
                      value={passportIssueCountry}
                      onChange={(e) => setPassportIssueCountry(e.target.value)}
                      className={inputCls}
                      placeholder="Nigeria"
                    />
                  </div>
                </div>
              </div>
            )}
  
            {/* ✅ DUFFEL: Show message that passport not required */}
            {isDuffel && isFlight && !extBooking && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
                <h3 className="text-md font-semibold text-gray-900 mb-2">Passport Details</h3>
                <p className="text-sm text-gray-500">
                  Passport details are not required for this bookings. You can proceed without providing passport information.
                </p>
              </div>
            )}
  
            {/* ========== ADDITIONAL PASSENGERS ========== */}
            {additionalPassengers.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-md font-semibold text-gray-900 mb-4">
                  Additional Passengers ({additionalPassengers.length})
                </h3>
                
                {additionalPassengers.map((p, index) => {
                  const passengerType = p.type || 'adult';
                  const label = `${passengerType.toUpperCase()} #${index + 1}`;
                  
                  // ✅ Check if passport is required for this passenger
                  const showPassport = isFlight && isWakanow && !isDomesticFlightResult && !shouldSkipPassport;
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded-xl p-4 mb-4 last:mb-0">
                      <h4 className="font-semibold text-gray-800 mb-3">{label}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={p.firstName || ''}
                            onChange={(e) => {
                              const updated = [...additionalPassengers];
                              updated[index].firstName = e.target.value;
                              setAdditionalPassengers(updated);
                            }}
                            className={inputCls}
                            placeholder="John"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={p.lastName || ''}
                            onChange={(e) => {
                              const updated = [...additionalPassengers];
                              updated[index].lastName = e.target.value;
                              setAdditionalPassengers(updated);
                            }}
                            className={inputCls}
                            placeholder="Doe"
                            required
                          />
                        </div>
                        
                        {isFlight && (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Title <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={p.title || 'mr'}
                                onChange={(e) => {
                                  const updated = [...additionalPassengers];
                                  updated[index].title = e.target.value as any;
                                  setAdditionalPassengers(updated);
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
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Gender <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={p.gender || 'm'}
                                onChange={(e) => {
                                  const updated = [...additionalPassengers];
                                  updated[index].gender = e.target.value as any;
                                  setAdditionalPassengers(updated);
                                }}
                                className={inputCls}
                                required
                              >
                                <option value="m">Male</option>
                                <option value="f">Female</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Date of Birth <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                value={p.dateOfBirth || ''}
                                onChange={(e) => {
                                  const updated = [...additionalPassengers];
                                  updated[index].dateOfBirth = e.target.value;
                                  setAdditionalPassengers(updated);
                                }}
                                className={inputCls}
                                required
                              />
                            </div>
                          </>
                        )}
                      </div>
  
                      {/* ✅ PASSPORT FIELDS FOR ADDITIONAL PASSENGERS */}
                      {showPassport && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">
                            Passport Details for {p.firstName || 'Passenger'}
                            <span className="text-red-500 ml-1">*</span>
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Passport Number <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={p.passportNumber || ''}
                                onChange={(e) => {
                                  const updated = [...additionalPassengers];
                                  updated[index].passportNumber = e.target.value;
                                  setAdditionalPassengers(updated);
                                }}
                                className={inputCls}
                                placeholder="A12345678"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Passport Expiry <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                value={p.passportExpiry || ''}
                                onChange={(e) => {
                                  const updated = [...additionalPassengers];
                                  updated[index].passportExpiry = e.target.value;
                                  setAdditionalPassengers(updated);
                                }}
                                className={inputCls}
                                required
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Passport Issuing Authority <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={p.passportIssuingAuthority || ''}
                                onChange={(e) => {
                                  const updated = [...additionalPassengers];
                                  updated[index].passportIssuingAuthority = e.target.value;
                                  setAdditionalPassengers(updated);
                                }}
                                className={inputCls}
                                placeholder="e.g., Nigerian Immigration Service"
                                required
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Passport Issue Country
                              </label>
                              <input
                                type="text"
                                value={p.passportIssueCountry || ''}
                                onChange={(e) => {
                                  const updated = [...additionalPassengers];
                                  updated[index].passportIssueCountry = e.target.value;
                                  setAdditionalPassengers(updated);
                                }}
                                className={inputCls}
                                placeholder="Nigeria"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
  
           {/* ========== TRIP SUMMARY ========== */}
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
      <h3 className="font-semibold text-gray-900">{actualItem.title}</h3>
      <p className="text-sm text-gray-500">{actualItem.subtitle}</p>
      <p className="text-xs text-gray-400 mt-1">{actualItem.provider}</p>
    </div>
  </div>

  {/* ✅ CAR RENTAL DETAILS */}
  {isCar && (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h3 className="text-md font-semibold text-gray-900 mb-3">Vehicle Details</h3>
      
      {/* Vehicle Specs - Compact Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">Category</p>
          <p className="text-sm font-medium text-gray-900">
            {extendedItem.vehicle?.category === 'ST' ? 'Standard' : 
             extendedItem.vehicle?.category === 'BU' ? 'Business' : 
             extendedItem.vehicle?.category === 'FC' ? 'First Class' : 
             extendedItem.vehicle?.category || 'Standard'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">Seats</p>
          <p className="text-sm font-medium text-gray-900">
            {extendedItem.vehicle?.seats?.[0]?.count || 'N/A'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">Baggage</p>
          <p className="text-sm font-medium text-gray-900">
            {extendedItem.vehicle?.baggages?.[0]?.count || 'N/A'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">Provider</p>
          <p className="text-sm font-medium text-gray-900">
            {extendedItem.serviceProvider?.name || extendedItem.provider || 'N/A'}
          </p>
        </div>
      </div>
      
      {/* Pickup & Dropoff - Compact */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[10px] text-gray-500">Pickup</p>
          <p className="text-sm font-medium text-gray-900">
            {extendedItem.start?.locationCode || 'N/A'}
          </p>
          <p className="text-[10px] text-gray-400">
            {extendedItem.start?.dateTime ? new Date(extendedItem.start.dateTime).toLocaleString() : ''}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[10px] text-gray-500">Dropoff</p>
          <p className="text-sm font-medium text-gray-900">
            {extendedItem.end?.locationCode || 'N/A'}
          </p>
          <p className="text-[10px] text-gray-400">
            {extendedItem.end?.dateTime ? new Date(extendedItem.end.dateTime).toLocaleString() : ''}
          </p>
        </div>
      </div>
      
      {/* ✅ CANCELLATION POLICY - FULL DETAILS */}
      {extendedItem.cancellationRules && extendedItem.cancellationRules.length > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Cancellation Policy</h4>
          <div className="space-y-2">
            {extendedItem.cancellationRules.map((rule: {
              ruleDescription: string;
              feeType?: string;
              feeValue?: string;
              metricType?: string;
              metricMin?: string;
              metricMax?: string;
            }, idx: number) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">{rule.ruleDescription}</p>
                {rule.feeType && (
                  <p className="text-xs text-gray-500 mt-1">
                    {rule.feeValue === '0' || (rule.feeValue === '0%') ? (
                      <span className="text-green-600 font-medium">✓ Free cancellation</span>
                    ) : (
                      <span>Fee: {rule.feeValue}% {rule.feeType} 
                        {rule.metricMin && rule.metricMax && ` (${rule.metricMin} - ${rule.metricMax} ${rule.metricType})`}
                        {rule.metricMin && !rule.metricMax && ` (${rule.metricMin}+ ${rule.metricType})`}
                      </span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      
{/* Car Rental Agreement Checkbox */}
<div className="mt-3 flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
  <input
    type="checkbox"
    id="carRentalPolicy"
    checked={agreedToPolicy}  // ✅ This should be linked
    onChange={(e) => setAgreedToPolicy(e.target.checked)}  // ✅ This updates the state
    className="mt-0.5 w-4 h-4 text-[#33a8da] border-gray-300 rounded focus:ring-[#33a8da]"
    required
    disabled={!!extBooking}
  />
  <label htmlFor="carRentalPolicy" className="text-xs text-gray-700">
    I have read and agree to the <span className="font-semibold">Rental Terms & Conditions</span> and 
    <span className="font-semibold"> Cancellation Policy</span>.
  </label>
</div>
    </div>
  )}

  {/* ✅ HOTEL CANCELLATION POLICY - ONLY FOR HOTELS */}
  {isHotel && (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <h3 className="text-md font-semibold text-gray-900 mb-3">Cancellation Policy</h3>
      <div className="space-y-3">
        {(actualItem as any)?.cancellationPolicy ? (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed">
              {(actualItem as any).cancellationPolicy}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Please review the cancellation policy carefully.</p>
        )}
        
        {(actualItem as any)?.policies && (actualItem as any).policies.length > 0 && (
          <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-800 mb-2">Additional Policies:</p>
            <ul className="space-y-1">
              {(actualItem as any).policies.map((policy: any, idx: number) => (
                <li key={idx} className="text-xs text-blue-700">
                  • {policy.type?.replace(/_/g, ' ')}: {policy.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex items-start gap-2 mt-4 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="cancellationPolicy"
            checked={agreedToPolicy}
            onChange={(e) => setAgreedToPolicy(e.target.checked)}
            className="mt-1 w-4 h-4 text-[#33a8da] border-gray-300 rounded focus:ring-[#33a8da]"
            required
            disabled={!!extBooking}
          />
          <label htmlFor="cancellationPolicy" className="text-sm text-gray-700">
            I have read and agree to the cancellation policy.
          </label>
        </div>
      </div>
    </div>
  )}

  {/* ✅ TERMS & CONDITIONS - ONLY FOR FLIGHTS */}
  {displayedTerms.length > 0 && !extBooking && isFlight && (
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
    </div>
  )}
</div>
          </div>
  
{/* ========== PRICE SIDEBAR ========== */}
<aside className="w-full lg:w-[380px]">
  <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-gray-100">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Price details</h3>

    <div className="mb-4 text-xs text-gray-500 flex items-center gap-1">
      <span> All prices in {currency.code} ({currency.symbol})</span>
    </div>

    <div className="space-y-3 mb-6">
      {/* Base Price */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500">
          {isCar ? 'Base Rate' : isFlight ? 'Base Fare' : 'Base Price'}
        </span>
        <span className="text-sm font-semibold text-gray-900">{displayBasePrice}</span>
      </div>

 {/* ✅ Car Rental: Combined Service Fee - FIXED */}
{(isCar && carPriceBreakdown && (carPriceBreakdown.markupAmount > 0 || carPriceBreakdown.serviceFee > 0 || carPriceBreakdown.combinedTaxes > 0)) && (
  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
    <span className="text-xs font-medium text-gray-500">
      Service Fee ({carPriceBreakdown.markupPercentage + carPriceBreakdown.serviceFeePercentage + carPriceBreakdown.combinedTaxPercentage}%)
    </span>
    <span className="text-sm font-semibold text-gray-900">
      {formatPrice(
        convertedPrices.serviceFee + convertedPrices.combinedTaxes,
        displayCurrency
      )}
    </span>
  </div>
)}

      {/* Flight: Taxes */}
      {isFlight && combinedTaxes > 0 && (
        <div className="flex justify-between items-center pt-1 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-500">Taxes</span>
          <span className="text-sm font-semibold text-gray-900">{displayCombinedTaxes}</span>
        </div>
      )}

      {/* Hotel: Service Fee */}
      {isHotel && serviceFee > 0 && (
        <div className="flex justify-between items-center pt-1 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-500">Service Fee</span>
          <span className="text-sm font-semibold text-gray-900">{displayServiceFee}</span>
        </div>
      )}

      {/* Applied Promo/Discount */}
      {appliedPromo && (
        <div className="flex justify-between items-center text-xs font-bold text-green-600 pt-1">
          <span>Discount ({appliedPromo.code})</span>
          <span>- {formattedDiscountedTotal}</span>
        </div>
      )}

      {/* Total Fare */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <span className="text-sm font-bold text-gray-900">Total Fare</span>
        <span className="text-xl font-black text-[#33a8da]">{displayTotalDue}</span>
      </div>

      {/* Breakdown Description */}
      {breakdownDescription && (
        <div className="mt-2 text-[10px] text-gray-400 border-t border-gray-50 pt-2 text-center">
          {breakdownDescription}
        </div>
      )}
    </div>

    {/* Voucher Section */}
    {!extBooking && (
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

    {/* Terms & Conditions Checkbox (Flights only) */}
    {displayedTerms.length > 0 && !extBooking && isFlight && (
      <div className="mt-4 pt-4 border-t border-gray-100">
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

    {/* Proceed Button */}
    <button
      onClick={handleCompleteBooking}
      disabled={
        isBooking || isCreating ||
        (isHotel && !agreedToPolicy) ||
        (isFlight && displayedTerms.length > 0 && !agreedToTerms) ||
        (passportRequired && isLoggedIn && isPassportIncomplete && !shouldSkipPassport) ||
        isCheckingPassport
      }
      className="w-full bg-[#33a8da] text-white font-medium py-3 rounded-xl hover:bg-[#2c98c7] transition disabled:opacity-50 mt-4"
    >
      {isCheckingPassport ? 'Checking passport...' :
        isCreating ? 'Creating Booking...' :
          isBooking ? 'Please wait...' :
            extBooking ? 'Proceed to Payment' : 'Continue to payment'}
    </button>

    {/* Secure Checkout */}
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
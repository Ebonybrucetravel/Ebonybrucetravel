'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { config } from '@/lib/config';
import { extractAirportCode, transformWakanowToDuffelFormat } from '@/lib/utils';
import type { Airline } from '@/lib/duffel-airlines';
import type { SearchParams, SearchResult, SelectedSeat, TechnicalStop, StopInformation } from '@/lib/types';
import api from '@/lib/api';
import { type WakanowFlightSearchParams } from '@/lib/wakanow-api';
import { useLanguage } from '@/context/LanguageContext';
import { CURRENCY_SYMBOLS, fetchExchangeRates } from '@/lib/currency-service';

// ==================== AIRPORT COUNTRY MAPPING (GLOBAL DOMESTIC DETECTION) ====================
const AIRPORT_COUNTRY_MAP: Record<string, string> = {
  // UK (United Kingdom)
  'LHR': 'GB', 'LGW': 'GB', 'MAN': 'GB', 'EDI': 'GB', 'GLA': 'GB',
  'BHX': 'GB', 'BRS': 'GB', 'LTN': 'GB', 'STN': 'GB', 'LCY': 'GB',
  'NCL': 'GB', 'BFS': 'GB', 'ABZ': 'GB', 'LBA': 'GB', 'SOU': 'GB',
  'EMA': 'GB', 'CWL': 'GB', 'BOH': 'GB', 'INV': 'GB', 'JER': 'GB',
  
  // Nigeria
  'LOS': 'NG', 'ABV': 'NG', 'PHC': 'NG', 'KAN': 'NG', 'ENU': 'NG',
  'QOW': 'NG', 'BNI': 'NG', 'JOS': 'NG', 'KAD': 'NG', 'YOL': 'NG',
  'ILR': 'NG', 'MDI': 'NG', 'CBQ': 'NG', 'QRW': 'NG', 'SKO': 'NG',
  
  // USA
  'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'DFW': 'US', 'DEN': 'US',
  'SFO': 'US', 'SEA': 'US', 'LAS': 'US', 'MCO': 'US', 'EWR': 'US',
  'MIA': 'US', 'BOS': 'US', 'ATL': 'US', 'IAH': 'US', 'PHX': 'US',
  'LGA': 'US', 'DCA': 'US', 'IAD': 'US', 'CLT': 'US', 'MSP': 'US',
  'DTW': 'US', 'FLL': 'US', 'TPA': 'US', 'SAN': 'US', 'PDX': 'US',
  'SLC': 'US', 'BWI': 'US', 'SJC': 'US', 'OAK': 'US', 'MDW': 'US',
  
  // Canada
  'YYZ': 'CA', 'YVR': 'CA', 'YUL': 'CA', 'YYC': 'CA', 'YOW': 'CA',
  'YEG': 'CA', 'YHZ': 'CA', 'YWG': 'CA', 'YQB': 'CA', 'YHM': 'CA',
  
  // UAE
  'DXB': 'AE', 'AUH': 'AE', 'SHJ': 'AE',
  
  // India
  'DEL': 'IN', 'BOM': 'IN', 'BLR': 'IN', 'MAA': 'IN', 'CCU': 'IN',
  'HYD': 'IN', 'COK': 'IN', 'GOI': 'IN', 'AMD': 'IN', 'PNQ': 'IN',
  
  // China
  'PEK': 'CN', 'PVG': 'CN', 'CAN': 'CN', 'SZX': 'CN', 'CTU': 'CN',
  'SHA': 'CN', 'XIY': 'CN', 'CKG': 'CN', 'KMG': 'CN',
  
  // Japan
  'HND': 'JP', 'NRT': 'JP', 'KIX': 'JP', 'CTS': 'JP', 'FUK': 'JP',
  'NGO': 'JP', 'OKA': 'JP',
  
  // Australia
  'SYD': 'AU', 'MEL': 'AU', 'BNE': 'AU', 'PER': 'AU', 'ADL': 'AU',
  'CBR': 'AU', 'HBA': 'AU',
  
  // Germany
  'FRA': 'DE', 'MUC': 'DE', 'BER': 'DE', 'HAM': 'DE', 'CGN': 'DE',
  'DUS': 'DE', 'STR': 'DE', 'HAJ': 'DE', 'NUE': 'DE', 'LEJ': 'DE',
  
  // France
  'CDG': 'FR', 'ORY': 'FR', 'NCE': 'FR', 'LYS': 'FR', 'MRS': 'FR',
  'TLS': 'FR', 'BOD': 'FR', 'NTE': 'FR',
  
  // South Africa
  'JNB': 'ZA', 'CPT': 'ZA', 'DUR': 'ZA', 'PLZ': 'ZA',
  
  // Kenya
  'NBO': 'KE', 'MBA': 'KE',
  
  // Egypt
  'CAI': 'EG', 'HRG': 'EG', 'SSH': 'EG',
  
  // Ghana
  'ACC': 'GH',
  
  // Ethiopia
  'ADD': 'ET',
  
  // Turkey
  'IST': 'TR', 'SAW': 'TR', 'ESB': 'TR', 'AYT': 'TR', 'ADB': 'TR',
  
  // Singapore
  'SIN': 'SG',
  
  // Malaysia
  'KUL': 'MY', 'PEN': 'MY', 'JHB': 'MY',
  
  // Thailand
  'BKK': 'TH', 'HKT': 'TH', 'CNX': 'TH', 'DMK': 'TH',
  
  // Vietnam
  'HAN': 'VN', 'SGN': 'VN', 'DAD': 'VN',
  
  // Philippines
  'MNL': 'PH', 'CEB': 'PH',
  
  // Brazil
  'GRU': 'BR', 'GIG': 'BR', 'BSB': 'BR',
  
  // Mexico
  'MEX': 'MX', 'CUN': 'MX', 'GDL': 'MX',
  
  // Spain
  'MAD': 'ES', 'BCN': 'ES', 'AGP': 'ES', 'PMI': 'ES',
  
  // Italy
  'FCO': 'IT', 'MXP': 'IT', 'VCE': 'IT', 'NAP': 'IT',
  
  // Netherlands
  'AMS': 'NL',
  
  // Switzerland
  'ZRH': 'CH', 'GVA': 'CH', 'BSL': 'CH',
  
  // Belgium
  'BRU': 'BE',
  
  // Austria
  'VIE': 'AT',
  
  // Sweden
  'ARN': 'SE', 'GOT': 'SE',
  
  // Norway
  'OSL': 'NO', 'BGO': 'NO',
  
  // Denmark
  'CPH': 'DK',
  
  // Qatar
  'DOH': 'QA',
  
  // Oman
  'MCT': 'OM',
  
  // Bahrain
  'BAH': 'BH',
  
  // Kuwait
  'KWI': 'KW',
  
  // Saudi Arabia
  'JED': 'SA', 'RUH': 'SA', 'DMM': 'SA',
  
  // Jordan
  'AMM': 'JO',
  
  // Israel
  'TLV': 'IL',
  
  // Lebanon
  'BEY': 'LB',
  
  // Pakistan
  'KHI': 'PK', 'LHE': 'PK', 'ISB': 'PK',
  
  // Bangladesh
  'DAC': 'BD',
  
  // Sri Lanka
  'CMB': 'LK',
  
  // Indonesia
  'CGK': 'ID', 'DPS': 'ID', 'SUB': 'ID',
  
  // South Korea
  'ICN': 'KR', 'GMP': 'KR', 'PUS': 'KR',
  
  // New Zealand
  'AKL': 'NZ', 'WLG': 'NZ', 'CHC': 'NZ',
  
  // Argentina
  'EZE': 'AR', 'AEP': 'AR',
  
  // Chile
  'SCL': 'CL',
  
  // Colombia
  'BOG': 'CO',
  
  // Panama
  'PTY': 'PA',
  
  // Ireland
  'DUB': 'IE', 'SNN': 'IE',
  
  // Portugal
  'LIS': 'PT', 'OPO': 'PT',
  
  // Greece
  'ATH': 'GR', 'SKG': 'GR',
  
  // Poland
  'WAW': 'PL', 'KRK': 'PL',
  
  // Czech Republic
  'PRG': 'CZ',
  
  // Hungary
  'BUD': 'HU',
  
  // Romania
  'OTP': 'RO',
  
  // Bulgaria
  'SOF': 'BG',
  
  // Croatia
  'ZAG': 'HR',
  
  // Morocco
  'CMN': 'MA', 'RAK': 'MA',
  
  // Tunisia
  'TUN': 'TN',
  
  // Senegal
  'DSS': 'SN', 'DKR': 'SN',
  
  // Ivory Coast
  'ABJ': 'CI',
  
  // Cameroon
  'DLA': 'CM', 'NSI': 'CM',
  
  // Angola
  'LAD': 'AO',
  
  // Zimbabwe
  'HRE': 'ZW',
  
  // Zambia
  'LUN': 'ZM',
  
  // Botswana
  'GBE': 'BW',
  
  // Mauritius
  'MRU': 'MU',
  
  // Seychelles
  'SEZ': 'SC',
  
  // Maldives
  'MLE': 'MV',
  
  // Nepal
  'KTM': 'NP',
  
  // Uzbekistan
  'TAS': 'UZ',
  
  // Kazakhstan
  'ALA': 'KZ',
  
  // Azerbaijan
  'GYD': 'AZ',
  
  // Georgia
  'TBS': 'GE',
  
  // Armenia
  'EVN': 'AM',
  
  // Serbia
  'BEG': 'RS',
  
  // Finland
  'HEL': 'FI',
  
  // Iceland
  'KEF': 'IS',
  
  // Luxembourg
  'LUX': 'LU',
  
  // Malta
  'MLA': 'MT',
  
  // Cyprus
  'LCA': 'CY', 'PFO': 'CY',
  
  // Estonia
  'TLL': 'EE',
  
  // Latvia
  'RIX': 'LV',
  
  // Lithuania
  'VNO': 'LT',
  
  // Slovenia
  'LJU': 'SI',
  
  // Slovakia
  'BTS': 'SK',
  
  // Russia
  'SVO': 'RU', 'DME': 'RU', 'LED': 'RU',
  
  // Ukraine
  'KBP': 'UA', 'LWO': 'UA',
  
  // Belarus
  'MSQ': 'BY',
};

// Helper function to get country code from airport code
const getCountryCodeFromAirport = (airportCode: string): string | null => {
  if (!airportCode) return null;
  
  const normalizedCode = airportCode.toUpperCase().trim();
  const match = normalizedCode.match(/\b([A-Z]{3})\b/);
  const code = match ? match[1] : normalizedCode.substring(0, 3);
  
  return AIRPORT_COUNTRY_MAP[code] || null;
};

// Helper function to check if flight is domestic (same country)
const isDomesticFlightGlobal = (origin: string, destination: string): boolean => {
  if (!origin || !destination) return false;
  
  const originCountry = getCountryCodeFromAirport(origin);
  const destCountry = getCountryCodeFromAirport(destination);
  
  if (originCountry && destCountry) {
    return originCountry === destCountry;
  }
  
  const normalizedOrigin = origin.toUpperCase().substring(0, 3);
  const normalizedDest = destination.toUpperCase().substring(0, 3);
  return normalizedOrigin === normalizedDest;
};

// Mock fallback data (only used when API fails)
const MOCK: Record<string, SearchResult[]> = {
  flights: [
    { id: 'f-1', provider: 'Air Peace', title: 'Air Peace P47121', subtitle: 'Lagos (LOS) → Abuja (ABV)', price: '£85', time: '08:00 AM', duration: '1h 15m', type: 'flights', image: 'https://logos-world.net/wp-content/uploads/2023/03/Air-Peace-Logo.png' },
    { id: 'f-2', provider: 'Ibom Air', title: 'Ibom Air QI0320', subtitle: 'Lagos (LOS) → Abuja (ABV)', price: '£92', time: '10:30 AM', duration: '1h 10m', type: 'flights', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Ibom_Air_logo.png/1200px-Ibom_Air_logo.png' },
  ],
  hotels: [
    { id: 'h-1', provider: 'Amadeus Premium', title: 'The Wheatbaker Lagos', subtitle: 'Ikoyi, Lagos', price: '£145/night', rating: 4.9, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800', type: 'hotels', amenities: ['Free Wi-Fi', 'Swimming Pool', 'Spa'] },
  ],
  'car-rentals': [
    { id: 'c-1', provider: 'Hertz Elite', title: 'Mercedes-Benz E-Class', subtitle: 'Lagos Int. Airport', price: '£85/day', rating: 4.8, image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800', type: 'car-rentals', amenities: ['Automatic', 'AC'], features: ['5 Seats', 'Luxury'] },
  ],
};

interface SearchContextType {
  searchParams: SearchParams | null;
  searchResults: SearchResult[];
  selectedItem: SearchResult | null;
  isSearching: boolean;
  search: (params: SearchParams) => Promise<void>;
  selectItem: (item: SearchResult) => void;
  clearSearch: () => void;
  persistSelectionForReturn: () => void;
  airlines: Airline[];
  isLoadingAirlines: boolean;
  fetchAirlines: () => Promise<void>;
  searchError: string | null;
  searchCompleted: boolean;
  selectedSeats: SelectedSeat[];
  setSelectedSeats: (seats: SelectedSeat[]) => void;
  clearSelectedSeats: () => void;
  seatTotalPrice: number;
  seatCurrency: string;
  technicalStops: TechnicalStop[];
  hasTechnicalStops: boolean;
  totalTechnicalStops: number;
  stopInformation: StopInformation | null;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const BOOKING_REVIEW_SELECTION_KEY = 'ebt_booking_review_selection';

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isLoadingAirlines, setIsLoadingAirlines] = useState(false);

  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
const [seatTotalPrice, setSeatTotalPrice] = useState(0);
const [seatCurrency, setSeatCurrency] = useState('NGN');

const [technicalStops, setTechnicalStops] = useState<TechnicalStop[]>([]);
const [hasTechnicalStops, setHasTechnicalStops] = useState<boolean>(false);
const [totalTechnicalStops, setTotalTechnicalStops] = useState<number>(0);
const [stopInformation, setStopInformation] = useState<StopInformation | null>(null);

  const { currency, convertPrice, formatPrice, isLoadingRates } = useLanguage();

  useEffect(() => {
    const total = selectedSeats.reduce((sum, seat) => sum + (seat.price || 0), 0);
    setSeatTotalPrice(total);
    if (selectedSeats.length > 0) {
      setSeatCurrency(selectedSeats[0].currency || 'NGN');
    }
  }, [selectedSeats]);


  const clearSelectedSeats = useCallback(() => {
    setSelectedSeats([]);
    setSeatTotalPrice(0);
    setSeatCurrency('NGN');
  }, []);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(BOOKING_REVIEW_SELECTION_KEY) : null;
      if (!raw) return;
      const data = JSON.parse(raw) as { selectedItem: SearchResult | null; searchParams: SearchParams | null };
      sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
      if (data.selectedItem) setSelectedItem(data.selectedItem);
      if (data.searchParams) setSearchParams(data.searchParams);
    } catch {
      sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
    }
  }, []);

  const fetchAirlines = useCallback(async () => {
    console.log('⚠️ Airlines endpoint not available - skipping');
    return;
  }, []);

  useEffect(() => {
    if (searchParams?.type === 'flights') {
      fetchAirlines();
    }
  }, [searchParams?.type, fetchAirlines]);

  const searchDispatchRef = React.useRef<(params: SearchParams) => Promise<void>>(async () => {});

  const calculateTotalServiceFee = (markupAmount: number, conversionFee: number, taxes: number): number => {
    return markupAmount + conversionFee + taxes;
  };

  const formatPriceInUserCurrency = useCallback(async (amount: number, fromCurrency: string = 'NGN'): Promise<string> => {
    try {
      let finalAmount = amount;
      if (fromCurrency !== currency.code) {
        finalAmount = await convertPrice(amount, fromCurrency);
      }
      return formatPrice(finalAmount);
    } catch (error) {
      console.error('Failed to format price in user currency:', error);
      const symbol = CURRENCY_SYMBOLS[fromCurrency] || fromCurrency;
      return `${symbol}${amount.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;
    }
  }, [currency.code, convertPrice, formatPrice]);

  const getDisplayPriceInUserCurrency = useCallback(async (amount: number, fromCurrency: string = 'NGN'): Promise<number> => {
    try {
      if (fromCurrency === currency.code) return amount;
      return await convertPrice(amount, fromCurrency);
    } catch (error) {
      console.error('Failed to convert price:', error);
      return amount;
    }
  }, [currency.code, convertPrice]);

 // Helper function to safely get adults count from params
const getAdultsCount = (params: SearchParams): number => {
  // Direct number check
  if (typeof params.adults === 'number') {
    return params.adults;
  }
  // Check if adults is an object with adults property
  if (params.adults && typeof params.adults === 'object') {
    const adultsObj = params.adults as Record<string, unknown>;
    if (typeof adultsObj.adults === 'number') {
      return adultsObj.adults;
    }
  }
  // Check travellers
  if (params.travellers && typeof params.travellers === 'object') {
    const travellersObj = params.travellers as Record<string, unknown>;
    if (typeof travellersObj.adults === 'number') {
      return travellersObj.adults;
    }
  }
  return 1;
};

// ==================== CAR RENTAL SEARCH - COMPLETE FIX ====================
const searchCars = async (params: SearchParams) => {
  try {
    // ✅ FIXED: Use correct parameter names
    const pickupLocationCode = params.pickupLocationCode || params.startLocationCode;
    const dropoffLocationCode = params.dropoffLocationCode || params.endLocationCode;
    const pickupDateTime = params.pickupDateTime || params.startDateTime;
    const dropoffDateTime = params.dropoffDateTime || params.endDateTime;

    console.log('🚗 Car search params:', {
      pickupLocationCode,
      dropoffLocationCode,
      pickupDateTime,
      dropoffDateTime,
      transferType: params.transferType,
    });

    if (!pickupLocationCode || !dropoffLocationCode || !pickupDateTime || !dropoffDateTime) {
      console.error('❌ Missing required car rental parameters');
      setSearchResults([]);
      setSearchError('Missing location or date information. Please try again.');
      return;
    }

    let passengerCount = 2;
    if (params.passengers) {
      if (typeof params.passengers === 'number') {
        passengerCount = params.passengers;
      } else if (typeof params.passengers === 'object') {
        passengerCount = (params.passengers.adults || 0) +
          (params.passengers.children || 0) +
          (params.passengers.infants || 0);
        passengerCount = Math.max(1, passengerCount);
      }
    }

    const carParams: any = {
      pickupLocationCode,
      dropoffLocationCode,
      pickupDateTime,
      dropoffDateTime,
      passengers: passengerCount,
      currency: 'NGN',
    };

    if (params.transferType) carParams.transferType = params.transferType;
    if (params.duration) carParams.duration = params.duration;
    if (params.vehicleCategory) carParams.vehicleCategory = params.vehicleCategory;
    if (params.vehicleCode) carParams.vehicleCode = params.vehicleCode;
    if (params.baggages !== undefined && params.baggages > 0) carParams.baggages = params.baggages;

    console.log('🚗 Car rental API request:', carParams);

    const response = await api.carApi.searchCarRentals(carParams);

    if (response.success && response.data?.data) {
      // ✅ Process each item with async conversion
      const mappedResults = await Promise.all(response.data.data.map(async (item: any) => {
        const startDate = new Date(item.start?.dateTime);
        const endDate = new Date(item.end?.dateTime);
        const hoursDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        let rentalType = 'transfer';
        let displayType = 'Transfer';

        if (daysDiff >= 1) {
          rentalType = 'multi-day';
          displayType = 'Multi-Day Rental';
        } else if (hoursDiff > 4) {
          rentalType = 'long-transfer';
          displayType = 'Long Transfer';
        }

        // ✅ Get base price in EUR from Amadeus
        const basePriceEUR = parseFloat(
          item.quotation?.base?.monetaryAmount || 
          item.original_price || 
          item.price?.base || 
          item.base_price || 
          '0'
        );

        // ✅ Get the user's currency from context
        const userCurrency = currency.code || 'NGN';
        const originalCurrency = item.quotation?.currencyCode || 'EUR';

        // ✅ Convert to user's currency using currency service
        let basePriceInUserCurrency = 0;
        if (basePriceEUR > 0) {
          try {
            // ✅ Convert from EUR to user's currency
            basePriceInUserCurrency = await convertPrice(basePriceEUR, originalCurrency);
            console.log('💰 Converted to user currency:', { 
              basePriceEUR, 
              originalCurrency,
              userCurrency,
              basePriceInUserCurrency 
            });
          } catch (error) {
            console.warn(`⚠️ Failed to convert ${originalCurrency} to ${userCurrency}, using fallback`, error);
            // Fallback: use converted amount from API
            basePriceInUserCurrency = parseFloat(item.converted?.monetaryAmount || '0');
            if (basePriceInUserCurrency <= 0) {
              basePriceInUserCurrency = basePriceEUR * 1567.50;
            }
          }
        }

        // ✅ If conversion failed, use API's converted amount
        if (basePriceInUserCurrency <= 0) {
          basePriceInUserCurrency = parseFloat(item.converted?.monetaryAmount || '0');
        }

        // ✅ If still no price, use a fallback
        if (basePriceInUserCurrency <= 0) {
          basePriceInUserCurrency = 1000;
        }

        // ✅ Calculate markup and service fee in user's currency
        const markupPercentage = 10;
        const serviceFeePercentage = 5;

        const markupAmount = basePriceInUserCurrency * (markupPercentage / 100);
        const serviceFeeAmount = basePriceInUserCurrency * (serviceFeePercentage / 100);
        const finalPrice = basePriceInUserCurrency + markupAmount + serviceFeeAmount;

        console.log(`🚗 Car price breakdown (${userCurrency}):`, {
          basePriceEUR,
          originalCurrency,
          userCurrency,
          basePriceInUserCurrency,
          markupPercentage,
          markupAmount,
          serviceFeePercentage,
          serviceFeeAmount,
          finalPrice,
        });

        const conversionFee = parseFloat(item.conversion_fee) || 0;
        const taxes = 0;
        const serviceFeeFromBackend = parseFloat(item.service_fee) || 0;
        
        let serviceFeePercentageFromBackend = 0;
        if (basePriceInUserCurrency > 0 && serviceFeeFromBackend > 0) {
          serviceFeePercentageFromBackend = (serviceFeeFromBackend / basePriceInUserCurrency) * 100;
        }

        return {
          id: item.id || item.offerId || `car-${Date.now()}-${Math.random()}`,
          type: 'car-rentals' as const,
          provider: item.serviceProvider?.name || item.provider || 'Car Rental Provider',
          title: item.vehicle?.description || 'Car Rental',
          subtitle: `${item.start?.locationCode || ''} → ${item.end?.locationCode || ''}`,
          price: 'Loading...',
          totalPrice: 'Loading...',
          image: item.vehicle?.imageURL || item.serviceProvider?.logoUrl || '',
          
          vehicle: item.vehicle || {
            code: '',
            category: '',
            description: '',
            imageURL: '',
            seats: [],
            baggages: [],
          },
          
          serviceProvider: item.serviceProvider || item.partnerInfo?.serviceProvider || {
            code: '',
            name: '',
            logoUrl: '',
            termsUrl: '',
          },
          
          start: item.start || { 
            dateTime: pickupDateTime, 
            locationCode: pickupLocationCode,
            address: item.start?.address || {}
          },
          end: item.end || { 
            dateTime: dropoffDateTime, 
            locationCode: dropoffLocationCode,
            address: item.end?.address || {}
          },
          
          cancellationRules: item.cancellationRules || [],
          distance: item.distance,
          duration: item.duration,
          transferType: item.transferType || params.transferType || 'PRIVATE',
          methodsOfPaymentAccepted: item.methodsOfPaymentAccepted || [],
          supportedPaymentInstruments: item.supportedPaymentInstruments || [],
          extraServices: item.extraServices || [],
          conditionSummary: item.conditionSummary || [],
          
          // ✅ Price fields - NOW IN USER'S CURRENCY
          original_amount: basePriceEUR.toString(),
          original_currency: originalCurrency,
          markup_amount: markupAmount.toString(),
          markup_percentage: markupPercentage,
          conversion_fee: conversionFee.toString(),
          conversion_fee_percentage: 0,
          taxes: taxes.toString(),
          service_fee: serviceFeeAmount.toString(),
          service_fee_percentage: serviceFeePercentage,
          final_amount: finalPrice.toString(),
          currency: userCurrency,
          rawPrice: finalPrice,
          displayPrice: 'Loading...',
          displayPriceRaw: 0,
          
          offerId: item.offerId || item.id,
          offer_id: item.offerId || item.id,
          
          rentalType,
          displayType,
          rentalDays: daysDiff,
          rentalHours: hoursDiff,
          isMultiDay: daysDiff >= 1,
          isTransfer: daysDiff < 1,
          
          realData: {
  ...item,
  offerId: item.offerId || item.id,
  pickupLocation: pickupLocationCode,
  dropoffLocation: dropoffLocationCode,
  pickupDateTime: pickupDateTime,
  dropoffDateTime: dropoffDateTime,
  vehicleType: item.vehicle?.description,
  vehicleCategory: item.vehicle?.category,
  seats: item.vehicle?.seats?.[0]?.count,
  baggage: item.vehicle?.baggages?.reduce((total: number, bag: any) => total + (bag.count || 0), 0),
  // ✅ Store both EUR and user currency
  basePriceEUR: basePriceEUR,                  
  basePrice: basePriceInUserCurrency,         
  price: finalPrice,                              
  currency: userCurrency,                       
  finalPrice: finalPrice,                        
  markupAmount: markupAmount,                    
  markupPercentage: markupPercentage,            
  serviceFee: serviceFeeAmount,               
  serviceFeePercentage: serviceFeePercentage,    
  originalCurrency: originalCurrency,           
},
          pickupLocation: pickupLocationCode,
          dropoffLocation: dropoffLocationCode,
          pickupDateTime: pickupDateTime,
          dropoffDateTime: dropoffDateTime,
          vehicleCode: item.vehicle?.code,
          vehicleCategory: item.vehicle?.category,
          seats: item.vehicle?.seats?.[0]?.count,
        };
      }));

      // ✅ Process prices for display - THIS MUST BE INSIDE THE searchCars FUNCTION
      const processedResults = await Promise.all(mappedResults.map(async (result: any) => {
        const finalPrice = parseFloat(result.final_amount || '0');
        const userCurrency = currency.code || 'NGN';
        
        // ✅ Use formatPrice from useLanguage (it uses the current currency)
        const formattedDisplayPrice = formatPrice(finalPrice);
        
        return {
          ...result,
          price: formattedDisplayPrice,
          totalPrice: formattedDisplayPrice,
          displayPrice: formattedDisplayPrice,
          displayPriceRaw: finalPrice,
          rawPrice: finalPrice,
        };
      }));

      setSearchResults(processedResults);
      console.log(`✅ Processed ${processedResults.length} car rentals in ${currency.code || 'NGN'}`);
      
      if (processedResults.length > 0) {
        const firstCar = processedResults[0];
        console.log('🔍 Car data verification:', {
          id: firstCar.id,
          type: firstCar.type,
          hasVehicle: !!firstCar.vehicle,
          vehicleDescription: firstCar.vehicle?.description,
          hasServiceProvider: !!firstCar.serviceProvider,
          serviceProviderName: firstCar.serviceProvider?.name,
          hasCancellationRules: firstCar.cancellationRules?.length > 0,
          hasStart: !!firstCar.start,
          hasEnd: !!firstCar.end,
          hasDistance: !!firstCar.distance,
          hasDuration: !!firstCar.duration,
          hasTransferType: !!firstCar.transferType,
          realData: {
            basePrice: firstCar.realData?.basePrice,
            markupPercentage: firstCar.realData?.markupPercentage,
            serviceFeePercentage: firstCar.realData?.serviceFeePercentage,
            finalPrice: firstCar.realData?.finalPrice,
            currency: firstCar.realData?.currency,
          },
        });
      }
    } else {
      setSearchResults([]);
      setSearchError(response.message || 'No car rentals found');
    }
  } catch (error) {
    console.error('❌ Car search failed:', error);
    setSearchResults([]);
    setSearchError('Failed to search car rentals. Please try again.');
  }
};

// ==================== HOTEL SEARCH - FIXED VERSION ====================
const searchHotels = async (params: SearchParams) => {
  try {
    if (!params.cityCode && !params.location) {
      setSearchError('Please provide a hotel location.');
      setSearchResults([]);
      return;
    }

    const hotelParams = {
      cityCode: params.cityCode,
      checkInDate: params.checkInDate || new Date().toISOString().split('T')[0],
      checkOutDate: params.checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      adults: getAdultsCount(params),
      roomQuantity: params.rooms || 1,
      currency: 'NGN',
      page: params.page || 1,
      limit: params.limit || 20,
    };

    console.log('🏨 Sending hotel search request with cityCode:', hotelParams);

    const result = await api.searchAndTransformHotels(hotelParams, params.location || params.cityCode || 'Hotel');

    if (result.success && result.results && result.results.length > 0) {
      const processedResults = [];
      
      for (const hotel of result.results) {
        const offers = hotel.offers || [];
        let bestOffer = offers[0];
        
        if (offers.length > 1) {
          bestOffer = offers.reduce((best: any, current: any) => {
            const bestPrice = parseFloat(best.final_price || best.price?.total || '0');
            const currentPrice = parseFloat(current.final_price || current.price?.total || '0');
            return currentPrice < bestPrice ? current : best;
          }, offers[0]);
        }
        
        if (!bestOffer) continue;
        
        // Get the REAL offer ID from Amadeus
        const realOfferId = bestOffer.id || bestOffer.offer_id || bestOffer.offerId;
        
        if (!realOfferId) {
          console.warn('⚠️ Skipping hotel without valid offer ID:', { hotelTitle: hotel.title });
          continue;
        }
        
        const hotelData = hotel.hotel || hotel;
        
        const basePrice = parseFloat(bestOffer.base_price || bestOffer.price?.base || '0');
        const finalPriceNGN = parseFloat(bestOffer.final_price || bestOffer.price?.total || '0');
        
        if (finalPriceNGN === 0) continue;
        
        const markupAmount = parseFloat(bestOffer.markup_amount || '0');
        const markupPercentage = parseFloat(bestOffer.markup_percentage || '0');
        const conversionFee = parseFloat(bestOffer.conversion_fee || '0');
        const conversionFeePercentage = parseFloat(bestOffer.conversion_fee_percentage || '0');
        const serviceFee = parseFloat(bestOffer.service_fee || '0');
        
        const totalServiceFee = markupAmount + conversionFee + serviceFee;
        
        const displayPriceInUserCurrency = await getDisplayPriceInUserCurrency(finalPriceNGN, 'NGN');
        const formattedDisplayPrice = await formatPriceInUserCurrency(finalPriceNGN, 'NGN');
        
        const checkIn = new Date(params.checkInDate || new Date());
        const checkOut = new Date(params.checkOutDate || new Date(Date.now() + 86400000));
        const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
        
        const pricePerNightNGN = finalPriceNGN / nights;
        const formattedPricePerNight = await formatPriceInUserCurrency(pricePerNightNGN, 'NGN');
        
        const roomType = bestOffer.room?.typeEstimated?.category || bestOffer.room?.type || 'Standard';
        const bedType = bestOffer.room?.typeEstimated?.bedType || 'King';
        const beds = bestOffer.room?.typeEstimated?.beds || 1;
        
        const hotelId = hotelData.hotelId || hotelData.id || hotelData.hotel_id || '';
        
        // Build the result object - NO duplicate properties
        const resultItem = {
          id: realOfferId,
          offerId: realOfferId,
          hotelId: hotelId,
          type: 'hotels' as const,
          provider: hotel.provider || 'Amadeus Hotels',
          title: hotel.title || hotelData.name || 'Hotel',
          subtitle: hotel.subtitle || `${hotelData.address?.cityName || ''} • ${nights} night${nights > 1 ? 's' : ''}`,
          
          price: formattedDisplayPrice,
          totalPrice: formattedDisplayPrice,
          pricePerNight: formattedPricePerNight,
          final_amount: finalPriceNGN.toString(),
          final_price: finalPriceNGN.toString(),
          currency: 'NGN',
          rawPrice: displayPriceInUserCurrency,
          displayPrice: formattedDisplayPrice,
          displayPriceRaw: displayPriceInUserCurrency,
          
          original_amount: bestOffer.original_price?.toString() || basePrice.toString(),
          original_currency: bestOffer.original_currency || 'GBP',
          original_price: bestOffer.original_price,
          originalPriceAmount: parseFloat(bestOffer.original_price || '0'),
          originalPriceCurrency: bestOffer.original_currency || 'GBP',
          
          markup_amount: markupAmount.toString(),
          markup_percentage: markupPercentage,
          conversion_fee: conversionFee.toString(),
          conversion_fee_percentage: conversionFeePercentage,
          service_fee: totalServiceFee.toString(),
          service_fee_percentage: markupPercentage + conversionFeePercentage,
          
          nights: nights,
          rating: hotel.rating || hotelData.rating || 4.0,
          image: hotel.image || hotelData.primaryImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
          amenities: hotel.amenities || hotelData.amenities || ['Free Wi-Fi', 'Air Conditioning', 'TV', 'Private Bathroom'],
          features: [
            roomType,
            `${beds} ${bedType.toLowerCase()} bed${beds > 1 ? 's' : ''}`,
            `${nights} night${nights > 1 ? 's' : ''}`,
            bestOffer.boardType || 'Room Only'
          ],
          isRefundable: bestOffer.policies?.refundable?.cancellationRefund === 'REFUNDABLE_UP_TO_DEADLINE',
          roomDescription: bestOffer.room?.description?.text || '',
          roomType: roomType,
          cancellationDeadline: bestOffer.policies?.cancellations?.[0]?.deadline,
          
          offer: bestOffer,
          offers: offers,
          
          realData: {
            offerId: realOfferId,
            original_price: parseFloat(bestOffer.original_price || '0'),
            original_currency: bestOffer.original_currency || 'GBP',
            hotelId: hotelId,
            hotelData: hotelData,
          },
          
          checkInDate: params.checkInDate,
          checkOutDate: params.checkOutDate,
          adults: getAdultsCount(params),
          rooms: params.rooms || 1,
          
          cityCode: params.cityCode,
          searchLocation: params.location,
          
          // All hotel data in ONE property
          hotelData: hotelData,
          address: hotelData.address,
          contact: hotelData.contact,
          media: hotelData.media,
          images: hotelData.images,
          primaryImage: hotelData.primaryImage,
          location: hotelData.location,
          description: hotelData.description,
          checkInOut: hotelData.checkInOut,
          policies: hotelData.policies,
        };
        
        processedResults.push(resultItem);
        console.log(`✅ Processed hotel: ${hotel.title} with offer ID: ${realOfferId}`);
      }
      
      setSearchResults(processedResults);
      console.log(`✅ Processed ${processedResults.length} hotels with REAL offer IDs and complete data`);
      
      if (processedResults.length === 0) {
        setSearchError('No hotels found with valid offers. Please try different dates.');
      }
    } else {
      console.log('No hotels found:', result.message);
      setSearchResults([]);
      setSearchError(result.message || 'No hotels found for your search criteria.');
    }
  } catch (err: any) {
    console.error('Hotel search failed:', err);
    setSearchResults([]);
    setSearchError(err.message || 'Failed to search hotels. Please try again.');
  }
};

  const formatDateForWakanow = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // ==================== FLIGHT TRANSFORMATION FUNCTIONS ====================
  
  const transformWakanowOffers = async (
    offers: any[], 
    returnDate?: string, 
    cabinClass: string = 'economy', 
    isDomesticRoute: boolean = false
    
  ): Promise<SearchResult[]> => {
    if (!offers || offers.length === 0) return [];
    
    const SERVICE_FEE_PERCENTAGE = 10;
    const results: SearchResult[] = [];
    
    for (let offer of offers) {
      if (!offer.slices && (offer.FlightLegs || offer.flightLegs || offer.legs || offer.DepartureCode)) {
        offer = transformWakanowToDuffelFormat(offer);
      }

      const slices = offer.slices || [];
      let allTechnicalStops: TechnicalStop[] = [];
      let totalTechnicalStops = 0;
      let hasTechnicalStops = false;
      let stopInformation = offer.stopInformation || null;

      for (const slice of slices) {
        const segments = slice.segments || [];
        for (const segment of segments) {
          // ✅ Check if the segment has technical_stops (with underscore)
          if (segment.technical_stops && Array.isArray(segment.technical_stops)) {
            const segmentStops = segment.technical_stops.map((stop: any) => ({
              AirportCode: stop.AirportCode || stop.airportCode || '',
              AirportName: stop.AirportName || stop.airportName || '',
              ArrivalDate: stop.ArrivalDate || stop.arrivalDate || '',
              DepartureDate: stop.DepartureDate || stop.departureDate || '',
              Duration: stop.Duration || stop.duration || '',
            }));
            
            if (segmentStops.length > 0) {
              allTechnicalStops = allTechnicalStops.concat(segmentStops);
              totalTechnicalStops += segmentStops.length;
              hasTechnicalStops = true;
            }
          }
        }
      }

      // ✅ Fallback: also check offer-level stopInformation (if it exists)
      if (offer.stopInformation) {
        stopInformation = offer.stopInformation;
        if (offer.stopInformation.technicalStops && Array.isArray(offer.stopInformation.technicalStops)) {
          const extraStops = offer.stopInformation.technicalStops.map((stop: any) => ({
            AirportCode: stop.AirportCode || stop.airportCode || '',
            AirportName: stop.AirportName || stop.airportName || '',
            ArrivalDate: stop.ArrivalDate || stop.arrivalDate || '',
            DepartureDate: stop.DepartureDate || stop.departureDate || '',
            Duration: stop.Duration || stop.duration || '',
          }));
          allTechnicalStops = allTechnicalStops.concat(extraStops);
          totalTechnicalStops += extraStops.length;
          hasTechnicalStops = hasTechnicalStops || extraStops.length > 0;
        }
        if (offer.stopInformation.summary) {
          hasTechnicalStops = hasTechnicalStops || offer.stopInformation.summary.hasTechnicalStops || false;
          totalTechnicalStops = Math.max(totalTechnicalStops, offer.stopInformation.summary.totalTechnicalStops || 0);
        }
      }

      // ✅ Debug log
      if (allTechnicalStops.length > 0) {
        console.log(`🔍 Technical stops found: ${allTechnicalStops.length} stops across segments`);
      }

      const outboundSlice = slices[0];
      const returnSlice = slices.length > 1 ? slices[1] : null;
      
      if (!outboundSlice) continue;
      
      const outboundSegments = outboundSlice.segments || [];
      const firstOutboundSegment = outboundSegments[0] || {};
      const lastOutboundSegment = outboundSegments[outboundSegments.length - 1] || firstOutboundSegment;
      
      const outboundDepartureTime = outboundSlice.departure_time || firstOutboundSegment.departing_at || firstOutboundSegment.start_time || '';
      const outboundArrivalTime = outboundSlice.arrival_time || lastOutboundSegment.arriving_at || lastOutboundSegment.end_time || '';
      
      const outboundOrigin = outboundSlice.origin?.iata_code || outboundSlice.origin || firstOutboundSegment.origin?.iata_code || firstOutboundSegment.departure_code || '';
      const outboundDestination = outboundSlice.destination?.iata_code || outboundSlice.destination || lastOutboundSegment.destination?.iata_code || lastOutboundSegment.destination_code || '';
      
      const outboundOriginCity = outboundSlice.origin?.city_name || outboundSlice.origin?.name || firstOutboundSegment.origin?.city_name || firstOutboundSegment.origin?.name || '';
      const outboundDestinationCity = outboundSlice.destination?.city_name || outboundSlice.destination?.name || lastOutboundSegment.destination?.city_name || lastOutboundSegment.destination?.name || '';
      
      const outboundDuration = outboundSlice.duration || '';
      const outboundStopCount = outboundSegments.length > 0 ? outboundSegments.length - 1 : 0;
      
      const airline = outboundSlice.airline || offer.airline || firstOutboundSegment.airline || firstOutboundSegment.operating_carrier || {};
      const airlineName = airline.name || offer.marketing_carrier_name || firstOutboundSegment.airline_name || 'Airline';
      const airlineCode = airline.code || offer.marketing_carrier || firstOutboundSegment.airline_code || '';
      const airlineLogo = airline.logo_url || `https://images.wakanow.com/Images/flight-logos/${airlineCode}.gif`;
      
      const flightNumber = firstOutboundSegment.flight_number || firstOutboundSegment.marketing_carrier_flight_number || '';
      
      const freeBaggage = outboundSlice.free_baggage || {};
      const baggageCount = freeBaggage.BagCount || 0;
      const baggageWeight = freeBaggage.Weight || 0;
      const baggageUnit = freeBaggage.WeightUnit || 'kg';
      const baggageText = baggageCount > 0 ? `${baggageCount} checked bag${baggageCount > 1 ? 's' : ''}` : 
                          (baggageWeight > 0 ? `${baggageWeight}${baggageUnit} baggage` : '');
      
      const rawOriginalAmount = offer.original_amount || offer.Price?.Amount || offer.price?.amount || offer.TotalAmount || '0';
      const originalAmountNGN = parseFloat(rawOriginalAmount.toString());
      const serviceFeeNGN = originalAmountNGN * (SERVICE_FEE_PERCENTAGE / 100);
      const conversionFeeNGN = parseFloat(offer.conversion_fee) || 0;
      const totalServiceFeeNGN = serviceFeeNGN + conversionFeeNGN;
      const finalAmountNGN = originalAmountNGN + totalServiceFeeNGN;
      
      const displayPriceInUserCurrency = await getDisplayPriceInUserCurrency(finalAmountNGN, 'NGN');
      const formattedDisplayPrice = await formatPriceInUserCurrency(finalAmountNGN, 'NGN');
      
      let durationDisplay = outboundDuration;
      if (durationDisplay && typeof durationDisplay === 'string') {
        if (durationDisplay.includes(':')) {
          const parts = durationDisplay.split(':');
          if (parts.length >= 2) {
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            if (hours > 0 && minutes > 0) durationDisplay = `${hours}h ${minutes}m`;
            else if (hours > 0) durationDisplay = `${hours}h`;
            else if (minutes > 0) durationDisplay = `${minutes}m`;
          }
        } else {
          const hoursMatch = durationDisplay.match(/(\d+)H/);
          const minutesMatch = durationDisplay.match(/(\d+)M/);
          const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
          const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
          if (hours > 0 && minutes > 0) durationDisplay = `${hours}h ${minutes}m`;
          else if (hours > 0) durationDisplay = `${hours}h`;
          else if (minutes > 0) durationDisplay = `${minutes}m`;
        }
      }
      
      const formattedTime = outboundDepartureTime ? new Date(outboundDepartureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
      
      let returnFlightData = null;
      if (returnSlice) {
        const returnSegments = returnSlice.segments || [];
        const firstReturnSegment = returnSegments[0] || {};
        const lastReturnSegment = returnSegments[returnSegments.length - 1] || firstReturnSegment;
        
        const returnFlightNumber = firstReturnSegment.flight_number || '';
        const returnAirline = returnSlice.airline || {};
        const returnAirlineName = returnAirline.name || offer.marketing_carrier_name || airlineName;
        
        let returnDurationDisplay = returnSlice.duration || '';
        if (returnDurationDisplay && typeof returnDurationDisplay === 'string') {
          if (returnDurationDisplay.includes(':')) {
            const parts = returnDurationDisplay.split(':');
            if (parts.length >= 2) {
              const hours = parseInt(parts[0]);
              const minutes = parseInt(parts[1]);
              if (hours > 0 && minutes > 0) returnDurationDisplay = `${hours}h ${minutes}m`;
              else if (hours > 0) returnDurationDisplay = `${hours}h`;
              else if (minutes > 0) returnDurationDisplay = `${minutes}m`;
            }
          }
        }
        
        returnFlightData = {
          departureAirport: returnSlice.origin?.iata_code || returnSlice.origin || '',
          arrivalAirport: returnSlice.destination?.iata_code || returnSlice.destination || '',
          departureCity: returnSlice.origin?.city_name || returnSlice.origin?.name || '',
          arrivalCity: returnSlice.destination?.city_name || returnSlice.destination?.name || '',
          departureTime: returnSlice.departure_time || firstReturnSegment.departing_at || firstReturnSegment.start_time || '',
          arrivalTime: returnSlice.arrival_time || lastReturnSegment.arriving_at || lastReturnSegment.end_time || '',
          flightNumber: returnFlightNumber,
          airlineName: returnAirlineName,
          duration: returnDurationDisplay,
          stopCount: returnSegments.length > 0 ? returnSegments.length - 1 : 0,
          stopText: returnSegments.length <= 1 ? 'Direct' : `${returnSegments.length - 1} ${returnSegments.length - 1 === 1 ? 'Stop' : 'Stops'}`,
        };
      }
      
      const offerId = offer.id || offer.offer_id || `wakanow-${Date.now()}-${results.length}`;
      
      // ✅ Get the ORIGINAL short selectData - prefer select_data (underscore)
      const shortSelectData = offer.select_data || '';
      const compressedSelectData = offer.SelectData || offer.selectData || '';

      let selectDataValue = shortSelectData;

      if (!selectDataValue || selectDataValue.length > 500) {
        selectDataValue = compressedSelectData;
      }

      if (shortSelectData && shortSelectData.length < 200 && shortSelectData.length > 0) {
        selectDataValue = shortSelectData;
        console.log('✅ Using short selectData (length: ' + shortSelectData.length + ')');
      } else if (selectDataValue && selectDataValue.length > 500) {
        console.warn('⚠️ Only compressed selectData available (length: ' + selectDataValue.length + ')');
      }
      
      const offerRequestId = offer.offer_request_id || `wakanow-req-${offerId}`;
      
      results.push({
        id: offerId,
        provider: 'wakanow',
        title: `${airlineName} ${flightNumber}`.trim() || 'Flight',
        subtitle: `${outboundOrigin} → ${outboundDestination}`,
        price: formattedDisplayPrice,
        totalPrice: formattedDisplayPrice,
        time: formattedTime,
        duration: durationDisplay || '--:--',
        type: 'flights' as const,
        image: airlineLogo,
        isRefundable: offer.is_refundable || false,
        baggage: baggageText,
        airlineCode: airlineCode,
        airlineName: airlineName,
        airlineLogo: airlineLogo,
        flightNumber: flightNumber,
        departureAirport: outboundOrigin,
        arrivalAirport: outboundDestination,
        departureCity: outboundOriginCity,
        arrivalCity: outboundDestinationCity,
        departureTime: outboundDepartureTime,
        arrivalTime: outboundArrivalTime,
        stopCount: outboundStopCount,
        stopText: outboundStopCount === 0 ? 'Direct' : outboundStopCount === 1 ? '1 Stop' : `${outboundStopCount} Stops`,
        cabin: cabinClass,
        displayPrice: formattedDisplayPrice,
        rawPrice: displayPriceInUserCurrency,
        original_amount: originalAmountNGN.toString(),
        original_currency: 'NGN',
        markup_amount: serviceFeeNGN.toString(),
        markup_percentage: SERVICE_FEE_PERCENTAGE,
        conversion_fee: conversionFeeNGN.toString(),
        conversion_fee_percentage: offer.conversion_fee_percentage || 0,
        taxes: '0',
        service_fee: totalServiceFeeNGN.toString(),
        service_fee_percentage: SERVICE_FEE_PERCENTAGE,
        final_amount: finalAmountNGN.toString(),
        currency: 'NGN',
        isRoundTrip: !!returnSlice,
        rating: 4,
        amenities: ['Seat Selection', 'Cabin Baggage'],
        features: [
          outboundStopCount === 0 ? 'Direct' : `${outboundStopCount} stop${outboundStopCount > 1 ? 's' : ''}`,
          durationDisplay || '--:--',
          cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)
        ],
        isWakanow: true,
        isWakanowDomestic: isDomesticRoute,
        selectData: selectDataValue,
        offer_request_id: offerRequestId,
        offer_id: offerId,
        connection_code: offer.connection_code,
        slices: slices,
        returnFlight: returnFlightData,
        fareRules: offer.fare_rules || [],
        penaltyRules: offer.penalty_rules || null,
        terms_and_conditions: offer.terms_and_conditions || null,
        custom_messages: offer.custom_messages || offer.CustomMessages || [],
        _normalizedAirline: airlineName.toLowerCase().trim(),
        _normalizedDepartureTime: outboundDepartureTime,
        _normalizedArrivalAirport: outboundDestination,
        
        // ✅ CORRECTED: Use the extracted technical stops
        technicalStops: allTechnicalStops,
        hasTechnicalStops: hasTechnicalStops,
        totalTechnicalStops: totalTechnicalStops,
        stopInformation: stopInformation,
      });
      
    }
    
    return results;
  };

  const transformDuffelOffers = async (
    offers: any[], 
    cabinClass: string = 'economy', 
    offerRequestId: string
  ): Promise<SearchResult[]> => {
    const results: SearchResult[] = [];
    const SERVICE_FEE_PERCENTAGE = 10;
    
    for (const offer of offers) {
      const slices = offer.slices || [];
      const outboundSlice = slices[0] || {};
      const returnSlice = slices.length > 1 ? slices[1] : null;
      
      const outboundSegments = outboundSlice.segments || [];
      const firstOutboundSegment = outboundSegments[0] || {};
      const lastOutboundSegment = outboundSegments[outboundSegments.length - 1] || firstOutboundSegment;
      
      const ownerAirline = offer.owner || {};
      const operatingCarrier = firstOutboundSegment.operating_carrier || outboundSlice.operating_carrier || {};
      const airline = ownerAirline.id ? ownerAirline : operatingCarrier;
      const airlineName = airline.name || ownerAirline.name || operatingCarrier.name || 'Unknown Airline';
      const airlineCode = airline.iata_code || airline.iataCode || operatingCarrier.iata_code || '';
      const airlineLogo = airline.logo_symbol_url || airline.logo_url || '';
      
      const flightNumber = firstOutboundSegment.marketing_carrier_flight_number || 
                           firstOutboundSegment.flight_number || 
                           firstOutboundSegment.number || '';
      
      const outboundDepartureAirport = firstOutboundSegment.origin?.iata_code || 
                                       firstOutboundSegment.departure?.iataCode || 
                                       outboundSlice.origin?.iata_code || '';
      const outboundArrivalAirport = lastOutboundSegment.destination?.iata_code || 
                                     lastOutboundSegment.arrival?.iataCode || 
                                     outboundSlice.destination?.iata_code || '';
      
      const outboundDepartureTime = firstOutboundSegment.departing_at || 
                                    firstOutboundSegment.departure?.at || 
                                    outboundSlice.departure_time || '';
      const outboundArrivalTime = lastOutboundSegment.arriving_at || 
                                  lastOutboundSegment.arrival?.at || 
                                  outboundSlice.arrival_time || '';
      
      let totalDurMin = 0;
      if (outboundSlice.duration) {
        const match = outboundSlice.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        const hours = match?.[1] ? parseInt(match[1]) : 0;
        const minutes = match?.[2] ? parseInt(match[2]) : 0;
        totalDurMin = hours * 60 + minutes;
      }
      const h = Math.floor(totalDurMin / 60);
      const m = totalDurMin % 60;
      const durationDisplay = `${h}h ${String(m).padStart(2, '0')}m`;
      
      const totalAmountOriginal = parseFloat(offer.total_amount || offer.original_amount || '0');
      const originalCurrency = offer.total_currency || offer.original_currency || 'GBP';
      
      let finalAmountInUserCurrency = totalAmountOriginal;
      let formattedDisplayPrice = '';
      
      try {
        if (originalCurrency !== currency.code) {
          finalAmountInUserCurrency = await convertPrice(totalAmountOriginal, originalCurrency);
        }
        formattedDisplayPrice = await formatPrice(finalAmountInUserCurrency);
      } catch (error) {
        console.error('Failed to convert Duffel price:', error);
        const symbol = CURRENCY_SYMBOLS[originalCurrency] || originalCurrency;
        formattedDisplayPrice = `${symbol}${Math.round(totalAmountOriginal).toLocaleString()}`;
      }
      
      const outboundStops = Math.max(0, (outboundSegments.length || 1) - 1);
      
      const formatTimeFn = (timeStr: string): string => {
        if (!timeStr) return '--:--';
        try {
          return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch {
          return '--:--';
        }
      };
      
      let returnFlightData = null;
      
      if (returnSlice) {
        const returnSegments = returnSlice.segments || [];
        const firstReturnSegment = returnSegments[0] || {};
        const lastReturnSegment = returnSegments[returnSegments.length - 1] || firstReturnSegment;
        
        const returnFlightNumber = firstReturnSegment.marketing_carrier_flight_number || 
                                   firstReturnSegment.flight_number || 
                                   firstReturnSegment.number || '';
        
        const returnOperatingCarrier = firstReturnSegment.operating_carrier || returnSlice.operating_carrier || {};
        const returnAirlineName = returnOperatingCarrier.name || airlineName;
        const returnAirlineCode = returnOperatingCarrier.iata_code || airlineCode;
        
        let returnDurMin = 0;
        if (returnSlice.duration) {
          const match = returnSlice.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          const hours = match?.[1] ? parseInt(match[1]) : 0;
          const minutes = match?.[2] ? parseInt(match[2]) : 0;
          returnDurMin = hours * 60 + minutes;
        }
        const returnH = Math.floor(returnDurMin / 60);
        const returnM = returnDurMin % 60;
        
        returnFlightData = {
          departureAirport: firstReturnSegment.origin?.iata_code || firstReturnSegment.departure?.iataCode || '',
          arrivalAirport: lastReturnSegment.destination?.iata_code || lastReturnSegment.arrival?.iataCode || '',
          departureCity: firstReturnSegment.origin?.city_name || firstReturnSegment.origin?.city?.name || '',
          arrivalCity: lastReturnSegment.destination?.city_name || lastReturnSegment.destination?.city?.name || '',
          departureTime: firstReturnSegment.departing_at || firstReturnSegment.departure?.at || '',
          arrivalTime: lastReturnSegment.arriving_at || lastReturnSegment.arrival?.at || '',
          flightNumber: returnFlightNumber,
          airlineName: returnAirlineName,
          airlineCode: returnAirlineCode,
          duration: returnSlice.duration,
          durationFormatted: `${returnH}h ${String(returnM).padStart(2, '0')}m`,
          stopCount: Math.max(0, (returnSegments.length || 1) - 1),
          stopText: Math.max(0, (returnSegments.length || 1) - 1) === 0 ? 'Direct' : 
                    Math.max(0, (returnSegments.length || 1) - 1) === 1 ? '1 Stop' : `${Math.max(0, (returnSegments.length || 1) - 1)} Stops`,
        };
      }
      
      results.push({
        id: offer.id ?? `duffel-${results.length}`,
        provider: 'duffel',
        title: `${airlineName} ${flightNumber}`.trim() || 'Flight',
        subtitle: `${outboundDepartureAirport} → ${outboundArrivalAirport}`,
        price: formattedDisplayPrice,
        totalPrice: formattedDisplayPrice,
        time: formatTimeFn(outboundDepartureTime),
        duration: durationDisplay,
        type: 'flights' as const,
        image: airlineLogo || `https://ui-avatars.com/api/?name=${airlineCode || airlineName}&background=33a8da&color=fff&length=2`,
        isRefundable: false,
        baggage: 'Check airline policy',
        airlineCode: airlineCode,
        flightNumber: flightNumber,
        departureAirport: outboundDepartureAirport,
        arrivalAirport: outboundArrivalAirport,
        departureCity: firstOutboundSegment.origin?.city_name || outboundSlice.origin?.city_name || '',
        arrivalCity: lastOutboundSegment.destination?.city_name || outboundSlice.destination?.city_name || '',
        departureTime: outboundDepartureTime,
        arrivalTime: outboundArrivalTime,
        airlineName: airlineName,
        airlineLogo: airlineLogo,
        stopCount: outboundStops,
        stopText: outboundStops === 0 ? 'Direct' : outboundStops === 1 ? '1 Stop' : `${outboundStops} Stops`,
        cabin: cabinClass,
        displayPrice: formattedDisplayPrice,
        rawPrice: finalAmountInUserCurrency,
        original_amount: totalAmountOriginal.toString(),
        original_currency: originalCurrency,
        markup_amount: '0',
        markup_percentage: 0,
        conversion_fee: '0',
        conversion_fee_percentage: 0,
        taxes: '0',
        service_fee: '0',
        service_fee_percentage: 0,
        final_amount: totalAmountOriginal.toString(),
        currency: originalCurrency,
        isRoundTrip: !!returnSlice,
        rating: 4,
        amenities: ['Seat Selection', 'Cabin Baggage'],
        features: [
          outboundStops === 0 ? 'Direct' : `${outboundStops} stop${outboundStops > 1 ? 's' : ''}`,
          durationDisplay,
          cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)
        ],
        isWakanow: false,
        isWakanowDomestic: false,
        selectData: offer.id,
        slices: slices,
        returnFlight: returnFlightData,
        fareRules: [],
        penaltyRules: null,
        connection_code: '',
        offer_request_id: offerRequestId,
        offer_id: offer.id,
        _normalizedAirline: airlineName.toLowerCase().trim(),
        _normalizedDepartureTime: outboundDepartureTime,
        _normalizedArrivalAirport: outboundArrivalAirport,
      });
    }
    
    return results;
  };
// ==================== SEARCH FLIGHTS - WAKANOW + DUFFEL ====================
const searchFlights = async (params: SearchParams) => {
  // ✅ FIX: Check if segments exists and has at least one item
  if (!params.segments || params.segments.length === 0) {
    setSearchResults([]);
    setSearchError('No flight segments provided');
    return;
  }

  const isMultiCity = params.tripType === 'multi-city' && params.segments.length > 1;
  
  console.log(`✈️ Fetching flights - ${isMultiCity ? 'MULTI-CITY' : 'ONE-WAY/ROUND-TRIP'} with ${params.segments.length} segments`);

  // ✅ For multi-city, pass ALL segments to the backend
  if (isMultiCity) {
    console.log(`🔄 Multi-city with ${params.segments.length} segments:`, params.segments.map(s => `${s.from} → ${s.to}`));
    await searchMultiCityFlights(params);
    return;
  }

  // ✅ For single segment (one-way or round-trip) - existing logic
  await searchSingleSegmentFlights(params);
};

// ✅ New function for multi-city searches
const searchMultiCityFlights = async (params: SearchParams) => {
  // ✅ FIX: Check if segments exists
  if (!params.segments || params.segments.length === 0) {
    setSearchResults([]);
    setSearchError('No flight segments provided');
    return;
  }

  const BASE = config.apiBaseUrl;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('⏰ Multi-city search timeout after 60s, aborting...');
    controller.abort();
  }, 60000);

  try {
    // ✅ Build itineraries from ALL segments
    const itineraries = params.segments.map((segment) => ({
      Departure: extractAirportCode(segment.from),
      Destination: extractAirportCode(segment.to),
      DepartureDate: segment.date || new Date().toISOString().split('T')[0],
    }));

    // ✅ Validate all segments
    for (const it of itineraries) {
      if (!it.Departure || !it.Destination) {
        setSearchError('Invalid airport code in one of your segments');
        setSearchResults([]);
        return;
      }
    }

    let cabinClass = (params.cabinClass ?? 'economy').toLowerCase();
    if (!['economy', 'premium_economy', 'business', 'first'].includes(cabinClass)) cabinClass = 'economy';

    let adults = 1, children = 0, infants = 0;
    if (params.passengers) {
      if (typeof params.passengers === 'number') {
        adults = params.passengers;
      } else if (typeof params.passengers === 'object') {
        adults = params.passengers.adults || 0;
        children = params.passengers.children || 0;
        infants = params.passengers.infants || 0;
      }
    }

    let ticketClass: 'F' | 'C' | 'W' | 'Y' = 'Y';
    if (cabinClass === 'premium_economy') ticketClass = 'W';
    else if (cabinClass === 'business') ticketClass = 'C';
    else if (cabinClass === 'first') ticketClass = 'F';

    // ✅ Check if ALL segments are domestic
    const allDomestic = itineraries.every(it => 
      isDomesticFlightGlobal(it.Departure, it.Destination)
    );

    console.log(`✈️ Multi-city: ${itineraries.length} segments, Domestic: ${allDomestic}`);

    let wakanowResults: SearchResult[] = [];
    
    // ✅ Search Wakanow for multi-city
    try {
      const { searchWakanowFlights } = await import('@/lib/wakanow-api');
      
      const wakanowSearchParams: WakanowFlightSearchParams = {
        FlightSearchType: 'Multidestination',
        Ticketclass: ticketClass,
        Adults: adults,
        Children: children,
        Infants: infants,
        TargetCurrency: 'NGN',
        Itineraries: itineraries.map(it => ({
          Departure: it.Departure,
          Destination: it.Destination,
          DepartureDate: formatDateForWakanow(it.DepartureDate),
        })),
      };

      console.log('📤 Wakanow Multi-city search params:', wakanowSearchParams);

      const result = await searchWakanowFlights(wakanowSearchParams);
      
      if (result?.data?.offers && Array.isArray(result.data.offers)) {
        const wakanowOffers = result.data.offers;
        console.log(`📦 Wakanow multi-city offers: ${wakanowOffers.length}`);
        
        // ✅ Transform offers with multi-city context
        wakanowResults = await transformWakanowOffers(
          wakanowOffers, 
          undefined, 
          cabinClass, 
          allDomestic
        );
        
        // ✅ Tag results as multi-city with ALL data preserved
        wakanowResults = wakanowResults.map((result: any) => ({
          ...result,
          isMultiCity: true,
          isWakanow: true,
          segmentCount: itineraries.length,
          multiCitySegments: itineraries,
          allSegments: params.segments, // ✅ Store original segments for review
          tripType: 'multi-city',
          searchParams: params,
          // Also store the full itineraries for display
          itineraries: itineraries.map((it, idx) => ({
            ...it,
            segmentIndex: idx,
            from: it.Departure,
            to: it.Destination,
            date: it.DepartureDate,
          })),
        }));
        
        console.log(`✅ Wakanow multi-city: ${wakanowResults.length} results with ${itineraries.length} segments`);
      }
    } catch (err: any) {
      console.error('❌ Wakanow multi-city search failed:', err.message);
    }

    clearTimeout(timeoutId);

    if (wakanowResults.length === 0) {
      setSearchError('No multi-city flights found. Please try different routes or dates.');
      setSearchResults([]);
    } else {
      console.log(`✅ Multi-city final results: ${wakanowResults.length} offers`);
      setSearchResults(wakanowResults);
    }

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('❌ Multi-city search failed:', error);
    setSearchError('Failed to search multi-city flights. Please try again.');
    setSearchResults([]);
  }
};
// ✅ The existing search logic (renamed for single segment)
const searchSingleSegmentFlights = async (params: SearchParams) => {
  // ✅ FIX: Check if segments exists and has first item
  if (!params.segments || !params.segments[0]?.from || !params.segments[0]?.to) {
    setSearchResults([]);
    return;
  }

  const origin = extractAirportCode(params.segments[0].from);
  const destination = extractAirportCode(params.segments[0].to);
  if (!origin || !destination) {
    setSearchResults([]);
    return;
  }

  const departureDate = params.segments[0].date || new Date().toISOString().split('T')[0];
  const returnDate = params.returnDate;

  let cabinClass = (params.cabinClass ?? 'economy').toLowerCase();
  if (!['economy', 'premium_economy', 'business', 'first'].includes(cabinClass)) cabinClass = 'economy';

  let adults = 1, children = 0, infants = 0;
  if (params.passengers) {
    if (typeof params.passengers === 'number') {
      adults = params.passengers;
    } else if (typeof params.passengers === 'object') {
      adults = params.passengers.adults || 0;
      children = params.passengers.children || 0;
      infants = params.passengers.infants || 0;
    }
  }

  const isDomestic = isDomesticFlightGlobal(origin, destination);
  
  const BASE = config.apiBaseUrl;

  console.log(`✈️ Fetching flights for ${origin} → ${destination} (${isDomestic ? 'DOMESTIC' : 'INTERNATIONAL'}) from Wakanow + Duffel`);

  const deduplicateFlights = (flights: SearchResult[]): SearchResult[] => {
    const seen = new Map<string, SearchResult>();
    
    for (const flight of flights) {
      const departureDateKey = flight.departureTime ? new Date(flight.departureTime).toISOString().split('T')[0] : '';
      const uniqueKey = `${flight.airlineCode}-${flight.flightNumber}-${flight.departureAirport}-${flight.arrivalAirport}-${departureDateKey}`.toLowerCase();
      
      if (!seen.has(uniqueKey)) {
        seen.set(uniqueKey, flight);
      } else {
        const existing = seen.get(uniqueKey)!;
        const existingPrice = parseFloat(existing.rawPrice?.toString() || '0');
        const newPrice = parseFloat(flight.rawPrice?.toString() || '0');
        
        if (newPrice < existingPrice && newPrice > 0) {
          seen.set(uniqueKey, flight);
          console.log(`🔄 Deduplicated: Keeping cheaper ${uniqueKey}`);
        }
      }
    }
    
    return Array.from(seen.values());
  };

  // 60 second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('⏰ Search timeout after 60s, aborting...');
    controller.abort();
  }, 60000);

  try {
    let wakanowResults: SearchResult[] = [];
    let duffelResults: SearchResult[] = [];

    // ✅ WAKANOW FETCH
    const wakanowFetchPromise = (async (): Promise<SearchResult[]> => {
      try {
        if (controller.signal.aborted) {
          console.log('⚠️ Wakanow fetch skipped - already aborted');
          return [];
        }

        const { searchWakanowFlights } = await import('@/lib/wakanow-api');
        
        const flightSearchType: 'Oneway' | 'Return' | 'Multidestination' = 
          returnDate ? 'Return' : 'Oneway';
        
        let ticketClass: 'F' | 'C' | 'W' | 'Y' = 'Y';
        if (cabinClass === 'premium_economy') ticketClass = 'W';
        else if (cabinClass === 'business') ticketClass = 'C';
        else if (cabinClass === 'first') ticketClass = 'F';
        
        const wakanowSearchParams: WakanowFlightSearchParams = {
          FlightSearchType: flightSearchType,
          Ticketclass: ticketClass,
          Adults: adults,
          Children: children,
          Infants: infants,
          TargetCurrency: 'NGN',
          Itineraries: [
            {
              Departure: origin,
              Destination: destination,
              DepartureDate: formatDateForWakanow(departureDate),
            },
          ],
        };
        
        if (returnDate) {
          wakanowSearchParams.Itineraries.push({
            Departure: destination,
            Destination: origin,
            DepartureDate: formatDateForWakanow(returnDate),
          });
        }
        
        const result = await searchWakanowFlights(wakanowSearchParams);
        
        if (controller.signal.aborted) {
          console.log('⚠️ Wakanow fetch completed but controller aborted');
          return [];
        }
        
        let wakanowOffers: any[] = [];
        
        if (result?.data?.offers && Array.isArray(result.data.offers)) {
          wakanowOffers = result.data.offers;
          console.log(`📦 Wakanow offers from data.offers: ${wakanowOffers.length}`);
        } else if (result?.data && Array.isArray(result.data)) {
          wakanowOffers = result.data;
          console.log(`📦 Wakanow offers from data array: ${wakanowOffers.length}`);
        }
        
        if (wakanowOffers.length === 0 && result?.data?.selectData) {
          console.log('📦 No offers found, but selectData exists. This might be a direct selection response.');
          const dataObj = result.data as any;
          if (dataObj.FlightCombination || dataObj.slices || dataObj.FlightLegs) {
            wakanowOffers = [dataObj];
            console.log('📦 Using data object as a single offer');
          }
        }
        
        if (wakanowOffers.length > 0) {
          const firstOffer = wakanowOffers[0];
          if (!firstOffer?.slices && firstOffer?.FlightCombination) {
            wakanowOffers = wakanowOffers.map((offer: any) => ({
              ...offer,
              slices: offer.FlightCombination?.FlightModels || [],
              price: offer.FlightCombination?.Price || {},
              SelectData: offer.SelectData || offer.selectData || ''
            }));
          }
        }
        
        console.log(`📦 Final Wakanow offers to transform: ${wakanowOffers.length}`);
        
        return await transformWakanowOffers(wakanowOffers, returnDate, cabinClass, isDomestic);
        
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
          console.log('⚠️ Wakanow fetch aborted');
          return [];
        }
        console.error('❌ Wakanow fetch failed:', err.message);
        return [];
      }
    })();

    // ✅ DUFFEL FETCH
    const duffelFetchPromise = (async (): Promise<SearchResult[]> => {
      try {
        if (controller.signal.aborted) {
          console.log('⚠️ Duffel fetch skipped - already aborted');
          return [];
        }

        const requestBody: any = {
          origin, destination, departureDate,
          passengers: adults + children + infants,
          cabinClass, currency: 'NGN',
        };
        if (returnDate) requestBody.returnDate = returnDate;

        console.log('📤 Duffel search request:', requestBody);

        const offerRes = await fetch(`${BASE}/api/v1/bookings/search/flights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        
        if (!offerRes.ok) {
          const errorText = await offerRes.text();
          console.error('❌ Duffel offer request failed:', offerRes.status, errorText);
          return [];
        }

        const offerData = await offerRes.json();
        console.log('📦 Duffel offer response:', {
          success: offerData.success,
          hasOfferRequestId: !!offerData.data?.offer_request_id,
          dataKeys: offerData.data ? Object.keys(offerData.data) : []
        });
        
        if (offerData.success === false) {
          console.error('❌ Duffel search failed:', offerData.message || 'Unknown error');
          return [];
        }
        
        if (!offerData.data) {
          console.error('❌ Duffel search returned no data');
          return [];
        }
        
        if (!offerData.data.offer_request_id) {
          console.warn('⚠️ No offer_request_id in Duffel response, skipping Duffel');
          return [];
        }
        
        const offerRequestId = offerData.data.offer_request_id;
        console.log(`🔑 Duffel offer_request_id: ${offerRequestId}`);

        let allOffers: any[] = [];
        let cursor: string | null = null;
        let hasMore = true;
        let page = 1;
        const MAX_PAGES = 2;

        while (hasMore && page <= MAX_PAGES) {
          if (controller.signal.aborted) {
            console.log('⚠️ Duffel pagination aborted');
            break;
          }
          
          const url = new URL(`${BASE}/api/v1/bookings/offers`);
          url.searchParams.set('offer_request_id', offerRequestId);
          if (cursor) url.searchParams.set('cursor', cursor);
          
          console.log(`📤 Duffel offers page ${page}`);
          
          const offersRes = await fetch(url.toString(), { signal: controller.signal });
          if (!offersRes.ok) {
            const errorText = await offersRes.text();
            console.error(`❌ Duffel offers page ${page} failed:`, offersRes.status, errorText);
            break;
          }
          
          const offersData = await offersRes.json();
          console.log(`📦 Duffel offers page ${page}:`, {
            hasOffers: !!offersData.data?.offers,
            offersCount: offersData.data?.offers?.length || 0
          });
          
          const pageOffers: any[] = offersData.data?.offers ?? offersData.data ?? offersData.offers ?? [];
          allOffers = allOffers.concat(pageOffers);
          hasMore = offersData.meta?.hasMore ?? false;
          cursor = offersData.meta?.nextCursor ?? null;
          page++;
        }

        console.log(`✅ Duffel offers fetched: ${allOffers.length} total`);
        
        if (allOffers.length === 0) {
          console.log('⚠️ No Duffel offers found');
          return [];
        }

        return await transformDuffelOffers(allOffers, cabinClass, offerRequestId);
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
          console.log('⚠️ Duffel fetch aborted');
          return [];
        }
        console.error('❌ Duffel fetch failed:', err.message);
        return [];
      }
    })();

    wakanowFetchPromise.then(results => {
      wakanowResults = results;
      if (results.length > 0) {
        console.log(`✅ Wakanow: ${results.length} flights ready`);
        const combined = [...wakanowResults, ...duffelResults];
        const deduplicated = deduplicateFlights(combined);
        setSearchResults(deduplicated);
      }
    });

    duffelFetchPromise.then(results => {
      duffelResults = results;
      if (results.length > 0) {
        console.log(`✅ Duffel: ${results.length} flights ready`);
        const combined = [...wakanowResults, ...duffelResults];
        const deduplicated = deduplicateFlights(combined);
        setSearchResults(deduplicated);
      }
    });

    await Promise.allSettled([wakanowFetchPromise, duffelFetchPromise]);
    clearTimeout(timeoutId);

    const allFlights = [...wakanowResults, ...duffelResults];
    const uniqueFlights = deduplicateFlights(allFlights);

    if (uniqueFlights.length === 0) {
      setSearchError('No flights found for your criteria. Please try different dates or airports.');
      setSearchResults([]);
    } else {
      console.log(`✅ Final unique flights: ${uniqueFlights.length} (from ${allFlights.length} total)`);
      setSearchResults(uniqueFlights);
    }

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      setSearchError('Search is taking too long. Please try again with different dates.');
    } else {
      console.error('❌ Flight search failed:', error);
      setSearchError('Failed to search flights. Please try again.');
    }
    setSearchResults([]);
  }
};


const _searchImpl = async (params: SearchParams) => {
  console.log('🔍 Search called with params:', params);
  setSearchParams(params);
  setIsSearching(true);
  setSearchResults([]);
  setSearchError(null);
  setSearchCompleted(false);

  // ✅ Store multi-city search params for later use
  if (params.tripType === 'multi-city' && params.segments && params.segments.length > 1) {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('multiCitySearchParams', JSON.stringify(params));
        console.log('📦 Stored multi-city search params:', {
          segments: params.segments.length,
          tripType: params.tripType,
        });
      } catch (e) {
        console.warn('Could not store multi-city search params:', e);
      }
    }
  }

  try {
    // ✅ Check for both 'cars' and 'car-rentals' types
    if (params.type === 'car-rentals' || params.type === 'cars') {
      await searchCars(params);
    } else if (params.type === 'hotels') {
      await searchHotels(params);
    } else if (params.type === 'flights') {
      await searchFlights(params);
    }
  } catch (err) {
    console.error('Search error:', err);
    setSearchError('Failed to load results. Please try again.');
    const mockKey = params.type === 'cars' ? 'car-rentals' : params.type;
    setSearchResults(MOCK[mockKey] ?? []);
  } finally {
    setIsSearching(false);
    setSearchCompleted(true);
  }
};

  searchDispatchRef.current = _searchImpl;

  const search = useCallback((params: SearchParams) => {
    return searchDispatchRef.current(params);
  }, []);

  const selectItem = useCallback(async (item: SearchResult) => {
    const itemWithMessages = { ...item };
    
    // ✅ FIRST: Check if it's a multi-city item
    const isMultiCity = (item as any).isMultiCity === true || 
                        (item as any).tripType === 'multi-city' ||
                        !!(item as any).multiCitySegments ||
                        !!(item as any).allSegments ||
                        ((item as any).segmentCount && (item as any).segmentCount > 1);
    
    // ✅ For multi-city, preserve ALL data and skip API calls
    if (isMultiCity) {
      console.log('🔄 Multi-city flight selected:', {
        segmentCount: (item as any).segmentCount || (item as any).multiCitySegments?.length || (item as any).allSegments?.length,
        hasSegments: !!(item as any).multiCitySegments || !!(item as any).allSegments,
        title: item.title,
        id: item.id,
        provider: item.provider,
      });
      
      // ✅ Ensure all multi-city data is preserved
      const multiCityItem = {
        ...item,
        isMultiCity: true,
        isWakanow: true,
        tripType: 'multi-city',
        // Preserve all multi-city data
        multiCitySegments: (item as any).multiCitySegments || (item as any).allSegments || (item as any).itineraries,
        allSegments: (item as any).allSegments || (item as any).multiCitySegments || (item as any).itineraries,
        segmentCount: (item as any).segmentCount || 
                      ((item as any).multiCitySegments?.length || 
                       (item as any).allSegments?.length || 
                       (item as any).itineraries?.length || 1),
        // Preserve search params for review
        _searchParams: (item as any)._searchParams,
        // Keep all existing data
        slices: (item as any).slices,
        priceBreakdown: (item as any).priceBreakdown,
        final_amount: (item as any).final_amount,
        currency: (item as any).currency,
      };
      
      // ✅ Store in sessionStorage for persistence
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('selectedMultiCityItem', JSON.stringify(multiCityItem));
        } catch (e) {
          console.warn('Could not store multi-city item:', e);
        }
      }
      
      console.log('✅ Multi-city item stored with', multiCityItem.segmentCount, 'segments');
      setSelectedItem(multiCityItem);
      return;
    }
    
    // ✅ Type guard to check if it's a Wakanow item with extra fields
    const isWakanowItem = (item as any).isWakanow === true;
  
    const isCarRental = item.type === 'car-rentals' || (item as any).vehicle;
    
    // ✅ For car rentals, just set the item directly without any API calls
    if (isCarRental) {
      console.log('🚗 Car rental selected, passing through:', {
        id: item.id,
        hasVehicle: !!(item as any).vehicle,
        hasServiceProvider: !!(item as any).serviceProvider,
        hasCancellationRules: !!(item as any).cancellationRules?.length,
      });
      setSelectedItem(item);
      return;
    }
    
    // ✅ For Wakanow items (single segment flights)
    if (isWakanowItem) {
      try {
        const selectDataValue = (item as any).selectData;
        
        // ✅ Skip API call if we already have the data cached
        if ((item as any)._wakanowData || (item as any).priceBreakdown) {
          console.log('✅ Already have Wakanow data, skipping API call');
          setSelectedItem(item);
          return;
        }
        
        // ✅ Skip if we have fare_rules (means data was already fetched)
        if ((item as any).fare_rules?.length > 0) {
          console.log('✅ Already have fare_rules, skipping API call');
          setSelectedItem(item);
          return;
        }
        
        // ✅ Skip if we have slices (means data is already populated)
        if ((item as any).slices?.length > 0) {
          console.log('✅ Already have slices, skipping API call');
          setSelectedItem(item);
          return;
        }
        
        // ✅ Check if we have valid selectData (short version, not compressed)
        const isValidSelectData = selectDataValue && 
                                 typeof selectDataValue === 'string' && 
                                 selectDataValue.length > 10 && 
                                 selectDataValue.length < 500;
        
        if (isValidSelectData) {
          console.log('📝 Fetching custom_messages from SELECT endpoint (length: ' + selectDataValue.length + ')');
          
          try {
            const { selectWakanowFlight } = await import('@/lib/wakanow-api');
            const result = await selectWakanowFlight(selectDataValue, 'NGN');
            
            if (result?.data) {
            
              const newSelectData = result.data.select_data || result.data.select_data || '';
              if (newSelectData && newSelectData.length < 500) {
                (itemWithMessages as any).selectData = newSelectData;
                console.log('✅ Got new short selectData (length: ' + newSelectData.length + ')');
                const stopInfo = result.data.stop_information || result.data.stopInformation || null;
                if (stopInfo) {
                  setStopInformation(stopInfo);
                  setTechnicalStops(stopInfo.technicalStops || []);
                  setHasTechnicalStops(stopInfo.summary?.hasTechnicalStops || false);
                  setTotalTechnicalStops(stopInfo.summary?.totalTechnicalStops || 0);
                  
                  console.log('✅ Technical Stops extracted:', {
                    count: stopInfo.technicalStops?.length || 0,
                    hasTechnicalStops: stopInfo.summary?.hasTechnicalStops,
                    total: stopInfo.summary?.totalTechnicalStops,
                  });
                }
                
                // ✅ Also store technical stops on the item itself
                (itemWithMessages as any).technicalStops = stopInfo?.technicalStops || [];
                (itemWithMessages as any).hasTechnicalStops = stopInfo?.summary?.hasTechnicalStops || false;
                (itemWithMessages as any).totalTechnicalStops = stopInfo?.summary?.totalTechnicalStops || 0;
                (itemWithMessages as any).stopInformation = stopInfo;
              }

              
              
              // ✅ Get custom_messages
              if (result.data.custom_messages) {
                const rawMessages = result.data.custom_messages;
                let formattedMessages: Array<{ Title: string; Message: string; SeverityLevel: 'High' | 'Medium' | 'Low' }> = [];
                
                if (Array.isArray(rawMessages) && rawMessages.length > 0) {
                  if (typeof rawMessages[0] === 'object' && rawMessages[0] !== null && 'Title' in rawMessages[0]) {
                    formattedMessages = rawMessages as unknown as Array<{ Title: string; Message: string; SeverityLevel: 'High' | 'Medium' | 'Low' }>;
                  } else if (typeof rawMessages[0] === 'string') {
                    formattedMessages = rawMessages.map((msg: string) => ({
                      Title: 'Message',
                      Message: msg,
                      SeverityLevel: 'Medium' as const,
                    }));
                  }
                }
                
                (itemWithMessages as any).custom_messages = formattedMessages;
                console.log('✅ Got custom messages:', (itemWithMessages as any).custom_messages);
              }
              
              // ✅ Store price breakdown if available
              if (result.data.priceBreakdown) {
                (itemWithMessages as any).priceBreakdown = result.data.priceBreakdown;
                (itemWithMessages as any)._wakanowData = result.data;
                
                // ✅ Store flight summary and slices
                if (result.data.flight_summary) {
                  (itemWithMessages as any).flight_summary = result.data.flight_summary;
                  if (result.data.flight_summary.slices) {
                    (itemWithMessages as any).slices = result.data.flight_summary.slices;
                    console.log('✅ Stored slices from flight_summary');
                  }
                  if (result.data.flight_summary.isRefundable !== undefined) {
                    (itemWithMessages as any).isRefundable = result.data.flight_summary.isRefundable;
                    console.log('✅ Stored isRefundable:', result.data.flight_summary.isRefundable);
                  }
                }
                
                // ✅ Store fare rules and penalty rules
                if (result.data.fare_rules) {
                  (itemWithMessages as any).fare_rules = result.data.fare_rules;
                }
                if (result.data.penalty_rules) {
                  (itemWithMessages as any).penalty_rules = result.data.penalty_rules;
                }
                
                console.log('✅ Stored all Wakanow data from select endpoint');
              }
            }
          } catch (error: any) {
            // ✅ If error is SELECTION_EXPIRED, just use the data we have
            if (error.message === 'SELECTION_EXPIRED' || error.message?.includes('expired')) {
              console.log('⚠️ Selection expired, using existing data');
              // ✅ Make sure we preserve all existing data
              setSelectedItem(item);
              return;
            }
            console.warn('Could not fetch custom messages:', error);
          }
        } else {
          console.log('⏭️ Skipping API call - invalid selectData length: ' + (selectDataValue?.length || 0));
        }
      } catch (error) {
        console.warn('Could not fetch custom messages:', error);
      }
    }
    
    setSelectedItem(itemWithMessages);
  }, []);


  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSelectedItem(null);
    setSearchParams(null);
    setAirlines([]);
    setSearchError(null);
    setSearchCompleted(false);
    clearSelectedSeats();
    if (typeof window !== 'undefined') sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
  }, [clearSelectedSeats]);

  const persistSelectionForReturn = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = { selectedItem, searchParams };
      sessionStorage.setItem(BOOKING_REVIEW_SELECTION_KEY, JSON.stringify(payload));
    } catch {
      sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
    }
  }, [selectedItem, searchParams]);

  return (
    <SearchContext.Provider
      value={{
        searchParams,
        searchResults,
        selectedItem,
        isSearching,
        search,
        selectItem,
        clearSearch,
        persistSelectionForReturn,
        airlines,
        isLoadingAirlines,
        fetchAirlines,
        searchError,
        searchCompleted,
        selectedSeats,
        setSelectedSeats,
        clearSelectedSeats,
        seatTotalPrice,
        seatCurrency,
        // ✅ ADD TECHNICAL STOPS
        technicalStops,
        hasTechnicalStops,
        totalTechnicalStops,
        stopInformation,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within <SearchProvider>');
  return ctx;
}
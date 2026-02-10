'use client';

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Partners from "../components/Partners";
import ExclusiveOffers from "../components/ExclusiveOffers";
import TrendingDestinations from "../components/TrendingDestinations";
import HomesGrid from "../components/HomesGrid";
import CarRentals from "../components/CarRentals";
import SpecializedServices from "../components/SpecializedServices";
import Newsletter from "../components/Newsletter";
import Footer from "../components/Footer";
import AIAssistant from "../components/AIAssistant";
import SearchResults from "../components/SearchResults";
import HotelDetails from "../components/HotelDetails";
import ReviewTrip from "../components/ReviewTrip";
import CarDetails from "../components/CarDetails";
import FlightDetails from "../components/FlightDetails";
import BookingSuccess from "../components/BookingSuccess";
import BookingFailed from "../components/BookingFailed";
import AuthModal from "../components/AuthModal";
import PaymentModal from '../components/PaymentModal';
import Profile from "../components/Profile";
import AdminLogin from "../components/AdminLogin";
import AdminDashboard from "../components/AdminDashboard";
import ContentPage from "../components/ContentPage";
import AboutUs from "../components/AboutUs";
import { pageContentMap } from "../lib/content";
import api from "../lib/api";
import { SearchParams, SearchResult } from '../lib/types';

// Add interfaces for the callback parameters
interface HotelBookingData {
  title: string;
  subtitle?: string;
  provider?: string;
  price?: number;
  totalPrice?: number;
}

interface CarBookingData {
  title: string;
  subtitle?: string;
  provider?: string;
  price?: number;
  totalPrice?: number;
}

interface BookingDates {
  checkInDate?: string;
  checkOutDate?: string;
  pickUpDate?: string;
  dropOffDate?: string;
}

interface PassengerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  profilePicture?: string;
  avatar?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  provider?: "email" | "google" | "facebook";
  role?: "user" | "admin";
  token?: string;
}

// Helper function to get flight image
const getFlightImage = (airline: string): string => {
  const airlineImages: Record<string, string> = {
    "Air Peace": "https://logos-world.net/wp-content/uploads/2023/03/Air-Peace-Logo.png",
    "Ibom Air": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Ibom_Air_logo.png/1200px-Ibom_Air_logo.png",
    "Qatar Airways": "https://logowik.com/content/uploads/images/qatar-airways8336.jpg",
    "British Airways": "https://logowik.com/content/uploads/images/british-airways8001.jpg",
    "Emirates": "https://logowik.com/content/uploads/images/emirates-airline3232.logowik.com.webp",
    "Lufthansa": "https://logowik.com/content/uploads/images/lufthansa9090.jpg",
    "KLM": "https://logowik.com/content/uploads/images/klm-royal-dutch-airlines8141.jpg",
    "Delta": "https://logowik.com/content/uploads/images/delta-air-lines9725.jpg",
    "United Airlines": "https://logowik.com/content/uploads/images/united-airlines9763.jpg",
    "American Airlines": "https://logowik.com/content/uploads/images/american-airlines.jpg",
  };
  
  return airlineImages[airline] || "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=800";
};

// ────────────────────────────────────────────────
// FALLBACK DATA (Mock results for reliability)
// ────────────────────────────────────────────────
const MOCK_RESULTS: Record<string, SearchResult[]> = {
  flights: [
    { 
      id: "f-1", 
      provider: "Air Peace", 
      title: "Air Peace P47121", 
      subtitle: "Lagos (LOS) → Abuja (ABV)", 
      price: "£85", 
      time: "08:00 AM", 
      duration: "1h 15m", 
      type: "flights", 
      image: "https://logos-world.net/wp-content/uploads/2023/03/Air-Peace-Logo.png" 
    },
    { 
      id: "f-2", 
      provider: "Ibom Air", 
      title: "Ibom Air QI0320", 
      subtitle: "Lagos (LOS) → Abuja (ABV)", 
      price: "£92", 
      time: "10:30 AM", 
      duration: "1h 10m", 
      type: "flights", 
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Ibom_Air_logo.png/1200px-Ibom_Air_logo.png" 
    },
    { 
      id: "f-3", 
      provider: "Qatar Airways", 
      title: "Qatar QR1356", 
      subtitle: "Lagos (LOS) → Doha (DOH)", 
      price: "£1,250", 
      time: "01:15 PM", 
      duration: "6h 45m", 
      type: "flights" 
    }
  ],
  hotels: [
    { 
      id: "h-1", 
      provider: "Amadeus Premium", 
      title: "The Wheatbaker Lagos", 
      subtitle: "Ikoyi, Lagos", 
      price: "£145/night", 
      rating: 4.9, 
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800", 
      type: "hotels", 
      amenities: ["Free Wi-Fi", "Swimming Pool", "Spa"] 
    },
    { 
      id: "h-2", 
      provider: "Amadeus Premium", 
      title: "Radisson Blu Anchorage", 
      subtitle: "Victoria Island", 
      price: "£95/night", 
      rating: 4.7, 
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800", 
      type: "hotels", 
      amenities: ["Fitness center", "Restaurant"] 
    }
  ],
  'car-rentals': [
    { 
      id: "c-1", 
      provider: "Hertz Elite", 
      title: "Mercedes-Benz E-Class", 
      subtitle: "Lagos Int. Airport", 
      price: "£85/day", 
      rating: 4.8, 
      image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800", 
      type: "car-rentals", 
      amenities: ["Automatic", "AC"], 
      features: ["5 Seats", "Luxury"] 
    },
    { 
      id: "c-2", 
      provider: "Avis Premium", 
      title: "Range Rover Sport", 
      subtitle: "Abuja City Center", 
      price: "£120/day", 
      rating: 4.9, 
      image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800", 
      type: "car-rentals", 
      amenities: ["Automatic", "AC"], 
      features: ["5 Seats", "SUV"] 
    }
  ]
};

// Helper function to format GBP amounts
const formatGBP = (amount: number) => {
  return `£${amount.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export default function Home() {
  const [currentView, setCurrentView] = useState<string>("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User>({ name: "", email: "", role: "user" });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [activeTab, setActiveTab] = useState<'flights' | 'hotels' | 'cars'>('flights');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [contentSlug, setContentSlug] = useState<string | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<string>('details');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentBookingData, setCurrentBookingData] = useState<any>(null);
  const [currentProductType, setCurrentProductType] = useState<'FLIGHT_INTERNATIONAL' | 'HOTEL' | 'CAR_RENTAL'>('FLIGHT_INTERNATIONAL');
  const [isGuestBooking, setIsGuestBooking] = useState(false);

  // Helper function to get product type from selected item
  const getProductType = (item: SearchResult | null): 'FLIGHT_INTERNATIONAL' | 'HOTEL' | 'CAR_RENTAL' => {
    if (!item) return 'FLIGHT_INTERNATIONAL';
    
    switch (item.type) {
      case 'flights':
        return 'FLIGHT_INTERNATIONAL';
      case 'hotels':
        return 'HOTEL';
      case 'car-rentals':
        return 'CAR_RENTAL';
      default:
        return 'FLIGHT_INTERNATIONAL';
    }
  };
  const getProductTypeAndProvider = (item: SearchResult | null): {
    productType: 'FLIGHT_INTERNATIONAL' | 'HOTEL' | 'CAR_RENTAL',
    provider: 'DUFFEL' | 'AMADEUS' | 'TRIPS_AFRICA' | 'BOOKING_COM'
  } => {
    if (!item) return { productType: 'FLIGHT_INTERNATIONAL', provider: 'DUFFEL' };
    
    switch (item.type) {
      case 'flights':
        return { 
          productType: 'FLIGHT_INTERNATIONAL', 
          provider: 'DUFFEL'
        };
      case 'hotels':
        return { 
          productType: 'HOTEL', 
          provider: 'AMADEUS'
        };
      case 'car-rentals':
        return { 
          productType: 'CAR_RENTAL', 
          provider: 'AMADEUS'
        };
      default:
        return { productType: 'FLIGHT_INTERNATIONAL', provider: 'DUFFEL' };
    }
  };
  
  const prepareBookingData = (
    item: SearchResult | null, 
    searchParams: SearchParams | null, 
    productType: string, 
    passengerInfo?: any
  ): any => {
    console.log('🔧 Preparing booking data for backend API');
    
    const { provider } = getProductTypeAndProvider(item);
    const baseData: any = {
      productType,
      provider,
    };
  
    // Extract passenger info
    if (passengerInfo) {
      baseData.firstName = passengerInfo.firstName || 'Guest';
      baseData.lastName = passengerInfo.lastName || 'User';
      baseData.email = passengerInfo.email || 'guest@example.com';
      baseData.phone = passengerInfo.phone || '';
    }
  
    // Calculate amount
    let amount = 0;
    if (item?.price) {
      const priceStr = item.price.toString();
      const priceMatch = priceStr.match(/[\d,.]+/);
      if (priceMatch) {
        amount = parseFloat(priceMatch[0].replace(/,/g, ''));
      }
    }
    
    if (!amount || isNaN(amount)) {
      amount = productType === 'FLIGHT_INTERNATIONAL' ? 85 :
              productType === 'HOTEL' ? 145 :
              productType === 'CAR_RENTAL' ? 85 : 100;
    }
  
    baseData.amount = amount;
    baseData.currency = 'GBP';
  
    // Add type-specific data - FIXED STRUCTURE FOR EACH PRODUCT TYPE
    if (productType === 'FLIGHT_INTERNATIONAL' && item?.realData) {
      baseData.bookingData = {
        offerId: item.realData.offerId,
        origin: searchParams?.segments?.[0]?.from || 'LOS',
        destination: searchParams?.segments?.[0]?.to || 'ABV',
        departureDate: searchParams?.segments?.[0]?.date || new Date().toISOString().split('T')[0],
        airline: item.realData.airline,
        flightNumber: item.realData.flightNumber,
        cabinClass: searchParams?.cabinClass || 'economy',
        passengers: searchParams?.passengers || 1,
        // Include other flight-specific data as needed
        ...(item.realData.departureTime && { departureTime: item.realData.departureTime }),
        ...(item.realData.arrivalTime && { arrivalTime: item.realData.arrivalTime }),
      };
    } else if (productType === 'HOTEL') {
      baseData.bookingData = {
        hotelId: item?.id,
        offerId: item?.realData?.offerId || item?.id,
        hotelName: item?.title,
        checkInDate: searchParams?.checkInDate || new Date().toISOString().split('T')[0],
        checkOutDate: searchParams?.checkOutDate || 
                     new Date(Date.now() + 86400000).toISOString().split('T')[0],
        guests: searchParams?.adults || 1,
        rooms: searchParams?.rooms || 1,
        location: item?.subtitle || searchParams?.location || 'Lagos',
        roomType: 'Standard',
        // Include other hotel-specific data as needed
        ...(item?.realData?.price && { price: item.realData.price }),
        ...(item?.realData?.currency && { currency: item.realData.currency }),
      };
    } else if (productType === 'CAR_RENTAL') {
      baseData.bookingData = {
        offerId: item?.id,
        pickupLocationCode: searchParams?.carPickUp || 'LOS',
        pickupDateTime: searchParams?.pickupDateTime || new Date().toISOString(),
        dropoffLocationCode: searchParams?.carDropOff || searchParams?.carPickUp || 'LOS',
        dropoffDateTime: searchParams?.dropoffDateTime || 
                       new Date(Date.now() + 86400000).toISOString(),
        vehicleType: item?.realData?.vehicleType || item?.title,
        vehicleCategory: item?.realData?.vehicleCategory || 'Standard',
        // Include other car rental-specific data
        ...(item?.realData?.seats && { seats: item.realData.seats }),
        ...(item?.realData?.baggage && { baggage: item.realData.baggage }),
      };
    }
  
    return baseData;
  };
  const handleOpenPaymentModal = (bookingData: any) => {
    console.log('🚀 Opening payment modal with booking data:', bookingData);
    
    if (!bookingData) {
      console.error('❌ No booking data provided');
      return;
    }
  
    // Get product type and provider
    const { productType, provider } = getProductTypeAndProvider(selectedItem);
    console.log('📋 Product type:', productType, 'Provider:', provider);
  
    // Prepare booking data for each product type using the FIXED structure
    const prepareBackendBookingData = () => {
      const passengerFirstName = bookingData.passengerInfo?.firstName || 
                                bookingData.firstName || 
                                user.name?.split(' ')[0] || 
                                'Guest';
      const passengerLastName = bookingData.passengerInfo?.lastName || 
                               bookingData.lastName || 
                               user.name?.split(' ')[1] || 
                               'User';
      const passengerEmail = bookingData.passengerInfo?.email || 
                            bookingData.email || 
                            user.email || 
                            'guest@example.com';
      const passengerPhone = bookingData.passengerInfo?.phone || 
                            bookingData.phone || 
                            user.phone || 
                            '';
  
      // Base data for all product types
      const baseData: any = {
        productType,
        provider,
        firstName: passengerFirstName,
        lastName: passengerLastName,
        email: passengerEmail,
        phone: passengerPhone,
        currency: 'GBP'
      };
  
      // Calculate amount
      let amount = 0;
      if (selectedItem?.price) {
        const priceStr = selectedItem.price.toString();
        const priceMatch = priceStr.match(/[\d,.]+/);
        if (priceMatch) {
          amount = parseFloat(priceMatch[0].replace(/,/g, ''));
        }
      }
      
      // Default amounts per product type
      if (!amount || isNaN(amount)) {
        switch (productType) {
          case 'FLIGHT_INTERNATIONAL':
            amount = 85;
            break;
          case 'HOTEL':
            amount = selectedItem?.price?.includes('/night') ? 145 : 95;
            break;
          case 'CAR_RENTAL':
            amount = selectedItem?.price?.includes('/day') ? 85 : 120;
            break;
          default:
            amount = 100;
        }
      }
  
      baseData.amount = amount;
  
      // PRODUCT-SPECIFIC DATA - FIXED STRUCTURE
      // ------------------------------------------------------------
      
      // 1. FLIGHT BOOKING DATA
      if (productType === 'FLIGHT_INTERNATIONAL') {
        baseData.bookingData = {
          offerId: selectedItem?.realData?.offerId || selectedItem?.id,
          origin: searchParams?.segments?.[0]?.from || 'LOS',
          destination: searchParams?.segments?.[0]?.to || 'ABV',
          departureDate: searchParams?.segments?.[0]?.date || new Date().toISOString().split('T')[0],
          ...(selectedItem?.realData?.airline && { airline: selectedItem.realData.airline }),
          ...(selectedItem?.realData?.flightNumber && { flightNumber: selectedItem.realData.flightNumber }),
          ...(selectedItem?.realData?.departureTime && { departureTime: selectedItem.realData.departureTime }),
          ...(selectedItem?.realData?.arrivalTime && { arrivalTime: selectedItem.realData.arrivalTime }),
          cabinClass: searchParams?.cabinClass || 'economy',
          passengers: searchParams?.passengers || 1,
        };
      }
      
      // 2. HOTEL BOOKING DATA
      else if (productType === 'HOTEL') {
        baseData.bookingData = {
          hotelId: selectedItem?.id,
          offerId: selectedItem?.realData?.offerId || selectedItem?.id,
          hotelName: selectedItem?.title,
          checkInDate: searchParams?.checkInDate || new Date().toISOString().split('T')[0],
          checkOutDate: searchParams?.checkOutDate || 
                       new Date(Date.now() + 86400000).toISOString().split('T')[0],
          guests: searchParams?.adults || 1,
          rooms: searchParams?.rooms || 1,
          location: selectedItem?.subtitle || searchParams?.location || 'Lagos',
          roomType: 'Standard',
          ...(selectedItem?.realData?.price && { price: selectedItem.realData.price }),
          ...(selectedItem?.realData?.currency && { currency: selectedItem.realData.currency }),
        };
      }
      
      // 3. CAR RENTAL BOOKING DATA
      else if (productType === 'CAR_RENTAL') {
        baseData.bookingData = {
          offerId: selectedItem?.id,
          pickupLocationCode: searchParams?.carPickUp || 'LOS',
          pickupDateTime: searchParams?.pickupDateTime || new Date().toISOString(),
          dropoffLocationCode: searchParams?.carDropOff || searchParams?.carPickUp || 'LOS',
          dropoffDateTime: searchParams?.dropoffDateTime || 
                         new Date(Date.now() + 86400000).toISOString(),
          vehicleType: selectedItem?.realData?.vehicleType || selectedItem?.title,
          vehicleCategory: selectedItem?.realData?.vehicleCategory || 'Standard',
          ...(selectedItem?.realData?.seats && { seats: selectedItem.realData.seats }),
          ...(selectedItem?.realData?.baggage && { baggage: selectedItem.realData.baggage }),
        };
      }
  
      return baseData;
    };
  
    const prepareStripeData = () => {
      // Calculate amount
      let amount = 0;
      if (selectedItem?.price) {
        const priceStr = selectedItem.price.toString();
        const priceMatch = priceStr.match(/[\d,.]+/);
        if (priceMatch) {
          amount = parseFloat(priceMatch[0].replace(/,/g, ''));
        }
      }
      
      if (!amount || isNaN(amount)) {
        switch (productType) {
          case 'FLIGHT_INTERNATIONAL':
            amount = 85;
            break;
          case 'HOTEL':
            amount = 145;
            break;
          case 'CAR_RENTAL':
            amount = 85;
            break;
        }
      }
    
      const passengerFirstName = bookingData.passengerInfo?.firstName || 
                                bookingData.firstName || 
                                user.name?.split(' ')[0] || 
                                'Guest';
      const passengerLastName = bookingData.passengerInfo?.lastName || 
                               bookingData.lastName || 
                               user.name?.split(' ')[1] || 
                               'User';
      const passengerEmail = bookingData.passengerInfo?.email || 
                            bookingData.email || 
                            user.email || 
                            'guest@example.com';
    
      return {
        id: selectedItem?.id || `temp-${Date.now()}`,
        productType,
        provider,
        title: selectedItem?.title || 'Service',
        subtitle: selectedItem?.subtitle || '',
        price: amount,
        totalAmount: amount, // For Stripe display
        currency: 'GBP',
        // Include relevant IDs
        offerId: selectedItem?.realData?.offerId,
        hotelId: selectedItem?.id,
        carRentalId: selectedItem?.id,
        passengerInfo: {
          firstName: passengerFirstName,
          lastName: passengerLastName,
          email: passengerEmail,
          phone: bookingData.passengerInfo?.phone || bookingData.phone || user.phone || ''
        }
      };
    };
      // Create the complete booking data object
  const backendBookingData = prepareBackendBookingData();
  const stripeBookingData = prepareStripeData();

  console.log('📦 Backend Booking Data:', JSON.stringify(backendBookingData, null, 2));
  console.log('💳 Stripe Booking Data:', stripeBookingData);

  const finalBookingData = {
    // For Stripe/payment modal
    ...stripeBookingData,
    // Add backend data
    _backendData: backendBookingData,
    // Keep search params
    _searchParams: searchParams,
    // Add selected item reference
    _selectedItem: selectedItem
  };

  setCurrentBookingData(finalBookingData);
  setCurrentProductType(productType);
  setIsGuestBooking(!isLoggedIn);
  setShowPaymentModal(true);
};

  // Initialize Session
  useEffect(() => {
    const checkSession = async () => {
      const token = api.getStoredAuthToken();
      if (token) {
        try {
          const profile = await api.userApi.getProfile();
          if (profile) {
            setIsLoggedIn(true);
            setUser(profile);
          }
        } catch (e) {
          console.error('Session check failed:', e);
          api.clearAuthToken();
          setIsLoggedIn(false);
        }
      }
    };
    checkSession();
  }, []);

  const handleSearch = useCallback(async (data: SearchParams) => {
    setSearchParams(data);
    setIsSearching(true);
    setSearchResults([]);
    window.location.hash = 'results';
    
    // First, immediately show mock data for better UX
    if (data.type === 'flights') {
      setSearchResults(MOCK_RESULTS['flights']);
    } else if (data.type === 'hotels') {
      setSearchResults(MOCK_RESULTS['hotels']);
    } else if (data.type === 'car-rentals' || data.type === 'cars') {
      setSearchResults(MOCK_RESULTS['car-rentals']);
    }

    try {
      // 1. CAR RENTAL SEARCH
      if (data.type === 'car-rentals' || data.type === 'cars') {
        try {
          const carParams = {
            pickupLocationCode: data.pickupLocationCode || 'LOS',
            dropoffLocationCode: data.dropoffLocationCode || data.pickupLocationCode || 'LOS',
            pickupDateTime: data.pickupDateTime || new Date().toISOString(),
            dropoffDateTime: data.dropoffDateTime || new Date(Date.now() + 86400000).toISOString(),
            passengers: 2,
            currency: 'GBP'
          };
          const result = await api.carApi.searchAndTransformCarRentals(carParams, data.carPickUp || 'Airport', data.carPickUp || 'Airport');
          if (result.success && result.results.length > 0) {
            setSearchResults(result.results);
          } else {
            setSearchResults(MOCK_RESULTS['car-rentals']);
          }
        } catch (e) {
          console.error('Car rental search error:', e);
          setSearchResults(MOCK_RESULTS['car-rentals']);
        }
      } 
      
      // 2. HOTEL SEARCH
      else if (data.type === 'hotels') {
        try {
          const hotelParams = {
            cityCode: data.cityCode || 'LOS',
            checkInDate: data.checkInDate || new Date().toISOString().split('T')[0],
            checkOutDate: data.checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
            adults: 1,
            roomQuantity: 1,
            currency: 'GBP'
          };
          const result = await api.hotelApi.searchAndTransformHotels(hotelParams, data.location || 'Lagos');
          if (result.success && result.results.length > 0) {
            setSearchResults(result.results);
          } else {
            setSearchResults(MOCK_RESULTS['hotels']);
          }
        } catch (e) {
          console.error('Hotel search error:', e);
          setSearchResults(MOCK_RESULTS['hotels']);
        }
      } 
      
      // 3. FLIGHT SEARCH
      else {
        try {
          console.log("🚀 Starting real flight search with params:", data);
          
          // Improved airport code extraction function
          const extractAirportCode = (displayValue: string): string => {
            if (!displayValue || displayValue.trim() === '') {
              return '';
            }
            
            console.log('🔍 Extracting airport code from:', displayValue);
            
            const cleanValue = displayValue.trim();
            
            // Try different patterns
            const patterns = [
              /^([A-Z]{3})$/,
              /^([A-Z]{3})\b/,
              /\(([A-Z]{3})\)/,
              /^([A-Z]{3})-/,
              /^([A-Z]{3}),/,
              /([A-Z]{3})/
            ];
            
            for (const pattern of patterns) {
              const match = cleanValue.match(pattern);
              if (match && match[1]) {
                console.log('✅ Found code:', match[1]);
                return match[1];
              }
            }
            
            // Last resort
            const firstThree = cleanValue.substring(0, 3).toUpperCase();
            if (firstThree.match(/^[A-Z]{3}$/)) {
              console.log('✅ Using first 3 characters:', firstThree);
              return firstThree;
            }
            
            console.log('⚠️ Could not extract airport code');
            return '';
          };

          // Validate search data
          if (!data.segments?.[0]?.from || !data.segments?.[0]?.to) {
            console.log('⚠️ Missing segments, using mock data');
            setSearchResults(MOCK_RESULTS['flights']);
            setIsSearching(false);
            return;
          }

          const origin = extractAirportCode(data.segments[0].from);
          const destination = extractAirportCode(data.segments[0].to);
          
          console.log('📍 Extracted airport codes:', { origin, destination });

          if (!origin || !destination) {
            console.log('❌ Invalid airport codes, using mock data');
            setSearchResults(MOCK_RESULTS['flights']);
            setIsSearching(false);
            return;
          }

          let departureDate = data.segments?.[0]?.date;
          if (!departureDate) {
            departureDate = new Date().toISOString().split("T")[0];
          }

          let cabinClass = (data.cabinClass ?? "economy").toLowerCase();
          if (!["economy", "premium_economy", "business", "first"].includes(cabinClass)) {
            cabinClass = "economy";
          }

          const passengers = Math.max(1, Math.min(9, Number(data.passengers) || 1));

          // Build the search request object
          const searchRequest: any = {
            origin,
            destination,
            departureDate,
            passengers,
            cabinClass,
            currency: "GBP",
          };

          console.log("🔍 Search request:", searchRequest);

          // STEP 1: Create offer request
          console.log("📝 Step 1: Creating offer request...");
          const offerRequestResponse = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/bookings/search/flights', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchRequest)
          });

          if (!offerRequestResponse.ok) {
            const errorText = await offerRequestResponse.text();
            console.error('Offer request failed:', errorText);
            throw new Error(`Offer request failed: ${offerRequestResponse.status}`);
          }

          const offerRequestResult = await offerRequestResponse.json();
          console.log("📝 Offer request result:", offerRequestResult);

          if (!offerRequestResult.success || !offerRequestResult.data?.offer_request_id) {
            throw new Error('Failed to create offer request: ' + (offerRequestResult.message || 'Unknown error'));
          }

          const offerRequestId = offerRequestResult.data.offer_request_id;
          console.log("🆔 Offer Request ID:", offerRequestId);

          // STEP 2: Fetch offers
          console.log("📊 Step 2: Fetching offers...");
          const offersResponse = await fetch(`https://ebony-bruce-production.up.railway.app/api/v1/bookings/offers?offer_request_id=${offerRequestId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!offersResponse.ok) {
            const errorText = await offersResponse.text();
            console.error('Fetch offers failed:', errorText);
            throw new Error(`Fetch offers failed: ${offersResponse.status}`);
          }

          const offersResult = await offersResponse.json();
          console.log("📊 Offers result:", offersResult);

          // Process offers
          let flightOffers: any[] = [];
          
          if (Array.isArray(offersResult.data?.offers)) {
            flightOffers = offersResult.data.offers;
          } else if (Array.isArray(offersResult.data)) {
            flightOffers = offersResult.data;
          } else if (Array.isArray(offersResult.offers)) {
            flightOffers = offersResult.offers;
          } else if (offersResult.success && offersResult.data) {
            // Try to find offers in nested structure
            flightOffers = offersResult.data.offers || [];
          }

          console.log(`✅ Found ${flightOffers.length} flight offers`);

          if (flightOffers.length === 0) {
            console.log('No flights found, using mock data');
            setSearchResults(MOCK_RESULTS['flights']);
          } else {
            // Transform to SearchResult format
            const transformedResults: SearchResult[] = flightOffers.map((offer: any, index: number) => {
              // Extract slices
              const slices = offer.slices || 
                           offer.itineraries?.[0]?.slices || 
                           offer.segments || 
                           [];

              const firstSlice = slices[0] || {};
              const lastSlice = slices[slices.length - 1] || {};

              // Get airline name
              const airline = offer.owner?.name || 
                            firstSlice.marketing_carrier?.name || 
                            firstSlice.airline || 
                            "Unknown Airline";
              
              // Get flight number
              const flightNumber = firstSlice.flight_number || 
                                 firstSlice.flightNumber || 
                                 `FL${1000 + index}`;
              
              // Get price
              let totalPrice = 0;
              let currency = "GBP";
              
              if (offer.total_amount) {
                totalPrice = offer.total_amount;
              } else if (offer.total_price) {
                totalPrice = offer.total_price;
              } else if (offer.amount) {
                totalPrice = offer.amount;
              } else if (offer.price?.amount) {
                totalPrice = offer.price.amount;
              } else if (offer.price?.total) {
                totalPrice = offer.price.total;
              } else {
                totalPrice = 85 + Math.floor(Math.random() * 100);
              }
              
              if (offer.total_currency) {
                currency = offer.total_currency;
              } else if (offer.currency) {
                currency = offer.currency;
              } else if (offer.price?.currency) {
                currency = offer.price.currency;
              }

              // Calculate duration
              let durationMinutes = offer.total_duration || 90;
              if (offer.duration_minutes) {
                durationMinutes = offer.duration_minutes;
              } else if (firstSlice.duration_minutes && lastSlice.duration_minutes) {
                durationMinutes = firstSlice.duration_minutes + (lastSlice.duration_minutes || 0);
              }

              const hours = Math.floor(durationMinutes / 60);
              const minutes = durationMinutes % 60;
              const durationStr = `${hours}h ${minutes.toString().padStart(2, "0")}m`;

              // Calculate stops
              const stopsCount = Math.max(0, slices.length - 1);
              const stopsText = stopsCount === 0 ? "Direct" : stopsCount === 1 ? "1 stop" : `${stopsCount} stops`;

              // Format departure time
              let departureTime = firstSlice.departing_at || 
                                firstSlice.departure_time || 
                                firstSlice.departs_at;
              
              let timeDisplay = "08:00";
              if (departureTime) {
                try {
                  const dep = new Date(departureTime).toLocaleTimeString([], { 
                    hour: "2-digit", 
                    minute: "2-digit", 
                    hour12: false 
                  });
                  timeDisplay = dep;
                } catch (e) {
                  // Handle time formatting errors silently
                }
              }

              // Format price
              const priceSymbol = currency === 'GBP' ? '£' : 
                                currency === 'NGN' ? '₦' : 
                                currency === 'EUR' ? '€' : 
                                currency === 'USD' ? '$' : currency;
              
              const formattedPrice = `${priceSymbol}${Number(totalPrice).toLocaleString('en-GB', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}`;

              // Get flight origin and destination
              const flightOrigin = firstSlice.origin?.iata_code || 
                                  firstSlice.origin?.code || 
                                  firstSlice.origin || 
                                  origin;
                                  
              const flightDestination = lastSlice.destination?.iata_code || 
                                       lastSlice.destination?.code || 
                                       lastSlice.destination || 
                                       destination;

              const subtitle = `${flightOrigin} → ${flightDestination}`;

              return {
                id: offer.id || `flight-${index}`,
                provider: airline,
                title: `${airline} ${flightNumber}`,
                subtitle: subtitle,
                price: formattedPrice,
                time: timeDisplay,
                duration: durationStr,
                rating: 4.0 + Math.random() * 1.0,
                image: getFlightImage(airline),
                amenities: ["Seat Selection", "Cabin Baggage"],
                features: [stopsText, durationStr, cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)],
                type: "flights" as const,
                realData: {
                  id: offer.id,
                  offerId: offer.id,
                  offerRequestId: offerRequestId,
                  departureTime,
                  arrivalTime: lastSlice.arriving_at || lastSlice.arrival_time || lastSlice.arrives_at,
                  airline,
                  flightNumber,
                  totalDuration: durationMinutes,
                  stops: stopsCount,
                  price: Number(totalPrice),
                  currency,
                  slices: slices,
                  owner: offer.owner,
                },
              };
            });

            console.log(`✅ Transformed ${transformedResults.length} results`);
            
            // Filter out invalid results
            const validResults = transformedResults.filter(result => 
              result.price && !result.price.includes('£0') && !result.price.includes('0')
            );
            
            if (validResults.length > 0) {
              setSearchResults(validResults);
            } else {
              console.log('No valid flight results, using mock data');
              setSearchResults(MOCK_RESULTS['flights']);
            }
          }
        } catch (error: any) {
          console.error("Flight search failed:", error);
          console.log('Using mock flight data due to error');
          setSearchResults(MOCK_RESULTS['flights']);
        }
      }
    } catch (e) {
      console.error('Final Search Catch:', e);
      // Use mock data for all types on final error
      if (data.type === 'flights') setSearchResults(MOCK_RESULTS['flights']);
      else if (data.type === 'hotels') setSearchResults(MOCK_RESULTS['hotels']);
      else if (data.type === 'car-rentals' || data.type === 'cars') setSearchResults(MOCK_RESULTS['car-rentals']);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // --- ROUTING ENGINE ---
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (hash === 'home') {
        setCurrentView('home');
      } else if (hash === 'flights' || hash === 'hotels' || hash === 'cars') { 
        setCurrentView('home'); 
        setActiveTab(hash as any); 
      } else if (hash === 'results') { 
        if (searchResults.length === 0 && !isSearching) {
          window.location.hash = 'home';
        } else {
          setCurrentView('results');
        }
      } else if (hash.startsWith('profile')) { 
        const subTab = hash.split('/')[1] || 'details'; 
        setActiveProfileTab(subTab); 
        setCurrentView('profile'); 
      } else if (hash.startsWith('content/')) { 
        const slug = decodeURIComponent(hash.split('content/')[1]);
        if (slug === 'AboutUs') setCurrentView('about'); 
        else { 
          setContentSlug(slug); 
          setCurrentView('content'); 
        }
      } else if (hash === 'success') {
        setCurrentView('success');
      } else if (hash === 'failed') {
        setCurrentView('failed');
      } else if (hash === 'admin') {
        setCurrentView('admin-login');
      } else if (hash === 'about') {
        setCurrentView('about');
      } else if (hash === 'review') {
        setCurrentView('review');
      } else if (hash === 'hotel-details') {
        setCurrentView('hotel-details');
      } else if (hash === 'car-details') {
        setCurrentView('car-details');
      } else if (hash === 'flight-details') {
        setCurrentView('flight-details');
      } else {
        setCurrentView('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [searchResults.length, isSearching]);

  const handleSelectResult = (item: SearchResult) => {
    setSelectedItem(item);
    if (item.type === 'hotels') {
      window.location.hash = 'hotel-details';
    } else if (item.type === 'car-rentals') {
      window.location.hash = 'car-details';
    } else if (item.type === 'flights') {
      window.location.hash = 'flight-details';
    }
  };

  const handleGoHome = () => { 
    window.location.hash = 'home'; 
    setSearchResults([]); 
    setSelectedItem(null); 
    setSearchParams(null);
  };

  const handlePaymentSuccess = (bookingId: string) => {
    console.log('🎉 Payment successful! Booking ID:', bookingId);
    console.log('📋 Product Type:', currentProductType);
    
    setShowPaymentModal(false);
    
    // Store booking info based on product type
    const bookingInfo = {
      bookingId,
      productType: currentProductType,
      provider: currentBookingData?.provider,
      title: currentBookingData?.title,
      amount: currentBookingData?.totalAmount,
      passengerName: currentBookingData?.passengerInfo?.firstName 
        ? `${currentBookingData.passengerInfo.firstName} ${currentBookingData.passengerInfo.lastName}`
        : 'Guest',
      date: new Date().toLocaleDateString()
    };
    
    localStorage.setItem('currentBookingInfo', JSON.stringify(bookingInfo));
    localStorage.setItem('currentBookingId', bookingId);
    
    // Clear booking data
    setCurrentBookingData(null);
    
    // Redirect to success page
    setTimeout(() => {
      window.location.hash = 'success';
    }, 500);
  };

  const handleReviewTripSuccess = () => {
    // This is called when ReviewTrip successfully creates a booking
    // We'll redirect to success page
    window.location.hash = 'success';
  };

  const handleReviewTripFailure = () => {
    // This is called when ReviewTrip fails to create a booking
    window.location.hash = 'failed';
  };

  const renderContent = () => {
    switch (currentView) {
      case 'admin-login':
        return <AdminLogin onLoginSuccess={() => setCurrentView('admin-dashboard')} onBack={handleGoHome} />;
      case 'admin-dashboard':
        return <AdminDashboard onLogout={handleGoHome} />;
      case 'results':
        return (
          <SearchResults 
            results={searchResults} 
            searchParams={searchParams} 
            onClear={handleGoHome} 
            onSelect={handleSelectResult} 
            isLoading={isSearching}
          />
        );
      case 'hotel-details':
        return (
          <HotelDetails 
            item={selectedItem} 
            searchParams={searchParams} 
            onBack={() => window.location.hash = 'results'} 
            onBook={() => window.location.hash = 'review'} 
          />
        );
      case 'car-details':
        return (
          <CarDetails 
            item={selectedItem} 
            searchParams={searchParams} 
            onBack={() => window.location.hash = 'results'} 
            onBook={() => window.location.hash = 'review'} 
          />
        );
      case 'flight-details':
        return (
          <FlightDetails 
            item={selectedItem} 
            searchParams={searchParams} 
            onBack={() => window.location.hash = 'results'} 
            onBook={() => window.location.hash = 'review'} 
          />
        );
      case 'review':
        return (
          <ReviewTrip 
            item={selectedItem} 
            searchParams={searchParams} 
            onBack={() => window.location.hash = 
              selectedItem?.type === 'hotels' ? 'hotel-details' : 
              selectedItem?.type === 'car-rentals' ? 'car-details' : 
              selectedItem?.type === 'flights' ? 'flight-details' : 'results'}
            isLoggedIn={isLoggedIn}
            user={user}
            onSuccess={handleReviewTripSuccess}
            onFailure={handleReviewTripFailure}
            onOpenPaymentModal={handleOpenPaymentModal}
            productType={getProductType(selectedItem)}
          />
        );
        case 'success':
          const bookingInfoStr = localStorage.getItem('currentBookingInfo');
          let bookingInfo = null;
          
          if (bookingInfoStr) {
            try {
              bookingInfo = JSON.parse(bookingInfoStr);
            } catch (e) {
              console.error('Error parsing booking info:', e);
            }
          }
          
          // Get fallback info
          const bookingId = currentBookingData?.id || 
                            selectedItem?.realData?.offerId || 
                            localStorage.getItem('currentBookingId') || 
                            `BOOK-${Date.now()}`;
          
          return (
            <BookingSuccess 
              bookingId={bookingId}
              bookingDetails={bookingInfo || {
                productType: currentProductType,
                provider: currentBookingData?.provider || selectedItem?.provider,
                title: currentBookingData?.title || selectedItem?.title,
                amount: currentBookingData?.totalAmount || selectedItem?.price,
                passengerName: currentBookingData?.passengerInfo?.firstName 
                  ? `${currentBookingData.passengerInfo.firstName} ${currentBookingData.passengerInfo.lastName}`
                  : user.name || 'Guest'
              }}
              onBack={handleGoHome}
              isGuest={!isLoggedIn}
            />
          );
      case 'failed':
        return (
          <BookingFailed 
            item={selectedItem} 
            searchParams={searchParams} 
            onBack={handleGoHome} 
            onRetry={() => window.location.hash = 'review'} 
          />
        );
      case 'profile':
        return (
          <Profile 
            user={user} 
            activeTab={activeProfileTab} 
            onUpdateUser={(data) => setUser(prev => ({ ...prev, ...data }))} 
            onBack={handleGoHome} 
            onSignOut={() => { 
              api.clearAuthToken(); 
              setIsLoggedIn(false); 
              handleGoHome(); 
            }} 
            onBookItem={handleSelectResult} 
          />
        );
      case 'about':
        return <AboutUs onBack={handleGoHome} />;
      case 'content':
        if (contentSlug && pageContentMap[contentSlug]) {
          return (
            <ContentPage 
              content={pageContentMap[contentSlug]} 
              onBack={handleGoHome} 
            />
          );
        }
        return null;
      default:
        return (
          <>
            <Hero 
              onSearch={handleSearch} 
              loading={isSearching} 
              activeSearchTab={activeTab} 
              onTabChange={setActiveTab} 
            />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-32">
              <Partners />
              <ExclusiveOffers onTypeClick={(type) => { 
                window.location.hash = type; 
                setActiveTab(type); 
              }} />
              <TrendingDestinations onCityClick={(city) => handleSearch({ 
                type: 'flights', 
                segments: [{ 
                  from: 'LOS', 
                  to: city.code || 'ABV', 
                  date: new Date().toISOString().split('T')[0] 
                }],
                passengers: 1,
                cabinClass: 'economy'
              } as any)} />
              <HomesGrid />
              <CarRentals />
              <SpecializedServices onServiceClick={(s) => window.location.hash = `content/${s}`} />
            </main>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar 
        isLoggedIn={isLoggedIn} 
        user={user} 
        activeTab={activeTab}
        onSignIn={() => { setAuthMode('login'); setIsAuthOpen(true); }}
        onRegister={() => { setAuthMode('register'); setIsAuthOpen(true); }}
        onLogoClick={handleGoHome}
        onTabClick={(t) => { window.location.hash = t; setActiveTab(t); }}
        onProfileClick={() => window.location.hash = 'profile'}
        onSignOut={() => { api.clearAuthToken(); setIsLoggedIn(false); handleGoHome(); }}
        onProfileTabSelect={(tab) => window.location.hash = `profile/${tab}`}
      />
      
      <div className="flex-1">
        {renderContent()}
      </div>

      <Newsletter />
      <Footer 
        onLogoClick={handleGoHome} 
        onAdminClick={() => window.location.hash = 'admin'} 
      />
      
      {isLoggedIn && (
        <button 
          onClick={() => setIsAiOpen(!isAiOpen)} 
          className="fixed bottom-8 right-8 w-16 h-16 bg-[#33a8da] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition z-50 animate-bounce"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {isAiOpen && <AIAssistant onClose={() => setIsAiOpen(false)} />}
      
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        initialMode={authMode}
        onLoginSuccess={(data) => {
          setIsLoggedIn(true);
          setUser({ ...user, ...data });
          setIsAuthOpen(false);
        }}
      />

      {showPaymentModal && currentBookingData && (
        <PaymentModal
          bookingData={currentBookingData}
          passengerInfo={currentBookingData.passengerInfo}
          isGuest={isGuestBooking}
          productType={currentProductType}
          onSuccess={handlePaymentSuccess}
          onCancel={() => {
            setShowPaymentModal(false);
            setCurrentBookingData(null);
          }}
        />
      )}
    </div>
  );
}
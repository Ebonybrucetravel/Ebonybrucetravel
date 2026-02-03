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
import BookingSuccess from "../components/BookingSuccess";
import BookingFailed from "../components/BookingFailed";
import AuthModal from "../components/AuthModal";
import ContentPage from '../components/ContentPage';
import AboutUs from '../components/AboutUs';
import Profile from "../components/Profile";
import AdminLogin from "../components/AdminLogin";
import AdminDashboard from "../components/AdminDashboard";
import CancelBooking from "../components/CancelBooking";
import { 
  bookingApi, 
  paymentApi, 
  hotelApi, 
  searchFlightsWithPagination, 
  formatHotelSearchParams 
} from "../lib/api";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface User {
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

export interface SearchSegment {
  from: string;
  to: string;
  date: string;
}

export interface SearchParams {
  type: "flights" | "hotels" | "car-rentals";
  tripType?: "one-way" | "round-trip" | "multi-city";
  segments?: SearchSegment[];
  travellers?: number;
  cabinClass?: string;
  returnDate?: string;
  location?: string;
  cityCode?: string;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number;
  rooms?: number;
  currency?: string;
  carPickUp?: string;
  pickUpDate?: string;
  dropOffDate?: string;
  [key: string]: any;
}

export interface SearchResult {
  id: string;
  provider: string;
  title: string;
  subtitle: string;
  price: string;
  totalPrice?: string;
  time?: string;
  duration?: string;
  stops?: string;
  rating?: number;
  baggage?: string;
  aircraft?: string;
  layoverDetails?: string;
  image?: string;
  amenities?: string[];
  features?: string[];
  type?: "flights" | "hotels" | "car-rentals";
  realData?: {
    offerId?: string;
    hotelId?: string;
    departureTime?: string;
    arrivalTime?: string;
    airline?: string;
    flightNumber?: string;
    totalDuration?: number;
    stops?: number;
    price?: number;
    basePrice?: number;
    currency?: string;
    guests?: number;
    rooms?: number;
    nights?: number;
    checkInDate?: string;
    checkOutDate?: string;
    roomType?: string;
    bedType?: string;
    beds?: number;
    isRefundable?: boolean;
    cancellationDeadline?: string;
    cancellationPolicy?: string;
  };
}

export interface Booking {
  id: string;
  type: "flight" | "hotel" | "car";
  title: string;
  provider: string;
  subtitle: string;
  date: string;
  duration?: string;
  status: "Confirmed" | "Completed" | "Cancel" | "Active";
  price: string;
  currency: string;
  iconBg: string;
  imageUrl?: string;
  bookingReference?: string;
  time?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  bookingData?: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    arrivalDate?: string;
    airline?: string;
    flightNumber?: string;
    hotelName?: string;
    hotelId?: string;
    carModel?: string;
    checkInDate?: string;
    checkOutDate?: string;
    pickUpDate?: string;
    dropOffDate?: string;
    guests?: number;
    rooms?: number;
    nights?: number;
  };
}

const FALLBACK_RESULTS: Record<string, SearchResult[]> = {
  flights: [
    {
      id: "fb-1",
      provider: "Air Peace",
      title: "Flight P47124",
      subtitle: "Standard Economy • Lagos (LOS) → Abuja (ABV)",
      price: "₦45,000",
      time: "08:00 AM - 09:15 AM",
      duration: "1h 15m",
      stops: "Direct",
      rating: 4.5,
      baggage: "Cabin: 7kg, Checked: 23kg",
      aircraft: "Boeing 737",
      layoverDetails: "Direct flight",
      image:
        "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400",
      type: "flights" as const,
    },
    {
      id: "fb-2",
      provider: "Ibom Air",
      title: "Flight IB123",
      subtitle: "Business Class • Lagos (LOS) → Abuja (ABV)",
      price: "₦85,000",
      time: "10:00 AM - 11:15 AM",
      duration: "1h 15m",
      stops: "Direct",
      rating: 4.8,
      baggage: "Cabin: 10kg, Checked: 32kg",
      aircraft: "Airbus A320",
      layoverDetails: "Direct flight",
      image:
        "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&q=80&w=400",
      type: "flights" as const,
    },
    {
      id: "fb-3",
      provider: "Arik Air",
      title: "Flight W310",
      subtitle: "Economy • Lagos (LOS) → Abuja (ABV)",
      price: "₦38,000",
      time: "02:00 PM - 03:15 PM",
      duration: "1h 15m",
      stops: "Direct",
      rating: 4.3,
      baggage: "Cabin: 5kg, Checked: 20kg",
      aircraft: "Boeing 737",
      layoverDetails: "Direct flight",
      image:
        "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400",
      type: "flights" as const,
    },
  ],
  hotels: [
    {
      id: "h-1",
      provider: "Booking.com",
      title: "Luxury Suite at Eko Hotel",
      subtitle: "Lagos • 5-star • Ocean View",
      price: "₦95,000/night",
      totalPrice: "₦285,000 total",
      rating: 4.8,
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400",
      amenities: [
        "Free WiFi",
        "Swimming Pool",
        "Spa",
        "Restaurant",
        "Fitness Center",
        "Ocean View",
      ],
      features: ["Luxury Suite", "2 guests", "3 nights", "Ocean View"],
      type: "hotels" as const,
    },
    {
      id: "h-2",
      provider: "Hyatt",
      title: "Standard King Room",
      subtitle: "Lagos • 5-star • City View",
      price: "₦75,000/night",
      totalPrice: "₦225,000 total",
      rating: 4.7,
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400",
      amenities: [
        "Free WiFi",
        "Breakfast Included",
        "Room Service",
        "Bar",
        "City View",
      ],
      features: ["Standard King Room", "2 guests", "3 nights", "City View"],
      type: "hotels" as const,
    },
    {
      id: "h-3",
      provider: "Hilton",
      title: "Executive Suite",
      subtitle: "Lagos • 5-star • Beach Front",
      price: "₦120,000/night",
      totalPrice: "₦360,000 total",
      rating: 4.9,
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400",
      amenities: [
        "Free WiFi",
        "Private Beach",
        "Spa",
        "Infinity Pool",
        "Butler Service",
      ],
      features: ["Executive Suite", "2 guests", "3 nights", "Beach Front"],
      type: "hotels" as const,
    },
  ],
  "car-rentals": [
    {
      id: "cr-1",
      provider: "Hertz",
      title: "Toyota Camry 2024",
      subtitle: "Lagos Airport Pickup",
      price: "₦25,000/day",
      duration: "Unlimited km",
      rating: 4.6,
      image:
        "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&q=80&w=400",
      type: "car-rentals" as const,
    },
    {
      id: "cr-2",
      provider: "Avis",
      title: "Mercedes E-Class",
      subtitle: "Lagos Island Delivery",
      price: "₦45,000/day",
      duration: "Unlimited km",
      rating: 4.8,
      image:
        "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&q=80&w=400",
      type: "car-rentals" as const,
    },
    {
      id: "cr-3",
      provider: "Enterprise",
      title: "Range Rover Sport",
      subtitle: "Anywhere in Lagos",
      price: "₦65,000/day",
      duration: "Unlimited km",
      rating: 4.7,
      image:
        "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&q=80&w=400",
      type: "car-rentals" as const,
    },
  ],
};

export default function Home() {
  const [currentView, setCurrentView] = useState<
    "home" | "profile" | "hotel-details" | "review" | "success" | "failed" | "admin-login" | "admin-dashboard" | "content-page" | "about-us" | "cancel"
  >("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>({
    name: "",
    email: "",
    profilePicture: "https://ui-avatars.com/api/?name=Guest&background=f4d9c6&color=9a7d6a&size=56",
    avatar: "https://ui-avatars.com/api/?name=Guest&background=f4d9c6&color=9a7d6a&size=56",
    dob: "1992-05-15",
    gender: "Male",
    phone: "+234 816 500 000",
    role: "user",
  });
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [searchTime, setSearchTime] = useState<number>(0);
  const [isRealApiUsed, setIsRealApiUsed] = useState(false);
  const [apiValidationErrors, setApiValidationErrors] = useState<string[]>([]);
  const [contentSlug, setContentSlug] = useState<string | null>(null);
  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  
  // SINGLE SOURCE OF TRUTH: Active tab state shared between Navbar and SearchBox
  const [activeTab, setActiveTab] = useState<'flights' | 'hotels' | 'cars'>('flights');

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [userBookings, setUserBookings] = useState<Booking[]>([
    {
      id: "1",
      type: "flight",
      title: "Lagos(LOS) to Abuja(ABJ)",
      provider: "Air Peace",
      subtitle: "Flight BA117 . Economy",
      date: "Dec 26 – Dec 28, 2025",
      duration: "1h 15m Non-Stop",
      status: "Confirmed",
      price: "75,000.00",
      currency: "NGN",
      iconBg: "bg-blue-50",
      imageUrl:
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=600",
      bookingReference: "#LND-8824",
      time: "08:00 AM",
      paymentStatus: "paid",
      bookingData: {
        origin: "Lagos (LOS)",
        destination: "Abuja (ABJ)",
        departureDate: "2025-12-26T08:00:00",
        arrivalDate: "2025-12-26T09:15:00",
        airline: "Air Peace",
        flightNumber: "BA117"
      }
    },
    {
      id: "2",
      type: "hotel",
      title: "Hyatt Tokyo",
      provider: "Hyatt",
      subtitle: "Standard King Room . 2 Guests, 5 Nights",
      date: "Dec 26 – Dec 28, 2025",
      status: "Completed",
      price: "1,500.00",
      currency: "$",
      iconBg: "bg-yellow-50",
      imageUrl:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
      bookingReference: "#HTL-5678",
      paymentStatus: "paid",
      bookingData: {
        hotelName: "Hyatt Tokyo",
        checkInDate: "2025-12-26T14:00:00",
        checkOutDate: "2025-12-31T11:00:00",
        guests: 2,
        nights: 5
      }
    },
    {
      id: "3",
      type: "car",
      title: "Tesla Model Y",
      provider: "Hertz",
      subtitle: "Lagos Airport • Full-to-Full",
      date: "Jan 15 – Jan 18, 2026",
      status: "Active",
      price: "45,000.00",
      currency: "NGN",
      iconBg: "bg-purple-50",
      imageUrl:
        "https://images.unsplash.com/photo-1502877338535-766e3a6052c0?auto=format&fit=crop&q=80&w=800",
      bookingReference: "#CAR-1234",
      paymentStatus: "paid",
      bookingData: {
        carModel: "Tesla Model Y",
        pickUpDate: "2026-01-15T10:00:00",
        dropOffDate: "2026-01-18T10:00:00"
      }
    },
  ]);

  const [activeProfileTab, setActiveProfileTab] = useState<string>("details");
  const [itemToCancel, setItemToCancel] = useState<any>(null);

  const showNav = currentView !== "admin-login" && currentView !== "admin-dashboard";

  // Restore session (user, token, bookings)
  useEffect(() => {
    const savedUser = localStorage.getItem("travelUser");
    const savedToken = localStorage.getItem("authToken");
    const savedBookings = localStorage.getItem("travelBookings");

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setIsLoggedIn(true);
      } catch (err) {
        console.error("Failed to restore user:", err);
        localStorage.removeItem("travelUser");
      }
    }

    if (savedToken) {
      setAuthToken(savedToken);
    }

    if (savedBookings) {
      try {
        setUserBookings(JSON.parse(savedBookings));
      } catch (err) {
        console.error("Failed to restore bookings:", err);
        localStorage.removeItem("travelBookings");
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && user.name && user.email) {
      localStorage.setItem("travelUser", JSON.stringify(user));
    } else if (!isLoggedIn) {
      localStorage.removeItem("travelUser");
    }
  }, [user, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem("travelBookings", JSON.stringify(userBookings));
    }
  }, [userBookings, isLoggedIn]);

  // Helper function to format hotel search data
  const formatHotelSearchData = useCallback(async (data: SearchParams) => {
    try {
      // Format hotel search parameters using the API helper
      const hotelParams = await formatHotelSearchParams(
        data.location || "Lagos",
        data.checkInDate,
        data.checkOutDate,
        data.guests || 2,
        data.rooms || 1
      );

      return hotelParams;
    } catch (error) {
      console.error("❌ Failed to format hotel params:", error);
      // Return fallback params
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const checkOut = new Date(tomorrow);
      checkOut.setDate(tomorrow.getDate() + 3);
      
      return {
        cityCode: data.location?.toLowerCase().includes('lagos') ? 'LOS' : 
                  data.location?.toLowerCase().includes('abuja') ? 'ABV' : 
                  data.location?.toLowerCase().includes('london') ? 'LON' : 'LON',
        checkInDate: data.checkInDate || tomorrow.toISOString().split('T')[0],
        checkOutDate: data.checkOutDate || checkOut.toISOString().split('T')[0],
        adults: data.guests || 2,
        roomQuantity: data.rooms || 1,
        currency: 'GBP',
        bestRateOnly: true
      };
    }
  }, []);

  // UPDATED: Unified booking handler using bookingApi with payment flow
  const handleCreateBooking = useCallback(async (bookingData: any, isGuest: boolean = false) => {
    try {
      console.log("📤 Creating booking with data:", bookingData);
      
      // Use the booking API from lib/api
      const result = await bookingApi.createBooking(bookingData);
      
      if (result && (result.id || result.data?.id)) {
        console.log("✅ Booking created successfully:", result);
        
        // Store the booking data for payment
        const bookingId = result.id || result.data?.id;
        const bookingRef = result.bookingReference || result.data?.bookingReference || `#${Date.now().toString().slice(-6)}`;
        
        // FIX: Use the basePrice directly (it's already in cents/kobo)
        // Don't divide by 100 since Stripe expects cents/kobo
        const bookingInfo = {
          id: bookingId,
          bookingReference: bookingRef,
          totalAmount: bookingData.basePrice / 100, // Convert from cents to display amount
          currency: bookingData.currency,
          passengerInfo: bookingData.passengerInfo,
          isGuest: isGuest,
          ...result
        };
        
        setCurrentBooking(bookingInfo);
        
        // Show payment modal
        setShowPayment(true);
        
        return { 
          success: true, 
          data: result,
          bookingInfo 
        };
      } else {
        console.error("❌ Booking creation failed:", result);
        return { 
          success: false, 
          error: result?.message || result?.error || "Booking creation failed" 
        };
      }
    } catch (error: any) {
      console.error("❌ Booking error:", error);
      return { 
        success: false, 
        error: error.message || "Network error – please check your connection" 
      };
    }
  }, []);

  // Handle payment completion
  const handlePaymentComplete = useCallback(async (bookingId: string, isGuest: boolean = false) => {
    try {
      console.log("💳 Processing payment for booking:", bookingId);
      
      // Close payment modal
      setShowPayment(false);
      
      // Create local booking record
      if (selectedItem && searchParams) {
        const newBooking: Booking = {
          id: bookingId || Date.now().toString(),
          type: selectedItem.type === "flights" ? "flight" : selectedItem.type === "hotels" ? "hotel" : "car",
          title: selectedItem.type === "flights" 
            ? `${searchParams.segments?.[0]?.from || "LOS"} to ${searchParams.segments?.[0]?.to || "ABV"}`
            : selectedItem.title,
          provider: selectedItem.provider,
          subtitle: selectedItem.subtitle,
          date: new Date().toLocaleDateString("en-US", { 
            year: "numeric", 
            month: "short", 
            day: "numeric" 
          }),
          duration: selectedItem.duration,
          status: "Confirmed",
          price: selectedItem.price,
          currency: "NGN",
          iconBg: selectedItem.type === "flights" ? "bg-blue-50" : selectedItem.type === "hotels" ? "bg-yellow-50" : "bg-purple-50",
          imageUrl: selectedItem.image,
          bookingReference: currentBooking?.bookingReference || `#${Date.now().toString().slice(-6)}`,
          time: new Date().toLocaleTimeString([], { 
            hour: "2-digit", 
            minute: "2-digit" 
          }),
          paymentStatus: "paid",
          bookingData: {
            origin: searchParams.segments?.[0]?.from,
            destination: searchParams.segments?.[0]?.to,
            departureDate: searchParams.segments?.[0]?.date,
            airline: selectedItem.provider,
            flightNumber: selectedItem.realData?.flightNumber,
            ...(selectedItem.type === "hotels" && selectedItem.realData && {
              hotelId: selectedItem.realData.hotelId,
              hotelName: selectedItem.title,
              checkInDate: selectedItem.realData.checkInDate,
              checkOutDate: selectedItem.realData.checkOutDate,
              guests: selectedItem.realData.guests,
              rooms: selectedItem.realData.rooms,
              nights: selectedItem.realData.nights
            })
          }
        };

        setUserBookings(prev => [newBooking, ...prev]);
      }
      
      // Navigate to success page
      setCurrentView("success");
      
      return { success: true };
    } catch (error: any) {
      console.error("❌ Payment completion error:", error);
      setCurrentView("failed");
      return { 
        success: false, 
        error: error.message || "Payment processing failed" 
      };
    }
  }, [selectedItem, searchParams, currentBooking]);

  // UPDATED: Booking completion with payment flow - now handles hotels
  const handleBookingComplete = useCallback(async (guestData?: any) => {
    if (!selectedItem || !searchParams) {
      console.error("Cannot complete booking: missing item or params");
      setCurrentView("failed");
      return;
    }

    // Determine booking type
    const isHotel = selectedItem.type === "hotels";
    const isCar = selectedItem.type === "car-rentals";
    const isFlight = selectedItem.type === "flights";

    // Extract numeric price from realData if available, otherwise from price string
    let basePrice = 0;
    if (selectedItem.realData?.price) {
      basePrice = selectedItem.realData.price;
    } else {
      const priceStr = selectedItem.price.replace(/[^\d.]/g, '');
      basePrice = parseFloat(priceStr) || (isHotel ? 95000 : 150);
    }
    
    const priceInCents = Math.round(basePrice * 100); // Convert to cents/kobo

    // Format dates
    const departureDate = new Date(searchParams.segments?.[0]?.date || Date.now());
    const arrivalDate = new Date(departureDate.getTime() + 90 * 60 * 1000); // 90 minutes later

    // HOTEL SPECIFIC: Get hotel data from selected item
    const hotelData = selectedItem.realData;

    // Determine provider and product type based on item type
    let provider = "BOOKING_COM"; // Default for hotels
    let productType = "HOTEL";
    
    if (isFlight) {
      // Check if it's a domestic or international flight
      const isDomesticFlight = selectedItem.type === "flights" && 
        ((selectedItem.subtitle && selectedItem.subtitle.includes("Lagos") && selectedItem.subtitle.includes("Abuja")) ||
         (searchParams.segments?.[0]?.from?.includes("LOS") && searchParams.segments?.[0]?.to?.includes("ABV")) ||
         (searchParams.segments?.[0]?.from?.includes("LOS") && searchParams.segments?.[0]?.to?.includes("LOS")));

      if (isDomesticFlight) {
        provider = "TRIPS_AFRICA";
        productType = "FLIGHT_DOMESTIC";
      } else {
        provider = "DUFFEL";
        productType = "FLIGHT_INTERNATIONAL";
      }
    } else if (isCar) {
      provider = "BOOKING_COM";
      productType = "CAR_RENTAL";
    }

    // Prepare booking payload - DIFFERENT FOR HOTELS VS FLIGHTS
    const bookingData: any = {
      productType,
      provider,
      basePrice: priceInCents,
      currency: selectedItem.realData?.currency || "NGN",
      bookingData: {
        offerId: selectedItem.realData?.offerId || selectedItem.id,
        ...(isFlight && {
          origin: searchParams.segments?.[0]?.from || "LOS",
          destination: searchParams.segments?.[0]?.to || "ABV",
          departureDate: departureDate.toISOString(),
          arrivalDate: arrivalDate.toISOString(),
          airline: selectedItem.provider,
          class: searchParams.cabinClass || "Economy"
        }),
        ...(isHotel && {
          hotelId: hotelData?.hotelId || selectedItem.id,
          offerId: hotelData?.offerId || selectedItem.id,
          hotelName: selectedItem.title,
          checkInDate: hotelData?.checkInDate || searchParams.checkInDate || new Date().toISOString(),
          checkOutDate: hotelData?.checkOutDate || searchParams.checkOutDate || new Date(Date.now() + 86400000 * 3).toISOString(), // +3 days
          guests: hotelData?.guests || searchParams.guests || 2,
          rooms: hotelData?.rooms || searchParams.rooms || 1,
          location: searchParams.location || "Lagos",
          roomType: hotelData?.roomType || "Standard Room",
          nights: hotelData?.nights || 3
        }),
        ...(isCar && {
          carId: selectedItem.id,
          carModel: selectedItem.title,
          pickUpDate: searchParams.pickUpDate || new Date().toISOString(),
          dropOffDate: searchParams.dropOffDate || new Date(Date.now() + 86400000 * 2).toISOString(), // +2 days
          pickUpLocation: searchParams.carPickUp || "Lagos Airport"
        })
      },
      passengerInfo: {
        firstName: guestData?.firstName || user.name?.split(' ')[0] || "John",
        lastName: guestData?.lastName || user.name?.split(' ')[1] || "Doe",
        email: guestData?.email || user.email || "guest@example.com",
        phone: guestData?.phone || user.phone || "+2348012345678",
        ...(isLoggedIn && user.dob && { dateOfBirth: user.dob })
      }
    };

    console.log("🚀 Final booking payload:", bookingData);
    
    // Create booking (this will trigger payment flow)
    const result = await handleCreateBooking(bookingData, !!guestData);

    if (!result.success) {
      console.error("❌ Booking failed with error:", result.error);
      setCurrentView("failed");
    }
  }, [selectedItem, searchParams, user, isLoggedIn, handleCreateBooking]);

  // UPDATED: Search handler using the new utility function
  const handleSearch = useCallback(async (data: SearchParams) => {
    const startTime = Date.now();
    setSearchParams(data);
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSearchTime(0);
    setIsRealApiUsed(false);
    setApiValidationErrors([]);

    // Handle hotel searches
    if (data.type === "hotels") {
      try {
        console.log("🏨 Starting real hotel search with params:", data);
        
        // Format hotel search parameters
        const hotelParams = await formatHotelSearchData(data);
        
        // Use the hotel API to search and transform results
        const result = await hotelApi.searchAndTransformHotels(
          hotelParams,
          data.location || "Lagos"
        );

        if (result.success && result.results.length > 0) {
          setIsRealApiUsed(true);
          setSearchResults(result.results);
        } else {
          setSearchError(result.message || "No hotels found");
          setSearchResults(FALLBACK_RESULTS.hotels);
          setIsRealApiUsed(false);
        }
      } catch (error: any) {
        console.error("❌ Hotel search failed:", error);
        setSearchError("Unable to fetch real hotel data. Showing premium options.");
        setSearchResults(FALLBACK_RESULTS.hotels);
        setIsRealApiUsed(false);
      } finally {
        setIsSearching(false);
        setSearchTime(Date.now() - startTime);
        
        setTimeout(() => {
          document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
      return;
    }

    // Handle car searches
    if (data.type === "car-rentals") {
      const fallbackResults = FALLBACK_RESULTS["car-rentals"];
      setSearchResults(
        fallbackResults.map((r) => ({
          ...r,
          type: r.type ?? ("car-rentals" as any),
        }))
      );
      setIsSearching(false);
      setSearchTime(Date.now() - startTime);
      setTimeout(() => {
        document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return;
    }

    // Handle flight searches
    try {
      console.log("🚀 Starting real flight search with params:", data);

      // Prepare search parameters
      const origin = (data.segments?.[0]?.from || "LOS").split('(')[1]?.replace(')', '') || "LOS";
      const destination = (data.segments?.[0]?.to || "ABV").split('(')[1]?.replace(')', '') || "ABV";
      let departureDate = data.segments?.[0]?.date;
      if (!departureDate) {
        departureDate = new Date().toISOString().split("T")[0];
      }

      let cabinClass = (data.cabinClass ?? "economy").toLowerCase();
      if (!["economy", "business", "first"].includes(cabinClass)) {
        cabinClass = "economy";
      }

      const passengers = Math.max(1, Math.min(9, Number(data.travellers) || 1));

      // Use the new utility function
      const searchRequest = {
        origin,
        destination,
        departureDate,
        passengers,
        cabinClass,
        ...(data.tripType === "round-trip" && data.returnDate && {
          returnDate: data.returnDate,
        }),
      };

      console.log("🔍 Search request:", searchRequest);
      
      const result = await searchFlightsWithPagination(searchRequest, 2); // Max 2 pages for demo
      
      if (result.offers.length === 0) {
        setSearchError("No available flights found for this route and date.");
        setSearchResults(FALLBACK_RESULTS.flights);
        setIsRealApiUsed(false);
      } else {
        setIsRealApiUsed(true);

        // Transform to SearchResult format
        const transformedResults: SearchResult[] = result.offers.map((offer: any, index: number) => {
          const slices = offer.slices || offer.itineraries?.[0]?.slices || [];
          const firstSegment = slices[0] || {};
          const lastSegment = slices[slices.length - 1] || {};

          const airline = offer.owner?.name || 
                         firstSegment.marketing_carrier?.name || 
                         firstSegment.airline || 
                         "Unknown Airline";
          
          const flightNumber = firstSegment.flight_number || 
                             firstSegment.flightNumber || 
                             `FL${1000 + index}`;
          
          const totalPrice = offer.total_amount || 
                            offer.amount || 
                            offer.price?.amount || 
                            45000;
          
          const currency = offer.total_currency || offer.currency || "NGN";

          const durationMinutes = offer.duration_minutes || offer.total_duration || 90;
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;
          const durationStr = `${hours}h ${minutes.toString().padStart(2, "0")}m`;

          const stopsCount = Math.max(0, slices.length - 1);
          const stopsText = stopsCount === 0 ? "Direct" : stopsCount === 1 ? "1 stop" : `${stopsCount} stops`;

          let departureTime = firstSegment.departing_at || 
                            firstSegment.departure_time || 
                            firstSegment.departs_at;
          
          let arrivalTime = lastSegment.arriving_at || 
                           lastSegment.arrival_time || 
                           lastSegment.arrives_at;

          let timeDisplay = "08:00 – 09:30";
          if (departureTime && arrivalTime) {
            try {
              const dep = new Date(departureTime).toLocaleTimeString([], { 
                hour: "2-digit", 
                minute: "2-digit", 
                hour12: false 
              });
              const arr = new Date(arrivalTime).toLocaleTimeString([], { 
                hour: "2-digit", 
                minute: "2-digit", 
                hour12: false 
              });
              timeDisplay = `${dep} – ${arr}`;
            } catch (e) {
              console.warn("Time formatting error:", e);
            }
          }

          // Format price based on currency
          const priceSymbol = currency === 'NGN' ? '₦' : currency === 'GBP' ? '£' : '$';
          const formattedPrice = `${priceSymbol}${Number(totalPrice).toLocaleString()}`;

          return {
            id: offer.id || `offer-${result.offerRequestId}-${index}`,
            provider: airline,
            title: `Flight ${flightNumber}`,
            subtitle: `${cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)} • ${origin} → ${destination}`,
            price: formattedPrice,
            time: timeDisplay,
            duration: durationStr,
            stops: stopsText,
            rating: 4.3 + Math.random() * 0.6,
            baggage: "23 kg checked + 8 kg cabin",
            aircraft: firstSegment.aircraft?.name || "Boeing 737 / Airbus A320",
            layoverDetails: stopsText === "Direct" ? "Non-stop" : stopsText,
            image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400",
            type: "flights" as const,
            realData: {
              offerId: offer.id,
              departureTime,
              arrivalTime,
              airline,
              flightNumber,
              totalDuration: durationMinutes,
              stops: stopsCount,
              price: Number(totalPrice),
              currency,
            },
          };
        });

        console.log(`✅ Transformed ${transformedResults.length} results`);
        setSearchResults(transformedResults);
      }
    } catch (error: any) {
      console.error("❌ Flight search failed:", error);
      
      let errorMessage = "Unable to fetch live flights. Showing curated options.";
      
      if (error.message?.includes("network") || error.message?.includes("fetch")) {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.message?.includes("No offer request ID")) {
        errorMessage = "Flight search service temporarily unavailable.";
      } else if (error.message?.includes("timed out")) {
        errorMessage = "Search timed out. Please try again.";
      }
      
      setSearchError(errorMessage);
      setSearchResults(FALLBACK_RESULTS.flights);
      setIsRealApiUsed(false);
    } finally {
      setIsSearching(false);
      setSearchTime(Date.now() - startTime);

      setTimeout(() => {
        document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [formatHotelSearchData]);

  // CORRECTED: Handle result selection - removed forced login requirement
  const handleSelectResult = useCallback((item: SearchResult) => {
    setSelectedItem(item);

    // Always proceed to next step regardless of login status
    if (
      item.type === "hotels" ||
      item.id?.includes("h-") ||
      (item.title && item.title.toLowerCase().includes("hotel"))
    ) {
      setCurrentView("hotel-details");
    } else {
      setCurrentView("review");
    }
  }, []);

  // Login handler
  const handleLogin = useCallback(
    (userData: { name: string; email: string; token?: string }) => {
      const updatedUser = {
        ...user,
        ...userData,
        provider: "email" as const,
        role: "user" as const,
        profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=2563EB&color=fff`,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=2563EB&color=fff`,
      };
      setUser(updatedUser);
      setIsLoggedIn(true);
      setIsAuthOpen(false);
  
      // Store token if provided
      if (userData.token) {
        setAuthToken(userData.token);
        localStorage.setItem("authToken", userData.token);
      }
  
      localStorage.setItem("travelUser", JSON.stringify(updatedUser));
  
      // Navigate to profile unless in booking flow
      if (
        currentView !== "review" &&
        currentView !== "success" &&
        currentView !== "hotel-details"
      ) {
        setCurrentView("profile");
      }
    },
    [user, currentView]
  );

  const handleSignOut = useCallback(() => {
    setIsLoggedIn(false);
    setIsAdminLoggedIn(false);
    setAuthToken(null);
    setUser({
      name: "",
      email: "",
      profilePicture: "https://ui-avatars.com/api/?name=Guest&background=f4d9c6&color=9a7d6a&size=56",
      avatar: "https://ui-avatars.com/api/?name=Guest&background=f4d9c6&color=9a7d6a&size=56",
      dob: "1992-05-15",
      gender: "Male",
      phone: "+234 816 500 000",
      role: "user",
    });
    localStorage.removeItem("travelUser");
    localStorage.removeItem("authToken");
    setCurrentView("home");
  }, []);

  const handleSocialLogin = useCallback(
    (provider: "google" | "facebook") => {
      const mockData =
        provider === "google"
          ? {
              name: "Google Traveler",
              email: "traveler.google@gmail.com",
              img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
              dob: "1990-01-01",
              gender: "Male",
              phone: "+234 000 000 000",
              token: `social-${provider}-token-${Date.now()}`,
            }
          : {
              name: "Facebook User",
              email: "user.fb@facebook.com",
              img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
              dob: "1990-01-01",
              gender: "Female",
              phone: "+234 111 111 111",
              token: `social-${provider}-token-${Date.now()}`,
            };
  
      const updatedUser = {
        ...user,
        name: mockData.name,
        email: mockData.email,
        profilePicture: mockData.img,
        avatar: mockData.img,
        dob: mockData.dob,
        gender: mockData.gender,
        phone: mockData.phone,
        provider,
        role: "user" as const,
        token: mockData.token,
      };
  
      setUser(updatedUser);
      setIsLoggedIn(true);
      setIsAuthOpen(false);
      localStorage.setItem("travelUser", JSON.stringify(updatedUser));
      localStorage.setItem("authToken", mockData.token);
      setAuthToken(mockData.token);
  
      if (!localStorage.getItem("travelBookings")) {
        const sampleBookings: Booking[] = [
          {
            id: "1",
            type: "flight",
            title: "Lagos(LOS) to Abuja(ABJ)",
            provider: "Air Peace",
            subtitle: "Flight BA117 . Economy",
            date: "Dec 26 – Dec 28, 2025",
            duration: "1h 15m Non-Stop",
            status: "Confirmed",
            price: "75,000.00",
            currency: "NGN",
            iconBg: "bg-blue-50",
            imageUrl:
              "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=600",
            bookingReference: "#LND-8824",
            time: "08:00 AM",
            paymentStatus: "paid",
            bookingData: {
              origin: "Lagos (LOS)",
              destination: "Abuja (ABJ)",
              departureDate: "2025-12-26T08:00:00",
              arrivalDate: "2025-12-26T09:15:00",
              airline: "Air Peace",
              flightNumber: "BA117"
            }
          },
          {
            id: "2",
            type: "hotel",
            title: "Hyatt Tokyo",
            provider: "Hyatt",
            subtitle: "Standard King Room . 2 Guests, 5 Nights",
            date: "Dec 26 – Dec 28, 2025",
            status: "Completed",
            price: "1,500.00",
            currency: "$",
            iconBg: "bg-yellow-50",
            imageUrl:
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
            bookingReference: "#HTL-5678",
            paymentStatus: "paid",
            bookingData: {
              hotelName: "Hyatt Tokyo",
              checkInDate: "2025-12-26T14:00:00",
              checkOutDate: "2025-12-31T11:00:00",
              guests: 2,
              nights: 5
            }
          },
        ];
        setUserBookings(sampleBookings);
        localStorage.setItem("travelBookings", JSON.stringify(sampleBookings));
      }
  
      if (
        currentView !== "review" &&
        currentView !== "success" &&
        currentView !== "hotel-details"
      ) {
        setCurrentView("profile");
      }
    },
    [user, currentView]
  );

  const handleBookItem = useCallback((item: any) => {
    const searchResultItem: SearchResult = {
      id: item.id,
      provider: item.provider,
      title: item.title,
      subtitle: item.subtitle,
      price: item.price,
      type: item.type as any,
      image: item.imageUrl,
    };

    setSelectedItem(searchResultItem);

    if (
      item.type === "hotel" ||
      item.type === "hotels" ||
      item.id?.includes("h-") ||
      (item.title && item.title.toLowerCase().includes("hotel"))
    ) {
      setCurrentView("hotel-details");
    } else {
      setCurrentView("review");
    }
  }, []);

  const navigateToProfile = useCallback(() => {
    if (!isLoggedIn) {
      setIsAuthOpen(true);
      setAuthMode("login");
    } else {
      setCurrentView("profile");
    }
  }, [isLoggedIn]);

  const navigateToHome = useCallback(() => {
    setCurrentView("home");
    setSearchResults([]);
    setSearchError(null);
    setApiValidationErrors([]);
  }, []);

  const handleBookingFailed = useCallback(() => {
    setCurrentView("failed");
  }, []);

  const handleUpdateUser = useCallback((updatedData: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  }, []);

  const handleCancelRequest = useCallback((booking: Booking) => {
    setItemToCancel(booking);
    setCurrentView("cancel");
  }, []);

  const handleAdminLogin = useCallback((adminData: any) => {
    setIsAdminLoggedIn(true);
    setCurrentView("admin-dashboard");
  }, []);

  const handleAdminClick = useCallback(() => {
    setCurrentView("admin-login");
  }, []);

  const openAuth = useCallback((mode: "login" | "register") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }, []);

  // Payment modal component - UPDATED VERSION
  const PaymentModal = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentInitiated, setPaymentInitiated] = useState(false);

    // Helper function to get currency symbol
    const getCurrencySymbol = (currency: string) => {
      const symbols: Record<string, string> = {
        'USD': '$',
        'GBP': '£',
        'EUR': '€',
        'NGN': '₦',
      };
      return symbols[currency.toUpperCase()] || currency;
    };

    // Format amount properly
    const formatAmount = (amount: number, currency: string) => {
      const symbol = getCurrencySymbol(currency);
      return `${symbol}${amount.toLocaleString()}`;
    };

    // Get the actual amount from booking
    const getActualAmount = () => {
      if (!currentBooking) return { amount: 0, currency: 'NGN' };
      
      // Check if totalAmount is already in the correct unit
      // Stripe expects amount in smallest currency unit (cents/kobo)
      // If totalAmount is already in the right format, use it as is
      const amount = currentBooking.totalAmount || 0;
      const currency = currentBooking.currency || 'NGN';
      
      // For display, show the full amount
      return { 
        displayAmount: amount, 
        stripeAmount: Math.round(amount * 100), // Convert to cents/kobo
        currency 
      };
    };

    const handlePayment = async () => {
      if (!currentBooking) return;
      
      setLoading(true);
      setError(null);

      try {
        const { stripeAmount, currency } = getActualAmount();
        
        let paymentResult;
        
        if (currentBooking.isGuest) {
          // Guest payment
          paymentResult = await paymentApi.createGuestStripeIntent(
            currentBooking.bookingReference,
            currentBooking.passengerInfo?.email || "guest@example.com",
            stripeAmount, // Use the calculated stripe amount
            currency.toLowerCase()
          );
        } else {
          // Authenticated user payment
          paymentResult = await paymentApi.createStripeIntent(
            currentBooking.id,
            stripeAmount, // Use the calculated stripe amount
            currency.toLowerCase()
          );
        }

        if (paymentResult.clientSecret) {
          setPaymentInitiated(true);
          
          // Initialize Stripe and redirect to payment
          const stripe = await stripePromise;
          if (stripe) {
            const { error: stripeError } = await stripe.confirmCardPayment(
              paymentResult.clientSecret,
              {
                payment_method: {
                  card: {
                    number: '4242424242424242',
                    exp_month: 12,
                    exp_year: 2026,
                    cvc: '123',
                  } as any,
                  billing_details: {
                    name: `${currentBooking.passengerInfo?.firstName || 'Guest'} ${currentBooking.passengerInfo?.lastName || 'User'}`,
                    email: currentBooking.passengerInfo?.email || 'guest@example.com',
                    phone: currentBooking.passengerInfo?.phone || '+2348012345678',
                  },
                },
              }
            );

            if (stripeError) {
              throw new Error(stripeError.message);
            }

            // Payment successful
            await handlePaymentComplete(currentBooking.id, currentBooking.isGuest);
          }
        } else {
          throw new Error('Failed to create payment intent');
        }
      } catch (err: any) {
        console.error('Payment error:', err);
        setError(err.message || 'Payment failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (!showPayment || !currentBooking) return null;

    const { displayAmount, currency } = getActualAmount();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900">Complete Payment</h2>
            <button
              onClick={() => setShowPayment(false)}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-gray-600">Total Amount</p>
                <p className="text-xs text-gray-500">Booking #{currentBooking.bookingReference}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-gray-900">
                  {formatAmount(displayAmount, currency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Includes all taxes & fees</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm font-bold text-gray-700 mb-3">Payment Method</p>
            <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold">Credit/Debit Card</p>
                  <p className="text-xs text-gray-500">Secure payment via Stripe</p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handlePayment}
              disabled={loading || paymentInitiated}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Payment...
                </>
              ) : paymentInitiated ? (
                "Payment Initiated"
              ) : (
                <>
                  Pay {formatAmount(displayAmount, currency)}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
            
            <button
              onClick={() => setShowPayment(false)}
              disabled={loading || paymentInitiated}
              className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              Cancel Payment
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsAiOpen(true);
      }
      if (e.key === "Escape") {
        if (isAiOpen) setIsAiOpen(false);
        if (isAuthOpen) setIsAuthOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAiOpen, isAuthOpen]);

  // Scroll to top on home view
  useEffect(() => {
    if (currentView === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentView]);

  // Clear search results when leaving home view
  useEffect(() => {
    if (currentView !== "home") {
      setSearchResults([]);
      setSearchError(null);
      setApiValidationErrors([]);
    }
  }, [currentView]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <PaymentModal />
      
      {showNav && (
        <Navbar
          isLoggedIn={isLoggedIn}
          user={user}
          activeTab={activeTab} // Use the single source of truth
          onTabClick={setActiveTab} // Update the single source of truth
          onSignIn={() => openAuth("login")}
          onRegister={() => openAuth("register")}
          onProfileClick={navigateToProfile}
          onLogoClick={navigateToHome}
          onMenuClick={() => console.log("Mobile menu clicked")}
          onSignOut={handleSignOut}
          onProfileTabSelect={setActiveProfileTab}
        />
      )}

      {currentView === "home" && (
        <>
          <Hero 
            onSearch={handleSearch} 
            loading={isSearching}
            activeSearchTab={activeTab} // Use the same activeTab
            onTabChange={setActiveTab} // Update the same activeTab
          />
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0">
            {(isSearching || searchResults.length > 0 || searchError || apiValidationErrors.length > 0) && (
              <section
                id="search-results"
                className="scroll-mt-24"
              >
                {isSearching ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 text-center shadow-lg border border-gray-200/50 flex flex-col items-center animate-pulse">
                    <div className="w-16 h-16 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <h3 className="text-xl font-bold text-gray-900 mt-4">
                      {searchParams?.type === "hotels" 
                        ? "Searching premium hotels..." 
                        : searchParams?.type === "flights" 
                        ? "Searching real-time flights..." 
                        : "Searching premium options..."}
                    </h3>
                    <p className="text-gray-500 mt-1">
                      {searchParams?.type === "hotels" 
                        ? "Fetching the best hotel deals for you" 
                        : searchParams?.type === "flights" 
                        ? "Fetching live flight data from airlines" 
                        : "Fetching the best travel deals for you"}
                    </p>
                    <div className="mt-3 w-full max-w-md bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-3/4"></div>
                    </div>
                    <p className="text-sm text-blue-600 mt-3">
                      {searchParams?.type === "hotels" 
                        ? "Premium Hotel Network" 
                        : searchParams?.type === "flights" 
                        ? "Live Flight Search Network" 
                        : "Premium Travel Network"}
                    </p>
                  </div>
                ) : searchError || apiValidationErrors.length > 0 ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 text-center shadow-lg border border-yellow-100 flex flex-col items-center animate-fade-in">
                    <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500 mb-4">
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {searchError || "Validation errors occurred"}
                    </h3>
                    {apiValidationErrors.length > 0 && (
                      <div className="mb-4 text-left">
                        <p className="text-sm font-medium text-gray-700 mb-2">Please fix these issues:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {apiValidationErrors.map((error, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-red-500 mr-2">•</span>
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-gray-600 mb-4">
                      Showing premium travel options
                    </p>
                    {searchTime > 0 && (
                      <p className="text-sm text-gray-400 mb-3">
                        Completed in {(searchTime / 1000).toFixed(2)}s
                      </p>
                    )}
                    <button
                      onClick={() => searchParams && handleSearch(searchParams)}
                      className="mt-3 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all hover:shadow-xl active:scale-95"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {isRealApiUsed ? (
                            searchParams?.type === "hotels" ? "Real Hotel Results" : "Live Flight Results"
                          ) : "Premium Search Results"}
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                          {searchResults.length} {isRealApiUsed ? "real-time" : "premium"} options found in{" "}
                          {(searchTime / 1000).toFixed(2)}s
                          {isRealApiUsed ? (
                            <span className="ml-2 text-green-600 text-xs">
                              ✓ Live Data
                            </span>
                          ) : (
                            <span className="ml-2 text-blue-600 text-xs">
                              ✓ Premium Selection
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {isRealApiUsed && (
                          <span className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Live Data
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setSearchResults([]);
                            setSearchError(null);
                            setApiValidationErrors([]);
                          }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Clear Results
                        </button>
                      </div>
                    </div>
                    <SearchResults
                      results={searchResults}
                      searchParams={searchParams}
                      onClear={() => {
                        setSearchResults([]);
                        setSearchError(null);
                        setApiValidationErrors([]);
                      }}
                      onSelect={handleSelectResult}
                    />
                  </div>
                )}
              </section>
            )}

            <Partners />
            
            <div className="space-y-8">
              <ExclusiveOffers />
              <TrendingDestinations />
              <HomesGrid />
              <CarRentals />
              <SpecializedServices />
            </div>
          </main>
        </>
      )}

      {currentView === "about-us" && (
        <AboutUs onBack={navigateToHome} />
      )}

      {currentView === 'content-page' && contentSlug && (
        <ContentPage 
          content={(window as any).pageContentMap?.[contentSlug] || { title: contentSlug, sections: [] }} 
          onBack={navigateToHome} 
        />
      )}

      {currentView === "profile" && (
        <Profile
          user={user}
          onUpdateUser={handleUpdateUser}
          onBack={navigateToHome}
          onSignOut={handleSignOut}
          onBookItem={handleBookItem}
          onCancelRequest={handleCancelRequest}
          initialActiveTab={activeProfileTab}
        />
      )}

      {currentView === "hotel-details" && selectedItem && (
        <HotelDetails
          item={selectedItem}
          searchParams={searchParams}
          onBack={() => setCurrentView("home")}
          onBook={() => setCurrentView("review")}
        />
      )}

      {currentView === "review" && selectedItem && (
        <ReviewTrip
          item={selectedItem}
          searchParams={searchParams}
          onBack={() => setCurrentView("home")}
          onSignIn={() => openAuth("login")}
          isLoggedIn={isLoggedIn}
          user={user}
          onSuccess={() => handleBookingComplete()}
          onFailure={handleBookingFailed}
          onGuestBooking={async (guestData) => {
            await handleBookingComplete(guestData);
            return { success: true, data: {} };
          }}
        />
      )}

      {currentView === "success" && currentBooking && (
        <BookingSuccess
          onBack={() => setCurrentView("home")}
          bookingId={currentBooking.id}
          isGuest={currentBooking.isGuest}
        />
      )}

      {currentView === "failed" && selectedItem && (
        <BookingFailed
          item={selectedItem}
          searchParams={searchParams}
          onBack={() => setCurrentView("home")}
          onRetry={() => setCurrentView("review")}
        />
      )}

      {currentView === "cancel" && itemToCancel && (
        <CancelBooking
          item={itemToCancel}
          searchParams={searchParams}
          onBack={() => setCurrentView("profile")}
        />
      )}

      {currentView === "admin-login" && (
        <AdminLogin 
          onLoginSuccess={handleAdminLogin}
          onBack={() => setCurrentView("home")}
        />
      )}

      {currentView === "admin-dashboard" && isAdminLoggedIn && (
        <AdminDashboard 
          onLogout={handleSignOut}
        />
      )}

      {showNav && (
        <>
          <Newsletter />
          <Footer onAdminClick={handleAdminClick} />
        </>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLogin}
        onSocialLogin={handleSocialLogin}
        initialMode={authMode}
      />

      {showNav && (
        <button
          onClick={() => setIsAiOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 z-50 group"
          aria-label="Open AI Trip Planner (Ctrl+K)"
        >
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <span className="font-bold hidden sm:inline text-lg">Chat</span>
        </button>
      )}

      {isAiOpen && (
        <AIAssistant onClose={() => setIsAiOpen(false)} user={user} />
      )}
    </div>
  );
}
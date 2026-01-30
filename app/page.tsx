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
import { bookingApi, paymentApi, searchFlightsWithPagination } from "../lib/api";

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
  carPickUp?: string;
  [key: string]: any;
}

export interface SearchResult {
  id: string;
  provider: string;
  title: string;
  subtitle: string;
  price: string;
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
    departureTime?: string;
    arrivalTime?: string;
    airline?: string;
    flightNumber?: string;
    totalDuration?: number;
    stops?: number;
    price?: number;
    currency?: string;
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
      type: "hotels" as const,
    },
    {
      id: "h-2",
      provider: "Hyatt",
      title: "Standard King Room",
      subtitle: "Lagos • 5-star • City View",
      price: "₦75,000/night",
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
      type: "hotels" as const,
    },
    {
      id: "h-3",
      provider: "Hilton",
      title: "Executive Suite",
      subtitle: "Lagos • 5-star • Beach Front",
      price: "₦120,000/night",
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
  
  const [activeSearchTab, setActiveSearchTab] = useState<'flights' | 'hotels' | 'cars'>('flights');
  const [activeNavTab, setActiveNavTab] = useState<'flights' | 'hotels' | 'cars'>('flights');

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

  // UPDATED: Unified booking handler using bookingApi
  const handleCreateBooking = useCallback(async (bookingData: any) => {
    try {
      console.log("📤 Creating booking with data:", bookingData);
      
      // Use the booking API from lib/api
      const result = await bookingApi.createBooking(bookingData);
      
      if (result && (result.id || result.data?.id)) {
        console.log("✅ Booking success:", result);
        return { success: true, data: result };
      } else {
        console.error("❌ Booking failed:", result);
        return { 
          success: false, 
          error: result?.message || result?.error || "Booking failed" 
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

// UPDATED: Booking completion with payment initialization - with correct providers
const handleBookingComplete = useCallback(async () => {
  if (!selectedItem || !searchParams) {
    console.error("Cannot complete booking: missing item or params");
    setCurrentView("failed");
    return;
  }

  // Extract numeric price
  const priceStr = selectedItem.price.replace(/[^\d.]/g, '');
  const basePrice = parseFloat(priceStr) || 150;
  const priceInCents = Math.round(basePrice * 100); // Convert to cents/kobo

  // Format dates
  const departureDate = new Date(searchParams.segments?.[0]?.date || Date.now());
  const arrivalDate = new Date(departureDate.getTime() + 90 * 60 * 1000); // 90 minutes later

  // Determine provider and product type based on item type
  let provider = "TRIPS_AFRICA"; // Default for domestic flights
  let productType = "FLIGHT_DOMESTIC";
  
  // Check if it's a domestic or international flight
  const isDomesticFlight = selectedItem.type === "flights" && 
    ((selectedItem.subtitle && selectedItem.subtitle.includes("Lagos") && selectedItem.subtitle.includes("Abuja")) ||
     (searchParams.segments?.[0]?.from?.includes("LOS") && searchParams.segments?.[0]?.to?.includes("ABV")) ||
     (searchParams.segments?.[0]?.from?.includes("LOS") && searchParams.segments?.[0]?.to?.includes("LOS")));

  if (selectedItem.type === "flights") {
    if (isDomesticFlight) {
      provider = "TRIPS_AFRICA";
      productType = "FLIGHT_DOMESTIC";
    } else {
      provider = "DUFFEL";
      productType = "FLIGHT_INTERNATIONAL";
    }
  } else if (selectedItem.type === "hotels") {
    provider = "BOOKING_COM"; // Changed from DUFFEL to BOOKING_COM
    productType = "HOTEL";
  } else if (selectedItem.type === "car-rentals") {
    provider = "BOOKING_COM"; // Use BOOKING_COM for car rentals
    productType = "CAR_RENTAL";
  }

  // Prepare booking payload
  const bookingData = {
    productType,
    provider,
    basePrice: priceInCents,
    currency: "NGN",
    bookingData: {
      offerId: selectedItem.realData?.offerId || selectedItem.id,
      origin: searchParams.segments?.[0]?.from || "LOS",
      destination: searchParams.segments?.[0]?.to || "ABV",
      departureDate: departureDate.toISOString(),
      arrivalDate: arrivalDate.toISOString(),
      airline: selectedItem.provider,
      class: searchParams.cabinClass || "Economy"
    },
    passengerInfo: {
      firstName: user.name?.split(' ')[0] || "John",
      lastName: user.name?.split(' ')[1] || "Doe",
      email: user.email || "guest@example.com",
      phone: user.phone || "+2348012345678",
      ...(isLoggedIn && user.dob && { dateOfBirth: user.dob })
    }
  };

  console.log("🚀 Final booking payload:", bookingData);
  const result = await handleCreateBooking(bookingData);

  if (result.success) {
    const bookingId = result.data?.id || result.data?.data?.id;
    const bookingRef = result.data?.bookingReference || result.data?.data?.bookingReference || `#${Date.now().toString().slice(-6)}`;

    // Try to initialize payment if available
    try {
      if (isLoggedIn && authToken) {
        await paymentApi.createStripeIntent(bookingId);
      } else {
        await paymentApi.createGuestStripeIntent(bookingRef, user.email || "guest@example.com");
      }
    } catch (paymentErr) {
      console.warn("Payment initialization skipped:", paymentErr);
      // Continue with booking success even if payment init fails
    }

    // Create local booking record
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
      bookingReference: bookingRef,
      time: new Date().toLocaleTimeString([], { 
        hour: "2-digit", 
        minute: "2-digit" 
      }),
    };

    setUserBookings(prev => [newBooking, ...prev]);
    setCurrentView("success");
  } else {
    console.error("❌ Booking failed with error:", result.error);
    setCurrentView("failed");
  }
}, [selectedItem, searchParams, user, isLoggedIn, authToken, handleCreateBooking]);

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

  // Handle non-flight searches with fallback
  if (data.type !== "flights") {
    const fallbackType = data.type || "flights";
    const fallbackResults = FALLBACK_RESULTS[fallbackType] || FALLBACK_RESULTS.flights;
    setSearchResults(
      fallbackResults.map((r) => ({
        ...r,
        type: r.type ?? (fallbackType as any),
      }))
    );
    setIsSearching(false);
    setSearchTime(Date.now() - startTime);
    setTimeout(() => {
      document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return;
  }

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
}, []);

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
      {showNav && (
        <Navbar
          isLoggedIn={isLoggedIn}
          user={user}
          activeTab={activeNavTab}
          onTabClick={setActiveNavTab}
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
            activeSearchTab={activeSearchTab}
            onTabChange={setActiveSearchTab}
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
                      {searchParams?.type === "flights" 
                        ? "Searching real-time flights..." 
                        : "Searching premium options..."}
                    </h3>
                    <p className="text-gray-500 mt-1">
                      {searchParams?.type === "flights" 
                        ? "Fetching live flight data from airlines" 
                        : "Fetching the best travel deals for you"}
                    </p>
                    <div className="mt-3 w-full max-w-md bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-3/4"></div>
                    </div>
                    <p className="text-sm text-blue-600 mt-3">
                      {searchParams?.type === "flights" 
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
                          {isRealApiUsed ? "Live Flight Results" : "Premium Search Results"}
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
              {/* Remove onServiceClick prop from SpecializedServices if it doesn't exist */}
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
    onSuccess={handleBookingComplete}
    onFailure={handleBookingFailed}
    onGuestBooking={async (guestData) => {
      try {
        // Determine provider based on item type for guest booking
        let provider = "TRIPS_AFRICA";
        let productType = "FLIGHT_DOMESTIC";
        
        if (selectedItem.type === "flights") {
          const isDomestic = selectedItem.subtitle?.includes("Lagos") && selectedItem.subtitle?.includes("Abuja");
          if (isDomestic) {
            provider = "TRIPS_AFRICA";
            productType = "FLIGHT_DOMESTIC";
          } else {
            provider = "DUFFEL";
            productType = "FLIGHT_INTERNATIONAL";
          }
        } else if (selectedItem.type === "hotels") {
          provider = "BOOKING_COM"; // Hotels use BOOKING_COM
          productType = "HOTEL";
        } else if (selectedItem.type === "car-rentals") {
          provider = "BOOKING_COM"; // Car rentals use BOOKING_COM
          productType = "CAR_RENTAL";
        }
        
        const bookingData = {
          ...guestData,
          provider,
          productType,
          currency: "NGN",
          basePrice: Math.round((parseFloat(selectedItem.price.replace(/[^\d.]/g, '')) || 150) * 100)
        };
        
        const result = await bookingApi.createBooking(bookingData);
        return { 
          success: true, 
          data: result 
        };
      } catch (error: any) {
        console.error("Guest booking failed:", error);
        return { 
          success: false, 
          error: error.message || "Booking failed" 
        };
      }
    }}
  />
)}

      {currentView === "success" && selectedItem && (
        <BookingSuccess
          item={selectedItem}
          searchParams={searchParams}
          onBack={() => setCurrentView("home")}
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
          {/* Remove onLinkClick prop from Footer if it doesn't exist */}
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
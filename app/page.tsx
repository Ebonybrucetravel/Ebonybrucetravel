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
import { 
  Elements,
  CardElement,
  useStripe,
  useElements 
} from '@stripe/react-stripe-js';
import { 
  SearchParams, 
  SearchResult, 
  SearchSegment, 
  Booking 
} from '@/lib/types';

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

// PaymentForm component that uses Stripe hooks
const PaymentForm = ({ 
  currentBooking, 
  showPayment, 
  setShowPayment, 
  handlePaymentComplete, 
  isLoggedIn, 
  setIsLoggedIn, 
  setIsAuthOpen, 
  setAuthMode 
}: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const formatAmount = useCallback((amount: number, currency: string | undefined) => {
    if (!currency) return `₦${amount.toLocaleString()}`;
    
    const symbols: Record<string, string> = {
      'USD': '$',
      'GBP': '£',
      'EUR': '€',
      'NGN': '₦',
    };
    
    const symbol = symbols[currency.toUpperCase()] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  }, []);

  const getActualAmount = useCallback(() => {
    if (!currentBooking) {
      return { 
        displayAmount: 0, 
        currency: 'NGN' as string 
      };
    }
    
    let amount = 0;
    if (typeof currentBooking.totalAmount === 'number') {
      amount = currentBooking.totalAmount;
    } else if (typeof currentBooking.totalAmount === 'string') {
      const cleaned = currentBooking.totalAmount.replace(/[^\d.]/g, '');
      amount = parseFloat(cleaned) || 0;
    } else if (currentBooking.basePrice) {
      amount = currentBooking.basePrice / 100;
    }
    
    const currency = currentBooking.currency || 'NGN';
    
    return { 
      displayAmount: amount, 
      currency 
    };
  }, [currentBooking]);

  const handlePayment = useCallback(async () => {
    if (!currentBooking || !stripe || !elements) return;
    
    setLoading(true);
    setError(null);
  
    try {
      console.log("💳 Payment request data:", {
        bookingId: currentBooking.id,
        bookingReference: currentBooking.bookingReference,
        passengerEmail: currentBooking.passengerInfo?.email
      });
      
      // Get the CardElement
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }
      
      let paymentResult;
      
      if (currentBooking.isGuest) {
        paymentResult = await paymentApi.createGuestStripeIntent(
          currentBooking.bookingReference,
          currentBooking.passengerInfo?.email || "guest@example.com"
        );
      } else {
        if (!isLoggedIn) {
          throw new Error("Please log in to complete payment");
        }
        
        paymentResult = await paymentApi.createStripeIntent(currentBooking.id);
      }
  
      console.log("💰 Payment API response:", paymentResult);
  
      if (paymentResult.clientSecret) {
        setPaymentInitiated(true);
        
        // ✅ FIXED: Use confirmCardPayment with Stripe Elements
        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
          paymentResult.clientSecret,
          {
            payment_method: {
              card: cardElement,
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

        console.log("✅ Payment successful:", paymentIntent);
        
        // After successful payment, complete the booking
        await handlePaymentComplete(currentBooking.id, currentBooking.isGuest);
      } else {
        throw new Error(paymentResult.message || paymentResult.error || 'Failed to create payment intent');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      
      if (err.message?.includes("401") || err.message?.includes("Session expired")) {
        setError("Your session has expired. Please log in again.");
        
        localStorage.removeItem("authToken");
        setIsLoggedIn(false);
        
        setTimeout(() => {
          setIsAuthOpen(true);
          setAuthMode("login");
          setShowPayment(false);
        }, 2000);
      } else {
        setError(err.message || 'Payment failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentBooking, stripe, elements, handlePaymentComplete, isLoggedIn, setIsLoggedIn, setIsAuthOpen, setAuthMode, setShowPayment]);

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  if (!showPayment || !currentBooking) return null;

  const { displayAmount, currency } = getActualAmount();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Complete Payment</h2>
          <button
            onClick={() => setShowPayment(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Booking Reference</span>
              <span className="font-bold text-gray-900">{currentBooking.bookingReference}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Amount</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatAmount(displayAmount, currency)}
              </span>
            </div>
          </div>
          
          {/* Stripe Card Element */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Details
            </label>
            <div className="border border-gray-300 rounded-lg p-3">
              <CardElement 
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                      fontFamily: 'Inter, system-ui, sans-serif',
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                  hidePostalCode: true,
                }}
                onChange={handleCardChange}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Test card: 4242 4242 4242 4242 | 12/26 | 123
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          {paymentInitiated && (
            <div className="text-sm text-gray-500 mb-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
              Processing payment...
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowPayment(false)}
            className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
            disabled={loading || paymentInitiated}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={loading || paymentInitiated || !stripe || !cardComplete}
            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || paymentInitiated ? "Processing..." : "Pay Now"}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [hotelSearchParams, setHotelSearchParams] = useState<SearchParams | null>(null);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [searchTime, setSearchTime] = useState<number>(0);
  const [isRealApiUsed, setIsRealApiUsed] = useState(false);
  const [apiValidationErrors, setApiValidationErrors] = useState<string[]>([]);
  const [contentSlug, setContentSlug] = useState<string | null>(null);
  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  
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

  // Restore session
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
      const hotelParams = await formatHotelSearchParams(
        data.location || "Lagos",
        data.checkInDate,
        data.checkOutDate,
        data.guests || data.adults || 2,
        data.rooms || 1
      );

      return hotelParams;
    } catch (error) {
      console.error("❌ Failed to format hotel params:", error);
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
        adults: data.guests || data.adults || 2,
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
      
      const result = await bookingApi.createBooking(bookingData);
      
      if (result && (result.id || result.data?.id)) {
        console.log("✅ Booking created successfully:", result);
        
        const bookingId = result.id || result.data?.id;
        const bookingRef = result.bookingReference || result.data?.bookingReference || `#${Date.now().toString().slice(-6)}`;
        
        const bookingInfo = {
          id: bookingId,
          bookingReference: bookingRef,
          totalAmount: bookingData.basePrice / 100,
          currency: bookingData.currency,
          passengerInfo: bookingData.passengerInfo,
          isGuest: isGuest,
          ...result
        };
        
        setCurrentBooking(bookingInfo);
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

  // UPDATED: Handle payment completion with proper dependencies
  const handlePaymentComplete = useCallback(async (bookingId: string, isGuest: boolean = false) => {
    try {
      console.log("💳 Processing payment for booking:", bookingId);
      
      setShowPayment(false);
      
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

  // UPDATED: Booking completion with payment flow
  const handleBookingComplete = useCallback(async (guestData?: any) => {
    if (!selectedItem || !searchParams) {
      console.error("Cannot complete booking: missing item or params");
      setCurrentView("failed");
      return;
    }

    const isHotel = selectedItem.type === "hotels";
    const isCar = selectedItem.type === "car-rentals";
    const isFlight = selectedItem.type === "flights";

    let basePrice = 0;
    if (selectedItem.realData?.price) {
      basePrice = selectedItem.realData.price;
    } else {
      const priceStr = selectedItem.price.replace(/[^\d.]/g, '');
      basePrice = parseFloat(priceStr) || (isHotel ? 95000 : 150);
    }
    
    const priceInCents = Math.round(basePrice * 100);

    const departureDate = new Date(searchParams.segments?.[0]?.date || Date.now());
    const arrivalDate = new Date(departureDate.getTime() + 90 * 60 * 1000);

    const hotelData = selectedItem.realData;

    let provider = "BOOKING_COM";
    let productType = "HOTEL";
    
    if (isFlight) {
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
          checkOutDate: hotelData?.checkOutDate || searchParams.checkOutDate || new Date(Date.now() + 86400000 * 3).toISOString(),
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
          dropOffDate: searchParams.dropOffDate || new Date(Date.now() + 86400000 * 2).toISOString(),
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
    
    const result = await handleCreateBooking(bookingData, !!guestData);

    if (!result.success) {
      console.error("❌ Booking failed with error:", result.error);
      setCurrentView("failed");
    }
  }, [selectedItem, searchParams, user, isLoggedIn, handleCreateBooking]);

  const handleSearch = useCallback(async (data: SearchParams) => {
    // ✅ FIXED: Ensure data has proper structure before processing
    console.log('🔍 DEBUG: Data received from SearchBox:', {
      type: data.type,
      segments: data.segments,
      fromRaw: data.segments?.[0]?.from,
      toRaw: data.segments?.[0]?.to,
      date: data.segments?.[0]?.date,
      returnDate: data.returnDate,
      tripType: data.tripType,
      cabinClass: data.cabinClass,
      travellers: data.travellers,
      // Check for direct properties that might be used
      directFrom: (data as any).from,
      directTo: (data as any).to,
      directDate: (data as any).date
    });
    
    // ✅ FIXED: Reconstruct data if it doesn't have proper segments structure
    if (!data.segments || !Array.isArray(data.segments) || data.segments.length === 0) {
      console.log('🔄 Reconstructing segments from direct properties...');
      
      // Try to get from/to from direct properties
      const fromValue = (data as any).from || (data as any).origin || 
                        (data as any).departure || data.segments?.[0]?.from || "";
      const toValue = (data as any).to || (data as any).destination || 
                      (data as any).arrival || data.segments?.[0]?.to || "";
      const dateValue = (data as any).date || data.segments?.[0]?.date || 
                        (data as any).departureDate || new Date().toISOString().split('T')[0];
      
      // Only reconstruct if we have values
      if (fromValue && toValue) {
        data = {
          ...data,
          segments: [{
            from: fromValue,
            to: toValue,
            date: dateValue
          }]
        };
        console.log('✅ Reconstructed segments:', data.segments);
      }
    }
    
    const startTime = Date.now();
    setSearchParams(data);
    
    if (data.type === "hotels") {
      setHotelSearchParams({
        ...data,
        adults: data.guests || data.adults || 1,
        guests: data.guests || data.adults || 1,
      });
    } else {
      setHotelSearchParams(null);
    }
    
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
        
        const hotelParams = await formatHotelSearchData(data);
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
        // Use a safer logging approach
        if (process.env.NODE_ENV === 'development') {
          console.warn("Hotel search failed:", error);
        }
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
  
      // ✅ FIXED: Improved airport code extraction function
      const extractAirportCode = (displayValue: string): string => {
        if (!displayValue || displayValue.trim() === '') {
          return '';
        }
        
        console.log('🔍 Extracting airport code from:', displayValue);
        
        // Clean the input - remove extra spaces
        const cleanValue = displayValue.trim();
        
        // Try different patterns in order of likelihood:
        
        // 1. Exact 3-letter code at start (e.g., "LOS" or "LOS - Lagos")
        const exactCodeMatch = cleanValue.match(/^([A-Z]{3})$/);
        if (exactCodeMatch) {
          console.log('✅ Found exact 3-letter code:', exactCodeMatch[1]);
          return exactCodeMatch[1];
        }
        
        // 2. 3-letter code at start followed by something (e.g., "LOS - Lagos")
        const beginningMatch = cleanValue.match(/^([A-Z]{3})\b/);
        if (beginningMatch) {
          console.log('✅ Found code at beginning:', beginningMatch[1]);
          return beginningMatch[1];
        }
        
        // 3. 3-letter code in parentheses (e.g., "Lagos (LOS)")
        const parenMatch = cleanValue.match(/\(([A-Z]{3})\)/);
        if (parenMatch) {
          console.log('✅ Found code in parentheses:', parenMatch[1]);
          return parenMatch[1];
        }
        
        // 4. Format like "ATA-Huaraz" or "LON-London"
        const hyphenMatch = cleanValue.match(/^([A-Z]{3})-/);
        if (hyphenMatch) {
          console.log('✅ Found code before hyphen:', hyphenMatch[1]);
          return hyphenMatch[1];
        }
        
        // 5. Format like "LON, London" or "ATA, Huaraz"
        const commaMatch = cleanValue.match(/^([A-Z]{3}),/);
        if (commaMatch) {
          console.log('✅ Found code before comma:', commaMatch[1]);
          return commaMatch[1];
        }
        
        // 6. Try to find any 3 uppercase letters in the string
        const anyCodeMatch = cleanValue.match(/([A-Z]{3})/);
        if (anyCodeMatch) {
          console.log('✅ Found code anywhere in string:', anyCodeMatch[1]);
          return anyCodeMatch[1];
        }
        
        // 7. Last resort: take first 3 characters and convert to uppercase
        const firstThree = cleanValue.substring(0, 3).toUpperCase();
        if (firstThree.match(/^[A-Z]{3}$/)) {
          console.log('✅ Using first 3 characters:', firstThree);
          return firstThree;
        }
        
        console.log('⚠️ Could not extract airport code from:', displayValue);
        return '';
      };
  
      // ✅ FIXED: Validate search data before extraction - with better error messages
      if (!data.segments?.[0]?.from || !data.segments?.[0]?.to) {
        console.log('⚠️ Search data structure:', {
          hasSegments: !!data.segments,
          segmentCount: data.segments?.length,
          firstSegment: data.segments?.[0],
          dataKeys: Object.keys(data)
        });
        
        setSearchError("Please enter both departure and arrival cities");
        setIsSearching(false);
        return;
      }
  
      const origin = extractAirportCode(data.segments[0].from);
      const destination = extractAirportCode(data.segments[0].to);
      
      console.log('📍 Extracted airport codes:', { 
        fromRaw: data.segments[0].from, 
        toRaw: data.segments[0].to,
        origin, 
        destination 
      });
  
      // ✅ FIXED: Validate extracted codes with better error message
      if (!origin || !destination) {
        console.log('❌ Could not extract valid airport codes:', { 
          fromRaw: data.segments[0].from, 
          toRaw: data.segments[0].to,
          origin, 
          destination 
        });
        setSearchError(`Please enter valid airport codes. Could not extract codes from "${data.segments[0].from}" and "${data.segments[0].to}"`);
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
  
      const passengers = Math.max(1, Math.min(9, Number(data.travellers) || 1));
  
      // Build the search request object
      const searchRequest: any = {
        origin,
        destination,
        departureDate,
        passengers,
        cabinClass,
        currency: "NGN",
      };
  
      if (data.tripType === "round-trip" && data.returnDate) {
        searchRequest.returnDate = data.returnDate;
      }
  
      if (data.maxConnections !== undefined) {
        searchRequest.maxConnections = data.maxConnections;
      }
  
      console.log("🔍 Search request being sent to API:", searchRequest);
  
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
        throw new Error(`Offer request failed: ${offerRequestResponse.status}`);
      }
  
      const offerRequestResult = await offerRequestResponse.json();
      console.log("📝 Offer request result:", offerRequestResult);
  
      if (!offerRequestResult.success || !offerRequestResult.data?.offer_request_id) {
        throw new Error('Failed to create offer request: ' + (offerRequestResult.message || 'Unknown error'));
      }
  
      const offerRequestId = offerRequestResult.data.offer_request_id;
      console.log("🆔 Offer Request ID:", offerRequestId);
  
      // STEP 2: Fetch offers using the offer_request_id
      console.log("📊 Step 2: Fetching offers...");
      const offersResponse = await fetch(`https://ebony-bruce-production.up.railway.app/api/v1/bookings/offers?offer_request_id=${offerRequestId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
  
      if (!offersResponse.ok) {
        throw new Error(`Fetch offers failed: ${offersResponse.status}`);
      }
  
      const offersResult = await offersResponse.json();
      console.log("📊 Offers result structure:", {
        success: offersResult.success,
        hasData: !!offersResult.data,
        dataType: typeof offersResult.data,
        dataKeys: offersResult.data ? Object.keys(offersResult.data) : 'no data',
        offersCount: Array.isArray(offersResult.data?.offers) ? offersResult.data.offers.length : 0,
        firstOffer: offersResult.data?.offers?.[0]
      });
  
      // Process the offers
      if (offersResult.success && offersResult.data) {
        let flightOffers: any[] = [];
        
        if (Array.isArray(offersResult.data.offers)) {
          flightOffers = offersResult.data.offers;
        } else if (Array.isArray(offersResult.data)) {
          flightOffers = offersResult.data;
        } else if (offersResult.data.data && Array.isArray(offersResult.data.data.offers)) {
          flightOffers = offersResult.data.data.offers;
        } else if (Array.isArray(offersResult.offers)) {
          flightOffers = offersResult.offers;
        }
  
        console.log(`✅ Found ${flightOffers.length} flight offers`);
        console.log('🎯 DEBUG before transformation:', {
          origin,
          destination,
          cabinClass,
          flightOffersCount: flightOffers.length,
          isRealApiUsed: true
        });
  
        if (flightOffers.length === 0) {
          setSearchError("No available flights found for this route and date.");
          setSearchResults(FALLBACK_RESULTS.flights);
          setIsRealApiUsed(false);
        } else {
          setIsRealApiUsed(true);
  
          // Transform to SearchResult format
          const transformedResults: SearchResult[] = flightOffers.map((offer: any, index: number) => {
            let slices: any[] = [];
            
            if (offer.slices && Array.isArray(offer.slices)) {
              slices = offer.slices;
            } else if (offer.itineraries && Array.isArray(offer.itineraries) && offer.itineraries[0]?.slices) {
              slices = offer.itineraries[0].slices;
            } else if (offer.segments && Array.isArray(offer.segments)) {
              slices = offer.segments;
            }
  
            const firstSlice = slices[0] || {};
            const lastSlice = slices[slices.length - 1] || {};
  
            // Get airline name
            const airline = offer.owner?.name || 
                           firstSlice.marketing_carrier?.name || 
                           firstSlice.airline || 
                           firstSlice.owner?.name || 
                           "Unknown Airline";
            
            // Get flight number
            const flightNumber = firstSlice.flight_number || 
                               firstSlice.flightNumber || 
                               `FL${1000 + index}`;
            
            // Get price
            const totalPrice = offer.total_amount || 
                              offer.total_price || 
                              offer.amount || 
                              offer.price?.amount || 
                              45000;
            
            const currency = offer.total_currency || 
                            offer.currency || 
                            offer.price?.currency || 
                            "NGN";
  
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
  
            // Get times
            let departureTime = firstSlice.departing_at || 
                              firstSlice.departure_time || 
                              firstSlice.departs_at;
            
            let arrivalTime = lastSlice.arriving_at || 
                             lastSlice.arrival_time || 
                             lastSlice.arrives_at;
  
            // Format time display
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
                // Silently handle time formatting errors
              }
            }
  
            // Format price based on currency
            const priceSymbol = currency === 'NGN' ? '₦' : 
                               currency === 'GBP' ? '£' : 
                               currency === 'EUR' ? '€' : 
                               currency === 'USD' ? '$' : currency;
            const formattedPrice = `${priceSymbol}${Number(totalPrice).toLocaleString()}`;
  
            // Get aircraft type
            const aircraft = firstSlice.aircraft?.name || 
                            firstSlice.aircraft_type || 
                            "Boeing 737 / Airbus A320";
  
            // ✅ FIXED: Get actual flight origin and destination from API response
            const flightOrigin = firstSlice.origin?.iata_code || 
                                firstSlice.origin?.code || 
                                firstSlice.origin || 
                                origin;
                                
            const flightDestination = lastSlice.destination?.iata_code || 
                                     lastSlice.destination?.code || 
                                     lastSlice.destination || 
                                     destination;
  
            // ✅ FIXED: Determine if this is round-trip
            let isRoundTrip = false;
            let returnOrigin = '';
            let returnDestination = '';
  
            if (slices.length >= 2 && data.tripType === 'round-trip') {
              const outboundSlice = slices[0];
              const inboundSlice = slices[1];
              
              const outboundOrigin = outboundSlice.origin?.iata_code || outboundSlice.origin?.code || outboundSlice.origin || '';
              const outboundDest = outboundSlice.destination?.iata_code || outboundSlice.destination?.code || outboundSlice.destination || '';
              const inboundOrigin = inboundSlice.origin?.iata_code || inboundSlice.origin?.code || inboundSlice.origin || '';
              const inboundDest = inboundSlice.destination?.iata_code || inboundSlice.destination?.code || inboundSlice.destination || '';
              
              isRoundTrip = outboundDest === inboundOrigin && inboundDest === outboundOrigin;
              
              if (isRoundTrip) {
                returnOrigin = inboundOrigin;
                returnDestination = inboundDest;
              }
            }
  
            // ✅ FIXED: Build subtitle based on actual flight data
            let subtitle = '';
            if (isRoundTrip && returnOrigin && returnDestination) {
              subtitle = `${cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)} • ${flightOrigin} → ${flightDestination} • ${returnOrigin} → ${returnDestination}`;
            } else {
              subtitle = `${cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)} • ${flightOrigin} → ${flightDestination}`;
            }
  
            console.log(`📝 Result ${index} subtitle: "${subtitle}" (from actual flight data)`);
  
            return {
              id: offer.id || `offer-${offerRequestId}-${index}`,
              provider: airline,
              title: `Flight ${flightNumber}`,
              subtitle: subtitle,
              price: formattedPrice,
              time: timeDisplay,
              duration: durationStr,
              stops: stopsText,
              rating: 4.3 + Math.random() * 0.6,
              baggage: "23 kg checked + 8 kg cabin",
              aircraft: aircraft,
              layoverDetails: stopsText === "Direct" ? "Non-stop" : stopsText,
              image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400",
              type: "flights" as const,
              realData: {
                offerId: offer.id,
                offerRequestId: offerRequestId,
                departureTime,
                arrivalTime,
                airline,
                flightNumber,
                totalDuration: durationMinutes,
                stops: stopsCount,
                price: Number(totalPrice),
                currency,
                isRoundTrip: data.tripType === 'round-trip',
                slices: slices,
              },
            };
          });
  
          console.log(`✅ Transformed ${transformedResults.length} results`);
          console.log('📋 First result:', transformedResults[0]);
          setSearchResults(transformedResults);
        }
      } else {
        throw new Error('No flight offers data received: ' + (offersResult.message || 'Unknown error'));
      }
    } catch (error: any) {
      // Use a safer logging approach
      if (process.env.NODE_ENV === 'development') {
        console.warn("Flight search failed:", error);
      }
      
      let errorMessage = "Unable to fetch live flights. Showing curated options.";
      
      if (error.message?.includes("network") || error.message?.includes("fetch")) {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.message?.includes("No offer request ID") || error.message?.includes("Failed to create offer request")) {
        errorMessage = "Flight search service temporarily unavailable.";
      } else if (error.message?.includes("timed out")) {
        errorMessage = "Search timed out. Please try again.";
      } else if (error.message) {
        errorMessage = `Search error: ${error.message}`;
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

  const handleSelectResult = useCallback((item: SearchResult) => {
    setSelectedItem(item);

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
  
      if (userData.token) {
        setAuthToken(userData.token);
        localStorage.setItem("authToken", userData.token);
      }
  
      localStorage.setItem("travelUser", JSON.stringify(updatedUser));
  
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
    setHotelSearchParams(null);
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

  useEffect(() => {
    if (currentView === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView !== "home") {
      setSearchResults([]);
      setSearchError(null);
      setApiValidationErrors([]);
    }
  }, [currentView]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Payment Modal wrapped with Elements provider */}
      {showPayment && currentBooking && (
        <Elements stripe={stripePromise}>
          <PaymentForm 
            currentBooking={currentBooking}
            showPayment={showPayment}
            setShowPayment={setShowPayment}
            handlePaymentComplete={handlePaymentComplete}
            isLoggedIn={isLoggedIn}
            setIsLoggedIn={setIsLoggedIn}
            setIsAuthOpen={setIsAuthOpen}
            setAuthMode={setAuthMode}
          />
        </Elements>
      )}
      
      {showNav && (
        <Navbar
          isLoggedIn={isLoggedIn}
          user={user}
          activeTab={activeTab}
          onTabClick={setActiveTab}
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
            activeSearchTab={activeTab}
            onTabChange={setActiveTab}
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
          searchParams={
            hotelSearchParams || {
              adults: 1,
              guests: 1,
              checkInDate: new Date().toISOString().split('T')[0],
              checkOutDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
              cityCode: "LON",
              roomQuantity: 1,
              currency: "USD",
              bestRateOnly: true,
            }
          }
          onBack={() => setCurrentView("home")}
          onBook={(room) => {
            setCurrentView("review");
          }}
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
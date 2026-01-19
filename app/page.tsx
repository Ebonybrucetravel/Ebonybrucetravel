"use client";

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
import AuthModal from "../components/AuthModal";
import Profile from "../components/Profile";

export interface User {
  name: string;
  email: string;
  profilePicture?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  provider?: "email" | "google" | "facebook";
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
      price: "$120",
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
      price: "$250",
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
      price: "$100",
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
      price: "$250/night",
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
      price: "$200/night",
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
      price: "$300/night",
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
      price: "$85/day",
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
      price: "$120/day",
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
      price: "$150/day",
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
    "home" | "profile" | "hotel-details" | "review" | "success"
  >("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User>({
    name: "",
    email: "",
    dob: "1992-05-15",
    gender: "Male",
    phone: "+234 816 500 000",
  });
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [searchTime, setSearchTime] = useState<number>(0);

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

  // New state for profile tab selection
  const [activeProfileTab, setActiveProfileTab] = useState<string>("details");

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
    console.log("🔑 API Key Status:", {
      hasKey: !!apiKey,
      keyLength: apiKey?.length,
      keyPrefix: apiKey?.substring(0, 10) + "...",
      isValid: apiKey?.startsWith("AIza") && (apiKey?.length || 0) > 30,
    });
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("travelUser");
    const savedBookings = localStorage.getItem("travelBookings");

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsLoggedIn(true);
      } catch (error) {
        console.error("Failed to restore user session:", error);
        localStorage.removeItem("travelUser");
      }
    }

    if (savedBookings) {
      try {
        const parsedBookings = JSON.parse(savedBookings);
        setUserBookings(parsedBookings);
      } catch (error) {
        console.error("Failed to restore bookings:", error);
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

  useEffect(() => {
    if (currentView === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentView]);

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

  const openAuth = useCallback((mode: "login" | "register") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }, []);

  const handleLogin = useCallback(
    (userData: { name: string; email: string }) => {
      const updatedUser = {
        ...user,
        ...userData,
        provider: "email" as const,
        profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          userData.name
        )}&background=2563EB&color=fff`,
      };
      setUser(updatedUser);
      setIsLoggedIn(true);
      setIsAuthOpen(false);
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
            }
          : {
              name: "Facebook User",
              email: "user.fb@facebook.com",
              img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
              dob: "1990-01-01",
              gender: "Female",
              phone: "+234 111 111 111",
            };

      const updatedUser = {
        ...user,
        name: mockData.name,
        email: mockData.email,
        profilePicture: mockData.img,
        dob: mockData.dob,
        gender: mockData.gender,
        phone: mockData.phone,
        provider,
      };

      setUser(updatedUser);
      setIsLoggedIn(true);
      setIsAuthOpen(false);
      localStorage.setItem("travelUser", JSON.stringify(updatedUser));

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

  const handleUpdateUser = useCallback((updatedData: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  }, []);

  const handleCancelRequest = useCallback((booking: Booking) => {
    setUserBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id ? { ...b, status: "Cancel" as const } : b
      )
    );
    console.log("Booking cancelled:", booking.id);
  }, []);

  const handleSearch = useCallback(async (data: SearchParams) => {
    const startTime = Date.now();
    setSearchParams(data);
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSearchTime(0);

    try {
      console.log("🚀 Starting search with fallback results");

      await new Promise((resolve) => setTimeout(resolve, 500));

      const fallbackType = data?.type || "flights";
      const fallbackResults =
        FALLBACK_RESULTS[fallbackType] || FALLBACK_RESULTS.flights;

      const enhancedResults = fallbackResults.map((result) => ({
        ...result,
        type: result.type ?? fallbackType,
      }));

      setSearchResults(enhancedResults);
      setSearchTime(Date.now() - startTime);

      setTimeout(() => {
        const el = document.getElementById("search-results");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error: any) {
      console.error("❌ Search failed:", error);
      setSearchError("Showing premium travel options");
      const fallbackType = data?.type || "flights";
      setSearchResults(
        FALLBACK_RESULTS[fallbackType] || FALLBACK_RESULTS.flights
      );
      setSearchTime(Date.now() - startTime);
    } finally {
      setIsSearching(false);
    }
  }, []);

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

  const handleBookingComplete = useCallback(() => {
    if (selectedItem) {
      const newBooking: Booking = {
        id: Date.now().toString(),
        type:
          selectedItem.type === "flights"
            ? "flight"
            : selectedItem.type === "hotels"
            ? "hotel"
            : "car",
        title: selectedItem.title,
        provider: selectedItem.provider,
        subtitle: selectedItem.subtitle,
        date:
          new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }) +
          " – " +
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            }
          ),
        duration: selectedItem.duration,
        status: "Confirmed",
        price: selectedItem.price,
        currency: "NGN",
        iconBg:
          selectedItem.type === "flights"
            ? "bg-blue-50"
            : selectedItem.type === "hotels"
            ? "bg-yellow-50"
            : "bg-purple-50",
        imageUrl: selectedItem.image,
        bookingReference: `#${Date.now().toString().slice(-6)}`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setUserBookings((prev) => [newBooking, ...prev]);
    }

    setCurrentView("success");
  }, [selectedItem]);

  const navigateToProfile = useCallback(() => {
    if (!isLoggedIn) {
      openAuth("login");
    } else {
      setCurrentView("profile");
    }
  }, [isLoggedIn, openAuth]);

  const navigateToHome = useCallback(() => {
    setCurrentView("home");
    setSearchResults([]);
    setSearchError(null);
  }, []);

  const handleSignOut = useCallback(() => {
    setIsLoggedIn(false);
    setUser({
      name: "",
      email: "",
      dob: "1992-05-15",
      gender: "Male",
      phone: "+234 816 500 000",
    });
    setCurrentView("home");
    localStorage.removeItem("travelUser");
  }, []);

  const handleSearchClick = useCallback(() => {
    const hero = document.getElementById("hero-search");
    if (hero) {
      hero.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleTabChange = useCallback((tab: 'flights' | 'hotels' | 'cars') => {
    setActiveSearchTab(tab);
    setActiveNavTab(tab);
  }, []);

  const handleNavTabChange = useCallback((tab: 'flights' | 'hotels' | 'cars') => {
    setActiveNavTab(tab);
    setActiveSearchTab(tab);
  }, []);

  const handleMenuClick = useCallback(() => {
    // For mobile menu - you can implement additional functionality if needed
    console.log("Mobile menu clicked");
  }, []);

  // NEW: Handle profile tab selection from Navbar dropdown
  const handleProfileTabSelect = useCallback((tabId: string) => {
    setActiveProfileTab(tabId);
    setCurrentView("profile");
    // You might want to pass this to the Profile component
    console.log("Selected profile tab:", tabId);
  }, []);

  useEffect(() => {
    if (currentView !== "home") {
      setSearchResults([]);
      setSearchError(null);
    }
  }, [currentView]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar
        isLoggedIn={isLoggedIn}
        user={user}
        activeTab={activeNavTab}
        onTabClick={handleNavTabChange}
        onSignIn={() => openAuth("login")}
        onRegister={() => openAuth("register")}
        onProfileClick={navigateToProfile}
        onLogoClick={navigateToHome}
        onMenuClick={handleMenuClick}
        onSignOut={handleSignOut} // Added: Pass sign out handler
        onProfileTabSelect={handleProfileTabSelect} // Added: Pass profile tab selection handler
      />

      {currentView === "home" && (
        <>
          <Hero 
            onSearch={handleSearch} 
            loading={isSearching}
            activeSearchTab={activeSearchTab}
            onTabChange={handleTabChange}
          />
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-0">
            {(isSearching || searchResults.length > 0 || searchError) && (
              <section
                id="search-results"
                className="scroll-mt-24"
              >
                {isSearching ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 text-center shadow-lg border border-gray-200/50 flex flex-col items-center animate-pulse">
                    <div className="w-16 h-16 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <h3 className="text-xl font-bold text-gray-900 mt-4">
                      Searching premium options...
                    </h3>
                    <p className="text-gray-500 mt-1">
                      Fetching the best travel deals for you
                    </p>
                    <div className="mt-3 w-full max-w-md bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-3/4"></div>
                    </div>
                    <p className="text-sm text-blue-600 mt-3">
                      Premium Travel Network
                    </p>
                  </div>
                ) : searchError ? (
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
                      {searchError}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Premium travel options ready
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
                      Search Again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Premium Search Results
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                          {searchResults.length} premium options found in{" "}
                          {(searchTime / 1000).toFixed(2)}s
                          <span className="ml-2 text-blue-600 text-xs">
                            ✓ Premium Selection
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSearchResults([]);
                          setSearchError(null);
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Clear Results
                      </button>
                    </div>
                    <SearchResults
                      results={searchResults}
                      searchParams={searchParams}
                      onClear={() => {
                        setSearchResults([]);
                        setSearchError(null);
                      }}
                      onSelect={handleSelectResult}
                    />
                  </div>
                )}
              </section>
            )}

            {/* Partners starts immediately - NO SPACE */}
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

      {currentView === "profile" && (
        <Profile
          user={user}
          onUpdateUser={handleUpdateUser}
          onBack={navigateToHome}
          onSignOut={handleSignOut}
          onBookItem={handleBookItem}
          onCancelRequest={handleCancelRequest}
          initialActiveTab={activeProfileTab} // Pass the active tab to Profile
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
        />
      )}

      {currentView === "success" && selectedItem && (
        <BookingSuccess
          item={selectedItem}
          searchParams={searchParams}
          onBack={() => setCurrentView("home")}
        />
      )}

      <Newsletter />
      <Footer />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLogin}
        onSocialLogin={handleSocialLogin}
        initialMode={authMode}
      />

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

      {isAiOpen && (
        <AIAssistant onClose={() => setIsAiOpen(false)} user={user} />
      )}
    </div>
  );
}
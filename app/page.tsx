'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Partners from '../components/Partners';
import ExclusiveOffers from '../components/ExclusiveOffers';
import TrendingDestinations from '../components/TrendingDestinations';
import HomesGrid from '../components/HomesGrid';
import CarRentals from '../components/CarRentals';
import SpecializedServices from '../components/SpecializedServices';
import Newsletter from '../components/Newsletter';
import Footer from '../components/Footer';
import AIAssistant from '../components/AIAssistant';
import SearchResults from '../components/SearchResults';
import ReviewTrip from '../components/ReviewTrip';
import AuthModal from '../components/AuthModal';
import Profile from '../components/Profile';
import { GoogleGenAI, Type } from '@google/genai';

export interface User {
  name: string;
  email: string;
  profilePicture?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  provider?: 'email' | 'google' | 'facebook';
}

export interface SearchSegment {
  from: string;
  to: string;
  date: string;
}

export interface SearchParams {
  type: 'flights' | 'hotels' | 'car-rentals';
  tripType?: 'one-way' | 'round-trip' | 'multi-city';
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
}

// Fallback results
const FALLBACK_RESULTS: Record<string, SearchResult[]> = {
  flights: [
    { 
      id: 'fb-1', 
      provider: 'Air Peace', 
      title: 'Flight P47124', 
      subtitle: 'Standard Economy', 
      price: '$120', 
      time: '08:00 AM - 09:15 AM', 
      duration: '1h 15m', 
      stops: 'Non-stop', 
      rating: 4.5,
      baggage: 'Cabin: 7kg, Checked: 23kg',
      aircraft: 'Boeing 737',
      layoverDetails: 'Direct flight',
      image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400'
    },
    { 
      id: 'fb-2', 
      provider: 'Ibom Air', 
      title: 'Flight I7100', 
      subtitle: 'Premium Economy', 
      price: '$180', 
      time: '02:30 PM - 03:45 PM', 
      duration: '1h 15m', 
      stops: 'Non-stop', 
      rating: 4.8,
      baggage: 'Cabin: 10kg, Checked: 30kg',
      aircraft: 'Airbus A320',
      layoverDetails: 'Direct flight',
      image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400'
    }
  ],
  hotels: [
    {
      id: 'fb-hotel-1',
      provider: 'Grand Plaza',
      title: 'Deluxe Suite',
      subtitle: 'City Center • 0.5 miles',
      price: '$250/night',
      rating: 4.7,
      amenities: ['Free WiFi', 'Breakfast Included', 'Swimming Pool', 'Fitness Center', 'Spa'],
      features: ['Sea View', 'King Bed', 'Private Balcony', 'Mini Bar', 'Room Service'],
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400'
    }
  ],
  'car-rentals': [
    {
      id: 'fb-car-1',
      provider: 'Enterprise',
      title: 'Toyota Prado',
      subtitle: 'Automatic • 7 Seats • Petrol',
      price: '$85/day',
      features: ['SUV', 'Automatic', 'Air Conditioning', 'GPS Navigation', 'Bluetooth'],
      image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=400'
    }
  ]
};

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'profile' | 'review'>('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User>({ 
    name: '', 
    email: '',
    dob: '1992-05-15',
    gender: 'Male',
    phone: '+234 816 500 000'
  });
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [searchTime, setSearchTime] = useState<number>(0);
  
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Log API key status on mount
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
    console.log('🔑 API Key Status:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length,
      keyPrefix: apiKey?.substring(0, 10) + '...',
      isValid: apiKey?.startsWith('AIza') && (apiKey?.length || 0) > 30
    });
  }, []);

  // Restore user session from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('travelUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Failed to restore user session:', error);
        localStorage.removeItem('travelUser');
      }
    }
  }, []);

  // Save user to localStorage when updated
  useEffect(() => {
    if (isLoggedIn && user.name && user.email) {
      localStorage.setItem('travelUser', JSON.stringify(user));
    } else if (!isLoggedIn) {
      localStorage.removeItem('travelUser');
    }
  }, [user, isLoggedIn]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsAiOpen(true);
      }
      if (e.key === 'Escape') {
        if (isAiOpen) setIsAiOpen(false);
        if (isAuthOpen) setIsAuthOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAiOpen, isAuthOpen]);

  const openAuth = useCallback((mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }, []);

  const handleLogin = useCallback((userData: { name: string; email: string }) => {
    const updatedUser = { 
      ...user, 
      ...userData, 
      provider: 'email' as const,
      profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=2563EB&color=fff`
    };
    setUser(updatedUser);
    setIsLoggedIn(true);
    setIsAuthOpen(false);
    localStorage.setItem('travelUser', JSON.stringify(updatedUser));
    setCurrentView('profile');
  }, [user]);

  const handleSocialLogin = useCallback((provider: 'google' | 'facebook') => {
    const mockData = provider === 'google' 
      ? { 
          name: 'Google Traveler', 
          email: 'traveler.google@gmail.com', 
          img: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
          dob: '1990-01-01',
          gender: 'Male',
          phone: '+234 000 000 000'
        }
      : { 
          name: 'Facebook User', 
          email: 'user.fb@facebook.com', 
          img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
          dob: '1990-01-01',
          gender: 'Female',
          phone: '+234 111 111 111'
        };

    const updatedUser = {
      ...user,
      name: mockData.name,
      email: mockData.email,
      profilePicture: mockData.img,
      dob: mockData.dob,
      gender: mockData.gender,
      phone: mockData.phone,
      provider
    };
    
    setUser(updatedUser);
    setIsLoggedIn(true);
    setIsAuthOpen(false);
    localStorage.setItem('travelUser', JSON.stringify(updatedUser));
    setCurrentView('profile');
  }, [user]);

  const handleUpdateUser = useCallback((updatedData: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  }, []);

  const handleSearch = useCallback(async (data: SearchParams) => {
    const startTime = Date.now();
    setSearchParams(data);
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSearchTime(0);

    try {
      // Get API key
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
      
      if (!apiKey || !apiKey.startsWith('AIza') || apiKey.length < 30) {
        console.error('Invalid API key format');
        throw new Error('API_KEY_INVALID');
      }

      console.log('🚀 Starting AI search with key:', apiKey.substring(0, 15) + '...');
      
      const ai = new GoogleGenAI({ apiKey });
      
      let contextString = '';
      let specificInstructions = '';

      if (data.type === 'flights') {
        if (data.tripType === 'multi-city' && data.segments && data.segments.length > 0) {
          contextString = `Multi-city itinerary: ${data.segments.map((s: SearchSegment) => `${s.from} to ${s.to} on ${s.date}`).join(' -> ')}. Travellers: ${data.travellers || 1}. Cabin: ${data.cabinClass || 'Economy'}`;
          specificInstructions = 'Provide flight numbers, airlines, departure/arrival times, and layover details for each segment. Include realistic prices in USD.';
        } else {
          const seg = data.segments?.[0] || { from: 'Lagos', to: 'Abuja', date: '2024-01-01' };
          contextString = `${data.tripType || 'one-way'} flight from ${seg.from} to ${seg.to} on ${seg.date}${data.returnDate ? ' returning on ' + data.returnDate : ''}. Travellers: ${data.travellers || 1}. Cabin: ${data.cabinClass || 'Economy'}`;
          specificInstructions = 'Provide high-quality baggage details (cabin and checked), aircraft models, and specific layover information if not direct. Include realistic prices in USD.';
        }
      } else if (data.type === 'hotels') {
        contextString = `Hotels and stays in ${data.location || 'London'}`;
        specificInstructions = 'Provide room types (e.g. Deluxe Suite), amenities (e.g. WiFi, Breakfast), and precise distance from city center. Include realistic prices in USD.';
      } else {
        contextString = `Car rentals in ${data.carPickUp || 'Los Angeles'}`;
        specificInstructions = 'Provide car models, transmission type, fuel policy, and seat count. Include realistic prices in USD.';
      }

      const prompt = `Generate 3-5 realistic ${data.type} search results for: ${contextString}. ${specificInstructions}. 
      Format the response as a JSON array. Each result should have: id, provider, title, subtitle, price, and optional fields like time, duration, stops, rating, baggage, aircraft, layoverDetails, image, amenities, features.
      Make the data realistic and useful for travelers. Include image URLs from Unsplash (use travel/transportation related images).
      Respond ONLY with the JSON array.`;

      console.log('📝 AI Prompt sent');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash', // More reliable than gemini-3-flash-preview
        contents: [{ 
          parts: [{ 
            text: prompt
          }] 
        }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.8,
          maxOutputTokens: 1500,
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                provider: { type: Type.STRING },
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                price: { type: Type.STRING },
                time: { type: Type.STRING },
                duration: { type: Type.STRING },
                stops: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                baggage: { type: Type.STRING },
                aircraft: { type: Type.STRING },
                layoverDetails: { type: Type.STRING },
                image: { type: Type.STRING },
                amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
                features: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "provider", "title", "subtitle", "price"]
            }
          }
        }
      });

      const text = response.text || '[]';
      console.log('🤖 Raw AI Response:', text.substring(0, 200) + '...');
      
      // Clean the JSON response
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      console.log('🧹 Cleaned JSON:', jsonStr.substring(0, 200) + '...');
      
      let parsedResults: SearchResult[] = [];
      
      try {
        parsedResults = JSON.parse(jsonStr) as SearchResult[];
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        // Try to extract JSON from text
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          parsedResults = JSON.parse(jsonMatch[0]) as SearchResult[];
        } else {
          throw new Error('NO_VALID_JSON');
        }
      }
      
      if (Array.isArray(parsedResults) && parsedResults.length > 0) {
        // Add images if missing
        const enhancedResults = parsedResults.map((result, index) => ({
          ...result,
          image: result.image || `https://images.unsplash.com/photo-${1500000000000 + index}?auto=format&fit=crop&q=80&w=400`
        }));
        setSearchResults(enhancedResults);
        setSearchTime(Date.now() - startTime);
        console.log('✅ Search successful! Found', enhancedResults.length, 'results');
      } else {
        throw new Error('NO_RESULTS');
      }

      setTimeout(() => {
        const el = document.getElementById('search-results');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

    } catch (error: any) {
      console.error("❌ Search failed:", error.message || error);
      
      let errorMsg = "Our AI assistant is currently over-capacity. Showing premium results.";
      
      if (error.message === 'API_KEY_INVALID') {
        errorMsg = "AI service is not configured. Please check your API key.";
      } else if (error.message === 'NO_RESULTS' || error.message === 'NO_VALID_JSON') {
        errorMsg = "The AI couldn't generate valid results. Showing premium options.";
      } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
        errorMsg = "AI service quota exceeded. Showing premium results.";
      } else if (error.message?.includes('API key') || error.message?.includes('permission')) {
        errorMsg = "API key issue. Please verify your Google AI API key.";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMsg = "Network issue. Please check your connection.";
      }
      
      setSearchError(errorMsg);
      const fallbackType = data?.type || 'flights';
      const fallbackResults = FALLBACK_RESULTS[fallbackType] || FALLBACK_RESULTS.flights;
      setSearchResults(fallbackResults);
      setSearchTime(Date.now() - startTime);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectResult = useCallback((item: SearchResult) => {
    setSelectedItem(item);
    setCurrentView('review');
  }, []);

  const navigateToProfile = useCallback(() => {
    if (!isLoggedIn) {
      openAuth('login');
    } else {
      setCurrentView('profile');
    }
  }, [isLoggedIn, openAuth]);

  const navigateToHome = useCallback(() => {
    setCurrentView('home');
  }, []);

  const handleSignOut = useCallback(() => {
    setIsLoggedIn(false);
    setUser({ 
      name: '', 
      email: '', 
      dob: '1992-05-15', 
      gender: 'Male', 
      phone: '+234 816 500 000' 
    });
    setCurrentView('home');
    localStorage.removeItem('travelUser');
  }, []);

  const handleSearchClick = useCallback(() => {
    const hero = document.getElementById('hero-search');
    if (hero) {
      hero.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar 
        isLoggedIn={isLoggedIn}
        user={user}
        onSignIn={() => openAuth('login')} 
        onRegister={() => openAuth('register')}
        onProfileClick={navigateToProfile}
        onLogoClick={navigateToHome}
        onSearchClick={handleSearchClick}
      />
      
      {currentView === 'home' && (
        <>
          <Hero onSearch={handleSearch} loading={isSearching} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
            
            {/* Search Feedback & Results Section */}
            {(isSearching || searchResults.length > 0 || searchError) && (
              <section id="search-results" className="scroll-mt-24 space-y-6 transition-all duration-300">
                {isSearching ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 text-center shadow-lg border border-gray-200/50 flex flex-col items-center animate-pulse">
                    <div className="w-16 h-16 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mb-6"></div>
                    <h3 className="text-2xl font-bold text-gray-900 mt-6">AI is searching the globe...</h3>
                    <p className="text-gray-500 mt-2">Analyzing millions of travel options for you</p>
                    <div className="mt-4 w-full max-w-md bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full animate-pulse w-3/4"></div>
                    </div>
                    <p className="text-sm text-blue-600 mt-4">
                      Powered by Google Gemini AI
                    </p>
                  </div>
                ) : searchError ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 text-center shadow-lg border border-yellow-100 flex flex-col items-center animate-fade-in">
                    <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500 mb-6">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{searchError}</h3>
                    <p className="text-gray-600 mb-6">Showing premium travel options</p>
                    {searchTime > 0 && (
                      <p className="text-sm text-gray-400 mb-4">
                        Completed in {(searchTime / 1000).toFixed(2)}s
                      </p>
                    )}
                    <button 
                      onClick={() => searchParams && handleSearch(searchParams)} 
                      className="mt-4 px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all hover:shadow-xl active:scale-95"
                    >
                      Try AI Search Again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900">AI-Powered Search Results</h2>
                        <p className="text-gray-500 mt-1">
                          {searchResults.length} premium options found in {(searchTime / 1000).toFixed(2)}s
                          <span className="ml-2 text-blue-600 text-sm">
                            ✓ Powered by Gemini AI
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSearchResults([]);
                          setSearchError(null);
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors"
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

            <Partners />
            <ExclusiveOffers />
            <TrendingDestinations />
            <HomesGrid />
            <CarRentals />
            <SpecializedServices />
          </main>
        </>
      )}

      {currentView === 'profile' && (
        <Profile 
          user={user} 
          onUpdateUser={handleUpdateUser} 
          onBack={navigateToHome} 
          onSignOut={handleSignOut} 
        />
      )}

      {currentView === 'review' && selectedItem && (
        <ReviewTrip 
          item={selectedItem} 
          searchParams={searchParams} 
          onBack={() => {
            setCurrentView('home');
            setTimeout(() => {
              const el = document.getElementById('search-results');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }} 
          user={user}
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

      {/* AI Assistant Button */}
      <button 
        onClick={() => setIsAiOpen(true)} 
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 z-50 group"
        aria-label="Open AI Trip Planner (Ctrl+K)"
      >
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        <span className="font-bold hidden sm:inline text-lg">Chat</span>
        <span className="hidden sm:inline text-xs bg-blue-800/50 px-2 py-1 rounded-lg backdrop-blur-sm">
          Ctrl+K
        </span>
      </button>

      {isAiOpen && <AIAssistant onClose={() => setIsAiOpen(false)} user={user} />}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
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
}

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'profile'>('home');
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useState<any>(null);
  
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleLogin = (userData: { name: string; email: string }) => {
    setUser(prev => ({ ...prev, ...userData }));
    setIsLoggedIn(true);
    setIsAuthOpen(false);
    setCurrentView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateUser = (updatedData: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  const handleSearch = async (data: any) => {
    setSearchParams(data);
    setIsSearching(true);
    setSearchResults([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let flightContext = '';
      if (data.tripType === 'multi-city') {
        flightContext = `Multi-city itinerary: ${data.segments.map((s: any) => `${s.from} to ${s.to} on ${s.date}`).join(' -> ')}`;
      } else {
        flightContext = `${data.tripType} flight from ${data.segments[0].from} to ${data.segments[0].to} on ${data.segments[0].date}${data.returnDate ? ' returning on ' + data.returnDate : ''}`;
      }

      const prompt = `Generate a JSON list of 5 realistic ${data.type} search results for a travel website. 
      Search parameters: ${flightContext}. Travellers: ${data.travellers}. Cabin: ${data.cabinClass}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
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
                rating: { type: Type.NUMBER }
              },
              required: ["id", "provider", "title", "subtitle", "price"]
            }
          }
        }
      });

      const results = JSON.parse(response.text || '[]');
      setSearchResults(results);
      
      setTimeout(() => {
        const resultsEl = document.getElementById('search-results');
        if (resultsEl) resultsEl.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (error) {
      console.error("Search failed", error);
      setSearchResults([
        { id: 'fb-1', provider: 'Air Peace', title: 'Flight P47124', subtitle: 'Standard Economy', price: '$120', time: '08:00 AM - 09:15 AM', duration: '1h 15m', stops: 'Non-stop', rating: 4.5 }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const navigateToProfile = () => {
    setCurrentView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setUser({ name: '', email: '', dob: '1992-05-15', gender: 'Male', phone: '+234 816 500 000' });
    navigateToHome();
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      <Navbar 
        isLoggedIn={isLoggedIn}
        user={user}
        onSignIn={() => openAuth('login')} 
        onRegister={() => openAuth('register')}
        onProfileClick={navigateToProfile}
        onLogoClick={navigateToHome}
      />
      
      {currentView === 'home' ? (
        <>
          <Hero onSearch={handleSearch} loading={isSearching} />
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-24">
            {searchResults.length > 0 && (
              <section id="search-results" className="pt-8 scroll-mt-24">
                <SearchResults 
                  results={searchResults} 
                  searchParams={searchParams} 
                  onClear={() => setSearchResults([])} 
                />
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
      ) : (
        <Profile user={user} onUpdateUser={handleUpdateUser} onBack={navigateToHome} onSignOut={handleSignOut} />
      )}
      
      <Newsletter />
      <Footer />
      
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLoginSuccess={handleLogin}
        initialMode={authMode} 
      />

      <button 
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 transition-transform hover:scale-105 z-50"
      >
        <span className="font-semibold">AI Trip Planner</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>

      {isAiOpen && <AIAssistant onClose={() => setIsAiOpen(false)} />}
    </div>
  );
}

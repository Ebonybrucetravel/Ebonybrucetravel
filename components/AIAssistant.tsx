'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AIAssistantProps {
  onClose: () => void;
  user?: { name: string; email: string; profilePicture?: string; token?: string } | null;
}

// Configuration
const WHATSAPP_NUMBER = '+447479208267';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;
const API_BASE_URL = 'https://ebony-bruce-production.up.railway.app/api/v1';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY!);

// Types
interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  passengers: number;
  cabinClass: string;
}

interface HotelSearchParams {
  cityCode: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  roomQuantity: number;
  currency: string;
}

interface CarRentalSearchParams {
  pickupLocationCode: string;
  pickupDateTime: string;
  dropoffLocationCode: string;
  dropoffDateTime: string;
  currency: string;
  passengers: number;
}

// Keywords for query detection
const COMPLEX_QUERY_KEYWORDS = [
  'visa', 'passport', 'document', 'requirement', 'policy', 'cancellation',
  'refund', 'baggage', 'luggage', 'weight limit', 'custom', 'immigration'
];

const isComplexQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  return COMPLEX_QUERY_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
};

// Extract travel info from user message
const extractTravelInfo = (message: string): {
  from?: string;
  to?: string;
  date?: string;
  city?: string;
  passengers?: number;
  checkIn?: string;
  checkOut?: string;
} => {
  const lowerMessage = message.toLowerCase();
  
  // Airport/city codes mapping
  const airportCodes: { [key: string]: string } = {
    'london': 'LON', 'paris': 'PAR', 'new york': 'NYC', 'dubai': 'DXB',
    'tokyo': 'TYO', 'los angeles': 'LAX', 'chicago': 'CHI', 'sydney': 'SYD',
    'singapore': 'SIN', 'lagos': 'LOS', 'abuja': 'ABV', 'manchester': 'MAN',
    'edinburgh': 'EDI', 'glasgow': 'GLA', 'birmingham': 'BHX', 'bristol': 'BRS'
  };
  
  let from: string | undefined;
  let to: string | undefined;
  let city: string | undefined;
  let passengers = 1;
  
  // Extract cities
  Object.entries(airportCodes).forEach(([key, code]) => {
    if (lowerMessage.includes(key)) {
      if (lowerMessage.includes('from ' + key) || (lowerMessage.includes(key) && lowerMessage.includes(' to '))) {
        from = code;
      } else if (lowerMessage.includes(' to ' + key)) {
        to = code;
      } else if (lowerMessage.includes('in ' + key) || lowerMessage.includes('at ' + key)) {
        city = code;
      }
    }
  });
  
  // Extract passenger count
  const passengerMatch = lowerMessage.match(/(\d+)\s*(passenger|person|people|adult)/i);
  if (passengerMatch) passengers = parseInt(passengerMatch[1]);
  
  // Extract dates
  let date = new Date().toISOString().split('T')[0];
  if (lowerMessage.includes('tomorrow')) {
    date = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  } else if (lowerMessage.includes('next week')) {
    date = new Date(Date.now() + 604800000).toISOString().split('T')[0];
  }
  
  let checkIn = date;
  let checkOut = new Date(new Date(date).getTime() + 86400000 * 3).toISOString().split('T')[0];
  
  return { from, to, date, city, passengers, checkIn, checkOut };
};

const AIAssistant: React.FC<AIAssistantProps> = ({ onClose, user }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    {
      role: 'assistant',
      content: user?.name
        ? `Hello ${user.name}! I'm your travel assistant. I can search real flights, hotels, and car rentals. Try asking:\n\n "Flights from London to Paris tomorrow"\n "Hotels in New York next week"\n "Car rental in Lagos for 3 days"`
        : "Hello! I'm your travel assistant. I can search real flights, hotels, and car rentals. Try asking:\n\n Flights from London to Paris tomorrow\n Hotels in New York next week\n Car rental in Lagos for 3 days"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [aiStatus, setAiStatus] = useState<'checking' | 'working' | 'fallback'>('checking');

  const brandBlue = '#32A6D7';
  const whatsappGreen = '#25D366';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Test Google AI
  useEffect(() => {
    const testGoogleAI = async () => {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        await model.generateContent("Hello");
        setAiStatus('working');
      } catch (error) {
        console.error('Google AI test failed:', error);
        setAiStatus('fallback');
      }
    };
    testGoogleAI();
  }, []);

  // Helper function to get headers (with or without auth token)
  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (user?.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }
    return headers;
  };

  // Search Flights
  const searchFlights = async (params: FlightSearchParams): Promise<any[]> => {
    try {
      console.log('🔍 Searching flights:', params);
      
      const response = await fetch(`${API_BASE_URL}/bookings/search/flights`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(params)
      });
      
      if (!response.ok) throw new Error(`Flight search failed: ${response.status}`);
      
      const data = await response.json();
      const offerRequestId = data.data?.offerRequestId || data.offerRequestId;
      
      if (!offerRequestId) return [];
      
      const offersResponse = await fetch(
        `${API_BASE_URL}/bookings/offers?offer_request_id=${offerRequestId}&limit=5`,
        { headers: getHeaders() }
      );
      
      if (!offersResponse.ok) return [];
      
      const offersData = await offersResponse.json();
      const offers = offersData.data?.offers || offersData.offers || [];
      
      return offers.map((offer: any) => ({
        airline: offer.owner?.name || 'Unknown',
        price: offer.total_amount || '0',
        currency: offer.total_currency || 'GBP',
        departure: offer.slices?.[0]?.segments?.[0]?.departing_at || '',
        arrival: offer.slices?.[0]?.segments?.slice(-1)[0]?.arriving_at || '',
        duration: offer.slices?.[0]?.duration || '',
        stops: (offer.slices?.[0]?.segments?.length || 1) - 1
      }));
    } catch (error) {
      console.error('Flight search error:', error);
      return [];
    }
  };

  // Search Hotels
  const searchHotels = async (params: HotelSearchParams): Promise<any[]> => {
    try {
      console.log('🏨 Searching hotels:', params);
      
      const response = await fetch(`${API_BASE_URL}/bookings/search/hotels/amadeus`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(params)
      });
      
      if (!response.ok) throw new Error('Hotel search failed');
      
      const data = await response.json();
      const hotels = data.data || data.hotels || [];
      
      return hotels.slice(0, 5).map((hotel: any) => ({
        name: hotel.hotel?.name || hotel.name,
        address: hotel.hotel?.address?.lines?.join(', ') || 'Address available',
        price: hotel.offers?.[0]?.price?.total || '0',
        currency: hotel.offers?.[0]?.price?.currency || 'GBP',
        rating: hotel.hotel?.rating || 0
      }));
    } catch (error) {
      console.error('Hotel search error:', error);
      return [];
    }
  };

  // Search Car Rentals
  const searchCarRentals = async (params: CarRentalSearchParams): Promise<any[]> => {
    try {
      console.log('🚗 Searching car rentals:', params);
      
      const response = await fetch(`${API_BASE_URL}/bookings/search/car-rentals`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(params)
      });
      
      if (!response.ok) throw new Error('Car rental search failed');
      
      const data = await response.json();
      const cars = data.data?.data || data.cars || [];
      
      return cars.slice(0, 5).map((car: any) => ({
        provider: car.serviceProvider?.name || 'Unknown',
        vehicle: car.vehicle?.description || 'Standard Vehicle',
        price: car.quotation?.monetaryAmount || '0',
        currency: car.currency || 'GBP',
        seats: car.vehicle?.seats?.[0]?.count || 5,
        transmission: car.vehicle?.transmission || 'Automatic'
      }));
    } catch (error) {
      console.error('Car rental search error:', error);
      return [];
    }
  };

  // Format flight response
  const formatFlightResponse = (flights: any[], from: string, to: string): string => {
    if (flights.length === 0) {
      return `No flights found from ${from} to ${to}. Try different dates or destinations.`;
    }
    
    let response = `✈️ Flights from ${from} to ${to}\n\n`;
    flights.forEach((flight, i) => {
      response += `${i + 1}. ${flight.airline}\n`;
      response += `   Price: ${flight.currency} ${parseFloat(flight.price).toFixed(2)}\n`;
      response += `   Duration: ${flight.duration}\n`;
      response += `   Stops: ${flight.stops}\n\n`;
    });
    response += `Want to book? Contact us on WhatsApp for assistance!`;
    return response;
  };

  // Format hotel response
  const formatHotelResponse = (hotels: any[], city: string): string => {
    if (hotels.length === 0) {
      return `No hotels found in ${city}. Try different dates or locations.`;
    }
    
    let response = `🏨 Hotels in ${city}\n\n`;
    hotels.forEach((hotel, i) => {
      response += `${i + 1}. ${hotel.name}\n`;
      response += `   Price: ${hotel.currency} ${parseFloat(hotel.price).toFixed(2)} per night\n`;
      if (hotel.rating > 0) response += `   Rating: ${'⭐'.repeat(Math.round(hotel.rating))}\n`;
      response += `   ${hotel.address}\n\n`;
    });
    response += `Want to book? Contact us on WhatsApp for assistance!`;
    return response;
  };

  // Format car rental response
  const formatCarResponse = (cars: any[], city: string): string => {
    if (cars.length === 0) {
      return `No car rentals found in ${city}. Try different dates or locations.`;
    }
    
    let response = `🚗 Car Rentals in ${city}\n\n`;
    cars.forEach((car, i) => {
      response += `${i + 1}. ${car.provider} - ${car.vehicle}\n`;
      response += `   Price: ${car.currency} ${parseFloat(car.price).toFixed(2)}\n`;
      response += `   Seats: ${car.seats} | Transmission: ${car.transmission}\n\n`;
    });
    response += `Want to book? Contact us on WhatsApp for assistance!`;
    return response;
  };

  // Google AI response
  const getAIResponse = async (userMessage: string): Promise<string> => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(userMessage);
      return result.response.text();
    } catch (error) {
      console.error('AI error:', error);
      return getFallbackResponse(userMessage);
    }
  };

  const getFallbackResponse = (message: string): string => {
    const lower = message.toLowerCase();
    if (lower.includes('flight')) return "To search flights, tell me: 'Flights from London to Paris tomorrow'";
    if (lower.includes('hotel')) return "To search hotels, tell me: 'Hotels in New York next week'";
    if (lower.includes('car')) return "To search car rentals, tell me: 'Car rental in Lagos for 3 days'";
    return "I can help you search flights, hotels, and car rentals. Just tell me what you're looking for!";
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const travelInfo = extractTravelInfo(userMessage);
      let apiResponse = '';

      // Check for complex queries first
      if (isComplexQuery(userMessage)) {
        apiResponse = `For assistance with ${userMessage}, please contact our travel specialists on WhatsApp. They can provide personalized help.`;
      }
      // Flight search
      else if ((userMessage.toLowerCase().includes('flight') || userMessage.toLowerCase().includes('fly')) && 
               travelInfo.from && travelInfo.to) {
        
        const flightParams: FlightSearchParams = {
          origin: travelInfo.from,
          destination: travelInfo.to,
          departureDate: travelInfo.date || new Date().toISOString().split('T')[0],
          passengers: travelInfo.passengers || 1,
          cabinClass: 'economy'
        };
        
        const flights = await searchFlights(flightParams);
        apiResponse = formatFlightResponse(flights, flightParams.origin, flightParams.destination);
      }
      // Hotel search
      else if ((userMessage.toLowerCase().includes('hotel') || userMessage.toLowerCase().includes('stay')) && 
               travelInfo.city) {
        
        const hotelParams: HotelSearchParams = {
          cityCode: travelInfo.city,
          checkInDate: travelInfo.checkIn || new Date().toISOString().split('T')[0],
          checkOutDate: travelInfo.checkOut || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          adults: travelInfo.passengers || 2,
          roomQuantity: 1,
          currency: 'GBP'
        };
        
        const hotels = await searchHotels(hotelParams);
        apiResponse = formatHotelResponse(hotels, travelInfo.city);
      }
      // Car rental search
      else if ((userMessage.toLowerCase().includes('car') || userMessage.toLowerCase().includes('rental')) && 
               travelInfo.city) {
        
        const pickupDateTime = (travelInfo.date || new Date().toISOString().split('T')[0]) + 'T10:00:00';
        const dropoffDateTime = new Date(new Date(pickupDateTime).getTime() + 86400000 * 3).toISOString();
        
        const carParams: CarRentalSearchParams = {
          pickupLocationCode: travelInfo.city,
          pickupDateTime: pickupDateTime,
          dropoffLocationCode: travelInfo.city,
          dropoffDateTime: dropoffDateTime,
          currency: 'GBP',
          passengers: travelInfo.passengers || 2
        };
        
        const cars = await searchCarRentals(carParams);
        apiResponse = formatCarResponse(cars, travelInfo.city);
      }
      // General conversation
      else {
        apiResponse = await getAIResponse(userMessage);
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: apiResponse }]);
    } catch (error) {
      console.error("AI Chat error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Please try again or contact us on WhatsApp for immediate assistance."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openWhatsApp = () => {
    window.open(WHATSAPP_LINK, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-end p-4 pointer-events-none">
      <div className="w-full max-w-md h-[600px] bg-white rounded-3xl shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 rounded-t-3xl flex justify-between items-center text-white" style={{ backgroundColor: brandBlue }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold">Travel Assistant</h3>
              <p className="text-xs opacity-90">{aiStatus === 'working' ? 'Online' : 'Ready'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'text-white rounded-tr-none' : 'bg-white text-gray-700 shadow-sm rounded-tl-none'}`} style={m.role === 'user' ? { backgroundColor: brandBlue } : {}}>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: brandBlue }}></div>
                <div className="w-2.5 h-2.5 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ backgroundColor: brandBlue }}></div>
                <div className="w-2.5 h-2.5 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ backgroundColor: brandBlue }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100 rounded-b-3xl">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about flights, hotels, or cars..."
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none text-sm"
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-3 text-white rounded-xl transition disabled:opacity-50"
              style={{ backgroundColor: brandBlue }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2 text-xs">
              <span className="text-green-600">Flights</span>
              <span className="text-green-600">Hotels</span>
              <span className="text-green-600">Cars</span>
            </div>
            <button onClick={openWhatsApp} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: '#f0f9f0', color: whatsappGreen }}>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z"/>
              </svg>
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
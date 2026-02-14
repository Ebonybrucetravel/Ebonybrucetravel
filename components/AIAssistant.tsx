'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AIAssistantProps {
  onClose: () => void;
  user?: { name: string; email: string; profilePicture?: string; token?: string };
}

// Configuration
const WHATSAPP_NUMBER = '+447479208267';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;
const API_BASE_URL = 'https://ebony-bruce-production.up.railway.app/api/v1';

// Initialize Google AI with a model that works in the free tier
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY!);
// Using Gemini 2.5 Flash which is available in the free tier
const AI_MODEL = 'gemini-2.5-flash'; // Free tier model

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

interface FlightOffer {
  id: string;
  airline: string;
  price: string;
  currency: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  offerId?: string;
}

interface HotelOffer {
  id: string;
  hotelId: string;
  name: string;
  address: string;
  price: string;
  currency: string;
  rating: number;
  amenities: string[];
  images?: { url: string; type: string }[];
}

interface CarRentalOffer {
  id: string;
  provider: string;
  vehicle: string;
  price: string;
  currency: string;
  pickup: string;
  dropoff: string;
  transmission: string;
  seats: number;
  baggage: number;
  imageURL?: string;
}

// Keywords that indicate complex queries for WhatsApp
const COMPLEX_QUERY_KEYWORDS = [
  'visa', 'passport', 'document', 'requirement', 'policy', 'cancellation',
  'refund', 'baggage', 'luggage', 'weight limit', 'custom', 'immigration',
  'vaccination', 'covid', 'test', 'quarantine', 'insurance', 'claim',
  'group booking', 'corporate', 'business class', 'upgrade', 'special request',
  'dietary', 'wheelchair', 'assistance', 'unaccompanied minor', 'pet', 'animal',
  'book', 'booking', 'reservation', 'pay', 'payment'
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
  returnDate?: string;
  city?: string;
  passengers?: number;
} => {
  const lowerMessage = message.toLowerCase();
  
  // Common airport/city codes
  const airportCodes: { [key: string]: string } = {
    'jfk': 'JFK', 'lhr': 'LHR', 'cdg': 'CDG', 'dxb': 'DXB', 'hnd': 'HND',
    'lax': 'LAX', 'ord': 'ORD', 'syd': 'SYD', 'sin': 'SIN', 'nrt': 'NRT',
    'london': 'LON', 'paris': 'PAR', 'new york': 'NYC', 'dubai': 'DXB',
    'tokyo': 'TYO', 'los angeles': 'LAX', 'chicago': 'CHI', 'sydney': 'SYD',
    'singapore': 'SIN', 'lagos': 'LOS', 'abuja': 'ABV'
  };
  
  let from: string | undefined;
  let to: string | undefined;
  let city: string | undefined;
  let passengers = 1;
  
  // Extract airport/city codes
  Object.entries(airportCodes).forEach(([key, code]) => {
    if (lowerMessage.includes(key)) {
      if (!from && (lowerMessage.includes('from ' + key) || lowerMessage.includes(key + ' to'))) {
        from = code;
      } else if (!to && (lowerMessage.includes(' to ' + key) || lowerMessage.includes(key + ' from'))) {
        to = code;
      } else if (!city && (lowerMessage.includes('in ' + key) || lowerMessage.includes('at ' + key))) {
        city = code;
      }
    }
  });
  
  // Extract number of passengers
  const passengerMatch = lowerMessage.match(/(\d+)\s*(passenger|person|people|adult)/i);
  if (passengerMatch) {
    passengers = parseInt(passengerMatch[1]);
  }
  
  // Extract dates
  let date = new Date().toISOString().split('T')[0];
  if (lowerMessage.includes('tomorrow')) {
    date = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  } else if (lowerMessage.includes('next week')) {
    date = new Date(Date.now() + 604800000).toISOString().split('T')[0];
  } else if (lowerMessage.includes('next month')) {
    date = new Date(Date.now() + 2592000000).toISOString().split('T')[0];
  }
  
  return { from, to, date, city, passengers };
};

const AIAssistant: React.FC<AIAssistantProps> = ({ onClose, user }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    {
      role: 'assistant',
      content: user?.name
        ? `Hello ${user.name}! I'm your Ebony Bruce travel assistant. I can search real flights, hotels, and car rentals using our integrated APIs. Where would you like to go?`
        : "Hello! I'm your Ebony Bruce travel assistant. I can search real flights, hotels, and car rentals using our integrated APIs. Where would you like to go?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [offerRequestId, setOfferRequestId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<'checking' | 'working' | 'fallback'>('checking');

  const brandBlue = '#32A6D7';
  const brandBlueDark = '#2a8bb5';
  const whatsappGreen = '#25D366';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Test Google AI on component mount with a free model
  useEffect(() => {
    const testGoogleAI = async () => {
      try {
        // Try the free tier model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Say 'Hello' if you can hear me");
        const response = await result.response;
        const text = response.text();
        if (text) {
          console.log('Google AI is working with gemini-2.5-flash:', text);
          setAiStatus('working');
        }
      } catch (error) {
        console.error('Google AI test failed:', error);
        setAiStatus('fallback');
      }
    };
    
    testGoogleAI();
  }, []);

  // API Functions
  const searchFlights = async (params: FlightSearchParams): Promise<{ offerRequestId: string; offers: FlightOffer[] }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/search/flights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { 'Authorization': `Bearer ${user.token}` })
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`Flight search failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      const newOfferRequestId = data.data?.offerRequestId || data.offerRequestId;
      setOfferRequestId(newOfferRequestId);
      
      const offersResponse = await fetch(
        `${API_BASE_URL}/bookings/offers?offer_request_id=${newOfferRequestId}&limit=5&sort=total_amount&sortOrder=asc`,
        {
          headers: {
            ...(user?.token && { 'Authorization': `Bearer ${user.token}` })
          }
        }
      );
      
      if (!offersResponse.ok) {
        return { offerRequestId: newOfferRequestId, offers: [] };
      }
      
      const offersData = await offersResponse.json();
      
      const offers: FlightOffer[] = (offersData.data?.offers || offersData.offers || []).map((offer: any) => ({
        id: offer.id,
        offerId: offer.id,
        airline: offer.owner?.name || offer.airline || 'Unknown Airline',
        price: offer.total_amount || offer.price || '0',
        currency: offer.total_currency || offer.currency || 'GBP',
        departure: offer.slices?.[0]?.segments?.[0]?.departing_at || params.departureDate,
        arrival: offer.slices?.[0]?.segments?.[offer.slices[0].segments.length - 1]?.arriving_at || '',
        duration: offer.slices?.[0]?.duration || '',
        stops: (offer.slices?.[0]?.segments?.length || 1) - 1
      }));
      
      return { offerRequestId: newOfferRequestId, offers };
    } catch (error) {
      console.error('Flight search error:', error);
      throw error;
    }
  };

  const searchHotels = async (params: HotelSearchParams): Promise<HotelOffer[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/search/hotels/amadeus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { 'Authorization': `Bearer ${user.token}` })
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error('Hotel search failed');
      }
      
      const data = await response.json();
      
      const hotels: HotelOffer[] = await Promise.all((data.data || data.hotels || []).slice(0, 5).map(async (hotel: any) => {
        let images: { url: string; type: string }[] = [];
        try {
          const imagesResponse = await fetch(
            `${API_BASE_URL}/bookings/hotels/${hotel.hotel?.hotelId || hotel.hotelId}/images?hotelName=${encodeURIComponent(hotel.hotel?.name || hotel.name)}`,
            {
              headers: {
                ...(user?.token && { 'Authorization': `Bearer ${user.token}` })
              }
            }
          );
          if (imagesResponse.ok) {
            const imagesData = await imagesResponse.json();
            images = imagesData.data?.images || [];
          }
        } catch (error) {
          console.error('Failed to fetch hotel images:', error);
        }
        
        return {
          id: hotel.hotel?.hotelId || hotel.hotelId,
          hotelId: hotel.hotel?.hotelId || hotel.hotelId,
          name: hotel.hotel?.name || hotel.name,
          address: hotel.hotel?.address?.lines?.join(', ') || hotel.address || 'Address unavailable',
          price: hotel.offers?.[0]?.price?.total || hotel.price || '0',
          currency: hotel.offers?.[0]?.price?.currency || hotel.currency || 'GBP',
          rating: parseFloat(hotel.hotel?.rating || hotel.rating || '0'),
          amenities: hotel.offers?.[0]?.room?.typeEstimated?.category ? [hotel.offers[0].room.typeEstimated.category] : [],
          images
        };
      }));
      
      return hotels;
    } catch (error) {
      console.error('Hotel search error:', error);
      throw error;
    }
  };

  const searchCarRentals = async (params: CarRentalSearchParams): Promise<CarRentalOffer[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/search/car-rentals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { 'Authorization': `Bearer ${user.token}` })
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error('Car rental search failed');
      }
      
      const data = await response.json();
      
      const cars: CarRentalOffer[] = (data.data?.data || data.cars || []).slice(0, 5).map((car: any) => ({
        id: car.id,
        provider: car.serviceProvider?.name || car.provider || 'Unknown Provider',
        vehicle: car.vehicle?.description || 'Standard Vehicle',
        price: car.quotation?.monetaryAmount || car.price || '0',
        currency: car.converted?.currencyCode || car.currency || 'GBP',
        pickup: params.pickupDateTime,
        dropoff: params.dropoffDateTime,
        transmission: car.vehicle?.transmission || 'Automatic',
        seats: car.vehicle?.seats?.[0]?.count || 5,
        baggage: car.vehicle?.baggages?.[0]?.count || 2,
        imageURL: car.vehicle?.imageURL
      }));
      
      return cars;
    } catch (error) {
      console.error('Car rental search error:', error);
      throw error;
    }
  };

  // Google AI response with free tier models
  const getGoogleAIResponse = async (userMessage: string): Promise<string> => {
    // Try multiple free tier models in order of preference
    const freeModels = [
      'gemini-2.5-flash',      // Fast, free tier model
      'gemini-2.5-flash-preview-09-2025', // Preview version
      'gemini-2.5-pro'         // Pro model with free tier access
    ];
    
    for (const modelName of freeModels) {
      try {
        console.log(`Trying free model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const travelContext = `You are a travel assistant for Ebony Bruce Travel. Provide helpful, accurate information about flights, hotels, car rentals, destinations, and travel tips. Keep responses concise and friendly. Do not use any markdown symbols like asterisks, hashtags, or bullet points in your responses. Use plain text only. Our API can search real flights, hotels, and car rentals. For specific bookings or complex inquiries, suggest contacting via WhatsApp at ${WHATSAPP_NUMBER}.`;
        
        const chat = model.startChat({
          generationConfig: { maxOutputTokens: 500 }
        });

        const result = await chat.sendMessage([{ text: `${travelContext}\n\nUser: ${userMessage}` }]);
        const response = await result.response;
        const text = response.text();
        
        if (text) {
          console.log(`Free model ${modelName} worked!`);
          setAiStatus('working');
          // Remove any remaining markdown symbols just in case
          return text.replace(/[*#_`]/g, '');
        }
      } catch (error) {
        console.log(`Free model ${modelName} failed:`, error);
        continue;
      }
    }
    
    // If all free models fail, use fallback
    setAiStatus('fallback');
    return getFallbackResponse(userMessage);
  };

  // Enhanced fallback responses without markdown
  const getFallbackResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('visa') || lowerMessage.includes('passport')) {
      return "Visa and passport requirements vary by destination. For specific information about your travel documents, please contact our travel specialists on WhatsApp. They can provide accurate guidance based on your nationality and destination.";
    }
    
    if (lowerMessage.includes('weather') || lowerMessage.includes('climate')) {
      return "Weather patterns vary by destination and season. I'd recommend checking local weather forecasts closer to your travel date. For general climate information about specific destinations, feel free to ask!";
    }
    
    if (lowerMessage.includes('best time') || lowerMessage.includes('when to go')) {
      return "The best time to travel depends on your destination and preferences. Popular destinations like Bali are great year-round, while European cities are lovely in spring and fall. What destination are you considering?";
    }
    
    if (lowerMessage.includes('luggage') || lowerMessage.includes('baggage')) {
      return "Baggage allowances vary by airline and fare class. For specific information about your booking, please check with your airline or contact our WhatsApp support team.";
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return user?.name 
        ? `Hi ${user.name}! How can I help you with your travel plans today? You can ask me about flights, hotels, car rentals, or destinations.`
        : "Hi there! How can I help you with your travel plans today? You can ask me about flights, hotels, car rentals, or destinations.";
    }
    
    if (lowerMessage.includes('flight') || lowerMessage.includes('fly')) {
      return "I can help you search for flights! Please tell me your departure city, destination, and travel date. For example: 'Flights from London to Paris tomorrow'";
    }
    
    if (lowerMessage.includes('hotel') || lowerMessage.includes('stay')) {
      return "I can help you find hotels! Please tell me which city and your check-in/out dates. For example: 'Hotels in New York next week'";
    }
    
    if (lowerMessage.includes('car') || lowerMessage.includes('rental')) {
      return "I can help you find car rentals! Please tell me the pickup location and dates. For example: 'Rent a car in Los Angeles for 5 days'";
    }
    
    if (lowerMessage.includes('paris')) {
      return "Paris! Wonderful choice! The City of Lights is always a fantastic destination.\n\nTo help you plan, I can look into:\n* Flights to Paris from your preferred departure city\n* Hotels in Paris based on your dates and preferences\n* Things to do in Paris, from iconic landmarks to charming hidden gems!\n\nJust let me know your travel dates, where you'll be flying from, and any specific interests you have. For more complex inquiries or detailed planning, feel free to WhatsApp us.";
    }
    
    return "I'm here to help with your travel plans! You can ask me about flights, hotels, car rentals, or destinations. For specific bookings or complex inquiries, our WhatsApp support team is available 24/7.";
  };

  // Flight search response without markdown
  const formatFlightResponse = (offers: FlightOffer[], origin: string, destination: string): string => {
    let response = `Flights from ${origin} to ${destination}\n\n`;
    offers.forEach((flight, index) => {
      response += `${index + 1}. ${flight.airline}\n`;
      response += `   Price: ${flight.currency} ${parseFloat(flight.price).toFixed(2)}\n`;
      response += `   Stops: ${flight.stops}\n`;
      response += `   Duration: ${flight.duration}\n\n`;
    });
    response += `Would you like to book any of these flights? You can also reach us on WhatsApp for booking assistance.`;
    return response;
  };

  // Hotel search response without markdown
  const formatHotelResponse = (hotels: HotelOffer[], city: string): string => {
    let response = `Hotels in ${city}\n\n`;
    hotels.forEach((hotel, index) => {
      response += `${index + 1}. ${hotel.name} ${hotel.rating > 0 ? '⭐'.repeat(Math.round(hotel.rating)) : ''}\n`;
      response += `   Address: ${hotel.address.substring(0, 50)}${hotel.address.length > 50 ? '...' : ''}\n`;
      response += `   From ${hotel.currency} ${parseFloat(hotel.price).toFixed(2)} per night\n`;
      if (hotel.images && hotel.images.length > 0) {
        response += `   Images available\n`;
      }
      response += '\n';
    });
    response += `Would you like more details about any of these hotels? For booking, you can reach us on WhatsApp.`;
    return response;
  };

  // Car rental response without markdown
  const formatCarResponse = (cars: CarRentalOffer[], city: string): string => {
    let response = `Car Rentals in ${city}\n\n`;
    cars.forEach((car, index) => {
      response += `${index + 1}. ${car.provider} - ${car.vehicle}\n`;
      response += `   Total: ${car.currency} ${parseFloat(car.price).toFixed(2)}\n`;
      response += `   Seats: ${car.seats} | Bags: ${car.baggage} | Transmission: ${car.transmission}\n\n`;
    });
    response += `Would you like to book any of these cars? For booking assistance, you can reach us on WhatsApp.`;
    return response;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Check for complex queries
      if (isComplexQuery(userMessage)) {
        const aiResponse = `That's a great question about ${userMessage}. For specific bookings, cancellations, or detailed inquiries, I recommend speaking with one of our travel specialists on WhatsApp. They can give you real-time availability and personalized assistance. Would you like me to connect you with them?`;
        
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        setIsLoading(false);
        return;
      }

      const travelInfo = extractTravelInfo(userMessage);
      let apiResponse = '';

      // Flight search
      if ((userMessage.toLowerCase().includes('flight') || userMessage.toLowerCase().includes('fly')) && 
          travelInfo.from && travelInfo.to) {
        
        const flightParams: FlightSearchParams = {
          origin: travelInfo.from,
          destination: travelInfo.to,
          departureDate: travelInfo.date || new Date().toISOString().split('T')[0],
          passengers: travelInfo.passengers || 1,
          cabinClass: userMessage.toLowerCase().includes('business') ? 'business' : 'economy'
        };
        
        try {
          const { offers } = await searchFlights(flightParams);
          
          if (offers.length > 0) {
            apiResponse = formatFlightResponse(offers, flightParams.origin, flightParams.destination);
          } else {
            apiResponse = `No flights found from ${flightParams.origin} to ${flightParams.destination} on that date. Try different dates?`;
          }
        } catch (error) {
          apiResponse = `I'm having trouble searching flights right now. Please try again or contact us on WhatsApp.`;
        }
      }
      // Hotel search
      else if ((userMessage.toLowerCase().includes('hotel') || userMessage.toLowerCase().includes('stay')) && 
               travelInfo.city) {
        
        const checkOut = new Date(new Date(travelInfo.date || new Date()).getTime() + 86400000 * 3)
          .toISOString().split('T')[0];
        
        const hotelParams: HotelSearchParams = {
          cityCode: travelInfo.city,
          checkInDate: travelInfo.date || new Date().toISOString().split('T')[0],
          checkOutDate: checkOut,
          adults: travelInfo.passengers || 2,
          roomQuantity: 1,
          currency: 'GBP'
        };
        
        try {
          const hotels = await searchHotels(hotelParams);
          
          if (hotels.length > 0) {
            apiResponse = formatHotelResponse(hotels, travelInfo.city);
          } else {
            apiResponse = `No hotels found in ${travelInfo.city} for those dates. Try different dates?`;
          }
        } catch (error) {
          apiResponse = `I'm having trouble searching hotels right now. Please try again or contact us on WhatsApp.`;
        }
      }
      // Car rental search
      else if ((userMessage.toLowerCase().includes('car') || userMessage.toLowerCase().includes('rental')) && 
               travelInfo.city) {
        
        const dropoff = new Date(new Date(travelInfo.date || new Date()).getTime() + 86400000 * 5)
          .toISOString().replace('T', 'T10:00:00');
        const pickupDateTime = (travelInfo.date || new Date().toISOString().split('T')[0]) + 'T10:00:00';
        
        const carParams: CarRentalSearchParams = {
          pickupLocationCode: travelInfo.city,
          pickupDateTime: pickupDateTime,
          dropoffLocationCode: travelInfo.city,
          dropoffDateTime: dropoff,
          currency: 'GBP',
          passengers: travelInfo.passengers || 2
        };
        
        try {
          const cars = await searchCarRentals(carParams);
          
          if (cars.length > 0) {
            apiResponse = formatCarResponse(cars, travelInfo.city);
          } else {
            apiResponse = `No car rentals found in ${travelInfo.city} for those dates. Try different dates?`;
          }
        } catch (error) {
          apiResponse = `I'm having trouble searching car rentals right now. Please try again or contact us on WhatsApp.`;
        }
      }
      // Use Google AI for general questions with free tier models
      else {
        apiResponse = await getGoogleAIResponse(userMessage);
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: apiResponse }]);
    } catch (error) {
      console.error("AI Chat error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting to our services right now. Please try again in a moment, or contact us on WhatsApp for immediate assistance."
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
        <div 
          className="p-6 rounded-t-3xl flex justify-between items-center text-white"
          style={{ backgroundColor: brandBlue }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold">Travel Assistant</h3>
              <p className="text-xs opacity-90">
                {aiStatus === 'checking' && 'Testing AI connection...'}
                {aiStatus === 'working' && 'AI Assistant'}
                {aiStatus === 'fallback' && 'Fallback Mode'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'text-white rounded-tr-none' 
                    : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-none'
                }`}
                style={m.role === 'user' ? { backgroundColor: brandBlue } : {}}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                
                {m.role === 'assistant' && 
                  (m.content.includes('WhatsApp') || m.content.includes('book') || m.content.includes('contact')) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={openWhatsApp}
                      className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition"
                      style={{ color: whatsappGreen }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z"/>
                      </svg>
                      <span>Chat on WhatsApp</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 rounded-tl-none flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: brandBlue }}></div>
                <div className="w-2.5 h-2.5 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ backgroundColor: brandBlue }}></div>
                <div className="w-2.5 h-2.5 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ backgroundColor: brandBlue }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100 rounded-b-3xl">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Search flights, hotels, or cars..."
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none text-sm font-medium transition-all focus:ring-2"
              style={{ '--tw-ring-color': `${brandBlue}40` } as React.CSSProperties}
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-3 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: brandBlue }}
              onMouseEnter={(e) => {
                if (!isLoading && input.trim()) {
                  e.currentTarget.style.backgroundColor = brandBlueDark;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = brandBlue;
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          {/* Status Bar */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2 text-xs">
              <span className="text-green-600">Flights</span>
              <span className="text-green-600">Hotels</span>
              <span className="text-green-600">Cars</span>
            </div>
            <button
              onClick={openWhatsApp}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition hover:opacity-80"
              style={{ backgroundColor: '#f0f9f0', color: whatsappGreen }}
            >
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
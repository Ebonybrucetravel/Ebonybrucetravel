'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AIAssistantProps {
  onClose: () => void;
  user?: { name: string; email: string; profilePicture?: string; token?: string } | null;
}

const API_BASE_URL = 'https://ebony-bruce-production.up.railway.app/api/v1';

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  action?: {
    label: string;
    href: string;
  };
}

// ---------------- extractTravelInfo ----------------
const extractTravelInfo = (message: string): any => {
  const lowerMessage = message.toLowerCase();

  const airportCodes: { [key: string]: string } = {
    // ---- NIGERIA ----
    'lagos': 'LOS', 'abuja': 'ABV', 'ibadan': 'IBA', 'port harcourt': 'PHC',
    'kano': 'KAN', 'enugu': 'ENU', 'benin city': 'BNI', 'calabar': 'CBQ',
    'warri': 'QRW', 'jos': 'JOS', 'kaduna': 'KAD', 'maiduguri': 'MIU',
    'sokoto': 'SKO', 'yola': 'YOL', 'akure': 'AKR', 'uyo': 'UYO', 'asaba': 'ASB',
    'owerri': 'QOW', 'bauchi': 'BCU', 'minna': 'MXJ',
    
    // ---- UK & IRELAND ----
    'london': 'LON', 'luton': 'LTN', 'manchester': 'MAN', 'edinburgh': 'EDI',
    'glasgow': 'GLA', 'birmingham': 'BHX', 'bristol': 'BRS', 'newcastle': 'NCL',
    'liverpool': 'LPL', 'leeds': 'LBA', 'belfast': 'BFS', 'cardiff': 'CWL',
    'aberdeen': 'ABZ', 'dublin': 'DUB',
    
    // ---- EUROPE ----
    'paris': 'PAR', 'nice': 'NCE', 'lyon': 'LYS', 'marseille': 'MRS',
    'amsterdam': 'AMS', 'frankfurt': 'FRA', 'munich': 'MUC', 'berlin': 'BER',
    'madrid': 'MAD', 'barcelona': 'BCN', 'malaga': 'AGP', 'palma': 'PMI',
    'rome': 'ROM', 'milan': 'MIL', 'venice': 'VCE', 'naples': 'NAP',
    'istanbul': 'IST', 'lisbon': 'LIS', 'porto': 'OPO', 'athens': 'ATH',
    'vienna': 'VIE', 'zurich': 'ZRH', 'geneva': 'GVA', 'brussels': 'BRU',
    'copenhagen': 'CPH', 'stockholm': 'STO', 'oslo': 'OSL', 'helsinki': 'HEL',
    'prague': 'PRG', 'budapest': 'BUD', 'warsaw': 'WAW',
    
    // ---- MIDDLE EAST ----
    'dubai': 'DXB', 'abu dhabi': 'AUH', 'doha': 'DOH', 'riyadh': 'RUH',
    'jeddah': 'JED', 'muscat': 'MCT', 'kuwait': 'KWI', 'manama': 'BAH',
    'beirut': 'BEY', 'amman': 'AMM', 'tel aviv': 'TLV',
    
    // ---- NORTH AMERICA ----
    'new york': 'NYC', 'los angeles': 'LAX', 'chicago': 'CHI', 'miami': 'MIA',
    'san francisco': 'SFO', 'seattle': 'SEA', 'boston': 'BOS',
    'washington': 'WAS', 'dallas': 'DFW', 'houston': 'IAH', 'atlanta': 'ATL',
    'las vegas': 'LAS', 'orlando': 'MCO', 'denver': 'DEN', 'phoenix': 'PHX',
    'toronto': 'YYZ', 'vancouver': 'YVR', 'montreal': 'YUL', 'calgary': 'YYC',
    'mexico city': 'MEX', 'cancun': 'CUN',

    'tokyo': 'TYO', 'osaka': 'OSA', 'seoul': 'SEL', 'beijing': 'BJS',
    'shanghai': 'SHA', 'hong kong': 'HKG', 'singapore': 'SIN',
    'bangkok': 'BKK', 'phuket': 'HKT', 'kuala lumpur': 'KUL',
    'jakarta': 'JKT', 'bali': 'DPS', 'manila': 'MNL', 'delhi': 'DEL',
    'mumbai': 'BOM', 'bangalore': 'BLR', 'chennai': 'MAA', 'kolkata': 'CCU',
    'taipei': 'TPE', 'hanoi': 'HAN', 'ho chi minh': 'SGN',
    
    'accra': 'ACC', 'nairobi': 'NBO', 'johannesburg': 'JNB', 'cape town': 'CPT',
    'durban': 'DUR', 'cairo': 'CAI', 'addis ababa': 'ADD', 'dar es salaam': 'DAR',
    'casablanca': 'CMN', 'tunis': 'TUN', 'algiers': 'ALG', 'dakar': 'DSS',
    'abidjan': 'ABJ', 'douala': 'DLA', 'kinshasa': 'FIH', 'luanda': 'LAD',
    'mauritius': 'MRU',
    

    'sydney': 'SYD', 'melbourne': 'MEL', 'brisbane': 'BNE', 'perth': 'PER',
    'adelaide': 'ADL', 'auckland': 'AKL', 'wellington': 'WLG',
    
    // ---- SOUTH AMERICA ----
    'sao paulo': 'GRU', 'rio de janeiro': 'GIG', 'buenos aires': 'EZE',
    'lima': 'LIM', 'santiago': 'SCL', 'bogota': 'BOG', 'caracas': 'CCS',
    'quito': 'UIO', 'montevideo': 'MVD',
    
    // ---- ADDITIONAL IATA CODES ----
    'lhr': 'LHR', 'lgw': 'LGW', 'jfk': 'JFK', 'lax': 'LAX', 'dxb': 'DXB',
    'los': 'LOS', 'abv': 'ABV', 'phc': 'PHC', 'kan': 'KAN', 'cdg': 'CDG',
    'ams': 'AMS', 'fra': 'FRA', 'mad': 'MAD', 'bcn': 'BCN', 'fco': 'FCO',
    'ist': 'IST', 'doh': 'DOH', 'ruh': 'RUH', 'jed': 'JED', 'yyz': 'YYZ',
    'yvr': 'YVR', 'sin': 'SIN', 'hkg': 'HKG', 'nrt': 'NRT', 'hnd': 'HND',
    'icn': 'ICN', 'pek': 'PEK', 'pvg': 'PVG', 'bkk': 'BKK', 'kul': 'KUL',
    'del': 'DEL', 'bom': 'BOM', 'syd': 'SYD', 'mel': 'MEL', 'akl': 'AKL',
  };

  let from, to, city, pickupCity, dropoffCity;
  let passengers = 1;

  const fromToMatch = lowerMessage.match(/(?:from\s+|in\s+)?([a-z\s]+?)\s+to\s+([a-z\s]+)/i);
  let matchedFrom, matchedTo;
  if (fromToMatch) {
    const originText = fromToMatch[1].trim();
    const destText = fromToMatch[2].trim();
    
    for (const [key, code] of Object.entries(airportCodes)) {
      if (originText.includes(key)) matchedFrom = code;
      if (destText.includes(key)) matchedTo = code;
    }
  }

  const isCarRequest = 
    lowerMessage.includes('car') || 
    lowerMessage.includes('transfer') || 
    lowerMessage.includes('rental') ||
    lowerMessage.includes('pickup') ||
    lowerMessage.includes('dropoff');

  if (isCarRequest) {
    pickupCity = matchedFrom;
    dropoffCity = matchedTo;
    from = matchedFrom;
    to = matchedTo;
  } else {
    from = matchedFrom;
    to = matchedTo;
  }

  if (!from && !to) {
    const iataMatch = message.match(/\b([a-zA-Z]{3})\b/g);
    if (iataMatch) {
      const ignoreWords = [
        'can', 'the', 'for', 'and', 'you', 'fly', 'get', 'how', 'are', 'trip', 'one', 'way',
        'hot', 'car', 'try', 'new', 'not', 'but', 'all', 'any', 'out', 'our', 'who', 'why',
        'yes', 'did', 'she', 'him', 'her', 'his', 'had', 'has', 'was', 'too', 'use', 'me'
      ];
      const validCodes = iataMatch
        .map(code => code.toUpperCase())
        .filter(code => !ignoreWords.includes(code.toLowerCase()));

      if (validCodes.length >= 2) {
        from = validCodes[0];
        to = validCodes[1];
        if (isCarRequest) {
          pickupCity = validCodes[0];
          dropoffCity = validCodes[1];
        }
      } else if (validCodes.length === 1) {
        if (from) {
          to = validCodes[0];
        } else {
          to = validCodes[0];
        }
        if (isCarRequest) dropoffCity = validCodes[0];
      }
    }
  }

  if (!from && !to && !pickupCity && !dropoffCity) {
    for (const [key, code] of Object.entries(airportCodes)) {
      if (lowerMessage.includes(key)) {
        city = code;
        to = code;
        break;
      }
    }
  }

  const passengerMatch = lowerMessage.match(/(\d+)\s*(passenger|person|people|adult)/i);
  if (passengerMatch) passengers = parseInt(passengerMatch[1]);

  let date = new Date().toISOString().split('T')[0];
  if (lowerMessage.includes('tomorrow')) {
    date = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  } else if (lowerMessage.includes('next week')) {
    date = new Date(Date.now() + 604800000).toISOString().split('T')[0];
  } else {
    const dateMatch = lowerMessage.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)\s+(\d{4})/i) ||
                      lowerMessage.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
                      if (dateMatch) {
                        let day: number, monthStr: string, year: number;
                        if (dateMatch[1].match(/\d/)) {
                          day = parseInt(dateMatch[1]);
                          monthStr = dateMatch[2];
                          year = parseInt(dateMatch[3]);
                        } else {
                          monthStr = dateMatch[1];
                          day = parseInt(dateMatch[2]);
                          year = parseInt(dateMatch[3]);
                        }
      
      const months = ['january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = months.findIndex(m => m.startsWith(monthStr.toLowerCase()));
      
      if (monthIndex !== -1) {
        date = new Date(year, monthIndex, day).toISOString().split('T')[0];
      }
    }
  }

  let checkIn = date;
  let checkOut = new Date(new Date(date).getTime() + 86400000 * 3).toISOString().split('T')[0];

  return { from, to, city, pickupCity, dropoffCity, date, passengers, checkIn, checkOut };
};

const stripMarkdown = (text: string): string =>
  text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1');

// ---------------- Component ----------------
const AIAssistant: React.FC<AIAssistantProps> = ({ onClose, user }) => {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: user?.name
        ? `Hello ${user.name.split(' ')[0]}! 👋 I'm your travel assistant. How can I help you today?`
        : "Welcome to Ebony Bruce Travels! 👋 To get started and ensure the best service, could you please tell me your **Name** and **Email address**?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState(user?.name || "");
  const [userEmail, setUserEmail] = useState(user?.email || "");
  const isOnboarding = !user && !userName && !userEmail;
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // ✅ Sync greeting + identity if `user` hydrates after mount
  useEffect(() => {
    if (user?.name) {
      setMessages(prev => {
        // Only rewrite the very first greeting if the user hasn't chatted yet
        if (prev.length === 1 && prev[0].role === 'assistant' && !userName) {
          return [{
            role: 'assistant',
            content: `Hello ${user.name.split(' ')[0]}! 👋 I'm your travel assistant. How can I help you today?`
          }];
        }
        return prev;
      });
      if (!userName) setUserName(user.name);
      if (!userEmail) setUserEmail(user.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;
    return headers;
  };

  const triggerLiveChatHandoff = (historyToSend?: string) => {
    setMessages(prev => [
      ...prev, 
      { role: 'assistant', content: "Connecting you to a human agent... Please hold on." }
    ]);
    setIsLoading(true);

    const finalHistory = historyToSend || 'User requested to speak to a human agent.';

    setTimeout(() => {
      const tawk = (window as any).Tawk_API;
      
      if (tawk) {
        tawk.maximize();

        setTimeout(() => {
          try {
            if (user?.email && user?.name) {
              tawk.setAttributes({
                name: user.name,
                email: user.email,
              });
            }

            tawk.addTags(['AI-Handoff']);
            tawk.addEvent('AI Chat History', finalHistory);

            tawk.setAttributes({
              'ai_chat_history': finalHistory
            });

          } catch (err) {
            console.warn('Could not pass context to Tawk:', err);
          }
        }, 1500);
      }
      
      onClose(); 
    }, 2500);
  };

  // ---------------- Flight search ----------------
  const searchFlights = async (params: FlightSearchParams): Promise<{ flights: any[]; rawOffers: any[] }> => {
    try {
      const payload = {
        origin: params.origin.toUpperCase(),
        destination: params.destination.toUpperCase(),
        departureDate: params.departureDate,
        passengers: params.passengers || 1,
        cabinClass: params.cabinClass || 'economy',
        currency: 'GBP',
      };

      const response = await fetch(`${API_BASE_URL}/bookings/search/flights`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) return { flights: [], rawOffers: [] };
      const data = await response.json();

      // Wakanow
      const directOffers = data?.data?.offers ?? data?.offers ?? [];
      if (Array.isArray(directOffers) && directOffers.length > 0) {
        const flights = directOffers.slice(0, 5).map((offer: any) => {
          const slice = offer.slices?.[0] || {};
          return {
            id: offer.id || offer.offerId || offer.selectData?.slice(0, 20),
            selectData: offer.selectData || offer.select_data,
            rawOffer: offer,
            airline: slice.airline?.name || slice.segments?.[0]?.operating_carrier || offer.marketing_carrier_name || "Unknown Airline",
            price: String(offer.final_amount ?? offer.total_amount ?? offer.original_amount ?? 0),
            currency: offer.total_currency ?? offer.currency ?? "GBP",
            departure: slice.departure_time ?? '',
            arrival: slice.arrival_time ?? '',
            duration: slice.duration ?? offer.duration ?? "N/A",
            stops: slice.stops ?? 0,
            provider: 'wakanow',
          };
        });
        return { flights, rawOffers: directOffers };
      }

      // Duffel
      const offerRequestId = data?.data?.offer_request_id || data?.data?.offerRequestId || data?.offer_request_id;
      if (offerRequestId) {
        const offersResponse = await fetch(`${API_BASE_URL}/bookings/offers?offer_request_id=${offerRequestId}&limit=5`, { headers: getHeaders() });
        if (!offersResponse.ok) return { flights: [], rawOffers: [] };
        const offersData = await offersResponse.json();
        const offers = offersData?.data?.offers ?? offersData?.offers ?? offersData?.data ?? (Array.isArray(offersData) ? offersData : []);
        if (!Array.isArray(offers) || offers.length === 0) return { flights: [], rawOffers: [] };

        const flights = offers.slice(0, 5).map((offer: any) => {
          const slice = offer.slices?.[0] || {};
          const segments = slice.segments || [];
          const firstSeg = segments[0] || {};
          const lastSeg = segments[segments.length - 1] || firstSeg;
          let duration = slice.duration || "N/A";
          if (typeof duration === 'string' && duration.startsWith('PT')) {
            const h = duration.match(/(\d+)H/);
            const m = duration.match(/(\d+)M/);
            duration = `${h?.[1] || 0}h ${m?.[1] || 0}m`;
          }
          return {
            id: offer.id,
            offer_id: offer.id,
            offer_request_id: offerRequestId,
            rawOffer: offer,
            airline: offer.owner?.name || firstSeg.operating_carrier?.name || firstSeg.marketing_carrier?.name || "Unknown Airline",
            price: String(offer.total_amount ?? offer.price?.total ?? 0),
            currency: offer.total_currency ?? offer.price?.currency ?? "GBP",
            departure: firstSeg.departing_at ?? firstSeg.departure?.at ?? '',
            arrival: lastSeg.arriving_at ?? lastSeg.arrival?.at ?? '',
            duration,
            stops: Math.max(0, segments.length - 1),
            provider: 'duffel',
          };
        });
        return { flights, rawOffers: offers };
      }

      return { flights: [], rawOffers: [] };
    } catch (error) {
      console.error('Flight search error:', error);
      return { flights: [], rawOffers: [] };
    }
  };

  // ---------------- Hotels ----------------
  const searchHotels = async (params: HotelSearchParams): Promise<any[]> => {
    try {
      const hotelCityMap: { [key: string]: string } = {
        'LON': 'LON', 'LHR': 'LON', 'PAR': 'PAR', 'NYC': 'NYC',
        'DXB': 'DXB', 'LOS': 'LOS', 'ABV': 'ABV', 'ACC': 'ACC'
      };
      const targetCity = hotelCityMap[params.cityCode.toUpperCase()] || params.cityCode;
      const finalParams = { ...params, cityCode: targetCity };

      const response = await fetch(`${API_BASE_URL}/bookings/search/hotels/amadeus`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(finalParams)
      });
      if (!response.ok) throw new Error('Hotel search failed');
      const data = await response.json();

      let hotels: any[] = [];
      if (Array.isArray(data.data?.data)) hotels = data.data.data;
      else if (Array.isArray(data.data)) hotels = data.data;
      else if (Array.isArray(data.hotels)) hotels = data.hotels;
      else if (Array.isArray(data)) hotels = data;

      return hotels.slice(0, 5).map((hotel: any) => ({
        name: hotel.hotel?.name || hotel.name || 'Hotel',
        address: hotel.hotel?.address?.lines?.join(', ') || hotel.address || 'Address available',
        price: hotel.offers?.[0]?.price?.total || hotel.price || '0',
        currency: hotel.offers?.[0]?.price?.currency || hotel.currency || 'GBP',
        rating: hotel.hotel?.rating || hotel.rating || 0
      }));
    } catch (error) {
      console.error('Hotel search error:', error);
      return [];
    }
  };

  // ---------------- Cars ----------------
  const searchCarRentals = async (params: CarRentalSearchParams): Promise<any[]> => {
    try {
      const cityNames: Record<string, string> = {
        'LOS': 'Lagos', 'ABV': 'Abuja', 'PHC': 'Port Harcourt', 'KAN': 'Kano',
        'IBA': 'Ibadan', 'ENU': 'Enugu', 'BNI': 'Benin City', 'CBQ': 'Calabar',
        'QRW': 'Warri', 'JOS': 'Jos', 'KAD': 'Kaduna', 'MIU': 'Maiduguri',
        'SKO': 'Sokoto', 'YOL': 'Yola', 'AKR': 'Akure', 'UYO': 'Uyo', 'ASB': 'Asaba',
        'LON': 'London', 'LHR': 'London', 'MAN': 'Manchester', 'EDI': 'Edinburgh',
        'PAR': 'Paris', 'CDG': 'Paris', 'DXB': 'Dubai', 'AUH': 'Abu Dhabi',
        'NYC': 'New York', 'JFK': 'New York', 'LAX': 'Los Angeles',
        'ACC': 'Accra', 'NBO': 'Nairobi', 'JNB': 'Johannesburg', 'CPT': 'Cape Town',
      };

      const getCountryCode = (cityCode: string) => {
        const map: Record<string, string> = {
          'LON': 'GB', 'LHR': 'GB', 'MAN': 'GB', 'EDI': 'GB',
          'DXB': 'AE', 'AUH': 'AE',
          'LOS': 'NG', 'ABV': 'NG', 'IBA': 'NG', 'PHC': 'NG', 'KAN': 'NG', 'ENU': 'NG',
          'PAR': 'FR', 'CDG': 'FR',
          'NYC': 'US', 'JFK': 'US', 'LAX': 'US',
          'ACC': 'GH', 'NBO': 'KE', 'JNB': 'ZA', 'CPT': 'ZA',
        };
        return map[cityCode.toUpperCase()] || 'NG';
      };

      const startCountry = getCountryCode(params.pickupLocationCode);
      const endCountry = getCountryCode(params.dropoffLocationCode || params.pickupLocationCode);
      
      const formatDateTime = (dateStr: string) => {
        if (!dateStr) {
          const now = new Date();
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T10:00:00`;
        }
        if (dateStr.length === 10) return `${dateStr}T10:00:00`;
        return dateStr.split('.')[0];
      };

      const finalDropoffCode = params.dropoffLocationCode || params.pickupLocationCode;

      const payload: any = {
        startLocationCode: params.pickupLocationCode,
        startAddressLine: cityNames[params.pickupLocationCode] || params.pickupLocationCode,
        startCityName: cityNames[params.pickupLocationCode] || params.pickupLocationCode,
        startCountryCode: startCountry,
        startDateTime: formatDateTime(params.pickupDateTime),
        passengers: params.passengers || 2,
        currency: 'NGN',
        
        endLocationCode: finalDropoffCode,
        endAddressLine: cityNames[finalDropoffCode] || finalDropoffCode,
        endCityName: cityNames[finalDropoffCode] || finalDropoffCode,
        endCountryCode: endCountry,
      };

      console.log('🚗 Car search payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE_URL}/bookings/search/car-rentals`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Car Backend Error (${response.status}):`, errorData.message || errorData);
        return [];
      }

      const data = await response.json();
      let cars: any[] = [];
      if (Array.isArray(data.data?.data)) cars = data.data.data;
      else if (Array.isArray(data.data)) cars = data.data;
      else if (Array.isArray(data.cars)) cars = data.cars;

      return cars.slice(0, 5).map((car: any) => ({
        provider: car.serviceProvider?.name || 'Unknown',
        vehicle: car.vehicle?.description || 'Standard Vehicle',
        price: car.quotation?.monetaryAmount || '0',
        currency: car.currency || 'NGN',
        seats: car.vehicle?.seats?.[0]?.count || 5,
        transmission: car.vehicle?.transmission || 'Automatic'
      }));
    } catch (error) {
      console.error('Car rental search error:', error);
      return [];
    }
  };

  const askBackendAI = async (question: string): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/ask`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ question })
      });
      if (!response.ok) throw new Error('Backend AI failed');
      const data = await response.json();
      
      // ✅ SAFE EXTRACTION: Handles different NestJS response formats
      let answer = "I couldn't read the response.";
      
      if (typeof data === 'string') {
        answer = data;
      } else if (data?.answer) {
        answer = data.answer;
      } else if (data?.data?.answer) {
        answer = data.data.answer;
      } else if (data?.message) {
        answer = data.message;
      } else if (data?.response) {
        answer = data.response;
      } else {
        console.warn("Unknown AI response format:", data);
      }
      
      return answer;
    } catch (error) {
      console.error("AI fetch error:", error);
      return "I'm having trouble connecting right now. Let me transfer you to a human.";
    }
  };

  // ---------------- Build a Flight Search Link ----------------
  const buildFlightSearchLink = (
    flight: any,
    params: { origin: string; destination: string; passengers: number; date?: string }
  ): { href: string; label: string } | null => {
    try {
      const originCode = params.origin.toUpperCase();
      const destCode = params.destination.toUpperCase();

      let departureDate = params.date || flight.departure;
      if (departureDate && departureDate.includes('T')) departureDate = departureDate.split('T')[0];
      if (!departureDate) departureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const returnDate = new Date(new Date(departureDate).getTime() + 86400000 * 3).toISOString().split('T')[0];

      // ✅ Changed to /flights
      const query = new URLSearchParams({
        from: originCode,
        to: destCode,
        depart: departureDate,
        return: returnDate,
        adults: String(params.passengers || 1),
        children: '0',
        infants: '0',
        cabin: 'economy',
      });

      return {
        href: `/flights?${query.toString()}`,
        label: `View all flights from ${originCode} to ${destCode}`,
      };
    } catch (e) {
      console.error("Error building flight link", e);
      return null;
    }
  };

  // ---------------- Build a Hotel Search Link ----------------
  const buildHotelSearchLink = (
    cityCode: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number
  ): { href: string; label: string } | null => {
    try {
      const cityCodeMap: Record<string, string> = {
        'LOS': 'LOS', 'ABV': 'ABV', 'PHC': 'PHC', 'KAN': 'KAN', 'ENU': 'ENU',
        'ACC': 'ACC', 'NBO': 'NBO', 'JNB': 'JNB', 'CPT': 'CPT', 'CAI': 'CAI', 'ADD': 'ADD', 'CMN': 'CMN',
        'LON': 'LON', 'LHR': 'LON', 'LGW': 'LON', 'LTN': 'LON', 'MAN': 'MAN', 'EDI': 'EDI',
        'PAR': 'PAR', 'CDG': 'PAR', 'ORY': 'PAR', 
        'AMS': 'AMS', 'FRA': 'FRA', 'MUC': 'MUC', 'BER': 'BER', 
        'MAD': 'MAD', 'BCN': 'BCN', 'ROM': 'ROM', 'FCO': 'ROM', 'MIL': 'MIL', 'MXP': 'MIL',
        'IST': 'IST', 'DUB': 'DUB', 'LIS': 'LIS', 'ATH': 'ATH',
        'DXB': 'DXB', 'AUH': 'AUH', 'DOH': 'DOH', 'RUH': 'RUH', 'JED': 'JED', 'MCT': 'MCT', 'KWI': 'KWI',
        'NYC': 'NYC', 'JFK': 'NYC', 'LGA': 'NYC', 'EWR': 'NYC',
        'LAX': 'LAX', 'CHI': 'CHI', 'ORD': 'CHI', 'MIA': 'MIA', 'SFO': 'SFO', 
        'SEA': 'SEA', 'BOS': 'BOS', 'WAS': 'WAS', 'IAD': 'WAS', 'DFW': 'DFW', 'IAH': 'IAH', 'ATL': 'ATL',
        'YYZ': 'YYZ', 'YVR': 'YVR', 'YUL': 'YUL', 'MEX': 'MEX', 'CUN': 'CUN',
        'SIN': 'SIN', 'HKG': 'HKG', 'TYO': 'TYO', 'NRT': 'TYO', 'HND': 'TYO',
        'ICN': 'ICN', 'PEK': 'PEK', 'PVG': 'PVG', 'BKK': 'BKK', 'KUL': 'KUL',
        'DEL': 'DEL', 'BOM': 'BOM', 'SYD': 'SYD', 'MEL': 'MEL', 'AKL': 'AKL', 'BNE': 'BNE',
        'GRU': 'GRU', 'GIG': 'GIG', 'EZE': 'EZE', 'SCL': 'SCL', 'LIM': 'LIM', 'BOG': 'BOG',
      };

      const targetCityCode = cityCodeMap[cityCode.toUpperCase()] || cityCode.toUpperCase();

      const cityDisplayMap: Record<string, string> = {
        'LOS': 'Lagos, Nigeria', 'ABV': 'Abuja, Nigeria', 'PHC': 'Port Harcourt, Nigeria', 'KAN': 'Kano, Nigeria', 'ENU': 'Enugu, Nigeria',
        'ACC': 'Accra, Ghana', 'NBO': 'Nairobi, Kenya', 'JNB': 'Johannesburg, South Africa', 'CPT': 'Cape Town, South Africa',
        'CAI': 'Cairo, Egypt', 'ADD': 'Addis Ababa, Ethiopia', 'CMN': 'Casablanca, Morocco',
        'LON': 'London, United Kingdom', 'MAN': 'Manchester, United Kingdom', 'EDI': 'Edinburgh, United Kingdom',
        'PAR': 'Paris, France', 'AMS': 'Amsterdam, Netherlands', 'FRA': 'Frankfurt, Germany', 'MUC': 'Munich, Germany', 'BER': 'Berlin, Germany',
        'MAD': 'Madrid, Spain', 'BCN': 'Barcelona, Spain', 'ROM': 'Rome, Italy', 'MIL': 'Milan, Italy',
        'IST': 'Istanbul, Turkey', 'DUB': 'Dublin, Ireland', 'LIS': 'Lisbon, Portugal', 'ATH': 'Athens, Greece',
        'DXB': 'Dubai, UAE', 'AUH': 'Abu Dhabi, UAE', 'DOH': 'Doha, Qatar', 'RUH': 'Riyadh, Saudi Arabia', 'JED': 'Jeddah, Saudi Arabia', 'MCT': 'Muscat, Oman', 'KWI': 'Kuwait City, Kuwait',
        'NYC': 'New York, USA', 'LAX': 'Los Angeles, USA', 'CHI': 'Chicago, USA', 'MIA': 'Miami, USA', 
        'SFO': 'San Francisco, USA', 'SEA': 'Seattle, USA', 'BOS': 'Boston, USA', 'WAS': 'Washington, USA', 
        'DFW': 'Dallas, USA', 'IAH': 'Houston, USA', 'ATL': 'Atlanta, USA',
        'YYZ': 'Toronto, Canada', 'YVR': 'Vancouver, Canada', 'YUL': 'Montreal, Canada', 'MEX': 'Mexico City, Mexico', 'CUN': 'Cancun, Mexico',
        'SIN': 'Singapore, Singapore', 'HKG': 'Hong Kong, China', 'TYO': 'Tokyo, Japan', 'ICN': 'Seoul, South Korea', 
        'PEK': 'Beijing, China', 'PVG': 'Shanghai, China', 'BKK': 'Bangkok, Thailand', 'KUL': 'Kuala Lumpur, Malaysia',
        'DEL': 'Delhi, India', 'BOM': 'Mumbai, India', 'SYD': 'Sydney, Australia', 'MEL': 'Melbourne, Australia', 'AKL': 'Auckland, New Zealand', 'BNE': 'Brisbane, Australia',
        'GRU': 'Sao Paulo, Brazil', 'GIG': 'Rio de Janeiro, Brazil', 'EZE': 'Buenos Aires, Argentina', 'SCL': 'Santiago, Chile', 'LIM': 'Lima, Peru', 'BOG': 'Bogota, Colombia',
      };

      const locationString = cityDisplayMap[targetCityCode] || `${targetCityCode}, Unknown`;

      const query = new URLSearchParams({
        type: 'hotels',
        location: locationString,
        cityCode: targetCityCode,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: String(adults || 2),
        rooms: '1',
      });

      return {
        href: `/search?${query.toString()}`,
        label: `View hotels in ${locationString.split(',')[0]}`,
      };
    } catch (e) {
      console.error("Error building hotel link", e);
      return null;
    }
  };

  // ---------------- Build a Car Search Link ----------------
  const buildCarSearchLink = (
    pickupCode: string,
    dropoffCode: string,
    pickupDate: string,
    passengers: number
  ): { href: string; label: string } | null => {
    try {
      const pickupTime = '10:00';
      const dropoffTime = '10:00';
      const dropoffDate = new Date(new Date(pickupDate).getTime() + 86400000).toISOString().split('T')[0];

      const carLocationMap: Record<string, string> = {
        'LOS': 'Lagos', 'ABV': 'Abuja', 'PHC': 'Port Harcourt', 'KAN': 'Kano',
        'IBA': 'Ibadan', 'ENU': 'Enugu', 'BNI': 'Benin City', 'CBQ': 'Calabar',
        'LON': 'London', 'PAR': 'Paris', 'DXB': 'Dubai', 'NYC': 'New York',
        'ACC': 'Accra', 'NBO': 'Nairobi', 'JNB': 'Johannesburg',
      };

      const pickupCity = carLocationMap[pickupCode.toUpperCase()] || pickupCode.toUpperCase();
      const dropoffCity = carLocationMap[dropoffCode.toUpperCase()] || dropoffCode.toUpperCase();
      const locationStr = `${pickupCity} to ${dropoffCity}`;

      const query = new URLSearchParams({
        pickup: pickupCode.toUpperCase(),
        dropoff: dropoffCode.toUpperCase(),
        pickupDate: pickupDate,
        dropoffDate: dropoffDate,
        pickupTime: pickupTime,
        dropoffTime: dropoffTime,
        passengers: String(passengers || 2),
      });

      return {
        href: `/cars?${query.toString()}`,
        label: `View car transfers from ${pickupCity} to ${dropoffCity}`,
      };
    } catch (e) {
      console.error("Error building car link", e);
      return null;
    }
  };

  const formatFlightResponse = (
    flights: any[],
    from: string,
    to: string,
    params: { passengers: number }
  ): { text: string; action?: { label: string; href: string } } => {
    if (flights.length === 0) {
      return { text: `No flights found from ${from} to ${to}. Try different dates or destinations.` };
    }

    const sorted = [...flights].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    const cheapest = sorted[0];
    const others = sorted.slice(1);

    let text = `✈️ Flights from ${from} to ${to}\n\n`;
    text += `**Best option:**\n`;
    text += `1. ${cheapest.airline} — ${cheapest.currency} ${parseFloat(cheapest.price).toFixed(2)}\n`;
    text += `   Duration: ${cheapest.duration} • Stops: ${cheapest.stops}\n\n`;

    if (others.length > 0) {
      text += `**Other options:**\n`;
      others.forEach((f, i) => {
        text += `${i + 2}. ${f.airline} — ${f.currency} ${parseFloat(f.price).toFixed(2)} • ${f.duration} • ${f.stops} stop${f.stops !== 1 ? 's' : ''}\n`;
      });
      text += `\n`;
    }

    text += `Tap the button below to view these options and book on our search page.`;

    const action = buildFlightSearchLink(cheapest, { ...params, origin: from, destination: to, date: cheapest.departure });

    return { text, action: action || undefined };
  };

  const formatHotelResponse = (
    hotels: any[], 
    city: string, 
    checkIn: string, 
    checkOut: string, 
    adults: number
  ): { text: string; action?: { label: string; href: string } } => {
    if (hotels.length === 0) {
      return { text: `I couldn't find any hotels in ${city} for those dates.\n\nTry a different city or different dates!` };
    }
    let response = `🏨 Hotels in ${city}\n\n`;
    hotels.forEach((hotel, i) => {
      response += `${i + 1}. ${hotel.name}\n   Price: ${hotel.currency} ${parseFloat(hotel.price).toFixed(2)} per night\n`;
      if (hotel.rating > 0) response += `   Rating: ${'⭐'.repeat(Math.round(hotel.rating))}\n`;
      response += `   ${hotel.address}\n\n`;
    });

    response += `Tap the button below to view all hotels on our search page.`;

    const action = buildHotelSearchLink(city, checkIn, checkOut, adults);
    return { text: response, action: action || undefined };
  };

  const formatCarResponse = (
    cars: any[], 
    pickup: string, 
    dropoff: string, 
    pickupDate: string, 
    passengers: number
  ): { text: string; action?: { label: string; href: string } } => {
    const isTransfer = !!dropoff && dropoff !== pickup;
    if (cars.length === 0) {
      const route = isTransfer ? `from ${pickup} to ${dropoff}` : `in ${pickup}`;
      return { text: `No car ${isTransfer ? 'transfers' : 'rentals'} found ${route}. Try different dates or locations.` };
    }
    const title = isTransfer ? `🚗 Car Transfers from ${pickup} to ${dropoff}` : `🚗 Car Rentals in ${pickup}`;
    let response = `${title}\n\n`;
    cars.forEach((car, i) => {
      response += `${i + 1}. ${car.provider} - ${car.vehicle}\n   Price: ${car.currency} ${parseFloat(car.price).toFixed(2)}\n   Seats: ${car.seats} | Transmission: ${car.transmission}\n\n`;
    });

    response += `Tap the button below to view all car options on our search page.`;

    const action = buildCarSearchLink(pickup, dropoff || pickup, pickupDate, passengers);
    return { text: response, action: action || undefined };
  };


   const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const lowerUserMessage = userMessage.toLowerCase();
    setInput('');

    if (isOnboarding && !user) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      setIsLoading(true);
      const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'hola'];
      if (greetings.some(g => lowerUserMessage === g || lowerUserMessage === `${g}!`)) {
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Hi there! Before we start, could you please share your **Name** and **Email address** so I can assist you better?" 
          }]);
          setIsLoading(false);
        }, 500);
        return;
      }

      const emailMatch = userMessage.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      const nameMatch = userMessage.replace(emailMatch ? emailMatch[0] : '', '').replace(/,/g, '').trim();

      setTimeout(() => {
        if (emailMatch && nameMatch) {
          setUserEmail(emailMatch[0]);
          setUserName(nameMatch);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Thank you, ${nameMatch.split(' ')[0]}! I've got your details. How can I help you today? You can ask about flights, hotels, or car rentals.` 
          }]);
        } else {
       
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "I need both your **Name** and **Email address** to continue. Could you please type them like this: `John Doe, john@example.com`?" 
          }]);
        }
        setIsLoading(false);
      }, 500);
      
      return; 
    }

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'hola'];
      if (greetings.some(g => lowerUserMessage === g || lowerUserMessage === `${g}!` || lowerUserMessage === `${g} there`)) {
        const nameToUse = (userName || user?.name || '').split(' ')[0];

        const greetingMessage = nameToUse
          ? `Hello ${nameToUse}! 👋 I'm your travel assistant. I can search real flights, hotels, and car rentals, or answer questions about our policies. How can I help you today?`
          : `Hello! 👋 I'm your travel assistant. I can search real flights, hotels, and car rentals, or answer questions about our policies. How can I help you today?`;

        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: greetingMessage }]);
          setIsLoading(false);
        }, 500);
        return;
      }

      const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop()?.content || '';
      const travelInfo = extractTravelInfo(userMessage);

      let apiResponse = '';
      let needsHandoff = false;
      let action: ChatMessage['action'] = undefined;

      const isPolicyQuestion = 
      lowerUserMessage.includes('policy') || 
      lowerUserMessage.includes('refund') || 
      lowerUserMessage.includes('cancel') || 
      lowerUserMessage.includes('rule') || 
      lowerUserMessage.includes('fee') || 
      lowerUserMessage.includes('visa') ||
      lowerUserMessage.includes('dhl') ||
      lowerUserMessage.includes('logistics') ||
      lowerUserMessage.includes('admission') ||
      lowerUserMessage.includes('student') ||
      lowerUserMessage.includes('founder') ||
      lowerUserMessage.includes('who is') ||
      lowerUserMessage.includes('contact') ||
      lowerUserMessage.includes('email') ||
      lowerUserMessage.includes('phone') ||
      lowerUserMessage.includes('address');


      // ✅ CONTEXT DETECTION: Was the AI just asking for car locations?
      const isCarContext = 
        lastAssistantMessage.includes("car transfer") || 
        lastAssistantMessage.includes("Where is your pickup location") ||
        lastAssistantMessage.includes("Which city do you need the car in") ||
        lastAssistantMessage.includes("Searching for car");

      // 1. HOTEL (Added !isPolicyQuestion)
      if (!isPolicyQuestion && (lowerUserMessage.includes('hotel') || lowerUserMessage.includes('stay') || lastAssistantMessage.includes("Which city are you looking to stay in"))) {
        if (!travelInfo.city && !travelInfo.to) {
          setMessages(prev => [...prev, { role: 'assistant', content: "I can help you find a hotel! Which city are you looking to stay in?" }]);
          setIsLoading(false);
          return;
        }

        const cityCode = travelInfo.city || travelInfo.to;
        const checkInDate = travelInfo.checkIn || new Date(Date.now() + 604800000).toISOString().split('T')[0];
        const checkOutDate = travelInfo.checkOut || new Date(new Date(checkInDate).getTime() + 86400000 * 3).toISOString().split('T')[0];

        const hotelParams: HotelSearchParams = {
          cityCode: cityCode!,
          checkInDate,
          checkOutDate,
          adults: travelInfo.passengers || 2,
          roomQuantity: 1,
          currency: 'GBP'
        };

        setMessages(prev => [...prev, { role: 'assistant', content: `Searching for hotels in ${cityCode} from ${checkInDate} to ${checkOutDate}...` }]);
        const hotels = await searchHotels(hotelParams);
        
        const formatted = formatHotelResponse(hotels, cityCode!, checkInDate, checkOutDate, travelInfo.passengers || 2);
        apiResponse = formatted.text;
        action = formatted.action;
      }
      // 2. CAR / TRANSFER (Added !isPolicyQuestion)
      else if (
        !isPolicyQuestion && (
          isCarContext ||
          lowerUserMessage.includes('car') ||
          lowerUserMessage.includes('rental') ||
          lowerUserMessage.includes('transfer') ||
          lowerUserMessage.includes('pickup') ||
          lowerUserMessage.includes('dropoff')
        )
      ) {
        const pickup = travelInfo.pickupCity || travelInfo.from || travelInfo.city || travelInfo.to;
        const dropoff = travelInfo.dropoffCity || travelInfo.to || pickup;

        if (!pickup || !dropoff) {
          setMessages(prev => [...prev, { role: 'assistant', content: "I can help you book a car transfer! Where is your pickup location and where is your destination?" }]);
          setIsLoading(false);
          return;
        }

        if (pickup.toUpperCase() === dropoff.toUpperCase()) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `The pickup and dropoff cities cannot be the same (${pickup}). Please provide a different destination for your car transfer.` 
          }]);
          setIsLoading(false);
          return;
        }

        const pickupDate = travelInfo.date || new Date().toISOString().split('T')[0];
        const pickupDateTime = `${pickupDate}T10:00:00`;
        const dropoffDateTime = new Date(new Date(pickupDateTime).getTime() + 86400000 * 1).toISOString();

        const carParams: CarRentalSearchParams = {
          pickupLocationCode: pickup.toUpperCase(),
          pickupDateTime,
          dropoffLocationCode: dropoff.toUpperCase(),
          dropoffDateTime,
          currency: 'GBP',
          passengers: travelInfo.passengers || 2
        };

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Searching for car transfers from ${pickup} to ${dropoff} on ${pickupDate}...`
        }]);

        const cars = await searchCarRentals(carParams);
        
        const formatted = formatCarResponse(cars, pickup, dropoff, pickupDate, travelInfo.passengers || 2);
        apiResponse = formatted.text;
        action = formatted.action;
      }
      // 3. FLIGHTS (Added !isPolicyQuestion)
      else if (
        !isPolicyQuestion && (
          lowerUserMessage.includes('flight') ||
          lowerUserMessage.includes('fly') ||
          (!isCarContext && travelInfo.from && travelInfo.to) ||
          lastAssistantMessage.includes("Where would you like to fly to")
        )
      ) {
        if (!travelInfo.to) {
          setMessages(prev => [...prev, { role: 'assistant', content: "I can definitely help with that! Where would you like to fly to, and what date?" }]);
          setIsLoading(false);
          return;
        }

        const origin = travelInfo.from || 'LON';
        const flightParams: FlightSearchParams = {
          origin,
          destination: travelInfo.to,
          departureDate: travelInfo.date || new Date().toISOString().split('T')[0],
          passengers: travelInfo.passengers || 1,
          cabinClass: 'economy'
        };

        setMessages(prev => [...prev, { role: 'assistant', content: `Searching for flights from ${origin} to ${travelInfo.to}...` }]);

        const { flights } = await searchFlights(flightParams);
        const formatted = formatFlightResponse(flights, flightParams.origin, flightParams.destination, {
          passengers: flightParams.passengers
        });
        apiResponse = formatted.text;
        action = formatted.action;
      }
      // 4. BOOKING GUIDANCE
      else if (
        lowerUserMessage.includes('how do i book') ||
        lowerUserMessage.includes('how to book') ||
        lowerUserMessage.includes('how can i book') ||
        lowerUserMessage.includes('booking process') ||
        lowerUserMessage.includes('how does booking') ||
        lowerUserMessage === 'book' ||
        lowerUserMessage.includes('make a booking') ||
        lowerUserMessage.includes('reserve')
      ) {
        apiResponse =
          `Here's how to book with Ebony Bruce Travels ✈️\n\n` +
          `1. Search — Tell me what you need, e.g.:\n` +
          `   • "Flights from Lagos to London next week"\n` +
          `   • "Hotels in Dubai for 3 nights"\n` +
          `   • "Car transfer from Lagos to Abuja tomorrow"\n\n` +
          `2. Pick an option — I'll show you live prices and a "View all flights" button.\n\n` +
          `3. Complete your details — Name, email, phone.\n\n` +
          `4. Pay securely — Card or other supported methods.\n\n` +
          `5. Get confirmation — Sent to your email instantly.\n\n` +
          `Ready to start? Just tell me what you'd like to search for!`;
      }
                     // 5. BACKEND AI (Policy questions land here!)
          else {
            console.log("🤖 [Frontend] Sending to Backend AI...");
            apiResponse = await askBackendAI(userMessage);
            console.log("✅ [Frontend] Backend AI Responded with:", apiResponse);
    
            // ✅ ONLY trigger handoff if the AI explicitly says it needs to transfer, 
            // NOT just because it mentions "human agent" in a fallback message.
            const handoffPhrases = [
              "transfer you to a human",
              "connect you to a human",
              "connect you to an agent",
              "speak to a human",
              "speak with a human",
              "opening a live chat",
              "trouble connecting",
              "human agent"
            ];
            if (handoffPhrases.some(phrase => apiResponse.toLowerCase().includes(phrase))) {
              needsHandoff = true;
            }
          }

      // ✅ Build history BEFORE updating state
      const finalHistory = [
        ...messages.slice(1),
        { role: 'user' as const, content: userMessage },
        { role: 'assistant' as const, content: apiResponse }
      ];

      const contextToSend = finalHistory
        .map(m => `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`)
        .join('\n\n')
        .substring(0, 2000);

      setMessages(prev => [...prev, { role: 'assistant', content: apiResponse, action }]);

      if (needsHandoff) {
        setTimeout(() => triggerLiveChatHandoff(contextToSend), 200);
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error. Let me connect you to a human." }]);
   
      const errorHistory = [
        ...messages.slice(1),
        { role: 'user' as const, content: userMessage },
        { role: 'assistant' as const, content: "[Error encountered, transferring to human]" }
      ];

      const errorContext = errorHistory
        .map(m => `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`)
        .join('\n\n')
        .substring(0, 2000);

      setTimeout(() => triggerLiveChatHandoff(errorContext), 200);
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

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-end p-4 pointer-events-none">
      <div className="w-full max-w-md h-[600px] bg-white rounded-3xl shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden">
                <img 
                  src="https://randomuser.me/api/portraits/women/44.jpg" 
                  alt="Miles" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Miles (AI)</h3>
              <p className="text-xs text-gray-400">Active</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* CHAT AREA */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-white relative">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-start ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex-shrink-0 mr-3 overflow-hidden">
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Miles" className="w-full h-full object-cover" />
                </div>
              )}

<div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#32A6D7] text-white rounded-tr-sm shadow-md' // 👈 Changed here
                  : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm'
              }`}>
               <div className="whitespace-pre-wrap">
  {m.content ? stripMarkdown(String(m.content)) : "..."}
</div>
                
                {m.action && (
                  <button
                  onClick={() => {
                    if (m.action!.href === 'LIVE_CHAT') {
                      triggerLiveChatHandoff();
                    } else {
                      onClose();
                      window.location.href = m.action!.href;   
                    }
                  }}
                    className="mt-3 w-full bg-[#32A6D7] hover:bg-[#2c98c7] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2"
                  >
                    {m.action.label}
                  </button>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex-shrink-0 ml-3 overflow-hidden">
                  <img
                    src={user?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1a1a1a&color=fff`}
                    alt="User"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex-shrink-0 mr-3 overflow-hidden">
                <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Miles" className="w-full h-full object-cover" />
              </div>
              <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]"></div>
              </div>
            </div>
          )}
        </div>

        {/* INPUT AREA */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-center bg-white border border-gray-200 rounded-full p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2 bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400"
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2 bg-gray-100 text-gray-400 rounded-full transition hover:bg-gray-200 disabled:opacity-50 ml-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIAssistant;
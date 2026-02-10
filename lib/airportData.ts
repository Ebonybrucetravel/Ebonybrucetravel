// lib/airportData.ts

export interface Airport {
    code: string;
    name: string;
    city: string;
    country: string;
    type: 'airport' | 'city';
  }
  
  // International airports AND city centers dataset
  export const airports: Airport[] = [
    // ====== CITY CENTERS (CRITICAL FOR CAR RENTALS) ======
    { code: 'PAR', name: 'Paris City Center', city: 'Paris', country: 'France', type: 'city' },
    { code: 'LHR', name: 'London City Center', city: 'London', country: 'UK', type: 'city' },
    { code: 'NYC', name: 'New York City Center', city: 'New York', country: 'USA', type: 'city' },
    { code: 'LAX', name: 'Los Angeles City Center', city: 'Los Angeles', country: 'USA', type: 'city' },
    { code: 'CHI', name: 'Chicago City Center', city: 'Chicago', country: 'USA', type: 'city' },
    { code: 'MIA', name: 'Miami City Center', city: 'Miami', country: 'USA', type: 'city' },
    { code: 'LAS', name: 'Las Vegas City Center', city: 'Las Vegas', country: 'USA', type: 'city' },
    { code: 'SFO', name: 'San Francisco City Center', city: 'San Francisco', country: 'USA', type: 'city' },
    { code: 'BOS', name: 'Boston City Center', city: 'Boston', country: 'USA', type: 'city' },
    { code: 'WAS', name: 'Washington D.C. City Center', city: 'Washington', country: 'USA', type: 'city' },
    { code: 'DFW', name: 'Dallas City Center', city: 'Dallas', country: 'USA', type: 'city' },
    { code: 'IAH', name: 'Houston City Center', city: 'Houston', country: 'USA', type: 'city' },
    { code: 'PHX', name: 'Phoenix City Center', city: 'Phoenix', country: 'USA', type: 'city' },
    { code: 'SEA', name: 'Seattle City Center', city: 'Seattle', country: 'USA', type: 'city' },
    { code: 'MCO', name: 'Orlando City Center', city: 'Orlando', country: 'USA', type: 'city' },
    { code: 'ATL', name: 'Atlanta City Center', city: 'Atlanta', country: 'USA', type: 'city' },
    
    // Nigeria city centers
    { code: 'LOS', name: 'Lagos City Center', city: 'Lagos', country: 'Nigeria', type: 'city' },
    { code: 'ABV', name: 'Abuja City Center', city: 'Abuja', country: 'Nigeria', type: 'city' },
    { code: 'PHC', name: 'Port Harcourt City Center', city: 'Port Harcourt', country: 'Nigeria', type: 'city' },
    { code: 'KAN', name: 'Kano City Center', city: 'Kano', country: 'Nigeria', type: 'city' },
    
    // Other international city centers
    { code: 'DXB', name: 'Dubai City Center', city: 'Dubai', country: 'UAE', type: 'city' },
    { code: 'SIN', name: 'Singapore City Center', city: 'Singapore', country: 'Singapore', type: 'city' },
    { code: 'HKG', name: 'Hong Kong City Center', city: 'Hong Kong', country: 'China', type: 'city' },
    { code: 'TYO', name: 'Tokyo City Center', city: 'Tokyo', country: 'Japan', type: 'city' },
    { code: 'SYD', name: 'Sydney City Center', city: 'Sydney', country: 'Australia', type: 'city' },
    { code: 'ROM', name: 'Rome City Center', city: 'Rome', country: 'Italy', type: 'city' },
    { code: 'MAD', name: 'Madrid City Center', city: 'Madrid', country: 'Spain', type: 'city' },
    { code: 'BER', name: 'Berlin City Center', city: 'Berlin', country: 'Germany', type: 'city' },
    
    // ====== AIRPORTS ======
    // Europe Airports
    { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'UK', type: 'airport' },
    { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', type: 'airport' },
    { code: 'AMS', name: 'Amsterdam Schiphol Airport', city: 'Amsterdam', country: 'Netherlands', type: 'airport' },
    { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', type: 'airport' },
    { code: 'MAD', name: 'Madrid Barajas Airport', city: 'Madrid', country: 'Spain', type: 'airport' },
    { code: 'FCO', name: 'Rome Fiumicino Airport', city: 'Rome', country: 'Italy', type: 'airport' },
    { code: 'LGW', name: 'London Gatwick Airport', city: 'London', country: 'UK', type: 'airport' },
    { code: 'ORY', name: 'Paris Orly Airport', city: 'Paris', country: 'France', type: 'airport' },
    { code: 'BCN', name: 'Barcelona–El Prat Airport', city: 'Barcelona', country: 'Spain', type: 'airport' },
    
    // North America Airports
    { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', type: 'airport' },
    { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA', type: 'airport' },
    { code: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'USA', type: 'airport' },
    { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', type: 'airport' },
    { code: 'MEX', name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico', type: 'airport' },
    { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark', country: 'USA', type: 'airport' },
    { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'USA', type: 'airport' },
    { code: 'ATL', name: 'Hartsfield–Jackson Atlanta International Airport', city: 'Atlanta', country: 'USA', type: 'airport' },
    { code: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'USA', type: 'airport' },
    
    // Middle East Airports
    { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', type: 'airport' },
    { code: 'AUH', name: 'Abu Dhabi International Airport', city: 'Abu Dhabi', country: 'UAE', type: 'airport' },
    { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', type: 'airport' },
    { code: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia', type: 'airport' },
    
    // Africa Airports
    { code: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria', type: 'airport' },
    { code: 'ABV', name: 'Nnamdi Azikiwe International Airport', city: 'Abuja', country: 'Nigeria', type: 'airport' },
    { code: 'NBO', name: 'Jomo Kenyatta International Airport', city: 'Nairobi', country: 'Kenya', type: 'airport' },
    { code: 'JNB', name: 'O.R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa', type: 'airport' },
    { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt', type: 'airport' },
    { code: 'ACC', name: 'Kotoka International Airport', city: 'Accra', country: 'Ghana', type: 'airport' },
    { code: 'PHC', name: 'Port Harcourt International Airport', city: 'Port Harcourt', country: 'Nigeria', type: 'airport' },
    { code: 'KAN', name: 'Mallam Aminu Kano International Airport', city: 'Kano', country: 'Nigeria', type: 'airport' },
    
    // Asia Airports
    { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', type: 'airport' },
    { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'China', type: 'airport' },
    { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', type: 'airport' },
    { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', type: 'airport' },
    { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', type: 'airport' },
    { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', type: 'airport' },
    { code: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China', type: 'airport' },
    { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'India', type: 'airport' },
    
    // Australia Airports
    { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', type: 'airport' },
    { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', type: 'airport' },
    { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'Australia', type: 'airport' },
    
    // South America Airports
    { code: 'GRU', name: 'São Paulo/Guarulhos International Airport', city: 'São Paulo', country: 'Brazil', type: 'airport' },
    { code: 'EZE', name: 'Ministro Pistarini International Airport', city: 'Buenos Aires', country: 'Argentina', type: 'airport' },
    { code: 'SCL', name: 'Arturo Merino Benítez International Airport', city: 'Santiago', country: 'Chile', type: 'airport' },
    { code: 'LIM', name: 'Jorge Chávez International Airport', city: 'Lima', country: 'Peru', type: 'airport' },
  ];
  
  // Get airport suggestions based on search query
  export const getAirportSuggestions = (query: string, limit: number = 10): Airport[] => {
    if (!query || query.trim() === '') {
      return airports.slice(0, limit);
    }
    
    const queryLower = query.toLowerCase().trim();
    
    return airports
      .filter(airport => {
        const searchText = `${airport.code} ${airport.name} ${airport.city} ${airport.country}`.toLowerCase();
        return searchText.includes(queryLower);
      })
      .slice(0, limit);
  };
  
  // Find airport by code
  export const getAirportByCode = (code: string): Airport | undefined => {
    return airports.find(airport => airport.code === code.toUpperCase());
  };
  
  // Format airport for display
  export const formatAirportDisplay = (airport: Airport): string => {
    const typeLabel = airport.type === 'city' ? 'City Center' : 'Airport';
    return `${airport.code} - ${airport.name} (${typeLabel}), ${airport.city}, ${airport.country}`;
  };
  
  // Get suggestions for car rentals (prioritizes city centers)
  export const getCarLocationSuggestions = (query: string, limit: number = 10): Airport[] => {
    if (!query || query.trim() === '') {
      // Return city centers first, then airports
      const cityCenters = airports.filter(a => a.type === 'city').slice(0, 5);
      const popularAirports = airports.filter(a => a.type === 'airport' && 
        ['LHR', 'CDG', 'JFK', 'LOS', 'ABV'].includes(a.code)).slice(0, 5);
      return [...cityCenters, ...popularAirports].slice(0, limit);
    }
    
    const queryLower = query.toLowerCase().trim();
    
    // Filter all locations
    const allResults = airports.filter(airport => {
      const searchText = `${airport.code} ${airport.name} ${airport.city} ${airport.country}`.toLowerCase();
      return searchText.includes(queryLower);
    });
    
    // Sort: city centers first, then airports
    return allResults.sort((a, b) => {
      if (a.type === 'city' && b.type !== 'city') return -1;
      if (a.type !== 'city' && b.type === 'city') return 1;
      return 0;
    }).slice(0, limit);
  };
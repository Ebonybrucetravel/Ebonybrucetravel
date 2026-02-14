// lib/duffel-airlines.ts
export interface Airline {
    id: string;
    name: string;
    iata_code: string;
    logo_symbol_url: string;
    logo_lockup_url: string;
  }
  
  // This is now just a type definition - no API calls
  // The actual airline data should come from your backend API
  
  // Helper function to create a map from airline array (useful for frontend)
  export function createAirlinesMap(airlines: Airline[]): Map<string, Airline> {
    return new Map(airlines.map(airline => [airline.iata_code, airline]));
  }
  
  // These functions are removed because they make API calls:
  // - getAirlinesMap()
  // - getAirlineByCode()
  // - getAirlineLogoUrl()
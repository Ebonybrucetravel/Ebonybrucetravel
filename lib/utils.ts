export const currencySymbol = (code: string) => {
  const map: Record<string, string> = { USD: '$', GBP: '£', EUR: '€', NGN: '₦' };
  return map[code] ?? code;
};

export const formatPrice = (amount: number, currency = 'GBP') => `${currencySymbol(currency)}${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const extractAirportCode = (display: string): string => {
  if (!display?.trim()) return '';
  const patterns = [/^([A-Z]{3})$/, /\(([A-Z]{3})\)/, /^([A-Z]{3})\b/, /([A-Z]{3})/];
  for (const p of patterns) {
    const m = display.trim().match(p);
    if (m?.[1]) return m[1];
  }
  const first3 = display.trim().substring(0, 3).toUpperCase();
  return /^[A-Z]{3}$/.test(first3) ? first3 : '';
};

const AIRLINE_IMAGES: Record<string, string> = {
  'Air Peace': 'https://logos-world.net/wp-content/uploads/2023/03/Air-Peace-Logo.png',
  'Ibom Air': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Ibom_Air_logo.png/1200px-Ibom_Air_logo.png',
  'Qatar Airways': 'https://logowik.com/content/uploads/images/qatar-airways8336.jpg',
  'British Airways': 'https://logowik.com/content/uploads/images/british-airways8001.jpg',
  Emirates: 'https://logowik.com/content/uploads/images/emirates-airline3232.logowik.com.webp',
  Lufthansa: 'https://logowik.com/content/uploads/images/lufthansa9090.jpg',
  KLM: 'https://logowik.com/content/uploads/images/klm-royal-dutch-airlines8141.jpg',
  Delta: 'https://logowik.com/content/uploads/images/delta-air-lines9725.jpg',
  'United Airlines': 'https://logowik.com/content/uploads/images/united-airlines9763.jpg',
  'American Airlines': 'https://logowik.com/content/uploads/images/american-airlines.jpg',
  'Royal Air Maroc': 'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/AT.svg',
  'Asky Airlines': 'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/KP.svg',
  'RwandAir': 'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/WB.svg',
  'Turkish Airlines': 'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/TK.svg',
  'Ethiopian Airlines': 'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/ET.svg',
  'Kenya Airways': 'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/KQ.svg',
};

export const getAirlineImage = (airline: string) => AIRLINE_IMAGES[airline] ??
  'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=800';

export type ProductType = 'FLIGHT_INTERNATIONAL' | 'FLIGHT_DOMESTIC' | 'HOTEL' | 'CAR_RENTAL';
export type Provider = 'DUFFEL' | 'AMADEUS' | 'TRIPS_AFRICA' | 'BOOKING_COM';

export const getProductMeta = (itemType?: string): {
  productType: ProductType;
  provider: Provider;
} => {
  switch (itemType) {
    case 'hotels':
      return { productType: 'HOTEL', provider: 'AMADEUS' };
    case 'car-rentals':
      return { productType: 'CAR_RENTAL', provider: 'AMADEUS' };
    default:
      return { productType: 'FLIGHT_INTERNATIONAL', provider: 'DUFFEL' };
  }
};

export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

// Helper function to calculate total duration from legs
const calculateTotalDuration = (legs: any[]): string => {
  if (!legs || legs.length === 0) return 'PT0H0M';
  
  let totalMinutes = 0;
  legs.forEach((leg: any) => {
    const dur = leg.duration || '';
    // Handle format like "1h 15m"
    if (dur.includes('h') && dur.includes('m')) {
      const hours = parseInt(dur.match(/(\d+)h/)?.[1] || '0');
      const minutes = parseInt(dur.match(/(\d+)m/)?.[1] || '0');
      totalMinutes += hours * 60 + minutes;
    }
    // Handle format like "PT5H20M"
    else if (dur.includes('H') && dur.includes('M')) {
      const hours = parseInt(dur.match(/(\d+)H/)?.[1] || '0');
      const minutes = parseInt(dur.match(/(\d+)M/)?.[1] || '0');
      totalMinutes += hours * 60 + minutes;
    }
    // Handle format like "5h 20m"
    else if (dur.match(/(\d+)h\s*(\d+)m/)) {
      const hours = parseInt(dur.match(/(\d+)h/)?.[1] || '0');
      const minutes = parseInt(dur.match(/(\d+)m/)?.[1] || '0');
      totalMinutes += hours * 60 + minutes;
    }
    // Handle format like "05:20:00"
    else if (dur.includes(':')) {
      const parts = dur.split(':');
      if (parts.length >= 2) {
        totalMinutes += parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
    }
  });
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `PT${hours}H${minutes}M`;
};

// Helper function to convert a leg to a segment
const legToSegment = (leg: any, airlineName?: string, airlineCode?: string, flightNumber?: string) => ({
  departing_at: leg.departureTime,
  arriving_at: leg.arrivalTime,
  duration: leg.duration,
  origin: {
    iata_code: leg.from || extractAirportCode(leg.fromName || ''),
    name: leg.fromName,
    city_name: leg.fromName?.split('(')[0]?.trim() || leg.fromName
  },
  destination: {
    iata_code: leg.to || extractAirportCode(leg.toName || ''),
    name: leg.toName,
    city_name: leg.toName?.split('(')[0]?.trim() || leg.toName
  },
  operating_carrier: {
    name: leg.airline || airlineName,
    iata_code: airlineCode
  },
  marketing_carrier_flight_number: leg.flightNumber || flightNumber
});

// ✅ TRANSFORM WAKANOW FLIGHTS TO DUFFEL FORMAT (Correct field mapping)
export const transformWakanowToDuffelFormat = (flight: any) => {
  // If it already has slices (Duffel flight), return as is
  if (flight.slices && flight.slices.length > 0) {
    return flight;
  }
  
  console.log('🔄 Transforming Wakanow flight - RAW DATA:', {
    id: flight.id,
    hasFlightLegs: !!(flight.FlightLegs || flight.flightLegs || flight.legs || flight.outboundLegs),
    legsCount: (flight.FlightLegs || flight.flightLegs || flight.legs || flight.outboundLegs)?.length,
  });
  
  // Helper function to convert a single leg to segment format
  const legToSegment = (leg: any, airlineName?: string, airlineCode?: string) => {
    // Handle both camelCase and PascalCase field names from Wakanow
    const departureCode = leg.DepartureCode || leg.departureCode || leg.from;
    const departureName = leg.DepartureName || leg.departureName || leg.fromName;
    const destinationCode = leg.DestinationCode || leg.destinationCode || leg.to;
    const destinationName = leg.DestinationName || leg.destinationName || leg.toName;
    const startTime = leg.StartTime || leg.startTime || leg.departureTime;
    const endTime = leg.EndTime || leg.endTime || leg.arrivalTime;
    const duration = leg.Duration || leg.duration;
    const flightNumber = leg.FlightNumber || leg.flightNumber;
    const operatingCarrier = leg.OperatingCarrierName || leg.operatingCarrierName || leg.airline || airlineName;
    const operatingCarrierCode = leg.OperatingCarrier || leg.operatingCarrier || airlineCode;
    
    return {
      departing_at: startTime,
      arriving_at: endTime,
      duration: duration,
      origin: {
        iata_code: departureCode,
        name: departureName,
        city_name: departureName?.split('(')[0]?.trim() || departureName
      },
      destination: {
        iata_code: destinationCode,
        name: destinationName,
        city_name: destinationName?.split('(')[0]?.trim() || destinationName
      },
      operating_carrier: {
        name: operatingCarrier,
        iata_code: operatingCarrierCode
      },
      marketing_carrier_flight_number: flightNumber
    };
  };
  
  const slices = [];
  
  // Get legs from various possible locations (handle both naming conventions)
  let outboundLegs = flight.FlightLegs || flight.flightLegs || flight.legs || flight.outboundLegs;
  
  // If no legs found, try to create from direct flight properties
  if (!outboundLegs || outboundLegs.length === 0) {
    // Check if this is a direct flight with properties
    if (flight.DepartureCode || flight.departureAirport) {
      outboundLegs = [{
        DepartureCode: flight.DepartureCode || flight.departureAirport,
        DepartureName: flight.DepartureName || flight.departureCity,
        DestinationCode: flight.DestinationCode || flight.arrivalAirport,
        DestinationName: flight.DestinationName || flight.arrivalCity,
        StartTime: flight.StartTime || flight.departureTime,
        EndTime: flight.EndTime || flight.arrivalTime,
        Duration: flight.Duration || flight.duration,
        FlightNumber: flight.FlightNumber || flight.flightNumber,
        OperatingCarrierName: flight.OperatingCarrierName || flight.airlineName,
        OperatingCarrier: flight.OperatingCarrier || flight.airlineCode
      }];
    }
  }
  
  // Create outbound slice
  if (outboundLegs && outboundLegs.length > 0) {
    const outboundSegments = outboundLegs.map((leg: any) => 
      legToSegment(leg, flight.AirlineName || flight.airlineName, flight.AirlineCode || flight.airlineCode)
    );
    
    // Calculate total duration from all legs
    let totalMinutes = 0;
    outboundLegs.forEach((leg: any) => {
      const dur = leg.Duration || leg.duration || '';
      const hours = dur.match(/(\d+)h/)?.[1] || dur.match(/(\d+)H/)?.[1] || '0';
      const minutes = dur.match(/(\d+)m/)?.[1] || dur.match(/(\d+)M/)?.[1] || '0';
      totalMinutes += parseInt(hours) * 60 + parseInt(minutes);
    });
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;
    const totalDuration = `PT${totalHours}H${totalMins}M`;
    
    slices.push({
      origin: outboundSegments[0]?.origin,
      destination: outboundSegments[outboundSegments.length - 1]?.destination,
      duration: totalDuration,
      segments: outboundSegments
    });
  }
  
  // Handle return legs for round trip
  const isRoundTrip = flight.IsReturn === true || 
                      flight.isReturn === true || 
                      flight.isRoundTrip === true ||
                      (flight.returnLegs && flight.returnLegs.length > 0) ||
                      (flight.ReturnLegs && flight.ReturnLegs.length > 0);
  
  if (isRoundTrip) {
    let returnLegs = flight.returnLegs || flight.ReturnLegs;
    
    if (returnLegs && returnLegs.length > 0) {
      const returnSegments = returnLegs.map((leg: any) => 
        legToSegment(leg, flight.AirlineName || flight.airlineName, flight.AirlineCode || flight.airlineCode)
      );
      
      // Calculate total return duration
      let totalMinutes = 0;
      returnLegs.forEach((leg: any) => {
        const dur = leg.Duration || leg.duration || '';
        const hours = dur.match(/(\d+)h/)?.[1] || dur.match(/(\d+)H/)?.[1] || '0';
        const minutes = dur.match(/(\d+)m/)?.[1] || dur.match(/(\d+)M/)?.[1] || '0';
        totalMinutes += parseInt(hours) * 60 + parseInt(minutes);
      });
      const totalHours = Math.floor(totalMinutes / 60);
      const totalMins = totalMinutes % 60;
      const totalDuration = `PT${totalHours}H${totalMins}M`;
      
      slices.push({
        origin: returnSegments[0]?.origin,
        destination: returnSegments[returnSegments.length - 1]?.destination,
        duration: totalDuration,
        segments: returnSegments
      });
    }
  }
  
  // Calculate stop count
  const stopCount = slices[0]?.segments?.length ? slices[0].segments.length - 1 : 0;
  const stopText = stopCount === 0 ? 'Direct' : `${stopCount} Stop${stopCount > 1 ? 's' : ''}`;
  
  const transformed = {
    ...flight,
    slices: slices,
    isRoundTrip: slices.length > 1,
    stopCount: stopCount,
    stopText: stopText
  };
  
  console.log('✅ Transformed flight:', {
    slicesCount: transformed.slices.length,
    isRoundTrip: transformed.isRoundTrip,
    outboundSegmentsCount: transformed.slices[0]?.segments?.length,
    stopCount: stopCount,
    stopText: stopText
  });
  
  return transformed;
};
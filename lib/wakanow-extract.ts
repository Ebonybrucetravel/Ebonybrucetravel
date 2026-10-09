export interface ExtractedFlightInfo {
    airline: string;
    airlineCode: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    departureDate: string;
    arrivalDate: string;
    cabinClass: string;
    bookingClass: string;
    stops: number;
    pnr: string;
    isMultiCity: boolean;
    allSegments: any[];
  }
  
  export function extractFlightInfo(booking: any): ExtractedFlightInfo {
    const empty: ExtractedFlightInfo = {
      airline: 'N/A',
      airlineCode: '',
      flightNumber: 'N/A',
      origin: 'N/A',
      destination: 'N/A',
      departureTime: '',
      arrivalTime: '',
      departureDate: '',
      arrivalDate: '',
      cabinClass: 'Economy',
      bookingClass: 'Economy',
      stops: 0,
      pnr: 'N/A',
      isMultiCity: false,
      allSegments: [],
    };
  
    if (!booking) return empty;
  
    const bookingData = booking.bookingData || {};
    const providerData = booking.providerData || bookingData.providerData || {};
  
    // Find the flight summary
    let flightSummary: any = null;
    if (providerData.FlightBookingSummary) {
      flightSummary = providerData.FlightBookingSummary;
    } else if (providerData.FlightBookingResult?.FlightBookingSummaryModel) {
      flightSummary = providerData.FlightBookingResult.FlightBookingSummaryModel;
    } else if (providerData.FlightSummaryModel) {
      flightSummary = providerData;
    }
  
    const result: ExtractedFlightInfo = { ...empty };
  
    if (flightSummary) {
      const summaryModel = flightSummary.FlightSummaryModel || flightSummary;
      const flightCombination =
        summaryModel.FlightCombination || flightSummary.FlightCombination || {};
      const flightModels = flightCombination.FlightModels || summaryModel.FlightModels || [];
  
      const outboundFlight = flightModels[0] || {};
      const flightLegs = outboundFlight.FlightLegs || [];
      const firstLeg = flightLegs[0] || {};
      const lastLeg = flightLegs[flightLegs.length - 1] || firstLeg;
  
      result.airline = outboundFlight.AirlineName || outboundFlight.Airline || firstLeg.AirlineName || firstLeg.Airline || 'N/A';
      result.airlineCode = outboundFlight.Airline || firstLeg.AirlineCode || '';
      result.flightNumber = outboundFlight.Name || outboundFlight.FlightNumber || firstLeg.FlightNumber || firstLeg.Name || 'N/A';
      result.origin = outboundFlight.DepartureCode || firstLeg.DepartureCode || outboundFlight.Origin || 'N/A';
      result.destination = outboundFlight.ArrivalCode || lastLeg.DestinationCode || outboundFlight.Destination || 'N/A';
      result.departureTime = outboundFlight.DepartureTime || firstLeg.StartTime || outboundFlight.DepartureDateTime || '';
      result.arrivalTime = outboundFlight.ArrivalTime || lastLeg.EndTime || outboundFlight.ArrivalDateTime || '';
      result.departureDate = result.departureTime ? new Date(result.departureTime).toISOString().split('T')[0] : '';
      result.arrivalDate = result.arrivalTime ? new Date(result.arrivalTime).toISOString().split('T')[0] : '';
      result.stops = outboundFlight.Stops || outboundFlight.StopCount || 0;
      result.cabinClass = firstLeg.CabinClassName || outboundFlight.CabinClass || 'Economy';
      result.bookingClass = firstLeg.BookingClass || outboundFlight.BookingClass || 'Economy';
      result.pnr = flightSummary.PnrReferenceNumber || summaryModel.PnrReferenceNumber || 'N/A';
  
      // Multi-city detection
      if (flightModels.length > 1) {
        result.isMultiCity = true;
        result.allSegments = flightModels.map((flight: any) => ({
          from: flight.DepartureCode || flight.Origin || '',
          to: flight.ArrivalCode || flight.Destination || '',
          date: flight.DepartureTime || flight.DepartureDateTime || '',
          airline: flight.AirlineName || flight.Airline || '',
          flightNumber: flight.FlightNumber || flight.Name || '',
        }));
      }
    }
  
    // Fallbacks from bookingData
    if (result.origin === 'N/A' && bookingData.origin) result.origin = bookingData.origin;
    if (result.destination === 'N/A' && bookingData.destination) result.destination = bookingData.destination;
    if (result.airline === 'N/A' && bookingData.airlineName) result.airline = bookingData.airlineName;
    if (result.flightNumber === 'N/A' && bookingData.flightNumber) result.flightNumber = bookingData.flightNumber;
    if (result.pnr === 'N/A' && (bookingData.pnrReferenceNumber || bookingData.pnrNumber)) {
      result.pnr = bookingData.pnrReferenceNumber || bookingData.pnrNumber;
    }
  
    return result;
  }
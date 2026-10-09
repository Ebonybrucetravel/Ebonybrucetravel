'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Booking {
  id: string;
  reference: string;
  status: string;
  productType: string;
  provider: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  user?: { name: string; email: string; phone: string };
  bookingData?: any;
  providerData?: any;
  paymentStatus?: string;
  passengerInfo?: any;
}

// ==================== HELPERS ====================

const getAirportName = (code: string): string => {
  const airports: Record<string, string> = {
    LOS: 'Murtala Muhammed International Airport, Lagos',
    ABV: 'Nnamdi Azikiwe International Airport, Abuja',
    PHC: 'Port Harcourt International Airport',
    KAN: 'Mallam Aminu Kano International Airport',
    ENU: 'Akanu Ibiam International Airport, Enugu',
    QOW: 'Sam Mbakwe Airport, Owerri',
    BNI: 'Benin Airport',
    JOS: 'Yakubu Gowon Airport, Jos',
    KAD: 'Kaduna Airport',
    YOL: 'Yola Airport',
    LHR: 'London Heathrow Airport',
    JFK: 'John F. Kennedy International Airport, New York',
    CDG: 'Charles de Gaulle Airport, Paris',
    DXB: 'Dubai International Airport',
    IST: 'Istanbul Airport',
    FRA: 'Frankfurt Airport',
    AMS: 'Amsterdam Schiphol Airport',
  };
  return airports[code] || code;
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatTime = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

// ==================== WAKANOW EXTRACTION ====================

function extractWakanowData(booking: Booking) {
  const bookingData = booking.bookingData || {};
  const providerData = (booking.providerData as any) || {};

  // --- PNR ---
  const pnrNumber =
    bookingData?.pnrReferenceNumber ||
    bookingData?.PnrReferenceNumber ||
    bookingData?.pnrNumber ||
    providerData?.PnrReferenceNumber ||
    providerData?.PNR ||
    'Not issued yet';

  const wakanowBookingId =
    providerData?.WakanowBookingId ||
    providerData?.BookingId ||
    bookingData?.bookingId ||
    bookingData?.wakanowBookingId ||
    'N/A';

  // --- Flight data ---
  let airlineName = 'N/A';
  let airlineCode = '';
  let flightNumber = 'N/A';
  let departureAirport = 'N/A';
  let arrivalAirport = 'N/A';
  let departureTime = '';
  let arrivalTime = '';
  let stops = 0;
  let cabinClass = 'Economy';
  let bookingClass = 'Economy';
  let ticketStatus = 'Pending';
  let paymentStatus = booking.paymentStatus || 'PENDING';

  if (providerData) {
    const flightSummary =
      providerData.FlightBookingSummary ||
      providerData.FlightBookingResult?.FlightBookingSummaryModel ||
      (providerData.FlightSummaryModel ? providerData : null);

    if (flightSummary) {
      const summaryModel = flightSummary.FlightSummaryModel || flightSummary;
      const flightCombination =
        summaryModel.FlightCombination || flightSummary.FlightCombination || {};
      const flightModels = flightCombination.FlightModels || summaryModel.FlightModels || [];

      const outbound = flightModels[0] || {};
      const legs = outbound.FlightLegs || [];
      const firstLeg = legs[0] || {};
      const lastLeg = legs[legs.length - 1] || firstLeg;

      airlineName =
        outbound.AirlineName || outbound.Airline || firstLeg.AirlineName || 'N/A';
      airlineCode = outbound.Airline || firstLeg.AirlineCode || '';
      flightNumber =
        outbound.Name || outbound.FlightNumber || firstLeg.FlightNumber || 'N/A';
      departureAirport = outbound.DepartureCode || firstLeg.DepartureCode || 'N/A';
      arrivalAirport = outbound.ArrivalCode || lastLeg.DestinationCode || 'N/A';
      departureTime = outbound.DepartureTime || firstLeg.StartTime || '';
      arrivalTime = outbound.ArrivalTime || lastLeg.EndTime || '';
      stops = outbound.Stops || 0;
      cabinClass = firstLeg.CabinClassName || outbound.CabinClass || 'Economy';
      bookingClass = firstLeg.BookingClass || outbound.BookingClass || 'Economy';
      ticketStatus = flightSummary.TicketStatus || 'Pending';
      paymentStatus = flightSummary.PaymentStatus || paymentStatus;
    }
  }

  // Fallback to bookingData
  if (airlineName === 'N/A' && bookingData) {
    airlineName = bookingData.airlineName || bookingData.airline || 'N/A';
    flightNumber = bookingData.flightNumber || 'N/A';
    departureAirport = bookingData.origin || bookingData.departureAirport || 'N/A';
    arrivalAirport = bookingData.destination || bookingData.arrivalAirport || 'N/A';
    departureTime = bookingData.departureTime || bookingData.departureDate || '';
    arrivalTime = bookingData.arrivalTime || bookingData.arrivalDate || '';
    stops = bookingData.stops || 0;
    cabinClass = bookingData.cabinClass || 'Economy';
    bookingClass = bookingData.bookingClass || 'Economy';
    airlineCode = bookingData.airlineCode || '';
  }

  // --- Passengers ---
  const passengers: Array<{ name: string; type: string; dob?: string }> = [];
  const addPassenger = (p: any) => {
    const firstName = p.firstName || p.FirstName || p.first_name || '';
    const lastName = p.lastName || p.LastName || p.last_name || '';
    const name = `${firstName} ${lastName}`.trim() || p.name || p.fullName || '';
    if (!name) return;
    const dob = p.dateOfBirth || p.DateOfBirth || p.DOB;
    let type = 'Adult';
    const paxType = p.passengerType || p.PassengerType || p.type || p.Type;
    if (paxType) {
      const t = String(paxType).toLowerCase();
      if (t.includes('child') || t === 'chd') type = 'Child';
      else if (t.includes('infant') || t === 'inf') type = 'Infant';
    }
    passengers.push({ name, type, dob });
  };

  if (Array.isArray(bookingData?.passengers)) bookingData.passengers.forEach(addPassenger);
  if (Array.isArray(bookingData?.travellers)) bookingData.travellers.forEach(addPassenger);
  if (Array.isArray(booking.passengerInfo)) booking.passengerInfo.forEach(addPassenger);
  if (Array.isArray(providerData?.Travellers)) providerData.Travellers.forEach(addPassenger);

  return {
    pnrNumber,
    wakanowBookingId,
    airlineName,
    airlineCode,
    flightNumber,
    departureAirport,
    arrivalAirport,
    departureTime,
    arrivalTime,
    stops,
    cabinClass,
    bookingClass,
    ticketStatus,
    paymentStatus,
    passengers,
    airlineLogo: airlineCode
      ? `https://images.wakanow.com/Images/flight-logos/${airlineCode}.gif`
      : '',
  };
}

// ==================== MAIN COMPONENT ====================

export default function AdminBookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/bookings/${bookingId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.status === 404) {
          setError('Booking not found');
          return;
        }
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const json = await res.json();
        setBooking(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (bookingId) fetchBooking();
  }, [bookingId]);

  if (loading) return <div className="p-8">Loading booking...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!booking) return <div className="p-8">No booking found</div>;

  const isWakanow = booking.provider === 'WAKANOW';
  const isFlight =
    booking.productType === 'FLIGHT_INTERNATIONAL' ||
    booking.productType === 'FLIGHT_DOMESTIC';

  const wakanow = isWakanow ? extractWakanowData(booking) : null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Booking {booking.reference}</h1>

      {/* ============ SUMMARY ============ */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-white p-6 rounded-lg shadow">
        <div>
          <p className="text-sm text-gray-500">Status</p>
          <p className="font-medium">{booking.status}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Payment Status</p>
          <p className="font-medium">
            {wakanow?.paymentStatus || booking.paymentStatus || 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Product Type</p>
          <p className="font-medium">{booking.productType}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Provider</p>
          <p className="font-medium">{booking.provider}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Customer</p>
          <p className="font-medium">{booking.user?.name}</p>
          <p className="text-sm text-gray-500">{booking.user?.email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Amount</p>
          <p className="font-medium">
            {booking.currency} {booking.totalAmount}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Created</p>
          <p className="font-medium">{new Date(booking.createdAt).toLocaleString()}</p>
        </div>
        {wakanow && (
          <div>
            <p className="text-sm text-gray-500">Wakanow Booking ID</p>
            <p className="font-mono font-medium text-sm">{wakanow.wakanowBookingId}</p>
          </div>
        )}
      </div>

      {/* ============ WAKANOW FLIGHT DETAILS ============ */}
      {isWakanow && isFlight && wakanow && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-bold mb-4">Trip Details</h2>

          {/* Airline + PNR */}
          <div className="flex items-center gap-4 mb-6">
            {wakanow.airlineLogo && (
              <img
                src={wakanow.airlineLogo}
                alt={wakanow.airlineName}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div>
              <p className="font-semibold text-lg">{wakanow.airlineName}</p>
              <p className="text-sm text-gray-500">
                Flight {wakanow.flightNumber}
                {wakanow.airlineCode ? ` • ${wakanow.airlineCode}` : ''}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-500">Airline PNR</p>
              <p className="font-mono font-bold">{wakanow.pnrNumber}</p>
            </div>
          </div>

          {/* Departure / Arrival */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs font-bold text-blue-700 uppercase mb-2">Departure</p>
              <p className="font-bold text-lg">{wakanow.departureAirport}</p>
              <p className="text-sm text-gray-600">
                {getAirportName(wakanow.departureAirport)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatDate(wakanow.departureTime)} • {formatTime(wakanow.departureTime)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-xs font-bold text-green-700 uppercase mb-2">Arrival</p>
              <p className="font-bold text-lg">{wakanow.arrivalAirport}</p>
              <p className="text-sm text-gray-600">
                {getAirportName(wakanow.arrivalAirport)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatDate(wakanow.arrivalTime)} • {formatTime(wakanow.arrivalTime)}
              </p>
            </div>
          </div>

          {/* Class + Stops + Ticket Status */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Cabin Class</p>
              <p className="font-medium">{wakanow.cabinClass}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Booking Class</p>
              <p className="font-medium">{wakanow.bookingClass}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Stops</p>
              <p className="font-medium">
                {wakanow.stops === 0
                  ? 'Direct'
                  : `${wakanow.stops} stop${wakanow.stops > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Passengers */}
          {wakanow.passengers.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Passengers</h3>
              <table className="w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600">#</th>
                    <th className="px-4 py-2 text-left text-gray-600">Name</th>
                    <th className="px-4 py-2 text-left text-gray-600">Type</th>
                    <th className="px-4 py-2 text-left text-gray-600">Date of Birth</th>
                  </tr>
                </thead>
                <tbody>
                  {wakanow.passengers.map((p, i) => (
                    <tr key={i} className={i === 0 ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-2 border-t">{i + 1}</td>
                      <td className="px-4 py-2 border-t font-medium">
                        {p.name}
                        {i === 0 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Lead
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 border-t">{p.type}</td>
                      <td className="px-4 py-2 border-t">
                        {p.dob ? formatDate(p.dob) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ticket status */}
          <div className="mt-6">
            <p className="text-sm text-gray-500">Ticket Status</p>
            <span
              className={`inline-block mt-1 text-xs font-bold uppercase px-3 py-1 rounded-full ${
                wakanow.ticketStatus === 'Success' ||
                wakanow.ticketStatus === 'Issued'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {wakanow.ticketStatus}
            </span>
          </div>
        </div>
      )}

      {/* ============ RAW DATA (debug) ============ */}
      <details className="bg-white p-6 rounded-lg shadow">
        <summary className="cursor-pointer font-medium">Raw Booking Data</summary>
        <pre className="bg-gray-100 p-4 mt-2 rounded overflow-auto text-xs">
          {JSON.stringify(booking, null, 2)}
        </pre>
      </details>
    </div>
  );
}
'use client';
import React, { useState } from 'react';
import {
  adminSearchWakanowFlights,
  adminSelectWakanowFlight,
  adminBookWakanowFlightForUser,
  listCustomers,
} from '@/lib/adminApi';

type Step = 'search' | 'results' | 'select' | 'customer' | 'passengers' | 'confirm' | 'done';

const inputCls =
  'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] transition-all placeholder-gray-400';

const CABIN_MAP: Record<string, string> = { Y: 'Economy', W: 'Premium Economy', C: 'Business', F: 'First' };

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtPrice(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function parseFlights(results: any[]): any[] {
  return (results ?? []).slice(0, 20);
}

// ─── default passenger ───────────────────────────────────────────────────────
const emptyPassenger = () => ({
  PassengerType: 'Adult' as const,
  Title: 'Mr',
  FirstName: '',
  LastName: '',
  DateOfBirth: '',
  Gender: 'Male' as const,
  Email: '',
  PhoneNumber: '',
  PassportNumber: '',
  ExpiryDate: '',
  PassportIssuingAuthority: '',
  PassportIssueCountryCode: 'NG',
  Address: '',
  City: '',
  Country: 'Nigeria',
  CountryCode: 'NG',
  PostalCode: '100001',
});

// ─── component ───────────────────────────────────────────────────────────────
export default function AdminWakanowBook() {
  const [step, setStep] = useState<Step>('search');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // search params
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [depDate, setDepDate] = useState('');
  const [retDate, setRetDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [cabinClass, setCabinClass] = useState('economy');

  // results
  const [flights, setFlights] = useState<any[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [selectResult, setSelectResult] = useState<any>(null);

  // customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // passengers
  const [passengers, setPassengers] = useState([emptyPassenger()]);

  // result
  const [bookingResult, setBookingResult] = useState<any>(null);

  // ── search ─────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!origin || !destination || !depDate) { setError('Origin, destination and departure date are required.'); return; }
    setError(''); setBusy(true);
    try {
      const res = await adminSearchWakanowFlights({ origin, destination, departureDate: depDate, returnDate: retDate || undefined, adults, cabinClass });
      const items = res?.data?.flights ?? res?.flights ?? res?.data ?? res ?? [];
      setFlights(parseFlights(Array.isArray(items) ? items : []));
      setStep('results');
    } catch (e: any) { setError(e.message ?? 'Search failed'); }
    finally { setBusy(false); }
  };

  // ── select ─────────────────────────────────────────────────────────────────
  const handleSelect = async (flight: any) => {
    setSelectedFlight(flight);
    setError(''); setBusy(true);
    try {
      const selectData = flight.SelectData ?? flight.selectData ?? JSON.stringify(flight);
      const res = await adminSelectWakanowFlight(selectData);
      setSelectResult(res);
      setStep('customer');
    } catch (e: any) { setError(e.message ?? 'Select failed'); }
    finally { setBusy(false); }
  };

  // ── customer search ────────────────────────────────────────────────────────
  const handleCustomerSearch = async () => {
    if (!customerSearch.trim()) return;
    setLoadingCustomers(true);
    try {
      const res = await listCustomers({ search: customerSearch, limit: 10 });
      const items = res?.data?.customers ?? res?.data ?? [];
      setCustomers(Array.isArray(items) ? items : []);
    } catch (e: any) { setError(e.message ?? 'Customer search failed'); }
    finally { setLoadingCustomers(false); }
  };

  const handlePickCustomer = (c: any) => {
    setSelectedCustomer(c);
    // Pre-fill first passenger from customer data
    const nameParts = (c.name || '').trim().split(/\s+/);
    setPassengers([{
      ...emptyPassenger(),
      FirstName: nameParts[0] || '',
      LastName: nameParts.slice(1).join(' ') || '',
      Email: c.email || '',
      PhoneNumber: c.phone || '',
    }]);
    setStep('passengers');
  };

  // ── passenger update ───────────────────────────────────────────────────────
  const updatePax = (idx: number, field: string, value: string) => {
    setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  // ── book ───────────────────────────────────────────────────────────────────
  const handleBook = async () => {
    const missing = passengers.some(p => !p.FirstName || !p.LastName || !p.Email || !p.PassportNumber || !p.ExpiryDate);
    if (missing) { setError('All required passenger fields must be filled.'); return; }
    setError(''); setBusy(true);
    try {
      const bookingData = selectResult?.data?.BookingData ?? selectResult?.BookingData ?? JSON.stringify(selectedFlight);
      const res = await adminBookWakanowFlightForUser({
        userId: selectedCustomer.id,
        selectData: bookingData,
        bookingId: selectResult?.data?.BookingId ?? selectResult?.BookingId ?? '',
        passengers: passengers as any,
      });
      setBookingResult(res);
      setStep('done');
    } catch (e: any) { setError(e.message ?? 'Booking failed'); }
    finally { setBusy(false); }
  };

  // ── render steps ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-black">Book Flight on Behalf of Customer</h1>
        <p className="text-indigo-200 text-sm mt-1">Search → Select → Pick Customer → Confirm Booking</p>
        {/* Progress */}
        <div className="flex items-center gap-2 mt-4 text-xs font-bold flex-wrap">
          {['search','results','customer','passengers','done'].map((s, i, arr) => (
            <React.Fragment key={s}>
              <span className={`px-3 py-1 rounded-full ${step === s ? 'bg-white text-indigo-700' : 'bg-indigo-500/40 text-indigo-200'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
              {i < arr.length - 1 && <span className="text-indigo-400">›</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* STEP: SEARCH */}
      {step === 'search' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
          <h2 className="font-bold text-gray-900 text-lg">Flight Search</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">From (IATA) *</label><input value={origin} onChange={e => setOrigin(e.target.value.toUpperCase())} className={inputCls} placeholder="LOS" maxLength={3} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">To (IATA) *</label><input value={destination} onChange={e => setDestination(e.target.value.toUpperCase())} className={inputCls} placeholder="ABV" maxLength={3} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Departure *</label><input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className={inputCls} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Return (optional)</label><input type="date" value={retDate} onChange={e => setRetDate(e.target.value)} min={depDate || new Date().toISOString().split('T')[0]} className={inputCls} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Adults</label><input type="number" value={adults} onChange={e => setAdults(Number(e.target.value))} min={1} max={9} className={inputCls} /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Cabin Class</label>
              <select value={cabinClass} onChange={e => setCabinClass(e.target.value)} className={inputCls}>
                <option value="economy">Economy</option>
                <option value="premium_economy">Premium Economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </div>
          </div>
          <button onClick={handleSearch} disabled={busy} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50">
            {busy ? 'Searching…' : 'Search Flights'}
          </button>
        </div>
      )}

      {/* STEP: RESULTS */}
      {step === 'results' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg">{flights.length} Flights Found</h2>
            <button onClick={() => setStep('search')} className="text-sm text-indigo-600 font-bold hover:underline">← New Search</button>
          </div>
          {flights.length === 0 && <p className="text-gray-400 text-center py-8">No flights found. Try different dates or airports.</p>}
          <div className="space-y-3">
            {flights.map((f, i) => {
              const price = f.TotalFare ?? f.totalFare ?? f.price ?? 0;
              const currency = f.Currency ?? f.currency ?? 'NGN';
              const airline = f.CarrierName ?? f.Carrier ?? f.airline ?? 'Airline';
              const cabin = CABIN_MAP[f.TicketClass ?? f.ticketClass ?? 'Y'] ?? 'Economy';
              const dep = f.DepartureDateTime ?? f.departureTime ?? '';
              const arr = f.ArrivalDateTime ?? f.arrivalTime ?? '';
              return (
                <div key={i} className="border border-gray-100 rounded-xl p-5 hover:border-indigo-300 transition">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="font-black text-gray-900">{airline}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{cabin} · {dep && new Date(dep).toLocaleString()} → {arr && new Date(arr).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-indigo-600">{fmtPrice(price, currency)}</p>
                      <button onClick={() => handleSelect(f)} disabled={busy} className="mt-2 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50">
                        {busy ? 'Loading…' : 'Select'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP: CUSTOMER */}
      {step === 'customer' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg">Select Customer</h2>
            <button onClick={() => setStep('results')} className="text-sm text-indigo-600 font-bold hover:underline">← Back</button>
          </div>
          {selectedFlight && (
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Selected Flight</p>
              <p className="font-bold text-gray-900">{selectedFlight.CarrierName ?? selectedFlight.airline ?? 'Flight'}</p>
              <p className="text-xs text-gray-500">{origin} → {destination} · {depDate}</p>
            </div>
          )}
          <div className="flex gap-3">
            <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCustomerSearch()} className={inputCls} placeholder="Search by name or email…" />
            <button onClick={handleCustomerSearch} disabled={loadingCustomers} className="px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
              {loadingCustomers ? '…' : 'Search'}
            </button>
          </div>
          <div className="space-y-2">
            {customers.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-300 transition">
                <div>
                  <p className="font-bold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.email}</p>
                </div>
                <button onClick={() => handlePickCustomer(c)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition">
                  Select
                </button>
              </div>
            ))}
            {customers.length === 0 && customerSearch && !loadingCustomers && (
              <p className="text-gray-400 text-sm text-center py-4">No customers found.</p>
            )}
          </div>
        </div>
      )}

      {/* STEP: PASSENGERS */}
      {step === 'passengers' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Passenger Details</h2>
              <p className="text-xs text-gray-500 mt-0.5">Booking for: <span className="font-bold text-gray-800">{selectedCustomer?.name}</span></p>
            </div>
            <button onClick={() => setStep('customer')} className="text-sm text-indigo-600 font-bold hover:underline">← Back</button>
          </div>

          {passengers.map((pax, idx) => (
            <div key={idx} className="border border-gray-100 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-sm">Passenger {idx + 1}</h3>
                <select value={pax.PassengerType} onChange={e => updatePax(idx, 'PassengerType', e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1">
                  <option value="Adult">Adult</option>
                  <option value="Child">Child</option>
                  <option value="Infant">Infant</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Title</label>
                  <select value={pax.Title} onChange={e => updatePax(idx, 'Title', e.target.value)} className={inputCls}>
                    {['Mr','Mrs','Ms','Miss','Dr'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">First Name *</label><input value={pax.FirstName} onChange={e => updatePax(idx, 'FirstName', e.target.value)} className={inputCls} placeholder="First name" /></div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Last Name *</label><input value={pax.LastName} onChange={e => updatePax(idx, 'LastName', e.target.value)} className={inputCls} placeholder="Last name" /></div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Date of Birth *</label><input type="date" value={pax.DateOfBirth} onChange={e => updatePax(idx, 'DateOfBirth', e.target.value)} max={new Date().toISOString().split('T')[0]} className={inputCls} /></div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Gender</label>
                  <select value={pax.Gender} onChange={e => updatePax(idx, 'Gender', e.target.value)} className={inputCls}>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email *</label><input value={pax.Email} onChange={e => updatePax(idx, 'Email', e.target.value)} className={inputCls} placeholder="email@example.com" /></div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Phone</label><input value={pax.PhoneNumber} onChange={e => updatePax(idx, 'PhoneNumber', e.target.value)} className={inputCls} placeholder="+2348000000000" /></div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Passport Number *</label><input value={pax.PassportNumber} onChange={e => updatePax(idx, 'PassportNumber', e.target.value)} className={inputCls} placeholder="A12345678" /></div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Expiry Date *</label><input type="date" value={pax.ExpiryDate} onChange={e => updatePax(idx, 'ExpiryDate', e.target.value)} min={new Date().toISOString().split('T')[0]} className={inputCls} /></div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Issuing Authority</label><input value={pax.PassportIssuingAuthority} onChange={e => updatePax(idx, 'PassportIssuingAuthority', e.target.value)} className={inputCls} placeholder="Nigerian Immigration" /></div>
                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Issue Country Code</label><input value={pax.PassportIssueCountryCode} onChange={e => updatePax(idx, 'PassportIssueCountryCode', e.target.value.toUpperCase())} className={inputCls} placeholder="NG" maxLength={2} /></div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <button onClick={() => setPassengers(p => [...p, emptyPassenger()])} className="flex items-center gap-2 text-sm text-indigo-600 font-bold hover:underline">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 4v16m8-8H4" /></svg>
              Add Passenger
            </button>
            {passengers.length > 1 && (
              <button onClick={() => setPassengers(p => p.slice(0, -1))} className="text-sm text-red-500 font-bold hover:underline">Remove Last</button>
            )}
          </div>

          <button onClick={handleBook} disabled={busy} className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-xl hover:opacity-90 transition disabled:opacity-50 text-sm uppercase tracking-widest">
            {busy ? 'Confirming Booking…' : 'Confirm Booking on Wakanow'}
          </button>
        </div>
      )}

      {/* STEP: DONE */}
      {step === 'done' && (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900">Booking Confirmed!</h2>
          <p className="text-gray-500 text-sm">The Wakanow booking was successfully placed on behalf of <span className="font-bold text-gray-800">{selectedCustomer?.name}</span>.</p>
          {bookingResult && (
            <div className="bg-gray-50 rounded-xl p-4 text-left text-xs font-mono overflow-x-auto">
              <pre>{JSON.stringify(bookingResult, null, 2)}</pre>
            </div>
          )}
          <button onClick={() => { setStep('search'); setFlights([]); setSelectedFlight(null); setSelectResult(null); setSelectedCustomer(null); setBookingResult(null); setError(''); }}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
            Book Another Flight
          </button>
        </div>
      )}
    </div>
  );
}

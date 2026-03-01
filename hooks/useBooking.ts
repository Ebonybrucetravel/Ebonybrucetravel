'use client';
import { useState, useCallback } from 'react';
import { config } from '@/lib/config';
import type { SearchParams, Booking, PassengerInfo } from '@/lib/types';
import { getProductMeta } from '@/lib/utils';
import api, { getStoredAuthToken, getVendorCodeFromCardNumber, publicRequest } from '@/lib/api';

// Extend the SearchResult type locally to include pricing fields
interface ExtendedSearchResult {
    id: string;
    type?: string;
    price?: string;
    title?: string;
    subtitle?: string;
    provider?: string;
    image?: string;
    rating?: number;
    duration?: string;
    time?: string;
    features?: string[];
    amenities?: string[];
    original_amount?: string;
    final_amount?: string;
    markup_percentage?: number;
    markup_amount?: string;
    currency?: string;
    realData?: {
        offerId?: string;
        finalPrice?: number;
        price?: number;
        currency?: string;
        airline?: string;
        flightNumber?: string;
        pickupLocation?: string;
        dropoffLocation?: string;
        pickupDateTime?: string;
        dropoffDateTime?: string;
        vehicleType?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

export function useBooking() {
    const [isCreating, setIsCreating] = useState(false);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [error, setError] = useState<string | null>(null);
    const BASE = config.apiBaseUrl;

    const createBooking = useCallback(async (
        item: ExtendedSearchResult, 
        searchParams: SearchParams | null, 
        passenger: PassengerInfo, 
        isGuest: boolean,
        options?: { taxes?: number; basePrice?: number; finalAmount?: number }
    ): Promise<Booking> => {
        setIsCreating(true);
        setError(null);
        try {
            const { productType, provider } = getProductMeta(item.type || '');
            const offerCurrency = (item.realData?.currency ?? item.currency ?? 'GBP').toUpperCase();
            
            // Get base price (original amount before markup)
            const basePrice = options?.basePrice ?? (typeof item.original_amount === 'string'
                ? parseFloat(item.original_amount)
                : (() => {
                    const priceMatch = item.price?.match(/[\d,.]+/);
                    return priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 100;
                })());
    
            // Calculate taxes by adding markup and service fee together
            const markupAmount = parseFloat(item.markup_amount || '0');
            const serviceFee = parseFloat(item.service_charge || '0');
            const taxes = markupAmount + serviceFee; // ✅ MARKUP + SERVICE FEE = TAXES
    
            // Final amount = basePrice + taxes
            const finalAmount = basePrice + taxes;
    
            console.log('💰 Price breakdown:', {
                basePrice,
                markupAmount,
                serviceFee,
                taxes, // This is markup + service fee combined
                finalAmount,
                original_amount: item.original_amount,
                final_amount: item.final_amount,
                markup_percentage: item.markup_percentage
            });
    
            const body: Record<string, any> = {
                productType,
                provider: provider || item.provider || 'Unknown',
                currency: offerCurrency,
                basePrice: basePrice,
                passengerInfo: {
                    firstName: passenger.firstName,
                    lastName: passenger.lastName,
                    email: passenger.email,
                    phone: passenger.phone,
                },
                bookingData: {}
            };
    
            // Add flight-specific fields if this is a flight booking
            if (productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC') {
                // Include title, gender, and dateOfBirth for flight bookings
                body.passengerInfo = {
                    ...body.passengerInfo,
                    title: passenger.title,
                    gender: passenger.gender,
                    dateOfBirth: passenger.dateOfBirth,
                };
    
                body.bookingData = {
                    offerId: item.realData?.offerId ?? item.id,
                    origin: searchParams?.segments?.[0]?.from ? extractCode(searchParams.segments[0].from) : 'LHR',
                    destination: searchParams?.segments?.[0]?.to ? extractCode(searchParams.segments[0].to) : 'CDG',
                    departureDate: searchParams?.segments?.[0]?.date ?? today(),
                    ...(item.realData?.airline && { airline: item.realData.airline }),
                    ...(item.realData?.flightNumber && { flightNumber: item.realData.flightNumber }),
                    cabinClass: searchParams?.cabinClass ?? 'economy',
                    passengers: searchParams?.passengers ?? 1,
                    // Include pricing breakdown
                    basePrice: basePrice,
                    markup_amount: markupAmount,
                    service_fee: serviceFee,
                    taxes: taxes, // This is the combined amount
                    totalAmount: finalAmount,
                    original_amount: item.original_amount,
                    final_amount: item.final_amount,
                    markup_percentage: item.markup_percentage
                };
            }
            else if (productType === 'HOTEL') {
                body.bookingData = {
                    hotelId: item.id,
                    offerId: item.realData?.offerId ?? item.id,
                    hotelName: item.title || 'Unknown Hotel',
                    checkInDate: searchParams?.checkInDate ?? today(),
                    checkOutDate: searchParams?.checkOutDate ?? tomorrow(),
                    guests: searchParams?.adults ?? 1,
                    rooms: searchParams?.rooms ?? 1,
                    location: item.subtitle ?? searchParams?.location ?? 'Lagos',
                    // Include pricing breakdown
                    basePrice: basePrice,
                    markup_amount: markupAmount,
                    service_fee: serviceFee,
                    taxes: taxes, // This is the combined amount
                    totalAmount: finalAmount,
                    original_amount: item.original_amount,
                    final_amount: item.final_amount,
                    markup_percentage: item.markup_percentage
                };
            }
            else if (productType === 'CAR_RENTAL') {
                const pickupDt = searchParams?.pickupDateTime ?? item.realData?.pickupDateTime ?? new Date().toISOString().slice(0, 19);
                const dropoffDt = searchParams?.dropoffDateTime ?? item.realData?.dropoffDateTime ?? new Date(Date.now() + 86400000).toISOString().slice(0, 19);
                body.bookingData = {
                    offerId: item.realData?.offerId ?? item.id,
                    pickupLocationCode: searchParams?.pickupLocationCode ?? item.realData?.pickupLocation ?? 'LHR',
                    pickupDateTime: pickupDt,
                    dropoffLocationCode: searchParams?.dropoffLocationCode ?? searchParams?.pickupLocationCode ?? item.realData?.dropoffLocation ?? 'LHR',
                    dropoffDateTime: dropoffDt,
                    vehicleType: item.realData?.vehicleType ?? item.title ?? 'Standard Car',
                    // Include pricing breakdown
                    basePrice: basePrice,
                    markup_amount: markupAmount,
                    service_fee: serviceFee,
                    taxes: taxes, // This is the combined amount
                    totalAmount: finalAmount,
                    original_amount: item.original_amount,
                    final_amount: item.final_amount,
                    markup_percentage: item.markup_percentage
                };
            }
    
            // Log the request body for debugging
            console.log('📤 Sending booking request with taxes breakdown:', {
                basePrice,
                markupAmount,
                serviceFee,
                taxes: taxes, // This is markup + service fee
                finalAmount
            });
    
            // Log the request body for debugging
            console.log('Sending booking request:', JSON.stringify(body, null, 2));
    
            const endpoint = isGuest ? '/api/v1/bookings/guest' : '/api/v1/bookings';
            const headers: Record<string, string> = { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            if (!isGuest) {
                const token = getStoredAuthToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
    
            const res = await fetch(`${BASE}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });
    
            // Try to parse the response even if it's not ok
            let data: any;
            try {
                data = await res.json();
            } catch (e) {
                // If response is not JSON, get text
                const text = await res.text();
                console.error('Non-JSON response:', text);
                throw new Error(`Server returned ${res.status}: ${text.substring(0, 100)}`);
            }
            
            if (!res.ok) {
                const msg = data.message ?? data.error ?? 'Booking creation failed';
                console.error('Booking creation failed:', data);
                
                // Check for specific error messages
                if (typeof msg === 'string') {
                    if (msg.includes('No active markup configuration found')) {
                        const friendly = 'Booking isn’t available for this currency right now. Try another currency or contact support.';
                        setError(friendly);
                        throw new Error(friendly);
                    }
                    
                    if (msg.includes('dateOfBirth')) {
                        throw new Error('Date of birth is required for flight bookings. Please fill in all required fields.');
                    }
                }
                
                throw new Error(msg);
            }
    
            const created: Booking = data.data ?? data;
            
            if (!created?.id) {
                console.error('Invalid booking response:', data);
                throw new Error('Invalid response from server - missing booking ID');
            }
            
            setBooking(created);
            return created;
        }
        catch (err: any) {
            const message = err?.message ?? 'Booking failed';
            console.error('Booking creation error:', err);
            setError(message);
            throw err;
        }
        finally {
            setIsCreating(false);
        }
    }, [BASE]);

    const createPaymentIntent = useCallback(async (bookingId: string, isGuest: boolean, guestEmail?: string, bookingReference?: string, voucherCode?: string) => {
        const headers: Record<string, string> = { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        let endpoint: string;
        let body: Record<string, any>;
        
        if (isGuest) {
            endpoint = '/api/v1/payments/stripe/create-intent/guest';
            body = { bookingReference: bookingReference!, email: guestEmail! };
        }
        else {
            endpoint = '/api/v1/payments/stripe/create-intent';
            body = {
                bookingId,
                ...(voucherCode && { voucherCode }),
            };
            const token = getStoredAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        const res = await fetch(`${BASE}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message ?? 'Failed to create payment intent');
        }
        if (!data.clientSecret) {
            throw new Error('No client secret received');
        }
        return data as {
            clientSecret: string;
            paymentIntentId: string;
            voucherApplied?: any;
        };
    }, [BASE]);

    const createAmadeusHotelBooking = useCallback(async (item: ExtendedSearchResult, passenger: PassengerInfo, card: {
        cardNumber: string;
        expiryMonth: string;
        expiryYear: string;
        cvc: string;
        holderName?: string;
    } | undefined, isGuest: boolean): Promise<Booking> => {
        setIsCreating(true);
        setError(null);
        
        try {
            const offerId = item.realData?.offerId ?? item.id;
            if (!offerId) throw new Error('Missing offer ID');
            
            // Format payment info if card is provided
            const paymentInfo = card ? {
                cardNumber: card.cardNumber.replace(/\s+/g, ''),
                expiryDate: `${card.expiryYear}-${card.expiryMonth.padStart(2, '0')}`,
                holderName: card.holderName || `${passenger.firstName} ${passenger.lastName}`,
                securityCode: card.cvc
            } : undefined;
    
            // Calculate price breakdown for Amadeus hotel
            const basePrice = item.realData?.price || 0;
            const markupAmount = parseFloat(item.markup_amount || '0');
            const taxes = markupAmount; // Combine markup as taxes
            
            const response = await api.createAmadeusHotelBooking(
                offerId,
                {
                    ...item,
                    basePrice,
                    taxes,
                    totalAmount: basePrice + taxes
                }, // hotelData with price breakdown
                {
                    firstName: passenger.firstName,
                    lastName: passenger.lastName,
                    email: passenger.email,
                    phone: passenger.phone
                },
                paymentInfo,
                isGuest // Tells API to use guest endpoint
            );
    
            if (!response.success) {
                throw new Error(response.message || 'Booking failed');
            }
    
            // Extract booking from response
            const raw = response.data?.booking ?? response.booking ?? response.data ?? response;
            
            if (!raw?.id) {
                throw new Error('Invalid response from server - missing booking ID');
            }
    
            // ✅ FIX: Store taxes in bookingData instead of at the top level
            const booking: Booking = {
                id: raw.id,
                reference: raw.reference,
                status: raw.status || 'PENDING',
                paymentStatus: raw.paymentStatus || 'PENDING',
                productType: 'HOTEL',
                provider: 'AMADEUS',
                basePrice: basePrice,
                totalAmount: basePrice + taxes,
                currency: raw.currency || (item.realData?.currency ?? 'GBP').toUpperCase(),
                // Store taxes in bookingData
                bookingData: {
                    ...raw,
                    taxes: taxes,
                    markup_amount: item.markup_amount,
                    markup_percentage: item.markup_percentage,
                    basePrice: basePrice,
                    finalAmount: basePrice + taxes
                },
                passengerInfo: {
                    firstName: passenger.firstName,
                    lastName: passenger.lastName,
                    email: passenger.email,
                    phone: passenger.phone,
                },
                createdAt: raw.createdAt || new Date().toISOString(),
            };
    
            console.log('✅ Booking created successfully:', booking);
            
            setBooking(booking);
            return booking;
            
        } catch (err: any) {
            console.error('❌ Booking creation failed:', err);
            setError(err.message);
            throw err;
        } finally {
            setIsCreating(false);
        }
    }, [BASE]);

    const chargeMarginAmadeusHotel = useCallback(async (booking: Booking, isGuest: boolean): Promise<Booking> => {
        setError(null);
        const headers: Record<string, string> = { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (!isGuest) {
            const token = getStoredAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        const url = isGuest
            ? `${BASE}/api/v1/payments/amadeus-hotel/charge-margin/guest`
            : `${BASE}/api/v1/payments/amadeus-hotel/charge-margin`;
        
        const body = isGuest
            ? { bookingReference: booking.reference, email: booking.passengerInfo.email }
            : { bookingId: booking.id };
        
        const res = await fetch(url, { 
            method: 'POST', 
            headers, 
            body: JSON.stringify(body) 
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            const msg = data.message ?? data.error ?? 'Payment could not be completed';
            const err = new Error(msg) as Error & {
                status?: number;
            };
            err.status = res.status;
            throw err;
        }
        
        const updated = data.booking ?? data.data?.booking ?? data.data;
        if (updated) {
            setBooking(updated);
            return updated as Booking;
        }
        return { ...booking, status: 'CONFIRMED', paymentStatus: 'COMPLETED' };
    }, [BASE]);

    const pollBookingStatus = useCallback(async (bookingId: string, maxAttempts = 10, intervalMs = 3000, guestParams?: {
        reference: string;
        email: string;
    }): Promise<Booking> => {
        const token = getStoredAuthToken();
        const isGuest = !token && guestParams?.reference && guestParams?.email;
        
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise((r) => setTimeout(r, intervalMs));
            
            try {
                let data: any;
                if (isGuest) {
                    data = await publicRequest<any>(`/api/v1/bookings/public/by-id/${encodeURIComponent(bookingId)}?reference=${encodeURIComponent(guestParams!.reference)}&email=${encodeURIComponent(guestParams!.email)}`, { method: 'GET' });
                }
                else {
                    const headers: Record<string, string> = {
                        'Accept': 'application/json'
                    };
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                    const res = await fetch(`${BASE}/api/v1/bookings/${bookingId}`, { headers });
                    if (!res.ok) continue;
                    data = await res.json();
                }
                
                const b: Booking = data?.data?.booking ?? data?.data ?? data?.booking ?? data;
                if (b?.status === 'CONFIRMED' || b?.paymentStatus === 'COMPLETED') {
                    setBooking(b);
                    return b;
                }
            }
            catch { }
        }
        throw new Error('Booking confirmation timed out');
    }, [BASE]);

    const reset = useCallback(() => {
        setBooking(null);
        setError(null);
    }, []);

    return {
        booking,
        isCreating,
        error,
        createBooking,
        createAmadeusHotelBooking,
        chargeMarginAmadeusHotel,
        createPaymentIntent,
        pollBookingStatus,
        reset,
    };
}

function extractCode(s: string) {
    const m = s.match(/\(([A-Z]{3})\)/);
    return m?.[1] ?? s.substring(0, 3).toUpperCase();
}

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().split('T')[0];
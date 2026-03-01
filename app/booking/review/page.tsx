'use client';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/hooks/useBooking';
import { config } from '@/lib/config';
import ReviewTrip from '@/components/ReviewTrip';
import PaymentModal from '@/components/payment/PaymentModal';
import AmadeusHotelPaymentModal from '@/components/payment/AmadeusHotelPaymentModal';
import type { Booking, PassengerInfo, SearchResult } from '@/lib/types';

// Extend the SearchResult type to include pricing fields
interface ExtendedSearchResult extends SearchResult {
    // Flight fields
    final_amount?: string;
    original_amount?: string;
    
    // Car rental & Hotel fields
    final_price?: string;
    original_price?: string;
    base_price?: string;
    
    // Common fields
    original_currency?: string;
    markup_percentage?: number;
    markup_amount?: string;
    service_fee?: string;
    currency?: string;
    
    realData?: {
        offerId?: string;
        finalPrice?: number;
        price?: number;
        currency?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

function isAmadeusHotel(item: ExtendedSearchResult): boolean {
    const rawType = (item?.type ?? '').toLowerCase();
    if (!rawType.includes('hotel')) return false;
    const hasOffer = !!item.realData?.offerId;
    const hasPrice = typeof item.realData?.finalPrice === 'number' || typeof item.realData?.price === 'number';
    return hasOffer && hasPrice;
}

export default function BookingReviewPage() {
    const router = useRouter();
    const { selectedItem, searchParams, persistSelectionForReturn } = useSearch();
    const { isLoggedIn, user } = useAuth();
    const { createBooking, createAmadeusHotelBooking, isCreating } = useBooking();
    const isMerchantPaymentModel = config.paymentModel === 'merchant';
    
    const [booking, setBooking] = useState<Booking | null>(null);
    const [showPayment, setShowPayment] = useState(false);
    const [showAmadeusPayment, setShowAmadeusPayment] = useState(false);
    const [pendingPassengerInfo, setPendingPassengerInfo] = useState<PassengerInfo | null>(null);
    const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | undefined>(undefined);
    
    // ✅ State for enhanced item with calculated taxes
    const [enhancedItem, setEnhancedItem] = useState<ExtendedSearchResult | null>(null);

    const redirectToLogin = () => {
        persistSelectionForReturn();
        sessionStorage.setItem('authReturnTo', '/booking/review');
        router.push('/login');
    };

    // ✅ Helper function to safely extract price value
    const extractPriceValue = (price: any): number => {
        if (!price) return 0;
        if (typeof price === 'number') return price;
        if (typeof price === 'string') {
            return parseFloat(price.replace(/[^\d.]/g, '')) || 0;
        }
        return 0;
    };

    // ✅ Determine product type
    const getProductType = (item: ExtendedSearchResult): 'flight' | 'hotel' | 'car' => {
        const type = item.type?.toLowerCase() || '';
        if (type.includes('hotel')) return 'hotel';
        if (type.includes('car')) return 'car';
        return 'flight';
    };

    // ✅ Get price fields based on product type
    const getPriceFields = (item: ExtendedSearchResult) => {
        const productType = getProductType(item);
        
        // For flights
        if (productType === 'flight') {
            return {
                original: item.original_amount,
                final: item.final_amount,
                base: item.original_amount
            };
        }
        
        // For hotels and car rentals
        return {
            original: item.original_price,
            final: item.final_price,
            base: item.base_price || item.original_price
        };
    };

// In BookingReviewPage.tsx, update the useEffect that creates enhancedItem

useEffect(() => {
    if (selectedItem) {
        const item = selectedItem as ExtendedSearchResult;
        const productType = getProductType(item);
        const priceFields = getPriceFields(item);
        
        // Safely extract price value
        const priceValue = extractPriceValue(item.price);
        
        // ✅ CRITICAL: Get base price from the correct field
        let basePrice = 0;
        
        // For car rentals and hotels
        if (productType === 'car' || productType === 'hotel') {
            // Try original_price first, then base_price
            basePrice = parseFloat(item.original_price || item.base_price || '0');
            console.log(`💰 ${productType} - Using original_price/base_price:`, {
                original_price: item.original_price,
                base_price: item.base_price,
                parsed: basePrice
            });
        } else {
            // For flights
            basePrice = parseFloat(item.original_amount || '0') || priceValue;
        }
        
        // Get markup and service fee
        const markupAmount = parseFloat(item.markup_amount || '0');
        const serviceFee = parseFloat(item.service_fee || '0');
        
        // Calculate taxes (markup + service fee)
        const taxes = markupAmount + serviceFee;
        
        // Get final amount
        let finalAmount = 0;
        if (productType === 'car' || productType === 'hotel') {
            finalAmount = parseFloat(item.final_price || '0');
        } else {
            finalAmount = parseFloat(item.final_amount || '0');
        }
        
        // If final amount is not available, calculate it
        if (!finalAmount && basePrice > 0) {
            finalAmount = basePrice + taxes;
        }
        
        console.log(`💰 REVIEW PAGE - ${productType} final breakdown:`, {
            basePrice,
            markupAmount,
            serviceFee,
            taxes,
            finalAmount
        });
        
        // Create enhanced item with calculated values
        const enhanced = {
            ...item,
            // Preserve original API fields
            original_amount: item.original_amount,
            original_price: item.original_price,
            base_price: item.base_price,
            markup_amount: item.markup_amount,
            service_fee: item.service_fee,
            final_amount: item.final_amount,
            final_price: item.final_price,
            // Add calculated fields for ReviewTrip
            calculatedBasePrice: basePrice,
            calculatedMarkup: markupAmount,
            calculatedServiceFee: serviceFee,
            calculatedTaxes: taxes,
            calculatedTotal: finalAmount
        };
        
        setEnhancedItem(enhanced);
    }
}, [selectedItem]);

    if (!selectedItem) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">No booking to review</h1>
                <p className="text-gray-600 mb-8">Please select an item from search to continue.</p>
                <button onClick={() => router.push('/search')} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg">
                    Back to search
                </button>
            </div>
        );
    }

    // Cast selectedItem to ExtendedSearchResult to access pricing fields
    const extendedItem = selectedItem as ExtendedSearchResult;
    const useAmadeusFlow = isAmadeusHotel(extendedItem);
    const productType = getProductType(extendedItem);

    const handleProceedToPayment = async (passengerInfo: PassengerInfo, voucherCode?: string) => {
        const isGuest = !isLoggedIn;
    
        const isFlight = extendedItem?.type?.toLowerCase().includes('flight') || 
                        extendedItem?.type?.toLowerCase().includes('duffel');
    
        if (isFlight) {
            if (!passengerInfo.dateOfBirth) {
                toast.error('Date of birth is required for flight bookings');
                return;
            }
            if (!passengerInfo.title) {
                toast.error('Title is required for flight bookings');
                return;
            }
            if (!passengerInfo.gender) {
                toast.error('Gender is required for flight bookings');
                return;
            }
    
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(passengerInfo.dateOfBirth)) {
                toast.error('Date of birth must be in YYYY-MM-DD format');
                return;
            }
    
            const dob = new Date(passengerInfo.dateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - dob.getFullYear();
            if (age < 2) {
                toast.error('Passenger must be at least 2 years old');
                return;
            }
        }
        
        if (useAmadeusFlow && isMerchantPaymentModel) {
            try {
                // Step 1: Create the booking first (without payment)
                console.log('📝 Creating Amadeus hotel booking...');
                
                // Calculate combined taxes for Amadeus hotel (Markup + Service fee)
                const markupAmount = parseFloat(extendedItem.markup_amount || '0');
                const serviceFee = parseFloat(extendedItem.service_fee || '0');
                const combinedTaxes = markupAmount + serviceFee;
                
                console.log('💰 Amadeus hotel price breakdown:', {
                    basePrice: parseFloat(extendedItem.original_price || '0'),
                    markupAmount,
                    serviceFee,
                    taxes: combinedTaxes,
                    totalAmount: (parseFloat(extendedItem.original_price || '0') + combinedTaxes)
                });
                
                const newBooking = await createAmadeusHotelBooking(extendedItem, passengerInfo, undefined, isGuest);
                
                console.log('✅ Booking created:', newBooking);
                
                // Step 2: Store booking and show Amadeus payment modal
                setBooking(newBooking);
                setAppliedVoucherCode(voucherCode);
                setShowPayment(true);
            }
            catch (err: any) {
                console.error('❌ Booking creation failed:', err);
                toast.error(err?.message ?? 'We couldn’t create your booking. Please check your details and try again.');
            }
            return;
        }
        
        if (useAmadeusFlow) {
            setPendingPassengerInfo(passengerInfo);
            setAppliedVoucherCode(voucherCode);
            setShowAmadeusPayment(true);
            return;
        }
        
        try {
            // For flights and other non-Amadeus items
            const priceFields = getPriceFields(extendedItem);
            const priceValue = extractPriceValue(extendedItem.price);
            
            // Get base price (original amount/price)
            const basePrice = parseFloat(priceFields.original || priceFields.base || '0') || priceValue;
            
            // Calculate markup and service fee
            const markupAmount = parseFloat(extendedItem.markup_amount || '0');
            const serviceFee = parseFloat(extendedItem.service_fee || '0');
            
            // Calculate combined taxes (Markup + Service fee)
            const combinedTaxes = markupAmount + serviceFee;
            
            // Final amount = basePrice + combinedTaxes
            const finalAmount = parseFloat(priceFields.final || '0') || (basePrice + combinedTaxes);
            
            console.log(`💰 ${productType} booking price breakdown (payment):`, {
                original: priceFields.original,
                base: priceFields.base,
                final: priceFields.final,
                basePrice: basePrice.toFixed(2),
                markupAmount: markupAmount.toFixed(2),
                serviceFee: serviceFee.toFixed(2),
                taxes: combinedTaxes.toFixed(2),
                finalAmount: finalAmount.toFixed(2),
                markup_percentage: extendedItem.markup_percentage
            });
    
            // Create booking with combined taxes
            const newBooking = await createBooking(
                extendedItem, 
                searchParams, 
                passengerInfo, 
                isGuest,
                { 
                    taxes: combinedTaxes,
                    basePrice: basePrice,
                    finalAmount: finalAmount
                }
            );
            
            console.log('✅ Booking created:', newBooking);
            
            // Set the booking state so ReviewTrip can display the exact amounts
            setBooking(newBooking);
            setAppliedVoucherCode(voucherCode);
            setShowPayment(true);
        }
        catch (err: any) {
            console.error('❌ Booking creation failed:', err);
            toast.error(err.message ?? 'We couldn’t create your booking. Please check your details and try again.');
        }
    };
    
    const handlePaymentSuccess = (confirmed: Booking) => {
        setShowPayment(false);
        setShowAmadeusPayment(false);
        setPendingPassengerInfo(null);
        router.push(`/booking/success?id=${confirmed.id}&ref=${confirmed.reference}`);
    };

    return (
        <>
            <ReviewTrip 
                // ✅ Pass enhanced item with pre-calculated taxes
                item={enhancedItem || selectedItem} 
                searchParams={searchParams} 
                isLoggedIn={isLoggedIn} 
                user={user} 
                isCreating={isCreating} 
                onBack={() => router.back()} 
                onProceedToPayment={handleProceedToPayment} 
                onSignInRequired={redirectToLogin}
                createdBooking={booking} 
            />

            {showPayment && booking && (
                <PaymentModal 
                    booking={booking} 
                    isGuest={!isLoggedIn} 
                    voucherCode={appliedVoucherCode} 
                    onSuccess={handlePaymentSuccess} 
                    onCancel={() => setShowPayment(false)}
                />
            )}

            {showAmadeusPayment && selectedItem && pendingPassengerInfo && (
                <AmadeusHotelPaymentModal 
                    item={selectedItem} 
                    passengerInfo={pendingPassengerInfo} 
                    isGuest={!isLoggedIn} 
                    voucherCode={appliedVoucherCode} 
                    onSuccess={handlePaymentSuccess} 
                    onCancel={() => {
                        setShowAmadeusPayment(false);
                        setPendingPassengerInfo(null);
                    }} 
                    onSignInRequired={redirectToLogin}
                />
            )}
        </>
    );
}
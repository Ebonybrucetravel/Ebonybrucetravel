"use client";
import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSearch } from "@/context/SearchContext";
import { useAuth } from "@/context/AuthContext";
import { useBooking } from "@/hooks/useBooking";
import { useLanguage } from "@/context/LanguageContext";
import { config } from "@/lib/config";
import ReviewTrip from "@/components/ReviewTrip";
import PaymentModal from "@/components/payment/PaymentModal";
import AmadeusHotelPaymentModal from "@/components/payment/AmadeusHotelPaymentModal";
import type { Booking, PassengerInfo, SearchResult } from "@/lib/types";

const LoadingSpinner = ({ message }: { message?: string }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
      <div className="w-16 h-16 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-700 font-medium">{message || 'Processing your booking...'}</p>
      <p className="text-sm text-gray-500 mt-2">Please wait, this may take a moment</p>
    </div>
  </div>
);

function extractOfferIdFromHotel(item: any): string {
  if (!item) return '';
  
  console.log('🔍 extractOfferIdFromHotel - Input:', {
    hasOfferId: !!item.offerId,
    hasOffer_id: !!item.offer_id,
    hasHotelData: !!item.hotelData,
    hasRealData: !!item.realData,
    hasOffers: !!(item.offers?.length),
    itemKeys: Object.keys(item),
  });
  
  // Check all possible locations for offer ID
  const sources = [
    item.offerId,
    item.offer_id,
    item.realData?.offerId,
    item.hotelData?.offerId,
    item.offers?.[0]?.id,
    item.hotelData?.offers?.[0]?.id,
    item.realData?.offers?.[0]?.id,
    // Check if the id itself is an offer ID
    (typeof item.id === 'string' && (item.id.startsWith('offer_') || item.id.includes('offer'))) ? item.id : null,
    (typeof item.hotelId === 'string' && (item.hotelId.startsWith('offer_') || item.hotelId.includes('offer'))) ? item.hotelId : null,
  ];
  
  for (const source of sources) {
    if (source && typeof source === 'string' && source.length > 0) {
      console.log('✅ Found offer ID:', source);
      return source;
    }
  }
  
  console.warn('⚠️ No offer ID found in hotel item');
  return '';
}



interface ExtendedSearchResult extends SearchResult {
  final_amount?: string;
  original_amount?: string;
  final_price?: string;
  original_price?: string;
  base_price?: string;
  original_currency?: string;
  markup_percentage?: number;
  markup_amount?: string;
  service_fee?: string;
  service_fee_percentage?: number;
  conversion_fee?: string;
  conversion_fee_percentage?: number;
  taxes?: string;
  currency?: string;
  originalPriceAmount?: number;
  originalPriceCurrency?: string;
  calculatedBasePrice?: number;
  calculatedMarkup?: number;
  calculatedServiceFee?: number;
  calculatedTaxes?: number;
  calculatedTotal?: number;
  price_after_conversion?: string;
  priceObject?: { total?: string; amount?: string; currency?: string };
  realData?: {
    offerId?: string;
    finalPrice?: number;
    price?: number;
    currency?: string;
    [key: string]: any;
  };
  isDomestic?: boolean;
  isWakanow?: boolean;
  selectData?: string;
  terms_and_conditions?: {
    TermsAndConditions: string[];
    TermsAndConditionImportantNotice: string;
  } | null;
  bookingId?: string;
  offer_request_id?: string;
  offer_id?: string;
  connection_code?: string;
  token?: string;
  session_id?: string;
  booking_token?: string;
  totalAmount?: number;
  markupAmount?: number;
  serviceFee?: number;
  basePrice?: number;
  total_price?: string;
  TotalPrice?: string;
  totalFare?: string;
  GrandTotal?: string;
  grandTotal?: string;
  amount?: string;
  rawPrice?: number;
  breakdown?: string;
  priceBreakdown?: {
    basePrice: number;
    markupAmount: number;
    markupPercentage: number;
    serviceFee: number;
    serviceFeePercentage: number;
    taxes: number;
    taxPercentage: number;
    totalAmount: number;
    currency: string;
    breakdown?: string;
  };
  custom_messages?: Array<{
    Title: string;
    Message: string;
    SeverityLevel: 'High' | 'Medium' | 'Low';
  }>;
  [key: string]: any;
}

// ============================================================
// ✅ Helper to safely get breakdown
// ============================================================
function getBreakdown(pb: any): string {
  if (!pb) return '';
  return pb.breakdown || `${pb.basePrice || 0} + ${pb.markupAmount || 0} (${pb.markupPercentage || 10}% markup) + ${pb.serviceFee || 0} (${pb.serviceFeePercentage || 5}% service fee) = ${pb.totalAmount || 0}`;
}

// ============================================================
// ✅ WAKANOW: NO CALCULATIONS - Just pass through backend data (UNCHANGED)
// ============================================================
function processItemPrices(item: ExtendedSearchResult | null, currencyCode: string = 'NGN'): ExtendedSearchResult | null {
  if (!item) return null;
  
  console.log('🔍 processItemPrices - Input:', {
    id: item.id,
    isWakanow: item.isWakanow,
    provider: item.provider,
    hasPriceBreakdown: !!item.priceBreakdown,
    priceBreakdown: item.priceBreakdown,
    basePrice: item.basePrice,
    totalAmount: item.totalAmount,
    final_amount: item.final_amount,
    final_price: item.final_price,
    price: item.price,
  });

  // ============================================================
  // ✅ WAKANOW FLIGHTS - NO CALCULATIONS, JUST USE BACKEND DATA (UNCHANGED)
  // ============================================================
  if (item.isWakanow) {
    // ✅ PRIORITY 1: Use final_amount from backend (most common)
    if (item.final_amount && parseFloat(item.final_amount) > 0) {
      const totalAmount = parseFloat(item.final_amount);
      const displayCurrency = item.currency || 'NGN';
      const formattedPrice = `${displayCurrency} ${totalAmount.toFixed(2)}`;
      
      console.log('💰 processItemPrices - Wakanow: Using final_amount (NO CALCULATIONS):', {
        final_amount: item.final_amount,
        totalAmount,
        displayCurrency,
      });
      
      return {
        ...item,
        custom_messages: item.custom_messages || [],
        price: formattedPrice,
        displayPrice: formattedPrice,
        totalPrice: formattedPrice,
        currency: displayCurrency,
        rawPrice: totalAmount,
        final_amount: item.final_amount,
        final_price: totalAmount.toString(),
        service_fee: (item.serviceFee || 0).toString(),
        base_price: (item.basePrice || 0).toString(),
        markup_amount: (item.markupAmount || 0).toString(),
        calculatedBasePrice: item.basePrice || 0,
        calculatedServiceFee: item.serviceFee || 0,
        calculatedMarkup: item.markupAmount || 0,
        calculatedTaxes: (item.markupAmount || 0) + (item.serviceFee || 0),
        calculatedTotal: totalAmount,
        markup_percentage: item.markupPercentage || 10,
        service_fee_percentage: item.serviceFeePercentage || 5,
        basePrice: item.basePrice || 0,
        markupAmount: item.markupAmount || 0,
        serviceFee: item.serviceFee || 0,
        taxes: ((item.markupAmount || 0) + (item.serviceFee || 0)).toString(),
        totalAmount: totalAmount,
        breakdown: `Base fare + taxes = ${formattedPrice}`,
      };
    }
    
    // ✅ PRIORITY 2: Use priceBreakdown from backend
    if (item.priceBreakdown) {
      const pb = item.priceBreakdown as {
        basePrice: number;
        markupAmount: number;
        markupPercentage: number;
        serviceFee: number;
        serviceFeePercentage: number;
        taxes: number;
        taxPercentage: number;
        totalAmount: number;
        currency: string;
        breakdown?: string;
      };
      const displayCurrency = pb.currency || 'NGN';
      const formattedPrice = `${displayCurrency} ${pb.totalAmount.toFixed(2)}`;
      
      console.log('💰 processItemPrices - Wakanow: Using backend priceBreakdown (NO CALCULATIONS):', pb);
      
      return {
        ...item,
        custom_messages: item.custom_messages || [],
        price: formattedPrice,
        displayPrice: formattedPrice,
        totalPrice: formattedPrice,
        currency: displayCurrency,
        rawPrice: pb.totalAmount,
        final_amount: pb.totalAmount.toString(),
        final_price: pb.totalAmount.toString(),
        service_fee: pb.serviceFee.toString(),
        base_price: pb.basePrice.toString(),
        markup_amount: pb.markupAmount.toString(),
        calculatedBasePrice: pb.basePrice,
        calculatedServiceFee: pb.serviceFee,
        calculatedMarkup: pb.markupAmount,
        calculatedTaxes: pb.taxes,
        calculatedTotal: pb.totalAmount,
        markup_percentage: pb.markupPercentage,
        service_fee_percentage: pb.serviceFeePercentage,
        basePrice: pb.basePrice,
        markupAmount: pb.markupAmount,
        serviceFee: pb.serviceFee,
        taxes: pb.taxes.toString(),
        totalAmount: pb.totalAmount,
        breakdown: getBreakdown(pb),
      };
    }
    
    // ✅ PRIORITY 3: Use direct fields from backend
    if (item.basePrice !== undefined && item.totalAmount !== undefined && item.totalAmount > 0) {
      const displayCurrency = item.currency || 'NGN';
      const formattedPrice = `${displayCurrency} ${item.totalAmount.toFixed(2)}`;
      const markupAmt = item.markupAmount || 0;
      const serviceFeeAmt = item.serviceFee || 0;
      
      console.log('💰 processItemPrices - Wakanow: Using backend direct fields (NO CALCULATIONS):', {
        basePrice: item.basePrice,
        markupAmount: markupAmt,
        serviceFee: serviceFeeAmt,
        totalAmount: item.totalAmount,
      });
      
      return {
        ...item,
        custom_messages: item.custom_messages || [],
        price: formattedPrice,
        displayPrice: formattedPrice,
        totalPrice: formattedPrice,
        currency: displayCurrency,
        rawPrice: item.totalAmount,
        final_amount: item.totalAmount.toString(),
        final_price: item.totalAmount.toString(),
        service_fee: serviceFeeAmt.toString(),
        base_price: (item.basePrice || 0).toString(),
        markup_amount: markupAmt.toString(),
        calculatedBasePrice: item.basePrice || 0,
        calculatedServiceFee: serviceFeeAmt,
        calculatedMarkup: markupAmt,
        calculatedTaxes: markupAmt + serviceFeeAmt,
        calculatedTotal: item.totalAmount || 0,
        markup_percentage: item.markupPercentage || 10,
        service_fee_percentage: item.serviceFeePercentage || 5,
        basePrice: item.basePrice || 0,
        markupAmount: markupAmt,
        serviceFee: serviceFeeAmt,
        taxes: (markupAmt + serviceFeeAmt).toString(),
        totalAmount: item.totalAmount || 0,
        breakdown: `${item.basePrice || 0} + ${markupAmt} (${item.markupPercentage || 10}% markup) + ${serviceFeeAmt} (${item.serviceFeePercentage || 5}% service fee) = ${item.totalAmount || 0}`,
      };
    }
    
    // ✅ PRIORITY 4: Parse from price string
    if (item.price && typeof item.price === 'string') {
      const parsed = parseFloat(item.price.replace(/[^0-9.]/g, ''));
      if (parsed > 0) {
        const displayCurrency = item.currency || 'NGN';
        const formattedPrice = `${displayCurrency} ${parsed.toFixed(2)}`;
        
        console.log('💰 processItemPrices - Wakanow: Parsed from price string:', {
          price: item.price,
          parsed,
        });
        
        return {
          ...item,
          custom_messages: item.custom_messages || [],
          price: formattedPrice,
          displayPrice: formattedPrice,
          totalPrice: formattedPrice,
          currency: displayCurrency,
          rawPrice: parsed,
          final_amount: parsed.toString(),
          final_price: parsed.toString(),
          totalAmount: parsed,
          calculatedTotal: parsed,
          markup_percentage: item.markupPercentage || 10,
          service_fee_percentage: item.serviceFeePercentage || 5,
          breakdown: `Total fare: ${formattedPrice}`,
        };
      }
    }
    
    console.warn('⚠️ processItemPrices - Wakanow: No backend price data found!', item);
    return item;
  }


  const isHotel = item.type?.toLowerCase() === 'hotels' || 
                  item.hotelId || 
                  item.hotel ||
                  item.hotelName ||
                  item.selectedRoomData ||
                  item.selectedRoomType;

  if (isHotel) {
    console.log('🏨 processItemPrices - Hotel detected');
    
    let totalAmount = 0;
    
    // Try totalAmount first (most reliable for selected room)
    if (item.totalAmount && item.totalAmount > 0) {
      totalAmount = item.totalAmount;
    }
    // Try final_amount
    else if (item.final_amount) {
      totalAmount = parseFloat(item.final_amount);
    }
    // Try final_price
    else if (item.final_price) {
      totalAmount = parseFloat(item.final_price as string);
    }
    // Try originalPriceAmount
    else if (item.originalPriceAmount && item.originalPriceAmount > 0) {
      totalAmount = item.originalPriceAmount;
    }
    // Try price string
    else if (item.price && typeof item.price === 'string') {
      const parsed = parseFloat(item.price.replace(/[^0-9.]/g, ''));
      if (parsed > 0) {
        totalAmount = parsed;
      }
    }
    // Try rawPrice
    else if (item.rawPrice) {
      totalAmount = item.rawPrice;
    }
    // Try priceBreakdown
    else if (item.priceBreakdown?.totalAmount) {
      totalAmount = item.priceBreakdown.totalAmount;
    }
    
    if (totalAmount > 0) {
      const displayCurrency = item.currency || item.originalPriceCurrency || item.selectedCurrency || currencyCode || 'NGN';
      const formattedPrice = `${displayCurrency} ${totalAmount.toFixed(2)}`;
      const basePrice = totalAmount / 1.15;
      const markupAmount = totalAmount * 0.10;
      const serviceFee = 5000;
      
      console.log('🏨 Hotels: Created price breakdown from selected room:', {
        totalAmount,
        displayCurrency,
        basePrice,
        markupAmount,
        serviceFee,
        selectedRoomType: item.selectedRoomType || item.selectedRoomData?.type,
        hasSelectedRoomData: !!item.selectedRoomData,
      });
      
      return {
        ...item,
        custom_messages: item.custom_messages || [],
        price: formattedPrice,
        displayPrice: formattedPrice,
        totalPrice: formattedPrice,
        currency: displayCurrency,
        rawPrice: totalAmount,
        final_amount: totalAmount.toString(),
        final_price: totalAmount.toString(),
        service_fee: serviceFee.toString(),
        base_price: basePrice.toString(),
        markup_amount: markupAmount.toString(),
        calculatedBasePrice: basePrice,
        calculatedServiceFee: serviceFee,
        calculatedMarkup: markupAmount,
        calculatedTaxes: markupAmount + serviceFee,
        calculatedTotal: totalAmount,
        markup_percentage: 10,
        service_fee_percentage: 0,
        basePrice: basePrice,
        markupAmount: markupAmount,
        serviceFee: serviceFee,
        taxes: (markupAmount + serviceFee).toString(),
        totalAmount: totalAmount,
        breakdown: `Base: ${basePrice.toFixed(2)} + Markup: ${markupAmount.toFixed(2)} + Service Fee: ${serviceFee} = ${totalAmount.toFixed(2)}`,
        priceBreakdown: {
          basePrice: basePrice,
          markupAmount: markupAmount,
          markupPercentage: 10,
          serviceFee: serviceFee,
          serviceFeePercentage: 0,
          taxes: markupAmount + serviceFee,
          taxPercentage: 10,
          totalAmount: totalAmount,
          currency: displayCurrency,
          breakdown: `Base: ${basePrice.toFixed(2)} + Markup: ${markupAmount.toFixed(2)} + Service Fee: ${serviceFee} = ${totalAmount.toFixed(2)}`,
        },
        // ✅ CRITICAL: Preserve the selected room data
        selectedRoomData: item.selectedRoomData,
        selectedRoomType: item.selectedRoomType || item.selectedRoomData?.type,
        roomTypeName: item.roomTypeName || item.selectedRoomData?.name,
      };
    }
    
    console.warn('⚠️ No price found for hotel, returning as is');
    return {
      ...item,
      selectedRoomData: item.selectedRoomData,
      selectedRoomType: item.selectedRoomType,
      roomTypeName: item.roomTypeName,
    };
  }
  // ============================================================
  // ✅ DUFFEL FLIGHTS - NEW: Process Duffel prices (ONLY DUFFEL CHANGE)
  // ============================================================
  const isDuffel = item.provider?.toLowerCase() === 'duffel' || 
                   item.id?.toString().startsWith('off_') ||
                   item.offer_request_id ||
                   item.offer_id;

  if (isDuffel) {
    console.log('💰 processItemPrices - Duffel flight detected');
    
    let totalAmount = 0;
    let displayCurrency = item.currency || currencyCode || 'USD';
    
    // PRIORITY 1: Use priceBreakdown
    if (item.priceBreakdown) {
      const pb = item.priceBreakdown;
      totalAmount = pb.totalAmount || 0;
      displayCurrency = pb.currency || displayCurrency;
      console.log('💰 Duffel: Using priceBreakdown', { totalAmount, displayCurrency });
    }
    
    // PRIORITY 2: Use totalAmount
    if (!totalAmount || totalAmount === 0) {
      totalAmount = item.totalAmount || 0;
      console.log('💰 Duffel: Using totalAmount', { totalAmount });
    }
    
    // PRIORITY 3: Use final_amount
    if (!totalAmount || totalAmount === 0) {
      totalAmount = parseFloat(item.final_amount || '0');
      console.log('💰 Duffel: Using final_amount', { totalAmount });
    }
    
    // PRIORITY 4: Use final_price
    if (!totalAmount || totalAmount === 0) {
      totalAmount = parseFloat(item.final_price || '0');
      console.log('💰 Duffel: Using final_price', { totalAmount });
    }
    
    // PRIORITY 5: Use price string
    if (!totalAmount || totalAmount === 0) {
      if (item.price && typeof item.price === 'string') {
        const parsed = parseFloat(item.price.replace(/[^0-9.]/g, ''));
        if (parsed > 0) {
          totalAmount = parsed;
          console.log('💰 Duffel: Using price string', { totalAmount });
        }
      }
    }
    
    // PRIORITY 6: Use realData price
    if (!totalAmount || totalAmount === 0) {
      totalAmount = item.realData?.price || item.realData?.finalPrice || 0;
      console.log('💰 Duffel: Using realData', { totalAmount });
    }
    
    // PRIORITY 7: Use rawPrice
    if (!totalAmount || totalAmount === 0) {
      totalAmount = item.rawPrice || 0;
      console.log('💰 Duffel: Using rawPrice', { totalAmount });
    }
    
    // ✅ If we have a basePrice but no totalAmount, calculate
    if (totalAmount === 0 && item.basePrice) {
      const markupPct = item.markupPercentage || 10;
      const servicePct = item.serviceFeePercentage || 5;
      const base = item.basePrice;
      const markup = (base * markupPct) / 100;
      const service = (base * servicePct) / 100;
      totalAmount = base + markup + service;
      console.log('💰 Duffel: Calculated from basePrice', { base, markup, service, totalAmount });
    }
    
    // ✅ If still no price, use a default
    if (!totalAmount || totalAmount === 0) {
      totalAmount = 100; // Default fallback
      console.warn('⚠️ Duffel: No price found, using default', { totalAmount });
    }
    
    // ✅ Format the price
    const formattedPrice = `${displayCurrency} ${totalAmount.toFixed(2)}`;
    
    console.log('💰 Duffel: Final price', {
      totalAmount,
      displayCurrency,
      formattedPrice,
    });
    
    return {
      ...item,
      custom_messages: item.custom_messages || [],
      price: formattedPrice,
      displayPrice: formattedPrice,
      totalPrice: formattedPrice,
      currency: displayCurrency,
      rawPrice: totalAmount,
      final_amount: totalAmount.toString(),
      final_price: totalAmount.toString(),
      totalAmount: totalAmount,
      calculatedTotal: totalAmount,
      basePrice: item.basePrice || totalAmount / 1.15,
      markupAmount: item.markupAmount || (totalAmount * 0.10),
      serviceFee: item.serviceFee || (totalAmount * 0.05),
      markup_percentage: item.markupPercentage || 10,
      service_fee_percentage: item.serviceFeePercentage || 5,
      breakdown: `Total fare: ${formattedPrice}`,
    };
  }
  return item;
}

// ============================================================
// ✅ HELPER: Check if item is an Amadeus hotel
// ============================================================
function isAmadeusHotel(item: ExtendedSearchResult): boolean {
  const rawType = (item?.type ?? "").toLowerCase();
  const isHotelType = rawType.includes("hotel");
  if (!isHotelType) return false;
  const hasOfferId = !!item.realData?.offerId;
  const hasHotelId = !!item.id;
  return (hasOfferId || hasHotelId);
}

// ==================== AIRPORT COUNTRY MAPPING (UNCHANGED) ====================
const AIRPORT_COUNTRY_MAP: Record<string, string> = {
  'LOS': 'NG', 'ABV': 'NG', 'PHC': 'NG', 'KAN': 'NG', 'ENU': 'NG',
  'QOW': 'NG', 'BNI': 'NG', 'JOS': 'NG', 'KAD': 'NG', 'YOL': 'NG',
  'ILR': 'NG', 'MDI': 'NG', 'CBQ': 'NG', 'QRW': 'NG', 'SKO': 'NG',
  'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'DFW': 'US', 'DEN': 'US',
  'SFO': 'US', 'SEA': 'US', 'LAS': 'US', 'MCO': 'US', 'EWR': 'US',
  'MIA': 'US', 'BOS': 'US', 'ATL': 'US', 'IAH': 'US', 'PHX': 'US',
  'LGA': 'US', 'DCA': 'US', 'IAD': 'US', 'CLT': 'US', 'MSP': 'US',
  'DTW': 'US', 'FLL': 'US', 'TPA': 'US', 'SAN': 'US', 'PDX': 'US',
  'LHR': 'GB', 'LGW': 'GB', 'MAN': 'GB', 'EDI': 'GB', 'GLA': 'GB',
  'BHX': 'GB', 'BRS': 'GB', 'LTN': 'GB', 'STN': 'GB', 'LCY': 'GB',
  'NCL': 'GB', 'BFS': 'GB', 'ABZ': 'GB',
  'YYZ': 'CA', 'YVR': 'CA', 'YUL': 'CA', 'YYC': 'CA', 'YOW': 'CA',
  'YEG': 'CA', 'YHZ': 'CA', 'YWG': 'CA',
  'DXB': 'AE', 'AUH': 'AE', 'SHJ': 'AE',
  'DEL': 'IN', 'BOM': 'IN', 'BLR': 'IN', 'MAA': 'IN', 'CCU': 'IN',
  'HYD': 'IN', 'COK': 'IN', 'GOI': 'IN',
  'PEK': 'CN', 'PVG': 'CN', 'CAN': 'CN', 'SZX': 'CN', 'CTU': 'CN',
  'HND': 'JP', 'NRT': 'JP', 'KIX': 'JP', 'CTS': 'JP', 'FUK': 'JP',
  'SYD': 'AU', 'MEL': 'AU', 'BNE': 'AU', 'PER': 'AU', 'ADL': 'AU',
  'FRA': 'DE', 'MUC': 'DE', 'BER': 'DE', 'HAM': 'DE', 'CGN': 'DE',
  'DUS': 'DE', 'STR': 'DE',
  'CDG': 'FR', 'ORY': 'FR', 'NCE': 'FR', 'LYS': 'FR', 'MRS': 'FR',
  'JNB': 'ZA', 'CPT': 'ZA', 'DUR': 'ZA', 'PLZ': 'ZA',
  'NBO': 'KE', 'MBA': 'KE',
  'CAI': 'EG', 'HRG': 'EG', 'SSH': 'EG',
  'ACC': 'GH',
  'ADD': 'ET',
  'IST': 'TR', 'SAW': 'TR', 'ESB': 'TR',
  'SIN': 'SG',
  'KUL': 'MY', 'PEN': 'MY',
  'BKK': 'TH', 'HKT': 'TH', 'CNX': 'TH',
  'HAN': 'VN', 'SGN': 'VN', 'DAD': 'VN',
  'MNL': 'PH', 'CEB': 'PH',
  'GRU': 'BR', 'GIG': 'BR', 'BSB': 'BR',
  'MEX': 'MX', 'CUN': 'MX', 'GDL': 'MX',
  'MAD': 'ES', 'BCN': 'ES', 'AGP': 'ES',
  'FCO': 'IT', 'MXP': 'IT', 'VCE': 'IT',
  'AMS': 'NL',
  'ZRH': 'CH', 'GVA': 'CH',
  'BRU': 'BE',
  'VIE': 'AT',
  'ARN': 'SE',
  'OSL': 'NO',
  'CPH': 'DK',
  'DOH': 'QA',
  'MCT': 'OM',
  'BAH': 'BH',
  'KWI': 'KW',
  'JED': 'SA', 'RUH': 'SA', 'DMM': 'SA',
  'AMM': 'JO',
  'TLV': 'IL',
  'BEY': 'LB',
  'KHI': 'PK', 'LHE': 'PK', 'ISB': 'PK',
  'DAC': 'BD',
  'CMB': 'LK',
  'CGK': 'ID', 'DPS': 'ID',
  'ICN': 'KR', 'GMP': 'KR', 'PUS': 'KR',
  'AKL': 'NZ', 'WLG': 'NZ', 'CHC': 'NZ',
  'EZE': 'AR', 'AEP': 'AR',
  'SCL': 'CL',
  'BOG': 'CO',
  'PTY': 'PA',
  'DUB': 'IE', 'SNN': 'IE',
  'LIS': 'PT', 'OPO': 'PT',
  'ATH': 'GR', 'SKG': 'GR',
  'WAW': 'PL', 'KRK': 'PL',
  'PRG': 'CZ',
  'BUD': 'HU',
  'OTP': 'RO',
  'SOF': 'BG',
  'ZAG': 'HR',
  'CMN': 'MA', 'RAK': 'MA',
  'TUN': 'TN',
  'DSS': 'SN', 'DKR': 'SN',
  'ABJ': 'CI',
  'DLA': 'CM', 'NSI': 'CM',
  'LAD': 'AO',
  'HRE': 'ZW',
  'LUN': 'ZM',
  'GBE': 'BW',
  'MRU': 'MU',
  'SEZ': 'SC',
  'MLE': 'MV',
  'KTM': 'NP',
  'TAS': 'UZ',
  'ALA': 'KZ',
  'GYD': 'AZ',
  'TBS': 'GE',
  'EVN': 'AM',
  'BEG': 'RS',
  'HEL': 'FI',
};

const getCountryCodeFromAirport = (airportCode: string): string | null => {
  if (!airportCode) return null;
  const normalizedCode = airportCode.toUpperCase().trim();
  const match = normalizedCode.match(/\b([A-Z]{3})\b/);
  const code = match ? match[1] : normalizedCode.substring(0, 3);
  return AIRPORT_COUNTRY_MAP[code] || null;
};

const isDomesticFlight = (origin: string, destination: string): boolean => {
  const originCountry = getCountryCodeFromAirport(origin);
  const destinationCountry = getCountryCodeFromAirport(destination);
  
  if (originCountry && destinationCountry) {
    return originCountry === destinationCountry;
  }
  
  const normalizedOrigin = origin?.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
  const normalizedDest = destination?.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
  
  return !!normalizedOrigin && !!normalizedDest && normalizedOrigin === normalizedDest;
};

const ensureTermsExist = async (item: ExtendedSearchResult): Promise<ExtendedSearchResult> => {
  const termsExist = !!(item.terms_and_conditions?.TermsAndConditions && item.terms_and_conditions.TermsAndConditions.length > 0);
  
  if (termsExist) {
    return item;
  }
  
  // ✅ Only Wakanow
  if (item.isWakanow && item.selectData) {
    try {
      const { selectWakanowFlight } = await import('@/lib/wakanow-api');
      const selectResult = await selectWakanowFlight(item.selectData, 'NGN');
      
      console.log('🔍 ensureTermsExist - Backend selectResult:', selectResult);
      
      const responseData = selectResult?.data;
      
      // ✅ Get custom_messages from response
      let customMessages: Array<{ Title: string; Message: string; SeverityLevel: 'High' | 'Medium' | 'Low' }> = [];
      const rawMessages = responseData?.custom_messages || [];
      
      if (Array.isArray(rawMessages) && rawMessages.length > 0) {
        if (typeof rawMessages[0] === 'object' && rawMessages[0] !== null && 'Title' in rawMessages[0]) {
          customMessages = rawMessages as unknown as Array<{ Title: string; Message: string; SeverityLevel: 'High' | 'Medium' | 'Low' }>;
        } else if (typeof rawMessages[0] === 'string') {
          customMessages = rawMessages.map((msg: string) => ({
            Title: 'Message',
            Message: msg,
            SeverityLevel: 'Medium' as const,
          }));
        }
      }
      
      const priceBreakdown = responseData?.priceBreakdown || {
        basePrice: responseData?.basePrice || 0,
        markupAmount: responseData?.markupAmount || 0,
        markupPercentage: responseData?.markupPercentage || 10,
        serviceFee: responseData?.serviceFee || 0,
        serviceFeePercentage: responseData?.serviceFeePercentage || 5,
        taxes: responseData?.taxes || 0,
        taxPercentage: responseData?.taxPercentage || 15,
        totalAmount: responseData?.totalAmount || responseData?.flight_summary?.price?.Amount || 0,
        currency: responseData?.currency || responseData?.flight_summary?.price?.CurrencyCode || 'NGN',
        breakdown: '',
      };
      
      const breakdownText = getBreakdown(priceBreakdown);
      const termsAndConditions = responseData?.terms_and_conditions?.TermsAndConditions || [];
      const hasFetchedTerms = termsAndConditions.length > 0;
      
      return {
        // ✅ REMOVE the duplicate custom_messages from here
        ...item,
        terms_and_conditions: hasFetchedTerms ? {
          TermsAndConditions: termsAndConditions,
          TermsAndConditionImportantNotice: responseData?.terms_and_conditions?.TermsAndConditionImportantNotice || ''
        } : null,
        bookingId: responseData?.booking_id || item.bookingId,
        priceBreakdown: priceBreakdown,
        basePrice: priceBreakdown.basePrice,
        markupAmount: priceBreakdown.markupAmount,
        markupPercentage: priceBreakdown.markupPercentage,
        serviceFee: priceBreakdown.serviceFee,
        serviceFeePercentage: priceBreakdown.serviceFeePercentage,
        taxes: priceBreakdown.taxes.toString(),
        taxPercentage: priceBreakdown.taxPercentage,
        totalAmount: priceBreakdown.totalAmount,
        currency: priceBreakdown.currency,
        breakdown: breakdownText,
        calculatedBasePrice: priceBreakdown.basePrice,
        calculatedMarkup: priceBreakdown.markupAmount,
        calculatedServiceFee: priceBreakdown.serviceFee,
        calculatedTaxes: priceBreakdown.taxes,
        calculatedTotal: priceBreakdown.totalAmount,
        final_amount: priceBreakdown.totalAmount.toString(),
        final_price: priceBreakdown.totalAmount.toString(),
        selectData: responseData?.select_data || item.selectData,
        // ✅ Keep ONLY this one
        custom_messages: customMessages,
      };
    } catch (error: any) {
      console.error('Failed to fetch terms:', error);
      
      const errorMsg = error.message?.toLowerCase() || '';
      const errorString = JSON.stringify(error)?.toLowerCase() || '';
      
      if (errorMsg.includes('expired') || 
          errorMsg.includes('search again') ||
          errorMsg.includes('invalid') ||
          errorMsg.includes('bad request') ||
          errorString.includes('bad request') ||
          errorMsg.includes('selectdata') ||
          errorString.includes('selectdata') ||
          errorMsg.includes('500') ||
          errorString.includes('500')) {
        throw new Error('SELECTION_EXPIRED');
      }
      
      return item;
    }
  }
  
  return item;
};

export default function BookingReviewPage() {
  const router = useRouter();
  const { selectedItem, searchParams, persistSelectionForReturn, selectedSeats, seatTotalPrice, seatCurrency } = useSearch();
  const { isLoggedIn, user } = useAuth();
  const { createBooking, createAmadeusHotelBooking, isCreating } = useBooking();
  const { currency, formatPrice, isLoadingRates } = useLanguage();
  const isMerchantPaymentModel = config.paymentModel === "merchant";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showAmadeusPayment, setShowAmadeusPayment] = useState(false);
  const [pendingPassengerInfo, setPendingPassengerInfo] = useState<PassengerInfo | null>(null);
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFetchingTerms, setIsFetchingTerms] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const hasProcessedRef = useRef(false);
  const hasFetchedTermsRef = useRef(false);

  const [restoredHotelItem, setRestoredHotelItem] = useState<ExtendedSearchResult | null>(null);

  useEffect(() => {
    if (selectedItem && (selectedItem as any).totalAmount && (selectedItem as any).totalAmount > 500000) {
      console.log('🏨 Selected item already has correct price, skipping restore:', (selectedItem as any).totalAmount);
      return;
    }
    
    const storedHotel = sessionStorage.getItem('selectedHotelForBooking');
    if (storedHotel) {
      try {
        const parsed = JSON.parse(storedHotel);
        console.log('🏨 Restored hotel from sessionStorage:', {
          name: parsed.name || parsed.title,
          totalAmount: parsed.totalAmount,
          currency: parsed.selectedCurrency || parsed.currency,
          roomType: parsed.selectedRoomType || parsed.roomTypeName,
          hasSelectedRoomData: !!parsed.selectedRoomData,
          checkInDate: parsed.checkInDate,
          checkOutDate: parsed.checkOutDate,
        });
        
        const isHotel = parsed.hotelId || 
                        parsed.hotelName || 
                        parsed.hotel || 
                        parsed.selectedRoomData ||
                        parsed.selectedRoomType ||
                        parsed.type === 'hotels';
        
        if (isHotel) {
          if (parsed.totalAmount && parsed.totalAmount > 0) {
            parsed.final_amount = parsed.totalAmount.toString();
            parsed.final_price = parsed.totalAmount.toString();
            parsed.totalAmount = parsed.totalAmount;
            parsed.currency = parsed.selectedCurrency || parsed.currency || 'USD';
            parsed.originalPriceAmount = parsed.totalAmount;
            parsed.originalPriceCurrency = parsed.selectedCurrency || parsed.currency || 'USD';
            
            parsed.selectedRoomData = parsed.selectedRoomData || parsed.room;
            parsed.selectedRoomType = parsed.selectedRoomType || parsed.room?.type || parsed.roomTypeName;
            parsed.roomTypeName = parsed.roomTypeName || parsed.room?.name || parsed.selectedRoomType;
            
            // ✅ CRITICAL: Preserve dates from the parsed data
            parsed.checkInDate = parsed.checkInDate || parsed.checkIn || searchParams?.checkInDate;
            parsed.checkOutDate = parsed.checkOutDate || parsed.checkOut || searchParams?.checkOutDate;
            
            console.log('💰 Setting hotel price from sessionStorage:', {
              totalAmount: parsed.totalAmount,
              currency: parsed.currency,
              final_amount: parsed.final_amount,
              selectedRoomType: parsed.selectedRoomType,
              hasSelectedRoomData: !!parsed.selectedRoomData,
              checkInDate: parsed.checkInDate,
              checkOutDate: parsed.checkOutDate,
            });
          }
          
          setRestoredHotelItem(parsed as ExtendedSearchResult);
          
          const processed = processItemPrices(parsed, currency.code);
          setEnhancedItem(processed);
          
          sessionStorage.removeItem('selectedHotelForBooking');
          
        } else {
          console.warn('⚠️ Stored item is not a hotel:', parsed);
        }
      } catch (e) {
        console.error('Failed to restore hotel:', e);
      }
    }
  }, [selectedItem, searchParams, currency.code]);

  // ✅ ONLY ADD THIS - Use this for hotel fallback
  const effectiveSelectedItem = selectedItem || restoredHotelItem;

  const [enhancedItem, setEnhancedItem] = useState<ExtendedSearchResult | null>(() => {
    const item = effectiveSelectedItem as ExtendedSearchResult; 
    if (!item) return null;
    
    if (item.isWakanow) {
      const processed = processItemPrices(item, currency.code);
      console.log('💰 useState - Processing Wakanow item:', {
        id: processed?.id,
        final_amount: processed?.final_amount,
        totalAmount: processed?.totalAmount,
        priceBreakdown: processed?.priceBreakdown,
      });
      return processed;
    }
    
    
    const processed = processItemPrices(item, currency.code);
    return processed;
  });

  const redirectToLogin = () => {
    persistSelectionForReturn();
    sessionStorage.setItem("authReturnTo", "/booking/review");
    router.push("/login");
  };

  const getProductType = (item: ExtendedSearchResult | null): "flight" | "hotel" | "car" => {
    if (!item) return "flight";
    const type = item.type?.toLowerCase() || "";
    
   
    if (type.includes("hotel") || item.hotelId || item.hotel || item.selectedRoomData || item.selectedRoomType) {
      return "hotel";
    }
    if (type.includes("car")) return "car";
    return "flight";
  };

  const checkWakanowSelection = (): { expired: boolean; timeRemaining?: number } => {
    if (!selectedItem) return { expired: false };
    const item = selectedItem as ExtendedSearchResult;
    
    if (item.isWakanow && item.selectData) {
      const stored = sessionStorage.getItem('wakanow_selection_time');
      if (stored) {
        const selectionTime = parseInt(stored, 10);
        const now = Date.now();
        const elapsedMinutes = (now - selectionTime) / 1000 / 60;
        
        if (elapsedMinutes > 55) {
          console.warn('⚠️ Wakanow selection is approaching expiration:', elapsedMinutes, 'minutes');
          return { expired: true, timeRemaining: Math.max(0, 60 - elapsedMinutes) };
        }
        return { expired: false, timeRemaining: Math.max(0, 60 - elapsedMinutes) };
      }
    }
    return { expired: false };
  };

// ✅ Fetch terms for Wakanow flights - runs ONCE when selectedItem changes
useEffect(() => {
  const loadTerms = async () => {
    if (!selectedItem || hasFetchedTermsRef.current) return;
    
    const item = selectedItem as ExtendedSearchResult;
    
    if (item.isWakanow) {
      const { expired, timeRemaining } = checkWakanowSelection();
      if (expired) {
        toast.error(
          'Your flight selection has expired. Please search for flights again.',
          { duration: 5000 }
        );
        sessionStorage.removeItem('wakanow_selection_time');
        setTimeout(() => {
          router.push('/search');
        }, 3000);
        return;
      }
      
      if (timeRemaining !== undefined && timeRemaining < 10) {
        toast.error(
          `Your flight selection expires in ${Math.round(timeRemaining)} minutes. Please complete your booking soon.`,
          { duration: 5000 }
        );
      }
    }
    

    if (!enhancedItem) {
      const processed = processItemPrices(item, currency.code);
      console.log('💰 Setting enhancedItem:', {
        id: processed?.id,
        custom_messages: processed?.custom_messages,
      });
      setEnhancedItem(processed);
      hasProcessedRef.current = true;
    }
    
    hasFetchedTermsRef.current = true;
  };
  
  loadTerms();
}, [selectedItem, enhancedItem, router, currency.code]);


  // ✅ Store selection time when Wakanow flight is selected (UNCHANGED)
  useEffect(() => {
    if (selectedItem) {
      const item = selectedItem as ExtendedSearchResult;
      if (item.isWakanow && item.selectData) {
        sessionStorage.setItem('wakanow_selection_time', Date.now().toString());
        console.log('⏱️ Wakanow selection time stored');
      }
    }
  }, [selectedItem]);

  
  useLayoutEffect(() => {
    const item = effectiveSelectedItem as ExtendedSearchResult;
    if (!item) return;
    
    // ✅ Only update if the currency changed or if enhancedItem is null
    if (enhancedItem && enhancedItem.currency === currency.code && enhancedItem.totalAmount === item.totalAmount) {
      return;
    }
    
    console.log('🔄 useLayoutEffect - Processing item:', {
      id: item.id,
      totalAmount: item.totalAmount,
      selectedRoomType: item.selectedRoomType,
    });
    
    const processed = processItemPrices(item, currency.code);
    setEnhancedItem(processed);
  }, [effectiveSelectedItem, currency.code]);

  const extendedItem = (enhancedItem || effectiveSelectedItem) as ExtendedSearchResult | null; 
  const isHotel = extendedItem ? getProductType(extendedItem) === "hotel" : false;
  const isCar = extendedItem ? getProductType(extendedItem) === "car" : false;
  const isFlight = extendedItem ? !isHotel && !isCar : false;

  const getItemForReview = (): SearchResult => {
    const baseItem = (enhancedItem || effectiveSelectedItem) as ExtendedSearchResult;
    
    // ✅ FIRST: Check if it's a multi-city flight
    const isMultiCity = (baseItem as any).isMultiCity === true || 
                        (baseItem as any).tripType === 'multi-city' ||
                        !!(baseItem as any).multiCitySegments ||
                        !!(baseItem as any).allSegments ||
                        ((baseItem as any).segmentCount && (baseItem as any).segmentCount > 1);
    
    if (isMultiCity) {
      console.log('🔄 Multi-city flight detected in getItemForReview:', {
        segmentCount: (baseItem as any).segmentCount || (baseItem as any).multiCitySegments?.length || (baseItem as any).allSegments?.length,
        hasSegments: !!(baseItem as any).multiCitySegments || !!(baseItem as any).allSegments,
        title: baseItem.title,
        id: baseItem.id,
        provider: baseItem.provider,
      });
      
      // ✅ Preserve ALL multi-city data
      const multiCityItem = {
        ...baseItem,
        type: 'flights',
        isMultiCity: true,
        isWakanow: true,
        tripType: 'multi-city',
        multiCitySegments: (baseItem as any).multiCitySegments || (baseItem as any).allSegments || (baseItem as any).itineraries,
        allSegments: (baseItem as any).allSegments || (baseItem as any).multiCitySegments || (baseItem as any).itineraries,
        segmentCount: (baseItem as any).segmentCount || 
                      ((baseItem as any).multiCitySegments?.length || 
                       (baseItem as any).allSegments?.length || 
                       (baseItem as any).itineraries?.length || 1),
        // Keep all existing data
        slices: (baseItem as any).slices,
        priceBreakdown: (baseItem as any).priceBreakdown,
        final_amount: (baseItem as any).final_amount,
        currency: (baseItem as any).currency,
        custom_messages: (baseItem as any).custom_messages || [],
        // Ensure provider is set correctly
        provider: baseItem.provider || 'wakanow',
        // Keep the title and subtitle
        title: baseItem.title || `Multi-City Flight (${(baseItem as any).segmentCount || 1} segments)`,
        subtitle: baseItem.subtitle || `${(baseItem as any).allSegments?.[0]?.from || ''} → ${(baseItem as any).allSegments?.[(baseItem as any).allSegments?.length - 1]?.to || ''}`,
      };
      
      console.log('📤 Returning multi-city result:', {
        id: multiCityItem.id,
        isMultiCity: multiCityItem.isMultiCity,
        segmentCount: multiCityItem.segmentCount,
        hasAllSegments: !!multiCityItem.allSegments,
      });
      
      return multiCityItem as SearchResult;
    }
    
    // ✅ If this is a hotel with selected room data, use the correct price
    const isHotelWithSelectedRoom = baseItem?.selectedRoomData || 
                                    baseItem?.selectedRoomType ||
                                    baseItem?.roomTypeName ||
                                    baseItem?.totalAmount || 
                                    baseItem?.originalPriceAmount;
    
    if (isHotelWithSelectedRoom) {
      const totalAmount = baseItem.totalAmount || baseItem.originalPriceAmount || 0;
      const currency = baseItem.currency || baseItem.selectedCurrency || baseItem.originalPriceCurrency || 'USD';
      const roomTypeName = baseItem.selectedRoomType || 
                           baseItem.roomTypeName ||
                           baseItem.selectedRoomData?.type || 
                           'Standard Room';
      
      console.log('💰 getItemForReview - Using hotel price:', {
        totalAmount,
        currency,
        roomType: roomTypeName,
        hasSelectedRoomData: !!baseItem.selectedRoomData,
        source: 'getItemForReview',
        baseItemKeys: Object.keys(baseItem),
        id: baseItem.id,
        title: baseItem.title,
        type: baseItem.type,
      });
      
      // ✅ CRITICAL: Preserve ALL fields and explicitly set type
      const result = {
        ...baseItem,  // Preserve all fields
        totalAmount: totalAmount,
        final_amount: totalAmount.toString(),
        final_price: totalAmount.toString(),
        price: `${currency} ${totalAmount.toFixed(2)}`,
        displayPrice: `${currency} ${totalAmount.toFixed(2)}`,
        totalPrice: `${currency} ${totalAmount.toFixed(2)}`,
        currency: currency,
        selectedRoomData: baseItem.selectedRoomData,
        selectedRoomType: roomTypeName,
        roomTypeName: roomTypeName,
        // ✅ EXPLICITLY set type to 'hotels' so ReviewTrip knows it's a hotel
        type: 'hotels',
        // ✅ Also ensure provider is set
        provider: baseItem.provider || 'Premium Hotels',
      };
      
      console.log('📤 Returning hotel result:', {
        id: result.id,
        title: result.title,
        type: result.type,
        totalAmount: result.totalAmount,
        selectedRoomType: result.selectedRoomType,
      });
      
      return result as SearchResult;
    }
    
    // ✅ Extract cancellation policy from baseItem
    let cancellationPolicy = 'Standard cancellation policy applies. Please check during booking for specific terms.';
    if (baseItem.policies && baseItem.policies.length > 0) {
      const cancelPolicy = baseItem.policies.find((p: any) => 
        p.type?.includes('CANCELLATION') || 
        p.type?.includes('CANCEL') ||
        p.type?.includes('GENERAL_POLICY')
      );
      if (cancelPolicy) {
        cancellationPolicy = cancelPolicy.text;
      } else {
        cancellationPolicy = baseItem.policies[0].text;
      }
    }
    
    if (booking) {
      console.log('🔄 Merging item with booking prices:', {
        bookingTotal: booking.totalAmount,
        bookingBase: booking.basePrice,
        bookingMarkup: booking.markupAmount,
        bookingService: booking.serviceFee,
        bookingCurrency: booking.currency,
      });
      
      const mergedItem: ExtendedSearchResult = {
        ...baseItem,
        custom_messages: baseItem.custom_messages || [], 
        basePrice: booking.basePrice ?? baseItem.basePrice,
        totalAmount: booking.totalAmount ?? baseItem.totalAmount,
        markupAmount: booking.markupAmount ?? baseItem.markupAmount,
        serviceFee: booking.serviceFee ?? baseItem.serviceFee,
        currency: booking.currency ?? baseItem.currency,
        final_amount: booking.totalAmount?.toString() ?? baseItem.final_amount,
        final_price: booking.totalAmount?.toString() ?? baseItem.final_price,
        calculatedTotal: booking.totalAmount ?? baseItem.calculatedTotal,
        calculatedBasePrice: booking.basePrice ?? baseItem.calculatedBasePrice,
        calculatedMarkup: booking.markupAmount ?? baseItem.calculatedMarkup,
        calculatedServiceFee: booking.serviceFee ?? baseItem.calculatedServiceFee,
        priceBreakdown: booking.bookingData?.priceBreakdown || baseItem.priceBreakdown,
        breakdown: booking.bookingData?.priceBreakdown?.breakdown || baseItem.breakdown,
        price: booking.totalAmount ? `${booking.currency || 'NGN'} ${booking.totalAmount.toFixed(2)}` : baseItem.price,
        displayPrice: booking.totalAmount ? `${booking.currency || 'NGN'} ${booking.totalAmount.toFixed(2)}` : baseItem.displayPrice,
        totalPrice: booking.totalAmount ? `${booking.currency || 'NGN'} ${booking.totalAmount.toFixed(2)}` : baseItem.totalPrice,
        cancellationPolicy: cancellationPolicy,
        policies: baseItem.policies || [],
      };
      
      console.log('🔄 Merged item:', {
        totalAmount: mergedItem.totalAmount,
        basePrice: mergedItem.basePrice,
        final_amount: mergedItem.final_amount,
        priceBreakdown: mergedItem.priceBreakdown,
        custom_messages: mergedItem.custom_messages,
        cancellationPolicy: mergedItem.cancellationPolicy,
      });
      
      return mergedItem as SearchResult;
    }
    
   
    return {
      ...baseItem,
      custom_messages: baseItem.custom_messages || [],
      cancellationPolicy: cancellationPolicy,
      policies: baseItem.policies || [],
      
      ...(baseItem.hotelId || baseItem.selectedRoomData ? { type: 'hotels' } : {}),
    } as SearchResult;
  };


  const handleProceedToPayment = async (
    passengerInfo: PassengerInfo,
    voucherCode?: string,
  ) => {
    setIsProcessingPayment(true);
    if (!extendedItem) {
      toast.error("No booking item found. Please go back and try again.");
      return;
    }
    console.log('📥 handleProceedToPayment received passengerInfo:', {
      firstName: passengerInfo.firstName,
      lastName: passengerInfo.lastName,
      email: passengerInfo.email,
      phone: passengerInfo.phone,
      // ✅ Log all passport fields (both cases)
      PassportNumber: (passengerInfo as any).PassportNumber,
      passportNumber: (passengerInfo as any).passportNumber,
      ExpiryDate: (passengerInfo as any).ExpiryDate,
      expiryDate: (passengerInfo as any).expiryDate,
      PassportIssuingAuthority: (passengerInfo as any).PassportIssuingAuthority,
      passportIssuingAuthority: (passengerInfo as any).passportIssuingAuthority,
      PassportIssueCountryCode: (passengerInfo as any).PassportIssueCountryCode,
      passportIssueCountryCode: (passengerInfo as any).passportIssueCountryCode,
      travellers: (passengerInfo as any).travellers,
    });
    
    const isGuest = !isLoggedIn;
  




if (isFlight) {

  if (!passengerInfo.dateOfBirth) {
    toast.error("Date of birth is required for flight bookings");
    return;
  }
  if (!passengerInfo.title) {
    toast.error("Title is required for flight bookings");
    return;
  }
  if (!passengerInfo.gender) {
    toast.error("Gender is required for flight bookings");
    return;
  }

  const dob = new Date(passengerInfo.dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  if (age < 2) {
    toast.error("Passenger must be at least 2 years old");
    return;
  }
}
const formatDateToYYYYMMDD = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  // If already in YYYY-MM-DD format, return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  // If in MM/DD/YYYY format, convert to YYYY-MM-DD
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parts = dateStr.split('/');
    const month = String(parseInt(parts[0])).padStart(2, '0');
    const day = String(parseInt(parts[1])).padStart(2, '0');
    const year = parts[2];
    const result = `${year}-${month}-${day}`;
    console.log(`📅 Formatted date to YYYY-MM-DD: ${result}`);
    return result;
  }
  return dateStr;
};

// ✅ FORMAT THE DATE BEFORE BUILDING THE TRAVELLER
const formattedDateOfBirth = formatDateToYYYYMMDD(passengerInfo.dateOfBirth);
console.log(`📅 Lead passenger DOB formatted: ${formattedDateOfBirth}`);
  
    // ✅ Build base passenger info
    const basePassengerInfo: PassengerInfo = {
      firstName: passengerInfo.firstName,
      lastName: passengerInfo.lastName,
      email: passengerInfo.email,
      phone: passengerInfo.phone,
    };
  
    // ✅ Add flight-specific fields if it's a flight
    if (isFlight) {
      (basePassengerInfo as any).title = passengerInfo.title;
      (basePassengerInfo as any).gender = passengerInfo.gender;
      (basePassengerInfo as any).dateOfBirth = passengerInfo.dateOfBirth;
    }
  
    // Determine provider
    let provider = extendedItem?.provider || 'DUFFEL';
    if (extendedItem?.isWakanow === true || provider?.toLowerCase() === 'wakanow') {
      provider = 'WAKANOW';
    } else if (provider?.toLowerCase() === 'duffel') {
      provider = 'DUFFEL';
    }
  
    // ✅ Build passenger info based on provider
    let cleanedPassengerInfo: PassengerInfo = { ...basePassengerInfo };
  
    if (isFlight) {
      if (provider === 'DUFFEL') {
        // ✅ DUFFEL: Only these fields (NEW - ONLY DUFFEL CHANGE)
        cleanedPassengerInfo = {
          ...basePassengerInfo,
          title: passengerInfo.title,
          gender: passengerInfo.gender,
          dateOfBirth: passengerInfo.dateOfBirth,
        } as any;
        
        console.log('🧹 Cleaned passenger info for Duffel:', cleanedPassengerInfo);
      } else if (provider === 'WAKANOW') {
        // ✅ Build the lead passenger as a traveller
        const leadTraveller: any = {
          PassengerType: 'Adult',
          FirstName: passengerInfo.firstName,
          MiddleName: (passengerInfo as any).middleName || '',
          LastName: passengerInfo.lastName,
          DateOfBirth: formattedDateOfBirth,
          PhoneNumber: passengerInfo.phone,
          Email: passengerInfo.email,
          Gender: passengerInfo.gender === 'm' ? 'Male' : 'Female',
          Title: passengerInfo.title || '',  
          // ✅ Passport fields go here
          PassportNumber: (passengerInfo as any).PassportNumber || (passengerInfo as any).passportNumber || '',
          ExpiryDate: (passengerInfo as any).ExpiryDate || (passengerInfo as any).expiryDate || '',
          PassportIssuingAuthority: (passengerInfo as any).PassportIssuingAuthority || (passengerInfo as any).passportIssuingAuthority || '',
          PassportIssueCountryCode: (passengerInfo as any).PassportIssueCountryCode || (passengerInfo as any).passportIssueCountry || '',
          Address: (passengerInfo as any).address || (passengerInfo as any).Address || '221B Baker Street',
          Country: (passengerInfo as any).country || (passengerInfo as any).Country || 'Nigeria',
          CountryCode: (passengerInfo as any).countryCode || (passengerInfo as any).CountryCode || 'NG',
          City: (passengerInfo as any).city || (passengerInfo as any).City || 'Lagos',
          PostalCode: (passengerInfo as any).postalCode || (passengerInfo as any).PostalCode || '100001',
        };
      
        // ✅ Get additional travellers from passengerInfo
        const additionalTravellers = (passengerInfo as any).travellers || [];
      
        // ✅ Combine lead + additional travellers
        const allTravellers = [leadTraveller, ...additionalTravellers];
      
        // ✅ Build the final passenger info with travellers array AND top-level passport fields
        cleanedPassengerInfo = {
          ...basePassengerInfo,
          title: passengerInfo.title,
          gender: passengerInfo.gender,
          dateOfBirth: formattedDateOfBirth,
          // ✅ Passport fields at TOP LEVEL for useBooking.ts
          PassportNumber: (passengerInfo as any).PassportNumber || (passengerInfo as any).passportNumber || '',
          ExpiryDate: (passengerInfo as any).ExpiryDate || (passengerInfo as any).expiryDate || '',
          PassportIssuingAuthority: (passengerInfo as any).PassportIssuingAuthority || (passengerInfo as any).passportIssuingAuthority || '',
          PassportIssueCountryCode: (passengerInfo as any).PassportIssueCountryCode || (passengerInfo as any).passportIssueCountry || '',
          // ✅ Also keep lowercase for compatibility
          passportNumber: (passengerInfo as any).PassportNumber || (passengerInfo as any).passportNumber || '',
          expiryDate: (passengerInfo as any).ExpiryDate || (passengerInfo as any).expiryDate || '',
          passportIssuingAuthority: (passengerInfo as any).PassportIssuingAuthority || (passengerInfo as any).passportIssuingAuthority || '',
          passportIssueCountry: (passengerInfo as any).PassportIssueCountryCode || (passengerInfo as any).passportIssueCountry || '',
          // ✅ travellers array for additional passengers
          travellers: allTravellers,
        } as any;
      
        console.log('📋 Final cleaned passenger info with passport at top level:', {
          ...cleanedPassengerInfo,
          PassportNumber: (cleanedPassengerInfo as any).PassportNumber,
          ExpiryDate: (cleanedPassengerInfo as any).ExpiryDate,
          travellers: (cleanedPassengerInfo as any).travellers?.map((t: any) => ({
            FirstName: t.FirstName,
            PassportNumber: t.PassportNumber,
          })),
        });
      }
    }

    const flightNumberFromPassenger = (passengerInfo as any).flightNumber || '';
const flightDateFromPassenger = (passengerInfo as any).flightDate || '';
const airlineCodeFromPassenger = (passengerInfo as any).airlineCode || '';
const flightTimeFromPassenger = (passengerInfo as any).flightTime || '';

(cleanedPassengerInfo as any).flightNumber = flightNumberFromPassenger;
(cleanedPassengerInfo as any).flightDate = flightDateFromPassenger;
(cleanedPassengerInfo as any).airlineCode = airlineCodeFromPassenger;
(cleanedPassengerInfo as any).flightTime = flightTimeFromPassenger;

console.log('✈️ Flight details preserved in cleanedPassengerInfo:', {
  flightNumber: (cleanedPassengerInfo as any).flightNumber,
  flightDate: (cleanedPassengerInfo as any).flightDate,
  airlineCode: (cleanedPassengerInfo as any).airlineCode,
  flightTime: (cleanedPassengerInfo as any).flightTime,
})
  
    console.log("🔍 Booking flow detection:", {
      isHotel,
      isCar,
      isFlight,
      provider,
      isMerchantPaymentModel,
    });
  
    if (isHotel && !isCar) {
      
      const hotelOfferId = extractOfferIdFromHotel(extendedItem);
      
      console.log('🏨 Hotel booking - Offer ID check:', {
        originalOfferId: extendedItem.offerId,
        extractedOfferId: hotelOfferId,
        hasOfferId: !!hotelOfferId,
        hotelId: extendedItem.hotelId || extendedItem.id,
        hotelName: extendedItem.name || extendedItem.title,
      });

      let finalHotelItem = extendedItem;
      if (!hotelOfferId && typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('selectedHotelForBooking');
        if (stored) {
          try {
            const hotelData = JSON.parse(stored);
            const storedOfferId = hotelData.offerId || 
                                 hotelData.offer_id ||
                                 hotelData.offers?.[0]?.id ||
                                 hotelData.hotelData?.offerId ||
                                 hotelData.realData?.offerId;
            if (storedOfferId) {
              console.log('✅ Found offer ID in sessionStorage:', storedOfferId);
              finalHotelItem = {
                ...extendedItem,
                offerId: storedOfferId,
                offer_id: storedOfferId,
                hotelData: {
                  ...extendedItem.hotelData,
                  offerId: storedOfferId,
                  offer_id: storedOfferId,
                }
              };
            }
          } catch (e) {
            console.error('Failed to parse hotel from sessionStorage:', e);
          }
        }
      }
      
      // ✅ If we still don't have an offer ID, show error
      const finalOfferId = finalHotelItem.offerId || 
                           finalHotelItem.offer_id || 
                           finalHotelItem.hotelData?.offerId || 
                           finalHotelItem.hotelData?.offer_id ||
                           finalHotelItem.offers?.[0]?.id ||
                           extractOfferIdFromHotel(finalHotelItem);
      
      if (!finalOfferId) {
        console.error('❌ No offer ID found for hotel:', {
          item: finalHotelItem,
          offerId: finalHotelItem.offerId,
          offer_id: finalHotelItem.offer_id,
          hotelData: finalHotelItem.hotelData,
          offers: finalHotelItem.offers,
        });
        toast.error(
          'Unable to find a valid hotel offer. Please go back and search for hotels again.',
          { duration: 5000 }
        );
        return;
      }
      
      // ✅ Ensure the offer ID is on the item
      finalHotelItem = {
        ...finalHotelItem,
        offerId: finalOfferId,
        offer_id: finalOfferId,
        realData: {
          ...finalHotelItem.realData,
          offerId: finalOfferId,
        },
        hotelData: {
          ...finalHotelItem.hotelData,
          offerId: finalOfferId,
          offer_id: finalOfferId,
        }
      };
      
      console.log('✅ Proceeding with hotel booking using offer ID:', finalOfferId);
      
      if (isMerchantPaymentModel) {
        try {
          console.log("🏨 Creating Amadeus hotel booking with merchant payment model...");
          
          const correctPrice = parseFloat(finalHotelItem.final_amount || finalHotelItem.final_price || '0');
          console.log("💰 Amadeus hotel price check:", {
            final_amount: finalHotelItem.final_amount,
            final_price: finalHotelItem.final_price,
            correctPrice: correctPrice,
            offerId: finalOfferId,
          });
          
          // Try to restore price from sessionStorage if needed
          if (correctPrice < 500000 && typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('selectedHotel');
            if (stored) {
              try {
                const hotelData = JSON.parse(stored);
                const storedPrice = parseFloat(hotelData.final_amount || hotelData.final_price || '0');
                if (storedPrice > correctPrice && storedPrice > 0) {
                  console.log("💰 Restoring correct price from sessionStorage:", storedPrice);
                  finalHotelItem = {
                    ...finalHotelItem,
                    final_amount: hotelData.final_amount,
                    final_price: hotelData.final_price,
                  };
                }
              } catch (e) {}
            }
          }
          
          const finalPrice = parseFloat(finalHotelItem.final_amount || finalHotelItem.final_price || '0');
          console.log("💰 Final price being sent to createAmadeusHotelBooking:", finalPrice);
          
          const testCard = {
            cardNumber: "4242424242424242",
            expiryMonth: "12",
            expiryYear: "2026",
            cvc: "123",
            holderName: `${cleanedPassengerInfo.firstName} ${cleanedPassengerInfo.lastName}`,
          };
          
          const newBooking = await createAmadeusHotelBooking(
            finalHotelItem,
            cleanedPassengerInfo,
            testCard,
            isGuest,
            searchParams,
          );
          
          // ✅ FIX: Store email after hotel booking creation
          if (newBooking) {
            // Store email in sessionStorage for guest bookings
            if (isGuest && cleanedPassengerInfo.email) {
              sessionStorage.setItem('guest_booking_email', cleanedPassengerInfo.email);
              console.log('📧 Stored guest email in sessionStorage for hotel:', cleanedPassengerInfo.email);
            }
            
            // Ensure email is in the booking object
            const bookingAny = newBooking as any;
            bookingAny.email = cleanedPassengerInfo.email;
            if (!bookingAny.passengerInfo) {
              bookingAny.passengerInfo = {};
            }
            bookingAny.passengerInfo.email = cleanedPassengerInfo.email;
            // ✅ ADD THIS - for consistency with car and flight flows
            if (!bookingAny.bookingData) {
              bookingAny.bookingData = {};
            }
            bookingAny.bookingData.email = cleanedPassengerInfo.email;
            
            setBooking(bookingAny);
          } else {
            setBooking(newBooking);
          }
          
          setAppliedVoucherCode(voucherCode);
          setShowPayment(true);
          
        } catch (err: any) {
          console.error("Amadeus hotel booking error:", err);
          toast.error(err?.message ?? "We couldn't create your booking. Please try again.");
        } finally {
          setIsProcessingPayment(false); 
        }
        return;
      }
      console.log("🏨 Setting up Amadeus hotel payment modal...");
      setPendingPassengerInfo(cleanedPassengerInfo);
      setAppliedVoucherCode(voucherCode);
      // ✅ Pass the finalHotelItem with offer ID via state
      // We need to store it so the modal can use it
      sessionStorage.setItem('pendingHotelBooking', JSON.stringify(finalHotelItem));
      setShowAmadeusPayment(true);
      return;
    }
    

// ============================================================
// ✅ CAR RENTAL FLOW - FIXED WITH FORCE PRICE BREAKDOWN
// ============================================================
if (isCar) {
  try {
    console.log("🚗 Creating car rental booking...");
    
    // ✅ ✅ ✅ EXTRACT FLIGHT DETAILS FROM PASSENGER INFO
    const flightNumber = (cleanedPassengerInfo as any).flightNumber || 
                         (passengerInfo as any).flightNumber || 
                         '';
    const flightDate = (cleanedPassengerInfo as any).flightDate || 
                       (passengerInfo as any).flightDate || 
                       '';
    const airlineCode = (cleanedPassengerInfo as any).airlineCode || 
                        (passengerInfo as any).airlineCode || 
                        '';
    const flightTime = (cleanedPassengerInfo as any).flightTime || 
                       (passengerInfo as any).flightTime || 
                       '';
    
    // ✅ ✅ ✅ VALIDATE FLIGHT DETAILS
    if (!flightNumber || !flightNumber.trim()) {
      toast.error('Flight number is required for car rental transfers. Please enter your flight number.');
      setIsProcessingPayment(false);
      return;
    }
    if (!flightDate || !flightDate.trim()) {
      toast.error('Flight date is required for car rental transfers. Please enter your flight date.');
      setIsProcessingPayment(false);
      return;
    }
    
    console.log("✈️ Car rental flight details:", {
      flightNumber,
      flightDate,
      airlineCode,
      flightTime,
    });
    
    // ✅ Get the correct price from the item
    let finalAmount = extendedItem.final_amount ? parseFloat(extendedItem.final_amount) : 0;
    if (!finalAmount || finalAmount === 0) {
      finalAmount = extendedItem.priceBreakdown?.totalAmount || 0;
    }
    if (!finalAmount || finalAmount === 0) {
      finalAmount = extendedItem.calculatedTotal || 0;
    }
    if (!finalAmount || finalAmount === 0) {
      finalAmount = extendedItem.totalAmount || 0;
    }
    if (!finalAmount || finalAmount === 0) {
      if (extendedItem.price && typeof extendedItem.price === 'string') {
        const parsed = parseFloat(extendedItem.price.replace(/[^0-9.]/g, ''));
        if (parsed > 0) {
          finalAmount = parsed;
        }
      }
    }
    
    // ✅ Ensure finalAmount is a number
    finalAmount = Number(finalAmount);
    
    const basePrice = Number(extendedItem.priceBreakdown?.basePrice ||
                      extendedItem.calculatedBasePrice || 
                      extendedItem.basePrice || 
                      (finalAmount > 0 ? finalAmount / 1.15 : 0));
    
    const markupAmount = Number(extendedItem.priceBreakdown?.markupAmount ||
                         extendedItem.calculatedMarkup || 
                         extendedItem.markupAmount || 
                         (finalAmount > 0 ? finalAmount * 0.10 : 0));
    
    const serviceFee = Number(extendedItem.priceBreakdown?.serviceFee ||
                       extendedItem.calculatedServiceFee || 
                       extendedItem.serviceFee || 
                       (finalAmount > 0 ? finalAmount * 0.05 : 0));
    
    const taxes = Number(extendedItem.priceBreakdown?.taxes ||
                  extendedItem.taxes ||
                  (finalAmount > 0 ? finalAmount * 0.15 : 0));
    
    console.log("🚗 Car rental booking prices:", {
      basePrice,
      markupAmount,
      serviceFee,
      taxes,
      finalAmount,
      flightNumber,
      flightDate,
    });

    const correctedItem = {
      ...extendedItem,
      provider: 'AMADEUS',
      productTypeOverride: 'CAR_RENTAL',
      basePrice: basePrice,
      markupAmount: markupAmount,
      serviceFee: serviceFee,
      taxes: taxes,
      totalAmount: finalAmount,
      vehicle: extendedItem.vehicle,
      serviceProvider: extendedItem.serviceProvider,
      cancellationRules: extendedItem.cancellationRules,
      distance: extendedItem.distance,
      start: extendedItem.start,
      end: extendedItem.end,
    };

    // ✅ ✅ ✅ ADD FLIGHT DETAILS TO PASSENGER INFO BEFORE CREATING BOOKING
    const passengerWithFlightDetails = {
      ...cleanedPassengerInfo,
      flightNumber: flightNumber,
      flightDate: flightDate,
      airlineCode: airlineCode || undefined,
      flightTime: flightTime || undefined,
    };

    // ✅ Create the booking with flight details
    const newBooking = await createBooking(
      correctedItem,
      searchParams,
      passengerWithFlightDetails,
      isGuest,
      {
        taxes: taxes,
        basePrice: basePrice,
        finalAmount: finalAmount,
      },
    );
    
    // ✅ FIX: Store email and FORCE correct price breakdown after booking creation
    if (newBooking) {
      if (isGuest && cleanedPassengerInfo.email) {
        sessionStorage.setItem('guest_booking_email', cleanedPassengerInfo.email);
        console.log('📧 Stored guest email in sessionStorage:', cleanedPassengerInfo.email);
      }
      
      const bookingAny = newBooking as any;
      
      // ✅ Set email at all levels
      bookingAny.email = cleanedPassengerInfo.email;
      if (!bookingAny.passengerInfo) {
        bookingAny.passengerInfo = {};
      }
      bookingAny.passengerInfo.email = cleanedPassengerInfo.email;
      if (!bookingAny.bookingData) {
        bookingAny.bookingData = {};
      }
      bookingAny.bookingData.email = cleanedPassengerInfo.email;
      
      // ✅ ✅ ✅ STORE FLIGHT DETAILS IN BOOKING DATA
      if (!bookingAny.bookingData) {
        bookingAny.bookingData = {};
      }
      bookingAny.bookingData.flight_number = flightNumber;
      bookingAny.bookingData.flight_date = flightDate;
      bookingAny.bookingData.airline_code = airlineCode || undefined;
      bookingAny.bookingData.flight_time = flightTime || undefined;
      
      // ✅ Force correct prices on the booking object
      bookingAny.totalAmount = finalAmount;
      bookingAny.amount = finalAmount;
      bookingAny.finalAmount = finalAmount;
      bookingAny.basePrice = basePrice;
      bookingAny.markupAmount = markupAmount;
      bookingAny.serviceFee = serviceFee;
      bookingAny.taxes = taxes;
      bookingAny.currency = 'NGN';
      
      // ✅ Force the price breakdown
      bookingAny.priceBreakdown = {
        basePrice: basePrice,
        markupAmount: markupAmount,
        markupPercentage: 10,
        serviceFee: serviceFee,
        serviceFeePercentage: 5,
        taxes: taxes,
        taxPercentage: 15,
        totalAmount: finalAmount,
        currency: 'NGN',
        breakdown: `Base: ${basePrice.toFixed(2)} + Markup: ${markupAmount.toFixed(2)} + Service: ${serviceFee.toFixed(2)} + Taxes: ${taxes.toFixed(2)} = ${finalAmount.toFixed(2)}`,
      };
      
      // ✅ Also store in bookingData for safety
      if (!bookingAny.bookingData) {
        bookingAny.bookingData = {};
      }
      bookingAny.bookingData.priceBreakdown = bookingAny.priceBreakdown;
      
      console.log('🚗 FORCED booking with correct prices and flight details:', {
        totalAmount: bookingAny.totalAmount,
        finalAmount: bookingAny.finalAmount,
        basePrice: bookingAny.basePrice,
        flight_number: bookingAny.bookingData?.flight_number,
        flight_date: bookingAny.bookingData?.flight_date,
        priceBreakdown: bookingAny.priceBreakdown,
      });
      
      setBooking(bookingAny);
    } else {
      setBooking(newBooking);
    }
    
    setAppliedVoucherCode(voucherCode);
    setShowPayment(true);
    
    if (newBooking) {
      sessionStorage.setItem('booking_price_breakdown', JSON.stringify({
        basePrice: basePrice,
        markupAmount: markupAmount,
        serviceFee: serviceFee,
        taxes: taxes,
        totalAmount: finalAmount,
        currency: 'NGN',
        markupPercentage: 10,
        serviceFeePercentage: 5,
        taxPercentage: 15,
        flightNumber: flightNumber,
        flightDate: flightDate,
      }));
    }
    
  } catch (err: any) {
    console.error('Car rental booking error:', err);
    toast.error(err.message ?? "We couldn't create your car rental booking. Please try again.");
  } finally {
    setIsProcessingPayment(false);
  }
  return;
}
  
   
    try {
      let bookingItem = extendedItem;
      
      // ✅ Wakanow terms fetch (UNCHANGED)
      if (isFlight && extendedItem.isWakanow) {
        try {
          const { expired } = checkWakanowSelection();
          if (expired) {
            toast.error(
              'Your flight selection has expired. Please search for flights again.',
              { duration: 5000 }
            );
            sessionStorage.removeItem('wakanow_selection_time');
            setTimeout(() => {
              router.push('/search');
            }, 3000);
            return;
          }
          
          bookingItem = extendedItem;
          if (bookingItem !== extendedItem) {
            const processed = processItemPrices(bookingItem, currency.code);
            setEnhancedItem(processed);
            bookingItem = processed || bookingItem;
          }
        } catch (termsError: any) {
          console.error('Terms fetch error in payment:', termsError);
          
          if (termsError.message === 'SELECTION_EXPIRED' || 
              termsError.message?.toLowerCase().includes('expired') || 
              termsError.message?.toLowerCase().includes('search again')) {
            
            toast.error(
              'Your flight selection has expired. Please search for flights again.',
              { duration: 5000 }
            );
            
            sessionStorage.removeItem('wakanow_selection_time');
            
            setTimeout(() => {
              router.push('/search');
            }, 3000);
            return;
          }
          throw termsError;
        }
      }
  
      const origin = bookingItem.origin || bookingItem.departureAirport || bookingItem.bookingData?.origin;
      const destination = bookingItem.destination || bookingItem.arrivalAirport || bookingItem.bookingData?.destination;
      const isDomesticFlightResult = origin && destination && isDomesticFlight(origin, destination);
      
      let finalProvider = bookingItem.provider || 'DUFFEL';
      
      if (bookingItem.isWakanow === true || bookingItem.provider?.toLowerCase() === 'wakanow') {
        finalProvider = 'WAKANOW';
      } else if (bookingItem.provider?.toLowerCase() === 'duffel') {
        finalProvider = 'DUFFEL';
      }
      
      // ✅ Wakanow specific (UNCHANGED)
      if (finalProvider === 'WAKANOW') {
        const selectDataValue = bookingItem.selectData || 
                               bookingItem.token || 
                               bookingItem.session_id || 
                               bookingItem.booking_token ||
                               bookingItem.connection_code;
        
        if (!selectDataValue) {
          throw new Error('Missing booking token for this flight. Please go back and select the flight again.');
        }
        
        if (!bookingItem.selectData) {
          bookingItem = { ...bookingItem, selectData: selectDataValue };
        }
      }
      
      // ✅ Duffel specific (NEW - ONLY DUFFEL CHANGE)
      if (finalProvider === 'DUFFEL' && !bookingItem.offer_request_id) {
        throw new Error('Missing offer ID for this flight. Please go back and select the flight again.');
      }
      
      // ✅ Get prices from the item
      let finalAmount = bookingItem.final_amount ? parseFloat(bookingItem.final_amount) : 0;
      
      if (!finalAmount || finalAmount === 0) {
        finalAmount = bookingItem.priceBreakdown?.totalAmount || 0;
      }
      if (!finalAmount || finalAmount === 0) {
        finalAmount = bookingItem.calculatedTotal || 0;
      }
      if (!finalAmount || finalAmount === 0) {
        finalAmount = bookingItem.totalAmount || 0;
      }
      if (!finalAmount || finalAmount === 0) {
        if (bookingItem.price && typeof bookingItem.price === 'string') {
          const parsed = parseFloat(bookingItem.price.replace(/[^0-9.]/g, ''));
          if (parsed > 0) {
            finalAmount = parsed;
          }
        }
      }

      const basePrice = bookingItem.priceBreakdown?.basePrice ||
                        bookingItem.calculatedBasePrice || 
                        bookingItem.basePrice || 
                        (finalAmount > 0 ? finalAmount / 1.15 : 0);
      
      const markupAmount = bookingItem.priceBreakdown?.markupAmount ||
                           bookingItem.calculatedMarkup || 
                           bookingItem.markupAmount || 
                           (finalAmount > 0 ? finalAmount * 0.10 : 0);
      
      const serviceFee = bookingItem.priceBreakdown?.serviceFee ||
                         bookingItem.calculatedServiceFee || 
                         bookingItem.serviceFee || 
                         (finalAmount > 0 ? finalAmount * 0.05 : 0);

      console.log('💰 Flight booking prices (from backend):', {
        basePrice,
        markupAmount,
        serviceFee,
        finalAmount,
        priceBreakdown: bookingItem.priceBreakdown,
        final_amount: bookingItem.final_amount,
        final_price: bookingItem.final_price,
      });

      // ============================================================
      // ✅ DUFFEL FIX: Preserve offer data in correctedItem
      // ============================================================
      const correctedItem = {
        ...bookingItem,
        provider: finalProvider,
        isDomestic: isDomesticFlightResult,
        originalProvider: bookingItem.provider,
        productTypeOverride: isDomesticFlightResult ? 'FLIGHT_DOMESTIC' : 'FLIGHT_INTERNATIONAL',
        basePrice: basePrice,
        markupAmount: markupAmount,
        serviceFee: serviceFee,
        totalAmount: finalAmount,
        markup_percentage: bookingItem.markup_percentage || 10,
        service_fee_percentage: bookingItem.service_fee_percentage || 5,
        // ✅ DUFFEL: Preserve offer data (NEW - ONLY DUFFEL CHANGE)
        offerData: bookingItem.offerData || undefined,
        offer_request_id: bookingItem.offer_request_id || bookingItem.offer_id || undefined,
        offer_id: bookingItem.offer_id || bookingItem.offer_request_id || undefined,
        slices: bookingItem.slices || undefined,
        passengers: bookingItem.passengers || undefined,
        owner: bookingItem.owner || undefined,
      };
  
      console.log("✈️ Creating flight booking with provider:", finalProvider);
      console.log("📦 Offer data being sent:", {
        offerData: correctedItem.offerData ? 'YES' : 'NO',
        offer_request_id: correctedItem.offer_request_id,
        offer_id: correctedItem.offer_id,
      });
  
      const newBooking = await createBooking(
        correctedItem,
        searchParams,
        cleanedPassengerInfo,
        isGuest,
        {
          taxes: serviceFee,
          basePrice: basePrice,
          finalAmount: finalAmount,
        },
      );
      
      // ✅ FIX: Store email after flight booking creation
      if (newBooking) {
        // Store email in sessionStorage for guest bookings
        if (isGuest && cleanedPassengerInfo.email) {
          sessionStorage.setItem('guest_booking_email', cleanedPassengerInfo.email);
          console.log('📧 Stored guest email in sessionStorage for flight:', cleanedPassengerInfo.email);
        }
        
        // ✅ Ensure email is in the booking object at multiple locations
        const bookingAny = newBooking as any;
        
        // Set at top level
        bookingAny.email = cleanedPassengerInfo.email;
        
        // Set in passengerInfo
        if (!bookingAny.passengerInfo) {
          bookingAny.passengerInfo = {};
        }
        bookingAny.passengerInfo.email = cleanedPassengerInfo.email;
        
        // Set in bookingData
        if (!bookingAny.bookingData) {
          bookingAny.bookingData = {};
        }
        bookingAny.bookingData.email = cleanedPassengerInfo.email;
        
        console.log('📧 Email stored in booking object for flight:', {
          topLevel: bookingAny.email,
          passengerInfo: bookingAny.passengerInfo?.email,
          bookingData: bookingAny.bookingData?.email,
        });
        
        // Update the booking state with the enhanced object
        setBooking(bookingAny);
      } else {
        setBooking(newBooking);
      }
      
      setAppliedVoucherCode(voucherCode);
      setShowPayment(true);
      
      if (newBooking) {
        sessionStorage.setItem('booking_price_breakdown', JSON.stringify({
          basePrice: newBooking.basePrice || basePrice,
          markupAmount: newBooking.markupAmount || markupAmount,
          serviceFee: newBooking.serviceFee || serviceFee,
          totalAmount: newBooking.totalAmount || finalAmount,
          currency: newBooking.currency || 'NGN',
          markupPercentage: correctedItem.markup_percentage || 10,
          serviceFeePercentage: correctedItem.service_fee_percentage || 5,
        }));
      }
      
    } catch (err: any) {
      console.error('Booking error:', err);
      
      const errorMsg = err.message?.toLowerCase() || '';
      if (errorMsg.includes('expired') || 
          errorMsg.includes('search again') ||
          errorMsg.includes('invalid') ||
          errorMsg.includes('SELECTION_EXPIRED') ||
          errorMsg.includes('bad request')) {
        toast.error('Your flight selection has expired. Please search for flights again.');
        sessionStorage.removeItem('wakanow_selection_time');
        setTimeout(() => {
          router.push('/search');
        }, 2000);
        return;
      }
      
      toast.error(err.message ?? "We couldn't create your booking. Please try again.");
    }finally {  
      setIsProcessingPayment(false);  
    } 
  };




const handlePaymentSuccess = (confirmed: Booking) => {
  if (isNavigating) return;
  setIsNavigating(true);
  
  setShowPayment(false);
  setShowAmadeusPayment(false);
  setPendingPassengerInfo(null);
  
  try {
    sessionStorage.setItem('last_booking', JSON.stringify(confirmed));
    sessionStorage.setItem('last_booking_id', confirmed.id);
    sessionStorage.setItem('last_booking_ref', confirmed.reference);
    
    if (!isLoggedIn && confirmed.passengerInfo?.email) {
      sessionStorage.setItem('guest_booking_email', confirmed.passengerInfo.email);
    }
  } catch (error) {
    console.error("Failed to store booking:", error);
  }
  
  const successUrl = `/booking/success?id=${confirmed.id}&ref=${confirmed.reference}&provider=${confirmed.provider}`;
  
  setTimeout(() => {
    window.location.href = successUrl;
  }, 200);
};
 
if (!selectedItem && !restoredHotelItem) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">No booking to review</h1>
      <p className="text-gray-600 mb-8">Please select an item from search to continue.</p>
      <button onClick={() => router.push("/search")} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg">
        Back to search
      </button>
    </div>
  );
}

  if ((isLoadingRates || isProcessing || isFetchingTerms) && !enhancedItem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">
            {isFetchingTerms ? 'Loading terms & conditions...' : 'Loading booking details...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    {/* ✅ SPINNER OVERLAY */}
    {isProcessingPayment && (
      <LoadingSpinner message="Processing your booking..." />
    )}

      <ReviewTrip
        item={getItemForReview()}
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

{showAmadeusPayment && effectiveSelectedItem && pendingPassengerInfo && (
  <AmadeusHotelPaymentModal
    item={{
      ...effectiveSelectedItem,
      offerId: effectiveSelectedItem.offerId || 
               effectiveSelectedItem.offer_id ||
               effectiveSelectedItem.hotelData?.offerId ||
               effectiveSelectedItem.offers?.[0]?.id ||
               (typeof window !== 'undefined' && 
                sessionStorage.getItem('pendingHotelBooking') ? 
                  JSON.parse(sessionStorage.getItem('pendingHotelBooking')!).offerId : 
                  ''),
    }}
    passengerInfo={pendingPassengerInfo}
    isGuest={!isLoggedIn}
    voucherCode={appliedVoucherCode}
    onSuccess={handlePaymentSuccess}
    onCancel={() => {
      setShowAmadeusPayment(false);
      setPendingPassengerInfo(null);
      sessionStorage.removeItem('pendingHotelBooking');
    }}
    onSignInRequired={redirectToLogin}
  />
)}
    </>
  );
}
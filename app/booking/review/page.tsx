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

  // ============================================================
  // ✅ HOTELS AND CARS - Keep existing logic (UNCHANGED)
  // ============================================================
  if (item.priceBreakdown) {
    const pb = item.priceBreakdown;
    const displayCurrency = pb.currency || currencyCode || 'NGN';
    const formattedPrice = `${displayCurrency} ${pb.totalAmount.toFixed(2)}`;
    
    return {
      ...item,
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
    };
  }
  
  if (item.calculatedTotal && item.calculatedTotal > 0) {
    const displayCurrency = item.currency || currencyCode || 'NGN';
    const formattedPrice = `${displayCurrency} ${item.calculatedTotal.toFixed(2)}`;
    
    return {
      ...item,
      price: formattedPrice,
      displayPrice: formattedPrice,
      totalPrice: formattedPrice,
      currency: displayCurrency,
      rawPrice: item.calculatedTotal,
      final_amount: item.calculatedTotal.toString(),
      final_price: item.calculatedTotal.toString(),
      service_fee: (item.calculatedServiceFee || 0).toString(),
      base_price: (item.calculatedBasePrice || 0).toString(),
      markup_amount: (item.calculatedMarkup || 0).toString(),
      calculatedBasePrice: item.calculatedBasePrice || 0,
      calculatedServiceFee: item.calculatedServiceFee || 0,
      calculatedMarkup: item.calculatedMarkup || 0,
      calculatedTaxes: item.calculatedTaxes || 0,
      calculatedTotal: item.calculatedTotal,
      markup_percentage: item.markup_percentage || 10,
      service_fee_percentage: item.service_fee_percentage || 5,
      basePrice: item.calculatedBasePrice || 0,
      markupAmount: item.calculatedMarkup || 0,
      serviceFee: item.calculatedServiceFee || 0,
      taxes: (item.calculatedTaxes || 0).toString(),
      totalAmount: item.calculatedTotal,
    };
  }
  
  return item;
}

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

// app/booking/review/page.tsx

const ensureTermsExist = async (item: ExtendedSearchResult): Promise<ExtendedSearchResult> => {
  const termsExist = !!(item.terms_and_conditions?.TermsAndConditions && item.terms_and_conditions.TermsAndConditions.length > 0);
  
  if (termsExist) {
    return item;
  }
  
  // ✅ Only Wakanow (UNCHANGED)
  if (item.isWakanow && item.selectData) {
    try {
      const { selectWakanowFlight } = await import('@/lib/wakanow-api');
      const selectResult = await selectWakanowFlight(item.selectData, 'NGN');
      
      console.log('🔍 ensureTermsExist - Backend selectResult:', selectResult);
      
      const responseData = selectResult?.data;
      
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
      
      console.log('💰 ensureTermsExist - Price breakdown from backend:', priceBreakdown);
      console.log('💰 ensureTermsExist - Breakdown text:', breakdownText);
      
      const termsAndConditions = responseData?.terms_and_conditions?.TermsAndConditions || [];
      const hasFetchedTerms = termsAndConditions.length > 0;
      
      return {
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
  const { selectedItem, searchParams, persistSelectionForReturn } = useSearch();
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

  const hasProcessedRef = useRef(false);
  const hasFetchedTermsRef = useRef(false);

  const [enhancedItem, setEnhancedItem] = useState<ExtendedSearchResult | null>(() => {
    const item = selectedItem as ExtendedSearchResult;
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

  const getProductType = (item: ExtendedSearchResult): "flight" | "hotel" | "car" => {
    const type = item.type?.toLowerCase() || "";
    if (type.includes("hotel")) return "hotel";
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

  // ✅ Fetch terms for Wakanow flights - runs ONCE when selectedItem changes (UNCHANGED)
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
      
      if (item.isWakanow && item.selectData && !item.terms_and_conditions) {
        setIsFetchingTerms(true);
        try {
          const itemWithTerms = await ensureTermsExist(item);
          
          if (itemWithTerms) {
            const processed = processItemPrices(itemWithTerms, currency.code);
            console.log('💰 Terms loaded - Setting enhancedItem:', {
              id: processed?.id,
              totalAmount: processed?.totalAmount,
              priceBreakdown: processed?.priceBreakdown,
              breakdown: processed?.breakdown,
              final_amount: processed?.final_amount,
            });
            setEnhancedItem(processed);
            hasProcessedRef.current = true;
          }
        } catch (error: any) {
          console.error('Terms fetch error:', error);
          
          if (error.message === 'SELECTION_EXPIRED' || 
              error.message?.toLowerCase().includes('expired') || 
              error.message?.toLowerCase().includes('search again')) {
            
            toast.error(
              'Your flight selection has expired. Please search for flights again to get a new selection.',
              { duration: 5000 }
            );
            
            sessionStorage.removeItem('wakanow_selection_time');
            
            setTimeout(() => {
              router.push('/search');
            }, 3000);
            return;
          }
          
          const processed = processItemPrices(item, currency.code);
          setEnhancedItem(processed);
        }
        hasFetchedTermsRef.current = true;
        setIsFetchingTerms(false);
      } else if (!enhancedItem) {
        const processed = processItemPrices(item, currency.code);
        setEnhancedItem(processed);
        hasFetchedTermsRef.current = true;
        hasProcessedRef.current = true;
      } else {
        hasFetchedTermsRef.current = true;
      }
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

  // ✅ Re-process when currency changes
  useLayoutEffect(() => {
    const item = selectedItem as ExtendedSearchResult;
    if (!item) return;
    
    if (enhancedItem && enhancedItem.currency === currency.code) {
      return;
    }
    
    const processed = processItemPrices(item, currency.code);
    setEnhancedItem(processed);
  }, [selectedItem, currency.code]);

  const extendedItem = (enhancedItem || selectedItem) as ExtendedSearchResult;
  const isHotel = getProductType(extendedItem) === "hotel";
  const isCar = getProductType(extendedItem) === "car";
  const isFlight = !isHotel && !isCar;

  // ✅ Helper function to merge item with booking prices
  const getItemForReview = (): SearchResult => {
    const baseItem = (enhancedItem || selectedItem) as ExtendedSearchResult;
    
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
      };
      
      console.log('🔄 Merged item:', {
        totalAmount: mergedItem.totalAmount,
        basePrice: mergedItem.basePrice,
        final_amount: mergedItem.final_amount,
        priceBreakdown: mergedItem.priceBreakdown,
      });
      
      return mergedItem as SearchResult;
    }
    
    return baseItem as SearchResult;
  };

  // ============================================================
  // ✅ handleProceedToPayment - ONLY DUFFEL CHANGES
  // Wakanow and Amadeus flows are UNCHANGED
  // ============================================================
  const handleProceedToPayment = async (
    passengerInfo: PassengerInfo,
    voucherCode?: string,
  ) => {
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
  
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(passengerInfo.dateOfBirth)) {
        toast.error("Date of birth must be in YYYY-MM-DD format");
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
        // ✅ WAKANOW: All fields including passport (UNCHANGED)
        cleanedPassengerInfo = {
          ...basePassengerInfo,
          title: passengerInfo.title,
          gender: passengerInfo.gender,
          dateOfBirth: passengerInfo.dateOfBirth,
          passportNumber: (passengerInfo as any).passportNumber,
          passportExpiry: (passengerInfo as any).passportExpiry,
          passportIssuingAuthority: (passengerInfo as any).passportIssuingAuthority,
          passportIssueCountry: (passengerInfo as any).passportIssueCountry,
          address: (passengerInfo as any).address,
          city: (passengerInfo as any).city,
          country: (passengerInfo as any).country,
          countryCode: (passengerInfo as any).countryCode,
          postalCode: (passengerInfo as any).postalCode,
          travellers: (passengerInfo as any).travellers,
        } as any;
        
        console.log('📋 Full passenger info for Wakanow:', cleanedPassengerInfo);
      }
    }
  
    console.log("🔍 Booking flow detection:", {
      isHotel,
      isCar,
      isFlight,
      provider,
      isMerchantPaymentModel,
    });
  
    // ============================================================
    // ✅ HOTEL FLOW - AMADEUS (UNCHANGED)
    // ============================================================
    if (isHotel && !isCar) {
      if (isMerchantPaymentModel) {
        try {
          console.log("🏨 Creating Amadeus hotel booking with merchant payment model...");
          
          const correctPrice = parseFloat(extendedItem.final_amount || extendedItem.final_price || '0');
          console.log("💰 Amadeus hotel price check:", {
            final_amount: extendedItem.final_amount,
            final_price: extendedItem.final_price,
            correctPrice: correctPrice
          });
          
          let finalItem = extendedItem;
          if (correctPrice < 500000 && typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('selectedHotel');
            if (stored) {
              try {
                const hotelData = JSON.parse(stored);
                const storedPrice = parseFloat(hotelData.final_amount || hotelData.final_price || '0');
                if (storedPrice > correctPrice && storedPrice > 0) {
                  console.log("💰 Restoring correct price from sessionStorage:", storedPrice);
                  finalItem = {
                    ...extendedItem,
                    final_amount: hotelData.final_amount,
                    final_price: hotelData.final_price,
                  };
                }
              } catch (e) {}
            }
          }
          
          const finalPrice = parseFloat(finalItem.final_amount || finalItem.final_price || '0');
          console.log("💰 Final price being sent to createAmadeusHotelBooking:", finalPrice);
          
          const testCard = {
            cardNumber: "4242424242424242",
            expiryMonth: "12",
            expiryYear: "2026",
            cvc: "123",
            holderName: `${cleanedPassengerInfo.firstName} ${cleanedPassengerInfo.lastName}`,
          };
          
          const newBooking = await createAmadeusHotelBooking(
            finalItem,
            cleanedPassengerInfo,
            testCard,
            isGuest,
          );
          setBooking(newBooking);
          setAppliedVoucherCode(voucherCode);
          setShowPayment(true);
        } catch (err: any) {
          console.error("Amadeus hotel booking error:", err);
          toast.error(err?.message ?? "We couldn't create your booking. Please try again.");
        }
        return;
      }
      
      console.log("🏨 Setting up Amadeus hotel payment modal...");
      setPendingPassengerInfo(cleanedPassengerInfo);
      setAppliedVoucherCode(voucherCode);
      setShowAmadeusPayment(true);
      return;
    }
  
    // ============================================================
    // ✅ CAR RENTAL FLOW - AMADEUS (UNCHANGED)
    // ============================================================
    if (isCar) {
      try {
        console.log("🚗 Creating car rental booking...");
        const correctedItem = {
          ...extendedItem,
          provider: 'AMADEUS',
          productTypeOverride: 'CAR_RENTAL',
        };
        const newBooking = await createBooking(
          correctedItem,
          searchParams,
          cleanedPassengerInfo,
          isGuest,
          {
            taxes: 0,
            basePrice: 0,
            finalAmount: 0,
          },
        );
        setBooking(newBooking);
        setAppliedVoucherCode(voucherCode);
        setShowPayment(true);
      } catch (err: any) {
        toast.error(err.message ?? "We couldn't create your car rental booking. Please try again.");
      }
      return;
    }
  
    // ============================================================
    // ✅ FLIGHT BOOKING - WAKANOW (UNCHANGED) + DUFFEL (FIXED)
    // ============================================================
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
          
          bookingItem = await ensureTermsExist(extendedItem);
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
  
      // ✅ Create booking - uses cleaned passenger info for Duffel
      const newBooking = await createBooking(
        correctedItem,  // ✅ Pass correctedItem with offerData
        searchParams,
        cleanedPassengerInfo,  // ✅ Use cleaned passenger info
        isGuest,
        {
          taxes: serviceFee,
          basePrice: basePrice,
          finalAmount: finalAmount,
        },
      );
  
      setBooking(newBooking);
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

  if (!selectedItem) {
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
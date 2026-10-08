"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

interface TrendingimagesProps {
  onCityClick?: (city: { code: string; name: string; from?: { code: string; name: string } }) => void;
  defaultDeparture?: { code: string; name: string };
}

interface Destination {
  id: string;
  city: string;
  countryKey: string;
  countryName: string;
  flag: string;
  code: string;
  image: string;     
  flights: string;
  hotels: string;
}

// ─── Geo detection (same as HomesGrid / CarRentals) ───────────────────
function getUserGeoCountry(): string | null {
  if (typeof window === "undefined") return null;

  const directKeys = [
    "geo_country", "geoCountry", "country", "user_country", "userCountry",
    "detected_country", "detectedCountry", "user_country_code", "countryCode",
  ];
  for (const k of directKeys) {
    const v = localStorage.getItem(k);
    if (v && v.length === 2 && /^[A-Z]{2}$/i.test(v)) return v.toUpperCase();
  }

  const localeKeys = ["locale", "user_locale", "userLocale", "app_locale", "lang", "language"];
  for (const k of localeKeys) {
    const v = localStorage.getItem(k);
    if (!v) continue;
    if (v.includes("/")) {
      const code = v.split("/")[1]?.toUpperCase();
      if (code && /^[A-Z]{2}$/.test(code)) return code;
    }
    const m = v.match(/[-_]([A-Z]{2})$/i);
    if (m) return m[1].toUpperCase();
  }

  const currencyMap: Record<string, string> = {
    NGN: "NG", GBP: "GB", USD: "US", EUR: "FR",
    CAD: "CA", AUD: "AU", JPY: "JP", CNY: "CN",
    ZAR: "ZA", KES: "KE", AED: "AE", SGD: "SG", TRY: "TR",
  };
  for (const k of ["selectedCurrency", "preferredCurrency", "currency", "currencyCode", "app_currency"]) {
    const v = localStorage.getItem(k)?.toUpperCase();
    if (v && currencyMap[v]) return currencyMap[v];
  }

  return null;
}

async function detectGeoFromAPI(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const code = (data?.country_code || "").toUpperCase();
    if (code && code.length === 2) {
      try {
        localStorage.setItem("geo_country", code);
        localStorage.setItem("country", code);
      } catch {}
      return code;
    }
  } catch (err) {
    console.warn("[Trending images] Geo detection failed:", err);
  }
  return null;
}

const GEO_COUNTRY_NAMES: Record<string, string> = {
  NG: "Nigeria", GB: "the United Kingdom", US: "the United States",
  AE: "the UAE", FR: "France", DE: "Germany", ES: "Spain", IT: "Italy",
  ZA: "South Africa", KE: "Kenya", GH: "Ghana", IN: "India",
  AU: "Australia", CA: "Canada", NL: "the Netherlands", TR: "Turkey",
  EG: "Egypt", JP: "Japan", SG: "Singapore", BR: "Brazil",
};

// ─── images per geo ──────────────────────────────────────────────
// Order matters: first 2 → hero cards (larger), next 3 → smaller cards.
// `image` is a local path under /public/images/.
const images_BY_GEO: Record<string, Destination[]> = {
  NG: [
    { id: "ng-1", city: "Lagos",   countryKey: "countries.nigeria", countryName: "Nigeria",              flag: "🇳🇬", code: "LOS", image: "/images/lagos.jpg",   flights: "412", hotels: "1240" },
    { id: "ng-2", city: "Abuja",   countryKey: "countries.nigeria", countryName: "Nigeria",              flag: "🇳🇬", code: "ABV", image: "/images/abuja.jpg",   flights: "187", hotels: "620" },
    { id: "ng-3", city: "London",  countryKey: "countries.uk",      countryName: "United Kingdom",       flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",  flights: "245", hotels: "850" },
    { id: "ng-4", city: "Dubai",   countryKey: "countries.uae",     countryName: "United Arab Emirates", flag: "🇦🇪", code: "DXB", image: "/images/dubai.jpg",   flights: "289", hotels: "620" },
    { id: "ng-5", city: "Accra",   countryKey: "countries.ghana",   countryName: "Ghana",                flag: "🇬🇭", code: "ACC", image: "/images/accra.jpg",   flights: "112", hotels: "310" },
  ],
  GB: [
    { id: "gb-1", city: "London",    countryKey: "countries.uk",     countryName: "United Kingdom",       flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",    flights: "245", hotels: "850" },
    { id: "gb-2", city: "Edinburgh", countryKey: "countries.uk",     countryName: "United Kingdom",       flag: "🇬🇧", code: "EDI", image: "/images/edinburgh.jpg", flights: "148", hotels: "390" },
    { id: "gb-3", city: "Paris",     countryKey: "countries.france", countryName: "France",               flag: "🇫🇷", code: "CDG", image: "/images/paris.jpg",     flights: "356", hotels: "890" },
    { id: "gb-4", city: "Barcelona", countryKey: "countries.spain",  countryName: "Spain",                flag: "🇪🇸", code: "BCN", image: "/images/barcelona.jpg", flights: "312", hotels: "540" },
    { id: "gb-5", city: "Dubai",     countryKey: "countries.uae",    countryName: "United Arab Emirates", flag: "🇦🇪", code: "DXB", image: "/images/dubai.jpg",     flights: "289", hotels: "620" },
  ],
  US: [
    { id: "us-1", city: "New York",  countryKey: "countries.usa",    countryName: "United States",  flag: "🇺🇸", code: "JFK", image: "/images/new-york.jpg",  flights: "425", hotels: "1200" },
    { id: "us-2", city: "Las Vegas", countryKey: "countries.usa",    countryName: "United States",  flag: "🇺🇸", code: "LAS", image: "/images/las-vegas.jpg", flights: "312", hotels: "980" },
    { id: "us-3", city: "London",    countryKey: "countries.uk",     countryName: "United Kingdom", flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",    flights: "245", hotels: "850" },
    { id: "us-4", city: "Paris",     countryKey: "countries.france", countryName: "France",         flag: "🇫🇷", code: "CDG", image: "/images/paris.jpg",     flights: "356", hotels: "890" },
    { id: "us-5", city: "Tokyo",     countryKey: "countries.japan",  countryName: "Japan",          flag: "🇯🇵", code: "HND", image: "/images/tokyo.jpg",     flights: "402", hotels: "980" },
  ],
  AE: [
    { id: "ae-1", city: "Dubai",     countryKey: "countries.uae",      countryName: "United Arab Emirates", flag: "🇦🇪", code: "DXB", image: "/images/dubai.jpg",     flights: "289", hotels: "620" },
    { id: "ae-2", city: "Abu Dhabi", countryKey: "countries.uae",      countryName: "United Arab Emirates", flag: "🇦🇪", code: "AUH", image: "/images/abu-dhabi.jpg", flights: "198", hotels: "410" },
    { id: "ae-3", city: "London",    countryKey: "countries.uk",       countryName: "United Kingdom",       flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",    flights: "245", hotels: "850" },
    { id: "ae-4", city: "Paris",     countryKey: "countries.france",   countryName: "France",               flag: "🇫🇷", code: "CDG", image: "/images/paris.jpg",     flights: "356", hotels: "890" },
    { id: "ae-5", city: "Bangkok",   countryKey: "countries.thailand", countryName: "Thailand",             flag: "🇹🇭", code: "BKK", image: "/images/bangkok.jpg",   flights: "221", hotels: "730" },
  ],
  FR: [
    { id: "fr-1", city: "Paris",     countryKey: "countries.france", countryName: "France",         flag: "🇫🇷", code: "CDG", image: "/images/paris.jpg",     flights: "356", hotels: "890" },
    { id: "fr-2", city: "Nice",      countryKey: "countries.france", countryName: "France",         flag: "🇫🇷", code: "NCE", image: "/images/nice.jpg",      flights: "176", hotels: "420" },
    { id: "fr-3", city: "London",    countryKey: "countries.uk",     countryName: "United Kingdom", flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",    flights: "245", hotels: "850" },
    { id: "fr-4", city: "Rome",      countryKey: "countries.italy",  countryName: "Italy",          flag: "🇮🇹", code: "FCO", image: "/images/rome.jpg",      flights: "298", hotels: "610" },
    { id: "fr-5", city: "Barcelona", countryKey: "countries.spain",  countryName: "Spain",          flag: "🇪🇸", code: "BCN", image: "/images/barcelona.jpg", flights: "312", hotels: "540" },
  ],
  DE: [
    { id: "de-1", city: "Berlin",    countryKey: "countries.germany", countryName: "Germany",        flag: "🇩🇪", code: "BER", image: "/images/berlin.jpg",    flights: "298", hotels: "720" },
    { id: "de-2", city: "Munich",    countryKey: "countries.germany", countryName: "Germany",        flag: "🇩🇪", code: "MUC", image: "/images/munich.jpg",    flights: "245", hotels: "580" },
    { id: "de-3", city: "Paris",     countryKey: "countries.france",  countryName: "France",         flag: "🇫🇷", code: "CDG", image: "/images/paris.jpg",     flights: "356", hotels: "890" },
    { id: "de-4", city: "London",    countryKey: "countries.uk",      countryName: "United Kingdom", flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",    flights: "245", hotels: "850" },
    { id: "de-5", city: "Barcelona", countryKey: "countries.spain",   countryName: "Spain",          flag: "🇪🇸", code: "BCN", image: "/images/barcelona.jpg", flights: "312", hotels: "540" },
  ],
  ES: [
    { id: "es-1", city: "Madrid",    countryKey: "countries.spain",    countryName: "Spain",          flag: "🇪🇸", code: "MAD", image: "/images/madrid.jpg",    flights: "289", hotels: "640" },
    { id: "es-2", city: "Barcelona", countryKey: "countries.spain",    countryName: "Spain",          flag: "🇪🇸", code: "BCN", image: "/images/barcelona.jpg", flights: "312", hotels: "540" },
    { id: "es-3", city: "Paris",     countryKey: "countries.france",   countryName: "France",         flag: "🇫🇷", code: "CDG", image: "/images/paris.jpg",     flights: "356", hotels: "890" },
    { id: "es-4", city: "London",    countryKey: "countries.uk",       countryName: "United Kingdom", flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",    flights: "245", hotels: "850" },
    { id: "es-5", city: "Lisbon",    countryKey: "countries.portugal", countryName: "Portugal",       flag: "🇵🇹", code: "LIS", image: "/images/lisbon.jpg",    flights: "176", hotels: "480" },
  ],
  IT: [
    { id: "it-1", city: "Rome",      countryKey: "countries.italy",   countryName: "Italy",          flag: "🇮🇹", code: "FCO", image: "/images/rome.jpg",      flights: "298", hotels: "610" },
    { id: "it-2", city: "Milan",     countryKey: "countries.italy",   countryName: "Italy",          flag: "🇮🇹", code: "MXP", image: "/images/milan.jpg",     flights: "245", hotels: "540" },
    { id: "it-3", city: "Paris",     countryKey: "countries.france",  countryName: "France",         flag: "🇫🇷", code: "CDG", image: "/images/paris.jpg",     flights: "356", hotels: "890" },
    { id: "it-4", city: "Barcelona", countryKey: "countries.spain",   countryName: "Spain",          flag: "🇪🇸", code: "BCN", image: "/images/barcelona.jpg", flights: "312", hotels: "540" },
    { id: "it-5", city: "Athens",    countryKey: "countries.greece",  countryName: "Greece",         flag: "🇬🇷", code: "ATH", image: "/images/athens.jpg",    flights: "186", hotels: "420" },
  ],
  NL: [
    { id: "nl-1", city: "Amsterdam", countryKey: "countries.netherlands", countryName: "Netherlands", flag: "🇳🇱", code: "AMS", image: "/images/amsterdam.jpg", flights: "312", hotels: "640" },
    { id: "nl-2", city: "Rotterdam", countryKey: "countries.netherlands", countryName: "Netherlands", flag: "🇳🇱", code: "RTM", image: "/images/rotterdam.jpg", flights: "124", hotels: "310" },
    { id: "nl-3", city: "Paris",     countryKey: "countries.france",      countryName: "France",      flag: "🇫🇷", code: "CDG", image: "/images/paris.jpg",     flights: "356", hotels: "890" },
    { id: "nl-4", city: "London",    countryKey: "countries.uk",          countryName: "United Kingdom", flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",    flights: "245", hotels: "850" },
    { id: "nl-5", city: "Berlin",    countryKey: "countries.germany",     countryName: "Germany",     flag: "🇩🇪", code: "BER", image: "/images/berlin.jpg",    flights: "298", hotels: "720" },
  ],
  ZA: [
    { id: "za-1", city: "Cape Town",    countryKey: "countries.southAfrica", countryName: "South Africa", flag: "🇿🇦", code: "CPT", image: "/images/cape-town.jpg",    flights: "172", hotels: "560" },
    { id: "za-2", city: "Johannesburg", countryKey: "countries.southAfrica", countryName: "South Africa", flag: "🇿🇦", code: "JNB", image: "/images/johannesburg.jpg", flights: "98",  hotels: "420" },
    { id: "za-3", city: "Dubai",        countryKey: "countries.uae",         countryName: "United Arab Emirates", flag: "🇦🇪", code: "DXB", image: "/images/dubai.jpg",        flights: "289", hotels: "620" },
    { id: "za-4", city: "London",       countryKey: "countries.uk",          countryName: "United Kingdom", flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",       flights: "245", hotels: "850" },
    { id: "za-5", city: "Mauritius",    countryKey: "countries.mauritius",   countryName: "Mauritius",    flag: "🇲🇺", code: "MRU", image: "/images/mauritius.jpg",    flights: "94",  hotels: "280" },
  ],
  KE: [
    { id: "ke-1", city: "Nairobi",  countryKey: "countries.kenya",       countryName: "Kenya",                flag: "🇰🇪", code: "NBO", image: "/images/nairobi.jpg",  flights: "198", hotels: "540" },
    { id: "ke-2", city: "Mombasa",  countryKey: "countries.kenya",       countryName: "Kenya",                flag: "🇰🇪", code: "MBA", image: "/images/mombasa.jpg",  flights: "112", hotels: "380" },
    { id: "ke-3", city: "Dubai",    countryKey: "countries.uae",         countryName: "United Arab Emirates", flag: "🇦🇪", code: "DXB", image: "/images/dubai.jpg",    flights: "289", hotels: "620" },
    { id: "ke-4", city: "Cape Town",countryKey: "countries.southAfrica", countryName: "South Africa",         flag: "🇿🇦", code: "CPT", image: "/images/cape-town.jpg",flights: "172", hotels: "560" },
    { id: "ke-5", city: "Zanzibar", countryKey: "countries.tanzania",    countryName: "Tanzania",             flag: "🇹🇿", code: "ZNZ", image: "/images/zanzibar.jpg", flights: "88",  hotels: "310" },
  ],
  GH: [
    { id: "gh-1", city: "Accra",  countryKey: "countries.ghana",   countryName: "Ghana",                flag: "🇬🇭", code: "ACC", image: "/images/accra.jpg",  flights: "148", hotels: "420" },
    { id: "gh-2", city: "Kumasi", countryKey: "countries.ghana",   countryName: "Ghana",                flag: "🇬🇭", code: "KMS", image: "/images/kumasi.jpg", flights: "74",  hotels: "210" },
    { id: "gh-3", city: "Lagos",  countryKey: "countries.nigeria", countryName: "Nigeria",              flag: "🇳🇬", code: "LOS", image: "/images/lagos.jpg",  flights: "76",  hotels: "380" },
    { id: "gh-4", city: "Dubai",  countryKey: "countries.uae",     countryName: "United Arab Emirates", flag: "🇦🇪", code: "DXB", image: "/images/dubai.jpg",  flights: "289", hotels: "620" },
    { id: "gh-5", city: "London", countryKey: "countries.uk",      countryName: "United Kingdom",       flag: "🇬🇧", code: "LHR", image: "/images/london.jpg", flights: "245", hotels: "850" },
  ],
  EG: [
    { id: "eg-1", city: "Cairo",      countryKey: "countries.egypt", countryName: "Egypt",   flag: "🇪🇬", code: "CAI", image: "/images/cairo.jpg",      flights: "256", hotels: "520" },
    { id: "eg-2", city: "Alexandria", countryKey: "countries.egypt", countryName: "Egypt",   flag: "🇪🇬", code: "ALY", image: "/images/alexandria.jpg", flights: "112", hotels: "280" },
    { id: "eg-3", city: "Dubai",      countryKey: "countries.uae",   countryName: "United Arab Emirates", flag: "🇦🇪", code: "DXB", image: "/images/dubai.jpg",      flights: "289", hotels: "620" },
    { id: "eg-4", city: "Istanbul",   countryKey: "countries.turkey",countryName: "Turkey",  flag: "🇹🇷", code: "IST", image: "/images/istanbul.jpg",   flights: "203", hotels: "680" },
    { id: "eg-5", city: "London",     countryKey: "countries.uk",    countryName: "United Kingdom", flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",     flights: "245", hotels: "850" },
  ],
  IN: [
    { id: "in-1", city: "Mumbai",    countryKey: "countries.india",     countryName: "India",                flag: "🇮🇳", code: "BOM", image: "/images/mumbai.jpg",    flights: "289", hotels: "890" },
    { id: "in-2", city: "Delhi",     countryKey: "countries.india",     countryName: "India",                flag: "🇮🇳", code: "DEL", image: "/images/delhi.jpg",     flights: "312", hotels: "760" },
    { id: "in-3", city: "Dubai",     countryKey: "countries.uae",       countryName: "United Arab Emirates", flag: "🇦🇪", code: "DXB", image: "/images/dubai.jpg",     flights: "289", hotels: "620" },
    { id: "in-4", city: "Singapore", countryKey: "countries.singapore", countryName: "Singapore",            flag: "🇸🇬", code: "SIN", image: "/images/singapore.jpg", flights: "340", hotels: "720" },
    { id: "in-5", city: "Bangkok",   countryKey: "countries.thailand",  countryName: "Thailand",             flag: "🇹🇭", code: "BKK", image: "/images/bangkok.jpg",   flights: "221", hotels: "730" },
  ],
  JP: [
    { id: "jp-1", city: "Tokyo",   countryKey: "countries.japan", countryName: "Japan",   flag: "🇯🇵", code: "HND", image: "/images/tokyo.jpg",   flights: "402", hotels: "980" },
    { id: "jp-2", city: "Osaka",   countryKey: "countries.japan", countryName: "Japan",   flag: "🇯🇵", code: "KIX", image: "/images/osaka.jpg",   flights: "245", hotels: "640" },
    { id: "jp-3", city: "Seoul",   countryKey: "countries.korea", countryName: "South Korea", flag: "🇰🇷", code: "ICN", image: "/images/seoul.jpg",   flights: "298", hotels: "720" },
    { id: "jp-4", city: "Bangkok", countryKey: "countries.thailand", countryName: "Thailand", flag: "🇹🇭", code: "BKK", image: "/images/bangkok.jpg", flights: "221", hotels: "730" },
    { id: "jp-5", city: "Singapore", countryKey: "countries.singapore", countryName: "Singapore", flag: "🇸🇬", code: "SIN", image: "/images/singapore.jpg", flights: "340", hotels: "720" },
  ],
  SG: [
    { id: "sg-1", city: "Singapore", countryKey: "countries.singapore", countryName: "Singapore", flag: "🇸🇬", code: "SIN", image: "/images/singapore.jpg", flights: "340", hotels: "720" },
    { id: "sg-2", city: "Bangkok",   countryKey: "countries.thailand",  countryName: "Thailand",  flag: "🇹🇭", code: "BKK", image: "/images/bangkok.jpg",   flights: "221", hotels: "730" },
    { id: "sg-3", city: "Tokyo",     countryKey: "countries.japan",     countryName: "Japan",     flag: "🇯🇵", code: "HND", image: "/images/tokyo.jpg",     flights: "402", hotels: "980" },
    { id: "sg-4", city: "Bali",      countryKey: "countries.indonesia", countryName: "Indonesia", flag: "🇮🇩", code: "DPS", image: "/images/bali.jpg",      flights: "210", hotels: "690" },
    { id: "sg-5", city: "Kuala Lumpur", countryKey: "countries.malaysia", countryName: "Malaysia", flag: "🇲🇾", code: "KUL", image: "/images/kuala-lumpur.jpg", flights: "168", hotels: "540" },
  ],
  AU: [
    { id: "au-1", city: "Sydney",     countryKey: "countries.australia",   countryName: "Australia",   flag: "🇦🇺", code: "SYD", image: "/images/sydney.jpg",     flights: "312", hotels: "780" },
    { id: "au-2", city: "Melbourne",  countryKey: "countries.australia",   countryName: "Australia",   flag: "🇦🇺", code: "MEL", image: "/images/melbourne.jpg",  flights: "256", hotels: "620" },
    { id: "au-3", city: "Bali",       countryKey: "countries.indonesia",   countryName: "Indonesia",   flag: "🇮🇩", code: "DPS", image: "/images/bali.jpg",       flights: "210", hotels: "690" },
    { id: "au-4", city: "Auckland",   countryKey: "countries.newZealand",  countryName: "New Zealand", flag: "🇳🇿", code: "AKL", image: "/images/auckland.jpg",   flights: "245", hotels: "380" },
    { id: "au-5", city: "Singapore",  countryKey: "countries.singapore",   countryName: "Singapore",   flag: "🇸🇬", code: "SIN", image: "/images/singapore.jpg",  flights: "340", hotels: "720" },
  ],
  CA: [
    { id: "ca-1", city: "Toronto",   countryKey: "countries.canada", countryName: "Canada",        flag: "🇨🇦", code: "YYZ", image: "/images/toronto.jpg",   flights: "289", hotels: "820" },
    { id: "ca-2", city: "Vancouver", countryKey: "countries.canada", countryName: "Canada",        flag: "🇨🇦", code: "YVR", image: "/images/vancouver.jpg", flights: "245", hotels: "640" },
    { id: "ca-3", city: "New York",  countryKey: "countries.usa",    countryName: "United States", flag: "🇺🇸", code: "JFK", image: "/images/new-york.jpg",  flights: "425", hotels: "1200" },
    { id: "ca-4", city: "London",    countryKey: "countries.uk",     countryName: "United Kingdom", flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",    flights: "245", hotels: "850" },
    { id: "ca-5", city: "Paris",     countryKey: "countries.france", countryName: "France",        flag: "🇫🇷", code: "CDG", image: "/images/paris.jpg",     flights: "356", hotels: "890" },
  ],
  TR: [
    { id: "tr-1", city: "Istanbul", countryKey: "countries.turkey",  countryName: "Turkey",         flag: "🇹🇷", code: "IST", image: "/images/istanbul.jpg", flights: "203", hotels: "680" },
    { id: "tr-2", city: "Antalya",  countryKey: "countries.turkey",  countryName: "Turkey",         flag: "🇹🇷", code: "AYT", image: "/images/antalya.jpg",  flights: "145", hotels: "420" },
    { id: "tr-3", city: "Dubai",    countryKey: "countries.uae",     countryName: "United Arab Emirates", flag: "🇦🇪", code: "DXB", image: "/images/dubai.jpg",    flights: "289", hotels: "620" },
    { id: "tr-4", city: "London",   countryKey: "countries.uk",      countryName: "United Kingdom", flag: "🇬🇧", code: "LHR", image: "/images/london.jpg",   flights: "245", hotels: "850" },
    { id: "tr-5", city: "Paris",    countryKey: "countries.france",  countryName: "France",         flag: "🇫🇷", code: "CDG", image: "/images/paris.jpg",    flights: "356", hotels: "890" },
  ],
};

const DEFAULT_GEO = "GB";

// ─── Currency → departure (unchanged) ─────────────────────────────────
function getDepartureByCurrency(currencyCode: string): { code: string; name: string } {
  switch (currencyCode) {
    case "GBP": return { code: "LHR", name: "London" };
    case "EUR": return { code: "CDG", name: "Paris" };
    case "NGN": return { code: "LOS", name: "Lagos" };
    case "USD": return { code: "JFK", name: "New York" };
    case "AED": return { code: "DXB", name: "Dubai" };
    case "SGD": return { code: "SIN", name: "Singapore" };
    case "JPY": return { code: "HND", name: "Tokyo" };
    case "AUD": return { code: "SYD", name: "Sydney" };
    case "CAD": return { code: "YYZ", name: "Toronto" };
    case "CHF": return { code: "ZRH", name: "Zurich" };
    case "ZAR": return { code: "JNB", name: "Johannesburg" };
    default:    return { code: "LHR", name: "London" };
  }
}

const Trendingimages: React.FC<TrendingimagesProps> = ({
  onCityClick,
  defaultDeparture,
}) => {
  const { t, currency } = useLanguage();

  const [geo, setGeo] = useState<string | null>(() => getUserGeoCountry());
  const [images, setimages] = useState<Destination[]>(() => {
    const g = getUserGeoCountry();
    return (g && images_BY_GEO[g]) || images_BY_GEO[DEFAULT_GEO];
  });
  const [dynamicDeparture, setDynamicDeparture] = useState<{ code: string; name: string }>({
    code: "LHR",
    name: "London",
  });

  useEffect(() => {
    if (currency?.code) {
      setDynamicDeparture(getDepartureByCurrency(currency.code));
    }
  }, [currency]);

  useEffect(() => {
    let cancelled = false;

    const loadGeo = async () => {
      let g = getUserGeoCountry();
      if (!g) g = await detectGeoFromAPI();
      if (cancelled) return;

      setGeo(g);
      setimages((g && images_BY_GEO[g]) || images_BY_GEO[DEFAULT_GEO]);
    };

    loadGeo();
    return () => { cancelled = true; };
  }, []);

  const finalDeparture = defaultDeparture || dynamicDeparture;

  const handleCityClick = (city: { code: string; name: string }) => {
    if (onCityClick) {
      onCityClick({ ...city, from: finalDeparture });
    }
  };

  const countryLabel = (d: Destination): string => {
    try {
      const v = t(d.countryKey);
      if (v && typeof v === "string" && !v.includes(".")) return v;
    } catch {}
    return d.countryName;
  };

  const geoLabel = geo ? GEO_COUNTRY_NAMES[geo] || "your country" : "your country";
  const subtitle = `Most popular choices for travelers from ${geoLabel}`;

  const [heroA, heroB, ...rest] = images;

  return (
    <section className="px-4 md:px-8 lg:px-16 pt-8 pb-0">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900">
        {t("trending.title")}
      </h2>
      <p className="text-gray-600 mt-1 mb-4 text-sm">{subtitle}</p>

      {/* Row 1 — 2 large hero cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
        {[heroA, heroB].map((d) => d && (
          <Card
            key={d.id}
            destination={d}
            countryLabel={countryLabel(d)}
            heightClass="h-48 md:h-72"
            onSelect={() => handleCityClick({ code: d.code, name: d.city })}
          />
        ))}
      </div>

      {/* Row 2 — 3 smaller cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {rest.map((d) => (
          <Card
            key={d.id}
            destination={d}
            countryLabel={countryLabel(d)}
            heightClass="h-32 md:h-48"
            onSelect={() => handleCityClick({ code: d.code, name: d.city })}
          />
        ))}
      </div>
    </section>
  );
};

// ─── Card with 3-tier image fallback ──────────────────────────────────
//  1. local file  →  /images/<slug>.jpg
//  2. picsum      →  https://picsum.photos/seed/<code>/1200/800
//  3. gradient    →  dark gradient + watermark city name (always visible)
const Card: React.FC<{
  destination: Destination;
  countryLabel: string;
  heightClass: string;
  onSelect: () => void;
}> = ({ destination, countryLabel, heightClass, onSelect }) => {
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const stage = img.dataset.stage || "local";

    if (stage === "local") {
      // Local file missing → try picsum
      img.dataset.stage = "picsum";
      img.src = `https://picsum.photos/seed/${destination.code}/1200/800`;
      return;
    }

    // Both failed → hide image, gradient watermark shows through
    img.style.visibility = "hidden";

    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[Trendingimages] All images failed for "${destination.city}" (tried ${destination.image})`,
      );
    }
  };

  return (
    <div
      className="group cursor-pointer rounded-lg overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 relative"
      onClick={onSelect}
    >
      <div className={`relative ${heightClass} overflow-hidden`}>
        {/* Fallback layer — always rendered underneath */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white/15 text-4xl md:text-5xl font-bold tracking-tight select-none">
            {destination.city}
          </span>
        </div>

        <img
          src={destination.image}
          alt={`${destination.city}, ${countryLabel}`}
          data-stage="local"
          className="relative w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={handleImgError}
        />

        {/* Subtle top-to-bottom gradient for label legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/10" />

        {/* City + flag — top-left, Booking.com style */}
        <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
          <h3
            className="text-white font-bold text-lg md:text-2xl leading-tight"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.55)" }}
          >
            {destination.city}
          </h3>
          <span className="text-base md:text-xl leading-none" aria-hidden>
            {destination.flag}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Trendingimages;
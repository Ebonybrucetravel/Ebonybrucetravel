// lib/cities.ts

/**
 * A comprehensive map of IATA city codes to their names.
 * This covers all major global cities and can be extended
 * as you discover Amadeus-specific internal codes (e.g., XVJ).
 */
 export const CITY_CODE_TO_NAME: Record<string, string> = {
    // --- North America ---
    // USA
    NYC: 'New York', JFK: 'New York', LGA: 'New York', EWR: 'Newark',
    LAX: 'Los Angeles', ORD: 'Chicago', CHI: 'Chicago', MDW: 'Chicago',
    SFO: 'San Francisco', SEA: 'Seattle', MIA: 'Miami', FLL: 'Fort Lauderdale',
    BOS: 'Boston', ATL: 'Atlanta', DFW: 'Dallas', DAL: 'Dallas',
    DEN: 'Denver', LAS: 'Las Vegas', MCO: 'Orlando', PHL: 'Philadelphia',
    PHX: 'Phoenix', IAH: 'Houston', HOU: 'Houston', SAN: 'San Diego',
    MSP: 'Minneapolis', DTW: 'Detroit', CLT: 'Charlotte', DCA: 'Washington',
    IAD: 'Washington', BWI: 'Baltimore', SLC: 'Salt Lake City', HNL: 'Honolulu',
  
    // Canada
    YTO: 'Toronto', YYZ: 'Toronto', YTZ: 'Toronto', YVR: 'Vancouver',
    YUL: 'Montreal', YYC: 'Calgary', YOW: 'Ottawa', YEG: 'Edmonton',
    YHZ: 'Halifax', YWG: 'Winnipeg', YQB: 'Quebec City',
  
    // Mexico & Central America
    MEX: 'Mexico City', CUN: 'Cancún', GDL: 'Guadalajara',
    PVR: 'Puerto Vallarta', SJD: 'Los Cabos', MTY: 'Monterrey',
    GUA: 'Guatemala City', SAL: 'San Salvador', SJO: 'San José',
    PTY: 'Panama City', HAV: 'Havana', SJU: 'San Juan',
  
    // --- South America ---
    SAO: 'São Paulo', GRU: 'São Paulo', CGH: 'São Paulo',
    RIO: 'Rio de Janeiro', GIG: 'Rio de Janeiro', SDU: 'Rio de Janeiro',
    BSB: 'Brasília', CNF: 'Belo Horizonte', POA: 'Porto Alegre',
    SSA: 'Salvador', REC: 'Recife', FOR: 'Fortaleza', CWB: 'Curitiba',
    BUE: 'Buenos Aires', EZE: 'Buenos Aires', AEP: 'Buenos Aires',
    COR: 'Córdoba', MDZ: 'Mendoza', SCL: 'Santiago', VAP: 'Valparaíso',
    LIM: 'Lima', BOG: 'Bogotá', UIO: 'Quito', GYE: 'Guayaquil',
    CCS: 'Caracas', MVD: 'Montevideo', ASU: 'Asunción', LPB: 'La Paz',
    CUZ: 'Cusco',
  
    // --- Europe ---
    // UK & Ireland
    LON: 'London', LHR: 'London', LGW: 'London', STN: 'London', LTN: 'Luton',
    LCY: 'London', MAN: 'Manchester', EDI: 'Edinburgh', GLA: 'Glasgow',
    BHX: 'Birmingham', BRS: 'Bristol', NCL: 'Newcastle', LBA: 'Leeds',
    BFS: 'Belfast', DUB: 'Dublin', ORK: 'Cork', SNN: 'Shannon',
    XVJ: 'Stevenage', NHT: 'Northolt', KYN: 'Milton Keynes',
  
    // France
    PAR: 'Paris', CDG: 'Paris', ORY: 'Paris', NCE: 'Nice', LYS: 'Lyon',
    MRS: 'Marseille', TLS: 'Toulouse', BOD: 'Bordeaux', NTE: 'Nantes',
  
    // Germany
    FRA: 'Frankfurt', MUC: 'Munich', BER: 'Berlin', HAM: 'Hamburg',
    DUS: 'Düsseldorf', CGN: 'Cologne', STR: 'Stuttgart', HAJ: 'Hannover',
    NUE: 'Nuremberg', LEJ: 'Leipzig',
  
    // Spain & Portugal
    MAD: 'Madrid', BCN: 'Barcelona', AGP: 'Málaga', PMI: 'Palma de Mallorca',
    VLC: 'Valencia', SVQ: 'Seville', BIO: 'Bilbao', IBZ: 'Ibiza',
    LPA: 'Gran Canaria', TCI: 'Tenerife', LIS: 'Lisbon', OPO: 'Porto',
    FAO: 'Faro',
  
    // Italy
    ROM: 'Rome', FCO: 'Rome', CIA: 'Rome', MIL: 'Milan', MXP: 'Milan',
    LIN: 'Milan', VCE: 'Venice', NAP: 'Naples', FLR: 'Florence',
    BLQ: 'Bologna', PSA: 'Pisa', CTA: 'Catania', PMO: 'Palermo',
  
    // Netherlands, Belgium, Switzerland, Austria
    AMS: 'Amsterdam', BRU: 'Brussels', ZRH: 'Zurich', GVA: 'Geneva',
    BSL: 'Basel', VIE: 'Vienna', SZG: 'Salzburg',
  
    // Nordics
    CPH: 'Copenhagen', ARN: 'Stockholm', OSL: 'Oslo', HEL: 'Helsinki',
    BGO: 'Bergen', GOT: 'Gothenburg', SVG: 'Stavanger',
  
    // Rest of Western & Southern Europe
    LUX: 'Luxembourg', MLA: 'Malta', LCA: 'Larnaca', PFO: 'Paphos',
    ATH: 'Athens', SKG: 'Thessaloniki', JTR: 'Santorini',
  
    // Eastern Europe & Russia
    WAW: 'Warsaw', KRK: 'Kraków', PRG: 'Prague', BUD: 'Budapest',
    OTP: 'Bucharest', SOF: 'Sofia', ZAG: 'Zagreb', BEG: 'Belgrade',
    MOW: 'Moscow', SVO: 'Moscow', DME: 'Moscow', LED: 'Saint Petersburg',
    KBP: 'Kyiv', MSQ: 'Minsk', TLL: 'Tallinn', RIX: 'Riga', VNO: 'Vilnius',
  
    // --- Middle East ---
    DXB: 'Dubai', AUH: 'Abu Dhabi', SHJ: 'Sharjah', DOH: 'Doha',
    RUH: 'Riyadh', JED: 'Jeddah', DMM: 'Dammam', KWI: 'Kuwait City',
    BAH: 'Bahrain', MCT: 'Muscat', AMM: 'Amman', BEY: 'Beirut',
    TLV: 'Tel Aviv', IST: 'Istanbul', SAW: 'Istanbul', AYT: 'Antalya',
    ESB: 'Ankara', ADB: 'Izmir',
  
    // --- Africa ---
    CAI: 'Cairo', HRG: 'Hurghada', SSH: 'Sharm El Sheikh', CMN: 'Casablanca',
    RAK: 'Marrakesh', TUN: 'Tunis', ALG: 'Algiers',
    LOS: 'Lagos', ABV: 'Abuja', PHC: 'Port Harcourt', KAN: 'Kano',
    ACC: 'Accra', ABJ: 'Abidjan', DKR: 'Dakar', DLA: 'Douala',
    NBO: 'Nairobi', MBA: 'Mombasa', ADD: 'Addis Ababa', DAR: 'Dar es Salaam',
    EBB: 'Entebbe', KGL: 'Kigali',
    JNB: 'Johannesburg', CPT: 'Cape Town', DUR: 'Durban', HRE: 'Harare',
    LUN: 'Lusaka', GBE: 'Gaborone', WDH: 'Windhoek', MRU: 'Mauritius',
  
    // --- Asia ---
    TYO: 'Tokyo', HND: 'Tokyo', NRT: 'Tokyo', OSA: 'Osaka', KIX: 'Osaka',
    NGO: 'Nagoya', CTS: 'Sapporo', FUK: 'Fukuoka',
    SEL: 'Seoul', ICN: 'Seoul', GMP: 'Seoul', PUS: 'Busan',
    BJS: 'Beijing', PEK: 'Beijing', PKX: 'Beijing', SHA: 'Shanghai',
    PVG: 'Shanghai', CAN: 'Guangzhou', SZX: 'Shenzhen', CTU: 'Chengdu',
    HKG: 'Hong Kong', MFM: 'Macau', TPE: 'Taipei',
    SIN: 'Singapore', BKK: 'Bangkok', DMK: 'Bangkok', HKT: 'Phuket',
    CNX: 'Chiang Mai', KUL: 'Kuala Lumpur', PEN: 'Penang', BKI: 'Kota Kinabalu',
    CGK: 'Jakarta', DPS: 'Bali', SUB: 'Surabaya', MNL: 'Manila', CEB: 'Cebu',
    HAN: 'Hanoi', SGN: 'Ho Chi Minh City', DAD: 'Da Nang', PNH: 'Phnom Penh',
    REP: 'Siem Reap', RGN: 'Yangon', VTE: 'Vientiane',
    DEL: 'Delhi', BOM: 'Mumbai', BLR: 'Bangalore', MAA: 'Chennai',
    CCU: 'Kolkata', HYD: 'Hyderabad', COK: 'Kochi', GOI: 'Goa',
    KHI: 'Karachi', LHE: 'Lahore', ISB: 'Islamabad', DAC: 'Dhaka',
    CMB: 'Colombo', KTM: 'Kathmandu', MLE: 'Maldives',
    ALA: 'Almaty', TAS: 'Tashkent', GYD: 'Baku', TBS: 'Tbilisi',
    EVN: 'Yerevan',
  
    // --- Oceania ---
    SYD: 'Sydney', MEL: 'Melbourne', BNE: 'Brisbane', PER: 'Perth',
    ADL: 'Adelaide', CBR: 'Canberra', HBA: 'Hobart', DRW: 'Darwin',
    CNS: 'Cairns', OOL: 'Gold Coast',
    AKL: 'Auckland', WLG: 'Wellington', CHC: 'Christchurch', ZQN: 'Queenstown',
    NAN: 'Nadi', PPT: 'Papeete', NOU: 'Nouméa',
  };
  
  /**
   * City center coordinates for common cities.
   * Used to compute straight-line distance when Amadeus doesn't provide it.
   */
  export const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
    // UK & Ireland
    LON: { lat: 51.5074, lng: -0.1278 },
    LHR: { lat: 51.5074, lng: -0.1278 },
    LGW: { lat: 51.5074, lng: -0.1278 },
    STN: { lat: 51.5074, lng: -0.1278 },
    LCY: { lat: 51.5074, lng: -0.1278 },
    MAN: { lat: 53.4808, lng: -2.2426 },
    LTN: { lat: 51.8787, lng: -0.4200 },
    XVJ: { lat: 51.9037, lng: -0.2014 },
    NHT: { lat: 51.5463, lng: -0.3683 },
    KYN: { lat: 52.0406, lng: -0.7594 },
    EDI: { lat: 55.9533, lng: -3.1883 },
    GLA: { lat: 55.8642, lng: -4.2518 },
    BHX: { lat: 52.4862, lng: -1.8904 },
    BRS: { lat: 51.4545, lng: -2.5879 },
    NCL: { lat: 54.9783, lng: -1.6178 },
    LBA: { lat: 53.8008, lng: -1.5491 },
    BFS: { lat: 54.5973, lng: -5.9301 },
    DUB: { lat: 53.3498, lng: -6.2603 },
  
    // France
    PAR: { lat: 48.8566, lng: 2.3522 },
    CDG: { lat: 48.8566, lng: 2.3522 },
    ORY: { lat: 48.8566, lng: 2.3522 },
    NCE: { lat: 43.7102, lng: 7.2620 },
    LYS: { lat: 45.7640, lng: 4.8357 },
    MRS: { lat: 43.2965, lng: 5.3698 },
  
    // Germany
    FRA: { lat: 50.1109, lng: 8.6821 },
    MUC: { lat: 48.1351, lng: 11.5820 },
    BER: { lat: 52.5200, lng: 13.4050 },
    HAM: { lat: 53.5511, lng: 9.9937 },
    DUS: { lat: 51.2277, lng: 6.7735 },
    CGN: { lat: 50.9375, lng: 6.9603 },
  
    // Spain & Portugal
    MAD: { lat: 40.4168, lng: -3.7038 },
    BCN: { lat: 41.3874, lng: 2.1686 },
    AGP: { lat: 36.7213, lng: -4.4213 },
    PMI: { lat: 39.5696, lng: 2.6502 },
    VLC: { lat: 39.4699, lng: -0.3763 },
    SVQ: { lat: 37.3891, lng: -5.9845 },
    LIS: { lat: 38.7223, lng: -9.1393 },
    OPO: { lat: 41.1579, lng: -8.6291 },
    FAO: { lat: 37.0194, lng: -7.9304 },
  
    // Italy
    ROM: { lat: 41.9028, lng: 12.4964 },
    FCO: { lat: 41.9028, lng: 12.4964 },
    MIL: { lat: 45.4642, lng: 9.1900 },
    MXP: { lat: 45.4642, lng: 9.1900 },
    VCE: { lat: 45.4408, lng: 12.3155 },
    NAP: { lat: 40.8518, lng: 14.2681 },
    FLR: { lat: 43.7696, lng: 11.2558 },
  
    // Benelux, Switzerland, Austria
    AMS: { lat: 52.3676, lng: 4.9041 },
    BRU: { lat: 50.8503, lng: 4.3517 },
    ZRH: { lat: 47.3769, lng: 8.5417 },
    GVA: { lat: 46.2044, lng: 6.1432 },
    VIE: { lat: 48.2082, lng: 16.3738 },
  
    // Nordics
    CPH: { lat: 55.6761, lng: 12.5683 },
    ARN: { lat: 59.3293, lng: 18.0686 },
    OSL: { lat: 59.9139, lng: 10.7522 },
    HEL: { lat: 60.1699, lng: 24.9384 },
  
    // Eastern Europe
    WAW: { lat: 52.2297, lng: 21.0122 },
    PRG: { lat: 50.0755, lng: 14.4378 },
    BUD: { lat: 47.4979, lng: 19.0402 },
    ATH: { lat: 37.9838, lng: 23.7275 },
    IST: { lat: 41.0082, lng: 28.9784 },
    MOW: { lat: 55.7558, lng: 37.6173 },
  
    // Middle East
    DXB: { lat: 25.2048, lng: 55.2708 },
    AUH: { lat: 24.4539, lng: 54.3773 },
    DOH: { lat: 25.2854, lng: 51.5310 },
    RUH: { lat: 24.7136, lng: 46.6753 },
    JED: { lat: 21.4858, lng: 39.1925 },
    KWI: { lat: 29.3759, lng: 47.9774 },
    BAH: { lat: 26.2285, lng: 50.5860 },
    MCT: { lat: 23.5880, lng: 58.3829 },
    AMM: { lat: 31.9454, lng: 35.9284 },
    BEY: { lat: 33.8938, lng: 35.5018 },
    TLV: { lat: 32.0853, lng: 34.7818 },
  
    // Africa
    CAI: { lat: 30.0444, lng: 31.2357 },
    CMN: { lat: 33.5731, lng: -7.5898 },
    RAK: { lat: 31.6295, lng: -7.9811 },
    LOS: { lat: 6.5244, lng: 3.3792 },
    ABV: { lat: 9.0765, lng: 7.3986 },
    PHC: { lat: 4.8156, lng: 7.0498 },
    ACC: { lat: 5.6037, lng: -0.1870 },
    NBO: { lat: -1.2864, lng: 36.8172 },
    ADD: { lat: 9.0320, lng: 38.7469 },
    JNB: { lat: -26.2041, lng: 28.0473 },
    CPT: { lat: -33.9249, lng: 18.4241 },
    DUR: { lat: -29.8587, lng: 31.0218 },
    MRU: { lat: -20.1609, lng: 57.5012 },
  
    // Americas
    NYC: { lat: 40.7128, lng: -74.0060 },
    JFK: { lat: 40.7128, lng: -74.0060 },
    LAX: { lat: 34.0522, lng: -118.2437 },
    MIA: { lat: 25.7617, lng: -80.1918 },
    CHI: { lat: 41.8781, lng: -87.6298 },
    ORD: { lat: 41.8781, lng: -87.6298 },
    SFO: { lat: 37.7749, lng: -122.4194 },
    SEA: { lat: 47.6062, lng: -122.3321 },
    BOS: { lat: 42.3601, lng: -71.0589 },
    WAS: { lat: 38.9072, lng: -77.0369 },
    ATL: { lat: 33.7490, lng: -84.3880 },
    LAS: { lat: 36.1699, lng: -115.1398 },
    MCO: { lat: 28.5383, lng: -81.3792 },
    TOR: { lat: 43.6532, lng: -79.3832 },
    YYZ: { lat: 43.6532, lng: -79.3832 },
    YVR: { lat: 49.2827, lng: -123.1207 },
    YUL: { lat: 45.5017, lng: -73.5673 },
    MEX: { lat: 19.4326, lng: -99.1332 },
    CUN: { lat: 21.1619, lng: -86.8515 },
    SAO: { lat: -23.5505, lng: -46.6333 },
    GRU: { lat: -23.5505, lng: -46.6333 },
    RIO: { lat: -22.9068, lng: -43.1729 },
    BUE: { lat: -34.6037, lng: -58.3816 },
    SCL: { lat: -33.4489, lng: -70.6693 },
    LIM: { lat: -12.0464, lng: -77.0428 },
    BOG: { lat: 4.7110, lng: -74.0721 },
  
    // Asia
    SIN: { lat: 1.3521, lng: 103.8198 },
    BKK: { lat: 13.7563, lng: 100.5018 },
    HKT: { lat: 7.8804, lng: 98.3923 },
    KUL: { lat: 3.1390, lng: 101.6869 },
    CGK: { lat: -6.2088, lng: 106.8456 },
    DPS: { lat: -8.4095, lng: 115.1889 },
    MNL: { lat: 14.5995, lng: 120.9842 },
    HAN: { lat: 21.0278, lng: 105.8342 },
    SGN: { lat: 10.7769, lng: 106.7009 },
    HKG: { lat: 22.3193, lng: 114.1694 },
    TPE: { lat: 25.0330, lng: 121.5654 },
    TYO: { lat: 35.6762, lng: 139.6503 },
    HND: { lat: 35.6762, lng: 139.6503 },
    OSA: { lat: 34.6937, lng: 135.5023 },
    SEL: { lat: 37.5665, lng: 126.9780 },
    ICN: { lat: 37.5665, lng: 126.9780 },
    BJS: { lat: 39.9042, lng: 116.4074 },
    PEK: { lat: 39.9042, lng: 116.4074 },
    SHA: { lat: 31.2304, lng: 121.4737 },
    PVG: { lat: 31.2304, lng: 121.4737 },
    DEL: { lat: 28.6139, lng: 77.2090 },
    BOM: { lat: 19.0760, lng: 72.8777 },
    BLR: { lat: 12.9716, lng: 77.5946 },
    MAA: { lat: 13.0827, lng: 80.2707 },
  
    // Oceania
    SYD: { lat: -33.8688, lng: 151.2093 },
    MEL: { lat: -37.8136, lng: 144.9631 },
    BNE: { lat: -27.4698, lng: 153.0251 },
    PER: { lat: -31.9505, lng: 115.8605 },
    AKL: { lat: -36.8485, lng: 174.7633 },
  };
  
  /**
   * Resolve a display name for a city, preferring an existing name if present.
   */
  export function resolveCityName(
    cityCode?: string,
    cityName?: string,
  ): string {
    const trimmedName = (cityName || '').trim();
    if (trimmedName) return trimmedName;
  
    const code = (cityCode || '').toUpperCase().trim();
    if (!code) return '';
  
    return CITY_CODE_TO_NAME[code] || '';
  }
  
  /**
   * Look up a city's approximate center coordinates.
   */
  export function getCityCenter(
    cityCode?: string,
  ): { lat: number; lng: number } | null {
    const code = (cityCode || '').toUpperCase().trim();
    if (!code) return null;
    return CITY_CENTERS[code] || null;
  }
  
  /**
   * Straight-line (haversine) distance in metres between two lat/lng pairs.
   */
  export function distanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)));
  }
  
  /**
   * Format metres into a value + unit pair (e.g. { value: '350', unit: 'm' }).
   */
  export function formatDistance(meters: number): { value: string; unit: string } {
    if (meters < 1000) return { value: String(meters), unit: 'm' };
    return { value: (meters / 1000).toFixed(1), unit: 'km' };
  }
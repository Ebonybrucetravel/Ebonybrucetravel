// lib/amenities.ts

export type Amenity = {
    label: string;
    icon: string; // Font Awesome name without the `fa-` prefix
  };
  
  // Used when an amenity isn't in the map so nothing is ever iconless
  const FALLBACK_ICON = 'circle-info';
  
  export const AMENITY_LABEL_MAP: Record<string, Amenity> = {
    // Connectivity
    WIFI: { label: 'Free WiFi', icon: 'wifi' },
    FREE_WIFI: { label: 'Free WiFi', icon: 'wifi' },
    WIRELESS_CONNECTIVITY_IN_ROOMS: { label: 'Free WiFi', icon: 'wifi' },
    INTERNET: { label: 'Internet', icon: 'globe' },
    HIGH_SPEED_INTERNET: { label: 'High-speed WiFi', icon: 'wifi' },
    BROADBAND: { label: 'Broadband', icon: 'wifi' },
    DATA_PORT: { label: 'Data Port', icon: 'ethernet' },
    DATAPORT: { label: 'Data Port', icon: 'ethernet' },
  
    // Climate
    AIR_CONDITIONING: { label: 'A/C', icon: 'snowflake' },
    HEATING: { label: 'Heating', icon: 'fire' },
    FAN: { label: 'Fan', icon: 'fan' },
  
    // Room
    NON_SMOKING_ROOMS: { label: 'Non-Smoking', icon: 'ban-smoking' },
    SMOKING_ROOMS: { label: 'Smoking Allowed', icon: 'smoking' },
    ALARM_CLOCK: { label: 'Alarm Clock', icon: 'bell' },
    ALL_NEWS_CHANNEL: { label: 'News Channels', icon: 'newspaper' },
    AM_OR_FM_RADIO: { label: 'Radio', icon: 'radio' },
    BATHROOM_AMENITIES: { label: 'Bathroom Amenities', icon: 'bath' },
    UPGRADED_BATHROOM_AMENITIES: { label: 'Upgraded Bathroom', icon: 'spray-can-sparkles' },
    PRIVATE_BATHROOM: { label: 'Private Bathroom', icon: 'bath' },
    CABLE_TELEVISION: { label: 'Cable TV', icon: 'tv' },
    SATELLITE_TV: { label: 'Satellite TV', icon: 'satellite-dish' },
    FLAT_SCREEN_TV: { label: 'Flat-screen TV', icon: 'tv' },
    TELEVISION: { label: 'TV', icon: 'tv' },
    TV: { label: 'TV', icon: 'tv' },
    TELEPHONE: { label: 'Telephone', icon: 'phone' },
    DESK: { label: 'Desk', icon: 'table' },
    SAFE: { label: 'Safe', icon: 'lock' },
    IN_ROOM_SAFE: { label: 'In-room Safe', icon: 'lock' },
    IRON: { label: 'Iron', icon: 'shirt' },
    IRONING_BOARD: { label: 'Ironing Board', icon: 'shirt' },
    IRON_AND_IRONING_BOARD: { label: 'Iron & Ironing Board', icon: 'shirt' },
    HAIRDRYER: { label: 'Hairdryer', icon: 'wind' },
    HAIR_DRYER: { label: 'Hairdryer', icon: 'wind' },
    MINIBAR: { label: 'Minibar', icon: 'wine-bottle' },
    MINI_BAR: { label: 'Minibar', icon: 'wine-bottle' },
    REFRIGERATOR: { label: 'Fridge', icon: 'snowflake' },
    KITCHEN: { label: 'Kitchen', icon: 'kitchen-set' },
    KITCHENETTE: { label: 'Kitchenette', icon: 'kitchen-set' },
    MICROWAVE: { label: 'Microwave', icon: 'fire-burner' },
    COFFEE_MAKER: { label: 'Coffee Maker', icon: 'mug-hot' },
    TEA_AND_COFFEE: { label: 'Tea & Coffee', icon: 'mug-saucer' },
    TEA_AND_COFFEE_MAKING_FACILITIES: { label: 'Tea & Coffee', icon: 'mug-saucer' },
    TEA_COFFEE_MAKER: { label: 'Tea & Coffee Maker', icon: 'mug-saucer' },
  
    // Wellness
    SWIMMING_POOL: { label: 'Pool', icon: 'person-swimming' },
    INDOOR_POOL: { label: 'Indoor Pool', icon: 'person-swimming' },
    OUTDOOR_POOL: { label: 'Outdoor Pool', icon: 'person-swimming' },
    SPA: { label: 'Spa', icon: 'spa' },
    FITNESS_CENTER: { label: 'Gym', icon: 'dumbbell' },
    FITNESS_FACILITIES: { label: 'Gym', icon: 'dumbbell' },
    HEALTH_CLUB: { label: 'Health Club', icon: 'dumbbell' },
    UNIVERSAL_GYM: { label: 'Gym', icon: 'dumbbell' },
    SAUNA: { label: 'Sauna', icon: 'hot-tub-person' },
    JACUZZI: { label: 'Jacuzzi', icon: 'hot-tub-person' },
    MASSAGE: { label: 'Massage', icon: 'spa' },
    STEAM_ROOM: { label: 'Steam Room', icon: 'hot-tub-person' },
    BEAUTY_SALON: { label: 'Beauty Salon', icon: 'scissors' },
  
    // Food & drink
    RESTAURANT: { label: 'Restaurant', icon: 'utensils' },
    FINE_DINING: { label: 'Fine Dining', icon: 'utensils' },
    BAR: { label: 'Bar', icon: 'martini-glass' },
    LOUNGE: { label: 'Lounge', icon: 'martini-glass-citrus' },
    LOUNGE_BAR: { label: 'Lounge/Bar', icon: 'martini-glass-citrus' },
    ROOM_SERVICE: { label: 'Room Service', icon: 'bell-concierge' },
    BREAKFAST: { label: 'Breakfast', icon: 'mug-saucer' },
    BUFFET_BREAKFAST: { label: 'Buffet Breakfast', icon: 'mug-saucer' },
    CAFE: { label: 'Café', icon: 'mug-hot' },
    COFFEE_SHOP: { label: 'Coffee Shop', icon: 'mug-hot' },
  
    // Services
    PARKING: { label: 'Parking', icon: 'square-parking' },
    FREE_PARKING: { label: 'Free Parking', icon: 'square-parking' },
    VALET_PARKING: { label: 'Valet Parking', icon: 'square-parking' },
    PARKING_VALET: { label: 'Valet Parking', icon: 'square-parking' },
    GARAGE: { label: 'Garage', icon: 'square-parking' },
    GARAGE_COVERED_PARKING: { label: 'Covered Parking', icon: 'square-parking' },
    HANDICAP_PARKING: { label: 'Accessible Parking', icon: 'wheelchair' },
    AIRPORT_SHUTTLE: { label: 'Airport Shuttle', icon: 'van-shuttle' },
    SHUTTLE_SERVICE: { label: 'Shuttle', icon: 'van-shuttle' },
    SHUTTLE_SERVICES_TO_THE_DUBAI_MALL: { label: 'Shuttle Service', icon: 'van-shuttle' },
    SHUTTLE_TO_LOCAL_BUSINESSES: { label: 'Shuttle', icon: 'van-shuttle' },
    CAR_RENTAL: { label: 'Car Rental', icon: 'car' },
    CAR_RENTAL_DESK: { label: 'Car Rental', icon: 'car' },
    TAXI_SERVICE: { label: 'Taxi Service', icon: 'taxi' },
    LAUNDRY: { label: 'Laundry', icon: 'shirt' },
    LAUNDRY_SERVICE: { label: 'Laundry', icon: 'shirt' },
    GUEST_LAUNDRY_FACILITY: { label: 'Guest Laundry', icon: 'shirt' },
    DRY_CLEANING: { label: 'Dry Cleaning', icon: 'shirt' },
    DRY_CLEANING_SAME_DAY: { label: 'Same-day Dry Cleaning', icon: 'shirt' },
    CONCIERGE: { label: 'Concierge', icon: 'bell-concierge' },
    TWENTY_FOUR_HOUR_FRONT_DESK: { label: '24h Front Desk', icon: 'bell-concierge' },
    FRONT_DESK_24_HOURS: { label: '24h Front Desk', icon: 'bell-concierge' },
    ELEVATOR: { label: 'Elevator', icon: 'elevator' },
    ELEVATORS: { label: 'Elevator', icon: 'elevator' },
    LUGGAGE_STORAGE: { label: 'Luggage Storage', icon: 'suitcase' },
    CURRENCY_EXCHANGE: { label: 'Currency Exchange', icon: 'money-bill-transfer' },
    ATM: { label: 'ATM', icon: 'money-bill' },
    GIFT_SHOP: { label: 'Gift Shop', icon: 'gift' },
    NIGHTCLUB: { label: 'Nightclub', icon: 'music' },
    TOUR_DESK: { label: 'Tour Desk', icon: 'map' },
    TRAVEL_DESK_ON_SITE_CHARGEABLE: { label: 'Travel Desk', icon: 'map' },
    WAKEUP_CALLS: { label: 'Wake-up Calls', icon: 'bell' },
    CONVENIENCE_STORE_THAT_SELLS_FOOD: { label: 'Convenience Store', icon: 'basket-shopping' },
    BELLMAN: { label: 'Bellman', icon: 'bell-concierge' },
    DOCTOR_ON_CALL: { label: 'Doctor on Call', icon: 'user-doctor' },
    NEWSPAPER: { label: 'Newspaper', icon: 'newspaper' },
    SHOE_SHINE: { label: 'Shoe Shine', icon: 'shoe-prints' },
    WEDDING_SERVICES: { label: 'Wedding Services', icon: 'heart' },
    WEDDING_SERVICES_YOGA: { label: 'Wedding Services / Yoga', icon: 'heart' },
    TRANSLATION_SERVICES: { label: 'Translation Services', icon: 'language' },
    LUXURY_LIMOUSINE_SERVICES_AVAILABLE_CHARGEABLE: { label: 'Limousine Service', icon: 'car-side' },
  
    // Accessibility / family
    WHEELCHAIR_ACCESSIBLE: { label: 'Wheelchair Access', icon: 'wheelchair' },
    ACCESSIBLE_FACILITIES: { label: 'Accessible', icon: 'wheelchair' },
    ACCESSIBLE_BATHS: { label: 'Accessible Baths', icon: 'wheelchair' },
    ACCESSIBLE_WASH_BASINS: { label: 'Accessible Wash Basins', icon: 'wheelchair' },
    ACCESSIBLE_ELEVATORS: { label: 'Accessible Elevators', icon: 'wheelchair' },
    ACCESSIBLE_LIGHT_SWITCH: { label: 'Accessible Light Switch', icon: 'wheelchair' },
    FAMILY_ROOMS: { label: 'Family Rooms', icon: 'children' },
    PETS_ALLOWED: { label: 'Pets Allowed', icon: 'paw' },
    CHILDCARE: { label: 'Childcare', icon: 'baby' },
    CHILDREN_PROGRAMS: { label: 'Children Programs', icon: 'children' },
    CHILDRENS_ACTIVITIES: { label: 'Children Activities', icon: 'children' },
    PLAY_GROUND: { label: 'Playground', icon: 'child-reaching' },
    PUBLIC_GARDEN_AND_CHILDREN_PLAY_AREA: { label: 'Garden & Play Area', icon: 'tree' },
  
    // Business
    BUSINESS_CENTER: { label: 'Business Center', icon: 'briefcase' },
    BUSINESS_CENTER_SERVICES: { label: 'Business Center', icon: 'briefcase' },
    MEETING_ROOMS: { label: 'Meeting Rooms', icon: 'users' },
    CONFERENCE_FACILITIES: { label: 'Conference Rooms', icon: 'users' },
    AV_EQUIPMENT: { label: 'AV Equipment', icon: 'video' },
    COMPUTER_RENTAL: { label: 'Computer Rental', icon: 'laptop' },
    PC_AND_PRINTER_AVAILABLE: { label: 'PC & Printer', icon: 'print' },
    COPY_SERVICE: { label: 'Copy Service', icon: 'copy' },
    FAXING_INCOMING: { label: 'Faxing (Incoming)', icon: 'fax' },
    FAXING_OUTGOING: { label: 'Faxing (Outgoing)', icon: 'fax' },
  
    // Recreation
    JOGGING_TRACK: { label: 'Jogging Track', icon: 'person-running' },
    PUBLIC_JOGGING_TRACK: { label: 'Jogging Track', icon: 'person-running' },
    JOGGING_TRACK_TRAIL: { label: 'Jogging Trail', icon: 'person-running' },
    YOGA: { label: 'Yoga', icon: 'spa' },
    TREADMILL: { label: 'Treadmill', icon: 'person-running' },
    LOCKER_ROOM: { label: 'Locker Room', icon: 'lock' },
    SUN_BED: { label: 'Sun Bed', icon: 'sun' },
    SHOPPING: { label: 'Shopping', icon: 'bag-shopping' },
    SIGHTSEEING_TOURS: { label: 'Sightseeing Tours', icon: 'map-location-dot' },
    SWIMMING: { label: 'Swimming', icon: 'person-swimming' },
    STEAM_BATHING: { label: 'Steam Bath', icon: 'hot-tub-person' },
    EXECUTIVE_OR_CLUB_FLOORS: { label: 'Executive Floors', icon: 'star' },
    EXECUTIVE_FLOORS: { label: 'Executive Floors', icon: 'star' },
    ROOM_UPGRADE: { label: 'Room Upgrade', icon: 'arrow-up' },
  };
  
  function looksLikeCode(s: string): boolean {
    if (!s) return false;
    return /^[A-Z0-9_]+$/.test(s) && s.length <= 80;
  }
  
  function toMapKey(s: string): string {
    return s
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  
  function humanise(key: string): string {
    return key
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  
  export function extractAmenities(source: any): Amenity[] {
    if (!source) return [];
  
    const raw: string[] = [];
  
    const push = (arr: any) => {
      if (!Array.isArray(arr)) return;
      for (const a of arr) {
        if (!a) continue;
        if (typeof a === 'string') {
          raw.push(a);
        } else if (typeof a === 'object') {
          if (typeof a.label === 'string') raw.push(a.label);
          else if (typeof a.description === 'string') raw.push(a.description);
          else if (typeof a.code === 'string') raw.push(a.code);
          else if (typeof a.amenityCode === 'string') raw.push(a.amenityCode);
        }
      }
    };
  
    push(source.hotel?.amenities);
    push(source.hotel?.amenityLabels);
    push(source.hotel?.facilities);
    push(source.amenities);
    push(source.amenityLabels);
  
    const offerList = source.offers || (source.offer ? [source.offer] : []);
    for (const offer of offerList) {
      if (!offer) continue;
      push(offer.amenities);
      push(offer.amenityLabels);
      push(offer.room?.roomInformation?.amenities);
      push(offer.roomInformation?.amenities);
      push(offer.room?.amenities);
    }
  
    const resolved: Amenity[] = [];
  
    for (const item of raw) {
      const trimmed = item.trim();
      if (!trimmed) continue;
  
      if (looksLikeCode(trimmed)) {
        const key = trimmed.toUpperCase();
        const mapped = AMENITY_LABEL_MAP[key];
        if (mapped) {
          resolved.push(mapped);
        } else {
          resolved.push({ label: humanise(key), icon: FALLBACK_ICON });
        }
      } else {
        const normalised = toMapKey(trimmed);
        const mappedFromText = normalised ? AMENITY_LABEL_MAP[normalised] : undefined;
        resolved.push(mappedFromText || { label: trimmed, icon: FALLBACK_ICON });
      }
    }
  
    const seen = new Set<string>();
    const unique: Amenity[] = [];
    for (const item of resolved) {
      const key = item.label.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
  
    return unique;
  }
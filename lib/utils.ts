export const currencySymbol = (code: string) => {
    const map: Record<string, string> = { USD: '$', GBP: '£', EUR: '€', NGN: '₦' };
    return map[code] ?? code;
};
export const formatPrice = (amount: number, currency = 'GBP') => `${currencySymbol(currency)}${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const extractAirportCode = (display: string): string => {
    if (!display?.trim())
        return '';
    const patterns = [/^([A-Z]{3})$/, /\(([A-Z]{3})\)/, /^([A-Z]{3})\b/, /([A-Z]{3})/];
    for (const p of patterns) {
        const m = display.trim().match(p);
        if (m?.[1])
            return m[1];
    }
    const first3 = display.trim().substring(0, 3).toUpperCase();
    return /^[A-Z]{3}$/.test(first3) ? first3 : '';
};
const AIRLINE_IMAGES: Record<string, string> = {
    'Air Peace': 'https://logos-world.net/wp-content/uploads/2023/03/Air-Peace-Logo.png',
    'Ibom Air': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Ibom_Air_logo.png/1200px-Ibom_Air_logo.png',
    'Qatar Airways': 'https://logowik.com/content/uploads/images/qatar-airways8336.jpg',
    'British Airways': 'https://logowik.com/content/uploads/images/british-airways8001.jpg',
    Emirates: 'https://logowik.com/content/uploads/images/emirates-airline3232.logowik.com.webp',
    Lufthansa: 'https://logowik.com/content/uploads/images/lufthansa9090.jpg',
    KLM: 'https://logowik.com/content/uploads/images/klm-royal-dutch-airlines8141.jpg',
    Delta: 'https://logowik.com/content/uploads/images/delta-air-lines9725.jpg',
    'United Airlines': 'https://logowik.com/content/uploads/images/united-airlines9763.jpg',
    'American Airlines': 'https://logowik.com/content/uploads/images/american-airlines.jpg',
};
export const getAirlineImage = (airline: string) => AIRLINE_IMAGES[airline] ??
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=800';
export type ProductType = 'FLIGHT_INTERNATIONAL' | 'FLIGHT_DOMESTIC' | 'HOTEL' | 'CAR_RENTAL';
export type Provider = 'DUFFEL' | 'AMADEUS' | 'TRIPS_AFRICA' | 'BOOKING_COM';
export const getProductMeta = (itemType?: string): {
    productType: ProductType;
    provider: Provider;
} => {
    switch (itemType) {
        case 'hotels':
            return { productType: 'HOTEL', provider: 'AMADEUS' };
        case 'car-rentals':
            return { productType: 'CAR_RENTAL', provider: 'AMADEUS' };
        default:
            return { productType: 'FLIGHT_INTERNATIONAL', provider: 'DUFFEL' };
    }
};
export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

// app/context/LanguageContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Match the types used in your Navbar
type LanguageCode = 'EN' | 'FR' | 'ES' | 'DE' | 'ZH';
type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'NGN' | 'JPY' | 'CNY';

interface Currency {
  code: CurrencyCode;
  symbol: string;
  name?: string;
}

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Complete translation dictionary
const translations: Record<LanguageCode, Record<string, string>> = {
  EN: {
    // Navbar
    'nav.flights': 'Flights',
    'nav.hotels': 'Hotels',
    'nav.cars': 'Cars',
    'nav.signIn': 'Sign In',
    'nav.register': 'Register',
    
    // Trending Destinations
    'trending.title': 'Trending Destinations',
    'trending.subtitle': 'Discover the most popular destinations for your next trip',
    'trending.viewAll': 'View All Destinations',
    
    // Homes
    'homes.title': 'Beautiful Homes & Rooms',
    'homes.subtitle': 'Discover comfortable stays around the world',
    'homes.explore': 'Explore all',
    'homes.night': 'night',
    'homes.book': 'Book Now',
    
    // Cars
    'cars.title': 'Car Rentals',
    'cars.subtitle': 'Find the perfect vehicle for your journey',
    'cars.seeMore': 'See more cars',
    'cars.day': 'day',
    'cars.rentNow': 'Rent Now',
    
    // Footer
    'footer.company': 'Company',
    'footer.aboutUs': 'About Us',
    'footer.services': 'Services',
    'footer.career': 'Career',
    'footer.pressCenter': 'Press Center',
    'footer.investorRelation': 'Investor Relation',
    'footer.sustainability': 'Sustainability',
    
    'footer.support': 'Support',
    'footer.helpCenter': 'Help Center',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.partnerDispute': 'Partner Dispute',
    'footer.humanRights': 'Human Right Statement',
    'footer.accessibility': 'Accessibility Statement',
    
    'footer.discover': 'Discover',
    'footer.flights': 'Flights',
    'footer.hotels': 'Hotels',
    'footer.carRentals': 'Car Rentals',
    'footer.myBookings': 'My Bookings',
    'footer.travelArticles': 'Travel Articles',
    'footer.agents': 'Agents',
    'footer.holidayDeals': 'Season and Holiday deals',
    'footer.description': 'Explore the world with a partner you can trust. Book flights, hotels, and cars with confidence.',
    'footer.rights': 'All rights reserved.',
    'footer.disclaimer': 'Prices shown are for reference only and may vary.',
  },
  FR: {
    // Navbar
    'nav.flights': 'Vols',
    'nav.hotels': 'Hôtels',
    'nav.cars': 'Voitures',
    'nav.signIn': 'Se Connecter',
    'nav.register': 'S\'inscrire',
    
    // Trending Destinations
    'trending.title': 'Destinations Tendances',
    'trending.subtitle': 'Découvrez les destinations les plus populaires pour votre prochain voyage',
    'trending.viewAll': 'Voir Toutes les Destinations',
    
    // Homes
    'homes.title': 'Maisons et Chambres Magnifiques',
    'homes.subtitle': 'Découvrez des séjours confortables dans le monde entier',
    'homes.explore': 'Tout Explorer',
    'homes.night': 'nuit',
    'homes.book': 'Réserver Maintenant',
    
    // Cars
    'cars.title': 'Location de Voitures',
    'cars.subtitle': 'Trouvez le véhicule parfait pour votre voyage',
    'cars.seeMore': 'Voir plus de voitures',
    'cars.day': 'jour',
    'cars.rentNow': 'Louer Maintenant',
    
    // Footer
    'footer.company': 'Entreprise',
    'footer.aboutUs': 'À Propos de Nous',
    'footer.services': 'Services',
    'footer.career': 'Carrière',
    'footer.pressCenter': 'Centre de Presse',
    'footer.investorRelation': 'Relations Investisseurs',
    'footer.sustainability': 'Durabilité',
    
    'footer.support': 'Support',
    'footer.helpCenter': 'Centre d\'Aide',
    'footer.terms': 'Conditions d\'Utilisation',
    'footer.privacy': 'Politique de Confidentialité',
    'footer.partnerDispute': 'Litige Partenaire',
    'footer.humanRights': 'Déclaration des Droits de l\'Homme',
    'footer.accessibility': 'Déclaration d\'Accessibilité',
    
    'footer.discover': 'Découvrir',
    'footer.flights': 'Vols',
    'footer.hotels': 'Hôtels',
    'footer.carRentals': 'Location de Voitures',
    'footer.myBookings': 'Mes Réservations',
    'footer.travelArticles': 'Articles de Voyage',
    'footer.agents': 'Agents',
    'footer.holidayDeals': 'Offres Saisonnières et de Vacances',
    'footer.description': 'Explorez le monde avec un partenaire de confiance. Réservez des vols, hôtels et voitures en toute confiance.',
    'footer.rights': 'Tous droits réservés.',
    'footer.disclaimer': 'Les prix indiqués sont à titre indicatif seulement et peuvent varier.',
  },
  ES: {
    // Navbar
    'nav.flights': 'Vuelos',
    'nav.hotels': 'Hoteles',
    'nav.cars': 'Coches',
    'nav.signIn': 'Iniciar Sesión',
    'nav.register': 'Registrarse',
    
    // Trending Destinations
    'trending.title': 'Destinos Populares',
    'trending.subtitle': 'Descubre los destinos más populares para tu próximo viaje',
    'trending.viewAll': 'Ver Todos los Destinos',
    
    // Homes
    'homes.title': 'Hogares y Habitaciones Hermosos',
    'homes.subtitle': 'Descubre estancias cómodas en todo el mundo',
    'homes.explore': 'Explorar Todo',
    'homes.night': 'noche',
    'homes.book': 'Reservar Ahora',
    
    // Cars
    'cars.title': 'Alquiler de Coches',
    'cars.subtitle': 'Encuentra el vehículo perfecto para tu viaje',
    'cars.seeMore': 'Ver más coches',
    'cars.day': 'día',
    'cars.rentNow': 'Alquilar Ahora',
    
    // Footer
    'footer.company': 'Empresa',
    'footer.aboutUs': 'Sobre Nosotros',
    'footer.services': 'Servicios',
    'footer.career': 'Carrera',
    'footer.pressCenter': 'Centro de Prensa',
    'footer.investorRelation': 'Relación con Inversores',
    'footer.sustainability': 'Sostenibilidad',
    
    'footer.support': 'Soporte',
    'footer.helpCenter': 'Centro de Ayuda',
    'footer.terms': 'Términos de Servicio',
    'footer.privacy': 'Política de Privacidad',
    'footer.partnerDispute': 'Disputa de Socio',
    'footer.humanRights': 'Declaración de Derechos Humanos',
    'footer.accessibility': 'Declaración de Accesibilidad',
    
    'footer.discover': 'Descubrir',
    'footer.flights': 'Vuelos',
    'footer.hotels': 'Hoteles',
    'footer.carRentals': 'Alquiler de Coches',
    'footer.myBookings': 'Mis Reservas',
    'footer.travelArticles': 'Artículos de Viaje',
    'footer.agents': 'Agentes',
    'footer.holidayDeals': 'Ofertas de Temporada y Vacaciones',
    'footer.description': 'Explora el mundo con un socio en el que puedas confiar. Reserva vuelos, hoteles y coches con confianza.',
    'footer.rights': 'Todos los derechos reservados.',
    'footer.disclaimer': 'Los precios mostrados son solo de referencia y pueden variar.',
  },
  DE: {
    // Navbar
    'nav.flights': 'Flüge',
    'nav.hotels': 'Hotels',
    'nav.cars': 'Autos',
    'nav.signIn': 'Anmelden',
    'nav.register': 'Registrieren',
    
    // Trending Destinations
    'trending.title': 'Trendziele',
    'trending.subtitle': 'Entdecken Sie die beliebtesten Ziele für Ihre nächste Reise',
    'trending.viewAll': 'Alle Ziele Anzeigen',
    
    // Homes
    'homes.title': 'Schöne Häuser & Zimmer',
    'homes.subtitle': 'Entdecken Sie komfortable Unterkünfte weltweit',
    'homes.explore': 'Alles Erkunden',
    'homes.night': 'Nacht',
    'homes.book': 'Jetzt Buchen',
    
    // Cars
    'cars.title': 'Autovermietung',
    'cars.subtitle': 'Finden Sie das perfekte Fahrzeug für Ihre Reise',
    'cars.seeMore': 'Mehr Autos Anzeigen',
    'cars.day': 'Tag',
    'cars.rentNow': 'Jetzt Mieten',
    
    // Footer
    'footer.company': 'Unternehmen',
    'footer.aboutUs': 'Über Uns',
    'footer.services': 'Dienstleistungen',
    'footer.career': 'Karriere',
    'footer.pressCenter': 'Pressezentrum',
    'footer.investorRelation': 'Investor Relations',
    'footer.sustainability': 'Nachhaltigkeit',
    
    'footer.support': 'Support',
    'footer.helpCenter': 'Hilfe-Center',
    'footer.terms': 'Nutzungsbedingungen',
    'footer.privacy': 'Datenschutzrichtlinie',
    'footer.partnerDispute': 'Partnerstreitigkeit',
    'footer.humanRights': 'Menschenrechtserklärung',
    'footer.accessibility': 'Barrierefreiheitserklärung',
    
    'footer.discover': 'Entdecken',
    'footer.flights': 'Flüge',
    'footer.hotels': 'Hotels',
    'footer.carRentals': 'Autovermietung',
    'footer.myBookings': 'Meine Buchungen',
    'footer.travelArticles': 'Reiseartikel',
    'footer.agents': 'Agenten',
    'footer.holidayDeals': 'Saison- und Urlaubsangebote',
    'footer.description': 'Erkunden Sie die Welt mit einem vertrauenswürdigen Partner. Buchen Sie Flüge, Hotels und Autos mit Vertrauen.',
    'footer.rights': 'Alle Rechte vorbehalten.',
    'footer.disclaimer': 'Die angezeigten Preise dienen nur zur Referenz und können variieren.',
  },
  ZH: {
    // Navbar
    'nav.flights': '航班',
    'nav.hotels': '酒店',
    'nav.cars': '汽车',
    'nav.signIn': '登录',
    'nav.register': '注册',
    
    // Trending Destinations
    'trending.title': '热门目的地',
    'trending.subtitle': '为您的下一次旅行发现最受欢迎的目的地',
    'trending.viewAll': '查看所有目的地',
    
    // Homes
    'homes.title': '美丽的住宅和房间',
    'homes.subtitle': '发现世界各地的舒适住宿',
    'homes.explore': '探索全部',
    'homes.night': '晚',
    'homes.book': '立即预订',
    
    // Cars
    'cars.title': '汽车租赁',
    'cars.subtitle': '为您的旅程找到完美车辆',
    'cars.seeMore': '查看更多汽车',
    'cars.day': '天',
    'cars.rentNow': '立即租赁',
    
    // Footer
    'footer.company': '公司',
    'footer.aboutUs': '关于我们',
    'footer.services': '服务',
    'footer.career': '职业',
    'footer.pressCenter': '新闻中心',
    'footer.investorRelation': '投资者关系',
    'footer.sustainability': '可持续性',
    
    'footer.support': '支持',
    'footer.helpCenter': '帮助中心',
    'footer.terms': '服务条款',
    'footer.privacy': '隐私政策',
    'footer.partnerDispute': '合作伙伴争议',
    'footer.humanRights': '人权声明',
    'footer.accessibility': '可访问性声明',
    
    'footer.discover': '发现',
    'footer.flights': '航班',
    'footer.hotels': '酒店',
    'footer.carRentals': '汽车租赁',
    'footer.myBookings': '我的预订',
    'footer.travelArticles': '旅行文章',
    'footer.agents': '代理商',
    'footer.holidayDeals': '季节和假日优惠',
    'footer.description': '与值得信赖的合作伙伴一起探索世界。自信地预订航班、酒店和汽车。',
    'footer.rights': '版权所有。',
    'footer.disclaimer': '显示的价格仅供参考，可能会有所变动。',
  },
};

// Default currencies for each language
const defaultCurrencies: Record<LanguageCode, Currency> = {
  EN: { code: 'USD', symbol: '$', name: 'US Dollar' },
  FR: { code: 'EUR', symbol: '€', name: 'Euro' },
  ES: { code: 'EUR', symbol: '€', name: 'Euro' },
  DE: { code: 'EUR', symbol: '€', name: 'Euro' },
  ZH: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>('EN');
  const [currency, setCurrency] = useState<Currency>(defaultCurrencies.EN);
  const [isClient, setIsClient] = useState(false);

  // Handle hydration and initialize from localStorage
  useEffect(() => {
    setIsClient(true);
    
    // Get language from localStorage
    const savedLang = localStorage.getItem('language') as LanguageCode;
    if (savedLang && translations[savedLang]) {
      setLanguage(savedLang);
      
      // Set default currency for language
      const defaultCurrency = defaultCurrencies[savedLang];
      if (defaultCurrency) {
        setCurrency(defaultCurrency);
      }
    } else {
      // Get language from browser preference
      const browserLang = navigator.language.toUpperCase();
      
      // Check if browser language is supported
      if (browserLang.startsWith('EN')) {
        setLanguage('EN');
        setCurrency(defaultCurrencies.EN);
      } else if (browserLang.startsWith('FR')) {
        setLanguage('FR');
        setCurrency(defaultCurrencies.FR);
      } else if (browserLang.startsWith('ES')) {
        setLanguage('ES');
        setCurrency(defaultCurrencies.ES);
      } else if (browserLang.startsWith('DE')) {
        setLanguage('DE');
        setCurrency(defaultCurrencies.DE);
      } else if (browserLang.startsWith('ZH')) {
        setLanguage('ZH');
        setCurrency(defaultCurrencies.ZH);
      }
    }
    
    // Get currency from localStorage
    const savedCurrency = localStorage.getItem('currency');
    if (savedCurrency) {
      try {
        const parsedCurrency = JSON.parse(savedCurrency);
        if (parsedCurrency?.code && parsedCurrency?.symbol) {
          setCurrency(parsedCurrency);
        }
      } catch (e) {
        console.error('Failed to parse saved currency:', e);
      }
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('language', language);
      document.documentElement.lang = language.toLowerCase();
    }
  }, [language, isClient]);

  useEffect(() => {
    if (isClient && currency) {
      localStorage.setItem('currency', JSON.stringify(currency));
    }
  }, [currency, isClient]);

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['EN'][key] || key;
  };

  const handleSetLanguage = (lang: LanguageCode) => {
    if (translations[lang]) {
      setLanguage(lang);
      
      // Update currency to language default when changing language
      const defaultCurrency = defaultCurrencies[lang];
      if (defaultCurrency) {
        setCurrency(defaultCurrency);
      }
    }
  };

  const handleSetCurrency = (curr: Currency) => {
    setCurrency(curr);
  };

  const value: LanguageContextType = {
    language,
    setLanguage: handleSetLanguage,
    currency,
    setCurrency: handleSetCurrency,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
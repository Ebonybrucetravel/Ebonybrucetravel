'use client';
import React from 'react';
import SearchBox from './SearchBox';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onSearch: (data: any) => void;
  loading: boolean;
  activeSearchTab?: 'flights' | 'hotels' | 'cars'; // Changed 'cars-rentals' to 'cars'
  onTabChange?: (tab: 'flights' | 'hotels' | 'cars') => void; // Changed to 'cars'
}

const Hero: React.FC<HeroProps> = ({ 
  onSearch, 
  loading, 
  activeSearchTab = 'flights',
  onTabChange 
}) => {
  const { t } = useLanguage();
  
  // Hotel search placeholder data
  const hotelDestinations = [
    { name: 'Lagos', code: 'LOS', image: 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGFnb3N8ZW58MHx8MHx8fDA%3D' },
    { name: 'London', code: 'LON', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=400' },
    { name: 'New York', code: 'NYC', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=400' },
    { name: 'Dubai', code: 'DXB', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400' },
  ];

  // Car rental placeholder data
  const carRentalLocations = [
    { name: 'Lagos Airport', code: 'LOS', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&q=80&w=400' },
    { name: 'London Heathrow', code: 'LHR', image: 'https://images.unsplash.com/photo-1580554530778-ca369439bcb8?auto=format&fit=crop&q=80&w=400' },
    { name: 'Dubai Airport', code: 'DXB', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=400' },
    { name: 'New York JFK', code: 'JFK', image: 'https://images.unsplash.com/photo-1563720223486-3294265d5a7c?auto=format&fit=crop&q=80&w=400' },
  ];
  
  // Get default dates for hotel/car search
  const getDefaultDates = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const checkOut = new Date(tomorrow);
    checkOut.setDate(tomorrow.getDate() + 3);
    
    return {
      checkIn: tomorrow.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      pickupDate: tomorrow.toISOString().split('T')[0] + 'T10:00:00',
      dropoffDate: checkOut.toISOString().split('T')[0] + 'T10:00:00'
    };
  };

  const defaultDates = getDefaultDates();

  // Helper function to check if active tab is a car-related tab
  const isCarTab = () => {
    return activeSearchTab === 'cars';
  };

  // Helper function to check if active tab is a hotel tab
  const isHotelTab = () => {
    return activeSearchTab === 'hotels';
  };

  // Handle quick hotel search for popular destinations
  const handleQuickHotelSearch = (destination: { name: string, code: string }) => {
    const searchData = {
      type: 'hotels',
      location: destination.name,
      cityCode: destination.code,
      checkInDate: defaultDates.checkIn,
      checkOutDate: defaultDates.checkOut,
      travellers: 2,
      rooms: 1,
      currency: 'GBP'
    };
    
    onSearch(searchData);
    
    // Switch to hotels tab if not already
    if (activeSearchTab !== 'hotels' && onTabChange) {
      onTabChange('hotels');
    }
  };

  // Handle quick car rental search for popular locations
  const handleQuickCarSearch = (location: { name: string, code: string }) => {
    const searchData = {
      type: 'cars', // Changed from 'car-rentals' to 'cars'
      pickupLocation: location.name,
      dropoffLocation: location.name, // Same location for round trip
      pickupLocationCode: location.code,
      dropoffLocationCode: location.code,
      pickupDateTime: defaultDates.pickupDate,
      dropoffDateTime: defaultDates.dropoffDate,
      passengers: 2,
      currency: 'GBP'
    };
    
    onSearch(searchData);
    
    // Switch to cars tab if not already
    if (!isCarTab() && onTabChange) {
      onTabChange('cars'); // Changed from 'car-rentals' to 'cars'
    }
  };

  return (
    <section className="relative min-h-[450px] md:min-h-[650px] flex items-center justify-center overflow-hidden py-4 md:py-6">
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/bg.jpg" 
          alt="Ebony Bruce Travels Background" 
          className="w-full h-full object-cover"
        />
       
      </div>
      
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 md:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 tracking-tight text-white drop-shadow-lg">
            {isHotelTab() 
              ? t('Find Your Perfect Stay') 
              : isCarTab()
              ? t('Ride in Comfort & Style')
              : t('Where Global Travel Becomes Easy')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-2xl mx-auto font-medium opacity-95 leading-relaxed">
            {isHotelTab()
              ? t('Discover amazing hotels with the best rates and amenities')
              : isCarTab()
              ? t('Book premium vehicles for your journey anywhere')
              : t('Discover flights, hotels, and car rentals at the best prices')}
          </p>
        </div>
        
        <div className="relative z-20 animate-in fade-in zoom-in-95 delay-300 duration-700 mb-4 md:mb-6">
          <SearchBox 
            onSearch={onSearch} 
            loading={loading} 
            activeTab={activeSearchTab}
            onTabChange={onTabChange}
          />
        </div>
        
        {/* Popular Destinations Section - Shows based on active tab */}
        {(isHotelTab() || isCarTab()) && (
          <div className="mt-8 md:mt-12 animate-in fade-in delay-500 duration-1000">
            <div className="text-center mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2 drop-shadow-md">
                {isHotelTab() 
                  ? t('Popular Hotel Destinations')
                  : t('Popular Car Rental Locations')}
              </h3>
              <p className="text-gray-200 text-sm md:text-base">
                {isHotelTab()
                  ? t('Find amazing hotels in these popular cities')
                  : t('Book cars at these popular locations')}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {(isHotelTab() ? hotelDestinations : carRentalLocations).map((item, index) => (
                <button
                  key={item.code}
                  onClick={() => isHotelTab() 
                    ? handleQuickHotelSearch(item) 
                    : handleQuickCarSearch(item)}
                  className="group relative overflow-hidden rounded-xl w-28 h-28 md:w-32 md:h-32 flex-shrink-0 animate-in fade-in slide-in-from-bottom-4"
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animationDuration: '500ms'
                  }}
                >
                  <div className="absolute inset-0">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                  </div>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-3">
                    <span className="text-white font-bold text-sm md:text-base drop-shadow-lg">
                      {item.name}
                    </span>
                    <span className="text-gray-200 text-xs mt-1 bg-black/30 px-2 py-0.5 rounded-full">
                      {item.code}
                    </span>
                  </div>
                  
                  {/* Hover overlay with color based on type */}
                  <div className={`absolute inset-0 ${
                    isHotelTab() 
                      ? 'bg-blue-500/0 group-hover:bg-blue-500/10' 
                      : 'bg-green-500/0 group-hover:bg-green-500/10'
                  } transition-all duration-300`}></div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Trust Indicators */}
        <div className="mt-10 md:mt-16 animate-in fade-in delay-700 duration-1000">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-white">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold mb-1">5000+</div>
              <div className="text-sm text-gray-200">{t('Happy Customers')}</div>
            </div>
            
            <div className="hidden md:block h-8 w-px bg-white/30"></div>
            
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold mb-1">200+</div>
              <div className="text-sm text-gray-200">
                {isHotelTab() 
                  ? t('Premium Hotels') 
                  : isCarTab()
                  ? t('Premium Vehicles')
                  : t('Global Partners')}
              </div>
            </div>
            
            <div className="hidden md:block h-8 w-px bg-white/30"></div>
            
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold mb-1">24/7</div>
              <div className="text-sm text-gray-200">{t('Customer Support')}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg 
          className="w-6 h-6 text-white/70" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 14l-7 7m0 0l-7-7m7 7V3" 
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
"use client";
import React from "react";
import SearchBox from "./SearchBox";
import { useLanguage } from "../context/LanguageContext";

interface HeroProps {
  onSearch: (data: any) => void;
  loading: boolean;
  activeSearchTab?: "flights" | "hotels" | "cars";
  onTabChange?: (tab: "flights" | "hotels" | "cars") => void;
}

const Hero: React.FC<HeroProps> = ({
  onSearch,
  loading,
  activeSearchTab = "flights",
  onTabChange,
}) => {
  const { t } = useLanguage();

  // Hotel search placeholder data
  const hotelDestinations = [
    {
      name: "Lagos",
      code: "LOS",
      image:
        "https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGFnb3N8ZW58MHx8MHx8fDA%3D",
    },
    {
      name: "London",
      code: "LON",
      image:
        "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=400",
    },
    {
      name: "New York",
      code: "NYC",
      image:
        "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=400",
    },
    {
      name: "Dubai",
      code: "DXB",
      image:
        "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400",
    },
  ];

  // Car rental placeholder data
  const carRentalLocations = [
    {
      name: "Lagos",
      code: "LOS",
      image:
        "https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGFnb3N8ZW58MHx8MHx8fDA%3D",
    },
    {
      name: "London Heathrow",
      code: "LHR",
      image:
        "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=400",
    },
    {
      name: "Dubai",
      code: "DXB",
      image:
        "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400",
    },
    {
      name: "New York JFK",
      code: "JFK",
      image:
        "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=400",
    },
  ];

  // Get default dates for hotel/car search
  const getDefaultDates = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const checkOut = new Date(tomorrow);
    checkOut.setDate(tomorrow.getDate() + 3);

    return {
      checkIn: tomorrow.toISOString().split("T")[0],
      checkOut: checkOut.toISOString().split("T")[0],
      pickupDate: tomorrow.toISOString().split("T")[0] + "T10:00:00",
      dropoffDate: checkOut.toISOString().split("T")[0] + "T10:00:00",
    };
  };

  const defaultDates = getDefaultDates();

  const isCarTab = () => activeSearchTab === "cars";
  const isHotelTab = () => activeSearchTab === "hotels";

  const handleQuickHotelSearch = (destination: {
    name: string;
    code: string;
  }) => {
    const searchData = {
      type: "hotels",
      location: destination.name,
      cityCode: destination.code,
      checkInDate: defaultDates.checkIn,
      checkOutDate: defaultDates.checkOut,
      travellers: 2,
      rooms: 1,
      currency: "GBP",
    };
    onSearch(searchData);
    if (activeSearchTab !== "hotels" && onTabChange) {
      onTabChange("hotels");
    }
  };

  const handleQuickCarSearch = (location: { name: string; code: string }) => {
    const searchData = {
      type: "cars",
      pickupLocation: location.name,
      dropoffLocation: location.name,
      pickupLocationCode: location.code,
      dropoffLocationCode: location.code,
      pickupDateTime: defaultDates.pickupDate,
      dropoffDateTime: defaultDates.dropoffDate,
      passengers: 2,
      currency: "GBP",
    };
    onSearch(searchData);
    if (!isCarTab() && onTabChange) {
      onTabChange("cars");
    }
  };

  return (
    <section className="relative min-h-[320px] md:min-h-[450px] flex items-center justify-center overflow-hidden py-2 md:py-3 -mb-6">
      {/* Bright blue and white gradient background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#33a8da] via-[#4bb5e3] to-[#6bc2ed]">
        <div className="absolute inset-0 bg-white/10"></div>
        {/* Decorative wave pattern */}
        <svg
          className="absolute bottom-0 left-0 w-full h-20 md:h-24 text-white/5"
          preserveAspectRatio="none"
          viewBox="0 0 1440 320"
          fill="currentColor"
        >
          <path d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,170.7C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-2 md:mb-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2 tracking-tight text-white drop-shadow-lg">
            {isHotelTab()
              ? t('hero.hotels.title')
              : isCarTab()
              ? t('hero.cars.title')
              : t('hero.title')}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-white max-w-2xl mx-auto font-medium opacity-95 leading-relaxed">
            {isHotelTab()
              ? t('hero.hotels.subtitle')
              : isCarTab()
              ? t('hero.cars.subtitle')
              : t('hero.subtitle')}
          </p>
        </div>

        <div className="relative z-20 animate-in fade-in zoom-in-95 delay-300 duration-700 mb-0 md:mb-0">
          <SearchBox
            onSearch={onSearch}
            loading={loading}
            activeTab={activeSearchTab}
            onTabChange={onTabChange}
          />
        </div>

        {(isHotelTab() || isCarTab()) && (
          <div className="mt-2 md:mt-3 animate-in fade-in delay-500 duration-1000">
            <div className="text-center mb-2">
              <h3 className="text-base md:text-lg font-bold text-white mb-0 drop-shadow-md">
                {isHotelTab()
                  ? t('hero.popular.hotels.heading')
                  : t('hero.popular.cars.heading')}
              </h3>
              <p className="text-white/85 text-[11px] sm:text-xs">
                {isHotelTab()
                  ? t('hero.popular.hotels.subheading')
                  : t('hero.popular.cars.subheading')}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {(isHotelTab() ? hotelDestinations : carRentalLocations).map(
                (item, index) => (
                  <button
                    key={item.code}
                    onClick={() =>
                      isHotelTab()
                        ? handleQuickHotelSearch(item)
                        : handleQuickCarSearch(item)
                    }
                    className="group relative overflow-hidden rounded-lg w-20 h-20 md:w-24 md:h-24 flex-shrink-0 animate-in fade-in slide-in-from-bottom-4 shadow-md hover:shadow-lg transition-shadow"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationDuration: "500ms",
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
                    <div className="absolute inset-0 flex flex-col items-center justify-end p-2">
                      <span className="text-white font-bold text-[10px] sm:text-xs drop-shadow-lg">
                        {item.name}
                      </span>
                      <span className="text-white/80 text-[9px] mt-0.5 bg-black/30 px-1 py-0.5 rounded-full">
                        {item.code}
                      </span>
                    </div>
                    <div
                      className={`absolute inset-0 ${
                        isHotelTab()
                          ? "bg-white/0 group-hover:bg-white/20"
                          : "bg-white/0 group-hover:bg-white/20"
                      } transition-all duration-300`}
                    />
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
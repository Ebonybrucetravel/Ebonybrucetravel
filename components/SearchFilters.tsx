// Create a new file: components/SearchFilters.tsx
'use client';

import React, { useState, useEffect } from 'react';

export type FilterType = 'flights' | 'hotels' | 'car-rentals';

interface FlightFilters {
  airlines: string[];
  maxStops: number;
  priceRange: { min: number; max: number };
  departureTime: { start: string; end: string };
  arrivalTime: { start: string; end: string };
  duration: { min: number; max: number };
  cabinClass: string[];
}

interface HotelFilters {
  priceRange: { min: number; max: number };
  starRating: number[];
  amenities: string[];
  propertyType: string[];
  distanceFromCenter: number;
  guestRating: { min: number; max: number };
}

interface CarRentalFilters {
  priceRange: { min: number; max: number };
  vehicleType: string[];
  transmission: string[];
  seats: number[];
  fuelType: string[];
  rentalCompanies: string[];
}

export interface SearchFilters {
  flights: FlightFilters;
  hotels: HotelFilters;
  'car-rentals': CarRentalFilters;
}

interface SearchFiltersProps {
  type: FilterType;
  results: any[];
  searchParams: any;
  onApplyFilters: (filters: any) => void;
  onResetFilters: () => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  type,
  results,
  searchParams,
  onApplyFilters,
  onResetFilters
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [availableOptions, setAvailableOptions] = useState<any>({});

  // Extract available options from results
  useEffect(() => {
    if (results.length === 0) return;

    const options: any = {};

    if (type === 'flights') {
      // Extract airlines
      const airlines = new Set<string>();
      const durations: number[] = [];
      const prices: number[] = [];
      
      results.forEach(result => {
        if (result.provider) airlines.add(result.provider);
        if (result.duration) {
          const match = result.duration.match(/(\d+)h\s*(\d+)?m?/);
          if (match) {
            const hours = parseInt(match[1]);
            const minutes = match[2] ? parseInt(match[2]) : 0;
            durations.push(hours * 60 + minutes);
          }
        }
        if (result.price) {
          const price = parseFloat(result.price.replace(/[^\d.]/g, ''));
          if (!isNaN(price)) prices.push(price);
        }
      });

      options.airlines = Array.from(airlines);
      options.duration = {
        min: Math.min(...durations),
        max: Math.max(...durations)
      };
      options.price = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };

    } else if (type === 'hotels') {
      const prices: number[] = [];
      const ratings: number[] = [];
      
      results.forEach(result => {
        if (result.price) {
          const price = parseFloat(result.price.replace(/[^\d.]/g, ''));
          if (!isNaN(price)) prices.push(price);
        }
        if (result.rating) {
          ratings.push(result.rating);
        }
      });

      options.price = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
      options.rating = {
        min: Math.min(...ratings),
        max: Math.max(...ratings)
      };

    } else if (type === 'car-rentals') {
      const prices: number[] = [];
      
      results.forEach(result => {
        if (result.price) {
          const price = parseFloat(result.price.replace(/[^\d.]/g, ''));
          if (!isNaN(price)) prices.push(price);
        }
      });

      options.price = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
    }

    setAvailableOptions(options);
    
    // Initialize default filters
    if (type === 'flights') {
      setActiveFilters({
        airlines: [],
        maxStops: 2,
        priceRange: options.price || { min: 0, max: 100000 },
        departureTime: { start: '00:00', end: '23:59' },
        arrivalTime: { start: '00:00', end: '23:59' },
        duration: options.duration || { min: 0, max: 1440 },
        cabinClass: []
      });
    } else if (type === 'hotels') {
      setActiveFilters({
        priceRange: options.price || { min: 0, max: 100000 },
        starRating: [],
        amenities: [],
        propertyType: [],
        distanceFromCenter: 50,
        guestRating: options.rating || { min: 0, max: 5 }
      });
    } else if (type === 'car-rentals') {
      setActiveFilters({
        priceRange: options.price || { min: 0, max: 100000 },
        vehicleType: [],
        transmission: [],
        seats: [],
        fuelType: [],
        rentalCompanies: []
      });
    }
  }, [results, type]);

  const handleFilterChange = (filterKey: string, value: any) => {
    setActiveFilters((prev: any) => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const handleApply = () => {
    onApplyFilters(activeFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    // Reset to initial state
    if (type === 'flights') {
      setActiveFilters({
        airlines: [],
        maxStops: 2,
        priceRange: availableOptions.price || { min: 0, max: 100000 },
        departureTime: { start: '00:00', end: '23:59' },
        arrivalTime: { start: '00:00', end: '23:59' },
        duration: availableOptions.duration || { min: 0, max: 1440 },
        cabinClass: []
      });
    } else if (type === 'hotels') {
      setActiveFilters({
        priceRange: availableOptions.price || { min: 0, max: 100000 },
        starRating: [],
        amenities: [],
        propertyType: [],
        distanceFromCenter: 50,
        guestRating: availableOptions.rating || { min: 0, max: 5 }
      });
    } else if (type === 'car-rentals') {
      setActiveFilters({
        priceRange: availableOptions.price || { min: 0, max: 100000 },
        vehicleType: [],
        transmission: [],
        seats: [],
        fuelType: [],
        rentalCompanies: []
      });
    }
    onResetFilters();
  };

  const renderFlightFilters = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Price Range</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>₦{activeFilters.priceRange?.min?.toLocaleString() || 0}</span>
            <span>₦{activeFilters.priceRange?.max?.toLocaleString() || 100000}</span>
          </div>
          <input
            type="range"
            min={availableOptions.price?.min || 0}
            max={availableOptions.price?.max || 100000}
            value={activeFilters.priceRange?.max || 100000}
            onChange={(e) => handleFilterChange('priceRange', {
              min: availableOptions.price?.min || 0,
              max: parseInt(e.target.value)
            })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Airlines */}
      {availableOptions.airlines && availableOptions.airlines.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Airlines</h3>
          <div className="space-y-2">
            {availableOptions.airlines.slice(0, 5).map((airline: string) => (
              <label key={airline} className="flex items-center">
                <input
                  type="checkbox"
                  checked={activeFilters.airlines?.includes(airline)}
                  onChange={(e) => {
                    const newAirlines = e.target.checked
                      ? [...(activeFilters.airlines || []), airline]
                      : activeFilters.airlines?.filter((a: string) => a !== airline);
                    handleFilterChange('airlines', newAirlines);
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{airline}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Stops */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Maximum Stops</h3>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((stops) => (
            <label key={stops} className="flex items-center">
              <input
                type="radio"
                name="maxStops"
                checked={activeFilters.maxStops === stops}
                onChange={() => handleFilterChange('maxStops', stops)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">
                {stops === 0 ? 'Direct' : stops === 1 ? '1 stop' : `${stops} stops`}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Cabin Class */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Cabin Class</h3>
        <div className="space-y-2">
          {['Economy', 'Premium Economy', 'Business', 'First'].map((cabin) => (
            <label key={cabin} className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.cabinClass?.includes(cabin)}
                onChange={(e) => {
                  const newClasses = e.target.checked
                    ? [...(activeFilters.cabinClass || []), cabin]
                    : activeFilters.cabinClass?.filter((c: string) => c !== cabin);
                  handleFilterChange('cabinClass', newClasses);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{cabin}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHotelFilters = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Price per night</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>₦{activeFilters.priceRange?.min?.toLocaleString() || 0}</span>
            <span>₦{activeFilters.priceRange?.max?.toLocaleString() || 100000}</span>
          </div>
          <input
            type="range"
            min={availableOptions.price?.min || 0}
            max={availableOptions.price?.max || 100000}
            value={activeFilters.priceRange?.max || 100000}
            onChange={(e) => handleFilterChange('priceRange', {
              min: availableOptions.price?.min || 0,
              max: parseInt(e.target.value)
            })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Star Rating */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Star Rating</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => (
            <label key={stars} className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.starRating?.includes(stars)}
                onChange={(e) => {
                  const newRatings = e.target.checked
                    ? [...(activeFilters.starRating || []), stars]
                    : activeFilters.starRating?.filter((r: number) => r !== stars);
                  handleFilterChange('starRating', newRatings);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                {'★'.repeat(stars)}{'☆'.repeat(5 - stars)} & up
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Guest Rating */}
      {availableOptions.rating && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Guest Rating</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{activeFilters.guestRating?.min || 0}/5</span>
              <span>{activeFilters.guestRating?.max || 5}/5</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={activeFilters.guestRating?.max || 5}
              onChange={(e) => handleFilterChange('guestRating', {
                min: 0,
                max: parseFloat(e.target.value)
              })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Amenities */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Amenities</h3>
        <div className="space-y-2">
          {['Free WiFi', 'Swimming Pool', 'Spa', 'Restaurant', 'Fitness Center', 'Parking'].map((amenity) => (
            <label key={amenity} className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.amenities?.includes(amenity)}
                onChange={(e) => {
                  const newAmenities = e.target.checked
                    ? [...(activeFilters.amenities || []), amenity]
                    : activeFilters.amenities?.filter((a: string) => a !== amenity);
                  handleFilterChange('amenities', newAmenities);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{amenity}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCarRentalFilters = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Price per day</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>₦{activeFilters.priceRange?.min?.toLocaleString() || 0}</span>
            <span>₦{activeFilters.priceRange?.max?.toLocaleString() || 100000}</span>
          </div>
          <input
            type="range"
            min={availableOptions.price?.min || 0}
            max={availableOptions.price?.max || 100000}
            value={activeFilters.priceRange?.max || 100000}
            onChange={(e) => handleFilterChange('priceRange', {
              min: availableOptions.price?.min || 0,
              max: parseInt(e.target.value)
            })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Vehicle Type */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Vehicle Type</h3>
        <div className="space-y-2">
          {['SUV', 'Sedan', 'Van', 'Convertible', 'Luxury', 'Economy'].map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.vehicleType?.includes(type)}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...(activeFilters.vehicleType || []), type]
                    : activeFilters.vehicleType?.filter((t: string) => t !== type);
                  handleFilterChange('vehicleType', newTypes);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Transmission */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Transmission</h3>
        <div className="space-y-2">
          {['Automatic', 'Manual'].map((transmission) => (
            <label key={transmission} className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.transmission?.includes(transmission)}
                onChange={(e) => {
                  const newTransmissions = e.target.checked
                    ? [...(activeFilters.transmission || []), transmission]
                    : activeFilters.transmission?.filter((t: string) => t !== transmission);
                  handleFilterChange('transmission', newTransmissions);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{transmission}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Seats */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Seats</h3>
        <div className="space-y-2">
          {[2, 4, 5, 7, 8].map((seats) => (
            <label key={seats} className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.seats?.includes(seats)}
                onChange={(e) => {
                  const newSeats = e.target.checked
                    ? [...(activeFilters.seats || []), seats]
                    : activeFilters.seats?.filter((s: number) => s !== seats);
                  handleFilterChange('seats', newSeats);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{seats}+ seats</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const countActiveFilters = () => {
    if (!activeFilters) return 0;
    
    let count = 0;
    
    if (type === 'flights') {
      count += activeFilters.airlines?.length || 0;
      count += activeFilters.maxStops !== undefined && activeFilters.maxStops !== 2 ? 1 : 0;
      count += activeFilters.cabinClass?.length || 0;
      if (activeFilters.priceRange?.max !== availableOptions.price?.max) count += 1;
    } else if (type === 'hotels') {
      count += activeFilters.starRating?.length || 0;
      count += activeFilters.amenities?.length || 0;
      if (activeFilters.priceRange?.max !== availableOptions.price?.max) count += 1;
      if (activeFilters.guestRating?.max !== availableOptions.rating?.max) count += 1;
    } else if (type === 'car-rentals') {
      count += activeFilters.vehicleType?.length || 0;
      count += activeFilters.transmission?.length || 0;
      count += activeFilters.seats?.length || 0;
      if (activeFilters.priceRange?.max !== availableOptions.price?.max) count += 1;
    }
    
    return count;
  };

  const filterCount = countActiveFilters();

  return (
    <>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="font-medium text-gray-700">Filters</span>
        {filterCount > 0 && (
          <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {filterCount}
          </span>
        )}
      </button>

      {/* Mobile/Desktop Filter Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Filter Panel */}
          <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-white shadow-2xl overflow-y-auto lg:relative lg:inset-auto lg:shadow-lg lg:rounded-2xl lg:border lg:border-gray-200">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="lg:hidden text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Filter Content */}
              <div className="space-y-6">
                {type === 'flights' && renderFlightFilters()}
                {type === 'hotels' && renderHotelFilters()}
                {type === 'car-rentals' && renderCarRentalFilters()}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
                <button
                  onClick={handleApply}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SearchFilters;
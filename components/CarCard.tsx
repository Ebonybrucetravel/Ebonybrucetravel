'use client';
import React from 'react';
interface CarCardProps {
    car: {
        id: string;
        title: string;
        price: string;
        image: string;
        rating: number;
        features: string[];
        transmission: string;
        seats: number;
        company: string;
    };
    onSelect?: (car: any) => void;
}
const CarCard: React.FC<CarCardProps> = ({ car, onSelect }) => {
    return (<div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="h-48 bg-gray-100 relative">
        <img src={car.image} alt={car.title} className="w-full h-full object-cover"/>
        <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          {car.company}
        </div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-gray-900">{car.title}</h3>
          <div className="flex items-center">
            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span className="text-sm font-bold text-gray-700 ml-1">{car.rating}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {car.features.slice(0, 3).map((feature, index) => (<span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {feature}
            </span>))}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
            {car.transmission}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 4.25v-5.5"/>
            </svg>
            {car.seats} seats
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">{car.price}</p>
            <p className="text-xs text-gray-500">per day</p>
          </div>
          <button onClick={() => onSelect?.(car)} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-xl hover:bg-[#2c98c7] transition">
            View Details
          </button>
        </div>
      </div>
    </div>);
};
export default CarCard;

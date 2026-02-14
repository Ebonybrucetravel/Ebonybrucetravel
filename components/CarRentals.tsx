'use client';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
const CarRentals: React.FC = () => {
    const { t, currency } = useLanguage();
    const currencySymbol = currency?.symbol || '$';
    const brandBlue = '#32A6D7';
    const cars = [
        {
            id: '1',
            name: 'Black SUV',
            price: 70,
            image: 'https://thumbs.dreamstime.com/b/black-generic-suv-car-off-road-crossover-glossy-surface-white-background-front-view-isolated-path-black-generic-suv-123338690.jpg'
        },
        {
            id: '2',
            name: 'Orange Sedan',
            price: 60,
            image: 'https://thumbs.dreamstime.com/b/car-front-view-white-isolated-background-clean-facing-forward-bright-perfect-transportation-related-design-promotion-381494208.jpg'
        },
        {
            id: '3',
            name: 'White SUV',
            price: 50,
            image: 'https://png.pngtree.com/background/20250121/original/pngtree-premium-white-suv-car-for-the-whole-family-isolated-on-a-picture-image_13334725.jpg'
        },
        {
            id: '4',
            name: 'Blue SUV',
            price: 90,
            image: 'https://thumbs.dreamstime.com/b/modern-blue-car-crossover-long-trips-back-view-d-render-modern-blue-car-crossover-long-trips-back-view-d-render-130333143.jpg'
        },
        {
            id: '5',
            name: 'Red Crossover',
            price: 60,
            image: 'https://thumbs.dreamstime.com/b/red-suv-car-isolated-white-background-d-render-red-suv-car-isolated-106663738.jpg'
        },
        {
            id: '6',
            name: 'Black SUV',
            price: 70,
            image: 'https://thumbs.dreamstime.com/b/black-suv-white-background-32768354.jpg'
        },
    ];
    return (<section className="px-4 md:px-8 lg:px-16 py-12 bg-white">
      <div className="flex justify-between items-end mb-8 md:mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            All the best deals and rental options in one place
          </h2>
          <p className="text-gray-500 mt-2 text-base md:text-lg">
            Finding the perfect car rental is easier than ever!
          </p>
        </div>
        <a href="#" className={`text-[${brandBlue}] font-semibold hover:text-[#2a8bb5] text-base md:text-lg flex items-center gap-2 group transition-colors`}>
          See More
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke={`currentColor`}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {cars.map((car) => (<div key={car.id} className="group relative bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 cursor-pointer">
            
            <div className="absolute top-4 right-4 z-10">
              <div className="text-white font-bold px-5 py-2 rounded-full text-lg shadow-md flex items-center gap-1" style={{ backgroundColor: brandBlue }}>
                {currencySymbol}{car.price}
                <span className="text-sm font-normal opacity-90">/day</span>
              </div>
            </div>

            
            <div className="h-64 md:h-72 lg:h-80 bg-white flex items-center justify-center p-6 md:p-8 overflow-hidden">
              <img src={car.image} alt={car.name} className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500" loading="lazy"/>
            </div>

            
            <div className="p-5 text-center md:text-left">
              <h3 className="text-xl font-bold text-gray-900">{car.name}</h3>
            </div>
          </div>))}
      </div>
    </section>);
};
export default CarRentals;

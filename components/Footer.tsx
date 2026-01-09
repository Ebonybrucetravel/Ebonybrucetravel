'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const Footer: React.FC = () => {
  const { t, language, currency } = useLanguage();
  
  // Safely access currency with defaults
  const currencyCode = currency?.code || 'USD';
  const currencySymbol = currency?.symbol || '$';
  
  // Safely access language with default
  const currentLanguage = language || 'EN';
  
  const categories = [
    {
      title: t?.('footer.company') || 'Company',
      links: [
        t?.('footer.aboutUs') || 'About Us', 
        t?.('footer.services') || 'Services', 
        t?.('footer.career') || 'Career', 
        t?.('footer.pressCenter') || 'Press Center', 
        t?.('footer.investorRelation') || 'Investor Relation', 
        t?.('footer.sustainability') || 'Sustainability'
      ]
    },
    {
      title: t?.('footer.support') || 'Support',
      links: [
        t?.('footer.helpCenter') || 'Help Center', 
        t?.('footer.terms') || 'Terms of Service', 
        t?.('footer.privacy') || 'Privacy Policy', 
        t?.('footer.partnerDispute') || 'Partner Dispute', 
        t?.('footer.humanRights') || 'Human Right Statement', 
        t?.('footer.accessibility') || 'Accessibility Statement'
      ]
    },
    {
      title: t?.('footer.discover') || 'Discover',
      links: [
        t?.('footer.flights') || 'Flights', 
        t?.('footer.hotels') || 'Hotels', 
        t?.('footer.carRentals') || 'Car Rentals', 
        t?.('footer.myBookings') || 'My Bookings', 
        t?.('footer.travelArticles') || 'Travel Articles', 
        t?.('footer.agents') || 'Agents', 
        t?.('footer.holidayDeals') || 'Season and Holiday deals'
      ]
    }
  ];

  const socialLinks = [
    { name: 'Facebook', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
    { name: 'Twitter', icon: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.213c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' },
    { name: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
    { name: 'LinkedIn', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
  ];

  return (
    <footer className="bg-white pt-20 pb-10 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">
          {/* Brand Section */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-blue-900 p-2 rounded-lg">
                <span className="text-white font-bold italic text-lg">EB</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-none uppercase tracking-tighter">
                  EBONY BRUCE
                </span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  Travels Limited
                </span>
              </div>
            </div>
            <p className="text-gray-500 leading-relaxed max-w-sm mb-6">
              {t?.('footer.description') || 'Explore the world with a partner you can trust. Book flights, hotels, and cars with confidence.'}
            </p>
            
            {/* Social Media */}
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href="#"
                  className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
                  aria-label={`Follow us on ${social.name}`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d={social.icon} />
                  </svg>
                </a>
              ))}
            </div>
            
            {/* App Stores */}
            <div className="flex gap-3 mt-8">
              <a 
                href="#" 
                className="flex-1 bg-black text-white rounded-xl px-4 py-3 hover:bg-gray-800 transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.86-3.08.38-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.38C2.79 15.36 3.51 7.79 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs">Download on the</div>
                  <div className="font-bold">App Store</div>
                </div>
              </a>
              <a 
                href="#" 
                className="flex-1 bg-black text-white rounded-xl px-4 py-3 hover:bg-gray-800 transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31l-2.27-2.27 6.69-6.69c.59-.59 1.54-.59 2.12 0 .59.59.59 1.54 0 2.12l-6.54 6.84z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs">Get it on</div>
                  <div className="font-bold">Google Play</div>
                </div>
              </a>
            </div>
          </div>

          {/* Links Sections */}
          <div className="md:col-span-8 grid grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((cat) => (
              <div key={cat.title}>
                <h4 className="font-bold text-gray-900 mb-6 text-lg">{cat.title}</h4>
                <ul className="space-y-4">
                  {cat.links.map((link, index) => (
                    <li key={index}>
                      <a 
                        href="#" 
                        className="text-gray-500 hover:text-blue-600 transition-colors duration-200 text-sm flex items-center gap-2 group"
                      >
                        <svg 
                          className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-gray-400 text-sm mb-1">
              © 2025 Ebony Bruce Travels Inc. {t?.('footer.rights') || 'All rights reserved.'}
            </p>
            <p className="text-xs text-gray-400">
              {t?.('footer.disclaimer') || 'Prices shown are for reference only and may vary.'}
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Language Display */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <svg 
                className="w-4 h-4 text-gray-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span className="text-sm font-medium text-gray-600">{currentLanguage}</span>
            </div>
            
            {/* Currency Display */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <svg 
                className="w-4 h-4 text-gray-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-600">
                {currencyCode} ({currencySymbol})
              </span>
            </div>
            
            {/* Payment Methods */}
            <div className="hidden md:flex items-center gap-3">
              {['Visa', 'Mastercard', 'PayPal', 'Apple Pay'].map((method) => (
                <div key={method} className="text-xs text-gray-400 border border-gray-200 px-2 py-1 rounded">
                  {method}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
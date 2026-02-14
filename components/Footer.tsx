"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../context/LanguageContext";
interface FooterProps {
    onLogoClick?: () => void;
    setIsMobileMenuOpen?: (open: boolean) => void;
    onAdminClick?: () => void;
}
const Footer: React.FC<FooterProps> = ({ onLogoClick, setIsMobileMenuOpen, onAdminClick, }) => {
    const router = useRouter();
    const { t, language, currency } = useLanguage();
    const currencyCode = currency?.code || "USD";
    const currencySymbol = currency?.symbol || "$";
    const currentLanguage = language || "EN";
    const handleLogoClick = () => {
        onLogoClick?.();
        setIsMobileMenuOpen?.(false);
    };
    const handleAdminClick = () => {
        onAdminClick?.();
        setIsMobileMenuOpen?.(false);
    };
    const categories = [
        {
            title: t?.("footer.company") || "Company",
            links: [
                { label: t?.("About Us") || "About Us", href: '/about' },
                { label: t?.("Services") || "Services", href: '/content/Services' },
                { label: t?.("Career") || "Career", href: '/content/Career' },
                { label: t?.("Sustainability") || "Sustainability", href: '/content/Sustainability' },
            ],
        },
        {
            title: t?.("Support") || "Support",
            links: [
                { label: t?.("Help Center") || "Help Center", href: '/content/Help Center' },
                { label: t?.("Terms of Service") || "Terms of Service", href: '/content/Terms of Service' },
                { label: t?.("Privacy Policy") || "Privacy Policy", href: '/content/Privacy Policy' },
            ],
        },
        {
            title: t?.("Discover") || "Discover",
            links: [
                { label: t?.("Flights") || "Flights", href: '/flights' },
                { label: t?.("Hotels") || "Hotels", href: '/hotels' },
                { label: t?.("Car Rentals") || "Car Rentals", href: '/cars' },
                { label: t?.("My Bookings") || "My Bookings", href: '/profile?tab=bookings' },
            ],
        },
    ];
    const socialLinks = [
        { name: "Facebook", icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
        { name: "Twitter", icon: "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.213c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" },
        { name: "Instagram", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
        { name: "LinkedIn", icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
    ];
    return (<footer className="bg-white pt-20 pb-10 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">
          <div className="md:col-span-4">
            <div className="inline-block mb-8 cursor-pointer" onClick={handleLogoClick} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleLogoClick();
    } }}>
              <img src="/images/logo1.png" alt="Ebony Bruce Travels Logo" className="h-12 w-auto"/>
            </div>

            <p className="text-gray-500 leading-relaxed max-w-sm mb-6">
              {t?.("Explore the world with a partner you can trust. Book flights, hotels, and cars with confidence") ||
            "Explore the world with a partner you can trust. Book flights, hotels, and cars with confidence."}
            </p>

            <div className="flex gap-4 mb-6">
              {socialLinks.map((social) => (<a key={social.name} href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200" aria-label={`Follow us on ${social.name}`}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d={social.icon}/></svg>
                </a>))}
            </div>

            <div className="mt-6">
              <button onClick={handleAdminClick} className="text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors duration-200 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Staff Portal
              </button>
            </div>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((cat) => (<div key={cat.title}>
                <h4 className="font-bold text-gray-900 mb-6 text-lg">{cat.title}</h4>
                <ul className="space-y-4">
                  {cat.links.map((link, index) => (<li key={index}>
                      <button onClick={() => router.push(link.href)} className="text-gray-500 hover:text-blue-600 transition-colors duration-200 text-sm flex items-center gap-2 group text-left">
                        <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                        </svg>
                        {link.label}
                      </button>
                    </li>))}
                </ul>
              </div>))}
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left order-2 md:order-1">
            <p className="text-gray-400 text-sm mb-1">© 2026 Ebony Bruce Travels Inc. {t?.("footer.rights") || "All rights reserved."}</p>
            <p className="text-xs text-gray-400">{t?.("footer.disclaimer") || "Prices shown are for reference only and may vary."}</p>
          </div>

          <div className="flex flex-wrap justify-center md:justify-end items-center gap-6 order-1 md:order-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">{currentLanguage}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">{currencyCode} ({currencySymbol})</span>
            </div>
          </div>
        </div>
      </div>
    </footer>);
};
export default Footer;
